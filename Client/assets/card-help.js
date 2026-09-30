(function () {
  function render(container, offer) {
    container.replaceChildren(); container.classList.add('card-help');
    const add = (tag, text, parent = container) => { const el = document.createElement(tag); el.textContent = text; parent.append(el); return el; };
    add('h2', 'Comment utiliser cette carte ?');
    const steps = add('ol', '');
    ['Rendez-vous chez le marchand.','Ouvrez votre carte KADOSK.','Appuyez sur « Utiliser ma carte ».','Présentez votre QR au caissier.','Le marchand saisit le montant.','Vérifiez puis confirmez l’opération sur votre téléphone.'].forEach(text => add('li',text,steps));
    add('p','Vous pouvez également saisir vous-même votre PIN sur le téléphone du marchand lorsque cette option est proposée.');
    if (offer.usageInstructions) add('p', offer.usageInstructions);
    add('h2', 'Où utiliser cette carte ?');
    const locations = offer.locations || [];
    if (locations.length) add('p', `Cette carte est acceptée dans ${locations.length} établissement${locations.length > 1 ? 's' : ''}.`);
    const list = locations.length ? locations : (offer.address ? [{name:offer.businessName,address:offer.address,city:offer.city}] : []);
    if (!list.length) add('p', 'Contactez le commerce pour connaître les points de vente acceptant cette carte.');
    for (const location of list) {
      const section = add('section', ''); add('h3', location.name, section); add('p', [location.address,location.city].filter(Boolean).join(', '), section);
      const coordinate = typeof location.latitude === 'number' && typeof location.longitude === 'number';
      const destination = coordinate ? `${location.latitude},${location.longitude}` : [location.address,location.city].join(', ');
      const link = add('a', 'Itinéraire ↗', section); link.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination); link.target = '_blank'; link.rel = 'noopener noreferrer';
    }
    const help = add('a', 'Aide : carte, PIN ou transaction'); help.href = 'aide.html';
  }
  window.KADOSK_CARD_HELP = { render };
}());
