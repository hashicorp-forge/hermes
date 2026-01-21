# Build & Development

**Guide**: Ember Development Guide for Hermes  
**Section**: 06 - Build & Development  
**Audience**: Frontend developers working with build tools

---

## Overview

Hermes uses Ember CLI for building and development. This guide covers build configuration, development server setup, and deployment workflows.

---

## Development Server

### Starting the Dev Server

```bash
cd web

# Option 1: With Mirage (mocked API)
yarn start
# Runs on http://localhost:4200
# Uses mirage/config.ts for API mocking

# Option 2: With backend proxy (recommended for integration testing)
yarn start:with-proxy
# Runs on http://localhost:4201
# Proxies API requests to http://127.0.0.1:8001
```

### Dev Server Configuration

```javascript
// web/.ember-cli
{
  "disableAnalytics": false,
  "port": 4200,
  "liveReloadPort": 49152
}
```

### Proxy Configuration

When using `--proxy` flag, API requests are forwarded to the backend:

```bash
# Proxies all requests to /api/* and /1/* to backend
ember server --port 4201 --proxy http://127.0.0.1:8001
```

**What gets proxied**:
- `/api/v1/*` → Backend API v1
- `/api/v2/*` → Backend API v2
- `/1/indexes/*` → Backend Algolia proxy
- `/auth/*` → Backend authentication

**What stays local**:
- `/assets/*` → Ember app assets
- `/tests/*` → Test files
- All other routes → Ember routing

---

## Build Configuration

### ember-cli-build.js

```javascript
// web/ember-cli-build.js
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    // Code coverage configuration
    'ember-cli-code-coverage': {
      modifyAssetLocation: function(path) {
        return path.replace('hermes', '');
      }
    },
    
    // Ember Auto Import configuration
    autoImport: {
      webpack: {
        resolve: {
          alias: {
            // Fix @ember/test-waiters for ember-app-scheduler
            '@ember/test-waiters': require.resolve('@ember/test-waiters'),
            // Fix ember-concurrency async-arrow-runtime
            'ember-concurrency/async-arrow-runtime': 
              require.resolve('ember-concurrency/addon/-private/async-arrow-runtime')
          }
        }
      }
    },
    
    // Disable CSS minification in dev
    minifyCSS: {
      enabled: false,
    },
    
    // PostCSS + SASS + Tailwind pipeline
    postcssOptions: {
      compile: {
        extension: 'scss',
        enabled: true,
        parser: require('postcss-scss'),
        cacheInclude: [/.*\.hbs$/, /.*\.scss$/],
        plugins: [
          {
            module: require('@csstools/postcss-sass'),
            options: {
              includePaths: [
                'node_modules',
                './node_modules/@hashicorp/design-system-tokens/dist/products/css',
              ],
            },
          },
          require('tailwindcss')('./tailwind.config.js'),
        ],
      },
    },
  });

  return app.toTree();
};
```

### Key Build Options

#### Auto Import

Automatically imports npm packages into your app:

```typescript
// No need to manually add to ember-cli-build.js
import moment from 'moment';
import { debounce } from 'lodash';

export default class MyComponent extends Component {
  formattedDate = moment().format('YYYY-MM-DD');
}
```

#### Code Coverage

```javascript
{
  'ember-cli-code-coverage': {
    modifyAssetLocation: function(path) {
      return path.replace('hermes', '');
    }
  }
}
```

Enables coverage when running:
```bash
COVERAGE=true yarn test
```

---

## Styling Pipeline

### Tailwind CSS + SCSS

Hermes uses both Tailwind and SCSS for styling.

#### Tailwind Configuration

```javascript
// web/tailwind.config.js
const { tailwindConfig } = require('@hashicorp/design-system-components/tailwind-config');

module.exports = {
  ...tailwindConfig,
  content: [
    './app/**/*.{gjs,gts,hbs,html,js,ts}',
    './node_modules/@hashicorp/design-system-components/**/*.js',
  ],
  theme: {
    extend: {
      // Custom extensions
    },
  },
};
```

#### SCSS Setup

```scss
// app/styles/app.scss
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

// HashiCorp Design System tokens
@import '@hashicorp/design-system-tokens/dist/products/css/tokens';

// Custom styles
.my-custom-class {
  @apply flex items-center gap-4;
  
  // SCSS-specific features
  &:hover {
    @apply bg-gray-100;
  }
}
```

#### Using Styles

```hbs
{{! Tailwind utility classes }}
<div class="flex items-center justify-between p-4 bg-white rounded shadow">
  <h3 class="text-lg font-semibold">Title</h3>
  <button class="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
    Action
  </button>
</div>

{{! Custom SCSS classes }}
<div class="my-custom-class">
  Content
</div>
```

---

## Environment Configuration

### config/environment.js

```javascript
// web/config/environment.js
'use strict';

module.exports = function (environment) {
  let ENV = {
    modulePrefix: 'hermes',
    environment,
    rootURL: '/',
    locationType: 'history',
    
    EmberENV: {
      FEATURES: {},
      EXTEND_PROTOTYPES: false,
    },
    
    APP: {
      // App-specific config
    },
  };

  if (environment === 'development') {
    // Development-specific config
    ENV['ember-cli-mirage'] = {
      enabled: process.env.MIRAGE_ENABLED !== 'false',
    };
  }

  if (environment === 'test') {
    ENV.locationType = 'none';
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;
    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;
  }

  if (environment === 'production') {
    // Production-specific config
  }

  return ENV;
};
```

### Accessing Config

```typescript
import Component from '@glimmer/component';
import config from 'hermes/config/environment';

export default class MyComponent extends Component {
  get isDevelopment(): boolean {
    return config.environment === 'development';
  }
}
```

---

## Build Commands

### Development Build

