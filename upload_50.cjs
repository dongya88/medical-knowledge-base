const http = require('http');
const fs = require('fs');
const path = require('path');

const LITERATURE_DIR = 'c:/Users/Administrator/Desktop/Content OS/zhishiku-git/literature';

function getAllPdfFiles(dir) {
    const files = fs.readdirSync(dir);
    return files
        .filter(f => f.endsWith('.pdf'))
        .map(f => path.join(dir, f));
}

function uploadFile(filePath) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ filePath, category: 'default' });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: data });
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    const pdfFiles = getAllPdfFiles(LITERATURE_DIR).slice(32, 51);
    console.log(`找到 ${pdfFiles.length} 个 PDF 文件（从第33个开始，共19个）\n`);
    console.log('开始上传 PDF 文件...\n');

    let success = 0;
    let fail = 0;
    const failedFiles = [];

    for (const filePath of pdfFiles) {
        const fileName = path.basename(filePath);
        console.log(`📤 上传: ${fileName}...`);

        try {
            const result = await uploadFile(filePath);

            if (result.success) {
                console.log(`   ✅ 成功 (${result.chunks} chunks)\n`);
                success++;
            } else {
                console.log(`   ❌ 失败: ${result.error}\n`);
                fail++;
                failedFiles.push(fileName);
            }
        } catch (e) {
            console.log(`   ❌ 错误: ${e.message}\n`);
            fail++;
            failedFiles.push(fileName);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('========================================');
    console.log(`本批次上传完成: ${success} 成功, ${fail} 失败`);

    if (failedFiles.length > 0) {
        console.log('\n失败的文件:');
        failedFiles.forEach(f => console.log(`  - ${f}`));
    }
}

main();
