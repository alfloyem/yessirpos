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
const generateBarcode = () => {
  let barcode = ''
  for (let i = 0; i < 12; i++) {
    barcode += Math.floor(Math.random() * 10).toString()
  }
  return barcode
}

// Mock brands (In a real app, these would come from the database)
const brands = [
  { label: 'Nike', value: 'nike' },
  { label: 'Adidas', value: 'adidas' },
  { label: 'Zara', value: 'zara' },
  { label: 'H&M', value: 'hm' },
  { label: 'Mango', value: 'mango' }
]

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
    type: 'select', 
    inTable: true, 
    sortable: true, 
    required: true, 
    options: brands 
  },
  { 
    key: 'category', 
    label: t('products.category', 'Kateqoriyası'), 
    icon: 'lucide:folder', 
    type: 'tags', 
    inTable: true, 
    sortable: true, 
    required: true, 
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
    type: 'number', 
    inTable: true, 
    sortable: true 
  },
  { 
    key: 'description', 
    label: t('employees.notes', 'Açıqlama'), 
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

// --- Variant Schema ---
const variantSchema = computed<FormField[]>(() => {
  // Seçilə biləcək Base Productlar
  const productOptions = mockData.value
    .filter(m => !m.parentProductId) // Yalnız əsas məhsullar
    .map(p => ({ label: p.productName, value: p.id }))

  return [
    { key: 'parentProductId', label: t('products.parentProduct', 'Asılı olduğu məhsul'), icon: 'lucide:box', type: 'select', required: true, options: productOptions },
    { key: 'barcode', label: t('customers.barcode', 'Barkod'), icon: 'lucide:qr-code', type: 'text', required: true },
    { key: 'attribute', label: t('menu.attributes', 'Atribut'), icon: 'lucide:tag', type: 'tags', required: true, historyKey: 'variant_attr' },
    { key: 'wholesalePrice', label: t('products.wholesalePrice', 'Topdansatış qiyməti (₼)'), icon: 'lucide:coins', type: 'number', required: true },
    { key: 'retailPrice', label: t('products.retailPrice', 'Pərakəndə qiyməti (₼)'), icon: 'lucide:banknote', type: 'number', required: true },
    { key: 'stock', label: t('dashboard.stock', 'Stok (Say)'), icon: 'lucide:package-check', type: 'number', required: true },
    { key: 'reorderLevel', label: t('products.reorderLevel', 'Yenidən sifariş limiti'), icon: 'lucide:alert-circle', type: 'number', required: true },
  ]
})

// Extract table columns dynamically
const columns = computed(() => 
  goodsSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// Brand labels for display
const brandLabels: Record<string, string> = {
  nike: 'Nike',
  adidas: 'Adidas',
  zara: 'Zara',
  hm: 'H&M',
  mango: 'Mango'
}

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
          brandName: 'nike',
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

onMounted(() => {
  loadGoods()
})

// Modals State
const showAddModal = ref(false)
const showEditModal = ref(false)
const showVariantModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteTarget = ref<{ type: 'single' | 'bulk', id?: any, ids?: any[] } | null>(null)
const formData = ref<any>({})
const variantFormData = ref<any>({})
const bulkSelectedIds = ref<any[]>([])
const barcodeError = ref('')
const productImages = ref<string[]>([])
const variantImages = ref<string[]>([])

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
    barcode: generateBarcode(),
    attribute: [],
    wholesalePrice: 0,
    retailPrice: 0,
    stock: 0,
    reorderLevel: 0
  }
  variantImages.value = []
  barcodeError.value = ''
  showVariantModal.value = true
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

const performDelete = () => {
  if (!deleteTarget.value) return
  const toast = useToast()

  if (deleteTarget.value.type === 'single') {
    mockData.value = mockData.value.filter(m => m.id !== deleteTarget.value!.id)
  } else if (deleteTarget.value.type === 'bulk') {
    mockData.value = mockData.value.filter(m => !deleteTarget.value!.ids!.includes(m.id))
  }
  
  mockData.value.forEach((item, index) => {
    item.rowNumber = index + 1
  })
  
  toast.success(t('common.delete', 'Silindi'))
  showDeleteConfirmModal.value = false
  deleteTarget.value = null
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

const saveForm = () => {
  const toast = useToast()
  barcodeError.value = ''
  
  const d = new Date()
  const formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth()+1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

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
    if (!parentProduct) {
      toast.error(t('common.fieldRequired', 'Məhsulu seçin'))
      return
    }

    mockData.value.push({
      id: Date.now(),
      rowNumber: mockData.value.length + 1,
      parentProductId: parentProduct.id,
      parentProductName: parentProduct.productName,
      brandName: parentProduct.brandName,
      productName: parentProduct.productName,
      category: parentProduct.category,
      ...variantFormData.value,
      images: [...variantImages.value],
      createdAt: formattedDate,
      createdBy: 'Admin'
    })
    toast.success(t('toast.customerAdded', 'Variant əlavə edildi'))
    showVariantModal.value = false
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
        <span class="font-semibold text-[var(--text-primary)]">
          {{ brandLabels[value] || value }}
        </span>
      </template>

      <!-- Category Custom Format -->
      <template #cell-category="{ value }">
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="(cat, idx) in (Array.isArray(value) ? value : [value])" 
            :key="idx" 
            class="px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase bg-[var(--text-primary)]/10 text-[var(--text-primary)] shrink-0"
          >
            {{ cat }}
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
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] uppercase opacity-40">
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
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] uppercase opacity-40">
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
          <div class="text-[10px] font-bold text-[var(--text-app)] tracking-[0.2em] uppercase opacity-40">
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
        <div class="flex-1 w-full lg:border-l lg:border-[var(--border-app)] lg:pl-8">
          <DynamicForm 
            :fields="variantSchema"
            v-model="variantFormData"
            :gridCols="1" 
          />
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showVariantModal = false">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm">{{ t('products.saveVariant', 'Variantı Yadda Saxla') }}</UiButton>
      </template>
    </Modal>

    <!-- Silmə Təsdiq Modalı -->
    <Modal v-model="showDeleteConfirmModal" :title="t('common.confirmDelete', 'Silmək istədiyinizə əminsiniz?')" max-width="sm">
      <div class="py-2">
        <p class="text-[var(--text-app)] opacity-80 text-[15px] leading-relaxed">
          {{ t('common.cannotBeUndone', 'Bu əməliyyat geri qaytarıla bilməz.') }}
          <span v-if="deleteTarget?.type === 'bulk'" class="font-bold text-[var(--color-brand-danger)] block mt-2">
             {{ t('employees.bulkDeleteCount', { count: deleteTarget.ids?.length, default: `${deleteTarget.ids?.length} maddə silinəcək.` }) }}
          </span>
        </p>
      </div>
      
      <template #footer>
        <UiButton variant="ghost" @click="showDeleteConfirmModal = false">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="danger" icon="lucide:trash-2" @click="performDelete">
          {{ t('common.yesDelete', 'Bəli, Sil') }}
        </UiButton>
      </template>
    </Modal>
  </div>
</template>
