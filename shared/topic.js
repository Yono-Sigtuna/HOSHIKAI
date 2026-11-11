/* 星海社 · 帖子详情页专用数据
   与 data.js（首页三条真帖）、threads.js（板块页帖池）分开：那两份各版式共用、不能动，
   这一份只补「帖内页比列表页多出来的东西」—— 作品信息 / 正文 / 截图 / 下载说明 / 回复。

   硬要求：确定性。同一个 tid 每次生成的内容必须逐字一样（刷新、换页、换主题都不得变），
   所以全程只用一个「字符串种子的 mulberry32」，不碰 Math.random / Date。 */

/* ---------- 工具 ---------- */

/* 字符串 → 32 位种子（FNV-1a，与 threads.js 的 threadId 同一套散列） */
function tidSeed(s) {
  let h = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32：小、快、可复现。各页不共享 JS 工具，所以这里自带一份。 */
function topicRng(seed) {
  let a = (Math.imul(seed ^ 0x9e3779b9, 2654435761) ^ 0x85ebca6b) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 6; i++) next();   // 预热：甩掉种子的线性痕迹
  return next;
}

const tpPick = (rnd, arr) => arr[Math.min(arr.length - 1, Math.floor(rnd() * arr.length))];
const tpInt = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

/* ---------- 按 tid 反查帖子 ----------
   两个入口，都确定性：
     1) 精确匹配 —— 与 12 个子板块的帖池（boardThreads）逐条比对 tid
     2) 纯数字兜底 —— 拿不到精确匹配时，把数字当作「全站第 N 帖」映射进同一个池子。
        这样 ./topic/698/ 这类数字地址也能打开一篇真帖，而不是掉进空态；
        非数字且匹配不到的（如 abc）仍旧返回 null → 由页面渲染空态。 */
const TP_TOTAL_POOL = THREAD_POOL_SIZE;
let tpIndexCache = null;

function tpIndex() {
  if (tpIndexCache) return tpIndexCache;
  tpIndexCache = [];
  for (let bi = 0; bi < FORUM.boards.length; bi++) {
    const board = FORUM.boards[bi];
    for (let si = 0; si < board.sections.length; si++) {
      const section = board.sections[si];
      boardThreads(bi, si, TP_TOTAL_POOL).forEach((t, i) => {
        tpIndexCache.push({
          t, bi, si, i,
          board, section,
          boardTitle: board.title,
          sectionTitle: section.title,
          hue: board.hue,
          quote: board.quote,
          threadNo: tpIndexCache.length + 1,      // 全站序号，第 1 帖 = 1
        });
      });
    }
  }
  return tpIndexCache;
}

function findTopic(key) {
  const k = String(key == null ? '' : key).trim();
  if (!k) return null;
  const all = tpIndex();
  const exact = all.find((e) => e.t.tid === k);
  if (exact) return exact;
  if (/^\d+$/.test(k)) {
    const n = parseInt(k, 10);
    if (n >= 1) return all[(n - 1) % all.length];
  }
  return null;
}

/* ---------- 文案池 ---------- */

/* 作品：原名 / 中文名 / 会社 / 参考时长。同名作品会被帖标题里的《…》优先命中，
   所以「《星霜叙事诗》…」这类帖子打开后，作品信息与标题是自洽的。 */
