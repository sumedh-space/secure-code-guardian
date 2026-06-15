import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Dashboard.css';

const now = Date.now();
const MOCK_STATS = {
  criticalIssues: 3, highIssues: 12, totalScans: 247, developers: 8, repositories: 15,
  recentScans: [
    { repo: 'api-gateway',     developer: 'alice', issues: 2, score: 72,  timestamp: new Date(now).toISOString() },
    { repo: 'auth-service',    developer: 'bob',   issues: 0, score: 96,  timestamp: new Date(now - 86400000).toISOString() },
    { repo: 'payment-service', developer: 'carol', issues: 5, score: 54,  timestamp: new Date(now - 172800000).toISOString() },
    { repo: 'user-service',    developer: 'dave',  issues: 1, score: 88,  timestamp: new Date(now - 259200000).toISOString() },
    { repo: 'frontend-app',    developer: 'eve',   issues: 0, score: 100, timestamp: new Date(now - 345600000).toISOString() },
    { repo: 'data-pipeline',   developer: 'frank', issues: 3, score: 67,  timestamp: new Date(now - 432000000).toISOString() },
  ]
};
const MOCK_VULNS = [
  { name: 'SQL Injection',                          risk: 'critical', count: 3,  repositories: ['api-gateway', 'user-service'] },
  { name: 'Hardcoded Credentials',                  risk: 'critical', count: 2,  repositories: ['payment-service'] },
  { name: 'Cross-Site Scripting (XSS)',             risk: 'high',     count: 8,  repositories: ['frontend-app', 'api-gateway'] },
  { name: 'Insecure Direct Object Reference',       risk: 'high',     count: 4,  repositories: ['api-gateway', 'auth-service', 'user-service'] },
  { name: 'Sensitive Data Exposure',                risk: 'high',     count: 6,  repositories: ['payment-service', 'auth-service'] },
  { name: 'Insecure Deserialization',               risk: 'high',     count: 3,  repositories: ['api-gateway'] },
  { name: 'Missing Authentication',                 risk: 'medium',   count: 5,  repositories: ['user-service'] },
  { name: 'Components with Known Vulnerabilities',  risk: 'medium',   count: 12, repositories: ['frontend-app', 'api-gateway', 'user-service'] },
  { name: 'Security Misconfiguration',              risk: 'medium',   count: 7,  repositories: ['data-pipeline', 'api-gateway'] },
  { name: 'Insufficient Logging & Monitoring',      risk: 'low',      count: 15, repositories: ['auth-service', 'payment-service', 'user-service'] },
];
const MOCK_AUDIT = [
  { id: 1, action: 'Security scan completed',  details: 'Scanned api-gateway — 2 issues found',                   timestamp: new Date(now).toISOString() },
  { id: 2, action: 'Vulnerability detected',   details: 'SQL injection in user-service/auth.js:47',               timestamp: new Date(now - 3600000).toISOString() },
  { id: 3, action: 'Custom rule added',        details: 'Rule added: No eval() in production code',               timestamp: new Date(now - 7200000).toISOString() },
  { id: 4, action: 'Security scan completed',  details: 'Scanned auth-service — No issues found',                 timestamp: new Date(now - 86400000).toISOString() },
  { id: 5, action: 'Developer joined',         details: 'alice@company.com joined the team',                      timestamp: new Date(now - 172800000).toISOString() },
  { id: 6, action: 'Critical alert',           details: 'Hardcoded password found in payment-service/config.js',  timestamp: new Date(now - 259200000).toISOString() },
  { id: 7, action: 'Repository added',         details: 'data-pipeline added to monitoring',                      timestamp: new Date(now - 345600000).toISOString() },
  { id: 8, action: 'Security scan completed',  details: 'Scanned frontend-app — Clean scan, score 100',           timestamp: new Date(now - 432000000).toISOString() },
];
const MOCK_RULES = [
  { id: 1, name: 'No eval() usage',         pattern: '/eval\\(/',               risk_level: 'critical', description: 'eval() executes arbitrary code and is a critical security risk.' },
  { id: 2, name: 'No hardcoded passwords',  pattern: '/password\\s*=\\s*["\']/', risk_level: 'critical', description: 'Hardcoded passwords can be extracted from source code repositories.' },
  { id: 3, name: 'No console.log in prod',  pattern: '/console\\.log/',          risk_level: 'low',      description: 'Console logs can leak sensitive information to end users.' },
];

