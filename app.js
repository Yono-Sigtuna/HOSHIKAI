/* 星海社 · 版式二「星座网格」 */

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* 占位交互共用的提示条。元素在 index.html 的 #toast、样式在 style.css 的 .toast
   （三页各带一份 helper，与 $ / esc / icon 是同一个既有做法）。 */
let toastT;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('is-on'), 2600);
}

/* ---------- 帖子缩略图 ----------
   放图约定：covers/<boardId>-<子板块下标>-<帖下标>.svg
   现在是脚本生成的 SVG 占位封面；换成真封面时把同名文件丢进 covers/ 即可，
   要换扩展名只改这一处。 */
const COVER_EXT = 'svg';
const coverSrc = (boardId, secIdx, thIdx) => `covers/${boardId}-${secIdx}-${thIdx}.${COVER_EXT}`;

/* <span class="thumb"> 自带渐变背景：图片没加载出来时露出的就是它，
   所以既不会出现空洞，也不会因为图片失败而布局跳动。 */
function thumbHTML(boardId, secIdx, thIdx, hue, seed, mod) {
  return `<span class="thumb thumb--${mod}" style="background:${coverGradient(seed, hue)}">
    <img src="${coverSrc(boardId, secIdx, thIdx)}" alt="" loading="lazy" decoding="async">
  </span>`;
}

/* 图片失败时退回渐变。卡片走 innerHTML 渲染，监听只能后挂，
   所以要额外处理「挂监听之前就已经失败」的竞态。 */
function hydrateThumbs(root) {
  root.querySelectorAll('.thumb img').forEach((img) => {
    const fallback = () => {
      const box = img.closest('.thumb');
      if (!box) return;
      box.classList.add('is-fallback');
      img.remove();
    };
    img.addEventListener('error', fallback, { once: true });
    if (img.complete && img.naturalWidth === 0) fallback();
  });
}

/* 光变曲线的种子：帖子标题 + 作者。保证同一帖每次得到同一条曲线。 */
const seedOf = (t) => [...(t.title + t.author)].reduce((a, c) => a + c.codePointAt(0), 0);

/* 作者名 → 稳定色相：同一作者永远同一个颜色，零图片资源。
   乘法散列（不是求和）才能让「夜狩 / 纸月」这类相邻的名字也分到不同色相。 */
const hueOf = (s) => [...s].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);

/* ---------- 顶栏导航 · 星位 + 发丝线 ----------
   板块 2 与 3 合并成了一个 section（#board-1），所以导航里三项指向两个锚点 ——
   项目名仍逐个列出（用户按名字找，不按 section）。
   每个导航项**上方**一颗十字星点（站里 `.orbit` 的节点形状），当前页那颗换成**实心四点星**
   + 参数驱动的辉光（站里 `.mag` 的 --glowAmt 手法）；那条发丝线由 CSS 的 `.nav::after` 画。
   ⚠️ `vector-effect` 必须写成 **SVG 属性**：写进 CSS 的话 `getAttribute` 读不到，而
      「矢量描边不随缩放变粗」正是这颗节点的形状来源（站里三处导航原来都是属性写法）。 */
const NAV_CROSS = '<svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="M-5 0H5M0-5V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/></svg>';
const NAV_STAR4 = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg>';
$('#nav').innerHTML = [
  `<a href="#top" aria-current="page"><i>${NAV_STAR4}</i>首页</a>`,
  ...FORUM.boards.map((b, i) => `<a href="#board-${i === 0 ? 0 : 1}"><i>${NAV_CROSS}</i>${esc(b.title)}</a>`),
  `<a href="./space/1/"><i>${NAV_CROSS}</i>个人空间</a>`,
  `<a href="./msg/"><i>${NAV_CROSS}</i>消息</a>`,
  `<a href="#recommend"><i>${NAV_CROSS}</i>推荐</a>`,
  `<a href="#constellation"><i>${NAV_CROSS}</i>星座图</a>`,
].join('');

/* ---------- 首屏 bento：公告 + OP + 最近更新 + 推送 + 热门 TAG ----------
   统计四人组**搬出了首屏**，改成页脚上方一条细线（见文件末尾的 tally）。
   首屏那一行原来是 4 张 86px 的统计卡，现在让给热门 TAG —— 标签是会被点的入口，
   四个数字是扫描一眼就走的，两者占同一格时该给标签。 */
const S = FORUM.stats;

/* 统计的单一数据源：页脚那条细线从这里取，不要再在别处重抄一遍键名。
   最后一项 --live 是「当前在线」，需要单独上色。 */
const STAT_ROWS = [
  ['注册成员', S.members, '人', false],
  ['主题总数', S.threads, '帖', false],
  ['今日发帖', S.todayPosts, '帖', false],
  ['当前在线', S.online, '人在线', true],
];

$('#hero').innerHTML = `
  <article class="hero__ann">
    <span class="hero__eyebrow">▍观测日志 · ${esc(FORUM.logDate)}</span>
    <span class="pill">${esc(FORUM.announcement.tag)}</span>
    <p class="hero__annTitle">${esc(FORUM.announcement.title)}</p>
    <a class="more" href="#">查看详情 ${icon('arrow')}</a>
  </article>

  <section class="op" id="op" aria-label="开场动画">
    <video class="op__video" id="opVideo" src="op/opening.mp4" preload="none" playsinline></video>
    <div class="op__poster">
      <button class="op__play" id="opPlay" type="button" aria-label="播放开场动画">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <p class="op__name">${esc(FORUM.name)} · OPENING</p>
      <p class="op__hint">把开场动画放到 <code>op/opening.mp4</code> 即可播放</p>
    </div>
  </section>

  <aside class="op__recent" aria-label="最近更新">
    <h3 class="op__recentCap">${icon('clock')}最近更新</h3>
    <ul class="op__list">
      ${FORUM.latestReplies.slice(0, 6).map((r) => {
        const bo = FORUM.boards[r.board];
        return `
        <li><a class="op__row" href="#board-${r.board}">
          <span class="op__av" style="--ah:${hueOf(r.author)}; --bh:${bo.hue}" aria-hidden="true">${esc([...r.author][0])}</span>
          <span class="op__body">
            <span class="op__t">${esc(r.title)}</span>
            <span class="op__m">${esc(r.author)} · ${esc(bo.title)} · ${r.minutes} 分钟前</span>
          </span>
        </a></li>`;
      }).join('')}
    </ul>
  </aside>

  <section class="ban" aria-label="首页推送">
    ${FORUM.banners.map((b) => `
      <a class="ban__item" href="forum/1-1/" style="--bh:${b.hue}">
        <span class="ban__sub">Featured</span>
        <b class="ban__title">${esc(b.title)}</b>
        <span class="ban__desc">${esc(b.sub)}</span>
      </a>`).join('')}
  </section>

  <!-- 热门 TAG。原来占首屏下方第 4 个 .panel，现在顶到统计四人组的位置 ——
       内容是 hotTags() 填的（要统计 12 个子板块的帖池，模板里拿不到）。
       里面是一条「流星带」：头部复用站里的 .panel__head，内容是一排尾巴长度不一的流星。 -->
  <section class="hero__tags" id="heroTags" aria-label="热门标签"></section>
`;