const TP_WORKS = [
  { jp: '星霜叙事詩', cn: '星霜叙事诗', maker: 'Aster Works', hours: 32 },
  { jp: '夏空の向こう側', cn: '夏空彼端', maker: 'みなももソフト', hours: 26 },
  { jp: '雨上がりの栞', cn: '雨后的书签', maker: 'Orbit Note', hours: 21 },
  { jp: '銀の旋律', cn: '银之旋律', maker: 'Stellaris', hours: 18 },
  { jp: '観測者手記', cn: '观测者手记', maker: '天穹社', hours: 24 },
  { jp: '海辺の手紙', cn: '海边的信', maker: '灯塔计划', hours: 15 },
  { jp: '四月の嘘つき', cn: '四月的谎言', maker: 'Aster Works', hours: 28 },
  { jp: '銀河鉄道の夜に', cn: '银河铁道之夜', maker: 'Stellaris', hours: 35 },
  { jp: '遠い灯の記憶', cn: '远灯的记忆', maker: 'Orbit Note', hours: 20 },
  { jp: '白夜のコンチェルト', cn: '白夜协奏曲', maker: '天穹社', hours: 23 },
  { jp: '静かな潮の満ちるまで', cn: '直到寂静的潮水漫上', maker: 'みなももソフト', hours: 17 },
  { jp: '影のない街', cn: '无影之城', maker: '灯塔计划', hours: 29 },
  { jp: '夜明けのクロックワーク', cn: '黎明的机械钟', maker: 'Stellaris', hours: 22 },
  { jp: '紙飛行機の行方', cn: '纸飞机的去向', maker: 'Aster Works', hours: 19 },
];

const TP_GENRES = ['ADV', 'AVG', '恋爱', '悬疑', 'SF', '治愈', '青春', '群像剧', '全年龄', '乙女向'];
const TP_PLATFORMS = ['Windows', 'Windows / Switch', 'Windows / PS4 / Switch', 'Windows / Android', 'Windows / Switch / PSV'];
const TP_VOICE = ['全语音（主角除外）', '全语音', '部分语音', '主线全语音'];
const TP_MAKERS = ['Aster Works', 'みなももソフト', 'Orbit Note', 'Stellaris', '天穹社', '灯塔计划'];

const TP_SCRIPT = ['夜狩 たかし', '桐生 みなと', '薄明 かい', '星野 ゆい'];
const TP_ART = ['纸月 あや', '灰鸦 れい', '浅葱 みなも', '白夜 そら'];
const TP_MUSIC = ['音监 かなえ', '雪村 りつ', '长庚 ゆき'];

/* ---------- 正文：开篇 / 主体 / 收尾三段拼接，拼到 200–400 字为止 ---------- */
const TP_INTRO_OPEN = [
  '这是我在这个系列里最想推荐的一部，前前后后通了四遍，还是想把一些话写在这里。',
  '先说结论：如果你只打算在这个季度挑一部作品认真玩，我建议就是它。',
  '这部作品最难得的地方，是它并不急着讨好你，而是安静地把你带进去。',
  '写这篇的起因是站内问的人有点多，索性把常见的问题一并整理在下面。',
];

const TP_INTRO_BODY = [
  '故事发生在一座被长夜包裹的海滨小城，主角在离开七年后重新回到这里，接手家里留下的旧钟表店。',
  '设定里有一条只在深夜开放的旧铁路，据说沿着它一直走下去，就能抵达某段被刻意忘掉的记忆。',
  '序章几乎没有对白，全靠画面与一段钢琴把人按在椅子上，很多人是在这里被留下来的。',
  '人物写得很克制，没有谁是纯粹的工具人，连只出现两幕的配角都有自己的逻辑与难处。',
  '女主角的塑造是全篇最花心思的部分：她的每一次推开与靠近都有前因，不是靠运气推着剧情走。',
  '分歧点的设计称得上干净，选项本身不带明显的导引，但回头复盘时每一条都指向同一个性格底色。',
  '演出上大量使用了留白与长镜头，明明没发生什么，人却已经被情绪浸透了。',
  '配乐由主题旋律变奏出十几个版本，同一段曲子在清晨、雨夜与终章里是完全不同的三种情绪。',
  '系统不复杂，存档槽位给得很大方，跳过已读与回看文本都做得很顺手，适合一口气推完。',
  '中盘有一段近乎实验性的章节，视角被拆成三份并置，第一次看可能会有点绕，二周目才明白为什么。',
  '美术走的是低饱和的冷色路线，人物立绘不算华丽，但背景的每一张都经得起单独截出来看。',
  '它最厉害的地方不在于反转有多惊人，而在于反转之后你回过头，发现所有人的选择都合情合理。',
];

