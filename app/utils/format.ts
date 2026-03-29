/**
 * Telefon nömrəsini WhatsApp linki üçün formatlayır.
 * Azərbacan nömrələri üçün (050... -> 99450...) avtomatik düzəliş edir.
 */
export const formatWhatsAppLink = (phone: string | number): string => {
  if (!phone) return ''
  
  // Rəqəmlərdən başqa hər şeyi təmizlə
  let cleaned = String(phone).replace(/[^0-9]/g, '')
  
  if (!cleaned) return ''

  // Əgər nömrə 0-la başlayırsa və 10 rəqəmlidirsə (məs: 0501234567)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '994' + cleaned.substring(1)
  } 
  // Əgər nömrə 9-la başlamırsa və 9 rəqəmlidirsə (məs: 501234567)
  else if (!cleaned.startsWith('994') && cleaned.length === 9) {
    cleaned = '994' + cleaned
  }

  return `https://wa.me/${cleaned}`
}
