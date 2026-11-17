/* 项目加载器：把项目文件夹（格式见 docs/design/project-format.md）转成原型各页面用的全局变量，所有页面在 store.js 之前同步加载。
   文件从哪来：
   - 打开过的本地项目：fs.js 把它的文本文件缓存在 localStorage（OPEN_KEY），刷新时直接读，图片和视频用文件夹句柄按需读
   - 否则读演示包 projects/xiejiaoxing.bundle.js（PROJECT_BUNDLE，由 tools/drama/project.py bundle 生成），图片用相对路径
   生成的全局：SERIES SOURCES OUTLINE TEMPLATE CATCH ENTS USAGE EPSTATE EP SHOTS CHARS PROPS SCENES PLATES STEPS_* CHECK_* PROMPT_*
   以及 PROJECT：文件读写（file / yaml / write）、每集初始状态（episode）、剧本（script）、问题清单（issues）、媒体（mediaUrl / attachMedia）。
   原型里资产工作室的 kind 是 char / prop / scene；项目里的类别是 character / prop / fx / scene，fx 在原型里归道具工作室 */
const PROJECT=(()=>{
  const OPEN_KEY='aigc-open-project';
  let open=null;try{open=JSON.parse(localStorage.getItem(OPEN_KEY))}catch(e){}
  const local=!!(open&&open.files),B=typeof PROJECT_BUNDLE!=='undefined'?PROJECT_BUNDLE:{id:'empty',root:'',files:{}};
  const files=local?open.files:B.files,root=local?'':B.root;
  const Y=f=>files[f]===undefined?null:(jsyaml.load(files[f])||{});
  const P=Y('project.yaml')||{title:'未命名',assets:{}},WF=Y(P.workflow||'workflow.yaml')||{asset_kinds:[],beats:[]};
  const KINDS=Object.fromEntries(WF.asset_kinds.map(k=>[k.id,k])),STUDIO={character:'char',prop:'prop',fx:'prop',scene:'scene'};
  const epDir=e=>`episodes/${e.toLowerCase()}/`;
  // 画幅：项目设置优先，其次工作流默认，都没写就 16:9。页面按 html 上的 ar-landscape / ar-portrait 切换布局
  const ASPECT=((P.spec||{}).aspect||(WF.spec||{}).aspect||'16:9')==='9:16'?'9:16':'16:9';
  document.documentElement.classList.add(ASPECT==='9:16'?'ar-portrait':'ar-landscape');
  // ---------- 系列层 ----------
  const OUT=(Y('outline.yaml')||{episodes:[]}).episodes;
  window.SERIES={title:P.title,logline:P.logline||'',style:P.style||'',spec:(P.spec||{}).label||''};
  window.SOURCES=(P.bible||[]).map(x=>({n:x.name,f:x.file,x:x.summary||[]}));
  window.OUTLINE=OUT.map(o=>{const r={};['id','title','problem','tech','fail','cost','loc','hook','tease'].forEach(k=>{if(o[k]!==undefined)r[k]=o[k]});
    if(o.new_assets)r.newAssets=o.new_assets.map(a=>[STUDIO[a.kind],a.name]);return r});
  const EPS=OUT.map(o=>o.id),SB={},SC={};
  EPS.forEach(e=>{const b=Y(epDir(e)+'storyboard.yaml'),s=Y(epDir(e)+'script.yaml');if(b)SB[e]=b;if(s)SC[e]=s});
  // ---------- 资产卡：按 project.yaml 的 assets 顺序（素材箱），没列出的按文件名接在后面 ----------
  const cards=[];WF.asset_kinds.forEach(k=>{const dir=k.dir+'/',listed=(P.assets||{})[k.dir.split('/').pop()]||[],
    found=Object.keys(files).filter(f=>f.startsWith(dir)&&f.endsWith('.yaml')).map(f=>f.slice(dir.length,-5)).sort();
    [...listed.filter(id=>found.includes(id)),...found.filter(id=>!listed.includes(id))].forEach(id=>cards.push({...Y(dir+id+'.yaml'),_file:dir+id+'.yaml'}))});
  const steps=k=>(KINDS[k]?KINDS[k].pipeline:[]).map(s=>{const o={k:s.step,n:s.name,d:s.desc};if(s.review)o.review=true;return o});
  window.STEPS_CHAR=steps('character');window.STEPS_PROP=[...steps('prop'),...steps('fx')];window.STEPS_SCENE=steps('scene');
  const prompts=(...ks)=>Object.assign({},...ks.map(k=>(KINDS[k]||{}).prompts||{}));
  window.PROMPT_CHAR=prompts('character');window.PROMPT_PROP=prompts('prop','fx');window.PROMPT_SCENE=prompts('scene');
  // 第一个有分镜的集：原型的分镜 / 视频工作室只做这一集
  const E0=EPS.find(e=>SB[e]),sb0=E0&&SB[E0],sc0=E0&&SC[E0];
  const LINE={line:'',sfx:'（音效）',vo:'（画外音）'},lineOf=(s,sh)=>s?s.blocks.filter(b=>b.shot===sh&&b.type in LINE).map(b=>LINE[b.type]+b.text).join(' '):'';
  window.EP=sb0?{episode:+E0.slice(2),title:sb0.title,aspect:ASPECT,notes:sb0.notes||[],segments:sb0.segments.map(g=>({id:g.id,title:g.title,
    shots:g.shots.map(s=>({id:s.id,beat:s.beat,duration_s:s.duration_s,framing:s.framing,camera:s.camera,plate:s.plate,characters:s.characters||[],props:s.props||[],fx:s.fx||[],
      keyframe:s.keyframe,motion:s.motion,line:lineOf(sc0,s.id)}))}))}:{episode:1,title:'',aspect:ASPECT,notes:[],segments:[]};
  window.SHOTS=Object.fromEntries(sb0?sb0.segments.flatMap(g=>g.shots.map(s=>[s.id,[s.framing,s.plate,s.summary||s.keyframe]])):[]);
  function item(c){
    const o={id:c.id,code:c.code,icon:c.icon,name:c.name,role:c.role};if(c.height_m!==undefined)o.height=c.height_m;
    Object.assign(o,{tone:c.tone,attrs:Object.entries(c.attrs||{}),
      locks:(c.locks||[]).map(l=>{const x={c:l.code,t:l.text};if(l.evidence)x.ev=[l.evidence.view,l.evidence.box];return x}),
      looks:(c.looks||[]).map(l=>{const x={id:l.id,n:l.name};if(l.note)x.note=l.note;return x})});
    if(c.expressions)o.exprs=Object.entries(c.expressions);
    if(c.details)o.details=c.details.map(d=>[d.name,d.view,d.box]);
    if(c.kind!=='character')o.states=Object.entries(c.states||{});
    const pl=c.pipeline||{},all=(KINDS[c.kind]||{pipeline:[]}).pipeline.map(s=>s.step),ks=Object.keys(pl);
    o.steps=Object.fromEntries(ks.map(k=>[k,pl[k].status||'none']));
    if(STUDIO[c.kind]==='prop')o.only=ks.length?ks:all; // 道具和特效只走自己那几步
    o.takes=Object.fromEntries(ks.filter(k=>pl[k].takes).map(k=>[k,pl[k].takes.map(t=>{const{deviations,...rest}=t;return{d:deviations||[],...rest}})]));
    o.pick=Object.fromEntries(ks.filter(k=>pl[k].pick!==undefined).map(k=>[k,pl[k].pick]));
    const notes=ks.filter(k=>pl[k].note);if(notes.length)o.notes=Object.fromEntries(notes.map(k=>[k,pl[k].note]));
    // 场景的各镜机位从分镜推出来（段落的 scene + 镜头的 plate）
    o.shots=c.kind==='scene'?Object.fromEntries(sb0?sb0.segments.filter(g=>g.scene===c.id).flatMap(g=>g.shots.map(s=>[s.id,s.plate])):[]):(c.shot_looks||{});
    o.quick=c.quick_fixes||[];
    if(c.prompts)o.prompts=c.prompts;
    if(c.plates)o.plates=c.plates.map(p=>({k:p.id,step:p.step,n:p.name,face:p.facing,lamp:p.sun,light:p.light}));
    return o}
  const byStudio=s=>cards.filter(c=>STUDIO[c.kind]===s).map(item);
  window.CHARS=byStudio('char');window.PROPS=byStudio('prop');window.SCENES=byStudio('scene');
  window.PLATES=(SCENES.find(s=>s.plates)||{plates:[]}).plates;
  window.USAGE=Object.fromEntries(cards.map(c=>[c.id,c.used_in===undefined?'*':c.used_in]));
  window.EPSTATE=Object.fromEntries(cards.filter(c=>c.episode_states).map(c=>[c.id,c.episode_states]));
  window.CATCH=cards.flatMap(c=>(c.catchphrases||[]).map(x=>[x.text,x.when]));
  const pend=EPS.flatMap(e=>(SC[e]&&SC[e].pending_entities)||[]);
  window.ENTS=[...cards.filter(c=>c.script_match).map(c=>({k:STUDIO[c.kind],id:c.id,n:c.script_match.label,re:new RegExp(c.script_match.pattern),card:true})),
    ...pend.map((x,i)=>({k:STUDIO[x.kind],id:x.id||'pending'+i,n:x.label,re:new RegExp(x.pattern),card:false}))];
  // 每集固定节拍：工作流的 beats（aliases = 算作这个节拍的镜头 beat），删掉的理由取自有分镜那一集的剧本
  const cut=(sc0&&sc0.beats_cut)||{};
  window.TEMPLATE=(WF.beats||[]).map(b=>{const o={n:b.name,d:b.desc,has:b.aliases||[b.name]};if(cut[b.name])o.cut=cut[b.name];return o});
  // ---------- 审片记录：出镜检查（资产 × 镜头 × 锁）和问题清单 ----------
  const RV=E0?Y(epDir(E0)+'review.yaml')||{}:{},SYM={deviation:'⚠',unclear:'?',ok:'✅'};
  const checks=s=>{const o=Object.fromEntries(cards.filter(c=>STUDIO[c.kind]===s).map(c=>[c.id,{}]));
    (RV.checks||[]).forEach(x=>{if(!o[x.asset])return;(o[x.asset][x.shot]=o[x.asset][x.shot]||{})[x.lock]=[SYM[x.result],x.note]});return o};
  window.CHECK_CHAR=checks('char');window.CHECK_PROP=checks('prop');window.CHECK_SCENE=checks('scene');
  const SRC={character:'char'};
  // ---------- 媒体 ----------
  const MEDIA=(Y('media.yaml')||{items:[]}).items||[],blobs={};
  let pendingRead=null;
  function mediaUrl(path){if(!local)return root+path;if(blobs[path])return blobs[path];
    if(pendingRead)pendingRead(path).then(u=>{if(u){blobs[path]=u;dispatchEvent(new Event('store'))}});return null}
  // 和画幅有关的媒体（场景空镜、故事板、关键帧、视频）比例要和项目一致，否则不显示（要按新画幅重出，见 tools/drama/project.py validate）
  const FRAMED=['board','keyframe','video','cut'],sceneIds=cards.filter(c=>c.kind==='scene').map(c=>c.id);
  const fits=m=>!m.aspect||m.aspect===ASPECT||!(FRAMED.includes(m.owner.kind)||sceneIds.includes(m.owner.asset));
  const findMedia=o=>MEDIA.filter(m=>m.owner&&fits(m)&&Object.entries(o).every(([k,v])=>m.owner[k]===v));
  // 资产候选挂上真图（sheet() 看到 t.img 就显示图片）：只挂没有 look 的条目，按 take 对上
  function attachMedia(items){items.forEach(c=>Object.entries(c.takes||{}).forEach(([k,ts])=>ts.forEach((t,i)=>{
    const m=findMedia({asset:c.id,step:k,take:i}).find(m=>!m.owner.look&&m.type==='image');
    if(m){const u=mediaUrl(m.path);if(u)t.img=u;else delete t.img}else delete t.img})))}
  // ---------- 单集：剧本、初始状态 ----------
  function script(e){const s=SC[e];if(!s)return null;const b=SB[e];
    const blocks=s.blocks.map(x=>{const o={id:x.id,seg:x.seg,t:x.type,sh:x.shot,x:x.text};['who','how','tag'].forEach(k=>{if(x[k]!==undefined)o[k]=x[k]});o.o=o.x;return o});
    const segs=s.segments.map(g=>{const bg=b&&b.segments.find(x=>x.id===g.id);
      return{id:g.id,title:g.title,st:g.status||'draft',shots:g.shots?g.shots.map(x=>({id:x.id,beat:x.beat,d:x.duration_s})):bg?bg.shots.map(x=>({id:x.id,beat:x.beat,d:x.duration_s})):[]}});
    return{ver:s.version||1,hist:(s.history||[]).map(h=>({v:h.version,n:h.note})),board:!!s.broken_down,blocks,segs}}
  function episode(e){const b=SB[e],T=Y(epDir(e)+'takes.yaml'),G=Y(epDir(e)+'gates.yaml'),L=files[epDir(e)+'ledger.jsonl'];
    const x={board:{},video:{},refMode:{},stale:{shot:[]},shots:{},gates:(G&&G.gates)||{},spent:{}};
    if(b)b.segments.forEach(g=>{x.board[g.id]={st:(g.board||{}).status||'none',v:(g.board||{}).version||0};x.refMode[g.id]=g.ref_mode||'board';if(g.shot_status==='stale')x.stale.shot.push(g.id)});
    if(T)Object.entries(T.segments||{}).forEach(([id,v])=>x.video[id]={st:v.status||'none',vers:(v.versions||[]).map(r=>({n:r.name,mode:r.mode,fixed:r.fixed||[]})),pick:v.pick||0});
    if(L)L.split('\n').filter(Boolean).forEach(l=>{const r=JSON.parse(l);x.spent[r.page]=(x.spent[r.page]||0)+r.cost});
    return x}
  const issues=()=>(RV.issues||[]).map(i=>({sh:i.shot,src:SRC[i.source]||i.source,lock:i.lock,why:i.note,lv:i.level}));
  const comments=t=>(t.match(/^(#.*\n)+/)||[''])[0];
  return{
    id:P.id||'project',title:P.title,local,name:local?open.name:'演示项目',OPEN_KEY,EPS,KINDS,STUDIO,epDir,ep0:E0,aspect:ASPECT,aspectLabel:ASPECT==='9:16'?'竖向 9:16':'横向 16:9',
    files:()=>files,file:f=>files[f],yaml:Y,
    // 结构化对象 → YAML 文本，保留原文件开头的注释
    dump:(f,o)=>(files[f]?comments(files[f]):'')+jsyaml.dump(o,{lineWidth:-1,noRefs:true}),
    cardFile:id=>(cards.find(c=>c.id===id)||{})._file,
    script,episode,issues,media:MEDIA,findMedia,mediaUrl,attachMedia,
    setReader(fn){pendingRead=fn}};
})();
