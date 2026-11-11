/* 星海社 · 帖子详情页（./topic/<tid>/）
   与首页 / 板块页各持一份小工具：三个页面不共享 JS 工具，避免为一个页面改动另一个。 */

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* ---------- 帖子头的格子条 filmstrip ----------
   同 index.html / board.js 那两份（各页不共享 JS，所以这里带一份）。
   本页装的是**板块名** —— 与板块页同一个装置、同一份语义（格子条 = 「这里是什么版块」）。
   根元素带 aria-label，每一格 aria-hidden —— 读屏听到的是「星图馆」，不是「望远镜 星 图 馆 星环」。 */
const ARC_FS = `<svg class="fs__arc" viewBox="0 28 1200 28" preserveAspectRatio="none" aria-hidden="true">
      <path class="orbit__line" d="M2 56 Q600 6 1198 56" fill="none" stroke="currentColor" stroke-width="1.5"
            vector-effect="non-scaling-stroke" stroke-linecap="round"/>
    </svg>`;
const SPARKS = `<span class="fs__sparks" aria-hidden="true"><i class="fs__spark"></i><i class="fs__spark fs__spark--b"></i></span>`;

function filmstrip(name, hue) {
  const chars = [...name];
  const tiles = chars.map((ch, i) =>
    `<span class="fs__t${i === 0 ? ' fs__t--deep' : ''}" style="--i:${i + 1}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`
  ).join('');
  const deep = (i, inner, extra = '') =>
    `<span class="fs__t fs__t--deep${extra}" style="--i:${i}" aria-hidden="true">${inner}</span>`;
  return `<span class="fs" style="--hue:${hue};--n:${chars.length + 2}" aria-label="${esc(name)}">
    <svg class="fs__tel" viewBox="0 0 76 75" aria-hidden="true"><use href="#i-telescope"/></svg>
    <span class="fs__wrap">${ARC_FS}${SPARKS}<span class="fs__bar">
      ${deep(0, '<svg viewBox="0 0 40 40"><use href="#i-telescope-tile"/></svg>')}
      ${tiles}
      ${deep(chars.length + 1, '<svg viewBox="0 0 24 24"><use href="#i-stars4"/></svg>', ' fs__t--cap')}
    </span></span>
  </span>`;
}
const hueOf = (s) => [...s].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);

/* 标签配色（`tagHue`）随标签胶囊一起退休了：标签改成流星带后不再逐条上色 ——
   与首页一样**只用两个颜色**（站里的蓝，第 1 名才换金）。颜色不承担数据，
   尾巴长度已经在表达热度，24 个色相纯属装饰而且会造成审美疲劳。 */

/* ---------- URL：?t= 优先，其次从 pathname 解析 ----------
   线上走重写：./topic/<tid>/ → topic.html?t=<tid>；但 ErrorDocument 兜底时 query 会是空的，
   所以 pathname 这条路必须留着。 */
function readKey() {
  const q = new URLSearchParams(location.search).get('t');
  if (q && q.trim()) return q.trim();
  const m = location.pathname.match(/\/topic\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : '';
}

const key = readKey();
const entry = findTopic(key);
let detail = null;
let replies = [];

/* ---------- 轨道弧（与 board.js 同一套手法） ----------
   ⚠️ 这一整段是**还原**回来的。第 19 轮我把弧连同 drawArc 一起删过，第 20 轮换成静态
   SVG，第 21 轮按用户「回到最初版」逐字还原成最初那份（`file-history` 里 9366c450dee97e31@v7）。
   列数由 auto-fill 决定，viewBox 宽度取实测像素宽（1:1），否则星点会与列错位。 */
const ARC_HEAD = `<svg class="orbit orbit--head" viewBox="0 0 1200 54" aria-hidden="true">
      <path class="orbit__line" d="M2 50 Q600 -14 1198 50" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

const SVGNS = 'http://www.w3.org/2000/svg';

function drawArc(svg, opts) {
  if (!svg || !opts.host) return;
  const host = opts.host;
  const hr = host.getBoundingClientRect();
  if (!hr.width) return;
  const W = Math.round(hr.width), H = 46, BASE = 40, APEX = -28;
  const yAt = (x) => BASE - (BASE - APEX) * 2 * (x / W) * (1 - x / W);
  const d = `M0 ${BASE} Q${(W / 2).toFixed(1)} ${APEX} ${W} ${BASE}`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  const line = svg.querySelector('.orbit__line');
  if (line) line.setAttribute('d', d);
  svg.querySelectorAll('.orbit__spark, .orbit__planet').forEach((n) => n.remove());

  /* 星点：帖子页页头没有「一排行元素」可对齐（左边一簇、右边一句），按元素锚会变成 2 颗挤在左边。
     用户 2026-11-06：「主页的大轨道还是只有 2 个十字，帖子页面的也是，就只有版块那个有 5 个」
     ⇒ 这里按**和板块页相同的节奏**等分放 5 颗（(i+0.5)/5），让三页的密度一致。 */
  const xs = Array.from({ length: 5 }, (_, i) => (i + 0.5) / 5 * W);
  xs.forEach((x, i) => {
    if (x < 0 || x > W) return;
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'orbit__spark');
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${yAt(x).toFixed(1)})`);
    g.style.transitionDelay = `${(0.32 + i * 0.07).toFixed(2)}s`;
    g.innerHTML = '<path d="M-5 0H5M0 -5V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
    svg.appendChild(g);
  });

  // 小行星：SMIL 无法用 CSS 关掉，所以只在允许动效时才注入
  if (!opts.reduce) {
    const p = document.createElementNS(SVGNS, 'g');
    p.setAttribute('class', 'orbit__planet');
    p.setAttribute('opacity', '1');
    p.innerHTML = `<animateMotion dur="24s" repeatCount="indefinite" path="${d}"/><circle r="2.4" fill="currentColor"/>`;
    svg.appendChild(p);
  }
}

/* ⚠️ `is-drawn` 必须有人加（style.css 里 `.js .orbit__line` 默认 dashoffset 1200）；
   但大弧现在是**虚线、不生长**（`.js .orbit .orbit__line` 已写死），这个类仍给星点淡入用。 */
let headIO = null;
function paintOrbits() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const head = document.querySelector('.tp__head');
  drawArc(document.querySelector('.orbit--head'), { reduce, host: head });
  if (!head || head.classList.contains('is-drawn')) return;
  /* 观察者只建一次：resize 会反复调 paintOrbits，每次都 new 一个就攒成泄漏。
     阈值给 0 + 下沿 20% 预触发，和首页 .bv 同一个理由（避免差一点点不触发）。 */
  if (!headIO) {
    headIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-drawn');
        headIO.unobserve(e.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px 20% 0px' });
  }
  headIO.observe(head);
}

