/* 镜头画面合成（占位）：场景空镜（按机位）+ 角色（按景别缩放）+ 道具 / 特效。复用资产工作室的画法（js/asset/art-*.js）
   o.d = 这一镜里出现的偏离（如 LEFTARM / LAMP / FUR），用来演示检查出的问题；o.fixed = 已修补 */
const EXPR={SH01:'low',SH02:'show',SH03:'calm',SH04:'worry',SH05:'calm',SH06:'show',SH07:'show',SH10:'happy',SH11:'calm',SH12:'calm',SH09:'scared',SH10r:'scared'};
const SCALE={全景:.32,中景:.5,近景:.78,特写:1.15};
const CAM={static:'固定',push_in:'推近',pull_out:'拉远',tilt_up:'上摇',pan:'摇'};
const SVG=(vb,inner,bg='#111')=>`<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"><rect x="-500" y="-500" width="1400" height="1400" fill="${bg}"/>${inner}</svg>`;
function frame(s,o={}){
  const d=o.fixed?[]:(o.d||[]),k=SCALE[s.framing],chars=s.characters,bg=plate(s.plate,{d:d.includes('LAMP')?['LAMP']:[]}),inner=[bg];
  // 特写：单独构图
  if(s.id==='SH04')return SVG(FRAME_VB,bg+sub('weng','front',{expr:'worry',d},-30,30,240,300,'60 26 80 72'));
  if(s.id==='SH06')return SVG(FRAME_VB,bg+`<svg x="-10" y="120" width="200" height="200" viewBox="0 0 200 200">${PDRAW.panel('front',{})}</svg>`+`<circle cx="90" cy="214" r="18" fill="#ffb15a" opacity=".6"/><circle cx="90" cy="214" r="8" fill="#fff1d6"/>${d.includes('NOLASER')?'<path d="M0 120L90 214" stroke="#e8f4ff" stroke-width="2"/>':''}`+sub('weng','front',{expr:'show'},20,-150,140,200,'60 26 80 72'));
  if(s.id==='SH08')return SVG(FRAME_VB,bg+`<svg x="-10" y="150" width="200" height="170" viewBox="0 0 200 200">${PDRAW.fire('front',{}).replace(/<rect width="200" height="140"[^>]*\/>/,'')}</svg>`+sub('rong','back',{},100,180,120,150,'80 196 60 50'));
  // 道具 / 特效
  if(s.props.includes('reflector_assembled'))inner.push(`<svg x="${s.plate==='master'?100:96}" y="${s.plate==='master'?226:150}" width="${s.plate==='master'?50:90}" height="${s.plate==='master'?50:90}" viewBox="0 0 200 200">${PDRAW.reflector('front',{state:'assembled'})}</svg>`);
  if(s.fx.includes('beam'))inner.push(`<path d="M${s.plate==='master'?112:110} ${s.plate==='master'?240:180}L70 ${s.plate==='master'?280:262}L84 ${s.plate==='master'?282:266}Z" fill="#e8642a" opacity=".35"/><circle cx="76" cy="${s.plate==='master'?280:264}" r="5" fill="#fff1d6"/>`);
  // 角色：按景别缩放，站在画面下部；两个角色时嗡在左、绒绒在右远处
  chars.forEach((c,i)=>{
    const h=c==='rong'?(chars.length>1?50:260*k*.6):260*k,w=h*200/260,x=chars.length>1?(c==='weng'?6:120):(90-w/2),y=320-h-(k>1?-40:18)-(chars.length>1&&c==='rong'?60:0);
    inner.push(sub(c,'front',{expr:EXPR[s.id]||'calm',d:d.filter(x=>x!=='LAMP')},x,y,w,h));
    if(c==='weng'&&s.props.includes('panel')&&!['SH06'].includes(s.id))inner.push(`<svg x="${x+w*.28}" y="${y+h*.48}" width="${w*.44}" height="${w*.44}" viewBox="0 0 200 200">${PDRAW.panel('front',{d:d.includes('CRACK')?['CRACK']:[]})}</svg>`);
  });
  if(s.props.includes('parachute')&&s.plate!=='master')inner.push(`<svg x="40" y="10" width="140" height="120" viewBox="0 0 200 200">${PDRAW.parachute('front',{})}</svg>`);
  return SVG(FRAME_VB,inner.join(''));
}
