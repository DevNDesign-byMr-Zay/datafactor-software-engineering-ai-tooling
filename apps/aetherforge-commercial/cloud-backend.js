/* Browser-visible connection eligibility only. The server independently verifies Host and Origin. */
(function(root){'use strict';
 function isSupportedOrigin(loc){
  if(!loc||typeof loc.hostname!=='string')return false;
  const host=loc.hostname.toLowerCase();
  return (loc.protocol==='http:'&&(host==='localhost'||host==='127.0.0.1')) ||
    (loc.protocol==='https:'&&/^[a-z0-9-]{1,90}-4546\.app\.github\.dev$/.test(host));
 }
 root.AetherForgeCloud=Object.freeze({isSupportedOrigin});
})(typeof window!=='undefined'?window:globalThis);
