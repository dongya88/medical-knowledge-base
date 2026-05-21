import { generateEmbedding, generateEmbeddingsBatch, getEmbeddingDimensions } from './embeddingService.js';
import { createChunkService } from './chunkService.js';
import { createPDFService } from './pdfService.js';
import { initializeCollection, upsertVectors, searchVectors, getCollectionInfo, VECTOR_SIZE } from './qdrantService.js';

export class KnowledgeBaseRAG {
    constructor(options = {}) {
        this.chunkService = createChunkService({
            chunkSize: options.chunkSize || 1000,
            chunkOverlap: options.chunkOverlap || 150,
            minChunkSize: options.minChunkSize || 800,
            maxChunkSize: options.maxChunkSize || 1200
        });
        this.pdfService = createPDFService();
        this.batchSize = options.batchSize || 10;
        this.forceRecreate = options.forceRecreate === true;
    }

    async initialize(forceRecreate = false) {
        console.log('🔄 初始化知识库RAG系统...');
        console.log(`📐 Embedding维度: ${getEmbeddingDimensions()}`);
        console.log(`📐 Qdrant向量维度: ${VECTOR_SIZE}`);

        if (getEmbeddingDimensions() !== VECTOR_SIZE) {
            throw new Error(`维度不匹配! Embedding: ${getEmbeddingDimensions()}, Qdrant: ${VECTOR_SIZE}`);
        }

        await initializeCollection(forceRecreate);
        const info = await this.getStats();
        console.log(`✅ 知识库初始化完成: ${info.pointsCount} 条记录`);
        return info;
    }

    async uploadFile(filePath, metadata = {}) {
        console.log(`📤 开始处理文件: ${filePath}`);

        const parsed = await this.pdfService.parseFile(filePath);

        if (!parsed.success) {
            throw new Error(`文件解析失败: ${parsed.error}`);
        }

        if (!parsed.content || parsed.content.length < 100) {
            throw new Error(`文件内容过短或为空: ${parsed.content?.length || 0} 字符`);
        }

        console.log(`📄 解析成功: ${parsed.title}, ${parsed.pages} 页, ${parsed.content.length} 字符`);

        const chunks = this.chunkService.chunkText(parsed.content, {
            source: filePath,
            title: parsed.title,
            uploadTime: new Date().toISOString(),
            category: metadata.category || 'general',
            fileType: parsed.metadata?.fileType || 'pdf'
        });

        console.log(`✂️ 文本切分完成: ${chunks.length} 个chunk`);

        const stats = this.chunkService.getChunkStats(chunks);
        console.log(`📊 Chunk统计: 平均${stats.avgChunkSize}字, 最大${stats.maxChunkSize}字`);

        const result = await this.processChunks(chunks, {
            title: parsed.title,
            source: filePath,
            category: metadata.category || 'general'
        });

        return {
            success: true,
            title: parsed.title,
            filePath,
            totalChunks: chunks.length,
            uploadedChunks: result.uploadedCount,
            stats
        };
    }

    async processChunks(chunks, metadata) {
        let uploadedCount = 0;
        const totalChunks = chunks.length;

        for (let i = 0; i < chunks.length; i += this.batchSize) {
            const batch = chunks.slice(i, i + this.batchSize);
            const batchNum = Math.floor(i / this.batchSize) + 1;
            const totalBatches = Math.ceil(totalChunks / this.batchSize);

            console.log(`⏳ 处理批次 ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

            try {
                const texts = batch.map(c => c.text);
                const points = [];
                let embeddings;

                try {
                    embeddings = await generateEmbeddingsBatch(texts);
                } catch (batchError) {
                    console.warn(`⚠️ 批量Embedding失败，切换到单条模式: ${batchError.message}`);
                    embeddings = [];
                    for (const text of texts) {
                        const result = await generateEmbedding(text);
                        embeddings.push(result);
                    }
                }

                for (let idx = 0; idx < batch.length; idx++) {
                    const chunk = batch[idx];
                    points.push({
                        id: `${metadata.source}_${chunk.metadata.chunkIndex}`,
                        vector: embeddings[idx].embedding,
                        payload: {
                            text: chunk.text,
                            source: metadata.source,
                            title: metadata.title,
                            uploadTime: new Date().toISOString(),
                            category: metadata.category,
                            chunkIndex: chunk.metadata.chunkIndex,
                            charCount: chunk.metadata.charCount
                        }
                    });
                }

                await upsertVectors(points);
                uploadedCount += batch.length;

                console.log(`✅ 批次 ${batchNum} 完成 (${uploadedCount}/${totalChunks})`);

            } catch (error) {
                console.error(`❌ 批次 ${batchNum} 失败:`, error.message);
                throw error;
            }
        }

        return { uploadedCount };
    }

    async search(query, limit = 5, category = null) {
        console.log(`🔍 搜索: "${query}", limit=${limit}`);

        const { embedding } = await generateEmbedding(query);

        const filter = category ? {
            must: [
                { key: 'category', match: { value: category } }
            ]
        } : null;

        const results = await searchVectors(embedding, limit, filter);

        const formattedResults = results.map(r => ({
            text: r.payload.text,
            title: r.payload.title,
            source: r.payload.source,
            category: r.payload.category,
            uploadTime: r.payload.uploadTime,
            score: r.score,
            normalizedScore: r.normalizedScore || r.score,
            charCount: r.payload.charCount,
            chunkIndex: r.payload.chunkIndex
        }));

        const sortedResults = formattedResults.sort((a, b) => b.normalizedScore - a.normalizedScore);

        console.log(`✅ 搜索完成: ${sortedResults.length} 条结果`);
        console.log(`   最高相关度: ${sortedResults[0]?.normalizedScore || 0}`);
        console.log(`   平均相关度: ${(sortedResults.reduce((sum, r) => sum + r.normalizedScore, 0) / sortedResults.length || 0).toFixed(3)}`);

        return {
            query,
            results: sortedResults,
            total: sortedResults.length,
            avgScore: sortedResults.length > 0
                ? (sortedResults.reduce((sum, r) => sum + r.normalizedScore, 0) / sortedResults.length).toFixed(3)
                : 0,
            maxScore: sortedResults[0]?.normalizedScore || 0
        };
    }

    async getStats() {
        return await getCollectionInfo();
    }

    async deleteBySource(source) {
        console.log(`🗑️ 删除来源: ${source}`);
        return { success: true, message: '需要实现批量删除API' };
    }
}

export function createKnowledgeBaseRAG(options) {
    return new KnowledgeBaseRAG(options);
}

export default KnowledgeBaseRAG;