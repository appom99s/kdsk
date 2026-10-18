// Paramètres > Points de vente (V3.4).
// - Carte OpenStreetMap (Leaflet, sans clé) : un clic place le repère et remplit
//   latitude / longitude ; l'adresse est proposée par géocodage inverse.
// - Caissiers attribués à chaque point de vente (enregistrés via saveTeamAssignments).
// - Règle serveur : nombre de points de vente actifs <= nombre de caissiers actifs.
(function () {
  'use strict';
  const host = document.getElementById('merchant-locations'); if (!host) return;
  const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
  const NOMINATIM = 'https://nominatim.openstreetmap.org/';
  const CENTRE_DEFAUT = [33.5731, -7.5898]; // Casablanca
  const MESSAGES = {
    LOCATIONS_EXCEED_CASHIERS: 'Il faut au moins autant de caissiers actifs que de points de vente actifs. Invitez un caissier dans « Équipe » ou désactivez un point de vente.',
    AT_LEAST_ONE_LOCATION_REQUIRED: 'Gardez au moins un point de vente actif.',
    LOCATION_INVALID: 'Nom, adresse et ville sont obligatoires ; latitude et longitude vont ensemble.',
    MAP_URL_INVALID: 'Lien de carte invalide.',
    CONCURRENT_MODIFICATION_RETRY: 'Les points de vente ont été modifiés ailleurs. Rechargez la page.',
    TWO_FACTOR_REQUIRED: 'Validez la double authentification puis réessayez.'
  };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let state = { locations: [], version: 0 }, caissiers = [], busy = false;

  host.className = 'kadosk-panneau-large';
  host.style.marginTop = '20px';
  host.innerHTML = `<form class="pv-form" novalidate>
    <div class="pv-entete"><div><h2>Points de vente</h2><p class="kd-aide">Chaque point de vente doit avoir au moins un caissier attribué. Cliquez sur la carte pour placer l’établissement.</p></div>
    <span class="kd-statut" data-capacite></span></div>
    <div class="kd-champ"><label for="pvInstructions">Instructions d’utilisation de la carte</label><textarea id="pvInstructions" name="instructions" maxlength="2000" rows="3"></textarea></div>
    <div class="pv-liste"></div>
    <div class="kadosk-ligne-boutons"><button type="button" class="kadosk-bouton kadosk-bouton-secondaire" data-add>Ajouter un point de vente</button><button type="submit" class="kadosk-bouton">Enregistrer les points de vente</button></div>
    <p class="kadosk-message-erreur" role="status"></p></form>`;
  const form = host.querySelector('form'), list = host.querySelector('.pv-liste'), status = form.querySelector('[role=status]');
  const marquerEdition = () => { form.dataset.kdEdition = '1'; majCapacite(); };
  form.addEventListener('input', marquerEdition);
  form.addEventListener('change', marquerEdition);

  function injecterStyles() {
    if (document.getElementById('pv-styles')) return;
    const st = document.createElement('style'); st.id = 'pv-styles';
    st.textContent = `.pv-entete{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px}.pv-entete h2{margin:0 0 4px}
.pv-carte{border:1px solid #e1e8e5;border-radius:16px;padding:16px;margin:0 0 14px;background:#fbfcfb}.pv-carte[data-inactif="1"]{opacity:.7}
.pv-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px}.pv-grille .kd-champ{margin:0}.pv-plein{grid-column:1/-1}
.pv-map{height:240px;border-radius:12px;border:1px solid #cfdcd7;margin:6px 0;background:#eef2f0;z-index:0}
.pv-coord{font-size:12.5px;color:#5b6e68}.pv-options{display:flex;flex-wrap:wrap;gap:16px;margin:10px 0}.pv-options label{display:flex;gap:8px;align-items:center;font-size:14px;font-weight:600}
.pv-caissiers{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}.pv-caissiers label{display:flex;gap:6px;align-items:center;padding:6px 10px;border:1px solid #cfdcd7;border-radius:999px;font-size:13px;background:#fff}
.pv-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}@media(max-width:640px){.pv-grille{grid-template-columns:1fr}}`;
    document.head.append(st);
  }
  injecterStyles();

  let leafletPromesse = null;
  function chargerLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (leafletPromesse) return leafletPromesse;
    leafletPromesse = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-leaflet]')) {
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.min.css'; css.dataset.leaflet = '1'; css.crossOrigin = 'anonymous';
        document.head.append(css);
      }
      const s = document.createElement('script'); s.src = LEAFLET + 'leaflet.min.js'; s.crossOrigin = 'anonymous';
      s.onload = () => resolve(window.L); s.onerror = () => { leafletPromesse = null; reject(new Error('MAP_UNAVAILABLE')); };
      document.head.append(s);
    });
    return leafletPromesse;
  }

  async function adresseDepuisCoordonnees(lat, lng) {
    const r = await fetch(NOMINATIM + 'reverse?format=jsonv2&accept-language=fr&zoom=18&lat=' + lat + '&lon=' + lng, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('GEOCODAGE');
    const d = await r.json(), a = d.address || {};
    return { adresse: [a.house_number, a.road || a.pedestrian || a.neighbourhood].filter(Boolean).join(' ') || d.display_name || '', ville: a.city || a.town || a.village || a.municipality || '' };
  }
  async function coordonneesDepuisAdresse(texte) {
    const r = await fetch(NOMINATIM + 'search?format=jsonv2&limit=1&accept-language=fr&q=' + encodeURIComponent(texte), { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('GEOCODAGE');
    const d = await r.json();
    if (!d[0]) throw new Error('INTROUVABLE');
    return [Number(d[0].lat), Number(d[0].lon)];
  }

  function caissiersHtml(locationId) {
    if (!caissiers.length) return '<p class="kd-aide">Aucun caissier. <a href="equipe.html">Inviter un caissier</a></p>';
    return '<div class="pv-caissiers">' + caissiers.map((c) => `<label><input type="checkbox" name="caissier" value="${esc(c.id)}" ${locationId && (c.locationIds || []).includes(locationId) ? 'checked' : ''}> ${esc(c.name || c.email)}</label>`).join('') + '</div>';
  }

  function ligne(location = {}) {
    const bloc = document.createElement('fieldset');
    bloc.className = 'pv-carte'; bloc.dataset.id = location.locationId || '';
    const uid = 'pv' + Math.random().toString(36).slice(2, 8);
    bloc.innerHTML = `<div class="pv-grille">
      <div class="kd-champ"><label class="kd-obligatoire" for="${uid}n">Nom</label><input id="${uid}n" name="name" maxlength="120" required></div>
      <div class="kd-champ"><label for="${uid}t">Téléphone</label><input id="${uid}t" name="phone" type="tel" maxlength="30"></div>
      <div class="kd-champ"><label class="kd-obligatoire" for="${uid}a">Adresse</label><input id="${uid}a" name="address" maxlength="240" required></div>
      <div class="kd-champ"><label class="kd-obligatoire" for="${uid}v">Ville</label><input id="${uid}v" name="city" maxlength="100" required></div>
      <div class="pv-plein"><div class="pv-actions"><button type="button" class="kadosk-bouton kadosk-bouton-secondaire" data-chercher>Placer l’adresse sur la carte</button><button type="button" class="kadosk-bouton kadosk-bouton-secondaire" data-ici>Ma position</button></div>
        <div class="pv-map" role="application" aria-label="Carte : cliquez pour placer le point de vente"></div>
        <p class="pv-coord" data-coord>Cliquez sur la carte pour placer le point de vente.</p>
        <input type="hidden" name="latitude"><input type="hidden" name="longitude"></div>
      <div class="pv-plein"><span class="kd-champ"><label>Caissiers de ce point de vente</label></span>${caissiersHtml(location.locationId)}</div>
    </div>
    <div class="pv-options"><label><input type="checkbox" name="active"> Actif</label><label><input type="checkbox" name="acceptsGiftCards"> Accepte les cartes cadeaux</label>
      <button type="button" class="kadosk-bouton kadosk-bouton-danger" data-retirer style="margin-left:auto">Retirer</button></div>`;
    bloc.querySelectorAll('input:not([name=caissier])').forEach((i) => {
      if (i.type === 'checkbox') i.checked = location[i.name] !== false; else i.value = location[i.name] ?? '';
    });
    bloc.dataset.inactif = bloc.querySelector('[name=active]').checked ? '0' : '1';
    bloc.querySelector('[name=active]').addEventListener('change', (e) => { bloc.dataset.inactif = e.target.checked ? '0' : '1'; });
    bloc.querySelector('[data-retirer]').onclick = () => { bloc.remove(); marquerEdition(); };
    list.append(bloc);
    monterCarte(bloc).catch(() => { bloc.querySelector('[data-coord]').textContent = 'Carte indisponible : vérifiez la connexion puis rechargez la page.'; });
    return bloc;
  }

  async function monterCarte(bloc) {
    const L = await chargerLeaflet();
    if (!bloc.isConnected) return;
    const lat = bloc.querySelector('[name=latitude]'), lng = bloc.querySelector('[name=longitude]'), coord = bloc.querySelector('[data-coord]');
    const adresse = bloc.querySelector('[name=address]'), ville = bloc.querySelector('[name=city]');
    const depart = lat.value && lng.value ? [Number(lat.value), Number(lng.value)] : CENTRE_DEFAUT;
    const carte = L.map(bloc.querySelector('.pv-map'), { scrollWheelZoom: false }).setView(depart, lat.value ? 16 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(carte);
    let repere = lat.value ? L.marker(depart, { draggable: true }).addTo(carte) : null;
    const afficher = () => { coord.textContent = lat.value ? 'Position : ' + lat.value + ', ' + lng.value : 'Cliquez sur la carte pour placer le point de vente.'; };
    async function placer(latlng, completerAdresse) {
      lat.value = latlng.lat.toFixed(6); lng.value = latlng.lng.toFixed(6);
      if (!repere) { repere = L.marker(latlng, { draggable: true }).addTo(carte); repere.on('dragend', () => placer(repere.getLatLng(), true)); }
      else repere.setLatLng(latlng);
      afficher(); marquerEdition();
      if (!completerAdresse) return;
      try {
        const r = await adresseDepuisCoordonnees(lat.value, lng.value);
        if (r.adresse) adresse.value = r.adresse;
        if (r.ville) ville.value = r.ville;
        coord.textContent += ' · adresse proposée, vérifiez-la.';
      } catch (_) { /* l'adresse reste à saisir */ }
    }
    if (repere) repere.on('dragend', () => placer(repere.getLatLng(), true));
    carte.on('click', (e) => placer(e.latlng, true));
    bloc.querySelector('[data-chercher]').onclick = async () => {
      const texte = [adresse.value, ville.value, 'Maroc'].filter(Boolean).join(', ');
      try { const [a, b] = await coordonneesDepuisAdresse(texte); carte.setView([a, b], 17); placer({ lat: a, lng: b }, false); }
      catch (_) { coord.textContent = 'Adresse introuvable : cliquez directement sur la carte.'; }
    };
    bloc.querySelector('[data-ici]').onclick = () => {
      if (!navigator.geolocation) { coord.textContent = 'Géolocalisation indisponible sur cet appareil.'; return; }
      navigator.geolocation.getCurrentPosition((p) => { carte.setView([p.coords.latitude, p.coords.longitude], 17); placer({ lat: p.coords.latitude, lng: p.coords.longitude }, true); },
        () => { coord.textContent = 'Position refusée : cliquez sur la carte.'; }, { enableHighAccuracy: true, timeout: 10000 });
    };
    afficher();
    setTimeout(() => carte.invalidateSize(), 200);
  }

  function majCapacite() {
    const actifs = [...list.children].filter((b) => b.querySelector('[name=active]').checked).length;
    const pastille = form.querySelector('[data-capacite]');
    pastille.textContent = actifs + ' point(s) de vente actif(s) / ' + caissiers.length + ' caissier(s)';
    pastille.className = 'kd-statut ' + (actifs <= caissiers.length ? 'ok' : 'refuse');
    form.querySelector('[data-add]').disabled = actifs >= caissiers.length;
    form.querySelector('[data-add]').title = actifs >= caissiers.length ? 'Invitez un caissier supplémentaire pour ajouter un point de vente' : '';
  }

  function afficher(data) {
    state = data;
    form.elements.instructions.value = data.usageInstructions || '';
    list.replaceChildren();
    (data.locations || []).forEach((l) => ligne(l));
    delete form.dataset.kdEdition;
    majCapacite();
  }

  form.querySelector('[data-add]').onclick = () => { ligne().querySelector('[name=name]').focus(); marquerEdition(); };

  form.onsubmit = async (e) => {
    e.preventDefault(); if (busy) return;
    const blocs = [...list.children];
    const invalide = blocs.flatMap((b) => [...b.querySelectorAll('[required]')]).find((i) => !i.value.trim());
    if (invalide) { invalide.setAttribute('aria-invalid', 'true'); invalide.focus(); status.textContent = MESSAGES.LOCATION_INVALID; return; }
    busy = true; status.style.color = ''; status.textContent = 'Enregistrement…';
    const locations = blocs.map((b) => {
      const d = { locationId: b.dataset.id || undefined };
      b.querySelectorAll('input:not([name=caissier])').forEach((i) => { d[i.name] = i.type === 'checkbox' ? i.checked : i.value; });
      if (d.latitude && d.longitude) d.mapsUrl = 'https://www.google.com/maps?q=' + d.latitude + ',' + d.longitude;
      return d;
    });
    try {
      const enregistre = await KADOSK_API.saveLocations({ locations, version: state.version, usageInstructions: form.elements.instructions.value });
      // Les points de vente sont renvoyés dans le même ordre : on relie chaque bloc à son identifiant.
      const ids = (enregistre.locations || []).map((l) => l.locationId);
      const voulu = new Map(caissiers.map((c) => [c.id, new Set()]));
      blocs.forEach((b, i) => b.querySelectorAll('[name=caissier]:checked').forEach((c) => { if (ids[i] && voulu.has(c.value)) voulu.get(c.value).add(ids[i]); }));
      let echecs = 0;
      for (const c of caissiers) {
        const nouveaux = [...voulu.get(c.id)].sort(), anciens = (c.locationIds || []).filter((id) => ids.includes(id)).sort();
        if (JSON.stringify(nouveaux) === JSON.stringify(anciens)) continue;
        try { await KADOSK_API.saveTeamAssignments(c.id, nouveaux); c.locationIds = nouveaux; } catch (_) { echecs++; }
      }
      afficher(enregistre);
      status.style.color = echecs ? '' : '#2f7d6a';
      status.textContent = echecs ? 'Points de vente enregistrés, mais ' + echecs + ' attribution(s) de caissier ont échoué. Réessayez.' : 'Points de vente et caissiers enregistrés.';
    } catch (erreur) {
      status.textContent = MESSAGES[erreur && erreur.message] || 'Enregistrement impossible (' + ((erreur && erreur.message) || 'erreur') + ').';
    } finally { busy = false; }
  };

  Promise.all([KADOSK_API.getLocations(), KADOSK_API.getTeamMembers().catch(() => ({ items: [] }))]).then(([data, equipe]) => {
    caissiers = ((equipe && equipe.items) || []).filter((u) => u.role === 'CASHIER');
    afficher(data);
  }).catch(() => { status.textContent = 'Impossible de charger les points de vente.'; form.querySelector('[type=submit]').disabled = true; });
}());
