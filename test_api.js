const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function test() {
    console.log('=== 系统状态测试 ===\n');

    // 1. 检查状态
    try {
        const status = await get('http://localhost:3000/api/status');
        console.log('状态:', JSON.stringify(status, null, 2));
    } catch (e) {
        console.log('状态检查失败:', e.message);
    }

    // 2. 检查统计
    try {
        const stats = await get('http://localhost:3000/api/stats');
        console.log('\n统计:', JSON.stringify(stats, null, 2));
    } catch (e) {
        console.log('统计检查失败:', e.message);
    }

    // 3. 测试搜索
    console.log('\n=== 搜索测试 ===');
    const searchBody = JSON.stringify({ query: '糖尿病饮食', topK: 3 });
    try {
        const searchRes = await fetch('http://localhost:3000/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: searchBody
        });
        const searchData = await searchRes.json();
        console.log('搜索结果:', JSON.stringify(searchData, null, 2));
    } catch (e) {
        console.log('搜索失败:', e.message);
    }
}

test();
