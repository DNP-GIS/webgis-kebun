// Label Code — ubah di sini saja
// Asumsi: Code 1 = bulan berjalan (Okt 2026), Code 0 = bulan sebelumnya (Sep 2026)
const CODE_LABELS={"1":"LC Oct 2026","0":"LC Sep 2026"};
const CUR_CODE='1';
// Warna diambil dari peta ArcGIS Pro (PDF): LC Oct #FFFF00, garis tepi #595959; LC Sep arsir garis vertikal kuning
const LC_FILL='#FFFF00',LC_LINE='#595959',BATAS_COLOR='#333333',BLOK_COLOR='#555555';
const CODE_COLORS={"1":LC_FILL,"0":'#FFFFB3'};
const VER='202611050910';
const DATA_URL='data/land_clearing.geojson?v='+VER;
const BATAS_URL='data/batas_kebun.geojson?v='+VER;
const BLOK_URL='data/blok_sawit.geojson?v='+VER;
const BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const BLN_FULL=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'});
const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri World Imagery'});
const blank=L.tileLayer('data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',{maxZoom:19,attribution:'Polos'});
const map=L.map('map',{layers:[sat]}).setView([-3.71,104.45],13);
L.control.scale({imperial:false,maxWidth:140}).addTo(map);
let data,layer,batas,blok,nBlok=0,first=true,homeBounds=null;
map.createPane('blokPane');map.getPane('blokPane').style.zIndex=340;map.createPane('batasPane');map.getPane('batasPane').style.zIndex=350;
const $=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN=(n,d)=>n.toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});
const v=x=>(x===null||x===undefined||x==='')?'-':x;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const codeLbl=c=>CODE_LABELS[c]||('Code '+c);
const tgl=s=>{if(!s||s==='-')return'-';const[y,m,d]=s.split('-');return `${+d} ${BLN[m-1]} ${y}`};
const tglFull=s=>{if(!s)return'-';const[y,m,d]=s.split('-');return `${+d} ${BLN_FULL[m-1]} ${y}`};
function style(f){const c=f.properties.Code;return c=='1'?{color:LC_LINE,weight:1,fillColor:LC_FILL,fillOpacity:1}:{color:LC_LINE,weight:1,fillColor:'url(#lcSepHatch)',fillOpacity:1}}
function ensureHatch(){const svg=document.querySelector('.leaflet-overlay-pane svg');if(!svg||svg.querySelector('#lcSepHatch'))return;
 const ns='http://www.w3.org/2000/svg';let defs=svg.querySelector('defs');if(!defs){defs=document.createElementNS(ns,'defs');svg.insertBefore(defs,svg.firstChild)}
 defs.innerHTML='<pattern id="lcSepHatch" patternUnits="userSpaceOnUse" width="7" height="7"><rect width="7" height="7" fill="#FFFFE0" fill-opacity="0.85"/><line x1="1.5" y1="0" x2="1.5" y2="7" stroke="#FFFF00" stroke-width="2"/></pattern>'}

// ---- Popup kartu ----
function card(title,status,rows){return `<div class="pp-h"><div class="t">${esc(title)}</div>${status?`<span class="s">${esc(status)}</span>`:''}</div><table class="pp-t">${rows.map(([k,x])=>`<tr><td>${esc(k)}</td><td>${esc(x)}</td></tr>`).join('')}</table>`}
const ppOpt=cls=>({className:'pp '+cls,minWidth:240,maxWidth:300});
function popup(p){return card(`Land Clearing #${p.OBJECTID}`,codeLbl(p.Code),[['Luas',fmt(p.Luas)+' ha'],['Tanggal',tgl(p.Tanggal)],['Pengerjaan',v(p.Pengerjaan)],['Operator',v(p.Operator)],['Code',codeLbl(p.Code)]])}
function batasPopup(p){return card(v(p.Name),'Batas Kebun',[['Luas',fmt(+p.LuasHa)+' ha']])}
function blokPopup(p){return card(v(p.Blok),'Blok Kebun',[['Luas',fmt(+p.LuasHa)+' ha'],['Ukuran Blok',v(p.UkuranBlok)]])}

