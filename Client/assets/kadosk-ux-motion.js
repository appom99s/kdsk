(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const selectors = ".k2-hero-annuaire, .k2-carte, .k2-carte-select, .k2-categorie-tuile, .k2-detail-grille, .k2-total-bloc, .k2-confirmation, .kadosk-panier-total, .kadosk-public-main > h1";
  function prepare(root) {
    const elements = root.matches && root.matches(selectors) ? [root, ...root.querySelectorAll(selectors)] : root.querySelectorAll(selectors);
    elements.forEach((element, index) => {
      if (element.dataset.kadoskMotion) return;
      element.dataset.kadoskMotion = "1";
      element.classList.add("kadosk-ux-enter");
      element.style.setProperty("--kadosk-enter-delay", `${Math.min(index * 35, 210)}ms`);
      if (observer) observer.observe(element); else element.classList.add("kadosk-ux-visible");
    });
  }
  const observer = window.IntersectionObserver ? new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("kadosk-ux-visible");
    observer.unobserve(entry.target);
  }), { threshold: .08 }) : null;
  prepare(document);
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === 1) prepare(node);
  }))).observe(document.body, { childList: true, subtree: true });
  // Lorsque le panier/total est modifié par les scripts existants, l'animation
  // fournit un retour visuel sans changer le calcul ou l'état de la commande.
  const totalObserver = new MutationObserver(() => document.querySelectorAll(".kadosk-panier-total, .k2-total-bloc").forEach((total) => {
    total.classList.remove("kadosk-ux-total-updated");
    requestAnimationFrame(() => total.classList.add("kadosk-ux-total-updated"));
  }));
  document.querySelectorAll("#texteTotal").forEach((total) => totalObserver.observe(total, { childList: true, characterData: true, subtree: true }));
}());
