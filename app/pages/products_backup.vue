<script setup lang="ts">
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth, useNuxtApp } from '#imports'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiSelect from '~/components/ui/Select.vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiSwitch from '~/components/ui/Switch.vue'
import UiDropdown from '~/components/ui/Dropdown.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'
import ImageCarousel from '~/components/ui/ImageCarousel.vue'
import ProductCard from '~/components/products/ProductCard.vue'
import { printBarcode } from '~/utils/receiptPrinter'
import { exportToCSV, exportToJSON, exportToXML, exportToPDF } from '~/utils/dataExporter'

const { t } = useI18n()
const { token } = useAuth()
const toast = useToast()
const { $api } = useNuxtApp()

useHead({
  title: t('products.title', 'Məhsullar')
})

// --- Helper for Barcode Generation ---
const generateBarcode = (prefix = '', exclude: string[] = []) => {
  // Combine all current possible barcodes in UI
  const currentInUI = [
    formData.value?.barcode,
    ...(newVariantsList.value || []).map((v: any) => v.barcode),
    ...exclude
  ].filter(Boolean)

  const cBarcodes = [
    ...mockData.value.map((m: any) => m.barcode),
    ...currentInUI
  ]
    .filter(b => typeof b === 'string' && new RegExp(`^${prefix || 'P'}\\d{7}$`).test(b))
    .map(b => parseInt(b.substring(1), 10))
  
  let nextNum = 1
  if (cBarcodes.length > 0) {
    nextNum = Math.max(...cBarcodes) + 1
  }
  
  const existingSet = new Set([
     ...mockData.value.map((m: any) => m.barcode),
     ...currentInUI
  ])

  let barcode = `${prefix || 'P'}${String(nextNum).padStart(7, '0')}`
  while (existingSet.has(barcode)) {
    nextNum++
    barcode = `${prefix || 'P'}${String(nextNum).padStart(7, '0')}`
  }
  
  return barcode
}

// --- Data ---
const mockData = useState<any[]>('products_mockdata', () => [])
const loading = ref(false)
const searchQuery = ref('')
const suppliersOptions = useState<{ label: string, value: string }[]>('products_suppliers', () => [])
const availableAttributes = useState<any[]>('products_attributes', () => [])

// Columns for Export (Detailed as requested)
const productColumns = [
  { key: 'productName', label: t('products.name', 'Məhsulun adı') },
  { key: 'brandName', label: t('products.brand', 'Brendin adı') },
  { key: 'category', label: t('products.category', 'Kateqoriyası') },
  { key: 'barcode', label: t('products.barcode', 'Barkod') },
  { key: 'wholesalePrice', label: t('products.wholesalePrice', 'Topdan qiymət (₼)') },
  { key: 'retailPrice', label: t('products.retailPrice', 'Pərakəndə qiymət (₼)') },
  { key: 'stock', label: t('products.stock', 'Stok') },
  { key: 'reorderLevel', label: t('products.reorderLevel', 'Yenidən sifariş limiti') },
  { key: 'attribute', label: t('products.attribute', 'Variant/Atribut') }
]

const handleExport = (format: 'csv' | 'pdf' | 'json' | 'xml') => {
  const title = t('products.title', 'Məhsullar')
  
  // Pre-process data to flatten arrays (categories, attributes, etc.) for better readability in Excel/PDF
  const dataToExport = filteredProducts.value.map((p: any) => {
    let attrStr = ''
    if (Array.isArray(p.attribute)) {
      attrStr = p.attribute.join(', ')
    } else if (p.attribute) {
      attrStr = String(p.attribute)
    }

    return {
      ...p,
      category: Array.isArray(p.category) ? p.category.join(', ') : p.category,
      brandName: Array.isArray(p.brandName) ? p.brandName.join(', ') : p.brandName,
      attribute: attrStr
    }
  })

  switch (format) {
    case 'csv': exportToCSV(title, productColumns, dataToExport); break
    case 'pdf': exportToPDF(title, productColumns, dataToExport); break
    case 'json': exportToJSON(title, productColumns, dataToExport); break
    case 'xml': exportToXML(title, productColumns, dataToExport); break
  }
}

const filteredProducts = computed(() => {
  if (!searchQuery.value) return mockData.value
  const q = searchQuery.value.toLowerCase()
  return mockData.value.filter((p: any) => 
    (p.productName || '').toLowerCase().includes(q) || 
    (p.barcode || '').toLowerCase().includes(q)
  )
})

// --- Computed ---
const groupedProducts = computed(() => {
  const variantMap: Record<number | string, any[]> = {}
  
  mockData.value.forEach((item: any) => {
    const pid = item.parentProductId
    if (pid) {
      if (!variantMap[pid]) variantMap[pid] = []
      variantMap[pid]?.push(item)
    }
  })
  
  let result = mockData.value
    .filter((item: any) => !item.parentProductId)
    .map((item: any) => {
      // If it has variants, get stock and price from variants if it does not have it itself
      const variants = variantMap[item.id] || []
      return { ...item, variants }
    })

  if (searchQuery.value) {
    const q = searchQuery.value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    result = result.filter((group: any) => {
      const match = (item: any) => {
        const fields = [item.productName, item.barcode, Array.isArray(item.category) ? item.category.join(' ') : item.category]
        return fields.some(f => f && String(f).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, "").includes(q))
      }
      return match(group) || group.variants.some((v: any) => match(v))
    })
  }
    
  return result
})

