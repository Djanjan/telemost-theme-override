import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { desktopThemeSchema, type DesktopTheme } from "../src/schema"

import { readFile } from "node:fs/promises"

async function fileToPngDataUri(filePath: string): Promise<string> {
  const buffer = await readFile(resolve(process.cwd(), filePath))
  const mime = buffer[0] === 0x89 && buffer[1] === 0x50 ? "image/png" : "image/jpeg"
  const base64 = buffer.toString("base64")
  return `data:${mime};base64,${base64}`
}

/**
 * 1. Chat Wallpaper: Cute anime neko girl with twin tails, boba tea, stars & hearts.
 */
function createChatAnimeGirlSvg(isDark: boolean): string {
  const hairColor = isDark ? "#ff69b4" : "#ff77a9"
  const hairDark = isDark ? "#c71585" : "#e04883"
  const eyeColor = isDark ? "#ff1493" : "#e91e63"
  const skinColor = isDark ? "#fff0f5" : "#fff5f8"
  const blushColor = isDark ? "#ff3388" : "#ff6699"
  const bgGradStart = isDark ? "#2a1523" : "#fff0f5"
  const bgGradEnd = isDark ? "#180a14" : "#ffe4ee"
  const accentGold = "#ffd700"

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradStart}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${bgGradEnd}" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${hairColor}"/>
      <stop offset="100%" stop-color="${hairDark}"/>
    </linearGradient>
    <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${eyeColor}"/>
      <stop offset="50%" stop-color="#ba0c56"/>
      <stop offset="100%" stop-color="#590022"/>
    </linearGradient>
    <linearGradient id="bobaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd1dc"/>
      <stop offset="100%" stop-color="#ff9ebb"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Ambience -->
  <rect width="800" height="1000" fill="url(#bgGrad)" />

  <!-- Floating Sakura & Hearts in background -->
  <g opacity="0.65">
    <!-- Hearts -->
    <path d="M120 180 C120 140 160 140 180 165 C200 140 240 140 240 180 C240 230 180 270 180 280 C180 270 120 230 120 180 Z" fill="#ff69b4" opacity="0.4" />
    <path d="M620 260 C620 230 650 230 665 250 C680 230 710 230 710 260 C710 300 665 330 665 340 C665 330 620 300 620 260 Z" fill="#ff85c0" opacity="0.5" />
    <path d="M680 580 C680 560 700 560 710 575 C720 560 740 560 740 580 C740 610 710 630 710 640 C710 630 680 610 680 580 Z" fill="#ff69b4" opacity="0.4" />
    
    <!-- Sparkle Stars -->
    <path d="M220 100 Q220 120 200 120 Q220 120 220 140 Q220 120 240 120 Q220 120 220 100 Z" fill="${accentGold}" filter="url(#glow)"/>
    <path d="M600 140 Q600 160 580 160 Q600 160 600 180 Q600 160 620 160 Q600 160 600 140 Z" fill="${accentGold}" filter="url(#glow)"/>
    <path d="M140 450 Q140 470 120 470 Q140 470 140 490 Q140 470 160 470 Q140 470 140 450 Z" fill="#ffffff" filter="url(#glow)"/>
    <path d="M670 420 Q670 435 655 435 Q670 435 670 450 Q670 435 685 435 Q670 435 670 420 Z" fill="${accentGold}"/>
    
    <!-- Sakura Petals -->
    <path d="M160 300 C180 290 195 310 185 330 C175 350 150 340 150 320 C150 305 155 302 160 300 Z" fill="#ffb6c1" opacity="0.7"/>
    <path d="M610 480 C630 470 645 490 635 510 C625 530 600 520 600 500 C600 485 605 482 610 480 Z" fill="#ffb6c1" opacity="0.7"/>
    <path d="M250 580 C270 570 285 590 275 610 C265 630 240 620 240 600 C240 585 245 582 250 580 Z" fill="#ffb6c1" opacity="0.7"/>
  </g>

  <!-- MAIN CHARACTER GROUP -->
  <g id="anime-girl" transform="translate(150, 180)">
    <!-- Back Hair / Twin Tails -->
    <path d="M-40 280 C-110 320 -150 480 -80 680 C-60 640 -50 560 -40 480 Z" fill="url(#hairGrad)" />
    <path d="M340 280 C410 320 450 480 380 680 C360 640 350 560 340 480 Z" fill="url(#hairGrad)" />
    <path d="M10 240 C-30 380 -60 550 -10 650 C20 540 30 440 40 340 Z" fill="url(#hairGrad)" opacity="0.9"/>
    <path d="M290 240 C330 380 360 550 310 650 C280 540 270 440 260 340 Z" fill="url(#hairGrad)" opacity="0.9"/>

    <!-- Cat Ears (Nekomimi) -->
    <!-- Left Ear -->
    <polygon points="40,160 20,40 100,100" fill="url(#hairGrad)"/>
    <polygon points="45,150 32,58 92,105" fill="#ffb6c1"/>
    <!-- Right Ear -->
    <polygon points="260,160 280,40 200,100" fill="url(#hairGrad)"/>
    <polygon points="255,150 268,58 208,105" fill="#ffb6c1"/>
    <!-- Fluff inside ears -->
    <path d="M36 70 Q55 85 45 105 Q65 100 55 125" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M264 70 Q245 85 255 105 Q235 100 245 125" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>

    <!-- Hair Bows / Ribbons -->
    <!-- Left Ribbon -->
    <circle cx="35" cy="180" r="14" fill="#ff1493"/>
    <path d="M35 180 C15 150 -10 170 20 190 Z" fill="#ff1493"/>
    <path d="M35 180 C15 210 -10 190 20 170 Z" fill="#ff1493"/>
    <path d="M35 180 Q10 240 0 270" stroke="#ff1493" stroke-width="5" fill="none"/>
    <path d="M35 180 Q25 240 20 275" stroke="#ff1493" stroke-width="5" fill="none"/>
    <circle cx="35" cy="180" r="6" fill="${accentGold}"/>

    <!-- Right Ribbon -->
    <circle cx="265" cy="180" r="14" fill="#ff1493"/>
    <path d="M265 180 C285 150 310 170 280 190 Z" fill="#ff1493"/>
    <path d="M265 180 C285 210 310 190 280 170 Z" fill="#ff1493"/>
    <path d="M265 180 Q290 240 300 270" stroke="#ff1493" stroke-width="5" fill="none"/>
    <path d="M265 180 Q275 240 280 275" stroke="#ff1493" stroke-width="5" fill="none"/>
    <circle cx="265" cy="180" r="6" fill="${accentGold}"/>

    <!-- Body & Clothes -->
    <!-- Neck -->
    <rect x="135" y="270" width="30" height="45" fill="${skinColor}" />
    <!-- Collar & Sailor Uniform -->
    <path d="M100 300 L200 300 L220 450 L80 450 Z" fill="#ffffff" />
    <!-- Sailor Collar (Navy/Pink) -->
    <path d="M110 300 L150 360 L190 300 L215 320 L150 400 L85 320 Z" fill="#ff4081" />
    <path d="M115 305 L150 355 L185 305" stroke="#ffffff" stroke-width="3" fill="none"/>
    <!-- Red/Pink Bowtie on chest -->
    <polygon points="150,370 135,355 135,385" fill="#e91e63"/>
    <polygon points="150,370 165,355 165,385" fill="#e91e63"/>
    <circle cx="150" cy="370" r="7" fill="${accentGold}"/>
    <path d="M145 375 L130 420" stroke="#e91e63" stroke-width="6" stroke-linecap="round"/>
    <path d="M155 375 L170 420" stroke="#e91e63" stroke-width="6" stroke-linecap="round"/>

    <!-- Shoulders & Arms -->
    <path d="M80 340 Q50 390 70 480" stroke="${skinColor}" stroke-width="26" stroke-linecap="round" fill="none"/>
    <path d="M220 340 Q250 390 230 480" stroke="${skinColor}" stroke-width="26" stroke-linecap="round" fill="none"/>

    <!-- Boba Tea Cup in Hands -->
    <g transform="translate(125, 430)">
      <path d="M5 0 L45 0 L40 70 L10 70 Z" fill="url(#bobaGrad)" opacity="0.9" rx="4"/>
      <!-- Boba Pearls -->
      <circle cx="18" cy="58" r="5" fill="#4a1525"/>
      <circle cx="30" cy="60" r="5.5" fill="#4a1525"/>
      <circle cx="24" cy="50" r="5" fill="#4a1525"/>
      <circle cx="34" cy="48" r="4.5" fill="#4a1525"/>
      <circle cx="16" cy="45" r="4" fill="#4a1525"/>
      <!-- Straw -->
      <line x1="25" y1="-25" x2="25" y2="40" stroke="#ff4081" stroke-width="6" stroke-linecap="round"/>
      <!-- Lid & Heart print -->
      <rect x="3" y="-3" width="44" height="6" fill="#ffffff" rx="3"/>
      <path d="M20 22 C20 18 23 18 25 20 C27 18 30 18 30 22 C30 26 25 29 25 30 C25 29 20 26 20 22 Z" fill="#ff1493"/>
    </g>

    <!-- Hands holding boba -->
    <circle cx="125" cy="460" r="14" fill="${skinColor}"/>
    <circle cx="175" cy="460" r="14" fill="${skinColor}"/>

    <!-- Head & Face Base -->
    <path d="M70 180 C60 250 80 295 150 295 C220 295 240 250 230 180 C225 120 75 120 70 180 Z" fill="${skinColor}" />

    <!-- Cute Anime Eyes -->
    <!-- Left Eye -->
    <g id="left-eye">
      <!-- Upper Eyelash -->
      <path d="M92 195 Q115 178 135 195" stroke="#2d1322" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M130 188 L138 184" stroke="#2d1322" stroke-width="3.5" stroke-linecap="round"/>
      <!-- Iris -->
      <ellipse cx="114" cy="208" rx="14" ry="19" fill="url(#eyeGrad)"/>
      <!-- Pupil -->
      <ellipse cx="114" cy="211" rx="8" ry="11" fill="#1f0310"/>
      <!-- Catchlights (Sparkles) -->
      <circle cx="109" cy="199" r="6.5" fill="#ffffff"/>
      <circle cx="121" cy="218" r="3.5" fill="#ffffff"/>
      <circle cx="111" cy="220" r="2" fill="#ffffff"/>
      <!-- Star in pupil -->
      <polygon points="114,208 116,213 121,214 117,217 118,222 114,219 110,222 111,217 107,214 112,213" fill="#ff85c0" opacity="0.8"/>
      <!-- Lower Eyelash -->
      <path d="M102 228 Q115 233 128 228" stroke="#2d1322" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <!-- Eyebrow -->
      <path d="M93 175 Q115 162 135 174" stroke="${hairDark}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    </g>

    <!-- Right Eye -->
    <g id="right-eye">
      <!-- Upper Eyelash -->
      <path d="M165 195 Q185 178 208 195" stroke="#2d1322" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M203 188 L211 184" stroke="#2d1322" stroke-width="3.5" stroke-linecap="round"/>
      <!-- Iris -->
      <ellipse cx="186" cy="208" rx="14" ry="19" fill="url(#eyeGrad)"/>
      <!-- Pupil -->
      <ellipse cx="186" cy="211" rx="8" ry="11" fill="#1f0310"/>
      <!-- Catchlights -->
      <circle cx="181" cy="199" r="6.5" fill="#ffffff"/>
      <circle cx="193" cy="218" r="3.5" fill="#ffffff"/>
      <circle cx="183" cy="220" r="2" fill="#ffffff"/>
      <!-- Star in pupil -->
      <polygon points="186,208 188,213 193,214 189,217 190,222 186,219 182,222 183,217 179,214 184,213" fill="#ff85c0" opacity="0.8"/>
      <!-- Lower Eyelash -->
      <path d="M172 228 Q185 233 198 228" stroke="#2d1322" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <!-- Eyebrow -->
      <path d="M165 174 Q185 162 207 175" stroke="${hairDark}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    </g>

    <!-- Blushing Cheeks -->
    <ellipse cx="90" cy="235" rx="18" ry="10" fill="${blushColor}" opacity="0.45"/>
    <line x1="82" y1="232" x2="88" y2="238" stroke="#e91e63" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <line x1="88" y1="232" x2="94" y2="238" stroke="#e91e63" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <line x1="94" y1="232" x2="100" y2="238" stroke="#e91e63" stroke-width="2" stroke-linecap="round" opacity="0.6"/>

    <ellipse cx="210" cy="235" rx="18" ry="10" fill="${blushColor}" opacity="0.45"/>
    <line x1="202" y1="232" x2="208" y2="238" stroke="#e91e63" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <line x1="208" y1="232" x2="214" y2="238" stroke="#e91e63" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <line x1="214" y1="232" x2="220" y2="238" stroke="#e91e63" stroke-width="2" stroke-linecap="round" opacity="0.6"/>

    <!-- Cute Nose & Open Smiling Mouth (with tiny fang) -->
    <circle cx="150" cy="233" r="2.5" fill="#d87093"/>
    
    <!-- Anime Smile with Fang -->
    <path d="M138 248 Q150 268 162 248 Z" fill="#d81b60"/>
    <path d="M141 254 Q150 266 159 254" fill="#ff77a9"/>
    <!-- Tiny Cute Fang -->
    <polygon points="142,248 146,248 144,254" fill="#ffffff"/>
    <path d="M136 247 Q150 252 164 247" stroke="#2d1322" stroke-width="2.5" stroke-linecap="round" fill="none"/>

    <!-- Front Hair / Bangs -->
    <path d="M60 160 C65 100 235 100 240 160 C240 180 230 210 220 225 C215 190 205 170 190 170 C175 195 160 215 150 220 C140 215 125 195 110 170 C95 170 85 190 80 225 C70 210 60 180 60 160 Z" fill="url(#hairGrad)"/>
    <!-- Side Bangs strands -->
    <path d="M68 170 C58 230 65 310 82 340 C75 300 75 250 82 200 Z" fill="url(#hairGrad)"/>
    <path d="M232 170 C242 230 235 310 218 340 C225 300 225 250 218 200 Z" fill="url(#hairGrad)"/>
    
    <!-- Hair Highlights (Kawaii Halo / Ring) -->
    <ellipse cx="150" cy="138" rx="60" ry="12" fill="#ffffff" opacity="0.45" stroke="#ffe4ee" stroke-width="2"/>
    <path d="M100 138 Q150 148 200 138" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.75"/>
    <circle cx="115" cy="138" r="4" fill="#ffffff" filter="url(#glow)"/>
    <circle cx="185" cy="138" r="4" fill="#ffffff" filter="url(#glow)"/>
  </g>

  <!-- Speech bubble "Nyaa~! Telemost Kawaii!" -->
  <g transform="translate(480, 220)">
    <path d="M0 20 C0 5 15 0 35 0 L180 0 C200 0 215 5 215 20 L215 70 C215 85 200 90 180 90 L45 90 L15 115 L25 90 L15 90 C5 90 0 85 0 70 Z" fill="#ffffff" stroke="#ff4081" stroke-width="4" filter="url(#glow)"/>
    <text x="107" y="38" font-family="'Comic Sans MS', 'Arial Rounded MT Bold', sans-serif" font-weight="bold" font-size="20" fill="#e91e63" text-anchor="middle">Nyaa~! ✨</text>
    <text x="107" y="68" font-family="'Comic Sans MS', 'Arial Rounded MT Bold', sans-serif" font-weight="bold" font-size="16" fill="#880e4f" text-anchor="middle">Senpai, daisuki! 💖</text>
  </g>
