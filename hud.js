/* 星海社 · 站点 chrome（首页 / 板块页 / 帖内页共用）
   ------------------------------------------------------------------
   这个文件管两条 bar：
     · **底部 galgame HUD**：常驻（可控）的对话带 + 三簇功能键 + 仪器盘 + 音乐播放器
     · **顶部导航的退场**：向下滚时「星幕收拢」，向上滚立刻回来
   两条分工是刻意的：**顶部让开给阅读，底部一直在手边 —— 它们不会一起消失。**

   它取代了原先的右下角常驻坞（dock.js）：坞原本的两个功能 ——「看背景」与「回到顶部」——
   现在都是 HUD 里的功能键。dock.js 与 style.css 的 .dock 段落已在第 18 轮**删除**
   （用户确认 HUD 这个方向成立）。

   为什么单开一个文件、注入式建 DOM（而不是写进三个 HTML）：这是站点已有的做法 ——
   dock.js 当年就是三页共用一份、`insertAdjacentHTML` 注入的。三份 HTML 各抄一份会有
   三处不同步的风险，而这些东西每页都一样。

   依赖：shared/data.js（FORUM / magnitude / coverGradient）、shared/threads.js（boardThreads）、
        theme.js 的全局 `prefersReduce()`。三页的加载顺序都满足。 */