/* ── SCAN RULES ─────────────────────────────────────────────── */
const SCAN_RULES = {
  javascript: [
    { name: 'SQL Injection',           risk: 'critical', fix: 'Use parameterized queries or an ORM. Never concatenate user input into SQL strings.',          pattern: /(SELECT|INSERT|UPDATE|DELETE|DROP|UNION).*\+|query\s*\+=|`\$\{.*\}.*WHERE/i },
    { name: 'eval() Usage',            risk: 'critical', fix: 'Remove eval(). Parse JSON with JSON.parse(). Never execute user-supplied strings as code.',     pattern: /\beval\s*\(/ },
    { name: 'Command Injection',       risk: 'critical', fix: 'Validate and sanitize all inputs. Use child_process.execFile() with an argument array.',        pattern: /exec\s*\(|spawn\s*\(|child_process|execSync/ },
    { name: 'Hardcoded Credentials',   risk: 'critical', fix: 'Use environment variables (process.env.SECRET). Never hardcode passwords or API keys.',          pattern: /(password|passwd|secret|api_?key|token|auth)\s*[:=]\s*['"`][^'"`\s]{4,}/i },
    { name: 'XSS via innerHTML',       risk: 'high',     fix: 'Use textContent instead of innerHTML. Sanitize with DOMPurify before rendering HTML.',          pattern: /innerHTML\s*=|document\.write\s*\(|\.html\s*\(|dangerouslySetInnerHTML/ },
    { name: 'Prototype Pollution',     risk: 'high',     fix: 'Validate object keys. Use Object.create(null) for dictionaries. Avoid __proto__ access.',       pattern: /__proto__|prototype\[|constructor\[/ },
    { name: 'Path Traversal',          risk: 'high',     fix: 'Use path.resolve() and verify the result starts with the intended base directory.',              pattern: /\.\.\// },
    { name: 'Insecure Redirect',       risk: 'high',     fix: 'Validate redirect URLs against an allowlist. Never redirect to user-supplied URLs directly.',    pattern: /window\.location\s*=|location\.href\s*=|location\.replace\s*\(/ },
    { name: 'Insecure Random',         risk: 'medium',   fix: 'Use crypto.getRandomValues() or crypto.randomUUID() for security-sensitive values.',             pattern: /Math\.random\(\)/ },
    { name: 'setTimeout with String',  risk: 'medium',   fix: 'Never pass a string to setTimeout(). Use a function reference: setTimeout(() => fn(), delay)', pattern: /setTimeout\s*\(\s*['"`]/ },
    { name: 'Hardcoded IP Address',    risk: 'low',      fix: 'Move IP addresses and URLs to environment variables or configuration files.',                    pattern: /['"`]\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}['"`]/ },
    { name: 'Console Log (Info Leak)', risk: 'low',      fix: 'Remove console.log() in production. Use a structured logger with log levels.',                  pattern: /console\.(log|error|warn|info|debug)\s*\(/ },
  ],
  python: [
    { name: 'SQL Injection',           risk: 'critical', fix: 'Use parameterized queries: cursor.execute("SELECT * FROM t WHERE id = %s", (id,))',             pattern: /execute\s*\(.*%.*\)|execute\s*\(.*\.format|execute\s*\(.*f['"]/ },
    { name: 'eval() Usage',            risk: 'critical', fix: 'Avoid eval(). Use ast.literal_eval() for safe literal evaluation.',                              pattern: /\beval\s*\(/ },
    { name: 'Command Injection',       risk: 'critical', fix: 'Use subprocess with a list and shell=False: subprocess.run(["ls", path], shell=False)',          pattern: /os\.system\s*\(|subprocess\.call.*shell=True|subprocess\.run.*shell=True/ },
    { name: 'Hardcoded Credentials',   risk: 'critical', fix: 'Use os.environ.get("SECRET") or a secrets manager. Never hardcode credentials.',                pattern: /(password|passwd|secret|api_?key|token)\s*=\s*['"][^'"]{4,}/i },
    { name: 'Insecure Deserialization',risk: 'high',     fix: 'Never unpickle untrusted data. Use yaml.safe_load() instead of yaml.load().',                   pattern: /pickle\.loads|yaml\.load\s*\([^)]*\)/ },
    { name: 'Path Traversal',          risk: 'high',     fix: 'Use os.path.abspath() and verify the path starts with the expected base directory.',             pattern: /\.\.\// },
    { name: 'Weak Cryptography',       risk: 'high',     fix: 'Use hashlib.sha256() or bcrypt for passwords. Avoid MD5 and SHA1 for security.',                pattern: /\bmd5\b|\bsha1\b|\bDES\b|\bRC4\b/i },
    { name: 'Debug Mode Enabled',      risk: 'medium',   fix: 'Set DEBUG = False and use environment-specific config files for production.',                    pattern: /DEBUG\s*=\s*True|app\.run\s*\(.*debug=True/ },
    { name: 'Assert for Security',     risk: 'medium',   fix: 'Never use assert for security checks. Python optimized mode (-O) strips all assert statements.',  pattern: /\bassert\b.*request|assert.*auth|assert.*permission/ },
  ],
  java: [
    { name: 'SQL Injection',           risk: 'critical', fix: 'Use PreparedStatement: ps = conn.prepareStatement("SELECT * FROM t WHERE id = ?"); ps.setInt(1, id)', pattern: /Statement.*execute|createStatement\(\)|\"SELECT.*\+/ },
    { name: 'Hardcoded Credentials',   risk: 'critical', fix: 'Use environment variables or a secrets vault like HashiCorp Vault.',                             pattern: /(password|passwd|secret|apikey)\s*=\s*["'][^"']{4,}/i },
    { name: 'Command Injection',       risk: 'critical', fix: 'Avoid Runtime.exec() with user input. Use ProcessBuilder with a string array.',                  pattern: /Runtime\.getRuntime\(\)\.exec|ProcessBuilder.*\+/ },
    { name: 'XXE Injection',           risk: 'high',     fix: 'Disable external entities: factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true)',    pattern: /DocumentBuilderFactory|SAXParserFactory|XMLInputFactory/ },
    { name: 'Insecure Deserialization',risk: 'high',     fix: 'Validate classes before deserialization. Use ObjectInputFilter or avoid Java serialization.',     pattern: /ObjectInputStream|readObject\(\)/ },
    { name: 'Path Traversal',          risk: 'high',     fix: 'Use Paths.get(base).resolve(input).normalize() and verify it starts with the base path.',        pattern: /\.\.\// },
    { name: 'Weak Random',             risk: 'medium',   fix: 'Use SecureRandom instead of Random for all security-sensitive operations.',                       pattern: /new Random\(\)|Math\.random\(\)/ },
    { name: 'Null Pointer Risk',        risk: 'low',      fix: 'Use Optional<T> and add null checks. Consider using @NonNull annotations.',                       pattern: /\.get\(\)\.|getResult\(\)\./ },
  ],
  sql: [
    { name: 'Dynamic SQL Execution',   risk: 'critical', fix: 'Replace dynamic SQL with stored procedures that use parameterized inputs.',                       pattern: /EXEC\s*\(|EXECUTE\s*\(|sp_executesql/i },
    { name: 'DELETE without WHERE',    risk: 'critical', fix: 'Always include a WHERE clause in DELETE statements to prevent full table deletion.',              pattern: /DELETE\s+FROM\s+\w+\s*;/i },
    { name: 'UPDATE without WHERE',    risk: 'critical', fix: 'Always include a WHERE clause in UPDATE statements to prevent updating all rows.',                pattern: /UPDATE\s+\w+\s+SET\s+(?!\s*\w+\s*=.*WHERE)/i },
    { name: 'GRANT ALL Permissions',   risk: 'high',     fix: 'Grant only minimum required permissions. Principle of least privilege.',                          pattern: /GRANT\s+ALL/i },
    { name: 'Weak Password Hashing',   risk: 'high',     fix: 'Use bcrypt or Argon2 for password storage. MD5/SHA1 are cryptographically broken.',              pattern: /MD5\s*\(|SHA1\s*\(/i },
    { name: 'SELECT * Usage',          risk: 'low',      fix: 'Specify only required columns instead of SELECT *. Reduces data exposure and improves performance.', pattern: /SELECT\s+\*/i },
  ],
};

const calcScore = (findings) => {
  const w = { critical: 25, high: 15, medium: 8, low: 3 };
  const penalty = findings.reduce((sum, f) => sum + (w[f.risk] || 0), 0);
  return Math.max(0, 100 - penalty);
};

/* ── COMPONENT ─────────────────────────────────────────────── */
const Dashboard = ({ teamId }) => {
  const [stats, setStats] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [customRules, setCustomRules] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Scan tab state
  const [scanCode, setScanCode] = useState('');
  const [scanLanguage, setScanLanguage] = useState('javascript');
  const [scanResults, setScanResults] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [expandedFinding, setExpandedFinding] = useState(null);

  const [newRule, setNewRule] = useState({
    name: '', pattern: '', riskLevel: 'high',
    description: '', fixSuggestion: '', language: 'javascript'
  });
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/teams/${teamId}/dashboard`, { timeout: 3000 });
      setStats(res.data);
    } catch { setStats(MOCK_STATS); }
  }, [API_URL, teamId]);

  const fetchVulnerabilities = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vulnerabilities/${teamId}`, { timeout: 3000 });
      setVulnerabilities(res.data);
    } catch { setVulnerabilities(MOCK_VULNS); }
  }, [API_URL, teamId]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/audit-logs/${teamId}?limit=50`, { timeout: 3000 });
      setAuditLogs(res.data);
    } catch { setAuditLogs(MOCK_AUDIT); }
  }, [API_URL, teamId]);

  const fetchCustomRules = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/custom-rules/${teamId}`, { timeout: 3000 });
      setCustomRules(res.data);
    } catch { setCustomRules(MOCK_RULES); }
  }, [API_URL, teamId]);

  useEffect(() => {
    fetchDashboard(); fetchVulnerabilities(); fetchAuditLogs(); fetchCustomRules();
    const interval = setInterval(() => { fetchDashboard(); fetchVulnerabilities(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard, fetchVulnerabilities, fetchAuditLogs, fetchCustomRules]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDashboard(), fetchVulnerabilities(), fetchAuditLogs(), fetchCustomRules()]);
    setIsRefreshing(false);
    addToast('Dashboard refreshed successfully', 'success');
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/custom-rules`, { teamId, ...newRule });
      fetchCustomRules();
      addToast('Custom rule added successfully!', 'success');
    } catch {
      setCustomRules(prev => [...prev, { id: Date.now(), name: newRule.name, pattern: newRule.pattern, risk_level: newRule.riskLevel, description: newRule.description }]);
      addToast('Rule added (demo mode)', 'success');
    }
    setNewRule({ name: '', pattern: '', riskLevel: 'high', description: '', fixSuggestion: '', language: 'javascript' });
    setShowRuleForm(false);
  };

  /* ── CODE SCAN ─────────────────────────────────────────── */
  const runScan = () => {
    if (!scanCode.trim()) { addToast('Paste some code to scan', 'info'); return; }
    setIsScanning(true);
    setScanResults(null);

    setTimeout(() => {
      const lines = scanCode.split('\n');
      const findings = [];
      const rules = SCAN_RULES[scanLanguage] || SCAN_RULES.javascript;

      rules.forEach(rule => {
        lines.forEach((line, lineIdx) => {
          if (rule.pattern.test(line)) {
            rule.pattern.lastIndex = 0; // reset for global flags
            findings.push({
              id: `${rule.name}-${lineIdx}`,
              name: rule.name,
              risk: rule.risk,
              line: lineIdx + 1,
              code: line.trim(),
              fix: rule.fix,
            });
          }
          rule.pattern.lastIndex = 0;
        });
      });

      const score = calcScore(findings);
      const result = { findings, score, totalLines: lines.length, language: scanLanguage, timestamp: new Date().toISOString() };
      setScanResults(result);
      setScanHistory(prev => [result, ...prev.slice(0, 9)]);
      setIsScanning(false);

      if (findings.length === 0) {
        addToast('No vulnerabilities found — code looks clean!', 'success');
      } else {
        const hasCritical = findings.some(f => f.risk === 'critical');
        addToast(`Found ${findings.length} issue${findings.length > 1 ? 's' : ''} in your code`, hasCritical ? 'error' : 'info');
      }
    }, 1200);
  };

  const clearScan = () => { setScanCode(''); setScanResults(null); setExpandedFinding(null); };

  const loadExample = () => {
    const examples = {
      javascript: `// User login handler
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  // BAD: SQL injection risk
  const query = "SELECT * FROM users WHERE username = '" + username + "'";
  const user = await db.execute(query);

  // BAD: Hardcoded secret
  const apiKey = "sk-prod-abc123secret456";
  const token = "Bearer eyJhbGci...hardcoded";

  // BAD: eval usage
  const config = eval(req.body.config);

  // BAD: XSS
  document.getElementById('greeting').innerHTML = "Hello " + username;

  // BAD: Console log with sensitive data
  console.log("User password:", password);

  // BAD: Math.random for security token
  const sessionId = Math.random().toString(36);

  return res.json({ token: sessionId });
};`,
      python: `import os, subprocess, yaml, pickle

# BAD: SQL injection
def get_user(username):
    query = "SELECT * FROM users WHERE name = '%s'" % username
    cursor.execute(query)

# BAD: Command injection
def run_report(filename):
    os.system("python reports/" + filename)

# BAD: Hardcoded credentials
API_KEY = "sk-prod-1234567890abcdef"
DB_PASSWORD = "admin123"

# BAD: Insecure deserialization
def load_session(data):
    return pickle.loads(data)

# BAD: Debug mode
DEBUG = True
app.run(debug=True)`,
      java: `import java.sql.*;
import java.util.Random;

public class UserService {
    // BAD: Hardcoded credentials
    private String dbPassword = "admin123";
    private String apiKey = "secret-key-prod";

    // BAD: SQL injection
    public User getUser(String username) throws SQLException {
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery(
            "SELECT * FROM users WHERE name = '" + username + "'"
        );
        return mapUser(rs);
    }

    // BAD: Weak random
    public String generateToken() {
        Random rand = new Random();
        return String.valueOf(rand.nextLong());
    }
}`,
    };
    setScanCode(examples[scanLanguage] || examples.javascript);
    setScanResults(null);
  };

  const filteredVulns = vulnerabilities.filter(v => {
    return v.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filterRisk === 'all' || v.risk === filterRisk);
  });

  const securityScore = stats
    ? Math.round(stats.recentScans.reduce((a, s) => a + s.score, 0) / Math.max(stats.recentScans.length, 1))
    : 0;

  const getThreat = () => {
    if (!stats) return { level: 'UNKNOWN', color: '#8b949e' };
    if (stats.criticalIssues > 5) return { level: 'CRITICAL', color: '#ff4757' };
    if (stats.criticalIssues > 0) return { level: 'HIGH', color: '#ffa502' };
    if (stats.highIssues > 10)    return { level: 'ELEVATED', color: '#eccc68' };
    return { level: 'NORMAL', color: '#2ed573' };
  };
  const threat = getThreat();

  const navItems = [
    { id: 'overview',        label: 'Overview',       icon: '◈' },
    { id: 'scanner',         label: 'Code Scanner',   icon: '⬡' },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: '⚠' },
    { id: 'scans',           label: 'Scan History',   icon: '◎' },
    { id: 'rules',           label: 'Custom Rules',   icon: '⚙' },
    { id: 'audit',           label: 'Audit Log',      icon: '≡' },
  ];

  if (!stats) {
    return (
      <div className="loading-screen">
        <div className="loading-ring"></div>
        <div className="loading-title">Initializing SecureGuard</div>
        <div className="loading-sub">Connecting to threat intelligence feed...</div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 54;
  const scoreOffset = circumference - (securityScore / 100) * circumference;
  const scoreColor = securityScore >= 80 ? '#2ed573' : securityScore >= 50 ? '#ffa502' : '#ff4757';

  return (
    <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            {t.message}
          </div>
        ))}
      </div>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-shield">🛡</div>
          {sidebarOpen && <span className="brand-name">SecureGuard</span>}
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)} title={!sidebarOpen ? item.label : ''}>
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {sidebarOpen && item.id === 'vulnerabilities' && vulnerabilities.length > 0 && (
                <span className="nav-badge">{vulnerabilities.length}</span>
              )}
              {sidebarOpen && item.id === 'scanner' && scanHistory.length > 0 && (
                <span className="nav-badge nav-badge-green">{scanHistory.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="threat-widget">
            <div className="threat-pulse-dot" style={{ background: threat.color, boxShadow: `0 0 8px ${threat.color}` }}></div>
            {sidebarOpen && (
              <div className="threat-text">
                <div className="threat-lbl">Threat Level</div>
                <div className="threat-val" style={{ color: threat.color }}>{threat.level}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <span className="topbar-title">{navItems.find(n => n.id === activeTab)?.label}</span>
          </div>
          <div className="topbar-right">
            <span className="auto-refresh-tag">● Live · 30s</span>
            <button className={`icon-btn ${isRefreshing ? 'spinning' : ''}`} onClick={handleRefresh} title="Refresh">↻</button>
            <div className="avatar-chip">TM</div>
          </div>
        </header>

        <div className="content-area">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              <div className="stats-grid">
                <div className="stat-card sc-critical">
                  <div className="sc-icon">🔴</div>
                  <div className="sc-body"><div className="sc-val">{stats.criticalIssues}</div><div className="sc-lbl">Critical Issues</div><div className="sc-sub">Immediate action required</div></div>
                  <div className="sc-glow glow-red"></div>
                </div>
                <div className="stat-card sc-high">
                  <div className="sc-icon">🟠</div>
                  <div className="sc-body"><div className="sc-val">{stats.highIssues}</div><div className="sc-lbl">High Risk</div><div className="sc-sub">Fix before deployment</div></div>
                  <div className="sc-glow glow-orange"></div>
                </div>
                <div className="stat-card sc-scans">
                  <div className="sc-icon">🔍</div>
                  <div className="sc-body"><div className="sc-val">{stats.totalScans}</div><div className="sc-lbl">Total Scans</div><div className="sc-sub">Reviews conducted</div></div>
                </div>
                <div className="stat-card sc-devs">
                  <div className="sc-icon">👥</div>
                  <div className="sc-body"><div className="sc-val">{stats.developers}</div><div className="sc-lbl">Developers</div><div className="sc-sub">Active team members</div></div>
                </div>
                <div className="stat-card sc-repos">
                  <div className="sc-icon">📁</div>
                  <div className="sc-body"><div className="sc-val">{stats.repositories}</div><div className="sc-lbl">Repositories</div><div className="sc-sub">Under monitoring</div></div>
                </div>
              </div>
              <div className="overview-grid">
                <div className="panel score-panel">
                  <div className="panel-header"><h2>Security Score</h2></div>
                  <div className="ring-wrap">
                    <svg className="ring-svg" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#21262d" strokeWidth="10" />
                      <circle cx="60" cy="60" r="54" fill="none" stroke={scoreColor} strokeWidth="10"
                        strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                        strokeLinecap="round" transform="rotate(-90 60 60)"
                        style={{ filter: `drop-shadow(0 0 6px ${scoreColor})`, transition: 'stroke-dashoffset 1s ease' }} />
                    </svg>
                    <div className="ring-inner">
                      <div className="ring-number" style={{ color: scoreColor }}>{securityScore}</div>
                      <div className="ring-label">out of 100</div>
                    </div>
                  </div>
                  <div className="score-breakdown">
                    {[
                      { label: 'Critical', val: stats.criticalIssues, max: 20, color: '#ff4757' },
                      { label: 'High Risk', val: stats.highIssues, max: 40, color: '#ffa502' },
                      { label: 'Custom Rules', val: customRules.length, max: 20, color: '#5352ed' },
                    ].map(row => (
                      <div key={row.label} className="bd-row">
                        <span className="bd-label">{row.label}</span>
                        <div className="bd-bar"><div className="bd-fill" style={{ width: `${Math.min((row.val / row.max) * 100, 100)}%`, background: row.color }}></div></div>
                        <span className="bd-val">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header"><h2>Recent Scans</h2><span className="count-chip">{stats.recentScans.length}</span></div>
                  <div className="scan-feed">
                    {stats.recentScans.map((scan, idx) => (
                      <div key={idx} className="scan-row">
                        <div className="scan-repo-info">
                          <div className="scan-repo-icon">◈</div>
                          <div><div className="scan-repo-name">{scan.repo}</div><div className="scan-dev">{scan.developer}</div></div>
                        </div>
                        <div className="scan-right">
                          <div className="scan-bar-wrap">
                            <div className="scan-bar"><div className="scan-bar-fill" style={{ width: `${scan.score}%`, background: scan.score >= 80 ? '#2ed573' : scan.score >= 50 ? '#ffa502' : '#ff4757' }}></div></div>
                            <span className="scan-score">{scan.score}</span>
                          </div>
                          {scan.issues === 0 ? <span className="tag-clean">✓ Clean</span> : <span className="tag-issues">{scan.issues} issues</span>}
                        </div>
                        <div className="scan-date">{new Date(scan.timestamp).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header"><h2>Top Vulnerabilities</h2><span className="count-chip">{vulnerabilities.length}</span></div>
                  <div className="top-vuln-list">
                    {vulnerabilities.slice(0, 6).map((vuln, idx) => (
                      <div key={idx} className="top-vuln-row">
                        <div className="top-vuln-rank">#{idx + 1}</div>
                        <div className="top-vuln-info"><div className="top-vuln-name">{vuln.name}</div><div className="top-vuln-meta">{vuln.count}× in {vuln.repositories.length} repos</div></div>
                        <span className={`risk-chip rc-${vuln.risk}`}>{vuln.risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── CODE SCANNER ── */}
          {activeTab === 'scanner' && (
            <div className="tab-content">
              <div className="scanner-layout">
                {/* Left: Input */}
                <div className="scanner-input-col">
                  <div className="panel">
                    <div className="panel-header">
                      <h2>Paste Code to Scan</h2>
                      <div className="scanner-header-actions">
                        <select className="lang-select" value={scanLanguage} onChange={e => { setScanLanguage(e.target.value); setScanResults(null); }}>
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="sql">SQL</option>
                        </select>
                        <button className="btn-ghost" onClick={loadExample}>Load Example</button>
                        {scanCode && <button className="btn-ghost btn-ghost-red" onClick={clearScan}>Clear</button>}
                      </div>
                    </div>
                    <div className="code-editor-wrap">
                      <div className="line-numbers">
                        {(scanCode || '').split('\n').map((_, i) => (
                          <div key={i} className="line-num">{i + 1}</div>
                        ))}
                      </div>
                      <textarea
                        className="code-textarea"
                        value={scanCode}
                        onChange={e => { setScanCode(e.target.value); setScanResults(null); }}
                        placeholder="// Paste your code here to scan for vulnerabilities..."
                        spellCheck={false}
                      />
                    </div>
                    <div className="scanner-footer">
                      <span className="code-meta">{scanCode.split('\n').length} lines · {scanCode.length} chars · {scanLanguage}</span>
                      <button className={`btn-scan ${isScanning ? 'scanning' : ''}`} onClick={runScan} disabled={isScanning}>
                        {isScanning ? (
                          <><span className="scan-spinner"></span> Scanning...</>
                        ) : (
                          <> ⬡ Run Security Scan</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Results */}
                <div className="scanner-results-col">
                  {!scanResults && !isScanning && (
                    <div className="scan-placeholder">
                      <div className="scan-placeholder-icon">⬡</div>
                      <div className="scan-placeholder-title">Ready to Scan</div>
                      <div className="scan-placeholder-sub">Paste code on the left and click<br />"Run Security Scan" to detect vulnerabilities</div>
                      <div className="scan-languages">
                        {['JS', 'PY', 'Java', 'SQL'].map(l => <span key={l} className="lang-chip">{l}</span>)}
                      </div>
                    </div>
                  )}

                  {isScanning && (
                    <div className="scan-placeholder">
                      <div className="scan-anim-ring"></div>
                      <div className="scan-placeholder-title">Scanning Code...</div>
                      <div className="scan-placeholder-sub">Running {(SCAN_RULES[scanLanguage] || []).length} security rules</div>
                    </div>
                  )}

                  {scanResults && !isScanning && (
                    <>
                      {/* Score Summary */}
                      <div className="scan-summary-bar">
                        <div className={`scan-score-badge ssc-${scanResults.score >= 80 ? 'good' : scanResults.score >= 50 ? 'warn' : 'bad'}`}>
                          <div className="ssc-number">{scanResults.score}</div>
                          <div className="ssc-label">Score</div>
                        </div>
                        <div className="scan-summary-stats">
                          {['critical', 'high', 'medium', 'low'].map(r => {
                            const count = scanResults.findings.filter(f => f.risk === r).length;
                            return count > 0 ? (
                              <div key={r} className={`ss-stat ss-${r}`}>
                                <span className="ss-count">{count}</span>
                                <span className="ss-label">{r}</span>
                              </div>
                            ) : null;
                          })}
                          {scanResults.findings.length === 0 && (
                            <div className="ss-clean">✓ No issues found</div>
                          )}
                        </div>
                        <div className="scan-meta-info">
                          <div>{scanResults.totalLines} lines scanned</div>
                          <div>{scanResults.language}</div>
                        </div>
                      </div>

                      {/* Findings List */}
                      <div className="findings-list">
                        {scanResults.findings.length === 0 ? (
                          <div className="clean-result">
                            <div className="clean-icon">✓</div>
                            <div className="clean-title">Code looks clean!</div>
                            <div className="clean-sub">No security vulnerabilities detected across {(SCAN_RULES[scanLanguage] || []).length} rules</div>
                          </div>
                        ) : (
                          scanResults.findings.map((finding) => (
                            <div key={finding.id} className={`finding-card fc-${finding.risk} ${expandedFinding === finding.id ? 'expanded' : ''}`}
                              onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}>
                              <div className="finding-header">
                                <div className="finding-left">
                                  <span className={`risk-chip rc-${finding.risk}`}>{finding.risk}</span>
                                  <span className="finding-name">{finding.name}</span>
                                </div>
                                <div className="finding-right">
                                  <span className="finding-line">Line {finding.line}</span>
                                  <span className="finding-chevron">{expandedFinding === finding.id ? '▲' : '▼'}</span>
                                </div>
                              </div>
                              {expandedFinding === finding.id && (
                                <div className="finding-body">
                                  <div className="finding-code-wrap">
                                    <div className="finding-code-label">Affected code</div>
                                    <code className="finding-code">{finding.code}</code>
                                  </div>
                                  <div className="finding-fix-wrap">
                                    <div className="finding-fix-label">💡 How to fix</div>
                                    <div className="finding-fix">{finding.fix}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Scan History */}
                      {scanHistory.length > 1 && (
                        <div className="panel" style={{ marginTop: '1rem' }}>
                          <div className="panel-header"><h2>Recent Scans</h2><span className="count-chip">{scanHistory.length}</span></div>
                          <div className="sh-list">
                            {scanHistory.map((sh, idx) => (
                              <div key={idx} className="sh-row">
                                <span className={`sh-score ${sh.score >= 80 ? 'sh-good' : sh.score >= 50 ? 'sh-warn' : 'sh-bad'}`}>{sh.score}</span>
                                <span className="sh-lang">{sh.language}</span>
                                <span className="sh-issues">{sh.findings.length} issue{sh.findings.length !== 1 ? 's' : ''}</span>
                                <span className="sh-lines">{sh.totalLines} lines</span>
                                <span className="sh-time">{new Date(sh.timestamp).toLocaleTimeString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── VULNERABILITIES ── */}
          {activeTab === 'vulnerabilities' && (
            <div className="tab-content">
              <div className="toolbar">
                <input className="search-box" placeholder="🔍  Search vulnerabilities..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <div className="filter-chips">
                  {['all', 'critical', 'high', 'medium', 'low'].map(r => (
                    <button key={r} className={`filter-chip ${filterRisk === r ? 'fc-active' : ''} ${r !== 'all' ? `fc-${r}` : ''}`} onClick={() => setFilterRisk(r)}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="result-count">{filteredVulns.length} results</span>
              </div>
              <div className="vuln-grid">
                {filteredVulns.map((vuln, idx) => (
                  <div key={idx} className={`vuln-card vc-${vuln.risk}`}>
                    <div className="vc-top"><span className={`risk-chip rc-${vuln.risk}`}>{vuln.risk}</span><span className="vc-count">{vuln.count}×</span></div>
                    <div className="vc-name">{vuln.name}</div>
                    <div className="vc-stats">
                      <div className="vc-stat"><div className="vc-stat-val">{vuln.count}</div><div className="vc-stat-lbl">Occurrences</div></div>
                      <div className="vc-divider"></div>
                      <div className="vc-stat"><div className="vc-stat-val">{vuln.repositories.length}</div><div className="vc-stat-lbl">Repos Affected</div></div>
                    </div>
                    <div className="vc-bar"><div className="vc-bar-fill" style={{ width: `${Math.min(vuln.count * 10, 100)}%`, background: vuln.risk === 'critical' ? '#ff4757' : vuln.risk === 'high' ? '#ffa502' : vuln.risk === 'medium' ? '#5352ed' : '#2ed573' }}></div></div>
                  </div>
                ))}
                {filteredVulns.length === 0 && <div className="empty-state"><div className="empty-icon">✓</div><div className="empty-title">No vulnerabilities found</div><div className="empty-sub">Try adjusting your filters</div></div>}
              </div>
            </div>
          )}

          {/* ── SCAN HISTORY ── */}
          {activeTab === 'scans' && (
            <div className="tab-content">
              <div className="panel">
                <div className="panel-header"><h2>Scan History</h2><span className="count-chip">{stats.recentScans.length}</span></div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Repository</th><th>Developer</th><th>Issues</th><th>Security Score</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody>
                      {stats.recentScans.map((scan, idx) => (
                        <tr key={idx}>
                          <td className="cell-num">{idx + 1}</td>
                          <td className="cell-repo"><span className="repo-dot"></span>{scan.repo}</td>
                          <td>{scan.developer}</td>
                          <td>{scan.issues === 0 ? <span className="tag-clean">✓ Clean</span> : <span className="tag-issues">{scan.issues}</span>}</td>
                          <td><div className="score-cell"><div className="scan-bar"><div className="scan-bar-fill" style={{ width: `${scan.score}%`, background: scan.score >= 80 ? '#2ed573' : scan.score >= 50 ? '#ffa502' : '#ff4757' }}></div></div><span className="score-pct">{scan.score}%</span></div></td>
                          <td className="cell-time">{new Date(scan.timestamp).toLocaleString()}</td>
                          <td><span className={`status-dot ${scan.score >= 80 ? 'sd-good' : scan.score >= 50 ? 'sd-warn' : 'sd-bad'}`}></span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CUSTOM RULES ── */}
          {activeTab === 'rules' && (
            <div className="tab-content">
              <div className="panel">
                <div className="panel-header"><h2>Custom Security Rules</h2><button className="btn-primary" onClick={() => setShowRuleForm(!showRuleForm)}>{showRuleForm ? '✕ Cancel' : '+ Add Rule'}</button></div>
                {showRuleForm && (
                  <form className="rule-form" onSubmit={handleAddRule}>
                    <div className="form-grid">
                      <div className="form-group"><label>Rule Name</label><input type="text" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} required placeholder="e.g., No console logs in production" /></div>
                      <div className="form-group"><label>Pattern (regex)</label><input type="text" value={newRule.pattern} onChange={e => setNewRule({ ...newRule, pattern: e.target.value })} required placeholder="e.g., /console\.log/" /></div>
                      <div className="form-group"><label>Risk Level</label><select value={newRule.riskLevel} onChange={e => setNewRule({ ...newRule, riskLevel: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                      <div className="form-group"><label>Language</label><select value={newRule.language} onChange={e => setNewRule({ ...newRule, language: e.target.value })}><option value="javascript">JavaScript</option><option value="python">Python</option><option value="java">Java</option><option value="sql">SQL</option></select></div>
                      <div className="form-group form-full"><label>Description</label><textarea value={newRule.description} onChange={e => setNewRule({ ...newRule, description: e.target.value })} placeholder="Why is this pattern dangerous?" /></div>
                      <div className="form-group form-full"><label>Fix Suggestion</label><textarea value={newRule.fixSuggestion} onChange={e => setNewRule({ ...newRule, fixSuggestion: e.target.value })} placeholder="How should developers fix this?" /></div>
                    </div>
                    <button type="submit" className="btn-success">✓ Create Rule</button>
                  </form>
                )}
                <div className="rules-grid">
                  {customRules.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">⚙</div><div className="empty-title">No custom rules yet</div><div className="empty-sub">Add rules to enforce team security standards</div></div>
                  ) : customRules.map(rule => (
                    <div key={rule.id} className={`rule-card rc-border-${rule.risk_level}`}>
                      <div className="rule-card-top"><span className="rule-card-name">{rule.name}</span><span className={`risk-chip rc-${rule.risk_level}`}>{rule.risk_level}</span></div>
                      <p className="rule-card-desc">{rule.description}</p>
                      {rule.pattern && <div className="rule-pattern"><code>{rule.pattern}</code></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── AUDIT LOG ── */}
          {activeTab === 'audit' && (
            <div className="tab-content">
              <div className="panel">
                <div className="panel-header"><h2>Audit Log</h2><span className="count-chip">{auditLogs.length}</span></div>
                <div className="timeline">
                  {auditLogs.slice(0, 30).map((log, idx) => (
                    <div key={log.id} className="tl-item">
                      <div className="tl-dot"></div>
                      {idx < Math.min(auditLogs.length - 1, 29) && <div className="tl-line"></div>}
                      <div className="tl-card">
                        <div className="tl-action">{log.action}</div>
                        <div className="tl-details">{log.details}</div>
                        <div className="tl-time">{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
