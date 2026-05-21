/**
 * 多源检索服务 (Multi-Source Retriever)
 * 功能：封装各知识源的检索实现
 *
 * 支持：
 * - PubMed: 医学文献检索
 * - Academic: 学术搜索 (Google Scholar via SerpAPI)
 * - News: 行业新闻检索
 */

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PUBMED_API_KEY = process.env.PUBMED_API_KEY || '';

export class PubmedService {
    constructor(options = {}) {
        this.apiKey = options.apiKey || PUBMED_API_KEY;
        this.maxResults = options.maxResults || 10;
        this.sort = options.sort || 'relevance';
    }

    async searchLiterature(query, maxResults = 10) {
        try {
            const searchUrl = `${PUBMED_API_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance${this.apiKey ? `&api_key=${this.apiKey}` : ''}`;

            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();

            if (!searchData.esearchresult?.idlist?.length) {
                return [];
            }

            const ids = searchData.esearchresult.idlist.slice(0, maxResults);
            const details = await this.fetchDetails(ids);

            return details.map(item => this.formatResult(item));
        } catch (error) {
            console.error('[PubMed] 检索失败:', error.message);
            return [];
        }
    }

    async fetchDetails(ids) {
        if (!ids.length) return [];

        const idsStr = ids.join(',');
        const fetchUrl = `${PUBMED_API_BASE}/efetch.fcgi?db=pubmed&id=${idsStr}&retmode=xml`;

        try {
            const response = await fetch(fetchUrl);
            const xmlText = await response.text();
            return this.parseXML(xmlText);
        } catch (error) {
            console.error('[PubMed] 获取详情失败:', error.message);
            return [];
        }
    }

    parseXML(xmlText) {
        const results = [];
        const articleMatches = xmlText.split(/<PubmedArticle>|<\/PubmedArticle>/);

        for (const articleBlock of articleMatches) {
            if (!articleBlock.includes('<PMID')) continue;

            let abstract = '';
            const absStart = articleBlock.indexOf('<AbstractText');
            if (absStart !== -1) {
                const absEnd = articleBlock.indexOf('</AbstractText>', absStart);
                if (absEnd !== -1) {
                    abstract = articleBlock.substring(absStart, absEnd).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                }
            }

            const authors = [];
            const authorListMatch = articleBlock.match(/<AuthorList>[\s\S]*?<\/AuthorList>/);
            if (authorListMatch) {
                const authorMatchesLocal = authorListMatch[0].match(/<LastName>([^<]+)<\/LastName>[\s\S]*?<ForeName>([^<]+)<\/ForeName>/g) || [];
                for (const am of authorMatchesLocal.slice(0, 5)) {
                    const ln = am.match(/<LastName>([^<]+)<\/LastName>/);
                    const fn = am.match(/<ForeName>([^<]+)<\/ForeName>/);
                    if (ln && fn) {
                        authors.push(`${fn[1]} ${ln[1]}`.trim());
                    }
                }
            }

            const journalMatch = articleBlock.match(/<Journal>[\s\S]*?<Title>([^<]+)<\/Title>[\s\S]*?<\/Journal>/);

            const pubDateMatch = articleBlock.match(/<PubDate>[\s\S]*?<\/PubDate>/);
            const doiMatch = articleBlock.match(/<ArticleId[^>]*idtype="doi"[^>]*>([^<]+)<\/ArticleId>/);

            let year = '', month = '', day = '';
            if (pubDateMatch) {
                const ym = pubDateMatch[0].match(/<Year>([^<]+)<\/Year>/);
                const mm = pubDateMatch[0].match(/<Month>([^<]+)<\/Month>/);
                const dm = pubDateMatch[0].match(/<Day>([^<]+)<\/Day>/);
                year = ym ? ym[1] : '';
                month = mm ? mm[1] : '';
                day = dm ? dm[1] : '';
            }

            const pmidMatch = articleBlock.match(/<PMID[^>]*>([^<]+)<\/PMID>/);
            const titleMatch = articleBlock.match(/<ArticleTitle[^>]*>([^<]+)<\/ArticleTitle>/);
            const pmid = pmidMatch ? pmidMatch[1] : '';
            const title = titleMatch ? titleMatch[1] : '';

            if (pmid && title) {
                results.push({
                    pmid,
                    title,
                    abstract,
                    authors,
                    journal: journalMatch ? journalMatch[1] : '',
                    date: `${year}-${month}-${day}`.replace(/-+/g, '-').replace(/-$/, ''),
                    doi: doiMatch ? doiMatch[1] : '',
                    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
                });
            }
            if (results.length >= 10) break;
        }

        return results;
    }

