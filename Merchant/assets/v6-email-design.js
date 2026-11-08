(function () {
  const editor = window.KADOSK_GC_EDITOR;
  const notice = document.getElementById('designMessage');
  document.addEventListener('kd6:contexte', async function (event) {
    if (event.detail.role !== 'OWNER') return;
    try {
      const settings = await KD6.appeler('cardSettings.get');
      editor.monter(document.getElementById('giftCardDesignEditor'), { onSave: async function () {
        try {
          await KD6.appeler('cardSettings.saveDesign', { design: editor.lireDesign() });
          editor.marquerEnregistre();
          KD6.afficher(notice, 'Design enregistré pour les prochaines cartes.', 'ok');
          return true;
        } catch (error) { KD6.afficher(notice, KD6.message(error), 'erreur'); return false; }
      } });
      const design = settings && settings.design || {};
      editor.charger({ ...design, accentColor: design.accentColor || design.color });
      editor.majDonnees({ businessName: event.detail.businessName, cardName: 'Carte cadeau',
        amounts: ((settings && settings.denominations_minor) || []).map(value => value / 100) });
    } catch (error) { KD6.afficher(notice, KD6.message(error), 'erreur'); }
  });
})();
