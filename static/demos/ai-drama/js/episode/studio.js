/* 分镜 / 视频工作室（episode.html）。两个阶段，两种页面，不再共用一套布局：
   - 分镜（?m=shot）：分镜表，像文档一样从上往下读。每段一块：左边镜头行（可编辑），右边这一段的画面参考（故事板，一段一张，贴边不动）。
     另一个视图是故事板墙（?v=wall）：全集的故事板平铺，从头到尾看画面节奏和段间衔接。
   - 视频（?m=video）：审片室。中间播放器（可以和故事板对照），右边审批（G4 样片 / 正片 / G5 交付）和问题清单，下面时间线。镜头字段只读，改镜头回分镜。
   ?m=board 是旧链接，等于分镜。会改内容的操作交给 agent.js */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wait=ms=>new Promise(r=>setTimeout(r,ms*(window.SPEED||1)));
const MODES={
 shot:{n:'分镜',agent:'分镜 Agent',av:'📋',skill:'drama-shotlist + drama-storyboard · 镜头表和画面参考'},
 video:{n:'视频',agent:'视频 Agent',av:'🎞️',skill:'drama-video · 声音直出，不做后期'}};
const ALL=EP.segments.flatMap(g=>g.shots.map(s=>(s.seg=g.id,s)));
// 故事板 / 视频状态、出镜问题、镜头改动都存在 STORE 里（和其他工作室、画布共用）。台词来自剧本：镜头的"声音"由 STORE.lineOf 推出来
ALL.forEach(s=>{Object.assign(s,STORE.get('shots')[s.id]||{});s.line=STORE.lineOf(s.id)});
const Q=new URLSearchParams(location.search);
// 念白时长估算（和剧本工作室一致）：每秒 5 个字，省略号停 0.4 秒，其他标点停 0.15 秒
const speak=x=>x.replace(/（[^）]*）/g,'').replace(/[^一-龥A-Za-z0-9%]/g,'').length/5+(x.match(/……/g)||[]).length*.4+(x.replace(/……/g,'').match(/[，。？！—]/g)||[]).length*.15;
const E={ai:null,chk:{},mode:Q.get('m')==='video'?'video':'shot',view:Q.get('v')==='wall'?'wall':'table',sel:Q.get('s')||'SH01',t:0,playing:false,cmp:false,spent:STORE.get('spent').episode||0,board:STORE.get('board'),video:STORE.get('video')};
if(!ALL.some(s=>s.id===E.sel))E.sel='SH01';
document.getElementById('stagebar').dataset.cur=E.mode;
document.body.classList.toggle('m-sheet',E.mode==='shot');
const REF=STORE.REF;E.ref=STORE.get('refMode');
const ISSUES=STORE.ISSUES;
// 演示里只有 EP01 拆了镜头；其他集在这里只显示进度和去哪一步
const NOEP=STORE.ep!=='EP01';if(NOEP)document.body.classList.add('m-sheet');
const shotStale=id=>STORE.get('stale').shot.includes(id);
const SRC={char:['🧑‍🎨','角色 Agent','asset.html?k=char'],prop:['🧰','道具 Agent','asset.html?k=prop'],scene:['🏞️','场景 Agent','asset.html?k=scene'],shot:['📋','分镜 Agent','?m=shot&e=EP01']};
const shot=id=>ALL.find(s=>s.id===id),seg=id=>EP.segments.find(g=>g.id===id);
const segDur=g=>g.shots.reduce((a,s)=>a+s.duration_s,0),TOTAL=()=>EP.segments.reduce((a,g)=>a+segDur(g),0);
const start=s=>{let t=0;for(const x of ALL){if(x===s)return t;t+=x.duration_s}return t};
const issuesOf=id=>ISSUES.filter(i=>i.sh===id);
const fixedIn=s=>{const v=E.video[s.seg];return v.vers.length?v.vers[v.pick].fixed:[]};
// 视频里还没修的问题才画出来
const vidDefects=s=>{const v=E.video[s.seg];if(!v||!v.vers.length)return[];return issuesOf(s.id).filter(i=>i.lv==='bad'&&!fixedIn(s).includes(i.sh+i.lock)).map(i=>i.lock)};
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2400)}
// 资产缩略图（链到资产库）
const avChar=id=>SVG(id==='weng'?'60 26 80 72':'48 132 104 80',DRAW[id]('front',{expr:'calm'}),'#eef0f3');
const avProp=id=>SVG('0 0 200 200',PDRAW[id]('front',{state:'assembled'}),'#eef0f3');
const PROP_ID=p=>p.replace('_assembled','');
const PNAME={reflector:'反射板',panel:'光伏板',parachute:'床单伞',beam:'聚光光斑',fire:'苔藓起火'},CNAME={weng:'嗡',rong:'绒绒'};
const PLATE_N={master:'S1 主空镜',bg:'S1bg 背景近景',side:'S1s 侧向',reverse:'S1r 反打'};
function assetsOf(s){return [...s.characters.map(c=>({k:'char',id:c,n:CNAME[c],av:avChar(c)})),...s.props.map(p=>({k:'prop',id:PROP_ID(p),n:PNAME[PROP_ID(p)],av:avProp(PROP_ID(p))})),
  ...s.fx.map(f=>({k:'prop',id:f,n:PNAME[f],av:SVG('0 0 200 200',PDRAW[f]('front',{}))})),{k:'scene',id:'crash',n:PLATE_N[s.plate],av:SVG('0 100 180 180',plate(s.plate,{}))}]}
