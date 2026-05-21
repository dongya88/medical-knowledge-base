export const userComments = [
  {
    id: 'C001',
    platform: 'wechat',
    topic: 'GLP-1',
    content: '打GLP-1真的会反弹吗？我停了两个月感觉体重回来了',
    sentiment: 'concern',
    keywords: ['GLP-1', '反弹', '停药']
  },
  {
    id: 'C002',
    platform: 'douyin',
    topic: '糖尿病饮食',
    content: '糖尿病真的什么都不能吃吗？感觉人生都没意思了',
    sentiment: 'frustrated',
    keywords: ['糖尿病', '饮食', '不能吃']
  },
  {
    id: 'C003',
    platform: 'xiaohongshu',
    topic: '减重',
    content: '运动加控制饮食一个月才瘦5斤，是不是太慢了？',
    sentiment: 'confused',
    keywords: ['减重', '运动', '瘦', '慢']
  },
  {
    id: 'C004',
    platform: 'wechat',
    topic: 'GLP-1',
    content: '打针疼不疼啊？副作用大不大？',
    sentiment: 'worried',
    keywords: ['GLP-1', '副作用', '疼']
  },
  {
    id: 'C005',
    platform: 'douyin',
    topic: '血糖',
    content: '空腹血糖7.0是不是糖尿病了？要不要吃药？',
    sentiment: 'anxious',
    keywords: ['血糖', '空腹', '糖尿病', '吃药']
  },
  {
    id: 'C006',
    platform: 'xiaohongshu',
    topic: '减重',
    content: '168间接性断食真的有用吗？会不会饿出毛病？',
    sentiment: 'questioning',
    keywords: ['减重', '断食', '168', '饿']
  },
  {
    id: 'C007',
    platform: 'wechat',
    topic: '营养',
    content: '无糖食品是不是可以随便吃？',
    sentiment: 'confused',
    keywords: ['无糖', '食品', '随便吃']
  },
  {
    id: 'C008',
    platform: 'douyin',
    topic: 'GLP-1',
    content: '司美格鲁肽和利拉鲁肽哪个效果好？',
    sentiment: 'questioning',
    keywords: ['GLP-1', '司美格鲁肽', '利拉鲁肽', '效果']
  },
  {
    id: 'C009',
    platform: 'xiaohongshu',
    topic: '糖尿病',
    content: '确诊糖尿病后生活质量严重下降怎么办？',
    sentiment: 'negative',
    keywords: ['糖尿病', '生活质量', '下降']
  },
  {
    id: 'C010',
    platform: 'wechat',
    topic: '减重',
    content: '减肥期间可以吃水果吗？哪些水果糖分低？',
    sentiment: 'questioning',
    keywords: ['减重', '水果', '糖分']
  }
];

export const userPainPoints = {
  'GLP-1停药': ['担心反弹', '不知道如何停药', '副作用顾虑'],
  '糖尿病饮食': ['不知道能吃什么', '觉得饮食受限', '担心营养不均衡'],
  '减重': ['效果太慢', '容易放弃', '不知道运动强度'],
  '血糖监测': ['不知道测几次', '空腹还是餐后', '指标怎么看'],
  '药物选择': ['不知道选哪种', '担心副作用', '价格因素']
};

export const highFrequencyQuestions = [
  'GLP-1停药后会反弹吗？',
  '糖尿病患者饮食禁忌有哪些？',
  '减重需要运动多久才有效果？',
  '血糖控制在多少算正常？',
  'GLP-1有哪些副作用？',
  '无糖食品真的无糖吗？',
  '哪些水果适合糖尿病患者？',
  '司美格鲁肽和利拉鲁肽哪个好？'
];

export function analyzeUserQuestions(keywords, limit = 5) {
  const keywordLower = keywords.toLowerCase();

  let matchedQuestions = [];

  for (const question of highFrequencyQuestions) {
    let score = 0;
    const questionLower = question.toLowerCase();

    for (const kw of keywordLower.split(/[\s,，]+/)) {
      if (questionLower.includes(kw)) {
        score++;
      }
    }

    if (score > 0) {
      matchedQuestions.push({
        question,
        relevanceScore: score
      });
    }
  }

  matchedQuestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return matchedQuestions.slice(0, limit).map(q => q.question);
}

export function getPainPointsForTopic(topic) {
  for (const [key, points] of Object.entries(userPainPoints)) {
    if (topic.includes(key) || key.includes(topic)) {
      return points;
    }
  }
  return [];
}

export function getCommentsForTopic(topic, limit = 3) {
  const topicLower = topic.toLowerCase();
  const matched = [];

  for (const comment of userComments) {
    let score = 0;
    const commentText = (comment.content + ' ' + comment.keywords.join(' ')).toLowerCase();

    for (const kw of topicLower.split(/[\s,，]+/)) {
      if (commentText.includes(kw)) {
        score++;
      }
    }

    if (score > 0) {
      matched.push({ ...comment, score });
    }
  }

  matched.sort((a, b) => b.score - a.score);
  return matched.slice(0, limit);
}

export function getUserInsights(topic) {
  const questions = analyzeUserQuestions(topic, 3);
  const painPoints = getPainPointsForTopic(topic);
  const comments = getCommentsForTopic(topic, 2);

  return {
    topic,
    userQuestions: questions,
    painPoints: painPoints,
    userComments: comments,
    hasInsights: questions.length > 0 || painPoints.length > 0 || comments.length > 0
  };
}

export function applyUserInsights(content, topic) {
  const insights = getUserInsights(topic);

  if (!insights.hasInsights) {
    return { content, insightsAdded: false };
  }

  let enhancedContent = content;
  const insightParts = [];

  if (insights.userQuestions.length > 0) {
    insightParts.push(`【用户常见疑问】\n${insights.userQuestions.map(q => `• ${q}`).join('\n')}`);
  }

  if (insights.painPoints.length > 0) {
    insightParts.push(`【用户痛点】\n${insights.painPoints.map(p => `• ${p}`).join('\n')}`);
  }

  return {
    content: enhancedContent,
    insightsAdded: insightParts.length > 0,
    insightSummary: insightParts.join('\n\n'),
    insights
  };
}