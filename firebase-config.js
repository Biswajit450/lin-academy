// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDgJowFUpgzqf9nEyW6vPowdqGSw1WcBSM",
    authDomain: "lin-academy.firebaseapp.com",
    projectId: "lin-academy",
    storageBucket: "lin-academy.firebasestorage.app",
    messagingSenderId: "138973997932",
    appId: "1:138973997932:web:3e2a41b1774c8a9e69a149",
    measurementId: "G-9Z8VZKV7CH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

window.laAuth = auth;
window.laDb = db;
window.laStorage = storage;

// The Magic Export: Taaki baaki 4 files in connections ka use kar sakein
export { auth, db, storage, googleProvider };