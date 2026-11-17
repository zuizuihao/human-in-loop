// ===========================================================================
// App: status, checks, rendering, the input conversation, events.
// ===========================================================================
const appl = (k) => { const d = F[k]; if (d.up) return appl(d.up); return !WHEN[k] || WHEN[k][0](); };
const upperText = (n) => { const s = rmb(n); return T.upperStrip ? s.replace(/元整$|元$/, '') : s; };
function status(k) {
  const d = F[k];
  if (!appl(k)) return { kind: 'na', why: WHEN[d.up || k]?.[1] };
  if (d.up) { const n = num(d.up); return { kind: 'code', text: n !== '' ? upperText(n) : '' }; }
  if (d.t === 'calc') return { kind: 'code', text: T.CALC[k]() };
  const x = V()[k];
  if (x?.conflict) return { kind: 'conf', x };
  if (!has(k)) return d.opt ? { kind: 'na', opt: true } : { kind: 'blank' };
  return { kind: x.src, x };
}
const computed = (k) => F[k].up || F[k].t === 'calc';
const pending = () => KEYS.filter((k) => !computed(k) && appl(k) && !F[k].opt && !has(k) && !V()[k]?.conflict);
const conflicts = () => KEYS.filter((k) => appl(k) && V()[k]?.conflict);