const ST_N={approved:'已批准',review:'待人审',stale:'待更新',draft:'已生成'};
// 一段的画面参考面板：默认故事板；不常用的选项收在右上角 ⋯ 里（重出整张、对照资产检查、这段不出图）
function refMenu(g){const rm=E.ref[g.id],it=(a,n,t)=>`<button data-m="${a}|${g.id}" title="${t||''}">${n}</button>`;
  return `<span class="rmw"><button class="ib rmb" data-menu="${g.id}" title="更多">⋯</button><div class="rmenu" hidden>
    ${rm!=='none'?it('regen','↻ 重出整张')+it('check','🔍 对照资产检查'):''}
    ${rm==='none'?it('ref:board','恢复出故事板',REF.board.d):it('ref:none','这段不出图',REF.none.d)}</div></span>`}
// 真图 / 真视频（media.yaml）：只对得上第一版，原型里重出的版本还是占位图。模型出的故事板版式不一定规整，整张显示，下面一排格号用来选镜头
const realOf=(o)=>{const m=PROJECT.findMedia({episode:PROJECT.ep0,...o})[0];return m&&PROJECT.mediaUrl(m.path)};
const realBoard=g=>realOf({segment:g.id,kind:'board',take:E.board[g.id].v-1});
const realVideo=g=>E.video[g.id].pick===0&&realOf({segment:g.id,kind:'video',take:0});
function refPanel(g,o={}){const rm=E.ref[g.id],R=REF[rm],b=E.board[g.id];
  if(o.mini&&rm==='none')return `<div class="refnone mini"><b>不出图</b><small>只用资产参考</small></div>`;
  const head=`<div class="refh"><b>${R.n}</b><small>${rm==='none'?'只用资产参考图':`v${b.v} · 约 ¥${R.c.toFixed(1)}`}</small>${refMenu(g)}</div>`;
  if(rm==='none')return head+`<div class="refnone"><small>${esc(R.d)}</small>${[...new Map(g.shots.flatMap(assetsOf).map(a=>[a.n,a])).values()].map(a=>`<span class="ra"><i>${a.av}</i>${a.n}</span>`).join('')}<button class="btn sm" data-m="ref:board|${g.id}">恢复出故事板</button></div>`;
  const real=realBoard(g);
  if(real)return (o.mini?'':head)+`<div class="breal ${o.mini?'mini':''}"><img src="${real}" alt="${g.id} 故事板"><div class="bnums">${g.shots.map((x,i)=>`<button class="${x.id===E.sel?'on':''}" data-cell="${x.id}" title="${x.id} ${esc(x.keyframe)}">${i+1}${o.mini?'':` · ${x.id}`}</button>`).join('')}</div></div>`;
  return (o.mini?'':head)+`<div class="bgrid ref-${rm} ${o.mini?'mini':''}">${g.shots.map((x,i)=>`<div class="bcell ${x.id===E.sel?'on':''}" data-cell="${x.id}" title="${x.id} ${esc(x.keyframe)}">${frame(x,{d:issuesOf(x.id).filter(i=>i.src!=='shot').map(i=>i.lock)})}<span>${o.mini?i+1:`${i+1} · ${x.id}`}</span>${o.mini?'':`<button class="rr" data-reroll="${x.id}" title="只重出这一格">↻</button>`}</div>`).join('')}</div>`}

