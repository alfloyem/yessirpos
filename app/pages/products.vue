<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'
import ImageCarousel from '~/components/ui/ImageCarousel.vue'

const { t } = useI18n()
const { token, logout } = useAuth()
const toast = useToast()

useHead({
  title: t('menu.products', 'Mallar')
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
    label: t('common.rowNumber', 'Sıra sayı'), 
    type: 'text', 
    inTable: true, 
    sortable: false 
  },
  { 
    key: 'images', 
    label: t('products.image', 'Məhsulun şəkli'), 
    type: 'text', 
    inTable: true, 
    sortable: false 
  },
  { 
    key: 'parentProductName', 
    label: t('products.parentProduct', 'Bağlı olduğu məhsul'), 
    type: 'text', 
    inTable: false, 
    sortable: true 
  },
  { 
    key: 'productName', 
    label: t('products.name', 'Məhsulun adı'), 
    icon: 'lucide:package', 
    type: 'text', 
    inTable: true, 
    sortable: true, 
    required: true 
  },
  { 
    key: 'brandName', 
    label: t('products.brand', 'Brendin adı'), 
    icon: 'lucide:award', 
    type: 'autocomplete', 
    options: suppliersOptions.value,
    inTable: true, 
    sortable: true, 
    required: true
  },
  { 
    key: 'category', 
    label: t('products.category', 'Kateqoriyası'), 
    icon: 'lucide:folder', 
    type: 'tags', 
    inTable: true, 
    sortable: true, 
    historyKey: 'goods_category' 
  },
  { 
    key: 'attribute', 
    label: t('menu.attributes', 'Atributlar'), 
    icon: 'lucide:tag', 
    type: 'tags', 
    inTable: false, 
    sortable: true 
  },
  { 
    key: 'barcode', 
    label: t('customers.barcode', 'Barkod'), 
    icon: 'lucide:qr-code', 
    type: 'text', 
    inTable: true, 
    sortable: true, 
    required: true 
  },
  { 
    key: 'wholesalePrice', 
    label: t('products.wholesalePrice', 'Top. qiymət (₼)'), 
    type: 'number', 
    inTable: true, 
    sortable: true 
  },
  { 
    key: 'retailPrice', 
    label: t('products.retailPrice', 'Pər. qiymət (₼)'), 
    type: 'number', 
    inTable: true, 
    sortable: true 
  },
  { 
    key: 'stock', 
    label: t('dashboard.stock', 'Stok'), 
    type: 'integer', 
    inTable: true, 
    sortable: true 
  },
  { 
    key: 'reorderLevel', 
    label: t('products.reorderLevel', 'Limit'), 
    type: 'integer', 
    inTable: true, 
    sortable: true 
  },
  { 
    key: 'description', 
    label: t('products.description', 'Açıqlama'), 
    icon: 'lucide:file-text', 
    type: 'textarea', 
    colSpan: 2, 
    inTable: false 
  },
  { 
    key: 'createdAt', 
    label: t('customers.createdAt', 'Yaradılma tarixi'), 
    type: 'text', 
    inTable: false, 
    sortable: true 
  },
  { 
    key: 'createdBy', 
    label: t('customers.createdBy', 'Yaradan'), 
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
    { key: 'parentProductId', label: t('products.parentProduct', 'Asılı olduğu məhsul'), icon: 'lucide:box', type: 'select', required: true, options: productOptions, disabled: true },
  ]
})

// --- Variant Schema Bottom ---
const variantSchemaBottom = computed<FormField[]>(() => [
  { key: 'barcode', label: t('customers.barcode', 'Barkod'), icon: 'lucide:qr-code', type: 'barcode', barcodePrefix: 'P', required: true },
  { key: 'wholesalePrice', label: t('products.wholesalePrice', 'Topdan qiymət (₼)'), icon: 'lucide:coins', type: 'number', required: false },
  { key: 'retailPrice', label: t('products.retailPrice', 'Pərakəndə qiyməti (₼)'), icon: 'lucide:banknote', type: 'number', required: true },
  { key: 'stock', label: t('dashboard.stock', 'Stok (Say)'), icon: 'lucide:package-check', type: 'integer', placeholder: '0', required: true },
  { key: 'reorderLevel', label: t('products.reorderLevel', 'Yenidən sifariş limiti'), icon: 'lucide:alert-circle', type: 'integer', placeholder: '0', required: false },
])

