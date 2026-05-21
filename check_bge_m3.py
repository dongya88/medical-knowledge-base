import time

def log(msg):
    print(f"[CHECK] {msg}")

try:
    log("1️⃣ 检查 torch ...")
    import torch
    log(f"torch版本: {torch.__version__}")

    log("2️⃣ 检查 FlagEmbedding ...")
    from FlagEmbedding import BGEM3FlagModel
    log("FlagEmbedding 导入成功")

    log("3️⃣ 加载 BGE-M3 模型（首次会较慢）...")
    start = time.time()

    model = BGEM3FlagModel(
        "BAAI/bge-m3",
        use_fp16=False  # CPU 必须关 fp16
    )

    log(f"模型加载完成，用时 {time.time() - start:.2f}s")

    log("4️⃣ 单句 embedding 测试 ...")
    text = "糖尿病的主要症状有哪些？"
    vec = model.encode(text)

    log(f"向量维度: {len(vec)}")

    log("5️⃣ 稳定性测试（连续3次推理）...")
    for i in range(3):
        vec = model.encode(f"测试文本 {i}")
        log(f"第{i+1}次 OK，维度={len(vec)}")

    log("🎉 结论：BGE-M3 在当前机器可用（稳定）")

except Exception as e:
    log("❌ 失败：BGE-M3 不适合当前环境")
    print("错误信息：")
    print(e)