# Secure Code Guardian - Deployment Guide

## System Overview

Secure Code Guardian is a **real-time code security enforcement system** with:
- ✅ Real-time vulnerability detection
- ✅ CI/CD integration (GitHub, GitLab, Jenkins)
- ✅ Team security dashboard
- ✅ Custom security rules
- ✅ Audit logging
- ✅ PR blocking for critical issues

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Developer's IDE                       │
│         (Code written with guardian analysis)            │
└──────────────┬──────────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────────┐
│              CI/CD Pipeline (GitHub/GitLab)             │
│  (Webhook triggers automated security scan)             │
└──────────────┬──────────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────────┐
│          Guardian Backend API (Node.js/Express)         │
│  - Analyze code for vulnerabilities                      │
│  - Apply custom rules                                    │
│  - Block PRs with critical issues                        │
│  - Log all security events                               │
└──────────────┬──────────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────────┐
│          Team Dashboard (React Frontend)                │
│  - Real-time security metrics                            │
│  - Vulnerability tracking                                │
│  - Custom rule management                                │
│  - Audit log review                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- **Node.js** 16+ (for backend)
- **npm** or **yarn** (package manager)
- **Docker & Docker Compose** (for containerized deployment)
- **Git** (for version control)
- **GitHub/GitLab account** (for CI/CD integration)

---

## Quick Start (Local Development)

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/secure-code-guardian.git
cd secure-code-guardian

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev

# In another terminal, setup frontend
cd frontend
npm install
npm start
```

### 2. Access the Dashboard

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

---

## Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/secure-code-guardian.git
cd secure-code-guardian

# 2. Create environment file
cp backend/.env.example .env
nano .env  # Configure your settings

# 3. Build and start containers
docker-compose -f docker/docker-compose.yml up -d

# 4. Verify deployment
docker-compose ps
docker logs guardian-backend
```

### Option 2: Vercel Deployment (Fastest)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy backend
cd backend
vercel --prod

# Deploy frontend
cd ../frontend
vercel --prod
```

### Option 3: Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create secure-code-guardian

# Set environment variables
heroku config:set TEAM_ID=your_team_id
heroku config:set DATABASE_URL=your_db_url

# Deploy
git push heroku main
```

### Option 4: AWS Deployment

```bash
# Using Elastic Beanstalk
eb init -p node.js-18 secure-code-guardian
eb create production
eb deploy
```

---

## CI/CD Integration Setup

### GitHub Actions

1. **Add the workflow file**:
   ```bash
   mkdir -p .github/workflows
   cp ci-cd/github-actions.yml .github/workflows/guardian-scan.yml
   ```

2. **Configure secrets**:
   - Go to: Repository Settings → Secrets and variables → Actions
   - Add:
     - `GUARDIAN_API_URL`: https://your-guardian-api.com
     - `TEAM_ID`: your_team_id_here

3. **The workflow will automatically**:
   - Scan code on every PR
   - Block PRs with critical vulnerabilities
   - Comment with security report

### GitLab CI

1. **Add `.gitlab-ci.yml`**:
   ```yaml
   stages:
     - security

   security_scan:
     stage: security
     image: node:18
     script:
       - npm install -g axios
       - node ci-cd/gitlab-scan.js
     only:
       - merge_requests
   ```

2. **Configure CI/CD Variables**:
   - Settings → CI/CD → Variables
   - Add: `GUARDIAN_API_URL`, `TEAM_ID`

---

## Custom Security Rules

### Add Rules via Dashboard

1. Navigate to **Custom Security Rules**
2. Click **+ Add Rule**
3. Configure:
   - **Name**: Rule description
   - **Pattern**: Regex pattern to detect (e.g., `/console\.log/`)
   - **Risk Level**: critical, high, medium, low
   - **Language**: javascript, python, java, sql
   - **Description**: Why it's dangerous
   - **Fix Suggestion**: How to fix it

### Example Rules

**No console.log in production**:
```
Pattern: /console\.log/
Risk: High
Language: javascript
Fix: Remove logging or use logger library
```

