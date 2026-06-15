# Getting Started with Secure Code Guardian

## 🎯 What You Have

A complete, production-ready **team security system** with:

### Core Components
1. **Backend API** (Node.js/Express)
   - Real-time code scanning
   - Custom rule management
   - Audit logging
   - CI/CD webhook handling

2. **Frontend Dashboard** (React)
   - Team security metrics
   - Vulnerability tracking
   - Rule management
   - Audit log viewer

3. **CI/CD Integration**
   - GitHub Actions workflow
   - Automatic PR blocking
   - Security reporting

4. **Database & Storage**
   - Team management
   - Scan history
   - Custom rules
   - Audit logs

---

## ⚡ Quick Start (5 minutes)

### Option A: Docker (Easiest)

```bash
# 1. Navigate to project
cd secure-code-guardian

# 2. Create environment file
cp backend/.env.example .env
nano .env  # Edit with your settings

# 3. Start everything
docker-compose -f docker/docker-compose.yml up -d

# 4. Done! Access at http://localhost:3000
```

### Option B: Manual Setup

```bash
# 1. Backend
cd backend
npm install
npm run dev  # Runs on port 5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm start    # Runs on port 3000

# 3. Create team
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name": "My Team"}'
```

---

## 🚀 Deploy to Production (Choose One)

### 1. Vercel (Fastest - 5 minutes)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy backend
cd backend
vercel --prod

# Deploy frontend
cd ../frontend
vercel --prod

# Note your URLs and configure CORS in backend
```

### 2. Heroku (10 minutes)

```bash
# Install Heroku CLI
npm i -g heroku
heroku login

# Create app
heroku create secure-code-guardian-prod

# Set env vars
heroku config:set TEAM_ID=your_team_id
heroku config:set DATABASE_URL=your_db_url

# Deploy
git push heroku main
```

### 3. AWS (15 minutes)

```bash
# Using Elastic Beanstalk
eb init -p node.js-18
eb create prod
eb deploy
```

### 4. Your Own Server (VPS/Dedicated)

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Install Node.js 18+
curl -sL https://deb.nodesource.com/setup_18.x | sudo bash
sudo apt-get install -y nodejs

# 3. Clone and setup
git clone your-repo.git
cd secure-code-guardian
npm install

# 4. Configure environment
cp backend/.env.example backend/.env
nano backend/.env

# 5. Start with PM2
npm install -g pm2
pm2 start backend/server.js --name "guardian-api"
pm2 start "cd frontend && npm start" --name "guardian-ui"
```

---

## 🔗 GitHub Integration Setup

### 1. Create Webhook

```bash
# In your GitHub repo:
Settings → Webhooks → Add webhook

Payload URL: https://your-guardian-api.com/api/github-webhook
Content type: application/json
Events: Pull requests, Pushes
```

### 2. Add GitHub Actions

```bash
# Copy workflow file
mkdir -p .github/workflows
cp ci-cd/github-actions.yml .github/workflows/guardian.yml

# Add secrets to GitHub
Settings → Secrets → New repository secret

GUARDIAN_API_URL: https://your-guardian-api.com
TEAM_ID: your_team_id_here
```

### 3. Test Integration

```bash
# Push code to trigger workflow
git push origin feature/test

# Watch: Actions tab on GitHub for scan results
```

---

## 📊 Create Your First Custom Rule

### Via API

```bash
curl -X POST https://your-guardian-api.com/api/custom-rules \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "your_team_id",
    "name": "No console.log in production",
    "pattern": "/console\\.log/",
    "riskLevel": "high",
    "language": "javascript",
    "description": "Console logs expose sensitive data",
    "fixSuggestion": "Remove logging or use logger library"
  }'
```

### Via Dashboard

1. Open http://your-domain.com
2. Go to "Custom Security Rules"
3. Click "+ Add Rule"
4. Fill in the form and save

---

## 🔒 Security Checklist

Before going live:

- [ ] Configure `.env` file with secure values
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set strong API keys
- [ ] Enable GitHub/GitLab protection
- [ ] Configure rate limiting
- [ ] Setup database backups
- [ ] Enable audit logging
- [ ] Monitor logs regularly

---

## 📈 Using the Dashboard

### 1. Monitor Security Metrics

```
Top metrics tracked:
- Critical Issues: Must fix before deploy
- High Issues: Fix within sprint
- Security Score: Team average
- Vulnerability Trends: Over time
```

### 2. Review Recent Scans

```
Each scan shows:
- Repository & branch
- Developer who made changes
- Number of issues found
- Security score
- Timestamp
```

### 3. Manage Custom Rules

```
Rules are applied to:
- Specified languages
- All repositories
- All developers
- In real-time as code is written
```

### 4. View Audit Logs

```
Logs track:
- All code scans
- Rule changes
- Fixes applied
- PR blocks
- Compliance events
```

---

## 🛠️ API Usage Examples

### Scan Code

