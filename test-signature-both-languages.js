#!/usr/bin/env node
/**
 * Test signature loader for both AR and EN languages
 * Verifies that signatures load correctly from language-specific raw folders
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

function resolveContentType(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
}

async function inlineImages(html, signaturesDir) {
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
    const escapedSrc = rep.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `((?:<img[^>]*?|<v:imagedata[^>]*?)src=["'])${escapedSrc}(["'][^>]*?>)`,
      'gi'
    );
    inlined = inlined.replace(pattern, `$1${rep.dataUri}$2`);
  }

  return inlined;
}

async function getDefaultSignatureHtml(languageCode = 'EN') {
  const lang = languageCode === 'AR' ? 'ar' : 'en';
  const signaturesDir = path.join(rootDir, 'src/templates/shared/signatures', lang, 'raw');
  const signatureHtmlPath = path.join(signaturesDir, 'AlahlyINV_Signature.htm');

  try {
    const rawHtml = await readFile(signatureHtmlPath, 'utf8');
    return await inlineImages(rawHtml, signaturesDir);
  } catch (err) {
    throw new Error(`Failed to load ${languageCode} signature: ${err.message}`);
  }
}

async function testLanguage(languageCode) {
  console.log(`\n${'='.repeat(65)}`);
  console.log(`Testing ${languageCode} Signature`);
  console.log('='.repeat(65));

  const lang = languageCode === 'AR' ? 'ar' : 'en';
  const expectedPath = `src/templates/shared/signatures/${lang}/raw/AlahlyINV_Signature.htm`;
  const expectedImagesDir = `src/templates/shared/signatures/${lang}/raw/AlahlyINV_Signature_files`;

  try {
    // 1. Check file location
    console.log(`\n1. Verifying file location for ${languageCode}...`);
    if (fs.existsSync(expectedPath)) {
      const stats = fs.statSync(expectedPath);
      console.log(`✅ PASS: Signature file exists at ${expectedPath}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
      console.error(`❌ FAIL: Signature file not found at ${expectedPath}`);
      return false;
    }

    if (fs.existsSync(expectedImagesDir)) {
      const imageFiles = fs.readdirSync(expectedImagesDir).filter(f => f.endsWith('.png'));
      console.log(`✅ PASS: Images folder exists with ${imageFiles.length} PNG files`);
    } else {
      console.error(`❌ FAIL: Images folder not found at ${expectedImagesDir}`);
      return false;
    }

    // 2. Load signature
    console.log(`\n2. Loading ${languageCode} signature HTML...`);
    const signatureHtml = await getDefaultSignatureHtml(languageCode);
    
    if (!signatureHtml) {
      console.error(`❌ FAIL: ${languageCode} signature HTML is empty`);
      return false;
    }
    console.log(`✅ PASS: ${languageCode} signature HTML loaded`);
    console.log(`   Length: ${signatureHtml.length.toLocaleString()} bytes`);

    // 3. Check for base64 images
    console.log(`\n3. Checking for inlined images in ${languageCode}...`);
    const dataUriMatches = signatureHtml.match(/data:image\/(png|jpeg|jpg|gif);base64,/g);
    if (!dataUriMatches || dataUriMatches.length === 0) {
      console.warn(`⚠️  WARN: No data URIs found in ${languageCode} signature`);
      return false;
    } else {
      console.log(`✅ PASS: Found ${dataUriMatches.length} inlined images`);
    }

    // 4. Check for unreplaced paths
    console.log(`\n4. Checking for unreplaced image paths in ${languageCode}...`);
    const relativeImgMatches = signatureHtml.match(/src="[^"]*AlahlyINV_Signature_files[^"]*"/g);
    if (relativeImgMatches && relativeImgMatches.length > 0) {
      console.error(`❌ FAIL: Found unreplaced image paths in ${languageCode}:`);
      relativeImgMatches.forEach(match => console.error('   ', match));
      return false;
    } else {
      console.log(`✅ PASS: All relative paths replaced with data URIs`);
    }

    console.log(`\n✅ ${languageCode} signature: ALL TESTS PASSED`);
    return true;

  } catch (err) {
    console.error(`\n❌ ERROR testing ${languageCode}:`, err.message);
    return false;
  }
}

async function testBothLanguages() {
  console.log('🧪 Testing Multi-Language Signature Loader');
  console.log('═'.repeat(65));
  console.log('Testing both AR and EN signature loading from raw folders\n');

  const results = {
    EN: false,
    AR: false,
  };

  // Test English
  results.EN = await testLanguage('EN');

  // Test Arabic
  results.AR = await testLanguage('AR');

  // Summary
  console.log('\n' + '═'.repeat(65));
  console.log('SUMMARY');
  console.log('═'.repeat(65));
  console.log(`English (EN): ${results.EN ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Arabic (AR):  ${results.AR ? '✅ PASS' : '❌ FAIL'}`);
  console.log('═'.repeat(65));

  if (results.EN && results.AR) {
    console.log('\n🎉 SUCCESS: Both languages work perfectly!');
    console.log('\n📁 Folder structure:');
    console.log('   src/templates/shared/signatures/en/raw/ ✅');
    console.log('   src/templates/shared/signatures/ar/raw/ ✅');
    console.log('\n🔧 Function signature:');
    console.log('   getDefaultSignatureHtml(languageCode)');
    console.log('   - languageCode = "EN" → loads from en/raw/');
    console.log('   - languageCode = "AR" → loads from ar/raw/');
    console.log('\n');
    process.exit(0);
  } else {
    console.log('\n❌ FAILED: Some tests did not pass');
    process.exit(1);
  }
}

testBothLanguages();
