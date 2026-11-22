/* Shared hash-route contract for the existing site and the React migration.
   Query values use encodeURIComponent (not form encoding): '+' is literal. */
(function (root) {
  'use strict';
  function decode(value) {
    try { return decodeURIComponent(value); } catch (_) { return value; }
  }
  function parse(hash) {
    const h = String(hash || '').replace(/^#\/?/, '');
    if (!h) return { name: 'home', params: {} };
    const question = h.indexOf('?');
    const path = question < 0 ? h : h.slice(0, question);
    const query = question < 0 ? '' : h.slice(question + 1);
    const parts = path.split('/').filter(Boolean);
    const params = {};
    query.split('&').filter(Boolean).forEach(pair => {
      const eq = pair.indexOf('=');
      const key = decode(eq < 0 ? pair : pair.slice(0, eq));
      // Do not let untrusted links alter the parameter object's prototype.
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
      params[key] = decode(eq < 0 ? '' : pair.slice(eq + 1));
    });
    return { name: parts[0] || 'home', id: parts[1], params };
  }
  function ask(question, scope) {
    const params = ['q=' + encodeURIComponent(String(question))];
    if (scope && scope.cls != null) params.push('cls=' + encodeURIComponent(String(scope.cls)));
    if (scope && scope.sub) params.push('sub=' + encodeURIComponent(String(scope.sub)));
    return '#/ask?' + params.join('&');
  }
  const api = {parse, ask};
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.UP = root.UP || {}; root.UP.hashRoute = api; }
})(typeof window === 'undefined' ? globalThis : window);
