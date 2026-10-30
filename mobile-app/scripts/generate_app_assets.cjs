const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/sharp');

const SOURCE = path.resolve(__dirname, '../../frontend-web/public/assets/new-app-icon.png');
const RES_BASE = path.resolve(__dirname, '../android/app/src/main/res');
const ASSETS_BASE = path.resolve(__dirname, '../assets');
const WEB_ASSETS = path.resolve(__dirname, '../../frontend-web/public/assets');

async function generate() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source icon not found at', SOURCE);
    process.exit(1);
  }
  console.log('Source icon:', SOURCE);

  // 1. Generate mobile-app/assets/icon.png (1024x1024)
  await sharp(SOURCE)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(ASSETS_BASE, 'icon.png'));
  console.log('[OK] assets/icon.png (1024x1024)');

  // 2. Generate mobile-app/assets/adaptive-icon.png (1024x1024 with 66% safe zone padding)
  const safeZone = Math.round(1024 * 0.66);
  const safeOffset = Math.round((1024 - safeZone) / 2);
  const logoInner = await sharp(SOURCE)
    .resize(safeZone, safeZone, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }
  })
    .composite([{ input: logoInner, top: safeOffset, left: safeOffset }])
    .png()
    .toFile(path.join(ASSETS_BASE, 'adaptive-icon.png'));
  console.log('[OK] assets/adaptive-icon.png (1024x1024)');

  // 3. Generate mobile-app/assets/splash-icon.png (512x512)
  await sharp(SOURCE)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(ASSETS_BASE, 'splash-icon.png'));
  console.log('[OK] assets/splash-icon.png (512x512)');

  // 4. Generate mobile-app/assets/favicon.png
  await sharp(SOURCE)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(ASSETS_BASE, 'favicon.png'));
  console.log('[OK] assets/favicon.png (192x192)');

  // 5. Update web assets favicon.PNG for website portfolio
  await sharp(SOURCE)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(WEB_ASSETS, 'favicon.PNG'));
  console.log('[OK] frontend-web/public/assets/favicon.PNG (512x512)');

  // 6. Generate Android native mipmap launcher icons
  const mipmapSizes = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const { dir, size, fgSize } of mipmapSizes) {
    const outDir = path.join(RES_BASE, dir);
    fs.mkdirSync(outDir, { recursive: true });

    // ic_launcher.webp & ic_launcher_round.webp (clean white background with 78% fill)
    const iconFill = Math.round(size * 0.78);
    const iconOffset = Math.round((size - iconFill) / 2);
    const iconLogo = await sharp(SOURCE)
      .resize(iconFill, iconFill, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const launcherBuffer = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      }
    })
      .composite([{ input: iconLogo, top: iconOffset, left: iconOffset }])
      .webp({ quality: 95 })
      .toBuffer();

    fs.writeFileSync(path.join(outDir, 'ic_launcher.webp'), launcherBuffer);
    fs.writeFileSync(path.join(outDir, 'ic_launcher_round.webp'), launcherBuffer);
    console.log(`[OK] ${dir}/ic_launcher.webp & ic_launcher_round.webp (${size}x${size})`);

    // ic_launcher_foreground.webp (transparent background, 66% safe zone fill)
    const fgLogoSize = Math.round(fgSize * 0.66);
    const fgOffset = Math.round((fgSize - fgLogoSize) / 2);
    const fgLogo = await sharp(SOURCE)
      .resize(fgLogoSize, fgLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      }
    })
      .composite([{ input: fgLogo, top: fgOffset, left: fgOffset }])
      .webp({ quality: 95 })
      .toFile(path.join(outDir, 'ic_launcher_foreground.webp'));
    console.log(`[OK] ${dir}/ic_launcher_foreground.webp (${fgSize}x${fgSize})`);
  }

  // 7. Generate Android native splashscreen_logo.png in drawable-*
  const splashSizes = [
    { dir: 'drawable-mdpi', size: 288 },
    { dir: 'drawable-hdpi', size: 432 },
    { dir: 'drawable-xhdpi', size: 576 },
    { dir: 'drawable-xxhdpi', size: 864 },
    { dir: 'drawable-xxxhdpi', size: 1152 },
  ];

  for (const { dir, size } of splashSizes) {
    const outDir = path.join(RES_BASE, dir);
    fs.mkdirSync(outDir, { recursive: true });

    // Splash logo with natural contain
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outDir, 'splashscreen_logo.png'));
    console.log(`[OK] ${dir}/splashscreen_logo.png (${size}x${size})`);
  }

  console.log('\nAll app icon and loading splash assets updated successfully!');
}

generate().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