/* 星等图例**不在首屏**（原来在 .hero 的末尾，用户说「放中间干什么啊，没意义」）。
   它是阅读辅助说明，和页脚的统计细线、声明行是同一种「小字条」，
   所以搬进页脚，压在统计细线上方 —— 需要查的人往下翻一眼就能看到。 */
$('#legend').innerHTML = `
  <span class="legend__cap">星等</span>
  ${[[5.5, .16, '冷帖'], [3.0, .55, '一般'], [0.8, .97, '爆帖']].map(([m, g, label]) => `
    <span class="mag" style="--glowAmt:${g}">${icon('star')}<b>${m}</b>等<span class="legend__label">${label}</span></span>`).join('')}
  <span class="legend__txt">天文学里星等越小星星越亮 —— 这里用它表示帖子热度：<b>越小越亮，讨论越热</b>。</span>`;

/* OP 视频：没有文件时不要报错，露出程序化封面 + 提示；
   能播时把封面淡出，交给原生控件。 */
(function op() {
  const stage = $('#op'), video = $('#opVideo'), play = $('#opPlay');
  if (!stage || !video) return;
  // 只有在真能播之后才挂原生控件；没有文件时露出海报 + 播放按钮，
  // 否则浏览器会给一个空视频画出难看的控件条。
  const ready = () => { stage.classList.add('is-ready'); video.controls = true; };
  video.addEventListener('loadeddata', ready);
  video.addEventListener('canplay', ready);
  video.addEventListener('error', () => stage.classList.add('is-missing'));
  play.addEventListener('click', () => {
    if (stage.classList.contains('is-ready')) { video.play(); }
    else { stage.classList.add('is-nudged'); setTimeout(() => stage.classList.remove('is-nudged'), 1400); }
  });
  // preload=none 时不会主动探测，点播放才去加载
  play.addEventListener('click', () => { if (!stage.classList.contains('is-ready')) { video.load(); } }, { once: true });
})();

/* 导航随滚动高亮当前板块：原来点 #board-N 跳过去，导航上却没有任何反馈。 */
(function navSpy() {
  const links = [...document.querySelectorAll('.nav a[href^="#board-"]')];
  const boards = [...document.querySelectorAll('.bv')];
  if (!links.length || !boards.length) return;
  const home = document.querySelector('.nav a[href="#top"]');
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const clear = () => { links.forEach((a) => a.removeAttribute('aria-current')); };
  // 窄带：只在板块占据视口中部时才点亮，避免两块同时高亮
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      clear();
      if (home) home.removeAttribute('aria-current');
      const a = byId.get(e.target.id);
      if (a) a.setAttribute('aria-current', 'page');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  boards.forEach((el) => io.observe(el));
  // 回到顶部时把高亮还给「首页」
  const top = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      clear();
      if (home) home.setAttribute('aria-current', 'page');
    }
  }, { rootMargin: '-1px 0px -95% 0px' });
  if (home) top.observe(document.body);
})();

/* ---------- 大板块 × 子板块（bento 拼贴）---------- */
const magOf = (t) => {
  const m = magnitude(t.replies, t.views);
  return { m, glow: magnitudeGlow(m) };
};

function threadRow(t, rich, bi = 0, si = 0) {
  const { m, glow } = magOf(t);
  return `
  <a class="sc__thread" href="${boardURL(bi, si)}">
    <span class="sc__t">${t.hot ? '<span class="badge">热</span>' : ''}${esc(t.title)}</span>
    <span class="sc__m">
      <b class="by">${esc(t.author)}</b>
      <i aria-hidden="true">·</i>
      <time>${esc(t.time)}</time>
      ${rich ? `<span class="pull">${icon('reply')}${t.replies}</span><span class="pull">${icon('eye')}${t.views.toLocaleString()}</span>` : ''}
      ${rich ? `<span class="mag" style="--glowAmt:${glow}" title="星等 ${m} · 越小越亮">${icon('star')}<b>${m}</b>等</span>` : ''}
    </span>
  </a>`;
}

/* 板块页的 URL：./forum/<大板块 1-3>-<子板块 1-4>/
   首页在 ./ 下，相对路径 forum/1-1/ 正好解析到那里。 */
const boardURL = (bi, si) => `forum/${bi + 1}-${si + 1}/`;

function sectionCard(sec, hue, mod, boardId, secIdx, bi) {
  // 卡片头部的星等取该子板块「最热」的一条，比只看第一条更有信息量
  const hottest = sec.threads.reduce((a, b) => (magOf(a).m <= magOf(b).m ? a : b));
  const { m, glow } = magOf(hottest);
  const big = mod === 'big';
  const rich = big;

  const head = `
    <header class="sc__head${big ? ' sc__head--over' : ''}">
      <h4 class="sc__name"><a class="sc__go" href="${boardURL(bi, secIdx)}">${esc(sec.title)}</a></h4>
      <span class="sc__sub">${esc(sec.subtitle)}</span>
      <span class="mag mag--lc" style="--glowAmt:${glow}" tabindex="0" role="button" aria-expanded="false"
            aria-label="板块最热帖星等 ${m} 等，越小越亮。查看近 24 小时回复活动"
            data-lc-title="${esc(hottest.title)}"
            data-lc-seed="${seedOf(hottest)}"
            data-lc-replies="${hottest.replies}">
        ${icon('star')}<b>${m}</b>等
      </span>
    </header>`;

  /* 大卡：封面必须是「首个」出血子元素，文字叠进封面内部。
     出血量严格等于卡片的 padding，所以图顶边正好落在卡片内容区顶端，
     圆角由卡片自己的 overflow:hidden 裁出 —— 不依赖任何行高巧合。 */
  // 封面承载「本板块头条帖」：图片空间被真实内容填满，不再是纯装饰。
  // 列表只列其余帖，避免同一条出现两次。
  const lead = big ? `
      <a class="sc__lead" href="${boardURL(bi, secIdx)}">
        <span class="sc__leadT">${hottest.hot ? '<span class="badge">热</span>' : ''}${esc(hottest.title)}</span>
        <span class="sc__leadM">
          <b class="by">${esc(hottest.author)}</b><i aria-hidden="true">·</i><time>${esc(hottest.time)}</time>
          <span class="pull">${icon('reply')}${hottest.replies}</span>
          <span class="pull">${icon('eye')}${hottest.views.toLocaleString()}</span>
        </span>
      </a>` : '';
  const body = big
    ? `<div class="sc__cover" role="group" aria-roledescription="封面轮播"
             aria-label="${esc(sec.title)} · 封面共 5 张，点封面或下方星点可切换">${
         coverSlides(boardId, secIdx, hue, seedOf(hottest))}${coverPips}${head}${lead}</div>`
    : head;

  // 只有大卡有封面：头条帖已经写在封面上，列表里就不重复它
  const rest = big ? sec.threads.filter((t) => t !== hottest) : sec.threads;
  const rows = rest.map((t) => threadRow(t, rich, bi, secIdx)).join('');

  return `
  <article class="sc${mod ? ` sc--${mod}` : ''}" style="--hue:${hue}">
    <span class="sc__glow" aria-hidden="true"></span>
    ${body}
    <div class="sc__list">${rows}</div>
  </article>`;
}

