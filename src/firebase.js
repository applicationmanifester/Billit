import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA0f_l74GJu4jxLHVcTLzSy7mt7Wwe-i8Q",
    authDomain: "billit-88039090-1a029.firebaseapp.com",
    projectId: "billit-88039090-1a029",
    storageBucket: "billit-88039090-1a029.firebasestorage.app",
    messagingSenderId: "35173805153",
    appId: "1:35173805153:web:4d35686dd165abde8bce20"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
