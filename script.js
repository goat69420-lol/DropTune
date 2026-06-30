const SAVE_VERSION = "1.9";
const OWNER_MODE = new URLSearchParams(location.search).get("owner") === "1";
const STORAGE_KEY = "droptune_save_v19";
const ALBUMS = window.DROPTUNE_ALBUMS || [];
const RARITY_ORDER = {Common:1, Uncommon:2, Rare:3, Epic:4, Legendary:5, Divine:6};
const RARITY_WEIGHT = {Common:60, Uncommon:35, Rare:18, Epic:8, Legendary:2.4, Divine:0.45};
const PACKS = {
  basic: {name:"Basic Pack", cost:250, cards:3, icon:"📀", className:"pack-basic", desc:"Najtańsza paczka. Głównie Common/Rare."},
  album: {name:"Album Pack", cost:700, cards:3, icon:"📚", className:"pack-album", desc:"Celuje w brakujące tracki z jednego albumu."},
  collector: {name:"Collector Pack", cost:1500, cards:4, icon:"👑", className:"pack-collector", desc:"Mniejsza szansa na śmieci, większy hype."}
};
const LEVEL_REWARDS = [
  {level:2,label:"50 coins",coins:50,xp:0,badge:null,title:null},{level:5,label:"Basic Pack",pack:"basic",coins:0,xp:0,badge:null,title:null},{level:10,label:"Green Banner",coins:100,xp:80,badge:"Green Banner",title:"Green Rookie"},{level:15,label:"Album Pack",pack:"album",coins:0,xp:0,badge:null,title:null},{level:25,label:"Collector Title",coins:250,xp:160,badge:"Collector Badge",title:"Album Hunter"},{level:50,label:"Gold Profile",coins:750,xp:300,badge:"Gold Profile",title:"Gold Collector"},{level:100,label:"DropTune Veteran",coins:1500,xp:700,badge:"Veteran Badge",title:"DropTune Veteran"}
];
const ACHIEVEMENTS = [
  {id:"first_pack",icon:"📦",title:"Pierwsza paczka",desc:"Otwórz pierwszą paczkę.",metric:"packsOpened",goal:1,coins:25,xp:40,titleReward:"New Collector",badge:"First Pack"},
  {id:"pack_25",icon:"📀",title:"25 paczek",desc:"Otwórz 25 paczek.",metric:"packsOpened",goal:25,coins:200,xp:250,titleReward:"Pack Grinder",badge:"25 Packs"},
  {id:"pack_100",icon:"🧱",title:"100 paczek",desc:"Otwórz 100 paczek.",metric:"packsOpened",goal:100,coins:900,xp:900,titleReward:"Pack Maniac",badge:"100 Packs"},
  {id:"epic_10",icon:"💜",title:"Epic Collector",desc:"Zdobądź 10 tracków Epic lub lepszych.",metric:"epicPlus",goal:10,coins:350,xp:350,titleReward:"Epic Collector",badge:"Epic Collector"},
  {id:"legend_5",icon:"👑",title:"Legend Hunter",desc:"Zdobądź 5 tracków Legendary lub Divine.",metric:"legendPlus",goal:5,coins:700,xp:700,titleReward:"Legend Hunter",badge:"Legend Hunter"},
  {id:"divine_2",icon:"💎",title:"Divine Puller",desc:"Zdobądź 2 tracki Divine.",metric:"divine",goal:2,coins:1200,xp:1200,titleReward:"Divine Puller",badge:"Divine Puller"},
  {id:"album_one",icon:"📚",title:"Pierwszy album",desc:"Ukończ dowolny album.",metric:"albumsCompleted",goal:1,coins:500,xp:500,titleReward:"Album Finisher",badge:"Album Complete"},
  {id:"all_kwiat",icon:"🌹",title:"Kwiat ukończony",desc:"Zbierz całe Kwiat Polskiej Młodzieży.",metric:"album:bedoes_kwiat",goal:1,coins:600,xp:600,titleReward:"Kwiat Collector",badge:"Kwiat Badge"},
  {id:"all_100dni",icon:"📘",title:"100 dni ukończone",desc:"Zbierz całe 100 dni do matury.",metric:"album:mata_100dni",goal:1,coins:650,xp:650,titleReward:"Matura Legend",badge:"100 dni Badge"},
  {id:"value_100k",icon:"💰",title:"100k value",desc:"Osiągnij 100 000 collection value.",metric:"collectionValue",goal:100000,coins:800,xp:800,titleReward:"Value King",badge:"100k Value"},
  {id:"level_25",icon:"⭐",title:"Level 25",desc:"Dobij poziom 25.",metric:"level",goal:25,coins:500,xp:0,titleReward:"Level Climber",badge:"Level 25"},
  {id:"complete_all",icon:"🏆",title:"Full Discography",desc:"Zbierz wszystkie tracki w obecnej bazie.",metric:"allTracks",goal:1,coins:2000,xp:2000,titleReward:"DropTune God",badge:"Full Discography"}
];

