document.addEventListener('DOMContentLoaded', () => {
    const topicInput = document.getElementById('topicInput');
    const wordCountInput = document.getElementById('wordCount');
    const generateBtn = document.getElementById('generateBtn');
    const output = document.getElementById('output');
    const copyBtn = document.getElementById('copyBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const loading = document.getElementById('loading');
    const metaInfo = document.getElementById('metaInfo');
    const tabs = document.querySelectorAll('.tab');
    const quickCmds = document.querySelectorAll('.quick-cmd');
    const apiStatus = document.getElementById('apiStatus');
    const kbStatus = document.getElementById('kbStatus');

    let currentPlatform = 'wechat';
    let currentTopic = '';
    let currentContent = '';

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentPlatform = tab.dataset.platform;
        });
    });

    quickCmds.forEach(cmd => {
        cmd.addEventListener('click', () => {
            topicInput.value = cmd.dataset.cmd;
        });
    });

    generateBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();
        if (!topic) {
            alert('请输入内容需求');
            return;
        }

        currentTopic = topic;
        showLoading(true);
        generateBtn.disabled = true;
        copyBtn.disabled = true;
        refreshBtn.disabled = true;

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic,
                    platform: currentPlatform,
                    wordCount: wordCountInput.value || '1000-1500'
                })
            });

            const result = await response.json();
            displayResult(result);
            copyBtn.disabled = false;
            refreshBtn.disabled = false;
        } catch (error) {
            output.innerHTML = `<p style="color: red;">生成失败: ${error.message}</p>`;
        } finally {
            showLoading(false);
            generateBtn.disabled = false;
        }
    });

    refreshBtn.addEventListener('click', () => {
        if (currentTopic) {
            topicInput.value = currentTopic;
            generateBtn.click();
        }
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(currentContent).then(() => {
            copyBtn.textContent = '已复制!';
            setTimeout(() => copyBtn.textContent = '复制内容', 2000);
        });
    });

    async function checkStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();

            if (status.ai) {
                apiStatus.textContent = '🤖 AI: 已连接 (' + (status.aiProvider || '智谱GLM') + ')';
                apiStatus.style.color = '#28a745';
            } else {
                apiStatus.textContent = '🤖 AI: 未配置';
                apiStatus.style.color = '#ffc107';
            }

            if (status.knowledgeBase && status.knowledgeBase !== '初始化中...') {
                kbStatus.textContent = '📚 知识库: ' + status.knowledgeBase;
                kbStatus.style.color = '#28a745';
            } else {
                kbStatus.textContent = '📚 知识库: ' + (status.knowledgeBase || '加载中');
                kbStatus.style.color = '#ffc107';
            }
        } catch (error) {
            apiStatus.textContent = '🤖 AI: 未连接';
            kbStatus.textContent = '📚 知识库: 加载中...';
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function displayResult(result) {
        if (result.error) {
            output.innerHTML = `<p style="color: red;">错误: ${result.error}</p>`;
            return;
        }

        copyBtn.disabled = false;

        let html = '';

        if (result.title) {
            html += `<h2 class="article-title">${escapeHtml(result.title)}</h2>`;
        }

        const refs = result.references || [];

        const mainContent = result.content.replace(/参考文献\s*[\s\S]*$/, '').trim();

        const paragraphs = mainContent.split(/\n\n+/);
        paragraphs.forEach(p => {
            const trimmed = p.trim();
            if (!trimmed) return;

            let formattedPara = escapeHtml(trimmed);
            formattedPara = formattedPara.replace(/\[(数字|\d+)\]/g, (match, numStr) => {
                const refNum = parseInt(numStr);
                if (refNum >= 1 && refNum <= refs.length) {
                    return `<span class="citation-ref" data-ref="${refNum}" title="点击查看文献">[${numStr}]</span>`;
                }
                return `[${numStr}]`;
            });

            html += `<p>${formattedPara}</p>`;
        });

        if (refs.length > 0) {
            html += `<div class="references-block">`;
            html += `<h3 class="ref-section-title">📚 参考文献</h3>`;
            html += `<ol class="ref-list">`;

            refs.forEach((ref, i) => {
                const refNum = i + 1;
                const title = ref.title || '未知来源';
                const url = ref.url || (ref.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/` : '');
                const linkHtml = url ? `<a href="${escapeHtml(url)}" target="_blank" class="ref-link">🔗 查看原文</a>` : '';
                html += `<li class="ref-item" id="ref-${refNum}">
                    <div class="ref-num">${refNum}</div>
                    <div class="ref-body">
                        <div class="ref-title">${escapeHtml(title)}</div>
                        <div class="ref-meta">
                            ${ref.source ? `<span class="meta-source">${escapeHtml(ref.source)}</span>` : ''}
                            ${ref.pmid ? `<span class="meta-pmid">PMID: ${ref.pmid}</span>` : ''}
                            ${ref.journal ? `<span class="meta-journal">${escapeHtml(ref.journal)}</span>` : ''}
                            ${ref.year ? `<span class="meta-year">${ref.year}</span>` : ''}
                        </div>
                    </div>
                    <div class="ref-action">${linkHtml}</div>
                </li>`;
            });

            html += `</ol></div>`;
        }

        output.innerHTML = html;

        document.querySelectorAll('.citation-ref').forEach(el => {
            el.style.cursor = 'pointer';
            el.style.color = '#007bff';
            el.style.textDecoration = 'underline';
            el.addEventListener('click', () => {
                const refNum = el.dataset.ref;
                if (refNum) {
                    const refEl = document.getElementById(`ref-${refNum}`);
                    if (refEl) {
                        refEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        refEl.classList.add('highlight');
                        setTimeout(() => refEl.classList.remove('highlight'), 2000);
                    }
                }
            });
        });

        currentContent = result.content;
        output.scrollTop = 0;

        metaInfo.style.display = 'flex';
        document.getElementById('wordCountInfo').textContent = `📝 字数: ${result.wordCount || 'N/A'}`;
        document.getElementById('platformInfo').textContent = `📱 平台: ${getPlatformName(result.platform)}`;
        document.getElementById('citationInfo').textContent = `📚 文献: ${result.references?.length || 0} 条`;
    }

    function getPlatformName(platform) {
        const names = {
            wechat: '公众号',
            douyin: '抖音',
            xiaohongshu: '小红书',
            toutiao: '今日头条',
            news: '新闻科普'
        };
        return names[platform] || platform;
    }

    function showLoading(show) {
        loading.style.display = show ? 'flex' : 'none';
    }

    checkStatus();
    setInterval(checkStatus, 30000);
});
