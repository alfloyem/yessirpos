const isTauri = () => typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__

const saveFileTauri = async (filename: string, content: string, ext: string) => {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { writeTextFile } = await import('@tauri-apps/plugin-fs')

  const filePath = await save({
    defaultPath: `${filename}.${ext}`,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  })

  if (filePath) {
    await writeTextFile(filePath, content)
  }
}

const saveFileWeb = (filename: string, content: string, mimeType: string, ext: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.${ext}`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportToCSV = async (filename: string, columns: any[], items: any[]) => {
  if (!items || !items.length) return

  const visibleColumns = columns.filter(c => c.visible !== false)
  const headers = visibleColumns.map(c => c.label)
  const keys = visibleColumns.map(c => c.key)

  let csvContent = headers.join(',') + '\n'
  items.forEach(row => {
    const rowValues = keys.map(key => {
      let val = row[key]
      if (val === null || val === undefined) val = ''
      const stringVal = String(val)
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`
      }
      return stringVal
    })
    csvContent += rowValues.join(',') + '\n'
  })

  const content = '\uFEFF' + csvContent
  if (isTauri()) {
    await saveFileTauri(filename, content, 'csv')
  } else {
    saveFileWeb(filename, content, 'text/csv;charset=utf-8;', 'csv')
  }
}

export const exportToJSON = async (filename: string, columns: any[], items: any[]) => {
  if (!items || !items.length) return

  const visibleColumns = columns.filter(c => c.visible !== false)
  const keys = visibleColumns.map(c => c.key)

  const cleanData = items.map(item => {
    const obj: any = {}
    keys.forEach(k => { obj[k] = item[k] })
    return obj
  })

  const content = JSON.stringify(cleanData, null, 2)
  if (isTauri()) {
    await saveFileTauri(filename, content, 'json')
  } else {
    saveFileWeb(filename, content, 'application/json;charset=utf-8;', 'json')
  }
}

export const exportToXML = async (filename: string, columns: any[], items: any[]) => {
  if (!items || !items.length) return

  const visibleColumns = columns.filter(c => c.visible !== false)
  const keys = visibleColumns.map(c => c.key)

  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<Root>\n'
  items.forEach((row, index) => {
    xmlContent += `  <Item id="${index + 1}">\n`
    keys.forEach(key => {
      let val = row[key]
      if (val === null || val === undefined) val = ''
      val = String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
      xmlContent += `    <${key}>${val}</${key}>\n`
    })
    xmlContent += '  </Item>\n'
  })
  xmlContent += '</Root>'

  if (isTauri()) {
    await saveFileTauri(filename, xmlContent, 'xml')
  } else {
    saveFileWeb(filename, xmlContent, 'application/xml;charset=utf-8;', 'xml')
  }
}

export const exportToPDF = (title: string, columns: any[], items: any[]) => {
  if (!items || !items.length) return

  const visibleColumns = columns.filter(c => c.visible !== false)

  const html = `
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
            <tr>${visibleColumns.map(c => `<th>${c.label}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${items.map(row => `<tr>${visibleColumns.map(c => `<td>${row[c.key] ?? ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body>
    </html>
  `

  const printWindow = window.open('', '', 'height=600,width=800')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
