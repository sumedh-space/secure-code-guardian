import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Dashboard.css';

const now = Date.now();
const MOCK_STATS = {
  criticalIssues: 3,
  highIssues: 12,
  totalScans: 247,
  developers: 8,
  repositories: 15,
  recentScans: [
    { repo: 'api-gateway',       developer: 'alice',  issues: 2, score: 72,  timestamp: new Date(now).toISOString() },
    { repo: 'auth-service',      developer: 'bob',    issues: 0, score: 96,  timestamp: new Date(now - 86400000).toISOString() },
    { repo: 'payment-service',   developer: 'carol',  issues: 5, score: 54,  timestamp: new Date(now - 172800000).toISOString() },
    { repo: 'user-service',      developer: 'dave',   issues: 1, score: 88,  timestamp: new Date(now - 259200000).toISOString() },
    { repo: 'frontend-app',      developer: 'eve',    issues: 0, score: 100, timestamp: new Date(now - 345600000).toISOString() },
    { repo: 'data-pipeline',     developer: 'frank',  issues: 3, score: 67,  timestamp: new Date(now - 432000000).toISOString() },
  ]
};

const MOCK_VULNS = [
  { name: 'SQL Injection',                              risk: 'critical', count: 3,  repositories: ['api-gateway', 'user-service'] },
  { name: 'Hardcoded Credentials',                      risk: 'critical', count: 2,  repositories: ['payment-service'] },
  { name: 'Cross-Site Scripting (XSS)',                 risk: 'high',     count: 8,  repositories: ['frontend-app', 'api-gateway'] },
  { name: 'Insecure Direct Object Reference',           risk: 'high',     count: 4,  repositories: ['api-gateway', 'auth-service', 'user-service'] },
  { name: 'Sensitive Data Exposure',                    risk: 'high',     count: 6,  repositories: ['payment-service', 'auth-service'] },
  { name: 'Insecure Deserialization',                   risk: 'high',     count: 3,  repositories: ['api-gateway'] },
  { name: 'Missing Authentication',                     risk: 'medium',   count: 5,  repositories: ['user-service'] },
  { name: 'Components with Known Vulnerabilities',      risk: 'medium',   count: 12, repositories: ['frontend-app', 'api-gateway', 'user-service'] },
  { name: 'Security Misconfiguration',                  risk: 'medium',   count: 7,  repositories: ['data-pipeline', 'api-gateway'] },
  { name: 'Insufficient Logging & Monitoring',          risk: 'low',      count: 15, repositories: ['auth-service', 'payment-service', 'user-service'] },
];

const MOCK_AUDIT = [
  { id: 1, action: 'Security scan completed',   details: 'Scanned api-gateway — 2 issues found',                    timestamp: new Date(now).toISOString() },
  { id: 2, action: 'Vulnerability detected',    details: 'SQL injection in user-service/auth.js:47',                timestamp: new Date(now - 3600000).toISOString() },
  { id: 3, action: 'Custom rule added',         details: 'Rule added: No eval() in production code',               timestamp: new Date(now - 7200000).toISOString() },
  { id: 4, action: 'Security scan completed',   details: 'Scanned auth-service — No issues found',                 timestamp: new Date(now - 86400000).toISOString() },
  { id: 5, action: 'Developer joined',          details: 'alice@company.com joined the team',                      timestamp: new Date(now - 172800000).toISOString() },
  { id: 6, action: 'Critical alert',            details: 'Hardcoded password found in payment-service/config.js',  timestamp: new Date(now - 259200000).toISOString() },
  { id: 7, action: 'Repository added',          details: 'data-pipeline added to monitoring',                      timestamp: new Date(now - 345600000).toISOString() },
  { id: 8, action: 'Security scan completed',   details: 'Scanned frontend-app — Clean scan, score 100',          timestamp: new Date(now - 432000000).toISOString() },
];

