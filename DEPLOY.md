# Quick Deployment Guide for GitHub Pages

## Step 1: Update Repository Name (if needed)

If your GitHub repository name is NOT `exam-simulator-app`, you need to update the base path:

**Option A: Using environment variable (Recommended)**
1. Create a `.env` file in the root directory
2. Add: `VITE_REPO_NAME=your-actual-repo-name`

**Option B: Edit vite.config.ts directly**
- Change `'exam-simulator-app'` to your repository name on line 7

## Step 2: Commit and Push Changes

```bash
git add .
git commit -m "Configure for GitHub Pages deployment"
git push origin main
```

## Step 3: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **GitHub Actions**
4. Save the settings

## Step 4: Wait for Deployment

- GitHub Actions will automatically build and deploy your app
- Check the **Actions** tab in your repository to see the deployment progress
- Once complete, your app will be available at:
  `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## Troubleshooting

- If the app doesn't load, check that the base path in `vite.config.ts` matches your repository name
- Check the Actions tab for any build errors
- Make sure GitHub Pages is enabled in repository settings