let orbitRT;
addEventListener('resize', () => { clearTimeout(orbitRT); orbitRT = setTimeout(paintOrbits, 160); });

/* ---------- 提示条（所有占位交互共用） ---------- */
let toastT;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('is-on'), 2600);
}

/* ---------- 星等 ---------- */
function magHTML(t) {
  const m = magnitude(t.replies, t.views);
  return `<span class="mag mg__mag" style="--glowAmt:${magnitudeGlow(m)}" title="星等 ${m} 等 · 越小越亮">${icon('star')}<b>${m}</b>等</span>`;
}

/* ---------- ① 帖子头部（板块身份）----------
   **第 34 轮：改回「原版头部 + 一张大板块」这个结构。**
   ⚠️ 背景（别再把这条读错）：2026-10-10 用户说的「回到最初那版」指的是**这个头部**
   （弧 + 望远镜格子条 + 引句），**不是**它下面那一段信息区。大板块是同一轮用户点名要的
   （「标题 / 作者+浏览+回复+收藏 / tag 三张小卡 → 合成一张大卡，用分割线分层」），
   它跟着一起被回退是一次**把需求读成了设计**的事故：那 6 版原型每一版都自带大板块，
   彼此只差「观测证挂在哪」；观测证搬进 HUD 之后这根轴消失，**大板块却没人补回来**。

   头部只放**板块身份**（编号 / 格子条 / 子板块名 / 引句）；帖子标题在下面的大板块里，
   是页面唯一的 h1。同一个标题放两处，一屏里就会出现两次。
   ⚠️ 这一段是逐字还原最初版，来源 `file-history/9366c450dee97e31@v7`。 */
function headHTML() {
  return `<header class="bv__head tp__head">
    ${ARC_HEAD}
    <div class="bv__lead">
      <span class="bv__idx" aria-hidden="true">${String(entry.bi + 1).padStart(2, '0')}·${String(entry.si + 1).padStart(2, '0')}</span>
      ${filmstrip(entry.boardTitle, entry.hue)}
      <p class="bv__sub">${esc(entry.sectionTitle)}</p>
    </div>
    <p class="bv__quote">${icon('star')}${esc(entry.quote)}</p>
  </header>`;
}

/* ---------- ② 信息大板块（标题 · 帖子数据 · TAG 合成一张卡）----------
   ⚠️⚠️ **分割线的选材有过一次翻车，别改回去**：
     第一版我用了「弧 / 流星 / 刻度尺」—— 三条**全是站里已经用过的**：
       · 弧   = ⑤ 角度·星轨 → 头部那条弧就在它上面 30px，格子条还有一条 `.fs__arc`
       · 流星 = ④ 长度·拖尾 → 首页「热门 TAG」，**以及它正下方那条标签带本身**
       · 刻度 = ⑪ 刻度     → 立绘框那把尺、「全站第 N 帖」那把尺
     用户判词：「为什么还要有星轨元素呢？为什么又要无脑加刻度呢？你除了这 2 个，
     拿不出什么新元素去做设计了吗？」—— 这就是 §2.162「往一个地方薅羊毛」的第三次。
     修法照 §19 表头的规矩：**先定读法，再去**（家族列）**里找天然长成那个读法的元素**，
     并且**换家族**。这一版用的两族此前**全站一处都没用过**：
       · `dv--eclipse` ⑨ 遮挡·掩食 —— 一条渐隐发丝线 + 一枚带光晕的圆盘（日食环）
         读法：**一个天体挡住另一个 ⇒ 分界**。结构上是「一个**质量点**」，不是线。
       · `dv--kuiper`  ⑦ 数量·密度（柯伊伯带）—— 一条疏密不等的碎点带
         读法：**带**。结构上是「一片**点**」，不是线。
     两者**结构不同**（点是质量 / 点是场），也**都没有尾巴** —— 与下方那道有亮头的
     流星带不会再被读成同一个装置（§2.133：两版的描述互换仍成立 ⇒ 是同一根轴）。
   ⚠️ 只剩**两道**分割线：卡的下边框本来就收住了 TAG，再补一道是纯装饰（用户说「过度设计」）。 */
const DV_ECLIPSE = () => `<div class="dv dv--eclipse" aria-hidden="true">
  <i class="dv__rule dv__rule--l"></i><i class="dv__disc"></i><i class="dv__rule dv__rule--r"></i></div>`;
/* 碎点带：**确定性**摆点（不用 Math.random）—— 同一帖每次截图逐像素一致，
   探针的对比度取点也才有意义。位置/大小/透明度都由 i 的算术散列出来。 */
const DV_KUIPER = () => {
  let t = '';
  for (let i = 0; i < 34; i++) {
    const u = (i + 0.5) / 34;
    const y = 50 + ((((i * 37) % 100) / 100) - .5) * 52;
    const r = .8 + (((i * 29) % 100) / 100) * 1.6;
    const a = .18 + (((i * 53) % 100) / 100) * .5;
    t += `<i style="left:${(u * 100).toFixed(2)}%;top:${y.toFixed(1)}%;width:${r.toFixed(2)}px;height:${r.toFixed(2)}px;opacity:${a.toFixed(2)}"></i>`;
  }
  return `<div class="dv dv--kuiper" aria-hidden="true">${t}</div>`;
};

