import { searchLiterature, formatCitation, insertCitations } from './literature.js';
import { getKnowledgeContext } from './knowledgeBase.js';
import { getUserInsights } from './userCognition.js';
import { analyzeContentStyle, applyStyleToContent } from './styleAnalyzer.js';
import { applyViralStructure, viralStructure } from './viralStructure.js';

export async function generateSmartContent(parsedCommand, geminiService, styleExample = null, applyStructure = true) {
  const { topic, type, wordCount, platform, isNews } = parsedCommand;

  if (platform === 'douyin') {
    return await generateDouyinScript(topic, wordCount, geminiService, styleExample, applyStructure);
  }

  if (platform === 'xiaohongshu') {
    return await generateXiaohongshuNote(topic, wordCount, geminiService, styleExample, applyStructure);
  }

  if (isNews) {
    return await generateNewsContent(topic, wordCount, geminiService, styleExample, applyStructure);
  }

  return await generateArticle(topic, wordCount, geminiService, styleExample, applyStructure);
}

async function generateArticle(topic, wordCount, geminiService, styleExample, applyStructure) {
  const targetWords = wordCount || 1500;
  const knowledge = getKnowledgeContext(topic, 2);
  const userInsights = getUserInsights(topic);
  const style = styleExample ? analyzeContentStyle(styleExample) : null;

  let baseContent;
  if (!geminiService) {
    baseContent = generateMockArticle(topic, targetWords, knowledge, userInsights);
  } else {
    const prompt = buildPrompt(topic, targetWords, 'article', knowledge, userInsights, style, applyStructure);
    try {
      const result = await geminiService.generateContent(prompt);
      baseContent = {
        ...result,
        format: 'article',
        platform: 'wechat'
      };
    } catch (error) {
      console.error('Gemini API Error:', error.message);
      baseContent = generateMockArticle(topic, targetWords, knowledge, userInsights);
    }
  }

  if (style) {
    baseContent.content = applyStyleToContent(baseContent.content, style);
  }

  const result = applyLiterature(topic, baseContent, knowledge.articles || []);

  if (applyStructure) {
    const structured = applyViralStructure(result.content, topic, result.citations || []);
    result.content = structured.content;
    result.structureApplied = structured.structureApplied;
    result.stages = structured.stages;
  }

  return result;
}

async function generateDouyinScript(topic, wordCount, geminiService, styleExample, applyStructure) {
  const targetWords = wordCount || 400;
  const knowledge = getKnowledgeContext(topic, 1);
  const userInsights = getUserInsights(topic);
  const style = styleExample ? analyzeContentStyle(styleExample) : null;

  let baseContent;
  if (!geminiService) {
    baseContent = generateMockScript(topic, targetWords, 'douyin', knowledge, userInsights);
  } else {
    const prompt = buildPrompt(topic, targetWords, 'script', knowledge, userInsights, style, applyStructure);
    try {
      const result = await geminiService.generateContent(prompt);
      baseContent = {
        ...result,
        format: 'script',
        platform: 'douyin'
      };
    } catch (error) {
      console.error('Gemini API Error:', error.message);
      baseContent = generateMockScript(topic, targetWords, 'douyin', knowledge, userInsights);
    }
  }

  if (style) {
    baseContent.content = applyStyleToContent(baseContent.content, style);
  }

  const result = applyLiterature(topic, baseContent, knowledge.articles || []);

  if (applyStructure) {
    const structured = applyViralStructure(result.content, topic, result.citations || []);
    result.content = structured.content;
    result.structureApplied = structured.structureApplied;
    result.stages = structured.stages;
  }

  return result;
}

async function generateXiaohongshuNote(topic, wordCount, geminiService, styleExample, applyStructure) {
  const targetWords = wordCount || 600;
  const knowledge = getKnowledgeContext(topic, 1);
  const userInsights = getUserInsights(topic);
  const style = styleExample ? analyzeContentStyle(styleExample) : null;

  let baseContent;
  if (!geminiService) {
    baseContent = generateMockNote(topic, targetWords, knowledge, userInsights);
  } else {
    const prompt = buildPrompt(topic, targetWords, 'note', knowledge, userInsights, style, applyStructure);
    try {
      const result = await geminiService.generateContent(prompt);
      baseContent = {
        ...result,
        format: 'note',
        platform: 'xiaohongshu'
      };
    } catch (error) {
      console.error('Gemini API Error:', error.message);
      baseContent = generateMockNote(topic, targetWords, knowledge, userInsights);
    }
  }

  if (style) {
    baseContent.content = applyStyleToContent(baseContent.content, style);
  }

  const result = applyLiterature(topic, baseContent, knowledge.articles || []);

  if (applyStructure) {
    const structured = applyViralStructure(result.content, topic, result.citations || []);
    result.content = structured.content;
    result.structureApplied = structured.structureApplied;
    result.stages = structured.stages;
  }

  return result;
}

