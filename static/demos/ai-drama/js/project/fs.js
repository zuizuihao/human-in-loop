/* 打开 / 保存本地项目（Chrome、Edge 的 File System Access API，file:// 下也能用）。在 loader.js 之后、store.js 之前加载。
   - open()：选一个项目文件夹（根目录要有 project.yaml），读出全部文本文件（跳过 media/）缓存进 localStorage，loader.js 刷新后从缓存读
   - 文件夹句柄存在 IndexedDB（最近项目）；图片和视频用句柄按需读成 blob 地址
   - save()：STORE.toFiles() 里有变化的文件写回文件夹；演示包只读，保存就是另存为
   - saveAs()：把当前项目的全部文本文件（含没保存的改动）写到另一个文件夹，然后打开它；media/ 不复制
   - close()：回到演示项目
   重开浏览器后，读写文件夹要用户点一下重新授权（reconnect），没授权时图片退回占位图 */
const PROJECT_FS=(()=>{
  const ok=typeof showDirectoryPicker==='function',TEXT=/\.(ya?ml|md|jsonl)$/,pick=()=>showDirectoryPicker({id:'aigc-project',mode:'readwrite'}).catch(()=>null);
  const say=t=>typeof toast==='function'&&document.getElementById('toast')?toast(t):alert(t);
  const idb=(mode,fn)=>new Promise((res,rej)=>{const r=indexedDB.open('aigc-projects',1);r.onupgradeneeded=()=>r.result.createObjectStore('recent',{keyPath:'key'});r.onerror=()=>rej(r.error);
    r.onsuccess=()=>{const t=r.result.transaction('recent',mode),q=fn(t.objectStore('recent'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)}});
  const recent=()=>idb('readonly',s=>s.getAll()).then(l=>(l||[]).sort((a,b)=>b.time-a.time)).catch(()=>[]);
  const current=()=>{try{return JSON.parse(localStorage.getItem(PROJECT.OPEN_KEY))}catch(e){return null}};
  const handle=async()=>{const c=current();if(!c)return null;const r=await idb('readonly',s=>s.get(c.key));return r&&r.handle};
  const perm=async(h,ask)=>{const o={mode:'readwrite'};return await h.queryPermission(o)==='granted'||ask&&await h.requestPermission(o)==='granted'};
  async function readAll(dir,pre='',out={}){
    for await(const[n,h]of dir.entries()){
      if(h.kind==='directory'){if(n.startsWith('.')||!pre&&n==='media')continue;await readAll(h,pre+n+'/',out)}
      else if(TEXT.test(n))out[pre+n]=await(await h.getFile()).text()}
    return out}
  async function at(dir,path,create){const parts=path.split('/'),name=parts.pop();let d=dir;for(const p of parts)d=await d.getDirectoryHandle(p,{create});return d.getFileHandle(name,{create})}
  async function write(dir,files){for(const[f,t]of Object.entries(files)){const w=await(await at(dir,f,true)).createWritable();await w.write(t);await w.close()}}
  // 读进文件夹，设为当前项目；它的工作区清空，从文件重新开始
  async function load(dir){const files=await readAll(dir);if(!files['project.yaml'])throw new Error(`「${dir.name}」里没有 project.yaml，不是项目文件夹`);
    const P=jsyaml.load(files['project.yaml']),key=`${dir.name}|${P.id}`;
    localStorage.setItem(PROJECT.OPEN_KEY,JSON.stringify({key,name:dir.name,id:P.id,files}));localStorage.removeItem(`aigc-v3:local:${P.id}`);
    await idb('readwrite',s=>s.put({key,name:dir.name,id:P.id,title:P.title,handle:dir,time:Date.now()}))}
  async function open(h){
    if(!ok)return say('这个浏览器不能打开本地文件夹，请用 Chrome 或 Edge');
    const dir=h||await pick();if(!dir)return false;
    if(!await perm(dir,true))return false;
    try{await load(dir)}catch(e){return say(e.message)}
    location.href='series.html';return true}
  async function save(){
    if(!PROJECT.local)return saveAs();
    const ch=STORE.toFiles(),n=Object.keys(ch).length;if(!n){say('没有要保存的改动');return 0}
    const dir=await handle();if(!dir||!await perm(dir,true)){say('没有这个文件夹的写入权限，请在主页重新打开项目');return false}
    await write(dir,ch);
    const c=current();Object.assign(c.files,ch);localStorage.setItem(PROJECT.OPEN_KEY,JSON.stringify(c));Object.assign(PROJECT.files(),ch);
    say(`已保存 ${n} 个文件：${Object.keys(ch).join('、')}`);dispatchEvent(new Event('store'));return n}
  async function saveAs(){
    if(!ok)return say('这个浏览器不能写本地文件夹，请用 Chrome 或 Edge');
    const dir=await pick();if(!dir)return false;
    for await(const _ of dir.entries()){if(!confirm(`「${dir.name}」不是空文件夹，同名文件会被覆盖。继续？`))return false;break}
    await write(dir,{...PROJECT.files(),...STORE.toFiles()});
    alert(`已另存到「${dir.name}」。图片和视频（media/）没有复制${PROJECT.local?'':'：演示项目的在仓库 projects/xiejiaoxing/media/，需要的话手动复制过去'}。`);
    await load(dir);location.reload();return true}
  function close(){localStorage.removeItem(PROJECT.OPEN_KEY);location.href='home.html'}
  // 重开浏览器后要用户点一下才能重新授权
  let connected=true;
  async function reconnect(){const h=await handle();if(h&&await perm(h,true)){connected=true;location.reload()}}
  if(PROJECT.local&&ok)handle().then(async h=>{connected=!!h&&await perm(h,false);if(!connected)dispatchEvent(new Event('store'))});
  // 本地项目的图片和视频：用句柄读成 blob 地址（loader.js 的 mediaUrl 调用）
  PROJECT.setReader(async path=>{const h=await handle();if(!h||!await perm(h,false))return null;
    try{return URL.createObjectURL(await(await at(h,path,false)).getFile())}catch(e){return null}});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save()}});
  return{ok,open,save,saveAs,close,recent,reconnect,get connected(){return connected}};
})();
