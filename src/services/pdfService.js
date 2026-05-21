import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';

export class PDFService {
    constructor() {
        this.supportedFormats = ['.pdf', '.txt', '.md', '.docx'];
    }

    async parseFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();

        switch (ext) {
            case '.pdf':
                return await this.parsePDF(filePath);
            case '.txt':
                return await this.parseTxt(filePath);
            case '.md':
                return await this.parseMd(filePath);
            case '.docx':
                return await this.parseDocx(filePath);
            default:
                throw new Error(`不支持的文件格式: ${ext}`);
        }
    }

    async parsePDF(filePath) {
        try {
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
            const dataBuffer = await fs.readFile(filePath);
            const uint8Array = new Uint8Array(dataBuffer);
            const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n';
            }

            return {
                success: true,
                title: path.basename(filePath, '.pdf'),
                content: this.cleanText(text),
                pages: pdf.numPages,
                metadata: {}
            };
        } catch (error) {
            console.error(`PDF解析失败 ${filePath}:`, error.message);
            return {
                success: false,
                error: error.message,
                title: path.basename(filePath, '.pdf'),
                content: '',
                pages: 0
            };
        }
    }

    extractTitleFromPDF(data) {
        if (data.info?.Title && data.info.Title.trim()) {
            return data.info.Title.trim();
        }

        const firstLines = data.text.split('\n').slice(0, 5);
        for (const line of firstLines) {
            const cleaned = line.trim();
            if (cleaned.length > 5 && cleaned.length < 100) {
                return cleaned;
            }
        }

        return null;
    }

    async parseTxt(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const title = path.basename(filePath, '.txt');

            return {
                success: true,
                title: title,
                content: this.cleanText(content),
                pages: 1,
                metadata: {
                    fileSize: (await fs.stat(filePath)).size,
                    encoding: 'utf-8'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                title: path.basename(filePath, '.txt'),
                content: '',
                pages: 1
            };
        }
    }

    async parseMd(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const title = this.extractTitleFromMd(content) || path.basename(filePath, '.md');

            return {
                success: true,
                title: title,
                content: this.cleanText(content),
                pages: 1,
                metadata: {
                    fileSize: (await fs.stat(filePath)).size,
                    encoding: 'utf-8'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                title: path.basename(filePath, '.md'),
                content: '',
                pages: 1
            };
        }
    }

    extractTitleFromMd(content) {
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('# ')) {
                return trimmed.substring(2).trim();
            }
        }
        return null;
    }

    async parseDocx(filePath) {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            const title = path.basename(filePath, '.docx');

            return {
                success: true,
                title: title,
                content: this.cleanText(result.value),
                pages: 1,
                metadata: {
                    fileSize: (await fs.stat(filePath)).size,
                    warnings: result.messages
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                title: path.basename(filePath, '.docx'),
                content: '',
                pages: 1
            };
        }
    }

    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\u200B/g, '')
            .replace(/\u3000/g, ' ')
            .replace(/[\uFEFF\uFFFE]/g, '')
            .replace(/\[PAGE\]/g, '')
            .replace(/Page \d+ of \d+/gi, '')
            .replace(/\d+\s*\/\s*\d+\s*页/gi, '')
            .trim();
    }

    isSupported(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedFormats.includes(ext);
    }

    getSupportedFormats() {
        return this.supportedFormats;
    }
}

export function createPDFService() {
    return new PDFService();
}

export default PDFService;