import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generate() {
  const svgPath = path.resolve('public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');

  // 2. 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');

  // 3. 180x180 Apple Touch Icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  // 4. Maskable 512x512 (with safe zone padding for Android circular / squircle masks)
  const maskableSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="harmBg2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090D16"/>
        <stop offset="50%" stop-color="#1E1B4B"/>
        <stop offset="100%" stop-color="#064E3B"/>
      </linearGradient>
      <linearGradient id="harmLeftGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#1D4ED8"/>
        <stop offset="50%" stop-color="#4F46E5"/>
        <stop offset="100%" stop-color="#818CF8"/>
      </linearGradient>
      <linearGradient id="harmRightGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#047857"/>
        <stop offset="50%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#34D399"/>
      </linearGradient>
      <radialGradient id="harmCoreGrad2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FEF08A"/>
        <stop offset="35%" stop-color="#FBBF24"/>
        <stop offset="70%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#D97706"/>
      </radialGradient>
      <filter id="harmGlow2" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="10" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <!-- Full bleed background for maskable icon -->
    <rect width="512" height="512" fill="url(#harmBg2)"/>
    
    <!-- Central Icon scaled inside 80% safe zone -->
    <g transform="translate(64, 64) scale(0.75)">
      <circle cx="256" cy="248" r="110" fill="#4F46E5" opacity="0.14" filter="url(#harmGlow2)"/>
      <path d="M 132 366 C 132 290, 160 215, 238 128 C 246 119, 252 113, 256 108 C 256 122, 248 140, 234 162 C 188 234, 180 286, 180 348 C 180 366, 164 376, 148 376 C 138 376, 132 372, 132 366 Z" fill="url(#harmLeftGrad2)"/>
      <path d="M 380 366 C 380 290, 352 215, 274 128 C 266 119, 260 113, 256 108 C 256 122, 264 140, 278 162 C 324 234, 332 286, 332 348 C 332 366, 348 376, 364 376 C 374 376, 380 372, 380 366 Z" fill="url(#harmRightGrad2)"/>
      <path d="M 256 94 L 278 122 C 264 128, 248 128, 234 122 Z" fill="#FFFFFF" opacity="0.95"/>
      <circle cx="256" cy="268" r="30" fill="#F59E0B" opacity="0.28" filter="url(#harmGlow2)"/>
      <path d="M 256 216 Q 256 268 204 268 Q 256 268 256 320 Q 256 268 308 268 Q 256 268 256 216 Z" fill="url(#harmCoreGrad2)"/>
      <circle cx="256" cy="268" r="8" fill="#FFFFFF" opacity="0.95"/>
      <ellipse cx="256" cy="386" rx="42" ry="7" fill="#10B981" opacity="0.22"/>
    </g>
  </svg>`;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile('public/pwa-maskable-512x512.png');

  console.log('All PWA icons generated successfully!');
}

generate().catch(console.error);