function bigBlockHTML(d) {
  const t = entry.t;
  return `<section class="mg" aria-labelledby="mgTitle">
    <div class="mg__band">
      <h1 class="mg__t" id="mgTitle">${esc(t.title)}</h1>
      <p class="mg__origin">
        ${icon('layers')}
        <a href="./forum/${entry.bi + 1}-${entry.si + 1}/">${esc(entry.boardTitle)} · ${esc(entry.sectionTitle)}</a>
        <span aria-hidden="true">·</span><span>全站第 ${entry.threadNo} 帖</span>
        <span aria-hidden="true">·</span><span>相关作品《${esc(d.work.cn)}》</span>
      </p>
    </div>
    ${DV_ECLIPSE()}
    <div class="mg__band mg__band--tight">
      <div class="mg__stats">
        <span class="mg__stat mg__stat--time" title="发表时间">${icon('clock')}<time datetime="${new Date(Date.now() - t.postedMins * 60000).toISOString()}">${esc(relTime(t.postedMins))}</time></span>
        <span class="mg__stat" title="浏览数">${icon('eye')}<b>${t.views.toLocaleString()}</b>浏览</span>
        <span class="mg__stat" title="回复数">${icon('reply')}<b id="tpMetaRep">${replies.length}</b>回复</span>
        ${magHTML(t)}
        <button class="mg__fav" id="mgFav" type="button" aria-pressed="false">${icon('star')}<span>收藏本帖</span></button>
        <div class="tpAct mg__ops" id="tpAct">
          <button class="tpAct__b" id="tpActB" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="tpActM">
            ${icon('orbit')}<span>帖子操作</span>${icon('chevron', 'i tpAct__chev')}
          </button>
          <ul class="tpAct__m" id="tpActM" role="menu" aria-labelledby="tpActB" hidden>
            ${ACTIONS.map((a) => `<li role="none"><button class="tpAct__i" type="button" role="menuitem" data-act="${a.act}">${icon(a.ic)}<span>${esc(a.label)}</span></button></li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
    ${DV_KUIPER()}
    <div class="mg__band mg__band--tight">${tagBandHTML(t)}</div>
  </section>`;
}


/* ---------- ② 话题信息条 ---------- */
/* ⚠️ 「收藏」**不在这里** —— 它是大板块统计行上一枚独立按钮（`.mg__fav`）。
   放两处会出现两个收藏控件，而它们的状态还会各说各话。 */
const ACTIONS = [
  { act: 'struct', ic: 'layers', label: '查看本贴结构' },
  { act: 'report', ic: 'flag', label: '举报本帖' },
  { act: 'edit', ic: 'edit', label: '修改本帖' },
];

/* ---------- 本帖标签带（换成主页那一道流星）----------
   只展示**帖子自己的标签**。之前这里把作品类型（`d.types`）也拼进来取前 4 个，
   于是第 3、4 个位置常常是「ADV / 恋爱」这类**类型**而不是标签 —— 类型属于
   「作品信息」的「类型」那一行，不该在这里冒充标签。

   装置与首页「热门 TAG」是同一个：一条流星，**尾巴长度 = 热度**，亮头在右。
   热度来自 `shared/threads.js` 的 `tagHeat()` —— 唯一的统计来源，所以同一个标签
   在主页和这里**一样长**，这条长度轴才是真的。

   ⚠️ 和主页有两处**有意的不同**：
     · **不带名次**。主页那条是排行榜（名次 1 在最左）；本帖的标签没有先后，
       给它们编个「第几热」是假信息。
     · 尾巴说的是这个标签**在全站的体量**，不是「本帖里有几个」。title 与 aria
       都写明「全站 N 帖」，免得被读成后者。
   ⚠️ 标签**不再折叠**（用户要求始终显示全部）：所以没有 +N 按钮、没有 `.is-extra`，
       `wire()` 里那段展开逻辑也一并删了。20~30 个标签靠 flex-wrap 自己铺几行。 */
function tagBandHTML(t) {
  const all = t.tags || [];
  if (!all.length) return '';
  const H = typeof tagHeat === 'function' ? tagHeat() : null;
  return `<section class="tpTags" aria-label="本帖标签">
    <div class="shower" role="list">
      <div class="shower__row">
        ${all.map((g, i) => {
          const n = H ? H.countOf(g) : 0;
          const w = H ? H.width(g).toFixed(1) : '28';
          return `<a class="shower__m" role="listitem" href="./tag/${encodeURIComponent(g)}/"
                  style="--i:${i};--w:${w}px"
                  title="${esc(g)} · 全站 ${n} 帖"
                  aria-label="${esc(g)}，全站 ${n} 帖">
            <span class="shower__streak" aria-hidden="true"><i class="shower__tail"></i><i class="shower__head"></i></span>
            <span class="shower__nm" aria-hidden="true">${esc(g)}</span>
          </a>`;
        }).join('')}
      </div>
    </div>
  </section>`;
}

/* ⚠️ **原来的「话题信息条」（`metaHTML` / `.tpMeta`）第 34 轮整条删掉了** ——
   时间 / 浏览 / 回复 / 星等 / 帖子操作 全部搬进上面那张大板块（`bigBlockHTML` 的 `.mg__stats`）。
   它曾经是一张**独立的小卡**，于是「标题 / 数据 / TAG」在屏幕上是三张各带边框的卡；
   用户点名要的是**合成一张大卡、用分割线分层**。
   ⚠️ 作者仍然不在这里（搬去了底部 HUD 的名牌）—— 与这次合并是两件事，别混。 */

/* ---------- ③ 作品信息卡 ---------- */
const infoRows = (d) => [
  ['原名', d.work.jp], ['中文名', d.work.cn], ['会社', d.work.maker], ['发售日', d.release],
  ['类型', d.types.join(' / ')], ['时长', d.hours], ['平台', d.platform],
  /* ⚠️ 「评分」这一行**读的是评分表的真实平均**（`rateAvg`），不是 `d.score`。
     站点最讨厌「两个地方说两个数」—— 评分板块里那条平均线、与这一行，**必须是同一个数**。
     `d.score` 退居为「打分的中心值」，不再直接显示。 */
  ['评分', rateAvg(d.ratings, parseFloat(d.score)).toFixed(1)],
];
/* ⚠️ 只列「作品信息」**没有**的字段。
   原先这里是 `[...infoRows(d), ...六项]` —— 前 8 行与「作品信息」是**同一个函数、
   同一份数据源、同一个渲染器**，逐字重复（用户要求删掉重复的那 8 行）。
   删完这里剩 6 项，于是这一节不再是「完整版信息表」，下面的说明文案也一并改了。 */
const fullRows = (d) => [
  ['语音', d.voice], ['剧本', d.script], ['原画', d.art], ['音乐', d.music],
  ['语言', '日语 · 含汉化补丁'], ['容量', d.size],
];
const dlHTML = (rows) => `<dl class="tpInfo">
  ${rows.map(([k, v]) => `<div class="tpInfo__r">
    <dt>${esc(k)}</dt><dd${k === '评分' ? ' class="is-score" data-score' : ''}>${esc(v)}</dd>
  </div>`).join('')}
</dl>`;

function infoCardHTML(d) {
  return `<section class="tpCard" aria-labelledby="tpInfoCap">
    <div class="panel__head">
      <h2 class="panel__title" id="tpInfoCap">${icon('layers')}作品信息</h2>
      <span class="panel__line"></span>
      <span class="tpCard__no">GAL INFO</span>
    </div>
    ${dlHTML(infoRows(d))}
  </section>`;
}

/* ---------- ④ 可折叠章节（原生 details，零 JS 就有键盘与无障碍支持） ----------
   五章全部默认展开（open=true）：折叠起来要点五次才看得全，阅读是断的；
   summary 仍然可点，想收起的用户自己收。 */
function chapHTML(n, title, sub, body, open) {
  return `<details class="tpChap"${open ? ' open' : ''}>
    <summary class="tpChap__s">
      <span class="tpChap__n" aria-hidden="true">${String(n).padStart(2, '0')}</span>
      <span class="tpChap__t">${esc(title)}</span>
      <span class="tpChap__x">${esc(sub)}</span>
      ${icon('chevron', 'i tpChap__chev')}
    </summary>
    <div class="tpChap__b">${body}</div>
  </details>`;
}

/* 内嵌媒体位：没有视频文件，做成海报 + 播放按钮 —— 与首页 .op 同一手法、同一套类 */
const openingBodyHTML = (d) => `<section class="op tpOp" aria-label="开场动画">
  <div class="op__poster">
    <button class="op__play" type="button" data-ph="开场动画" aria-label="播放开场动画">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
    </button>
    <p class="op__name">${esc(d.work.jp)} · OPENING</p>
    <p class="op__hint">演示页未附带视频文件 —— 把 <code>op/opening.mp4</code> 放进去即可播放</p>
  </div>
</section>`;

/* 正文里那几颗闪烁的星星（GALBase 在正文中用 gs-star-twinkle，这里沿用同一做法） */
const starSpan = (i) => `<span class="tpStar" aria-hidden="true" style="--twd:${(-0.9 * (i + 1)).toFixed(2)}s">✦</span>`;

const introBodyHTML = (d) => `<p class="tpProse">${d.intro
  .map((s, i) => esc(s) + (d.introStars.includes(i + 1) ? starSpan(i) : '')).join('')}</p>`;

/* 角色表：精简卡列。
   ⚠️ **不做立绘** —— 站里一张人形图形都没有（`covers/` 那 38 张全是同心环 + 金十字 + 星点，
   搜人形关键词零命中）。硬造会违「从站内母题长出来」这条纪律，所以用
   **大号首字色块圆盘**（`.av` 的配方 ﹣ 全站表达「一个人」的既有方式）+ 色相。
   色相 = `hueOf(角色名)`，与全站作者头像同一条规则：同名的角色永远同一个颜色。 */
const castBodyHTML = (d) => `<ul class="tpCast">
  ${d.cast.map((c) => `<li class="tpChar">
    <span class="av tpChar__av" style="--ah:${hueOf(c.name)}" aria-hidden="true">${esc([...c.name][0])}</span>
    <div class="tpChar__b">
      <p class="tpChar__n"><b>${esc(c.name)}</b><span class="tpChar__k">${esc(c.kana)}</span></p>
      <p class="tpChar__m">
        <span class="tpChar__role" style="--th:${hueOf(c.name)}">${esc(c.role)}</span>
        <span class="tpChar__cv">CV. ${esc(c.seiyuu)}</span>
      </p>
      <p class="tpChar__line">${esc(c.line)}</p>
    </div>
  </li>`).join('')}
</ul>`;

const gameInfoBodyHTML = (d) => `<p class="tpProse tpProse--tight">作品信息里已经列过的（原名 / 会社 / 发售日 / 类型 / 平台 / 评分）这里不再重复，只补制作阵容与容量，供下载前参考。</p>${dlHTML(fullRows(d))}`;

/* ⚠️ 2026-10-11：截图从**程序化渐变**换成站里**真实的 7 张 CG**（`bgs/bg-1..7.avif`）。
   为什么可以换：那 6 个标题（`TP_SHOT_CAPS`）本来就是 CG 名，而站里**只有**这 7 张真图
   （`covers/` 是 38 张程序化封面、立绘 1 张）。用**已有的 `s.seed`** 取模选一张 ——
   **不新增任何 `rnd()` 消费**，所以 `shared/topic.js` 那条确定性契约一个字节都没动。
   `onclick="viewer(this)"` 就是看图窗的**对外接口**（HTML 里写一个属性就能唤醒，见 viewer.js）；
   键盘可达性由 viewer.js 挂载时自动补（`<li>` 天生不可聚焦，它会给它补 tabindex/role/回车）。
   ⚠️ 路径**必须绝对**（`./bgs/…`，与 `board.js` 的 `COVER_DIR = './covers/'` 同一条纪律）：
      帖子页线上走的是干净 URL `./topic/698/`，写相对的 `bgs/…` 会被解析成
      `./topic/698/bgs/…` ⇒ **404**。我第一版就写成了相对的，表现是「图全没加载」——
      而且**页面不报任何错**，只有探针里那条 src 断言抓得到。
   ⚠️ 补这段注释时我把开头的注释开启符漏了、只写了收尾那个（而且是**字面写出来的**）——
      它当场就把上一条注释闭合掉了，后面几行成了裸 JS ⇒ 整页语法错误。
      **这就是 memories §2.118 那条**：注释定界符要成对，而且**注释正文里不许再出现定界符本身**。
      （讽刺的是我当天刚为同一类错写了检查脚本 `_csscom.js`，但它只扫 CSS。） */
const CG_DIR = './bgs/', CG_N = 7;
/* ⚠️ 取图**不能用「各自取模」**（`seed % 7`）—— 那是**有放回**的抽法，池子只有 7 而这一节有 6 格，
   实测直接撞了：第 4 张和第 5 张成了同一张 CG（memories §2.129 那条「小池子随机取必然撞」）。
   ⇒ 改成**起点 + 递增**：`(start + i) % 7`。6 < 7 ⇒ 这一段六格**一定互不相同**，
   而 `start` 仍由 tid 决定 ⇒ 不同帖子看到的顺序不同、同一帖子永远一致（确定性契约不破）。 */
const cgStart = (d) => (d.shots.length ? (d.shots[0].seed % CG_N) : 0);
const cgOf = (d, i) => `${CG_DIR}bg-${1 + (cgStart(d) + i) % CG_N}.avif`;
const shotsBodyHTML = (d) => `<ul class="tpShots">
  ${d.shots.map((s, i) => `<li class="tpShot" data-cap="${esc(s.cap)}" onclick="viewer(this)">
    <img class="thumb tpShot__im" src="${cgOf(d, i)}"
         alt="${esc(s.cap)}" loading="lazy" decoding="async">
    <span class="tpShot__cap"><b aria-hidden="true">${String(i + 1).padStart(2, '0')}</b>${esc(s.cap)}</span>
  </li>`).join('')}
</ul>`;

const downloadBodyHTML = (d) => `<p class="tpProse">${esc(d.dlNote)}</p>
<ul class="tpDl">
  ${d.dlLinks.map((l) => `<li><a class="tpDl__a" href="#" data-ph="${esc(l.label)}">
    ${icon('download')}<span class="tpDl__t">${esc(l.label)}</span><span class="tpDl__n">${esc(l.note)}</span>
  </a></li>`).join('')}
</ul>
<p class="tpDl__warn">演示环境 · 以上均为占位链接，点击只做提示，不会跳转。</p>`;

/* ---------- ④b 评分 / 短评（第 32 轮）----------
   用户要的是 galbase 那种板块：**评分图标 · 平均分线 · 短评 · 可操控自己的评分**。
   参考页 https://galbase.top/topic/507 的结构已核过（`#rate` 两栏 + 柱状图 + 平均值滑标）。

   站内化处理（一个图形都没新造）：
     · **评分图标** = 10 枚**星点**（圆点）—— 站点 `.orbit` 上钉的就是圆点，不是那枚四角星芒；
     · **柱状图** = 每次评分一根柱，高度走 **0–10 的真实刻度**（**不截轴** —— 截了会把差距夸大，骗人）；
     · **平均分线** = 一条横线 + 数值压在柱状图上（galbase 那个 `#slider` 是同一件事）；
     · 头像用 `.av`（全站表达「一个人」的既有方式，同名同色）。
   ⚠️ **没有后端**：自己的评分只写 `localStorage`，界面上**明说**这件事（站点的诚实空态纪律）。
   ⚠️ **一处事实来源**：这个平均分同时喂给本板块与「作品信息」的「评分」行，两边永不说两个数。 */
const RATE_KEY = () => 'hoshikai:rate:' + (entry && entry.t && entry.t.tid ? entry.t.tid : 'x');
const rateStore = {
  get() { try { const v = localStorage.getItem(RATE_KEY()); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(v) {
    try { if (v) localStorage.setItem(RATE_KEY(), JSON.stringify(v)); else localStorage.removeItem(RATE_KEY()); } catch (e) {}
  },
};
const rateRows = (d) => {
  const m = rateStore.get();
  return m ? [Object.assign({}, m, { mine: true })].concat(d.ratings) : d.ratings.slice();
};

/* ⚠️ 布局照 galbase 实测（`#rate main` 是 **flex 行**，`#slider` / `#user_rate` / `#self_rate` = 2 / 2 / 1）：
   上一版我把它写成**竖着一列**，于是「我的评分」那一行右边空了六百多像素 ——
   用户判词：「评分系统的右侧留白那么多干什么？你做左右设计不好吗」。
   现在：**上 = 平均分 + 柱状图（满宽）；下 = 左「历史简评」｜右「我的评分」**（两栏）。
   ⚠️ 简评卡照 galbase 收轻：galbase 的 `.card` 只有 `padding:8px` + 头像行 + 正文 + 一行小信息，
   分数**不在卡里**（在柱顶）。上一版每行塞了头像/分数/状态胶囊/时间四件 ⇒ 太重。
   这一版把**状态胶囊降级成轻文字**、头像收到 24px、行高收紧，分数保留但做小。 */
const rateBodyHTML = () => `<div class="tpRate" data-rate>
  <div class="tpRate__top">
    <p class="tpRate__avg"><b data-rate-avg>–</b><i>分</i><span data-rate-n></span></p>
    <div class="tpRate__chart" data-rate-chart aria-hidden="true"></div>
    <p class="tpRate__cap">每根柱 = 一次评分（0–10 分，按时间先后排）· 那条横线是平均分</p>
  </div>
  <div class="tpRate__cols">
    <section class="tpRate__hist" aria-label="历史简评">
      <p class="tpRate__k">历史简评</p>
      <ul class="tpRate__list" data-rate-list></ul>
    </section>
    <form class="tpRate__me" data-rate-form novalidate>
      <p class="tpRate__k">我的评分<span class="tpRate__hintn">点一下星点给分</span></p>
      <div class="tpRate__dots" data-rate-dots role="radiogroup" aria-label="给这部作品打分"></div>
      <div class="tpRate__fields">
        <label class="tpRate__f">短评
          <input class="tpRate__in" data-rate-text maxlength="60" placeholder="一句话就行（可留空）">
        </label>
        <label class="tpRate__f">态度
          <select class="tpRate__sel" data-rate-state><option>推荐</option><option>还行</option><option>不推荐</option></select>
        </label>
      </div>
      <div class="tpRate__acts">
        <button class="tpRate__sub" type="submit">提交评分</button>
        <button class="tpRate__del" type="button" data-rate-del hidden>撤销</button>
      </div>
      <p class="tpRate__warn">本站没有后端 · 你的评分只存在这台机器上，换台设备就没了。</p>
    </form>
  </div>
</div>`;

/* 渲染（提交 / 撤销之后重画一次；事件只绑一次，用 `dataset.ready` 守） */
function renderRate() {
  const host = $('[data-rate]');
  if (!host) return;
  const d = detail;
  const rows = rateRows(d);
  const avg = rateAvg(rows, parseFloat(d.score));

  /* 柱子 = **光柱**（用户：「柱状图是不是可以做天文元素处理？」）：
     柱体是一道**由下往上变亮**的渐变 —— 它是一道**光**，不是一根实心柱。
     读法：**每次评分 = 一道观测到的光，亮多少＝打了多少分**。
     ⚠️⚠️ **柱顶不许再钉一颗星**。第一版我在每根柱上贴了一颗星芒，用户判词：
        「我说星星你就全部上星星，有你这样糊弄我的啊」——
        这是 §2.162「往一个地方薅羊毛」在**同一块里**的第四次。
        星形只留给评分控件**一处**（那是用户点名要的），柱子用「光」这一族。
     ⚠️ `_rate.js` 有一条**反向断言**守着这件事：柱子里出现任何星形就红。 */
  $('[data-rate-chart]', host).innerHTML =
    rows.map((r) => `<i style="--v:${(r.score / 10).toFixed(4)}"><span class="tpRate__beam"></span></i>`).join('')
    + `<span class="tpRate__line" style="--a:${(avg / 10).toFixed(4)}"><b>${avg.toFixed(1)}</b></span>`;
  host.style.setProperty('--n', Math.max(1, rows.length));

  /* 图表**横向拖动**：柱多到放不下时要能拖（用户：「评分数据很多呢，树状图能不能拖动呢？
     galbase 那个树状图是可以拖动的」）。CSS 那边已经 `overflow-x: auto` + `cursor: grab`，
     这里补上 pointer 拖动 —— 鼠标没有触控板的横向滚动，不给拖动就只能按住 shift 滚轮。
     ⚠️ 只绑一次（`dataset.dragReady`）：`renderRate()` 提交/撤销后会重跑，
        每次都绑会叠出一堆同名监听（本站栽过）。
     ⚠️ `setPointerCapture` 会抛（合成事件没有真的指针）—— 必须包 try，否则整个 handler 断掉。 */
  const chart = $('[data-rate-chart]', host);
  if (chart && !chart.dataset.dragReady) {
    chart.dataset.dragReady = '1';
    let from = null;
    chart.addEventListener('pointerdown', (e) => {
      if (chart.scrollWidth <= chart.clientWidth) return;   // 没溢出就没什么可拖的
      from = { x: e.clientX, left: chart.scrollLeft };
      try { chart.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件，忽略 */ }
    });
    const stop = () => { from = null; };
    chart.addEventListener('pointermove', (e) => {
      if (!from) return;
      chart.scrollLeft = from.left - (e.clientX - from.x);
    });
    chart.addEventListener('pointerup', stop);
    chart.addEventListener('pointercancel', stop);
  }
  $('[data-rate-avg]', host).textContent = avg.toFixed(1);
  $('[data-rate-n]', host).textContent = `${rows.length} 人评过`;
  /* 「作品信息」那一行读**同一个数** —— 一处事实来源 */
  const cell = $('.tpInfo dd[data-score]');
  if (cell) cell.textContent = avg.toFixed(1);

  const dots = $('[data-rate-dots]', host);
  if (!dots.dataset.ready) {
    dots.innerHTML = Array.from({ length: 10 }, (_, i) =>
      `<button class="tpRate__dot" type="button" role="radio" aria-checked="false" data-v="${i + 1}" aria-label="给 ${i + 1} 分"><span class="tpRate__star" aria-hidden="true"></span></button>`).join('')
      + `<b class="tpRate__mine" data-rate-mine></b>`;
    dots.dataset.ready = '1';
  }
  const mine = rateStore.get();
  if (mine) dots.dataset.pick = String(Math.round(mine.score));
  const paint = (v) => {
    dots.querySelectorAll('.tpRate__dot').forEach((b) => {
      const bv = +b.dataset.v;
      b.classList.toggle('is-on', bv <= v);
      b.setAttribute('aria-checked', String(bv === v && v > 0));
    });
    $('[data-rate-mine]', host).textContent = v ? v + ' 分' : '还没评';
  };
  paint(+dots.dataset.pick || 0);
  dots.onclick = (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    dots.dataset.pick = b.dataset.v; paint(+b.dataset.v);
  };
  /* radiogroup 的方向键（键盘与读屏用户的预期） */
  dots.onkeydown = (e) => {
    const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1
      : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const v = Math.max(1, Math.min(10, (+dots.dataset.pick || 0) + dir));
    dots.dataset.pick = String(v); paint(v);
    const b = dots.querySelector('[data-v="' + v + '"]'); if (b) b.focus();
  };

  const form = $('[data-rate-form]', host);
  if (mine) {
    $('[data-rate-text]', host).value = mine.text === '（没写短评）' ? '' : (mine.text || '');
    $('[data-rate-state]', host).value = mine.state || '推荐';
  }
  $('[data-rate-del]', host).hidden = !mine;

  /* 简评行**压成一行**（用户：「我让你别留白那么多……压缩左侧简评啊」）：
     头像 / 名字 / 分数 / 状态 / 正文 / 时间全在同一行上，正文 `flex:1` 吃掉余宽 ——
     上一版是两行（正文单独一行），而正文只有一句二十来字，右半边整片空着。
     正文过长时省略号截断，`title` 里放全文（悬停可看）。 */
  $('[data-rate-list]', host).innerHTML = rows.map((r) => `<li class="tpRate__c${r.mine ? ' tpRate__c--me' : ''}" title="${esc(r.text)}">
    <span class="av tpRate__av" style="--ah:${hueOf(r.name)}" aria-hidden="true">${esc([...r.name][0])}</span>
    <b class="by">${esc(r.mine ? '我' : r.name)}</b>
    <span class="tpRate__sc"><b>${r.score.toFixed(1)}</b>分</span>
    <span class="tpRate__st" data-st="${esc(r.state)}">${esc(r.state)}</span>
    <span class="tpRate__x">${esc(r.text)}</span>
    <span class="tpRate__t">${r.mine ? '刚刚' : esc(relTime(r.back))}</span>
  </li>`).join('');

  if (form.dataset.ready) return;
  form.dataset.ready = '1';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = +dots.dataset.pick;
    if (!v) { toast('先点一下星点给个分'); return; }
    rateStore.set({
      name: '我', score: v,
      text: $('[data-rate-text]', host).value.trim() || '（没写短评）',
      state: $('[data-rate-state]', host).value,
      back: 0,
    });
    renderRate();
    toast(v + ' 分 · 已记在这台机器上');
  });
  $('[data-rate-del]', host).addEventListener('click', () => {
    rateStore.set(null);
    $('[data-rate-text]', host).value = '';
    dots.dataset.pick = '';
    renderRate();
    toast('已撤销我的评分');
  });
}

function chaptersHTML(d) {
  return `<section class="tpChaps" id="chapters" aria-label="本贴章节">
    <div class="panel__head">
      <h2 class="panel__title" id="tpChapCap">${icon('orbit')}本贴章节</h2>
      <span class="panel__line"></span>
      <span class="tpCard__no">7 SECTIONS</span>
    </div>
    ${chapHTML(1, 'OPENING', '开场动画', openingBodyHTML(d), true)}
    ${chapHTML(2, '游戏介绍', '无剧透 · 约 300 字', introBodyHTML(d), true)}
    ${chapHTML(3, '游戏信息', '制作阵容与容量', gameInfoBodyHTML(d), true)}
    ${chapHTML(4, '截图', `共 ${d.shots.length} 张`, shotsBodyHTML(d), true)}
    ${chapHTML(5, '角色', `共 ${d.cast.length} 名`, castBodyHTML(d), true)}
    ${chapHTML(6, '评分', `${d.ratings.length} 条短评`, rateBodyHTML(), true)}
    ${chapHTML(7, '下载 / 汉化说明', '含补丁与镜像', downloadBodyHTML(d), true)}
  </section>`;
}

/* ---------- ⑤ 回复区 ---------- */
const RPP = 10;                 // 每页 10 条
const rPages = () => Math.max(1, Math.ceil(replies.length / RPP));
const rHash = (n) => `#reply-${n}`;
let rPageCur = 1;

function readRPage() {
  const m = /^#reply-(\d+)$/.exec(location.hash);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

function repliesHTML() {
  const page = Math.min(readRPage(), rPages());
  rPageCur = page;
  const slice = replies.slice((page - 1) * RPP, page * RPP);
  return slice.map((r) => `<li class="tpR${r.isOp ? ' tpR--op' : ''}">
    <span class="av tpR__av" style="--ah:${hueOf(r.author)}" aria-hidden="true">${esc([...r.author][0])}</span>
    <div class="tpR__b">
      <p class="tpR__h">
        <b class="by">${esc(r.author)}</b>
        ${r.isOp ? '<span class="tpR__op">楼主</span>' : ''}
        ${r.local ? '<span class="tpR__op tpR__op--me">我</span>' : ''}
        <span class="tpR__f">${r.floor}F</span>
        <time class="tpR__t" datetime="${new Date(Date.now() - r.mins * 60000).toISOString()}">${esc(relTime(r.mins))}</time>
      </p>
      <p class="tpR__x">${esc(r.body)}</p>
    </div>
  </li>`).join('');
}

/* 分页：与 board.js 同一套结构 / 样式类，只是把 href 换成帖内锚点（#reply-<页>） */
function pgHTML(pages, page) {
  if (pages <= 1) return '';
  const nums = [...new Set([1, 2, page - 1, page, page + 1, pages - 1, pages])]
    .filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) items.push('<li class="pg__gap" aria-hidden="true">…</li>');
    items.push(n === page
      ? `<li><a class="pg__n" href="${rHash(n)}" aria-current="page" aria-label="第 ${n} 页，当前页">${n}</a></li>`
      : `<li><a class="pg__n" href="${rHash(n)}" aria-label="第 ${n} 页">${n}</a></li>`);
  });
  const chev = '<svg class="i pg__chev" aria-hidden="true"><use href="#i-chevron"/></svg>';
  const prev = page > 1
    ? `<a class="pg__step" href="${rHash(page - 1)}" rel="prev">${chev}上一页</a>`
    : `<span class="pg__step is-off" aria-disabled="true">${chev}上一页</span>`;
  const next = page < pages
    ? `<a class="pg__step pg__step--next" href="${rHash(page + 1)}" rel="next">下一页${chev}</a>`
    : `<span class="pg__step pg__step--next is-off" aria-disabled="true">下一页${chev}</span>`;
  return `<div class="pg__row">
    ${prev}
    <ol class="pg__list">${items.join('')}</ol>
    ${next}
    <form class="pg__jump" id="pgJump" aria-label="跳转到指定页">
      <label for="pgIn">跳至</label>
      <input id="pgIn" type="number" min="1" max="${pages}" step="1" inputmode="numeric"
             value="${page}" aria-label="跳转到第几页">
      <span class="pg__of">/ ${pages} 页</span>
      <button class="pg__go" type="submit">跳转</button>
    </form>
  </div>`;
}

