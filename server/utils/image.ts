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

// Deletes a local product image given its web path (e.g. /product-images/2026-04-19/foo.webp)
// Only deletes files that live inside IMG_DIR — ignores external URLs
export const deleteImage = async (webPath: string): Promise<void> => {
  if (!webPath || !webPath.startsWith('/product-images/')) return
  try {
    const relativePart = webPath.replace('/product-images/', '')
    const absolutePath = path.join(IMG_DIR, relativePart)
    // Safety check: ensure the resolved path is still inside IMG_DIR
    if (!absolutePath.startsWith(path.resolve(IMG_DIR))) return
    await fs.unlink(absolutePath)
  } catch (e: any) {
    if (e.code !== 'ENOENT') console.error('Image delete error:', e)
  }
}

// Deletes all images from a JSON string array (as stored in product.images field)
export const deleteImages = async (imagesJson: string | null): Promise<void> => {
  if (!imagesJson) return
  try {
    const paths: string[] = JSON.parse(imagesJson)
    await Promise.all(paths.map(deleteImage))
  } catch (e) {
    console.error('deleteImages parse error:', e)
  }
}
