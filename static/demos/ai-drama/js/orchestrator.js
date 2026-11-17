/* 右侧 Agent 面板：导演 + 各子 Agent 标签页（每个 Agent 一条对话线程）、Agent Skill 卡、阶段条、建议、输入框。对话逻辑在 flows.js */
const who=k=>k==='orc'?ORC:AGENTS[k];
state.unread={};
// 消息类型：me / orc / sys / work / gate / cost / choice / result；to = 投递到哪些 Agent 的线程
function post(m,to=['orc']){m.id=state.mid++;to.forEach(k=>{(state.th[k]=state.th[k]||[]).push(m);if(k!==state.tab)state.unread[k]=(state.unread[k]||0)+1});renderMsgs();renderTeam();if(to.includes(state.tab))DOCK.notify(m);return m}
function upd(m,p){Object.assign(m,p);renderMsgs();if(p.acts&&p.acts.length)DOCK.open()}
async function say(t,k='orc'){const m=post({type:'orc',typing:true},[k]);await wait(420);upd(m,{typing:false,t});return m}
// 卡片按钮：返回点中的 key；点完按钮消失，显示结果文字
function choose(m){return new Promise(r=>{m.resolve=r;renderMsgs()})}
function onAct(m,k){const a=m.acts.find(x=>x.k===k);upd(m,{done:a.done||('✓ '+a.label),acts:null});m.resolve&&m.resolve(k)}

