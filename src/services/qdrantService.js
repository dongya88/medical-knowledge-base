import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'crypto';

const QDRANT_ENDPOINT = 'https://5c7ae7da-db75-4f3f-995a-ef41970fddac.us-west-1-0.aws.cloud.qdrant.io';
const QDRANT_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6MjlmNjEzY2EtMjc1NS00YmE5LTg0YzYtOGY5OGUxZjU3NmM3In0.qnBZrjNDQw7NEJEDfPYIfHW3lSnLeD5B-B49zQSnLFM';

const COLLECTION_NAME = 'medical_knowledge';
const VECTOR_SIZE = 512;

let qdrantClient = null;
let isInitialized = false;

export function getQdrantClient() {
    if (!qdrantClient) {
        qdrantClient = new QdrantClient({
            url: QDRANT_ENDPOINT,
            apiKey: QDRANT_API_KEY,
            checkCompatibility: false
        });
    }
    return qdrantClient;
}

export async function initializeCollection(forceRecreate = false) {
    const client = getQdrantClient();

    try {
        const collections = await client.getCollections();
        const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

        if (exists) {
            if (forceRecreate) {
                await client.deleteCollection(COLLECTION_NAME);
                console.log(`已删除旧集合: ${COLLECTION_NAME}`);
            } else {
                console.log(`集合已存在: ${COLLECTION_NAME}`);
                isInitialized = true;
                return true;
            }
        }

        await client.createCollection(COLLECTION_NAME, {
            vectors: {
                size: VECTOR_SIZE,
                distance: 'Cosine'
            },
            params: {
                hnsw_config: {
                    m: 16,
                    ef_construct: 100
                }
            }
        });

        await client.createPayloadIndex(COLLECTION_NAME, {
            field_name: 'source',
            field_schema: 'keyword'
        });

        await client.createPayloadIndex(COLLECTION_NAME, {
            field_name: 'category',
            field_schema: 'keyword'
        });

        isInitialized = true;
        console.log(`✅ Qdrant集合创建成功: ${COLLECTION_NAME}, 向量维度: ${VECTOR_SIZE}`);
        return true;
    } catch (error) {
        console.error('Qdrant初始化失败:', error.message);
        throw error;
    }
}

export async function searchVectors(queryVector, limit = 5, filter = null) {
    const client = getQdrantClient();

    if (!isInitialized) {
        await initializeCollection();
    }

    try {
        const searchParams = {
            vector: queryVector,
            limit: Math.min(limit * 3, 50),
            with_payload: true,
            score_threshold: 0.3
        };

        if (filter) {
            searchParams.filter = filter;
        }

        const results = await client.search(COLLECTION_NAME, searchParams);

        const normalizedResults = results.map(result => {
            const normalizedScore = normalizeScore(result.score, results[0]?.score || 1);
            return {
                id: result.id,
                score: result.score,
                normalizedScore,
                payload: result.payload
            };
        });

        normalizedResults.sort((a, b) => b.score - a.score);

        return normalizedResults.slice(0, limit).map(r => ({
            id: r.id,
            score: r.score,
            normalizedScore: r.normalizedScore,
            payload: r.payload
        }));
    } catch (error) {
        console.error('向量搜索失败:', error.message);
        throw error;
    }
}

function normalizeScore(score, maxScore) {
    if (maxScore === 0) return 0;
    const normalized = score / maxScore;
    return Math.round(normalized * 1000) / 1000;
}

export async function upsertVectors(points) {
    const client = getQdrantClient();

    if (!isInitialized) {
        await initializeCollection();
    }

    try {
        const result = await client.upsert(COLLECTION_NAME, {
            points: points.map((point, index) => ({
                id: randomUUID(),
                vector: point.vector,
                payload: {
                    text: point.payload.text,
                    source: point.payload.source || '',
                    title: point.payload.title || '',
                    uploadTime: point.payload.uploadTime || new Date().toISOString(),
                    category: point.payload.category || 'general',
                    chunkIndex: point.payload.chunkIndex || 0,
                    charCount: point.payload.charCount || 0
                }
            }))
        });

        console.log(`✅ 向量写入成功: ${points.length} 条`);
        return result;
    } catch (error) {
        console.error('向量写入失败:', error.message);
        throw error;
    }
}

export async function deleteVectors(ids) {
    const client = getQdrantClient();

    try {
        const result = await client.delete(COLLECTION_NAME, {
            points: ids
        });

        console.log(`✅ 向量删除成功: ${ids.length} 条`);
        return result;
    } catch (error) {
        console.error('向量删除失败:', error.message);
        throw error;
    }
}

export async function getCollectionInfo() {
    const client = getQdrantClient();

    try {
        const info = await client.getCollection(COLLECTION_NAME);
        return {
            name: info.name,
            vectorsCount: info.vectors_count,
            pointsCount: info.points_count,
            status: info.status,
            vectorSize: VECTOR_SIZE,
            distance: 'Cosine'
        };
    } catch (error) {
        console.error('获取集合信息失败:', error.message);
        return {
            name: COLLECTION_NAME,
            vectorsCount: 0,
            pointsCount: 0,
            status: 'error',
            error: error.message
        };
    }
}

export async function deleteCollection() {
    const client = getQdrantClient();

    try {
        await client.deleteCollection(COLLECTION_NAME);
        isInitialized = false;
        console.log(`✅ 集合删除成功: ${COLLECTION_NAME}`);
        return true;
    } catch (error) {
        console.error('集合删除失败:', error.message);
        throw error;
    }
}

export function isReady() {
    return isInitialized;
}

export { COLLECTION_NAME, VECTOR_SIZE };