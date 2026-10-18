/* =========================================================
   月亮岛 · 交互原型
   1) 星空引擎：三档强度，真的会影响画面
   2) 月相系统：可点、可记录、断签不清零
   3) 无障碍：字号 / 对比度 / 朗读 / 减少动效
   ========================================================= */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const body = document.body;

const state = {
  intensity: 'glow',
  font: '1',
    contrast: false,
    read: false,
    motion: true,
    phase: 2,
  mode: 'teen',
  role: 'insider',
  theme: 'dark',
  started: false
};

/* 照片位有两种状态：
   1) 文件已就位 —— 打上 photo--mock，右下角显示「示意图」角标
      （换成真实照片后，删掉 CSS 里的 .photo--mock::before 即可去掉角标）
   2) 文件还没放进来 —— 打上 photo--empty，显示带编号的占位块，不出现破图
   两种状态都按图片实际加载结果自动判断，替换照片不需要改这里。 */
$$('.photo img').forEach(img => {
  const fig = img.closest('.photo');
  if (!fig) return;
  const missing = () => fig.classList.add('photo--empty');
  const present = () => fig.classList.add('photo--mock');
  if (img.complete) {
    if (img.naturalWidth > 0) present(); else missing();
  } else {
    img.addEventListener('load', present);
    img.addEventListener('error', missing);
  }
});

/* =========================================================
   星空引擎
   ========================================================= */
const canvas = $('#starfield');
const ctx = canvas.getContext('2d');

const PRESETS = {
  calm:   { count: 80,  twinkle: 0.10, drift: 0.8, meteorChance: 0,     alpha: 0.5, size: 0.9 },
  glow:   { count: 150, twinkle: 0.42, drift: 2.2, meteorChance: 0,     alpha: 0.78, size: 1 },
  meteor: { count: 230, twinkle: 0.68, drift: 4.0, meteorChance: 0.0045, alpha: 1, size: 1.15 }
};

let stars = [];
let meteors = [];
let vw = 0, vh = 0, dpr = 1;
let lastFrame = performance.now();
let elapsed = 0;

function buildStars() {
  const p = PRESETS[state.intensity] || PRESETS.glow;
  const n = Math.round(p.count * Math.min(1, vw / 390));
  stars = Array.from({ length: n }, () => {
    const depth = Math.random();
    return {
      x: Math.random() * vw,
      y: Math.random() * vh,
      r: (0.5 + Math.random() * 1.5) * (0.7 + depth * 0.7) * p.size,
      base: (0.25 + Math.random() * 0.75) * p.alpha,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.1,
      depth
    };
  });
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = canvas.clientWidth || 390;
  vh = canvas.clientHeight || 844;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildStars();
}

function draw(now) {
  const dt = Math.min(now - lastFrame, 60);
  lastFrame = now;
  const p = PRESETS[state.intensity] || PRESETS.glow;
  const still = !state.motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!still) elapsed += dt / 1000;
  if (still) meteors.length = 0;

  ctx.clearRect(0, 0, vw, vh);

  // 星点
  for (const s of stars) {
    const tw = still ? 1 : 1 - p.twinkle * 0.5 + p.twinkle * 0.5 * Math.sin(elapsed * s.speed + s.phase);
    const a = Math.max(0, s.base * tw);
    ctx.beginPath();
    ctx.globalAlpha = a;
    ctx.fillStyle = s.depth > 0.82 ? '#fff4e0' : '#e9eef7';
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();

    if (s.r > 1.6) {
      ctx.globalAlpha = a * 0.16;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!still) {
      s.x += (p.drift * (0.3 + s.depth)) * dt / 1000 / 8;
      if (s.x > vw + 4) s.x = -4;
    }
  }
  ctx.globalAlpha = 1;

  // 流星
  if (!still && p.meteorChance > 0 && Math.random() < p.meteorChance) {
    meteors.push({
      x: Math.random() * vw * 0.7,
      y: -20 - Math.random() * 60,
      vx: 1.4 + Math.random() * 1.1,
      vy: 2.2 + Math.random() * 1.3,
      life: 1
    });
  }
  meteors = meteors.filter(m => {
    m.x += m.vx * dt / 12;
    m.y += m.vy * dt / 12;
    m.life -= dt / 1500;
    if (m.life <= 0 || m.y > vh + 40) return false;
    const tailX = m.x - m.vx * 14;
    const tailY = m.y - m.vy * 14;
    const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
    grad.addColorStop(0, 'rgba(255,246,226,' + (0.85 * m.life).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(233,238,247,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    return true;
  });

  requestAnimationFrame(draw);
}

/* =========================================================
   月相
   ========================================================= */
const PHASES = [
  { name: '新月', note: '什么都没有，也挺好' },
  { name: '蛾眉月', note: '只亮了一点点' },
  { name: '上弦月', note: '有点亮，也有点没准备好' },
  { name: '盈凸月', note: '快要满了，还想再撑一下' },
  { name: '满月', note: '今天是亮的' },
  { name: '亏凸月', note: '还亮着，但开始松下来了' },
  { name: '下弦月', note: '只剩一半力气' },
  { name: '残月', note: '快要用完了，先休息' }
];

const LIT = '#f5c451', DARK = '#161428';

function phaseSVG(i, size) {
  const lit = '<circle cx="12" cy="12" r="8" fill="' + LIT + '"/>';
  const cut = (cx, r) => '<circle cx="' + cx + '" cy="12" r="' + r + '" fill="' + DARK + '"/>';
  let inner = '';
  if (i === 0) inner = '';
  else if (i === 1) inner = lit + cut(9.4, 7.6);
  else if (i === 2) inner = '<path d="M12,4 A8,8 0 0,1 12,20 Z" fill="' + LIT + '"/>';
  else if (i === 3) inner = lit + cut(0.8, 7.2);
  else if (i === 4) inner = lit;
  else if (i === 5) inner = lit + cut(23.2, 7.2);
  else if (i === 6) inner = '<path d="M12,4 A8,8 0 0,0 12,20 Z" fill="' + LIT + '"/>';
  else inner = lit + cut(14.6, 7.6);

  return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10.6" fill="' + DARK + '"/>' +
    '<circle cx="12" cy="12" r="10.6" fill="none" stroke="rgba(233,238,247,.22)"/>' +
    inner + '</svg>';
}

function buildPhaseGroup(el, size, withLabel) {
  if (!el) return;
  el.innerHTML = PHASES.map((p, i) =>
    '<button role="radio" data-phase-value="' + i + '" aria-checked="' + (i === state.phase) + '" aria-label="' + p.name + '">' +
    phaseSVG(i, size) + (withLabel ? '<span>' + p.name + '</span>' : '') + '</button>'
  ).join('');
}

function setPhase(i, source) {
  state.phase = i;
  $$('.phases button').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.phaseValue) === i)));
  $$('.mood__phase').forEach(el => { el.innerHTML = phaseSVG(Number(el.dataset.phase), 24); });
  const label = PHASES[i].name + ' · ' + PHASES[i].note;
  const a = $('#phase-label'); if (a) a.textContent = label;
  const b = $('#today-moon-note'); if (b) b.textContent = label;
  if (source) toast('今晚的月亮：' + PHASES[i].name);
}

/* =========================================================
   内容
   ========================================================= */