/* 轨道：静态弧线先写进 HTML（禁用 JS 时也能看到一条弧）。viewBox 宽取 1240
   —— 正好是正文栏的最大宽度，所以真机上基本是 1:1；JS 跑起来后会按实测宽度重建。 */
const ORBIT_W0 = 1240;
/* 占位路径：与 draw() 里 v3p 的那条同形（画完会被实测宽度覆盖） */
const ORBIT_D0 = `M0 40 Q${ORBIT_W0 / 2} -28 ${ORBIT_W0} 40`;
const ORBIT_SVG = `<svg class="orbit" viewBox="0 0 ${ORBIT_W0} 46" preserveAspectRatio="none" aria-hidden="true">
      <path class="orbit__line" d="${ORBIT_D0}" fill="none" stroke="currentColor" stroke-width="1.5"
            vector-effect="non-scaling-stroke" stroke-linecap="round"/>
    </svg>`;

/* 板块3 的横向精选带（stripHTML）与 `LAYOUTS = ['a','b','c']` 这套三种拼法的调度，
   随「二、三板块合并 + 通栏位让给今夜推荐」一起删掉了。留下的两种拼法是：
   板块1 bento（大卡 2×2 + 两张中卡 + 今夜推荐通栏）、合并板块（左右各 2×2 + 最新 12 帖）。
   那条踩过的坑（CSS Grid 自动放置的共享行游标，详见 memories.md 2.13）留在 memories 里，
   代码不再需要它 —— 现在两个板块都用同一套 auto 放置，没有任何显式定位。 */

/* ---------- 板块头 title：格子条 filmstrip ----------
   血统是 GALBase 的「望远镜 + 深蓝镂空块 + 白底深字 + 末端深块」那一条，取色改走 --hue
   与主题令牌（所以三个板块自带色相、暗色下整体翻转）。首格是望远镜、末格是星环格。
   外面那架大望远镜与弧线的站位由 .fs 的内边距留出，装饰不会溢到相邻行 —— 见 style.css。 */
const ARC_FS = `<svg class="fs__arc" viewBox="0 28 1200 28" preserveAspectRatio="none" aria-hidden="true">
      <path class="orbit__line" d="M2 56 Q600 6 1198 56" fill="none" stroke="currentColor" stroke-width="1.5"
            vector-effect="non-scaling-stroke" stroke-linecap="round"/>
    </svg>`;
/* 悬停时沿弧线掠过的星点。用 left/top 百分比走同一条抛物线 —— 不能用虚线 dashoffset，
   原因见 style.css 的 .fs__sparks 注释（non-scaling-stroke 下虚线按屏幕长度算，
   属性里的天量长度和它差 4.7 倍，那一小段会被甩出路径外）。 */
const SPARKS = `<span class="fs__sparks" aria-hidden="true"><i class="fs__spark"></i><i class="fs__spark fs__spark--b"></i></span>`;

function filmstrip(name, { hue, tag = 'span', cls = '', attrs = null } = {}) {
  const chars = [...name];
  const tiles = chars.map((ch, i) =>
    `<span class="fs__t${i === 0 ? ' fs__t--deep' : ''}" style="--i:${i + 1}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`
  ).join('');
  const deep = (i, inner, extra = '') =>
    `<span class="fs__t fs__t--deep${extra}" style="--i:${i}" aria-hidden="true">${inner}</span>`;
  return `<${tag} class="fs${cls ? ' ' + cls : ''}" style="--hue:${hue};--n:${chars.length + 2}" ${attrs || `aria-label="${esc(name)}"`}>
    <svg class="fs__tel" viewBox="0 0 76 75" aria-hidden="true"><use href="#i-telescope"/></svg>
    <span class="fs__wrap">
      ${ARC_FS}${SPARKS}
      <span class="fs__bar">
        ${deep(0, '<svg viewBox="0 0 40 40"><use href="#i-telescope-tile"/></svg>')}
        ${tiles}
        ${deep(chars.length + 1, '<svg viewBox="0 0 24 24"><use href="#i-stars4"/></svg>', ' fs__t--cap')}
      </span>
    </span>
  </${tag}>`;
}

/* ---------- 今夜推荐 ----------
   原来是一个独立的 .panel（333px 高 + 30px 上边距），现在搬进板块 1 的通栏那一行 ——
   正是「航路指引」原来的位置。板块 1 的网格是 4 栏，这一块 span 4 独占一行，
   于是里面的 .rec 依然是满宽 1240px，5 张卡的排布一个字没改。
   代价：星图馆的「航路指引」不再出现在首页（它的帖在板块页 forum/1-4/ 里照旧）。
   id 仍是 recommend，顶部导航的「推荐」锚点因此还指得准。 */
/* ⚠️ 作品名**外链到 VNDB**，站内不做作品详情页（用户 2026-10-15：
   「作品详细页面没必要了，网站不需要这个页面，你自己把 url 写成 https://vndb.org/v17 代替即可」）。
   v17 是**占位**：本站这五部作品都是虚构的，没有对应的真实条目；将来换成真作品时各配一个号。
   外链一律 target="_blank" + rel="noopener noreferrer" —— 不带 noopener 的新窗口链接
   会把 window.opener 交给对方页面（tabnabbing）。

   ⚠️⚠️ **这段注释必须留在这个位置，不能挪进下面的模板里。** 我第一版就是把它写进了
   `REC_BLOCK` 那个模板字面量内部 —— 注释里那几个**反引号**（包住 `v17`）会把模板
   当场截断，`REC_BLOCK` 提前结束、后面全成了语法垃圾，**整个 app.js 解析失败**，
   首页的导航、推荐、bento 一起消失。教训：模板字面量里不许出现裸反引号，
   注释也别图省事塞进去。 */
const REC_BLOCK = `
  <section class="recblock" id="recommend" aria-label="今夜推荐">
    <div class="recblock__head">
      <span class="recblock__cap">${icon('star')}今夜推荐</span>
      <a class="panel__more" href="#">全部作品 ${icon('arrow')}</a>
    </div>
    <div class="rec">
      ${FORUM.recommend.map((g, i) => `
        <a class="rec__card${i === 0 ? ' rec__card--big' : ''}" href="https://vndb.org/v17"
           target="_blank" rel="noopener noreferrer">
          <span class="rec__cover" style="background:${coverGradient(g.seed, [218, 268, 196][i % 3])}"></span>
          <span class="rec__score">${icon('star')}${g.score}</span>
          <span class="rec__veil"><b>${esc(g.title)}</b><span>${esc(g.sub)}</span></span>
        </a>`).join('')}
    </div>
  </section>`;