const TP_INTRO_END = [
  '总体来说，这是一部需要一点耐心、但回报相当扎实的作品，推荐给喜欢慢慢读故事的人。',
  '如果你能接受前三小时的缓慢节奏，后面会一路顺畅到收不回来。',
  '以上都是我个人的观感，不同的人读出来的东西大概会差很多，欢迎在楼下补充。',
  '资源与汉化补丁的说明我放在最下面一节，先看完介绍再决定要不要下载也不迟。',
];

/* 正文里那几颗闪烁的星星：GALBase 在正文中用了 gs-star-twinkle，这里沿用同一做法。
   只给句子间隙的位置，星星的最终形态由页面渲染（保持本文件只出纯数据）。 */
function tpIntroStars(rnd, gaps) {
  const n = tpInt(rnd, 3, 5);
  const pos = new Set();
  let guard = 0;
  while (pos.size < n && guard++ < 60) pos.add(tpInt(rnd, 1, Math.max(1, gaps - 1)));
  return [...pos].sort((a, b) => a - b);
}

function tpIntro(rnd) {
  const open = tpPick(rnd, TP_INTRO_OPEN);
  const end = tpPick(rnd, TP_INTRO_END);
  const start = Math.floor(rnd() * TP_INTRO_BODY.length);
  const out = [open];
  let len = open.length;
  for (let k = 0; k < TP_INTRO_BODY.length; k++) {
    const s = TP_INTRO_BODY[(start + k) % TP_INTRO_BODY.length];
    if (len + s.length + end.length > 380) break;      // 留出收尾句的位置
    out.push(s);
    len += s.length;
    if (len >= 215) break;                             // 够 200 字即收
  }
  out.push(end);
  return out;
}

/* ---------- 截图 ---------- */
const TP_SHOT_CAPS = [
  '序章 · 归乡的站台', '日常 · 教室的午后', '中盘 · 天台上的对话',
  '分歧点 · 雨中的选择', '终章 · 星空下的告别', 'EXTRA · 全 CG 一览',
];

/* ---------- 下载 / 汉化说明 ---------- */
const TP_DL_NOTES = [
  '压缩包为自解压格式，不含密码；解压后请把整个目录放到不含中文与空格的路径下，否则部分老引擎会读不到资源。',
  '汉化补丁需要先安装原版再覆盖，覆盖前建议把原目录整个复制一份留底，出问题时可以立刻回退。',
  '本作在 Windows 11 上默认会以兼容模式之外的字体渲染，若出现方框字，装一次站点附件里的思源宋体即可解决。',
  '全部内容都做过校对并实机跑通，但难免会有疏漏，发现问题的同学在楼下留一句，我会尽快补。',
];
const TP_DL_LINKS = [
  { label: '度盘 · 本体 + 全 CG', note: '提取码见二楼' },
  { label: 'MEGA 镜像 · 本体', note: '备用线路' },
  { label: '汉化补丁 v1.3', note: '含校对说明' },
];

/* 楼主自己的楼层用另一套口吻（补档 / 答疑），不然「楼主写得很中肯」这种话会很出戏 */
const TP_OP_REPLY = [
  '补充一句：资源包我已经重新校验过，之前那个解压到一半报错的版本换掉了。',
  '有同学问字体的事，附件里补了一份，装完重启一次就正常了。',
  '更新一下：补丁推到 v1.3，主要修了三处错别字和一段漏翻，已在二楼换链。',
  '截图按章节重新排了一遍，手机端翻起来应该会舒服些。',
  '关于分歧点那段，二楼补了不剧透的提示，卡住的朋友可以先看那里。',
];