// ---------- 分镜：分镜表 / 故事板墙 ----------
function segHead(g,t0){const b=E.board[g.id],rm=E.ref[g.id];
  const act=b.st==='review'?`<button class="btn sm pri" data-a="approve|${g.id}">批准（G3）</button>`:b.st==='stale'&&rm!=='none'?`<button class="btn sm pri" data-a="regen|${g.id}">按新镜头表重出</button>`:`<span class="pill ${b.st==='approved'?'ok':'bad'}">${b.st==='approved'?'✓ 已批准':ST_N[b.st]}</span>`;
  return `<div class="sgh"><div class="sgt"><b>${g.id} ${g.title}</b><small>${t0}–${t0+segDur(g)}s · ${g.shots.length} 镜</small></div>
    <button class="btn sm aichk" data-chk="${g.id}" title="让 AI 检查这段：景别节奏、台词时长、轴线、段间衔接">✨ 检查这段</button>${act}<a class="ib" href="?m=video&e=EP01&s=${g.shots[0].id}" title="${E.video[g.id].vers.length?'去审片室看这段样片':'去审片室出这段样片'}">🎞️</a></div>
   ${chkBlock(g)}${shotStale(g.id)?`<div class="stalebar">✍️ 剧本改了 ${g.id} 的动作：这段的关键帧和动作要按新剧本改，改完后画面参考和视频标为待更新<span class="sp"></span><button class="btn sm pri" data-a="script|${g.id}">按新剧本更新</button><a class="btn sm" href="script.html?e=EP01">看剧本</a></div>`:''}`}
function shotRow(s){const opt=(arr,v)=>arr.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join(''),lb=STORE.lineBlock(s.id),warn=issuesOf(s.id).filter(i=>i.src==='shot');
  return `<div class="srow ${s.id===E.sel?'on':''}" data-row="${s.id}"><div class="sid"><b>${s.id}</b><small>${start(s)}s · ${s.beat}</small></div>
    <div class="sf"><div class="sl"><select data-f="framing" data-sh="${s.id}">${opt(['全景','中景','近景','特写'],s.framing)}</select>
      <select data-f="camera" data-sh="${s.id}">${Object.entries(CAM).map(([k,v])=>`<option value="${k}" ${k===s.camera?'selected':''}>${v}</option>`).join('')}</select>
      <span class="dur"><button data-dur="${s.id}|-1">−</button><b>${s.duration_s}s</b><button data-dur="${s.id}|1">＋</button></span><span class="sp"></span>
      <span class="ast">${assetsOf(s).map(a=>`<a href="asset.html?k=${a.k}&e=EP01&id=${a.id}" title="${a.n}（去资产库）"><i>${a.av}</i></a>`).join('')}</span>
      <button class="aib ${E.ai&&E.ai.sh===s.id?'on':''}" data-ai="${s.id}" title="让 AI 改这一镜">✨</button></div>
     <textarea data-f="keyframe" data-sh="${s.id}" rows="2" placeholder="关键帧：第一帧画什么">${esc(s.keyframe)}</textarea>
     <textarea data-f="motion" data-sh="${s.id}" rows="1" placeholder="动作：视频里发生什么">${esc(s.motion)}</textarea>
     <div class="snd">${s.line?`🔊 ${esc(s.line)}`:'<span>（无声音）</span>'}${lb?`<a href="script.html?e=EP01&b=${lb}" title="台词只在剧本里改">去剧本改 ›</a>`:''}</div>
     ${warn.map(i=>`<div class="sw">⚠ ${i.lock}：${esc(i.why)}</div>`).join('')}${E.ai&&E.ai.sh===s.id?aiBlock(s):''}</div></div>`}
