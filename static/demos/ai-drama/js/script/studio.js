/* 剧本工作室：左侧系列与八集，中间剧本 / 节拍 / 检查 / 资产，右侧剧本 Agent（agent.js）。会改内容的操作都交给 agent.js */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wait=ms=>new Promise(r=>setTimeout(r,ms*(window.SPEED||1)));
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2400)}
const EPS=OUTLINE.map(r=>({...r,sc:null}));
// 剧本存在 STORE 里（EP01 已拆成分镜，board=true，时长取自 storyboard.yaml；b.o 记下批准时的原文，用来查口头禅有没有被改）。改了直接写回，下次打开还在
EPS.forEach(e=>e.sc=STORE.script(e.id));
// 镜头时长以分镜为准（分镜工作室里改过的也算）
EPS[0].sc.segs.forEach(g=>g.shots.forEach(x=>{const o=STORE.getE('EP01','shots')[x.id];if(o&&o.duration_s)x.d=o.duration_s}));
const Q=new URLSearchParams(location.search),SC={ai:null,ep:STORE.ep,sel:Q.get('b'),tab:'script',P:{},tried:{},edit:null};
if(!EPS.find(e=>e.id===SC.ep))SC.ep='EP01';
// EP01 的下游状态：镜头表待更新（改了动作）、视频待重出（改了台词）
const shotStale=id=>ep().id==='EP01'&&STORE.getE('EP01','stale').shot.includes(id),vidStale=id=>ep().id==='EP01'&&STORE.getE('EP01','video')[id].st==='stale';
// 切集：和顶栏的集切换器、其他页面共用当前集
function goEp(id){SC.ep=id;STORE.setEp(id);history.replaceState(null,'',`?e=${id}`);SC.sel=null;SC.edit=null;if(!sc())SC.tab='script';renderAll();renderMsgs()}
const ep=()=>EPS.find(e=>e.id===SC.ep),sc=()=>ep().sc;
const shotsOf=s=>s.segs.flatMap(g=>g.shots),segDur=g=>g.shots.reduce((a,x)=>a+x.d,0),total=s=>s.segs.reduce((a,g)=>a+segDur(g),0);
const tStart=(s,id)=>{let t=0;for(const x of shotsOf(s)){if(x.id===id)return t;t+=x.d}return t};
const shotD=(s,id)=>shotsOf(s).find(x=>x.id===id).d;
const blk=id=>sc().blocks.find(b=>b.id===id),segOf=id=>sc().segs.find(g=>g.id===id);
const G1=s=>s.segs.every(g=>g.st==='approved');
// 念白时长估算：每秒 5 个字，省略号停 0.4 秒，其他标点停 0.15 秒
const speak=x=>x.replace(/[^一-龥A-Za-z0-9%]/g,'').length/5+(x.match(/……/g)||[]).length*.4+(x.replace(/……/g,'').match(/[，。？！—]/g)||[]).length*.15;
const epShot=id=>ep().id==='EP01'?EP.segments.flatMap(g=>g.shots).find(x=>x.id===id):null;
const TN={scene:'场景',act:'动作',line:'对白',sfx:'音效',vo:'画外音'};
// 资产缩略图（同分镜工作室）
const AV={char:id=>SVG(id==='weng'?'60 26 80 72':'48 132 104 80',DRAW[id]('front',{expr:'calm'}),'#eef0f3'),
  prop:id=>SVG('0 0 200 200',PDRAW[id]('front',{state:'assembled'}),'#eef0f3'),scene:id=>id==='crash'?SVG('0 100 180 180',plate('master',{})):''};