async function generateNewsContent(topic, wordCount, geminiService, styleExample, applyStructure) {
  const targetWords = wordCount || 800;
  const knowledge = getKnowledgeContext(topic, 2);
  const userInsights = getUserInsights(topic);
  const style = styleExample ? analyzeContentStyle(styleExample) : null;

  let baseContent;
  if (!geminiService) {
    baseContent = generateMockNews(topic, targetWords, knowledge, userInsights);
  } else {
    const prompt = buildPrompt(topic, targetWords, 'news', knowledge, userInsights, style, applyStructure);
    try {
      const result = await geminiService.generateContent(prompt);
      baseContent = {
        ...result,
        format: 'news',
        platform: 'wechat'
      };
    } catch (error) {
      console.error('Gemini API Error:', error.message);
      baseContent = generateMockNews(topic, targetWords, knowledge, userInsights);
    }
  }

  if (style) {
    baseContent.content = applyStyleToContent(baseContent.content, style);
  }

  const result = applyLiterature(topic, baseContent, knowledge.articles || []);

  if (applyStructure) {
    const structured = applyViralStructure(result.content, topic, result.citations || []);
    result.content = structured.content;
    result.structureApplied = structured.structureApplied;
    result.stages = structured.stages;
  }

  return result;
}

function buildPrompt(topic, wordCount, contentType, knowledge, userInsights, style, applyStructure) {
  const wordReq = typeof wordCount === 'object' ? `${wordCount.min}-${wordCount.max}` : wordCount;

  let typeSpecifics = '';
  if (contentType === 'article') {
    typeSpecifics = '医学科普风格，内容科学准确；面向普通大众，通俗易懂；结构清晰，段落分明';
  } else if (contentType === 'script') {
    typeSpecifics = '口语化表达，亲切自然；开头要有冲突感或悬念；内容实用有干货；结尾互动性强';
  } else if (contentType === 'note') {
    typeSpecifics = '情绪化表达，有共鸣感；带有个人经历的叙述；使用emoji；结尾有互动性';
  } else if (contentType === 'news') {
    typeSpecifics = '结构包括：标题（新闻型）、核心结论、分点解读、临床意义、注意事项；客观准确';
  }

  let prompt = `请生成关于"${topic}"的内容。要求：字数${wordReq}字；${typeSpecifics}`;

  if (knowledge.context) {
    prompt += `\n\n【知识来源】你可以使用以下参考资料中的信息，每个来源都有编号：\n${knowledge.context}\n\n【引用规则】在正文中引用时使用[1]、[2]、[3]等编号，编号对应上述来源的顺序（如[知识1]对应[1]，[知识2]对应[2]）。请确保引用编号与来源顺序一致！`;
  }

  if (applyStructure) {
    prompt += `\n\n【内容结构】请按照"冲突→误区→解释→证据→建议"的结构组织内容`;
  }

  if (style) {
    prompt += `\n\n【风格参考】`;
    if (style.titleStyle.length > 0) {
      prompt += `\n标题风格：${style.titleStyle.join(' + ')}`;
    }
    prompt += `\n开篇方式：${style.openingStyle}`;
    prompt += `\n结尾方式：${style.endingStyle}`;
    if (style.languageFeatures.length > 0) {
      prompt += `\n语言特点：${style.languageFeatures.map(f => f.feature).join('、')}`;
    }
  }

  if (knowledge.context) {
    prompt += `\n\n【医学知识参考】\n${knowledge.context}`;
  }

  if (userInsights.hasInsights) {
    prompt += `\n\n【用户认知数据】`;
    if (userInsights.userQuestions.length > 0) {
      prompt += `\n用户常见疑问：${userInsights.userQuestions.join('；')}`;
    }
    if (userInsights.painPoints.length > 0) {
      prompt += `\n用户痛点：${userInsights.painPoints.join('；')}`;
    }
  }

  return prompt;
}

function applyLiterature(topic, baseContent, knowledgeArticles = []) {
  const relevantPapers = knowledgeArticles.length > 0
    ? knowledgeArticles
    : searchLiterature(topic, 3);

  if (relevantPapers.length === 0) {
    return {
      ...baseContent,
      citations: [],
      references: []
    };
  }

  const citations = relevantPapers.map(formatCitation);
  const { contentWithCitations } = insertCitations(baseContent.content, relevantPapers);

  return {
    ...baseContent,
    content: contentWithCitations,
    citations: citations,
    references: relevantPapers,
    referenceCount: citations.length
  };
}

