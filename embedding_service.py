#!/usr/bin/env python3
"""
本地 Embedding 服务 - BGE-M3
使用 FlagEmbedding，高效、专业、中文支持好
"""

from flask import Flask, request, jsonify
from FlagEmbedding import BGEM3FlagModel
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

MODEL = None

def init_model():
    global MODEL
    logger.info("🚀 正在加载 BGE-M3 模型...")
    logger.info("   模型: BAAI/bge-m3")
    logger.info("   特点: 中文检索最强，医学场景适用")
    MODEL = BGEM3FlagModel('BAAI/bge-m3', use_fp16=False)
    logger.info("✅ BGE-M3 模型加载完成!")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": "BGE-M3"})

@app.route('/embed', methods=['POST'])
def embed():
    """单文本 embedding"""
    data = request.json
    text = data.get('text', '')

    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        start = time.time()
        result = MODEL.encode([text])
        embedding = result['dense_vecs'][0].tolist()
        dimensions = len(embedding)

        return jsonify({
            "embedding": embedding,
            "dimensions": dimensions,
            "model": "BAAI/bge-m3",
            "time_ms": int((time.time() - start) * 1000)
        })
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/embed/batch', methods=['POST'])
def embed_batch():
    """批量文本 embedding"""
    data = request.json
    texts = data.get('texts', [])

    if not texts:
        return jsonify({"error": "texts is required"}), 400

    try:
        start = time.time()
        result = MODEL.encode(texts)
        embeddings = result['dense_vecs'].tolist()

        return jsonify({
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimensions": len(embeddings[0]) if embeddings else 0,
            "model": "BAAI/bge-m3",
            "time_ms": int((time.time() - start) * 1000)
        })
    except Exception as e:
        logger.error(f"Batch embedding error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_model()
    app.run(host='127.0.0.1', port=8080, debug=False)
