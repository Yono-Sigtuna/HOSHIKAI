/* 星海社 · 观测调度台（管理端）演示数据
   ==================================================================
   全部是前端演示数据，刷新即复位；不做后端、不写 localStorage
   （用户 2026-11-01：「不需要照顾管理员的感受」——台账就该是台账，
   不是营销页，所以没有空态文案鼓励、没有欢迎语、没有头像墙）。

   mag = 星等，1–5。**一等最亮，先处理**（真实星等：数字越小越亮）。
   这个读法只用来排优先级，不参与任何配色派生。 */
window.HKADMIN = {
  duty: { name: '观测长 澪', role: '管理员', station: '北天观测站', since: '18:00' },

  /* 今日星历：24 格 = 24 小时，柱高 = 该小时处置事件数 */
  curve: [1, 0, 2, 1, 0, 0, 1, 3, 2, 1, 4, 3, 2, 5, 3, 2, 4, 6, 5, 7, 8, 6, 4, 2],

  audit: [
    { id: 'Q-1051', kind: '新帖', title: '《千恋万花》汉化 v1.2 补丁', board: '星图馆 · 汉化', by: '天野', mag: 2, at: '21:14', why: '新用户首帖' },
    { id: 'Q-1050', kind: '回复', title: '「这个资源我传过，链接在楼下」', board: '星图馆 · 资源区', by: '白鸟', mag: 3, at: '21:02', why: '疑似重复资源' },
    { id: 'Q-1049', kind: '新帖', title: '【剧透】《苍之彼方》真结局解析', board: '星图馆 · 攻略', by: '织部', mag: 1, at: '20:58', why: '标题未标剧透' },
    { id: 'Q-1048', kind: '标签', title: '新增标签 #全年龄', board: '全站', by: '系统', mag: 4, at: '20:40', why: '标签需合并' },
    { id: 'Q-1047', kind: '回复', title: '「加群领取完整版」', board: '创作所 · 音声', by: '匿名', mag: 1, at: '20:31', why: '命中站外引流' },
    { id: 'Q-1046', kind: '新帖', title: '自制 OP 翻唱《星之梦》', board: '创作所 · 音声', by: '星野', mag: 3, at: '20:12', why: '音频待确认授权' },
    { id: 'Q-1045', kind: '新帖', title: '新人报到，请多关照', board: '观测台 · 新人', by: '小町', mag: 5, at: '19:55', why: '新用户首帖' },
    { id: 'Q-1044', kind: '回复', title: '三连水楼刷屏 ×8', board: '观测台 · 综合', by: '墨', mag: 2, at: '19:40', why: '连续刷屏' },
    { id: 'Q-1043', kind: '新帖', title: '《Summer Pockets》全通感想', board: '星图馆 · 作品资讯', by: '汐', mag: 4, at: '19:22', why: '正文超长待确认' },
    { id: 'Q-1042', kind: '新帖', title: '求推荐：有妹妹线的 galgame', board: '观测台 · 求助', by: '阿澄', mag: 5, at: '18:58', why: '新用户首帖' },
    { id: 'Q-1041', kind: '回复', title: '贴内图片外链失效', board: '星图馆 · 攻略', by: '无名', mag: 4, at: '18:30', why: '图片无法加载' },
    { id: 'Q-1040', kind: '新帖', title: '关于版规第 4 条的建议', board: '观测台 · 议事厅', by: '老 K', mag: 2, at: '18:02', why: '涉及站务' },
  ],

  reports: [
    { id: 'R-318', target: '《苍之彼方》真结局解析', board: '星图馆 · 攻略', reason: '剧透未标注', by: '匿名观测者', mag: 1, at: '21:20' },
    { id: 'R-317', target: '音声帖「加群领取完整版」', board: '创作所 · 音声', reason: '站外引流', by: '白鸟', mag: 1, at: '20:44' },
    { id: 'R-316', target: '回复 #12', board: '观测台 · 综合', reason: '人身攻击', by: '汐', mag: 2, at: '20:10' },
    { id: 'R-315', target: '资源帖「汉化补丁合集」', board: '星图馆 · 资源区', reason: '失效链接冒充有效', by: '阿澄', mag: 3, at: '19:48' },
    { id: 'R-314', target: '同人插画《夏空》', board: '创作所 · 同人插画', reason: '未授权转载', by: '星野', mag: 2, at: '19:15' },
    { id: 'R-313', target: '水楼「今晚谁在线」', board: '观测台 · 综合', reason: '连续刷屏', by: '老 K', mag: 3, at: '18:40' },
    { id: 'R-312', target: '用户头像', board: '全站', reason: '不适宜内容', by: '系统', mag: 4, at: '18:05' },
  ],

  appeals: [
    { id: 'A-77', target: '墨 · 禁言 24 小时', board: '观测台 · 综合', reason: '「刷屏是网络卡顿」', by: '墨', mag: 3, at: '19:52' },
    { id: 'A-76', target: '回复 #8 · 已删除', board: '创作所 · 音声', reason: '「资源为自制」', by: '匿名', mag: 2, at: '19:10' },
    { id: 'A-75', target: '小町 · 注册受限', board: '全站', reason: '「新设备登录」', by: '小町', mag: 4, at: '18:22' },
  ],

  users: [
    { uid: '0001', name: '观测长 澪', role: '管理员', mag: 6, posts: 1204, state: '正常' },
    { uid: '0012', name: '天野', role: '版主 · 星图馆', mag: 6, posts: 862, state: '正常' },
    { uid: '0037', name: '织部', role: '版主 · 创作所', mag: 5, posts: 640, state: '正常' },
    { uid: '0088', name: '老 K', role: '版主 · 观测台', mag: 5, posts: 511, state: '正常' },
    { uid: '0205', name: '墨', role: '观测者', mag: 2, posts: 96, state: '禁言' },
    { uid: '0331', name: '白鸟', role: '观测者', mag: 3, posts: 214, state: '正常' },
    { uid: '0402', name: '星野', role: '观测者', mag: 3, posts: 188, state: '正常' },
    { uid: '0517', name: '阿澄', role: '观测者', mag: 2, posts: 41, state: '正常' },
    { uid: '0640', name: '小町', role: '观测者', mag: 1, posts: 3, state: '正常' },
    { uid: '0899', name: '匿名', role: '观测者', mag: 0, posts: 0, state: '封禁' },
  ],

  notices: [
    { id: 'N-24', title: '站庆三日：观测者证限时徽章', board: '全站', pinned: true, at: '10-30' },
    { id: 'N-23', title: '汉化区投稿规范（11 月版）', board: '星图馆', pinned: true, at: '10-28' },
    { id: 'N-22', title: '新人报到模板更新', board: '观测台', pinned: false, at: '10-25' },
    { id: 'N-21', title: '音声区授权声明必填', board: '创作所', pinned: false, at: '10-21' },
    { id: 'N-20', title: '站务组招募：两名版主', board: '全站', pinned: false, at: '10-18' },
    { id: 'N-19', title: '资源失效请报至「求助信号塔」', board: '星图馆', pinned: false, at: '10-12' },
  ],

  boards: [
    { name: '星图馆', sections: 4, posts: 3821, today: 96, mod: '天野', state: '正常' },
    { name: '创作所', sections: 4, posts: 2674, today: 71, mod: '织部', state: '正常' },
    { name: '观测台', sections: 4, posts: 7910, today: 143, mod: '老 K', state: '限流' },
  ],

  logs: [
    { at: '21:14', who: '天野', act: '通过审核', target: '帖子 Q-1036' },
    { at: '21:02', who: '系统', act: '标记待审', target: '回复 Q-1037' },
    { at: '20:44', who: '老 K', act: '忽略举报', target: '举报 R-311' },
    { at: '20:20', who: '观测长 澪', act: '置顶公告', target: '公告 N-24' },
    { at: '19:58', who: '织部', act: '删除回复', target: '回复 #8' },
    { at: '19:30', who: '观测长 澪', act: '禁言 24 小时', target: '用户 墨' },
    { at: '18:12', who: '天野', act: '驳回审核', target: '帖子 Q-1038' },
    { at: '17:40', who: '系统', act: '记录举报', target: '举报 R-312' },
  ],
};
