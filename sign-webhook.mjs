import { createHmac } from "crypto";
import { readFileSync } from "fs";
const [port, conv, caller] = [process.argv[2], process.argv[3], process.argv[4]];
const env = readFileSync("./.env.local","utf8");
const get=(k)=>(env.match(new RegExp(`^${k}=(.*)$`,"m"))?.[1]??"").trim();
const body = JSON.stringify({ type:"post_call_transcription", data:{ agent_id:get("NEXT_PUBLIC_ELEVENLABS_AGENT_ID"), conversation_id:conv,
  transcript:[{role:"agent",message:"Hi, this is Nestriq."},{role:"user",message:`Hi, I'm ${caller}, I want to sell fast.`}],
  analysis:{transcript_summary:"Motivated seller, wants a quick sale."}, metadata:{call_duration_secs:55} }});
const t=Math.floor(Date.now()/1000);
const v0=createHmac("sha256",get("ELEVENLABS_WEBHOOK_SECRET")).update(`${t}.${body}`).digest("hex");
const r=await fetch(`http://localhost:${port}/api/webhooks/elevenlabs`,{method:"POST",headers:{"Content-Type":"application/json","ElevenLabs-Signature":`t=${t},v0=${v0}`},body});
console.log("webhook ->", r.status, await r.text());
