/* 星海社 · 消息·通知页
   ==================================================================
   用户 2026-10-15：「这版还可以，但是有个问题，就是**过于设计了**，
     我不理解你为什么时间下面要接多少多少条，就是说都消息信息了，为什么你还要做折叠呢？
     星等这些无意义的可以去掉了。」

   ⇒ 两条都改掉了：
     ① **不折叠** —— 一条通知一行。分组（「等 N 人」＋右侧「N 条」）是**收件箱**的做法
        （要压低体积）；消息流不压，一条就是一条。
     ② **去掉星等** —— 发通知的人有多热，对「这条要不要点开」没有任何作用。
        排掉它，一条行上就只剩两样站里的东西：类型图标、星位。
   ⇒ 顺带去掉了未读行的淡蓝洗色：未读本来就有「星位＋加粗」两个信号，
        再加一层底就是同一个状态说三遍 —— 那正是「过于设计」的样子。

   留下的两样站里的东西：
     · k-* 天文图标（hud.js 那九枚里的五枚）—— 它说「这是哪一类通知」，有用
     · 「没点亮的星位」（HUD 里已有的语言）—— 它说「读没读」，有用
   ================================================================== */
(function () {
  'use strict';

  const M = window.MSG;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* ⚠️ `i` 这个基础类**必须一直在**：`.i` 才是 `fill:none; stroke:currentColor` 的来源
     （style.css 里那条）。第一版写成 `cls || 'i'` —— 一传自定义类名就把基础类顶掉了，
     于是每个 `<use>` 都退成 **SVG 默认的实心黑**：`i-reply`（描边气泡）显示成黑方块，
     而 `k-star4`（自带 fill="currentColor"）反而正常 —— 症状不对称，最容易被当成图标画错了。 */
  const ico = (id, cls) => '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';

  /* ══════════ 五种通知 → 站里那套图标 ══════════
     reply   → i-reply   站里「回复数」用的就是它，语义最直
     star    → k-star4   本征星芒 —— 站里「重要」的记号
     mention → k-lockon  观测框夹住一枚星芒 —— 被点到名
     follow  → k-scope   望远镜 —— 有人把镜子对着你
     system  → k-zenith  天顶 —— 官方 / 公告 */
  const KIND_ICO = { reply: 'i-reply', star: 'k-star4', mention: 'k-lockon', follow: 'k-scope', system: 'k-zenith' };

  const fmt = (min) => {
    if (min < 2) return '刚刚';
    if (min < 60) return min + ' 分钟前';
    if (min < 1440) return Math.round(min / 60) + ' 小时前';
    if (min < 2880) return '昨天';
    if (min < 10080) return Math.round(min / 1440) + ' 天前';
    if (min < 43200) return Math.round(min / 10080) + ' 周前';
    return Math.round(min / 43200) + ' 个月前';
  };
  const BAND = [
    { label: '今天', test: (m) => m < 1440 },
    { label: '昨天', test: (m) => m < 2880 },
    { label: '本周', test: (m) => m < 10080 },
    { label: '更早', test: () => true },
  ];
  const idOf = (n) => n.tid + '|' + n.name + '|' + n.min;

  /* ══════════ 页头 + 筛选栏 ══════════ */
  function head(unread) {
    const K = M.KINDS;
    const tabs = Object.keys(K).map((k) =>
      '<button class="msg-tab" type="button" data-kind="' + k + '" aria-pressed="false">'
      + ico(KIND_ICO[k], 'msg-tab__i') + '<span>' + esc(K[k].short) + '</span>'
      + (M.counts[k].unread ? '<i class="msg-tab__n">' + M.counts[k].unread + '</i>' : '')
      + '</button>').join('');
    return '<header class="msg-head">'
      + '<h1>消息</h1>'
      + '<p class="msg-head__sub">观测台 · 通知</p>'
      + '<p class="msg-head__n"><b>' + unread + '</b> 条未读 · 共 ' + M.items.length + ' 条</p>'
      + '</header>'
      + '<div class="msg-bar" role="group" aria-label="按类型筛选">'
      + '<button class="msg-tab" type="button" data-kind="all" aria-pressed="true">全部'
      + (unread ? '<i class="msg-tab__n">' + unread + '</i>' : '') + '</button>'
      + tabs
      + '</div>'
      + '<div class="msg-tools">'
      + '<span class="msg-tools__hint" id="msgHint"></span>'
      + '<button class="msg-tools__read" type="button">' + ico('k-mark') + '全部标为已读</button>'
      + '</div>';
  }

  /* ══════════ 一条通知一行 ══════════
     用户 2026-10-15：「奇数和偶数你能不能背景做点差分，太相近了看着疲劳感好累，
       还有感觉空间浪费很厉害，你看右边只有时间，所有信息都集中在左侧了」
     ⇒ 行改成**一条横线上五格**：左半是「谁 · 做了什么」，右半是「哪条帖 · 哪个板块」，
       时间在最右。原来标题挤在左半边、右半边只剩一个时间，那才是空。 */
  function row(n, alt) {
    const K = M.KINDS[n.kind];
    return '<li class="msg-row' + (n.read ? '' : ' is-unread') + (alt ? ' is-alt' : '')
      + '" data-kind="' + n.kind + '" data-id="' + esc(idOf(n)) + '">'
      + '<a class="msg-row__a" href="./topic/' + esc(n.tid) + '/">'
      /* 星位：空壳＝没点亮（未读），点亮＝已读 */
      + '<span class="msg-lit" role="img" aria-label="' + (n.read ? '已读' : '未读') + '">'
      + (n.read ? ico('k-star4', 'msg-lit__star') : '<i class="msg-lit__shell"></i>')
      + '</span>'
      + '<span class="msg-av" style="--hue:' + n.hue + '" aria-hidden="true">' + esc(n.name.slice(0, 1)) + '</span>'
      + '<span class="msg-t">' + ico(KIND_ICO[n.kind], 'msg-t__i')
      + '<b>' + esc(n.name) + '</b><span class="msg-t__v">' + esc(K.verb) + '</span></span>'
      + '<span class="msg-s"><span class="msg-s__t">' + esc(n.thread) + '</span>'
      + '<i class="msg-s__bq">' + esc(n.board) + '</i></span>'
      + '<span class="msg-r"><b class="msg-r__t">' + fmt(n.min) + '</b></span>'
      + '</a></li>';
  }

  function list(filter, seen) {
    const its = (!filter || filter === 'all') ? M.items : M.items.filter((n) => n.kind === filter);
    if (!its.length) {
      return '<ol class="msg-list"><li class="msg-empty">'
        + '<span class="msg-empty__m">' + ico('k-scope') + '</span>'
        + '<p>这一类里没有新消息。</p></li></ol>';
    }
    let out = '', cur = null, k = 0;
    its.forEach((n) => {
      const b = BAND.find((x) => x.test(n.min));
      /* ⚠️ 奇偶**按每个日期档各自从 0 数**。用 CSS 的 `:nth-child(2n)` 不行 ——
         兄弟里还夹着 `.msg-day` 分隔条，奇偶会被它打乱（多一个分隔条就整体反相）。 */
      if (b.label !== cur) { cur = b.label; k = 0; out += '<li class="msg-day" aria-hidden="true"><span>' + b.label + '</span></li>'; }
      out += row(Object.assign({}, n, { read: seen[idOf(n)] || n.read }), (k++ % 2) === 1);
    });
    return '<ol class="msg-list">' + out + '</ol>';
  }

  /* ══════════ 渲染 + 那点必须真的能用的交互 ══════════
     §20.4：原型里的东西要真的点得动 —— 筛选 / 已读 / hover 都是真的。 */
  const host = document.getElementById('msg');
  let filter = 'all';
  const seen = {};                       /* 通知 id → 已读过（本地一份，不动 mock 数据） */

  function unreadLeft() { return M.items.filter((n) => !(seen[idOf(n)] || n.read)).length; }

  function paint() {
    host.innerHTML = head(unreadLeft()) + list(filter, seen);
    [].slice.call(host.querySelectorAll('.msg-tab')).forEach((b) => {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-kind') === filter));
    });
    const hint = host.querySelector('#msgHint');
    if (hint) hint.textContent = filter === 'all' ? '' : '只看「' + M.KINDS[filter].short + '」';
  }

  host.addEventListener('click', (e) => {
    const hit = (sel) => (e.target.closest ? e.target.closest(sel) : null);
    const tab = hit('.msg-tab');
    if (tab) { filter = tab.getAttribute('data-kind'); paint(); return; }
    if (hit('.msg-tools__read')) { M.items.forEach((n) => { seen[idOf(n)] = true; }); paint(); return; }
    const a = hit('.msg-row__a');
    if (a) {
      e.preventDefault();                                   /* 原型：不真的跳，只把它标成读过 */
      seen[a.parentNode.getAttribute('data-id')] = true; paint();
    }
  });

  paint();
  window.__MSG = { seen: seen, idOf: idOf, get filter() { return filter; }, paint: paint, M: M, unreadLeft: unreadLeft };
})();
