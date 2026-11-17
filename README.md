# Camo Generator

A Photoshop-style camouflage pattern generator. Upload one or two logos (PNG, SVG, JPG), remove white backgrounds, and scatter them into seamless tactical camo patterns. Optional AI Auto-Tune uses Claude vision (your own API key, stored only in your browser).

**Live site:** https://nicomaggioli.github.io/camo-generator/

## Features

- **680 built-in patterns**: 85 color themes (military, nature, ocean, sky, neon, pastel, metallic, seasonal, streetwear, retro…) × 8 layouts.
- **Create from words**: type an idea like "sunset" and get a matching palette and layout. Works offline; with a Claude API key it uses Claude for richer results.
- **Vector SVG export** for Adobe Illustrator and manufacturers: logos are traced to smooth outlines, with exact spot colors and a clean seamless tile.
- PNG export up to 8192px, background removal for white-background logos, undo history, and a Photoshop-style workspace.

## Run locally

```bash
npm install
npm run dev
```

Built with React, TypeScript, Vite, Tailwind and the Canvas 2D API.