/* 大卡封面的 5 张轮播层。
   每一层都是 .thumb（自带渐变底 + 图片失败退回程序化星图），所以缺图不会出空洞 ——
   与站内其他缩略图是同一套机制，hydrateThumbs 也照旧认这些 <img>。
   ⚠️ covers/ 原本每个子板块只有 0–2 三张（对应三条真帖），这里要 5 张，
   所以补了 -3 / -4 两张（同一套参数化模板生成）。
   ⚠️ 初始的 `is-on` 写在 HTML 里而不是等 JS 加 —— 否则 JS 一旦没跑到，
   5 层全是 opacity:0，封面会是一块空白。 */
function coverSlides(boardId, secIdx, hue, seed) {
  return Array.from({ length: 5 }, (_, i) => `
      <span class="thumb thumb--hero cover__l${i === 0 ? ' is-on' : ''}" style="--i:${i};background:${coverGradient(seed + i * 41, hue)}">
        <img src="${coverSrc(boardId, secIdx, i)}" alt=""${i ? ' loading="lazy"' : ''} decoding="async">
      </span>`).join('');
}
/* 指示器用**本站的星形**（与星等同一枚 `#i-star`）：当前那张是金色发光的大星，
   其余是半透明白色小星。原来是一排圆点 —— 用户说「太 low 了」，而且圆点在本站
   没有任何语义出处，星形则是全站通用的「热度」符号。 */
const coverPips = `<span class="cover__pips" role="group" aria-label="封面图切换">${
  Array.from({ length: 5 }, (_, i) => `
    <button class="cover__pip" type="button" aria-current="${i === 0}" aria-label="第 ${i + 1} 张，共 5 张">
      <svg aria-hidden="true"><use href="#i-star"/></svg></button>`).join('')}</span>`;

/* ---------- 板块：三个板块两种拼法 ----------
   板块1「星图馆」保持 bento（大卡 2×2 + 两张中卡 + 通栏，通栏给了今夜推荐）。
   板块2「创作所」与板块3「观测台」**合并成一个 section**：左半 / 右半各一组，
   下面接一条「最新 12 帖」。合并的依据是这两个板块的卡片是同一个量级
   （各 4 张、各 3 条帖），分开摞时中间要多付「20px 段间距 + 一整个板块头（约 120px）」，
   而合并后左边创作所、右边观测台，一眼就能同时比对两个板块 —— 信息密度和阅读
   都不吃亏。两半各自的排版（创作所的 2×2、观测台的 4 张一组）都保留。 */
const boardHead = (b, n) => `
    <header class="bv__head">
      <div class="bv__lead">
        <span class="bv__idx" aria-hidden="true">${String(n).padStart(2, '0')}</span>
        ${filmstrip(b.title, { hue: b.hue, tag: 'h3' })}
        <p class="bv__sub">${esc(b.subtitle)}</p>
      </div>
      <p class="bv__quote">${icon('star')}${esc(b.quote)}</p>
    </header>`;

/* 一个「半」= 板块头 + 4 张子板块卡（2×2）。grid-column 由 CSS 给（span 2）。
   ⚠️ 卡片必须用**不带 mod 的 .sc**：.sc--mid 的含义是「跨 2 列」，
   那是给 4 栏网格用的；放进 2 列的内层网格会让每张卡占满整行，2×2 直接变成 4×1
   （实测每半从 610px 涨到 1164px）。 */
const boardHalf = (b, bi) => `
    <div class="bv__half">
      ${boardHead(b, bi + 1)}
      <div class="bv__halfGrid">
        ${b.sections.map((s, i) => sectionCard(s, b.hue, '', b.id, i, bi)).join('')}
      </div>
    </div>`;
/* 右半 = 观测台：**4 张窄卡一行 + 横向精选带**。
   刻意与左半的 2×2 拉开形状差异 —— 两个板块并排时如果都是 2×2，读起来就是
   「两块一样的方阵」，白合并了。这也是观测台在本版最早的拼法，用户明确说喜欢。
   精选带本身可横滑，所以 8 张卡在半栏（约 600px）里放得下。
   （原先这里还有一块「最新 12 帖」的文字列表，已删：它与下方星座图吃的是同一批
   数据 FORUM.latestReplies，一图一表把同一件事说了两遍，且观感明显是凑数的。） */
const boardHalfNarrow = (b, bi) => `
    <div class="bv__half bv__half--narrow">
      ${boardHead(b, bi + 1)}
      <div class="bv__halfGrid bv__halfGrid--narrow">
        ${b.sections.map((s, i) => sectionCard(s, b.hue, '', b.id, i, bi)).join('')}
      </div>
      ${stripHTML(b, bi)}
    </div>`;

/* 精选带：只放 **3 张**。候选是四个子板块的全部帖，按星等升序取前 3 ——
   原来「每个子板块取最亮的两条」共 8 张，半栏宽度下会挤成一条小卡片流；
   用户要 2~3 张，按比例取 3（2 张的话每张 300px 宽、缩略图 169px 高，
   整块会比左半高 25px，反而把两半的底边顶开）。 */
const STRIP_N = 3;
function stripHTML(b, bi) {
  const picks = b.sections
    .flatMap((s, si) => s.threads.map((t) => ({ t, si, k: t.idx })))
    .sort((x, y) => magOf(x.t).m - magOf(y.t).m)
    .slice(0, STRIP_N);
  return `
      <div class="strip">
        <span class="strip__cap">${icon('star')}精选 · ${esc(b.title)}最亮 ${STRIP_N} 条</span>
        <div class="strip__rail" role="list" aria-label="${esc(b.title)} 精选帖">
          ${picks.map(({ t, si, k }) => `
            <a class="strip__card" role="listitem" href="${boardURL(bi, si)}">
              ${thumbHTML(b.id, si, k, b.hue, seedOf(t), 'strip')}
              <b class="strip__t">${esc(t.title)}</b>
              <span class="strip__m">${esc(t.author)} · ${esc(t.time)}</span>
            </a>`).join('')}
        </div>
      </div>`;
}

const B1 = FORUM.boards[0], B2 = FORUM.boards[1], B3 = FORUM.boards[2];

$('#boards').innerHTML = `
  <section class="bv bv--a" id="board-0" style="--hue:${B1.hue}"
           aria-label="${esc(B1.title)} · ${esc(B1.subtitle)}">
    ${boardHead(B1, 1)}
    <div class="bv__grid">
      ${ORBIT_SVG}
      ${B1.sections.map((s, i) => (i === 3 ? REC_BLOCK : sectionCard(s, B1.hue, i === 0 ? 'big' : 'mid', B1.id, i, 0))).join('')}
    </div>
  </section>

  <section class="bv bv--m" id="board-1" style="--hue:${B2.hue}"
           aria-label="${esc(B2.title)} · ${esc(B2.subtitle)}；${esc(B3.title)} · ${esc(B3.subtitle)}">
    <div class="bv__grid">
      ${ORBIT_SVG}
      ${boardHalf(B2, 1)}
      ${boardHalfNarrow(B3, 2)}
    </div>
  </section>`;


