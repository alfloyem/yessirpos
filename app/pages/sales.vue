<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiIcon from '~/components/ui/Icon.vue'
import Modal from '~/components/ui/Modal.vue'

const { t } = useI18n()
const { token } = useAuth()
const toast = useToast()

useHead({
  title: t('menu.sales', 'Satışlar')
})

// --- Data ---
const products = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('Bütün Mallar')

// Cart state
const cart = ref<any[]>([])
const discount = ref<number | string>(0)

// Modal states
const showPaymentModal = ref(false)
const paymentMethod = ref('cash')
const isSaving = ref(false)

// --- Load Products ---
const loadProducts = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/products', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    products.value = (data as any[]).filter(p => !p.parentProductId || p.retailPrice > 0) // Basic filter to show actionable products
  } catch (err: any) {
    toast.error(t('toast.loadingError', 'Mallar yüklənərkən xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProducts()
})

// --- Computed ---
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

const filteredProducts = computed(() => {
  let list = products.value
  
  if (selectedCategory.value !== 'Bütün Mallar') {
    list = list.filter(p => {
      const cat = p.category
      if (Array.isArray(cat)) return cat.includes(selectedCategory.value)
      return cat === selectedCategory.value
    })
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => 
      (p.productName && p.productName.toLowerCase().includes(q)) || 
      (p.barcode && String(p.barcode).toLowerCase().includes(q))
    )
  }

  return list
})

const subtotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + (Number(item.retailPrice) * item.qty), 0)
})

const finalTotal = computed(() => {
  const d = Number(discount.value) || 0
  return Math.max(0, subtotal.value - d)
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
    cart.value.push({ ...product, qty: 1 })
  }
}

const increaseQty = (item: any) => {
  item.qty++
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
  showPaymentModal.value = true
}