**No hardcoded API keys**:
```
Pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/
Risk: Critical
Language: javascript, python
Fix: Use environment variables
```

---

## Audit Logging

All security events are logged automatically:

- Code scans
- Vulnerability detections
- PR blocks
- Custom rule creations
- Fixes applied

**Access logs via**:
```bash
# API endpoint
GET /api/audit-logs/:teamId?limit=100

# Database query
SELECT * FROM audit_logs WHERE team_id = ? ORDER BY timestamp DESC;
```

---

## API Endpoints

### Scan Code
```bash
POST /api/scan
Body: {
  teamId: string,
  developerId: string,
  code: string,
  language: string,
  repoName: string,
  branch: string,
  commitHash: string
}
Response: {
  scanId: string,
  threats: array,
  score: number,
  blocked: boolean
}
```

### Get Dashboard Stats
```bash
GET /api/teams/:teamId/dashboard
Response: {
  totalScans: number,
  criticalIssues: number,
  highIssues: number,
  developers: number,
  repositories: number,
  recentScans: array
}
```

### Add Custom Rule
```bash
POST /api/custom-rules
Body: {
  teamId: string,
  name: string,
  pattern: string,
  riskLevel: string,
  description: string,
  fixSuggestion: string,
  language: string
}
```

### Get Vulnerabilities
```bash
GET /api/vulnerabilities/:teamId
Response: array of {
  name: string,
  risk: string,
  count: number,
  repositories: array
}
```

### Get Audit Logs
```bash
GET /api/audit-logs/:teamId?limit=50
Response: array of {
  id: string,
  action: string,
  details: string,
  timestamp: string
}
```

---

## Configuration

### Environment Variables

```bash
# Server
NODE_ENV=production
PORT=5000

# Team & API
TEAM_ID=your_team_id
API_KEY=your_api_key

# Database
DATABASE_URL=sqlite:///./guardian.db

# Webhooks
GITHUB_WEBHOOK_SECRET=your_secret
GITLAB_WEBHOOK_SECRET=your_secret

# CORS
CORS_ORIGIN=http://localhost:3000,https://your-domain.com
```

---

## Monitoring & Health Checks

### Health Endpoint
```bash
GET /api/health
Response: { status: "ok", uptime: number }
```

### Docker Health Check
```bash
docker inspect guardian-backend
```

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f guardian-backend
```

---

## Scaling & Performance

### Database Optimization
- Use PostgreSQL for production (more scalable than SQLite)
- Index frequently queried columns
- Archive old audit logs monthly

### API Rate Limiting
```bash
npm install express-rate-limit
# Configure in server.js
```

### Caching
```bash
npm install redis
# Cache dashboard stats, custom rules
```

---

## Security Best Practices

1. **Use HTTPS in production**
2. **Rotate API keys regularly**
3. **Enable GitHub/GitLab branch protection**
4. **Review audit logs weekly**
5. **Keep dependencies updated**: `npm audit fix`
6. **Use secrets management** (AWS Secrets Manager, HashiCorp Vault)
7. **Enable 2FA** on GitHub/GitLab accounts

---

## Troubleshooting

### Backend won't start
```bash
# Check Node version
node --version  # Should be 16+

# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Check logs
npm run dev
```

### API connection errors
```bash
# Verify backend is running
curl http://localhost:5000/api/health

# Check CORS settings
# Ensure CORS_ORIGIN includes your frontend URL
```

### PR doesn't block
- Verify webhook is configured in GitHub/GitLab
- Check CI/CD secrets are set correctly
- Review GitHub Actions logs

---

## Support & Contributing

- **Issues**: Report bugs on GitHub Issues
- **Feature Requests**: Submit via GitHub Discussions
- **Contributing**: See CONTRIBUTING.md

---

## License

MIT License - See LICENSE file

---

## Next Steps

1. ✅ Deploy the system
2. ✅ Connect your GitHub/GitLab repositories
3. ✅ Add custom security rules for your team
4. ✅ Review initial vulnerability scan
5. ✅ Set up team dashboard access
6. ✅ Monitor audit logs regularly

**Questions?** Contact: support@secure-code-guardian.dev
