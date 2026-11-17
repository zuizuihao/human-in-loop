// ===========================================================================
// Engine. A template is: fields, clause text (DSL), applicability, code-computed
// values, rules, risk tips, plus (prototype only) extraction rules and sample inputs.
//   Clause DSL: {key} = blank, [key] = □ options.
//   Field def line: key|label|type|options-or-source|opt
//   types: text int num money date upper(of key) calc choice multi id uscc vin
// The user types the deal in plain words; the agent sorts it into fields. In this
// prototype extraction is MOCKED with regex rules per template; a real build asks an
// LLM for the same {field: {value, quote}} JSON. Everything downstream is identical.
// ===========================================================================
const TPLS = [];
let T, F, WHEN, KEYS, ART, DOC;
function defineTpl(t) {
  t.F = {};
  const def = (k, l, ty = 'text', o = '', flag = '') => {
    t.F[k] = { l, t: ty, o: ty === 'choice' || ty === 'multi' ? o.split(',') : null, up: ty === 'upper' ? o : null, opt: flag === 'opt' };
  };
  if (t.pre) t.pre(def);
  t.defs.trim().split('\n').forEach((line) => { const [k, l, ty, o, f] = line.trim().split('|'); def(k, l, ty || 'text', o || '', f || ''); });
  t.KEYS = []; t.ART = {}; t.ARTT = {};
  t.DOC.forEach((a) => { if (a.no && a.t) t.ARTT[a.no] = a.t; });
  t.DOC.forEach((a) => (a.party || a.p).forEach((s) => (s.match(/\{\w+\}|\[\w+\]/g) || []).forEach((m) => {
    const k = m.slice(1, -1); if (!t.F[k]) console.warn('undefined field', t.id, k);
    t.KEYS.push(k); t.ART[k] = a.no || '首部';
  })));
  t.WHEN = t.WHEN || {}; t.CALC = t.CALC || {}; t.rules = t.rules || []; t.roles = t.roles || {};
  TPLS.push(t);
}
function useTpl(id) { T = TPLS.find((t) => t.id === id); ({ F, WHEN, KEYS, ART, DOC } = T); }

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const S = { sel: null, vals: {}, aiv: {}, log: {}, done: {}, pop: null, flash: new Set(), busy: false, seq: 0 };
const V = () => S.vals[T.id];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const g = (k) => { const x = V()[k]; return x && !x.conflict ? x.v : ''; };
const num = (k) => (F[k].t === 'calc' ? T.CALC[k]() : g(k));
const has = (k) => { const x = V()[k]; return !!x && !x.conflict && (Array.isArray(x.v) ? x.v.length > 0 : String(x.v).trim() !== ''); };
const fmtDate = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[1]}年${+m[2]}月${+m[3]}日` : s; };
const disp = (k, v) => (F[k].t === 'date' ? fmtDate(v) : Array.isArray(v) ? v.join('、') : v);
const label = (k) => `${ART[k]} · ${F[k].l}`;
const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const mins = (s) => { const m = /(\d{1,2})[:：](\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : NaN; };
const round2 = (n) => Math.round(n * 100) / 100;

function rmb(n) {
  n = Number(n); if (!isFinite(n) || n < 0) return '';
  const digit = '零壹贰叁肆伍陆柒捌玖', unit = [['元', '万', '亿'], ['', '拾', '佰', '仟']];
  let s = ''; n = Math.round(n * 100) / 100;
  ['角', '分'].forEach((f, i) => { s += (digit[Math.floor(n * 10 * 10 ** i + 1e-6) % 10] + f).replace(/零./, ''); });
  s = s || '整'; let x = Math.floor(n);
  for (let i = 0; i < unit[0].length && x > 0; i++) {
    let p = ''; for (let j = 0; j < unit[1].length && x > 0; j++) { p = digit[x % 10] + unit[1][j] + p; x = Math.floor(x / 10); }
    s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
  }
  return s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
}
function idOk(s) {
  if (!/^\d{17}[\dX]$/.test(s)) return false;
  const W = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  return '10X98765432'[[...s.slice(0, 17)].reduce((a, c, i) => a + c * W[i], 0) % 11] === s[17];
}
function usccOk(s) {
  const A = '0123456789ABCDEFGHJKLMNPQRTUWXY', W = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
  if (!/^[0-9A-HJ-NPQRTUWXY]{18}$/.test(s)) return false;
  return A[(31 - ([...s.slice(0, 17)].reduce((a, c, i) => a + A.indexOf(c) * W[i], 0) % 31)) % 31] === s[17];
}
function vinOk(s) { // GB 16735: 17 chars, no I/O/Q, 9th char is a check digit
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(s)) return false;
  const TR = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
  const W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const r = [...s].reduce((a, c, i) => a + (/\d/.test(c) ? +c : TR[c]) * W[i], 0) % 11;
  return (r === 10 ? 'X' : String(r)) === s[8];
}

// ---------------------------------------------------------------------------
// Mock extraction (stands in for the LLM call)
// ---------------------------------------------------------------------------
const NUM = String.raw`(\d+(?:\.\d+)?|[一二两三四五六七八九十]+)`;
const DATE = String.raw`(\d{4}[年\-./]\d{1,2}[月\-./]\d{1,2}[日号]?|\d{1,2}月\d{1,2}[日号])`;
const MONEY = String.raw`(\d+(?:\.\d+)?\s*万?)`;
const R = (s) => new RegExp(s.replaceAll('{N}', NUM).replaceAll('{D}', DATE).replaceAll('{M}', MONEY), 'g');
const CN = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function cn(s) {
  if (s == null) return undefined;
  if (/^\d+(\.\d+)?$/.test(s)) return String(+s);
  if (s.includes('十')) { const [a, b] = s.split('十'); return String((a ? CN[a] : 1) * 10 + (b ? CN[b] : 0)); }
  return CN[s] === undefined ? undefined : String(CN[s]);
}
const toMoney = (s) => String(round2(parseFloat(s) * (s.includes('万') ? 10000 : 1)));
function pd(s) {
  let m = /(\d{4})[年\-./](\d{1,2})[月\-./](\d{1,2})/.exec(s), y, mo, d;
  if (m) [, y, mo, d] = m.map(Number);
  else {
    m = /(\d{1,2})月(\d{1,2})/.exec(s); if (!m) return undefined;
    [mo, d] = [+m[1], +m[2]]; const now = new Date(); y = now.getFullYear();
    if (new Date(y, mo - 1, d) < new Date(now - 60 * 864e5)) y++;
  }
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function addYears(iso, n) { const d = new Date(iso); d.setFullYear(d.getFullYear() + +n); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
const BANK = { 工行: '中国工商银行', 建行: '中国建设银行', 农行: '中国农业银行', 中行: '中国银行', 招行: '招商银行', 交行: '交通银行' };
const BANK_RE = '(中国工商银行|中国建设银行|中国农业银行|中国银行|招商银行|交通银行|工行|建行|农行|中行|招行|交行)';
const o = (...pairs) => Object.fromEntries(pairs.filter(([k, v]) => k && v !== undefined && v !== ''));
const DAYS = (pat, k) => [R(pat), (m) => ({ [k]: cn(m[1] || m[2]) })];
function roleIn(text, pos = text.length) {
  let best = null, bi = -1;
  Object.entries(T.roles).forEach(([r, d]) => d.w.split('|').forEach((w) => { const i = text.lastIndexOf(w, pos - 1); if (i > bi) { bi = i; best = r; } }));
  return best;
}
const NAME_BAD = /承担|负责|同意|支付|可|不|收取|自修|提供|要求|本人|就是|设计|电话|手机|逾期|解约|卡|出|交|付|住|是|的/;
function partyRules() {
  return Object.values(T.roles).flatMap((d) => [
    [new RegExp(String.raw`(?:${d.w})(?:是|为|：|:)?\s*([一-龥（）()]{4,30}?(?:有限责任公司|股份有限公司|有限公司))`, 'g'), (m) => o([d.name, m[1]])],
    [new RegExp(String.raw`(?:${d.w})(?:叫|是|为|：|:)?\s*([一-龥]{2,4}?)(?=[，,。；;\s]|电话|手机|身份证|$)`, 'g'), (m) => !NAME_BAD.test(m[1]) && o([d.name, m[1]])],
  ]);
}
const GENERIC = [
  [/(?<![\dA-Za-z])(\d{17}[\dXx])(?![\dA-Za-z])/g, (m, c) => o([c.R('id'), m[1].toUpperCase()], [c.R('idType'), '居民身份证'])],
  [/(?<![0-9A-Z])([0-9A-HJ-NPQRTUWXY]{18})(?![0-9A-Z])/g, (m, c) => /[A-Z]/.test(m[1].slice(0, 17)) && o([c.R('uscc'), m[1]], [c.R('idType'), '统一社会信用代码'])],
  [/护照(?:号码?)?(?:是|：|:)?\s*([A-Z]{1,2}\d{7,8})/g, (m, c) => c.R('idType') && o([c.R('id'), m[1]], [c.R('idType'), '护照'])],
  [/(?<!\d)(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})(?!\d)/g, (m, c) => o([c.R('phone'), m[1]])],
  [/([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, (m, c) => o([c.R('email'), m[1]])],
  [R(String.raw`(?:住(?:在|址|所)?|地址)(?:是|：|:)?\s*([^，,。；;\s]{4,40})`), (m, c) => o([c.R('addr'), m[1]], [c.R('mail'), m[1]])],
  [R(String.raw`(?:法人|法定代表人)(?:是|：|:)?\s*([一-龥]{2,4}?)(?=[，,。；;\s]|$)`), (m, c) => o([c.R('rep'), m[1]])],
];
const clauseAt = (seg, i) => { let a = i, b = i; while (a > 0 && !/[，,；;]/.test(seg[a - 1])) a--; while (b < seg.length && !/[，,；;]/.test(seg[b])) b++; return seg.slice(a, b); };

function extract(text) {
  const out = {};
  const put = (k, v, q) => {
    if (!k || v === undefined || v === null || v === '') return;
    if (k in out) { if (Array.isArray(out[k].v) && Array.isArray(v)) out[k].v = [...new Set([...out[k].v, ...v])]; return; }
    out[k] = { v, q };
  };
  const rules = [...partyRules(), ...GENERIC, ...T.rules];
  text.split(/[。；;！!？?\n]+/).map((s) => s.trim()).filter(Boolean).forEach((seg) => rules.forEach(([re, fn]) => {
    for (const m of seg.matchAll(re)) {
      const role = roleIn(seg, m.index + m[0].length);
      const ctx = { seg, clause: clauseAt(seg, m.index), R: (f) => role && T.roles[role][f] };
      const res = fn(m, ctx);
      if (res) Object.entries(res).forEach(([k, v]) => put(k, v, m[0].trim()));
    }
  }));
  if (T.post) T.post(out, (k) => out[k]?.v ?? (has(k) ? g(k) : ''), put);
  Object.keys(out).forEach((k) => { if (!F[k]) delete out[k]; });
  return out;
}
function feeList(t) {
  const list = [];
  if (/公共部位电|公摊电/.test(t)) { list.push('公共部位电费'); t = t.replace(/公共部位电|公摊电/g, ''); }
  [[/物业/, '物业费'], [/水/, '水费'], [/电(?!话|视)/, '电费'], [/燃气|煤气/, '燃气费'], [/网/, '网络使用费'], [/取暖|供暖|暖气/, '供暖费'],
    [/停车/, '停车管理费'], [/电话/, '电话费'], [/电视|有线/, '电视收视费'], [/卫生/, '卫生费']].forEach(([re, f]) => { if (re.test(t)) list.push(f); });
  return list;
}

