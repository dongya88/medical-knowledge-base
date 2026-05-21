/**
 * 智能内容工作流 (Smart Content Pipeline)
 * 整合所有模块：意图分析 → 知识路由 → 多源检索 → 信息融合 → LLM生成 → 合规检查
 */

import { analyzeIntent, IntentType, createIntentAnalyzer } from './intentAnalyzer.js';
import { createKnowledgeRouter, KnowledgeSource } from './knowledgeRouter.js';
import {
    createPubmedService,
    createAcademicService,
    createNewsService,
    createLocalKnowledgeService
} from './multiSourceRetriever.js';
import { createInfoFusion } from './infoFusion.js';
import { createComplianceChecker } from './complianceChecker.js';

export class SmartContentPipeline {
    constructor(options = {}) {
        this.intentAnalyzer = createIntentAnalyzer();
        this.knowledgeRouter = createKnowledgeRouter();
        this.infoFusion = createInfoFusion();
        this.complianceChecker = createComplianceChecker();
        this.geminiService = options.geminiService || null;
        this.llmProvider = options.llmProvider || 'gemini';

        this.defaultOptions = {
            topK: 10,
            maxContextLength: 4000,
            enableComplianceCheck: true,
            recencyBoost: true,
            ...options
        };
    }

    initialize(knowledgeBaseRAG) {
        const localService = createLocalKnowledgeService(knowledgeBaseRAG);
        this.knowledgeRouter.setLocalKnowledgeBase(localService);

        this.pubmedService = createPubmedService();
        this.knowledgeRouter.setPubmedService(this.pubmedService);

        this.academicService = createAcademicService();
        this.knowledgeRouter.setAcademicService(this.academicService);

        this.newsService = createNewsService();
        this.knowledgeRouter.setNewsService(this.newsService);

        console.log('[智能工作流] 初始化完成');
    }

    async process(input, options = {}) {
        const startTime = Date.now();
        const opts = { ...this.defaultOptions, ...options };

        console.log('\n' + '='.repeat(60));
        console.log('[智能工作流] 开始处理');
        console.log('='.repeat(60));

        const step1Intent = Date.now();
        const intentResult = this.intentAnalyzer.analyze(input);
        console.log(`[Step 1] 意图分析: ${intentResult.intent} (${Date.now() - step1Intent}ms)`);

        const step2Route = Date.now();
        const routedResults = await this.knowledgeRouter.route(input, {
            weights: opts.weights || intentResult.routerConfig?.weights,
            topK: opts.topK,
            requireRecent: opts.requireRecent
        });
        console.log(`[Step 2] 知识路由: ${routedResults.totalResults} 条结果 (${Date.now() - step2Route}ms)`);

        const step3Fusion = Date.now();
        const fusedData = await this.infoFusion.fuse(routedResults.results, {
            topK: opts.topK,
            recencyBoost: opts.recencyBoost
        });
        console.log(`[Step 3] 信息融合: ${fusedData.items.length} 条 (${Date.now() - step3Fusion}ms)`);

        const context = this.infoFusion.buildContext(fusedData.items, {
            maxLength: opts.maxContextLength
        });
        console.log(`[Step 3b] 上下文构建: ${context.totalLength} 字符`);

        let generatedContent = null;
        let complianceResult = null;

        if (opts.generate !== false) {
            const step4Generate = Date.now();
            generatedContent = await this.generateContent(input, intentResult, context, opts);
            console.log(`[Step 4] 内容生成: ${generatedContent.content?.length || 0} 字符 (${Date.now() - step4Generate}ms)`);

            if (opts.enableComplianceCheck && generatedContent.content) {
                const step5Compliance = Date.now();
                complianceResult = await this.complianceChecker.check(generatedContent.content);
                console.log(`[Step 5] 合规检查: ${complianceResult.passed ? '通过' : '发现问题'} (${Date.now() - step5Compliance}ms)`);
            }
        }

        const totalTime = Date.now() - startTime;
        console.log('\n' + '='.repeat(60));
        console.log(`[智能工作流] 完成! 总耗时: ${totalTime}ms`);
        console.log('='.repeat(60) + '\n');

        return {
            intent: intentResult,
            routedSources: routedResults.sources,
            retrievedItems: fusedData.items,
            fusionStats: fusedData.stats,
            context,
            content: generatedContent,
            compliance: complianceResult,
            metadata: {
                totalTime,
                steps: {
                    intent: intentResult,
                    routing: routedResults,
                    fusion: fusedData,
                    generation: generatedContent,
                    compliance: complianceResult
                }
            }
        };
    }

    async generateContent(input, intentResult, context, options = {}) {
        const { topic, intent, platform } = intentResult;

        const prompt = this.buildPrompt(input, intentResult, context);

        if (!this.geminiService) {
            return {
                content: this.generateFallbackContent(input, context),
                prompt,
                source: 'fallback'
            };
        }

        try {
            const result = await this.geminiService.generateContent(prompt);

            return {
                content: result.content || result.text || '',
                prompt,
                source: 'gemini',
                usage: result.usage || null
            };
        } catch (error) {
            console.error('[智能工作流] 生成失败:', error.message);
            return {
                content: this.generateFallbackContent(input, context),
                prompt,
                source: 'fallback',
                error: error.message
            };
        }
    }

    buildPrompt(input, intentResult, context) {
        const { intent, topic, isMedical } = intentResult;
        const contextText = context.context;

        let styleGuidance = '';
        switch (intent) {
            case IntentType.SCIENCE:
                styleGuidance = '用通俗易懂的语言解释，适合大众阅读，避免过多专业术语';
                break;
            case IntentType.NEWS:
                styleGuidance = '新闻报道风格，客观准确，注重时效性';
                break;
            case IntentType.MECHANISM:
                styleGuidance = '专业深入的分析，可以适当使用专业术语，但需解释清楚';
                break;
            case IntentType.COMPARISON:
                styleGuidance = '对比分析，条理清晰，用表格或列表对比优劣';
                break;
            case IntentType.GUIDE:
                styleGuidance = '实用指南，操作性强，步骤清晰';
                break;
            default:
                styleGuidance = '内容丰富，有理有据';
        }

        let medicalDisclaimer = '';
        if (isMedical) {
            medicalDisclaimer = '\n\n【重要提示】本内容仅供参考，不能替代专业医生的诊断和治疗。如有健康问题，请咨询专业医疗机构。';
        }

        const prompt = `你是一位专业的医疗健康内容创作者。请根据以下信息创作内容。

【用户需求】
${input}

【内容主题】
${topic}

【文章类型】
${intent}

【写作风格】
${styleGuidance}

【参考信息】
${contextText || '暂无相关参考信息'}

【写作要求】
1. 内容科学准确，引用权威来源
2. 语言生动流畅，适合目标读者
3. 结构清晰，层次分明
4. 如涉及医疗内容，需添加免责声明${medicalDisclaimer}

请开始创作：`;

        return prompt;
    }

    generateFallbackContent(input, context) {
        return `【${input}】

${context.context || '暂无相关知识库内容'}

---
注意：这是基于本地知识库的内容生成演示。如需更丰富的生成效果，请配置 Gemini API Key。

免责声明：本内容仅供参考，不构成医疗建议。`;
    }

    async checkCompliance(content) {
        return await this.complianceChecker.check(content);
    }

    getIntentAnalyzer() {
        return this.intentAnalyzer;
    }

    getRouter() {
        return this.knowledgeRouter;
    }

    setGeminiService(service) {
        this.geminiService = service;
    }
}

export function createSmartContentPipeline(options = {}) {
    return new SmartContentPipeline(options);
}
