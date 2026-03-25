<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import UiDropdown from '~/components/ui/Dropdown.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'
import ImageCarousel from '~/components/ui/ImageCarousel.vue'
import { printBarcode } from '~/utils/receiptPrinter'

const { t } = useI18n()
const { token, logout } = useAuth()
const toast = useToast()

useHead({
  title: t('menu.products')
})

// --- Helper for Barcode Generation ---
const generateBarcode = (prefix = '') => {
  const cBarcodes = mockData.value
    .map(m => m.barcode)
    .filter(b => typeof b === 'string' && new RegExp(`^${prefix || 'P'}\\d{7}$`).test(b))
    .map(b => parseInt(b.substring(1), 10))
  
  let nextNum = 1
  if (cBarcodes.length > 0) {
    nextNum = Math.max(...cBarcodes) + 1
  }
  
  let barcode = `${prefix || 'P'}${String(nextNum).padStart(7, '0')}`
  
  const existingSet = new Set(mockData.value.map(m => m.barcode))
  while (existingSet.has(barcode)) {
    nextNum++
    barcode = `${prefix || 'P'}${String(nextNum).padStart(7, '0')}`
  }
  
  return barcode
}


// --- Centralized Schema ---
const goodsSchema = computed< (FormField & { inTable?: boolean, sortable?: boolean })[] >(() => [
  { 
    key: 'rowNumber', 
    label: t('common.rowNumber'), 
    type: 'text', 
    inTable: true, 
    sortable: false 
  },
  { 
    key: 'images', 
    label: t('products.image'), 
    type: 'text', 
    inTable: true, 
    sortable: false 
  },
  { 
    key: 'parentProductName', 
    label: t('products.parentProduct'), 
    type: 'text', 
    inTable: false, 
    sortable: true 
  },
  { 
    key: 'productName', 
    label: t('products.name'), 
    icon: 'lucide:package', 
    type: 'text', 
    inTable: true, 
    sortable: true, 
    required: true 
  },
  { 
    key: 'brandName', 
    label: t('products.brand'), 
    icon: 'lucide:award', 
    type: 'autocomplete', 
    options: suppliersOptions.value,
    inTable: true, 
    sortable: true, 
    required: false
  },
  { 
    key: 'category', 
    label: t('products.category'), 
    icon: 'lucide:folder', 
    type: 'tags', 
    inTable: true, 
    sortable: true, 
    historyKey: 'goods_category' 
  },
  { 
    key: 'attribute', 
    label: t('menu.attributes'), 
    icon: 'lucide:tag', 
    type: 'tags', 
    inTable: false, 
    sortable: true 
  },
  { 
    key: 'barcode', 
    label: t('products.barcode'), 
    icon: 'lucide:qr-code', 
    type: 'text', 
    inTable: true, 
    sortable: true, 
    required: true 
  },
  { 
    key: 'wholesalePrice', 
    label: t('products.wholesalePrice'), 
    type: 'number', 
    inTable: true, 
    sortable: true 
  },
  { 
    key: 'retailPrice', 
    label: t('products.retailPrice'), 
    type: 'number', 
    inTable: true, 
    sortable: true 
  },
  { 
    key: 'stock', 
    label: t('products.stock'), 
    type: 'integer', 
    inTable: true, 
    sortable: true 
  },
  { 
    key: 'reorderLevel', 
    label: t('products.reorderLevel'), 
    type: 'integer', 
    inTable: true, 
    sortable: true 
  },
  { 
    key: 'description', 
    label: t('products.description'), 
    icon: 'lucide:file-text', 
    type: 'textarea', 
    colSpan: 2, 
    inTable: false 
  },
  { 
    key: 'createdAt', 
    label: t('customers.createdAt'), 
    type: 'text', 
    inTable: false, 
    sortable: true 
  },
  { 
    key: 'createdBy', 
    label: t('customers.createdBy'), 
    type: 'text', 
    inTable: false, 
    sortable: true 
  },
])

// Modal'da gösterilecek form alanları (Base Product)
const formFields = computed(() => {
  return goodsSchema.value.filter(f => ['productName', 'brandName', 'category', 'description'].includes(f.key))
})

// --- Variant Schema Top ---
const variantSchemaTop = computed<FormField[]>(() => {
  // Seçilə biləcək Base Productlar
  const productOptions = mockData.value
    .filter(m => !m.parentProductId) // Yalnız əsas məhsullar
    .map(p => ({ label: p.productName, value: p.id }))

  return [
    { key: 'parentProductId', label: t('products.parentProduct'), icon: 'lucide:box', type: 'select', required: true, options: productOptions, disabled: true },
  ]
})

// --- Variant Schema Bottom ---
const variantSchemaBottom = computed<FormField[]>(() => [
  { key: 'barcode', label: t('products.barcode'), icon: 'lucide:qr-code', type: 'barcode', barcodePrefix: 'P', required: true },
  { key: 'wholesalePrice', label: t('products.wholesalePrice'), icon: 'lucide:coins', type: 'number', required: false },
  { key: 'retailPrice', label: t('products.retailPrice'), icon: 'lucide:banknote', type: 'number', required: true },
  { key: 'stock', label: t('products.stockQty'), icon: 'lucide:package-check', type: 'integer', placeholder: '0', required: true },
  { key: 'reorderLevel', label: t('products.reorderLevelHint'), icon: 'lucide:alert-circle', type: 'integer', placeholder: '0', required: false },
])