function checks() {
  const out = [], add = (level, t, d, k) => out.push({ level, t, d, k });
  const p = pending(), blanks = p.filter((k) => !F[k].o), unticked = p.filter((k) => F[k].o), cf = conflicts();
  add(blanks.length ? 'err' : 'ok', '空白项', blanks.length ? `${blanks.length} 处未填写` : `必填空白已填；不适用和未约定的选填项由代码填“${T.na}”`, blanks[0]);
  add(unticked.length ? 'err' : 'ok', '选择项', unticked.length ? `${unticked.length} 组 □ 还没勾选` : '每组 □ 都已勾选', unticked[0]);
  add(cf.length ? 'err' : 'ok', '前后一致', cf.length ? `${cf.length} 处前后说法不一，AI 没有替你选` : '前后说法没有矛盾', cf[0]);
  KEYS.forEach((k) => {
    const t = F[k].t, v = String(g(k)).replace(/\s/g, '').toUpperCase();
    if (!v || !['id', 'uscc', 'vin'].includes(t) || !appl(k)) return;
    const [fn, okMsg, badMsg] = { id: [idOk, '身份证校验位正确', '身份证校验位不符，请核对'],
      uscc: [usccOk, '统一社会信用代码校验通过', '统一社会信用代码校验不通过'], vin: [vinOk, 'VIN 17 位且校验位正确', 'VIN 格式或第 9 位校验位不对，请对照行驶证'] }[t];
    add(fn(v) ? 'ok' : 'err', F[k].l, fn(v) ? okMsg : badMsg, k);
  });
  T.checks(add);
  add('ok', '大写金额', '由代码按小写金额生成');
  add('ok', '范本原文', `条款文字未改动；补充约定只能写入${T.addendum}`);
  const rank = { err: 0, warn: 1, ok: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

// ---------------------------------------------------------------------------
// Conversation: each turn = message + attachments. Every source (each file's
// AI reading, then the message) is extracted separately so values keep their quote.
// ---------------------------------------------------------------------------
const fileById = (fid) => T.files.find((f) => f.id === fid);
const userEntries = () => S.log[T.id].filter((e) => e.role === 'user');
function srcName(m) {
  if (!m) return '合同里直接填写';
  const [eid, fid] = m.split(':'), i = userEntries().findIndex((e) => e.id === eid);
  if (fid) { const f = fileById(fid); return `${f.label}（${f.name}）`; }
  return i < 0 ? '合同里直接填写' : `你的第 ${i + 1} 条消息`;
}

function merge(out, sid) {
  const filled = [], conf = [], same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  Object.entries(out).forEach(([k, { v, q }]) => {
    const cur = V()[k], cand = { v, m: sid, q };
    if (!cur || (!cur.conflict && !has(k))) { V()[k] = { ...cand, src: 'ai' }; S.aiv[T.id][k] = cand; filled.push(k); return; }
    if (F[k].t === 'multi' && !cur.conflict) {
      const add = [].concat(v).filter((x) => !cur.v.includes(x));
      if (add.length) { V()[k] = { ...cur, v: [...cur.v, ...add] }; filled.push(k); }
      return;
    }
    if (cur.conflict) { if (!cur.conflict.some((c) => same(c.v, v))) { cur.conflict.push(cand); conf.push(k); } return; }
    if (same(cur.v, v)) return;
    V()[k] = { conflict: [{ v: cur.v, m: cur.m, q: cur.q }, cand] }; conf.push(k);
  });
  return { filled, conf };
}

const issueKey = (r) => r.t + '|' + r.d;
function process(entry, reply) {
  const before = new Set(checks().filter((r) => r.level !== 'ok').map(issueKey));
  const perFile = [], conf = [];
  entry.files.forEach((f) => {
    const out = extract(f.text), r = merge(out, `${entry.id}:${f.id}`);
    f.hits = Object.entries(out).map(([k, x]) => ({ k, q: x.q }));
    perFile.push({ fid: f.id, keys: [...r.filled] }); conf.push(...r.conf);
  });
  const out = entry.text ? extract(entry.text) : {}, r = merge(out, entry.id);
  entry.hits = Object.entries(out).map(([k, x]) => ({ k, q: x.q }));
  conf.push(...r.conf);
  const issues = checks().filter((x) => x.level !== 'ok' && !['空白项', '选择项', '前后一致'].includes(x.t) && !before.has(issueKey(x)));
  Object.assign(reply, { busy: false, perFile, filled: r.filled, conf: [...new Set(conf)], issues, missing: pending() });
  S.flash = new Set([...perFile.flatMap((x) => x.keys), ...r.filled, ...conf]); delete S.done[T.id];
}

function turn(text, fids, then) {
  const tid = T.id, log = S.log[tid], id = `n${++S.seq}`;
  const entry = { role: 'user', id, text, files: fids.map((fid) => ({ ...fileById(fid), hits: [] })), hits: [] };
  const reply = { role: 'agent', busy: true, nfiles: fids.length };
  log.push(entry, reply); S.busy = true;
  if (T.id === tid) { renderLog(); renderSteps(); }
  const run = () => {
    const cur = T.id; useTpl(tid); process(entry, reply); S.busy = false; useTpl(cur);
    if (T.id === tid) {
      render();
      setTimeout(() => { S.flash.clear(); document.querySelectorAll('.flash').forEach((el) => el.classList.remove('flash')); }, 1600);
    }
    if (then) then();
  };
  if (S.sync) run(); else setTimeout(run, fids.length ? 1100 : 650);
}
function send() {
  const box = $('input'), text = box.value.trim(), fids = [...S.att];
  if ((!text && !fids.length) || S.busy) return;
  box.value = ''; S.att = []; S.picker = false; renderComposer();
  turn(text, fids);
}
function play(tid) {
  const steps = TPLS.find((t) => t.id === tid).script.slice();
  S.played[tid] = true;
  const next = () => { const st = steps.shift(); if (!st) return; setTimeout(() => turn(st.text, st.files, next), 450); };
  next();
}

// ---------------------------------------------------------------------------
// Render: top, composer, conversation, document mocks, viewer
// ---------------------------------------------------------------------------
function renderTop() {
  $('tabs').innerHTML = TPLS.map((t) => `<button class="${t.id === T.id ? 'on' : ''}" data-tpl="${t.id}">${t.short}<small>${t.year}</small></button>`).join('');
  $('srclink').href = T.url;
  renderComposer();
}
function renderComposer() {
  $('samples').innerHTML = '<span>快捷回复：</span>' + T.replies.map((s, i) => `<button data-sample="${i}">${esc(s.label)}</button>`).join('');
  $('atts').innerHTML = S.att.map((fid) => { const f = fileById(fid); return `<span class="att-chip">${KIND_ICON[f.kind]} ${esc(f.name)}<button data-unatt="${fid}">×</button></span>`; }).join('');
  $('picker').hidden = !S.picker;
  $('picker').innerHTML = `<div class="pk-h">示例文件（原型不读取本地文件）</div>` + T.files.map((f) => `<button data-att="${f.id}" class="${S.att.includes(f.id) ? 'on' : ''}">
    <span class="pk-i">${KIND_ICON[f.kind]}</span><span><b>${esc(f.label)}</b><small>${esc(f.name)}</small></span></button>`).join('');
}
const KIND_ICON = { id: '🪪', cert: '📕', license: '🚗', biz: '🏢', pdf: '📄', chat: '💬' };

function docHtml(f) {
  const d = f.data, e = esc;
  if (f.kind === 'id') return `<div class="doc idc"><div class="idf"><p><i>姓名</i>${e(d.name)}</p><p><i>性别</i>${e(d.sex)}<i class="g">民族</i>汉</p><p><i>出生</i>${e(d.birth)}</p>
    <p class="ad"><i>住址</i><span>${e(d.addr)}</span></p></div><div class="idp"></div><p class="idn"><i>公民身份号码</i>${e(d.no)}</p></div>`;
  if (f.kind === 'chat') return `<div class="doc chat"><div class="ch">‹ ${e(d.title)}</div>${d.msgs.map(([w, t, side]) =>
    `<div class="cm ${side}"><b>${e(w)}</b><span>${e(t)}</span></div>`).join('')}</div>`;
  return `<div class="doc page ${f.kind}"><div class="pt">${e(d.title)}</div>${d.sub ? `<div class="psub">${e(d.sub)}</div>` : ''}
    <table>${d.rows.map((r) => (Array.isArray(r) ? `<tr><th>${e(r[0])}</th><td>${e(r[1])}</td></tr>` : `<tr><td colspan="2">${e(r)}</td></tr>`)).join('')}</table>
    ${d.stamp ? `<div class="stamp">${e(d.stamp)}</div>` : ''}</div>`;
}
const thumb = (eid, f) => `<button class="thumb" data-view="${eid}:${f.id}" title="查看 ${esc(f.label)}"><div class="tv">${docHtml(f)}</div><span>${KIND_ICON[f.kind]} ${esc(f.label)}</span></button>`;

function marked(text, hits) {
  const qs = {}; hits.forEach(({ k, q }) => (qs[q] ||= []).push(k));
  const list = Object.keys(qs).sort((a, b) => b.length - a.length), h = esc(text);
  if (!list.length) return h;
  const lookup = Object.fromEntries(list.map((q) => [esc(q), qs[q]]));
  return h.replace(new RegExp(list.map((q) => reEsc(esc(q))).join('|'), 'g'), (m) => `<mark data-ks="${lookup[m].join(' ')}">${m}</mark>`);
}
const chips = (keys, cls) => keys.map((k) => `<button class="chip ${cls} ${cls === 'miss' && has(k) ? 'done' : ''}" data-go="${k}">${esc(F[k].l)}</button>`).join('');
function askHtml(missing) {
  const groups = []; missing.forEach((k) => { const a = ART[k]; let gp = groups.find((x) => x.a === a); if (!gp) groups.push(gp = { a, keys: [] }); gp.keys.push(k); });
  const shown = groups.slice(0, 3), rest = missing.length - shown.reduce((n, x) => n + x.keys.length, 0);
  return `<p>还需要你确认这些，直接回复就行：</p>${shown.map((x) => `<div class="ask"><b>${x.a}${T.ARTT[x.a] ? ' ' + T.ARTT[x.a] : ''}</b><div class="chips">${chips(x.keys, 'miss')}</div></div>`).join('')}
    ${rest > 0 ? `<p class="mut">另有 ${rest} 项，见右侧“需要双方确认”。</p>` : ''}`;
}
function agentHtml(e) {
  if (e.busy) return `<div class="a"><span class="spin"></span>${e.nfiles ? `正在识别 ${e.nfiles} 份文件并整理到合同…` : '正在整理到合同…'}</div>`;
  let h = '';
  if (e.perFile.length) h += `<p>识别了 ${e.perFile.length} 份文件：</p>${e.perFile.map((x) => { const f = fileById(x.fid);
    return `<div class="ask"><b>${KIND_ICON[f.kind]} ${esc(f.label)}</b><div class="chips">${x.keys.length ? chips(x.keys, 'ok') : '<span class="more">没有新内容</span>'}</div></div>`; }).join('')}`;
  if (e.filled.length) h += `<p>${e.perFile.length ? '从你的话里又整理了' : '已整理'} <b>${e.filled.length}</b> 项：</p><div class="chips">${chips(e.filled, 'ok')}</div>`;
  if (!e.perFile.length && !e.filled.length && !e.conf.length) h += '<p>这段话里没有找到能填进合同的内容。</p>';
  if (e.conf.length) h += `<p class="bad">${e.conf.length} 处和之前的说法不一样，我没有替你选，请在合同里选定：</p><div class="chips">${chips(e.conf, 'conf')}</div>`;
  if (e.issues.length) h += `<div class="warnbox">${e.issues.map((r) => `<button data-go="${r.k || ''}" class="${r.level}">${r.level === 'err' ? '✕' : '!'} ${esc(r.t)}：${esc(r.d)}</button>`).join('')}</div>`;
  h += e.missing.length ? askHtml(e.missing) : '<p class="mut">必填项都有了，看看右侧的检查结果，没问题就可以生成。</p>';
  return `<div class="a">${h}</div>`;
}
function renderLog() {
  const intro = `<div class="a"><p>你好，我按《${T.name}》（${T.cover.code}）帮你填写。证件、权属证明、报价单、聊天截图都可以直接发我，也可以用平常的话说约定。</p>
    <p class="mut">我只填你给的内容；没提到的留空问你，前后说法不一致的交给你选。</p></div>`;
  $('log').innerHTML = intro + S.log[T.id].map((e) => (e.role === 'user'
    ? `<div class="u">${e.files.length ? `<div class="thumbs">${e.files.map((f) => thumb(e.id, f)).join('')}</div>` : ''}${e.text ? `<div class="bubble">${marked(e.text, e.hits)}</div>` : ''}</div>`
    : agentHtml(e))).join('');
  $('log').scrollTop = $('log').scrollHeight;
  applySel(false);
}
function openViewer(ref) {
  const [eid, fid] = ref.split(':'), e = userEntries().find((x) => x.id === eid), f = e.files.find((x) => x.id === fid);
  const keys = [...new Set(f.hits.map((h) => h.k))];
  $('viewer').innerHTML = `<div class="vbox"><div class="vh">${KIND_ICON[f.kind]} ${esc(f.label)}<small>${esc(f.name)}</small><button class="x" id="vclose">×</button></div>
    <div class="vb"><div class="vdoc">${docHtml(f)}</div><div class="vr"><h4>AI 识别结果</h4><p class="vt">${marked(f.text, f.hits)}</p>
    <h4>填入合同 ${keys.length} 项</h4><div class="chips">${chips(keys, 'ok')}</div>
    <p class="vn">原型中识别结果为预置内容；正式版由多模态模型读取文件，输出同样带原文出处的字段。</p></div></div></div>`;
  $('viewer').hidden = false;
}
const closeViewer = () => { $('viewer').hidden = true; };

function renderSteps() {
  const res = checks(), errs = res.filter((r) => r.level === 'err').length, todo = pending().length + conflicts().length;
  const n = userEntries().length, nAI = Object.values(V()).filter((x) => x.src === 'ai' || x.conflict).length;
  const steps = [
    ['抽取', 'AI', 'ai', S.busy ? 'run' : n ? 'done' : '', S.busy ? '识别整理中…' : n ? `${nAI} 项 · 来自 ${n} 条消息` : '等你发材料'],
    ['套用范本', '代码', '', 'done', `${KEYS.length} 处空白 · 条款原文不动`],
    ['检查', '代码', '', 'done', errs ? `${errs} 项未通过` : '全部通过'],
    ['确认', '人工', 'hu', 'done', todo ? `${todo} 处待你处理` : '可以生成'],
  ];
  $('steps').innerHTML = steps.map(([name, k, cls, st, s], i) => `<div class="step ${st}"><div class="t"><span class="n">${st === 'done' ? '✓' : i + 1}</span>${name}<span class="k ${cls}">${k}</span></div>
    <div class="s ${(i === 2 && errs) || (i === 3 && todo) ? 'bad' : ''}">${s}&nbsp;</div></div>`).join('');
}

function fieldHtml(k) {
  const st = status(k), cls = (S.sel === k ? ' sel' : '') + (S.flash.has(k) ? ' flash' : '');
  if (st.kind === 'na') return `<span class="fld na${cls}" data-k="${k}">${T.na}</span>`;
  if (st.kind === 'code') return `<span class="fld code${cls}" data-k="${k}">${st.text || '由代码生成'}</span>`;
  if (st.kind === 'conf') return `<span class="fld conf${cls}" data-k="${k}">待定：${st.x.conflict.map((c) => esc(disp(k, c.v))).join(' / ')}</span>`;
  if (st.kind === 'blank') {
    const t = F[k].t, w = t === 'date' ? '' : `size="${Math.max(4, Math.min(22, F[k].l.length * 2))}"`;
    return `<input class="ph${cls}" data-k="${k}" type="${t === 'date' ? 'date' : 'text'}" ${['int', 'num', 'money'].includes(t) ? 'inputmode="decimal"' : ''} placeholder="${esc(F[k].l)}" ${w}>`;
  }
  return `<span class="fld ${st.kind}${cls}" data-k="${k}">${esc(disp(k, st.x.v))}</span>`;
}
function choiceHtml(k) {
  const d = F[k], a = appl(k), x = V()[k], vals = x && !x.conflict ? [].concat(x.v) : [];
  const need = a && !d.opt && !vals.length, block = d.o.some((o) => o.length > 10);
  return `<span class="cg ${block ? 'block' : ''} ${need ? 'need' : ''} ${a ? '' : 'na'} ${S.sel === k ? 'sel' : ''} ${S.flash.has(k) ? 'flash' : ''}" data-k="${k}">${d.o.map((opt) => {
    const on = vals.includes(opt);
    return `<button class="opt ${on ? 'on ' + x.src : ''}" data-c="${k}" data-o="${esc(opt)}" ${a ? '' : 'disabled'}>${on ? '☑' : '□'}${esc(opt)}</button>`;
  }).join('')}</span>`;
}
const TOKEN = /[{[]\w+[}\]]/;
const para = (s) => s.split(/(\{\w+\}|\[\w+\])/).map((seg, i) => (i % 2 ? (seg[0] === '{' ? fieldHtml(seg.slice(1, -1)) : choiceHtml(seg.slice(1, -1))) : esc(seg))).join('');

function renderPaper() {
  const body = DOC.map((a) => {
    if (a.party) return `<div class="party">${a.party.map((s) => `<p>${para(s)}</p>`).join('')}</div>`;
    const ps = a.p.map((s) => `<p class="${TOKEN.test(s) ? '' : 'fx'}">${para(s)}</p>`).join('');
    if (!a.no) return `<div style="margin-top:14px">${ps}</div>`;
    return a.p.some((s) => TOKEN.test(s)) ? `<h3>${a.no} ${a.t}</h3>${ps}`
      : `<details class="art"><summary>${a.no} ${a.t}<small>固定条款 · 无空白 · 点击展开</small></summary>${ps}</details>`;
  }).join('');
  $('paper').innerHTML = `<div class="paper">
    <div class="cover"><div class="gf">${T.cover.code}</div><h1>${T.cover.title}</h1><p>（示范文本）</p></div>
    ${body}<div class="sign">${T.sign}</div><div class="att">${T.attNote}</div></div>`;
}

function renderSide() {
  const res = checks(), p = pending(), cf = conflicts(), ic = { ok: '✓', warn: '!', err: '✕' };
  const selArt = S.sel ? ART[S.sel] : null, todo = [...cf, ...p];
  $('side').innerHTML = `
    <section><h3>检查<span class="k">代码</span></h3>
      ${res.map((r) => `<button class="chk ${r.level}" ${r.k ? `data-go="${r.k}"` : ''}><span class="ic">${ic[r.level]}</span><span>${r.t}</span><span class="d">${esc(r.d)}</span></button>`).join('')}
    </section>
    <section><h3>需要双方确认 · ${todo.length}<span class="sp"></span>${todo.length ? '<button id="copyq">复制问题清单</button>' : ''}</h3>
      ${todo.length ? todo.map((k) => `<button class="pend" data-go="${k}"><span>${ART[k]}</span>${esc(F[k].l)}${cf.includes(k) ? ' <b style="color:var(--err);font-weight:500">· 前后不一</b>' : ''}</button>`).join('')
        : '<div class="none">必填项都已填写</div>'}
    </section>
    <section><h3>风险提示<span class="k">示范文本库</span></h3>
      ${T.tips.map((t) => `<div class="tip ${selArt && t.arts.includes(selArt) ? 'on' : ''}"><b>${t.t}</b><p>${t.d}</p></div>`).join('')}
      <div class="srcnote">依据<a href="${T.url}" target="_blank" rel="noopener">合同示范文本库</a>该范本页面的使用说明与风险提示整理。</div>
    </section>`;
}

function renderBar() {
  const res = checks(), errs = res.filter((r) => r.level === 'err'), warns = res.filter((r) => r.level === 'warn');
  let st;
  if (S.done[T.id]) st = `<span class="status muted">✓ 已生成 ${S.done[T.id]}</span>`;
  else if (errs.length) st = `<span class="status bad">${errs.length} 项检查未通过 · <button data-go="${errs[0].k || ''}">去处理</button></span>`;
  else st = `<span class="status ok">✓ 检查通过，可以生成${warns.length ? `<span style="color:var(--warn)"> · ${warns.length} 项提醒</span>` : ''}</span>`;
  $('bar').innerHTML = `${st}<span class="sp"></span><button class="gen" id="gen" ${errs.length ? 'disabled' : ''}>生成合同 Word</button>`;
}

function render() { renderTop(); renderLog(); renderSteps(); renderPaper(); renderSide(); renderBar(); applySel(false); if (S.pop) placePop(); }
function refreshDoc() { renderLog(); renderSteps(); renderPaper(); renderSide(); renderBar(); applySel(false); if (S.pop) placePop(); }

function applySel(scroll) {
  document.querySelectorAll('.log mark.on').forEach((m) => m.classList.remove('on'));
  if (!S.sel) return;
  const marks = [...document.querySelectorAll('.log mark')].filter((m) => m.dataset.ks.split(' ').includes(S.sel));
  marks.forEach((m) => m.classList.add('on'));
  if (scroll && marks[0]) {
    const box = $('log'), r = marks[0].getBoundingClientRect(), b = box.getBoundingClientRect();
    if (r.top < b.top + 30 || r.bottom > b.bottom - 30) box.scrollTop += r.top - b.top - b.height / 3;
  }
}
function select(k, { scroll = true } = {}) {
  S.sel = k;
  document.querySelectorAll('#paper .sel').forEach((el) => el.classList.remove('sel'));
  document.querySelectorAll(`#paper [data-k="${k}"]`).forEach((el) => el.classList.add('sel'));
  applySel(scroll); renderSide();
}
function goTo(k) {
  if (!k) return;
  const el = document.querySelector(`#paper [data-k="${k}"]`); if (!el) return;
  const sc = $('docscroll'); sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - sc.clientHeight / 3;
  select(k);
  if (el.matches('input')) { closePop(); el.focus(); } else if (!el.matches('.cg')) openPop(k); else closePop();
}

// ---------------------------------------------------------------------------
// Popover
// ---------------------------------------------------------------------------
function openPop(k) {
  S.pop = k; const st = status(k), d = F[k], orig = S.aiv[T.id][k], pop = $('pop');
  const badge = { ai: ['ai', 'AI 整理'], user: ['user', '你填写'], code: ['', '代码生成'], na: ['', `代码填“${T.na}”`], conf: ['conf', '前后不一'], blank: ['blank', '待填写'] }[st.kind];
  const srcBox = (c) => `<div class="src"><b>出自${esc(srcName(c.m))}</b>「${esc(c.q)}」</div>`;
  const input = (v) => `<input class="in" id="pin" type="${d.t === 'date' ? 'date' : 'text'}" value="${esc(v ?? '')}" placeholder="${esc(d.l)}">`;
  let body = '';
  if (st.kind === 'code') body = `<p class="note">${d.up ? `由代码根据${esc(F[d.up].l)}换算` : '由代码按约定比例计算'}，不能手改。</p>`;
  else if (st.kind === 'na' && !st.opt) body = `<p class="note">不适用：${esc(st.why || '')}。生成时由代码填“${T.na}”。</p>`;
  else if (st.kind === 'na') body = `<p class="note">选填，还没提到。留空则生成时由代码填“${T.na}”。</p>${input('')}`;
  else if (st.kind === 'conf') body = `<p class="note">前后说法不一，AI 不替你做决定。选一个：</p>${st.x.conflict.map((c, i) =>
      `<button class="cand" data-pick="${i}"><div class="v">${esc(disp(k, c.v))}</div><div class="q">${c.q ? `${esc(srcName(c.m))}「${esc(c.q)}」` : '你在合同里直接填写'}</div></button>`).join('')}`;
  else if (st.kind === 'blank') body = `<p class="note">还没提到。可以在左边告诉 Agent，也可以直接填。</p>${input('')}`;
  else if (st.kind === 'ai') body = `${srcBox(st.x)}${input(st.x.v)}`;
  else body = `${orig ? `<p class="note">AI 原值：${esc(disp(k, orig.v))}</p>` : ''}${st.x.q ? srcBox(st.x) : ''}${input(st.x.v)}
      ${orig ? '<div class="acts"><button id="restore">恢复 AI 结果</button></div>' : ''}`;
  pop.innerHTML = `<div class="h">${esc(label(k))}<span class="badge ${badge[0]}">${badge[1]}</span><button class="x" id="pclose">×</button></div>${body}`;
  pop.hidden = false; placePop();
  const pin = $('pin'); if (pin && st.kind !== 'ai') pin.focus();
}
function placePop() {
  const el = document.querySelector(`#paper [data-k="${S.pop}"]`), pop = $('pop');
  if (!el) { closePop(); return; }
  const box = $('docinner').getBoundingClientRect(), r = el.getBoundingClientRect();
  pop.style.top = `${r.bottom - box.top + 6}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left - box.left, box.width - 348))}px`;
}
function closePop() { S.pop = null; $('pop').hidden = true; }
function setVal(k, v, extra = {}) { V()[k] = { v: F[k].t === 'multi' ? v : String(v).trim(), src: 'user', ...extra }; delete S.done[T.id]; }

// ---------------------------------------------------------------------------
// Flow + events
// ---------------------------------------------------------------------------
function openTpl(id) {
  useTpl(id); S.sel = null; S.att = []; S.picker = false; closePop(); closeViewer();
  history.replaceState(null, '', `?tpl=${id}`);
  $('docscroll').scrollTop = 0; render();
  if (!S.played[id] && !S.busy) play(id);
}
function resetTpl(demo) {
  if (S.busy) return;
  S.vals[T.id] = {}; S.aiv[T.id] = {}; S.log[T.id] = []; delete S.done[T.id]; S.played[T.id] = !demo; openTpl(T.id);
}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1600); }

