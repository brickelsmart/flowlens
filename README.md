# FlowLens — UX Flow Analyser

Upload Figma screens and get instant horizontal Mermaid UX flowcharts, powered by Claude AI.

---

## Project Structure

```
flowlens/
├── netlify/
│   └── functions/
│       └── analyse.js        # Secure API proxy (keeps your key server-side)
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx
│   └── App.jsx               # Main React app
├── index.html
├── netlify.toml              # Netlify build + redirect config
├── package.json
└── vite.config.js
```

---

## Deploy to Netlify

### Step 1 — Get your Anthropic API key

1. Go to https://console.anthropic.com
2. Navigate to **API Keys**
3. Create a new key and copy it

### Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/flowlens.git
git push -u origin main
```

### Step 3 — Connect to Netlify

1. Go to https://app.netlify.com
2. Click **Add new site → Import an existing project**
3. Connect your GitHub account and select the `flowlens` repo
4. Build settings will be auto-detected from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy site**

### Step 4 — Add your API key as an environment variable

1. In your Netlify dashboard go to **Site configuration → Environment variables**
2. Click **Add a variable**
3. Set:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key
4. Click **Save**
5. Go to **Deploys** and click **Trigger deploy → Deploy site**

Your site is now live and your API key is secure server-side.

---

## Run Locally

```bash
# Install dependencies
npm install

# Install Netlify CLI globally (needed to run functions locally)
npm install -g netlify-cli

# Create a .env file with your key
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Start local dev server (runs both Vite and Netlify Functions)
netlify dev
```

The app will be available at http://localhost:8888

---

## How It Works

1. You upload Figma screenshots in the browser
2. The frontend sends images + prompt to `/api/analyse`
3. The Netlify Function at `netlify/functions/analyse.js` receives the request
4. It attaches your `ANTHROPIC_API_KEY` from environment variables server-side
5. It forwards the request to the Anthropic API
6. The Mermaid code is returned and rendered as a visual chart

Your API key is **never exposed** to the browser or in your source code.

---

## Features

- Upload screens by drag-and-drop, file browser, or clipboard paste
- Generates horizontal `flowchart LR` Mermaid diagrams
- Follows Pandar naming conventions (CTA:, Link:, screen nouns)
- All nodes rendered as rectangles
- Side-by-side Visual Chart and Mermaid Code panels
- Zoom controls on the chart
- Copy Mermaid code to clipboard
- Export chart as PNG
- Session sidebar to switch between multiple flows
