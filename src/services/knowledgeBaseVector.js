import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_ENDPOINT = 'https://5c7ae7da-db75-4f3f-995a-ef41970fddac.us-west-1-0.aws.cloud.qdrant.io';
const QDRANT_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6MjlmNjEzY2EtMjc1NS00YmE5LTg0YzYtOGY5OGUxZjU3NmM3In0.qnBZrjNDQw7NEJEDfPYIfHW3lSnLeD5B-B49zQSnLFM';

const COLLECTION_NAME = 'medical_knowledge';

const qdrant = new QdrantClient({
    url: QDRANT_ENDPOINT,
    apiKey: QDRANT_API_KEY
});

let isInitialized = false;

export async function initializeCollection() {
    try {
        const collections = await qdrant.getCollections();
        const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

        if (!exists) {
            await qdrant.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: 1024,
                    distance: 'Cosine'
                }
            });
            console.log('✅ Qdrant 集合创建成功');
        }

        isInitialized = true;
        console.log('✅ Qdrant 知识库已就绪');
        return true;
    } catch (error) {
        console.error('❌ Qdrant 初始化失败:', error.message);
        return false;
    }
}

export async function searchKnowledge(query, limit = 5) {
    if (!isInitialized) {
        await initializeCollection();
    }

    try {
        const embedding = await generateEmbedding(query);
        const searchResults = await qdrant.search(COLLECTION_NAME, {
            vector: embedding,
            limit,
            with_payload: true
        });

        return searchResults.map(result => ({
            content: result.payload.content,
            title: result.payload.title,
            source: result.payload.source,
            category: result.payload.category,
            score: result.score
        }));
    } catch (error) {
        console.error('搜索失败详情:', error.message, error.response?.data || '');
        return [];
    }
}

export async function addKnowledge(title, content, source, category) {
    if (!isInitialized) {
        await initializeCollection();
    }

    try {
        const embedding = await generateEmbedding(content);

        await qdrant.upsert(COLLECTION_NAME, {
            points: [{
                id: Date.now().toString(),
                vector: embedding,
                payload: {
                    title,
                    content,
                    source,
                    category,
                    addedAt: new Date().toISOString()
                }
            }]
        });

        console.log(`✅ 知识添加成功: ${title}`);
        return true;
    } catch (error) {
        console.error('添加知识失败:', error.message);
        return false;
    }
}

export async function addKnowledgeBatch(items) {
    if (!isInitialized) {
        await initializeCollection();
    }

    try {
        const points = [];

        for (const item of items) {
            const embedding = await generateEmbedding(item.content);
            points.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                vector: embedding,
                payload: {
                    title: item.title,
                    content: item.content,
                    source: item.source || '',
                    category: item.category || 'general',
                    addedAt: new Date().toISOString()
                }
            });
        }

        await qdrant.upsert(COLLECTION_NAME, { points });

        console.log(`✅ 批量添加 ${items.length} 条知识成功`);
        return true;
    } catch (error) {
        console.error('批量添加失败:', error.message);
        return false;
    }
}

export async function generateEmbedding(text) {
    try {
        const JINA_API_KEY = 'jina_16c80f2d9a4a49ad9cc332d69cbaf03ffjkLWm2od5MMguxzJ2AqlaLSn9b4';
        const response = await fetch('https://api.jina.ai/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JINA_API_KEY}`
            },
            body: JSON.stringify({
                model: 'jina-embeddings-v3',
                input: text
            })
        });

        if (!response.ok) {
            throw new Error('Jina Embedding API failed: ' + response.status);
        }

        const data = await response.json();
        return data.data[0].embedding;
    } catch (error) {
        console.error('Embedding 生成失败:', error.message);
        throw error;
    }
}

export async function getCollectionInfo() {
    try {
        const info = await qdrant.getCollection(COLLECTION_NAME);
        return {
            vectorsCount: info.vectors_count,
            pointsCount: info.points_count,
            status: info.status
        };
    } catch (error) {
        return { vectorsCount: 0, pointsCount: 0, status: 'error' };
    }
}

export { qdrant, COLLECTION_NAME };