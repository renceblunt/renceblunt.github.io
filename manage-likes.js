import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
  getFirestore, collection, getDocs, doc, updateDoc, arrayRemove 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC4DHI8aBVY4JjTvJ-r-TGIDPsewtEWxzU",
  authDomain: "silent-depth.firebaseapp.com",
  projectId: "silent-depth",
  storageBucket: "silent-depth.appspot.com",
  messagingSenderId: "78008755450",
  appId: "1:78008755450:web:3fd0f0f298a08820935543"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

const tableBody = document.querySelector("#likes-table tbody");

// Only allow admin users
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    tableBody.innerHTML = `<tr><td colspan="4">Sign in as admin to manage likes.</td></tr>`;
    return;
  }

  // TODO: add your own admin check here if needed
  loadLikes();
});

// Load all poems and their likes
async function loadLikes() {
  const colRef = collection(db, "recentPoems");
  const snapshot = await getDocs(colRef);

  if (snapshot.empty) {
    tableBody.innerHTML = `<tr><td colspan="4">No poems found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = ""; // clear loading

  snapshot.docs.forEach(docSnap => {
    const poem = docSnap.data();
    const docId = docSnap.id;
    const likes = typeof poem.likes === "number" ? poem.likes : 0;
    const likedBy = Array.isArray(poem.likedBy) ? poem.likedBy : [];

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${poem.title}</td>
      <td>${likes}</td>
      <td>${likedBy.join(", ") || "None"}</td>
      <td>
        <button class="delete-like-btn" data-id="${docId}">Clear All Likes</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  // Add delete like button events
  tableBody.querySelectorAll(".delete-like-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const docId = btn.dataset.id;
      if (!confirm("Are you sure you want to clear all likes for this poem?")) return;

      const poemRef = doc(db, "recentPoems", docId);
      try {
        await updateDoc(poemRef, {
          likes: 0,
          likedBy: []
        });
        alert("Likes cleared!");
        loadLikes(); // refresh table
      } catch (err) {
        console.error("Error clearing likes:", err);
        alert("Failed to clear likes.");
      }
    });
  });
}