// --- Data ---
const mockData = ref<any[]>([])
const suppliersOptions = ref<{ label: string, value: string }[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(15)
const expandedProducts = ref<Set<string>>(new Set())

const toggleProductVariants = (productId: string) => {
  if (expandedProducts.value.has(productId)) {
    expandedProducts.value.delete(productId)
  } else {
    expandedProducts.value.add(productId)
  }
}

const isProductExpanded = (productId: string) => {
  return expandedProducts.value.has(productId)
}

const groupedProducts = computed(() => {
  const variantMap: Record<string, any[]> = {}
  const parentMap: Record<string, any> = {}

  mockData.value.forEach(item => {
    if (item.parentProductId) {
      if (!variantMap[item.parentProductId]) variantMap[item.parentProductId] = []
      variantMap[item.parentProductId]?.push(item)
    } else {
      parentMap[item.id] = item
    }
  })

  let allGrouped = Object.values(parentMap).map(main => ({
    ...main,
    variants: variantMap[main.id] || []
  }))

  if (searchQuery.value) {
    const normalizeText = (text: any) => {
      if (text === null || text === undefined) return ''
      return String(text).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    }
    const q = normalizeText(searchQuery.value)

    const matches = (item: any) => {
      const searchableFields = [
        item.productName, item.barcode, item.parentProductName, item.description,
        Array.isArray(item.brandName) ? item.brandName.join(' ') : item.brandName,
        Array.isArray(item.category) ? item.category.join(' ') : item.category,
        Array.isArray(item.attribute) ? item.attribute.join(' ') : item.attribute,
        item.wholesalePrice, item.retailPrice, item.createdBy
      ]
      return searchableFields.some(field => normalizeText(field).includes(q))
    }

    allGrouped = allGrouped.filter(group => {
      if (matches(group)) return true
      const matchedVariants = group.variants.filter((v: any) => matches(v))
      if (matchedVariants.length > 0) return true
      return false
    })
  }

  return allGrouped
})

const totalPages = computed(() => Math.ceil(groupedProducts.value.length / itemsPerPage.value))
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return groupedProducts.value.slice(start, start + itemsPerPage.value)
})

const bulkEditType = computed(() => {
  if (currentSelectionIds.value.length === 0) return 'none'
  const selected = mockData.value.filter(m => currentSelectionIds.value.includes(m.id))
  const hasBase = selected.some(s => !s.parentProductId)
  const hasVariant = selected.some(s => !!s.parentProductId)
  
  if (hasBase && hasVariant) return 'mixed'
  if (hasBase) return 'base'
  return 'variants'
})

const canBulkEdit = computed(() => bulkEditType.value !== 'mixed')

const bulkEditFields = computed(() => {
  if (bulkEditType.value === 'base') {
    // For base products, we don't bulk edit names
    return formFields.value.filter(f => f.key !== 'productName')
  }
  if (bulkEditType.value === 'variants') {
    // For variants, we bulk edit things like prices and stock, but not barcode or parent
    return variantSchemaBottom.value.filter(f => f.key !== 'barcode')
  }
  return formFields.value
})

const loadGoods = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/products', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    mockData.value = (data as any[]).map((p, idx) => ({
      ...p,
      rowNumber: idx + 1
    }))
  } catch (err: any) {
    toast.error(t('toast.loadingError'))
  } finally {
    loading.value = false
  }
}


// Modals State
const showAddModal = ref(false)
const showEditModal = ref(false)
const showVariantModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteTarget = ref<{ type: 'single' | 'bulk', id?: any, ids?: any[] } | null>(null)
const formData = ref<Record<string, any>>({})
const variantFormData = ref<Record<string, any>>({})
const formErrors = ref<Record<string, string>>({})
const bulkSelectedIds = ref<any[]>([])
const currentSelectionIds = ref<any[]>([])
const barcodeError = ref('')
const isSaving = ref(false)
const isVariantEdit = ref(false)
const productImages = ref<string[]>([])
const variantImages = ref<string[]>([])
const availableAttributes = ref<any[]>([])
const selectedVariantAttr = ref<{ id: string, name: string, value: string }[]>([])

