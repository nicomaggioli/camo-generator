// A neutral sample mark so the canvas isn't empty before the user uploads a logo.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<path d="M200 30 L250 150 L380 160 L280 245 L315 370 L200 300 L85 370 L120 245 L20 160 L150 150 Z" fill="#7a8a4a"/>
<path d="M200 105 L228 175 L300 180 L245 228 L265 300 L200 262 L135 300 L155 228 L100 180 L172 175 Z" fill="#3e4a24"/>
</svg>`;
export const DEMO_LOGO_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
