(function () {
  'use strict';
  var $ = id => document.getElementById(id), amountDigits = '', gateway = null, busy = false, stream = null, loop = null, scanning = false;
  var shop = '', codeBound = false;
  document.addEventListener('kd6:contexte', e => { shop = e.detail.businessName || ''; });
  function message(text, type) { KD6.afficher(gateway ? $('scGatewayStatus') : $('scMessage'), text, type); }
  function amount() { return (Number(amountDigits || 0) / 100).toFixed(2); }
  function clearPin() { $('scPin').value = ''; }
  function pad(id, handle) {
    ['1','2','3','4','5','6','7','8','9','Effacer','0','⌫'].forEach(value => {
      var b = document.createElement('button'); b.type='button'; b.textContent=value; b.setAttribute('aria-label', value==='⌫'?'Supprimer le dernier chiffre':value);
      b.addEventListener('click', () => { if (!busy) handle(value); }); $(id).appendChild(b);
    });
  }
  function amountKey(v) { if (gateway) return; amountDigits=v==='Effacer'?'':v==='⌫'?amountDigits.slice(0,-1):(amountDigits+v).replace(/^0+/,'').slice(0,8); $('scMontant').value=amount().replace('.',','); }
  function pinKey(v) { $('scPin').value=v==='Effacer'?'':v==='⌫'?$('scPin').value.slice(0,-1):($('scPin').value+v).slice(0,4); }
  pad('scAmountPad',amountKey); pad('scPinPad',pinKey);
  for (var [id,handler] of [['scMontant',amountKey],['scPin',pinKey]]) {
    (function(id,handler){$(id).addEventListener('keydown', e=>{if(busy)return; if(/^\d$/.test(e.key)){e.preventDefault();handler(e.key);}else if(e.key==='Backspace'){e.preventDefault();handler('⌫');}});})(id,handler);
  }
  async function prepare() {
    $('scOuvrir').disabled=true;
    try {
      var [device,locations]=await Promise.all([KD6.appeler('cashier.device.start'),KD6.appeler('cashier.locations')]);
      if(device.status==='VERIFICATION_REQUIRED'){$('scAppareil').hidden=false;$('scCaisse').hidden=true;return;}
      $('scAppareil').hidden=true;$('scCaisse').hidden=false;
      $('scLieu').replaceChildren(); locations.forEach(l=>{var option=document.createElement('option');option.value=l.id;option.textContent=l.name+(l.city?' — '+l.city:'');$('scLieu').appendChild(option);});
      $('scLieu').disabled=locations.length<=1;$('scOuvrir').disabled=!locations.length;
      if(!locations.length)message('Aucun point de vente attribué. Contactez votre responsable.','erreur');
    }catch(e){message(KD6.message(e),'erreur');}
  }
  $('scValiderAppareil').addEventListener('click',async()=>{try{await KD6.appeler('cashier.device.verify',{code:$('scCodeAppareil').value.trim()});$('scCodeAppareil').value='';await prepare();}catch(e){message(KD6.message(e),'erreur');}});
  $('scOuvrir').addEventListener('click',async()=>{
    if(busy)return;if(Number(amount())<=0){message('Saisissez un montant.','erreur');return;}busy=true;$('scOuvrir').disabled=true;
    try{
      gateway=await KD6.appeler('redeem.start',{amount:amount(),locationId:$('scLieu').value});codeBound=false;
      $('scGatewayAmount').textContent=KD6.argent(gateway.amountMinor,gateway.currency);$('scGatewayShop').textContent=shop || document.querySelector('[data-marchand-nom]')?.textContent || '';
      $('scCardStage').hidden=false;$('scEncaissement').hidden=true;$('scCode').value='';clearPin();KD6.afficher($('scGatewayStatus'),'','info');
      $('scGateway').showModal();$('scCode').focus();
    }catch(e){gateway=null;message(KD6.message(e),'erreur');}finally{busy=false;$('scOuvrir').disabled=false;}
  });
  async function lookup(){
    if(busy||!gateway)return;busy=true;$('scRechercher').disabled=true;
    try{var r=await KD6.appeler('redeem.lookup',{gatewayToken:gateway.gatewayToken,code:$('scCode').value.trim()});
      codeBound=true;stop();$('scCode').value='';$('scCarteInfo').textContent='Carte se terminant par '+r.displaySuffix;
      $('scGatewayAmount').textContent=KD6.argent(r.amountMinor,r.currency);$('scCardStage').hidden=true;$('scEncaissement').hidden=false;clearPin();$('scPin').focus();message('','info');
    }catch(e){message(KD6.message(e),'erreur');}finally{busy=false;$('scRechercher').disabled=false;}
  }
  $('scRechercher').addEventListener('click',lookup);
  $('scEncaisser').addEventListener('click',async()=>{
    if(busy||!gateway||!codeBound)return;
    var pin=$('scPin').value;clearPin();if(!/^\d{4}$/.test(pin)){message('Saisissez les 4 chiffres du PIN.','erreur');return;}
    busy=true;$('scEncaisser').disabled=true;
    try{var r=await KD6.appeler('redeem.confirm',{gatewayToken:gateway.gatewayToken,pin:pin});pin='';
      $('scGateway').close();gateway=null;codeBound=false;amountDigits='';$('scMontant').value='0,00';message((r.result==='ALREADY_REDEEMED'?'Paiement déjà confirmé : ':'Paiement confirmé : ')+KD6.argent(r.amountMinor,r.currency),'ok');
    }catch(e){message(KD6.message(e),'erreur');}finally{pin='';busy=false;$('scEncaisser').disabled=false;}
  });
  function cancel(){if(busy)return;stop();clearPin();$('scCode').value='';if(gateway)KD6.appeler('redeem.cancel',{gatewayToken:gateway.gatewayToken}).catch(()=>{});gateway=null;codeBound=false;$('scGateway').close();$('scOuvrir').focus();}
  $('scNouvelle').addEventListener('click',cancel);$('scGateway').addEventListener('cancel',e=>{e.preventDefault();cancel();});
  async function localQr(){if(window.jsQR)return;await new Promise((resolve,reject)=>{var s=document.createElement('script');s.src='../shared/vendor/jsQR-1.4.0.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
  function stop(){if(loop)clearInterval(loop);loop=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('scZoneScan').hidden=true;}
  $('scDemarrer').addEventListener('click',async()=>{
    if(stream||!gateway||busy)return;
    try{var detector=null;if('BarcodeDetector' in window){try{detector=new BarcodeDetector({formats:['qr_code']});}catch(_){}}
      if(!detector)await localQr();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      $('scVideo').srcObject=stream;$('scZoneScan').hidden=false;await $('scVideo').play();
      var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
      loop=setInterval(async()=>{if(scanning||!stream||$('scVideo').readyState<2)return;scanning=true;
        try{var value=null;if(detector){var matches=await detector.detect($('scVideo'));value=matches[0]?.rawValue;}else{canvas.width=$('scVideo').videoWidth;canvas.height=$('scVideo').videoHeight;ctx.drawImage($('scVideo'),0,0);var img=ctx.getImageData(0,0,canvas.width,canvas.height);value=window.jsQR(img.data,img.width,img.height)?.data;}
          if(value&&stream){stop();$('scCode').value=value;await lookup();}
        }catch(_){ /* Next frame, without exposing camera data. */ }finally{scanning=false;}
      },300);
    }catch(_){stop();message('Caméra indisponible. Saisissez le code de la carte.','erreur');}
  });
  $('scArreter').addEventListener('click',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();clearPin();}});
  window.addEventListener('pagehide',()=>{stop();clearPin();gateway=null;});prepare();
})();
