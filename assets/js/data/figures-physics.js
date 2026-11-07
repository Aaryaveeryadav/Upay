/* Physics figure placeholders — populated by extract_physics_figs.py (Phase D). */
(function(){
  function attach(q, uri) { if(!q.figs) q.figs=[]; q.figs.push(uri); if(!q.fig) q.fig=uri; }
  // Hook future pushes
  var _push = Array.prototype.push;
  if (UP.pyq) UP.pyq._push = UP.pyq.push;
})();
