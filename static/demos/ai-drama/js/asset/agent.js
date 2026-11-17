/* 资产工作室右侧的 Agent（角色 / 道具 / 场景 Agent）：上下文、建议、对话，以及它执行的操作（抽卡、批准、选用、改锁、出镜检查、圈选修改、交给视频 Agent）。全部模拟 */
const PRICE_IMG=0.2; // 出一张图的模拟单价
const M=[];let busy=false;
function post(m){M.push(m);renderMsgs();DOCK.notify(m);return m}
async function agentSay(t){const m=post({r:'ag',t:'…'});await wait(380);m.t=t;renderMsgs();return m}
function card(b,lines,acts){return post({r:'card',b,lines,acts})}
function renderMsgs(){
  const el=$('#aMsgs');
  el.innerHTML=M.length?M.map((m,i)=>m.r==='card'?`<div class="acard"><b>${esc(m.b)}</b>${m.lines&&m.lines.length?`<ul>${m.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:''}
    ${m.acts?`<div class="acts">${m.acts.map((a,j)=>`<button class="btn ${j===0?'pri':''}" data-m="${i}" data-j="${j}">${esc(a[0])}</button>`).join('')}</div>`:m.done?`<div class="done">${esc(m.done)}</div>`:''}</div>`
    :`<div class="m ${m.r}">${esc(m.t)}</div>`).join(''):`<div class="m sys">我负责这部剧所有${K().n}的资产。选一个${K().n}、一张资产板，或在图上圈出要改的地方，然后告诉我怎么改。</div>`;
  el.scrollTop=1e9;
  $$('#aMsgs [data-m]').forEach(b=>b.onclick=()=>{const m=M[+b.dataset.m],a=m.acts[+b.dataset.j];m.done='✓ '+a[0];m.acts=null;renderMsgs();a[1]()});
}
// 上下文：当前对象 + 正在看的资产 / 圈选区域 / 出镜检查里点中的格子
function ctxNow(){
  const c=C(),k=S.step,vi=S.view[c.id+k]??c.pick[k],out=[[`${c.icon} ${c.name}`]];
  if(S.tab==='sheets'||S.tab==='prompt')out.push([`${k} ${stepOf(k).n}${S.tab==='sheets'&&(c.takes[k]||[]).length?` · 候选 ${vi+1}`:''}`]);
  if(c.looks.length>1&&S.look!==c.looks[0].id)out.push([`${K().lookN}：${c.looks.find(l=>l.id===S.look).n}`]);
  S.ann.forEach((a,i)=>out.push([`区域${'①②③④⑤'[i]}`,'a',()=>{S.ann.splice(i,1);renderAll()}]));
  if(S.cell)out.push([`${S.cell.sh} · ${S.cell.c}`,'a',()=>{S.cell=null;renderAll()}]);
  return out;
}
function renderCtx(){
  const cx=ctxNow();$('#aCtx').innerHTML=cx.map(([t,a],i)=>`<span class="${a||''}">${t}${a?`<b data-x="${i}">✕</b>`:''}</span>`).join('');
  $$('#aCtx [data-x]').forEach(b=>b.onclick=()=>cx[+b.dataset.x][2]());
}
// 建议：跟着当前标签页和状态变
function sugs(){
  const c=C(),k=S.step,st=c.steps[k];
  if(busy)return[];
  if(S.ann.length)return[['按圈选区域修改…',()=>{$('#aIn').value='把圈出的地方改成：';$('#aIn').focus()}],['清除圈选',()=>{S.ann=[];renderAll()}]];
  if(S.tab==='sheets'){const r=[];
    if(st==='stale')r.push(['按新设定重出',regenStale]);
    if(st==='review')r.push([`批准 ${k} ${stepOf(k).n}`,()=>approve(k)],['逐条核对锁',checkTake]);
    if(st==='none')r.push([`生成 ${stepOf(k).n}`,()=>reroll(k,true)]);
    if(st!=='none')r.push(['再抽 4 张',()=>reroll(k)],['检查这张是否符合锁',checkTake]);
    (c.quick||[]).forEach(q=>r.push([q,()=>fix(q)]));
    return r}
  if(S.tab==='locks')return[['从源头图再找一条该锁住的特征',suggestLock],['检查锁和源头图是否一致',checkTake]];
  if(S.tab==='geo')return[['把所有不该入画的老灯都排除掉',()=>fixLamp()],['检查各空镜的光向',()=>agentSay(PLATES.map(p=>`${p.n}（${p.step}）：${p.lamp}；${p.light}`).join('\n'))]];
  if(S.tab==='appear'){if(!S.checks[c.id])return[['检查全部出镜',runCheck]];
    const bad=Object.entries(S.checks[c.id]).flatMap(([sh,r])=>Object.entries(r).filter(([,v])=>v.r==='⚠').map(([cc])=>[sh,cc]));
    return [...(S.cell?[[`把 ${S.cell.sh} 交给视频 Agent 修补`,()=>handoff([[S.cell.sh,S.cell.c]])],[`加强 ${S.cell.c} 锁的描述`,()=>{S.tab='locks';S.editLock=c.locks.findIndex(l=>l.c===S.cell.c);renderAll()}]]:[]),
      ...(bad.length?[[`把 ${bad.length} 处偏离都交给视频 Agent`,()=>handoff(bad)]]:[]),['只看有问题的镜头',()=>{S.onlyBad=true;renderAll()}],['重新检查',runCheck]]}
  return[['精简这条提示词',()=>agentSay('可以去掉和锁重复的描述，其余保持。锁本身不建议删减，它是跨镜一致的关键。')],['解释每条锁的作用',()=>agentSay(c.locks.map(l=>`${lockName(c,l)}：${l.t}`).join('\n'))]];
}
function renderSugs(){const s=sugs();$('#aSugs').innerHTML=s.map(([t],i)=>`<button class="${i===0?'pri':''}" data-s="${i}">${esc(t)}</button>`).join('');$$('#aSugs [data-s]').forEach(b=>b.onclick=()=>{post({r:'me',t:s[+b.dataset.s][0]});s[+b.dataset.s][1]()})}
async function task(fn){busy=true;renderSugs();try{await fn()}finally{busy=false;renderAll()}}
const later=k=>stepsOf(C()).slice(stepsOf(C()).findIndex(s=>s.k===k)+1);

// ---------- 操作 ----------
function reroll(k,first){return task(async()=>{
  const c=C(),codes=c.locks.map(l=>l.c),n=4;c.takes[k]=c.takes[k]||[];
  const base=c.takes[k].length,news=Array.from({length:n},(_,i)=>({seed:base+i+1,d:[],gen:true,isNew:true}));
  c.takes[k].forEach(t=>t.isNew=false);c.takes[k].push(...news);if(first){c.pick[k]=base;c.hist[k]=[{t:base,n:'初版'}];c.steps[k]=stepOf(k).review?'review':'draft'}
  S.view[c.id+k]=base;renderAll();await wait(1100);
  // 演示：4 张里常有 1~2 张违反某条锁（场景最常见的是老灯入画）
  const risky=S.kind==='scene'?'LAMP':codes[Math.min(3,codes.length-1)];
  news.forEach((t,i)=>{t.gen=false;if(i===2)t.d=[risky];if(i===3&&codes.length>2)t.d=[codes[1]]});
  S.spent+=PRICE_IMG*n;
  const bad=news.filter(t=>t.d.length);
  card(`${k} ${stepOf(k).n}：抽了 ${n} 张`,[`推荐候选 ${base+1}：对照 ${codes.length} 条锁全部符合`,...bad.map(t=>`候选 ${c.takes[k].indexOf(t)+1} 违反 ${t.d.map(d=>lockName(c,c.locks.find(l=>l.c===d))).join('、')}，不建议选`)],
    [[`选用候选 ${base+1}`,()=>choose(k,base)]]);
})}
function choose(k,i){
  const c=C();c.pick[k]=i;c.hist[k].push({t:i,n:c.takes[k][i].fix||`选用候选 ${i+1}`});
  if(stepOf(k).review)c.steps[k]='review';else if(c.steps[k]==='stale')c.steps[k]='draft';
  const down=later(k).filter(s=>c.steps[s.k]!=='none');down.forEach(s=>c.steps[s.k]='stale');
  delete S.view[c.id+k];
  post({r:'sys',t:`已选用 ${k} 候选 ${i+1}${down.length?`，后面的 ${down.map(s=>s.k).join('、')} 标为待更新`:''}`});renderAll();
}
function approve(k){const c=C();c.steps[k]='approved';const nx=later(k)[0];
  card(`${k} ${stepOf(k).n} 已批准`,[`后面的产物都会以它为参考`,nx?`下一步：${nx.k} ${nx.n}（${ST[c.steps[nx.k]]}）`:'产物链已全部完成'],nx?[[`去 ${nx.k} ${nx.n}`,()=>{S.step=nx.k;renderAll()}]]:null);renderAll()}
function reject(k){C().steps[k]='draft';renderAll();agentSay(`好，${k} 退回。可以在图上圈出问题，或直接说要改什么，我出新的候选。`)}
function regenStale(){return task(async()=>{
  const c=C(),ks=stepsOf(c).filter(s=>c.steps[s.k]==='stale').map(s=>s.k);if(!ks.length)return;
  card(`按新设定重出 ${ks.join('、')}`,[`每一步各出 1 张，沿用原来的版式和参考图`]);
  for(const k of ks){const t={seed:(c.takes[k]||[]).length+1,d:[],gen:true,isNew:true,fix:'按新设定重出'};c.takes[k]=c.takes[k]||[];c.takes[k].push(t);S.step=k;renderAll();await wait(700);t.gen=false;S.spent+=PRICE_IMG;
    c.pick[k]=c.takes[k].length-1;c.hist[k]=c.hist[k]||[];c.hist[k].push({t:c.pick[k],n:'按新设定重出'});c.steps[k]=stepOf(k).review?'review':'draft'}
  post({r:'sys',t:`${ks.join('、')} 已更新${ks.some(k=>stepOf(k).review)?'，人审的步骤需要重新批准':''}`});
})}
function lockChanged(c,i,v){
  c.locks[i].t=v;const first=stepsOf(c)[0].k,ks=stepsOf(c).filter(s=>s.k!==first&&c.steps[s.k]!=='none');ks.forEach(s=>c.steps[s.k]='stale');renderAll();
  card(`${lockName(c,c.locks[i])} 已更新`,[`用到这条锁的 ${ks.length} 张资产板标为待更新：${ks.map(s=>s.k).join('、')||'无'}`,`这是永久锁：${STORE.usage(c.id).join('、')} 里出过的图都要按新锁重新检查`,`${first} 是源头图，没有自动改；锁和源头图对不上时，先改源头（参考图里有的东西文字改不掉）`],[['现在按新锁重出',regenStale],['先不重出',()=>{}]]);
}
const LOCK_SUGGEST={weng:['TRACK','两条短履带为深灰色橡胶，每侧三个银色负重轮'],rong:['TAIL','小尾巴尾尖为浅黄色光点，其余与身体同色'],reflector:['TRIPOD','三脚支架的三根管子长短不一，其中一根缠着黑色胶带'],
  parachute:['BUCKLE','底部金属扣是一个长方形旧皮带扣'],panel:['TAPE','右侧米色胶带长约 6 厘米，边缘翘起'],beam:['HEAT','热浪扭曲只在光斑周围一拳范围内'],fire:['SPREAD','火苗不蔓延，只在光斑落点一处'],crash:['TRENCH','冲击沟从南边远处延伸过来，尽头是残骸前端']};
function suggestLock(inline){
  const c=C(),s=LOCK_SUGGEST[c.id]||['EXTRA','（从源头图里找到的稳定特征）'];
  if(inline){post({r:'me',t:'✨ 从源头图里再找一条锁'});S.lockSug=s;renderAll();return card('建议补一条锁（在锁列表里加入）',[`LOCK-${c.code}-${s[0]}：${s[1]}`])}
  card('建议补一条锁',[`LOCK-${c.code}-${s[0]}：${s[1]}`,'来源：源头图里稳定出现、但现有锁没覆盖的特征'],[['加入锁',()=>{c.locks.push({c:s[0],t:s[1]});S.tab='locks';renderAll()}],['不需要',()=>{}]]);
}
function checkTake(){const c=C(),k=S.step,t=(c.takes[k]||[])[S.view[c.id+k]??c.pick[k]];if(!t)return agentSay('这一步还没有图。');
  card(`对照锁检查 ${k} 候选 ${c.takes[k].indexOf(t)+1}`,[...c.locks.map(l=>`${(t.d||[]).includes(l.c)?'⚠':'✓'} ${lockName(c,l)}`),...(t.d||[]).filter(d=>DEF[d]).map(d=>`⚠ ${DEF[d]}`)],(t.d||[]).length?[['让我修掉这些偏离',()=>fix(`修正 ${t.d.map(d=>defLabel(c,d)).join('、')}`)]]:null)}
function runCheck(){return task(async()=>{
  const c=C(),seed=K().checks[c.id]||{};S.checks[c.id]={};S.tab='appear';S.cell=null;
  for(const sh of Object.keys(c.shots)){S.checks[c.id][sh]={};c.locks.forEach(l=>{const v=(seed[sh]||{})[l.c];S.checks[c.id][sh][l.c]=v?{r:v[0],why:v[1]}:{r:'✅',why:''}});renderAll();await wait(140)}
  const R=Object.entries(S.checks[c.id]).flatMap(([sh,r])=>Object.entries(r).map(([cc,v])=>[sh,cc,v])),bad=R.filter(x=>x[2].r==='⚠'),unk=R.filter(x=>x[2].r==='?');
  card(`出镜检查完成：${Object.keys(c.shots).length} 镜 × ${c.locks.length} 条锁`,[`⚠ ${bad.length} 处偏离${bad.map(x=>`：${x[0]} ${x[1]}（${x[2].why}）`).join('')}`,`? ${unk.length} 处被遮挡、太远或本来就不入画（不算偏离）`,`一致性 ${score(c)??'—'}%`],
    bad.length?[[`把偏离交给视频 Agent 修补`,()=>handoff(bad.map(x=>[x[0],x[1]]))],['先不处理',()=>{}]]:null);
})}
const refFor=(c,sh)=>S.kind==='char'?'C3 单视图':S.kind==='prop'?`${stepsOf(c)[0].k} 定稿图`:`${PLATES.find(p=>p.k===SHOTS[sh][1]).step} 空镜`;
function handoff(list){return task(async()=>{
  const c=C();list.forEach(([sh,cc])=>S.checks[c.id][sh][cc]={r:'fixing',why:'视频 Agent 修补中'});renderAll();
  card(`已交给视频 Agent（edit 模式）`,list.map(([sh,cc])=>`${sh}：恢复 ${lockName(c,c.locks.find(l=>l.c===cc))}，参考 ${refFor(c,sh)}`),null);
  await wait(1500);list.forEach(([sh,cc])=>S.checks[c.id][sh][cc]={r:'✅',why:'已修补'});S.spent+=3*list.length;S.cell=null;
  post({r:'sys',t:`视频 Agent 修补完成 ${list.length} 处，已回写画布（${list.map(x=>x[0]).join('、')} 出了新版本）`});
})}
// 场景：把"不出现太阳圆盘"写进机位、光线、排除三处，重出侧向和反打
function fixLamp(){S.tab='sheets';const c=C();['S1r','S1s'].forEach(k=>{if(c.steps[k]!=='none')c.steps[k]='stale'});renderAll();
  card('已在 S1r、S1s 的机位、光线、排除三处都写入"不出现太阳圆盘"',['两张空镜标为待更新','重出后再做一次出镜检查，确认 SH05、SH09 的老灯问题'],[['现在重出',regenStale]])}
// 圈选或文字修改：在当前资产板上出 2 张修正候选
function fix(text){return task(async()=>{
  const c=C(),k=S.step,regions=S.ann.length;if(!(c.takes[k]||[]).length){await agentSay('这一步还没有图，先生成。');return}
  const label=regions?`修复${'①②③④⑤'.slice(0,regions)}`:'按意见修改';
  const news=[0,1].map(i=>({seed:c.takes[k].length+i+1,d:[],gen:true,isNew:true,fix:label}));c.takes[k].forEach(t=>t.isNew=false);c.takes[k].push(...news);
  S.view[c.id+k]=c.takes[k].length-2;S.ann=[];S.annMode=false;renderAll();await wait(1000);news.forEach(t=>t.gen=false);S.spent+=PRICE_IMG*2;
  card(`${k} ${stepOf(k).n}：按「${text}」出了 2 张`,[regions?`只改了圈出的 ${regions} 个区域，其他部分保持不变（局部重绘）`:'整张重出，身份和版式沿用选用版',`两张都对照过 ${c.locks.length} 条锁`],[[`选用候选 ${c.takes[k].length-1}`,()=>choose(k,c.takes[k].length-2)],['都不满意，再来',()=>fix(text)]]);
})}
function agentNewLook(){const c=C();card(`给${c.name}加一套新造型？`,['新造型只改服装 / 状态，身份类的锁（脸、配色、标志物）保持不变','会从 C1 定妆开始单独走一遍产物链'],[['加「受伤」造型',()=>{c.looks.push({id:'hurt',n:'受伤',note:'外壳有新划痕，一侧履带脱落'});S.look='hurt';renderAll()}],['先不加',()=>{}]])}
// 就地 AI：调用和结果记进这个 Agent 的对话，但不弹浮窗；新候选直接出现在资产板右边
function aiAsset(a,q){const c=C(),k=S.step,t=(c.takes[k]||[])[S.view[c.id+k]??c.pick[k]];
  if(a==='annon'){S.annMode=true;renderAll();return toast('在图上拖出要改的区域，可以圈多处')}
  const N={reroll:'再抽 4 张',fixd:`按锁修正（${((t&&t.d)||[]).map(x=>defLabel(c,x)).join('、')}）`,ann:`只改圈出的 ${S.ann.length} 处`,check:'对照锁检查',free:`"${q}"`}[a];
  return DOCK.inline(async()=>{post({r:'me',t:`✨ ${k}：${N}`});
    if(a==='reroll')return reroll(k);if(a==='check')return checkTake();
    if(a==='fixd')return fix(`修正 ${t.d.map(x=>defLabel(c,x)).join('、')}`);
    return fix(a==='ann'?(q||'修改圈出的区域'):q)})}
// ---------- 输入 ----------
function send(){
  const v=$('#aIn').value.trim();if(!v)return;$('#aIn').value='';post({r:'me',t:v+(S.ann.length?`（圈选 ${S.ann.length} 处）`:'')});
  if(/批准|通过/.test(v))return approve(S.step);
  if(/再抽|重抽|抽卡/.test(v))return reroll(S.step);
  if(/出镜|全部检查/.test(v))return runCheck();
  if(/锁/.test(v)&&/补|加|找/.test(v))return suggestLock();
  if(/老灯|太阳/.test(v)&&S.kind==='scene')return fixLamp();
  if(/检查|核对/.test(v))return checkTake();
  if(/修补|交给视频/.test(v)&&S.cell)return handoff([[S.cell.sh,S.cell.c]]);
  return fix(v);
}
$('#aSend').onclick=()=>send();
$('#aIn').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};
$('#aAttach').onclick=()=>$('#aFile').click();
$('#aFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const c=C(),k=stepsOf(c)[0].k;c.takes[k]=c.takes[k]||[];c.takes[k].push({seed:99,d:[],img:r.result,isNew:true,fix:'上传的参考'});S.tab='sheets';S.step=k;S.view[c.id+k]=c.takes[k].length-1;
  post({r:'me',t:'（上传了一张参考图）'});card(`已把参考图放进 ${k} ${stepOf(k).n}候选`,['参考图只管外形和身份；选用后，后面的产物会标为待更新','需要的话我可以以它为源头，按版式重出一张'],[['选用这张参考图',()=>choose(k,c.takes[k].length-1)],['以它为参考重出',()=>fix('以上传的参考图为源头')]]);renderAll()};r.readAsDataURL(f);e.target.value=''};
renderAll();renderMsgs();
