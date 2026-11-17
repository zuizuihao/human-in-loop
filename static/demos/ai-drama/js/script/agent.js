/* 剧本工作室右侧的剧本 Agent 与它执行的操作（全部模拟；LLM 由宿主工具完成，不花生成费） */
const M=[];let busy=false;
const post=m=>(M.push(m),renderMsgs(),DOCK.notify(m),m);
async function say(t){const m=post({r:'ag',t:'…'});await wait(350);m.t=t;renderMsgs()}
const card=(b,lines,acts)=>post({r:'card',b,lines,acts});
function renderMsgs(){
  const el=$('#aMsgs'),hello=sc()?'我负责剧本：按场景 Skill 的节拍拆段，写对白、画外音和音效，标出钩子、反转和卡点。你指哪句我改哪句，已批准的段落不推翻。':`${ep().id} 还只有大纲。我可以按每集节拍写初稿，压到 30 秒、分 3 段。`;
  el.innerHTML=M.length?M.map((m,i)=>m.r==='card'?`<div class="acard"><b>${esc(m.b)}</b>${m.lines&&m.lines.length?`<ul>${m.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:''}${m.acts?`<div class="acts">${m.acts.map((a,j)=>`<button class="btn ${j===0?'pri':''}" data-m="${i}" data-j="${j}">${esc(a[0])}</button>`).join('')}</div>`:m.done?`<div class="done">${esc(m.done)}</div>`:''}</div>`:`<div class="m ${m.r}">${esc(m.t)}</div>`).join(''):`<div class="m sys">${hello}</div>`;
  el.scrollTop=1e9;
  $$('#aMsgs [data-m]').forEach(b=>b.onclick=()=>{const m=M[+b.dataset.m],a=m.acts[+b.dataset.j];m.done='✓ '+a[0];m.acts=null;renderMsgs();a[1]()});
}
function renderCtx(){const s=sc(),b=SC.sel&&s&&blk(SC.sel);
  $('#aCtx').innerHTML=`<span>${ep().id} ${ep().title}</span>${b?`<span>${b.id} · ${TN[b.t]}${b.who?' · '+b.who:''}<b data-x title="取消选中">✕</b></span>`:''}${s&&!G1(s)?`<span class="a">G1 待人审</span>`:''}`;
  const x=$('#aCtx [data-x]');if(x)x.onclick=()=>{SC.sel=null;renderAll()};
}
function sugs(){if(busy)return[];const e=ep(),s=e.sc;
  if(!s)return[[`写 ${e.id} 初稿`,()=>writeEp(e.id)]];
  const out=[],b=SC.sel&&blk(SC.sel),p=b&&SC.P[b.id];
  if(p)out.push([`采用 ${b.id} 改写`,()=>adopt(b.id)],['换一个',()=>rewrite(b)]);
  s.segs.filter(g=>g.st!=='approved').forEach(g=>out.push([`批准 ${g.id}`,()=>approveSeg(g.id)]));
  if(b&&!p){const k=Object.keys(ALT[b.id]||{});k.forEach(st=>out.push([STYLE[st],()=>propose(b,st)]));if(!k.length)out.push(['改写这一条',()=>rewrite(b)])}
  if(!b)out.push(['检查剧本',checkAll],['开头 3 秒钩子再狠一点',()=>fixBy('开头 3 秒有冲突')],['结尾留下集卡点',()=>fixBy('结尾卡点')],['台词更山东味儿',()=>styleAll('dialect')],['导出 script.md',exportMd]);
  return out;
}
function renderSugs(){const s=sugs();$('#aSugs').innerHTML=s.map(([t],i)=>`<button class="${i===0?'pri':''}" data-s="${i}">${esc(t)}</button>`).join('');$$('#aSugs [data-s]').forEach(b=>b.onclick=()=>{post({r:'me',t:s[+b.dataset.s][0]});s[+b.dataset.s][1]()})}
async function task(fn){busy=true;renderSugs();try{await fn()}finally{busy=false;renderAll()}}

// ---------- 改写：只出候选，人采用后才改；采用 = 新版本，该段重新人审，下游分镜标为待更新 ----------
function propose(b,style){return task(async()=>{const a=ALT[b.id]&&ALT[b.id][style];
  if(!a)return say(`${b.id} 没有「${STYLE[style]}」的写法，直接说你想往哪儿改。`);
  SC.sel=b.id;SC.tab='script';(SC.tried[b.id]=SC.tried[b.id]||[]).push(style);await wait(500);
  SC.P[b.id]={x:a[0],why:a[1],style,tag:a[2]};card(`${b.id} ${STYLE[style]}`,[`原文：${b.x}`,`改成：${a[0]}`,a[1],'在剧本里点"采用"才会改']);
})}
// 就地 AI：行尾 ✨ 的命令条。调用和结果记进剧本 Agent 的对话，但不弹浮窗；候选直接显示在这一条下面
function aiScript(b,style,q){SC.ai=null;return DOCK.inline(async()=>{post({r:'me',t:`✨ ${b.id}：${style?STYLE[style]:`"${q}"`}`});
  if(style)return propose(b,style);
  SC.P[b.id]={x:b.x.replace(/[。！]?$/,'')+'（'+q+'）',why:`按你的意思：${q}`,style:null};SC.sel=b.id;renderAll();card(`${b.id} 改写候选（在剧本里采用）`,[`原文：${b.x}`,`改成：${SC.P[b.id].x}`])})}
function rewrite(b){const k=Object.keys(ALT[b.id]||{}),tried=SC.tried[b.id]||[],nx=k.find(x=>!tried.includes(x))||(k.length&&(SC.tried[b.id]=[],k[0]));
  if(nx)return propose(b,nx);
  delete SC.P[b.id];renderAll();DOCK.open();$('#aIn').focus();
  return say(`${b.id} 这条我没有更好的写法了。说说你想往哪儿改：更短、换个笑点，还是换个说法？`);
}
function styleAll(style){const L=sc().blocks.filter(b=>ALT[b.id]&&ALT[b.id][style]);if(!L.length)return say(`这一集没有可以「${STYLE[style]}」的台词。`);
  L.forEach(b=>{const a=ALT[b.id][style];SC.P[b.id]={x:a[0],why:a[1],style,tag:a[2]}});SC.tab='script';SC.sel=null;renderAll();
  card(`给 ${L.length} 句出了「${STYLE[style]}」版本`,[...L.map(b=>`${b.id}：${SC.P[b.id].x}`),'在剧本里逐句采用；口头禅改了的话，检查会提醒你'])}
function adopt(id){const p=SC.P[id];commit(blk(id),p.x,STYLE[p.style],p.tag)}
function userEdit(b,x){commit(b,x,'手动修改')}
function commit(b,x,why,tag){const s=sc(),g=segOf(b.seg);b.x=x;if(tag)b.tag=tag;delete SC.P[b.id];
  s.ver++;s.hist.push({v:s.ver,n:`${b.id}：${why}`});g.st='review';if(s.board)STORE.scriptChanged(b);renderAll();
  const down=!s.board?'':/^(line|sfx|vo)$/.test(b.t)?(STORE.getE('EP01','video')[g.id].vers.length?`；声音直出，${g.id} 只需重出视频，故事板不用动`:''):`；${g.id} 的镜头表标为待更新（分镜 Agent 要改关键帧和动作）`;
  post({r:'sys',t:`${b.id} 已改（v${s.ver}），${g.id} 要重新人审${down}；其他段落不动`});
  const ne=ENTS.filter(e=>!e.card&&e.re.test(x));
  if(ne.length){toast(`剧本里出现了资产库没有的：${ne.map(e=>e.n).join('、')}（看"资产"页签）`);post({r:'sys',t:`剧本里出现了资产库没有的：${ne.map(e=>e.n).join('、')}，要先建卡，分镜才能引用`})}
}
function approveSeg(id){const s=sc();segOf(id).st='approved';renderAll();post({r:'sys',t:`${id} 已批准`});if(!G1(s))return;
  post({r:'sys',t:`G1 剧本审批通过（v${s.ver}）`});
  const sh=STORE.getE('EP01','stale').shot,vs=s.segs.filter(g=>vidStale(g.id)).map(g=>g.id);
  if(s.board&&(sh.length||vs.length))post({r:'sys',t:`下游要跟着改：${[...sh.map(x=>`${x} 镜头表`),...vs.map(x=>`${x} 视频`)].join('、')}（剧本页顶部有入口）`});
  else if(!s.board)card(`G1 通过，把 ${ep().id} 交给分镜 Agent 拆镜头？`,['每段拆 2–4 镜，台词和音效按时间轴写进镜头','剧本里出现的角色、道具、场景同时交给资产 Agent'],[['交给分镜 Agent',()=>toast('分镜 Agent 已接单（原型里只有 EP01 的分镜）')],['稍后',()=>{}]]);
}
// ---------- 写初稿：按每集节拍铺开，30 秒放不下 7 个节拍时参照 EP01 删掉清点库存和二次方案 ----------
function writeEp(id){return task(async()=>{const e=EPS.find(x=>x.id===id);if(SC.ep!==id)goEp(id);SC.tab='script';SC.sel=null;renderAll();
  card(`写 ${id}《${e.title}》初稿`,['输入：大纲里的问题 / 凑合科技 / 翻车 / 代价，加世界观和主角设定','7 个节拍放不进 30 秒：参照 EP01，删掉清点库存和二次方案','分 3 段，每段 10 秒；开头钩子、中段反转、结尾卡点']);
  await wait(1400);STORE.setScript(id,e.sc=draft(e));post({r:'sys',t:`${id} 初稿 v1 完成，三段都待人审。台词只是按大纲铺的，建议逐句改。`});
  // 资产在分镜之前：库里没有的先交给资产 Agent 建卡
  const np=STORE.pending(id);if(np.length)card(`${id} 要用到 ${np.length} 个资产库里没有的东西`,[...np.map(([k,n])=>`${{char:'角色',prop:'道具',scene:'场景'}[k]}：${n}`),`库里已有的直接复用：${ents(e.sc).map(x=>x.n).join('、')||'嗡、绒绒'}`,'先建卡，分镜 Agent 才能引用'],[['去资产库建卡',()=>location.href=`asset.html?k=${np[0][0]}&e=${id}`],['先改剧本',()=>{}]]);
})}
function draft(e){let n=0;const B=[],segs=[],add=(seg,sh,t,x,o={})=>B.push({id:'g'+(++n),seg,sh,t,x,o:x,...o});
  [['SEG1','问题',[['S1a','钩子',3],['S1b','问题板',4],['S1c','问题板',3]]],['SEG2','凑合与翻车',[['S2a','设计与凑合',4],['S2b','翻车',3],['S2c','翻车',3]]],['SEG3','代价与收尾',[['S3a','代价',4],['S3b','收尾旁白',3],['S3c','收尾',3]]]]
    .forEach(([id,title,sh])=>segs.push({id,title,st:'draft',shots:sh.map(([i,beat,d])=>({id:i,beat,d}))}));
  add('SEG1','S1a','scene',`外景 · ${e.loc}`);add('SEG1','S1a','line',`各位观众，${e.hook}`,{who:'嗡',how:'对肩上的镜头君',tag:'hook'});
  add('SEG1','S1b','act',`问题：${e.problem}。`);add('SEG1','S1c','act','他环顾四周，盘算手边能用的东西。');
  add('SEG2','S2a','line','今天我们就地取材！',{who:'嗡',how:'精神一振'});add('SEG2','S2a','act',`${e.tech}。`);
  add('SEG2','S2b','act',`${e.fail}。`,{tag:'twist'});add('SEG2','S2c','sfx','（待定：翻车的音效）');
  add('SEG3','S3a','act',`${e.cost}。`,{tag:'cost'});add('SEG3','S3b','line','这个，不建议大家在家里模仿。',{who:'嗡',how:'对镜头君'});add('SEG3','S3c','act',e.tease,{tag:'cliff'});
  return{ver:1,hist:[{v:1,n:'初稿：按大纲铺节拍，台词待细化'}],board:false,blocks:B,segs};
}
// ---------- 检查与交接 ----------
function checkAll(){SC.tab='check';renderAll();const c=checks(sc()).filter(x=>x.lv==='warn'||x.lv==='bad');
  card(c.length?`检查完：${c.length} 项要处理`:'检查完：都通过',c.map(x=>`${x.lv==='bad'?'✕':'!'} ${x.n}：${x.lines[0]}`),c.some(x=>x.fix&&x.fix.length)?[['逐条修',fixAll],['先不改',()=>{}]]:null)}
async function fixAll(){for(const x of checks(sc()))if(x.fix&&x.fix.length)await x.fix[0][1]()}
function fixBy(name){const c=checks(sc()).find(x=>x.n===name);if(c.fix&&c.fix.length)return c.fix[0][1]();say(`${name}：${c.lines[0]}`)}
function handoffShot(f){card(`请分镜 Agent 把 ${f.sh} 加长`,[`台词要念 ${f.t.toFixed(1)}s，镜头只有 ${f.d}s`,'建议从同段相邻镜头挪 1 秒过来，段长不变','分镜改完，该段故事板和视频会标为待更新'],
  [['去分镜工作室处理',()=>location.href=`episode.html?m=shot&s=${f.sh}`],['还是改台词',()=>{const id=f.ids.find(i=>ALT[i]&&ALT[i].punch);id?propose(blk(id),'punch'):say('这句没有更短的写法了，只能加长镜头。')}]])}
function handoffAsset(x){const n={char:'角色',prop:'道具',scene:'场景'}[x.k];
  card(`交给${n} Agent：${x.n}`,[`剧本 ${ents(sc()).find(e=>e.id===x.id).bs.map(b=>b.id).join('、')} 写到了它`,'用途：S1 主空镜的远景，地平线右侧一道白色蒸汽柱；不画热泉本身（第 2 集再建场景卡）','补完后 SH12 的故事板和视频要重出'],
   [[`去${n}工作室`,()=>location.href=`asset.html?k=${x.k}`],['先记下，稍后处理',()=>{x.card=true;renderAll();post({r:'sys',t:`已记到${n} Agent 的待办：${x.n}`})}]])}
function exportMd(){const e=ep(),s=e.sc;if(!s)return;
  const line=b=>(b.t==='scene'?`### ${b.x}`:b.t==='line'?`**${b.who}**${b.how?`（${b.how}）`:''}：${b.x}`:b.t==='vo'?`**${b.who}**（画外音）：${b.x}`:b.t==='sfx'?`> 音效：${b.x}`:b.x)+(b.tag?`  <!-- ${TAGS[b.tag][0]} -->`:'');
  const md=['---',`episode: ${e.id}`,`title: ${e.title}`,`version: ${s.ver}`,`status: ${G1(s)?'approved':'draft'}`,`duration_s: ${total(s)}`,'---','',`# ${e.id} ${e.title}`,'',
    ...s.segs.flatMap(g=>[`## ${g.id} ${g.title}（${segDur(g)}s）`,'',...s.blocks.filter(b=>b.seg===g.id).map(line),''])];
  openModal(`projects/${PROJECT.id}/episodes/${e.id.toLowerCase()}/script.md`,`<pre class="md">${esc(md.join('\n'))}</pre>`)}
function send(){const v=$('#aIn').value.trim();if(!v)return;$('#aIn').value='';post({r:'me',t:v});const s=sc(),b=SC.sel&&s&&blk(SC.sel);
  if(!s)return /写|初稿|生成|剧本/.test(v)?writeEp(ep().id):say('这一集还没有剧本。说"写初稿"，我按大纲先铺一版。');
  if(/检查/.test(v))return checkAll();if(/钩子|开头/.test(v))return fixBy('开头 3 秒有冲突');if(/卡点|结尾|下集/.test(v))return fixBy('结尾卡点');if(/导出|script/i.test(v))return exportMd();
  const st=/山东|方言|口音/.test(v)?'dialect':/口语/.test(v)?'oral':/狠|短/.test(v)?'punch':null;
  if(st)return b?propose(b,st):styleAll(st);
  if(b){SC.P[b.id]={x:b.x.replace(/[。！]?$/,'')+'（'+v+'）',why:`按你的意思：${v}`,style:null};SC.tab='script';renderAll();return say(`按"${v}"给 ${b.id} 出了一版，在剧本里看看要不要采用。`)}
  say('先在剧本里点选一条，再说要怎么改；或者说"检查"、"开头钩子再狠一点"、"更山东味儿"。');
}
$('#aSend').onclick=send;$('#aIn').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};
renderAll();renderMsgs();