// Attributes for selection from DB
const loadAttributes = async () => {
  try {
    const data = await $fetch('/api/attributes', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    availableAttributes.value = data as any[]
  } catch (err) {
    console.error('Failed to load attributes', err)
  }
}

const loadSuppliers = async () => {
  try {
    const data = await $fetch('/api/suppliers', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    
    // Extract brand names and remove duplicates
    const brands = (data as any[])
      .map(s => s.brandName)
      .filter((b, i, arr) => b && arr.indexOf(b) === i)
      
    suppliersOptions.value = brands.map(b => ({ label: b, value: b }))
  } catch (err) {
    console.error('Failed to load suppliers', err)
  }
}

onMounted(() => {
  loadGoods()
  loadAttributes()
  loadSuppliers()
})

watch(searchQuery, () => {
  currentPage.value = 1
})

const toggleSelection = (id: any) => {
  const idx = currentSelectionIds.value.indexOf(id)
  if (idx !== -1) currentSelectionIds.value.splice(idx, 1)
  else currentSelectionIds.value.push(id)
}

const toggleSelectAll = () => {
  const visibleIds: any[] = []
  paginatedProducts.value.forEach(p => {
    visibleIds.push(p.id)
    p.variants.forEach((v: any) => visibleIds.push(v.id))
  })
  
  const allSelected = visibleIds.every(id => currentSelectionIds.value.includes(id))
  if (allSelected) {
    currentSelectionIds.value = currentSelectionIds.value.filter(id => !visibleIds.includes(id))
  } else {
    visibleIds.forEach(id => {
      if (!currentSelectionIds.value.includes(id)) currentSelectionIds.value.push(id)
    })
  }
}

const formatPrice = (val: any) => Number(val || 0).toFixed(2)
const getMinPrice = (variants: any[]) => Math.min(...variants.map(v => Number(v.retailPrice || 0)))
const getMaxPrice = (variants: any[]) => Math.max(...variants.map(v => Number(v.retailPrice || 0)))
const getStockColor = (stock: number, reorderLevel: number) => {
  const s = Number(stock || 0)
  const r = Number(reorderLevel || 0)
  if (s <= 0) return 'text-[var(--color-brand-danger)]'
  if (s <= r) return 'text-[var(--color-brand-warning)]'
  return 'text-[var(--text-app)]'
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

// --- Handlers ---
const handleAdd = () => {
  formData.value = {
    brandName: '',
    category: []
  }
  productImages.value = []
  barcodeError.value = ''
  showAddModal.value = true
}

const handleStandaloneVariantAdd = (row: any) => {
  variantFormData.value = {
    parentProductId: row.id,
    productName: row.productName,
    brandName: row.brandName,
    category: row.category,
    barcode: generateBarcode('P'),
    wholesalePrice: row.wholesalePrice || '0.00',
    retailPrice: row.retailPrice || '0.00',
    stock: '',
    reorderLevel: row.reorderLevel || ''
  }
  variantImages.value = []
  selectedVariantAttr.value = []
  barcodeError.value = ''
  showVariantModal.value = true
}

const addAttributeToVariant = (attrId: string) => {
  const attr = availableAttributes.value.find(a => a.id === attrId)
  if (attr && !selectedVariantAttr.value.find(s => s.id === attr.id)) {
    selectedVariantAttr.value.push({
      id: attr.id,
      name: attr.name,
      value: attr.values?.[0] || ''
    })
  }
}

const removeAttributeFromVariant = (index: number) => {
  selectedVariantAttr.value.splice(index, 1)
}

const handleEdit = (row: any) => {
  bulkSelectedIds.value = [] // Clear bulk selection if editing single row
  if (row.parentProductId) {
    // Edit Variant
    isVariantEdit.value = true
    variantFormData.value = { ...row }
    variantImages.value = [...(row.images || [])]
    
    // Parse attributes like "Color: Red" back to {id, name, value}
    let rawAttrs = []
    if (row.attribute) {
      if (Array.isArray(row.attribute)) {
        rawAttrs = row.attribute
      } else if (typeof row.attribute === 'string') {
        try {
          const parsed = JSON.parse(row.attribute)
          rawAttrs = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          rawAttrs = [row.attribute]
        }
      }
    }

    selectedVariantAttr.value = rawAttrs.map((attrStr: any) => {
      const str = String(attrStr)
      const [name, value] = str.split(':').map(s => s.trim())
      const attrDef = availableAttributes.value.find(a => a.name === name)
      return {
        id: attrDef?.id || Math.random().toString(),
        name: name,
        value: value || ''
      }
    })
    
    barcodeError.value = ''
    showVariantModal.value = true
  } else {
    // Edit Main Product
    formData.value = { ...row }
    productImages.value = [...(row.images || [])]
    barcodeError.value = ''
    showEditModal.value = true
  }
}

const handleDelete = (row: any) => {
  deleteTarget.value = { type: 'single', id: row.id }
  showDeleteConfirmModal.value = true
}

const performDelete = async () => {
  if (!deleteTarget.value) return
  isSaving.value = true
  
  try {
    const headers = { Authorization: `Bearer ${token.value}` }
    if (deleteTarget.value.type === 'single') {
      const idToDelete = deleteTarget.value.id
      await $fetch(`/api/products/${idToDelete}`, { method: 'DELETE', headers })
      mockData.value = mockData.value.filter(p => p.id !== idToDelete)
      toast.success(t('products.deleted'))
    } else if (deleteTarget.value.type === 'bulk') {
      const idsToDelete = deleteTarget.value.ids || []
      await $fetch('/api/products/bulk-delete', { 
        method: 'POST', 
        body: { ids: idsToDelete },
        headers 
      })
      mockData.value = mockData.value.filter(p => !idsToDelete.includes(p.id))
      currentSelectionIds.value = currentSelectionIds.value.filter(id => !idsToDelete.includes(id))
      toast.success(t('products.bulkDeleted'))
    }
    
    showDeleteConfirmModal.value = false
    deleteTarget.value = null
    bulkSelectedIds.value = []
  } catch (err: any) {
    toast.error(t('toast.operationFailed', 'Xəta baş verdi'))
  } finally {
    isSaving.value = false
  }
}

const handleBarcodeClick = (row: any) => {
  if (!row.barcode) return
  printBarcode({
    barcode: row.barcode,
    productName: row.parentProductName || row.productName,
    attribute: row.attribute,
    price: row.retailPrice
  })
}

const handleDuplicate = async (row: any) => {
  isSaving.value = true
  try {
    const baseName = row.productName.replace(/\s\d+$/, '')
    const existingNames = mockData.value.map(item => item.productName)
    let count = 1
    let newName = `${baseName} ${count}`
    while (existingNames.includes(newName)) {
      count++
      newName = `${baseName} ${count}`
    }
    
    const headers = { Authorization: `Bearer ${token.value}` }
    
    // Create the parent product copy
    const newProduct = await $fetch('/api/products', {
      method: 'POST',
      body: {
        ...row,
        id: undefined,
        barcode: generateBarcode('P'),
        productName: newName,
        images: [...(row.images || [])],
        attribute: [...(row.attribute || [])]
      },
      headers
    })
    
    mockData.value.unshift(newProduct)
    
    // If the product has variants, copy them too
    if (row.variants && row.variants.length > 0) {
      for (const variant of row.variants) {
        const newVariant = await $fetch('/api/products', {
          method: 'POST',
          body: {
            ...variant,
            id: undefined,
            parentProductId: newProduct.id,
            barcode: generateBarcode('P'),
            images: [...(variant.images || [])],
            attribute: [...(variant.attribute || [])]
          },
          headers
        })
        mockData.value.unshift(newVariant)
      }
      toast.success(t('products.duplicatedWithVariants', { count: row.variants.length }))
    } else {
      toast.success(t('products.duplicated'))
    }
    
    // Reload to get fresh data with proper grouping
    await loadGoods()
  } catch (err: any) {
    toast.error(t('toast.operationFailed'))
  } finally {
    isSaving.value = false
  }
}

const handleBulkDelete = (ids: any[]) => {
  deleteTarget.value = { type: 'bulk', ids }
  showDeleteConfirmModal.value = true
}

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  if (bulkEditType.value === 'variants') {
    variantFormData.value = {}
  } else {
    formData.value = {}
  }
  barcodeError.value = ''
  showEditModal.value = true
}

const validateForm = () => {
  const errors: Record<string, string> = {}
  
  if (showAddModal.value || showEditModal.value) {
    const isBulkEditMode = showEditModal.value && bulkSelectedIds.value.length > 0
    const activeFields = formFields.value

    for (const field of activeFields) {
      if (field.required && (!formData.value[field.key] && formData.value[field.key] !== 0)) {
        if (!isBulkEditMode) {
          errors[field.key] = t('common.pleaseFillField', { field: field.label })
        }
      }
    }
  } else if (showVariantModal.value) {
    const activeFields = [...variantSchemaTop.value, ...variantSchemaBottom.value]
    for (const field of activeFields) {
      if (field.required && (!variantFormData.value[field.key] && variantFormData.value[field.key] !== 0)) {
        errors[field.key] = t('common.pleaseFillField', { field: field.label })
      }
    }
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const customSearch = (item: any, query: string) => {
  const normalizeText = (text: any) => {
    if (text === null || text === undefined) return ''
    return String(text)
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
  }

  const q = normalizeText(query)
  
  const searchableFields = [
    item.productName,
    item.barcode,
    item.parentProductName,
    item.description,
    Array.isArray(item.brandName) ? item.brandName.join(' ') : item.brandName,
    Array.isArray(item.category) ? item.category.join(' ') : item.category,
    Array.isArray(item.attribute) ? item.attribute.join(' ') : item.attribute,
    item.wholesalePrice,
    item.retailPrice,
    item.createdBy
  ]
  
  return searchableFields.some(field => normalizeText(field).includes(q))
}

const saveForm = async () => {
  if (!validateForm()) return
  
  isSaving.value = true
  const headers = { Authorization: `Bearer ${token.value}` }

  try {
    if (showAddModal.value) {
      const newProduct = await $fetch('/api/products', {
        method: 'POST',
        body: {
          ...formData.value,
          images: productImages.value
        },
        headers
      })
      mockData.value.unshift(newProduct)
      toast.success(t('products.added'))
      showAddModal.value = false
    } else if (showEditModal.value) {
      if (bulkSelectedIds.value.length > 0) {
        const payload = bulkEditType.value === 'variants' ? variantFormData.value : formData.value
        const updates = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined && v !== ''))
        await $fetch('/api/products/bulk-update', {
          method: 'POST',
          body: { ids: bulkSelectedIds.value, updates },
          headers
        })
        bulkSelectedIds.value = []
        await loadGoods()
      } else {
        const updatedProduct = await $fetch(`/api/products/${formData.value.id}`, {
          method: 'PUT',
          body: {
            ...formData.value,
            images: productImages.value
          },
          headers
        })
        const idx = mockData.value.findIndex(p => p.id === formData.value.id)
        if (idx !== -1) mockData.value[idx] = updatedProduct
      }
      toast.success(t('products.updated'))
      showEditModal.value = false
    } else if (showVariantModal.value && !isVariantEdit.value) {
      const newVariant = await $fetch('/api/products', {
        method: 'POST',
        body: {
          ...variantFormData.value,
          attribute: selectedVariantAttr.value.map(s => `${s.name}: ${s.value}`),
          images: variantImages.value
        },
        headers
      })
      mockData.value.unshift(newVariant)
      toast.success(t('products.variantAdded'))
      showVariantModal.value = false
    } else if (showVariantModal.value && isVariantEdit.value) {
      const updatedVariant = await $fetch(`/api/products/${variantFormData.value.id}`, {
        method: 'PUT',
        body: {
          ...variantFormData.value,
          attribute: selectedVariantAttr.value.map(s => `${s.name}: ${s.value}`),
          images: variantImages.value
        },
        headers
      })
      const idx = mockData.value.findIndex(p => p.id === variantFormData.value.id)
      if (idx !== -1) mockData.value[idx] = updatedVariant
      toast.success(t('products.variantUpdated'))
      showVariantModal.value = false
      isVariantEdit.value = false
    }
  } catch (err: any) {
    const msg = err.data?.statusMessage || t('toast.operationFailed')
    toast.error(msg)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-6 font-sans">
    <!-- Header & Toolbar -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-[var(--text-app)]">
          {{ t('menu.products') }}
        </h1>
        <span class="px-2.5 py-0.5 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] text-xs font-bold">
          {{ groupedProducts.length }}
        </span>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative w-full md:w-64">
          <UiIcon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] opacity-50" />
          <input 
            v-model="searchQuery" 
            :placeholder="t('common.search')" 
            class="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-app)] text-[var(--text-app)] text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
          />
        </div>
        <UiButton variant="primary" icon="lucide:plus" @click="handleAdd" class="shrink-0 drop-shadow-sm hover:drop-shadow transition-all">
          {{ t('products.addNew') }}
        </UiButton>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <div 
      v-if="currentSelectionIds.length > 0" 
      class="flex items-center justify-between bg-[var(--input-bg)] border border-[var(--color-brand-warning)]/30 rounded-xl p-3 px-5 transition-all w-full shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div 
          class="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors bg-[var(--text-primary)] border-[var(--text-primary)]"
          @click="toggleSelectAll"
        >
          <UiIcon name="lucide:minus" class="w-3 h-3 text-[var(--bg-app)]" />
        </div>
        <span class="text-sm font-bold text-[var(--text-app)]">
          {{ currentSelectionIds.length }} {{ t('common.selected', 'Seçilib') }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <UiButton variant="outline" size="sm" icon="lucide:edit" @click="handleBulkEdit(currentSelectionIds)" :disabled="bulkEditType === 'mixed'">
          {{ t('common.bulkEdit') }}
        </UiButton>
        <UiButton variant="danger" size="sm" icon="lucide:trash-2" @click="handleBulkDelete(currentSelectionIds)">
          {{ t('common.bulkDelete') }}
        </UiButton>
      </div>
    </div>

    <!-- Products Grid -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-[var(--text-app)] opacity-50">
      <UiIcon name="lucide:loader-2" class="w-8 h-8 animate-spin" />
    </div>
    
    <div v-else-if="paginatedProducts.length === 0" class="flex flex-col items-center justify-center py-20 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl text-[var(--text-app)] opacity-50 shadow-sm mt-4">
      <UiIcon name="lucide:package-open" class="w-16 h-16 mb-4 opacity-30" />
      <p class="text-lg font-medium">{{ t('common.noData') }}</p>
    </div>
    
    <div v-else class="mt-2">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
        <!-- ═══════════════════════════════════════════════════ -->
        <!-- Product Card: Ultra-Flat Editorial Design         -->
        <!-- ═══════════════════════════════════════════════════ -->
        <div 
          v-for="product in paginatedProducts" 
          :key="product.id" 
          class="group relative flex flex-col bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl overflow-hidden transition-colors duration-300 hover:border-[var(--text-primary)]/50 hover:bg-[var(--input-bg)]"
        >
          <!-- ── Image ── -->
          <div class="relative w-full aspect-[5/4] bg-[var(--input-bg)] overflow-hidden">
            <img 
              v-if="product.images?.length" 
              :src="product.images[0]" 
              class="w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]" 
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-[var(--text-primary)]/[0.03]">
              <UiIcon name="lucide:image" class="w-10 h-10 text-[var(--text-app)] opacity-[0.12]" stroke-width="1" />
            </div>

            <!-- Image count -->
            <div 
              v-if="product.images?.length > 1" 
              class="absolute bottom-2.5 right-2.5 h-6 px-2 flex items-center rounded-md bg-[var(--bg-app)]/90 backdrop-blur-sm border border-[var(--border-app)] text-[9px] font-bold tracking-wider text-[var(--text-app)]"
            >
              <UiIcon name="lucide:image" class="w-3 h-3 mr-1 opacity-50" />{{ product.images.length }}
            </div>

            <!-- Hover overlay with checkbox + actions -->
            <div class="absolute inset-0 bg-[var(--text-primary)]/[0.00] group-hover:bg-[var(--text-primary)]/[0.04] transition-colors duration-500 pointer-events-none"></div>

            <!-- Checkbox (top-left, appears on hover or when selected) -->
            <div class="absolute top-2.5 left-2.5 z-10">
              <div 
                class="w-5 h-5 rounded-[5px] border flex items-center justify-center cursor-pointer transition-all duration-200"
                :class="currentSelectionIds.includes(product.id) 
                  ? 'bg-[var(--text-primary)] border-[var(--text-primary)] opacity-100' 
                  : 'bg-[var(--bg-app)]/90 border-[var(--border-app)] opacity-0 group-hover:opacity-100'"
                @click="toggleSelection(product.id)"
              >
                <UiIcon v-if="currentSelectionIds.includes(product.id)" name="lucide:check" class="w-3 h-3 text-white" />
              </div>
            </div>

            <!-- Actions button (top-right, appears on hover) -->
            <div class="absolute top-2.5 right-2.5 z-10">
              <UiDropdown 
                class="opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
                menuClass="absolute top-full right-0 mt-1.5 w-44 z-[60]"
              >
                <template #trigger>
                  <button class="w-7 h-7 rounded-lg bg-[var(--bg-app)]/90 border border-[var(--border-app)] flex items-center justify-center text-[var(--text-app)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/50 transition-colors">
                    <UiIcon name="lucide:ellipsis" class="w-4 h-4" />
                  </button>
                </template>
                <template #menu="{ close }">
                  <div class="py-1">
                    <button @click="handleEdit(product); close()" class="w-full px-3.5 py-2 text-[12px] font-medium text-left flex items-center gap-2.5 hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors">
                      <UiIcon name="lucide:pen-line" class="w-3.5 h-3.5 opacity-50" /> {{ t('products.edit') }}
                    </button>
                    <button @click="handleStandaloneVariantAdd(product); close()" class="w-full px-3.5 py-2 text-[12px] font-medium text-left flex items-center gap-2.5 hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors">
                      <UiIcon name="lucide:layers" class="w-3.5 h-3.5 opacity-50" /> {{ t('products.addVariant') }}
                    </button>
                    <button @click="handleDuplicate(product); close()" class="w-full px-3.5 py-2 text-[12px] font-medium text-left flex items-center gap-2.5 hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors">
                      <UiIcon name="lucide:copy" class="w-3.5 h-3.5 opacity-50" /> {{ t('common.duplicate') }}
                    </button>
                    <button v-if="product.barcode" @click="handleBarcodeClick(product); close()" class="w-full px-3.5 py-2 text-[12px] font-medium text-left flex items-center gap-2.5 hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors">
                      <UiIcon name="lucide:barcode" class="w-3.5 h-3.5 opacity-50" /> {{ t('products.printBarcode') }}
                    </button>
                    <div class="h-px bg-[var(--border-app)] my-1"></div>
                    <button @click="handleDelete(product); close()" class="w-full px-3.5 py-2 text-[12px] font-medium text-left flex items-center gap-2.5 text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/5 transition-colors">
                      <UiIcon name="lucide:trash-2" class="w-3.5 h-3.5 opacity-50" /> {{ t('common.delete') }}
                    </button>
                  </div>
                </template>
              </UiDropdown>
            </div>
          </div>

          <!-- ── Body ── -->
          <div class="flex flex-col flex-1 p-4 pt-3.5">
            <!-- Meta row: brand · category -->
            <div class="flex items-center gap-1.5 mb-2 min-h-[14px]">
              <span v-if="product.category?.length" class="text-[9px] uppercase font-semibold tracking-[0.18em] text-[var(--text-primary)] opacity-70 truncate">
                {{ Array.isArray(product.category) ? product.category[0] : product.category }}
              </span>
              <span v-if="product.brandName && product.category?.length" class="text-[var(--text-app)] opacity-15 text-[8px]">/</span>
              <span v-if="product.brandName" class="text-[9px] uppercase font-semibold tracking-[0.18em] text-[var(--text-app)] opacity-35 truncate">
                {{ Array.isArray(product.brandName) ? product.brandName[0] : product.brandName }}
              </span>
            </div>

            <!-- Title -->
            <h3 
              class="text-[14px] font-semibold text-[var(--text-app)] leading-snug mb-3 line-clamp-2 min-h-[2.5em] group-hover:text-[var(--text-primary)] transition-colors duration-300" 
              :title="product.productName"
            >
              {{ product.productName }}
            </h3>

            <!-- Spacer -->
            <div class="mt-auto"></div>

            <!-- ── Price & Stock (No variants) ── -->
            <div v-if="product.variants.length === 0" class="flex items-baseline justify-between pt-3 border-t border-[var(--border-app)]/60">
              <span class="text-[17px] font-bold text-[var(--text-app)] tabular-nums">
                {{ formatPrice(product.retailPrice) }}
                <span class="text-[11px] font-semibold opacity-40 ml-0.5">₼</span>
              </span>
              <span 
                class="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md" 
                :class="{
                  'bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)]': Number(product.stock || 0) <= 0,
                  'bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)]': Number(product.stock || 0) > 0 && Number(product.stock || 0) <= Number(product.reorderLevel || 0),
                  'bg-[var(--text-primary)]/[0.06] text-[var(--text-app)] opacity-70': Number(product.stock || 0) > Number(product.reorderLevel || 0)
                }"
              >
                {{ product.stock || 0 }} {{ t('products.stock') }}
              </span>
            </div>

            <!-- ── Price & Variants ── -->
            <div v-else class="flex flex-col pt-3 border-t border-[var(--border-app)]/60">
              <!-- Price range -->
              <div class="flex items-baseline justify-between mb-2">
                <span class="text-[17px] font-bold text-[var(--text-app)] tabular-nums">
                  {{ formatPrice(getMinPrice(product.variants)) }}
                  <template v-if="getMinPrice(product.variants) !== getMaxPrice(product.variants)">
                    <span class="text-[11px] opacity-30 mx-0.5">–</span>
                    {{ formatPrice(getMaxPrice(product.variants)) }}
                  </template>
                  <span class="text-[11px] font-semibold opacity-40 ml-0.5">₼</span>
                </span>
              </div>

              <!-- Variant toggle -->
              <button 
                class="flex items-center justify-between w-full py-2 -mx-0 group/vtoggle transition-colors" 
                @click="toggleProductVariants(product.id)"
              >
                <span class="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-app)] opacity-40 group-hover/vtoggle:opacity-70 transition-opacity">
                  {{ product.variants.length }} variant
                </span>
                <UiIcon 
                  name="lucide:chevron-down" 
                  class="w-3.5 h-3.5 text-[var(--text-app)] opacity-30 group-hover/vtoggle:opacity-60 transition-all duration-300" 
                  :class="isProductExpanded(product.id) ? 'rotate-180' : ''" 
                />
              </button>

              <!-- Variant rows -->
              <div v-show="isProductExpanded(product.id)" class="flex flex-col gap-1.5 mt-1">
                <div 
                  v-for="variant in product.variants" 
                  :key="variant.id" 
                  class="flex items-center justify-between py-2 px-2.5 -mx-1 rounded-lg hover:bg-[var(--text-primary)]/[0.04] group/vrow transition-colors cursor-default"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <!-- Variant checkbox -->
                    <div 
                      class="w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                      :class="currentSelectionIds.includes(variant.id) ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'border-[var(--border-app)] group-hover/vrow:border-[var(--text-primary)]/40'"
                      @click.stop="toggleSelection(variant.id)"
                    >
                      <UiIcon v-if="currentSelectionIds.includes(variant.id)" name="lucide:check" class="w-2.5 h-2.5 text-white" />
                    </div>
                    <span class="text-[11px] font-medium text-[var(--text-app)] opacity-80 truncate max-w-[90px]" :title="formatVariantAttr(variant.attribute) || variant.barcode">
                      {{ formatVariantAttr(variant.attribute) || variant.barcode }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <!-- Variant inline actions -->
                    <div class="flex items-center gap-0.5 opacity-0 group-hover/vrow:opacity-100 transition-opacity">
                      <button v-if="variant.barcode" @click.stop="handleBarcodeClick(variant)" class="w-5 h-5 flex items-center justify-center rounded text-[var(--text-app)] opacity-40 hover:opacity-100 hover:text-[var(--text-primary)] transition-all" :title="t('products.printBarcode')">
                        <UiIcon name="lucide:barcode" class="w-3 h-3" />
                      </button>
                      <button @click.stop="handleEdit(variant)" class="w-5 h-5 flex items-center justify-center rounded text-[var(--text-app)] opacity-40 hover:opacity-100 hover:text-[var(--text-primary)] transition-all">
                        <UiIcon name="lucide:pen-line" class="w-3 h-3" />
                      </button>
                      <button @click.stop="handleDelete(variant)" class="w-5 h-5 flex items-center justify-center rounded text-[var(--text-app)] opacity-40 hover:opacity-100 hover:text-[var(--color-brand-danger)] transition-all">
                        <UiIcon name="lucide:trash-2" class="w-3 h-3" />
                      </button>
                    </div>
                    <span class="text-[11px] font-bold text-[var(--text-app)] tabular-nums opacity-80">{{ formatPrice(variant.retailPrice) }}</span>
                    <span 
                      class="text-[9px] font-bold tabular-nums px-1 py-px rounded" 
                      :class="{
                        'bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)]': Number(variant.stock || 0) <= 0,
                        'bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)]': Number(variant.stock || 0) > 0 && Number(variant.stock || 0) <= Number(variant.reorderLevel || 0),
                        'text-[var(--text-app)] opacity-40': Number(variant.stock || 0) > Number(variant.reorderLevel || 0)
                      }"
                    >
                      {{ variant.stock }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border-app)]">
        <div class="text-sm font-medium text-[var(--text-app)] opacity-60">
          {{ t('common.showing') }} {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, groupedProducts.length) }} ({{ groupedProducts.length }} qeyd)
        </div>
        <div class="flex items-center gap-1">
          <UiButton 
            variant="ghost" 
            size="sm" 
            icon="lucide:chevron-left" 
            :disabled="currentPage === 1"
            class="!px-2"
            @click="currentPage--"
          />
          <template v-for="p in totalPages" :key="p">
            <button 
              v-if="p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
              :class="currentPage === p ? 'bg-[var(--text-primary)] text-[var(--bg-app)] shadow-md shadow-[var(--text-primary)]/20' : 'text-[var(--text-app)] hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)]'"
              @click="currentPage = p"
            >
              {{ p }}
            </button>
            <span v-else-if="p === currentPage - 2 || p === currentPage + 2" class="w-8 h-8 flex items-center justify-center text-[var(--text-app)] opacity-50">
              ...
            </span>
          </template>
          <UiButton 
            variant="ghost" 
            size="sm" 
            icon="lucide:chevron-right" 
            :disabled="currentPage === totalPages"
            class="!px-2"
            @click="currentPage++"
          />
        </div>
      </div>
    </div>

    <!-- Modal: Add / Edit Base Product -->
    <Modal 
      v-model="showAddModal" 
      :title="t('products.addNew')" 
      max-width="3xl" 
      is-top 
      max-height="90vh"
    >
      <div class="flex flex-col lg:flex-row gap-8 items-start h-full">
        <!-- Left: Image Section (Expanded) -->
        <div class="w-full lg:w-[45%] shrink-0 space-y-4 lg:sticky lg:top-4">
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] opacity-40">
            {{ t('products.image') }}
          </div>
          <div class="w-full">
            <ImageCarousel 
              :images="productImages"
              :product-name="formData.productName"
              @update:images="val => productImages = val"
            />
          </div>
        </div>

        <!-- Right: Form Fields -->
        <div class="flex-1 w-full lg:border-l lg:border-[var(--border-app)] lg:pl-8">
          <DynamicForm 
            :fields="formFields"
            v-model="formData" 
            :gridCols="1"
            :errors="formErrors"
          />
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm">{{ t('common.save') }}</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal 
      v-model="showEditModal" 
      :title="bulkSelectedIds.length > 0 ? t('common.bulkEdit') : t('products.edit')" 
      max-width="3xl" 
      is-top 
      max-height="90vh"
    >
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        {{ t('employees.bulkEditWarning', { count: bulkSelectedIds.length, default: `Diqqət: Seçilmiş ${bulkSelectedIds.length} qeydin üzərinə yazılacak.` }) }}
      </div>

      <div class="flex flex-col lg:flex-row gap-8 items-start h-full">
        <!-- Left: Image Section (Expanded) -->
        <div v-if="bulkSelectedIds.length === 0" class="w-full lg:w-[45%] shrink-0 space-y-4 lg:sticky lg:top-4">
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] opacity-40">
            {{ t('products.image') }}
          </div>
          <div class="w-full">
            <ImageCarousel 
              :images="productImages"
              :product-name="formData.productName"
              @update:images="val => productImages = val"
            />
          </div>
        </div>

        <!-- Right: Form Fields -->
        <div :class="bulkSelectedIds.length === 0 ? 'flex-1 w-full lg:border-l lg:border-[var(--border-app)] lg:pl-8' : 'w-full'">
          <DynamicForm 
            v-if="bulkEditType === 'variants'"
            :fields="bulkEditFields"
            v-model="variantFormData"
            :gridCols="bulkSelectedIds.length === 0 ? 1 : 2" 
            :errors="formErrors"
          />
          <DynamicForm 
            v-else
            :fields="bulkEditFields"
            v-model="formData"
            :gridCols="bulkSelectedIds.length === 0 ? 1 : 2" 
            :errors="formErrors"
          />
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm">{{ t('common.update') }}</UiButton>
      </template>
    </Modal>

    <!-- Variant Modal (Add / Edit) -->
    <Modal 
      v-model="showVariantModal" 
      :title="isVariantEdit ? t('products.editVariant') : t('products.addVariant')" 
      max-width="3xl" 
      is-top 
      max-height="90vh"
      @close="isVariantEdit = false"
    >
      <div class="flex flex-col lg:flex-row gap-8 items-start h-full">
        <!-- Left: Image Section (Expanded) -->
        <div class="w-full lg:w-[45%] shrink-0 space-y-4 lg:sticky lg:top-4">
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] opacity-40">
            {{ t('products.variantImage') }}
          </div>
          <div class="w-full">
            <ImageCarousel 
              :images="variantImages"
              :product-name="variantFormData.productName"
              :attributes="selectedVariantAttr.map(a => a.value)"
              @update:images="val => variantImages = val"
            />
          </div>
        </div>

        <!-- Right: Form Fields -->
        <div class="flex-1 w-full lg:border-l lg:border-[var(--border-app)] lg:pl-8 space-y-6">
          <!-- Top Part (Parent Product) -->
          <DynamicForm 
            :fields="variantSchemaTop"
            v-model="variantFormData"
            :gridCols="1"
            :errors="formErrors"
          />

          <!-- Custom Attributes Management -->
          <div class="space-y-4 pt-4 border-t border-[var(--border-app)]">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-[var(--text-app)] tracking-wider">
                {{ t('menu.attributes') }}
              </label>
            </div>

            <div class="flex flex-col gap-3">
              <div 
                v-for="(attr, idx) in selectedVariantAttr" 
                :key="attr.id"
                class="flex items-center gap-3 p-3 bg-[var(--input-bg)] rounded-[14px] border border-[var(--border-app)] group/v-attr transition-colors hover:border-[var(--text-primary)]/30"
              >
                <div class="w-1/3 text-[14px] font-semibold text-[var(--text-app)] truncate px-2">
                  {{ attr.name }}
                </div>
                
                <div class="flex-1">
                  <UiSelect 
                    v-model="attr.value"
                    :options="availableAttributes.find(a => a.id === attr.id)?.values.map((v: string) => ({ label: v, value: v })) || []"
                  />
                </div>

                <button 
                  @click="removeAttributeFromVariant(idx)"
                  class="w-10 h-10 flex flex-shrink-0 items-center justify-center text-[var(--color-brand-danger)] opacity-0 group-hover/v-attr:opacity-100 hover:bg-[var(--color-brand-danger)]/10 rounded-lg transition-all"
                >
                  <UiIcon name="lucide:trash-2" class="w-4 h-4" />
                </button>
              </div>
              
              <!-- Add New Attribute Button directly in the list flow -->
              <UiSelect 
                v-if="availableAttributes.filter(a => !selectedVariantAttr.find(s => s.id === a.id)).length > 0"
                modelValue=""
                :placeholder="t('products.addAttribute')"
                :options="availableAttributes.filter(a => !selectedVariantAttr.find(s => s.id === a.id)).map(a => ({ label: a.name, value: a.id }))"
                @update:modelValue="addAttributeToVariant"
              />
            </div>
          </div>

          <!-- Bottom Part (Barcode, Prices, Stock) -->
          <div class="pt-4 border-t border-[var(--border-app)]">
            <DynamicForm 
              :fields="variantSchemaBottom"
              v-model="variantFormData"
              :gridCols="1" 
              :errors="formErrors"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showVariantModal = false; isVariantEdit = false">{{ t('common.cancel') }}</UiButton>
        <UiButton 
          variant="primary" 
          icon="lucide:check" 
          @click="saveForm"
        >
          {{ isVariantEdit ? t('common.update') : t('products.saveVariant') }}
        </UiButton>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal (Clean Version) -->
    <Modal 
      v-model="showDeleteConfirmModal" 
      :max-width="'sm'" 
      :show-header="false" 
      class="delete-modal"
    >
      <div class="px-2 py-4 flex flex-col items-center justify-center text-center">
        <!-- Icon -->
        <div class="w-16 h-16 rounded-2xl bg-[var(--color-brand-danger)]/10 flex items-center justify-center mb-6 text-[var(--color-brand-danger)] shadow-sm shrink-0">
          <UiIcon name="lucide:trash-2" class="w-8 h-8" stroke-width="2" />
        </div>
        
        <!-- Texts -->
        <h3 class="text-xl font-bold text-[var(--text-app)] mb-2 tracking-wide">
          {{ t('common.delete') }}
        </h3>
        
        <p class="text-[15px] font-medium text-[var(--text-app)] opacity-60 leading-relaxed mb-8 max-w-[280px]">
          {{ 
            deleteTarget?.type === 'bulk' 
              ? t('employees.bulkDeleteWarning', { count: deleteTarget.ids?.length }) 
              : t('employees.deleteWarning') 
          }}
        </p>

        <!-- Buttons -->
        <div class="flex items-center gap-3 w-full">
          <UiButton 
            variant="ghost" 
            class="flex-1 !h-12 text-[15px] font-semibold tracking-wide hover:bg-[var(--text-primary)]/5"
            @click="showDeleteConfirmModal = false"
          >
            {{ t('common.cancel') }}
          </UiButton>
          
          <UiButton 
            variant="danger" 
            class="flex-1 !h-12 text-[15px] font-semibold tracking-wide shadow-md shadow-[var(--color-brand-danger)]/20 hover:shadow-lg"
            @click="performDelete"
          >
            {{ t('common.delete') }}
          </UiButton>
        </div>
      </div>
    </Modal>
  </div>
</template>
