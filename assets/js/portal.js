/* =====================================================================
   Upay admin portal  —  minimal, same-origin /api only, no probing.
   Server MUST serve this page (portal.html) on the same origin as the API.
   That is always true for `node server.js` on port 8004.
   ===================================================================== */
(function(){
  'use strict';

  var TOK = localStorage.getItem('upay.token');
  if (!TOK){ location.replace('/login.html?next=/portal.html'); return; }

  /* ---------- DOM helpers ---------- */
  function $(id){ return document.getElementById(id); }
  function el(tag, attrs, html){
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs){
      if (k==='class') e.className = attrs[k];
      else if (k==='onclick') e.onclick = attrs[k];
      else if (k.substr(0,2)==='on') e.addEventListener(k.substr(2), attrs[k]);
      else if (k==='value') e.value = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ---------- fetch helpers (same-origin, no probing) ---------- */
  function apiReq(method, path, body){
    var headers = {};
    if (body) headers['content-type'] = 'application/json';
    if (TOK) headers['authorization'] = 'Bearer ' + TOK;
    var opts = { method:method, headers:headers };
    if (body) opts.body = JSON.stringify(body);
    return fetch(path, opts).then(function(r){
      return r.text().then(function(txt){
        var j; try{ j = txt?JSON.parse(txt):{}; }catch(e){ j={_raw:txt}; }
        if (r.status === 401){ var e = new Error(j.error || 'Session expired. Sign in again.'); e.auth = true; throw e; }
        if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
        return j;
      });
    });
  }
  var api = {
    get: function(p){ return apiReq('GET', p); },
    post: function(p,b){ return apiReq('POST', p, b); },
    del: function(p,b){ return apiReq('DELETE', p, b); }
  };

  /* ---------- logout ---------- */
  function logout(){
    try{ localStorage.removeItem('upay.token'); localStorage.removeItem('upay.user'); }catch(e){}
    api.post('/api/auth/logout', {}).catch(function(){}).then(function(){ location.replace('/login.html'); });
  }
  window.logout = logout;

  /* ---------- header / nav ---------- */
  var TABS = [
    ['overview','Overview'],
    ['key','AI / API key'],
    ['users','Users'],
    ['signup','Sign-up'],
    ['content','Content'],
    ['audit','Audit log']
  ];
  function renderNav(current, me){
    var nav = $('nav'), who = $('who');
    nav.innerHTML = '';
    TABS.forEach(function(t){
      var a = el('a', {class:'nav-a '+(current===t[0]?'on':''), href:'#!/'+t[0]}, t[1]);
      nav.appendChild(a);
    });
    var openStudy = el('a',{class:'nav-a nav-right', href:'/'},'Study app →');
    nav.appendChild(openStudy);
    who.innerHTML = '';
    who.appendChild(el('span',{class:'pill'}, esc((me&&me.role)||'admin')));
    who.appendChild(el('span',{class:'wname'}, esc((me&&me.name)||'admin')));
    var btn = el('button',{onclick:logout},'Sign out');
    who.appendChild(btn);
  }

  /* ---------- error card ---------- */
  function showError(title, detail){
    var v = $('view');
    v.innerHTML = '';
    var card = el('div',{class:'card'});
    card.appendChild(el('h2',{}, esc(title)));
    card.appendChild(el('p',{}, esc(detail||'')));
    var row = el('div',{class:'row'});
    row.appendChild(el('button',{class:'btn',onclick:function(){location.reload();}}, 'Reload'));
    row.appendChild(el('a',{class:'btn ghost',href:'/login.html'}, 'Back to sign in'));
    card.appendChild(row);
    v.appendChild(card);
  }

  /* ---------- router ---------- */
  function parseHash(){
    var h = location.hash.replace(/^#!?/,'') || '/overview';
    var i = h.indexOf('?');
    var path = (i>=0?h.slice(0,i):h).replace(/^\//,'');
    return (path.split('/').filter(Boolean)[0]) || 'overview';
  }
  function go(){
    var name = parseHash();
    var handler = ROUTES[name];
    if (!handler){ location.hash = '#!/overview'; return; }
    $('view').innerHTML = '<div class="loading">Loading…</div>';
    handler();
  }
  window.addEventListener('hashchange', go);

  /* ---------- ROUTES ---------- */
  var ROUTES = {};
  var ME = null;

  ROUTES.overview = function(){
    Promise.all([
      api.get('/api/admin/users').catch(function(e){return {users:[],_e:e.message};}),
      api.get('/api/admin/key').catch(function(e){return {_e:e.message};}),
      api.get('/api/admin/signup').catch(function(e){return {_e:e.message};}),
      api.get('/api/ai/cache').catch(function(e){return {items:[],_e:e.message};}),
      api.get('/api/auth/me').catch(function(e){return {user:ME,_e:e.message};})
    ]).then(function(all){
      var u=all[0],k=all[1],s=all[2],c=all[3],meResp=all[4];
      ME = meResp.user || ME;
      renderNav('overview', ME);
      var users = u.users||[];
      var cnts = {admin:0,teacher:0,student:0};
      users.forEach(function(x){ cnts[x.role] = (cnts[x.role]||0)+1; });
      var v = $('view'); v.innerHTML = '';
      v.appendChild(el('h1',{},'Dashboard'));
      v.appendChild(el('p',{class:'lead'},'Welcome back, <b>'+esc((ME&&ME.name)||'admin')+'</b>. Manage the API key, users and sign-up settings here.'));

      var grid = el('div',{class:'grid'});
      function stat(n,l,d){
        var s = el('div',{class:'stat'});
        s.appendChild(el('div',{class:'n'}, String(n)));
        s.appendChild(el('div',{class:'l'}, l));
        if (d) s.appendChild(el('div',{class:'d'}, d));
        return s;
      }
      grid.appendChild(stat(users.length,'Users total',cnts.admin+' admin · '+cnts.teacher+' teacher · '+cnts.student+' student'));
      grid.appendChild(stat(k.count||0,'Gemini key(s) in ring','Model: <code>'+esc(k.model||'—')+'</code>'));
      grid.appendChild(stat(Number(c.count)||0,'Your cached AI answers','Offline reuse saves tokens.'));
      grid.appendChild(stat(s.open?'Open':'Closed','Student self sign-up', s.open?('Class code <code>'+esc(s.code||'')+'</code>'):'Closed — open from the Sign-up tab.'));
      v.appendChild(grid);

      var card = el('div',{class:'card'});
      card.appendChild(el('h2',{},'Gemini / AI status'));
      var keyLine = el('p',{});
      if (k.set){
        keyLine.innerHTML = '<span class="tag ok">set</span> <code>'+esc(k.masked||'')+'</code>';
      } else {
        keyLine.innerHTML = '<span class="tag bad">not set</span> Add a Gemini API key on the <a href="#!/key">AI / API key</a> tab to enable AI solving.';
      }
      card.appendChild(keyLine);
      var row = el('div',{class:'row'});
      row.appendChild(el('a',{class:'btn',href:'#!/key'},'Manage key'));
      row.appendChild(el('a',{class:'btn ghost',href:'#!/users'},'Manage users'));
      row.appendChild(el('a',{class:'btn ghost',href:'/'},'Open study app'));
      card.appendChild(row);
      v.appendChild(card);
    }).catch(function(e){
      if (e.auth) return logout();
      renderNav('overview', ME);
      showError('Could not load dashboard', e.message);
    });
  };

  /* --- AI / API key --- */
  ROUTES.key = function(){
    renderNav('key', ME);
    Promise.all([api.get('/api/admin/key'), api.get('/api/admin/key/models').catch(function(){return {models:[]};})])
      .then(function(all){ renderKey(all[0], all[1]); })
      .catch(function(e){ if(e.auth)return logout(); showError('Could not load key info', e.message); });
  };
  function renderKey(k,m){
    var models = (m.models||[]).slice().sort();
    var v = $('view'); v.innerHTML = '';
    v.appendChild(el('h1',{},'AI / Gemini API key'));
    v.appendChild(el('p',{class:'lead'},'Paste a Google Gemini API key here. Keys are stored encrypted on disk.'));

    var c1 = el('div',{class:'card'});
    c1.appendChild(el('h2',{},'Current status'));
    c1.appendChild(el('p',{}, k.set
      ? '<span class="tag ok">configured</span> '+(k.count||0)+' key(s) in the ring. Model: <code>'+esc(k.model||'')+'</code>'
      : '<span class="tag bad">no key</span> Offline MCQs work; AI solving needs a key.'));
    if ((k.keys||[]).length){
      var tbl = el('table');
      tbl.innerHTML = '<thead><tr><th>Key (masked)</th><th>Status</th><th></th></tr></thead><tbody>'+
        k.keys.map(function(kk){
          return '<tr><td class="mono">'+esc(kk.masked)+'</td>'+
            '<td>'+(kk.dead?'<span class="tag bad">unreachable</span>':'<span class="tag ok">live</span>')+'</td>'+
            '<td><button class="btn sm ghost" data-rm="'+esc(kk.masked)+'">Remove</button></td></tr>';
        }).join('')+'</tbody>';
      c1.appendChild(tbl);
    }
    v.appendChild(c1);
    /* wire remove buttons */
    c1.querySelectorAll('button[data-rm]').forEach(function(b){
      b.onclick = function(){
        var masked = b.getAttribute('data-rm');
        if (!confirm('Remove key '+masked+'?')) return;
        api.post('/api/admin/key',{remove:masked}).then(function(k2){
          api.get('/api/admin/key/models').catch(function(){return {models:[]};}).then(function(m2){ renderKey(k2,m2); });
        }).catch(function(e){ alert(e.message); });
      };
    });

    var c2 = el('div',{class:'card'});
    c2.appendChild(el('h2',{},'Add or replace key'));
    c2.appendChild(el('p',{class:'lead',style:'margin:0 0 10px'},'Paste one or more keys (one per line, or comma-separated).'));
    c2.appendChild(el('div',{class:'field'},'<label for="keyin">Gemini API key(s)</label><textarea id="keyin" rows="3" placeholder="AIzaSy..."></textarea><small>Get a key at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>.</small>'));
    c2.appendChild(el('div',{class:'field'},'<label for="modelin">Model</label><input id="modelin" type="text" value="'+esc(k.model||m.current||'gemini-2.0-flash')+'">'));
    var row = el('div',{class:'row'});
    var msg = el('div',{class:'msg',id:'keymsg'});
    row.appendChild(el('button',{class:'btn',onclick:function(){
      msg.className='msg';msg.textContent='Saving…';
      api.post('/api/admin/key',{key:document.getElementById('keyin').value, model:document.getElementById('modelin').value}).then(function(k2){
        msg.className='msg ok'; msg.textContent='Saved. Ring has '+(k2.count||0)+' key(s).';
        api.get('/api/admin/key/models').catch(function(){return {models:[]};}).then(function(m2){ renderKey(k2,m2); });
      }).catch(function(e){ msg.className='msg err'; msg.textContent=e.message; });
    }},'Save key(s)'));
    row.appendChild(el('button',{class:'btn ghost',onclick:function(){
      msg.className='msg';msg.textContent='Saving model…';
      api.post('/api/admin/key',{model:document.getElementById('modelin').value}).then(function(k2){
        msg.className='msg ok'; msg.textContent='Model set to '+k2.model+'.';
        renderKey(k2,m);
      }).catch(function(e){ msg.className='msg err'; msg.textContent=e.message; });
    }},'Save model only'));
    row.appendChild(el('button',{class:'btn ghost',onclick:function(){
      msg.className='msg';msg.textContent='Testing…';
      api.post('/api/admin/key/test',{model:document.getElementById('modelin').value||undefined}).then(function(r){
        msg.className='msg ok'; msg.textContent='OK via '+r.model+' — '+r.reply;
      }).catch(function(e){ msg.className='msg err'; msg.textContent='Test failed: '+e.message; });
    }},'Test key'));
    row.appendChild(el('button',{class:'btn danger',onclick:function(){
      if(!confirm('Remove ALL Gemini keys from the ring?')) return;
      msg.className='msg';msg.textContent='Clearing…';
      api.post('/api/admin/key',{key:null,model:document.getElementById('modelin').value}).then(function(k2){
        msg.className='msg ok'; msg.textContent='All keys removed.';
        renderKey(k2,m);
      }).catch(function(e){ msg.className='msg err'; msg.textContent=e.message; });
    }},'Clear all'));
    c2.appendChild(row);
    c2.appendChild(msg);
    v.appendChild(c2);

    if (models.length){
      var c3 = el('div',{class:'card'});
      c3.appendChild(el('h2',{},'Available models for this key'));
      var chips = el('div',{class:'chips'});
      models.forEach(function(mm){
        var c = el('span',{class:'chip',onclick:function(){ document.getElementById('modelin').value = mm; }}, esc(mm));
        chips.appendChild(c);
      });
      c3.appendChild(chips);
      v.appendChild(c3);
    }
  }

  /* --- Users --- */
  ROUTES.users = function(){
    renderNav('users', ME);
    api.get('/api/admin/users').then(function(u){ renderUsers(u); })
      .catch(function(e){ if(e.auth)return logout(); showError('Could not load users', e.message); });
  };
  function renderUsers(u){
    var list = (u.users||[]).slice().sort(function(a,b){return (a.createdAt||'').localeCompare(b.createdAt||'');});
    var v = $('view'); v.innerHTML = '';
    v.appendChild(el('h1',{},'Users'));
    v.appendChild(el('p',{class:'lead'}, list.length+' account(s).'));

    var c1 = el('div',{class:'card'});
    c1.appendChild(el('h2',{},'Add one user'));
    var g = el('div',{class:'grid'});
    g.innerHTML = '<div class="field"><label>Username</label><input id="nu-user" type="text"></div>'+
                  '<div class="field"><label>Display name</label><input id="nu-name" type="text"></div>'+
                  '<div class="field"><label>Role</label><select id="nu-role"><option value="student">student</option><option value="teacher">teacher</option><option value="admin">admin</option></select></div>'+
                  '<div class="field"><label>Temporary password</label><input id="nu-pw" type="text" placeholder="auto-generated"></div>';
    c1.appendChild(g);
    var m1 = el('div',{class:'msg',id:'nu-msg'});
    var r1 = el('div',{class:'row'});
    r1.appendChild(el('button',{class:'btn',onclick:function(){
      var body={user:document.getElementById('nu-user').value.trim().toLowerCase(),
                name:document.getElementById('nu-name').value.trim(),
                role:document.getElementById('nu-role').value,
                password:document.getElementById('nu-pw').value||undefined};
      m1.className='msg';m1.textContent='Creating…';
      api.post('/api/admin/users',body).then(function(){
        m1.className='msg ok'; m1.textContent='Created.'; ROUTES.users();
      }).catch(function(e){ m1.className='msg err'; m1.textContent=e.message; });
    }},'Create user'));
    r1.appendChild(m1);
    c1.appendChild(r1);
    v.appendChild(c1);

    var c2 = el('div',{class:'card'});
    c2.appendChild(el('h2',{},'All users'));
    var tbl = el('table');
    tbl.innerHTML = '<thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Created</th><th></th></tr></thead><tbody>'+
      list.map(function(x){
        return '<tr><td class="mono">'+esc(x.user)+'</td><td>'+esc(x.name||'')+'</td>'+
          '<td><span class="tag">'+esc(x.role)+'</span>'+(x.mustChange?'<span class="tag warn">must change pw</span>':'')+'</td>'+
          '<td>'+esc((x.createdAt||'').slice(0,16).replace('T',' '))+'</td>'+
          '<td>'+(ME&&ME.user===x.user?'<span class="muted">you</span>':
            '<button class="btn sm danger" data-u="'+esc(x.user)+'">Remove</button>')+'</td></tr>';
      }).join('')+'</tbody>';
    c2.appendChild(tbl);
    v.appendChild(c2);
    c2.querySelectorAll('button[data-u]').forEach(function(b){
      b.onclick = function(){
        var un = b.getAttribute('data-u');
        if (!confirm('Remove user '+un+'?')) return;
        api.del('/api/admin/users',{user:un}).then(function(){ ROUTES.users(); }).catch(function(e){ alert(e.message); });
      };
    });
  }

  /* --- Sign-up --- */
  ROUTES.signup = function(){
    renderNav('signup', ME);
    api.get('/api/admin/signup').then(renderSignup)
      .catch(function(e){ if(e.auth)return logout(); showError('Could not load sign-up settings', e.message); });
  };
  function renderSignup(s){
    var v = $('view'); v.innerHTML = '';
    v.appendChild(el('h1',{},'Student self sign-up'));
    v.appendChild(el('p',{class:'lead'},'When open, students can create their own account from the login page using a class code.'));
    var c = el('div',{class:'card'});
    c.innerHTML = '<div class="field"><label><input id="su-open" type="checkbox" '+(s.open?'checked':'')+'> Allow new students to sign up themselves</label></div>'+
      '<div class="field"><label>Class code (at least 4 chars)</label><input id="su-code" type="text" value="'+esc(s.code||'')+'"></div>'+
      '<div class="field"><label>Note shown to students (optional, 120 chars)</label><input id="su-note" type="text" maxlength="120" value="'+esc(s.note||'')+'"></div>';
    var m = el('div',{class:'msg',id:'su-msg'});
    var row = el('div',{class:'row'});
    row.appendChild(el('button',{class:'btn',onclick:function(){
      m.className='msg';m.textContent='Saving…';
      api.post('/api/admin/signup',{open:document.getElementById('su-open').checked,code:document.getElementById('su-code').value,note:document.getElementById('su-note').value})
        .then(function(r){ m.className='msg ok'; m.textContent = r.open?'Sign-up OPEN with code "'+r.code+'".':'Sign-up closed.'; })
        .catch(function(e){ m.className='msg err'; m.textContent=e.message; });
    }},'Save'));
    row.appendChild(m);
    c.appendChild(row);
    v.appendChild(c);
  }

  /* --- Content --- */
  ROUTES.content = function(){
    renderNav('content', ME);
    var v = $('view'); v.innerHTML = '';
    v.appendChild(el('h1',{},'Content'));
    v.appendChild(el('p',{class:'lead'},'The question bank ships inside the app at <code>assets/js/data/</code> and <code>assets/&lt;subject&gt;/</code>. Edit those files and restart the server to pick up changes.'));
    var c = el('div',{class:'card'});
    c.appendChild(el('h2',{},'Included subjects (Class 10)'));
    c.innerHTML += '<ul style="line-height:1.9"><li>Mathematics</li><li>Science (with chapter figures)</li><li>Social Science</li><li>Hindi</li><li>English</li><li>Sanskrit (board papers + keyed MCQs)</li></ul>';
    var row = el('div',{class:'row'});
    row.appendChild(el('a',{class:'btn ghost',href:'/',target:'_blank'},'Open study app in new tab'));
    c.appendChild(row);
    v.appendChild(c);
  };

  /* --- Audit --- */
  ROUTES.audit = function(){
    renderNav('audit', ME);
    api.get('/api/admin/audit').then(function(a){
      var v=$('view'); v.innerHTML='';
      v.appendChild(el('h1',{},'Audit log'));
      v.appendChild(el('p',{class:'lead'}, 'Last '+(a.audit?a.audit.length:0)+' admin actions (newest first).'));
      var rows = (a.audit||[]).map(function(r){
        return (r.ts||'').slice(0,19).replace('T',' ') + '  ' +
               String(r.who||'').padEnd(14) + '  ' +
               String(r.what||'').padEnd(18) + '  ' +
               String(r.detail||'');
      }).join('\n');
      var c = el('div',{class:'card'});
      c.appendChild(el('pre',{class:'log'}, esc(rows||'(empty)')));
      v.appendChild(c);
    }).catch(function(e){ if(e.auth)return logout(); showError('Could not load audit log', e.message); });
  };

  /* ---------- boot ---------- */
  /* 1. verify token with same-origin /api/auth/me — no guessing, no probing */
  api.get('/api/auth/me').then(function(res){
    ME = res.user || {};
    try{ localStorage.setItem('upay.user', JSON.stringify(ME)); }catch(e){}
    go();
  }).catch(function(e){
    if (e.auth){
      try{ localStorage.removeItem('upay.token'); localStorage.removeItem('upay.user'); }catch(ee){}
      location.replace('/login.html?next=/portal.html');
      return;
    }
    renderNav('overview', {role:'admin',name:'admin'});
    showError('Could not load the dashboard',
      (e.message||'')+' — Make sure "node server.js" is running on port 8004 and you opened http://localhost:8004 (not a file:// path).');
  });
})();