```javascript
const axios = require('axios');

async function scanCode(code, language) {
  const response = await axios.post(
    'https://your-api.com/api/scan',
    {
      teamId: 'team123',
      developerId: 'dev@example.com',
      code: code,
      language: language,
      repoName: 'api-gateway',
      branch: 'main',
      commitHash: 'abc123'
    }
  );
  
  console.log('Vulnerabilities found:', response.data.threats.length);
  console.log('Security score:', response.data.score);
  console.log('Blocked:', response.data.blocked);
}
```

### Get Dashboard Stats

```javascript
async function getDashboardStats() {
  const response = await axios.get(
    'https://your-api.com/api/teams/team123/dashboard'
  );
  
  console.log('Critical issues:', response.data.criticalIssues);
  console.log('Total scans:', response.data.totalScans);
  console.log('Active developers:', response.data.developers);
}
```

### Get Vulnerabilities Report

```javascript
async function getVulnerabilitiesReport() {
  const response = await axios.get(
    'https://your-api.com/api/vulnerabilities/team123'
  );
  
  response.data.forEach(vuln => {
    console.log(`${vuln.name}: found ${vuln.count} times in ${vuln.repositories.length} repos`);
  });
}
```

---

## 🧪 Testing the System

### 1. Test Vulnerability Detection

```javascript
// This code should be flagged
const password = "admin123";  // ❌ Hardcoded credentials
eval(userInput);               // ❌ Code execution
const sql = "SELECT * WHERE id = " + id;  // ❌ SQL injection
element.innerHTML = userInput; // ❌ XSS
```

### 2. Test Custom Rules

```bash
# Add rule to block console.log
curl -X POST https://your-api.com/api/custom-rules \
  -d '{"teamId":"team123", ...}'

# Test code with console.log
# Should be detected within 1 second
```

### 3. Test PR Blocking

```bash
# Push code with critical vulnerability
git push origin feature/test

# GitHub Actions should:
# 1. Run scan automatically
# 2. Detect critical issues
# 3. Block merge with comment
# 4. Log event in audit trail
```

---

## 🔧 Configuration Options

### Environment Variables

```bash
# Server
NODE_ENV=production           # or development
PORT=5000                     # API port

# Database
DATABASE_URL=sqlite:///db.db  # or PostgreSQL connection string

# Team
TEAM_ID=your_team_id          # For centralized logging
API_KEY=your_api_key          # For security

# CI/CD
GITHUB_WEBHOOK_SECRET=xxx     # For webhook verification
GITLAB_WEBHOOK_SECRET=xxx

# Frontend
REACT_APP_API_URL=https://...  # Backend URL
REACT_APP_ENV=production

# CORS
CORS_ORIGIN=https://your-domain.com,https://localhost:3000
```

---

## 📊 Monitoring & Health

### Check API Health

```bash
curl https://your-api.com/api/health
# Response: { "status": "ok", "uptime": 3600 }
```

### View Logs

```bash
# Using Docker
docker-compose logs -f guardian-backend

# Using PM2
pm2 logs guardian-api
```

### Database Backup

```bash
# SQLite
cp guardian.db guardian.db.backup

# PostgreSQL
pg_dump your_db > backup.sql
```

---

## 🚨 Troubleshooting

### API not responding

```bash
# 1. Check if running
lsof -i :5000

# 2. Check logs
npm run dev

# 3. Verify env variables
cat backend/.env

# 4. Restart
pm2 restart guardian-api
```

### Dashboard not loading

```bash
# 1. Check frontend is running
lsof -i :3000

# 2. Check API URL in .env
echo $REACT_APP_API_URL

# 3. Check CORS
# Verify CORS_ORIGIN includes frontend URL

# 4. Clear cache and refresh
# Browser: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
```

### GitHub Actions failing

```bash
# 1. Check secrets are set
# Settings → Secrets → Review values

# 2. Check workflow file syntax
# .github/workflows/guardian.yml

# 3. Check API is accessible
curl https://your-api.com/api/health

# 4. Review Actions logs
# Actions tab → See workflow output
```

---

## 📞 Support

- **Documentation**: See README.md and DEPLOYMENT.md
- **Issues**: Report on GitHub Issues
- **Questions**: Check GitHub Discussions

---

## 🎓 Next Steps

1. ✅ Deploy the system
2. ✅ Configure environment variables
3. ✅ Set up GitHub/GitLab integration
4. ✅ Create first custom rule
5. ✅ Test with sample vulnerable code
6. ✅ Invite team members to dashboard
7. ✅ Monitor metrics daily
8. ✅ Schedule weekly security reviews

---

## 📄 File Structure

```
secure-code-guardian/
├── backend/
│   ├── server.js           # Express API
│   ├── package.json        # Dependencies
│   └── .env.example        # Environment template
├── frontend/
│   ├── Dashboard.jsx       # React component
│   └── Dashboard.css       # Styles
├── ci-cd/
│   └── github-actions.yml  # GitHub workflow
├── docker/
│   ├── Dockerfile          # Container image
│   └── docker-compose.yml  # Multi-container setup
├── README.md               # Overview
├── DEPLOYMENT.md           # Detailed deployment guide
└── setup.sh                # Quick setup script
```

---

**Ready to secure your code? Let's go! 🚀**

For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md)
