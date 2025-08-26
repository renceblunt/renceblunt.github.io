// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Your config
const firebaseConfig = {
  apiKey: "AIzaSyC4DHI8aBVY4JjTvJ-r-TGIDPsewtEWxzU",
  authDomain: "silent-depth.firebaseapp.com",
  projectId: "silent-depth",
  storageBucket: "silent-depth.appspot.com",
  messagingSenderId: "78008755450",
  appId: "1:78008755450:web:3fd0f0f298a08820935543",
  measurementId: "G-WSWDCB7KD8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elements
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const messageEl = document.getElementById("message");

document.getElementById("signupBtn").addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailEl.value, passwordEl.value);
    messageEl.textContent = "✅ Sign up successful. Ask dev to mark you as Admin.";
  } catch (err) {
    messageEl.textContent = "❌ " + err.message;
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, emailEl.value, passwordEl.value);
    messageEl.textContent = "✅ Login successful!";
    window.location.href = "admin.html"; // redirect to admin panel
  } catch (err) {
    messageEl.textContent = "❌ " + err.message;
  }
});
