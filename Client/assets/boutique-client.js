(function () {
  "use strict";
  const state = { merchants: [], query: "", category: "" };
  const grid = document.getElementById("merchant-grid");
  const status = document.getElementById("catalogue-status");
  const empty = document.getElementById("empty-state");
  const error = document.getElementById("error-state");
  const filter = document.getElementById("category-filter");
  const search = document.getElementById("merchant-search");
  const quickCartItems = document.getElementById("quick-cart-items");
  const quickCartTotal = document.getElementById("quick-cart-total");
  const quickCartCheckout = document.getElementById("quick-cart-checkout");
  const quickCart = document.getElementById("quick-cart");
  const quickCartBackdrop = document.getElementById("quick-cart-backdrop");
  const quickCartClose = document.getElementById("quick-cart-close");
  const cartLink = document.querySelector(".cart-link");
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
  function formatAmount(amount) { return Number(amount || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " DH"; }
  function renderQuickCart() {
    if (!window.KADOSK_PANIER2 || !quickCartItems) return;
    const lines = KADOSK_PANIER2.lire();
    quickCartItems.innerHTML = lines.length ? lines.map((line) => `<article class="quick-cart-line"><span class="quick-cart-mark">${escapeHtml((line.businessName || line.name || "?").slice(0,1))}</span><div><p class="quick-cart-name">${escapeHtml(line.businessName || line.name)}</p><p class="quick-cart-detail">${line.quantite || 1} × ${formatAmount(line.montant)}</p></div><button type="button" class="quick-cart-remove" data-remove-line="${escapeHtml(line.ligneId)}" aria-label="Retirer ${escapeHtml(line.businessName || line.name)}">×</button></article>`).join("") : '<p class="quick-cart-empty">Votre panier est vide. Ajoutez une carte cadeau pour commencer.</p>';
    quickCartTotal.hidden = quickCartCheckout.hidden = !lines.length;
    if (lines.length) quickCartTotal.querySelector("strong").textContent = formatAmount(KADOSK_PANIER2.totalGeneral());
    quickCartItems.querySelectorAll("[data-remove-line]").forEach((button) => button.addEventListener("click", () => { KADOSK_PANIER2.retirerLigne(button.dataset.removeLine); renderQuickCart(); }));
  }
  // Panier rapide (.quick-cart) : sur desktop il reste une barre latérale
  // toujours visible (voir boutique-client.css), mais sur mobile il n'a pas la
  // place - il ne s'affiche que sur un clic sur "Panier" dans l'en-tête,
  // comme un panneau qui coulisse depuis le bas. Avant, "Panier" ne faisait
  // que naviguer directement vers etape-3-recap.html, sans jamais rien
  // montrer sur place : la classe .is-open (ajoutée/retirée ici) est ce qui
  // manquait pour que le clic ouvre réellement ce menu.
  function ouvrirPanierRapide(evenement) {
    if (evenement) evenement.preventDefault();
    if (!quickCart) return;
    quickCart.classList.add("is-open");
    if (quickCartBackdrop) {
      quickCartBackdrop.hidden = false;
      requestAnimationFrame(() => quickCartBackdrop.classList.add("is-open"));
    }
  }
  function fermerPanierRapide() {
    if (!quickCart) return;
    quickCart.classList.remove("is-open");
    if (quickCartBackdrop) {
      quickCartBackdrop.classList.remove("is-open");
      setTimeout(() => { quickCartBackdrop.hidden = true; }, 250);
    }
  }
  if (cartLink) cartLink.addEventListener("click", ouvrirPanierRapide);
  if (quickCartClose) quickCartClose.addEventListener("click", fermerPanierRapide);
  if (quickCartBackdrop) quickCartBackdrop.addEventListener("click", fermerPanierRapide);
  document.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Escape") fermerPanierRapide();
  });

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
  window.addEventListener("storage", renderQuickCart);
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
  renderQuickCart();
}());
