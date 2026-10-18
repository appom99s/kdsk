(() => {
 const $=id=>document.getElementById(id),status=$('status');let email='';
 const message=(value)=>{status.textContent=value;};
 async function load(){
  const session=KADOSK_BUYER_SESSION.lire();if(!session)throw Error('SESSION_EXPIRED');
  const result=await KADOSK_API.getMesCartesByEmail(session.token);$('cards').replaceChildren();
  for(const card of result.items||[]){
   const article=document.createElement('article'),title=document.createElement('h2'),invoice=document.createElement('a');
   title.textContent=card.businessName;invoice.textContent='Consulter la facture';invoice.href='invoice.html?commande='+encodeURIComponent(card.orderNumber);
   article.append(title,invoice);
   if(card.status==='SUSPENDED'){
    const p=document.createElement('p'),link=document.createElement('a');p.textContent='Carte bloquée. La réinitialisation du PIN ne la réactive pas.';
    link.href='reactivation.html';link.textContent='Demander la réactivation';article.append(p,link);
   }
   if(card.status==='ACTIVE'){
    const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),button=document.createElement('button');
    input.id='pin-'+card.orderItemId;input.type='password';input.inputMode='numeric';input.pattern='[0-9]{6}';input.maxLength=6;input.required=true;input.autocomplete='new-password';label.htmlFor=input.id;label.textContent='Nouveau PIN à 6 chiffres';button.textContent='Réinitialiser le PIN';
    form.append(button);form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;
     try{const current=KADOSK_BUYER_SESSION.lire();if(!current)throw Error();await KADOSK_API.setCardPin(card.orderItemId,current.token,null);input.value='';message('Nouveau PIN envoyé par e-mail. L’ancien PIN ne fonctionne plus.');}
     catch(_){message('Modification impossible. Vérifiez votre session et le statut de la carte.');}finally{button.disabled=false;}});article.append(form);
   }
   $('cards').append(article);
  }
  if(!$('cards').childElementCount)$('cards').textContent='Aucune facture ou carte disponible pour cette adresse.';
  $('login').hidden=$('otpForm').hidden=true;$('utilities').hidden=false;
 }
 $('login').addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;email=$('email').value.trim().toLowerCase();try{await KADOSK_API.demanderCodeCommandes(email);$('login').hidden=true;$('otpForm').hidden=false;message('Saisissez le code reçu par e-mail.');}catch(_){message('Envoi indisponible. Réessayez dans quelques instants.');}finally{b.disabled=false;}});
 $('otpForm').addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const r=await KADOSK_API.confirmerCodeCommandes(email,$('otp').value,KADOSK_BUYER_SESSION.deviceId);KADOSK_BUYER_SESSION.definir(r.token,email,r.expiresInDays);$('otp').value='';await load();message('');}catch(_){message('Code invalide ou expiré. Réessayez.');}finally{b.disabled=false;}});
 $('back').addEventListener('click',()=>{$('login').hidden=false;$('otpForm').hidden=true;$('otp').value='';});
 $('logout').addEventListener('click',async()=>{const s=KADOSK_BUYER_SESSION.lire();KADOSK_BUYER_SESSION.effacer();$('cards').replaceChildren();$('utilities').hidden=true;$('login').hidden=false;if(s)await KADOSK_API.revokeBuyerSession(s.token).catch(()=>{});});
 if(KADOSK_BUYER_SESSION.lire())load().catch(()=>{KADOSK_BUYER_SESSION.effacer();message('Vérifiez votre e-mail pour continuer.');});
})();
