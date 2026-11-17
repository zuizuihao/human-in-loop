/* 节点模型、渲染、分组画框、连线、自动排版。节点都由 Agent 创建（见 flows.js） */
function addNode(kind,o={}){
  const n={id:'n'+state.nid++,kind,title:o.title||KIND[kind].n,prompt:o.prompt||'',status:'idle',prog:0,
    seg:o.seg||null,ent:o.ent||null,ver:o.ver||1,parent:o.parent||null,current:o.current!==false,
    note:o.note||'',img:o.img||null,lock:o.lock||'',extra:o.extra||0,by:null,x:0,y:0,isNew:true,model:MODELS[kind],
    ar:state.tpl?state.tpl.spec.ar.split(' ')[0]:'16:9'};
  state.nodes.push(n);return n;
}
const byId=id=>state.nodes.find(n=>n.id===id);
// t：''=引用关系，'opt'=优化出的新版本
function connect(a,b,t=''){if(a!==b&&!state.edges.some(e=>e.a===a&&e.b===b))state.edges.push({a,b,t})}
const ups=id=>state.edges.filter(e=>e.b===id&&!e.t).map(e=>byId(e.a));
const downs=id=>state.edges.filter(e=>e.a===id&&!e.t).map(e=>byId(e.b));
// 上游改动后，已生成的下游标为"待更新"
function stale(n){downs(n.id).forEach(d=>{if(d.out&&d.status!=='stale'){d.status='stale';stale(d)}})}
const segOf=n=>SEGS.find(s=>s.id===n.seg)||SEGS[0];
const live=k=>state.nodes.filter(n=>n.kind===k&&n.current);
const segDone=s=>{const ns=state.nodes.filter(n=>n.seg===s.id&&n.current&&n.kind==='video');return ns.length>0&&ns.every(n=>n.status==='done')};
const AI=k=>KIND[k].i;
function cost(n,mode=state.mode){
  if(n.kind==='char'||n.kind==='scene')return PRICE.img*4;
  if(n.kind==='prop')return PRICE.img*2;
  if(n.kind==='board')return PRICE.board;
  if(n.kind==='video')return PRICE.video[mode]*(segDur(segOf(n))+n.extra)/10;
  return 0;
}
const hue=s=>[...s].reduce((a,c)=>a+c.charCodeAt(0)*7,0)%360;
const grad=s=>`linear-gradient(${120+hue(s)%90}deg,hsl(${hue(s)} 75% 86%),hsl(${(hue(s)+60)%360} 70% 76%))`;
const VIEWS={char:['定妆','三视图','表情','细节'],prop:['多角度','细节'],scene:['主空镜','机位A','机位B','光线']};

