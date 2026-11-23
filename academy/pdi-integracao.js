/* Destino e sessão oficiais do PDI; não contém credenciais. */
(() => {
  'use strict';
  const integration = Object.freeze({
    pdiUrl: 'https://montero01.github.io/testepdicdev2/',
    sessionStorageKey: 'cde-pdi-conectado-session'
  });
  window.CDEAcademyPDI = integration;
  document.querySelectorAll('a[data-pdi-link]').forEach(link => {
    link.href = integration.pdiUrl;
  });
})();
