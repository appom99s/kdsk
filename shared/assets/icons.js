// Bibliothèque d'icônes du nouveau parcours public KADOSK (boutique, étapes 1-5,
// favoris, mes commandes, accueil). Même esprit graphique que l'objet ICONES de
// nav.js (trait, currentColor, viewBox 24x24, stroke-width 1.8, coins arrondis) -
// pour rester visuellement cohérent avec le reste du site sans dépendre d'une
// bibliothèque externe (pas de CDN tiers à charger/faire échouer). Les clés
// reprennent les noms Lucide demandés (en kebab-case) : si un jour vous voulez
// basculer sur la vraie librairie Lucide, ce sont les mêmes noms, ce module n'est
// donc qu'un remplacement "au trait" en attendant.
(function () {
  const ICONES2 = {
    house:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a1 1 0 0 0 1 1H9.5a1 1 0 0 0 1-1V15h3v4.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V10"/></svg>',
    "clipboard-list":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2.3" width="6" height="3.4" rx="1"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.8-4.7-10-9.5C.4 7.7 2.4 4.5 6 4.5c2 0 3.6 1.1 4.5 2.6 0 0 .5.9 1.5.9s1.5-.9 1.5-.9c.9-1.5 2.5-2.6 4.5-2.6 3.6 0 5.6 3.2 4 6.5-2.2 4.8-10 9.5-10 9.5Z"/></svg>',
    user:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.3-4.3"/></svg>',
    plus:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>',
    "trash-2":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4.8c0-.4.4-.8.9-.8h4.2c.5 0 .9.4.9.8V7"/><path d="M6.5 7 7 20a1.6 1.6 0 0 0 1.6 1.5h6.8A1.6 1.6 0 0 0 17 20l.5-13"/><path d="M10.2 11v6.5M13.8 11v6.5"/></svg>',
    pencil:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.2 4.8 19.2 9.8 8 21H3v-5Z"/><path d="M12.2 6.8l4 4"/></svg>',
    "arrow-left":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    "arrow-right":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    copy:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5.5 15H4.6A1.6 1.6 0 0 1 3 13.4V4.6C3 3.7 3.7 3 4.6 3h8.8c.9 0 1.6.7 1.6 1.6V5.5"/></svg>',
    "shield-check":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5.5c0 4.6-3 7.9-7 9.5-4-1.6-7-4.9-7-9.5V6Z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>',
    "credit-card":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5.5" width="20" height="13" rx="2.2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
    landmark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 4l9 6"/><path d="M5 10v9M10 10v9M14 10v9M19 10v9"/><path d="M3 19h18"/></svg>',
    "qr-code":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M17 20h4"/></svg>',
    mail:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>',
    gift:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="4.2" rx="1"/><rect x="4.5" y="13.2" width="15" height="8" rx="1"/><path d="M12 9v12"/><path d="M12 9C10.5 5.5 6 6 6 8.3 6 9.4 8 9 12 9Z"/><path d="M12 9c1.5-3.5 6-3 6-.7 0 1.1-2 .7-6 .7Z"/></svg>',
    "shopping-bag":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 12.2a1.5 1.5 0 0 1-1.5 1.8H6.5A1.5 1.5 0 0 1 5 20.2Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    utensils:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5v8a2 2 0 0 0 4 0v-8M8 2.5v19"/><path d="M17 2.5c-1.7 0-3 2-3 5s1.3 5 3 5v9.5"/></svg>',
    sofa:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12V8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4"/><rect x="2.5" y="12" width="19" height="6" rx="2"/><path d="M4.5 18v2.5M19.5 18v2.5"/></svg>',
    sparkles:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3l1.3 3.7L16 8l-3.7 1.3L11 13l-1.3-3.7L6 8l3.7-1.3Z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z"/></svg>',
    dumbbell:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 9v6M5 7v10M19 7v10M21.5 9v6"/><path d="M5 12h14"/><rect x="5" y="9.5" width="2.4" height="5" rx="0.8"/><rect x="16.6" y="9.5" width="2.4" height="5" rx="0.8"/></svg>',
    "gamepad-2":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7.5" width="19" height="10.5" rx="4"/><path d="M7 10.3v4M5 12.3h4"/><circle cx="15.3" cy="10.8" r="0.9" fill="currentColor" stroke="none"/><circle cx="17.6" cy="13.1" r="0.9" fill="currentColor" stroke="none"/></svg>',
    plane:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.5 12 17l1.5 3.5-1.5 1Z"/><path d="M3.5 12l3.5-1.5L12 3l1 .6-3 7.4 5 1.6 3-2.6 1.3.5-2 3.5-6.8 2.2L9 20l-1.2-.5.7-3.3-4-1.2Z"/></svg>',
    clapperboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 4 6.8a1.4 1.4 0 0 1 1.7-1L20 9"/><rect x="3" y="10.5" width="18" height="10" rx="1.6"/><path d="m6 6 3 3.2M11 5l3 3.2M16 4l3 3.2"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 3H6.5A2.5 2.5 0 0 0 4 5.5v6.1c0 .5.2 1 .6 1.4l9 9a2 2 0 0 0 2.8 0l6-6a2 2 0 0 0 0-2.8l-9-9c-.4-.4-.9-.6-1.4-.6Z"/><circle cx="8.5" cy="8.5" r="1.4"/></svg>',
    settings:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.5 7.5 0 0 0 0-3l1.9-1.3-2-3.4-2.2.7a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.5 2a7.6 7.6 0 0 0-2.6 1.5l-2.2-.7-2 3.4L4.6 10a7.5 7.5 0 0 0 0 3l-1.9 1.3 2 3.4 2.2-.7c.76.66 1.64 1.17 2.6 1.5l.5 2h4l.5-2c.96-.33 1.84-.84 2.6-1.5l2.2.7 2-3.4z"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    "check-circle":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M8 12.3l2.6 2.6L16.3 9"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    "chevron-down":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    "shield-alert":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5.5c0 4.6-3 7.9-7 9.5-4-1.6-7-4.9-7-9.5V6Z"/><path d="M12 8v5M12 16h.01"/></svg>',
    truck:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="7" width="12" height="9.5" rx="1.2"/><path d="M13.5 10h3.8l3.2 3.2v3.3h-7Z"/><circle cx="6" cy="19" r="1.7"/><circle cx="17.5" cy="19" r="1.7"/></svg>',
    // --- Ajoutées pour la nouvelle page d'accueil (header/avantages) ---
    menu:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    "shopping-cart":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l1 3M6.2 7 8 15.5a1.6 1.6 0 0 0 1.6 1.3h7.3a1.6 1.6 0 0 0 1.6-1.3L20 8.3H6.2Z"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M12 7v5.3l3.6 2.1"/></svg>',
    headphones:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13.5v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="13" width="4.5" height="6.5" rx="1.6"/><rect x="17" y="13" width="4.5" height="6.5" rx="1.6"/><path d="M20 19.5v.5a3 3 0 0 1-3 3h-2.3"/></svg>',
    // --- Ajoutées pour boutique/catégories/commerçants/détail-marchand/tiroir panier ---
    "map-pin":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    sliders:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h9M17 6h3M4 12h3M9 12h11M4 18h13M20 18h0"/><circle cx="13" cy="6" r="2"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    "chevron-right":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    "refresh-cw":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a9 9 0 0 0-15.5-5.5L3 5"/><path d="M3 3v5h5"/><path d="M3 16a9 9 0 0 0 15.5 5.5L21 19"/><path d="M21 21v-5h-5"/></svg>',
    "chevron-left":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>'
  };

  // Renvoie le SVG en tant que chaîne, avec une classe CSS optionnelle (pour le
  // dimensionner/colorer via le CSS plutôt qu'en inline).
  function icone(nom, classe) {
    const brut = ICONES2[nom];
    if (!brut) return "";
    if (!classe) return brut;
    return brut.replace("<svg ", '<svg class="' + classe + '" ');
  }

  window.KADOSK_ICONES = ICONES2;
  window.KADOSK_ICONE = icone;
})();
