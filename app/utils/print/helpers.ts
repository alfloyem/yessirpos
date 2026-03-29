import JsBarcode from 'jsbarcode'

/**
 * Generates a Base64 data URL string for a CODE128 barcode.
 */
export const generateBarcodeDataUrl = (
  text: string, 
  options: { width?: number; height?: number; displayValue?: boolean; fontSize?: number; margin?: number } = {}
): string => {
  try {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: options.width ?? 2,
      height: options.height ?? 40,
      displayValue: options.displayValue ?? true,
      fontSize: options.fontSize ?? 12,
      margin: options.margin ?? 5,
    })
    return canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Barcode generation error:', err)
    return ''
  }
}

/**
 * Generic logic to open a print window, write HTML, and trigger print dialog.
 */
export const executePrintWindow = (
  htmlContent: string, 
  windowOptions: { width: number; height: number; dynamicHeight?: boolean }
) => {
  const { dynamicHeight } = windowOptions
  
  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  if (iframe.contentWindow) {
    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(htmlContent)
    doc.close()

    setTimeout(() => {
      if (dynamicHeight) {
        // Calculate dynamic height for thermal printers
        const body = doc.body
        const scrollHeight = body.scrollHeight
        const heightMm = Math.ceil(scrollHeight * 0.2646) + 15 // px approach
        const style = doc.createElement('style')
        style.textContent = `@page { margin: 0; size: 80mm ${heightMm}mm; }`
        doc.head.appendChild(style)
      }
      
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      
      // Cleanup after a delay
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 500)
  }
}
