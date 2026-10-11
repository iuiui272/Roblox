# Roblox Fan Site (unofficial)

A 2018-style Roblox games browser with an Apple-style option. Plain HTML, CSS and JS. No build step.

## Put it on GitHub Pages
1. Create a repo and upload everything in this folder (keep the folders: `css`, `js`, `icons`).
2. Repo **Settings > Pages**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Open `https://YOUR-NAME.github.io/REPO-NAME/`.

## Add to Home Screen (iPhone / iPad)
Open the site in Safari, tap **Share**, then **Add to Home Screen**. The site also shows its own tips banner on iOS (Settings has a "Show steps" button).

## Live data
Game lists come from Roblox through your Cloudflare Worker. Its URL is the only line in `js/config.js`.
If Roblox can't be reached, the site shows the last saved lists, then a built-in snapshot (`js/snapshot.js`).
If Roblox changes an endpoint, the fix lives in `js/api.js`.

## Styles
Settings > Style: **2018 Classic** or **Apple** (sidebar on iPad and desktop, tab bar on iPhone, light/dark/auto). Apple style uses solid surfaces only, no glass or blur.

Unofficial fan project. Not affiliated with Roblox Corporation.
