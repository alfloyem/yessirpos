import fs from 'fs/promises'
import path from 'path'

// Use env variable for portability, fallback to known server path
const IMG_DIR = process.env.IMG_DIR || '/root/BakuStreet/img/product-images'

export const saveBase64Image = async (base64: string, filename: string) => {
  const base64Data = base64.split(',')[1]
  if (!base64Data) return null
  const buffer = Buffer.from(base64Data, 'base64')

  const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const uploadDir = path.join(IMG_DIR, dateStr)
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
    const relativeWebPath = `/product-images/${dateStr}/${path.basename(finalPath)}`
    return relativeWebPath
  } catch (error) {
    console.error('Local File Write Error:', error)
    return null
  }
}
