/* 初始化（最后加载）：载入演示项目《降落伞是床单》 */
$('#budget').textContent=BUDGET;
render();renderPanel();applyView();
// 打开就是演示项目；✎ 新项目可以从空画布开始走一遍完整流程
const Q=new URLSearchParams(location.search),NEW=Q.get('new');
if(NEW){STAGEBAR.show(false);const t=SKILLS.find(s=>s.id===NEW);if(t)startProject(t);else if(Q.get('q'))send(Q.get('q'))}
else if(STORE.ep==='EP01')loadDemo();else loadEpisodeStub();
