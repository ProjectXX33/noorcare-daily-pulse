# PWA Icons for NoorHub

## Required Icon Sizes

Place your custom PWA icons in this folder with these exact names:

### Main Icons
- `pwa-icon-512x512.png` - Main app icon (512×512px)
- `pwa-icon-512x512-maskable.png` - Android adaptive icon (512×512px with safe zone)
- `pwa-icon-192x192.png` - Home screen shortcut (192×192px)
- `pwa-icon-180x180.png` - iOS devices (180×180px)
- `pwa-icon-152x152.png` - iPad (152×152px)
- `pwa-icon-144x144.png` - Windows tiles (144×144px)
- `pwa-icon-128x128.png` - Chrome Web Store (128×128px)
- `pwa-icon-120x120.png` - iPhone (120×120px)
- `pwa-icon-96x96.png` - Android launcher (96×96px)
- `pwa-icon-72x72.png` - Small Android launcher (72×72px)
- `pwa-icon-48x48.png` - Notification icon (48×48px)

## Design Guidelines

### Regular Icons (`purpose: "any"`)
- Use your full logo/brand design
- Can include text, complex graphics
- Should look good at all sizes

### Maskable Icons (`purpose: "maskable"`)
- **Important**: Only create `pwa-icon-512x512-maskable.png`
- Place important content in the center 40% (safe zone)
- Android will apply its own shape mask (circle, square, rounded square)
- Use a solid background color
- Avoid text near edges

## Tools to Generate Icons

### Online Tools:
1. **PWA Icon Generator**: https://www.pwabuilder.com/imageGenerator
2. **Favicon.io**: https://favicon.io/favicon-converter/
3. **RealFaviconGenerator**: https://realfavicongenerator.net/

### Manual Creation:
1. Create a 512×512px base design
2. Export/resize to all required sizes
3. For maskable: ensure important content is within center 204×204px area

## Quick Start
1. Design your icon in 512×512px
2. Use an online PWA icon generator
3. Download all sizes
4. Rename files to match the names above
5. Place in this folder

## Current Status
- ✅ Manifest.json configured
- ⏳ Icons needed (currently using placeholder paths)
- ⏳ Replace with your custom designed icons 