(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('dashboardMetrics')) return;
  let busy = false, snapshot;
  const icons = {
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C3 8 5 1 8 3c2 1 4 5 4 5s2-4 4-5c3-2 5 5-4 5Z"/>',
    card: '<rect x="2" y="5" width="20" height="15" rx="2"/><path d="M2 10h20M6 15h5M6 17h2"/>',
    coins: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v5c0 4 16 4 16 0V5M4 10v5c0 4 16 4 16 0v-5M4 15v4c0 4 16 4 16 0v-4"/>',
    shop: '<path d="M3 9l2-6h14l2 6M4 10v11h16V10M9 21v-7h6v7M3 9c0 4 5 4 5 0 0 4 8 4 8 0 0 4 5 4 5 0"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M8 15h2M14 15h2M8 18h2"/>',
    team: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3c0-7 14-7 14 0v3M16 4c5 0 5 7 0 7M18 14c4 0 4 4 4 7"/>'
  };
  const svg = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = svg(el.dataset.icon); });
  function text(id, value) { $(id).textContent = value; $(id).classList.remove('kd-skeleton'); }
  const sum = rows => rows.reduce((n,r) => n + Number(r.amount),0);
  const count = rows => rows.reduce((n,r) => n + Number(r.count),0);
  function delta(current, previous, label) {
    if (!previous) return current ? 'Nouvelle activité ' + label : 'Aucune variation ' + label;
    const p = (current - previous) / previous * 100;
    return (p >= 0 ? '+' : '') + Math.round(p) + ' % ' + label;
  }
  function dayOffset(iso, days) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); }
  function renderChart() {
    const currency = $('chartCurrency').value || 'MAD';
    const rows = snapshot.daily.filter(r=>r.currency===currency);
    const days = Array.from({length:7},(_,i)=>dayOffset(snapshot.today,i-6));
    const values = days.map(day=>sum(rows.filter(r=>r.day===day)));
    const max = Math.max(...values,100), left=48, top=15, width=440, height=155;
    const points = values.map((v,i)=>[left+i*width/6,top+height-height*v/max]);
    const path=points.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ');
    let markup='<svg viewBox="0 0 510 210" role="img" aria-label="Encaissements quotidiens en '+KD6.esc(currency)+'"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1FAA6C" stop-opacity=".3"/><stop offset="1" stop-color="#1FAA6C" stop-opacity=".02"/></linearGradient></defs>';
    for(let i=0;i<5;i++){const y=top+height*i/4;markup+='<path d="M48 '+y+'H488" stroke="#e0e7df"/><text x="40" y="'+(y+4)+'" text-anchor="end" fill="#68786f" font-size="10">'+Math.round(max*(1-i/4)/100).toLocaleString('fr-FR')+'</text>';}
    markup+='<path d="'+path+' L488 170 L48 170 Z" fill="url(#chartFill)"/><path d="'+path+'" fill="none" stroke="#176b55" stroke-width="2.5"/>';
    points.forEach((p,i)=>{ markup+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5" fill="#176b55" stroke="white"><title>'+KD6.esc(days[i]+' : '+KD6.argent(values[i],currency))+'</title></circle><text x="'+p[0]+'" y="194" text-anchor="middle" fill="#68786f" font-size="10">'+new Date(days[i]+'T12:00:00Z').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',timeZone:'UTC'})+'</text>'; });
    $('chart').innerHTML=markup+'</svg>'; $('chart').setAttribute('aria-busy','false');
    text('chartTotal',KD6.argent(values.reduce((a,b)=>a+b,0),currency));
  }
  function quotas(q) {
    text('quotaPlan',q.planName || 'Formule à vérifier');
    for(const [key,id] of [['locations','Locations'],['cards','Cards'],['cashiers','Cashiers']]) {
      const item=q[key], unlimited=q.known && item.limit===null && key==='cards';
      text('quota'+id,item.used+' / '+(!q.known?'—':unlimited?'Illimité':item.limit));
      const bar=$('quota'+id+'Bar');bar.max=Math.max(1,Number(item.limit)||1);bar.value=unlimited||!q.known?0:Math.min(item.used,bar.max);
      bar.setAttribute('aria-label',key+' : '+$('quota'+id).textContent);
      bar.closest('.kd-quota').classList.toggle('at-limit',q.known&&!unlimited&&item.used>=item.limit);
    }
    text('quotaLocationsNote','Points de vente actifs');
    text('quotaCashiersNote',q.cashiers.active+' actifs · '+q.cashiers.invited+' invitation(s)');
    text('quotaStatus',q.verified?'Limites définies par votre administrateur.':'Dernière formule connue · vérification Wix en cours…');
  }
  function render(data) {
    snapshot=data;
    KADOSK_NAV.definirRole('OWNER',{v6Only:true});
    text('shopName',data.merchant.name);text('accountInitials',data.merchant.name.slice(0,2).toUpperCase());
    text('shopMeta',[data.merchant.activity,data.quotas.locations.used+' point(s) de vente'].filter(Boolean).join(' · '));
    const currencies=[...new Set(data.daily.map(r=>r.currency))].sort();
    if(!currencies.length)currencies.push('MAD');
    const today=data.daily.filter(r=>r.day===data.today), yesterday=data.daily.filter(r=>r.day===dayOffset(data.today,-1));
    const week=data.daily.filter(r=>r.day>=dayOffset(data.today,-6)), previous=data.daily.filter(r=>r.day<dayOffset(data.today,-6));
    const money=rows=>currencies.map(c=>KD6.argent(sum(rows.filter(r=>r.currency===c)),c)).join(' · ');
    text('todayAmount',money(today));text('todayCount',count(today));text('locationCount',data.quotas.locations.used);text('weekAmount',money(week));
    text('todayChange',currencies.length===1?delta(sum(today),sum(yesterday),'vs hier'):'Montants par devise');
    text('countChange',delta(count(today),count(yesterday),'vs hier'));
    text('weekChange',currencies.length===1?delta(sum(week),sum(previous),'sur 7 jours'):'Montants par devise');
    $('chartCurrency').replaceChildren(...currencies.map(c=>new Option(c,c)));$('chartCurrency').hidden=currencies.length<2;
    renderChart();
    $('recentTransactions').replaceChildren();
    data.recent.forEach(r=>{
      const li=document.createElement('li');li.innerHTML='<span class="kd-tx-icon">'+svg('gift')+'</span><div class="kd-tx-info"><strong></strong><small></small></div><b class="kd-tx-amount"></b>';
      li.querySelector('strong').textContent='••••-••••-••••-'+r.display_suffix;
      li.querySelector('small').textContent=new Date(r.created_at).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Casablanca'});
      li.querySelector('b').textContent='+'+KD6.argent(r.amount_minor,r.currency);$('recentTransactions').append(li);
    });
    if(!data.recent.length)$('recentTransactions').textContent='Vos encaissements apparaîtront ici.';
    $('recentTransactions').setAttribute('aria-busy','false');quotas(data.quotas);
  }
  function handle(error) {
    if(['TWO_FACTOR_REQUIRED','2FA_ENROLLMENT_REQUIRED'].includes(error.message)){location.href='two-factor.html?retour=dashboard.html';return;}
    if(['SESSION_EXPIRED','SESSION_EXPIREE','NOT_AUTHENTICATED','SESSION_REQUIRED'].includes(error.message)){KADOSK_AUTH.deconnecter();return;}
    text('dashboardStatus',KD6.message(error));$('dashboardRetry').hidden=false;
  }
  async function refresh() {
    if(busy)return;busy=true;$('dashboardRetry').hidden=true;
    try {
      const data=await KD6.appeler('dashboard.get');
      if(data.role==='CASHIER'){location.href='scanner.html';return;}
      if(data.role!=='OWNER')throw Error('ROLE_REQUIRED');
      render(data);text('dashboardStatus','');
      // Wix is off the first-render critical path. Refresh the snapshot only after success.
      if(!data.quotas.verified)KD6.appeler('subscription.status').then(()=>KD6.appeler('dashboard.get')).then(fresh=>{
        if(fresh.role==='OWNER'){snapshot.quotas=fresh.quotas;quotas(fresh.quotas);if(!fresh.quotas.verified)text('quotaStatus','Vérification de la formule indisponible. Consultez Abonnement.');}
      }).catch(e=>{text('quotaStatus','Vérification Wix indisponible. Les opérations restent contrôlées côté serveur.');if(['SESSION_EXPIRED','SESSION_EXPIREE','TWO_FACTOR_REQUIRED'].includes(e.message))handle(e);});
    } catch(e){handle(e);} finally{busy=false;$('dashboardMetrics').setAttribute('aria-busy','false');}
  }
  if(!KADOSK_AUTH.estConnecte()){location.href='login.html';return;}
  KADOSK_NAV.rendreBarreLaterale('kadoskSidebar','PENDING',{v6Only:true});
  ['mobileLogout','lienDeconnexion'].forEach(id=>$(id).addEventListener('click',()=>KADOSK_AUTH.deconnecter()));
  $('dashboardRetry').addEventListener('click',refresh);$('chartCurrency').addEventListener('change',renderChart);
  refresh();
  setInterval(()=>{if(!document.hidden)KD6.appeler('me.context').then(c=>{if(c.role==='CASHIER')location.href='scanner.html';}).catch(handle);},60000);
})();