</svg>`
}

/**
 * 2. Sidebar Anime Chibi Peeking Girl
 */
function createSidebarChibiSvg(isDark: boolean): string {
  const hairColor = isDark ? "#ff69b4" : "#ff77a9"
  const skinColor = isDark ? "#fff0f5" : "#fff5f8"
  const eyeColor = isDark ? "#ff1493" : "#e91e63"

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
  <defs>
    <linearGradient id="chibiHair" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="${hairColor}"/>
      <stop offset="100%" stop-color="#d81b60"/>
    </linearGradient>
  </defs>

  <g transform="translate(30, 40)">
    <!-- Hearts floating above head -->
    <path d="M120 15 C120 -5 140 -5 150 10 C160 -5 180 -5 180 15 C180 35 150 55 150 60 C150 55 120 35 120 15 Z" fill="#ff1493" opacity="0.8"/>
    <path d="M60 40 C60 25 75 25 82 35 C90 25 105 25 105 40 C105 55 82 70 82 75 C82 70 60 55 60 40 Z" fill="#ff69b4" opacity="0.7"/>
    
    <!-- Cat Ears -->
    <polygon points="50,110 30,20 100,70" fill="url(#chibiHair)"/>
    <polygon points="52,100 40,35 90,75" fill="#ffb6c1"/>
    <polygon points="190,110 210,20 140,70" fill="url(#chibiHair)"/>
    <polygon points="188,100 200,35 150,75" fill="#ffb6c1"/>

    <!-- Head -->
    <ellipse cx="120" cy="140" rx="80" ry="70" fill="${skinColor}"/>

    <!-- Eyes (Cute Happy Curved Closed Eyes ^ w ^) -->
    <path d="M70 135 Q90 110 110 135" stroke="#2d1322" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M130 135 Q150 110 170 135" stroke="#2d1322" stroke-width="7" stroke-linecap="round" fill="none"/>
    <circle cx="90" cy="148" r="14" fill="#ff4081" opacity="0.4"/>
    <circle cx="150" cy="148" r="14" fill="#ff4081" opacity="0.4"/>

    <!-- Cute :3 Cat Mouth -->
    <path d="M108 155 Q115 165 120 155 Q125 165 132 155" stroke="#2d1322" stroke-width="4" stroke-linecap="round" fill="none"/>

    <!-- Front Bangs -->
    <path d="M45 120 C50 60 190 60 195 120 C180 95 150 115 140 100 C130 115 100 95 85 120 C75 105 55 110 45 120 Z" fill="url(#chibiHair)"/>

    <!-- Paws peeking over edge -->
    <rect x="50" y="210" width="40" height="35" rx="15" fill="${skinColor}" stroke="#ff80ab" stroke-width="3"/>
    <circle cx="70" cy="225" r="7" fill="#ff4081"/>
    <circle cx="60" cy="216" r="3.5" fill="#ff4081"/>
    <circle cx="70" cy="213" r="3.5" fill="#ff4081"/>
    <circle cx="80" cy="216" r="3.5" fill="#ff4081"/>

    <rect x="150" y="210" width="40" height="35" rx="15" fill="${skinColor}" stroke="#ff80ab" stroke-width="3"/>
    <circle cx="170" cy="225" r="7" fill="#ff4081"/>
    <circle cx="160" cy="216" r="3.5" fill="#ff4081"/>
    <circle cx="170" cy="213" r="3.5" fill="#ff4081"/>
    <circle cx="180" cy="216" r="3.5" fill="#ff4081"/>

    <!-- Cute Tag Text -->
    <rect x="30" y="245" width="180" height="36" rx="18" fill="#ff4081" />
    <text x="120" y="269" font-family="'Comic Sans MS', sans-serif" font-weight="bold" font-size="14" fill="#ffffff" text-anchor="middle">Ganbare, Senpai! 🐾</text>
  </g>
</svg>`
}

