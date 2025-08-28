import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
  getFirestore, collection, query, orderBy, limit, getDocs, doc, getDoc, 
  enableIndexedDbPersistence, startAfter, updateDoc, increment, addDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Enable offline persistence
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn("Persistence failed: multiple tabs open");
  } else if (err.code === 'unimplemented') {
    console.warn("Persistence not supported in this browser");
  }
});

// Track pagination
let lastVisible = null;
let reachedEnd = false;

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

// Load poems with pagination + likes/comments
async function loadRecentPoems(initial = false) {
  if (reachedEnd) return;

  try {
    const colRef = collection(db, "recentPoems");
    let q = query(colRef, orderBy("timestamp", "desc"), limit(10));

    if (lastVisible && !initial) {
      q = query(colRef, orderBy("timestamp", "desc"), startAfter(lastVisible), limit(10));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      document.getElementById("load-more-poems").style.display = "none";
      reachedEnd = true;
      return;
    }

    const container = document.getElementById("recent-poems-container");
    if (initial) container.innerHTML = ""; // clear only first time

    snapshot.docs.forEach(docSnap => {
      const poem = docSnap.data();
      const docId = docSnap.id;
      const card = document.createElement("div");
      card.className = "recent-poem-card";
      card.setAttribute("data-id", docId);

      const truncated = truncatePoem(poem.content, 8);
      const likes = poem.likes || 0;

      card.innerHTML = `
        <h3>${poem.title}</h3>
        <p class="poem-content">${truncated.preview}</p>
        ${truncated.truncated ? `<button class="read-more-btn">Read More</button>` : ""}
        ${poem.author ? `<span class="author">– ${poem.author}</span>` : ""}
        
        <div class="poem-actions">
          <button class="like-btn">❤️</button> 
          <span class="like-count">${likes}</span>
        </div>
        
        <div class="comment-section">
          <input type="text" class="comment-input" placeholder="Write a comment..." />
          <button class="comment-btn">Post</button>
        </div>
        <div class="comment-list"></div>
      `;

      container.appendChild(card);

      // Read more toggle
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

      // Highlight liked poems
      const likedPoems = JSON.parse(localStorage.getItem("likedPoems") || "[]");
      if (likedPoems.includes(docId)) {
        card.querySelector(".like-btn").classList.add("liked");
      }
    });

    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < 10) {
      document.getElementById("load-more-poems").style.display = "none";
      reachedEnd = true;
    }

  } catch (err) {
    console.error("Error fetching recent poems:", err);
  }
}

// ✅ Like handler (toggle on/off)
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("like-btn")) {
    const card = e.target.closest(".recent-poem-card");
    const docId = card.getAttribute("data-id");
    const countSpan = card.querySelector(".like-count");

    let likedPoems = JSON.parse(localStorage.getItem("likedPoems") || "[]");

    if (likedPoems.includes(docId)) {
      // Unlike
      await updateDoc(doc(db, "recentPoems", docId), {
        likes: increment(-1)
      });

      countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);

      likedPoems = likedPoems.filter(id => id !== docId);
      localStorage.setItem("likedPoems", JSON.stringify(likedPoems));

      e.target.classList.remove("liked");
    } else {
      // Like
      await updateDoc(doc(db, "recentPoems", docId), {
        likes: increment(1)
      });

      countSpan.textContent = parseInt(countSpan.textContent) + 1;

      likedPoems.push(docId);
      localStorage.setItem("likedPoems", JSON.stringify(likedPoems));

      e.target.classList.add("liked");
    }
  }

  // ✅ Comment handler
  if (e.target.classList.contains("comment-btn")) {
    const card = e.target.closest(".recent-poem-card");
    const docId = card.getAttribute("data-id");
    const input = card.querySelector(".comment-input");
    const commentList = card.querySelector(".comment-list");

    const text = input.value.trim();
    if (!text) return;

    try {
      await addDoc(collection(db, "recentPoems", docId, "comments"), {
        text,
        timestamp: new Date()
      });

      // Append instantly to UI
      const div = document.createElement("div");
      div.className = "comment";
      div.textContent = text;
      commentList.appendChild(div);

      input.value = "";
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  }
});

// Offline/online notice
function setupOfflineNotice() {
  window.addEventListener("offline", () => {
    const notice = document.createElement("div");
    notice.textContent = "⚠ You are offline. Viewing cached content.";
    notice.className = "offline-notice";
    document.body.prepend(notice);
  });
  window.addEventListener("online", () => {
    document.querySelectorAll(".offline-notice").forEach(el => el.remove());
  });
}

// Navbar toggle
function setupNavbarToggle() {
  const toggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });

    const links = navLinks.querySelectorAll("a");
    links.forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("show");
      });
    });
  }
}

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
  loadWeeklyHighlights();
  loadRecentPoems(true);
  setupNavbarToggle();
  setupOfflineNotice();

  // Load More button
  const loadMoreBtn = document.getElementById("load-more-poems");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      loadRecentPoems(false);
    });
  }

  // Search filter
  const searchInput = document.getElementById("recent-poems-search");
  const container = document.getElementById("recent-poems-container");
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    container.querySelectorAll(".recent-poem-card").forEach(card => {
      const title = card.querySelector("h3").textContent.toLowerCase();
      const content = card.querySelector(".poem-content").textContent.toLowerCase();
      card.style.display = (title.includes(query) || content.includes(query)) ? "block" : "none";
    });
  });
});