// 就地调用 AI：命令条 → 改写中 → 改前改后（采用 / 再来一版 / 不要）。不用打开右上角的 Agent
const AI_CHIPS=[['punch','更有冲击力'],['frame','换个景别'],['simple','动作只留一个'],['sync','对上台词时长'],['cell','只重出这一格画面']];
const FN={framing:'景别',camera:'运镜',duration_s:'时长',keyframe:'关键帧',motion:'动作'};
function aiBlock(s){const a=E.ai;
  if(a.busy)return `<div class="aibusy">✨ AI 正在改 ${s.id}…</div>`;
  if(a.prop)return `<div class="aiprop"><small>✨ ${esc(a.prop.note)}</small>${Object.entries(a.prop.f).map(([k,v])=>`<div class="df"><em>${FN[k]}</em>${k==='keyframe'||k==='motion'?`<div class="lg"><del>${esc(s[k])}</del><ins>${esc(v)}</ins></div>`:`<div><del>${k==='camera'?CAM[s[k]]:s[k]+(k==='duration_s'?'s':'')}</del> → <ins>${k==='camera'?CAM[v]:v+(k==='duration_s'?'s':'')}</ins></div>`}</div>`).join('')}
    <div class="aia"><button class="btn sm pri" data-aiok>采用</button><button class="btn sm" data-aiagain>再来一版</button><button class="btn sm" data-aix>不要</button><span>采用后这段的故事板和视频标为待更新</span></div></div>`;
  return `<div class="aibar"><div class="chips">${AI_CHIPS.map(([k,n])=>`<button data-aic="${k}">${n}</button>`).join('')}</div>
    <div class="aiq"><input data-aiq placeholder="或者直接说这一镜要怎么改，回车" value="${esc(a.q||'')}"><button class="ib" data-aix title="关闭">✕</button></div></div>`}
// 段头"✨ 检查这段"：结果直接列在段头下面，每条带一键修
function chkBlock(g){const r=E.chk[g.id];if(!r)return'';if(r.busy)return `<div class="chk"><div class="aibusy">✨ 正在检查 ${g.id}…</div></div>`;
  return `<div class="chk">${r.items.map((x,i)=>`<div class="ci ${x.lv}"><span>${x.lv==='ok'?'✓':'!'}</span><div>${esc(x.t)}</div>${x.fix?`<button class="btn sm" data-cfx="${g.id}|${i}">${esc(x.fix[0])}</button>`:''}</div>`).join('')}<button class="ib cx" data-chkx="${g.id}" title="收起">✕</button></div>`}
