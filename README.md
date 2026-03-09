# RegressionBot SDK

The declarative visual regression testing SDK.

## Features

- **Fluent Manifest Builder**: Chainable methods to define your test scope.
- **Matrix Testing**: Test multiple devices and viewports in a single job.
- **Auto-Discovery**: Scan sitemaps with glob patterns and limits.
- **Project-Based Baselines**: Share visual history across different environments (Preview vs Prod).

## Installation

```bash
npm install regressionbot
```

## Usage

### Basic Example

```typescript
import { Visual } from 'regressionbot';

const visual = new Visual();

const job = await visual
  .test('https://preview.myapp.com')
  .forProject('my-app-web')
  .run();

const status = await job.waitForCompletion();
console.log(`Stability Score: ${status.overallScore}/100`);
```

### Full Matrix Example

```typescript
import { Visual } from 'regressionbot';

const visual = new Visual(process.env.API_KEY);

const job = await visual
  .test(process.env.VERCEL_PREVIEW_URL)   // The Candidate (Test Origin)
  .against('https://production-app.com')    // The Source of Truth (Base Origin)
  .forProject('marketing-site-v2')          // Context: Links to Baselines & History

  // Matrix Configuration: Run all checks on both Desktop and Mobile
  .on(['Desktop Chrome', 'iPhone 13'])

  // Sitemap: Explicitly provide a sitemap location (optional)
  .sitemap('https://production-app.com/sitemap_index.xml')

  // Scope: Explicitly check critical paths
  .check('/', 'Homepage')
  .check('/pricing', 'Pricing Table')

  // Discovery: Auto-discover up to 20 blog posts
  .scan('/blog/**', { limit: 20 })
  
  // Concurrency: Max parallel browser instances
  .concurrency(10)

  // Masking: Automatic and manual masking
  .mask(['.ads', '#modal']) // Manual selectors
  // Tip: Adding 'data-vr-mask' to your HTML elements masks them automatically!

  // Execute: Compiles manifest and triggers the API
  .run();

const result = await job.waitForCompletion();
const summary = await job.getSummary();

console.log(`Job ${job.jobId} finished. Overall Score: ${summary.overallScore}`);
```

## CLI Usage

The `regressionbot` CLI is the easiest way to interact with the API from your terminal or CI scripts.

## Examples & Integrations

Check out the [examples/](./examples/) directory for real-world integration guides:
- [GitHub Actions](./examples/actions/regressionbot/): Self-contained composite action for CI.
- [Preview vs Production](./examples/workflows/workflow-preview-vs-prod.yml): Compare staging URLs to live sites.
- [AWS Amplify](./examples/workflows/platform-amplify.yml): Wait for builds and test dynamically.
- [Scheduled Health Checks](./examples/workflows/daily-health-check.yml): Monitor production visuals daily.

### Authentication

The CLI looks for the following environment variables:
- `REGRESSIONBOT_API_KEY`: Your project API key.
- `REGRESSIONBOT_API_URL`: (Optional) Override the default API endpoint.

### Commands

#### 1. Quick Check
Test a single URL against its established baseline.
```bash
npx regressionbot https://example.com --project my-site --on "Desktop Chrome, iPhone 12"
```

#### 2. Sitemap Scan
Test an entire site using glob patterns.
```bash
npx regressionbot https://example.com --scan "/**" --exclude "/admin/**" --concurrency 20
```

### Job Summary
Get detailed results and diff URLs for a completed job.
```bash
npx regressionbot summary <jobId>
```

Add the `--download` flag to save the diff images locally:
```bash
npx regressionbot summary <jobId> --download
```

Use the `--download-full` flag to save baseline, current, and diff images:
```bash
npx regressionbot summary <jobId> --download-full
```

#### 4. Approve Changes
Promote the current screenshots of a job to be the new baselines.
```bash
npx regressionbot approve <jobId>
```

## SDK Usage (Fluent API)

### Basic Example
```typescript
import { Visual } from 'regressionbot';

const visual = new Visual();

const job = await visual
  .test('https://preview.myapp.com')
  .forProject('my-app-web')
  .run();

const status = await job.waitForCompletion();
console.log(`Stability Score: ${status.overallScore}/100`);

// Download only diff images
await job.downloadResults();

// Download all images (baseline, current, diff)
await job.downloadResults({ full: true });
```

## Development

### Versioning

```bash
npm version patch # or minor/major
npm publish
```