function repliesSectionHTML() {
  return `<section class="tpCard tpReplies" id="replies" aria-labelledby="tpRepCap">
    <div class="panel__head">
      <h2 class="panel__title" id="tpRepCap">${icon('reply')}回复</h2>
      <span class="panel__line"></span>
      <span class="tpRep__count" id="tpRcount"></span>
    </div>
    <ol class="tpRlist" id="tpRlist"></ol>
    <nav class="pg" id="tpPg" aria-label="回复分页"></nav>
    <form class="tpForm" id="tpForm">
      <h3 class="tpForm__cap">发表回复</h3>
      <label class="sr" for="tpBox">回复内容</label>
      <textarea class="tpForm__box" id="tpBox" rows="4" placeholder="写下你的看法……（演示环境，不会真的发出去）" aria-describedby="tpFormHint"></textarea>
      <div class="tpForm__foot">
        <span class="tpForm__hint" id="tpFormHint">演示环境 · 提交只在本地插入一条回复，不写回服务器</span>
        <button class="btn btn--solid" type="submit">发表回复</button>
      </div>
    </form>
  </section>`;
}

function renderReplies() {
  const list = $('#tpRlist');
  if (!list) return;
  list.innerHTML = repliesHTML();
  $('#tpPg').innerHTML = pgHTML(rPages(), rPageCur);
  $('#tpRcount').textContent = `共 ${replies.length} 条 · 第 ${rPageCur} / ${rPages()} 页`;
  const rep = $('#tpMetaRep');
  if (rep) rep.textContent = replies.length;
}

