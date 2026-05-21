/**
 * 合规检查层 (Compliance Checker)
 * 功能：医疗内容的事实核查、敏感词过滤、引用检查
 */

export class ComplianceChecker {
    constructor(options = {}) {
        this.sensitiveWords = this.initSensitiveWords();
        this.medicalTerms = this.initMedicalTerms();
        this.maxClaimsPerSource = options.maxClaimsPerSource || 3;
    }

    initSensitiveWords() {
        return [
            '最', '第一', '顶级', '最好', '绝对', '保证', '根治',
            '治愈率', '有效率', '成功率', '无副作用', '零风险',
            '彻底治愈', '完全治好', '永不复发', '100%', '99%',
            '世界领先', '全球首创', '诺贝尔奖', '美国FDA'
        ];
    }

    initMedicalTerms() {
        return {
            dosage: /(\d+(\.\d+)?)\s*(mg|g|ml|μg|IU|单位)/gi,
            duration: /(\d+)\s*(天|周|月|年|小时|分钟|秒)/gi,
            percentage: /(\d+(\.\d+)?)\s*%/g
        };
    }

    async check(content, options = {}) {
        const {
            checkFacts = true,
            checkSensitive = true,
            checkCitations = true,
            checkMedical = true
        } = options;

        const issues = [];
        const warnings = [];
        const suggestions = [];

        if (checkSensitive) {
            const sensitiveResult = this.checkSensitiveWords(content);
            issues.push(...sensitiveResult.issues);
            warnings.push(...sensitiveResult.warnings);
        }

        if (checkMedical) {
            const medicalResult = this.checkMedicalAccuracy(content);
            warnings.push(...medicalResult.warnings);
            suggestions.push(...medicalResult.suggestions);
        }

        if (checkCitations) {
            const citationResult = this.checkCitations(content);
            issues.push(...citationResult.issues);
            warnings.push(...citationResult.warnings);
            suggestions.push(...citationResult.suggestions);
        }

        if (checkFacts) {
            const factResult = this.checkFacts(content);
            issues.push(...factResult.issues);
            warnings.push(...factResult.warnings);
        }

        const passed = issues.length === 0;
        const riskLevel = this.assessRiskLevel(issues, warnings);

        return {
            passed,
            riskLevel,
            issues,
            warnings,
            suggestions,
            stats: {
                totalIssues: issues.length,
                totalWarnings: warnings.length,
                totalSuggestions: suggestions.length
            },
            recommendations: this.generateRecommendations(issues, warnings, suggestions)
        };
    }

    checkSensitiveWords(content) {
        const issues = [];
        const warnings = [];

        for (const word of this.sensitiveWords) {
            const regex = new RegExp(word, 'gi');
            const matches = content.match(regex);

            if (matches) {
                const position = content.toLowerCase().indexOf(word.toLowerCase());

                if (['根治', '彻底治愈', '完全治好', '永不复发'].includes(word)) {
                    issues.push({
                        type: 'sensitive',
                        severity: 'high',
                        word,
                        message: `发现绝对化表述 "${word}"，可能违反广告法规定`,
                        position
                    });
                } else if (['100%', '99%', '成功率', '有效率'].includes(word)) {
                    issues.push({
                        type: 'sensitive',
                        severity: 'high',
                        word,
                        message: `发现无法证实的疗效数据 "${word}"`,
                        position
                    });
                } else {
                    warnings.push({
                        type: 'sensitive',
                        severity: 'medium',
                        word,
                        message: `发现夸大表述 "${word}"，建议改为更保守的说法`,
                        position
                    });
                }
            }
        }

        const leadingPhrase = content.match(/^(然而|但是|不过|可惜|遗憾)/);
        if (leadingPhrase) {
            warnings.push({
                type: 'sensitive',
                severity: 'low',
                word: leadingPhrase[1],
                message: '避免在文章开头使用转折语气，影响读者信任',
                position: 0
            });
        }

        return { issues, warnings };
    }

    checkMedicalAccuracy(content) {
        const warnings = [];
        const suggestions = [];

        const dosageMatches = content.matchAll(this.medicalTerms.dosage);
        for (const match of dosageMatches) {
            const dosage = parseFloat(match[1]);
            if (dosage > 1000) {
                warnings.push({
                    type: 'medical_accuracy',
                    severity: 'high',
                    message: `药物剂量疑似过大: ${match[0]}，请核实`,
                    position: match.index
                });
            }
        }

        const percentageMatches = content.matchAll(this.medicalTerms.percentage);
        for (const match of percentageMatches) {
            const percent = parseFloat(match[1]);
            if (percent > 100) {
                warnings.push({
                    type: 'medical_accuracy',
                    severity: 'high',
                    message: `百分比超过100%: ${match[0]}`,
                    position: match.index
                });
            }
        }

        if (content.includes('无需就医') || content.includes('不用看医生')) {
            warnings.push({
                type: 'medical_accuracy',
                severity: 'high',
                message: '内容中包含"无需就医"等表述，可能延误治疗',
                position: content.indexOf('无需就医')
            });
        }

        if (content.includes('停药') && !content.includes('医嘱')) {
            warnings.push({
                type: 'medical_accuracy',
                severity: 'medium',
                message: '提到停药时建议同时说明"请遵医嘱"',
                position: content.indexOf('停药')
            });
        }

        const treatmentPattern = /(手术|化疗|放疗|注射|输液)/g;
        const treatmentMatches = content.match(treatmentPattern);
        if (treatmentMatches && treatmentMatches.length > 3) {
            suggestions.push({
                type: 'medical_accuracy',
                message: '内容涉及较多医疗操作，建议添加"请遵医嘱"的温馨提示'
            });
        }

        return { warnings, suggestions };
    }

