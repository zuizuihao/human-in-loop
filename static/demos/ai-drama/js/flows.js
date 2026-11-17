/* 导演与子 Agent 的工作流（模拟）：建项目、按阶段派活、审批门、优化出新版本、采用、指定参考图、自动推进、对话路由 */
const shortName=n=>n.title.replace(/^.+?：/,'');
function resetProject(){
  state.auto=false;state.tpl=null;SEGS=[];state.nodes=[];state.edges=[];state.ctx=[];state.focus=null;
  state.gates={};state.skipFinal=false;state.th={};state.tab='orc';demoReady=false;state.demo=false;state.epStub=false;STAGEBAR.show(false);
  $('#projTitle').textContent='未命名';$('#skillChip').hidden=true;render();renderPanel();
}
// 子 Agent 干活：对话里出一张工作卡（导演线程和该 Agent 线程都能看到），团队栏亮起
async function work(a,t,fn){
  const m=post({type:'work',a,t,lines:[],nodes:[],st:'run'},['orc',a]);
  state.working[a]=(state.working[a]||0)+1;renderTeam();
  try{await fn(m)}finally{state.working[a]--;upd(m,{st:'ok'});renderTeam()}
  return m;
}
const line=(m,t)=>{m.lines.push(t);renderMsgs()};
async function spawn(m,kind,o,from=[]){
  const n=addNode(kind,o);from.filter(Boolean).forEach(f=>connect(f.id,n.id));
  n.by=m.a;m.nodes.push(n.id);refresh();focusNode(n);renderMsgs();await wait(260);return n;
}
async function gen(n,a,mode){n.by=a;render();const ok=await runNode(n,mode);n.by=null;render();return ok}
async function writeText(n,a){n.by=a;n.status='running';render();await wait(500);n.status='done';n.out=true;n.by=null;render()}
const assetNode=id=>state.nodes.find(n=>n.ent===id&&n.current);

async function startProject(t){
  resetProject();state.tpl=t;SEGS=t.segs;
  $('#projTitle').textContent=t.title;$('#skillChip').hidden=false;$('#skillChip').textContent=t.icon+' '+t.name;$('#arChip').textContent=t.spec.ar;
  renderPanel();STAGEBAR.render();
  await say(`好的，用「${t.name}」Skill 做《${t.title}》（${t.spec.dur}）。\n我会按 剧本 → 资产（角色 ${t.cast.length}、道具 ${t.props.length}、场景 ${t.sets.length}）→ 分镜 → 故事板 → 样片 → 成片 推进，每个子 Agent 都带着这个 Skill 的节拍和检查清单干活。\n到审批门和花钱前我会停下来等你确认。`);
  autopilot();
}
// 自动推进：反复取导演 Skill 的第一条建议执行，遇到需要人的地方停
async function autopilot(){
  if(state.auto||!state.tpl)return;state.auto=true;renderSugs();
  try{
    let last='';
    while(state.auto){
      const a=diagnose()[0];if(!a||a.wait||a.end||!a.run)break;
      // 保险：同一条建议执行完项目状态没变，说明卡住了，停下交给人
      const sig=a.label+'|'+state.nodes.map(n=>n.status+n.current).join('')+Object.keys(state.gates);
      if(sig===last)break;last=sig;
      const ok=await a.run();
      if(ok===false||(a.human&&ok!==true))break;
    }
  }finally{state.auto=false;renderSugs()}
}

