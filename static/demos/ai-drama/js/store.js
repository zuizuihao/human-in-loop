/* 当前项目的共享状态。初始值来自项目文件（js/project/loader.js 读出来的 PROJECT），所有页面读写同一份 localStorage 工作区；
   保存时 toFiles() 把状态投影回项目文件（js/project/fs.js 写回文件夹），项目文件才是唯一真源。
   分两层：
   - 系列层 D.series：资产库（产物链状态、候选）、资产库的花费、大纲修改。做一次，跨集复用
   - 单集层 D.eps[EPxx]：剧本、故事板 / 视频状态、镜头改动、审批门、本集花费
   作品永远是"集的列表"：单集作品就是只有 1 集，STORE.single() 为真时，界面收起系列层（没有总览和集切换器，主页直接进这一集）。
   - 台词只存在剧本里：镜头的声音由 lineOf() 从剧本推出来，分镜不再抄一份
   - 待更新按改动类型细分：改台词 → 该段视频重出；改动作 / 场景 → 该段镜头表要改（stale.shot），镜头表改完 → 故事板和视频重出
   - 当前集：URL 的 ?e=EPxx，没有就用上次打开的
   - 目前只有 EP01 做到了分镜以后的阶段；其他集只有大纲，可以让剧本 Agent 写初稿
   - 加载顺序：js/project/loader.js 之后，页面脚本之前 */
