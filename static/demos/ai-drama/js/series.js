/* 系列总览：进度矩阵（集 × 阶段）、设定与大纲、资产库。只读，改东西都去对应的工作室 */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AV={char:id=>SVG(id==='weng'?'60 26 80 72':'48 132 104 80',DRAW[id]('front',{expr:'calm'}),'#eef0f3'),
  prop:id=>SVG('0 0 200 200',PDRAW[id]('front',{state:'assembled'}),'#eef0f3'),scene:id=>SVG('0 100 180 180',plate('master',{}))};
const KN={char:['🧑‍🎨','角色'],prop:['🧰','道具 / 特效'],scene:['🏞️','场景']};
const ITEMS=[...CHARS.map(c=>['char',c]),...PROPS.map(c=>['prop',c]),...SCENES.map(c=>['scene',c])];
const stepsOf=(k,c)=>({char:STEPS_CHAR,prop:STEPS_PROP,scene:STEPS_SCENE})[k].filter(s=>!c.only||c.only.includes(s.k));
const epsLabel=L=>L.length===STORE.EPS.length?'每集':L.join('、');
function render(){
  const M=STORE.matrix(),cur=STORE.ep;
  // 顶栏只有导航；作品名和总花费放在设定卡上
  const cell=(e,s)=>`<a class="mc st-${s.st}" href="${s.href}" title="${esc(s.tip)}">${s.s}${s.gate?`<em class="${s.ok?'ok':''}">${s.gate}</em>`:''}</a>`;
  $('#srMain').innerHTML=`
   <section class="bible"><div><h2>《${SERIES.title}》<small>${STORE.EPS.length} 集 · ${SERIES.spec.replace('每集 30 秒','每集 30 秒（试播）')} · 整部已花 ¥${STORE.spent().toFixed(1)}</small></h2><p>${SERIES.logline}</p><small>${SERIES.style}</small></div>
     <div class="srcs">${SOURCES.map((x,i)=>`<button data-src="${i}">📄 ${x.n}</button>`).join('')}<a class="btn sm" href="script.html?e=${cur}">✍️ 去剧本工作室改大纲和剧本</a></div></section>
   <h3>八集进度 <small>点格子进那一集对应的工作室；阶段顺序：剧本 → 资产 → 分镜 → 故事板 → 视频（样片 → 正片 → 成片）</small></h3>
   <div class="mx2"><table><tr><th>集</th>${M[0].stages.map(s=>`<th>${s.n}</th>`).join('')}<th>已花</th></tr>
    ${M.map(r=>{const o=OUTLINE.find(x=>x.id===r.id);return `<tr class="${r.id===cur?'cur':''}"><td class="en"><a href="index.html?e=${r.id}"><b>${r.id}</b> ${r.title}</a><small>${esc(o.problem)}</small></td>${r.stages.map(s=>`<td>${cell(r.id,s)}</td>`).join('')}<td class="sp2">¥${r.spent.toFixed(1)}</td></tr>`}).join('')}</table></div>
   <h3>资产库 <small>系列层：做一次，八集复用。连续性锁是永久的，跨集的变化记成"本集状态"</small></h3>
   <div class="lib">${Object.entries(KN).map(([k,[i,n]])=>`<div class="lc"><h4>${i} ${n}</h4>${ITEMS.filter(x=>x[0]===k).map(([,c])=>{const st=stepsOf(k,c),ok=st.filter(s=>c.steps[s.k]==='approved').length,rv=st.filter(s=>c.steps[s.k]==='review').length,ES=(typeof EPSTATE!=='undefined'&&EPSTATE[c.id])||{};
     return `<a class="li" href="asset.html?k=${k}&id=${c.id}&e=${cur}"><i>${AV[k](c.id)}</i><div><b>${c.name}</b><small>用于 ${epsLabel(STORE.usage(c.id))} · 产物链 ${ok}/${st.length}${rv?` · <span class="wa">待审 ${rv}</span>`:''}</small>${Object.keys(ES).length?`<small class="es">本集状态：${Object.entries(ES).map(([e,t])=>`${e} ${esc(t.split('，')[0])}`).join(' · ')}</small>`:''}</div></a>`}).join('')}</div>`).join('')}
    <div class="lc pend"><h4>📝 大纲里要新建的</h4><p class="tip">资产在分镜之前：每集写完剧本，先把库里没有的东西建卡</p>${STORE.pendingAll().map(x=>`<a class="li" href="script.html?e=${x.ep}"><i>${KN[x.k][0]}</i><div><b>${x.n}</b><small>${x.ep} 首次出现 · 还没有资产卡</small></div></a>`).join('')}</div></div>`;
  $$('[data-src]').forEach(b=>b.onclick=()=>{const x=SOURCES[+b.dataset.src];$('#mTitle').textContent=`${x.n} · ${x.f}`;$('#mBody').innerHTML=`<ul class="srcx">${x.x.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`;$('#modal').hidden=false});
}
$('#mClose').onclick=()=>$('#modal').hidden=true;
addEventListener('store',render);render();
