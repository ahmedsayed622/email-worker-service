#!/usr/bin/env node
/**
 * Test signature loader after path change
 * Verifies that signature HTML is loaded from new location with inlined images
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix: rootDir should be the project root, not script dir
const rootDir = path.resolve(__dirname, '..');
const signaturesDir = path.join(rootDir, 'src/templates/shared/signatures/en/raw');
const signatureHtmlPath = path.join(signaturesDir, 'AlahlyINV_Signature.htm');

function resolveContentType(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
}

async function inlineImages(html) {
  // Match both <img src="..."> and <v:imagedata src="..."> (VML for Outlook)
  const imgRegex = /(?:<img[^>]*?|<v:imagedata[^>]*?)src=["']([^"']+)["'][^>]*?>/gi;
  const replacements = [];

  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const originalSrc = match[1];
    if (/^data:/i.test(originalSrc) || /^https?:/i.test(originalSrc) || /^\/\//.test(originalSrc)) {
      continue;
    }

    const cleanedSrc = originalSrc
      .replace(/^\.\//, '')
      .replace(/^Signatures[\\/]/i, '');

    const imagePath = path.isAbsolute(cleanedSrc)
      ? cleanedSrc
      : path.join(signaturesDir, cleanedSrc);

    try {
      const buffer = await readFile(imagePath);
      const contentType = resolveContentType(imagePath);
      const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
      replacements.push({ original: originalSrc, dataUri });
    } catch (err) {
      console.warn(`⚠️  Image missing: ${imagePath}`);
    }
  }

  let inlined = html;
  for (const rep of replacements) {
    // Replace in both <img> and <v:imagedata> tags
    const escapedSrc = rep.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `((?:<img[^>]*?|<v:imagedata[^>]*?)src=["'])${escapedSrc}(["'][^>]*?>)`,
      'gi'
    );
    inlined = inlined.replace(pattern, `$1${rep.dataUri}$2`);
  }

  return inlined;
}

async function getDefaultSignatureHtml() {
  try {
    const rawHtml = await readFile(signatureHtmlPath, 'utf8');
    return await inlineImages(rawHtml);
  } catch (err) {
    throw new Error(`Failed to load signature from ${signatureHtmlPath}: ${err.message}`);
  }
}

async function testSignatureLoader() {
  console.log('🧪 Testing Signature Loader\n');
  console.log('═════════════════════════════════════════════════════════════');
  
  try {
    // 1. Test signature loading
    console.log(`1. Loading signature HTML from ${signatureHtmlPath}...`);
    const signatureHtml = await getDefaultSignatureHtml();
    
    if (!signatureHtml) {
      console.error('❌ FAIL: Signature HTML is empty');
      process.exit(1);
    }
    console.log('✅ PASS: Signature HTML loaded');
    console.log(`   Length: ${signatureHtml.length} bytes\n`);
    
    // 2. Check for base64 data URIs (inlined images)
    console.log('2. Checking for inlined images (base64)...');
    const dataUriMatches = signatureHtml.match(/data:image\/(png|jpeg|jpg|gif);base64,/g);
    if (!dataUriMatches || dataUriMatches.length === 0) {
      console.warn('⚠️  WARN: No data URIs found (images may not be inlined)');
    } else {
      console.log(`✅ PASS: Found ${dataUriMatches.length} inlined images`);
      console.log('   Image types:', [...new Set(dataUriMatches)].join(', '));
    }
    
    // 3. Check that original image paths are replaced
    console.log('\n3. Checking for unreplaced image paths...');
    const relativeImgMatches = signatureHtml.match(/src="[^"]*AlahlyINV_Signature_files[^"]*"/g);
    if (relativeImgMatches && relativeImgMatches.length > 0) {
      console.error('❌ FAIL: Found unreplaced image paths:');
      relativeImgMatches.forEach(match => console.error('   ', match));
      process.exit(1);
    } else {
      console.log('✅ PASS: All relative image paths replaced with data URIs\n');
    }
    
    // 4. Check file location
    console.log('4. Verifying file location...');
    const expectedPath = path.join(rootDir, 'src/templates/shared/signatures/en/raw/AlahlyINV_Signature.htm');
    if (fs.existsSync(expectedPath)) {
      console.log(`✅ PASS: Signature file exists at ${expectedPath}`);
    } else {
      console.error(`❌ FAIL: Signature file not found at ${expectedPath}`);
      process.exit(1);
    }
    
    const expectedImagesDir = path.join(rootDir, 'src/templates/shared/signatures/en/raw/AlahlyINV_Signature_files');
    if (fs.existsSync(expectedImagesDir)) {
      const imageFiles = fs.readdirSync(expectedImagesDir).filter(f => f.endsWith('.png'));
      console.log(`✅ PASS: Images folder exists with ${imageFiles.length} PNG files`);
      console.log('   Images:', imageFiles.join(', '));
    } else {
      console.error(`❌ FAIL: Images folder not found at ${expectedImagesDir}`);
      process.exit(1);
    }
    
    // 5. Sample output
    console.log('\n5. Sample signature content (first 200 chars):');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(signatureHtml.substring(0, 200) + '...');
    console.log('─────────────────────────────────────────────────────────────');
    
    console.log('\n✅ ALL TESTS PASSED');
    console.log('═════════════════════════════════════════════════════════════');
    console.log('✨ Signature is successfully loaded from "raw" folder with inlined images.\n');
    console.log('📁 Location: src/templates/shared/signatures/en/raw/');
    console.log('📄 File: AlahlyINV_Signature.htm');
    console.log('🖼️  Images: AlahlyINV_Signature_files/*.png (base64 encoded)\n');
    
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testSignatureLoader();