```bash
# Fast development build (not minified)
yarn start
```

### Production Build

```bash
# Optimized production build
yarn build

# Output directory: web/dist/
```

### Test Build

```bash
# Build with test assets
yarn test:build
```

### Build with Coverage

```bash
# Build with coverage instrumentation
COVERAGE=true yarn build
```

---

## Build Output

### Development Build

```
web/dist/
├── assets/
│   ├── hermes.css         # Compiled styles
│   ├── hermes.js          # Compiled app code
│   ├── vendor.css         # Third-party styles
│   └── vendor.js          # Third-party code
├── index.html             # Entry point
└── tests/
    ├── index.html         # Test runner
    └── tests.js           # Test code
```

### Production Build

```
web/dist/
├── assets/
│   ├── hermes-[fingerprint].css    # Minified, fingerprinted
│   ├── hermes-[fingerprint].js     # Minified, fingerprinted
│   ├── vendor-[fingerprint].css
│   └── vendor-[fingerprint].js
└── index.html                       # Entry point with fingerprinted assets
```

---

## Development Workflow

### Typical Development Session

```bash
# Terminal 1: Start backend
cd /path/to/hermes
make docker/postgres/start
docker compose up -d dex meilisearch
./hermes server -config=config.hcl

# Terminal 2: Start frontend
cd web
yarn start:with-proxy

# Visit http://localhost:4201 in browser
```

### Hot Reloading

Ember CLI watches for changes and automatically rebuilds:

- **JavaScript/TypeScript changes**: Browser auto-refreshes
- **Template changes**: Browser auto-refreshes
- **Style changes**: Styles update without full refresh
- **Config changes**: Requires manual server restart

### Build Performance

#### Typical Build Times

| Build Type | Cold Start | Rebuild | Notes |
|------------|-----------|---------|-------|
| Development | 15-30s | 1-5s | Depends on changed files |
| Production | 60-90s | N/A | Full optimization |
| Test | 20-40s | 2-8s | Includes test assets |

#### Optimizing Build Speed

```javascript
// ember-cli-build.js
module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    // Disable source maps in dev for faster builds
    sourcemaps: {
      enabled: false,
    },
    
    // Disable minification in dev
    minifyCSS: { enabled: false },
    minifyJS: { enabled: false },
  });
  
  return app.toTree();
};
```

---

## Deployment

### Building for Production

```bash
cd web
yarn build
```

### Environment Variables

Set these during build:

```bash
# Not needed as of October 2025 - all requests proxy through backend
# HERMES_WEB_ALGOLIA_APP_ID=xxx
# HERMES_WEB_ALGOLIA_SEARCH_API_KEY=xxx

# Only needed if using Google OAuth provider
HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID=xxx.apps.googleusercontent.com

yarn build
```

**Note**: As of October 2025, Algolia credentials are no longer needed in the frontend build. All search requests proxy through the backend at `/1/indexes/*`.

### Serving Production Build

#### Option 1: Using Hermes Backend

The Go backend serves the Ember app from `web/dist`:

```bash
# Build frontend
cd web
yarn build

# Start backend (serves frontend at /)
cd ..
./hermes server -config=config.hcl
```

#### Option 2: Using nginx

```nginx
server {
  listen 80;
  server_name hermes.example.com;
  root /path/to/hermes/web/dist;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  location /api/ {
    proxy_pass http://localhost:8000;
  }
  
  location /1/indexes/ {
    proxy_pass http://localhost:8000;
  }
}
```

#### Option 3: Using Docker

```dockerfile
# web/Dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

---

## Debugging Build Issues

### Common Problems

#### "Module not found" Error

**Problem**: Import can't be resolved

**Solution**: Check `tsconfig.json` path mappings:
```json
{
  "compilerOptions": {
    "paths": {
      "hermes/*": ["app/*"]
    }
  }
}
```

#### "Invalid PostCSS plugin" Error

**Problem**: PostCSS plugin not installed

**Solution**: Install missing dependency:
```bash
yarn add -D @csstools/postcss-sass postcss-scss
```

#### "Broccoli build error" with SASS

**Problem**: SASS compilation fails

**Solution**: Check SASS syntax in `app/styles/`:
```bash
# Validate SASS files
npx sass --check app/styles/app.scss
```

#### Slow Builds

**Problem**: Builds take too long

**Solutions**:
1. Disable source maps in development
2. Clear ember build cache: `rm -rf web/tmp/`
3. Restart ember server
4. Check for infinite loops in computed properties

---

## Advanced Topics

### Custom Babel Configuration

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);

  return {
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties'],
    ],
  };
};
```

### Webpack Configuration (via Auto Import)

```javascript
// ember-cli-build.js
module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    autoImport: {
      webpack: {
        resolve: {
          alias: {
            'my-module': require.resolve('my-module/dist/index.js'),
          },
          fallback: {
            fs: false,
            path: false,
          },
        },
        plugins: [
          new webpack.DefinePlugin({
            'process.env.MY_VAR': JSON.stringify(process.env.MY_VAR),
          }),
        ],
      },
    },
  });
  
  return app.toTree();
};
```

---

## Best Practices

### ✅ DO

- Use `yarn start:with-proxy` for integration testing with backend
- Run `yarn build` before committing to catch build errors
- Keep `ember-cli-build.js` configuration minimal
- Use environment variables for deployment-specific config
- Clear build cache (`rm -rf tmp/`) when encountering strange errors

### ❌ DON'T

- Don't commit `dist/` directory
- Don't modify files in `tmp/` or `dist/`
- Don't use build-time environment variables for runtime config
- Don't disable minification in production builds
- Don't skip testing production builds before deploying

---

## Next Steps

Continue to [07-common-pitfalls.md](./07-common-pitfalls.md) to learn about common issues and their solutions.