function renderSheet(){
  const top=`<div class="shbar"><nav class="vsw"><a class="${E.view==='table'?'on':''}" href="?m=shot&e=EP01&s=${E.sel}">☰ 分镜表</a><a class="${E.view==='wall'?'on':''}" href="?m=shot&e=EP01&v=wall&s=${E.sel}">▦ 故事板墙</a></nav>
    <small>${EP.aspect} · ${TOTAL()}s · ${EP.segments.length} 段 ${ALL.length} 镜 · 本页已花 ¥${E.spent.toFixed(1)}</small></div>`;
  if(E.view==='wall'){
    $('#mon').innerHTML=top+`<p class="wtip">全集的画面参考平铺在一起：从头到尾看节奏和段间衔接。点一段回到分镜表。</p>
     <div class="wall">${EP.segments.map(g=>{const b=E.board[g.id];return `<a class="wc" href="?m=shot&e=EP01&s=${g.shots[0].id}"><div class="wh"><b>${g.id} ${g.title}</b><span class="pill ${b.st==='approved'?'ok':b.st==='stale'?'bad':'wa'}">${REF[E.ref[g.id]].n} · ${ST_N[b.st]}</span></div>${refPanel(g,{mini:true})}
       <small>${g.shots.map(x=>`${x.id} ${x.framing}`).join(' · ')}</small></a>`}).join('')}</div>`;
  }else{let t0=0;
    $('#mon').innerHTML=top+EP.segments.map(g=>{const h=`<section class="sgm" id="g-${g.id}">${segHead(g,t0)}<div class="sgb"><div class="rows">${g.shots.map(shotRow).join('')}</div><div class="refc">${refPanel(g)}</div></div></section>`;t0+=segDur(g);return h}).join('');
  }
  $$('#mon [data-f]').forEach(e=>e.onchange=()=>editShot(shot(e.dataset.sh),e.dataset.f,e.value));
  $$('#mon [data-dur]').forEach(b=>b.onclick=()=>{const[id,d]=b.dataset.dur.split('|'),s=shot(id);editShot(s,'duration_s',Math.max(1,s.duration_s+ +d))});
  $$('#mon [data-menu]').forEach(b=>b.onclick=e=>{e.stopPropagation();const m=b.nextElementSibling,was=m.hidden;$$('#mon .rmenu').forEach(x=>x.hidden=true);m.hidden=!was});
  $$('#mon [data-m]').forEach(b=>b.onclick=()=>{const[a,id]=b.dataset.m.split('|');$$('#mon .rmenu').forEach(x=>x.hidden=true);if(a.startsWith('ref:'))setRef(id,a.slice(4));else if(a==='regen')DOCK.inline(()=>regenBoard(id));else if(a==='check'){E.sel=seg(id).shots[0].id;DOCK.inline(async()=>checkBoard())}});
  $$('#mon [data-reroll]').forEach(b=>b.onclick=e=>{e.stopPropagation();DOCK.inline(()=>rerollCell(b.dataset.reroll))});
  const A={approve:approveBoard,regen:id=>DOCK.inline(()=>regenBoard(id)),script:id=>DOCK.inline(()=>fromScript(id))};
  $$('#mon [data-a]').forEach(b=>b.onclick=()=>{const[a,id]=b.dataset.a.split('|');A[a](id)});
  // 行和格一一对应：悬停哪一行就高亮对应格；点行或点格都选中这一镜（不重画，保住正在编辑的输入框）
  $$('#mon [data-row]').forEach(r=>{r.onmouseenter=()=>hl(r.dataset.row,true);r.onmouseleave=()=>hl(r.dataset.row,false);r.onclick=e=>{if(!e.target.closest('a,button'))select(r.dataset.row)}});
  $$('#mon [data-cell]').forEach(c=>c.onclick=()=>{select(c.dataset.cell,true)});
  // 就地 AI
  $$('#mon [data-ai]').forEach(b=>b.onclick=()=>{const id=b.dataset.ai;E.ai=E.ai&&E.ai.sh===id&&!E.ai.prop&&!E.ai.busy?null:{sh:id,n:0};select(id);renderAll();const q=$('#mon [data-aiq]');if(q)q.focus()});
  $$('#mon [data-aic]').forEach(b=>b.onclick=()=>aiRun(b.dataset.aic));
  const q=$('#mon [data-aiq]');if(q)q.onkeydown=e=>{if(e.key==='Enter'&&q.value.trim()){E.ai.q=q.value.trim();aiRun('free')}if(e.key==='Escape'){E.ai=null;renderAll()}};
  $$('#mon [data-aix]').forEach(b=>b.onclick=()=>{E.ai=null;renderAll()});
  const ok=$('#mon [data-aiok]');if(ok)ok.onclick=aiAdopt;const ag=$('#mon [data-aiagain]');if(ag)ag.onclick=()=>{E.ai.n++;aiRun(E.ai.k)};
  $$('#mon [data-chk]').forEach(b=>b.onclick=()=>segCheck(b.dataset.chk));
  $$('#mon [data-chkx]').forEach(b=>b.onclick=()=>{delete E.chk[b.dataset.chkx];renderAll()});
  $$('#mon [data-cfx]').forEach(b=>b.onclick=()=>{const[id,i]=b.dataset.cfx.split('|');E.chk[id].items[+i].fix[1]();segCheck(id,true)});
}
const hl=(id,on)=>$$(`#mon [data-cell="${id}"]`).forEach(c=>c.classList.toggle('hl',on));
function select(id,scroll){E.sel=id;E.t=start(shot(id));$$('#mon [data-row]').forEach(r=>r.classList.toggle('on',r.dataset.row===id));$$('#mon [data-cell]').forEach(c=>c.classList.toggle('on',c.dataset.cell===id));
  if(scroll){const r=$(`#mon [data-row="${id}"]`);if(r)r.scrollIntoView({block:'center',behavior:'smooth'})}renderCtx();renderSugs()}
