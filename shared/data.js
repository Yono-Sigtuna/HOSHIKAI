/* 星海社 · 共享模拟数据
   三个版式共用这份数据，保证对比时只有「设计」变量，没有「内容」变量。 */

const FORUM = {
  name: '星海社',
  nameEn: 'HOSHIKAI',
  tagline: '在无数条时间线里，只挑选与你相遇的那一条',
  logDate: '2026.09.24',
  stats: {
    members: 28417,
    threads: 139402,
    todayPosts: 1286,
    online: 342,
  },
  announcement: {
    title: '秋季天象观测活动 · 流星雨同好征集中',
    body: '10 月 21 日猎户座流星雨极大，站内发起通宵观星与共读企划，参与即得限定徽章。',
    tag: '天象预报',
  },
  banners: [
    { title: '《夏空の向こう側》汉化补丁 v1.2 发布', sub: '译星工房 · 已校对三条线路', hue: 218 },
    { title: '年度最佳剧情票选 · 提名阶段开启', sub: '星轨研讨室 · 已有 1,204 人参与', hue: 268 },
    { title: '同人画集《星屑抄》征稿中', sub: '陨石画室 · 截稿 10.31', hue: 196 },
  ],
  recommend: [
    { title: '星霜叙事诗', sub: 'ADV · 全年龄', seed: 11, score: 9.4 },
    { title: '海辺の手紙', sub: 'ADV · 青春', seed: 27, score: 9.1 },
    { title: '雨上がりの栞', sub: 'AVG · 悬疑', seed: 43, score: 8.9 },
    { title: '銀河鉄道の夜に', sub: 'ADV · 文艺', seed: 61, score: 8.7 },
    { title: '四月の嘘つき', sub: 'ADV · 治愈', seed: 78, score: 8.5 },
  ],
  /* 最新回复流：用于「星座连线」创新模块 */
  latestReplies: [
    { board: 0, section: 0, title: '《星霜叙事诗》全线通关，聊聊那个被删掉的结局', author: '夜狩', minutes: 2 },
    { board: 0, section: 1, title: '求《夏空の向こう側》原版镜像 + 全CG', author: 'みなも', minutes: 8 },
    { board: 1, section: 0, title: '画了星霜的女主，试试新的上色流程', author: '薄明', minutes: 14 },
    { board: 2, section: 0, title: '今天也是没有gal玩的一天', author: '睡不着的猫', minutes: 21 },
    { board: 0, section: 3, title: '卡在第三周目分歧点，求不剧透提示', author: 'Rin', minutes: 26 },
    { board: 1, section: 2, title: '《星屑抄》短篇：写给十年后的你', author: '纸月', minutes: 33 },
    { board: 0, section: 2, title: '汉化进度周报 · 第 14 周', author: '译星组', minutes: 41 },
    { board: 2, section: 1, title: '新人报到，请多指教！', author: '初雪', minutes: 47 },
    { board: 1, section: 3, title: '自制短篇gal《回声》第一版demo', author: 'anonymous', minutes: 55 },
    { board: 2, section: 3, title: '关于资源区版规修订的公示（10.01 生效）', author: '理事会', minutes: 62 },
    { board: 0, section: 1, title: '整理了一份 2015-2020 冷门良作清单', author: '旧书', minutes: 74 },
    { board: 2, section: 2, title: 'Win11 下老gal字体乱码怎么解决？', author: '灰鸦', minutes: 88 },
  ],
  /* 三大板块 × 四子板块
     title = 文艺主标题，subtitle = 直白副标题 */
  boards: [
    {
      id: 'atlas',
      title: '星图馆',
      subtitle: 'GAL 作品 · 资源 · 汉化 · 攻略',
      quote: '然后——是这片星空。我所拥有的就是这些。',
      hue: 218,
      sections: [
        {
          title: '星轨研讨室', subtitle: '作品讨论',
          threads: [
            { title: '《星霜叙事诗》全线通关，聊聊那个被删掉的结局', author: '夜狩', time: '12 分钟前', replies: 86, views: 2410, hot: true },
            { title: '聊聊那些「开局即巅峰」的序章设计', author: '浅葱', time: '1 小时前', replies: 43, views: 1180 },
            { title: '你们会因为一首主题曲去玩一部gal吗', author: 'ねこ', time: '3 小时前', replies: 61, views: 1520 },
          ],
        },
        {
          title: '星尘仓库', subtitle: '资源下载',
          threads: [
            { title: '整理了一份 2015-2020 冷门良作清单（附度盘）', author: '旧书', time: '27 分钟前', replies: 152, views: 5300, hot: true },
            { title: '求《夏空の向こう側》原版镜像 + 全CG', author: 'みなも', time: '2 小时前', replies: 18, views: 640 },
            { title: '老gal在 Win11 的兼容性补丁合集', author: '灰鸦', time: '5 小时前', replies: 97, views: 3120 },
          ],
        },
        {
          title: '译星工房', subtitle: '汉化补丁',
          threads: [
            { title: '汉化进度周报 · 第 14 周', author: '译星组', time: '41 分钟前', replies: 74, views: 2260, hot: true },
            { title: '《雨上がりの栞》体验版汉化已发布', author: '译星组', time: '6 小时前', replies: 39, views: 1410 },
            { title: '关于人名译法的一些讨论（附对照表）', author: '青空', time: '昨天', replies: 55, views: 980 },
          ],
        },
        {
          title: '航路指引', subtitle: '攻略答疑',
          threads: [
            { title: '卡在第三周目分歧点，求不剧透提示', author: 'Rin', time: '26 分钟前', replies: 22, views: 730 },
            { title: '《星霜叙事诗》全结局达成条件速查表', author: '夜狩', time: '4 小时前', replies: 118, views: 4600, hot: true },
            { title: '新手向：galgame 常见专有名词解释', author: '旧书', time: '昨天', replies: 66, views: 2050 },
          ],
        },
      ],
    },
    {
      id: 'atelier',
      title: '创作所',
      subtitle: '同人 · 插画 · 音声 · 文学',
      quote: '纵使时间抹杀了太多想要保留的初体验。',
      hue: 268,
      sections: [
        {
          title: '陨石画室', subtitle: '同人插画',
          threads: [
            { title: '画了星霜的女主，试试新的上色流程', author: '薄明', time: '14 分钟前', replies: 63, views: 1890, hot: true },
            { title: '《星屑抄》同人画集征稿说明', author: '纸月', time: '2 小时前', replies: 41, views: 1330 },
            { title: '练习：一小时速涂挑战（附过程）', author: '薄明', time: '昨天', replies: 29, views: 870 },
          ],
        },
        {
          title: '声波观测站', subtitle: '音声翻唱',
          threads: [
            { title: '翻唱了《银の旋律》，请多指教', author: 'かなえ', time: '35 分钟前', replies: 47, views: 1240 },
            { title: '广播剧企划招募：现缺男主役一名', author: '音监', time: '7 小时前', replies: 33, views: 960 },
            { title: '聊聊gal里那些让人记住的BGM', author: 'ねこ', time: '昨天', replies: 88, views: 2400, hot: true },
          ],
        },
        {
          title: '银河书简', subtitle: '同人文学',
          threads: [
            { title: '《星屑抄》短篇：写给十年后的你', author: '纸月', time: '33 分钟前', replies: 52, views: 1480 },
            { title: '长篇连载《观测者手记》第一卷', author: '旧书', time: '9 小时前', replies: 71, views: 2100, hot: true },
            { title: '关于同人文「不 OOC」的一点心得', author: '青空', time: '前天', replies: 26, views: 790 },
          ],
        },
        {
          title: '自制星体', subtitle: '自制游戏',
          threads: [
            { title: '自制短篇 gal《回声》第一版 demo 发布', author: 'anonymous', time: '55 分钟前', replies: 91, views: 2700, hot: true },
            { title: 'Ren\'Py 写分支的几种写法对比', author: '灰鸦', time: '5 小时前', replies: 44, views: 1560 },
            { title: '自制企划招募美术与剧本（已招满）', author: 'anonymous', time: '前天', replies: 58, views: 1830 },
          ],
        },
      ],
    },
    {
      id: 'observatory',
      title: '观测台',
      subtitle: '水区 · 新人 · 求助 · 站务',
      quote: '今夜视宁度良好，适合远望。',
      hue: 196,
      sections: [
        {
          title: '望星台', subtitle: '综合水区',
          threads: [
            { title: '今天也是没有 gal 玩的一天', author: '睡不着的猫', time: '21 分钟前', replies: 134, views: 3900, hot: true },
            { title: '晒一下你的电脑桌面（gal 壁纸向）', author: 'みなも', time: '3 小时前', replies: 77, views: 2200 },
            { title: '大家的入坑作是哪一部？', author: '初雪', time: '昨天', replies: 205, views: 6100, hot: true },
          ],
        },
        {
          title: '新星报到', subtitle: '新人报到',
          threads: [
            { title: '新人报到，请多指教！', author: '初雪', time: '47 分钟前', replies: 31, views: 620 },
            { title: '报到贴汇总 · 九月（新同学请在此留言）', author: '理事会', time: '2 天前', replies: 148, views: 3400 },
            { title: '潜水三年终于注册了账号', author: '匿名星', time: '前天', replies: 24, views: 510 },
          ],
        },
        {
          title: '求助信号塔', subtitle: '求助答疑',
          threads: [
            { title: 'Win11 下老 gal 字体乱码怎么解决？', author: '灰鸦', time: '88 分钟前', replies: 19, views: 680 },
            { title: '怎么给帖子加折叠内容？（已解决）', author: '初雪', time: '4 小时前', replies: 12, views: 340 },
            { title: '图片上传总是失败，是我的问题吗', author: '匿名星', time: '昨天', replies: 27, views: 880 },
          ],
        },
        {
          title: '星海议事厅', subtitle: '站务公告',
          threads: [
            { title: '关于资源区版规修订的公示（10.01 生效）', author: '理事会', time: '1 小时前', replies: 63, views: 1980, hot: true },
            { title: '站内搜索功能升级公告', author: '理事会', time: '昨天', replies: 35, views: 1240 },
            { title: '版主招募 · 陨石画室 / 银河书简', author: '理事会', time: '3 天前', replies: 41, views: 1520 },
          ],
        },
      ],
    },
  ],
};