// 每一课一套 3 题的测验。六个「开始测验」按钮按各自的课打开对应题组。
const QUIZ_SETS = {
  'lesson-cause': {
    title: '第 1 课 · 是什么 · 小测验',
    sub: '三道题。答错没有惩罚，会顺手把这一课的重点再说一遍。',
    items: [
      {
        q: '白化病是怎么来的？',
        options: ['后天晒多了、营养不够', '基因突变导致的先天遗传病', '小时候生了场病落下的'],
        right: 1,
        why: '它是先天遗传的，和晒太阳多少、吃得好不好都没有关系。'
      },
      {
        q: '父母都不患病，会不会生出白化病的孩子？',
        options: ['不会，父母没病孩子就不会有', '会，双方都携带同一个隐性基因时有 1/4 的概率', '只有近亲结婚才会'],
        right: 1,
        why: '多数是常染色体隐性遗传——父母都只是携带者，自己不发病，孩子有 25% 的概率患病。'
      },
      {
        q: '白化病在中国的发病率大约是多少？',
        options: ['约 1/18000', '约 1/100', '只有个别地区才会出现'],
        right: 0,
        why: '中国人群约 1/18000，携带者约 1/60。各人种、各民族、各地区都会出现。'
      }
    ]
  },
  'lesson-eye': {
    title: '第 2 课 · 眼睛与视力 · 小测验',
    sub: '三道题。答错没有惩罚，会顺手把这一课的重点再说一遍。',
    items: [
      {
        q: '白化病患者看世界的样子，通常是？',
        options: ['完全看不见', '低视力、怕光，但看得见', '视力正常，只是颜色浅一些'],
        right: 1,
        why: '大部分人是低视力而不是全盲。他们看世界的方式和你不完全一样。'
      },
      {
        q: '「畏光」背后真正的原因是？',
        options: ['眼睛一直发炎', '色素少，瞳孔挡不住强光', '心理上害怕阳光'],
        right: 1,
        why: '色素参与眼睛发育，虹膜挡不住强光，所以在亮处会刺痛、睁不开眼。'
      },
      {
        q: '眼球不自主地轻微抖动，该怎么理解？',
        options: ['是紧张，或者习惯不好', '叫眼球震颤，是常见的伴随表现', '说明视力正在恶化'],
        right: 1,
        why: '眼球震颤很常见，多数不影响日常，但有变化就要去看眼科。'
      }
    ]
  },
  'lesson-sun': {
    title: '第 3 课 · 日常防晒 · 小测验',
    sub: '三道题。答错没有惩罚，会顺手把这一课的重点再说一遍。',
    items: [
      {
        q: '夏天中午要出门，最该优先做的是？',
        options: ['涂上最高倍数的防晒霜就够了', '先遮挡：避开高峰时段、戴帽子、穿长袖', '打一把伞就不会被晒到'],
        right: 1,
        why: '遮挡优先，防晒霜是补位。紫外线还会被地面和水面反射回来。'
      },
      {
        q: '阴天要不要防晒？',
        options: ['不用，云层已经把紫外线挡住了', '要，UVA 能穿透云层', '看温度，热才需要'],
        right: 1,
        why: '云层挡不住紫外线，阴天一样会晒伤，冬天和雪地也一样。'
      },
      {
        q: '防晒霜涂一次能管多久？',
        options: ['一整天', '大约两小时，出汗或游泳后要补涂', '涂够量就不用补了'],
        right: 1,
        why: '大约每两小时补一次，出汗、擦脸、游泳之后要立刻补。'
      }
    ]
  },
  'lesson-talk': {
    title: '第 4 课 · 怎么和别人说 · 小测验',
    sub: '三道题。答错没有惩罚，会顺手把这一课的重点再说一遍。',
    items: [
      {
        q: '同学问「你的头发为什么是白的」，最省力的回答是？',
        options: ['讲一遍完整的遗传学', '"天生的，不传染。"', '装作没听见，走开'],
        right: 1,
        why: '一句话就够。你有权不解释，简洁的回答往往最不消耗自己。'
      },
      {
        q: '新学期开始前，比较有用的做法是？',
        options: ['先不说，等老师和同学自己发现', '提前跟老师说明需要的便利', '让家长到班上替自己解释'],
        right: 1,
        why: '先说清楚座位、户外课、看黑板这三件事，比事后再补救省力得多。'
      },
      {
        q: '有人一直盯着你看，你可以？',
        options: ['必须忍耐，不能表现出来', '说出来、走开，或者找信任的大人帮忙', '立刻回瞪回去'],
        right: 1,
        why: '你不需要为别人的好奇负责，也不需要一直忍着。'
      }
    ]
  },
  'lesson-family': {
    title: '第 5 课 · 家属照护 · 小测验',
    sub: '三道题。答错没有惩罚，会顺手把这一课的重点再说一遍。',
    items: [
      {
        q: '照护者最容易漏掉的一件事是？',
        options: ['给孩子涂防晒', '照顾自己的情绪和休息', '定期带孩子复查'],
        right: 1,
        why: '先稳住自己，才接得住孩子。照顾者的疲惫也需要被照顾。'
      },
      {
        q: '关于「能不能治好」，更接近事实的说法是？',
        options: ['多吃黑芝麻、黑豆可以变黑', '目前无法治愈，能做的是防晒、护眼和心理支持', '长大以后自然就好了'],
        right: 1,
        why: '白化病无法治愈，也没有食物能改变色素。真正能管理的是防晒、视力与心理支持。'
      },
      {
        q: '跟老师沟通孩子的情况，卡片里建议重点讲？',
        options: ['完整讲一遍病史', '三件事：座位、户外防护、看不清时允许走近', '请老师多照顾，别让同学问'],
        right: 1,
        why: '说清楚需要的便利就够，不必交代全部病史。'
      }
    ]
  },
  'lesson-detail': {
    title: '第 5 课 · 常见误解 · 小测验',
    sub: '三道题。答错没有惩罚，会告诉你是哪一句被说反了。',
    items: [
      {
        q: '白化病会传染吗？',
        options: ['会，接触的时候要小心', '不会，它由基因决定', '只有小时候会传染'],
        right: 1,
        why: '它由基因决定。一起吃饭、共用物品、日常接触都不会传播。'
      },
      {
        q: '他们看东西的样子是？',
        options: ['完全看不见', '视力正常，只是颜色浅', '大多是低视力、怕光，但看得见'],
        right: 2,
        why: '大部分人是低视力而不是全盲，怕光、眼球震颤很常见。他们看世界的方式和你不完全一样。'
      },
      {
        q: '夏天一起走路，他在太阳底下。你会怎么做？',
        options: ['提醒他"你不适合晒太阳吧"', '自然地陪他走到阴凉那边', '当作没看见，免得他尴尬'],
        right: 1,
        why: '最好的帮助是自然地把阴凉让出来，而不是当场指出他的身体。'
      }
    ]
  }
};

const QUIZ_DEFAULT = 'lesson-detail';
let currentQuizKey = QUIZ_DEFAULT;
let currentQuiz = QUIZ_SETS[QUIZ_DEFAULT];
let answered = 0;

// 岛外人走完认知地图拿徽章；岛内人做课程测验只是一次复习。
const QUIZDONE_COPY = {
  badge: {
    title: '你拿到了守护者徽章',
    text: '现在你可以申请进入夜谈室做志愿者，也可以在打气墙发帖了。徽章不代表你懂他们，只代表你愿意先听。'
  },
  review: {
    title: '这一课过关了',
    text: '三道题都答完了。记不住也没关系，需要用的时候回来翻一翻就好。'
  }
};

function renderQuiz() {
  const wrap = $('#quiz');
  if (!wrap) return;
  const items = currentQuiz.items;
  wrap.innerHTML = items.map((item, qi) =>
    '<div class="quiz__q" data-q="' + qi + '">' +
      '<h4><span>' + (qi + 1) + ' / ' + items.length + '</span>' + item.q + '</h4>' +
      item.options.map((o, oi) => '<button class="quiz__opt" data-opt="' + oi + '">' + o + '</button>').join('') +
      '<p class="quiz__why" hidden></p>' +
    '</div>').join('');
}

/**
 * 打开某一课的测验：换标题、换题组、清掉上一次的作答状态。
 * 没传 key（科普首页的认知地图、岛上导览的今日一课）就用默认的「常见误解」。
 */
function startQuiz(key) {
  currentQuizKey = QUIZ_SETS[key] ? key : QUIZ_DEFAULT;
  currentQuiz = QUIZ_SETS[currentQuizKey];
  answered = 0;
  const title = $('#quiz-title');
  if (title) title.textContent = currentQuiz.title;
  const sub = $('.sheet[data-sheet="quiz"] .sheet__sub');
  if (sub) sub.textContent = currentQuiz.sub;
  const done = $('#quizdone');
  if (done) done.classList.remove('is-on');
  const copy = (state.role === 'visitor' && currentQuizKey === QUIZ_DEFAULT)
    ? QUIZDONE_COPY.badge
    : QUIZDONE_COPY.review;
  const doneTitle = $('#quizdone-title');
  const doneText = $('#quizdone-text');
  if (doneTitle) doneTitle.textContent = copy.title;
  if (doneText) doneText.textContent = copy.text;
  renderQuiz();
}

const MYTHS = [
  { bad: '白化病会传染', ok: '不会。它由基因决定，一起吃饭、共用物品、日常接触都不会传播。' },
  { bad: '白化病会让人智力受影响', ok: '不会。色素和智力没有关系。患者在学习上可能遇到的额外困难，通常来自视力，而不是智力。' },
  { bad: '多吃黑芝麻、黑豆就能变黑、能治好', ok: '目前白化病无法治愈，也没有证据表明食物能改变色素。真正能管理的是防晒、视力与心理支持。' },
  { bad: '白化病患者不能出门晒太阳', ok: '可以出门，但需要防护。完全不出门反而会影响身体发育和心情。' },
  { bad: '只有近亲结婚才会生出白化病孩子', ok: '不一定。多数患者的父母都很健康，也没有血缘关系——他们只是恰好都携带同一个隐性基因。' },
  { bad: '有些地方认为白化病患者"不祥"', ok: '这是迷信，也是歧视和伤害的根源。白化病只是一种先天的遗传差异。' }
];

