# Quick Iteration Model - Reference Card

**Purpose**: Fast feedback cycle for development with E2E testing capability  
**Last Updated**: 2025-10-08

## 🚀 Quick Start (30 seconds)

```bash
# Terminal 1: Dependencies + Backend (run once)
docker compose up -d dex postgres meilisearch
make bin && ./hermes server -config=config.hcl

# Terminal 2: Frontend (run once)
cd web
MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8000

# Terminal 3: Testing (as needed)
cd tests/e2e-playwright
npx playwright test --reporter=line --max-failures=1
```

**URLs**:
- Frontend: http://localhost:4200
- Backend API: http://localhost:8000
- Dex Auth: http://localhost:5556

## 🔄 Iteration Cycle

### Backend Change (1-2 seconds)
```bash
# 1. Make change to *.go file
# 2. Rebuild + restart
make bin && pkill -f "./hermes server" && ./hermes server -config=config.hcl &
```

### Frontend Change (instant)
```bash
# 1. Make change to *.ts or *.hbs file
# 2. Browser auto-reloads automatically (no action needed!)
```

### Validation
```bash
# Option A: Interactive (playwright-mcp)
mcp_microsoft_pla_browser_navigate({ url: "http://localhost:4200/" })
mcp_microsoft_pla_browser_snapshot({})

# Option B: Automated (headless)
npx playwright test file.spec.ts --reporter=line --max-failures=1
```

## 📊 Comparison: Native vs Docker Backend

| Aspect | Native Backend | Docker Backend (./testing) |
|--------|----------------|----------------------------|
| **Rebuild Time** | 1-2 seconds | 10-15 seconds |
| **Port** | 8000 | 8001 |
| **Best For** | Quick iterations | Testing environment validation |
| **Rebuild Command** | `make bin` | `docker compose build hermes` |
| **Restart Command** | `./hermes server` | `docker compose up -d hermes` |
| **Debugging** | Native tools | Docker logs |
| **Memory** | Low (~100MB) | Higher (~500MB) |

**Recommendation**: Use native backend (port 8000) for development, Docker backend (port 8001) for final validation.

## ✅ Environment Verification (5 seconds)

```bash
# One-liner check
curl -I http://localhost:8000/health && \
curl -I http://localhost:4200/ && \
curl -s http://localhost:5556/dex/.well-known/openid-configuration | jq '.issuer' && \
echo "✅ Environment ready!"
```

**Expected Output**:
```
HTTP/1.1 200 OK           # Backend healthy
HTTP/1.1 200 OK           # Frontend serving
"http://localhost:5556/dex"  # Dex configured
✅ Environment ready!
```

## 🎯 Common Workflows

### Adding New API Endpoint

```bash
# 1. Create handler
vi internal/api/v2/my-feature.go

# 2. Register route
vi internal/cmd/commands/server/server.go

# 3. Quick rebuild
make bin && pkill -f "./hermes server" && ./hermes server -config=config.hcl &

# 4. Test endpoint
curl -s http://localhost:8000/api/v2/my-feature | jq '.'

# 5. E2E validation
cd tests/e2e-playwright
npx playwright test my-feature.spec.ts --reporter=line
```

### Adding New Frontend Component

```bash
# 1. Create component
vi web/app/components/my-feature.ts
vi web/app/templates/components/my-feature.hbs

# 2. Browser auto-reloads (no restart needed!)

# 3. Interactive testing
mcp_microsoft_pla_browser_navigate({ url: "http://localhost:4200/route" })
mcp_microsoft_pla_browser_snapshot({})
mcp_microsoft_pla_browser_take_screenshot({ filename: "my-feature.png" })

# 4. Codify test
vi tests/e2e-playwright/tests/my-feature.spec.ts
npx playwright test my-feature.spec.ts --reporter=line
```

### Full Stack Feature

```bash
# 1. Backend API
vi internal/api/v2/my-feature.go
make bin && pkill -f "./hermes server" && ./hermes server -config=config.hcl &

# 2. Frontend component (auto-reloads)
vi web/app/components/my-feature.ts

# 3. Interactive validation
# Use playwright-mcp to test integration

# 4. Automated validation
npx playwright test my-feature.spec.ts --reporter=line
```

