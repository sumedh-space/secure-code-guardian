# 🛡️ Secure Code Guardian

**Real-time code security enforcement system** that actively blocks vulnerable code patterns, auto-fixes issues, and tracks team security metrics.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

---

## 🎯 Why Secure Code Guardian?

Traditional code scanning tools:
- ❌ Analyze **after** code is written
- ❌ Only **report** vulnerabilities
- ❌ Require manual fixes
- ❌ No real-time enforcement
- ❌ Limited team collaboration

**Secure Code Guardian**:
- ✅ Detects threats **in real-time** as developers code
- ✅ **Blocks** vulnerable patterns automatically
- ✅ **Auto-fixes** critical issues
- ✅ **Enforces** security at CI/CD level
- ✅ **Team dashboard** for security visibility
- ✅ **Custom rules** per organization
- ✅ **Audit logging** of all security events

---

## 🚀 Key Features

### 1. Real-Time Code Analysis
- Live vulnerability detection as you type
- Security score updates in real-time (0-100)
- Immediate feedback on risky patterns

### 2. Active Enforcement
- **Strict Mode**: Blocks all risky patterns
- **Enforce Mode**: Blocks critical vulnerabilities
- **Advise Mode**: Warns but allows (for learning)

### 3. Multi-Language Support
- JavaScript/TypeScript
- Python
- Java
- SQL
- C#, Go, Rust, C/C++ (extensible)

### 4. CI/CD Integration
- GitHub Actions workflow
- GitLab CI/CD pipeline
- Jenkins integration
- Automatic PR blocking with critical issues

### 5. Team Dashboard
- Real-time security metrics
- Vulnerability tracking by repository
- Developer activity logs
- Security trends and patterns

### 6. Custom Security Rules
- Create team-specific rules
- Define patterns and risk levels
- Auto-apply across all repositories
- Version controlled rules

### 7. Audit Logging
- All code scans logged
- Fixes tracked and timestamped
- Compliance-ready audit trail
- Export logs for reporting

### 8. Auto-Fix Capabilities
- One-click fix individual issues
- Bulk auto-fix with "Fix All"
- Secure code examples provided
- Pattern-based remediation

---

## 📊 Dashboard Preview

```
┌─────────────────────────────────────────────────────────┐
│  Secure Code Guardian - Team Security Dashboard         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Critical Issues: 3    │  High: 12    │  Scans: 847     │
│  Active Devs: 24       │  Repos: 18   │  Score: 78/100  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Recent Scans                                             │
├─────────────────────────────────────────────────────────┤
│ api-gateway    │ alice       │ 2 issues  │ 82 │ 2 days  │
│ web-frontend   │ bob         │ 0 issues  │ 95 │ 1 day   │
│ auth-service   │ charlie     │ 5 issues  │ 65 │ 2 hours │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Top Vulnerabilities                                      │
├─────────────────────────────────────────────────────────┤
│ [CRITICAL] SQL Injection      │ Found 8x   │ 3 repos    │
│ [HIGH]     Hardcoded Keys     │ Found 12x  │ 5 repos    │
│ [HIGH]     XSS Vulnerability  │ Found 4x   │ 2 repos    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Vulnerability Detection Covers

### Critical Issues
- `eval()` / `exec()` execution
- SQL Injection
- XSS (innerHTML injection)
- Hardcoded credentials
- Remote code execution
- Unsafe deserialization
- Command injection

### High Priority
- Unencrypted HTTP
- Missing authentication
- Path traversal
- XXE injection
- Insecure randomness
- Weak cryptography

### Medium Risk
- Sensitive data logging
- Missing input validation
- Weak password policies
- Missing security headers

### Low Priority
- Code style issues
- Missing documentation
- Performance concerns
- Best practice violations

---

## 🛠️ Installation

### Quick Start (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/secure-code-guardian.git
cd secure-code-guardian

# 2. Start with Docker
docker-compose -f docker/docker-compose.yml up -d

# 3. Access dashboard
# Frontend: http://localhost:3000
# API: http://localhost:5000

# 4. Create team
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name": "My Team"}'
```

