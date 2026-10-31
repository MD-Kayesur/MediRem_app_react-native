const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateAllAssets() {
  const inputBuffer = fs.readFileSync('scripts/test-download.png');
  const { data, info } = await sharp(inputBuffer).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // 1. Flood fill to remove only outside background
  const visited = new Uint8Array(width * height);
  const queue = [];

  function isBackground(x, y) {
    const idx = (y * width + x) * channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    return r >= 242 && g >= 242 && b >= 242;
  }

  for (let x = 0; x < width; x++) {
    if (isBackground(x, 0)) { queue.push(x, 0); visited[0 * width + x] = 1; }
    if (isBackground(x, height - 1)) { queue.push(x, height - 1); visited[(height - 1) * width + x] = 1; }
  }
  for (let y = 0; y < height; y++) {
    if (isBackground(0, y)) { queue.push(0, y); visited[y * width + 0] = 1; }
    if (isBackground(width - 1, y)) { queue.push(width - 1, y); visited[y * width + (width - 1)] = 1; }
  }

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];

    const neighbors = [
      [cx + 1, cy], [cx - 1, cy],
      [cx, cy + 1], [cx, cy - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = ny * width + nx;
        if (!visited[nIndex] && isBackground(nx, ny)) {
          visited[nIndex] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }

  const transparentData = Buffer.from(data);
  for (let i = 0; i < width * height; i++) {
    if (visited[i]) {
      transparentData[i * channels + 3] = 0;
    }
  }

  const transparentFullBuffer = await sharp(transparentData, { raw: { width, height, channels } })
    .png()
    .toBuffer();

  const assetsDir = path.resolve('apps/mobile/assets/images');

  // 2. Extract tightly cropped Symbol (Icon without text)
  // Symbol bounds: minX: 232, maxX: 794, minY: 154, maxY: 679
  const symbolBuffer = await sharp(transparentFullBuffer)
    .extract({
      left: 230,
      top: 150,
      width: 566,
      height: 532,
    })
    .toBuffer();

  // Save icon-symbol.png
  await sharp(symbolBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'icon-symbol.png'));
  console.log('✅ Generated icon-symbol.png');

  // 3. Generate android-icon-foreground.png (1024x1024, centered inside 680px safe zone)
  const resizedSymbolForAdaptive = await sharp(symbolBuffer)
    .resize(660, 660, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resizedSymbolForAdaptive,
        top: Math.round((1024 - 660) / 2),
        left: Math.round((1024 - 660) / 2),
      },
    ])
    .png()
    .toFile(path.join(assetsDir, 'android-icon-foreground.png'));
  console.log('✅ Generated android-icon-foreground.png (centered in 108dp safe zone)');

  // 4. Generate splash-icon.png (1024x1024, centered Symbol + Wordmark or clean Symbol)
  // Android 12+ splash screens use a centered circular window (160dp).
  // A clean 600px centered symbol looks stunning and never clips.
  const resizedSymbolForSplash = await sharp(symbolBuffer)
    .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resizedSymbolForSplash,
        top: Math.round((1024 - 600) / 2),
        left: Math.round((1024 - 600) / 2),
      },
    ])
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('✅ Generated splash-icon.png (clean centered splash icon)');

  // 5. Generate icon.png (1024x1024 standard app icon with clean #FFFFFF background)
  const iconSymbolLarge = await sharp(symbolBuffer)
    .resize(760, 760, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: iconSymbolLarge,
        top: Math.round((1024 - 760) / 2),
        left: Math.round((1024 - 760) / 2),
      },
    ])
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✅ Generated icon.png (1024x1024 iOS / Expo main app icon)');

  // 6. Generate medirem-logo.png (Full transparent logo: symbol + wordmark)
  const fullLogoTrimmed = await sharp(transparentFullBuffer)
    .trim({ threshold: 10 })
    .toBuffer();

  await sharp(fullLogoTrimmed)
    .resize(800, 800, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'medirem-logo.png'));
  console.log('✅ Generated medirem-logo.png (transparent full brand logo)');

  // 7. Generate favicon.png
  await sharp(symbolBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✅ Generated favicon.png');

  // 8. Generate android-icon-background.png as clean solid white
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toFile(path.join(assetsDir, 'android-icon-background.png'));
  console.log('✅ Generated android-icon-background.png (clean white background)');

  // 9. Generate android-icon-monochrome.png (monochrome silhouette for Android 13+ themed icons)
  const { data: symData, info: symInfo } = await sharp(symbolBuffer)
    .resize(660, 660, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const monoData = Buffer.alloc(symInfo.width * symInfo.height * 4);
  for (let i = 0; i < symInfo.width * symInfo.height; i++) {
    const alpha = symData[i * 4 + 3];
    if (alpha > 40) {
      monoData[i * 4 + 0] = 0;   // R
      monoData[i * 4 + 1] = 0;   // G
      monoData[i * 4 + 2] = 0;   // B
      monoData[i * 4 + 3] = alpha;
    } else {
      monoData[i * 4 + 3] = 0;
    }
  }

  const monoSymbolBuffer = await sharp(monoData, { raw: symInfo }).png().toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: monoSymbolBuffer,
        top: Math.round((1024 - 660) / 2),
        left: Math.round((1024 - 660) / 2),
      },
    ])
    .png()
    .toFile(path.join(assetsDir, 'android-icon-monochrome.png'));
  console.log('✅ Generated android-icon-monochrome.png (monochrome themed icon)');

  console.log('🎉 ALL ASSETS GENERATED SUCCESSFULLY!');
}

generateAllAssets().catch(console.error);
