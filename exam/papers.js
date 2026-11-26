// 選ばれた冊子のデータを読み込みます（catalog.js の後に読み込む）。
const paperCodes=Object.keys(paperCatalog);
const requestedPaper=new URLSearchParams(location.search).get('paper');
const paperId=paperCodes.includes(requestedPaper)?requestedPaper:'S1';
const paperInfo=paperCatalog[paperId];
const assetDir='papers/'+paperId+'/';
// 日本語や記号を含むパスを1区切りずつ URL エンコードします（file:// でも GitHub Pages でも動くように）。
function samplePath(rel){return sampleRoot+rel.split('/').map(encodeURIComponent).join('/');}
document.title='HSK 3.0 サンプル問題 · '+paperInfo.name;
document.querySelector('#paper-footer').textContent='HSK 3.0 · '+paperInfo.name+' サンプル問題';

function loadPaperScript(path){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=path;
  script.onload=resolve;
  script.onerror=()=>reject(new Error(path));
  document.head.appendChild(script);
 });
}
loadPaperScript('levels.js')
 .then(()=>loadPaperScript(assetDir+'paper.js'))
 .then(()=>loadPaperScript('app.js'))
 .catch(()=>{
  const message=document.createElement('p');
  message.className='card load-error';
  message.textContent='問題を読み込めませんでした。ページを再読み込みしてください。';
  document.querySelector('main').replaceChildren(message);
 });