const STORE=(()=>{
  // 工作区按项目分开；打开本地文件夹时 fs.js 会清掉对应的工作区，从文件重新开始
  const KEY=`aigc-v3:${PROJECT.local?'local:':''}${PROJECT.id}`,clone=o=>JSON.parse(JSON.stringify(o));
  let D;try{D=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){D={}}
  D.series=D.series||{assets:{},spent:0};D.eps=D.eps||{};
  const EPS=PROJECT.EPS.length?PROJECT.EPS:['EP01'],SEGS=EP.segments.map(g=>g.id);
  const q=new URLSearchParams(location.search).get('e');
  let ep=EPS.includes(q)?q:EPS.includes(D.cur)?D.cur:EPS[0];D.cur=ep;
  const persist=()=>localStorage.setItem(KEY,JSON.stringify(D));persist();
  // 每集的初始状态来自项目文件：storyboard.yaml（故事板、画面参考方式、待更新）、takes.yaml、gates.yaml、ledger.jsonl；没建分镜的集这些键是空的
  const DEF=e=>PROJECT.episode(e);
  // 画面参考（分镜阶段的一部分）：默认每段出一张故事板；简单的段可以不出图。全程 AI 出图。单价是这一段的出图费
  // 一段只有一镜时，故事板只有一格，视频 Agent 会直接拿它当首帧（图生视频），不用人选
  const REF={board:{n:'故事板',d:'一段一张 2×2 / 3×3，各格对应段内各镜，作为这段视频的分镜参考；一次生成多镜时最能保住顺序和构图',c:.8},
    none:{n:'不出图',d:'只用资产参考图 + 镜头表时间轴直接出视频。最省，适合口播、动作简单的段；构图交给模型，靠样片把关',c:0}};
  // 以前存过的方式（线稿、首帧）已经去掉：读到不认识的方式一律回到故事板，免得顶栏等页面渲染时报错
  Object.values(D.eps).forEach(x=>{if(x.refMode)Object.keys(x.refMode).forEach(k=>{if(!REF[x.refMode[k]])x.refMode[k]='board'})});persist();
  const E=e=>{const x=D.eps[e]=D.eps[e]||{};return x};
  const getE=(e,k)=>{const x=E(e);return x[k]!==undefined?x[k]:(x[k]=clone(DEF(e)[k]))};
  const save=()=>{persist();dispatchEvent(new Event('store'))};
  addEventListener('storage',e=>{if(e.key===KEY){try{D=JSON.parse(e.newValue)||{}}catch(x){D={}}dispatchEvent(new Event('store'))}});
  // 出镜问题：资产工作室的出镜检查（src 指出是哪个 Agent 发现的）+ 分镜 Agent 自己的检查，来自 review.yaml
  const ISSUES=PROJECT.issues();
  const segOfShot=sh=>EP.segments.find(g=>g.shots.some(s=>s.id===sh)).id;
  // ---------- 剧本（每集一份） ----------
  function script(id=ep){const x=E(id);
    if(!x.script){const s=PROJECT.script(id);if(s)x.script=s}
    return x.script||null}
  const LINE={line:'',sfx:'（音效）',vo:'（画外音）'};
  function lineOf(sh){const s=script('EP01');if(!s)return EP.segments.flatMap(g=>g.shots).find(x=>x.id===sh).line;
    return s.blocks.filter(b=>b.sh===sh&&b.t in LINE).map(b=>LINE[b.t]+b.x).join(' ')}
  const lineBlock=sh=>{const s=script('EP01');return s&&(s.blocks.find(b=>b.sh===sh&&b.t in LINE)||{}).id};
  // 剧本里改了一条：台词 → 视频重出；动作 / 场景 → 镜头表要改。只有已经拆过镜头的集才有下游
  function scriptChanged(b,id=ep){const g=b.seg;
    if(b.t in LINE){const v=getE(id,'video')[g];if(v&&v.vers.length)v.st='stale'}
    else{const s=getE(id,'stale');if(!s.shot.includes(g))s.shot.push(g)}
    save()}
  // ---------- 资产库（系列层）：每个资产在哪些集里用到 ----------
  const ITEMS=()=>typeof CHARS==='undefined'?[]:[...CHARS.map(c=>['char',c]),...PROPS.map(c=>['prop',c]),...SCENES.map(c=>['scene',c])];
  const STEPN=k=>({char:STEPS_CHAR,prop:STEPS_PROP,scene:STEPS_SCENE})[k];
  const stepsOf=(k,c)=>STEPN(k).filter(s=>!c.only||c.only.includes(s.k));
  const usage=id=>typeof USAGE==='undefined'||USAGE[id]==='*'||!USAGE[id]?EPS.slice():USAGE[id];
  const usedIn=(id,e=ep)=>usage(id).includes(e);
  ITEMS().forEach(([,c])=>{const o=D.series.assets[c.id];if(o)Object.assign(c,clone(o))});
  // 真图（media.yaml）每次重新挂：本地项目的 blob 地址只在这次打开有效，不存进工作区
  PROJECT.attachMedia(ITEMS().map(([,c])=>c));
  const noImg=T=>Object.fromEntries(Object.entries(T).map(([k,ts])=>[k,ts.map(({img,...t})=>t)]));
  function saveAssets(){ITEMS().forEach(([,c])=>D.series.assets[c.id]=clone({steps:c.steps,pick:c.pick,takes:noImg(c.takes)}));save()}
  // 大纲里提到、但库里还没有的资产（热泉蟹、热泉谷……）
  const pending=e=>{const o=typeof OUTLINE!=='undefined'&&OUTLINE.find(x=>x.id===e);return o&&o.newAssets||[]};
  const pendingAll=()=>EPS.flatMap(e=>pending(e).map(([k,n])=>({ep:e,k,n})));
  // ---------- 各阶段进度（阶段条、总览矩阵）与要人处理的事（待你处理） ----------
  const openBad=()=>{const V=getE('EP01','video');return ISSUES.filter(i=>{const v=V[segOfShot(i.sh)];return i.lv==='bad'&&v.vers.length&&!v.vers[v.pick].fixed.includes(i.sh+i.lock)})};
  const link={script:e=>`script.html?e=${e}`,asset:e=>`asset.html?k=char&e=${e}`,shot:e=>`episode.html?m=shot&e=${e}`,board:e=>`episode.html?m=board&e=${e}`,video:e=>`episode.html?m=video&e=${e}`};
  const NAME={script:'剧本',asset:'资产',shot:'分镜',video:'视频'};
  // 阶段顺序：剧本 G1 → 资产 G2 → 分镜 G3（镜头表 + 画面参考）→ 视频（样片 G4 → 正片 → 成片 G5）。资产在分镜前：分镜直接选用资产库里已有的东西，机位需求再回头向场景 Agent 要
  function stages(e=ep){
    const sc=script(e),rv=sc?sc.segs.filter(g=>g.st!=='approved').length:0,n=(k,s,st,extra)=>({k,n:NAME[k],href:(link[k]||link.video)(e),st,s,ok:false,...extra});
    const S1=sc?(rv?n('script','待审 '+rv,'review',{tip:`${e} 剧本 v${sc.ver}；${rv} 段改动待人审`}):n('script','✓','done',{ok:true,tip:`${e} 剧本 v${sc.ver}；全部段落已批准`})):n('script','—','none',{tip:'还只有大纲，可以让剧本 Agent 写初稿'});
    S1.gate='G1';
    if(e!=='EP01'){
      const np=pending(e).length,rest=['shot','video'].map(k=>n(k,'—','none',{tip:'前面的阶段还没完成'}));
      const A=n('asset',np?`新增 ${np}`:'—','none',{gate:'G2',tip:np?`大纲里要用到 ${np} 个库里还没有的资产：${pending(e).map(x=>x[1]).join('、')}`:'库里的资产够用'});
      rest[0].gate='G3';rest[1].gate='G4';return[S1,A,...rest]}
    const B=getE(e,'board'),V=getE(e,'video'),G=getE(e,'gates'),stl=getE(e,'stale').shot,cnt=(o,f)=>SEGS.filter(id=>f(o[id])).length;
    const used=ITEMS().filter(([,c])=>usedIn(c.id,e)),steps=used.flatMap(([k,c])=>stepsOf(k,c).map(s=>c.steps[s.k]||'none'));
    const aRev=steps.filter(x=>x==='review').length,aStale=steps.filter(x=>x==='stale').length,aOk=used.filter(([k,c])=>stepsOf(k,c).every(s=>c.steps[s.k]==='approved')).length;
    const RM=getE(e,'refMode'),bSt=cnt(B,b=>b.st==='stale'),bOk=cnt(B,b=>b.st==='approved'),vHas=cnt(V,v=>v.vers.length),vStale=cnt(V,v=>v.st==='stale'),bad=openBad().length,fin=SEGS.every(id=>V[id].vers.length&&V[id].vers[V[id].pick].mode==='final');
    return[S1,
     n('asset',aStale?`⚠ ${aStale}`:aRev?`待审 ${aRev}`:`${aOk}/${used.length}`,aStale?'stale':aRev?'review':'done',{gate:'G2',ok:!aRev&&!aStale,tip:`本集用到 ${used.length} 个资产，产物链走完 ${aOk} 个；待人审 ${aRev} 步，待更新 ${aStale} 步`}),
     n('shot',stl.length?`⚠ ${stl.length}`:bSt?`⚠ ${bSt}`:bOk<SEGS.length?`待审 ${SEGS.length-bOk}`:'✓',stl.length||bSt?'stale':bOk<SEGS.length?'review':'done',{gate:'G3',ok:!stl.length&&bOk===SEGS.length,
       tip:`镜头表 12 镜${stl.length?`，${stl.join('、')} 要按新剧本更新`:'，和剧本一致'}；画面参考：${SEGS.map(id=>`${id} ${REF[RM[id]].n}`).join('、')}，已批准 ${bOk}/${SEGS.length}`}),
     // 视频一格管到成片：没过 G4 时显示样片进度和 G4；过了 G4 显示正片 / 成片和 G5
     n('video',vStale?`⚠ ${vStale}`:G.G5?'✓ 成片':fin?'正片':`样片 ${vHas}/${SEGS.length}`,vStale?'stale':G.G5?'done':'review',{gate:G.G4?'G5':'G4',ok:!!(G.G4&&G.G5),
       tip:`样片 ${vHas}/${SEGS.length} 段${bad?`，${bad} 处出镜偏离待修补`:''}${vStale?`，${vStale} 段待重出`:''}；G4 样片审批${G.G4?'已通过':'未通过'}；${fin?'正片已齐':'正片还没出齐'}；G5 交付${G.G5?'已确认':'未确认'}`})]}
  function inbox(e=ep){const out=[],sc=script(e);
    if(sc)sc.segs.filter(g=>g.st!=='approved').forEach(g=>out.push({ep:e,a:'✍️',t:`${e} 剧本 ${g.id} 改动待人审`,href:link.script(e)}));
    ITEMS().forEach(([k,c])=>{if(!usedIn(c.id,e))return;stepsOf(k,c).forEach(s=>{const st=c.steps[s.k];if(st==='review'||st==='stale')out.push({ep:e,a:{char:'🧑‍🎨',prop:'🧰',scene:'🏞️'}[k],t:`${c.name} ${s.k} ${s.n}${st==='review'?'待人审':'待更新'}`,href:`asset.html?k=${k}&id=${c.id}&e=${e}`})})});
    if(e!=='EP01')return out;
    const B=getE(e,'board'),V=getE(e,'video'),first=id=>EP.segments.find(g=>g.id===id).shots[0].id;
    getE(e,'stale').shot.forEach(id=>out.push({ep:e,a:'📋',t:`${id} 镜头表要按新剧本更新`,href:`${link.shot(e)}&s=${first(id)}`}));
    const RM=getE(e,'refMode');SEGS.forEach(id=>{const n=REF[RM[id]].n;if(B[id].st==='review')out.push({ep:e,a:'🖼️',t:`${id} 画面参考（${n}）待人审`,href:`${link.board(e)}&s=${first(id)}`});if(B[id].st==='stale')out.push({ep:e,a:'🖼️',t:`${id} 画面参考（${n}）要按新镜头表重出`,href:`${link.board(e)}&s=${first(id)}`})});
    SEGS.forEach(id=>{if(V[id].st==='stale')out.push({ep:e,a:'🎞️',t:`${id} 样片要重出（上游改了）`,href:`${link.video(e)}&s=${first(id)}`});else if(!V[id].vers.length)out.push({ep:e,a:'🎞️',t:`${id} 还没有样片（要确认费用）`,href:`${link.video(e)}&s=${first(id)}`})});
    const bad=openBad();if(bad.length)out.push({ep:e,a:'⚠️',t:`${bad.length} 处出镜偏离待修补`,href:`${link.video(e)}&s=${bad[0].sh}`});
    return out}
  // 整部作品所有集的待办（资产库的条目只出现一次）
  function inboxAll(){const seen=new Set();return EPS.flatMap(e=>inbox(e)).filter(x=>{const k=x.t+x.href.replace(/&e=EP\d+/,'');if(seen.has(k))return false;seen.add(k);return true})}
  const spentEp=e=>Object.values(getE(e,'spent')).reduce((a,b)=>a+b,0);
  // ---------- 保存：把状态投影回项目文件，只返回内容有变化的文件 {路径: 文本} ----------
  // 资产进度 → 设定卡的 pipeline；剧本 → script.yaml；故事板 / 画面参考 / 待更新 / 镜头改动 → storyboard.yaml；视频 → takes.yaml；审批 → gates.yaml；花费 → ledger.jsonl
  const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(x=>[x,v[x]])):v);
  const TAKE_KEYS=['seed','note','fix']; // 候选上的 gen / isNew / img 只在页面上用，不写进文件；seed 缺省是候选序号
  function toFiles(){const out={},put=(f,o)=>{if(canon(PROJECT.yaml(f))!==canon(o))out[f]=PROJECT.dump(f,o)},dir=PROJECT.epDir;
    ITEMS().forEach(([,c])=>{const f=PROJECT.cardFile(c.id);if(!f)return;const card=PROJECT.yaml(f),old=card.pipeline||{};
      card.pipeline=Object.fromEntries(Object.keys(c.steps).map(k=>{const p={status:c.steps[k]};if(c.pick[k]!==undefined)p.pick=c.pick[k];if((old[k]||{}).note)p.note=old[k].note;
        if(c.takes[k])p.takes=c.takes[k].map((t,i)=>({deviations:t.d||[],...Object.fromEntries(TAKE_KEYS.filter(x=>t[x]!==undefined&&!(x==='seed'&&t.seed===i)).map(x=>[x,t[x]]))}));return[k,p]}));
      put(f,card)});
    EPS.forEach(e=>{const x=D.eps[e];if(!x)return;
      if(x.script){const s=x.script,f=dir(e)+'script.yaml',old=PROJECT.yaml(f)||{},o={episode:e,version:s.ver,history:s.hist.map(h=>({version:h.v,note:h.n})),broken_down:!!s.board,
          segments:s.segs.map(g=>({id:g.id,title:g.title,status:g.st,...(s.board?{}:{shots:g.shots.map(h=>({id:h.id,beat:h.beat,duration_s:h.d}))})}))};
        ['beats_cut','pending_entities'].forEach(k=>{if(old[k])o[k]=old[k]});
        o.blocks=s.blocks.map(b=>{const r={id:b.id,seg:b.seg};if(b.sh)r.shot=b.sh;r.type=b.t;['who','how','tag'].forEach(k=>{if(b[k]!==undefined)r[k]=b[k]});r.text=b.x;return r});
        put(f,o)}
      const sf=dir(e)+'storyboard.yaml',sb=PROJECT.yaml(sf);if(!sb)return;
      const B=getE(e,'board'),RM=getE(e,'refMode'),st=getE(e,'stale').shot,SH=getE(e,'shots'),V=getE(e,'video');
      sb.segments.forEach(g=>{if(RM[g.id])g.ref_mode=RM[g.id];if(B[g.id])g.board={status:B[g.id].st,version:B[g.id].v};g.shot_status=st.includes(g.id)?'stale':'ok';
        g.shots.forEach(h=>{const{line,...ed}=SH[h.id]||{};Object.assign(h,ed)})}); // 声音只存在剧本里
      put(sf,sb);
      put(dir(e)+'takes.yaml',{segments:Object.fromEntries(Object.entries(V).map(([id,v])=>[id,{status:v.st,pick:v.pick,versions:v.vers.map(r=>({name:r.n,mode:r.mode,fixed:r.fixed||[]}))}]))});
      put(dir(e)+'gates.yaml',{gates:getE(e,'gates')});
      // 原型的花费是模拟的，只按页面记汇总；正式版由 CLI 每次调用追加一行
      const lf=dir(e)+'ledger.jsonl',L=Object.entries(getE(e,'spent')).filter(([,c])=>c>0).map(([page,c])=>JSON.stringify({source:'prototype',page,cost:+c.toFixed(2)})+'\n').join('');
      if(L!==(PROJECT.file(lf)||''))out[lf]=L});
    return out}
  return{
    ISSUES,EPS,NAME,REF,link,
    get ep(){return ep},
    setEp(e){if(EPS.includes(e)){ep=e;D.cur=e;persist()}},
    // 作品只有 1 集：收起系列层
    single:()=>EPS.length<2,
    project:()=>({title:typeof SERIES!=='undefined'?SERIES.title:'未命名',eps:typeof OUTLINE!=='undefined'?OUTLINE.map(o=>({id:o.id,title:o.title})):[]}),
    get:k=>getE(ep,k),getE,series:()=>D.series,save,set(k,v){E(ep)[k]=v;save()},
    script,lineOf,lineBlock,scriptChanged,saveAssets,
    setScript(id,s){E(id).script=s;save()},
    stages,inbox,inboxAll,openBad,
    matrix:()=>EPS.map(e=>({id:e,title:(OUTLINE.find(o=>o.id===e)||{}).title,stages:stages(e),pending:pending(e).length,spent:spentEp(e)})),
    usage,usedIn,pending,pendingAll,
    spend(page,c){const s=getE(ep,'spent');s[page]=(s[page]||0)+c;save()},
    spentEp,spent:()=>D.series.spent+EPS.reduce((a,e)=>a+spentEp(e),0),
    toFiles,dirty:()=>Object.keys(toFiles()).length,
    // 演示包：回到初始状态；本地项目：放弃没保存的改动，回到文件里的样子
    reset(){localStorage.removeItem(KEY);location.reload()}};
})();
