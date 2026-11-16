/* OAuth error guard — welcome splash animation disabled for instant load. */
(function(){
  'use strict';
  // Never retain or display provider-supplied descriptions or OAuth credentials.
  const query=new URLSearchParams(location.search);
  const hash=new URLSearchParams(location.hash.slice(1));
  if(query.has('error')||query.has('error_code')||hash.has('error')||hash.has('error_code')){
    window.__UPAY_OAUTH_ERROR__=true;
    ['error','error_code','error_description'].forEach(k=>query.delete(k));
    history.replaceState(null,'',location.pathname+(query.size?'?'+query.toString():'')+'#/login');
  }
  const existing=document.getElementById('kritin-welcome');
  if(existing)existing.remove();
})();
