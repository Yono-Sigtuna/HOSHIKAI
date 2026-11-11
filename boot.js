/* 开屏 · 星盘校准
   中文 webfont 被切成上千个 unicode-range 子集，会随页面用字**逐批到货、逐批换字**。
   首帧先盖一块全屏遮罩，等字体流真的停下来再淡出 —— 用户永远看不到换字。

   ⚠️ 三个不可靠的判据（都实测过）：
      · `document.fonts.ready` —— 样式刚生效、还没启动任何下载时就立刻 resolve；
      · 轮询「已加载字面数连续不变」—— 下载还没开始、计数一样是稳的（假静默）；
      · 拿整页文字 `document.fonts.load()` 全量预载 —— 会把 600+ 个子集全拉一遍，实测 40s。
   ⇒ 做法：CSS 到手 → 先用少量常用字「踹一脚」让下载真的开始 →
     再轮询「已完成的字体请求数 + 已加载字面数」，**连续 2.4s 都没变化**才算静默。
   ⚠️ 兜底两道：本脚本 12s 硬上限；CSS 里还有一条 14s 的 bootFailsafe 动画 —— 脚本挂了也不锁站。 */
(function boot() {
  const el = document.getElementById('boot');
  if (!el) return;
  const html = document.documentElement;

  /* 同一标签页第二次进站：不盖、不锁、不放动画 —— 元素直接摘掉。
     HTML 里那段 inline 判断已经在**首帧之前**给 <html> 加了 .boot-skip 把遮罩 display:none，
     所以这里不会看到一帧闪回。 */
  let warmEarly = false;
  try { warmEarly = localStorage.getItem('hoshikai:boot') === '1'; } catch (e) { /* 隐私模式忽略 */ }
  if (warmEarly) { el.remove(); return; }

  html.classList.add('boot-lock');

  const MIN = 250;
  const QUIET = 12;      // 12 × 200ms = 2.4s 没有新东西到货 = 静默
  const MAX = 12000;

  let done = false;
  const reveal = () => {
    if (done) return;
    done = true;
    window.__bootAt = Math.round(performance.now());   // 探针用：这次开屏实际撤掉的时间
    try { localStorage.setItem('hoshikai:boot', '1'); } catch (e) { /* 隐私模式忽略 */ }
    el.classList.add('is-done');
    html.classList.remove('boot-lock');
    setTimeout(() => el.remove(), 800);
  };
  const started = performance.now();
  setTimeout(reveal, MAX);   // 硬上限

  const link = document.getElementById('fontCss');
  const cssReady = new Promise((res) => {
    if (!link || link.sheet) return res();
    link.addEventListener('load', () => res(), { once: true });
    link.addEventListener('error', () => res(), { once: true });
  });

  const FACES = [
    '400 16px "Noto Sans SC"', '700 16px "Noto Sans SC"',
    '400 16px "Noto Serif JP"', '700 16px "Noto Serif JP"',
    '400 16px "ZCOOL KuaiLe"',
    '400 16px "Zen Maru Gothic"',
  ];
  const reqCount = () => performance.getEntriesByType('resource').filter((r) => /gstatic\.com/.test(r.name)).length;
  const faceCount = () => (document.fonts ? [...document.fonts].filter((f) => f.status === 'loaded').length : 0);

  cssReady.then(() => {
    if (!document.fonts || !document.fonts.load) return reveal();
    // 踹一脚：只拉少量常用字，目的是让下载真的开始（否则「没有变化」是假静默）
    Promise.all(FACES.map((f) => document.fonts.load(f, '星海社观测站点地图').catch(() => null)))
      .then(() => {
        let last = '', quiet = 0;
        const tick = () => {
          if (done) return;
          const sig = reqCount() + '/' + faceCount();
          if (sig === last) quiet++; else { quiet = 0; last = sig; }
          const elapsed = performance.now() - started;
          if ((quiet >= QUIET && elapsed >= MIN) || elapsed >= MAX) reveal();
          else setTimeout(tick, 200);
        };
        tick();
      });
  });
})();
