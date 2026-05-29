# 🚀 Universal Guide: Deploying Vite React Projects to GitHub Pages

This guide provides a copy-pasteable configuration and step-by-step procedure to deploy any Vite + React + TypeScript application to **GitHub Pages** (fully static, zero-cost web hosting). It incorporates solutions to common pitfalls, such as Node.js runner deprecation warnings and missing package lock files.

---

## 📋 Pre-requisites

### 1. Configure base path in `vite.config.ts`
Vite needs to know that it is being served under a relative directory structure (since GitHub Pages feeds files out of `https://<username>.github.io/<repository-name>/`).

Ensure your `vite.config.ts` has the `base` attribute configured to use relative paths `'./'`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // or your CSS plugin

export default defineConfig(() => {
  return {
    base: './', // 👈 CRITICAL: Ensures assets are linked relatively!
    plugins: [react(), tailwindcss()],
    // Other config...
  };
});
```

---

## 🛠️ The Ultimate GitHub Actions Workflow (`deploy.yml`)

Create a deployment workflow file in your project under `.github/workflows/deploy.yml`. 

This template is fully optimized to avoid Node 20 deprecation warnings by forcing Node 24 support and dynamically falls back to standard `npm install` if a lockfile is not committed:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main", "master"] # 👈 Triggers on push to main or master

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment to prevent race conditions
concurrency:
  group: "pages"
  cancel-in-progress: true

env:
  # ⚡ Opt-in to Node 24 runners early to prevent Node 20 deprecation warnings!
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24 # 👈 Uses modern Node 24 standard

      - name: Install dependencies
        run: |
          if [ -f package-lock.json ]; then
            npm ci
          else
            npm install
          fi

      - name: Build Application
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist' # 👈 Points to Vite's output build directory

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 👣 Step-by-Step Deployment Instructions

For your next application, follow these checklist steps to push your repository to public hosting:

### Step 1: Upload the Code to GitHub
Open your project directory in terminal and execute:
```bash
git init
git add .
git commit -m "Initial commit for static tracker"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 2: Enable GitHub Actions Permissions
1. Navigate to your project repository on **GitHub**.
2. Click **Settings** (top tabs bar).
3. On the left sidebar menu, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment** -> **Source**, click the dropdown and change it from *Deploy from a branch* to **GitHub Actions**.

### Step 3: Trigger the Build!
Every time you `git push` to your main/master branch, GitHub will automatically spin up an isolated runner, install dependencies, compile your React elements, and deploy the production-ready `dist` folder to your free live site!

The deployed live URL will be visible on the **Pages** tab or under your repository's **Github Actions** pipeline logs.