// Extract table columns dynamically
const columns = computed(() => 
  goodsSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)


// --- Data ---
const mockData = ref<any[]>([])
const suppliersOptions = ref<{ label: string, value: string }[]>([])
const loading = ref(false)

const orderedMockData = computed(() => {
  const mainProducts: any[] = []
  const variantMap: Record<number | string, any[]> = {}
  
  mockData.value.forEach(item => {
    const pid = item.parentProductId
    if (pid) {
      if (!variantMap[pid]) variantMap[pid] = []
      variantMap[pid]?.push(item)
    } else {
      mainProducts.push(item)
    }
  })
  
  const result: any[] = []
  mainProducts.forEach(main => {
    result.push(main)
    const childVariants = variantMap[main.id] || []
    childVariants.forEach(v => {
      result.push({ ...v, parentName: main.productName })
    })
  })
  
  // Re-assign row numbers sequentially for the final display
  return result.map((item, index) => ({ ...item, rowNumber: index + 1 }))
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
    toast.error(t('toast.loadingError', 'Məlumatlar yüklənərkən xəta baş verdi'))
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
    wholesalePrice: '0.00',
    retailPrice: '0.00',
    stock: '',
    reorderLevel: ''
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
      toast.success(t('common.delete', 'Silindi'))
    } else if (deleteTarget.value.type === 'bulk') {
      const idsToDelete = deleteTarget.value.ids || []
      await $fetch('/api/products/bulk-delete', { 
        method: 'POST', 
        body: { ids: idsToDelete },
        headers 
      })
      mockData.value = mockData.value.filter(p => !idsToDelete.includes(p.id))
      currentSelectionIds.value = currentSelectionIds.value.filter(id => !idsToDelete.includes(id))
      toast.success(t('common.delete', 'Toplu silindi'))
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

const copyBarcode = (barcode: string) => {
  if (!barcode) return
  navigator.clipboard.writeText(barcode).then(() => {
    toast.success(t('toast.barcodeCopied', 'Barkod kopyalandı!'))
  }).catch(() => {
    toast.error(t('toast.operationFailed', 'Xəta baş verdi'))
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
    toast.success(t('common.duplicate', 'Kopyalandı'))
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
      toast.success(t('toast.customerAdded', 'Əlavə edildi'))
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
      toast.success(t('toast.customerUpdated', 'Yeniləndi'))
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
      toast.success(t('toast.customerAdded', 'Variant əlavə edildi'))
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
      toast.success(t('toast.customerUpdated', 'Yeniləndi'))
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
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('menu.products', 'Mallar') }}
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      :title="t('menu.products', 'Mallar')"
      :data="orderedMockData" 
      :columns="columns"
      :selectable="true"
      :actions="true"
      :loading="loading"
      :custom-search="customSearch"
      :row-class="(row) => {
        let cls = ''
        if (!row.parentProductId) cls += ' !border-t-4 !border-[var(--border-app)]'
        else cls += ' !bg-[var(--text-primary)]/[0.04]'
        return cls
      }"
      :per-page="20"
      :can-bulk-edit="canBulkEdit"
      @update:selected-ids="currentSelectionIds = $event"
      @add="handleAdd"
      @edit="handleEdit"
      @delete="handleDelete"
      @duplicate="handleDuplicate"
      @bulk-delete="handleBulkDelete"
      @bulk-edit="handleBulkEdit"
    >
      <template #row-actions="{ row }">
        <div v-if="!row.parentProductId" class="relative group/add-variant flex items-center">
          <UiButton 
            variant="ghost"
            size="icon"
            icon="lucide:layers"
            @click="handleStandaloneVariantAdd(row)"
            class="hover:text-[var(--color-brand-success)] hover:bg-[var(--color-brand-success)]/10 cursor-pointer"
          />
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/add-variant:opacity-100 pointer-events-none transition-all z-50">
            {{ t('products.addVariant', 'Variant Əlavə Et') }}
          </div>
        </div>
      </template>

      <!-- Row Number Custom Format -->
      <template #cell-rowNumber="{ value }">
        <span class="font-medium text-[var(--text-app)] opacity-60">
          {{ value }}
        </span>
      </template>

      <!-- Product Name Custom Format -->
      <template #cell-productName="{ row, highlight }">
        <div class="flex flex-col">
          <div v-if="!row.parentProductId" class="font-bold text-[var(--text-app)]" v-html="highlight(row.productName)"></div>
          <div v-else class="flex items-center gap-2">
            <div class="flex flex-wrap gap-1">
              <span 
                v-for="(attr, idx) in (Array.isArray(row.attribute) ? row.attribute : [row.attribute])"
                :key="idx"
                class="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide bg-[var(--text-primary)]/10 text-[var(--text-primary)] border border-[var(--text-primary)]/10"
              >
                {{ attr }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Image Custom Format -->
      <template #cell-images="{ row }">
        <div class="flex items-center -space-x-3">
          <template v-if="row.images && row.images.length > 0">
            <div 
              v-for="(img, idx) in row.images.slice(0, 3)" 
              :key="idx" 
              class="w-10 h-10 rounded-lg overflow-hidden border-2 border-[var(--bg-app)] bg-[var(--input-bg)] shrink-0 shadow-sm"
              :style="{ zIndex: 10 - Number(idx) }"
            >
              <img :src="img" alt="Product" class="w-full h-full object-cover" />
            </div>
            <div 
              v-if="row.images.length > 3" 
              class="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-[var(--bg-app)] bg-[var(--text-primary)]/10 text-[var(--text-primary)] text-xs font-bold shrink-0 shadow-sm"
              style="z-index: 1;"
            >
              +{{ row.images.length - 3 }}
            </div>
          </template>
          <div v-else class="flex items-center justify-center w-10 h-10 bg-[var(--text-primary)]/5 rounded-lg border-2 border-[var(--bg-app)] text-[var(--text-app)] opacity-40 shrink-0 shadow-sm">
            <UiIcon name="lucide:image" class="w-4 h-4" />
          </div>
        </div>
      </template>

      <!-- Brand Name Custom Format -->
      <template #cell-brandName="{ row, value, highlight }">
        <div v-if="row.parentProductId" class="flex items-center text-[var(--text-app)] opacity-30">
          <UiIcon name="mingcute:arrow-up-line" class="w-4 h-4 ml-2" />
        </div>
        <div v-else class="flex flex-wrap gap-1">
          <span 
            v-for="(brand, idx) in (Array.isArray(value) ? value : [value])" 
            :key="idx"
            class="font-medium text-[var(--text-app)] text-sm"
          >
            {{ brand }}{{ (Array.isArray(value) && idx < value.length - 1) ? ',' : '' }}
          </span>
        </div>
      </template>

      <!-- Barcode Custom Format -->
      <template #cell-barcode="{ value, highlight }">
        <div 
          class="font-mono tracking-wider font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors inline-block"
          @click.stop="copyBarcode(value)"
          :title="t('common.clickToCopy', 'Kopyalamaq üçün kliklə')"
        >
          <span v-html="highlight(value)"></span>
        </div>
      </template>

      <!-- Prices Custom Format -->
      <template #cell-wholesalePrice="{ row, value, highlight }">
        <span v-if="!row.parentProductId" class="opacity-0">-</span>
        <span v-else class="font-medium text-[var(--text-app)]" v-html="highlight(Number(value || 0).toFixed(2)) + ' ₼'"></span>
      </template>
      <template #cell-retailPrice="{ row, value, highlight }">
        <span v-if="!row.parentProductId" class="opacity-0">-</span>
        <span v-else class="font-medium text-[var(--color-brand-success)] font-bold" v-html="highlight(Number(value || 0).toFixed(2)) + ' ₼'"></span>
      </template>

      <template #cell-stock="{ row, value, highlight }">
        <span v-if="!row.parentProductId" class="opacity-0">-</span>
        <span v-else class="font-medium text-[var(--text-app)]" v-html="highlight(value)"></span>
      </template>

      <template #cell-reorderLevel="{ row, value, highlight }">
        <span v-if="!row.parentProductId" class="opacity-0">-</span>
        <span v-else class="font-medium text-[var(--text-app)]" v-html="highlight(value)"></span>
      </template>

      <!-- Category Custom Format -->
      <template #cell-category="{ row, value, highlight }">
        <div v-if="row.parentProductId" class="flex items-center text-[var(--text-app)] opacity-30">
          <UiIcon name="mingcute:arrow-up-line" class="w-4 h-4 ml-2" />
        </div>
        <div v-else class="flex flex-wrap gap-1">
          <span 
            v-for="(cat, idx) in (Array.isArray(value) ? value : [value])" 
            :key="idx" 
            class="text-[var(--text-app)] text-sm opacity-80"
          >
            {{ cat }}{{ (Array.isArray(value) && idx < value.length - 1) ? ',' : '' }}
          </span>
        </div>
      </template>
    </DataTable>

    <!-- Modal: Add / Edit Base Product -->
    <Modal 
      v-model="showAddModal" 
      :title="t('products.addNew', 'Yeni Mal Əlavə Et')" 
      max-width="3xl" 
      is-top 
      max-height="90vh"
    >
      <div class="flex flex-col lg:flex-row gap-8 items-start h-full">
        <!-- Left: Image Section (Expanded) -->
        <div class="w-full lg:w-[45%] shrink-0 space-y-4 lg:sticky lg:top-4">
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] opacity-40">
            {{ t('products.image', 'Məhsulun şəkilləri') }}
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
        <UiButton variant="ghost" @click="showAddModal = false">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm">{{ t('common.save', 'Yadda saxla') }}</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal 
      v-model="showEditModal" 
      :title="bulkSelectedIds.length > 0 ? t('common.bulkEdit', 'Toplu Redaktə') : t('products.edit', 'Malı Redaktə Et')" 
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
            {{ t('products.image', 'Məhsulun şəkilləri') }}
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
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm">{{ t('common.update', 'Yenilə') }}</UiButton>
      </template>
    </Modal>

    <!-- Variant Modal (Add / Edit) -->
    <Modal 
      v-model="showVariantModal" 
      :title="isVariantEdit ? t('products.editVariant', 'Variantı Redaktə Et') : t('products.addVariant', 'Variant Əlavə Et')" 
      max-width="3xl" 
      is-top 
      max-height="90vh"
      @close="isVariantEdit = false"
    >
      <div class="flex flex-col lg:flex-row gap-8 items-start h-full">
        <!-- Left: Image Section (Expanded) -->
        <div class="w-full lg:w-[45%] shrink-0 space-y-4 lg:sticky lg:top-4">
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] opacity-40">
            {{ t('products.variantImage', 'Variant Şəkilləri') }}
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
                {{ t('menu.attributes', 'Atributlar') }}
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
                placeholder="+ Atribut əlavə et..."
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
        <UiButton variant="ghost" @click="showVariantModal = false; isVariantEdit = false">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton 
          variant="primary" 
          icon="lucide:check" 
          @click="saveForm"
        >
          {{ isVariantEdit ? t('common.update', 'Yenilə') : t('products.saveVariant', 'Variantı Yadda Saxla') }}
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
          {{ t('common.delete', 'Sil') }}
        </h3>
        
        <p class="text-[15px] font-medium text-[var(--text-app)] opacity-60 leading-relaxed mb-8 max-w-[280px]">
          {{ 
            deleteTarget?.type === 'bulk' 
              ? t('employees.bulkDeleteWarning', { count: deleteTarget.ids?.length, default: `Seçilmiş ${deleteTarget.ids?.length} qeydi silmək istədiyinizə əminsiniz?` }) 
              : t('employees.deleteWarning', 'Bu qeydi silmək istədiyinizə əminsiniz?') 
          }}
        </p>

        <!-- Buttons -->
        <div class="flex items-center gap-3 w-full">
          <UiButton 
            variant="ghost" 
            class="flex-1 !h-12 text-[15px] font-semibold tracking-wide hover:bg-[var(--text-primary)]/5"
            @click="showDeleteConfirmModal = false"
          >
            {{ t('common.cancel', 'Ləğv et') }}
          </UiButton>
          
          <UiButton 
            variant="danger" 
            class="flex-1 !h-12 text-[15px] font-semibold tracking-wide shadow-md shadow-[var(--color-brand-danger)]/20 hover:shadow-lg"
            @click="performDelete"
          >
            {{ t('common.delete', 'Sil') }}
          </UiButton>
        </div>
      </div>
    </Modal>
  </div>
</template>