// ---------- 各阶段由对应子 Agent 完成 ----------
async function fillStage(k){
  const t=state.tpl,script=live('text')[0];
  if(k==='script')await work('text',`按「${t.name}」节拍写剧本`,async m=>{
    const n=await spawn(m,'text',{title:'剧本：'+t.title,prompt:t.script});await writeText(n,'text');
    line(m,`节拍：${t.beats.map(b=>b.t+' '+b.n).join(' → ')}`);line(m,`拆成 ${SEGS.length} 段，共 ${sum(SEGS,segDur)} 秒`)});
  if(k==='shot')await work('shot','每段写一张镜头表',async m=>{
    for(const s of SEGS.filter(s=>!live('shot').some(n=>n.seg===s.id))){
      const n=await spawn(m,'shot',{seg:s.id,title:`分镜 ${s.id} ${s.title}`},[script,...(s.uses||[]).map(assetNode)]);await writeText(n,'shot');
      line(m,`${s.id} ${s.title}：${s.shots.length} 镜 ${segDur(s)}s，${s.shots.map(x=>x.f).join('/')}`)}});
  if(k==='asset'){
    for(const kind of ASSET_KINDS){
      const miss=missingEnts().map(entOf).filter(e=>e.kind===kind),idle=live(kind).filter(n=>n.status==='idle');
      if(!miss.length&&!idle.length)continue;
      await work(kind,miss.length?`从剧本里提取 ${miss.length} 个${KIND[kind].n}，建资产卡`:`生成${KIND[kind].n}资产`,async m=>{
        const ns=[...idle];
        for(const e of miss){ns.push(await spawn(m,kind,{ent:e.id,title:`${KIND[kind].n}：${e.name}`,prompt:e.desc},[script]))}
        for(const n of ns){await gen(n,kind);line(m,`${shortName(n)}：${VIEWS[kind].join(' / ')}`)}
        if(kind==='char')line(m,'已为每个角色写好连续性锁，下游提示词会原样引用');
      });
    }
  }
  if(k==='board')await work('board','按镜头表和资产出故事板',async m=>{
    for(const s of SEGS){
      let n=live('board').find(x=>x.seg===s.id);
      if(!n)n=await spawn(m,'board',{seg:s.id,title:`故事板 ${s.id} ${s.title}`},[live('shot').find(x=>x.seg===s.id),...(s.uses||[]).map(assetNode)]);
      if(n.status!=='done'){await gen(n,'board');line(m,`${s.id}：${s.shots.length>4?'3×3':'2×2'} 版式，引用 ${(s.uses||[]).length} 个资产`)}
    }});
  if(k==='video'){
    const todo=SEGS.filter(s=>!live('video').some(n=>n.seg===s.id&&n.status==='done'));
    const ok=await costGate('生成样片',todo.map(s=>[`${s.id} ${s.title} · ${segDur(s)}s 样片`,PRICE.video.draft*segDur(s)/10]));
    if(!ok)return false;
    await work('video','按故事板直出样片（对白、音效直出，不加字幕和配乐）',async m=>{
      for(const s of todo){
        let n=live('video').find(x=>x.seg===s.id);
        if(!n)n=await spawn(m,'video',{seg:s.id,title:`视频 ${s.id} ${s.title}`},[live('board').find(x=>x.seg===s.id)]);
        await gen(n,'video','draft');line(m,`${s.id}：${segDur(s)}s 样片完成`);
      }
      if(state.tpl.id==='manju')line(m,'⚠️ 自检：SEG2 绒绒右半身的靛蓝在 6 秒后偏紫，建议审批时看一下，可以让我用 edit 修补');
    });
  }
  if(k==='out'){
    const m=post({type:'work',a:'orc',t:'按段顺序拼接成片（不做后期）',lines:[],nodes:[],st:'run'},['orc']);
    let n=live('out')[0];
    if(!n){n=addNode('out',{title:'成片'});live('video').forEach(v=>connect(v.id,n.id));m.nodes.push(n.id);refresh();focusNode(n)}
    await gen(n,null);upd(m,{st:'ok',lines:[`${SEGS.length} 段 · ${sum(SEGS,segDur)}s · ${allFinal()?'正片':'样片'}拼接`]});
  }
}
async function regenStale(k){
  const ns=stageNodes(k).filter(n=>n.status==='stale');if(!ns.length)return;
  if(k==='video'&&!await costGate('重新生成待更新的视频',ns.map(n=>[n.title,cost(n)])))return false;
  const a=k==='asset'?ns[0].kind:k==='script'?'text':k==='out'?null:k;
  if(!a){for(const n of ns)await gen(n,null);return}
  await work(a,`重新生成待更新的${STAGES.find(s=>s.k===k).n}`,async m=>{
    for(const n of ns){m.nodes.push(n.id);focusNode(n);if(n.kind==='text'||n.kind==='shot'){await writeText(n,a);stale(n)}else await gen(n,n.kind,n.mode)}}); // 文本改完，下游的故事板 / 视频跟着待更新
}
// ---------- 审批门与费用确认 ----------
async function openGate(G){
  const S=STAGES.find(s=>s.gate===G),ns=stageNodes(S.k);
  const m=post({type:'gate',href:gateHref(G),t:`${G} ${GATE_NAME[G]}`,sub:`${S.n} · ${ns.length} 个节点`,text:G==='G4'?'看一遍样片：动作、口型、段与段的衔接。通过后再决定出不出正片。':'有问题直接说，例如「嗡的左臂要银灰色」，我会交给对应的 Agent 出新版本。',
    nodes:ns.map(n=>n.id),acts:[{k:'ok',label:'通过',pri:true},{k:'fix',label:'需要修改',done:'✎ 等你提修改意见'}]},['orc']);
  const r=await choose(m);
  if(r==='ok'){state.gates[G]=true;demoGate(G);renderStages();return true}
  await say('好的，在画布上点要改的节点，或者直接说要改什么。改完说「继续」。');return false;
}
async function costGate(t,rows){
  if(!rows.length)return true;
  const m=post({type:'cost',t:`费用确认：${t}`,sub:state.mode==='draft'?'样片 480p':'正片',rows,acts:[{k:'ok',label:`批准 ¥${sum(rows,r=>r[1]).toFixed(1)}`,pri:true},{k:'no',label:'先不生成',done:'暂不生成'}]},['orc']);
  if(state.spent+sum(rows,r=>r[1])>BUDGET){upd(m,{acts:null,done:'⛔ 超出预算上限，已拦截'});return false}
  return (await choose(m))==='ok';
}
async function finalChoice(){
  const vs=live('video'),rows=vs.map(n=>[`${n.title} 正片`,cost(n,'final')]);
  const m=post({type:'cost',t:'出正片？',sub:'样片已通过；正片单价约为样片 3 倍',rows,acts:[{k:'final',label:`生成正片 ¥${sum(rows,r=>r[1]).toFixed(1)}`,pri:true},{k:'skip',label:'用样片直接拼接'}]},['orc']);
  const r=await choose(m);
  if(r==='skip'){state.skipFinal=true;return true}
  setMode('final');
  await work('video','按已批准的样片出正片',async w=>{for(const n of vs){w.nodes.push(n.id);focusNode(n);await gen(n,'video','final');line(w,`${shortName(n)}：正片完成`)}});
  live('out').forEach(o=>{o.status='stale'});return true;
}
async function review(){
  const vs=state.nodes.filter(n=>n.kind==='video');
  await say(`复盘：已花 ¥${state.spent.toFixed(1)} / ¥${BUDGET}；视频共生成 ${vs.length} 条（${SEGS.length} 段），优化出的新版本 ${state.nodes.filter(n=>n.parent).length} 个；已过审批门 ${Object.keys(state.gates).join('、')||'无'}。`);
}
// ---------- 子 Agent 处理具体节点：检查、重新生成、续拍、优化出新版本 ----------
async function agentEdit(a,ns,q){
  if(a==='orc'){for(const n of ns)await gen(n,null);return}
  const t=state.tpl;
  if(/检查|一致/.test(q))return work(a,`按 Skill 检查 ${ns.length} 个${KIND[a].n}`,async m=>{
    const rules=(t.agents[a]&&t.agents[a].rules)||AGENTS[a].skill.checks;m.nodes.push(...ns.map(n=>n.id));await wait(500);
    rules.forEach((r,i)=>line(m,`${i===rules.length-1&&ns.some(n=>n.out)?'⚠️':'✅'} ${r}`));ns.forEach(n=>n.checks=m.lines.slice());render()});
  if(/^重新生成|^重新拼接/.test(q))return work(a,`重新生成 ${ns.map(shortName).join('、')}`,async m=>{
    for(const n of ns){m.nodes.push(n.id);focusNode(n);if(['text','shot'].includes(n.kind))await writeText(n,a);else await gen(n,a,n.mode)}ns.forEach(stale);resetGatesFrom(a);render()});
  if(/正片/.test(q)&&a==='video'){if(!await costGate('这段出正片',ns.map(n=>[n.title,cost(n,'final')])))return;
    return work(a,'出正片',async m=>{for(const n of ns){m.nodes.push(n.id);await gen(n,a,'final')}live('out').forEach(o=>o.status='stale');render()})}
  const ext=/续拍|延长/.test(q);
  const vs=[];
  await work(a,`${ext?'续拍':'优化'} ${ns.map(shortName).join('、')}：${q}`,async m=>{
    for(const n of ns){
      const lk=q.startsWith('更新连续性锁：')?q.slice(7):null;
      const v=await branch(m,n,{note:ext?'续拍 +3s（extend）':lk?'更新连续性锁':q,extra:ext?n.extra+3:n.extra,prompt:n.prompt+'\n【修改】'+q,...(lk?{lock:lk}:{})});
      if(['text','shot'].includes(v.kind))await writeText(v,a);else await gen(v,a,n.mode);
      line(m,`${shortName(n)} → v${v.ver}${ext?'：接在原段末帧后续拍 3 秒':''}`);vs.push(v);
    }});
  return offerAdopt(vs);
}
// 从节点分出一个新版本节点（挂在原节点下方），继承原节点的上游引用
async function branch(m,n,o){
  const root=lineage(n),ver=Math.max(...root.map(x=>x.ver))+1;
  const v=addNode(n.kind,{title:n.title,seg:n.seg,ent:n.ent,ver,parent:n.id,current:false,img:n.img,lock:n.lock,...o});
  connect(n.id,v.id,'opt');ups(n.id).forEach(u=>connect(u.id,v.id));
  v.by=m.a;m.nodes.push(v.id);refresh();focusNode(v);renderMsgs();await wait(260);return v;
}
const lineage=n=>{let r=n;while(r.parent)r=byId(r.parent);const out=[],walk=x=>{out.push(x);state.nodes.filter(c=>c.parent===x.id).forEach(walk)};walk(r);return out};
async function offerAdopt(vs){
  if(!vs.length)return;
  const m=post({type:'result',t:`新版本已生成（${vs.length} 个）`,text:'对比一下，采用后下游会标为待更新；不采用就保留原版。',nodes:vs.map(v=>v.id),
    acts:[{k:'ok',label:'采用新版本',pri:true},{k:'no',label:'保留原版',done:'保留原版'}]},['orc',vs[0].kind]);
  if(await choose(m)==='ok')vs.forEach(adopt);
}
function adopt(v){
  const fam=lineage(v),old=fam.find(x=>x.current);if(old===v)return;
  fam.forEach(x=>x.current=x===v);
  // 原版本的下游引用改挂到新版本上（新版本已有同一条引用时直接去掉旧的）
  if(old){state.edges.filter(e=>e.a===old.id&&!e.t).forEach(e=>{if(state.edges.some(x=>x!==e&&x.a===v.id&&x.b===e.b&&!x.t))e.dead=true;else e.a=v.id});
    state.edges=state.edges.filter(e=>!e.dead)}
  stale(v);resetGatesFrom(v.kind);refresh();
  const n=state.nodes.filter(x=>x.current&&x.status==='stale').length;
  post({type:'sys',t:`已采用 ${shortName(v)} v${v.ver}${n?`，下游 ${n} 个节点待更新`:''}`},['orc',v.kind]);renderSugs();
}
// ---------- 指定资产参考图 ----------
async function assignRef(imgs,ns){
  let n=ns.find(x=>ASSET_KINDS.includes(x.kind));
  if(!n){
    const opts=ASSET_KINDS.flatMap(live);if(!opts.length){await say('资产节点还没建，等角色 / 道具 / 场景建好后再指定参考图。');return}
    const m=post({type:'choice',t:'这张图用作哪个资产的参考图？',imgs,acts:opts.slice(0,9).map(o=>({k:o.id,label:`${AI(o.kind)} ${shortName(o)}`}))},['orc']);
    n=byId(await choose(m));
  }
  const a=n.kind;post({type:'sys',t:`→ 导演把参考图交给 ${AGENTS[a].name}`},['orc']);
  const vs=[];
  await work(a,`用指定参考图重做「${shortName(n)}」`,async m=>{
    const v=await branch(m,n,{img:imgs[0],note:'使用指定参考图'});await gen(v,a);
    line(m,'参考图只管身份和造型，构图按资产卡版式重出');vs.push(v)});
  return offerAdopt(vs);
}
// ---------- 节点工具条 ----------
function nodeAction(act,n){
  if(act==='play')return play();
  if(act==='open')return location.href=studioOf(n);
  if(act==='adopt')return adopt(n);
  if(act==='ask'||act==='edit'){if(!isDemo())switchTab(n.kind);state.ctx=[n.id];render();renderCtx();renderSugs();const i=$('#oIn');i.value=act==='edit'?'修改：':'';i.focus();return}
  if(act==='ref'){state.ctx=[n.id];renderCtx();return $('#oFile').click()}
  const q={regen:n.kind==='out'?'重新拼接':'重新生成',extend:'续拍 3 秒'}[act];
  post({type:'me',t:q,ctx:[n.id]},[state.tab]);agentEdit(n.kind==='out'?'orc':n.kind,[n],q);
}
// ---------- 对话路由 ----------
const KW=[[/剧本|台词|钩子|对白/,'text'],[/分镜|镜头表|景别|反应镜头/,'shot'],[/故事板|构图/,'board'],[/角色|造型|三视图|表情/,'char'],[/道具/,'prop'],[/场景|空镜|夜景|色调/,'scene'],[/视频|动作|续拍|修补|口型/,'video']];
function matchSkill(t){
  const syn={drama:/短剧|退婚|逆袭|爽/,manju:/漫剧|动漫|降落伞|嗡/,comedy:/搞笑|萌宠|段子|猫/,novel:/推文|小说|解说/,ad:/广告|种草|带货|产品/,explainer:/科普|口播|知识/};
  return SKILLS.find(s=>t.includes(s.name))||SKILLS.find(s=>syn[s.id].test(t))||SKILLS.find(s=>s.id===$('#oSkill').value);
}
async function route(t,ctx,atts){
  if(state.tab!=='orc')return routeAgent(state.tab,t,ctx,atts);
  if(!state.tpl){const s=matchSkill(t);
    if(!s)return say('想做哪类视频？可以直接点下面的 Skill，或者说得具体一点，比如「做一条 15 秒的产品种草视频」。');
    return startProject(s)}
  if(atts.length)return assignRef(atts,ctx);
  if(/^(继续|开始|下一步|自动)/.test(t))return autopilot();
  if(/暂停|停一下/.test(t)){state.auto=false;return say('已暂停自动推进，说「继续」就接着做。')}
  if(/预算|成本|多少钱|费用/.test(t)){const left=state.nodes.filter(n=>n.current&&n.status!=='done');
    return say(`已花 ¥${state.spent.toFixed(1)} / ¥${BUDGET}。未完成的节点按${state.mode==='draft'?'样片':'正片'}价还需约 ¥${sum(left,n=>cost(n)).toFixed(1)}。`)}
  if(/正片/.test(t))return once('final',finalChoice);
  if(/预览/.test(t))return play();
  if(/复盘/.test(t))return review();
  // 有选中节点：按类型交给对应子 Agent
  let ns=ctx;
  if(!ns.length){const e=ents().find(e=>t.includes(e.name));if(e&&assetNode(e.id))ns=[assetNode(e.id)]}
  if(!ns.length){const k=(KW.find(([r])=>r.test(t))||[])[1];if(k)ns=live(k)}
  if(ns.length){
    const groups={};ns.forEach(n=>(groups[n.kind]=groups[n.kind]||[]).push(n));
    for(const [k,g] of Object.entries(groups)){
      if(k==='out'){await agentEdit('orc',g,'重新拼接');continue}
      post({type:'sys',t:`→ 导演把「${t}」交给 ${AGENTS[k].name}`},['orc']);post({type:'me',t:`（导演转交）${t}`,ctx:g.map(n=>n.id)},[k]);
      await agentEdit(k,g,t);
    }
    return;
  }
  const a=diagnose()[0];
  return say(`我没完全理解要改哪里。可以在画布上点选节点再说，或者切到对应的 Agent 直接对它说。${a&&a.label?`\n当前建议的下一步：${a.label}`:''}`);
}
async function routeAgent(a,t,ctx,atts){
  if(!state.tpl)return post({type:'orc',t:'先在导演那里建项目，我才有活干。'},[a]);
  let ns=ctx.filter(n=>n.kind===a);
  if(atts.length&&ASSET_KINDS.includes(a))return assignRef(atts,ns);
  if(!ns.length){const e=ents().find(e=>e.kind===a&&t.includes(e.name));ns=e&&assetNode(e.id)?[assetNode(e.id)]:live(a)}
  if(!ns.length)return post({type:'orc',t:`画布上还没有${KIND[a].n}节点，导演推进到这一步时会派我来建。`},[a]);
  return agentEdit(a,ns,t);
}

