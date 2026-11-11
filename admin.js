/* 星海社 · 观测调度台（管理端 ./admin.html）
   ==================================================================
   六个视图同页，`#overview #audit #reports #users #notices #logs` 切。
   所有处置都真的改内存里的队列 / 写一条操作日志 / 动计数 —— 刷新复位。
   唯一读本机存储的地方是**用户提交的举报 / 申诉**（`hoshikai:reports`，见 topic 页的
   `report.js`）：处置完就把那一条从本机队列里撤掉。台账自己不落盘。 */
(function admin() {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const VIEWS = ['overview', 'audit', 'reports', 'users', 'notices', 'logs'];
  const TITLES = {
    overview: '管理台总览', audit: '内容审核', reports: '举报处理',
    users: '用户与权限', notices: '公告与版块', logs: '操作日志',
  };

  /* ══════════ 状态 ══════════ */
  const S = JSON.parse(JSON.stringify(window.HKADMIN || {}));

  /* 帖内页提交的举报 / 申诉落在本机（`hoshikai:reports`），管理端开局把它们并进队列 ——
     展厅里没有后端，但这条「用户报 → 站务处置」的链路是真的通的，不是两个互不相干的页面。 */
  const LOCAL_KEY = 'hoshikai:reports';
  function localReports() {
    try { const a = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function dropLocal(id) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(localReports().filter((x) => x.id !== id))); } catch (e) { /* 忽略 */ }
  }
  localReports().forEach((r) => {
    const item = { id: r.id, target: r.target, board: r.board, reason: r.reason, by: r.by, mag: r.mag, at: r.at, local: true };
    if (r.kind === 'appeal') S.appeals.unshift(item);
    else S.reports.unshift(item);
  });
  const F = { audit: '', reports: '', users: '', logs: '' };
  const H = { handled: 0, reportTab: 'reports' };

  /* ══════════ 格子条（与站点地图 / 校准台同一套） ══════════ */
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
  const fsHost = $('#adFs');
  if (fsHost) {
    fsHost.innerHTML = filmstrip('观测调度台');
    const draw = () => { const h = fsHost.closest('.ad-h1'); if (h) h.classList.add('is-drawn'); };
    requestAnimationFrame(draw);
    setTimeout(draw, 200);
  }

  /* ══════════ 小部件 ══════════ */
  /* 星等：一等最亮、点最大；数字写出来，不让颜色单独承担语义 */
  const CN = ['', '一', '二', '三', '四', '五'];
  function mag(m) {
    return '<span class="ad-mag" data-m="' + m + '" title="' + CN[m] + '等 · '
      + (m <= 2 ? '先处理' : '按队列顺序') + '"><i aria-hidden="true"></i><b>' + CN[m] + '等</b></span>';
  }
  /* 用户「星等」是站里的观测等级（越高越亮），与队列的紧急度是两回事：
     队列用点 + 「一等」，用户用纯数字 + 「等」，两种记号不混。 */
  function level(n) {
    return '<span class="ad-lvl" title="观测星等 ' + n + '">' + n + '<i>等</i></span>';
  }
  function statePill(st) {
    const cls = st === '封禁' ? ' ad-st--bad' : st === '禁言' || st === '限流' ? ' ad-st--warn' : '';
    return '<span class="ad-st' + cls + '">' + esc(st) + '</span>';
  }
  function emptyRow(cols, text) {
    return '<tr><td class="ad-empty" colspan="' + cols + '">' + esc(text) + '</td></tr>';
  }

  /* ══════════ 今日星历 ══════════ */
  function paintEphem() {
    const host = $('#adEphem');
    if (!host) return;
    const c = S.curve || [];
    const max = Math.max.apply(null, c.concat([1]));
    const top = c.indexOf(max);
    host.innerHTML = c.map((v, i) =>
      '<span class="ad-ephem__b" style="--h:' + (v / max).toFixed(3) + '"'
      + (i === top ? ' data-top="1"' : '') + ' title="' + i + ':00 · ' + v + ' 件"></span>').join('');
  }

  /* ══════════ 总览 ══════════ */
  function paintQueue() {
    const rows = []
      .concat(S.audit.map((r) => ({ id: r.id, t: r.title, m: r.mag, at: r.at, k: '审核', go: 'audit' })))
      .concat(S.reports.map((r) => ({ id: r.id, t: r.target, m: r.mag, at: r.at, k: '举报', go: 'reports' })))
      .concat(S.appeals.map((r) => ({ id: r.id, t: r.target, m: r.mag, at: r.at, k: '申诉', go: 'reports' })))
      .sort((a, b) => a.m - b.m || (a.at < b.at ? 1 : -1))
      .slice(0, 7);
    const body = $('#adQueueBody');
    if (!body) return;
    body.innerHTML = rows.length
      ? rows.map((r) => '<tr>'
        + '<td class="ad-num">' + esc(r.id) + '</td>'
        + '<td><span class="ad-ttl">' + esc(r.t) + '</span><span class="ad-meta">' + r.k + ' · ' + esc(r.at) + '</span></td>'
        + '<td>' + mag(r.m) + '</td>'
        + '<td class="ad-r"><a class="ad-btn" href="#' + r.go + '">去处理</a></td>'
        + '</tr>').join('')
      : emptyRow(4, '队列空。');
    const n = $('#adQueueN');
    if (n) n.textContent = rows.length + ' / ' + (S.audit.length + S.reports.length + S.appeals.length);
  }

  function paintFeed() {
    const host = $('#adFeed');
    if (!host) return;
    const rows = (S.logs || []).slice(0, 8);
    host.innerHTML = rows.length ? rows.map((l) =>
      '<li><time>' + esc(l.at) + '</time><p><b>' + esc(l.who) + '</b> ' + esc(l.act)
      + ' <span>' + esc(l.target) + '</span></p></li>').join('')
      : '<li><p>本班还没有记录。</p></li>';
  }

  /* ══════════ 审核 ══════════ */
  function auditRows() {
    const q = F.audit.trim().toLowerCase();
    return S.audit.filter((r) => !q || (r.title + r.by + r.board + r.kind + r.why).toLowerCase().indexOf(q) >= 0);
  }
  function paintAudit() {
    const rows = auditRows();
    const body = $('#adAuditBody');
    if (body) {
      body.innerHTML = rows.length ? rows.map((r) => '<tr>'
        + '<td class="ad-num">' + esc(r.id) + '</td>'
        + '<td><span class="ad-ttl">' + esc(r.title) + '</span>'
        + '<span class="ad-meta">' + esc(r.kind) + ' · ' + esc(r.board) + ' · ' + esc(r.by) + ' · ' + esc(r.why) + '</span></td>'
        + '<td>' + mag(r.mag) + '</td>'
        + '<td class="ad-num">' + esc(r.at) + '</td>'
        + '<td class="ad-r"><span class="ad-acts">'
        + '<button class="ad-btn" type="button" data-act="reject" data-id="' + esc(r.id) + '">驳回</button>'
        + '<button class="ad-btn ad-btn--go" type="button" data-act="approve" data-id="' + esc(r.id) + '">通过</button>'
        + '</span></td></tr>').join('')
        : emptyRow(5, F.audit ? '没有匹配的条目。清掉筛选再看。' : '队列空。');
    }
    const n = $('#nAudit');
    if (n) n.textContent = '待审 ' + S.audit.length + ' · 本班已处置 ' + H.handled;
  }

  /* ══════════ 举报 / 申诉 ══════════ */
  function activeReportList() { return H.reportTab === 'appeals' ? S.appeals : S.reports; }
  function reportRows() {
    const q = F.reports.trim().toLowerCase();
    return activeReportList().filter((r) =>
      !q || (r.target + r.reason + r.by + r.board).toLowerCase().indexOf(q) >= 0);
  }
  function paintReports() {
    const isAppeal = H.reportTab === 'appeals';
    const rows = reportRows();
    const body = isAppeal ? $('#adAppealBody') : $('#adReportBody');
    if (body) {
      body.innerHTML = rows.length ? rows.map((r) => '<tr>'
        + '<td class="ad-num">' + esc(r.id) + '</td>'
        + '<td><span class="ad-ttl">' + esc(r.target) + '</span>'
        + '<span class="ad-meta">' + esc(r.reason) + ' · ' + esc(r.board) + ' · ' + esc(r.by) + '</span></td>'
        + '<td>' + mag(r.mag) + '</td>'
        + '<td class="ad-num">' + esc(r.at) + '</td>'
        + '<td class="ad-r"><span class="ad-acts">'
        + (isAppeal
          ? '<button class="ad-btn" type="button" data-act="uphold" data-id="' + esc(r.id) + '">维持原判</button>'
            + '<button class="ad-btn ad-btn--go" type="button" data-act="revoke" data-id="' + esc(r.id) + '">撤销</button>'
          : '<button class="ad-btn" type="button" data-act="ignore" data-id="' + esc(r.id) + '">忽略</button>'
            + '<button class="ad-btn ad-btn--stop" type="button" data-act="remove" data-id="' + esc(r.id) + '">删帖</button>'
            + '<button class="ad-btn ad-btn--stop" type="button" data-act="mute" data-id="' + esc(r.id) + '">禁言</button>')
        + '</span></td></tr>').join('')
        : emptyRow(5, F.reports ? '没有匹配的条目。清掉筛选再看。' : '队列空。');
    }
    const nr = $('#nReports'), na = $('#nAppeals'), nn = $('#nReportRows');
    if (nr) nr.textContent = S.reports.length;
    if (na) na.textContent = S.appeals.length;
    if (nn) nn.textContent = '显示 ' + rows.length + ' / ' + activeReportList().length;
    $$('.ad-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.rtab === H.reportTab)));
    const pr = $('#pane-reports'), pa = $('#pane-appeals');
    if (pr) pr.hidden = isAppeal;
    if (pa) pa.hidden = !isAppeal;
  }

  /* ══════════ 用户 ══════════ */
  function userRows() {
    const q = F.users.trim().toLowerCase();
    return S.users.filter((u) => !q || (u.name + u.uid + u.role + u.state).toLowerCase().indexOf(q) >= 0);
  }
  function paintUsers() {
    const rows = userRows();
    const body = $('#adUserBody');
    if (body) {
      body.innerHTML = rows.length ? rows.map((u) => {
        const acts = u.state === '封禁'
          ? '<button class="ad-btn" type="button" data-act="unban" data-uid="' + esc(u.uid) + '">解封</button>'
          : u.state === '禁言'
            ? '<button class="ad-btn" type="button" data-act="unmute" data-uid="' + esc(u.uid) + '">解禁</button>'
            : '<button class="ad-btn" type="button" data-act="mute" data-uid="' + esc(u.uid) + '">禁言 24h</button>'
              + '<button class="ad-btn ad-btn--stop" type="button" data-act="ban" data-uid="' + esc(u.uid) + '">封禁</button>';
        return '<tr>'
          + '<td class="ad-num">' + esc(u.uid) + '</td>'
          + '<td><span class="ad-ttl">' + esc(u.name) + '</span><span class="ad-meta">' + esc(u.role) + '</span></td>'
          + '<td>' + (u.mag > 0 ? level(u.mag) : '<span class="ad-num">—</span>') + '</td>'
          + '<td class="ad-num">' + u.posts + '</td>'
          + '<td>' + statePill(u.state) + '</td>'
          + '<td class="ad-r"><span class="ad-acts">' + acts + '</span></td>'
          + '</tr>';
      }).join('') : emptyRow(6, F.users ? '没有匹配的用户。' : '名录空。');
    }
    const n = $('#nUsers');
    if (n) n.textContent = '共 ' + S.users.length + ' 人 · 需关注 ' + S.users.filter((u) => u.state !== '正常').length;
  }

  /* ══════════ 公告与版块 ══════════ */
  function paintNotices() {
    const body = $('#adNoticeBody');
    if (body) {
      body.innerHTML = S.notices.length ? S.notices.map((n) => '<tr>'
        + '<td class="ad-num">' + esc(n.id) + '</td>'
        + '<td><span class="ad-ttl">' + esc(n.title) + '</span></td>'
        + '<td class="ad-num">' + esc(n.board) + '</td>'
        + '<td class="ad-num">' + esc(n.at) + '</td>'
        + '<td>' + (n.pinned ? '<span class="ad-st ad-st--warn">置顶</span>' : '<span class="ad-st">普通</span>') + '</td>'
        + '<td class="ad-r"><span class="ad-acts"><button class="ad-btn" type="button" data-act="pin" data-id="'
        + esc(n.id) + '" aria-pressed="' + (n.pinned ? 'true' : 'false') + '">'
        + (n.pinned ? '撤下置顶' : '置顶') + '</button></span></td></tr>').join('')
        : emptyRow(6, '还没有公告。');
    }
    const nb = $('#nNotices');
    if (nb) nb.textContent = S.notices.length + ' 条 · 置顶 ' + S.notices.filter((n) => n.pinned).length;

    const bd = $('#adBoardBody');
    if (bd) {
      bd.innerHTML = S.boards.map((b) => '<tr>'
        + '<td><span class="ad-ttl">' + esc(b.name) + '</span></td>'
        + '<td class="ad-num">' + b.sections + '</td>'
        + '<td class="ad-num">' + b.posts + '</td>'
        + '<td class="ad-num">' + b.today + '</td>'
        + '<td class="ad-num">' + esc(b.mod) + '</td>'
        + '<td class="ad-r">' + statePill(b.state) + '</td></tr>').join('');
    }
    const nbo = $('#nBoards');
    if (nbo) nbo.textContent = S.boards.length + ' 个大板块';
  }

  /* ══════════ 日志 ══════════ */
  function logRows() {
    const q = F.logs.trim().toLowerCase();
    return S.logs.filter((l) => !q || (l.who + l.act + l.target + l.at).toLowerCase().indexOf(q) >= 0);
  }
  function paintLogs() {
    const rows = logRows();
    const body = $('#adLogBody');
    if (body) {
      body.innerHTML = rows.length ? rows.map((l) => '<tr>'
        + '<td class="ad-num">' + esc(l.at) + '</td>'
        + '<td><span class="ad-ttl">' + esc(l.who) + '</span></td>'
        + '<td>' + esc(l.act) + '</td>'
        + '<td class="ad-num">' + esc(l.target) + '</td></tr>').join('')
        : emptyRow(4, F.logs ? '没有匹配的记录。' : '本班还没有记录。');
    }
    const n = $('#nLogs');
    if (n) n.textContent = '共 ' + S.logs.length + ' 条 · 显示 ' + rows.length;
  }

  /* ══════════ 计数 ══════════ */
  function paintCounts() {
    const todo = S.audit.length + S.reports.length + S.appeals.length;
    const map = { todo: todo, audit: S.audit.length, reports: S.reports.length + S.appeals.length,
      users: S.users.filter((u) => u.state !== '正常').length };
    $$('[data-count]').forEach((el) => {
      const k = el.getAttribute('data-count');
      el.textContent = map[k] == null ? '0' : String(map[k]);
      el.hidden = !(map[k] > 0);
    });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
    set('stAudit', S.audit.length);
    set('stReports', S.reports.length);
    set('stAppeals', S.appeals.length);
    set('stBanned', S.users.filter((u) => u.state === '封禁').length);
  }

  /* ══════════ 视图切换 ══════════ */
  function currentView() {
    const h = (location.hash || '').replace(/^#/, '');
    return VIEWS.indexOf(h) >= 0 ? h : 'overview';
  }
  function showView() {
    const v = currentView();
    VIEWS.forEach((k) => { const s = document.getElementById('v-' + k); if (s) s.hidden = k !== v; });
    $$('.ad-nav a').forEach((a) => {
      if (a.getAttribute('data-nav') === v) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const c = $('#adCrumb');
    if (c) c.textContent = TITLES[v];
    document.title = TITLES[v] + ' · 星海社';
    if (v === 'overview') { paintQueue(); paintFeed(); }
    if (v === 'audit') paintAudit();
    if (v === 'reports') paintReports();
    if (v === 'users') paintUsers();
    if (v === 'notices') paintNotices();
    if (v === 'logs') paintLogs();
  }

  function setReportTab(name) {
    H.reportTab = name === 'appeals' ? 'appeals' : 'reports';
    paintReports();
  }

  /* ══════════ 吐司 ══════════ */
  let toastT = 0;
  function toast(msg) {
    const el = $('#adToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('is-on'), 2400);
  }

  /* ══════════ 写入日志 ══════════ */
  function nowHM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function pushLog(act, target) {
    S.logs.unshift({ at: nowHM(), who: S.duty.name, act: act, target: target });
    H.handled += 1;
  }

  /* ══════════ 处置 ══════════ */
  function take(list, id) {
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const item = list.splice(i, 1)[0];
    if (item && item.local) dropLocal(item.id);   /* 处置完就把本条从本机队列里撤掉 */
    return item;
  }
  function paintAll() {
    paintCounts(); paintQueue(); paintFeed(); paintAudit(); paintReports();
    paintUsers(); paintNotices(); paintLogs();
  }

  const ACT = {
    approve(id) {
      const r = take(S.audit, id); if (!r) return;
      pushLog('通过审核', '帖子 ' + r.id); paintAll(); toast('已通过：' + r.title);
    },
    reject(id) {
      const r = take(S.audit, id); if (!r) return;
      pushLog('驳回审核', '帖子 ' + r.id); paintAll(); toast('已驳回：' + r.title);
    },
    ignore(id) {
      const r = take(S.reports, id); if (!r) return;
      pushLog('忽略举报', '举报 ' + r.id); paintAll(); toast('已忽略 ' + r.id + '：' + r.reason);
    },
    remove(id) {
      const r = take(S.reports, id); if (!r) return;
      pushLog('删除内容', '举报 ' + r.id); paintAll(); toast('已删除：' + r.target);
    },
    mute(id, uid) {
      if (uid) {
        const u = S.users.find((x) => x.uid === uid); if (!u) return;
        u.state = '禁言';
        pushLog('禁言 24 小时', '用户 ' + u.name); paintAll(); toast('已禁言 ' + u.name + ' 24 小时');
        return;
      }
      const r = take(S.reports, id); if (!r) return;
      pushLog('禁言 24 小时', '举报 ' + r.id); paintAll(); toast('已禁言当事人 · 举报 ' + r.id + ' 关闭');
    },
    uphold(id) {
      const r = take(S.appeals, id); if (!r) return;
      pushLog('维持原判', '申诉 ' + r.id); paintAll(); toast('维持原判：' + r.target);
    },
    revoke(id) {
      const r = take(S.appeals, id); if (!r) return;
      pushLog('撤销处罚', '申诉 ' + r.id); paintAll(); toast('已撤销：' + r.target);
    },
    unmute(id, uid) {
      const u = S.users.find((x) => x.uid === uid); if (!u) return;
      u.state = '正常'; pushLog('解除禁言', '用户 ' + u.name); paintAll(); toast('已解禁 ' + u.name);
    },
    ban(id, uid) {
      const u = S.users.find((x) => x.uid === uid); if (!u) return;
      u.state = '封禁'; pushLog('封禁账号', '用户 ' + u.name); paintAll(); toast('已封禁 ' + u.name);
    },
    unban(id, uid) {
      const u = S.users.find((x) => x.uid === uid); if (!u) return;
      u.state = '正常'; pushLog('解除封禁', '用户 ' + u.name); paintAll(); toast('已解封 ' + u.name);
    },
    pin(id) {
      const n = S.notices.find((x) => x.id === id); if (!n) return;
      n.pinned = !n.pinned;
      pushLog(n.pinned ? '置顶公告' : '撤下置顶', '公告 ' + n.id); paintAll();
      toast((n.pinned ? '已置顶：' : '已撤下：') + n.title);
    },
  };

  /* ══════════ 事件 ══════════ */
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.ad-tab');
    if (tab) { setReportTab(tab.dataset.rtab); return; }

    const stat = e.target.closest('.ad-stat');
    if (stat && stat.dataset.tabto) setReportTab(stat.dataset.tabto);

    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    /* 封禁是两步：第一次只上膛，第二次才真的封。管理端不弹确认框，但也不该一点就封。 */
    if (act === 'ban' && btn.dataset.armed !== '1') {
      btn.dataset.armed = '1';
      btn.textContent = '确认封禁';
      setTimeout(() => {
        if (!btn.isConnected) return;
        btn.dataset.armed = '0'; btn.textContent = '封禁';
      }, 4000);
      return;
    }
    const fn = ACT[act];
    if (fn) fn(btn.dataset.id, btn.dataset.uid);
  });

  $$('[data-filter]').forEach((inp) => {
    inp.addEventListener('input', () => {
      F[inp.dataset.filter] = inp.value;
      if (inp.dataset.filter === 'audit') paintAudit();
      else if (inp.dataset.filter === 'reports') paintReports();
      else if (inp.dataset.filter === 'users') paintUsers();
      else paintLogs();
    });
  });

  const form = $('#adNewNotice');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = $('#ntTitle').value.trim();
      if (!title) { toast('公告标题不能为空。'); $('#ntTitle').focus(); return; }
      const board = $('#ntBoard').value;
      const d = new Date();
      S.notices.unshift({
        id: 'N-' + (25 + H.handled), title: title, board: board, pinned: false,
        at: String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      });
      pushLog('发布公告', '公告 · ' + board);
      paintAll(); form.reset();
      toast('已发布：' + title);
    });
  }

  window.addEventListener('hashchange', showView);

  /* ══════════ 启动 ══════════ */
  const dutyEl = $('#adDuty'), roleEl = $('#adRole');
  if (dutyEl) dutyEl.textContent = S.duty.name;
  if (roleEl) roleEl.textContent = S.duty.role;

  const clock = $('#adClock');
  const tick = () => {
    const d = new Date();
    if (clock) clock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => String(n).padStart(2, '0')).join(':');
  };
  tick();
  setInterval(tick, 1000);

  paintEphem();
  paintAll();
  showView();

  window.__ADMIN = {
    view: currentView, state: S, handled: () => H.handled,
    counts: () => ({ todo: S.audit.length + S.reports.length + S.appeals.length, audit: S.audit.length,
      reports: S.reports.length, appeals: S.appeals.length, logs: S.logs.length }),
  };
})();
