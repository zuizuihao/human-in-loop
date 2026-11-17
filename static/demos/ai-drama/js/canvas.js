/* 画布交互：平移/缩放、点选节点（= @ 进对话）、镜头跟随 Agent。不支持手动连线和建节点，这些都由 Agent 完成 */
let drag=null;
function applyView(){const v=state.view;world.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.k})`;$('#zv').textContent=Math.round(v.k*100)+'%';
  const g=$('#grid');g.style.left=-v.x/v.k+'px';g.style.top=-v.y/v.k+'px';g.style.width=stage.clientWidth/v.k+'px';g.style.height=stage.clientHeight/v.k+'px'}
const toWorld=(cx,cy)=>{const r=stage.getBoundingClientRect(),v=state.view;return[(cx-r.left-v.x)/v.k,(cy-r.top-v.y)/v.k]};
function glide(){world.classList.add('glide');clearTimeout(world._g);world._g=setTimeout(()=>world.classList.remove('glide'),480)}
// 镜头移到节点（跟随开启时，Agent 每创建/处理一个节点都会调用）
function focusNode(n,force){
  if(!n||(!state.follow&&!force))return;const e=$('#'+n.id),w=e?e.offsetWidth:260,h=e?e.offsetHeight:200;
  const k=Math.max(state.view.k,.6),top=$('#tl').classList.contains('on')?$('#tl').offsetHeight+12:0;
  state.view={k,x:stage.clientWidth/2-(n.x+w/2)*k,y:(top+stage.clientHeight)/2-(n.y+h/2)*k};glide();applyView();
}
function fit(){if(!state.nodes.length)return;
  const bs=state.nodes.map(n=>{const e=$('#'+n.id);return[n.x,n.y,n.x+(e?e.offsetWidth:260),n.y+(e?e.offsetHeight:180)]});
  const x1=Math.min(...bs.map(b=>b[0]))-30,y1=Math.min(...bs.map(b=>b[1]))-40,x2=Math.max(...bs.map(b=>b[2]))+30,y2=Math.max(...bs.map(b=>b[3]))+30;
  const k=Math.min(1,stage.clientWidth/(x2-x1),stage.clientHeight/(y2-y1));
  state.view={k,x:(stage.clientWidth-(x2-x1)*k)/2-x1*k,y:(stage.clientHeight-(y2-y1)*k)/2-y1*k};glide();applyView()}
// 选中：普通点击 = 只 @ 这一个；Shift/Ctrl 点击 = 追加或取消
function pick(id,add){
  if(!id){state.ctx=[];state.focus=null}
  else if(add){state.ctx=state.ctx.includes(id)?state.ctx.filter(x=>x!==id):[...state.ctx,id];state.focus=state.ctx.includes(id)?id:null}
  else{state.ctx=[id];state.focus=id}
  render();renderCtx();renderSugs();
}
stage.addEventListener('mousedown',e=>{
  if(e.target.closest('#zoom,#tl,#fly,.tbar'))return;
  const el=e.target.closest('.node'),[wx,wy]=toWorld(e.clientX,e.clientY);
  // 节点不能拖动（位置由自动排版决定）：在节点上拖也是平移画布，没移动就算点选
  drag={type:'pan',n:el?byId(el.id):null,add:e.shiftKey||e.ctrlKey||e.metaKey,sx:e.clientX-state.view.x,sy:e.clientY-state.view.y,cx:e.clientX,cy:e.clientY};stage.classList.add('pan');
});
window.addEventListener('mousemove',e=>{
  if(!drag)return;drag.moved=drag.moved||Math.hypot(e.clientX-drag.cx,e.clientY-drag.cy)>4;
  state.view.x=e.clientX-drag.sx;state.view.y=e.clientY-drag.sy;applyView()
});
window.addEventListener('mouseup',()=>{
  if(drag&&!drag.moved)pick(drag.n?drag.n.id:null,drag.add);
  drag=null;stage.classList.remove('pan');
});
stage.addEventListener('click',e=>{const b=e.target.closest('.tbar [data-act]');if(b)nodeAction(b.dataset.act,byId(b.closest('.node').id))});
stage.addEventListener('wheel',e=>{
  if(e.target.closest('#tl,#fly'))return;
  e.preventDefault();const v=state.view,k0=v.k,k=Math.min(2,Math.max(.2,k0*(e.deltaY<0?1.1:.9)));
  const r=stage.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  v.x=mx-(mx-v.x)*k/k0;v.y=my-(my-v.y)*k/k0;v.k=k;applyView()},{passive:false});
$('#zi').onclick=()=>{state.view.k=Math.min(2,state.view.k*1.2);applyView()};
$('#zo').onclick=()=>{state.view.k=Math.max(.2,state.view.k/1.2);applyView()};
$('#follow').onclick=()=>{state.follow=!state.follow;$('#follow').classList.toggle('on',state.follow);toast(state.follow?'镜头会跟随正在工作的 Agent':'已关闭镜头跟随')};
// 双击节点：打开它所在的工作室并定位到它
stage.addEventListener('dblclick',e=>{const el=e.target.closest('.node'),u=el&&studioOf(byId(el.id));if(u)location.href=u});
$('#btnFit').onclick=fit;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))pick(null)});
window.addEventListener('resize',applyView);
