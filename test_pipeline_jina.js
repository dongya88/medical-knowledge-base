/**
 * 端到端最小闭环测试 - 使用 Jina API
 */

import { analyzeIntent, IntentType, createIntentAnalyzer } from './src/services/intentAnalyzer.js';
import { createKnowledgeRouter } from './src/services/knowledgeRouter.js';
import { createInfoFusion } from './src/services/infoFusion.js';
import { createComplianceChecker } from './src/services/complianceChecker.js';
import { generateEmbedding } from './src/services/embeddingService.js';

const JINA_API_KEY = 'jina_650f7d5f192640408bfa1f0012e8c1e7qQH1OsghGUNJBHW0AtPYDpFNkNiJ';

async function testJinaEmbedding() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 端到端最小闭环测试 (Jina API)');
    console.log('='.repeat(60) + '\n');

    console.log('[Step 0] 测试 Jina Embedding API...');
    try {
        const testEmbedding = await generateEmbedding('糖尿病');
        console.log(`✅ Jina API 正常! 维度: ${testEmbedding.dimensions}`);
    } catch (error) {
        console.error(`❌ Jina API 失败: ${error.message}`);
        return;
    }

    const testQueries = [
        { text: '糖尿病患者饮食应注意什么', expected: 'guide' },
        { text: 'GLP-1最新研究进展', expected: 'news' },
        { text: '司美格鲁肽和利拉鲁肽的区别', expected: 'comparison' },
        { text: '胰岛素的工作机制', expected: 'mechanism' }
    ];

    for (const { text, expected } of testQueries) {
        await testPipeline(text, expected);
        console.log('\n' + '-'.repeat(60) + '\n');
    }

    console.log('\n✅ 端到端测试完成！\n');
}

async function testPipeline(query, expectedIntent) {
    console.log(`\n📝 测试: "${query}"`);
    console.log(`   期望意图: ${expectedIntent}`);
    console.log('-'.repeat(50));

    console.time('总耗时');

    console.log('\n[Step 1] 意图分析...');
    const intent = analyzeIntent(query);
    console.log(`   ✅ 意图: ${intent.intent} ${intent.intent === expectedIntent ? '(匹配)' : '(未匹配)'}`);
    console.log(`   ✅ 主题: ${intent.topic}`);
    console.log(`   ✅ 关键词: ${intent.keywords.join(', ')}`);

    console.log('\n[Step 2] 生成 Query Embedding...');
    let queryEmbedding;
    try {
        const result = await generateEmbedding(query);
        queryEmbedding = result.embedding;
        console.log(`   ✅ Embedding 维度: ${result.dimensions}`);
    } catch (error) {
        console.log(`   ❌ Embedding 失败: ${error.message}`);
        return;
    }

    console.log('\n[Step 3] 知识路由...');
    const analyzer = createIntentAnalyzer();
    const routerConfig = analyzer.getRouterConfig(intent);
    console.log(`   本地知识库权重: ${routerConfig.weights.localKnowledge}`);
    console.log(`   PubMed权重: ${routerConfig.weights.pubmed}`);

    console.log('\n[Step 4] 模拟检索结果融合...');
    const fusion = createInfoFusion();

    const mockResults = [
        {
            content: `关于${intent.topic}的专业内容：研究表明，糖尿病患者通过合理的饮食控制和运动，可以有效控制血糖水平...`,
            title: `${intent.topic}饮食指南`,
            source: 'local',
            sourceName: '本地知识库',
            score: 0.9,
            metadata: { date: '2024-01-15' }
        },
        {
            content: `最新医学研究显示：GLP-1受体激动剂在血糖控制方面效果显著...`,
            title: 'GLP-1最新研究',
            source: 'pubmed',
            sourceName: 'PubMed',
            score: 0.85,
            metadata: { date: '2024-03-20', journal: '新英格兰医学杂志' }
        }
    ];

    const fused = await fusion.fuse(mockResults, { topK: 5 });
    console.log(`   ✅ 融合后: ${fused.items.length} 条结果`);
    for (const item of fused.items) {
        console.log(`      - [${item.sourceName}] 分数: ${item.finalScore}`);
    }

    console.log('\n[Step 5] 构建上下文...');
    const context = fusion.buildContext(fused.items, { maxLength: 1500 });
    console.log(`   ✅ 上下文: ${context.totalLength} 字符`);

    console.log('\n[Step 6] 合规检查...');
    const checker = createComplianceChecker();
    const sampleContent = `${context.context}\n\n研究表明，糖尿病患者应该少吃糖，多运动...`;
    const compliance = await checker.check(sampleContent);
    console.log(`   ✅ 合规状态: ${compliance.passed ? '通过' : '有问题'}`);
    console.log(`   ✅ 风险等级: ${compliance.riskLevel}`);
    if (compliance.warnings.length > 0) {
        console.log(`   ⚠️ 警告: ${compliance.warnings.length} 条`);
    }

    console.log('\n[Step 7] 内容生成...');
    const content = generateContent(query, intent, context);
    console.log(`   ✅ 生成长度: ${content.length} 字符`);
    console.log('\n   📄 生成内容预览:');
    console.log('   ' + '-'.repeat(40));
    const lines = content.split('\n').slice(0, 10);
    for (const line of lines) {
        console.log('   ' + line);
    }
    if (content.split('\n').length > 10) {
        console.log('   ...');
    }

    console.timeEnd('总耗时');
}

function generateContent(query, intent, context) {
    const templates = {
        guide: `【${query}】

很多朋友问，${intent.topic}应该怎么做？下面详细说说。

一、核心要点
${context.context.substring(0, 300)}...

二、具体操作步骤

1. 了解基础
首先需要了解自己的身体状况...

2. 制定计划
根据个人情况制定合适的方案...

3. 坚持执行
坚持是最重要的...

三、注意事项
- 如有疑问，请咨询专业医生
- 本内容仅供参考

---
免责声明：本内容仅供参考，不构成医疗建议。`,

        news: `【${intent.topic} 最新动态】

近日，关于${intent.topic}的话题引发关注。

${context.context.substring(0, 200)}...

## 专家解读

业内人士分析认为，这一进展对患者具有重要意义。

## 相关背景

数据显示...

---
本内容仅供参考。`,

        comparison: `【${intent.topic} 对比分析】

很多朋友纠结${intent.topic}，今天来客观分析一下。

一、相同点
${context.context.substring(0, 200)}...

二、不同点
1. 作用机制
2. 使用方便性
3. 副作用

三、适用人群
建议根据个人情况选择...

---
免责声明：本内容仅供参考。`,

        mechanism: `【${intent.topic} 机制解析】

今天深入讲解${intent.topic}的作用机制。

一、基础原理
${context.context.substring(0, 250)}...

二、详细机制
1. 第一步：...
2. 第二步：...
3. 第三步：...

三、临床意义
理解这些机制有助于更好地...

---
本内容仅供专业人士参考。`,

        science: `【${intent.topic} 科普】

今天来聊聊${intent.topic}这个话题。

一、什么是${intent.topic}？
${context.context.substring(0, 200)}...

二、主要特点
1. 特点一
2. 特点二
3. 特点三

三、日常注意事项
- 注意观察身体变化
- 必要时及时就医

---
免责声明：本内容仅供参考。`
    };

    return templates[intent.intent] || templates.science;
}

testJinaEmbedding().catch(console.error);
