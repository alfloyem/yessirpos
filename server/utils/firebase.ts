import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

// Initialize Firebase Admin globally only once
if (!admin.apps.length) {
  try {
    // Adjust path based on project root.
    const relativePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'firebase/yessirpos-firebase-adminsdk-fbsvc-c14f75346f.json'
    const serviceAccountPath = path.resolve(process.cwd(), relativePath)
    const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8')
    const serviceAccount = JSON.parse(fileContent)

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
    console.log('Firebase Admin Initialized Successfully')
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
  }
}

export const messaging = admin.apps.length ? admin.messaging() : null
