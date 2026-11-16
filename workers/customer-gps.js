// Cloudflare Worker: GPS consented logging to public GitHub customer.txt.
// Secrets: GITHUB_TOKEN (fine-grained Contents: Read and write) and GPS_ENCRYPTION_KEY (64 hexadecimal characters = 32 random bytes).
// Variables: GITHUB_REPO=appom99s/kdsk, GITHUB_BRANCH=main, ALLOWED_ORIGIN=https://merchant.kadosk.com
const reply=(data,status,origin)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...(origin?{"Access-Control-Allow-Origin":origin,"Vary":"Origin"}:{})}});
export default {async fetch(request,env){
 const origin=request.headers.get("Origin")||"";
 if(!env.ALLOWED_ORIGIN||origin!==env.ALLOWED_ORIGIN)return reply({ok:false,error:"ORIGIN_NOT_ALLOWED"},403,"");
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600"}});
 if(request.method!=="POST")return reply({ok:false,error:"METHOD_NOT_ALLOWED"},405,origin);
 try{
  if(!env.GITHUB_TOKEN||!env.GITHUB_REPO)throw Error("NOT_CONFIGURED");
  const body=await request.text();if(body.length>2000)throw Error("INVALID_REQUEST");
  const d=JSON.parse(body);
  if(d.consent!==true||d.publicLogConsent!==true||d.mode!=="gps_public")throw Error("CONSENT_REQUIRED");
  const lat=Number(d.latitude),lon=Number(d.longitude),accuracy=Number(d.accuracy);
  if([lat,lon,accuracy].some(v=>!Number.isFinite(v))||Math.abs(lat)>90||Math.abs(lon)>180||accuracy<0||accuracy>100000)throw Error("INVALID_GPS");
  const session=String(d.sessionId||"").slice(0,70);
  if(!/^[a-zA-Z0-9-]{12,70}$/.test(session))throw Error("INVALID_SESSION");
  if(!/^[0-9a-fA-F]{64}$/.test(env.GPS_ENCRYPTION_KEY||""))throw Error("ENCRYPTION_KEY_NOT_CONFIGURED");
  const keyBytes=Uint8Array.from(env.GPS_ENCRYPTION_KEY.match(/.{2}/g),h=>parseInt(h,16));
  const key=await crypto.subtle.importKey("raw",keyBytes,{name:"AES-GCM"},false,["encrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const privatePayload=JSON.stringify({timestamp_utc:new Date().toISOString(),session_id:session,latitude:lat,longitude:lon,accuracy_m:accuracy});
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(privatePayload)));
  const toB64=b=>btoa(Array.from(b,x=>String.fromCharCode(x)).join(""));
  const line=["v1",toB64(iv),toB64(ciphertext)].join("\t")+"\n";
  const path="customer.txt", branch=env.GITHUB_BRANCH||"main";
  const url="https://api.github.com/repos/"+env.GITHUB_REPO+"/contents/"+path;
  const headers={"Authorization":"Bearer "+env.GITHUB_TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"KADOSK-GPS-Recorder"};
  const enc=s=>btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(""));
  const dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\\s/g,"")),c=>c.charCodeAt(0)));

  for(let i=0;i<3;i++){
   const get=await fetch(url+"?ref="+encodeURIComponent(branch),{headers});
   if(!get.ok&&get.status!==404){console.error("GitHub read failed",get.status);throw Error(get.status===401?"GITHUB_AUTH_FAILED":get.status===403?"GITHUB_ACCESS_DENIED":get.status===404?"GITHUB_NOT_FOUND":"GITHUB_READ_FAILED");}
   const old=get.status===404?null:await get.json();
   const current=old?dec(old.content):"version\tiv_base64\tciphertext_base64\n";
   const put=await fetch(url,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message:"Record consented GPS location",branch,content:enc(current+line),...(old?{sha:old.sha}:{})})});
   if(put.ok)return reply({ok:true},200,origin);
   if(put.status!==409&&put.status!==422){console.error("GitHub write failed",put.status);throw Error(put.status===401?"GITHUB_AUTH_FAILED":put.status===403?"GITHUB_ACCESS_DENIED":put.status===404?"GITHUB_NOT_FOUND":"GITHUB_WRITE_FAILED");}
  }
  throw Error("GITHUB_CONFLICT");
 }catch(e){const invalid=/^(CONSENT_REQUIRED|INVALID_GPS|INVALID_SESSION|INVALID_REQUEST)$/.test(e.message);const known=/^(ENCRYPTION_KEY_NOT_CONFIGURED|NOT_CONFIGURED|GITHUB_AUTH_FAILED|GITHUB_ACCESS_DENIED|GITHUB_NOT_FOUND|GITHUB_READ_FAILED|GITHUB_WRITE_FAILED|GITHUB_CONFLICT)$/.test(e.message);console.error("GPS save failure",known||invalid?e.message:"UNEXPECTED_ERROR");return reply({ok:false,error:invalid?e.message:"SAVE_UNAVAILABLE"},invalid?400:503,origin);}
}};