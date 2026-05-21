const http = require('http');

const postData = JSON.stringify({
    topic: '糖尿病的饮食管理',
    platform: 'wechat',
    wordCount: '800-1000'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/generate',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            console.log('=== API 返回结果 ===');
            console.log('success:', result.success);
            console.log('title:', result.title);
            console.log('referenceCount:', result.referenceCount);
            console.log('references:', JSON.stringify(result.references, null, 2));
            console.log('\n=== 内容片段 (前2000字符) ===');
            console.log(result.content?.substring(0, 2000));
        } catch (e) {
            console.error('解析失败:', e.message);
            console.log('原始数据:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('请求失败:', e.message);
    console.log('请确保服务器正在运行: node server.js');
});

req.write(postData);
req.end();
