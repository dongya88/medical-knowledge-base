const http = require('http');
http.get('http://localhost:3000/api/status', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('状态:', JSON.parse(data)));
}).on('error', e => console.error('错误:', e.message));