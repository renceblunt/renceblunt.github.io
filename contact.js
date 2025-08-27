// Import the functions you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
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
const db = getFirestore(app);

// Handle Contact Form Submit
const contactForm = document.getElementById("contactForm");
const submitMsg = document.getElementById("submit-msg");

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get form values
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;

    try {
      await addDoc(collection(db, "messages"), {
        name: name,
        email: email,
        message: message,
        timestamp: serverTimestamp(),
      });

      submitMsg.textContent = "✅ Message sent successfully!";
      submitMsg.style.color = "green";
      contactForm.reset();
    } catch (error) {
      console.error("Error adding document: ", error);
      submitMsg.textContent = "❌ Failed to send message. Try again.";
      submitMsg.style.color = "red";
    }
  });
}
