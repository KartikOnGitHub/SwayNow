import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔧 Replace these values with your Firebase project config
// Firebase Console → Project Settings → Your Apps → SDK setup
const firebaseConfig = {
    apiKey: "AIzaSyCMAYW5dUWOIBZIYIgQ_eDzEFGc6TInQWY",
    authDomain: "sway-29d10.firebaseapp.com",
    projectId: "sway-29d10",
    storageBucket: "sway-29d10.firebasestorage.app",
    messagingSenderId: "509600865269",
    appId: "1:509600865269:web:ede6dceefe15cf870b1ebc",
    measurementId: "G-DNLRKVR5KH"
};

// Prevent re-initialization on hot reload (Next.js dev mode)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
