(() => {
 const $=id=>document.getElementById(id);let busy=false;
 async function run(confirm){
  if(busy||!$('reactivate').reportValidity())return;busy=true;$('request').disabled=$('confirm').disabled=true;
  const code=$('code').value.trim(),pin=$('pin').value;
  try{
   if(confirm){await KADOSK_API.confirmReactivation(code,pin,$('otp').value.trim());$('reactivate').reset();$('confirmation').hidden=true;$('status').textContent='Votre carte est réactivée. Vous pouvez à nouveau l’utiliser.';}
   else{await KADOSK_API.requestReactivation(code,pin);$('confirmation').hidden=false;$('status').textContent='Si les informations correspondent à une carte éligible, un code a été envoyé à son adresse e-mail. Il expire dans 10 minutes.';$('otp').focus();}
  }catch(_){$('status').textContent=confirm?'Réactivation impossible : vérifiez les codes et réessayez plus tard si vous avez atteint la limite.':'Demande indisponible. Vérifiez les informations ou réessayez plus tard.';}
  finally{busy=false;$('request').disabled=$('confirm').disabled=false;}
 }
 $('reactivate').addEventListener('submit',e=>{e.preventDefault();run(false);});$('confirm').addEventListener('click',()=>run(true));
})();
