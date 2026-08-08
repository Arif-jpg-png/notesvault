const cfgOK = window.SUPABASE_URL && !window.SUPABASE_URL.startsWith("YOUR_") && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.startsWith("YOUR_");
const sb = cfgOK ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
let notes = [], editing = null;

function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function driveOK(v){try{let u=new URL(v);return u.protocol==="https:"&&(u.hostname==="drive.google.com"||u.hostname==="docs.google.com")}catch{return false}}
function gpOK(v){try{let u=new URL(v);return u.protocol==="https:"&&u.hostname.toLowerCase().includes("gplinks")}catch{return false}}

async function loadNotes(){
 if(!sb){notes=[]; render(); return;}
 const {data,error}=await sb.from("notes").select("id,title,subject,semester,category,description,gplink_url").order("created_at",{ascending:false});
 if(error){console.error(error); alert("Could not load notes. Check Supabase setup/RLS."); return;}
 notes=data||[]; render();
}
function render(){
 const q=$("#search").value.toLowerCase().trim(), cat=$("#category").value;
 const list=notes.filter(n=>(!cat||n.category===cat)&&`${n.title} ${n.subject} ${n.semester} ${n.description}`.toLowerCase().includes(q));
 $("#total").textContent=notes.length; $("#subjects").textContent=new Set(notes.map(n=>n.subject.toLowerCase())).size;
 $("#grid").innerHTML=list.map(n=>`<article class="card"><span class="tag">${safe(n.category)}</span><h3>${safe(n.title)}</h3><div class="meta">${safe(n.subject)}${n.semester?" · "+safe(n.semester):""}</div><p class="desc">${safe(n.description||"Study notes")}</p><a class="download" href="${safe(n.gplink_url)}" target="_blank" rel="noopener noreferrer">Download / Open Notes ↗</a></article>`).join("");
 $("#empty").classList.toggle("hidden",list.length>0);
}
function modal(show){$("#modal").classList.toggle("hidden",!show);document.body.style.overflow=show?"hidden":""}
function msg(t){$("#authMsg").textContent=t}
async function session(){
 if(!sb)return;
 const {data:{session}}=await sb.auth.getSession();
 if(session){$("#authBox").classList.add("hidden");$("#dashboard").classList.remove("hidden");loadAdmin();}
 else{$("#authBox").classList.remove("hidden");$("#dashboard").classList.add("hidden")}
}
async function login(){
 if(!sb){msg("First configure config.js with Supabase URL and anon/publishable key.");return}
 const {error}=await sb.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});
 msg(error?error.message:"Signed in."); if(!error)session();
}
async function loadAdmin(){
 const {data,error}=await sb.from("notes").select("id,title,subject,category,semester,description,drive_url,gplink_url").order("created_at",{ascending:false});
 if(error){console.error(error);return}
 $("#adminList").innerHTML=(data||[]).map(n=>`<div class="admin-item"><div><b>${safe(n.title)}</b><small>${safe(n.subject)} · ${safe(n.category)}</small></div><div class="admin-actions"><button class="ghost edit" data-id="${n.id}">Edit</button><button class="ghost danger del" data-id="${n.id}">Delete</button></div></div>`).join("")||'<p class="muted">No notes yet.</p>';
}
async function saveNote(e){
 e.preventDefault(); if(!sb)return;
 const payload={title:$("#title").value.trim(),subject:$("#subject").value.trim(),semester:$("#semester").value.trim(),category:$("#noteCategory").value,description:$("#description").value.trim(),drive_url:$("#driveUrl").value.trim(),gplink_url:$("#gplinkUrl").value.trim()};
 if(!driveOK(payload.drive_url)){alert("Drive URL must be a Google Drive/Docs HTTPS URL.");return}
 if(!gpOK(payload.gplink_url)){alert("GPLinks URL must be a valid HTTPS GPLinks URL.");return}
 let res=editing?await sb.from("notes").update(payload).eq("id",editing):await sb.from("notes").insert(payload);
 if(res.error){alert(res.error.message);return}
 resetForm(); await loadNotes(); await loadAdmin();
}
function resetForm(){editing=null;$("#noteForm").reset();$("#noteId").value="";$("#saveNote").textContent="Save Note";$("#cancelEdit").classList.add("hidden")}
$("#adminList").addEventListener("click",async e=>{
 const id=e.target.dataset.id;if(!id)return;
 if(e.target.classList.contains("del")){if(!confirm("Delete this note?"))return;const {error}=await sb.from("notes").delete().eq("id",id);if(error)alert(error.message);await loadNotes();await loadAdmin();}
 if(e.target.classList.contains("edit")){const {data,error}=await sb.from("notes").select("*").eq("id",id).single();if(error){alert(error.message);return}editing=id;["title","subject","semester","description","driveUrl","gplinkUrl"].forEach((k,i)=>$("#"+k).value=data[({title:"title",subject:"subject",semester:"semester",description:"description",driveUrl:"drive_url",gplinkUrl:"gplink_url"}[k])]);$("#noteCategory").value=data.category;$("#saveNote").textContent="Update Note";$("#cancelEdit").classList.remove("hidden");}
});
$("#adminBtn").onclick=()=>{modal(true);session()};$("#close").onclick=()=>modal(false);$("#login").onclick=login;$("#logout").onclick=async()=>{await sb.auth.signOut();session()};$("#noteForm").onsubmit=saveNote;$("#cancelEdit").onclick=resetForm;$("#search").oninput=render;$("#category").onchange=render;$("#refresh").onclick=loadNotes;$("#theme").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("nvtheme",document.body.classList.contains("dark")?"dark":"light")};
if(localStorage.getItem("nvtheme")==="dark")document.body.classList.add("dark");$("#year").textContent=new Date().getFullYear();
if(sb) sb.auth.onAuthStateChange(()=>session()); loadNotes();