/* 星海社 · 登录页 / 注册页的脚本
   这一份同时服务两页，用 <body data-auth="login|register"> 区分要做哪些字段、提交后去哪儿。

   它做四件事：
     ① 渲染顶部导航（这两页不挂 app.js / hud.js，`#nav` 没人填）
     ② 画那条星轨，并把「你的星」按名字**定色 + 定位**
     ③ 口令强度 → 星等（用站点的尺：magnitudeGlow）
     ④ 表单校验与提交（错误摘要 + 逐字段提示 + 结果态）

   依赖（三页的加载顺序已满足）：shared/data.js（FORUM / magnitudeGlow）、session.js（HK.session）。
   自带 esc / hueOf，与三页各自的 helper 同一套写法（站内既有的做法）。 */
(function auth() {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* 与 app.js:54 / board.js:36 / topic.js:36 逐字相同 —— 站里给你头像上色的就是它。
     ⚠️ 这个哈希是「同一个名字永远同一个颜色」的全部保证，别在这里换实现。 */
  const hueOf = (s) => [...s].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);

  const MODE = document.body.dataset.auth || 'login';
  const NAME_MIN = 2;
  const NAME_MAX = (window.HK && HK.session && HK.session.maxName) || 16;
  const NAME_OK = /^[一-鿿A-Za-z0-9_]+$/;
  const PW_MIN = MODE === 'register' ? 8 : 1;

  /* ---------- 提示条（站内既有做法：`.toast` + is-on） ---------- */
  let toastT = 0;
  function toast(msg) {
    const el = $('#toast'); if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('is-on'), 2400);
  }

  /* ---------- ① 顶部导航 ---------- */
  /* 站里 `.nav a i` 的那枚十字星点（同 `.orbit__spark` 的 node 形状）。
     当前页那颗换成实心四星 —— 这两页都不属于任何一个导航项，所以不设 aria-current。 */
  const NAV_CROSS = '<svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="M-5 0H5M0-5V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/></svg>';
  function renderNav() {
    const nav = $('#nav'); if (!nav || typeof FORUM === 'undefined') return;
    nav.innerHTML = [
      `<a href="./"><i>${NAV_CROSS}</i>首页</a>`,
      ...FORUM.boards.map((b, i) => `<a href="./#board-${i === 0 ? 0 : 1}"><i>${NAV_CROSS}</i>${esc(b.title)}</a>`),
      /* ⚠️ 登录 / 注册这两页原来**没有**「个人空间」—— 它抄的是首页那份导航的缩减版。
         加上「个人空间 · 消息」是为了让六页的顶栏是同一份：登出状态点进去也只是落在那两页上，
         而各页顶栏不一致会让人以为点错了地方。 */
      `<a href="./space/1/"><i>${NAV_CROSS}</i>个人空间</a>`,
      `<a href="./msg/"><i>${NAV_CROSS}</i>消息</a>`,
      `<a href="./#recommend"><i>${NAV_CROSS}</i>推荐</a>`,
      `<a href="./#constellation"><i>${NAV_CROSS}</i>星座图</a>`,
    ].join('');
  }

  /* ---------- ② 星轨 ---------- */
  const chart = $('.auth__chart');
  const svg = $('.auth__arcsvg');
  const path = $('.auth__arc');
  const dots = $('.auth__dots');

  /* 弧的几何：与 `.orbit` 一样，按**真实像素**算（不是 viewBox 缩放），
     这样 1.5px 描边不必靠 non-scaling-stroke 兜，虚线的长度也才是真的长度。
     横向只占 14%~86%：拉满整宽会显得像一条直线，收一点才看得出「弧」。
     纵向两端落在 88%、控制点抬到 2%，曲线才明显。 */
  const arc = { p0: [0.14, 0.88], c: [0.5, 0.02], p1: [0.86, 0.88] };
  let box = { w: 0, h: 0 };

  /* 二次贝塞尔在 t 处的点（标准公式）。x 用 [0]、y 用 [1] —— 两个轴的缩放不同。 */
  function bez(t) {
    const u = 1 - t, w = box.w, h = box.h;
    const x = u * u * arc.p0[0] * w + 2 * u * t * arc.c[0] * w + t * t * arc.p1[0] * w;
    const y = u * u * arc.p0[1] * h + 2 * u * t * arc.c[1] * h + t * t * arc.p1[1] * h;
    return [x, y];
  }

  function drawArc() {
    if (!chart || !svg || !path) return;
    const r = chart.getBoundingClientRect();
    box = { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
    const P = (k) => `${arc[k][0] * box.w} ${arc[k][1] * box.h}`;
    svg.setAttribute('viewBox', `0 0 ${box.w} ${box.h}`);
    path.setAttribute('d', `M ${P('p0')} Q ${P('c')} ${P('p1')}`);
    if (dots) {
      /* 弧上三枚固定的十字星点当路标（让弧看起来是「一条轨迹」而不是一条随手画的线） */
      dots.innerHTML = [0.14, 0.5, 0.86].map((t) => {
        const [x, y] = bez(t);
        return `<path class="auth__dot" d="M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}"/>`;
      }).join('');
    }
    place(starT());                               /* 画完立刻按当前 t 摆一次星（注意是 starT() 不是 starT） */
  }

  /* 名字 → 弧上的位置。同一个哈希换个盐：**同名的星永远落在同一处**，
     与「同名的头像永远同一个颜色」是同一条承诺。 */
  const starT = () => (chart && chart.dataset.idle === '1' ? 0.5 : hueOf(lastName + '·') / 360);

  function place(t) {
    /* ⚠️ box 还没量出来时不摆：否则会先写成 0px，等 drawArc 量完再改成真实值 ——
       于是 `left/top` 的过渡把星从左上角**飞**进来一次，每次加载都飞。 */
    if (!chart || !box.w || !box.h) return;
    const [x, y] = bez(Math.max(0, Math.min(1, t)));
    chart.style.setProperty('--x', x + 'px');
    chart.style.setProperty('--y', y + 'px');
  }

  let lastName = '';
  function setStar(name) {
    lastName = name;
    if (!chart) return;
    const idle = !name;
    chart.dataset.idle = idle ? '1' : '0';
    chart.classList.toggle('is-idle', idle);
    /* 还没写名字时用站里的默认色相 218（`.tp` / `.cst` 的 --hue 默认值就是它），不是随手取的 */
    chart.style.setProperty('--ah', idle ? '218' : String(hueOf(name)));
    chart.style.setProperty('--auth-glow', idle ? '0' : '.45');
    place(starT());
  }

  /* ---------- ③ 口令强度 → 星等 ---------- */
  /* 0~1 的强度。刻意**对长度单调**（长度才是真正决定强度的东西），
     字符种类加权；不足 8 位一律压到 0.34 以下，免得「aA1!」四位数被算成很强。 */
  function strengthScore(pw) {
    const cs = [...pw];
    if (!cs.length) return 0;
    const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^\w]/].filter((re) => re.test(pw)).length;
    let s = Math.min(1, cs.length / 14) * 0.62 + Math.min(1, kinds / 4) * 0.38;
    if (cs.length < 8) s = Math.min(s, 0.34);
    return Math.round(Math.max(0, Math.min(1, s)) * 100) / 100;
  }
  /* 强度 → 星等：**同一把尺**（0.6 最亮 ~ 6.5 最暗），与帖子星等完全一致。
     于是「你这枚口令 2.4 等」和「这帖 2.4 等」是一个意思。 */
  const toMag = (s) => Math.round((6.5 - s * 5.9) * 10) / 10;
  const glowOf = (m) => (typeof magnitudeGlow === 'function' ? magnitudeGlow(m) : Math.max(0, Math.min(1, (6.5 - m) / 5.9)));
  const wordOf = (s) => (s <= 0 ? '' : s <= 0.25 ? '偏弱' : s <= 0.45 ? '尚可' : s <= 0.65 ? '不错' : s <= 0.85 ? '很强' : '极强');

  /* ---------- ④ 校验 ---------- */
  const F = {
    name: { el: $('#fName'), msg: $('#mName') },
    pw: { el: $('#fPw'), msg: $('#mPw') },
    pw2: { el: $('#fPw2'), msg: $('#mPw2') },
  };
  const errBox = $('#authErr');
  const errList = $('#authErrList');

  function check() {
    const out = [];
    const name = F.name.el ? F.name.el.value.trim() : '';
    const pw = F.pw.el ? F.pw.el.value : '';
    const pw2 = F.pw2.el ? F.pw2.el.value : '';

    if (!name) out.push(['name', '请写下一个星名']);
    else if ([...name].length < NAME_MIN) out.push(['name', `星名至少 ${NAME_MIN} 个字`]);
    else if ([...name].length > NAME_MAX) out.push(['name', `星名最多 ${NAME_MAX} 个字`]);
    else if (!NAME_OK.test(name)) out.push(['name', '星名只能用汉字、字母、数字与下划线']);

    if (!pw) out.push(['pw', '请写下通行口令']);
    else if ([...pw].length < PW_MIN) out.push(['pw', `口令至少 ${PW_MIN} 位`]);

    if (F.pw2.el && pw2 !== pw) out.push(['pw2', '两次输入的口令不一样']);

    return { out, name, pw };
  }

  /* 校验结果 → DOM。`live` = 边打字边清错（只清已修好的，不新增错误，免得打字时满屏红）。 */
  function paint(res, live) {
    const bad = new Map(res.out);
    for (const k of Object.keys(F)) {
      const f = F[k]; if (!f.el) continue;
      const isBad = bad.has(k);
      if (isBad || !live) f.el.setAttribute('aria-invalid', isBad ? 'true' : 'false');
      if (f.msg) f.msg.textContent = isBad ? bad.get(k) : '';
    }
    if (live && res.out.length) return;            /* 边打字时不弹摘要，只在提交时弹 */
    if (!res.out.length) { errBox.hidden = true; errList.innerHTML = ''; return false; }
    errBox.hidden = false;
    errList.innerHTML = res.out.map(([k, m]) => `<li><a href="#${F[k].el.id}">${esc(m)}</a></li>`).join('');
    return true;
  }

  /* 摘要框是 tabindex="-1" 的容器：提交失败时把焦点交给它，
     屏幕阅读器就会读出来，键盘用户 Tab 一下也能直接跳到出错字段（ui-ux-pro-max 的 High 条）。 */
  function focusErrors() {
    if (!errBox.hidden) errBox.focus();
  }

  /* ---------- 提交 ---------- */
  const form = $('#authForm');
  const side = $('#authSide');
  const done = $('#authDone');

  function showDone(html) {
    if (side) side.hidden = true;
    if (form) form.hidden = true;
    done.hidden = false;
    done.innerHTML = html;
    const head = done.querySelector('h2');
    if (head) { head.tabIndex = -1; head.focus(); }   /* 提交后把焦点送到结果标题上 */
  }

  /* 结果里那颗大星 —— 复用首页 `.cst` 的同心环配方 + 弧上那颗星的画法 */
  const doneStar = (name) => `
    <span class="cst" style="--ah:${hueOf(name)}">
      <span class="star"><i class="star-halo"></i><i class="star-core"></i></span>
    </span>`;

  function onSubmit(e) {
    e.preventDefault();
    const res = check();
    if (paint(res, false)) { focusErrors(); return; }

    const btn = $('.auth__go');
    btn.disabled = true;                            /* 防连点；同步流程，下一帧就恢复 */

    if (MODE === 'register') {
      showDone(`
        ${doneStar(res.name)}
        <h2>这颗星已经点亮了</h2>
        <p><b>${esc(res.name)}</b> · 色相 ${hueOf(res.name)}°，口令星等 ${toMag(strengthScore(res.pw))} 等。</p>
        <p class="meta">同名的星永远落在同一个位置、同一个颜色。</p>
        <div class="auth__note">演示站没有后端 —— <b>这颗星只存在于这一页</b>，不会被保存，也登不进去。
          想进去看看，用演示账号登录。</div>
        <div class="auth__foot">
          <a class="btn btn--ghost" href="./login.html">用演示账号登录</a>
          <a class="btn btn--solid" href="./">先逛逛星图</a>
        </div>`);
    } else {
      if (window.HK && HK.session) HK.session.login(res.name);
      showDone(`
        ${doneStar(res.name)}
        <h2>已登录 · 欢迎回来，${esc(res.name)}</h2>
        <p class="meta">色相 ${hueOf(res.name)}° · 顶栏已经换成你的星位</p>
        <div class="auth__note">演示站只有一个账号，也没有后端 ——
          这个名字只记在<b>本机浏览器</b>里（<code>hoshikai:session</code>），换台机器就不认了。</div>
        <div class="auth__foot">
          <a class="btn btn--solid" href="./">回到星图</a>
          <button class="btn btn--ghost" type="button" id="authOut">退出登录</button>
        </div>`);
      const out = $('#authOut');
      if (out) out.addEventListener('click', () => {
        if (window.HK && HK.session) HK.session.logout();
        toast('已退出登录');
        location.reload();
      });
    }
  }

  /* ---------- 绑定 ---------- */
  function bind() {
    if (F.name.el) {
      F.name.el.addEventListener('input', () => {
        const v = F.name.el.value.trim();
        setStar(v);
        /* 标签右侧的实时头像预览 —— `.av` 原样，就是它在别处会长成的样子 */
        const fx = $('#xName');
        if (fx) fx.innerHTML = v
          ? `<span class="av" style="--ah:${hueOf(v)}" aria-hidden="true">${esc([...v][0])}</span>`
          : '';
        const ro = $('#authReadout');
        if (ro) ro.innerHTML = v
          ? `你的星 · 色相 <b>${hueOf(v)}°</b> <span class="h">(${esc(v)})</span>`
          : '写下星名 —— 它会在这条轨迹上亮起来。';
        if (F.name.el.getAttribute('aria-invalid') === 'true') paint(check(), true);
      });
    }
    if (F.pw.el) {
      F.pw.el.addEventListener('input', () => {
        const pw = F.pw.el.value;
        const fx = $('#xPw');
        if (fx && pw) {
          const s = strengthScore(pw), m = toMag(s);
          /* `.mag` 的构造与 app.js / board.js / topic.js 里那三处**逐字一致** */
          fx.innerHTML = `<span class="mag" style="--glowAmt:${glowOf(m)}" title="星等 ${m} 等 · 越小越亮">`
            + `<svg class="i" aria-hidden="true"><use href="#i-star"/></svg><b>${m}</b>等</span>`;
        } else if (fx) fx.innerHTML = '';
        const mt = $('#authPwWord');
        if (mt) mt.textContent = pw ? wordOf(strengthScore(pw)) : '';
        if (pw && F.pw.el.getAttribute('aria-invalid') === 'true') paint(check(), true);
      });
    }
    if (F.pw2.el) {
      F.pw2.el.addEventListener('input', () => {
        if (F.pw2.el.getAttribute('aria-invalid') === 'true') paint(check(), true);
      });
    }
    if (form) form.addEventListener('submit', onSubmit);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.auth__err a');
      if (!a) return;
      e.preventDefault();
      const t = document.querySelector(a.getAttribute('href'));
      if (t) t.focus();
    });
  }

  /* ---------- 起步 ---------- */
  function boot() {
    renderNav();
    bind();
    setStar('');
    drawArc();
    /* 弧画完再起动画（`is-drawn` 触发描边生长）—— 与 `.orbit` 的 `.bv.is-drawn` 同一套 */
    requestAnimationFrame(() => requestAnimationFrame(() => { if (chart) chart.classList.add('is-drawn'); }));
    if (chart) {
      const ro = new ResizeObserver(() => drawArc());
      ro.observe(chart);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
