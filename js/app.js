// Label Code — ubah di sini saja
// Asumsi: Code 1 = bulan berjalan (Okt 2026), Code 0 = bulan sebelumnya (Sep 2026)
const CODE_LABELS={"1":"LC Oct 2026","0":"LC Sep 2026"};
// Warna diambil dari peta ArcGIS Pro (PDF): LC Oct #FFFF00, garis tepi #595959; LC Sep arsir garis vertikal kuning
const LC_FILL='#FFFF00',LC_LINE='#595959',BATAS_COLOR='#333333',BLOK_COLOR='#555555';
const CODE_COLORS={"1":LC_FILL,"0":'#FFFFB3'};
const DATA_URL='data/land_clearing.geojson?v=202611050206';
const BATAS_URL='data/batas_kebun.geojson?v=202611050206';
const BLOK_URL='data/blok_sawit.geojson?v=202611050206';
const BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'});
const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri World Imagery'});
const blank=L.tileLayer('data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',{maxZoom:19,attribution:'Polos'});
const map=L.map('map',{layers:[sat]}).setView([-3.71,104.45],13);
L.control.scale({imperial:false}).addTo(map);
let data,layer,batas,blok,nBlok=0,first=true;
map.createPane('blokPane');map.getPane('blokPane').style.zIndex=340;map.createPane('batasPane');map.getPane('batasPane').style.zIndex=350;
const $=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});
const v=x=>(x===null||x===undefined||x==='')?'-':x;
const codeLbl=c=>CODE_LABELS[c]||('Code '+c);
const tgl=s=>{if(!s)return'-';const[y,m,d]=s.split('-');return `${+d} ${BLN[m-1]} ${y}`};
function style(f){const c=f.properties.Code;return c=='1'?{color:LC_LINE,weight:1,fillColor:LC_FILL,fillOpacity:1}:{color:LC_LINE,weight:1,fillColor:'url(#lcSepHatch)',fillOpacity:1}}
function ensureHatch(){const svg=document.querySelector('.leaflet-overlay-pane svg');if(!svg||svg.querySelector('#lcSepHatch'))return;
 const ns='http://www.w3.org/2000/svg';let defs=svg.querySelector('defs');if(!defs){defs=document.createElementNS(ns,'defs');svg.insertBefore(defs,svg.firstChild)}
 defs.innerHTML='<pattern id="lcSepHatch" patternUnits="userSpaceOnUse" width="7" height="7"><rect width="7" height="7" fill="#FFFFE0" fill-opacity="0.85"/><line x1="1.5" y1="0" x2="1.5" y2="7" stroke="#FFFF00" stroke-width="2"/></pattern>'}
function popup(p){return `<b>Land Clearing #${p.OBJECTID}</b><br>Luas: ${fmt(p.Luas)} ha<br>Tanggal: ${tgl(p.Tanggal)}<br>Pengerjaan: ${v(p.Pengerjaan)}<br>Operator: ${v(p.Operator)}<br>Code: ${codeLbl(p.Code)}`}
function group(fs,key,lab=k=>k){const g={};fs.forEach(f=>{const k=v(f.properties[key]);g[k]=(g[k]||0)+f.properties.Luas});return g}
function bars(g,lab=k=>k,keys){keys=keys||Object.keys(g).sort();const mx=Math.max(...Object.values(g),0);
 return keys.map(k=>`<div class="row"><span>${lab(k)}</span><b>${fmt(g[k])} ha</b></div><div class="bar"><div style="width:${mx?g[k]/mx*100:0}%"></div></div>`).join('')||'<i>Tidak ada data</i>'}
function filtered(){const c=$('fCode').value,pg=$('fPeng').value,op=$('fOp').value,a=$('fFrom').value,b=$('fTo').value;
 return data.features.filter(f=>{const p=f.properties;
  if(c&&p.Code!=c)return false;if(pg&&v(p.Pengerjaan)!=pg)return false;if(op&&v(p.Operator)!=op)return false;
  if((a||b)&&!p.Tanggal)return false;if(a&&p.Tanggal<a)return false;if(b&&p.Tanggal>b)return false;return true})}
