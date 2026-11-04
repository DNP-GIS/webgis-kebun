// Label Code — ubah di sini saja
const CODE_LABELS={"1":"Dikerjakan Bulan Ini","0":"Bulan Sebelumnya"};
const CODE_COLORS={"1":"#ff1744","0":"#ffc107"};
const DATA_URL='data/land_clearing.geojson';
const BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'});
const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri World Imagery'});
const map=L.map('map',{layers:[sat]}).setView([-3.71,104.45],13);
L.control.scale({imperial:false}).addTo(map);
let data,layer,first=true;
const $=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});
const v=x=>(x===null||x===undefined||x==='')?'-':x;
const codeLbl=c=>CODE_LABELS[c]||('Code '+c);
const tgl=s=>{if(!s)return'-';const[y,m,d]=s.split('-');return `${+d} ${BLN[m-1]} ${y}`};
function style(f){const c=f.properties.Code;return{color:c=='1'?'#fff':'#333',weight:c=='1'?2.5:1,fillColor:CODE_COLORS[c]||'#999',fillOpacity:c=='1'?.75:.5}}
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
 layer=L.geoJSON({type:'FeatureCollection',features:fs},{style,onEachFeature:(f,l)=>l.bindPopup(popup(f.properties))}).addTo(map);
 if(first&&fs.length){map.fitBounds(layer.getBounds(),{padding:[20,20]});first=false}
 const tot=fs.reduce((t,f)=>t+f.properties.Luas,0);
 $('summary').innerHTML=`<div>Jumlah poligon: <b id="nPoly">${fs.length}</b></div><div>Total luas: <b id="totLuas">${fmt(tot)}</b> ha</div>`;
 $('perCode').innerHTML=bars(group(fs,'Code'),codeLbl,Object.keys(group(fs,'Code')).sort().reverse());
 $('perPeng').innerHTML=bars(group(fs,'Pengerjaan'));
 $('perOp').innerHTML=bars(group(fs,'Operator'));
 const gt=group(fs,'Tanggal');$('perTgl').innerHTML=bars(gt,tgl,Object.keys(gt).sort((x,y)=>x=='-'?1:y=='-'?-1:x<y?-1:1));
 window.RENDERED=layer.getLayers().length;window.TOTAL=tot}
fetch(DATA_URL).then(r=>r.json()).then(d=>{data=d;const P=d.features.map(f=>f.properties);
 ['1','0'].filter(c=>P.some(p=>p.Code==c)).forEach(c=>$('fCode').add(new Option(codeLbl(c),c)));
 [['fPeng','Pengerjaan'],['fOp','Operator']].forEach(([id,k])=>[...new Set(P.map(p=>v(p[k])))].sort().forEach(x=>$(id).add(new Option(x,x))));
 const ds=P.map(p=>p.Tanggal).filter(Boolean).sort();['fFrom','fTo'].forEach(i=>{$(i).min=ds[0];$(i).max=ds[ds.length-1]});
 L.control.layers({'Citra Satelit (Esri)':sat,'OpenStreetMap':osm}).addTo(map);
 ['fCode','fPeng','fOp','fFrom','fTo'].forEach(i=>$(i).onchange=render);
 $('reset').onclick=()=>{['fCode','fPeng','fOp','fFrom','fTo'].forEach(i=>$(i).value='');render()};
 render();window.APP_OK=true});
const lg=L.control({position:'bottomright'});lg.onAdd=()=>{const d=L.DomUtil.create('div','legend');d.innerHTML='<b>Land Clearing</b><br>'+['1','0'].map(k=>`<i style="background:${CODE_COLORS[k]}"></i>${codeLbl(k)}`).join('<br>');return d};lg.addTo(map);
$('toggle').onclick=()=>$('panel').classList.toggle('open');
