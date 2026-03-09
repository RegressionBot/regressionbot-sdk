# RegressionBot GitHub Actions Examples

This directory contains reusable GitHub Actions and sample workflows to integrate **RegressionBot** visual testing into your CI/CD pipeline.

## 📦 Using the NPM Module (Recommended)

You can run RegressionBot directly in your workflows using `npx`, which ensures you are always using the latest version of the CLI.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '20'

  - name: Run Visual Test
    env:
      REGRESSIONBOT_API_KEY: ${{ secrets.REGRESSIONBOT_API_KEY }}
    run: |
      npx regressionbot@latest https://preview-url.com \
        --project "my-project" \
        --on "Desktop Chrome"
```

## 🚀 The Action

Alternatively, you can use our composite action located in `actions/regressionbot` which wraps the CLI commands.

### Usage

```yaml
- uses: regressionbot/actions/regressionbot@v1
  with:
    # Commands: 'check', 'approve', 'status'
    command: 'check' 
    
    # Required for all commands
    api-key: ${{ secrets.REGRESSIONBOT_API_KEY }}
    
    # Required for 'check'
    project: 'my-project-id'
    test-origin: 'https://preview.myapp.com'
    
    # Optional for 'check'
    base-origin: 'https://prod.myapp.com' # Compare against prod
    sitemap-url: 'https://prod.myapp.com/sitemap_index.xml'
    devices: 'Desktop Chrome, iPhone 12'  # Comma-separated
    
    # Sitemap Crawling (Optional)
    scan: '/blog/**'       # Auto-discover pages matching this glob
    exclude: '/blog/drafts/**' # Exclude these patterns
    
    # Required for 'approve' and 'status'
    job-id: 'job-123456'
```

## 📂 workflows/

We provide robust workflow patterns to suit different visual regression strategies.

### 1. Preview vs. Production (`workflow-preview-vs-prod.yml`)
**The "Low Maintenance" Strategy.**
- **How it works:** Compares your PR Preview URL directly against your live Production site.
- **Benefit:** No baseline images to manage. Production is the source of truth.
- **Best for:** Most web applications with stable production environments.

### 2. Managed Baselines (`workflow-managed-baselines.yml`)
**The "Maximum Control" Strategy.**
- **How it works:** Compares your PR Preview URL against "Golden Images" stored in the cloud.
- **Benefit:** Allows you to freeze your UI truth. Changes only become the new baseline after explicit approval.
- **Best for:** Design Systems, highly dynamic sites, or projects requiring strict UI audits.

### 3. ChatOps Approval (`chatops-approval.yml`)
**The Developer Experience Booster.**
- **How it works:** Allows developers to approve visual changes directly from a PR comment (`/approve-visual <job-id>`).
- **Supports:** Works perfectly with the **Managed Baselines** strategy.

### 4. AWS Amplify Platform (`platform-amplify.yml`)
**The Automation Integration.**
- **How it works:** Specifically designed to trigger when the AWS Amplify "Web Preview" check completes.
- **Feature:** Automatically extracts the Preview URL and posts failure summaries back to the PR.

---

## 📦 Installation

### Option 1: Using the NPM Module (Direct)

1.  Copy desired workflows from `examples/workflows/*.yml` to `.github/workflows/`.
2.  Update the workflow steps to use `npx regressionbot` as shown above.
3.  Add `REGRESSIONBOT_API_KEY` to your repository secrets.

### Option 2: Using the Composite Action

1.  Copy the `examples/actions/regressionbot` folder to your repository's `.github/actions/regressionbot`.
2.  Copy desired workflows from `examples/workflows/*.yml` to `.github/workflows/`.
3.  Add `REGRESSIONBOT_API_KEY` to your repository secrets.

### Example Directory Structure (for Option 2)

```text
.github/
├── actions/
│   └── regressionbot/
│       └── action.yml
└── workflows/
    ├── visual-test.yml
    ├── amplify-regression.yml
    └── comment-ops.yml
```