function body(n){
  const seed=n.title+n.ver;
  if(n.kind==='text')return `<div class="txt">${esc(n.prompt)}</div>`;
  if(n.kind==='shot')return `<div class="shotlist">${segOf(n).shots.map(x=>`<div><b>${x.id}</b><span>${x.d}s ${x.f}·${x.cam}</span><em>${esc(x.kf)}</em></div>`).join('')}</div>`;
  if(VIEWS[n.kind]){const v=VIEWS[n.kind];
    return `<div class="thumbs" style="grid-template-columns:repeat(${v.length},1fr)">${v.map((t,i)=>{
      const img=i===0&&n.img;
      return `<div class="ph ${n.out||img?'':'empty'}" style="--ar:1/1.25;${img?`background-image:url(${n.img})`:n.out?'background:'+grad(seed+i):''}">${img?'<span class="tag ref">参考</span>':n.out?`<span class="tag">${t}</span>`:'+'}</div>`}).join('')}</div>`;
  }
  if(n.kind==='board'){const sh=segOf(n).shots;
    return `<div class="thumbs" style="grid-template-columns:repeat(${sh.length>4?3:2},1fr)">${sh.map(s=>
      `<div class="ph ${n.out?'':'empty'}" style="--ar:9/12;${n.out?'background:'+grad(s.id+n.ver):''}"><span class="tag">${s.id}</span>${s.f}</div>`).join('')}</div>`}
  if(n.kind==='video')return `<div class="ph ${n.out?'':'empty'}" style="--ar:16/9;${n.out?'background:'+grad(seed):''}"><span class="pl">${n.out?'▶':'🎞️'}</span>${n.out?`<span class="tag">${n.mode==='final'?'正片':'样片'}</span>`:''}</div><div style="margin-top:5px;color:var(--mute);font-size:11px">${segDur(segOf(n))+n.extra}s · ${segOf(n).shots.length} 镜 · 对白/音效直出</div>`;
  return `<div class="ph ${n.out?'':'empty'}" style="--ar:16/9;${n.out?'background:'+grad('out'+n.ver):''}"><span class="pl">${n.out?'▶':'🎬'}</span></div><div style="margin-top:5px;color:var(--mute);font-size:11px">已完成分段 ${SEGS.filter(segDone).length}/${SEGS.length} · 不加字幕和配乐</div>`;
}
// 选中节点的工具条：每个按钮都是交给 Agent 的指令
function tools(n){
  const b=(a,t)=>`<button data-act="${a}">${t}</button>`;
  if(n.kind==='out')return b('play','▶ 预览')+b('regen','🔁 重新拼接');
  return b('ask',`💬 问${AGENTS[n.kind].name.replace(' Agent','')}`)+b('edit','✏️ 修改')+(n.kind==='text'||n.kind==='shot'?'':b('regen','🔁 重新生成'))+
    (ASSET_KINDS.includes(n.kind)?b('ref','🖼️ 换参考图'):'')+(n.kind==='video'?b('extend','⏩ 续拍'):'')+(!n.current?b('adopt','✅ 采用'):'')+(typeof studioOf==='function'&&studioOf(n)?b('open','⤢ 工作室'):'');
}
function render(){
  $$('.node').forEach(e=>e.remove());
  state.nodes.forEach(n=>{
    const el=document.createElement('div'),c=cost(n),A=n.by&&AGENTS[n.by];
    el.className=`node ${KIND[n.kind].c} ${n.status} ${state.ctx.includes(n.id)?'ctx':''} ${n.current?'':'old'} ${n.isNew?'appear':''} ${A?'working':''}`;
    el.id=n.id;el.style.left=n.x+'px';el.style.top=n.y+'px';
    const vers=n.parent||state.nodes.some(x=>x.parent===n.id),noGen=n.kind==='text'||n.kind==='shot';
    el.innerHTML=`<div class="port in"></div><div class="port out"></div>
      ${state.focus===n.id?`<div class="tbar">${tools(n)}</div>`:A?`<div class="by">${A.av} ${A.name} 处理中</div>`:''}
      <div class="hd"><span class="ico">${AI(n.kind)}</span><span class="ttl">${esc(n.title)}</span>${vers?`<span class="ver ${n.current?'cur':''}">v${n.ver}</span>`:''}<span class="st">${noGen?(n.status==='stale'?'待更新':'文本'):STX[n.status]}</span></div>
      ${n.note?`<div class="note">✎ ${esc(n.note)}</div>`:''}
      <div class="bd">${body(n)}${n.status==='running'?`<div class="run-ov">${Math.round(n.prog)}%<div class="prog" style="width:${n.prog}%"></div></div>`:''}</div>
      ${noGen?'':`<div class="ft"><span>${n.model}</span><span class="sp"></span>${c?`<span>¥${c.toFixed(1)}</span>`:''}</div>`}`;
    world.appendChild(el);
  });
  $('#empty').classList.toggle('off',state.nodes.length>0);
  drawFrames();drawWires();updateTimeline();if(typeof renderStages==='function')renderStages();if(typeof demoPush==='function')demoPush();
  // 子 Agent 预览层跟着节点状态刷新
  if(state.tab!=='orc'&&typeof renderWorkspace==='function'){renderPaneBar();if(paneOf(state.tab)==='ws')renderWorkspace()}
}
// 分组画框：按节点类型自动框出
const GROUPS=[{n:'剧本',k:['text']},{n:'分镜',k:['shot']},{n:'角色',k:['char']},{n:'道具',k:['prop']},{n:'场景',k:['scene']},{n:'故事板',k:['board']},{n:'视频',k:['video']},{n:'成片',k:['out']}];
function drawFrames(){
  $('#frames').innerHTML=GROUPS.map(g=>{
    const ns=state.nodes.filter(n=>g.k.includes(n.kind));if(!ns.length)return'';
    const P=16,box=ns.map(n=>{const e=$('#'+n.id);return [n.x,n.y,n.x+(e?e.offsetWidth:260),n.y+(e?e.offsetHeight:160)]});
    const x1=Math.min(...box.map(b=>b[0]))-P,y1=Math.min(...box.map(b=>b[1]))-P-10,x2=Math.max(...box.map(b=>b[2]))+P,y2=Math.max(...box.map(b=>b[3]))+P;
    const cnt=ns.filter(n=>n.current&&!n.parent).length;
    return `<div class="frame" style="left:${x1}px;top:${y1}px;width:${x2-x1}px;height:${y2-y1}px"><span class="fl">${g.n}<small>${cnt} 个</small></span></div>`}).join('');
}
function drawWires(){
  wires.innerHTML=state.edges.map(e=>{
    const A=byId(e.a),B=byId(e.b),ea=$('#'+e.a),eb=$('#'+e.b);if(!ea||!eb)return'';
    if(e.t==='opt'){const x1=A.x+14,y1=A.y+ea.offsetHeight,x2=B.x,y2=B.y+22;
      return `<path class="opt" d="M${x1},${y1} C${x1},${y2} ${x1},${y2} ${x2},${y2}"/>`}
    const x1=A.x+ea.offsetWidth,y1=A.y+ea.offsetHeight/2,x2=B.x,y2=B.y+eb.offsetHeight/2,dx=Math.max(40,Math.abs(x2-x1)/2);
    const cls=B.status==='running'?'run':(state.ctx.includes(e.a)||state.ctx.includes(e.b))?'hot':(!A.current||!B.current)?'old':'';
    return `<path class="${cls}" d="M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}"/>`}).join('');
}
// 自动排版：列 = 剧本 | 资产（角色/道具/场景 依次往下）| 分镜 | 故事板 | 视频 | 成片（和阶段顺序一致）
// 同一节点的新版本缩进排在它下方；分镜、故事板、视频按段落成行
const COLS=[['text'],['char','prop','scene'],['shot'],['board'],['video'],['out']];
function layout(){
  const GAP=40,CW=300,X={},h=n=>($('#'+n.id)||{}).offsetHeight||180;
  COLS.filter(c=>state.nodes.some(n=>c.includes(n.kind))).forEach((c,i)=>c.forEach(k=>X[k]=40+i*CW));
  const chain=list=>{const out=[],walk=(n,d)=>{out.push([n,d]);list.filter(x=>x.parent===n.id).forEach(x=>walk(x,d+1))};
    list.filter(n=>!n.parent||!list.some(x=>x.id===n.parent)).forEach(r=>walk(r,0));return out};
  const stack=(list,k,y)=>{chain(list).forEach(([n,d])=>{n.x=X[k]+d*22;n.y=y;y+=h(n)+GAP});return y};
  if(X.text!==undefined)stack(state.nodes.filter(n=>n.kind==='text'),'text',60);
  let ay=60;['char','prop','scene'].forEach(k=>{const l=state.nodes.filter(n=>n.kind===k);if(l.length)ay=stack(l,k,ay)+30});
  let y=60;
  SEGS.forEach(s=>{let bottom=y;
    ['shot','board','video'].forEach(k=>{if(X[k]!==undefined)bottom=Math.max(bottom,stack(state.nodes.filter(n=>n.kind===k&&n.seg===s.id),k,y))});
    y=bottom>y?bottom+10:y});
  state.nodes.filter(n=>n.kind==='out').forEach(n=>{n.x=X.out;n.y=Math.max(60,(60+y)/2-h(n)/2)});
}
// 新节点要先渲染才能量高度，所以 render → layout → render
function refresh(){render();layout();render();state.nodes.forEach(n=>n.isNew=false)}
