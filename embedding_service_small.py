#!/usr/bin/env python3
"""
本地 Embedding 服务 - BGE-small-zh-v1.5
轻量级模型，CPU友好，完全免费
"""

from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import logging
import os
import time

os.environ['HF_HOME'] = 'D:/hf_models'
os.environ['TRANSFORMERS_CACHE'] = 'D:/hf_models'

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
MODEL = None

def init_model():
    global MODEL
    logger.info("=" * 50)
    logger.info("🚀 正在加载 BGE-small-zh-v1.5 模型...")
    logger.info("   模型: BAAI/bge-small-zh-v1.5")
    logger.info("   特点: 轻量快速，CPU友好")
    logger.info("   缓存目录: D:/hf_models")
    logger.info("=" * 50)
    MODEL = SentenceTransformer('BAAI/bge-small-zh-v1.5')
    logger.info("✅ 模型加载完成!")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": "BAAI/bge-small-zh-v1.5"})

@app.route('/embed', methods=['POST'])
def embed():
    data = request.json
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "text is required"}), 400
    try:
        start = time.time()
        embedding = MODEL.encode(text).tolist()
        return jsonify({
            "embedding": embedding,
            "dimensions": len(embedding),
            "model": "BAAI/bge-small-zh-v1.5",
            "time_ms": int((time.time() - start) * 1000)
        })
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/embed/batch', methods=['POST'])
def embed_batch():
    data = request.json
    texts = data.get('texts', [])
    if not texts:
        return jsonify({"error": "texts is required"}), 400
    try:
        start = time.time()
        embeddings = MODEL.encode(texts).tolist()
        return jsonify({
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimensions": len(embeddings[0]) if embeddings else 0,
            "model": "BAAI/bge-small-zh-v1.5",
            "time_ms": int((time.time() - start) * 1000)
        })
    except Exception as e:
        logger.error(f"Batch embedding error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_model()
    logger.info("🌐 启动 Embedding 服务: http://localhost:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
