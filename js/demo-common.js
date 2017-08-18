demo = window.demo || {};
(function() {
   alias = localStorage.getItem('alias');
   if (alias === null || alias === '') {
      window.location="/index.html";
   }
   ccpUrl = 'https://' + alias + '.awsapps.com/connect/ccp#/';
   demo.alias = alias;
   demo.ccpUrl = ccpUrl;
})();
