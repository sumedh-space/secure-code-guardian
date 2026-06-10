const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory database
const db = {
    teams: [],
    scans: [],
    auditLogs: [],
    customRules: [],
    prBlocks: []
};

// Vulnerability patterns
const PATTERNS = {
    javascript: [
        { name: 'eval() execution', pattern: /eval\s*\(/g, risk: 'critical', cwe: 'CWE-95', fix: 'Use JSON.parse() or Function constructor with validation' },
        { name: 'innerHTML XSS', pattern: /\.innerHTML\s*=/g, risk: 'high', cwe: 'CWE-79', fix: 'Use textContent or DOMPurify.sanitize()' },
        { name: 'Hardcoded password', pattern: /(password|passwd|secret|api_key|apikey)\s*[:=]\s*['"][^'"]+['"]/gi, risk: 'critical', cwe: 'CWE-798', fix: 'Use environment variables: process.env.SECRET' },
        { name: 'HTTP without TLS', pattern: /http:\/\/(?!localhost)/g, risk: 'medium', cwe: 'CWE-319', fix: 'Use https:// for all external connections' },
        { name: 'SQL injection risk', pattern: /(\$\{.*\}|'\s*\+\s*\w+\s*\+\s*')/g, risk: 'critical', cwe: 'CWE-89', fix: 'Use parameterized queries' },
        { name: 'exec() command injection', pattern: /exec\s*\(/g, risk: 'high', cwe: 'CWE-78', fix: 'Use execFile() with argument arrays' },
        { name: 'document.write XSS', pattern: /document\.write\s*\(/g, risk: 'high', cwe: 'CWE-79', fix: 'Use DOM manipulation methods instead' }
    ],
    python: [
        { name: 'eval() execution', pattern: /eval\s*\(/g, risk: 'critical', cwe: 'CWE-95', fix: 'Use ast.literal_eval() for safe evaluation' },
        { name: 'exec() execution', pattern: /exec\s*\(/g, risk: 'critical', cwe: 'CWE-95', fix: 'Avoid exec(); use safe alternatives' },
        { name: 'Hardcoded credentials', pattern: /(password|secret|api_key)\s*=\s*['"][^'"]+['"]/gi, risk: 'critical', cwe: 'CWE-798', fix: 'Use os.environ or config files' },
        { name: 'SQL f-string injection', pattern: /f['"].*SELECT|f['"].*INSERT|f['"].*UPDATE|f['"].*DELETE/gi, risk: 'critical', cwe: 'CWE-89', fix: 'Use parameterized queries with %s or ?' },
        { name: 'pickle deserialization', pattern: /pickle\.loads?\s*\(/g, risk: 'high', cwe: 'CWE-502', fix: 'Use json.loads() instead' },
        { name: 'os.system injection', pattern: /os\.system\s*\(/g, risk: 'high', cwe: 'CWE-78', fix: 'Use subprocess.run() with shell=False' },
        { name: 'Shell=True injection', pattern: /subprocess\.\w+\(.*shell\s*=\s*True/g, risk: 'high', cwe: 'CWE-78', fix: 'Use shell=False with argument list' }
    ],
    sql: [
        { name: 'SQL injection via string concat', pattern: /WHERE.*['"]?\s*\+/g, risk: 'critical', cwe: 'CWE-89', fix: 'Use parameterized queries' },
        { name: 'UNION-based injection', pattern: /UNION\s+(ALL\s+)?SELECT/gi, risk: 'critical', cwe: 'CWE-89', fix: 'Validate and sanitize inputs' },
        { name: 'DROP TABLE risk', pattern: /DROP\s+TABLE/gi, risk: 'critical', cwe: 'CWE-89', fix: 'Use least-privilege DB accounts' }
    ],
    java: [
        { name: 'Runtime.exec injection', pattern: /Runtime\.getRuntime\(\)\.exec\s*\(/g, risk: 'high', cwe: 'CWE-78', fix: 'Use ProcessBuilder with argument arrays' },
        { name: 'Hardcoded credentials', pattern: /String\s+\w*(password|secret|key)\w*\s*=\s*"[^"]+"/gi, risk: 'critical', cwe: 'CWE-798', fix: 'Use environment variables or vault' },
        { name: 'SQL string concat', pattern: /Statement.*execute.*\+/g, risk: 'critical', cwe: 'CWE-89', fix: 'Use PreparedStatement' }
    ]
};

function scanCode(code, language) {
    const threats = [];
    const patterns = PATTERNS[language] || PATTERNS.javascript;

    patterns.forEach(p => {
        const matches = code.match(p.pattern);
        if (matches) {
            matches.forEach((match, idx) => {
                const lineNum = code.substring(0, code.indexOf(match)).split('\n').length;
                threats.push({
                    id: crypto.randomUUID(),
                    name: p.name,
                    risk: p.risk,
                    cwe: p.cwe,
                    fix: p.fix,
                    line: lineNum,
                    match: match.substring(0, 50),
                    language: language
                });
            });
        }
    });

    // Check custom rules
    db.customRules.forEach(rule => {
        if (rule.language === language || rule.language === 'all') {
            try {
                const regex = new RegExp(rule.pattern, 'gi');
                const matches = code.match(regex);
                if (matches) {
                    threats.push({
                        id: crypto.randomUUID(),
                        name: rule.name,
                        risk: rule.riskLevel,
                        cwe: 'CUSTOM',
                        fix: rule.fixSuggestion,
                        line: 0,
                        match: matches[0].substring(0, 50),
                        language: language,
                        isCustomRule: true
                    });
                }
            } catch (e) { /* skip invalid regex */ }
        }
    });

    const criticalCount = threats.filter(t => t.risk === 'critical').length;
    const highCount = threats.filter(t => t.risk === 'high').length;
    const mediumCount = threats.filter(t => t.risk === 'medium').length;

    const score = Math.max(0, 100 - (criticalCount * 25) - (highCount * 10) - (mediumCount * 5));

    return { threats, score, criticalCount, highCount, mediumCount };
}

// ROUTES

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), scansProcessed: db.scans.length });
});

// Create team
app.post('/api/teams', (req, res) => {
    const team = {
        id: 'team_' + crypto.randomUUID().split('-')[0],
        name: req.body.name || 'Default Team',
        created_at: new Date().toISOString()
    };
    db.teams.push(team);
    res.json(team);
});

// Dashboard stats
app.get('/api/teams/:teamId/dashboard', (req, res) => {
    const teamScans = db.scans.filter(s => s.teamId === req.params.teamId);
    const totalThreats = teamScans.reduce((sum, s) => sum + s.threats.length, 0);
    const avgScore = teamScans.length ? Math.round(teamScans.reduce((sum, s) => sum + s.score, 0) / teamScans.length) : 100;
    const blocked = teamScans.filter(s => s.blocked).length;

    res.json({
        teamId: req.params.teamId,
        totalScans: teamScans.length,
        totalThreats,
        averageScore: avgScore,
        blockedPRs: blocked,
        recentScans: teamScans.slice(-10).reverse(),
        customRulesCount: db.customRules.filter(r => r.teamId === req.params.teamId).length
    });
});

// Scan code
app.post('/api/scan', (req, res) => {
    const { teamId, developerId, code, language, repoName, branch, commitHash } = req.body;

    if (!code) return res.status(400).json({ error: 'code is required' });

    const lang = (language || 'javascript').toLowerCase();
    const result = scanCode(code, lang);
    const blocked = result.criticalCount > 0;

    const scan = {
        id: crypto.randomUUID(),
        teamId: teamId || 'default',
        developerId: developerId || 'anonymous',
        repoName: repoName || 'unknown',
        branch: branch || 'main',
        commitHash: commitHash || 'unknown',
        language: lang,
        threats: result.threats,
        score: result.score,
        criticalCount: result.criticalCount,
        highCount: result.highCount,
        mediumCount: result.mediumCount,
        blocked,
        timestamp: new Date().toISOString()
    };

    db.scans.push(scan);

    db.auditLogs.push({
        id: crypto.randomUUID(),
        teamId: scan.teamId,
        developerId: scan.developerId,
        action: blocked ? 'SCAN_BLOCKED' : 'SCAN_PASSED',
        details: `Scanned ${repoName}/${branch} - Score: ${result.score}, Threats: ${result.threats.length}`,
        scanId: scan.id,
        timestamp: new Date().toISOString()
    });

    res.json({
        scanId: scan.id,
        threats: result.threats,
        score: result.score,
        criticalCount: result.criticalCount,
        highCount: result.highCount,
        mediumCount: result.mediumCount,
        blocked,
        message: blocked ? 'BLOCKED: Critical vulnerabilities found' : 'PASSED: No critical issues'
    });
});

// Custom rules
app.post('/api/custom-rules', (req, res) => {
    const rule = {
        id: crypto.randomUUID(),
        teamId: req.body.teamId || 'default',
        name: req.body.name,
        pattern: req.body.pattern,
        riskLevel: req.body.riskLevel || 'high',
        description: req.body.description || '',
        fixSuggestion: req.body.fixSuggestion || '',
        language: req.body.language || 'all',
        created_at: new Date().toISOString()
    };
    db.customRules.push(rule);
    res.json(rule);
});

app.get('/api/custom-rules/:teamId', (req, res) => {
    res.json(db.customRules.filter(r => r.teamId === req.params.teamId));
});

// Audit logs
app.get('/api/audit-logs/:teamId', (req, res) => {
    res.json(db.auditLogs.filter(l => l.teamId === req.params.teamId).reverse().slice(0, 100));
});

// Vulnerabilities report
app.get('/api/vulnerabilities/:teamId', (req, res) => {
    const teamScans = db.scans.filter(s => s.teamId === req.params.teamId);
    const allThreats = teamScans.flatMap(s => s.threats.map(t => ({ ...t, scanId: s.id, repo: s.repoName, timestamp: s.timestamp })));

    const bySeverity = {
        critical: allThreats.filter(t => t.risk === 'critical').length,
        high: allThreats.filter(t => t.risk === 'high').length,
        medium: allThreats.filter(t => t.risk === 'medium').length
    };

    res.json({ total: allThreats.length, bySeverity, threats: allThreats.slice(-50).reverse() });
});

// GitHub webhook handler
app.post('/api/github-webhook', (req, res) => {
    const event = req.headers['x-github-event'];
    if (event === 'pull_request') {
        const pr = req.body.pull_request;
        db.auditLogs.push({
            id: crypto.randomUUID(),
            teamId: 'default',
            developerId: pr?.user?.login || 'unknown',
            action: 'WEBHOOK_PR',
            details: `PR #${pr?.number} ${req.body.action} on ${req.body.repository?.full_name}`,
            timestamp: new Date().toISOString()
        });
    }
    res.json({ received: true });
});

app.listen(PORT, () => {
    console.log(`Secure Code Guardian API running on port ${PORT}`);
});

module.exports = app;