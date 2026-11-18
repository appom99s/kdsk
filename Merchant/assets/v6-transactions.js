(function(){
  'use strict';
  let offset=0,busy=false;
  const $=id=>document.getElementById(id);
  async function load(){
    if(busy)return;busy=true;$('txPrev').disabled=true;$('txNext').disabled=true;
    $('txStatus').textContent='Chargement des encaissements…';$('txRows').replaceChildren();
    try{
      await window.KADOSK_MERCHANT_READY;
      const data=await KD6.appeler('transactions.list',{offset});
      data.items.forEach(row=>{
        const tr=document.createElement('tr');
        [KD6.date(row.created_at),row.merchant_locations?.name||'—',
          row.gift_cards?.currency?KD6.argent(row.amount_minor,row.gift_cards.currency):'Devise indisponible',
          row.gift_cards?.currency?KD6.argent(row.balance_after_minor,row.gift_cards.currency):'—'].forEach(value=>{
          const td=document.createElement('td');td.textContent=value;tr.appendChild(td);
        });$('txRows').appendChild(tr);
      });
      $('txStatus').textContent=data.items.length?'Page '+(offset/50+1):'Aucun encaissement pour le moment.';
      $('txPrev').disabled=offset===0;$('txNext').disabled=!data.hasMore;
    }catch(e){$('txStatus').textContent=KD6.message(e);}
    finally{busy=false;}
  }
  $('txPrev').onclick=()=>{offset=Math.max(0,offset-50);load();};
  $('txNext').onclick=()=>{offset+=50;load();};
  $('txRefresh').onclick=load;
  load();
})();
