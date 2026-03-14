<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiIcon from '~/components/ui/Icon.vue'
import Modal from '~/components/ui/Modal.vue'

import SalesProductSaleCard from '~/components/sales/ProductSaleCard.vue'
import SalesCartSidebar from '~/components/sales/CartSidebar.vue'

const { t } = useI18n()
const { token, user } = useAuth()
const toast = useToast()

const shiftReceiptCount = ref(0)

useHead({
  title: t('menu.sales', 'Satışlar')
})

// --- Data ---
const products = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('Bütün Mallar')
const customers = ref<any[]>([])
const selectedCustomer = ref<any>(null)
const employees = ref<any[]>([])
const selectedEmployee = ref<any>(null)

// Cart state
const cart = ref<any[]>([])
const discount = ref<number | string>(0)
const discountType = ref<'amount' | 'percent'>('amount')

// DOM refs
const searchInput = ref<any>(null)

// Modal states
const showPaymentModal = ref(false)
const showGhostModal = ref(false)
const paymentMethod = ref('Nəğd')
const paymentDetails = ref<any>(null)
const isSaving = ref(false)

// Manage Payment Methods State (Only storage, management moved to component)
const paymentMethods = ref<any[]>([])

// --- Draft Logic ---
const drafts = ref<any[]>([])
const showDraftsModal = ref(false)

const loadShiftCount = () => {
  const today = new Date().toISOString().split('T')[0]
  // Reset for a fresh start as requested
  localStorage.removeItem(`shift_count_${today}`)
  shiftReceiptCount.value = 0
}

const loadDrafts = () => {
  const saved = localStorage.getItem('yessir_pos_drafts')
  if (saved) {
    try {
      drafts.value = JSON.parse(saved)
    } catch (e) {
      drafts.value = []
    }
  }
}

const saveDraft = () => {
  if (cart.value.length === 0) return
  
  const draftName = selectedCustomer.value 
    ? `Müştəri: ${selectedCustomer.value.firstName} ${selectedCustomer.value.lastName}`
    : `Səbət (${cart.value.length} məhsul)`

  const draft = {
    id: Date.now(),
    name: draftName,
    time: new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
    cart: JSON.parse(JSON.stringify(cart.value)),
    discount: discount.value,
    discountType: discountType.value,
    selectedCustomer: selectedCustomer.value,
    subtotal: subtotal.value,
    finalTotal: finalTotal.value
  }

  drafts.value.push(draft)
  localStorage.setItem('yessir_pos_drafts', JSON.stringify(drafts.value))
  
  clearCart()
  selectedCustomer.value = null
  selectedEmployee.value = null
  toast.success('Satış müvəqqəti yadda saxlanıldı!')
}

const restoreDraft = (index: number) => {
  const draft = drafts.value[index]
  cart.value = draft.cart
  discount.value = draft.discount
  discountType.value = draft.discountType
  discountType.value = draft.discountType
  
  drafts.value.splice(index, 1)
  localStorage.setItem('yessir_pos_drafts', JSON.stringify(drafts.value))
  showDraftsModal.value = false
  toast.success('Müvəqqəti satış geri qaytarıldı')
}

const deleteDraft = (index: number) => {
  drafts.value.splice(index, 1)
  localStorage.setItem('yessir_pos_drafts', JSON.stringify(drafts.value))
}

// --- Ghost Product Logic ---

const ghostProduct = ref({
  productName: '',
  retailPrice: ''
})

const addGhostProduct = () => {
  if (!ghostProduct.value.productName || !ghostProduct.value.retailPrice) {
    toast.error('Ad və qiymət daxil edilməlidir')
    return
  }

  const id = `ghost-${Date.now()}`
  const product = {
    id,
    productName: ghostProduct.value.productName,
    retailPrice: Number(ghostProduct.value.retailPrice),
    barcode: 'GHOST',
    qty: 1,
    itemDiscount: 0,
    itemDiscountType: 'amount'
  }

  addToCart(product)
  showGhostModal.value = false
  ghostProduct.value = { productName: '', retailPrice: '' }
  nextTick(() => {
    focusSearch()
  })
}

const focusSearch = () => {
  if (searchInput.value) {
    // If it's a component, try focus method or $el
    if (typeof searchInput.value.focus === 'function') {
      searchInput.value.focus()
    } else {
      searchInput.value.$el?.querySelector('input')?.focus()
    }
  }
}

