const WARNA={"Belum Mulai":"#e53935","Proses":"#fdd835","Selesai":"#43a047"};
const osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'});
const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri World Imagery'});
const map=L.map('map',{layers:[sat]}).setView([0.28,101.92],14);
L.control.scale({imperial:false}).addTo(map);
let data,layer;
const fmt=n=>n.toLocaleString('id-ID',{maximumFractionDigits:1});
function style(f){return{color:'#fff',weight:1.5,fillColor:WARNA[f.properties.status],fillOpacity:.6}}
function popup(p){return `<b>Blok ${p.blok}</b> <small>(Data Contoh)</small><br>Afdeling: ${p.afdeling}<br>Luas: ${fmt(p.luas_ha)} ha<br>Selesai: ${fmt(p.ha_selesai)} ha<br>Progres: ${fmt(p.persen)}%<br>Status: ${p.status}<br>Update: ${p.tanggal_update}`}
function render(){
 const a=fAfd.value,s=fSt.value,q=document.getElementById('q').value.trim().toLowerCase();
 const fs=data.features.filter(f=>{const p=f.properties;return(!a||p.afdeling==a)&&(!s||p.status==s)&&(!q||p.blok.toLowerCase().includes(q))});
 if(layer)map.removeLayer(layer);
 layer=L.geoJSON({type:'FeatureCollection',features:fs},{style,onEachFeature:(f,l)=>{l.bindPopup(popup(f.properties));l.bindTooltip(f.properties.blok,{permanent:true,direction:'center',className:''})}}).addTo(map);
 if(fs.length)map.fitBounds(layer.getBounds(),{padding:[20,20]});
 if(q&&fs.length==1)layer.getLayers()[0].openPopup();
 const tot=fs.reduce((t,f)=>t+f.properties.luas_ha,0),sel=fs.reduce((t,f)=>t+f.properties.ha_selesai,0);
 summary.innerHTML=`<div>Jumlah blok: <b>${fs.length}</b></div><div>Total luas: <b>${fmt(tot)} ha</b></div><div>Ha selesai: <b>${fmt(sel)} ha</b></div><div class="big">${tot?fmt(sel/tot*100):0}%</div><div class="bar"><div style="width:${tot?sel/tot*100:0}%"></div></div>`;
 const g={};fs.forEach(f=>{const p=f.properties;g[p.afdeling]=g[p.afdeling]||[0,0];g[p.afdeling][0]+=p.luas_ha;g[p.afdeling][1]+=p.ha_selesai});
 perAfd.innerHTML=Object.keys(g).sort().map(k=>{const pc=g[k][1]/g[k][0]*100;return `<div>${k}: ${fmt(g[k][1])}/${fmt(g[k][0])} ha (${fmt(pc)}%)</div><div class="bar"><div style="width:${pc}%"></div></div>`}).join('')||'<i>Tidak ada data</i>';
}
fetch('data/blok.geojson').then(r=>r.json()).then(d=>{data=d;
 [...new Set(d.features.map(f=>f.properties.afdeling))].sort().forEach(x=>fAfd.add(new Option(x,x)));
 const ov={'Blok Kebun (Data Contoh)':L.layerGroup()};
 L.control.layers({'Citra Satelit (Esri)':sat,'OpenStreetMap':osm}).addTo(map);
 ['fAfd','fSt'].forEach(i=>document.getElementById(i).onchange=render);document.getElementById('q').oninput=render;
 render();window.APP_OK=true;});
const lg=L.control({position:'bottomright'});lg.onAdd=()=>{const d=L.DomUtil.create('div','legend');d.innerHTML='<b>Status Blok</b><br><small>Data Contoh</small><br>'+Object.entries(WARNA).map(([k,v])=>`<i style="background:${v}"></i>${k}`).join('<br>');return d};lg.addTo(map);
toggle.onclick=()=>panel.classList.toggle('open');