const TOPICS = {
  '认识它': {
    title: '白化病是什么',
    html: `
      <p>白化病是一组先天的遗传性疾病。身体合成黑色素的能力不足，皮肤、头发和眼睛的色素会减少或者缺失。</p>
      <p>它不是"生病之后变白"，不是传染病，也和饮食、晒太阳多少、妈妈怀孕时做了什么没有关系。</p>
      <p><b>为什么是遗传的？</b>常见的眼皮肤白化病是常染色体隐性遗传：父母双方都携带同一个致病基因，孩子才有四分之一的概率患病。这样的父母通常没有任何症状，所以第一个孩子确诊时，很多家庭都会很意外。</p>
      <p>少数类型（眼白化病）与 X 染色体有关，表现也以眼睛为主。</p>
      <p class="src">白化病属于罕见病。全球大致每一万七千到两万人中约有 1 人，不同地区和人群差别很大。以上为公开科普资料的常识整理，不替代医生的诊断。</p>`
  },
  '眼睛与视力': {
    title: '眼睛与视力',
    html: `
      <p>色素参与眼睛的发育，所以大部分白化病患者都有不同程度的视力问题：<b>怕光、眼球震颤、斜视、屈光不正、立体视觉差</b>。</p>
      <p>视力通常比较稳定，不会一直恶化下去，但它带来的不方便是长期存在的。</p>
      <p><b>真正有用的几件事：</b></p>
      <ul>
        <li>戴能滤紫外线的滤光镜。注意：普通深色墨镜不等于滤光镜。</li>
        <li>按医嘱验光配镜，每 6–12 个月做一次眼科随访。</li>
        <li>用大字号、放大镜、单筒望远镜、屏幕朗读这些工具，不丢人，是办法。</li>
        <li>教室座位尽量靠前、避开直射光，需要时请老师帮忙拉窗帘。</li>
      </ul>`
  },
  '日常防晒': {
    title: '日常防晒',
    html: `
      <p>皮肤缺少黑色素保护，晒伤很快，长期看皮肤癌的风险也更高。所以防晒不是爱美，是长期健康管理。</p>
      <p><b>优先顺序：遮挡 &gt; 时间 &gt; 防晒霜。</b></p>
      <ul>
        <li>宽檐帽、长袖、防晒衣、遮阳伞，能挡住的部分尽量挡住。</li>
        <li>紫外线指数 3 以上就要防护，6 以上尽量避开 10:00–16:00。</li>
        <li>防晒霜选 SPF50+ / PA++++，出门前 15–30 分钟涂，每 2 小时补涂，出汗或游泳后重涂。</li>
        <li>每年至少一次皮肤科检查，平时自己照镜子留意新的斑点或变化。</li>
      </ul>`
  },
  '怎么和别人说': {
    title: '怎么和别人说',
    html: `
      <p>你不需要向任何人解释你的身体。下面这些只是"如果我想说"时可以用的句子。</p>
      <p><b>给同学：</b>"我的身体不能晒太阳，眼睛也怕光。别的都一样。" 短句往往比长篇解释有效。</p>
      <p><b>给老师：</b>可以提前写一张小卡片，说明座位、窗帘、体育课和外出活动的安排，比当场开口轻松。</p>
      <p><b>给同事或 HR：</b>只说你需要的合理便利，不必交代病史细节。</p>
      <p><b>如果被起了难听的外号：</b>你不需要当场去教育对方。先照顾自己的情绪，再决定要不要解释。</p>`
  },
  '家属照护': {
    title: '家属照护指南',
    html: `
      <p><b>0–6 岁：</b>重点是防晒习惯和视力发育。别因为害怕就不让孩子出门。</p>
      <p><b>学龄期：</b>和学校沟通座位与活动安排，同时教孩子自己说出"我需要"。</p>
      <p><b>青春期：</b>孩子最在意的是"别被特殊对待"。陪伴者可以少一点保护，多一点信任。</p>
      <p><b>家长也需要支持：</b>很多父母的压力不比孩子小。守护者房间里有别的家长，你们可以互相换经验。</p>`
  },
  '复查与随访': {
    title: '去医院之前',
    html: `
      <p>白化病是需要长期照护的，但不用天天跑医院。<b>复查的意义是早一点发现还能处理的问题</b>，主要是眼睛和皮肤这两块。</p>
      <p><b>多久查一次</b></p>
      <ul>
        <li>眼睛：每 6–12 个月一次眼科随访。医生会看屈光有没有变化、眼球震颤的情况，以及眼底。</li>
        <li>皮肤：每月自己看一遍全身，留意新出现的斑点、颜色变深的痣、久不愈合的地方；每年做一次皮肤科随访。</li>
      </ul>
      <p><b>出门前带这几样</b></p>
      <ul>
        <li>上一次的验光单、配镜单，以及正在用的眼药水和药物清单。</li>
        <li>这半年的防晒记录：做过哪些防护、去过哪些户外场合。</li>
        <li>想问的问题先写下来，或者用语音录一段——到了诊室很容易忘。</li>
      </ul>
      <p><b>可以问医生的几个问题</b></p>
      <ul>
        <li>视力还会往下走吗？现在这副镜片还合适吗？</li>
        <li>孩子上课看不清黑板，座位怎么安排比较好？</li>
        <li>眼球震颤有没有适合的训练或辅助工具？</li>
        <li>要不要做遗传咨询？家里其他孩子需要检查吗？</li>
      </ul>
      <p class="src">以上是通用常识，具体复查频率与检查项目请听你的眼科 / 皮肤科医生。</p>`
  }
};

const DOC = `
  <blockquote>月亮岛，是一个不要求你躲开光的地方，<br>而是陪你学会，和光温柔相处。</blockquote>

  <h3>我们为什么做月亮岛</h3>
  <p>白化病的孩子，皮肤和头发都白白的，也格外怕光，人们温柔地称他们为“月亮的孩子”。这个名字很美，可现实里，他们常常要躲开刺眼的阳光，也要面对旁人好奇的目光，和一次次“你为什么和别人不一样”的提问。</p>
  <p>我们想做一个不用解释、也不用躲藏的地方。这里不把他们当成“病人”，而是把他们当作需要被温柔对待的<b>月亮宝宝</b>——他们不是不能发光，只是需要一束更柔的光。</p>

  <h3>为什么叫“月亮宝宝”</h3>
  <p>月亮从不刺眼，却在夜里安静发光，这正是我们希望他们拥有的状态。月亮岛把每一位用户称作“月亮天使”：</p>
  <ul>
    <li><b>弯弯的月亮</b>代表他们：白白的、亮亮的，天生怕太阳，却很好看。</li>
    <li><b>一只白兔</b>是陪伴，陪着他们一起面对光、记录每一天。</li>
    <li><b>心情用月亮的圆缺来记录</b>，满月也好、新月也好，都值得被好好对待。</li>
  </ul>
  <p>我们想让每个月亮宝宝都知道：<em>你不需要变得不敏感，你只需要遇到更温柔的光。</em></p>

  <h3>为什么整个 App 是紫色的</h3>
  <p>紫色，是月光和夜色之间的颜色，柔和、安静、不刺眼。</p>
  <ul>
    <li><b>低刺激：</b>畏光的眼睛看紫色会更舒服，它不像纯白那样反光晃眼。</li>
    <li><b>温柔：</b>薰衣草紫像月光落在云上，不沉重、也不冷冰冰。</li>
    <li><b>藏着希望：</b>紫色里掺了一点点暖粉和月光金，像夜里也一直亮着的灯。</li>
  </ul>
  <p>我们希望月亮岛看起来像一片被月光轻轻晕染的云，而不是医院里那种惨白的墙。</p>

  <h3>岛上有两种人</h3>
  <p>「岛内人 / 岛外人」不是权限高低，而是两种来意。</p>
  <ul>
    <li><b>岛内人：</b>月亮宝宝本人和家人。可以记录心情、防晒、看到同龄人的故事。</li>
    <li><b>岛外人：</b>来了解的同学、老师、朋友。通过科普和九课小指南，先学会不打扰，再学会温柔地靠近。</li>
  </ul>
  <p>岛外人看不到任何人的身份和照片，这条边界就印在导览页上，不藏起来。</p>

  <h3>我们一直守着的几条原则</h3>
  <ul>
    <li><b>不制造焦虑：</b>没有红色倒计时，也不会说“你已经落后了”。</li>
    <li><b>不惩罚：</b>断签不清零，月亮缺一角，也还是月亮。</li>
    <li><b>公开与私密分开：</b>心情广场只对岛内人可见，打气墙只送星、不评论。</li>
    <li><b>常识与医疗分开：</b>科普只讲通用常识，具体治疗请听正规医院医生的建议。</li>
    <li><b>安全优先：</b>未成年人关闭陌生人私信，宁可不增长，也不冒险。</li>
  </ul>

  <h3>一句心里话</h3>
  <p>我们改变不了他们对光敏感的皮肤，但也许能让世界学会，把光调得柔一点。月亮岛，愿意做那盏最温柔的灯。</p>
`;

/* =========================================================
   基础交互
   ========================================================= */
let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2000);
}

