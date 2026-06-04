import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SVG_DIR = join(ROOT, 'brand/scene-backgrounds/svg');
const APP_DIR = join(ROOT, 'apps/mp-client/miniprogram/assets/images');
const DEMO_DIR = join(ROOT, 'demo/mp-preview/assets');

const W = 1200;
const H = 780;

const scenes = [
  {
    slug: 'home-portfolio',
    mood: 'portfolio',
    accent: '#c7a45a',
    secondary: '#f1e7cc',
    glow: '#183c44'
  },
  {
    slug: 'scene-business-dinner',
    mood: 'dinner',
    accent: '#c7a45a',
    secondary: '#f4ead2',
    glow: '#17333b'
  },
  {
    slug: 'scene-client-reception',
    mood: 'reception',
    accent: '#b9964e',
    secondary: '#e8d8ac',
    glow: '#1a4050'
  },
  {
    slug: 'scene-project-meeting',
    mood: 'meeting',
    accent: '#bfa05c',
    secondary: '#ecdfbf',
    glow: '#18384f'
  },
  {
    slug: 'scene-private-gathering',
    mood: 'gathering',
    accent: '#b98f57',
    secondary: '#ead5b9',
    glow: '#26394a'
  },
  {
    slug: 'scene-private-tea',
    mood: 'tea',
    accent: '#c3a35e',
    secondary: '#efe4c8',
    glow: '#1f453d'
  },
  {
    slug: 'scene-wine-reception',
    mood: 'wine',
    accent: '#b99356',
    secondary: '#f1e2c4',
    glow: '#35243f'
  },
  {
    slug: 'scene-golf-social',
    mood: 'golf',
    accent: '#c2a15b',
    secondary: '#e5d7ad',
    glow: '#224239'
  },
  {
    slug: 'scene-city-concierge',
    mood: 'city',
    accent: '#c4a05b',
    secondary: '#e7dcc1',
    glow: '#193f55'
  }
];

function commonDefs(scene) {
  return `
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#0b2027"/>
        <stop offset="44%" stop-color="#061116"/>
        <stop offset="100%" stop-color="#020607"/>
      </linearGradient>
      <radialGradient id="softGlow" cx="68%" cy="30%" r="64%">
        <stop offset="0%" stop-color="${scene.glow}" stop-opacity="0.62"/>
        <stop offset="42%" stop-color="${scene.glow}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#020607" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="goldLine" x1="0" x2="1">
        <stop offset="0%" stop-color="${scene.accent}" stop-opacity="0"/>
        <stop offset="42%" stop-color="${scene.accent}" stop-opacity="0.86"/>
        <stop offset="100%" stop-color="${scene.secondary}" stop-opacity="0.22"/>
      </linearGradient>
      <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#10252a" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
      </linearGradient>
      <pattern id="grain" width="96" height="96" patternUnits="userSpaceOnUse">
        <circle cx="12" cy="18" r="1" fill="#f5e9cc" opacity="0.06"/>
        <circle cx="58" cy="42" r="0.8" fill="#f5e9cc" opacity="0.035"/>
        <circle cx="81" cy="74" r="0.9" fill="#ffffff" opacity="0.026"/>
      </pattern>
      <filter id="blur28">
        <feGaussianBlur stdDeviation="28"/>
      </filter>
    </defs>`;
}

