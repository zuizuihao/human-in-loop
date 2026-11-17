/* 导览模式（?tour=1）：博客文章里的幻灯片通过 postMessage 驱动原型。
   每一步指定页面、要点的按钮和要高亮的区域；不在对应页面时先跳过去，新页面加载完再执行。
   导览模式每次加载都从演示项目的初始状态开始，所以每一步和翻页顺序无关。
   这个文件必须在 store.js 之前加载（清掉已存的工作区）。 */
(() => {
  const QS = new URLSearchParams(location.search);
  if (!QS.has('tour')) return;
  Object.keys(localStorage).filter((k) => k.startsWith('aigc-v3:')).forEach((k) => localStorage.removeItem(k));

  const STEPS = {
    // 文章一：流水线、资产库和场景 Skill
    skills: { page: 'index.html?e=EP01', click: ['#skillChip', '#flyBody [data-back]'], hl: ['#fly'] },
    'skill-drama': { page: 'index.html?e=EP01', click: ['#skillChip', '#flyBody [data-back]', '#flyBody [data-sk="drama"]'], hl: ['#fly'] },
    canvas: { page: 'index.html?e=EP01', hl: ['#stagebar .tabs', '#orc'] },
    series: { page: 'series.html', hl: ['.mx2'] },
    library: { page: 'series.html', scroll: '.lib', hl: ['.lib .lc:first-child', '.lib .lc.pend'] },
    inbox: { page: 'series.html', click: ['.inb'], hl: ['.ibx'] },
    'stale-scene': { page: 'asset.html?k=scene&e=EP01&id=crash', hl: ['.stp.s-stale', '[data-act="regen"]'] },
    'stale-shot': { page: 'episode.html?m=shot&e=EP01', hl: ['.sg:first-of-type .sgh, section:first-of-type header', 'button.pri'] },
    'script-ai': { page: 'script.html?e=EP01', click: ['[data-ai="b5"]', '[data-aic^="b5|"]'], wait: 1500, hl: ['.aibar', '.alt, .cand, [class*="cand"]'] },
    review: { page: 'episode.html?m=video&e=EP01', hl: ['[data-g="g4"]', '[data-fix]'] },
    // 文章二：资产产物链和连续性锁
    'char-chain': { page: 'asset.html?k=char&e=EP01&id=weng', hl: ['.stp'] },
    'char-takes': { page: 'asset.html?k=char&e=EP01&id=weng', hl: ['[data-act="approve"]'] },
    locks: { page: 'asset.html?k=char&e=EP01&id=weng', click: ['[data-t="locks"]'], hl: ['#view'] },
    appear: { page: 'asset.html?k=char&e=EP01&id=weng', click: ['[data-act="check"]', '[data-t="appear"]'], wait: 2500, closeDock: true, hl: ['#view .mx'] },
    prompt: { page: 'asset.html?k=char&e=EP01&id=weng', click: ['[data-t="prompt"]'], hl: ['#view'] },
    'prop-states': { page: 'asset.html?k=prop&e=EP01&id=reflector', click: ['[data-step="P4"]'], hl: ['[data-look]', '[data-step="P4"]'] },
    'scene-geo': { page: 'asset.html?k=scene&e=EP01&id=crash', click: ['[data-t="geo"]'], hl: ['#view'] },
    board: { page: 'episode.html?m=shot&e=EP01', hl: ['#g-SEG1 .rows', '#g-SEG1 .bgrid'] },
    compare: { page: 'episode.html?m=video&e=EP01', click: ['[data-a="cmp"]'], hl: ['#mon'] },
  };

  const file = (u) => u.split('?')[0];
  function here(page) {
    const [f, q = ''] = page.split('?');
    if ((location.pathname.split('/').pop() || 'index.html') !== f) return false;
    return [...new URLSearchParams(q)].every(([k, v]) => QS.get(k) === v);
  }
  function go(id, page) {
    const q = new URLSearchParams(page.split('?')[1] || '');
    q.set('tour', '1'); q.set('step', id);
    if (QS.get('lang')) q.set('lang', QS.get('lang'));
    location.replace(`${file(page)}?${q}`);
  }
  const all = (sels) => sels.flatMap((s) => [...document.querySelectorAll(s)]);
  function run(id) {
    const st = STEPS[id]; if (!st) return;
    if (!here(st.page) || QS.get('step') !== id) return go(id, st.page); // 每一步都重新加载，从初始状态开始
    document.querySelectorAll('.hl').forEach((el) => el.classList.remove('hl'));
    (st.click || []).forEach((s) => document.querySelector(s)?.click());
    if (st.closeDock) setTimeout(() => typeof DOCK !== 'undefined' && DOCK.close(), st.wait - 200);
    setTimeout(() => {
      const els = all(st.hl);
      els.forEach((el) => el.classList.add('hl'));
      const target = st.scroll ? document.querySelector(st.scroll) : els[0];
      for (let parent = target?.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (!/(auto|scroll)/.test(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight) continue;
        const targetRect = target.getBoundingClientRect(), parentRect = parent.getBoundingClientRect();
        const offset = targetRect.top - parentRect.top - parent.clientTop;
        parent.scrollTop += offset - (target.offsetHeight > innerHeight * 0.7 ? 0 : (parent.clientHeight - targetRect.height) / 2);
      }
    }, st.wait || 350);
  }

  let last = null;
  addEventListener('message', (ev) => {
    if (ev.source !== parent || ev.data?.tour !== 'step') return;
    if (ev.data.id === last) return; // 跳转后页面自己已经执行过这一步
    run(ev.data.id);
  });
  const css = document.createElement('style');
  css.textContent = '.hl{outline:2px solid #e11d48!important;outline-offset:3px;border-radius:8px}';
  document.head.appendChild(css);
  addEventListener('load', () => setTimeout(() => {
    if (QS.get('step')) { last = QS.get('step'); run(last); }
    parent.postMessage({ tour: 'ready' }, '*');
  }, 300));
})();
