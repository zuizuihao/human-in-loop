/* 坠落点场景占位图。主体画在 180×320 的坐标里，天空、林带、苔原向两侧延伸到 -200…380；画框 FRAME_VB 按项目画幅取：
   9:16 取 0…180 这一竖条，16:9 取中间同高的一块。
   o.d 里的 'LAMP' 表示老灯错误入画，'T1FAIL' 表示试拍里角色走样 */
const PORTRAIT=typeof PROJECT!=='undefined'&&PROJECT.aspect==='9:16',FRAME_VB=PORTRAIT?'0 0 180 320':'-194 0 569 320';
function sceneSky(warm,id){return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17143e"/><stop offset=".45" stop-color="#46306e"/><stop offset=".6" stop-color="${warm?'#e2603a':'#8a4a6a'}"/></linearGradient></defs>
  <rect x="-200" width="580" height="200" fill="url(#${id})"/>${[[20,20],[60,36],[110,14],[150,40],[36,64],[130,70],[90,50],[-150,30],[-90,56],[-40,22],[220,34],[270,60],[330,18]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1" fill="#fff" opacity=".8"/>`).join('')}`}
const lampDisk=(x,y,r=30)=>`<circle cx="${x}" cy="${y}" r="${r+10}" fill="#d0452e" opacity=".25"/><circle cx="${x}" cy="${y}" r="${r}" fill="#a8262a"/>`;
const forest=y=>`<path d="M-200 ${y}${[...Array(58)].map((_,i)=>`L${i*10-195} ${y-6-(i*7)%9}L${i*10-190} ${y}`).join('')}V${y+8}H-200Z" fill="#141220"/>`;
function moss(y0){return `<rect x="-200" y="${y0}" width="580" height="${320-y0}" fill="#4f2a55"/>${[[30,y0+30,'#7b3f7f'],[120,y0+20,'#c4513a'],[70,y0+70,'#b88a34'],[150,y0+90,'#7b3f7f'],[20,y0+110,'#c4513a'],[100,y0+120,'#6a3570']].flatMap(([x,y,c])=>[[x,y,c],[x-190,y+8,c],[x+190,y-6,c]]).map(([x,y,c])=>`<ellipse cx="${x}" cy="${y}" rx="40" ry="12" fill="${c}" opacity=".85"/>`).join('')}
  ${[[40,y0+50],[140,y0+60],[90,y0+100]].map(([x,y])=>`<path d="M${x} ${y}l8-6 9 4-3 6z" fill="#111"/>`).join('')}`}
function wreck(x,y,s=1,rim=true){
  return `<g transform="translate(${x} ${y}) scale(${s}) rotate(-10)"><rect x="-58" y="-34" width="34" height="14" fill="#2f6fd6" transform="rotate(-20)"/><rect x="-62" y="-14" width="30" height="12" fill="#2f6fd6" transform="rotate(-12)"/>
   <path d="M-4-26V-50" stroke="#ddd" stroke-width="2"/><ellipse cx="0" cy="0" rx="50" ry="26" fill="#f2f2ee" ${rim?'stroke="#f08a4a" stroke-width="2"':''}/><path d="M-46 4H40M-44 10H36" stroke="#f08a24" stroke-width="2"/>
   ${[-26,-8,10].map(c=>`<circle cx="${c}" cy="-8" r="5" fill="#2b3550" stroke="#ccc"/>`).join('')}<ellipse cx="42" cy="2" rx="12" ry="16" fill="#1a1622"/></g>`}
function chuteOver(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 0Q0-50 40 0Q20-6 0 0Q-20-6-40 0Z" fill="#fbfbf8"/>${[-30,-15,0,15,30].map(c=>`<path d="M${c} -36V0" stroke="#5b8bd6" stroke-width="2.4"/>`).join('')}<path d="M-40-14H40M-40-26H40" stroke="#5b8bd6" stroke-width="2"/>
  ${[-40,-20,0,20,40].map(c=>`<path d="M${c} 0L-10 42" stroke="#f08a24" stroke-width="1"/>`).join('')}</g>`}
function plate(view,o={}){
  const d=o.d||[],id='sk'+Math.random().toString(36).slice(2,7),lampIn=d.includes('LAMP');
  if(view==='plan')return `<rect x="-200" width="580" height="320" fill="#faf8f2"/><g stroke="#4e5969" stroke-width="1.4" fill="none" stroke-dasharray="4 3">
     <rect x="54" y="60" width="72" height="30" rx="14"/><circle cx="108" cy="52" r="16"/><circle cx="90" cy="160" r="14"/><path d="M90 300V176M84 300q6-60 6-124"/><path d="M10 26H170"/></g>
     <g font-size="9" fill="#1d2129" text-anchor="middle"><text x="90" y="79">残骸</text><text x="140" y="56">降落伞</text><text x="90" y="163">站位</text><text x="112" y="290">冲击沟</text><text x="40" y="22">针叶林带</text></g>
     <path d="M150 12l12-8" stroke="#a8262a" stroke-width="2"/><text x="166" y="22" font-size="8" fill="#a8262a" text-anchor="end">老灯 ↗ 北偏东</text>
     <g font-size="8" fill="#4d6bfe"><path d="M90 220v-30" stroke="#4d6bfe" stroke-width="2" marker-end=""/><path d="M84 196l6-8 6 8" fill="#4d6bfe"/><text x="96" y="230">主机位 → N</text>
     <path d="M90 130v-10" stroke="#4d6bfe" stroke-width="2"/><path d="M84 132l6 8 6-8" fill="#4d6bfe"/><text x="30" y="130">反打 → S</text>
     <path d="M108 160h22" stroke="#4d6bfe" stroke-width="2"/><path d="M128 154l8 6-8 6" fill="#4d6bfe"/><text x="128" y="176">侧向 → E</text></g>
     <text x="164" y="306" font-size="12" fill="#86909c">N↑</text>`;
  if(view==='reverse')return sceneSky(false,id)+(lampIn?lampDisk(60,170):'')+forest(196)+moss(200)+`<path d="M80 320L90 200L96 200L104 320Z" fill="#6a4a54" opacity=".7"/>`+
    `<path d="M30 196q4-14 10-28M140 196q-2-10 4-22" stroke="#eee" stroke-width="3" opacity=".5" fill="none"/>`+[[40,250],[140,260]].map(([x,y])=>`<path d="M${x} ${y}l2-40" stroke="#00000055" stroke-width="10"/>`).join('');
  if(view==='side')return sceneSky(false,id)+(lampIn?lampDisk(30,160,26):'')+forest(186)+moss(190)+wreck(-10,212,.9,false)+`<path d="M-200 214H380" stroke="#00000022" stroke-width="1"/>`+
    [[90,250],[150,270]].map(([x,y])=>`<path d="M${x} ${y}l30 4" stroke="#00000040" stroke-width="6"/>`).join('');
  if(view==='bg')return `<rect x="-200" width="580" height="320" fill="#3a2a4e"/><rect x="-210" y="20" width="600" height="190" rx="40" fill="#efefeb" stroke="#f08a4a" stroke-width="3"/><path d="M-210 150H390M-210 162H390" stroke="#f08a24" stroke-width="4"/>
    <circle cx="70" cy="96" r="22" fill="#2b3550" stroke="#ccc" stroke-width="4"/><path d="M140 40q40 60 0 140q30-60 0-140z" fill="#1a1622"/>${[30,60,90].map(x=>`<path d="M${x} 0V60" stroke="#f08a24" stroke-width="1.4"/>`).join('')}${moss(210)}
    ${[[40,250],[120,270]].map(([x,y])=>`<path d="M${x} ${y}l14-4 4 6-12 4z" fill="#d9dee3"/>`).join('')}`;
  // master / test
  let s=sceneSky(true,id)+lampDisk(128,178)+forest(186)+moss(190)+`<path d="M70 320L84 212L100 212L120 320Z" fill="#6a4a54" opacity=".7"/>`+chuteOver(104,150,.9)+wreck(80,206,.95)+`<ellipse cx="96" cy="250" rx="30" ry="8" fill="#5a3a5e"/>`;
  if(view==='test')s+=sub('weng','front',{d:['LEFTARM','CAM'],seed:3,expr:'calm'},50,206,40,52)+sub('rong','front',{d:['FUR'],expr:'calm'},92,214,34,44);
  return s;
}