// ---------- 视频：审片室 ----------
function renderPlayer(){
  const s=shot(E.sel),g=seg(s.seg),v=E.video[g.id];let h;
  if(!v.vers.length)h=`<div class="mbar"><b>${g.id} ${g.title}</b><small>还没有样片</small></div><div class="screen empty">还没有这一段的样片<button class="btn pri" data-a="genVideo">出样片 · ¥${(6*segDur(g)/10).toFixed(1)}</button></div>`;
  else{const ver=v.vers[v.pick],t0=start(g.shots[0]),local=Math.max(0,Math.min(segDur(g),E.t-t0)),rm=E.ref[g.id];
    const real=realVideo(g),vid=real?`<div class="screen"><video src="${real}" controls playsinline preload="metadata" data-off="${start(s)-t0}"></video><span class="tagv">${ver.n} · 真实生成</span></div>`:`<div class="screen">${frame(s,{d:vidDefects(s)})}<span class="tagv">${ver.mode==='final'?'正片 1080p':'样片 480p'}</span>${s.line?`<div class="cap">🔊 ${esc(s.line)}<small>音频直出（预览里把声音写成文字，成片不加字幕）</small></div>`:''}<div class="prog" style="width:${local/segDur(g)*100}%"></div></div>`;
    h=`<div class="mbar"><b>${g.id} ${g.title}</b><div class="vers2">${v.vers.map((x,i)=>`<button class="${i===v.pick?'on':''}" data-ver="${i}">${x.n}</button>`).join('')}</div><span class="sp"></span>
       <button class="btn sm ${E.cmp?'on':''}" data-a="cmp" title="和这段的画面参考并排对照，看构图有没有跑偏">◫ 对照${REF[rm].n}</button><button class="btn sm" data-a="play">${E.playing?'⏸ 暂停':'▶ 本段'}</button><button class="btn sm" data-a="playAll">▶ 全片</button></div>
     ${E.cmp?`<div class="cmp2"><div><span>${REF[rm].n}（分镜里批准的）</span>${rm==='none'?`<div class="screen empty">这段不出图</div>`:`<div class="screen ref-${rm}">${frame(s)}</div>`}</div><div><span>${ver.n}</span>${vid}</div></div>`:vid}`}
  $('#mon').innerHTML=h;
  $$('#mon video[data-off]').forEach(v=>v.onloadedmetadata=()=>v.currentTime=+v.dataset.off); // 定位到选中的镜头
  const A={genVideo:()=>genVideo(g.id),play:()=>play(g),playAll:()=>play(null),cmp:()=>{E.cmp=!E.cmp;renderPlayer()}};
  $$('#mon [data-a]').forEach(b=>b.onclick=()=>A[b.dataset.a]());
  $$('#mon [data-ver]').forEach(b=>b.onclick=()=>{E.video[g.id].pick=+b.dataset.ver;renderAll()});
}
// 右侧：审批（G4 样片 → 正片 → G5 交付）+ 当前镜头（只读）+ 全集问题清单
function renderReview(){
  const s=shot(E.sel),g=seg(s.seg),G=STORE.get('gates'),has=EP.segments.filter(x=>E.video[x.id].vers.length).length,fin=EP.segments.every(x=>{const v=E.video[x.id];return v.vers.length&&v.vers[v.pick].mode==='final'});
  const all=ALL.flatMap(x=>issuesOf(x.id).filter(i=>i.lv==='bad'&&E.video[x.seg].vers.length).map(i=>({...i,fixed:fixedIn(x).includes(i.sh+i.lock)}))),open=all.filter(i=>!i.fixed),lb=STORE.lineBlock(s.id);
  const step=(k,n,ok,cur,body)=>`<div class="gstep ${ok?'ok':cur?'cur':''}"><span>${ok?'✓':k}</span><div><b>${n}</b>${body}</div></div>`;
  $('#insp').innerHTML=`<div class="rv"><h4>审批</h4>
    ${step('G4','样片审批',G.G4,!G.G4,G.G4?'<small>已通过</small>':`<small>样片 ${has}/${EP.segments.length} 段 · 未修补 ${open.length} 处</small><button class="btn sm pri" data-g="g4" ${has<EP.segments.length?'disabled':''}>批准样片</button>`)}
    ${step('·','正片',fin,G.G4&&!fin,fin?'<small>3 段正片已出</small>':G.G4?'<button class="btn sm pri" data-g="final">出正片</button>':'<small>G4 之后</small>')}
    ${step('G5','交付确认',G.G5,fin&&!G.G5,G.G5?'<small>已交付，按段拼接成片（不加字幕和配乐）</small>':fin?'<button class="btn sm pri" data-g="g5">确认交付</button>':'<small>正片出齐之后</small>')}
   <h4>当前镜头 <a href="?m=shot&e=EP01&s=${s.id}">去分镜改 ›</a></h4>
    <div class="cur"><b>${s.id}</b> ${s.framing} · ${CAM[s.camera]} · ${s.duration_s}s<p>${esc(s.keyframe)}</p>${s.line?`<p class="ln">🔊 ${esc(s.line)}${lb?` <a href="script.html?e=EP01&b=${lb}">去剧本改 ›</a>`:''}</p>`:''}</div>
   <h4>问题清单 <small>${open.length} 处待修补 · ${all.length-open.length} 处已修补</small></h4>
    ${all.map(i=>`<div class="iss ${i.fixed?'ok':''} ${i.sh===E.sel?'sel':''}" data-go="${i.sh}"><b>${i.sh} · ${SRC[i.src][0]} ${i.lock}${i.fixed?' · 已修补':''}</b>${esc(i.why)}
      ${i.fixed?'':`<div class="ia"><button class="btn sm" data-fix="${i.sh}|${i.lock}">交给视频 Agent 修补</button><a class="btn sm" href="${SRC[i.src][2]}&e=EP01">去${SRC[i.src][1].replace(' Agent','')}</a></div>`}</div>`).join('')||'<div class="iss ok">还没有样片，出了样片才有出镜检查</div>'}</div>`;
  $$('#insp [data-go]').forEach(b=>b.onclick=e=>{if(!e.target.closest('button,a'))pick(b.dataset.go)});
  $$('#insp [data-fix]').forEach(b=>b.onclick=()=>{const[sh,l]=b.dataset.fix.split('|');DOCK.inline(()=>fixIssue(sh,l))});
  const GA={g4:approveG4,final:goFinal,g5:confirmG5};$$('#insp [data-g]').forEach(b=>b.onclick=()=>GA[b.dataset.g]()); // 审批要人拍板，确认卡片照常弹出
}
// ---------- 底：时间线（只在审片室） ----------
function renderTl(){if(NOEP||E.mode!=='video')return;
  const T=TOTAL(),pct=t=>t/T*100,S=x=>`left:${pct(start(x))}%;width:calc(${pct(x.duration_s)}% - 2px)`;
  const segBlk=EP.segments.map(g=>{const t0=start(g.shots[0]),v=E.video[g.id];
    return `<div class="blk seg" style="left:${pct(t0)}%;width:calc(${pct(segDur(g))}% - 2px)" data-sel="${g.shots[0].id}">${g.id} ${g.title}<i>${v.vers.length?v.vers[v.pick].n:'还没有样片'}${v.st==='stale'?' · ⚠ 待重出':''}</i></div>`}).join('');
  const kind=l=>/^（音效）/.test(l)?'sfx':/^（画外音）/.test(l)?'vo':'';
  const joins=EP.segments.slice(1).map(g=>`<div class="join" style="left:${pct(start(g.shots[0]))}%"></div>`).join('');
  $('#tl').innerHTML=`<div class="tlh"><b>时间线</b><small>${EP.aspect} · ${T}s · ${EP.segments.length} 段 ${ALL.length} 镜 · 本页已花 ¥${E.spent.toFixed(1)} · 红线是段落交界（视频分段生成后按顺序拼接）</small><span class="sp"></span><small>${E.t.toFixed(1)}s</small></div>
   <div class="trk"><em></em><div class="ruler">${[...Array(Math.floor(T/2)+1)].map((_,i)=>`<span style="left:${pct(i*2)}%">${i*2}s</span>`).join('')}</div></div>
   <div class="trk"><em>段落</em><div class="lane">${segBlk}${joins}</div></div>
   <div class="trk"><em>镜头</em><div class="lane" style="--h:50px">${ALL.map(x=>`<div class="blk shot ${x.id===E.sel?'on':''}" style="${S(x)}" data-sel="${x.id}"><span class="th">${frame(x)}</span><span>${x.id}<br>${x.framing}·${CAM[x.camera]}</span></div>`).join('')}${joins}</div></div>
   <div class="trk"><em>声音</em><div class="lane">${ALL.filter(x=>x.line).map(x=>`<div class="blk snd ${kind(x.line)} ${x.id===E.sel?'on':''}" style="${S(x)}" data-sel="${x.id}" title="${esc(x.line)}">${kind(x.line)==='sfx'?'🔊':kind(x.line)==='vo'?'🗣':'💬'} ${esc(x.line.replace(/^（[^）]+）/,''))}</div>`).join('')}</div></div>
   <div class="trk"><em>问题</em><div class="lane">${ALL.map(x=>{const is=issuesOf(x.id).filter(i=>i.lv==='bad');if(!is.length||!E.video[x.seg].vers.length)return'';const open=is.filter(i=>!fixedIn(x).includes(i.sh+i.lock));
     return `<div class="mk ${!open.length?'fixed':''}" style="left:calc(${pct(start(x)+x.duration_s/2)}% - 11px)" data-sel="${x.id}" title="${esc(is.map(i=>i.lock+'：'+i.why).join('\n'))}">${open.length?'⚠'+(open.length>1?open.length:''):'✓'}</div>`}).join('')}</div></div>
   <div id="playhead"></div>`;
  const ph=$('#playhead'),lane=$('#tl .lane');if(lane){const r=lane.getBoundingClientRect(),rt=$('#tl').getBoundingClientRect();ph.style.left=(r.left-rt.left+E.t/T*r.width+$('#tl').scrollLeft)+'px'}
  $$('#tl [data-sel]').forEach(b=>b.onclick=()=>pick(b.dataset.sel));
}
function pick(id){if(E.mode==='shot')return select(id,true);E.sel=id;E.t=start(shot(id));renderAll()}
E.t=start(shot(E.sel));
async function play(g){
  if(E.playing){E.playing=false;return renderAll()}
  const list=g?g.shots:ALL.filter(s=>E.video[s.seg].vers.length);if(!list.length)return toast('还没有可播放的视频段');
  E.playing=true;
  for(const s of list){if(!E.playing)break;E.sel=s.id;for(let t=0;t<s.duration_s&&E.playing;t+=.5){E.t=start(s)+t;renderPlayer();renderTl();await wait(250)}}
  E.playing=false;renderAll();
}
function openModal(t,h){$('#mTitle').textContent=t;$('#mBody').innerHTML=h;$('#modal').hidden=false}
$('#mClose').onclick=()=>$('#modal').hidden=true;
function renderNoEp(){const e=STORE.ep,o=OUTLINE.find(x=>x.id===e),S=STORE.stages(e),nx=S.find(s=>s.st!=='done');
  $('#insp').innerHTML='';$('#tl').innerHTML='';
  $('#mon').innerHTML=`<div class="emptyb" style="margin-top:12vh">${e}《${o.title}》还没有${E.mode==='video'?'样片':'镜头表'}。<br>分镜在剧本（G1）和资产（G2）之后：分镜 Agent 直接选用资产库里的角色、道具、场景。<br>
    <small>${S.map(s=>`${s.n} ${s.s}`).join(' · ')}</small><br><a class="btn pri" href="${nx.href}">下一步：${nx.n}</a> <a class="btn" href="${STAGEBAR.epHref('EP01')}">看 EP01</a></div>`}
function renderHdr(){const M=MODES[E.mode];$('#agentName').textContent=M.agent;$('#agentAv').textContent=M.av;$('#agentSkill').textContent=M.skill;document.title=M.n+'工作室'}
function renderAll(){if(NOEP)return renderNoEp();STORE.get('spent').episode=E.spent;STORE.save();renderHdr();
  if(E.mode==='shot'){const y=$('#mon').scrollTop;renderSheet();$('#mon').scrollTop=y}else{renderPlayer();renderReview();renderTl()}
  renderCtx();renderSugs()}
window.addEventListener('resize',renderTl);
document.addEventListener('click',e=>{if(!e.target.closest('.rmw'))$$('#mon .rmenu').forEach(x=>x.hidden=true)});
// 从别处带 ?s= 进来：分镜表里滚到那一镜
if(E.mode==='shot'&&Q.get('s'))addEventListener('DOMContentLoaded',()=>{const r=$(`#mon [data-row="${E.sel}"]`);if(r)r.scrollIntoView({block:'center'})});