/* ---------- 回复 ---------- */
const TP_REPLY_BODY = [
  '感谢整理，正好在犹豫要不要开这部，看完介绍决定今晚就装。',
  '中盘那一段我第一次也看晕了，二周目才反应过来是三个人视角并置，写得太阴了。',
  '配乐确实顶，我到现在还在单曲循环终章那首，可惜原声带一直没再版。',
  '想问一下汉化补丁是覆盖全部线路吗，还是只有主线？',
  '全语音这点好评，配角的声音cast也很认真，没有敷衍的感觉。',
  '我这边用 Win11 装的，没有乱码，可能是之前装过字体包的缘故。',
  '序章那段钢琴我也被留住了，本来只想试玩半小时，结果一口气到天亮。',
  '分歧点的选项设计确实干净，没有那种「一眼就知道哪个是好结局」的廉价感。',
  '低饱和冷色真的耐看，背景建议单独存一份做壁纸。',
  '楼主写得很中肯，不过我个人觉得后两章收得稍快了一点，有点意犹未尽。',
  '已收藏，等手头这两部推完就回来开坑，先谢过楼主。',
  '想确认一下，全 CG 压缩包里包含特典的那几张吗？',
  '这部我通了三条线，确实每条线的女主都写得很立得住。',
  '感谢自解压包，之前下过一个版本解压到一半就报错，这个很顺。',
  '那个实验性的章节我反而最喜欢，第一次看到有人这么玩视角。',
  '稍微补充一句：装完补丁后最好重启一次，不然字体缓存会不生效。',
  '资源已存，谢谢楼主，回头一定回来写感想。',
  '老引擎的通病，路径里带中文就容易崩，放到 D 盘根目录就好了。',
  '三周目才注意到序章背景里那张照片，伏笔埋得真早。',
  '小声说一句，我觉得男主的配音也很出彩，可惜戏份不算多。',
  '刚才试了下，Switch 版和 PC 版的立绘分辨率好像不太一样？',
  '写得很细，尤其是关于留白演出的那一段，说得比我自己想的还清楚。',
  '补丁装完记得看一下版本号，我一开始装的是旧的一版，白折腾了半小时。',
  '感谢分享，这部我找了好久，终于在这里看到了。',
  '终章那段星空下的告别看了三遍，还是没忍住。',
  '请问有人有全结局的存档吗，想直接看隐藏线那一段。',
  '这部的日常写得比大部分同类作品都好，不急不躁的。',
  '刚入坑这个系列，请问先从哪条线开始推比较合适？',
];

/* ---------- 角色 ----------
   姓名写成中文（站内作品是日式 galgame，但站是中文站，角色按中文习惯写），
   另附一行假名读音当副标题 —— 与 VNDB 的角色表同一套字段习惯。
   ⚠️ 名字是**手写死的配对**，不是「姓池 × 名池」随机拼 —— 拼出来会出现
   「白鸟 咲良 / 月夜见 澪」这种把两个角色名字拆散重组的假名字。 */
const TP_CAST = [
  { cn: '白鸟 澪', kana: 'しらとり みお', role: '女主角' },
  { cn: '月夜见 咲良', kana: 'つきよみ さくら', role: '副女主角' },
  { cn: '风见 奏', kana: 'かざみ かなで', role: '主角' },
  { cn: '绫濑 结衣', kana: 'あやせ ゆい', role: '配角' },
  { cn: '常盘 遥', kana: 'ときわ はるか', role: '配角' },
  { cn: '南云 千夏', kana: 'なぐも ちなつ', role: '配角' },
  { cn: '九条 灯里', kana: 'くじょう あかり', role: '反派' },
  { cn: '柊 纺', kana: 'ひいらぎ つむぎ', role: '配角' },
  { cn: '长谷部 透', kana: 'はせべ とおる', role: '配角' },
  { cn: '藤壶 黎', kana: 'ふじつぼ れい', role: '反派' },
  { cn: '相马 雪乃', kana: 'そうま ゆきの', role: '副女主角' },
  { cn: '柊 木叶', kana: 'ひいらぎ このは', role: '配角' },
  { cn: '音羽 真昼', kana: 'おとわ まひる', role: '配角' },
  { cn: '白石 苍', kana: 'しらいし あおい', role: '配角' },
  { cn: '霜月 绫', kana: 'しもつき あや', role: '配角' },
  { cn: '灰田 千鹤', kana: 'はいだ ちづる', role: '配角' },
];
const TP_SEIYUU = [
  '小野寺 雪', '高濑 悠里', '相原 千秋', '三上 诗织',
  '河合 纱英', '藤原 桃', '远野 结', '真壁 千寻',
];
const TP_CHAR_LINE = [
  '嘴上不饶人，真到要紧关头总是先站出来那一个。',
  '把心事藏得很深，只有深夜的钟表店才肯说几句真话。',
  '看起来最随和，其实是全篇最不肯让步的人。',
  '记性好得离谱，连七年前的一句玩笑都还留着。',
  '讨厌被同情，所以从不解释自己的选择。',
  '总在错的时间说对的话，因此总在道歉。',
  '对旧物有执念，店里的每一只表都能说出年份。',
  '把「没关系」当口头禅，听的人都知道有关系。',
  '逻辑清楚到近乎冷，唯独在一件事上不算数。',
  '看起来是来找麻烦的，其实只是不知道该怎么靠近。',
  '比谁都早看穿结局，还是陪着走完了全程。',
  '在所有分歧点上都选了最难走的那条。',
];