function render(){const fs=filtered();
 if(layer)map.removeLayer(layer);
 layer=L.geoJSON({type:'FeatureCollection',features:fs},{style,onEachFeature:(f,l)=>l.bindPopup(popup(f.properties))}).addTo(map);ensureHatch();
 if(first&&fs.length){const b=layer.getBounds();if(batas)b.extend(batas.getBounds());map.fitBounds(b,{padding:[20,20]});first=false;const h=location.hash.match(/^#(\d+)\/(-?[\d.]+)\/(-?[\d.]+)/);if(h)map.setView([+h[2],+h[3]],+h[1])}
 const tot=fs.reduce((t,f)=>t+f.properties.Luas,0);
 $('summary').innerHTML=`<div>Jumlah poligon: <b id="nPoly">${fs.length}</b></div><div>Total luas: <b id="totLuas">${fmt(tot)}</b> ha</div>`+(batas?`<div>Luas Batas Kebun: <b id="luasBatas">${fmt(batasHa)}</b> ha</div>`:'')+(blok?`<div>Jumlah Blok: <b id="nBlok">${nBlok}</b></div>`:'');
 $('perCode').innerHTML=bars(group(fs,'Code'),codeLbl,Object.keys(group(fs,'Code')).sort().reverse());
 $('perPeng').innerHTML=bars(group(fs,'Pengerjaan'));
 $('perOp').innerHTML=bars(group(fs,'Operator'));
 const gt=group(fs,'Tanggal');$('perTgl').innerHTML=bars(gt,tgl,Object.keys(gt).sort((x,y)=>x=='-'?1:y=='-'?-1:x<y?-1:1));
 window.RENDERED=layer.getLayers().length;window.TOTAL=tot}
let batasHa=0;
function batasPopup(p){return `<b>${v(p.Name)}</b><br>Luas: ${fmt(+p.LuasHa)} ha`}
const getJ=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});
Promise.all([getJ(DATA_URL),getJ(BATAS_URL).catch(e=>{console.warn('Batas kebun gagal dimuat',e);return null}),getJ(BLOK_URL).catch(e=>{console.warn('Blok sawit gagal dimuat',e);return null})]).then(([d,bk,bl])=>{data=d;
 if(bl){nBlok=bl.features.length;blok=L.geoJSON(bl,{pane:'blokPane',style:{color:BLOK_COLOR,weight:1,opacity:1,fill:true,fillOpacity:0},
  onEachFeature:(f,l)=>{const p=f.properties;l.bindPopup(`<b>${v(p.Blok)}</b><br>Luas: ${fmt(+p.LuasHa)} ha<br>Ukuran Blok: ${v(p.UkuranBlok)}`);const m=String(p.Blok||'').match(/^Blok\s*(\d+)$/);const num=p.No_Blok!=null?p.No_Blok:(m?m[1]:null);l.bindTooltip(num!=null?String(num):v(p.Blok).replace(/^Blok\s*/,''),{permanent:true,direction:'center',className:num!=null?'blok-lbl':'blok-lbl blok-lbl-sm'})}}).addTo(map);
  const upd=()=>{const z=map.getZoom(),c=map.getContainer();c.classList.toggle('hide-blok-lbl',z<14);c.style.setProperty('--blokfs',Math.round(12*Math.pow(1.45,z-14))+'px')};map.on('zoomend',upd);upd()}
 if(bk){batas=L.geoJSON(bk,{pane:'batasPane',style:{color:BATAS_COLOR,weight:2.5,fill:false,opacity:1},
  onEachFeature:(f,l)=>{l.bindPopup(batasPopup(f.properties));l.bindTooltip(`${v(f.properties.Name)} – ${fmt(+f.properties.LuasHa)} ha`,{sticky:true})}}).addTo(map);
  batasHa=bk.features.reduce((t,f)=>t+(+f.properties.LuasHa||0),0)}
const P=d.features.map(f=>f.properties);
 ['1','0'].filter(c=>P.some(p=>p.Code==c)).forEach(c=>$('fCode').add(new Option(codeLbl(c),c)));
 [['fPeng','Pengerjaan'],['fOp','Operator']].forEach(([id,k])=>[...new Set(P.map(p=>v(p[k])))].sort().forEach(x=>$(id).add(new Option(x,x))));
 const ds=P.map(p=>p.Tanggal).filter(Boolean).sort();['fFrom','fTo'].forEach(i=>{$(i).min=ds[0];$(i).max=ds[ds.length-1]});
 L.control.layers({'Citra Satelit (Esri)':sat,'OpenStreetMap':osm,'Polos (Putih)':blank},Object.assign({},batas?{'Batas Kebun DNP':batas}:{},blok?{'Blok Kebun':blok}:{})).addTo(map);
 ['fCode','fPeng','fOp','fFrom','fTo'].forEach(i=>$(i).onchange=render);
 $('reset').onclick=()=>{['fCode','fPeng','fOp','fFrom','fTo'].forEach(i=>$(i).value='');render()};
 render();window.APP_OK=true});
const lg=L.control({position:'bottomright'});lg.onAdd=()=>{const d=L.DomUtil.create('div','legend');const it=(sw,t)=>`<div class="lg-row"><i style="${sw}"></i>${t}</div>`;
 d.innerHTML='<div class="lg-title">LEGENDA</div>'+it(`background:${LC_FILL};border:1px solid ${LC_LINE}`,codeLbl('1'))+it(`background:repeating-linear-gradient(90deg,#FFFF00 0 2px,#FFFFE0 2px 7px);border:1px solid ${LC_LINE}`,codeLbl('0'))
 +it(`background:#fff;border:2.5px solid ${BATAS_COLOR}`,'Batas Kebun DNP (288,66 Ha)')+it(`background:#fff;border:1px solid ${BLOK_COLOR}`,'Blok Kebun');return d};lg.addTo(map);
$('toggle').onclick=()=>$('panel').classList.toggle('open');
