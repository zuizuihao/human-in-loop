/* 侧边栏折叠（所有页面共用）：
   - Agent 是弹出式浮窗（不占布局，类似 GitHub Copilot 网页版）：顶栏最右边是 Agent 入口，点它从右上角展开浮窗，再点或点 — 收起；⛶ 放大成宽窗口。
     工作室里是 #agent，默认收起；主页是导演 #orc，默认打开。
     Agent 发来需要人拍板的卡片（带按钮，比如交接、审批、费用确认）时自动展开；其他消息只在顶栏入口上记未读数。
     页面上就地调用 AI 的操作（DOCK.inline 包起来）：调用和结果都记进对话，但不弹浮窗。
   - 屏幕窄（< 1100px）时主页的导演面板也默认收起，给画布留地方
     各页面的 post() 里调 DOCK.notify(m)；在 agent.js / orchestrator.js 之前加载
   - 左侧栏：带 data-side 的 aside（剧集列表、资产列表、镜头检查器），点边上的 ‹ 收起、› 展开；每个页面记住自己的选择 */
const DOCK=(()=>{
  const studio=!!document.getElementById('agent'),P=document.getElementById(studio?'agent':'orc');
  const D={unread:0,
    min:()=>document.body.classList.contains('dock-min'),
    set(open){document.body.classList.toggle('dock-min',!open);if(open)this.unread=0;this.paint();
      // 时间线、画布等按宽度排版的部分要重排；等列宽过渡结束再排一次
      dispatchEvent(new Event('resize'));setTimeout(()=>dispatchEvent(new Event('resize')),240)},
    open(){if(this.min())this.set(true)},close(){this.set(false)},
    // 就地 AI（页面上直接触发的操作）：消息照样记进对话，只记未读，不弹浮窗——结果已经在页面上了
    inlineN:0,async inline(fn){this.inlineN++;try{return await fn()}finally{this.inlineN--}},
    notify(m){if(m.r==='me'||m.type==='me')return;if(m.acts&&m.acts.length&&!this.inlineN)return this.open();if(this.min()){this.unread++;this.paint()}},
    paint(){const r=document.getElementById('aFab');if(!r)return;
      r.querySelector('.aav').textContent=document.getElementById(studio?'agentAv':'oAv').textContent;r.querySelector('em').textContent=document.getElementById(studio?'agentName':'oName').textContent;
      r.title=`打开 / 收起${r.querySelector('em').textContent}`;r.classList.toggle('on',!this.min());const b=r.querySelector('b');b.textContent=this.unread;b.hidden=!this.unread}};
  if(!P)return D;
  // 浮窗右上角：放大 / 收起；顶栏最右边：Agent 入口（开关浮窗，收起时显示未读数）
  P.querySelector(studio?'.ah':'.oh').insertAdjacentHTML('beforeend','<button class="ib" id="aBig" title="放大">⛶</button><button class="ib" id="aMin" title="收起">—</button>');
  (document.querySelector('#hdr,#top')||document.body).insertAdjacentHTML('beforeend','<button id="aFab" title="打开 Agent"><span class="aav"></span><em></em><b hidden></b></button>');
  document.getElementById('aMin').onclick=()=>D.close();document.getElementById('aFab').onclick=()=>D.min()?D.open():D.close();
  document.getElementById('aBig').onclick=()=>{const b=document.body.classList.toggle('dock-big');document.getElementById('aBig').title=b?'还原':'放大'};
  if(studio||innerWidth<1100)document.body.classList.add('dock-min');
  addEventListener('DOMContentLoaded',()=>D.paint()); // 等页面脚本设好 Agent 名字再画
  return D;
})();
(()=>{const s=document.querySelector('[data-side]');if(!s)return;
  const key='ui-side-min:'+(location.pathname.split('/').pop()||'index.html'),w=s.getBoundingClientRect().width,b=document.createElement('button');
  b.id='sideX';document.body.appendChild(b);
  const set=m=>{document.body.classList.toggle('side-min',m);localStorage.setItem(key,m?'1':'');b.textContent=m?'›':'‹';b.title=m?'展开侧边栏':'收起侧边栏';b.style.left=(m?0:w-11)+'px';
    dispatchEvent(new Event('resize'));setTimeout(()=>dispatchEvent(new Event('resize')),240)};
  b.onclick=()=>set(!document.body.classList.contains('side-min'));set(localStorage.getItem(key)==='1');
})();
