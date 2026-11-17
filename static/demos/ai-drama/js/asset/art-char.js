/* 角色占位图（资产工作室用）：按 projects/xiejiaoxing/bible/04-character-prompts.md 的设定用 SVG 画嗡、绒绒、邻居，用来演示资产板、细节、表情和锁偏离。
   draw(id, view, o) 返回 SVG 片段（坐标系 200×260）；o.d = 违反的锁（如 ['LEFTARM']），用来演示抽卡偏离；o.seed 让每张候选略有不同 */
const OLIVES=['#6f7d3c','#727f3b','#68783f','#7a853f'];
const EYE='#7fe3e0';
function wengEyes(e){
  const S=`stroke="${EYE}" stroke-width="3.2" stroke-linecap="round" fill="none"`;
  switch(e){
  case 'happy':return `<path d="M85 66q7-10 14 0M101 66q7-10 14 0" ${S} stroke-width="4.5"/><circle cx="84" cy="73" r="3" fill="#f7a6c0" opacity=".8"/><circle cx="116" cy="73" r="3" fill="#f7a6c0" opacity=".8"/>`;
  case 'show':return `<circle cx="91" cy="62" r="5.5" fill="${EYE}"/><circle cx="109" cy="62" r="5.5" fill="${EYE}"/><circle cx="92.5" cy="60.5" r="1.6" fill="#fff"/><circle cx="110.5" cy="60.5" r="1.6" fill="#fff"/>`;
  case 'worry':return `<path d="M85 58l11 7M115 58l-11 7" ${S}/>`;
  case 'low':return `<path d="M86 63h12M102 63h12" ${S} stroke="#3c8c89"/>`;
  case 'dying':return `<rect x="76" y="62" width="48" height="18" fill="#0d1314"/><path d="M90 60h20" ${S} stroke-width="1.6" stroke="#3c8c89"/>`;
  case 'miss':return `<path d="M86 65q6-8 12 0M102 65q6-8 12 0" ${S} stroke="#f3c96b" opacity=".85"/>`;
  default:return `<path d="M86 66q6-8 12 0M102 66q6-8 12 0" ${S}/>`;
  }
}
function weng(view,o){
  const d=o.d||[],ol=OLIVES[(o.seed||0)%4],dk='#4c5629',silver=d.includes('LEFTARM')?ol:'#b9c0c7',cam=!d.includes('CAM'),rim=d.includes('TANK')?'#f1f1ec':'#3a6fb5';
  const track=(x,w)=>`<rect x="${x}" y="212" width="${w}" height="30" rx="14" fill="#3b3f44"/>${[0,1,2].map(i=>`<circle cx="${x+12+i*(w-24)/2}" cy="227" r="6" fill="#6b7076"/>`).join('')}`;
  const shadow=`<ellipse cx="100" cy="246" rx="74" ry="6" fill="#00000014"/>`;
  if(view==='side')return shadow+track(48,104)+
    `<rect x="56" y="188" width="92" height="30" rx="8" fill="#e8e0cc" stroke="#c9bfa6"/><rect x="88" y="176" width="26" height="16" fill="#555"/>
     <rect x="58" y="98" width="30" height="62" rx="10" fill="#f4f4f0" stroke="#cfcfc8"/><rect x="58" y="98" width="30" height="7" rx="3" fill="${rim}"/><path d="M73 160q0 14 18 18" stroke="#222" stroke-width="3" fill="none"/>
     <rect x="80" y="100" width="52" height="82" rx="16" fill="${ol}" stroke="${dk}"/><rect x="112" y="110" width="12" height="10" rx="2" fill="#c46a2c"/>
     <rect x="100" y="106" width="16" height="40" rx="8" fill="${ol}" stroke="${dk}"/><rect x="102" y="146" width="16" height="36" rx="8" fill="${ol}" stroke="${dk}"/><circle cx="110" cy="186" r="7" fill="#5b5f63"/>
     <rect x="98" y="88" width="14" height="14" fill="#555"/><rect x="88" y="36" width="48" height="56" rx="14" fill="${ol}" stroke="${dk}"/><rect x="118" y="46" width="16" height="34" rx="6" fill="#1d2629"/><path d="M124 60q4-5 8 0" stroke="${EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if(view==='back')return shadow+track(38,52)+track(110,52)+
    `<rect x="46" y="188" width="108" height="32" rx="8" fill="#e8e0cc" stroke="#c9bfa6"/><rect x="84" y="176" width="32" height="16" fill="#555"/>
     <rect x="60" y="100" width="80" height="82" rx="18" fill="${ol}" stroke="${dk}"/>
     <rect x="72" y="96" width="56" height="70" rx="12" fill="#f4f4f0" stroke="#cfcfc8"/><rect x="72" y="96" width="56" height="9" rx="4" fill="${rim}"/>
     <path d="M80 130l6 4M116 148l5-3M96 156l4 2" stroke="#9aa0a6" stroke-width="2"/><path d="M128 150q16 6 10 30" stroke="#222" stroke-width="3.5" fill="none"/>
     <rect x="40" y="106" width="18" height="40" rx="8" fill="${ol}" stroke="${dk}"/><rect x="38" y="146" width="18" height="36" rx="8" fill="${silver}" stroke="#8a9096"/><circle cx="47" cy="186" r="8" fill="#5b5f63"/>
     <rect x="142" y="106" width="18" height="40" rx="8" fill="${ol}" stroke="${dk}"/><rect x="144" y="146" width="18" height="36" rx="8" fill="${ol}" stroke="${dk}"/><circle cx="153" cy="186" r="8" fill="#5b5f63"/>
     ${cam?`<circle cx="60" cy="98" r="8" fill="#111" stroke="#c8ccd0" stroke-width="2"/>`:''}
     <rect x="92" y="88" width="16" height="14" fill="#555"/><rect x="68" y="34" width="64" height="58" rx="16" fill="${ol}" stroke="${dk}"/><circle cx="100" cy="52" r="3" fill="#c46a2c"/>`;
  // 正面：角色的左边在画面右边
  return shadow+track(38,52)+track(110,52)+
    `<rect x="46" y="188" width="108" height="32" rx="8" fill="#e8e0cc" stroke="#c9bfa6"/><rect x="84" y="176" width="32" height="16" fill="#555"/>
     <rect x="72" y="88" width="56" height="16" rx="6" fill="#f4f4f0" stroke="#cfcfc8"/><rect x="72" y="88" width="56" height="5" rx="2" fill="${rim}"/>
     <rect x="60" y="100" width="80" height="82" rx="18" fill="${ol}" stroke="${dk}"/>
     <rect x="66" y="108" width="16" height="12" rx="2" fill="#c46a2c" transform="rotate(-8 74 114)"/>${d.includes('PATCH')?'<rect x="112" y="160" width="16" height="10" rx="2" fill="#e04f8f"/>':''}
     <circle cx="100" cy="142" r="18" fill="#d9cfb4" stroke="#a99e82" stroke-width="2"/>${[-10,-4,2,8].map(y=>`<path d="M${88} ${142+y}h24" stroke="#a99e82" stroke-width="1.6"/>`).join('')}
     <rect x="40" y="106" width="18" height="40" rx="8" fill="${ol}" stroke="${dk}"/><rect x="38" y="146" width="18" height="36" rx="8" fill="${ol}" stroke="${dk}"/><circle cx="47" cy="186" r="8" fill="#5b5f63"/>
     <rect x="142" y="106" width="18" height="40" rx="8" fill="${ol}" stroke="${dk}"/><rect x="144" y="146" width="18" height="36" rx="8" fill="${silver}" stroke="#8a9096"/><circle cx="153" cy="148" r="3" fill="#8a9096"/><circle cx="153" cy="186" r="8" fill="#5b5f63"/>
     ${cam?`<circle cx="140" cy="98" r="8" fill="#111" stroke="#c8ccd0" stroke-width="2"/><circle cx="142" cy="96" r="2" fill="#555"/>`:''}
     <rect x="92" y="88" width="16" height="14" fill="#555"/>
     <g transform="rotate(${((o.seed||0)%3-1)*3} 100 63)"><rect x="68" y="34" width="64" height="58" rx="16" fill="${ol}" stroke="${dk}"/><rect x="76" y="44" width="48" height="36" rx="9" fill="#1d2629"/>${wengEyes(o.expr)}</g>`;
}
function rong(view,o){
  const d=o.d||[],blue=d.includes('FUR')?'#7a4fb0':'#4b4fa8',org='#f0a040',id='g'+Math.random().toString(36).slice(2,7);
  // 正面：角色左半身（暖橙）在画面右边
  const grad=view==='back'?[org,blue]:view==='side'?[blue,blue]:[blue,org];
  const eyes=o.expr==='scared'?`<circle cx="86" cy="182" r="9" fill="#3b2418"/><circle cx="114" cy="182" r="9" fill="#3b2418"/><circle cx="88" cy="179" r="3" fill="#fff"/><circle cx="116" cy="179" r="3" fill="#fff"/><path d="M70 166l10 4M130 166l-10 4" stroke="#3b2418" stroke-width="2"/>`
    :o.expr==='happy'?`<path d="M78 184q8-10 16 0M106 184q8-10 16 0" stroke="#3b2418" stroke-width="4" fill="none" stroke-linecap="round"/>`
    :o.expr==='sleepy'?`<path d="M79 184h14M107 184h14" stroke="#3b2418" stroke-width="3.5" stroke-linecap="round"/>`
    :`<circle cx="86" cy="182" r="7.5" fill="#3b2418"/><circle cx="114" cy="182" r="7.5" fill="#3b2418"/><circle cx="88.5" cy="179.5" r="2.4" fill="#fff"/><circle cx="116.5" cy="179.5" r="2.4" fill="#fff"/>`;
  const defs=`<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset=".42" stop-color="${grad[0]}"/><stop offset=".58" stop-color="${grad[1]}"/></linearGradient></defs>`;
  const shadow=`<ellipse cx="100" cy="240" rx="60" ry="6" fill="#00000014"/>`;
  if(view==='side')return defs+shadow+`<path d="M44 196q-14-6-10-18" stroke="${org}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="34" cy="176" r="4" fill="#ffe7a8"/>
    <ellipse cx="100" cy="198" rx="58" ry="40" fill="url(#${id})"/><path d="M60 198q40-30 82 0" fill="${org}" opacity=".45"/>
    <rect x="70" y="228" width="12" height="12" rx="5" fill="${blue}"/><rect x="118" y="228" width="12" height="12" rx="5" fill="${blue}"/>
    <circle cx="128" cy="160" r="11" fill="${blue}"/><circle cx="138" cy="190" r="6.5" fill="#3b2418"/><circle cx="140" cy="188" r="2" fill="#fff"/><circle cx="154" cy="200" r="2.6" fill="#2a1a12"/>`;
  if(view==='ball')return defs+shadow+`<ellipse cx="100" cy="206" rx="46" ry="36" fill="url(#${id})"/><path d="M80 204h14M106 204h14" stroke="#3b2418" stroke-width="3" stroke-linecap="round"/><circle cx="72" cy="176" r="9" fill="${grad[0]}"/><circle cx="128" cy="176" r="9" fill="${grad[1]}"/>`;
  return defs+shadow+(view==='back'?`<path d="M100 214q0 18 14 22" stroke="${org}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="116" cy="236" r="4.5" fill="#ffe7a8"/>`:'')+
    `<circle cx="70" cy="152" r="13" fill="${grad[0]}"/><circle cx="130" cy="152" r="13" fill="${grad[1]}"/>
     <ellipse cx="100" cy="194" rx="58" ry="44" fill="url(#${id})"/>
     <rect x="72" y="228" width="13" height="12" rx="5" fill="${grad[0]}"/><rect x="115" y="228" width="13" height="12" rx="5" fill="${grad[1]}"/>
     ${view==='back'?'':eyes+`<circle cx="100" cy="196" r="2.8" fill="#2a1a12"/>`}
     ${[0,1,2,3,4].map(i=>`<circle cx="${64+i*18}" cy="${152+(i%2)*6}" r="1.4" fill="#fff6c8" opacity=".9"/>`).join('')}`;
}
function neighbor(view){
  return `<ellipse cx="100" cy="246" rx="40" ry="5" fill="#00000010"/><g opacity=".55" fill="#9aa3ad"><circle cx="100" cy="58" r="22"/><path d="M62 246v-110q0-40 38-40t38 40v110z"/></g>`;
}
const DRAW={weng,rong,neighbor};
const bgRect=bg=>`<rect x="-500" y="-500" width="1400" height="1400" fill="${bg}"/>`;
// 单张图
function art(id,view='front',o={},vb='0 0 200 260',bg='#eef0f3'){return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${bgRect(bg)}${DRAW[id](view,o)}</svg>`}
// 在一张大图里摆多个子图（嵌套 svg 可以裁切局部）
const sub=(id,view,o,x,y,w,h,vb='0 0 200 260')=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}">${DRAW[id](view,o)}</svg>`;
