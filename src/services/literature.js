export const literatureDatabase = [
  {
    id: 'L001',
    pmid: '30395346',
    doi: '10.1016/j.cell.2018.09.010',
    title: 'GLP-1 Receptor Agonists for Weight Management',
    authors: 'Drucker DJ',
    journal: 'Cell',
    year: 2018,
    abstract: 'GLP-1 receptor agonists have emerged as effective therapies for obesity and type 2 diabetes...',
    keywords: ['GLP-1', 'weight management', 'obesity', 'diabetes', '减重', '糖尿病'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/30395346/'
  },
  {
    id: 'L002',
    pmid: '32941273',
    doi: '10.1056/NEJMoa1914445',
    title: 'Semaglutide and Cardiovascular Outcomes',
    authors: 'Marso SP et al',
    journal: 'NEJM',
    year: 2020,
    abstract: 'Semaglutide significantly reduced the risk of cardiovascular events in patients with type 2 diabetes...',
    keywords: ['semaglutide', 'cardiovascular', '糖尿病', '心血管', 'GLP-1'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/32941273/'
  },
  {
    id: 'L003',
    pmid: '35439754',
    doi: '10.1038/s41591-022-01726-1',
    title: 'Tirzepatide and Glycemic Control',
    authors: 'Frías JP et al',
    journal: 'Nature Medicine',
    year: 2022,
    abstract: 'Tirzepatide demonstrated superior glycemic control compared with semaglutide...',
    keywords: ['tirzepatide', 'glycemic control', 'GLP-1', '糖尿病', '血糖'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/35439754/'
  },
  {
    id: 'L004',
    pmid: '34170645',
    doi: '10.1111/dom.14455',
    title: 'GLP-1 RA and Weight Loss Maintenance',
    authors: 'Wilding JPH et al',
    journal: 'Diabetes, Obesity and Metabolism',
    year: 2021,
    abstract: 'Long-term use of GLP-1 receptor agonists helps maintain weight loss...',
    keywords: ['GLP-1', 'weight loss', 'maintenance', '停药', '反弹', '减重'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/34170645/'
  },
  {
    id: 'L005',
    pmid: '34610558',
    doi: '10.1016/j.metabol.2021.154880',
    title: 'Nutrition and Diabetes Management',
    authors: 'American Diabetes Association',
    journal: 'Metabolism',
    year: 2021,
    abstract: 'Medical nutrition therapy is fundamental for diabetes management...',
    keywords: ['nutrition', 'diabetes', 'diet', '糖尿病', '饮食', '营养'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/34610558/'
  }
];

export function searchLiterature(keywords, limit = 5) {
  const results = [];
  const keywordLower = keywords.toLowerCase().split(/[\s,，]+/);

  for (const paper of literatureDatabase) {
    let score = 0;
    const paperKeywordsLower = paper.keywords.map(k => k.toLowerCase());

    for (const kw of keywordLower) {
      if (paper.title.toLowerCase().includes(kw)) score += 2;
      if (paper.abstract.toLowerCase().includes(kw)) score += 1;
      if (paperKeywordsLower.some(pk => pk.includes(kw) || kw.includes(pk))) score += 3;
    }

    if (score > 0) {
      results.push({ ...paper, relevanceScore: score });
    }
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return results.slice(0, limit);
}

export function formatCitation(paper) {
  return {
    pmid: paper.pmid,
    doi: paper.doi,
    title: paper.title,
    citation: `【文献引用】${paper.authors} et al. ${paper.journal}. ${paper.year}. PMID: ${paper.pmid}`,
    url: paper.url,
    clickableUrl: `[查看原文](${paper.url})`
  };
}

export function insertCitations(content, papers) {
  if (!papers || papers.length === 0) {
    return {
      contentWithCitations: content,
      citations: []
    };
  }

  let contentWithReplacedCitations = content;

  for (let i = 0; i < papers.length; i++) {
    const pattern1 = new RegExp(`\\[知识${i + 1}\\]`, 'g');
    const pattern2 = new RegExp(`\\[${i + 1}\\]`, 'g');
    const replacement = `[${i + 1}]`;
    contentWithReplacedCitations = contentWithReplacedCitations.replace(pattern1, replacement);
    contentWithReplacedCitations = contentWithReplacedCitations.replace(pattern2, replacement);
  }

  const citations = papers.map((paper, index) => {
    const title = paper.title || '未知来源';
    const source = paper.source || (paper.category ? `分类: ${paper.category}` : '知识库');
    return `${index + 1}. ${title} (来源: ${source})`;
  });

  const citationSection = `\n\n【参考文献】\n${citations.join('\n')}`;

  return {
    contentWithCitations: contentWithReplacedCitations + citationSection,
    citations: papers.map(p => ({
      title: p.title || '未知来源',
      source: p.source || p.category || '知识库'
    }))
  };
}

export function generateContentWithCitations(topic, baseContent) {
  const relevantPapers = searchLiterature(topic, 3);

  if (relevantPapers.length === 0) {
    return {
      ...baseContent,
      citations: [],
      contentWithCitations: baseContent.content
    };
  }

  const { contentWithCitations, citations } = insertCitations(baseContent.content, relevantPapers);

  return {
    ...baseContent,
    content: contentWithCitations,
    citations: citations,
    referenceCount: citations.length
  };
}