function speak(text) {
  if (!('speechSynthesis' in window)) { toast('这台设备暂时不支持朗读'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.95;
  u.pitch = 1.02;
  window.speechSynthesis.speak(u);
}

const CRUMBS = {
  today: '今日', planet: '星球', story: '故事', learn: '科普', mine: '我的',
  visitor: '岛上导览', child: '儿童版 · 今日', 'child-story': '儿童版 · 故事', 'child-guardian': '家长视图',
  // 二级页的顶栏面包屑要短：太长会把「月亮岛」挤出两行（二级页自己还有一层标题）
  'post-detail': '帖子', 'mood-detail': '心情', 'story-detail': '故事', 'lesson-detail': '谣言粉碎机',
  'lesson-cause': '是什么', 'lesson-eye': '视力', 'lesson-sun': '防晒',
  'lesson-talk': '沟通', 'lesson-family': '照护',
  'lesson-article': '正文',
  'compose-post': '发帖', 'compose-mood': '写心情', 'search': '搜索', 'featured-detail': '精选文章'
};

// 「今日」在不同身份下指向不同首页
function resolveScreen(name) {
  if (name !== 'today') return name;
  if (state.mode === 'child') return 'child';
  return state.role === 'visitor' ? 'visitor' : 'today';
}

/* ============================================================
   页面历史栈
   ------------------------------------------------------------
   改造前：goScreen 只切换 class，浏览器历史里永远只有一条记录，
   于是在二级页面按系统返回键 / 侧滑，会直接把整个原型退出去——
   用起来就像「没有二级页面」。
   现在每次换页 pushState，返回键退一级；.backbtn 也走同一套栈。
   ============================================================ */
let navDepth = 0;

function goScreen(name, opts) {
  opts = opts || {};
  const target = resolveScreen(name);
  const active = $('.screen.is-active');
  const current = active ? active.dataset.screen : null;

  $$('.screen').forEach(s => s.classList.toggle('is-active', s.dataset.screen === target));
  $$('.tab[data-screen-target]').forEach(t => t.classList.toggle('is-active', resolveScreen(t.dataset.screenTarget) === target));
  $$('.tab[data-child-target]').forEach(t => t.classList.toggle('is-active', t.dataset.childTarget === target));
  $('#crumb').textContent = CRUMBS[target] || '';
  $('#crumb').title = CRUMBS[target] || '';   // 面包屑可能被省略号截断，补一个原生提示
  const sc = $('.screen.is-active .scroll');
  if (sc) sc.scrollTop = 0;

  if (current === target) return;

  if (opts.fromHistory) {
    navDepth = Math.max(0, navDepth - 1);
  } else if (opts.replace) {
    navDepth = 0;
    history.replaceState({ screen: target }, '', '#' + target);
  } else {
    navDepth++;
    history.pushState({ screen: target }, '', '#' + target);
  }
}

// 浏览器前进 / 后退 / 手机侧滑返回
window.addEventListener('popstate', e => {
  const t = (e.state && e.state.screen) || 'today';
  goScreen(t, { fromHistory: true });
});

function openSheet(name) {
  const layer = $('#sheet-layer');
  layer.classList.add('is-open');
  $$('.sheet').forEach(s => s.classList.toggle('is-open', s.dataset.sheet === name));
  if (name === 'info') { /* 由调用方填充内容 */ }
  if (state.read) {
    const sheet = $('.sheet.is-open');
    if (sheet) speak(sheet.innerText.replace(/\s+/g, ' ').slice(0, 180));
  }
}

function closeSheets() {
  $('#sheet-layer').classList.remove('is-open');
  $$('.sheet').forEach(s => s.classList.remove('is-open'));
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function applyState() {
  // 儿童版 = 岛内人孩子 + 家长的共用视角（岛外人版暂只做青少年）
  if (state.mode === 'child') state.role = 'insider';
  body.dataset.intensity = state.intensity;
  body.dataset.font = state.font;
  body.dataset.contrast = state.contrast ? 'on' : 'off';
  body.dataset.motion = state.motion ? 'on' : 'off';
  body.dataset.role = state.role;
  body.dataset.mode = state.mode;
  body.dataset.theme = state.theme;
  // 主题切换图标：黑夜显示太阳（点击切白天），白天显示月亮（点击切黑夜）
  const themeIcon = $('#theme-icon use');
  if (themeIcon) themeIcon.setAttribute('href', state.theme === 'dark' ? '#i-uv' : '#i-moon');
  const themeBtn = $('#btn-theme');
  if (themeBtn) themeBtn.title = state.theme === 'dark' ? '切换到白天模式' : '切换到黑夜模式';
  const names = { calm: '静夜', glow: '微光', meteor: '流星' };
  const intensityText = $('#intensity-text');
  if (intensityText) intensityText.textContent = names[state.intensity];
  const intensityRow = $('#intensity-row');
  if (intensityRow) intensityRow.textContent = names[state.intensity];
  const roleText = $('#role-text');
  if (roleText) roleText.textContent = state.role === 'visitor' ? '岛外人' : '岛内人';
  const modeRow = $('#mode-row');
  if (modeRow) modeRow.textContent = state.mode === 'child' ? '儿童版' : '青少年版';
  const themeRow = $('#theme-row');
  if (themeRow) themeRow.textContent = state.theme === 'light' ? '白天模式' : '黑夜模式';
  $$('.identitycard').forEach(c => c.classList.toggle('is-on', c.dataset.roleValue === state.role));
  $$('[data-choice="mode"] button').forEach(b => b.classList.toggle('is-on', b.dataset.value === state.mode));
  $$('[data-choice="intensity"] button').forEach(b => b.classList.toggle('is-on', b.dataset.value === state.intensity));
  $$('[data-choice="font"] button').forEach(b => b.classList.toggle('is-on', b.dataset.value === state.font));
  $$('.switch[data-toggle="contrast"]').forEach(s => { s.classList.toggle('is-on', state.contrast); s.setAttribute('aria-checked', String(state.contrast)); });
  $$('.switch[data-toggle="read"]').forEach(s => { s.classList.toggle('is-on', state.read); s.setAttribute('aria-checked', String(state.read)); });
  $$('.switch[data-toggle="motion"]').forEach(s => { s.classList.toggle('is-on', state.motion); s.setAttribute('aria-checked', String(state.motion)); });
  if (state.mode === 'child') { meteors = []; }
  buildStars();
}

function roleToast() {
  return state.role === 'visitor'
    ? '岛外人视角：先了解，再靠近'
    : '岛内人视角：这里是你自己的地方';
}

/* ============================================================
   科普三级页（课程正文）
   ------------------------------------------------------------
   二级页的 26 张课程卡片里，正文一直躺在 hidden 的 .lcard__more 里。
   点卡片 = 把那一张卡的图 / 编号 / 标题 / 导语 / 正文搬进三级页；
   「上一条 / 下一条」只在同一课内走，到头就置灰。
   内容只有一份，不复制、不重打字，配图图位（data-slot）也不受影响。
   ============================================================ */
const ARTICLES = [];
const ARTICLE_INDEX = {};

function buildArticleIndex() {
  ARTICLES.length = 0;
  $$('[data-article]').forEach(card => {
    const key = card.dataset.article;
    const screen = card.closest('.screen');
    const source = screen ? screen.dataset.screen : '';
    const more = $('.lcard__more', card);
    const figure = $('.lcard__figure', card);
    const text = el => (el ? el.textContent.trim() : '');
    const item = {
      key,
      source,
      crumb: CRUMBS[source] || '正文',
      lessonTitle: text(screen && $('.subhead__title', screen)),
      no: text($('.lcard__no', card)),
      title: text($('.lcard__title', card)),
      lead: text($('.lcard__lead', card)),
      figureHTML: figure ? figure.innerHTML : '',
      bodyHTML: more ? more.innerHTML : ''
    };
    ARTICLES.push(item);
    ARTICLE_INDEX[key] = item;
  });
}

function openArticle(key, opts) {
  const item = ARTICLE_INDEX[key];
  if (!item) return;

  const fig = $('#article-figure');
  if (fig) fig.innerHTML = item.figureHTML;
  const no = $('#article-no');
  if (no) { no.textContent = item.no; no.hidden = !item.no; }
  const title = $('#article-title');
  if (title) title.textContent = item.title;
  const lead = $('#article-lead');
  if (lead) { lead.textContent = item.lead; lead.hidden = !item.lead; }
  const bodyEl = $('#article-body');
  if (bodyEl) bodyEl.innerHTML = item.bodyHTML;

  goScreen('lesson-article', opts);
  // goScreen 会按 CRUMBS 写面包屑，这里再改成这一课的名字
  $('#crumb').textContent = item.crumb;
  $('#crumb').title = item.crumb;
  const head = $('#article-crumb');
  if (head) head.textContent = item.lessonTitle || item.crumb;
  const back = $('#article-back');
  if (back) back.dataset.screenJump = item.source;

  const siblings = ARTICLES.filter(a => a.source === item.source);
  const pos = siblings.indexOf(item);
  const prev = siblings[pos - 1];
  const next = siblings[pos + 1];
  const prevBtn = $('#article-prev');
  const nextBtn = $('#article-next');
  if (prevBtn) { prevBtn.disabled = !prev; prevBtn.dataset.articleGo = prev ? prev.key : ''; }
  if (nextBtn) { nextBtn.disabled = !next; nextBtn.dataset.articleGo = next ? next.key : ''; }

  const sc = $('.screen[data-screen="lesson-article"] .scroll');
  if (sc) sc.scrollTop = 0;
  if (state.read) speak(item.title + '。' + item.lead);
}

/* =========================================================
   事件绑定
   ========================================================= */
function bind() {
  // 底部导航（青少年版 / 儿童版各一套）
  $$('.tab[data-screen-target]').forEach(tab =>
    tab.addEventListener('click', () => goScreen(tab.dataset.screenTarget)));
  $$('.tab[data-child-target]').forEach(tab =>
    tab.addEventListener('click', () => goScreen(tab.dataset.childTarget)));

  // 页面内跳转（卡片里的"去听他们的声音""回到孩子的月亮岛"等）
  document.addEventListener('click', e => {
    const jump = e.target.closest('[data-screen-jump]');
    // 二级页的返回按钮交给下面的历史栈处理，这里跳过
    if (jump && !jump.classList.contains('backbtn')) { e.stopPropagation(); goScreen(jump.dataset.screenJump); }
  });

  // 二级页返回：优先退历史栈；如果是从外部直接打开的（栈里没有上一级），
  // 就按按钮上写的父级页面走，而不是把人送出原型。
  $$('.backbtn').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    if (navDepth > 0) history.back();
    else goScreen(btn.dataset.screenJump || 'today', { replace: true });
  }));

  // 课程卡片 → 三级页（正文）
  // 内容不搬家：正文还是二级页里那个 hidden 的 .lcard__more，
  // 这里只把它和图片、编号、标题、导语一起搬到三级页去渲染。
  $$('[data-article]').forEach(card => {
    const open = e => {
      if (e && e.target && e.target.closest('a, button')) return;
      openArticle(card.dataset.article);
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); }
    });
  });

  // 三级页的「上一条 / 下一条」
  ['#article-prev', '#article-next'].forEach(sel => {
    const btn = $(sel);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const key = btn.dataset.articleGo;
      if (key) openArticle(key);
    });
  });

  // 星球分段
  $$('.seg').forEach(seg => seg.addEventListener('click', () => {
    $$('.seg').forEach(s => s.classList.toggle('is-active', s === seg));
    $$('.segview').forEach(v => v.classList.toggle('is-active', v.dataset.segview === seg.dataset.seg));
  }));

  // 月相
  document.addEventListener('click', e => {
    const btn = e.target.closest('.phases button');
    if (!btn) return;
    e.stopPropagation();
    setPhase(Number(btn.dataset.phaseValue), true);
  });

  // 打开浮层
  $$('[data-open]').forEach(el => {
    const handler = e => {
      // 月相卡片里的月相按钮只切换月相，不打开详情
      if (e && e.target && e.target.closest('.phases')) return;
      const name = el.dataset.open;
      if (name === 'bunk') {
        const card = $('#myth-list');
        if (card) {
          const scr = card.closest('.screen');
          if (scr && !scr.classList.contains('is-active')) goScreen(scr.dataset.screen);
          setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
        }
        return;
      }
      if (name === 'info') return;
      // 测验：每一课的「开始测验」打开自己的题组
      if (name === 'quiz') { startQuiz(el.dataset.quiz); return openSheet('quiz'); }
      if (name === 'help') { $('#doc').innerHTML = DOC; }
      openSheet(name);
    };
    el.addEventListener('click', handler);
    if (el.getAttribute('role') === 'button') {
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); } });
    }
  });

  // 科普条目
  $$('[data-topic]').forEach(el => el.addEventListener('click', () => {
    const t = TOPICS[el.dataset.topic];
    if (!t) return;
    $('#info-title').textContent = t.title;
    $('#info-body').innerHTML = t.html;
    openSheet('info');
  }));

  // 关闭
  $$('[data-close]').forEach(b => b.addEventListener('click', closeSheets));
  $('#sheet-layer').addEventListener('click', e => { if (e.target.id === 'sheet-layer') closeSheets(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheets(); });

  // 星空强度：顶栏按钮已收进「我的」，两处入口共用同一段逻辑
  const cycleIntensity = () => {
    const order = ['calm', 'glow', 'meteor'];
    state.intensity = order[(order.indexOf(state.intensity) + 1) % 3];
    applyState();
    const tips = { calm: '静夜：星星几乎不动，光最少', glow: '微光：星星慢慢呼吸', meteor: '流星：偶尔有一颗流星划过' };
    toast(tips[state.intensity]);
  };
  const intensityBtn = $('#btn-intensity');
  if (intensityBtn) intensityBtn.addEventListener('click', cycleIntensity);
  const intensityListRow = $('#row-intensity');
  if (intensityListRow) intensityListRow.addEventListener('click', cycleIntensity);

  // 青少年 / 儿童版
  const toggleMode = () => {
    state.mode = state.mode === 'teen' ? 'child' : 'teen';
    applyState();
    goScreen('today', { replace: true });
    toast(state.mode === 'child' ? '儿童版：孩子一屏，家长一屏' : roleToast());
  };
  const modeBtn = $('#btn-mode');
  if (modeBtn) modeBtn.addEventListener('click', toggleMode);
  const modeListRow = $('#row-mode');
  if (modeListRow) modeListRow.addEventListener('click', toggleMode);

  // 白天 / 黑夜
  const themeListRow = $('#row-theme');
  if (themeListRow) themeListRow.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyState();
    toast(state.theme === 'light' ? '白天模式：光线柔和的一天' : '黑夜模式：星星出来了');
  });

  // 顶栏：岛内人 / 岛外人
  $('#btn-role').addEventListener('click', () => openSheet('identity'));

  // 身份选择
  $$('.identitycard').forEach(c => c.addEventListener('click', () => {
    state.role = c.dataset.roleValue;
    applyState();
    closeSheets();
    goScreen('today', { replace: true });
    toast(state.role === 'visitor'
      ? '你正在以岛外人的身份参观：先了解，再靠近'
      : '欢迎回到岛上：这里是你自己的地方');
  }));

  // 顶栏：设计说明
  $('#btn-help').addEventListener('click', () => { $('#doc').innerHTML = DOC; openSheet('help'); });

  // 白天/黑夜模式切换（顶栏入口已收进「我的」，海报表有入口）
  const switchTheme = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyState();
    toast(state.theme === 'light' ? '☀️ 白天模式：光线柔和的一天' : '🌙 黑夜模式：星星出来了');
  };
  const themeBtn = $('#btn-theme');
  if (themeBtn) themeBtn.addEventListener('click', switchTheme);

  // 启动页：身份选择
  $$('[data-role-select]').forEach(btn => btn.addEventListener('click', () => {
    state.role = btn.dataset.roleSelect;
    state.started = true;
    applyState();
    const splash = $('#splash');
    if (splash) splash.classList.add('is-hidden');
    setTimeout(() => { if (splash) splash.style.display = 'none'; }, 450);
    // 显示新手引导
    const onboarding = $('#onboarding');
    if (onboarding) {
      onboarding.style.display = 'flex';
      setTimeout(() => onboarding.classList.remove('is-hidden'), 100);
    }
    goScreen('today', { replace: true });
    toast(state.role === 'visitor' ? '欢迎来岛上参观：先了解，再靠近' : '欢迎回到月亮岛：这里是你自己的地方');
  }));

  // 启动页：切换白天模式
  const splashTheme = $('#splash-theme');
  if (splashTheme) splashTheme.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyState();
    splashTheme.textContent = state.theme === 'light' ? '🌙 切回黑夜模式' : '☀️ 试试白天模式';
  });

  // 任务勾选：「今天的三件小事」右上角的计数跟着走
  const syncTaskCount = () => {
    const countEl = $('#task-count');
    const tasks = $$('#task-list .task');
    if (!countEl || !tasks.length) return;
    countEl.textContent = tasks.filter(t => t.classList.contains('is-done')).length + ' / ' + tasks.length;
  };
  $$('#task-list .task').forEach(t => t.addEventListener('click', () => {
    t.classList.toggle('is-done');
    syncTaskCount();
  }));
  $$('.kidtask').forEach(t => t.addEventListener('click', () => t.classList.toggle('is-done')));

  // 「今天最该做的一件事」：主按钮 = 把这件事打卡完成（顺带勾上「戴上滤光镜」）
  const focusDone = $('#focus-done');
  if (focusDone) focusDone.addEventListener('click', () => {
    if (focusDone.classList.contains('is-done')) return;
    const target = $$('#task-list .task')[1];        // 「今天的三件小事」第二条：戴上滤光镜
    if (target && !target.classList.contains('is-done')) target.classList.add('is-done');
    syncTaskCount();
    const stars = $('#today-stars');
    if (stars) stars.textContent = (Number(stars.textContent.replace(/[^\d]/g, '')) + 1) + ' 颗星';
    focusDone.classList.add('is-done');
    const label = focusDone.querySelector('span');
    if (label) label.textContent = '今天做好了';
    toast('✅ 完成！兔兔为你点赞');
  });

  /* 心情广场：点开哪一条，详情页就显示哪一条。
     内容不搬家——仍然只有「心情广场」里那一份，详情页在运行时把它读过去渲染，
     和科普三级页是同一套做法。 */
  const moodDetailEls = {
    phase: $('#mood-detail-phase'),
    name: $('#mood-detail-phase-name'),
    note: $('#mood-detail-phase-note'),
    text: $('#mood-detail-text'),
    meta: $('#mood-detail-meta'),
    read: $('#mood-detail-read'),
    replyTitle: $('#mood-detail-reply-title'),
    replies: $('#mood-detail-replies')
  };
  let currentMoodCard = null;      // 详情页现在显示的是哪一张心情卡
  const moodReplyCount = card => {
    const box = $('.mood__replies', card);
    return box ? box.querySelectorAll('.reply').length : 0;
  };
  // 详情页头部的数字、列表卡片上的「N 句回应」都从同一份内容里数出来
  const syncMoodReplyCount = card => {
    const n = moodReplyCount(card);
    const meta = $(':scope > small', card);
    if (meta) {
      const time = meta.textContent.split('·')[0].trim();
      meta.textContent = time + ' · ' + n + ' 句回应';
    }
    if (card === currentMoodCard && moodDetailEls.replyTitle) {
      moodDetailEls.replyTitle.textContent = n + ' 句匿名回应';
    }
  };
  const openMoodDetail = el => {
    const phaseEl = el.querySelector('.mood__phase');
    const i = Number(phaseEl && phaseEl.dataset.phase) || 0;
    const p = PHASES[i] || PHASES[0];
    const textEl = $(':scope > p', el);
    const timeEl = $(':scope > small', el);
    const text = textEl ? textEl.textContent.trim() : '';
    const time = timeEl ? timeEl.textContent.split('·')[0].trim() : '';
    if (moodDetailEls.phase) moodDetailEls.phase.innerHTML = phaseSVG(i, 32);
    if (moodDetailEls.name) moodDetailEls.name.textContent = p.name;
    if (moodDetailEls.note) moodDetailEls.note.textContent = p.note;
    if (moodDetailEls.text) moodDetailEls.text.textContent = text;
    if (moodDetailEls.meta) moodDetailEls.meta.textContent = time + ' · 匿名 · 仅岛内人可见';
    if (moodDetailEls.read) moodDetailEls.read.dataset.read = p.name + '。' + text;
    currentMoodCard = el;
    // 回应还是卡片里那一份，搬过来渲染，不复制
    const box = $('.mood__replies', el);
    if (moodDetailEls.replies) moodDetailEls.replies.innerHTML = box ? box.innerHTML : '';
    syncMoodReplyCount(el);
    goScreen('mood-detail');
  };
  $$('[data-mood-detail]').forEach(el => {
    el.addEventListener('click', () => openMoodDetail(el));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMoodDetail(el); }
    });
  });

  // 匿名回一句：发出去的那条同时写进详情页列表和卡片本身，退出再进来它还在
  const moodReplyInput = $('#mood-reply-input');
  const moodReplySend = $('#mood-reply-send');
  const sendMoodReply = () => {
    if (!moodReplyInput || !moodReplySend) return;
    const text = moodReplyInput.value.trim();
    if (!text) { toast('写点什么再发吧'); return; }
    if (!currentMoodCard) return;
    const box = $('.mood__replies', currentMoodCard);
    const div = document.createElement('div');
    div.className = 'reply';
    const avatar = document.createElement('span');
    avatar.className = 'avatar avatar--ghost';
    avatar.innerHTML = '<svg viewBox="0 0 24 24"><use href="#i-moon"/></svg>';
    const body = document.createElement('div');
    body.className = 'reply__body';
    const meta = document.createElement('div');
    meta.className = 'reply__meta';
    const who = document.createElement('b');
    who.textContent = '我';
    const when = document.createElement('span');
    when.textContent = '刚刚';
    meta.append(who, when);
    const p = document.createElement('p');
    p.textContent = text;                 // 走 textContent，不会被当成 HTML
    body.append(meta, p);
    div.append(avatar, body);

    if (moodDetailEls.replies) moodDetailEls.replies.appendChild(div.cloneNode(true));
    if (box) box.appendChild(div);
    syncMoodReplyCount(currentMoodCard);
    moodReplyInput.value = '';
    toast('已匿名发出');
    const last = moodDetailEls.replies && moodDetailEls.replies.lastElementChild;
    if (last) setTimeout(() => last.scrollIntoView({ behavior: 'smooth', block: 'end' }), 120);
  };
  if (moodReplySend && moodReplyInput) {
    moodReplySend.addEventListener('click', sendMoodReply);
    moodReplyInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMoodReply(); });
  }

  // 送星
  $$('.sendstar').forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('is-sent')) return;
    const num = b.querySelector('b');
    num.textContent = String(Number(num.textContent.replace(/,/g, '')) + 1);
    b.classList.add('is-sent');
    toast('你送给「' + b.dataset.starname + '」一颗星');
  }));

  // 帖子详情 · 发送回复
  const replySend = $('.replybar__send');
  const replyInput = $('.replybar__input');
  if (replySend && replyInput) {
    const sendReply = () => {
      const text = replyInput.value.trim();
      if (!text) { toast('写点什么再发吧'); return; }
      const list = $('.replylist');
      if (!list) return;
      const div = document.createElement('div');
      div.className = 'reply';
      div.innerHTML = '<span class="avatar avatar--ghost"><svg viewBox="0 0 24 24"><use href="#i-moon"/></svg></span>' +
        '<div class="reply__body">' +
        '<div class="reply__meta"><b>我</b><span>刚刚</span></div>' +
        '<p>' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>' +
        '<div class="reply__actions"><span><svg viewBox="0 0 24 24"><use href="#i-heart"/></svg>0</span></div>' +
        '</div>';
      list.appendChild(div);
      replyInput.value = '';
      toast('回复已发送');
      setTimeout(() => div.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
    };
    replySend.addEventListener('click', sendReply);
    replyInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendReply(); });
  }

  // 每日挑战 · 换一个
  const challenges = [
    '今天试着对一个人说：<b>"我的眼睛怕光，不是怕你。"</b>',
    '今天出门前，认真涂好每一寸防晒。',
    '今天记录一件让你觉得"我做到了"的小事。',
    '今天对一个陌生人的目光，回以微笑。',
    '今天试着在阳光下待 5 分钟，做好防护。',
    '今天给月球兔的小屋添一件新装饰。',
    '今天写下三句你喜欢自己的地方。'
  ];
  let challengeIdx = 0;
  const challengeNext = $('#challenge-next');
  const challengeText = $('#challenge-text');
  if (challengeNext && challengeText) {
    challengeNext.addEventListener('click', () => {
      challengeIdx = (challengeIdx + 1) % challenges.length;
      challengeText.innerHTML = challenges[challengeIdx];
      toast('换了一个新挑战，试试看～');
    });
  }
  // 每日挑战 · 我做到了（庆祝动画）
  const challengeDone = $('#challenge-done');
  const celebrate = $('#celebrate');
  if (challengeDone && celebrate) {
    challengeDone.addEventListener('click', () => {
      celebrate.classList.add('is-show');
      toast('🎉 太棒了！兔兔为你跳舞！');
      setTimeout(() => celebrate.classList.remove('is-show'), 2500);
    });
    celebrate.addEventListener('click', () => celebrate.classList.remove('is-show'));
  }

  // 发帖页 · 发布
  const postSubmit = $('#post-submit');
  const postText = $('#post-text');
  if (postSubmit && postText) {
    postSubmit.addEventListener('click', () => {
      const text = postText.value.trim();
      if (!text) { toast('写点什么再发布吧'); return; }
      goScreen('planet');
      toast('✨ 发布成功！你的话已经在打气墙上了');
      postText.value = '';
    });
  }

  // 写心情页 · 月相选择
  const moodPhases = $('#mood-phases');
  const moodPhaseLabel = $('#mood-phase-label');
  if (moodPhases && moodPhaseLabel) {
    PHASES.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.dataset.phaseValue = i;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-label', p.name);
      btn.innerHTML = `<span class="phase phase--${i}"></span>`;
      if (i === state.phase) btn.classList.add('is-on');
      moodPhases.appendChild(btn);
    });
    moodPhases.addEventListener('click', e => {
      const btn = e.target.closest('button[data-phase-value]');
      if (!btn) return;
      const idx = Number(btn.dataset.phaseValue);
      setPhase(idx, true);
      moodPhaseLabel.textContent = PHASES[idx].name + ' · ' + PHASES[idx].desc;
      $$('#mood-phases button').forEach((b, i) => b.classList.toggle('is-on', i === idx));
    });
  }
  // 写心情页 · 发布
  const moodSubmit = $('#mood-submit');
  const moodText = $('#mood-text');
  if (moodSubmit && moodText) {
    moodSubmit.addEventListener('click', () => {
      const text = moodText.value.trim();
      if (!text) { toast('写一句话再发布吧'); return; }
      goScreen('planet');
      toast('🌙 记下了今晚的月亮');
      moodText.value = '';
    });
  }

  // 新手引导
  const onboarding = $('#onboarding');
  const onboardingTrack = $('#onboarding-track');
  const onboardingDots = $$('#onboarding-dots span');
  const onboardingPrev = $('#onboarding-prev');
  const onboardingNext = $('#onboarding-next');
  let onboardingPage = 0;
  function updateOnboarding() {
    if (onboardingTrack) onboardingTrack.style.transform = `translateX(-${onboardingPage * 100}%)`;
    onboardingDots.forEach((d, i) => d.classList.toggle('is-active', i === onboardingPage));
    if (onboardingPrev) onboardingPrev.classList.toggle('is-hidden', onboardingPage === 0);
    if (onboardingNext) onboardingNext.style.display = onboardingPage === 2 ? 'none' : 'grid';
  }
  function closeOnboarding() {
    if (onboarding) onboarding.classList.add('is-hidden');
    setTimeout(() => { if (onboarding) onboarding.style.display = 'none'; }, 400);
  }
  if (onboardingPrev) onboardingPrev.addEventListener('click', () => { if (onboardingPage > 0) { onboardingPage--; updateOnboarding(); } });
  if (onboardingNext) onboardingNext.addEventListener('click', () => { if (onboardingPage < 2) { onboardingPage++; updateOnboarding(); } });
  const onboardingStart = $('#onboarding-start');
  if (onboardingStart) onboardingStart.addEventListener('click', closeOnboarding);
  const onboardingSkip = $('#onboarding-skip');
  if (onboardingSkip) onboardingSkip.addEventListener('click', closeOnboarding);

  // 搜索功能
  const searchInput = $('#search-input');
  const searchClear = $('#search-clear');
  const searchHot = $('#search-hot');
  const searchResult = $('#search-result');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim();
      if (searchClear) searchClear.classList.toggle('is-show', val.length > 0);
      if (searchHot) searchHot.style.display = val ? 'none' : 'block';
      if (searchResult) searchResult.style.display = val ? 'block' : 'none';
    });
    searchInput.addEventListener('focus', () => searchInput.parentElement.style.borderColor = 'rgba(122,92,184,0.5)');
    searchInput.addEventListener('blur', () => searchInput.parentElement.style.borderColor = '');
  }
  if (searchClear) searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('is-show');
    if (searchHot) searchHot.style.display = 'block';
    if (searchResult) searchResult.style.display = 'none';
  });
  // 热门搜索标签点击
  $$('.search__tag').forEach(tag => tag.addEventListener('click', () => {
    if (searchInput) { searchInput.value = tag.textContent; searchInput.dispatchEvent(new Event('input')); }
  }));

  // 通知标签切换
  $$('.notify-tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.notify-tab').forEach(t => t.classList.remove('is-active'));
    tab.classList.add('is-active');
  }));

  // 发帖/写心情标签点击
  $$('.compose__tag').forEach(tag => tag.addEventListener('click', () => {
    tag.classList.toggle('is-on');
  }));

  // 发帖/写心情字数统计
  const postTextEl = $('#post-text');
  if (postTextEl) {
    postTextEl.addEventListener('input', () => {
      const count = postTextEl.value.length;
      const countEl = postTextEl.closest('.compose__field').querySelector('.compose__count');
      if (countEl) countEl.textContent = `${count} / 200`;
    });
  }
  const moodTextEl = $('#mood-text');
  if (moodTextEl) {
    moodTextEl.addEventListener('input', () => {
      const count = moodTextEl.value.length;
      const countEl = moodTextEl.closest('.compose__field').querySelector('.compose__count');
      if (countEl) countEl.textContent = `${count} / 100`;
    });
  }

  // 打卡庆祝动画（完成任务时）
  $$('#task-list .task').forEach(task => {
    task.addEventListener('click', () => {
      setTimeout(() => {
        if (task.classList.contains('is-done')) {
          toast('✅ 完成！兔兔为你点赞');
        }
      }, 50);
    });
  });

  // 月相保存
  $('#save-moon').addEventListener('click', () => {
    const jar = $('.jar__fill');
    jar.style.setProperty('--fill', Math.min(100, Number(getComputedStyle(jar).getPropertyValue('--fill').replace('%', '')) + 2) + '%');
    closeSheets();
    toast('记下了：' + PHASES[state.phase].name + '。兔兔说谢谢你。');
  });

  // 设置项
  $$('[data-choice]').forEach(group => group.addEventListener('click', e => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    const which = group.dataset.choice;
    if (which === 'intensity') state.intensity = btn.dataset.value;
    if (which === 'font') state.font = btn.dataset.value;
    if (which === 'mode') state.mode = btn.dataset.value;
    applyState();
    if (which === 'mode') { closeSheets(); goScreen('today', { replace: true }); toast(state.mode === 'child' ? '已切换到儿童版' : '已切换到青少年版'); }
  }));
  $$('.switch[data-toggle]').forEach(sw => sw.addEventListener('click', () => {
    const key = sw.dataset.toggle;
    if (key === 'contrast') state.contrast = !state.contrast;
    if (key === 'read') state.read = !state.read;
    if (key === 'motion') state.motion = !state.motion;
    applyState();
    toast(key === 'contrast' ? (state.contrast ? '已增强对比度' : '已恢复标准对比度')
      : key === 'read' ? (state.read ? '点读朗读已打开' : '点读朗读已关闭')
      : (state.motion ? '动效已打开' : '已减少动效，界面会安静下来'));
  }));

  // 朗读
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-read]');
    if (el) { speak(el.dataset.read); return; }
    if (!state.read) return;
    const card = e.target.closest('.learncard, .cheer, .audio, .kidcard');
    if (card && !e.target.closest('[data-open], .sendstar, .audio__play')) speak(card.innerText.replace(/\s+/g, ' '));
  });

  // 音频条目
  $$('.audio').forEach(a => a.addEventListener('click', () => {
    $$('.audio').forEach(x => x.classList.remove('is-playing'));
    a.classList.add('is-playing');
    toast('正在播放：' + a.querySelector('h3').textContent);
  }));

  // 夜谈室
  $$('.room').forEach(r => r.addEventListener('click', () => toast('「' + r.dataset.room + '」需要先完成房间守则')));

  // 家长入口
  const ge = $('.guardian-entry');
  if (ge) ge.addEventListener('click', () => goScreen('child-guardian'));

  // 儿童版故事
  $$('.storycard').forEach(s => s.addEventListener('click', () => {
    $$('.storycard').forEach(x => x.classList.remove('storycard--on'));
    s.classList.add('storycard--on');
    toast('正在播放：' + s.querySelector('h3').textContent);
  }));

  // 岛外人测验
  $('#quiz').addEventListener('click', e => {
    const btn = e.target.closest('.quiz__opt');
    if (!btn) return;
    const qEl = btn.closest('.quiz__q');
    if (qEl.dataset.answered) return;
    qEl.dataset.answered = '1';
    const item = currentQuiz.items[Number(qEl.dataset.q)];
    const picked = Number(btn.dataset.opt);
    $$('.quiz__opt', qEl).forEach((b, i) => {
      if (i === item.right) b.classList.add('is-right');
      else if (i === picked) b.classList.add('is-wrong');
    });
    const why = $('.quiz__why', qEl);
    why.textContent = (picked === item.right ? '答对了。' : '这句被说反了：') + item.why;
    why.hidden = false;
    answered++;
    if (answered >= currentQuiz.items.length) {
      $('#quizdone').classList.add('is-on');
      const won = state.role === 'visitor' && currentQuizKey === QUIZ_DEFAULT;
      toast(won ? '你拿到了守护者徽章' : '这一课过关了');
    }
  });

  // 每日挑战
  const pb = $('.challenge__row .primary-btn');
  if (pb) pb.addEventListener('click', () => toast('已记录。第 7 天完成。'));

  window.addEventListener('resize', resize);
}

