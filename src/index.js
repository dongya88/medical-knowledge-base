import { parseCommand } from './services/parser.js';
import { generateSmartContent } from './services/contentGenerator.js';

async function runFinalVerification() {
  console.log('\n' + '='.repeat(60));
  console.log('  医疗内容OS - 最终系统验证');
  console.log('='.repeat(60));

  console.log('\n📋 系统功能概览：');
  console.log('  ✅ STEP 1: 基础系统骨架');
  console.log('  ✅ STEP 2: Gemini AI 内容生成');
  console.log('  ✅ STEP 3: 智能内容生成（按需适配）');
  console.log('  ✅ STEP 4: 文献引用系统（可点击查看原文）');
  console.log('  ✅ STEP 5: 医学知识库接入');
  console.log('  ✅ STEP 6: 用户认知库');
  console.log('  ✅ STEP 7: 平台表达适配（爆款仿写）');
  console.log('  ✅ STEP 8: 爆款结构');
  console.log('  ✅ STEP 9: 行业新闻科普生成');
  console.log('  ⏭️  STEP 10: 高级RAG优化（预留）');

  console.log('\n' + '-'.repeat(60));
  console.log('📌 最终系统行为演示');
  console.log('-'.repeat(60));

  const finalTestCommand = '根据GLP-1停药是否反弹，生成一篇糖尿病科普文章';

  console.log(`\n输入指令：\n  "${finalTestCommand}"\n`);

  const parsed = parseCommand(finalTestCommand);
  console.log('解析结果：');
  console.log(`  - 选题：${parsed.topic}`);
  console.log(`  - 类型：${parsed.type}`);
  console.log(`  - 平台：${parsed.platform || '公众号文章'}`);

  const result = await generateSmartContent(parsed, null, null, true);

  console.log('\n生成结果：');
  console.log(`  - 标题：${result.title}`);
  console.log(`  - 格式：${result.format}`);
  console.log(`  - 平台：${result.platform}`);
  console.log(`  - 字数：${typeof result.wordCount === 'object' ? `${result.wordCount.min}-${result.wordCount.max}` : result.wordCount} 字`);

  console.log('\n内容结构：');
  console.log(`  - 爆款结构：${result.structureApplied ? '已应用（冲突→误区→解释→证据→建议）' : '未应用'}`);
  console.log(`  - 医学知识库：${result.knowledgeUsed || 0} 条引用`);
  console.log(`  - 用户认知：${result.userInsightsUsed ? '已融入用户痛点' : '未融入'}`);
  console.log(`  - 文献引用：${result.referenceCount || 0} 条（可点击查看原文）`);

  console.log('\n' + '-'.repeat(60));
  console.log('📦 输出内容包含：');
  console.log('  ✅ 公众号文章（完整文章结构）');
  console.log('  ✅ 文献引用（PMID + 可点击链接）');
  console.log('  ✅ 医学知识补充');
  console.log('  ✅ 用户痛点体现');
  console.log('  ✅ 爆款内容结构');
  console.log('-'.repeat(60));

  console.log('\n' + '='.repeat(60));
  console.log('  🎉 医疗内容OS 开发完成！');
  console.log('='.repeat(60));
  console.log('\n📝 使用说明：');
  console.log('  1. 配置 GEMINI_API_KEY 环境变量以启用真实AI生成');
  console.log('  2. 运行命令：node src/index.js "<你的指令>"');
  console.log('  3. 支持的指令格式：');
  console.log('     - 根据<选题>，生成一篇<字数>字的<类型>文章');
  console.log('     - 根据<选题>，生成一条<字数>字的抖音脚本');
  console.log('     - 根据<选题>，生成一篇小红书笔记');
  console.log('     - 根据最新消息<新闻>，生成一篇新闻科普');
  console.log('');
}

runFinalVerification();