import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
  getFirestore, collection, query, orderBy, limit, getDocs, doc, getDoc, 
  enableIndexedDbPersistence, startAfter, updateDoc, increment, addDoc, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const auth = getAuth();

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
      const loadMoreBtn = document.getElementById("load-more-poems");
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
      reachedEnd = true;
      return;
    }

    const container = document.getElementById("recent-poems-container");
    if (initial) container.innerHTML = ""; // clear only first time

   snapshot.docs.forEach(async (docSnap) => {
  const poem = docSnap.data();
  const docId = docSnap.id;
  const card = document.createElement("div");
  card.className = "recent-poem-card";
  card.setAttribute("data-id", docId);

  const truncated = truncatePoem(poem.content, 8);
  const likes = typeof poem.likes === "number" ? poem.likes : 0;

  card.innerHTML = `
    <h3>${poem.title}</h3>
    <p class="poem-content">${truncated.preview}</p>
    ${truncated.truncated ? `<button class="read-more-btn">Read More</button>` : ""}
    ${poem.author ? `<span class="author">– ${poem.author}</span>` : ""}

    <div class="poem-actions">
      <div class="comment-section">
        <textarea class="comment-input" placeholder="Write a comment..." rows="1"></textarea>
        <button class="comment-btn">Post</button>
      </div>
      <button class="like-btn">❤️</button>
      <span class="like-count">${likes}</span>
      <span class="message-count">💬 0</span>
    </div>

    <div class="comment-list" style="display:none;"></div>
  `;

  container.appendChild(card);

  // --- Set like button active if user already liked ---
  const user = auth.currentUser;
  if (user) {
    const likedBy = Array.isArray(poem.likedBy) ? poem.likedBy : [];
    if (likedBy.includes(user.uid)) {
      card.querySelector(".like-btn").classList.add("liked");
    }
  }

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

  // Fetch and display comment count
  const commentsCol = collection(db, "recentPoems", docId, "comments");
  const commentsSnapshot = await getDocs(commentsCol);
  const messageCount = card.querySelector(".message-count");
  messageCount.textContent = `💬 ${commentsSnapshot.size}`;

  // Setup dynamic textarea expansion
  const textarea = card.querySelector(".comment-input");
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  });
});


    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < 10) {
      const loadMoreBtn = document.getElementById("load-more-poems");
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
      reachedEnd = true;
    }

  } catch (err) {
    console.error("Error fetching recent poems:", err);
  }
}

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

// Auth state changes (Navbar)
onAuthStateChanged(auth, async (user) => {
  const profileLink = document.getElementById("profile-link");
  let userDisplay = document.getElementById("user-display");
  if (!userDisplay) {
    userDisplay = document.createElement("div");
    userDisplay.id = "user-display";
    userDisplay.className = "user-dropdown";
    profileLink.parentNode.insertBefore(userDisplay, profileLink);
    profileLink.style.display = "none";
  }

  if (user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    let username = user.email;
    if (docSnap.exists()) username = docSnap.data().username || user.email;

    userDisplay.innerHTML = `
      <span class="username"> ${username}</span>
      <div class="dropdown-content">
        <a href="#" id="logout-link">Logout</a>
      </div>
    `;

    document.getElementById("logout-link").onclick = async (e) => {
      e.preventDefault();
      await signOut(auth);
      window.location.reload();
    };
  } else {
    profileLink.style.display = "inline-block";
    if (userDisplay) userDisplay.remove();
  }
});