/**
 * 3. Video Call Screen Anime Gamer Girl with Headset
 */
function createCallAnimeGirlSvg(isDark: boolean): string {
  const hairColor = isDark ? "#f06292" : "#ff77a9"
  const skinColor = isDark ? "#fff0f5" : "#fff5f8"

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="headsetGrad" x1="0" y1="0" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff4081"/>
      <stop offset="100%" stop-color="#c2185b"/>
    </linearGradient>
    <linearGradient id="callHair" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="${hairColor}"/>
      <stop offset="100%" stop-color="#ad1457"/>
    </linearGradient>
  </defs>

  <g transform="translate(150, 80)">
    <!-- Gamer Cat Ear Headset Band -->
    <path d="M40 180 C30 50 270 50 260 180" stroke="url(#headsetGrad)" stroke-width="18" stroke-linecap="round" fill="none"/>
    <!-- Glowing Cat Ears on Headset -->
    <polygon points="70,95 50,10 120,65" fill="#ff4081"/>
    <polygon points="72,85 58,25 110,65" fill="#00e5ff" opacity="0.9"/>
    <polygon points="230,95 250,10 180,65" fill="#ff4081"/>
    <polygon points="228,85 242,25 190,65" fill="#00e5ff" opacity="0.9"/>

    <!-- Headset Earcups -->
    <rect x="25" y="160" width="30" height="60" rx="15" fill="#ff4081" stroke="#ffffff" stroke-width="3"/>
    <circle cx="40" cy="190" r="8" fill="#00e5ff"/>
    <rect x="245" y="160" width="30" height="60" rx="15" fill="#ff4081" stroke="#ffffff" stroke-width="3"/>
    <circle cx="260" cy="190" r="8" fill="#00e5ff"/>

    <!-- Head & Face -->
    <ellipse cx="150" cy="190" rx="85" ry="80" fill="${skinColor}"/>

    <!-- Eyes (Big Sparkling Anime Eyes with Wink) -->
    <!-- Left Eye (Open Sparkling) -->
    <ellipse cx="110" cy="180" rx="16" ry="22" fill="#e91e63"/>
    <circle cx="104" cy="170" r="7" fill="#ffffff"/>
    <circle cx="118" cy="192" r="4" fill="#ffffff"/>
    <path d="M85 165 Q110 148 135 165" stroke="#2d1322" stroke-width="6" stroke-linecap="round" fill="none"/>
    
    <!-- Right Eye (Playful Wink >_O) -->
    <path d="M165 180 Q185 165 205 185" stroke="#2d1322" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M185 175 L195 165" stroke="#2d1322" stroke-width="4" stroke-linecap="round"/>

    <!-- Blushing Cheeks -->
    <ellipse cx="95" cy="205" rx="16" ry="9" fill="#ff4081" opacity="0.5"/>
    <ellipse cx="205" cy="205" rx="16" ry="9" fill="#ff4081" opacity="0.5"/>

    <!-- Open Happy Smile with cute tongue -->
    <path d="M135 210 Q150 235 165 210 Z" fill="#c2185b"/>
    <circle cx="150" cy="222" r="7" fill="#ff80ab"/>
    <path d="M132 208 Q150 215 168 208" stroke="#2d1322" stroke-width="3" fill="none"/>

    <!-- Hair Bangs -->
    <path d="M65 160 C70 90 230 90 235 160 C210 120 180 150 150 120 C120 150 90 120 65 160 Z" fill="url(#callHair)"/>

    <!-- Headset Microphone -->
    <path d="M35 200 Q40 250 125 240" stroke="#ff4081" stroke-width="6" stroke-linecap="round" fill="none"/>
    <rect x="125" y="232" width="18" height="15" rx="5" fill="#00e5ff"/>

    <!-- Hand doing Peace Sign (V) -->
    <g transform="translate(230, 220)">
      <circle cx="20" cy="40" r="18" fill="${skinColor}"/>
      <rect x="8" y="0" width="10" height="35" rx="5" fill="${skinColor}" stroke="#ff80ab" stroke-width="2"/>
      <rect x="22" y="5" width="10" height="35" rx="5" fill="${skinColor}" stroke="#ff80ab" stroke-width="2"/>
    </g>

    <!-- LIVE / ON AIR Badge -->
    <rect x="80" y="300" width="140" height="35" rx="8" fill="#e91e63"/>
    <circle cx="100" cy="317" r="6" fill="#00e5ff"/>
    <text x="150" y="324" font-family="'Arial Black', sans-serif" font-weight="bold" font-size="14" fill="#ffffff" text-anchor="middle">ON AIR ✨</text>
  </g>
</svg>`
}

/**
 * 4. Home Hub & General Page Anime Girl Greeting
 */
function createHomeAnimeGirlSvg(isDark: boolean): string {
  const hairColor = isDark ? "#ff69b4" : "#ff77a9"
  const skinColor = isDark ? "#fff0f5" : "#fff5f8"

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="homeHair" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="${hairColor}"/>
      <stop offset="100%" stop-color="#c2185b"/>
    </linearGradient>
  </defs>

  <g transform="translate(100, 50)">
    <!-- Giant Sparkles & Hearts -->
    <path d="M50 30 Q50 50 30 50 Q50 50 50 70 Q50 50 70 50 Q50 50 50 30 Z" fill="#ffd700"/>
    <path d="M260 40 Q260 60 240 60 Q260 60 260 80 Q260 60 280 60 Q260 60 260 40 Z" fill="#ffd700"/>
    <path d="M230 15 C230 0 245 0 252 10 C260 0 275 0 275 15 C275 30 252 45 252 50 C252 45 230 30 230 15 Z" fill="#ff4081"/>

    <!-- Cat Ears -->
    <polygon points="60,110 35,20 115,70" fill="url(#homeHair)"/>
    <polygon points="62,100 45,35 105,75" fill="#ffb6c1"/>
    <polygon points="240,110 265,20 185,70" fill="url(#homeHair)"/>
    <polygon points="238,100 255,35 195,75" fill="#ffb6c1"/>

    <!-- Head -->
    <ellipse cx="150" cy="150" rx="90" ry="85" fill="${skinColor}"/>

    <!-- Eyes (Big Happy Anime Eyes) -->
    <ellipse cx="105" cy="140" rx="18" ry="24" fill="#e91e63"/>
    <circle cx="98" cy="130" r="8" fill="#ffffff"/>
    <circle cx="114" cy="152" r="4.5" fill="#ffffff"/>
    <path d="M80 125 Q105 105 130 125" stroke="#2d1322" stroke-width="6" stroke-linecap="round" fill="none"/>

    <ellipse cx="195" cy="140" rx="18" ry="24" fill="#e91e63"/>
    <circle cx="188" cy="130" r="8" fill="#ffffff"/>
    <circle cx="204" cy="152" r="4.5" fill="#ffffff"/>
    <path d="M170 125 Q195 105 220 125" stroke="#2d1322" stroke-width="6" stroke-linecap="round" fill="none"/>

    <!-- Blushing -->
    <ellipse cx="85" cy="170" rx="18" ry="10" fill="#ff4081" opacity="0.5"/>
    <ellipse cx="215" cy="170" rx="18" ry="10" fill="#ff4081" opacity="0.5"/>

    <!-- W Smile (OwO) -->
    <path d="M135 175 Q143 188 150 177 Q157 188 165 175" stroke="#2d1322" stroke-width="4.5" stroke-linecap="round" fill="none"/>

    <!-- Front Bangs with Ribbons -->
    <path d="M55 120 C60 50 240 50 245 120 C220 85 185 120 150 90 C115 120 80 85 55 120 Z" fill="url(#homeHair)"/>
    <circle cx="55" cy="120" r="14" fill="#ff1493"/>
    <circle cx="245" cy="120" r="14" fill="#ff1493"/>

    <!-- Waving Arm -->
    <g transform="translate(240, 160)">
      <path d="M0 40 Q40 0 50 -20" stroke="${skinColor}" stroke-width="26" stroke-linecap="round" fill="none"/>
      <circle cx="55" cy="-25" r="16" fill="${skinColor}"/>
    </g>

    <!-- Welcome Bubble -->
    <rect x="40" y="270" width="220" height="50" rx="25" fill="#ff4081" stroke="#ffffff" stroke-width="3"/>
    <text x="150" y="302" font-family="'Comic Sans MS', sans-serif" font-weight="bold" font-size="16" fill="#ffffff" text-anchor="middle">Okaeri, Senpai! 💖</text>
  </g>
</svg>`
}

