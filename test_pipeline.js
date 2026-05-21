/**
 * 端到端最小闭环测试
 * 测试完整流程：意图分析 → 知识路由 → 信息融合 → 生成
 */

import { analyzeIntent } from './src/services/intentAnalyzer.js';
import { createKnowledgeRouter, KnowledgeSource } from './src/services/knowledgeRouter.js';
import { createInfoFusion } from './src/services/infoFusion.js';
import { createLocalKnowledgeService } from './src/services/multiSourceRetriever.js';
import { createComplianceChecker } from './src/services/complianceChecker.js';

const KNOWLEDGE_BASE_RAG = null;

async function testPipeline() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 端到端最小闭环测试');
    console.log('='.repeat(60) + '\n');

    const testQueries = [
        '糖尿病患者饮食应注意什么',
        'GLP-1最新研究进展',
        '司美格鲁肽和利拉鲁肽哪个好',
        '如何科学减肥'
    ];

    for (const query of testQueries) {
        await testSingleQuery(query);
        console.log('\n' + '-'.repeat(60) + '\n');
    }

    console.log('\n✅ 端到端测试完成！\n');
}

async function testSingleQuery(query) {
    console.log(`\n📝 测试查询: "${query}"`);
    console.log('-'.repeat(50));

    console.time('总耗时');

    console.log('\n[Step 1] 意图分析...');
    const intent = analyzeIntent(query);
    console.log(`  意图: ${intent.intent}`);
    console.log(`  主题: ${intent.topic}`);
    console.log(`  关键词: ${intent.keywords.join(', ')}`);
    console.log(`  医学相关: ${intent.isMedical ? '是' : '否'}`);

    console.log('\n[Step 2] 知识路由...');
    const router = createKnowledgeRouter();

    const mockLocalService = {
        async search(q, topK) {
            return [
                {
                    content: `关于"${q}"的本地知识库内容：糖尿病患者应该注意饮食控制，少吃高糖、高脂肪食物，多吃蔬菜水果...`,
                    title: `${q} - 本地知识`,
                    source: 'local',
                    score: 0.9,
                    metadata: { source: 'local_kb', date: '2024-01-01' }
                },
                {
                    content: `补充知识：血糖管理是糖尿病的核心，患者应定期监测血糖水平...`,
                    title: '血糖管理指南',
                    source: 'local',
                    score: 0.85,
                    metadata: { source: 'local_kb', date: '2024-02-01' }
                }
            ];
        }
    };

    router.setLocalKnowledgeBase(mockLocalService);

    const routerConfig = intent.routerConfig;
    console.log(`  权重配置: 本地=${routerConfig.weights.localKnowledge}, PubMed=${routerConfig.weights.pubmed}`);

    console.log('\n[Step 3] 信息融合...');
    const fusion = createInfoFusion();

    const mockResults = [
        {
            content: `关于"${intent.topic}"的权威内容：糖尿病患者饮食应注意：1) 控制总热量摄入；2) 均衡营养；3) 定时定量...`,
            title: '糖尿病饮食指南',
            source: 'local',
            sourceName: '本地知识库',
            score: 0.9,
            metadata: { date: '2024-01-15' }
        },
        {
            content: `最新研究发现：GLP-1受体激动剂在血糖控制方面效果显著...`,
            title: 'GLP-1研究进展',
            source: 'pubmed',
            sourceName: 'PubMed',
            score: 0.85,
            metadata: { date: '2024-03-20', authors: ['王医生'], journal: '新英格兰医学杂志' }
        },
        {
            content: `行业动态：司美格鲁肽已在国内获批用于2型糖尿病治疗...`,
            title: '行业新闻',
            source: 'news',
            sourceName: '行业新闻',
            score: 0.7,
            metadata: { date: '2024-05-01' }
        }
    ];

    const fused = await fusion.fuse(mockResults, { topK: 5 });
    console.log(`  融合后结果: ${fused.items.length} 条`);
    for (const item of fused.items) {
        console.log(`    - [${item.sourceName}] ${item.title} (分数: ${item.finalScore})`);
    }

    console.log('\n[Step 4] 构建上下文...');
    const context = fusion.buildContext(fused.items, { maxLength: 2000 });
    console.log(`  上下文长度: ${context.totalLength} 字符`);
    console.log(`  包含条目: ${context.itemCount} 条`);

    console.log('\n[Step 5] 合规检查...');
    const checker = createComplianceChecker();
    const sampleContent = context.context.substring(0, 500);
    const compliance = await checker.check(sampleContent);
    console.log(`  合规状态: ${compliance.passed ? '通过' : '有问题'}`);
    console.log(`  风险等级: ${compliance.riskLevel}`);
    if (compliance.warnings.length > 0) {
        console.log(`  警告: ${compliance.warnings.length} 条`);
    }

    console.log('\n[Step 6] 生成内容（模拟）...');
    const generatedContent = generateMockContent(query, intent, context);
    console.log(`  生成长度: ${generatedContent.length} 字符`);
    console.log('\n  生成内容预览:');
    console.log('  ' + '-'.repeat(40));
    console.log('  ' + generatedContent.substring(0, 300).replace(/\n/g, '\n  '));
    console.log('  ...');

    console.timeEnd('总耗时');
}

function generateMockContent(query, intent, context) {
    const templates = {
        science: `【${query}】

一、什么是${intent.topic}？

${intent.topic}是医学领域的重要概念。下面为您详细介绍...

二、主要表现

1. 症状表现
${context.context.substring(0, 200)}...

2. 诊断标准
需要通过专业检查来确定...

三、日常管理

1. 饮食建议
少吃高糖、高脂肪食物，多吃蔬菜水果...

2. 运动建议
每周保持150分钟中等强度运动...

四、何时就医

如出现严重症状，应及时就医...

---
免责声明：本内容仅供参考，如有健康问题请咨询专业医生。`,

        guide: `【${query}】

很多朋友问我，${intent.topic}应该怎么做？今天来详细说说...

${context.context.substring(0, 300)}...

## 具体步骤

### 第一步：了解基础知识
${intent.topic}的核心是...

### 第二步：日常实践
1. 记录数据
2. 调整习惯
3. 定期复查

### 第三步：注意事项
- 不要急于求成
- 贵在坚持
- 必要时寻求专业帮助

---
免责声明：本内容仅供参考。`,

        news: `【${intent.topic} 最新动态】

近日，关于${intent.topic}的话题引发关注...

${context.context.substring(0, 200)}...

## 专家解读

业内人士分析认为...

## 相关进展

1. 政策层面
2. 临床应用
3. 市场反应

---
本新闻仅供参考，不构成医疗建议。`
    };

    return templates[intent.intent] || templates.science;
}

testPipeline().catch(console.error);