document.addEventListener('click', (ev) => {
  const t = ev.target;
  const tb = t.closest('[data-tpl]'); if (tb) { openTpl(tb.dataset.tpl); return; }
  const sm = t.closest('[data-sample]'); if (sm) { const box = $('input'); box.value = T.replies[+sm.dataset.sample].text; box.focus(); return; }
  if (t.closest('#send')) { send(); return; }
  if (t.closest('#reset')) { resetTpl(false); return; }
  if (t.closest('#replay')) { resetTpl(true); return; }
  if (t.closest('#clip')) { S.picker = !S.picker; renderComposer(); return; }
  const at = t.closest('[data-att]'); if (at) { const f = at.dataset.att; S.att = S.att.includes(f) ? S.att.filter((x) => x !== f) : [...S.att, f]; renderComposer(); return; }
  const un = t.closest('[data-unatt]'); if (un) { S.att = S.att.filter((x) => x !== un.dataset.unatt); renderComposer(); return; }
  if (S.picker && !t.closest('#picker')) { S.picker = false; renderComposer(); }
  const vw = t.closest('[data-view]'); if (vw) { openViewer(vw.dataset.view); return; }
  if (t.closest('#vclose') || t.id === 'viewer') { closeViewer(); return; }
  if (t.closest('#viewer [data-go]')) { closeViewer(); }
  if (t.closest('#pop')) {
    const k = S.pop;
    if (t.closest('#pclose')) { closePop(); return; }
    const pick = t.closest('[data-pick]');
    if (pick) { const c = V()[k].conflict[+pick.dataset.pick]; setVal(k, c.v, { m: c.m, q: c.q }); refreshDoc(); openPop(k); return; }
    if (t.closest('#restore')) { const a = S.aiv[T.id][k]; V()[k] = { ...a, src: 'ai' }; refreshDoc(); openPop(k); }
    return;
  }
  const opt = t.closest('.opt');
  if (opt && !opt.disabled) {
    const k = opt.dataset.c, val = opt.dataset.o, x = V()[k];
    if (F[k].t === 'multi') { const cur = x && !x.conflict ? [...x.v] : []; setVal(k, cur.includes(val) ? cur.filter((y) => y !== val) : [...cur, val]); }
    else setVal(k, x && x.v === val ? '' : val);
    S.sel = k; closePop(); refreshDoc(); applySel(true); return;
  }
  const fld = t.closest('#paper .fld');
  if (fld) { select(fld.dataset.k); openPop(fld.dataset.k); return; }
  const mk = t.closest('.log mark');
  if (mk) { goTo(mk.dataset.ks.split(' ')[0]); applySel(false); return; }
  const go = t.closest('[data-go]');
  if (go) { goTo(go.dataset.go); return; }
  if (t.closest('#copyq')) {
    const items = [...conflicts(), ...pending()];
    const text = `《${T.name}》以下内容还没有约定或前后说法不一，请双方确认：\n${items.map((k, i) => `${i + 1}. ${label(k)}`).join('\n')}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    toast(`已复制 ${items.length} 个问题`); return;
  }
  if (t.closest('#gen')) {
    if (checks().some((r) => r.level === 'err')) return;
    const n = new Date(); S.done[T.id] = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
    toast('已生成 Word（模拟）'); renderBar(); return;
  }
  if (!t.closest('input.ph') && S.pop) closePop();
});
document.addEventListener('focusin', (ev) => { if (ev.target.matches('#paper input.ph')) { closePop(); select(ev.target.dataset.k); } });
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'pin') { setVal(S.pop, t.value); renderSteps(); renderSide(); renderBar(); return; }
  if (t.matches('#paper input.ph') && t.type !== 'date') t.size = Math.max(4, t.value.length * 2 + 1);
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'pin') { const k = S.pop; setVal(k, t.value); refreshDoc(); return; }
  if (t.matches('#paper input.ph') && t.value.trim()) { const k = t.dataset.k; setVal(k, t.value); refreshDoc(); select(k, { scroll: false }); }
});
document.addEventListener('keydown', (ev) => {
  if (ev.target.id === 'input' && ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); send(); return; }
  if (ev.key === 'Escape' && !$('viewer').hidden) { closeViewer(); return; }
  if (ev.key === 'Escape' && S.pop) { closePop(); return; }
  if (ev.key === 'Enter' && ev.target.matches('#pin, #paper input.ph')) { ev.preventDefault(); ev.target.blur(); if (ev.target.id === 'pin') closePop(); }
});

// Boot
Object.assign(S, { att: [], picker: false, played: {}, sync: false });
TPLS.forEach((t) => { S.vals[t.id] = {}; S.aiv[t.id] = {}; S.log[t.id] = []; });
const QS = new URLSearchParams(location.search), startTpl = QS.get('tpl');

// ---------------------------------------------------------------------------
// Tour mode (?tour=1): driven by the slide deck in the blog post. Each slide
// rebuilds its state synchronously from scratch, so slides work in any order.
// ---------------------------------------------------------------------------
function stage(tid, { replies = [], pick = {}, view, pop, sel, scroll } = {}) {
  S.sync = true; S.busy = false; S.flash = new Set();
  useTpl(tid); S.vals[tid] = {}; S.aiv[tid] = {}; S.log[tid] = []; delete S.done[tid]; S.played[tid] = true;
  T.script.forEach((st) => turn(st.text, st.files));
  replies.forEach((i) => turn(T.replies[i].text, []));
  Object.entries(pick).forEach(([k, i]) => { const c = V()[k].conflict[i]; setVal(k, c.v, { m: c.m, q: c.q }); });
  S.flash.clear(); S.sync = false;
  openTpl(tid); history.replaceState(null, '', location.pathname + location.search);
  if (sel) { goTo(sel); if (!pop) closePop(); }
  if (scroll) $('log').scrollTop = 0;
  if (view) openViewer(userEntries()[view[0]].id + ':' + view[1]);
}
const TOUR = {
  layout: { run: () => stage('lease', { scroll: true }), hl: ['.log .thumbs', '#steps'] },
  files: { run: () => stage('lease', { view: [0, 'cert'] }), hl: ['.vr .vt', '.vr .chips'] },
  source: { run: () => stage('lease', { sel: 'proofNo', pop: true }), hl: ['#pop', '.log mark.on'] },
  code: { run: () => stage('lease', { sel: 'rentUp', pop: true }), hl: ['#pop', '.fld.code'] },
  ask: { run: () => stage('lease'), hl: ['.log .a:last-child .ask'] },
  conflict: { run: () => stage('lease', { replies: [0, 1], sel: 'start', pop: true }), hl: ['#pop', '.log .chip.conf'] },
  checks: { run: () => stage('car'), hl: ['.log .warnbox', '.chk.err[data-go="bal"]'] },
  law: { run: () => stage('reno'), hl: ['.log .a:last-child .warnbox', '.chk.err[data-go="warranty"]', '.chk.err[data-go="end"]'] },
  na: { run: () => stage('car', { replies: [0], sel: 'contractNo', pop: true }), hl: ['#pop', '.fld.na'] },
  done: { run: () => stage('car', { replies: [0, 1], pick: { price: 1 } }), hl: ['#side section:first-child', '#gen'] },
};
if (QS.has('tour')) {
  document.body.classList.add('tour');
  Element.prototype.scrollIntoView = function () {};
  HTMLElement.prototype.focus = function () {};
  addEventListener('message', (ev) => {
    if (ev.source !== parent || ev.data?.tour !== 'step') return;
    const st = TOUR[ev.data.id]; if (!st) return;
    document.querySelectorAll('.hl').forEach((el) => el.classList.remove('hl'));
    st.run();
    st.hl.forEach((sel) => document.querySelectorAll(sel).forEach((el) => el.classList.add('hl')));
  });
  stage('lease');
  parent.postMessage({ tour: 'ready' }, '*');
} else {
  openTpl((TPLS.find((t) => t.id === startTpl) || TPLS[0]).id);
}