/* 角色表：4–8 名。
   ⚠️⚠️ **全部走独立种子**（`${tid}#cast` / `${tid}#cv${i}` / `${tid}#line${i}`），
   一个 `rnd()` 都不许从主随机流里拿 —— topicDetail 的 rnd 是一条**共享流**，
   按顺序消费字段，插进去会把 score / size / dlLinks 全部平移，
   于是同一个 tid 的内容会变（违反本文件开头的确定性硬要求）。 */
function tpCast(t) {
  const r = topicRng(tidSeed(`${t.tid}#cast`));
  const n = 4 + Math.floor(r() * 5);              // 4–8 名
  const cOff = Math.floor(r() * TP_CAST.length);
  const vOff = Math.floor(r() * TP_SEIYUU.length);
  const lOff = Math.floor(r() * TP_CHAR_LINE.length);
  const out = [];
  /* 三条都用「起点 + 步长」，且**步长与池长互质** ⇒ 同一帖里不会撞名 / 撞声优 / 撞简介。
     （第一版每个角色各开一个 RNG，结果同一张表里出现两个「远野 结」、
     两句一样的简介 —— 手写池子小，随机取必然撞。）
       角色名 stride 3、池长 16，gcd=1
       声优   stride 1、池长 8，n ≤ 8 直接够
       简介   stride 5、池长 12，gcd=1 */
  for (let i = 0; i < n; i++) {
    const c = TP_CAST[(cOff + i * 3) % TP_CAST.length];
    out.push({
      name: c.cn, kana: c.kana, role: c.role,
      seiyuu: TP_SEIYUU[(vOff + i) % TP_SEIYUU.length],
      line: TP_CHAR_LINE[(lOff + i * 5) % TP_CHAR_LINE.length],
    });
  }
  /* 主角 / 女主角排前面 —— 角色表按重要度读才对 */
  const RANK = { 主角: 0, 女主角: 0, 副女主角: 1, 配角: 2, 反派: 3 };
  return out.sort((a, b) => (RANK[a.role] ?? 9) - (RANK[b.role] ?? 9));
}

/* ---------- 对外主入口 ---------- */

/* 帖标题里的《…》优先命中作品名；命中不了就按种子在池子里挑一个 */
function tpMatchWork(title, rnd) {
  const m = /《([^》]{2,14})》/.exec(title || '');
  if (m) {
    const key = m[1];
    const hit = TP_WORKS.find((w) => w.cn === key || w.jp === key
      || w.cn.includes(key) || w.jp.includes(key));
    if (hit) return hit;
    // 池子里没有（自制 / 同人 / 画集一类的标题）：直接拿标题里的名字当作品名，
    // 否则会出现「标题写《回声》、信息卡却是另一部作品」的错位
    return { jp: key, cn: key, maker: tpPick(rnd, TP_MAKERS), hours: tpInt(rnd, 12, 36) };
  }
  return tpPick(rnd, TP_WORKS);
}

