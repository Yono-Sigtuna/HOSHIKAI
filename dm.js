/* 星海社 · 私信（HUD 文本框模块 → 站里的观测窗）
   ==================================================================
   用户 2026-11-01 选定：**只做悬浮窗**，不做独立页。
     「一点开就是一个 UI，左侧是私信对象，然后右侧是完整的聊天」

   所以这里只做三件事：
     ① 用站里那扇 `.win`（viewer.js 的 HKWin）开窗 —— 坐标网格、格子条标题栏、
        Esc / ✕ / 遮罩关、焦点归还、Tab 锁在窗内，全部复用，不另造一层浮层；
     ② 渲染两栏：左「星表」会话、右「观测记录」聊天；
     ③ 把**设置页已经定下的口径**接上：谁能给我发私信（所有人 / 我关注的人 / 关闭）、
        黑名单（拉黑后不收私信）。口径存在 `hoshikai:privacy`，和校准台同一个 key。

   ⚠️ 诚实：演示站没有后端。发出去的消息只写 `hoshikai:dm`（本机），
      刷新还在、换设备没有；窗左栏底部与输入提示都明说这件事。

   ⚠️ 不加「自动回复」：没有后端就不假装对面在回。发出的消息只到「已发出」这一态。 */
(function () {
  'use strict';
  if (window.HKDm) return;
  const D = window.DM;
  if (!D) return;

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (id) => '<svg class="i" aria-hidden="true"><use href="#' + id + '"/></svg>';
  const LS = 'hoshikai:dm';
  const PRIV_KEY = 'hoshikai:privacy';
  const SESSION_KEY = 'hoshikai:session';

  /* ══════════ 本机状态 ══════════
     read     : 会话 id → 读过（打开即记，落盘）
     sent     : 会话 id → [{t, ts, read}]（我发出的；ts 只用于排序与 60 分钟分组，**不在界面显示**）
     accepted : 请求 → 已接受
     ignored  : 请求 → 已忽略
     made     : 自己开的新会话 id → 对方星名 */
  const readJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { /* 隐私模式写不进，忽略 */ } };
  const S = Object.assign({ read: {}, sent: {}, accepted: {}, ignored: {}, made: {} }, readJ(LS, {}));

  const privacy = () => {
    const p = readJ(PRIV_KEY, {});
    return { dm: p.dm === 'follow' || p.dm === 'off' ? p.dm : 'all', block: Array.isArray(p.block) ? p.block : [] };
  };
  const myName = () => {
    const s = readJ(SESSION_KEY, null);
    return s && typeof s.name === 'string' && s.name ? s.name : D.me;
  };
  const hueOf = D.hueOf;

  /* ══════════ 会话模型 ══════════ */
  const baseOf = (id) => D.threads.find((t) => t.id === id) || null;
  const idsAll = () => {
    const ids = D.threads.map((t) => t.id);
    Object.keys(S.made).forEach((id) => { if (ids.indexOf(id) < 0) ids.push(id); });
    return ids;
  };
  function meta(id) {
    const b = baseOf(id);
    const name = b ? b.name : (S.made[id] || '未命名');
    const p = D.people.find((x) => x.name === name);
    return {
      id: id, name: name,
      followed: b ? !!b.followed : (p ? !!p.followed : true),
      unread: b ? (b.unread || 0) : 0,
      mag: p ? p.mag : '—',
    };
  }
  function msgsOf(id) {
    const base = (baseOf(id) || { msgs: [] }).msgs.map((m) => Object.assign({}, m));
    const sent = (S.sent[id] || []).map((s) => ({
      from: 'me', t: s.t, min: Math.max(0, (Date.now() - s.ts) / 60000),
      read: s.read !== false,          /* 旧数据没有 read ⇒ 视为已读；新发的写 false */
    }));
    return base.concat(sent).sort((a, b) => b.min - a.min);   /* 大到小 = 旧到新 */
  }
  const lastOf = (id) => { const m = msgsOf(id); return m.length ? m[m.length - 1] : null; };
  const mode = () => privacy().dm;
  const blocked = (name) => privacy().block.indexOf(name) >= 0;
  const isReq = (id) => {
    if (mode() !== 'follow') return false;
    const m = meta(id);
    return !m.followed && !S.accepted[id] && !S.ignored[id];
  };
  /* 忽略过的请求：从列表里消失（不是变成普通会话）。 */
  const muted = (id) => mode() === 'follow' && !meta(id).followed && !!S.ignored[id] && !S.accepted[id];
  const unreadOf = (id) => (S.read[id] || muted(id) ? 0 : meta(id).unread);
  const lockedReason = (id) => {
    if (mode() === 'off') return '你已关闭私信';
    if (blocked(meta(id).name)) return '对方在你的黑名单里';
    return '';
  };

  /* ══════════ 渲染：左栏（星表） ══════════
     ⚠️ 只替换 `.dm__list` 的 innerHTML，**不重绘搜索框** —— 否则每敲一个字输入框就丢焦点。
     搜索命中「还没有会话的人」时，在下面单列「开始新会话」；没有搜索词时不铺这一组。 */
  let qv = '';

  function avatar(name, extra) {
    return '<span class="dm__av' + (extra ? ' ' + extra : '') + '" style="--ah:' + hueOf(name) + '" aria-hidden="true">'
      + esc([...String(name)][0] || '？') + '</span>';
  }

  function rowHTML(id) {
    const m = meta(id);
    const last = lastOf(id);
    const n = unreadOf(id);
    const req = isReq(id);
    const pv = last ? (last.from === 'me' ? '我：' : '') + last.t : '还没有消息';
    /* 右下角只回答一件事：**读没读**。不再显示「几分钟前」——用户 2026-11-01 点掉的。 */
    const st = last
      ? (n > 0 ? '<span class="dm__st is-u">未读 ' + n + '</span>' : '<span class="dm__st">已读</span>')
      : '<span class="dm__st">新会话</span>';
    return '<button class="dm__row" type="button"'
      + ' data-id="' + esc(id) + '" aria-current="' + (openId === id) + '">'
      + avatar(m.name)
      + '<span class="dm__row-t"><b>' + esc(m.name) + '</b><span class="dm__pv">' + esc(pv) + '</span></span>'
      + '<span class="dm__row-r">' + st + '</span>'
      + '</button>'
      + (req ? '<div class="dm__req">'
        + '<button type="button" class="dm__req-y" data-act="accept" data-id="' + esc(id) + '">接受</button>'
        + '<button type="button" data-act="ignore" data-id="' + esc(id) + '">忽略</button></div>' : '');
  }

  function personRow(p) {
    return '<button class="dm__row" type="button" data-act="new" data-name="' + esc(p.name) + '">'
      + avatar(p.name)
      + '<span class="dm__row-t"><b>' + esc(p.name) + '</b><span class="dm__pv">' + esc(p.note) + ' · ' + p.mag + ' 等</span></span>'
      + '<span class="dm__row-r"><span class="dm__st">新</span></span></button>';
  }

  const match = (id, q) => {
    if (!q) return true;
    if (meta(id).name.toLowerCase().indexOf(q) >= 0) return true;
    return msgsOf(id).some((m) => m.t.toLowerCase().indexOf(q) >= 0);
  };
  const byLast = (a, b) => {
    const la = lastOf(a), lb = lastOf(b);
    return (la ? la.min : 1e9) - (lb ? lb.min : 1e9);
  };

  function paintList(root) {
    const list = $('.dm__list', root);
    if (!list) return;
    const q = qv.toLowerCase();
    const ids = idsAll().filter((id) => !blocked(meta(id).name) && !muted(id));
    const req = ids.filter((id) => isReq(id)).filter((id) => match(id, q)).sort(byLast);
    const normal = ids.filter((id) => !isReq(id)).filter((id) => match(id, q)).sort(byLast);

    let html = '';
    if (req.length) html += '<p class="dm__grp">待确认</p>' + req.map(rowHTML).join('');
    if (normal.length) html += '<p class="dm__grp">会话</p>' + normal.map(rowHTML).join('');

    /* 只在**搜索时**才铺「开始新会话」：平时左栏就是一列会话，不把通讯录摊开。 */
    if (q) {
      const have = ids.map((id) => meta(id).name);
      const fresh = D.people.filter((p) => have.indexOf(p.name) < 0 && !blocked(p.name)
        && p.name.toLowerCase().indexOf(q) >= 0);
      if (fresh.length) html += '<p class="dm__grp">开始新会话</p>' + fresh.map(personRow).join('');
    }
    if (!html) html = '<p class="dm__null">' + (q ? '没有找到「' + esc(qv) + '」。' : '还没有会话。') + '</p>';
    list.innerHTML = html;
  }

  /* ══════════ 消息版式：双轨星轨（2026-11-01 用户定案）══════════
     收 / 发各一条**虚线**轨道，每组首一枚星节点；虚线是阅读引导，节点是身份。
     「图注」版与切换器已按用户「保留星轨版本就可以了」删掉。 */
  const STAR16 = '<svg viewBox="0 0 16 16" aria-hidden="true">'
    + '<path d="M8 1.4l1.5 5.1 5.1 1.5-5.1 1.5L8 14.6l-1.5-5.1L1.4 8l5.1-1.5z" fill="currentColor"/></svg>';

  /* ══════════ 渲染：右栏（观测记录） ══════════ */
  function headHTML(id) {
    const m = meta(id);
    const req = isReq(id);
    const rel = req ? '想与你开始私信' : (m.followed ? '已关注' : '未关注');
    return '<header class="dm__hd">'
      + '<button class="dm__back" type="button" aria-label="回到会话列表">' + ico('i-chevron') + '</button>'
      + avatar(m.name, 'dm__hdav')
      + '<span class="dm__id"><b>' + esc(m.name) + '</b><span>' + esc(rel) + '</span></span>'
      + '<span class="dm__mag" title="星等 ' + m.mag + ' · 越小越亮">'
      + ico('k-star4') + '<b>' + m.mag + '</b>等</span>'
      + '</header>';
  }

  function msgsHTML(id) {
    const list = msgsOf(id);
    const me = myName();
    const name = meta(id).name;
    /* 先按「同一人、60 分钟内」压成组；未读分界会**切断同一组**，保证分界线落在正确那一条前。 */
    const u = pendingUnread[id] || 0;
    const unreadSet = new Set();
    if (u > 0) {
      const inIdx = [];
      list.forEach((m, i) => { if (m.from === 'them') inIdx.push(i); });
      inIdx.slice(-u).forEach((i) => unreadSet.add(i));   /* 最近 N 条「对方发来」的 */
    }
    const groups = [];
    list.forEach((m, i) => {
      const isU = unreadSet.has(i);
      const g = groups[groups.length - 1];
      if (g && g.from === m.from && (g.lastMin - m.min) < 60 && g.unread === isU) {
        g.msgs.push(m); g.lastMin = m.min;
      } else {
        groups.push({ from: m.from, msgs: [m], lastMin: m.min, unread: isU });
      }
    });

    let ubDone = false;
    return groups.map((g) => {
      const mine = g.from === 'me';
      const last = g.msgs[g.msgs.length - 1];
      const lines = g.msgs.map((m) => '<p>' + esc(m.t) + '</p>').join('');
      const receipt = mine
        ? '<span class="dm__rs' + (last.read === false ? ' is-u' : '') + '">'
          + (last.read === false ? '未读' : '已读') + '</span>'
        : '';
      const cls = 'dm__ln dm__ln--' + (mine ? 'me' : 'them');
      const hue = hueOf(mine ? me : name);
      const ub = (u > 0 && g.unread && !ubDone)
        ? (ubDone = true, '<li class="dm__ub" role="separator"><span class="dm__ub-t">未读 ' + u + ' 条</span></li>')
        : '';
      return ub + '<li class="' + cls + '">'
        + '<span class="dm__rail dm__rail--l" aria-hidden="true"></span>'
        + '<span class="dm__rail dm__rail--r" aria-hidden="true"></span>'
        + '<span class="dm__node" style="--ah:' + hue + '" aria-hidden="true">' + STAR16 + '</span>'
        + '<span class="dm__lead" aria-hidden="true"></span>'
        + '<div class="dm__tx">' + lines + receipt + '</div></li>';
    }).join('');
  }

  function compositorHTML(id) {
    const m = meta(id);
    const why = lockedReason(id);
    const dis = why ? ' disabled' : '';
    const hint = why
      ? esc(why) + ' · <a href="./settings/#privacy">去设置</a>'
      : 'Enter 发送 · Shift+Enter 换行 · 演示站只存在本机';
    return '<footer class="dm__ft">'
      + '<form class="dm__form">'
      + '<textarea class="dm__ta" rows="1" maxlength="500" aria-label="写私信给' + esc(m.name) + '"'
      + ' placeholder="' + esc(why ? '暂时不能回复…' : '写给 ' + m.name + '…') + '"' + dis + '></textarea>'
      + '<button class="btn btn--solid dm__send" type="submit"' + dis + '>发送</button>'
      + '</form>'
      + '<p class="dm__hint">' + hint + '</p>'
      + '</footer>';
  }

  function paintMain(root) {
    const main = $('.dm__main', root);
    if (!main) return;
    if (!openId) {
      main.innerHTML = '<div class="dm__empty">' + ico('k-dm') + '<p>选一个会话，开始观测。<br>在左边搜索星名，也能新开一段。</p></div>';
      return;
    }
    const m = meta(openId);

    /* 请求闸：设置成「我关注的人」时，没关注的人先停在门外。 */
    if (isReq(openId)) {
      const n = msgsOf(openId).length;
      main.innerHTML = headHTML(openId)
        + '<div class="dm__gate">' + ico('k-lockon')
        + '<h3>想与你开始私信</h3>'
        + '<p>TA 发来了 ' + n + ' 条消息，但你还没关注 TA —— 你的私信范围是「我关注的人」。<br>接受后，这段会话会进入左侧列表。</p>'
        + '<div class="dm__gate__acts">'
        + '<button type="button" class="dm__req-y" data-act="accept" data-id="' + esc(openId) + '">接受</button>'
        + '<button type="button" data-act="ignore" data-id="' + esc(openId) + '">忽略</button>'
        + '</div></div>';
      return;
    }

    const why = lockedReason(openId);
    const banner = why
      ? '<div class="dm__banner">' + esc(why) + '，暂时不能回复。<a href="./settings/#privacy">去设置</a></div>'
      : '';
    const list = msgsOf(openId);
    main.innerHTML = headHTML(openId)
      + banner
      + (list.length
        ? '<ol class="dm__msgs" aria-label="与 ' + esc(m.name) + ' 的消息">' + msgsHTML(openId) + '</ol>'
        : '<div class="dm__empty dm__empty--thread">' + ico('k-dm') + '<p>还没有消息。<br>写第一句吧。</p></div>')
      + compositorHTML(openId);

    const ol = $('.dm__msgs', main);
    if (ol) {
      const ub = $('.dm__ub', ol);
      if (jumpUnread && ub) {
        /* 第一次打开：停在「未读」分界，不直接跳到最底。 */
        ol.scrollTop = Math.max(0,
          ub.getBoundingClientRect().top - ol.getBoundingClientRect().top + ol.scrollTop - 12);
      } else {
        ol.scrollTop = ol.scrollHeight;
      }
    }
    jumpUnread = false;
  }

  /* ══════════ 动作 ══════════ */
  let openId = null;
  const pendingUnread = {};   /* 打开时快照的未读数：只用于这一次会话的「未读」分界 */
  let jumpUnread = false;

  function markRead(id) {
    if (!S.read[id]) { S.read[id] = true; save(); }
  }

  function select(root, id) {
    const u = unreadOf(id);
    if (u > 0) pendingUnread[id] = u; else delete pendingUnread[id];
    jumpUnread = true;
    openId = id;
    markRead(id);
    root.dataset.view = 'thread';
    paintList(root); paintMain(root); updateBadge();
    if (matchMedia('(min-width: 761px)').matches) {
      const ta = $('.dm__ta', root); if (ta) ta.focus();
    }
  }

  function accept(root, id) {
    const u = unreadOf(id);
    if (u > 0) pendingUnread[id] = u; else delete pendingUnread[id];
    jumpUnread = true;
    S.accepted[id] = true;
    save();
    openId = id;
    markRead(id);
    root.dataset.view = 'thread';
    paintList(root); paintMain(root); updateBadge();
  }

  function ignore(root, id) {
    S.ignored[id] = true;
    save();
    /* 留在会话页会看到一个没有返回键的空壳（openId 清空后抬头就不画了）⇒ 回列表。 */
    if (openId === id) { openId = null; root.dataset.view = 'side'; }
    paintList(root); paintMain(root); updateBadge();
  }

  function startWith(root, name) {
    const id = 'p-' + name;
    if (!S.made[id]) { S.made[id] = name; save(); }
    qv = '';
    const q = $('.dm__q', root); if (q) q.value = '';
    delete pendingUnread[id];
    jumpUnread = false;
    openId = id;
    markRead(id);
    root.dataset.view = 'thread';
    paintList(root); paintMain(root); updateBadge();
    if (matchMedia('(min-width: 761px)').matches) {
      const ta = $('.dm__ta', root); if (ta) ta.focus();
    }
  }

  function autoGrow(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(132, Math.max(44, ta.scrollHeight)) + 'px';
  }

  function send(root) {
    if (!openId) return;
    if (isReq(openId) || lockedReason(openId)) return;
    const ta = $('.dm__ta', root);
    if (!ta) return;
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    (S.sent[openId] || (S.sent[openId] = [])).push({ t: text.slice(0, 500), ts: Date.now(), read: false });
    markRead(openId);
    save();
    paintList(root); paintMain(root); updateBadge();
    const t2 = $('.dm__ta', root);
    if (t2) { t2.focus(); autoGrow(t2); }
  }

  /* ══════════ 外壳 + 绑定 ══════════
     HKWin 每次打开都会**替换** `.win__body`，所以每次都要重新建根、重新绑；
     旧节点连同监听一起被丢弃，不会叠。 */
  const SHELL = '<div class="dm" data-view="side">'
    + '<aside class="dm__side">'
    + '<div class="dm__side-hd">'
    + '<form class="search dm__find" role="search">'
    + '<svg class="i" aria-hidden="true"><use href="#k-finder"/></svg>'
    + '<input class="dm__q" type="search" placeholder="搜索星名或消息" aria-label="搜索会话">'
    + '</form></div>'
    + '<div class="dm__list" role="group" aria-label="会话列表"></div>'
    + '<p class="dm__note">演示站 · 会话只存在本机</p>'
    + '</aside>'
    + '<section class="dm__main" aria-label="对话"></section>'
    + '</div>';

  function bind(root) {
    const q = $('.dm__q', root);
    if (q) q.addEventListener('input', () => { qv = q.value.trim(); paintList(root); });
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      /* 左栏搜索框也是 form；只有底部那一个 form 才是「发送」。 */
      if (e.target.classList.contains('dm__form')) send(root);
    });
    root.addEventListener('input', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('dm__ta')) autoGrow(e.target);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      if (e.target && e.target.classList && e.target.classList.contains('dm__ta')) {
        e.preventDefault(); send(root);
      }
    });
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (act) {
        const id = act.dataset.id;
        if (act.dataset.act === 'accept') { accept(root, id); return; }
        if (act.dataset.act === 'ignore') { ignore(root, id); return; }
        if (act.dataset.act === 'new') { startWith(root, act.dataset.name); return; }
      }
      const back = e.target.closest('.dm__back');
      if (back) {
        root.dataset.view = 'side';
        const cur = $('.dm__row[aria-current="true"]', root); if (cur) cur.focus();
        return;
      }
      const row = e.target.closest('.dm__row');
      if (row) select(root, row.dataset.id);
    });
  }

  function open(trigger) {
    if (!window.HKWin) return false;
    qv = '';
    HKWin.open('私信', SHELL, trigger, 'win--dm');
    const body = HKWin.body();
    const root = $('.dm', body);
    if (!root) return false;
    bind(root);
    paintList(root);
    paintMain(root);
    updateBadge();
    /* 桌面把焦点放进搜索框；窄屏不抢 —— 程序化 focus 会带出软键盘，把整列会话盖住。 */
    if (matchMedia('(min-width: 761px)').matches) {
      const q = $('.dm__q', root);
      if (q) q.focus();
    }
    return true;
  }

  /* ══════════ HUD 键上的未读点 ══════════
     不加数字气泡：40px 方格键之间只有 4px，数字会压到邻居（HUD 键刚被要求缩小过）。
     这里只放一枚 6px 金点；具体几条在窗内看。 */
  function updateBadge() {
    const key = document.querySelector('.key[data-k="私信"]');
    if (!key) return;
    let n = 0;
    idsAll().forEach((id) => { if (!blocked(meta(id).name)) n += unreadOf(id); });
    key.toggleAttribute('data-dm-unread', n > 0);
    key.setAttribute('aria-label', '私信' + (n > 0 ? '，' + n + ' 条未读' : ''));
    key.title = n > 0 ? '私信 · ' + n + ' 条未读' : '私信';
    /* 功能栏里的未读提醒：钥匙标签后面跟一个金数（不是一枚不说明数量的小点）。 */
    const badge = key.querySelector('[data-dm-n]');
    if (badge) {
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.hidden = n === 0;
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key && e.key !== LS && e.key !== PRIV_KEY) return;
    updateBadge();
    const root = $('.dm');
    if (root && window.HKWin && HKWin.isOpen()) { paintList(root); paintMain(root); }
  });

  window.HKDm = {
    open: open,
    close: () => { if (window.HKWin) HKWin.close(); },
    refresh: updateBadge,
    state: S,
    /* 给探针用的只读快照 —— 不给它开「清状态」的口子，状态就是真的本机状态 */
    snapshot: () => ({
      unread: idsAll().reduce((a, id) => a + (blocked(meta(id).name) ? 0 : unreadOf(id)), 0),
      open: openId,
      mode: mode(),
      blocked: privacy().block.slice(),
    }),
  };

  /* HUD 已经建好了（hud.js 在本文件之前执行）⇒ 直接补未读点。
     兜底再听一次 DOMContentLoaded：将来若脚本顺序改了也不会静默丢。 */
  updateBadge();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateBadge, { once: true });
})();
