/**
 * 信息融合层 (Information Fusion)
 * 功能：对多源检索结果进行去重、排序、权重计算
 */

import { generateEmbedding } from './embeddingService.js';

const SIMILARITY_THRESHOLD = 0.85;
const MIN_SCORE = 0.3;

export class InfoFusion {
    constructor(options = {}) {
        this.similarityThreshold = options.similarityThreshold || SIMILARITY_THRESHOLD;
        this.embeddingFn = options.embeddingFn || generateEmbedding;
        this.sourceWeights = {
            local: 1.2,
            pubmed: 1.0,
            academic: 0.8,
            news: 0.6
        };
        this.intentBoost = {
            news: { pubmed: 1.3, news: 1.4 },
            mechanism: { pubmed: 1.4, academic: 1.2 },
            comparison: { local: 1.3, pubmed: 1.1 },
            guide: { local: 1.4, news: 1.2 },
            science: { local: 1.2, pubmed: 1.1 }
        };
    }

    async fuse(results, options = {}) {
        const {
            topK = 10,
            useSemanticDeduplication = true,
            recencyBoost = true,
            intent = 'science'
        } = options;

        console.log(`[信息融合] 收到 ${results.length} 条原始结果, 意图: ${intent}`);

        let fused = [...results];

        if (useSemanticDeduplication) {
            fused = await this.deduplicate(fused);
            console.log(`[信息融合] 去重后: ${fused.length} 条`);
        }

        fused = this.calculateScores(fused, { recencyBoost, intent });

        fused = fused
            .filter(item => item.finalScore >= MIN_SCORE)
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, topK);

        console.log(`[信息融合] 最终返回 ${fused.length} 条`);
        console.log(`[信息融合] 来源分布: ${JSON.stringify(this.countBySource(fused))}`);