/**
 * 5. Peeking Chibi for Compose Bar and Custom Selectors
 */
function createPeekingChibiSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120">
  <defs>
    <linearGradient id="peekHair" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="#ff77a9"/>
      <stop offset="100%" stop-color="#e91e63"/>
    </linearGradient>
  </defs>

  <!-- Cat Ears -->
  <polygon points="40,60 25,10 75,40" fill="url(#peekHair)"/>
  <polygon points="42,55 33,20 68,43" fill="#ffb6c1"/>
  <polygon points="160,60 175,10 125,40" fill="url(#peekHair)"/>
  <polygon points="158,55 167,20 132,43" fill="#ffb6c1"/>

  <!-- Head peeking from bottom -->
  <path d="M30 120 C30 50 170 50 170 120 Z" fill="#fff5f8"/>

  <!-- Big sparkling anime eyes peeking -->
  <ellipse cx="75" cy="85" rx="14" ry="18" fill="#e91e63"/>
  <circle cx="70" cy="78" r="6" fill="#ffffff"/>
  <circle cx="81" cy="94" r="3.5" fill="#ffffff"/>
  <path d="M56 75 Q75 60 94 75" stroke="#2d1322" stroke-width="4.5" stroke-linecap="round" fill="none"/>

  <ellipse cx="125" cy="85" rx="14" ry="18" fill="#e91e63"/>
  <circle cx="120" cy="78" r="6" fill="#ffffff"/>
  <circle cx="131" cy="94" r="3.5" fill="#ffffff"/>
  <path d="M106 75 Q125 60 144 75" stroke="#2d1322" stroke-width="4.5" stroke-linecap="round" fill="none"/>

  <!-- Blushing -->
  <ellipse cx="55" cy="98" rx="12" ry="6" fill="#ff4081" opacity="0.6"/>
  <ellipse cx="145" cy="98" rx="12" ry="6" fill="#ff4081" opacity="0.6"/>

  <!-- Bangs -->
  <path d="M35 80 C40 35 160 35 165 80 C145 60 120 80 100 65 C80 80 55 60 35 80 Z" fill="url(#peekHair)"/>

  <!-- Paws holding edge -->
  <circle cx="45" cy="115" r="12" fill="#fff5f8" stroke="#ff80ab" stroke-width="2"/>
  <circle cx="155" cy="115" r="12" fill="#fff5f8" stroke="#ff80ab" stroke-width="2"/>
