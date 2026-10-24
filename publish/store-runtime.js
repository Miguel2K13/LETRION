/* LETRION — runtime da versão publicada (Google Play / App Store / site).
   Injetado em `www/index.html` por scripts/build-store.mjs.

   Na versão publicada não existe nenhuma chave de IA dentro do pacote: a Lexi
   fica desligada e as chamadas aos serviços de IA são bloqueadas. O banco de
   lições pré-preparado continua funcionando normalmente — a geração de lição
   por IA é apenas um extra (`generateCurrent()` já trata a falha). */
(function () {
  'use strict';

  window.LETRION_STORE_BUILD = true;

  var AI_HOSTS = ['openrouter.ai', 'generativelanguage.googleapis.com'];

  if (typeof window.fetch === 'function') {
    var originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      for (var i = 0; i < AI_HOSTS.length; i++) {
        if (url.indexOf(AI_HOSTS[i]) !== -1) {
          return Promise.reject(new Error('A Lexi não está disponível nesta versão do LETRION.'));
        }
      }
      return originalFetch(input, init);
    };
  }

  // Esconde os acessos à Lexi: menu lateral, atalho do desktop e barra mobile.
  var style = document.createElement('style');
  style.textContent = '.lexi-navBtn,[data-action="open-lexi"]{display:none!important}';
  document.head.appendChild(style);

  // Rede de segurança: se algum outro caminho pedir a Lexi, a ação é ignorada.
  document.addEventListener('click', function (event) {
    var target = event.target;
    var el = target && target.closest ? target.closest('[data-action="open-lexi"]') : null;
    if (el) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
