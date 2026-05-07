import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase configuration - using direct access to public env vars
const firebaseConfig = {
  apiKey: 'AIzaSyDiA2brsH0mNa-gyRw6B-sULrckBon6CKk',
  authDomain: 'minegocioclarodb.firebaseapp.com',
  projectId: 'minegocioclarodb',
  storageBucket: 'minegocioclarodb.firebasestorage.app',
  messagingSenderId: '303380906841',
  appId: '1:303380906841:web:6397a3e03eefdb55a88248',
  measurementId: 'G-D123M82HF7'
}

// Validate required config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Firebase configuration is incomplete. Please check your environment variables.')
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app