// ---------- Like / Comment / Message Count Handler ----------
document.addEventListener("click", async (e) => {
  const user = auth.currentUser;

  // LIKE / UNLIKE
  if (e.target.classList.contains("like-btn")) {
    if (!user) { alert("Please sign in to like poems!"); return; }
    const card = e.target.closest(".recent-poem-card");
    const docId = card.dataset.id;
    const countSpan = card.querySelector(".like-count");
    const poemRef = doc(db, "recentPoems", docId);

    try {
      const docSnap = await getDoc(poemRef);
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
      let likes = typeof data.likes === "number" ? data.likes : 0;

      if (likedBy.includes(user.uid)) {
        if (likes > 0) {
          await updateDoc(poemRef, {
            likes: increment(-1),
            likedBy: likedBy.filter(uid => uid !== user.uid)
          });
          likes -= 1;
        }
        countSpan.textContent = likes;
        e.target.classList.remove("liked");
      } else {
        await updateDoc(poemRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
        countSpan.textContent = likes + 1;
        e.target.classList.add("liked");
      }

    } catch (err) { console.error("Error updating like:", err); }
  }

  // COMMENT POST
// COMMENT POST
if (e.target.classList.contains("comment-btn")) {
  if (!user) { alert("Please sign in to comment!"); return; }
  const card = e.target.closest(".recent-poem-card");
  const docId = card.dataset.id;
  const input = card.querySelector(".comment-input");
  const commentList = card.querySelector(".comment-list");
  const text = input.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "recentPoems", docId, "comments"), {
      userId: user.uid,
      text,
      timestamp: new Date()
    });

    // Get username
    const userDoc = await getDoc(doc(db, "users", user.uid));
    let username = "Anonymous";
    if (userDoc.exists()) username = userDoc.data().username || user.email;

    // Show at top
    const div = document.createElement("div");
    div.className = "comment";
    div.style.background = "#f0f0f0";
    div.style.padding = "8px 12px";
    div.style.margin = "6px 0";
    div.style.borderRadius = "6px";
    div.textContent = `${username}: ${text}`;
    commentList.prepend(div);

    input.value = "";
    input.style.height = "auto";

    const commentsSnapshot = await getDocs(collection(db, "recentPoems", docId, "comments"));
    card.querySelector(".message-count").textContent = `💬 ${commentsSnapshot.size}`;

  } catch (err) { console.error("Error posting comment:", err); }
}

  // SHOW COMMENTS
  if (e.target.classList.contains("message-count")) {
    const card = e.target.closest(".recent-poem-card");
    const docId = card.dataset.id;
    const commentList = card.querySelector(".comment-list");

    if (commentList.style.display === "block") {
      commentList.style.display = "none";
      return;
    }

    commentList.innerHTML = ""; // clear previous
    const commentsCol = collection(db, "recentPoems", docId, "comments");
    const commentsSnapshot = await getDocs(query(commentsCol, orderBy("timestamp", "desc")));

    for (const docSnap of commentsSnapshot.docs) {
      const c = docSnap.data();
      let username = "Anonymous";
      if (c.userId) {
        const userDoc = await getDoc(doc(db, "users", c.userId));
        if (userDoc.exists()) username = userDoc.data().username || "Anonymous";
      }
      const div = document.createElement("div");
      div.className = "comment";
      div.style.background = "#f0f0f0";
      div.style.padding = "8px 12px";
      div.style.margin = "6px 0";
      div.style.borderRadius = "6px";
      div.textContent = `${username}: ${c.text}`;
      commentList.appendChild(div);
    }

    commentList.style.display = "block";
  }
});

// Initialize DOM
document.addEventListener("DOMContentLoaded", () => {
  loadWeeklyHighlights();
  loadRecentPoems(true);
  setupNavbarToggle();
  setupOfflineNotice();

  const loadMoreBtn = document.getElementById("load-more-poems");
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", () => loadRecentPoems(false));

  const searchInput = document.getElementById("recent-poems-search");
  const container = document.getElementById("recent-poems-container");
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    container.querySelectorAll(".recent-poem-card").forEach(card => {
      const title = card.querySelector("h3").textContent.toLowerCase();
      const content = card.querySelector("p.poem-content").textContent.toLowerCase();
      card.style.display = (title.includes(q) || content.includes(q)) ? "block" : "none";
    });
  });
});
