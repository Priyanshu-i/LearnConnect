import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGESERVICE_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  databaseURL: "https://fireex-c1008-default-rtdb.firebaseio.com", // For Realtime Database
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

// Initialize Firebase services
const auth = getAuth(app)
const db = getFirestore(app)
const rtdb = getDatabase(app)
const storage = getStorage(app);

export { app, auth, db, rtdb, storage }
