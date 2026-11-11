/* 星海社 · 举报申诉（帖内页 → HUD 功能栏「举报申诉」键 → 观测窗）
   ==================================================================
   用户 2026-11-01：「用户侧举报申述你可以放在帖子页面里面的聊天框，新增一个功能，就叫举报申述，
   注意，功能栏临时功能要跟常驻功能做下区分，比如说描边不一样啊」。

   · 入口只在**帖内页**存在 —— 它针对的永远是「当前这一篇」，这就是「临时功能」的定义；
     常驻键（搜索 / 私信 / 夜间 / 看背景 / 回顶）在任何页面都成立。两者用描边区分：
     常驻＝单实线，临时＝**双线**（空壳＝虚线、锁住＝点线，四种状态互不打架）。
   · 提交后写进 localStorage['hoshikai:reports']，管理端的「举报处理」队列会读到它 ——
     本站没有后端，但这条链路是真的通的，不是「已提交」四个字的空话。 */
(function report() {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const KEY = 'hoshikai:reports';
  const MAX = 20;

  /* 理由 → 星等（与管理端同一套读法：一等最亮＝最重） */
  const REASONS = {
    report: [
      { v: '剧透未标注', mag: 3 },
      { v: '人身攻击', mag: 2 },
      { v: '侵权转载', mag: 2 },
      { v: '站外引流', mag: 1 },
      { v: '内容失效', mag: 4 },
      { v: '其他', mag: 3 },
    ],
    appeal: [
      { v: '禁言处罚', mag: 2 },
      { v: '删帖处罚', mag: 3 },
      { v: '其他', mag: 3 },
    ],
  };

  const who = () => {
    try {
      const o = JSON.parse(localStorage.getItem('hoshikai:session') || 'null');
      return (o && o.name) || '访客';
    } catch (e) { return '访客'; }
  };
  const hm = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  function subject() {
    const h = $('#mgTitle');
    const title = h ? h.textContent.trim() : document.title.split(' · ')[0];
    let board = '';
    const crumb = $('.crumb') || $('.sp-crumb');
    if (crumb) {
      const as = [].slice.call(crumb.querySelectorAll('a'));
      if (as.length) board = as[as.length - 1].textContent.trim();
    }
    return { title: title, board: board };
  }

  function options(kind) {
    return REASONS[kind].map((o) => '<option value="' + esc(o.v) + '">' + esc(o.v) + '</option>').join('');
  }

  function shell(sub) {
    return '<div class="rp">'
      + '<div class="rp__obj">'
      + '<p class="rp__k">对象</p>'
      + '<p class="rp__t">' + esc(sub.title) + '</p>'
      + '<p class="rp__b">' + esc(sub.board || '本帖') + ' · 由 ' + esc(who()) + ' 提交</p>'
      + '</div>'
      + '<form class="rp__form" id="rpForm" autocomplete="off">'
      + '<div class="rp__row">'
      + '<span class="rp__k" id="rpKindL">类型</span>'
      + '<div class="rp__seg" role="radiogroup" aria-labelledby="rpKindL">'
      + '<label class="rp__seg-i"><input type="radio" name="kind" value="report" checked><span>举报</span></label>'
      + '<label class="rp__seg-i"><input type="radio" name="kind" value="appeal"><span>申诉</span></label>'
      + '</div>'
      + '</div>'
      + '<div class="rp__row">'
      + '<label class="rp__k" for="rpReason">理由</label>'
      + '<select class="rp__in rp__sel" id="rpReason">' + options('report') + '</select>'
      + '</div>'
      + '<label class="rp__k" for="rpNote">说明</label>'
      + '<textarea class="rp__in rp__ta" id="rpNote" rows="4" maxlength="300"'
      + ' placeholder="写清楚是哪一层、发生了什么。剧透请指出涉及哪一段。"></textarea>'
      + '<div class="rp__foot">'
      + '<p class="rp__eta">回执 <b>48 小时</b> · 结果回到消息中心</p>'
      + '<button class="btn btn--ghost rp__btn" type="button" data-rp="cancel">取消</button>'
      + '<button class="btn btn--solid rp__btn" type="submit">提交</button>'
      + '</div>'
      + '</form></div>';
  }

  function save(rec) {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      list.unshift(rec);
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
      return true;
    } catch (e) { return false; }
  }

  let sub = { title: '', board: '' };

  function open(trigger) {
    if (!window.HKWin) return;
    sub = subject();
    HKWin.open('举报申诉', shell(sub), trigger, 'win--report');
    const body = HKWin.body();
    const form = $('#rpForm', body);
    if (!form) return;
    const sel = $('#rpReason', form);

    form.addEventListener('change', (e) => {
      if (e.target.name !== 'kind') return;
      sel.innerHTML = options(e.target.value);
    });

    $('[data-rp="cancel"]', form).addEventListener('click', () => HKWin.close());

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const kind = form.elements.kind.value === 'appeal' ? 'appeal' : 'report';
      const reason = sel.value;
      const note = ($('#rpNote', form).value || '').trim();
      const mag = (REASONS[kind].find((o) => o.v === reason) || { mag: 3 }).mag;
      const rec = {
        id: 'R-' + Date.now().toString(36).slice(-4).toUpperCase(),
        kind: kind,
        target: sub.title,
        board: sub.board || '本帖',
        reason: reason + (note ? ' · ' + note.slice(0, 24) : ''),
        note: note,
        by: who(),
        mag: mag,
        at: hm(),
        ts: Date.now(),
      };
      const ok = save(rec);
      const box = $('.rp', body);
      if (box) {
        box.innerHTML = '<div class="rp__done" role="status">'
          + '<svg class="rp__star" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg>'
          + '<p class="rp__done-t">已提交 · ' + esc(rec.id) + '</p>'
          + '<p class="rp__done-d">' + (ok
            ? '这条' + (kind === 'appeal' ? '申诉' : '举报') + '已进入管理端队列，48 小时内处理。'
            : '本机存储不可用（隐私模式），这条没有留下。') + '</p></div>';
      }
      setTimeout(() => { if (window.HKWin && HKWin.isOpen()) HKWin.close(); }, ok ? 1600 : 2600);
    });

    setTimeout(() => { const f = $('#rpNote', body); if (f && !matchMedia('(pointer: coarse)').matches) sel.focus(); }, 60);
  }

  window.HKReport = {
    open: open,
    read: () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
    clear: () => { try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ } },
  };
})();
