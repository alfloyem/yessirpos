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
    inTable: true, 
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
    type: 'tags', 
    inTable: true, 
    sortable: true, 
    historyKey: 'brand_history' 
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
    inTable: true, 
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
    { key: 'parentProductId', label: t('products.parentProduct', 'Asılı olduğu məhsul'), icon: 'lucide:box', type: 'select', required: true, options: productOptions },
  ]
})

// --- Variant Schema Bottom ---
const variantSchemaBottom = computed<FormField[]>(() => [
  { key: 'barcode', label: t('customers.barcode', 'Barkod'), icon: 'lucide:qr-code', type: 'barcode', barcodePrefix: 'P', required: true },
  { key: 'wholesalePrice', label: t('products.wholesalePrice', 'Topdansatış qiyməti (₼)'), icon: 'lucide:coins', type: 'number', required: true },
  { key: 'retailPrice', label: t('products.retailPrice', 'Pərakəndə qiyməti (₼)'), icon: 'lucide:banknote', type: 'number', required: true },
  { key: 'stock', label: t('dashboard.stock', 'Stok (Say)'), icon: 'lucide:package-check', type: 'integer', placeholder: '0', required: true },
  { key: 'reorderLevel', label: t('products.reorderLevel', 'Yenidən sifariş limiti'), icon: 'lucide:alert-circle', type: 'integer', placeholder: '0', required: true },
])

// Extract table columns dynamically
const columns = computed(() => 
  goodsSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)


// --- Data ---
const mockData = ref<any[]>([])
const loading = ref(false)

const loadGoods = async () => {
  loading.value = true
  try {
    // For now still using mock data simulation because API is not ready
    // But structured for the future
    setTimeout(() => {
      mockData.value = [
        { 
          id: 1, 
          rowNumber: 1,
          brandName: ['nike'],
          productName: 'Nike Air Max T-Shirt',
          category: ['Geyim', 'İdman'],
          barcode: '123456789012',
          description: 'Rahat və keyfiyyətli idman köynəyi',
          images: [],
          createdAt: '2026-03-03 10:15', 
          createdBy: 'Admin'
        },
        { 
          id: 101, 
          rowNumber: 2,
          parentProductId: 1,
          parentProductName: 'Nike Air Max T-Shirt',
          brandName: 'nike',
          productName: 'Nike Air Max T-Shirt',
          category: ['Geyim', 'İdman'],
          attribute: ['Ölçü: M', 'Rəng: Qırmızı'],
          barcode: '111122223333',
          wholesalePrice: 40,
          retailPrice: 85,
          stock: 25,
          reorderLevel: 5,
          images: [],
          createdAt: '2026-03-03 10:20', 
          createdBy: 'Admin'
        }
      ]
      loading.value = false
    }, 500)
  } catch (err: any) {
    toast.error(t('toast.loadingError', 'Məlumatlar yüklənərkən xəta baş verdi'))
    loading.value = false
  }
}


// Modals State
const showAddModal = ref(false)
const showEditModal = ref(false)
const showVariantModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteTarget = ref<{ type: 'single' | 'bulk', id?: any, ids?: any[] } | null>(null)
const formData = ref<any>({})
const variantFormData = ref<any>({})
const formErrors = ref<Record<string, string>>({})
const bulkSelectedIds = ref<any[]>([])
const barcodeError = ref('')
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

onMounted(() => {
  loadGoods()
  loadAttributes()
})

// --- Handlers ---
const handleAdd = () => {
  formData.value = {
    brandName: 'nike',
    category: []
  }
  productImages.value = []
  barcodeError.value = ''
  showAddModal.value = true
}