// ---------- 演示项目：打开就是《降落伞是床单》EP01 做到一半的样子。状态和各工作室共用 STORE（js/store.js） ----------
// 只有 loadDemo 载入的项目和工作室联动；从欢迎页新建的 AI 漫剧项目是独立的，不碰演示数据
const isDemo=()=>!!(state.demo&&state.tpl&&state.tpl.id==='manju'&&typeof STORE!=='undefined'&&STORE.ep==='EP01');
const firstShot=n=>segOf(n).shots[0].id;
const STUDIO={text:()=>'script.html?e=EP01',shot:n=>`episode.html?m=shot&e=EP01&s=${firstShot(n)}`,board:n=>`episode.html?m=board&e=EP01&s=${firstShot(n)}`,video:n=>`episode.html?m=video&e=EP01&s=${firstShot(n)}`,
  char:n=>`asset.html?k=char&e=EP01&id=${n.ent}`,prop:n=>`asset.html?k=prop&e=EP01&id=${n.ent}`,scene:n=>`asset.html?k=scene&e=EP01&id=${n.ent}`};
const studioOf=n=>isDemo()&&STUDIO[n.kind]?STUDIO[n.kind](n):null;
// 子 Agent → 它的工作室（演示项目里）
const agentStudio=a=>!isDemo()?null:{text:'script.html',shot:'episode.html?m=shot',board:'episode.html?m=board',video:'episode.html?m=video',char:'asset.html?k=char',prop:'asset.html?k=prop',scene:'asset.html?k=scene'}[a]||null;
const GATE_AT={G1:'script.html',G2:'asset.html',G3:'episode.html?m=board',G4:'episode.html?m=video',G5:'episode.html?m=video'}; // G4、G5 都在视频工作室
// 审批门去哪里看：优先跳到"待你处理"里对应的第一条
const gateHref=G=>{if(!isDemo())return null;const p=GATE_AT[G],x=STORE.inbox().find(i=>i.href.startsWith(p));return x?x.href:p+(p.includes('?')?'&':'?')+'e=EP01'};
let demoReady=false;
function loadDemo(){
  const t=SKILLS.find(s=>s.id==='manju');resetProject();demoReady=false;state.demo=true;state.tpl=t;SEGS=t.segs;
  $('#projTitle').textContent=t.title;$('#skillChip').hidden=false;$('#skillChip').textContent=t.icon+' '+t.name;$('#arChip').textContent=t.spec.ar;
  const sc=addNode('text',{title:'剧本：'+t.title,prompt:t.script}),A={};
  ents().forEach(e=>{A[e.id]=addNode(e.kind,{ent:e.id,title:`${KIND[e.kind].n}：${e.name}`,prompt:e.desc});connect(sc.id,A[e.id].id)});
  SEGS.forEach(s=>{const sh=addNode('shot',{seg:s.id,title:`分镜 ${s.id} ${s.title}`}),b=addNode('board',{seg:s.id,title:`故事板 ${s.id} ${s.title}`}),v=addNode('video',{seg:s.id,title:`视频 ${s.id} ${s.title}`});
    connect(sc.id,sh.id);s.uses.forEach(u=>A[u]&&connect(A[u].id,sh.id));connect(sh.id,b.id);s.uses.forEach(u=>A[u]&&connect(A[u].id,b.id));connect(b.id,v.id)});
  state.nodes.forEach(n=>{n.status='done';n.out=true});
  demoPull();demoReady=true;STAGEBAR.show(true);renderPanel();refresh();setTimeout(fit,60);
  const S=STORE.stages(),box=STORE.inbox(),a=diagnose()[0];
  post({type:'orc',t:`这是演示项目《${t.title}》（EP01 · 30 秒 · 3 段 12 镜），已经做到一半：\n${S.map(s=>`${s.n} ${s.s}`).join(' · ')}\n\n顶栏是各阶段的进度，点一格进对应的工作室；双击画布上的节点直接打开它；「待你处理」里有 ${box.length} 件要你拍板的事。${a&&a.label?`\n下一步：${a.label}。说「继续」我从这里接着推进。`:''}`},['orc']);
}
function loadEpisodeStub(){const e=STORE.ep,o=OUTLINE.find(x=>x.id===e),S=STORE.stages(e),np=STORE.pending(e);
  resetProject();state.epStub=true;STAGEBAR.show(true);renderPanel();$('#projTitle').textContent=`${SERIES.title} · ${e} ${o.title}`;
  $('#empty').innerHTML=`<div class="eico">✍️</div><b>${e}《${o.title}》还在${S[0].st==='none'?'大纲':'剧本'}阶段</b><p>问题：${o.problem}<br>画布从分镜开始才有内容。先写剧本${np.length?`，再给库里没有的 ${np.length} 个资产建卡（${np.map(x=>x[1]).join('、')}）`:''}。</p>
    <p style="margin-top:12px"><a class="btn pri" href="script.html?e=${e}">去剧本工作室</a> <a class="btn" href="series.html">回系列总览</a></p>`;
  post({type:'orc',t:`${e}《${o.title}》还没开始拆镜头。\n${S.map(s=>`${s.n} ${s.s}`).join(' · ')}\n\n下一步：去剧本工作室${S[0].st==='none'?'让剧本 Agent 写初稿':'批准剧本（G1）'}。演示里只有 EP01 做到了分镜以后的阶段。`},['orc']);
}
// STORE → 画布：审批门、各节点的待更新 / 未生成、已花费用
function demoPull(){if(!isDemo())return;const B=STORE.get('board'),V=STORE.get('video'),L=STORE.get('stale').shot;
  // 视频一格合并了 G4 / G5，这两道门直接读存的状态
  const G=STORE.get('gates');state.gates={};STORE.stages().filter(s=>s.k!=='video').forEach(s=>{if(s.gate&&s.ok)state.gates[s.gate]=true});['G4','G5'].forEach(k=>{if(G[k])state.gates[k]=true});
  live('shot').forEach(n=>n.status=L.includes(n.seg)?'stale':'done');
  live('board').forEach(n=>n.status=B[n.seg].st==='stale'?'stale':'done');
  live('video').forEach(n=>{const v=V[n.seg];if(!v.vers.length){n.status='idle';n.out=false}else{n.status=v.st==='stale'?'stale':'done';n.out=true;n.mode=v.vers[v.pick].mode}});
  state.spent=STORE.spent();$('#spent').textContent='¥'+state.spent.toFixed(1);
}
// 画布 → STORE：节点被标为待更新时同步出去（render 时调用）；生成完成、过审批门另有钩子
function demoPush(){if(!isDemo()||!demoReady)return;const B=STORE.get('board'),V=STORE.get('video'),L=STORE.get('stale').shot;let ch=false;
  live('shot').forEach(n=>{const i=L.indexOf(n.seg);if(n.status==='stale'&&i<0){L.push(n.seg);ch=true}else if(n.status==='done'&&i>=0){L.splice(i,1);ch=true}});
  live('board').forEach(n=>{if(n.status==='stale'&&B[n.seg].st!=='stale'){B[n.seg].st='stale';ch=true}});
  live('video').forEach(n=>{const v=V[n.seg];if(n.status==='stale'&&v.vers.length&&v.st!=='stale'){v.st='stale';ch=true}});
  if(ch)STORE.save()}