function group(fs,key,lab=k=>k){const g={};fs.forEach(f=>{const k=v(f.properties[key]);g[k]=(g[k]||0)+f.properties.Luas});return g}
function bars(g,lab=k=>k,keys,cls=()=>''){keys=keys||Object.keys(g).sort();const mx=Math.max(...Object.values(g),0),tot=Object.values(g).reduce((a,b)=>a+b,0);
 return keys.map(k=>`<div class="row"><span>${esc(lab(k))}</span><b>${fmt(g[k])} ha<em>${tot?fmtN(g[k]/tot*100,1):0}%</em></b></div><div class="bar"><div class="${cls(k)}" style="width:${mx?g[k]/mx*100:0}%"></div></div>`).join('')||'<div class="empty">Tidak ada data</div>'}
const FIDS=['fCode','fPeng','fOp','fFrom','fTo'];
function filtered(){const c=$('fCode').value,pg=$('fPeng').value,op=$('fOp').value,a=$('fFrom').value,b=$('fTo').value;
 return data.features.filter(f=>{const p=f.properties;
  if(c&&p.Code!=c)return false;if(pg&&v(p.Pengerjaan)!=pg)return false;if(op&&v(p.Operator)!=op)return false;
  if((a||b)&&!p.Tanggal)return false;if(a&&p.Tanggal<a)return false;if(b&&p.Tanggal>b)return false;return true})}