const nodeChips=ids=>ids&&ids.length?`<div class="nlinks">${ids.map(byId).filter(Boolean).map(n=>`<span class="nlink" data-go="${n.id}">${AI(n.kind)} ${esc(shortName(n))}${n.ver>1?' v'+n.ver:''}</span>`).join('')}</div>`:'';
const minis=ids=>`<div class="minis">${ids.map(byId).filter(Boolean).map(n=>`<div class="mini" data-go="${n.id}"><i style="${n.img?`background-image:url(${n.img})`:'background:'+grad(n.title+n.ver)}"></i><span>${esc(shortName(n))}</span></div>`).join('')}</div>`;
const actsHtml=m=>m.acts?`<div class="acts">${m.acts.map(a=>`<button class="btn ${a.pri?'pri':''}" data-mid="${m.id}" data-k="${a.k}">${esc(a.label)}</button>`).join('')}</div>`:m.done?`<div class="acts"><span class="res">${m.done}</span></div>`:'';
const head=(av,t,sub,s)=>`<div class="ch"><span class="av">${av}</span><div class="t">${t}${sub?`<small>${esc(sub)}</small>`:''}</div>${s?`<span class="s">${s}</span>`:''}</div>`;
function msgHtml(m){
  switch(m.type){
  case 'me':return `<div class="m me">${(m.ctx||[]).map(byId).filter(Boolean).map(n=>`<span class="mc">@${esc(shortName(n))}</span>`).join('')}${esc(m.t)}${(m.imgs||[]).map(u=>`<img src="${u}">`).join('')}</div>`;
  case 'orc':return `<div class="m orc">${m.typing?'<span class="typing"><i></i><i></i><i></i></span>':esc(m.t)}</div>`;
  case 'sys':return `<div class="m sys">${esc(m.t)}</div>`;
  case 'work':{const A=who(m.a),u=agentStudio(m.a),enter=state.tab==='orc'&&m.a!=='orc';return `<div class="card">${head(A.av,enter?(u?`<a class="enter" href="${u}">${A.name} ›</a>`:`<span class="enter" data-tab="${m.a}">${A.name} ›</span>`):A.name,m.t,m.st==='run'?'<span class="spin">◌</span> 进行中':'✓ 完成')}${m.lines.length?`<div class="cb"><ul>${m.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></div>`:''}${nodeChips(m.nodes)}</div>`}
  case 'gate':return `<div class="card gate ${m.done?'done-card':''}">${head('🔒',m.t,m.sub)}<div class="cb">${esc(m.text)}${m.href&&!m.done?`<a class="golink" href="${m.href}">去工作室逐项看 ›</a>`:''}</div>${m.nodes?minis(m.nodes):''}${actsHtml(m)}</div>`;
  case 'cost':return `<div class="card cost ${m.done?'done-card':''}">${head('💰',m.t,m.sub)}<div class="rows">${m.rows.map(r=>`<div><span>${esc(r[0])}</span><span>¥${r[1].toFixed(1)}</span></div>`).join('')}
    <div class="tot"><span>合计</span><span>¥${sum(m.rows,r=>r[1]).toFixed(1)}</span></div><div><span>预算剩余</span><span>¥${(BUDGET-state.spent).toFixed(1)}</span></div></div>${actsHtml(m)}</div>`;
  case 'choice':return `<div class="card">${head('🎬',m.t,m.sub)}${m.imgs?`<div class="minis">${m.imgs.map(u=>`<div class="mini"><i style="background-image:url(${u})"></i></div>`).join('')}</div>`:''}${actsHtml(m)}</div>`;
  case 'result':return `<div class="card">${head('✨',m.t,m.sub)}<div class="cb">${esc(m.text)}</div>${nodeChips(m.nodes)}${actsHtml(m)}</div>`;
  }
}
function hello(k){
  const A=who(k);
  if(k==='orc'&&!state.tpl)return `<div class="hello"><div class="hav">🎬</div><h4>我是导演 Agent</h4><p>说出你想做的视频，我会选一个场景 Skill，<br>调度 ${Object.keys(AGENTS).length} 个子 Agent 在画布上把它做出来。<br>你只需要在审批门确认、或者提修改意见。</p></div>`;
  return `<div class="hello"><div class="hav">${A.av}</div><h4>${A.name}</h4><p>${A.desc}<br>导演派给我的活会记录在这里，你也可以直接对我说。</p></div>`;
}
function renderMsgs(){
  if(state.tab!=='orc'&&paneOf(state.tab)==='ws')return renderWorkspace();
  const b=$('#oBody'),list=state.th[state.tab]||[],atEnd=b.scrollHeight-b.scrollTop-b.clientHeight<80;
  b.innerHTML=list.length?list.map(msgHtml).join(''):hello(state.tab);
  if(atEnd)b.scrollTop=1e9;
  b.querySelectorAll('[data-mid]').forEach(x=>x.onclick=()=>onAct(list.find(m=>m.id==x.dataset.mid),x.dataset.k));
  b.querySelectorAll('[data-tab]').forEach(x=>x.onclick=()=>switchTab(x.dataset.tab));
  b.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>{const n=byId(x.dataset.go);pick(n.id);focusNode(n,true)});
}
// 导演页上的子 Agent 团队：只在非演示项目里显示（演示项目用顶栏阶段条进各工作室）。点击进入该 Agent 的页面；工作中的会闪，有新消息显示未读数
function renderTeam(){
  const t=$('#team');
  if(state.tab!=='orc'||isDemo()||state.epStub){t.innerHTML='';t.hidden=true;return}
  t.hidden=false;
  t.innerHTML='<span class="tlb">子 Agent</span>'+Object.keys(AGENTS).map(k=>{const A=who(k),u=state.unread[k];
    return `<button class="mate ${state.working[k]?'working':''}" data-tab="${k}" title="进入${A.name}：${esc(A.desc)}"><span class="ma">${A.av}</span>${A.name.replace(' Agent','')}${u?`<i class="ur">${u}</i>`:''}</button>`}).join('');
  $$('#team [data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
}
// 在同一个面板里进入子 Agent / 返回导演
function switchTab(k){
  if(k===state.tab)return;const dir=k==='orc'?'back':'in';
  state.tab=k;state.unread[k]=0;renderPanel();
  const o=$('#orc');o.classList.remove('in','back');void o.offsetWidth;o.classList.add(dir);
}
// 当前 Agent 的 Agent Skill（叠加当前场景 Skill 的规则）
function renderSkillCard(){
  const k=state.tab,S=who(k).skill,o=state.tpl&&k!=='orc'&&state.tpl.agents[k],el=$('#skCard'),open=el.classList.contains('open');
  el.innerHTML=`<div class="skh">📘 <b>${S.id}</b>${state.tpl?`<span>叠加：${state.tpl.icon} ${state.tpl.name}</span>`:''}<i>⌄</i></div>
    <div class="skb"><div><em>输入</em>${esc(S.in)}</div><div><em>产出</em>${esc(S.out)}</div>
    <div><em>步骤</em><ol>${S.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>
    <div><em>自检</em><ul>${[...S.checks,...((o&&o.rules)||[])].map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    <div><em>参考</em>${esc(S.doc)}${k!=='orc'?` · 子能力：${who(k).skills.join('、')}`:''}</div></div>`;
  el.classList.toggle('open',open);el.querySelector('.skh').onclick=()=>el.classList.toggle('open');
}
function renderCtx(){
  $('#oCtx').innerHTML=state.ctx.map(byId).filter(Boolean).map(n=>`<span class="c"><span>${AI(n.kind)} @${esc(shortName(n))}${n.ver>1?' v'+n.ver:''}</span><b class="x" data-x="${n.id}">✕</b></span>`).join('')+
    state.atts.map((u,i)=>`<span class="c"><img src="${u}"><span>图片 ${i+1}</span><b class="x" data-xa="${i}">✕</b></span>`).join('');
  $$('#oCtx [data-x]').forEach(x=>x.onclick=()=>{state.ctx=state.ctx.filter(id=>id!==x.dataset.x);if(state.focus===x.dataset.x)state.focus=null;render();renderCtx();renderSugs()});
  $$('#oCtx [data-xa]').forEach(x=>x.onclick=()=>{state.atts.splice(+x.dataset.xa,1);renderCtx()});
}
// 建议：导演按导演 Skill 的诊断给"下一步"，选中节点时给针对这些节点的操作；子 Agent 给它自己的指令
let sugActs=[],busy=false;
async function runAct(a){
  if(busy||!a.run)return;busy=true;renderSugs();post({type:'me',t:a.label.replace(/^\S+\s/,'')},[state.tab]);
  try{await a.run()}finally{busy=false;renderSugs()}
}
function renderSugs(){
  const s=$('#oSugs');let lb='';
  // 演示项目里还没拆镜头的集：只引导去剧本工作室 / 总览
  if(state.epStub&&state.tab==='orc'){s.className='osugs';sugActs=[{label:'✍️ 去剧本工作室',run:async()=>{location.href=`script.html?e=${STORE.ep}`}},{label:'📊 回系列总览',run:async()=>{location.href='series.html'}}];
    s.innerHTML=sugActs.map((a,i)=>`<button data-i="${i}" class="${i?'':'pri'}">${esc(a.label)}</button>`).join('');s.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>runAct(sugActs[+b.dataset.i]));return}
  if(state.tab==='orc'&&!state.tpl){s.className='osugs start';
    s.innerHTML=SKILLS.map(t=>`<button data-q="用「${t.name}」Skill 做《${t.title}》"><b>${t.icon} ${t.name}</b><small>${t.spec.dur} · ${t.title}</small></button>`).join('');
    s.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>send(b.dataset.q));return}
  const ns=state.ctx.map(byId).filter(Boolean);
  if(state.auto){lb='导演正在自动推进';sugActs=[{label:'⏸ 暂停自动推进',run:async()=>{state.auto=false;await say('好，做完当前这步就停。')}}]}
  else if(busy){lb='执行中…';sugActs=[]}
  else if(state.tab==='orc'&&ns.length){lb=`针对选中的 ${ns.length} 个节点`;sugActs=selActions(ns)}
  else if(state.tab==='orc'){const d=diagnose();lb='导演建议的下一步';sugActs=d[0]&&d[0].run&&!d[0].human?[...d,{label:'▶ 自动推进到下一个审批门',run:autopilot}]:d}
  else{const k=state.tab,o=(state.tpl.agents[k]||{}),mine=ns.filter(n=>n.kind===k),tgt=mine.length?mine:live(k);
    lb=tgt.length?`${who(k).name} · ${mine.length?'选中的':'全部'} ${tgt.length} 个${KIND[k].n}`:'';
    sugActs=tgt.length?[...(o.sugs||AGENTS[k].sugs),'按 Skill 检查'].map(q=>({label:q,run:()=>agentEdit(k,tgt,q)})):[]}
  s.className='osugs';
  s.innerHTML=(lb?`<div class="slb">${lb}${sugActs[0]&&sugActs[0].why?` · <span>${esc(sugActs[0].why)}</span>`:''}</div>`:'')+
    sugActs.map((a,i)=>`<button data-i="${i}" class="${i===0&&state.tab==='orc'&&!ns.length&&!state.auto?'pri':''}" ${a.run?'':'disabled'}>${esc(a.label)}</button>`).join('');
  s.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>runAct(sugActs[+b.dataset.i]));
}
function renderSkillSel(){
  $('#oSkill').innerHTML=`<option value="">🧭 场景 Skill：自动</option>`+SKILLS.map(t=>`<option value="${t.id}" ${state.tpl&&state.tpl.id===t.id?'selected':''}>${t.icon} ${t.name}</option>`).join('');
}
function renderPanel(){
  const A=who(state.tab),sub=state.tab!=='orc';$('#oAv').textContent=A.av;$('#oName').textContent=A.name;
  $('#oBack').hidden=!sub;const full=state.tab==='text'?'script.html':ASSET_KINDS.includes(state.tab)?'asset.html?k='+state.tab:['shot','board','video'].includes(state.tab)?'episode.html?m='+state.tab:null;$('#oFull').hidden=!full;if(full)$('#oFull').href=full;$('#oCrumb').hidden=!sub;$('#oNew').hidden=sub;
  $('#oDesc').textContent=state.tab==='orc'?'总控 · 用导演 Skill 诊断项目、调度子 Agent':A.desc;
  $('#oIn').placeholder=state.tab==='orc'?(state.tpl?'对导演说，或 @ 画布上的节点提修改':'说说你想做什么视频'):`直接对${A.name}说，例如「${AGENTS[state.tab].sugs[0]}」`;
  if(sub)stage.dataset.fk=state.tab;else delete stage.dataset.fk;
  renderTeam();renderStages();renderSkillCard();renderPaneBar();renderMsgs();renderSugs();renderCtx();renderSkillSel();
}
function send(text){
  const t=(text??$('#oIn').value).trim(),atts=state.atts.splice(0);
  if(!t&&!atts.length)return;
  if(text===undefined)$('#oIn').value='';
  const ctx=[...state.ctx];post({type:'me',t:t||'（图片）',ctx,imgs:atts},[state.tab]);renderCtx();
  route(t,ctx.map(byId).filter(Boolean),atts);
}
$('#oBack').onclick=$('#oCrumb').onclick=()=>switchTab('orc');
$('#oSend').onclick=()=>send();
$('#oIn').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};
$('#oAttach').onclick=()=>$('#oFile').click();
$('#oFile').onchange=e=>{[...e.target.files].forEach(f=>{const r=new FileReader();r.onload=()=>{state.atts.push(r.result);renderCtx()};r.readAsDataURL(f)});e.target.value=''};
$('#oSkill').onchange=e=>{const t=SKILLS.find(x=>x.id===e.target.value);if(t&&(!state.tpl||confirm('换场景 Skill 会新建项目，当前画布会清空。继续？'))){switchTab('orc');send(`用「${t.name}」Skill 做《${t.title}》`)}else renderSkillSel()};
$('#oNew').onclick=()=>{if(!state.tpl||!confirm('新建项目会清空当前画布。继续？'))return;resetProject();say('已清空，可以开始新项目了。')};
$('#modeChip').onclick=()=>{if(!state.tpl)return;switchTab('orc');send(state.mode==='draft'?'生成正片':'预算')};
$('#skillChip').onclick=()=>openSkill(state.tpl.id);
