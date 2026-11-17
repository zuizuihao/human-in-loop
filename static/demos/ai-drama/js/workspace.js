/* 子 Agent 的"预览"层：只显示当前选中的、属于这个 Agent 的节点，方便检查和二次调整。
   没选时显示该 Agent 负责的全部节点；和画布选中状态双向同步。所有调整都交给该 Agent 执行（见 flows.js） */
state.pane={};state.viewVer={};state.compare=false;
const paneOf=k=>state.pane[k]||'ws';
const rootOf=n=>{let r=n;while(r.parent)r=byId(r.parent);return r};
const lockOf=n=>{const e=n.ent&&entOf(n.ent);return n.lock||(e?`LOCK-${e.name}：${e.desc}`:'')};
// 被选中的节点按"同一个对象的所有版本"归并；正在查看的版本：手动切换 > 画布上点的那个版本 > 当前采用版本
function wsItems(k){
  const sel=state.ctx.map(byId).filter(n=>n&&n.kind===k),roots=[...new Set(sel.map(rootOf))];
  return roots.map(r=>{const fam=lineage(r),cur=fam.find(x=>x.current)||r,picked=sel.find(x=>fam.includes(x));
    const view=byId(state.viewVer[r.id])||(picked&&!picked.current?picked:cur);return{r,fam,cur,view}});
}
const tile=(n,i,label,big)=>{const img=i===0&&n.img;
  return `<div class="wt ${big?'big':''}" data-zoom="${n.id}|${i}|${esc(label)}"><i style="${img?`background-image:url(${n.img})`:n.out?'background:'+grad(n.title+n.ver+i):''}">${!n.out&&!img?'待生成':''}</i>
    <span>${label}${img?' · 参考图':''}</span>${ASSET_KINDS.includes(n.kind)&&n.out?`<button class="rr" data-reroll="${n.id}|${esc(label)}" title="只重出这一张">↻</button>`:''}</div>`};
