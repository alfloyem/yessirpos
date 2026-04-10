import fs from 'fs/promises'
import path from 'path'
import { bucket } from './firebase'

export const saveBase64Image = async (base64: string, filename: string) => {
  const base64Data = base64.split(',')[1]
  if (!base64Data) return null
  const buffer = Buffer.from(base64Data, 'base64')

  const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // If Firebase bucket is available, upload there
  if (bucket) {
    try {
      const filePath = `uploads/${dateStr}/${filename}`
      const file = bucket.file(filePath)
      await file.save(buffer, {
        metadata: {
          contentType: base64.split(';')[0].split(':')[1] || 'image/webp',
        },
        public: true
      })
      return `https://storage.googleapis.com/${bucket.name}/${filePath}`
    } catch (error) {
      console.error('Firebase Storage Upload Error:', error)
    }
  }

  // Local fallback (Safe check for Vercel/Serverless)
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_BUILDER) {
     console.error('Local file storage is not supported on Vercel. Please configure Firebase Storage.')
     return null 
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', dateStr)
  try {
    await fs.mkdir(uploadDir, { recursive: true })
  } catch (e) {}

  let finalPath = path.join(uploadDir, filename)
  let counter = 1
  while (true) {
    try {
      await fs.access(finalPath)
      const ext = path.extname(filename)
      const base = path.basename(filename, ext)
      const newFilename = `${base}-${counter}${ext}`
      finalPath = path.join(uploadDir, newFilename)
      counter++
    } catch (err) {
      break
    }
  }

  try {
    await fs.writeFile(finalPath, buffer)
    const relativeWebPath = `/uploads/${dateStr}/${path.basename(finalPath)}`
    return relativeWebPath
  } catch (error) {
    console.error('Local File Write Error:', error)
    return null
  }
}
