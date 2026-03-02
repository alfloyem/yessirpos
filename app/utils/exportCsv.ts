export const exportToCSV = (filename: string, columns: any[], data: any[]) => {
  if (!data || !data.length) return
  
  // Sadece görünür kolonları filtrele
  const visibleColumns = columns.filter(c => c.visible !== false)
  const headers = visibleColumns.map(c => c.label)
  const keys = visibleColumns.map(c => c.key)

  let csvContent = headers.join(',') + '\n'

  data.forEach(row => {
    const rowValues = keys.map(key => {
      let val = row[key]
      if (val === null || val === undefined) val = ''
      // Virgül veya özel karakter içeriyorsa tırnak içine al
      const stringVal = String(val)
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`
      }
      return stringVal
    })
    csvContent += rowValues.join(',') + '\n'
  })

  // Blob oluştur ve indir
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
