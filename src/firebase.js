import {initializeApp} from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAasppo2ewZkkmw217cIOXydu-OhWb6kVE",
  authDomain: "conflui-web.firebaseapp.com",
  projectId: "conflui-web",
  storageBucket: "conflui-web.firebasestorage.app",
  messagingSenderId: "356412042107",
  appId: "1:356412042107:web:2f91f5d957b68ff1a92bde"
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);   