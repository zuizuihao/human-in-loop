/* 演示数据：单价、节点类型、模型、Agent 团队（导演 + 子 Agent）。场景级 Skill 在 skills.js，导演 Skill 在 director.js */
const PRICE={img:0.2,board:0.8,video:{draft:6,final:18}}; // 元，模拟
const BUDGET=500;
const KIND={
 text:{n:'剧本',i:'📝',c:'k-text'},
 shot:{n:'分镜',i:'📋',c:'k-shot'},
 board:{n:'故事板',i:'🧩',c:'k-board'},
 char:{n:'角色',i:'🧑‍🎨',c:'k-char'},
 prop:{n:'道具',i:'🧰',c:'k-prop'},
 scene:{n:'场景',i:'🏞️',c:'k-scene'},
 video:{n:'视频段',i:'🎞️',c:'k-video'},
 out:{n:'成片',i:'🎬',c:'k-out'}};
const ASSET_KINDS=['char','prop','scene'];
const MODELS={text:'LLM',shot:'LLM',board:'seedream-5-pro',char:'seedream-4',prop:'seedream-4',scene:'seedream-4',video:'seedance-2.5',out:'按段拼接'};
const ORC={name:'导演 Agent',av:'🎬',desc:'总控：用导演 Skill 诊断项目、给出下一步、调度子 Agent、管审批和预算'};
// 子 Agent 按负责的节点类型索引；成片只做拼接，由导演直接处理。skills 是该 Agent 的角色级 Skill
const AGENTS={
 text:{name:'剧本 Agent',av:'✍️',desc:'写剧本、按 Skill 节拍拆段、改台词和钩子',skills:['节拍拆段','钩子改写','台词口语化'],sugs:['把开头 3 秒钩子写得更狠','台词更口语化','压缩时长']},
 shot:{name:'分镜 Agent',av:'📋',desc:'每段一张镜头表：景别、运镜、动作、声音、时长',skills:['镜头表','景别节奏','轴线检查'],sugs:['加一个反应镜头','检查镜头衔接','景别拉开一点']},
 board:{name:'故事板 Agent',av:'🧩',desc:'按镜头表和资产出标注故事板图（2×2 / 3×3）',skills:['2×2 故事板','3×3 分镜图','构图调整'],sugs:['改成夜景','构图再紧一点','重新出图']},
 char:{name:'角色 Agent',av:'🧑‍🎨',desc:'每个角色一张资产卡：定妆、三视图、表情、连续性锁',skills:['定妆图','三视图','表情板','换装'],sugs:['检查角色一致性','补一张表情板','换一套造型']},
 prop:{name:'道具 Agent',av:'🧰',desc:'每个道具一张道具卡：多角度、细节、道具锁',skills:['道具多角度','细节特写','道具锁'],sugs:['补一张细节特写','检查道具一致性']},
 scene:{name:'场景 Agent',av:'🏞️',desc:'每个场景一张场景卡：主空镜、机位、光线',skills:['主空镜','机位图','光线统一'],sugs:['加一个夜景版本','给出 3 个常用机位','统一色调']},
 video:{name:'视频 Agent',av:'🎞️',desc:'按故事板直出带声音的视频；样片→正片、修补（edit）、续拍（extend）',skills:['图生视频','局部修补','续拍'],sugs:['动作更夸张一点','续拍 3 秒','修补穿帮']}};
const STX={idle:'待生成',running:'生成中',done:'已完成',stale:'待更新'};

// 每个 Agent 一个 Agent Skill（对应仓库里的 .agents/skills/<id>/SKILL.md）；场景级 Skill 作为叠加参数传进来
const AGENT_SKILLS={
 orc:{id:'drama-director',doc:'docs/design/requirements.md',in:'项目里所有节点的状态、已过的审批门、预算',out:'下一步建议、执行计划、调度子 Agent、审批卡',
  steps:['对照阶段和审批门诊断项目','选出下一步：缺失 → 待更新 → 待审批','需要人的地方停下来出审批卡','把任务派给对应子 Agent，结果落到画布'],checks:['花钱前先过审批门和预算','没有样片批准不出正片','上游改动后下游标为待更新']},
 text:{id:'drama-script',doc:'—（由 skill 负责）',in:'一句话创意 / 大纲 / 小说片段 + 场景 Skill 的节拍',out:'剧本：分段、钩子、反转、卡点、对白',
  steps:['按场景 Skill 的节拍拆段','写对白和画外音','标注钩子和卡点'],checks:['开头 3 秒有冲突','每段时长在 4–30s','台词短句口语化']},
 shot:{id:'drama-shotlist',doc:'docs/practices/05-storyboard.md',in:'剧本分段 + 资产表',out:'每段一张镜头表：景别、运镜、动作、声音、时长、引用资产',
  steps:['每段拆 2–4 镜','写景别 / 运镜 / 动作','把对白、音效、画外音按时间轴写进镜头'],checks:['景别有变化','对话遵守 180° 轴线','每镜只有一个主要动作']},
 board:{id:'drama-storyboard',doc:'docs/practices/05-storyboard.md',in:'镜头表 + 角色 / 道具 / 场景参考图',out:'每段一张标注故事板图（2×2 / 3×3）',
  steps:['按镜头数选版式','每格一个关键姿态','挂上本段引用的资产参考图'],checks:['格子顺序和镜头表一致','没有参考的变体不画进故事板','角色和资产卡一致']},
 char:{id:'drama-character',doc:'docs/practices/01-character-design.md',in:'剧本和镜头表里出现的角色',out:'角色资产卡 + 定妆 / 三视图 / 表情 / 细节 + 连续性锁',
  steps:['写身份特征和连续性锁','定妆图 → 三视图（人审）→ 单视图','需要时出表情板、换装'],checks:['提示词顺序：用途 → 身份 → 造型 → 版式 → 光线 → 排除','参考图中性白光','锁的文字和参考图一致']},
 prop:{id:'drama-prop',doc:'docs/practices/03-props.md',in:'镜头表里出现的道具',out:'道具卡 + 多角度 / 细节图 + 道具锁',
  steps:['列出关键道具和外观特征','出多角度与细节','写道具锁'],checks:['道具在每镜可识别','文字和 Logo 用清晰参考图，不让模型新写']},
 scene:{id:'drama-scene',doc:'docs/practices/04-scene-design.md',in:'剧本和镜头表里出现的场景',out:'场景卡 + 主空镜 / 机位 / 光线',
  steps:['出主空镜','出常用机位和反打','统一光线和色调'],checks:['空镜里没有人物','方位和机位前后一致']},
 video:{id:'drama-video',doc:'docs/practices/07-video-generation.md',in:'故事板 + 资产参考图 + 镜头表时间轴',out:'每段一条带声音的视频（样片 / 正片），修补和续拍',
  steps:['按时间轴写视频提示词，声音直出、不要背景音乐','先出样片，批准后出正片','穿帮用 edit 修补，接不上用 extend 续拍'],checks:['没有样片批准不出正片','每段末镜可以接下一段','不加字幕']}};
ORC.skill=AGENT_SKILLS.orc;Object.entries(AGENTS).forEach(([k,a])=>a.skill=AGENT_SKILLS[k]);
