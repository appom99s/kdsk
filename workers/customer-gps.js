// Cloudflare Worker: GPS consented logging to public GitHub customer.txt.
// Secrets: GITHUB_TOKEN (fine-grained Contents: Read and write, scoped to repository).
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
  const path="customer.txt", branch=env.GITHUB_BRANCH||"main";
  const url="https://api.github.com/repos/"+env.GITHUB_REPO+"/contents/"+path;
  const headers={"Authorization":"Bearer "+env.GITHUB_TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"KADOSK-GPS-Recorder"};
  const enc=s=>btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(""));
  const dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\\s/g,"")),c=>c.charCodeAt(0)));
  const line=[new Date().toISOString(),session,lat.toFixed(6),lon.toFixed(6),Math.round(accuracy)].join("\t")+"\n";
  for(let i=0;i<3;i++){
   const get=await fetch(url+"?ref="+encodeURIComponent(branch),{headers});
   if(!get.ok&&get.status!==404)throw Error("GITHUB_READ_FAILED");
   const old=get.status===404?null:await get.json();
   const current=old?dec(old.content):"timestamp_utc\tsession_id\tlatitude\tlongitude\taccuracy_m\n";
   const put=await fetch(url,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message:"Record consented GPS location",branch,content:enc(current+line),...(old?{sha:old.sha}:{})})});
   if(put.ok)return reply({ok:true},200,origin);
   if(put.status!==409&&put.status!==422)throw Error("GITHUB_WRITE_FAILED");
  }
  throw Error("GITHUB_CONFLICT");
 }catch(e){const invalid=/^(CONSENT_REQUIRED|INVALID_GPS|INVALID_SESSION|INVALID_REQUEST)$/.test(e.message);return reply({ok:false,error:invalid?e.message:"SAVE_UNAVAILABLE"},invalid?400:503,origin);}
}};