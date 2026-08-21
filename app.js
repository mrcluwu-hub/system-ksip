const DBKEY="ksip_rp_db_v2";
let currentOfficer=null;

const initialDB={
  officers:[
    {id:1,login:"admin",password:"admin123",name:"Administrator Systemu",badge:"0001",rank:"Nadkomisarz",role:"admin",active:true},
    {id:2,login:"patrol01",password:"patrol123",name:"Jan Nowak",badge:"2417",rank:"Sierżant sztabowy",role:"officer",active:true}
  ],
  citizens:[
    {id:1,first_name:"Jan",last_name:"Kowalski",pesel:"99051212345",dob:"1999-05-12",roblox_nick:"Player123",roblox_user_id:"123456789",license_status:"Aktywne",penalty_points:6,address:"Warszawa, Śródmieście",status:"Brak zastrzeżeń",notes:"Rekord demonstracyjny systemu RP.",created_at:new Date().toISOString()}
  ],
  vehicles:[
    {id:1,citizen_id:1,plate:"WX 1234A",make:"BMW",model:"320i",color:"Czarny",vin:"RP-WX-00001",status:"Zarejestrowany",created_at:new Date().toISOString()}
  ],
  fines:[
    {id:1,citizen_id:1,officer_id:2,amount:300,points:6,reason:"Przekroczenie dopuszczalnej prędkości",legal_basis:"Taryfikator RP",created_at:new Date().toISOString()}
  ],
  wanted:[],
  notes:[
    {id:1,citizen_id:1,officer_id:2,title:"Kontrola drogowa",content:"Wylegitymowano kierującego. Kontrola zakończona bez dalszych czynności.",category:"INTERWENCJA",created_at:new Date().toISOString()}
  ],
  audit:[]
};

function loadDB(){const raw=localStorage.getItem(DBKEY);if(!raw){localStorage.setItem(DBKEY,JSON.stringify(initialDB));return structuredClone(initialDB)}try{return JSON.parse(raw)}catch{return structuredClone(initialDB)}}
function saveDB(){localStorage.setItem(DBKEY,JSON.stringify(db))}
let db=loadDB();

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const now=()=>new Date().toISOString();
const fmt=d=>new Date(d).toLocaleString("pl-PL");
const nextId=arr=>arr.length?Math.max(...arr.map(x=>x.id))+1:1;
const officerName=id=>db.officers.find(o=>o.id===id)?.name||"System";
function audit(action,details){db.audit.unshift({id:nextId(db.audit),officer_id:currentOfficer?.id||null,action,details,created_at:now()});saveDB()}

$("#loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  const login=$("#login").value.trim(),password=$("#password").value;
  const officer=db.officers.find(o=>o.login===login&&o.password===password&&o.active);
  if(!officer){$("#loginError").textContent="Nieprawidłowy identyfikator lub hasło.";return}
  currentOfficer=officer;sessionStorage.setItem("ksip_session",String(officer.id));audit("LOGIN","Logowanie do systemu");showApp();
});
$("#logoutBtn").onclick=()=>{audit("LOGOUT","Wylogowanie z systemu");sessionStorage.removeItem("ksip_session");location.reload()};