const MOCK_RULES = [
  { id: 1, name: 'No eval() usage',           pattern: '/eval\\(/',              risk_level: 'critical', description: 'eval() executes arbitrary code and is a critical security risk.' },
  { id: 2, name: 'No hardcoded passwords',    pattern: '/password\\s*=\\s*["\']/', risk_level: 'critical', description: 'Hardcoded passwords can be extracted from source code repositories.' },
  { id: 3, name: 'No console.log in prod',   pattern: '/console\\.log/',          risk_level: 'low',      description: 'Console logs can leak sensitive information to end users.' },
];

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
    } catch {
      setStats(MOCK_STATS);
    }
  }, [API_URL, teamId]);

  const fetchVulnerabilities = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vulnerabilities/${teamId}`, { timeout: 3000 });
      setVulnerabilities(res.data);
    } catch {
      setVulnerabilities(MOCK_VULNS);
    }
  }, [API_URL, teamId]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/audit-logs/${teamId}?limit=50`, { timeout: 3000 });
      setAuditLogs(res.data);
    } catch {
      setAuditLogs(MOCK_AUDIT);
    }
  }, [API_URL, teamId]);

  const fetchCustomRules = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/custom-rules/${teamId}`, { timeout: 3000 });
      setCustomRules(res.data);
    } catch {
      setCustomRules(MOCK_RULES);
    }
  }, [API_URL, teamId]);

  useEffect(() => {
    fetchDashboard();
    fetchVulnerabilities();
    fetchAuditLogs();
    fetchCustomRules();
    const interval = setInterval(() => {
      fetchDashboard();
      fetchVulnerabilities();
    }, 30000);
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
      const demoRule = {
        id: Date.now(),
        name: newRule.name,
        pattern: newRule.pattern,
        risk_level: newRule.riskLevel,
        description: newRule.description,
      };
      setCustomRules(prev => [...prev, demoRule]);
      addToast('Rule added (demo mode)', 'success');
    }
    setNewRule({ name: '', pattern: '', riskLevel: 'high', description: '', fixSuggestion: '', language: 'javascript' });
    setShowRuleForm(false);
  };

  const filteredVulns = vulnerabilities.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRisk = filterRisk === 'all' || v.risk === filterRisk;
    return matchSearch && matchRisk;
  });

  const securityScore = stats
    ? Math.round(stats.recentScans.reduce((a, s) => a + s.score, 0) / Math.max(stats.recentScans.length, 1))
    : 0;

  const getThreat = () => {
    if (!stats) return { level: 'UNKNOWN', color: '#8b949e' };
    if (stats.criticalIssues > 5) return { level: 'CRITICAL', color: '#ff4757' };
    if (stats.criticalIssues > 0) return { level: 'HIGH', color: '#ffa502' };
    if (stats.highIssues > 10) return { level: 'ELEVATED', color: '#eccc68' };
    return { level: 'NORMAL', color: '#2ed573' };
  };
  const threat = getThreat();

  const navItems = [
    { id: 'overview',        label: 'Overview',       icon: '◈' },
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
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-shield">🛡</div>
          {sidebarOpen && <span className="brand-name">SecureGuard</span>}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {sidebarOpen && item.id === 'vulnerabilities' && vulnerabilities.length > 0 && (
                <span className="nav-badge">{vulnerabilities.length}</span>
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

      {/* Main Content */}
      <main className="main-content">
        {/* Topbar */}
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
                  <div className="sc-body">
                    <div className="sc-val">{stats.criticalIssues}</div>
                    <div className="sc-lbl">Critical Issues</div>
                    <div className="sc-sub">Immediate action required</div>
                  </div>
                  <div className="sc-glow glow-red"></div>
                </div>
                <div className="stat-card sc-high">
                  <div className="sc-icon">🟠</div>
                  <div className="sc-body">
                    <div className="sc-val">{stats.highIssues}</div>
                    <div className="sc-lbl">High Risk</div>
                    <div className="sc-sub">Fix before deployment</div>
                  </div>
                  <div className="sc-glow glow-orange"></div>
                </div>
                <div className="stat-card sc-scans">
                  <div className="sc-icon">🔍</div>
                  <div className="sc-body">
                    <div className="sc-val">{stats.totalScans}</div>
                    <div className="sc-lbl">Total Scans</div>
                    <div className="sc-sub">Reviews conducted</div>
                  </div>
                </div>
                <div className="stat-card sc-devs">
                  <div className="sc-icon">👥</div>
                  <div className="sc-body">
                    <div className="sc-val">{stats.developers}</div>
                    <div className="sc-lbl">Developers</div>
                    <div className="sc-sub">Active team members</div>
                  </div>
                </div>
                <div className="stat-card sc-repos">
                  <div className="sc-icon">📁</div>
                  <div className="sc-body">
                    <div className="sc-val">{stats.repositories}</div>
                    <div className="sc-lbl">Repositories</div>
                    <div className="sc-sub">Under monitoring</div>
                  </div>
                </div>
              </div>

              <div className="overview-grid">
                {/* Security Score */}
                <div className="panel score-panel">
                  <div className="panel-header">
                    <h2>Security Score</h2>
                  </div>
                  <div className="ring-wrap">
                    <svg className="ring-svg" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#21262d" strokeWidth="10" />
                      <circle
                        cx="60" cy="60" r="54" fill="none"
                        stroke={scoreColor}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={scoreOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                        style={{ filter: `drop-shadow(0 0 6px ${scoreColor})`, transition: 'stroke-dashoffset 1s ease' }}
                      />
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
                        <div className="bd-bar">
                          <div className="bd-fill" style={{ width: `${Math.min((row.val / row.max) * 100, 100)}%`, background: row.color }}></div>
                        </div>
                        <span className="bd-val">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Scans */}
                <div className="panel">
                  <div className="panel-header">
                    <h2>Recent Scans</h2>
                    <span className="count-chip">{stats.recentScans.length}</span>
                  </div>
                  <div className="scan-feed">
                    {stats.recentScans.map((scan, idx) => (
                      <div key={idx} className="scan-row">
                        <div className="scan-repo-info">
                          <div className="scan-repo-icon">◈</div>
                          <div>
                            <div className="scan-repo-name">{scan.repo}</div>
                            <div className="scan-dev">{scan.developer}</div>
                          </div>
                        </div>
                        <div className="scan-right">
                          <div className="scan-bar-wrap">
                            <div className="scan-bar">
                              <div className="scan-bar-fill" style={{
                                width: `${scan.score}%`,
                                background: scan.score >= 80 ? '#2ed573' : scan.score >= 50 ? '#ffa502' : '#ff4757'
                              }}></div>
                            </div>
                            <span className="scan-score">{scan.score}</span>
                          </div>
                          {scan.issues === 0
                            ? <span className="tag-clean">✓ Clean</span>
                            : <span className="tag-issues">{scan.issues} issues</span>}
                        </div>
                        <div className="scan-date">{new Date(scan.timestamp).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Vulnerabilities */}
                <div className="panel">
                  <div className="panel-header">
                    <h2>Top Vulnerabilities</h2>
                    <span className="count-chip">{vulnerabilities.length}</span>
                  </div>
                  <div className="top-vuln-list">
                    {vulnerabilities.slice(0, 6).map((vuln, idx) => (
                      <div key={idx} className="top-vuln-row">
                        <div className="top-vuln-rank">#{idx + 1}</div>
                        <div className="top-vuln-info">
                          <div className="top-vuln-name">{vuln.name}</div>
                          <div className="top-vuln-meta">{vuln.count}× in {vuln.repositories.length} repos</div>
                        </div>
                        <span className={`risk-chip rc-${vuln.risk}`}>{vuln.risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── VULNERABILITIES ── */}
          {activeTab === 'vulnerabilities' && (
            <div className="tab-content">
              <div className="toolbar">
                <input
                  className="search-box"
                  placeholder="🔍  Search vulnerabilities..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <div className="filter-chips">
                  {['all', 'critical', 'high', 'medium', 'low'].map(r => (
                    <button
                      key={r}
                      className={`filter-chip ${filterRisk === r ? 'fc-active' : ''} ${r !== 'all' ? `fc-${r}` : ''}`}
                      onClick={() => setFilterRisk(r)}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="result-count">{filteredVulns.length} results</span>
              </div>

              <div className="vuln-grid">
                {filteredVulns.map((vuln, idx) => (
                  <div key={idx} className={`vuln-card vc-${vuln.risk}`}>
                    <div className="vc-top">
                      <span className={`risk-chip rc-${vuln.risk}`}>{vuln.risk}</span>
                      <span className="vc-count">{vuln.count}×</span>
                    </div>
                    <div className="vc-name">{vuln.name}</div>
                    <div className="vc-stats">
                      <div className="vc-stat">
                        <div className="vc-stat-val">{vuln.count}</div>
                        <div className="vc-stat-lbl">Occurrences</div>
                      </div>
                      <div className="vc-divider"></div>
                      <div className="vc-stat">
                        <div className="vc-stat-val">{vuln.repositories.length}</div>
                        <div className="vc-stat-lbl">Repos Affected</div>
                      </div>
                    </div>
                    <div className="vc-bar">
                      <div className="vc-bar-fill" style={{
                        width: `${Math.min(vuln.count * 10, 100)}%`,
                        background: vuln.risk === 'critical' ? '#ff4757' : vuln.risk === 'high' ? '#ffa502' : vuln.risk === 'medium' ? '#5352ed' : '#2ed573'
                      }}></div>
                    </div>
                  </div>
                ))}
                {filteredVulns.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">✓</div>
                    <div className="empty-title">No vulnerabilities found</div>
                    <div className="empty-sub">Try adjusting your filters</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SCAN HISTORY ── */}
          {activeTab === 'scans' && (
            <div className="tab-content">
              <div className="panel">
                <div className="panel-header">
                  <h2>Scan History</h2>
                  <span className="count-chip">{stats.recentScans.length}</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Repository</th>
                        <th>Developer</th>
                        <th>Issues</th>
                        <th>Security Score</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentScans.map((scan, idx) => (
                        <tr key={idx}>
                          <td className="cell-num">{idx + 1}</td>
                          <td className="cell-repo">
                            <span className="repo-dot"></span>
                            {scan.repo}
                          </td>
                          <td>{scan.developer}</td>
                          <td>
                            {scan.issues === 0
                              ? <span className="tag-clean">✓ Clean</span>
                              : <span className="tag-issues">{scan.issues}</span>}
                          </td>
                          <td>
                            <div className="score-cell">
                              <div className="scan-bar">
                                <div className="scan-bar-fill" style={{
                                  width: `${scan.score}%`,
                                  background: scan.score >= 80 ? '#2ed573' : scan.score >= 50 ? '#ffa502' : '#ff4757'
                                }}></div>
                              </div>
                              <span className="score-pct">{scan.score}%</span>
                            </div>
                          </td>
                          <td className="cell-time">{new Date(scan.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={`status-dot ${scan.score >= 80 ? 'sd-good' : scan.score >= 50 ? 'sd-warn' : 'sd-bad'}`}></span>
                          </td>
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
                <div className="panel-header">
                  <h2>Custom Security Rules</h2>
                  <button className="btn-primary" onClick={() => setShowRuleForm(!showRuleForm)}>
                    {showRuleForm ? '✕ Cancel' : '+ Add Rule'}
                  </button>
                </div>

                {showRuleForm && (
                  <form className="rule-form" onSubmit={handleAddRule}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Rule Name</label>
                        <input type="text" value={newRule.name}
                          onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                          required placeholder="e.g., No console logs in production" />
                      </div>
                      <div className="form-group">
                        <label>Pattern (regex)</label>
                        <input type="text" value={newRule.pattern}
                          onChange={e => setNewRule({ ...newRule, pattern: e.target.value })}
                          required placeholder="e.g., /console\.log/" />
                      </div>
                      <div className="form-group">
                        <label>Risk Level</label>
                        <select value={newRule.riskLevel} onChange={e => setNewRule({ ...newRule, riskLevel: e.target.value })}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Language</label>
                        <select value={newRule.language} onChange={e => setNewRule({ ...newRule, language: e.target.value })}>
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="sql">SQL</option>
                        </select>
                      </div>
                      <div className="form-group form-full">
                        <label>Description</label>
                        <textarea value={newRule.description}
                          onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                          placeholder="Why is this pattern dangerous?" />
                      </div>
                      <div className="form-group form-full">
                        <label>Fix Suggestion</label>
                        <textarea value={newRule.fixSuggestion}
                          onChange={e => setNewRule({ ...newRule, fixSuggestion: e.target.value })}
                          placeholder="How should developers fix this?" />
                      </div>
                    </div>
                    <button type="submit" className="btn-success">✓ Create Rule</button>
                  </form>
                )}

                <div className="rules-grid">
                  {customRules.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">⚙</div>
                      <div className="empty-title">No custom rules yet</div>
                      <div className="empty-sub">Add rules to enforce team security standards</div>
                    </div>
                  ) : customRules.map(rule => (
                    <div key={rule.id} className={`rule-card rc-border-${rule.risk_level}`}>
                      <div className="rule-card-top">
                        <span className="rule-card-name">{rule.name}</span>
                        <span className={`risk-chip rc-${rule.risk_level}`}>{rule.risk_level}</span>
                      </div>
                      <p className="rule-card-desc">{rule.description}</p>
                      {rule.pattern && (
                        <div className="rule-pattern">
                          <code>{rule.pattern}</code>
                        </div>
                      )}
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
                <div className="panel-header">
                  <h2>Audit Log</h2>
                  <span className="count-chip">{auditLogs.length}</span>
                </div>
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
                  {auditLogs.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-icon">≡</div>
                      <div className="empty-title">No audit logs yet</div>
                    </div>
                  )}
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