/* —— 天文创新 · 星等（Stellar Magnitude）热度系统 ——
   天文学里星等越小越亮。这里把「回复×3 + 浏览/25」当光通量，反推星等，
   让「热门帖」在视觉上真的更亮。
   标定：冷帖(回复12/浏览340) ≈ 5.5 等，爆帖(回复205/浏览6100) ≈ 0.8 等。
   返回 0.6 ~ 6.5 之间的星等，保留一位小数。 */
function magnitude(replies, views) {
  const flux = replies * 3 + views / 25;
  const m = 11.93 - 3.79 * Math.log10(Math.max(1, flux));
  return Math.round(Math.max(0.6, Math.min(6.5, m)) * 10) / 10;
}

/* 星等 → 发光强度 0~1：1.2 等的热帖接近 0.9，5.5 等的冷帖约 0.17 */
function magnitudeGlow(m) {
  return Math.round(Math.max(0, Math.min(1, (6.5 - m) / 5.9)) * 100) / 100;
}

/* 全站 12 个子板块的扁平索引，方便「星座连线」「侧栏罗盘」等模块使用 */
function flatSections() {
  const out = [];
  FORUM.boards.forEach((b, bi) => {
    b.sections.forEach((s, si) => {
      out.push({ ...s, boardIndex: bi, sectionIndex: si, boardId: b.id, boardTitle: b.title, boardHue: b.hue, key: `${bi}-${si}` });
    });
  });
  return out;
}

