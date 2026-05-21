import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { searchKnowledge, initializeCollection } from './src/services/knowledgeBaseVector.js';
import { createPubmedService } from './src/services/multiSourceRetriever.js';
import KnowledgeBaseRAG from './src/services/knowledgeBaseRAG.js';
import { initializeDatabase, getUserByUsername, verifyPassword } from './database.js';

const envPath = resolve('.env');
try {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (!line) return;
        if (line.includes('=')) {
            const [key, ...vals] = line.split('=');
            if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
        } else if (!process.env.ZHIPU_API_KEY) {
            process.env.ZHIPU_API_KEY = line;
        }
    });
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'content-os-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', apiLimiter);

initializeDatabase().catch(err => {
    console.error('❌ 数据库初始化失败:', err.message);
    console.log('ℹ️ 如果是DATABASE_URL未设置，请检查环境变量配置');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: '请输入用户名和密码' });
    }

    try {
        const user = await getUserByUsername(username);

        if (!user) {
            return res.status(401).json({ success: false, error: '用户名或密码错误' });
        }

        if (!verifyPassword(password, user.password)) {
            return res.status(401).json({ success: false, error: '用户名或密码错误' });
        }

        req.session.user = {
            id: user.id,
            username: user.username
        };

        res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: '退出失败' });
        }
        res.json({ success: true, message: '已退出登录' });
    });
});

app.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ authenticated: false, error: '未登录' });
    }
    res.json({ authenticated: true, user: req.session.user });
});

app.get('/status', (req, res) => {
    res.json({
        aiConnected: !!ZHIPU_API_KEY,
        knowledgeBaseReady: true,
        version: '1.0.0'
    });
});

let pubmedService = null;

const knowledgeBaseRAG = new KnowledgeBaseRAG('medical_knowledge');

async function initializeServices() {
    try {
        await knowledgeBaseRAG.initialize();
        pubmedService = createPubmedService();
    } catch (e) {
        console.log('⚠️ 知识库初始化失败:', e.message);
    }
}

initializeServices();

