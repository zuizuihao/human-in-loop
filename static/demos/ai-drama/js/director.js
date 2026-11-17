/* 导演 Skill（drama-director）：诊断项目状态，给出下一步建议和选中节点的操作建议。
   阶段与审批门对应 docs/design/requirements.md：剧本 G1 → 资产 G2 → 分镜 → 故事板 G3 → 样片 G4 → 正片（可选）→ 成片 G5。
   判断顺序：缺失 → 待更新 → 待审批；自动推进时导演每次只取第一条建议执行，遇到审批门停下等人。 */
const STAGES=[
 {k:'script',n:'剧本',a:'text',gate:'G1'},
 {k:'asset',n:'资产',a:'char',gate:'G2'}, // 资产在分镜之前：从剧本抽出角色 / 道具 / 场景先建卡，分镜直接选用库里的资产
 {k:'shot',n:'分镜',a:'shot'},
 {k:'board',n:'故事板',a:'board',gate:'G3'},
 {k:'video',n:'样片',a:'video',gate:'G4'},
 {k:'out',n:'成片',a:'orc',gate:'G5'}];
const GATE_NAME={G1:'剧本审批',G2:'资产审批',G3:'分镜审批（镜头表 + 画面参考）',G4:'样片审批',G5:'交付确认'};
// 节点类型 → 所属阶段；改动某阶段后，它和后面阶段的审批门都要重新过
const STAGE_OF={text:'script',shot:'shot',char:'asset',prop:'asset',scene:'asset',board:'board',video:'video',out:'out'};
const usedEnts=()=>[...new Set(SEGS.flatMap(s=>s.uses||[]))];
const missingEnts=()=>usedEnts().filter(id=>!state.nodes.some(n=>n.ent===id));
function stageNodes(k){return state.nodes.filter(n=>n.current&&STAGE_OF[n.kind]===k)}
function stageState(k){
  const ns=stageNodes(k),need={script:1,shot:SEGS.length,asset:usedEnts().length,board:SEGS.length,video:SEGS.length,out:1}[k];
  const done=ns.filter(n=>n.status==='done').length;
  if(!ns.length)return{st:'none',done,need};
  if(ns.some(n=>n.status==='stale'))return{st:'stale',done,need,n:ns.filter(n=>n.status==='stale').length};
  if(ns.some(n=>n.status==='running'))return{st:'run',done,need};
  return{st:done>=need?'done':'todo',done,need};
}
function resetGatesFrom(kind){const i=STAGES.findIndex(s=>s.k===STAGE_OF[kind]);STAGES.slice(i).forEach(s=>s.gate&&delete state.gates[s.gate])}
const allFinal=()=>live('video').length>0&&live('video').every(n=>n.mode==='final'&&n.status==='done');

