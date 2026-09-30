(function () {
  "use strict";
  const state = { merchants: [], query: "", category: "", occasion: "", budget: "" };
  const discovery = window.KADOSK_DISCOVERY;
  let position = null;
  const grid = document.getElementById("merchant-grid");
  const status = document.getElementById("catalogue-status");
  const empty = document.getElementById("empty-state");
  const error = document.getElementById("error-state");
  const filter = document.getElementById("category-filter");
  const search = document.getElementById("merchant-search");
  // Dans Wix, config.js peut définir KADOSK_IFRAME_PARENT_ORIGIN. Le referrer
  // sert de repli seulement s'il fournit une origine explicite.
  let parentOrigin = window.KADOSK_IFRAME_PARENT_ORIGIN || "";
  if (!parentOrigin && document.referrer) {
    try { parentOrigin = new URL(document.referrer).origin; } catch (e) { parentOrigin = ""; }
  }

  function escapeHtml(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
  function slugify(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function nameOf(m) { return m.businessName || m.name || "Commerce partenaire"; }
  function matches(m) { return discovery.matches(m, state); }
  function card(m) {
    const name = nameOf(m), href = `commercant-detail.html?merchantId=${encodeURIComponent(m.merchantId)}`;
    const safeLogo = /^https:\/\//i.test(m.logoUrl || '') ? m.logoUrl : '';
    const publicPath = "/merchant/" + encodeURIComponent(m.slug || slugify(name));
    const logo = safeLogo ? `<img loading="lazy" src="${escapeHtml(safeLogo)}" alt="" width="200" height="120">` : escapeHtml(name.slice(0, 1));
    const amounts = (m.presetAmounts || []).map(Number).filter(n => n > 0);
    if (m.freeAmountEnabled && Number(m.freeAmountMin) > 0) amounts.push(Number(m.freeAmountMin));
    const from = amounts.length ? `Dès ${Math.min(...amounts).toLocaleString('fr-FR')} DH` : 'Voir les montants';
    return `<article class="merchant-card"><a href="${href}" data-kadosk-public-path="${publicPath}" class="merchant-logo" aria-label="Voir ${escapeHtml(name)}">${logo}</a><div class="merchant-info"><h3 class="merchant-name">${escapeHtml(name)}</h3><p class="merchant-category">${escapeHtml([m.activityCategory, m.city].filter(Boolean).join(' · '))}</p><p>${from}${Number.isFinite(m.distance) ? ` · ${m.distance.toFixed(1)} km` : ''}</p><div class="merchant-cta"><a href="${href}" data-kadosk-public-path="${publicPath}">Voir</a><a href="${href}#boutonsMontants" data-kadosk-public-path="${publicPath}">Offrir →</a></div></div></article>`;
  }
  function render() {
    const visible = state.merchants.filter(matches);
    grid.setAttribute("aria-busy", "false"); grid.innerHTML = visible.map(card).join('');
    empty.hidden = visible.length !== 0; status.textContent = visible.length ? `${visible.length} commerce${visible.length > 1 ? "s" : ""} à découvrir` : "";
  }
  function renderFilters() {
    const categories = [...new Set(state.merchants.map((m) => m.activityCategory).filter(Boolean))].sort((a,b) => a.localeCompare(b,"fr"));
    filter.innerHTML = ["Toutes", ...categories].map((category) => `<button type="button" class="filter-chip" data-category="${escapeHtml(category === "Toutes" ? "" : category)}" aria-pressed="${(category === "Toutes" ? !state.category : state.category === category)}">${escapeHtml(category)}</button>`).join("");
    filter.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { state.category = button.dataset.category; renderFilters(); render(); }));
  }
  async function load() {
    error.hidden = true; empty.hidden = true;
    const appliquerCatalogue = (response) => {
      state.merchants = Array.isArray(response && response.items) ? response.items : [];
      renderFilters();
      render();
      const recent = state.merchants.filter(m => { const age = Date.now() - new Date(m.createdDate).getTime(); return age >= 0 && age < 30 * 86400000; }).sort((a,b) => new Date(b.createdDate) - new Date(a.createdDate)).slice(0, 4);
      document.getElementById('new-section').hidden = !recent.length;
      document.getElementById('new-grid').innerHTML = recent.map(card).join('');
      renderNearby();
      const popular = state.merchants.filter(m => Number(m.purchaseCount) > 0).sort((a,b) => b.purchaseCount-a.purchaseCount).slice(0,4);
      document.getElementById('popular-section').hidden = !popular.length;
      document.getElementById('popular-grid').innerHTML = popular.map(card).join('');
    };
    if (!window.KADOSK_CACHE || KADOSK_CACHE.lire("marchandsActifs") === null) {
      grid.innerHTML = ""; grid.setAttribute("aria-busy", "true"); status.textContent = "Chargement des commerces partenaires…";
    }
    try {
      if (window.KADOSK_CACHE) await KADOSK_CACHE.chargerAvecCache("marchandsActifs", KADOSK_API.getActiveMerchants, appliquerCatalogue);
      else appliquerCatalogue(await KADOSK_API.getActiveMerchants());
    }
    catch (e) { console.error("Chargement catalogue KADOSK", e); grid.setAttribute("aria-busy", "false"); status.textContent = ""; error.hidden = false; }
  }
  const headerSearch = document.querySelector('.k2-shop-header-search-inline input');
  if (headerSearch) { headerSearch.addEventListener('input', () => { state.query=headerSearch.value.trim(); search.value=headerSearch.value;render(); }); headerSearch.form.addEventListener('submit',e=>{e.preventDefault();document.getElementById('catalogue').scrollIntoView({behavior:'smooth'});}); }
  search.addEventListener("input", () => { state.query = search.value.trim(); render(); });
  document.getElementById("reset-filters").addEventListener("click", () => { state.query = state.category = state.occasion = state.budget = ""; search.value = ""; document.getElementById('gift-finder').reset(); renderOccasions(); renderFilters(); render(); });
  function renderOccasions() {
    document.getElementById('occasion-filter').innerHTML = discovery.occasions.map(o => `<button type="button" class="filter-chip" data-occasion="${escapeHtml(o)}" aria-pressed="${o === state.occasion}">${escapeHtml(o)}</button>`).join('');
  }
  document.getElementById('occasion-filter').addEventListener('click', e => {
    const button = e.target.closest('[data-occasion]'); if (!button) return;
    state.occasion = state.occasion === button.dataset.occasion ? '' : button.dataset.occasion;
    renderOccasions(); render(); document.getElementById('catalogue').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('finder-occasion').insertAdjacentHTML('beforeend', discovery.occasions.map(o => `<option>${escapeHtml(o)}</option>`).join(''));
  document.getElementById('gift-finder').addEventListener('submit', e => {
    e.preventDefault(); const data = new FormData(e.target);
    state.occasion = data.get('occasion') || data.get('recipient'); state.budget = data.get('budget');
    renderOccasions(); render(); document.getElementById('catalogue').scrollIntoView({ behavior: 'smooth' });
  });
  function renderNearby() {
    const city = document.getElementById('nearby-city').value.trim();
    let merchants = city ? state.merchants.filter(m => discovery.matches(m, { city })) : [];
    if (position && !city) merchants = state.merchants.map(m => {
      const distances = (m.locations || []).map(l => discovery.distance(position, l)).filter(n => n !== null);
      return { ...m, distance: distances.length ? Math.min(...distances) : null };
    }).filter(m => m.distance !== null).sort((a,b) => a.distance - b.distance);
    document.getElementById('nearby-grid').innerHTML = merchants.slice(0,4).map(card).join('');
    if (city || position) document.getElementById('nearby-status').textContent = merchants.length ? 'Consultez la fiche du commerce pour les itinéraires.' : 'Aucun établissement localisé pour cette recherche.';
  }
  document.getElementById('nearby-city').addEventListener('input', renderNearby);
  document.getElementById('locate-me').addEventListener('click', () => {
    const output = document.getElementById('nearby-status');
    if (!navigator.geolocation) { output.textContent = 'Saisissez votre ville pour rechercher les commerces.'; return; }
    output.textContent = 'Localisation en cours…';
    navigator.geolocation.getCurrentPosition(p => { position = {latitude:p.coords.latitude,longitude:p.coords.longitude}; document.getElementById('nearby-city').value = ''; renderNearby(); }, () => { output.textContent = 'Position indisponible. Vous pouvez saisir votre ville.'; }, { timeout: 10000, maximumAge: 60000 });
  });
  renderOccasions();
  document.getElementById("retry-load").addEventListener("click", load);
  // Le parent Wix transmet uniquement le jeton de session attendu, depuis son
  // origine configurée. Aucun message d'une autre origine ne peut déclencher le
  // flux d'authentification dans l'iframe.
  window.addEventListener("message", async (event) => {
    if (!parentOrigin || event.origin !== parentOrigin) return;
    const data = event.data;
    if (!data || data.type !== "KADOSK_SESSION_TOKEN" || !data.sessionToken || !window.KADOSK_AUTH || KADOSK_AUTH.estConnecte()) return;
    try { await KADOSK_AUTH.demarrerAutorisationMembrePourBoutique(data.sessionToken); }
    catch (e) { console.error("Authentification iframe KADOSK", e); }
  });
  if (window.parent !== window && parentOrigin) window.parent.postMessage({ type: "KADOSK_BOUTIQUE_CLIENT_READY" }, parentOrigin);
  load();
}());
