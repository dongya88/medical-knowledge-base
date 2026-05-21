export const stylePatterns = {
  titleStyles: {
    '悬念型': /竟|竟然|居然|万万|没想到/,
    '冲突型': /但是|然而|却|其实|不是/,
    '数字型': /\d+[万人步招天]/,
    '疑问型': /[？?]|怎么|如何|为什么|是不是/,
    '感叹型': /[!！]|太|真的|绝了/
  },
  openingStyles: {
    '冲突开场': /但是|然而|其实|没想到|竟然/,
    '痛点切入': /困扰|烦恼|担心|焦虑|害怕/,
    '故事引入': /之前|曾经|有一次|记得|那时候/,
    '数据开场': /\d+[%人次第年月天]/
  },
  languageFeatures: {
    '口语化': /[呗啦呀啊嘛呢哈]/,
    '情绪词': /[太真的简直绝对特别]/,
    '专业术语': /机制|原理|糖尿病|GLP|血糖/,
    '行动词': /赶紧|立刻|马上|快去|记得/
  },
  endingStyles: {
    '呼吁行动': /赶紧|快去|快来|记得|不要犹豫/,
    '情感共鸣': /一起|大家|我们|加油/,
    '总结升华': /总之|总而言之|归根结底|总的来说/
  }
};

export function analyzeContentStyle(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const title = lines[0] || '';
  const body = lines.slice(1).join('\n');

  const titleStyle = detectTitleStyle(title);
  const openingStyle = detectOpeningStyle(body);
  const languageFeatures = detectLanguageFeatures(body);
  const endingStyle = detectEndingStyle(body);
  const structure = analyzeStructure(lines);

  return {
    titleStyle,
    openingStyle,
    languageFeatures,
    endingStyle,
    structure,
    stats: {
      totalLines: lines.length,
      avgLineLength: Math.round(body.length / lines.length),
      emojiCount: (body.match(/[👍❤️✨💪🔥🎉😭😂]/g) || []).length,
      questionCount: (body.match(/[？?]/g) || []).length
    }
  };
}

function detectTitleStyle(title) {
  const styles = [];

  for (const [style, pattern] of Object.entries(stylePatterns.titleStyles)) {
    if (pattern.test(title)) {
      styles.push(style);
    }
  }

  if (styles.length === 0) {
    if (title.length < 20) {
      styles.push('简洁型');
    } else {
      styles.push('描述型');
    }
  }

  return styles;
}

function detectOpeningStyle(body) {
  const firstParagraph = body.split(/[。！？\n]/)[0] || '';

  for (const [style, pattern] of Object.entries(stylePatterns.openingStyles)) {
    if (pattern.test(firstParagraph)) {
      return style;
    }
  }

  return '平铺直叙';
}

function detectLanguageFeatures(body) {
  const features = [];

  for (const [feature, pattern] of Object.entries(stylePatterns.languageFeatures)) {
    if (pattern.test(body)) {
      features.push({
        feature,
        count: (body.match(new RegExp(pattern, 'g')) || []).length
      });
    }
  }

  return features.sort((a, b) => b.count - a.count).slice(0, 3);
}

function detectEndingStyle(body) {
  const lastPart = body.split(/[。！？\n]/).slice(-3).join('');

  for (const [style, pattern] of Object.entries(stylePatterns.endingStyles)) {
    if (pattern.test(lastPart)) {
      return style;
    }
  }

  return '自然收尾';
}

function analyzeStructure(lines) {
  const structure = {
    hasList: false,
    listType: null,
    hasEmoji: false,
    paragraphCount: 0
  };

  const listPatterns = [
    /^\d+[.、:：]/,
    /^[-*+]/,
    /^第[一二三四五六七八九十]+/
  ];

  for (const line of lines) {
    if (listPatterns.some(p => p.test(line.trim()))) {
      structure.hasList = true;
      if (structure.listType === null) {
        if (line.match(listPatterns[0])) {
          structure.listType = '数字列表';
        } else if (line.match(listPatterns[1])) {
          structure.listType = '符号列表';
        } else {
          structure.listType = '序号列表';
        }
      }
    }
    if (/[👍❤️✨💪🔥]/.test(line)) {
      structure.hasEmoji = true;
    }
  }

  structure.paragraphCount = lines.length;

  return structure;
}

export function applyStyleToContent(newContent, style) {
  let styledContent = newContent;

  if (style.titleStyle.includes('冲突型') && !newContent.includes('但是') && !newContent.includes('然而')) {
    const titleMatch = newContent.match(/^#\s+(.+)/);
    if (titleMatch) {
      const originalTitle = titleMatch[1];
      const newTitle = `震惊！${originalTitle}的真相竟然是...`;
      styledContent = styledContent.replace(/^#\s+.+/, `# ${newTitle}`);
    }
  }

  if (style.languageFeatures.some(f => f.feature === '口语化')) {
    if (!/[啦呀啊嘛]/.test(styledContent.slice(-50))) {
      styledContent = styledContent + '呀~';
    }
  }

  if (style.endingStyle === '呼吁行动') {
    if (!/赶紧|快去|记得/.test(styledContent.slice(-50))) {
      styledContent = styledContent + '\n\n赶紧试试看，记得评论区告诉我效果！';
    }
  }

  if (style.structure.hasEmoji) {
    if (!/[👍❤️✨💪🔥]/.test(styledContent)) {
      styledContent = styledContent.replace(/(#\s*\S+)/g, '$1 💪');
    }
  }

  return styledContent;
}

export function generateStyleGuide(style) {
  const guide = [];

  guide.push('【爆款风格解析报告】\n');

  if (style.titleStyle.length > 0) {
    guide.push(`📌 标题风格：${style.titleStyle.join(' + ')}`);
  }

  guide.push(`📌 开篇方式：${style.openingStyle}`);
  guide.push(`📌 结尾方式：${style.endingStyle}`);

  if (style.languageFeatures.length > 0) {
    guide.push('\n📌 语言特点：');
    style.languageFeatures.forEach(f => {
      guide.push(`   • ${f.feature}（出现${f.count}次）`);
    });
  }

  guide.push('\n📌 结构特征：');
  guide.push(`   • 段落数：${style.structure.paragraphCount}`);
  guide.push(`   • 平均每段：${style.structure.avgLineLength}字`);
  if (style.structure.hasList) {
    guide.push(`   • 列表形式：${style.structure.listType}`);
  }
  if (style.structure.hasEmoji) {
    guide.push(`   • Emoji使用：是（${style.stats.emojiCount}个）`);
  }

  return guide.join('\n');
}