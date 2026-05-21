/**
 * 意图分析层 (Intent Analyzer) v2
 * 功能：分析用户输入，判断内容创作意图类型
 *
 * 支持的意图类型：
 * - science: 科普文章（通俗易懂，大众化）
 * - news: 新闻报道（时效性强）
 * - mechanism: 机制解析（专业深入）
 * - comparison: 对比分析（对比多个事物）
 * - guide: 攻略指南（操作性步骤）
 */

export const IntentType = {
    SCIENCE: 'science',
    NEWS: 'news',
    MECHANISM: 'mechanism',
    COMPARISON: 'comparison',
    GUIDE: 'guide'
};

export const ContentPlatform = {
    WECHAT: 'wechat',
    DOUYIN: 'douyin',
    XIAOHONGSHU: 'xiaohongshu',
    ZHIHU: 'zhihu',
    WEIBO: 'weibo'
};

const PATTERNS = {
    guide: [
        /应注意|注意什么|怎么吃|如何吃|吃什么|怎么运动|如何运动|如何改善|怎么改善|怎么办|如何办|怎么调理|如何调理/,
        /食谱|菜谱|运动方案|减肥方法|调理方法|治疗方案|改善方案|注射方法|使用方法/,
        /摄入|摄入量|吃多少|运动量|锻炼方法|怎么注射|如何注射|注射技巧|使用技巧/,
        /方法|步骤|流程|建议|推荐|哪些|有什么|有哪些|怎么选|如何选/
    ],
    news: [
        /最新|新闻|刚刚|刚刚发布|今日|报道|新进展|突破性|重磅|首次|第一款/,
        /研究[发明的]|FDA批准|国内获批|上市|上市了|面世|发布[的]?|指南发布|共识发布|专家[组]?发布/
    ],
    mechanism: [
        /机制|原理|通路|靶点|作用原理|分子机制|细胞机制|信号通路/,
        /基因表达|蛋白调控|代谢通路|生理机制|病理机制|工作机制/
    ],
    comparison: [
        /区别|差异|不同|对比|比较|哪个好|哪个更好|利弊|优缺点|差异/,
        /和.*哪个|与.*哪个|还是.*好|.*比.*好|.*和.*哪个/
    ],
    science: [
        /是什么|什么是|科普|了解|认识|解释|介绍|讲解|定义|含义/
    ]
};

const MEDICAL_TOPICS = [
    '糖尿病', '血糖', '胰岛素', 'GLP-1', 'GLP-1RA', '肥胖', '减肥', '体重',
    '高血压', '高血脂', '脂肪肝', '代谢', '心血管', '肿瘤', '癌症',
    '免疫', '炎症', '肠道', '菌群', '营养', '饮食', '运动', 'BMI',
    '二甲双胍', '司美格鲁肽', '利拉鲁肽', '度拉糖肽', '阿司匹林',
    '并发症', '肾病', '视网膜病变', '神经病变', '足部'
];

export class IntentAnalyzer {
    constructor() {
        this.defaultIntent = IntentType.SCIENCE;
    }

    analyze(input) {
        const cleanInput = input.trim().toLowerCase();
        const intent = this.classifyIntent(cleanInput, input);
        const topic = this.extractTopic(input);
        const keywords = this.extractKeywords(input);
        const platform = this.inferPlatform(input);
        const urgency = this.assessUrgency(input);
        const medicalRelevance = this.assessMedicalRelevance(input);

        return {
            rawInput: input,
            intent,
            topic,
            keywords,
            platform,
            urgency,
            medicalRelevance,
            isMedical: medicalRelevance > 0.5,
            metadata: {
                wordCount: this.estimateWordCount(input),
                complexity: this.assessComplexity(input),
                hasComparison: intent === IntentType.COMPARISON,
                hasNewsElement: intent === IntentType.NEWS
            }
        };
    }

    classifyIntent(cleanInput, originalInput) {
        const scores = {
            guide: 0,
            news: 0,
            mechanism: 0,
            comparison: 0,
            science: 0
        };

        for (const [intent, patterns] of Object.entries(PATTERNS)) {
            for (const pattern of patterns) {
                if (pattern.test(originalInput)) {
                    scores[intent] += 2;
                }
                if (pattern.test(cleanInput)) {
                    scores[intent] += 1;
                }
            }
        }

        if (originalInput.includes('?') || originalInput.includes('？')) {
            scores.guide += 1;
        }

        const comparisonWords = ['和', '与', '跟', '和', '比'];
        const hasComparisonWord = comparisonWords.some(w => {
            const parts = originalInput.split(w);
            return parts.length > 1 && parts[0].length > 2 && parts[1].length > 2;
        });
        if (hasComparisonWord) {
            scores.comparison += 3;
        }

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const topIntent = sorted[0];

        console.log(`[意图分析] 得分: ${JSON.stringify(scores)}, 选择: ${topIntent[0]}`);

        if (topIntent[1] === 0) {
            return this.defaultIntent;
        }

        return topIntent[0];
    }