const handleStandaloneVariantAdd = () => {
  variantFormData.value = {
    parentProductId: null,
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
  formData.value = { ...row }
  productImages.value = [...(row.images || [])]
  barcodeError.value = ''
  showEditModal.value = true
}

const handleDelete = (row: any) => {
  deleteTarget.value = { type: 'single', id: row.id }
  showDeleteConfirmModal.value = true
}

const performDelete = async () => {
  if (!deleteTarget.value) return
  loading.value = true
  
  try {
    if (deleteTarget.value.type === 'single') {
      // API call placeholder
      // await $fetch(`/api/goods/${deleteTarget.value.id}`, { method: 'DELETE' })
      mockData.value = mockData.value.filter(m => m.id !== deleteTarget.value!.id)
    } else if (deleteTarget.value.type === 'bulk') {
      // await $fetch('/api/goods/bulk-delete', { method: 'POST', body: { ids: deleteTarget.value.ids } })
      mockData.value = mockData.value.filter(m => !deleteTarget.value!.ids!.includes(m.id))
    }
    
    mockData.value.forEach((item, index) => {
      item.rowNumber = index + 1
    })
    
    toast.success(t('common.delete', 'Silindi'))
    showDeleteConfirmModal.value = false
    deleteTarget.value = null
  } catch (err: any) {
    toast.error(t('toast.operationFailed', 'Xəta baş verdi'))
  } finally {
    loading.value = false
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

const handleDuplicate = (row: any) => {
  const toast = useToast()
  const d = new Date()
  const formattedDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  
  const newId = Date.now()
  const baseName = row.productName.replace(/\s\d+$/, '')
  const existingNames = mockData.value.map(item => item.name)
  let count = 1
  let newName = `${baseName} ${count}`
  while (existingNames.includes(newName)) {
    count++
    newName = `${baseName} ${count}`
  }
  
  const duplicatedData = {
    ...row,
    id: newId,
    barcode: generateBarcode(),
    productName: newName,
    images: [...(row.images || [])],
    createdAt: formattedDate,
    createdBy: 'Admin'
  }
  
  mockData.value.push(duplicatedData)
  
  mockData.value.forEach((item, idx) => {
    item.rowNumber = idx + 1
  })
  toast.success(t('toast.attributeDuplicated', 'Kopyalandı')) // reusing key or should add productSpecific
}

const handleBulkDelete = (ids: any[]) => {
  deleteTarget.value = { type: 'bulk', ids }
  showDeleteConfirmModal.value = true
}

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  formData.value = {}
  barcodeError.value = ''
  showEditModal.value = true
}

const validateForm = () => {
  const errors: Record<string, string> = {}
  
  if (showAddModal.value || showEditModal.value) {
    const isBulkEditMode = showEditModal.value && bulkSelectedIds.value.length > 0
    const activeFields = formFields.value

    for (const field of activeFields) {
      if (field.required && !formData.value[field.key]) {
        if (!isBulkEditMode) {
          errors[field.key] = t('common.fieldRequired', 'Bu xəna mütləq doldurulmalıdır')
        }
      }
    }
  } else if (showVariantModal.value) {
    for (const field of [...variantSchemaTop.value, ...variantSchemaBottom.value]) {
      if (field.required && !variantFormData.value[field.key]) {
        errors[field.key] = t('common.fieldRequired', 'Bu xəna mütləq doldurulmalıdır')
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
  
  loading.value = true
  const d = new Date()
  const formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth()+1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  try {
    if (showAddModal.value) {
      mockData.value.push({ 
        id: Date.now(),
        rowNumber: mockData.value.length + 1,
        images: [...productImages.value],
        ...formData.value,
        createdAt: formattedDate,
        createdBy: 'Admin'
      })
      toast.success(t('toast.customerAdded', 'Əlavə edildi'))
      showAddModal.value = false
    } else if (showEditModal.value) {
      if (bulkSelectedIds.value.length > 0) {
        const updates = Object.fromEntries(Object.entries(formData.value).filter(([_, v]) => v !== undefined && v !== ''))
        mockData.value = mockData.value.map(item => 
          bulkSelectedIds.value.includes(item.id) ? { ...item, ...updates } : item
        )
        bulkSelectedIds.value = []
      } else {
        const index = mockData.value.findIndex(m => m.id === formData.value.id)
        if (index !== -1) {
          mockData.value[index] = { 
            ...mockData.value[index], 
            ...formData.value,
            images: [...productImages.value]
          }
        }
      }
      toast.success(t('toast.customerUpdated', 'Yeniləndi'))
      showEditModal.value = false
    } else if (showVariantModal.value) {
      const parentProduct = mockData.value.find(m => m.id === variantFormData.value.parentProductId)
      if (parentProduct) {
        mockData.value.push({
          id: Date.now(),
          rowNumber: mockData.value.length + 1,
          parentProductId: parentProduct.id,
          parentProductName: parentProduct.productName,
          brandName: parentProduct.brandName,
          productName: parentProduct.productName,
          category: parentProduct.category,
          ...variantFormData.value,
          attribute: selectedVariantAttr.value.map(s => `${s.name}: ${s.value}`),
          images: [...variantImages.value],
          createdAt: formattedDate,
          createdBy: 'Admin'
        })
        toast.success(t('toast.customerAdded', 'Variant əlavə edildi'))
        showVariantModal.value = false
      }
    }
  } catch (err: any) {
    toast.error(t('toast.operationFailed'))
  } finally {
    loading.value = false
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
      :data="mockData" 
      :columns="columns"
      :selectable="true"
      :actions="true"
      :loading="loading"
      :custom-search="customSearch"
      @add="handleAdd"
      @edit="handleEdit"
      @delete="handleDelete"
      @duplicate="handleDuplicate"
      @bulk-delete="handleBulkDelete"
      @bulk-edit="handleBulkEdit"
    >
      <template #extra-actions>
        <UiButton 
          variant="soft-primary" 
          size="sm" 
          icon="lucide:layers" 
          @click="handleStandaloneVariantAdd"
        >
          {{ t('products.addVariant', 'Variant Əlavə Et') }}
        </UiButton>
      </template>

      <!-- Row Number Custom Format -->
      <template #cell-rowNumber="{ value }">
        <span class="font-medium text-[var(--text-app)] opacity-60">
          {{ value }}
        </span>
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
      <template #cell-brandName="{ value }">
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="(brand, idx) in (Array.isArray(value) ? value : [value])" 
            :key="idx"
            class="font-semibold text-[var(--text-primary)]"
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
      <template #cell-wholesalePrice="{ value, highlight }">
        <span class="font-medium text-[var(--text-app)]" v-html="highlight(Number(value || 0).toFixed(2)) + ' ₼'"></span>
      </template>
      <template #cell-retailPrice="{ value, highlight }">
        <span class="font-medium text-[var(--color-brand-success)] font-bold" v-html="highlight(Number(value || 0).toFixed(2)) + ' ₼'"></span>
      </template>

      <!-- Category Custom Format -->
      <template #cell-category="{ value, highlight }">
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="(cat, idx) in (Array.isArray(value) ? value : [value])" 
            :key="idx" 
            class="px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide bg-[var(--text-primary)]/10 text-[var(--text-primary)] shrink-0"
            v-html="highlight(cat)"
          >
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
      <div class="flex flex-col lg:flex-row gap-8 items-start h-full pb-2">
        <!-- Left: Image Section (Expanded) -->
        <div class="w-full lg:w-[45%] shrink-0 space-y-4">
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] opacity-40">
            {{ t('products.image', 'Məhsulun şəkilləri') }}
          </div>
          <div class="w-full">
            <ImageCarousel 
              :images="productImages"
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

      <div class="flex flex-col lg:flex-row gap-8 items-start h-full pb-2">
        <!-- Left: Image Section (Expanded) -->
        <div v-if="bulkSelectedIds.length === 0" class="w-full lg:w-[45%] shrink-0 space-y-4">
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] opacity-40">
            {{ t('products.image', 'Məhsulun şəkilləri') }}
          </div>
          <div class="w-full">
            <ImageCarousel 
              :images="productImages"
              @update:images="val => productImages = val"
            />
          </div>
        </div>

        <!-- Right: Form Fields -->
        <div :class="bulkSelectedIds.length === 0 ? 'flex-1 w-full lg:border-l lg:border-[var(--border-app)] lg:pl-8' : 'w-full'">
          <DynamicForm 
            :fields="formFields"
            v-model="formData"
            :gridCols="bulkSelectedIds.length === 0 ? 1 : 2" 
          />
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm">{{ t('common.update', 'Yenilə') }}</UiButton>
      </template>
    </Modal>

    <!-- Variant Əlavə Et / Modal -->
    <Modal v-model="showVariantModal" :title="t('products.addVariant', 'Variant Əlavə Et')" max-width="3xl" is-top max-height="90vh">
      <div class="flex flex-col lg:flex-row gap-8 items-start h-full pb-2">
        <!-- Left: Image Section (Expanded) -->
        <div class="w-full lg:w-[45%] shrink-0 space-y-4">
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] opacity-40">
            {{ t('products.variantImage', 'Variant Şəkilləri') }}
          </div>
          <div class="w-full">
            <ImageCarousel 
              :images="variantImages"
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
          />

          <!-- Custom Attributes Management -->
          <div class="space-y-4 pt-4 border-t border-[var(--border-app)]">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-[var(--text-app)] tracking-wider uppercase">
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
                placeholder="+ Atribut əlavə et..."
                :options="availableAttributes.map(a => ({ label: a.name, value: a.id }))"
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
            />
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showVariantModal = false">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm">{{ t('products.saveVariant', 'Variantı Yadda Saxla') }}</UiButton>
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