function base(scene, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${commonDefs(scene)}
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#softGlow)"/>
  <rect width="${W}" height="${H}" fill="url(#grain)" opacity="0.48"/>
  <path d="M0 600 C260 540 445 560 640 596 C820 632 1010 614 1200 548 L1200 780 L0 780 Z" fill="url(#floor)"/>
  ${body}
  <rect width="${W}" height="${H}" fill="url(#bg)" opacity="0.08"/>
  <rect width="${W}" height="${H}" fill="#020607" opacity="0.18"/>
  <path d="M0 0 H1200 V780 H0 Z" fill="none" stroke="#f6ead0" stroke-opacity="0.025" stroke-width="2"/>
</svg>`;
}

function dinner(scene) {
  return base(scene, `
    <g opacity="0.55">
      <path d="M150 210 H1050" stroke="${scene.secondary}" stroke-width="1.2" opacity="0.22"/>
      <path d="M190 254 H1010" stroke="${scene.secondary}" stroke-width="1" opacity="0.13"/>
      <path d="M250 306 H950" stroke="${scene.secondary}" stroke-width="1" opacity="0.09"/>
    </g>
    <g filter="url(#blur28)" opacity="0.58">
      <ellipse cx="602" cy="444" rx="274" ry="46" fill="${scene.accent}" opacity="0.23"/>
    </g>
    <path d="M282 468 C390 408 805 408 918 468 C812 506 388 506 282 468 Z" fill="#07151a" stroke="${scene.accent}" stroke-opacity="0.48" stroke-width="2"/>
    <path d="M338 454 C434 426 764 426 862 454" fill="none" stroke="url(#goldLine)" stroke-width="3" opacity="0.82"/>
    <g stroke="${scene.secondary}" stroke-opacity="0.28" stroke-width="2">
      <path d="M420 430 v74"/>
      <path d="M600 420 v92"/>
      <path d="M780 430 v74"/>
    </g>
    <g fill="${scene.secondary}" opacity="0.24">
      <ellipse cx="420" cy="428" rx="22" ry="6"/>
      <ellipse cx="600" cy="418" rx="26" ry="7"/>
      <ellipse cx="780" cy="428" rx="22" ry="6"/>
    </g>`);
}

function reception(scene) {
  return base(scene, `
    <g opacity="0.42" stroke="${scene.secondary}" stroke-width="1.4">
      <path d="M160 188 H1040"/>
      <path d="M230 188 V570"/>
      <path d="M970 188 V570"/>
      <path d="M342 230 V536"/>
      <path d="M858 230 V536"/>
    </g>
    <path d="M260 540 C430 448 760 448 940 540" fill="none" stroke="${scene.accent}" stroke-width="3" opacity="0.78"/>
    <path d="M420 620 C520 540 692 540 788 620" fill="none" stroke="${scene.secondary}" stroke-width="2" opacity="0.18"/>
    <g fill="${scene.accent}" opacity="0.24">
      <rect x="282" y="508" width="128" height="10" rx="5"/>
      <rect x="790" y="508" width="128" height="10" rx="5"/>
    </g>
    <path d="M604 220 C655 284 700 346 712 448 C664 428 544 428 496 448 C508 348 553 285 604 220 Z" fill="#09181f" stroke="${scene.secondary}" stroke-opacity="0.26" stroke-width="2"/>
    <circle cx="604" cy="456" r="9" fill="${scene.accent}" opacity="0.72"/>`);
}

function meeting(scene) {
  return base(scene, `
    <g stroke="${scene.secondary}" stroke-opacity="0.16" stroke-width="1">
      <path d="M130 170 H1070"/>
      <path d="M130 240 H1070"/>
      <path d="M130 310 H1070"/>
      <path d="M230 130 V420"/>
      <path d="M430 130 V420"/>
      <path d="M770 130 V420"/>
      <path d="M970 130 V420"/>
    </g>
    <path d="M286 536 L454 394 H746 L914 536 Z" fill="#07151b" stroke="${scene.accent}" stroke-opacity="0.46" stroke-width="2"/>
    <path d="M456 422 H746" stroke="url(#goldLine)" stroke-width="4" opacity="0.85"/>
    <g fill="${scene.secondary}" opacity="0.18">
      <rect x="506" y="456" width="84" height="8" rx="4"/>
      <rect x="612" y="456" width="84" height="8" rx="4"/>
      <rect x="552" y="482" width="98" height="8" rx="4"/>
    </g>
    <path d="M344 612 C446 562 754 562 856 612" fill="none" stroke="${scene.secondary}" stroke-width="2" opacity="0.18"/>`);
}

function gathering(scene) {
  return base(scene, `
    <g fill="#07161c" stroke="${scene.secondary}" stroke-opacity="0.18" stroke-width="2">
      <path d="M214 502 C214 432 296 398 378 430 L430 452 V536 H238 C225 536 214 525 214 502 Z"/>
      <path d="M986 502 C986 432 904 398 822 430 L770 452 V536 H962 C975 536 986 525 986 502 Z"/>
      <ellipse cx="600" cy="520" rx="170" ry="44"/>
    </g>
    <path d="M426 520 H774" stroke="url(#goldLine)" stroke-width="3" opacity="0.72"/>
    <circle cx="600" cy="450" r="72" fill="${scene.accent}" opacity="0.05" filter="url(#blur28)"/>
    <g stroke="${scene.accent}" stroke-opacity="0.4" stroke-width="1.5">
      <path d="M508 446 C552 412 648 412 692 446"/>
      <path d="M484 474 C540 430 660 430 716 474"/>
    </g>`);
}

function tea(scene) {
  return base(scene, `
    <g stroke="${scene.secondary}" stroke-opacity="0.16" stroke-width="1.3">
      <path d="M198 132 V556"/>
      <path d="M314 120 V548"/>
      <path d="M886 120 V548"/>
      <path d="M1002 132 V556"/>
    </g>
    <path d="M292 548 C420 488 780 488 908 548" fill="none" stroke="${scene.accent}" stroke-width="3" opacity="0.72"/>
    <ellipse cx="600" cy="520" rx="210" ry="40" fill="#07161b" stroke="${scene.secondary}" stroke-opacity="0.2" stroke-width="2"/>
    <path d="M532 466 C526 424 554 388 604 388 C654 388 684 424 676 466 Z" fill="#08191b" stroke="${scene.secondary}" stroke-opacity="0.32" stroke-width="2"/>
    <path d="M676 432 C728 420 748 462 704 480" fill="none" stroke="${scene.accent}" stroke-width="3" opacity="0.65"/>
    <g fill="${scene.secondary}" opacity="0.28">
      <ellipse cx="482" cy="500" rx="28" ry="9"/>
      <ellipse cx="720" cy="500" rx="28" ry="9"/>
    </g>
    <path d="M590 350 C570 320 612 302 594 272" fill="none" stroke="${scene.secondary}" stroke-opacity="0.19" stroke-width="2"/>
    <path d="M628 350 C608 316 652 302 632 270" fill="none" stroke="${scene.secondary}" stroke-opacity="0.14" stroke-width="2"/>`);
}

function wine(scene) {
  return base(scene, `
    <g stroke="${scene.secondary}" stroke-opacity="0.13" stroke-width="1">
      <path d="M180 178 C404 130 796 130 1020 178"/>
      <path d="M214 246 C424 214 776 214 986 246"/>
      <path d="M264 314 C454 292 746 292 936 314"/>
    </g>
    <g fill="#07131a" stroke="${scene.secondary}" stroke-opacity="0.32" stroke-width="2">
      <path d="M462 318 C454 390 482 424 522 424 C562 424 590 390 582 318 Z"/>
      <path d="M642 318 C634 390 662 424 702 424 C742 424 770 390 762 318 Z"/>
    </g>
    <g stroke="${scene.accent}" stroke-opacity="0.72" stroke-width="3">
      <path d="M522 424 V542"/>
      <path d="M702 424 V542"/>
      <path d="M484 544 H560"/>
      <path d="M664 544 H740"/>
    </g>
    <path d="M398 586 C506 540 694 540 802 586" fill="none" stroke="url(#goldLine)" stroke-width="3" opacity="0.78"/>
    <circle cx="602" cy="250" r="88" fill="${scene.accent}" opacity="0.06" filter="url(#blur28)"/>`);
}

function golf(scene) {
  return base(scene, `
    <path d="M0 514 C220 432 408 472 576 502 C780 538 936 492 1200 420 L1200 780 H0 Z" fill="#0d211b" opacity="0.72"/>
    <path d="M178 548 C376 476 662 508 1016 430" fill="none" stroke="${scene.accent}" stroke-width="3" opacity="0.58"/>
    <path d="M778 278 V518" stroke="${scene.secondary}" stroke-opacity="0.34" stroke-width="3"/>
    <path d="M778 282 C836 298 876 326 918 366 C862 362 820 348 778 330 Z" fill="${scene.accent}" opacity="0.46"/>
    <ellipse cx="778" cy="522" rx="48" ry="10" fill="#020607" opacity="0.5"/>
    <g stroke="${scene.secondary}" stroke-opacity="0.12" stroke-width="1.2">
      <path d="M120 612 C362 568 594 568 1080 604"/>
      <path d="M160 674 C402 646 704 642 1040 666"/>
    </g>
    <circle cx="320" cy="454" r="10" fill="${scene.secondary}" opacity="0.42"/>`);
}

function city(scene) {
  return base(scene, `
    <g fill="#07151b" stroke="${scene.secondary}" stroke-opacity="0.1" stroke-width="1.4">
      <rect x="122" y="240" width="86" height="314"/>
      <rect x="244" y="190" width="118" height="364"/>
      <rect x="408" y="260" width="92" height="294"/>
      <rect x="730" y="214" width="108" height="340"/>
      <rect x="882" y="166" width="128" height="388"/>
      <rect x="1032" y="268" width="74" height="286"/>
    </g>
    <g stroke="${scene.secondary}" stroke-opacity="0.14" stroke-width="1">
      <path d="M158 292 H198 M158 348 H198 M158 404 H198"/>
      <path d="M276 244 H330 M276 312 H330 M276 380 H330"/>
      <path d="M912 230 H974 M912 308 H974 M912 386 H974"/>
    </g>
    <path d="M230 610 C364 500 514 642 640 526 C760 416 850 512 984 400" fill="none" stroke="${scene.accent}" stroke-width="4" opacity="0.78"/>
    <circle cx="230" cy="610" r="8" fill="${scene.secondary}" opacity="0.72"/>
    <circle cx="640" cy="526" r="8" fill="${scene.secondary}" opacity="0.72"/>
    <circle cx="984" cy="400" r="8" fill="${scene.accent}" opacity="0.84"/>
    <path d="M352 640 H846" stroke="url(#goldLine)" stroke-width="3" opacity="0.72"/>`);
}

function portfolio(scene) {
  return base(scene, `
    <g opacity="0.42" stroke="${scene.secondary}" stroke-width="1.2">
      <path d="M154 214 H1046"/>
      <path d="M210 164 V548"/>
      <path d="M990 164 V548"/>
    </g>
    <path d="M258 560 C398 470 540 508 600 442 C680 354 834 454 946 384" fill="none" stroke="${scene.accent}" stroke-width="4" opacity="0.62"/>
    <g fill="#07151a" stroke="${scene.secondary}" stroke-opacity="0.22" stroke-width="2">
      <ellipse cx="420" cy="532" rx="108" ry="26"/>
      <path d="M560 506 C554 468 580 436 622 436 C664 436 690 468 684 506 Z"/>
      <path d="M770 440 C762 502 788 532 826 532 C864 532 890 502 882 440 Z"/>
    </g>
    <path d="M346 610 C474 558 734 558 862 610" fill="none" stroke="url(#goldLine)" stroke-width="3" opacity="0.76"/>
    <circle cx="606" cy="390" r="92" fill="${scene.accent}" opacity="0.045" filter="url(#blur28)"/>`);
}

const renderers = {
  portfolio,
  dinner,
  reception,
  meeting,
  gathering,
  tea,
  wine,
  golf,
  city
};

mkdirSync(SVG_DIR, { recursive: true });
mkdirSync(APP_DIR, { recursive: true });
mkdirSync(DEMO_DIR, { recursive: true });

for (const scene of scenes) {
  const svgPath = join(SVG_DIR, `${scene.slug}.svg`);
  const appJpg = join(APP_DIR, `${scene.slug}.jpg`);
  const demoJpg = join(DEMO_DIR, `${scene.slug}.jpg`);
  const svg = renderers[scene.mood](scene);
  writeFileSync(svgPath, svg, 'utf8');
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', svgPath, '--out', appJpg], { stdio: 'ignore' });
  copyFileSync(appJpg, demoJpg);
}

console.log(`Generated ${scenes.length} scene backgrounds.`);
