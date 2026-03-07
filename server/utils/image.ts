import fs from 'fs/promises'
import path from 'path'

export const saveBase64Image = async (base64: string, filename: string) => {
  // data:image/webp;base64,....
  const base64Data = base64.split(',')[1]
  if (!base64Data) return null

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  
  try {
    await fs.mkdir(uploadDir, { recursive: true })
  } catch (e) {}

  // Ensure unique filename if exists
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

  const buffer = Buffer.from(base64Data, 'base64')
  await fs.writeFile(finalPath, buffer)
  
  // Return the web path
  return `/uploads/${path.basename(finalPath)}`
}
