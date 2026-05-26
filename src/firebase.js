import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDNYvT3rPTntbEF9zlldnSqIt69dC968Lg",
  authDomain: "patrimonio-tracker-a82ac.firebaseapp.com",
  projectId: "patrimonio-tracker-a82ac",
  storageBucket: "patrimonio-tracker-a82ac.firebasestorage.app",
  messagingSenderId: "991768609579",
  appId: "1:991768609579:web:021d6cebd7154a9794bb6e",
  measurementId: "G-RN0QBRN87N"
};

const app    = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const provider = new GoogleAuthProvider();

export const loginGoogle = () => signInWithPopup(auth, provider);
export const logout      = () => signOut(auth);

export const loadData = async (uid) => {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().patrimonio : null;
};

export const saveData = async (uid, data) => {
  const ref = doc(db, "usuarios", uid);
  await setDoc(ref, { patrimonio: data }, { merge: true });
};
