export const knowledgeBase = [
  {
    id: 'K001',
    category: '糖尿病',
    title: 'GLP-1受体激动剂基础知识',
    content: `GLP-1（胰高血糖素样肽-1）受体激动剂是一类用于治疗2型糖尿病的药物。

【作用机制】
- 模拟GLP-1的作用，增强胰岛素分泌
- 抑制胰高血糖素分泌
- 延缓胃排空
- 增加饱腹感

【常见药物】
- 短效：艾塞那肽、利西拉来
- 长效：利拉鲁肽、司美格鲁肽、度拉糖肽

【副作用】
- 胃肠道反应（恶心、呕吐）
- 胰腺炎风险（罕见）
- 甲状腺C细胞肿瘤风险（罕见）

【注意事项】
- 适用于2型糖尿病患者
- 不适用于1型糖尿病
- 需配合饮食控制和运动`,
    keywords: ['GLP-1', '受体激动剂', '糖尿病', '胰岛素', '降糖药']
  },
  {
    id: 'K002',
    category: '减重',
    title: '减重药物概述',
    content: `目前FDA批准的减重药物主要有以下几类：

【GLP-1类】
- 司美格鲁肽（Semaglutide）
- 利拉鲁肽（Liraglutide）
- 替尔泊肽（Tirzepatide）

【作用原理】
- 抑制食欲
- 延缓胃排空
- 增加能量消耗

【疗效】
- 平均减重10-20%
- 需长期使用

【安全性】
- 需医生处方
- 定期监测
- 配合生活干预`,
    keywords: ['减重', '减肥', 'GLP-1', '司美格鲁肽', '肥胖']
  },
  {
    id: 'K003',
    category: '营养',
    title: '糖尿病患者饮食指南',
    content: `糖尿病患者的饮食管理是血糖控制的关键。

【基本原则】
- 定时定量
- 均衡营养
- 控制总热量
- 选择低GI食物

【推荐食物】
- 全谷物
- 蔬菜水果（适量）
- 优质蛋白
- 健康脂肪

【避免食物】
- 高糖食品
- 精制碳水
- 饱和脂肪
- 加工食品

【饮食建议】
- 少油少盐
- 细嚼慢咽
- 先吃蔬菜后吃主食
- 控制饮酒`,
    keywords: ['糖尿病', '饮食', '营养', '血糖', 'GI', '食谱']
  },
  {
    id: 'K004',
    category: '糖尿病',
    title: '血糖监测与控制目标',
    content: `血糖监测是糖尿病管理的重要组成部分。

【监测指标】
- 空腹血糖：4.4-7.0 mmol/L
- 餐后2h血糖：<10.0 mmol/L
- 糖化血红蛋白（HbA1c）：<7%

【监测频率】
- 胰岛素治疗者：每日多次
- 口服药物者：每周2-3次
- 稳定期：每周1次

【控制重要性】
- 预防并发症
- 减少心血管风险
- 提高生活质量`,
    keywords: ['血糖', '监测', 'HbA1c', '糖尿病', '控制目标']
  },
  {
    id: 'K005',
    category: '减重',
    title: '生活方式干预减重',
    content: `生活方式干预是减重的基础治疗。

【饮食干预】
- 热量限制：每日减少500-750kcal
- 均衡饮食
- 控制碳水化合物

【运动干预】
- 有氧运动：每周150分钟以上
- 抗阻训练：每周2-3次
- 增加日常活动

【行为干预】
- 自我监测
- 目标设定
- 问题解决
- 压力管理

【效果】
- 减重5-10%可显著改善代谢`,
    keywords: ['减重', '生活方式', '运动', '饮食干预', '肥胖']
  }
];

export function searchKnowledge(keywords, limit = 3) {
  const results = [];
  const keywordList = keywords.toLowerCase().split(/[\s,，]+/).filter(k => k.length > 1);

  for (const article of knowledgeBase) {
    let score = 0;
    const articleText = (article.title + ' ' + article.content).toLowerCase();
    const articleKeywordsLower = article.keywords.map(k => k.toLowerCase());

    for (const kw of keywordList) {
      if (article.title.toLowerCase().includes(kw)) score += 3;
      if (article.category.toLowerCase().includes(kw)) score += 2;
      if (articleText.includes(kw)) score += 1;
      if (articleKeywordsLower.some(ak => ak.includes(kw) || kw.includes(ak))) score += 2;
    }

    if (score > 0) {
      results.push({ ...article, relevanceScore: score });
    }
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return results.slice(0, limit);
}

export function getKnowledgeContext(topic, limit = 3) {
  const relevantArticles = searchKnowledge(topic, limit);

  if (relevantArticles.length === 0) {
    return {
      context: '',
      articles: []
    };
  }

  const contextParts = relevantArticles.map((article, index) => {
    return `[知识${index + 1}] ${article.title}\n${article.content}`;
  });

  return {
    context: '\n\n' + contextParts.join('\n\n'),
    articles: relevantArticles,
    articleCount: relevantArticles.length
  };
}

export function getCategories() {
  const categories = [...new Set(knowledgeBase.map(k => k.category))];
  return categories;
}

export function getArticlesByCategory(category) {
  return knowledgeBase.filter(k => k.category === category);
}