function preview(n){
  if(VIEWS[n.kind])return `<div class="wgrid c${Math.min(VIEWS[n.kind].length,2)}">${VIEWS[n.kind].map((v,i)=>tile(n,i,v,true)).join('')}</div>`;
  if(n.kind==='text')return `<div class="wtext">${esc(n.prompt)}</div>`;
  if(n.kind==='shot')return `<div class="shotlist big">${segOf(n).shots.map(x=>`<div><b>${x.id}</b><span>${x.d}s ${x.f}·${x.cam}</span><em>${esc(x.kf)}${x.line?`<br><small>🔊 ${esc(x.line)}</small>`:''}</em></div>`).join('')}</div>`;
  if(n.kind==='board')return `<div class="wgrid c2">${segOf(n).shots.map((x,i)=>tile({...n,img:null},i+1,`${x.id} ${x.f}·${x.cam}`,true)).join('')}</div>`;
  if(n.kind==='video')return `<div class="wvid" style="${n.out?'background:'+grad(n.title+n.ver):''}" data-play>${n.out?'▶':'待生成'}<span>${segDur(segOf(n))+n.extra}s · ${n.mode==='final'?'正片':'样片'}</span></div>
    <div class="wlines">${segOf(n).shots.map(x=>`<div><b>${x.id}</b>${esc(x.line||'（无声音）')}</div>`).join('')}</div>`;
  return '';
}
function card({r,fam,cur,view:n}){
  const used=n.ent?SEGS.filter(s=>(s.uses||[]).includes(n.ent)):n.seg?[segOf(n)]:[];
  return `<div class="wcard" data-root="${r.id}">
   <div class="wh"><span class="ico">${AI(n.kind)}</span><b>${esc(shortName(n))}</b><span class="st ${n.status}">${['text','shot'].includes(n.kind)?'文本':STX[n.status]}</span>
     <span class="vers">${fam.map(v=>`<button class="${v===n?'on':''} ${v.current?'cur':''}" data-ver="${r.id}|${v.id}" title="${esc(v.note||'初版')}">v${v.ver}${v.current?' ✓':''}</button>`).join('')}</span>
     <button class="wx" data-unsel="${r.id}" title="移出预览">✕</button></div>
   ${n!==cur?`<div class="wban">正在看 v${n.ver}${n.note?`（${esc(n.note)}）`:''}，当前采用的是 v${cur.ver} <button class="btn sm pri" data-adopt="${n.id}">采用 v${n.ver}</button></div>`:n.note?`<div class="wnote">✎ v${n.ver}：${esc(n.note)}</div>`:''}
   ${preview(n)}
   ${ASSET_KINDS.includes(n.kind)?`<div class="wsec"><em>连续性锁</em><textarea data-lock="${n.id}" rows="2">${esc(lockOf(n))}</textarea>
     <div class="wrow"><button class="btn sm" data-savelock="${n.id}">保存并重出</button><button class="btn sm" data-ref="${n.id}">🖼️ 换参考图</button><button class="btn sm" data-check="${n.id}">按 Skill 检查</button></div></div>`:
     `<div class="wrow"><button class="btn sm" data-check="${n.id}">按 Skill 检查</button>${['text','shot'].includes(n.kind)?'':`<button class="btn sm" data-regen="${n.id}">🔁 重新生成</button>`}${n.kind==='video'?`<button class="btn sm" data-extend="${n.id}">⏩ 续拍 3 秒</button>`:''}</div>`}
   ${n.checks?`<div class="wsec"><em>上次检查</em><ul class="wchk">${n.checks.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></div>`:''}
   ${used.length?`<div class="wsec"><em>${n.ent?'用在':'所属段落'}</em><div class="nlinks" style="padding:0">${used.map(s=>`<span class="nlink" data-seg="${s.id}">${s.id} ${s.title}</span>`).join('')}</div></div>`:''}
  </div>`;
}
// 多选资产时并排对比：行 = 对象，列 = 视图
function compareGrid(items,k){
  const v=VIEWS[k];
  return `<div class="wcmp" style="grid-template-columns:72px repeat(${v.length},1fr)"><span></span>${v.map(x=>`<b>${x}</b>`).join('')}
    ${items.map(({view:n})=>`<span class="cn">${esc(shortName(n))}<small>v${n.ver}</small></span>${v.map((x,i)=>tile(n,i,'',false)).join('')}`).join('')}</div>`;
}
function renderWorkspace(){
  const b=$('#oBody'),k=state.tab,all=live(k),items=wsItems(k);
  if(document.activeElement&&b.contains(document.activeElement)&&document.activeElement.tagName==='TEXTAREA')return; // 正在改锁时不打断
  const scope=`<div class="wscope"><span>${KIND[k].n}</span>${all.map(n=>`<button class="${items.some(i=>i.fam.includes(n))?'on':''}" data-pick="${n.id}">${esc(shortName(n))}</button>`).join('')}
    ${all.length>1?`<button class="all" data-all>${items.length===all.length?'清空':'全选'}</button>`:''}${items.length>1&&VIEWS[k]?`<button class="all ${state.compare?'on':''}" data-cmp>⇆ 对比</button>`:''}</div>`;
  if(!all.length){b.innerHTML=hello(k);return}
  b.innerHTML=scope+(items.length?(state.compare&&items.length>1&&VIEWS[k]?compareGrid(items,k):items.map(card).join('')):
    `<div class="hint2" style="margin:4px 2px 8px">选一个或多个${KIND[k].n}来预览和调整（也可以在画布上点选）。</div><div class="wgal">${all.map(n=>
      `<div class="wg" data-pick="${n.id}"><i style="${n.img?`background-image:url(${n.img})`:n.out?'background:'+grad(n.title+n.ver):''}">${n.out||n.img?'':AI(k)}</i><b>${esc(shortName(n))}</b><small>${STX[n.status]}${n.ver>1?' · v'+n.ver:''}</small></div>`).join('')}</div>`);
  bindWs(b,k);
}
function bindWs(b,k){
  const on=(sel,f)=>b.querySelectorAll(sel).forEach(e=>e.onclick=ev=>{ev.stopPropagation();f(e,ev)});
  const ask=(n,q)=>{post({type:'me',t:q,ctx:[n.id]},[k]);agentEdit(k,[n],q)};
  on('[data-pick]',(e,ev)=>{const n=byId(e.dataset.pick),items=wsItems(k),sel=items.find(i=>i.fam.includes(n));
    if(sel)state.ctx=state.ctx.filter(id=>!sel.fam.some(f=>f.id===id));else state.ctx=[...state.ctx,n.id];
    state.focus=null;render();renderCtx();renderSugs();focusNode(n)});
  on('[data-all]',()=>{const items=wsItems(k),all=live(k);state.ctx=items.length===all.length?state.ctx.filter(id=>byId(id).kind!==k):[...new Set([...state.ctx,...all.map(n=>n.id)])];render();renderCtx();renderSugs()});
  on('[data-cmp]',()=>{state.compare=!state.compare;renderWorkspace()});
  on('[data-unsel]',e=>{const fam=lineage(byId(e.dataset.unsel));state.ctx=state.ctx.filter(id=>!fam.some(f=>f.id===id));render();renderCtx();renderSugs()});
  on('[data-ver]',e=>{const[r,v]=e.dataset.ver.split('|');state.viewVer[r]=v;renderWorkspace();focusNode(byId(v))});
  on('[data-adopt]',e=>{const v=byId(e.dataset.adopt);adopt(v);delete state.viewVer[rootOf(v).id];renderWorkspace()});
  on('[data-savelock]',e=>{const n=byId(e.dataset.savelock),t=b.querySelector(`[data-lock="${n.id}"]`).value.trim();document.activeElement.blur();
    if(t===lockOf(n))return toast('连续性锁没有改动');ask(n,'更新连续性锁：'+t)});
  on('[data-ref]',e=>{state.ctx=[...new Set([e.dataset.ref,...state.ctx])];renderCtx();$('#oFile').click()});
  on('[data-check]',e=>ask(byId(e.dataset.check),'按 Skill 检查'));
  on('[data-regen]',e=>ask(byId(e.dataset.regen),'重新生成'));
  on('[data-extend]',e=>ask(byId(e.dataset.extend),'续拍 3 秒'));
  on('[data-reroll]',e=>{const[id,v]=e.dataset.reroll.split('|');ask(byId(id),`只重出「${v}」`)});
  on('[data-seg]',e=>{const n=live('board').find(x=>x.seg===e.dataset.seg)||live('shot').find(x=>x.seg===e.dataset.seg);if(n)focusNode(n,true)});
  on('[data-play]',()=>play());
  on('[data-zoom]',e=>{const[id,i,l]=e.dataset.zoom.split('|'),n=byId(id);if(!n.out&&!n.img)return;
    const img=+i===0&&n.img,lb=$('#lightbox');lb.querySelector('i').style.cssText=img?`background-image:url(${n.img})`:'background:'+grad(n.title+n.ver+i);
    lb.querySelector('span').textContent=`${shortName(n)} v${n.ver}${l?' · '+l:''}`;lb.hidden=false});
}
$('#lightbox').onclick=()=>$('#lightbox').hidden=true;
// 子 Agent 页面内切换"预览 / 对话"
function renderPaneBar(){
  const el=$('#oPane'),k=state.tab;
  if(k==='orc'){el.hidden=true;return}el.hidden=false;
  const sel=wsItems(k).length,msgs=(state.th[k]||[]).length;
  el.innerHTML=`<button class="${paneOf(k)==='ws'?'on':''}" data-p="ws">预览 · ${sel?`选中 ${sel}`:`全部 ${live(k).length}`}</button><button class="${paneOf(k)==='chat'?'on':''}" data-p="chat">对话 · ${msgs}</button>`;
  el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{state.pane[k]=b.dataset.p;renderPaneBar();renderMsgs()});
}
