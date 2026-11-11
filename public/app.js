const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let mode='create', kind='vocal', gender='Pria';
let songs=JSON.parse(localStorage.getItem('nadirSongs')||'[]');
const notice=$('#notice');
function showNotice(msg,type='info'){notice.textContent=msg;notice.className=`notice show ${type}`;}
function updateCounts(){$('#libraryCount').textContent=songs.length;$('#lyricCount').textContent=`${$('#lyrics').value.length} / 5000`;$('#promptCount').textContent=`${$('#prompt').value.length} / 2000`;}
function saveSongs(){localStorage.setItem('nadirSongs',JSON.stringify(songs));updateCounts();renderLibrary();}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('selected',x===b));$('#coverNote').classList.toggle('show',mode==='cover');}));
$$('[data-kind]').forEach(b=>b.addEventListener('click',()=>{kind=b.dataset.kind;$$('[data-kind]').forEach(x=>x.classList.toggle('selected',x===b));}));
$$('[data-gender]').forEach(b=>b.addEventListener('click',()=>{gender=b.dataset.gender;$$('[data-gender]').forEach(x=>x.classList.toggle('selected',x===b));}));
$('#lyrics').addEventListener('input',updateCounts);$('#prompt').addEventListener('input',updateCounts);
function showView(v){$('#createView').classList.toggle('active',v==='create');$('#libraryView').classList.toggle('active',v==='library');$('#crumbCurrent').textContent=v==='create'?'KOMPOSER':'LIBRARY';$$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$('#sidebar').classList.remove('open');}
$$('.nav-link').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));$('#backToCreate').addEventListener('click',()=>showView('create'));$('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function pollTask(song){
  for(let i=0;i<60;i++){
    await sleep(10000);
    const r=await fetch(`/api/tasks/${encodeURIComponent(song.taskId)}`),d=await r.json();
    if(!r.ok)throw Error(d.error||'Gagal memeriksa status task.');
    song.status=d.status;
    if(d.audioUrl){song.audioUrl=d.audioUrl;saveSongs();showNotice(`Lagu "${song.title}" selesai dibuat.`,'success');return;}
    saveSongs();
    if(d.status==='failed')throw Error('Pembuatan lagu gagal. Periksa task di dashboard Kie.ai.');
    showNotice(`Lagu sedang dibuat oleh AI… pemeriksaan ${i+1}/60`);
  }
  showNotice('Lagu masih diproses. Periksa kembali Library beberapa saat lagi.');
}
$('#musicForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const title=$('#title').value.trim(),prompt=$('#prompt').value.trim(),lyrics=$('#lyrics').value.trim(),instrumental=kind==='instrumental';
 if(!title||!prompt)return showNotice('Isi judul dan Music Prompt terlebih dahulu.','error');
 if(mode==='cover')return showNotice('Fitur cover belum diaktifkan; perlu endpoint cover khusus dari Kie.ai.','info');
 const btn=$('#generateBtn');btn.disabled=true;btn.textContent='MENGHUBUNGI KIE.AI…';showNotice('Mengirim permintaan pembuatan lagu…');
 try{
  const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,lyrics,prompt,genre:$('#genre').value,vocalGender:gender,instrumental})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Permintaan gagal.');
  const song={id:Date.now(),title,genre:$('#genre').value,status:'submitted',audioUrl:null,taskId:d.taskId,createdAt:new Date().toISOString()};
  songs.unshift(song);saveSongs();showNotice('Task diterima Kie.ai. Lagu sedang diproses.','success');
  pollTask(song).catch(err=>showNotice(err.message,'error'));
 }catch(err){showNotice(err.message,'error');}
 finally{btn.disabled=false;btn.innerHTML='<span>✦</span> GENERATE MUSIC <b>→</b>';}
});
function renderLibrary(){
 const wrap=$('#libraryItems');$('#librarySubtitle').textContent=songs.length?`${songs.length} item tersimpan di perangkat ini.`:'Belum ada lagu tersimpan.';
 if(!songs.length){wrap.innerHTML='<div class="empty-state"><div>♫</div><strong>Library masih kosong</strong><p>Lagu yang berhasil dibuat dan audio yang kamu tambahkan akan muncul di sini.</p></div>';return;}
 wrap.innerHTML=songs.map(s=>`<div class="song-item"><div class="song-art">♫</div><div class="song-meta"><strong>${esc(s.title)}</strong><small>${esc(s.genre||'AI Music')} · ${s.audioUrl?'Audio tersedia':esc(s.status||'Diproses')}</small></div><div class="song-actions">${s.audioUrl?`<button data-play="${s.id}">▶ Putar</button><a href="${esc(s.audioUrl)}" target="_blank" rel="noopener"><button>↓ Unduh</button></a>`:`<button disabled>${esc(s.status||'Diproses')}</button>`}<button data-delete="${s.id}">Hapus</button></div></div>`).join('');
 wrap.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>playSong(songs.find(s=>s.id==b.dataset.play))));
 wrap.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{songs=songs.filter(s=>s.id!=b.dataset.delete);saveSongs();}));
}
function playSong(s){if(!s?.audioUrl)return;$('#audioPlayer').src=s.audioUrl;$('#playerTitle').textContent=s.title;$('#playerSubtitle').textContent=s.genre||'Nadir Music AI';$('#playerBar').classList.add('show');$('#audioPlayer').play().catch(()=>{});}
$('#closePlayer').addEventListener('click',()=>{$('#audioPlayer').pause();$('#playerBar').classList.remove('show');});
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
updateCounts();renderLibrary();
