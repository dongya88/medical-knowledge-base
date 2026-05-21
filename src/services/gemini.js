import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export async function generateContent(topic) {
  if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    return generateMockContent(topic);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      safetySettings,
    });

    const prompt = `请生成一篇关于"${topic}"的中文科普文章。要求：
1. 完整的中文文章，不少于800字
2. 医学科普风格，内容科学准确
3. 面向普通大众，通俗易懂
4. 结构清晰，段落分明`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      title: topic,
      content: text,
      wordCount: text.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    return generateMockContent(topic);
  }
}

function generateMockContent(topic) {
  return {
    title: topic,
    content: `【${topic}】科普文章

一、概述

${topic}是现代医学和健康领域备受关注的议题。随着人们对健康的重视程度不断提高，越来越多的人开始关注这一领域。

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
    wordCount: 350,
    timestamp: new Date().toISOString(),
    isMock: true
  };
}

export { genAI };