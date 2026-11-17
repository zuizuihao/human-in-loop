/* 分镜 / 视频工作室的 Agent 与它执行的操作（全部模拟）。分镜页是分镜 Agent（镜头表 + 画面参考），审片室是视频 Agent */
const M=[];let busy=false;
const post=m=>(M.push(m),renderMsgs(),DOCK.notify(m),m);
async function say(t){const m=post({r:'ag',t:'…'});await wait(350);m.t=t;renderMsgs()}
const card=(b,lines,acts)=>post({r:'card',b,lines,acts});
function renderMsgs(){
  const el=$('#aMsgs'),hello={shot:'我负责分镜：镜头表（景别、运镜、动作、时长）和每段的故事板。改了哪一镜，我会把那一格和这段视频标为待更新；简单的段可以不出图。',
    video:'我负责按分镜直出带声音的视频：先出样片，过 G4 后出正片，过 G5 交付；穿帮用 edit 修补，接不上用 extend 续拍。'}[E.mode];
  el.innerHTML=M.length?M.map((m,i)=>m.r==='card'?`<div class="acard"><b>${esc(m.b)}</b>${m.lines&&m.lines.length?`<ul>${m.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:''}${m.acts?`<div class="acts">${m.acts.map((a,j)=>`<button class="btn ${j===0?'pri':''}" data-m="${i}" data-j="${j}">${esc(a[0])}</button>`).join('')}</div>`:m.done?`<div class="done">${esc(m.done)}</div>`:''}</div>`:`<div class="m ${m.r}">${esc(m.t)}</div>`).join(''):`<div class="m sys">${hello}</div>`;
  el.scrollTop=1e9;
  $$('#aMsgs [data-m]').forEach(b=>b.onclick=()=>{const m=M[+b.dataset.m],a=m.acts[+b.dataset.j];m.done='✓ '+a[0];m.acts=null;renderMsgs();a[1]()});
}
function renderCtx(){const s=shot(E.sel);$('#aCtx').innerHTML=`<span>EP0${EP.episode}</span><span>${s.seg} · ${s.id}</span>${issuesOf(s.id).length?`<span class="a">⚠ ${issuesOf(s.id).map(i=>i.lock).join('、')}</span>`:''}`}
function sugs(){
  if(busy)return[];const s=shot(E.sel),g=seg(s.seg),v=E.video[g.id],open=openIssues(s);
  const fs=shotStale(g.id)?[[`按新剧本更新 ${g.id}`,()=>fromScript(g.id)]]:[];
  if(E.mode==='shot')return[...fs,...(E.board[g.id].st==='review'?[[`批准 ${g.id}（G3）`,()=>approveBoard(g.id)]]:[]),...(E.board[g.id].st==='stale'&&E.ref[g.id]!=='none'?[[`按新镜头表重出 ${g.id} 画面参考`,()=>regenBoard(g.id)]]:[]),
    ['检查景别节奏',checkRhythm],['检查 180° 轴线和视线',checkAxis],['检查段间衔接',checkJoins],['画面参考对照资产',checkBoard],...(E.ref[g.id]!=='none'?[[`只重出 ${s.id} 这一格`,()=>rerollCell(s.id)]]:[])];
  const G=STORE.get('gates');
  return[...fs,...(!G.G4&&EP.segments.every(x=>E.video[x.id].vers.length)?[['批准样片（G4）',approveG4]]:[]),...(v.st==='stale'?[[`重出 ${g.id} 样片（上游改了）`,()=>regenVideo(g.id)]]:[]),...(!v.vers.length?[[`出 ${g.id} 样片`,()=>genVideo(g.id)]]:[]),...open.map(i=>[`修补 ${s.id} ${i.lock}`,()=>fixIssue(s.id,i.lock)]),...(v.vers.length?[[`${g.id} 续拍 3 秒`,()=>extend(g.id)]]:[]),['检查段间衔接',checkJoins],...(G.G4?[['出正片',goFinal]]:[])];
}
function renderSugs(){const s=sugs();$('#aSugs').innerHTML=s.map(([t],i)=>`<button class="${i===0?'pri':''}" data-s="${i}">${esc(t)}</button>`).join('');$$('#aSugs [data-s]').forEach(b=>b.onclick=()=>{post({r:'me',t:s[+b.dataset.s][0]});s[+b.dataset.s][1]()})}
async function task(fn){busy=true;renderSugs();try{await fn()}finally{busy=false;renderAll()}}
const openIssues=s=>{const v=E.video[s.seg],fx=v.vers.length?v.vers[v.pick].fixed:[];return issuesOf(s.id).filter(i=>i.lv==='bad'&&!fx.includes(i.sh+i.lock))};
const staleSeg=id=>{if(E.board[id].st!=='none')E.board[id].st='stale';if(E.video[id].vers.length)E.video[id].st='stale'};

// ---------- 分镜 ----------
function editShot(s,f,v){
  if(f==='duration_s'){const g=seg(s.seg),nd=segDur(g)-s.duration_s+v;if(nd<4||nd>30)return toast('每段 4–30 秒（Seedance 单次生成的范围）')}
  s[f]=v;(STORE.get('shots')[s.id]=STORE.get('shots')[s.id]||{})[f]=v;staleSeg(s.seg);renderAll();
  const t=`${s.id} 的${{framing:'景别',camera:'运镜',duration_s:'时长',keyframe:'关键帧',motion:'动作',line:'声音'}[f]}已改，${s.seg} 的故事板和视频标为待更新`;toast(t);post({r:'sys',t});
}
function checkRhythm(){const lines=EP.segments.map(g=>{const fr=g.shots.map(s=>s.framing),rep=fr.findIndex((x,i)=>i&&x===fr[i-1]);return `${g.id}：${fr.join(' → ')}${rep>0?`（第 ${rep}、${rep+1} 镜景别相同，可以拉开）`:' ✓'}`});
  card('景别节奏',[...lines,`全集 ${TOTAL()}s，每段 ${EP.segments.map(segDur).join(' / ')}s，都在 4–30s 内`])}
function checkAxis(){const i=ISSUES.find(x=>x.lock==='AXIS');E.sel=i.sh;renderAll();card('180° 轴线与视线',['SH01–SH04 主空镜 / 背景近景：面朝北，轴线一致 ✓','SH05–SH08 侧向：面朝东，嗡在画面左、反射板在右 ✓',`⚠ ${i.why}`,'SH10–SH12 回到侧向 / 主空镜 ✓'],[['在 SH09 关键帧里写明"绒绒看向画面左上方"',()=>editShot(shot('SH09'),'keyframe',shot('SH09').keyframe+'绒绒看向画面左上方（嗡所在的方向）。')]])}
function checkJoins(){card('段间衔接（分段生成后按顺序拼接，拼接时没法再调）',[`SEG1 → SEG2：${ISSUES.find(x=>x.lock==='JOIN').why}`,'SEG2 → SEG3：SH08 地面特写 → SH09 绒绒近景，同为特写 / 近景，衔接自然 ✓','建议：每段最后一镜停在能接下一段的画面上；需要时用 extend 续拍补过渡'],
  [['给 SH05 开头加 0.5 秒建立',()=>editShot(shot('SH05'),'motion','开头 0.5 秒先停在反射板全貌上，'+shot('SH05').motion)]])}
// ---------- 就地 AI（分镜表里每一镜、每一段直接调用，不经过右上角的 Agent；全部模拟） ----------
const TIGHT={全景:'中景',中景:'近景',近景:'特写',特写:'特写'},FR=['全景','中景','近景','特写'];
function aiPropose(s,k,n,q){const f={},line=s.line||'';
  if(k==='punch'){f.framing=n%2?s.framing:TIGHT[s.framing];if(s.camera==='static')f.camera='push_in';f.motion=s.motion.replace(/。?$/,'')+['，动作幅度更大，节奏更快。','，最后半秒定格在表情上。','，镜头跟着动作猛地推近。'][n%3];
    return{f,note:'景别收紧、加推镜，动作更夸张'+(n?`（第 ${n+1} 版）`:'')}}
  if(k==='frame'){const i=FR.indexOf(s.framing),nx=FR[(i+1+n)%4];f.framing=nx===s.framing?FR[(i+2)%4]:nx;return{f,note:`景别换成${f.framing}，和前后镜拉开`}}
  if(k==='simple'){const m=s.motion.split(/[；，]/)[0].replace(/。$/,'')+'。';if(m===s.motion)return{f:{},note:'这一镜已经只有一个主要动作'};f.motion=m;return{f,note:'每镜只留一个主要动作，视频模型才拍得准'}}
  if(k==='sync'){const t=Math.max(1,Math.ceil(speak(line)+.3));if(!line||t===s.duration_s)return{f:{},note:line?`台词约 ${speak(line).toFixed(1)}s，${s.duration_s}s 正好`:'这一镜没有台词'};f.duration_s=t;return{f,note:`台词约 ${speak(line).toFixed(1)}s，镜头改成 ${t}s`}}
  f.keyframe=s.keyframe.replace(/。?$/,'')+`；${q}。`;if(/快|紧|节奏/.test(q))f.duration_s=Math.max(1,s.duration_s-1);if(/近|特写|脸|表情/.test(q))f.framing=TIGHT[s.framing];
  return{f,note:`按"${q}"改了这一镜`}}
const AIN=k=>k==='free'?`"${E.ai.q}"`:(AI_CHIPS.find(c=>c[0]===k)||[,k])[1];
function aiRun(k){return DOCK.inline(async()=>{const s=shot(E.ai.sh);post({r:'me',t:`✨ ${s.id}：${AIN(k)}${E.ai.n?`（再来一版）`:''}`});
  if(k==='cell'){E.ai=null;return rerollCell(s.id)}
  E.ai.k=k;E.ai.busy=true;E.ai.prop=null;renderAll();await wait(650);
  const p=aiPropose(s,k,E.ai.n||0,E.ai.q);E.ai.busy=false;
  if(!Object.keys(p.f).length){E.ai=null;renderAll();toast(p.note);return post({r:'ag',t:`${s.id}：${p.note}，不用改。`})}
  E.ai.prop=p;renderAll();card(`${s.id} 改写候选（在分镜表里采用）`,[p.note,...Object.entries(p.f).map(([f,v])=>`${FN[f]}：${f==='camera'?CAM[s[f]]:s[f]} → ${f==='camera'?CAM[v]:v}`)])})}
function aiAdopt(){const s=shot(E.ai.sh),f=E.ai.prop.f;
  if(f.duration_s){const nd=segDur(seg(s.seg))-s.duration_s+f.duration_s;if(nd<4||nd>30)return toast('每段 4–30 秒（Seedance 单次生成的范围）')}
  Object.entries(f).forEach(([k,v])=>{s[k]=v;(STORE.get('shots')[s.id]=STORE.get('shots')[s.id]||{})[k]=v});E.ai=null;staleSeg(s.seg);renderAll();
  toast(`${s.id} 已改，${s.seg} 的故事板和视频标为待更新`);post({r:'sys',t:`${s.id} 采用了 AI 改写（${Object.keys(f).map(k=>FN[k]).join('、')}），${s.seg} 的故事板和视频标为待更新`})}
// 段检查：景别重复、台词塞不下、轴线和段间衔接（分镜自己发现的问题）
function segCheck(id,quiet){const g=seg(id),items=[];
  g.shots.forEach((s,i)=>{if(i&&s.framing===g.shots[i-1].framing)items.push({lv:'warn',t:`${g.shots[i-1].id} 和 ${s.id} 都是${s.framing}，景别没有变化`,fix:[`${s.id} 改成${TIGHT[s.framing]===s.framing?'近景':TIGHT[s.framing]}`,()=>editShot(s,'framing',TIGHT[s.framing]===s.framing?'近景':TIGHT[s.framing])]})});
  g.shots.forEach(s=>{if(!s.line)return;const t=speak(s.line);if(t>s.duration_s){const nd=Math.ceil(t+.3);items.push({lv:'warn',t:`${s.id} 台词要念 ${t.toFixed(1)}s，镜头只有 ${s.duration_s}s`,fix:segDur(g)-s.duration_s+nd<=30?[`${s.id} 加到 ${nd}s`,()=>editShot(s,'duration_s',nd)]:null})}});
  ISSUES.filter(i=>i.src==='shot'&&g.shots.some(s=>s.id===i.sh)).forEach(i=>items.push({lv:'warn',t:`${i.sh} ${i.lock}：${i.why}`,
    fix:i.lock==='AXIS'?['写明视线方向',()=>editShot(shot('SH09'),'keyframe',shot('SH09').keyframe.replace(/。?$/,'')+'；绒绒看向画面左上方（嗡所在的方向）。')]:i.lock==='JOIN'?['开头留 0.5 秒建立',()=>editShot(shot('SH05'),'motion','开头 0.5 秒先停在反射板全貌上，'+shot('SH05').motion)]:null}));
  // 已经按建议改过的不再提示
  const done=items.filter(x=>/AXIS/.test(x.t)&&/看向画面左上方/.test(shot('SH09').keyframe)||/JOIN/.test(x.t)&&/^开头 0.5 秒/.test(shot('SH05').motion));
  const list=items.filter(x=>!done.includes(x));if(!list.length)list.push({lv:'ok',t:`${id} 没发现问题：景别有变化，台词都塞得下`});
  if(quiet){E.chk[id]={items:list};return renderAll()}
  post({r:'me',t:`✨ 检查 ${id}`});E.chk[id]={busy:true};renderAll();
  setTimeout(()=>{E.chk[id]={items:list};renderAll();DOCK.inline(async()=>card(`${id} 检查结果（在分镜表里一键修）`,list.map(x=>`${x.lv==='ok'?'✓':'!'} ${x.t}`)))},500*(window.SPEED||1))}
// ---------- 画面参考（分镜阶段的一部分）：方式按段选 ----------
function setRef(id,k){if(E.ref[id]===k)return;const old=REF[E.ref[id]].n,R=REF[k],v=E.video[id];E.ref[id]=k;
  E.board[id]={st:k==='none'?'approved':'review',v:k==='none'?0:1};if(v.vers.length)v.st='stale';renderAll();
  card(`${id}：${old} → ${R.n}`,[R.d,k==='none'?'不出图就不用审，G3 只审镜头表':`出图约 ¥${R.c.toFixed(1)}，出完要人审`,v.vers.length?'这段已有的样片是按旧参考出的，标为待重出':'还没有样片，不影响别的']);
  if(k!=='none')regenBoard(id)}
// ---------- 故事板 ----------
function approveBoard(id){E.board[id].st='approved';renderAll();post({r:'sys',t:`${id} 分镜已批准（镜头表 + ${REF[E.ref[id]].n}），视频 Agent 会以它为参考${EP.segments.every(g=>E.board[g.id].st==='approved')?'；三段都过了，G3 通过':''}`})}
function regenBoard(id){return task(async()=>{const R=REF[E.ref[id]];if(E.ref[id]==='none')return;card(`出 ${id} ${R.n}`,[`${seg(id).shots.length>4?'3×3':seg(id).shots.length>1?'2×2':'单格'}版式，引用本段的角色 C3 单视图、道具定稿和对应空镜`,...(seg(id).shots.length===1?['这段只有一镜：这一格会直接当视频的首帧（图生视频）']:[])]);await wait(900);E.spent+=R.c;E.board[id].v++;E.board[id].st='review'})}
function rerollCell(id){return task(async()=>{const s=shot(id);card(`只重出 ${id} 这一格`,['其他三格保持不变（局部重绘）','重出后整张故事板需要重新人审']);await wait(800);E.spent+=.2;E.board[s.seg].v++;E.board[s.seg].st='review'})}
function checkBoard(){const g=seg(shot(E.sel).seg),is=g.shots.flatMap(s=>issuesOf(s.id).filter(i=>i.src!=='shot'));
  card(`${g.id} 故事板对照资产`,is.length?is.map(i=>`⚠ ${i.sh} ${i.lock}（${SRC[i.src][1]} 发现）：${i.why}`):['✓ 和资产卡一致'],is.length?[['重出有问题的格子',async()=>{for(const sh of [...new Set(is.map(i=>i.sh))])await rerollCell(sh)}]]:null)}
// ---------- 视频 ----------
function genVideo(id){return task(async()=>{const g=seg(id),c=6*segDur(g)/10;
  if(E.board[id].st!=='approved'){card(`${id} 的画面参考还没批准`,['先在分镜里批准这段的画面参考（或者改成"不出图"）'],[['去分镜',()=>location.search=`?m=shot&e=EP01&s=${seg(id).shots[0].id}`]]);return}
  card(`出 ${id} 样片 · ¥${c.toFixed(1)}`,['参考：本段故事板 + 角色 C3 单视图 + 道具定稿 + 对应空镜','声音直出：对白、音效、画外音按时间轴写进提示词，不要背景音乐']);await wait(1400);E.spent+=c;
  E.video[id]={st:'draft',vers:[{n:'样片 v1',mode:'draft',fixed:[]}],pick:0};post({r:'sys',t:`${id} 样片完成`})})}
// 剧本改了动作：按新剧本改这一段的关键帧，然后故事板和视频标为待更新
function fromScript(id){return task(async()=>{const S=STORE.script(),ch=S.blocks.filter(b=>b.seg===id&&!/^(line|sfx|vo)$/.test(b.t)&&b.x!==b.o);
  card(`按新剧本更新 ${id} 镜头表`,[...ch.map(b=>`${b.sh} ← ${b.id}：${b.x}`),'只改关键帧和动作；台词本来就从剧本读，不用改','改完后这段的故事板和视频标为待更新']);await wait(900);
  ch.forEach(b=>{const s=shot(b.sh);if(s.keyframe!==b.x){s.keyframe=b.x;(STORE.get('shots')[s.id]=STORE.get('shots')[s.id]||{}).keyframe=b.x}});
  const L=STORE.get('stale').shot;L.splice(L.indexOf(id),1);staleSeg(id);post({r:'sys',t:`${id} 镜头表已按剧本 v${S.ver} 更新`})})}
function regenVideo(id){return task(async()=>{const g=seg(id),v=E.video[id],c=6*segDur(g)/10;
  if(E.board[id].st!=='approved'){card(`${id} 的画面参考还没批准`,['先在分镜里重出并批准这段的画面参考（或者改成"不出图"）'],[['去分镜',()=>location.search=`?m=shot&e=EP01&s=${g.shots[0].id}`]]);return}
  card(`重出 ${id} 样片 · ¥${c.toFixed(1)}`,['上游改了：按当前的剧本台词和故事板重出','之前修补过的问题要重新检查']);await wait(1400);E.spent+=c;
  v.vers.push({n:`样片 v${v.vers.length+1}`,mode:'draft',fixed:[]});v.pick=v.vers.length-1;v.st='draft';post({r:'sys',t:`${id} 样片重出完成`})})}
function fixIssue(sh,lock){return task(async()=>{const s=shot(sh),v=E.video[s.seg],cur=v.vers[v.pick],i=issuesOf(sh).find(x=>x.lock===lock);
  card(`修补 ${sh} ${lock}（edit 模式）`,[`问题：${i.why}`,`参考：${{char:'角色 C3 单视图',prop:'道具定稿图',scene:'对应机位的空镜（并写明不出现太阳圆盘）'}[i.src]}`,'只重画这一镜的问题区域，其余画面和声音不动']);await wait(1200);E.spent+=3;
  v.vers.push({n:`${cur.mode==='final'?'正片':'样片'} v${v.vers.length+1}（修 ${sh}）`,mode:cur.mode,fixed:[...cur.fixed,sh+lock],extra:cur.extra||0});v.pick=v.vers.length-1;
  post({r:'sys',t:`${sh} ${lock} 已修补，${s.seg} 出了新版本；资产工作室的出镜检查会同步更新`})})}
function extend(id){return task(async()=>{const v=E.video[id],cur=v.vers[v.pick];card(`${id} 续拍 3 秒（extend 模式）`,['接在本段末帧之后继续拍，用来补段落之间的过渡','续拍后本段变长，全集时长会超出 30 秒，需要在分镜里压缩别的镜头']);await wait(1200);E.spent+=1.8;
  v.vers.push({...cur,n:`${cur.n.split('（')[0]}+3s`,extra:(cur.extra||0)+3,fixed:[...cur.fixed]});v.pick=v.vers.length-1})}
// ---------- 审批：G4 样片 → 正片 → G5 交付 ----------
function approveG4(){const miss=EP.segments.filter(g=>!E.video[g.id].vers.length),open=ALL.filter(s=>openIssues(s).length);
  if(miss.length)return card('还不能过 G4',[`${miss.map(g=>g.id).join('、')} 还没有样片`]);
  const ok=()=>{STORE.get('gates').G4=true;renderAll();post({r:'sys',t:'G4 样片审批通过，可以出正片了'})};
  if(open.length)return card('还有没修补的问题，仍然批准样片？',[`${open.length} 镜有问题：${open.map(s=>s.id).join('、')}`,'正片按选中的样片版本出，问题会带进正片；正片里再修更贵（edit 按正片价）'],[['先修问题',()=>pick(open[0].id)],['仍然批准',ok]]);
  ok()}
function confirmG5(){STORE.get('gates').G5=true;renderAll();post({r:'sys',t:'G5 交付确认：导演按段顺序拼接成片（不加字幕和配乐）'})}
function goFinal(){if(!STORE.get('gates').G4)return card('先过 G4 样片审批',['没有样片批准不出正片'],[['批准样片',approveG4]]);const ready=EP.segments.filter(g=>E.video[g.id].vers.length),c=ready.reduce((a,g)=>a+18*segDur(g)/10,0),open=ALL.filter(s=>openIssues(s).length);
  if(ready.length<EP.segments.length)return card('还不能出正片',[`${EP.segments.filter(g=>!E.video[g.id].vers.length).map(g=>g.id).join('、')} 还没有样片`,'没有样片批准不出正片'],null);
  card(`出正片 · ¥${c.toFixed(1)}`,[`${ready.length} 段，按已选版本的样片出 1080p`,open.length?`⚠ 还有 ${open.length} 镜有未修补的问题：${open.map(s=>s.id).join('、')}，建议先修`:'所有问题都已修补 ✓'],
   [['确认出正片',()=>task(async()=>{await wait(1600);E.spent+=c;ready.forEach(g=>{const v=E.video[g.id],cur=v.vers[v.pick];v.vers.push({...cur,n:'正片',mode:'final'});v.pick=v.vers.length-1;v.st='draft'});post({r:'sys',t:'正片完成，导演会按段顺序拼接成片（不加字幕和配乐）'})})],['先修问题',()=>{const s=open[0];if(s)pick(s.id)}]])}
function send(){const v=$('#aIn').value.trim();if(!v)return;$('#aIn').value='';post({r:'me',t:v});if(NOEP)return say(`${STORE.ep} 还没有镜头表，先过剧本和资产。`);const s=shot(E.sel);
  if(/节奏|景别/.test(v))return checkRhythm();if(/轴线|视线/.test(v))return checkAxis();if(/衔接|接/.test(v))return checkJoins();
  if(/正片/.test(v))return goFinal();if(/续拍|延长/.test(v))return extend(s.seg);if(/修补|修/.test(v)&&openIssues(s)[0])return fixIssue(s.id,openIssues(s)[0].lock);
  return editShot(s,'motion',s.motion+'（'+v+'）');
}
$('#aSend').onclick=send;$('#aIn').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};
renderAll();renderMsgs();
