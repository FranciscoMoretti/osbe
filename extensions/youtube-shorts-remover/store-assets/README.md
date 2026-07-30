# Chrome Web Store Assets

- `store-icon-128.png` is generated from `../assets/icon-source.svg` by `pnpm extension assets youtube-shorts-remover`. Replace the neutral inner mark before release; do not edit this PNG independently.
- `screenshots/` must contain real 1280×800 product screenshots without alpha.
- `chrome-web-store-listing.md` is a generated, copy-ready dashboard dossier. Edit `extension.config.json`, then run `pnpm extension store-dossier youtube-shorts-remover`; do not edit the dossier directly.
- `extension.config.json` lists each screenshot and promotional tile. A screenshot with a `source` is framed by the shared asset pipeline; a promo tile must declare `kind: "small"` or `kind: "marquee"`.
