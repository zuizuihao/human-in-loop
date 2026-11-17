/* 模拟生成：进度、记账、预算拦截、样片/正片模式。调用方（子 Agent）负责依赖顺序 */
function runNode(n,mode=state.mode){
  if(n.status==='running')return Promise.resolve(false);
  const c=cost(n,mode);
  if(state.spent+c>BUDGET){toast('超出预算上限，已拦截');return Promise.resolve(false)}
  n.status='running';n.prog=0;render();
  const dur=(n.kind==='video'?2600:n.kind==='out'?1200:1300)*SPEED;
  return new Promise(res=>{
    const t0=performance.now(),tm=setInterval(()=>{
      n.prog=Math.min(100,(performance.now()-t0)/dur*100);
      const o=$('#'+n.id+' .run-ov');if(o){o.firstChild.nodeValue=Math.round(n.prog)+'%';o.querySelector('.prog').style.width=n.prog+'%'}
      if(n.prog>=100){clearInterval(tm);n.status='done';n.out=true;n.mode=mode;state.spent+=c;if(typeof demoGen==='function')demoGen(n,mode,c);
        $('#spent').textContent='¥'+state.spent.toFixed(1);render();res(true)}
    },80);
  });
}
function setMode(m){state.mode=m;const c=$('#modeChip');c.textContent=m==='draft'?'样片 480p':'正片 1080p';c.classList.toggle('final',m==='final');render()}
