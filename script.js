import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
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

// Load weekly highlights
async function loadWeeklyHighlights() {
  try {
    const quoteSnap = await getDoc(doc(db, "weeklyHighlights", "weeklyQuote"));
    if (quoteSnap.exists()) {
      const data = quoteSnap.data();
      document.getElementById("weekly-quote").innerHTML = `<em>“${data.quote}”</em>`;
      document.getElementById("quote-author").textContent = data.author ? `– ${data.author}` : "";
    }

    const poemSnap = await getDoc(doc(db, "weeklyHighlights", "weeklyPoem"));
    if (poemSnap.exists()) {
      const data = poemSnap.data();
      document.getElementById("weekly-poem").innerHTML = `<em>“${data.content}”</em>`;
      document.getElementById("poem-author").textContent = data.author ? `– ${data.author}` : "";
    }
  } catch (err) {
    console.error("Error fetching weekly highlights:", err);
  }
}

// Helper: truncate poem content
function truncatePoem(text, lines = 8) {
  const allLines = text.split(/\r?\n/);
  if (allLines.length <= lines) return { preview: text, full: text, truncated: false };
  return {
    preview: allLines.slice(0, lines).join("\n"),
    full: text,
    truncated: true
  };
}

// Load recent poems
async function loadRecentPoems(limitCount = 10) {
  try {
    const colRef = collection(db, "recentPoems");
    const q = query(colRef, orderBy("timestamp", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);

    const container = document.getElementById("recent-poems-container");
    container.innerHTML = "";

    if (!snapshot.empty) {
      snapshot.docs.forEach(doc => {
        const poem = doc.data();
        const card = document.createElement("div");
        card.className = "recent-poem-card";

        const truncated = truncatePoem(poem.content, 8);

        card.innerHTML = `
          <h3>${poem.title}</h3>
          <p class="poem-content">${truncated.preview}</p>
          ${truncated.truncated ? `<button class="read-more-btn">Read More</button>` : ""}
          ${poem.author ? `<span class="author">– ${poem.author}</span>` : ""}
        `;

        container.appendChild(card);

        if (truncated.truncated) {
          const btn = card.querySelector(".read-more-btn");
          const p = card.querySelector(".poem-content");
          btn.addEventListener("click", () => {
            if (btn.textContent === "Read More") {
              p.textContent = truncated.full;
              btn.textContent = "Show Less";
            } else {
              p.textContent = truncated.preview;
              btn.textContent = "Read More";
            }
          });
        }
      });
    } else {
      container.innerHTML = "<p>No recent poems available</p>";
    }
  } catch (err) {
    console.error("Error fetching recent poems:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadWeeklyHighlights();
  loadRecentPoems(10);
});

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });
  }

  // Close menu on link click (mobile)
  if (navLinks) {
    const links = navLinks.querySelectorAll("a");
    links.forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("show");
      });
    });
  }
});