### Manual Installation

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm start
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment options.

---

## 📝 Usage Examples

### Scan Code via API

```bash
curl -X POST http://localhost:5000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "your_team_id",
    "developerId": "dev@example.com",
    "code": "const data = eval(userInput);",
    "language": "javascript",
    "repoName": "api-gateway",
    "branch": "feature/auth",
    "commitHash": "abc123"
  }'
```

**Response**:
```json
{
  "scanId": "scan_uuid",
  "threats": [
    {
      "name": "eval() execution",
      "risk": "critical",
      "count": 1,
      "fix": "Use JSON.parse() instead"
    }
  ],
  "score": 25,
  "blocked": true,
  "blockReason": "Critical vulnerabilities detected"
}
```

### Add Custom Rule

```bash
curl -X POST http://localhost:5000/api/custom-rules \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "your_team_id",
    "name": "No console.log in production",
    "pattern": "/console\\.log/",
    "riskLevel": "high",
    "language": "javascript",
    "description": "Console logs leak sensitive info",
    "fixSuggestion": "Use logger library instead"
  }'
```

### Get Dashboard Stats

```bash
curl http://localhost:5000/api/teams/your_team_id/dashboard
```

---

## 🔗 CI/CD Setup

### GitHub Actions
```yaml
# .github/workflows/guardian.yml
name: Security Scan
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Guardian
        env:
          GUARDIAN_API_URL: ${{ secrets.GUARDIAN_API_URL }}
        run: npx guardian-scan
```

### GitLab CI
```yaml
# .gitlab-ci.yml
security_scan:
  stage: security
  script:
    - npx guardian-scan
  only:
    - merge_requests
```

---

## 📊 API Reference

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/teams` | Create team |
| POST | `/api/scan` | Scan code for vulnerabilities |
| GET | `/api/teams/:teamId/dashboard` | Get dashboard stats |
| POST | `/api/custom-rules` | Add custom rule |
| GET | `/api/custom-rules/:teamId` | List custom rules |
| GET | `/api/vulnerabilities/:teamId` | Get vulnerability report |
| GET | `/api/audit-logs/:teamId` | Get audit log |
| POST | `/api/github-webhook` | GitHub webhook handler |

Full API docs: [API.md](./API.md)

---

## 🏗️ Architecture

```
Developer Code
    ↓
Guardian IDE Integration (Real-time analysis)
    ↓
CI/CD Pipeline (GitHub/GitLab)
    ↓
Backend API (Scan & Log)
    ↓
Database (SQLite/PostgreSQL)
    ↓
Team Dashboard (React)
    ↓
Audit Trail & Reporting
```

---

## 🔒 Security

- All connections use HTTPS in production
- API requests authenticated with tokens
- Sensitive data encrypted in database
- Audit logs immutable
- No code stored permanently (by default)
- GDPR compliant

---

## 📈 Metrics & Reporting

Track your team's security:
- Security score by repository
- Vulnerability trends over time
- Developer compliance rates
- Most common vulnerability types
- Time-to-fix metrics

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md)

**Areas for contribution**:
- New language support (Golang, Rust, PHP)
- Additional vulnerability patterns
- Integration with more CI/CD platforms
- Dashboard improvements
- Documentation

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

---

## 🚀 Quick Deploy Links

- **Vercel**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/secure-code-guardian)
- **Heroku**: [![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/yourusername/secure-code-guardian)
- **Docker**: `docker-compose up -d`

---

## 📞 Support

- **Issues & Bugs**: [GitHub Issues](https://github.com/yourusername/secure-code-guardian/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/secure-code-guardian/discussions)
- **Email**: support@secure-code-guardian.dev
- **Docs**: [Full Documentation](./docs)

---

## 🎓 Learn More

- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./API.md)
- [Custom Rules Guide](./docs/CUSTOM_RULES.md)
- [CI/CD Setup](./docs/CI_CD_SETUP.md)
- [Architecture](./docs/ARCHITECTURE.md)

---

**Secure Code Guardian** - Because security shouldn't be an afterthought.

Made with ❤️ for developers who care about security