</svg>`
}

/**
 * 6. Repeating Kawaii Pattern for App/Page Background
 */
function createKawaiiPatternSvg(isDark: boolean): string {
  const bg = isDark ? "#20121a" : "#fff5f8"
  const heart = isDark ? "#ff4081" : "#f06292"
  const star = "#ffd700"

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="${bg}"/>
  <!-- Chibi Neko Face -->
  <g transform="translate(40, 40)" opacity="0.35">
    <polygon points="10,25 0,0 25,15" fill="${heart}"/>
    <polygon points="50,25 60,0 35,15" fill="${heart}"/>
    <ellipse cx="30" cy="35" rx="25" ry="20" fill="${heart}" opacity="0.4"/>
    <circle cx="20" cy="32" r="3" fill="${heart}"/>
    <circle cx="40" cy="32" r="3" fill="${heart}"/>
    <path d="M26 40 Q30 44 34 40" stroke="${heart}" stroke-width="2" fill="none"/>
  </g>
  <!-- Floating Hearts & Stars -->
  <path d="M140 30 C140 20 150 20 155 25 C160 20 170 20 170 30 C170 40 155 50 155 55 C155 50 140 40 140 30 Z" fill="${heart}" opacity="0.3"/>
  <path d="M40 150 C40 140 50 140 55 145 C60 140 70 140 70 150 C70 160 55 170 55 175 C55 170 40 160 40 150 Z" fill="${heart}" opacity="0.3"/>
  <!-- Sparkles -->
  <path d="M150 140 Q150 150 140 150 Q150 150 150 160 Q150 150 160 150 Q150 150 150 140 Z" fill="${star}" opacity="0.4"/>
  <path d="M90 90 Q90 97 83 97 Q90 97 90 104 Q90 97 97 97 Q90 97 90 90 Z" fill="${star}" opacity="0.3"/>
  <!-- Sakura Petals -->
  <path d="M110 40 C118 35 125 45 120 52 C115 60 105 55 105 48 Z" fill="#ffb6c1" opacity="0.35"/>
  <path d="M160 100 C168 95 175 105 170 112 C165 120 155 115 155 108 Z" fill="#ffb6c1" opacity="0.35"/>
</svg>`
}