/* 生成一篇帖子详情：同一个 tid 每次完全一致 */
function topicDetail(entry) {
  const t = entry.t;
  const rnd = topicRng(tidSeed(t.tid) ^ 0x5bf03635);
  const work = tpMatchWork(t.title, rnd);

  const type = [tpPick(rnd, ['ADV', 'AVG'])];
  while (type.length < tpInt(rnd, 2, 3)) {
    const g = tpPick(rnd, TP_GENRES);
    if (!type.includes(g)) type.push(g);
  }

  const released = `${tpInt(rnd, 2011, 2023)}-${String(tpInt(rnd, 1, 12)).padStart(2, '0')}-${String(tpInt(rnd, 1, 28)).padStart(2, '0')}`;
  const score = (7.2 + rnd() * 2.5).toFixed(1);
  const intro = tpIntro(rnd);
  const replyCount = tpInt(rnd, 10, 30);

  return {
    work,
    release: released,
    types: type,
    hours: `${work.hours} 小时`,
    platform: tpPick(rnd, TP_PLATFORMS),
    score,
    voice: tpPick(rnd, TP_VOICE),
    script: tpPick(rnd, TP_SCRIPT),
    art: tpPick(rnd, TP_ART),
    music: tpPick(rnd, TP_MUSIC),
    size: `${(1.8 + rnd() * 4.2).toFixed(1)} GB`,
    intro,
    introStars: tpIntroStars(rnd, intro.length),
    // 截图：颜色跟着板块色相走，种子跟着 tid 走 ⇒ 同一帖每次同六张
    shots: TP_SHOT_CAPS.map((cap, i) => ({
      cap,
      seed: tidSeed(`${t.tid}#shot${i}`),
    })),
    dlNote: tpPick(rnd, TP_DL_NOTES),
    dlLinks: TP_DL_LINKS.slice(0, tpInt(rnd, 2, 3)),
    /* 角色表。放在这里是**安全的**：`tpCast` 自己开独立种子，不消费上面那条 rnd 流。
       字段在返回对象里的先后位置对确定性没有任何影响。 */
    cast: tpCast(t),
    replies: topicReplies(t, replyCount),
    replyCount,
    /* 评分 / 短评（第 32 轮）。与 `cast` 同一个道理：`tpRatings` **自己开独立种子**，
       不消费上面那条 rnd 流 ⇒ 挂在返回对象里对确定性没有任何影响。
       `score` 在这里降级成**打分的中心值**（平均分由 `rateAvg(ratings)` 算出来才算数）。 */
    ratings: tpRatings(t, parseFloat(score)),
  };
}

/* 回复：10–30 条，楼层从 1F 起（首条是楼主自己的补充），时间由远及近 */
function topicReplies(t, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const rnd = topicRng(tidSeed(`${t.tid}#r${i}`));
    const isOp = i === 0;
    // 楼层越靠后离现在越近；最新一条正好落在帖子自己的「最后回复」时间上
    const back = (count - 1 - i) * (23 + Math.floor(rnd() * 260));
    out.push({
      floor: i + 1,
      isOp,
      author: isOp ? t.author : tpPick(rnd, THREAD_AUTHORS),
      body: isOp ? tpPick(rnd, TP_OP_REPLY) : tpPick(rnd, TP_REPLY_BODY),
      mins: Math.max(1, t.mins + back),
      local: false,
    });
  }
  return out;
}

/* ---------- 观测证（作者档案）· 追加函数，第 23 轮 ----------
   ⚠️ **追加**：`shared/*.js` 只可追加，四个版本共用本文件 —— 一字不动既有名字。
   ⚠️ 种子用**作者名**，不用 tid。站里本来就有一条承诺：同名 = 同一个人
      （`hueOf(name)` ⇒ 同名同头像色相；登录页那颗星也用同一个哈希）。
      观测证跟着走同一条承诺 —— **同一个人在每一帖里的档案完全一样**，换帖不换人。
   ⚠️ 独立种子 `tidSeed(name + '#profile')`：一个数都不从别的流里拿。

   字段按用户给的 galbase「学生证」1:1 对照，**只把世界观换成本站的观测台语汇**
   （galbase 是学园，星海社是天文台）：学生证→观测证 · 在校时间→在站时长 ·
   学分→观测积分 · 学年→星历 · 奖学金→星尘余额 · 风纪执行→巡版执行 ·
   猫罐头→捡到的陨石。字段个数与顺序一个不改。 */