(function hud() {
  const root = document.documentElement;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = () => (typeof prefersReduce === 'function' ? prefersReduce() : matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* ⚠️「看背景」只在**真有背景层**的页面上出现 —— `.bg`（7 张 CG 的轮播层）只挂首页，
     板块页与帖内页的 body 里根本没有它，点了只会看到一片空白。
     这条规则来自已删除的 dock.js（原话：「按钮跟着背景走，没有背景就不给这个按钮」）。 */
  const hasBg = () => !!document.querySelector('.bg');
  if (document.querySelector('.hud')) return;            /* 防重复注入 */

  /* ── 播放器图标：站点 sprite 里**一个播放类图标都没有**，而 sprite 在三个 HTML 里
     各有一份副本、改一处要三处同步 —— 所以由这里**自己注入一小份**，不碰那三份。
     （`<use href="#i-play">` 只认同一文档里的 symbol，注入的也生效。）
     play 三角用的是站点自己已有的 path（app.js:93 与 topic.js:244 的 `M8 5v14l11-7z`），
     顺手把那个被复制了两遍的内联图形收成 symbol。 */
  document.body.insertAdjacentHTML('afterbegin', `
    <svg class="sprite" aria-hidden="true" focusable="false">
      <symbol id="i-play" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></symbol>
      <symbol id="i-pause" viewBox="0 0 24 24"><path fill="currentColor" d="M7 4.5h3.6v15H7zM13.4 4.5H17v15h-3.6z"/></symbol>
      <symbol id="i-prev" viewBox="0 0 24 24"><path fill="currentColor" d="M6 4.5h2.4v15H6zM19.5 4.5v15L9.4 12z"/></symbol>
      <symbol id="i-next" viewBox="0 0 24 24"><path fill="currentColor" d="M15.6 4.5H18v15h-2.4zM4.5 4.5v15L14.6 12z"/></symbol>
      <symbol id="i-volume" viewBox="0 0 24 24"><path fill="currentColor" d="M11 4.6 6.3 8.6H2.8v6.8h3.5L11 19.4z"/><path d="M15.2 8.4a5.2 5.2 0 0 1 0 7.2"/><path d="M18.2 5.6a9 9 0 0 1 0 12.8"/></symbol>

      <!-- ══ 九枚功能键图标：**天文仪器与天象** ══
           为什么不改三个 HTML 里各自的 sprite：那份副本**一改要三处同步**，而且
           #i-star / #i-moon 等 id 还被 .mag / .pl__fav / 主题切换用着，覆盖会**连带改掉别的板块**。
           所以照播放器图标的先例，在这里注入一份，用**新 id 前缀 #k-**，页面自己的 sprite 一个不动。

           形制取「观测者视角」，每枚都是**真仪器或真天象**，不是放大镜 / 图层 / 时钟那类通用形状。
           其中两枚**直接复用站点已有的记号**（这是「符合本站主题」最硬的证据 —— 不是我说像，是站里本来就这么画）：
             · 收藏 = 本征星芒 —— 导航「当前页」用的那枚实心四角星（style.css 的 .nav a i 一段）
             · 看背景 = 望远镜 —— .fs__tel 那套语汇
           ⚠️ 实心部件必须显式 fill="currentColor" stroke="none"：.i 的默认是描边（fill:none）。
           —— 2026-11-01：「分享」那枚空壳换成**私信**（双星系统）。用户要的是
              「集成在文本框版块上」的真功能；九枚键的排布不变，空壳变真键。 -->
      <symbol id="k-finder" viewBox="0 0 24 24"><!-- 搜索：寻星镜的十字丝视场 -->
        <circle cx="12" cy="12" r="7.4"/><path d="M12 4.6V19.4M4.6 12H19.4"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></symbol>
      <symbol id="k-atlas" viewBox="0 0 24 24"><!-- 目录：星表 —— 每目一粒星点 + 一条目线 -->
        <circle cx="4.6" cy="7" r="1.6" fill="currentColor" stroke="none"/>
        <circle cx="4.6" cy="12" r="1.6" fill="currentColor" stroke="none"/>
        <circle cx="4.6" cy="17" r="1.6" fill="currentColor" stroke="none"/>
        <path d="M8.8 7h11.6M8.8 12h11.6M8.8 17h11.6"/></symbol>
      <symbol id="k-mark" viewBox="0 0 24 24"><!-- 续读：观测书签，带上一枚星 -->
        <path d="M7.2 3.4h9.6v17.4l-4.8-3.6-4.8 3.6z"/>
        <path d="M12 4.8l.73 1.87L14.6 7.4l-1.87.73L12 10l-.73-1.87L9.4 7.4l1.87-.73z"
              fill="currentColor" stroke="none"/></symbol>
      <symbol id="k-star4" viewBox="0 0 24 24"><!-- 收藏：本征星芒（站点「重要」的记号） -->
        <path d="M12 3.4 14.24 9.76 20.6 12l-6.36 2.24L12 20.6l-2.24-6.36L3.4 12l6.36-2.24z"
              fill="currentColor" stroke="none"/></symbol>
      <symbol id="k-lockon" viewBox="0 0 24 24"><!-- 关注：观测框夹住一枚星芒 -->
        <path d="M3.6 7.8V5.4A1.8 1.8 0 0 1 5.4 3.6h2.4M16.2 3.6h2.4a1.8 1.8 0 0 1 1.8 1.8v2.4M20.4 16.2v2.4a1.8 1.8 0 0 1-1.8 1.8h-2.4M7.8 20.4H5.4a1.8 1.8 0 0 1-1.8-1.8v-2.4"/>
        <path d="M12 8.7l.92 2.38L15.3 12l-2.38.92L12 15.3l-.92-2.38L8.7 12l2.38-.92z"
              fill="currentColor" stroke="none"/></symbol>
      <symbol id="k-dm" viewBox="0 0 24 24"><!-- 私信：双星系统 —— 两颗星沿同一条虚线轨道互相绕行（一对一的通信） -->
        <ellipse cx="12" cy="12" rx="8.4" ry="4.2" transform="rotate(-30 12 12)"
                 stroke-dasharray="2.6 2.6" stroke-width="1.6"/>
        <circle cx="5.2" cy="15.9" r="2.6" fill="currentColor" stroke="none"/>
        <circle cx="18.8" cy="8.1" r="3.3" fill="currentColor" stroke="none"/></symbol>
      <symbol id="k-dusk" viewBox="0 0 24 24"><!-- 夜间：暮线 —— 地平线 + 沉日 + 星 -->
        <path d="M3 16.8h18"/><path d="M8.2 16.8A3.8 3.8 0 0 0 15.8 16.8"/>
        <path d="M16.8 7l.67 1.73L19.2 9.4l-1.73.67L16.8 11.8l-.67-1.73L14.4 9.4l1.73-.67z"
              fill="currentColor" stroke="none"/></symbol>
      <symbol id="k-scope" viewBox="0 0 24 24"><!-- 看背景：望远镜 —— **口大根小**的截锥 + 口外一枚星 -->
        <path d="M6.8 17.6 16.52 9.72 12.28 5.48 4.4 15.2z"/>
        <path d="M19.6 2.2l.67 1.73L22 4.6l-1.73.67L19.6 7l-.67-1.73L17.2 4.6l1.73-.67z"
              fill="currentColor" stroke="none"/></symbol>
      <symbol id="k-zenith" viewBox="0 0 24 24"><!-- 回顶：天顶 —— 地平线上一条升到天顶记号的线 -->
        <path d="M3.4 20.4h17.2M12 20.4V7.2M9.4 9.8 12 7.2l2.6 2.6"/><circle cx="12" cy="4.4" r="1.4"/></symbol>
      <symbol id="k-signal" viewBox="0 0 24 24"><!-- 举报申诉：信号桅杆 —— 基座上一根杆，顶端一颗星在发波 -->
        <path d="M12 20.4V9.6M9.2 20.4h5.6"/><circle cx="12" cy="6.2" r="1.9"/>
        <path d="M7.9 3.1a5.6 5.6 0 0 0 0 6.2M16.1 3.1a5.6 5.6 0 0 1 0 6.2"/></symbol>
    </svg>`);

  /* ── 帖内页：**说话人 ＝ 本帖的角色**（2026-10-10）──
     galgame 的对话框回答的就是「谁在说话」。帖内页的说话人不是子板块，是**本帖的人**：
     楼主先说，然后每一层的新面孔各说一句（按作者去重、保序）—— 一帖读下来就是一出小剧本。
     `topic.js` 在 `render()` 里把这份剧本写进 `body.dataset.tScript`（它先加载），这里同步读；
     读得到 ⇒ 名牌变成「角色名字 + 观测证入口」，读不到（首页/板块页）⇒ 一切按老样子走。
     ⚠️ 剧本里**只有人**：观测证的种子绑在**名字**上（`tpProfile(name)`），
        拿子板块名当人名去查会生成一份假档案。所以帖内页不再混入板块台词。 */
  const SCRIPT = (() => {
    try {
      const raw = document.body.dataset.tScript;
      const arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) ? arr.filter((x) => x && x.n) : [];
    } catch (e) { return []; }
  })();
  const TOPIC = SCRIPT.length ? { author: SCRIPT[0].n, tid: document.body.dataset.tTid || '' } : null;

  /* ── 立绘位：对话框**最左边那个头像**（用户 2026-10-10：「跟 galgame 那套系统一样，
     最左边显示人物头像……主页显示看板娘，帖子页显示作者头像」）──
     ⚠️ 站里**一张人物图都没有**（`v2p/op/` 是空目录、`covers/` 38 张全是同心环 / 金十字 / 星点，
        搜人形关键词零命中）。用户会给一张图，**主页与帖子页共用它**。
     ⇒ 所以这里是一个**插槽**：`<img>` 盖在「首字色盘」上 ——
        图在 ⇒ 看不见色盘；图不在（或加载失败）⇒ img 自己被摘掉，露出站点本来表达「一个人」的色盘
        （`.av` 的配方，与全站同名同色同源）。**不做假流程，也不编一张假立绘。**
     ⚠️ 换图只需把文件放进 `./` 并叫 `portrait.*`，代码一行不用动
        （三种扩展名依次试，不挑格式）。
     ⚠️ 现在**还没有这个文件** ⇒ 插槽会显示「首字色盘」这个空态，且控制台会有一条 404。
        这是**故意**的：宁可留一个看得见的空态，也不塞一张假立绘（站里的「诚实空态」纪律）。 */
  const PT_SRC = ['./portrait.webp', './portrait.png', './portrait.avif'];
  /* 名牌行里**直接可见**的那几条（用户：「我希望作者信息能直接显示一些，展开会显示全部」）。
     取的是整份观测证里最能说明「这人是谁」的三条；剩下的（UID / 星历 / 星尘 / 巡版 / 陨石 /
     注册 / 最后登录 / 签名 / 图片 / 作品单）留在展开的卡片里。 */
  function infoHTML(name) {
    if (typeof tpProfile !== 'function') return '';
    const p = tpProfile(name);
    return `<span class="hud__i">${esc(p.rank)}</span>`
      + `<span class="hud__i">在站 ${p.hours.toLocaleString()}h</span>`
      + `<span class="hud__i">积分 ${p.credits}</span>`;
  }

  /* ── 对话框说什么：**真实站点内容，不是编造的天文句子** ──
     名牌 = 该帖所在的**子板块名**；台词 = **真实帖标题**；星等 = `magnitude(回复, 浏览)`
     —— 站点同一把尺。第一条先放站点公告。
     为什么不做「随机天文观测短句」：用户明确否决过「为了符合主题而符合主题」。 */
  const LINES = (() => {
    if (SCRIPT.length) {
      /* 帖内页：整份剧本，一行一个说话人（名牌 = 人名，台词 = 他在这帖里说的那句） */
      return SCRIPT.map((s) => ({ sp: s.n, mag: '', tx: s.t || '', who: 1 }));
    }
    const out = [{ sp: FORUM.name, mag: '', tx: FORUM.announcement.title }];
    FORUM.boards.forEach((b, bi) => b.sections.forEach((s, si) => {
      const t = boardThreads(bi, si, 1)[0];
      if (t) out.push({ sp: s.title, mag: magnitude(t.replies, t.views).toFixed(1) + ' 等', tx: t.title });
    }));
    return out;
  })();

  /* ── 九个功能键：按职能分三簇（参考图的形制：同职能的挨在一起、组间留白）。
     `real: 1` = 站里真有；`real: 0` = 空壳。**不假装空壳能用**。
     ⚠️ `ic` 一律指上面那份**注入 sprite 的 #k-\***，不再是三个 HTML 里各自的 #i-\* ——
        原先是放大镜 / 图层 / 时钟 / 五角星 / 人形 / 箭头那一套**通用形状**，
        用户判词：「烂大街的色块，一点设计感没有，严重不符合本站主题」。 */
  /* `ctx: 1` = **临时功能**：只对「当前这一篇帖子」成立，换一页就不成立
     （续读 / 收藏 / 关注 / 举报申诉）。常驻功能（搜索 / 目录 / 私信 / 夜间 / 看背景 / 回顶）
     是「站在哪一页都能做的事」。两者靠描边区分：常驻＝单实线，临时＝**双线**。
     ⚠️ 空壳已经是虚线、锁住是点线 —— 四种状态各占一种线型，互不打架（见 style.css「.key」段）。 */
  const KEYCLU = [
    { g: '查阅', keys: [{ ic: 'k-finder', t: '搜索', real: 1 }, { ic: 'k-atlas', t: '目录', real: 0 },
                        { ic: 'k-mark', t: '续读', real: 0, ctx: 1 }] },
    { g: '标记', keys: [{ ic: 'k-star4', t: '收藏', real: 0, ctx: 1 }, { ic: 'k-lockon', t: '关注', real: 0, ctx: 1 },
                        { ic: 'k-dm', t: '私信', real: 1 }] },
    { g: '环境', keys: hasBg() ? [{ ic: 'k-dusk', t: '夜间', real: 1 }, { ic: 'k-scope', t: '看背景', real: 1 },
                        { ic: 'k-zenith', t: '回顶', real: 1 }]
                      : [{ ic: 'k-dusk', t: '夜间', real: 1 }, { ic: 'k-zenith', t: '回顶', real: 1 }] },
  ];
  /* 本帖：**只在帖内页渲染** —— 这是「临时」最硬的证据：离开帖子，这枚键根本不存在。 */
  if (TOPIC) KEYCLU.push({ g: '本帖', keys: [{ ic: 'k-signal', t: '举报申诉', real: 1, ctx: 1 }] });
  const STAR4 = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg>';
  /* ⚠️ 每枚键多了一行**可见的小字标签** —— 用户第 12 轮判词：「我让你做天文元素，目的就是为了
     符合这个网站的风格，**不是硬创建一些莫名其妙的图标**」。有字就不用猜图标了，
     这也正是参考图（柚子社那类）的做法：图标在上、小字在下。
     `aria-label` 保留 —— 它额外承载「还没做」这个状态，可见标签只说名字。 */
  /* ── 锁：**功能栏的出现与钉住**（第 13 轮改了职责）──
     ⚠️ 它**不再是「禁用功能键」** —— 用户判词：「锁控制的是功能栏的**出现**，
        不是控制能不能用」。第 6 轮定的「防误触」那套**整条作废**。
     两态：锁「关」（锁梁落下）＝ **常驻显示**；锁「开」（锁梁翘起）＝ **自动隐藏**（鼠标移上去才浮出）。
     用户从两个候选里选的是「锁＝钉住」这个习惯读法。
     ⚠️ 它现在**住在功能栏那一排里**（用户：「锁要放在功能栏里，而不是右下角」），
        并且和其余九枚**同规格带边框**（用户：「最好也做一个box包着」）—— 所以它有 `.key__t` 标签。
     标签是**动态**的：只写当前模式（常驻 / 自动），状态另由锁梁姿态 + 颜色表达。 */
  const LOCK_HTML = `<span class="keyclu keyclu--lock" role="group" aria-label="功能栏显示">
      <button class="hud__lock" id="hudLock" type="button" aria-pressed="true"
              aria-label="功能栏常驻显示（点一下改成自动隐藏）">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path class="sh" d="M8.3 10.6V7.5a3.7 3.7 0 0 1 7.4 0v3.1" fill="none"
                stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
          <rect class="bd" x="5.7" y="10.6" width="12.6" height="9.4" rx="2.1" fill="currentColor"/>
          <circle class="kh" cx="12" cy="15.3" r="1.5"/>
        </svg>
        <b class="key__t" data-lock-t aria-hidden="true">常驻</b>
      </button></span>`;
  const keysHTML = () => `<div class="keys" role="group" aria-label="功能">${KEYCLU.map((c) =>
    `<span class="keyclu" role="group" aria-label="${esc(c.g)}">${c.keys.map((k) =>
      `<button class="key" type="button" data-k="${esc(k.t)}" data-todo="${k.real ? '0' : '1'}"
         data-kind="${k.ctx ? 'temp' : 'stay'}"
         aria-label="${esc(k.t)}${k.real ? '' : '，还没做'}"${k.t === '私信' || k.t === '举报申诉' ? ' aria-haspopup="dialog"' : ''}>
         <svg class="i" aria-hidden="true"><use href="#${k.ic}"/></svg>
         <b class="key__t" aria-hidden="true">${esc(k.t)}${k.t === '私信' ? '<i class="key__n" data-dm-n hidden></i>' : ''}</b></button>`).join('')}</span>`).join('')}${LOCK_HTML}</div>`;

  /* ── 星时钟（2026-11-06：从 v3p 标题画面的 dialSVG 原样搬来）──
     结构和动画**照抄**，一层不多一层不少：
       · 外圈：圆环 r290 + 72 格（每 5°，每 30° 一根长格）+ 赤经时角 0h…22h，顺时针 240s；
       · 内圈：虚线环 r214 + 实线环 r150 + 24 格 + 一枚三角游标 `.dial__pt`，逆时针 150s；
       · 黄道：rx270 ry96、rotate(-23.4°)，静止。
     游标住在内圈里，所以它自己不动 —— 是**内圈带着它绕**，这就是 v3p 里的「伴星轨道」。
     ⚠️ 不自己加东西（用户：「动画照抄，别创新」）：没有指针、没有额外的点、没有底盘。
     ⚠️ 唯一改的是**比例尺**：v3p 渲染 820px、这里 700px ⇒ 格长 / 线宽 / 字号 / dash
        按 820/700 = 1.17 倍重标，屏幕上的观感与 v3p 一致，不是新设计。 */
  function dialHTML() {
    const t = (r1, n, step, longEvery) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        const a = i * step * Math.PI / 180;
        const rr = i % longEvery ? r1 - 9.4 : r1 - 23.4;
        s += `<line x1="${(300 + r1 * Math.cos(a)).toFixed(1)}" y1="${(300 + r1 * Math.sin(a)).toFixed(1)}"`
          + ` x2="${(300 + rr * Math.cos(a)).toFixed(1)}" y2="${(300 + rr * Math.sin(a)).toFixed(1)}"/>`;
      }
      return s;
    };
    const hours = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 - 90) * Math.PI / 180;
      return `<text x="${(300 + 252 * Math.cos(a)).toFixed(1)}" y="${(304 + 252 * Math.sin(a)).toFixed(1)}">${i * 2}h</text>`;
    }).join('');
    return `<svg class="dial" viewBox="0 0 600 600" aria-hidden="true">
      <g class="dial__o"><circle cx="300" cy="300" r="290"/><g class="dial__t">${t(290, 72, 5, 6)}</g><g class="dial__h">${hours}</g></g>
      <g class="dial__i"><circle class="dial__dash" cx="300" cy="300" r="214"/><circle cx="300" cy="300" r="150"/>
        <g class="dial__t">${t(214, 24, 15, 3)}</g>
        <path class="dial__pt" d="M300 86 l7 16.4 -7 -4.7 -7 4.7z"/></g>
      <ellipse class="dial__ec" cx="300" cy="300" rx="270" ry="96" transform="rotate(-23.4 300 300)"/>
    </svg>`;
  }

  /* ── 音乐播放器 ──
     ⚠️ 站点里**一个音频文件都没有**，所以这是**诚实空态**：进度与走带 disabled、
     显示「暂无曲目」，但**音量滑块真的**写 localStorage 并作用到 <audio>.volume。
     以后往 `PLAYLISTS` 里加歌单/曲目、给每条填上 `src`，整个播放器立刻能用。 */
  /* ══ 歌单 ══
     用户第 4 条：分不同歌单、**列表式**显示，每条带**封面 / 曲名 / 歌手 / 专辑 / 收藏**。
     ⚠️ 站点里**没有音频文件**（`v2p/op/` 是空目录、全仓无 .mp3/.ogg）⇒ 每条 `src: null`。
        所以：点一条 ＝ **选中**它（顶部正在播放、唱片封面、胶囊缩略图三处一起变），
        但播放键与进度条仍 `disabled` —— **不假装能播**。
        哪天有真文件：把每条填上 `src`、摘掉 `.pl__tb` / `#hudSeek` 的 `disabled`、接上 `<audio>` 即可。
     素材取自站点本身：**专辑 = `FORUM.recommend` 里的真作品名**，歌手 = 站里的作者名。
     封面用站点自己的 `coverGradient(seed, hue)` ⇒ 它不是一块灰，是这个站的封面语言。 */
  const AUTHORS = ['夜狩', 'みなも', '薄明', '纸月', 'Rin', '灰鸦', '初雪', '译星组', '理事会', '睡不着的猫'];
  const ALBUMS = FORUM.recommend.map((r) => r.title);
  const TRK_TITLES = ['Winter Orbit', 'Parallax', 'Meridian', 'Deep Field', 'Blue Hour', 'Calibration',
    'Silent Dome', 'Zenith', 'Asterism', 'Perihelion', 'Nightfall', 'True Anomaly'];
  /* ⚠️ 色相**必须待在站内那条夜蓝轴上**，这不起品味问题，是 coverGradient 的数学决定的：
     它的第二站**恒定 lightness 22%**、色相**永远 +26~47°** —— 于是
       · hue 48  ⇒ 31~65 → 74~95   橄榄（第七轮那块被骂的脏黄铜就是这个机制）
       · hue 156 ⇒ 139~173 → 182~203   绿
       · hue 12  ⇒ 0~29 → 38~59      红
       · hue 300/282 ⇒ →326~347 / →308~329   品红
     旧表 12 首里**有 5 首落在站外**，一排六张摆出来就是用户说的「死亡配色」。
     反过来说：**金在这个函数里做不出来** —— 要第二站落在 42 附近，hue 得是 -5~16，
     那第一站就成红橙了。所以金色**不靠底色**，靠封面上已有的那枚金色十字星芒（.pl__tcover::after）。
     现值全落在 196~226 ⇒ 两张站分别是 169~235 与 212~273，整条是「青 → 蓝 → 靛」，
     也就是站点自己那半夜空（--hud-deep 的 #1c2f6e / #2a1d5c / #10365c 都在这条轴上）。
     亮度节奏不动 —— coverGradient 自带的 38/41/44/47/50 正好让十二张变成
     **同一片天里星等不同的十二颗星**。 */
  const TRK_HUES = [214, 206, 222, 196, 218, 210, 226, 202, 217, 208, 221, 200];
  /* ⚠️ 每个歌单的**条数刻意不一样**（8 / 3 / 4），因为列表是**固定 6 行**：
      · 8 首 ⇒ 超出 ⇒ 靠 CSS 的 `overflow-y:auto` 滚动（用户：「超过 6 首就做下拉」）；
      · 3 / 4 首 ⇒ 不足 ⇒ 由 `renderList()` 补占位行撑满（「没超就显示占位歌单」）。
     两种情形在页面上都看得见，不会被「恰好都是 6 首」掩盖过去。 */
  const PLAYLISTS = [
    { name: '正在播出', pick: [0, 1, 2, 3, 4, 5, 6, 7] },
    { name: '雨夜循环', pick: [8, 9, 10] },
    { name: '观测作业用', pick: [8, 9, 10, 11] },
  ].map((pl) => ({ name: pl.name, tracks: pl.pick.map((i) => ({
    id: 'tr' + i, title: TRK_TITLES[i], artist: AUTHORS[i % AUTHORS.length],
    album: ALBUMS[i % ALBUMS.length], seed: 7 + i * 13, hue: TRK_HUES[i], src: null,
  })) }));
  let curPl = 0, curTr = 0;
  const curTrack = () => (PLAYLISTS[curPl] && PLAYLISTS[curPl].tracks[curTr]) || null;
  function playerHTML() {
    return `
    <div class="pl">
      <button class="pl__chip" type="button" id="hudPlToggle" aria-expanded="false" aria-controls="hudPlPanel"
              title="音乐播放器">
        <span class="pl__cov" data-pl-cov aria-hidden="true"></span>
        <span class="pl__meta"><b data-pl-title>暂无曲目</b></span>
      </button>
      <div class="pl__panel" id="hudPlPanel" hidden role="group" aria-label="音乐播放器">
        <span class="orn" aria-hidden="true"></span>
        <div class="pl__top">
          <span class="pl__art" aria-hidden="true">
            <span class="pl__sleeve" data-pl-sleeve></span>
            <span class="pl__disc" data-pl-disc>
              <svg viewBox="0 0 24 24">
                <circle class="bod" cx="12" cy="12" r="11.4"/>
                <circle class="grv" cx="12" cy="12" r="8.6"/><circle class="grv" cx="12" cy="12" r="6.8"/>
                <circle class="grv" cx="12" cy="12" r="5"/>
                <circle class="lbl" cx="12" cy="12" r="3.2"/><circle class="hol" cx="12" cy="12" r="1"/>
                <path class="mk" d="M12 1.6V4.4"/>
              </svg>
            </span>
          </span>
          <div class="pl__info">
            <b class="pl__title" data-pl-title2>暂无曲目</b>
            <span class="pl__artist" data-pl-artist>等待曲目</span>
          </div>
        </div>
        <div class="pl__bar">
          <input class="pl__rng pl__seek" id="hudSeek" type="range" min="0" max="1000" value="0" step="1"
                 aria-label="播放进度" disabled>
          <span class="pl__time" data-pl-time>--:-- / --:--</span>
        </div>
        <div class="pl__bot">
          <button class="pl__tb" type="button" aria-label="上一首" disabled><svg class="i" aria-hidden="true"><use href="#i-prev"/></svg></button>
          <button class="pl__tb pl__tb--pp" id="hudPP" type="button" aria-label="播放" disabled><svg class="i" aria-hidden="true"><use href="#i-play"/></svg></button>
          <button class="pl__tb" type="button" aria-label="下一首" disabled><svg class="i" aria-hidden="true"><use href="#i-next"/></svg></button>
          <svg class="i pl__vol-ico" aria-hidden="true"><use href="#i-volume"/></svg>
          <input class="pl__rng pl__vol-s" id="hudVol" type="range" min="0" max="100" value="70" step="1" aria-label="音量">
        </div>
        <div class="pl__tabs" id="hudPlTabs" role="tablist" aria-label="歌单"></div>
        <div id="hudPlBody" role="tabpanel">
          <ul class="pl__list" id="hudPlList" aria-label="曲目"></ul>
        </div>
      </div>
      <audio id="hudAudio" preload="none"></audio>
    </div>`;
  }

  /* ══ 观测证（作者档案）—— **只在帖内页**，是 `.hud` 的直接子元素 ══
     为什么它该在这儿：galgame 的对话框回答的就是「谁在说话」，所以点**说话人的名字**看他的档案 ——
     这是角色卡的位置，不是页面顶部的横幅。
     配方**逐字照抄歌单面板 `.pl__panel`**（星野底 + 2px `--hud-edge` + `4px 4px 0` 硬投影）——
     它不是一块新表面，就是站里那口箱子（§18.4 的原话）。
     ⚠️ **不能住在 `.hud__body` 里**：那一层带 `overflow: hidden`（折叠要裁），卡片会被剪掉。
     ⚠️ **不能参与 `natural()`**：卡片一开合就改 `--box-h` 的话，`syncH()` 只在载入 / resize /
        字体就绪时跑 ⇒ 不同步；而且整条框会随开合上下跳。挂在 `.hud` 上、绝对定位，两处量高都看不见它。
     数据来自 `shared/topic.js` 的 `tpProfile(name)`（种子绑**名字**）⇒ 同一个人在**任何**帖子的底栏
     都是同一份档案，与全站「同名同色」（`hueOf`）是同一条纪律。 */
  const PF_ROWS = (p) => [
    ['观测证 UID', p.uid],
    ['在站时长', `>${p.hours.toLocaleString()} 小时`],
    ['身份', p.rank],
    ['观测积分', `${p.credits} 点`],
    ['星历', `第 ${p.year} 年`],
    ['星尘余额', `${p.dust} 枚`],
    ['巡版执行', `${p.patrol} 次`],
    ['捡到的陨石', `${p.meteor.toLocaleString()} 块`],
    ['注册时间', p.joined],
    ['最后登录', p.seen],
  ];
  /* 卡片内容**开的时候才建**（`setCard(true)` 里调）—— 换说话人不必重建 DOM，
     也就不会把用户滚到一半的位置弹回去。 */
  function cardInner(name) {
    if (typeof tpProfile !== 'function') return '';
    const p = tpProfile(name);
    const hue = (typeof hueOf === 'function') ? hueOf(name) : 218;
    /* 「最喜欢的图片」：站里**一张人形/角色图都没有**（covers/ 全是同心环 / 金十字 / 星点），
       所以照帖子缩略图那套程序化封面来 —— 与站内封面语言同源，不硬造素材。 */
    const pics = p.pics.map((s) =>
      `<span class="hud__pic" style="background:${coverGradient(s, hue)}"></span>`).join('');
    const list = (arr) => `<ul class="hud__clist">${arr.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`;
    return `<div class="hud__card__hd">
        <span class="hud__cpt" aria-hidden="true">${PT_IMG}<span class="hud__pt__fb" data-pt-fb></span></span>
        <span class="hud__card__nm"><b>${esc(name)}</b><i>观测证</i></span>
        <svg class="hud__card__seal" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg>
      </div>
      <dl class="hud__card__rows">${PF_ROWS(p).map(([k, v]) =>
        `<div class="hud__card__r"><dt>${esc(k)}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl>
      <div class="hud__card__pair">
        <p class="hud__card__k">个性签名</p>
        <p class="hud__card__sign">${esc(p.sign)}</p>
      </div>
      <div class="hud__card__foot">
        <div class="hud__card__pair"><p class="hud__card__k">最喜欢的图片</p><div class="hud__pics">${pics}</div></div>
        <div class="hud__card__pair"><p class="hud__card__k">正在推进的作品</p>${list(p.ongoing)}</div>
        <div class="hud__card__pair"><p class="hud__card__k">推荐大家玩</p>${list(p.recommends)}</div>
      </div>`;
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div class="hud" data-hud>
      <div class="hud__vec" aria-hidden="true">
        <span class="hud__tex sky--tex"></span>
        <div class="hud__wm">
          <svg class="w1" viewBox="0 0 24 24"><use href="#i-star"/></svg>
          <svg class="w2" viewBox="0 0 40 40"><use href="#i-telescope-tile"/></svg>
          <svg class="w3" viewBox="0 0 24 24"><use href="#i-stars4"/></svg>
          <svg class="w4" viewBox="0 0 24 24"><use href="#i-orbit"/></svg>
          <svg class="w5" viewBox="0 0 24 24"><use href="#i-stars4"/></svg>
        </div>
      </div>
      <!-- ══ 立绘位：对话框最左边那个头像（主页看板娘 / 帖子页作者，**共用一张图**）══
           ⚠️ 它是 .hud 的**直接子元素**，不在 .hud__body 里 —— 两个理由缺一不可：
             ① .hud__body 带 overflow: hidden（折叠要裁），住进去就**冒不出框顶**；
             ② 住在 .hud 上 ⇒ natural()（量的是 .hud__in 的孩子）**看不见它**，
                于是 --box-h 不会被它撑高 —— 这就是「头像是框的 1.6 倍、框却只有 93px」能同时成立的原因。
           ⚠️ 用户 2026-10-11：「跟 galgame 那套系统一样，最左边显示人物头像」+「头像部分太小了」。
              参考图量出来头像高约占屏高 29% ⇒ 选的是「冒出框顶 57px、总高 150」这一档。
           ⚠️ 本段注释**不能出现反引号** —— 整段是 JS 模板字符串，反引号会提前把它闭合。
              （刚踩过两次：写上反引号后 node --check 直接报 missing ) after argument list。） -->
      <!-- ⚠️ 立绘位现在是一枚**真按钮**（用户 2026-10-11：「对话框的头像也希望调用这个悬浮窗去查看作者头像」）。
           两处连带改动，少一个都不行：
             ① **不能同时是 aria-hidden** —— 可聚焦元素套在 aria-hidden 子树里是明确的违规；
             ② pointer-events 从「不设（继承 none）」改成 auto —— 否则点不到。
                代价是**它盖住的那块页面内容不再可点**（这是用户要的交互换来的，已知并接受）。
           ⚠️ 本段在模板字符串**内部**：注释里不能出现反引号（这一轮又栽了一次）。 -->
      <button class="hud__pt" type="button" onclick="viewer(this)" data-cap="头像" aria-label="查看头像">
        <img class="hud__pt__img" src="${PT_SRC[0]}" data-pt-i="0" alt="">
        <span class="hud__pt__fb" data-pt-fb></span>
        <svg class="hud__pt__seal" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg>
      </button>
      <div class="hud__body" id="hudBox">
        <div class="hud__in">
          <div class="hud__main">
            <span class="hud__nm">
              ${TOPIC
                ? `<button class="hud__who" type="button" id="hudWho" aria-expanded="false"
                           aria-controls="hudCard" title="展开完整观测证">
                     <span class="nameplate" data-name></span>
                     <span class="hud__info" data-info></span>
                   </button>`
                : `<span class="nameplate" data-name></span>`}
              <span class="magchip" data-mag>${STAR4}<b></b></span>
            </span>
            <button class="hud__dlg" type="button" id="hudNext" title="换一条观测记录">
              <span class="hud__tx subline" data-text aria-live="polite"></span>
            </button>
          </div>
        </div>
        <!-- 折叠箭头：**住在裁剪区之外**（「.hud__body」的直接子元素，不在「.hud__in」里）。
             ⚠️ 它是这个模块里**唯一常驻可聚焦的入口** —— 一折，台词按钮和整排功能键都被 inert
                挡掉，没有它键盘用户就进不来（「入口没了」这已经栽过三次）。
             ⚠️ 它折的是**整个模块**（文本框 + 功能栏那一整排），不是单独哪一层 —— 用户原话：
                「文本框这个模块是包含功能栏…它两是一个模块」+
                「右上角下拉控制的是整个模块的下拉，而不是单独的文本区域」。
             ⚠️ 这里的注释**不能出现反引号**：整段是 JS 模板字符串，反引号会提前把它闭合
                （和「注释里写 */ 会提前闭合 CSS 注释」是同一类错）。 -->
        <button class="hud__tg" id="hudTg" type="button" aria-expanded="true"
                aria-controls="hudBox hudUi" aria-label="收起底部模块" title="收起底部模块">
          <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chevron"/></svg>
        </button>
      </div>
      <!-- ── 功能栏：**本模块的下一排**，不是另一个模块（用户：「它两是一个模块」）──
           本来这儿从左到右是「三簇功能键 → 星等时钟 → 歌单胶囊 → 锁」。
           ⚠️ **第 12 轮把三簇功能键搬进了文本框内部**（见上面 .hud__body 的内层）——
              用户拿着七张 galgame 截图指出：功能栏本来就住在对话框**里面**，不单独占一排。
              所以这一排现在只剩三样：**星等时钟 → 歌单胶囊 → 锁**。
              ⇒ 因此本排的内层要 justify-content: flex-end —— 原来是靠 .keys 的
                margin-right: auto 把它们推到右边的，键一走，不补这条整排会塌到左边。
           ⚠️ 这段注释里**不能出现反引号**：整段是 JS 模板字符串，反引号会提前把它闭合
              （同一个坑本会话已经踩到第四次了，见 memories 2.90）。
           ⚠️ 星等时钟在**右侧**（用户：「星等时钟放到右侧，回到最初版那个位置」）、
              锁在**最右**（用户：「锁要放在功能栏的后侧…锁要放在右侧」）。
           ⚠️ 这一排**不跟 hover**：默认就展开，只有箭头能收（用户：「默认展开、不跟 hover」）。
           ⚠️ 「inert」：只在**折叠**时挂上（由 hud.js 的 setBox 切）。
           （注释里不写反引号：整段是 JS 模板字符串，反引号会提前闭合它。） -->
      <div class="hud__ui" id="hudUi">
        <div class="hud__in">${keysHTML()}${playerHTML()}</div>
        ${dialHTML()}
      </div>
      ${TOPIC ? '<div class="hud__card" id="hudCard" hidden></div>' : ''}
    </div>
    <div class="toast" id="hudToast" role="status" aria-live="polite"></div>`);

  const hudEl = document.querySelector('.hud');
  const boxEl = document.getElementById('hudBox');
  const boxIn = boxEl.querySelector('.hud__in');   /* 文本框的**内容**（箭头不在里面，所以它能单独 inert） */
  const uiEl = document.getElementById('hudUi');
  const uiIn = uiEl.querySelector('.hud__in');     /* 功能栏内容 —— 折叠时和 boxIn 一起隐掉 */
  const tgBtn = document.getElementById('hudTg');
  const lockBtn = document.getElementById('hudLock');
  const dlgBtn = document.getElementById('hudNext');
  /* 帖内页专有的两件（其余页为 null）：名牌按钮 + 观测证卡片 */
  const whoBtn = document.getElementById('hudWho');
  const cardEl = document.getElementById('hudCard');
  const infoEl = hudEl.querySelector('[data-info]');
  /* 立绘位那枚按钮（帖内页点它 = 看作者头像）—— 它的 aria-label 要跟着说话人换 */
  const ptBtn = hudEl.querySelector('.hud__pt');
  /* ── 立绘位的两条腿：`<img>`（有图就用）+ `.hud__pt__fb`（首字色盘，永远垫在底下）──
     ⚠️ 三种扩展名依次试：用户存成 webp / png / avif 都认；试完都没有就把 img 摘掉，
        露出底下的色盘 —— **不留一个碎图图标**（那比空态更难看，而且骗人）。 */
  const PT_IMG = `<img class="hud__pt__img" src="${PT_SRC[0]}" data-pt-i="0" alt="">`;
  /* ⚠️⚠️ **框的形状是固定的、由 CSS 决定；图去适配框**（2026-10-11 用户纠正）。
     我上一版做成了反的：读素材的 `naturalWidth/naturalHeight`、让**框**跟着素材变 ——
     于是「用户头像有正方形有长方形」这件事直接把界面搞坏了：长图给出一条 81px 的细条、
     横图给出一条扁条，而且**文本框的让位宽度也随每个用户的头像变** ⇒
     同一个界面在不同人那里长得不一样。那不是「兼容」，是**被素材牵着走**。
     现在：框恒为 `--pt-ar` 那个比例（默认 1:1），图用 `object-fit: cover` 去铺满 ——
     不拉扁、不留死白、不同比例的素材都不会把版式顶变形。
     ⇒ 所以这里**没有「算尺寸」这回事了**，`wirePt` 只管「图加载失败时退回色盘」。 */
  const wirePt = (scope) => scope.querySelectorAll('[data-pt-i]').forEach((im) => {
    if (im.dataset.ptWired) return;
    im.dataset.ptWired = '1';
    im.addEventListener('error', () => {
      const n = (+im.dataset.ptI || 0) + 1;
      if (n < PT_SRC.length) { im.dataset.ptI = String(n); im.src = PT_SRC[n]; }
      else im.remove();
    });
  });
  const setPtFb = (scope, name) => {
    const hue = (typeof hueOf === 'function') ? hueOf(name) : 218;
    scope.querySelectorAll('[data-pt-fb]').forEach((el) => {
      el.style.setProperty('--ah', hue);
      el.textContent = [...String(name)][0] || '';
    });
  };
  wirePt(hudEl);
  const chip = document.getElementById('hudPlToggle');
  const panel = document.getElementById('hudPlPanel');
  const seek = document.getElementById('hudSeek');
  const vol = document.getElementById('hudVol');
  const audio = document.getElementById('hudAudio');
  const toastEl = document.getElementById('hudToast');

  let locked = false, toastTimer = 0;

  /* ══ 两个高度**一次性量出来**写回根元素 ══
     `.hud` 是一条底部锚定的 flex 列：**文本框** + **功能栏**（本模块的两排）。
     折叠动画要过渡到**具体值**，过渡不到 `auto`。⚠️ **只在这里量、只写这两个变量**：
     前几轮我把「垫子高度 / 让位量 / 锚点」分散写在三处，一反转层序就全错（memories 2.76）。
     ⚠️ 量的是**子元素的自然高度 + padding**，不是容器自己的高度 —— 容器高度就是 `var(--X-h)`
        （＝这里写的值），量它等于量自己（循环）。 */
  const padOf = (el) => {
    const c = getComputedStyle(el);
    return parseFloat(c.paddingTop) + parseFloat(c.paddingBottom);
  };
  /* ⚠️ **量孩子整体的包围盒**（第 15 轮改成这个，前两版都栽过）：
     第一版一律取 `Math.max`（把容器当**单行**）—— row 下对，column 下少报一个孩子；
     第二版改成「按 flex-direction 取 max / 求和」—— 单行 row 与单列 column 都对，
     但 **`flex-wrap: wrap` 的 row 两种都不对**（换行之后真实高度既不等于最高的那个孩子、
     也不等于所有孩子相加）。而这个下排**窄屏就是要换行的**。
     ⇒ 索性不比「谁更高」了，直接量**最顶边到最底边**：`bot - top`。
        对 row / column / 换行**一律成立**，而且不需要知道布局方向。
     ⚠️ `display:none` 的孩子（≤640 的仪器盘）rect 全 0，必须跳过 —— 否则 `top` 会被拉到 0。
     ⚠️ 用 `getBoundingClientRect` 的**差值**，所以是视口坐标也无所谓（差值抵消）。 */
  const natural = (el) => {
    const inner = el.querySelector('.hud__in') || el;
    const pad = padOf(inner);
    let top = Infinity, bot = -Infinity;
    for (const k of inner.children) {
      const r = k.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;   /* 隐藏的不参与包围盒 */
      if (r.top < top) top = r.top;
      if (r.bottom > bot) bot = r.bottom;
    }
    return Math.ceil((isFinite(top) ? bot - top : 0) + pad);
  };
  function syncH() {
    root.style.setProperty('--box-h', natural(boxEl) + 'px');
    root.style.setProperty('--ui-h', natural(uiEl) + 'px');
  }
  /* 当前状态下的**第一个可见可聚焦入口**：折叠时台词按钮和整排功能键都被 `inert` 挡掉，
     所以候选顺序是「箭头（永远在）→ 台词按钮 → 锁 / 胶囊（折叠时不在）」。
     ⚠️ **不能硬写其中一个** —— 会在另一种状态下**静默失败**，activeElement 掉到 body
     （memories 2.60 / 2.72 那一族，已经栽过两次）。
     ⚠️ 判据用「祖先链上有没有 `inert`」+ 矩形非零，**不看 `visibility`**（那个会滞后）。 */
  /* ⚠️ 帖内页多一枚名牌按钮（`hudWho`），它排在台词按钮**之前** —— 读序是「先看是谁，再看他说的」。
     非帖内页 `whoBtn` 是 `null`，`find` 自然跳过 ⇒ 三页共用这一份候选表。 */
  const entry = () => [tgBtn, whoBtn, dlgBtn, lockBtn, chip].find((b) => b && !b.disabled
    && !b.closest('[inert]') && b.getBoundingClientRect().width > 0);

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 1600);
  }

  /* ══ 功能栏**不跟 hover**（用户：「默认展开、不跟 hover」）══
     所以这里没有「升起 / 收回」那一套了 —— `.hud__ui` 常态就是 `var(--ui-h)`，由 CSS 直接给。
     上一版的 `is-ui` 类、`mouseenter` / `mouseleave` / `focusin` 监听、`pinned`、`canHover`
     全部删掉：那些机制的前提是「功能栏按需升起」，而这个前提已经不存在。
     ⚠️ 模块唯一的显示开关是**折叠**（见下面的 setBox）。 */
  /* 播放器面板：**点击切换**（不跟 hover —— 跟 hover 的话鼠标一移向面板，面板就跑了）。
     ⚠️ 同时切 `.is-panel`：它把**功能栏那一排抬到文本框之上**（见 CSS 那段说明）——
        否则窄屏下铺满整宽的面板会被文本框压住、台词直接印在面板上。 */
  /* ⚠️ 文本框该不该 inert：**折叠态**（内容已经收走）或**歌单面板开着**（面板往上长、
     盖住了文本框右下角那三簇功能键）—— 两种情形都该 inert。
     ⚠️ 第 12 轮才补后面那一半：九枚键搬进框里之后，键盘 Tab 能走到**被面板挡住的键**上
        （原来只涉及 1 个台词按钮，现在 10 个）。所以抽成一处，setPanel / setBox 都调它，
        免得两边各写一遍、改一处漏一处。 */
  const syncBoxInert = () => {
    boxIn.inert = hudEl.classList.contains('is-fold') || !panel.hidden;
  };
  function setPanel(on) {
    /* ⚠️ 两个面板**互斥**：条上方只有一块地（`.pl__panel` 与 `.hud__card` 都挂在那一带）。
       开自己之前先把另一个关掉。 */
    if (on && cardEl && !cardEl.hidden) setCard(false);
    panel.hidden = !on;
    chip.setAttribute('aria-expanded', String(on));
    hudEl.classList.toggle('is-panel', on);
    syncBoxInert();
  }
  /* ══ 观测证卡片：**点开 / 点关 / Esc 关**（与歌单面板同一套交互），只是它挂在整个模块之上 ══
     ⚠️ 高度**一动不动**：卡片是 `.hud` 的**绝对定位直接子元素**，而 `natural()` 量的是
        `.hud__in` 的孩子 ⇒ 两处量高**永远看不见它** ⇒ `--box-h` / `--ui-h` 在开关前后逐字相同。
        这是「整条框不随开合上下跳」的守卫（高度一动就会不同步，§18.19 已栽过）。
     ⚠️ 内容**开的时候才建**：换说话人不必重建 DOM，也就不会把用户滚到一半的位置弹回去。 */
  const curSpeaker = () => (LINES[li] ? LINES[li].sp : '');
  /* ⚠️ 卡片内容的**唯一**入口。建 → 接错误兜底 → 回填色盘，三件事必须一起做、
     而且**顺序就是这个顺序**。实测踩到两个真 bug（都是「重建把刚才做的事冲掉」）：
       ① `setCard` 建完忘了回填 ⇒ 打开卡片时头像是**一个空方块**；
       ② `speak()` 里先把色盘回填好、**再** `cardEl.innerHTML = ...` ⇒ 刚填好的元素被换成新的空元素。
     所以这里的顺序是：**先建、后填**，谁调用都不许自己拆开做。 */
  const fillCard = (name) => {
    if (!cardEl || cardEl.hidden) return;
    cardEl.innerHTML = cardInner(name);
    wirePt(cardEl);
    setPtFb(cardEl, name);
  };
  function setCard(on) {
    if (!cardEl) return;
    if (on) {
      if (!panel.hidden) setPanel(false);
      cardEl.hidden = false;          /* 先让它可见 —— `fillCard` 对隐藏的卡片是 no-op */
      fillCard(curSpeaker());
    }
    cardEl.hidden = !on;
    hudEl.classList.toggle('is-card', on);
    if (whoBtn) whoBtn.setAttribute('aria-expanded', String(on));
  }

  /* ════ 整个模块的开关（用户：「右上角下拉控制的是整个模块的下拉」）════
     表现方式＝**右上角一个下拉箭头**，点一下把整条模块折成一条 28px 的折条。
     ⚠️ **折的是整个模块**：文本框 `.hud__body` **和**功能栏 `.hud__ui` 一起收 ——
        用户原话：「文本框这个模块是包含功能栏…它两是一个模块」。
     ⚠️ 折叠**只由显式动作触发**、**不跟 hover 自动折** —— 台词带 `aria-live="polite"`，
        打字机打到一半被折掉会把播报掐断；而 hover 自动折会让鼠标路过底边时误触发。
     ⚠️ 折叠 = 两排各自把 `height` 收到 0 / `--box-min`，**并且**把两个内层 `.hud__in` 的
        `opacity` 打到 0。为什么必须有 opacity 这一步：`height:0` **不会**把后代移出 Tab 顺序
        （`inert` 才管那个），而 `overflow:hidden` 只负责裁 —— 内容会留着半截露在折条上
        （第四轮那个「折起来还剩半截台词」就是这么来的）。
        为什么不用 `visibility`：它的延时切换在紧接往返里会**滞后**，第四轮实测造过随机失败。
     ⚠️ 箭头住在**裁剪区之外**（`.hud__body` 的直接子元素），两排都折了它仍然可见可聚焦 ——
        它是这个模块里唯一常驻的键盘入口。
     状态持久化，默认**展开**。 */
  const BOX_KEY = 'hoshikai:hudBox';
  function setBox(open, persist) {
    /* ⚠️ **这里不再看 `locked`** —— 用户判词：「锁不锁，跟整个模块折起来不要做关系，
       哪怕是锁着，也要能折起来」。上一版锁着会拒收折叠 + 弹提示，那是把两个开关焊在了一起。 */
    /* 折起来时先把歌单面板关掉：`.hud__ui` 折叠态带 `overflow:hidden`，而面板是悬在
       这一排上边界之外的 —— 不先关就会在折的过程中被剪掉一角。 */
    if (!open) { setPanel(false); setCard(false); }
    hudEl.classList.toggle('is-fold', !open);
    syncBoxInert();                /* 折起来 ⇒ 文本框内容不可聚焦；箭头在外面，它不受影响 */
    uiIn.inert = !open;
    tgBtn.setAttribute('aria-expanded', String(open));
    const label = open ? '收起底部模块' : '展开底部模块';
    tgBtn.setAttribute('aria-label', label);
    tgBtn.title = label;
    /* ⚠️ `persist === false` 时**不写 localStorage** ——
       「看背景」为了留一条回头路会临时把模块折起来（见 setBgOnly），
       那次折叠是**临时状态**，不该让下次进站时模块默认是折着的。 */
    if (persist !== false) { try { localStorage.setItem(BOX_KEY, open ? '1' : '0'); } catch (e) {} }
  }
  tgBtn.addEventListener('click', () => {
    const wasFolded = hudEl.classList.contains('is-fold');
    setBox(wasFolded);                             /* 折着 ⇒ 展开；展着 ⇒ 折起 */
    /* ⚠️ **这一下同时是「看背景」的回头路**：bg-only 下整条 HUD 是 `visibility: hidden`，
       只有这枚折条箭头还留着（见 CSS 那条）。所以展开时若还在 bg-only，就一并退出来 ——
       否则用户点开一个空壳、还是回不到正常界面。 */
    if (wasFolded && root.classList.contains('bg-only')) setBgOnly(false);
  });

  /* ════ 锁：**锁住功能键**（防误触）════
     ⚠️ **第 13 轮把它的职责整个换掉了。** 第 6 轮定的是「锁住功能键、防误触」，
        用户判词：「你怎么那么笨，我一直在说锁控制的是功能栏的**出现**，不是控制能不能用」。
     ⇒ 现在：锁「关」（**锁梁落下**，`aria-pressed="true"`）＝ 功能栏**常驻显示**；
            锁「开」（**锁梁翘起**，`aria-pressed="false"`）＝ **自动隐藏**（鼠标移上去 / 键盘聚焦才浮出）。
        这个映射是用户从两个候选里选的「**锁＝钉住**」那一个（习惯读法）。
     ⇒ 所以这里**不再 `disabled` 任何键**：键永远能按，锁只管它**露不露面**。
     ⚠️ 默认是**自动隐藏**（用户要的 galgame 效果：「鼠标不放上去他不会悬浮出来」）
        ⇒ 默认 `locked = false`（锁梁翘起）。只有用户**显式点过**才由 localStorage 覆盖。
     图形控件：状态由**锁梁的姿态**表达（落下＝钉住 / 翘起＝松开），
     可见标签只写**当前模式**（常驻 / 自动），语义另在 `aria-label` + `aria-pressed`。 */
  const LOCK_KEY = 'hoshikai:hudUiLock';
  function setLocked(on) {
    locked = on;
    /* 锁梁落下（on）＝ 钉住 ＝ 常驻；锁梁翘起（!on）＝ 松开 ＝ 自动隐藏。
       ⚠️ 用一个类挂到 `.hud` 根上，让 CSS 去管「隐不隐」——
          不要在这里直接改样式，否则折叠态 / 面板态又要多一处互相打架的状态。 */
    hudEl.classList.toggle('is-autohide', !on);
    lockBtn.setAttribute('aria-pressed', String(on));
    const label = on ? '功能栏常驻显示（点一下改成自动隐藏）'
                     : '功能栏自动隐藏（鼠标移上去才出现；点一下钉住）';
    lockBtn.setAttribute('aria-label', label);
    lockBtn.title = label;
    const t = lockBtn.querySelector('[data-lock-t]');
    if (t) t.textContent = on ? '常驻' : '自动';
    try { localStorage.setItem(LOCK_KEY, on ? '1' : '0'); } catch (e) {}
  }
  lockBtn.addEventListener('click', () => setLocked(!locked));
  try { if (localStorage.getItem(LOCK_KEY) === '1') locked = true; } catch (e) {}
  /* 恢复顺序**必须先锁后折**：`setBox(false)` 会读 `locked`（锁着也能折，但状态要先就位）——
     先折再置锁的话，恢复出来的折叠态会跟锁的初始值错位。 */
  setLocked(locked);
  try { if (localStorage.getItem(BOX_KEY) === '0') setBox(false); } catch (e) {}
  chip.addEventListener('click', () => setPanel(panel.hidden));
  syncH();
  /* ⚠️ 立绘的尺寸**全是 CSS 的事**（框固定形状、图 `cover` 进去），所以这里只需要重测两排 bar 的
     高度 —— 上一版还要在这里重算立绘尺寸，那套已经整块删掉了（见上面 wirePt 那段说明）。 */
  addEventListener('resize', syncH);
  /* 字体加载完再量一次：webfont 的度量会让中文行盒高度变一点，量早了会留缝 */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncH).catch(() => {});

  /* ══ 看背景 / 回到论坛（接管 dock.js）══
     ⚠️「看背景」只在**真有背景层**的页面上出现：`.bg` 只挂首页，
     板块页与帖内页点了它只会看到一片空白 —— 所以功能键也跟背景走。
     ⚠️⚠️ **第 17 轮修的是一个真 bug**：用户报「点击看背景后，不能恢复」。
        根因：`html.bg-only .hud { visibility: hidden }` 把**整条 HUD 连同那枚键**一起藏了，
        而那枚键就住在 HUD 里 ⇒ **回头路被自己藏掉了**（只剩 Esc 能退，没人知道）。
        用户给的方案：**点「看背景」时自动把模块折起来** —— 屏幕上只剩折条上那枚箭头，
        点它展开就顺带退出看背景。
      ⇒ 三处配合，**缺一不可**：
        ① CSS 让折条箭头在 bg-only 下**仍然可见**（其余照旧藏）；
        ② 这里进入 bg-only 时**顺手折起来**（`setBox(false, false)`）；
        ③ 箭头展开时**若还在 bg-only 就一并退出**（见下面 tgBtn 的监听）。
        ⚠️ 折的时候传 `persist = false`：这是**临时状态**，不该写进 localStorage
           —— 否则「看一次背景」会让下次进站时模块默认是折着的，是个莫名其妙的副作用。 */
  const bgKey = document.querySelector('.key[data-k="看背景"]');
  function setBgOnly(on) {
    root.classList.toggle('bg-only', on);
    if (bgKey) {
      bgKey.setAttribute('aria-pressed', String(on));
      const label = on ? '回到论坛' : '看背景';
      bgKey.title = label;
      bgKey.setAttribute('aria-label', label);
      bgKey.dataset.k = label;                     /* 状态翻转后仍然认得自己 */
    }
    if (on) {
      setBox(false, false);                        /* 折起来，只留那枚箭头当出口 */
      /* 焦点交给那枚箭头 —— 原来那枚键马上要被藏起来，键盘用户不该被留在它上面。
         ⚠️ 必须在**下一个任务**里给焦点（同 Esc 那条：同步给会被静默拒绝）。 */
      setTimeout(() => { void getComputedStyle(hud).visibility; const e = entry(); if (e) e.focus(); }, 0);
    }
  }
  if (bgKey) bgKey.setAttribute('aria-pressed', 'false');

  /* ══ 功能键 ══ */
  /* ⚠️⚠️ 委托的绑定目标**改成 `document`**（第 15 轮）。
     这条踩过两次，两次都是同一个病：**把监听绑在一个会变的祖先上**。
       · 第 12 轮：键搬进 `.hud__body`，而监听绑在 `.hud__ui` ⇒ `closest('.key')` 够不到；
       · 第 15 轮：键搬回 `.hud__ui`，而监听已经改成绑 `.hud__body` ⇒ **又一次全部点不动**。
     两次都**不报错、不抛异常、控制台干净**，只有「真的点一下」才发现。
     ⇒ 现在绑到 `document`：功能键无论将来搬进哪个容器都还能用，
        这个选择对「键住哪儿」**免疫**。`#hudNext`（台词按钮）另有自己的监听，不受影响。 */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.key');
    if (!b) return;
    if (b.dataset.todo === '1') { toast(b.dataset.k + '：还没做'); return; }
    const k = b.dataset.k;
    if (k === '看背景' || k === '回到论坛') { setBgOnly(!root.classList.contains('bg-only')); toast(k === '看背景' ? '看背景' : '回到论坛'); return; }
    if (k === '夜间') { const t = document.getElementById('themeTg'); if (t) t.click(); return; }
    if (k === '回顶') { scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); return; }
    /* ⚠️ 这枚键 2026-10-15 之前是「把焦点送到搜索框」—— 而那时**七个页面上的搜索框全是死的**
       （`onsubmit="return false"`），所以它的实际行为是「点一下，光标进一个什么都做不了的框」。
       现在框是真的了（GET 提交到 ./search/），这条链才第一次贯通。
       仍然优先聚焦而不是直接跳页：搜「关键词」的人十有八九是想接着打字。
       万一哪天某页把搜索框去掉了，就退化成直接去结果页 —— 不许变回「什么都不发生」。 */
    if (k === '搜索') {
      const q = document.querySelector('.search input');
      if (q) { q.focus(); q.select(); } else { location.href = './search/'; }
      return;
    }
    /* 私信：开站里那扇观测窗（dm.js 已把窗内容与口径全部接好）。
       ⚠️ dm.js 在 viewer.js 之后加载；如果它还没到，别静默 —— 给一句话，不假装没点。 */
    if (k === '私信') {
      if (window.HKDm) HKDm.open(b);
      else toast('私信：还没加载完，请再点一次');
      return;
    }
    /* 举报申诉：帖内页专属的临时键（report.js 只在帖内页加载）。 */
    if (k === '举报申诉') {
      if (window.HKReport) HKReport.open(b);
      else toast('举报申诉：还没加载完，请再点一次');
      return;
    }
    toast(k);
  });

  /* ══ Esc：**先关面板 → 再退出看背景**（顺序不能反，否则一次 Esc 关掉两层）══
     ⚠️ 第五轮删掉了中间那一支「收起功能栏」：功能栏已经画进模块、**不再按需升起**
        （用户：「默认展开、不跟 hover」），所以它没有「临时升起」这个状态可收。
        锁的状态也不由 Esc 管（和上一版一致）。 */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    /* 模态窗（看图 / 私信）开着时，Esc 归它管 —— 否则一次 Esc 会同时关掉窗和 HUD 面板。
       viewer.js 的 Esc 监听在 document 上，排在后面；这里让路，它才关得掉窗。 */
    if (window.HKWin && HKWin.isOpen()) return;
    /* ⚠️ 卡片**排在面板之前**：后开的先关。现有顺序「先关面板 → 再退看背景」不变，
       卡片只是插在它前面。**锁不归 Esc 管**（这一条从第 13 轮起就没变过）。 */
    if (cardEl && !cardEl.hidden) { setCard(false); if (whoBtn) whoBtn.focus(); return; }
    if (!panel.hidden) { setPanel(false); chip.focus(); return; }
    if (root.classList.contains('bg-only')) {
      /* ⚠️ 焦点不能在这次 keydown **任务内**还回去。
         三条实测（同一行代码、只差执行时机）：
           · 同步（在 keydown 处理器里直接 `focus()`）—— 被静默拒绝，activeElement 停在 BODY；
             此时同步读 `getComputedStyle(hud).visibility` 还可能是 `hidden`（RM 下就是）
           · `requestAnimationFrame(...)` —— 仍然失败：rAF 回调跑在**样式重算之前**，同一帧里属性还是旧的
           · `setTimeout(..., 0)` —— 成功：那是**下一个任务**，上一个任务的样式变更已经落地
         所以用宏任务，并顺手把 `visibility` 读出来（读它会强制一次样式重算，双保险）。
         焦点还给 `entry()` 挑出的**当前第一个可见可聚焦入口**（展开态下是台词按钮，
         折起来时是那枚箭头 —— 见 `entry()` 的说明）。功能栏现在**常驻**，
         所以 Tab 从那儿往后就能走到任何一枚键，不需要再靠 focusin 去「升起来」。
         ⚠️ 不能同步调 `focus()`：见上面三条实测（必须在**下一个任务**里）。 */
      setBgOnly(false);
      /* ⚠️ 一并**展开**：退出「看背景」＝回到正常界面。
         不展开的话用户看到的是一个空壳折条 —— **Esc 与点箭头必须给同一个结果**。 */
      setBox(true);
      setTimeout(() => { void getComputedStyle(hud).visibility; const e = entry(); if (e) e.focus(); }, 0);
    }
  });

  /* ══ 台词：真实站点内容，逐字打出（RM 或关掉时直接整句）══ */
  const nEl = hudEl.querySelector('[data-name]');
  const tEl = hudEl.querySelector('[data-text]');
  const mEl = hudEl.querySelector('[data-mag]');
  let li = 0, twTimer = 0;
  function speak() {
    const l = LINES[li];
    nEl.dataset.t = l.sp; nEl.textContent = l.sp;
    mEl.querySelector('b').textContent = l.mag;
    mEl.style.display = l.mag ? '' : 'none';
    /* 立绘位底下的**首字色盘**跟着说话人走（同名同色 —— 与全站 `hueOf` 同一条纪律）；
       帖内页再多两件：名牌行里那几条**直接可见的信息**、以及卡片开着时一并换内容
       （换了人、档案还是上一位，就自相矛盾了）。
       立绘位那枚按钮的**可读名字**也跟着换 —— 不然读屏永远听到「查看头像」，不知道看的是谁。 */
    setPtFb(hudEl, l.sp);
    if (ptBtn) {
      ptBtn.setAttribute('aria-label', `查看 ${l.sp} 的头像`);
      /* ⚠️ 名字写进 `data-cap`（不是自造的 pt-cap）：`viewer()` 的取标题规则认的就是它
         ⇒ 看图窗的标题栏会显示这位说话人的名字（而且还走格子条）。 */
      ptBtn.dataset.cap = l.sp;
    }
    if (infoEl) infoEl.innerHTML = infoHTML(l.sp);
    fillCard(l.sp);              /* 卡片若开着：建 → 接错误兜底 → 回填色盘，一次做完（别自己拆开做） */
    clearInterval(twTimer);
    const full = '「' + l.tx + '」';
    if (reduce()) { tEl.textContent = full; syncH(); return; }
    let k = 0; tEl.textContent = '';
    twTimer = setInterval(() => { tEl.textContent = full.slice(0, ++k); if (k >= full.length) clearInterval(twTimer); }, 25);
    /* ⚠️ **换一条就要重新量高**（2026-10-10 补的真 bug）：
       `syncH()` 原来只在载入 / resize / 字体就绪时跑，而它第一次跑是在 `speak()` **之前** ——
       那一刻名牌还是空的、webfont 也未必落地 ⇒ 量出来的 `--box-h` 偏小，
       而 `.hud__body` 带 `overflow: hidden` ⇒ 多出来的那几像素被**静默裁掉**。
       实测（首页 1400）：`--box-h` 停在 118，框内孩子却要 122（名牌行 18 + 台词 62.8 + padding 41）。
       名牌文字 / 字号 / 字体一变，行盒高度就会变，所以**量高的时机必须跟着内容走**。 */
    syncH();
  }
  dlgBtn.addEventListener('click', () => { li = (li + 1) % LINES.length; speak(); });
  /* ⚠️ 名牌按钮的监听绑在 **`document`** 上，不绑 `.hud__body` ——
     这个模块里的键已经因为「把一个会动的祖先当绑定点」栽过两次（第 12 / 15 轮，
     两次都**不报错、控制台干净**）。绑 `document` 对「谁搬到哪个容器」免疫。 */
  document.addEventListener('click', (e) => {
    if (!whoBtn || !e.target.closest('#hudWho')) return;
    setCard(cardEl.hidden);
  });
  speak();

  /* ══ 播放器：把「当前曲目」画到三处（顶部 / 唱片封面 / 胶囊缩略图） ══
     选中一条就调 `renderNow()` —— 三处一起变，不会各说各话。 */
  seek.style.setProperty('--p', '0%');
  function renderNow() {
    const t = curTrack();
    const bg = coverGradient(t ? t.seed : 43, t ? t.hue : 226);
    hudEl.querySelector('[data-pl-cov]').style.background = bg;
    hudEl.querySelector('[data-pl-sleeve]').style.background = bg;
    const title = t ? t.title : '暂无曲目';
    hudEl.querySelector('[data-pl-title]').textContent = title;
    hudEl.querySelector('[data-pl-title2]').textContent = title;
    hudEl.querySelector('[data-pl-artist]').textContent = t ? t.artist + ' · ' + t.album : '等待曲目';
  }

  /* 歌单页签 + 曲目列表。收藏**写 localStorage** —— 存不住的收藏是假的。 */
  const FAV_KEY = 'hoshikai:favs';
  const favs = (() => { try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch (e) { return new Set(); } })();
  const tabsEl = document.getElementById('hudPlTabs');
  const listEl = document.getElementById('hudPlList');

  function renderTabs() {
    tabsEl.innerHTML = PLAYLISTS.map((p, i) => `<button class="pl__tab" type="button" role="tab"
      id="hudPlTab${i}" aria-controls="hudPlBody" data-pl="${i}"
      aria-selected="${i === curPl}">${esc(p.name)}</button>`).join('');
  }
  /* 列表固定几行：**从 CSS 的 `--pl-rows` 读**，不在 JS 里再写一个 6（保持一处事实来源）。 */
  const listRows = () => parseInt(getComputedStyle(root).getPropertyValue('--pl-rows'), 10) || 6;
  function renderList() {
    const cur = curTrack();
    const tracks = PLAYLISTS[curPl].tracks;
    const rows = tracks.map((t, i) => `
      <li class="pl__row" data-cur="${t === cur ? 1 : 0}">
        <button class="pl__trk" type="button" data-tr="${i}" title="设为当前曲目">
          <span class="pl__tcover" data-cov="${t.seed},${t.hue}" aria-hidden="true"></span>
          <span class="pl__tmeta"><b>${esc(t.title)}</b><span>${esc(t.artist)} · ${esc(t.album)}</span></span>
        </button>
        <button class="pl__fav" type="button" data-fav="${t.id}" aria-pressed="${favs.has(t.id)}"
                aria-label="收藏 ${esc(t.title)}"><svg class="i" aria-hidden="true"><use href="#i-star"/></svg></button>
      </li>`);
    /* 不足 `--pl-rows` 首 ⇒ 补**占位行**把列表撑到固定高度（用户：「没超就显示占位歌单」）。
       超过则不补、由 CSS 的 `overflow-y:auto` 滚动。
       ⚠️ 占位行 `aria-hidden` 且没有 data-tr / data-fav：**它不是内容**，
          对读屏与键盘都不该存在。（这也是为什么不能拿「把真行压暗」当占位 ——
          那会被读成「这首坏了」，和「空壳键＝没点亮的星位」是同一个道理。） */
    const pad = Math.max(0, listRows() - tracks.length);
    for (let i = 0; i < pad; i++) {
      rows.push('<li class="pl__row pl__row--ph" aria-hidden="true">'
        + '<span class="pl__tcover"></span><span class="pl__slot"></span></li>');
    }
    listEl.innerHTML = rows.join('');
    /* 封面逐条内联：站点的程序化封面配方（与帖子缩略图同一套） */
    listEl.querySelectorAll('[data-cov]').forEach((el) => {
      const [s, h] = el.dataset.cov.split(',').map(Number);
      el.style.background = coverGradient(s, h);
    });
  }
  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pl]'); if (!b) return;
    curPl = +b.dataset.pl; curTr = 0; renderTabs(); renderList(); renderNow();
  });
  listEl.addEventListener('click', (e) => {
    /* ⚠️ 收藏先判：它和「选中这首」是**同一行里的两枚兄弟按钮**（button 不能套 button） */
    const f = e.target.closest('[data-fav]');
    if (f) {
      const id = f.dataset.fav;
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      f.setAttribute('aria-pressed', String(favs.has(id)));
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch (err) {}
      return;
    }
    const b = e.target.closest('[data-tr]'); if (!b) return;
    curTr = +b.dataset.tr; renderList(); renderNow();
  });
  renderTabs(); renderList(); renderNow();

  /* 音量是**真的**：写 localStorage + 作用到 <audio>.volume。
     localStorage 被禁用时 try/catch 兜住，不影响其它功能。 */
  const VOL_KEY = 'hoshikai:vol';
  function readVol() {
    try { const v = parseFloat(localStorage.getItem(VOL_KEY)); if (isFinite(v) && v >= 0 && v <= 1) return v; } catch (e) {}
    return 0.7;
  }
  function applyVol(v) {
    audio.volume = v;
    vol.value = String(Math.round(v * 100));
    vol.style.setProperty('--v', (v * 100).toFixed(0) + '%');
    try { localStorage.setItem(VOL_KEY, String(v)); } catch (e) {}
  }
  vol.addEventListener('input', () => applyVol(vol.valueAsNumber / 100));
  applyVol(readVol());

  /* （「常驻 ⇄ 收起」那一枚带字胶囊已经删掉，换成功能区里那枚**锁**——接线在文件上半部分。
     为什么删：用户判词「不要按钮式的，要图形行为学」。） */

  /* ══════════════ 顶部导航：向下滚「星幕收拢」，向上滚立刻回来 ══════════════
     为什么要做：底部那条现在**常驻**，所以让顶部这条随阅读让开，屏幕才真的变干净 ——
     而且两条**不会一起消失**（底部一直在手边）。这就是用户要的「区分」。
     四条判断，都是「不突兀 / 不疲劳」的具体化：
       · **不位移布局**：顶栏是 sticky，只动 `transform` + `opacity` ⇒ 页面一点不跳
         （改高度会抖，改 `display` 会掉滚动位置）
       · **迟滞 + 不对称**：向下要滚过 **6px** 才收（忽略回弹与滚轮噪声），向上 **1px 就回**；
         时长也不对称（收 300ms / 回 200ms，写在 CSS 里）—— 回来的响应感比离开的优雅更重要
       · **不在顶部收**：`scrollY ≤ 两栏高` 时永远显示，免得「刚进页面就没了」
       · **焦点在里面时永不收**：否则键盘用户会在滚动中失去它（而且隐藏子树不可聚焦，
         一旦收掉就再也 Tab 不进去）。这也顺带保住「Esc 之后焦点还在顶栏」这类路径。
     rAF 合并 + passive 监听：滚动里不做重排（project.md §10 的性能纪律）。 */
  const bar = document.querySelector('.topbar');
  if (bar) {
    let lastY = scrollY, raf = 0, barFocused = false;
    const setNav = (hide) => root.classList.toggle('nav-hide', hide);
    bar.addEventListener('focusin', () => { barFocused = true; setNav(false); });
    bar.addEventListener('focusout', () => { barFocused = false; });
    addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = scrollY, dy = y - lastY;
        lastY = y;
        if (barFocused || y <= bar.offsetHeight * 2) { setNav(false); return; }
        if (dy > 6) setNav(true);
        else if (dy < 0) setNav(false);
      });
    }, { passive: true });
  }
})();