function restoreSession(){const id=Number(sessionStorage.getItem("ksip_session"));if(id){const o=db.officers.find(x=>x.id===id&&x.active);if(o){currentOfficer=o;showApp();return}}$("#loginView").classList.remove("hidden")}
function showApp(){
  $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");
  $("#officerName").textContent=currentOfficer.name;$("#officerMeta").textContent=`${currentOfficer.rank} • nr ${currentOfficer.badge}`;
  $("#adminNav").classList.toggle("hidden",currentOfficer.role!=="admin");
  renderPage("dashboard");
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>renderPage(b.dataset.page));
function setNav(page){document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page))}
function renderPage(page){
  setNav(page);$("#pageTitle").textContent=({dashboard:"Pulpit operacyjny",citizens:"Kartoteka osób",vehicles:"Rejestr pojazdów",wanted:"Poszukiwania",reports:"Notatki i wpisy",admin:"Administracja systemu"}[page]||"KSiP");
  ({dashboard,citizens,vehicles,wanted,reports,admin}[page]||dashboard)();
}
function dashboard(){
  const activeWanted=db.wanted.filter(x=>x.status==="AKTYWNE").length;
  const today=new Date().toDateString();
  const finesToday=db.fines.filter(x=>new Date(x.created_at).toDateString()===today).length;
  $("#content").innerHTML=`
  <div class="notice">Tryb GitHub Pages: dane są przechowywane lokalnie w tej przeglądarce. To wygodne do RP i testów, ale nie jest wspólną bazą dla wszystkich urządzeń.</div>
  <div class="cards">
    <div class="card"><div class="label">OSOBY W KARTOTECE</div><div class="num">${db.citizens.length}</div><div class="sub">rekordy aktywne</div></div>
    <div class="card"><div class="label">POJAZDY</div><div class="num">${db.vehicles.length}</div><div class="sub">w rejestrze</div></div>
    <div class="card"><div class="label">AKTYWNE POSZUKIWANIA</div><div class="num">${activeWanted}</div><div class="sub">wymagają uwagi</div></div>
    <div class="card"><div class="label">MANDATY DZISIAJ</div><div class="num">${finesToday}</div><div class="sub">zarejestrowane wpisy</div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><div><div class="kicker">WYSZUKIWARKA CENTRALNA</div><h3>Sprawdzenie osoby</h3></div></div>
    <div class="search-grid"><input id="globalSearch" placeholder="Imię, nazwisko, PESEL/ID, nick Roblox, UserId..."><button onclick="globalLookup()">WYSZUKAJ</button></div>
    <div id="globalResults" style="margin-top:14px"></div>
  </div>`;
}
function matchCitizen(c,q){q=q.toLowerCase();return [c.first_name,c.last_name,c.pesel,c.roblox_nick,c.roblox_user_id].some(v=>String(v||"").toLowerCase().includes(q))}
function globalLookup(){const q=$("#globalSearch").value.trim();const rows=q?db.citizens.filter(c=>matchCitizen(c,q)):[];$("#globalResults").innerHTML=rows.length?citizenTable(rows):`<div class="empty">Brak wyników wyszukiwania.</div>`}
function citizenTable(rows){return `<table><thead><tr><th>Osoba</th><th>PESEL / ID</th><th>Roblox</th><th>Status</th><th>Prawo jazdy</th><th>Punkty</th><th></th></tr></thead><tbody>${rows.map(c=>`<tr><td><b>${esc(c.first_name)} ${esc(c.last_name)}</b><div class="small">${esc(c.address||"-")}</div></td><td>${esc(c.pesel)}</td><td>${esc(c.roblox_nick||"-")}<div class="small">${esc(c.roblox_user_id||"-")}</div></td><td><span class="badge b-gray">${esc(c.status||"Brak danych")}</span></td><td><span class="badge ${c.license_status==="Aktywne"?"b-green":"b-red"}">${esc(c.license_status)}</span></td><td>${c.penalty_points||0}</td><td><button class="action" onclick="openCitizen(${c.id})">OTWÓRZ</button></td></tr>`).join("")}</tbody></table>`}
function citizens(){
  $("#content").innerHTML=`<div class="panel"><div class="toolbar"><input id="citizenSearch" placeholder="Szukaj w kartotece..." oninput="searchCitizens()"><div class="spacer"></div><button onclick="newCitizen()">+ NOWA OSOBA</button></div><div id="citizenRows">${citizenTable(db.citizens)}</div></div>`;
}
function searchCitizens(){const q=$("#citizenSearch").value.trim();$("#citizenRows").innerHTML=citizenTable(q?db.citizens.filter(c=>matchCitizen(c,q)):db.citizens)}
function openModal(html){$("#modalBody").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
function newCitizen(){
  openModal(`<div class="kicker">NOWY REKORD</div><h2>Dodanie osoby do kartoteki</h2><form id="citizenForm" class="form-grid">
  <label>IMIĘ<input name="first_name" required></label><label>NAZWISKO<input name="last_name" required></label>
  <label>PESEL / ID RP<input name="pesel" required></label><label>DATA URODZENIA<input type="date" name="dob"></label>
  <label>NICK ROBLOX<input name="roblox_nick"></label><label>ROBLOX USER ID<input name="roblox_user_id"></label>
  <label>ADRES / MIEJSCOWOŚĆ<input name="address"></label><label>STATUS<select name="status"><option>Brak zastrzeżeń</option><option>Do weryfikacji</option><option>Objęty czynnościami</option></select></label>
  <label>PRAWO JAZDY<select name="license_status"><option>Aktywne</option><option>Zatrzymane</option><option>Brak</option></select></label><label>PUNKTY KARNE<input type="number" min="0" name="penalty_points" value="0"></label>
  <label class="full">UWAGI<textarea name="notes"></textarea></label><div class="full form-actions"><button type="button" class="ghost" onclick="closeModal()">ANULUJ</button><button>ZAPISZ REKORD</button></div></form>`);
  $("#citizenForm").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const c={id:nextId(db.citizens),...d,penalty_points:Number(d.penalty_points)||0,created_at:now()};db.citizens.push(c);saveDB();audit("CREATE_CITIZEN",`Dodano ${c.first_name} ${c.last_name}`);closeModal();citizens()}
}
function citizenHistory(c){
  let items=[];
  db.fines.filter(x=>x.citizen_id===c.id).forEach(x=>items.push({date:x.created_at,html:`<div class="entry"><b>MANDAT • ${x.amount} PLN • ${x.points} pkt</b>${esc(x.reason)}${x.legal_basis?`<div class="small">${esc(x.legal_basis)}</div>`:""}<small>${fmt(x.created_at)} • ${esc(officerName(x.officer_id))}</small></div>`}));
  db.wanted.filter(x=>x.citizen_id===c.id).forEach(x=>items.push({date:x.created_at,html:`<div class="entry"><b>POSZUKIWANIE • ${esc(x.level)} • ${esc(x.status)}</b>${esc(x.reason)}<small>${fmt(x.created_at)} • ${esc(officerName(x.officer_id))}</small>${x.status==="AKTYWNE"?`<div style="margin-top:8px"><button class="action danger" onclick="closeWanted(${x.id},${c.id})">ZAKOŃCZ POSZUKIWANIE</button></div>`:""}</div>`}));
  db.notes.filter(x=>x.citizen_id===c.id).forEach(x=>items.push({date:x.created_at,html:`<div class="entry"><b>${esc(x.category||"NOTATKA")} • ${esc(x.title)}</b>${esc(x.content)}<small>${fmt(x.created_at)} • ${esc(officerName(x.officer_id))}</small></div>`}));
  db.vehicles.filter(x=>x.citizen_id===c.id).forEach(x=>items.push({date:x.created_at,html:`<div class="entry"><b>POJAZD • ${esc(x.plate)}</b>${esc(x.make)} ${esc(x.model)} • ${esc(x.color||"-")} • VIN: ${esc(x.vin||"-")}<small>${fmt(x.created_at)}</small></div>`}));
  items.sort((a,b)=>new Date(b.date)-new Date(a.date));return items.length?items.map(x=>x.html).join(""):`<div class="empty">Brak historii.</div>`;
}
function openCitizen(id){
  const c=db.citizens.find(x=>x.id===id);if(!c)return;
  const active=db.wanted.filter(x=>x.citizen_id===id&&x.status==="AKTYWNE");
  openModal(`${active.length?`<div class="alert"><b>UWAGA — AKTYWNE POSZUKIWANIE</b><br>${active.map(x=>esc(x.reason)).join("<br>")}</div>`:""}
  <div class="profile-top"><div><div class="kicker">KARTA OSOBY • REKORD ${c.id}</div><h2>${esc(c.first_name)} ${esc(c.last_name)}</h2><div class="profile-meta">
  PESEL / ID: <b>${esc(c.pesel)}</b><br>Data urodzenia: ${esc(c.dob||"-")}<br>Adres: ${esc(c.address||"-")}<br>Roblox: ${esc(c.roblox_nick||"-")} • UserId: ${esc(c.roblox_user_id||"-")}
  </div></div><div class="stat-row"><span class="badge ${c.license_status==="Aktywne"?"b-green":"b-red"}">PJ: ${esc(c.license_status)}</span><span class="badge b-yellow">${c.penalty_points||0} PKT</span><span class="badge b-gray">${esc(c.status||"-")}</span></div></div>
  <div class="tabs"><button onclick="showSection(${c.id},'history')">HISTORIA</button><button onclick="showSection(${c.id},'vehicle')">+ POJAZD</button><button onclick="showSection(${c.id},'fine')">+ MANDAT</button><button onclick="showSection(${c.id},'wanted')">+ POSZUKIWANIE</button><button onclick="showSection(${c.id},'note')">+ NOTATKA</button></div>
  <div id="citizenSection">${citizenHistory(c)}</div>`);
}
function showSection(id,type){const c=db.citizens.find(x=>x.id===id),box=$("#citizenSection");if(type==="history"){box.innerHTML=citizenHistory(c);return}
 if(type==="vehicle")box.innerHTML=`<form onsubmit="submitVehicle(event,${id})" class="form-grid"><label>TABLICA<input name="plate" required></label><label>MARKA<input name="make" required></label><label>MODEL<input name="model" required></label><label>KOLOR<input name="color"></label><label>VIN / ID RP<input name="vin"></label><label>STATUS<select name="status"><option>Zarejestrowany</option><option>Poszukiwany</option><option>Wyrejestrowany</option></select></label><div class="full form-actions"><button>DODAJ POJAZD</button></div></form>`;
 if(type==="fine")box.innerHTML=`<form onsubmit="submitFine(event,${id})" class="form-grid"><label>KWOTA PLN<input type="number" min="1" name="amount" required></label><label>PUNKTY KARNE<input type="number" min="0" name="points" value="0"></label><label class="full">POWÓD<textarea name="reason" required></textarea></label><label class="full">PODSTAWA / TARYFIKATOR RP<input name="legal_basis"></label><div class="full form-actions"><button>NAŁÓŻ MANDAT</button></div></form>`;
 if(type==="wanted")box.innerHTML=`<form onsubmit="submitWanted(event,${id})" class="form-grid"><label>PRIORYTET<select name="level"><option>ZWYKŁE</option><option>PILNE</option><option>WYSOKIEGO RYZYKA</option></select></label><label class="full">PODSTAWA POSZUKIWANIA<textarea name="reason" required></textarea></label><div class="full form-actions"><button class="danger">DODAJ POSZUKIWANIE</button></div></form>`;
 if(type==="note")box.innerHTML=`<form onsubmit="submitNote(event,${id})" class="form-grid"><label>KATEGORIA<select name="category"><option>INTERWENCJA</option><option>LEGITYMOWANIE</option><option>NOTATKA SŁUŻBOWA</option><option>ZATRZYMANIE</option><option>INNE</option></select></label><label>TYTUŁ<input name="title" required></label><label class="full">TREŚĆ<textarea name="content" required></textarea></label><div class="full form-actions"><button>DODAJ WPIS</button></div></form>`;
}
function formData(e){return Object.fromEntries(new FormData(e.target))}
function submitVehicle(e,id){e.preventDefault();const d=formData(e);db.vehicles.push({id:nextId(db.vehicles),citizen_id:id,...d,created_at:now()});saveDB();audit("CREATE_VEHICLE",`Dodano pojazd ${d.plate}`);openCitizen(id)}
function submitFine(e,id){e.preventDefault();const d=formData(e),pts=Number(d.points)||0;db.fines.push({id:nextId(db.fines),citizen_id:id,officer_id:currentOfficer.id,amount:Number(d.amount),points:pts,reason:d.reason,legal_basis:d.legal_basis,created_at:now()});const c=db.citizens.find(x=>x.id===id);c.penalty_points=(c.penalty_points||0)+pts;saveDB();audit("CREATE_FINE",`Mandat ${d.amount} PLN`);openCitizen(id)}
function submitWanted(e,id){e.preventDefault();const d=formData(e);db.wanted.push({id:nextId(db.wanted),citizen_id:id,officer_id:currentOfficer.id,level:d.level,reason:d.reason,status:"AKTYWNE",created_at:now()});saveDB();audit("CREATE_WANTED",d.reason);openCitizen(id)}
function submitNote(e,id){e.preventDefault();const d=formData(e);db.notes.push({id:nextId(db.notes),citizen_id:id,officer_id:currentOfficer.id,...d,created_at:now()});saveDB();audit("CREATE_NOTE",d.title);openCitizen(id)}
function closeWanted(wid,cid){const w=db.wanted.find(x=>x.id===wid);if(w)w.status="ZAKOŃCZONE";saveDB();audit("CLOSE_WANTED",`ID ${wid}`);openCitizen(cid)}
function vehicleTable(rows){return `<table><thead><tr><th>Tablica</th><th>Pojazd</th><th>VIN / ID</th><th>Właściciel</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(v=>{const c=db.citizens.find(x=>x.id===v.citizen_id);return `<tr><td><b>${esc(v.plate)}</b></td><td>${esc(v.make)} ${esc(v.model)}<div class="small">${esc(v.color||"-")}</div></td><td>${esc(v.vin||"-")}</td><td>${c?esc(c.first_name+" "+c.last_name):"-"}</td><td><span class="badge b-blue">${esc(v.status)}</span></td><td><button class="action" onclick="openCitizen(${v.citizen_id})">WŁAŚCICIEL</button></td></tr>`}).join("")}</tbody></table>`}
function vehicles(){$("#content").innerHTML=`<div class="panel"><div class="toolbar"><input id="vehSearch" placeholder="Tablica, marka, model, VIN..." oninput="searchVehicles()"></div><div id="vehRows">${vehicleTable(db.vehicles)}</div></div>`}
function searchVehicles(){const q=$("#vehSearch").value.toLowerCase();const rows=db.vehicles.filter(v=>[v.plate,v.make,v.model,v.vin,v.color].some(x=>String(x||"").toLowerCase().includes(q)));$("#vehRows").innerHTML=vehicleTable(rows)}
function wanted(){const rows=db.wanted.slice().sort((a,b)=>(a.status==="AKTYWNE"?-1:1));$("#content").innerHTML=`<div class="panel">${rows.length?`<table><thead><tr><th>Osoba</th><th>Priorytet</th><th>Powód</th><th>Status</th><th>Wprowadzono</th><th></th></tr></thead><tbody>${rows.map(w=>{const c=db.citizens.find(x=>x.id===w.citizen_id);return `<tr><td><b>${c?esc(c.first_name+" "+c.last_name):"Nieznana"}</b><div class="small">${c?esc(c.pesel):""}</div></td><td><span class="badge ${w.level==="WYSOKIEGO RYZYKA"?"b-red":"b-yellow"}">${esc(w.level)}</span></td><td>${esc(w.reason)}</td><td><span class="badge ${w.status==="AKTYWNE"?"b-red":"b-gray"}">${esc(w.status)}</span></td><td>${fmt(w.created_at)}</td><td><button class="action" onclick="openCitizen(${w.citizen_id})">KARTA</button></td></tr>`}).join("")}</tbody></table>`:`<div class="empty">Brak wpisów poszukiwawczych.</div>`}</div>`}
function reports(){const rows=db.notes.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));$("#content").innerHTML=`<div class="panel">${rows.length?`<table><thead><tr><th>Data</th><th>Kategoria</th><th>Osoba</th><th>Tytuł</th><th>Funkcjonariusz</th></tr></thead><tbody>${rows.map(n=>{const c=db.citizens.find(x=>x.id===n.citizen_id);return `<tr><td>${fmt(n.created_at)}</td><td><span class="badge b-blue">${esc(n.category||"NOTATKA")}</span></td><td>${c?esc(c.first_name+" "+c.last_name):"-"}</td><td><b>${esc(n.title)}</b><div class="small">${esc(n.content)}</div></td><td>${esc(officerName(n.officer_id))}</td></tr>`}).join("")}</tbody></table>`:`<div class="empty">Brak notatek.</div>`}</div>`}
function admin(){
  if(currentOfficer.role!=="admin"){dashboard();return}
  $("#content").innerHTML=`<div class="panel"><div class="panel-head"><div><div class="kicker">ZARZĄDZANIE DOSTĘPEM</div><h3>Konta funkcjonariuszy</h3></div><button onclick="newOfficer()">+ NOWE KONTO</button></div>
  <table><thead><tr><th>Login</th><th>Funkcjonariusz</th><th>Nr</th><th>Stopień</th><th>Rola</th><th>Status</th></tr></thead><tbody>${db.officers.map(o=>`<tr><td>${esc(o.login)}</td><td><b>${esc(o.name)}</b></td><td>${esc(o.badge)}</td><td>${esc(o.rank)}</td><td>${esc(o.role)}</td><td><span class="badge ${o.active?"b-green":"b-red"}">${o.active?"AKTYWNE":"ZABLOKOWANE"}</span></td></tr>`).join("")}</tbody></table></div>
  <div class="panel"><div class="panel-head"><div><div class="kicker">AUDYT</div><h3>Dziennik operacji</h3></div><button class="ghost" onclick="exportData()">EKSPORT JSON</button></div>
  <table><thead><tr><th>Data</th><th>Użytkownik</th><th>Operacja</th><th>Szczegóły</th></tr></thead><tbody>${db.audit.slice(0,100).map(a=>`<tr><td>${fmt(a.created_at)}</td><td>${esc(officerName(a.officer_id))}</td><td>${esc(a.action)}</td><td>${esc(a.details||"")}</td></tr>`).join("")}</tbody></table></div>`;
}
function newOfficer(){openModal(`<div class="kicker">ADMINISTRACJA</div><h2>Nowe konto funkcjonariusza</h2><form id="officerForm" class="form-grid"><label>LOGIN<input name="login" required></label><label>HASŁO<input name="password" type="password" required></label><label>IMIĘ I NAZWISKO<input name="name" required></label><label>NUMER SŁUŻBOWY<input name="badge" required></label><label>STOPIEŃ<input name="rank" required></label><label>ROLA<select name="role"><option value="officer">Funkcjonariusz</option><option value="admin">Administrator</option></select></label><div class="full form-actions"><button>UTWÓRZ KONTO</button></div></form>`);$("#officerForm").onsubmit=e=>{e.preventDefault();const d=formData(e);if(db.officers.some(o=>o.login===d.login)){alert("Login jest już zajęty.");return}db.officers.push({id:nextId(db.officers),...d,active:true});saveDB();audit("CREATE_OFFICER",d.login);closeModal();admin()}}
function exportData(){const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ksip-backup.json";a.click();URL.revokeObjectURL(a.href)}
setInterval(()=>{$("#clock").textContent=new Date().toLocaleString("pl-PL")},1000);
window.onclick=e=>{if(e.target===$("#modal"))closeModal()};
restoreSession();