async function main(): Promise<void> {
  // High-res PNG anime girl illustrations from assets/anime/
  const chatPngDataUri = await fileToPngDataUri("assets/anime/chat-anime-girl.png")
  const sidebarPngDataUri = await fileToPngDataUri("assets/anime/sidebar-chibi.png")
  const callPngDataUri = await fileToPngDataUri("assets/anime/call-anime-girl.png")
  const homePngDataUri = await fileToPngDataUri("assets/anime/home-anime-girl.png")
  const pagePngDataUri = await fileToPngDataUri("assets/anime/pattern-anime.png")
  const peekingPngDataUri = await fileToPngDataUri("assets/anime/chibi-peeking.png")

  const lightChatDataUri = chatPngDataUri
  const lightSidebarDataUri = sidebarPngDataUri
  const lightCallDataUri = callPngDataUri
  const lightHomeDataUri = homePngDataUri
  const lightPageDataUri = pagePngDataUri
  const peekingChibiDataUri = peekingPngDataUri

  const darkChatDataUri = chatPngDataUri
  const darkSidebarDataUri = sidebarPngDataUri
  const darkCallDataUri = callPngDataUri
  const darkHomeDataUri = homePngDataUri
  const darkPageDataUri = pagePngDataUri

  const theme: DesktopTheme = {
    name: "Anime Waifu Dream & Sakura Pink",
    id: "anime-pink",
    light: {
      seeds: {
        neutral: "#b89da8",
        primary: "#f06292",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#e11d48",
        info: "#f472b6",
        interactive: "#ec729c",
      },
      accentScale: [
        "#fff8fa",
        "#fef0f5",
        "#fce2ec",
        "#f9ccde",
        "#f4accb",
        "#ee8cb6",
        "#ec729c",
        "#d9527f",
        "#bf3b68",
        "#9e2a52",
        "#7e1e3f",
        "#4a0d23",
      ],
      semantic: {
        page: {
          background: "#fff5f8",
          backgroundSecondary: "#fdedf3",
          settingsBackground: "#fff5f8",
          actionbar: "#fdedf3",
          surface: "#ffffff",
          poll: "#fef7fa",
          conversation: "#fff5f8",
        },
        surface: {
          generic: "#ffffff",
          genericHovered: "#fef0f5",
          genericPressed: "#fce2ec",
          genericMedium: "#fdedf3",
          genericMediumHovered: "#fce2ec",
          genericMediumPressed: "#f9ccde",
          genericAlt: "#fffafc",
          disabled: "#f9f0f4",
          inverse: "#4a0d23",
          inverseHovered: "#631532",
          inversePressed: "#7c1c40",
          staticLight: "#ffffff",
          staticHeavy: "#4a0d23",
        },
        elevation: {
          base: "#fff5f8",
          risen: "#ffffff",
          sunken: "#fae8f0",
          overlay: "#ffffff",
          overlayModal: "#ffffff",
          sidebar: "#fdedf3",
        },
        modal: {
          popup: "#ffffff",
          card: "#ffffff",
          cardContrast: "#fff7fa",
        },
        overlay: {
          scrim: "#4a0d2333",
          backdrop: "#4a0d2326",
          background: "#ffffff",
          textPrimary: "#3f1b2b",
          textSecondary: "#7e445b",
        },
        line: {
          generic: "#f3d5e2",
          genericLight: "#fae8f0",
          genericMedium: "#e8bdd1",
          genericHeavy: "#d99cb8",
          divider: "#f3d5e2",
          darkmode: "#e8bdd1",
          compose: "#f3d5e2",
          mainBanner: "#f3d5e2",
          codeBlock: "#f3d5e2",
          joinCallBanner: "#e8bdd1",
          codeIncomingDivider: "#f3d5e2",
          codeOutgoingDivider: "#f3d5e2",
        },
        focus: {
          color: "#ec729c",
          cardOutline: "#ec729c",
        },
        text: {
          primary: "#3f1b2b",
          secondary: "#7e445b",
          tertiary: "#9f677d",
          disabled: "#ccaebc",
          inverse: "#ffffff",
          link: "#d9527f",
          linkHovered: "#bf3b68",
          staticLight: "#ffffff",
          staticHeavy: "#3f1b2b",
        },
        icon: {
          primary: "#7e445b",
          secondary: "#9f677d",
        },
        control: {
          brandSurface: "#ec729c",
          brandSurfaceHovered: "#f06292",
          brandSurfacePressed: "#d9527f",
          brandSurfaceLight: "#fce2ec",
          brandSurfaceLightHovered: "#f9ccde",
          brandSurfaceLightPressed: "#f4accb",
          buttonBrand: "#ec729c",
          buttonBrandHover: "#f06292",
          buttonBrandActive: "#d9527f",
          buttonBrandText: "#ffffff",
          iconButtonPrimary: "#7e445b",
          iconButtonPrimaryHoverBg: "#fce2ec",
          iconButtonAccent: "#ec729c",
          iconButtonAccentHover: "#f06292",
          iconButtonAccentPressed: "#d9527f",
          iconButtonAccentText: "#ffffff",
          messageButtonBackground: "#fce2ec",
          messageButtonBackgroundHovered: "#f9ccde",
          messageButtonText: "#7e1e3f",
          sendButtonDestructive: "#e11d48",
        },
        state: {
          cardHover: "#fef0f5",
          cardActive: "#fce2ec",
          cardDisabled: "#f9f0f4",
          cardNeutralHover: "#fef0f5",
          cardNeutralActive: "#fce2ec",
          cardContrastHover: "#fce2ec",
          cardContrastActive: "#f9ccde",
          listItemActive: "#fce2ec",
        },
        selection: {
          messageRow: "#fef0f5",
          reaction: "#fce2ec",
          calendarCell: "#ec729c",
          segmentedControlChecked: "#ec729c",
        },
        status: {
          dangerText: "#d9527f",
          dangerSurface: "#fef0f5",
          dangerSurfaceHovered: "#fce2ec",
          dangerSurfacePressed: "#f9ccde",
          dangerSurfaceLight: "#fff8fa",
          dangerSurfaceLightHovered: "#fef0f5",
          dangerSurfaceLightPressed: "#fce2ec",
          warningText: "#b45309",
          warningSurface: "#fef3c7",
          warningSurfaceLight: "#fffbeb",
          successText: "#047857",
          successSurface: "#d1fae5",
          successSurfaceLight: "#ecfdf5",
          infoText: "#be185d",
          infoSurface: "#fce7f3",
          infoSurfaceLight: "#fdf2f8",
          neutralText: "#7e445b",
        },
        shadow: {
          color: "#501b2d14",
          brand: "#ec729c33",
          popup: "0 6px 20px rgba(80, 27, 45, 0.08)",
          focusInset: "inset 0 0 0 2px #ec729c",
          focusPrimary: "0 0 0 2px #ec729c",
          card: "0 1px 4px rgba(80, 27, 45, 0.04)",
          cardHover: "0 3px 12px rgba(80, 27, 45, 0.08)",
          cardNeutral: "0 1px 3px rgba(80, 27, 45, 0.03)",
          cardNeutralHover: "0 3px 8px rgba(80, 27, 45, 0.06)",
          cardContrast: "0 2px 6px rgba(80, 27, 45, 0.06)",
          cardContrastHover: "0 4px 14px rgba(80, 27, 45, 0.1)",
          modal: "0 10px 28px rgba(80, 27, 45, 0.12)",
          reactionsPicker: "0 4px 12px rgba(80, 27, 45, 0.08)",
          joinCallBanner: "0 4px 16px rgba(236, 114, 156, 0.2)",
        },
        gradient: {
          messageSkeleton: "linear-gradient(90deg, #fce2ec 25%, #fff5f8 50%, #fce2ec 75%)",
          diskLoading: "linear-gradient(90deg, #ee8cb6 25%, #ec729c 50%, #ee8cb6 75%)",
        },
      },
      backgrounds: {
        chat: {
          image: lightChatDataUri,
          size: "contain",
          position: "bottom right",
          repeat: "no-repeat",
          attachment: "fixed",
          overlay: "rgba(255, 245, 248, 0.72)",
        },
        sidebar: {
          image: lightSidebarDataUri,
          size: "180px auto",
          position: "bottom center",
          repeat: "no-repeat",
          overlay: "rgba(253, 237, 243, 0.88)",
        },
        home: {
          image: lightHomeDataUri,
          size: "contain",
          position: "bottom right",
          repeat: "no-repeat",
          overlay: "rgba(255, 245, 248, 0.75)",
        },
        call: {
          image: lightCallDataUri,
          size: "contain",
          position: "center",
          repeat: "no-repeat",
          overlay: "rgba(255, 245, 248, 0.60)",
        },
        login: {
          image: lightHomeDataUri,
          size: "contain",
          position: "bottom center",
          repeat: "no-repeat",
          overlay: "rgba(255, 245, 248, 0.75)",
        },
        modal: {
          image: peekingChibiDataUri,
          size: "130px auto",
          position: "bottom right",
          repeat: "no-repeat",
          overlay: "rgba(255, 255, 255, 0.90)",
        },
        settings: {
          image: lightHomeDataUri,
          size: "contain",
          position: "bottom right",
          repeat: "no-repeat",
          overlay: "rgba(255, 245, 248, 0.82)",
        },
        page: {
          image: lightPageDataUri,
          size: "auto",
          position: "center",
          repeat: "repeat",
          overlay: "rgba(255, 245, 248, 0.85)",
        },
        custom: [
          {
            selector: ":root .yamb-compose",
            image: peekingChibiDataUri,
            size: "100px auto",
            position: "top right",
            repeat: "no-repeat",
          },
          {
            selector: ":root .yamb-join-call-banner",
            image: lightSidebarDataUri,
            size: "70px auto",
            position: "right center",
            repeat: "no-repeat",
          },
          {
            selector: ":root .yamb-reactions-picker",
            image: peekingChibiDataUri,
            size: "90px auto",
            position: "top right",
            repeat: "no-repeat",
          },
        ],
      },
    },
    dark: {
      seeds: {
        neutral: "#a88697",
        primary: "#f497be",
        success: "#10b981",
        warning: "#fbbf24",
        error: "#f43f5e",
        info: "#f472b6",
        interactive: "#f497be",
      },
      accentScale: [
        "#20121a",
        "#2c1924",
        "#3d2031",
        "#542a42",
        "#733559",
        "#974373",
        "#be5691",
        "#dc6ea9",
        "#f497be",
        "#f9bad5",
        "#fcd8e8",
        "#fff2f7",
      ],
      semantic: {
        page: {
          background: "#20121a",
          backgroundSecondary: "#291823",
          settingsBackground: "#20121a",
          actionbar: "#291823",
          surface: "#36202e",
          poll: "#2e1927",
          conversation: "#20121a",
        },
        surface: {
          generic: "#36202e",
          genericHovered: "#432739",
          genericPressed: "#502f44",
          genericMedium: "#3e2535",
          genericMediumHovered: "#4c2e41",
          genericMediumPressed: "#59374d",
          genericAlt: "#2c1725",
          disabled: "#261320",
          inverse: "#fff2f7",
          inverseHovered: "#fcd8e8",
          inversePressed: "#f9bad5",
          staticLight: "#ffffff",
          staticHeavy: "#20121a",
        },
        elevation: {
          base: "#20121a",
          risen: "#36202e",
          sunken: "#180c13",
          overlay: "#3e2535",
          overlayModal: "#462a3c",
          sidebar: "#291823",
        },
        modal: {
          popup: "#36202e",
          card: "#36202e",
          cardContrast: "#3e2535",
        },
        overlay: {
          scrim: "#00000080",
          backdrop: "#12080e80",
          background: "#36202e",
          textPrimary: "#fff2f7",
          textSecondary: "#e2b4c8",
        },
        line: {
          generic: "#542a42",
          genericLight: "#3e2535",
          genericMedium: "#6d3756",
          genericHeavy: "#8c486f",
          divider: "#542a42",
          darkmode: "#6d3756",
          compose: "#542a42",
          mainBanner: "#6d3756",
          codeBlock: "#542a42",
          joinCallBanner: "#8c486f",
          codeIncomingDivider: "#542a42",
          codeOutgoingDivider: "#542a42",
        },
        focus: {
          color: "#f497be",
          cardOutline: "#f497be",
        },
        text: {
          primary: "#fff2f7",
          secondary: "#e2b4c8",
          tertiary: "#b8829b",
          disabled: "#6e485b",
          inverse: "#20121a",
          link: "#f9bad5",
          linkHovered: "#fcd8e8",
          staticLight: "#ffffff",
          staticHeavy: "#20121a",
        },
        icon: {
          primary: "#fff2f7",
          secondary: "#e2b4c8",
        },
        control: {
          brandSurface: "#d9659b",
          brandSurfaceHovered: "#e877ab",
          brandSurfacePressed: "#c45287",
          brandSurfaceLight: "#432739",
          brandSurfaceLightHovered: "#542a42",
          brandSurfaceLightPressed: "#733559",
          buttonBrand: "#d9659b",
          buttonBrandHover: "#e877ab",
          buttonBrandActive: "#c45287",
          buttonBrandText: "#ffffff",
          iconButtonPrimary: "#fff2f7",
          iconButtonPrimaryHoverBg: "#432739",
          iconButtonAccent: "#f497be",
          iconButtonAccentHover: "#f9bad5",
          iconButtonAccentPressed: "#d9659b",
          iconButtonAccentText: "#ffffff",
          messageButtonBackground: "#432739",
          messageButtonBackgroundHovered: "#502f44",
          messageButtonText: "#fff2f7",
          sendButtonDestructive: "#f43f5e",
        },
        state: {
          cardHover: "#3e2535",
          cardActive: "#4c2e41",
          cardDisabled: "#291823",
          cardNeutralHover: "#3e2535",
          cardNeutralActive: "#4c2e41",
          cardContrastHover: "#4c2e41",
          cardContrastActive: "#59374d",
          listItemActive: "#4c2e41",
        },
        selection: {
          messageRow: "#432739",
          reaction: "#432739",
          calendarCell: "#d9659b",
          segmentedControlChecked: "#d9659b",
        },
        status: {
          dangerText: "#fb7185",
          dangerSurface: "#421625",
          dangerSurfaceHovered: "#551d30",
          dangerSurfacePressed: "#69243c",
          dangerSurfaceLight: "#2d0e19",
          dangerSurfaceLightHovered: "#421625",
          dangerSurfaceLightPressed: "#551d30",
          warningText: "#fcd34d",
          warningSurface: "#3d2806",
          warningSurfaceLight: "#261904",
          successText: "#34d399",
          successSurface: "#0c3622",
          successSurfaceLight: "#072417",
          infoText: "#f472b6",
          infoSurface: "#3d2031",
          infoSurfaceLight: "#261320",
          neutralText: "#e2b4c8",
        },
        shadow: {
          color: "#00000080",
          brand: "#f497be40",
          popup: "0 8px 24px rgba(0, 0, 0, 0.55)",
          focusInset: "inset 0 0 0 2px #f497be",
          focusPrimary: "0 0 0 2px #f497be",
          card: "0 2px 8px rgba(0, 0, 0, 0.4)",
          cardHover: "0 4px 16px rgba(0, 0, 0, 0.5)",
          cardNeutral: "0 2px 6px rgba(0, 0, 0, 0.3)",
          cardNeutralHover: "0 4px 12px rgba(0, 0, 0, 0.4)",
          cardContrast: "0 3px 10px rgba(0, 0, 0, 0.4)",
          cardContrastHover: "0 6px 20px rgba(0, 0, 0, 0.55)",
          modal: "0 12px 32px rgba(0, 0, 0, 0.65)",
          reactionsPicker: "0 4px 16px rgba(0, 0, 0, 0.45)",
          joinCallBanner: "0 4px 16px rgba(244, 151, 190, 0.25)",
        },
        gradient: {
          messageSkeleton: "linear-gradient(90deg, #291823 25%, #3e2535 50%, #291823 75%)",
          diskLoading: "linear-gradient(90deg, #be5691 25%, #f497be 50%, #be5691 75%)",
        },
      },
      backgrounds: {
        chat: {
          image: darkChatDataUri,
          size: "contain",
          position: "bottom right",
          repeat: "no-repeat",
          attachment: "fixed",
          overlay: "rgba(32, 18, 26, 0.70)",
        },
        sidebar: {
          image: darkSidebarDataUri,
          size: "180px auto",
          position: "bottom center",
          repeat: "no-repeat",
          overlay: "rgba(41, 24, 35, 0.88)",
        },
        home: {
          image: darkHomeDataUri,
          size: "contain",
          position: "bottom right",
          repeat: "no-repeat",
          overlay: "rgba(32, 18, 26, 0.75)",
        },
        call: {
          image: darkCallDataUri,
          size: "contain",
          position: "center",
          repeat: "no-repeat",
          overlay: "rgba(32, 18, 26, 0.60)",
        },
        login: {
          image: darkHomeDataUri,
          size: "contain",
          position: "bottom center",
          repeat: "no-repeat",
          overlay: "rgba(32, 18, 26, 0.75)",
        },
        modal: {
          image: peekingChibiDataUri,
          size: "130px auto",
          position: "bottom right",
          repeat: "no-repeat",
          overlay: "rgba(54, 32, 46, 0.90)",
        },
        settings: {
          image: darkHomeDataUri,
          size: "contain",
          position: "bottom right",
          repeat: "no-repeat",
          overlay: "rgba(32, 18, 26, 0.82)",
        },
        page: {
          image: darkPageDataUri,
          size: "auto",
          position: "center",
          repeat: "repeat",
          overlay: "rgba(32, 18, 26, 0.85)",
        },
        custom: [
          {
            selector: ".theme_dark:root .yamb-compose, :root.theme_dark .yamb-compose",
            image: peekingChibiDataUri,
            size: "100px auto",
            position: "top right",
            repeat: "no-repeat",
          },
          {
            selector: ".theme_dark:root .yamb-join-call-banner, :root.theme_dark .yamb-join-call-banner",
            image: darkSidebarDataUri,
            size: "70px auto",
            position: "right center",
            repeat: "no-repeat",
          },
          {
            selector: ".theme_dark:root .yamb-reactions-picker, :root.theme_dark .yamb-reactions-picker",
            image: peekingChibiDataUri,
            size: "90px auto",
            position: "top right",
            repeat: "no-repeat",
          },
        ],
      },
    },
  }

  // Validate theme against schema
  const parsed = desktopThemeSchema.parse(theme)

  const outPath = resolve(process.cwd(), "presets/anime-pink.json")
  await writeFile(outPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8")
  console.log(`Successfully generated ${outPath} with anime waifu artworks!`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
