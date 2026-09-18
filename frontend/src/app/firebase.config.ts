import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAltU2F81FAXNEYcExbdB3PwC-Xan79TDY",
  authDomain: "lernkarten-app-14706.firebaseapp.com",
  projectId: "lernkarten-app-14706",
  storageBucket: "lernkarten-app-14706.firebasestorage.app",
  messagingSenderId: "93942329262",
  appId: "1:93942329262:web:01cee722187871630ce23f"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);