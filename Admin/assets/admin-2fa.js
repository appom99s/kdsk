(async function(){
 const status=document.getElementById('status'),setup=document.getElementById('setup'),secret=document.getElementById('secret'),submit=document.getElementById('submit');
 let enrollment=false,ready=false;submit.disabled=true;
 try {const result=await KADOSK_API.need2FA();enrollment=result.enrollmentRequired;setup.hidden=!enrollment;ready=!enrollment;submit.disabled=!ready;}
 catch(e){status.textContent='Connexion indisponible. Reconnectez-vous puis réessayez.';}
 setup.onclick=async()=>{setup.disabled=true;try{const result=await KADOSK_API.start2FA();secret.textContent='Clé à ajouter dans votre application : '+result.secretBase32;secret.hidden=false;ready=true;submit.disabled=false;}catch(e){status.textContent='Configuration impossible. Réessayez.';}finally{setup.disabled=false;}};
 document.getElementById('verify').onsubmit=async e=>{e.preventDefault();if(!ready)return;submit.disabled=true;status.textContent='Vérification…';try{const code=document.getElementById('code').value;await (enrollment?KADOSK_API.confirm2FA(code):KADOSK_API.verify2FA(code));secret.textContent='';location.replace('admin-dashboard.html');}catch(e){status.textContent='Code refusé ou session expirée. Réessayez ou reconnectez-vous.';}finally{submit.disabled=false;}};
})();