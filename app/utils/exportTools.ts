export const exportToJSON = (filename: string, columns: any[], data: any[]) => {
  if (!data || !data.length) return
  
  const visibleColumns = columns.filter(c => c.visible !== false)
  const keys = visibleColumns.map(c => c.key)
  
  const cleanData = data.map(item => {
    const obj: any = {}
    keys.forEach(k => {
      obj[k] = item[k]
    })
    return obj
  })

  const jsonContent = JSON.stringify(cleanData, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToXML = (filename: string, columns: any[], data: any[]) => {
  if (!data || !data.length) return

  const visibleColumns = columns.filter(c => c.visible !== false)
  const keys = visibleColumns.map(c => c.key)

  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<Root>\n'
  
  data.forEach((row, index) => {
    xmlContent += `  <Item id="${index + 1}">\n`
    keys.forEach(key => {
      let val = row[key]
      if (val === null || val === undefined) val = ''
      // Escape XML characters
      val = String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
      xmlContent += `    <${key}>${val}</${key}>\n`
    })
    xmlContent += '  </Item>\n'
  })
  
  xmlContent += '</Root>'

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.xml`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToPDF = (title: string, columns: any[], data: any[]) => {
  if (!data || !data.length) return

  const visibleColumns = columns.filter(c => c.visible !== false)
  
  let html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              ${visibleColumns.map(c => `<th>${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${visibleColumns.map(c => `<td>${row[c.key] || ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `

  const printWindow = window.open('', '', 'height=600,width=800')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