const loadGoods = async () => {
  if (mockData.value.length === 0) loading.value = true
  try {
    const data = await $api('/api/products', { headers: { Authorization: `Bearer ${(token as any).value}` } })
    mockData.value = data as any[]
  } catch (err: any) {
    toast.error(t('toast.loadingError', 'Məlumatlar yüklənərkən xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

const loadAttributes = async () => {
  try {
    const data = await $api('/api/attributes', { headers: { Authorization: `Bearer ${(token as any).value}` } })
    availableAttributes.value = data as any[]
  } catch (err) {}
}

const loadSuppliers = async () => {
  try {
    const data = await $api('/api/suppliers')
    const brands = (data as any[]).map(s => s.brandName).filter((b, i, arr) => b && arr.indexOf(b) === i)
    suppliersOptions.value = brands.map(b => ({ label: b, value: b }))
  } catch (err) {}
}

onMounted(() => {
  loadGoods()
  loadAttributes()
  loadSuppliers()
})


// --- Modal State ---
const showProductModal = ref(false)
const showDeleteConfirmModal = ref(false)
const isSaving = ref(false)
const isEditMode = ref(false)
const confirmTarget = ref<any>(null)
const showSaleModal = ref(false)
const saleProduct = ref<any>(null)
const saleFormData = ref({
  discountValue: 0,
  discountType: 'percent', // 'percent' or 'amount'
  isSaleActive: false,
  variants: [] as any[]
})

// Forms
const formData = ref<Record<string, any>>({})
const productImages = ref<string[]>([])
const selectedCategories = ref<string[]>([]) // Assuming single string or array, UI handles

const addVariantsEnabled = ref(false)
const newVariantsList = ref<any[]>([])

// Base Form Fields (Simplified UI as requested)
const baseFormFields = computed<FormField[]>(() => [
  { key: 'productName', label: t('products.name', 'Məhsulun adı'), type: 'text', required: true },
  { key: 'brandName', label: t('products.brand', 'Brendin adı'), type: 'autocomplete', options: suppliersOptions.value },
  { key: 'category', label: t('products.category', 'Kateqoriyası'), type: 'tags' },
  { key: 'barcode', label: t('products.barcode', 'Barkod'), type: 'barcode', barcodePrefix: 'P', required: true },
  { key: 'wholesalePrice', label: t('products.wholesalePrice', 'Topdan qiymət (₼)'), type: 'number' },
  { key: 'retailPrice', label: t('products.retailPrice', 'Pərakəndə qiymət (₼)'), type: 'number', required: true },
  { key: 'stock', label: t('products.stock', 'Stok'), type: 'integer' },
  { key: 'reorderLevel', label: t('products.reorderLevel', 'Yenidən sifariş limiti'), type: 'integer' },
  { key: 'description', label: t('products.description', 'Təsviri'), type: 'textarea', colSpan: 2 }
])

const handleAdd = () => {
  formData.value = {
    barcode: generateBarcode('P')
  }
  productImages.value = []
  addVariantsEnabled.value = false
  newVariantsList.value = []
  isEditMode.value = false
  showProductModal.value = true
}

const addVariantRow = () => {
  newVariantsList.value.push({
    id: Date.now().toString(),
    attribute: [], // array of { id, name, value }
    barcode: generateBarcode('P'), 
    wholesalePrice: formData.value.wholesalePrice || null,
    retailPrice: formData.value.retailPrice || null,
    stock: formData.value.stock || null,
    reorderLevel: formData.value.reorderLevel || null
  })
}

const duplicateVariantRow = (variant: any) => {
  newVariantsList.value.push({
    ...JSON.parse(JSON.stringify(variant)),
    id: Date.now().toString(),
    barcode: generateBarcode('P') // New barcode for the duplicate
  })
}

const showDeleteVariantConfirmModal = ref(false)
const variantIndexToDelete = ref<number | null>(null)

const removeVariantRow = (index: number) => {
  variantIndexToDelete.value = index
  showDeleteVariantConfirmModal.value = true
}

const confirmDeleteVariant = () => {
  if (variantIndexToDelete.value !== null) {
    newVariantsList.value.splice(variantIndexToDelete.value, 1)
  }
  showDeleteVariantConfirmModal.value = false
  variantIndexToDelete.value = null
}

const handleSaveProduct = async () => {
  // Validate required fields
  const errors: string[] = []
  if (!formData.value.productName?.trim()) errors.push(t('products.validation.nameRequired', 'Məhsul adı mütləqdir'))
  if (!formData.value.barcode?.trim()) errors.push(t('products.validation.barcodeRequired', 'Barkod mütləqdir'))
  if (formData.value.retailPrice === undefined || formData.value.retailPrice === null || formData.value.retailPrice === '') errors.push(t('products.validation.retailPriceRequired', 'Satış qiyməti mütləqdir'))

  if (errors.length > 0) {
    errors.forEach(e => toast.error(e))
    return
  }

  isSaving.value = true
  try {
    let finalPayload = { ...formData.value, images: productImages.value }
    if (!isEditMode.value) {
      const newParent = await $api<any>('/api/products', { method: 'POST', body: finalPayload })
      mockData.value.push(newParent)

      if (addVariantsEnabled.value && newVariantsList.value.length > 0) {
        for (const v of newVariantsList.value) {
          const vPayload = {
            parentProductId: newParent.id,
            productName: formData.value.productName,
            brandName: formData.value.brandName,
            category: formData.value.category,
            barcode: v.barcode,
            wholesalePrice: v.wholesalePrice,
            retailPrice: v.retailPrice,
            stock: v.stock || 0,
            reorderLevel: v.reorderLevel || 0,
            attribute: v.attribute.map((a: any) => `${a.name}: ${a.value}`)
          }
          const savedVariant = await $api<any>('/api/products', { method: 'POST', body: vPayload })
          mockData.value.push(savedVariant)
        }
      }
      toast.success(t('products.added', 'Məhsul əlavə edildi'))
    } else {
      const updatedParent = await $api<any>(`/api/products/${formData.value.id}`, { method: 'PUT', body: finalPayload })
      const idx = mockData.value.findIndex((p: any) => p.id === formData.value.id)
      if (idx !== -1) mockData.value[idx] = updatedParent

      // Handle Deleted Variants
      const originalVariants = formData.value.variants || []
      const currentVariantIds = newVariantsList.value.map((v: any) => v.id)
      const variantsToDelete = originalVariants.filter((ov: any) => !currentVariantIds.includes(ov.id))
      
      for (const dv of variantsToDelete) {
        try {
          await $api(`/api/products/${dv.id}`, { method: 'DELETE' })
          const vIdx = mockData.value.findIndex((pm: any) => pm.id === dv.id)
          if (vIdx !== -1) mockData.value.splice(vIdx, 1)
        } catch (err) {}
      }

      // Upsert current variants
      if (addVariantsEnabled.value && newVariantsList.value.length > 0) {
        for (const v of newVariantsList.value) {
          const vPayload = {
            parentProductId: updatedParent.id,
            productName: formData.value.productName,
            brandName: formData.value.brandName,
            category: formData.value.category,
            barcode: v.barcode,
            wholesalePrice: v.wholesalePrice,
            retailPrice: v.retailPrice,
            stock: v.stock || 0,
            reorderLevel: v.reorderLevel || 0,
            attribute: v.attribute.map((a: any) => `${a.name}: ${a.value}`)
          }
          // If it's local timestamp based ID (or just not in original), it's newly added during edit
          const isNew = v.id.toString().length > 10 || !originalVariants.find((ov: any) => ov.id === v.id)
          
          if (isNew) { 
            const savedVariant = await $api<any>('/api/products', { method: 'POST', body: vPayload })
            mockData.value.push(savedVariant)
          } else {
            const upVar = await $api<any>(`/api/products/${v.id}`, { method: 'PUT', body: vPayload })
            const upIdx = mockData.value.findIndex((p: any) => p.id === v.id)
            if (upIdx !== -1) mockData.value[upIdx] = upVar
          }
        }
      } else if (!addVariantsEnabled.value && originalVariants.length > 0) {
        // If variants were disabled, delete all original variants
        for (const dv of originalVariants) {
          try {
            await $api(`/api/products/${dv.id}`, { method: 'DELETE' })
            const vIdx = mockData.value.findIndex((pm: any) => pm.id === dv.id)
            if (vIdx !== -1) mockData.value.splice(vIdx, 1)
          } catch (err) {}
        }
      }
      toast.success(t('products.updated', 'Yeniləndi'))
    }
    
    showProductModal.value = false
    await loadGoods() // Reload structure to group properly
  } catch (err: any) {
    toast.error(t('toast.operationFailed', 'Xəta oldu'))
  } finally {
    isSaving.value = false
  }
}

// Quick / Base Actions
const handleEdit = (product: any) => {
  formData.value = { ...product }
  productImages.value = [...(product.images || [])]
  
  if (product.variants && product.variants.length > 0) {
    addVariantsEnabled.value = true
    newVariantsList.value = product.variants.map((v: any) => {
      return {
        id: v.id,
        attribute: Array.isArray(v.attribute) ? v.attribute.map((a: string) => {
          const parts = a.split(':')
          const name = parts[0]?.trim() || ''
          const value = parts[1]?.trim() || ''
          const attrDef = availableAttributes.value.find((ax: any) => ax.name === name)
          return { id: attrDef?.id || Math.random().toString(), name, value }
        }) : [],
        barcode: v.barcode,
        wholesalePrice: v.wholesalePrice,
        retailPrice: v.retailPrice,
        stock: v.stock,
        reorderLevel: v.reorderLevel
      }
    })
  } else {
    addVariantsEnabled.value = false
    newVariantsList.value = []
  }
  
  isEditMode.value = true
  showProductModal.value = true
}

const handleDuplicateProduct = (product: any) => {
  // Deep clone the product data
  const data = JSON.parse(JSON.stringify(product))
  const newlyGeneratedBarcodes: string[] = []
  
  const newParentBarcode = generateBarcode('P')
  newlyGeneratedBarcodes.push(newParentBarcode)

  // Prepare form data (excluding variants which are handled separately)
  formData.value = {
    ...data,
    id: undefined,
    barcode: newParentBarcode
  }
  delete formData.value.variants

  // Copy images
  productImages.value = data.images ? [...data.images] : []

  // Handle variants if they exist
  if (data.variants && data.variants.length > 0) {
    addVariantsEnabled.value = true
    newVariantsList.value = data.variants.map((v: any) => {
      // Parse attribute strings back into object format needed by UI
      const attrs = Array.isArray(v.attribute) ? v.attribute.map((str: string) => {
        const parts = str.split(':')
        const name = parts[0]?.trim() || ''
        const value = parts[1]?.trim() || ''
        const attrDef = availableAttributes.value.find((ax: any) => ax.name === name)
        return { id: attrDef?.id || Math.random().toString(), name, value }
      }) : []

      const vBarcode = generateBarcode('P', newlyGeneratedBarcodes)
      newlyGeneratedBarcodes.push(vBarcode)

      return {
        ...v,
        id: Date.now().toString() + Math.random(), // Temp ID for new variant
        barcode: vBarcode,
        attribute: attrs
      }
    })
  } else {
    addVariantsEnabled.value = false
    newVariantsList.value = []
  }

  isEditMode.value = false // Treat as a new product
  showProductModal.value = true
}

const handleDeleteClick = (product: any) => {
  confirmTarget.value = product
  showDeleteConfirmModal.value = true
}

const performDelete = async () => {
  if (!confirmTarget.value) return
  isSaving.value = true
  try {
    await $api(`/api/products/${confirmTarget.value.id}`, { method: 'DELETE' })
    mockData.value = mockData.value.filter((p: any) => p.id !== confirmTarget.value.id && p.parentProductId !== confirmTarget.value.id)
    toast.success(t('products.deleted', 'Silindi'))
    showDeleteConfirmModal.value = false
  } catch {
    toast.error('Xəta baş verdi')
  } finally {
    isSaving.value = false
  }
}

const handleSale = (product: any) => {
  saleProduct.value = JSON.parse(JSON.stringify(product))
  saleFormData.value = {
    discountValue: product.discountValue || 0,
    discountType: product.discountType || 'percent',
    isSaleActive: product.isSaleActive || false,
    variants: (product.variants || []).map((v: any) => ({
      id: v.id,
      attribute: v.attribute,
      discountValue: v.discountValue || 0,
      discountType: v.discountType || 'percent',
      isSaleActive: v.isSaleActive || false,
      retailPrice: v.retailPrice
    }))
  }
  showSaleModal.value = true
}

const handleSaveSale = async () => {
  isSaving.value = true
  try {
    // Save main product discount
    await $api(`/api/products/${saleProduct.value.id}`, {
      method: 'PUT',
      body: {
        discountValue: Number(saleFormData.value.discountValue) || 0,
        discountType: saleFormData.value.discountType,
        isSaleActive: saleFormData.value.isSaleActive
      }
    })

    // Save variant discounts
    for (const v of saleFormData.value.variants) {
      await $api(`/api/products/${v.id}`, {
        method: 'PUT',
        body: {
          discountValue: Number(v.discountValue) || 0,
          discountType: v.discountType,
          isSaleActive: v.isSaleActive
        }
      })
    }

    toast.success(t('products.saleUpdated', 'Endirim yeniləndi'))
    showSaleModal.value = false
    await loadGoods()
  } catch (err) {
    toast.error(t('toast.operationFailed', 'Xəta oldu'))
  } finally {
    isSaving.value = false
  }
}

const handleBarcodeClick = (product: any) => {
  // Əgər bu bir variantdırsa (parentProductId varsa), sadəcə onu çap et
  if (product.parentProductId) {
    if (product.barcode) {
      printBarcode({
        barcode: product.barcode,
        productName: product.productName,
        attribute: product.attribute,
        price: product.retailPrice
      })
    }
    return
  }

  // Əgər məhsulun variantları varsa və "Hamısını Çap Et" seçilibsə
  if (product.variants && product.variants.length > 0) {
    // Əvvəlcə əsas məhsulun barkodunu çap et (əgər varsa)
    if (product.barcode) {
      printBarcode({
        barcode: product.barcode,
        productName: product.productName,
        attribute: product.attribute,
        price: product.retailPrice
      })
    }
    
    // Sonra bütün variantları çap et
    product.variants.forEach((variant: any) => {
      if (variant.barcode) {
        printBarcode({
          barcode: variant.barcode,
          productName: product.productName,
          attribute: variant.attribute,
          price: variant.retailPrice
        })
      }
    })
  } else if (product.barcode) {
    // Variant yoxdursa, sadəcə məhsulun öz barkodunu çap et
    printBarcode({
      barcode: product.barcode,
      productName: product.productName,
      attribute: product.attribute,
      price: product.retailPrice
    })
  }
}

const handlePrintVariant = (variant: any) => {
  if (variant.barcode) {
    printBarcode({
      barcode: variant.barcode,
      productName: formData.value.productName,
      attribute: variant.attribute.map((a: any) => `${a.name}: ${a.value}`),
      price: variant.retailPrice
    })
  }
}

const formatVariantAttr = (attr: any) => {
  if (!attr) return ''
  if (Array.isArray(attr)) return attr.join(', ')
  try {
    const parsed = JSON.parse(attr)
    if (Array.isArray(parsed)) return parsed.join(', ')
    return String(parsed)
  } catch {
    return String(attr)
  }
}

const calculateDiscountedPrice = (originalPrice: number | string, discountValue: number | string, discountType: string) => {
  const price = Number(originalPrice) || 0
  const val = Number(discountValue) || 0
  if (discountType === 'percent') {
    return Math.max(0, price * (1 - val / 100)).toFixed(2)
  }
  return Math.max(0, price - val).toFixed(2)
}
</script>

<template>
  <div class="space-y-6 font-sans">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">{{ t('products.title', 'Məhsullar') }}</h1>
      <div class="flex items-center gap-3 w-full md:w-auto">
        <!-- Export Dropdown -->
        <UiDropdown menuClass="absolute right-0 top-full mt-2 w-48 p-2 z-[60]">
          <template #trigger>
            <UiButton 
              variant="soft"
              size="sm"
              icon="lucide:download"
              class="!h-10 !w-10 !p-0 rounded-xl"
              :title="t('common.export', 'İxrac et')"
            />
          </template>

          <template #menu>
            <div @click.stop="handleExport('csv')" class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-[var(--text-primary)]/10 transition-colors text-[var(--text-app)]">
              <UiIcon name="lucide:file-spreadsheet" class="w-4 h-4 text-[var(--color-brand-success)]" />
              <span class="font-medium">Excel (CSV)</span>
            </div>
            <div @click.stop="handleExport('pdf')" class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-[var(--text-primary)]/10 transition-colors text-[var(--text-app)]">
              <UiIcon name="lucide:file-text" class="w-4 h-4 text-[var(--color-brand-danger)]" />
              <span class="font-medium">PDF</span>
            </div>
            <div @click.stop="handleExport('json')" class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-[var(--text-primary)]/10 transition-colors text-[var(--text-app)]">
              <UiIcon name="lucide:file-json" class="w-4 h-4 text-[var(--color-brand-warning)]" />
              <span class="font-medium">JSON</span>
            </div>
            <div @click.stop="handleExport('xml')" class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-[var(--text-primary)]/10 transition-colors text-[var(--text-app)]">
              <UiIcon name="lucide:code" class="w-4 h-4 text-[var(--text-primary)]" />
              <span class="font-medium">XML</span>
            </div>
          </template>
        </UiDropdown>

        <div class="relative w-full md:w-64">
          <UiIcon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] opacity-50" />
          <input 
            v-model="searchQuery" 
            :placeholder="t('common.search', 'Axtar...')" 
            class="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-app)] text-[var(--text-app)] text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
          />
        </div>
        <UiButton size="sm" variant="soft" icon="gravity-ui:plus" @click="handleAdd" class="shrink-0 !h-10 rounded-xl">
          {{ t('products.addNew') }}
        </UiButton>
      </div>
    </div>

    <!-- Product Grid -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-[var(--text-app)] opacity-50">
      <UiIcon name="lucide:loader-2" class="w-8 h-8 animate-spin" />
    </div>
    <div v-else-if="groupedProducts.length === 0" class="flex flex-col items-center justify-center py-20 bg-[var(--input-bg)] rounded-2xl border border-[var(--border-app)] opacity-50">
      <UiIcon name="lucide:package-open" class="w-16 h-16 mb-4 opacity-30" />
      <p class="text-lg font-medium">{{ t('common.noData') }}</p>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
      <ProductCard 
        v-for="product in groupedProducts" 
        :key="product.id" 
        :product="product"
        @edit="handleEdit"
        @duplicate="handleDuplicateProduct"
        @print-barcode="handleBarcodeClick"
        @delete="handleDeleteClick"
        @sale="handleSale"
      />
    </div>

    <!-- Modals -->
    <!-- Add/Edit Single Product Modal -->
    <Modal 
      v-model="showProductModal" 
      :title="isEditMode ? t('products.edit', 'Məhsulu Redaktə Et') : t('products.addNew', 'Yeni Məhsul')" 
      max-width="6xl" 
      is-top 
      max-height="85vh"
    >
      <div class="flex flex-col lg:flex-row gap-8 items-start h-full">
        <!-- Left: Image Section -->
        <div class="w-full lg:w-[33%] shrink-0 space-y-4 lg:sticky lg:top-0">
          <ImageCarousel 
            :images="productImages"
            :product-name="formData.productName"
            @update:images="(val: string[]) => productImages = val"
          />
        </div>

        <!-- Right: Fields -->
        <div class="flex-1 w-full space-y-6">
          <DynamicForm 
            :fields="baseFormFields"
            v-model="formData" 
            :gridCols="2"
          />

          <!-- Variants Header & Switch -->
          <div class="flex items-center justify-between pt-2">
            <div class="flex items-center gap-4 cursor-pointer group" @click="addVariantsEnabled = !addVariantsEnabled">
              <h4 class="text-sm font-bold text-[var(--text-app)] group-hover:text-[var(--text-primary)] transition-colors">{{ t('products.variants', 'Variantlar') }}</h4>
              <UiSwitch v-model="addVariantsEnabled" @click.stop />
            </div>
            <UiButton 
              v-if="addVariantsEnabled" 
              variant="soft-primary" 
              size="sm" 
              icon="lucide:plus" 
              @click="addVariantRow"
            >
              {{ t('products.addVariant', 'Yeni Variant') }}
            </UiButton>
          </div>

          <!-- Variants Flow (If Enabled) -->
          <div v-if="addVariantsEnabled" class="space-y-4">

            <div v-for="(v, index) in newVariantsList" :key="index" class="p-5 bg-[var(--text-primary)]/[0.01] border border-[var(--border-app)] rounded-[14px] relative group hover:border-[var(--text-primary)]/20 transition-colors">
              <div class="absolute top-4 right-4 flex items-center gap-1">
                <button 
                  @click="duplicateVariantRow(v)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-app)] opacity-40 hover:bg-[var(--text-primary)]/10 hover:opacity-100 transition-all"
                  :title="t('common.duplicate', 'Kopyala')"
                >
                  <UiIcon name="lucide:copy" class="w-4 h-4" />
                </button>
                <button 
                  @click="removeVariantRow(index)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-brand-danger)] opacity-40 hover:bg-[var(--color-brand-danger)]/10 hover:opacity-100 transition-all"
                  :title="t('common.delete', 'Sil')"
                >
                  <UiIcon name="lucide:trash-2" class="w-4 h-4" />
                </button>
              </div>

              <div class="pr-10 flex flex-col gap-4">
                <!-- Attributes Top Row -->
                <div class="flex flex-wrap gap-2 items-center">
                  <!-- Selected Attributes as Badges -->
                  <div 
                    v-for="(sel, i) in v.attribute" 
                    :key="i" 
                    class="flex items-center gap-1.5 px-3 py-2 border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] rounded-lg font-medium hover:border-[var(--text-primary)]/[0.15] hover:bg-[var(--text-primary)]/[0.04] transition-colors"
                  >
                    <span class="font-bold opacity-40 tracking-wider text-xs">{{ sel.name }}:</span> 
                    
                    <UiDropdown menuClass="absolute top-full left-0 mt-2 min-w-[120px] z-[70] bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl shadow-xl overflow-hidden py-1">
                      <template #trigger>
                        <div class="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity outline-none text-sm">
                          <span class="font-bold text-[var(--text-primary)]">{{ sel.value }}</span>
                          <UiIcon name="lucide:chevron-down" class="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40 ml-0.5" />
                        </div>
                      </template>
                      <template #menu="{ close }">
                        <div class="max-h-48 overflow-y-auto custom-scrollbar">
                          <button 
                            v-for="val in availableAttributes.find((xa: any) => xa.name === sel.name)?.values || []" 
                            :key="val"
                            @click="sel.value = val; close()" 
                            class="w-full px-4 py-2 text-sm font-bold text-left hover:bg-[var(--text-primary)]/10 transition-colors"
                            :class="sel.value === val ? 'text-[var(--text-primary)] bg-[var(--text-primary)]/5' : 'text-[var(--text-app)]'"
                          >
                            {{ val }}
                          </button>
                        </div>
                      </template>
                    </UiDropdown>
                    
                    <button 
                      @click="v.attribute.splice(i, 1)" 
                      class="ml-1 text-[var(--text-app)] opacity-30 hover:opacity-100 hover:text-[var(--color-brand-danger)] transition-colors"
                      :title="t('common.delete', 'Sil')"
                    >
                      <UiIcon name="lucide:x" class="w-3.5 h-3.5" stroke-width="2.5" />
                    </button>
                  </div>

                  <!-- Dynamic + Add Attribute Trigger -->
                  <UiDropdown 
                    v-if="availableAttributes.filter((a: any) => !v.attribute.find((x: any) => x.name === a.name)).length > 0"
                    menuClass="absolute top-full left-0 mt-2 min-w-[140px] z-[70] bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl shadow-xl overflow-hidden py-1"
                  >
                    <template #trigger>
                      <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--text-primary)]/20 hover:border-[var(--text-primary)]/50 text-[var(--text-app)] opacity-60 hover:opacity-100 transition-all cursor-pointer group">
                        <UiIcon name="lucide:plus" class="w-3.5 h-3.5" />
                        <span class="font-bold text-xs tracking-wider">{{ t('products.attribute', 'Atribut') }}</span>
                      </div>
                    </template>
                    <template #menu="{ close }">
                      <div class="max-h-48 overflow-y-auto custom-scrollbar">
                        <button 
                          v-for="a in availableAttributes.filter((attr: any) => !v.attribute.find((x: any) => x.name === attr.name))" 
                          :key="a.id"
                          @click="v.attribute.push({ id: a.id, name: a.name, value: a.values[0] }); close()"
                          class="w-full px-4 py-2 text-sm font-bold text-left hover:bg-[var(--text-primary)]/10 text-[var(--text-app)] transition-colors"
                        >
                          {{ a.name }}
                        </button>
                      </div>
                    </template>
                  </UiDropdown>
                </div>

                <!-- Inputs Labeled Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">{{ t('products.barcode', 'Barkod') }}</label>
                    <UiInput 
                      v-model="v.barcode" 
                      class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none font-mono text-sm"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">{{ t('products.wholesalePriceShort', 'Topdan (₼)') }}</label>
                    <UiInput 
                      v-model="v.wholesalePrice" 
                      type="number" 
                      class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none font-semibold"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">{{ t('products.retailPriceShort', 'Pərakəndə (₼)') }}</label>
                    <UiInput 
                      v-model="v.retailPrice" 
                      type="number" 
                      class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none text-[var(--color-brand-success)] font-semibold"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">{{ t('products.stock', 'Stok') }}</label>
                    <UiInput 
                      v-model="v.stock" 
                      type="number" 
                      class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showProductModal = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="handleSaveProduct" :disabled="isSaving">
          {{ isSaving ? t('common.pleaseWait', 'Gözləyin...') : t('common.save', 'Yadda Saxla') }}
        </UiButton>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteConfirmModal" :max-width="'sm'" :show-header="false">
      <div class="px-2 py-4 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-2xl bg-[var(--color-brand-danger)]/10 flex items-center justify-center mb-6 text-[var(--color-brand-danger)]">
          <UiIcon name="lucide:trash-2" class="w-8 h-8" stroke-width="2" />
        </div>
        <h3 class="text-xl font-bold text-[var(--text-app)] mb-2 tracking-wide">{{ t('common.delete') }}</h3>
        <p class="text-base font-medium text-[var(--text-app)] opacity-60 leading-relaxed mb-8 max-w-[280px]">
          {{ t('products.deleteConfirmMessage', 'Məhsulu və bağlı olan bütün variantları silmək istədiyinizə əminsiniz?') }}
        </p>
        <div class="flex items-center gap-3 w-full">
          <UiButton variant="ghost" class="flex-1 !h-12" @click="showDeleteConfirmModal = false">{{ t('common.cancel') }}</UiButton>
          <UiButton variant="danger" class="flex-1 !h-12" @click="performDelete" :disabled="isSaving">{{ t('common.delete', 'Sil') }}</UiButton>
        </div>
      </div>
    </Modal>

    <!-- Variant Delete Confirmation Modal -->
    <Modal v-model="showDeleteVariantConfirmModal" :max-width="'sm'" :show-header="false">
      <div class="px-2 py-4 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-2xl bg-[var(--color-brand-danger)]/10 flex items-center justify-center mb-6 text-[var(--color-brand-danger)]">
          <UiIcon name="lucide:trash-2" class="w-8 h-8" stroke-width="2" />
        </div>
        <h3 class="text-xl font-bold text-[var(--text-app)] mb-2 tracking-wide">{{ t('products.deleteVariant', 'Variantı Sil') }}</h3>
        <p class="text-base font-medium text-[var(--text-app)] opacity-60 leading-relaxed mb-8 max-w-[280px]">
          {{ t('products.deleteVariantConfirm', 'Bu variantı silmək istədiyinizə əminsiniz?') }}
        </p>
        <div class="flex items-center gap-3 w-full">
          <UiButton variant="ghost" class="flex-1 !h-12" @click="showDeleteVariantConfirmModal = false">{{ t('common.cancel') }}</UiButton>
          <UiButton variant="danger" class="flex-1 !h-12" @click="confirmDeleteVariant">{{ t('common.yesDelete', 'Bəli, Sil') }}</UiButton>
        </div>
      </div>
    </Modal>

    <!-- Sale / Discount Modal -->
    <Modal 
      v-model="showSaleModal" 
      :title="t('products.manageSale', 'Endirim İdarəetməsi')" 
      max-width="2xl" 
      is-top
    >
      <div v-if="saleProduct" class="space-y-5">
        <!-- Main Product Section -->
        <div class="bg-[var(--text-primary)]/[0.02] border border-[var(--border-app)] rounded-2xl p-5">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-[var(--text-primary)]/10 flex items-center justify-center text-[var(--text-primary)] shrink-0">
              <UiIcon name="lucide:tag" class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-bold text-[var(--text-app)] truncate">{{ saleProduct.productName }}</h3>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-bold opacity-40 uppercase tracking-wider">{{ t('products.mainProduct', 'Əsas Məhsul') }}</span>
                <div v-if="saleFormData.isSaleActive" class="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                  <span class="text-[10px] line-through opacity-30 font-bold">{{ saleProduct.retailPrice }} ₼</span>
                  <span class="text-[11px] font-black text-green-500">
                    {{ calculateDiscountedPrice(saleProduct.retailPrice, saleFormData.discountValue, saleFormData.discountType) }} ₼
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-6">
              <!-- Unified Input Group -->
              <div v-if="saleFormData.isSaleActive" class="flex items-center bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl overflow-hidden focus-within:border-[var(--text-primary)]/50 focus-within:ring-4 focus-within:ring-[var(--text-primary)]/5 transition-all animate-in fade-in slide-in-from-right-2">
                <input 
                  v-model="saleFormData.discountValue" 
                  type="number" 
                  step="0.01" 
                  class="w-24 h-10 bg-transparent border-none px-4 text-[15px] font-black text-[var(--text-app)] outline-none placeholder:opacity-20 no-spinner"
                  placeholder="0.00"
                />
                
                <!-- Toggle Group -->
                <div class="flex items-center gap-1 p-1 bg-[var(--border-app)]/20 mr-1 rounded-lg">
                  <button 
                    @click="saleFormData.discountType = 'percent'"
                    class="w-8 h-8 flex items-center justify-center rounded-md text-xs font-black transition-all"
                    :class="saleFormData.discountType === 'percent' 
                      ? 'bg-[var(--text-primary)] text-white shadow-sm' 
                      : 'text-[var(--text-app)] opacity-40 hover:opacity-100'"
                  >
                    %
                  </button>
                  <button 
                    @click="saleFormData.discountType = 'amount'"
                    class="w-8 h-8 flex items-center justify-center rounded-md text-xs font-black transition-all"
                    :class="saleFormData.discountType === 'amount' 
                      ? 'bg-[var(--text-primary)] text-white shadow-sm' 
                      : 'text-[var(--text-app)] opacity-40 hover:opacity-100'"
                  >
                    ₼
                  </button>
                </div>
              </div>
              <UiSwitch v-model="saleFormData.isSaleActive" />
            </div>
          </div>
        </div>

        <!-- Variants Section -->
        <div v-if="saleFormData.variants.length > 0" class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <h4 class="text-[11px] font-black text-[var(--text-app)] opacity-40 uppercase tracking-[0.1em] flex items-center gap-2">
              <UiIcon name="lucide:layers" class="w-3.5 h-3.5" />
              {{ t('products.variantDiscounts', 'Variant Endirimləri') }}
            </h4>
            <span class="text-[10px] font-bold opacity-30">{{ saleFormData.variants.length }} variant</span>
          </div>
          
          <div class="border border-[var(--border-app)] rounded-2xl overflow-hidden bg-[var(--input-bg)]/30">
            <div class="max-h-[350px] overflow-y-auto custom-scrollbar">
              <div 
                v-for="(v, idx) in saleFormData.variants" 
                :key="v.id" 
                class="flex items-center gap-4 p-3 hover:bg-[var(--text-primary)]/[0.02] transition-colors"
                :class="{ 'border-t border-[var(--border-app)]': idx !== 0 }"
              >
                <!-- Variant Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap gap-1 mb-1">
                    <span v-for="attr in (typeof v.attribute === 'string' ? JSON.parse(v.attribute) : v.attribute)" :key="attr" class="px-1.5 py-0.5 bg-[var(--text-primary)]/5 text-[var(--text-primary)] text-[10px] font-black rounded-md">
                      {{ attr }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold opacity-40" :class="{ 'line-through opacity-20': v.isSaleActive }">
                      {{ v.retailPrice }} ₼
                    </span>
                    <span v-if="v.isSaleActive" class="text-[10px] font-black text-green-500 animate-in fade-in slide-in-from-left-1">
                      {{ calculateDiscountedPrice(v.retailPrice, v.discountValue, v.discountType) }} ₼
                    </span>
                  </div>
                </div>

                <!-- Variant Actions -->
                <div class="flex items-center gap-3">
                   <div v-if="v.isSaleActive" class="flex items-center bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg overflow-hidden focus-within:border-[var(--text-primary)]/50 focus-within:ring-4 focus-within:ring-[var(--text-primary)]/5 transition-all animate-in fade-in zoom-in-95 duration-200">
                    <input 
                      v-model="v.discountValue" 
                      type="number" 
                      step="0.01" 
                      class="w-16 h-8 bg-transparent border-none px-2 text-[13px] font-black text-[var(--text-app)] outline-none placeholder:opacity-20 no-spinner"
                      placeholder="0"
                    />
                    
                    <!-- Variant Toggle -->
                    <div class="flex items-center mr-0.5">
                      <button 
                        @click="v.discountType = 'percent'"
                        class="w-6 h-6 flex items-center justify-center rounded-sm text-[9px] font-black transition-all"
                        :class="v.discountType === 'percent' 
                          ? 'bg-[var(--text-primary)] text-white shadow-sm' 
                          : 'text-[var(--text-app)] opacity-40 hover:opacity-100'"
                      >
                        %
                      </button>
                      <button 
                        @click="v.discountType = 'amount'"
                        class="w-6 h-6 flex items-center justify-center rounded-sm text-[9px] font-black transition-all"
                        :class="v.discountType === 'amount' 
                          ? 'bg-[var(--text-primary)] text-white shadow-sm' 
                          : 'text-[var(--text-app)] opacity-40 hover:opacity-100'"
                      >
                        ₼
                      </button>
                    </div>
                  </div>
                  <UiSwitch v-model="v.isSaleActive" size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showSaleModal = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="handleSaveSale" :disabled="isSaving">
          {{ isSaving ? t('common.pleaseWait', 'Gözləyin...') : t('common.save', 'Yadda Saxla') }}
        </UiButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
/* Hide number input spinners */
.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.no-spinner {
  -moz-appearance: textfield;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}
</style>