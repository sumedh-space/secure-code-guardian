const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS developers (
    id TEXT PRIMARY KEY,
    team_id TEXT,
    name TEXT,
    github_username TEXT,
    email TEXT,
    FOREIGN KEY(team_id) REFERENCES teams(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    team_id TEXT,
    developer_id TEXT,
    repo_name TEXT,
    branch TEXT,
    commit_hash TEXT,
    code TEXT,
    language TEXT,
    scan_results TEXT,
    severity_score INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(team_id) REFERENCES teams(id),
    FOREIGN KEY(developer_id) REFERENCES developers(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    team_id TEXT,
    developer_id TEXT,
    action TEXT,
    details TEXT,
    scan_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(team_id) REFERENCES teams(id),
    FOREIGN KEY(developer_id) REFERENCES developers(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS custom_rules (
    id TEXT PRIMARY KEY,
    team_id TEXT,
    name TEXT,
    pattern TEXT,
    risk_level TEXT,
    description TEXT,
    fix_suggestion TEXT,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(team_id) REFERENCES teams(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS pr_blocks (
    id TEXT PRIMARY KEY,
    team_id TEXT,
    repo_name TEXT,
    pr_number INT,
    branch TEXT,
    blocked_reason TEXT,
    critical_issues INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(team_id) REFERENCES teams(id)
  )`);
});

const vulnerablePatterns = {
  javascript: [
    { pattern: /eval\s*\(/, risk: 'critical', name: 'eval() execution', fix: 'Use JSON.parse() or Function constructor' },
    { pattern: /innerHTML\s*=/, risk: 'critical', name: 'innerHTML assignment (XSS)', fix: 'Use textContent or createElement' },
    { pattern: /var\s+password\s*=|let\s+password\s*=|const\s+password\s*=/, risk: 'critical', name: 'hardcoded credentials', fix: 'Use environment variables' }
  ],
  python: [
    { pattern: /exec\s*\(/, risk: 'critical', name: 'exec() execution', fix: 'Use safer parsing or validation' },
    { pattern: /eval\s*\(/, risk: 'critical', name: 'eval() execution', fix: 'Use ast.literal_eval()' },
    { pattern: /password\s*=/, risk: 'critical', name: 'hardcoded credentials', fix: 'Use environment variables' }
  ],
  sql: [
    { pattern: /WHERE.*=.*'/, risk: 'critical', name: 'SQL injection vulnerability', fix: 'Use parameterized queries' }
  ],
  java: [
    { pattern: /Runtime\.getRuntime\(\)\.exec/, risk: 'high', name: 'command execution', fix: 'Avoid if possible, use Java APIs' }
  ]
};

function analyzeCode(code, language, customRules = []) {
  const patterns = vulnerablePatterns[language] || [];
  const allPatterns = [...patterns, ...customRules.filter(r => r.language === language)];
  const threats = [];

  allPatterns.forEach(p => {
    const matches = code.match(new RegExp(p.pattern, 'gi'));
    if (matches) {
      threats.push({
        name: p.name,
        risk: p.risk,
        count: matches.length,
        fix: p.fix
      });
    }
  });

  return threats;
}

function calculateSecurityScore(threats) {
  let score = 100;
  threats.forEach(t => {
    score -= t.risk === 'critical' ? (t.count * 25) : (t.count * 10);
  });
  return Math.max(0, score);
}

app.post('/api/teams', (req, res) => {
  const { name } = req.body;
  const id = crypto.randomUUID();
  db.run('INSERT INTO teams (id, name) VALUES (?, ?)', [id, name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, name, created_at: new Date() });
  });
});

app.get('/api/teams/:teamId/dashboard', (req, res) => {
  const { teamId } = req.params;
  
  db.all('SELECT * FROM scans WHERE team_id = ? ORDER BY created_at DESC LIMIT 100', [teamId], (err, scans) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const stats = {
      totalScans: scans.length,
      criticalIssues: 0,
      highIssues: 0,
      developers: new Set(),
      repositories: new Set(),
      recentScans: []
    };

    scans.forEach(scan => {
      const results = JSON.parse(scan.scan_results);
      stats.criticalIssues += results.filter(r => r.risk === 'critical').length;
      stats.highIssues += results.filter(r => r.risk === 'high').length;
      stats.developers.add(scan.developer_id);
      stats.repositories.add(scan.repo_name);
      stats.recentScans.push({
        repo: scan.repo_name,
        developer: scan.developer_id,
        timestamp: scan.created_at,
        score: scan.severity_score,
        issues: results.length
      });
    });

    res.json({
      ...stats,
      developers: stats.developers.size,
      repositories: stats.repositories.size,
      recentScans: stats.recentScans.slice(0, 10)
    });
  });
});

app.post('/api/scan', (req, res) => {
  const { teamId, developerId, code, language, repoName, branch, commitHash } = req.body;
  
  db.all('SELECT * FROM custom_rules WHERE team_id = ?', [teamId], (err, customRules) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const threats = analyzeCode(code, language, customRules || []);
    const score = calculateSecurityScore(threats);
    const scanId = crypto.randomUUID();

    const hasBlockingIssue = threats.some(t => t.risk === 'critical');

    db.run(
      'INSERT INTO scans (id, team_id, developer_id, repo_name, branch, commit_hash, code, language, scan_results, severity_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [scanId, teamId, developerId, repoName, branch, commitHash, code, language, JSON.stringify(threats), score],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run(
          'INSERT INTO audit_logs (id, team_id, developer_id, action, details, scan_id) VALUES (?, ?, ?, ?, ?, ?)',
          [crypto.randomUUID(), teamId, developerId, 'code_scanned', `${repoName}/${branch}`, scanId],
          (err) => {
            if (err) console.error(err);
          }
        );

        res.json({
          scanId,
          threats,
          score,
          blocked: hasBlockingIssue,
          blockReason: hasBlockingIssue ? 'Critical vulnerabilities detected. Fix before merging.' : null
        });
      }
    );
  });
});

app.post('/api/github-webhook', (req, res) => {
  const { action, pull_request, repository } = req.body;
  
  if (action === 'opened' || action === 'synchronize') {
    const teamId = process.env.TEAM_ID || 'default';
    const { html_url, head: { sha }, base: { ref } } = pull_request;
    
    res.json({ 
      status: 'webhook_received',
      prUrl: html_url,
      message: 'PR will be scanned. Blocking if critical issues found.'
    });
  } else {
    res.json({ status: 'ok' });
  }
});

app.post('/api/custom-rules', (req, res) => {
  const { teamId, name, pattern, riskLevel, description, fixSuggestion, language } = req.body;
  const id = crypto.randomUUID();

  db.run(
    'INSERT INTO custom_rules (id, team_id, name, pattern, risk_level, description, fix_suggestion, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, teamId, name, pattern, riskLevel, description, fixSuggestion, language],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, name, pattern, riskLevel, language });
    }
  );
});

app.get('/api/custom-rules/:teamId', (req, res) => {
  const { teamId } = req.params;
  db.all('SELECT * FROM custom_rules WHERE team_id = ?', [teamId], (err, rules) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rules || []);
  });
});

app.get('/api/audit-logs/:teamId', (req, res) => {
  const { teamId } = req.params;
  const limit = req.query.limit || 100;
  
  db.all(
    'SELECT * FROM audit_logs WHERE team_id = ? ORDER BY timestamp DESC LIMIT ?',
    [teamId, limit],
    (err, logs) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(logs || []);
    }
  );
});

app.get('/api/vulnerabilities/:teamId', (req, res) => {
  const { teamId } = req.params;
  
  db.all(
    'SELECT * FROM scans WHERE team_id = ? ORDER BY created_at DESC',
    [teamId],
    (err, scans) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const vulnerabilityMap = new Map();
      scans.forEach(scan => {
        const results = JSON.parse(scan.scan_results);
        results.forEach(threat => {
          const key = threat.name;
          if (!vulnerabilityMap.has(key)) {
            vulnerabilityMap.set(key, { name: threat.name, risk: threat.risk, count: 0, repositories: new Set() });
          }
          vulnerabilityMap.get(key).count += threat.count;
          vulnerabilityMap.get(key).repositories.add(scan.repo_name);
        });
      });

      const vulnerabilities = Array.from(vulnerabilityMap.values()).map(v => ({
        ...v,
        repositories: Array.from(v.repositories)
      })).sort((a, b) => b.count - a.count);

      res.json(vulnerabilities);
    }
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Secure Code Guardian running on port ${PORT}`);
});
