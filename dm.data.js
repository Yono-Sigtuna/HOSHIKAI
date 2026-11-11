/* 星海社 · 私信（HUD 文本框模块里那枚「私信」键）—— mock 数据
   ------------------------------------------------------------------
   ⚠️ 纪律与 msg.data.js 同一条：**人名 / 星等 / 帖子标题 / 板块名一律取自站内既有数据**
      （shared/data.js 与 msg.data.js 里的那批人），这一份只多出「谁和我说了什么」
      与「几分钟前」这一层。
   ⚠️ `min` 是「这条消息距今多少分钟」，不是绝对时间 —— 站内消息页同一套写法。
      读的时候从大到小（旧 → 新），列表按**最后一条**的 min 排序。
   ⚠️ 这份文件不写 UI，不写存储；状态（已读 / 已发 / 已接受）在 dm.js 里。
   ------------------------------------------------------------------ */
window.DM = (function () {
  'use strict';

  /* 作者名 → 稳定色相。与 app.js / board.js / topic.js / session.js 逐字相同的哈希，
     同一个人在全站同一个颜色 —— 这里不另发明。 */
  const hueOf = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);

  /* 星等沿用站里的标度（0.6–6.5，越小越亮）。
     这里的人与 msg.data.js 是同一个人、同一个星等：收件箱和私信不能两套数。 */
  const PEOPLE = [
    { name: '旧书', mag: 0.8, followed: true, note: '星轨研讨室' },
    { name: '浅葱', mag: 2.9, followed: true, note: '星尘仓库' },
    { name: '初雪', mag: 1.5, followed: true, note: '望星台' },
    { name: '纸月', mag: 3.9, followed: true, note: '银河书简' },
    { name: '灰鸦', mag: 2.9, followed: false, note: '求助信号塔' },
    { name: '薄明', mag: 4.1, followed: true, note: '陨石画室' },
    { name: '桐谷', mag: 2.6, followed: false, note: '陨石画室' },
    { name: '铃兰', mag: 1.3, followed: true, note: '声波观测站' },
    { name: '音监', mag: 5.0, followed: true, note: '声波观测站' },
    { name: '星屑', mag: 3.7, followed: true, note: '星轨研讨室' },
    { name: 'ねこ', mag: 2.4, followed: false, note: '望星台' },
    { name: '青空', mag: 6.5, followed: false, note: '自制星体' },
    { name: 'anonymous', mag: 4.7, followed: false, note: '自制星体' },
    { name: '睡不着的猫', mag: 3.2, followed: false, note: '望星台' },
  ];

  /* ══════════ 九条会话 ══════════
     `unread` 是首次进入时的未读数（读过一次就落本机，见 dm.js 的 read）。
     `followed` 是「我有没有关注 TA」—— 设置里的「私信：我关注的人」就靠这一位判请求。 */
  const THREADS = [
    {
      id: 'oldbook', name: '旧书', followed: true, unread: 2,
      msgs: [
        { from: 'them', t: '你通关《星霜叙事诗》了吗？', min: 3180 },
        { from: 'me', t: '通了，昨晚刚走完真结局。', min: 3170 },
        { from: 'them', t: '那个被删掉的结局，你是在哪看到的？', min: 3160 },
        { from: 'me', t: '设定集最后一页，还有一篇访谈里提了一句。', min: 3150 },
        { from: 'them', t: '我昨天又走了一遍 B 线，越看越像两个人写的。', min: 70 },
        { from: 'them', t: '尤其是真结局前那段独白，语气突然变了。', min: 55 },
        { from: 'me', t: '对，那段更像短篇小说的写法。', min: 44 },
        { from: 'them', t: '我把两版文本叠在一起做了个对照，回头发你。', min: 6 },
      ],
    },
    {
      id: 'asagi', name: '浅葱', followed: true, unread: 0,
      msgs: [
        { from: 'me', t: '你那份 2015–2020 清单还有后续吗？', min: 1500 },
        { from: 'them', t: '有，第二版在整理，主要是补译名。', min: 1490 },
        { from: 'me', t: '《星屑抄》那本你放哪一档？', min: 1470 },
        { from: 'them', t: '我会放在「被低估」那一档，它的序章太好了。', min: 1460 },
        { from: 'me', t: '同意。我读完序章就决定买了。', min: 1440 },
        { from: 'them', t: '第二版今晚发，先给你留一份。', min: 47 },
      ],
    },
    {
      id: 'hatsuyuki', name: '初雪', followed: true, unread: 1,
      msgs: [
        { from: 'them', t: '你入坑作是哪一部？', min: 190 },
        { from: 'me', t: '《銀の旋律》，很老的 PC 版。', min: 188 },
        { from: 'them', t: '那部的配乐真的很好，我最近又翻出来听。', min: 185 },
        { from: 'them', t: '对了，你上次说的那个结局整理贴还更吗？', min: 180 },
      ],
    },
    {
      id: 'shizuku', name: '纸月', followed: true, unread: 0,
      msgs: [
        { from: 'me', t: '《星屑抄》的插图是你画的吗？', min: 1700 },
        { from: 'them', t: '是，画了四张，最后一版还没贴出来。', min: 1690 },
        { from: 'me', t: '第三张的星轨我很喜欢。', min: 1680 },
        { from: 'them', t: '那张重画了三次，前两版太整齐了。', min: 1660 },
        { from: 'them', t: '等贴出来再叫你。', min: 1600 },
      ],
    },
    {
      id: 'haiiro', name: '灰鸦', followed: false, unread: 1,
      msgs: [
        { from: 'them', t: 'Win11 下老 gal 字体乱码，你那边有解吗？', min: 2900 },
        { from: 'me', t: '试试改成日语区域，或者用 Locale Emulator。', min: 2895 },
        { from: 'them', t: 'Locale Emulator 试过了，还是缺字。', min: 2880 },
      ],
    },
    {
      id: 'anon', name: 'anonymous', followed: false, unread: 0,
      msgs: [
        { from: 'them', t: '我做的《回声》demo，你玩了吗？', min: 4350 },
        { from: 'me', t: '玩了。第二幕的转场很干净。', min: 4340 },
        { from: 'them', t: '谢谢，下一版想把存档界面重做。', min: 4320 },
      ],
    },
    {
      id: 'suzuran', name: '铃兰', followed: true, unread: 0,
      msgs: [
        { from: 'them', t: '翻唱企划的合唱部分还差一个人，你来吗？', min: 5800 },
        { from: 'me', t: '我可以，什么时间录？', min: 5790 },
        { from: 'them', t: '下周末，脚本发你。', min: 5780 },
      ],
    },
    {
      id: 'kirigaya', name: '桐谷', followed: false, unread: 0,
      msgs: [
        { from: 'me', t: '你的画集还换吗？', min: 10100 },
        { from: 'them', t: '换的，我把目录发你。', min: 10090 },
        { from: 'them', t: '有三本重复的，你看看要哪本。', min: 10080 },
      ],
    },
    {
      id: 'ontoku', name: '音监', followed: true, unread: 0,
      msgs: [
        { from: 'them', t: '上次说的录音棚，周日下午空出来了。', min: 20200 },
        { from: 'me', t: '好，我把台本带过去。', min: 20190 },
        { from: 'them', t: '嗯，麦克风我提前架好。', min: 20160 },
      ],
    },
  ];

  /* 说明：`min` 只在内部用于排序与「60 分钟内连成一组」，**界面不显示任何时间**
     —— 用户 2026-11-01：「不要做时间什么时候发的，做已读和未读」。 */

  return { me: '夜狩', hueOf, people: PEOPLE, threads: THREADS };
})();
