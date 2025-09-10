// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCSFvwCO0DLk6PlCTqP-JpHyGov0IG2S5Q",
  authDomain: "organ-donor-management-system.firebaseapp.com",
  projectId: "organ-donor-management-system",
  storageBucket: "organ-donor-management-system.appspot.com",
  messagingSenderId: "487567344580",
  appId: "1:487567344580:web:2f2143ed93ae8709cc5a91",
  measurementId: "G-28R5PRZ92V",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { serverTimestamp };

// Setup invisible reCAPTCHA correctly
export const setupRecaptcha = (containerId = "recaptcha-container") => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(
      containerId,
      { size: "invisible", callback: () => {} },
      auth
    );
  }
  return window.recaptchaVerifier;
};
