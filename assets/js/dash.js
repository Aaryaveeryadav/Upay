/* Upay admin dashboard — built from scratch, same-origin /api only. */
(function(){
  'use strict';

  var TOK = null;
  try { TOK = localStorage.getItem('upay.token'); } catch(e){}
  if (!TOK){ goLogin(); return; }

  var ME = null;
  var TABS = [
    ['overview','Overview'],
    ['key','AI / API key'],
    ['users','Users'],
    ['signup','Sign-up'],
    ['content','Content'],
    ['audit','Audit log']
  ];

  function $(id){ return document.getElementById(id); }
  function el(tag, attrs, html){
    var e = document.createElement(tag);
    if (attrs){
      for (var k in attrs){
        if (k === 'class') e.className = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
        else e.setAttribute(k, attrs[k]);
      }
    }
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function goLogin(){
    try { localStorage.removeItem('upay.token'); localStorage.removeItem('upay.user'); } catch(e){}
    location.replace('/login.html?next=/dash.html');
  }
  function errBox(title, detail){
    var v = $('view'); v.innerHTML = '';
    var c = el('div',{class:'card'});
    c.appendChild(el('h2',{},esc(title)));
    c.appendChild(el('p',{},esc(detail||'')));
    var r = el('div',{class:'row'});
    r.appendChild(el('button',{class:'btn',onclick:function(){location.reload();}},'Reload'));
    r.appendChild(el('a',{class:'btn ghost',href:'/login.html'},'Back to sign in'));
    c.appendChild(r);
    v.appendChild(c);
  }

  function api(method, path, body){
    var headers = {};
    if (TOK) headers['authorization'] = 'Bearer ' + TOK;
    if (body !== undefined) headers['content-type'] = 'application/json';
    return fetch(path, { method:method, headers:headers, body: body===undefined?undefined:JSON.stringify(body) })
      .then(function(r){
        return r.text().then(function(txt){
          var j={};
          try { j = txt ? JSON.parse(txt) : {}; }
          catch(e){ j = {_badJson:true, _status:r.status}; }
          if (r.status === 401){
            var e = new Error(j.error || 'Your session has expired. Please sign in again.');
            e.auth = true; throw e;
          }
          if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
          return j;
        });
      });
  }

  function renderNav(current){
    var nav = $('nav'); nav.innerHTML = '';
    TABS.forEach(function(t){
      nav.appendChild(el('a',{class:'nav-a '+(current===t[0]?'on':''), href:'#/'+t[0]}, t[1]));
    });
    nav.appendChild(el('a',{class:'nav-a right',href:'/'},'Study app →'));
    var who = $('who'); who.innerHTML = '';
    who.appendChild(el('span',{class:'pill'},esc((ME&&ME.role)||'admin')));
    who.appendChild(el('span',{class:'wname'},esc((ME&&ME.name)||'admin')));
    var b = el('button',{onclick:function(){
      api('POST','/api/auth/logout',{}).catch(function(){}).then(goLogin);
    }},'Sign out');
    who.appendChild(b);
  }

  function route(){
    var h = (location.hash||'#/overview').replace(/^#\/?/,'');
    var i = h.indexOf('?');
    var name = (i>=0 ? h.slice(0,i) : h).split('/')[0] || 'overview';
    var handler = ROUTES[name];
    if (!handler){ location.hash = '#/overview'; return; }
    $('view').innerHTML = '<div class="loading">Loading…</div>';
    try { handler(); }
    catch(e){ errBox('This tab failed to render', e.message); }
  }
  window.addEventListener('hashchange', route);

  var ROUTES = {};

  /* ===== OVERVIEW ===== */
  ROUTES.overview = function(){
    Promise.all([
      api('GET','/api/admin/users').catch(function(e){return {users:[],_e:e.message};}),
      api('GET','/api/admin/key').catch(function(e){return {_e:e.message};}),
      api('GET','/api/admin/signup').catch(function(e){return {_e:e.message};}),
      api('GET','/api/ai/cache').catch(function(e){return {items:[],_e:e.message};})
    ]).then(function(all){
      var u=all[0], k=all[1], s=all[2], c=all[3];
      renderNav('overview');
      var users = u.users||[];
      var counts = {admin:0,teacher:0,student:0};
      users.forEach(function(x){ counts[x.role]=(counts[x.role]||0)+1; });
      var v = $('view'); v.innerHTML = '';
      v.appendChild(el('h1',{},'Dashboard'));
      v.appendChild(el('p',{class:'lead'},'Welcome back, <b>'+esc((ME&&ME.name)||'admin')+'</b>. Manage the Gemini API key, user accounts and sign-up settings from here.'));
      var grid = el('div',{class:'grid'});
      function stat(n,l,d){
        var s = el('div',{class:'stat'});
        s.appendChild(el('div',{class:'n'},String(n)));
        s.appendChild(el('div',{class:'l'},l));
        if (d) s.appendChild(el('div',{class:'d',html:d}));
        return s;
      }
      grid.appendChild(stat(users.length,'Users total',counts.admin+' admin · '+counts.teacher+' teacher · '+counts.student+' student'));
      grid.appendChild(stat(k.count||0,'Gemini key(s) in ring','Model: <code>'+esc(k.model||'—')+'</code>'));
      grid.appendChild(stat(Number(c.count)||0,'Your cached AI answers','Offline reuse saves tokens.'));
      grid.appendChild(stat(s.open?'Open':'Closed','Student self sign-up', s.open ? 'Class code <code>'+esc(s.code||'')+'</code>' : 'Closed'));
      v.appendChild(grid);
      var cd = el('div',{class:'card'});
      cd.appendChild(el('h2',{},'Gemini / AI status'));
      var p = el('p');
      if (k.set){
        p.innerHTML = '<span class="tag ok">set</span> <code>'+esc(k.masked||'')+'</code>';
      } else {
        p.innerHTML = '<span class="tag bad">not set</span> Add a Gemini API key on the <a href="#/key">AI / API key</a> tab to enable AI solving.';
      }
      cd.appendChild(p);
      var r = el('div',{class:'row'});
      r.appendChild(el('a',{class:'btn',href:'#/key'},'Manage key'));
      r.appendChild(el('a',{class:'btn ghost',href:'#/users'},'Manage users'));
      r.appendChild(el('a',{class:'btn ghost',href:'/'},'Open study app'));
      cd.appendChild(r);
      v.appendChild(cd);
    }).catch(function(e){
      if (e.auth) return goLogin();
      renderNav('overview');
      errBox('Could not load dashboard', e.message);
    });
  };

  /* ===== API KEY ===== */
  ROUTES.key = function(){
    renderNav('key');
    Promise.all([
      api('GET','/api/admin/key'),
      api('GET','/api/admin/key/models').catch(function(){return {models:[]};})
    ]).then(function(a){ renderKey(a[0], a[1]); })
      .catch(function(e){ if(e.auth)return goLogin(); errBox('Could not load key info',e.message); });
  };
  function renderKey(k,m){
    var models = (m.models||[]).slice().sort();
    var v = $('view'); v.innerHTML = '';
    v.appendChild(el('h1',{},'AI / Gemini API key'));
    v.appendChild(el('p',{class:'lead'},'Paste a Google Gemini API key here. Multiple keys can be added (one per line); failed keys fall through to the next. Keys are stored encrypted on disk.'));
    var c1 = el('div',{class:'card'});
    c1.appendChild(el('h2',{},'Current status'));
    c1.appendChild(el('p',{html: k.set
      ? '<span class="tag ok">configured</span> '+(k.count||0)+' key(s) in the ring · model <code>'+esc(k.model||'')+'</code>'
      : '<span class="tag bad">no key</span> Offline MCQs still work; AI solving needs a key.'}));
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
    c1.querySelectorAll('button[data-rm]').forEach(function(b){
      b.onclick = function(){
        var masked = b.getAttribute('data-rm');
        if (!confirm('Remove key '+masked+' from the ring?')) return;
        api('POST','/api/admin/key',{remove:masked}).then(function(k2){
          api('GET','/api/admin/key/models').catch(function(){return {models:[]};}).then(function(m2){ renderKey(k2,m2); });
        }).catch(function(e){ alert(e.message); });
      };
    });

    var c2 = el('div',{class:'card'});
    c2.appendChild(el('h2',{},'Add key(s)'));
    c2.appendChild(el('p',{class:'lead',style:'margin:0 0 10px'},'Paste one or more keys (one per line, or comma-separated). New keys are <b>added</b> to the ring.'));
    c2.appendChild(el('div',{class:'field',html:'<label for="ki">Gemini API key(s)</label><textarea id="ki" rows="3" placeholder="AIzaSy..."></textarea><small>Get one at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>.</small>'}));
    c2.appendChild(el('div',{class:'field',html:'<label for="mi">Model</label><input id="mi" type="text" value="'+esc(k.model||m.current||'gemini-2.0-flash')+'">'}));
    var msg = el('div',{class:'msg',id:'km'});
    var row = el('div',{class:'row'});
    function km(cls,txt){ msg.className='msg '+(cls||''); msg.textContent=txt||''; }
    row.appendChild(el('button',{class:'btn',onclick:function(){
      km('','Saving…');
      api('POST','/api/admin/key',{key:document.getElementById('ki').value,model:document.getElementById('mi').value})
        .then(function(k2){ km('ok','Saved. Ring now has '+(k2.count||0)+' key(s).');
          api('GET','/api/admin/key/models').catch(function(){return {models:[]};}).then(function(m2){ renderKey(k2,m2); }); })
        .catch(function(e){ km('err',e.message); });
    }},'Save key(s)'));
    row.appendChild(el('button',{class:'btn ghost',onclick:function(){
      km('','Saving model…');
      api('POST','/api/admin/key',{model:document.getElementById('mi').value})
        .then(function(k2){ km('ok','Model set to '+k2.model+'.'); renderKey(k2,m); })
        .catch(function(e){ km('err',e.message); });
    }},'Save model only'));
    row.appendChild(el('button',{class:'btn ghost',onclick:function(){
      km('','Testing…');
      api('POST','/api/admin/key/test',{model:document.getElementById('mi').value||undefined})
        .then(function(r){ km('ok','OK via '+r.model+' — reply: '+r.reply.slice(0,80)); })
        .catch(function(e){ km('err','Test failed: '+e.message); });
    }},'Test key'));
    row.appendChild(el('button',{class:'btn danger',onclick:function(){
      if (!confirm('Remove ALL keys from the ring?')) return;
      km('','Clearing…');
      api('POST','/api/admin/key',{key:null,model:document.getElementById('mi').value})
        .then(function(k2){ km('ok','All keys removed.'); renderKey(k2,m); })
        .catch(function(e){ km('err',e.message); });
    }},'Clear all'));
    c2.appendChild(row);
    c2.appendChild(msg);
    v.appendChild(c2);

    if (models.length){
      var c3 = el('div',{class:'card'});
      c3.appendChild(el('h2',{},'Available models'));
      var chips = el('div',{class:'chips'});
      models.forEach(function(mm){
        chips.appendChild(el('span',{class:'chip',onclick:function(){ document.getElementById('mi').value=mm; }}, esc(mm)));
      });
      c3.appendChild(chips);
      v.appendChild(c3);
    }
  }

  /* ===== USERS ===== */
  ROUTES.users = function(){
    renderNav('users');
    api('GET','/api/admin/users').then(renderUsers)
      .catch(function(e){ if(e.auth)return goLogin(); errBox('Could not load users',e.message); });
  };
  function renderUsers(u){
    var list = (u.users||[]).slice().sort(function(a,b){return (a.createdAt||'').localeCompare(b.createdAt||'');});
    var v = $('view'); v.innerHTML = '';
    v.appendChild(el('h1',{},'Users'));
    v.appendChild(el('p',{class:'lead'}, list.length+' account(s) on this server.'));
    var c1 = el('div',{class:'card'});
    c1.appendChild(el('h2',{},'Add one user'));
    c1.innerHTML += '<div class="grid">'+
      '<div class="field"><label>Username</label><input id="nu-u" type="text"></div>'+
      '<div class="field"><label>Display name</label><input id="nu-n" type="text"></div>'+
      '<div class="field"><label>Role</label><select id="nu-r"><option value="student">student</option><option value="teacher">teacher</option><option value="admin">admin</option></select></div>'+
      '<div class="field"><label>Temporary password</label><input id="nu-p" type="text" placeholder="auto-generated"></div>'+
      '</div>';
    var m1 = el('div',{class:'msg',id:'nu-m'});
    var r1 = el('div',{class:'row'});
    r1.appendChild(el('button',{class:'btn',onclick:function(){
      m1.className='msg'; m1.textContent='Creating…';
      var body={user:document.getElementById('nu-u').value.trim().toLowerCase(),
                name:document.getElementById('nu-n').value.trim(),
                role:document.getElementById('nu-r').value,
                password:document.getElementById('nu-p').value||undefined};
      api('POST','/api/admin/users',body).then(function(){
        m1.className='msg ok'; m1.textContent='User created.'; ROUTES.users();
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
          '<td>'+(ME&&ME.user===x.user ? '<span class="muted">you</span>' :
            '<button class="btn sm danger" data-u="'+esc(x.user)+'">Remove</button>')+'</td></tr>';
      }).join('')+'</tbody>';
    c2.appendChild(tbl);
    v.appendChild(c2);
    c2.querySelectorAll('button[data-u]').forEach(function(b){
      b.onclick = function(){
        var un = b.getAttribute('data-u');
        if (!confirm('Remove user '+un+'?')) return;
        api('DELETE','/api/admin/users',{user:un}).then(function(){ ROUTES.users(); })
          .catch(function(e){ alert(e.message); });
      };
    });
  }

  /* ===== SIGN-UP ===== */
  ROUTES.signup = function(){
    renderNav('signup');
    api('GET','/api/admin/signup').then(renderSignup)
      .catch(function(e){ if(e.auth)return goLogin(); errBox('Could not load sign-up settings',e.message); });
  };
  function renderSignup(s){
    var v = $('view'); v.innerHTML = '';
    v.appendChild(el('h1',{},'Student self sign-up'));
    v.appendChild(el('p',{class:'lead'},'When open, students can create their own account from the login page using a class code you give them.'));
    var c = el('div',{class:'card'});
    c.innerHTML = '<div class="field"><label><input id="su-o" type="checkbox" '+(s.open?'checked':'')+'> Allow new students to sign up themselves</label></div>'+
      '<div class="field"><label>Class code (at least 4 characters)</label><input id="su-c" type="text" value="'+esc(s.code||'')+'"></div>'+
      '<div class="field"><label>Note shown to students (optional, 120 chars)</label><input id="su-n" type="text" maxlength="120" value="'+esc(s.note||'')+'"></div>';
    var m = el('div',{class:'msg',id:'su-m'});
    var r = el('div',{class:'row'});
    r.appendChild(el('button',{class:'btn',onclick:function(){
      m.className='msg'; m.textContent='Saving…';
      api('POST','/api/admin/signup',{open:document.getElementById('su-o').checked,code:document.getElementById('su-c').value,note:document.getElementById('su-n').value})
        .then(function(rr){ m.className='msg ok'; m.textContent = rr.open ? 'Sign-up is OPEN with code "'+rr.code+'".' : 'Sign-up closed.'; })
        .catch(function(e){ m.className='msg err'; m.textContent=e.message; });
    }},'Save'));
    r.appendChild(m);
    c.appendChild(r);
    v.appendChild(c);
  }

  /* ===== CONTENT ===== */
  ROUTES.content = function(){
    renderNav('content');
    var v = $('view'); v.innerHTML = '';
    v.appendChild(el('h1',{},'Content'));
    v.appendChild(el('p',{class:'lead'},'The question bank ships inside the app under <code>assets/js/data/</code> and <code>assets/&lt;subject&gt;/</code>.'));
    var c = el('div',{class:'card'});
    c.appendChild(el('h2',{},'Included subjects (Class 10)'));
    c.innerHTML += '<ul style="line-height:1.9;padding-left:20px;margin:10px 0">'+
      '<li>Mathematics (14 chapters)</li>'+
      '<li>Science (13 chapters, with figures)</li>'+
      '<li>Social Science (26 chapters)</li>'+
      '<li>Hindi (42 chapters)</li>'+
      '<li>English (18 chapters)</li>'+
      '<li>Sanskrit (39 chapters, 9 board PDFs, keyed MCQs)</li></ul>';
    var r = el('div',{class:'row'});
    r.appendChild(el('a',{class:'btn ghost',href:'/',target:'_blank'},'Open study app in a new tab'));
    c.appendChild(r);
    v.appendChild(c);
  };

  /* ===== AUDIT ===== */
  ROUTES.audit = function(){
    renderNav('audit');
    api('GET','/api/admin/audit').then(function(a){
      var v=$('view'); v.innerHTML='';
      v.appendChild(el('h1',{},'Audit log'));
      v.appendChild(el('p',{class:'lead'},'Last '+(a.audit?a.audit.length:0)+' admin actions (newest first).'));
      var rows = (a.audit||[]).map(function(r){
        return (r.ts||'').slice(0,19).replace('T',' ') + '  ' +
               String(r.who||'').padEnd(14) + '  ' +
               String(r.what||'').padEnd(18) + '  ' +
               String(r.detail||'');
      }).join('\n');
      var c = el('div',{class:'card'});
      c.appendChild(el('pre',{class:'log'}, esc(rows||'(empty)')));
      v.appendChild(c);
    }).catch(function(e){ if(e.auth)return goLogin(); errBox('Could not load audit log',e.message); });
  };

  /* ===== boot ===== */
  api('GET','/api/auth/me').then(function(res){
    ME = res.user || {};
    try { localStorage.setItem('upay.user', JSON.stringify(ME)); } catch(e){}
    if (!location.hash || location.hash === '#') location.hash = '#/overview';
    route();
  }).catch(function(e){
    if (e.auth){ goLogin(); return; }
    renderNav && renderNav('overview');
    errBox('Could not load the dashboard',
      (e.message||'')+' — Make sure you opened this page from http://localhost:8004 and "node server.js" is running.');
  });
})();