/* ---------- 交互 ---------- */
function wire() {
  /* 收藏：只有按钮、**不显示收藏数** —— 数据里根本没有这个字段
     （`shared/threads.js` 只生成 `replies` / `views`）。编一个数字出来就是「看起来对的假数据」。
     状态存本地（演示站没有后端），键与歌单那个收藏**分开**（`hoshikai:favs` 是歌单在用，
     形状不同，混在一起会互相解析失败）。 */
  const favBtn = $('#mgFav');
  if (favBtn) {
    const FK = 'hoshikai:topic:favs';
    const read = () => { try { return JSON.parse(localStorage.getItem(FK) || '[]'); } catch (e) { return []; } };
    favBtn.setAttribute('aria-pressed', String(read().includes(key)));
    favBtn.addEventListener('click', () => {
      const cur = read(), i = cur.indexOf(key);
      if (i < 0) cur.push(key); else cur.splice(i, 1);
      try { localStorage.setItem(FK, JSON.stringify(cur)); } catch (e) { /* 隐私模式忽略 */ }
      const now = i < 0;
      favBtn.setAttribute('aria-pressed', String(now));
      toast(now ? '已收藏本帖（只存在这台机器上）' : '已取消收藏');
    });
  }

  /* 本帖标签：现在是真的链接（./tag/<标签>/），不再弹「分类页还没做」。
     ⚠️ 标签已经是 `<a>`，链接自己会跳；这里不再挂 click 处理器。 */

  const act = $('#tpAct'), btn = $('#tpActB'), menu = $('#tpActM');
  if (act && btn && menu) {
    const items = () => [...menu.querySelectorAll('.tpAct__i')];
    const close = (back) => {
      if (menu.hidden) return;
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (back) btn.focus();
    };
    const open = (first) => {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      if (first) items()[0].focus();
    };
    btn.addEventListener('click', () => (menu.hidden ? open(false) : close(false)));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(true); }
    });
    menu.addEventListener('keydown', (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') { close(false); }
    });
    menu.addEventListener('click', (e) => {
      const it = e.target.closest('.tpAct__i');
      if (!it) return;
      if (it.dataset.act === 'struct') {
        const c = $('#chapters');
        if (c) c.scrollIntoView({ block: 'start' });
        toast('已定位到本贴章节');
      } else if (it.dataset.act === 'report') {
        /* 「举报本帖」不再是占位 —— 走 HUD 那扇同一个举报申诉窗（report.js，只在帖内页加载）。
           ⚠️ 先关菜单再开窗：菜单是页面里的浮层，窗是模态，两层叠着 Esc 会分不清该关谁。 */
        close(true);
        if (window.HKReport) HKReport.open(null);
        else toast('举报申诉：还没加载完，请再点一次');
        return;
      } else {
        toast(`「${it.textContent.trim()}」是演示占位，暂未接入`);
      }
      close(true);
    });
    document.addEventListener('click', (e) => { if (!act.contains(e.target)) close(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(false); });
  }

  const form = $('#tpForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const box = $('#tpBox');
      const text = box.value.trim().replace(/\s+/g, ' ');
      if (!text) { toast('先写点什么再发吧'); box.focus(); return; }
      if ([...text].length > 200) { toast('回复请控制在 200 字以内'); box.focus(); return; }
      replies.push({ floor: replies.length + 1, isOp: false, author: '我', body: text, mins: 0, local: true });
      box.value = '';
      const pages = rPages();
      // 先写 hash 再看结果：hash 没变时（已经停在最后一页）浏览器不派发 hashchange，所以下面显式重画
      if (readRPage() !== pages) location.hash = rHash(pages);
      renderReplies();
      toast('已在本地插入一条回复（演示，不会真的发出去）');
      const last = $('#tpRlist .tpR:last-child');
      if (last) last.scrollIntoView({ block: 'nearest' });
    });
  }

  const jump = $('#pgJump');
  if (jump) {
    jump.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = parseInt($('#pgIn').value, 10);
      const n = Math.min(Math.max(1, Number.isFinite(v) ? v : 1), rPages());
      if (n === readRPage()) return;
      location.hash = rHash(n);
      renderReplies();
    });
  }
}

