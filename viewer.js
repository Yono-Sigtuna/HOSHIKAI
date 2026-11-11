/* 星海社 · 观测窗（悬浮窗）+ 看图窗
   ──────────────────────────────────────────────────────────────────────
   两件东西放在一个文件里，因为它们是**一体**的：
     ① `.win`     —— **通用悬浮窗**：站内风格的边框 + 标题栏，**标题栏就是拖动手柄**；
     ② `viewer()` —— **看图窗**：用 `.win` 装着一张图，上/下一张 · 滚轮缩放 · 拖动平移 · 双击复位。

   用法（写在 HTML 里就行，不用碰 JS）：
       <img src="…" onclick="viewer(this)">
       <li data-cap="序章 · 归乡的站台" onclick="viewer(this)"><img …></li>
   ⇒ 点谁就把谁放大。
   **成组规则**：默认把**同一个父元素下所有能唤醒看图窗的兄弟**当成一组（所以一列缩略图天然能翻页）；
   要跨容器成组就显式写 `data-view-group="shots"`（同名的一组）。
   要显示标题就写 `data-cap="…"`（没有就退回 `img.alt` / `title`）。

   为什么单独一个文件、注入式建 DOM：与 hud.js 同一个理由 —— 三页共用一份，
   三份 HTML 各抄一遍会有三处不同步的风险（`hud.js` 头部的原话）。

   站内母题（一个图形都不新造）：
     · 外框 / 底 / 硬投影 → **观测记录牌**的配方（星野三件套 + 2px `--hud-edge` + `4px 4px 0`）
     · 底上的那层**天球坐标网格** → 用户 2026-10-11 从六版里挑定的「星图窗」；线走站点那条
       `.42` 的金线令牌 `--hud-gold-w`，标题栏与底栏的高度取网格的整数格
     · 标题栏左边 → **站里那条格子条**（望远镜 + 逐格字，`.fs*` 组件，板块页 / 帖子页头部用的同一个）
     · 关闭键 → 右上角，直角（与网格同一套几何）
   ⚠️ 曾有过的「刻度尺 + 星芒」两件**已整条撤掉** —— 用户在立绘框上已经用过它们，
      「你聊天框头像用这个元素，这里也用这个，你是往一个地方薅羊毛啊」。**同一个元素不在两处当记号。**
   依赖：theme.js 的 `prefersReduce()`（有就用，没有就退回 media query）。 */
