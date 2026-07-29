# Chrome Web Store Assets

- `store-icon-128.png` is generated from `../assets/icon-source.svg` by `pnpm extension assets window-resizer`. Replace the neutral inner mark before release; do not edit this PNG independently.
- `screenshots/` must contain real 1280×800 product screenshots without alpha.
- `chrome-web-store-listing.md` contains the dashboard listing copy and permission justifications.
- `extension.config.json` lists each screenshot and promotional tile. A screenshot with a `source` is framed by the shared asset pipeline; a promo tile must declare `kind: "small"` or `kind: "marquee"`.
