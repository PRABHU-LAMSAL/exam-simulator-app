# GitHub Pages Deployment Guide

## Quick Start

1. **Create a GitHub repository** (if you haven't already)

2. **Push your code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repository → **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - Save

4. **Update repository name** (if needed):
   - Open `.github/workflows/deploy.yml`
   - Find: `VITE_BASE: /${{ github.event.repository.name }}/`
   - This automatically uses your repository name
   - If you want a custom path, change it manually

5. **Trigger deployment:**
   - Push any change to `main` branch, OR
   - Go to **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

## Your Site URL

After deployment, your site will be available at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

## Custom Domain (Optional)

1. Add a `CNAME` file in the `public` folder (create it if it doesn't exist)
2. Add your domain name in the file
3. Configure DNS settings as per GitHub Pages documentation

## Troubleshooting

### 404 Errors
- Make sure the base path in `vite.config.ts` matches your repository name
- Check that `.nojekyll` file exists in the root

### Build Fails
- Check GitHub Actions logs in the **Actions** tab
- Ensure all dependencies are in `package.json`

### Site Not Updating
- Clear browser cache
- Wait a few minutes for GitHub Pages to update
- Check Actions tab to ensure deployment completed

## Manual Deployment (Alternative)

If you prefer not to use GitHub Actions:

1. Update `vite.config.ts`:
   ```typescript
   base: '/YOUR_REPO_NAME/',
   ```

2. Build:
   ```bash
   npm run build
   ```

3. Install `gh-pages`:
   ```bash
   npm install --save-dev gh-pages
   ```

4. Add to `package.json` scripts:
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```

5. Deploy:
   ```bash
   npm run deploy
   ```