/* 占位按钮 / 链接：点了给提示，不报错也不跳走 */
function wirePlaceholders() {
  const host = $('#topic');
  if (!host) return;
  host.addEventListener('click', (e) => {
    const play = e.target.closest('.op__play');
    if (play) { e.preventDefault(); toast('演示页没有视频文件 —— 这里只是一枚播放按钮'); return; }
    const a = e.target.closest('a[href="#"]');
    if (!a) return;
    e.preventDefault();
    toast(a.dataset.ph ? `「${a.dataset.ph}」是演示占位链接` : '演示占位链接');
  });
}

/* ---------- 空态 ---------- */
function renderMissing() {
  const raw = readKey();
  $('#crumb').innerHTML = `
    <a href="./">首页</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <span class="crumb__cur" aria-current="page">帖子不存在</span>`;
  $('#topic').innerHTML = `<div class="empty">
    <span class="empty__mark" aria-hidden="true">${icon('orbit')}</span>
    <p class="empty__t">没有找到这个帖子</p>
    <p class="empty__d">${raw
      ? `地址里的帖子编号「${esc([...raw].slice(0, 24).join(''))}」不在站内，可能已被删除、合并或从来没存在过。`
      : '这个地址没有带帖子编号，从板块页重新点进去吧。'}</p>
    <div class="tpEmpty__acts">
      <a class="btn btn--solid" href="./forum/1-1/">回到板块页</a>
      <a class="btn btn--ghost" href="./">回到首页</a>
    </div>
  </div>`;
  document.title = '帖子不存在 · 星海社';
}

