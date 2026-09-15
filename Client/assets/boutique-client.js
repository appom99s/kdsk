(function () {
  "use strict";
  const state = { merchants: [], query: "", category: "" };
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
  function matches(m) { const needle = state.query.toLocaleLowerCase("fr"); return (!state.category || m.activityCategory === state.category) && (!needle || [nameOf(m), m.activityCategory, m.description].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(needle)); }
  function render() {
    const visible = state.merchants.filter(matches);
    grid.setAttribute("aria-busy", "false"); grid.innerHTML = visible.map((m) => {
      const name = nameOf(m), logo = m.logoUrl ? `<img src="${escapeHtml(m.logoUrl)}" alt="${escapeHtml(name)}">` : escapeHtml(name.slice(0, 1).toUpperCase());
      const slug = m.slug || slugify(name);
      return `<a class="merchant-card" href="commercant-detail.html?merchantId=${encodeURIComponent(m.merchantId)}" data-kadosk-public-path="/merchant/${escapeHtml(slug)}"><div class="merchant-logo">${logo}</div><div class="merchant-info"><h3 class="merchant-name">${escapeHtml(name)}</h3><p class="merchant-category">${escapeHtml(m.activityCategory || "Carte cadeau")}</p><span class="merchant-cta">Découvrir <span aria-hidden="true">→</span></span></div></a>`;
    }).join("");
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
  search.addEventListener("input", () => { state.query = search.value.trim(); render(); });
  document.getElementById("reset-filters").addEventListener("click", () => { state.query = state.category = ""; search.value = ""; renderFilters(); render(); });
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
