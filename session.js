/* 星海社 · 登录态（演示）
   三页共用一份，做法与 hud.js 相同：**注入式、不写进三个 HTML** —— 三份各抄一份会
   有三处不同步的风险，而这段每页都一样。

   ⚠️ 这里**没有账号体系**：只有一个会话，存在 `localStorage['hoshikai:session']`，
   不存账号表、不能切换账号。这是用户在第十八轮明确选的「单一演示账号」——
   他宁可让注册页诚实地说「演示站不保存账号」，也不要一套假的注册流程。
   所以：`login()` 只是把「你是谁」记在本机，刷新后顶栏还认得你；仅此而已。

   顶栏要换掉的那两枚在 `.tools` 里（index/board/topic 三页写的是
   `<a class="btn btn--ghost">登录</a><a class="btn btn--solid">注册</a>`）。
   退出登录**不做二次确认**：它没有任何破坏性，点错了再登一次即可。

   依赖：无（自己带 esc / hueOf，与三页各自的 helper 同一套写法）。 */
(function session() {
  const KEY = 'hoshikai:session';
  const root = document.documentElement;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* 作者名 → 稳定色相。与 app.js:54 / board.js:36 / topic.js:36 逐字相同 ——
     站里给你头像上色的就是这一个哈希，登录后顶栏头像必须和别处同色，所以照抄不另发明。 */
  const hueOf = (s) => [...s].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);

  const MAX_NAME = 16;

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return o && typeof o.name === 'string' && o.name ? o : null;
    } catch { return null; }
  }

  function save(v) {
    try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* 隐私模式下写不进，忽略 */ }
  }

  /* 会话一变就广播，让同页里的其它部分（比如登录页右侧的结果态）跟上。 */
  function announce() {
    try { window.dispatchEvent(new CustomEvent('hksession', { detail: read() })); } catch { /* 老浏览器没有 CustomEvent，忽略 */ }
  }

  function login(name) {
    const n = String(name == null ? '' : name).trim().slice(0, MAX_NAME) || '访客';
    const v = { name: n, demo: true, at: Date.now() };
    save(v);
    render();
    announce();
    return v;
  }

  function logout() {
    save(null);
    render();
    announce();
  }

  /* 顶栏右侧：未登录 = 两枚按钮；已登录 = 头像 + 星名 + 退出。
     两枚按钮的 href 在 HTML 里也写对了（login.html / register.html），
     所以**关掉 JS 也能走**；这里只负责「已登录」那一半。 */
  function render() {
    const tools = document.querySelector('.topbar .tools');
    if (!tools) return;
    const me = read();
    const host = tools.querySelector('.who') || tools.querySelector('.tools__auth');
    const auth = host && host.classList.contains('tools__auth') ? host : null;

    if (!auth) {
      /* 第一次跑：把原来的两枚按钮包进一个容器，之后只换容器的内容。 */
      const a = [...tools.querySelectorAll('a.btn')].filter((el) => /登录|注册/.test(el.textContent));
      if (!a.length) return;
      const box = document.createElement('span');
      box.className = 'tools__auth';
      a[0].before(box);
      a.forEach((el) => box.append(el));
      return render();
    }

    if (!me) {
      if (auth.dataset.state === 'out') return;
      auth.dataset.state = 'out';
      auth.innerHTML =
        `<a class="btn btn--ghost" href="./login.html">登录</a>`
        + `<a class="btn btn--solid" href="./register.html">注册</a>`;
      return;
    }

    if (auth.dataset.state === 'in' && auth.dataset.who === me.name) return;
    auth.dataset.state = 'in';
    auth.dataset.who = me.name;
    auth.innerHTML =
      `<span class="who__me">`
      + `<span class="av" style="--ah:${hueOf(me.name)}" aria-hidden="true">${esc([...me.name][0])}</span>`
      + `<b>${esc(me.name)}</b>`
      + `</span>`
      + `<a class="who__set" href="./settings/">设置</a>`
      + `<button class="btn who__out" type="button">退出</button>`;
  }

  /* 退出按钮是**替换出来的**，所以委托挂在稳定的 .tools 上，不挂在按钮自己身上
     （memories 2.114：搬 DOM 之前先搜绑在它祖先上的选择器；反过来也一样，别绑在会被换掉的节点上）。 */
  document.addEventListener('click', (e) => {
    if (e.target.closest('.who__out')) { e.preventDefault(); logout(); }
  });

  /* 别的标签页登入/登出时跟上。 */
  window.addEventListener('storage', (e) => { if (!e.key || e.key === KEY) render(); });

  window.HK = window.HK || {};
  window.HK.session = { get: read, login, logout, hueOf, key: KEY, maxName: MAX_NAME };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