    formatResult(item) {
        return {
            pmid: item.pmid,
            title: item.title,
            abstract: item.abstract,
            summary: item.abstract?.substring(0, 300) + (item.abstract?.length > 300 ? '...' : ''),
            authors: item.authors,
            authorString: item.authors?.join(', '),
            journal: item.journal,
            date: item.date,
            url: item.url,
            score: 0.8,
            type: 'pubmed'
        };
    }
}

export class AcademicService {
    constructor(options = {}) {
        this.apiKey = options.serpApiKey || process.env.SERPAPI_KEY || '';
        this.maxResults = options.maxResults || 10;
    }

    async search(query, maxResults = 10) {
        if (!this.apiKey) {
            console.log('[Academic] 未配置 SerpAPI Key，使用模拟数据');
            return this.getMockResults(query, maxResults);
        }

        try {
            const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google_scholar&num=${maxResults}&api_key=${this.apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            const results = data.organic_results || [];
            return results.map(item => ({
                title: item.title,
                snippet: item.snippet,
                link: item.link,
                source_name: 'Google Scholar',
                date: item.publication_info?.summary || '',
                score: 0.7,
                type: 'academic'
            }));
        } catch (error) {
            console.error('[Academic] 检索失败:', error.message);
            return this.getMockResults(query, maxResults);
        }
    }

    getMockResults(query, maxResults) {
        return [{
            title: `${query} 相关研究`,
            snippet: `关于${query}的学术研究综述...`,
            link: '#',
            source_name: 'Google Scholar',
            date: '2024',
            score: 0.5,
            type: 'academic'
        }];
    }
}

export class NewsService {
    constructor(options = {}) {
        this.apiKey = options.serpApiKey || process.env.SERPAPI_KEY || '';
        this.maxResults = options.maxResults || 10;
    }

    async search(query, maxResults = 10) {
        if (!this.apiKey) {
            console.log('[News] 未配置 SerpAPI Key，使用模拟数据');
            return this.getMockNews(query, maxResults);
        }

        try {
            const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google_news&num=${maxResults}&api_key=${this.apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            const results = data.news_results || [];
            return results.map(item => ({
                title: item.title,
                snippet: item.snippet,
                link: item.link,
                source_name: item.source?.name || 'News',
                date: item.date || new Date().toISOString(),
                score: 0.6,
                type: 'news'
            }));
        } catch (error) {
            console.error('[News] 检索失败:', error.message);
            return this.getMockNews(query, maxResults);
        }
    }

    getMockNews(query, maxResults) {
        return [{
            title: `${query} 最新资讯`,
            snippet: `关于${query}的最新行业动态...`,
            link: '#',
            source_name: '行业新闻',
            date: new Date().toISOString(),
            score: 0.4,
            type: 'news'
        }];
    }
}

export class LocalKnowledgeService {
    constructor(knowledgeBaseRAG) {
        this.kb = knowledgeBaseRAG;
    }

    async search(query, maxResults = 10) {
        if (!this.kb) {
            return [];
        }

        try {
            const result = await this.kb.search(query, maxResults);
            const items = result.results || [];

            return items.map(item => ({
                content: item.text || item.content,
                title: item.title || query,
                source: 'local',
                sourceName: '本地知识库',
                url: item.metadata?.source || null,
                score: item.score || 0.9,
                normalizedScore: item.normalizedScore || item.score || 0.9,
                metadata: item,
                type: 'local'
            }));
        } catch (error) {
            console.error('[LocalKnowledge] 检索失败:', error.message);
            return [];
        }
    }
}

export function createPubmedService(options = {}) {
    return new PubmedService(options);
}

export function createAcademicService(options = {}) {
    return new AcademicService(options);
}

export function createNewsService(options = {}) {
    return new NewsService(options);
}

export function createLocalKnowledgeService(knowledgeBaseRAG) {
    return new LocalKnowledgeService(knowledgeBaseRAG);
}
