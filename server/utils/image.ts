import fs from 'fs/promises'
import path from 'path'
import { bucket } from './firebase'

export const saveBase64Image = async (base64: string, filename: string) => {
  const base64Data = base64.split(',')[1]
  if (!base64Data) return null
  const buffer = Buffer.from(base64Data, 'base64')

  // If Firebase bucket is available, upload there
  if (bucket) {
    try {
      const file = bucket.file(`uploads/${filename}`)
      await file.save(buffer, {
        metadata: {
          contentType: base64.split(';')[0].split(':')[1] || 'image/webp',
        },
        public: true
      })
      // Return the public URL
      return `https://storage.googleapis.com/${bucket.name}/uploads/${filename}`
    } catch (error) {
      console.error('Firebase Storage Upload Error:', error)
      // Fallback to local if possible
    }
  }

  // Local fallback
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
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
    return `/uploads/${path.basename(finalPath)}`
  } catch (error) {
    console.error('Local File Write Error:', error)
    throw error // Re-throw to be caught by handler as 500
  }
}