app.post('/api/upload', async (req, res) => {
    const { filePath, category } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: '请提供文件路径' });
    }

    try {
        const result = await knowledgeBaseRAG.uploadFile(filePath, { category });
        res.json({
            success: true,
            title: result.title,
            chunks: result.totalChunks,
            uploadedChunks: result.uploadedChunks
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function parseAndRenumberReferences(content, references) {
    if (!references || references.length === 0) return { content, references: [] };

    const refMap = new Map();
    let nextNum = 1;

    const refSectionMatch = content.match(/参考文献[：:]?[\s\S]*$/i);
    const mainContent = refSectionMatch ? content.slice(0, refSectionMatch.index) : content;

    const newMainContent = mainContent.replace(/\[(数字|\d+)\]/g, (_, idxStr) => {
        const idx = parseInt(idxStr, 10) - 1;
        if (idx < 0 || idx >= references.length) return `[${idxStr}]`;
        const ref = references[idx];
        const key = ref.pmid || ref.title || `ref_${idx}`;
        if (!refMap.has(key)) refMap.set(key, nextNum++);
        return `[${refMap.get(key)}]`;
    });

    const renumberedRefs = [];
    const seenTitles = new Set();

    for (const [key, newIdx] of refMap) {
        const ref = references.find(r =>
            (r.pmid && key.includes(r.pmid)) ||
            (r.title && (key === r.title || key.includes(r.title)))
        );
        if (ref && !seenTitles.has(ref.title)) {
            seenTitles.add(ref.title);
            renumberedRefs.push({ ...ref, index: newIdx, key });
        }
    }

    renumberedRefs.sort((a, b) => a.index - b.index);
    renumberedRefs.forEach((r, i) => r.index = i + 1);

    const formattedRefText = renumberedRefs.map((r, i) => {
        const idx = i + 1;
        const title = r.title || '未知来源';
        if (r.pmid) {
            return `[${idx}] ${title} (PMID: ${r.pmid})`;
        } else {
            return `[${idx}] ${title}`;
        }
    }).join('\n');

    const finalContent = formattedRefText ? `${newMainContent}\n\n参考文献\n${formattedRefText}` : newMainContent;

    return { content: finalContent, references: renumberedRefs };
}

app.post('/api/generate', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: '未登录，禁止访问' });
    }

    const { topic, platform = 'wechat', wordCount = '1000-1500' } = req.body;

    if (!topic) {
        return res.status(400).json({ error: '请提供主题' });
    }

    try {
        let kbReferences = [];
        let pubmedReferences = [];

        if (knowledgeBaseRAG) {
            const searchResult = await knowledgeBaseRAG.search(topic, 20);
            kbReferences = searchResult.results || [];
        }

        try {
            const pubmedResults = await pubmedService.searchLiterature(topic, 20);
            pubmedReferences = pubmedResults;
        } catch (e) {
            console.error('PubMed搜索失败:', e.message);
        }

        const allReferences = [...kbReferences, ...pubmedReferences];
        console.log(`[调试] 知识库文献: ${kbReferences.length}条, PubMed文献: ${pubmedReferences.length}条`);

        const refInfo = allReferences.map((r, i) => {
            const idx = i + 1;
            if (r.pmid) {
                return `[${idx}] "${r.title}" | PMID:${r.pmid} | ${r.journal || 'N/A'}. ${r.year || 'N/A'}`;
            } else {
                const sourceName = r.source ? r.source.split(/[/\\]/).pop() : '知识库';
                return `[${idx}] "${r.title}" | 来源: ${sourceName}`;
            }
        }).join('\n');

        const kbContext = kbReferences.map((r, i) => `[${i + 1}] ${r.title}\n${r.text || ''}\n`).join('\n');

        let rawContent;
        if (ZHIPU_API_KEY) {
            const prompt = `你是医疗科普文章专家，请生成一篇公众号科普文章，主题：${topic}

知识库内容（只包含以下检索到的内容片段）：
${kbContext || '（无）'}

可用文献（共${allReferences.length}条）：
${refInfo}

【核心原则 - 严格基于文献】
1. 【只写文献中有的】只能使用上述文献中明确包含的内容，绝不编造
2. 【禁止无据引用】如果某个具体说法（如食物名称、数字、建议等）不在文献中，必须删除
3. 【不确定就删除】对文献中不明确的内容，坚决不写，只保留有据可查的内容
4. 【数字必须有据】所有数字、剂量、时间等必须来自文献

【格式要求 - 必须使用角标】
5. 正文每个引用处必须使用角标格式：[1]、[2]、[3] 等
6. 在陈述指南建议、研究发现、数据等时，必须在旁边标注对应文献编号
7. 【禁止】不要在文末列出"引用格式"、"参考文献"、"引用列表"等
8. 文献列表由系统自动根据角标生成，你只需在正文中使用角标
9. 同一文献多次引用编号一致
10. 优先引用知识库文献（编号1-${kbReferences.length}），其次引用PubMed

文章结构：开头引入 → 分点正文 → 总结

请生成文章（必须在正文中使用角标[1][2]等标注来源）：`;

            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ZHIPU_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'glm-4-flash',
                    messages: [
                        { role: 'system', content: '你是一位专业的医疗健康内容创作者，擅长将复杂的医学知识转化为通俗易懂的科普内容。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    top_p: 0.9
                })
            });

            if (!response.ok) throw new Error(`智谱AI API错误: ${response.status}`);

            const data = await response.json();
            const content = data.choices[0].message.content;

            const titleMatch = content.match(/标题[：:]\s*([^\n]+)/) || content.match(/【(.+?)】/) || content.match(/#{1,3}\s*(.+?)\s*$/m);
            const title = titleMatch ? titleMatch[1].trim() : `${topic} - 医疗健康科普`;

            rawContent = { title, content };
        } else {
            rawContent = {
                title: `${topic} - 医疗科普`,
                content: `标题：${topic}\n\n这是一篇演示文章，当前为演示模式，请配置ZHIPU_API_KEY以获得完整功能。\n\n参考文献：\n${refInfo}`
            };
        }

        const { content: contentWithCitations, references: usedReferences } = parseAndRenumberReferences(rawContent.content, allReferences);

        const finalContent = contentWithCitations;

        res.json({
            success: true,
            title: rawContent.title,
            content: finalContent,
            platform,
            wordCount: rawContent.content.replace(/\s/g, '').length,
            references: usedReferences.map((r, i) => ({
                index: i + 1,
                title: r.title,
                source: r.source || (r.pmid ? 'PubMed' : '知识库'),
                pmid: r.pmid || null,
                doi: r.doi || null,
                url: r.url || (r.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` : ''),
                journal: r.journal || '',
                year: r.year || '',
                abstract: r.abstract || '',
                score: r.score || 1
            })),
            referenceCount: usedReferences.length
        });

    } catch (error) {
        console.error('生成失败:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('============================================================');
    console.log('  医疗内容OS - RAG知识库系统');
    console.log('============================================================');
    console.log('  本地访问: http://localhost:3000');
    console.log('============================================================');
});