        return {
            items: fused,
            stats: {
                total: results.length,
                afterDedup: fused.length,
                sources: this.countBySource(fused)
            }
        };
    }

    async deduplicate(results) {
        const unique = [];
        const seen = [];

        for (const item of results) {
            const isDuplicate = seen.some(seenItem =>
                this.calculateSimilarity(item, seenItem) > this.similarityThreshold
            );

            if (!isDuplicate) {
                unique.push(item);
                seen.push(item);
            } else {
                console.log(`[信息融合] 去重: "${item.title?.substring(0, 30)}..."`);
            }
        }

        return unique;
    }

    calculateSimilarity(item1, item2) {
        const text1 = `${item1.title || ''} ${item1.content || ''}`.toLowerCase();
        const text2 = `${item2.title || ''} ${item2.content || ''}`.toLowerCase();

        const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
        const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));

        if (words1.size === 0 || words2.size === 0) return 0;

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    calculateScores(results, options = {}) {
        const { recencyBoost = true, intent = 'science' } = options;

        const now = Date.now();
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        const oneYear = 365 * 24 * 60 * 60 * 1000;

        const boostMatrix = this.intentBoost[intent] || {};

        const baseScores = results.map(item => {
            let baseScore = item.normalizedScore || item.score || 0.5;

            const sourceWeight = this.sourceWeights[item.source] || 0.5;
            baseScore = baseScore * sourceWeight;

            const intentBoost = boostMatrix[item.source] || 1.0;
            baseScore = baseScore * intentBoost;

            let recencyMultiplier = 1.0;
            if (recencyBoost && item.metadata?.date) {
                const date = new Date(item.metadata.date);
                if (!isNaN(date.getTime())) {
                    const age = now - date.getTime();
                    if (age < oneMonth) {
                        recencyMultiplier = 1.3;
                    } else if (age < oneYear) {
                        recencyMultiplier = 1.1;
                    } else if (age > 2 * oneYear) {
                        recencyMultiplier = 0.8;
                    }
                }
            } else if (recencyBoost && item.uploadTime) {
                const date = new Date(item.uploadTime);
                if (!isNaN(date.getTime())) {
                    const age = now - date.getTime();
                    if (age < oneYear) {
                        recencyMultiplier = 1.2;
                    } else if (age > 3 * oneYear) {
                        recencyMultiplier = 0.7;
                    }
                }
            }
            baseScore *= recencyMultiplier;

            if (item.metadata?.pmid || item.metadata?.type === 'pubmed') {
                if (item.metadata?.journal) {
                    baseScore *= 1.1;
                }
                if (item.metadata?.authors?.length > 3) {
                    baseScore *= 1.05;
                }
            }

            if (item.source === 'local' && item.charCount && item.charCount > 500) {
                baseScore *= 1.05;
            }

            return {
                ...item,
                baseScore,
                sourceWeight,
                intentBoost,
                recencyMultiplier
            };
        });

        const maxBase = Math.max(...baseScores.map(s => s.baseScore));
        const minBase = Math.min(...baseScores.map(s => s.baseScore));
        const range = maxBase - minBase || 1;

        return baseScores.map(item => {
            const normalizedScore = range > 0
                ? (item.baseScore - minBase) / range
                : 0.5;

            const finalScore = Math.min(normalizedScore * 1.2, 1.0);

            return {
                ...item,
                finalScore: Math.round(finalScore * 1000) / 1000,
                scoreBreakdown: {
                    original: item.score,
                    normalized: item.normalizedScore,
                    baseScore: Math.round(item.baseScore * 1000) / 1000,
                    sourceWeight: item.sourceWeight,
                    intentBoost: item.intentBoost,
                    recencyMultiplier: item.recencyMultiplier,
                    finalNormalized: Math.round(normalizedScore * 1000) / 1000
                }
            };
        });
    }

    countBySource(results) {
        const counts = {};
        for (const item of results) {
            const source = item.sourceName || item.source || 'unknown';
            counts[source] = (counts[source] || 0) + 1;
        }
        return counts;
    }

    async semanticRerank(query, results, topK = 5) {
        try {
            const embeddings = await Promise.all(
                results.map(item => this.embeddingFn(
                    `${item.title || ''} ${item.content || ''}`.substring(0, 500)
                ))
            );

            const queryEmbedding = await this.embeddingFn(query);

            const similarities = results.map((item, i) => ({
                item,
                similarity: this.cosineSimilarity(queryEmbedding.embedding, embeddings[i].embedding)
            }));

            similarities.sort((a, b) => b.similarity - a.similarity);

            return similarities.slice(0, topK).map(s => s.item);
        } catch (error) {
            console.error('[信息融合] 语义重排序失败:', error.message);
            return results.slice(0, topK);
        }
    }

    cosineSimilarity(vec1, vec2) {
        if (!vec1 || !vec2 || vec1.length !== vec2.length) {
            return 0;
        }

        let dot = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dot += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
        return denominator === 0 ? 0 : dot / denominator;
    }

    buildContext(fusedResults, options = {}) {
        const { maxLength = 4000, includeMetadata = true } = options;

        let context = '';
        const items = [];

        for (const item of fusedResults) {
            const content = item.content || item.abstract || item.snippet || '';
            const title = item.title || '无标题';

            let entry = `【${title}】\n${content}`;

            if (includeMetadata) {
                const meta = [];
                if (item.sourceName) meta.push(`来源: ${item.sourceName}`);
                if (item.metadata?.authors?.length) meta.push(`作者: ${item.metadata.authors.join(', ')}`);
                if (item.metadata?.journal) meta.push(`期刊: ${item.metadata.journal}`);
                if (item.metadata?.date) meta.push(`日期: ${item.metadata.date}`);
                if (item.url) meta.push(`链接: ${item.url}`);

                if (meta.length > 0) {
                    entry += `\n(${meta.join(' | ')})`;
                }
            }

            if ((context + entry).length <= maxLength) {
                context += entry + '\n\n';
                items.push(item);
            } else {
                break;
            }
        }

        return {
            context: context.trim(),
            items,
            totalLength: context.length,
            itemCount: items.length
        };
    }
}

export function createInfoFusion(options = {}) {
    return new InfoFusion(options);
}