let state = defaultState();
let currentPackCards = [];
let revealDone = new Set();

function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}

function previewPath(track) { return `assets/previews/${track.id}.mp3`; }
function copyText(text) { navigator.clipboard?.writeText(text); toast('Skopiowane.'); }
function stopOtherAudio(current) { document.querySelectorAll('audio').forEach(a => { if(a !== current) a.pause(); }); }
function expectedCoverPath(album) { return album.cover; }
function expectedPreviewPaths(album) { return album.tracks.map(t => `assets/previews/${t.id}.mp3`); }
function defaultState() {
  return {version:SAVE_VERSION, name:"Panie", coins: OWNER_MODE ? 999999999 : 1000, level:1, xp:0, createdAt:new Date().toISOString(), collection:[], firstDropId:null, favoriteId:null, banner:"green", title:"Starter Collector", unlockedTitles:["Starter Collector"], badges:[], stats:{packsOpened:0}, claimedAchievements:[], claimedLevelRewards:[], daily:{lastClaim:"", streak:0}, shop:{date:"", items:[]} };
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw) {
    try { state = {...defaultState(), ...JSON.parse(raw)}; } catch(e) { state = defaultState(); }
  }
  if(state.version !== SAVE_VERSION) { state = defaultState(); save(); }
  if(OWNER_MODE) state.coins = 999999999;
  ensureShop();
}
function allTracks() {
  return ALBUMS.flatMap(a => a.tracks.map((t,i)=>({...t, albumId:a.id, albumTitle:a.title, artist:a.artist, cover:a.cover, index:i})));
}
function ownedIds() { return new Set(state.collection.map(c=>c.id)); }
function rarityFromRating(r) {
  if(r === null || r === undefined) return "Common";
  if(r <= 5) return "Common";
  if(r <= 6.5) return "Uncommon";
  if(r <= 7.5) return "Rare";
  if(r <= 8.5) return "Epic";
  if(r <= 9.5) return "Legendary";
  return "Divine";
}
function valueFromRating(r) {
  if(r === null || r === undefined) return 90;
  return Math.round(80 + r * r * 70);
}
function xpNeed() { return 350 + (state.level-1)*90; }
function addXP(amount) {
  state.xp += amount;
  while(state.xp >= xpNeed()) { state.xp -= xpNeed(); state.level++; toast("Level up!"); playSound(660); }
}
function trackCard(track, source="Pack") {
  const rarity = rarityFromRating(track.rating);
  return {...track, rarity, value:valueFromRating(track.rating), cardId:`${track.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`, obtainedAt:new Date().toISOString(), source };
}
function availableTracks() { const owned = ownedIds(); return allTracks().filter(t=>!owned.has(t.id)); }
function weightedPick(list, packType="basic") {
  let pool = [...list];
  if(packType === "collector") pool = pool.filter(t => RARITY_ORDER[rarityFromRating(t.rating)] >= 2);
  if(!pool.length) pool = [...list];
  const weights = pool.map(t => {
    const rarity = rarityFromRating(t.rating);
    let w = RARITY_WEIGHT[rarity] || 1;
    if(packType === "collector" && rarity === "Common") w *= 0.2;
    if(packType === "collector" && rarity === "Divine") w *= 0.75;
    return w;
  });
  const total = weights.reduce((a,b)=>a+b,0);
  let roll = Math.random()*total;
  for(let i=0;i<pool.length;i++) { roll -= weights[i]; if(roll <= 0) return pool[i]; }
  return pool[0];
}
function buyPack(type) {
  const pack = PACKS[type]; if(!pack) return;
  if(!OWNER_MODE && state.coins < pack.cost) return toast("Brak coinsów.");
  const avail = availableTracks();
  if(!avail.length) return toast("Masz już wszystkie tracki.");
  if(!OWNER_MODE) state.coins -= pack.cost;
  let localAvailable = [...avail];
  if(type === "album") {
    const albumNeed = ALBUMS.map(a => ({id:a.id, missing:localAvailable.filter(t=>t.albumId===a.id).length})).sort((a,b)=>b.missing-a.missing)[0];
    if(albumNeed && albumNeed.missing) localAvailable = localAvailable.filter(t=>t.albumId===albumNeed.id);
  }
  currentPackCards = [];
  for(let i=0;i<pack.cards && localAvailable.length;i++) {
    const pick = weightedPick(localAvailable, type);
    currentPackCards.push(trackCard(pick, pack.name));
    localAvailable = localAvailable.filter(t=>t.id !== pick.id);
  }
  state.stats.packsOpened++;
  save(); updateUI();
  openPackOverlay(pack);
}
function openPackOverlay(pack) {
  revealDone = new Set();
  document.getElementById('packOverlay').classList.remove('hidden');
  document.getElementById('packIntro').classList.remove('hidden');
  document.getElementById('revealPhase').classList.add('hidden');
  document.getElementById('finishRevealBtn').classList.add('hidden');
  document.getElementById('packFaceText').textContent = pack.name;
  document.getElementById('openingTitle').textContent = `Opening ${pack.name}...`;
  setTimeout(()=>{
    document.getElementById('packIntro').classList.add('hidden');
    document.getElementById('revealPhase').classList.remove('hidden');
    renderRevealGrid();
  }, 1250);
  playSound(140);
}
function renderRevealGrid() {
  const grid = document.getElementById('packRevealGrid');
  grid.innerHTML = currentPackCards.map((c,i)=> revealDone.has(i) ? revealedHTML(c) : `<button class="vinylPick" onclick="revealVinyl(${i})"><div class="vinylDisc"></div><span>Vinyl ${i+1}</span></button>`).join('');
  if(revealDone.size === currentPackCards.length) document.getElementById('finishRevealBtn').classList.remove('hidden');
}
function revealedHTML(c) {
  return `<div class="revealCard ${c.rarity}">${coverHTML(c)}<span class="rarityPill ${c.rarity}">${c.rarity}</span><h3>${c.title}</h3><p>${c.artist}</p></div>`;
}
function revealVinyl(i) {
  if(revealDone.has(i)) return;
  const card = currentPackCards[i];
  revealDone.add(i);
  if(!ownedIds().has(card.id)) {
    state.collection.unshift(card);
    if(!state.firstDropId) state.firstDropId = card.cardId;
    addXP(35 + RARITY_ORDER[card.rarity]*20);
  }
  renderRevealGrid();
  renderLastDrop(card);
  renderAllSoft(); save(); updateUI();
  playSound(card.rarity === "Divine" ? 880 : card.rarity === "Legendary" ? 740 : 420);
}
function finishReveal() { document.getElementById('packOverlay').classList.add('hidden'); currentPackCards=[]; }
function renderLastDrop(c) { document.getElementById('lastDropBox').innerHTML = `<div class="lastDropMini">${coverHTML(c)}<div><span class="rarityPill ${c.rarity}">${c.rarity}</span><h3>${c.title}</h3><p>${c.artist} • ${c.albumTitle}</p></div></div>`; }
function coverHTML(item) {
  const album = item.tracks ? item : albumById(item.albumId);
  const src = item.cover || album?.cover || "assets/covers/missing-cover.jpg";
  const title = item.albumTitle || item.title || album?.title || "DropTune";
  const artist = item.artist || album?.artist || "";
  return `<div class="coverImage coverSmart" data-title="${title}" data-artist="${artist}"><img loading="lazy" src="${src}" alt="${title}" onerror="this.style.display='none'; this.parentElement.classList.add('coverMissing')"><span><b>${title}</b><small>${artist}</small></span></div>`;
}
function albumById(id) { return ALBUMS.find(a=>a.id===id); }
function renderPacks() {
  document.getElementById('packsGrid').innerHTML = Object.entries(PACKS).map(([id,p]) => `<button class="packCard texture ${p.className}" onclick="buyPack('${id}')"><div class="packIcon">${p.icon}</div><h2>${p.name}</h2><p>${p.desc}</p><span class="priceTiny">${p.cost} coins</span></button>`).join('');
}
function renderCollection() {
  const q = document.getElementById('searchInput')?.value.toLowerCase() || "";
  const rar = document.getElementById('filterRarity')?.value || "";
  const sort = document.getElementById('sortCollection')?.value || "newest";
  let list = [...state.collection].filter(c => (!q || `${c.title} ${c.artist} ${c.albumTitle}`.toLowerCase().includes(q)) && (!rar || c.rarity === rar));
  if(sort === "value") list.sort((a,b)=>b.value-a.value);
  if(sort === "rating") list.sort((a,b)=>(b.rating||0)-(a.rating||0));
  if(sort === "album") list.sort((a,b)=>a.albumTitle.localeCompare(b.albumTitle));
  document.getElementById('collectionGrid').innerHTML = list.length ? list.map(c => `<div class="card ${c.rarity}" onclick="showTrackPopup('${c.cardId}')">${coverHTML(c)}<span class="rarityPill ${c.rarity}">${c.rarity}</span><h3>${c.title}</h3><p>${c.artist}</p><p class="subText">${c.albumTitle}</p></div>`).join('') : `<div class="panel"><h2>Brak tracków</h2><p>Otwórz paczkę, żeby zacząć.</p></div>`;
}
function showTrackPopup(cardId) {
  const c = state.collection.find(x=>x.cardId===cardId); if(!c) return;
  const preview = previewPath(c);
  const safeId = `audioStatus_${c.cardId.replace(/[^a-zA-Z0-9]/g,'_')}`;
  document.getElementById('popup').classList.remove('hidden');
  document.getElementById('popup').innerHTML = `<div class="popupCard ${c.rarity}">${coverHTML(c)}<div><span class="rarityPill ${c.rarity}">${c.rarity}</span><h1>${c.title}</h1><h3>${c.artist}</h3><p>${c.albumTitle} • rating: ${c.rating ?? "X"} • value: ${c.value.toLocaleString()}</p><div class="previewBox"><h3>🎧 Audio preview</h3><p>Expected file:</p><code>${preview}</code><audio controls preload="metadata" src="${preview}" onplay="stopOtherAudio(this)" onerror="document.getElementById('${safeId}').textContent='Preview not added yet — wrzuć mp3 dokładnie pod tę ścieżkę.'"></audio><small id="${safeId}">Jeśli plik istnieje, player odpali 30-sekundowy urywek.</small></div><div class="popupActions"><button class="texture" onclick="setFavorite('${c.cardId}')">Set favourite</button><button class="texture" onclick="copyText('${preview}')">Copy preview path</button><button class="texture" onclick="closePopup()">Close</button></div></div></div>`;
}
function closePopup() { document.getElementById('popup').classList.add('hidden'); }
function setFavorite(cardId) { state.favoriteId = cardId; save(); renderProfile(); updateUI(); closePopup(); toast("Favourite ustawiony."); }
function renderAlbums() {
  const owned = ownedIds();
  document.getElementById('albumsGrid').innerHTML = ALBUMS.map(a => {
    const total = a.tracks.length;
    const ownedCount = a.tracks.filter(t=>owned.has(t.id)).length;
    return `<div class="albumCard"><div class="albumRow">${coverHTML(a)}<div><h2>${a.title}</h2><p>${a.artist}</p><div class="albumMeta"><span>${a.genre}</span><span>${a.year}</span><span>${a.duration}</span><span>${ownedCount} / ${total}</span></div><div class="progressBar"><div class="progressFill" style="width:${ownedCount/total*100}%"></div></div><div class="trackChecklist">${a.tracks.map(t=>albumTrackHTML(a,t,owned.has(t.id))).join('')}</div></div></div></div>`;
  }).join('');
}
function albumTrackHTML(album, track, isOwned) {
  const r = rarityFromRating(track.rating);
  const shownTitle = isOwned ? track.title : "???";
  return `<div class="trackLine ${isOwned?'owned':'missing'}"><div class="trackName"><b class="trackTitleText">${shownTitle}</b><small>${isOwned ? album.artist : 'Hidden track'} • rating: ${isOwned ? (track.rating ?? 'X') : '?'}</small></div><span class="rarityPill ${r}">${isOwned ? r : 'LOCKED'}</span></div>`;
}
function albumCompletion(albumId) { const a=albumById(albumId); return a.tracks.every(t=>ownedIds().has(t.id)); }
function collectionValue() { return state.collection.reduce((s,c)=>s+c.value,0); }
function metricValue(metric) {
  if(metric === "packsOpened") return state.stats.packsOpened;
  if(metric === "epicPlus") return state.collection.filter(c=>RARITY_ORDER[c.rarity]>=4).length;
  if(metric === "legendPlus") return state.collection.filter(c=>RARITY_ORDER[c.rarity]>=5).length;
  if(metric === "divine") return state.collection.filter(c=>c.rarity==='Divine').length;
  if(metric === "albumsCompleted") return ALBUMS.filter(a=>albumCompletion(a.id)).length;
  if(metric.startsWith("album:")) return albumCompletion(metric.split(':')[1]) ? 1 : 0;
  if(metric === "collectionValue") return collectionValue();
  if(metric === "level") return state.level;
  if(metric === "allTracks") return state.collection.length >= allTracks().length ? 1 : 0;
  return 0;
}
function renderAchievements() {
  document.getElementById('achievementsGrid').innerHTML = ACHIEVEMENTS.map(a => {
    const val = Math.min(metricValue(a.metric), a.goal);
    const ready = val >= a.goal;
    const claimed = state.claimedAchievements.includes(a.id);
    return `<div class="achievementCard ${ready?'ready':'locked'}"><div class="achievementIcon">${a.icon}</div><div><h3>${a.title}</h3><p>${a.desc}</p><div class="taskProgress"><div style="width:${val/a.goal*100}%"></div></div><small>${val} / ${a.goal} • reward: ${a.coins} coins, ${a.xp} XP, title: ${a.titleReward}</small></div><button class="texture" ${!ready||claimed?'disabled':''} onclick="claimAchievement('${a.id}')">${claimed?'Claimed':ready?'Claim':'Locked'}</button></div>`;
  }).join('');
}
function claimAchievement(id) {
  const a = ACHIEVEMENTS.find(x=>x.id===id); if(!a) return;
  if(state.claimedAchievements.includes(id) || metricValue(a.metric)<a.goal) return;
  state.claimedAchievements.push(id); state.coins += a.coins; addXP(a.xp);
  if(a.badge && !state.badges.includes(a.badge)) state.badges.push(a.badge);
  if(a.titleReward && !state.unlockedTitles.includes(a.titleReward)) state.unlockedTitles.push(a.titleReward);
  save(); renderAllSoft(); updateUI(); toast("Achievement odebrany.");
}
function renderLevelRoad() {
  document.getElementById('levelRoadTitle').textContent = `Level ${state.level}`;
  document.getElementById('levelRoadRank').textContent = rankInfo()[0];
  document.getElementById('levelRoad').innerHTML = LEVEL_REWARDS.map(r => {
    const ready = state.level >= r.level;
    const claimed = state.claimedLevelRewards.includes(r.level);
    return `<div class="levelReward ${ready&&!claimed?'claimable':''} ${claimed?'claimed':''}"><div class="levelDot">${r.level}</div><h3>${r.label}</h3><p>Required level ${r.level}</p><button class="texture" ${!ready||claimed?'disabled':''} onclick="claimLevelReward(${r.level})">${claimed?'Claimed':ready?'Claim':'Locked'}</button></div>`;
  }).join('');
}
function claimLevelReward(level) {
  const r = LEVEL_REWARDS.find(x=>x.level===level); if(!r || state.claimedLevelRewards.includes(level) || state.level<level) return;
  state.claimedLevelRewards.push(level); state.coins += r.coins || 0; addXP(r.xp || 0);
  if(r.title && !state.unlockedTitles.includes(r.title)) state.unlockedTitles.push(r.title);
  if(r.badge && !state.badges.includes(r.badge)) state.badges.push(r.badge);
  if(r.pack) buyPack(r.pack);
  save(); renderAllSoft(); updateUI();
}
function claimAllLevel() { LEVEL_REWARDS.forEach(r=>{ if(state.level>=r.level && !state.claimedLevelRewards.includes(r.level)) claimLevelReward(r.level); }); }
function rankInfo() { if(state.level>=100)return ["DropTune Veteran","🏆"]; if(state.level>=50)return ["Gold Collector","⭐"]; if(state.level>=25)return ["Album Hunter","📚"]; if(state.level>=10)return ["Green Rookie","🟢"]; return ["Rookie Collector","🎵"]; }
function ensureShop(force=false) {
  const today = new Date().toDateString();
  if(!force && state.shop.date === today && state.shop.items?.length) return;
  const candidates = availableTracks();
  const items=[];
  const addByMax = (maxRarity, count) => {
    let pool = candidates.filter(t => RARITY_ORDER[rarityFromRating(t.rating)] <= maxRarity && !items.some(i=>i.id===t.id));
    for(let i=0;i<count && pool.length;i++) { const p=pool[Math.floor(Math.random()*pool.length)]; items.push(p); pool=pool.filter(x=>x.id!==p.id); }
  };
  addByMax(3,3); addByMax(4,1);
  if(Math.random()<0.12) addByMax(5,1);
  if(Math.random()<0.025) addByMax(6,1);
  state.shop={date:today, items:items.map(t=>({id:t.id, price: Math.round(valueFromRating(t.rating)*1.8)}))};
}
function renderShop() {
  ensureShop(); document.getElementById('shopDateText').textContent = new Date().toLocaleDateString('pl-PL');
  const tracksById = Object.fromEntries(allTracks().map(t=>[t.id,t]));
  document.getElementById('shopGrid').innerHTML = state.shop.items.length ? state.shop.items.map(item => {
    const t = tracksById[item.id]; const card=trackCard(t,'Daily Shop');
    return `<div class="marketItem ${card.rarity}">${coverHTML(card)}<div><span class="rarityPill ${card.rarity}">${card.rarity}</span><h3>${card.title}</h3><p>${card.artist} • ${card.albumTitle}</p></div><div><b class="priceTiny">${item.price} coins</b><br><button class="texture" onclick="buyShopItem('${item.id}')">Buy</button></div></div>`;
  }).join('') : `<div class="panel">Shop pusty, bo masz już dużo tracków.</div>`;
  document.getElementById('shopRerollBtn').style.display = OWNER_MODE ? 'inline-flex' : 'none';
}
function refreshShop(force=false) { ensureShop(true); save(); renderShop(); }
function buyShopItem(id) {
  const item = state.shop.items.find(x=>x.id===id); if(!item) return;
  if(ownedIds().has(id)) return toast('Już masz ten track.');
  if(!OWNER_MODE && state.coins < item.price) return toast('Brak coinsów.');
  const t = allTracks().find(x=>x.id===id); if(!t) return;
  if(!OWNER_MODE) state.coins -= item.price;
  const c = trackCard(t,'Daily Shop'); state.collection.unshift(c); if(!state.firstDropId) state.firstDropId=c.cardId;
  state.shop.items = state.shop.items.filter(x=>x.id!==id);
  addXP(45); save(); renderAllSoft(); updateUI(); toast('Kupiono track.');
}
function renderProfile() {
  document.getElementById('profileName').textContent = state.name;
  document.getElementById('profileNameTop').textContent = state.name;
  document.getElementById('profileTitleText').textContent = state.title;
  document.getElementById('accountCreated').textContent = new Date(state.createdAt).toLocaleDateString('pl-PL');
  const banner=document.getElementById('profileBanner'); banner.className = 'profileBanner '+state.banner;
  const first = state.collection.find(c=>c.cardId===state.firstDropId);
  const fav = state.collection.find(c=>c.cardId===state.favoriteId);
  document.getElementById('firstDropBox').innerHTML = first ? miniCard(first) : '<p>Brak dropa.</p>';
  document.getElementById('favoriteTrackBox').innerHTML = fav ? miniCard(fav) : '<p>Ustaw favourite w popupie tracka.</p>';
  document.getElementById('badgesBox').innerHTML = (state.badges.length?state.badges:['Starter Collector']).map(b=>`<span class="badge">${b}</span>`).join('');
  document.getElementById('profileStats').innerHTML = `<p>Packs opened: ${state.stats.packsOpened}</p><p>Collection value: ${collectionValue().toLocaleString()}</p><p>Albums completed: ${ALBUMS.filter(a=>albumCompletion(a.id)).length} / ${ALBUMS.length}</p>`;
  const titleSelect=document.getElementById('titleSelect'); titleSelect.innerHTML = state.unlockedTitles.map(t=>`<option ${t===state.title?'selected':''}>${t}</option>`).join('');
  document.getElementById('bannerSelect').value = state.banner;
}
function miniCard(c) { return `<div class="miniCard">${coverHTML(c)}<div><span class="rarityPill ${c.rarity}">${c.rarity}</span><h3>${c.title}</h3><p>${c.artist}</p></div></div>`; }
function claimableCount() {
  const ach = ACHIEVEMENTS.filter(a=>metricValue(a.metric)>=a.goal && !state.claimedAchievements.includes(a.id)).length;
  const lvl = LEVEL_REWARDS.filter(r=>state.level>=r.level && !state.claimedLevelRewards.includes(r.level)).length;
  const daily = state.daily.lastClaim !== new Date().toDateString() ? 1 : 0;
  return {ach,lvl,daily,total:ach+lvl+daily};
}
function updateNotices() {
  const c=claimableCount(); document.getElementById('claimableCount').textContent = c.total;
  notice('achievementsScreen', c.ach); notice('levelScreen', c.lvl); notice('homeScreen', c.daily);
}
function notice(screen,n) { const b=document.querySelector(`.navButton[data-screen="${screen}"]`); if(!b)return; b.classList.toggle('hasNotice', n>0); if(n>0)b.dataset.notice=n; else delete b.dataset.notice; }
function updateUI() {
  const [rank,badge]=rankInfo();
  document.getElementById('coins').textContent = Math.floor(state.coins).toLocaleString();
  document.getElementById('level').textContent = state.level;
  document.getElementById('tracksOwned').textContent = state.collection.length;
  document.getElementById('heroLevel').textContent = 'LEVEL '+state.level;
  document.getElementById('levelRank').textContent = rank;
  document.getElementById('levelBadge').textContent = badge;
  document.getElementById('playerTitle').textContent = state.title;
  document.getElementById('xpText').textContent = `${state.xp} / ${xpNeed()} XP`;
  document.getElementById('xpFill').style.width = (state.xp/xpNeed()*100)+'%';
  updateDailyUI(); updateNotices(); renderFeatured(); save();
}
function renderFeatured() {
  const a = ALBUMS[0]; const owned=ownedIds(); const n=a.tracks.filter(t=>owned.has(t.id)).length;
  document.getElementById('featuredAlbumPanel').innerHTML = `${coverHTML(a)}<div><p>Featured Album</p><h2>${a.title}</h2><h4>${a.artist}</h4><div class="albumMeta"><span>${a.genre}</span><span>${a.year}</span><span>${a.duration}</span></div><div class="progressBar"><div class="progressFill" style="width:${n/a.tracks.length*100}%"></div></div><p>${n} / ${a.tracks.length} tracks</p></div>`;
}
function updateDailyUI() {
  const today = new Date().toDateString(); const claimed = state.daily.lastClaim === today;
  const amount = 25 + Math.min(state.daily.streak,7)*10;
  document.getElementById('dailyRewardTitle').textContent = '+'+amount+' Coins';
  document.getElementById('dailyStreakText').textContent = 'Streak: '+state.daily.streak;
  document.getElementById('dailyClaimBtn').textContent = claimed ? 'Claimed' : 'Claim';
  document.getElementById('dailyClaimBtn').disabled = claimed;
}
function claimDaily() {
  const today = new Date().toDateString(); if(state.daily.lastClaim===today)return;
  const y = new Date(Date.now()-86400000).toDateString(); state.daily.streak = state.daily.lastClaim===y ? state.daily.streak+1 : 1; state.daily.lastClaim=today;
  state.coins += 25 + Math.min(state.daily.streak,7)*10; addXP(30); save(); renderAllSoft(); updateUI(); toast('Daily odebrane.');
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active');
  document.querySelectorAll('.navButton').forEach(b=>b.classList.toggle('active',b.dataset.screen===id));
  renderAllSoft(); updateUI();
}
function renderDatabaseTools() {
  const root = document.getElementById('databaseTools');
  if(!root) return;
  root.innerHTML = ALBUMS.map(a => {
    const previews = expectedPreviewPaths(a);
    return `<div class="dbAlbumCard panel">${coverHTML(a)}<div><h2>${a.title}</h2><p>${a.artist} • ${a.year} • ${a.tracks.length} tracks</p><div class="assetBox"><b>Cover path</b><code>${expectedCoverPath(a)}</code><button class="texture" onclick="copyText('${expectedCoverPath(a)}')">Copy</button></div><details><summary>Preview mp3 paths (${previews.length})</summary><div class="pathList">${previews.map(p=>`<code>${p}</code>`).join('')}</div></details></div></div>`;
  }).join('');
  const template = document.getElementById('albumTemplateBox');
  if(template) template.textContent = `{
  id: "artist_album_slug",
  artist: "Artysta",
  title: "Tytuł albumu",
  year: "2026",
  genre: "Polski rap",
  duration: "ok. 50 min",
  cover: "assets/covers/artist_album_slug.jpg",
  tracks: [
    { id: "artist_album_slug_track_slug", title: "Track", rating: 8.5 }
  ]
}`;
}