function render(){const fs=filtered();
 if(layer)map.removeLayer(layer);
 layer=L.geoJSON({type:'FeatureCollection',features:fs},{style,onEachFeature:(f,l)=>l.bindPopup(popup(f.properties),ppOpt(f.properties.Code=='1'?'pp-oct':'pp-sep'))}).addTo(map);ensureHatch();
 if(first&&fs.length){const b=layer.getBounds();if(batas)b.extend(batas.getBounds());homeBounds=b;map.fitBounds(b,{padding:[20,20]});first=false;const h=location.hash.match(/^#(\d+)\/(-?[\d.]+)\/(-?[\d.]+)/);if(h)map.setView([+h[2],+h[3]],+h[1])}
 const tot=fs.reduce((t,f)=>t+f.properties.Luas,0);
 const nAct=FIDS.filter(i=>$(i).value).length;
 $('summary').innerHTML=`<div class="kv">Jumlah poligon LC <b id="nPoly">${fs.length}</b></div><div class="kv">Total luas LC <b><span id="totLuas">${fmt(tot)}</span> ha</b></div>`+(batas?`<div class="kv">Luas Batas Kebun <b><span id="luasBatas">${fmt(batasHa)}</span> ha</b></div>`:'')+(blok?`<div class="kv">Jumlah Blok <b id="nBlok">${nBlok}</b></div>`:'');
 const gc=group(fs,'Code');
 $('perCode').innerHTML=bars(gc,codeLbl,Object.keys(gc).sort().reverse(),k=>k=='1'?'b-oct':k=='0'?'b-sep':'');
 $('perPeng').innerHTML=bars(group(fs,'Pengerjaan'));
 $('perOp').innerHTML=bars(group(fs,'Operator'));
 const gt=group(fs,'Tanggal');$('perTgl').innerHTML=bars(gt,tgl,Object.keys(gt).sort((x,y)=>x=='-'?1:y=='-'?-1:x<y?-1:1));
 // KPI
 const cur=fs.filter(f=>f.properties.Code==CUR_CODE).reduce((t,f)=>t+f.properties.Luas,0);
 $('kTot').textContent=fmt(tot);
 $('kTotS').textContent=nAct?`Terfilter · ${fs.length} dari ${data.features.length} poligon`:`${fs.length} poligon land clearing`;$('kTotS').classList.toggle('flt',!!nAct);
 $('kOct').textContent=fmt(cur);$('kOctS').textContent=tot?`${fmtN(cur/tot*100,1)}% dari total LC`:'–';
 const pct=batasHa?tot/batasHa*100:0;$('kPct').textContent=batasHa?fmtN(pct,2):'–';$('kPctBar').style.width=Math.min(pct,100)+'%';
 $('fCount').hidden=!nAct;$('fCount').textContent=nAct+' aktif';
 window.RENDERED=layer.getLayers().length;window.TOTAL=tot}
let batasHa=0;
const getJ=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});
Promise.all([getJ(DATA_URL),getJ(BATAS_URL).catch(e=>{console.warn('Batas kebun gagal dimuat',e);return null}),getJ(BLOK_URL).catch(e=>{console.warn('Blok sawit gagal dimuat',e);return null})]).then(([d,bk,bl])=>{data=d;
 if(bl){nBlok=bl.features.length;blok=L.geoJSON(bl,{pane:'blokPane',style:{color:BLOK_COLOR,weight:1,opacity:1,fill:true,fillOpacity:0},
  onEachFeature:(f,l)=>{const p=f.properties;l.bindPopup(blokPopup(p),ppOpt('pp-blok'));const m=String(p.Blok||'').match(/^Blok\s*(\d+)$/);const num=p.No_Blok!=null?p.No_Blok:(m?m[1]:null);l.bindTooltip(num!=null?String(num):v(p.Blok).replace(/^Blok\s*/,''),{permanent:true,direction:'center',className:num!=null?'blok-lbl':'blok-lbl blok-lbl-sm'})}}).addTo(map);
  const upd=()=>{const z=map.getZoom(),c=map.getContainer();c.classList.toggle('hide-blok-lbl',z<14);c.style.setProperty('--blokfs',Math.round(12*Math.pow(1.45,z-14))+'px')};map.on('zoomend',upd);upd()}
 if(bk){batas=L.geoJSON(bk,{pane:'batasPane',style:{color:BATAS_COLOR,weight:2.5,fill:false,opacity:1},
  onEachFeature:(f,l)=>{l.bindPopup(batasPopup(f.properties),ppOpt('pp-batas'));l.bindTooltip(`${v(f.properties.Name)} – ${fmt(+f.properties.LuasHa)} ha`,{sticky:true,className:'batas-tt'})}}).addTo(map);
  batasHa=bk.features.reduce((t,f)=>t+(+f.properties.LuasHa||0),0)}
 const P=d.features.map(f=>f.properties);
 ['1','0'].filter(c=>P.some(p=>p.Code==c)).forEach(c=>$('fCode').add(new Option(codeLbl(c),c)));
 [['fPeng','Pengerjaan'],['fOp','Operator']].forEach(([id,k])=>[...new Set(P.map(p=>v(p[k])))].sort().forEach(x=>$(id).add(new Option(x,x))));
 const ds=P.map(p=>p.Tanggal).filter(Boolean).sort();['fFrom','fTo'].forEach(i=>{$(i).min=ds[0];$(i).max=ds[ds.length-1]});
 // Header: periode & update terakhir dari Tanggal maksimum
 const last=ds[ds.length-1];
 if(last){const[y,m]=last.split('-');$('periode').textContent=`Periode: ${BLN_FULL[m-1]} ${y}`;$('lastUpd').textContent=tglFull(last);$('kOctL').textContent=`LC ${BLN_FULL[m-1]} ${y}`}
 // KPI statis
 $('kBatas').textContent=bk?fmt(batasHa):'–';$('kBlok').textContent=bl?fmtN(nBlok,0):'–';
 if(bl){const lb=bl.features.reduce((t,f)=>t+(+f.properties.LuasHa||0),0);$('kBlokS').textContent=`Total ${fmt(lb)} ha`}
 const lgB=document.getElementById('lgBatas');if(lgB&&bk)lgB.textContent=`Batas Kebun DNP (${fmt(batasHa)} Ha)`;
 L.control.layers({'Citra Satelit (Esri)':sat,'OpenStreetMap':osm,'Polos (Putih)':blank},Object.assign({},batas?{'Batas Kebun DNP':batas}:{},blok?{'Blok Kebun':blok}:{})).addTo(map);
 northCtl.addTo(map);
 FIDS.forEach(i=>$(i).onchange=render);
 $('reset').onclick=()=>{FIDS.forEach(i=>$(i).value='');render()};
 render();window.APP_OK=true}).catch(e=>{console.error(e);$('summary').innerHTML='<div class="note">Data gagal dimuat. Muat ulang halaman.</div>'});

// ---- Legenda (swatch sama seperti sebelumnya) ----
const lg=L.control({position:'bottomright'});lg.onAdd=()=>{const d=L.DomUtil.create('div','legend');const it=(sw,t,id)=>`<div class="lg-row"><i style="${sw}"></i><span${id?` id="${id}"`:''}>${t}</span></div>`;
 d.innerHTML='<div class="lg-title">LEGENDA</div>'+it(`background:${LC_FILL};border:1px solid ${LC_LINE}`,codeLbl('1'))+it(`background:repeating-linear-gradient(90deg,#FFFF00 0 2px,#FFFFE0 2px 7px);border:1px solid ${LC_LINE}`,codeLbl('0'))
 +it(`background:#fff;border:2.5px solid ${BATAS_COLOR}`,'Batas Kebun DNP (288,66 Ha)','lgBatas')+it(`background:#fff;border:1px solid ${BLOK_COLOR}`,'Blok Kebun');L.DomEvent.disableClickPropagation(d);return d};lg.addTo(map);

