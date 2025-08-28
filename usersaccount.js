// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔹 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC4DHI8aBVY4JjTvJ-r-TGIDPsewtEWxzU",
  authDomain: "silent-depth.firebaseapp.com",
  projectId: "silent-depth",
  storageBucket: "silent-depth.firebasestorage.app",
  messagingSenderId: "78008755450",
  appId: "1:78008755450:web:3fd0f0f298a08820935543",
  measurementId: "G-WSWDCB7KD8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔹 Always keep user logged in (default persistence)
setPersistence(auth, browserLocalPersistence);

/* ---------------- SIGNUP ---------------- */
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("signup-username").value.trim();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
      // Check if username already exists
      const q = query(collection(db, "users"), where("username", "==", username));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        document.getElementById("signup-status").textContent =
          "⚠ Username already taken. Choose another.";
        return;
      }

      // Create user with email/password
      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      // Save user to Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        username,
        email,
        createdAt: new Date(),
        emailVerified: false
      });

      // Send verification email with redirect back to GitHub Pages
      const actionCodeSettings = {
        url: "https://<your-github-username>.github.io/<your-repo>/verify.html",
        handleCodeInApp: true
      };
      await sendEmailVerification(userCred.user, actionCodeSettings);

      document.getElementById("signup-status").textContent =
        "✅ Account created! Please check your email to verify before logging in.";

    } catch (err) {
      document.getElementById("signup-status").textContent = "⚠ " + err.message;
    }
  });
}

/* ---------------- LOGIN (email or username) ---------------- */
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    let loginInput = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      let emailToUse = loginInput;

      // If input is not email, search by username
      if (!loginInput.includes("@")) {
        const q = query(collection(db, "users"), where("username", "==", loginInput));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          document.getElementById("login-status").textContent =
            "⚠ No account found with that username.";
          return;
        }

        emailToUse = querySnap.docs[0].data().email;
      }

      // Login user
      const userCred = await signInWithEmailAndPassword(auth, emailToUse, password);

      if (!userCred.user.emailVerified) {
        document.getElementById("login-status").textContent =
          "⚠ Please verify your email before logging in.";
        await signOut(auth);
        return;
      }

      document.getElementById("login-status").textContent =
        "✅ Login successful! Welcome back.";

      const lastPage = localStorage.getItem("lastPage") || "index.html";
      setTimeout(() => {
        window.location.href = lastPage;
      }, 1200);

    } catch (err) {
      document.getElementById("login-status").textContent = "⚠ " + err.message;
    }
  });
}

/* ---------------- RESET PASSWORD ---------------- */
const resetForm = document.getElementById("reset-form");
if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email").value.trim();

    try {
      await sendPasswordResetEmail(auth, email);
      document.getElementById("reset-status").textContent =
        "✅ Password reset email sent! Check your inbox.";
    } catch (err) {
      document.getElementById("reset-status").textContent = "⚠ " + err.message;
    }
  });
}

/* ---------------- LOGOUT + SHOW USER ---------------- */
function logoutUser() {
  signOut(auth)
    .then(() => {
      localStorage.removeItem("lastPage");
      window.location.href = "login.html";
    })
    .catch((err) => {
      console.error("Logout error:", err.message);
      alert("Failed to log out. Try again.");
    });
}

// Listen for login state changes
onAuthStateChanged(auth, async (user) => {
  const userInfoDiv = document.getElementById("user-info");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    let username = user.email;
    if (docSnap.exists()) username = docSnap.data().username || user.email;

    if (userInfoDiv) userInfoDiv.textContent = `👋 Welcome, ${username}`;
    if (logoutBtn) {
      logoutBtn.style.display = "inline-block";
      logoutBtn.addEventListener("click", logoutUser);
    }
  } else {
    if (userInfoDiv) userInfoDiv.textContent = "";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
});

// Save last visited page
window.addEventListener("beforeunload", () => {
  localStorage.setItem("lastPage", window.location.pathname);
});
