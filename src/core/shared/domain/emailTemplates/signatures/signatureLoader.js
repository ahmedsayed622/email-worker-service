import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../../../../../shared/logger/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../../..');

function resolveContentType(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
}

async function inlineImages(html, signaturesDir) {
  // Match both <img src="..."> and <v:imagedata src="..."> (VML for Outlook)
  const imgRegex = /(?:<img[^>]*?|<v:imagedata[^>]*?)src=["']([^"']+)["'][^>]*?>/gi;
  const replacements = [];

  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const originalSrc = match[1];
    // Skip data URIs or absolute URLs
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
      logger.warn('Signature image missing; leaving src as-is', { imagePath, error: err.message });
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

/**
 * Load signature HTML from a given file path with inlined images
 * 
 * @param {string} signatureFilePath - Relative path to signature HTML file (from project root)
 * @returns {Promise<string>} Signature HTML with base64-encoded images
 */
export async function loadSignatureWithInlineImages(signatureFilePath) {
  const absolutePath = path.join(rootDir, signatureFilePath);
  const signaturesDir = path.dirname(absolutePath);

  try {
    const rawHtml = await readFile(absolutePath, 'utf8');
    return await inlineImages(rawHtml, signaturesDir);
  } catch (err) {
    logger.warn('Signature file missing or unreadable; using fallback', {
      signatureFilePath,
      error: err.message,
    });
    return '<div style="font-family: Segoe UI, Arial, sans-serif; color: #111; line-height: 1.5;">Regards,<br/>Al Ahly</div>';
  }
}