// 下一步建议（第一条是主建议）
function diagnose(){
  if(!state.tpl)return[];
  for(const S of STAGES){
    const s=stageState(S.k);
    if(s.st==='run')return[{label:`${S.n}生成中…`,why:'等子 Agent 完成',wait:true}];
    if(s.st==='none'||s.st==='todo'){
      if(S.k==='out'&&!allFinal()&&!state.skipFinal)return[{label:'选择：出正片还是用样片拼接',why:'样片已通过，正片单价约 3 倍',human:true,run:()=>once('final',finalChoice)}];
      const what=S.k==='asset'&&missingEnts().length?`建 ${missingEnts().length} 个资产`:s.st==='none'?`开始${S.n}`:`补齐${S.n}（${s.done}/${s.need}）`;
      return[{label:`${AGENTS[S.a]?AGENTS[S.a].av:'🎬'} ${what}`,why:`${S.n}阶段还没完成`,run:()=>once('fill-'+S.k,()=>fillStage(S.k))}];
    }
    if(s.st==='stale')return[{label:`🔁 重新生成待更新的${S.n}（${s.n} 个）`,why:'上游改动过，这些结果已经过期',run:()=>once('stale-'+S.k,()=>regenStale(S.k))}];
    if(S.gate&&!state.gates[S.gate])return[{label:`🔒 ${S.gate} ${GATE_NAME[S.gate]}`,why:'需要你确认后才能往下走',human:true,run:()=>once(S.gate,()=>openGate(S.gate))}];
  }
  return[{label:'▶ 预览成片',why:'全部完成',end:true,run:async()=>{play()}},{label:'📊 复盘：成本和抽卡次数',end:true,run:review}];
}
// 选中节点后的操作建议
function selActions(ns){
  const k=ns[0].kind,same=ns.every(n=>n.kind===k),acts=[];
  // 选了不同类型的节点：按类型分别交给各自的子 Agent
  if(!same){const g={};ns.forEach(n=>(g[n.kind]=g[n.kind]||[]).push(n));
    return [...Object.entries(g).filter(([t])=>AGENTS[t]).map(([t,l])=>({label:`${AGENTS[t].av} 让${AGENTS[t].name}检查 ${l.length} 个${KIND[t].n}`,run:()=>agentEdit(t,l,'按 Skill 检查')})),
      {label:`🔁 重新生成这 ${ns.length} 个节点`,run:async()=>{for(const[t,l]of Object.entries(g))await agentEdit(AGENTS[t]?t:'orc',l,t==='out'?'重新拼接':'重新生成')}}]}
  if(k==='out')return[{label:'▶ 预览成片',run:async()=>play()},{label:'🔁 重新拼接',run:()=>agentEdit('orc',ns,'重新拼接')}];
  const A=AGENTS[k],o=(state.tpl.agents[k]||{}),nm=ns.length>1?`${ns.length} 个${KIND[k].n}`:`「${ns[0].title.replace(/^.+：/,'')}」`;
  if(ns.some(n=>!n.current))acts.push({label:'✅ 采用这个版本',run:async()=>ns.filter(n=>!n.current).forEach(adopt)});
  if(ns.some(n=>n.status==='stale'))acts.push({label:`🔁 重新生成${nm}`,run:()=>agentEdit(k,ns,'重新生成')});
  acts.push({label:`${A.av} 按 Skill 检查${nm}`,run:()=>agentEdit(k,ns,'按 Skill 检查')});
  if(same)(o.sugs||A.sugs).slice(0,3).forEach(q=>acts.push({label:q,run:()=>agentEdit(k,ns,q)}));
  if(ASSET_KINDS.includes(k)&&ns.length===1)acts.push({label:'🖼️ 指定参考图',run:async()=>{state.ctx=[ns[0].id];$('#oFile').click()}});
  if(k==='video'){acts.push({label:'⏩ 续拍 3 秒',run:()=>agentEdit(k,ns,'续拍 3 秒')});
    if(ns.some(n=>n.mode!=='final'&&n.status==='done'))acts.push({label:'⬆️ 这段出正片',run:()=>agentEdit(k,ns,'出正片')})}
  if(!['text','shot'].includes(k)&&!ns.some(n=>n.status==='stale'))acts.push({label:'🔁 重新生成',run:()=>agentEdit(k,ns,'重新生成')});
  return acts;
}
// 面板顶部的阶段条
function renderStages(){
  const el=$('#stages');if(!el)return;
  if(!state.tpl||state.tab!=='orc'||isDemo()){el.innerHTML='';return} // 演示项目用顶栏的全局阶段条
  const IC={none:'○',todo:'◐',run:'◌',stale:'⚠',done:'✓'};
  el.innerHTML=STAGES.map(S=>{const s=stageState(S.k),g=S.gate?(state.gates[S.gate]?'🔓':'🔒'):'';
    return `<span class="stg ${s.st}" title="${S.n}：${s.done}/${s.need}${S.gate?` · ${S.gate} ${GATE_NAME[S.gate]}${state.gates[S.gate]?'已通过':'未通过'}`:''}">${IC[s.st]} ${S.n}${S.k!=='script'&&S.k!=='out'?` ${s.done}/${s.need}`:''}${g?`<i>${g}</i>`:''}</span>`}).join('<b>›</b>');
}
