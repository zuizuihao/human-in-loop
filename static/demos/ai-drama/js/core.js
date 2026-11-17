/* 全局状态与通用工具 */
let SEGS=[]; // 当前 Skill 的分段
const state={
  tpl:null,nodes:[],edges:[],nid:1,      // 画布
  ctx:[],focus:null,                      // 被 @ 进对话的节点、显示工具条的节点
  tab:'orc',th:{},mid:1,atts:[],          // 面板当前标签、各 Agent 的对话线程、待发送的图片
  working:{},                             // 子 Agent 正在处理的任务数
  gates:{},auto:false,                    // 已通过的审批门、导演是否在自动推进
  mode:'draft',spent:0,view:{x:40,y:40,k:.7},follow:true};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const world=$('#world'),stage=$('#stage'),wires=$('#wires');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SPEED=window.SPEED||1; // 演示节奏：<1 更快（测试用）
const wait=ms=>new Promise(r=>setTimeout(r,ms*SPEED));
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const segDur=s=>sum(s.shots,x=>x.d);
const ents=()=>state.tpl?[...state.tpl.cast.map(e=>({...e,kind:'char'})),...state.tpl.props.map(e=>({...e,kind:'prop'})),...state.tpl.sets.map(e=>({...e,kind:'scene'}))]:[];
const entOf=id=>ents().find(e=>e.id===id);
// 同一件事正在进行时（比如某个审批门已经弹出），重复触发直接复用，不再弹第二张卡
const inflight={};
function once(k,fn){return inflight[k]||(inflight[k]=Promise.resolve().then(fn).finally(()=>delete inflight[k]))}
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2400)}