    checkCitations(content) {
        const issues = [];
        const warnings = [];
        const suggestions = [];

        const citationPatterns = [
            /\[\d+\]/g,
            /\(\d+\)/g,
            /来源：/g,
            /据报道/g,
            /研究表明/g,
            /专家表示/g
        ];

        let hasClaims = false;
        let hasCitations = false;

        for (const pattern of citationPatterns) {
            if (pattern.test(content)) {
                hasCitations = true;
            }
        }

        const claimPatterns = [
            /研究表明/,
            /数据显示/,
            /据证明/,
            /发现/,
            /证实/,
            /显示/
        ];

        for (const pattern of claimPatterns) {
            if (pattern.test(content)) {
                hasClaims = true;
                break;
            }
        }

        if (hasClaims && !hasCitations) {
            issues.push({
                type: 'citation',
                severity: 'high',
                message: '内容包含未经引用的声明或数据，请添加引用来源'
            });
        }

        if (content.includes('专家表示') && !content.includes('专家：')) {
            warnings.push({
                type: 'citation',
                severity: 'medium',
                message: '提到"专家"时建议具体说明专家身份（如：张医生，XX医院内分泌科主任）'
            });
        }

        if (content.includes('据报道') || content.includes('据悉')) {
            warnings.push({
                type: 'citation',
                severity: 'medium',
                message: '模糊的引用来源（如"据悉"）可能影响内容可信度，建议明确引用'
            });
        }

        const urls = content.match(/https?:\/\/[^\s]+/g) || [];
        if (urls.length === 0 && content.length > 1000) {
            suggestions.push({
                type: 'citation',
                message: '长文章建议添加相关链接作为延伸阅读'
            });
        }

        return { issues, warnings, suggestions };
    }

    checkFacts(content) {
        const issues = [];
        const warnings = [];

        const absoluteClaims = content.match(/(所有|全部|都|毫无|完全|彻底)/g) || [];
        for (const claim of absoluteClaims) {
            const position = content.indexOf(claim);
            warnings.push({
                type: 'fact',
                severity: 'low',
                word: claim,
                message: `绝对化表述 "${claim}" 可能不符合实际情况`,
                position
            });
        }

        const comparisonPattern = /(比|优于|高于|低于|超过|取代)/g;
        const comparisons = content.match(comparisonPattern) || [];
        if (comparisons.length > 2) {
            warnings.push({
                type: 'fact',
                severity: 'medium',
                message: `发现 ${comparisons.length} 处对比表述，请确保数据准确且具有可比性`
            });
        }

        return { issues, warnings };
    }

    assessRiskLevel(issues, warnings) {
        const highSeverityIssues = issues.filter(i => i.severity === 'high').length;
        const highSeverityWarnings = warnings.filter(w => w.severity === 'high').length;

        if (highSeverityIssues > 0) return 'high';
        if (issues.length > 2) return 'high';
        if (highSeverityWarnings > 0) return 'medium';
        if (issues.length > 0 || warnings.length > 2) return 'medium';
        return 'low';
    }

    generateRecommendations(issues, warnings, suggestions) {
        const recommendations = [];

        if (issues.some(i => i.type === 'sensitive')) {
            recommendations.push('请修改或删除绝对化疗效表述');
        }

        if (issues.some(i => i.type === 'citation')) {
            recommendations.push('请添加可靠的引用来源来支持你的论点');
        }

        if (warnings.some(w => w.type === 'medical_accuracy')) {
            recommendations.push('请核实医疗数据的准确性，特别是剂量和疗程');
        }

        if (suggestions.length > 0) {
            recommendations.push(...suggestions.map(s => s.message));
        }

        if (recommendations.length === 0) {
            recommendations.push('内容合规性检查通过');
        }

        return recommendations;
    }

    async generateComplianceReport(checkResult, content) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                passed: checkResult.passed,
                riskLevel: checkResult.riskLevel,
                totalIssues: checkResult.stats.totalIssues,
                totalWarnings: checkResult.stats.totalWarnings
            },
            issues: checkResult.issues,
            warnings: checkResult.warnings,
            recommendations: checkResult.recommendations,
            complianceScore: this.calculateComplianceScore(checkResult)
        };

        return report;
    }

    calculateComplianceScore(checkResult) {
        let score = 100;

        score -= checkResult.issues.filter(i => i.severity === 'high').length * 20;
        score -= checkResult.issues.filter(i => i.severity === 'medium').length * 10;
        score -= checkResult.issues.filter(i => i.severity === 'low').length * 5;

        score -= checkResult.warnings.filter(w => w.severity === 'high').length * 10;
        score -= checkResult.warnings.filter(w => w.severity === 'medium').length * 5;
        score -= checkResult.warnings.filter(w => w.severity === 'low').length * 2;

        return Math.max(0, Math.min(100, score));
    }
}

export function createComplianceChecker(options = {}) {
    return new ComplianceChecker(options);
}
