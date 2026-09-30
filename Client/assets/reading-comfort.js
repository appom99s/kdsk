(function () {
  'use strict';
  const body = document.body;
  const parts = [...body.children].filter(el => el.matches('.reference-utility, .shop-header, .k2-entete, .k2-topbar, .checkout-header, .k2-shop-header-search-row, .k2-shop-header-categories, .k2-shop-nav-row'));
  const header = document.createElement('div');
  header.className = 'client2-fixed-header';
  // Replace every historical header with the same isolated component.
  body.prepend(header);
  parts.forEach(el => el.remove());
  const shapes = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    'shopping-cart': '<path d="M2 3h3l3 12h11l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>'
  };
  const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes[name]}</svg>`;
  header.innerHTML = `
    <div class="client2-header-utility"><a href="mes-commandes.html">Mes cartes et commandes</a><a href="aide.html">Besoin d’aide ?</a></div>
    <header class="client2-header-main">
      <a class="client2-header-brand" href="boutique-client.html" aria-label="KADOSK, accueil"><img src="assets/logo.png" alt="KADOSK"></a>
      <form class="client2-header-search" action="commercants.html" method="get" role="search" aria-label="Rechercher un commerçant">
        <label class="sr-only" for="client2-search">Rechercher une carte cadeau ou un commerçant</label>
        <input id="client2-search" name="q" type="search" placeholder="Rechercher une carte cadeau, un commerçant…" autocomplete="off">
        <button type="submit" aria-label="Rechercher">${icon('search') || '⌕'}</button>
      </form>
      <div class="client2-header-actions">
        <a href="favoris.html" aria-label="Mes favoris">${icon('heart')}<span>Favoris</span><b data-favoris-badge hidden></b></a>
        <a href="etape-3-recap.html" aria-label="Mon panier">${icon('shopping-cart')}<span>Panier</span><b data-panier-badge hidden></b></a>
        <a href="mon-compte.html" aria-label="Mon compte">${icon('user')}<span>Compte</span></a>
      </div>
    </header>`;
  header.querySelector('input[name="q"]').value = new URLSearchParams(location.search).get('q') || '';
  function refreshBadges() {
    for (const [key, attribute, total] of [
      ['kadosk_panier_v2', 'data-panier-badge', items => items.reduce((n,item)=>n+(Number(item.quantite)||0),0)],
      ['kadosk_favoris_v2', 'data-favoris-badge', items => items.length]
    ]) {
      let count = 0;
      try { const items = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(items)) count = total(items); } catch (_) {}
      const badge = header.querySelector('[' + attribute + ']');
      badge.textContent = String(count); badge.hidden = count === 0;
      badge.style.display = count ? '' : 'none';
    }
  }
  refreshBadges();
  window.addEventListener('storage', refreshBadges);
  window.addEventListener('pageshow', refreshBadges);
  const navigation = document.createElement('nav');
  navigation.className = 'client2-primary-nav';
  navigation.setAttribute('aria-label', 'Navigation principale');
  const currentPage = location.pathname.split('/').pop();
  const links = [
    ['boutique-client.html', 'Accueil'],
    ['boutique-client.html#catalogue', 'Cartes cadeaux'],
    ['commercants.html', 'Commerçants'],
    ['categories.html', 'Catégories'],
    ['boutique-client.html#how-title', 'Comment ça marche']
  ];
  links.forEach(([href, label]) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    if (href === currentPage) link.setAttribute('aria-current', 'page');
    navigation.appendChild(link);
  });
  header.appendChild(navigation);
  const spacer = document.createElement('div');
  spacer.setAttribute('aria-hidden', 'true');
  header.after(spacer);
  function measure() {
    const height = Math.ceil(header.getBoundingClientRect().height);
    spacer.style.height = height + 'px';
    document.documentElement.style.setProperty('--client2-header-height', height + 'px');
  }
  new ResizeObserver(measure).observe(header);
  measure();
  const active = navigation.querySelector('[aria-current="page"]');
  if (active) navigation.scrollLeft = Math.max(0, active.offsetLeft - navigation.offsetLeft - (navigation.clientWidth - active.offsetWidth) / 2);
})();
