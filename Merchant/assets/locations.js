(function () {
  'use strict';
  const host = document.getElementById('merchant-locations'); if (!host) return;
  let state = {locations:[],version:0}, busy = false;
  const form = document.createElement('form'); form.className = 'location-form';
  form.innerHTML = '<h2>Points de vente</h2><label>Instructions d’utilisation de la carte<textarea name="instructions" maxlength="2000" rows="3"></textarea></label><div class="location-list"></div><button type="button" data-add>Ajouter un point de vente</button><button type="submit">Enregistrer les points de vente</button><p role="status"></p>';
  host.append(form); const list = form.querySelector('.location-list'), status = form.querySelector('[role=status]');
  function row(location = {}) {
    const fieldset = document.createElement('fieldset'); fieldset.dataset.id = location.locationId || '';
    fieldset.innerHTML = '<legend>Établissement</legend>' + [['name','Nom'],['address','Adresse'],['city','Ville'],['latitude','Latitude'],['longitude','Longitude'],['mapsUrl','Lien Google Maps'],['phone','Téléphone']].map(([name,label]) => `<label>${label}<input name="${name}" ${['name','address','city'].includes(name)?'required':''} ${['latitude','longitude'].includes(name)?'type="number" step="any"':name==='mapsUrl'?'type="url"':'type="text"'}></label>`).join('') + '<label><input type="checkbox" name="active">Actif</label><label><input type="checkbox" name="acceptsGiftCards">Accepte les cartes cadeaux</label><button type="button" data-map>Sélectionner sur la carte</button>';
    fieldset.querySelectorAll('input').forEach(input => { if (input.type === 'checkbox') input.checked = location[input.name] !== false; else input.value = location[input.name] ?? ''; });
    fieldset.querySelector('[data-map]').onclick = () => picker(fieldset);
    list.append(fieldset);
  }
  let mapsLoading;
  async function googleMap(dialog, fields, address, lat, lng) {
    const key = window.KADOSK_CONFIG?.googleMapsBrowserKey, mapId = window.KADOSK_CONFIG?.googleMapsMapId;
    if (!key || !mapId) return;
    if (!window.google?.maps?.importLibrary) {
      mapsLoading ||= new Promise((resolve,reject) => {
        const script = document.createElement('script');
        window.kadoskMapsReady = () => { delete window.kadoskMapsReady; resolve(); };
        script.src = 'https://maps.googleapis.com/maps/api/js?loading=async&v=quarterly&callback=kadoskMapsReady&key=' + encodeURIComponent(key);
        script.onerror = () => { mapsLoading = null; reject(new Error('MAP_UNAVAILABLE')); }; document.head.append(script);
      });
      await mapsLoading;
    }
    const [{Map}, {AdvancedMarkerElement}, {Geocoder}] = await Promise.all(['maps','marker','geocoding'].map(name => google.maps.importLibrary(name)));
    if (!dialog.isConnected) return;
    const host = document.createElement('div'); host.className = 'map-frame'; dialog.querySelector('iframe').replaceWith(host);
    const center = lat.value && lng.value ? {lat:Number(lat.value),lng:Number(lng.value)} : {lat:33.5731,lng:-7.5898};
    const map = new Map(host,{center,zoom:14,mapId}), marker = new AdvancedMarkerElement({map,position:center,gmpDraggable:true,title:'Déplacez le repère sur votre établissement'}), geocoder = new Geocoder();
    const status = dialog.querySelector('[role=status]');
    function select(point) { const a = typeof point.lat === 'function' ? point.lat() : point.lat, b = typeof point.lng === 'function' ? point.lng() : point.lng; lat.value = a.toFixed(6); lng.value = b.toFixed(6); marker.position = {lat:a,lng:b}; }
    marker.addListener('dragend',async () => {
      select(marker.position);
      try { const response = await geocoder.geocode({location:marker.position}); if (response.results[0]) {address.value = response.results[0].formatted_address; status.textContent = address.value;} } catch (_) {status.textContent='Emplacement sélectionné. Vérifiez l’adresse.';}
    });
    map.addListener('click',event => select(event.latLng));
    dialog.querySelector('[data-search]').onclick = async () => {
      try { const response = await geocoder.geocode({address:address.value}); if (!response.results[0]) throw Error(); const result = response.results[0]; select(result.geometry.location); map.setCenter(result.geometry.location); address.value = result.formatted_address; status.textContent = address.value; }
      catch (_) {status.textContent='Adresse introuvable. Déplacez le repère ou saisissez les coordonnées.';}
    };
    dialog.querySelector('h2 + p').textContent = 'Recherchez votre adresse, puis déplacez le repère pour préciser l’emplacement.';
  }
  function picker(fields) {
    const dialog = document.createElement('dialog'); dialog.className = 'kadosk-sheet';
    dialog.innerHTML = '<h2>Localiser votre établissement</h2><p>Saisissez les coordonnées du repère Google Maps pour choisir l’emplacement précis.</p><label>Rechercher une adresse<input name="address"></label><button type="button" data-search>Voir sur la carte</button><iframe class="map-frame" title="Localisation de votre établissement" referrerpolicy="no-referrer"></iframe><label>Latitude<input name="lat" type="number" min="-90" max="90" step="any"></label><label>Longitude<input name="lng" type="number" min="-180" max="180" step="any"></label><p role="status"></p><button type="button" data-cancel>Annuler</button><button type="button" data-confirm>Confirmer l’emplacement</button>';
    document.body.append(dialog);
    const lat = dialog.querySelector('[name=lat]'), lng = dialog.querySelector('[name=lng]'), address = dialog.querySelector('[name=address]');
    lat.value = fields.querySelector('[name=latitude]').value; lng.value = fields.querySelector('[name=longitude]').value;
    address.value = fields.querySelector('[name=address]').value + ', ' + fields.querySelector('[name=city]').value;
    dialog.querySelector('[data-search]').onclick = () => { dialog.querySelector('iframe').src = 'https://www.google.com/maps?q=' + encodeURIComponent(address.value) + '&output=embed'; };
    dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
    dialog.querySelector('[data-confirm]').onclick = () => {
      if (!lat.value || !lng.value || !lat.checkValidity() || !lng.checkValidity()) { dialog.querySelector('[role=status]').textContent = 'Indiquez deux coordonnées valides.'; return; }
      fields.querySelector('[name=latitude]').value = lat.value; fields.querySelector('[name=longitude]').value = lng.value; dialog.close();
    };
    dialog.onclose = () => dialog.remove(); dialog.showModal();
    googleMap(dialog,fields,address,lat,lng).catch(() => {dialog.querySelector('[role=status]').textContent = 'Carte interactive indisponible. Vous pouvez saisir les coordonnées.';});
  }
  form.querySelector('[data-add]').onclick = () => row();
  form.onsubmit = async e => {
    e.preventDefault(); if (busy) return; busy = true; status.textContent = 'Enregistrement…';
    const locations = [...list.children].map(fields => { const data = {locationId:fields.dataset.id}; fields.querySelectorAll('input').forEach(i => { data[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); return data; });
    try {
      state = await KADOSK_API.saveLocations({locations,version:state.version,usageInstructions:form.elements.instructions.value});
      list.replaceChildren(); state.locations.forEach(row); status.textContent = 'Points de vente enregistrés.';
    } catch (_) { status.textContent = 'Enregistrement impossible. Rechargez les paramètres avant de réessayer.'; }
    finally { busy = false; }
  };
  KADOSK_API.getLocations().then(data => { state = data; form.elements.instructions.value = data.usageInstructions || ''; data.locations.forEach(row); }).catch(() => { status.textContent = 'Impossible de charger les points de vente.'; form.querySelector('[type=submit]').disabled = true; });
}());