// ---- Tombol peta: Zoom ke kebun & Layar penuh ----
const ICON={home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
 fs:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 fsx:'<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'};
const tools=L.control({position:'topleft'});tools.onAdd=()=>{const d=L.DomUtil.create('div','leaflet-bar ctl-bar');
 const btn=(html,title,fn)=>{const a=L.DomUtil.create('a','ctl',d);a.href='#';a.title=title;a.setAttribute('role','button');a.setAttribute('aria-label',title);a.innerHTML=html;L.DomEvent.on(a,'click',e=>{L.DomEvent.preventDefault(e);fn(a)});return a};
 btn(ICON.home,'Zoom ke kebun',()=>{const b=homeBounds||(batas&&batas.getBounds());if(b)map.flyToBounds(b,{padding:[20,20],duration:.8})});
 const fsEl=map.getContainer(),canFs=!!(fsEl.requestFullscreen||fsEl.webkitRequestFullscreen);
 if(canFs){const a=btn(ICON.fs,'Layar penuh',()=>{const cur=document.fullscreenElement||document.webkitFullscreenElement;
   if(cur)(document.exitFullscreen||document.webkitExitFullscreen).call(document);else(fsEl.requestFullscreen||fsEl.webkitRequestFullscreen).call(fsEl)});
  const onFs=()=>{const on=!!(document.fullscreenElement||document.webkitFullscreenElement);a.innerHTML=on?ICON.fsx:ICON.fs;a.title=on?'Keluar layar penuh':'Layar penuh';setTimeout(()=>map.invalidateSize(),120)};
  document.addEventListener('fullscreenchange',onFs);document.addEventListener('webkitfullscreenchange',onFs)}
 L.DomEvent.disableClickPropagation(d);return d};tools.addTo(map);

// ---- Panah utara ----
const northCtl=L.control({position:'topright'});northCtl.onAdd=()=>{const d=L.DomUtil.create('div','north');d.title='Arah Utara';
 d.innerHTML='<svg viewBox="0 0 30 46"><text x="15" y="11" text-anchor="middle" font-family="Plus Jakarta Sans,Arial,sans-serif" font-weight="800" font-size="11" fill="#0f3d2e">U</text><path d="M15 14 L23 42 L15 36 Z" fill="#0f3d2e"/><path d="M15 14 L7 42 L15 36 Z" fill="#fff" stroke="#0f3d2e" stroke-width="1.2" stroke-linejoin="round"/></svg>';return d};

// ---- Koordinat (lat/lng + UTM 48S) ----
const UTM48S='+proj=utm +zone=48 +south +datum=WGS84 +units=m +no_defs';
const hasProj=typeof proj4==='function';
function showCoord(ll){$('cLL').textContent=`Lat ${fmtN(ll.lat,5)}, Lng ${fmtN(ll.lng,5)}`;
 if(hasProj){try{const[x,y]=proj4('EPSG:4326',UTM48S,[ll.lng,ll.lat]);$('cUTM').textContent=`UTM 48S  X ${fmtN(x,0)}  Y ${fmtN(y,0)}`}catch(e){}}
 $('cZ').textContent='Zoom '+map.getZoom()}
map.on('mousemove',e=>showCoord(e.latlng));map.on('click',e=>showCoord(e.latlng));map.on('moveend',()=>showCoord(map.getCenter()));showCoord(map.getCenter());

// ---- Panel: desktop collapse / mobile off-canvas ----
const mobile=()=>window.matchMedia('(max-width:760px)').matches;
$('toggle').onclick=()=>{if(mobile())$('panel').classList.toggle('open');else{document.body.classList.toggle('collapsed');setTimeout(()=>map.invalidateSize({pan:false}),280)}};
map.on('click',()=>{if(mobile())$('panel').classList.remove('open')});

// ---- Cetak ----
$('printBtn').onclick=()=>window.print();
window.addEventListener('beforeprint',()=>{map.invalidateSize({pan:false});if(homeBounds)map.fitBounds(homeBounds,{animate:false})});
window.addEventListener('afterprint',()=>setTimeout(()=>map.invalidateSize(),50));
