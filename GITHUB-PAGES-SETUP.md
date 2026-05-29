# 🚀 Hosting on GitHub Pages (Setup Guide)

This application has been successfully configured to support static site hosting on **GitHub Pages** (which, unlike Google Cloud Run or custom servers, does not run active backend Node.js engines). 

When hosted on GitHub Pages, the application **automatically detects serverless mode** and shifts into a high-fidelity **On-Device Simulation Engine**. This ensures 100% of the UI widgets remain fully active:
* **Interactive Live Quotes**: Stocks and indices fluctuate in real-time in the background.
* **Price Alert Watchdogs**: Browser background monitors listen to simulation feeds and trigger flashes and custom sound alerts.
* **Detailed Historical Charts**: Selecting 1D, 5D, 1M, 1Y, or 3Y period tabs dynamically generates relative historical paths.
* **Grounding News & Dispatches**: Expand any news card to read realistic bureau and technical articles on demand.
* **Client-Side AI Assistant**: The chat assistant remains completely context-aware. If you enter your private **Gemini API key** in the dashboard **Settings Widget**, the assistant can directly execute local client-side research pipelines!

---

## 🛠️ Step-by-Step Setup

Follow these simple instructions to host your tracker on your GitHub profile:

### 1. Download & Export your Code
1. Click the **Settings/Export** menu in the top right of this AI Studio Interface.
2. Select **Export to ZIP** and download the folder to your local machine.
3. Unzip the downloaded folder.

### 2. Create a GitHub Repository
1. Log in to [GitHub](https://github.com).
2. Click **New** (or the **+** in the header) to create a new repository.
3. Choose a descriptive name (e.g., `stock-tracker`).
4. Set permission to **Public**, leave other options unchecked, and click **Create repository**.

### 3. Push the Code to GitHub
Open your terminal inside the unzipped folder and execute the following commands (replace `your-username` and `stock-tracker` with your actual handles):
```bash
# Initialize local git
git init

# Stage all files
git add .

# Commit local changes
git commit -m "Initialize modern stock tracker terminal"

# Rename default branch
git branch -M main

# Link your repository
git remote add origin https://github.com/your-username/stock-tracker.git

# Push code
git push -u origin main
```

### 4. Enable GitHub Pages Actions Deployment
To let GitHub deploy your repository using the automated workflow we created at `.github/workflows/deploy.yml`:
1. In your GitHub repository page, navigate to **Settings** (gear icon in the top tabs bar).
2. On the left sidebar, click **Pages**.
3. Under **Build and deployment** -> **Source**, select **GitHub Actions** from the dropdown list.
4. Push or merge any commit to `main`, and GitHub will automatically compile the Vite client and serve the live link in under a minute! (The deployed URL will appear at the top of the Pages tab under **Live site**).

---

## 🔒 Securing Private Keys
Because GitHub Pages is a public static host, **never hardcode your private API keys in `.env` files**. 

Instead, visitors can configure their own personal Gemini API Key inside the tracker's custom **Settings / Keys Widget** right on the live page. This key remains completely securely isolated inside their local web sandbox (`localStorage`) and is never logged or transmitted anywhere except direct encrypted calls to Google Gemini API servers.