// ---------- 头部 ----------
function renderHdr(){const e=ep(),s=e.sc;
  $('#g1').innerHTML=!s?'还没有剧本':G1(s)?'G1 剧本审批 <b style="color:var(--ok)">已通过</b>':`G1 剧本审批 <b style="color:#b45309">待人审 ${s.segs.filter(g=>g.st!=='approved').map(g=>g.id).join('、')}</b>`;
  $('#verChip').innerHTML=s?`剧本 <b>v${s.ver}</b> · ${total(s)}s`:'大纲';
  $('#hExport').disabled=!s;document.title=`${e.id} 剧本工作室`;
}
// ---------- 左：系列与八集 ----------
function renderEps(){
  $('#eps').innerHTML=`<div class="ser"><b>《${SERIES.title}》</b><p>${SERIES.logline}</p><small>${SERIES.style}<br>${SERIES.spec}</small>
    <div class="srcs">${SOURCES.map((x,i)=>`<button data-src="${i}">📄 ${x.n}</button>`).join('')}</div></div>
   <h4>八集</h4>${EPS.map(e=>{const s=e.sc,st=!s?['大纲','']:G1(s)?['已过 G1','ok']:['待人审','wa'];
    return `<button class="ei ${e.id===SC.ep?'on':''}" data-ep="${e.id}"><span class="no">${e.id.slice(2)}</span><div><b>${e.title}</b><small>${esc(e.problem)}</small></div><i class="${st[1]}">${st[0]}</i></button>`}).join('')}`;
  $$('#eps [data-ep]').forEach(b=>b.onclick=()=>goEp(b.dataset.ep));
  $$('#eps [data-src]').forEach(b=>b.onclick=()=>{const x=SOURCES[+b.dataset.src];openModal(`${x.n} · ${x.f}`,`<ul class="srcx">${x.x.map(l=>`<li>${esc(l)}</li>`).join('')}</ul><p class="srcf">剧本 Agent 写稿时把这些当作硬约束。原文在仓库 ${x.f}</p>`)});
}
// ---------- 中：头部与标签 ----------
function renderHero(){const e=ep(),s=e.sc,lines=s?s.blocks.filter(b=>b.t==='line'||b.t==='vo'):[];
  $('#hero').innerHTML=`<div><h2>${e.title}<small>${e.id}</small></h2>
    <div class="facts"><span><em>问题</em>${esc(e.problem)}</span><span><em>凑合</em>${esc(e.tech)}</span><span><em>翻车</em>${esc(e.fail)}</span><span><em>代价</em>${esc(e.cost)}</span></div></div>
   ${s?`<div class="stats"><div><b>${s.segs.length}</b><small>段</small></div><div><b>${s.blocks.length}</b><small>条</small></div><div><b>${lines.length}</b><small>句台词</small></div><div><b>${total(s)}s</b><small>时长</small></div></div>`:''}`;
  const c=s?checks(s):[],bad=c.filter(x=>x.lv!=='ok'&&x.lv!=='info').length,miss=s?ents(s).filter(x=>!x.card).length+STORE.pending(e.id).length:0;
  $('#tabs').innerHTML=s?[['script','剧本'],['beats','节拍'],['check','检查',bad],['assets','资产',miss]].map(([k,n,i])=>`<button class="${SC.tab===k?'on':''}" data-tab="${k}">${n}${i?`<i class="bad">${i}</i>`:''}</button>`).join(''):'';
  $$('#tabs [data-tab]').forEach(b=>b.onclick=()=>{SC.tab=b.dataset.tab;renderAll()});
}
function renderView(){const s=sc();
  if(!s)return $('#view').innerHTML=`<div class="emptyb">这一集还只有大纲。<br>剧本 Agent 会按每集节拍写初稿，压到 30 秒、分 3 段，标出钩子、反转和卡点。<br><button class="btn pri" data-a="write">让剧本 Agent 写 ${ep().id} 初稿</button></div>`,$('#view [data-a]').onclick=()=>writeEp(ep().id);
  ({script:vScript,beats:vBeats,check:vCheck,assets:vAssets})[SC.tab](s);
}
// ---------- 剧本 ----------
function vScript(s){
  const tag=b=>b.tag?`<span class="tg" style="--c:${TAGS[b.tag][1]}">${TAGS[b.tag][0]}</span>`:'';
  const body=b=>{const p=SC.P[b.id];
    if(SC.edit===b.id)return `<textarea class="bed" data-ed="${b.id}">${esc(b.x)}</textarea>`;
    return `${b.t==='line'||b.t==='vo'?`<em class="who">${b.who||''}${b.t==='vo'?'（画外音）':''}${b.how?`<i>（${esc(b.how)}）</i>`:''}</em>`:''}<p>${b.t==='sfx'?'🔊 ':''}${esc(b.x)}</p>
     ${p?`<div class="prop"><small>✍️ ${STYLE[p.style]||'按你的意思改'}</small><del>${esc(b.x)}</del><ins>${esc(p.x)}</ins><small>${esc(p.why)}</small>
       <div><button class="btn sm pri" data-pa="${b.id}">采用</button><button class="btn sm" data-pn="${b.id}">换一个</button><button class="btn sm" data-px="${b.id}">不要</button></div></div>`:''}`};
  const st={approved:['已批准 🔒','ok'],review:['改动待人审','wa'],draft:['初稿','wa']};
  const aiBar=b=>`<div class="aibar"><div class="chips">${Object.keys(ALT[b.id]||{}).map(k=>`<button data-aic="${b.id}|${k}">${STYLE[k]}</button>`).join('')||'<small>这一条没有现成的改法，直接说要怎么改</small>'}</div>
    <div class="aiq"><input data-aiq="${b.id}" placeholder="或者直接说这一条要怎么改，回车"><button class="ib" data-aix title="关闭">✕</button></div></div>`;
  // 采用 G1 之后，下游要跟着改的，直接在页面上提示（不弹 Agent）
  const down=s.board&&G1(s)?[...STORE.getE('EP01','stale').shot.map(id=>[`${id} 改了动作：分镜 Agent 要按新剧本改镜头表`,`episode.html?m=shot&e=EP01&s=${segOf(id).shots[0].id}`,'去分镜 ›']),...s.segs.filter(g=>vidStale(g.id)).map(g=>[`${g.id} 只改了台词：重出这段视频就行，故事板不用动`,`episode.html?m=video&e=EP01&s=${g.shots[0].id}`,'去审片室 ›'])]:[];
  $('#view').innerHTML=`${down.map(([t,h,n])=>`<div class="stalebar">✍️ G1 已通过 · ${t}<span class="sp"></span><a class="btn sm pri" href="${h}">${n}</a></div>`).join('')}<div class="sbar"><div class="hist">${s.hist.map(h=>`<span class="${h.v===s.ver?'cur':''}" title="${esc(h.n)}">v${h.v}</span>`).join('')}<small>${esc(s.hist[s.hist.length-1].n)}</small></div><span class="sp"></span><small>已批准的段落不会被推翻：改哪句只动哪句，改完该段重新人审</small></div>
   ${s.segs.map(g=>{const t0=tStart(s,g.shots[0].id);return `<section class="sseg">
    <div class="shd"><b>${g.id} ${g.title}</b><small>${t0}–${t0+segDur(g)}s · ${g.shots.map(x=>x.beat).filter((x,i,a)=>a.indexOf(x)===i).join(' → ')}</small><span class="sp"></span>
     ${shotStale(g.id)?`<a class="pill bad" href="episode.html?m=shot&s=${g.shots[0].id}" title="改了动作，分镜 Agent 要按新剧本改镜头表">镜头表待更新 ›</a>`:''}${vidStale(g.id)?`<a class="pill bad" href="episode.html?m=video&s=${g.shots[0].id}" title="改了台词：声音直出，只需重出视频，故事板不用动">视频待重出 ›</a>`:''}<span class="pill ${st[g.st][1]}">${st[g.st][0]}</span>${g.st!=='approved'?`<button class="btn sm pri" data-ap="${g.id}">批准 ${g.id}</button>`:''}</div>
    ${s.blocks.filter(b=>b.seg===g.id).map((b,i,a)=>{const first=!i||a[i-1].sh!==b.sh,x=first&&epShot(b.sh);return `<div class="bk t-${b.t} ${first&&i?'nsh':''} ${SC.sel===b.id?'on':''} ${SC.P[b.id]?'pending':''}" data-b="${b.id}">
      <span class="tc">${first?`${tStart(s,b.sh)}s`:''}<small>${TN[b.t]}</small></span><div class="bd">${body(b)}</div><span class="tgs">${tag(b)}</span>
      ${x?`<a class="shc" href="episode.html?m=shot&s=${b.sh}" title="已拆成 ${b.sh}，去分镜工作室">${frame(x)}<small>${b.sh}</small></a>`:`<span class="shc none">${first?`<small>${b.sh}</small>`:''}</span>`}
      <span class="ops"><button data-e="${b.id}" title="自己改">✎</button><button class="aib ${SC.ai===b.id?'on':''}" data-ai="${b.id}" title="让 AI 改这一条">✨</button></span></div>${SC.ai===b.id&&!SC.P[b.id]?aiBar(b):''}`}).join('')}</section>`}).join('')}`;
  if(SC.sel){const e=$(`#view [data-b="${SC.sel}"]`);if(e&&!SC._scrolled){SC._scrolled=1;e.scrollIntoView({block:'center'})}}
  $$('#view [data-b]').forEach(e=>e.onclick=ev=>{if(ev.target.closest('button,a,textarea'))return;SC.sel=SC.sel===e.dataset.b?null:e.dataset.b;renderAll()});
  $$('#view [data-e]').forEach(b=>b.onclick=()=>{SC.edit=b.dataset.e;SC.sel=b.dataset.e;renderAll();const t=$('#view .bed');t.focus();t.setSelectionRange(t.value.length,t.value.length)});
  $$('#view [data-ed]').forEach(t=>{t.onblur=()=>{const b=blk(t.dataset.ed);SC.edit=null;t.value.trim()&&t.value.trim()!==b.x?userEdit(b,t.value.trim()):renderAll()};t.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();t.blur()}if(e.key==='Escape'){t.value=blk(t.dataset.ed).x;t.blur()}}});
  $$('#view [data-ai]').forEach(b=>b.onclick=()=>{const id=b.dataset.ai;SC.ai=SC.ai===id?null:id;SC.sel=id;renderAll();const q=$('#view [data-aiq]');if(q)q.focus()});
  $$('#view [data-aic]').forEach(b=>b.onclick=()=>{const[id,k]=b.dataset.aic.split('|');aiScript(blk(id),k)});
  const q=$('#view [data-aiq]');if(q)q.onkeydown=e=>{if(e.key==='Enter'&&q.value.trim())aiScript(blk(q.dataset.aiq),null,q.value.trim());if(e.key==='Escape'){SC.ai=null;renderAll()}};
  $$('#view [data-aix]').forEach(b=>b.onclick=()=>{SC.ai=null;renderAll()});
  $$('#view [data-pa]').forEach(b=>b.onclick=()=>adopt(b.dataset.pa));
  $$('#view [data-pn]').forEach(b=>b.onclick=()=>DOCK.inline(()=>rewrite(blk(b.dataset.pn))));
  $$('#view [data-px]').forEach(b=>b.onclick=()=>{delete SC.P[b.dataset.px];renderAll()});
  $$('#view [data-ap]').forEach(b=>b.onclick=()=>approveSeg(b.dataset.ap));
}
// ---------- 节拍 ----------
function vBeats(s){const T=total(s),pct=t=>t/T*100,kept=TEMPLATE.map(p=>({...p,sh:shotsOf(s).filter(x=>p.has.includes(x.beat))}));
  const col=n=>['#ffe4e6','#fef3c7','#e0e7ff','#fce7f3','#dcfce7','#e0f2fe','#ede9fe'][TEMPLATE.findIndex(p=>p.has.includes(n))]||'#f2f3f7';
  $('#view').innerHTML=`<div class="bstrip"><div class="lane2">${shotsOf(s).map(x=>`<div class="bb" style="left:${pct(tStart(s,x.id))}%;width:calc(${pct(x.d)}% - 2px);background:${col(x.beat)}" title="${x.id} ${x.beat} ${x.d}s"><b>${x.beat}</b><small>${x.id}</small></div>`).join('')}
     ${s.segs.slice(1).map(g=>`<div class="join2" style="left:${pct(tStart(s,g.shots[0].id))}%"></div>`).join('')}</div>
    <div class="lane2 mk2">${s.blocks.filter(b=>b.tag).map(b=>`<span style="left:${pct(tStart(s,b.sh)+shotD(s,b.sh)/2)}%;--c:${TAGS[b.tag][1]}" data-go="${b.id}" title="${esc(b.x)}">${TAGS[b.tag][0]}</span>`).join('')}</div>
    <div class="ruler2">${[...Array(T/5+1)].map((_,i)=>`<span style="left:${pct(i*5)}%">${i*5}s</span>`).join('')}</div></div>
   <h4 class="h4">每集固定节拍（03-outline.md）· 本集保留 ${kept.filter(p=>p.sh.length).length} / ${TEMPLATE.length}</h4>
   <div class="tpl">${kept.map((p,i)=>`<div class="tp ${p.sh.length?'':'cut'}"><span class="sk" style="background:${col(p.has[0])}">${i+1}</span><div><b>${p.n}</b><small>${p.d}</small>
     ${p.sh.length?`<p>${p.sh.map(x=>x.id).join('、')} · ${p.sh.reduce((a,x)=>a+x.d,0)}s</p>`:`<p class="why">✂ 已删：${p.cut||'这一集没有用到'}</p>`}</div></div>`).join('')}</div>`;
  $$('#view [data-go]').forEach(e=>e.onclick=()=>{SC.sel=e.dataset.go;SC.tab='script';renderAll()});
}
// ---------- 检查（drama-script 的检查清单，随剧本实时重算） ----------
function checks(s){const e=ep(),out=[],B=s.blocks,first=shotsOf(s)[0].id,last=s.segs[s.segs.length-1];
  const hk=B.filter(b=>b.tag==='hook').map(b=>tStart(s,b.sh)).sort((a,b)=>a-b)[0],hb=B.find(b=>b.sh===first&&ALT[b.id]&&ALT[b.id].hook);
  out.push(hk!==undefined&&hk<3?{n:'开头 3 秒有冲突',lv:'ok',lines:[`第 ${hk}s 就亮出问题 ✓`]}:{n:'开头 3 秒有冲突',lv:'warn',lines:[`第一个钩子在第 ${hk??'?'}s；开头 3 秒只有音效和起身动作，观众还不知道出了什么事`],fix:hb?[['开头就亮出电量 12%',()=>propose(hb,'hook')]]:[]});
  const bad=s.segs.filter(g=>segDur(g)<4||segDur(g)>30);
  out.push({n:'时长',lv:bad.length||total(s)!==30?'bad':'ok',lines:[`全集 ${total(s)}s（规格 30s），每段 ${s.segs.map(segDur).join(' / ')}s，Seedance 单次 4–30s${bad.length?`：${bad.map(g=>g.id).join('、')} 超出`:' ✓'}`]});
  const fill=fills(s),over=fill.filter(f=>f.r>1),tight=fill.filter(f=>f.r>.9&&f.r<=1);
  out.push({n:'台词塞得下',lv:over.length?'bad':tight.length?'warn':'ok',lines:[...over.map(f=>`${f.sh} 只有 ${f.d}s，台词要念 ${f.t.toFixed(1)}s（${f.ids.join('、')}）`),...tight.map(f=>`${f.sh} 偏紧：${f.t.toFixed(1)}s / ${f.d}s`),...(!over.length&&!tight.length?['每句都在镜头时长内 ✓']:[])],
    fix:over.flatMap(f=>[...(s.board?[[`去分镜把 ${f.sh} 加长 ›`,()=>location.href=`episode.html?m=shot&e=EP01&s=${f.sh}`]]:[]),...f.ids.filter(id=>ALT[id]&&ALT[id].punch).map(id=>[`把 ${id} 改短`,()=>propose(blk(id),'punch')])])});
  const blind=B.filter(b=>b.t==='line'&&/^[一二三四五六七八九十百千]+$/.test(b.x.replace(/[^一-龥]/g,'')));
  out.push({n:'不靠字幕也听得懂',lv:blind.length?'warn':'ok',lines:blind.length?blind.map(b=>`${b.id}「${b.x}」：只说数字，观众不知道在数什么`):['需要观众知道的信息都用台词或画面里的实物交代 ✓'],fix:blind.filter(b=>ALT[b.id]&&ALT[b.id].clear).map(b=>[`改 ${b.id}`,()=>propose(b,'clear')])});
  const cl=B.some(b=>b.seg===last.id&&b.tag==='cliff'),lb=[...B].reverse().find(b=>b.seg===last.id&&ALT[b.id]&&ALT[b.id].cliff);
  out.push({n:'结尾卡点',lv:cl?'ok':'warn',lines:[cl?'结尾留了下一集的钩子 ✓':'收在口头禅和拉远上，没有让人想看下一集的东西'],fix:!cl&&lb?[['加下集钩子',()=>propose(lb,'cliff')]]:[]});
  const chg=B.filter(b=>b.o&&CATCH.some(([c])=>b.o.includes(c)&&!b.x.includes(c)));
  out.push({n:'人设与口头禅',lv:chg.length?'bad':'info',lines:[...chg.map(b=>`${b.id} 的口头禅被改了：「${b.x}」，观众认的是原话`),...CATCH.map(([c,w])=>`${B.some(b=>b.x.includes(c))?'✓':'—'} "${c}"（${w}）`)],fix:chg.map(b=>[`${b.id} 改回原话`,()=>commit(b,b.o,'改回口头禅原话')])});
  const pp=B.filter(b=>/字幕|配乐|背景音乐|BGM/i.test(b.x));
  out.push({n:'世界规则与不做后期',lv:pp.length?'bad':'ok',lines:[`凑合科技：${e.tech}（原理真实，不开挂）✓`,'老灯只低悬在地平线上 ✓',...(pp.length?pp.map(b=>`${b.id} 提到了后期：${b.x}`):['对白、音效、画外音都写在剧本里，视频直出；不加字幕和配乐 ✓'])]});
  return out;
}
function fills(s){return shotsOf(s).map(x=>{const L=s.blocks.filter(b=>b.sh===x.id&&(b.t==='line'||b.t==='vo')),t=L.reduce((a,b)=>a+speak(b.x),0);return{sh:x.id,d:x.d,t,r:t/x.d,ids:L.map(b=>b.id)}}).filter(f=>f.ids.length)}
function vCheck(s){const c=checks(s),ic={ok:'✓',warn:'!',bad:'✕',info:'i'};
  $('#view').innerHTML=`<div class="mxbar"><small>drama-script 检查清单，随剧本实时重算</small><span class="sp"></span><button class="btn sm" data-a="ask">让剧本 Agent 逐条修</button></div>
   <div class="chks">${c.map((x,i)=>`<div class="ck lv-${x.lv}"><span class="ci2">${ic[x.lv]}</span><div><b>${x.n}</b>${x.lines.map(l=>`<p>${esc(l)}</p>`).join('')}${x.fix&&x.fix.length?`<div class="acts">${x.fix.map((f,j)=>`<button class="btn sm" data-f="${i}|${j}">${esc(f[0])}</button>`).join('')}</div>`:''}</div></div>`).join('')}</div>
   <h4 class="h4">台词时长（按每秒 5 个字估算）</h4>
   <table class="gt"><tr><th>镜头</th><th>台词</th><th style="width:180px">念白 / 镜头时长</th></tr>${fills(s).map(f=>`<tr><td>${f.sh}</td><td>${f.ids.map(id=>esc(blk(id).x)).join('<br>')}</td><td><div class="fbar"><i style="width:${Math.min(100,f.r*100)}%;background:${f.r>1?'var(--err)':f.r>.9?'var(--warn)':'var(--ok)'}"></i></div><small>${f.t.toFixed(1)}s / ${f.d}s</small></td></tr>`).join('')}</table>`;
  $$('#view [data-f]').forEach(b=>b.onclick=()=>{const[i,j]=b.dataset.f.split('|');DOCK.inline(async()=>c[i].fix[j][1]())});
  $('#view [data-a="ask"]').onclick=()=>DOCK.inline(()=>fixAll());
}
// ---------- 资产（剧本里出现了什么，交给资产 Agent） ----------
function ents(s){return ENTS.map(x=>({...x,bs:s.blocks.filter(b=>b.t!=='scene'&&x.re.test(b.x))})).filter(x=>x.bs.length)}
function vAssets(s){const E=ents(s),K={char:['🧑‍🎨','角色'],prop:['🧰','道具 / 特效'],scene:['🏞️','场景']},np=STORE.pending(ep().id);
  $('#view').innerHTML=`<p class="gtip">资产在分镜之前：剧本 Agent 从剧本里抽出出镜的角色、道具和场景，库里已有的直接复用，没有的交给对应的资产 Agent 先建卡；剧本改动带出新东西时，这里会标红。</p>
   ${np.length?`<h4 class="h4">📝 资产库里还没有（${ep().id} 首次出现）</h4><div class="ents">${np.map(([k,n])=>`<div class="en miss"><i>${K[k][0]}</i><div><b>${n}</b><small>${K[k][1]} · 大纲里要用到</small></div><a class="btn sm pri" href="asset.html?k=${k}&e=${ep().id}">去资产库建卡</a></div>`).join('')}</div>`:''}
   ${Object.entries(K).map(([k,[i,n]])=>{const L=E.filter(x=>x.k===k);return L.length?`<h4 class="h4">${i} ${n}</h4><div class="ents">${L.map(x=>`<div class="en ${x.card?'':'miss'}"><i>${x.card&&AV[k](x.id)||'？'}</i><div><b>${x.n}</b><small>出现在 ${x.bs.length} 条：${x.bs.map(b=>`<a data-go="${b.id}">${b.id}</a>`).join(' ')} · ${[...new Set(x.bs.map(b=>b.sh))].join('、')}</small></div>
     ${x.card?`<a class="btn sm" href="asset.html?k=${k}&e=${ep().id}&id=${x.id}">资产卡 ›</a>`:`<a class="btn sm pri" href="asset.html?k=${k}&e=${ep().id}">去资产库建卡 ›</a>`}</div>`).join('')}</div>`:''}).join('')}`;
  $$('#view [data-go]').forEach(e=>e.onclick=()=>{SC.sel=e.dataset.go;SC.tab='script';renderAll()});
  $$('#view [data-h]').forEach(b=>b.onclick=()=>handoffAsset(ENTS.find(x=>x.id===b.dataset.h)));
}
function openModal(t,h){$('#mTitle').textContent=t;$('#mBody').innerHTML=h;$('#modal').hidden=false}
$('#mClose').onclick=()=>$('#modal').hidden=true;
$('#hExport').onclick=()=>exportMd();
function renderAll(){STORE.save();renderHdr();renderEps();renderHero();renderView();renderCtx();renderSugs()}
