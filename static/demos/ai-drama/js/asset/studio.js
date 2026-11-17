/* 资产工作室（角色 / 道具 / 场景）：页面框架、渲染与交互。类型差异在 kinds.js；会改资产的操作交给 agent.js */
const S={kind:(new URLSearchParams(location.search).get('k'))||'char',cur:null,tab:'sheets',step:null,view:{},look:null,ann:[],annMode:false,compare:false,checks:{},cell:null,onlyBad:false,editLock:null,spent:STORE.get('spent').asset||0,scope:'all'};
if(!KINDS[S.kind])S.kind='char';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wait=ms=>new Promise(r=>setTimeout(r,ms*(window.SPEED||1)));
const K=()=>KINDS[S.kind],ITEMS=()=>K().items,C=()=>ITEMS().find(c=>c.id===S.cur);
const lockName=(c,l)=>`LOCK-${c.code}-${l.c}`;
const stepsOf=c=>K().steps.filter(s=>!c.only||c.only.includes(s.k));
const stepOf=k=>K().steps.find(s=>s.k===k);
const DEF={T1FAIL:'角色走样'}; // 不是锁、但要标出来的问题
const ST={approved:'已批准',review:'待人审',draft:'已生成',stale:'待更新',none:'未开始'};
Object.values(KINDS).forEach(k=>k.items.forEach(c=>{Object.values(c.takes).forEach(l=>l.forEach((t,i)=>{t.seed=t.seed??i}));c.hist={};Object.keys(c.pick).forEach(s=>c.hist[s]=[{t:c.pick[s],n:'初版'}])}));
function selectItem(id){S.cur=id;const c=C();S.look=c.looks[0].id;S.step=stepsOf(c).find(s=>c.steps[s.k]==='review')?.k||stepsOf(c)[0].k;S.ann=[];S.cell=null;S.editLock=null;S.compare=false}
// ?id= 直接打开某个资产（从画布、待你处理、其他工作室跳过来）
const Q_ID=new URLSearchParams(location.search).get('id');selectItem(ITEMS().some(c=>c.id===Q_ID)?Q_ID:ITEMS()[0].id);
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2400)}
function sheet(c,k,t){if(!t)return'';if(t.img)return `<div style="aspect-ratio:1/1;background:url(${t.img}) center/contain no-repeat #eef0f3"></div>`;return K().sheet(c,k,t,S.look)}
const pickTake=(c,k)=>(c.takes[k]||[])[c.pick[k]];
const badOf=(c,sh)=>Object.entries((S.checks[c.id]||{})[sh]||{}).filter(([,v])=>v.r==='⚠').map(([k])=>k);
const defLabel=(c,d)=>c.locks.some(l=>l.c===d)?d:(DEF[d]||d);