/* =========================================================
   启动
   ========================================================= */
function init() {
  resize();
  requestAnimationFrame(t => { lastFrame = t; draw(t); });

  buildPhaseGroup($('#today-phases'), 26, false);
  buildPhaseGroup($('#sheet-phases'), 42, true);
  buildPhaseGroup($('#kid-phases'), 30, false);
  $$('.mood__phase').forEach(el => { el.innerHTML = phaseSVG(Number(el.dataset.phase), 24); });
  setPhase(state.phase, false);

  // 心情统计：每行前面挂上同名月相的小图标，用的是同一套 phaseSVG
  $$('.moodstats__phase').forEach(el => {
    el.insertAdjacentHTML('afterbegin', phaseSVG(Number(el.dataset.phase) || 0, 20));
  });

  // 月相轨迹：本月记录
  const pattern = [4, 2, 0, 1, 3, 4, 1, 7, 2, 4, 5, 0, 3, 4, 6, 1, 2, 4];
  const slots = pattern.map(i => phaseSVG(i, 22)).concat(Array.from({ length: 9 }, () => phaseSVG(0, 22)));
  const trail = $('#trail');
  if (trail) trail.innerHTML = slots.map((svg, i) =>
    '<span class="' + (i < pattern.length ? '' : 'is-empty') + '">' + svg + '</span>').join('');

/* 首页只放几条最容易传错的，其余展开看 */
const MYTH_PREVIEW = 4;
const renderMyths = (limit) => MYTHS.slice(0, limit).map(m =>
  '<li class="myth">' +
  '<span class="myth__bad"><svg viewBox="0 0 24 24"><use href="#i-info"/></svg>' + m.bad + '</span>' +
  '<span class="myth__ok"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg>' + m.ok + '</span>' +
  '</li>').join('');
$('#myth-list').innerHTML = renderMyths(MYTH_PREVIEW);
const mythMore = $('#myth-more');
if (mythMore) mythMore.addEventListener('click', () => {
  const open = mythMore.dataset.open === '1';
  $('#myth-list').innerHTML = renderMyths(open ? MYTH_PREVIEW : MYTHS.length);
  mythMore.dataset.open = open ? '0' : '1';
  mythMore.textContent = open ? '全部 6 条' : '收起';
});

  buildArticleIndex();
  startQuiz(QUIZ_DEFAULT);
  bind();
  applyState();
  // 支持带 hash 直接打开某一屏（例如 index.html#lesson-family），
  // 否则默认从「今日」开始。
  const fromHash = location.hash.replace('#', '');
  if (fromHash === 'lesson-article' && ARTICLES.length) {
    // 三级页的内容是运行时填的：直接开这个 hash 时先铺上第一条，
    // 免得出现一个空壳页面。
    openArticle(ARTICLES[0].key, { replace: true });
  } else {
    goScreen(fromHash && CRUMBS[fromHash] ? fromHash : 'today', { replace: true });
  }
}

