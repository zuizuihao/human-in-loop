/* 道具与特效占位图（坐标系 200×200）。o.d = 违反的子锁；o.state = 状态 */
function wedgePath(cx,cy,rx,ry,a0,a1){const p=a=>[cx+rx*Math.cos(a),cy+ry*Math.sin(a)];const[x0,y0]=p(a0),[x1,y1]=p(a1);return `M${cx} ${cy}L${x0.toFixed(1)} ${y0.toFixed(1)}A${rx} ${ry} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z`}
function reflector(view,o){
  const d=o.d||[],st=o.state||'assembled',cx=100,cy=86,rx=66,ry=60,scorch=st==='scorched';
  const tripod=d.includes('STAND')?'':`<path d="M100 120L66 186M100 120L136 186M100 120L104 190" stroke="#8a9096" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  if(st==='parts')return `<ellipse cx="100" cy="150" rx="90" ry="34" fill="#00000010"/>`+[0,1,2,3,4,5,6,7].map(i=>{const x=30+(i%4)*40,y=110+Math.floor(i/4)*42;
      return `<path d="${wedgePath(x,y,26,22,-1.2+i*.3,-.4+i*.3)}" fill="${i%2?'#cfd5db':'#e3e7eb'}" stroke="#9aa1a8"/>`}).join('')+
    `<path d="M24 186q30-16 60-4M96 192q24-20 52-8M150 180q14-12 30-6" stroke="#8a9096" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="176" cy="132" r="12" fill="#222"/><circle cx="176" cy="132" r="5" fill="#666"/>`;
  if(view==='side')return `<ellipse cx="100" cy="192" rx="50" ry="6" fill="#00000014"/><path d="M104 120L80 188M104 120L130 188" stroke="#8a9096" stroke-width="5" stroke-linecap="round"/><ellipse cx="100" cy="86" rx="12" ry="${ry}" fill="#d9dee3" stroke="#9aa1a8" stroke-width="2"/><path d="M110 86h14" stroke="#777" stroke-width="4"/>`;
  if(view==='back')return `<ellipse cx="100" cy="192" rx="60" ry="6" fill="#00000014"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#9aa1a8" stroke="#7d848b" stroke-width="2"/>${[0,1,2,3,4,5,6,7].map(i=>{const a=i*Math.PI/4;return `<path d="M${cx} ${cy}L${(cx+rx*Math.cos(a)).toFixed(1)} ${(cy+ry*Math.sin(a)).toFixed(1)}" stroke="#6b7177" stroke-width="2"/>`}).join('')}${tripod}<path d="M86 100q14 18 28 0" stroke="#6b7177" stroke-width="5" fill="none"/>`;
  const wedges=[0,1,2,3,4,5,6,7].map(i=>{const a=i*Math.PI/4-Math.PI/2;return `<path d="${wedgePath(cx,cy,rx,ry,a+.03,a+Math.PI/4-.03)}" fill="${scorch&&i===2?'#2a2a2a':i%2?'#cfd5db':'#e7ebef'}" stroke="#9aa1a8"/>`}).join('');
  const spokes=d.includes('SPOKE')?'':[0,1,2,3,4,5,6,7].map(i=>{const a=i*Math.PI/4-Math.PI/2;return `<path d="M${cx} ${cy}L${(cx+rx*Math.cos(a)).toFixed(1)} ${(cy+ry*Math.sin(a)).toFixed(1)}" stroke="#6b7177" stroke-width="2.4"/>`}).join('');
  const tape=[[54,64,-30],[140,70,30],[78,132,60],[128,128,-40]].map(([x,y,r],i)=>`<rect x="${x}" y="${y}" width="16" height="6" fill="#1d1d1d" transform="rotate(${r} ${x} ${y})" ${scorch&&i===1?'opacity=".7"':''}/>`).join('');
  return `<ellipse cx="100" cy="192" rx="60" ry="6" fill="#00000014"/>${tripod}${wedges}${spokes}${tape}<path d="M70 70l14 6M120 104l10-8" stroke="#a6acb3" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="8" fill="#777" stroke="#555"/><path d="M${cx} ${cy}l10-6" stroke="#555" stroke-width="4" stroke-linecap="round"/>`;
}
function parachute(view,o){
  const d=o.d||[],id='pc'+Math.random().toString(36).slice(2,7),dome='M24 96Q100-6 176 96Q163 88 150 96Q137 88 124 96Q112 88 100 96Q88 88 76 96Q63 88 50 96Q37 88 24 96Z';
  const pat=d.includes('PATTERN')?[20,50,80,110,140,170].flatMap(x=>[30,55,80].map(y=>`<circle cx="${x}" cy="${y}" r="5" fill="#f2a1c0"/>`)).join('')
    :[...Array(10)].map((_,i)=>`<path d="M${18+i*17} 0V100" stroke="#5b8bd6" stroke-width="3"/><path d="M0 ${12+i*10}H200" stroke="#5b8bd6" stroke-width="2.4"/>`).join('');
  const cord=d.includes('CORD')?'#f1f1f1':'#f08a24';
  return `<defs><clipPath id="${id}"><path d="${dome}"/></clipPath></defs><path d="${dome}" fill="#fbfbf8" stroke="#d6d6cf"/><g clip-path="url(#${id})">${pat}</g>
    ${[24,50,76,100,124,150,176].map(x=>`<path d="M${x} 96L100 176" stroke="${cord}" stroke-width="1.6"/>`).join('')}<rect x="93" y="174" width="14" height="10" rx="2" fill="#8a9096"/>`;
}
function panel(view,o){
  const d=o.d||[],crack=d.includes('CRACK')?'M150 46L170 46L170 64L158 58Z':'M44 140L64 150L56 132L40 128Z';
  return `<ellipse cx="100" cy="186" rx="62" ry="6" fill="#00000012"/><path d="M40 54L160 40L170 140L36 152Z" fill="#1f3a6e" stroke="#c3cad1" stroke-width="5" stroke-linejoin="round"/>
    ${[1,2,3,4].map(i=>`<path d="M${40+i*25} ${54-i*3}L${36+i*27} ${152-i*2.4}" stroke="#2f5590" stroke-width="1.6"/>`).join('')}${[1,2,3].map(i=>`<path d="M${40-i*1} ${54+i*25}L${160+i*2.5} ${40+i*25}" stroke="#2f5590" stroke-width="1.6"/>`).join('')}
    <path d="${crack}" fill="#9aa1a8"/><rect x="162" y="84" width="10" height="20" fill="#e8dcbc" transform="rotate(-5 167 94)"/>
    <path d="M168 120q20 6 10 18t10 18-8 20" stroke="#1a1a1a" stroke-width="4" fill="none"/>`;
}
function fxGround(){return `<rect y="140" width="200" height="60" fill="#4a2a4e"/>${[[30,160,'#7b3f7f'],[90,170,'#a8463a'],[150,158,'#9a7a32']].map(([x,y,c])=>`<ellipse cx="${x}" cy="${y}" rx="36" ry="10" fill="${c}"/>`).join('')}`}
function beam(view,o){
  const d=o.d||[];
  return `<rect width="200" height="140" fill="#2a1f3e"/>${fxGround()}<ellipse cx="34" cy="78" rx="12" ry="34" fill="#cfd5db" stroke="#9aa1a8"/>
    <path d="M40 50L40 108L150 164L156 156Z" fill="#e8642a" opacity=".38"/><circle cx="153" cy="160" r="16" fill="#ffb15a" opacity=".55"/><circle cx="153" cy="160" r="8" fill="#fff1d6"/>
    <path d="M140 140q4-4 8 0t8 0M146 132q4-4 8 0t8 0" stroke="#ffd9a8" stroke-width="1.2" fill="none" opacity=".8"/>${d.includes('NOLASER')?'<path d="M40 79L153 160" stroke="#e8f4ff" stroke-width="1.5"/>':''}`;
}
function fire(view,o){
  return `<rect width="200" height="140" fill="#2a1f3e"/>${fxGround()}<ellipse cx="100" cy="160" rx="30" ry="8" fill="#1a1012"/>
    <path d="M100 150q-8-30 6-50t-2-46" stroke="#cfcfcf" stroke-width="5" fill="none" opacity=".6" stroke-linecap="round"/>
    ${[[88,156],[100,152],[112,157]].map(([x,y])=>`<path d="M${x-6} ${y}Q${x} ${y-24} ${x+6} ${y}Z" fill="#ff8a2a"/><path d="M${x-3} ${y}Q${x} ${y-12} ${x+3} ${y}Z" fill="#ffd36a"/>`).join('')}`;
}
const PDRAW={reflector,parachute,panel,beam,fire};
