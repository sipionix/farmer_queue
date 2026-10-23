(() => {
    const $ = id => document.getElementById(id);
    const cfg = window.FQ_CONFIG || {};
    const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR-PROJECT") && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
    let sb=null, user=null, profile=null, authMode="signin";
    const today = new Date(); today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
    $("bookingDate").min=today.toISOString().slice(0,10);
    const slots = ["09:00–10:00","10:00–11:00","11:00–12:00","12:00–13:00","14:00–15:00","15:00–16:00"];
    function toast(s){$("toast").textContent=s;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),3500)}
    function msg(id,s,err=false){$(id).textContent=s;$(id).classList.toggle("error",err)}
    function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
    function showView(name){document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));$(name+"View").classList.remove("hidden");document.querySelectorAll(".navbtn").forEach(x=>x.classList.toggle("active",x.dataset.view===name));if(name==="history")loadHistory();if(name==="staff")loadStaff()}
    function dateLabel(s){return new Date(s+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
    function isConfigured(){if(!configured||!window.supabase){$("setupNotice").classList.remove("hidden");$("setupNotice").innerHTML="<b>Setup needed:</b> Open <code>config.js</code> and add your Supabase project URL and publishable/anon key. Then run the SQL in <code>supabase/schema.sql</code>.";return false}return true}
    async function init(){if(!isConfigured())return;sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);const {data:{session}}=await sb.auth.getSession();if(session)await onLogin(session.user);sb.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>session?onLogin(session.user):onLogout(),0)})}
    async function onLogin(u){user=u;const {data:p}=await sb.from("profiles").select("full_name,role").eq("id",u.id).maybeSingle();profile=p||{full_name:u.user_metadata?.full_name||u.email?.split("@")[0]||"Farmer",role:"farmer"};$("authView").classList.add("hidden");$("appView").classList.remove("hidden");$("userArea").innerHTML=`<span>👋 ${esc(profile.full_name)}</span><button class="btn secondary" id="signOut">Sign out</button>`;$("signOut").onclick=()=>sb.auth.signOut();$("welcomeTitle").textContent="Welcome, "+profile.full_name+"!";$("farmerName").value=profile.full_name||"";document.querySelectorAll(".staff-only").forEach(x=>x.classList.toggle("hidden",profile.role!=="staff"));showView("book");}
    function onLogout(){user=null;profile=null;$("authView").classList.remove("hidden");$("appView").classList.add("hidden");$("userArea").innerHTML=""}
    document.querySelectorAll("[data-auth]").forEach(b=>b.addEventListener("click",()=>{authMode=b.dataset.auth;document.querySelectorAll("[data-auth]").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".signup-only").forEach(x=>x.classList.toggle("hidden",authMode!=="signup"));$("authTitle").textContent=authMode==="signup"?"Create your account":"Welcome back";$("authSubtitle").textContent=authMode==="signup"?"Register to start booking procurement slots.":"Sign in to manage your farmer bookings.";$("authSubmit").textContent=authMode==="signup"?"Create account →":"Sign in securely →";$("authPassword").autocomplete=authMode==="signup"?"new-password":"current-password";msg("authMessage","")}));
    $("authForm").addEventListener("submit",async e=>{e.preventDefault();if(!sb)return;const email=$("authEmail").value.trim(),password=$("authPassword").value;msg("authMessage","Please wait…");try{if(authMode==="signup"){const name=$("authName").value.trim();if(!name)throw Error("Please enter your full name.");const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)throw error;if(data.session){await sb.from("profiles").upsert({id:data.user.id,full_name:name},{onConflict:"id"});msg("authMessage","Account created! Signing you in…")}else msg("authMessage","Account created. Check your email to confirm, then sign in.")}else{const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error}}catch(err){msg("authMessage",err.message||"Could not sign in.",true)}});
    $("bookingDate").addEventListener("change",renderSlots);
    async function renderSlots(){const date=$("bookingDate").value,centre=$("centre").value;const sel=$("slot");sel.innerHTML='<option value="">Loading availability…</option>';if(!date||!centre){sel.innerHTML='<option value="">Choose date and centre first</option>';return}if(!sb){sel.innerHTML='<option value="">Configure Supabase first</option>';return}try{const {data,error}=await sb.from("slot_capacity").select("slot_time,capacity").eq("booking_date",date).eq("centre",centre);if(error)throw error;const capacities=new Map((data||[]).map(x=>[x.slot_time,x.capacity]));const {data:used,error:e2}=await sb.from("bookings").select("slot_time").eq("booking_date",date).eq("centre",centre).not("status","in",'("cancelled","no-show")');if(e2)throw e2;const counts={};(used||[]).forEach(x=>counts[x.slot_time]=(counts[x.slot_time]||0)+1);sel.innerHTML='<option value="">Select available slot</option>';for(const s of slots){const cap=capacities.has(s)?capacities.get(s):[3,5,2,4,3,2][slots.indexOf(s)];const left=cap-(counts[s]||0);const opt=document.createElement("option");opt.value=s;opt.textContent=`${s} • ${Math.max(0,left)} seats left`;opt.disabled=left<=0;sel.appendChild(opt)}}catch(err){sel.innerHTML='<option value="">Could not load slots</option>';msg("bookingMessage",err.message,true)}}
    $("bookingForm").addEventListener("submit",async e=>{e.preventDefault();if(!user)return;msg("bookingMessage","Confirming slot…");const payload={p_farmer_name:$("farmerName").value.trim(),p_phone:$("phone").value.trim(),p_centre:$("centre").value,p_produce:$("produce").value,p_booking_date:$("bookingDate").value,p_slot_time:$("slot").value};try{const {data,error}=await sb.rpc("create_booking",payload);if(error)throw error;const b=Array.isArray(data)?data[0]:data;msg("bookingMessage","Booking confirmed! Your token is "+b.token);$("trackToken").value=b.token;renderSlots();showView("history");toast("Booking confirmed: "+b.token)}catch(err){msg("bookingMessage",err.message||"Booking failed.",true);renderSlots()}});
    function bookingHTML(b){const status=(b.status||"pending").toLowerCase();return `<article class="booking-card"><div><span class="token">${esc(b.token)}</span><h3>${esc(b.produce)} · ${esc(b.centre)}</h3><p>📅 ${dateLabel(b.booking_date)} &nbsp; · &nbsp; 🕒 ${esc(b.slot_time)}</p><p>Farmer: ${esc(b.farmer_name)} · ${esc(b.phone)}</p><span class="badge ${esc(status)}">${esc(status)}</span></div><div class="card-actions"><button class="btn secondary" data-receipt="${esc(b.id)}">Download receipt</button>${profile?.role==="staff"?`<select data-status="${esc(b.id)}"><option ${status==="booked"?"selected":""}>booked</option><option ${status==="inspecting"?"selected":""}>inspecting</option><option ${status==="completed"?"selected":""}>completed</option><option ${status==="cancelled"?"selected":""}>cancelled</option><option ${status==="no-show"?"selected":""}>no-show</option></select>`:""}</div></article>`}
    async function loadHistory(){if(!user)return;const el=$("historyList");el.innerHTML='<p class="muted">Loading…</p>';const {data,error}=await sb.from("bookings").select("*").eq("user_id",user.id).order("created_at",{ascending:false});if(error){el.innerHTML=`<p class="message error">${esc(error.message)}</p>`;return}el.innerHTML=data.length?data.map(bookingHTML).join(""):'<div class="empty">🌾<h3>No bookings yet</h3><p>Your future appointments will appear here.</p></div>';bindCardActions(data)}
    $("refreshHistory").onclick=loadHistory;$("refreshStaff").onclick=loadStaff;
    $("trackForm").addEventListener("submit",async e=>{e.preventDefault();const token=$("trackToken").value.trim().toUpperCase();const {data,error}=await sb.from("bookings").select("*").eq("token",token).maybeSingle();if(error){$("trackResult").innerHTML=`<p class="message error">${esc(error.message)}</p>`;return}if(!data){$("trackResult").innerHTML='<div class="panel empty">No booking found for that token.</div>';return}$("trackResult").innerHTML=`<div class="panel receipt"><span class="eyebrow">BOOKING FOUND</span><h2>${esc(data.token)}</h2>${bookingHTML(data)}<p class="muted">Keep this token for reference. Show your QR/receipt to centre staff.</p><img class="qr" alt="Booking QR code" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.token)}"><br><button class="btn secondary" data-receipt="${esc(data.id)}">Download receipt</button></div>`;bindCardActions([data])});
    let staffRows=[];
    async function loadStaff(){
        if(profile?.role!=="staff")return;
        const list=$("staffList");list.innerHTML='<p class="muted">Loading appointments…</p>';
        const {data,error}=await sb.from("bookings").select("*").order("booking_date",{ascending:true}).order("slot_time",{ascending:true}).limit(1000);
        if(error){list.innerHTML=`<p class="message error">${esc(error.message)}</p>`;return}
        staffRows=data||[];
        const todayKey=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
        const todayRows=staffRows.filter(x=>x.booking_date===todayKey);
        $("staffStats").innerHTML=[
            ["Today's appointments",todayRows.length,"date"],
            ["Waiting / inspecting",staffRows.filter(x=>["booked","inspecting"].includes(x.status)).length,"active"],
            ["Completed",staffRows.filter(x=>x.status==="completed").length,"done"],
            ["Cancelled / no-show",staffRows.filter(x=>["cancelled","no-show"].includes(x.status)).length,"closed"]
        ].map(([a,b,c])=>`<div class="stat stat-${c}"><span>${a}</span><b>${b}</b></div>`).join("");
        renderStaffRows();
    }
    function renderStaffRows(){
        const q=( $("staffSearch")?.value||"" ).trim().toLowerCase();
        const centre=$("staffCentre")?.value||"", status=$("staffStatus")?.value||"", date=$("staffDate")?.value||"";
        const rows=staffRows.filter(b=>{
            const hay=[b.token,b.farmer_name,b.phone,b.produce,b.centre].join(" ").toLowerCase();
            return (!q||hay.includes(q))&&(!centre||b.centre===centre)&&(!status||b.status===status)&&(!date||b.booking_date===date);
        });
        $("staffResultCount").textContent=`(${rows.length})`;
        const list=$("staffList");
        list.innerHTML=rows.length?rows.map(b=>{
            const st=(b.status||"booked").toLowerCase();
            return `<article class="staff-booking"><div class="staff-booking-main"><div class="staff-token-line"><span class="token">${esc(b.token)}</span><span class="badge ${esc(st)}">${esc(st)}</span></div><h3>${esc(b.farmer_name)}</h3><p>${esc(b.produce)} <span class="muted">·</span> ${esc(b.centre)}</p><div class="staff-meta"><span>▦ ${dateLabel(b.booking_date)}</span><span>◷ ${esc(b.slot_time)}</span><span>☎ ${esc(b.phone)}</span></div></div><div class="staff-booking-actions"><label>Update status<select data-status="${esc(b.id)}"><option value="booked" ${st==="booked"?"selected":""}>Booked</option><option value="inspecting" ${st==="inspecting"?"selected":""}>Inspecting</option><option value="completed" ${st==="completed"?"selected":""}>Completed</option><option value="cancelled" ${st==="cancelled"?"selected":""}>Cancelled</option><option value="no-show" ${st==="no-show"?"selected":""}>No-show</option></select></label><button class="btn secondary" data-receipt="${esc(b.id)}">Receipt</button></div></article>`;
        }).join(""):'<div class="empty"><h3>No matching appointments</h3><p>Try changing or clearing your filters.</p></div>';
        bindCardActions(rows);
    }
    function bindCardActions(rows){
        document.querySelectorAll("[data-receipt]").forEach(btn=>btn.onclick=()=>{const b=rows.find(x=>x.id===btn.dataset.receipt);if(b)downloadReceipt(b)});
        document.querySelectorAll("[data-status]").forEach(sel=>sel.onchange=async()=>{
            const next=sel.value, id=sel.dataset.status;sel.disabled=true;
            const {error}=await sb.from("bookings").update({status:next}).eq("id",id);
            sel.disabled=false;
            if(error){toast("Could not update status: "+error.message);await loadStaff();return}
            const row=staffRows.find(x=>x.id===id);if(row)row.status=next;
            toast("Booking status updated");renderStaffRows();
        });
    }
    function downloadReceipt(b){const html=`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(b.token)}</title><style>body{font:16px Arial;padding:35px;color:#183326}main{max-width:650px;margin:auto;border:2px solid #17613c;padding:28px;border-radius:15px}h1{color:#17613c}dt{font-weight:bold;margin-top:14px}dd{margin:4px 0}img{margin-top:20px;width:150px}small{color:#667}</style></head><body><main><h1>🌾 Farmer Queue</h1><h2>Procurement Appointment Receipt</h2><p>Keep this receipt and present your token at the centre.</p><dl><dt>Booking token</dt><dd>${esc(b.token)}</dd><dt>Farmer</dt><dd>${esc(b.farmer_name)}</dd><dt>Mobile</dt><dd>${esc(b.phone)}</dd><dt>Centre</dt><dd>${esc(b.centre)}</dd><dt>Produce</dt><dd>${esc(b.produce)}</dd><dt>Date</dt><dd>${dateLabel(b.booking_date)}</dd><dt>Time slot</dt><dd>${esc(b.slot_time)}</dd><dt>Status</dt><dd>${esc(b.status)}</dd></dl><img alt="QR token" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(b.token)}"><p><small>Generated digitally by Farmer Queue.</small></p><button onclick="window.print()">Print / Save as PDF</button></main></body></html>`;const blob=new Blob([html],{type:"text/html"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Farmer-Queue-${b.token}.html`;a.click();URL.revokeObjectURL(a.href);toast("Receipt downloaded. Open it and choose Print → Save as PDF.")}
    document.querySelectorAll(".navbtn").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
    ["staffSearch","staffCentre","staffStatus","staffDate"].forEach(id=>$(id)?.addEventListener(id==="staffSearch"?"input":"change",renderStaffRows));
    $("clearStaffFilters")?.addEventListener("click",()=>{["staffSearch","staffCentre","staffStatus","staffDate"].forEach(id=>$(id).value="");renderStaffRows()});
    $("centre").addEventListener("change",renderSlots);
    init();
})();