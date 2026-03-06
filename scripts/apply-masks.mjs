/**
 * apply-masks.mjs
 * 
 * countries-masks-list.json'daki mask'ları countries.json'a uygular.
 * 
 * Mask format dönüşümü:
 *   countries-masks-list.json: "+994-##-###-##-##"  (#=rakam, +xxx prefix dahil)
 *   countries.json mask:        "99-999-99-99"       (9=rakam, country code olmadan)
 * 
 * Birden fazla mask varsa: en uzun olanı seçilir (en fazla # içeren).
 * Zaten mask'ı olan ülkeler korunur, üzerine yazılmaz.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const masksRaw = JSON.parse(readFileSync(resolve(ROOT, 'app/utils/countries-masks-list.json'), 'utf-8'))
const countries = JSON.parse(readFileSync(resolve(ROOT, 'app/utils/countries.json'), 'utf-8'))

/**
 * countries-masks-list.json formatındaki mask'ı Input.vue'nin applyMask fonksiyonu için
 * uygun formata dönüştürür.
 * 
 * Strateji: rawMask'tan başındaki phoneCode kısmını çıkar, kalan kısmı '9'lara dönüştür.
 * 
 * Desteklenen formatlar:
 *   "+994-##-###-##-##"  → (phoneCode=+994) → "99-999-99-99"
 *   "+90(###)###-####"   → (phoneCode=+90)  → "(999)999-9999"
 *   "+1(268)###-####"    → (phoneCode=+1268) → "999-9999"
 *   "+1(268)###-####"    → (phoneCode=+1)    → "(268)999-9999"  ← area code kalır
 */
function convertMaskFormat(rawMask, phoneCode) {
  // phoneCode'daki rakamları al
  const codeDigits = phoneCode.replace(/\D/g, '')
  
  // rawMask'tan '+' kaldır  
  let remaining = rawMask.slice(1) // '+' kaldır
  
  // rawMask'taki tüm sabit rakamları (başından itibaren) say, codeDigits uzunluğuna kadar atla
  // Ama dikkat: parantez içindeki rakamlar da sabit rakam sayılır
  let digitsSeen = 0
  let i = 0
  
  while (i < remaining.length && digitsSeen < codeDigits.length) {
    const ch = remaining[i]
    
    if (/\d/.test(ch)) {
      // Bu phone code'daki rakamla eşleşiyor mu?
      if (codeDigits[digitsSeen] === ch) {
        digitsSeen++
        i++
      } else {
        // Eşleşmedi - dur
        break
      }
    } else if (ch === '-' || ch === ' ') {
      // separator - atla
      i++
    } else if (ch === '(') {
      // parantez aç - atla (içindekiler digit olarak devam edecek)
      i++
    } else if (ch === ')') {
      // parantez kapat - atla
      i++
    } else {
      // '#' veya başka karakter - dur
      break
    }
  }
  
  // Eğer tüm codeDigits tüketilmediyse, bu mask phoneCode ile başlamıyor demektir
  // Bu durumda mask'ı olduğu gibi dönüştür (# → 9)
  if (digitsSeen < codeDigits.length) {
    return rawMask.replace(/\+/g, '').replace(/#/g, '9')
  }
  
  // i indeksinden sonraki separator'ları atla
  while (i < remaining.length && (remaining[i] === '-' || remaining[i] === ' ')) {
    i++
  }
  
  // Geri kalan kısmı al
  let result = remaining.slice(i)
  
  // '#' → '9' dönüştür, diğer karakterler olduğu gibi kalır
  result = result.replace(/#/g, '9')
  
  return result
}

/**
 * Birden fazla mask varsa en uzunu seç (en fazla # içeren)
 */
function pickBestMask(masks) {
  if (masks.length === 1) return masks[0]
  return masks.reduce((best, current) => {
    const bestCount = (best.match(/#/g) || []).length
    const currCount = (current.match(/#/g) || []).length
    return currCount > bestCount ? current : best
  })
}

// masks-list'i grupla: { code: [mask1, mask2, ...] }  (tekrarsız)
const maskMap = {}
for (const [code, maskValue] of Object.entries(masksRaw)) {
  if (!maskMap[code]) maskMap[code] = []
  if (!maskMap[code].includes(maskValue)) {
    maskMap[code].push(maskValue)
  }
}

// Sonuç istatistikleri
let updated = 0
let skipped = 0
let notFound = 0

const updatedCountries = countries.map(country => {
  // Zaten mask varsa, üzerine yazma
  if (country.mask) {
    skipped++
    return country
  }
  
  const masks = maskMap[country.value]
  if (!masks || masks.length === 0) {
    notFound++
    return country
  }
  
  const bestRawMask = pickBestMask(masks)
  const converted = convertMaskFormat(bestRawMask, country.phoneCode || '+0')
  
  if (!converted || converted.length < 2) {
    console.warn(`⚠️  ${country.value} (${country.label}): mask çok kısa: "${converted}" (kaynak: "${bestRawMask}")`)
    notFound++
    return country
  }
  
  // Hatalı dönüşüm kontrolü: ')' ile başlıyorsa sorun var demektir
  if (converted.startsWith(')')) {
    console.warn(`⚠️  ${country.value} (${country.label}): hatalı mask: "${converted}" (kaynak: "${bestRawMask}", phoneCode: "${country.phoneCode}")`)
    // Basit fallback: sadece # → 9, + ve kod dışarıda bırak
    const fallback = bestRawMask.replace(/\+\d+/g, '').replace(/^[-\s]+/, '').replace(/#/g, '9')
    if (fallback && fallback.length >= 2) {
      updated++
      console.log(`   → Fallback: "${fallback}"`)
      return { ...country, mask: fallback }
    }
    notFound++
    return country
  }
  
  updated++
  if (masks.length > 1) {
    console.log(`ℹ️  ${country.value}: ${masks.length} mask → "${bestRawMask}" → "${converted}"`)
  }
  return { ...country, mask: converted }
})

writeFileSync(
  resolve(ROOT, 'app/utils/countries.json'),
  JSON.stringify(updatedCountries, null, 2),
  'utf-8'
)

console.log(`\n📊 Sonuç:`)
console.log(`   ✅ Güncellendi: ${updated}`)
console.log(`   ⏭️  Atlandı (zaten mask vardı): ${skipped}`)
console.log(`   ❌ Bulunamadı/Dönüştürülemedi: ${notFound}`)
console.log(`\n✨ countries.json güncellendi!`)