/* 程序化「封面」：没有图片资源，用 hue + 种子生成深色渐变，供缩略图占位。
   刻意收在邻近色区间（不跳到补色），才像 galgame 封面而不是彩虹条。 */
function coverGradient(seed, hue) {
  const h1 = hue + (seed * 13) % 34 - 17;
  const h2 = hue + 26 + (seed * 7) % 22;
  const l1 = 38 + (seed % 5) * 3;
  return `linear-gradient(150deg, hsl(${h1} 52% ${l1}%), hsl(${h2} 58% 22%))`;
}

/* —— 天文创新 · 光变曲线（Light Curve）——
   变星的「亮度-时间」曲线。这里为每条帖合成一条近 24 小时的活动强度序列，
   把静态的星等数字展开成一段可读的历史。

   ⚠️ 这是模拟数据，不是真实统计。真实接入时这里是唯一要换的地方：
      把本函数换成从后端取的「每帖分时活动强度」（长度 hours 的 0~1 数组）即可，
      调用方（卡片头部星等的弹层）一行都不用改。 */
function lightCurve(seed, replies, hours = 24) {
  // 稳定哈希：同一个 seed 每次得到同一条曲线，重渲染不会「跳」
  const hash = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const base = 0.05 + hash(seed * 1.7 + 3) * 0.10;          // 背景底噪
  const peak = hash(seed * 2.3 + 11);                       // 峰值出现在一天的哪个位置
  const width = 0.09 + hash(seed * 3.1 + 29) * 0.16;        // 峰的宽窄
  const amp = Math.min(1, 0.36 + Math.log10(1 + replies) * 0.28);  // 回帖越多，振幅越大
  const phase = hash(seed + 7) * 6.28;
  const freq = 2 + hash(seed + 5) * 3;
  const out = [];
  for (let h = 0; h < hours; h++) {
    const t = h / (hours - 1);
    const bump = Math.exp(-Math.pow((t - peak) / width, 2));
    const ripple = 0.13 * Math.sin(t * Math.PI * freq + phase);
    const noise = (hash(seed * 9.7 + h * 13.3) - 0.5) * 0.12;
    out.push(Math.round(Math.max(0.02, Math.min(1, base + amp * bump + ripple + noise)) * 1000) / 1000);
  }
  return out;
}
