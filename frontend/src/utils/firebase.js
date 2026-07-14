import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCFsg3LWJHVM3Ogxto6xVc6XbabhHzUIVQ",
  authDomain: "stacks-c30ae.firebaseapp.com",
  projectId: "stacks-c30ae",
  storageBucket: "stacks-c30ae.firebasestorage.app",
  messagingSenderId: "233204364775",
  appId: "1:233204364775:web:b541c81f6ea9c85586b942",
  measurementId: "G-YS4K5FWC5C"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
