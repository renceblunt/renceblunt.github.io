import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC4DHI8aBVY4JjTvJ-r-TGIDPsewtEWxzU",
  authDomain: "silent-depth.firebaseapp.com",
  projectId: "silent-depth",
  storageBucket: "silent-depth.appspot.com",
  messagingSenderId: "78008755450",
  appId: "1:78008755450:web:3fd0f0f298a08820935543"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function generateSitemap() {
  const colRef = collection(db, "recentPoems");
  const snapshot = await getDocs(colRef);
  
  const urls = snapshot.docs.map(doc => {
    const data = doc.data();
    return `
  <url>
    <loc>https://renceblunt.github.io//poems.html?id=${doc.id}</loc>
    <priority>0.8</priority>
  </url>`;
  }).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  fs.writeFileSync('sitemap.xml', sitemap);
  console.log('sitemap.xml generated successfully!');
}

generateSitemap();
