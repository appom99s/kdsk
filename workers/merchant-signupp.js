/**
 * KADOSK — relais sécurisé Google Sheets pour Merchant/signupp.html
 * Déploiement : Cloudflare Worker (module ES).
 * Secrets : GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 * Variable : GOOGLE_SHEET_ID = 1Z-s5EE0cFmRsFcQ2trvfVPbBbh5cJCItxE7UoQjex_A
 * Partager le Google Sheet avec GOOGLE_SERVICE_ACCOUNT_EMAIL (Éditeur).
 * Prévoir Turnstile et limitation de débit avant ouverture publique.
 */
const HEADERS = ['Date d\'inscription (UTC)','Raison sociale / Nom commercial','Forme juridique','Pays','ICE','RC','Activité','Adresse','Ville','Prénom responsable','Nom responsable','Fonction','E-mail','Téléphone','Latitude GPS','Longitude GPS','Précision GPS (m)','Consentement GPS','Conditions acceptées','Confidentialité acceptée','Marketing accepté','Source','Statut','ID de demande','Google Maps'];
const MAX = {businessName:120,legalForm:50,country:5,ice:15,rc:40,activity:120,address:300,city:100,firstName:80,lastName:80,position:100,email:190,phone:25,requestId:100};
function json(body,status=200,origin=''){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});}
function str(v,max){return typeof v==='string'?v.trim().slice(0,max):'';}
function safe(v){const s=String(v??'');return /^[=+@\-\t\r]/.test(s)?"'"+s:s;}
function base64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function accessToken(env){
  const email=env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key=env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if(!email||!key)throw new Error('CREDENTIALS_MISSING');
  const now=Math.floor(Date.now()/1000);
  const header=base64url(new TextEncoder().encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const claim=base64url(new TextEncoder().encode(JSON.stringify({iss:email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3000})));
  const pem=key.replace(/\\n/g,'\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
  const bytes=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));
  const pk=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const unsigned=header+'.'+claim;
  const sig=base64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pk,new TextEncoder().encode(unsigned))));
  const body=new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+sig});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  if(!r.ok)throw new Error('GOOGLE_AUTH_FAILED');
  const j=await r.json();return j.access_token;
}
function validate(d){
  if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('INVALID_PAYLOAD');
  const out={};for(const [k,n]of Object.entries(MAX))out[k]=str(d[k],n);
  if(!out.businessName||!out.legalForm||!out.country||!out.activity||!out.address||!out.city||!out.firstName||!out.lastName||!out.email||!out.phone||!out.requestId)throw new Error('REQUIRED_FIELDS');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)||!/^[+0-9() .-]{8,25}$/.test(out.phone))throw new Error('INVALID_CONTACT');
  if(out.ice&&!/^\d{15}$/.test(out.ice))throw new Error('INVALID_ICE');
  if(d.acceptedTerms!==true||d.privacyConsent!==true)throw new Error('CONSENT_REQUIRED');
  const gps=d.gpsConsent===true;
  if(gps){
    const lat=Number(d.latitude),lon=Number(d.longitude),acc=Number(d.gpsAccuracy);
    if(d.latitude===null||d.longitude===null||d.gpsAccuracy===null||!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(acc)||Math.abs(lat)>90||Math.abs(lon)>180||acc<0)throw new Error('INVALID_GPS');
    out.latitude=lat;out.longitude=lon;out.accuracy=acc;
  } else {out.latitude='';out.longitude='';out.accuracy='';}
  out.gps=gps;out.marketing=d.marketingConsent===true;return out;
}
export default {
 async fetch(request,env){
   const origin=request.headers.get('Origin')||'';
   const allowed=new Set(['https://merchant.kadosk.com','https://www.kadosk.com']);
   if(origin&&!allowed.has(origin))return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403);
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin||'https://merchant.kadosk.com','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}});
   if(request.method!=='POST')return json({ok:false,error:'METHOD_NOT_ALLOWED'},405,origin);
   if(!origin||!allowed.has(origin))return json({ok:false,error:'ORIGIN_REQUIRED'},403);
   if((Number(request.headers.get('Content-Length'))||0)>10000)return json({ok:false,error:'PAYLOAD_TOO_LARGE'},413,origin);
   try{
     const raw=await request.text();if(raw.length>10000)throw new Error('PAYLOAD_TOO_LARGE');
     const data=validate(JSON.parse(raw));
     if(!env.GOOGLE_SHEET_ID)throw new Error('SHEET_NOT_CONFIGURED');
     const token=await accessToken(env);
     const values=[new Date().toISOString(),data.businessName,data.legalForm,data.country,data.ice,data.rc,data.activity,data.address,data.city,data.firstName,data.lastName,data.position,data.email,data.phone,data.latitude,data.longitude,data.accuracy,data.gps?'Oui':'Non','Oui','Oui',data.marketing?'Oui':'Non','Merchant/signupp.html','Submitted',data.requestId,data.gps?'https://www.google.com/maps?q='+data.latitude+','+data.longitude:''].map(safe);
     const range=encodeURIComponent("'Feuille 1'!A:Y");
     const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(env.GOOGLE_SHEET_ID)+'/values/'+range+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
     const resp=await fetch(url,{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values:[values]})});
     if(!resp.ok){console.error('Sheets append failed',resp.status,(await resp.text()).slice(0,200));throw new Error('SHEETS_WRITE_FAILED');}
     const reply=await resp.json();return json({ok:true,updatedRange:reply.updates?.updatedRange||null},200,origin);
   }catch(e){const validation=/^(INVALID_PAYLOAD|REQUIRED_FIELDS|INVALID_CONTACT|INVALID_ICE|CONSENT_REQUIRED|INVALID_GPS|PAYLOAD_TOO_LARGE)$/.test(e.message);console.error('Merchant signup failure',e.message);return json({ok:false,error:validation?e.message:'SAVE_UNAVAILABLE'},validation?400:503,origin);}
 }
};
