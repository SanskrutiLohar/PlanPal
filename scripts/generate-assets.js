import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const imgDir = path.resolve('public/images');

if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

// 1. Generate favicon PNGs
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="10" fill="#7A1F2B"/>
  <text x="32" y="46" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="700" fill="#F6F0E6">P</text>
</svg>`;

async function run() {
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32.png'));

  await sharp(Buffer.from(faviconSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Favicons generated.');

  // 2. Generate 3 warm-toned high quality visual assets (SVG rendered to WebP)
  // Palette: #F6F0E6, #FCF9F3, #EFE6D8, #DDD0BD, #5A3E2B, #7A1F2B, #B88E6B, #D9BFA0, #4F6B3A, #A8641A
  
  // Wedding Setup: Brass lamps, marigold garlands, earthen diyas, warm stone steps
  const weddingSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <defs>
      <radialGradient id="warmLight" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#FCF9F3" stop-opacity="1"/>
        <stop offset="60%" stop-color="#EFE6D8" stop-opacity="1"/>
        <stop offset="100%" stop-color="#DDD0BD" stop-opacity="1"/>
      </radialGradient>
      <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#F6F0E6" stop-opacity="0.9"/>
        <stop offset="50%" stop-color="#D9BFA0" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#B88E6B" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- Background wall and courtyard -->
    <rect width="1200" height="800" fill="url(#warmLight)"/>
    
    <!-- Courtyard stone steps -->
    <path d="M0,520 L1200,520 L1200,800 L0,800 Z" fill="#EFE6D8"/>
    <path d="M0,580 L1200,580 L1200,800 L0,800 Z" fill="#DDD0BD"/>
    <path d="M0,650 L1200,650 L1200,800 L0,800 Z" fill="#CBBBA4"/>
    <path d="M0,720 L1200,720 L1200,800 L0,800 Z" fill="#B88E6B"/>

    <!-- Marigold toran swags across top -->
    <path d="M -50,60 Q 200,180 400,70 Q 600,190 800,70 Q 1000,180 1250,60" fill="none" stroke="#A8641A" stroke-width="14" stroke-dasharray="16,6"/>
    <path d="M -50,90 Q 200,210 400,100 Q 600,220 800,100 Q 1000,210 1250,90" fill="none" stroke="#D9BFA0" stroke-width="12" stroke-dasharray="14,6"/>
    <path d="M -50,120 Q 200,240 400,130 Q 600,250 800,130 Q 1000,240 1250,120" fill="none" stroke="#7A1F2B" stroke-width="8" stroke-dasharray="10,6"/>

    <!-- Brass Urli with floating marigolds & diyas in center foreground -->
    <ellipse cx="600" cy="620" rx="260" ry="85" fill="#5A3E2B"/>
    <ellipse cx="600" cy="615" rx="250" ry="78" fill="#B88E6B"/>
    <ellipse cx="600" cy="610" rx="235" ry="70" fill="#7A1F2B" fill-opacity="0.3"/>
    
    <!-- Water and floating flowers in Urli -->
    <ellipse cx="600" cy="608" rx="230" ry="65" fill="#5A3E2B" fill-opacity="0.7"/>
    <!-- Floating flowers & floating tea lights -->
    <circle cx="530" cy="600" r="18" fill="#A8641A"/>
    <circle cx="530" cy="600" r="10" fill="#D9BFA0"/>
    <circle cx="600" cy="610" r="22" fill="#7A1F2B"/>
    <circle cx="600" cy="610" r="12" fill="#FCF9F3"/>
    <circle cx="670" cy="598" r="19" fill="#A8641A"/>
    <circle cx="670" cy="598" r="10" fill="#D9BFA0"/>
    <circle cx="570" cy="625" r="16" fill="#D9BFA0"/>
    <circle cx="635" cy="624" r="17" fill="#A8641A"/>
    <circle cx="480" cy="605" r="14" fill="#A8641A"/>
    <circle cx="720" cy="606" r="14" fill="#7A1F2B"/>

    <!-- Left Traditional Tall Brass Samai Lamp -->
    <g transform="translate(180, 240)">
      <ellipse cx="60" cy="380" rx="70" ry="22" fill="#5A3E2B"/>
      <ellipse cx="60" cy="375" rx="64" ry="18" fill="#B88E6B"/>
      <rect x="54" y="100" width="12" height="275" fill="#B88E6B"/>
      <!-- Lamp tiers -->
      <ellipse cx="60" cy="240" rx="45" ry="14" fill="#B88E6B"/>
      <ellipse cx="60" cy="160" rx="40" ry="12" fill="#B88E6B"/>
      <ellipse cx="60" cy="80" rx="35" ry="11" fill="#B88E6B"/>
      <!-- Finial -->
      <path d="M50,80 L60,40 L70,80 Z" fill="#5A3E2B"/>
      <!-- Flame glows -->
      <circle cx="60" cy="50" r="30" fill="url(#lampGlow)"/>
      <ellipse cx="60" cy="46" rx="6" ry="12" fill="#FCF9F3"/>
      <ellipse cx="60" cy="48" rx="4" ry="8" fill="#A8641A"/>
    </g>

    <!-- Right Traditional Tall Brass Samai Lamp -->
    <g transform="translate(880, 240)">
      <ellipse cx="60" cy="380" rx="70" ry="22" fill="#5A3E2B"/>
      <ellipse cx="60" cy="375" rx="64" ry="18" fill="#B88E6B"/>
      <rect x="54" y="100" width="12" height="275" fill="#B88E6B"/>
      <!-- Lamp tiers -->
      <ellipse cx="60" cy="240" rx="45" ry="14" fill="#B88E6B"/>
      <ellipse cx="60" cy="160" rx="40" ry="12" fill="#B88E6B"/>
      <ellipse cx="60" cy="80" rx="35" ry="11" fill="#B88E6B"/>
      <!-- Finial -->
      <path d="M50,80 L60,40 L70,80 Z" fill="#5A3E2B"/>
      <!-- Flame glows -->
      <circle cx="60" cy="50" r="30" fill="url(#lampGlow)"/>
      <ellipse cx="60" cy="46" rx="6" ry="12" fill="#FCF9F3"/>
      <ellipse cx="60" cy="48" rx="4" ry="8" fill="#A8641A"/>
    </g>

    <!-- Terracotta Diyas along lower edge -->
    <g transform="translate(320, 680)">
      <ellipse cx="0" cy="15" rx="24" ry="9" fill="#5A3E2B"/>
      <path d="M-24,15 Q0,32 24,15 Q18,0 0,0 Q-18,0 -24,15 Z" fill="#A8641A"/>
      <circle cx="0" cy="-2" r="16" fill="url(#lampGlow)"/>
      <ellipse cx="0" cy="-4" rx="4" ry="8" fill="#FCF9F3"/>
    </g>
    <g transform="translate(880, 680)">
      <ellipse cx="0" cy="15" rx="24" ry="9" fill="#5A3E2B"/>
      <path d="M-24,15 Q0,32 24,15 Q18,0 0,0 Q-18,0 -24,15 Z" fill="#A8641A"/>
      <circle cx="0" cy="-2" r="16" fill="url(#lampGlow)"/>
      <ellipse cx="0" cy="-4" rx="4" ry="8" fill="#FCF9F3"/>
    </g>
  </svg>`;

  // Birthday Setup: Warm wooden dessert table, linen bunting, earthen cake stand, warm lanterns
  const birthdaySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <defs>
      <radialGradient id="bdayGlow" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#FCF9F3" stop-opacity="1"/>
        <stop offset="50%" stop-color="#F6F0E6" stop-opacity="1"/>
        <stop offset="100%" stop-color="#EFE6D8" stop-opacity="1"/>
      </radialGradient>
      <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FCF9F3" stop-opacity="1"/>
        <stop offset="40%" stop-color="#D9BFA0" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#B88E6B" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#bdayGlow)"/>

    <!-- Linen Bunting Flags across top -->
    <path d="M 0,80 Q 300,160 600,100 Q 900,170 1200,90" fill="none" stroke="#DDD0BD" stroke-width="3"/>
    <!-- Triangular flags -->
    <polygon points="60,95 110,98 85,160" fill="#7A1F2B"/>
    <polygon points="140,102 190,108 165,170" fill="#B88E6B"/>
    <polygon points="220,113 270,121 245,183" fill="#D9BFA0"/>
    <polygon points="300,126 350,132 325,195" fill="#4F6B3A"/>
    <polygon points="380,134 430,136 405,198" fill="#A8641A"/>
    <polygon points="460,134 510,131 485,193" fill="#7A1F2B"/>
    <polygon points="540,125 590,118 565,180" fill="#5A3E2B"/>
    <polygon points="620,117 670,117 645,180" fill="#D9BFA0"/>
    <polygon points="700,122 750,130 725,192" fill="#B88E6B"/>
    <polygon points="780,133 830,143 805,205" fill="#4F6B3A"/>
    <polygon points="860,146 910,154 885,216" fill="#A8641A"/>
    <polygon points="940,154 990,153 965,215" fill="#7A1F2B"/>
    <polygon points="1020,146 1070,138 1045,200" fill="#D9BFA0"/>

    <!-- Warm Fairy lights string -->
    <g>
      <circle cx="100" cy="190" r="15" fill="url(#bulbGlow)"/>
      <circle cx="100" cy="190" r="5" fill="#FCF9F3"/>
      <circle cx="280" cy="210" r="15" fill="url(#bulbGlow)"/>
      <circle cx="280" cy="210" r="5" fill="#FCF9F3"/>
      <circle cx="480" cy="220" r="15" fill="url(#bulbGlow)"/>
      <circle cx="480" cy="220" r="5" fill="#FCF9F3"/>
      <circle cx="700" cy="220" r="15" fill="url(#bulbGlow)"/>
      <circle cx="700" cy="220" r="5" fill="#FCF9F3"/>
      <circle cx="920" cy="230" r="15" fill="url(#bulbGlow)"/>
      <circle cx="920" cy="230" r="5" fill="#FCF9F3"/>
      <circle cx="1100" cy="210" r="15" fill="url(#bulbGlow)"/>
      <circle cx="1100" cy="210" r="5" fill="#FCF9F3"/>
    </g>

    <!-- Wooden Dessert Table -->
    <rect x="150" y="440" width="900" height="40" fill="#5A3E2B" rx="4"/>
    <rect x="200" y="480" width="35" height="320" fill="#5A3E2B"/>
    <rect x="965" y="480" width="35" height="320" fill="#5A3E2B"/>
    <!-- Table Runner -->
    <rect x="420" y="440" width="360" height="360" fill="#FCF9F3"/>
    <line x1="420" y1="440" x2="420" y2="800" stroke="#DDD0BD" stroke-width="2"/>
    <line x1="780" y1="440" x2="780" y2="800" stroke="#DDD0BD" stroke-width="2"/>

    <!-- Cake Stand in center -->
    <ellipse cx="600" cy="430" rx="140" ry="30" fill="#DDD0BD"/>
    <rect x="585" y="380" width="30" height="50" fill="#B88E6B"/>
    <ellipse cx="600" cy="380" rx="130" ry="26" fill="#EFE6D8"/>
    
    <!-- Celebration Two-Tier Birthday Cake with Warm Icing -->
    <rect x="495" y="270" width="210" height="100" fill="#FCF9F3" rx="8"/>
    <ellipse cx="600" cy="270" rx="105" ry="20" fill="#FCF9F3"/>
    <rect x="525" y="190" width="150" height="80" fill="#F6F0E6" rx="6"/>
    <ellipse cx="600" cy="190" rx="75" ry="16" fill="#F6F0E6"/>
    <!-- Marzipan ribbon border on cake -->
    <path d="M495,360 Q600,380 705,360" stroke="#B88E6B" stroke-width="6" fill="none"/>
    <path d="M525,260 Q600,275 675,260" stroke="#B88E6B" stroke-width="5" fill="none"/>
    
    <!-- Single tall celebration candle -->
    <rect x="597" y="130" width="6" height="55" fill="#7A1F2B" rx="2"/>
    <circle cx="600" cy="120" r="22" fill="url(#bulbGlow)"/>
    <ellipse cx="600" cy="116" rx="5" ry="11" fill="#FCF9F3"/>
    <ellipse cx="600" cy="119" rx="3" ry="6" fill="#A8641A"/>

    <!-- Return gift bags and brass bowls on sides -->
    <g transform="translate(240, 360)">
      <rect x="0" y="20" width="70" height="60" fill="#B88E6B" rx="4"/>
      <path d="M15,20 C15,-5 55,-5 55,20" stroke="#5A3E2B" stroke-width="4" fill="none"/>
      <rect x="85" y="30" width="65" height="50" fill="#7A1F2B" rx="4"/>
      <path d="M100,30 C100,10 135,10 135,30" stroke="#FCF9F3" stroke-width="4" fill="none"/>
    </g>
    <g transform="translate(830, 370)">
      <ellipse cx="60" cy="65" rx="55" ry="18" fill="#5A3E2B"/>
      <ellipse cx="60" cy="60" rx="50" ry="15" fill="#D9BFA0"/>
      <!-- Laddu / mithai stack -->
      <circle cx="45" cy="52" r="12" fill="#A8641A"/>
      <circle cx="72" cy="51" r="12" fill="#A8641A"/>
      <circle cx="58" cy="40" r="12" fill="#A8641A"/>
    </g>
  </svg>`;

  // Community Setup: Traditional community hall courtyard, floral rangoli, brass urlis, warm lanterns
  const communitySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <defs>
      <radialGradient id="commGlow" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="#FCF9F3" stop-opacity="1"/>
        <stop offset="60%" stop-color="#F6F0E6" stop-opacity="1"/>
        <stop offset="100%" stop-color="#DDD0BD" stop-opacity="1"/>
      </radialGradient>
      <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FCF9F3" stop-opacity="1"/>
        <stop offset="45%" stop-color="#D9BFA0" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#B88E6B" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#commGlow)"/>

    <!-- Pillars / Colonnade of Community Hall -->
    <rect x="0" y="0" width="1200" height="90" fill="#5A3E2B"/>
    <rect x="80" y="90" width="70" height="480" fill="#EFE6D8"/>
    <rect x="75" y="80" width="80" height="20" fill="#DDD0BD" rx="2"/>
    <rect x="75" y="550" width="80" height="30" fill="#DDD0BD" rx="2"/>

    <rect x="1050" y="90" width="70" height="480" fill="#EFE6D8"/>
    <rect x="1045" y="80" width="80" height="20" fill="#DDD0BD" rx="2"/>
    <rect x="1045" y="550" width="80" height="30" fill="#DDD0BD" rx="2"/>

    <!-- Hanging Brass Kandeel / Lanterns -->
    <g transform="translate(300, 90)">
      <line x1="0" y1="0" x2="0" y2="100" stroke="#5A3E2B" stroke-width="3"/>
      <polygon points="-30,100 30,100 45,150 -45,150" fill="#B88E6B"/>
      <polygon points="-45,150 45,150 25,200 -25,200" fill="#7A1F2B"/>
      <circle cx="0" cy="150" r="45" fill="url(#lanternGlow)"/>
    </g>
    <g transform="translate(900, 90)">
      <line x1="0" y1="0" x2="0" y2="100" stroke="#5A3E2B" stroke-width="3"/>
      <polygon points="-30,100 30,100 45,150 -45,150" fill="#B88E6B"/>
      <polygon points="-45,150 45,150 25,200 -25,200" fill="#7A1F2B"/>
      <circle cx="0" cy="150" r="45" fill="url(#lanternGlow)"/>
    </g>

    <!-- Large Floral Rangoli on Courtyard Floor -->
    <g transform="translate(600, 560)">
      <ellipse cx="0" cy="0" rx="380" ry="150" fill="#EFE6D8"/>
      <!-- Outer petal ring -->
      <ellipse cx="0" cy="0" rx="350" ry="135" fill="none" stroke="#A8641A" stroke-width="12" stroke-dasharray="24,10"/>
      <ellipse cx="0" cy="0" rx="300" ry="115" fill="none" stroke="#7A1F2B" stroke-width="16" stroke-dasharray="28,12"/>
      <ellipse cx="0" cy="0" rx="240" ry="92" fill="#D9BFA0"/>
      <ellipse cx="0" cy="0" rx="190" ry="72" fill="#4F6B3A"/>
      <ellipse cx="0" cy="0" rx="140" ry="52" fill="#A8641A"/>
      <ellipse cx="0" cy="0" rx="90" ry="34" fill="#FCF9F3"/>
      
      <!-- Central Brass Diya lamp -->
      <ellipse cx="0" cy="-5" rx="40" ry="15" fill="#5A3E2B"/>
      <ellipse cx="0" cy="-8" rx="34" ry="12" fill="#B88E6B"/>
      <circle cx="0" cy="-18" r="30" fill="url(#lanternGlow)"/>
      <ellipse cx="0" cy="-22" rx="5" ry="12" fill="#FCF9F3"/>
      <ellipse cx="0" cy="-20" rx="3" ry="7" fill="#A8641A"/>
    </g>
  </svg>`;

  // Convert SVG templates into compressed WebP (max width 1200px, quality 85, < 150KB)
  await sharp(Buffer.from(weddingSvg))
    .webp({ quality: 85 })
    .toFile(path.join(imgDir, 'wedding-setup.webp'));

  await sharp(Buffer.from(weddingSvg))
    .resize(600)
    .webp({ quality: 85 })
    .toFile(path.join(imgDir, 'wedding-setup-600.webp'));

  await sharp(Buffer.from(birthdaySvg))
    .webp({ quality: 85 })
    .toFile(path.join(imgDir, 'birthday-setup.webp'));

  await sharp(Buffer.from(birthdaySvg))
    .resize(600)
    .webp({ quality: 85 })
    .toFile(path.join(imgDir, 'birthday-setup-600.webp'));

  await sharp(Buffer.from(communitySvg))
    .webp({ quality: 85 })
    .toFile(path.join(imgDir, 'community-setup.webp'));

  await sharp(Buffer.from(communitySvg))
    .resize(600)
    .webp({ quality: 85 })
    .toFile(path.join(imgDir, 'community-setup-600.webp'));

  console.log('All WebP images generated and compressed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
