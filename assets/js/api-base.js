/* =====================================================================
   Upay · where is the API?
   ---------------------------------------------------------------------
   These pages get opened several different ways and the API port can be
   either 8004 (primary) or 8090 (legacy). We build a candidate list,
   probe each one, and cache the first that answers. Every probe has a
   timeout so this never hangs.
   ===================================================================== */
(function (root) {
  var CACHE_KEY = 'upay.apiBase';
  var PROBE_MS = 4000;
  var PORTS = ['8004','8090'];

  function candidates() {
    var out = [];
    var h = location.hostname || '127.0.0.1';
    var proto = location.protocol === 'file:' ? 'http:' : location.protocol;
    var portMatch = (location.port || '').toString();

    // 1. the server serving this page may also serve the API
    out.push(location.origin + '/api');

    // 2. preview proxy: "abc-1234.host" -> try known upay ports on the same sandbox
    var m = h.match(/^(.*?)-(\d+)\.(.+)$/);
    if (m) {
      PORTS.forEach(function(p){
        if (p !== m[2]) out.push(proto + '//' + m[1] + '-' + p + '.' + m[3] + '/api');
      });
    }

    // 3. plain host on the known API ports (localhost / 127.0.0.1 / a LAN box)
    //    (skip if we're already on a port — the origin probe already tried that port)
    PORTS.forEach(function(p){
      if (p === portMatch) return;
      out.push(proto + '//' + h + ':' + p + '/api');
    });

    // 4. last resort for a file:// open
    if (location.protocol === 'file:') {
      PORTS.forEach(function(p){ out.push('http://127.0.0.1:' + p + '/api'); });
    }

    return out.filter(function (v, i) { return out.indexOf(v) === i; });
  }

  function probe(base, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        if (ctl) ctl.abort();
        resolve(false);
      }, ms || PROBE_MS);

      fetch(base + '/auth/me', {
        method: 'GET',
        signal: ctl ? ctl.signal : undefined,
        cache: 'no-store'
      }).then(function (r) {
        if (done) return;
        done = true; clearTimeout(timer);
        resolve(r.status === 401 || r.status === 200);
      }).catch(function () {
        if (done) return;
        done = true; clearTimeout(timer);
        resolve(false);
      });
    });
  }

  var pending = null;

  function cacheLooksStale(cached) {
    /* If we're running on a real server (not file://), and the cached base
       points at a DIFFERENT port than the page is on, drop the cache rather
       than waiting for the probe to time out. This is what was making sign-in
       fail after the port moved from 8090 -> 8004: the browser kept trying the
       dead cached port for 2.5 seconds on every page load. */
    try {
      if (location.protocol === 'file:') return false;
      var herePort = (location.port || (location.protocol === 'https:' ? '443' : '80')).toString();
      var m = cached.match(/:\/\/[^/:]+:(\d+)\/api$/);
      if (m && m[1] !== herePort) {
        /* Only treat it as stale if the page's own origin is also a candidate
           so we don't discard a deliberate cross-origin config. */
        if (location.origin + '/api' !== cached) return true;
      }
    } catch (e) {}
    return false;
  }

  function resolve() {
    if (pending) return pending;
    var cached = null;
    try { cached = localStorage.getItem(CACHE_KEY); } catch (e) {}
    if (cached && cacheLooksStale(cached)) {
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      cached = null;
    }
    if (cached) {
      pending = probe(cached, 2500).then(function (ok) {
        if (ok) return cached;
        try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
        return search();
      });
      return pending;
    }
    pending = search();
    return pending;
  }

  function search() {
    var list = candidates();
    var i = 0;
    function next() {
      if (i >= list.length) return Promise.resolve(null);
      var base = list[i++];
      return probe(base).then(function (ok) {
        if (ok) {
          try { localStorage.setItem(CACHE_KEY, base); } catch (e) {}
          return base;
        }
        return next();
      });
    }
    return next();
  }

  function reset() {
    pending = null;
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  root.UpayApi = {
    resolve: resolve,
    reset: reset,
    candidates: candidates,
    probe: probe
  };
})(typeof window !== 'undefined' ? window : globalThis);