/* ---------- 渲染 ---------- */
function render() {
  detail = topicDetail(entry);
  replies = detail.replies.slice();          // 本地副本：回复框插入的那条只活在本页
  const host = $('#topic');
  host.style.setProperty('--hue', entry.hue);
  host.innerHTML = headHTML()
    + bigBlockHTML(detail)
    + infoCardHTML(detail)
    + chaptersHTML(detail)
    + repliesSectionHTML();
  renderReplies();
  renderRate();
  paintOrbits();
  wire();

  const t = entry.t;
  /* ⚠️ **把当前帖交给底部 HUD**（hud.js 读它，把「说话人」换成本帖作者）。
     走 `body.dataset` 而不是 window 全局、也不发事件：`topic.js`(134) 在 `hud.js`(135) **之前**
     加载，所以这里同步写完，hud.js 初始化时就一定读得到。首页/板块页没有这三个属性 ⇒
     hud.js 走老分支，行为逐字不变。 */
  document.body.dataset.tAuthor = t.author;
  document.body.dataset.tTitle = t.title;
  document.body.dataset.tTid = key;
  /* 「剧本」：楼主先说，然后每一层的**新面孔**各说一句（按作者去重、保序，最多 12 位）——
     底部 HUD 的对话框本来就是**角色轮流说话**，点名字就是看那位角色的观测证。
     ⚠️ 只放**人**：观测证的种子绑在**名字**上（`tpProfile(name)`），拿子板块名去查会生成一份假档案。
     ⚠️ 上限 12 是为了防一帖几百层把说话人表撑爆（切台词要整表遍历）。 */
  const seenWho = new Set([t.author]);
  const script = [{ n: t.author, t: t.title }];
  for (const r of detail.replies) {
    if (seenWho.has(r.author) || script.length >= 12) continue;
    seenWho.add(r.author);
    script.push({ n: r.author, t: r.body });
  }
  document.body.dataset.tScript = JSON.stringify(script);
  $('#crumb').innerHTML = `
    <a href="./">首页</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <a href="./forum/${entry.bi + 1}-1/">${esc(entry.boardTitle)}</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <a href="./forum/${entry.bi + 1}-${entry.si + 1}/">${esc(entry.sectionTitle)}</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <span class="crumb__cur tp__crumbCur" aria-current="page" title="${esc(t.title)}">${esc(t.title)}</span>`;
  document.title = `${t.title} · ${entry.sectionTitle} · 星海社`;

  /* 标记渲染完成，触发淡入动画（骨架屏消失） */
  requestAnimationFrame(() => {
    const host = $('#topic');
    if (host) host.classList.add('is-loaded');
  });
}

