import { initializeApp } from 'firebase/app'
import { getAuth as firebaseGetAuth } from 'firebase/auth'
import { getFirestore as firebaseGetFirestore } from 'firebase/firestore'
import { getStorage as firebaseGetStorage } from 'firebase/storage'

let _app: any = null
let _auth: any = null
let _db: any = null
let _storage: any = null

export function initializeFirebase() {
  if (_app) return { app: _app, auth: _auth, db: _db, storage: _storage }

  // This function must be called from a Nuxt context (composable, plugin, etc.)
  // where useRuntimeConfig() is available
  let config: any
  try {
    config = useRuntimeConfig()
  } catch (e) {
    throw new Error('Firebase configuration must be initialized from within a Nuxt context. Make sure you are calling this from a composable, plugin, or middleware.')
  }

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
    measurementId: config.public.firebaseMeasurementId
  }

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Firebase configuration is incomplete. Please check your environment variables.')
  }

  _app = initializeApp(firebaseConfig)
  _auth = firebaseGetAuth(_app)
  _db = firebaseGetFirestore(_app)
  _storage = firebaseGetStorage(_app)

  return { app: _app, auth: _auth, db: _db, storage: _storage }
}

export default initializeFirebase