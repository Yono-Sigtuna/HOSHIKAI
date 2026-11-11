/* 星海社 · 站点地图（./sitemap.html）
   ==================================================================
   用户 2026-11-01：没开发的 4 个页面里先做第一个 —— 站点地图。
   只做前端展示，不接线（不写 .htaccess、不改页脚）。

   设计读法：这是一张**星表**，不是卡片墙。
     · 抬头用站里的格子条（望远镜 + 弧 + 逐格字 + 星环封口）；
     · 每个入口是一行，左侧一枚星：**实心 = 主航段，空心 = 天区 / 工具 / 文书 / 管理台**；
       星只表示层级，不表示热度（文案里明说）；
     · 十二天区按 3 个大板块 × 4 个子板块排，直接复用 shared/data.js 的 FORUM，
       不另写一份板块名；
     · 工具页 / 账号入口 / 站务文书 / 管理台各成一组；2026-11-01 起全站没有「未开放」项。

   ⚠️ 工具页铁律：天文住在材料与站点标记里（格子条、星点、板块色相、背景），
      不做星座连线 / 星盘之类的结构层图形。 */
(function sitemap() {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ══════════ 格子条（与发帖页 / 校准台同一套：望远镜 + 弧 + 逐格字 + 封口） ══════════ */
  const ARC = '<svg class="fs__arc" viewBox="0 28 1200 28" preserveAspectRatio="none" aria-hidden="true">'
    + '<path class="orbit__line" d="M2 56 Q600 6 1198 56" fill="none" stroke="currentColor" stroke-width="1.5"'
    + ' vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg>';
  const SPARKS = '<span class="fs__sparks" aria-hidden="true"><i class="fs__spark"></i><i class="fs__spark fs__spark--b"></i></span>';

  function filmstrip(text) {
    const chars = [...String(text)];
    const tiles = chars.map((ch, i) =>
      '<span class="fs__t' + (i === 0 ? ' fs__t--deep' : '') + '" style="--i:' + (i + 1) + '">'
      + esc(ch) + '</span>').join('');
    return '<span class="fs" style="--hue:218;--n:' + (chars.length + 2) + '">'
      + '<svg class="fs__tel" viewBox="0 0 76 75" aria-hidden="true"><use href="#i-telescope"/></svg>'
      + '<span class="fs__wrap">' + ARC + SPARKS + '<span class="fs__bar">'
      + '<span class="fs__t fs__t--deep" style="--i:0"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#i-telescope-tile"/></svg></span>'
      + tiles
      + '<span class="fs__t fs__t--deep fs__t--cap" style="--i:' + (chars.length + 1) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg></span>'
      + '</span></span></span>';
  }
  const fsHost = $('#smFs');
  if (fsHost) {
    fsHost.innerHTML = filmstrip('站点地图');
    /* 本页不加载 forum.css，`.is-drawn .orbit__line` 那条通用规则不在 ⇒ 自己补类。
       rAF 给描线一个初始态，setTimeout 兜后台标签页的 rAF 节流（与 settings.js 同一条）。 */
    const draw = () => { const h = fsHost.closest('.sm-h1'); if (h) h.classList.add('is-drawn'); };
    requestAnimationFrame(draw);
    setTimeout(draw, 200);
  }

  /* ══════════ 星表数据 ══════════
     主航段 / 工具 / 账号是手写的一层；十二天区从 FORUM 取，保证与板块页一致。 */
  const MAIN = [
    { n: '首页', p: './', d: '全站速览：热门 TAG、推荐、最新回复星座图。' },
    { n: '星图馆', p: './forum/1-1/', d: 'GAL 作品 · 资源 · 汉化 · 攻略。' },
    { n: '创作所', p: './forum/2-1/', d: '同人插画 · 音声翻唱 · 原创短篇 · 自制企划。' },
    { n: '观测台', p: './forum/3-1/', d: '综合水区 · 新人报到 · 求助信号塔 · 星海议事厅。' },
    { n: '个人空间', p: './space/1/', d: '观测证、galgame 履历、本周星系、作品与收藏。' },
    { n: '消息', p: './msg/', d: '回复 / 收藏 / 提到 / 关注 / 站务五类通知。' },
  ];
  const TOOLS = [
    { n: '搜索', p: './search/', d: '按作品 / 帖子 / 用户检索，支持相关度与星等排序。' },
    { n: '发帖', p: './compose/', d: '标题、板块、标签、正文；本地帖直接进板块。' },
    { n: '标签索引', p: './tag/', d: '201 个标签的星图与列表。' },
    { n: '设置', p: './settings/', d: '档案、账号、通知、隐私、外观。' },
  ];
  const ACCOUNT = [
    { n: '登录', p: './login/', d: '演示站不保存账号，只记住本机的显示名。' },
    { n: '注册', p: './register/', d: '注册后顶栏显示你的星名；不伪造后端。' },
  ];
  /* 站务文书：三页同一张纸（docs.css），2026-11-01 建。 */
  const DOCS = [
    { n: '版规总则', p: './rules/', d: '六章二十三条：发帖、版权、秩序、处罚与申诉。' },
    { n: '友情链接', p: './links/', d: '邻星列表；实心＝已互链，空心＝单向。' },
    { n: '联系我们', p: './contact/', d: '三条通路、回执时限与发信表单。' },
  ];
  /* 管理端：六页同页（admin.html#…），2026-11-01 建。 */
  const ADMIN = [
    { n: '管理台', p: './admin.html#overview', d: '待办、举报、今日星历与最近处置的总览。' },
    { n: '内容审核', p: './admin.html#audit', d: '待审帖 / 回复 / 标签的队列与通过、驳回。' },
    { n: '举报处理', p: './admin.html#reports', d: '举报队列、申诉队列与处置回执。' },
    { n: '用户与权限', p: './admin.html#users', d: '禁言 / 封禁 / 解禁与角色查看。' },
    { n: '公告与版块', p: './admin.html#notices', d: '发布公告、置顶，查看版块负载。' },
    { n: '操作日志', p: './admin.html#logs', d: '谁在什么时候动了什么，可筛选。' },
  ];

  const F = (typeof FORUM !== 'undefined' && FORUM) || window.FORUM;
  const BOARDS = (F && F.boards) ? F.boards.map((b, bi) => ({
    title: b.title,
    hue: b.hue,
    rows: b.sections.map((s, si) => ({
      n: s.title,
      d: s.subtitle,
      p: './forum/' + (bi + 1) + '-' + (si + 1) + '/',
    })),
  })) : [];

  /* ══════════ 星点 / 行 ══════════
     一颗四角星：实心 = 主航段；空心 = 天区 / 工具 / 文书 / 管理台。 */
  const STAR = 'M8 1.2l1.55 5.25L14.8 8l-5.25 1.55L8 14.8l-1.55-5.25L1.2 8l5.25-1.55z';
  function star(solid) {
    return '<span class="sm-star' + (solid ? ' is-solid' : '') + '" aria-hidden="true">'
      + '<svg viewBox="0 0 16 16"><path d="' + STAR + '"'
      + (solid ? ' fill="currentColor"' : ' fill="none" stroke="currentColor" stroke-width="1.3"')
      + '/></svg></span>';
  }

  function row(r, solid) {
    return '<a class="sm-row" href="' + esc(r.p) + '">'
      + star(solid)
      + '<span class="sm-row__t"><b>' + esc(r.n) + '</b><span class="sm-row__d">' + esc(r.d) + '</span></span>'
      + '<span class="sm-row__p">' + esc(r.p) + '</span></a>';
  }
  function group(no, id, title, count, body, extra) {
    return '<section class="sm-grp' + (extra ? ' ' + extra : '') + '" aria-labelledby="' + id + '">'
      + '<h2 class="sm-grp__h" id="' + id + '">'
      + '<span class="sm-grp__n">' + no + '</span>'
      + '<span class="sm-grp__t">' + esc(title) + '</span>'
      + '<span class="sm-grp__c">' + count + '</span></h2>'
      + body + '</section>';
  }

  const mainRows = MAIN.map((r) => row(r, true)).join('');
  const toolRows = TOOLS.map((r) => row(r, false)).join('');
  const acctRows = ACCOUNT.map((r) => row(r, false)).join('');
  const docRows = DOCS.map((r) => row(r, false)).join('');
  const adminRows = ADMIN.map((r) => row(r, false)).join('');

  const boardHTML = BOARDS.map((b) => {
    const rows = b.rows.map((r) => row(r, false)).join('');
    return '<div class="sm-board" style="--bh:' + b.hue + '">'
      + '<h3 class="sm-board__h"><span class="sm-board__dot" aria-hidden="true"></span>'
      + esc(b.title) + '<span class="sm-board__n">' + b.rows.length + '</span></h3>'
      + '<div class="sm-list">' + rows + '</div></div>';
  }).join('');

  const total = MAIN.length + BOARDS.reduce((n, b) => n + b.rows.length, 0)
    + TOOLS.length + ACCOUNT.length + DOCS.length + ADMIN.length;
  const host = $('#smCatalog');
  if (host) {
    host.innerHTML =
      group('01', 'smg1', '主航段', MAIN.length, '<div class="sm-list sm-list--2">' + mainRows + '</div>')
      + group('02', 'smg2', '十二天区', BOARDS.reduce((n, b) => n + b.rows.length, 0),
        '<div class="sm-boards">' + boardHTML + '</div>')
      + group('03', 'smg3', '工具与索引', TOOLS.length, '<div class="sm-list sm-list--2">' + toolRows + '</div>')
      + group('04', 'smg4', '账号入口', ACCOUNT.length, '<div class="sm-list sm-list--2">' + acctRows + '</div>')
      + group('05', 'smg5', '站务文书', DOCS.length, '<div class="sm-list sm-list--1">' + docRows + '</div>')
      + group('06', 'smg6', '管理台', ADMIN.length, '<div class="sm-list sm-list--1">' + adminRows + '</div>');
  }
  const totEl = $('#smTotal'), offEl = $('#smOff');
  if (totEl) totEl.textContent = String(total);
  if (offEl) offEl.textContent = '0';

  window.__SM = { total: total, off: 0, boards: BOARDS.length,
    main: MAIN.length, tools: TOOLS.length, account: ACCOUNT.length, docs: DOCS.length, admin: ADMIN.length };
})();