/* ---------- 顶栏导航 · 星位 + 发丝线（同 app.js 的写法，三页各一份） ---------- */
const NAV_CROSS = '<svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="M-5 0H5M0-5V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/></svg>';
const NAV_STAR4 = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg>';
$('#nav').innerHTML = [
  `<a href="./"><i>${NAV_CROSS}</i>首页</a>`,
  ...FORUM.boards.map((b, i) =>
    `<a href="./forum/${i + 1}-1/"${entry && i === entry.bi ? ' aria-current="page"' : ''}><i>${entry && i === entry.bi ? NAV_STAR4 : NAV_CROSS}</i>${esc(b.title)}</a>`),
  `<a href="./space/1/"><i>${NAV_CROSS}</i>个人空间</a>`,
  `<a href="./msg/"><i>${NAV_CROSS}</i>消息</a>`,
  `<a href="./#recommend"><i>${NAV_CROSS}</i>推荐</a>`,
].join('');

addEventListener('hashchange', () => {
  if (!entry) return;
  renderReplies();
  // 帖内锚点没有真实元素可跳，手工把视口带回回复区
  const r = $('#replies');
  if (r && /^#reply-\d+$/.test(location.hash)) r.scrollIntoView({ block: 'start' });
});

/* ---------- 启动 ---------- */
if (!entry) {
  renderMissing();
} else {
  render();
  wirePlaceholders();
}
