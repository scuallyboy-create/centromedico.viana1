/* =========================================================
   CONTROLO CENTRAL DO WEBSITE — VIANA I

   SITE_ATIVO = false  -> página geral de suspensão
   SITE_ATIVO = true   -> website normal

   Para retirar um funcionário da instituição, altere no
   team-data.js o campo status de "ready" para "suspended".
   O QR Code antigo continuará válido e mostrará a mensagem
   de funcionário suspenso.
   ========================================================= */

window.SITE_ATIVO = true;

(function () {
  const current = location.pathname.split('/').pop() || 'index.html';
  const suspensionPage = 'suspenso.html';

  if (!window.SITE_ATIVO && current !== suspensionPage) {
    location.replace(suspensionPage);
  }
})();
