import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC4DHI8aBVY4JjTvJ-r-TGIDPsewtEWxzU",
  authDomain: "silent-depth.firebaseapp.com",
  projectId: "silent-depth",
  storageBucket: "silent-depth.appspot.com",
  messagingSenderId: "78008755450",
  appId: "1:78008755450:web:3fd0f0f298a08820935543"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sidebar navigation
const links = document.querySelectorAll(".sidebar nav a");
const sections = document.querySelectorAll(".form-section");
links.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    links.forEach(l => l.classList.remove("active"));
    link.classList.add("active");
    sections.forEach(sec => sec.classList.add("hidden"));
    const target = document.getElementById(link.dataset.section);
    if(target) target.classList.remove("hidden");
  });
});

// --- Admin Management ---
const adminsTable = document.getElementById("adminsTable").querySelector("tbody");
const addAdminForm = document.getElementById("addAdminForm");

const loadAdmins = async () => {
  adminsTable.innerHTML = "";
  const snapshot = await getDocs(collection(db, "admins"));
  snapshot.forEach(docItem => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${docItem.data().email}</td>
      <td><button class="delete-btn">Delete</button></td>
    `;
    tr.querySelector(".delete-btn").addEventListener("click", async () => {
      if(confirm("Delete this admin?")) {
        await deleteDoc(doc(db, "admins", docItem.id));
        tr.remove();
      }
    });
    adminsTable.appendChild(tr);
  });
};

// Add Admin
addAdminForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = addAdminForm.querySelector("input").value;
  await addDoc(collection(db, "admins"), { email });
  addAdminForm.reset();
  loadAdmins();
});

// --- Users Management ---
const usersTable = document.getElementById("usersTable").querySelector("tbody");

const loadUsers = async () => {
  usersTable.innerHTML = "";
  const snapshot = await getDocs(collection(db, "users"));
  snapshot.forEach(docItem => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${docItem.data().email}</td>
      <td><button class="delete-btn">Delete</button></td>
    `;
    tr.querySelector(".delete-btn").addEventListener("click", async () => {
      if(confirm("Delete this user?")) {
        await deleteDoc(doc(db, "users", docItem.id));
        tr.remove();
      }
    });
    usersTable.appendChild(tr);
  });
};

// Initial load
loadAdmins();
loadUsers();