// --- Load Products ---
const loadProducts = async () => {
  loading.value = true
  try {
    const data = await $fetch<any[]>('/api/products', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    products.value = data || []
  } catch (err: any) {
    toast.error(t('toast.loadingError', 'Mallar yüklənərkən xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

const loadPaymentMethods = async () => {
  try {
    const data = await $fetch<any[]>('/api/payment-methods')
    paymentMethods.value = data || []
  } catch (err) {
    console.error('Failed to load payment methods:', err)
  }
}

const loadCustomers = async () => {
  try {
    const data = await $fetch<any[]>('/api/customers', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    customers.value = data || []
  } catch (err) {
    console.error('Failed to load customers')
  }
}

const loadEmployees = async () => {
  try {
    const data = await $fetch<any[]>('/api/employees', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    employees.value = data || []
  } catch (err) {
    console.error('Failed to load employees')
  }
}

onMounted(() => {
  loadProducts()
  loadCustomers()
  loadEmployees()
  loadPaymentMethods()
  loadDrafts()
  loadShiftCount()
  // Ensure focus on load
  setTimeout(focusSearch, 500)
})

// --- Barcode Auto-Add Logic ---
watch(searchQuery, (newVal) => {
  if (!newVal || newVal.length < 3) return // Barcodes are usually longer

  // Check if it's an exact match in the raw products list
  const matched = products.value.find(p => String(p.barcode) === newVal)
  
  if (matched) {
    addToCart(matched)
    searchQuery.value = ''
    nextTick(() => {
      focusSearch()
    })
  }
})

// --- Computed ---
const groupProducts = (list: any[]) => {
  const roots = list.filter(p => !p.parentProductId)
  const variants = list.filter(p => p.parentProductId)
  
  return roots.map(root => ({
    ...root,
    variants: variants.filter((v: any) => v.parentProductId === root.id)
  }))
}

const categories = computed(() => {
  const cats = new Set<string>()
  products.value.forEach(p => {
    if (Array.isArray(p.category)) {
      p.category.forEach((c: string) => cats.add(c))
    } else if (p.category) {
      cats.add(p.category)
    }
  })
  return ['Bütün Mallar', ...Array.from(cats)]
})

const filteredProductGroups = computed(() => {
  let list = products.value
  
  // Category filter
  if (selectedCategory.value !== 'Bütün Mallar') {
    list = list.filter(p => {
      const cat = p.category
      if (Array.isArray(cat)) return cat.includes(selectedCategory.value)
      return cat === selectedCategory.value
    })
  }

  // Group everything initially
  const grouped = groupProducts(list)
  
  // Search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    return grouped.filter(group => {
      // Matches parent name/barcode
      const parentMatch = 
        (group.productName && group.productName.toLowerCase().includes(q)) || 
        (group.barcode && String(group.barcode).toLowerCase().includes(q))
      
      // OR matches any variant name/barcode
      const variantMatch = group.variants.some((v: any) => 
        (v.productName && v.productName.toLowerCase().includes(q)) || 
        (v.barcode && String(v.barcode).toLowerCase().includes(q))
      )
      
      return parentMatch || variantMatch
    })
  }

  // Default: showing grouped products
  return grouped
})

const subtotal = computed(() => {
  return cart.value.reduce((sum, item) => {
    const price = Number(item.retailPrice) || 0
    const d = Number(item.itemDiscount) || 0
    let linePrice = price
    if (item.itemDiscountType === 'percent') {
      linePrice = price * (1 - d / 100)
    } else {
      linePrice = price - d
    }
    return sum + (Math.max(0, linePrice) * item.qty)
  }, 0)
})

const finalTotal = computed(() => {
  const d = Number(discount.value) || 0
  if (discountType.value === 'percent') {
    return Math.max(0, subtotal.value * (1 - d / 100))
  }
  return Math.max(0, subtotal.value - d)
})

const cashbackAmount = computed(() => {
  return (finalTotal.value * 0.05).toFixed(2)
})

// --- Cart Handlers ---
const addToCart = (product: any) => {
  if (!product.retailPrice && !product.wholesalePrice) {
    toast.error('Bu məhsulun qiyməti yoxdur.')
    return
  }
  
  const existing = cart.value.find(item => item.id === product.id)
  if (existing) {
    existing.qty++
  } else {
    cart.value.push({ 
      ...product, 
      qty: 1,
      itemDiscount: 0,
      itemDiscountType: 'amount'
    })
  }
}

const updateItemDiscount = (item: any, val: number | string) => {
  item.itemDiscount = val
}

const updateItemDiscountType = (item: any, val: 'amount' | 'percent') => {
  item.itemDiscountType = val
}

const increaseQty = (item: any) => {
  item.qty++
}

const updateQty = (item: any, val: number) => {
  item.qty = Math.max(1, val)
}

const decreaseQty = (item: any) => {
  if (item.qty > 1) {
    item.qty--
  } else {
    removeFromCart(item)
  }
}

const removeFromCart = (item: any) => {
  const idx = cart.value.findIndex(i => i.id === item.id)
  if (idx !== -1) cart.value.splice(idx, 1)
}

const clearCart = () => {
  cart.value = []
  discount.value = 0
}

const handlePayment = () => {
  if (cart.value.length === 0) {
    toast.error('Səbət boşdur!')
    return
  }
  if (!selectedEmployee.value) {
    toast.error('Zəhmət olmasa Kassir (əməkdaş) seçin!')
    return
  }
  showPaymentModal.value = true
}

// --- Print Receipt Feature ---
const printReceipt = (manualReceiptNo?: string) => {
  const currentDate = new Date().toLocaleString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  const receiptNo = manualReceiptNo || `S${Date.now().toString().slice(-8)}`
  const cashierName = selectedEmployee.value 
    ? `${selectedEmployee.value.firstName} ${selectedEmployee.value.lastName}` 
    : (user.value?.firstName ? `${user.value.firstName} ${user.value.lastName}` : 'Məlum deyil')

  const itemsHtml = cart.value.map(item => {
    const price = Number(item.retailPrice) || 0
    const d = Number(item.itemDiscount) || 0
    let linePrice = price
    if (item.itemDiscountType === 'percent') {
      linePrice = price * (1 - d / 100)
    } else {
      linePrice = price - d
    }
    const finalPrice = Math.max(0, linePrice)
    const totalLine = finalPrice * item.qty
    const hasDiscount = d > 0

    const cleanName = item.productName.replace(/\s+\d+$/, '')
    let attrStr = ''
    if (item.attribute && Array.isArray(item.attribute)) {
      attrStr = item.attribute.map((a: string) => a.split(':').pop()?.trim()).join(', ')
    }

    return `
      <div style="margin-bottom: 8px; border-bottom: 1px dotted #eee; padding-bottom: 4px;">
        <div style="font-weight: bold; font-size: 13px;">${cleanName}</div>
        <div style="font-size: 10px; color: #555;">
          ${item.barcode || ''} ${attrStr ? ` | ${attrStr}` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px; font-family: monospace; font-size: 12px;">
          <span>${item.qty.toFixed(2)} x ${price.toFixed(2)}</span>
          <span>${(price * item.qty).toFixed(2)}</span>
        </div>
        ${hasDiscount ? `
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #000; font-style: italic;">
            <span>Endirim (${item.itemDiscountType === 'percent' ? d + '%' : d.toFixed(2) + ' ₼'}):</span>
            <span>-${((price - finalPrice) * item.qty).toFixed(2)} ₼</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 2px;">
            <span>${item.qty.toFixed(2)} x ${finalPrice.toFixed(2)}</span>
            <span>${totalLine.toFixed(2)} ₼</span>
          </div>
        ` : ''}
      </div>
    `
  }).join('')

  const customerInfoHtml = selectedCustomer.value ? `
    <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin-bottom: 10px; font-size: 11px;">
      <div style="font-weight: bold;">MÜŞTƏRİ: ${selectedCustomer.value.firstName} ${selectedCustomer.value.lastName}</div>
    </div>
  ` : ''

  const discountVal = Number(discount.value) || 0
  const discountAmount = subtotal.value - finalTotal.value
  
  const summaryHtml = `
    <div style="font-size: 12px; margin-top: 5px; border-top: 2px solid #000; padding-top: 5px;">
      <div style="display: flex; justify-content: space-between;">
        <span>Ara Cəmi:</span>
        <span>${subtotal.value.toFixed(2)} ₼</span>
      </div>
      ${discountVal > 0 ? `
        <div style="display: flex; justify-content: space-between; color: #000;">
          <span>Ümumi Endirim (${discountType.value === 'percent' ? discountVal + '%' : discountVal + ' ₼'}):</span>
          <span>-${discountAmount.toFixed(2)} ₼</span>
        </div>
      ` : ''}
    </div>
  `

  const paymentMethodsHtml = paymentDetails.value?.isMulti 
    ? Object.entries(paymentDetails.value.payments)
        .filter(([_, amt]) => (amt as number) > 0)
        .map(([name, amt]) => {
          let extra = ''
          if (name === 'Bonus' && selectedCustomer.value) extra = `<div style="font-size: 9px; opacity: 0.7;">Bonus Kart: ${selectedCustomer.value.barcode || '---'}</div>`
          if (name === 'Hədiyyə Kartı' && paymentDetails.value?.giftCard) {
            const gc = paymentDetails.value.giftCard
            const remaining = Math.max(0, gc.value - (amt as number))
            extra = `<div style="font-size: 9px; opacity: 0.7;">Kart: ${gc.barcode} | Qalıq Balans: ${remaining.toFixed(2)} ₼</div>`
          }
          return `
            <div style="margin-bottom: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="text-transform: capitalize; font-weight: bold;">${name}:</span>
                <span>${(amt as number).toFixed(2)} ₼</span>
              </div>
              ${extra}
            </div>
          `
        }).join('')
    : `
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>Ödəniş Üsulu:</span>
        <span style="font-weight: bold;">${paymentDetails.value?.method || paymentMethod.value}</span>
      </div>
      ${(paymentMethod.value === 'Bonus' && selectedCustomer.value) ? `<div style="font-size: 9px; opacity: 0.7;">Bonus Kart: ${selectedCustomer.value.barcode || '---'}</div>` : ''}
      ${(paymentMethod.value === 'Hədiyyə Kartı' && paymentDetails.value?.giftCard) ? `
        <div style="font-size: 9px; opacity: 0.7;">
          Kart: ${paymentDetails.value.giftCard.barcode} | Qalıq Balans: ${Math.max(0, paymentDetails.value.giftCard.value - finalTotal.value).toFixed(2)} ₼
        </div>
      ` : ''}
      
      ${paymentDetails.value?.received ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
          <span>Alınan:</span>
          <span>${Number(paymentDetails.value.received).toFixed(2)} ₼</span>
        </div>
      ` : ''}
    `
    
  // Multi-payment change calculation
  let multiChangeHtml = ''
  if (paymentDetails.value?.isMulti) {
    const paymentsArr = Object.values(paymentDetails.value.payments) as number[]
    const totalPaid = paymentsArr.reduce((a, b) => a + (Number(b) || 0), 0)
    const change = totalPaid - finalTotal.value
    if (change > 0.01) {
      multiChangeHtml = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 5px; border-top: 1px dotted #000; padding-top: 3px;">
          <span>Qalıq:</span>
          <span>${change.toFixed(2)} ₼</span>
        </div>
      `
    }
  } else if (paymentDetails.value?.change > 0.01) {
    multiChangeHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 5px; border-top: 1px dotted #000; padding-top: 3px;">
        <span>Qaytarılan Məbləğ:</span>
        <span>${Number(paymentDetails.value.change).toFixed(2)} ₼</span>
      </div>
    `
  }

  // Loyalty/Bonus Info
  let loyaltyHtml = ''
  if (selectedCustomer.value) {
    const bonusSpent = paymentDetails.value?.isMulti ? (paymentDetails.value.payments['Bonus'] || 0) : (paymentMethod.value === 'Bonus' ? finalTotal.value : 0)
    const earned = Number(cashbackAmount.value)
    const currentBonus = Number(selectedCustomer.value.bonus) || 0
    // Note: The UI hasn't updated yet in completeOrder, so we calculate the *future* balance for the receipt
    const newBalance = currentBonus - bonusSpent + earned
    
    loyaltyHtml = `
      <div style="margin-top: 10px; padding: 5px; background: #f9f9f9; border: 1px solid #ddd; font-size: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Kazanılan Keşbek:</span>
          <span style="font-weight: bold;">+${earned.toFixed(2)} ₼</span>
        </div>
        ${bonusSpent > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>İstifadə edilən Bonus:</span>
            <span style="font-weight: bold;">-${bonusSpent.toFixed(2)} ₼</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #ccc; margin-top: 3px; padding-top: 3px;">
          <span>Yeni Bonus Balansı:</span>
          <span style="font-weight: bold;">${newBalance.toFixed(2)} ₼</span>
        </div>
      </div>
    `
  }

  const printContent = `
    <html>
      <head>
        <title>Satış Çeki</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          @media print {
            html, body { margin: 0 !important; padding: 0 !important; }
          }
          body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; color: #000; padding: 10px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .logo { font-size: 24px; font-weight: 900; margin-bottom: 5px; letter-spacing: -1px; }
          .header-info { font-size: 11px; margin-bottom: 2px; }
          .title { font-size: 16px; font-weight: bold; text-decoration: underline; margin: 15px 0 10px 0; }
          .info-block { font-size: 12px; text-align: left; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .divider { border-top: 2px solid #000; margin: 10px 0; }
          .total-section { margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
          .yekun { display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; margin-bottom: 10px; }
          .footer-note { font-style: italic; font-size: 11px; margin-top: 15px; }
          .shift-info { font-size: 10px; margin-top: 20px; opacity: 0.7; }
        </style>
        </style>
      </head>
      <body>
        <div class="center">
          <div style="margin-bottom: 15px;">
            <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112.7 32.16" width="180">
              <defs><style>.cls-1 { fill: #010101; }</style></defs>
              <path class="cls-1" d="M6.25,29.34c2.91.18,6.03-.42,8.56-1.84,1.43-.84,2.28-1.82,2.55-2.97.09-.34.1-.99.05-1.34-.55-3.33-3.6-5.13-6.66-5.63-.17-.04-.31-.05-.31-.05,0-.03.22-.16.43-.32,2.5-1.56,3.7-2.59,3.96-3.46.21-.57.04-1.27-.36-1.98-.61-1.17-1.55-1.54-2.82-1.62-1.13-.07-1.99.01-5.38.46-1.35.23-1.73.24-2.32.23-.46-.03-.73-.11-.81-.26-.03-.1-.15-.28-.25-.39-.16-.25-.16-.22-.19-.87-.02-.24-.03-.59-.05-.79.01-.17,0-.41,0-.45.07-.51-.96-1.12-1.85-1.18-.31-.02-.48,0-.66.1-.14.09-.18.2-.13.47,0,.14.03.59,0,.96.04.41.04.96.06,1.21.14,2.24.2,4.48.27,6.75.06,1.82.12,4.09.27,6.71.06,1.27.07,1.62.12,2l.05.28-.08.13c-.23.33.07,1.14.64,1.83.96,1.09,2.64,1.71,4.07,1.93.2.05.51.07.82.08h0ZM3.84,26.75c-.47-.13-1.15-.35-1.54-.58l-.27-.12.38.02c.51,0,.86-.05,1.01-.25.14-.13.15-.16.1-.54-.04-.48-.24-4.38-.37-7.85-.1-2.31-.13-2.86-.17-3.89-.03-.55-.08-1-.08-1,0-.03.1.04.17.08.76.49,1.55.54,2.44.6.79.01,1.24-.03,3.38-.31,1.66-.21,2.56-.29,3.32-.31.18.01.26.03.24.05-.25.64-5.62,3.7-6.3,4.07-1.21.65-1.24.68-1.33.91-.17.61.47,1.78,1.13,2.2.1.04.14.04.27.05.03,0,.1,0,.2.01.2.01.69,0,1.17,0,.86-.05,1.69-.07,2.54-.01,1.88.12,4.22.67,5.54,2.1l.19.22v.2c-.37,2.38-4.92,3.85-6.87,4.21-1.25.27-2.53.36-3.8.28-.51-.03-1.02-.1-1.36-.15h0Z"/><path class="cls-1" d="M27.97,18.68c.17-.69.45-2.23.55-2.64.07-.38.07-.82-.03-1.13-.14-.51-.41-.99-.82-1.37-.34-.38-.55-.48-.89-.48-.55,0-5.76,2.12-6.79,2.64-.24.1-.65.27-.93.41s-.72.38-.99.51c-.58.27-.62.31-.62.55,0,.65.86,1.37,1.41,1.68.14.03.21.07.31.07h.1c.24,0,.38-.03.48-.1.03-.03.31-.17.62-.31.27-.1.79-.31,1.13-.48.38-.14.99-.41,1.41-.58.41-.14,1.34-.51,2.02-.79.72-.31,1.3-.51,1.3-.51.03,0-.07.38-.17.82-.24,1.03-.41,1.64-.51,2.36-.07.31-.14.58-.14.58,0,0-.1-.07-.24-.17-.1-.1-.31-.24-.45-.31-.48-.27-.93-.41-1.37-.41-1.99,0-4.15,2.74-4.97,4.25-.75,1.34-.96,2.54-.62,3.29.27.69,1.13,1.37,1.92,1.61.17.03.38.03.55.03.14,0,.24,0,.34-.03.62-.17,1.89-1.06,3.91-2.74.1-.07.17-.14.21-.14,0,0-.03.21-.03.38-.03.51-.07,1.41,0,1.68.03.27.17.62.27.82.34.58.99,1.16,1.47,1.23h.14c.14,0,.21-.03.27-.14.03-.14.03-.27-.03-.48-.03-.17-.03-.24-.03-.79,0-.82.07-1.89.31-3.63.27-2.19.48-3.63.93-5.69h0ZM23.48,22.69c-.82.68-1.64,1.37-2.5,2.06-.17.14-.34.24-.34.24,0,0,.03-.1.1-.21.65-1.2,1.64-2.4,2.61-3.09.38-.27.72-.51.75-.48.03.03.07.55.1.82,0,.07-.14.17-.72.65h0Z"/><path class="cls-1" d="M31.03,25.03c.17-.01.93.01,1.58.09.27.03.54.07.74.13,1.61.34,4.91,1.34,5.95,2.68.21.23.34.35.44.37.07,0,.11-.02.18-.05.41-.26.4-1.54,0-2.28-.99-1.75-4.4-2.9-6.22-3.3l-.2-.06.52-.31c1.17-.79,2.24-1.62,2.82-2.1.74-.7.83-.86.83-1.38-.03-.9-.56-1.9-1.03-1.96-.14-.02-.21,0-.34.2-.39.61-3.97,3.27-4.69,3.52-.04.03-.03-.07.08-.65.39-2.58.82-6.05.9-7.18.05-.37.06-.72.09-.75,0,0,.04-.06.08-.06.11-.02.2-.18.18-.32-.01-.17-.12-.43-.33-.66-.32-.49-.95-.98-1.53-1.05-.2-.03-.38.02-.46.11-.16.15-.18.36-.34,1.89-.1,1.09-.26,2.35-.57,3.97-.51,2.94-.78,4.6-.93,5.76l-.09.71-.08.09c-.19.11-.28.34-.26.69-.03.2-.01.38.09.67l.04.21-.09,1.02c-.21,1.98-.27,3-.17,3.29.08.22.38.57.73.78.16.12.48.27.68.33.13.05.27.07.4.08.14.02.27.03.34,0,.25-.04.29-.14.27-.48.03-.48.09-1.51.25-3.15.06-.75.08-.89.11-.88h0Z"/><path class="cls-1" d="M47.89,29.45c.16.1.39.21.68.26h.21c.24,0,.52-.03.63-.05.29-.05.5-.21.5-.37,0,0-.03-.1-.08-.21-.1-.26-.18-.52-.24-.89-.26-1.54-.39-5.23-.31-8.14.03-1.26.03-1.33-.03-1.44-.21-.45-1.02-.89-1.52-.89-.1,0-.18.03-.26.05-.13.05-.16.08-.45.81-.99,2.54-1.96,4.63-3.11,6.62-.31.6-.84,1.44-.86,1.41,0-.03-.1-.81-.16-1.28-.08-1.02-.11-2.75-.03-4.42.03-.52.05-1.31.05-1.67.03-.39.03-.73.03-.76s.03-.1.03-.18v-.13h.18c.21,0,.29-.03.37-.13.08-.08.05-.16-.05-.42-.13-.34-.21-.5-.42-.68-.26-.26-.58-.45-.97-.58-.1-.05-.26-.05-.39-.05-.16,0-.26,0-.34.05-.18.08-.26.24-.29.6-.05.31-.1.73-.13,1.6,0,.34,0,.52-.03.94-.03.1-.03.39-.05.65,0,.21-.03.6-.03.81-.05,1.05-.05,1.99-.05,2.69.08,2.12.26,3.24.6,3.85.29.45.71.71,1.41.89.16.03.37.05.58.05.16,0,.29-.03.37-.03.18-.05.42-.18.58-.29.63-.5,1.52-1.83,2.56-3.87l.29-.58v.24c0,.81.13,5,.73,5.52h0Z"/><path class="cls-1" d="M66.16,2.69c0-.68-.08-1.03-.21-1.37-.3-.51-.98-.98-1.92-1.24-.26-.09-.38-.09-.81-.09-.6,0-.85.04-1.2.26-1.15.73-3.12,3.63-7.18,10.34-2.99,4.96-4.45,7.52-4.75,8.34-.13.38-.13.73.04.98.26.51.98.94,2.01,1.2.26.04.47.04,1.03.04,1.24,0,2.48-.13,3.72-.26,1.71-.17,2.56-.26,3.21-.26,1.03,0,1.54.08,2.31.85.98.98,1.03,2.27.13,3.59-.94,1.28-2.48,2.18-4.06,2.35-.08,0-.13.04-.17.04s-.08-.04-.17-.13c-.34-.43-.47-.81-.47-1.37.04-.38.08-.56.34-.98.21-.38.21-.6-.13-.94-.51-.47-1.45-.85-2.18-.85-.51,0-.68.08-.94.47-.6,1.03-.6,2.05,0,3.03.77,1.28,2.56,2.31,4.4,2.52h.43c2.86,0,6.88-1.71,6.88-5.04,0-.51,0-.64-.04-.85-1.11-3.59-5.56-4.49-8.81-4.49-.77,0-1.33.08-2.78.26-.6.08-1.07.13-1.07.13-.04-.04.81-1.58,1.62-2.99,1.5-2.52,3.76-6.28,5.47-8.93.6-.94,1.75-2.74,1.8-2.69,0,0-.04.51-.08,1.2-.3,3.46-.38,5.39-.3,6.97,0,.94.04,1.33.21,1.67.17.34.47.56,1.11.73.21.04.38.08.85.08.64,0,.81-.04,1.15-.17.38-.21.47-.34.34-.68-.13-.34-.17-.51-.21-1.5-.08-1.41,0-2.95.21-6.33.21-2.44.26-3.12.21-3.89h0Z"/><path class="cls-1" d="M82.03,15.73c-.1,0-.21.03-.31.03-1.85.31-4.11,2.81-5,4.42-.17.27-.21.34-.21.24,0-.14-.24-1.85-.41-3.12-.07-.41-.1-.82-.14-.96-.03-.31-.1-.45-.31-.69-.27-.27-.65-.51-1.13-.68-.24-.1-.31-.1-.55-.1-.38,0-.48.03-.55.17-.05.09.02.73.21,1.92.17,1.06.27,2.23.41,4.46.17,1.92.34,3.87.34,5.79.03.21.03.48,0,.55-.03.41-.03,1.61-.03,1.82.07.27.17.45.38.58.27.24.82.48,1.27.55h.24c.24,0,.51,0,.62-.03.14-.03.27-.17.31-.27.03-.14.03-.86,0-1.82-.02-.43-.01-.82.03-1.16.34-2.36,1.2-4.76,2.23-6.31.93-1.41,2.57-2.81,3.7-3.19.14-.07.27-.07.38-.07s.17,0,.27.03c.14.07.27.07.38.07.14,0,.27-.03.31-.17.1-.24-.03-.58-.34-.96-.55-.65-1.37-1.1-2.09-1.1h0Z"/><path class="cls-1" d="M89.04,16.44c-.28,0-.55.06-.83.11-1.55.44-2.99,1.6-4.01,2.85-.97,1.22-1.52,2.66-1.72,4.37-.25,2.21.11,4.45.97,5.7.42.66,1.02,1.13,1.8,1.25.14.03.28.03.42.03,2.1,0,4.59-2.27,5.28-4.23.14-.33.28-.88.3-1.05.06-.61-.3-1.52-.66-1.66-.03-.03-.08-.03-.11-.03-.14,0-.22.11-.3.36-.14.53-.17.64-.25.77-.69,1.63-2.85,3.62-4.76,3.62-1.27,0-1.47-.69-1.63-1.74-.03-.3-.03-1.22,0-1.58.11-.83.28-1.58.53-2.19l.03-.08.22.08c.64.22,1.49.28,2.9.28,1.72-.06,5.26-.33,5.73-2.3.17-.66.06-1.58-.28-2.27-.61-1.22-2.24-2.3-3.62-2.3h0ZM91.7,19.93c-.77.64-2.38,1.02-4.45,1.13h-1.94l.17-.17c.97-1.08,2.52-2.19,4.01-2.19.72.03,1.49.39,2.19,1l.14.14-.11.08h0Z"/><path class="cls-1" d="M93.95,23.03l.03-.08.22.08c.64.22,1.49.28,2.9.28,1.72-.06,5.26-.33,5.73-2.3.17-.66.06-1.58-.28-2.27-.61-1.22-2.24-2.3-3.62-2.3-.28,0-.55.06-.83.11-1.55.44-2.99,1.6-4.01,2.85-.97,1.22-1.52,2.66-1.72,4.37-.25,2.21.11,4.45.97,5.7.42.66,1.02,1.13,1.8,1.25.14.03.28.03.42.03,2.1,0,4.59-2.27,5.28-4.23.14-.33.28-.88.3-1.05.06-.61-.3-1.52-.66-1.66-.03-.03-.08-.03-.11-.03-.14,0-.22.11-.3.36-.14.53-.17.64-.25.77-.69,1.63-2.85,3.62-4.76,3.62-1.27,0-1.47-.69-1.63-1.74-.03-.3-.03-1.22,0-1.58.11-.83.28-1.58.53-2.19h0ZM95.36,20.9c.97-1.08,2.52-2.19,4.01-2.19.72.03,1.49.39,2.18,1l.14.14-.11.08c-.77.64-2.38,1.02-4.45,1.13h-1.94l.17-.17h0Z"/><path class="cls-1" d="M112.48,7.9c-.23-.14-.36-.1-.86.21-.5.28-2.17.5-5.14.66v-.11s.38-3.55.49-4c0-.08.07-.2.1-.24.05-.08.07-.19.07-.32-.1-.85-1.34-1.86-2.02-1.86-.31,0-.45.12-.51.52-.12.73-.53,3.76-.76,6.12-.68.03-1.41.05-2.19.07-1.49.07-19.14-1.07-20.49-1.14-1.67-.03-4.15-.14-4.19-.17l-3.97-.28s-.62-.04-1.38-.12l.02-.27s.38-3.55.48-4c0-.08.07-.2.1-.24.05-.08.07-.19.07-.32-.1-.85-1.34-1.86-2.02-1.86-.31,0-.45.12-.51.52-.12.71-.5,3.55-.73,5.87-.23-.03-.41-.06-.49-.07-.09,0-.23-.07-.27-.1-.09-.05-.21-.07-.36-.07-.95.1-2.08,1.34-2.08,2.02,0,.31.14.45.59.51.37.06,1.29.17,2.42.3-.11,1.62-.25,3.7-.28,4.12,0,.02,0,.04,0,.06,0,0,0,.01,0,0-.16,3.47-.1,7.22.14,10.65.24,3.71.51,4.89,1.34,5.57.28.24.75.45,1.17.52h.45c.38,0,.51-.04.62-.2.14-.2.1-.32-.21-.77-.41-.64-.68-3.51-.85-8.92-.07-1.33-.07-5.09,0-6.3.03-1.49.14-3.71.17-3.75l.05-.7c.74.08,1.49.14,2.17.2,0,0,.04,0,.11,0,.84.05,6.03.37,6.77.41.03,0,.05,0,.06,0,0,0,.01,0,0,0,3.36.14,17.02.96,23.12,1.03-.11,1.58-.23,3.46-.26,3.86,0,.02,0,.04,0,.06,0,0,0,.01,0,0-.16,3.47-.1,7.22.14,10.65.24,3.71.51,4.89,1.34,5.57.28.24.75.45,1.17.52h.45c.38,0,.51-.04.62-.2.14-.2.1-.32-.21-.77-.41-.64-.68-3.51-.85-8.92-.07-1.33-.07-5.09,0-6.3.03-1.49.14-3.71.17-3.75l.06-.77c.47-.03.91-.06,1.31-.09.01,0,.03,0,.04.01.02,0,.04.02.04.04.02.1.2.47.23.55,0,0,0,.02,0,.02.02.06.11.3.19.28.1-.03.18-.52.2-.59.02-.07.07-.21.07-.21v-.02c.05-.1.23-.13.34-.11.19.03.45.15.45.61,0,.74-.37,2.16.03,2.58.14.14.28.18.41.16.25-.03.42-.26.42-.51,0-.26-.02-.67-.12-.97-.14-.41-.24-1.38-.27-1.66,0-.05,0-.11.04-.15.05-.08.15-.22.28-.3,1.15-.21,1.74-.49,2.17-.95.27-.28.5-.75.59-1.17v-.45c0-.38-.04-.51-.23-.62h0Z"/></svg>
          </div>
          <div class="header-info">TS adı: BakuStreet Street Wear Shop</div>
          <div class="header-info">TS ünvanı: Nizami Mall, Mağaza 234</div>
          
          <div class="title">SATIŞ ÇEKİ</div>
          
          <div class="info-block">
            <div>Çek no: ${receiptNo}</div>
            <div>Kassir: ${cashierName}</div>
            <div>Tarix: ${currentDate}</div>
          </div>
        </div>

        <div class="items">
          ${customerInfoHtml}
          ${itemsHtml}
        </div>

        ${summaryHtml}

        <div class="total-section">
          <div class="yekun">
            <span>YEKUN:</span>
            <span>${finalTotal.value.toFixed(2)} ₼</span>
          </div>
          
          <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px;">
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; text-decoration: underline;">ÖDƏNİŞ DETALLARI:</div>
            ${paymentMethodsHtml}
            ${multiChangeHtml}
          </div>
        </div>

        ${loyaltyHtml}

        <div class="center">
          <div class="footer-note">* Məhsulun qaytarılması 14 gün *</div>
          
          <div class="shift-info">Növbə ərzində vurulmuş çek sayı: ${shiftReceiptCount.value}</div>
          
          <div style="margin-top: 10px;">
            <svg id="barcode-receipt"></svg>
          </div>

          <div style="margin-top: 15px; font-size: 10px;">TEŞEKKÜR EDİRİK!</div>
        </div>

        \x3cscript src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js">\x3c/script>
        \x3cscript>
          setTimeout(function() {
            if (typeof JsBarcode === 'function') {
              JsBarcode("#barcode-receipt", "${receiptNo}", {
                format: "CODE128",
                width: 1.5,
                height: 40,
                displayValue: true,
                fontSize: 12,
                margin: 0
              });
            }
          }, 100);
        \x3c/script>
      </body>
    </html>
  `

  const printWin = window.open('', '', 'width=400,height=600')
  if (printWin) {
    printWin.document.write(printContent)
    printWin.document.close()
    printWin.focus()
    // A timeout is sometimes needed to allow rendering before print dialog opens
    setTimeout(() => {
      printWin.print()
      printWin.close()
    }, 250)
  }
}

const showGiftCardModal = ref(false)
const giftCardBarcode = ref('')

const completeOrder = async (details?: any) => {
  const total = finalTotal.value
  const customer = selectedCustomer.value
  
  // Store details for receipt
  paymentDetails.value = details || { isMulti: false, method: paymentMethod.value }
  
  // 1. Validate Payments
  const payments = details?.isMulti ? details.payments : { [paymentMethod.value]: total }
  
  for (const [method, amount] of Object.entries(payments)) {
    const amt = Number(amount)
    if (amt <= 0) continue

    if (method === 'Bonus') {
      if (!customer) {
        toast.error('Bonus ilə ödəniş üçün müştəri seçilməlidir')
        return
      }
      if ((Number(customer.bonus) || 0) < amt) {
        toast.error('Müştərinin balansında kifayət qədər bonus yoxdur')
        return
      }
    }

    if (method === 'Hədiyyə Kartı') {
      const barcodeToUse = details?.giftCardBarcode || giftCardBarcode.value
      if (!barcodeToUse) {
        toast.error('Hədiyyə kartı barkodu daxil edilməlidir')
        return
      }
      try {
        const cards = await $fetch<any[]>('/api/gift-cards')
        const card = (cards || []).find(c => c.barcode === barcodeToUse)
        if (!card) {
          toast.error('Hədiyyə kartı tapılmadı')
          return
        }
        if (card.value < amt) {
          toast.error(`Kartda kifayət qədər balans yoxdur (Mövcud: ${card.value.toFixed(2)} ₼)`)
          return
        }
        
        // Store card object for receipt before modifying balance
        paymentDetails.value.giftCard = { ...card }

        // Deduct from gift card
        await $fetch<any>(`/api/gift-cards/${card.id}`, {
          method: 'PUT',
          body: { value: Number((card.value - amt).toFixed(2)) }
        })
      } catch (err) {
        toast.error('Hədiyyə kartı yoxlanılarkən xəta oldu')
        return
      }
    }
  }

  isSaving.value = true
  const currentCashback = Number(cashbackAmount.value)
  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : null

  try {
    // 2. Bonus/Loyalty Update
    if (customer) {
      let finalBonusUpdate = Number(customer.bonus) || 0
      const bonusSpent = payments['Bonus'] ? Number(payments['Bonus']) : 0
      if (bonusSpent > 0) finalBonusUpdate -= bonusSpent
      finalBonusUpdate += currentCashback

      await $fetch<any>(`/api/customers/${customer.id}`, {
        method: 'PUT',
        body: { bonus: Number(finalBonusUpdate.toFixed(2)) },
        headers: { Authorization: `Bearer ${token.value}` }
      })
    }

    // 3. Save detailed Sale to DB
    const saleData = {
      subtotal: subtotal.value,
      discountTotal: subtotal.value - finalTotal.value,
      finalTotal: finalTotal.value,
      cashbackEarned: currentCashback,
      paymentDetails: {
        isMulti: paymentDetails.value?.isMulti,
        method: paymentDetails.value?.method || paymentMethod.value,
        payments: payments,
        received: paymentDetails.value?.received,
        change: paymentDetails.value?.change,
        giftCardBarcode: details?.giftCardBarcode || giftCardBarcode.value,
        bonusBarcode: customer?.barcode
      },
      cashierId: selectedEmployee.value?.id,
      cashierName: selectedEmployee.value ? `${selectedEmployee.value.firstName} ${selectedEmployee.value.lastName}` : null,
      customerId: customer?.id,
      customerName: customerName,
      customerBarcode: customer?.barcode,
      items: cart.value.map(item => {
        const price = Number(item.retailPrice) || 0
        const d = Number(item.itemDiscount) || 0
        let finalP = price
        if (item.itemDiscountType === 'percent') finalP = price * (1 - d / 100)
        else finalP = price - d
        
        return {
          productId: item.id,
          productName: item.productName,
          barcode: item.barcode,
          qty: item.qty,
          retailPrice: price,
          wholesalePrice: Number(item.wholesalePrice) || 0,
          itemDiscount: d,
          itemDiscountType: item.itemDiscountType,
          finalPrice: Math.max(0, finalP),
          attribute: item.attribute
        }
      })
    }

    const savedSale = await $fetch<any>('/api/sales', {
      method: 'POST',
      body: saleData
    })

    // 4. Complete and Reset
    let msg = 'Satış uğurla tamamlandı!'
    if (customerName) {
      const bonusSpent = payments['Bonus'] ? Number(payments['Bonus']) : 0
      if (bonusSpent > 0) {
        msg += `\n${bonusSpent.toFixed(2)} ₼ bonus balansından çıxıldı.`
      }
      msg += `\n${customerName} hesabına ${currentCashback.toFixed(2)} ₼ keşbek əlavə edildi.`
    }
    
    toast.success(msg)
    printReceipt(savedSale.receiptNo) // Pass the 13-digit receiptNo from DB
    
    clearCart()
    selectedCustomer.value = null
    giftCardBarcode.value = ''
    showPaymentModal.value = false
    showGiftCardModal.value = false
    isSaving.value = false
    shiftReceiptCount.value++
    const todayShift = new Date().toISOString().split('T')[0]
    localStorage.setItem(`shift_count_${todayShift}`, String(shiftReceiptCount.value))

    loadCustomers()
  } catch (err: any) {
    console.error('Finalizing sale error:', err)
    toast.error('Satış tamamlanarkən xəta baş verdi: ' + (err.message || ''))
    isSaving.value = false
  }
}

</script>

<template>
  <div>
  <div class="flex flex-col lg:flex-row gap-6 font-sans h-[calc(100vh-120px)] pb-4">
    
    <!-- Left Section: Search & Products -->
    <div class="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]">
      
      <!-- Top Action Bar - Compact -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 shrink-0">
        <h1 class="text-xl md:text-2xl font-black text-[var(--text-app)] tracking-tight leading-none mb-1">
            {{ t('menu.salesTerminal', 'Satış Terminalı') }}
        </h1>
        
        <div class="flex items-center gap-2">
          <UiButton 
            v-if="drafts.length > 0"
            variant="soft-primary" 
            size="sm" 
            icon="lucide:bookmark"
            @click="showDraftsModal = true"
            class="!px-3"
          >
            {{ drafts.length }}
          </UiButton>

          <UiButton 
            variant="soft-primary" 
            size="sm" 
            icon="lucide:plus-circle"
            @click="showGhostModal = true"
          >
            Keçici Məhsul
          </UiButton>

          <UiInput 
            ref="searchInput"
            v-model="searchQuery" 
            placeholder="Barkod və ya ad..." 
            icon="lucide:search" 
            clearable
            @keyup.enter="focusSearch"
          />
        </div>
      </div>

      <!-- Categories Filter - Compact -->
      <div class="flex items-center gap-2 mb-4 shrink-0">
        <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar-hide pb-1 -mx-2 px-2">
          <button 
            v-for="cat in categories" 
            :key="cat"
            @click="selectedCategory = cat"
            class="px-3.5 py-1.5 font-bold text-[11px] rounded-lg whitespace-nowrap transition-all border cursor-pointer hover:shadow-sm"
            :class="selectedCategory === cat 
              ? 'bg-[var(--text-primary)] text-white border-transparent' 
              : 'bg-[var(--bg-app)] text-[var(--text-app)] opacity-50 border-[var(--border-app)] hover:opacity-100 hover:border-[var(--text-primary)]/40'"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- Products Grid -->
      <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        <div v-if="loading" class="flex items-center justify-center h-full">
          <UiIcon name="lucide:loader-2" class="w-10 h-10 animate-spin text-[var(--text-primary)] opacity-50" />
        </div>
        
        <div v-else-if="filteredProductGroups.length === 0" class="flex flex-col items-center justify-center h-full text-[var(--text-app)] opacity-50">
          <UiIcon name="lucide:package-open" class="w-16 h-16 mb-4" />
          <p class="font-bold text-lg">Məhsul tapılmadı.</p>
        </div>

        <div v-else class="pt-2 grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          <SalesProductSaleCard 
            v-for="root in filteredProductGroups" 
            :key="root.id"
            :product="root"
            @add-to-cart="addToCart"
          />
        </div>
      </div>
    </div>

    <!-- Right Section: Cart / Checkout -->
    <div class="w-full lg:w-[400px] shrink-0 h-full">
      <SalesCartSidebar 
        v-model:discount="discount"
        v-model:discountType="discountType"
        v-model:selectedCustomer="selectedCustomer"
        v-model:selectedEmployee="selectedEmployee"
        :cart="cart"
        :subtotal="subtotal"
        :finalTotal="finalTotal"
        :customers="customers"
        :employees="employees"
        :cashbackAmount="cashbackAmount"
        @increase="increaseQty"
        @update-qty="updateQty"
        @decrease="decreaseQty"
        @remove="removeFromCart"
        @clear="clearCart"
        @checkout="handlePayment"
        @save-draft="saveDraft"
        @update-item-discount="updateItemDiscount"
        @update-item-discount-type="updateItemDiscountType"
      />
    </div>
    
  </div>

  <SalesPaymentModal
    v-model="showPaymentModal"
    v-model:selectedMethod="paymentMethod"
    v-model:customer="selectedCustomer"
    :total="finalTotal"
    :dbMethods="paymentMethods"
    :isSaving="isSaving"
    @confirm="completeOrder"
    @refresh-methods="loadPaymentMethods"
  />
  
  <!-- Drafts Modal -->
  <Modal
    v-model="showDraftsModal"
    title="Müvəqqəti Saxlanılanlar"
    max-width="md"
  >
    <div class="space-y-3">
      <div v-if="drafts.length === 0" class="text-center py-6 text-[var(--text-app)] opacity-50">
        <UiIcon name="lucide:inbox" class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p class="font-bold">Müvəqqəti yadda saxlanılan satış yoxdur</p>
      </div>

      <div 
        v-for="(draft, idx) in drafts" 
        :key="draft.id"
        class="flex items-center justify-between p-3 rounded-xl border border-[var(--border-app)] hover:border-[var(--text-primary)]/30 transition-all bg-[var(--bg-app)]"
      >
        <div class="flex flex-col">
          <span class="font-bold text-[13px] text-[var(--text-app)]">{{ draft.name }}</span>
          <div class="flex gap-3 text-[10px] font-bold opacity-50 mt-1">
            <span class="flex items-center gap-1"><UiIcon name="lucide:clock" class="w-3 h-3" /> {{ draft.time }}</span>
            <span class="flex items-center gap-1"><UiIcon name="lucide:credit-card" class="w-3 h-3" /> {{ draft.finalTotal }} ₼</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button 
            @click="restoreDraft(idx)" 
            class="h-8 px-3 text-[11px] font-bold bg-[var(--text-primary)] text-white rounded-lg hover:shadow-md hover:shadow-[var(--text-primary)]/20 transition-all"
          >
            Yüklə
          </button>
          <button 
            @click="deleteDraft(idx)" 
            class="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <UiIcon name="lucide:trash-2" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </Modal>

  <!-- Ghost Product Modal -->
  <Modal
    v-model="showGhostModal"
    :title="t('sales.addGhost', 'Keçici Məhsul Əlavə Et')"
    max-width="md"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-40 mb-1">Məhsulun adı</label>
        <UiInput 
          v-model="ghostProduct.productName" 
          placeholder="Məs: Paket, Xidmət və s." 
          autofocus
        />
      </div>
      <div>
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-40 mb-1">Qiymət (₼)</label>
        <UiInput 
          v-model="ghostProduct.retailPrice" 
          type="number"
          placeholder="0.00" 
        />
      </div>
    </div>
    <template #footer>
      <div class="flex gap-3 w-full">
        <UiButton 
          variant="outline" 
          block 
          @click="showGhostModal = false"
        >
          Ləğv Et
        </UiButton>
        <UiButton 
          variant="primary" 
          block 
          @click="addGhostProduct"
        >
          Səbətə Əlavə Et
        </UiButton>
      </div>
    </template>
  </Modal>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}

.custom-scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.custom-scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}
</style>