    extractTopic(input) {
        let topic = input.trim();

        for (const topicWord of MEDICAL_TOPICS) {
            if (input.includes(topicWord)) {
                const regex = new RegExp(`[^。？！,.。]*${topicWord}[^。？！,.。]*`);
                const match = input.match(regex);
                if (match) {
                    return match[0].substring(0, 30);
                }
                return topicWord;
            }
        }

        const patterns = [
            /关于(.+?)的/,
            /(.+?)是什么/,
            /(.+?)如何/,
            /(.+?)怎么/,
            /如何(.+?)/
        ];

        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match && match[1]) {
                topic = match[1].trim();
                break;
            }
        }

        if (topic.length > 30) {
            topic = topic.substring(0, 30) + '...';
        }

        return topic;
    }

    extractKeywords(input) {
        const keywords = [];
        const lowerInput = input.toLowerCase();

        for (const term of MEDICAL_TOPICS) {
            if (input.includes(term) || lowerInput.includes(term.toLowerCase())) {
                keywords.push(term);
            }
        }

        if (keywords.length === 0) {
            const words = input.split(/[,，、。.？?!！\s]+/).filter(w => w.length > 1);
            keywords.push(...words.slice(0, 3));
        }

        return [...new Set(keywords)];
    }

    inferPlatform(input) {
        if (input.includes('抖音') || input.includes('短视频')) {
            return ContentPlatform.DOUYIN;
        }
        if (input.includes('小红书') || input.includes('笔记')) {
            return ContentPlatform.XIAOHONGSHU;
        }
        if (input.includes('知乎') || input.includes('问答')) {
            return ContentPlatform.ZHIHU;
        }
        if (input.includes('微博') || input.includes('热搜')) {
            return ContentPlatform.WEIBO;
        }

        return ContentPlatform.WECHAT;
    }

    assessUrgency(input) {
        const urgentKeywords = ['最新', '紧急', '突发', '刚刚', '速看', '头条', '重磅'];
        const newsKeywords = ['新闻', '报道', '研究', '发现', '发布'];

        if (urgentKeywords.some(k => input.includes(k))) {
            return 'high';
        }
        if (newsKeywords.some(k => input.includes(k))) {
            return 'medium';
        }
        return 'low';
    }

    assessMedicalRelevance(input) {
        let score = 0;

        for (const topic of MEDICAL_TOPICS) {
            if (input.includes(topic)) {
                score += 0.25;
            }
        }

        return Math.min(score, 1.0);
    }

    estimateWordCount(input) {
        const chineseChars = (input.match(/[\u4e00-\u9fa5]/g) || []).length;
        if (chineseChars < 20) return 1500;
        if (chineseChars < 50) return 2000;
        return 2500;
    }

    assessComplexity(input) {
        const professionalTerms = [
            '机制', '通路', '靶点', '受体', '基因', '蛋白',
            '代谢', '信号', '调控', '分子', '细胞', '生理', '病理'
        ];

        const score = professionalTerms.filter(term => input.includes(term)).length;

        if (score >= 3) return 'high';
        if (score >= 1) return 'medium';
        return 'low';
    }

    getRouterConfig(analysis) {
        const config = {
            weights: {
                localKnowledge: 0.4,
                pubmed: 0.3,
                academic: 0.2,
                news: 0.1
            },
            topK: 5,
            requireRecent: false
        };

        switch (analysis.intent) {
            case IntentType.NEWS:
                config.weights = { localKnowledge: 0.2, pubmed: 0.3, academic: 0.2, news: 0.3 };
                config.requireRecent = true;
                config.topK = 8;
                break;

            case IntentType.MECHANISM:
                config.weights = { localKnowledge: 0.3, pubmed: 0.5, academic: 0.2, news: 0.0 };
                config.topK = 10;
                break;

            case IntentType.COMPARISON:
                config.weights = { localKnowledge: 0.4, pubmed: 0.3, academic: 0.3, news: 0.0 };
                config.topK = 8;
                break;

            case IntentType.GUIDE:
                config.weights = { localKnowledge: 0.6, pubmed: 0.1, academic: 0.1, news: 0.2 };
                config.topK = 5;
                break;

            case IntentType.SCIENCE:
            default:
                config.weights = { localKnowledge: 0.4, pubmed: 0.3, academic: 0.2, news: 0.1 };
                break;
        }

        if (!analysis.isMedical) {
            config.weights = { localKnowledge: 0.2, pubmed: 0.1, academic: 0.2, news: 0.5 };
        }

        return config;
    }
}

export function createIntentAnalyzer() {
    return new IntentAnalyzer();
}

export function analyzeIntent(input) {
    const analyzer = new IntentAnalyzer();
    return analyzer.analyze(input);
}
