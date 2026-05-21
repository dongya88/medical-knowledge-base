export function parseCommand(input) {
  const result = {
    topic: input,
    type: 'article',
    wordCount: null,
    platform: null,
    isNews: false,
    raw: input
  };

  let processed = input;

  const newsPatterns = ['新闻', '最新消息', '政策', '研究进展'];
  result.isNews = newsPatterns.some(p => processed.includes(p));

  const platformPatterns = [
    { pattern: /抖音/, platform: 'douyin', type: 'script' },
    { pattern: /小红书/, platform: 'xiaohongshu', type: 'note' },
    { pattern: /公众号/, platform: 'wechat', type: 'article' },
    { pattern: /脚本/, platform: 'douyin', type: 'script' },
    { pattern: /笔记/, platform: 'xiaohongshu', type: 'note' },
    { pattern: /文章/, platform: 'wechat', type: 'article' }
  ];

  for (const { pattern, platform, type } of platformPatterns) {
    if (pattern.test(processed)) {
      result.platform = platform;
      result.type = type;
      break;
    }
  }

  if (result.isNews && result.type === 'article' && result.platform === 'wechat') {
    result.type = 'news';
  }

  const wordCountPatterns = [
    { regex: /(\d+)[-－](\d+)\s*字/, type: 'range' },
    { regex: /(\d+)\s*字左右?/, type: 'exact' },
    { regex: /约?\s*(\d+)\s*字/, type: 'exact' }
  ];

  for (const { regex, type } of wordCountPatterns) {
    const match = processed.match(regex);
    if (match) {
      if (type === 'range') {
        result.wordCount = { min: parseInt(match[1]), max: parseInt(match[2]) };
      } else {
        result.wordCount = parseInt(match[1]);
      }
      break;
    }
  }

  let topic = processed
    .replace(/根据[：:]?\s*/g, '')
    .replace(/生成(?:一篇|一条|一篇)?(?:.+?的)?/g, '')
    .replace(/抖音|小红书|公众号|脚本|笔记|文章/g, '')
    .replace(/\d+[-－]?\d*\s*字/g, '')
    .replace(/[,，]/g, ' ')
    .trim();

  topic = topic.replace(/\s+/g, ' ').trim();

  if (topic.length > 2) {
    result.topic = topic;
  }

  return result;
}

export function getContentTypeLabel(type, platform) {
  if (platform === 'douyin') return '抖音口播脚本';
  if (platform === 'xiaohongshu') return '小红书笔记';
  if (type === 'news') return '新闻科普';
  return '公众号文章';
}

export function getWordCountText(wordCount) {
  if (!wordCount) return '不限字数';
  if (typeof wordCount === 'object') {
    return `${wordCount.min}-${wordCount.max}字`;
  }
  return `${wordCount}字`;
}