// --- Print Receipt Feature ---
const printReceipt = () => {
  const currentDate = new Date().toLocaleString('az-AZ')
  const itemsHtml = cart.value.map(item => `
    <tr>
      <td style="padding: 6px 0; border-bottom: 1px dashed #ccc;">${item.productName}</td>
      <td style="text-align: center; border-bottom: 1px dashed #ccc;">${item.qty}</td>
      <td style="text-align: right; border-bottom: 1px dashed #ccc;">${(item.retailPrice * item.qty).toFixed(2)} ₼</td>
    </tr>
  `).join('')

  const printContent = `
    <html>
      <head>
        <title>Qəbz</title>
        <style>
          body { font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; color: #000; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .mb-1 { margin-bottom: 4px; }
          .mb-4 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px; }
          .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 8px; }
          .discount-row { display: flex; justify-content: space-between; font-size: 14px; margin-top: 4px; }
          .divider { border-top: 2px dashed #000; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="text-center mb-4">
          <h2 style="margin: 0; font-size: 24px;">YESSIR POS</h2>
          <p style="margin: 4px 0; font-size: 12px;">Salash Giyim Mağazası</p>
          <p style="margin: 4px 0; font-size: 12px;">Tarix: ${currentDate}</p>
        </div>
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 8px;">Ad</th>
              <th style="padding-bottom: 8px;">Say</th>
              <th style="text-align: right; padding-bottom: 8px;">Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="discount-row">
          <span>Alt Toplam:</span>
          <span>${subtotal.value.toFixed(2)} ₼</span>
        </div>
        ${discount.value ? `
        <div class="discount-row">
          <span>Endirim:</span>
          <span>-${Number(discount.value).toFixed(2)} ₼</span>
        </div>
        ` : ''}
        
        <div class="total-row">
          <span>ÖDƏNİLƏCƏK:</span>
          <span>${finalTotal.value.toFixed(2)} ₼</span>
        </div>
        <div class="discount-row" style="margin-top: 8px;">
          <span>Ödəniş Növü:</span>
          <span>${paymentMethod.value === 'cash' ? 'Nəğd' : 'Kart'}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="text-center" style="margin-top: 20px;">
          <p class="font-bold">Bizi seçdiyiniz üçün təşəkkürlər!</p>
          <p style="font-size: 12px; margin-top: 8px;">Məhsulu dəyişmək üçün qəbzi saxlayın (14 gün).</p>
        </div>
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

const completeOrder = async () => {
  isSaving.value = true
  // Mock API call for completing order
  // In a real app we would await $fetch('/api/sales', {...})
  setTimeout(() => {
    toast.success('Satış uğurla tamamlandı və qeydə alındı!')
    printReceipt()
    clearCart()
    showPaymentModal.value = false
    isSaving.value = false
  }, 800)
}

</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6 font-sans h-[calc(100vh-120px)] pb-4">
    
    <!-- Left Section: Search & Products -->
    <div class="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]">
      
      <!-- Top Action Bar -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-[var(--text-app)] tracking-tight">
            {{ t('menu.salesTerminal', 'Satış Terminalı') }}
          </h1>
          <p class="text-[var(--text-app)] opacity-60 mt-0.5 text-sm font-medium">Bu ekrandan sürətli məhsul satışı edə bilərsiniz.</p>
        </div>
        
        <div class="w-full md:w-80 relative shadow-sm rounded-2xl">
          <UiInput 
            v-model="searchQuery" 
            placeholder="Məhsul adı və ya barkodu axtar..." 
            icon="lucide:search" 
            clearable
          />
        </div>
      </div>

      <!-- Categories Filter -->
      <div class="flex gap-2 mb-6 overflow-x-auto custom-scrollbar pb-2 shrink-0">
        <button 
          v-for="cat in categories" 
          :key="cat"
          @click="selectedCategory = cat"
          class="px-4 py-2 font-semibold text-sm rounded-xl whitespace-nowrap transition-all duration-300 border border-[var(--border-app)] hover:shadow-md cursor-pointer"
          :class="selectedCategory === cat 
            ? 'bg-[var(--text-primary)] text-white shadow-md shadow-[var(--text-primary)]/20 border-transparent' 
            : 'bg-[var(--input-bg)] text-[var(--text-app)] opacity-80 hover:opacity-100 hover:-translate-y-0.5'"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Products Grid -->
      <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        <div v-if="loading" class="flex items-center justify-center h-full">
          <UiIcon name="lucide:loader-2" class="w-10 h-10 animate-spin text-[var(--text-primary)] opacity-50" />
        </div>
        
        <div v-else-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-full text-[var(--text-app)] opacity-50">
          <UiIcon name="lucide:package-open" class="w-16 h-16 mb-4" />
          <p class="font-bold text-lg">Məhsul tapılmadı.</p>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <div 
            v-for="product in filteredProducts" 
            :key="product.id"
            @click="addToCart(product)"
            class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl overflow-hidden cursor-pointer hover:border-[var(--text-primary)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 group flex flex-col"
          >
            <!-- Product Image Area -->
            <div class="aspect-square bg-[var(--text-primary)]/5 relative flex items-center justify-center p-4">
              <img 
                v-if="product.images && product.images.length > 0" 
                :src="product.images[0]" 
                class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" 
                alt="Product" 
              />
              <UiIcon v-else name="lucide:shirt" class="w-16 h-16 text-[var(--text-app)] opacity-20 group-hover:scale-110 transition-transform duration-500" />
              
              <!-- Stock level pill badge -->
              <div 
                class="absolute top-3 right-3 px-2 py-0.5 rounded-lg text-xs font-bold shadow-md backdrop-blur-sm"
                :class="(product.stock || 0) > 5 ? 'bg-[var(--color-brand-success)]/90 text-white' : 'bg-[var(--color-brand-danger)]/90 text-white'"
              >
                {{ product.stock || 0 }} stok
              </div>
            </div>

            <!-- Product Info Area -->
            <div class="p-4 flex-1 flex flex-col">
              <span class="text-xs font-bold text-[var(--text-app)] opacity-50 mb-1 flex items-center gap-1">
                <UiIcon name="lucide:hash" class="w-3 h-3" />
                {{ product.barcode || 'B/Y' }}
              </span>
              <h3 class="text-sm font-bold text-[var(--text-app)] leading-tight mb-2 flex-1 group-hover:text-[var(--text-primary)] transition-colors line-clamp-2">
                {{ product.productName }}
              </h3>
              <div class="flex justify-between items-end mt-auto">
                <span class="text-lg font-black text-[var(--text-primary)]">
                  {{ Number(product.retailPrice || 0).toFixed(2) }} ₼
                </span>
                <UiButton size="icon" variant="soft-primary" class="h-8 w-8 !rounded-lg !hidden group-hover:!flex shrink-0">
                  <UiIcon name="lucide:plus" class="w-4 h-4" />
                </UiButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Section: Cart / Checkout -->
    <div class="w-full lg:w-[400px] shrink-0 flex flex-col bg-[var(--input-bg)] rounded-[24px] border border-[var(--border-app)] shadow-sm overflow-hidden h-full">
      <div class="p-5 border-b border-[var(--border-app)] flex justify-between items-center bg-[var(--bg-app)]/50 backdrop-blur">
        <h2 class="text-lg font-bold text-[var(--text-app)] flex items-center gap-2">
          <UiIcon name="lucide:shopping-cart" class="w-5 h-5 text-[var(--text-primary)]" />
          Müştəri Səbəti
        </h2>
        <UiButton v-if="cart.length > 0" variant="ghost" size="sm" @click="clearCart" class="!text-[var(--color-brand-danger)] hover:!bg-[var(--color-brand-danger)]/10 !h-8 px-3">
          Səbəti Boşalt
        </UiButton>
      </div>

      <!-- Cart Items List -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-3">
        <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-[var(--text-app)] opacity-40">
          <UiIcon name="lucide:shopping-bag" class="w-16 h-16 mb-4 stroke-[1]" />
          <p class="font-bold">Səbət boşdur.</p>
          <p class="text-sm">Sol tərəfdən məhsul əlavə edin.</p>
        </div>

        <div v-else class="space-y-3">
          <TransitionGroup name="list">
            <div 
              v-for="item in cart" 
              :key="item.id"
              class="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl p-3 flex gap-3 group relative hover:border-[var(--text-primary)]/30 transition-colors"
            >
              <!-- Item Image -->
              <div class="w-16 h-16 rounded-lg bg-[var(--input-bg)] overflow-hidden shrink-0 shadow-sm">
                <img v-if="item.images && item.images.length > 0" :src="item.images[0]" class="w-full h-full object-cover" />
                <UiIcon v-else name="lucide:image" class="w-full h-full p-4 text-[var(--text-app)] opacity-20" />
              </div>
              
              <!-- Item Details -->
              <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div class="flex justify-between items-start gap-2">
                  <h4 class="font-bold text-sm text-[var(--text-app)] leading-tight truncate shrink">{{ item.productName }}</h4>
                  <button @click="removeFromCart(item)" class="text-[var(--color-brand-danger)]/50 hover:text-[var(--color-brand-danger)] transition-colors p-1 -m-1">
                    <UiIcon name="lucide:trash-2" class="w-4 h-4" />
                  </button>
                </div>
                
                <div class="flex justify-between items-center mt-2">
                  <span class="font-black text-sm text-[var(--text-app)]">
                    {{ (item.retailPrice * item.qty).toFixed(2) }} ₼
                  </span>
                  
                  <!-- Qty Controls -->
                  <div class="flex items-center bg-[var(--input-bg)] rounded-lg border border-[var(--border-app)]">
                    <button @click="decreaseQty(item)" class="w-7 h-7 flex items-center justify-center text-[var(--text-app)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                      <UiIcon name="lucide:minus" class="w-3 h-3" />
                    </button>
                    <span class="w-8 text-center text-xs font-bold text-[var(--text-app)]">{{ item.qty }}</span>
                    <button @click="increaseQty(item)" class="w-7 h-7 flex items-center justify-center text-[var(--text-app)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                      <UiIcon name="lucide:plus" class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>

      <!-- Checkout Summary Area -->
      <div class="bg-[var(--bg-app)] border-t border-[var(--border-app)] p-5 z-10 shrink-0">
        <div class="space-y-3 mb-5">
          <div class="flex justify-between text-[var(--text-app)] opacity-80 text-sm font-bold">
            <span>Alt Tutar:</span>
            <span>{{ subtotal.toFixed(2) }} ₼</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[var(--text-app)] opacity-80 text-sm font-bold">Endirim (₼):</span>
            <div class="w-24">
              <UiInput v-model="discount" type="number" placeholder="0.00" class="!py-1.5 !text-right font-bold" />
            </div>
          </div>
        </div>
        
        <div class="border-t border-[var(--border-app)] border-dashed pt-4 mb-5 flex justify-between items-end">
          <div class="flex flex-col">
            <span class="text-xs uppercase font-bold tracking-wider text-[var(--text-app)] opacity-50 mb-1">Cəmi Ödəniləcək</span>
            <span class="text-3xl font-black text-[var(--text-primary)]">{{ finalTotal.toFixed(2) }} ₼</span>
          </div>
          <div class="text-[10px] font-bold px-2 py-1 bg-[var(--text-primary)]/10 text-[var(--text-primary)] rounded-md">
            {{ cart.reduce((total, i) => total + i.qty, 0) }} ədəd məhsul
          </div>
        </div>

        <UiButton 
          size="lg" 
          block 
          variant="primary" 
          @click="handlePayment" 
          :disabled="cart.length === 0"
          class="shadow-xl shadow-[var(--text-primary)]/20 text-lg group overflow-hidden relative"
        >
          <span class="relative z-10 flex items-center justify-center gap-2">
            Ödəniş Prosesinə Keç
            <UiIcon name="lucide:arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <!-- Dynamic hover flare -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
        </UiButton>
      </div>
    </div>
    
  </div>

  <!-- Payment Modal -->
  <Modal v-model="showPaymentModal" title="Ödəniş Təsdiqi və Çap" max-width="md">
    <div class="p-4 space-y-6">
      
      <div class="bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/20 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
        <UiIcon name="lucide:banknote" class="w-24 h-24 absolute right-[-10px] bottom-[-10px] opacity-[0.03] text-[var(--text-primary)]" />
        <span class="text-[var(--text-app)] font-bold opacity-80 uppercase tracking-widest text-xs mb-2">Yekun Məbləğ</span>
        <span class="text-4xl font-black text-[var(--text-primary)] drop-shadow-sm">{{ finalTotal.toFixed(2) }} ₼</span>
      </div>

      <div>
        <h4 class="font-bold text-[var(--text-app)] mb-3 text-sm">Ödəniş Metodunu Seçin</h4>
        <div class="grid grid-cols-2 gap-3">
          <button 
            @click="paymentMethod = 'cash'"
            class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 font-bold tracking-wide"
            :class="paymentMethod === 'cash' ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/10 text-[var(--text-primary)]' : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/30 text-[var(--text-app)] opacity-70 hover:opacity-100 bg-[var(--bg-app)]'"
          >
            <UiIcon name="lucide:coins" class="w-8 h-8 mb-2" />
            Nəğd
          </button>
          <button 
            @click="paymentMethod = 'card'"
            class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 font-bold tracking-wide"
            :class="paymentMethod === 'card' ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/10 text-[var(--text-primary)]' : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/30 text-[var(--text-app)] opacity-70 hover:opacity-100 bg-[var(--bg-app)]'"
          >
            <UiIcon name="lucide:credit-card" class="w-8 h-8 mb-2" />
            Bank Kartı
          </button>
        </div>
      </div>

      <div class="flex gap-3 pt-4 border-t border-[var(--border-app)]">
        <UiButton 
          variant="outline" 
          block 
          @click="showPaymentModal = false"
          class="flex-1"
        >
          Ləğv Et
        </UiButton>
        <UiButton 
          variant="success" 
          block 
          class="flex-1 shadow-lg shadow-[var(--color-brand-success)]/20 relative group text-white"
          @click="completeOrder"
          :loading="isSaving"
        >
          <span class="flex items-center gap-2">
            <UiIcon name="lucide:printer" class="w-5 h-5 group-hover:animate-bounce" />
            Təsdiqlə və Çap Et
          </span>
        </UiButton>
      </div>

    </div>
  </Modal>

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
