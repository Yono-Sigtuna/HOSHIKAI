/* 星海社 · 主题（明/暗）+ 流星过渡 + 星空背景
   首页与板块页共用。指数：
     - 首屏防闪烁由 <head> 里的内联脚本负责（见 index.html），这里只管运行期逻辑
     - 主题存在 localStorage，**首次一律亮色**（原来跟随系统 prefers-color-scheme，
       但本站的插画 / CG / 配色是亮色优先设计的，用户否掉了「默认暗色」） */

const THEME_KEY = 'hoshikai:theme';
const rootEl = document.documentElement;
const prefersReduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const themeNow = () => (rootEl.dataset.theme === 'dark' ? 'dark' : 'light');

/* ---------- 星空背景 ----------
   只在正文两侧的留白区画。暗色主题下星星更亮更多（真的成了夜空）。
   ⚠️ 那条留白的宽度是**先划出来的**：CSS 的 `--wrap-gutter` = 2 ×(`--sky-band` + `--sky-inset`)，
   内容栏取 `100% - var(--wrap-gutter)`。所以栏宽怎么涨，这条带子都不会被吃掉。 */
(function starfield() {
  const cv = document.querySelector('#sky');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const online = (typeof FORUM !== 'undefined' && FORUM.stats) ? FORUM.stats.online : 320;
  let stars = [], w = 0, h = 0, raf = 0, dark = themeNow() === 'dark';

  function build() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* ⚠️ **内容栏宽度从 DOM 量，不在这里再写一遍 1240**（第 33 轮加宽到 1400 时改的）。
       以前这里是 `Math.min(1240, w - 40)`，与 CSS 的 `.wrap` 是**两份事实**：
       只改 CSS 不改这里，星星会当场画到新加宽的内容底下 —— 正好是下面那条注释警告的坑。
       而且这个 bug **看不出来**：卡片是不透明的（`--surface` 是实色），星星被盖住，
       只有**卡片之间那条窄缝**里会冒出几颗孤点，像屏幕上的灰，不像「忘了改」。
       现在唯一的来源是 `.wrap` 的实测宽（CSS 里由 `--wrap-w` / `--wrap-gutter` 决定）。 */
    const wrapEl = document.querySelector('main.wrap') || document.querySelector('.wrap');
    const contentW = wrapEl && wrapEl.getBoundingClientRect().width > 0
      ? Math.round(wrapEl.getBoundingClientRect().width)
      : Math.min(1400, w - 104);                       // 布局还没就绪时的兜底，与 CSS 同口径
    const css = getComputedStyle(rootEl);
    const inset = parseFloat(css.getPropertyValue('--sky-inset')) || 8;
    const minBand = parseFloat(css.getPropertyValue('--sky-band')) || 44;
    const band = (w - contentW) / 2 - inset;
    if (band < minBand) { stars = []; return; }

    // 亮星数随在线人数缩放；暗色下再乘 1.6（夜空本来就该更热闹）
    const bright = Math.round((6 + 14 * Math.min(1, online / 400)) * (dark ? 1.6 : 1));
    const n = Math.round((band * 2 * h) / (dark ? 6500 : 9000));
    stars = Array.from({ length: n }, (_, i) => ({
      x: Math.random() < .5 ? Math.random() * band : w - Math.random() * band,
      y: Math.random() * h,
      r: i < bright ? 1.5 + Math.random() * 1.2 : Math.random() * .9 + .35,
      a: (dark ? .45 : .3) + Math.random() * .45,
      sp: .0006 + Math.random() * .0022,
      ph: Math.random() * Math.PI * 2,
      gold: Math.random() < .3,
      par: .01 + Math.random() * .05,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const y = scrollY || 0;
    for (const s of stars) {
      const tw = prefersReduce() ? 1 : .55 + .45 * Math.sin(t * s.sp + s.ph);
      const py = (s.y - y * s.par) % h;
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = dark
        ? (s.gold ? '#ffe7a3' : '#ffffff')
        : (s.gold ? '#c9982f' : '#3d63d6');
      ctx.beginPath();
      ctx.arc(s.x, py < 0 ? py + h : py, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop(t) { draw(t || 0); raf = requestAnimationFrame(loop); }
  function restart() {
    cancelAnimationFrame(raf);
    dark = themeNow() === 'dark';
    build();
    if (prefersReduce()) draw(0); else raf = requestAnimationFrame(loop);
  }

  build();
  if (prefersReduce()) draw(0); else raf = requestAnimationFrame(loop);

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(restart, 180); });
  addEventListener('themechange', restart);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden && !prefersReduce()) raf = requestAnimationFrame(loop);
  });
})();

/* ---------- 暮色幕 + 流星 ----------
   替掉原来的「旧主题纯色铺满整屏 + clip-path 硬边收缩」：那一下是整屏纯黑/纯白 + 一条硬边，
   最刺眼的两样全占了。现在是从按钮位置长出一层**羽化**的暮色幕（亮→暗=黄昏，暗→亮=拂晓），
   主题在幕铺满那一刻（66%）才切 —— 那一帧的跳变被幕完全挡住；幕再淡出，露出新主题。
   流星在幕上掠过，配色随方向走（暗→亮时白流星压在淡色拂晓幕上会看不见）。
   总时长 820ms。reduced-motion 下整段跳过、直接切。详见 style.css 的 .fx__veil。 */
