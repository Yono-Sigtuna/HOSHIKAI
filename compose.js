/* 星海社 · 发新帖
   ══════════════════════════════════════════════════════════════════
   输入行照 galbase：**多个 input 排成一行**（标题 / 板块 / 标签），标签是**自由输入**的，
   回车或逗号变成一枚胶囊，不是从固定池里点选（用户 2026-10-18：
   「TAG 为什么要选不能自己输入呢？像 galbase 那样弄多点 input 不就完了吗」）。

   工具条装的是**正文排版**，不是表单字段 —— 那才是浮窗该承载的东西：
   剧透 / 引用 / 小标题 / 分割 / 跳转。每枚开一个浮窗（站里那扇 `.win`），
   窗里给格式示例 + 一键插入。插入的是**文本标记**，不是假的富文本。

   页宽跟其他页一样（占满 .wrap），页头用站里的格子条，背景与星空照常。 */
(function compose() {
  const $ = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const KEY = 'hoshikai:posts';
  const MAX_KEEP = 50;
  const T_MIN = 2, T_MAX = 60, B_MIN = 10, TAG_MAX = 8;

  const FLAT = flatSections();

  /* ⚠️ **两套编号**：URL 的 `b` 是 1 基（1-1..3-4），`flatSections()` 的 key 与本地帖存储的 key
     是 0 基（0-0..2-3）。`ST.b` 一律存 URL 形态，`keyOf()` 换成 0 基。 */
  const BAD = /^([1-3])-([1-4])$/;
  const bForm = (bi, si) => (bi + 1) + '-' + (si + 1);
  const keyOf = (b) => { const v = BAD.exec(b || ''); return v ? (+v[1] - 1) + '-' + (+v[2] - 1) : '0-0'; };
  const secOf = (b) => FLAT.find((f) => f.key === keyOf(b));

  const _p = new URLSearchParams(location.search);
  const ST = { b: BAD.test(_p.get('b') || '') ? _p.get('b') : '1-1', tags: [] };

  const me = (window.HK && HK.session && HK.session.get && HK.session.get()) || null;
  const AUTHOR = (me && me.name) ? me.name : '未署名的观测者';

  /* ══════════════════ 格子条（站里的 filmstrip） ══════════════════
     ⚠️ 必须**四件齐全**，少一件就不是站里那条了（用户 2026-10-18：
        「望远镜你都抄不全啊，星轨呢，格子条上面的星轨不见了」）：
          ① 大望远镜（`.fs__tel`，挂在左外侧，悬停倾 8°）
          ② **星轨弧线**（`ARC_FS`，套在条的上方）
          ③ **悬停星点**（`SPARKS`，沿同一条抛物线掠过）
          ④ 格子（望远镜格 + 逐字格 + 星环封口格）
     ARC_FS / SPARKS 与 app.js 里那两段**逐字相同**。 */
  const ARC_FS = '<svg class="fs__arc" viewBox="0 28 1200 28" preserveAspectRatio="none" aria-hidden="true">'
    + '<path class="orbit__line" d="M2 56 Q600 6 1198 56" fill="none" stroke="currentColor" stroke-width="1.5"'
    + ' vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg>';
  const SPARKS = '<span class="fs__sparks" aria-hidden="true"><i class="fs__spark"></i><i class="fs__spark fs__spark--b"></i></span>';

  function filmstrip(name, hue) {
    const chars = [...name];
    const tiles = chars.map((ch, i) =>
      '<span class="fs__t' + (i === 0 ? ' fs__t--deep' : '') + '" style="--i:' + (i + 1) + '" aria-hidden="true">'
      + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>').join('');
    const deep = (i, inner, extra) => '<span class="fs__t fs__t--deep' + (extra || '')
      + '" style="--i:' + i + '" aria-hidden="true">' + inner + '</span>';
    return '<span class="fs cp__fs" style="--hue:' + (hue === undefined ? 218 : hue) + ';--n:' + (chars.length + 2)
      + '" aria-label="' + esc(name) + '">'
      + '<svg class="fs__tel" viewBox="0 0 76 75" aria-hidden="true"><use href="#i-telescope"/></svg>'
      + '<span class="fs__wrap">' + ARC_FS + SPARKS
      + '<span class="fs__bar">'
      + deep(0, '<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#i-telescope-tile"/></svg>')
      + tiles
      + deep(chars.length + 1, '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg>', ' fs__t--cap')
      + '</span></span></span>';
  }

  /* 板块引文 —— 页头那块空档的答案（用户 2026-10-20：「格子条右边到发帖那么空，你想放什么」）。
     内容来自 `FORUM.boards[].quote`，不是新写的文案：切板块时这段与格子条色相一起换。 */
  function quoteHTML(sec) {
    const bd = FORUM.boards[sec.boardIndex];
    return '<blockquote class="cp__quote" id="cpQuote" style="--th:' + bd.hue + '">'
      + '<p class="cp__quote__t">「' + esc(bd.quote) + '」</p>'
      + '<cite class="cp__quote__c">— ' + esc(bd.title) + '</cite></blockquote>';
  }

  function boardSelect() {
    const groups = [];
    FLAT.forEach((f) => { (groups[f.boardIndex] || (groups[f.boardIndex] = [])).push(f); });
    const body = groups.map((g) => '<optgroup label="' + esc(FORUM.boards[g[0].boardIndex].title) + '">'
      + g.map((f) => {
        const v = bForm(f.boardIndex, f.sectionIndex);
        return '<option value="' + v + '"' + (v === ST.b ? ' selected' : '') + '>' + esc(f.title) + '</option>';
      }).join('')
      + '</optgroup>').join('');
    return '<span class="sel"><select id="cpB" name="board" aria-label="发到哪个子板块">' + body
      + '</select><svg class="i sel__arrow" aria-hidden="true"><use href="#i-chevron"/></svg></span>';
  }

  /* ══════════════════ 开窗：站里那扇 `.win` ══════════════════ */
  function openWin(title, html, trigger, onOpen) {
    if (!window.HKWin) { window.__ERR = (window.__ERR || '') + 'HKWin missing | '; return; }
    HKWin.open(title, '<div class="cpPad">' + html + '</div>', trigger, 'win--tool');
    if (onOpen) onOpen(HKWin.body());
  }

  /* 往正文光标处插入文本 */
  function insertText(text) {
    const ta = $('#cpBody');
    if (!ta) return;
    const a = ta.selectionStart, b = ta.selectionEnd;
    ta.value = ta.value.slice(0, a) + text + ta.value.slice(b);
    ta.selectionStart = ta.selectionEnd = a + text.length;
    ta.focus();
    grow();
  }

  /* 正文框随内容长高 —— 不内滚。
     ⚠️ 行线画在 textarea 自己的背景上，靠 `line-height` 与背景周期对齐；
        一旦内滚，文字动了线不动，立刻错位。所以这里必须让高度跟着内容走。 */
  const BODY_MIN = 430;
  function grow() {
    const ta = $('#cpBody');
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(BODY_MIN, ta.scrollHeight) + 'px';
    scheduleRail();
  }

  /* ══════════════════ 段落星图（写作中的反馈） ══════════════════
     每段一颗星，星落在该段首行的 y 上；镜像层量出来，不推测换行。
     输入停顿 150ms 才更新；段数变化才增删节点；上限 30。 */
  const RAIL_MAX = 30;
  let railTimer = 0;
  function scheduleRail() {
    clearTimeout(railTimer);
    railTimer = setTimeout(railUpdate, 150);
  }
  function railUpdate() {
    const ta = $('#cpBody'), mirror = $('#cpMirror'), rail = $('#cpRail');
    if (!ta || !mirror || !rail) return;
    const padL = parseFloat(getComputedStyle(ta).paddingLeft) || 0;
    const padR = parseFloat(getComputedStyle(ta).paddingRight) || 0;
    mirror.style.width = Math.max(0, ta.clientWidth - padL - padR) + 'px';

    const parts = String(ta.value).split(/(\n[ \t]*\n)/);
    let html = '', n = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i % 2 === 1) { html += esc(p); continue; }   /* 段间空行，原样保留 */
      if (p.trim() && n < RAIL_MAX) { html += '<span class="cp__mp"></span>'; n++; }
      html += esc(p);
    }
    mirror.innerHTML = html;

    const tops = [...mirror.querySelectorAll('.cp__mp')].map((m) => m.offsetTop);
    const stars = [...rail.querySelectorAll('i')];
    while (stars.length > tops.length) stars.pop().remove();
    while (stars.length < tops.length) {
      const s = document.createElement('i');
      rail.appendChild(s);
      stars.push(s);
    }
    stars.forEach((s, i) => { s.style.top = tops[i] + 'px'; });

    let line = rail.querySelector('.cp__railLine');
    if (tops.length > 1) {
      if (!line) { line = document.createElement('span'); line.className = 'cp__railLine'; rail.appendChild(line); }
      line.style.top = tops[0] + 'px';
      line.style.height = (tops[tops.length - 1] - tops[0]) + 'px';
    } else if (line) line.remove();
  }

  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* 光标矩形：textarea 拿不到 caret rect，仍用镜像层量一次。 */
  function caretPoint() {
    const ta = $('#cpBody'), mirror = $('#cpMirror');
    if (!ta || !mirror) return null;
    const pos = ta.selectionStart || 0;
    mirror.innerHTML = esc(ta.value.slice(0, pos)) + '<span class="cp__mp"></span>' + esc(ta.value.slice(pos));
    const m = mirror.querySelector('.cp__mp');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { x: r.left, y: r.top + 8 };
  }

  /* 插入火花：从浮窗里的插入按钮沿抛物线飞到光标附近。RM 下节点根本不建。 */
  function spark(from) {
    if (REDUCED || !from) return;
    const to = caretPoint();
    if (!to) return;
    const el = document.createElement('span');
    el.className = 'cpSpark';
    document.body.appendChild(el);
    const x0 = from.left + from.width / 2, y0 = from.top + from.height / 2;
    const frames = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = x0 + (to.x - x0) * t;
      const y = y0 + (to.y - y0) * t - 42 * Math.sin(Math.PI * t);
      frames.push({ transform: 'translate(' + x + 'px,' + y + 'px) scale(' + (1 - .55 * t) + ')',
        opacity: i === 0 ? .2 : (i === 12 ? 0 : 1) });
    }
    const anim = el.animate(frames, { duration: 350, easing: 'cubic-bezier(.25,.7,.35,1)' });
    anim.onfinish = () => el.remove();
    setTimeout(() => el.remove(), 900);   /* 兜底：动画被打断也不会留下节点 */
  }

  /* ══════════════════ 正文排版工具（5 枚） ══════════════════ */
  const TOOLS = [
    {
      k: 'spoiler', ic: 'k-lockon', t: '剧透',
      title: '剧透折叠',
      intro: '把不想被先看到的内容包起来。',
      sample: '【剧透】\n结局是……\n【/剧透】',
      insert: '【剧透】\n\n【/剧透】',
      effect: '读者会先看到「剧透」两字，展开才读到里面的内容。',
    },
    {
      k: 'quote', ic: 'k-atlas', t: '引用',
      title: '引用',
      intro: '引用别人说过的一段话。',
      sample: '> 原版第三章的结尾更好',
      insert: '> ',
      effect: '整行缩进，左边一条竖线，与正文区分开。',
    },
    {
      k: 'heading', ic: 'k-zenith', t: '小标题',
      title: '小标题',
      intro: '给正文分节。',
      sample: '—— 关于结局 ——',
      insert: '—— ——',
      effect: '居中，前后各空一行，读起来是一个新段落。',
    },
    {
      k: 'divide', ic: 'k-divide', t: '分割',
      title: '分割',
      intro: '在两段之间切一刀。',
      sample: '· · ·',
      insert: '\n· · ·\n',
      effect: '一条居中的点线，比空行更明确。',
    },
    {
      k: 'jump', ic: 'k-finder', t: '跳转',
      title: '跳转',
      intro: '指向另一条帖子或一个板块。',
      sample: '→ 星图馆 / 星轨研究室',
      insert: '→ ',
      effect: '发出去之后是一个可点的链接。',
    },
  ];

  function openTool(tool, trigger) {
    const html = '<p>' + esc(tool.intro) + '</p>'
      + '<pre class="cpPre">' + esc(tool.sample) + '</pre>'
      + '<p>' + esc(tool.effect) + '</p>'
      + '<div class="cpPad__acts"><button class="btn btn--solid" type="button" id="cpIns">插入到正文</button></div>';
    openWin(tool.title, html, trigger, (bd) => {
      const btn = $('#cpIns', bd);
      if (btn) btn.addEventListener('click', () => {
        const from = btn.getBoundingClientRect();
        HKWin.close();
        insertText(tool.insert);
        railUpdate();
        spark(from);
      });
    });
  }

  /* ══════════════════ 标签：自由输入 ══════════════════ */
  const TAG_SPLIT = /[,，、]/;
  /* 胶囊颜色走站里的 `TAG_HUE`（同名同色）；自由输入的新标签落到全站兜底色相 218。
     ⚠️ 不要换成 `hueOf()`：那是「同名同色」给**人**用的哈希，标签的色相表是另一份，
        混用会让同一个标签在发帖页和帖内页是两个颜色。 */
  const tagHue = (g) => (typeof TAG_HUE === 'object' && TAG_HUE && TAG_HUE[g] != null) ? TAG_HUE[g] : 218;

  function addTags(raw) {
    String(raw || '').split(TAG_SPLIT).forEach((s) => {
      const g = s.trim();
      if (!g) return;
      if (ST.tags.indexOf(g) >= 0) return;
      if (ST.tags.length >= TAG_MAX) return;
      ST.tags.push(g);
    });
    paintTags();
  }
  function removeTag(g) {
    const i = ST.tags.indexOf(g);
    if (i >= 0) ST.tags.splice(i, 1);
    paintTags();
  }
  function paintTags() {
    const host = $('#cpTagChips');
    if (!host) return;
    host.innerHTML = ST.tags.map((g) =>
      '<span class="cpChip" style="--th:' + tagHue(g) + '">' + esc(g)
      + '<button class="cpChip__x" type="button" data-del="' + esc(g) + '" aria-label="移除 ' + esc(g) + '">×</button></span>'
    ).join('');
    const inp = $('#cpTagIn');
    if (inp) inp.placeholder = ST.tags.length >= TAG_MAX ? '最多 ' + TAG_MAX + ' 个' : (ST.tags.length ? '再加一个…' : '输入标签后回车，或用逗号隔开');
  }

  /* ══════════════════ 版面 ══════════════════ */
  function render() {
    const host = $('#cp');
    if (!host) { window.__ERR = (window.__ERR || '') + 'cp host missing | '; return; }
    const sec = secOf(ST.b);
    host.innerHTML =
      '<nav class="cp-crumb" aria-label="面包屑"><a href="./">首页</a> › '
      + '<a href="./forum/' + ST.b + '/">' + esc(sec.boardTitle) + ' / ' + esc(sec.title) + '</a> › 发新帖</nav>'
      + '<form class="tpForm cp" id="cpForm" novalidate>'
      + '<div class="cp__head">'
      + '<div class="cp__hd">' + filmstrip('发新帖', sec.boardHue) + '</div>'
      + quoteHTML(sec)
      /* 发布放右上角：与格子条、引文同一行 */
      + '<button class="btn btn--solid" type="submit" id="cpGo">发布</button>'
      + '</div>'
      + '<div class="cp__top"><p class="cp__lede">发到 <b id="cpWhere">' + esc(sec.boardTitle) + ' / ' + esc(sec.title) + '</b>'
      + ' · 作者 <b>' + esc(AUTHOR) + '</b></p></div>'

      /* 输入行：三个 input 排成一行（galbase 的 input_line） */
      + '<div class="cp__line">'
      + '<input class="cp__in" id="cpT" name="title" maxlength="' + T_MAX + '" autocomplete="off" '
      + 'placeholder="帖子标题（必填）" aria-label="标题" aria-describedby="mT">'
      + boardSelect()
      + '<span class="cp__tagWrap"><span class="cp__chips" id="cpTagChips"></span>'
      + '<input class="cp__in--tag" id="cpTagIn" autocomplete="off" aria-label="标签" '
      + 'placeholder="输入标签后回车，或用逗号隔开"></span>'
      + '</div><p class="cp__msg" id="mT" role="alert"></p>'

      /* 正文排版工具条 */
      + '<div class="cp__bar" role="toolbar" aria-label="正文排版">'
      + TOOLS.map((x) => '<button class="key cp__key" type="button" data-tool="' + x.k + '" aria-label="' + x.t + '">'
        + '<svg class="i" aria-hidden="true"><use href="#' + x.ic + '"/></svg>'
        + '<b class="key__t" aria-hidden="true">' + x.t + '</b></button>').join('')
      + '</div>'

      + '<div class="cp__row"><div class="cp__sheet" id="cpSheet">'
      + '<label class="cp__lab" for="cpBody">正文</label>'
      + '<div class="cp__bodyWrap">'
      + '<div class="cp__rail" id="cpRail" aria-hidden="true"></div>'
      + '<div class="cp__mirror" id="cpMirror" aria-hidden="true"></div>'
      + '<textarea class="cp__body" id="cpBody" name="body" rows="16" aria-describedby="mBody" '
      + 'placeholder="从这儿开始写。写一段空一行，读起来会舒服些。"></textarea>'
      + '</div>'
      + '</div><p class="cp__msg" id="mBody" role="alert"></p></div>'
      + '<p class="cp__msg" id="mTag" role="alert"></p>'

      + '<div class="cp__foot">'
      + '<span class="cp__hint">演示站没有后端 —— 这帖只存在<b>这台机器</b>上，别人看不到，也点不进详情页。</span></div>'
      + '</form>';
    bind();
    paintTags();
  }

  /* ══════════════════ 校验 / 发布 ══════════════════ */
  function check() {
    const t = ($('#cpT').value || '').trim();
    const body = ($('#cpBody').value || '').trim();
    const out = [];
    if (!t) out.push(['T', '写个标题']);
    else if ([...t].length < T_MIN) out.push(['T', '标题至少 ' + T_MIN + ' 个字']);
    else if ([...t].length > T_MAX) out.push(['T', '标题最多 ' + T_MAX + ' 个字']);
    if (!ST.tags.length) out.push(['Tag', '至少写 1 个标签']);
    else if (ST.tags.length > TAG_MAX) out.push(['Tag', '最多 ' + TAG_MAX + ' 个']);
    if (!body) out.push(['Body', '正文还没写']);
    else if ([...body].length < B_MIN) out.push(['Body', '正文至少 ' + B_MIN + ' 个字']);
    return out;
  }
  function paint(errs) {
    const bad = new Map(errs);
    [['T', '#mT', '#cpT'], ['Tag', '#mTag', '#cpTagIn'], ['Body', '#mBody', '#cpBody']].forEach(([k, mSel, fSel]) => {
      const msg = $(mSel), fld = fSel ? $(fSel) : null, isBad = bad.has(k);
      if (msg) msg.textContent = isBad ? bad.get(k) : '';
      if (fld) fld.setAttribute('aria-invalid', isBad ? 'true' : 'false');
    });
    return bad;
  }
  function publish() {
    const item = {
      tid: 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      key: keyOf(ST.b),
      title: ($('#cpT').value || '').trim(),
      tags: ST.tags.slice(),
      body: ($('#cpBody').value || '').trim(),
      author: AUTHOR,
      at: Date.now(),
    };
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    arr.unshift(item);
    try { localStorage.setItem(KEY, JSON.stringify(arr.slice(0, MAX_KEEP))); }
    catch (e) { const m = $('#mBody'); if (m) m.textContent = '这台机器的本地存储满了 —— 删掉几篇旧帖再试。'; return null; }
    return item;
  }

  function bind() {
    const form = $('#cpForm');
    if (!form) return;

    /* 标签：回车 / 逗号确认，+ × 删除 */
    const tagIn = $('#cpTagIn');
    if (tagIn) {
      tagIn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === '、') {
          if (e.key === 'Enter') e.preventDefault();
          addTags(tagIn.value);
          tagIn.value = '';
        } else if (e.key === 'Backspace' && !tagIn.value && ST.tags.length) {
          ST.tags.pop(); paintTags();
        }
      });
      tagIn.addEventListener('blur', () => { if (tagIn.value.trim()) { addTags(tagIn.value); tagIn.value = ''; } });
    }
    const chips = $('#cpTagChips');
    if (chips) chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-del]');
      if (b) { removeTag(b.dataset.del); if (tagIn) tagIn.focus(); }
    });

    /* 工具条：每枚开一个浮窗 */
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tool]');
      if (!b) return;
      e.preventDefault();
      const tool = TOOLS.find((x) => x.k === b.dataset.tool);
      if (tool) openTool(tool, b);
    });

    ['#cpT', '#cpBody'].forEach((s) => {
      const el = $(s);
      el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') paint(check()); });
    });
    const bodyEl = $('#cpBody');
    if (bodyEl) bodyEl.addEventListener('input', grow);

    /* 点稿纸的留白也能开始写（textarea 没有铺满整张纸） */
    const sheet = $('#cpSheet');
    if (sheet) sheet.addEventListener('click', (e) => {
      if (e.target === sheet && bodyEl) bodyEl.focus();
    });

    const sel = $('#cpB');
    if (sel) sel.addEventListener('change', (e) => {
      ST.b = e.target.value;
      const sec = secOf(ST.b);
      const crumb = $('.cp-crumb a:nth-of-type(2)');
      if (crumb) { crumb.textContent = sec.boardTitle + ' / ' + sec.title; crumb.href = './forum/' + ST.b + '/'; }
      const where = $('#cpWhere');
      if (where) where.textContent = sec.boardTitle + ' / ' + sec.title;
      /* 引文与格子条色相跟着板块走 —— 页头这块不是静态文案 */
      const bd = FORUM.boards[sec.boardIndex];
      const q = $('#cpQuote');
      if (q) {
        q.style.setProperty('--th', bd.hue);
        const qt = $('#cpQuote .cp__quote__t'), qc = $('#cpQuote .cp__quote__c');
        if (qt) qt.textContent = '「' + bd.quote + '」';
        if (qc) qc.textContent = '— ' + bd.title;
      }
      const fs = $('.cp__fs');
      if (fs) fs.style.setProperty('--hue', bd.hue);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errs = check();
      paint(errs);
      if (errs.length) {
        const first = { T: '#cpT', Tag: '#cpTagIn', Body: '#cpBody' }[errs[0][0]];
        const el = $(first); if (el) el.focus();
        return;
      }
      const item = publish();
      if (item) location.href = './forum/' + ST.b + '/';
    });
  }

  render();
  grow();
  window.addEventListener('resize', grow);
  window.__CP = { ST, check, paint, publish, KEY, AUTHOR, render, addTags, TOOLS, grow,
    railUpdate, scheduleRail, spark, RM: REDUCED };
})();
