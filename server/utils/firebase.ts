import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

if (!admin.apps.length) {
  try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    } else {
      const relativePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'firebase/yessirpos-firebase-adminsdk-fbsvc-345b44c4a5.json'
      const serviceAccountPath = path.resolve(process.cwd(), relativePath)
      if (fs.existsSync(serviceAccountPath)) {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8')
        serviceAccount = JSON.parse(fileContent)
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log('Firebase Admin Initialized Successfully')
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
  }
}

export const messaging = admin.apps.length ? admin.messaging() : null
