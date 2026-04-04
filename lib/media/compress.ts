// lib/media/compress.ts — Client-side Image Compression (v16 Gold)
// Canvas API → compress before upload → 3x more Puter storage
// Zero server, zero Vercel, zero cost

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number  // 0-1
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png'
}

export interface CompressResult {
  blob: Blob
  dataUrl: string
  originalSize: number
  compressedSize: number
  width: number
  height: number
  savedPercent: number
}

// ── Main compression function ─────────────────────────────
export async function compressImage(
  file: File | Blob,
  opts: CompressOptions = {}
): Promise<CompressResult> {
  const {
    maxWidth  = 1200,
    maxHeight = 1200,
    quality   = 0.82,
    outputFormat = 'image/jpeg',
  } = opts

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width: origW, height: origH } = img

      // Calculate new dimensions (maintain aspect ratio)
      let w = origW
      let h = origH
      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Compression failed')); return }
          const reader = new FileReader()
          reader.onload = () => {
            resolve({
              blob,
              dataUrl: reader.result as string,
              originalSize: file.size,
              compressedSize: blob.size,
              width: w,
              height: h,
              savedPercent: Math.round((1 - blob.size / file.size) * 100),
            })
          }
          reader.readAsDataURL(blob)
        },
        outputFormat,
        quality
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

// ── Thumbnail generator (120x120) ─────────────────────────
export async function generateThumbnail(
  file: File | Blob,
  size = 120
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width  = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!

      // Crop to square from center
      const side = Math.min(img.width, img.height)
      const sx   = (img.width - side) / 2
      const sy   = (img.height - side) / 2
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
    img.src = url
  })
}

// ── Smart compress based on file size ────────────────────
export async function smartCompress(file: File): Promise<{ blob: Blob; thumb: string; saved: string }> {
  const MB = file.size / 1024 / 1024
  const opts: CompressOptions = MB > 5
    ? { maxWidth: 1024, quality: 0.75 }  // Big file — more aggressive
    : MB > 2
    ? { maxWidth: 1200, quality: 0.80 }
    : { maxWidth: 1200, quality: 0.85 }  // Small file — gentle

  const [compressed, thumb] = await Promise.all([
    compressImage(file, opts),
    generateThumbnail(file)
  ])

  return {
    blob: compressed.blob,
    thumb,
    saved: `${compressed.savedPercent}% smaller (${(file.size/1024).toFixed(0)}KB → ${(compressed.blob.size/1024).toFixed(0)}KB)`,
  }
}
