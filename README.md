# 星海社 · HOSHIKAI

> 一个以「天文台 × galgame」为母题的中文 galgame 论坛前端。
> 纯 HTML / CSS / JavaScript，无框架、无构建、无依赖安装。

**在线浏览**：<https://yono-sigtuna.github.io/HOSHIKAI/>

![星海社封面母题 · 轨道环](https://yono-sigtuna.github.io/HOSHIKAI/covers/atlas-0-0.svg)

---

## 这是什么

星海社是一个虚构的 galgame 同好论坛，站内把「发帖、找资源、聊作品、写同人」做成了一套天文观测的视觉语言：

- 帖子热度叫 **星等**——越小越亮，星形图标的尺寸、辉光、饱和度都跟着变；
- 板块顶部有一条按网格列中心对齐的 **结构性轨道**，编号徽章就是轨道原点；
- 鼠标悬停星等徽章会弹出该帖近 24 小时的 **光变曲线**；
- 首页用 Bento 拼贴 + 星座连线呈现板块、热帖与最新回复。

本仓库是站点 **v2p「星座网格」** 的静态发布版，包含 16 个可交互页面：

| 页面 | 本地文件 | 干净 URL |
|---|---|---|
| 首页·星座网格 | [`index.html`](index.html) | `/` |
| 板块浏览 | [`board.html`](board.html) | `/forum/1-1/` |
| 帖子详情 | [`topic.html`](topic.html) | `/topic/t11012f25/` |
| 站内搜索 | [`search.html`](search.html) | `/search/` |
| 标签归档 | [`tag.html`](tag.html) | `/tag/` |
| 个人空间 | [`space.html`](space.html) | `/space/1/` |
| 消息 · 通知 | [`msg.html`](msg.html) | `/msg/` |
| 发新帖 | [`compose.html`](compose.html) | `/compose/` |
| 登录 | [`login.html`](login.html) | `/login/` |
| 注册 | [`register.html`](register.html) | `/register/` |
| 观测者校准台（设置） | [`settings.html`](settings.html) | `/settings/` |
| 站点地图 | [`sitemap.html`](sitemap.html) | `/sitemap/` |
| 观测调度台（管理端） | [`admin.html`](admin.html) | `/admin/` |
| 版规总则 | [`rules.html`](rules.html) | `/rules/` |
| 友情链接 | [`links.html`](links.html) | `/links/` |
| 联系我们 | [`contact.html`](contact.html) | `/contact/` |

另有一张 [`404.html`](404.html)，在 GitHub Pages 上负责把干净 URL 翻译回对应的 `.html?参数`。

## 功能一览

- **首页**：公告细条、OP 开场区、最近更新、三栏推送、热门 TAG、两个板块两种拼法、今夜推荐、星座连线最新回复流。
- **板块页**：子板块标签、封面轮播、帖子列表、分页、热度星等、近 24 小时光变曲线。
- **帖子页**：楼层、评分块、信息大板块、标签、相关推荐、举报入口。
- **搜索**：标题 / 作者 / 标签多维检索，左栏缩略图，结果分页。
- **标签归档**：201 个标签按帖子数排序，可翻页。
- **个人空间**：资料、收藏、发帖、回复、推荐合集、星等环。
- **消息 / 私信**：收件箱、通知、私信浮窗（HUD 文本框模块打开）。
- **发新帖**：板块选择、标签自由输入、正文工具浮窗、草稿。
- **观测者校准台**：主题、显示密度、动效偏好等本地设置。
- **观测调度台**：举报队列、处置、日志、计数（前端演示，处置动作真实写本地状态）。
- **全站**：亮 / 暗两套主题、暮色过渡、星空背景、底部 HUD、星位导航、响应式断点（1120 / 900 / 640）、`prefers-reduced-motion` 降级。

## 技术栈

```
HTML + CSS + 原生 JS        无框架、无 TS、无构建、无 npm
```

- **整页由 JS 渲染**：HTML 只保留骨架与空容器，数据与模板字符串在 `app.js` / `board.js` / `topic.js` 等文件里。禁用 JS 时页面只剩壳。
- **共享数据**：[`shared/data.js`](shared/data.js)、[`shared/threads.js`](shared/threads.js)、[`shared/topic.js`](shared/topic.js) 是全站唯一的数据源与工具函数。
- **数据是前端模拟**：论坛帖子、用户、回复、光变曲线均由确定性伪随机生成，没有后端、没有数据库。
- **登录是演示态**：只把昵称写进 `localStorage['hoshikai:session']`，不保存账号、不能切换账号；注册页会明确说明这一点。
- **字体**：Google Fonts 的 `@font-face` 索引已本地化为 [`fonts/fonts.css`](fonts/fonts.css)（1.1 MB），woff2 字体本体仍从 `fonts.gstatic.com` 按 `unicode-range` 按需加载。
- **封面**：[`covers/`](covers/) 里是 38 张程序化 SVG 占位封面（同心环 / 金十字 / 星点母题），换真图时同名覆盖即可。
- **背景**：[`bgs/`](bgs/) 里是 7 张 AVIF 氛围图，由 CSS 分层轮播。

## 目录结构

```
.
├── index.html            首页骨架
├── board.html           板块页骨架
├── topic.html           帖子页骨架
├── …                    其余 13 个页面
├── 404.html             GitHub Pages 的干净 URL 兜底
├── style.css            首页与全站基础样式（设计令牌 / 亮暗主题）
├── forum.css            板块页 + 帖子页共用样式
├── topic.css            帖子页专属样式
├── app.js               首页渲染
├── board.js             板块页渲染
├── topic.js             帖子页渲染
├── hud.js               底部 HUD、星位导航、音乐播放器、私信浮窗
├── viewer.js            观测窗 / 看图窗
├── shared/              全站共享数据与工具
│   ├── data.js
│   ├── threads.js
│   └── topic.js
├── covers/              38 张程序化 SVG 封面
├── bgs/                 7 张 AVIF 背景
├── fonts/fonts.css      本地化字体索引
├── op/                  开场动画占位目录（放 opening.mp4 即生效）
└── tools/
    ├── build_site.py    从 phpstudy 源目录同步站点
    └── serve.py         本地预览服务器（模拟 Pages 的 404 兜底）
```

## 本地运行

需要 Python 3：

```bash
python tools/serve.py
```

打开 <http://127.0.0.1:8722/>。

> 不要直接双击 `index.html` 用 `file://` 打开：干净 URL、相对路径和部分浏览器安全策略都会失效。用上面的本地服务器。

## 部署到 GitHub Pages

本仓库直接以 `main` 分支根目录发布，没有构建步骤：

1. Settings → Pages → **Build and deployment** → Source 选 **Deploy from a branch**；
2. Branch 选 `main`、目录选 `/ (root)`，保存；
3. 站点地址为 <https://yono-sigtuna.github.io/HOSHIKAI/>。

两处部署适配：

- **相对路径**：源站里所有 `/v2p/...`、`/shared/...` 已在同步时改成 `./...`，所以仓库可以挂在 `/<repo>/` 子路径下，也方便换仓库名。
- **干净 URL**：GitHub Pages 不支持 Apache 的 `RewriteRule`，仓库根目录的 `404.html` 会用与 `v2p/.htaccess` 相同的规则做前端跳转，例如
  `/forum/1-1/2/ → board.html?b=1-1&p=2`、
  `/topic/t11012f25/ → topic.html?t=t11012f25`、
  `/space/1/works/2/ → space.html?u=1&s=works&p=2`。
  这类地址在 DevTools 里会先看到一条 404（这是 Pages 的正常行为），随后立即跳到正确的 HTML。
- `.nojekyll` 已存在，避免 Jekyll 处理静态资源。

> GitHub Pages 给的是 `<账号>.github.io/<仓库>/` 项目地址，不是可自定义的二级域名。如果以后要 `hoshikai.example.com` 这样的独立域名，需要自己持有域名并在 Pages 里配置 Custom domain。

## 从源站更新

站点源目录是 phpstudy 下的 `WWW/ai`（`v2p` 为选定方向）。同步脚本只复制 `v2p/` 与 `shared/`，不会带上 `_probes`、`_archive` 或动辄几百 KB 的 `project.md` / `memories.md`：

```bash
python tools/build_site.py
```

如果源目录不在默认位置：

```bash
HOSHIKAI_SRC="D:/path/to/WWW/ai" python tools/build_site.py
```

脚本会复制 111 个文件、改写 633 处路径、写入 `.nojekyll`，并在结束时检查有没有残留的 `/v2p/` 或 `/shared/` 绝对路径。

## 已知限制

- **没有后端**：注册不保存账号，发帖只进浏览器本地状态，私信与举报是演示流程，管理端处置只改本地数据。
- **光变曲线是模拟数据**：`lightCurve()` 用「标题 + 作者」作种子确定性生成，接真实统计时只换这一个函数。
- **OP 视频 / 音乐文件未附带**：`op/` 目前是空目录，首页与帖子页会显示程序化海报与「放文件即生效」提示；站内也没有音频文件，播放器处于空态。
- **图片是占位**：`covers/` 是程序化 SVG，`bgs/` 是氛围图；没有人物立绘。
- **封面请求有兜底**：首页精选带与封面轮播会请求 `covers/<board>-<子板块>-3/4.svg`，个别生成帖的下标为 `undefined`；这些文件不存在时由 `.thumb` 的渐变兜底，不影响布局（源站同样存在，DevTools 里会看到 404）。
- **外部链接**：推荐作品指向 VNDB、Galbase、BGM 等外部站点，需要网络。

## 设计文档

完整的设计规范、组件清单、踩坑记录与协作决策保留在源目录的 `project.md` / `memories.md` 中（未随站点发布）。本 README 只描述「仓库里有什么、怎么跑起来」。

---

星海社 · HOSHIKAI ——「然后——是这片星空。」
