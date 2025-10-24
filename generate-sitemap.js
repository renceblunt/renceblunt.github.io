/**
 * 🔥 Auto Sitemap Generator for Rence Blunt Poetry
 * Pulls from Firestore + local files + images
 * Outputs sitemap.xml to project root
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// ---- CONFIG ----
const domain = 'https://renceblunt.github.io';
const publicFolder = './';
const firebaseKeyPath = './serviceAccountKey.json';

// ---- Initialize Firebase ----
const serviceAccount = require(firebaseKeyPath);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ---- Helper: Get images inside a folder ----
function getImagesForFolder(folder) {
  const folderPath = path.join(publicFolder, folder);
  if (!fs.existsSync(folderPath)) return [];
  const files = glob.sync('**/*.*', { cwd: folderPath });
  return files.map(f => `${domain}/${folder}/${f.replace(/\\/g, '/')}`);
}

// ---- Static pages ----
function getStaticPages() {
  const files = glob.sync('*.html', { cwd: publicFolder });
  return files.map(file => {
    const filePath = path.join(publicFolder, file);
    const stats = fs.statSync(filePath);
    const lastmod = stats.mtime.toISOString();

    const imageFolder = file === 'index.html' ? 'images/index' : `images/${file.replace('.html','')}`;
    const images = getImagesForFolder(imageFolder);

    return {
      loc: `${domain}/${file === 'index.html' ? '' : file}`,
      lastmod,
      changefreq: 'monthly',
      images
    };
  });
}

// ---- Poems ----
async function getPoemPages() {
  const snapshot = await db.collection('recentPoems').get();
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const timestamp = data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString();
    const images = getImagesForFolder(`images/poems/${docSnap.id}`);
    return {
      loc: `${domain}/poems/${docSnap.id}`,
      lastmod: timestamp,
      changefreq: 'weekly',
      images
    };
  });
}

// ---- Categories ----
async function getCategoryPages() {
  const snapshot = await db.collection('recentPoems').get();
  const categorySet = new Set();
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (Array.isArray(data.categories)) {
      data.categories.forEach(cat => categorySet.add(cat));
    }
  });
  return Array.from(categorySet).map(cat => ({
    loc: `${domain}/category.html?name=${encodeURIComponent(cat)}`,
    lastmod: new Date().toISOString(),
    changefreq: 'weekly',
    images: []
  }));
}

// ---- General root images ----
function getGeneralImages() {
  const imageFiles = glob.sync('images/*.*', { cwd: publicFolder });
  return imageFiles.map(img => ({
    loc: `${domain}/images/${img.replace(/\\/g, '/')}`,
    lastmod: new Date().toISOString(),
    changefreq: 'monthly',
    images: []
  }));
}

// ---- Generate sitemap ----
async function generateSitemap() {
  try {
    console.log("🧠 Generating sitemap...");

    const staticPages = getStaticPages();
    const poemPages = await getPoemPages();
    const categoryPages = await getCategoryPages();
    const generalImages = getGeneralImages();

    const allUrls = [...staticPages, ...poemPages, ...categoryPages, ...generalImages];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls.map(u => `
  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    ${u.images.map(img => `<image:image><image:loc>${img}</image:loc></image:image>`).join('')}
  </url>`).join('')}
</urlset>`;

    fs.writeFileSync(path.join(publicFolder, 'sitemap.xml'), xml);
    console.log('✅ sitemap.xml generated successfully!');
  } catch (err) {
    console.error('❌ Error generating sitemap:', err);
  }
}

generateSitemap();
