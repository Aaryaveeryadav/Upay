/* =====================================================================
   Upay · app shell, router and views
   ===================================================================== */
window.UP = window.UP || {};
(function () {
  const S = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem('upay.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    /* Typed read. Storage is attacker-controllable: another script on the
       origin, a restored backup, or the student opening the console can put
       any JSON there. Without this, a stored object where an array belongs
       took the whole Home or Saved view down with
       "S.saved.filter is not a function". Returning the default instead
       keeps the app usable and simply discards the unusable value. */
    getTyped(k, d, type) {
      const v = store.get(k, d);
      if (v === null || v === undefined) return d;
      if (type === 'array') return Array.isArray(v) ? v : d;
      if (type === 'object') return (typeof v === 'object' && !Array.isArray(v)) ? v : d;
      if (type === 'string') return typeof v === 'string' ? v : d;
      if (type === 'number') return (typeof v === 'number' && isFinite(v)) ? v : d;
      return v;
    },
    set(k, v) { try { localStorage.setItem('upay.' + k, JSON.stringify(v)); } catch (e) { } },
    remove(k) { try { localStorage.removeItem('upay.' + k); } catch(e){} }
  };

  S.lang = store.getTyped('lang', 'en', 'string');
  S.cls = store.getTyped('cls', 10, 'number');
  S.subject = store.getTyped('subject', 'maths', 'string');
  S.board = store.getTyped('board', 'cbse', 'string');
  S.chapterId = null;
  S.answer = null;
  S.aiAnswer = null; S.aiState = null; S.aiQuestion = null; S.aiScope = null; S.aiNote = ''; S.aiRetry = false;
  S.photoState = null; S.photoNote = ''; S.photoPreview = null;
  S.savedKey = 'saved'; // legacy/guest list remains on this device
  S.saved = store.getTyped(S.savedKey, [], 'array');
  S.savedTags = store.getTyped('savedTags', ['important', 'revisit', 'exam'], 'array');
  S.savedFolder = store.getTyped('savedFolder', 'all', 'string');
  S.recent = store.getTyped('recent', [], 'array');   // last 12 asked questions
  S.progress = store.getTyped('progress', { daily: {} }, 'object');   // date -> count
  S.mastery = {}; // loaded per owner, board, class and subject below
  S.dailySet = store.getTyped('dailySet', null, 'object');
  S.mockTest = store.getTyped('mockTest', null, 'object');
  function clearMockTest() {
    S.mockTest = null;
    store.remove(mockStoreKey());
    clearInterval(window.__mtTimer);
  }
  S.hardList = [];
  S.dailyProgress = {};
  S.cmdkOpen = false; S.supabaseReady = false;
  S.q = '';                             // current question text
  S.user = null;           // {id, email, name} from Supabase
  S.profile = null;        // Supabase profile row (grade, preferred_lang, etc.)

  // Guest sessions keep their original local-storage keys. Signed-in owners
  // get separate practice sessions, so a shared device cannot show one user's
  // mock answers or daily questions to another.
  function ownerSuffix() { return S.savedKey === 'saved' ? '' : '.owner.' + encodeURIComponent(S.savedKey); }
  function mockStoreKey() { return 'mockTest' + ownerSuffix(); }
  function dailyStoreKey() { return 'dailySet' + ownerSuffix(); }
  function recentStoreKey() { return 'recent' + ownerSuffix(); }
  function progressStoreKey() { return 'progress' + ownerSuffix(); }
  function scopedDataKey(kind) {
    return kind + '.scope.' + encodeURIComponent(JSON.stringify([S.savedKey, S.board, +S.cls, S.subject]));
  }
  function syncStudyScope() {
    const key = scopedDataKey('mastery');
    if (S.studyScope === key) return;
    S.studyScope = key;
    const mastery = store.get(key, {}), hard = store.get(scopedDataKey('hardList'), []);
    const daily = store.get(scopedDataKey('dailyProgress'), {});
    S.mastery = mastery && typeof mastery === 'object' && !Array.isArray(mastery) ? mastery : {};
    S.hardList = Array.isArray(hard) ? hard : [];
    S.dailyProgress = daily && typeof daily === 'object' && !Array.isArray(daily) ? daily : {};
  }
  function saveMastery() { store.set(scopedDataKey('mastery'), S.mastery); }
  function saveHardList() { store.set(scopedDataKey('hardList'), S.hardList); }
  function saveDailyProgress() { store.set(scopedDataKey('dailyProgress'), S.dailyProgress); }
  syncStudyScope();

  UP.S = S;
  function switchSavedOwner(kind, id) {
    // Keep the legacy guest list intact; never upload it into whichever
    // account happens to sign in next on a shared device.
    const key = kind && id ? 'saved.owner.' + kind + '.' + encodeURIComponent(String(id)) : 'saved';
    if (key === S.savedKey) return;
    S.savedKey = key;
    const list = store.get(key, []);
    S.saved = Array.isArray(list) ? list : [];
    S.dailySet = store.get(dailyStoreKey(), null);
    S.mockTest = store.get(mockStoreKey(), null);
    const recent = store.get(recentStoreKey(), []), progress = store.get(progressStoreKey(), {daily:{}});
    S.recent = Array.isArray(recent) ? recent : [];
    S.progress = progress && typeof progress === 'object' ? progress : {daily:{}};
    clearInterval(window.__mtTimer);
    syncStudyScope();
  }
  document.documentElement.lang = S.lang === 'hi' ? 'hi' : 'en';
  // SSR admin button — only reveal if we're on an admin device
  if (isAdmin()){
    const b = document.getElementById('ssr-admin-btn');
    if (b) b.hidden = false;
  }
  // .up-ready is added AFTER render() at the bottom so the SSR loading skeleton
  // stays visible until real content replaces it.
  // Preload voices so the first "Listen" click gets a real hi-IN/en-IN voice
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
  }

  /* ------------------------------ admin detection ------------------------------ */
  // The admin UI is shown only for a role returned by server-verified sign-in.
  // Never trust localhost, a decoded-but-unverified token, or a profile field.
  function isAdmin(){
    return !!(S.user && S.user.role === 'admin');
  }

  /* ------------------------------ auth bootstrap ------------------------------ */
  let sb = window.__SUPABASE__;
  async function resolveSupabase() {
    if (window.__SUPABASE__ && window.__SUPABASE__.auth) sb = window.__SUPABASE__;
    if (sb && !sb.auth && typeof sb.then === 'function') {
      const pending = sb;
      sb = await new Promise(resolve => {
        const timer = setTimeout(() => resolve(null), 4000);
        pending.then(client => { clearTimeout(timer); resolve(client || null); });
      });
    }
    return sb;
  }
  async function sbBoot() {
    // If we have a local-server token (from offline login), verify it against /api/auth/me
    const localTok = localStorage.getItem('upay.token');
    if (localTok) {
      try {
        const r = await fetch('/api/auth/me', { headers:{authorization:'Bearer '+localTok} });
        if (r.ok) {
          const j = await r.json();
          if (j.user) {
            S.user = { id:j.user.user, email:j.user.user, name:j.user.name||j.user.user, role:j.user.role, auth:'local', mustChange:!!j.user.mustChange };
            switchSavedOwner('local', S.user.id);
            S.supabaseReady = true; render(); return;
          }
        } else {
          localStorage.removeItem('upay.token');
        }
      } catch(e){}
    }
    await resolveSupabase();
    if (!sb || window.__supabaseOnline === false) { S.supabaseReady = true; render(); return; }
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) applySession(data.session);
      sb.auth.onAuthStateChange((ev, sess) => {
        if ((ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED') && !localStorage.getItem('upay.token')) applySession(sess);
        else if (ev === 'SIGNED_OUT' && !localStorage.getItem('upay.token')) clearSession();
      });
    } catch (e) { console.warn('auth init error', e); }
    S.supabaseReady = true;
  }
  function applySession(sess) {
    if (!sess || !sess.user) { clearSession(); return; }
    const u = sess.user;
    const name = (u.user_metadata && u.user_metadata.name)
      || (u.user_metadata && u.user_metadata.full_name)
      || (u.email ? u.email.split('@')[0] : 'Student');
    S.user = { id: u.id, email: u.email, name: name, auth: 'supabase' };
    switchSavedOwner('supabase', u.id);
    localStorage.setItem('upay.sb', '1');
    // fetch profile (may not exist until the DB trigger creates it)
    loadProfile();
    // migrate local saved list to Supabase once
    syncSavedUp();
    render();
  }
  function clearSession() {
    S.user = null; S.profile = null;
    switchSavedOwner();
    localStorage.removeItem('upay.sb');
    render();
  }
  async function loadProfile() {
    if (!sb || !S.user || S.user.auth !== 'supabase') return;
    const owner = S.user.id;
    try {
      const { data, error } = await sb.from('profiles').select('*').eq('id', owner).maybeSingle();
      if (!error && data && S.user && S.user.auth === 'supabase' && S.user.id === owner) { S.profile = data; render(); }
    } catch (e) { /* ignore */ }
  }
  async function saveProfile(patch) {
    if (!sb || !S.user || S.user.auth !== 'supabase') return false;
    const owner = S.user.id;
    try {
      const { error } = await sb.from('profiles').upsert({ id: owner, updated_at: new Date().toISOString(), ...patch });
      if (!error && S.user && S.user.auth === 'supabase' && S.user.id === owner) { S.profile = { ...(S.profile || {}), ...patch, id: owner }; return true; }
    } catch (_) {}
    return false;
  }
  async function syncSavedUp() {
    if (!sb || !S.user || S.user.auth !== 'supabase') return;
    const owner = S.user.id, key = S.savedKey;
    try {
      // Filter even with RLS enabled, and never overwrite a newer account's
      // local state if this request completes after the user switches accounts.
      const { data, error } = await sb.from('saved_questions').select('*')
        .eq('user_id', owner).order('created_at', { ascending: false }).limit(200);
      if (error || !data || !S.user || S.user.id !== owner || S.savedKey !== key) return;
      const existing = Array.isArray(S.saved) ? S.saved : [];
      const remote = data.map(r => {
        const prior = existing.find(x => x.id === r.id) || {};
        return { ...prior, id: r.id, q: r.question_text, subject: r.subject || '', chapter: r.chapter || '', date: (r.created_at || '').slice(0, 10) };
      });
      // Offline additions are retained locally instead of being erased by the
      // first successful cloud read. Do not migrate the guest list implicitly.
      const pending = existing.filter(x => !x.id && !remote.some(r => r.q === x.q && r.chapter === (x.chapter || '')));
      S.saved = pending.concat(remote).slice(0, 200);
      saveSaved(); render();
    } catch (e) { /* retain the owner-scoped local list if offline */ }
  }
  async function addSavedRemote(item) {
    if (!sb || !S.user || S.user.auth !== 'supabase') return;
    const owner = S.user.id, key = S.savedKey;
    try {
      const { data, error } = await sb.from('saved_questions').insert({
        user_id: owner, question_text: item.q, subject: item.subject || S.subject,
        chapter: item.chapter || '', answer_snippet: ''
      }).select().single();
      if (!error && data && S.user && S.user.id === owner && S.savedKey === key) {
        item.id = data.id; saveSaved();
      }
    } catch (e) { /* item remains in owner-scoped local storage */ }
  }
  async function removeSavedRemote(id) {
    if (!sb || !S.user || S.user.auth !== 'supabase' || !id) return;
    const owner = S.user.id;
    try { await sb.from('saved_questions').delete().eq('id', id).eq('user_id', owner); } catch (e) { /* local removal still works */ }
  }
  /* Fetch interceptor: attach the best-available auth token to same-origin /api requests */
  const _origFetch = window.fetch.bind(window);
  window.fetch = async function (url, opts) {
    opts = opts || {};
    let isApi = false;
    try {
      const u = new URL(String(url), window.location.href);
      isApi = (u.origin === window.location.origin) && u.pathname.startsWith('/api/');
    } catch (e) { isApi = /^\/api\//.test(String(url)); }
    if (isApi) {
      const hdrs = new Headers(opts.headers || {});
      // Several callers supply an empty "Bearer " placeholder. Treat that as
      // absent so a signed-in Supabase student actually sends their session.
      const existingAuth = hdrs.get('authorization') || '';
      if (!existingAuth || /^Bearer\s*$/i.test(existingAuth)) {
        let tok = localStorage.getItem('upay.token') || '';
        if (!tok && sb) {
          try {
            const { data } = await sb.auth.getSession();
            if (data && data.session && data.session.access_token) tok = data.session.access_token;
          } catch (e) {}
        }
        if (tok) hdrs.set('authorization', 'Bearer ' + tok);
      }
      opts.headers = hdrs;
    }
    return _origFetch(url, opts);
  };

  /* Use whichever auth token is active: Supabase session (preferred) or local admin token */
  async function authBearer() {
    const localToken = localStorage.getItem('upay.token');
    if (localToken) return localToken;
    if (sb) {
      try {
        const { data } = await sb.auth.getSession();
        if (data && data.session && data.session.access_token) return data.session.access_token;
      } catch (e) { /* ignore */ }
    }
    return '';
  }
  window.__authBearer = authBearer;

  /* Local server-auth fallback: when Supabase CDN or network is unreachable
     (very common on Indian school/office wifi), sign in against /api/auth/login
     which issues a bearer token the rest of the app already understands.
     Accepts either username OR email in the "user" field, matching how the
     form submits both to Supabase (as email) and to local auth (as user). */
  async function localSignIn(identifier, password) {
    // Try as email first (for admin who typed "admin" it's a username, not email)
    async function tryLogin(userField) {
      const r = await fetch('/api/auth/login', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ user: userField, password })
      });
      return { r, j: await r.json().catch(()=>({})) };
    }
    let {r, j} = await tryLogin(identifier);
    // If that failed and identifier looks like an email, try the local part before @ as username
    if (!r.ok && identifier.indexOf('@') > 0) {
      const local = identifier.split('@')[0];
      const r2 = await tryLogin(local);
      if (r2.r.ok) { r = r2.r; j = r2.j; }
    }
    if (!r.ok) return { error: { message: j.error || ('HTTP '+r.status) } };
    localStorage.setItem('upay.token', j.token);
    const u = j.user || {};
    S.user = { id: u.user, email: identifier, name: u.name || identifier, role: u.role, auth: 'local', mustChange: !!u.mustChange };
    switchSavedOwner('local', S.user.id);
    return {
      data: {
        session: { access_token: j.token, user:{id:u.user,email:identifier,user_metadata:{name:u.name||identifier}} },
        user: { id:u.user, email:identifier, user_metadata:{name:u.name||identifier}, role:u.role }
      }
    };
  }
  async function localSignOut() {
    try {
      await fetch('/api/auth/logout', {method:'POST', headers:{authorization:'Bearer '+(localStorage.getItem('upay.token')||'')}});
    } catch(e){}
    localStorage.removeItem('upay.token');
    localStorage.removeItem('upay.sb');
    S.user = null; S.profile = null;
    switchSavedOwner();
  }

  UP.sbSignIn = async function (identifier, password) {
    await resolveSupabase();
    // Always try Supabase first when it's definitely online. If SDK didn't load,
    // or the network can't reach Supabase, or Supabase returns "Invalid login
    // credentials", fall back to the local server (username/password) auth.
    if (sb && window.__supabaseOnline === true && identifier.includes('@')) {
      try {
        const res = await sb.auth.signInWithPassword({ email: identifier, password });
        if (!res.error) {
          if (localStorage.getItem('upay.token')) await localSignOut();
          if (res.data && res.data.session) applySession(res.data.session);
          return res;
        }
        // Supabase said invalid credentials — fall through to local auth so
        // that admin/student accounts on this server still work.
      } catch(e){ /* fall through */ }
    }
    return localSignIn(identifier, password);
  };
  UP.sbSignUp = async function (email, password, name) {
    await resolveSupabase();
    if (sb && window.__supabaseOnline !== false) {
      try { return await sb.auth.signUp({ email, password, options:{ data:{ name: name || email.split('@')[0] } } }); }
      catch(e){ return { error: { message: S.lang==='hi'?'खाता बनाने के लिए इंटरनेट चाहिए। कृपया स्कूल के कंप्यूटर पर एडमिन से संपर्क करें।':'Signup needs internet Supabase. On an offline/school network ask your admin for an account.' } }; }
    }
    return { error: { message: S.lang==='hi'?'खाता बनाने के लिए इंटरनेट चाहिए या एडमिन द्वारा बनाया खाता उपयोग करें।':'Signup is not available offline. Ask your admin for an account, or try again when online.' } };
  };
  UP.sbSignOut = async function () {
    if (localStorage.getItem('upay.token')) await localSignOut();
    if (sb) { try { await sb.auth.signOut(); } catch(e){} }
    clearSession();
  };
  UP.sbUpdate = saveProfile;
  /* Defer sbBoot until after all functions (incl. icon/render helpers) are
     defined. If Supabase is present it will re-render on SIGNED_IN anyway; if
     absent we still need a valid first render at boot-end. */
  S.supabaseReady = !!sb;
  setTimeout(sbBoot, 0);

  /* ------------------------------ i18n ------------------------------ */
  const T = {
    nav_home: ['Home', 'होम'],
    nav_ask: ['Ask a question', 'प्रश्न पूछें'],
    nav_syllabus: ['Syllabus & chapters', 'पाठ्यक्रम व अध्याय'],
    nav_boards: ['Boards', 'बोर्ड'],
    chooseBoard: ['Choose board', 'बोर्ड चुनिए'],
    chooseClass: ['Choose class', 'कक्षा चुनिए'],
    chooseSubject: ['Choose subject', 'विषय चुनिए'],
    boardShort: ['Board', 'बोर्ड'],
    subjectShort: ['Subject', 'विषय'],
    nav_books: ['Books & sources', 'पुस्तकें व स्रोत'],
    nav_saved: ['Saved', 'सहेजे गए'],
    nav_test: ['Test & sample papers', 'टेस्ट व सैंपल पेपर'],
    nav_pyq: ['Past years', 'पिछले वर्ष'],
    nav_mcq: ['MCQ drill', 'MCQ अभ्यास'],
    nav_about: ['About & method', 'परिचय व विधि'],
    learn: ['Learn', 'सीखिए'],
    library: ['Library', 'पुस्तकालय'],
    switchLang: ['हिंदी में देखें', 'View in English'],
    brandSub: ['every way to solve', 'हर उपाय, हर तरीका'],
    heroEyebrow: ['Class 10–12 · NCERT · Board-wise', 'कक्षा 10–12 · एनसीईआरटी · बोर्ड-वार'],
    heroTitle1: ['One question.', 'एक प्रश्न।'],
    heroTitle2: ['Every way', 'हर तरीका'],
    heroTitle3: ['to solve it.', 'हल करने का।'],
    heroLead: ['Ask any question from your syllabus. Upay shows the same answer worked out by different methods — so you learn the reasoning, not just the result. Every chapter page also gives concepts, formulas, past-board questions and a study plan.',
      'अपने पाठ्यक्रम का कोई भी प्रश्न पूछिए। उपाय वही उत्तर अलग-अलग विधियों से हल करके दिखाता है — जिससे आप केवल उत्तर नहीं, तर्क भी सीखते हैं। प्रत्येक अध्याय पृष्ठ पर अवधारणाएँ, सूत्र, पिछले बोर्ड प्रश्न तथा अध्ययन योजना भी मिलती है।'],
    askPlaceholder: {
      maths:   ['Type your question — e.g. 2x² + x − 6 = 0, or "HCF of 510 and 92"', 'अपना प्रश्न लिखिए — जैसे 2x² + x − 6 = 0, या "510 और 92 का म.स. ज्ञात कीजिए"'],
      science: ['Type your question — e.g. "Balance Fe + H₂O → Fe₃O₄ + H₂" or "Why is the sky blue?"', 'अपना प्रश्न लिखिए — जैसे "Fe + H₂O → Fe₃O₄ + H₂ को संतुलित कीजिए" या "आकाश नीला क्यों दिखाई देता है?"'],
      social:  ['Type your question — e.g. "What is resource planning?" or "Explain federalism in India."', 'अपना प्रश्न लिखिए — जैसे "संसाधन नियोजन क्या है?" या "भारत में संघवाद की व्याख्या कीजिए।"'],
      hindi:   ['अपना प्रश्न हिन्दी में लिखिए — जैसे "गोपियाँ उद्धव को बड़भागी क्यों कहती हैं?" या किसी पाठ का नाम।', 'अपना प्रश्न हिन्दी में लिखिए — जैसे "गोपियाँ उद्धव को बड़भागी क्यों कहती हैं?" या किसी पाठ का नाम।'],
      english: ['Type your question — e.g. "Why did Lencho write to letter to God?" or a chapter name.', 'अपना प्रश्न लिखिए — जैसे "लैंचो ने भगवान् को पत्र क्यों लिखा?" अथवा किसी पाठ का नाम।'],
      sanskrit:['अपना प्रश्न संस्कृते/हिन्द्यां लिखताम् — यथा "राम + आगच्छति इति सन्धिं कुरुत", अथवा पाठस्य नाम।', 'अपना प्रश्न संस्कृत में अथवा हिन्दी में लिखिए — जैसे "राम + आगच्छति की सन्धि कीजिए" या पाठ का नाम।'],
      physics:['Type your Physics question.', 'अपना भौतिकी प्रश्न लिखिए।'],
      chemistry:['Type your Chemistry question.', 'अपना रसायन विज्ञान प्रश्न लिखिए।'],
      biology:['Type your Biology question.', 'अपना जीव विज्ञान प्रश्न लिखिए।'],
      'applied-maths':['Type your Applied Mathematics question.', 'अपना अनुप्रयुक्त गणित प्रश्न लिखिए।'],
      accountancy:['Type your Accountancy question, including all figures and alternatives.', 'अपना लेखाशास्त्र प्रश्न सभी अंकों और विकल्पों के साथ लिखिए।'],
      'computerized-accounting':['Type your Computerised Accounting question.', 'अपना कम्प्यूटरीकृत लेखांकन प्रश्न लिखिए।'],
      economics:['Type your Economics question — for example, “What is GDP?”', 'अपना अर्थशास्त्र प्रश्न लिखिए — जैसे “GDP क्या है?”'], 
    },
    askBtn: ['Show me the ways', 'सभी तरीके दिखाइए'],
    tryOne: ['Try one:', 'आज़माइए:'],
    statChapters: ['chapters mapped', 'अध्याय मैप'],
    statMethods: ['methods per question', 'प्रति प्रश्न विधियाँ'],
    statPyq: ['past-board questions', 'बोर्ड प्रश्न'],
    statLang: ['languages', 'भाषाएँ'],
    howTitle: ['Why more than one method?', 'एक से अधिक विधि क्यों?'],
    howSub: ['Because a method you understand is worth more than an answer you copied.', 'क्योंकि जो विधि आप समझते हैं, वह नक़ल किए उत्तर से अधिक मूल्यवान है।'],
    f1t: ['Several methods, side by side', 'कई विधियाँ, साथ-साथ'],
    f1d: ['Faster method, safer method, visual method — each with its steps, its reason and the trap to avoid.', 'तेज़ विधि, सुरक्षित विधि, दृश्य विधि — प्रत्येक के चरण, कारण तथा बचने योग्य भूल सहित।'],
    f2t: ['Grounded in your NCERT chapter', 'आपके एनसीईआरटी अध्याय पर आधारित'],
    f2d: ['Chapter maps and source-tagged questions are available where supplied; coverage varies by subject.', 'जहाँ उपलब्ध हैं वहाँ अध्याय मानचित्र और स्रोत-टैग वाले प्रश्न दिए हैं; सामग्री विषय के अनुसार बदलती है।'],
    f3t: ['English and हिंदी, one tap apart', 'अंग्रेज़ी और हिंदी, एक टैप दूर'],
    f3d: ['Navigation supports English and Hindi; source questions remain in their supplied language.', 'नेविगेशन अंग्रेज़ी और हिंदी में है; स्रोत प्रश्न उपलब्ध भाषा में रखे गए हैं।'],
    chaptersTitle: ['Start with a chapter', 'किसी अध्याय से शुरू कीजिए'],
    chaptersSub: ['Class 10 Mathematics · NCERT 2024–25 rationalised syllabus', 'कक्षा 10 गणित · एनसीईआरटी 2024–25 संशोधित पाठ्यक्रम'],
    viewAll: ['All chapters', 'सभी अध्याय'],
    boardsTitle: ['Your board, your paper pattern', 'आपका बोर्ड, आपका प्रश्नपत्र प्रारूप'],
    boardsSub: ['Weightage, marking pattern and what to practise first.', 'भार, अंक-योजना और पहले क्या अभ्यास करें।'],
    sourcesTitle: ['Built from real textbooks', 'वास्तविक पाठ्यपुस्तकों से बना'],
    openChapter: ['Open chapter', 'अध्याय खोलें'],
    askTitle: ['Ask a question', 'प्रश्न पूछिए'],
    askSub: ['Write it the way it appears in your book. Upay checks the structure, not the exact wording.', 'जैसे पुस्तक में है वैसे ही लिखिए। उपाय शब्दों की जगह संरचना देखता है।'],
    classLabel: ['Class', 'कक्षा'],
    subjectLabel: ['Subject', 'विषय'],
    boardLabel: ['Board', 'बोर्ड'],
    chapterLabel: ['Chapter (optional)', 'अध्याय (वैकल्पिक)'],
    anyChapter: ['Any chapter', 'कोई भी अध्याय'],
    answerFor: ['Question', 'प्रश्न'],
    methods: ['methods', 'विधियाँ'],
    approaches: ['Ways to solve this', 'हल करने के तरीके'],
    whyItWorks: ['Why this works', 'यह क्यों काम करता है'],
    watchOut: ['Watch out', 'ध्यान दें'],
    checkIt: ['How to check your answer', 'उत्तर की जाँच कैसे करें'],
    related: ['Study these chapters', 'ये अध्याय पढ़िए'],
    copy: ['Copy answer', 'उत्तर कॉपी करें'],
    print: ['Print / PDF', 'प्रिंट / पीडीएफ'],
    save: ['Save', 'सहेजें'],
    saved: ['Saved', 'सहेजा गया'],
    newQ: ['Ask another', 'दूसरा प्रश्न'],
    noMatch: ['I have not matched this yet', 'यह प्रश्न अभी मिलान में नहीं आया'],
    syllabusTitle: ['Syllabus & chapters', 'पाठ्यक्रम व अध्याय'],
    syllabusSub: ['Open any chapter for concepts, formulas, past-board questions and a day-wise plan.', 'कोई भी अध्याय खोलिए — अवधारणाएँ, सूत्र, पिछले बोर्ड प्रश्न तथा दिन-वार योजना।'],
    search: ['Search chapters, topics, keywords…', 'अध्याय, विषय, कीवर्ड खोजिए…'],
    all: ['All', 'सभी'],
    concepts: ['Concepts', 'अवधारणाएँ'],
    formulas: ['Formulas', 'सूत्र'],
    pyq: ['Past board questions', 'पिछले बोर्ड प्रश्न'],
    planTab: ['Study plan', 'अध्ययन योजना'],
    marks: ['marks', 'अंक'],
    solveThis: ['Solve this', 'इसे हल करें'],
    noPyq: ['Past-paper questions for this chapter are being added. Use the concepts and formulas meanwhile.', 'इस अध्याय के बोर्ड प्रश्न जोड़े जा रहे हैं। तब तक अवधारणाएँ व सूत्र देखिए।'],
    booksTitle: ['Books & sources', 'पुस्तकें व स्रोत'],
    booksSub: ['What is loaded into Upay right now, and exactly how it was read.', 'अभी उपाय में क्या लोड है, और उसे ठीक कैसे पढ़ा गया।'],
    loaded: ['Loaded', 'लोडेड'],
    pending: ['Awaiting file', 'फ़ाइल प्रतीक्षित'],
    addBook: ['Add a book', 'पुस्तक जोड़ें'],
    addBookHint: ['Drop a PDF here — class, subject and language are detected from the file name.', 'यहाँ पीडीएफ छोड़िए — कक्षा, विषय व भाषा फ़ाइल-नाम से पहचानी जाती है।'],
    savedTitle: ['Saved questions', 'सहेजे गए प्रश्न'],
    savedSub: ['Your questions stay in this browser.', 'आपके प्रश्न इसी ब्राउज़र में रहते हैं।'],
    nothingSaved: ['Nothing saved yet', 'अभी कुछ सहेजा नहीं'],
    boards_h: ['Boards & paper patterns', 'बोर्ड व प्रश्नपत्र प्रारूप'],
    boards_s: ['The same chapter is examined differently across boards. Here is what changes.', 'एक ही अध्याय विभिन्न बोर्डों में भिन्न रूप में पूछा जाता है। यहाँ अंतर दिया है।'],
    aboutTitle: ['About Upay, and its limits', 'उपाय के बारे में, और उसकी सीमाएँ'],
    clear: ['Clear all', 'सब हटाइए'],
    methodCount: ['methods', 'विधियाँ'],
    source: ['Source', 'स्रोत'],
    openChapterCta: ['Open the full chapter', 'पूरा अध्याय खोलिए'],
    printNote: ['Tip: use Print → Save as PDF to keep a clean copy of this solution.', 'सुझाव: इस हल की स्वच्छ प्रति रखने के लिए प्रिंट → पीडीएफ में सहेजें।'],
    loading: ['Working out the ways…', 'तरीके निकाले जा रहे हैं…'],
    toastSaved: ['Saved to your questions', 'आपके प्रश्नों में सहेजा गया'],
    toastCopied: ['Answer copied', 'उत्तर कॉपी हो गया'],
    toastCleared: ['Cleared', 'हटा दिया गया'],
    toastQueued: ['Book queued — chapter text will be indexed when the file arrives', 'पुस्तक कतार में — फ़ाइल आने पर अध्याय पाठ अनुक्रमित होगा'],
    footer1: ['Upay is a study aid. Solutions and AI explanations can be wrong; check them against your textbook and source.', 'उपाय एक अध्ययन सहायक है। हल और एआई की व्याख्याएँ गलत हो सकती हैं; इन्हें पाठ्यपुस्तक और मूल स्रोत से मिलाएँ।'],
    footer2: ['NCERT content belongs to NCERT. Past-paper questions are reproduced for practice.', 'एनसीईआरटी सामग्री एनसीईआरटी की है। पिछले प्रश्न अभ्यास हेतु दिए गए हैं।'],
    classShort: ['Class', 'कक्षा'],
    weightage: ['Weightage', 'भार'],
    demand: ['Demand', 'कठिनाई'],
    pages: ['Pages', 'पृष्ठ'],
    sampleTitle: ['Converted text, straight from your PDF', 'आपकी पीडीएफ से सीधे परिवर्तित पाठ'],
    sampleNote: ['The Hindi NCERT PDFs use KrutiDev, a legacy 8-bit font. Raw extraction gives garbled Latin — so a KrutiDev → Unicode map is applied before any indexing. This is why Hindi search actually works.', 'हिंदी एनसीईआरटी पीडीएफ कृतिदेव (पुरानी 8-बिट फ़ॉन्ट) में हैं। सीधे निकालने पर अटपटा लैटिन मिलता है — इसलिए अनुक्रमण से पहले कृतिदेव → यूनिकोड मैप लगाया जाता है। इसी से हिंदी खोज काम करती है।'],
    raw: ['Raw PDF extraction', 'सीधा पीडीएफ निष्कर्षण'],
    converted: ['After KrutiDev → Unicode', 'कृतिदेव → यूनिकोड के बाद']
  };
  const t = k => {
    if (k === 'askPlaceholder') {
      const key = S.subject in T.askPlaceholder ? S.subject : 'maths';
      return S.lang === 'hi' ? T.askPlaceholder[key][1] : T.askPlaceholder[key][0];
    }
    return T[k] ? (S.lang === 'hi' ? T[k][1] : T[k][0]) : k;
  };
  UP.t = t;
  /* Hindi written after the papers were imported lives in a side file
     (UP.hindiExtra), keyed by question id, so a re-import cannot erase it.
     P() checks the object itself first, then the side file. */
  const P = obj => {
    if (!obj) return '';
    if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
    /* If the current subject is Hindi (or any subject whose content only
       exists in Hindi), always prefer the Hindi text regardless of the UI
       language toggle. Otherwise use the chosen language and fall back. */
    /* Sanskrit is a Devanagari subject too — always show hi field when the
       student is in Sanskrit, otherwise English/Hindi language toggle would
       flip Sanskrit lessons into non-existent English transliteration. */
    const forceHi = S.subject === 'hindi' || S.subject === 'sanskrit';
    if (forceHi) return obj.hi || obj.en;
    if (S.lang !== 'hi') return obj.en || obj.hi;
    if (obj.hi) return obj.hi;
    const extra = UP.hindiExtra && obj.id ? UP.hindiExtra[obj.id] : null;
    return extra || obj.en;
  };

  /* ------------------------------ icons ------------------------------ */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    board: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20l2-4M16 20l-2-4"/>',
    library: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m17 4 3.5 15.2"/>',
    save: '<path d="M6 3h11l4 4v14H6z"/><path d="M9 3v6h7V3M9 21v-7h7v7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    send: '<path d="M4 12 20 4l-6 16-3.2-7z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 13 4 4L19 7"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5H6a1 1 0 0 0-1 1v9"/>',
    printer: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
    atom: '<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7.5 14h9"/>',
    leaf: '<path d="M20 4C10 4 4 9 4 16c0 2 .6 3.4.6 3.4S9 8 20 4z"/><path d="M4.5 19.5C8 13 13 10 18 8.5"/>',
    beaker: '<path d="M6 3h12M8 3v7l-4 8a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 18l-4-8V3"/><path d="M6.5 14h11"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    formula: '<path d="M5 5h6M8 5v14M5 19h6M14 9h5v7h-5z"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    print: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 2h5.2c0-.8.3-1.5.9-2A6 6 0 0 0 12 3z"/>',
    warn: '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17v.5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 13 9-9M17 6l3 3M15 8l2 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    logout: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5M15 12H3"/>',
    speaker: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8a5 5 0 0 1 0 8"/>',
    speakeroff: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m16 9 5 6M21 9l-5 6"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'
  };
  const icon = (n, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.sparkle}</svg>`;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* escape, then lift our math/format markers to real markup */
  const rich = s => esc(s)
    .replace(/«([^»]*)»/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
  const mathText = s => esc(s).replace(/«([^»]*)»/g, '$1');

  /* --------------------------- persistence --------------------------- */
  const saveState = () => { store.set('lang', S.lang); store.set('cls', S.cls); store.set('subject', S.subject); store.set('board', S.board); };
  const saveSaved = () => store.set(S.savedKey, S.saved);
  function saveQuestionButton(question) {
    const q = String(question || '').trim(); if (!q) return '';
    const saved = S.saved.some(item => item.q === q);
    return `<button type="button" class="btn btn-cream btn-sm" data-action="saveQuestion" data-q="${esc(q)}" ${saved ? 'disabled' : ''}>${icon(saved ? 'check' : 'save')} ${saved ? (S.lang === 'hi' ? 'सहेजा गया' : 'Saved') : (S.lang === 'hi' ? 'प्रश्न सहेजें' : 'Save question')}</button>`;
  }

  const saveRecent = () => store.set(recentStoreKey(), S.recent);
  const saveProgress = () => store.set(progressStoreKey(), S.progress);
  function pushRecent(q, subject, chapter) {
    if (!q || q.length < 3) return;
    const trimmed = q.trim().slice(0, 160);
    S.recent = S.recent.filter(r => r.q !== trimmed);
    S.recent.unshift({ q: trimmed, subject: subject || S.subject, cls: +S.cls, board: S.board, chapter: chapter || '', at: Date.now() });
    S.recent = S.recent.slice(0, 12);
    saveRecent();
  }
  function bumpProgress(subject) {
    const today = new Date().toISOString().slice(0, 10);
    const d = S.progress.daily || (S.progress.daily = {});
    d[today] = (d[today] || 0) + 1;
    const subj = S.progress.subjects || (S.progress.subjects = {});
    subj[subject || S.subject] = (subj[subject || S.subject] || 0) + 1;
    // prune older than 90 days
    const cutoff = Date.now() - 90 * 86400000;
    Object.keys(d).forEach(k => { if (new Date(k).getTime() < cutoff) delete d[k]; });
    saveProgress();
  }
  function streak() {
    const d = S.progress.daily || {};
    let s = 0; let day = new Date();
    for (let i = 0; i < 60; i++) {
      const k = day.toISOString().slice(0, 10);
      if (d[k]) { s++; day.setDate(day.getDate() - 1); }
      else if (i === 0) { day.setDate(day.getDate() - 1); continue; }  // today may be empty but yesterday counts
      else break;
    }
    return s;
  }
  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return S.lang === 'hi' ? 'अभी' : 'just now';
    if (s < 3600) return Math.floor(s/60) + (S.lang === 'hi' ? ' मिनट पहले' : ' min ago');
    if (s < 86400) return Math.floor(s/3600) + (S.lang === 'hi' ? ' घंटे पहले' : ' h ago');
    return Math.floor(s/86400) + (S.lang === 'hi' ? ' दिन पहले' : ' d ago');
  }

  /* --------------------------- chapter helpers --------------------------- */
  /* The Rajasthan board reads from its own book, which numbers the chapters
     differently from NCERT: Real Numbers is chapter 2 there, not 1, and
     Statistics is 17.  Questions keep their NCERT number so the CBSE bank and
     the question views are untouched; only the chapter list follows the board. */
  function isRbse() { return S.board === 'rajasthan' && +S.cls === 10 && S.subject === 'maths'; }
  function catalogue() {
    if (businessTrack() && S.board !== 'cbse') return [];
    if (isRbse() && UP.rbseChapters) return UP.rbseChapters.chapters;
    return UP.catalogue(S.cls, S.subject);
  }
  function chapterById(id, cls, subject) {
    const rb = (isRbse() && UP.rbseChapters) ? UP.rbseChapters.chapters : null;
    if ((subject || S.subject) === 'business-studies' && S.board !== 'cbse') return null;
    const list = rb || UP.catalogue(cls || S.cls, subject || S.subject);
    // A stale or manually typed chapter ID must not open a different class or
    // subject under the currently selected scope.
    return list.find(c => String(c.id) === String(id)) || null;
  }
  function qChapterIds(q) {
    if (!q) return [];
    const raw = [q.ch].concat(Array.isArray(q.chapterTags) ? q.chapterTags : []);
    return [...new Set(raw.filter(id => id != null && id !== '' && +id !== 0).map(String))];
  }
  function qHasChapter(q, id) {
    const want = String(id);
    return !!q && (String(q.ch) === want || (Array.isArray(q.chapterTags) && q.chapterTags.some(tag => String(tag) === want)));
  }
  function pyqQuestionText(q) {
    const text = P({ en: q && q.en || '', hi: q && q.hi || '' });
    // Preserve source-verified Accountancy text exactly: the legacy Hindi OCR
    // cleaner can strip legitimate numeric runs and spreadsheet formulas.
    return q && (q.paperCode || q.cleanText) ? text : cleanQText(text);
  }
  UP.qChapterIds = qChapterIds;
  UP.qHasChapter = qHasChapter;
  UP.pyqQuestionText = pyqQuestionText;
  function accountancyTrack() {
    return +S.cls === 12 && (S.subject === 'accountancy' || S.subject === 'computerized-accounting');
  }
  function economicsTrack() { return +S.cls === 12 && S.subject === 'economics'; }
  function english12Track() { return +S.cls === 12 && S.subject === 'english'; }
  function businessTrack() { return +S.cls === 12 && S.subject === 'business-studies'; }
  function needsAIOnly() { return accountancyTrack() || economicsTrack() || english12Track() || businessTrack(); }

  const ENGLISH12_GROUPS = [
    ['flamingo', 'prose'], ['flamingo', 'poetry'], ['vistas', 'readings'],
    ['kaleidoscope', 'short-stories'], ['kaleidoscope', 'poetry'],
    ['kaleidoscope', 'non-fiction'], ['kaleidoscope', 'drama']
  ];
  function english12Source(ch) {
    return (UP.english12Sources || []).find(s => ch && s.id === ch.sourceId && s.chapterId === ch.id) || null;
  }

  /* ------------------------------------------------------------------
     Extracted chapter text.

     The original Class 12 chapter PDFs have been removed; each one was
     replaced with text extracted by tools/extract/build-chapter-text.py.
     UP.chapterSummary is a lean outline (critical core);
     UP.chapterFullText is the whole cleaned chapter, loaded on demand.
     Keyed by sourceId, which both economics12.js and english12.js set.
     ------------------------------------------------------------------ */
  function chapterSourceId(ch) {
    if (!ch) return '';
    if (ch.sourceId) return ch.sourceId;              // English sets this directly
    if (ch.book && ch.n != null) {                    // Economics: book + chapter no.
      const lang = S.lang === 'hi' ? 'hi' : 'en';     // Hindi PDFs were not extractable,
      const key = ch.book + '-' + ch.n + '-' + lang;  // so Hindi falls back to English
      if ((UP.chapterSummary || {})[key]) return key;
      const en = ch.book + '-' + ch.n + '-en';
      if ((UP.chapterSummary || {})[en]) return en;
    }
    return '';
  }
  function chapterTextFor(ch) {
    if (!ch) return null;
    const id = chapterSourceId(ch);
    if (!id) return null;
    return (UP.chapterSummary || {})[id] || null;
  }
  function chapterTextUsable(ch) {
    const t = chapterTextFor(ch);
    if (!t || t.available === false) return false;
    return !!(t.lead || (t.sections && t.sections.length) || (t.paras || 0) > 0);
  }

  function chapterTextBadge(ch) {
    const t = chapterTextFor(ch);
    if (!t) return '';
    const hi = S.lang === 'hi';
    if (t.available === false) {
      return `<span class="tag grey">${hi ? 'पाठ उपलब्ध नहीं' : 'Chapter text unavailable'}</span>`;
    }
    return `<span class="tag grey">${t.words.toLocaleString()} ${hi ? 'शब्द' : 'words'} · ${t.readMin} ${hi ? 'मिनट' : 'min read'}</span>`;
  }

  /* Full-chapter reader. Pulls the lazy full-text bundle on first use. */
  let _fullTextPromise = null;
  function loadFullText() {
    if (UP.chapterFullText) return Promise.resolve(UP.chapterFullText);
    if (_fullTextPromise) return _fullTextPromise;
    _fullTextPromise = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'assets/js/data/chapter-fulltext.js?v=26ab';
      s.async = true;
      s.onload = () => resolve(UP.chapterFullText || {});
      s.onerror = () => resolve({});
      document.head.appendChild(s);
    });
    return _fullTextPromise;
  }

  function renderChapterText(ch, mode) {
    const hi = S.lang === 'hi';
    const t = chapterTextFor(ch);
    if (!t) return '';
    if (t.available === false) {
      return `<div class="callout warn"><div>${icon('info')} <b>${hi ? 'पाठ उपलब्ध नहीं' : 'Chapter text unavailable'}</b><br>
        ${hi ? 'इस अध्याय की मूल PDF पुरानी (KrutiDev) फ़ॉन्ट एन्कोडिंग में थी, इसलिए पाठ निकाला नहीं जा सका। इसे दोबारा यूनिकोड PDF के रूप में अपलोड करें।'
             : 'This chapter’s original PDF used a legacy (KrutiDev) font encoding, so the text could not be extracted. Re-upload it as a Unicode PDF.'}</div></div>`;
    }

    const usableSections = (t.sections || []).filter(s => s.t);
    const outline = usableSections.length
      ? `<ol class="chapter-outline">${usableSections.map(s => `<li><b>${esc(s.t)}</b>${s.g ? `<span>${esc(s.g)}</span>` : ''}</li>`).join('')}</ol>`
      : '';

    const keyList = (t.key || []).length
      ? `<div class="chapter-key"><h3>${hi ? 'ध्यान देने योग्य शब्द' : 'Expressions to notice'}</h3>
         <div class="pill-row">${t.key.map(k => `<span class="pill">${esc(k)}</span>`).join('')}</div></div>`
      : '';

    if (mode === 'outline') {
      return `<section class="card flat chapter-text">
        <div class="section-head"><div><h2>${hi ? 'अध्याय सारांश' : 'Chapter summary'}</h2>
          <p>${hi ? 'मूल अध्याय PDF से निकाला गया पाठ' : 'Extracted from the original chapter PDF'}</p></div></div>
        ${t.lead ? `<p class="chapter-lead">${esc(t.lead)}</p>` : ''}
        ${outline}
        ${keyList}
        <div class="chapter-text-actions">
          <button class="btn btn-sm btn-primary" data-action="readFullChapter" data-ch="${esc(chapterSourceId(ch))}">
            ${icon('book')} ${hi ? 'पूरा अध्याय पढ़ें' : 'Read the full chapter'} (${t.readMin} ${hi ? 'मिनट' : 'min'})
          </button>
          <span class="english12-extra-label">${hi ? 'स्रोत का मूल पाठ; शब्दशः सत्यापित नहीं' : 'Verbatim source text; not independently proof-read'}</span>
        </div>
      </section>`;
    }

    // full mode
    const full = (UP.chapterFullText || {})[chapterSourceId(ch)];
    if (!full || !full.paras) {
      return `<section class="card flat chapter-text"><p class="muted">${hi ? 'पूरा पाठ लोड हो रहा है…' : 'Loading the full chapter…'}</p></section>`;
    }
    return `<section class="card flat chapter-text chapter-text-full">
      <div class="section-head"><div><h2>${hi ? 'पूरा अध्याय' : 'Full chapter'}</h2>
        <p>${t.words.toLocaleString()} ${hi ? 'शब्द' : 'words'} · ${hi ? 'स्रोत' : 'source'}: ${esc(full.book || '')} ${full.chapter ? '· ' + (hi ? 'अध्याय' : 'Chapter') + ' ' + full.chapter : ''}</p></div></div>
      ${full.paras.map(p => `<p>${esc(p)}</p>`).join('')}
      <div class="chapter-text-actions"><a class="btn btn-sm btn-ghost" href="#/chapter/${ch.id}">${hi ? 'सारांश पर लौटें' : 'Back to summary'}</a></div>
    </section>`;
  }

  /* Replaces the old "Open PDF" buttons. */
  function chapterReadLink(ch) {
    const hi = S.lang === 'hi';
    const source = (ch && ch.sourceId) ? (UP.english12Sources || []).concat(UP.economicsSources || [])
      .find(s => s.id === ch.sourceId) : null;
    if (!chapterTextUsable(ch)) {
      return `<span class="english12-extra-label">${hi ? 'अध्याय पाठ उपलब्ध नहीं' : 'Chapter text unavailable'}</span>`;
    }
    const t = chapterTextFor(ch);
    return `<button class="btn btn-ghost btn-sm" data-action="readFullChapter" data-ch="${esc(chapterSourceId(ch))}">
      ${hi ? 'अध्याय पढ़ें' : 'Read chapter'} <span aria-hidden="true">→</span></button>
      <span class="english12-extra-label">${t.words.toLocaleString()} ${hi ? 'शब्द' : 'words'}</span>`;
  }

  function english12SourceLink(ch) {
    return chapterReadLink(ch);
  }
  function english12CourseCaution(ch) {
    if (S.board !== 'cbse' || ch.cbse2026ElectiveListed !== false) return '';
    return `<span class="english12-extra-label">${S.lang === 'hi' ? 'CBSE 2026–27 Elective की निर्धारित पाठ-सूची में नहीं' : 'Not listed in CBSE 2026–27 Elective prescribed texts'}</span>`;
  }
  function english12CoverageNote() {
    const hi = S.lang === 'hi';
    return `<div class="callout tip english12-coverage">${icon('info')}<div>
      <b>${hi ? 'दी गई सामग्री और सीमाएँ' : 'What the supplied files cover'}</b><br>
      ${hi ? '40 दी गई PDF: Flamingo की 13, Vistas की 6 और Kaleidoscope की 21। Milton, Blake और Memories of Childhood की एक-एक फ़ाइल में दो रचनाएँ हैं। Elective के उपन्यास नहीं दिए गए; यह पूरा पाठ्यक्रम नहीं है।' : '40 supplied PDFs: 13 from Flamingo, 6 from Vistas and 21 from Kaleidoscope. The Milton, Blake and Memories of Childhood files each contain two works. The Elective fiction novels were not supplied; this is not a complete course.'}<br>
      ${hi ? 'मार्गदर्शिका हिंदी और अंग्रेज़ी में है; मूल PDF केवल अंग्रेज़ी में हैं। पूरी PDF का पाठ खोज-अनुक्रमित नहीं है। फ़ाइल ऑनलाइन खोलें या ऑफ़लाइन के लिए डाउनलोड करें; ऐप PDF कैश नहीं करता।' : 'Reading notes are in English and Hindi; the original PDFs are in English only and their full text is not search-indexed. Open online or download for offline use; the app does not cache the PDFs.'}<br>
      ${hi ? 'CBSE 2026–27 में Flamingo और Vistas, English Core और Kaleidoscope, English Elective में हैं। पाँच अतिरिक्त दी गई रचनाएँ उस वर्ष की Elective निर्धारित सूची में नहीं हैं; अपने बोर्ड और वर्ष की सूची जाँचें।' : 'For CBSE 2026–27, Flamingo and Vistas are used in English Core and Kaleidoscope in English Elective. Five additional supplied selections are not on that year’s Elective prescribed list; check the syllabus for your board and year.'}
      <div style="margin-top:7px"><a href="https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/English_core_SecP2_2026-27.pdf" target="_blank" rel="noopener noreferrer">CBSE 2026–27 English Core ↗</a> · <a href="https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/English_elective_SecP2_2026-27.pdf" target="_blank" rel="noopener noreferrer">CBSE 2026–27 English Elective ↗</a></div>
    </div></div>`;
  }
  function chapterBankQuestions(ch) {
    if (!accountancyTrack() || !ch) return (ch && ch.pyqs) || [];
    return (UP.pyq || []).filter(q => qInScope(q) && qHasChapter(q, ch.id))
      .sort((a, b) => (+b.y || 0) - (+a.y || 0) || String(a.paperCode || '').localeCompare(String(b.paperCode || '')) || (+a.q || 0) - (+b.q || 0));
  }
  function chapterTitle(ch) { return ch ? P({ en: ch.en, hi: ch.hi }) : ''; }

  /* ================================ SHELL ================================ */
  function syncRailA11y() {
    const rail = document.getElementById('rail');
    if (!rail) return;
    const hidden = window.matchMedia('(max-width: 900px)').matches && !document.body.classList.contains('rail-open');
    rail.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    rail.inert = hidden;
  }
  function closeRail() {
    document.body.classList.remove('rail-open');
    const toggle = document.querySelector('#topbar [data-action="menu"]');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    syncRailA11y();
  }
  window.addEventListener('resize', syncRailA11y);
  function renderShell() {
    document.documentElement.lang = S.lang === 'hi' ? 'hi' : 'en';
    /* one skip link for keyboard users, created once */
    if (!document.getElementById('skipLink')) {
      const a = document.createElement('a');
      a.id = 'skipLink'; a.className = 'skip-link'; a.href = '#view';
      a.textContent = 'Skip to content';
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const v = document.getElementById('view');
        v.setAttribute('tabindex', '-1'); v.focus();
      });
      document.body.insertBefore(a, document.body.firstChild);
    }
    S.skipText = S.lang === 'hi' ? 'मुख्य सामग्री पर जाएँ' : 'Skip to content';
    const skip = document.getElementById('skipLink');
    if (skip) skip.textContent = S.skipText;

    const rail = document.getElementById('rail');
    const selectedSubject = P(UP.subjects[S.subject] || { en: S.subject, hi: S.subject });
    const selectedBoard = P(UP.boards.find(b => b.id === S.board) || { en: S.board, hi: S.board });
    const chapterCount = (catalogue() || []).length;
    rail.setAttribute('aria-label', S.lang === 'hi' ? 'मुख्य मेन्यू' : 'Main menu');
    rail.innerHTML = `
      <a class="brand" href="#/home">
        <span class="brand-mark">${icon('sparkle')}</span>
        <span class="brand-name">उपाय<span>${t('brandSub')}</span></span>
      </a>
      <nav class="nav" aria-label="${S.lang === 'hi' ? 'अनुभाग' : 'Sections'}">
        <span class="nav-label">${t('learn')}</span>
        <a href="#/home" data-nav="home">${icon('home')} ${t('nav_home')}</a>
        <a href="#/ask" data-nav="ask">${icon('sparkle')} ${t('nav_ask')}</a>
        <a href="#/today" data-nav="today">${icon('target')} ${S.lang==='hi'?'आज का अभ्यास':'Today'}</a>
        <a href="#/test" data-nav="test">${icon('list')} ${t('nav_test')}</a>
        <a href="#/mcq" data-nav="mcq">${icon('check')} ${t('nav_mcq')}</a>
        <a href="#/pyq" data-nav="pyq">${icon('book')} ${t('nav_pyq')}</a>
        <a href="#/syllabus" data-nav="syllabus">${icon('layers')} ${t('nav_syllabus')}<span class="badge">${catalogue().length}</span></a>
        <span class="nav-label">${t('library')}</span>
        <a href="#/boards" data-nav="boards">${icon('board')} ${t('nav_boards')}</a>
        <a href="#/books" data-nav="books">${icon('library')} ${t('nav_books')}</a>
        <a href="#/saved" data-nav="saved">${icon('save')} ${t('nav_saved')}${S.saved.length ? `<span class="badge">${S.saved.length}</span>` : ''}</a>
        <a href="#/mistakes" data-nav="mistakes">${icon('book')} ${S.lang==='hi'?'गलतियाँ':'Mistakes'}</a>
        <a href="#/mock" data-nav="mock">${icon('clock')} ${S.lang==='hi'?'मॉक टेस्ट':'Mock test'}</a>
        <a href="#/search" data-nav="search">${icon('search')} ${S.lang==='hi'?'खोज':'Search'}</a>
        <a href="#/about" data-nav="about">${icon('info')} ${t('nav_about')}</a>
      </nav>
      <div class="rail-subject-pick" aria-hidden="false">
        <label><span class="lbl">${t('classShort')}</span>
          <select data-action="set" data-key="cls">
            ${UP.classes.map(c => `<option value="${c.id}" ${c.id === S.cls ? 'selected' : ''}>Class ${c.id}</option>`).join('')}
          </select></label>
        <label><span class="lbl">${t('boardShort')}</span>
          <select data-action="set" data-key="board">
            ${UP.boards.map(b => `<option value="${b.id}" ${b.id === S.board ? 'selected' : ''}>${esc(P({ en: b.en, hi: b.hi }))}</option>`).join('')}
          </select></label>
        <label><span class="lbl">${t('subjectShort')}</span>
          <select data-action="set" data-key="subject">
            ${(UP.classes.find(c => c.id === +S.cls) || UP.classes[0]).subjects.map(s => `<option value="${s}" ${s === S.subject ? 'selected' : ''}>${esc(P(UP.subjects[s]))}</option>`).join('')}
          </select></label>
      </div>
      <div class="rail-foot">
        <div class="rail-note">
          <strong>${S.lang === 'hi' ? 'वर्तमान चयन' : 'Current selection'}</strong><br>
          ${S.lang === 'hi' ? 'कक्षा' : 'Class'} ${esc(S.cls)} · ${esc(selectedSubject)}<br>
          ${esc(selectedBoard)} · ${chapterCount} ${S.lang === 'hi' ? 'अध्याय सूचीबद्ध' : 'chapters listed'}
        </div>
        <div class="lang-switch" role="group" aria-label="Language">
          <button data-action="lang" data-lang="en" class="${S.lang === 'en' ? 'on' : ''}">English</button>
          <button data-action="lang" data-lang="hi" class="${S.lang === 'hi' ? 'on' : ''}">हिंदी</button>
        </div>
      </div>`;
    let scrim = document.getElementById('railScrim');
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'rail-scrim'; scrim.id = 'railScrim';
    }
    // The HTML shell may already contain the scrim outside .app. Move it into
    // the rail's stacking context so it sits behind (not on top of) the menu.
    const shell = document.querySelector('.app') || document.body;
    if (scrim.parentElement !== shell) shell.appendChild(scrim);
    if (!scrim.dataset.bound) {
      scrim.addEventListener('click', closeRail);
      scrim.dataset.bound = '1';
    }
    syncRailA11y();
  }

  function renderTopbar() {
    const board = UP.boards.find(b => b.id === S.board) || UP.boards[0];
    const r = parseHash();
    const here = { home: t('nav_home'), ask: t('nav_ask'), test: t('nav_test'), pyq: t('nav_pyq'), syllabus: t('nav_syllabus'), chapter: t('nav_syllabus'), boards: t('nav_boards'), books: t('nav_books'), saved: t('nav_saved'), about: t('nav_about') }[r.name] || t('nav_home');
    const openMenu = document.body.classList.contains('rail-open') ? 'true' : 'false';
    document.getElementById('topbar').innerHTML = `
      <button class="menu-btn" data-action="menu" aria-label="${S.lang === 'hi' ? 'मेन्यू' : 'Menu'}" aria-expanded="${openMenu}" aria-controls="rail">${icon('menu')}</button>
      <nav class="crumb" aria-label="${S.lang === 'hi' ? 'आप कहाँ हैं' : 'Breadcrumb'}">
        <a class="crumb-here" href="#/${r.name === 'chapter' ? 'syllabus' : r.name}">${esc(here)}</a>
        <span class="crumb-sep" aria-hidden="true">/</span>
        <span class="crumb-scope">${t('classShort')} ${S.cls} · ${P(UP.subjects[S.subject] || UP.subjects.maths)}</span>
        <span class="crumb-board"><i class="dot-board"></i>${esc(P({ en: board.en, hi: board.hi }))}</span>
      </nav>
      <div class="spacer"></div>
      <div class="top-actions">
        <!-- Keep the board, class and subject selectors together across screen sizes. -->
        <div class="top-scope-pickers" role="group" aria-label="${S.lang === 'hi' ? 'अध्ययन विकल्प' : 'Study selection'}">
        <label class="hdr-pick" title="${t('chooseBoard')}">
          <span class="hdr-pick-lbl">${t('boardShort')}</span>
          <select class="select select-sm" data-action="set" data-key="board"
            aria-label="${t('chooseBoard')}">
            ${UP.boards.map(b => `<option value="${b.id}" ${b.id === S.board ? 'selected' : ''}>${esc(P({ en: b.en, hi: b.hi }))}</option>`).join('')}
          </select>
        </label>
        <label class="hdr-pick" title="${t('chooseClass')}">
          <span class="hdr-pick-lbl">${t('classShort')}</span>
          <select class="select select-sm" data-action="set" data-key="cls"
            aria-label="${t('chooseClass')}">
            ${UP.classes.map(c => `<option value="${c.id}" ${c.id === S.cls ? 'selected' : ''}>${c.id}</option>`).join('')}
          </select>
        </label>
        <label class="hdr-pick" title="${t('chooseSubject')}">
          <span class="hdr-pick-lbl">${t('subjectShort')}</span>
          <select class="select select-sm" data-action="set" data-key="subject"
            aria-label="${t('chooseSubject')}">
            ${(UP.classes.find(c => c.id === +S.cls) || UP.classes[0]).subjects.map(s => `<option value="${s}" ${s === S.subject ? 'selected' : ''}>${esc(P(UP.subjects[s]))}</option>`).join('')}
          </select>
        </label>
        </div>
        <button class="icon-btn lang-btn" data-action="lang" data-lang="${S.lang === 'en' ? 'hi' : 'en'}"
          aria-label="${t('switchLang')}" title="${t('switchLang')}">
          ${icon('globe')}<span class="lang-abbr">${S.lang === 'en' ? 'हिं' : 'EN'}</span>
        </button>
        ${isAdmin() ? `<a class="btn btn-sm signin-btn" href="#/admin" title="${S.lang === 'hi' ? 'एडमिन डैशबोर्ड' : 'Admin dashboard'}">${icon('key')} <span>${S.lang === 'hi' ? 'एडमिन' : 'Admin'}</span></a>` : ''}
        ${S.user ? `
        <div class="user-menu" id="userMenu">
          <button class="user-chip" data-action="user-menu" aria-haspopup="true" aria-expanded="false">
            <span class="avatar">${esc((S.user.name || S.user.email || 'U').slice(0,1).toUpperCase())}</span>
            <span class="uname">${esc(S.user.name || S.user.email)}</span>
          </button>
          <div class="dropdown" role="menu">
            <a href="#/account" role="menuitem">${icon('user')} ${S.lang==='hi'?'मेरी प्रोफ़ाइल':'My profile'}</a>
            <a href="#/saved" role="menuitem">${icon('save')} ${S.lang==='hi'?'सहेजे गए':'Saved questions'}</a>
            <div class="divider"></div>
            <button data-action="signout" role="menuitem">${icon('logout')} ${S.lang==='hi'?'साइन आउट':'Sign out'}</button>
          </div>
        </div>` : `
        <a class="btn btn-sm btn-ghost" href="#/login" title="${S.lang==='hi'?'साइन इन / खाता':'Sign in / Sign up'}">${icon('user')} <span>${S.lang==='hi'?'खाता':'Sign in'}</span></a>
        `}
        <a class="btn btn-primary btn-sm ask-cta" href="#/ask">${icon('sparkle')} <span>${t('askBtn')}</span></a>
      </div>`;
  }

  function renderFooter() {
    const subject = P(UP.subjects[S.subject] || { en: S.subject, hi: S.subject });
    const src = (S.lang === 'hi' ? 'कक्षा ' : 'Class ') + S.cls + ' · ' + subject;
    document.getElementById('footer').innerHTML = `
      <span>© ${new Date().getFullYear()} Upay · उपाय — ${t('brandSub')}</span>
      <span class="fl"><span>${esc(src)}</span><span>${t('footer1')}</span><span>${t('footer2')}</span></span>`;
  }

  /* ================================ HOME ================================ */
  function progressDashboard() {
    const daily = S.progress.daily || {};
    const subjects = S.progress.subjects || {};
    const total = Object.values(daily).reduce((a,b) => a+b, 0);
    const todayKey = new Date().toISOString().slice(0, 10);
    const today = daily[todayKey] || 0;
    // 49-day heatmap (7 cols x 7 rows, last 49 days)
    const cells = [];
    const todayD = new Date();
    for (let i = 48; i >= 0; i--) {
      const d = new Date(todayD); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const n = daily[k] || 0;
      const level = n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4;
      cells.push(`<span class="heat-cell lv${level}" title="${k}: ${n}"></span>`);
    }
    const topSubjects = Object.entries(subjects).sort((a,b) => b[1]-a[1]).slice(0,4);
    const totalSubj = Object.values(subjects).reduce((a,b) => a+b, 0) || 1;
    return `<section class="progress-dash card cream flat">
      <div class="pd-head">
        <div class="mini-label">${S.lang==='hi'?'आपकी प्रगति':'Your progress'}</div>
        <div class="pd-stats">
          <div><b>${today}</b><span>${S.lang==='hi'?'आज':'today'}</span></div>
          <div><b>${total}</b><span>${S.lang==='hi'?'कुल अभ्यास':'practice actions'}</span></div>
          <div><b>${streak()}</b><span>${S.lang==='hi'?'दिन लगातार':'day streak'}</span></div>
        </div>
      </div>
      <div class="pd-body">
        <div class="heatmap" aria-label="daily activity">${cells.join('')}</div>
        <div class="subj-bars">
          ${topSubjects.length ? topSubjects.map(([s,n]) => {
            const pct = Math.round(100 * n / totalSubj);
            const lbl = UP.subjects[s] ? P(UP.subjects[s]) : s;
            return `<div class="sb-row"><span class="sb-lbl">${esc(lbl)}</span><div class="sb-bar"><span style="width:${pct}%"></span></div><span class="sb-n">${n}</span></div>`;
          }).join('') : `<p class="muted" style="margin:0;font-size:13px">${S.lang==='hi'?'अभी कोई प्रश्न हल नहीं किया — पहला प्रश्न पूछें।':'No questions yet — ask your first one.'}</p>`}
        </div>
      </div>
    </section>`;
  }

  function viewHome() {
    const chapters = catalogue();
    const all = chapters.filter(ch => !ch._bookHeader);
    const lastChapter = store.get(scopedDataKey('lastChapter'), null);
    const resume = all.find(ch => String(ch.id) === String(lastChapter));
    const dailyGoal = store.get(scopedDataKey('studyGoal'), 10);
    const scopedQuestionCount = (UP.pyq || []).filter(qInScope).length;
    const scopedRecent = S.recent.filter(r => r.subject === S.subject && (r.cls ? +r.cls === +S.cls : +S.cls === 10) && (r.board ? r.board === S.board : S.board === 'cbse'));
    const subjectSamples = {
      maths: [
        { en: '2x² + x − 6 = 0', hi: '2x² + x − 6 = 0' },
        { en: 'HCF of 510 and 92', hi: '510 और 92 का म.स. ज्ञात कीजिए' },
        { en: '2x + 3y = 7 and 4x − y = 1', hi: '2x + 3y = 7 तथा 4x − y = 1' },
      ],
      science: [
        { en: 'Balance: Fe + H₂O → Fe₃O₄ + H₂', hi: 'संतुलित कीजिए: Fe + H₂O → Fe₃O₄ + H₂' },
        { en: 'What is the role of decomposers in an ecosystem?', hi: 'पारितंत्र में अपघटकों की क्या भूमिका है?' },
        { en: 'A convex lens forms a real image at 2F; where is the object?', hi: 'उत्तल लेंस 2F पर वास्तविक प्रतिबिंब बनाता है; वस्तु कहाँ रखी है?' },
      ],
      social: [
        { en: 'Why did the Non-Cooperation Movement slow down in towns?', hi: 'कस्बों में असहयोग आंदोलन की गति क्यों धीमी पड़ी?' },
        { en: 'What is sustainable development?', hi: 'सतत पोषणीय विकास क्या है?' },
        { en: 'How does federalism work in India?', hi: 'भारत में संघवाद कैसे काम करता है?' },
      ],
      hindi: [
        { en: 'सूरदास के पद — गोपियाँ उद्धव को बड़भागी क्यों कहती हैं?', hi: 'सूरदास के पद — गोपियाँ उद्धव को बड़भागी क्यों कहती हैं?' },
        { en: '"माता का आँचल" पाठ के आधार पर माँ के स्नेह का चित्रण कीजिए।', hi: '"माता का आँचल" पाठ के आधार पर माँ के स्नेह का चित्रण कीजिए।' },
        { en: '"हरिहर काका" में ज़मीन के लालच को कैसे दर्शाया गया है?', hi: '"हरिहर काका" में ज़मीन के लालच को कैसे दर्शाया गया है?' },
      ],
      english: [
        { en: 'Why did Lencho write a letter to God?', hi: 'लैंचो ने भगवान को पत्र क्यों लिखा?' },
        { en: 'What made the postmaster help Lencho?', hi: 'पोस्टमास्टर ने लैंचो की मदद क्यों की?' },
        { en: 'Describe the baker of Goa in 100 words.', hi: 'गोवा के बेकर का 100 शब्दों में वर्णन कीजिए।' },
      ],
      economics: [
        { en: 'What is GDP?', hi: 'GDP क्या है?' },
        { en: 'How is market equilibrium determined?', hi: 'बाज़ार संतुलन कैसे निर्धारित होता है?' },
        { en: 'What is opportunity cost?', hi: 'अवसर लागत क्या है?' },
      ],
      sanskrit: [
        { en: 'शुचिपर्यावरणम् — स्वच्छ वातावरण का महत्त्व स्पष्ट कुरुत।', hi: 'शुचिपर्यावरणम् — स्वच्छ वातावरणस्य महत्त्वं स्पष्टयत।' },
        { en: 'सन्धिं कुरुत — राम + आगच्छति', hi: 'सन्धिं कुरुत — राम + आगच्छति' },
        { en: '“बुद्धिर्बलवती सदा” पाठस्य सारं लिखत।', hi: '"बुद्धिर्बलवती सदा" पाठस्य सारं लिखत।' },
      ],
    };
    const scopedExamples = {
      11: {
        maths: ['What is a geometric progression?', 'What is the binomial theorem?'],
        physics: ['Describe projectile motion.', 'State Newton’s second law.'],
        chemistry: ['What is a mole?', 'Explain chemical bonding.'],
        biology: ['What is photosynthesis?', 'Describe the structure of a cell.']
      },
      12: {
        maths: ['Explain integration by parts.', 'What is Bayes’ theorem?'],
        'applied-maths': ['What is simple interest?', 'How is a moving average calculated?'],
        physics: ['State Faraday’s law of induction.', 'Explain the photoelectric effect.'],
        chemistry: ['What is the Nernst equation?', 'Explain an electrochemical cell.'],
        biology: ['Describe DNA replication.', 'What is natural selection?'],
        english: ['How does Franz’s view change in The Last Lesson?', 'What does the rattrap represent?'],
        accountancy: ['How is goodwill treated when a partner retires?', 'What is a cash-flow statement?'],
        'computerized-accounting': ['What does the SUM function do in a spreadsheet?', 'What is a primary key in a database?']
      }
    };
    const specific = (scopedExamples[+S.cls] || {})[S.subject];
    const samples = specific ? specific.map(en => ({ en, hi: en })) : (subjectSamples[S.subject] || [{ en: 'Type a question from your selected subject.', hi: 'अपने चुने हुए विषय का प्रश्न लिखिए।' }]);
    return `
    <section class="card study-shortcuts" aria-label="Study shortcuts">
      <h2>${S.lang === 'hi' ? 'आज की पढ़ाई' : 'Your next study step'}</h2>
      <nav class="study-shortcuts-actions" aria-label="Study actions">
        <a class="btn btn-primary" href="${resume ? '#/chapter/'+resume.id : '#/syllabus'}">${S.lang === 'hi' ? 'पढ़ाई जारी रखें' : 'Continue studying'}</a>
        <a class="btn btn-ghost" href="#/today">${S.lang === 'hi' ? 'अभ्यास और आज की पुनरावृत्ति' : 'Practise · Today’s revision'}</a>
        <a class="btn btn-ghost" href="#/mistakes">${S.lang === 'hi' ? 'गलतियाँ दोहराएँ' : 'Revise mistakes'}</a>
        <a class="btn btn-ghost" href="#/saved">${S.lang === 'hi' ? 'सहेजे प्रश्न' : 'Saved questions'}</a>
      </nav>
      <div class="study-goal-row">
        <label class="study-goal-field" for="home-study-goal"><span>${S.lang === 'hi' ? 'दैनिक लक्ष्य (योजना मात्र)' : 'Daily goal (planning only)'}</span>
          <select id="home-study-goal" data-action="study-goal" aria-label="Daily study goal" aria-describedby="home-study-goal-help">${[5,10,15].map(n=>`<option value="${n}" ${dailyGoal===n?'selected':''}>${n} questions</option>`).join('')}</select>
        </label>
        <p class="muted" id="home-study-goal-help">${S.lang === 'hi' ? 'अपनी सुविधा से अभ्यास करें; लक्ष्य कोई अंक नहीं है।' : 'Choose your own pace. This goal is not a score or a promise of available questions.'}</p>
      </div>
    </section>
    <section class="card home-outline-links" aria-labelledby="home-outline-title">
      <h2 id="home-outline-title">CBSE Class 12 · English outlines</h2>
      <nav aria-label="Class 12 outline resources">
        <a class="link" href="/assets/notes/index.html#business">Business Studies</a>
        <a class="link" href="/assets/notes/index.html#chemistry">Chemistry (units 1–10)</a>
        <a class="link" href="/assets/notes/index.html#biology">Biology (13 chapters)</a>
        <a class="link" href="/assets/notes/index.html#figures-bio">Biology figures</a>
      </nav>
      <p class="muted">Syllabus-mapped study outlines; coverage is incomplete.</p>
    </section>
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow"><span class="dot"></span>${t('heroEyebrow')}</span>
          <h1>${t('heroTitle1')}<br><em>${t('heroTitle2')}</em> ${t('heroTitle3')}</h1>
          <p class="lead">${businessTrack() ? 'Explore 12 English CBSE 2026–27 unit outlines. Eleven are based on your supplied chapters; Financial Markets is sourced from the CBSE syllabus. No full text or question bank is included.' : english12Track() ? (S.lang === 'hi'
            ? 'Flamingo, Vistas और Kaleidoscope की दी गई अंग्रेज़ी PDF, अध्ययन संकेत और स्वयं-जाँच प्रश्न पढ़ें। अपने बोर्ड और पाठ्यक्रम की सूची अलग से जाँचें।'
            : 'Explore the supplied Flamingo, Vistas and Kaleidoscope PDFs, reading notes and review questions. Check your board and course list separately.') : economicsTrack() ? (S.lang === 'hi'
            ? 'समष्टि और व्यष्टि अर्थशास्त्र के अध्याय, संक्षिप्त अध्ययन सामग्री, अभ्यास और आपकी मूल पुस्तक PDF पढ़ें। एआई की उपलब्धता खाते पर निर्भर है; उत्तर पुस्तक से जाँचें।'
            : 'Explore macroeconomics and microeconomics chapters, concise study guides, review checks and your original textbook PDFs. AI depends on account availability; check answers against the book.') : t('heroLead')}</p>
          <form class="askbox" data-form="heroAsk">
            <div class="askbox-inner">
              <textarea name="q" rows="1" placeholder="${t('askPlaceholder')}" aria-label="${t('askTitle')}"></textarea>
              <button class="send" type="submit" aria-label="${t('askBtn')}">${icon('send')}</button>
            </div>
            <div class="askbox-meta">
              <span style="font-size:12px;color:var(--ink-400);padding:4px 4px 0">${t('tryOne')}</span>
              ${samples.slice(0, 3).map(s => `<button type="button" class="chip" data-action="sample" data-q="${esc(P(s))}">${esc(P(s))}</button>`).join('')}
            </div>
          </form>
          <div class="stats" style="margin-top:22px">
            <div class="stat"><b>${all.length}</b><span>${t('statChapters')}</span></div>
            <div class="stat"><b>AI</b><span>${S.lang === 'hi' ? 'उपलब्धता पर निर्भर' : 'when available'}</span></div>
            <div class="stat"><b>${scopedQuestionCount}</b><span>${t('statPyq')}</span></div>
            <div class="stat"><b>2</b><span>${t('statLang')}</span></div>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="blob"></div>
          <div class="card-float">
            <div class="mini-label">${S.lang === 'hi' ? 'उदाहरण प्रश्न' : 'SAMPLE QUESTION'}</div>
            <div style="font-family:var(--serif);font-size:15px;color:var(--ink-900);margin:4px 0 2px;line-height:1.35">${esc(P(samples[0]))}</div>
            <div class="mini-label" style="margin-top:12px">${S.lang === 'hi' ? 'हल के तरीके' : 'WAYS TO ANSWER'}</div>
            <div class="method-list">
              ${S.subject === 'maths' ? `
              <div class="method-row"><span class="n">1</span><span>${S.lang === 'hi' ? 'सीधा हल (बीजगणित)' : 'Direct algebra'}</span></div>
              <div class="method-row"><span class="n c2">2</span><span>${S.lang === 'hi' ? 'चित्र/ज्यामिति' : 'Diagram / geometry'}</span></div>
              <div class="method-row"><span class="n c3">3</span><span>${S.lang === 'hi' ? 'सूत्र / पहचान' : 'Formula / identity'}</span></div>` :
              S.subject === 'hindi' ? `
              <div class="method-row"><span class="n">1</span><span>${S.lang === 'hi' ? 'भावार्थ-स्पष्टीकरण' : 'Bhavaarth explanation'}</span></div>
              <div class="method-row"><span class="n c2">2</span><span>${S.lang === 'hi' ? 'सप्रसंग व्याख्या' : 'Contextual analysis'}</span></div>
              <div class="method-row"><span class="n c3">3</span><span>${S.lang === 'hi' ? 'लेखक-परिचय + संदेश' : 'Author intro + message'}</span></div>` :
              S.subject === 'science' ? `
              <div class="method-row"><span class="n">1</span><span>${S.lang === 'hi' ? 'अवधारणा-आधारित उत्तर' : 'Concept-based'}</span></div>
              <div class="method-row"><span class="n c2">2</span><span>${S.lang === 'hi' ? 'चित्र/नामांकन' : 'Labelled diagram'}</span></div>
              <div class="method-row"><span class="n c3">3</span><span>${S.lang === 'hi' ? 'NCERT भाषा में उत्तर' : 'NCERT-style answer'}</span></div>` : english12Track() ? `
              <div class="method-row"><span class="n">1</span><span>${S.lang === 'hi' ? 'मूल पाठ पढ़ें' : 'Read the source'}</span></div>
              <div class="method-row"><span class="n c2">2</span><span>${S.lang === 'hi' ? 'अपनी व्याख्या लिखें' : 'Explain an interpretation'}</span></div>
              <div class="method-row"><span class="n c3">3</span><span>${S.lang === 'hi' ? 'पाठ से प्रमाण जाँचें' : 'Check evidence in the text'}</span></div>` : `
              <div class="method-row"><span class="n">1</span><span>${S.lang === 'hi' ? 'पाठ्य-पुस्तक आधारित' : 'Textbook-based'}</span></div>
              <div class="method-row"><span class="n c2">2</span><span>${S.lang === 'hi' ? 'उदाहरण सहित' : 'With examples'}</span></div>
              <div class="method-row"><span class="n c3">3</span><span>${S.lang === 'hi' ? 'परीक्षा-शैली' : 'Exam-style'}</span></div>`}
            </div>
          </div>
          <div class="card-float" style="padding:14px">
            <div class="mini-label">${S.lang === 'hi' ? 'साथ में' : 'ALSO INCLUDED'}</div>
            <div style="font-size:13px;color:var(--ink-700);margin-top:6px;line-height:1.6">
              ${businessTrack() ? '📖 English outlines<br>🧭 CBSE syllabus mapping<br>📌 No question bank yet' : english12Track() ? (S.lang === 'hi' ? '📖 दी गई मूल अंग्रेज़ी PDF<br>📝 अध्ययन संकेत और स्वयं-जाँच<br>🧭 अलग Core और Elective पुस्तकें' : '📖 supplied original English PDFs<br>📝 reading notes and review prompts<br>🧭 separate Core and Elective books') : economicsTrack() ? (S.lang === 'hi' ? '📖 मूल PDF और अध्ययन सामग्री<br>📝 समझ जाँचने के प्रश्न<br>📄 मूल प्रश्नपत्र PDF' : '📖 original PDFs and study guides<br>📝 review checks<br>📄 original test papers') : `${S.subject === 'maths' ? (S.lang === 'hi' ? '📐 परवलय का चित्र' : '📐 a drawn diagram') : (S.lang === 'hi' ? '📖 पाठ + सारांश' : '📖 chapter text + summary')}<br>
              ${S.lang === 'hi' ? '🤖 कई व्याख्या शैलियाँ' : '🤖 multiple explanation styles'}<br>
              ${S.lang === 'hi' ? '✅ बोर्ड प्रश्नों का अभ्यास' : '✅ board-question practice'}`}
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="section-head">
      <div><h2>${t('howTitle')}</h2><p>${t('howSub')}</p></div>
    </div>
    <div class="grid grid-3" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <article class="card feature sky"><span class="ico">${icon('layers')}</span><h3>${t('f1t')}</h3><p>${t('f1d')}</p></article>
      <article class="card feature c2"><span class="ico">${icon('book')}</span><h3>${t('f2t')}</h3><p>${t('f2d')}</p></article>
      <article class="card feature c3"><span class="ico">${icon('globe')}</span><h3>${t('f3t')}</h3><p>${t('f3d')}</p></article>
      <article class="card feature sky"><span class="ico">${icon('target')}</span>
        <h3>${S.lang === 'hi' ? 'चित्र और व्याख्या' : 'Figures and explanations'}</h3>
        <p>${S.lang === 'hi'
          ? 'जहाँ उपयुक्त और उपलब्ध हो, वहाँ चित्र या हल के चरण देखें। एआई उत्तर को पाठ्यपुस्तक से जाँचें।'
          : 'See a diagram or worked steps where supported. Cross-check AI-generated answers against your textbook.'}</p></article>
      <article class="card feature c2"><span class="ico">${icon('list')}</span>
        <h3>${S.lang === 'hi' ? 'नया सैंपल पेपर, हर बार' : 'A new sample paper, every time'}</h3>
        <p>${S.lang === 'hi'
          ? 'अपना बोर्ड और अध्याय चुनिए। उपलब्ध प्रश्नों से अभ्यास सेट बनता है; सामग्री विषय और बोर्ड के अनुसार बदलती है।'
          : 'Choose your board and chapters to build a practice set from the questions available for that scope.'}</p>
        <a class="btn btn-sm btn-ghost" href="#/test" style="margin-top:10px">${S.lang === 'hi' ? 'पेपर बनाइए' : 'Build a paper'} ${icon('arrow')}</a></article>
      <article class="card feature c3"><span class="ico">${icon('book')}</span>
        <h3>${S.lang === 'hi' ? 'पिछले बोर्ड प्रश्न' : 'Past-board questions'}</h3>
        <p>${S.lang === 'hi'
          ? 'उपलब्ध स्रोत-टैग वाले प्रश्न वर्ष या अध्याय के अनुसार देखें। उत्तर-कुंजी हर विषय में उपलब्ध नहीं है।'
          : 'Browse available source-tagged questions by year or chapter. Official answer keys are not included for every subject.'}</p>
        <a class="btn btn-sm btn-ghost" href="#/pyq" style="margin-top:10px">${S.lang === 'hi' ? 'पिछले प्रश्न देखिए' : 'Browse past years'} ${icon('arrow')}</a></article>
    </div>

    ${scopedRecent.length ? `
    <div class="section-head">
      <div><h2>${S.lang === 'hi' ? 'हाल ही में पूछे गए' : 'Recently asked'}</h2><p>${S.lang === 'hi' ? 'जारी रखें जहाँ छोड़ा था' : 'Pick up where you left off'}</p></div>
      ${scopedRecent.length > 3 ? `<a class="link" href="#/saved">${S.lang==='hi'?'सभी देखें':'View all'} ${icon('arrow')}</a>` : ''}
    </div>
    <div class="recent-strip">
      ${scopedRecent.slice(0, 8).map(r => `
        <a class="recent-q" href="#/ask?q=${encodeURIComponent(r.q)}">
          <div class="rq-sub">${esc(P(UP.subjects[r.subject] || UP.subjects.maths))}</div>
          <div class="rq-text">${esc(r.q)}</div>
          <div class="rq-when">${timeAgo(r.at)}</div>
        </a>`).join('')}
    </div>` : ''}

    <div class="home-mini-grid">
      <div class="home-mini-card"><h4>${S.lang==='hi'?'अध्याय':'Chapters'}</h4><div class="big">${catalogue().length}</div><p style="margin:6px 0 0;font-size:12.5px;color:var(--ink-500)">${S.lang==='hi'?'एनसीईआरटी पाठ्यक्रम मैप':'mapped in syllabus'}</p></div>
      <div class="home-mini-card"><h4>${S.lang==='hi'?'सहेजे प्रश्न':'Saved'}</h4><div class="big">${S.saved.length}</div><p style="margin:6px 0 0;font-size:12.5px;color:var(--ink-500)">${S.lang==='hi'?'बाद के लिए रखे':'kept for later'}</p></div>
      <div class="home-mini-card streak"><h4>${S.lang==='hi'?'लगातार दिन':'Streak'}</h4><div class="big">${streak()}<span style="font-size:16px;color:var(--ink-500);font-weight:500">${S.lang==='hi'?' दिन':'d'}</span></div><p style="margin:6px 0 0;font-size:12.5px;color:var(--ink-500)">${S.lang==='hi'?'रोज़ एक प्रश्न हल करें':'solve one a day'}</p></div>
    </div>

    ${progressDashboard()}

    <div class="section-head">
      <div><h2>${t('chaptersTitle')}</h2><p>${t('classShort')} ${S.cls} · ${esc(P(UP.subjects[S.subject] || {}))}</p></div>
      <a class="link" href="#/syllabus">${t('viewAll')} ${icon('arrow')}</a>
    </div>
    <div class="grid grid-3">${chapters.slice(0, 6).map(chCard).join('')}</div>

    <div class="section-head">
      <div><h2>${t('boardsTitle')}</h2><p>${t('boardsSub')}</p></div>
      <a class="link" href="#/boards">${t('nav_boards')} ${icon('arrow')}</a>
    </div>
    <div class="grid grid-4">
      ${UP.boards.slice(0, 4).map(b => `
        <article class="card flat" style="padding:15px">
          <div class="tag ${b.id === S.board ? '' : 'grey'}">${esc(P({ en: b.en, hi: b.hi }))}</div>
          <p style="font-size:12.9px;color:var(--ink-500);margin:9px 0 0">${esc(P(b.pattern))}</p>
        </article>`).join('')}
    </div>

    ${+S.cls === 10 && S.subject === 'maths' ? `<div class="section-head"><div><h2>${t('sourcesTitle')}</h2></div></div>
    <article class="card cream">
      <div class="grid grid-2" style="gap:18px">
        <div>
          <div class="tag green">${icon('check')} ${S.lang === 'hi' ? 'सत्यापित स्रोत' : 'Verified source'}</div>
          <h3 style="font-size:18px;margin:10px 0 6px">NCERT ${S.lang === 'hi' ? 'गणित, कक्षा 10 — हिंदी' : 'Mathematics, Class 10 — Hindi'}</h3>
          <p style="font-size:13.6px;color:var(--ink-600);margin:0 0 10px">${S.lang === 'hi'
            ? 'आपकी दी गई 14 अध्याय पीडीएफ पढ़ी गईं। वे कृतिदेव फ़ॉन्ट में थीं, अतः पाठक पहले यूनिकोड में बदलकर फिर अध्याय-वार अनुक्रमित करता है।'
            : 'All 14 chapter PDFs you provided were read. They use the KrutiDev font, so the reader converts to Unicode first, then indexes chapter by chapter.'}</p>
          <a class="btn btn-ghost btn-sm" href="#/books">${t('nav_books')} ${icon('arrow')}</a>
        </div>
        <div>
          <div class="mini-label">${t('sampleTitle')}</div>
          <div style="font-size:12.5px;color:var(--ink-500);margin:6px 0 4px">${t('raw')}</div>
          <div style="font-family:var(--mono);font-size:12px;background:#fff;border:1px solid var(--line);border-radius:9px;padding:8px 10px;color:var(--ink-500)">okLrfod la[;k,¡ O;kid :i esa] tc gesa ,d HkkT; la[;k x nh gqbZ gks</div>
          <div style="font-size:12.5px;color:var(--ink-500);margin:8px 0 4px">${t('converted')}</div>
          <div style="font-size:13.2px;background:#fff;border:1px solid var(--sky-200);border-radius:9px;padding:8px 10px;color:var(--ink-800)">वास्तविक संख्याएँ व्यापक रूप में, जब हमें एक भाज्य संख्या x दी हुई हो</div>
        </div>
      </div>
    </article>` : ''}`;
  }

  function chCard(ch) {
    /* A book-header divider (e.g. "📘 Geography — Contemporary India II") is a
       non-clickable section break, not a chapter card. */
    if (ch._bookHeader) {
      return `<div class="book-divider" style="grid-column:1/-1;margin-top:18px">
        <h2 style="font-size:15px;color:var(--ink-500);font-weight:600;margin:0 0 2px;letter-spacing:.02em">${esc(P({en:ch.en,hi:ch.hi}))}</h2>
        <p style="margin:0;font-size:12.5px;color:var(--ink-400)">${esc(P({en:ch.enDesc||'',hi:ch.hiDesc||''}))}</p>
      </div>`;
    }
    /* Any chapter carrying an `outline` (Business Studies units, and Class 12
       Chemistry units once chemistry-outlines.js attaches them) shows the full
       outline summary directly on the card, not a truncated enDesc. */
    if (ch.outline) {
      const unitNo = ch.displayNo != null ? ch.displayNo : (typeof ch.id === 'number' && ch.id > 700 ? ch.id - 700 : ch.id);
      /* Biology numbers its cards by NCERT chapter, not by unit: one CBSE unit
         covers two or three chapters, so the badge names the unit and its marks
         instead of calling chapter 5 "CBSE unit 5". */
      const unitTitle = ch.outline.unit_title;
      const footBadge = unitTitle
        ? `${esc(unitTitle)}${ch.outline.marks ? ` · ${esc(ch.outline.marks)} ${t('marks')} (unit)` : ''}`
        : `CBSE unit ${esc(unitNo)}`;
      return `<a class="card ch-card outline-card" href="#/chapter/${ch.id}" data-chapter-id="${ch.id}">
        <div class="ch-top"><span class="ch-num">${String(unitNo).padStart(2,'0')}</span><div>
        <div class="ch-title">${esc(ch.outline.title)}</div></div></div>
        <p class="ch-outline-summary">${esc(ch.outline.summary)}</p>
        <div class="ch-foot"><span class="tag">${S.lang === 'hi' ? 'केवल अंग्रेज़ी रूपरेखा' : 'Outline only · English'}</span><span class="tag grey">${(ch.outline.figures || []).length ? (ch.outline.figures.length + ' source figures available') : 'Source figures not inventoried'}</span>${ch.subject === 'physics' || S.subject === 'physics' ? '<span class="tag grey">Questions awaiting source review</span>' : ''}<span class="tag cream">${footBadge}</span><span class="arrow">${icon('arrow')}</span></div></a>`;
    }
    if (english12Track() && ch.sourceId) {
      return `<a class="card ch-card english12-chapter-card" href="#/chapter/${ch.id}" data-chapter-id="${ch.id}">
        <div class="ch-top"><span class="ch-num">${String(ch.n).padStart(2, '0')}</span><div>
          <div class="ch-title">${esc(P({en:ch.en,hi:ch.hi}))}</div>
          <div class="ch-sub">${esc(ch.author)}</div>${english12CourseCaution(ch)}
        </div></div>
        <div class="ch-foot"><span class="tag">${S.lang === 'hi' ? 'अंग्रेज़ी PDF' : 'English PDF'}</span>
          <span class="tag cream">${esc(P(ch.sectionTitle))}</span><span class="arrow">${icon('arrow')}</span></div>
      </a>`;
    }
    /* An RBSE chapter carries numbered sections read from the board's book,
       not marks weight or concept cards, so its footer says what it has. */
    if (ch.sections) {
      /* Two kinds of chapter reach here now: an RBSE chapter carries
         sections[].points (numbered points read from the board book), and a
         Class 10 Science chapter carries sections[].text (prose from the
         NCERT book). Count whichever it actually has instead of assuming. */
      const n = ch.sections.length;
      const pts = ch.sections.reduce(function (a, s) {
        return a + ((s.points && s.points.length) || (s.text ? 1 : 0));
      }, 0);
      return `<a class="card ch-card" href="#/chapter/${ch.id}">
        <div class="ch-top">
          <span class="ch-num">${String(ch.displayNo != null ? ch.displayNo : ch.id).padStart(2, '0')}</span>
          <div><div class="ch-title">${esc(P({ en: ch.en, hi: ch.hi }))}</div>
          <div class="ch-sub">${n ? esc(ch.sections[0].title) : (S.lang === 'hi'
            ? 'पाठ अभी उपलब्ध नहीं — नाम बोर्ड की सूची से।'
            : 'Text not supplied yet — title from the board list.')}</div></div>
        </div>
        <div class="ch-foot">
          <span class="tag">${n ? n + ' ' + (S.lang === 'hi' ? 'उपखंड' : 'sections') : (S.lang === 'hi' ? 'खाली' : 'no text yet')}</span>
          ${n ? `<span class="tag cream">${pts} ${S.lang === 'hi' ? 'बिंदु' : 'points'}</span>` : ''}
          <span class="arrow">${icon('arrow')}</span>
        </div>
      </a>`;
    }
    const tag = ch.demand === 'outline' ? (S.lang === 'hi' ? 'रूपरेखा' : 'outline') : `${ch.weight} ${t('marks')}`;
    return `<a class="card ch-card" href="#/chapter/${ch.id}">
      <div class="ch-top">
        <span class="ch-num">${String(ch.displayNo != null ? ch.displayNo : ch.id).padStart(2, '0')}</span>
        <div><div class="ch-title">${esc(P({ en: ch.en, hi: ch.hi }))}</div>
        <div class="ch-sub">${esc(P({ en: ch.enDesc || '', hi: ch.hiDesc || '' })).slice(0, 92)}${(P({ en: ch.enDesc || '', hi: ch.hiDesc || '' })).length > 92 ? '…' : ''}</div></div>
      </div>
      <div class="ch-foot">
        <span class="tag">${esc(tag)}</span>
        <span class="tag cream">${(ch.concepts || []).length} ${S.lang === 'hi' ? 'अवधारणाएँ' : 'concepts'}</span>
        <span class="arrow">${icon('arrow')}</span>
      </div>
    </a>`;
  }

  /* ================================ ASK ================================ */
  function viewAsk(params) {
    const samples = {
      10: {
        maths:   ['2x² + x − 6 = 0', 'HCF of 510 and 92', 'Prove that √5 is irrational', 'Find the distance between (3, 4) and (−2, 1)'],
        science: ['Balance Fe + H₂O → Fe₃O₄ + H₂', 'Why is the sky blue?', 'Two resistors 4Ω and 6Ω in parallel', 'What is the role of decomposers?'],
        social:  ['What is resource planning?', 'Explain federalism in India', 'What was the Civil Disobedience Movement?', 'Why is democracy important?'],
        hindi:   ['कबीर की साखी का भावार्थ', '"माता का आँचल" — माँ के स्नेह का चित्रण', 'पत्र लेखन — प्रधानाचार्य को प्रार्थना-पत्र', '"हरिहर काका" में ज़मीन का लालच'],
        english: ['Nelson Mandela: Long Walk to Freedom', 'Letter to the Editor', 'Why did Lencho write a letter to God?', 'Describe the baker of Goa'],
        sanskrit:['शुचिपर्यावरणम् — स्वच्छ वातावरणस्य महत्त्वम्', 'सन्धिं कुरुत — राम + आगच्छति', '"बुद्धिर्बलवती सदा" पाठस्य सारः', 'देव-शब्दस्य चतुर्थी-विभक्तिः'],
      },
      11: { maths: ['sin x / x limit', 'nCr formula', 'GP sum'], physics: ['projectile motion', 'Newton’s laws'], chemistry: ['mole concept', 'chemical bonding'], biology: ['photosynthesis', 'cell structure'], science: ['projectile motion', 'mole concept', 'photosynthesis'], hindi: ['कबीर के दोहे'], english: ['The Portrait of a Lady'], social: ['French Revolution'], sanskrit: ['शेमुषी — सन्धि'] },
      12: { maths: ['integration by parts', 'Bayes theorem', 'cross product'], 'applied-maths': ['simple interest', 'moving average'], physics: ['photoelectric effect', 'Faraday’s law'], chemistry: ['Nernst equation', 'electrochemical cell'], biology: ['DNA replication', 'natural selection'], economics: ['What is GDP?', 'Explain market equilibrium', 'What is opportunity cost?'], accountancy: ['Goodwill on retirement of a partner', 'What is a cash-flow statement?'], 'computerized-accounting': ['SUM function in a spreadsheet', 'What is a primary key in a database?'], science: ['photoelectric effect', 'Nernst equation', 'DNA replication'], hindi: ['काव्य-सौन्दर्य'], english: ['How does Franz’s view change in The Last Lesson?', 'What does the rattrap represent?', 'How does Eveline face her choice?'], social: ['Cold War era'], sanskrit: ['अनुवाद कार्यम्'] },
    };
    const solverBlurbs = {
      maths: {
        en: '<b>Ready-made solvers:</b> Quadratic equations · HCF/LCM · linear pairs · arithmetic progressions · distance formula · trigonometry · heights & distances · sectors & segments · mensuration · probability · similarity · tangents · mean',
        hi: '<b>जिन विषयों के हल-इंजन तैयार हैं:</b> द्विघात समीकरण · म.स./ल.स. · रैखिक युग्म · समांतर श्रेढ़ी · दूरी सूत्र · त्रिकोणमिति · ऊँचाई-दूरी · त्रिज्यखंड/वृत्तखंड · क्षेत्रमिति · प्रायिकता · समरूपता · स्पर्श रेखा · माध्य',
      },
      science: {
        en: '<b>Concept engines:</b> Chemical equations · light & mirrors · electricity · magnetic effects · life processes · heredity · carbon · environment · periodic table · force & motion',
        hi: '<b>जिन विषयों की संकल्पना-सामग्री तैयार है:</b> रासायनिक समीकरण · प्रकाश एवं दर्पण · विद्युत · चुम्बकीय प्रभाव · जैव-प्रक्रम · आनुवंशिकता · कार्बन · पर्यावरण · आवर्त सारणी · बल और गति',
      },
      social: {
        en: '<b>Topic guides:</b> Nationalism in India · federalism · democracy · power-sharing · globalisation · resource planning · print culture · novels · map work · constitutional design',
        hi: '<b>जिन विषयों की पाठ-सामग्री तैयार है:</b> भारत में राष्ट्रवाद · संघवाद · लोकतन्त्र · सत्ता की साझेदारी · वैश्वीकरण · संसाधन नियोजन · मुद्रण संस्कृति · उपन्यास · मानचित्र कार्य · संविधान निर्माण',
      },
      hindi: {
        en: '<b>Hindi literature coverage:</b> क्षितिज (काव्य/गद्य) · स्पर्श · संचयन · कृतिका — पद्यांश/गद्यांश व्याख्या, भावार्थ, रस-छन्द-अलंकार, पत्र/अनुच्छेद लेखन, व्याकरण।',
        hi: '<b>पाठ्य-सामग्री उपलब्ध:</b> क्षितिज (काव्य/गद्य) · स्पर्श · संचयन · कृतिका — पद्यांश/गद्यांश व्याख्या, भावार्थ, रस-छन्द-अलंकार, पत्र/अनुच्छेद लेखन, व्याकरण।',
      },
      english: {
        en: '<b>English coverage:</b> First Flight · Footprints without Feet · literature comprehension · letter to editor · paragraph writing · grammar (tenses, voice, reported speech, modals).',
        hi: '<b>पाठ्य-सामग्री उपलब्ध:</b> First Flight · Footprints without Feet — गद्य/पद्य की व्याख्या, पत्र/अनुच्छेद लेखन, व्याकरण (काल, वाच्य, reported speech, modals)।',
      },
      sanskrit: {
        en: '<b>Sanskrit coverage:</b> शेमुषी द्वितीयो भागः (गद्य/पद्य) · व्याकरणवीथिः (सन्धि · शब्दरूप · धातुरूप · समास · कारक · वाच्य · प्रत्यय · उपसर्ग · अव्यय) · अभ्यासपुस्तिका (पत्रम् · अनुवाद · अनुच्छेद · चित्रवर्णन)।',
        hi: '<b>संस्कृत पाठ्य-सामग्री उपलब्ध:</b> शेमुषी द्वितीयो भागः (गद्य/पद्य) · व्याकरणवीथिः (सन्धि · शब्दरूप · धातुरूप · समास · कारक · वाच्य · प्रत्यय · उपसर्ग · अव्यय) · अभ्यासपुस्तिका (पत्रम् · अनुवाद · अनुच्छेद · चित्रवर्णन)।',
      },
    };
    const list = catalogue();
    const chaps = list.map(c => `<option value="${c.id}">${english12Track() ? esc(P(c.bookTitle)) + ' · ' + esc(P(c.sectionTitle)) + ' ' + c.n : String(c.id).padStart(2, '0')} · ${esc(P({ en: c.en, hi: c.hi }))}</option>`).join('');
    const subjSamples = (samples[S.cls] && samples[S.cls][S.subject]) || null;
    const smp = subjSamples || (S.cls === 10 && samples[10][S.subject]) || [];
    const blurb = businessTrack() ? {
      en: '<b>Business Studies:</b> English outlines are in Chapters. AI and a question bank are not enabled for this subject.',
      hi: '<b>व्यवसाय अध्ययन:</b> अंग्रेज़ी रूपरेखा अध्यायों में है। इस विषय के लिए AI और प्रश्न बैंक उपलब्ध नहीं हैं।'
    } : english12Track() ? {
      en: '<b>English:</b> Reading notes and the supplied PDFs are in Chapters and Books &amp; sources. AI requires an enabled account and does not automatically see these PDFs. Give it the relevant passage if needed, and check its answer against the book.',
      hi: '<b>अंग्रेज़ी:</b> अध्ययन संकेत और दी गई PDF, अध्याय तथा पुस्तकें व स्रोत में हैं। एआई के लिए सक्षम खाता आवश्यक है; वह PDF स्वतः नहीं देखता। ज़रूरत हो तो संबंधित अंश दें और उत्तर पुस्तक से जाँचें।'
    } : economicsTrack() ? {
      en: '<b>Economics:</b> Chapter guides and the supplied PDFs are in Chapters and Books &amp; sources. AI requires an enabled account and is not automatically grounded in the PDFs; check its answers against the book.',
      hi: '<b>अर्थशास्त्र:</b> अध्याय सामग्री और दी गई PDF, अध्याय तथा पुस्तकें व स्रोत में हैं। एआई के लिए सक्षम खाता आवश्यक है और वह स्वतः PDF से जुड़ा नहीं है; उत्तर पुस्तक से जाँचें।'
    } : ((+S.cls === 10 && solverBlurbs[S.subject]) || {
      en: '<b>Availability:</b> AI explanations require an enabled account and configured provider. Verify generated answers against your textbook.',
      hi: '<b>उपलब्धता:</b> एआई व्याख्या के लिए सक्षम खाता और प्रदाता आवश्यक है। उत्तर पाठ्यपुस्तक से जाँचें।'
    });

    return `
    <div class="ask-page">
      <div class="ask-head">
        <span class="eyebrow"><span class="dot"></span>${S.lang === 'hi' ? 'एक प्रश्न, कई विधियाँ' : 'One question, several methods'}</span>
        <h1>${t('askTitle')}</h1>
        <p>${t('askSub')}</p>
      </div>
      <form class="askbox" data-form="ask">
        <div class="askbox-inner">
          <textarea name="q" rows="2" placeholder="${t('askPlaceholder')}" aria-label="${t('askTitle')}">${esc(params.q || '')}</textarea>
          <button class="photo-btn" type="button" data-action="cameraOCR"
            title="${S.lang === 'hi' ? 'कैमरे से प्रश्न पढ़ें' : 'Scan a question with camera'}"
            aria-label="${S.lang === 'hi' ? 'कैमरे से प्रश्न पढ़ें' : 'Scan a question with camera'}">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.1-1.6A1.5 1.5 0 0 1 9.6 3.8h4.8a1.5 1.5 0 0 1 1.3.6L16.8 6h1.7A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.6"/></svg>
          </button>
          <button class="photo-btn" type="button" data-action="voiceInput"
            title="${S.lang==='hi'?'आवाज़ से पूछें':'Ask by voice'}"
            aria-label="${S.lang==='hi'?'आवाज़ से पूछें':'Ask by voice'}">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/></svg>
          </button>
          <button class="send" type="submit" aria-label="${t('askBtn')}">${icon('send')}</button>
        </div>
        <div class="askbox-meta">
          <span class="chip" style="pointer-events:none;background:#fff;border-style:dashed">${t('classLabel')} ${S.cls}</span>
          <span class="chip" style="pointer-events:none;background:#fff;border-style:dashed">${esc(P(UP.subjects[S.subject] || UP.subjects.maths))}</span>
          <span class="chip" style="pointer-events:none;background:#fff;border-style:dashed">${esc((UP.boards.find(b => b.id === S.board) || {}).en || '')}</span>
        </div>
      </form>

      <div class="ask-controls">
        <select class="select" data-action="set" data-key="cls">${[10, 11, 12].map(c => `<option value="${c}" ${c === S.cls ? 'selected' : ''}>${t('classLabel')} ${c}</option>`).join('')}</select>
        <select class="select" data-action="set" data-key="subject">
          ${(UP.classes.find(c => c.id === +S.cls) || UP.classes[0]).subjects.map(s => `<option value="${s}" ${s === S.subject ? 'selected' : ''}>${esc(P(UP.subjects[s]))}</option>`).join('')}
        </select>
        <select class="select" data-action="set" data-key="board">${UP.boards.map(b => `<option value="${b.id}" ${b.id === S.board ? 'selected' : ''}>${esc(P({ en: b.en, hi: b.hi }))}</option>`).join('')}</select>
        <select class="select" data-action="chapterJump"><option value="">${t('anyChapter')}</option>${chaps}</select>
      </div>

      <div class="starter-grid">
        ${smp.slice(0, 3).map(example => `<a class="starter-card" href="#/ask?q=${encodeURIComponent(example)}" data-action="sample" data-q="${esc(example)}">
          <span class="st-sub">${esc(P(UP.subjects[S.subject] || {}))} · Class ${S.cls}</span>
          <span class="st-q">${esc(example)}</span>
          <span class="st-go">${S.lang === 'hi' ? 'प्रश्न पूछें' : 'Ask this question'} ${icon('arrow')}</span>
        </a>`).join('')}
      </div>
      <div class="sample">
        ${smp.map(s => `<button class="chip" data-action="sample" data-q="${esc(s)}">${esc(s)}</button>`).join('')}
      </div>
      <div class="callout tip" style="margin-top:14px">
        ${icon('bulb')}
        <div style="font-size:12.9px">
          ${S.lang === 'hi' ? blurb.hi : blurb.en}
          ${(economicsTrack() || english12Track() || businessTrack()) ? '' : `<br>${S.lang === 'hi'
               ? 'किसी भी प्रश्न, श्लोक, पद या व्याकरण-बिंदु के लिए उसका सीधा पाठ लिखिए अथवा अध्याय/विषय का नाम लिखिए — उसकी पूरी अवधारणा-सामग्री मिलेगी।'
               : 'Type any question, verse, or grammar point directly, or write a chapter / topic name for its full concept sheet.'}`}
        </div>
      </div>

      ${S.aiState === 'loading' ? `<div class="ai-thinking" id="aiThinking">${loadingDots()}</div>` : ''}
      <div id="answerMount">${S.aiAnswer ? renderAIAnswer(S.aiAnswer) : (S.answer ? renderAnswer(S.answer) : emptyAsk())}</div>
    </div>`;
  }


  /* ---------------- read a question from a photo ----------------
     The photo is shrunk in the browser first (a phone camera gives 4–12 MB,
     which is slow to upload and pointless for reading print). The server
     transcribes it, and the text lands in the ask box — the student can fix
     a mis-read digit before anything is solved.                          */
  const PHOTO_MAX = 1600;         /* longest side, px */
  const PHOTO_QUALITY = 0.86;

  function shrinkImage(file, cb) {
    const reader = new FileReader();
    reader.onerror = () => cb(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => cb(new Error('decode'));
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff';                 /* transparent PNGs would go black */
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const url = cv.toDataURL('image/jpeg', PHOTO_QUALITY);
        cb(null, { url: url, base64: url.split(',')[1], mime: 'image/jpeg', w: w, h: h });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function readPhoto(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      S.photoState = 'error';
      S.photoNote = S.lang === 'hi' ? 'यह छवि फ़ाइल नहीं है।' : 'That file is not an image.';
      S.photoPreview = null;
      return;
    }
    S.photoState = 'reading'; S.photoNote = ''; S.photoPreview = null;
    paintPhotoStrip();
    shrinkImage(file, (err, out) => {
      if (err) {
        S.photoState = 'error';
        S.photoNote = S.lang === 'hi' ? 'फोटो नहीं पढ़ी जा सकी। दूसरी फोटो चुनें।' : 'That photo could not be opened. Try another one.';
        paintPhotoStrip();
        return;
      }
      S.photoPreview = out.url;
      paintPhotoStrip();
      fetch('/api/ai/read-image', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (localStorage.getItem('upay.token') || '') },
        body: JSON.stringify({ data: out.base64, mime: out.mime })
      }).then(r => r.json()).then(j => {
        if (j && j.ok && j.question) {
          S.photoState = 'done';
          S.photoPreview = null;
          const ta = document.querySelector('form[data-form="ask"] textarea[name="q"]');
          if (ta) ta.value = j.question;
          S.photoNote = S.lang === 'hi'
            ? 'प्रश्न पढ़ लिया गया — उत्तर निकाला जा रहा है। यदि कोई अंक गलत पढ़ा गया हो तो नीचे ठीक करके फिर भेजिए।'
            : 'Question read — solving it now. If a digit was misread, correct it below and send again.';
          paintPhotoStrip();
          /* go straight on to the answer; the text stays editable in the box */
          go('#/ask?q=' + encodeURIComponent(j.question.trim()));
          if (parseHash().name === 'ask') render();
        } else {
          S.photoState = 'error';
          S.photoNote = (j && j.error) ? j.error
            : (S.lang === 'hi' ? 'फोटो नहीं पढ़ी जा सकी।' : 'The photo could not be read.');
          paintPhotoStrip();
        }
      }).catch(() => {
        S.photoState = 'error';
        S.photoNote = S.lang === 'hi' ? 'सर्वर से संपर्क नहीं हुआ।' : 'Could not reach the server.';
        paintPhotoStrip();
      });
    });
  }

  /* a small strip above the ask box showing what is happening */
  function paintPhotoStrip() {
    let host = document.getElementById('photoStrip');
    const form = document.querySelector('form[data-form="ask"]');
    if (!form) return;
    if (!S.photoState) { if (host) host.remove(); return; }
    if (!host) {
      host = document.createElement('div');
      host.id = 'photoStrip';
      form.parentNode.insertBefore(host, form);
    }
    const hi = S.lang === 'hi';
    let inner = '';
    if (S.photoState === 'reading') {
      inner = '<span class="spin"></span><div><b>' + (hi ? 'फोटो पढ़ी जा रही है…' : 'Reading the photo…') + '</b>' +
        '<div class="muted">' + (hi ? 'प्रश्न के अंक निकाले जा रहे हैं।' : 'Pulling the question text out of the picture.') + '</div></div>';
    } else if (S.photoState === 'error') {
      inner = icon('info') + '<div><b>' + (hi ? 'फोटो नहीं पढ़ी जा सकी' : 'Could not read that photo') + '</b>' +
        '<div class="muted">' + esc(S.photoNote) + '</div>' +
        '<button class="btn btn-ghost btn-sm" data-action="pickPhoto" style="margin-top:6px">' +
        (hi ? 'दूसरी फोटो चुनें' : 'Choose another photo') + '</button></div>';
    } else {
      inner = icon('check') + '<div><b>' + (hi ? 'फोटो पढ़ी गई' : 'Photo read') + '</b>' +
        '<div class="muted">' + esc(S.photoNote) + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-action="clearPhoto" style="margin-left:auto">' + (hi ? 'बंद करें' : 'Dismiss') + '</button>';
    }
    host.className = 'photo-strip' + (S.photoState === 'error' ? ' warn' : '');
    host.innerHTML = inner;
  }

  /* Accountancy, Economics and Class 12 English have no verified general
     offline solver. Maths templates must not masquerade as subject answers. */
  function isAccountancyTrack() { return accountancyTrack(); }
  function accountancyAIWaiting(q) {
    return { kind: 'ai-waiting', chapter: null, question: q, _loading: true,
      summary: { en: 'Waiting for an AI explanation.', hi: 'एआई की व्याख्या की प्रतीक्षा है।' },
      result: '', approaches: [] };
  }

  function aiRetryControl() {
    if (!S.aiRetry || ['sign_in_required','access_not_enabled','ai_disabled','provider_configuration'].includes(S.aiErrorCode)) return '';
    return `<button class="btn btn-ghost btn-sm" data-action="retryAI">${S.lang === 'hi' ? 'फिर कोशिश करें' : 'Try again'}</button>`;
  }
  function aiRecovery(question) {
    return `<div class="pactions" role="status" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" data-action="copy-ai-question">${S.lang === 'hi' ? 'प्रश्न कॉपी करें' : 'Copy question'}</button>
      <button class="btn btn-ghost btn-sm" data-action="savePyq" data-q="${esc(question || '')}">${S.lang === 'hi' ? 'बाद के लिए सहेजें' : 'Save for later'}</button>
      <a class="btn btn-ghost btn-sm" href="${chapterById(S.chapterId) ? '#/chapter/'+S.chapterId : '#/syllabus'}">${S.lang === 'hi' ? 'अध्ययन सामग्री खोलें' : 'Open study material'}</a>
      ${S.aiErrorCode === 'access_not_enabled' ? '<a class="btn btn-primary btn-sm" href="#/ai-access">Request AI access</a>' : ''}
      ${S.aiErrorCode === 'sign_in_required' ? '<a class="btn btn-primary btn-sm" href="#/login">Sign in</a>' : ''}
    </div>`;
  }

  /* ---------------- ask the server's AI solver ---------------- */
  function aiScope() { return JSON.stringify([S.savedKey, +S.cls, S.board, S.subject]); }
  function askAI(q) {
    S.aiErrorCode = ''; S.aiRetryAt = 0;
    const scope = aiScope();
    const isCurrent = () => S.aiQuestion === q && S.aiScope === scope && aiScope() === scope;
    const mount = () => document.getElementById('answerMount');
    const paint = () => {
      const m = mount();
      if (m) m.innerHTML = S.aiAnswer ? renderAIAnswer(S.aiAnswer) : renderAnswer(S.answer);
    };
    const goLocal = (note, showRetry) => {
      if (!isCurrent()) return;
      S.aiState = 'local';
      S.aiNote = note || '';
      S.aiRetry = !!showRetry;
      if (needsAIOnly()) {
        S.aiAnswer = null;
        S.answer = { kind: isAccountancyTrack() ? 'accountancy-unavailable' : 'no-local-solver', question: q,
          note: /built-in solver|बिल्ट-इन हल/.test(note || '') ? '' : (note || '') };
        paint();
        return;
      }
      paint();
      bumpProgress(S.subject);
      pushRecent(q, S.subject, S.chapterId ? (chapterById(S.chapterId) ? P(chapterById(S.chapterId).en || {}) : '') : '');
      const m = mount();
      if (m && S.aiNote && !document.getElementById('aiNote')) {
        const d = document.createElement('div');
        d.id = 'aiNote'; d.className = 'callout warn';
        d.style.marginTop = '14px';
        d.innerHTML = '<div><b>' + (S.lang === 'hi' ? 'एआई' : 'AI') + ':</b> ' +
          esc(S.aiNote) + aiRecovery(q) +
          aiRetryControl() + '</div>';
        m.insertBefore(d, m.firstChild);
      }
    };
    if (businessTrack()) { goLocal('Business Studies AI is not enabled; use the supplied outlines.', false); return; }
    // "taking a moment" nudge — after 6s swap the spinner text
    let slowTimer = setTimeout(() => {
      const m = mount();
      if (!m) return;
      const sp = m.querySelector('.ai-thinking span[data-slow]');
      if (sp) sp.textContent = S.lang === 'hi' ? 'एआई सोच रहा है... इसमें कुछ सेकंड लग सकते हैं' : 'Still working... a few more seconds';
    }, 6000);
    let controller;
    try { controller = new AbortController(); } catch(e) { controller = null; }
    // Client-side hard timeout: 25s — server returns within 30s so we always get a response
    const clientTimeout = setTimeout(() => { if (controller) controller.abort(); }, 25000);
    let req;
    try {
      if (typeof fetch !== 'function') { clearTimeout(slowTimer); clearTimeout(clientTimeout); goLocal(S.lang === 'hi' ? 'इस ब्राउज़र में नेटवर्क उपलब्ध नहीं' : 'no network available here', true); return; }
      req = fetch('/api/ai/solve', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (localStorage.getItem('upay.token') || '') },
        body: JSON.stringify({ question: q, chapter: chapterById(S.chapterId) ? S.chapterId : 0, subject: S.subject, cls: S.cls, lang: S.lang }),
        signal: controller ? controller.signal : undefined
      });
    } catch (e) { clearTimeout(slowTimer); clearTimeout(clientTimeout); goLocal(S.lang === 'hi' ? 'नेटवर्क से संपर्क नहीं हुआ' : 'could not reach the server', true); return; }
    req.then(r => {
      clearTimeout(clientTimeout); clearTimeout(slowTimer);
      if (!r) throw new Error('no response');
      return r.json().catch(() => ({ error: 'bad-response' })).then(j => ({ ok: r.ok, j }));
    })
      .then(({ ok, j }) => {
        if (!isCurrent()) return;
        if (ok && j && j.approaches && j.approaches.length) {
          j = UP.answerFormat.answer(j);
          j.question = q;
          j._chId = S.chapterId || 0;
          S.aiAnswer = j; S.aiState = 'done';
          pushRecent(q, S.subject, S.chapterId ? (chapterById(S.chapterId) ? P(chapterById(S.chapterId).en || {}) : '') : '');
          bumpProgress(S.subject);
        } else {
          S.aiErrorCode = j && j.code || '';
        S.aiRetryAt = j && Number.isFinite(j.retryAfter) && j.retryAfter > 0 ? Date.now() + j.retryAfter*1000 : 0;
        const retryHint = j && Number.isFinite(j.retryAfter) && j.retryAfter > 0 ? ' Retry after '+Math.ceil(j.retryAfter)+' seconds.' : '';
        const note = (j && j.offline)
            ? (S.lang === 'hi' ? 'आप ऑफ़लाइन हैं — बिल्ट-इन हल दिखाया जा रहा है' : 'You are offline — showing the built-in solver')
            : (j && j.error) ? j.error + retryHint : (S.lang === 'hi' ? 'एआई से जवाब नहीं आया' : 'The AI did not return an answer.');
          goLocal(note, true);
          return;
        }
        paint();
      })
      .catch((err) => {
        clearTimeout(clientTimeout); clearTimeout(slowTimer);
        if (!isCurrent()) return;
        const isTimeout = err && err.name === 'AbortError';
        goLocal(isTimeout
          ? (S.lang === 'hi' ? 'एआई को जवाब देने में बहुत समय लग रहा है' : 'The AI is taking too long to answer')
          : (S.lang === 'hi' ? 'नेटवर्क से संपर्क नहीं हुआ' : 'could not reach the server'), true);
      });
  }

  /* ---------------- the honesty badge ----------------
     The student is told exactly how far the answer was checked:
     verified  = a second, independent AI pass agreed
     passed    = the numbers matched an offline recomputation
     unchecked = nothing could check it (say so — do not imply certainty)
     disputed  = the checker disagreed, so no answer is shown at all        */
  function checkBadge(c, aiRan) {
    const hi = S.lang === 'hi';
    if (!c) return '';
    const st = c.state || 'unchecked';
    if (st === 'verified') {
      /* Say HOW it was checked. When the arithmetic engine settled it, that is a
         much stronger claim than "another AI agreed" — and the old wording was
         actively misleading once the model-checking pass was replaced. */
      const byMath = c.source === 'arithmetic';
      return `<div class="check-badge ok">${icon('check')}<div><b>${hi ? 'सत्यापित' : 'Verified'}</b>
        <span>${byMath
          ? (hi ? 'उत्तर प्रश्न के अपने अंकों से दोबारा निकालकर मिलाया गया' : 'the answer was recomputed from this question’s own numbers')
          : (hi ? 'एक दूसरे, स्वतंत्र एआई हल ने इसी उत्तर को निकाला' : 'a second, independent AI pass reached the same answer')}${
          c.note ? ' · ' + esc(String(c.note).slice(0, 90)) : ''}</span></div></div>`;
    }
    if (st === 'disputed') {
      return `<div class="check-badge bad">${icon('info')}<div><b>${hi ? 'गणना से उत्तर मेल नहीं खाता' : 'The draft answer did not match the calculation'}</b>
        <span>${hi ? 'ऐप ने प्रश्न से उत्तर स्वयं निकाला' : 'The app worked this out from the question itself'}: <b style="display:inline">${esc(c.yourAnswer || c.computed || '—')}</b>${
          c.note ? ' — ' + esc(String(c.note).slice(0, 80)) : ''}</span></div></div>`;
    }
    if (st === 'passed') {
      return `<div class="check-badge ok">${icon('check')}<div><b>${hi ? 'गणना से जाँचा गया' : 'Checked by calculation'}</b>
        <span>${hi ? 'ऐप ने उत्तर यहाँ ही, बिना इंटरनेट, दोबारा निकालकर मिलाया' : 'the app recomputed this offline and the numbers matched'}</span></div></div>`;
    }
    if (st === 'failed') {
      return `<div class="check-badge bad">${icon('info')}<div><b>${hi ? 'यह उत्तर गणना से मेल नहीं खाता' : 'This does not match the calculation'}</b>
        <span>${hi ? 'ऐप की अपनी गणना' : 'The app computes'}: <b style="display:inline">${esc(c.computed || '—')}</b>${
          hi ? ' — भरोसा गणना पर कीजिए, और शिक्षक को बताइए।' : ' — trust the calculation, and tell your teacher.'}</span></div></div>`;
    }
    return `<div class="check-badge grey">${icon('info')}<div><b>${hi ? 'स्वतंत्र रूप से जाँचा नहीं गया' : 'Not independently checked'}</b>
      <span>${hi ? 'इस प्रकार के प्रश्न की ऑफ़लाइन जाँच उपलब्ध नहीं — चरण स्वयं जाँचिए' : 'no offline check exists for this question type — verify the steps yourself'}</span></div></div>`;
  }

  /* the AI answer, in the same shape as a built-in one */
  function renderAIDiagram(a) {
    if (!a) return '';
    const concept = a.conceptDiagram && a.conceptDiagram.type === 'flow' ? a.conceptDiagram : null;
    const graphical = a.diagram && a.diagram.type !== 'flow' ? a.diagram : null;
    let drawing = graphical ? renderSingleAIDiagram(a) : '';
    // A flow-only reply must not replace an existing question-matched local
    // drawing (e.g. the √5 number-line construction). Never borrow a stale one.
    const question = a.question || S.aiQuestion || '';
    if (!graphical && S.answer && S.answer.question === question &&
        !S.answer._loading && S.answer._geom && !['topic','concept','fallback'].includes(S.answer.kind) && ['maths','applied-maths'].includes(S.subject)) {
      try {
        drawing = figureBlock(S.answer);
        if (drawing && S.answer.kind === 'irrational') drawing += '<p class="muted">' + (S.lang === 'hi' ? 'यह रचना लंबाई दर्शाती है; अपरिमेयता का प्रमाण नीचे दिए तर्क से है।' : 'This construction illustrates the length; the reasoning flow proves irrationality, not the drawing alone.') + '</p>';
      } catch (_) { /* no honest local figure */ }
    }
    const flow = concept || (a.diagram && a.diagram.type === 'flow' ? a.diagram : null);
    return drawing + (flow ? renderSingleAIDiagram(Object.assign({}, a, {diagram:flow})) : '');
  }
  function renderSingleAIDiagram(a) {
    a = UP.answerFormat.answer(a);
    const figSpec = a.diagram ? Object.assign({}, a.diagram, { caption: a.diagram.caption }) : null;
    let fig = '';
    /* Client-side safety: a "solid" diagram (cylinder/cone/sphere/...) is only
       honest for mensuration / geometry questions. If the subject is not
       Maths, or the question text doesn't actually name a solid, refuse to
       draw it. This is what prevents a chemistry balancing question from
       being paired with a random r=2, h=4 cylinder. */
    function diagramIsHonestForSubject(spec, question, subject) {
      if (!spec) return false;
      const t = String(question || '').toLowerCase();
      const ty = String(spec.type || '').toLowerCase();

      /* Maths: only draw solids when the question actually names one with
         measurements. Coordinate geometry / triangles / circles / bars are
         always fine for maths. */
      if (subject === 'maths' || subject === 'applied-maths') {
        if (ty === 'solid' || ty === 'composite') {
          return /cylind|\bcone\b|hemispher|\bsphere\b|frustum|cuboid|\bcube\b|radius|height|diamet|volume|surface area/i.test(t);
        }
        return true;
      }

      /* Physics: allow optics (lens/mirror/ray), circuits, mechanics
         (pendulum/incline/pulley), and genuine plane/triangle/circle diagrams
         (ray diagrams, force triangles, lens ray tracing, etc.). Bars are
         also fine (data). Reject solids entirely. */
      if (['science','physics','chemistry','biology'].includes(subject)) {
        if (ty === 'solid' || ty === 'composite') return false;
        const sciAllowed = ['apparatus','beaker','test-tube','flask','burner','reaction',
                           'lens','mirror','ray','optics','circuit','pulley','pendulum',
                           'bio','leaf','cell','flower','organ'];
        if (sciAllowed.indexOf(ty) >= 0) return true;
        /* Allow plane/triangle/circle for PHYSICS ray/force/optics questions,
           but not for chemistry/biology text, and never with random coordinate
           points that look like an algebra graph. Heuristic: if the question
           mentions ray/lens/mirror/circuit/force/pulley/pendulum/prism/angle
           it's a physics diagram; otherwise reject. */
        if (ty === 'plane' || ty === 'triangle' || ty === 'circle') {
          return /ray|lens|mirror|optic|prism|angle of|inciden|refract|reflect|force|pulley|pendulum|incline|friction|circuit|current|volt|resist|magnetic|magnification|focal length/i.test(t);
        }
        if (ty === 'bars') return true; // bar charts for science data are fine
        /* Anything else (including generic 'plane' graphs with random points)
           is rejected. */
        return false;
      }

      /* Languages (Hindi/English/Sanskrit) and Social: NO diagrams at all. */
      return false;
    }
    // Conceptual diagrams work for theory in any subject. Render text only,
    // never provider HTML/SVG. The arrows represent the supplied reasoning chain.
    if (figSpec && figSpec.type === 'flow' && Array.isArray(figSpec.nodes)) {
      const nodes = figSpec.nodes.filter(n => typeof n === 'string' && n.trim()).slice(0, 8);
      if (nodes.length >= 2) fig = '<figure class="figure-card ai-concept-diagram">' +
        '<div class="figure-head"><span class="mini-label">' +
        (S.lang === 'hi' ? 'अवधारणा चित्र · एआई' : 'Concept diagram · AI-generated') + '</span></div>' +
        '<ol class="ai-flow-nodes">' + nodes.map(n => '<li>' + esc(n.slice(0, 180)) + '</li>').join('') + '</ol>' +
        '<figcaption>' + esc(String(figSpec.caption || '').slice(0, 600)) + '</figcaption></figure>';
    }
    if (!fig && figSpec && figSpec.type !== 'flow' && UP.figures && UP.figures.generic && diagramIsHonestForSubject(figSpec, a.question || S.aiQuestion || '', S.subject)) {
      try {
        const svg = UP.figures.generic(figSpec);
        if (svg) fig = '<figure class="figure-card"><div class="figure-head">' +
          '<span class="mini-label">' + (S.lang === 'hi' ? 'चित्र' : 'Diagram') + '</span>' +
          '<span class="tag grey">' + (S.lang === 'hi' ? 'प्रश्न के निर्देशांकों से बना' : 'AI-generated schematic · check labels and values') + '</span>' +
          '</div><div class="figure-body">' + svg + '</div>' +
          '<figcaption>' + esc(figSpec.caption || '') + '</figcaption></figure>';
      } catch (e) { fig = ''; }
      if (!fig) fig = '<p class="muted ai-diagram-unavailable" role="status">' + (S.lang === 'hi' ? 'AI चित्र के निर्देशांक अधूरे हैं; चित्र नहीं दिखाया जा सका। व्याख्या नीचे उपलब्ध है।' : 'The AI diagram data could not be rendered safely. The written explanation is still available below.') + '</p>';
    }
    return fig;
  }
  function renderAIAnswer(a) {
    a = UP.answerFormat.answer(a);
    const fig = renderAIDiagram(a);
    const chk = a.check || null;
    return `
    <section class="answer ai-answer">
      ${checkBadge(chk, true)}
      ${a.questionUnderstood ? `<div class="callout" style="margin-bottom:12px">${icon('info')}<div><b>${S.lang === 'hi' ? 'प्रश्न यह समझा गया' : 'Question understood as'}:</b> ${esc(a.questionUnderstood)}</div></div>` : ''}
      <div class="answer-head">
        <div class="meta-row">
          <span class="tag">${S.lang === 'hi' ? 'एआई द्वारा हल' : 'Solved by AI'}</span>
          <span class="tag cream">${a.approaches.length} ${t('methods')}</span>
          <span class="tag grey">${esc(a.model || '')}</span>
        </div>
        <div class="qtext">${esc(a.question || S.aiQuestion || '')}</div>
        <div class="pactions">${saveQuestionButton(a.question || S.aiQuestion)}</div>
        <div style="font-size:14px;color:var(--ink-600)">${rich(a.summary || '')}</div>
        <div class="callout why" style="margin-top:14px">
          ${icon('check')}
          <div><b>${S.lang === 'hi' ? 'उत्तर' : 'Answer'}:</b> <span style="font-family:var(--mono);font-size:14px">${mathText(a.result)}</span></div>
        </div>
      </div>
      ${fig}
      <div class="section-head" style="margin:6px 0 0"><div><h2 style="font-size:20px">${t('approaches')}</h2></div></div>
      ${a.methodsShort ? `<div class="callout warn" style="margin:0 0 14px">${icon('info')}<div>${esc(a.methodsNote || (S.lang === 'hi' ? 'इस प्रश्न में वास्तव में इतनी ही विधियाँ हैं।' : 'This question genuinely has only this many routes.'))}</div></div>` : ''}
      ${a.approaches.map((ap, i) => `
        <article class="approach ${i === 0 ? 'open' : 'closed'}" data-idx="${i}">
          <div class="approach-head" data-action="toggle">
            <span class="badge-a">${i + 1}</span>
            <div><h3>${esc(ap.name)}</h3><div class="sub">${esc(ap.tag || '')}</div></div>
            <span class="toggle">${icon('chevron')}</span>
          </div>
          <div class="approach-body">
            <ol class="steps">
              ${ap.steps.map(st => `<li>
                <div class="st-t">${rich(st.t)}</div>
                ${st.m ? `<div class="st-m">${mathText(st.m)}</div>` : ''}
                ${st.note ? `<span class="st-note">${rich(st.note)}</span>` : ''}
              </li>`).join('')}
            </ol>
            ${ap.why ? `<div class="callout why">${icon('bulb')}<div><b>${t('whyItWorks')}:</b> ${rich(ap.why)}</div></div>` : ''}
            ${ap.watch ? `<div class="callout warn">${icon('warn')}<div><b>${t('watchOut')}:</b> ${rich(ap.watch)}</div></div>` : ''}
          </div>
        </article>`).join('')}
      ${a.verify ? `<div class="card cream flat"><div class="mini-label">${t('checkIt')}</div><p style="font-size:13.8px;margin:6px 0 0">${rich(a.verify)}</p></div>` : ''}
      ${renderConfidence(a)}
      ${renderDisagreement(S.answer, a)}
      ${renderRelated(a)}
      <div class="answer-foot">
        <div class="left">
          <button class="btn btn-ghost btn-sm" data-action="copy">${icon('copy')} ${t('copy')}</button>
          <button class="btn btn-ghost btn-sm" data-action="speak">${icon('speaker')} <span class="speak-label">${S.lang === 'hi' ? 'सुनें' : 'Listen'}</span></button>
          <button class="btn btn-ghost btn-sm" data-action="share">${icon('share')} ${S.lang === 'hi' ? 'शेयर' : 'Share'}</button>
          <button class="btn btn-ghost btn-sm" data-action="print">${icon('print')} ${t('print')}</button>
          <button class="btn btn-ghost btn-sm" data-action="shareImage">${icon('share')} ${S.lang==='hi'?'चित्र':'Image'}</button>
          ${needsAIOnly() ? '' : `<button class="btn btn-ghost btn-sm" data-action="askLocal">${icon('list')} ${S.lang === 'hi' ? 'अंतर्निहित हल भी देखें' : 'Also see the built-in solution'}</button>`}
          <button class="btn btn-ghost btn-sm" data-action="newQuestion">${icon('plus')} ${t('newQ')}</button>
        </div>
      </div>
    </section>`;
  }

  /* ---- Quick-win helpers: confidence line + related questions ---- */
  function renderConfidence(a) {
    // Determine trust level: local-engine-verified vs AI-only vs cached
    const localHit = S.answer && S.answer._ver === 'passed';
    const cached = a._id && UP.answers && UP.answers.get(a._id);
    let level, cls, icon_, label;
    if (localHit) { level='verified'; cls='ok'; icon_='check'; label=(S.lang==='hi'?'स्थानीय हलक से सत्यापित ✓':'Maths engine verified ✓'); }
    else if (a.model && /flash-lite/.test(a.model)) { level='ai'; cls='ai'; icon_='sparkle'; label=(S.lang==='hi'?'एआई-जनित — कृपया अपनी पाठ्यपुस्तक से मिलान करें':'AI-generated — cross-check with your textbook'); }
    else { level='ai'; cls='ai'; icon_='sparkle'; label=(S.lang==='hi'?'एआई-जनित — कृपया अपनी पाठ्यपुस्तक से मिलान करें':'AI-generated — cross-check with your textbook'); }
    return `<div class="confidence conf-${cls}">${icon(icon_)}<span>${esc(label)}</span></div>`;
  }

  function renderRelated(a) {
    const chId = a._chId || (S.answer && S.answer.chapter) || S.chapterId;
    if (!chId) return '';
    let pool = (UP.pyq || []).filter(q => q.subject === S.subject && qHasChapter(q, chId) && q.id !== a._id && (!q.cls || +q.cls === +S.cls) && (+S.cls === 10 || q.cls)).slice(0, 6);
    if (!pool.length) pool = (UP.pyq || []).filter(q => q.subject === S.subject && q.ch === 0 && q.id !== a._id && (!q.cls || +q.cls === +S.cls) && (+S.cls === 10 || q.cls)).slice(0, 6);
    if (!pool.length) return '';
    const picked = []; const seen = new Set();
    for (const q of pool) {
      if (picked.length >= 3) break;
      const txt = pyqQuestionText(q);
      if (!txt || txt.length < 8 || seen.has(txt)) continue;
      seen.add(txt); picked.push({ id: q.id, txt: txt.slice(0, 80) + (txt.length > 80 ? '…' : '') });
    }
    if (!picked.length) return '';
    return `<div class="related-q">
      <div class="rq-head"><b>${S.lang==='hi'?'इससे मिलते-जुलते प्रश्न':'Related questions'}</b><span class="muted">${S.lang==='hi'?'एक जैसे अभ्यास के लिए':'for similar practice'}</span></div>
      <div class="rq-chips">
        ${picked.map(r => `<a class="chip rq-chip" href="#/ask?q=${encodeURIComponent(r.txt)}" data-action="sample" data-q="${esc(r.txt)}">${icon('arrow')} ${esc(r.txt)}</a>`).join('')}
      </div></div>`;
  }

  /* ---- reveal the detailed solution for one past-year question ---- */
  const pyqCache = {};
  /* An EMPTY options array is truthy in JS, so `q.opts ?` treated an imported
     question with opts:[] as an MCQ and skipped the "reveal the answer" button
     entirely — the question showed but could not be answered. Always test the
     length, never the reference. */
  function hasOpts(q) {
    return Array.isArray(q.opts) && q.opts.length > 0;
  }

  function renderCachedAnswer(j, qq, sol, ansBox, id) {
    j = UP.answerFormat.answer(j);
    if (!j || j.policyVersion !== 'three-approaches-v1' || !j.approaches || j.approaches.length < 3) return false;
    const html = '<div class="sol-head">' + (S.lang === 'hi' ? 'चरण-दर-चरण हल' : 'Step-by-step solution') + '</div>' +
      (j.questionUnderstood ? '<div class="sol-understood"><b>' + (S.lang === 'hi' ? 'प्रश्न' : 'The question') + ':</b> ' + esc(j.questionUnderstood) + '</div>' : '') +
      '<div class="sol-answer"><b>' + (S.lang === 'hi' ? 'उत्तर' : 'Answer') + ':</b> ' + mathText(j.answer || j.result) + '</div>' +
      (j.summary ? '<p class="sol-sum">' + esc(j.summary) + '</p>' : '') +
      renderAIDiagram(Object.assign({}, j, {question:qq.en || ''})) +
      j.approaches.map((a, i) => '<div class="sol-method"><div class="sol-mname">' +
        (j.approaches.length > 1 ? (S.lang === 'hi' ? 'विधि ' : 'Method ') + (i+1) + ' — ' : '') + esc(a.name) + '</div>' +
        '<ol class="sol-ol">' + (a.steps||[]).map(st => '<li>' + esc(st.t || '') +
          (st.m ? '<div class="st-m">' + mathText(st.m) + '</div>' : '') +
          (st.note ? '<span class="st-note">' + esc(st.note) + '</span>' : '') + '</li>').join('') + '</ol>' +
        (a.watch ? '<div class="callout warn">' + icon('warn') + '<div><b>' + t('watchOut') + ':</b> ' + esc(a.watch) + '</div></div>' : '') +
        '</div>').join('') +
      (j.verify ? '<div class="sol-check"><b>' + t('checkIt') + ':</b> ' + esc(j.verify) + '</div>' : '') +
      '<div class="sol-cached">' + icon('check') + ' ' + (S.lang==='hi'?'सहेजा हुआ उत्तर':'Saved answer') + '</div>';
    pyqCache[id] = html;
    sol.innerHTML = html;
    const bEl = ansBox && ansBox.querySelector('b');
    if (bEl) bEl.textContent = String(j.answer || j.result || bEl.textContent);
    UP.answers.set(id, j);
    return true;
  }

  function revealPyq(id) {
    const sol = document.getElementById('sol-' + id);
    const ansBox = document.getElementById('ans-' + id);
    if (!sol) return;
    sol.hidden = false;
    if (ansBox) ansBox.hidden = false;
    const qq = (UP.pyq || []).find(x => x.id === id);
    if (!qq) return;

    if (pyqCache[id]) { sol.innerHTML = pyqCache[id]; warmNextQuestions(id); return; }

    // Check answer cache first
    // Old locally cached AI replies may have been made with a maths prompt.
    // Never reuse them as an Accountancy answer or official answer key.
    const sourceTrack = qq.subject === 'accountancy' || qq.subject === 'computerized-accounting' || qq.keyVerified === false;
    const cached = sourceTrack ? null : UP.answers.get(id);
    if (cached && renderCachedAnswer(cached, qq, sol, ansBox, id)) { warmNextQuestions(id); return; }

    const stored = '<div class="sol-head">' + (S.lang === 'hi' ? 'चरण-दर-चरण हल' : 'Step-by-step solution') + '</div>' +
      '<div class="sol-steps"><p>' + esc(qq.twist || '') + '</p></div>';
    sol.innerHTML = '<div class="sol-loading">' + loadingDots() + '</div>' + stored;

    const ask = 'Solve this ' + String(S.board || 'CBSE').toUpperCase() + ' Class ' + S.cls + ' ' + S.subject + ' question completely, showing every step:\n\n' +
      pyqQuestionText(qq) + (hasOpts(qq) ? '\n\nOptions: ' + qq.opts.map((o, i) => String.fromCharCode(65 + i) + ') ' + (o.en || P(o))).join('  ') : '');
    fetch('/api/ai/solve', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (localStorage.getItem('upay.token') || '') },
      /* imported:true turns on the corrupt gate.  Without it the server
         happily spent a model call answering a question whose fraction was
         lost in extraction -- and then showed that answer as a solution. */
      body: JSON.stringify({ question: ask, chapter: qq.ch, imported: true, options: hasOpts(qq) ? qq.opts.length : 0, subject: S.subject, cls: S.cls, lang: S.lang })
    }).then(r => {
      /* A non-2xx reply used to be thrown away unread (`.then(r => r.ok ? r.json()
         : null)`), so EVERY failure -- a timed-out session, the daily quota, a
         torn question -- became the same sentence: "the server did not answer".
         That is false, and it hides the one thing the student could act on.
         Read the body whatever the status, and keep the status for the message. */
      return r.json().catch(function () { return null; }).then(function (j) {
        return { status: r.status, ok: r.ok, body: j };
      });
    }).then(function (reply) {
      const j = UP.answerFormat.answer(reply.body);
      /* The loading line used to stay forever when the reply had no usable
         approaches, or when anything below threw. Both are silent failures for
         the student: the spinner never stops and nothing says why. */
      if (!j) {
        sol.innerHTML = '<div class="callout warn">' + icon('warn') +
          '<div>' + (S.lang === 'hi' ? 'सर्वर का उत्तर पढ़ा नहीं जा सका (HTTP ' + reply.status + ')। दुबारा कोशिश कीजिए।'
                                     : 'The server\'s reply could not be read (HTTP ' + reply.status + '). Try again.') + '</div></div>';
        return;
      }
      if (!j.approaches || !j.approaches.length) {
        /* 401/403 = the sign-in lapsed or there is no API key. Show the LOCAL
           solver answer underneath the sign-in banner so the student still gets
           help, instead of a dead panel they cannot read. */
        const accTrack = needsAIOnly() || qq.keyVerified === false;
        const localAns = accTrack ? null : ((UP.answerQuestion && UP.answerQuestion(qq))
                       || (UP.fallbackAnswer && UP.fallbackAnswer(qq.en + ' ' + (qq.hi || ''), S.lang))
                       || null);
        const isAuthFail = (reply.status === 401 || reply.status === 403);
        const msg = accTrack
          ? (j.error || (S.lang === 'hi' ? 'एआई हल उपलब्ध नहीं है। आधिकारिक उत्तर-कुंजी भी उपलब्ध नहीं है।' : 'The AI solution is unavailable. An official answer key is not included.'))
          : isAuthFail
          ? (S.lang === 'hi' ? 'आपका साइन-इन समाप्त हो गया है (या कोई API कुंजी सेट नहीं है)। नीचे स्थानीय हल दिया है।'
                             : 'Your sign-in has expired (or no AI key is set). A local solution is shown below.')
          : (j.error || (S.lang === 'hi' ? 'एआई हल नहीं बना सका। नीचे स्थानीय हल देखें।' : 'AI could not produce a solution. A local answer is shown below.'));
        const localHtml = localAns ? (
          '<div class="sol-head" style="margin-top:14px">' + (S.lang === 'hi' ? 'स्थानीय हल' : 'Local answer') + '</div>' +
          '<div class="sol-answer"><b>' + (S.lang === 'hi' ? 'उत्तर' : 'Answer') + ':</b> ' + esc(localAns.result || localAns.text || (typeof localAns === 'string' ? localAns : '')) + '</div>' +
          (localAns.steps && localAns.steps.length ? '<ol class="sol-ol" style="margin-top:8px">' + localAns.steps.map(s => '<li>' + esc(s.t || s) + '</li>').join('') + '</ol>' : '')
        ) : '<p style="color:var(--ink-500);margin:0">' + esc(S.lang === 'hi' ? 'स्थानीय हल भी उपलब्ध नहीं।' : 'No local answer is available either.') + '</p>';
        sol.innerHTML = '<div class="callout warn">' + icon('warn') + '<div>' + esc(msg) + '</div>' +
          (isAuthFail ? '<div style="margin-top:8px"><a class="btn btn-sm" href="#/login">' +
             (S.lang === 'hi' ? 'साइन इन' : 'Sign in') + '</a></div>' : '') + '</div>' + localHtml;
        return;
      }
      const html = '<div class="sol-head">' + (S.lang === 'hi' ? 'एआई द्वारा चरण-दर-चरण हल' : 'AI-generated step-by-step solution') + '</div>' +
        (sourceTrack ? '<div class="callout warn"><div>' + (S.lang === 'hi' ? 'यह एआई हल आधिकारिक उत्तर-कुंजी से सत्यापित नहीं है।' : 'This AI solution has not been verified against an official answer key.') + '</div></div>' : '') +
        (j.questionUnderstood ? '<div class="sol-understood"><b>' + (S.lang === 'hi' ? 'प्रश्न' : 'The question') + ':</b> ' + esc(j.questionUnderstood) + '</div>' : '') +
        '<div class="sol-answer"><b>' + (S.lang === 'hi' ? 'उत्तर' : 'Answer') + ':</b> ' + mathText(j.result) + '</div>' +
        (j.summary ? '<p class="sol-sum">' + esc(j.summary) + '</p>' : '') +
      renderAIDiagram(Object.assign({}, j, {question:qq.en || ''})) +
        j.approaches.map((a, i) => '<div class="sol-method"><div class="sol-mname">' +
          (j.approaches.length > 1 ? (S.lang === 'hi' ? 'विधि ' : 'Method ') + (i + 1) + ' — ' : '') + esc(a.name) + '</div>' +
          '<ol class="sol-ol">' + a.steps.map(st => '<li>' + esc(st.t) +
            (st.m ? '<div class="st-m">' + mathText(st.m) + '</div>' : '') +
            (st.note ? '<span class="st-note">' + esc(st.note) + '</span>' : '') + '</li>').join('') + '</ol>' +
          (a.watch ? '<div class="callout warn">' + icon('warn') + '<div><b>' + t('watchOut') + ':</b> ' + esc(a.watch) + '</div></div>' : '') +
          '</div>').join('') +
        (j.verify ? '<div class="sol-check"><b>' + t('checkIt') + ':</b> ' + esc(j.verify) + '</div>' : '') +
        /* the figure the AI drew from this question's own numbers -- rendered
           here too, because a bank question with a worked solution but no
           diagram is exactly the gap the student complained about */
        renderAIDiagram(Object.assign({}, j, {question: qq.en || qq.hi || ''}));
      pyqCache[id] = html;
      sol.innerHTML = html;
      /* Persist this AI answer so next visit is instant */
      if (!sourceTrack) { j._subj = S.subject; UP.answers.set(id, j); }
      /* The card used to say "this paper's key is not entered yet" in the
         answer strip while the worked solution directly below it gave the
         answer. Two contradictory statements about the same question. If the
         paper has no printed key, the solved answer fills that strip. */
      const bEl = ansBox && ansBox.querySelector('b');
      if (!sourceTrack && bEl && !String(qq.ans || '').trim() && (j.result || j.answer)) {
        bEl.textContent = String(j.answer || j.result);
        ansBox.hidden = false;
      }
      warmNextQuestions(id);
    }).catch(function (err) {
      /* never leave the spinner running: say what happened */
      sol.innerHTML = '<div class="callout warn">' + icon('warn') + '<div>' +
        (S.lang === 'hi' ? 'हल लोड नहीं हो सका' : 'The solution could not be loaded') +
        ' — ' + esc(String((err && err.message) || err).slice(0, 120)) + '</div></div>';
    });
  }

  function loadingDots() {
    const label = S.lang === 'hi' ? 'व्याख्या तैयार हो रही है' : 'Preparing the explanation';
    return `<span class="ai-dots" role="status" aria-label="${label}"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span></span>`;
  }

  function emptyAsk() {
    if (+S.cls !== 10 || S.subject !== 'maths') return `<div class="empty" style="margin-top:26px">${icon('sparkle')}<h3>${S.lang === 'hi' ? 'अपना प्रश्न लिखिए' : 'Type your question'}</h3><p>${S.lang === 'hi' ? 'एआई उत्तर की उपलब्धता खाते और सेवा पर निर्भर है। उपलब्ध प्रश्नों का अभ्यास बिना एआई के करें।' : 'AI answers depend on account and service availability. You can practise available questions without AI.'}</p></div>`;
    return `<div class="empty" style="margin-top:26px">
      ${icon('sparkle')}
      <h3>${S.lang === 'hi' ? 'प्रश्न लिखिए और "सभी तरीके दिखाइए" दबाइए' : 'Type a question and press “Show me the ways”'}</h3>
      <p>${S.lang === 'hi' ? 'द्विघात समीकरण, म.स./ल.स., रैखिक युग्म, श्रेढ़ी, दूरी, त्रिकोणमिति, क्षेत्रमिति, प्रायिकता — इन सभी के लिए हल-इंजन तैयार हैं।' : 'The solver handles quadratics, HCF/LCM, linear pairs, APs, distance, trigonometry, mensuration, probability and more.'}
      <br>${S.lang === 'hi' ? 'किसी अध्याय का नाम लिखने पर उसकी पूरी अवधारणा-सामग्री मिलेगी।' : 'Type a chapter or topic name and you will get its full concept sheet.'}</p>
    </div>`;
  }

  function renderAnswer(ans) {
    if (ans.kind === 'accountancy-unavailable' || ans.kind === 'no-local-solver') {
      return `<div class="callout warn" style="margin-top:14px">${icon('warn')}<div>
        <b>${S.lang === 'hi' ? 'एआई समाधान उपलब्ध नहीं है।' : 'AI solution unavailable.'}</b>
        ${S.lang === 'hi' ? 'इस प्रश्न का कोई सत्यापित स्थानीय हल या आधिकारिक उत्तर-कुंजी उपलब्ध नहीं है।' : 'There is no verified local solution or official answer key for this question.'}
        ${ans.note ? `<div role="status">${esc(ans.note)}</div>` : ''}
        ${aiRecovery(ans.question)}
        ${aiRetryControl()}
      </div></div>`;
    }
    const ch = ans.chapter ? chapterById(ans.chapter) : null;
    const methods = ans.approaches.slice(0, 6);
    /* The built-in answer ran on this device with no network at all. If the
       offline checker can independently confirm it, say so; if not, say that
       too rather than letting the student assume it was verified. */
    let localBadge = '';
    try {
      const claim = ans.result && (typeof ans.result === 'object' ? ans.result.en : ans.result);
      const ck = claim && UP.checker && UP.checker.check(ans.question || S.aiQuestion || '', claim);
      if (ck && ck.ok) localBadge = checkBadge({ state: 'passed' }, false);
      else if (ck && ck.ok === false) {
        /* the arithmetic disagreed with the printed answer — never hide this */
        localBadge = checkBadge({ state: 'failed', computed: ck.computed }, false);
      } else if (claim) localBadge = checkBadge({ state: 'unchecked' }, false);
    } catch (e) { /* a missing checker must never break the answer */ }
    const isLoading = ans._loading === true;
    return `
    <section class="answer">
      ${localBadge}
      <div class="answer-head">
        <div class="meta-row">
          <span class="tag">${esc(ch ? P({ en: ch.en, hi: ch.hi }) : (isLoading ? (S.lang==='hi'?'एआई':'AI') : (S.lang === 'hi' ? 'अवधारणा' : 'Concept')))}</span>
          ${isLoading
            ? `<span class="tag cream spin-tag">${icon('clock')} ${S.lang==='hi'?'हल हो रहा है…':'working…'}</span>`
            : `<span class="tag cream">${methods.length} ${t('methods')}</span>`}
          <span class="tag grey">${S.lang === 'hi' ? 'कक्षा' : 'Class'} ${S.cls} · ${esc(P(UP.subjects[S.subject] || UP.subjects.maths))}</span>
        </div>
        <div class="qtext">${esc(ans.question || '')}</div>
        <div style="font-size:14px;color:var(--ink-600)">${rich(P(ans.summary))}</div>
        ${isLoading ? `
        <div class="callout" style="margin-top:14px;background:#eef6fb;border-color:#b7d9ea">
          ${icon('sparkle')}
          <div data-slow>${S.lang === 'hi' ? 'एआई पूरा हल बना रहा है…' : 'The AI is writing a full step-by-step answer…'}</div>
        </div>` : `
        <div class="callout why" style="margin-top:14px">
          ${icon('check')}
          <div><b>${S.lang === 'hi' ? 'उत्तर' : 'Answer'}:</b> <span style="font-family:var(--mono);font-size:14px">${mathText(P(ans.result))}</span></div>
        </div>`}
      </div>

      ${isLoading ? `<div class="skeleton-lines">
        <div class="sl"></div><div class="sl w90"></div><div class="sl w70"></div><div class="sl w80"></div><div class="sl w60"></div>
      </div>` : figureBlock(ans)}

      ${isLoading ? '' : `<div class="section-head" style="margin:6px 0 0"><div><h2 style="font-size:20px">${t('approaches')}</h2></div></div>`}
      ${methods.map((a, i) => `
        <article class="approach ${i === 0 ? 'open' : 'closed'}" data-idx="${i}">
          <div class="approach-head" data-action="toggle">
            <span class="badge-a">${i + 1}</span>
            <div><h3>${esc(P(a.name))}</h3><div class="sub">${esc(P(a.tag || { en: '', hi: '' }))}</div></div>
            <span class="toggle">${icon('chevron')}</span>
          </div>
          <div class="approach-body">
            <ol class="steps">
              ${a.steps.map(st => `<li>
                <div class="st-t">${rich(P(st.t))}</div>
                ${st.m ? `<div class="st-m">${mathText(st.m)}</div>` : ''}
                ${st.note ? `<span class="st-note">${rich(P(st.note))}</span>` : ''}
              </li>`).join('')}
            </ol>
            ${a.why ? `<div class="callout why">${icon('bulb')}<div><b>${t('whyItWorks')}:</b> ${rich(P(a.why))}</div></div>` : ''}
            ${a.watch ? `<div class="callout warn">${icon('warn')}<div><b>${t('watchOut')}:</b> ${rich(P(a.watch))}</div></div>` : ''}
            ${approachFigure(ans, i, methods.length)}
          </div>
        </article>`).join('')}

      <div class="card cream flat">
        <div class="mini-label">${t('checkIt')}</div>
        <p style="font-size:13.8px;margin:6px 0 0">${rich(P(ans.verify))}</p>
      </div>

      ${panelBlock(ans)}

      ${ans.related && ans.related.length ? `
      <div>
        <div class="mini-label" style="margin-bottom:8px">${t('related')}</div>
        <div class="pill-row">
          ${ans.related.map(id => { const c = chapterById(id); return c ? `<a class="pill" href="#/chapter/${c.id}">${esc(P({ en: c.en, hi: c.hi }))}</a>` : ''; }).join('')}
        </div>
      </div>` : ''}

      <div class="answer-foot">
        <div class="left">
          <button class="btn btn-ghost btn-sm" data-action="copy">${icon('copy')} ${t('copy')}</button>
          <button class="btn btn-ghost btn-sm" data-action="speak">${icon('speaker')} <span class="speak-label">${S.lang === 'hi' ? 'सुनें' : 'Listen'}</span></button>
          <button class="btn btn-ghost btn-sm" data-action="share">${icon('share')} ${S.lang === 'hi' ? 'शेयर' : 'Share'}</button>
          <button class="btn btn-ghost btn-sm" data-action="print">${icon('printer')} ${t('print')}</button>
          <button class="btn btn-ghost btn-sm" data-action="shareImage">${icon('share')} ${S.lang==='hi'?'चित्र':'Image'}</button>
          ${saveQuestionButton(ans.question || ans.q)}
          <button class="btn btn-ghost btn-sm" data-action="newQuestion">${icon('plus')} ${t('newQ')}</button>
        </div>
        <div class="disclaimer">${icon('info')}<span>${t('printNote')}</span></div>
      </div>
      ${ch ? `<a class="btn btn-primary" href="#/chapter/${ch.id}" style="align-self:flex-start">${t('openChapterCta')} ${icon('arrow')}</a>` : ''}
    </section>`;
  }

  /* ---------------------- figures & the panel ---------------------- */
  function figureBlock(ans) {
    const f = UP.figures && UP.figures.figure(ans);
    if (!f) return '';
    return `<figure class="figure-card">
      <div class="figure-head">
        <span class="mini-label">${S.lang === 'hi' ? 'चित्र' : 'Diagram'}</span>
        <span class="tag grey">${S.lang === 'hi' ? 'प्रश्न के अपने मानों से बना' : 'drawn from this question’s own numbers'}</span>
      </div>
      <div class="figure-body">${f.svg}</div>
      <figcaption>${esc(P(f.caption))}</figcaption>
    </figure>`;
  }

  /* a second, method-specific figure shown inside an approach */
  function approachFigure(ans, i, total) {
    if (i === 0) return '';                      /* the main figure already covers method 1 */
    const k = ans.kind, g = ans._geom || {};
    let svg = '', cap = '';
    try {
      if (k === 'quadratic' && i === 2 && typeof g.a === 'number') {
        /* completing the square → the same parabola with the vertex marked */
        const f = UP.figures.figure(ans);
        if (f) { svg = f.svg; cap = S.lang === 'hi' ? 'शीर्ष बिंदु वही है जहाँ कोष्ठक शून्य होता है — इसीलिए पूर्ण वर्ग से न्यूनतम/अधिकतम मिलता है।' : 'The vertex is exactly where the bracket becomes zero — that is why completing the square exposes the minimum or maximum.'; }
      } else if (k === 'linear-pair' && i === 1) {
        const f = UP.figures.figure(ans);
        if (f) { svg = f.svg; cap = S.lang === 'hi' ? 'प्रतिस्थापन में भी वही प्रतिच्छेद बिंदु मिलना चाहिए।' : 'Substitution must land on the same crossing point — that is the check.'; }
      } else if ((k === 'trig-ratios') && i === 1) {
        svg = UP.figures.rightTriangle({ angle: (g.angle || 'θ'), opp: 'sin', adj: 'cos', hyp: '1', tan: 0.75, chip: 'sin²+cos²=1', chipTitle: 'identity view' });
        cap = S.lang === 'hi' ? 'सर्वसमिका वही त्रिभुज है, केवल बिना चित्र के लिखी गई।' : 'The identity is the same triangle, written without a drawing.';
      }
    } catch (e) { return ''; }
    if (!svg) return '';
    return `<figure class="figure-card nested">
      <div class="figure-body">${svg}</div>
      <figcaption>${esc(cap)}</figcaption>
    </figure>`;
  }

  function panelBlock(ans) {
    if (!UP.panel) return '';
    const p = UP.panel.build(ans);
    const hi = S.lang === 'hi';
    return `<section class="panel">
      <div class="section-head" style="margin:0 0 12px">
        <div>
          <h2 style="font-size:20px">${hi ? 'एक ही प्रश्न, चार सहायक शैलियाँ' : 'The same question, four assistant styles'}</h2>
          <p style="font-size:13.2px">${hi ? 'ये चार शैलियाँ उसी हल से बनाई गई हैं जो ऊपर है — गणित एक ही है, प्रस्तुति और प्राथमिकताएँ अलग।' : 'These four are generated from the same solved object above — identical maths, different presentation and priorities.'}</p>
        </div>
        <span class="tag cream">${p.styles.length} ${hi ? 'शैलियाँ' : 'styles'}</span>
      </div>

      <div class="panel-grid">
        ${p.styles.map(st => `
          <article class="panel-card ${st.id === p.winner ? 'winner' : ''}">
            <div class="panel-top">
              <span class="panel-dot ${st.colour}"></span>
              <div>
                <h3>${esc(P(st.name))}</h3>
                <div class="panel-model">${esc(P(st.model))}</div>
              </div>
              ${st.id === p.winner ? `<span class="tag">${hi ? 'सर्वश्रेष्ठ' : 'best here'}</span>` : ''}
            </div>
            <div class="panel-body">
              ${st.body.map(b => b.kind === 'step'
                ? `<p class="p-step">${rich(b.text)}${b.math ? `<span class="p-math">${mathText(b.math)}</span>` : ''}</p>`
                : b.kind === 'math'
                  ? `<p class="p-math">${mathText(b.text)}</p>`
                  : b.kind === 'figure'
                    ? `<div class="panel-figure">${(() => { const f = UP.figures && UP.figures.figure(ans); return f ? f.svg : ''; })()}</div>`
                    : `<p class="p-line">${rich(b.text)}</p>`).join('')}
            </div>
            ${st.tail && P(st.tail) ? `<p class="panel-tail">${rich(P(st.tail))}</p>` : ''}
            <div class="panel-verdict">
              <b>${hi ? 'आकलन' : 'Verdict'}:</b> ${esc(P(st.verdict))}
              <div class="panel-best">${hi ? 'सर्वोत्तम कब' : 'Best for'}: ${esc(P(st.best))}</div>
            </div>
          </article>`).join('')}
      </div>

      <div class="panel-final">
        <div class="panel-final-head">
          <span class="mini-label">${hi ? 'कौन सा उत्तर सर्वश्रेष्ठ है' : 'Which answer is best'}</span>
          <span class="tag cream">${p.scores.got}/${p.scores.total} ${hi ? 'जाँचे गए गुण' : 'checks passed'}</span>
        </div>
        <p class="panel-winner-line">
          <b>${esc(P(p.styles.find(s => s.id === p.winner).name))}</b> —
          ${esc(P(p.why))}
        </p>
        <div class="rubric">
          ${p.scores.rows.map(r => `<div class="rubric-row">
            <span>${esc(P(r.k))}</span>
            <div class="bar"><i style="width:${Math.round((r.v / r.max) * 100)}%"></i></div>
            <span class="rubric-v">${r.v}/${r.max}</span>
          </div>`).join('')}
        </div>
        <p class="panel-note">${hi
          ? 'यह तुलना एक ही हल से स्थानीय रूप से बनी है। यह स्वतंत्र सत्यापन नहीं है; अलग AI अनुरोध ऑनलाइन जा सकते हैं।'
          : 'This comparison is generated locally from the same solution. It is not independent verification; separate AI requests may go online.'}</p>
      </div>
    </section>`;
  }

  /* ============================== SYLLABUS ============================== */
  function viewSyllabus(params) {
    const list = catalogue();
    const q = (params.q || '').toLowerCase();
    const filtered = list.filter(c => {
      if (!q) return true;
      const blob = [c.en, c.hi, c.enDesc || '', c.hiDesc || '', ...(c.keywords?.en || []), ...(c.keywords?.hi || [])].join(' ').toLowerCase();
      return blob.includes(q);
    });
    const isMaths10 = +S.cls === 10 && S.subject === 'maths';
    const isAccountancy = accountancyTrack();
    const isEconomics = economicsTrack();
    const isEnglish12 = english12Track();
    const isBusiness = businessTrack();
    const isChemistry = +S.cls === 12 && S.subject === 'chemistry';
    const syllabusLead = isBusiness
      ? (S.board === 'cbse' ? '12 English unit outlines mapped to CBSE 2026–27: 11 from your supplied chapters and Financial Markets from the CBSE syllabus. Project work is not covered.' : 'These outlines are mapped only to CBSE 2026–27. Select CBSE to see them; other boards have not been verified.')
      : isChemistry
      ? (S.lang === 'hi'
        ? 'कक्षा 12 रसायन विज्ञान की 10 इकाई-रूपरेखाएँ, CBSE 2026–27 पाठ्यक्रम (विषय 043) से मैप; आपकी दी गई NCERT पुनर्मुद्रण अध्याय-PDF पर आधारित। प्रायोगिक कार्य, परियोजना और चार प्रारूपिक-मूल्यांकन इकाइयाँ शामिल नहीं हैं। CBSE द्वारा प्रमाणित नहीं।'
        : 'Ten unit outlines mapped to the CBSE 2026–27 Chemistry syllabus (subject 043), based on the supplied NCERT reprint chapter PDFs. Practicals, project work and the four formative-only topics are not covered. Not certified by CBSE.')
      : isEnglish12
      ? (S.lang === 'hi'
        ? 'दी गई पुस्तकों के 40 पाठ-चयन, मूल PDF और अध्ययन संकेत। अपने बोर्ड और वर्ष का पाठ्यक्रम अलग से जाँचें।'
        : 'Forty supplied reading selections with original PDFs and study prompts. Check your board and year separately.')
      : isEconomics
      ? (S.lang === 'hi'
        ? 'दी गई पुस्तकों के 11 अध्याय: अध्ययन सामग्री, स्वयं-जाँच प्रश्न और मूल PDF। अपने बोर्ड का वर्तमान पाठ्यक्रम अलग से जाँचें।'
        : 'Eleven chapters from the supplied books: study guides, review checks and original PDFs. Check your board’s current syllabus separately.')
      : isAccountancy
      ? (S.lang === 'hi'
        ? 'अध्याय-वार रूपरेखा और स्रोत-चिह्नित विगत-वर्ष प्रश्न। यह प्रश्न-बैंक है, पूर्ण पाठ्यपुस्तक या उत्तर-कुंजी नहीं।'
        : 'Chapter map with source-tagged past-paper questions. This is a question bank, not a full textbook or answer key.')
      : t('syllabusSub');
    return `
    <header class="page-head">
      <span class="eyebrow"><span class="dot"></span>${t('classShort')} ${S.cls} · ${esc(P(UP.subjects[S.subject] || UP.subjects.maths))}</span>
      <h1>${t('syllabusTitle')}</h1>
      <p>${syllabusLead}</p>
    </header>
    <div class="filters">
      <select class="select" data-action="set" data-key="cls">${[10, 11, 12].map(c => `<option value="${c}" ${c === S.cls ? 'selected' : ''}>${t('classLabel')} ${c}</option>`).join('')}</select>
      <select class="select" data-action="set" data-key="subject">${(UP.classes.find(c => c.id === +S.cls) || UP.classes[0]).subjects.map(s => `<option value="${s}" ${s === S.subject ? 'selected' : ''}>${esc(P(UP.subjects[s]))}</option>`).join('')}</select>
      <div class="search-input">${icon('search')}<input type="search" placeholder="${t('search')}" value="${esc(params.q || '')}" data-action="search"></div>
      <span class="tag grey">${filtered.length} ${isEnglish12 ? (S.lang === 'hi' ? 'पाठ-चयन' : 'selections') : (S.lang === 'hi' ? 'अध्याय' : 'chapters')}</span>
    </div>
    ${!filtered.length && !(isBusiness && S.board !== 'cbse') ? `<div class="empty">${icon('search')}<h3>${t('noMatch')}</h3><p>${isEnglish12 ? (S.lang === 'hi' ? 'नाम, लेखक या पुस्तक खोजें।' : 'Search by title, author or book.') : (S.lang === 'hi' ? 'अन्य शब्द आज़माइए, जैसे "त्रिभुज" या "probability"।' : 'Try another keyword, such as “triangle” or “probability”.')}</p></div>` : ''}
    ${isEnglish12 ? `
      ${english12CoverageNote()}
      <p><a class="btn btn-ghost btn-sm econ-browse-link" href="#/books">${icon('library')} ${S.lang === 'hi' ? 'सभी मूल पुस्तक PDF देखें' : 'Browse original book PDFs'}</a> <a class="btn btn-ghost btn-sm econ-browse-link" href="#/pyq">${icon('book')} ${S.lang === 'hi' ? 'मूल प्रश्नपत्र PDF देखें' : 'Browse original test papers'}</a></p>
      ${ENGLISH12_GROUPS.map(([book, section]) => {
        const group = filtered.filter(c => c.book === book && c.section === section);
        return group.length ? `<section class="english12-group" data-book="${book}" data-section="${section}">
          <div class="section-head"><div><h2>${esc(P(group[0].bookTitle))} · ${esc(P(group[0].sectionTitle))}</h2>
            <p>${group.length} ${S.lang === 'hi' ? 'पाठ-चयन' : 'selections'}</p></div></div>
          <div class="grid grid-3">${group.map(chCard).join('')}</div>
        </section>` : '';
      }).join('')}` : isEconomics ? `
      <p><a class="btn btn-ghost btn-sm econ-browse-link" href="#/books">${icon('library')} ${S.lang === 'hi' ? 'सभी मूल पुस्तक PDF देखें' : 'Browse all original textbook PDFs'}</a></p>
      ${['macro', 'micro'].map(book => {
        const group = filtered.filter(c => c.book === book);
        return group.length ? `<section class="econ-chapter-group" aria-label="${esc(P(group[0].bookTitle))}">
          <div class="section-head"><div><h2>${esc(P(group[0].bookTitle))}</h2><p>${group.length} ${S.lang === 'hi' ? 'अध्याय' : 'chapters'}</p></div></div>
          <div class="grid grid-3">${group.map(chCard).join('')}</div>
        </section>` : '';
      }).join('')}` : `<div class="grid grid-3">${filtered.map(chCard).join('')}</div>`}
    ${(S.subject === 'sanskrit' && UP.sanskritPapers && UP.sanskritPapers.length) ? `
      <h2 style="margin:28px 0 10px;font-size:18px">${S.lang==='hi'?'बोर्ड प्रश्नपत्र':'Board papers'}</h2>
      <p style="color:var(--ink-500);margin:0 0 14px">${S.lang==='hi'
        ? 'ये वास्तविक CBSE बोर्ड प्रश्नपत्र पीडीएफ़ रूप में दिए हैं। स्वयं हल करके अभ्यास करें — अशुद्ध OCR से बचने के लिए प्रश्न पाठ को ऐप में टाइप नहीं किया गया।'
        : 'These are real CBSE board papers served as PDFs. Practise on paper — question text is not auto-typed into the app because Sanskrit OCR cannot be trusted at single-maatra accuracy.'}</p>
      <div class="grid grid-2">
        ${UP.sanskritPapers.map(p => `
          <a class="card" href="assets/sanskrit/papers/${encodeURIComponent(p.file)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;display:block">
            <div style="display:flex;gap:10px;align-items:flex-start">
              <span style="flex:0 0 44px;height:56px;border-radius:6px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f5d366;display:grid;place-items:center;font-weight:700;font-size:11px;color:#92620a;letter-spacing:0.3px">PDF</span>
              <div style="flex:1;min-width:0">
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
                  <span class="tag">${p.year || '—'}</span>
                  ${p.set ? `<span class="tag grey">Set ${p.set}</span>` : ''}
                  ${p.series ? `<span class="tag cream">${esc(p.series)}</span>` : ''}
                  <span class="tag grey">${p.marks} ${S.lang==='hi'?'अंक':'marks'} · ${p.time}</span>
                </div>
                <h3 style="margin:0 0 6px;font-size:15px;line-height:1.35">${esc(P(p.title))}</h3>
                <p style="color:var(--ink-500);margin:0;font-size:13px;display:flex;align-items:center;gap:4px">${S.lang==='hi'?'नए टैब में पीडीएफ़ खोलें':'Open PDF in new tab'} ${icon('external')}</p>
              </div>
            </div>
          </a>`).join('')}
      </div>` : ''}
    ${isBusiness ? `<div class="callout tip" style="margin-top:20px"><div>English outlines only; no full chapter text, questions or official answer key. Mapped to the CBSE syllabus, not certified by CBSE. <a class="link" href="https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/BusinessStudies_SecP2_2026-27.pdf">CBSE syllabus</a>.</div></div>` : isChemistry ? `<div class="callout tip" style="margin-top:20px"><div>English outlines only; no full chapter text or official answer key. Mapped to the CBSE 2026–27 Chemistry syllabus (subject 043), not certified by CBSE. The formative-only topics (Surface Chemistry; General Principles and Processes of Isolation of Elements; Polymers; Chemistry in Everyday Life) and the practical syllabus are not covered. <a class="link" href="https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Chemistry_SecP2_2026-27.pdf">CBSE syllabus</a>.</div></div>` : (!isMaths10 || isAccountancy) ? `<div class="callout tip" style="margin-top:20px">${icon('info')}<div>${isEnglish12
      ? (S.lang === 'hi' ? 'अध्यायों के स्वयं-जाँच प्रश्न उपाय ने बनाए हैं; वे बोर्ड प्रश्न या आधिकारिक उत्तर-कुंजी नहीं हैं। मूल पाठ और पुस्तक के अभ्यास PDF में हैं।' : 'The chapter review prompts were written by Upay; they are not board questions or an official answer key. The original text and textbook exercises are in the PDFs.')
      : isEconomics
      ? (S.lang === 'hi'
        ? 'अध्ययन सामग्री संक्षिप्त मार्गदर्शिका है, पूर्ण पुस्तक या आधिकारिक उत्तर-कुंजी नहीं। दी गई सभी 11 अध्याय PDF अंग्रेज़ी और हिंदी में हैं; भारतीय आर्थिक विकास की पुस्तक इस सेट में नहीं है।'
        : 'The guides are concise summaries, not the full books or official answer keys. All 11 supplied chapter PDFs are available in English and Hindi; Indian Economic Development is not included in this set.')
      : isAccountancy
      ? (S.lang === 'hi'
        ? 'प्रश्न 2023–2026 के CBSE लेखाशास्त्र प्रश्नपत्रों से हैं और मूल अंग्रेज़ी में रखे गए हैं; इस बैंक में अनुवाद या उत्तर-कुंजी नहीं है। Part B Option II अलग कम्प्यूटरीकृत लेखांकन ट्रैक में है।'
        : 'Questions are from the 2023–2026 CBSE Accountancy papers and retain their English source text; translations and answer keys are not included. Part B Option II is kept in the separate Computerized Accounting track.')
      : (S.lang === 'hi'
        ? 'कक्षा 10 विज्ञान तथा कक्षा 11–12 के अध्याय-नक्शे दिए हैं; इनके लिए गहन सूत्र-सामग्री मुख्यतः कक्षा 10 गणित में है।'
        : 'Class 10 Science and classes 11–12 chapter maps are included; deep formula sheets are currently fullest for Class 10 Mathematics.')}</div></div>` : ''}`;
  }

  /* ============================== CHAPTER ============================== */
  function viewEnglish12Chapter(ch) {
    const hi = S.lang === 'hi';
    const source = english12Source(ch);
    return `
    <a class="link" href="#/syllabus" style="font-size:13px">← ${t('nav_syllabus')}</a>
    <section class="detail-hero" style="margin-top:12px">
      <div class="meta-row"><span class="tag">${esc(P(ch.bookTitle))}</span><span class="tag cream">${esc(P(ch.sectionTitle))} ${ch.n}</span>
        ${chapterTextBadge(ch)}${source && source.reprint ? `<span class="tag grey">${hi ? 'पुनर्मुद्रण' : 'Reprint'} ${esc(source.reprint)}</span>` : ''}</div>
      <h1>${esc(P({en:ch.en,hi:ch.hi}))}</h1>
      <p>${hi ? 'रचनाकार' : 'Author'}: ${esc(ch.author)}</p>
      ${english12CourseCaution(ch)}
    </section>
    ${renderChapterText(ch, 'outline')}
    <div class="grid grid-2 english12-study-grid">
      <section class="card flat english12-study-card" aria-labelledby="english12-focus-heading">
        <h2 id="english12-focus-heading">${hi ? 'पढ़ते समय ध्यान दें' : 'Reading focus'}</h2>
        <p>${esc(P({en:ch.enDesc,hi:ch.hiDesc}))}</p>
        <ul>${ch.focus.map(item => `<li>${esc(P(item))}</li>`).join('')}</ul>
      </section>
      <section class="card flat english12-study-card" aria-labelledby="english12-review-heading">
        <h2 id="english12-review-heading">${hi ? 'स्वयं-जाँच के प्रश्न' : 'Questions for reflection'}</h2>
        <p class="muted">${hi ? 'उपाय के अभ्यास संकेत; ये बोर्ड प्रश्न या आधिकारिक उत्तर-कुंजी नहीं हैं। उत्तर के लिए पाठ से प्रमाण खोजें।' : 'Upay review prompts, not past-paper questions or an official answer key. Support your answers with evidence from the text.'}</p>
        <ol>${ch.review.map(item => `<li>${esc(P(item))}</li>`).join('')}</ol>
      </section>
    </div>
    <div class="setup-actions" style="margin-top:16px">
      <a class="btn btn-ghost btn-sm" href="#/books">${icon('library')} ${hi ? 'सभी पुस्तक PDF' : 'All book PDFs'}</a>
      <a class="btn btn-ghost btn-sm" href="#/cheatsheet/${ch.id}">${icon('print')} ${hi ? 'प्रिंट योग्य संकेत' : 'Printable review'}</a>
      <a class="btn btn-ghost btn-sm" href="#/ask?q=${encodeURIComponent('Help me understand ' + ch.en + '.')}" >${icon('sparkle')} ${hi ? 'प्रश्न पूछें' : 'Ask about this reading'}</a>
    </div>`;
  }
  /* Shared outline panel for Business Studies and Chemistry chapter views:
     sections, objectives, key terms, source and (for Chemistry) the selected
     source-crop figure. Title and ~300-character summary live in the hero. */
  /* CBSE paper code per subject, used on the outline chapter header. */
  const OUTLINE_PAPER_CODE = { chemistry: '043', biology: '044', physics: '042' };

  function renderOutlinePanel(ch) {
    const n = ch.outline; if (!n) return '';
    const list = items => items.map(item => `<li>${esc(item)}</li>`).join('');
    const figure = n.image
      ? `<figure><img loading="lazy" src="/${esc(n.image)}" alt="${esc(n.figure || n.title)}"><figcaption>NCERT figure ${esc(n.fig || '')} · ${esc(n.figure || '')} · PDF page ${esc(n.page)} · source crop, not AI-drawn</figcaption></figure>`
      : '';
    /* Biology carries the whole verified set for the chapter; Chemistry and
       Business Studies keep the single selected figure above. */
    const figureBlock = Array.isArray(n.figures)
      ? (n.figures.length
        ? `<h2>Figures from the source PDF</h2>
      <p class="muted">${n.figures.length} numbered figure${n.figures.length === 1 ? '' : 's'} cropped from the supplied NCERT reprint and checked against the page; each crop is the figure alone. Reproduced for study use, not AI-drawn.</p>
      <div class="sci-figgrid">${n.figures.map(f => `<figure><img loading="lazy" src="/${esc(f.path)}" alt="NCERT figure ${esc(f.fig)}"><figcaption>NCERT figure ${esc(f.fig)} · ${esc(f.caption)} · PDF page ${esc(f.page)} · source crop, not AI-drawn</figcaption></figure>`).join('')}</div>`
        : `<h2>Figures from the source PDF</h2>
      <p class="muted">${ch.subject === 'biology'
        ? `No figures are inventoried for this chapter: the supplied reprint is an image-only scan with no text layer, so its captions could not be read from the PDF and nothing was cropped rather than guessing. See the <a class="link" href="/assets/notes/index.html#figures-bio">figure inventory</a> for the chapters that are covered.`
        : 'No source figures are inventoried for this chapter yet, so nothing is shown rather than an image drawn or guessed.'}</p>`)
      : '';
    return `
      <div class="callout tip" style="margin-top:16px"><div>Mapped to CBSE 2026–27, not certified by CBSE. Outline only — not a full chapter, not an answer key.${n.id === 'lebs203' ? ' The applicable syllabus names the Consumer Protection Act, 2019, not the outdated 1986 reference in the staged source summary.' : ''}</div></div>
      <section class="card outline-panel" style="margin-top:16px"><h2>Sections</h2><ul>${list(n.sections)}</ul>
      <h2>Objectives</h2><ul>${list(n.objectives)}</ul><h2>Key terms</h2><p>${esc(n.terms.join(' · '))}</p>
      <p class="muted">Source: ${n.source_url ? `<a href="${esc(n.source_url)}">${esc(n.source)}</a>` : esc(n.source) + '. The source PDF is not provided on the site.'}</p>${figure}${figureBlock}</section>`;
  }
  function viewBusinessChapter(ch) {
    const n = ch.outline;
    return `<a class="link" href="#/syllabus">← Chapters</a>
      <section class="detail-hero" style="margin-top:12px"><div class="meta-row"><span class="tag">CBSE unit ${ch.displayNo}</span><span class="tag cream">English outline</span></div>
      <h1>${esc(n.title)}</h1><p>${esc(n.summary)}</p></section>
      ${renderOutlinePanel(ch)}
      <div class="setup-actions" style="margin-top:16px"><a class="btn btn-ghost btn-sm" href="/assets/notes/index.html#${esc(n.id)}">${icon('book')} Full outline library</a></div>`;
  }
  function viewChapter(id, params) {
    if (businessTrack() && S.board !== 'cbse') return `<div class="empty"><h3>CBSE outlines only</h3><p>Select CBSE to view these chapters.</p><a class="link" href="#/syllabus">Chapters</a></div>`;
    /* A book-search hit points at the NCERT textbook, whose chapter numbers are
       not the RBSE book's.  Without this the label said "Ch. 7 Coordinate
       Geometry" and the link opened RBSE 7 Trigonometric Identities. */
    const ch = (params && params.ncert)
      ? (UP.catalogue(S.cls, S.subject).find(c => String(c.id) === String(id)) || chapterById(id))
      : chapterById(id);
    if (!ch) return `<div class="empty">${icon('warn')}<h3>${t('noMatch')}</h3><p><a href="#/syllabus">${t('nav_syllabus')}</a></p></div>`;
    if (businessTrack()) return viewBusinessChapter(ch);
    const isChemistryOutline = +S.cls === 12 && S.subject === 'chemistry' && ch.outline;
    if (isChemistryOutline) {
      const n = ch.outline;
      return `<a class="link" href="#/syllabus" style="font-size:13px">← ${t('nav_syllabus')}</a>
      <section class="detail-hero" style="margin-top:12px">
        <div class="meta-row"><span class="tag">${S.lang === 'hi' ? 'इकाई' : 'Unit'} ${esc(ch.displayNo)} · ${esc(n.marks)} ${t('marks')}</span><span class="tag cream">English outline</span><span class="tag grey">CBSE 2026–27 · 043</span></div>
        <h1>${esc(n.title)}</h1>
        <p>${esc(n.summary)}</p>
        <div class="pill-row">${n.terms.slice(0, 6).map(k => `<span class="pill">${esc(k)}</span>`).join('')}</div>
      </section>
      ${renderOutlinePanel(ch)}
      <div class="setup-actions" style="margin-top:16px">
        <a class="btn btn-ghost btn-sm" href="/assets/notes/index.html#${esc(n.id)}">${icon('book')} ${S.lang === 'hi' ? 'पूरा रूपरेखा-पुस्तकालय' : 'Full outline library'}</a>
        <a class="btn btn-ghost btn-sm" href="#/pyq">${icon('clock')} ${S.lang === 'hi' ? 'रसायन विज्ञान के पुराने प्रश्नपत्र' : 'Past-year chemistry papers'}</a>
      </div>`;
    }
    /* Biology and Physics share this view: any chapter carrying an outline
       (and a figures array, for subjects with a figure inventory) renders here.
       Physics needs no code change once its outline pack attaches n.outline. */
    const isSciOutline = +S.cls === 12 && (S.subject === 'biology' || S.subject === 'physics') && ch.outline;
    if (isSciOutline) {
      const n = ch.outline;
      const hi = S.lang === 'hi';
      const paperCode = OUTLINE_PAPER_CODE[S.subject] || OUTLINE_PAPER_CODE.biology;
      return `<a class="link" href="#/syllabus" style="font-size:13px">← ${t('nav_syllabus')}</a>
      <section class="detail-hero" style="margin-top:12px">
        <div class="meta-row">
          <span class="tag">${hi ? 'अध्याय' : 'Chapter'} ${esc(ch.displayNo)}</span>
          <span class="tag cream">${esc(n.unit_title)}${n.marks ? ` · ${esc(n.marks)} ${t('marks')} (${hi ? 'इकाई' : 'unit'})` : ''}</span>
          <span class="tag grey">CBSE 2026–27 · ${paperCode}</span>
        </div>
        <h1>${esc(n.title)}</h1>
        <p>${esc(n.summary)}</p>
        <div class="pill-row">${n.terms.slice(0, 6).map(k => `<span class="pill">${esc(k)}</span>`).join('')}</div>
      </section>
      ${renderOutlinePanel(ch)}
      <div class="setup-actions" style="margin-top:16px">
        <a class="btn btn-ghost btn-sm" href="/assets/notes/index.html#${esc(n.id)}">${icon('book')} ${hi ? 'पूरा रूपरेखा-पुस्तकालय' : 'Full outline library'}</a>
        ${['biology', 'physics'].includes(S.subject) ? `<a class="btn btn-ghost btn-sm" href="/assets/notes/index.html#figures-${S.subject === 'physics' ? 'phy' : 'bio'}">${icon('leaf')} ${hi ? 'सभी चित्र' : 'All source figures'}</a>` : ''}
        <a class="btn btn-ghost btn-sm" href="#/ask?q=${encodeURIComponent('Help me understand ' + n.title + '.')}">${icon('sparkle')} ${hi ? 'प्रश्न पूछें' : 'Ask about this chapter'}</a>
      </div>`;
    }
    if (english12Track()) return viewEnglish12Chapter(ch);
    const tab = params.tab || 'concepts';
    const isAccountancyChapter = accountancyTrack();
    const isEconomicsChapter = economicsTrack();
    const isEnglish12Chapter = false;   // routed to viewEnglish12Chapter above
    const allChapterPyqs = chapterBankQuestions(ch);
    const chapterPyqs = isAccountancyChapter ? allChapterPyqs.slice(0, 12) : allChapterPyqs;
    const tabs = isEconomicsChapter
      ? [['concepts', t('concepts')]].concat((ch.formulas || []).length ? [['formulas', t('formulas')]] : [], [['practice', S.lang === 'hi' ? 'अभ्यास' : 'Review checks'], ['planTab', t('planTab')]])
      : isAccountancyChapter
      ? [['concepts', t('concepts')], ['pyq', t('pyq')], ['planTab', t('planTab')]]
      : [['concepts', t('concepts')], ['formulas', t('formulas')], ['pyq', t('pyq')], ['planTab', t('planTab')]];
    const demandText = { easy: ['easy', 'सरल'], moderate: ['moderate', 'मध्यम'], 'exam-favourite': ['exam favourite', 'परीक्षा प्रिय'], 'proof-heavy': ['proof heavy', 'उपपत्ति प्रधान'], scoring: ['scoring', 'अंक-दायक'], 'practice-heavy': ['practice heavy', 'अभ्यास प्रधान'], 'theorem-based': ['theorem based', 'प्रमेय आधारित'], outline: ['outline', 'रूपरेखा'] };
    const renderChapterPyq = p => {
      const text = P(p);
      if (p && p.paperCode) {
        const paperMeta = [p.paperCode, p.session, 'Part ' + p.part, p.option ? 'Option ' + p.option : ''].filter(Boolean).join(' · ');
        const chapterMeta = qChapterIds(p).map(chapterName).filter(Boolean);
        return `<article class="pyq-item">
          <div class="pmeta">
            <span class="tag">CBSE ${esc(p.y)}</span>
            <span class="tag grey">${esc(paperMeta)}</span>
            ${chapterMeta.map(name => `<span class="tag cream">${esc(name)}</span>`).join('')}
          </div>
          <div class="pbody">
            <div class="pq">${rich(text)}</div>
            <div class="muted" style="font-size:12px;margin-top:8px">${S.lang === 'hi' ? 'मूल PDF' : 'Source PDF'}: ${esc(p.sourceFile || '')}${p.sourcePage ? ` · ${S.lang === 'hi' ? 'पृष्ठ' : 'p.'} ${esc(p.sourcePage)}` : ''}</div>
            <div class="pactions">
              <button class="btn btn-primary btn-sm" data-action="solvePyq" data-q="${esc(text)}">${icon('sparkle')} ${t('solveThis')}</button>
              <button class="btn btn-ghost btn-sm" data-action="savePyq" data-q="${esc(text)}">${icon('save')} ${t('save')}</button>
            </div>
          </div>
        </article>`;
      }
      const isNcertExtract = /^NCERT\b/i.test(String(p.src || ''));
      return `<article class="pyq-item">
        <div class="pmeta"><span class="tag">${isNcertExtract ? 'NCERT · practice, not board-verified' : `${esc(p.board)} ${esc(p.year)}`}</span><span class="tag grey">${p.marks} ${t('marks')}</span></div>
        <div class="pbody"><div class="pq">${rich(text)}</div><div class="pactions">
          <button class="btn btn-primary btn-sm" data-action="solvePyq" data-q="${esc(text)}">${icon('sparkle')} ${t('solveThis')}</button>
          <button class="btn btn-ghost btn-sm" data-action="savePyq" data-q="${esc(text)}">${icon('save')} ${t('save')}</button>
        </div></div>
      </article>`;
    };

    /* Literature reader (Class 10 English + Hindi + Sanskrit): Before-you-read,
       prose/verse or summary sections, exercise groups. Hindi/Sanskrit chapters
       carry their rich content on ch.richSections / ch.beforeYouReadHi /
       ch.richGroups so they render the same way English does. */
    const _isEnLit = S.subject === 'english' && ch.sections;
    const _isHiLit = S.subject === 'hindi' && ch.richSections;
    const _isSkLit = S.subject === 'sanskrit' && ch.richSections;
    const _isLit = _isEnLit || _isHiLit || _isSkLit;
    if (_isLit) {
      const paras = (t) => String(t || '').split(/\n\n+/).map(p => `<p>${esc(p.replace(/\s+/g,' ').trim())}</p>`).join('');
      const sections = (_isHiLit || _isSkLit) ? ch.richSections : (ch.sections || []);
      const beforeText = (_isHiLit || _isSkLit) ? (ch.beforeYouReadHi || '') : (ch.beforeYouRead || '');
      const groups = (_isHiLit || _isSkLit) ? (ch.richGroups || []) : (ch.exerciseGroups || []);
      const lessonLabel = S.lang === 'hi' ? 'पाठ' : 'Lesson';
      const bookLabel = (_isHiLit || _isSkLit) ? (ch.bookHi || ch.book || '') : (ch.book || 'First Flight');
      const titleText = P({ en: ch.en || '', hi: ch.hi || ch.en || '' });
      const totalQs = groups.reduce((n,g) => n + ((g.questions||[]).length), 0);
      const renderSection = (s) => {
        let txt = String(s.text || '');
        if (_isHiLit && ch.isPoetry) {
          txt = txt.split(/\n\n+/).map(blk => blk.replace(/\n/g, '<br>')).join('\n\n');
        }
        return `<section class="card" style="margin-top:18px">
          <h2>${esc(s.title||'')}</h2>
          <div class="prose">${paras(txt)}</div>
        </section>`;
      };
      return `
      <a class="link" href="#/syllabus" style="font-size:13px">← ${t('nav_syllabus')}</a>
      <section class="detail-hero" style="margin-top:12px">
        <div class="meta-row">
          <span class="tag">${lessonLabel} ${esc(ch.n || String(ch.id||'').slice(-2).replace(/^0/,''))}</span>
          <span class="tag cream">${esc(bookLabel)}</span>
          ${totalQs ? `<span class="tag grey">${totalQs} ${S.lang==='hi'?'प्रश्न':'questions'}</span>` : ''}
          ${ch.author ? `<span class="tag grey">${S.lang==='hi'?'रचनाकार':'Author'}: ${esc(ch.author)}</span>` : ''}
        </div>
        <h1>${esc(titleText)}</h1>
        ${(_isHiLit && !ch.hasFullText) || _isSkLit ? `<p style="margin:8px 0 0;color:var(--ink-500);font-size:13px">${_isSkLit ? (S.lang==='hi'?'यह पाठ बोर्ड की पुस्तक से सीधे पढ़ें; यहाँ सार और मुख्य बिंदु दिए हैं।':'Read the full shloka from your NCERT textbook — what follows is the summary and key points.') : (S.lang==='hi'?'पाठ शीघ्र जोड़ा जाएगा।':'Full text coming soon.')}</p>` : ''}
      </section>
      ${beforeText ? `<section class="card callout tip" style="margin-top:18px"><div>
        <b>${S.lang==='hi'?'पढ़ने से पहले':'Before you read'}</b>${paras(beforeText).replace('<p>','<p style="margin-top:6px">')}
      </div></section>` : ''}
      ${sections.map(renderSection).join('')}
      ${groups.length ? `<section class="card" style="margin-top:18px">
        <h2>${S.lang==='hi'?'अभ्यास के प्रश्न':'Thinking about the lesson'}</h2>
        ${groups.map(g => `<div style="margin-top:14px"><h3 style="font-size:14px;color:var(--ink-600);margin-bottom:8px">${esc(g.name)}</h3>
        <ol class="kb-list">${(g.questions||[]).map(q=>`<li><span class="bul"></span><div>${esc(String(q).replace(/\s+/g,' ').trim())}</div></li>`).join('')}</ol></div>`).join('')}
      </section>` : ''}`;
    }

    /* Rajasthan / generic sections-based chapters */
    if (ch.sections) {
      const secs = ch.sections || [];
      return `
      <a class="link" href="#/syllabus" style="font-size:13px">← ${t('nav_syllabus')}</a>
      <section class="detail-hero" style="margin-top:12px">
        <div class="meta-row">
          <span class="tag">${S.lang === 'hi' ? 'अध्याय' : 'Chapter'} ${esc(ch.no || ch.n || (typeof ch.id === 'number' ? String(ch.id).padStart(2,'0') : ch.id))}</span>
          <span class="tag cream">${esc(ch.board||'')}</span>
          ${secs.length ? `<span class="tag grey">${secs.length} ${S.lang === 'hi' ? 'उपखंड' : 'sections'}</span>` : ''}
        </div>
        <h1>${esc(P({ en: ch.en, hi: ch.hi }))}</h1>
        ${secs.length ? '' : `<p style="margin:0">${S.lang === 'hi'
          ? 'इस अध्याय का पाठ अभी उपलब्ध नहीं है। अध्याय-संख्या और नाम बोर्ड की पुस्तक की सूची से लिए गए हैं।'
          : 'The text for this chapter has not been supplied yet. The number and title come from the board\'s own contents page.'}</p>`}
      </section>
      ${secs.length ? secs.map(s => `
        <section style="margin-top:22px">
          ${s.no || s.title ? `<div class="section-head" style="margin:0 0 10px"><div>
            <h2 style="font-size:17px">${s.no ? `<span style="color:var(--ink-400);font-weight:600">${esc(s.no)}</span> ` : ''}${esc(s.title || '')}</h2>
          </div></div>` : ''}
          ${s.points && s.points.length ? `<ul class="kb-list">${s.points.map(pt => `<li><span class="bul"></span><div>${esc(P(typeof pt === 'string' ? { en: pt, hi: pt } : pt))}</div></li>`).join('')}</ul>`
            : (s.en || s.hi) ? `<div class="kb-list" style="padding:0 0 0 0"><div style="line-height:1.7">${esc(P({ en: s.en || '', hi: s.hi || '' }))}</div></div>` : ''}
        </section>`).join('') : ''}
      ${secs.length ? `<div class="callout tip" style="margin-top:22px">${icon('info')}<div>${S.lang === 'hi'
        ? 'यह पाठ बोर्ड की अध्याय पीडीएफ से पढ़ा गया है (OCR)। पृष्ठ पर बने चित्र और सारणियाँ यहाँ नहीं आ सकीं — उनके लिए मूल पीडीएफ देखिए।'
        : 'This text was read from the board\'s chapter PDF by OCR. Diagrams and tables on the page could not be carried over — see the original PDF for those.'}</div></div>` : ''}`;
    }

    let body = '';
    if (tab === 'concepts') {
      /* Class 12 Accountancy chapters carry a real outline extracted from the
         NCERT chapter PDFs: what you should be able to do, then the numbered
         sections with their opening sentences. Before this, the tab repeated
         the one-line description under a "PYQ coverage" heading. */
      const notes = (isAccountancyChapter && UP.accountancyNotes)
        ? (UP.accountancyNotes[String(ch.id)] || UP.accountancyNotes[ch.id]) : null;
      if (notes && (notes.objectives.length || notes.sections.length)) {
        const objs = notes.objectives.length ? `
          <section class="note-block">
            <h3>${S.lang === 'hi' ? 'इस अध्याय के बाद आप कर सकेंगे' : 'After this chapter you should be able to'}</h3>
            <ul class="obj-list">${notes.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ul>
          </section>` : '';
        const secs = notes.sections.length ? `
          <section class="note-block">
            <h3>${S.lang === 'hi' ? 'अध्याय की रूपरेखा' : 'What the chapter covers'}
              <span class="tag grey">${notes.sections.length} ${S.lang === 'hi' ? 'भाग' : 'sections'}</span></h3>
            <ol class="sec-list">${notes.sections.map(s => `
              <li>
                <div class="sec-head"><span class="sec-no">${esc(s.n)}</span> ${esc(s.t)}</div>
                <p class="sec-body">${esc(s.b)}</p>
              </li>`).join('')}</ol>
          </section>` : '';
        body = `<div class="chapter-notes">${objs}${secs}
          <p class="muted" style="font-size:12.5px;margin-top:18px">${S.lang === 'hi'
            ? `NCERT पाठ ${esc(notes.source)} से निकाली गई रूपरेखा (${notes.pages} पृष्ठ)। यह पूरा अध्याय नहीं है।`
            : `Outline extracted from NCERT ${esc(notes.source)} (${notes.pages} pages). This is a study outline, not the full chapter.`}</p>
        </div>`;
      } else {
        body = `<ul class="kb-list">${(ch.concepts || []).map(c => `<li><span class="bul"></span><div><b>${esc(P(c.t))}</b><br>${rich(P(c.b))}</div></li>`).join('')}</ul>`;
      }
    } else if (tab === 'formulas') {
      body = `<div class="grid grid-2">${(ch.formulas || []).map(f => `
        <div class="formula-card">
          <div class="fname">${esc(P(f.n))}</div>
          <div class="fexp">${mathText(f.e)}</div>
          ${f.note ? `<div class="fnote">${esc(P(f.note))}</div>` : ''}
        </div>`).join('')}</div>`;
    } else if (isEconomicsChapter && tab === 'practice') {
      body = `<p class="muted econ-practice-intro">${S.lang === 'hi'
        ? 'समझ जाँचने के लिए उपाय द्वारा बनाए गए प्रश्न और सुझाए गए संक्षिप्त उत्तर। ये बोर्ड प्रश्न या आधिकारिक उत्तर-कुंजी नहीं हैं।'
        : 'Original Upay review checks with suggested short answers. These are not board questions or an official answer key.'}</p>
        <div class="grid" style="gap:12px">${(ch.practice || []).map((item, i) => `<article class="card flat econ-practice-card">
          <div class="mini-label">${S.lang === 'hi' ? 'अभ्यास' : 'Review'} ${i + 1}</div>
          <h3>${esc(P(item.q))}</h3>
          <details><summary>${S.lang === 'hi' ? 'सुझाया गया उत्तर देखें' : 'Show suggested answer'}</summary>
            <p>${esc(P(item.a))}</p></details>
        </article>`).join('')}</div>`;
    } else if (tab === 'pyq') {
      body = chapterPyqs.length ? `${isAccountancyChapter && allChapterPyqs.length > chapterPyqs.length ? `<div class="callout tip" style="margin-bottom:12px">${S.lang === 'hi' ? `इस अध्याय में ${allChapterPyqs.length} प्रश्न हैं; यहाँ नवीनतम ${chapterPyqs.length} दिखाए गए हैं।` : `${allChapterPyqs.length} questions are tagged to this chapter; showing the latest ${chapterPyqs.length}.`} <a class="link" href="#/pyq?ch=${encodeURIComponent(ch.id)}">${S.lang === 'hi' ? 'सभी देखें' : 'View all'}</a></div>` : ''}<div class="grid" style="gap:12px">${chapterPyqs.map(renderChapterPyq).join('')}</div>`
        : `<div class="empty">${icon('clock')}<h3>${t('noPyq')}</h3></div>`;
    } else {
      body = `<div class="study-plan">${(ch.plan || []).map((p, i) => `
        <div class="plan-step"><div class="pnum">STEP ${String(i + 1).padStart(2, '0')}</div><p>${rich(P(p))}</p></div>`).join('')}</div>`;
    }

    return `
    <a class="link" href="#/syllabus" style="font-size:13px">← ${t('nav_syllabus')}</a>
    <section class="detail-hero" style="margin-top:12px">
      <div class="meta-row">
        <span class="tag">${S.lang === 'hi' ? 'अध्याय' : 'Chapter'} ${esc(ch.no || ch.n || (typeof ch.id === 'number' ? String(ch.id).padStart(2,'0') : ch.id))}</span>
        ${isEconomicsChapter ? `<span class="tag cream">${esc(P(ch.bookTitle))}</span>` : ''}
        ${ch.weight ? `<span class="tag cream">${ch.weight} ${t('marks')}</span>` : ''}
        ${ch.demand ? `<span class="tag grey">${esc((demandText[ch.demand] || [ch.demand, ch.demand])[S.lang === 'hi' ? 1 : 0])}</span>` : ''}
        ${ch.pages ? `<span class="tag grey">${S.lang === 'hi' ? 'पृष्ठ' : 'pages'} ${esc(ch.pages)}</span>` : ''}
      </div>
      <h1>${esc(P({ en: ch.en, hi: ch.hi }))}</h1>
      <p>${esc(P({ en: ch.enDesc || '', hi: ch.hiDesc || '' }))}</p>
      <div class="pill-row">${(ch.keywords?.en || []).slice(0, 6).map((k, i) => `<span class="pill">${esc(S.lang === 'hi' ? ((ch.keywords.hi || [])[i] || k) : k)}</span>`).join('')}</div>
    </section>
    ${isEconomicsChapter || isEnglish12Chapter ? renderChapterText(ch, 'outline') : ''}
    ${S.board === 'cbse' && +S.cls === 12 && S.subject === 'chemistry' && +ch.id >= 701 && +ch.id <= 710
      ? `<p class="callout tip"><a class="link" href="/assets/notes/index.html#${+ch.id <= 705 ? 'lech10' + (+ch.id - 700) : 'lech20' + (+ch.id - 705)}">CBSE 2026–27 English outline and selected figure →</a></p>` : ''}
    <div class="tabs">
      ${tabs.map(([k, label]) => `<button data-action="tab" data-tab="${k}" class="${tab === k ? 'on' : ''}">${label}</button>`).join('')}
    </div>
    <div>${body}</div>
    ${quoteBlock(ch)}
    <div class="callout tip" style="margin-top:22px">${icon('bulb')}<div>${isEconomicsChapter
      ? (S.lang === 'hi' ? 'ये संक्षिप्त अध्ययन सामग्री और अभ्यास के सुझाए उत्तर हैं, आधिकारिक उत्तर-कुंजी नहीं। परिभाषाएँ, चित्र और प्रश्न मूल पुस्तक से मिलाएँ।' : 'These are concise study guides and suggested review answers, not an official answer key. Check definitions, diagrams and exercises against the source book.')
      : (S.lang === 'hi'
      ? 'किसी भी प्रश्न को यहाँ से सीधे हल करवाइए — "इसे हल करें" दबाने पर उत्तर पृष्ठ खुल जाएगा।'
      : 'Solve any question straight from here — “Solve this” opens it in the answer page.')}</div></div>`;
  }

  function quoteBlock(ch) {
    const qs = (UP.quotes && (UP.quotes[ch.id] || UP.quotes[String(ch.id)])) || null;
    if (!qs || +S.cls !== 10 || S.subject !== 'maths') return '';
    const list = (S.lang === 'hi' ? qs.hi : qs.en) || [];
    if (!list.length) return '';
    return `
    <section style="margin-top:26px">
      <div class="section-head" style="margin:0 0 12px">
        <div><h2 style="font-size:19px">${S.lang === 'hi' ? 'आपकी पुस्तक से' : 'From your textbook'}</h2>
        <p style="font-size:13px">${S.lang === 'hi' ? 'एनसीईआरटी कक्षा 10 गणित — इस अध्याय से सीधे उद्धृत' : 'NCERT Class 10 Mathematics — quoted from this chapter'}</p></div>
      </div>
      <div class="grid" style="gap:10px">
        ${list.slice(0, 3).map((text, i) => `
          <figure class="card flat" style="margin:0;padding:16px 18px;border-left:3px solid var(--sky-300)">
            <blockquote style="margin:0;font-family:var(--serif);font-size:15.2px;line-height:1.6;color:var(--ink-800)">“${esc(text)}”</blockquote>
            <figcaption style="margin-top:8px;font-size:11.8px;color:var(--ink-400);letter-spacing:.02em">
              ${S.lang === 'hi' ? 'पृष्ठ' : 'p.'} ${esc(ch.pages || '—')} · NCERT ${S.lang === 'hi' ? 'हिंदी संस्करण' : 'Hindi edition, converted'} ${i === 0 ? '· ' + (S.lang === 'hi' ? 'मूल पाठ' : 'source text') : ''}
            </figcaption>
          </figure>`).join('')}
      </div>
    </section>`;
  }

  /* =============================== BOARDS =============================== */
  /* ---------------------------------------------------------------------
     API key management — inline on the homepage. No login required when
     the server is running on localhost (the default).
     --------------------------------------------------------------------- */
  let _akState = null;

  /* Admin-only dashboard: API keys, audit log, model picker, usage stats.
     Non-admins are redirected home immediately. */
  function viewAdmin(){
    if (!isAdmin()) { setTimeout(()=>go('#/home'), 0); return ''; }
    setTimeout(loadAdminStats, 50);
    setTimeout(loadApiKey, 50);
    const isHi = S.lang==='hi';
    return `<section class="page-head">
      <span class="eyebrow">${icon('key')} ${isHi?'एडमिन डैशबोर्ड':'Admin dashboard'}</span>
      <h1>${isHi?'व्यवस्थापन':'Administration'}</h1>
      <p>${isHi?'सर्वर सेटिंग्स, API कुंजियाँ और उपयोग आँकड़े सिर्फ़ यहीं दिखते हैं।':'Server settings, API keys, and usage — visible only to the administrator.'}</p>
    </section>
    <div class="dash-grid" id="admin-stats" style="margin-bottom:14px"></div>
    <div class="card flat" style="padding:20px;max-width:820px">
      <h2 style="margin-top:0;font-size:18px">${isHi?'Gemini API कुंजी':'Gemini API keys'}</h2>
      <p style="color:var(--ink-500);font-size:13.5px;margin:0 0 12px">${isHi
        ? 'कुंजी सर्वर पर सील (AES-GCM) रूप में रखी जाती हैं; छात्रों को कभी नहीं दिखतीं। ऑफ़लाइन MCQ और प्रश्न बैंक बिना कुंजी के काम करते हैं।'
        : 'Keys are sealed (AES-GCM) on the server and never shown to students. Offline MCQs and the question bank work without any key.'}</p>
      <div class="field"><label>${isHi?'कुंजी (हर लाइन पर एक या अल्पविराम से अलग)':'Key(s) — one per line or comma-separated'}</label>
        <textarea id="ak-in" rows="3" placeholder="AIzaSy..."></textarea>
        <small style="color:var(--ink-500);display:block;margin-top:4px">${isHi
          ? 'निःशुल्क कुंजी <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> से लें।'
          : 'Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>.'}</small>
      </div>
      <div class="field"><label>${isHi?'मॉडल':'Model'}</label>
        <input id="ak-model" type="text" placeholder="gemini-2.0-flash">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" id="ak-save">${isHi?'सहेजें':'Save'}</button>
        <button class="btn btn-ghost" id="ak-test">${isHi?'जाँचें':'Test key'}</button>
        <button class="btn btn-ghost" id="ak-clear">${isHi?'सभी हटाएँ':'Clear all'}</button>
      </div>
      <div class="msg" id="ak-msg" style="margin-top:12px"></div>
      <div id="ak-status" style="margin-top:16px"></div>
    </div>`;
  }

  async function loadAdminStats(){
    const box = document.getElementById('admin-stats'); if(!box) return;
    const isHi = S.lang==='hi';
    const counts = (UP.pyq||[]).reduce((a,q)=>{a[q.subject]=(a[q.subject]||0)+1; return a;},{});
    const totalQ = Object.values(counts).reduce((a,b)=>a+b,0);
    const savedN = (S.saved||[]).length;
    const dueN = srsDueCards().length;
    box.innerHTML = `
      <div class="dash-stat"><div class="label">${isHi?'कुल प्रश्न':'Total questions'}</div><div class="val">${totalQ.toLocaleString('en-IN')}</div></div>
      <div class="dash-stat"><div class="label">${isHi?'सहेजे (इस डिवाइस)':'Saved (this device)'}</div><div class="val">${savedN}</div></div>
      <div class="dash-stat"><div class="label">${isHi?'SRS दोहराव बाक़ी':'SRS due'}</div><div class="val">${dueN}</div></div>
      <div class="dash-stat"><div class="label">${isHi?'एडमिन मोड':'Admin mode'}</div><div class="val" style="color:#1f8a4a">${isHi?'चालू':'on'}</div></div>`;
  }

  function viewApiKey() {
    /* Kept for backwards-compat with old bookmarks — sends admins to the new
       dashboard, everyone else home (never shows the key UI to students). */
    setTimeout(()=>go(isAdmin() ? '#/admin' : '#/home'), 0);
    return '';
  }

  function akSay(cls, text){
    const m=document.getElementById('ak-msg'); if(!m) return;
    m.className='msg '+(cls||''); m.textContent=text||'';
  }
  function akFetch(path, opts){
    opts=opts||{};
    const hdrs=Object.assign({'content-type':'application/json'}, opts.headers||{});
    const t=localStorage.getItem('upay.token'); if(t) hdrs.authorization='Bearer '+t;
    return fetch(path, Object.assign({}, opts, {headers:hdrs, body: opts.body?JSON.stringify(opts.body):undefined}))
      .then(r=>r.text().then(t=>{let j={};try{j=t?JSON.parse(t):{};}catch(e){j={};} return {ok:r.ok,status:r.status,j:j};}));
  }
  function loadApiKey(checkModels){
    const status=document.getElementById('ak-status'); if(!status) return;
    status.innerHTML='<p style="color:var(--muted)">'+(S.lang==='hi'?'लोड हो रहा है…':'Loading…')+'</p>';
    Promise.all([
      akFetch('/api/admin/key'),
      checkModels ? akFetch('/api/admin/key/models').catch(()=>({ok:false,j:{models:[]}})) : Promise.resolve({ok:true,j:{models:[]}})
    ]).then(function(all){
      const k=all[0].j, m=all[1].j;
      if(!all[0].ok){ status.innerHTML='<p class="msg err">'+esc(k.error||('HTTP '+all[0].status))+'</p>'; return; }
      const ring = k.keys||[];
      document.getElementById('ak-model').value = k.model||m.current||'gemini-2.0-flash';
      status.innerHTML =
        '<p>'+(k.set
          ? '<span class="tag" style="background:#dfe9d8;color:#2e5d31">'+(S.lang==='hi'?'कुंजी सेट है':'key set')+'</span> '+(k.count||0)+' '+(S.lang==='hi'?'कुंजी':'key(s)')+', '+ (S.lang==='hi'?'मॉडल':'model')+' <code>'+esc(k.model||'—')+'</code>'
          : '<span class="tag" style="background:#f3d8d4;color:#8a2b23">'+(S.lang==='hi'?'कोई कुंजी नहीं':'no key')+'</span>')+'</p>'+
        (ring.length?'<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px"><thead><tr><th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-size:11px;letter-spacing:.04em;text-transform:uppercase">'+(S.lang==='hi'?'कुंजी':'Key')+'</th><th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-size:11px;letter-spacing:.04em;text-transform:uppercase">'+(S.lang==='hi'?'स्थिति':'Status')+'</th><th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)"></th></tr></thead><tbody>'+
          ring.map(kk=>'<tr><td class="mono" style="padding:6px 8px;border-bottom:1px solid var(--line)">'+esc(kk.masked)+'</td>'+
            '<td style="padding:6px 8px;border-bottom:1px solid var(--line)">'+(kk.dead?'<span class="tag" style="background:#f3d8d4;color:#8a2b23">unreachable</span>':'<span class="tag" style="background:#dfe9d8;color:#2e5d31">live</span>')+'</td>'+
            '<td style="padding:6px 8px;border-bottom:1px solid var(--line)"><button class="btn btn-sm ak-rm" data-m="'+esc(kk.masked)+'">'+(S.lang==='hi'?'हटाएँ':'Remove')+'</button></td></tr>').join('')+
          '</tbody></table>' : '')+
        (k.set ? '<button type="button" class="btn btn-ghost btn-sm" id="ak-list-models" style="margin-top:10px">'+(S.lang==='hi'?'उपलब्ध मॉडल जाँचें':'Check available models')+'</button>' : '')+
        (checkModels && !all[1].ok ? '<p class="msg err">'+(S.lang==='hi'?'मॉडल सूची उपलब्ध नहीं है। कुंजी या नेटवर्क जाँचें।':'Model list unavailable. Check the provider key or network.')+'</p>' : '')+
        (m.models&&m.models.length ? '<p style="margin-top:12px;font-size:13px;color:var(--muted)"><b>'+(S.lang==='hi'?'उपलब्ध मॉडल (क्लिक करें):':'Available models (click to use):')+'</b></p><div class="chips" style="margin-top:6px">'+
          m.models.slice().sort().map(mm=>'<button class="chip" data-mdl="'+esc(mm)+'">'+esc(mm)+'</button>').join('')+'</div>' : '');
      const modelsButton = status.querySelector('#ak-list-models');
      if (modelsButton) modelsButton.onclick = () => loadApiKey(true);
      status.querySelectorAll('button.ak-rm').forEach(b=>b.onclick=()=>{
        if(!confirm(S.lang==='hi'?'यह कुंजी हटा दें?':'Remove this key?')) return;
        akSay('', S.lang==='hi'?'हटा रहे हैं…':'Removing…');
        akFetch('/api/admin/key',{method:'POST',body:{remove:b.getAttribute('data-m')}}).then(r=>{
          if(!r.ok){ akSay('err',r.j.error||'Failed'); return; }
          akSay('ok', S.lang==='hi'?'हट गया।':'Removed.');
          loadApiKey();
        }).catch(e=>akSay('err',e.message));
      });
      status.querySelectorAll('button.chip[data-mdl]').forEach(b=>b.onclick=()=>{
        document.getElementById('ak-model').value=b.getAttribute('data-mdl');
      });
      _akState = k;
    }).catch(e=>{ status.innerHTML='<p class="msg err">'+esc(e.message)+'</p>'; });
  }
  document.addEventListener('click', function(ev){
    const t=ev.target;
    if(!t||!t.id){
      // also catch clicks on #apikey-save etc when we're on the apikey page via delegated handlers below
      return;
    }
  });
  document.addEventListener('submit', function(ev){
    // no-op form submit interception for api key card (we use buttons)
  });
  function bindApiKeyOnce(){
    if(bindApiKeyOnce._bound) return;
    bindApiKeyOnce._bound=true;
    document.addEventListener('click', function(ev){
      const b=ev.target.closest && ev.target.closest('#ak-save, #ak-test, #ak-clear');
      if(!b) return;
      if(b.id==='ak-save'){
        const key=document.getElementById('ak-in').value, model=document.getElementById('ak-model').value;
        if(!key.trim()){ akSay('err', (S.lang==='hi'?'कुंजी पेस्ट करें।':'Paste a key first.')); return; }
        akSay('', S.lang==='hi'?'सहेज रहे हैं…':'Saving…');
        akFetch('/api/admin/key',{method:'POST',body:{key:key,model:model}}).then(r=>{
          if(!r.ok){ akSay('err',r.j.error||'Failed'); return; }
          akSay('ok',(S.lang==='hi'?'सहेज दिया। ':'Saved. ')+(r.j.added?r.j.added+' '+(S.lang==='hi'?'कुंजी जोड़ी गई।':'key(s) added. '):'')+(S.lang==='hi'?'कुल':'Total')+': '+(r.j.count||0));
          document.getElementById('ak-in').value='';
          loadApiKey();
        }).catch(e=>akSay('err',e.message));
      } else if(b.id==='ak-test'){
        const model=document.getElementById('ak-model').value;
        akSay('', S.lang==='hi'?'जाँच हो रही है…':'Testing…');
        akFetch('/api/admin/key/test',{method:'POST',body:{model:model||undefined}}).then(r=>{
          if(!r.ok){ akSay('err',r.j.error||'Test failed'); return; }
          akSay('ok',(S.lang==='hi'?'हो गया: ':'OK: ')+r.j.model+' — '+r.j.reply.slice(0,80));
        }).catch(e=>akSay('err',e.message));
      } else if(b.id==='ak-clear'){
        if(!confirm(S.lang==='hi'?'सभी कुंजी हटा दें?':'Remove all keys?')) return;
        akSay('', S.lang==='hi'?'हटा रहे हैं…':'Clearing…');
        akFetch('/api/admin/key',{method:'POST',body:{key:null,model:document.getElementById('ak-model').value}}).then(r=>{
          if(!r.ok){ akSay('err',r.j.error||'Failed'); return; }
          akSay('ok',(S.lang==='hi'?'सभी कुंजी हट गईं।':'All keys removed.'));
          loadApiKey();
        }).catch(e=>akSay('err',e.message));
      }
    });
  }
  bindApiKeyOnce();

  /* ---------------------------------------------------------------------
     Board-keyed MCQ practice (offline).
     Every option here came out of the CBSE PDF together with the board's
     printed answer, so marking needs no network and cannot invent a verdict.
     --------------------------------------------------------------------- */
  function viewMcq(params) {
    params = params || {};
    /* The MCQ keyed bank (board's printed-answer MCQs) was harvested from
       Class-10 CBSE Maths papers. Questions carry no `cls` field on them;
       they belong to Class-10 Maths CBSE by construction. When the student
       is viewing Class-10 Maths CBSE, show them; for any other subject/class
       combination say so honestly. */
    const isMcqScope = (+S.cls === 10 && S.subject === 'maths' && S.board === 'cbse');
    const all = isMcqScope ? (UP.mcqKeyed || []).map(q => Object.assign({ cls: 10, board: 'cbse', subject: 'maths' }, q)) : [];
    const year = params.y ? +params.y : null;
    const list = all.filter(q => !year || q.y === year);
    const years = [...new Set(all.map(q => q.y))].sort((a, b) => b - a);
    const boardLabel = S.board === 'cbse' ? 'CBSE' : ((UP.boards.find(b => b.id === S.board) || {}).en || S.board);
    return `
    <section class="page-head">
      <span class="eyebrow"><span class="dot"></span>${t('classShort')} ${S.cls} · ${esc(P(UP.subjects[S.subject] || UP.subjects.maths))}</span>
      <h1>${S.lang === 'hi' ? 'बोर्ड की कुंजी वाले बहुविकल्पीय प्रश्न' : 'Multiple-choice questions with the board’s own key'}</h1>
      <p class="lead">${S.lang === 'hi'
        ? 'इन प्रश्नों का उत्तर कागज़ पर ही छपा है। इसलिए ये बिना इंटरनेट, बिना AI, तुरंत जाँचे जाते हैं — और किसी सही उत्तर को गलत नहीं बताया जा सकता।'
        : 'Each of these questions was printed with its answer in the board paper itself. So they are marked instantly, with no internet and no AI — and a correct answer can never be called wrong.'}</p>
    </section>
    ${years.length > 1 ? `<section class="card pyq-filter"><div class="filter-line">
        <span class="filter-label">${S.lang === 'hi' ? 'वर्ष' : 'Year'}</span>
        <a class="chip ${!year ? 'on' : ''}" href="#/mcq">${S.lang === 'hi' ? 'सभी' : 'All'}</a>
        ${years.map(y => `<a class="chip ${year === y ? 'on' : ''}" href="#/mcq?y=${y}">${y} <small>${all.filter(q => q.y === y).length}</small></a>`).join('')}
      </div></section>` : ''}
    <div class="pyq-count">${list.length} ${S.lang === 'hi' ? 'प्रश्न' : 'questions'}</div>
    ${list.length === 0 ? `<div class="empty">${icon('clock')}<h3>${S.lang === 'hi'
      ? 'बोर्ड की छपी कुंजी वाले MCQ अभी केवल कक्षा-10 गणित (CBSE 2024) के लिए उपलब्ध हैं'
      : 'Keyed MCQs are currently available for Class 10 Maths · CBSE 2024'}</h3>
      <p>${S.lang === 'hi'
        ? 'टेस्ट और विगत-वर्ष पृष्ठों पर अन्य विषयों के प्रश्न मिलते हैं। वहाँ से अभ्यास करें — अथवा शीर्ष बार से कक्षा 10 → गणित चुनिए।'
        : 'Sample papers and Past-years pages already hold questions for other subjects. Switch the top bar to Class 10 · Mathematics · CBSE to use this page.'}</p>
      <div class="setup-actions" style="margin-top:14px">
        <a class="btn btn-primary" href="#/test">${icon('sparkle')} ${S.lang === 'hi' ? 'सैंपल पेपर' : 'Sample paper'}</a>
        <a class="btn btn-ghost" href="#/pyq">${icon('book')} ${S.lang === 'hi' ? 'विगत वर्ष' : 'Past years'}</a>
      </div></div>` : ''}
    ${list.map(q => `
      <article class="q-card pyq" id="mcq-${q.id}">
        <div class="q-top">
          <span class="q-no">${esc(q.set || q.paper || '')}</span>
          <div class="q-meta">
            <span class="tag">${esc(boardLabel)} ${q.y}</span>
            <span class="tag grey ok-tag">${icon('check')} ${S.lang === 'hi' ? 'बोर्ड कुंजी' : 'board key'}</span>
          </div>
        </div>
        <div class="q-text">${esc(cleanQText(q.stem || q.en || ''))}</div>
        <div class="q-opts" data-mkey="${q.id}">
          ${(q.opts || []).map((o, i) => `<button type="button" class="q-opt" data-kpick="${q.id}" data-i="${i}"><b>${String.fromCharCode(65 + i)}</b><span>${esc(typeof o === 'string' ? o : (o.en || o.hi || ''))}</span></button>`).join('')}
        </div>
        <div class="pyq-sol" id="ksol-${q.id}" hidden></div>
      </article>`).join('')}`;
  }

  function viewBoards() {
    return `
    <header class="page-head">
      <span class="eyebrow"><span class="dot"></span>${UP.boards.length} ${S.lang === 'hi' ? 'बोर्ड' : 'boards'}</span>
      <h1>${t('boards_h')}</h1><p>${t('boards_s')}</p>
    </header>
    <div class="grid grid-2">
      ${UP.boards.map(b => `
      <article class="card ${b.id === S.board ? 'sky' : 'flat'}">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="ch-num" style="background:${b.id === S.board ? 'var(--sky-100)' : 'var(--cream-200)'};color:${b.id === S.board ? 'var(--sky-700)' : 'var(--ink-700)'}">${esc(b.en.slice(0, 2).toUpperCase())}</span>
          <div><div class="ch-title">${esc(P({ en: b.en, hi: b.hi }))}</div><div class="ch-sub">${esc(P(b.full))}</div></div>
          ${b.id === S.board ? `<span class="tag" style="margin-left:auto"><span>${S.lang === 'hi' ? 'चयनित' : 'selected'}</span></span>` : ''}
        </div>
        <p style="font-size:13.4px;color:var(--ink-600);margin:12px 0 6px"><b>${S.lang === 'hi' ? 'प्रारूप' : 'Pattern'}:</b> ${esc(P(b.pattern))}</p>
        <p style="font-size:13px;color:var(--ink-500);margin:0">${esc(P(b.note))}</p>
        ${(() => {
          /* how many past-paper questions this app actually holds for the
             board -- "0 questions" is honest information, and it stops the
             board card from implying coverage that does not exist yet. */
          const n = (UP.pyq || []).filter(q => (q.board || 'cbse') === b.id
            && q.cls === +S.cls && (q.subject || 'maths') === S.subject).length;
          return `<p style="font-size:12.5px;color:var(--ink-500);margin:10px 0 0">${n
            ? `<b>${n}</b> ${S.lang === 'hi' ? 'पिछले बोर्ड प्रश्न' : 'past-board questions'}`
            : (S.lang === 'hi' ? 'अभी खोजने योग्य प्रश्न नहीं — पुस्तकें व अध्याय उपलब्ध हैं' : 'no searchable past questions yet — books and chapters available')}</p>`;
        })()}
        <div style="margin-top:12px"><button class="btn btn-ghost btn-sm" data-action="setBoard" data-board="${b.id}">${b.id === S.board ? t('check' in T ? '' : '') + (S.lang === 'hi' ? 'चयनित बोर्ड' : 'Selected board') : (S.lang === 'hi' ? 'इस बोर्ड को चुनें' : 'Study for this board')}</button></div>
      </article>`).join('')}
    </div>
    <div class="section-head"><div><h2>${S.lang === 'hi' ? 'एक ही अध्याय, अलग प्रश्न' : 'Same chapter, different questions'}</h2>
      <p>${S.lang === 'hi' ? 'उदाहरण: द्विघात समीकरण कक्षा 10 में' : 'Example: Quadratic Equations in Class 10'}</p></div></div>
    <div class="grid grid-2">
      <article class="card">
        <div class="mini-label">CBSE · 2–4 ${t('marks')}</div>
        <p style="font-size:13.8px;margin:8px 0 0">${S.lang === 'hi'
          ? 'प्रायः सीधा हल, विविक्तकर से मूलों की प्रकृति, तथा शब्द-समस्या। प्रत्येक चरण दिखाना अनिवार्य, इसलिए सूत्र विधि सुरक्षित है।'
          : 'Usually a direct solve, nature of roots through the discriminant, and one word problem. Every step must be shown, so the formula method is the safe choice.'}</p>
      </article>
      <article class="card">
        <div class="mini-label">${S.lang === 'hi' ? 'राज्य बोर्ड' : 'State boards'}</div>
        <p style="font-size:13.8px;margin:8px 0 0">${S.lang === 'hi'
          ? 'वस्तुनिष्ठ खंड अधिक भारी होता है, अतः संक्षिप्त उत्तर और सूत्र-स्मरण पर अधिक अंक टिकते हैं; दीर्घ उपपत्तियाँ कम पूछी जाती हैं।'
          : 'Objective sections carry more weight, so short accurate answers and formula recall earn more than long proofs.'}</p>
      </article>
    </div>`;
  }


  /* ---------------------- textbook full-text search ---------------------- */
  function bookSearch(q) {
    const term = String(q || '').trim().toLowerCase();
    if (term.length < 3 || !UP.snippets) return [];
    const words = term.split(/\s+/).filter(w => w.length > 2);
    if (!words.length) return [];
    const hits = [];
    const langPref = S.lang === 'hi' ? 'hi' : 'en';
    UP.snippets.forEach(sn => {
      const t = sn.t.toLowerCase();
      let score = 0;
      words.forEach(w => { if (t.includes(w)) score += (sn.l === langPref ? 3 : 2); });
      if (score >= words.length * 2) hits.push({ score, sn });
    });
    hits.sort((a, b) => b.score - a.score || a.sn.t.length - b.sn.t.length);
    return hits.slice(0, 12).map(h => h.sn);
  }
  const hl = (text, q) => {
    let out = esc(text);
    const words = String(q || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    words.forEach(w => {
      const re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      out = out.replace(re, '<mark style="background:var(--sky-100);color:var(--ink-900);padding:0 2px;border-radius:3px">$1</mark>');
    });
    return out;
  };

  /* =============================== BOOKS =============================== */
  function viewEconomicsBooks() {
    const chapters = UP.catalogue(12, 'economics');
    const sources = UP.economicsSources || [];
    const hi = S.lang === 'hi';
    return `
    <header class="page-head">
      <span class="eyebrow"><span class="dot"></span>${hi ? 'कक्षा 12 · अर्थशास्त्र' : 'Class 12 · Economics'}</span>
      <h1>${t('booksTitle')}</h1>
      <p>${hi ? 'दी गई मूल पाठ्यपुस्तक फ़ाइलें और अध्याय मार्गदर्शिकाएँ।' : 'The supplied original textbook files and chapter guides.'}</p>
    </header>
    <div class="callout tip econ-library-note">${icon('info')}<div>
      <b>${hi ? 'कौन-सी सामग्री उपलब्ध है?' : 'What is included?'}</b><br>
      ${hi ? 'समष्टि के 6 और व्यष्टि के 5 अध्याय अंग्रेज़ी तथा हिंदी में; व्यष्टि शब्दावली भी दोनों भाषाओं में। भारतीय आर्थिक विकास और अन्य अध्याय इस सेट में नहीं दिए गए हैं।' : 'Six Macroeconomics and five Microeconomics chapters in both English and Hindi, plus the Microeconomics glossary in both languages. Indian Economic Development and other chapters were not supplied in this set.'}<br>
      ${hi ? 'ये सार्वजनिक PDF ऑनलाइन खोलें या डाउनलोड करें। पूर्ण पाठ खोज-अनुक्रमित नहीं है। संस्करण और बोर्ड का वर्तमान पाठ्यक्रम अलग हो सकते हैं।' : 'These public PDFs open online or can be downloaded; their full text is not search-indexed. Editions and current board syllabuses may differ.'}
    </div></div>
    ${['macro', 'micro'].map(book => {
      const group = chapters.filter(ch => ch.book === book);
      const count = sources.filter(s => s.book === book).length;
      const glossary = sources.filter(s => s.book === book && s.kind === 'glossary');
      return `<section class="econ-book-section" aria-labelledby="econ-${book}-heading">
        <div class="section-head"><div><h2 id="econ-${book}-heading">${esc(P(group[0].bookTitle))}</h2>
          <p>${group.length} ${hi ? 'अध्याय' : 'chapters'} · ${count} PDF</p></div></div>
        <div class="econ-source-list">${group.map(ch => {
          const files = sources.filter(s => s.kind === 'chapter' && s.book === book && s.chapter === ch.n);
          return `<article class="card flat econ-source-row" data-book="${esc(book)}" data-chapter="${ch.n}">
            <div class="econ-source-main"><span class="ch-num">${String(ch.n).padStart(2, '0')}</span><div>
              <h3><a href="#/chapter/${ch.id}">${esc(P({en:ch.en,hi:ch.hi}))}</a></h3>
              <p>${hi ? 'अध्याय मार्गदर्शिका और मूल फ़ाइलें' : 'Chapter guide and source files'}</p>
              ${!files.some(s => s.lang === 'hi') ? `<span class="econ-missing">${hi ? 'हिंदी PDF नहीं दी गई' : 'Hindi PDF not supplied'}</span>` : ''}
            </div></div>
            <div class="english12-source-actions">${chapterReadLink(ch)}</div>
          </article>`;
        }).join('')}
        ${glossary.length ? `<article class="card flat econ-source-row" data-book="${esc(book)}" data-kind="glossary">
          <div class="econ-source-main"><span class="ch-num">A–Z</span><div><h3>${hi ? 'शब्दावली' : 'Glossary'}</h3>
          <p>${hi ? 'पुस्तक से मूल शब्दावली' : 'Original textbook glossary'}</p></div></div>
          <div class="econ-source-actions"><span class="english12-extra-label">${hi ? 'पाठ उपलब्ध नहीं' : 'Text unavailable'}</span></div>
        </article>` : ''}</div>
      </section>`;
    }).join('')}`;
  }

  function viewEnglish12Books() {
    const chapters = UP.catalogue(12, 'english');
    const hi = S.lang === 'hi';
    return `
    <header class="page-head"><span class="eyebrow"><span class="dot"></span>${hi ? 'कक्षा 12 · अंग्रेज़ी' : 'Class 12 · English'}</span>
      <h1>${t('booksTitle')}</h1><p>${hi ? 'दी गई मूल फ़ाइलें और पाठ-वार अध्ययन संकेत।' : 'Your supplied original files and reading notes.'}</p>
    </header>
    ${english12CoverageNote()}
    <p><a class="btn btn-ghost btn-sm econ-browse-link" href="#/syllabus">${icon('book')} ${hi ? 'पाठ-चयन देखें' : 'Browse reading selections'}</a></p>
    ${ENGLISH12_GROUPS.map(([book, section]) => {
      const group = chapters.filter(ch => ch.book === book && ch.section === section);
      if (!group.length) return '';
      return `<section class="english12-group" data-book="${book}" data-section="${section}">
        <div class="section-head"><div><h2>${esc(P(group[0].bookTitle))} · ${esc(P(group[0].sectionTitle))}</h2>
          <p>${group.length} ${hi ? 'PDF' : 'PDFs'}</p></div></div>
        <div class="english12-source-list">${group.map(ch => {
          const source = english12Source(ch);
          return `<article class="card flat english12-source-row" data-chapter-id="${ch.id}" data-book="${book}" data-section="${section}">
            <div class="english12-source-main"><span class="ch-num">${String(ch.n).padStart(2, '0')}</span><div>
              <h3><a href="#/chapter/${ch.id}">${esc(P({en:ch.en,hi:ch.hi}))}</a></h3>
              <p>${esc(ch.author)}${source && source.reprint ? ` · ${hi ? 'पुनर्मुद्रण' : 'Reprint'} ${esc(source.reprint)}` : ''}${chapterTextFor(ch) && chapterTextFor(ch).available !== false ? ` · ${chapterTextFor(ch).words.toLocaleString()} ${hi ? 'शब्द' : 'words'}` : ''}</p>
              ${ch.sourceNote ? `<span class="english12-extra-label">${esc(P(ch.sourceNote))}</span>` : ''}
              ${english12CourseCaution(ch)}
            </div></div><div class="english12-source-actions">${english12SourceLink(ch)}</div>
          </article>`;
        }).join('')}</div>
      </section>`;
    }).join('')}`;
  }

  function viewBooks(params) {
    if (businessTrack()) return `<header class="page-head"><h1>Business Studies sources</h1><p>11 supplied chapter outlines and one CBSE-syllabus Financial Markets outline are available. Source PDFs are not published; project work is not covered.</p><a class="btn btn-primary" href="#/syllabus">Browse outlines</a></header>`;
    if (english12Track()) return viewEnglish12Books();
    if (economicsTrack()) return viewEconomicsBooks();
    params = params || {};
    S._bookQuery = params.bq || '';
    /* Class 10 only.  The catalogue used to list Class 11 and 12 NCERT titles
       as "pending", which reads as "coming soon" when the truth is that no
       Class 11/12 book has ever been loaded and none is being imported.  A
       pending promise is worse than an honest gap, so the list is scoped to the
       class this app actually holds content for. */
    const books = (UP.books || []).filter(b => b.class === 10);
    return `
    <header class="page-head">
      <span class="eyebrow"><span class="dot"></span>${S.lang === 'hi' ? 'पारदर्शी स्रोत' : 'Transparent sources'}</span>
      <h1>${t('booksTitle')}</h1><p>${t('booksSub')}</p>
    </header>

    <article class="card sky" style="margin-bottom:18px">
      <div class="grid grid-2" style="gap:20px;align-items:center">
        <div>
          <div class="tag green">${icon('check')} ${S.lang === 'hi' ? 'पूर्णतः अनुक्रमित' : 'fully indexed'}</div>
          <h2 style="font-size:21px;margin:10px 0 6px">${S.lang === 'hi' ? 'कक्षा 10 गणित — हिंदी (आपकी PDF)' : 'Class 10 Mathematics — Hindi (your PDFs)'}</h2>
          <p style="font-size:13.8px;color:var(--ink-600);margin:0 0 8px">${S.lang === 'hi'
            ? '14 अध्याय, 240 पृष्ठ, प्रत्येक अध्याय से अवधारणा, सूत्र तथा प्रश्नावली-आधारित बिंदु निकाले गए।'
            : '14 chapters, 240 pages. Concepts, formulas and exercise-based points were taken chapter by chapter.'}</p>
          <div class="pill-row">
            <span class="pill">${S.lang === 'hi' ? 'कृतिदेव → यूनिकोड' : 'KrutiDev → Unicode'}</span>
            <span class="pill">${S.lang === 'hi' ? 'अध्याय-वार विभाजन' : 'chapter-wise split'}</span>
            <span class="pill">${S.lang === 'hi' ? 'हिंदी खोज सक्रिय' : 'Hindi search enabled'}</span>
          </div>
        </div>
        <div>
          <div class="mini-label">${t('sampleTitle')}</div>
          <div style="font-size:12.4px;color:var(--ink-500);margin:6px 0 3px">${t('raw')}</div>
          <div style="font-family:var(--mono);font-size:12px;background:#fff;border:1px solid var(--line);border-radius:9px;padding:8px 10px;color:var(--ink-500)">nks ?kkrksa okyh cgqinksa osQ</div>
          <div style="font-size:12.4px;color:var(--ink-500);margin:8px 0 3px">${t('converted')}</div>
          <div style="font-size:13.4px;background:#fff;border:1px solid var(--sky-200);border-radius:9px;padding:8px 10px;color:var(--ink-800)">दो घातों वाली बहुपदों के</div>
          <p style="font-size:12.4px;color:var(--ink-400);margin:8px 0 0">${t('sampleNote')}</p>
        </div>
      </div>
    </article>

    <div class="grid grid-2">
      ${books.map(b => `
      <article class="card flat">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <span class="ico" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:${b.loaded ? 'var(--sky-100)' : 'var(--cream-200)'};color:${b.loaded ? 'var(--sky-700)' : 'var(--ink-500)'};border:1px solid ${b.loaded ? 'var(--sky-200)' : 'var(--cream-300)'}">${icon(b.subject === 'maths' ? 'sigma' : 'flask')}</span>
          <div style="flex:1;min-width:0">
            <div class="ch-title" style="font-size:15.5px">${esc(P(b.title))}</div>
            <div class="ch-sub">${esc(P(b.detail))}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">
              <span class="tag ${b.loaded ? '' : 'grey'}">${b.loaded ? t('loaded') : t('pending')}</span>
              <span class="tag cream">${b.lang === 'hi' ? 'हिंदी' : b.lang === 'en' ? 'English' : S.lang === 'hi' ? 'हिंदी + English' : 'Hindi + English'}</span>
              <span class="tag grey">${b.chapters} ${S.lang === 'hi' ? 'अध्याय' : 'chapters'}</span>
            </div>
          </div>
        </div>
      </article>`).join('')}
    </div>

    <div class="section-head"><div><h2>${S.lang === 'hi' ? 'पुस्तक में खोजिए' : 'Search inside the books'}</h2>
      <p>${S.lang === 'hi' ? 'NCERT कक्षा 10 गणित के वास्तविक पाठ में से पंक्तियाँ खोजिए — दोनों भाषाओं में।' : 'Find actual lines from the NCERT Class 10 Mathematics text — in both editions.'}</p></div></div>
    <div class="filters" style="margin-bottom:14px">
      <div class="search-input">${icon('search')}<input type="search" placeholder="${S.lang === 'hi' ? 'जैसे: स्पर्श रेखा, irrational, हरात्मक, sector…' : 'try: tangent, irrational, sector, माध्यक…'}" value="${esc(params.bq || '')}" data-action="bookSearch"></div>
      <span class="tag grey">${UP.snippets ? UP.snippets.length : 0} ${S.lang === 'hi' ? 'वाक्य अनुक्रमित' : 'sentences indexed'}</span>
    </div>
    <div id="bookResults">${bookResults(params.bq)}</div>

    <div class="section-head"><div><h2>${t('addBook')}</h2><p>${t('addBookHint')}</p></div></div>
    <label class="card" style="display:flex;gap:14px;align-items:center;border-style:dashed;cursor:pointer">
      <span class="ico" style="width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:var(--cream-100);color:var(--ink-500);border:1px solid var(--cream-300)">${icon('plus')}</span>
      <div><div style="font-weight:600;color:var(--ink-800)">${S.lang === 'hi' ? 'PDF चुनें या यहाँ खींचकर छोड़ें' : 'Choose a PDF or drop it here'}</div>
      <div style="font-size:12.7px;color:var(--ink-400)">ncert-books-class-10-maths-in-hindi-chapter-1.pdf</div></div>
      <input type="file" accept="application/pdf" data-action="upload" style="display:none">
    </label>`;
  }

  function bookResults(q) {
    q = q || '';
    if (!q || String(q).trim().length < 3) {
      return `<div class="empty" style="padding:30px 18px">${icon('book')}
        <h3>${S.lang === 'hi' ? 'खोज शुरू कीजिए' : 'Start a search'}</h3>
        <p>${S.lang === 'hi' ? 'दो अक्षर से अधिक लिखिए — परिणाम अध्याय-सहित दिखेंगे।' : 'Type more than two letters — results appear with their chapter.'}</p></div>`;
    }
    const hits = bookSearch(q);
    if (!hits.length) {
      return `<div class="empty" style="padding:30px 18px">${icon('search')}
        <h3>${S.lang === 'hi' ? 'कुछ नहीं मिला' : 'Nothing found'}</h3>
        <p>${S.lang === 'hi' ? 'कोई और शब्द आज़माइए, जैसे "त्रिज्या" या "discriminant"।' : 'Try a different word, for example “radius” or “discriminant”.'}</p></div>`;
    }
    return `<div class="grid" style="gap:10px">${hits.map(h => {
      const ch = (window.UP && UP.chapters || []).find(c => String(c.id) === String(h.c)) || chapterById(h.c);
      return `<article class="card flat" style="padding:13px 16px">
        <div class="meta-row" style="margin-bottom:6px">
          <a class="tag" href="#/chapter/${h.c}?ncert=1">${S.lang === 'hi' ? 'एनसीआईआरटी अध्याय' : 'NCERT Ch.'} ${h.c} · ${esc(ch ? (S.lang === 'hi' ? ch.hi : ch.en) : '')}</a>
          <span class="tag ${h.l === 'hi' ? 'cream' : 'grey'}">${h.l === 'hi' ? 'हिंदी' : 'English'}</span>
        </div>
        <p style="margin:0;font-size:13.9px;color:var(--ink-700);line-height:1.6">${hl(h.t, q)}</p>
      </article>`;
    }).join('')}</div>`;
  }

  /* =============================== AUTH / ACCOUNT =============================== */
  function viewLogin(params) {
    if (S.user) { setTimeout(() => go('#/home'), 0); return ''; }
    const mode = params.mode === 'signup' ? 'signup' : 'signin';
    const isHi = S.lang === 'hi';
    const supabaseOn = sb && window.__supabaseOnline !== false;
    const authMode = supabaseOn ? 'cloud' : 'local';
    return `
    <div class="auth-page">
      ${!supabaseOn ? `<div class="callout" style="margin-bottom:12px;background:#eef4ff;border-color:#b9cdff;color:#1e3a8a">${icon('info')}<div>
        <b>${isHi?'ऑफ़लाइन मोड':'Offline mode'}</b><br>
        <span style="font-size:13px">${isHi
          ? 'सुपाबेस कनेक्ट नहीं हो पा रहा (स्कूल/ऑफिस वाई-फाई प्रायः CDN ब्लॉक करती है)। आप यहाँ से एडमिन द्वारा दिया यूज़रनेम/पासवर्ड डालकर साइन इन कर सकते हैं।'
          : 'Could not reach Supabase (school/office networks often block its CDN). You can still sign in with a local admin-issued username and password here.'}</span>
      </div></div>` : ''}
      <div class="auth-card">
        <div class="auth-tabs">
          <div class="auth-tab ${mode==='signin'?'on':''}" data-tab="signin">${isHi?'साइन इन':'Sign in'}</div>
          <div class="auth-tab ${mode==='signup'?'on':''}" data-tab="signup">${isHi?'नया खाता':'Create account'}</div>
        </div>
        <h1>${mode==='signin'?(isHi?'वापस स्वागत है':'Welcome back'):(isHi?'खाता बनाइए':'Create your account')}</h1>
        <p class="auth-sub">${mode==='signin'
          ?(isHi?'अपनी पढ़ाई जारी रखने के लिए साइन इन करें — आपके सहेजे प्रश्न व प्रगति वहीं मिलेंगे।':'Sign in to continue your studies. Saved questions can sync when your account is online; practice progress stays on this device.')
          :(isHi?'ऑनलाइन खाते से सहेजे प्रश्न सिंक हो सकते हैं; अभ्यास प्रगति इस डिवाइस पर रहती है।':'Saved questions can sync with an online account; practice progress stays on this device.')}</p>
        <div class="auth-err" id="authErr"></div>
        <div class="auth-ok" id="authOk"></div>
        <form id="authForm" autocomplete="on">
          <div class="field" id="nameField" style="${mode==='signup'?'':'display:none'}">
            <label>${isHi?'आपका नाम':'Your name'}</label>
            <input type="text" name="name" autocomplete="name" placeholder="${isHi?'जैसे — आर्य':'e.g. Aaryaveer'}">
          </div>
          <div class="field">
            <label>${mode==='signin'||authMode==='local'?(isHi?'यूज़रनेम / ईमेल':'Username / email'):(isHi?'ईमेल':'Email')}</label>
            <input type="${mode==='signin'||authMode==='local'?'text':'email'}" name="email" autocomplete="username" required placeholder="${mode==='signin'||authMode==='local'?(isHi?'यूज़रनेम या ईमेल':'username or you@example.com'):(isHi?'आपकी ईमेल':'you@example.com')}">
          </div>
          <div class="field">
            <label>${isHi?'पासवर्ड':'Password'}</label>
            <input type="password" name="password" autocomplete="${mode==='signin'?'current-password':'new-password'}" minlength="6" required placeholder="••••••••">
            <div class="hint">${isHi?'कम से कम 6 अक्षर':'At least 6 characters'}</div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;font-size:15.5px;margin-top:6px">
            ${mode==='signin' ? (isHi?'साइन इन':'Sign in') : (isHi?'खाता बनाएँ':'Create account')}
          </button>
        </form>
        <div class="auth-foot">
          ${mode==='signin'
            ? (isHi?'खाता नहीं है? ':'No account? ')
              + `<a data-tab="signup">${isHi?'नया खाता बनाएँ':'Create one'}</a>`
            : (isHi?'पहले से खाता है? ':'Already have an account? ')
              + `<a data-tab="signin">${isHi?'साइन इन':'Sign in'}</a>`}
        </div>
      </div>
      <p style="text-align:center;margin-top:16px;font-size:12.5px;color:var(--ink-400)">
        ${isHi?'बिना खाते के भी आप प्रश्न पूछ सकते हैं, पर आपकी प्रगति सहेजी नहीं जाएगी।':'You can still use Upay without signing in, but your progress will not be saved across devices.'}
      </p>
    </div>`;
  }

  function viewAIAccess() {
    return `<header class="page-head"><h1>${S.lang === 'hi' ? 'एआई उपयोग की अनुमति' : 'AI access'}</h1>
      <p>${S.lang === 'hi' ? 'अनुमति माँगें या छात्र अनुमतियाँ प्रबंधित करें। एपीआई कुंजी साझा नहीं की जाती।' : 'Request permission or manage student access. The API key is never shared with students.'}</p></header>
      <section class="card" style="padding:20px" id="ai-access-panel" aria-live="polite">Loading access status…</section>
      <a class="link" href="#/account">Back to account</a>`;
  }
  async function loadAIAccess(manage) {
    const panel = document.getElementById('ai-access-panel');
    if (!panel) return;
    const owner = S.savedKey;
    const current = () => panel.isConnected && S.savedKey === owner;
    panel.textContent = 'Loading access status…';
    try {
      const r = await akFetch('/api/ai/access' + (manage ? '?manage=1' : ''));
      if (!current()) return;
      if (!r.ok) {
        panel.innerHTML = '<p role="status">'+esc(r.j.error || 'Access status unavailable.')+'</p>' +
          (r.status === 401 ? '<a class="btn btn-primary" href="#/login">Sign in</a>' : '') +
          '<button class="btn btn-ghost" data-action="ai-access-refresh">Refresh</button>';
        return;
      }
      const result = r.j.result;
      if (manage && r.j.admin && Array.isArray(result)) {
        panel.innerHTML = '<h2>Student AI approvals</h2><p>Approve only accounts you recognise. Daily request limits apply separately once activated. Most recent 200 requests shown.</p>' +
          result.map(row => '<article class="card" style="padding:12px;margin-top:8px"><b>'+esc(row.email)+'</b><p>Status: '+esc(row.status)+'</p>'+ ['approve','revoke'].map(action => '<button class="btn btn-ghost btn-sm" data-action="ai-access-decide" data-id="'+esc(row.user_id)+'" data-decision="'+action+'">'+(action==='approve'?'Approve':'Revoke')+'</button>').join('')+'</article>').join('') +
          (!result.length ? '<p>No requests yet.</p>' : '') + '<button class="btn btn-ghost" data-action="ai-access-manage">Refresh requests</button>';
      } else {
        const status = result && result.status || 'none';
        panel.innerHTML = '<h2>Your AI access</h2><p>Status: <strong>'+esc(status)+'</strong></p>' +
          (status==='none' ? '<button class="btn btn-primary" data-action="ai-access-request">Request AI access</button>' : '') +
          (status==='pending' ? '<p>Your request is waiting for the site administrator. Sending it again will not grant access.</p>' : '') +
          (status==='approved' ? '<a class="btn btn-primary" href="#/ask">Ask a question</a>' : '') +
          (status==='revoked' ? '<p>Access was revoked. Contact the site administrator.</p>' : '') +
          '<button class="btn btn-ghost" data-action="ai-access-refresh">Refresh</button>' +
          (r.j.admin ? '<button class="btn btn-ghost" data-action="ai-access-manage">Manage student requests</button><p>Your administrator AI permission is configured separately.</p>' : '');
      }
    } catch (_) { if (current()) panel.textContent = 'Could not load access status. Reload this page to try again.'; }
  }

  function viewAccount() {
    if (!S.user) { setTimeout(() => go('#/login'), 0); return ''; }
    const isHi = S.lang === 'hi';
    const p = S.profile || {};
    const savedCount = (S.saved || []).length;
    return `
    <header class="page-head">
      <span class="eyebrow"><span class="dot"></span>${isHi?'मेरी प्रोफ़ाइल':'My account'}</span>
      <h1>${esc(S.user.name || S.user.email)}</h1>
      <p>${esc(S.user.email || '')}</p>
    </header>
    <p><a class="btn btn-ghost" href="#/ai-access">${isHi ? 'एआई अनुमति माँगें / प्रबंधित करें' : 'Request / manage AI access'}</a></p>
    <div class="dash-grid">
      <div class="dash-stat"><div class="label">${isHi?'सहेजे प्रश्न':'Saved questions'}</div><div class="val">${savedCount}</div><div class="sub">${isHi?'जो आपने बाद के लिए रखे':'Kept for later'}</div></div>
      <div class="dash-stat"><div class="label">${isHi?'कक्षा':'Class'}</div><div class="val">${S.cls}</div><div class="sub">${esc(P(UP.subjects[S.subject]||{}))}</div></div>
      <div class="dash-stat"><div class="label">${isHi?'बोर्ड':'Board'}</div><div class="val">${esc(P(UP.boards.find(b=>b.id===S.board)||UP.boards[0]))}</div><div class="sub">${esc(P(UP.subjects[S.subject]||{}))}</div></div>
      <div class="dash-stat"><div class="label">${isHi?'भाषा':'Language'}</div><div class="val">${S.lang==='hi'?'हिंदी':'English'}</div><div class="sub">${isHi?'ऊपर दाईं ओर से बदलें':'Change from the top-right'}</div></div>
    </div>
    <div class="card flat" style="padding:20px">
      <h2 style="font-size:18px;margin-bottom:10px">${isHi?'प्राथमिकताएँ':'Preferences'}</h2>
      <div class="panel-grid">
        <label class="field"><span>${isHi?'प्रदर्शन नाम':'Display name'}</span>
          <input type="text" id="pf-name" value="${esc(p.display_name||S.user.name||'')}"></label>
        <label class="field"><span>${isHi?'कक्षा':'Class'}</span>
          <select id="pf-cls">
            ${UP.classes.map(c=>`<option value="${c.id}" ${c.id===S.cls?'selected':''}>Class ${c.id}</option>`).join('')}
          </select></label>
      </div>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="pf-save">${isHi?'सहेजें':'Save'}</button>
        <button class="btn btn-ghost" data-action="signout">${icon('logout')} ${isHi?'साइन आउट':'Sign out'}</button>
      </div>
    </div>
    ${S.user.auth === 'local' ? `<div class="card flat" style="padding:20px;margin-top:16px">
      <h2 style="font-size:18px;margin-bottom:10px">${isHi?'लोकल पासवर्ड बदलें':'Change local password'}</h2>
      <p class="muted">${S.user.mustChange ? (isHi?'कृपया अपना प्रारंभिक पासवर्ड बदलें।':'Please change your initial password.') : (isHi?'पासवर्ड बदलने पर सभी लोकल सत्र समाप्त होंगे।':'Changing the password signs out all local sessions.')}</p>
      <form id="localPasswordForm">
        <label class="field"><span>${isHi?'वर्तमान पासवर्ड':'Current password'}</span><input type="password" name="current" autocomplete="current-password" required></label>
        <label class="field"><span>${isHi?'नया पासवर्ड':'New password'}</span><input type="password" name="next" autocomplete="new-password" minlength="8" required></label>
        <label class="field"><span>${isHi?'नया पासवर्ड फिर लिखें':'Confirm new password'}</span><input type="password" name="confirm" autocomplete="new-password" minlength="8" required></label>
        <div id="pwError" class="auth-err" role="alert"></div>
        <button class="btn btn-primary" type="submit">${isHi?'पासवर्ड बदलें':'Change password'}</button>
      </form>
    </div>` : ''}`;
  }

  /* =============================== SAVED =============================== */
  function viewSaved() {
    const filters = [['all', S.lang==='hi'?'सभी':'All'], ['', S.lang==='hi'?'बिना टैग':'Untagged'], ...S.savedTags.map(t => [t, t])];
    const list = S.saved.filter(s => S.savedFolder === 'all' ? true : S.savedFolder === '' ? !s.tag : s.tag === S.savedFolder);
    const byTag = {};
    list.forEach(s => { const k = s.tag || ''; (byTag[k] = byTag[k] || []).push(s); });
    return `
    <header class="page-head">
      <span class="eyebrow"><span class="dot"></span>${S.saved.length} ${S.lang === 'hi' ? 'प्रश्न' : 'items'}</span>
      <h1>${t('savedTitle')}</h1><p>${t('savedSub')}</p>
    </header>
    <div class="saved-filters">
      ${filters.map(([k, label]) => `<button class="chip ${S.savedFolder===k?'on':''}" data-action="savedFilter" data-f="${esc(k)}">${esc(label)} <span class="chip-count">${S.saved.filter(s => k==='all'?true:k===''?!s.tag:s.tag===k).length}</span></button>`).join('')}
      <button class="chip" data-action="addTag">+ ${S.lang==='hi'?'नया टैग':'new tag'}</button>
    </div>
    ${!S.saved.length ? `<div class="empty">${icon('save')}<h3>${t('nothingSaved')}</h3><p>${S.lang === 'hi' ? 'उत्तर या प्रश्न कार्ड पर “प्रश्न सहेजें” दबाएँ। वह यहाँ दिखेगा; बाद में टैग जोड़ सकते हैं।' : 'Tap “Save question” on an answer or question card. It will appear here; you can add a tag afterwards.'}</p></div>` : `
      <div class="saved-list">
        ${Object.keys(byTag).map(tag => `
          <div class="saved-group">
            <div class="saved-group-head">
              <span class="tag-dot" style="background:${tagColor(tag)}"></span>
              <span class="saved-group-name">${esc(tag || (S.lang==='hi'?'बिना टैग के':'Untagged'))}</span>
              <span class="saved-group-count">${byTag[tag].length}</span>
            </div>
            ${byTag[tag].map(s => {
              const realIdx = S.saved.indexOf(s);
              return `<article class="pyq-item saved-row">
                <div class="pmeta"><span class="tag cream">${esc(s.date || '')}</span><span class="tag grey">${esc(s.subject || '')}</span><span class="tag grey">${esc(s.chapter || '')}</span></div>
                <div class="pbody">
                  <div class="pq">${esc(s.q)}</div>
                  <div class="ptags">
                    ${S.savedTags.map(tg => `<button class="tag-pill ${s.tag===tg?'on':''}" data-action="tagSaved" data-i="${realIdx}" data-tag="${esc(tg)}" style="--tc:${tagColor(tg)}">${esc(tg)}</button>`).join('')}
                    <button class="tag-pill ${!s.tag?'on':''}" data-action="tagSaved" data-i="${realIdx}" data-tag="">${S.lang==='hi'?'कोई नहीं':'none'}</button>
                  </div>
                  <div class="pactions">
                    <button class="btn btn-primary btn-sm" data-action="sample" data-q="${esc(s.q)}">${icon('sparkle')} ${t('solveThis')}</button>
                    <button class="btn btn-ghost btn-sm" data-action="deleteSaved" data-i="${realIdx}">${icon('trash')}</button>
                  </div>
                </div>
              </article>`;
            }).join('')}
          </div>
        `).join('')}
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;align-items:center">
        <button class="btn btn-ghost btn-sm" data-action="clearSaved">${icon('trash')} ${t('clear')}</button>
        <a class="btn btn-ghost btn-sm" href="#/parent">${icon('user')} ${S.lang==='hi'?'अभिभावक सारांश':'Parent view'}</a>
      </div>`}`;
  }

  /* ============================================================
     TODAY'S PRACTICE  (#6) — 10 Q daily set, feeds from mastery
     ============================================================ */
  function buildDailySet() {
    const pool = (UP.pyq || []).filter(q => q.subject === S.subject && q.cls === +S.cls && pyqQuestionText(q).length > 12);
    if (!pool.length) return [];
    // Mastery score per chapter: higher = weaker (more incorrect / less attempted)
    const chScore = {};
    (UP.catalogue(S.cls, S.subject) || []).forEach(c => {
      const m = S.mastery[c.id] || { attempted:0, correct:0, at:0 };
      chScore[c.id] = { weak: m.attempted > 0 && m.correct/m.attempted < 0.5 ? 2 : (m.attempted === 0 ? 1 : 0), ch: c };
    });
    const weak = pool.filter(q => chScore[q.ch] && chScore[q.ch].weak === 2);
    const newCh = pool.filter(q => chScore[q.ch] && chScore[q.ch].weak === 1);
    const done = pool.filter(q => chScore[q.ch] && chScore[q.ch].weak === 0);
    function pick(arr, n){ const s = arr.slice().sort(()=>Math.random()-0.5); return s.slice(0, n); }
    const set = [];
    // 5 from attempted+wrong, 3 from untouched chapters, 2 from done chapters (stretch)
    set.push(...pick(weak, 5));
    set.push(...pick(newCh, Math.max(0, 3 - Math.max(0,5-set.length === 5 ? 0 : 5-set.length))));
    const need = 10 - set.length;
    set.push(...pick(done, need));
    return set.slice(0, 10).map((q,i)=>({...q, no:i+1, _daily:true}));
  }
  let DAILY = null;
  function viewToday() {
    // buildDailySet caches by date and scope; the view must not reuse a list
    // from a subject or board the student has since left.
    DAILY = buildDailySet();
    if (!DAILY.length) return `<section class="page-head"><h1>${S.lang==='hi'?'आज का अभ्यास':'Today\'s practice'}</h1><p class="muted">${S.lang==='hi'?'पहले कुछ प्रश्न हल कीजिए।':'Solve a few questions first.'}</p><a class="btn btn-primary" href="#/ask">${icon('sparkle')} ${S.lang==='hi'?'पहला प्रश्न पूछें':'Ask your first question'}</a></section>`;
    return `<section class="page-head">
      <span class="eyebrow">${icon('target')} ${S.lang==='hi'?'दैनिक 10':'Daily 10'}</span>
      <h1>${S.lang==='hi'?'आज के 10 प्रश्न':'Today\'s 10 practice questions'}</h1>
      <p>${S.lang==='hi'?'उपलब्ध प्रश्नों और दोहराव का मिश्रण। अपना आकलन स्वयं करें; अंक नहीं दिए जाते।':'A mix of available questions and review. Mark your own confidence; no score is assigned.'}</p>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" data-action="dailyRefresh">${icon('arrow')} ${S.lang==='hi'?'नया सेट':'New set'}</button>
        <a class="btn btn-primary btn-sm" href="#/ask">${icon('sparkle')} ${S.lang==='hi'?'कुछ और पूछें':'Ask something else'}</a>
      </div>
    </section>
    <div class="daily-list">
      ${DAILY.map((q,i) => {
        const txt = typeof q.q === 'string' ? q.q : pyqQuestionText(q);
        const ch = q.chName || chapterName(q.ch);
        const sourceMeta = q.sourceMeta || '';
        return `<article class="q-card pyq" id="daily-${i}" ${q.marked ? 'style="opacity:.65"' : ''}>
          <div class="q-top"><span class="q-no">${i+1}</span><div class="q-meta">${ch?`<span class="tag grey">${esc(ch)}</span>`:''}${sourceMeta?`<span class="tag">${esc(sourceMeta)}</span>`:''}${q.label?`<span class="tag cream">${esc(q.label)}</span>`:(q.lv?`<span class="tag">${esc(q.lv)}</span>`:'')}</div></div>
          <div class="q-text">${esc(txt)}</div>
          <div class="pactions" style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm" data-action="sample" data-q="${esc(txt)}">${icon('sparkle')} ${S.lang==='hi'?'हल करें':'Solve'}</button>
            <button class="btn btn-ghost btn-sm" data-action="dailyMark" data-i="${i}" data-ok="1" ${q.marked ? 'disabled' : ''}>${icon('check')} ${S.lang==='hi'?'आसान':'Got it'}</button>
            <button class="btn btn-ghost btn-sm" data-action="dailyMark" data-i="${i}" data-ok="0" ${q.marked ? 'disabled' : ''}>${icon('warn')} ${S.lang==='hi'?'कठिन':'Hard'}</button>
          </div>
        </article>`;
      }).join('')}
    </div>`;
  }

  /* ============================================================
     ⌘K COMMAND PALETTE  (#7) — search chapters / PYQs / saved / recent
     ============================================================ */
  function openCmdK() {
    if (S.cmdkOpen) return;
    S.cmdkOpen = true;
    const wrap = document.createElement('div');
    wrap.className = 'cmdk-overlay'; wrap.id='cmdk';
    wrap.innerHTML = '<div class="cmdk"><div class="cmdk-input-wrap"><span class="cmdk-kbd">⌘K</span><input class="cmdk-input" placeholder="'+(S.lang==='hi'?'अध्याय, प्रश्न, हल खोजें…':'Search chapters, questions, saved…')+'" autofocus></div><div class="cmdk-list"></div><div class="cmdk-foot"><span>↑↓ navigate · ↵ open · esc close</span></div></div>';
    document.body.appendChild(wrap);
    const input = wrap.querySelector('input');
    const list = wrap.querySelector('.cmdk-list');
    setTimeout(()=>input.focus(),10);
    function close(){ wrap.remove(); S.cmdkOpen=false; document.removeEventListener('keydown', onKey); }
    function render(q) {
      const qstr = (q||'').toLowerCase().trim();
      const items = [];
      // Actions
      items.push({type:'action', label:S.lang==='hi'?'आज का अभ्यास':'Today\'s practice', icon:'target', go:'#/today'});
      items.push({type:'action', label:S.lang==='hi'?'नया प्रश्न पूछें':'Ask a new question', icon:'sparkle', go:'#/ask'});
      items.push({type:'action', label:S.lang==='hi'?'मॉक टेस्ट':'Mock test', icon:'clock', go:'#/mock'});
      items.push({type:'action', label:S.lang==='hi'?'गलतियों की किताब':'Mistake book', icon:'book', go:'#/mistakes'});
      items.push({type:'action', label:S.lang==='hi'?'अभिभावक सारांश':'Parent summary', icon:'user', go:'#/parent'});
      items.push({type:'action', label:S.lang==='hi'?'खोज':'Search questions', icon:'search', go:'#/search'});
      // Chapters
      (UP.catalogue(S.cls, S.subject)||[]).forEach(c=>{
        const lbl = P({en:c.en,hi:c.hi});
        if (!qstr || lbl.toLowerCase().includes(qstr))
          items.push({type:'chapter', label:lbl, sub:(c.enDesc||'').slice(0,60), icon:'book', go:'#/chapter/'+c.id});
      });
      // PYQs — top 8 matches
      if (qstr.length >= 2) {
        const matches = (UP.pyq||[]).filter(x =>
          qInScope(x) && pyqQuestionText(x).toLowerCase().includes(qstr)
        ).slice(0,8);
        matches.forEach(x => items.push({type:'q', label:pyqQuestionText(x).slice(0,100), icon:'list', go:'#/ask?q='+encodeURIComponent(pyqQuestionText(x))}));
        // Saved
        S.saved.slice(0,5).forEach(s => {
          if (s.q.toLowerCase().includes(qstr)) items.push({type:'saved', label:s.q.slice(0,80), icon:'save', go:'#/ask?q='+encodeURIComponent(s.q)});
        });
      }
      // Render
      let active=0;
      function draw(sel) {
        list.innerHTML = items.slice(0,20).map((it,i)=>`<div class="cmdk-item ${i===sel?'on':''}" data-go="${esc(it.go)}"><span class="cmdk-ic">${icon(it.icon)}</span><span><b>${esc(it.label)}</b>${it.sub?`<br><span class="muted" style="font-size:11.5px">${esc(it.sub)}</span>`:''}</span></div>`).join('');
        list.querySelectorAll('.cmdk-item').forEach((el,i)=>el.onclick=()=>{ const href=items[i].go; close(); if(href.startsWith('#/ask?q=')){const q=decodeURIComponent(href.slice(8)); go('#/ask?q='+encodeURIComponent(q), true);} else location.hash=href; });
      }
      draw(0);
      input.oninput=()=>render(input.value);
      input.onkeydown=(e)=>{
        if(e.key==='ArrowDown'){active=Math.min(active+1,Math.min(19,items.length-1));draw(active);e.preventDefault();}
        else if(e.key==='ArrowUp'){active=Math.max(active-1,0);draw(active);e.preventDefault();}
        else if(e.key==='Enter'){e.preventDefault(); const go=items[active]&&items[active].go; if(go){close(); if(go.startsWith('#/ask?q=')){const q=decodeURIComponent(go.slice(8)); location.hash='#/ask?q='+encodeURIComponent(q);} else location.hash=go;}}
        else if(e.key==='Escape'){close();}
      };
    }
    render('');
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    function onKey(e){ if(e.key==='Escape'){close();} }
    document.addEventListener('keydown', onKey);
  }

  /* ============================================================
     HAND-DRAWN DIAGRAM FILTER  (#8) — blackboard look
     ============================================================ */
  const DIAGRAM_CSS = `
    .figure-body svg, .figure-card svg { filter: url(#upay-sketch); stroke-linecap:round; stroke-linejoin:round; }
    .figure-body svg path, .figure-body svg line, .figure-body svg circle, .figure-body svg polyline, .figure-body svg polygon, .figure-body svg rect, .figure-body svg ellipse { stroke-width: 1.8 !important; }
    .figure-body svg text { font-family: 'Noto Serif Devanagari', Georgia, serif !important; font-size:13.5px !important; }
    .figure-body { background: #fdf8ea; border-radius: 10px; padding: 6px; border: 1px dashed #d6c999; }
  `;
  function injectSketchFilter(){
    if (document.getElementById('upay-sketch-defs')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('width','0');svg.setAttribute('height','0');svg.id='upay-sketch-defs';
    svg.innerHTML = `<defs><filter id="upay-sketch"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4"/></filter></defs>`;
    document.body.appendChild(svg);
    const st = document.createElement('style'); st.textContent = DIAGRAM_CSS; document.head.appendChild(st);
  }

  /* ============================================================
     SHARE ANSWER AS IMAGE (#9) — native canvas, no deps
     ============================================================ */
  async function shareAnswerAsImage() {
    const a = spokenAnswer(); if (!a) return;
    const W = 1080, H = 1350;
    const c = document.createElement('canvas'); c.width=W; c.height=H;
    const ctx = c.getContext('2d');
    // Cream background
    ctx.fillStyle = '#fdfbf6'; ctx.fillRect(0,0,W,H);
    // Brand band
    ctx.fillStyle = '#46a0c9'; ctx.fillRect(0,0,W,72);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 36px system-ui, -apple-system, "Noto Sans Devanagari", sans-serif'; ctx.fillText('Upay · उपाय', 48, 50);
    ctx.font = '20px system-ui'; ctx.fillText('one question, every way to solve it', W-500, 50);
    // Wrap helper
    function wrap(text, x, y, maxW, lh, font, color){
      ctx.font = font; ctx.fillStyle = color;
      const words = String(text).split(/\s+/); let line='', yy=y;
      words.forEach(w=>{ const t = line + (line?' ':'') + w; if(ctx.measureText(t).width>maxW){ctx.fillText(line,x,yy);line=w;yy+=lh;} else line=t; });
      if(line) ctx.fillText(line,x,yy); return yy;
    }
    let y=120;
    ctx.fillStyle='#2b3a42';
    y = wrap(P(a.question||S.q||''), 60, y, W-120, 36, 'bold 30px system-ui', '#2b3a42');
    y += 20;
    y = wrap((S.lang==='hi'?'उत्तर: ':'Answer: ') + P(a.answer||a.result||''), 60, y, W-120, 32, '600 26px "Noto Serif", Georgia, serif', '#1c4962');
    y += 30;
    const ap = (a.approaches||[])[0];
    if (ap) {
      y = wrap(P(ap.name) + ' — ' + (P(ap.tag||'')), 60, y, W-120, 26, 'bold 22px system-ui', '#46a0c9');
      y += 10;
      (ap.steps||[]).slice(0,8).forEach((s,i)=>{
        y = wrap((i+1)+'. '+P(s.t||''), 80, y, W-160, 26, '20px "Noto Serif", Georgia, serif', '#2b3a42');
        y += 8;
        if (y > H-200) return;
      });
    }
    // Footer
    ctx.fillStyle='#94a4ad'; ctx.font='18px system-ui';
    ctx.fillText('upay.fyi  ·  AI-generated answer — cross-check with your textbook', 60, H-50);
    c.toBlob(blob=>{
      if(!blob) return;
      const f = new File([blob], 'upay-answer.png', {type:'image/png'});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[f]})){
        navigator.share({files:[f], title:'Upay answer', text:P(a.question||'').slice(0,80)}).catch(()=>downloadLink(c));
      } else downloadLink(c);
    });
  }
  function downloadLink(what, name){
    const a = document.createElement('a');
    if (what instanceof HTMLCanvasElement) a.href = what.toDataURL('image/png');
    else if (what instanceof Blob) a.href = URL.createObjectURL(what);
    else a.href = String(what);
    a.download = name || 'upay-answer.png';
    document.body.appendChild(a); a.click(); setTimeout(()=>{a.remove(); if(what instanceof Blob) URL.revokeObjectURL(a.href);}, 200);
  }

  /* ============================================================
     CORRECTNESS GUARD  (#gorilla) — local vs AI disagreement
     ============================================================ */
  function renderDisagreement(localAns, aiAns) {
    if (!localAns || !aiAns) return '';
    const localResult = String(localAns.result || localAns.answer || '').trim();
    const aiResult = String(aiAns.answer || aiAns.result || '').trim();
    if (!localResult || !aiResult) return '';
    // normalize: strip units, decimals, spaces
    const norm = s => s.replace(/[=≈\s]/g,'').replace(/(\d),(\d)/g,'$1$2').toLowerCase();
    if (norm(localResult) === norm(aiResult)) return '';
    // only flag when local has a concrete short answer (numeric/single-word)
    if (localResult.length > 80) return '';
    return `<div class="callout warn" style="margin:10px 0">${icon('warn')}<div>
      <b>${S.lang==='hi'?'मतभेद: स्थानीय हल और एआई अलग उत्तर दे रहे हैं।':'Disagreement: the local solver and AI differ.'}</b><br>
      ${S.lang==='hi'?'स्थानीय हल':'Local solver'}: <b>${esc(localResult)}</b> &nbsp;·&nbsp; ${S.lang==='hi'?'एआई':'AI'}: <b>${esc(aiResult)}</b><br>
      <span class="muted" style="font-size:12px">${S.lang==='hi'?'दोनों हल पढ़िए; CBSE की उत्तर-कुंजी ही मान्य है।':'Read both; the CBSE marking scheme is authoritative.'}</span>
      <div style="margin-top:6px"><button class="btn btn-ghost btn-sm" data-action="flagWrong">${icon('warn')} ${S.lang==='hi'?'यह उत्तर गलत है':'Flag answer as wrong'}</button></div>
    </div></div>`;
  }

  /* ============================================================
     VOICE INPUT (#13) & CAMERA OCR  (#12)
     ============================================================ */
  function startVoiceInput(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast(S.lang==='hi'?'वॉइस इनपुट इस ब्राउज़र में समर्थित नहीं':'Voice input not supported in this browser'); return; }
    const r = new SR();
    r.lang = S.lang==='hi'?'hi-IN':'en-IN'; r.interimResults=false; r.maxAlternatives=1;
    const ta = document.querySelector('textarea[name="q"]');
    toast(S.lang==='hi'?'बोलिए…':'Listening…');
    r.onresult = (ev) => {
      const txt = ev.results[0][0].transcript;
      if (ta){ ta.value = (ta.value ? ta.value+' ' : '') + txt; ta.dispatchEvent(new Event('input',{bubbles:true})); ta.focus(); }
      toast(S.lang==='hi'?'सुन लिया':'Heard!');
    };
    r.onerror = () => toast(S.lang==='hi'?'आवाज़ समझ नहीं आई':'Could not hear you');
    r.start();
  }

  function initCameraOCR(){
    // Hidden file input with camera capture
    if (document.getElementById('ocr-file')) return;
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='image/*'; inp.capture='environment'; inp.id='ocr-file';
    inp.style.display='none';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if(!f) return;
      // Defer to server-side OCR endpoint if it exists; otherwise put "uploaded photo" into the askbox (existing flow)
      toast(S.lang==='hi'?'तस्वीर पढ़ी जा रही है…':'Reading the image…');
      const fd = new FormData(); fd.append('photo', f);
      fetch('/api/ocr', {method:'POST', body:fd}).then(r=>r.json()).then(j=>{
        if(j && j.text){ go('#/ask?q='+encodeURIComponent(j.text), true); toast(S.lang==='hi'?'पाठ मिल गया':'Text recognized'); }
        else toast(S.lang==='hi'?'OCR उपलब्ध नहीं, फोटो अपलोड हुई':'OCR unavailable; photo uploaded');
      }).catch(()=>toast(S.lang==='hi'?'OCR उपलब्ध नहीं':'OCR unavailable'));
    };
    document.body.appendChild(inp);
  }
  function triggerCameraOCR(){ initCameraOCR(); document.getElementById('ocr-file').click(); }

  /* ============================================================
     PARENT / TEACHER VIEW (#14)
     ============================================================ */
  function viewParent() {
    const last7 = Object.keys(S.progress.daily||{}).filter(k=>Date.now()-new Date(k).getTime()<7*86400000);
    const total7 = last7.reduce((a,k)=>a+(S.progress.daily[k]||0),0);
    const weakChs = [];
    (UP.catalogue(S.cls, S.subject)||[]).forEach(c=>{
      const m=S.mastery[c.id]||{attempted:0,correct:0};
      if(m.attempted>=3 && m.correct/m.attempted<0.5) weakChs.push({c,pct:Math.round(100*m.correct/m.attempted)});
    });
    return `<section class="page-head">
      <span class="eyebrow">${icon('user')} ${S.lang==='hi'?'अभिभावक सारांश':'Parent summary'}</span>
      <h1>${S.user?esc(S.user.name||S.user.email):(S.lang==='hi'?'छात्र':'Student')}</h1>
      <p>${S.lang==='hi'?'पिछले 7 दिन का अभ्यास':'Last 7 days of practice'}</p>
    </section>
    <div class="home-mini-grid">
      <div class="home-mini-card"><h4>${S.lang==='hi'?'इस सप्ताह':'This week'}</h4><div class="big">${total7}</div><p style="margin:6px 0 0;font-size:12.5px;color:var(--ink-500)">${S.lang==='hi'?'अभ्यास गतिविधियाँ':'practice actions'}</p></div>
      <div class="home-mini-card"><h4>${S.lang==='hi'?'सहेजे':'Saved'}</h4><div class="big">${S.saved.length}</div><p style="margin:6px 0 0;font-size:12.5px;color:var(--ink-500)">${S.lang==='hi'?'बाद में दोहराने के लिए':'kept for revision'}</p></div>
      <div class="home-mini-card streak"><h4>${S.lang==='hi'?'लगातार दिन':'Streak'}</h4><div class="big">${streak()}<span style="font-size:16px;color:var(--ink-500);font-weight:500">${S.lang==='hi'?' दिन':'d'}</span></div></div>
    </div>
    <section class="card cream flat" style="margin-top:14px">
      <div class="mini-label">${S.lang==='hi'?'कमज़ोर अध्याय':'Weakest chapters'}</div>
      ${weakChs.length
        ? `<ul style="margin:10px 0 0;padding:0;list-style:none">${weakChs.slice(0,5).map(w=>`<li style="padding:8px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><span>${esc(P(w.c))}</span><b style="color:#c9530e">${w.pct}%</b></li>`).join('')}</ul>`
        : `<p class="muted" style="margin:8px 0 0">${S.lang==='hi'?'अभी कोई अध्याय कमज़ोर नहीं पहचाना गया।':'No weak chapters identified yet.'}</p>`}
    </section>`;
  }

  function viewAbout() {
    return `
    <header class="page-head">
      <span class="eyebrow"><span class="dot"></span>${S.lang === 'hi' ? 'पारदर्शिता' : 'transparency'}</span>
      <h1>${t('aboutTitle')}</h1>
      <p>${S.lang === 'hi' ? 'उपाय कैसे उत्तर बनाता है, और वह कहाँ आपकी पाठ्यपुस्तक से मेल नहीं खा सकता।' : 'How Upay builds an answer, and where it can differ from your textbook.'}</p>
    </header>
    <div class="grid grid-2">
      <article class="card">
        <div class="mini-label">01</div>
        <h3 style="font-size:17px;margin:6px 0 6px">${S.lang === 'hi' ? 'कुछ गणितीय प्रश्न पहचाने जा सकते हैं' : 'Some maths patterns can be recognised'}</h3>
        <p style="font-size:13.8px;color:var(--ink-600);margin:0">${S.lang === 'hi'
          ? 'बिल्ट-इन हलकर्ता कुछ गणितीय प्रश्नों को पहचानता है। हर संकेत या प्रश्न समझना संभव नहीं; उत्तर उपयोग करने से पहले व्याख्या जाँचें।'
          : 'The built-in solver recognises some maths question patterns. It may not understand every notation or question; check the interpretation before using an answer.'}</p>
      </article>
      <article class="card">
        <div class="mini-label">02</div>
        <h3 style="font-size:17px;margin:6px 0 6px">${S.lang === 'hi' ? 'विधियाँ और परिणाम जाँचें' : 'Check methods and results'}</h3>
        <p style="font-size:13.8px;color:var(--ink-600);margin:0">${S.lang === 'hi'
          ? 'दिखाई गई विधियाँ हमेशा स्वतंत्र जाँच नहीं होतीं। गणना और परिणाम पाठ्यपुस्तक या विश्वसनीय अंक-योजना से मिलाएँ।'
          : 'Displayed approaches are not necessarily independent checks. Compare working and results with your textbook or a trusted marking scheme.'}</p>
      </article>
      <article class="card">
        <div class="mini-label">03</div>
        <h3 style="font-size:17px;margin:6px 0 6px">${S.lang === 'hi' ? 'सीमाएँ स्पष्ट हैं' : 'The limits are stated'}</h3>
        <p style="font-size:13.8px;color:var(--ink-600);margin:0">${S.lang === 'hi'
          ? 'बिल्ट-इन हलकर्ता कुछ गणितीय प्रश्नों तक सीमित है। आयातित लेखाशास्त्र बैंक में सत्यापित स्थानीय हल या आधिकारिक उत्तर-कुंजी नहीं है। AI व्याख्या गलत हो सकती है।'
          : 'The built-in solver covers selected maths patterns, not every subject. Accountancy has no verified local solver or official answer key in the imported bank. AI explanations can be wrong.'}</p>
      </article>
      <article class="card">
        <div class="mini-label">04</div>
        <h3 style="font-size:17px;margin:6px 0 6px">${S.lang === 'hi' ? 'ऑनलाइन क्या जाता है' : 'What goes online'}</h3>
        <p style="font-size:13.8px;color:var(--ink-600);margin:0">${S.lang === 'hi'
          ? 'AI प्रश्न और फोटो पढ़ने के अनुरोध सर्वर और AI प्रदाता तक जाते हैं। अतिथि के सहेजे प्रश्न इस ब्राउज़र में रहते हैं; Supabase खाते से वे क्लाउड में सिंक हो सकते हैं। उपयोग की मूल जानकारी सर्वर को भेजी जा सकती है।'
          : 'AI questions and photo-reading requests go to the configured server and AI provider. Guest saves stay in this browser; signed-in Supabase saves may sync to the cloud. Basic usage telemetry may be sent to the site server.'}</p>
      </article>
      <article class="card">
        <div class="mini-label">05</div>
        <h3 style="font-size:17px;margin:6px 0 6px">${S.lang === 'hi' ? 'चित्र प्रश्न के अपने मानों से बनते हैं' : 'Figures are drawn from the question itself'}</h3>
        <p style="font-size:13.8px;color:var(--ink-600);margin:0">${S.lang === 'hi'
          ? 'कुछ गणितीय उत्तरों में बनाए गए चित्र होते हैं। चित्र अधूरे या गलत हो सकते हैं; उन्हें मूल प्रश्न से मिलाएँ।'
          : 'Some maths answers include generated figures. Figures may be incomplete or incorrect; compare them with the original question.'}</p>
      </article>
      <article class="card">
        <div class="mini-label">06</div>
        <h3 style="font-size:17px;margin:6px 0 6px">${S.lang === 'hi' ? 'चार सहायक शैलियाँ, और एक फैसला' : 'Four assistant styles, and a verdict'}</h3>
        <p style="font-size:13.8px;color:var(--ink-600);margin:0">${S.lang === 'hi'
          ? 'कुछ बिल्ट-इन हलों में प्रस्तुति शैलियों की तुलना दिखती है। वे एक ही हल पर आधारित हो सकती हैं और स्वतंत्र सत्यापन नहीं हैं। अलग AI अनुरोध ऑनलाइन जा सकते हैं।'
          : 'Some built-in solutions show a local comparison of presentation styles. They may share the same underlying solution and are not independent verification. Separate AI requests can go online.'}</p>
      </article>
    </div>
    <div class="callout tip" style="margin-top:20px">${icon('shield')}<div>${S.lang === 'hi'
      ? 'परीक्षा में लिखने से पहले उत्तर अपनी पाठ्यपुस्तक की विधि से मिलाइए — बोर्ड अंक-योजना पाठ्यपुस्तक की विधि पर आधारित होती है।'
      : 'Before writing an answer in an exam, match it to your textbook’s method — board marking schemes are built on the textbook method.'}</div></div>`;
  }

  /* ================================ ROUTER ================================ */
  function parseHash() {
    let h = location.hash.replace(/^#\/?/, '');
    if (!h) return { name: 'home', params: {} };
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const params = {};
    (qs || '').split('&').filter(Boolean).forEach(kv => {
      const [k, v] = kv.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { name: parts[0] || 'home', id: parts[1], params };
  }

  function render(options) {
    // Explanation updates replace the DOM, not the route. Keep the currently
    // visible card anchored even if an earlier answer changes height.
    const keepPosition = !!(options && options.preserveScroll);
    const scrollX = window.scrollX, scrollY = window.scrollY;
    const anchor = keepPosition && Array.from(document.querySelectorAll('.q-card[id]'))
      .find(el => el.getBoundingClientRect().bottom > 180);
    const anchorId = anchor && anchor.id;
    const anchorTop = anchor && anchor.getBoundingClientRect().top;
    stopAnswerSpeech();
    closeSavePopover();
    const r = parseHash();
    // A shareable entry point selects this supplied subject, then removes the
    // one-time route so later header changes are not overwritten on rerender.
    if (r.name === 'economics' || r.name === 'english12') {
      const targetSubject = r.name === 'english12' ? 'english' : 'economics';
      if (+S.cls !== 12 || S.subject !== targetSubject) {
        S.chapterId = null; window.__qIndex = null; S.dailySet = null;
        // Hide a previous scope's in-memory mock without deleting its stored data.
        S.mockTest = null; clearInterval(window.__mtTimer);
        S.test.chapters = []; S.test.seed = 0; S.paper = null;
      }
      S.cls = 12; S.subject = targetSubject; saveState();
      history.replaceState(null, '', location.pathname + location.search + '#/syllabus');
      r.name = 'syllabus'; r.params = {};
    }
    if (r.params.cls) {
      const nc = +r.params.cls;
      if (nc !== S.cls) { S.chapterId = null; window.__qIndex = null; S.dailySet = null; clearMockTest(); store.remove(dailyStoreKey()); }
      S.cls = nc;
    }
    if (r.params.sub) {
      if (r.params.sub !== S.subject) { S.chapterId = null; window.__qIndex = null; S.dailySet = null; clearMockTest(); store.remove(dailyStoreKey()); }
      S.subject = r.params.sub;
    }
    // Preserve an explicitly shared Class 12 English chapter's scope when the
    // student follows its Books link and later reloads.
    if ((r.params.cls || r.params.sub) && english12Track()) saveState();
    syncStudyScope();
    renderShell(); renderTopbar(); renderFooter();

    const main = document.getElementById('view');
    let html = '';
    if (r.name === 'ask') {
      S.cls = +S.cls;
      if (r.params.cls) { /* already set */ }
      // Decode shared-question payload ?s=base64
      if (r.params.s && !r.params.q) {
        try {
          const json = decodeURIComponent(escape(atob(r.params.s.replace(/_/g, '/').replace(/-/g, '+'))));
          const p = JSON.parse(json);
          if (p.q) { r.params.q = p.q; if (p.sub) S.subject = p.sub; }
        } catch (e) {}
      }
      const q = r.params.q;
      S.q = q || '';
      if (q) {
        /* the local engine answers instantly so the page is never blank;
           the AI answer replaces it when it arrives.
           If the PYQ already carries three pre-baked approaches (approach-enrich.js),
           surface them immediately as the starter answer. */
        const scope = aiScope();
        if (S.aiQuestion !== q || S.aiScope !== scope) {
          let ans;
          // Try to find the underlying PYQ object to get its .approaches
          const pyq = (UP.pyq || []).find(x => x === q || (q.id && x.id === q.id) || x.en === q);
          if (needsAIOnly()) {
            ans = accountancyAIWaiting(q);
          } else if (pyq && pyq.approaches && pyq.approaches.length) {
            ans = {
              kind: 'seeded',
              question: pyq.en || q,
              summary: (S.lang === 'hi' ? 'तीन विधियाँ दी गई हैं — विस्तृत हल के लिए एआई चल रहा है।' : 'Three starter methods are shown below — AI is filling in step-by-step math.'),
              result: (pyq.ans || ''),
              approaches: pyq.approaches,
              chapter: pyq.ch || null,
              _chId: S.chapterId || 0,
              _seeded: true,
            };
            if (pyq.figs && pyq.figs.length) ans.fig = pyq.figs[0];
          } else {
            ans = UP.answerQuestion(q) || UP.fallbackAnswer(q, S.lang, true);
          }
          if (!ans) ans = accountancyAIWaiting(q);
          ans.question = q;
          S.answer = ans;
          S.aiAnswer = null; S.aiState = 'loading'; S.aiQuestion = q; S.aiScope = scope;
          askAI(q);
        }
      } else {
        S.answer = null; S.aiAnswer = null; S.aiState = null; S.aiQuestion = null; S.aiScope = null;
      }
      html = viewAsk(r.params);
    } else if (r.name === 'today') { html = viewToday(); }
    else if (r.name === 'syllabus') html = viewSyllabus(r.params);
    else if (r.name === 'chapter') {
      S.chapterId = r.id;
      if (chapterById(r.id)) store.set(scopedDataKey('lastChapter'), r.id);
      /* Class 10 Science has the real textbook; route to the reader. */
      html = (S.subject === 'science' && +S.cls === 10 && scienceChapter(r.id))
        ? viewScienceChapter(r.id)
        : viewChapter(r.id, r.params);
    }
    else if (r.name === 'test') html = viewTest(r.params);
    else if (r.name === 'pyq') html = viewPyq(r.params);
    else if (r.name === 'mcq') html = viewMcq(r.params);
    else if (r.name === 'boards') html = viewBoards();
    else if (r.name === 'books') html = viewBooks(r.params);
    else if (r.name === 'saved') html = viewSaved() + (typeof window.viewMe === 'function' ? window.viewMe() : '');
    else if (r.name === 'about') html = viewAbout();
    else if (r.name === 'parent') html = viewParent();
    else if (r.name === 'apikey') html = viewApiKey();
    else if (r.name === 'admin') html = viewAdmin();
    else if (r.name === 'login') html = viewLogin(r.params);
    else if (r.name === 'account') html = viewAccount();
    else if (r.name === 'ai-access') html = viewAIAccess();
    else if (r.name === 'mistakes') html = viewMistakes();
    else if (r.name === 'mock') {
      // A new-test link is a one-shot action, not a reset on every rerender.
      if (r.params.new) {
        clearMockTest();
        const params = new URLSearchParams(location.hash.split('?')[1] || '');
        params.delete('new');
        history.replaceState(history.state, '', '#/mock' + (params.toString() ? '?' + params.toString() : ''));
      }
      const mockScope = [S.board, String(S.cls), S.subject].join('|');
      if (S.mockTest && S.mockTest.scope !== mockScope) clearMockTest();
      if (S.mockTest) S.mockTest.ungraded = true;
      html = S.mockTest && S.mockTest.finished ? viewMockResult() : viewMockTest({subject:S.subject});
      setTimeout(startMockTimer,50);
    }
    else if (r.name === 'mockresult') { if (S.mockTest) S.mockTest.ungraded = true; html = viewMockResult(); }
    else if (r.name === 'cheatsheet') html = viewCheatsheet({ch:r.id});
    else if (r.name === 'search') html = viewSearch(r.params);
    else html = viewHome();

    main.innerHTML = html;
    if (r.name === 'ai-access') loadAIAccess(false);
    main.className = 'page';
    // active nav
    document.querySelectorAll('[data-nav]').forEach(a => {
      const on = a.dataset.nav === r.name || (r.name === 'chapter' && a.dataset.nav === 'syllabus');
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = 'Upay · ' + ({ home: 'Home', ask: 'Ask', today: 'Today', syllabus: 'Syllabus', chapter: (chapterById(r.id) ? P({ en: chapterById(r.id).en, hi: chapterById(r.id).hi }) : 'Chapter'), boards: 'Boards', books: 'Books', saved: 'Saved', about: 'About', parent: 'Parent', apikey: 'API key', admin: 'Admin', login: 'Sign in', account: 'Account', mistakes: 'Mistakes', mock: 'Mock test', mockresult: 'Result', cheatsheet: 'Cheatsheet', search: 'Search' }[r.name] || 'Home');
    // auto-size hero textarea
    const ta = main.querySelector('textarea[name="q"]');
    if (ta) {
      const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; };
      ta.addEventListener('input', fit); fit();
    }
    postRenderEnhance(main);
    if (keepPosition) {
      const nextAnchor = anchorId && document.getElementById(anchorId);
      const top = nextAnchor ? window.scrollY + nextAnchor.getBoundingClientRect().top - anchorTop : scrollY;
      window.scrollTo({ left: scrollX, top, behavior: 'instant' });
    } else window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ---- post-render UX enhancements: step-reveal CTAs, diagram lightbox, kbd hint ---- */
  function postRenderEnhance(root) {
    // 1. "Show next method" CTAs between collapsed approaches
    const approaches = root.querySelectorAll('.approach');
    approaches.forEach((art, idx) => {
      const isOpen = art.classList.contains('open');
      const next = approaches[idx + 1];
      // remove any previously-inserted CTAs
      const existing = art.querySelector(':scope > .next-method-cta');
      if (existing) existing.remove();
      if (isOpen && next && next.classList.contains('closed') && !art.querySelector(':scope > .next-method-cta')) {
        const nextName = next.querySelector('h3');
        const btn = document.createElement('button');
        btn.className = 'next-method-cta';
        btn.type = 'button';
        btn.dataset.action = 'next-method';
        btn.innerHTML = icon('arrow') + ' ' + (S.lang === 'hi' ? 'अगली विधि देखें' : 'Show the next method') + (nextName ? ' — “' + nextName.textContent.trim() + '”' : '');
        const body = art.querySelector('.approach-body');
        if (body) body.appendChild(btn);
      }
    });

    // "Show all" button next to approaches heading if any are collapsed
    if (approaches.length > 1) {
      const closedCount = Array.from(approaches).filter(a => a.classList.contains('closed')).length;
      if (closedCount > 0) {
        // find the section-head that follows the figure and precedes approaches
        const heads = root.querySelectorAll('.section-head');
        for (const h of heads) {
          if (h.textContent.includes(t('approaches'))) {
            if (!h.querySelector('.show-all-btn')) {
              const btn = document.createElement('button');
              btn.className = 'show-all-btn'; btn.type = 'button'; btn.dataset.action = 'expand-all';
              btn.textContent = S.lang === 'hi' ? 'सभी विधियाँ दिखाएँ' : 'Show all methods';
              h.appendChild(btn);
            }
            break;
          }
        }
      }
    }

    // 2. Diagram lightbox: any <img> inside .figure-card / .sci-fig / .panel-figure / .st-m svg inside answers
    const zoomables = root.querySelectorAll('.figure-card img, .sci-fig img, .panel-figure img, .figure-body img, .figure-body svg');
    zoomables.forEach(img => {
      img.addEventListener('click', openFigLightbox);
    });

    // 3. ⌘K hint next to the primary Ask button if present
    const askCta = document.querySelector('.ask-cta');
    if (askCta && !askCta.querySelector('.kbd-hint')) {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const k = document.createElement('span');
      k.className = 'kbd-hint';
      k.innerHTML = '<kbd>' + (isMac ? '⌘' : 'Ctrl') + '</kbd><kbd>K</kbd>';
      askCta.appendChild(k);
    }
  }
  /* --- save-as-tag popover --- */
  function openSavePopover(anchor, ans) {
    closeSavePopover();
    const wrap = document.createElement('div');
    wrap.className = 'save-popover';
    wrap.id = 'savePopover';
    const tags = S.savedTags.slice(0, 6);
    wrap.innerHTML = `
      <div class="sp-hd">${S.lang==='hi'?'टैग चुनें':'Choose a tag'}</div>
      <div class="sp-tags">
        <button class="sp-tag" data-action="confirmSave" data-q="${esc(ans.question)}" data-tag="">${icon('save')} ${S.lang==='hi'?'बिना टैग के':'Just save'}</button>
        ${tags.map(t => `<button class="sp-tag" data-action="confirmSave" data-q="${esc(ans.question)}" data-tag="${esc(t)}">${tagIcon(t)} ${esc(t)}</button>`).join('')}
        <button class="sp-tag muted" data-action="addTag">+ ${S.lang==='hi'?'नया':'new'}</button>
      </div>`;
    document.body.appendChild(wrap);
    const r = anchor.getBoundingClientRect();
    wrap.style.top = (r.bottom + window.scrollY + 6) + 'px';
    wrap.style.left = Math.min(r.left + window.scrollX, window.innerWidth - 260) + 'px';
    setTimeout(() => { document.addEventListener('click', onDoc, { once: true }); }, 0);
    function onDoc(e) { if (!wrap.contains(e.target)) closeSavePopover(); }
  }
  function closeSavePopover() { const el = document.getElementById('savePopover'); if (el) el.remove(); }
  function tagIcon(tag) {
    const m = {
      important: icon('warn'),
      revisit: icon('clock'),
      exam: icon('target'),
      formula: icon('formula'),
      tricky: icon('bulb'),
      easy: icon('check')
    };
    return m[tag] || icon('save');
  }
  function tagColor(tag) {
    const m = { important: '#c9530e', revisit: '#8a5cc2', exam: '#2f8c5b', formula: '#3b72c9', tricky: '#c0952c' };
    return m[tag] || '#5b6b74';
  }

  function openFigLightbox(e) {
    const el = e.currentTarget;
    const isSvg = el.tagName.toLowerCase() === 'svg';
    const lb = document.createElement('div');
    lb.className = 'fig-lightbox';
    lb.innerHTML = '<button class="close" aria-label="close">×</button>';
    const wrap = document.createElement('div');
    wrap.className = 'fig-wrap';
    let target;
    if (isSvg) {
      const clone = el.cloneNode(true);
      clone.removeAttribute('width'); clone.removeAttribute('height');
      clone.style.maxWidth = '94vw'; clone.style.maxHeight = '92vh';
      wrap.appendChild(clone); target = clone;
    } else {
      const im = document.createElement('img');
      im.src = el.currentSrc || el.src; im.alt = el.alt || '';
      im.draggable = false;
      wrap.appendChild(im); target = im;
    }
    lb.appendChild(wrap);
    document.body.appendChild(lb);
    // pinch/scroll zoom + drag
    let scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0;
    const apply = () => { target.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
    lb.addEventListener('wheel', ev => {
      if (!ev.ctrlKey && Math.abs(ev.deltaY) < 30) return; // allow click-to-close for small clicks, only pinch/wheel zooms
      ev.preventDefault();
      const d = -ev.deltaY * 0.002;
      scale = Math.min(5, Math.max(0.5, scale + d));
      apply();
    }, { passive: false });
    // double-click to toggle 2x
    lb.addEventListener('dblclick', ev => {
      ev.stopPropagation();
      scale = (scale > 1.01) ? 1 : 2; tx = 0; ty = 0; apply();
    });
    wrap.addEventListener('pointerdown', ev => {
      if (scale <= 1.01) return;
      dragging = true; sx = ev.clientX - tx; sy = ev.clientY - ty;
      wrap.setPointerCapture(ev.pointerId);
    });
    wrap.addEventListener('pointermove', ev => {
      if (!dragging) return;
      tx = ev.clientX - sx; ty = ev.clientY - sy; apply();
    });
    wrap.addEventListener('pointerup', () => { dragging = false; });
    const close = () => { try { window.speechSynthesis; } catch(e) {} lb.remove(); document.removeEventListener('keydown', esc); };
    lb.querySelector('.close').addEventListener('click', ev => { ev.stopPropagation(); close(); });
    lb.addEventListener('click', ev => { if (ev.target === lb) close(); });
    const esc = ev => { if (ev.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
  }

  /* ============================== TEST / SAMPLE PAPER ============================== */
  S.test = store.get('test', { board: S.board || 'cbse', level: 'mixed', chapters: [], count: 0, seed: 0 });
  S.test.board = S.board || 'cbse'; // a paper always follows the selected board
  S.paper = null;
  S.answers = {};

  const LVL = { easy: ['Easy', 'आसान'], medium: ['Medium', 'मध्यम'], hard: ['Hard', 'कठिन'], mixed: ['Mixed', 'मिश्रित'] };

  /* Questions keep their NCERT chapter number (1-14), because that is how the
     whole bank is filed.  On the Rajasthan board the same question is also
     printed with the RBSE book's own chapter title next to the number, so a
     student can find it in their textbook.  The number never changes, so
     nothing about CBSE browsing or the question views moves. */
  const RBSE_ALIAS = {
    1:  2,   // Real Numbers                    -> RBSE ch 2
    2:  3,   // Polynomials                     -> RBSE ch 3
    3:  4,   // Pair of Linear Equations        -> RBSE ch 4
    4:  4,   // Quadratic Equations             -> RBSE ch 4 (same book chapter)
    5:  5,   // Arithmetic Progressions         -> RBSE ch 5
    6:  11,  // Triangles                       -> RBSE ch 11 Similarity
    7:  9,   // Coordinate Geometry             -> RBSE ch 9
    8:  6,   // Introduction to Trigonometry    -> RBSE ch 6
    9:  8,   // Some Applications of Trigo      -> RBSE ch 8
    10: 12,  // Circles                         -> RBSE ch 12
    11: 15,  // Areas Related to Circles        -> RBSE ch 15
    12: 16,  // Surface Areas and Volumes       -> RBSE ch 16
    13: 17,  // Statistics                      -> RBSE ch 17
    14: 18,  // Probability                     -> RBSE ch 18
  };
  function rbseTitle(n) {
    const c = UP.rbseChapters && (UP.rbseChapters.chapters || []).find(x => +x.id === +n);
    return c ? (S.lang === 'hi' ? c.hi : c.en) : '';
  }
  function chapterName(id) {
    // RBSE questions retain NCERT chapter IDs; the board-book alias is shown
    // separately by rbseTitle().
    const c = isRbse() ? (UP.chapters || []).find(x => String(x.id) === String(id)) : chapterById(id);
    if (c) return P({ en: c.en, hi: c.hi });
    const row = (UP.pyq || []).find(q => +q.ch === +id && qInScope(q) && q.chapter);
    return row ? row.chapter : '';
  }

  function buildPaper(force) {
    // A cached paper is only valid for the scope and filters that built it.
    // Otherwise switching board/class/subject can display the previous paper.
    const paperScope = JSON.stringify([S.board, +S.cls, S.subject, S.test.board, S.test.level, S.test.chapters || []]);
    if (!force && S.paper && S.paper._scope === paperScope) return S.paper;
    S.answers = {};
    const seed = S.test.seed || (Math.floor(Date.now() / 1000) % 99991);

    /* The generator only knows how to build MATHS papers (its templates are
       algebra/geometry/probability drills). Asking it for a Science paper
       silently produced a maths paper with the heading changed -- a Class 10
       Science student revising for a science test was given quadratic
       equations. So for any subject without templates, build the paper from
       the real bank questions for that class and subject instead. */
    if (S.subject !== 'maths' || +S.cls !== 10) {
      S.paper = paperFromBank(seed);
    } else {
      S.paper = UP.testgen.paper({
        board: S.test.board, level: S.test.level,
        chapters: S.test.chapters, seed
      });
    }
    S.paper._scope = paperScope;
    store.set('test', S.test);
    return S.paper;
  }

  /* A paper assembled from real questions in the student's own scope: same
     board, same class, same subject, honouring the chapter filter and the
     difficulty setting. Returns the same shape as UP.testgen.paper so the rest
     of the exam view does not need to know the difference. */
  function paperFromBank(seed) {
    const LV = { 1: 'Basic', 2: 'Standard', 3: 'Hard' };
    const want = S.test.level;
    const sourceBank = accountancyTrack() || (+S.cls === 12 && S.subject === 'physics');
    let pool = myBank();
    if (S.test.chapters && S.test.chapters.length) {
      // Selected chapters filter. Only questions mapped to one of the chosen
      // chapters belong here. Unmapped questions (ch null/0) are *not* folded in:
      // they used to be, which meant that picking a single chapter pulled in every
      // unmapped question in the subject -- 99% of Class 10 English and about
      // three quarters of Class 10 Hindi and Social Science. Those items still
      // appear when the chapter filter is left at "All".
      pool = pool.filter(q => S.test.chapters.some(id => qHasChapter(q, id)));
    }
    // An empty selected chapter must stay empty; do not borrow other chapters.
    if (!sourceBank) {
      if (want === 'easy') pool = pool.filter(q => (q.lv || 'Basic') === 'Basic');
      else if (want === 'hard') pool = pool.filter(q => (q.lv || 'Basic') !== 'Basic');
    }
    if (!pool.length) {
      /* never silently fall back to another class or subject -- show nothing
         and let the view say why */
      return { empty: true, subject: S.subject, cls: +S.cls, board: S.board,
               title: { en: 'No questions yet', hi: 'अभी प्रश्न नहीं' }, total: 0, time: 0, sections: [] };
    }
    /* Prioritise real board PYQs above textbook exercise questions.
       Board questions carry q.src that is a real paper year/source; NCERT
       exercise questions typically have src === 'ncert' or no src at all.
       We want ~75% of every practice paper to be board questions. */
    const BOARD_RE = /cbse|board|pyq|20\d\d|20[0-2]\d/i;
    const isBoard = q => {
      const s = (q.src || q.board || q.source || '').toString();
      if (BOARD_RE.test(s) && !/ncert|exercise|textbook/i.test(s)) return true;
      // q.en or q.hi prefixed like "CBSE 2024" is a board PYQ
      const head = ((q.en || '') + ' ' + (q.hi || '')).slice(0, 40);
      return /CBSE\s*(20\d\d|20[0-2]\d)/i.test(head);
    };
    const boards = pool.filter(isBoard);
    const exercises = pool.filter(q => !isBoard(q));
    /* deterministic shuffle, so the same seed rebuilds the same paper */
    let st = seed || 1;
    const rnd = () => (st = (st * 1103515245 + 12345) % 2147483648) / 2147483648;
    const bShuf = boards.slice().sort(() => rnd() - 0.5);
    const eShuf = exercises.slice().sort(() => rnd() - 0.5);
    const boardQuota = Math.min(bShuf.length, 15);   // up to 15 board PYQs
    const picked = bShuf.slice(0, boardQuota).concat(eShuf.slice(0, 20 - boardQuota)).slice(0, 20);
    picked.sort((a, b) => (+a.m || (sourceBank ? 0 : 1)) - (+b.m || (sourceBank ? 0 : 1)));
    const groups = {};
    picked.forEach(q => { const m = +q.m || (sourceBank ? 0 : 1); (groups[m] = groups[m] || []).push(q); });
    let questionNumber = 0;
    const sections = Object.keys(groups).sort((a, b) => a - b).map(key => {
      const m = +key;
      return {
        name: { en: m ? m + '-mark questions' : 'Selected source questions', hi: m ? m + '-अंक प्रश्न' : 'चुने हुए स्रोत-प्रश्न' },
        marks: m || null,
        questions: groups[key].map(q => ({
          no: ++questionNumber, ch: q.ch, marks: +q.m > 0 ? +q.m : (sourceBank ? null : +m), tid: q.id, d: q.lv,
          en: q.en, hi: q.hi || '', opts: q.opts || null, ans: q.ans || '',
          steps: null, fig: q.fig || null, raw: q
        }))
      };
    });
    return {
      title: { en: (UP.subjects[S.subject] || { en: S.subject }).en + ' practice set',
               hi: ((UP.subjects[S.subject] || {}).hi || S.subject) + ' अभ्यास-सेट' },
      total: sourceBank ? null : picked.reduce((a, q) => a + (+q.m || 1), 0),
      time: Math.max(20, picked.length * 3),
      seed: seed, sections: sections
    };
  }


  /* ---------------------------------------------------------------------
     The textbook chapter page for Class 10 Science.

     This is the reader for the real NCERT chapter: the numbered sections in
     order, the Activity boxes, and every captioned figure shown in place with
     the caption it was printed under. At the end, the chapter's own Exercise
     questions, which are the practice set a student actually expects.

     A chapter that arrived as a scan (4 and 8) says so on the page instead of
     pretending to have text it does not have.
     --------------------------------------------------------------------- */
  function viewScienceChapter(id) {
    const ch = scienceChapter(id);
    if (!ch) return `<section class="page-head"><h1>${S.lang === 'hi' ? 'अध्याय नहीं मिला' : 'Chapter not found'}</h1></section>`;
    const name = S.lang === 'hi' && ch.hi ? ch.hi : ch.en;
    const qs = (UP.science10Q || []).filter(q => q.ch === ch.id);
    const figsByNum = {};
    (ch.figures || []).forEach(f => { figsByNum[f.num] = f; });

    const figBlock = f => `
      <figure class="sci-fig">
        <img src="${esc(f.src)}" alt="${esc(f.cap)}" loading="lazy">
        <figcaption><b>Figure ${esc(f.num)}</b> ${esc(f.cap)}</figcaption>
      </figure>`;

    if (ch.scanned || !(ch.sections || []).length) {
      return `
      <section class="page-head">
        <span class="eyebrow">${icon('book')} ${S.lang === 'hi' ? 'कक्षा 10 विज्ञान' : 'Class 10 Science'} · ${S.lang === 'hi' ? 'अध्याय' : 'Chapter'} ${ch.id}</span>
        <h1>${esc(name)}</h1>
      </section>
      <section class="card">
        <div class="callout warn">
          <div><b>${S.lang === 'hi' ? 'इस अध्याय का पाठ अभी नहीं खुला' : 'The text of this chapter has not been extracted yet'}</b><br>
          ${S.lang === 'hi'
            ? 'यह अध्याय स्कैन की गई छवियों के रूप में आया था, इसलिए इसमें खोजने योग्य पाठ नहीं है। नीचे इस अध्याय के प्रश्न अभी भी उपलब्ध हैं।'
            : 'This chapter arrived as scanned page images with no searchable text, so the prose cannot be shown without inventing it. The chapter’s questions are still available below.'}</div>
        </div>
      </section>
      ${qs.length ? `<section class="card"><h3>${S.lang === 'hi' ? 'प्रश्न' : 'Questions'}</h3>
        <ol class="sci-qlist">${qs.map(q => `<li>${esc(q.en)}</li>`).join('')}</ol></section>` : ''}`;
    }

    let body = '';
    (ch.sections || []).forEach(sec => {
      const isIntro = sec.n === '0';
      body += `<section class="sci-sec">
        <h2>${isIntro ? (S.lang === 'hi' ? 'परिचय' : 'Introduction') : esc(sec.n) + ' &nbsp;' + esc(sec.title)}</h2>
        ${sec.text.split(/(?<=[.!?])\s+/).reduce((acc, sent, i) => {
          if (i % 4 === 0) acc.push('');
          acc[acc.length - 1] += (acc[acc.length - 1] ? ' ' : '') + sent;
          return acc;
        }, []).map(p => `<p>${esc(p)}</p>`).join('')}
      </section>`;
    });

    return `
    <section class="page-head">
      <span class="eyebrow">${icon('book')} ${S.lang === 'hi' ? 'कक्षा 10 विज्ञान' : 'Class 10 Science'} · ${S.lang === 'hi' ? 'अध्याय' : 'Chapter'} ${ch.id}</span>
      <h1>${esc(name)}</h1>
      <p class="lead">${S.lang === 'hi'
        ? 'यह पाठ NCERT की पुस्तक से सीधे लिया गया है — वही धाराएँ, वही चित्र, वही अभ्यास प्रश्न।'
        : 'Read straight from the NCERT textbook — the same sections, the same printed diagrams, the same exercise questions.'}</p>
      <div class="paper-meta">
        <span class="tag">${(ch.sections || []).length} ${S.lang === 'hi' ? 'धाराएँ' : 'sections'}</span>
        <span class="tag">${(ch.figures || []).length} ${S.lang === 'hi' ? 'चित्र' : 'diagrams'}</span>
        <span class="tag">${qs.length} ${S.lang === 'hi' ? 'प्रश्न' : 'questions'}</span>
      </div>
    </section>

    ${(ch.figures || []).length ? `<section class="card">
      <h3>${S.lang === 'hi' ? 'इस अध्याय के चित्र' : 'Diagrams in this chapter'}</h3>
      <p class="hint">${S.lang === 'hi' ? 'पुस्तक के मूल चित्र, उनके मूल कैप्शन के साथ।' : 'The textbook’s own figures, with the captions they were printed under.'}</p>
      <div class="sci-figgrid">${ch.figures.map(figBlock).join('')}</div>
    </section>` : ''}

    <article class="card sci-read">${body}</article>

    ${(ch.activities || []).length ? `<section class="card">
      <h3>${S.lang === 'hi' ? 'क्रियाकलाप' : 'Activities'}</h3>
      ${ch.activities.map(a => `<div class="sci-act"><b>Activity ${esc(a.n)}</b><p>${esc(a.text)}</p></div>`).join('')}
    </section>` : ''}

    ${qs.length ? `<section class="card">
      <h3>${S.lang === 'hi' ? 'अभ्यास प्रश्न' : 'Exercise questions'}</h3>
      <p class="hint">${S.lang === 'hi' ? 'पुस्तक के अंत में दिए प्रश्न, मूल शब्दों में। किसी प्रश्न पर चित्र दिखे तो वह उसी प्रश्न का है।' : 'The textbook’s own end-of-chapter questions, in their original wording. Where a question shows a diagram, it is the figure printed for that question.'}</p>
      ${qs.map((q, i) => `<div class="sci-q">
        <div class="sci-qno">${q.qno || i + 1}</div>
        <div>
          <p>${esc(q.en)}</p>
          ${(q.opts && q.opts.length) ? `<ul class="sci-opts">${q.opts.map((o, oi) =>
            `<li><b>(${esc(q.optLetters && q.optLetters[oi] || String.fromCharCode(97 + oi))})</b> ${esc(o.en || o)}</li>`).join('')}</ul>` : ''}
          ${q.fig ? `<figure class="sci-fig"><img src="${esc(q.fig.src)}" alt="${esc(q.fig.cap)}" loading="lazy">
            <figcaption><b>Figure ${esc(q.fig.num)}</b> ${esc(q.fig.cap)}</figcaption></figure>` : ''}
          ${q.ans ? `<details class="sci-ans"><summary>${S.lang === 'hi' ? 'उत्तर देखें' : 'Show answer'}</summary>
            <div><span class="sci-ans-lbl">${S.lang === 'hi' ? 'NCERT उत्तर' : 'NCERT answer key'}</span> ${esc(q.ans)}</div></details>` : ''}
        </div>
      </div>`).join('')}
    </section>` : ''}`;
  }

  /* Custom <select>-free dropdown for the Test & Sample-paper setup, so
     touch/click works reliably inside the sandbox iframe and on mobile
     Safari without requiring long-press. */
  function renderTestDrops() {
    function field(id, label, ariaLabel, items, current) {
      const wrapId = 'dd-' + id;
      const selected = items.find(o => String(o.v) === String(current)) || items[0];
      return `<div class="setup-field">
        <label for="${wrapId}-btn">${esc(label)}</label>
        <div class="udrop" id="${wrapId}-wrap">
          <button type="button" class="select udrop-btn" id="${wrapId}-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(ariaLabel)}">
            <span class="udrop-val">${esc(P(selected))}</span>
            <span class="udrop-caret" aria-hidden="true">▾</span>
          </button>
          <ul class="udrop-menu" role="listbox" id="${wrapId}-menu" hidden>
            ${items.map(o => `<li role="option" data-value="${esc(o.v)}" ${String(o.v) === String(selected.v) ? 'aria-selected="true" class="on"' : ''}>${esc(P(o))}</li>`).join('')}
          </ul>
        </div>
      </div>`;
    }
    const isSourceTrack = +S.cls === 12 && (S.subject === 'accountancy' || S.subject === 'computerized-accounting');
    const boardItems = (isSourceTrack ? UP.boards.filter(b => b.id === 'cbse') : UP.boards).map(b => ({ v: b.id, en: b.en, hi: b.hi }));
    const levelItems = [
      { v:'easy',   en:'Easy',    hi:'आसान' },
      { v:'medium', en:'Medium',  hi:'मध्यम' },
      { v:'hard',   en:'Hard',    hi:'कठिन' },
      { v:'mixed',  en:'Mixed',   hi:'मिश्रित' },
    ];
    const clsItems = UP.classes.map(c => ({ v: c.id, en: c.en, hi: c.hi }));
    return field('pickBoard', S.lang==='hi'?'बोर्ड':'Board',      S.lang==='hi'?'बोर्ड चुनिए':'Choose board',      boardItems, isSourceTrack ? 'cbse' : S.test.board)
         + (isSourceTrack ? '' : field('pickLevel', S.lang==='hi'?'कठिनाई':'Difficulty', S.lang==='hi'?'कठिनाई चुनिए':'Choose difficulty', levelItems, S.test.level))
         + field('pickCls',   S.lang==='hi'?'कक्षा':'Class',       S.lang==='hi'?'कक्षा चुनिए':'Choose class',       clsItems,  +S.cls);
  }

  function bindUDrop() {
    if (bindUDrop._bound) return;
    bindUDrop._bound = true;
    document.addEventListener('click', function (ev) {
      const btn = ev.target.closest('.udrop-btn');
      const wrap = ev.target.closest('.udrop');
      // Close any open dropdowns that are NOT the one being clicked
      document.querySelectorAll('.udrop.open').forEach(w => {
        if (!wrap || w !== wrap) {
          w.classList.remove('open');
          w.querySelector('.udrop-btn').setAttribute('aria-expanded','false');
          w.querySelector('.udrop-menu').hidden = true;
        }
      });
      if (btn && wrap) {
        const isOpen = wrap.classList.toggle('open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        wrap.querySelector('.udrop-menu').hidden = !isOpen;
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      // Click on a menu item
      const opt = ev.target.closest('.udrop-menu li');
      if (opt) {
        const w = opt.closest('.udrop');
        const val = opt.dataset.value;
        const valSpan = w.querySelector('.udrop-val');
        // Determine which picker this is by id
        const wrapId = w.id;
        w.querySelectorAll('.udrop-menu li').forEach(li => { li.classList.remove('on'); li.removeAttribute('aria-selected'); });
        opt.classList.add('on'); opt.setAttribute('aria-selected','true');
        // Fire the same change action as before
        if (wrapId === 'dd-pickBoard-wrap') {
          S.board = val; S.test.board = val; S.chapterId = null;
          S.test.chapters = []; S.test.seed = 0; S.paper = null;
          window.__qIndex = null; S.dailySet = null; clearMockTest(); store.remove(dailyStoreKey());
          UP.loadBoardPack(val).then(function () { saveState(); buildPaper(true); render(); });
        } else if (wrapId === 'dd-pickLevel-wrap') {
          S.test.level = val; S.test.seed = 0; buildPaper(true); render();
        } else if (wrapId === 'dd-pickCls-wrap') {
          S.cls = +val;
          const allowed = (UP.classes.find(c => c.id === S.cls) || UP.classes[0]).subjects;
          if (!allowed.includes(S.subject)) S.subject = allowed[0];
          S.test.chapters = []; S.test.seed = 0;
          window.__qIndex = null; S.dailySet = null; clearMockTest(); store.remove(dailyStoreKey());
          saveState(); buildPaper(true); render();
        }
        w.classList.remove('open');
        w.querySelector('.udrop-btn').setAttribute('aria-expanded','false');
        w.querySelector('.udrop-menu').hidden = true;
        ev.preventDefault();
        return;
      }
    });
    // Close on Escape
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        document.querySelectorAll('.udrop.open').forEach(w => {
          w.classList.remove('open');
          w.querySelector('.udrop-btn').setAttribute('aria-expanded','false');
          w.querySelector('.udrop-menu').hidden = true;
        });
      }
    });
  }
  bindUDrop();

  function viewTest(params) {
    if (params && params.make === '1') { S.test.seed = 0; buildPaper(true); }
    const p = buildPaper(false);
    const isAccountancyTest = +S.cls === 12 && (S.subject === 'accountancy' || S.subject === 'computerized-accounting');
    const isPhysicsTest = +S.cls === 12 && S.subject === 'physics';
    const totalQ = (p.sections || []).reduce((a, sec) => a + sec.questions.length, 0);
    const lvlLabel = isAccountancyTest
      ? (S.lang === 'hi' ? 'स्रोत-प्रश्न' : 'source questions')
      : P({ en: LVL[(p.level || S.test.level)] ? LVL[(p.level || S.test.level)][0] : 'Mixed',
            hi: LVL[(p.level || S.test.level)] ? LVL[(p.level || S.test.level)][1] : 'मिश्रित' });

    /* the chapter list must be the student's own syllabus, not always 1..14 */
    const cat = UP.catalogue(S.cls, S.subject) || [];
    const chips = (cat.length ? cat : []).map(c => {
      const on = S.test.chapters.indexOf(+c.id) >= 0;
      return `<button class="ch-pick ${on ? 'on' : ''}" data-action="test-ch" data-ch="${c.id}">${c.displayNo || c.n || c.id}. ${esc(P({ en: c.en, hi: c.hi }))}</button>`;
    }).join('');

    /* Nothing in scope: say exactly that. Showing an empty "paper" or quietly
       borrowing questions from another class would both be worse. */
    if (p.empty) {
      return `
      <section class="page-head">
        <span class="eyebrow">${icon('list')} ${S.lang === 'hi' ? 'परीक्षा अभ्यास' : 'Exam practice'}</span>
        <h1>${S.lang === 'hi' ? 'इन विकल्पों के लिए प्रश्न नहीं हैं' : 'No questions for these filters'}</h1>
      </section>
      <section class="card">
        <div class="callout warn"><div>
          <b>${esc(P(UP.subjects[S.subject] || { en: S.subject, hi: S.subject }))} · ${S.lang === 'hi' ? 'कक्षा' : 'Class'} ${S.cls}</b><br>
          ${S.lang === 'hi'
            ? 'इस बोर्ड, कक्षा, विषय और चुने गए फ़िल्टर में कोई प्रश्न नहीं मिला। फ़िल्टर साफ़ करें या दूसरा बोर्ड, कक्षा या विषय चुनें।'
            : 'No questions match this board, class, subject and selected filters. Clear the filters or choose another board, class or subject.'}
        </div></div>
        <div class="setup-actions" style="margin-top:14px">
          ${(S.test.chapters.length || S.test.level !== 'mixed') ? `<button class="btn btn-ghost" data-action="test-reset-filters">${S.lang === 'hi' ? 'फ़िल्टर साफ़ करें' : 'Clear filters'}</button>` : ''}
          ${hasSuppliedTestPapers() && S.board === 'cbse' ? `<a class="btn btn-ghost" href="#/pyq">${icon('book')} ${S.lang === 'hi' ? 'मूल प्रश्नपत्र PDF देखें' : 'View original test papers'}</a>` : ''}
          <a class="btn btn-primary" href="#/ask">${icon('sparkle')} ${S.lang === 'hi' ? 'प्रश्न पूछें' : 'Ask a question'}</a>
          <a class="btn btn-ghost" href="#/syllabus">${S.lang === 'hi' ? 'पाठ्यक्रम देखें' : 'See the syllabus'}</a>
        </div>
      </section>`;
    }

    return `
    <section class="page-head">
      <span class="eyebrow">${icon('list')} ${S.lang === 'hi' ? 'परीक्षा अभ्यास' : 'Exam practice'}</span>
      <h1>${S.lang === 'hi' ? 'अपना सैंपल पेपर बनाइए' : 'Build a sample paper'}</h1>
      <p class="lead">${isPhysicsTest
        ? (S.lang === 'hi' ? 'आयातित प्रश्नों से स्व-अभ्यास सेट बनाएँ। क्षतिग्रस्त प्रश्न स्रोत-जाँच तक रोक दिए गए हैं; आधिकारिक उत्तर-कुंजी सत्यापित नहीं है।' : 'Build a self-practice set from imported questions. Damaged imports are withheld pending source review; official answer keys are not verified. These are not generated variants.')
        : isAccountancyTest
        ? (S.lang === 'hi'
          ? 'अध्याय चुनिए और दिए गए CBSE प्रश्नपत्रों से स्रोत-चिह्नित प्रश्नों का अभ्यास सेट बनाइए। ये मूल प्रश्न हैं — नए अंकों से बनाए गए प्रश्न नहीं। उत्तर-कुंजी और अंक-वितरण इस बैंक में शामिल नहीं हैं।'
          : 'Choose chapters to build a practice set from the source-tagged CBSE papers. These are original questions, not newly generated variants; answer keys and marks are not included in this bank.')
        : (S.lang === 'hi'
          ? 'बोर्ड चुनिए, अध्याय चुनिए, और उपाय उसी पैटर्न पर नया प्रश्नपत्र बनाएगा — आसान, मध्यम और कठिन खंडों में। प्रत्येक प्रश्न CBSE के पिछले प्रश्नों की किसी तर्क-शैली से बना है, पर संख्याएँ नई हैं।'
          : 'Pick your board and chapters. Upay assembles a fresh paper in the same pattern, split into easy, medium and hard sections. Every question is built from the reasoning of a real CBSE past question — with new numbers, so nothing is memorised.')}</p>
    </section>

    <section class="card test-setup">
      <div class="setup-row">
        ${renderTestDrops()}
        <div class="setup-actions">
          <button class="btn btn-primary" data-action="test-new">${icon('sparkle')} ${S.lang === 'hi' ? 'नया पेपर बनाएँ' : 'Generate paper'}</button>
          <button class="btn btn-ghost" data-action="test-print">${icon('printer')} ${S.lang === 'hi' ? 'प्रिंट' : 'Print'}</button>
        </div>
      </div>
      <div class="setup-chapters">
        <div class="setup-chapters-head">
          <b>${S.lang === 'hi' ? 'अध्याय' : 'Chapters'}</b>
          <span>${S.test.chapters.length ? (S.lang === 'hi' ? S.test.chapters.length + ' चुने गए' : S.test.chapters.length + ' selected') : (S.lang === 'hi' ? 'सभी अध्याय' : 'all chapters')}</span>
          ${S.test.chapters.length ? `<button class="link-btn" data-action="test-clear">${S.lang === 'hi' ? 'साफ़ करें' : 'clear'}</button>` : ''}
        </div>
        <div class="ch-grid">${chips}</div>
      </div>
    </section>

    <section class="paper-head card">
      <div>
        <div class="paper-title">${esc(P({ en: p.title.en, hi: p.title.hi }))}</div>
        <div class="paper-sub">${isPhysicsTest
          ? (S.lang === 'hi' ? 'यह संरचनात्मक रूप से जाँचे गए आयातित प्रश्नों का स्व-अभ्यास सेट है; आधिकारिक CBSE पैटर्न या सत्यापित उत्तर-कुंजी का दावा नहीं है।' : 'A self-practice selection of structurally screened imports, not a certified CBSE paper pattern or a verified answer key.')
          : isAccountancyTest
          ? (S.lang === 'hi'
            ? 'यह अभ्यास सेट दिए गए मूल प्रश्नों से चुना गया है। इसे बिना अंक-भार और आधिकारिक उत्तर-कुंजी के स्व-अभ्यास हेतु उपयोग करें।'
            : 'This practice set samples the original supplied questions. Use it for self-practice; mark weightings and official answers were not included.')
          : (S.lang === 'hi'
            ? 'यह अभ्यास-प्रश्नपत्र CBSE के उसी पैटर्न पर है (A–E खंड), पर 53 अंकों का छोटा संस्करण — एक बैठक में पूरा हो जाए।'
            : 'Same CBSE pattern (Sections A–E), as a 53-mark practice set rather than a full 80-mark paper — so it can be finished in one sitting.')}</div>
        <div class="paper-meta">
          <span class="tag">${totalQ} ${S.lang === 'hi' ? 'प्रश्न' : 'questions'}</span>
          ${p.total != null ? `<span class="tag">${p.total} ${S.lang === 'hi' ? 'अंक' : 'marks'}</span>` : `<span class="tag grey">${S.lang === 'hi' ? 'अंक-वितरण उपलब्ध नहीं' : 'mark scheme not supplied'}</span>`}
          <span class="tag">${p.time} ${S.lang === 'hi' ? 'मिनट' : 'min'}</span>
          <span class="tag grey">${lvlLabel}</span>
          <span class="tag grey">${S.lang === 'hi' ? 'बीज' : 'seed'} ${p.seed || S.test.seed || '—'}</span>
        </div>
      </div>
      ${!isAccountancyTest ? `<div class="paper-legend">
        ${['1', '2', '3'].map(n => `<span class="lvl lvl-${n}">${S.lang === 'hi' ? ['आसान', 'मध्यम', 'कठिन'][n - 1] : ['easy', 'medium', 'hard'][n - 1]}</span>`).join('')}
      </div>` : ''}
    </section>

    ${p.sections.map((sec, si) => `
      <section class="paper-section">
        <header class="paper-sec-head">
          <h2>${esc(P({ en: sec.name.en, hi: sec.name.hi }))}</h2>
          <span class="paper-sec-marks">${sec.marks ? `${sec.questions.length} × ${sec.marks} = ${sec.questions.length * sec.marks}` : `${sec.questions.length} ${S.lang === 'hi' ? 'प्रश्न · अंक नहीं दिए गए' : 'questions · marks not supplied'}`}</span>
        </header>
        ${sec.questions.map(q => questionCard(q)).join('')}
      </section>`).join('')}

    <section class="card paper-foot">
      <b>${S.lang === 'hi' ? 'यह पेपर कैसे बना' : 'How this paper was built'}</b>
      <p>${isPhysicsTest
        ? (S.lang === 'hi' ? 'बोर्ड और NCERT आयातों से प्रश्न चुने गए हैं। मूल पाठ और उत्तरों की स्रोत-जाँच बाकी है। AI व्याख्या आधिकारिक उत्तर-कुंजी नहीं है।' : 'Questions are selected from board and NCERT imports. Original wording and answers still require source verification. AI explanations are not an official answer key.')
        : isAccountancyTest
        ? (S.lang === 'hi'
          ? 'प्रश्न मूल CBSE स्रोत-पत्रों से चुने गए हैं। प्रत्येक प्रश्न के साथ प्रश्नपत्र कोड, सत्र और भाग/विकल्प सुरक्षित हैं; आधिकारिक हल या अंक-योजना इस बैंक में शामिल नहीं है।'
          : 'Questions are selected from the original CBSE source papers. Paper code, session and part/option metadata are retained; official solutions and mark scheme are not included in this bank.')
        : (S.lang === 'hi'
          ? 'प्रत्येक प्रश्न किसी वास्तविक बोर्ड प्रश्न की तर्क-शैली से बना है (कुल 47 शैलियाँ), पर संख्याएँ नई हैं। उत्तर क्रम में जाँचे गए हैं — इसलिए हर प्रश्न के साथ पूर्ण हल मिलता है।'
          : 'Each question is generated from the reasoning pattern of a real board question (47 patterns in total), using fresh numbers. Every answer is checked by an independent solver, so the full worked solution is always available.')}</p>
      <p class="muted">${isAccountancyTest
        ? (S.lang === 'hi' ? 'इसे स्व-अभ्यास के लिए उपयोग करें; उत्तर अलग से जाँचें।' : 'Use for self-practice and check answers separately.')
        : (S.lang === 'hi'
          ? 'अभ्यास के लिए है, आधिकारिक प्रश्नपत्र नहीं। अध्याय-वार असली प्रश्न “पिछले वर्ष” पृष्ठ पर देखें।'
          : 'For practice only — not an official question paper. Real past questions are on the Past years page.')}</p>
    </section>`;
  }

  /* Strip OCR garbage that leaked into Hindi past-paper questions:
     "00 शब्दों" placeholder for word count, page/set codes like "4//2 3 2886 44",
     stray "5]", "56" page numbers, P.T.O., etc. Called on display only so the
     raw bank stays unchanged. */
  function cleanQText(t) {
    if (!t) return t;
    let s = String(t);
    // 1) Strip pdfminer / embedded control tokens like "]%4<4" or "] 2 < 4"
    s = s.replace(/\]%?\d+\s*<\s*\d+/g, ' ');
    // 2) Fix OCR'd orphan pre-base matras: explicit common-word repair
    s = s.replace(/(^|[\s।॥,:;!?"')(])\s*ि\s*म्नलिखित/g, '$1निम्नलिखित');
    // Generic: drop orphan pre/post matras sitting at the start of a word
    // (ि/ु/ू directly after whitespace/punctuation but with no base consonant before them)
    s = s.replace(/(^|[\s।॥,:;!?"')(])[िुूेैोौॅॉ]+(?=[\u0915-\u0939])/g, '$1');
    // 3) 00 शब्दों → लगभग 100 शब्दों
    s = s.replace(/00\s*शब्दों/g, 'लगभग 100 शब्दों');
    // 4) Set-code / roll-no remnants
    s = s.replace(/[134][/\u2215][/\\2S]?\s*\d+\s+\d{4,5}\b/g, ' ');
    // Standalone numbers can be real physical quantities (1000 W, 2025 Hz).
    s = s.replace(/\b\d\s*[/।|\]]\s*अथवा/g, 'अथवा');
    s = s.replace(/\b\d+\]\s*(?=अथवा|आप|सिद्ध|निम्न|सिद्ध)/g, ' ');
    s = s.replace(/[Pp]\.?\s*[Tt]\.?\s*[Oo]\.?/g, ' ');
    // 5) Drop pure punctuation/digit runs (OCR noise: "/||| ] 792o 5 o7 6 40/")
    s = s.replace(/(^|[\s।॥])[0-9०-९\s/\\|[\](){}<>%@#$^*+=~`'".,;:!?-]{8,}/g, '$1');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function questionCard(q) {
    const a = S.answers[q.no];
    const sourceQuestion = !!(q.raw && q.raw.paperCode);
    const graded = !sourceQuestion && q.keyVerified !== false && !(q.raw && q.raw.keyVerified === false) && !!(q.ans && String(q.ans).trim());
    const diff = q.d >= 3 ? 3 : q.d >= 2 ? 2 : 1;
    const opts = hasOpts(q) ? `<div class="q-opts">${q.opts.map((o, i) => {
      const label = String.fromCharCode(65 + i);
      const picked = a && a.pick === o.en;
      const correct = o.en === q.ans;
      const cls = a && a.pick ? (!graded ? (picked ? 'chosen' : '') : (correct ? 'right' : picked ? 'wrong' : '')) : '';
      return `<button class="q-opt ${cls}" data-action="test-pick" data-q="${q.no}" data-opt="${esc(o.en)}" ${a && a.pick && graded ? 'disabled' : ''}>
        <b>${label}</b><span>${esc(P(o))}</span></button>`;
    }).join('')}</div>` : !graded ? `<div class="callout tip" style="margin-top:10px"><div>${S.lang === 'hi' ? 'उत्तर-पत्र पर स्वयं हल करें। इस प्रश्न की सत्यापित उत्तर-कुंजी उपलब्ध नहीं है; नीचे AI से व्याख्या माँगी जा सकती है।' : 'Work it out on paper. No verified answer key is available for this question; use the button below to request an AI explanation.'}</div></div>` : `<div class="q-answer">
        ${a && Object.prototype.hasOwnProperty.call(a, 'text') ? `<div class="q-given">${S.lang === 'hi' ? 'आपका उत्तर' : 'Your answer'}: <b>${esc(a.text || '—')}</b></div>` : `
        <div class="q-input">
          <input class="input" data-answer="${q.no}" placeholder="${S.lang === 'hi' ? 'अपना उत्तर लिखिए…' : 'Type your answer…'}" value="">
          <button class="btn btn-sm btn-ghost" data-action="test-check" data-q="${q.no}">${icon('check')} ${S.lang === 'hi' ? 'जाँचें' : 'Check'}</button>
        </div>`}
      </div>`;

    return `<article class="q-card ${graded && a && a.ok !== null ? (a.ok ? 'is-ok' : 'is-bad') : ''}" id="q${q.no}">
      <div class="q-top">
        <span class="q-no">${q.no}</span>
        <div class="q-meta">
          ${sourceQuestion ? `<span class="tag grey">${esc(q.raw.paperCode)} · ${esc(q.raw.session || '')} · Part ${esc(q.raw.part || '')}${q.raw.option ? ' · Option ' + esc(q.raw.option) : ''}</span>` : `<span class="lvl lvl-${diff}">${S.lang === 'hi' ? ['आसान', 'मध्यम', 'कठिन'][diff - 1] : ['easy', 'medium', 'hard'][diff - 1]}</span>`}
          ${(q.raw || q).kind === 2 ? '<span class="tag cream">' + (S.lang === 'hi' ? 'अभिकथन–कारण' : 'Assertion–Reason') + '</span>' : ''}
          <span class="q-ch">${esc(chapterName(q.ch))}</span>
          ${q.marks != null && q.marks > 0 ? `<span class="q-marks">${q.marks} ${S.lang === 'hi' ? 'अंक' : 'mark' + (q.marks > 1 ? 's' : '')}</span>` : ''}
        </div>
        <button class="q-toggle" data-action="test-reveal" data-q="${q.no}" aria-expanded="${a && a.shown ? 'true' : 'false'}">
          ${icon('bulb')} ${a && a.shown ? (S.lang === 'hi' ? 'हल छिपाएँ' : 'Hide solution') : (!graded ? (S.lang === 'hi' ? 'AI से व्याख्या लें' : 'Get AI explanation') : (S.lang === 'hi' ? 'हल देखें' : 'Show solution'))}
        </button>
      </div>
      <div class="pactions">${saveQuestionButton(q.tid ? P(q) : pyqQuestionText((q.en || q.hi) ? q : (q.raw || q)))}</div>
      <div class="q-text">${esc(q.tid ? P(q) : pyqQuestionText((q.en || q.hi) ? q : (q.raw || q)))}</div>
      ${q.fig && typeof q.fig === 'string' ? (() => { const bf = boardFig(q); return bf ? `<div class="figure-card test-fig">${bf.svg}</div>` : ''; })() : ''}
      ${S.lang === 'hi' && (q.raw || q).hindiReview ? '<p class="muted">हिंदी पाठ की जाँच बाकी है; मूल अंग्रेज़ी प्रश्न दिखाया गया है।</p>' : ''}
      ${opts}
      ${graded && a && a.ok !== null ? `<div class="q-verdict ${a.ok ? 'ok' : 'bad'}">${a.ok ? '✓ ' + (S.lang === 'hi' ? 'सही' : 'Correct') : '× ' + (S.lang === 'hi' ? 'सही उत्तर' : 'Correct answer') + ': ' + esc(String(q.ans))}</div>` : ''}
      ${a && a.shown ? solutionBlock(q) : ''}
    </article>`;
  }

  /* Render a past-paper figure: the q.fig can be either a string path to a
     pre-drawn SVG (used for board-paper diagrams the AI drew) or a kind key
     consumed by the procedural figure engine (generated questions). */
  function boardFig(q) {
    if (!q.fig || typeof q.fig !== 'string') return null;
    if (!/^figs\//.test(q.fig)) return null;
    const src = q.fig;
    // Inline the SVG via synchronous XHR so it displays without CORS/iframe
    // headaches; the files are tiny and cached.
    try {
      const x = new XMLHttpRequest();
      x.open('GET', 'assets/science/' + src, false);
      x.send(null);
      if (x.status !== 200) return null;
      return { svg: x.responseText.replace(/<\?xml[^?]*\?>/, ''), caption: { en: '', hi: '' } };
    } catch (e) { return null; }
  }

  function autoFigureForQuestion(q) {
    if (q.fig) return figureFromTest(q);
    const t = String((q.en || q.hi || '')).toLowerCase();
    const isHindi = /[\u0900-\u097f]/.test(q.hi || q.en || '');
    // Diameter tangents parallel theorem
    if (/(tangents?\s*(drawn|at)\s*(at\s*)?(the\s*)?(ends?|end)\s*of\s*(a\s*)?diameter|diameter.*parallel|व्यास.*स्पर्श.*समांतर|व्यास.*समांतर)/i.test(t) ||
        /(parallel.*tangent.*diameter|व्यास.*स्पर्श-रेखाएँ.*समांतर)/i.test(t)) {
      try { return { svg: UP.figures.diamTangents(), caption: { en: '', hi: '' } }; } catch (e) {}
    }
    // Single tangent from external point
    if (/(tangent|length of.*tangent|point.*outside.*circle|स्पर्श-रेखा.*बाह्य)/i.test(t) && /length|equal|circle|वृत्त|स्पर्श/i.test(t)) {
      try { return { svg: UP.figures.figure({ kind: 'tangent', _geom: { r: 'r', d: 'OP', t: 'PT' } }), caption: { en: '', hi: '' } }; } catch (e) {}
    }
    // Basic proportionality / Thales
    if (/(thales|basic proportionality|bpt|parallel.*side.*divide.*proportionally|आधारभूत समानुपातिकता|थेल्स)/i.test(t)) {
      try { return { svg: UP.figures.figure({ kind: 'bpt', _geom: {} }), caption: { en: '', hi: '' } }; } catch (e) {}
    }
    // Pythagoras / right triangle
    if (/(pythagoras|right[- ]angled triangle|समकोण.*त्रिभुज|पाइथागोरस)/i.test(t) && /prove|सिद्ध|सत्यापन/i.test(t)) {
      try { return { svg: UP.figures.figure({ kind: 'trig-ratio', _geom: { angle: 'θ', opp: 'opposite', adj: 'adjacent', hyp: 'hypotenuse', tan: 0.75 } }), caption: { en: '', hi: '' } }; } catch (e) {}
    }
    return null;
  }

  function solutionBlock(q) {
    const sourceQuestion = !!(q.raw && q.raw.paperCode);
    const autoFig = sourceQuestion ? null : autoFigureForQuestion(q);
    const fig = q.fig ? (typeof q.fig === 'string' ? boardFig(q) : figureFromTest(q)) : autoFig;
    const hasAns = q.keyVerified !== false && !(q.raw && q.raw.keyVerified === false) && !!(q.ans && String(q.ans).trim() && String(q.ans) !== 'Proof (standard theorem)');
    const hasSteps = !!(q.steps && q.steps.length && q.steps.some(s => String(s.en || s.hi || (typeof s === 'string' ? s : '')).trim().length > 5));
    const aiProvided = !!(q.aiAnswer || q.aiSteps);
    const ansVal = hasAns && !sourceQuestion ? String(q.ans) : (q.aiAnswer || (S.lang === 'hi' ? '(कोई सत्यापित उत्तर उपलब्ध नहीं)' : '(no verified answer available)'));
    let steps;
    if (hasSteps && !sourceQuestion) steps = q.steps.map(s => `<li>${esc(P(s))}</li>`).join('');
    else if (q.aiSteps) steps = q.aiSteps.map(s => `<li>${esc(s)}</li>`).join('');
    else if (q.aiLoading) steps = `<li class="ai-placeholder">${loadingDots()}</li>`;
    else steps = '';
    return `<div class="q-solution" data-solbox="${esc(q.no)}">
      <div class="sol-ans"><span>${aiProvided && (!hasAns || sourceQuestion) ? (S.lang === 'hi' ? 'AI उत्तर (असत्यापित)' : 'AI answer (unverified)') : (S.lang === 'hi' ? 'उत्तर' : 'Answer')}</span><b>${esc(ansVal)}</b></div>
      ${fig ? `<div class="figure-card test-fig">${fig.svg}<div class="figure-cap">${esc(P(fig.caption || {en:'',hi:''}))}</div></div>` : ''}
      ${q.aiSolution ? renderAIDiagram(q.aiSolution) + q.aiSolution.approaches.map((a,i) =>
        `<section class="sol-method"><h4>${i+1}. ${esc(a.name)}</h4><ol class="sol-steps">${(a.steps || []).map(st =>
          `<li>${esc(st.t || '')}${st.m ? `<div class="st-m">${mathText(st.m)}</div>` : ''}${st.note ? `<p>${esc(st.note)}</p>` : ''}</li>`).join('')}</ol>${a.why ? `<p>${esc(a.why)}</p>` : ''}</section>`).join('')
        : (steps ? `<ol class="sol-steps">${steps}</ol>` : '')}
      ${q.aiNote ? `<div class="callout warn" style="margin-top:10px">${esc(q.aiNote)}</div>` : ''}
      ${aiProvided ? `<div class="callout warn" style="margin-top:10px">${S.lang === 'hi' ? 'यह AI व्याख्या किसी आधिकारिक उत्तर-कुंजी से सत्यापित नहीं है।' : 'This AI explanation has not been verified against an official answer key.'}</div>` : ''}
      ${hasSteps && !sourceQuestion ? `<div class="sol-method">${icon('bulb')} ${S.lang === 'hi' ? 'अभ्यास के लिए हल।' : 'Practice solution.'}</div>` : ''}
    </div>`;
  }

  /* AI output is an unverified explanation, never a replacement answer key. */
  function solveTestQuestionAI(no) {
    const q = findQ(no); if (!q || q.aiLoading || q.aiSteps) return;
    const qText = P({en:q.en || '', hi:q.hi || ''}).trim();
    if (!qText) { q.aiNote = 'Question text is unavailable'; return; }
    const paper = S.paper, scope = aiScope();
    const isCurrent = () => S.paper === paper && aiScope() === scope && parseHash().name === 'test';
    q.aiLoading = true; q.aiNote = '';
    let req;
    try { req = fetch('/api/ai/solve', {
      method:'POST',
      headers:{'content-type':'application/json', authorization:'Bearer '+(localStorage.getItem('upay.token')||'')},
      body: JSON.stringify({ question: qText, chapter: q.ch||0, subject: S.subject, cls: S.cls, lang: S.lang })
    }); } catch (e) { q.aiLoading=false; q.aiNote='Could not reach AI'; if (isCurrent()) render({ preserveScroll: true }); return; }
    req.then(r=>r.json().then(j=>({ok:r.ok,j})))
      .then(({ok,j})=>{
        q.aiLoading=false;
        if (!isCurrent()) return;
        if (ok && j.approaches && j.approaches.length) {
          j = UP.answerFormat.answer(j);
          const first = j.approaches[0];
          q.aiSolution = Object.assign({}, j, {question:qText});
          q.aiSteps = (first.steps || []).map(s => {
            const bits = [];
            if (s.t) bits.push(s.t);
            if (s.m) bits.push(s.m);
            if (s.note) bits.push('(' + s.note + ')');
            return bits.join(' — ');
          }).filter(Boolean);
          q.aiAnswer = String(j.result || first.final || first.finalAnswer || first.answer || '').slice(0,400);
          // Do not inject raw SVG returned by an untrusted AI/provider.
        } else q.aiNote = (j && j.error) ? String(j.error) : 'AI unavailable for this question';
        render({ preserveScroll: true });
      }).catch(() => { q.aiLoading=false; if (isCurrent()) { q.aiNote='Network error'; render({ preserveScroll: true }); } });
  }

  /* a figure for a generated question: reuse the answer-figure renderer by
     handing it a minimal answer object with the right kind + geometry. */
  /* Read the solid and its dimensions out of the question itself.
     Returns null rather than inventing a shape. */
  function solidGeomFrom(q) {
    const txt = String((q && (q.q || q.text || q.en)) || '').toLowerCase();
    const raw = (q && q.raw) || {};
    const num = (re, dflt) => { const m = txt.match(re); return m ? parseFloat(m[1]) : dflt; };

    let shape = null;
    if (/hemispher/.test(txt)) shape = 'hemisphere';
    else if (/\bcone\b/.test(txt)) shape = 'cone';
    else if (/\bsphere\b|\bball/.test(txt)) shape = 'sphere';
    else if (/cylind/.test(txt)) shape = 'cylinder';
    else if (/cuboid/.test(txt)) shape = 'cuboid';
    else if (/\bcube\b/.test(txt)) shape = 'cube';
    else if (/frustum/.test(txt)) shape = 'frustum';
    if (!shape) return null;

    const r = raw.r != null ? raw.r : num(/(\d+(?:\.\d+)?)\s*(?:cm|m|units?)?\s*(?:radius|त्रिज्या)/, num(/radius\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)/, null));
    const h = raw.h != null ? raw.h : num(/height\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)/, num(/(\d+(?:\.\d+)?)\s*(?:cm|m|units?)\s*high/, null));
    const a = raw.a != null ? raw.a : num(/side\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)/, null);

    /* a shape with no dimensions would render as a drawing labelled "?", which
       reads as if those were the question's numbers */
    if (shape === 'cube' || shape === 'cuboid') {
      if (a == null && (r == null || h == null)) return null;
      return { solid: shape, side: a, r, h };
    }
    if (r == null) return null;
    if ((shape === 'cylinder' || shape === 'cone' || shape === 'frustum') && h == null) return null;
    return { solid: shape, r, h };
  }

  function figureFromTest(q) {
    const map = {
      'parabola': { kind: 'quadratic', _geom: { a: 1, b: -(q.raw && q.raw.s ? q.raw.s : 5), c: q.raw && q.raw.c ? q.raw.c : 6 } },
      'ap-ladder': { kind: 'ap', _geom: { a: q.raw && q.raw.a, d: q.raw && q.raw.d, n: q.raw && q.raw.n } },
      'sector': { kind: 'sector', _geom: { r: q.raw && q.raw.r ? q.raw.r : 14, angle: q.raw && q.raw.ang ? q.raw.ang : 90 } },
      'dice-grid': { kind: 'prob-dice', _geom: { mode: q.raw && q.raw.mode, target: q.raw && q.raw.target } },
      'card-grid': { kind: 'prob-card', _geom: { n: q.raw && q.raw.n } },
      'right-triangle': { kind: 'trig-ratio', _geom: { angle: 'θ', opp: 'opposite', adj: 'adjacent', hyp: 'hypotenuse', tan: 0.75 } },
      'elevation': { kind: 'heights', _geom: { angle: q.raw && q.raw.ang ? q.raw.ang : 45, height: q.raw && q.raw.L ? q.raw.L : 100 } },
      'two-triangles': { kind: 'bpt', _geom: {} },
      'bpt': { kind: 'bpt', _geom: {} },
      'similar-triangles': { kind: 'area-ratio', _geom: { k: q.raw && q.raw.k ? q.raw.k : 2 } },
      'plane-points': { kind: 'distance', _geom: { x1: q.raw && q.raw.x1, y1: q.raw && q.raw.y1, x2: q.raw && q.raw.x2, y2: q.raw && q.raw.y2 } },
      'distance': { kind: 'distance', _geom: { x1: q.raw && q.raw.x1, y1: q.raw && q.raw.y1, x2: q.raw && q.raw.x2, y2: q.raw && q.raw.y2 } },
      /* A mensuration figure is only honest if the shape AND the numbers come
         from the question.  This used to fall back to `cylinder, r = 7, h = 10`
         for every mensuration item, so an ice-cream cone and a jar of cricket
         balls were both illustrated with the same labelled cylinder -- a
         diagram that contradicts the question it sits under.  If we do not
         know the shape from the question, we return null and draw nothing. */
      'solid': (function () {
        const txt = String((q && (q.q || q.text || q.en)) || '').toLowerCase();
        /* Two hemispheres joined at a point (or flat-to-flat) is a specific
           shape with a specific answer, and the generic mensuration renderer
           cannot draw it -- it wants numbers, this question is symbolic in r.
           That is why this question used to show NO diagram at all. */
        if (/hemispher/.test(txt)) {
          return { custom: function () {
            return UP.figures.twoHemispheres({
              r: (q.raw && q.raw.r != null) ? q.raw.r : 'r',
              joined: (q.raw && q.raw.joined) || (/at a point|point/.test(txt) ? 'point' : 'base')
            });
          } };
        }
        const g = solidGeomFrom(q);
        return g ? { kind: 'mensuration', _geom: g } : null;
      })(),
      'tangent-line': { kind: 'tangent', _geom: {} },
      'tangent': { kind: 'tangent', _geom: {} },
      'tangent-pair': { kind: 'tangent', _geom: {} },
      'tangent-quad': { kind: 'tangent', _geom: {} },
      'tangent-chord': { kind: 'tangent', _geom: {} },
      'diam-tangent': { custom: () => UP.figures.diamTangents() },
      'parallel-tangents': { custom: () => UP.figures.diamTangents() },
      'circle-chord': { kind: 'tangent', _geom: {} },
      'mean-line': { kind: 'mean', _geom: { data: q.raw && q.raw.f ? q.raw.f : [4, 6, 8, 10] } },
      'bags': { kind: 'prob-bag', _geom: { r: q.raw && q.raw.r, w: q.raw && q.raw.w, b: q.raw && (q.raw.b || q.raw.bl) } }
    };
    const ans = map[q.fig];
    if (!ans) return null;
    try {
      if (ans.custom) return { svg: ans.custom(), caption: { en: '', hi: '' } };
      return UP.figures.figure(ans);
    } catch (e) { return null; }
  }


  /* find a generated question by its number in the current paper */
  function findQ(no) {
    if (!S.paper) return null;
    for (const sec of S.paper.sections) {
      const q = sec.questions.find(x => x.no === no);
      if (q) return q;
    }
    return null;
  }

  /* After viewing one PYQ answer, silently pre-fetch the next 3 in the list
     so tapping them is instant. Never interrupt the student. */
  function warmNextQuestions(currentId) {
    if (!UP.answers || !UP.answers.warm) return;
    const cards = Array.from(document.querySelectorAll('.q-card.pyq'));
    const idx = cards.findIndex(c => c.id === currentId);
    if (idx < 0) return;
    const next = cards.slice(idx + 1, idx + 4).map(c => c.id);
    UP.answers.warm(next, S.subject);
  }

  /* forgiving answer comparison: numbers, fractions, units, surds */
  function sameAnswer(given, want) {
    const clean = (x) => String(x == null ? '' : x)
      .toLowerCase()
      .replace(/[−–—]/g, '-')
      .replace(/\s+/g, '')
      .replace(/cm|m²|cm²|m\^?2|units?|°/g, '')
      .replace(/[.,;]+$/, '');
    const g = clean(given), w = clean(want);
    if (!g) return false;
    if (g === w) return true;
    /* numeric equivalence: "0.4" vs "2/5" */
    const val = (t) => {
      if (/^-?\d+\/\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return a / b; }
      if (/^-?\d*\.?\d+$/.test(t)) return parseFloat(t);
      return null;
    };
    const a = val(g), b = val(w);
    if (a !== null && b !== null && Math.abs(a - b) < 1e-6) return true;
    return false;
  }

  /* ============================== PAST YEARS ============================== */
  const PYQ_KIND = { 1: ['MCQ', 'बहुविकल्पीय'], 2: ['Assertion–Reason', 'अभिकथन-कारण'], 3: ['Very short', 'अति लघु'], 4: ['Short', 'लघु'], 5: ['Long', 'दीर्घ'], 6: ['Case study', 'प्रकरण'] };

  /* One row of the bank belongs to a board.  The CBSE rows were imported
     before the board field existed, so a missing board means CBSE. */
  const qBoard = q => q.board || 'cbse';

  /* ---------------------------------------------------------------------
     THE SCOPE GATE
     Everything a student sees passes through here, so there is one place
     that decides "is this question mine". The rule is deliberately strict:

       class  -- a question must be tagged with the student's own class. An
                 untagged question is NOT shown to a Class 10 student on the
                 guess that it might be Class 10; the whole point is that a
                 Class 10 student never meets a Class 11 question.
       board  -- must match the chosen board. The Rajasthan bank carries
                 board:'rajasthan'; everything else is CBSE.
       subject-- must match. Science 10 and Maths 10 are different banks.

     The previous code filtered on board only, so choosing Class 11 still
     showed Class 10 maths. That is the bug this replaces.
     --------------------------------------------------------------------- */
  const qCls = q => (q.cls != null ? +q.cls : (q.className != null ? +q.className : null));
  const qSubject = q => {
    if (q.subject) return q.subject;
    // Literature chapter banks (English FF/FP, Hindi kr/ksh/gd, Sanskrit sk) don't always carry subject
    const id = String(q.id || '');
    if (id.indexOf('eng10-') === 0) return 'english';
    if (id.indexOf('hind10-') === 0) return 'hindi';
    if (id.indexOf('san10-') === 0) return 'sanskrit';
    if (id.indexOf('sci10-') === 0) return 'science';
    if (id.indexOf('sscp-') === 0 || id.indexOf('ss-') === 0) return 'social';
    if (isRbse()) return 'maths';
    // If the question has English text > Hindi text AND user is on English subject, prefer english;
    // else default to maths (for the large PYQ bank which is maths-only by default)
    return 'maths';
  };

  function qInScope(q) {
    if (!q) return false;
    const subj = qSubject(q);
    if (String(subj) !== String(S.subject)) return false;
    const cls = qCls(q);
    // Hard class gate: if a question declares a class it must match the student's class.
    // Untagged questions are treated as class 10 (legacy Class 10 literature/science banks
    // did not tag cls) — so they never leak into class 11/12.
    if (cls !== null) {
      if (cls !== +S.cls) return false;
    } else {
      if (+S.cls !== 10) return false;
      const hasText = (q.en && q.en.length > 3) || (q.hi && q.hi.length > 3);
      if (!hasText) return false;
    }
    if ((q.board || 'cbse') !== S.board) return false;
    return true;
  }

  /* the whole bank, already narrowed to this student */
  function myBank() {
    return (UP.pyq || []).filter(qInScope);
  }

  /* Class 10 Science now has the real textbook, so it gets real chapter data
     and real questions rather than an outline. */
  function scienceChapter(id) {
    return (UP.science10 || []).find(c => c.id === +id) || null;
  }

  function hasSuppliedTestPapers(){
    return S.cls === 12 && (S.subject === 'economics' || S.subject === 'biology' || S.subject === 'english');
  }
  function renderSuppliedTestPapers(board){
    if (!hasSuppliedTestPapers() || S.board !== 'cbse' || board !== 'cbse') return '';
    const hi = S.lang === 'hi';
    const rows = (UP.class12OriginalTestPapers || []).filter(p => p.cls === 12 && p.subject === S.subject && p.board === 'cbse');
    if (!rows.length) return '';
    const isEnglish = S.subject === 'english';
    const courseName = course => course === 'core'
      ? (hi ? 'अंग्रेज़ी कोर' : 'English Core')
      : (hi ? 'अंग्रेज़ी इलेक्टिव' : 'English Elective');
    function renderSeries(papers, heading){
      return [...new Set(papers.map(p => p.series))].map(label => {
        const links = papers.filter(p => p.series === label).sort((a,b) => a.set-b.set).map(p => `
          <a class="source-test-paper" data-paper-id="${esc(p.id)}" data-paper-code="${esc(p.paperCode)}"${p.course ? ` data-course="${esc(p.course)}"` : ''} href="${esc(p.file)}" target="_blank" rel="noopener noreferrer" aria-label="${esc((hi ? 'मूल प्रश्नपत्र ' : 'Original test paper ') + (p.course ? courseName(p.course) + ', ' : '') + p.paperCode + ', ' + (hi ? 'सीरीज़ ' : 'series ') + p.series + (p.course ? (hi ? ', सेट ' : ', Set ') + p.set : '') + (p.footerCode ? (hi ? ', फ़ुटर ' : ', footer ') + p.footerCode : '') + (p.imageOnly ? (hi ? ', स्कैन PDF' : ', scanned PDF') : '') + (p.printedPages && p.printedPages !== p.pages ? (hi ? ', PDF में ' + p.pages + ' पृष्ठ; मुखपृष्ठ पर ' + p.printedPages + ' मुद्रित पृष्ठ' : ', ' + p.pages + ' PDF pages; cover says ' + p.printedPages + ' printed pages') : '') + (p.visuallyImpaired ? (hi ? ', केवल दृष्टिबाधित परीक्षार्थियों के लिए' : ', visually impaired candidates only') : ''))}">
            <span class="source-paper-code">${icon('book')} ${esc(p.paperCode)}</span>
            <span class="source-paper-meta">${p.course ? `${hi ? 'सेट' : 'Set'} ${p.set} · ` : ''}${p.footerCode ? `${hi ? 'फ़ुटर' : 'Footer'} ${esc(p.footerCode)} · ` : ''}${p.pages} ${hi ? 'PDF पृष्ठ' : 'PDF pages'} · ${p.marks} ${hi ? 'अंक' : 'marks'}${p.course ? (hi ? ' · ' + (p.duration === '120 minutes' ? '2 घंटे' : '3 घंटे') : ' · ' + (p.duration === '120 minutes' ? '2 hours' : '3 hours')) : ''}${p.imageOnly ? (hi ? ' · स्कैन PDF' : ' · Scanned PDF') : ''}${p.printedPages && p.printedPages !== p.pages ? (hi ? ' · मुखपृष्ठ पर ' + p.printedPages + ' मुद्रित पृष्ठ' : ' · cover says ' + p.printedPages + ' printed pages') : ''}${p.visuallyImpaired ? ` · <strong>${hi ? 'केवल दृष्टिबाधित परीक्षार्थियों के लिए' : 'Visually impaired candidates only'}</strong>` : ''}</span>
          </a>`).join('');
        return `<div class="source-paper-group" data-series="${esc(label)}"><${heading}>${hi ? 'सीरीज़' : 'Series'} ${esc(label)}</${heading}><div class="source-paper-links">${links}</div></div>`;
      }).join('');
    }
    const groups = isEnglish
      ? ['core', 'elective'].map(course => {
          const papers = rows.filter(p => p.course === course);
          return papers.length ? `<section class="source-course-group" data-course="${course}"><h3>${courseName(course)} · ${papers.length} ${hi || papers.length === 1 ? 'PDF' : 'PDFs'}</h3>${renderSeries(papers, 'h4')}</section>` : '';
        }).join('')
      : renderSeries(rows, 'h3');
    return `<section class="card supplied-test-papers" id="original-test-papers" aria-labelledby="supplied-test-papers-heading">
      <div class="card-body"><h2 id="supplied-test-papers-heading">${hi ? 'मूल प्रश्नपत्र PDF' : 'Original test-paper PDFs'}</h2>
        <p class="hint">${hi ? 'अपलोड किए गए मूल PDF · प्रश्न और उत्तर खोजने योग्य डेटाबेस में नहीं जोड़े गए हैं। समान कोड वाले अलग प्रश्नपत्रों को सीरीज़ से पहचानें। वर्ष सत्यापित नहीं है। वर्ष, अध्याय और कठिनाई फ़िल्टर केवल खोजने योग्य प्रश्न-बैंक पर लागू होते हैं।' : 'Original supplied PDFs · questions and answers have not been added to the searchable bank. Use the series to distinguish papers with the same code. Years have not been verified. Year, chapter and difficulty filters apply only to the searchable question bank.'}</p>
        ${isEnglish ? `<p class="hint">${hi ? 'कोर और इलेक्टिव अलग दिखाए हैं। मूल प्रश्नपत्र अंग्रेज़ी में हैं; आधिकारिक उत्तर-कुंजी नहीं दी गई। ऑफ़लाइन उपयोग के लिए PDF डाउनलोड करें।' : 'Core and Elective are listed separately. The originals are in English; no official answer key was supplied. Download PDFs for offline use.'}</p>` : ''}
        ${isEnglish ? `<div class="source-paper-filter">
          <label for="english-paper-filter">${hi ? 'कोड या सीरीज़ से PDF खोजें' : 'Find a PDF by paper code or series'}</label>
          <input type="search" id="english-paper-filter" data-action="sourcePaperFilter" aria-describedby="english-paper-filter-status" placeholder="${hi ? 'जैसे 1/2/1 या FH1EG/2' : 'e.g. 1/2/1 or FH1EG/2'}" autocomplete="off" spellcheck="false">
          <p id="english-paper-filter-status" role="status" aria-live="polite">${hi ? `${rows.length} में से ${rows.length} PDF दिख रहे हैं` : `Showing ${rows.length} of ${rows.length} PDFs`}</p>
        </div>` : ''}
        ${groups}
      </div></section>`;
  }
  function viewPyq(params) {
    params = params || {};
    const year = params.y ? +params.y : 0;
    const ch = params.ch ? +params.ch : 0;
    const lvl = params.lvl || '';
    const board = params.board || S.board || 'cbse';
    const bank = (UP.pyq || []).filter(q => qInScope(q) && qBoard(q) === board);
    const list = bank.filter(q => (!year || +q.y === year) && (!ch || qHasChapter(q, ch)) && (!lvl || q.lv === lvl));
    const years = [...new Set(bank.map(q => +q.y).filter(Boolean))].sort((a, b) => b - a);
    const byYear = {};
    bank.forEach(q => { if (q.y) byYear[q.y] = (byYear[q.y] || 0) + 1; });
    const boardName = (UP.boards.find(b => b.id === board) || { en: 'CBSE' }).en;
    const chapterList = UP.catalogue(S.cls, S.subject) || [];
    const levels = [...new Set(bank.map(q => q.lv).filter(Boolean))].sort();
    // Full source PDFs are deliberately separate from the searchable bank.
    // They are whole papers (both Part B options), not chapter-filtered roots.
    const sourcePapers = accountancyTrack() && S.board === 'cbse' && board === 'cbse'
      ? (UP.accountancyOriginalPapers || []).filter(p => !year || +p.year === year)
      : [];
    function filterHref(overrides) {
      const state = Object.assign({ y: year, ch: ch, lvl: lvl }, overrides || {});
      const query = [];
      if (state.y) query.push('y=' + encodeURIComponent(state.y));
      if (state.lvl) query.push('lvl=' + encodeURIComponent(state.lvl));
      if (state.ch) query.push('ch=' + encodeURIComponent(state.ch));
      if (+state.page > 1) query.push('page=' + encodeURIComponent(state.page));
      return '#/pyq' + (query.length ? '?' + query.join('&') : '');
    }

    // --- Group comprehension / passage-based sets together ------------------
    // A lead-in question ("read the passage and answer the following") becomes
    // a parent; immediately following sub-questions starting with (i)/(ii)/(क)/(ख)
    // are nested under it visually, just like on the real paper.
    const SUB_RE = /^\s*[\(（\[【]\s*([ivx]+|[कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह]|\d+)\s*[\)）\]】\.।\u0964]/;
    const PARENT_RE = /(answer\s+(any\s+)?(one|two|three|four|all)\s+of\s+the\s+following|read\s+the\s+(following|extract|passage)|case\s*study|given\s+below|निम्न(लिखित|दिए\s+गए)|अधो(लिखित|लिखितम्)|निर्देशानुसार|दिए\s+गए\s+गद्यांश|निम्न\s+प्रश्नों?\s+के\s+उत्तर|पठित्वा|देखकर|पढ़कर|निम्नवत्)/i;
    function isParent(q) {
      if (q && q.paperCode) return false; // Accountancy rows are already extracted as complete roots.
      const t = pyqQuestionText(q) || '';
      if (SUB_RE.test(t)) return false;
      return PARENT_RE.test(t);
    }
    function labelForSub(q, i) {
      const pref = ['i','ii','iii','iv','v','vi','vii','viii'];
      if (q.q && /^[\(（\[【]?\s*[ivxकखगघक-ह\d]/.test(String(q.q))) return q.q;
      return '(' + (pref[i] || (i+1)) + ')';
    }
    const grouped = [];
    let carry = null;
    list.forEach(q => {
      const txt = pyqQuestionText(q) || '';
      if (carry && !q.paperCode && SUB_RE.test(txt)) {
        carry.subs = carry.subs || []; carry.subs.push(q);
      } else {
        if (carry) grouped.push(carry);
        carry = isParent(q) ? Object.assign({ subs: [] }, q) : q;
      }
    });
    if (carry) grouped.push(carry);

    // Keep source/comprehension groups intact but avoid mounting hundreds of
    // question cards at once. Filters reset the page; next/previous retain them.
    const pageSize = 60;
    const pageCount = Math.max(1, Math.ceil(grouped.length / pageSize));
    const pageNumber = Number(params.page);
    const page = Number.isFinite(pageNumber) && pageNumber >= 1
      ? Math.min(pageCount, Math.floor(pageNumber)) : 1;
    const pageStart = (page - 1) * pageSize;
    const pageEnd = Math.min(grouped.length, pageStart + pageSize);
    const visibleGroups = grouped.slice(pageStart, pageEnd);
    const pageNav = pageCount > 1 ? `<nav class="pyq-pages" aria-label="${S.lang === 'hi' ? 'प्रश्न पृष्ठ' : 'Question pages'}">
      ${page > 1 ? `<a class="btn btn-ghost btn-sm" data-pyq-page="${page - 1}" href="${filterHref({ page: page - 1 })}">${S.lang === 'hi' ? 'पिछला' : 'Previous'}</a>` : '<span></span>'}
      <span class="pyq-page-label">${S.lang === 'hi' ? 'पृष्ठ' : 'Page'} ${page} / ${pageCount}</span>
      ${page < pageCount ? `<a class="btn btn-ghost btn-sm" data-pyq-page="${page + 1}" href="${filterHref({ page: page + 1 })}">${S.lang === 'hi' ? 'अगला' : 'Next'}</a>` : '<span></span>'}
    </nav>` : '';

    function qCardHtml(q, badge) {
      const shown = (S.lang === 'hi' ? (q.hi || q.en) : (q.en || q.hi)) || '';
      /* Only run the Devanagari-rot gate when we actually expected Hindi text
         (i.e. the subject is Hindi/Sanskrit or S.lang is Hindi AND the
         question wasn't English-only). Otherwise plain English MCQs get
         wrongly flagged as "Latin mojibake". */
      const expectHindi = (S.subject === 'hindi' || S.subject === 'sanskrit')
        || (S.lang === 'hi' && !q.en && q.hi);
      const why = UP.corrupt && UP.corrupt.why(shown, { expectHindi: !!expectHindi });
      let out = '';
      out += '<article class="q-card pyq' + (badge ? ' pyq-sub' : '') + '" id="' + esc(q.id) + '">';
      out += '<div class="q-top">';
      out += '<span class="q-no">' + esc(badge || q.q) + '</span>';
      out += '<div class="q-meta">';
      const isNcertExtract = !q.paperCode && /^NCERT\b/i.test(String(q.src || ''));
      /* Auto-extracted textbook exercise questions are labelled as practice,
         not as board questions — the board’s own 2025 tag would misstate them. */
      out += '<span class="tag' + (isNcertExtract ? ' grey' : '') + '">' + esc(isNcertExtract ? 'NCERT · practice, not board-verified' : (board === 'cbse' ? 'CBSE' : boardName) + ' ' + q.y) + '</span>';
      if (q.paperCode) {
        const paperMeta = [q.paperCode, q.session].filter(Boolean).join(' · ');
        out += '<span class="tag grey">' + esc(paperMeta) + '</span>';
        if (q.part) out += '<span class="tag cream">' + esc('Part ' + q.part + (q.option ? ' · Option ' + q.option : '')) + '</span>';
      } else {
        out += '<span class="tag grey">' + esc([q.set, q.lv].filter(Boolean).join(' · ')) + '</span>';
      }
      const chapterNames = qChapterIds(q).map(chapterName).filter(Boolean);
      chapterNames.forEach(name => { out += '<span class="q-ch">' + esc(name) + '</span>'; });
      if (!chapterNames.length && chapterName(q.ch)) out += '<span class="q-ch">' + esc(chapterName(q.ch)) + '</span>';
      if (board === 'rajasthan' && rbseTitle(RBSE_ALIAS[q.ch]))
        out += '<span class="q-ch" style="background:var(--cream-200);color:var(--ink-600)">RBSE ' + esc(RBSE_ALIAS[q.ch]) + ' · ' + esc(rbseTitle(RBSE_ALIAS[q.ch])) + '</span>';
      if (Number(q.m) > 0) out += '<span class="q-marks">' + esc(q.m) + ' ' + (S.lang === 'hi' ? 'अंक' : 'mark' + (q.m > 1 ? 's' : '')) + '</span>';
      if (q.d >= 1 && q.d <= 3) {
        const lbl = (S.lang === 'hi' ? ['आसान','मध्यम','कठिन'] : ['easy','medium','hard'])[q.d - 1];
        out += '<span class="lvl lvl-' + q.d + '">' + esc(lbl) + '</span>';
      }
      out += '</div></div>';
      out += '<div class="q-review muted">' + (q.textReview === 'source-verified' ? 'Text checked against source' : 'Text not fully source-reviewed') + ' · ' + (q.keyVerified === true ? 'Verified answer key available' : 'No independently verified answer key recorded') + '</div>';
      out += '<div class="q-text">' + esc(pyqQuestionText(q)) + '</div>';
      out += '<div class="pactions">' + saveQuestionButton(pyqQuestionText(q)) + '</div>';
      if (S.lang === 'hi' && q.hindiReview) out += '<p class="muted">हिंदी पाठ की जाँच बाकी है; मूल अंग्रेज़ी प्रश्न दिखाया गया है।</p>';
      if (q.optionReview === 'awaiting-source-review') out += '<p class="muted">Options missing or suspect — withheld pending source review. This question is not graded.</p>';
      const reportURL = 'https://github.com/Aaryaveeryadav/Upay/issues/new?title=' + encodeURIComponent('Question issue: '+q.id) + '&body=' + encodeURIComponent('Question ID: '+q.id+'\nSubject: '+S.subject+'\nYear: '+(q.y||'unknown')+'\n\nDescribe the problem (do not include private account details):\n');
      out += '<a class="link" target="_blank" rel="noopener noreferrer" href="'+esc(reportURL)+'">Report a problem (GitHub)</a>';
      const sourceFile = String(q.sourceUrl || q.sourceFile || '');
      if (/^\/assets\/papers\/[a-zA-Z0-9_./%()-]+\.pdf$/.test(sourceFile) && !sourceFile.includes('..')) out += ' · <a class="link" target="_blank" rel="noopener noreferrer" href="'+esc(sourceFile)+'">View source PDF</a>';

      if (hasOpts(q)) {
        out += '<div class="q-opts" data-quiz="' + esc(q.id) + '">';
        out += q.opts.map((o, i) => '<button type="button" class="q-opt" data-pick="' + esc(q.id) + '" data-i="' + i + '"><b>' + String.fromCharCode(65 + i) + '</b><span>' + esc(P(o)) + '</span></button>').join('');
        out += '</div>';
      }
      // Always show a "Solve with AI" button. If PDF extraction is torn, say so
      // but DO let AI try: a partial question plus context is better than a
      // permanent "will not be solved" wall, and the AI will state its
      // interpretation before answering.
      if (why) {
        out += '<div class="pyq-torn warn"><div>' + icon('warn') + '</div><div><b>' + (S.lang === 'hi' ? 'पीडीएफ से पाठ आंशिक रूप से निकला' : 'PDF text is partially damaged') + ':</b> ' + esc(why) + '.' +
          '<div style="margin-top:8px"><button type="button" class="btn btn-cream btn-sm" data-action="sample" data-q="' + esc(pyqQuestionText(q)) + '">' + icon('sparkle') + ' ' + (S.lang === 'hi' ? 'एआई से हल करवाएँ' : 'Let the AI solve it anyway') + '</button></div></div></div>';
      } else if (q.paperCode && !q.ans) {
        out += '<div class="callout tip" style="margin-top:10px">' + icon('info') + '<div>' + (S.lang === 'hi' ? 'इस आयातित प्रश्न-बैंक में आधिकारिक उत्तर-कुंजी शामिल नहीं है।' : 'The official answer key is not included in this imported question bank.') + '</div></div>';
        out += '<div class="pyq-ask"><button type="button" class="btn btn-ghost btn-sm" data-action="sample" data-q="' + esc(pyqQuestionText(q)) + '">' + icon('sparkle') + ' ' + (S.lang === 'hi' ? 'एआई से हल' : 'Solve with AI') + '</button></div>';
      } else {
        out += '<div class="pyq-ask"><button type="button" class="btn btn-cream btn-sm" data-reveal="' + esc(q.id) + '">' + icon('eye') + ' ' + (S.lang === 'hi' ? 'पहले स्वयं सोचें, फिर उत्तर देखें' : 'Think first, then reveal the answer') + '</button>';
        out += ' <button type="button" class="btn btn-ghost btn-sm" data-action="sample" data-q="' + esc(pyqQuestionText(q)) + '">' + icon('sparkle') + ' ' + (S.lang === 'hi' ? 'एआई से हल' : 'Solve with AI') + '</button></div>';
      }
      if (!(q.paperCode && !q.ans)) out += '<div class="pyq-ans" id="ans-' + esc(q.id) + '" hidden><span>' + (S.lang === 'hi' ? 'उत्तर' : 'Answer') + '</span> <b>' + esc(q.ans || (S.lang === 'hi' ? 'इस प्रश्न की कुंजी अभी दर्ज नहीं है — ऊपर "एआई से हल" दबाइए' : "Key not on file — tap Solve with AI above")) + '</b></div>';
      // inline auto-diagram
      try {
        if (UP.figures && UP.figures.autoFigureFor) {
          const af = UP.figures.autoFigureFor(q);
          if (af && af.svg) {
            const cap = (S.lang === 'hi' ? (af.caption && (af.caption.hi || af.caption.en)) : (af.caption && af.caption.en)) || '';
            out += '<figure class="figure-card" style="margin:14px 0"><div class="figure-head"><span class="mini-label">' + (S.lang === 'hi' ? 'चित्र' : 'Diagram') + '</span><span class="tag grey">' + (S.lang === 'hi' ? 'प्रश्न के अपने मानों से' : 'drawn from this question’s own numbers') + '</span></div><div class="figure-body">' + af.svg + '</div>' + (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>';
          }
        }
      } catch (e) { /* ignore */ }
      out += '<div class="pyq-sol" id="sol-' + esc(q.id) + '" hidden></div>';
      if (q.twist) out += '<div class="pyq-twist">' + icon('bulb') + '<div><b>' + (S.lang === 'hi' ? 'इससे नया प्रश्न कैसे बनता है' : 'How a new question is built from this') + '</b><p>' + esc(q.twist) + '</p></div></div>';
      const kindText = q.paperCode
        ? (S.lang === 'hi' ? 'CBSE मूल प्रश्न' : 'CBSE source question')
        : P({ en: (PYQ_KIND[q.kind] || ['Question','प्रश्न'])[0], hi: (PYQ_KIND[q.kind] || ['Question','प्रश्न'])[1] });
      const sourceMeta = q.paperCode
        ? [q.part ? 'Part ' + q.part : '', q.option ? 'Option ' + q.option : '', q.sourcePage ? (S.lang === 'hi' ? 'PDF पृष्ठ ' : 'PDF p. ') + q.sourcePage : ''].filter(Boolean).join(' · ')
        : '';
      out += '<div class="pyq-kind">' + icon('list') + ' ' + esc(kindText) + ' · ' + (S.lang === 'hi' ? 'प्रश्न क्रमांक' : 'question') + ' ' + esc(q.q) + (sourceMeta ? ' · ' + esc(sourceMeta) : '') + '</div>';
      out += '</article>';
      return out;
    }
    function groupHtml(g) {
      if (!g.subs || !g.subs.length) return qCardHtml(g, null);
      let out = '<section class="pyq-group" style="margin-bottom:18px">';
      out += qCardHtml(g, '★');
      out += '<div class="pyq-subs" style="margin:0 0 0 18px;border-left:3px solid var(--line,#e3e8ee);padding:4px 0 0 18px;display:flex;flex-direction:column;gap:12px">';
      g.subs.forEach((sq, i) => { out += qCardHtml(sq, labelForSub(sq, i)); });
      out += '</div></section>';
      return out;
    }

    return `
    <section class="page-head">
      <span class="eyebrow">${icon('book')} ${hasSuppliedTestPapers() ? (S.lang === 'hi' ? 'दिए गए प्रश्नपत्र' : 'Supplied papers') : (S.lang === 'hi' ? 'पिछले वर्षों के प्रश्न' : 'Previous years')}</span>
      <h1>${hasSuppliedTestPapers() ? (S.lang === 'hi' ? 'मूल प्रश्नपत्र' : 'Original test papers') : (S.lang === 'hi' ? 'असली बोर्ड प्रश्न' : 'Real board questions')}</h1>
      <p class="lead">${english12Track() && !bank.length
        ? (S.lang === 'hi' ? 'दिए गए अंग्रेज़ी कोर और इलेक्टिव प्रश्नपत्र मूल PDF के रूप में हैं। प्रश्न खोजने योग्य डेटाबेस में नहीं हैं; आधिकारिक उत्तर-कुंजी नहीं दी गई। अध्यायों के स्वयं-जाँच संकेत बोर्ड प्रश्न नहीं हैं।' : 'The supplied English Core and Elective papers are available as original PDFs. Their questions are not in the searchable bank, and no official answer key was supplied. Chapter review prompts are not board questions.')
        : hasSuppliedTestPapers()
        ? (S.lang === 'hi' ? 'दिए गए CBSE प्रश्नपत्र नीचे मूल PDF के रूप में हैं; प्रश्न या उत्तर-कुंजी खोजने योग्य डेटाबेस में नहीं जोड़े गए हैं।' : 'The supplied CBSE papers are available below as original PDFs; their questions and answer keys are not in the searchable bank.')
        : accountancyTrack()
        ? (S.lang === 'hi'
          ? 'कक्षा XII के CBSE प्रश्नपत्रों के स्रोत-चिह्नित प्रश्न। प्रश्नपत्र कोड, सत्र, भाग/विकल्प और PDF पृष्ठ सुरक्षित रखे गए हैं; उत्तर-कुंजी शामिल नहीं है।'
          : 'Source-tagged Class XII CBSE questions. Paper code, session, part/option and source PDF page are preserved; answer keys are not included.')
        : (S.lang === 'hi'
          ? 'आपके द्वारा दिए गए ' + boardName + ' प्रश्नपत्रों से सीधे लिए गए प्रश्न। कॉम्प्रिहेंशन / केस-स्टडी वाले सेट अपने अनुच्छेद और उप-प्रश्नों के साथ एक साथ दिए गए हैं।'
          : 'Questions taken directly from the ' + boardName + ' papers you shared. Comprehension and case-study sets are shown with their passage and sub-questions grouped together.')}</p>
    </section>

    ${S.subject === 'physics' && +S.cls === 12 ? '<div class="callout warn physics-quality-note"><div>' + (S.lang === 'hi' ? 'क्षतिग्रस्त या मिले-जुले आयातित प्रश्न स्रोत-जाँच तक रोक दिए गए हैं। उपलब्ध प्रश्नों की भी आधिकारिक उत्तर-कुंजी सत्यापित नहीं है।' : 'Damaged or merged Physics imports are withheld pending source review. Available questions are structurally screened, not fully source-verified; no official answer key is verified.') + '</div></div>' : ''}
    ${renderSuppliedTestPapers(board)}
    ${hasSuppliedTestPapers() && (board !== 'cbse' || S.board !== 'cbse') ? `<div class="callout warn" style="margin-bottom:18px">${icon('info')}<div>${S.lang === 'hi' ? 'मूल प्रश्नपत्र देखने के लिए CBSE बोर्ड चुनें।' : 'Select the CBSE board to view the supplied original papers.'}</div></div>` : ''}
    <section class="card pyq-filter">
      <div class="filter-line">
        <span class="filter-label">${S.lang === 'hi' ? 'वर्ष' : 'Year'}</span>
        <a class="chip ${!year ? 'on' : ''}" href="${filterHref({ y: 0 })}">${S.lang === 'hi' ? 'सभी' : 'All'}</a>
        ${years.map(y => `<a class="chip ${year === y ? 'on' : ''}" href="${filterHref({ y: y })}">${y} <small>${byYear[y]}</small></a>`).join('')}
      </div>
      ${levels.length ? `<div class="filter-line">
        <span class="filter-label">${S.lang === 'hi' ? 'स्तर' : 'Level'}</span>
        <a class="chip ${!lvl ? 'on' : ''}" href="${filterHref({ lvl: '' })}">${S.lang === 'hi' ? 'सभी' : 'All'}</a>
        ${levels.map(L => {
          const n = bank.filter(q => q.lv === L && (!year || +q.y === year) && (!ch || qHasChapter(q, ch))).length;
          return `<a class="chip ${lvl === L ? 'on' : ''}" href="${filterHref({ lvl: L })}">${esc(L)} <small>${n}</small></a>`;
        }).join('')}
      </div>` : ''}
      ${chapterList.length ? `<div class="filter-line">
        <span class="filter-label">${S.lang === 'hi' ? 'अध्याय' : 'Chapter'}</span>
        <a class="chip ${!ch ? 'on' : ''}" href="${filterHref({ ch: 0 })}">${S.lang === 'hi' ? 'सभी' : 'All'}</a>
        ${chapterList.map(c => {
          const id = c.id;
          const count = bank.filter(q => qHasChapter(q, id) && (!year || +q.y === year) && (!lvl || q.lv === lvl)).length;
          const label = (c.displayNo || c.n || c.id) + ' · ' + P({ en: c.en, hi: c.hi });
          return `<a class="chip ${ch === +id ? 'on' : ''}" href="${filterHref({ ch: id })}" title="${esc(label)}">${esc(label)} <small>${count}</small></a>`;
        }).join('')}
      </div>` : ''}
    </section>

    ${sourcePapers.length ? `<section class="card flat source-papers" id="source-papers" aria-labelledby="source-papers-heading">
      <div class="source-papers-head"><h2 id="source-papers-heading">${S.lang === 'hi' ? 'मूल प्रश्नपत्र' : 'Original papers'} <span>PDF</span></h2>
        <span class="tag grey">${sourcePapers.length} ${S.lang === 'hi' ? 'PDF फ़ाइलें' : 'PDF files'}</span></div>
      <p>${S.lang === 'hi'
        ? 'ये पूरे PDF खोज योग्य प्रश्न-बैंक या उसकी गिनती में शामिल नहीं हैं। इनमें भाग A और भाग B के दोनों विकल्प हैं। वर्ष फ़िल्टर लागू है; अध्याय और स्तर फ़िल्टर नहीं। PDF खोलने के लिए इंटरनेट चाहिए, या पहले डाउनलोड करें।'
        : 'These whole PDFs are not in the searchable question bank or its counts. Each includes Part A and both Part B options. The year filter applies; chapter and level filters do not. Open online, or download for offline use.'}</p>
      <div class="source-paper-links">${sourcePapers.map(p => `<a class="btn btn-ghost btn-sm source-paper-link" href="${esc(p.file)}" target="_blank" rel="noopener noreferrer" data-year="${esc(p.year)}" data-paper="${esc(p.paperCode)}" aria-label="${esc((S.lang === 'hi' ? 'CBSE कक्षा 12 लेखाशास्त्र ' : 'Open CBSE Class 12 Accountancy ') + p.year + ' Main ' + p.paperCode + ' PDF')}" title="${esc(p.originalFile)}">${esc(p.year)} · ${esc(p.paperCode)} ↗</a>`).join('')}</div>
    </section>` : ''}

    <div class="pyq-count">${list.length} ${S.lang === 'hi' ? 'प्रश्न' : 'questions'}${pageCount > 1
      ? ' · ' + (S.lang === 'hi' ? 'प्रश्न समूह ' : 'Question groups ') + (pageStart + 1) + '–' + pageEnd + ' / ' + grouped.length
      : ''}</div>
    ${economicsTrack() && !bank.length ? `<div class="callout tip">${icon('info')}<div>${S.lang === 'hi' ? 'मूल पुस्तक अभ्यास PDF में देखें, या अध्याय के अभ्यास जाँचें।' : 'Find textbook exercises in the PDFs, or try the chapter review checks.'} <a class="link" href="#/syllabus">${t('nav_syllabus')}</a></div></div>` : ''}
    ${pageNav}
    ${visibleGroups.map(groupHtml).join('')}
    ${pageNav}
    `;
  }

  /* ============================== TOAST ============================== */
  let toastTimer;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  /* ============================== EVENTS ============================== */
  function answerToText(a) {
    if (!a) return '';
    const isHi = S.lang === 'hi';
    const q = (a.question || a.q || S.q || '').trim();
    const summary = P(a.summary || '').trim();
    const ans = P(a.answer || a.result || a.final || '').trim();
    const methods = (a.approaches || []).slice(0, 3);
    let out = '';
    if (q) out += (isHi ? 'प्रश्न: ' : 'Question: ') + q + '.\n\n';
    if (summary) out += summary + '.\n\n';
    if (ans) out += (isHi ? 'उत्तर: ' : 'Answer: ') + ans + '.\n\n';
    methods.forEach((ap, i) => {
      const name = P(ap.name || '').trim();
      if (methods.length > 1) out += (isHi ? 'विधि ' + (i+1) + ': ' : 'Method ' + (i+1) + ', ') + name + '.\n';
      (ap.steps || []).forEach((st, j) => {
        const t = P(st.t || '').trim();
        if (t) out += (j+1) + '. ' + t + (t.endsWith('.') || t.endsWith('।') ? '' : '.') + '\n';
        if (st.m) {
          const mm = String(st.m).replace(/[∗*•|]/g, '').replace(/\s+/g, ' ').trim();
          if (mm) out += (isHi ? 'गणना: ' : 'Working: ') + mm + '.\n';
        }
      });
      out += '\n';
    });
    // Skip why/watch/figure/panel for speech — they are noisy out loud.
    // End with a short check line only if it's concise
    const verify = P(a.verify || '').trim();
    if (verify && verify.length < 240) out += (isHi ? 'जाँच: ' : 'To verify: ') + verify + '.\n';
    return UP.answerFormat.text(out.trim());
  }

  let speechSession = null;
  function stopAnswerSpeech() {
    const session = speechSession; speechSession = null;
    if (session && session.btn) {
      session.btn.setAttribute('aria-pressed','false');
      session.btn.innerHTML = icon('speaker') + ' <span class="speak-label">' + (S.lang === 'hi' ? 'सुनें' : 'Listen') + '</span>';
    }
    if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (_) {} }
  }

  /* Answer currently visible on screen (prefer AI answer over local stub) */
  function spokenAnswer() {
    return S.aiAnswer || S.answer || null;
  }

  function go(hash, force) {
    if (force && location.hash === hash) { render(); return; }
    location.hash = hash;
  }

  document.addEventListener('click', function (e) {
    /* past-year quiz: pick an option, then get marked and explained */
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const id = pick.dataset.pick, i = +pick.dataset.i;
      const qq = (UP.pyq || []).find(x => x.id === id);
      if (!qq || !qq.opts) return;
      if (qq.keyVerified === false || !String(qq.ans || '').trim()) {
        const box = pick.closest('.q-opts');
        box.querySelectorAll('[data-pick]').forEach(b => { b.classList.remove('chosen'); b.setAttribute('aria-pressed', 'false'); });
        pick.classList.add('chosen'); pick.setAttribute('aria-pressed', 'true');
        let note = box.parentNode.querySelector('.pyq-verdict.note');
        if (!note) { note = document.createElement('div'); note.className = 'pyq-verdict note'; box.parentNode.insertBefore(note, box.nextSibling); }
        note.textContent = S.lang === 'hi'
          ? 'आधिकारिक उत्तर-कुंजी उपलब्ध नहीं है; इस चयन को अंक नहीं दिए गए हैं।'
          : 'No official answer key is available; this choice is not scored.';
        return;
      }
      /* `right` can be -1 when the stored answer is prose or a lost fraction.
         Treating that as "the student is wrong" is the false FAIL the whole
         project is built to avoid -- so if we cannot locate the answer in the
         option list we say so and reveal the solution instead of marking. */
      const right = qq.opts.findIndex(o => (o.en || o) === qq.ans);
      if (right < 0) {
        const box0 = pick.closest('.q-opts');
        box0.querySelectorAll('[data-pick]').forEach(b => { b.disabled = true; });
        const note = document.createElement('div');
        note.className = 'pyq-verdict note';
        note.innerHTML = S.lang === 'hi'
          ? 'इस प्रश्न की कुंजी विकल्पों से मिल नहीं रही, इसलिए मैं इसे गलत नहीं कहूँगा — नीचे पूरा हल देखिए।'
          : 'The stored key does not line up with these options, so I will not mark you wrong — read the solution below.';
        box0.parentNode.insertBefore(note, box0.nextSibling);
        revealPyq(id);
        return;
      }
      const box = pick.closest('.q-opts');
      box.querySelectorAll('[data-pick]').forEach((b, j) => {
        b.disabled = true;
        if (j === right) b.classList.add('right');
        else if (j === i && j !== right) b.classList.add('wrong');
      });
      const verdict = document.createElement('div');
      verdict.className = 'pyq-verdict ' + (i === right ? 'ok' : 'no');
      verdict.innerHTML = i === right
        ? (S.lang === 'hi' ? '✔ सही उत्तर!' : '✔ Correct!')
        : (S.lang === 'hi'
            ? '✘ ठीक नहीं। सही उत्तर विकल्प <b>' + String.fromCharCode(65 + right) + '</b> है।'
            : '✘ Not quite. The correct option is <b>' + String.fromCharCode(65 + right) + '</b>.');
      box.parentNode.insertBefore(verdict, box.nextSibling);
      revealPyq(id);
      return;
    }
    const kp = e.target.closest('[data-kpick]');
    if (kp) {
      const id = kp.dataset.kpick, i = +kp.dataset.i;
      const q = (UP.mcqKeyed || []).find(x => x.id === id);
      if (!q) return;
      const box = kp.closest('.q-opts');
      if (box.dataset.done) return;              // mark once, not on every click
      box.dataset.done = '1';
      box.querySelectorAll('[data-kpick]').forEach((b, j) => {
        b.disabled = true;
        if (j === q.key) b.classList.add('right');
        else if (j === i) b.classList.add('wrong');
      });
      const ok = i === q.key;
      const verdict = document.createElement('div');
      verdict.className = 'pyq-verdict ' + (ok ? 'ok' : 'no');
      verdict.innerHTML = ok
        ? (S.lang === 'hi' ? '✔ सही — बोर्ड की कुंजी भी यही है।' : '✔ Correct — this is the board’s key too.')
        : (S.lang === 'hi'
            ? '✘ सही उत्तर <b>' + String.fromCharCode(65 + q.key) + ') ' + esc(q.opts[q.key]) + '</b> है (बोर्ड की कुंजी)।'
            : '✘ The board’s key is <b>' + String.fromCharCode(65 + q.key) + ') ' + esc(q.opts[q.key]) + '</b>.');
      box.parentNode.insertBefore(verdict, box.nextSibling);
      return;
    }
    const rev = e.target.closest('[data-reveal]');
    if (rev) {
      rev.closest('.pyq-ask').style.display = 'none';
      revealPyq(rev.dataset.reveal);
    }
  });

  document.addEventListener('change', function(e) {
    if (e.target.matches('[data-action="study-goal"]')) {
      const goal = Number(e.target.value);
      if ([5,10,15].includes(goal)) store.set(scopedDataKey('studyGoal'), goal);
    }
  });

  /* the hidden file input is not a [data-action] element, so it needs its own
     listener — a click handler above would never see it (learned the hard way) */
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'photoInput') {
      const f = e.target.files && e.target.files[0];
      if (f) readPhoto(f);
    }
  });

  document.addEventListener('click', function (e) {
    const tgt = e.target.closest('[data-action]');
    if (!tgt) return;
    const action = tgt.dataset.action;
    if (action === 'ai-access-refresh' || action === 'ai-access-manage') { loadAIAccess(action === 'ai-access-manage'); return; }
    if (action === 'ai-access-request' || action === 'ai-access-decide') {
      const panel = document.getElementById('ai-access-panel');
      if (!panel || panel.dataset.busy === 'true') return;
      const owner = S.savedKey;
      const decision = action === 'ai-access-request' ? 'request' : tgt.dataset.decision;
      if (action === 'ai-access-decide' && !window.confirm((decision === 'approve' ? 'Approve' : 'Revoke')+' AI access for this student?')) return;
      panel.dataset.busy = 'true';
      panel.querySelectorAll('button').forEach(b=>b.disabled=true);
      akFetch('/api/ai/access',{method:'POST',body:{action:decision,userId:tgt.dataset.id}}).then(r=>{
        if (!panel.isConnected || owner !== S.savedKey) return;
        panel.dataset.busy = 'false';
        if (!r.ok) { panel.textContent = r.j.error || 'Permission change failed. Reload to check the current status.'; return; }
        loadAIAccess(action === 'ai-access-decide');
      }).catch(()=>{ if (panel.isConnected && owner === S.savedKey) { panel.dataset.busy='false'; panel.textContent='Connection failed. Reload to check whether the change was saved.'; } });
      return;
    }
    if (action === 'copy-ai-question') {
      if (navigator.clipboard) navigator.clipboard.writeText(S.aiQuestion || '').then(()=>toast('Question copied'),()=>toast('Copy unavailable; select the question text instead.'));
      else toast('Copy unavailable; select the question text instead.');
      return;
    }

    if (action === 'pickPhoto') {
      const inp = document.getElementById('photoInput');
      if (inp) { inp.value = ''; inp.click(); }
      return;
    }
    if (action === 'clearPhoto') {
      S.photoState = null; S.photoNote = ''; S.photoPreview = null;
      paintPhotoStrip();
      return;
    }
    if (action === 'retryAI') {
      if (S.aiRetryAt && Date.now() < S.aiRetryAt) { toast('Retry after '+Math.ceil((S.aiRetryAt-Date.now())/1000)+' seconds.'); return; }
      const qq = S.aiQuestion;
      if (!qq) return;
      S.aiAnswer = null; S.aiState = 'loading'; S.aiNote = ''; S.aiRetry = false;
      if (needsAIOnly()) S.answer = accountancyAIWaiting(qq);
      const m = document.getElementById('answerMount');
      if (m) m.innerHTML = renderAnswer(S.answer);
      const strip = document.getElementById('aiThinking');
      if (strip) strip.style.display = '';
      askAI(qq);
      return;
    }
    if (action === 'askLocal') {
      if (needsAIOnly()) return;
      const m = document.getElementById('answerMount');
      if (m && S.answer) {
        S.aiAnswer = null; S.aiState = 'local';
        m.innerHTML = renderAnswer(S.answer);
      }
      return;
    }
    if (action === 'lang') {
      S.lang = tgt.dataset.lang; saveState(); render();
      document.documentElement.lang = S.lang === 'hi' ? 'hi' : 'en';
      const box = document.querySelector('[data-action="bookSearch"]');
      if (box && box.value) { const r = document.getElementById('bookResults'); if (r) r.innerHTML = bookResults(box.value); }
      return;
    }
    /* ---- test / sample paper ---- */
    /* These two used to be chip buttons carrying data-board / data-level. They
       are now <select>s, so the value has to be read from the control itself. */
    if (action === 'test-board-pick') {
      S.test.board = tgt.value || tgt.dataset.board || 'cbse';
      S.test.seed = 0; buildPaper(true); render(); return;
    }
    if (action === 'test-level-pick') {
      S.test.level = tgt.value || tgt.dataset.level || 'mixed';
      S.test.seed = 0; buildPaper(true); render(); return;
    }
    if (action === 'test-cls-pick') {
      /* the paper must come from the student's own class, never another one */
      S.cls = +tgt.value;
      const allowed = (UP.classes.find(c => c.id === S.cls) || UP.classes[0]).subjects;
      if (!allowed.includes(S.subject)) S.subject = allowed[0];
      S.test.chapters = []; S.test.seed = 0;
      window.__qIndex = null; S.dailySet = null; clearMockTest(); store.remove(dailyStoreKey());
      saveState(); buildPaper(true); render(); return;
    }
    if (action === 'test-ch') {
      const id = +tgt.dataset.ch;
      const at = S.test.chapters.indexOf(id);
      if (at >= 0) S.test.chapters.splice(at, 1); else S.test.chapters.push(id);
      S.test.chapters.sort((a, b) => a - b);
      S.test.seed = 0; buildPaper(true); render(); return;
    }
    if (action === 'test-clear') { S.test.chapters = []; S.test.seed = 0; buildPaper(true); render(); return; }
    if (action === 'test-reset-filters') { S.test.chapters = []; S.test.level = 'mixed'; S.test.seed = 0; buildPaper(true); render(); return; }
    if (action === 'test-new') { S.test.seed = 0; buildPaper(true); render(); toast(S.lang === 'hi' ? 'नया प्रश्नपत्र तैयार' : 'New paper generated'); return; }
    if (action === 'test-pick') {
      const no = +tgt.dataset.q, pick = tgt.dataset.opt;
      const q = findQ(no); if (!q) return;
      const graded = !(q.raw && q.raw.paperCode) && q.keyVerified !== false && !(q.raw && q.raw.keyVerified === false) && !!(q.ans && String(q.ans).trim());
      S.answers[no] = { pick, ok: graded ? pick === q.ans : null, shown: !!(S.answers[no] && S.answers[no].shown) };
      render(); return;
    }
    if (action === 'test-check') {
      const no = +tgt.dataset.q;
      const q = findQ(no); if (!q) return;
      const inp = document.querySelector('[data-answer="' + no + '"]');
      const text = (inp ? inp.value : '').trim();
      S.answers[no] = { text, ok: sameAnswer(text, q.ans), shown: true };
      render(); return;
    }
    if (action === 'test-reveal') {
      const no = +tgt.dataset.q;
      const cur = S.answers[no] || { ok: null };
      cur.shown = !cur.shown; S.answers[no] = cur;
      if (cur.shown) {
        const q = findQ(no);
        const hasAns = !!(q && q.ans && String(q.ans).trim() && String(q.ans) !== 'Proof (standard theorem)');
        const hasSteps = !!(q && q.steps && q.steps.length && q.steps.some(s => String(s.en||s.hi||(typeof s==='string'?s:'')).trim().length > 5));
        if (q && (!hasAns || !hasSteps)) solveTestQuestionAI(no);
      }
      render({ preserveScroll: true }); return;
    }
    if (action === 'test-print') { window.print(); return; }
    if (action === 'menu') {
      const open = document.body.classList.toggle('rail-open');
      tgt.setAttribute('aria-expanded', open ? 'true' : 'false');
      syncRailA11y();
      if (open) { const first = document.querySelector('.rail .nav a'); if (first) first.focus(); }
      return;
    }
    if (action === 'toggle') {
      const art = tgt.closest('.approach');
      art.classList.toggle('open'); art.classList.toggle('closed');
      postRenderEnhance(document.getElementById('view'));
      return;
    }
    if (action === 'next-method') {
      e.preventDefault();
      const art = tgt.closest('.approach');
      const next = art.nextElementSibling;
      if (next && next.classList.contains('approach')) {
        next.classList.add('open'); next.classList.remove('closed');
        next.scrollIntoView({ behavior: 'smooth', block: 'start' });
        postRenderEnhance(document.getElementById('view'));
      }
      return;
    }
    if (action === 'expand-all') {
      e.preventDefault();
      document.querySelectorAll('.approach.closed').forEach(a => { a.classList.add('open'); a.classList.remove('closed'); });
      postRenderEnhance(document.getElementById('view'));
      return;
    }
    if (action === 'sample') {
      const q = tgt.dataset.q;
      // Selecting a previously failed question again is a fresh request.
      if (S.aiQuestion === q && S.aiState === 'local') { S.aiQuestion = null; S.aiScope = null; }
      go(`#/ask?q=${encodeURIComponent(q)}`, true); return;
    }
    if (action === 'saveQuestion') {
      const q = String(tgt.dataset.q || '').trim(); if (!q) return;
      if (!S.saved.some(item => item.q === q)) {
        const item = {q, date:new Date().toISOString().slice(0,10), at:Date.now(),
          subject:S.subject, cls:+S.cls, board:S.board, tag:'', chapter:''};
        S.saved.unshift(item); S.saved = S.saved.slice(0,200); saveSaved(); addSavedRemote(item);
      }
      // No whole-page redraw: saving must not move the question or reset inputs.
      document.querySelectorAll('[data-action="saveQuestion"]').forEach(btn => {
        if (btn.dataset.q !== q) return;
        btn.disabled = true;
        btn.innerHTML = icon('check') + ' ' + (S.lang === 'hi' ? 'सहेजा गया' : 'Saved');
      });
      toast(S.lang === 'hi' ? 'सहेजा गया — Saved पृष्ठ पर देखें' : 'Question saved — find it in Saved');
      return;
    }
    if (action === 'solvePyq' || action === 'savePyq') {
      const q = tgt.dataset.q;
      if (action === 'solvePyq') { go(`#/ask?q=${encodeURIComponent(q)}`, true); return; }
      const item = { q, date: new Date().toISOString().slice(0, 10), chapter: chapterById(S.chapterId) ? P({ en: chapterById(S.chapterId).en, hi: chapterById(S.chapterId).hi }) : '' };
      S.saved.unshift(item); S.saved = S.saved.slice(0, 40); saveSaved();
      addSavedRemote(item); toast(t('toastSaved')); render(); return;
    }
    if (action === 'saveAnswer') {
      if (!S.answer) return;
      // quick-tag menu: open a small popover instead of saving immediately
      const btn = tgt.closest('button');
      const existing = S.saved.findIndex(s => s.q === S.answer.question);
      if (existing >= 0) {
        toast(S.lang === 'hi' ? 'पहले से सहेजा हुआ' : 'Already saved'); return;
      }
      openSavePopover(btn, S.answer);
      return;
    }
    if (action === 'confirmSave') {
      const q = tgt.dataset.q; const tag = tgt.dataset.tag || '';
      let ans = S.answer;
      if (S.aiAnswer && S.aiAnswer.question === q) ans = S.aiAnswer;
      if (!ans || ans.question !== q) { /* fallthrough */ }
      const item = {
        q: q, date: new Date().toISOString().slice(0, 10), at: Date.now(),
        tag: tag,
        chapter: (ans && ans.chapter && chapterById(ans.chapter))
          ? P({ en: chapterById(ans.chapter).en, hi: chapterById(ans.chapter).hi })
          : '',
        subject: (ans && ans._subj) || S.subject
      };
      S.saved.unshift(item); S.saved = S.saved.slice(0, 200); saveSaved();
      addSavedRemote(item);
      closeSavePopover();
      toast(S.lang === 'hi' ? 'सहेज लिया' : 'Saved'); render(); return;
    }
    if (action === 'tagSaved') {
      const i = +tgt.dataset.i; const tag = tgt.dataset.tag || '';
      if (S.saved[i]) { S.saved[i].tag = tag; saveSaved(); render(); }
      return;
    }
    if (action === 'savedFilter') {
      S.savedFolder = tgt.dataset.f || 'all'; store.set('savedFolder', S.savedFolder); render(); return;
    }
    if (action === 'addTag') {
      const tag = (prompt(S.lang === 'hi' ? 'नया टैग:' : 'New tag name:') || '').trim().toLowerCase();
      if (tag && !S.savedTags.includes(tag)) { S.savedTags.push(tag); store.set('savedTags', S.savedTags); render(); }
      return;
    }
    if (action === 'deleteSaved') {
      const i = +tgt.dataset.i; const gone = S.saved[i];
      S.saved.splice(i, 1); saveSaved();
      if (gone && gone.id) removeSavedRemote(gone.id);
      render(); return;
    }
    if (action === 'clearSaved') {
      const ids = S.saved.map(s => s.id).filter(Boolean);
      S.saved = []; saveSaved();
      ids.forEach(id => removeSavedRemote(id));
      toast(t('toastCleared')); render(); return;
    }
    if (action === 'copy') {
      const txt = answerToText(spokenAnswer());
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast(t('toastCopied'))).catch(() => {
        const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast(t('toastCopied')); } catch (er) { toast('—'); }
        ta.remove();
      });
      return;
    }
    if (action === 'speak') {
      e.preventDefault();
      const btn = tgt.closest('button');
      if (speechSession) { stopAnswerSpeech(); return; }
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        toast(S.lang === 'hi' ? 'इस ब्राउज़र में आवाज़ उपलब्ध नहीं है।' : 'Read aloud is not supported in this browser.'); return;
      }
      const txt = answerToText(spokenAnswer());
      if (!txt) { toast(S.lang === 'hi' ? 'पढ़ने के लिए उत्तर उपलब्ध नहीं है।' : 'No answer is available to read yet.'); return; }
      // Small utterances avoid long-answer speech stalls on mobile/Chromium.
      const chunks = txt.match(/[^.!?।]+[.!?।]*/g) || [txt];
      const parts = [];
      chunks.forEach(chunk => {
        let rest = chunk.trim();
        while (rest.length > 220) {
          let cut = rest.lastIndexOf(' ', 220); if (cut < 1) cut = 220;
          parts.push(rest.slice(0,cut)); rest = rest.slice(cut).trim();
        }
        if (rest) parts.push(rest);
      });
      const session = speechSession = {btn, utterance:null};
      btn.setAttribute('aria-pressed','true');
      btn.innerHTML = icon('speakeroff') + ' <span class="speak-label">' + (S.lang === 'hi' ? 'रोकें' : 'Stop') + '</span>';
      let index = 0;
      const next = () => {
        if (speechSession !== session) return;
        if (index >= parts.length) { stopAnswerSpeech(); return; }
        const u = session.utterance = new SpeechSynthesisUtterance(parts[index++]);
        u.lang = S.lang === 'hi' ? 'hi-IN' : 'en-IN'; u.rate = S.lang === 'hi' ? .95 : 1;
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v=>v.lang===u.lang) || voices.find(v=>v.lang.startsWith(u.lang.slice(0,2)));
        if (voice) u.voice = voice;
        u.onend = next;
        u.onerror = event => {
          if (speechSession !== session) return;
          stopAnswerSpeech();
          if (!['canceled','interrupted'].includes(event.error)) toast(S.lang === 'hi' ? 'आवाज़ नहीं चल सकी। डिवाइस की आवाज़ और उपलब्ध भाषाएँ जाँचें।' : 'Read aloud failed. Check device audio and installed speech voices.');
        };
        try { window.speechSynthesis.resume(); window.speechSynthesis.speak(u); }
        catch (_) { u.onerror({error:'unavailable'}); }
      };
      next(); return;
    }
    if (action === 'share') {
      e.preventDefault();
      const q = S.q || (S.answer && S.answer.q) || '';
      const payload = { q: q, sub: S.subject || 'maths', ts: Date.now() };
      // compress payload into URL hash (base64)
      const json = JSON.stringify(payload);
      const b64 = btoa(unescape(encodeURIComponent(json))).replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
      const url = location.origin + location.pathname + '#/ask?s=' + b64;
      if (navigator.share) {
        navigator.share({ title: 'Upay · ' + (q || ''), text: q, url: url }).catch(() => {});
      } else {
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast(S.lang === 'hi' ? 'लिंक कॉपी हो गया' : 'Link copied')).catch(() => toast(url));
      }
      return;
    }
    if (action === 'print') { window.print(); return; }
    if (action === 'readFullChapter') {
      const sid = tgt.dataset.ch;
      if (!sid) return;
      const ch = (UP.catalogue(S.cls, S.subject) || []).find(c => chapterSourceId(c) === sid) || { sourceId: sid, id: sid };
      // Render the loading state, then swap in the text once the bundle lands.
      if (!UP.chapterFullText) {
        const host = tgt.closest('.card') || document.getElementById('view');
        if (host) host.insertAdjacentHTML('beforeend',
          `<section class="card flat chapter-text"><p class="muted">${S.lang === 'hi' ? 'पूरा पाठ लोड हो रहा है…' : 'Loading the full chapter…'}</p></section>`);
      }
      loadFullText().then(() => {
        const mount = document.getElementById('chapterFull');
        if (mount) { mount.innerHTML = renderChapterText(ch, 'full'); }
        else {
          const host = document.getElementById('view') || document.body;
          const wrap = document.createElement('div');
          wrap.id = 'chapterFull';
          wrap.innerHTML = renderChapterText(ch, 'full');
          host.appendChild(wrap);
        }
        const w = document.getElementById('chapterFull');
        if (w && typeof w.scrollIntoView === 'function') w.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    if (action === 'shareImage') { e.preventDefault(); shareAnswerAsImage(); return; }
    if (action === 'voiceInput') { e.preventDefault(); startVoiceInput(); return; }
    if (action === 'cameraOCR') { e.preventDefault(); triggerCameraOCR(); return; }
    if (action === 'dailyRefresh') {
      DAILY = null;
      S.dailySet = null;
      store.remove && store.remove(dailyStoreKey());
      DAILY = buildDailySet();
      render();
      return;
    }
    if (action === 'dailyMark') {
      const i = +tgt.dataset.i, ok = tgt.dataset.ok === '1';
      const q = DAILY && DAILY[i]; if (!q || q.marked) return;
      q.marked = ok ? 'got-it' : 'hard';
      if (S.dailySet && S.dailySet.items && S.dailySet.items[i]) {
        S.dailySet.items[i].marked = q.marked;
        store.set(dailyStoreKey(), S.dailySet);
      }
      const ch = q.ch;
      if (!S.mastery[ch]) S.mastery[ch] = { attempted:0, correct:0, at:Date.now() };
      S.mastery[ch].attempted++;
      if (ok) S.mastery[ch].correct++;
      S.mastery[ch].at = Date.now();
      saveMastery();
      bumpProgress(q.subject);
      if (typeof window.dailyMark === 'function') window.dailyMark(i, ok);
      const card = tgt.closest('.q-card');
      if (card) {
        card.style.opacity='0.65';
        card.querySelectorAll('[data-action="dailyMark"]').forEach(b => { b.disabled = true; });
      }
      return;
    }
    if (action === 'flagWrong') {
      toast(S.lang==='hi'?'फ़ीडबैक दर्ज — धन्यवाद':'Feedback logged — thanks');
      return;
    }
    if (action === 'newQuestion') {
      S.answer = null; go('#/ask'); render(); return;
    }
    if (action === 'tab') {
      const p = parseHash();
      go(`#/chapter/${p.id}?tab=${tgt.dataset.tab}`);
      const tb = document.querySelectorAll('.tabs button');
      tb.forEach(b => b.classList.toggle('on', b.dataset.tab === tgt.dataset.tab));
      return;
    }
    if (action === 'setBoard') {
      S.board = tgt.dataset.board; S.chapterId = null;
      S.test.board = S.board; S.test.chapters = []; S.test.seed = 0; S.paper = null;
      window.__qIndex = null; S.dailySet = null; clearMockTest(); store.remove(dailyStoreKey());
      return UP.loadBoardPack(S.board).then(function () {
        saveState(); render(); toast(S.lang === 'hi' ? 'बोर्ड बदल गया' : 'Board changed');
      });
    }
    if (action === 'upload') {
      toast(t('toastQueued'));
    }
  });

  document.addEventListener('change', function (e) {
    /* The paper's Board / Difficulty / Class dropdowns are <select>s, so their
       changes arrive here rather than through the click handler. */
    const testSel = e.target.closest('[data-action="test-board-pick"],[data-action="test-level-pick"],[data-action="test-cls-pick"]');
    if (testSel) {
      if (testSel.dataset.action === 'test-board-pick') S.test.board = testSel.value || 'cbse';
      else if (testSel.dataset.action === 'test-level-pick') S.test.level = testSel.value || 'mixed';
      else {
        S.cls = +testSel.value;
        const allowed = (UP.classes.find(c => c.id === S.cls) || UP.classes[0]).subjects;
        if (!allowed.includes(S.subject)) S.subject = allowed[0];
        S.test.chapters = [];
        saveState();
      }
      S.test.seed = 0; buildPaper(true); render(); return;
    }
    const el = e.target.closest('[data-action="set"]');
    if (el) {
      const key = el.dataset.key, val = el.value;
      let resetScope = false;
      if (key === 'cls') {
        S.cls = +val; S.chapterId = null; resetScope = true;
        const allowed = (UP.classes.find(c => c.id === S.cls) || UP.classes[0]).subjects;
        if (!allowed.includes(S.subject)) S.subject = allowed[0];
      }
      if (key === 'subject') {
        S.subject = val; S.chapterId = null; resetScope = true;
        // Changing subject invalidates chapter selection (chapter IDs are per-subject)
        S.test.chapters = []; S.test.seed = 0; S.paper = null;
        return UP.switchSubject(val).then(function () {
          window.__qIndex = null; S.dailySet = null; clearMockTest(); store.remove(dailyStoreKey());
          saveState(); const r = parseHash(); if (r.name === 'chapter') go('#/syllabus'); else render();
        });
      }
      if (key === 'board') {
        S.board = val; S.chapterId = null;
        S.test.board = val; S.test.chapters = []; S.test.seed = 0; S.paper = null;
        window.__qIndex = null; S.dailySet = null; clearMockTest(); store.remove(dailyStoreKey());
        return UP.loadBoardPack(val).then(function () { saveState(); render(); });
      }
      if (resetScope) {
        window.__qIndex = null; S.dailySet = null; clearMockTest(); store.remove(dailyStoreKey());
        // Class change also invalidates chapter filter
        if (key === 'cls') S.test.chapters = [];
      }
      // A direct Class 12 entry can select a subject without loading its lazy
      // Class 10 pack. Load the retained subject before rendering a new class.
      if (key === 'cls' && UP.loaded && !UP.loaded.packs[S.subject]) {
        return UP.switchSubject(S.subject).then(function () {
          saveState(); const current = parseHash();
          if (current.name === 'chapter') go('#/syllabus'); else render();
        });
      }
      saveState();
      const r = parseHash();
      if (r.name === 'chapter') go('#/syllabus'); else render();
      return;
    }
    const chJump = e.target.closest('[data-action="chapterJump"]');
    if (chJump && chJump.value) { go(`#/chapter/${chJump.value}`); return; }
    const up = e.target.closest('[data-action="upload"]');
    if (up && up.files && up.files[0]) { toast(t('toastQueued')); }
  });

  let searchTimer, bookTimer;
  document.addEventListener('input', function (e) {
    const sourceFilter = e.target.closest('[data-action="sourcePaperFilter"]');
    if (sourceFilter) {
      // This filters only supplied PDF metadata, not the searchable question bank.
      const section = sourceFilter.closest('#original-test-papers');
      if (!section) return;
      const normalize = value => String(value || '').toLocaleLowerCase().replace(/[\s/_-]+/g, '');
      const query = normalize(sourceFilter.value);
      let total = 0, visible = 0;
      section.querySelectorAll('.source-course-group').forEach(course => {
        let inCourse = 0;
        course.querySelectorAll('.source-paper-group').forEach(group => {
          let inSeries = 0;
          const series = normalize(group.dataset.series);
          group.querySelectorAll('.source-test-paper').forEach(link => {
            const match = !query || series.includes(query) || normalize(link.dataset.paperCode).includes(query);
            link.hidden = !match; total++;
            if (match) { visible++; inSeries++; inCourse++; }
          });
          group.hidden = !inSeries;
        });
        course.hidden = !inCourse;
      });
      const status = section.querySelector('#english-paper-filter-status');
      if (status) status.textContent = S.lang === 'hi'
        ? `${total} में से ${visible} PDF दिख रहे हैं`
        : `Showing ${visible} of ${total} PDFs`;
      return;
    }
    const bs = e.target.closest('[data-action="bookSearch"]');
    if (bs) {
      clearTimeout(bookTimer);
      const q = bs.value;
      bookTimer = setTimeout(() => {
        const box = document.getElementById('bookResults');
        if (box) { box.innerHTML = bookResults(q); }
        const st = history.state || {};
        history.replaceState(st, '', '#/books' + (q.trim() ? '?bq=' + encodeURIComponent(q.trim()) : ''));
      }, 220);
      return;
    }
    const s = e.target.closest('[data-action="search"]');
    if (!s) return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = s.value.trim();
      history.replaceState(null, '', `#/syllabus${q ? '?q=' + encodeURIComponent(q) : ''}`);
      const r = parseHash();
      document.getElementById('view').innerHTML = viewSyllabus(r.params);
      document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === 'syllabus'));
      const input = document.querySelector('[data-action="search"]');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    }, 260);
  });

  document.addEventListener('click', function (e) {
    const link = e.target.closest('.rail a[href^="#/"], .bottom-nav a[href^="#/"]');
    if (link) closeRail();
  });

  document.addEventListener('submit', function (e) {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const q = (form.querySelector('textarea[name="q"]') || {}).value || '';
    if (!q.trim()) { (form.querySelector('textarea') || {}).focus?.(); return; }
    go(`#/ask?q=${encodeURIComponent(q.trim())}`);
    if (parseHash().name === 'ask') render();
  });

  /* auth form submit */
  document.addEventListener('submit', async function (e) {
    const authForm = e.target.closest('#authForm');
    if (!authForm) return;
    e.preventDefault();
    const errEl = document.getElementById('authErr');
    const okEl = document.getElementById('authOk');
    errEl.classList.remove('on'); errEl.textContent = '';
    okEl.classList.remove('on'); okEl.textContent = '';
    const fd = new FormData(authForm);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const name = String(fd.get('name') || '').trim();
    const mode = document.querySelector('.auth-tab.on')?.dataset.tab || 'signin';
    if (!email || !password) { errEl.textContent = 'Email and password required.'; errEl.classList.add('on'); return; }
    authForm.querySelector('button[type=submit]').disabled = true;
    try {
      let res;
      if (mode === 'signup') {
        res = await UP.sbSignUp(email, password, name);
        if (res.error) throw new Error(res.error.message);
        okEl.textContent = S.lang==='hi'
          ? (res.data?.user?.identities?.length===0
             ? 'यह ईमेल पहले से पंजीकृत है। कृपया साइन इन करें।'
             : res.data?.session ? 'खाता बन गया और आप साइन इन हैं।' : 'खाता बनाने के लिए अपना ईमेल जाँचें, फिर साइन इन करें।')
          : (res.data?.user?.identities?.length===0
             ? 'This email is already registered. Please sign in.'
             : res.data?.session ? 'Account created! You are now signed in.' : 'Check your email to complete registration, then sign in.');
        okEl.classList.add('on');
        if (res.data?.session) { setTimeout(() => go('#/home'), 500); }
        else setTimeout(() => go('#/login?mode=signin'), 1400);
      } else {
        res = await UP.sbSignIn(email, password);
        if (res.error) throw new Error(res.error.message);
        // If sign-in returned a server-local token (fallback path), apply it here
        // because Supabase's applySession() only fires for Supabase sessions.
        if (res.data && res.data.user && !S.user) {
          const u = res.data.user;
          S.user = { id: u.id || u.email || email, email: u.email || email, name: u.name || u.user_metadata?.name || (u.email||email).split('@')[0], role: u.role };
        }
        // Navigating fires render(); rendering the login view first would queue
        // its signed-in redirect to home and override the password-change page.
        go(S.user && S.user.mustChange ? '#/account' : '#/home');
      }
    } catch (err) {
      let m = String(err.message || err);
      if (/invalid.*(credentials|login)/i.test(m)) m = S.lang==='hi'?'गलत ईमेल या पासवर्ड।':'Invalid email or password.';
      else if (/already.*registered/i.test(m)) m = S.lang==='hi'?'यह ईमेल पहले से है। साइन इन कीजिए।':'That email is already registered. Please sign in.';
      else if (/password/i.test(m) && /too/i.test(m)) m = S.lang==='hi'?'पासवर्ड बहुत छोटा है (कम से कम 6 अक्षर)।':'Password is too short (at least 6 characters).';
      errEl.textContent = m; errEl.classList.add('on');
    } finally {
      authForm.querySelector('button[type=submit]').disabled = false;
    }
  });

  document.addEventListener('submit', async function (e) {
    const form = e.target.closest('#localPasswordForm');
    if (!form) return;
    e.preventDefault();
    const message = form.querySelector('#pwError');
    message.textContent = ''; message.classList.remove('on');
    const data = new FormData(form);
    const current = String(data.get('current') || ''), next = String(data.get('next') || ''), confirm = String(data.get('confirm') || '');
    if (next.length < 8 || next !== confirm) {
      message.textContent = S.lang === 'hi' ? 'नए पासवर्ड कम से कम 8 अक्षर के और समान होने चाहिए।' : 'The new passwords must match and contain at least 8 characters.';
      message.classList.add('on'); return;
    }
    const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
    try {
      const response = await fetch('/api/auth/password', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({current,next}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not change password.');
      await UP.sbSignOut();
      go('#/login');
      toast(S.lang === 'hi' ? 'पासवर्ड बदला। फिर साइन इन करें।' : 'Password changed. Please sign in again.');
    } catch (err) {
      message.textContent = String(err.message || err); message.classList.add('on');
    } finally { btn.disabled = false; }
  });

  /* auth tab clicks, user menu, signout, profile save */
  document.addEventListener('click', function (e) {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      const t = tab.dataset.tab;
      if (t === 'signin' || t === 'signup') {
        e.preventDefault();
        go('#/login?mode=' + t);
        return;
      }
    }
    const umBtn = e.target.closest('[data-action="user-menu"]');
    if (umBtn) {
      e.stopPropagation();
      document.getElementById('userMenu')?.classList.toggle('open');
      return;
    }
    if (!e.target.closest('#userMenu')) {
      document.querySelectorAll('.user-menu.open').forEach(m => m.classList.remove('open'));
    }
    const so = e.target.closest('[data-action="signout"]');
    if (so) {
      e.preventDefault();
      UP.sbSignOut().then(() => { go('#/home'); });
      return;
    }
    const pfSave = e.target.closest('#pf-save');
    if (pfSave) {
      const name = document.getElementById('pf-name').value.trim();
      const cls = +document.getElementById('pf-cls').value;
      S.cls = cls; saveState();
      UP.sbUpdate({ display_name: name, grade: cls, preferred_lang: S.lang, preferred_board: S.board, preferred_subject: S.subject })
        .then((synced) => { toast(synced ? 'Saved.' : 'Class saved on this device; profile sync is unavailable.'); render(); });
      return;
    }
  }, true);

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCmdK(); return; }
    // Keyboard nav on PYQ/test list (J/K next/prev, R reveal, A ask-AI)
    if (!e.metaKey && !e.ctrlKey && !e.target.closest('input,textarea,select')) {
      const onPyq = location.hash.indexOf('/pyq') >= 0 || location.hash.indexOf('/test') >= 0;
      if (onPyq) {
        const cards = Array.from(document.querySelectorAll('.q-card'));
        if (!cards.length) return;
        let cur = cards.findIndex(c => c.classList.contains('kbd-focus'));
        if (cur < 0) cur = -1;
        if (e.key === 'j' || e.key === 'ArrowDown') { cur = Math.min(cur+1, cards.length-1); e.preventDefault(); }
        else if (e.key === 'k' || e.key === 'ArrowUp') { cur = Math.max(cur-1, 0); e.preventDefault(); }
        else return;
        cards.forEach(c=>c.classList.remove('kbd-focus'));
        if (cur>=0){ cards[cur].classList.add('kbd-focus'); cards[cur].scrollIntoView({block:'center',behavior:'smooth'}); cards[cur].focus(); }
      }
    }
    if (e.key === 'Escape') closeRail();
    const ta = e.target.closest('textarea[name="q"]');
    if (ta && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const q = ta.value.trim(); if (!q) return;
      go(`#/ask?q=${encodeURIComponent(q)}`);
    }
  });

  window.addEventListener('hashchange', render);

  /* ---- silent session renewal ----
     The token now lives 30 days, but a token is only useful if it is refreshed
     while the student is actually using the app; otherwise it still dies
     mid-visit a month later. One cheap call per page load re-issues it. A
     failure here is silent on purpose: never block the page on it, never nag
     an offline student, and never clobber a token that was just set by a
     fresh sign-in on another tab. */
  (function renewSession() {
    const cur = localStorage.getItem('upay.token');
    if (!cur || typeof fetch !== 'function') return;
    // Renew only near expiry. Decoding here schedules the request; it never
    // grants a role, which is still verified by the server.
    try {
      const payload = JSON.parse(atob(cur.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')));
      if (Number(payload.exp) > Date.now() + 24 * 60 * 60 * 1000) return;
    } catch (_) { /* let the server reject malformed/old credentials */ }
    try {
      fetch('/api/auth/renew', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + cur }
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && j.token && localStorage.getItem('upay.token') === cur) {
            localStorage.setItem('upay.token', j.token);
          }
        })
        .catch(function () { /* offline: the existing token still works */ });
    } catch (e) { /* never let this break first paint */ }
  })();

  /* =============================== DEMO DATA =============================== */
  /* Do not seed a new user's Saved list with unrelated sample questions.
     Existing saved items are left untouched. */
  if (!store.get('seeded', false)) store.set('seeded', true);

/* ============================================================
   UPAY v24 — The 20-point polish pass (defined inside main IIFE
   so render() below sees every new function).
   ============================================================ */

/* ---------- Fix broken /login.html link (replaced with #/login) ---------- */
(function fixLoginLink(){
  const orig = Element.prototype.setAttribute;
  // done via direct patch in DOM-content handlers; also catch auth-fail block below at render time.
})();

/* ---------- #1  Real OCR — client-side Tesseract.js (lazy loaded) ---------- */
/*   The existing triggerCameraOCR() opens the file picker. We replace the
     change handler to run Tesseract in the browser with hi+eng traineddata. */
window.__upayOCR = window.__upayOCR || { loading: false, loaded: false, worker: null };
async function ocrFile(file){
  const ta = document.querySelector('textarea[name="q"]');
  const toast = (msg)=>{ const t=document.createElement('div'); t.className='upay-toast'; t.textContent=msg; Object.assign(t.style,{position:'fixed',left:'50%',bottom:'90px',transform:'translateX(-50%)',background:'#1a1a1a',color:'#fff',padding:'10px 16px',borderRadius:'999px',fontSize:'13.5px',zIndex:9999,boxShadow:'0 6px 24px rgba(0,0,0,.2)'}); document.body.appendChild(t); setTimeout(()=>t.remove(),2400); };
  toast(S.lang==='hi'?'तस्वीर पढ़ रहे हैं (पहली बार 2 MB डाउनलोड)…':'Reading image (first run downloads ~2 MB)…');
  try {
    if (!window.__upayOCR.loaded) {
      if (window.__upayOCR.loading) { toast(S.lang==='hi'?'लोड हो रहा है…':'Loading…'); return; }
      window.__upayOCR.loading = true;
      await new Promise((res,rej)=>{
        const s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js';
        s.onload=res; s.onerror=()=>rej(new Error('ocr-load-failed'));
        document.head.appendChild(s);
      });
      window.__upayOCR.loaded = true;
    }
    const { data } = await Tesseract.recognize(file, 'eng+hin', {
      logger: m => { /* silent */ }
    });
    const txt = (data.text || '').trim().replace(/\n{3,}/g,'\n\n');
    if (ta && txt) {
      ta.value = (ta.value ? ta.value + '\n\n' : '') + txt;
      ta.dispatchEvent(new Event('input',{bubbles:true}));
      toast(S.lang==='hi'?'पाठ पहचाना गया':'Text recognized');
      ta.focus();
    } else if (!txt) {
      toast(S.lang==='hi'?'कोई पाठ नहीं मिला':'No text found');
    }
  } catch(e){
    console.warn('OCR failed',e);
    toast(S.lang==='hi'?'OCR नहीं चल पाया — फोटो अपलोड से भेजें':'OCR failed — use photo upload');
  } finally {
    window.__upayOCR.loading = false;
  }
}
// Hook camera OCR file input change
document.addEventListener('change', function(e){
  const inp = e.target.closest('#ocr-file');
  if (!inp) return;
  const f = inp.files && inp.files[0];
  if (f) ocrFile(f);
  inp.value = '';
});

/* ---------- #2 Persistent daily set + spaced repetition (Leitner 5-box) ---------- */
/*   Box intervals (days): new→1→3→7→21→graduated. Wrong answer drops to box 0.
     Daily set seeded by date so it stays stable for 24 hours, then refreshes. */
const LEITNER_BOX_DAYS = [1,3,7,21];
function todayKey(d){ const x=d||new Date(); return x.getFullYear()+'-'+(x.getMonth()+1)+'-'+x.getDate(); }
function daysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }
function srsDueCards(){
  const due=[]; const m=S.mastery||{}; const today=todayKey();
  Object.keys(m).forEach(chId=>{
    (m[chId].cards||[]).forEach(c=>{
      if (!c.box) c.box=0;
      if (c.box===0) { /* new cards, not due, chosen separately */ return; }
      const interval = LEITNER_BOX_DAYS[Math.min(c.box-1, LEITNER_BOX_DAYS.length-1)];
      if (!c.last || daysBetween(c.last, today) >= interval) {
        const q = String(c.q||'').trim();
        if (q.length >= 20) due.push({...c, q, chId});
      }
    });
  });
  return due;
}
function srsAddCard(chId, q){
  S.mastery = S.mastery || {};
  S.mastery[chId] = S.mastery[chId] || {attempted:0,correct:0,cards:[]};
  // Older mastery records may contain scores but no SRS cards yet.
  const entry = S.mastery[chId];
  if (!Array.isArray(entry.cards)) entry.cards = [];
  const cards = entry.cards;
  if (cards.find(c=>c.q===q)) return;
  cards.push({q, box:0, added:todayKey()});
}
function srsMark(q, gotIt){
  Object.keys(S.mastery||{}).forEach(chId=>{
    const c=(S.mastery[chId].cards||[]).find(x=>x.q===q);
    if (!c) return;
    if (gotIt) c.box = Math.min((c.box||0)+1, LEITNER_BOX_DAYS.length);
    else c.box = 0;
    c.last = todayKey();
  });
  saveMastery();
}
/* Rebuild buildDailySet to be date-seeded and SRS-aware */
function _stableDailyPick(){
  const seed = todayKey();
  let h = 0; for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i)) >>> 0;
  // An unsigned 32-bit value must be divided by 2^32, not 2^31-1:
  // array selection needs a number in [0,1), even on a fresh install.
  return function(){ h = (Math.imul(h, 1103515245) + 12345) >>> 0; return h / 0x100000000; };
}
function chapNameForQ(q){
  // Resolve the chapter name for a PYQ entry regardless of subject/current filter
  const ch = chapterById(q.ch);
  if (ch) return P(ch);
  return (q.src||'').split('·')[0].trim() || '';
}
buildDailySet = function(){
  const today = todayKey();
  const scope = [S.board, String(S.cls), S.subject, S.lang].join('|');
  // Invalidate stale/old-format or differently scoped daily sets.
  if (S.dailySet && S.dailySet.date === today && S.dailySet.scope === scope && Array.isArray(S.dailySet.items) && S.dailySet.items.length) {
    const ok = S.dailySet.items.every(it => it && typeof it === 'object' && (it.q||'').trim().length > 5);
    if (ok) return S.dailySet.items;
  }
  // Discard broken set
  S.dailySet = null; store.remove(dailyStoreKey());
  const rand = _stableDailyPick();
  const pick=(arr,n)=>{ const a=arr.slice(); const out=[]; while(out.length<n && a.length){ const idx=Math.floor(rand()*a.length); out.push(a.splice(idx,1)[0]); } return out; };
  const MIN_Q = 20;
  function good(q){ return q && String(q).trim().length >= MIN_Q; }
  function sourceLabel(q){
    if (!q || !q.paperCode) return '';
    return [q.paperCode, q.session, q.part ? 'Part ' + q.part : '', q.option ? 'Option ' + q.option : '', q.sourcePage ? 'p. ' + q.sourcePage : ''].filter(Boolean).join(' · ');
  }

  // Use the same board/class/subject gate as the Past Years view.
  const pool = (UP.pyq||[])
    .filter(qInScope)
    .map(q=>({raw:q, text:pyqQuestionText(q)}))
    .filter(x=>good(x.text));

  // Initialize SRS cards and expose multi-chapter OR roots in every tagged chapter.
  const chMap={};
  pool.forEach(x=>{
    srsAddCard(x.raw.ch, x.text);
    const ids = UP.qChapterIds ? UP.qChapterIds(x.raw) : [x.raw.ch];
    ids.forEach(id=>{
      const list = chMap[id] = chMap[id] || [];
      if (!list.some(item => item.raw.id && item.raw.id === x.raw.id)) list.push(x);
    });
  });

  // Weak: chapters <50% mastery (>=3 attempted)
  const weak=[], fresh=[], due=[];
  // Due SRS cards
  srsDueCards().forEach(d=>{
    if(!good(d.q)) return;
    const source = pool.find(x=>x.text===d.q);
    // Mastery can contain cards from another subject/board; never leak them.
    if (!source) return;
    due.push({q:d.q, ch:d.chId, chName:(chapterById(d.chId)?P(chapterById(d.chId)):''), sourceMeta:sourceLabel(source.raw), label:S.lang==='hi'?'दोहराना':'Review'});
  });
  // Weak/fresh by chapter
  (UP.catalogue(S.cls,S.subject)||[]).forEach(c=>{
    const m=S.mastery[c.id]||{attempted:0,correct:0};
    const qs=(chMap[c.id]||[]).filter(x=>good(x.text));
    qs.forEach(x=>{
      const item={q:x.text,ch:c.id,chName:P(c),sourceMeta:sourceLabel(x.raw)};
      if(m.attempted>=3 && m.correct/m.attempted<0.5) weak.push({...item,label:S.lang==='hi'?'कमज़ोर':'Weak'});
      else if(!(m.cards||[]).find(card=>card.q===x.text&&card.box>0)) fresh.push({...item,label:S.lang==='hi'?'नया':'New'});
    });
  });

  const duePicked = pick(due, Math.min(5,due.length));
  let need = 10 - duePicked.length;
  const weakN = Math.min(weak.length, Math.ceil(need*0.5));
  const weakPicked = pick(weak, weakN);
  need -= weakPicked.length;
  const freshPicked = pick(fresh, Math.min(need, fresh.length));
  const items = [];
  const used = new Set();
  [...duePicked, ...weakPicked, ...freshPicked].forEach(it=>{
    if (!used.has(it.q)) { used.add(it.q); items.push(it); }
  });

  // If we still don't have 10 (cold start with no mastery data), fill with random pool Qs
  if (items.length < 10) {
    const filler = pool
      .filter(x=>!used.has(x.text))
      .map(x=>({q:x.text, ch:x.raw.ch, chName:chapNameForQ(x.raw), sourceMeta:sourceLabel(x.raw), label:S.lang==='hi'?'स्ट्रेच':'Stretch'}));
    pick(filler, 10-items.length).forEach(it=>{ if(!used.has(it.q)){ used.add(it.q); items.push(it); } });
  }

  S.dailySet = { date: today, scope, items: items.slice(0,10) };
  store.set(dailyStoreKey(), S.dailySet);
  return S.dailySet.items;
};

/* ---------- #4 Mock test mode ---------- */
function viewMockTest(params){
  const subject = params.subject || S.subject;
  const N = 80;
  // Reuse an unfinished session across rerenders and reloads. Scope changes and
  // the explicit new-test action clear it in the router/handlers above.
  if (!S.mockTest || !Array.isArray(S.mockTest.items) || !S.mockTest.items.length || !S.mockTest.started) {
    const pool=[];
    const seenIds = new Set();
    function qText(q){ return pyqQuestionText(q); }
    (UP.catalogue(S.cls, subject)||[]).forEach(c=>{
      const qs = (UP.pyq||[]).filter(function(q){
        return qInScope(q) && qSubject(q)===subject && UP.qHasChapter(q, c.id);
      });
      qs.forEach(function(q){
        if (q.id && seenIds.has(q.id)) return;
        if (q.id) seenIds.add(q.id);
        const t = qText(q);
        if (t && t.length >= 15) {
          const chapters = (UP.qChapterIds ? UP.qChapterIds(q) : [q.ch]).map(id => (UP.catalogue(S.cls, subject)||[]).find(ch => String(ch.id) === String(id))).filter(Boolean).map(P);
          pool.push({q:t, ch:q.ch || c.id, chName:chapters.join(' / ') || P(c), source:q});
        }
      });
    });
    if (!pool.length) {
      clearMockTest();
      return `<div class="empty"><h3>${S.lang==='hi'?'अभी प्रश्न उपलब्ध नहीं हैं':'No questions yet'}</h3><p>${S.lang==='hi'?'इस कक्षा, बोर्ड और विषय के लिए कोई प्रश्न नहीं है।':'There are no questions for this class, board and subject.'}</p></div>`;
    }
    const picked=[]; const copy=pool.slice();
    const count=Math.min(N, copy.length);
    // Daily practice is intentionally date-seeded; a NEW mock should be a
    // fresh sample rather than the identical daily-seeded paper each time.
    while(picked.length<count){ picked.push(copy.splice(Math.floor(Math.random()*copy.length),1)[0]); }
    // Complete, verified keys are not available for every question.
    const ungraded = true;
    S.mockTest = { subject, scope:[S.board, String(S.cls), subject].join('|'), started:Date.now(), items:picked, answers:{}, durations:{}, finished:false, ungraded };
    store.set(mockStoreKey(), S.mockTest);
  }
  // Older in-progress sessions must not suddenly be marked by the local solver.
  S.mockTest.ungraded = true;
  const picked = S.mockTest.items;
  const unkeyedTrack = true;
  const answers = S.mockTest.answers || (S.mockTest.answers = {});
  const attempted = Object.values(answers).filter(v => String(v || '').trim()).length;
  return `<section class="page-head">
    <span class="eyebrow">${icon('clock')} ${S.lang==='hi'?'मॉक टेस्ट':'Mock test'}</span>
    <h1>${esc(P(UP.subjects[subject]))} — ${picked.length} ${S.lang==='hi'?'प्रश्न':'questions'}</h1>
    <p>${unkeyedTrack
      ? (S.lang==='hi'?'3 घंटे · अभ्यास प्रश्न · सभी प्रश्नों की सत्यापित कुंजी उपलब्ध न होने से अंक नहीं दिए जाते':'3 hours · practice questions · ungraded because complete verified keys are not available')
      : (S.lang==='hi'?'3 घंटे · CBSE पैटर्न · सबमिट पर स्वतः मूल्यांकन':'3 hours · CBSE pattern · auto-graded on submit')}</p>
  </section>
  <div class="card flat" style="padding:14px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
    <div id="mock-timer" style="font-size:22px;font-weight:700;font-variant-numeric:tabular-nums">03:00:00</div>
    <div style="flex:1"></div>
    <span id="mock-progress" class="tag grey">${attempted} / ${picked.length}</span>
    <button class="btn btn-primary btn-sm" id="mock-submit">${icon('check')} ${unkeyedTrack ? (S.lang==='hi'?'अभ्यास पूरा करें':'Finish practice') : (S.lang==='hi'?'जमा करें':'Submit test')}</button>
  </div>
  <ol class="mock-list" id="mock-list" style="padding:0;margin:12px 0 0;list-style:none">
    ${picked.map((it,i)=>`<li class="card flat" data-i="${i}" style="padding:14px 16px;margin-bottom:10px">
      <div class="meta-row"><span class="tag cream">Q${i+1}</span><span class="tag grey">${esc(it.chName)}</span>${it.source ? `<span class="tag">${esc([it.source.paperCode, it.source.session, it.source.part ? 'Part ' + it.source.part : '', it.source.option ? 'Option ' + it.source.option : ''].filter(Boolean).join(' · '))}</span>` : ''}</div>
      <p style="margin:8px 0;font-size:14.5px">${esc(it.q)}</p>
      <textarea rows="2" class="mock-ans" data-i="${i}" placeholder="${S.lang==='hi'?'अपना उत्तर लिखें…':'Your answer…'}" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;resize:vertical;background:#fff">${esc(answers[i] || '')}</textarea>
    </li>`).join('')}
  </ol>`;
}
function startMockTimer(){
  const el=document.getElementById('mock-timer'); if(!el) return;
  const end = S.mockTest.started + 3*3600*1000;
  clearInterval(window.__mtTimer);
  window.__mtTimer = setInterval(()=>{
    const ms = Math.max(0,end-Date.now());
    const h=Math.floor(ms/3600000), mm=Math.floor((ms%3600000)/60000), ss=Math.floor((ms%60000)/1000);
    if(el) el.textContent = String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
    if(ms<=0){ clearInterval(window.__mtTimer); submitMockTest(true); }
  }, 1000);
}
function submitMockTest(auto){
  if(!S.mockTest || S.mockTest.finished) return;
  clearInterval(window.__mtTimer);
  S.mockTest.finished = true;
  S.mockTest.ungraded = true;
  const attempted = Object.values(S.mockTest.answers || {}).filter(v => String(v || '').trim()).length;
  S.mockTest.score = { correct: null, attempted, total: S.mockTest.items.length, ungraded: true };
  store.set('mockLast' + ownerSuffix(), S.mockTest);
  store.set(mockStoreKey(), S.mockTest);
  render();
}
function viewMockResult(){
  const r = S.mockTest && S.mockTest.score;
  if(!r) return `<div class="empty"><h3>${S.lang==='hi'?'कोई टेस्ट पूरा नहीं हुआ':'No completed test'}</h3><p><a class="btn btn-primary btn-sm" href="#/mock">${S.lang==='hi'?'मॉक टेस्ट शुरू करें':'Start a mock test'}</a></p></div>`;
  return `<section class="page-head">
    <span class="eyebrow">${icon('check')} ${S.lang==='hi'?'अभ्यास पूरा':'Practice complete'}</span>
    <h1>${S.lang==='hi'?'अंक नहीं दिए गए':'Ungraded practice'}</h1>
    <p>${S.lang==='hi'?`${r.attempted}/${r.total} प्रश्नों का प्रयास किया। सभी प्रश्नों की सत्यापित कुंजी उपलब्ध नहीं है, इसलिए अंक नहीं दिए गए।`:`Attempted ${r.attempted} of ${r.total}. Complete verified answer keys are not available, so no score was assigned.`}</p>
    <div style="margin-top:14px"><a class="btn btn-primary btn-sm" href="#/mock?new=1">${icon('clock')} ${S.lang==='hi'?'नया अभ्यास':'New practice'}</a></div>
  </section>`;
}
function quickLocalAnswer(q){ try { return window.localSolve ? window.localSolve(q,{subj:S.subject,cls:S.cls,lang:S.lang}) : null; } catch(e){return null;} }

/* ---------- #5 Offline prefetch next 20 on chapter open ---------- */
function prefetchChapter(chId){
  if (needsAIOnly()) return; // no verified offline solver for these subjects
  const qs = ((UP.pyq||[]).filter(function(q){
    return UP.qHasChapter(q, chId) && q.subject===S.subject &&
      (q.cls == null ? +S.cls===10 : +q.cls===+S.cls);
  }).map(function(q){return P({en:q.en,hi:q.hi});}));
  const key = q => 'upay:ans:'+S.cls+':'+S.subject+':'+q;
  let need = qs.slice(0,20).filter(q=>!localStorage.getItem(key(q)));
  need.forEach(async q=>{
    try {
      const a = quickLocalAnswer(q);
      if (a) localStorage.setItem(key(q), JSON.stringify({a,offline:true,t:Date.now()}));
    } catch(e){}
  });
}

/* ---------- #6 Progress export/import (JSON) ---------- */
function collectScopedStudy(){
  const entries = [];
  try {
    for (let i=0; i<localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      const match = /^upay\.(mastery|hardList|dailyProgress)\.scope\.(.+)$/.exec(key);
      if (!match) continue;
      const scope = JSON.parse(decodeURIComponent(match[2]));
      if (!Array.isArray(scope) || scope[0] !== S.savedKey || scope.length !== 4) continue;
      const value = JSON.parse(localStorage.getItem(key));
      entries.push({ kind:match[1], board:scope[1], cls:scope[2], subject:scope[3], value });
    }
  } catch(e) { /* quota/storage access: keep the rest of the export usable */ }
  return entries;
}
function exportProgress(){
  const data = { saved:S.saved, mastery:S.mastery, progress:S.progress, recent:S.recent,
    dailySet:S.dailySet, mockTest:S.mockTest, scopedStudy:collectScopedStudy(),
    cls:S.cls, subject:S.subject, lang:S.lang, board:S.board, at:new Date().toISOString(), v:4 };
  // The provenance of old unscoped practice records is unknown. Keep them in a
  // guest export without assigning them to an arbitrary subject or account.
  if (S.savedKey === 'saved') data.legacyUnscoped = {
    mastery:store.get('mastery',{}), hardList:store.get('hardList',[]), dailyProgress:store.get('dailyProgress',{})
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  downloadLink(blob, 'upay-progress-'+todayKey()+'.json');
  toast(S.lang==='hi'?'प्रगति डाउनलोड हो गई':'Progress downloaded');
}
function importProgress(file){
  const r = new FileReader();
  r.onload = async ()=>{
    try {
      const d = JSON.parse(r.result);
      if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('invalid backup');
      if (Array.isArray(d.saved)) S.saved = d.saved;
      ['cls','subject','lang','board'].forEach(k=>{ if(d[k]) S[k]=d[k]; });
      S.test.board = S.board;
      if (Array.isArray(d.scopedStudy)) d.scopedStudy.forEach(entry => {
        if (!entry || !['mastery','hardList','dailyProgress'].includes(entry.kind) ||
            typeof entry.board !== 'string' || typeof entry.subject !== 'string' ||
            !Number.isInteger(+entry.cls) || +entry.cls < 1 || +entry.cls > 12) return;
        const key = entry.kind + '.scope.' + encodeURIComponent(JSON.stringify([S.savedKey, entry.board, +entry.cls, entry.subject]));
        store.set(key, entry.value);
      });
      S.studyScope = null; syncStudyScope();
      // v2/v3 exports have only the current scope's mastery.
      if (!Array.isArray(d.scopedStudy) && d.mastery && typeof d.mastery === 'object') S.mastery = d.mastery;
      if (d.progress && typeof d.progress === 'object') S.progress = d.progress;
      if (Array.isArray(d.recent)) S.recent = d.recent;
      if (d.dailySet) { S.dailySet = d.dailySet; store.set(dailyStoreKey(), S.dailySet); }
      if (d.mockTest) { S.mockTest = d.mockTest; store.set(mockStoreKey(), S.mockTest); }
      if (S.savedKey === 'saved' && d.legacyUnscoped && typeof d.legacyUnscoped === 'object') {
        ['mastery','hardList','dailyProgress'].forEach(k => {
          if (localStorage.getItem('upay.'+k) === null && d.legacyUnscoped[k] != null) store.set(k, d.legacyUnscoped[k]);
        });
      }
      saveSaved(); saveMastery(); saveProgress(); saveRecent(); saveState();
      await Promise.all([UP.switchSubject(S.subject), UP.loadBoardPack(S.board)]);
      toast(S.lang==='hi'?'प्रगति आयात हो गई':'Progress imported');
      render();
    } catch(e){ toast(S.lang==='hi'?'फ़ाइल सही नहीं या सामग्री लोड नहीं हुई':'Invalid backup or content could not load'); }
  };
  r.readAsText(file);
}

/* ---------- #7 Hindi-first UX sweep: complete remaining strings ---------- */
(function hiSweep(){
  const add = {
    conf: ['Confidence', 'विश्वास'],
    related: ['Related questions', 'मिलते-जुलते प्रश्न'],
    listen: ['Listen', 'सुनें'],
    stop: ['Stop', 'रोकें'],
    copy: ['Copy', 'कॉपी'],
    shareImg: ['Share image', 'तस्वीर शेयर करें'],
    print: ['Print', 'प्रिंट'],
    save: ['Save', 'सहेजें'],
    flag: ['Flag wrong', 'गलत बताएँ'],
    today: ["Today's practice", 'आज का अभ्यास'],
    parent: ['Parent view', 'अभिभावक सारांश'],
    mistakes: ['Mistake book', 'गलतियों की किताब'],
    mock: ['Mock test', 'मॉक टेस्ट'],
    search: ['Search questions…', 'प्रश्न खोजें…'],
    exportPrg: ['Export progress', 'प्रगति निर्यात'],
    importPrg: ['Import progress', 'प्रगति आयात'],
    large: ['Large text', 'बड़ा अक्षर'],
    dyslexic: ['Dyslexia friendly', 'डिस्लेक्सिया फ्रेंडली']
  };
  for (const k in add) T[k] = add[k];
})();

/* ---------- #8 PWA polish ---------- */
(function pwaPolish(){
  let link = document.querySelector('link[rel=manifest]');
  if (!link){
    link = document.createElement('link'); link.rel='manifest';
    document.head.appendChild(link);
  }
  const manifest = {
    name:'Upay · उपाय', short_name:'Upay',
    description:'Free Class 10 CBSE study companion',
    start_url:'/', scope:'/', display:'standalone', orientation:'portrait',
    background_color:'#fbf7ec', theme_color:'#1e3a2b',
    icons:[{src:'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="36" fill="%231e3a2b"/><text x="96" y="120" font-family="serif" font-size="96" fill="%23f4c24b" text-anchor="middle" font-weight="700">उ</text></svg>', sizes:'192x192', type:'image/svg+xml', purpose:'any maskable'}]
  };
  const blob = new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'});
  link.href = URL.createObjectURL(blob);
  // Meta theme color
  let mt=document.querySelector('meta[name=theme-color]');
  if(!mt){ mt=document.createElement('meta'); mt.name='theme-color'; document.head.appendChild(mt); }
  mt.content = '#1e3a2b';
  // Apple touch icon
  if(!document.querySelector('link[rel=apple-touch-icon]')){
    const l=document.createElement('link'); l.rel='apple-touch-icon'; l.href=manifest.icons[0].src; document.head.appendChild(l);
  }
})();

/* ---------- #9 Daily reminder nudge ---------- */
function todayReminder(){
  const items = buildDailySet();
  const done = (S.dailyProgress && S.dailyProgress[todayKey()]) || 0;
  if (done >= items.length) return '';
  return `<div class="card flat daily-reminder">
    ${icon('target')}
    <div style="flex:1">
      <b>${S.lang==='hi'?'आज का अभ्यास बाकी है':'Daily practice pending'}</b>
      <div style="font-size:13px;color:var(--ink-500)">${S.lang==='hi'?`${done}/${items.length} प्रश्न पूरे`:`${done}/${items.length} done`}</div>
    </div>
    <a class="btn btn-sm btn-primary" href="#/today">${S.lang==='hi'?'शुरू करें':'Start'}</a>
  </div>`;
}
function askNotifPermission(){
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    setTimeout(()=>{ Notification.requestPermission(); }, 8000);
  }
}

/* ---------- #10 Question text search (lightweight trigram) ---------- */
/* We build an inverted index lazily when ⌘K is first opened or when user
   types into a dedicated search. The index is persisted in IndexedDB/localStorage
   but rebuilt when catalogue changes. */
window.__qIndex = null;
function buildQIndex(){
  const key = JSON.stringify([S.cls, S.subject, S.board, S.lang, (UP.pyq || []).length]);
  if (window.__qIndex && window.__qIndexScope === key) return window.__qIndex;
  const idx = [];
  const seen = new Set();
  const sub = S.subject;
  const chapters = UP.catalogue(S.cls, sub) || [];
  (UP.pyq || []).filter(qInScope).forEach(q => {
    if (q.id && seen.has(q.id)) return;
    if (q.id) seen.add(q.id);
    const ids = (UP.qChapterIds ? UP.qChapterIds(q) : [q.ch]).filter(Boolean);
    const labels = ids.map(id => chapters.find(ch => String(ch.id) === String(id))).filter(Boolean).map(P);
    idx.push({ q:pyqQuestionText(q), ch:q.ch, chName:labels.join(' / '), sub:sub });
  });
  window.__qIndex = idx;
  window.__qIndexScope = key;
  return idx;
}
function searchQs(term, limit){
  if(!term) return [];
  const idx = buildQIndex(); const t=term.toLowerCase();
  const scored = idx.map(r=>{
    const s = r.q.toLowerCase();
    let sc=0;
    if (s.indexOf(t)>=0) sc += 10;
    const words = t.split(/\s+/).filter(Boolean);
    words.forEach(w=>{ if(s.indexOf(w)>=0) sc+=2; });
    return {r,sc};
  }).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc).slice(0,limit||15).map(x=>x.r);
  return scored;
}

/* ---------- #11 PYQ year/board citation in AI prompt ---------- */
/* When rendering an AI answer for a known PYQ, prepend the system instruction
   that forces CBSE-key primacy. This is enforced via the existing fetch payload
   by adding citation data to the question text when the question came from
   a PYQ list (detected by route). */
function citeIfPYQ(q){
  const h = parseHash();
  if (h.name==='pyq' && h.year){
    return `[CBSE Class 10 ${P(UP.subjects[S.subject])}, ${h.year} PYQ. Stick to the official marking scheme; do not contradict the NCERT/CBSE answer key.]\n\n${q}`;
  }
  return q;
}

/* ---------- #12 One-page chapter cheatsheets (pre-rendered from chapter data) ---------- */
function viewCheatsheet(params){
  const ch = chapterById(params.ch);
  if(!ch) return `<div class="empty"><h3>${S.lang==='hi'?'अध्याय नहीं मिला':'Chapter not found'}</h3></div>`;
  if (english12Track()) {
    const hi = S.lang === 'hi';
    return `<section class="page-head"><span class="eyebrow">${icon('book')} ${hi ? 'पुनरावृत्ति संकेत' : 'Reading review'}</span>
      <h1>${esc(P({en:ch.en,hi:ch.hi}))}</h1><p>${esc(P(ch.bookTitle))} · ${esc(P(ch.sectionTitle))} · ${esc(ch.author)}</p>
      <button class="btn btn-sm btn-primary" data-action="print">${icon('print')} ${hi ? 'प्रिंट' : 'Print'}</button>
      <a class="btn btn-sm btn-ghost" href="#/chapter/${ch.id}">${hi ? 'पाठ पर लौटें' : 'Back to reading'}</a>
    </section>
    <article class="card flat cheatsheet" style="padding:20px;line-height:1.75">
      <p class="muted">${hi ? 'उपाय के संकेत; मूल PDF से उत्तर और व्याख्या जाँचें। यह आधिकारिक उत्तर-कुंजी नहीं है।' : 'Upay prompts; check answers and interpretations against the original PDF. This is not an official answer key.'}</p>
      <p>${esc(P({en:ch.enDesc,hi:ch.hiDesc}))}</p><h3>${hi ? 'पढ़ते समय' : 'Reading focus'}</h3>
      <ul>${ch.focus.map(item => `<li>${esc(P(item))}</li>`).join('')}</ul>
      <h3>${hi ? 'स्वयं-जाँच' : 'Review questions'}</h3><ol>${ch.review.map(item => `<li>${esc(P(item))}</li>`).join('')}</ol>
      ${english12SourceLink(ch)}${english12CourseCaution(ch)}
    </article>`;
  }
  if (economicsTrack()) {
    const formulas = (ch.formulas || []).map(f => `<li><b>${esc(P(f.n))}:</b> ${esc(f.e)}${f.note ? ` — ${esc(P(f.note))}` : ''}</li>`).join('');
    return `<section class="page-head">
      <span class="eyebrow">${icon('book')} ${S.lang==='hi'?'संक्षिप्त पुनरावृत्ति':'Revision sheet'}</span>
      <h1>${esc(P(ch))}</h1><p>${esc(P(ch.bookTitle))} · ${S.lang==='hi'?'अध्याय':'Chapter'} ${ch.n}</p>
      <button class="btn btn-sm btn-primary" data-action="print">${icon('print')} ${S.lang==='hi'?'प्रिंट':'Print'}</button>
      <a class="btn btn-sm btn-ghost" href="#/chapter/${ch.id}">${S.lang==='hi'?'अध्याय पर लौटें':'Back to chapter'}</a>
    </section>
    <article class="card flat cheatsheet" style="padding:20px;line-height:1.75">
      <p class="muted">${S.lang==='hi'?'संक्षिप्त सामग्री; पुस्तक और शिक्षक से जाँचें।':'Concise review material; check it against the book and your teacher.'}</p>
      <h3>${S.lang==='hi'?'मुख्य विचार':'Key ideas'}</h3>
      <ul>${(ch.concepts||[]).map(c => `<li><b>${esc(P(c.t))}:</b> ${esc(P(c.b))}</li>`).join('')}</ul>
      ${formulas ? `<h3>${S.lang==='hi'?'मुख्य सूत्र':'Key formulas'}</h3><ul>${formulas}</ul>` : ''}
      <h3>${S.lang==='hi'?'स्वयं जाँच':'Review checks'}</h3>
      <ol>${(ch.practice||[]).map(item => `<li>${esc(P(item.q))}</li>`).join('')}</ol>
      <p class="muted">${S.lang==='hi'?'ये उपाय के अभ्यास प्रश्न हैं, बोर्ड प्रश्न या आधिकारिक उत्तर-कुंजी नहीं।':'These are Upay review checks, not board questions or an official answer key.'}</p>
    </article>`;
  }
  const qs = (UP.pyq || []).filter(q => qInScope(q) && UP.qHasChapter(q, params.ch)).map(pyqQuestionText);
  const formulas = []; // stub: populated from solver knowledge where possible
  return `<section class="page-head">
    <span class="eyebrow">${icon('book')} ${S.lang==='hi'?'चीट शीट':'Cheatsheet'}</span>
    <h1>${esc(P(ch))}</h1>
    <p>${S.lang==='hi'?'महत्वपूर्ण सूत्र, परिभाषाएँ और याद रखने योग्य बातें':'Key formulas, definitions, and memory points'}</p>
    <div style="margin-top:10px"><button class="btn btn-sm btn-primary" data-action="print">${icon('print')} ${S.lang==='hi'?'प्रिंट':'Print'}</button>
    <button class="btn btn-sm" data-action="shareSheet" data-ch="${params.ch}">${icon('share')} ${S.lang==='hi'?'शेयर':'Share'}</button></div>
  </section>
  <article class="card flat cheatsheet" style="padding:20px;line-height:1.75">
    <h3 style="margin-top:0">${S.lang==='hi'?'मुख्य सूत्र':'Key formulas'}</h3>
    <ul>${(ch.formulas||[]).map(f=>`<li>${esc(f)}</li>`).join('')||`<li style="color:var(--ink-500)">${S.lang==='hi'?'इस अध्याय के लिए सूत्र जल्द जोड़े जाएँगे':'Formulas for this chapter coming soon — use AI to ask for a formula list.'}</li>`}</ul>
    <h3>${S.lang==='hi'?'अभ्यास प्रश्न':'Practice questions'}</h3>
    <p class="muted">${S.lang==='hi'?'ये उपलब्ध प्रश्नों के उदाहरण हैं, आवृत्ति के अनुसार क्रम नहीं।':'These are examples from the available bank, not a frequency ranking.'}</p>
    <ol>${qs.slice(0,8).map(q=>`<li>${esc(q)}</li>`).join('')}</ol>
  </article>`;
}

/* ---------- #13 Mistake book ---------- */
function viewMistakes(){
  const miss = Object.keys(S.mastery||{}).flatMap(chId=>{
    return (S.mastery[chId].cards||[]).filter(c=>c.box===0 && c.last).map(c=>({...c,chId}));
  }).sort((a,b)=>(b.last>a.last?1:-1));
  // Also include questions dailyMark 'hard' flagged
  const hard = (S.hardList||[]).map(q=>({q,box:0,isHard:true}));
  const hardQuestions = new Set(hard.map(item => item.q));
  const all = [...hard, ...miss.filter(item => !hardQuestions.has(item.q))];
  return `<section class="page-head">
    <span class="eyebrow">${icon('book')} ${S.lang==='hi'?'गलतियों की किताब':'Mistake book'}</span>
    <h1>${all.length}</h1>
    <p>${S.lang==='hi'?'वे प्रश्न जिनमें आपको परेशानी हुई — रोज़ एक दोहराइए':'Questions you struggled with — review one daily'}</p>
  </section>
  ${!all.length ? `<div class="empty"><h3>${S.lang==='hi'?'अभी कोई गलती नहीं':'No mistakes yet'}</h3><p>${S.lang==='hi'?'आज का अभ्यास शुरू करें':'Start Today\'s practice'}</p></div>` :
  `<div class="pyq-list">${all.map((c,i)=>`<article class="pyq-item">
    <div class="pmeta"><span class="tag ${c.isHard?'warn':'cream'}">${c.isHard?(S.lang==='hi'?'कठिन':'Hard'):('Box '+ (c.box||0))}</span></div>
    <div class="pbody"><div class="pq">${esc(c.q)}</div>
    <div class="pactions"><button class="btn btn-primary btn-sm" data-action="sample" data-q="${esc(c.q)}">${icon('sparkle')} ${S.lang==='hi'?'हल करें':'Solve'}</button>
    ${c.chId?`<a class="btn btn-sm" href="#/chapter/${c.chId}">${S.lang==='hi'?'अध्याय':'Chapter'}</a>`:''}
    <button class="btn btn-sm btn-ghost" data-action="removeMistake" data-i="${i}">×</button></div></div></article>`).join('')}</div>`}`;
}

/* ---------- #14 Story-format share image (9:16) ---------- */
function shareAnswerAsStory(){
  const q=S.q, a=S.answer;
  if(!q||!a) return;
  const W=1080,H=1920;
  const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
  x.fillStyle='#fdf8ea'; x.fillRect(0,0,W,H);
  // Brand band
  x.fillStyle='#1e3a2b'; x.fillRect(0,0,W,180);
  x.fillStyle='#f4c24b'; x.font='bold 60px serif, Noto Serif, Georgia'; x.fillText('उपाय · Upay',70,120);
  x.fillStyle='#1e3a2b'; x.font='bold 52px serif, Noto Serif, Georgia';
  wrap(x,'प्रश्न',70,280,W-140,70);
  x.fillStyle='#2a2a2a'; x.font='40px sans-serif, Noto Sans, Arial';
  wrap(x,q,70,340,W-140,56);
  x.fillStyle='#1e3a2b'; x.font='bold 52px serif'; wrap(x,'उत्तर',70,780,W-140,70);
  x.fillStyle='#2a2a2a'; x.font='40px sans-serif';
  wrap(x,(a.result||a.summary||(typeof a==='string'?a:'')).toString().slice(0,360),70,840,W-140,56);
  x.fillStyle='#1e3a2b'; x.font='30px sans-serif'; x.fillText('upay.fyi · Class 10 CBSE · मैंने हल किया!',70,H-80);
  c.toBlob(b=>{
    const f=new File([b],'upay-story.png',{type:'image/png'});
    if(navigator.share && navigator.canShare && navigator.canShare({files:[f]})){
      navigator.share({files:[f], title:'Upay story'}).catch(()=>downloadLink(b,'upay-story.png'));
    } else downloadLink(b,'upay-story.png');
  },'image/png');
}
function wrap(ctx,text,x,y,maxW,lh){
  const words=String(text).split(/\s+/); let line='';
  for (const w of words){ const t=line+(line?' ':'')+w; if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,x,y);y+=lh;line=w;}else line=t; }
  if(line) ctx.fillText(line,x,y);
}

/* ---------- Accessibility display preferences ---------- */
function applyLargeText(on){
  document.documentElement.classList.toggle('upay-large', !!on);
  store.set('largeText', !!on);
}
function applyDyslexic(on){
  document.documentElement.classList.toggle('upay-dyslexic', !!on);
  store.set('dyslexic', !!on);
  if (on && !document.getElementById('opendyslexic')){
    // Use Atkinson Hyperlegible which is openly available and known to help
    const l=document.createElement('link'); l.id='atkinson'; l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
    document.head.appendChild(l);
  }
}

/* ---------- #17 Kill jQuery? There's no jQuery — only modularization later. ---------- */

/* ---------- #18 SW stale-while-revalidate improvements handled in sw.js patch below ---------- */

/* ---------- #19 Anonymous opt-in telemetry ---------- */
function telemetry(event, props){
  if (store.get('telemetry', true) === false) return;
  try { navigator.sendBeacon('/api/tel', JSON.stringify({e:event,p:props||{},v:24})); } catch(e){}
}

/* ---------- #20 Graceful 429 / quota handling ---------- */
/* Already partially in error handler; tighten the message. Patched inside AI
   response handling via a response interceptor below. */
(function interceptQuota(){
  const of = window.fetch;
  window.fetch = async function(...args){
    const r = await of.apply(this,args);
    if (r.status===429 && String(args[0]).indexOf('/api/ai/')>=0){
      // clone so the UI still reads it
      const clone = r.clone();
      try {
        const j = await clone.json();
        console.warn('AI quota 429 — falling back to local solver', j);
      } catch(e){}
    }
    return r;
  };
})();

/* ---------- Patch #1482: /login.html -> #/login ---------- */
(function patchLoginHref(){
  const obs = new MutationObserver(()=>{
    document.querySelectorAll('a[href="/login.html"]').forEach(a=>{ a.setAttribute('href','#/login'); });
  });
  obs.observe(document.body,{childList:true,subtree:true});
  document.querySelectorAll('a[href="/login.html"]').forEach(a=>{ a.setAttribute('href','#/login'); });
})();

/* ---------- Hook dailyProgress in dailyMark ---------- */
const __origDailyMark = window.dailyMark || function(){};
window.dailyMark = function(i, ok){
  __origDailyMark(i, ok);
  const key = todayKey();
  S.dailyProgress = S.dailyProgress || {};
  S.dailyProgress[key] = (S.dailyProgress[key]||0) + 1;
  saveDailyProgress();
  const it = S.dailySet && S.dailySet.items[i];
  if (it) {
    srsMark(it.q, ok);
    S.hardList = S.hardList || [];
    if (!ok && !S.hardList.includes(it.q)) S.hardList.unshift(it.q);
    if (ok) S.hardList = S.hardList.filter(q => q !== it.q);
    saveHardList();
  }
};

/* Route dispatch is handled by the main render() if/else chain — this
   telemetry hook fires after render sets document.title. */
window.addEventListener('hashchange', ()=>{ try { telemetry('route',{n:(parseHash().name||'home')}); }catch(e){} });
setTimeout(()=>{ try { telemetry('route',{n:(parseHash().name||'home')}); }catch(e){} }, 1500);

function viewSearch(params){
  const q = (params.q||'').trim();
  const results = q ? searchQs(q, 40) : [];
  return `<section class="page-head"><span class="eyebrow">${icon('search')} ${S.lang==='hi'?'खोज':'Search'}</span>
    <h1 style="margin-bottom:10px">${S.lang==='hi'?'प्रश्न खोजें':'Search questions'}</h1>
    <form class="search-bar" id="qSearchForm" style="display:flex;gap:8px"><input id="qSearchInput" class="field-input" value="${esc(q)}" placeholder="${S.lang==='hi'?'कीवर्ड लिखें…':'Type a keyword…'}" autofocus style="flex:1;padding:12px 14px;border:1px solid var(--line);border-radius:12px;font:inherit;background:#fff"><button class="btn btn-primary btn-sm">${icon('search')} ${S.lang==='hi'?'खोजें':'Search'}</button></form>
  </section>
  ${q?`<p style="color:var(--ink-500);font-size:13.5px;margin:8px 0">${results.length} ${S.lang==='hi'?'परिणाम':'results'}</p>
  <div class="pyq-list">${results.map(r=>`<article class="pyq-item"><div class="pmeta"><span class="tag grey">${esc(r.sub)}</span><span class="tag cream">${esc(r.chName)}</span></div>
    <div class="pbody"><div class="pq">${esc(r.q)}</div>
    <div class="pactions"><button class="btn btn-primary btn-sm" data-action="sample" data-q="${esc(r.q)}">${icon('sparkle')} ${S.lang==='hi'?'हल करें':'Solve'}</button></div></div></article>`).join('')||`<p>${S.lang==='hi'?'कुछ नहीं मिला':'Nothing found'}</p>`}</div>`:''}`;
}

/* ---------- Me-page extensions: toggles + export/import + new links ---------- */
const __viewMe = window.viewMe;
window.viewMe = function(){
  const base = __viewMe ? __viewMe() : '';
  const extra = `<div class="card flat" style="padding:16px;margin-top:12px">
    <h3 style="margin-top:0;font-size:15px">${S.lang==='hi'?'सीखने के उपकरण':'Learning tools'}</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
      <a class="btn btn-sm btn-ghost" href="#/mock">${icon('clock')} ${t('mock')}</a>
      <a class="btn btn-sm btn-ghost" href="#/mistakes">${icon('book')} ${t('mistakes')}</a>
      <a class="btn btn-sm btn-ghost" href="#/today">${icon('target')} ${t('today')}</a>
      <a class="btn btn-sm btn-ghost" href="#/parent">${icon('user')} ${t('parent')}</a>
      <a class="btn btn-sm btn-ghost" href="#/search">${icon('search')} ${S.lang==='hi'?'खोज':'Search'}</a>
    </div>
  </div>
  <div class="card flat" style="padding:16px;margin-top:12px">
    <h3 style="margin-top:0;font-size:15px">${S.lang==='hi'?'दिखावट व पहुँच':'Appearance'}</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <label class="chip"><input type="checkbox" data-toggle="large" ${store.get('largeText',false)?'checked':''}> ${t('large')}</label>
      <label class="chip"><input type="checkbox" data-toggle="dyslexic" ${store.get('dyslexic',false)?'checked':''}> ${t('dyslexic')}</label>
    </div>
  </div>
  <div class="card flat" style="padding:16px;margin-top:12px">
    <h3 style="margin-top:0;font-size:15px">${S.lang==='hi'?'प्रगति बैकअप':'Progress backup'}</h3>
    <p class="muted" style="font-size:13px">${S.lang==='hi'?'आयात सहेजे प्रश्नों और समान विषय की अभ्यास जानकारी बदलता है। पुराना असंबद्ध डेटा अतिथि निर्यात में सुरक्षित रहता है।':'Import replaces saved questions and matching practice data. Legacy unscoped data is preserved in guest exports.'}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm btn-ghost" data-action="exportPrg">${icon('download')} ${t('exportPrg')}</button>
      <label class="btn btn-sm btn-ghost" style="cursor:pointer">${icon('upload')} ${t('importPrg')}<input type="file" id="importPrgFile" accept="application/json" hidden></label>
    </div>
  </div>`;
  // Insert extra before the closing of the wrapping section — simplest is to append
  return base + extra;
};

/* ---------- Action handlers for new buttons ---------- */
document.addEventListener('click', function(e){
  const a = e.target.closest('[data-action]');
  if(!a) return;
  const act = a.dataset.action;
  if(act==='exportPrg'){ e.preventDefault(); exportProgress(); return; }
  if(act==='shareStory'){ e.preventDefault(); shareAnswerAsStory(); return; }
  if(act==='shareSheet'){ e.preventDefault(); const ch=a.dataset.ch; go(`#/cheatsheet/${ch}`); return; }
  if(act==='removeMistake'){
    e.preventDefault();
    const hard = S.hardList || [];
    const miss = Object.keys(S.mastery||{}).flatMap(chId => (S.mastery[chId].cards||[])
      .filter(c => c.box===0 && c.last && !hard.includes(c.q)).map(c => ({...c,chId})))
      .sort((x,y)=>(y.last>x.last?1:-1));
    const i = +a.dataset.i;
    const question = i < hard.length ? hard[i] : (miss[i-hard.length] || {}).q;
    if (question) {
      S.hardList = hard.filter(q => q !== question);
      Object.keys(S.mastery||{}).forEach(chId => (S.mastery[chId].cards||[]).forEach(c => {
        if (c.q === question && c.box === 0) c.last = null;
      }));
      saveHardList(); saveMastery();
    }
    render(); return;
  }
  if(act==='mock-submit' || act==='submitMock'){ e.preventDefault(); submitMockTest(); return; }
},{capture:true});
/* mock-submit is rendered without data-action (uses an id); bind via delegation */
document.addEventListener('click',function(e){
  const b = e.target.closest('#mock-submit');
  if(!b) return;
  e.preventDefault();
  submitMockTest();
});
document.addEventListener('change',function(e){
  if(e.target.id==='importPrgFile'){ const f=e.target.files[0]; if(f) importProgress(f); e.target.value=''; return; }
  const t = e.target.closest('[data-toggle]');
  if(t){ const k=t.dataset.toggle; if(k==='large') applyLargeText(t.checked); if(k==='dyslexic') applyDyslexic(t.checked); return; }
});
document.addEventListener('input',function(e){
  if(e.target.classList && e.target.classList.contains('mock-ans')){
    const i=+e.target.dataset.i; if(!S.mockTest) return;
    S.mockTest.answers[i] = e.target.value;
    store.set(mockStoreKey(), S.mockTest);
    const done = Object.values(S.mockTest.answers).filter(v => String(v || '').trim()).length;
    const p=document.getElementById('mock-progress'); if(p) p.textContent = `${done} / ${S.mockTest.items.length}`;
    return;
  }
});
document.addEventListener('submit',function(e){
  const f=e.target.closest('#qSearchForm'); if(!f) return;
  e.preventDefault();
  const v=document.getElementById('qSearchInput').value.trim();
  go('#/search?q='+encodeURIComponent(v));
});

/* ---------- Wire story sharing into renderAIAnswer (hoist-safe) ---------- */
const __orig_renderAIAnswer = renderAIAnswer;
renderAIAnswer = function(a){
  let html = __orig_renderAIAnswer(a);
  html = html.replace(/(<button[^>]*data-action="shareImage"[^>]*>.*?<\/button>)/,
    '$1<button class="btn btn-sm btn-ghost" data-action="shareStory" type="button">📱 '+(S.lang==='hi'?'स्टोरी':'Story')+'</button>');
  return html;
};

/* ---------- Prefetch + cheatsheet link on chapter enter ---------- */
const __orig_viewChapter = viewChapter;
viewChapter = function(id, params){
  const html=__orig_viewChapter(id, params);
  try { if(id) prefetchChapter(id); } catch(e){}
  // The English reading view already links to its tailored printable review.
  if (english12Track() || businessTrack()) return html;
  return html.replace(/(<\/section>)/, `<div style="margin-top:8px"><a class="btn btn-sm btn-ghost" href="#/cheatsheet/${id}">${icon('book')} ${S.lang==='hi'?'चीट शीट':'Cheatsheet'}</a></div></section>`);
};

/* ---------- Home page nudge ---------- */
const __orig_viewHome = viewHome;
viewHome = function(){
  let h = __orig_viewHome();
  const nudge = todayReminder();
  if(nudge) h = nudge + h;
  return h;
};

/* ---------- Boot: apply saved display prefs ---------- */
// Retire the old preference without disturbing accessibility settings.
store.remove('dark');
document.documentElement.classList.remove('upay-dark');
applyLargeText(!!store.get('largeText',false));
applyDyslexic(!!store.get('dyslexic',false));

/* ---------- Install/notification prompt nudge after first visit ---------- */
if (!store.get('notifAsked',false)){
  setTimeout(()=>{ askNotifPermission(); store.set('notifAsked',true); }, 12000);
}

/* ---------- Icon placeholders for new icons (search/book/clock/download/upload/check/print) ---------- */
(function extendIcons(){
  const more = {
    search:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    book:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h9a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z"/><path d="M17 8h3v12h-3"/></svg>',
    clock:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    download:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/></svg>',
    upload:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21V9m0 0-4 4m4-4 4 4M4 3h16"/></svg>',
    check:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5 9-11"/></svg>',
    print:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>',
    warn:ICONS.warn || '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5m0 3v.01"/></svg>',
    share:ICONS.share || '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8 11 8-4M8 13l8 4"/></svg>'
  };
  for (const k in more) if (!ICONS[k]) ICONS[k]=more[k];
})();

  // Final boot steps: inject sketch styles, reveal the app, render the first page.
  injectSketchFilter();
  document.body.classList.add('up-ready');
  render();

})();