## 🔧 Troubleshooting

### Backend won't start

```bash
# Check port conflict
lsof -i :8000

# Kill conflicting process
pkill -f "./hermes server"

# Check dependencies
docker compose ps | grep -E "dex|postgres|meilisearch"

# Restart dependencies if needed
docker compose up -d dex postgres meilisearch

# Try again
make bin && ./hermes server -config=config.hcl
```

### Frontend won't load

```bash
# Check if running
lsof -i :4200

# Check proxy configuration
curl -s http://localhost:4200/api/v2/web/config | jq '.'

# Restart with correct proxy
cd web
pkill -f "ember server"
MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://127.0.0.1:8000
```

### Playwright tests fail with connection refused

```bash
# Check all services
curl -I http://localhost:8000/health  # Backend
curl -I http://localhost:4200/        # Frontend
curl -s http://localhost:5556/dex/.well-known/openid-configuration | jq '.'  # Dex

# Start missing service(s) and try again
```

## 📝 Testing Cheat Sheet

### Interactive Testing (playwright-mcp)

```javascript
// Navigate
mcp_microsoft_pla_browser_navigate({ url: "http://localhost:4200/" })

// See page structure
mcp_microsoft_pla_browser_snapshot({})

// Take screenshot
mcp_microsoft_pla_browser_take_screenshot({ filename: "page.png" })

// Interact
mcp_microsoft_pla_browser_click({ element: "Button", ref: "e15" })
mcp_microsoft_pla_browser_type({ element: "Input", ref: "e20", text: "value" })

// Wait for result
mcp_microsoft_pla_browser_wait_for({ text: "Success", time: 5 })
```

### Automated Testing (Playwright)

```bash
# Single test (fast)
npx playwright test file.spec.ts --reporter=line --max-failures=1

# Specific test by name
npx playwright test -g "should do something" --reporter=line

# All tests
npx playwright test --reporter=line

# JSON output for parsing
npx playwright test --reporter=json > results.json

# Check exit code
echo $?  # 0 = pass, 1 = fail
```

## 💡 Pro Tips

1. **Keep dependencies running**: Start Dex/PostgreSQL/Meilisearch once, keep them running
2. **Use background processes**: `./hermes server &` frees up terminal
3. **Frontend first**: Make frontend changes first (instant reload) before backend
4. **Targeted testing**: Use `-g` to run specific tests, not full suite
5. **playwright-mcp for exploration**: Use interactive testing before codifying tests
6. **Native backend for speed**: 10x faster rebuilds than Docker
7. **Watch logs**: `./hermes server 2>&1 | tee hermes.log` to save output
8. **Use tmux/screen**: Multiple terminals in one session

## 🎓 Decision Tree

```
Need to make a change?
├─ Backend only?
│  └─ make bin && restart → validate with curl or Playwright
│
├─ Frontend only?
│  └─ Edit file → auto-reload → validate with playwright-mcp
│
├─ Full stack?
│  ├─ Backend: make bin && restart
│  ├─ Frontend: auto-reload
│  └─ Validate: playwright-mcp → codify test → run headless
│
└─ Testing environment validation?
   └─ Use Docker backend (./testing) + Ember proxy
```

## 🔗 Quick Links

- **Comprehensive Guide**: `docs-internal/PLAYWRIGHT_E2E_AGENT_GUIDE.md`
- **Testing Config**: `tests/e2e-playwright/playwright.config.ts`
- **Backend Config**: `config.hcl` (native) or `testing/config.hcl` (docker)
- **Copilot Instructions**: `.github/copilot-instructions.md`

## ⏱️ Timing Reference

| Operation | Native Backend | Docker Backend |
|-----------|----------------|----------------|
| Initial setup | 30s | 45s |
| Backend rebuild | 1-2s | 10-15s |
| Frontend reload | instant | instant |
| Run single test | 5-10s | 5-10s |
| Full test suite | 30-60s | 30-60s |

**Typical iteration**: 2-5 seconds (native backend) vs 15-20 seconds (Docker backend)

---

**Remember**: Fast iterations = More experiments = Better code. Choose native backend for speed! 🚀