const TP_RANKS = [
  '星轨研讨室 · 常驻观测员', '译星工房 · 校对', '观测台 · 值班员', '星图馆 · 编目员',
  '创作所 · 同人写手', '深空观测者', '新晋观星者', '资源区 · 搬运工',
  '求助信号塔 · 值守', '银河航道 · 领航',
];
const TP_SIGNS = [
  '在无数条时间线里，只挑一条读完。',
  '存档永远留一个空位，给还没写完的那条线。',
  '看到星轨就想标下来，标完就忘了标在哪。',
  '慢热的东西才值得等，序章也是。',
  '一边写感想一边剧透，所以感想都发在通关后。',
  '把每一部作品的 BGM 都听成了背景音。',
  '不擅长聊天，擅长在楼里补一句。',
  '收藏夹比游玩记录诚实。',
  '翻旧帖比发新帖开心。',
  '偶尔上台，多数时候在台下鼓掌。',
];

function tpProfile(name) {
  const key = String(name == null ? '' : name);
  const rnd = topicRng(tidSeed(key + '#profile'));
  const pad = (n) => String(n).padStart(2, '0');
  const ym = (yLo, yHi) => `${yLo + Math.floor(rnd() * (yHi - yLo + 1))}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`;
  const works = TP_WORKS.map((w) => w.cn);
  /* 从池里不重复地抽 n 个（抽一个删一个 ⇒ 同一份档案里不会出现两部一样的「推荐」） */
  const pickN = (arr, n) => {
    const c = arr.slice(), out = [];
    while (out.length < n && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]);
    return out;
  };
  return {
    uid: 1 + Math.floor(rnd() * 9998),
    hours: 60 + Math.floor(rnd() * 9900),
    rank: tpPick(rnd, TP_RANKS),
    credits: Math.floor(rnd() * 300),
    year: 1 + Math.floor(rnd() * 6),
    dust: rnd() < .3 ? 0 : Math.floor(rnd() * 900),      // 三成人是 0 —— 穷得很真实
    patrol: Math.floor(rnd() * 240),
    meteor: Math.floor(rnd() * 3200),
    joined: ym(2021, 2024),
    seen: ym(2026, 2026),
    sign: tpPick(rnd, TP_SIGNS),
    pics: [0, 1, 2].map((i) => tidSeed(`${key}#pic${i}`)),
    ongoing: pickN(works, 1 + Math.floor(rnd() * 2)),
    recommends: pickN(works, 2 + Math.floor(rnd() * 2)),
  };
}

/* ---------- 评分 / 短评 · 追加（第 32 轮） ----------
   用户要的是 galbase 那种评分板块：评分图标 · 平均分线 · 短评 · 可操控自己的评分。

   ⚠️ **追加**：`shared/*.js` 只可追加，四个版本共用本文件 —— 上面一字不动。
   ⚠️ 独立种子 `${t.tid}#rate`：一个数都不从主流拿 ⇒ 确定性契约不破。
   ⚠️ 每条评比**再开一个** `${t.tid}#rate<i>`：往一条流里顺序取 N 组，
      改一处会让**后面所有条**跟着变（memories 2.128 那一族），一条一种子就免疫。
   ⚠️ **平均分不是 `score`**：它是**这份评分表的真实平均**。站点最讨厌「两个地方说两个数」，
      所以「作品信息」里那一行改成读这个平均（`v2p/topic.js` 的 `rateAvg()`），
      `topicDetail` 返回的 `score` 因此只当**打分的中心值**用，不再直接显示。 */
