export const viralStructure = {
  name: '冲突→误区→解释→证据→建议',
  description: '经典爆款内容结构',
  stages: [
    {
      id: 'conflict',
      name: '冲突',
      description: '提出反常识或引人关注的问题',
      icon: '⚡'
    },
    {
      id: 'misconception',
      name: '误区',
      description: '指出常见的错误认知或做法',
      icon: '❌'
    },
    {
      id: 'explanation',
      name: '解释',
      description: '用通俗语言解释正确原理',
      icon: '💡'
    },
    {
      id: 'evidence',
      name: '证据',
      description: '引用数据或文献支持观点',
      icon: '📊'
    },
    {
      id: 'suggestion',
      name: '建议',
      description: '给出实用可行的建议或行动指南',
      icon: '✅'
    }
  ]
};

export function applyViralStructure(content, topic, citations = []) {
  const lines = content.split('\n').filter(l => l.trim());
  const firstParagraph = lines[0] || '';
  const body = lines.slice(1).join('\n');

  let conflictSection = '';
  let misconceptionSection = '';
  let explanationSection = '';
  let evidenceSection = '';
  let suggestionSection = '';

  const hasConflict = /[但是|然而|其实|没想到|竟然|震惊]/.test(firstParagraph);
  const hasMisconception = /[错误|误区|不对|不行|不能|不要]/.test(body);
  const hasExplanation = /[因为|所以|由于|也就是说|也就是说]/.test(body);
  const hasEvidence = citations.length > 0 || /[研究|数据|表明|显示|根据]/.test(body);
  const hasSuggestion = /[建议|可以|应该|推荐|提醒]/.test(body);

  if (hasConflict) {
    conflictSection = `\n\n【${viralStructure.stages[0].icon} ${viralStructure.stages[0].name}】\n${extractSection(firstParagraph, 2)}`;
  }

  if (hasMisconception) {
    const misconceptionMatch = body.match(/([^。！？\n]{20,60}[误区|错误|不对|不行|不能|不要][^。！？\n]{10,30})/);
    if (misconceptionMatch) {
      misconceptionSection = `\n\n【${viralStructure.stages[1].icon} ${viralStructure.stages[1].name}】\n${misconceptionMatch[0]}`;
    }
  }

  if (hasExplanation || (!hasConflict && !hasMisconception)) {
    explanationSection = `\n\n【${viralStructure.stages[2].icon} ${viralStructure.stages[2].name}】\n${topic}的核心原理是...`;
  }

  if (hasEvidence || citations.length > 0) {
    if (citations.length > 0) {
      const citationSummary = citations.slice(0, 2).map((c, i) =>
        `${i + 1}. ${c.title} (${c.pmid})`
      ).join('\n');
      evidenceSection = `\n\n【${viralStructure.stages[3].icon} ${viralStructure.stages[3].name}】\n${citationSummary}`;
    } else {
      evidenceSection = `\n\n【${viralStructure.stages[3].icon} ${viralStructure.stages[3].name}】\n研究表明...`;
    }
  }

  if (hasSuggestion) {
    suggestionSection = `\n\n【${viralStructure.stages[4].icon} ${viralStructure.stages[4].name}】\n针对${topic}，建议大家...`;
  }

  const structuredContent = `${firstParagraph}${conflictSection}${misconceptionSection}${explanationSection}${evidenceSection}${suggestionSection}`;

  return {
    content: structuredContent,
    structureApplied: true,
    stages: [
      conflictSection ? viralStructure.stages[0].id : null,
      misconceptionSection ? viralStructure.stages[1].id : null,
      explanationSection ? viralStructure.stages[2].id : null,
      evidenceSection ? viralStructure.stages[3].id : null,
      suggestionSection ? viralStructure.stages[4].id : null
    ].filter(Boolean)
  };
}

function extractSection(text, maxSentences = 1) {
  const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
  return sentences.slice(0, maxSentences).join('。') + '。';
}

export function generateViralOutline(topic, citations = []) {
  const outline = {
    topic,
    structure: viralStructure.name,
    sections: []
  };

  outline.sections.push({
    stage: viralStructure.stages[0],
    content: `【引发冲突】${topic}的常见误区是什么？`,
    prompt: `请描述一个关于${topic}的常见误区或错误认知`
  });

  outline.sections.push({
    stage: viralStructure.stages[1],
    content: `【揭示误区】很多人都以为...但其实...`,
    prompt: `请解释为什么这个误区是错误的，提供科学依据`
  });

  outline.sections.push({
    stage: viralStructure.stages[2],
    content: `【正确解释】${topic}的真相是...`,
    prompt: `请用通俗易懂的语言解释${topic}的正确原理`
  });

  if (citations.length > 0) {
    outline.sections.push({
      stage: viralStructure.stages[3],
      content: `【证据支撑】相关研究显示...`,
      prompt: `请引用文献数据来支持上述解释`
    });
  }

  outline.sections.push({
    stage: viralStructure.stages[4],
    content: `【实用建议】给观众的建议是...`,
    prompt: `请给出针对${topic}的实用建议或行动指南`
  });

  return outline;
}

export function isStructureApplied(content) {
  const requiredMarkers = ['冲突', '误区', '解释', '证据', '建议'];
  let matchedCount = 0;

  for (const marker of requiredMarkers) {
    if (content.includes(marker)) {
      matchedCount++;
    }
  }

  return {
    isApplied: matchedCount >= 3,
    matchedStages: matchedCount,
    totalStages: requiredMarkers.length
  };
}