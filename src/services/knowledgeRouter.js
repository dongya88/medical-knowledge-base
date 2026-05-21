/**
 * 知识路由器 (Knowledge Router)
 * 功能：根据意图分析结果，分配检索策略到不同知识源
 *
 * 支持的知识源：
 * - local: 本地知识库 (Qdrant)
 * - pubmed: PubMed 医学文献数据库
 * - academic: 学术搜索 (SerpAPI)
 * - news: 行业新闻
 */

import { createIntentAnalyzer, IntentType } from './intentAnalyzer.js';

export const KnowledgeSource = {
    LOCAL: 'local',
    PUBMED: 'pubmed',
    ACADEMIC: 'academic',
    NEWS: 'news'
};

export class KnowledgeRouter {
    constructor(options = {}) {
        this.intentAnalyzer = createIntentAnalyzer();
        this.localKnowledgeBase = options.localKnowledgeBase || null;
        this.pubmedService = options.pubmedService || null;
        this.academicService = options.academicService || null;
        this.newsService = options.newsService || null;

        this.sourceConfigs = {
            [KnowledgeSource.LOCAL]: {
                name: '本地知识库',
                priority: 1,
                timeout: 5000,
                maxResults: 10
            },
            [KnowledgeSource.PUBMED]: {
                name: 'PubMed',
                priority: 2,
                timeout: 10000,
                maxResults: 5
            },
            [KnowledgeSource.ACADEMIC]: {
                name: '学术搜索',
                priority: 3,
                timeout: 15000,
                maxResults: 5
            },
            [KnowledgeSource.NEWS]: {
                name: '行业新闻',
                priority: 4,
                timeout: 8000,
                maxResults: 3
            }
        };
    }

    setLocalKnowledgeBase(kb) {
        this.localKnowledgeBase = kb;
    }

    setPubmedService(service) {
        this.pubmedService = service;
    }

    setAcademicService(service) {
        this.academicService = service;
    }

    setNewsService(service) {
        this.newsService = service;
    }

    async route(input, options = {}) {
        const analysis = this.intentAnalyzer.analyze(input);
        const routerConfig = this.intentAnalyzer.getRouterConfig(analysis);

        const weights = options.weights ?? routerConfig.weights;
        const topK = options.topK ?? routerConfig.topK;
        const requireRecent = options.requireRecent ?? routerConfig.requireRecent;

        const sources = this.determineSources(analysis, weights);

        console.log(`[知识路由] 输入: "${input.substring(0, 30)}..."`);
        console.log(`[知识路由] 意图: ${analysis.intent}, 医学相关: ${analysis.isMedical}`);
        console.log(`[知识路由] 分配源: ${sources.map(s => s.name).join(', ')}`);

        const results = await Promise.allSettled(
            sources.map(source => this.fetchFromSource(source, analysis, topK, requireRecent))
        );

        const successfulResults = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value)
            .flat();

        const routedResults = {
            query: input,
            analysis,
            routerConfig,
            sources: sources.map(s => ({
                source: s.source,
                name: s.name,
                weight: weights[s.key] || 0
            })),
            results: successfulResults,
            totalResults: successfulResults.length,
            timestamp: new Date().toISOString()
        };