const TP_RATE_TXT_GOOD = [
  '序章还没走完就知道这作要进我的年度了。',
  '演出克制，但每一处停顿都踩在点上。',
  'BGM 单独拿出来循环了一整晚，值。',
  '支线的收尾比主线还稳，少见。',
  '人物没有一个是工具人，这点很难得。',
  '系统不花哨，但每一项都用得上，没有为了堆量做的功能。',
  '翻译看得出来下了功夫，语感不是机翻能碰的。',
  '通完之后又回去把序章重看了一遍，前后呼应做得很细。',
  '把「日常」写得不腻，比写得惨难多了。',
  '存档点给得很体贴，不用为了看一句话重走十分钟。',
  'CG 不多，但构图有想法，不是流水线立绘。',
  '篇幅不长，但每一章都收得住，没有为了长度注水。',
];
const TP_RATE_TXT_MID = [
  '整体不错，就是中盘节奏拖了一点。',
  '主线好，支线像另一个组做的，落差明显。',
  '演出和剧本都在线，翻译拖了后腿。',
  '剧情可以，系统有点老，要看能不能忍。',
  '前两章很有味道，后面开始走流程了。',
  '值得一玩，但不必抱着「神作」的心态进去。',
  '角色写得好，可惜篇幅不够，后面几个人明显仓促。',
  '喜欢这个调调的会很喜欢，不喜欢的会睡着。',
];
const TP_RATE_TXT_BAD = [
  '期待挺高，走完发现是个漂亮的壳。',
  '分支看着多，其实收束到同一条线上，白折腾。',
  '系统不顺手，通一次就不想开二周目了。',
  '前半段勾人，后半段赶工，可惜。',
];
const TP_RATE_STATES = ['推荐', '还行', '不推荐'];
const TP_RATE_FLOOR = 4;      /* 本站是推荐性质的站，没人打 1 分；下限 4 分也是实话 */
const TP_RATE_CEIL = 10;

function tpRatings(t, center) {
  const rnd = topicRng(tidSeed(`${t.tid}#rate`));
  /* ⚠️ **一个人只能评一次** —— 名池只有 `THREAD_AUTHORS.length`（30）个，
     而一条评分表要十几到三十条，用「各自随机取」必然出现同一个名字评两次
     （实测第一版就有：同一个「星屑」在表里出现了两遍，一条 10.0 一条 9.0）。
     ⇒ 用站里既有的解法（`makeThread` 那条）：**起点 + 与池长互质的步长**，
       这样在「取数 ≤ 池长」的前提下名字**互不重复**，而顺序随 tid 变、同一帖永远一致。
     （memories §2.129：小池子随机取必然撞 —— 这是它在同一个项目里的第二次。） */
  const A = THREAD_AUTHORS.length;
  const n = Math.min(A, 12 + Math.floor(rnd() * 19));      /* 12–30 条 */
  const coprimes = [7, 11, 13, 17, 19, 23, 29].filter((s) => {
    let a = A, b = s % A;
    while (b) { const tmp = a % b; a = b; b = tmp; }
    return a === 1;
  });
  const stride = coprimes[Math.floor(rnd() * coprimes.length)] || 1;
  const off = Math.floor(rnd() * A);
  const span = Math.max(60, t.mins - 20);                  /* 评分发生在发帖**之后** */
  const step = span / (n + 1);
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = topicRng(tidSeed(`${t.tid}#rate${i}`));
    /* 三次均匀相加近似正态、均值 0；再挪到 `center` 上 —— 分被夹住时只是尾巴变短，
       平均分**照样按真实结果算**（`rateAvg` 用的就是这份数组，不另编一个数）。 */
    const d = (r() + r() + r() - 1.5) * 1.7;
    const score = Math.round(Math.max(TP_RATE_FLOOR, Math.min(TP_RATE_CEIL, center + d)) * 2) / 2;
    const st = score >= 8 ? 0 : score >= 6.5 ? 1 : 2;
    out.push({
      name: THREAD_AUTHORS[(off + i * stride) % A],
      score,
      state: TP_RATE_STATES[st],
      text: tpPick(r, st === 0 ? TP_RATE_TXT_GOOD : st === 1 ? TP_RATE_TXT_MID : TP_RATE_TXT_BAD),
      back: Math.round((i + 1) * step),
    });
  }
  return out;
}
/* 这份评分表的**真实平均**（一位小数）。列表为空时退回作品分。 */
function rateAvg(rows, fallback) {
  if (!rows || !rows.length) return fallback;
  const s = rows.reduce((a, r) => a + r.score, 0) / rows.length;
  return Math.round(s * 10) / 10;
}
