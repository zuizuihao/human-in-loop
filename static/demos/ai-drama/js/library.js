/* 左侧导航：Skill 库（场景 Skill + Agent Skill）、资产库 */
let flyTab=null,skView=null;
function openFly(tab){
  flyTab=flyTab===tab?null:tab;
  $$('#tools [data-fly]').forEach(b=>b.classList.toggle('on',b.dataset.fly===flyTab));
  $('#fly').classList.toggle('on',!!flyTab);if(flyTab)renderFly();
}
function openSkill(id){skView=id;if(flyTab!=='skill')openFly('skill');else renderFly()}
const segsOf=t=>t.segs.length+' 段 · '+sum(t.segs,s=>s.shots.length)+' 镜 · '+sum(t.segs,segDur)+'s';
function skillList(){
  return `<div class="hint2">场景 Skill 决定视频类型的节拍和检查清单，导演选定后叠加到每个子 Agent 的 Agent Skill 上。</div>
   <h5>场景 Skill</h5>${SKILLS.map(t=>`<div class="tcard ${state.tpl&&state.tpl.id===t.id?'cur':''}" data-sk="${t.id}">
     <div class="th"><span class="tic">${t.icon}</span><div class="tn"><b>${t.name}</b><small>${t.tag}</small></div>${state.tpl&&state.tpl.id===t.id?'<span class="badge">当前</span>':''}</div>
     <p>${t.desc}</p><div class="chips"><span>${t.spec.ar}</span><span>${t.spec.dur}</span><span>成本 ${t.spec.cost}</span></div></div>`).join('')}
   <h5>Agent Skill</h5><div class="agents">${['orc',...Object.keys(AGENTS)].map(k=>{const A=who(k);
     return `<div class="ag" data-agent="${k}" style="cursor:pointer"><span class="av">${A.av}</span><div><b>${A.name} · <code>${A.skill.id}</code></b><small>${esc(A.skill.out)}</small></div></div>`}).join('')}</div>`;
}
function skillDetail(t){
  const E=(arr,k)=>arr.map(e=>`<span>${AI(k)} ${e.name}</span>`).join('');
  return `<button class="back" data-back>‹ 全部 Skill</button>
   <div class="th big"><span class="tic">${t.icon}</span><div class="tn"><b>${t.name}</b><small>${t.tag}</small></div></div>
   <p class="desc">${t.desc}</p><div class="chips"><span>${t.spec.ar}</span><span>${t.spec.dur}</span><span>成本 ${t.spec.cost}</span></div>
   <h5>结构节拍</h5><div class="beats">${t.beats.map(b=>`<div class="beat"><span class="bt">${b.t}</span><div><b>${b.n}</b><small>${b.d}</small></div></div>`).join('')}</div>
   <h5>最佳实践</h5><ul class="ok">${t.tips.map(x=>`<li>${x}</li>`).join('')}</ul>
   <h5>常见坑</h5><ul class="no">${t.traps.map(x=>`<li>${x}</li>`).join('')}</ul>
   <h5>资产（导演会派子 Agent 逐个建节点）</h5><div class="ents">${E(t.cast,'char')}${E(t.props,'prop')}${E(t.sets,'scene')}</div>
   <h5>叠加到子 Agent 的规则</h5><div class="agents">${Object.entries(t.agents).map(([k,o])=>`<div class="ag"><span class="av">${AGENTS[k].av}</span><div><b>${AGENTS[k].name}</b><small>${(o.rules||o.sugs).join(' · ')}</small></div></div>`).join('')}</div>
   <h5>示例（${segsOf(t)}）</h5><div class="sample">${esc(t.script)}</div>
   <div class="use"><button class="btn pri" data-use="${t.id}">${state.tpl&&state.tpl.id===t.id?'用这个 Skill 重新开始':'让导演用这个 Skill 开始'}</button></div>`;
}
function renderFly(){
  const f=$('#flyBody');$('#flyTitle').textContent=flyTab==='skill'?'Skill 库':'资产库';
  if(flyTab==='skill')f.innerHTML=skView?skillDetail(SKILLS.find(t=>t.id===skView)):skillList();
  if(flyTab==='asset'){const as=ASSET_KINDS.flatMap(live);
    f.innerHTML='<div class="hint2">角色、道具、场景由对应的子 Agent 建好，定稿后可跨集复用。点一项把它 @ 进对话。</div>'+
      (as.length?ASSET_KINDS.map(k=>{const l=live(k);return l.length?`<h5>${KIND[k].n}（${l.length}）</h5>`+l.map(n=>
        `<button class="item" data-go="${n.id}"><span class="ico" style="${n.img?`background-image:url(${n.img})`:n.out?'background:'+grad(n.title+n.ver):''}">${n.img||n.out?'':AI(k)}</span><span><b>${esc(shortName(n))}${n.ver>1?' v'+n.ver:''}</b><small>${STX[n.status]} · 被 ${downs(n.id).length} 个节点引用</small></span></button>`).join(''):''}).join(''):'<div class="hint2">还没有资产。导演推进到资产阶段时会自动建。</div>')}
  f.querySelectorAll('[data-sk]').forEach(e=>e.onclick=()=>{skView=e.dataset.sk;renderFly();f.scrollTop=0});
  f.querySelectorAll('[data-back]').forEach(e=>e.onclick=()=>{skView=null;renderFly()});
  f.querySelectorAll('[data-agent]').forEach(e=>e.onclick=()=>{switchTab(e.dataset.agent);$('#skCard').classList.add('open')});
  f.querySelectorAll('[data-use]').forEach(e=>e.onclick=()=>{const t=SKILLS.find(x=>x.id===e.dataset.use);
    if(state.tpl&&!confirm('会新建项目并清空当前画布。继续？'))return;openFly(flyTab);switchTab('orc');send(`用「${t.name}」Skill 做《${t.title}》`)});
  f.querySelectorAll('[data-go]').forEach(e=>e.onclick=()=>{const n=byId(e.dataset.go);pick(n.id);focusNode(n,true)});
}
$$('#tools [data-fly]').forEach(b=>b.onclick=()=>{if(b.dataset.fly==='skill')skView=null;openFly(b.dataset.fly)});
$('#flyX').onclick=()=>openFly(flyTab);