init();

/* ============================================================
   精选图文（公众号风二级页）
   ============================================================ */
const FEATURED = [
  {
    cover: 'assets/featured-mooncard.jpg',
    coverAlt: '桌面上摊着一张深蓝色卡纸，贴着金色弯月、白色小兔子和星星贴纸',
    title: '我给妹妹做了一张"月亮卡"',
    author: '月光碎片', time: '2 天前 · 漫画',
    lead: '妹妹五岁生日前一周，我熬了两个晚上，做了一张卡片给她。卡片上画了一轮弯月，和一只坐在月亮上的兔子。',
    paragraphs: [
      '妹妹和我一样，有白化病。她还不懂什么是"不一样"，只知道自己怕太阳，出门要戴帽子，眼睛进了强光会难受。',
      '班上的同学问她："你为什么总是戴帽子呀？"她答不上来，回来问我。我蹲下来想了想，说："因为我们是月亮宝宝呀，月亮宝宝怕太阳，所以月亮爷爷送了我们帽子。"',
      '她听完眼睛亮了一下："那我也是月亮宝宝？"我说："对，你是我最宝贝的月亮宝宝。"',
      '后来我决定，把这句话做成一张真的卡片。深蓝色的卡纸，金色的月亮，白色的小兔子——兔子和月亮，都是我们。'
    ],
    quote: '月亮缺一角，也还是月亮。',
    sub: '为什么是一张月亮卡',
    subParagraphs: [
      '因为我想让她知道：别人有的生日礼物是裙子、玩具，我们也可以有属于自己的符号。月亮不是残缺，是另一种完整的光。',
      '卡片做好那天，她在台灯下看了很久，然后抬起头认真地说："姐姐，等我长大了，也要给别的小朋友做月亮卡。"'
    ],
    tags: ['漫画', '妹妹', '礼物', '月亮卡'],
    stars: 3182
  },
  {
    cover: 'assets/lesson-dna.png',
    title: '白化病会不会越来越严重？',
    author: '岛上科普组', time: '4 天前 · 科普',
    lead: '这是科普区被问得最多的问题之一，今天认真讲清楚。',
    paragraphs: [
      '先说结论：白化病是基因决定的先天性状况，它不会"越来越严重"，也不会"治好"，它一直是它。',
      '白化病主要影响两件事：皮肤黑色素和眼睛的色素。黑色素少，所以皮肤、头发颜色浅，怕晒；眼睛色素少，所以畏光、视力可能受影响。',
      '这两件事在出生时就决定了，之后不会像某些疾病那样"加重"。需要注意的是并发症和继发问题——比如长期不防晒导致皮肤晒伤，或者视力问题没有被及时矫正。',
      '所以"越来越严重"的感觉，很多时候不是病在变重，而是防护没跟上、问题没被看见。'
    ],
    quote: '白化病不是越来越严重，而是越来越会照顾自己。',
    sub: '家长最该关注的三件事',
    subParagraphs: [
      '① 眼睛：定期做眼科检查，配合适的滤光镜或助视器，很多"看不清"是可以被帮助的。',
      '② 皮肤：出门防晒不是矫情，是每天的功课。SPF50+、宽檐帽、长袖衣物，缺一不可。',
      '③ 心理：孩子要面对的目光很多，教会他回答、也教会他拒绝——这两样都是保护。'
    ],
    tags: ['科普', '遗传', '辟谣', '家长'],
    stars: 2470
  },
  {
    cover: 'assets/featured-pool.jpg',
    coverAlt: '水面之下往上看，蓝色水里浮着气泡，水面透出粉白色天光',
    title: '在泳池边，我第一次脱下防晒衣',
    author: '潮汐', time: '5 天前 · 音频',
    lead: '18 岁那个夏天，我第一次在人群里脱下防晒衣，跳进了泳池。',
    paragraphs: [
      '从小我妈就给我穿长袖长裤，夏天也一样。她总说："晒不得，晒了会起疹子。"所以我从来没在人前露过胳膊。',
      '高三毕业那天，同学们约着去水上乐园。我站在泳池边犹豫了很久，防晒衣的拉链被我捏得发烫。',
      '最后是一个女生先跳了下去，回头喊我："下来啊，水里面没有太阳！"我愣住了，然后笑了——对啊，水里面没有太阳。',
      '我脱了防晒衣跳下去。水很凉，阳光在头顶晃，但那时候我第一次觉得，夏天也是可以属于我的。'
    ],
    quote: '皮肤白不是病，怕光也不是错。',
    sub: '后来我才明白的事',
    subParagraphs: [
      '那次之后我学会了两件事：第一，防护要做足，防晒霜、帽子、时间段都要讲究；第二，但不要把自己活成一座随时躲起来的岛。',
      '可以怕太阳，也可以享受没有太阳的时刻。可以穿防晒衣，也可以在某些安全的时刻，把它脱下来。'
    ],
    tags: ['音频', '故事', '夏天', '18岁'],
    stars: 1905
  }
];

