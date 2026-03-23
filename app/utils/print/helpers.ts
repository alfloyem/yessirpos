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
  const { width, height, dynamicHeight } = windowOptions
  const printWin = window.open('', '', `width=${width},height=${height}`)
  if (printWin) {
    printWin.document.write(htmlContent)
    printWin.document.close()
    printWin.focus()

    setTimeout(() => {
      if (dynamicHeight) {
        // dynamically adjust `@page` size based on body height for thermal printers to cut precisely
        const body = printWin.document.body
        const heightMm = Math.ceil(body.scrollHeight * 0.2646) + 10 // px to mm + buffer
        const style = printWin.document.createElement('style')
        style.textContent = `@page { margin: 0; size: 80mm ${heightMm}mm; }`
        printWin.document.head.appendChild(style)
      }
      printWin.print()
      printWin.close()
    }, 400)
  }
}
