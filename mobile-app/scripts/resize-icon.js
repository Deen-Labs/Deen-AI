const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = process.argv[2];
const BASE = path.resolve(__dirname, '../android/app/src/main/res');

// How much of the canvas the logo should fill (leaves padding on all sides)
const LAUNCHER_FILL = 0.72;      // 72% for square/round icons (~14% padding each side)
const FOREGROUND_FILL = 0.66;    // 66% for adaptive foreground (Android safe zone)

const sizes = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
];

async function compositeIcon(source, canvasSize, fill, background) {
    const logoSize = Math.round(canvasSize * fill);
    const offset = Math.round((canvasSize - logoSize) / 2);

    const logo = await sharp(source)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

    return sharp({
        create: {
            width: canvasSize,
            height: canvasSize,
            channels: 4,
            background,
        }
    })
        .composite([{ input: logo, top: offset, left: offset }])
        .webp({ quality: 90 });
}

async function run() {
    if (!SOURCE || !fs.existsSync(SOURCE)) {
        console.error('Usage: node scripts/resize-icon.js <path-to-icon.png>');
        process.exit(1);
    }

    for (const { dir, size } of sizes) {
        const outDir = path.join(BASE, dir);
        fs.mkdirSync(outDir, { recursive: true });

        // Square and round launcher icons — dark background, padded logo
        for (const name of ['ic_launcher.webp', 'ic_launcher_round.webp']) {
            await (await compositeIcon(SOURCE, size, LAUNCHER_FILL, { r: 13, g: 35, b: 24, alpha: 255 }))
                .toFile(path.join(outDir, name));
            console.log(`  ✅ ${dir}/${name} (${size}x${size})`);
        }

        // Adaptive foreground — transparent bg, safe zone padding
        const fgSize = Math.round(size * 1.5);
        await (await compositeIcon(SOURCE, fgSize, FOREGROUND_FILL, { r: 0, g: 0, b: 0, alpha: 0 }))
            .toFile(path.join(outDir, 'ic_launcher_foreground.webp'));
        console.log(`  ✅ ${dir}/ic_launcher_foreground.webp (${fgSize}x${fgSize})`);
    }

    console.log('\n🎉 All icon sizes generated successfully!');
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