function generateMockArticle(topic, wordCount, knowledge, userInsights) {
  const knowledgeSection = knowledge.articles && knowledge.articles.length > 0
    ? `\n\n【医学知识补充】\n${knowledge.articles[0].content.substring(0, 200)}...`
    : '';

  const userSection = userInsights.hasInsights
    ? `\n\n【用户关注点】\n针对大家常问的问题：${userInsights.userQuestions[0] || '本期内容为您解答'}`
    : '';

  return {
    title: topic,
    content: `【${topic}】科普文章

一、概述

${topic}是现代医学和健康领域备受关注的议题。${userSection}随着人们对健康的重视程度不断提高，越来越多的人开始关注这一领域。${knowledgeSection}

二、主要知识点

1. 基础概念
   理解${topic}的基本概念是第一步。这涉及到相关医学原理和科学依据。

2. 实践应用
   将理论知识应用到日常生活中是至关重要的。通过科学的方法和专业的指导，可以更好地实现健康目标。

3. 注意事项
   在追求健康的过程中，需要注意科学性和合理性，避免盲目跟风。

三、总结

${topic}是一个需要持续学习和实践的过程。希望通过本文的介绍，能够帮助大家更好地理解和应用相关知识。

（注意：当前为模拟输出，如需真实AI生成内容，请配置GEMINI_API_KEY环境变量）`,
    wordCount: wordCount || 350,
    timestamp: new Date().toISOString(),
    format: 'article',
    platform: 'wechat',
    isMock: true,
    knowledgeUsed: knowledge.articleCount || 0,
    userInsightsUsed: userInsights.hasInsights ? 1 : 0
  };
}

function generateMockScript(topic, wordCount, platform, knowledge, userInsights) {
  const knowledgeHint = knowledge.articles && knowledge.articles.length > 0
    ? `干货点：${knowledge.articles[0].title}`
    : '实用干货内容';

  const userQuestion = userInsights.userQuestions.length > 0
    ? userInsights.userQuestions[0]
    : '';

  return {
    title: topic,
    content: `# ${topic} | 抖音口播脚本

【开头 - 冲突】
你知道吗？很多人都问${userQuestion || `关于${topic}的这个问题`}！

【正文】
大家好，今天我们来聊聊${topic}。
${knowledgeHint}
第一点...
第二点...
第三点...

【结尾 - 互动】
以上就是今天的分享，你们觉得怎么样？
评论区告诉我，还想了解什么内容！
记得点关注，不迷路！`,
    wordCount: wordCount || 400,
    timestamp: new Date().toISOString(),
    format: 'script',
    platform: 'douyin',
    isMock: true,
    knowledgeUsed: knowledge.articleCount || 0,
    userInsightsUsed: userInsights.hasInsights ? 1 : 0
  };
}

function generateMockNote(topic, wordCount, knowledge, userInsights) {
  const knowledgeHint = knowledge.articles && knowledge.articles.length > 0
    ? `今天学到一招：${knowledge.articles[0].title}！`
    : '';

  const userPainPoint = userInsights.painPoints.length > 0
    ? userInsights.painPoints[0]
    : '';

  return {
    title: topic,
    content: `# ${topic} 💪

姐妹们！${userPainPoint ? `我之前也为${userPainPoint}烦恼过！` : `今天必须跟你们聊聊${topic}这个话题！`}

${knowledgeHint}

之前我一直被这个问题困扰，直到我遇到了...（停顿）其实也没什么特别的方法，就是坚持！

✨ 我的小经验：
1. 不要给自己太大压力
2. 找到适合自己的节奏
3. 坚持就是胜利

你们还有什么问题吗？评论区告诉我呀～ ❤️

#${topic} #健康生活 #干货分享`,
    wordCount: wordCount || 600,
    timestamp: new Date().toISOString(),
    format: 'note',
    platform: 'xiaohongshu',
    isMock: true,
    knowledgeUsed: knowledge.articleCount || 0,
    userInsightsUsed: userInsights.hasInsights ? 1 : 0
  };
}

function generateMockNews(topic, wordCount, knowledge, userInsights) {
  const knowledgeSection = knowledge.articles && knowledge.articles.length > 0
    ? `\n\n【医学背景】\n${knowledge.articles[0].content.substring(0, 150)}...`
    : '';

  return {
    title: `【最新研究】${topic}取得突破性进展`,
    content: `【新闻概要】

近日，关于${topic}的研究引发了医学界的广泛关注。${knowledgeSection}

【核心结论】

1. 研究表明...
2. 专家建议...

【分点解读】

1. 机制方面...
2. 临床应用...

【临床意义】

这一发现对临床实践具有重要指导意义。

【注意事项】

1. 个体差异存在
2. 请咨询专业医生

（注意：当前为模拟输出，如需真实AI生成内容，请配置GEMINI_API_KEY环境变量）`,
    wordCount: wordCount || 500,
    timestamp: new Date().toISOString(),
    format: 'news',
    platform: 'wechat',
    isMock: true,
    knowledgeUsed: knowledge.articleCount || 0,
    userInsightsUsed: userInsights.hasInsights ? 1 : 0
  };
}