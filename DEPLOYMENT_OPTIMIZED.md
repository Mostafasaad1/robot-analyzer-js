# Optimized Build Deployment Guide

This guide covers deploying the Robot Analyzer frontend with maximum performance optimizations enabled.

## Prerequisites

- Node.js 18+
- npm or package manager of choice
- GitHub account (for GitHub Pages deployment)

## Installation

### 1. Install Dependencies

```bash
cd frontend

# Standard dependencies
npm install

# Optional: Build optimization dependencies
npm install --save-dev @vitejs/plugin-react-swc
npm install --save-dev vite-plugin-compression
npm install --save-dev rollup-plugin-visualizer
npm install --save-dev @tanstack/react-virtual
```

### 2. Configure Build

Choose one of the following build configurations:

#### Option A: Standard Vite Configuration (Default)
Use the default [`vite.config.ts`](robot-analyzer/frontend/vite.config.ts) for standard builds.

#### Option B: Optimized Vite Configuration
Rename [`vite.config.optimized.ts`](robot-analyzer/frontend/vite.config.optimized.ts) to `vite.config.ts` or update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite --config vite.config.optimized.ts",
    "build": "vite build --config vite.config.optimized.ts",
    "build:optimize": "vite build --config vite.config.optimized.ts",
    "build:analyze": "vite build --config vite.config.optimized.ts --mode analyze"
  }
}
```

## Build Commands

### Development Build
```bash
npm run dev
```
Starts development server on `http://localhost:3000`

### Production Build (Standard)
```bash
npm run build
```
Creates optimized production bundle in `dist/` directory

### Production Build (Optimized)
```bash
npm run build:optimize
```
Creates production bundle with:
- SWC compilation (faster builds)
- Brotli/Gzip compression
- Code splitting by library
- Tree shaking
- Minification with Terser

### Bundle Analysis
```bash
npm run build:analyze
```
Creates production build and opens `dist/stats.html` with visualized bundle composition.

## Output Structure

### Standard Build
```
dist/
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── index.html
```

### Optimized Build
```
dist/
├── assets/
│   ├── vendor-react-[hash].js (react, react-dom)
│   ├── vendor-threejs-[hash].js (three, @react-three/*)
│   ├── vendor-zustand-[hash].js (zustand)
│   ├── vendor-axios-[hash].js (axios)
│   ├── vendor-urdf-[hash].js (urdf-loader)
│   ├── vendor-misc-[hash].js (other dependencies)
│   ├── index-[hash].js (application code)
│   ├── index-[hash].css (styles)
│   ├── index-[hash].js.gz (compressed)
│   ├── index-[hash].js.br (brotli compressed)
│   └── ...
└── index.html
```

## Deployment Options

### GitHub Pages (Recommended)

1. **Configure `vite.config.ts`:**
   ```ts
   export default defineConfig({
     base: '/repository-name/',  // Use your repository name
     // ... rest of config
   })
   ```

2. **Add GitHub Actions workflow** (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [main]
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
   
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
   
         - name: Install dependencies
           run: |
             cd frontend
             npm ci
   
         - name: Build optimized
           run: |
             cd frontend
             npm run build:optimize
   
         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./frontend/dist
   ```

3. **Push to main branch** - Deployment happens automatically

### Cloud Platforms

#### Vercel
1. Connect GitHub repository
2. Configure build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build:optimize`
   - Output Directory: `dist`

#### Netlify
1. Connect GitHub repository
2. Configure build settings:
   - Build Command: `npm run build:optimize`
   - Publish Directory: `dist`
   - Add redirect rule for SPA: `/* /index.html 200`

#### AWS S3 + CloudFront
```bash
# Build
npm run build:optimize

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Configure CloudFront cache behavior
# - Enable gzip/brotli compression
# - Set cache control headers
```

## Performance Optimization Checklist

- [x] **Optimized Vite Configuration**
  - [ ] SWC compilation enabled
  - [ ] Brotli compression configured
  - [ ] Code splitting by library
  - [ ] Terser minification with console stripping

- [x] **Frontend Optimizations**
  - [ ] Lazy loading enabled ([`LazyRobotViewer`](robot-analyzer/frontend/src/components/Viewer/LazyRobotViewer.tsx))
  - [ ] Code splitting for panels ([`lazyPanels`](robot-analyzer/frontend/src/components/UI/lazyPanels.tsx))
  - [ ] API caching ([`optimizedApi`](robot-analyzer/frontend/src/services/optimizedApi.ts))
  - [ ] State selectors ([`sessionStore`](robot-analyzer/frontend/src/stores/sessionStore.ts))
  - [ ] Hardware-accelerated CSS animations ([`animations.css`](robot-analyzer/frontend/src/styles/animations.css))

- [ ] **Backend Optimizations**
  - [ ] Computation cache enabled
  - [ ] Batch API available
  - [ ] Response compression middleware active

## Monitoring

### Performance Metrics

Use the built-in performance monitoring in production:

```typescript
import { logPerformanceMetrics, exportPerformanceMetrics } from './utils/performance';

// Log to console (development)
if (__DEV__) {
  logPerformanceMetrics();
}

// Export for analysis (production)
const metricsJSON = exportPerformanceMetrics();
// Send to monitoring service
```

### Lighthouse CI

Add Lighthouse CI to measure performance:

1. **Install Lighthouse CI:**
   ```bash
   npm install --save-dev @lhci/cli
   ```

2. **Create `.lighthouserc.json`:**
   ```json
   {
     "ci": {
       "upload": {
         "target": "temporary-public-storage"
       },
       "collect": {
         "staticDistDir": "./dist"
       },
       "assert": {
         "preset": "lighthouse:recommended"
       }
     }
   }
   ```

3. **Run Lighthouse CI:**
   ```bash
   npm run build
   lhci autorun
   ```

## Troubleshooting

### Build Errors

**SWC Plugin Not Found**
```bash
npm install --save-dev @vitejs/plugin-react-swc
```

**Compression Plugin Errors**
```bash
npm install --save-dev vite-plugin-compression
```

### Production Issues

**Chunk Size Too Large**
- Check bundle analysis: `npm run build:analyze`
- Ensure code splitting is working
- Verify lazy components are used

**API Cache Not Working**
- Check that `optimizedApi` is imported
- Verify session ID is set
- Cache only works with identical positions (6 decimal tolerance)

**Lazy Components Not Loading**
- Verify `Suspense` boundaries are in place
- Check console for import errors
- Ensure imports are correct paths

## Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Initial Bundle Size | < 150KB | Bundle analysis |
| Time to Interactive | < 3s | Lighthouse |
| Lighthouse Performance | > 90 | Lighthouse CI |
| API Cache Hit Rate | > 70% | backend cache stats |
| Batch API Savings | > 70% fewer requests | Compare vs individual calls |

## Version History

- **v1.0** - Base implementation
- **v2.0** - Added batch API
- **v3.0** - Frontend optimizations (caching, lazy loading)
- **v4.0** - Build optimization (SWC, compression, code splitting)

## Support

For questions or issues:
1. Check [`OPTIMIZATION.md`](robot-analyzer/frontend/OPTIMIZATION.md) for detailed feature documentation
2. Review [`optimization-summary.md`](robot-analyzer/optimization-summary.md) for implementation overview
3. See [`BATCH_API_DOCUMENTATION.md`](robot-analyzer/backend/robot_api/BATCH_API_DOCUMENTATION.md) for batch API details