function demoGen(n,mode,c){if(!isDemo()||!demoReady)return;STORE.spend('canvas',c);
  if(n.kind==='board'&&n.current){const b=STORE.get('board')[n.seg];b.v++;b.st='review'}
  if(n.kind==='video'&&n.current){const v=STORE.get('video')[n.seg];v.vers.push({n:mode==='final'?'正片':`样片 v${v.vers.length+1}`,mode,fixed:[]});v.pick=v.vers.length-1;v.st='draft'}
  STORE.save();state.spent=STORE.spent()}
function demoGate(G){if(!isDemo())return;
  if(G==='G1'){const s=STORE.script();if(s)s.segs.forEach(g=>g.st='approved')}
  if(G==='G2'){[...CHARS,...PROPS,...SCENES].filter(c=>STORE.usedIn(c.id,'EP01')).forEach(c=>Object.keys(c.steps).forEach(k=>{if(c.steps[k]==='review')c.steps[k]='approved'}));STORE.saveAssets()}
  if(G==='G3')Object.values(STORE.get('board')).forEach(b=>{if(b.st==='review')b.st='approved'});
  if(G==='G4'||G==='G5')STORE.get('gates')[G]=true;
  STORE.save()}
// 从工作室回来、或另一个标签页改了状态：重新同步画布
const demoResync=()=>{if(isDemo()&&demoReady&&!state.auto&&!busy){demoPull();render();renderSugs()}};
addEventListener('focus',demoResync);addEventListener('storage',demoResync);
