/* 顶栏（所有页面共用，一条，只放导航）：
   ✦（回欢迎页） ｜ 《作品》/ EP01 集名 ▾ ……… 画布 · 剧本 · 资产 · 分镜 · 视频（居中，每格一个状态点） ……… 💾 保存 📥 待你处理 ｜ Agent 入口（dock.js 加）
   - 💾：本地项目写回文件夹（Ctrl+S），有没保存的改动时带圆点；演示包只读，点它另存为本地项目。重开浏览器后变成 🔌 重新连接
   - 作品名点进系列总览；集切换器留在当前页面，只换 ?e=
   - 阶段：剧本 G1 → 资产 G2 → 分镜 G3（镜头表 + 画面参考）→ 视频 G4/G5（样片 → 正片 → 成片）。进度和审批门放在悬停提示里
   - 单集作品（STORE.single()）：只有作品名，没有总览和集切换器
   - 画布上新建的独立项目（STAGEBAR.free(true)）：只有作品名
   页面里放 <nav id="stagebar" data-cur="series|canvas|script|asset|shot|video"></nav>，页面自己的工具放进内容区 */
const STAGEBAR={
  isFree:false,
  // 切到另一集：留在当前页面，只换 ?e=（镜头编号不跨集，去掉 s / b）
  epHref(e){const q=new URLSearchParams(location.search);q.set('e',e);q.delete('s');q.delete('b');q.delete('new');q.delete('q');return (location.pathname.split('/').pop()||'index.html')+'?'+q},
  render(){const el=document.getElementById('stagebar');if(!el)return;
    const brand='<a class="brand" href="home.html" title="回到欢迎页：新建一种视频">✦</a>';
    if(this.isFree){const t=document.getElementById('projTitle');el.innerHTML=`${brand}<span class="crumbs"><b>${t?t.textContent:'新项目'}</b><small>独立项目 · 不和演示数据联动</small></span>`;return}
    const cur=el.dataset.cur,single=STORE.single(),e=STORE.ep,P=STORE.project(),box=single?STORE.inbox():STORE.inboxAll(),T=(P.eps.find(x=>x.id===e)||{}).title||'';
    const ibOpen=el.querySelector('.ibx:not([hidden])'),dirty=STORE.dirty(),FS=typeof PROJECT_FS!=='undefined'&&PROJECT_FS;
    const sv=!FS?'':PROJECT.local&&!FS.connected?`<button class="sv" data-fs="reconnect" title="浏览器重开后要重新授权读写「${PROJECT.name}」">🔌 重新连接</button>`:
      PROJECT.local?`<button class="sv ${dirty?'dirty':''}" data-fs="save" title="${dirty?`${dirty} 个文件有改动，写回「${PROJECT.name}」（Ctrl+S）`:`已保存到「${PROJECT.name}」`}">💾 保存</button>`:
      `<button class="sv ${dirty?'dirty':''}" data-fs="saveAs" title="演示项目只读，改动只存在浏览器里${dirty?`（${dirty} 个文件有改动）`:''}。另存为本地项目文件夹，以后在主页打开">💾 另存为</button>`;
    const tabs=[{k:'canvas',n:'画布',href:`index.html?e=${e}`,tip:'这一集的画布 + 导演 Agent'},...STORE.stages().map(s=>({...s,tip:`${s.n}：${s.s}${s.gate?` · ${s.gate} ${s.ok?'已通过':'未通过'}`:''}\n${s.tip}`}))];
    el.innerHTML=`${brand}<span class="crumbs">${single?`<b>${P.title}</b>`:
        `<a class="${cur==='series'?'on':''}" href="series.html" title="系列总览：八集进度、设定与大纲、资产库">《${P.title}》</a><i>/</i>
         <span class="epw"><button class="epsw" title="切换到别的集">${e}<b>${T}</b><span>▾</span></button><div class="epl" hidden>${P.eps.map(x=>{const S2=STORE.stages(x.id);
           return `<a class="${x.id===e?'on':''}" href="${this.epHref(x.id)}"><b>${x.id}</b>${x.title}<span class="dots">${S2.map(s=>`<i class="dot d-${s.st}" title="${s.n}"></i>`).join('')}</span></a>`}).join('')}</div></span>`}</span>
      <span class="tabs">${cur==='series'?'':tabs.map(t=>`<a class="tab ${cur===t.k?'on':''}" href="${t.href}" title="${t.tip.replace(/"/g,'&quot;')}">${t.st?`<i class="dot d-${t.st}"></i>`:''}${t.n}</a>`).join('')}</span>
      <span class="rt">${sv}<button class="inb ${box.length?'has':''}" title="待你处理">📥<b>${box.length||''}</b></button></span>
      <div class="ibx" ${ibOpen?'':'hidden'}><div class="ih"><b>待你处理（${box.length}）</b><small>${single?'点一条直接去处理':'整部作品，按集排；点一条直接去处理'}</small></div>
        ${box.map(x=>`<a href="${x.href}"><span>${x.a}</span>${single?'':`<code>${x.ep}</code>`}${x.t}<i>›</i></a>`).join('')||'<p>没有要你处理的事 ✓</p>'}
        <div class="if">${PROJECT.local?`<span>本地项目「${PROJECT.name}」</span><button data-reset>↺ 放弃没保存的改动</button><button data-fs="close">关闭项目</button>`:
          '<span>演示项目 · 改动存在本机浏览器</span><button data-reset>↺ 重置演示</button>'}</div></div>`;
    const ib=el.querySelector('.ibx'),ep=el.querySelector('.epl');
    el.querySelector('.inb').onclick=x=>{x.stopPropagation();ib.hidden=!ib.hidden;if(ep)ep.hidden=true};
    if(ep)el.querySelector('.epsw').onclick=x=>{x.stopPropagation();ep.hidden=!ep.hidden;ib.hidden=true};
    el.querySelector('[data-reset]').onclick=()=>{if(confirm(PROJECT.local?'放弃没保存的改动，回到文件夹里的样子？':'清空演示项目的所有改动，回到初始状态？'))STORE.reset()};
    el.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>FS[b.dataset.fs]())},
  // 画布上新建的独立项目：顶栏只显示作品名
  free(v){this.isFree=v;this.render()},
  show(v){this.free(!v)}};
addEventListener('store',()=>STAGEBAR.render());
document.addEventListener('click',e=>{if(!e.target.closest('#stagebar .ibx,#stagebar .epl'))document.querySelectorAll('#stagebar .ibx,#stagebar .epl').forEach(b=>b.hidden=true)});
STAGEBAR.render();