/* ---------- 热门 TAG ----------
   频次只能从 shared/threads.js 的帖池里统计：data.js 那 36 条真帖**没有 tags 字段**，
   它们的标签是 threads.js 的 realThreads() 补上的 —— 所以 index.html 也加载了 threads.js。
   按**帖子数**降序。24 个标签实测 情报 64 → 资源 39，**极差 25、倍比 1.64x** ——
   是有区分度的排序，不是「均匀分布排出来的假热度」（这条曾经被推断错过，见 memories 2.29）。

   ⚠️ 这一块返工了八轮。前七轮全被否（胶囊 / 标签星 / 分光光谱 / 目镜 / 榜单 / 星座 /
      文字云），其中文字云否在「字号就是热度」这类**把数值塞进文字尺寸**的做法上。
   第八轮用户自己给了母题（北极星 / 极光 / 卡西尼环 / 星海 / 流星 / 星云），最后选中流星。
   落地的机制是 **长度（横向）+ 顺序**，不是图形装饰：
     · 24 颗流星排在同一条水平线上、亮头齐平，**尾巴长度 = 热度**
     · 名次 1 在最左 —— 所以它同时是一块排行榜，能直接回答「最热是哪个」
     · 一次入场：亮头从左上斜射进来、尾巴自头部往后展开，播完即停（不做无限循环）
   ⚠️ 长度轴必须走 magnitudeGlow()：真实帖数比 64→39 画出来几乎一样长，差异会被抹平。
      这条是**归一化**的（0.97 → 0.17，约 5.7 倍），页面上写明了，别当成真实比例读。
   ⚠️ **只用两个颜色**：颜色不承担数据（尾巴长度已经在表达热度），24 个色相纯属装饰、
      而且会造成审美疲劳。全部走站里的蓝，只有第 1 名换站里的金色（星等与面板标题
      用的就是这枚金色）。所以这里**不再逐条传 --th**，改由 CSS 的 .shower__m--top 区分。 */
(function hotTags() {
  const host = $('#heroTags');
  if (!host || typeof tagHeat !== 'function') return;
  /* 统计与「热度→星等」的标度都搬去了 shared/threads.js 的 tagHeat() ——
     帖内页的标签带要的是同一个数，抄两份必然漂移（同一个标签在两页必须一样长）。 */
  const { rows, total, toMag } = tagHeat();
  const glow = (n) => magnitudeGlow(toMag(n));            // 站里的同一个函数
  /* 词表扩到 201 之后，首页不再全画 —— 一条流星带排到四十个以上就成了一排短横线，
     光感全无。这里只放前 24 个「热门」，其余的交给 ./tag/ 的星图（索引页）。 */
  const TOP = 24;
  const top = rows.slice(0, TOP);
  host.innerHTML = `
  <div class="panel__head">
    <h3 class="panel__title">${icon('star')}热门 TAG</h3>
    <span class="panel__line"></span>
    <span class="shower__meta">前 ${top.length} / ${rows.length} 个<span class="shower__meta-mid"> · 尾巴越长越热</span> · <b>共 ${total} 帖</b></span>
    <a class="panel__more" href="./tag/">全部标签 ${icon('arrow')}</a>
  </div>
  <div class="shower" role="list" aria-label="热门标签前 ${top.length} 名：按帖子数降序，尾巴越长越热，名次 1 在最左">
    <div class="shower__row">
      ${top.map(([g, n], i) => `
      <a class="shower__m${i ? '' : ' shower__m--top'}" role="listitem" href="./tag/${encodeURIComponent(g)}/"
              style="--i:${i};--w:${(9 + glow(n) * 33).toFixed(1)}px"
              title="${esc(g)} · ${n} 帖 · 星等 ${toMag(n)} 等（越小越亮）"
              aria-label="第 ${i + 1} 名 ${esc(g)}，${n} 帖，星等 ${toMag(n)} 等">
        <span class="shower__streak" aria-hidden="true"><i class="shower__tail"></i><i class="shower__head"></i></span>
        <span class="shower__nm" aria-hidden="true"><b>${i + 1}</b>${esc(g)}</span>
      </a>`).join('')}
    </div>
  </div>`;
})();

/* ---------- 页脚统计细线 ----------
   从首屏搬下来的 4 个数字。做成一条半透明细线压在页脚上：
   宽度吃满、字号 12px、用 · 分隔 —— 存在感低到不打断页脚，
   但需要的时候一眼扫得到。（首屏那边让给热门 TAG 了。） */
$('#tally').innerHTML = STAT_ROWS.map(([k, v, u, live]) => `
  <span class="tally__i${live ? ' tally__i--live' : ''}">
    <span class="tally__k">${esc(k)}</span><b>${v.toLocaleString()}</b>${esc(u)}
  </span>`).join('<i class="tally__sep" aria-hidden="true">·</i>');


/* ---------- 今夜星图（本版核心）----------
   2026-11-06 从 v3p 首页的平面天球图**整节**搬来：左边的平面天球图 + 右边「最亮的 10 颗」。
   读法三条，全是真数据：
     方位 ＝ 星区（12 区各占 30°，从正上方顺时针，外圈色带＝所属天区）
     离心 ＝ 最后一条回复距今多久（对数尺；圆心是此刻，外缘是 7 天前）
     亮度 ＝ 星等（越亮越热，金色 ＝ 1.2 等以内）
   区内的细微方位只为了让星散开，不承载数据 —— 图例里明写。
   ⚠️ 数据取 shared/topic.js 的 tpIndex()（全站 864 帖），与本页其它数据同源。 */
