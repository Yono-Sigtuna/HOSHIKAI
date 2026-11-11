/* 星海社 · 观测者校准台（./settings/）
   ------------------------------------------------------------------
   全部是**本机演示**：档案 / 通知 / 隐私写进 localStorage，主题写站点同一个 key。
   不伪造后端；账号区明确写着「演示站不保存账号」，密码不读不写。

   保存是显式的：改动先变「未保存」，底部保存条浮出来；保存后才落盘并更新左卡。
   主题是例外——它和右上角昼夜开关同一个设置，切了立即生效（与站里一致）。 */
(function settings() {
  'use strict';

  var KP = 'hoshikai:profile', KN = 'hoshikai:prefs', KV = 'hoshikai:privacy';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var hueOf = (window.HK && HK.session && HK.session.hueOf) || function (s) {
    return [].concat(Array.from(String(s))).reduce(function (a, c) { return (a * 31 + c.codePointAt(0)) % 360; }, 7);
  };
  var read = function (k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : d; }
    catch (e) { return d; }
  };
  var write = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var me = (window.HK && HK.session && HK.session.get()) || null;

  var saved = {
    profile: read(KP, {
      name: me ? me.name : '夜狩',
      sign: '在星轨与海之间',
      bio: '',
      mail: ''
    }),
    prefs: read(KN, { reply: true, star: true, mention: true, follow: false, system: true }),
    privacy: read(KV, { dm: 'all', gal: true, block: [] })
  };

  /* 旧版本存过 hue；现在头像色相跟着星名走，读到就丢掉，免得脏检查永远为真 */
  if (saved.profile) delete saved.profile.hue;

  var el = {
    name: $('#setName'),
    sign: $('#setSign'), bio: $('#setBio'), mail: $('#setMail'),
    pwOld: $('#setPwOld'), pwNew: $('#setPwNew'),
    av: $('#setAv'), idName: $('#setIdName'),
    nameN: $('#setNameN'), signN: $('#setSignN'), bioN: $('#setBioN'),
    chips: $('#setChips'), chipIn: $('#setBlockIn'), chipEmpty: $('#setChipsEmpty'),
    bar: $('#setSavebar'), save: $('#setSave'), reset: $('#setReset'),
    toast: $('#toast'), kill: $('#setKill')
  };

  /* ── 页面抬头：站里的格子条（望远镜 + 弧 + 逐格字 + 星环封口，逐字复用 .fs 组件） ──
     弧（.fs__arc）与悬停流星（.fs__sparks）必须一起带上：它们不是可选装饰，
     是 .fs 组件在板块页/帖子页上的标准形态；.fs 的 padding-top 就是按弧高留的。 */
  var ARC = '<svg class="fs__arc" viewBox="0 28 1200 28" preserveAspectRatio="none" aria-hidden="true">'
    + '<path class="orbit__line" d="M2 56 Q600 6 1198 56" fill="none" stroke="currentColor" stroke-width="1.5"'
    + ' vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg>';
  var SPARKS = '<span class="fs__sparks" aria-hidden="true"><i class="fs__spark"></i><i class="fs__spark fs__spark--b"></i></span>';

  function filmstrip(text) {
    var chars = Array.from(String(text));
    var tiles = chars.map(function (ch, i) {
      return '<span class="fs__t' + (i === 0 ? ' fs__t--deep' : '') + '" style="--i:' + (i + 1) + '">'
        + esc(ch) + '</span>';
    }).join('');
    return '<span class="fs" style="--hue:218;--n:' + (chars.length + 2) + '">'
      + '<svg class="fs__tel" viewBox="0 0 76 75" aria-hidden="true"><use href="#i-telescope"/></svg>'
      + '<span class="fs__wrap">' + ARC + SPARKS + '<span class="fs__bar">'
      + '<span class="fs__t fs__t--deep" style="--i:0"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#i-telescope-tile"/></svg></span>'
      + tiles
      + '<span class="fs__t fs__t--deep fs__t--cap" style="--i:' + (chars.length + 1) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg></span>'
      + '</span></span></span>';
  }
  var fsHost = $('#setFs');
  if (fsHost) {
    fsHost.innerHTML = filmstrip('观测者校准台');
    /* 本页不加载 forum.css，`is-drawn` 那条通用规则不在；不给祖先加类，
       弧会永远停在 stroke-dashoffset:1200（不可见）。rAF 排一帧让描线有初始态可过渡，
       再补一个定时器 —— 后台标签页里 rAF 会被节流甚至暂停，弧不能靠它才现身。 */
    var drawArc = function () {
      var h1 = fsHost.closest('.set-h1');
      if (h1) h1.classList.add('is-drawn');
    };
    requestAnimationFrame(drawArc);
    setTimeout(drawArc, 200);
  }

  /* ── 回填 ── */
  function setBar(block) {
    el.chips.innerHTML = block.map(function (n) {
      return '<li class="set-chip">' + esc(n)
        + '<button type="button" aria-label="移出黑名单：' + esc(n) + '" data-n="' + esc(n) + '">×</button></li>';
    }).join('');
    el.chipEmpty.hidden = block.length > 0;
  }

  function rail(name, hue) {
    var chars = Array.from(String(name || '？'));
    el.av.textContent = chars[0] || '？';
    el.av.style.setProperty('--ah', hue);
    el.idName.textContent = name || '未命名';
  }

  function count() {
    el.nameN.textContent = el.name.value.length + '/16';
    el.signN.textContent = el.sign.value.length + '/32';
    el.bioN.textContent = el.bio.value.length + '/120';
  }

  function fill(s) {
    el.name.value = s.profile.name;
    el.sign.value = s.profile.sign;
    el.bio.value = s.profile.bio;
    el.mail.value = s.profile.mail || '';
    $$('.set-sw').forEach(function (b) {
      var k = b.getAttribute('data-k');
      var on = k === 'gal' ? s.privacy.gal : s.prefs[k];
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    $$('input[name="setDm"]').forEach(function (r) { r.checked = r.value === s.privacy.dm; });
    setBar(s.privacy.block);
    rail(s.profile.name, hueOf(s.profile.name));
    count();
  }

  /* ── 取值 / 脏检查 ── */
  function collect() {
    return {
      profile: {
        name: el.name.value.trim() || '未命名',
        sign: el.sign.value,
        bio: el.bio.value,
        mail: el.mail.value.trim()
      },
      prefs: $$('.set-sw').reduce(function (o, b) {
        var k = b.getAttribute('data-k');
        if (k !== 'gal') o[k] = b.getAttribute('aria-checked') === 'true';
        return o;
      }, {}),
      privacy: {
        dm: ($$('input[name="setDm"]').filter(function (r) { return r.checked; })[0] || {}).value || 'all',
        gal: $('.set-sw[data-k="gal"]').getAttribute('aria-checked') === 'true',
        block: $$('.set-chip').map(function (li) {
          return li.textContent.replace('×', '').trim();
        })
      }
    };
  }
  function dirty() { return JSON.stringify(collect()) !== JSON.stringify(saved); }
  function refreshBar() { el.bar.hidden = !dirty(); }

  /* ── 交互 ── */
  el.name.addEventListener('input', function () {
    /* 头像色相跟着星名走 —— 与站里 .av / 顶栏头像同一个哈希，不给单独开关 */
    rail(el.name.value.trim(), hueOf(el.name.value.trim()));
    count(); refreshBar();
  });
  el.sign.addEventListener('input', function () { count(); refreshBar(); });
  el.bio.addEventListener('input', function () { count(); refreshBar(); });
  el.mail.addEventListener('input', refreshBar);

  $$('.set-sw').forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-checked', b.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      refreshBar();
    });
  });
  $$('input[name="setDm"]').forEach(function (r) { r.addEventListener('change', refreshBar); });

  el.chipIn.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var n = el.chipIn.value.trim().slice(0, 16);
    if (!n) return;
    var have = $$('.set-chip').map(function (li) { return li.textContent.replace('×', '').trim(); });
    if (have.indexOf(n) >= 0 || have.length >= 12) { el.chipIn.value = ''; return; }
    have.push(n);
    setBar(have);
    el.chipIn.value = '';
    refreshBar();
  });
  el.chips.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-n]');
    if (!b) return;
    var n = b.getAttribute('data-n');
    setBar($$('.set-chip').map(function (li) { return li.textContent.replace('×', '').trim(); })
      .filter(function (x) { return x !== n; }));
    refreshBar();
  });

  /* ── 保存 / 撤销 ── */
  function toast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add('is-on');
    clearTimeout(el.toast._t);
    el.toast._t = setTimeout(function () { el.toast.classList.remove('is-on'); }, 1800);
  }

  el.save.addEventListener('click', function () {
    var s = collect();
    saved = s;
    write(KP, s.profile); write(KN, s.prefs); write(KV, s.privacy);
    /* 登录时改星名 = 顶栏显示名跟着改（站里就一个显示名，不能两处不一样） */
    if (me && s.profile.name !== me.name) {
      HK.session.login(s.profile.name);
      me = HK.session.get();
    }
    fill(s);
    el.bar.hidden = true;
    toast('已保存');
  });
  el.reset.addEventListener('click', function () {
    fill(saved);
    el.bar.hidden = true;
  });

  /* ── 主题：立即生效，写站点同一个 key ── */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('hoshikai:theme', t); } catch (e) {}
    var tg = $('#themeTg');
    if (tg) {
      tg.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      tg.setAttribute('aria-label', t === 'dark' ? '切换到日间模式' : '切换到夜间模式');
    }
    document.dispatchEvent(new CustomEvent('hktheme', { detail: t }));
  }
  $$('input[name="setTheme"]').forEach(function (r) {
    r.checked = (document.documentElement.dataset.theme || 'light') === r.value;
    r.addEventListener('change', function () { applyTheme(r.value); });
  });

  /* ── 左侧导航：点击滚动 + 滚动高亮 ── */
  var links = $$('.set-nav a');
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = $(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      links.forEach(function (x) { x.setAttribute('aria-current', x === a ? 'true' : 'false'); });
    });
  });
  if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('.set-sec').forEach(function (s) { seen.observe(s); });
  }

  /* ── 危险区：注销本机账号（开站里那扇窗） ── */
  el.kill.addEventListener('click', function () {
    var html = '<div class="setPad">'
      + '<p>这会退出登录，并删除本机保存的档案、通知与隐私设置。演示站没有服务器端账号，删了不等于注销一个真实账号。</p>'
      + '<div class="setPad__acts">'
      + '<button class="btn btn--ghost" type="button" data-close>再想想</button>'
      + '<button class="btn btn--solid" type="button" id="setKillGo">清除并退出</button>'
      + '</div></div>';
    if (window.HKWin) {
      HKWin.open('注销本机账号', html, el.kill, 'win--set');
      var go = $('#setKillGo');
      go.addEventListener('click', function () {
        [KP, KN, KV, 'hoshikai:session'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
        if (window.HK) HK.session.logout();
        location.href = './';
      });
    } else if (window.confirm('清除本机保存的会话与设置？')) {
      [KP, KN, KV, 'hoshikai:session'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      location.href = './';
    }
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') && window.HKWin) HKWin.close();
  });

  /* 动效偏好说明：只报告系统设置，不伪造开关 */
  var rm = matchMedia('(prefers-reduced-motion: reduce)');
  function rmNote() {
    var n = $('#setRmNote');
    if (n) n.textContent = rm.matches ? '系统已开启「减少动态效果」，站内动画会跟着关' : '跟随系统设置（当前：未开启）';
  }
  rmNote();
  if (rm.addEventListener) rm.addEventListener('change', rmNote);

  fill(saved);
  el.bar.hidden = true;
  window.__SET = { collect: collect, saved: function () { return saved; }, dirty: dirty };
})();
