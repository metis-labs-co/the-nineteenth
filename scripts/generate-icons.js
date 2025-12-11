#!/usr/bin/env node
/**
 * Generate app icons from SVG logo
 *
 * This script generates PNG app icons for iOS and Android from the SVG logo.
 * Run with: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Icon configurations
const icons = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'favicon.png', size: 48 },
];

// Splash configuration (larger size for splash)
const splash = { name: 'splash.png', width: 1284, height: 2778 };

// Primary color from theme
const PRIMARY_COLOR = '#3b82f6';
const BACKGROUND_COLOR = '#1f2937';

// Create SVG for app icon (with rounded corners background)
function createIconSvg(size) {
  const iconSize = size * 0.5; // Icon takes 50% of the canvas
  const offset = (size - iconSize) / 2;
  const strokeWidth = size * 0.007; // Scale stroke width
  const cornerRadius = size * 0.22; // ~22% corner radius

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BACKGROUND_COLOR}" rx="${cornerRadius}"/>
  <g transform="translate(${offset}, ${offset}) scale(${iconSize / 24})" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="${strokeWidth * (24 / iconSize)}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21h-4"/>
    <path d="M14 21v-18"/>
    <path d="M14 4l-9 4l9 4"/>
  </g>
</svg>`;
}

// Create SVG for adaptive icon (no background, just the icon)
function createAdaptiveIconSvg(size) {
  const iconSize = size * 0.4; // Smaller for adaptive icon safe zone
  const offset = (size - iconSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BACKGROUND_COLOR}"/>
  <g transform="translate(${offset}, ${offset}) scale(${iconSize / 24})" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21h-4"/>
    <path d="M14 21v-18"/>
    <path d="M14 4l-9 4l9 4"/>
  </g>
</svg>`;
}

// Create SVG for splash screen
function createSplashSvg(width, height) {
  const iconSize = Math.min(width, height) * 0.15; // 15% of smaller dimension
  const offsetX = (width - iconSize) / 2;
  const offsetY = (height - iconSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BACKGROUND_COLOR}"/>
  <g transform="translate(${offsetX}, ${offsetY}) scale(${iconSize / 24})" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21h-4"/>
    <path d="M14 21v-18"/>
    <path d="M14 4l-9 4l9 4"/>
  </g>
</svg>`;
}

async function generateIcons() {
  console.log('Generating app icons...\n');

  // Ensure assets directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  // Generate main icon
  const iconSvg = Buffer.from(createIconSvg(1024));
  await sharp(iconSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('✓ Generated icon.png (1024x1024)');

  // Generate adaptive icon for Android
  const adaptiveSvg = Buffer.from(createAdaptiveIconSvg(1024));
  await sharp(adaptiveSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('✓ Generated adaptive-icon.png (1024x1024)');

  // Generate favicon
  const faviconSvg = Buffer.from(createIconSvg(48));
  await sharp(faviconSvg)
    .resize(48, 48)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('✓ Generated favicon.png (48x48)');

  // Generate splash screen
  const splashSvg = Buffer.from(createSplashSvg(splash.width, splash.height));
  await sharp(splashSvg)
    .resize(splash.width, splash.height)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash.png'));
  console.log('✓ Generated splash.png (1284x2778)');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
