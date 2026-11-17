/* 顶部下拉的分镜时间线、成片预览 */
function updateTimeline(){
  const tr=$('#tracks'),sel=state.ctx.map(byId).filter(Boolean);let total=0;
  tr.innerHTML=SEGS.map(s=>{
    const d=segDur(s);total+=d;const ok=segDone(s),on=sel.some(n=>n.seg===s.id);
    return `<div class="seg"><div class="nm">${s.id} ${s.title}<br>${d}s ${ok?'✅':''}</div><div class="shots">${
      s.shots.map(x=>`<div class="shot ${ok?'ok':''} ${on?'on':''}" data-seg="${s.id}" style="flex:${x.d}" title="${esc(x.kf)}">${x.id} ${x.f}<small>${x.d}s · ${x.cam}</small></div>`).join('')}</div></div>`}).join('');
  $('#totDur').textContent=$('#tlDur').textContent=total+'s';
  $$('.shot').forEach(el=>el.onclick=()=>{
    const n=live('board').find(x=>x.seg===el.dataset.seg);if(!n)return toast('这一段的故事板还没建');
    pick(n.id);focusNode(n,true)});
}
function play(){
  const segs=SEGS.filter(segDone);
  if(!segs.length){toast('还没有生成好的分段');return}
  const shots=segs.flatMap(s=>s.shots),tot=sum(shots,s=>s.d);
  $('#modal').style.display='flex';let i=0;
  $('#mcap').textContent=`共 ${shots.length} 镜 / ${tot}s${segs.length<SEGS.length?`（仅已完成的 ${segs.length}/${SEGS.length} 段）`:''} · 对白和音效来自视频直出`;
  clearTimeout(window._pt);
  (function step(){
    if(i>=shots.length||$('#modal').style.display==='none')return;
    const s=shots[i++];$('#msub').textContent=s.line||'';$('#mpl').textContent=s.f+' · '+s.cam;
    $('#mscr').style.background=grad(s.id);window._pt=setTimeout(step,s.d*400);
  })();
}
$('#btnPlay').onclick=play;
function toggleTl(on){$('#tl').classList.toggle('on',on);$('#btnTl').classList.toggle('on',on)}
$('#btnTl').onclick=()=>toggleTl(!$('#tl').classList.contains('on'));
$('#tlClose').onclick=()=>toggleTl(false);
$('#mclose').onclick=()=>{$('#modal').style.display='none';clearTimeout(window._pt)};