(function planisphere() {
  const host = $('#constellation');
  if (!host || typeof tpIndex !== 'function') return;

  const S = 720, C = S / 2, R = 292, MAXM = 7 * 1440, WARM = 1.2;
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const p2 = (n) => String(n).padStart(2, '0');
  const secCode = (bi, si) => ROMAN[bi] + '·' + p2(si + 1);
  const relTime = (m) => (m < 60 ? Math.max(1, Math.round(m)) + ' 分钟前'
    : m < 1440 ? Math.round(m / 60) + ' 小时前' : Math.round(m / 1440) + ' 天前');
  const mOf = (t) => magnitude(t.replies, t.views);
  const magHTML = (m) => `<span class="chm${m <= 2 ? ' is-tw' : ''}" title="星等 ${m.toFixed(1)}（越小越亮）">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg><b>${m.toFixed(1)}</b>等</span>`;

  const all = tpIndex();
  const on = all.filter((e) => e.t.mins <= MAXM);
  const rOf = (m) => R * Math.log1p(m) / Math.log1p(MAXM);
  const ang = (e) => {
    const k = e.bi * 4 + e.si, j = topicRng(tidSeed(e.t.tid + '#az'))();
    return (-90 + k * 30 + 2.5 + j * 25) * Math.PI / 180;
  };
  const xy = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
  const top = on.slice().sort((a, b) => mOf(a.t) - mOf(b.t) || a.t.mins - b.t.mins).slice(0, 10);
  const pct = (v) => (v / S * 100).toFixed(3) + '%';
  const deg = (d) => d * Math.PI / 180;

  const rings = [[60, '1 小时'], [1440, '1 天'], [MAXM, '7 天']];
  const arc = (r, a0, a1) => {
    const [x0, y0] = xy(r, a0), [x1, y1] = xy(r, a1);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const bands = FORUM.boards.map((b, bi) =>
    `<path class="ch__band" style="--h:${b.hue}" d="${arc(R + 10, deg(-90 + bi * 120 + 1), deg(-90 + bi * 120 + 119))}"/>`).join('');
  const spokes = Array.from({ length: 12 }, (_, k) => {
    const [x, y] = xy(R, deg(-90 + k * 30));
    return `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }).join('');

  const dots = on.slice().sort((a, b) => mOf(b.t) - mOf(a.t)).map((e) => {
    const m = mOf(e.t), g = magnitudeGlow(m), [x, y] = xy(rOf(e.t.mins), ang(e));
    const warm = m <= WARM, rr = (.9 + g * 3.4).toFixed(2);
    const dl = `style="--dl:${(rOf(e.t.mins) / R * 1.6).toFixed(2)}s"`;
    return (warm ? `<circle class="ch__halo" ${dl} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(rr * 3).toFixed(1)}"/>` : '')
      + `<circle class="ch__dot${warm ? ' is-warm' : ''}" ${dl} data-tid="${e.t.tid}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr}" opacity="${(.35 + g * .65).toFixed(2)}"/>`;
  }).join('');
  const marks = top.map((e) => {
    const [x, y] = xy(rOf(e.t.mins), ang(e));
    return `<circle class="ch__mk" data-tid="${e.t.tid}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11"/>`;
  }).join('');
  const nums = top.map((e, i) => {
    const [x, y] = xy(rOf(e.t.mins), ang(e));
    return `<span class="ch__num" style="left:${pct(x + 13)};top:${pct(y - 13)}" aria-hidden="true">${i + 1}</span>`;
  }).join('');
  const secs = [];
  FORUM.boards.forEach((b, bi) => b.sections.forEach((sec, si) => secs.push({ bi, si, title: sec.title, hue: b.hue })));
  const secLbl = secs.map((s, k) => {
    const [x, y] = xy(R + 36, deg(-90 + k * 30 + 15));
    return `<span class="ch__sec" style="left:${pct(x)};top:${pct(y)};--h:${s.hue}" aria-hidden="true"><i>${secCode(s.bi, s.si)}</i><b>${esc(s.title)}</b></span>`;
  }).join('');
  const ringLbl = rings.map(([m, t]) => {
    const [x, y] = xy(rOf(m) - (m === MAXM ? 12 : 0), deg(-75));
    return `<span class="ch__ring${m === MAXM ? ' ch__ring--far' : ''}" style="left:${pct(x)};top:${pct(y)}" aria-hidden="true">${t}</span>`;
  }).join('');

  host.innerHTML = `
  <div class="panel__head">
    <h3 class="panel__title">${icon('orbit')}今夜星图</h3>
    <span class="panel__line"></span>
    <a class="panel__more" href="#board-0">查看全部 ${icon('arrow')}</a>
  </div>
  <p class="panel__desc">把 7 天内有回复的 ${on.length} 帖画成一张平面天球图：<b>方位＝星区，离心＝多久没人回，越亮越热</b>。右侧是图上最亮的 10 颗。</p>
  <div class="ch">
    <figure class="ch__fig">
      <div class="ch__box">
        <div class="ch__sweep" aria-hidden="true"></div>
        <svg class="ch__svg" viewBox="0 0 ${S} ${S}" role="img" aria-label="今夜星图：${on.length} 个帖子按星区方位、最后回复距今时间与星等排布。右侧列表是图上最亮的 10 颗。">
          <circle class="ch__disk" cx="${C}" cy="${C}" r="${R}"/>
          <g class="ch__grid">${spokes}${rings.map(([m]) => `<circle cx="${C}" cy="${C}" r="${rOf(m).toFixed(1)}"/>`).join('')}</g>
          ${bands}<g class="ch__dots">${dots}</g><g>${marks}</g>
          <path class="ch__now" d="M${C} ${C - 9}v18M${C - 9} ${C}h18"/><circle class="ch__pulse" cx="${C}" cy="${C}" r="10"/>
        </svg>
        ${secLbl}${ringLbl}${nums}
        <div class="ch__tip" id="chTip" hidden></div>
      </div>
      <figcaption class="ch__key">
        <span><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M2 6h36" stroke="currentColor"/><circle cx="2" cy="6" r="2" fill="currentColor"/></svg>离圆心越远 ＝ 越久没人回复（对数尺，圆心是此刻）</span>
        <span>${magHTML(5.4)}→${magHTML(1.2)} 越亮越热 · 金色 ＝ 1.2 等以内（全图最亮的一成）</span>
        <span>方位 ＝ 星区；区内的细微角度只为把星散开，不代表数据</span>
      </figcaption>
    </figure>
    <div class="ch__side">
      <h3 class="ch__st">最亮的 10 颗 <small>按星等，7 天内有回复</small></h3>
      <ol class="bright">${top.map((e, i) => `<li data-tid="${e.t.tid}"><span class="bright__n">${i + 1}</span>
        <a href="./topic/${e.t.tid}/">${esc(e.t.title)}</a>
        <span class="bright__m">${magHTML(mOf(e.t))}<span>${secCode(e.bi, e.si)} ${esc(e.sectionTitle)}</span><span>${relTime(e.t.mins)}</span></span></li>`).join('')}</ol>
    </div>
  </div>`;

  /* 星点：悬停出读数、点击进帖；与右侧列表互相点亮 */
  const box = host.querySelector('.ch__box'), tip = host.querySelector('#chTip');
  const byTid = new Map(on.map((e) => [e.t.tid, e]));
  const hl = (tid, onOff) => {
    host.querySelectorAll(`.ch__dot[data-tid="${tid}"], .ch__mk[data-tid="${tid}"], .bright li[data-tid="${tid}"]`)
      .forEach((n) => n.classList.toggle('is-hl', onOff));
  };
  box.addEventListener('pointermove', (ev) => {
    const d = ev.target.closest('.ch__dot'); const e = d && byTid.get(d.dataset.tid);
    if (!e) { tip.hidden = true; box.style.cursor = ''; return; }
    box.style.cursor = 'pointer';
    tip.innerHTML = `<b>${esc(e.t.title)}</b><span>${secCode(e.bi, e.si)} ${esc(e.sectionTitle)} · ${mOf(e.t).toFixed(1)} 等 · ${relTime(e.t.mins)}</span>`;
    const r = box.getBoundingClientRect();
    tip.hidden = false;
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    tip.style.left = Math.min(x + 14, r.width - tip.offsetWidth - 4) + 'px';
    tip.style.top = (y + 16 + tip.offsetHeight > r.height ? y - tip.offsetHeight - 10 : y + 16) + 'px';
  });
  box.addEventListener('pointerleave', () => { tip.hidden = true; });
  box.addEventListener('click', (ev) => {
    const d = ev.target.closest('.ch__dot');
    if (d) location.href = './topic/' + d.dataset.tid + '/';
  });
  host.querySelectorAll('.bright li').forEach((li) => {
    li.addEventListener('pointerenter', () => hl(li.dataset.tid, true));
    li.addEventListener('pointerleave', () => hl(li.dataset.tid, false));
    li.addEventListener('focusin', () => hl(li.dataset.tid, true));
    li.addEventListener('focusout', () => hl(li.dataset.tid, false));
  });

  /* ── 进场：星点从圆心往外一圈圈亮起来（v3p 同一套）──
     每个点的 `--dl` 由「离心」推出 ⇒ 亮起的顺序就是「越久越靠外」，与读法同构。
     RM / 没有 IO：立刻 is-in —— 内容永远看得见，只是不动。 */
  /* ⚠️ is-ready 要挂在 `.ch` 上，不是 `#constellation` —— CSS 的判据是 `.ch.is-ready` */
  host.querySelector('.ch').classList.add('is-ready');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    box.classList.add('is-in');
  } else {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) { box.classList.add('is-in'); io.disconnect(); }
    }), { rootMargin: '0px 0px -8% 0px' });
    io.observe(box);
  }
})();