// ---------- 顶部：切换资产类型 ----------
function renderKindSw(){
  $('#kindSw').innerHTML=Object.entries(KINDS).map(([k,v])=>`<a class="${S.kind===k?'on':''}" href="?k=${k}">${v.av} ${v.n}</a>`).join('');
  $('#agentName').textContent=K().agent;$('#agentAv').textContent=K().av;$('#agentSkill').textContent=`${K().skill} · 叠加 AI 漫剧 Skill`;document.title=K().title;
}
// ---------- 左：资产列表 ----------
const probs=c=>{let n=0;Object.values(S.checks[c.id]||{}).forEach(r=>Object.values(r).forEach(v=>{if(v.r==='⚠')n++}));return n+Object.values(c.steps).filter(s=>s==='stale').length};
const epsLabel=c=>{const L=STORE.usage(c.id);return L.length===STORE.EPS.length?'每集':L.join(' ')};
function renderCast(){
  const e=STORE.ep,mine=ITEMS().filter(c=>STORE.usedIn(c.id,e)),list=S.scope==='ep'?mine:ITEMS(),np=STORE.pending(e).filter(([k])=>k===S.kind);
  $('#cast').innerHTML=`<h4>资产库 · ${K().n}</h4><div class="scope"><button class="${S.scope==='all'?'on':''}" data-scope="all">全部 ${ITEMS().length}</button><button class="${S.scope==='ep'?'on':''}" data-scope="ep">${e} 用到 ${mine.length}</button></div>`+list.map(c=>`<button class="ci ${c.id===S.cur?'on':''} ${STORE.usedIn(c.id,e)?'':'dim'}" data-c="${c.id}"><span class="av">${K().avatar(c)}</span><span style="flex:1;min-width:0"><b>${c.name}</b><small>${c.role}</small><small class="use">用于 ${epsLabel(c)}</small>
     <span class="bar">${stepsOf(c).map(s=>`<i class="s-${c.steps[s.k]}" title="${s.k} ${s.n}：${ST[c.steps[s.k]]}"></i>`).join('')}</span></span>${probs(c)?`<span class="warn">${probs(c)}</span>`:''}</button>`).join('')+
    (np.length?`<h4>${e} 大纲里要新建</h4>`+np.map(([,n])=>`<button class="ci pend" data-pend="${n}"><span class="av">📝</span><span style="flex:1;min-width:0"><b>${n}</b><small>${e} 首次出现 · 还没有资产卡</small></span></button>`).join(''):'')+
    `<button class="cadd" data-act="extract">＋ 从剧本里提取新${K().n}</button>${K().lineup?'<button class="cadd" data-act="lineup">⚖ 身高对比（所有角色同框）</button>':''}`;
  $$('#cast [data-c]').forEach(b=>b.onclick=()=>{selectItem(b.dataset.c);renderAll()});
  $$('#cast [data-scope]').forEach(b=>b.onclick=()=>{S.scope=b.dataset.scope;renderAll()});
  $$('#cast [data-pend]').forEach(b=>b.onclick=()=>card(`给「${b.dataset.pend}」建卡？`,[`${e} 的剧本里首次出现，资产库里还没有`,`从产物链第一步 ${stepsOf(ITEMS()[0])[0].k} 开始；建好后后面的集都能复用`,'资产在分镜之前：建完卡分镜 Agent 才能引用'],[['开始建卡',()=>agentSay(`好，「${b.dataset.pend}」从 ${stepsOf(ITEMS()[0])[0].k} 开始出 4 张候选（原型里只演示到这里）。`)],['先不建',()=>{}]]));
  if(K().lineup)$('#cast [data-act="lineup"]').onclick=lineup;
  $('#cast [data-act="extract"]').onclick=()=>agentSay(np.length?`${e} 的剧本里还有 ${np.length} 个${K().n}没建卡：${np.map(x=>x[1]).join('、')}。点上面的条目开始。`:`${e} 剧本里用到的${K().n}都已经在库里了：${mine.map(c=>c.name).join('、')||'无'}。`);
}
// ---------- 中：头部与标签 ----------
function score(c){const all=Object.values(S.checks[c.id]||{}).flatMap(r=>Object.values(r)).filter(v=>v.r==='✅'||v.r==='⚠');return all.length?Math.round(all.filter(v=>v.r==='✅').length/all.length*100):null}
function renderHero(){
  const c=C(),sc=score(c),done=stepsOf(c).filter(s=>c.steps[s.k]==='approved').length,bad=probs(c),lk=c.looks.find(l=>l.id===S.look);
  $('#hero').innerHTML=`<div class="hav">${K().avatar(c)}</div>
   <div><h2>${c.name}<small>${c.role}</small><small class="use">用于 ${epsLabel(c)}</small></h2><p>${esc(c.tone)}</p>${epStates(c)}
     <div class="looks"><span class="ln">${K().lookN}</span>${c.looks.map(l=>`<button class="${S.look===l.id?'on':''}" data-look="${l.id}" title="${esc(l.note||'')}">${l.n}</button>`).join('')}${S.kind==='char'?'<button class="add" data-look="+">＋ 新造型</button>':''}${lk.note&&c.looks.length===1?`<span class="ln">${esc(lk.note)}</span>`:''}</div></div>
   <div class="stats"><div><b>${done}/${stepsOf(c).length}</b><small>产物链已批准</small></div><div><b>${c.locks.length}</b><small>锁</small></div><div><b>${Object.keys(c.shots).length}</b><small>出镜镜头</small></div>
     <div class="${bad?'bad':''}"><b>${sc===null?'—':sc+'%'}</b><small>出镜一致性</small></div></div>
   <div class="hact"><button class="btn sm" data-act="check">▶ 检查全部出镜</button></div>`;
  $$('#hero [data-look]').forEach(b=>b.onclick=()=>{if(b.dataset.look==='+')return agentNewLook();S.look=b.dataset.look;renderAll()});
  $('#hero [data-act="check"]').onclick=()=>{S.tab='appear';renderAll();runCheck()};
  const all=ITEMS().map(score).filter(x=>x!==null);$('#hScore').textContent=all.length?Math.round(all.reduce((a,b)=>a+b,0)/all.length)+'%':'未检查';
}
function epStates(c){const ES=(typeof EPSTATE!=='undefined'&&EPSTATE[c.id])||{};if(!Object.keys(ES).length)return'';const e=STORE.ep;
  return `<div class="epst"><span class="ln">各集状态</span><span class="${ES[e]?'':'on'}" title="锁里写的就是默认状态">默认${ES[e]?'':` · ${e}`}</span>${Object.entries(ES).map(([k,t])=>`<span class="${k===e?'on':''}" title="${esc(t)}">${k} ${esc(t.split('，')[0])}</span>`).join('')}<span class="ln">锁不变，提示词按集追加</span></div>`}