(function () {
  'use strict';
  if (window.viewer) return;                     /* 防重复注入 */
  const root = document.documentElement;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = () => (typeof prefersReduce === 'function'
    ? prefersReduce() : matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ── 标题栏左边：**站里那条格子条**（望远镜 + 逐格字）──
     逐字复用 `style.css` 里的 `.fs*` 组件（板块页 / 帖子页头部用的就是它，血统来自 GALBase），
     这里只覆盖一个 `--tile`（那一整条是按 vw 算边长的，进了窗口要按窗口缩放）。
     ⚠️ 只做一处**减法**：不搬 `.fs__arc` 与 `.fs__sparks` —— 那两个是给页面头部那种大场面配的，
        缩到 26px 只是噪点。
     ⚠️ **两头必须封口**（2026-11-07 用户：「格子条开头是蓝色背景黑望远镜，结尾应该是蓝色背景黑色星星，
        这是固定搭配」）。早先只留了开头的望远镜格、把结尾的星环格当成「重复元素」删了 —— 那一版读起来
        就是一条**断头的格子条**。站里所有格子条（板块页 / 帖子页 / 站点地图 …）都是「望远镜 → 逐字 → 星环」
        这一套，窗口里也必须一样，否则它在整站语汇里是残的。
     ⚠️ 格子数要**封顶**：标题可能很长（一列几十个字），不封顶就会把标题栏撑爆。
        超过 12 格就收成「前 11 格 + 一枚省略格」。 */
  function titleStrip(name) {
    const chars = [...String(name || '观测窗')];
    const MAX = 12;
    const shown = chars.length > MAX ? chars.slice(0, MAX - 1).concat('…') : chars;
    const tiles = shown.map((ch, i) =>
      `<span class="fs__t${i === 0 ? ' fs__t--deep' : ''}" style="--i:${i + 1}">${esc(ch === ' ' ? ' ' : ch)}</span>`
    ).join('');
    return `<span class="fs" style="--hue:218;--n:${shown.length + 2}">
      <svg class="fs__tel" viewBox="0 0 76 75" aria-hidden="true"><use href="#v-tel"/></svg>
      <span class="fs__wrap"><span class="fs__bar">
        <span class="fs__t fs__t--deep" style="--i:0"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#v-tel-tile"/></svg></span>
        ${tiles}
        <span class="fs__t fs__t--deep fs__t--cap" style="--i:${shown.length + 1}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#v-stars4"/></svg></span>
      </span></span>
    </span>`;
  }
  function setTitle(name) {
    const t = name || '观测窗';
    /* 格子条是**图形**（逐格拆字），对读屏要读成一句话 ⇒ 整条 aria-hidden，
       真正的名字走 `aria-labelledby` 指到的这个元素上的 `aria-label`。 */
    titleEl.innerHTML = `<span aria-hidden="true">${titleStrip(t)}</span>`;
    titleEl.setAttribute('aria-label', t);
  }

  /* ══ 自注入 sprite ══
     站点的 sprite 在三个 HTML 里各有一份副本、改一处要三处同步；`hud.js` 已经立了
     「自己注入一小份、用新前缀」的先例（`#k-*`）。这里照做，用 `#v-*`，页面自己的 sprite 一个不动。 */
  document.body.insertAdjacentHTML('afterbegin', `
    <svg class="sprite" aria-hidden="true" focusable="false">
      <symbol id="v-close" viewBox="0 0 24 24"><path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"/></symbol>
      <symbol id="v-prev" viewBox="0 0 24 24"><path d="M14.5 5.5 8 12l6.5 6.5"/></symbol>
      <symbol id="v-next" viewBox="0 0 24 24"><path d="M9.5 5.5 16 12l-6.5 6.5"/></symbol>
      <symbol id="v-star" viewBox="0 0 24 24"><path d="M12 3.4 14.24 9.76 20.6 12l-6.36 2.24L12 20.6l-2.24-6.36L3.4 12l6.36-2.24z" fill="currentColor" stroke="none"/></symbol>
      <!-- 星环封口格那枚 **i-stars4**：逐字复制站内 sprite（与格子条结尾那一格同一个图形）。
           复制而不是 use 页面那份的理由同上一条望远镜：use 指向不存在的 id 是无声的。 -->
      <symbol id="v-stars4" viewBox="0 0 24 24"><g fill="currentColor">
        <path d="M15.4 2.6c.5 3.6 2.1 5.2 5.7 5.7-3.6.5-5.2 2.1-5.7 5.7-.5-3.6-2.1-5.2-5.7-5.7 3.6-.5 5.2-2.1 5.7-5.7Z"/>
        <path d="M6.1 10.9c.32 2.3 1.35 3.33 3.65 3.65-2.3.32-3.33 1.35-3.65 3.65-.32-2.3-1.35-3.33-3.65-3.65 2.3-.32 3.33-1.35 3.65-3.65Z"/>
        <circle cx="18.6" cy="14.9" r="1.5"/><circle cx="7.2" cy="20.4" r="1.05"/></g></symbol>
      <!-- 望远镜：**逐字复制**站内 sprite 里那两枚（i-telescope / i-telescope-tile），不新造图形。
           为什么复制一份而不是直接 use 页面那份：三页各有一份副本，将来某个页面漏了就**静默不显示**
           （use 指向不存在的 id 是无声的）。与 hud.js 自注入 k- 前缀那批是同一个理由。
           ⚠️ 本段在模板字符串**内部** —— 注释里**不能出现反引号**（我这一轮就这么栽了一次：
              写上 id 的反引号当引号用，第一个就把模板提前闭合了，报错还指着模板开头那行）。 -->
      <symbol id="v-tel" viewBox="0 0 76 75"><g fill="currentColor"><path d="M31 46 L15.5 72.5 L21 72.5 L33 48.5 Z"/><path d="M31 46 L46.5 72.5 L41 72.5 L29 48.5 Z"/><path d="M31 46 L29.4 72.5 L32.6 72.5 L33 48.5 Z"/><rect x="20.5" y="58" width="21" height="3" rx="1.5" transform="rotate(-4 31 59.5)"/><rect x="26" y="36" width="10" height="11.5" rx="1.8"/><rect x="24.5" y="31.5" width="13" height="5.4" rx="1.8"/><g transform="rotate(-31 31 32)"><rect x="10.5" y="27.4" width="45" height="9.4" rx="2"/><rect x="52.5" y="25.2" width="7.6" height="13.8" rx="1.6"/><rect x="4.6" y="29" width="6.2" height="6.2" rx="1.5"/><rect x="22" y="17.6" width="21" height="4.2" rx="1.7"/><rect x="23" y="20.6" width="2.8" height="5.6" rx="1.1"/><rect x="39.4" y="20.6" width="2.8" height="5.6" rx="1.1"/></g></g></symbol>
      <symbol id="v-tel-tile" viewBox="0 0 40 40"><g fill="currentColor"><g transform="rotate(-32 20 17)"><rect x="4" y="13.4" width="28" height="7.4" rx="1.6"/><rect x="30" y="11.8" width="6" height="10.6" rx="1.4"/><rect x="0.6" y="14.6" width="4.4" height="5" rx="1.2"/></g><rect x="17.2" y="21" width="5.6" height="4.6" rx="1.2"/><path d="M20 24.5 L12.6 38.5 L16.7 38.5 L21 26.4 Z"/><path d="M20 24.5 L27.4 38.5 L23.3 38.5 L19 26.4 Z"/><path d="M20 24.5 L19.2 38.5 L20.8 38.5 L21 26.4 Z"/></g></symbol>
    </svg>`);

  /* ══════════════════ ① 通用悬浮窗 ══════════════════
     ⚠️ 位置用 `left/top` 的**像素值**，不用 `transform: translate(-50%,-50%)` 居中 ——
        拖动要直接改坐标，两套混着写会在第一次拖动时「跳」一下（居中基准与实际坐标不同源）。 */
  const WIN = document.createElement('div');
  WIN.className = 'win';
  WIN.id = 'hkWin';
  WIN.hidden = true;
  WIN.setAttribute('role', 'dialog');
  WIN.setAttribute('aria-modal', 'true');
  WIN.setAttribute('aria-labelledby', 'hkWinT');
  WIN.innerHTML = `
    <div class="win__bar" data-win-drag>
      <!-- 标题栏左边就是**站里那条格子条**（望远镜 + 逐格字）。2026-10-11 用户选定的方案：
           「星图窗这版不错，把**格子条**融入左上角，还有**天文望远镜**，**关闭放右上角**」。
           ⚠️ 刻度尺与星芒那两件**整条撤掉了**：用户在立绘框上已经用过它们，
              再往窗口上用就是同一个元素薅两次（原话「你往一个地方薅羊毛啊」）。 -->
      <span class="win__t" id="hkWinT"></span>
      <button class="win__x" type="button" data-win-close aria-label="关闭（Esc）">
        <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#v-close"/></svg>
      </button>
    </div>
    <div class="win__body"></div>`;

  /* 遮罩：点它 = 关窗（灯箱的标准动作） */
  const VEIL = document.createElement('div');
  VEIL.className = 'win-veil';
  VEIL.hidden = true;

  document.body.appendChild(VEIL);
  document.body.appendChild(WIN);

  const bar = WIN.querySelector('[data-win-drag]');
  const body = WIN.querySelector('.win__body');
  const titleEl = WIN.querySelector('.win__t');
  const closeBtn = WIN.querySelector('[data-win-close]');

  let lastFocus = null;

  const isOpen = () => !WIN.hidden;

  /* ══ 拖动：**只认标题栏** ══
     ⚠️ 用 Pointer Events + `setPointerCapture`，不用 mouse/touch 两套：
        指针捕获之后，**指针移出窗口甚至移出视口**也照样收到 move（拖动中途松手不会卡住）。
     ⚠️ 松手必须**同时** `releasePointerCapture` 与复位 `dragging` —— 只做一半的话，
        下一次 pointermove 仍按「正在拖」处理（指针早松了，窗口却跟着跑）。 */
  let dragging = false, dx0 = 0, dy0 = 0, lx0 = 0, ly0 = 0;
  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-win-close]')) return;      /* 点关闭键不算拖 */
    if (e.button !== 0) return;
    dragging = true;
    WIN.classList.add('is-dragging');
    /* ⚠️ 必须包 try/catch：某些情况下（指针已经不在活跃状态、合成事件）这一步会**抛异常**，
       一抛就把整个 pointerdown 处理器打断 ⇒ `dragging` 停在 false ⇒ **这条拖动直接死掉**，
       而且不报给用户任何东西。捕获失败最多是「拖出窗口时收不到 move」，比整条死掉好得多。 */
    try { bar.setPointerCapture(e.pointerId); } catch (err) { /* 拿不到捕获，照常拖 */ }
    dx0 = e.clientX; dy0 = e.clientY;
    lx0 = WIN.offsetLeft; ly0 = WIN.offsetTop;
    e.preventDefault();
  });
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const w = WIN.offsetWidth, h = WIN.offsetHeight;
    /* ⚠️ 夹在视口内：**至少留 48px 的标题栏在屏幕里**，否则窗口被拖出视口就再也抓不回来
       （这是「拖拽窗口」这一类控件最常见的死法）。 */
    const keep = 48;
    WIN.style.left = clamp(lx0 + (e.clientX - dx0), keep - w, innerWidth - keep) + 'px';
    WIN.style.top = clamp(ly0 + (e.clientY - dy0), 0, innerHeight - keep) + 'px';
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    WIN.classList.remove('is-dragging');
    try { bar.releasePointerCapture(e.pointerId); } catch (err) { /* 指针已经没了，无所谓 */ }
  };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

  /* 居中：每次开窗都重新居中（上次拖到哪儿不留给下一位访客） */
  function centerWin() {
    const w = WIN.offsetWidth, h = WIN.offsetHeight;
    WIN.style.left = Math.max(8, Math.round((innerWidth - w) / 2)) + 'px';
    WIN.style.top = Math.max(8, Math.round((innerHeight - h) / 2)) + 'px';
  }

  /* ══ 滚动锁 ══
     ⚠️ 不能只写 `html { overflow: hidden }` —— 滚动条一消失，整页内容会**横移一个滚动条宽**
        （站点的 `§18.8` 对顶栏退场的要求就是「不位移、不跳」）。
        所以量出滚动条宽度，补成 `body` 的右内边距 ⇒ 内容原地不动。 */
  function lockScroll(on) {
    if (on) {
      const sbw = innerWidth - root.clientWidth;
      root.style.setProperty('--sbw', sbw > 0 ? sbw + 'px' : '0px');
    }
    root.classList.toggle('is-viewing', on);
    WIN.hidden = !on;
    VEIL.hidden = !on;
  }

  /* ⚠️ 焦点归还的目标是**触发它的那个元素本身**（由 `viewer(el)` 传进来），
     不是「开窗那一刻的 `document.activeElement`」。两者在鼠标点击时通常一样，
     但**程序化 `.click()`**（以及某些浏览器/元素组合）不会让元素获得焦点 ⇒
     拿 `activeElement` 会存下 `BODY` ⇒ 关窗后焦点掉回 body，键盘用户**丢了位置**。
     探针里那一条「焦点还给触发它的那张截图」就是这么红的。 */
  function openWin(title, trigger) {
    if (!isOpen()) lastFocus = trigger || document.activeElement;
    setTitle(title);
    lockScroll(true);
    centerWin();
    /* 焦点进窗：**不许留在背后那页上**（`aria-modal` 之下那是撒谎）。 */
    closeBtn.focus({ preventScroll: true });
  }

  function closeWin() {
    if (!isOpen()) return;
    /* 关窗即清空这一组：`.win` 是通用窗，下一次可能装的是**别的**东西（私信 / 工具浮窗）。
       不清的话，那个窗里的 ←/→ 会被上一组图接住。 */
    list = [];
    lockScroll(false);
    /* 焦点还给**当初那个缩略图** —— 关掉之后键盘不该掉回 body（memories 2.60 那一族）。 */
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  closeBtn.addEventListener('click', closeWin);
  VEIL.addEventListener('click', closeWin);

  /* Tab 循环留在窗内（`aria-modal="true"` 就得做到这件事，否则焦点会跑到背后那页上） */
  WIN.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...WIN.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ══════════════════ ② 看图窗 ══════════════════ */
  body.innerHTML = `
    <div class="okv">
      <div class="okv__stage" data-okv-stage>
        <img class="okv__im" data-okv-img alt="" draggable="false">
      </div>
      <div class="okv__foot">
        <button class="okv__nav" type="button" data-okv-prev aria-label="上一张（←）">
          <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#v-prev"/></svg></button>
        <span class="okv__n" data-okv-n aria-live="polite"></span>
        <button class="okv__nav" type="button" data-okv-next aria-label="下一张（→）">
          <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#v-next"/></svg></button>
        <span class="okv__hint">滚轮缩放 · 拖动平移 · 双击复位</span>
      </div>
    </div>`;
  const stage = body.querySelector('[data-okv-stage]');
  const im = body.querySelector('[data-okv-img]');
  const nEl = body.querySelector('[data-okv-n]');
  const prevBtn = body.querySelector('[data-okv-prev]');
  const nextBtn = body.querySelector('[data-okv-next]');

  let list = [], idx = 0;
  let scale = 1, tx = 0, ty = 0;

  /* 取「这一格要放哪张图」：`<a href>` 优先（缩略图 → 大图的老写法），其次 `img`，再其次 `data-src` */
  function picOf(el) {
    const img = el.tagName === 'IMG' ? el : el.querySelector('img');
    let src = '';
    if (el.tagName === 'A') src = el.getAttribute('href') || '';
    if (!src) src = (img && (img.currentSrc || img.getAttribute('src'))) || el.dataset.src || '';
    const cap = el.dataset.cap || (img && img.alt) || el.getAttribute('title') || '';
    return { src, cap };
  }
  /* 成组：显式 `data-view-group` 优先；否则同一个父元素下**所有能唤醒看图窗的兄弟** */
  function groupOf(el) {
    const g = el.dataset.viewGroup;
    if (g) return [...document.querySelectorAll('[data-view-group]')].filter((x) => x.dataset.viewGroup === g);
    const p = el.parentElement;
    if (!p) return [el];
    const sibs = [...p.children].filter((c) => c.matches('[data-view], [data-view-group], [onclick*="viewer("]'));
    return sibs.length ? sibs : [el];
  }

  function apply() {
    im.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }
  function reset(anim) {
    scale = 1; tx = 0; ty = 0;
    im.classList.toggle('is-anim', !!anim && !reduce());
    apply();
  }
  function show(i) {
    if (!list.length) return;
    idx = (i + list.length) % list.length;              /* 首尾相接 */
    const p = picOf(list[idx]);
    im.src = p.src;
    im.alt = p.cap || '';
    setTitle(p.cap);
    nEl.textContent = (idx + 1) + ' / ' + list.length;
    const many = list.length > 1;
    prevBtn.hidden = nextBtn.hidden = !many;
    reset(false);
  }
  const go = (d) => show(idx + d);

  /* ── 滚轮缩放：**以光标为锚点** ──
     ⚠️ 不做锚点的话，缩放时图会朝中心跑 —— 想放大左下角那个细节，它却越缩越远。
     锚点公式：保持光标下的那个点在屏幕上不动。
     变换原点是图自己的中心（图在 stage 里 flex 居中），所以先把光标换算成「相对中心、且除掉当前缩放」的坐标。 */
  stage.addEventListener('wheel', (e) => {
    if (!list.length) return;
    e.preventDefault();                                  /* 窗内滚轮归缩放，不再滚页面 */
    const sr = stage.getBoundingClientRect();
    const cx = sr.left + sr.width / 2, cy = sr.top + sr.height / 2;
    const ux = (e.clientX - cx - tx) / scale, uy = (e.clientY - cy - ty) / scale;
    const ns = clamp(scale * Math.exp(-e.deltaY * 0.0015), 0.5, 8);
    tx += ux * (scale - ns);
    ty += uy * (scale - ns);
    scale = ns;
    im.classList.remove('is-anim');
    apply();
    clampPan();
  }, { passive: false });

  /* ── 拖动平移 ──
     夹取规则：放大之后**不让你把图拖离舞台**（每边最多贴到舞台边）。
     缩放 ≤ 1 时（图装得下）**不给拖** —— 那时图没有超出舞台的部分，拖了只会把它推歪。 */
  /* 「舞台里**真正看得见的那块图**」有多大 —— 盒子是铺满舞台的，图在里面 `contain`，
     所以要按**图片自身的宽高比**反算。按盒子算会大一圈（盒子在窄边上留了 letterbox）。 */
  function painted() {
    const bw = im.offsetWidth, bh = im.offsetHeight;
    if (!bw || !bh) return { w: 0, h: 0 };
    const ar = (im.naturalWidth || bw) / (im.naturalHeight || bh) || bw / bh;
    return (ar > bw / bh) ? { w: bw, h: bw / ar } : { w: bh * ar, h: bh };
  }
  /* ⚠️ 夹取的两条要求（用户 2026-10-11 报的就是第一条）：
     ① **两个方向必须一样松**。旧实现按「盒子与舞台同心」算，而盒子其实溢出过舞台、
        中心差了 26px ⇒ 一边能露出暗底、另一边顶死。现在盒子恒等于舞台（见 style.css），
        且按**图片**的可见尺寸算 ⇒ 两端天然对称。这也是为什么必须**同时**改 CSS 和这里。
     ② **拉到端头要能看见一条暗底**（用户的原话「我希望下拉也能看到暗色背景」）——
        所以两端各多放 `--okv-bleed` 的余量（取窗口网格的一格 26px，不是随手一个数）。 */
  const bleed = () => {
    const v = parseFloat(getComputedStyle(winEl()).getPropertyValue('--okv-bleed'));
    return isFinite(v) ? v : 0;
  };
  const winEl = () => document.getElementById('hkWin');
  function clampPan() {
    const p = painted();
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const vw = p.w * scale, vh = p.h * scale;
    const b = bleed();
    const mx = vw > sw ? (vw - sw) / 2 + b : 0;
    const my = vh > sh ? (vh - sh) / 2 + b : 0;
    tx = clamp(tx, -mx, mx); ty = clamp(ty, -my, my);
    apply();
  }
  let panning = false, px0 = 0, py0 = 0, ptx = 0, pty = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !list.length) return;
    panning = true; stage.classList.add('is-panning');
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 同上：拿不到捕获也要能平移 */ }
    px0 = e.clientX; py0 = e.clientY; ptx = tx; pty = ty;
    im.classList.remove('is-anim');
    e.preventDefault();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!panning) return;
    tx = ptx + (e.clientX - px0); ty = pty + (e.clientY - py0);
    clampPan();
  });
  const endPan = (e) => {
    if (!panning) return;
    panning = false; stage.classList.remove('is-panning');
    try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* 指针没了 */ }
  };
  stage.addEventListener('pointerup', endPan);
  stage.addEventListener('pointercancel', endPan);

  /* ── 双击：在「适应」与「原始像素 1:1」之间切 ──
     已经在 1:1 或更近就别再放大（原图本来就比舞台小的时候，1:1 等于没变化）。 */
  stage.addEventListener('dblclick', (e) => {
    if (!list.length) return;
    e.preventDefault();
    if (scale > 1.01) { reset(true); return; }
    const fitW = im.offsetWidth;                         /* 当前是 scale=1，offsetWidth 就是适应后的宽 */
    const nat = im.naturalWidth || fitW;
    const ns = nat / fitW;
    if (ns > 1.15) { scale = ns; tx = 0; ty = 0; im.classList.add('is-anim'); apply(); clampPan(); }
    else reset(true);
  });

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  /* ── 键盘 ──
     ⚠️ 绑在 `document`（不是 WIN）：焦点万一跑到窗外，Esc 也得管用 —— 关不掉的浮层是 bug。
     顺序：Esc 关窗 → ←/→ 翻页。 */
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); closeWin(); return; }
    /* 窗被 HKWin.open 拿来装别的东西（比如私信）时，没有图可翻 —— 不能吃掉输入框里的 ←/→。 */
    if (!list.length) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); return; }
    if (e.key === '0') { e.preventDefault(); reset(true); }
  });

  /* 视口一变（转屏 / 改窗口）就重新居中并夹一次平移 —— 否则窗或图会停在旧坐标上 */
  addEventListener('resize', () => { if (isOpen()) { centerWin(); clampPan(); } });

  /* ══════════════════ ③ 把 `onclick="viewer(this)"` 补成**完整**的接口 ══════════════════
     ⚠️ 这一条不能省。用户要的用法是「HTML 里写个属性就能唤醒」，所以触发器常常是 `<li>` / `<img>` / `<span>`
        —— 这些元素**天生不可聚焦**，只在 `onclick` 上挂函数的话：
        键盘用户**根本到不了它**（Tab 跳过去），读屏也念不出「这里能点」。
        ⇒ 挂载时扫一遍，给不是原生可聚焦的那些补 `tabindex` / `role` / `aria-label`，
          并接上回车与空格（与原生 button 一致）。
        ⇒ 这件事**必须由 viewer 自己做**，不能指望写 HTML 的人记得加 —— 少写一次就是一个
          键盘用户进不去的死点，而且**不报错**。 */
  function upgrade(scope) {
    (scope || document).querySelectorAll('[onclick*="viewer("]').forEach((el) => {
      if (el.dataset.hkZoomReady) return;
      el.dataset.hkZoomReady = '1';
      el.classList.add('is-zoomable');
      /* 原生可聚焦的元素（a[href] / button / input …）不用动它，加了反而多一层噪音 */
      const native = el.matches('a[href], button, input, select, textarea, [tabindex]');
      if (!native) {
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
      }
      if (!el.hasAttribute('aria-label')) {
        const p = picOf(el);
        el.setAttribute('aria-label', (p.cap ? p.cap + '：' : '') + '放大查看');
      }
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();                              /* 空格默认会滚页面 */
        window.viewer(el);
      });
    });
  }
  upgrade();
  /* topic.js / board.js / app.js 都在本文件之前跑完，所以上面这一次就够；
     但 `DOMContentLoaded` 之后再补一次几乎零成本，能兜住「将来某处是异步渲染的」。 */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => upgrade(), { once: true });

  /* ══════════════════ 对外：全局 `viewer(el)` ══════════════════
     ⚠️ 写成**全局函数**是刻意的：用户要求「HTML 里写 `onclick="viewer(this)"` 就能唤醒」，
        所以它必须能被内联属性解析到（内联 `onclick` 只在全局作用域里找名字）。
     ⚠️⚠️ `window.viewer.upgrade = …` 这类**往函数上挂属性**的语句，
        必须排在 `window.viewer = …` **之后**。我第一版写反了 ⇒ 往 `undefined` 挂属性直接抛异常 ⇒
        **整个 IIFE 从那里断掉**，包括后面那句全局赋值 ⇒ `window.viewer` 根本不存在。
        最坑的是它**没有任何可见症状**：窗、遮罩、sprite、`.is-zoomable` 全都正常，
        只有「点截图没反应」—— 而这个坑只有那条「window.viewer 是全局函数」的断言抓得到。 */
  window.viewer = function (el) {
    if (!el) return;
    const g = groupOf(el);
    const p = picOf(el);
    if (!p.src) return;
    const reopen = isOpen();
    list = g;
    /* `show()` 在**开窗之前**跑：这样首帧就已经是最终那张图，
       不会先闪一下上一张（开窗在 show 之后，所以这一帧既没显示也没动画）。 */
    show(Math.max(0, g.indexOf(el)));
    if (!reopen) openWin(p.cap, el);
  };
  window.viewer.close = closeWin;
  window.viewer.upgrade = upgrade;

  /* ══════════════════ ③ 通用开窗（给别的页面用） ══════════════════
     发帖页的工具浮窗要的正是这扇窗：天球坐标网格底、格子条标题栏、可拖动、滚动锁、
     Esc / ✕ / 点遮罩关、焦点归还 —— 全在这儿，**不要再另造一个**（用户 2026-10-18：
     「悬浮窗帖子里面不是有设计了吗，为什么你又要重新设计一套新的呢？」）。

     ⚠️ 它会**替换** `.win__body` 的内容；看图窗的 `im` / `stage` 是直接抓的节点引用，
        被替换后就失效 ⇒ **只在没有看图窗的页面用**（发帖页正是这种页）。
     ⚠️ 必须排在 `window.viewer = …` **之后**：往 `undefined` 挂属性会直接抛，
        整个 IIFE 从那里断掉（上面那段注释记的就是这个坑）。 */
  window.HKWin = {
    /* `cls`：给窗加一个修饰类（发帖页的工具窗要窄一档，看图窗要满宽）。 */
    open: function (title, html, trigger, cls) {
      WIN.className = 'win' + (cls ? ' ' + cls : '');
      body.innerHTML = html;
      openWin(title, trigger);
    },
    close: closeWin,
    isOpen: isOpen,
    body: function () { return body; },
  };
})();