function renderAllSoft() { renderPacks(); renderCollection(); renderAlbums(); renderShop(); renderAchievements(); renderLevelRoad(); renderProfile(); renderDatabaseTools(); }
function toast(msg) { const t=document.getElementById('toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.add('hidden'),2500); }
function playSound(freq=440) { try { const C=window.AudioContext||window.webkitAudioContext; const ctx=playSound.ctx||(playSound.ctx=new C()); const o=ctx.createOscillator(); const g=ctx.createGain(); o.frequency.value=freq; g.gain.value=.035; o.connect(g); g.connect(ctx.destination); o.start(); g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18); o.stop(ctx.currentTime+.2); } catch(e){} }
function exportSave() { navigator.clipboard?.writeText(JSON.stringify(state)); toast('Save skopiowany.'); }
function importSave() { const raw=prompt('Wklej save JSON'); if(!raw)return; try{state={...defaultState(),...JSON.parse(raw)}; save(); location.reload();}catch(e){toast('Zły save.')} }
function resetGame() { if(confirm('Reset gry?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }
function setupCursor() {
  const mist=document.getElementById('mist'), dot=document.getElementById('cursorDot'), ring=document.getElementById('cursorRing'); let rx=0,ry=0;
  document.addEventListener('mousemove', e=>{
    document.documentElement.style.setProperty('--mx', e.clientX+'px'); document.documentElement.style.setProperty('--my', e.clientY+'px');
    mist.style.left=e.clientX+'px'; mist.style.top=e.clientY+'px'; dot.style.left=e.clientX+'px'; dot.style.top=e.clientY+'px'; rx += (e.clientX-rx)*.18; ry += (e.clientY-ry)*.18; ring.style.left=rx+'px'; ring.style.top=ry+'px';
    if(Math.random()<.22) { const tr=document.createElement('div'); tr.className='trail'; tr.style.left=e.clientX+'px'; tr.style.top=e.clientY+'px'; document.body.appendChild(tr); setTimeout(()=>tr.remove(),560); }
  });
}

document.addEventListener('click', e => { const btn=e.target.closest('[data-screen]'); if(btn) showScreen(btn.dataset.screen); });
document.getElementById('dailyClaimBtn').addEventListener('click', claimDaily);
document.getElementById('finishRevealBtn').addEventListener('click', finishReveal);
document.getElementById('popup').addEventListener('click', e=>{ if(e.target.id==='popup') closePopup(); });
document.getElementById('packOverlay').addEventListener('click', e=>{ if(e.target.id==='packOverlay') finishReveal(); });
document.getElementById('searchInput').addEventListener('input', renderCollection);
document.getElementById('filterRarity').addEventListener('change', renderCollection);
document.getElementById('sortCollection').addEventListener('change', renderCollection);
document.getElementById('shopRerollBtn').addEventListener('click', ()=>refreshShop(true));
document.getElementById('claimAllLevelBtn').addEventListener('click', claimAllLevel);
document.getElementById('bannerSelect').addEventListener('change', e=>{ state.banner=e.target.value; save(); renderProfile(); });
document.getElementById('titleSelect').addEventListener('change', e=>{ state.title=e.target.value; save(); updateUI(); renderProfile(); });
document.getElementById('exportSaveBtn').addEventListener('click', exportSave);
document.getElementById('importSaveBtn').addEventListener('click', importSave);
document.getElementById('resetBtn').addEventListener('click', resetGame);

load(); setupCursor(); renderAllSoft(); showScreen('homeScreen'); updateUI();