const VEIL_MS = 820;        // 必须与 style.css 的 fxVeil 动画时长一致
const SWAP_AT = 0.66;       // 幕铺满的时刻（scale 到 1 在 62%、不透明撑到 72%）
// 倾角用负值：头部在元素左端、尾巴向右，逆时针倾斜才指左下，与 translate(-x,+y) 同向
const METEORS = [
  { x: '74%', y: '3%',  d: 0,    len: 210, ang: -22 },
  { x: '92%', y: '15%', d: 110,  len: 150, ang: -27 },
  { x: '58%', y: '9%',  d: 230,  len: 175, ang: -19 },
  { x: '86%', y: '27%', d: 340,  len: 125, ang: -30 },
];

let fxEl = null, fxTimer = 0, pending = null;   // pending = { t, next }

/* 真正的状态切换（无动画）。单独拆出来是为了「连点」时能把没落地的那一轮立刻落地 ——
   否则 themeNow() 还是旧值，下一次点击会算出相反的目标，主题就错位了。 */
function applyTheme(next) {
  rootEl.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* 隐私模式下写不了，忽略 */ }
  dispatchEvent(new CustomEvent('themechange', { detail: next }));
}

function flushPending() {
  if (!pending) return;
  clearTimeout(pending.t);
  const nx = pending.next;
  pending = null;
  applyTheme(nx);
}

function runFx(btn, next) {
  if (fxEl) { fxEl.remove(); fxEl = null; }     // 上一轮的残幕先收掉，别叠层
  clearTimeout(fxTimer);

  const fx = document.createElement('div');
  fx.className = 'fx fx--to-' + next;
  fx.setAttribute('aria-hidden', 'true');

  const veil = document.createElement('div');
  veil.className = 'fx__veil';
  if (btn) {
    const r = btn.getBoundingClientRect();
    veil.style.setProperty('--wx', (r.left + r.width / 2) + 'px');
    veil.style.setProperty('--wy', (r.top + r.height / 2) + 'px');
  }
  fx.appendChild(veil);

  METEORS.forEach((m) => {
    const el = document.createElement('i');
    el.className = 'fx__meteor';
    el.style.cssText = `--mx:${m.x};--my:${m.y};--md:${m.d}ms;--ml:${m.len}px;--ma:${m.ang}deg`;
    fx.appendChild(el);
  });

  document.body.appendChild(fx);
  fxEl = fx;

  // 幕铺满时切主题。星场 canvas 会在 themechange 里重建 —— 那一刻正好被幕盖住，所以看不到闪。
  pending = { next, t: setTimeout(() => { pending = null; applyTheme(next); }, VEIL_MS * SWAP_AT) };
  fxTimer = setTimeout(() => { if (fxEl === fx) { fx.remove(); fxEl = null; } }, 1600);
}

function setTheme(next, btn) {
  flushPending();                       // 上一轮还没切完的，先落地
  if (next === themeNow()) return;
  if (prefersReduce()) { applyTheme(next); return; }
  runFx(btn, next);
}

/* ---------- 绑定顶栏按钮 ---------- */
(function wire() {
  const btn = document.querySelector('#themeTg');
  if (!btn) return;
  const sync = () => {
    const isDark = themeNow() === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? '切换到日间模式' : '切换到夜间模式');
  };
  sync();
  btn.addEventListener('click', () => setTheme(themeNow() === 'dark' ? 'light' : 'dark', btn));
  addEventListener('themechange', sync);
})();

/* ---------- 天象层：夜间流星 / 日间云影 ----------
   夜间那道拖尾是 v3p 的 `.shoot` 原样搬来的（同一串参数：x / y / 角度 / 周期 / 延迟）。
   日间不是另一个形状，而是**同一次一闪换一种光**：夜里暖白、日里金（金在浅底上有对比，白没有）。
   之前做过一版「日晕弧」，因为**常驻**被否 —— 用户要的就是「像流星这种短暂的」。
   ⚠️ 三条流星的位置避开了顶栏（y ≥ 10%）：顶栏 z50 会盖住它，贴着顶端飞等于白飞。 */
(function skyfx() {
  if (document.querySelector('.skyfx')) return;
  const host = document.createElement('div');
  host.className = 'skyfx';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML =
    [[62, 14, 32, 13, 1.5], [78, 26, 28, 17, 6.5], [40, 10, 38, 19, 11]]
      .map(([x, y, a, dur, del]) => `<span class="shoot" style="--x:${x}%;--y:${y}%;--a:${a}deg;--dur:${dur}s;--del:${del}s"></span>`).join('')
  const sky = document.querySelector('#sky');
  if (sky && sky.parentNode) sky.parentNode.insertBefore(host, sky.nextSibling);
  else document.body.insertBefore(host, document.body.firstChild);
})();
