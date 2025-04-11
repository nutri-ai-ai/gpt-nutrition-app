// src/lib/firebase.ts

import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCPdMSVdE63XrdmlPmnnXvNEAJNoG9-4D0",
  authDomain: "nutri-ai-e56a8.firebaseapp.com",
  projectId: "nutri-ai-e56a8",
  storageBucket: "nutri-ai-e56a8.appspot.com",
  messagingSenderId: "115886841795",
  appId: "1:115886841795:web:fea22da28fe41c10532776",
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)
