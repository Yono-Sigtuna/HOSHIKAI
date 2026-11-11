/* 星海社 · 按钮里的星座（§45.7）
   ------------------------------------------------------------------
   给每个 `.btn` 画一张随机星座图，3–6 颗星、3–5 根连线；空闲 → 悬停 → 按下
   依次多亮出下一根线，末星金色。

   ⚠️ **不插 DOM 子元素，也不走 CSS 变量**：直接把 SVG data URI 写进按钮的
   `style.background-image`（主键再叠一层深蓝渐变），指针/焦点事件切 1 / 2 / 全部 三张图。
   原因（本机 Chrome 156 实测）：
     ① `.btn` 里绝对定位的子元素会被画到页面原点（布局正确、绘制错位；
        inset / 百分比 / px / transform / contain 都试过，救不回来）；
     ② 由 `var(--bs-1)` 解析出来的背景图首次绘制后不刷新（computed 对、画不出来），
        只有内联样式（或 !important 强制重算）才会重画。
   背景层由元素自己绘制，没有这两个问题。

   图案池的源头在 `_archive/prototypes-2026-11-02/_btns.js`（原型已归档）；
   这里是生产副本，改图案只改这里。 */
(function () {
  'use strict';

  var GRAD = 'linear-gradient(150deg, #3a63dd, #2f5be0)';

  var POOL = [
    { p: [[10, 31], [34, 5], [60, 31], [88, 5]], e: [[0, 1], [1, 2], [2, 3]] },
    { p: [[8, 5], [30, 31], [56, 5], [84, 31]], e: [[0, 1], [1, 2], [2, 3]] },
    { p: [[8, 31], [28, 5], [48, 31], [68, 5], [92, 31]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { p: [[6, 5], [24, 31], [44, 5], [64, 31], [88, 5]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { p: [[16, 31], [44, 5], [72, 31], [92, 5]], e: [[0, 1], [1, 2], [2, 3]] },
    { p: [[12, 5], [38, 31], [66, 5], [90, 31]], e: [[0, 1], [1, 2], [2, 3]] },
    { p: [[16, 31], [50, 5], [84, 31], [50, 31]], e: [[1, 0], [1, 2], [1, 3]] },
    { p: [[12, 31], [40, 5], [68, 31], [40, 31]], e: [[1, 0], [1, 2], [1, 3]] },
    { p: [[10, 5], [36, 31], [62, 5], [88, 31]], e: [[0, 1], [1, 2], [2, 3]] },
    { p: [[8, 5], [28, 31], [48, 5], [70, 31], [92, 5]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { p: [[14, 5], [38, 31], [62, 5], [86, 31]], e: [[0, 1], [1, 2], [2, 3]] },
    { p: [[10, 31], [10, 5], [50, 31], [90, 5]], e: [[0, 1], [1, 2], [2, 3]] },
    { p: [[10, 31], [50, 5], [90, 31], [70, 31]], e: [[1, 0], [1, 2], [2, 3]] },
    { p: [[8, 31], [26, 5], [46, 31], [66, 5], [86, 31]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { p: [[8, 5], [26, 5], [44, 31], [62, 31]], e: [[0, 1], [1, 2], [2, 3]] },
    { p: [[8, 31], [24, 31], [44, 5], [64, 31], [84, 5]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { p: [[16, 5], [44, 31], [72, 5], [90, 31]], e: [[0, 1], [1, 2], [2, 3]] },
    { p: [[6, 31], [22, 5], [40, 31], [58, 5], [76, 31], [94, 5]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
    { p: [[12, 5], [34, 31], [56, 5], [78, 31], [92, 31]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { p: [[18, 31], [42, 5], [66, 31], [86, 5]], e: [[0, 1], [1, 2], [2, 3]] },
  ];

  var X = function (v) { return 18 + (v - 6) / 88 * 64; };
  var Y = function (v) { return 6.5 + (v - 5) / 26 * 24; };

  function starD(x, y, r) {
    var w = r * 0.28;
    return 'M' + x.toFixed(1) + ' ' + (y - r).toFixed(1)
      + 'L' + (x + w).toFixed(1) + ' ' + (y - w).toFixed(1)
      + 'L' + (x + r).toFixed(1) + ' ' + y.toFixed(1)
      + 'L' + (x + w).toFixed(1) + ' ' + (y + w).toFixed(1)
      + 'L' + x.toFixed(1) + ' ' + (y + r).toFixed(1)
      + 'L' + (x - w).toFixed(1) + ' ' + (y + w).toFixed(1)
      + 'L' + (x - r).toFixed(1) + ' ' + y.toFixed(1)
      + 'L' + (x - w).toFixed(1) + ' ' + (y - w).toFixed(1) + 'Z';
  }

  function svgURL(W, H, pts, edges, n, star, end, line, op) {
    var lines = '';
    for (var i = 0; i < n && i < edges.length; i++) {
      var a = pts[edges[i][0]], b = pts[edges[i][1]];
      lines += '<path d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1)
        + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '" fill="none" stroke="' + line
        + '" stroke-width="1.3" stroke-linecap="round" stroke-opacity="' + op + '"/>';
    }
    var stars = '';
    for (var j = 0; j < pts.length; j++) {
      stars += '<path d="' + starD(pts[j][0], pts[j][1], j === pts.length - 1 ? 2.9 : 2.1 + (j % 3) * 0.25)
        + '" fill="' + (j === pts.length - 1 ? end : star) + '"/>';
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H
      + '" viewBox="0 0 ' + W + ' ' + H + '">' + lines + stars + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  function colors(b) {
    var dark = document.documentElement.dataset.theme === 'dark';
    if (b.classList.contains('btn--solid')) {
      return { line: '#cfe0ff', star: '#cfe0ff', end: '#ffe7a3' };
    }
    var c = getComputedStyle(b).color || 'rgb(30,63,192)';
    return { line: c, star: c, end: dark ? '#ffe7a3' : '#8a6a1f' };
  }

  function apply(b) {
    var L = b.__bsLayers;
    if (!L) return;
    var i = b.__bsState || 0;
    b.style.backgroundImage = L[i] + (b.classList.contains('btn--solid') ? ', ' + GRAD : '');
  }

  function setState(b, i) {
    b.__bsState = i;
    apply(b);
  }

  function paint(b) {
    var W = b.clientWidth, H = b.clientHeight;
    if (!W || !H) return false;
    if (b.__bsId == null) b.__bsId = Math.floor(Math.random() * POOL.length);
    var c = POOL[b.__bsId];
    /* 字形那一格用 Range 实测（各行 line-height / padding 不同，不能假设居中） */
    var fs = parseFloat(getComputedStyle(b).fontSize) || 14;
    var gt = (H - fs) / 2, gb = gt + fs;
    var tn = null;
    for (var i = 0; i < b.childNodes.length; i++) {
      if (b.childNodes[i].nodeType === 3 && b.childNodes[i].textContent.trim()) { tn = b.childNodes[i]; break; }
    }
    if (tn) {
      var rg = document.createRange(); rg.selectNodeContents(tn);
      var tr = rg.getBoundingClientRect(), br = b.getBoundingClientRect();
      var t0 = tr.top - br.top + (tr.height - fs) / 2;
      gt = t0; gb = t0 + fs;
    }
    var topY = Math.max(3, gt - 4), botY = Math.min(H - 3, gb + 4);
    var pts = c.p.map(function (q) { return [X(q[0]) / 100 * W, q[1] < 18 ? topY : botY]; });
    var col = colors(b);
    b.__bsLayers = [
      svgURL(W, H, pts, c.e, 1, col.star, col.end, col.line, .6),
      svgURL(W, H, pts, c.e, 2, col.star, col.end, col.line, .78),
      svgURL(W, H, pts, c.e, c.e.length, col.star, col.end, col.line, .92),
    ];
    b.__bs = { id: b.__bsId, w: W, h: H, pts: pts, edges: c.e.length };
    apply(b);
    return true;
  }

  function bind(b) {
    if (b.__bsBound) return;
    b.__bsBound = 1;
    b.addEventListener('pointerenter', function () { setState(b, 1); });
    b.addEventListener('pointerleave', function () { setState(b, 0); });
    b.addEventListener('pointerdown', function () { setState(b, 2); });
    b.addEventListener('pointerup', function () { setState(b, b.matches(':hover') ? 1 : 0); });
    b.addEventListener('pointercancel', function () { setState(b, 0); });
    b.addEventListener('focus', function () { setState(b, 1); });
    b.addEventListener('blur', function () { setState(b, 0); });
  }

  function decorate(b) {
    if (!b || b.__bs) return;
    if (paint(b)) bind(b);
    else requestAnimationFrame(function () { if (paint(b)) bind(b); });
  }

  function sweep(root) {
    var list = (root || document).querySelectorAll('.btn');
    for (var i = 0; i < list.length; i++) {
      if (list[i].__bs) paint(list[i]);
      else decorate(list[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { sweep(); });
  } else {
    sweep();
  }

  if (window.MutationObserver && document.body) {
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var added = ms[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.classList && n.classList.contains('btn')) decorate(n);
          if (n.querySelectorAll) sweep(n);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* 主题切换：颜色烘进了 data URI，重画一遍（只改内联背景，安全） */
  new MutationObserver(function () { sweep(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { sweep(); });
  }
  window.addEventListener('resize', function () {
    clearTimeout(window.__bsT);
    window.__bsT = setTimeout(function () { sweep(); }, 150);
  });

  window.__STARBTN = { POOL: POOL, sweep: sweep, decorate: decorate, paint: paint };
})();
