(function(){
  'use strict';
  const admin=location.pathname.includes('/Admin/'), registry=document.body.dataset.registry==='true';
  const select=document.getElementById('recordKind'), result=document.getElementById('recordResults'), message=document.getElementById('recordMessage');
  let offset=0, pending=false;
  const requested=new URLSearchParams(location.search).get('kind');
  if(Array.from(select.options).some(o=>o.value===requested))select.value=requested;
  const labels={_id:'Référence',id:'Référence',MerchantID:'Commerce',merchant_id:'Commerce',OrderNumber:'Commande',BuyerEmail:'Acheteur',Amount:'Montant',Status:'Statut',status:'Statut',CodeStatus:'Statut',CreatedAt:'Date',created_at:'Date',ExpiresAt:'Expiration',expires_at:'Expiration',Action:'Action',Success:'Succès',Reason:'Motif',MontantTTCLigne:'Montant TTC',MontantCommission:'Commission',TauxApplique:'Taux',StatutPaiement:'Paiement',Year:'Année',Month:'Mois',InvoiceNumber:'Facture',TotalTTC:'Total TTC',TotalHT:'Total HT',business_name:'Boutique',country_code:'Pays',city:'Ville',display_suffix:'Fin du code',initial_amount_minor:'Valeur (centimes)',balance_minor:'Solde (centimes)',currency:'Devise'};
  async function load(){
    if(pending)return;pending=true;result.replaceChildren();
    document.getElementById('recordPrev').disabled=true;document.getElementById('recordNext').disabled=true;
    KD6.afficher(message,'Chargement…','');
    try{
      if(admin)await window.KADOSK_ADMIN_READY;
      const data=await KD6.appeler(registry?'admin.registry.list':admin?'admin.archives.list':'archives.list',{kind:select.value,offset});
      const rows=data.items||[];
      KD6.afficher(message,rows.length?`${rows.length} résultat(s) — page ${offset/50+1}`:registry?'Aucun résultat.':'Aucune archive disponible pour cette catégorie.','');
      if(rows.length){
        const fields=data.fields||Object.keys(rows[0]);const table=document.createElement('table');table.className='v6-table';
        const head=table.createTHead().insertRow();fields.forEach(k=>{const th=document.createElement('th');th.textContent=labels[k]||k;head.append(th);});
        const body=table.createTBody();rows.forEach(row=>{const tr=body.insertRow();fields.forEach(k=>{tr.insertCell().textContent=row[k]===null||row[k]===undefined?'—':String(row[k]);});});result.append(table);
      }
      document.getElementById('recordPrev').disabled=offset===0;
      document.getElementById('recordNext').disabled=!(data.hasMore || offset+rows.length<data.totalCount);
    }catch(e){KD6.afficher(message,KD6.message(e),'erreur');}finally{pending=false;}
  }
  select.onchange=()=>{offset=0;load();};
  document.getElementById('recordPrev').onclick=()=>{offset=Math.max(0,offset-50);load();};
  document.getElementById('recordNext').onclick=()=>{offset+=50;load();};
  const health=document.getElementById('dataHealth');
  if(health)health.onclick=async()=>{health.disabled=true;try{await window.KADOSK_ADMIN_READY;const h=await KD6.appeler('admin.dataHealth');KD6.afficher(message,h.ready?'Connexion Supabase et schéma V6 vérifiés.':'Vérification incomplète.','');}catch(e){KD6.afficher(message,KD6.message(e),'erreur');}finally{health.disabled=false;}};
  load();
})();
