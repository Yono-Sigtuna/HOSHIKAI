/* 星海社 · 三页公共文书脚本（版规 / 友链 / 联系）
   ==================================================================
   只做三件事：格子条抬头、版规的章节目录 + 滚动高亮、联系页的发信演示。
   没有目录、没有表单的页面自动跳过，所以三页共用一个文件。 */
(function docs() {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ══════════ 格子条（与站点地图 / 管理端同一套） ══════════ */
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

  const h1 = $('.doc-h1');
  const fsHost = $('#docFs');
  if (h1 && fsHost) {
    fsHost.innerHTML = filmstrip(h1.getAttribute('aria-label') || document.title.split(' · ')[0]);
    const draw = () => h1.classList.add('is-drawn');
    requestAnimationFrame(draw);
    setTimeout(draw, 200);
  }

  /* ══════════ 版规：章节目录 + 滚动高亮 ══════════ */
  const chs = $$('.rules__ch');
  const toc = $('#rulesToc');
  if (chs.length && toc) {
    toc.innerHTML = chs.map((s, i) => {
      const h = $('.rules__ch-h', s);
      if (!h) return '';
      const no = ($('.rules__ch-n', h) || {}).textContent || String(i + 1).padStart(2, '0');
      const title = h.textContent.replace(/^\s*\d+\s*/, '').trim();
      const n = s.querySelectorAll('.rule').length;
      return '<li class="rules__toc-i"><a href="#' + s.id + '">'
        + '<span class="rules__toc-n">' + esc(no.trim()) + '</span>'
        + '<span class="rules__toc-t">' + esc(title) + '</span>'
        + '<i>' + n + '</i></a></li>';
    }).join('');

    /* 滚动高亮：以「章节标题进入视口上部 30%」为准，不做逐像素的进度条 */
    const links = $$('#rulesToc a');
    const setCurrent = (id) => links.forEach((a) =>
      a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id)));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setCurrent(e.target.id); });
      }, { rootMargin: '-84px 0px -68% 0px', threshold: 0 });
      chs.forEach((s) => io.observe(s));
      window.__DOCS_IO = io;
    }
    setCurrent(chs[0].id);
  }

  /* ══════════ 联系：发信演示 ══════════ */
  let toastT = 0;
  function toast(msg) {
    const el = $('#docToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('is-on'), 2800);
  }
  const form = $('#ctForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = $('#ctTitle').value.trim();
      const body = $('#ctBody').value.trim();
      if (!title) { toast('标题不能为空。'); $('#ctTitle').focus(); return; }
      if (!body) { toast('正文不能为空。'); $('#ctBody').focus(); return; }
      toast('演示站：这封信没有寄出。正式上线后接入站务邮箱。');
      form.reset();
      $('#ctTitle').focus();
    });
  }

  /* ══════════ 探针钩子 ══════════ */
  const page = $('.rules') ? 'rules' : $('.links') ? 'links' : $('.contact') ? 'contact' : 'doc';
  window.__DOCS = {
    page: page,
    sections: chs.length,
    tocItems: toc ? toc.children.length : 0,
    toast: toast,
  };
})();