/* ---------- 缩略图失败回落 ---------- */
hydrateThumbs(document);

/* ---------- 大卡封面的 5 张轮播（可点）----------
   为什么不用 CSS 关键帧：关键帧版靠 `animation-delay` 错开，想「手动跳一张」就得改 delay，
   而改 delay 会让动画按新相位重排，跳完之后顺序就乱了。所以改成 **JS 驱动**：
   给当前层加 `.is-on`，淡入淡出交给 `transition: opacity`。
   自动 4.8s 一张；指针悬停 / 键盘焦点进入时暂停，离开后继续；
   点封面任意处（头条帖链接除外）或点某个星点都算手动切换，并把计时重置。 */
(function heroCover() {
  const stage = document.querySelector('.sc__cover');
  const bar = stage && stage.querySelector('.cover__pips');
  if (!stage || !bar) return;
  const layers = [...stage.querySelectorAll('.cover__l')];
  const pips = [...bar.querySelectorAll('.cover__pip')];
  if (layers.length < 2 || pips.length !== layers.length) return;

  // reduced-motion：不自动播（自动播是「未经请求的运动」），但**手动切换保留** ——
  // 那是用户主动发起的，且 RM 下 transition 被压到 0.01ms，切换是瞬时的。
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EVERY = 4800;
  let cur = 0, timer = null;

  const show = (i) => {
    cur = (i + layers.length) % layers.length;
    layers.forEach((l, k) => l.classList.toggle('is-on', k === cur));
    pips.forEach((p, k) => p.setAttribute('aria-current', String(k === cur)));
  };
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => {
    stop();
    if (reduce) return;
    timer = setInterval(() => show(cur + 1), EVERY);
  };

  show(0);
  start();

  stage.addEventListener('pointerenter', stop);
  stage.addEventListener('pointerleave', start);
  stage.addEventListener('focusin', stop);
  stage.addEventListener('focusout', (e) => { if (!stage.contains(e.relatedTarget)) start(); });

  // 点封面换下一张；但头条帖是链接、星点自己有处理 —— 两种情况都不截胡
  stage.addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target.closest('.cover__pip')) return;
    show(cur + 1); start();
  });
  bar.addEventListener('click', (e) => {
    const p = e.target.closest('.cover__pip');
    if (!p) return;
    show(pips.indexOf(p)); start();
  });
  // 左右方向键在星点组内切换（星点是 <button>，本来就可以 Tab 到）
  bar.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    show(cur + (e.key === 'ArrowRight' ? 1 : -1));
    start();
    pips[cur] && pips[cur].focus();
  });
})();

/* ---------- 结构性轨道 ----------
   弧线上的星点对齐网格「最上一行」卡片的水平中心，让轨道成为卡片的脊椎，
   而不是头顶飘着的装饰条。弧线是二次贝塞尔，且 x 对 t 线性（因为控制点取在中点），
   所以「给定 x 求弧上 y」有闭式解，不必数值迭代。 */