const featuredBody = $('#featured-body');
if (featuredBody) {
  function renderFeatured(i) {
    const f = FEATURED[i] || FEATURED[0];
    let html = `
      <article class="featured">
        <img class="featured__cover" src="${f.cover}" alt="${f.coverAlt}">
        <h1 class="featured__title">${f.title}</h1>
        <div class="featured__meta">
          <span class="featured__avatar">🌙</span>
          <span>${f.author} · ${f.time}</span>
        </div>
        <p class="featured__lead">${f.lead}</p>
        <div class="featured__body">`;
    f.paragraphs.forEach(p => { html += `<p>${p}</p>`; });
    html += `</div>
        <div class="featured__quote">"${f.quote}"</div>
        <div class="featured__sub">${f.sub}</div>
        <div class="featured__body">`;
    f.subParagraphs.forEach(p => { html += `<p>${p}</p>`; });
    html += `</div>
        <div class="featured__tags">`;
    f.tags.forEach(t => { html += `<span class="featured__tag"># ${t}</span>`; });
    html += `</div>
        <div class="featured__foot">
          <button class="primary-btn sendstar" data-starname="${f.author}"><svg viewBox="0 0 24 24"><use href="#i-star"/></svg>送一颗星 <b>${f.stars}</b></button>
        </div>
      </article>`;
    featuredBody.innerHTML = html;
    const starBtn = featuredBody.querySelector('.sendstar');
    if (starBtn) starBtn.addEventListener('click', () => {
      const b = starBtn.querySelector('b');
      if (b) b.textContent = Number(b.textContent.replace(/,/g, '')) + 1;
      toast('⭐ 星已送出，兔兔帮你转达');
    });
  }
  $$('[data-featured]').forEach(rank => {
    rank.addEventListener('click', () => {
      renderFeatured(Number(rank.dataset.featured));
      goScreen('featured-detail');
    });
  });
}