function renderTabs(){
  const c=C(),bad=probs(c),stale=Object.values(c.steps).filter(s=>s==='stale').length;
  const T=[['sheets','资产板',stale?`<i class="bad">${stale} 待更新</i>`:''],['locks',S.kind==='scene'?'场景锁':S.kind==='prop'?'道具锁':'连续性锁',`<i>${c.locks.length}</i>`],
    ['appear','出镜检查',S.checks[c.id]?`<i class="${bad?'bad':''}">${bad?'⚠ '+bad:'✓'}</i>`:`<i>${Object.keys(c.shots).length}</i>`],...(K().geo?[['geo','机位与光向','']]:[]),['prompt','提示词','']];
  $('#tabs').innerHTML=T.map(([k,n,x])=>`<button class="${S.tab===k?'on':''}" data-t="${k}">${n}${x}</button>`).join('');
  $$('#tabs [data-t]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;S.editLock=null;renderAll()});
}
const stepper=c=>`<div class="stepper">${stepsOf(c).map(s=>`<button class="stp s-${c.steps[s.k]} ${S.step===s.k?'on':''}" data-step="${s.k}"><span class="sk">${s.k}</span><span><b>${s.n}${s.review?' · 人审':''}</b><small>${ST[c.steps[s.k]]}</small></span></button>`).join('')}</div>`;
// ---------- 资产板 ----------
function renderSheets(){
  const c=C();if(!stepsOf(c).some(s=>s.k===S.step))S.step=stepsOf(c)[0].k;
  const k=S.step,st=c.steps[k],step=stepOf(k),takes=c.takes[k]||[],key=c.id+k,vi=S.view[key]??c.pick[k],t=takes[vi],first=stepsOf(c)[0].k,note=c.notes&&c.notes[k];
  let board;
  if(st==='none'||!takes.length)board=`<div class="board"><div class="emptyb">还没有${step.n}。<br>${step.d}<br><button class="btn pri" data-act="gen">让${K().agent}生成 4 张候选 · ¥${(PRICE_IMG*4).toFixed(1)}</button></div></div>`;
  else board=`<div class="board"><div class="btool"><b>${k} ${step.n}</b><small>${step.d}</small><span class="sp"></span>
     <button class="btn sm aibtn ${S.ai?'on':''}" data-act="ai" title="就地让 AI 改这一步：再抽、按锁修正、只改圈出的区域，或者直接说">✨ 让 AI 改</button><button class="btn sm ${S.annMode?'on':''}" data-act="ann">✏️ 圈选标注${S.ann.length?' · '+S.ann.length:''}</button>${k!==first?`<button class="btn sm ${S.compare?'on':''}" data-act="cmp">⇆ 与 ${first} 对比</button>`:''}<button class="btn sm" data-act="zoom">⤢ 放大</button></div>
     ${S.ai?aiBar(c,k,t):''}${note?`<div class="tnote">🧪 ${esc(note)}</div>`:''}
     ${S.compare&&k!==first?`<div class="cmp"><div>${sheet(c,first,pickTake(c,first))}<span>${first} ${stepOf(first).n}（源头）</span></div><div>${sheet(c,k,t)}<span>${k} 候选 ${vi+1}</span></div></div>`:
      `<div class="img ${S.annMode?'ann':''} ${S.kind==='scene'?'tall':''}" id="img">${sheet(c,k,t)}${K().flagStep===k?flags(c,t):''}${S.ann.map((a,i)=>`<div class="box" style="left:${a.x}%;top:${a.y}%;width:${a.w}%;height:${a.h}%"><i>区域${'①②③④⑤'[i]}</i></div>`).join('')}</div>`}
     <div class="hist">版本：${c.hist[k].map((h,i,a)=>`<span class="${i===a.length-1?'cur':''}" title="候选 ${h.t+1}">v${i+1} ${esc(h.n)}</span>`).join('<b>›</b>')}</div>
     ${st==='review'?`<div class="review-bar">🔒 这一步需要人审：对照右侧的锁逐条看一遍，没问题就批准，后面的产物都以它为准。<span class="sp"></span><button class="btn sm" data-act="reject">退回修改</button><button class="btn sm pri" data-act="approve">批准 ${k}</button></div>`:''}
     ${st==='stale'?`<div class="stalebar">⚠ 上游改了（锁或源头图），这张已经过期。<span class="sp"></span><button class="btn sm pri" data-act="regen">让${K().agent}按新设定重出</button></div>`:''}</div>`;
  const right=takes.length?`<div class="takes"><div class="th"><b>候选 ${takes.length}</b><button class="btn sm" data-act="reroll">再抽 4 张 · ¥${(PRICE_IMG*4).toFixed(1)}</button></div>
     ${takes.map((x,i)=>`<div class="tk ${i===vi?'view':''} ${x.gen?'gen':''}" data-tk="${i}">${x.gen?'<div style="aspect-ratio:1/1"></div>':sheet(c,k,x)}<div class="tb">${i===c.pick[k]?'<span class="pk">✓ 选用</span>':''}${x.isNew?'<span class="new">新</span>':''}${x.fix?`<span class="fix">${esc(x.fix)}</span>`:''}${(x.d||[]).map(d=>`<span class="bad">⚠ ${defLabel(c,d)}</span>`).join('')}</div></div>`).join('')}
     ${t&&!t.gen?`<div class="lockchk"><b>候选 ${vi+1} 对照锁</b>${c.locks.map(l=>{const x=(t.d||[]).includes(l.c);return `<div class="${x?'x':''}" title="${esc(l.t)}">${x?'⚠':'✓'} ${l.c}</div>`}).join('')}${(t.d||[]).filter(d=>DEF[d]).map(d=>`<div class="x">⚠ ${DEF[d]}</div>`).join('')}
       ${vi!==c.pick[k]?`<button class="btn sm pri" style="margin-top:6px;width:100%" data-act="pick">选用候选 ${vi+1}</button>`:''}</div>`:''}</div>`:'<div></div>';
  $('#view').innerHTML=stepper(c)+`<div class="sheet">${board}${right}</div>`;
  $$('#view [data-step]').forEach(b=>b.onclick=()=>{S.step=b.dataset.step;S.ann=[];S.annMode=false;S.compare=false;renderAll()});
  $$('#view [data-tk]').forEach(b=>b.onclick=()=>{S.view[key]=+b.dataset.tk;renderAll()});
  const A={ai:()=>{S.ai=!S.ai;renderAll();const q=$('#view [data-aiq]');if(q)q.focus()},gen:()=>DOCK.inline(()=>reroll(k,true)),reroll:()=>DOCK.inline(()=>reroll(k)),approve:()=>approve(k),reject:()=>reject(k),regen:()=>regenStale(),pick:()=>choose(k,vi),
    ann:()=>{S.annMode=!S.annMode;renderAll();if(S.annMode)toast('在图上拖出一个框，再在右边说要怎么改')},cmp:()=>{S.compare=!S.compare;renderAll()},zoom:()=>openModal(`${c.name} · ${k} ${step.n}`,`<div style="max-width:${S.kind==='scene'?420:820}px;margin:auto">${sheet(c,k,t)}</div>`)};
  $$('#view [data-act]').forEach(b=>b.onclick=()=>A[b.dataset.act]());
  $$('#view [data-aic]').forEach(b=>b.onclick=()=>aiAsset(b.dataset.aic));
  const q=$('#view [data-aiq]');if(q)q.onkeydown=e=>{if(e.key==='Enter'&&q.value.trim())aiAsset('free',q.value.trim());if(e.key==='Escape'){S.ai=false;renderAll()}};
  bindAnn();
}
// 就地 AI 命令条：再抽 4 张 / 按锁修正这张 / 只改圈出的区域 / 对照锁检查 / 直接说。结果是新的候选，出现在右边的候选列表里
function aiBar(c,k,t){const d=(t&&t.d)||[];
  return `<div class="aibar"><div class="chips"><button data-aic="reroll">↻ 再抽 4 张 · ¥${(PRICE_IMG*4).toFixed(1)}</button>${d.length?`<button data-aic="fixd">按锁修正这张（${d.map(x=>defLabel(c,x)).join('、')}）</button>`:''}${S.ann.length?`<button data-aic="ann">只改圈出的 ${S.ann.length} 处</button>`:'<button data-aic="annon">✏️ 先圈出要改的地方</button>'}<button data-aic="check">🔍 对照锁检查</button></div>
    <div class="aiq"><input data-aiq placeholder="${S.ann.length?`说圈出的 ${S.ann.length} 处要怎么改，回车`:'或者直接说这一步要怎么改，回车'}"><button class="ib" data-act="ai" title="关闭">✕</button></div></div>`}
// 角色定妆图上标出违反锁的位置（锁的证据区域）
function flags(c,t){return (t.d||[]).map(code=>{const l=c.locks.find(x=>x.c===code);if(!l||!l.ev||l.ev[0]!=='front')return'';const[x,y,w,h]=l.ev[1].split(' ').map(Number);
  return `<div class="flag" style="left:${x/2}%;top:${y/2.6}%;width:${w/2}%;height:${h/2.6}%"><i>违反 ${code}</i></div>`}).join('')}
function bindAnn(){
  const el=$('#img');if(!el||!S.annMode)return;let st=null,box=null;
  const pt=e=>{const r=el.getBoundingClientRect();return[(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100]};
  el.onmousedown=e=>{st=pt(e);box=document.createElement('div');box.className='box';el.appendChild(box);e.preventDefault()};
  el.onmousemove=e=>{if(!st)return;const p=pt(e),x=Math.min(st[0],p[0]),y=Math.min(st[1],p[1]);Object.assign(box.style,{left:x+'%',top:y+'%',width:Math.abs(p[0]-st[0])+'%',height:Math.abs(p[1]-st[1])+'%'})};
  el.onmouseup=e=>{if(!st)return;const p=pt(e),a={x:Math.min(st[0],p[0]),y:Math.min(st[1],p[1]),w:Math.abs(p[0]-st[0]),h:Math.abs(p[1]-st[1])};st=null;
    if(a.w>2&&a.h>2&&S.ann.length<5){S.ann.push(a);S.ai=true}renderAll();const q=$('#view [data-aiq]');if(q)q.focus()};
}
// ---------- 锁 ----------
function lockStat(c,l){if(!S.checks[c.id])return'<small>还没做出镜检查</small>';const r=Object.values(S.checks[c.id]).map(x=>x[l.c]).filter(Boolean);
  const ok=r.filter(v=>v.r==='✅').length,bad=r.filter(v=>v.r==='⚠').length,unk=r.filter(v=>v.r==='?').length;
  return `<b class="${bad?'bad':'ok'}">${bad?`⚠ ${bad} 镜偏离`:'✓ 全部一致'}</b><small>✅ ${ok} · ⚠ ${bad} · ? ${unk}</small>`}
function renderLocks(){
  const c=C(),t=pickTake(c,stepsOf(c)[0].k)||{d:[]};
  $('#view').innerHTML=`<div class="attrs">${c.attrs.map(([a,b])=>`<em>${a}</em><span>${esc(b)}</span>`).join('')}</div>
   <div class="lkall"><em>锁是永久的（八集共用）</em>改一条锁，用到它的 ${STORE.usage(c.id).length} 集（${epsLabel(c)}）都要重新检查。跨集的变化（比如拆掉耐热外壳）不改锁，记在头部的"各集状态"里。</div>
   ${S.kind!=='char'?`<div class="lkall"><em>生成时合成的整条锁</em><code>LOCK-${c.code}</code>：${esc(c.locks.map(l=>l.t).join('，'))}</div>`:''}
   <div class="locks">${c.locks.map((l,i)=>`<div class="lk ${S.editLock===i?'edit':''}"><div class="ev">${l.ev?W(l.ev[1],DRAW[c.id](l.ev[0],{d:t.d,expr:'calm'})):K().avatar(c)}</div>
     <div><code>${lockName(c,l)}</code>${S.editLock===i?`<textarea id="lkT" rows="2">${esc(l.t)}</textarea>`:`<p>${esc(l.t)}</p>`}</div>
     <div class="ls">${lockStat(c,l)}${S.editLock===i?`<span><button class="btn sm" data-lk="cancel">取消</button> <button class="btn sm pri" data-lk="save" data-i="${i}">保存</button></span>`:`<button class="btn sm" data-lk="edit" data-i="${i}">编辑</button>`}</div></div>`).join('')}
   ${S.lockSug?`<div class="lk lksug"><div class="ev">✨</div><div><code>LOCK-${c.code}-${S.lockSug[0]}</code><p>${esc(S.lockSug[1])}</p><small>AI 从源头图里找到的稳定特征，现有锁还没覆盖</small></div>
     <div class="ls"><span><button class="btn sm" data-lk="nosug">不要</button> <button class="btn sm pri" data-lk="addsug">加入锁</button></span></div></div>`:`<button class="lkadd" data-lk="add">✨ 让 AI 从源头图里再找一条该锁住的特征</button>`}</div>`;
  $$('#view [data-lk]').forEach(b=>b.onclick=()=>{const a=b.dataset.lk;
    if(a==='edit'){S.editLock=+b.dataset.i;renderAll();$('#lkT').focus()}
    if(a==='cancel'){S.editLock=null;renderAll()}
    if(a==='save'){const i=+b.dataset.i,v=$('#lkT').value.trim();S.editLock=null;if(v&&v!==c.locks[i].t)DOCK.inline(async()=>lockChanged(c,i,v));else renderAll()}
    if(a==='add')DOCK.inline(async()=>suggestLock(true));
    if(a==='addsug'){c.locks.push({c:S.lockSug[0],t:S.lockSug[1]});post({r:'sys',t:`已加入 LOCK-${c.code}-${S.lockSug[0]}`});S.lockSug=null;renderAll()}
    if(a==='nosug'){S.lockSug=null;renderAll()}});
}
// ---------- 出镜检查 ----------
function renderAppear(){
  const c=C(),R=S.checks[c.id],shots=Object.keys(c.shots).filter(sh=>!S.onlyBad||!R||Object.values(R[sh]||{}).some(v=>v.r!=='✅'));
  const n=R?Object.values(R).flatMap(x=>Object.values(x)):[],bad=n.filter(v=>v.r==='⚠').length,unk=n.filter(v=>v.r==='?').length;
  $('#view').innerHTML=`<div class="mxbar"><button class="btn sm pri" data-a="run">${R?'↻ 重新检查':'▶ 检查全部出镜'}</button><button class="btn sm ${S.onlyBad?'on':''}" data-a="bad">只看有问题的</button>
     <span class="sp"></span><small>${R?`${Object.keys(c.shots).length} 镜 × ${c.locks.length} 条锁 · ⚠ ${bad} 处偏离 · ? ${unk} 处看不清或不入画`:`${K().agent}会逐镜抽帧，对照每条锁判断`}</small></div>
   <div class="mx"><table><tr><th>镜头</th>${c.locks.map(l=>`<th title="${esc(l.t)}">${l.c}</th>`).join('')}</tr>
   ${shots.map(sh=>`<tr><td class="sh"><span class="thumb">${K().thumb(c,sh,badOf(c,sh))}</span><span><b>${sh} · ${SHOTS[sh][0]}${S.kind==='scene'?` · ${PLATES.find(p=>p.k===SHOTS[sh][1]).n}`:''}</b><small>${esc(SHOTS[sh][2])}</small></span></td>${c.locks.map(l=>{
     const v=((R||{})[sh]||{})[l.c],cls=!v?'':v.r==='✅'?'ok':v.r==='⚠'?'bad':v.r==='?'?'unk':'fixing',sel=S.cell&&S.cell.sh===sh&&S.cell.c===l.c;
     return `<td><span class="cell ${cls} ${sel?'sel':''}" ${v&&v.why?`title="${esc(v.why)}" data-cell="${sh}|${l.c}"`:''}>${v?v.r==='fixing'?'◌':v.r:'·'}</span></td>`}).join('')}</tr>`).join('')}</table></div>`;
  $('#view [data-a="run"]').onclick=()=>runCheck();
  $('#view [data-a="bad"]').onclick=()=>{S.onlyBad=!S.onlyBad;renderAll()};
  $$('#view [data-cell]').forEach(e=>e.onclick=()=>{const[sh,cc]=e.dataset.cell.split('|');S.cell={sh,c:cc};renderAll()});
}
// ---------- 场景：机位与光向 ----------
function renderGeo(){
  const c=C(),used=k=>Object.keys(SHOTS).filter(sh=>SHOTS[sh][1]===k);
  $('#view').innerHTML=`<div class="geo"><div class="gmap">${W(FRAME_VB,plate('plan',{}),'#faf8f2')}<span>俯视布局草图（S2 只给人看）</span></div>
    <div><p class="gtip">方位按指南针定，只用来推导各机位的左右。写提示词时用"面朝 X 时 Y 在右侧"，不写"画面一侧"；换机位时光的相对方向要跟着改写。</p>
    <table class="gt"><tr><th>机位</th><th>空镜</th><th>朝向</th><th>老灯</th><th>光</th><th>用在</th></tr>${PLATES.map(p=>`<tr><td><b>${p.n}</b></td><td><span class="gp" data-step="${p.step}">${W('0 0 180 320',plate(p.k,{}),'#111')}</span>${p.step}</td><td>${p.face}</td><td>${p.lamp}</td><td>${p.light}</td>
      <td>${used(p.k).map(sh=>`<span class="tag2">${sh}</span>`).join('')}</td></tr>`).join('')}</table>
    <p class="gtip">⚠ 实测：只写"老灯在摄影机身后"不够，4 张侧向/反打空镜都把老灯画进了画面。三处都要写"不出现太阳圆盘"：机位、光线、排除。</p></div></div>`;
  $$('#view .gp').forEach(b=>b.onclick=()=>{S.tab='sheets';S.step=b.dataset.step;renderAll()});
}
// ---------- 提示词 ----------
function promptRows(c,k){ // 设定卡里写了 prompts 就用它（场景的机位、光线各不相同），否则用工作流的通用模板
  const tok=c.locks.map(l=>`<span class="tok" title="${esc(l.t)}">${lockName(c,l)}</span>`).join('；'),look=c.looks.find(l=>l.id===S.look);
  return Object.entries((c.prompts&&c.prompts[k])||K().prompts[k]||{}).map(([h,v])=>`<div class="prow"><em>【${h}】</em><span>${esc(v).replace('{LOCKS}',tok).replace('{ASPECT}',PROJECT.aspectLabel).replace('{NAME}',c.name).replace('{TONE}',esc(c.tone))
    .replace('{LOOK}',esc(look.note||c.attrs.map(a=>a[1]).slice(0,2).join('；'))).replace('{DETAILS}',(c.details||[]).map((d,i)=>`${'①②③④⑤⑥'[i]}${d[0]}`).join(' ')).replace('{EXPRS}',(c.exprs||[]).map(e=>e[1]).join(' / '))
    .replace('{STATES}',esc((c.states||[]).map(s=>s[1]).join('；')))}</span></div>`).join('');
}
function renderPrompt(){
  const c=C();if(!stepsOf(c).some(s=>s.k===S.step))S.step=stepsOf(c)[0].k;const k=S.step,first=stepsOf(c)[0].k;
  $('#view').innerHTML=stepper(c)+`<div class="pmeta"><span class="chip">模型 <b>${/D2|PB|S2/.test(k)?'seedream-5-pro（带中文标签）':'seedream-4'}</b></span><span class="chip">参考图 <b>${k===first?'无（源头）':`${first} ${stepOf(first).n} · 选用版`}</b></span><span class="chip">${K().lookN} <b>${c.looks.find(l=>l.id===S.look).n}</b></span><span class="sp"></span><button class="btn sm" data-a="copy">复制提示词</button></div>
   <div class="pblk">${promptRows(c,k)}</div><p style="margin-top:8px;color:var(--mute);font-size:12px">紫色是锁，生成时原样展开；改锁会同步到所有用到它的提示词。</p>`;
  $$('#view [data-step]').forEach(b=>b.onclick=()=>{S.step=b.dataset.step;renderAll()});
  $('#view [data-a="copy"]').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText($('.pblk').innerText);toast('已复制')};
}
// ---------- 弹窗 ----------
function openModal(t,h){$('#mTitle').textContent=t;$('#mBody').innerHTML=h;$('#modal').hidden=false}
$('#mClose').onclick=()=>$('#modal').hidden=true;
$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modal').hidden=true};
function lineup(){
  const px=190;
  openModal('身高对比（所有角色同框）',`<div class="lineup">${CHARS.map(c=>{const h=c.height*px;return `<div class="p"><div style="height:${h}px;width:${h*200/260}px">${W('0 6 200 248',DRAW[c.id]('front',{expr:'calm',d:pickOf(c,'C1').d}))}</div><span>${c.name} · ${c.height} m</span></div>`}).join('')}</div>
   <p style="font-size:12px;color:var(--mute);margin-top:8px">两个角色同框时（如 SH10），这张图要和 C3 单视图一起喂给故事板和视频 Agent；T1 场景试拍里绒绒被画到嗡胸口高度，就是缺了它。</p>`);
}
$('#hExport').onclick=()=>toast(`已导出：${K().n}资产卡、锁、各产物选用图（模拟）`);
function renderAll(){
  STORE.get('spent').asset=S.spent;STORE.saveAssets(); // 产物链状态写回共享状态，阶段条和画布会跟着变
  renderKindSw();renderCast();renderHero();renderTabs();
  ({sheets:renderSheets,locks:renderLocks,appear:renderAppear,geo:renderGeo,prompt:renderPrompt})[S.tab]();
  renderCtx();renderSugs();
}