(function orbits() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 2026-11-06 换成 v3p 的版本：弧横跨**整个栅格宽度**，星点落在**第一排卡片的实测中心**上。
     v2p 旧版从编号徽章的右缘起弧、按 `gridTemplateColumns` 反算列中心 —— 卡片跨列时星点会错位
     （首页第一块是「大卡 + 右列两张」，列中心和卡中心根本不是一回事）。 */
  const H = 46, BASE = 40, APEX = -28;
  /* ⚠️ 因子是 **2** 不是 4：二次贝塞尔 y(t) = BASE − (BASE−APEX)·2·t(1−t)。
     写成 4 振幅翻倍 —— 星点会被推到弧上方一大截（用户 2026-11-06：「星星不在轨道上」）。 */
  const yAt = (x, W) => BASE - (BASE - APEX) * 2 * (x / W) * (1 - x / W);

  function draw() {
    document.querySelectorAll('.bv').forEach((bv) => {
      const grid = bv.querySelector('.bv__grid');
      const svg = bv.querySelector('.orbit');
      const line = svg && svg.querySelector('.orbit__line');
      if (!grid || !svg || !line) return;
      const g = grid.getBoundingClientRect();
      if (!g.width) return;

      /* viewBox 直接建成实际像素宽 —— 1:1，星芒不会被拉成扁十字，圆点也不会变成椭圆。 */
      const W = Math.round(g.width);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const d = `M0 ${BASE} Q${(W / 2).toFixed(1)} ${APEX} ${W} ${BASE}`;
      line.setAttribute('d', d);

      svg.querySelectorAll('.orbit__spark, .orbit__planet').forEach((n) => n.remove());

      /* ⚠️ 弧的 <svg> 自己就住在 .bv__grid 里 —— 不过滤掉它，第一排就等于「它自己」，
         星点会全部堆到弧顶（2026-11-06 实测：整块只有一个星点，在正中间）。 */
      /* 星点＝**栅格各列的中心**（2026-11-06 第二轮：用户「主页的大轨道还是只有 2 个十字」——
         按「第一排卡片」算，首页第一块只有大卡 + 右列两张，只剩两颗；
         按列算，四列就是四颗，密度和板块页的一致）。列宽从 computed style 取，弧不再是徽章起弧，
         所以列中心能直接落到抛物线上。 */
      const csG = getComputedStyle(grid);
      const cols = csG.gridTemplateColumns.split(' ').map(parseFloat).filter((n) => !isNaN(n));
      const gap = parseFloat(csG.columnGap) || 0;
      const xs = [];
      let acc = 0;
      cols.forEach((w) => { xs.push(acc + w / 2); acc += w + gap; });
      if (cols.length < 2) return;   // 单列时退化成纯弧线，不放星点

      xs.forEach((x, i) => {
        if (x < 0 || x > W) return;
        const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        node.setAttribute('class', 'orbit__spark');
        node.setAttribute('transform', `translate(${x.toFixed(1)} ${yAt(x, W).toFixed(1)})`);
        node.style.transitionDelay = `${(0.5 + i * 0.1).toFixed(2)}s`;
        node.innerHTML = `<path d="M-5 0H5M0 -5V5" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round"/>`;
        svg.appendChild(node);
      });

      if (!reduce) {
        const planet = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        planet.setAttribute('class', 'orbit__planet');
        planet.innerHTML = `<animateMotion dur="26s" repeatCount="indefinite" path="${d}"/>
          <circle r="2.6" fill="currentColor"/>`;
        svg.appendChild(planet);
      }
    });
  }

  let rt;
  draw();
  // 字体加载完标题宽度会变，所以要重算
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 150); });

  // 每块一条轨道，各自滚进视口时入场一次：轨道「绘制星轨」clip 扫开 → 星点错峰淡入 → 卡片从弧下抬起
  /* ⚠️ 基准延迟分两种：**只有第一块享受「加载剧场」**（1.0s，等轨道扫完卡片再起）；
     往下滑进入的块一律 0.12s 起 —— 用户滑到哪儿就该马上看见内容。
     2026-11-07 实测：全用 1.0s 时「第 2 块滚进视野 → 卡片全可见」要 1904ms，
     而同期帧统计 0 掉帧 / 0 长任务 ⇒ 卡的不是渲染，是等。 */
  let heroDone = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const hero = !heroDone;
      heroDone = true;
      // 首块：基准 1.0s + 行 .08 / 列 .04（等轨道扫完再起）；滚入块：基准 .04 + 行 .05 / 列 .025
      const base = hero ? 1.0 : 0.04, dr = hero ? 0.08 : 0.05, dc = hero ? 0.04 : 0.025;
      if (!hero) e.target.classList.add('is-quick');
      // 先算 --dl 再加 is-drawn：类一加上动画就创建了，delay 必须在那之前就位
      const grid = e.target.querySelector('.bv__grid');
      if (grid) {
        const cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
        [...grid.querySelectorAll('.sc')].forEach((c, i) => {
          const row = Math.floor(i / cols), col = i % cols;
          c.style.setProperty('--dl', (base + row * dr + col * dc).toFixed(3) + 's');
        });
      }
      e.target.classList.add('is-drawn');
      io.unobserve(e.target);
    });
  }, {
    threshold: 0,
    /* ⚠️ 阈值不能只靠 0.15：首块实测高 1085px，1400×900 下首屏只露出 117px（10.8%），
       会一直不触发 —— 用户看到的是半截空白板块（2026-11-07 探针 L1）。改成
       「距视口下沿 20% 以内就入场」，既保证首屏内触发起动画，也不会提前太远。 */
    rootMargin: '0px 0px 20% 0px',
  });
  document.querySelectorAll('.bv').forEach((el) => io.observe(el));
})();

/* ---------- 星等 · 光变曲线弹层 ----------
   只挂在「卡片头部」的星等上。帖子行内的星等嵌在 <a class="sc__thread"> 里，
   加交互会抢掉链接的点按区域并形成嵌套可聚焦元素；而卡片头部的星等本来就是
   「该子板块最亮那条帖」的读数，语义正好。 */
(function lightCurvePopover() {
  const badges = [...document.querySelectorAll('.sc__head .mag--lc')];
  if (!badges.length || typeof lightCurve !== 'function') return;

  const W = 232, H = 62, PAD = 9;
  const pop = document.createElement('div');
  pop.className = 'lc';
  pop.hidden = true;
  pop.setAttribute('role', 'tooltip');
  document.body.appendChild(pop);

  let cur = null;
  const hide = () => {
    if (!cur) return;
    cur.setAttribute('aria-expanded', 'false');
    pop.hidden = true;
    cur = null;
  };

  function show(el) {
    if (cur === el) return;
    if (cur) cur.setAttribute('aria-expanded', 'false');
    cur = el;

    const series = lightCurve(Number(el.dataset.lcSeed), Number(el.dataset.lcReplies));
    const px = (i) => PAD + (i / (series.length - 1)) * (W - PAD * 2);
    const py = (v) => H - PAD - v * (H - PAD * 2);
    const pts = series.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
    const now = series[series.length - 1];
    const mag = el.querySelector('b') ? el.querySelector('b').textContent : '';

    pop.innerHTML = `
      <b class="lc__t">${esc(el.dataset.lcTitle)}</b>
      <svg class="lc__svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <polygon class="lc__area" points="${PAD},${H - PAD} ${pts} ${(W - PAD).toFixed(1)},${H - PAD}"/>
        <polyline class="lc__line" points="${pts}"/>
        <circle class="lc__now" cx="${px(series.length - 1).toFixed(1)}" cy="${py(now).toFixed(1)}" r="2.8"/>
      </svg>
      <span class="lc__note">近 24 小时回复活动 · 现 <b>${esc(mag)}</b> 等</span>`;
    pop.hidden = false;
    el.setAttribute('aria-expanded', 'true');

    // 必须用 fixed 定位：卡片的 overflow: hidden 会把绝对定位的弹层裁掉
    const a = el.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const left = Math.max(8, Math.min(a.left + a.width / 2 - pw / 2, innerWidth - pw - 8));
    const below = a.bottom + 8;
    pop.style.left = left + 'px';
    pop.style.top = (below + ph > innerHeight - 8 ? Math.max(8, a.top - ph - 8) : below) + 'px';
  }

  const toggle = (el) => (cur === el ? hide() : show(el));

  // 触屏没有 hover，只能点按；鼠标若也用点按切换会和 hover 打架
  let touchMode = false;
  addEventListener('pointerdown', (e) => { touchMode = e.pointerType !== 'mouse'; }, true);

  badges.forEach((el) => {
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(el); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
    el.addEventListener('focus', () => show(el));
    el.addEventListener('blur', hide);
    el.addEventListener('click', (e) => { e.preventDefault(); if (touchMode) toggle(el); });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(el); }
    });
  });

  // 点空白处 / 按 Escape / 滚动时收起
  addEventListener('pointerdown', (e) => { if (cur && !cur.contains(e.target)) hide(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  addEventListener('scroll', hide, { passive: true });
})();
