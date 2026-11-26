// HSK 3.0 サンプル問題の演習画面（HSKQ の chatgpt 版と同じ構成）。
const main=document.querySelector('main');
const dialog=document.querySelector('dialog');
const key=book.keys;
const total=layout.scopes.reduce((a,s)=>a+s[1],0);
const sections=layout.parts.map(p=>[p[1],p[3]]);
const modes={all:'全'+total+'問の通し演習'};
const ranges={all:[1,total]};
for(const [scope] of layout.scopes){modes[scope]=scopeNames[scope];ranges[scope]=rangeOf(scope);}
const singleScope=layout.scopes.length===1;
const storeKey='hsk3-sample-'+paperId+'-v1';
let state;
try{state=JSON.parse(localStorage.getItem(storeKey))||{};}catch{state={};}
state.drafts=state.drafts||{};
state.history=state.history||[];
state.preferences=state.preferences||{};
let storageOK=true;
const save=()=>{try{localStorage.setItem(storeKey,JSON.stringify(state));}catch{storageOK=false;}};
const ids=mode=>Array.from({length:ranges[mode][1]-ranges[mode][0]+1},(_,i)=>ranges[mode][0]+i);
const iconPaths={
 headphones:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>',
 book:'<path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1v14"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 paper:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
 pen:'<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13 7 4 4"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
 layers:'<path d="m3 8 9-5 9 5-9 5-9-5Zm1 5 8 4 8-4M4 17l8 4 8-4"/>',
 play:'<path d="m8 5 10 7-10 7Z" fill="currentColor" stroke="none"/>',
 history:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2"/>'
};
const scopeIcons={listen:'headphones',read:'book',write:'pen',translate:'globe',speak:'mic'};
const scopeStyles={listen:'mint',read:'gold',write:'mint',translate:'gold',speak:'mint'};
const scopeDescriptions={
 listen:'音声を聞いて答えます。1問ずつ聞き直せます。',
 read:'問題冊子の文章を読み、答えを選びます。',
 write:'漢字や文、作文を書きます。作文は解答例・解説と照らして自己確認します。',
 translate:'外国語の文章を中国語に訳します（筆記・口頭）。',
 speak:'音声の指示を聞いて口頭で答えます。話した後で自己確認します。'
};
function icon(name){return '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+iconPaths[name]+'</svg>';}
function section(n){return layout.parts.findIndex(p=>n<=p[0]);}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

const sessionLabels={practice:'練習モード',exam:'試験モード'};
const orderLabels={original:'原題順',random:'ランダム順'};
function draftId(scope,kind,order){return [scope,kind,order].join('/');}
function validSettings(scope,kind,order){
 return Object.prototype.hasOwnProperty.call(modes,scope)&&
  Object.prototype.hasOwnProperty.call(sessionLabels,kind)&&
  Object.prototype.hasOwnProperty.call(orderLabels,order);
}
function questionOrder(scope,order){
 const list=ids(scope);
 if(order==='random'){
  for(let i=list.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [list[i],list[j]]=[list[j],list[i]];
  }
  if(list.length>1&&list.every((n,i)=>n===ranges[scope][0]+i))list.push(list.shift());
 }
 return list;
}
function openSession(scope,kind,order){
 const id=draftId(scope,kind,order);
 if(!state.drafts[id]){
  const sequence=questionOrder(scope,order);
  state.drafts[id]={mode:scope,kind,order,sequence,at:sequence[0],answers:{},first:{},elapsed:0};
 }
 state.preferences[scope]={kind,order};
 save();
 const target='#run/'+id;
 if(location.hash===target)route();else location.hash=target;
}
function setup(scope){
 const pref=state.preferences[scope]||{kind:'practice',order:'original'};
 const radio=(name,value,title,description,checked)=>`<label class="setting-option"><input type="radio" name="${name}" value="${value}" ${checked?'checked':''}><span><strong>${title}</strong><small>${description}</small></span></label>`;
 main.innerHTML=`<div class="crumb"><a href="#home">問題演習</a><em>/</em>${modes[scope]}</div>
  <div class="quiz-head"><div><small class="micro">HSK 3.0 · ${paperInfo.name} · ${ids(scope).length}問</small><h1>${modes[scope]}</h1></div></div>
  <form id="session-settings" class="card settings">
   <fieldset><legend>学習モード</legend><div class="setting-grid">
   ${radio('kind','practice',sessionLabels.practice,'解答すると、正解とその理由が日本語で表示されます。間違えたら選び直してから進みます。',pref.kind==='practice')}
   ${radio('kind','exam',sessionLabels.exam,'提出するまで正誤は表示されません。経過時間を見ながら、本番のように解けます。',pref.kind==='exam')}</div></fieldset>
   <fieldset><legend>出題順</legend><div class="setting-grid">
   ${radio('order','original',orderLabels.original,'問題冊子と同じ順番で解きます。',pref.order==='original')}
   ${radio('order','random',orderLabels.random,'選んだ範囲の問題を並べ替えます。',pref.order==='random')}</div></fieldset>
   <p class="session-status" aria-live="polite"></p><button class="solid" type="submit"></button>
  </form>`;
 const form=main.querySelector('form');
 function update(){
  const {kind,order}=form.elements;
  const d=state.drafts[draftId(scope,kind.value,order.value)];
  form.querySelector('.session-status').textContent=d?`保存済みの続き：${d.sequence.indexOf(d.at)+1}問目 ／ 全${d.sequence.length}問`:'';
  form.querySelector('button').textContent=d?'続きから解く':kind.value==='practice'?'練習を始める':'試験を始める';
 }
 form.onchange=update;
 form.onsubmit=e=>{e.preventDefault();openSession(scope,form.elements.kind.value,form.elements.order.value);};
 update();
}

function stats(r){return (r.sequence||ids(r.mode)).filter(n=>isCorrect(r,n)).length;}
function launch(mode){return '#practice/'+mode;}
function startText(mode){return mode==='all'?'全'+total+'問を解く':'問題を解く';}
function minutesOf(scope){
 if(scope==='all')return layout.totalMinutes;
 const s=layout.scopes.find(x=>x[0]===scope);
 return s?s[2]:0;
}
function moduleCard(scope){
 const range=ranges[scope];
 return `<a class="module ${scopeStyles[scope]}" href="${launch(scope)}"><div class="module-top"><span class="module-icon">${icon(scopeIcons[scope])}</span><span class="module-en">第${range[0]}〜${range[1]}問</span></div><h3>${modes[scope]}</h3><p>${scopeDescriptions[scope]}</p><div class="module-bottom"><span>${ids(scope).length}問 <b>·</b> 約${minutesOf(scope)}分</span><span class="module-link">${startText(scope)}</span></div></a>`;
}
function paperSelector(view){
 const written=paperCodes.filter(c=>!paperCatalog[c].oral), oral=paperCodes.filter(c=>paperCatalog[c].oral);
 const links=codes=>codes.map(code=>`<a href="?paper=${code}#${view}" ${code===paperId?'aria-current="page"':''}>${paperCatalog[code].name}</a>`).join('');
 return `<nav class="paper-selector multi" aria-label="サンプル問題を選ぶ"><details class="paper-menu"><summary>サンプル問題を選ぶ <span>HSK 3.0 · ${paperInfo.name}</span></summary>
  <details ${paperInfo.oral?'':'open'}><summary>筆記試験（1〜6級・7〜9級）</summary><div>${links(written)}</div></details>
  <details ${paperInfo.oral?'open':''}><summary>口語試験（3〜6級）</summary><div>${links(oral)}</div></details></details></nav>`;
}
function structureTable(){
 let start=1;
 const rows=layout.parts.map((p,i)=>{
  const from=start;start=p[0]+1;
  const scope=scopeOf(from);
  return `<tr><td>第${from}${p[0]>from?'〜'+p[0]:''}問<small>${modes[scope]}</small></td><td><strong>${esc(p[1])}</strong><small>${esc(p[3])}</small></td></tr>`;
 }).join('');
 return `<details class="guide structure"><summary>試験の構成（${layout.parts.length}部分・全${total}問）</summary><div class="table-wrap"><table><thead><tr><th>問題</th><th>内容</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}
function homeHeading(){
 const cards=singleScope?'':`<section class="modules"><div class="section-heading"><h2>分野別に練習する</h2></div><div class="module-grid">${scopeList.map(moduleCard).join('')}</div></section>`;
 const full=paperInfo.media.main?`<div class="paper-link">${icon('headphones')}<div><strong>${paperInfo.oral?'口語試験の音声（通し）':'リスニングの音声（通し）'}</strong><small>本番と同じ流れで最初から最後まで再生できます。</small></div><a href="${samplePath(paperInfo.media.main)}" target="_blank" rel="noopener">音声を開く</a></div>`:'';
 const answerLink=paperInfo.answers?`<div class="paper-link">${icon('paper')}<div><strong>解答（原本）</strong><small>${paperInfo.name} · PDF</small></div><a href="${samplePath(paperInfo.answers)}" target="_blank" rel="noopener">PDFを開く</a></div>`:'';
 return `<div class="crumb">問題演習 <em>/</em> HSK 3.0 ${paperInfo.name}</div>${paperSelector('home')}
 <article class="hero"><div class="hero-art" role="presentation"></div><div class="hero-copy"><div class="hero-meta"><span class="level"><i></i> HSK 3.0</span><span class="mono">サンプル問題</span></div><h1>HSK 3.0<br>${paperInfo.name}${paperInfo.oral?'':' 演習'}</h1><div class="facts"><span>${icon('paper')}全${total}問</span><span>${icon('clock')}試験時間 約${layout.totalMinutes}分</span></div><a class="solid" href="${launch(singleScope?scopeList[0]:'all')}">${icon('play')}${startText(singleScope?scopeList[0]:'all')}</a></div></article>
 ${cards}
 ${structureTable()}
 <details class="guide"><summary>演習の進め方</summary><p>練習モードでは解答後に日本語の解説を読み、正解してから次に進みます。試験モードでは提出後に全問を復習できます。進捗はこの端末にサンプル問題ごとに保存されます。${book.sourceNote?'<br>'+esc(book.sourceNote):''}</p></details>
 <div class="links">
 <div class="paper-link">${icon('paper')}<div><strong>中国語の問題冊子（原本）</strong><small>${paperInfo.name} · PDF · 全${book.pages}ページ</small></div><a href="${samplePath(paperInfo.pdf)}" target="_blank" rel="noopener">PDFを開く</a></div>
 ${answerLink}${full}</div>`;
}
function home(){main.innerHTML=homeHeading();}

const tfLabels={'√':'一致する','×':'一致しない','〇':'言及なし'};
function options(n){
 const type=partType(n);
 if(isWritten(n))return [];
 return [...type].map(v=>({v,body:tfLabels[v]?`<span>${tfLabels[v]}</span>`:''}));
}

function note(n){return (book.notes&&book.notes[n-1])||null;}
function explanationFor(n){
 const parts=note(n), source=(book.sources&&book.sources[n])||'';
 const manual=isManual(n);
 const reason=parts?`<p>${esc(parts[1])}</p>${parts[2]?`<p>${esc(parts[2])}</p>`:''}`:`<p>${manual?'参考答案（ある場合）と照らし合わせて確認しましょう。':'正解の選択肢を問題冊子で確認しましょう。'}</p>`;
 const sourceTitle=scopeOf(n)==='listen'||partType(n)==='speak'?'音声の原文':'問題文';
 return `<div class="answer-reason"><strong>${manual?'解答のポイント':'正解の理由'}</strong>${reason}</div>
 <div class="source-note">${source?`<h4>${sourceTitle}</h4><p lang="zh-CN">${esc(source)}</p>${book.sourceNote&&sourceTitle==='音声の原文'?`<small class="source-caution">${esc(book.sourceNote)}</small>`:''}`:''}${parts&&parts[0]?`<h4>日本語での意味・要点</h4><p>${esc(parts[0])}</p>`:''}</div>`;
}
function answerText(n){
 const correct=key[n-1];
 if(tfLabels[correct])return correct+'（'+tfLabels[correct]+'）';
 return correct||'';
}
function resultExplanations(record,seq,firstOpen){
 const items=seq.map((n,index)=>{
  const answer=record.answers[n],status=isManual(n)?(answer||(record.checked&&record.checked[n])?'自己確認':'未解答'):!answer?'未解答':isCorrect(record,n)?'正解':'不正解';
  return `<details class="question-detail" data-original="${n}" ${n===firstOpen?'open':''}><summary>${index+1}問目（原題 第${n}問）・${status}</summary>
  <div class="detail-body"><p>${record.kind==='practice'&&!isManual(n)?'初回の解答':'あなたの解答'}：${esc(answer||'未解答')}　${isManual(n)?'解答例':'正解'}：${esc(answerText(n)||'解説を参照')}</p>
  ${explanationFor(n)}
  <a class="textlink" href="#review/${record.id}/${n}">${isWritten(n)?'問題と記述を見直す':'問題と選択肢を見直す'}</a></div></details>`;
 });
 return `<section class="card all-explanations"><h2>全${seq.length}問の解説</h2>${items.join('')}</section>`;
}

// 問題冊子の画像
function contentPages(){
 const blank=new Set(book.blankPages||[]);
 return Array.from({length:book.pages-1},(_,j)=>j+2).filter(i=>!blank.has(i));
}
function originalPanel(n){
 const pages=book.questionPages[n-1],first=pages[0];
 const pageOptions=contentPages().map(i=>`<option value="${i}" ${i===first?'selected':''}>${i}ページ</option>`).join('');
 return `<section class="original"><div class="original-tools"><strong>原題 第${n}問</strong><label>冊子 <select aria-label="問題冊子の表示ページ">${pageOptions}</select></label></div>
 <div class="original-actions"><button type="button" class="page-zoom" aria-pressed="false">拡大する</button>${book.marks[n]?'<button type="button" class="page-locate">この問題の位置へ</button>':''}</div>
 <div class="page-images" tabindex="0" aria-label="問題冊子。スクロールして読めます">${pages.map(i=>pagePicture(i,n)).join('')}</div></section>`;
}
function pagePicture(i,n){
 const path=assetDir+'pages/'+i+'.webp';
 const mark=book.marks[n]&&book.marks[n][0]===i&&book.marks[n];
 const pointer=mark?`<span class="printed-marker" aria-hidden="true" style="left:${mark[1]}%;top:${mark[2]}%"></span>`:'';
 return `<a class="printed-page" href="${path}" target="_blank" rel="noopener"><img src="${path}" alt="HSK 3.0 ${paperInfo.name} 問題冊子 ${i}ページ。原寸で開く">${pointer}</a>`;
}
function audioRange(n){
 const a=book.audio&&book.audio[n];
 if(!a)return null;
 return {start:a[0],end:a[1],src:samplePath(paperInfo.media[a[2]||'main'])};
}
function audioPanel(n){
 const a=audioRange(n);
 if(!a)return '';
 const related=Object.entries(book.audio).filter(([,v])=>v[0]===a.start&&v[1]===a.end).map(([k])=>Number(k));
 const title=related.length>1?`第${related[0]}〜${related[related.length-1]}問の共通音声`:`第${n}問の音声`;
 return `<div class="player"><span>${icon('headphones')}${title}</span><audio aria-label="${title}" controls preload="metadata" src="${a.src}#t=${a.start},${a.end}"></audio><button class="replay" type="button">この音声を最初から聞く</button><a class="audio-file" href="${a.src}#t=${a.start},${a.end}" target="_blank" rel="noopener">音声ファイルを開く</a></div>`;
}
function wireOriginal(n){
 const selector=main.querySelector('.original select');
 const viewer=main.querySelector('.page-images'),zoom=main.querySelector('.page-zoom'),locate=main.querySelector('.page-locate');
 function locateQuestion(){
  const marker=viewer.querySelector('.printed-marker');
  if(!marker)return;
  const frame=viewer.getBoundingClientRect(),point=marker.getBoundingClientRect();
  viewer.scrollTop+=point.top-frame.top-20;
  viewer.scrollLeft+=point.left-frame.left-viewer.clientWidth*.12;
 }
 selector.onchange=()=>{
  viewer.innerHTML=pagePicture(Number(selector.value),n);viewer.scrollTop=0;viewer.scrollLeft=0;
  if(locate)locate.disabled=!viewer.querySelector('.printed-marker');
 };
 zoom.onclick=()=>{
  const enlarged=viewer.classList.toggle('enlarged');
  zoom.textContent=enlarged?'元の大きさに戻す':'拡大する';
  zoom.setAttribute('aria-pressed',String(enlarged));
  if(enlarged)locateQuestion();
 };
 if(locate)locate.onclick=locateQuestion;
 // スマートフォンでは冊子の字が小さいので、最初から拡大して問題の位置を表示します。
 if(window.innerWidth<640&&viewer.querySelector('.printed-marker')){
  const img0=viewer.querySelector('img');
  const open=()=>{if(!viewer.classList.contains('enlarged'))zoom.click();};
  if(img0&&img0.complete)open();else if(img0)img0.addEventListener('load',open,{once:true});
 }
 const img=viewer.querySelector('img');
 // 問題の位置が見える範囲に入るまでだけ下へずらし、上にある選択肢の一覧はなるべく残します。
 const settle=()=>{
  const marker=viewer.querySelector('.printed-marker');
  if(!marker||viewer.scrollHeight<=viewer.clientHeight)return;
  const y=marker.getBoundingClientRect().top-viewer.getBoundingClientRect().top+viewer.scrollTop;
  if(y>viewer.clientHeight-70)viewer.scrollTop=y-viewer.clientHeight*.6;
 };
 if(img&&img.complete)settle();else if(img)img.addEventListener('load',settle,{once:true});
 const audio=main.querySelector('.player audio');
 const a=audioRange(n);
 if(!audio||!a)return;
 const {start,end}=a;
 const seekStart=()=>{if(Number.isFinite(audio.duration))audio.currentTime=start;};
 if(audio.readyState>=1)seekStart();else audio.addEventListener('loadedmetadata',seekStart,{once:true});
 audio.addEventListener('seeked',()=>{if(audio.currentTime<start-.3||audio.currentTime>end+.3)seekStart();});
 audio.addEventListener('play',()=>{stopFull();if(audio.currentTime<start-.3||audio.currentTime>=end-.1)audio.currentTime=start;});
 audio.addEventListener('timeupdate',()=>{if(!audio.paused&&audio.currentTime>=end)audio.pause();});
 main.querySelector('.replay').onclick=()=>{audio.currentTime=start;audio.play().catch(()=>{});};
}

// 通し音声（試験モードのリスニング）：画面の切り替えで止まらないよう main の外に置きます。
let fullBar=null,followSession=null;
function stopFull(){if(fullBar){const au=fullBar.querySelector('audio');if(!au.paused)au.pause();}}
function ensureFullBar(){
 if(fullBar)return fullBar;
 fullBar=document.createElement('div');
 fullBar.className='full-bar';
 fullBar.hidden=true;
 fullBar.innerHTML=`<div class="full-inner"><strong>${icon('headphones')}通し音声（本番形式）</strong><audio controls preload="none" src="${samplePath(paperInfo.media.main)}" aria-label="リスニングの通し音声"></audio><label class="follow"><input type="checkbox" checked> 音声に合わせて問題を切り替える</label><button type="button" class="ghost close-full">閉じる</button></div>`;
 document.body.appendChild(fullBar);
 const au=fullBar.querySelector('audio');
 fullBar.querySelector('.close-full').onclick=()=>{au.pause();fullBar.hidden=true;document.body.classList.remove('has-full-bar');};
 au.addEventListener('play',()=>{main.querySelectorAll('.player audio').forEach(x=>x.pause());});
 au.addEventListener('timeupdate',()=>{
  if(!followSession||!fullBar.querySelector('.follow input').checked)return;
  const d=followSession,t=au.currentTime;
  if(!location.hash.startsWith('#run/'))return;
  const hit=d.sequence.find(m=>{const r=book.audio&&book.audio[m];return r&&!r[2]&&t>=r[0]-1&&t<=r[1]+8;});
  if(hit&&hit!==d.at){d.at=hit;save();quiz(d);}
 });
 return fullBar;
}
function fullAudioButton(d){
 if(d.kind!=='exam'||d.order!=='original'||!d.sequence.some(n=>scopeOf(n)==='listen'))return '';
 return `<button type="button" class="ghost wide" id="open-full">${icon('headphones')}通し音声で解く（本番形式）</button>`;
}

function speakTools(n,reviewing){
 if(reviewing||!(window.MediaRecorder&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia))return '';
 return `<div class="recorder"><button type="button" class="ghost" id="record">${icon('mic')}録音する</button><span class="rec-status" aria-live="polite"></span><audio class="rec-audio" controls hidden></audio><small>録音はこの画面を離れると消えます（保存されません）。</small></div>`;
}
let recorder=null;
function wireRecorder(){
 const btn=main.querySelector('#record');
 if(!btn)return;
 const status=main.querySelector('.rec-status'),player=main.querySelector('.rec-audio');
 btn.onclick=async()=>{
  if(recorder&&recorder.state==='recording'){recorder.stop();return;}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const chunks=[];
   recorder=new MediaRecorder(stream);
   recorder.ondataavailable=e=>chunks.push(e.data);
   recorder.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());
    player.src=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType||'audio/webm'}));
    player.hidden=false;status.textContent='録音を聞き返せます。';btn.innerHTML=icon('mic')+'もう一度録音する';
   };
   recorder.start();status.textContent='録音中…';btn.textContent='録音を止める';
  }catch{status.textContent='マイクを使えませんでした。ブラウザーの設定を確認してください。';}
 };
}
function writingPanel(d,n,reviewing){
 const raw=(d.written||{})[n]||d.answers[n]||'';
 const type=partType(n);
 const label=type==='character'?'空欄に入る漢字（1字）':type==='fill'?'中国語で短く答える':type==='speak'?'話した内容のメモ（任意）':'中国語で解答';
 const rows=type==='essay'?(n===total||/作文|短文|翻訳|図表/.test(partOf(n)[1])?8:3):type==='speak'?3:2;
 const counter=type==='essay'?'<small class="char-count" aria-live="polite"></small>':'';
 const checkLabel=type==='speak'?'話し終えた（解答例・解説を見る）':'解答を確認する';
 return `<div class="writing"><label>${label}<textarea id="written" lang="zh-CN" rows="${rows}" ${reviewing?'readonly':''}>${esc(raw)}</textarea></label>${counter}
 ${type==='speak'?speakTools(n,reviewing):''}
 ${!reviewing&&d.kind==='practice'?`<button class="ghost" id="check-written" type="button">${checkLabel}</button>`:''}</div>`;
}
function timerBox(d){
 if(d.kind!=='exam')return '';
 const goal=minutesOf(d.mode);
 return `<p class="timer" aria-live="off">${icon('clock')}経過 <b class="elapsed">0:00</b>${goal?`<small>（目安 ${goal}分）</small>`:''}</p>`;
}
let ticker=null;
function startTicker(d){
 clearInterval(ticker);
 if(d.kind!=='exam')return;
 const out=main.querySelector('.elapsed');
 const show=()=>{const s=d.elapsed||0;out.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 show();
 ticker=setInterval(()=>{
  if(!document.body.contains(out)){clearInterval(ticker);return;}
  if(document.hidden)return;
  d.elapsed=(d.elapsed||0)+1;show();
  if(d.elapsed%5===0)save();
 },1000);
}

function quiz(d,reviewing=false){
 const scope=d.mode,seq=d.sequence||ids(scope);
 const guided=!reviewing&&d.kind==='practice';
 const target=Number(location.hash.split('/')[2]);
 const n=reviewing?(seq.includes(target)?target:seq[0]):d.at;
 const pos=seq.indexOf(n),s=section(n),group=sections[s],opts=options(n),correct=key[n-1];
 const label=reviewing?'解答・解説':sessionLabels[d.kind];
 const audio=audioPanel(n);
 const writing=isWritten(n),manual=isManual(n),type=partType(n);
 function unlocked(){
  if(!guided)return seq.length;
  const first=seq.findIndex(i=>!isSolved(d,i));
  return first===-1?seq.length:first;
 }
 const submitText=guided?'練習を終了する':'採点する';
 const submitButton=`<button class="solid" data-submit>${submitText}</button>`;
 const buttons=opts.map(o=>`<button type="button" class="option ${o.body?'labeled':''}" data-pick="${esc(o.v)}" aria-pressed="false"><span class="letter">${esc(o.v)}</span>${o.body}</button>`).join('');
 const numbers=seq.map((id,j)=>`<button data-go="${id}" class="num ${pos===j?'current':''}">${j+1}</button>`).join('');
 const reason=explanationFor(n);
 const review=reviewing?`<aside class="explain"><h3>${manual?'記述・口頭の振り返り':!d.answers[n]?'未解答':isCorrect(d,n)?'正解です':'不正解です'}</h3>
   <p>${d.kind==='practice'&&!manual?'初回の解答':'あなたの解答'}：${esc(d.answers[n]||'未解答')}　${manual?'解答例':'正解'}：${esc(answerText(n)||'解説を参照')}</p>
   ${reason}</aside>`:'';
 const exitLink=reviewing?'#result/'+d.id:launch(scope);
 const last=pos===seq.length-1;
 const forward=last?(reviewing?`<a class="solid" href="${exitLink}">結果を見る</a>`:submitButton):`<button class="solid" data-go="${seq[pos+1]}">次の問題</button>`;
 const optionClass=opts.length>4?'options grid-letters':opts.some(o=>o.body)?'options':'options grid-letters';
 main.innerHTML=`<div class="crumb"><a href="#home">問題演習</a><em>/</em>${modes[scope]}<em>/</em>${label}</div>
 <div class="quiz-head"><div><small class="micro">HSK 3.0 · ${paperInfo.name} · ${orderLabels[d.order||'original']}</small><h1>${label}</h1></div>
 <a class="textlink" href="${exitLink}">${reviewing?'結果に戻る':(storageOK?'保存して設定に戻る':'設定に戻る')}</a></div>
 <div class="quiz-grid"><article class="card question"><div class="qhead"><span>${modes[scopeOf(n)]}（原題 第${n}問）</span><b>${pos+1} / ${seq.length}</b></div>
 <h2>${esc(group[0])}</h2><p class="instruction">${esc(group[1])}</p>${audio}${originalPanel(n)}
 ${writing?writingPanel(d,n,reviewing):`<div class="${optionClass}">${buttons}</div>`}
 ${guided?'<div class="practice-feedback" role="status" aria-live="polite" aria-atomic="true"></div>':''}${review}
 <div class="step"><button class="ghost" data-go="${pos?seq[pos-1]:0}">前の問題</button>${forward}</div></article>
 <aside class="card sheet"><h2>${icon('layers')}問題一覧</h2>${reviewing?'':timerBox(d)}<p class="sheet-count"></p><progress aria-label="問題の進捗" max="${seq.length}"></progress><div class="numbers">${numbers}</div>
 ${reviewing?'<p>番号は出題順です。緑は正解、オレンジは不正解・未解答です。</p>':(guided?'<p>正解すると次の問題に進めます。作文・口頭の問題は、解答例を見て自己確認すると進めます。</p>':fullAudioButton(d)+'<button class="ghost wide" data-submit>採点する</button>')+'<small class="save-note"></small>'}</aside></div>`;
 wireOriginal(n);
 if(!reviewing)startTicker(d);
 function refresh(){
  const selected=d.answers[n],limit=unlocked(),solved=isSolved(d,n);
  const count=guided?limit:seq.filter(i=>d.answers[i]||(d.checked&&d.checked[i])).length;
  main.querySelector('.sheet-count').textContent=`${guided?'クリア':'解答済み'} ${count} / ${seq.length}問`;
  main.querySelector('progress').value=count;
  main.querySelectorAll('[data-pick]').forEach(b=>{
   const val=b.dataset.pick,reveal=reviewing||guided&&!!selected;
   b.classList.toggle('selected',!reveal&&val===selected);
   b.classList.toggle('wrong',reveal&&val===selected&&!solved);
   b.classList.toggle('correct',reveal&&val===correct);
   b.setAttribute('aria-pressed',val===selected?'true':'false');
   b.disabled=reviewing||guided&&solved;
  });
  main.querySelectorAll('[data-go]').forEach(b=>{
   const dest=Number(b.dataset.go),index=seq.indexOf(dest);
   b.disabled=index<0||index>limit;
   if(!b.classList.contains('num'))return;
   const hit=reviewing?isCorrect(d,dest)||(isManual(dest)&&(d.answers[dest]||(d.checked&&d.checked[dest]))):isSolved(d,dest);
   b.classList.toggle('done',!reviewing&&(guided?hit:!!(d.answers[dest]||(d.checked&&d.checked[dest]))));
   b.classList.toggle('good',reviewing&&!!hit);b.classList.toggle('bad',reviewing&&!hit);
   b.setAttribute('aria-label',`${index+1}問目、原題第${dest}問、${b.disabled?'未開放':reviewing?(isManual(dest)?(hit?'自己確認':'未解答'):hit?'正解':d.answers[dest]?'不正解':'未解答'):guided&&hit?'クリア':d.answers[dest]?'解答済み':'未解答'}`);
  });
  main.querySelectorAll('[data-submit]').forEach(b=>{b.disabled=guided&&limit<seq.length;});
  if(!reviewing)main.querySelector('.save-note').textContent=storageOK?'進捗はこのブラウザーに自動保存されます。':'このページを閉じると進捗は消去されます。';
  const counter=main.querySelector('.char-count'),field=main.querySelector('#written');
  if(counter&&field)counter.textContent=`${normalizeAnswer(field.value).length}字`;
  if(!guided)return;
  const fb=main.querySelector('.practice-feedback');
  const checked=Boolean(d.checked&&d.checked[n]);
  fb.className='practice-feedback'+(selected||checked?(solved?' is-right':manual?' is-neutral':' is-wrong'):'');
  if(writing){
   const check=main.querySelector('#check-written');
   field.readOnly=solved;check.disabled=solved||(type!=='speak'&&!field.value.trim());
   if(manual){
    if(!selected&&!checked){fb.textContent='';return;}
    fb.innerHTML=`<strong>${type==='speak'?'解答例と比べてみましょう':'解答を照らし合わせましょう'}</strong>${selected?`<p>あなたの解答：${esc(selected)}</p>`:''}${correct?`<p>解答例：${esc(correct)}</p>`:''}${reason}`+
     (solved?'<p class="feedback-next">確認しました。</p>':`<button class="ghost" type="button" id="mark-written">${type==='speak'?'話す練習ができた（自己確認）':'条件を満たした（自己確認）'}</button>`);
    const mark=main.querySelector('#mark-written');
    if(mark)mark.onclick=()=>{d.checked=d.checked||{};d.checked[n]=true;save();refresh();};
    return;
   }
  }
  if(!selected){fb.textContent='';return;}
  if(solved){
   const next=last?'練習を終了して結果を確認しましょう。':'次の問題に進めます。';
   fb.innerHTML=`<strong>${matchesKey(n,selected)?'正解です。':'自己確認で正解にしました。'}</strong>${reason}<p class="feedback-next">${next}</p>`;
  }else{
   const option=opts.find(o=>o.v===correct)||{body:''};
   const flex=isFlexible(n)?`<p class="feedback-next">参考答案と意味が同じなら、自己確認で正解にできます。</p><button class="ghost" type="button" id="accept-flex">意味が同じなので正解にする</button>`:'';
   fb.innerHTML=`<strong>${isFlexible(n)?'参考答案':'正解'}は ${esc(answerText(n))} です。</strong>
    <div class="feedback-answer">${writing?'':'<span class="letter">'+esc(correct)+'</span>'+option.body}</div>
    ${reason}${flex}<p class="feedback-next">${writing?'記述欄に正しい解答を入力し、もう一度確認してください。':'正しい選択肢を選び直してください。'}</p>`;
   const accept=main.querySelector('#accept-flex');
   if(accept)accept.onclick=()=>{d.checked=d.checked||{};d.checked[n]=true;save();refresh();};
  }
 }
 if(writing&&!reviewing){
  const field=main.querySelector('#written');
  const submit=()=>{
   const v=field.value.trim();
   if(!v)return;
   d.answers[n]=v;
   if(guided&&!d.first[n])d.first[n]=v;
   save();refresh();
  };
  field.oninput=()=>{
   d.written=d.written||{};d.written[n]=field.value;
   if(guided){if(!isManual(n)){delete d.answers[n];if(d.checked)delete d.checked[n];}save();refresh();}
   else{const v=field.value.trim();if(v)d.answers[n]=v;else delete d.answers[n];save();refresh();}
  };
  if(guided){
   main.querySelector('#check-written').onclick=()=>{
    if(type==='speak'){d.answers[n]=field.value.trim()||'（口頭で解答）';save();refresh();return;}
    submit();
   };
  }else if(type==='speak'&&!d.answers[n]){
   const mark=document.createElement('button');
   mark.type='button';mark.className='ghost';mark.textContent='口頭で解答した';
   mark.onclick=()=>{d.answers[n]=field.value.trim()||'（口頭で解答）';save();refresh();};
   main.querySelector('.writing').appendChild(mark);
  }
  wireRecorder();
 }
 main.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{
  if(reviewing||guided&&isSolved(d,n))return;
  if(guided&&!d.first[n])d.first[n]=b.dataset.pick;
  d.answers[n]=b.dataset.pick;save();refresh();
 });
 main.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{
  const go=Number(b.dataset.go),index=seq.indexOf(go);
  if(index<0||index>unlocked())return;
  if(reviewing){location.hash='review/'+d.id+'/'+go;return;}
  d.at=go;save();quiz(d);window.scrollTo(0,0);main.focus({preventScroll:true});
 });
 const openFull=main.querySelector('#open-full');
 if(openFull)openFull.onclick=()=>{
  const bar=ensureFullBar();followSession=d;bar.hidden=false;document.body.classList.add('has-full-bar');
  const au=bar.querySelector('audio');
  const first=book.audio&&book.audio[seq[0]];
  if(au.paused&&au.currentTime===0&&first&&scopeOf(seq[0])==='listen'){au.preload='auto';}
  au.play().catch(()=>{});
 };
 main.querySelectorAll('[data-submit]').forEach(b=>b.onclick=()=>{
  if(guided&&unlocked()<seq.length)return;
  function finish(){
   const id=draftId(scope,d.kind,d.order);
   if(state.drafts[id]!==d)return;
   stopFull();followSession=null;
   const record={id:Date.now().toString(),date:Date.now(),mode:scope,kind:d.kind,order:d.order,sequence:seq.slice(),elapsed:d.elapsed||0,checked:{...d.checked},written:{...d.written},answers:{...(guided?d.first:d.answers)}};
   for(const i of seq){if((isManual(i)||isFlexible(i))&&d.answers[i])record.answers[i]=d.answers[i];}
   if(guided)for(const i of seq){if(isFlexible(i)&&d.first[i]&&!matchesKey(i,d.first[i])&&!(d.checked&&d.checked[i]))record.answers[i]=d.first[i];}
   state.history.unshift(record);delete state.drafts[id];save();location.hash='result/'+record.id;
  }
  if(guided){finish();return;}
  const missing=seq.filter(i=>!d.answers[i]&&!(d.checked&&d.checked[i])).length;
  ask('解答を提出しますか？',missing?`未解答の問題が${missing}問あります。このまま提出すると未解答として採点されます。`:`全${seq.length}問に解答しました。提出すると結果と解説を確認できます。`,finish);
 });
 refresh();
}

function ask(title,msg,action){
 if(typeof dialog.showModal!=='function'){
  if(window.confirm(title+'\n'+msg))action();
  return;
 }
 document.querySelector('#dialog-title').textContent=title;document.querySelector('#dialog-text').textContent=msg;document.querySelector('#cancel').onclick=()=>dialog.close();document.querySelector('#accept').onclick=()=>{dialog.close();action();};dialog.showModal();}
function attemptLabel(r){return sessionLabels[r.kind]+'・'+orderLabels[r.order];}
function scoreLabel(r){
 const seq=r.sequence||ids(r.mode),graded=seq.filter(n=>!isManual(n));
 return graded.length?stats(r)+' / '+graded.length:'自己確認 '+seq.filter(n=>r.answers[n]||(r.checked&&r.checked[n])).length+'問';
}
function formatTime(s){return Math.floor(s/60)+'分'+String(s%60).padStart(2,'0')+'秒';}
function renderHistory(){
 const list=state.history.map(r=>'<a class="history-row" href="#result/'+r.id+'"><span><b>'+modes[r.mode]+'</b><small>'+attemptLabel(r)+' · '+new Date(r.date).toLocaleString('ja-JP',{hour12:false})+' · '+paperInfo.name+'</small></span><strong>'+scoreLabel(r)+'</strong></a>').join('');
 main.innerHTML='<div class="crumb"><a href="#home">問題演習</a><em>/</em>学習履歴</div><div class="quiz-head"><h1>学習履歴</h1></div>'+paperSelector('history')+'<section class="card history">'+(list||'<div class="empty">'+icon('history')+'<h2>学習履歴はまだありません</h2><p>演習を提出すると、ここから結果と各問の日本語解説を確認できます。</p><a class="solid" href="#home">問題を選ぶ</a></div>')+'</section>';
}
function result(r){
 const seq=r.sequence||ids(r.mode),graded=seq.filter(n=>!isManual(n)),written=seq.filter(isManual);
 const score=stats(r),incorrect=graded.filter(n=>r.answers[n]&&!isCorrect(r,n)).length;
 const answered=written.filter(n=>r.answers[n]||(r.checked&&r.checked[n])).length,blanks=graded.filter(n=>!r.answers[n]).length;
 const miss=graded.find(n=>!isCorrect(r,n));
 const scoreTitle=graded.length?(r.kind==='practice'?'初回で正解した問題':'正解数'):'自己確認した問題';
 const summary=[];
 if(graded.length)summary.push(r.kind==='practice'?`選び直し・書き直し ${graded.length-score}問`:`不正解 ${incorrect}問　未解答 ${blanks}問`);
 if(written.length)summary.push(`記述・口頭 ${answered} / ${written.length}問。解説と照らし合わせて自己確認しましょう。`);
 if(r.kind==='exam'&&r.elapsed)summary.push(`かかった時間 ${formatTime(r.elapsed)}（目安 ${minutesOf(r.mode)}分）`);
 const rows=sections.map((group,i)=>{
  const items=seq.filter(n=>section(n)===i);
  if(!items.length)return '';
  const gradedItems=items.filter(n=>!isManual(n));
  const outcome=gradedItems.length?gradedItems.filter(n=>isCorrect(r,n)).length+' / '+gradedItems.length:'自己確認';
  return `<div class="result-row"><span>${esc(group[0])}</span><b>${outcome}</b></div>`;
 }).join('');
 main.innerHTML=`<div class="crumb"><a href="#history">学習履歴</a><em>/</em>今回の結果</div><div class="quiz-head"><div><small class="micro">HSK 3.0 · ${paperInfo.name} · ${modes[r.mode]} · ${attemptLabel(r)}</small><h1>演習結果</h1></div></div><div class="quiz-grid"><section class="card result"><span class="micro">${scoreTitle}</span><div class="score">${graded.length?score:answered} <small>/ ${graded.length||written.length}</small></div><p>${summary.join('<br>')}</p><div class="actions"><a class="solid" href="#review/${r.id}/${miss||seq[0]}">${miss?'間違えた問題・未解答から復習':'解答・解説を見る'}</a><a class="ghost" href="${launch(r.mode)}">もう一度解く</a></div></section><section class="card sheet"><h2>問題形式別の成績</h2>${rows}</section></div>${resultExplanations(r,seq,miss||seq[0])}`;
}
function route(){
 const [view='home',param,kind,order]=location.hash.slice(1).split('/');
 const r=state.history.find(h=>h.id===param);
 if(dialog.open)dialog.close();
 clearInterval(ticker);
 if(!view.startsWith('run')&&view!=='run'){stopFull();if(fullBar){fullBar.hidden=true;document.body.classList.remove('has-full-bar');}}
 if(view==='practice'&&Object.prototype.hasOwnProperty.call(modes,param)){setup(param);}
 else if(view==='run'&&validSettings(param,kind,order)){
  const d=state.drafts[draftId(param,kind,order)];
  if(d)quiz(d);else setup(param);
 }
 else if(view==='result'&&r)result(r);
 else if(view==='review'&&r)quiz(r,true);
 else if(view==='history')renderHistory();
 else home();
 const past=['result','review','history'].includes(view);
 document.querySelector('#nav-home').classList.toggle('active',!past);document.querySelector('#nav-history').classList.toggle('active',past);
 window.scrollTo(0,0);
}
window.addEventListener('hashchange',()=>{route();main.focus({preventScroll:true});});
route();