        return routedResults;
    }

    determineSources(analysis, weights) {
        const sources = [];
        const { intent, isMedical } = analysis;

        const sourcePriority = [
            { source: KnowledgeSource.LOCAL, key: 'localKnowledge' },
            { source: KnowledgeSource.PUBMED, key: 'pubmed' },
            { source: KnowledgeSource.ACADEMIC, key: 'academic' },
            { source: KnowledgeSource.NEWS, key: 'news' }
        ];

        for (const { source, key } of sourcePriority) {
            if (weights[key] > 0 && this.hasSource(source)) {
                sources.push({
                    source,
                    key,
                    name: this.sourceConfigs[source].name,
                    weight: weights[key]
                });
            }
        }

        if (intent === IntentType.NEWS || intent === IntentType.GUIDE) {
            sources.sort((a, b) => {
                if (a.source === KnowledgeSource.NEWS) return -1;
                if (b.source === KnowledgeSource.NEWS) return 1;
                return b.weight - a.weight;
            });
        }

        return sources;
    }

    hasSource(source) {
        switch (source) {
            case KnowledgeSource.LOCAL:
                return !!this.localKnowledgeBase;
            case KnowledgeSource.PUBMED:
                return !!this.pubmedService;
            case KnowledgeSource.ACADEMIC:
                return !!this.academicService;
            case KnowledgeSource.NEWS:
                return !!this.newsService;
            default:
                return false;
        }
    }

    async fetchFromSource(sourceConfig, analysis, topK, requireRecent) {
        const { source, weight } = sourceConfig;
        const config = this.sourceConfigs[source];

        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout: ${config.name}`)), config.timeout)
            );

            const fetchPromise = this.doFetch(source, analysis, topK, requireRecent);
            const result = await Promise.race([fetchPromise, timeoutPromise]);

            console.log(`[知识路由] ✓ ${config.name} 返回 ${result.length} 条结果`);

            return result.map(item => ({
                ...item,
                source: source,
                sourceName: config.name,
                weight: weight
            }));
        } catch (error) {
            console.log(`[知识路由] ✗ ${config.name} 失败: ${error.message}`);
            return [];
        }
    }

    async doFetch(source, analysis, topK, requireRecent) {
        const query = analysis.topic || analysis.rawInput;
        const keywords = analysis.keywords;

        switch (source) {
            case KnowledgeSource.LOCAL:
                return await this.fetchFromLocal(query, keywords, topK);

            case KnowledgeSource.PUBMED:
                return await this.fetchFromPubmed(query, keywords, topK, requireRecent);

            case KnowledgeSource.ACADEMIC:
                return await this.fetchFromAcademic(query, keywords, topK);

            case KnowledgeSource.NEWS:
                return await this.fetchFromNews(query, keywords, topK);

            default:
                return [];
        }
    }

    async fetchFromLocal(query, keywords, topK) {
        if (!this.localKnowledgeBase) {
            return [];
        }

        try {
            const results = await this.localKnowledgeBase.search(query, topK);

            return results.map(r => ({
                content: r.text || r.content || r.chunk,
                title: r.title || query,
                source: KnowledgeSource.LOCAL,
                sourceName: '本地知识库',
                url: r.source || null,
                score: r.score || r.similarity || 0.8,
                metadata: {
                    ...r.metadata,
                    type: 'local'
                }
            }));
        } catch (error) {
            console.error('[知识路由] 本地知识库检索失败:', error.message);
            return [];
        }
    }

    async fetchFromPubmed(query, keywords, topK, requireRecent) {
        if (!this.pubmedService) {
            return [];
        }

        try {
            const searchQuery = keywords.length > 0
                ? `${query} ${keywords.join(' ')}`
                : query;

            const results = await this.pubmedService.searchLiterature(searchQuery, topK);

            return results.map(r => ({
                content: r.abstract || r.summary || r.title,
                title: r.title,
                source: KnowledgeSource.PUBMED,
                sourceName: 'PubMed',
                url: r.url || `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`,
                pmid: r.pmid,
                score: r.score || 0.7,
                metadata: {
                    authors: r.authors,
                    journal: r.journal,
                    date: r.date,
                    type: 'pubmed'
                }
            }));
        } catch (error) {
            console.error('[知识路由] PubMed检索失败:', error.message);
            return [];
        }
    }

    async fetchFromAcademic(query, keywords, topK) {
        if (!this.academicService) {
            return [];
        }

        try {
            const results = await this.academicService.search(query, topK);

            return results.map(r => ({
                content: r.snippet || r.description || r.title,
                title: r.title,
                source: KnowledgeSource.ACADEMIC,
                sourceName: '学术搜索',
                url: r.link || r.url,
                score: r.score || 0.6,
                metadata: {
                    source_name: r.source_name,
                    date: r.date,
                    type: 'academic'
                }
            }));
        } catch (error) {
            console.error('[知识路由] 学术搜索失败:', error.message);
            return [];
        }
    }

    async fetchFromNews(query, keywords, topK) {
        if (!this.newsService) {
            return [];
        }

        try {
            const results = await this.newsService.search(query, topK);

            return results.map(r => ({
                content: r.snippet || r.description || r.title,
                title: r.title,
                source: KnowledgeSource.NEWS,
                sourceName: '行业新闻',
                url: r.url || r.link,
                score: r.score || 0.5,
                metadata: {
                    date: r.date,
                    source_name: r.source_name,
                    type: 'news'
                }
            }));
        } catch (error) {
            console.error('[知识路由] 新闻检索失败:', error.message);
            return [];
        }
    }
}

export function createKnowledgeRouter(options = {}) {
    return new KnowledgeRouter(options);
}
