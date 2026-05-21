const LOCAL_EMBEDDING_URL = 'http://localhost:5000';
const LOCAL_MODEL = 'BGE-small-zh-v1.5';
const EMBEDDING_DIMENSIONS = 512;

export async function initEmbeddingModel() {
    console.log('📥 检查本地 Embedding 服务...');
    console.log(`   模型: ${LOCAL_MODEL}`);
    console.log(`   向量维度: ${EMBEDDING_DIMENSIONS}`);
    console.log(`   服务地址: ${LOCAL_EMBEDDING_URL}`);

    try {
        const response = await fetch(`${LOCAL_EMBEDDING_URL}/health`);
        if (response.ok) {
            console.log('✅ 本地 Embedding 服务已就绪');
            return true;
        } else {
            console.warn(`⚠️ 本地服务响应: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.warn('⚠️ 本地 Embedding 服务不可用:', error.message);
        return false;
    }
}

export async function generateEmbedding(text) {
    try {
        const response = await fetch(`${LOCAL_EMBEDDING_URL}/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`本地Embedding错误 ${response.status}: ${error}`);
        }

        const data = await response.json();
        return {
            embedding: data.embedding,
            dimensions: data.dimensions,
            model: data.model
        };
    } catch (error) {
        console.error('Embedding生成失败:', error.message);
        throw error;
    }
}

export async function generateEmbeddingsBatch(texts) {
    try {
        const response = await fetch(`${LOCAL_EMBEDDING_URL}/embed/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`本地Embedding批量错误 ${response.status}: ${error}`);
        }

        const data = await response.json();
        return data.embeddings.map((embedding, i) => ({
            embedding,
            dimensions: embedding.length,
            model: data.model,
            index: i
        }));
    } catch (error) {
        console.error('批量Embedding生成失败:', error.message);
        throw error;
    }
}

export function getEmbeddingDimensions() {
    return EMBEDDING_DIMENSIONS;
}
