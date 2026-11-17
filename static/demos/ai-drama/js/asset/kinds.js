/* 三类资产工作室的差异：产物链、画法、头像、镜头缩略图、额外标签页、对应 Agent。页面框架在 studio.js，Agent 在 agent.js */
const W=(vb,inner,bg='#eef0f3')=>`<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${bgRect(bg)}${inner}</svg>`;
const cellL=(x,y,inner,l,w=94,h=88)=>`<rect x="${x+3}" y="${y+3}" width="${w}" height="${h}" rx="6" fill="#e6e9ef"/>${inner}<text x="${x+3+w/2}" y="${y+h+18}" font-size="11" text-anchor="middle" fill="#4e5969">${l}</text>`;
// 镜头缩略图：竖屏 90×120（裁掉上下），横屏 160×90。fg(portrait) 画在场景上面的角色 / 道具
const shotThumb=(inner,fg,bg)=>PORTRAIT?W('0 0 90 120',`<svg width="90" height="160" viewBox="${FRAME_VB}" y="-20">${inner}</svg>`+(fg?fg(true):''),bg)
  :W('0 0 160 90',`<svg width="160" height="90" viewBox="${FRAME_VB}">${inner}</svg>`+(fg?fg(false):''),bg);
const pickOf=(it,k)=>(it.takes[k]||[])[it.pick[k]]||{d:[]};
// ---------- 角色 ----------
const HEAD={weng:'60 26 80 72',rong:'48 132 104 80'};
function charSheet(c,k,t,look){
  const view=v=>c.id==='rong'&&look==='ball'&&v==='front'?'ball':v,o={d:t.d,seed:t.seed,expr:c.id==='weng'&&look==='low'?'low':'calm'},id=c.id;
  switch(k){
  case 'C1':return W('0 0 200 260',DRAW[id](view('front'),o));
  case 'C2':return W('0 0 600 260',sub(id,view('front'),o,0,0,200,260)+sub(id,'side',o,200,0,200,260)+sub(id,'back',o,400,0,200,260)+'<path d="M0 34H600M0 242H600" stroke="#c9d0dc" stroke-dasharray="4 4"/>');
  case 'C3':return W('0 0 640 260',['front','side','back'].map((v,i)=>`<rect x="${i*220}" width="200" height="260" fill="#e9ecf1"/>`+sub(id,i?v:view(v),o,i*220,0,200,260)).join('')+'<rect x="200" width="20" height="260" fill="#fff"/><rect x="420" width="20" height="260" fill="#fff"/>');
  case 'D':return W('0 0 300 260',sub(id,view('front'),o,0,0,200,260)+`<rect x="202" y="2" width="96" height="126" rx="6" fill="#e6e9ef"/>`+sub(id,'front',o,202,2,96,126,HEAD[id])+sub(id,'side',o,200,132,50,128)+sub(id,'back',o,250,132,50,128));
  case 'D2':return W('0 0 300 230',c.details.map(([l,v,vb],i)=>cellL(i%3*100,Math.floor(i/3)*115,sub(id,v,o,i%3*100+3,Math.floor(i/3)*115+3,94,88,vb),l)).join(''));
  case 'E':{const rows=Math.ceil(c.exprs.length/4);return W(`0 0 400 ${rows*115}`,c.exprs.map(([e,l],i)=>cellL(i%4*100,Math.floor(i/4)*115,sub(id,'front',{...o,expr:e},i%4*100+3,Math.floor(i/4)*115+3,94,88,HEAD[id]),l)).join(''))}
  }
}
// ---------- 道具 ----------
const P=(id,view,o,x,y,w,h)=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 200 200">${PDRAW[id](view,o)}</svg>`;
function propSheet(p,k,t,look){
  const o={d:t.d,state:look},id=p.id,wg=(x,y,w,h)=>sub('weng','front',{expr:'show',d:[]},x,y,w,h);
  switch(k){
  case 'P1':case 'FX':return W('0 0 200 200',PDRAW[id]('front',o));
  case 'P2':return W('0 0 600 200',P(id,'front',o,0,0,200,200)+P(id,'side',o,200,0,200,200)+P(id,'back',o,400,0,200,200));
  case 'P3':// 与嗡同框，按锁里的尺寸摆比例（嗡 1.6 米）
    if(id==='parachute')return W('0 0 260 260',P(id,'front',o,10,0,240,200)+wg(150,150,80,104)+'<path d="M190 178L136 186" stroke="#f08a24" stroke-width="1.4"/>');
    if(id==='panel')return W('0 0 260 260',wg(50,10,180,234)+P(id,'front',o,95,120,90,90));
    return W('0 0 260 260',wg(130,20,120,156)+P(id,'front',o,10,60,140,140));
  case 'P4':return W(`0 0 ${p.states.length*200} 230`,p.states.map(([s,l],i)=>P(id,'front',{...o,state:s},i*200,0,200,200)+`<text x="${i*200+100}" y="220" font-size="12" text-anchor="middle" fill="#4e5969">${l.split('：')[0]}</text>`).join(''));
  case 'PB':{const cells=[['正面','front',{}],['侧面','side',{}],['背面','back',{}],...p.states.map(([s,l])=>[l.split('：')[0],'front',{state:s}])].slice(0,6);
    return W('0 0 300 230',cells.map(([l,v,x],i)=>cellL(i%3*100,Math.floor(i/3)*115,P(id,v,{...o,...x},i%3*100+3,Math.floor(i/3)*115+3,94,88),l)).join(''))}
  }
}
// ---------- 场景 ----------
const SCENE_VIEW={S1:'master',S1r:'reverse',S1s:'side',S1bg:'bg',S2:'plan',T1:'test'};
const sceneSheet=(s,k,t)=>W(FRAME_VB,plate(SCENE_VIEW[k],{d:t.d}),'#111');
// 镜头缩略图：角色 / 道具画在场景里，场景按镜头的机位出空镜；检查出的偏离照样画出来
const thumbBg=sh=>sub('crash',SHOTS[sh][1],{},0,0,90,160);
const KINDS={
 char:{n:'角色',title:'角色工作室',agent:'角色 Agent',av:'🧑‍🎨',skill:'drama-character',items:CHARS,steps:STEPS_CHAR,checks:CHECK_CHAR,prompts:PROMPT_CHAR,lookN:'造型',
  sheet:charSheet,avatar:c=>W(HEAD[c.id],DRAW[c.id]('front',{expr:'calm',d:pickOf(c,'C1').d})),
  thumb:(c,sh,bad)=>shotThumb(plate(SHOTS[sh][1],{}),v=>sub(c.id,'front',{expr:c.shots[sh],d:bad},...(v?[15,30,60,80]:[56,16,48,66])),'#222'),
  flagStep:'C1',lineup:true},
 prop:{n:'道具',title:'道具工作室',agent:'道具 Agent',av:'🧰',skill:'drama-prop',items:PROPS,steps:STEPS_PROP,checks:CHECK_PROP,prompts:PROMPT_PROP,lookN:'状态',
  sheet:propSheet,avatar:p=>W('0 0 200 200',PDRAW[p.id]('front',{state:p.looks[0].id,d:pickOf(p,p.only[0]).d})),
  thumb:(p,sh,bad)=>shotThumb(plate(SHOTS[sh][1],{}),v=>P(p.id,'front',{state:p.shots[sh],d:bad},...(v?[12,40,66,66]:[52,18,56,56])),'#222')},
 scene:{n:'场景',title:'场景工作室',agent:'场景 Agent',av:'🏞️',skill:'drama-scene',items:SCENES,steps:STEPS_SCENE,checks:CHECK_SCENE,prompts:PROMPT_SCENE,lookN:'时段',
  sheet:sceneSheet,avatar:s=>W('20 150 140 140',plate('master',{}),'#111'),
  thumb:(s,sh,bad)=>shotThumb(plate(SHOTS[sh][1],{d:bad}),null,'#111'),geo:true}};
