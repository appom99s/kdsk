(function (global) {
  'use strict';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const V = global.KADOSK_CARTE_VISUELLE;
  const REPLI_POLICE = { famille: "'Poppins', sans-serif", google: 'Poppins:wght@600;800' };

  // Même design que l'éditeur (Merchant/settings.html, assets/carte-visuelle.js) :
  // couleur d'accent, fond (couleur/dégradé/image), motif et police choisis par le
  // marchand - au lieu d'un gabarit générique KADOSK fixe. KADOSK_CARTE_VISUELLE
  // n'a besoin d'être chargé qu'une fois (voir gift-cards.html) : ses fonctions de
  // résolution de couleur/motif sont pures, réutilisables ici sans DOM.
  function calculerDesign(card) {
    const accent = V ? V.resoudreAccent(card.accentColor) : { base: '#8ab6a9', fonce: '#173c34' };
    const typeFond = card.backgroundType === 'degrade' || card.backgroundType === 'image' ? card.backgroundType : 'couleur';
    let fondStyle;
    if (typeFond === 'degrade' && card.gradientFrom && card.gradientTo) {
      fondStyle = 'background-image:linear-gradient(' + (Number.isFinite(Number(card.gradientAngle)) ? card.gradientAngle : 135) + 'deg,' + card.gradientFrom + ',' + card.gradientTo + ');';
    } else if (typeFond === 'image' && card.backgroundImageUrl) {
      fondStyle = 'background-image:linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)),url(\'' + esc(card.backgroundImageUrl) + '\');background-size:cover;background-position:center;';
    } else {
      fondStyle = 'background:' + accent.fonce + ';';
    }
    let motifStyle = '';
    if (V) {
      const couleurMotif = typeFond === 'couleur' ? accent.base : '#ffffff';
      const opaciteMotif = typeFond === 'couleur' ? 0.45 : 0.35;
      const svg = V.motifSvgComplet(card.pattern, couleurMotif, opaciteMotif);
      if (svg) motifStyle = 'background-image:url(\'' + V.svgVersDataUri(svg) + '\');background-size:cover;';
    }
    const police = (V && V.POLICES[card.font]) || REPLI_POLICE;
    const icone = V ? V.iconeSvgComplet(card.activityIcon, accent.base) : '';
    return { accent, fondStyle, motifStyle, police, icone };
  }

  global.KADOSK_PRINT = {
    document(cards, logo) {
      const policesUtilisees = new Set();
      const articles = cards.map(card => {
        const { fondStyle, motifStyle, police, icone } = calculerDesign(card);
        policesUtilisees.add(police.google);
        const merchantBrand = card.merchantLogoUrl
          ? '<img class="brand" src="' + esc(card.merchantLogoUrl) + '" alt="' + esc(card.merchantName) + '">'
          : '<span class="brand brand-text">' + esc(card.merchantName) + '</span>';
        const titre = esc(card.cardName || card.merchantName || 'Carte cadeau');
        return '<article><div class="front"><div class="front-fond" style="' + fondStyle + '"></div><div class="front-motif" style="' + motifStyle + '"></div><header>' + merchantBrand + '<span class="tagline">LE PLAISIR D’OFFRIR</span></header><div class="gift"><span class="eyebrow">CARTE CADEAU · ' + esc(card.merchantName) + '</span><h1 style="font-family:' + esc(police.famille) + '">' + titre + '</h1><div class="icone">' + icone + '</div><strong class="amount">' + esc(card.amount) + '<small> DH</small></strong></div><footer><span>Une attention qui fait toute la différence.</span><span class="powered"><img src="' + esc(logo) + '" alt="KADOSK">Géré par KADOSK</span></footer></div><div class="back"><div><h2>À vous de choisir.</h2><p>Présentez cette carte au commerce indiqué.<br>Conservez le code et le QR à l’abri des regards.</p><p class="code">' + esc(card.code) + '</p><small>Référence : ' + esc(card.orderNumber) + '<br>' + (card.expirationDate ? 'Valable jusqu’au ' + esc(new Date(card.expirationDate).toLocaleDateString('fr-FR')) : 'Sans date d’expiration') + '</small></div><img class="qr" src="' + esc(card.qr) + '" alt="QR de la carte"></div></article>';
      }).join('');
      const policesLiens = [...policesUtilisees].map(g => '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=' + g + '&display=swap">').join('');
      return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartes cadeaux</title>' + policesLiens + '<style>*{box-sizing:border-box}body{margin:0;background:#eceee9;font-family:Arial,sans-serif;color:#173c34;padding:28px}article{max-width:760px;margin:0 auto 32px;break-inside:avoid}.front{position:relative;overflow:hidden;color:#fff8e8;border-radius:22px;padding:30px;min-height:360px;print-color-adjust:exact;-webkit-print-color-adjust:exact}.front-fond,.front-motif{position:absolute;inset:0;z-index:0}header{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2;gap:12px}.tagline{font-size:10px;letter-spacing:3px;opacity:.85}.eyebrow{font-size:10px;letter-spacing:3px}.brand{max-width:150px;max-height:52px;object-fit:contain;background:white;border-radius:8px;padding:7px}.brand-text{display:inline-flex;align-items:center;padding:9px 14px;background:white;color:#173c34;border-radius:8px;font-weight:700;font-size:16px}.gift{position:relative;z-index:2;margin-top:28px}h1{font-size:38px;font-weight:700;line-height:1.15;margin:12px 0}.icone{width:30px;height:30px;margin-bottom:10px;opacity:.9}.icone svg{width:100%;height:100%}.amount{font-size:36px;color:#e4c88d}.amount small{font-size:18px}footer{position:relative;z-index:2;margin-top:22px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;letter-spacing:1px}.powered{display:inline-flex;align-items:center;gap:6px;opacity:.75;font-size:9px;letter-spacing:.5px;white-space:nowrap}.powered img{height:14px;width:auto;border-radius:3px}.back{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:24px;background:#fffdf7;border:1px solid #ddd4c1;border-radius:18px;margin-top:10px}h2{font-family:Georgia,serif;font-size:24px;margin:0 0 12px}p{line-height:1.5;font-size:13px}.code{font-family:monospace;overflow-wrap:anywhere}.qr{width:150px;height:150px}small{line-height:1.7}@media(max-width:520px){body{padding:12px}h1{font-size:30px}.front{padding:22px}.tagline{display:none}footer{flex-direction:column;align-items:flex-start;gap:6px}.back{flex-direction:column;align-items:flex-start}.qr{align-self:center}}@media print{@page{size:A4;margin:16mm}body{padding:0;background:white}article{break-after:page}article:last-child{break-after:auto}}</style></head><body>' + articles + '</body></html>';
    }
  };
})(window);
