<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'
import ImageCarousel from '~/components/ui/ImageCarousel.vue'

const { t } = useI18n()

useHead({
  title: 'Mallar'
})

// --- Helper for Barcode Generation ---
const generateBarcode = () => {
  let barcode = ''
  for (let i = 0; i < 12; i++) {
    barcode += Math.floor(Math.random() * 10).toString()
  }
  return barcode
}

// Mock brands
const brands = [
  { label: 'Nike', value: 'nike' },
  { label: 'Adidas', value: 'adidas' },
  { label: 'Zara', value: 'zara' },
  { label: 'H&M', value: 'hm' },
  { label: 'Mango', value: 'mango' }
]

// --- Centralized Schema ---
const goodsSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { key: 'rowNumber', label: 'Sıra sayı', type: 'text', inTable: true, sortable: false },
  { key: 'image', label: 'Məhsulun şəkli', type: 'text', inTable: true, sortable: false },
  { key: 'parentProductName', label: 'Bağlı olduğu məhsul', type: 'text', inTable: true, sortable: true },
  { key: 'productName', label: 'Məhsulun adı', icon: 'lucide:package', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'brandName', label: 'Brendin adı', icon: 'lucide:award', type: 'select', inTable: true, sortable: true, required: true, options: brands },
  { key: 'category', label: 'Kateqoriyası', icon: 'lucide:folder', type: 'tags', inTable: true, sortable: true, required: true, historyKey: 'goods_category' },
  { key: 'attribute', label: 'Atributlar', icon: 'lucide:tag', type: 'tags', inTable: true, sortable: true },
  { key: 'barcode', label: 'Barkod', icon: 'lucide:qr-code', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'wholesalePrice', label: 'Top. qiymət (₼)', type: 'number', inTable: true, sortable: true },
  { key: 'retailPrice', label: 'Pər. qiymət (₼)', type: 'number', inTable: true, sortable: true },
  { key: 'stock', label: 'Stok', type: 'number', inTable: true, sortable: true },
  { key: 'description', label: 'Açıqlama', icon: 'lucide:file-text', type: 'textarea', colSpan: 2, inTable: false },
  { key: 'createdAt', label: 'Yaradılma tarixi', type: 'text', inTable: false, sortable: true },
  { key: 'createdBy', label: 'Yaradan', type: 'text', inTable: false, sortable: true },
]

// Modal'da gösterilecek form alanları (Base Product)
const formFields = computed(() => {
  return goodsSchema.filter(f => ['productName', 'brandName', 'category', 'description'].includes(f.key))
})

// --- Variant Schema ---
const variantSchema = computed<FormField[]>(() => {
  // Seçilə biləcək Base Productlar
  const productOptions = mockData.value
    .filter(m => !m.parentProductId) // Yalnız əsas məhsullar
    .map(p => ({ label: p.productName, value: p.id }))

  return [
    { key: 'parentProductId', label: 'Asılı olduğu məhsul', icon: 'lucide:box', type: 'select', required: true, options: productOptions },
    { key: 'barcode', label: 'Barkod', icon: 'lucide:qr-code', type: 'text', required: true },
    { key: 'attribute', label: 'Atribut (Məs: Ölçü: M, Rəng: Qırmızı)', icon: 'lucide:tag', type: 'tags', required: true, historyKey: 'variant_attr' },
    { key: 'wholesalePrice', label: 'Topdansatış qiyməti (₼)', icon: 'lucide:coins', type: 'number', required: true },
    { key: 'retailPrice', label: 'Pərakəndə qiyməti (₼)', icon: 'lucide:banknote', type: 'number', required: true },
    { key: 'stock', label: 'Stok (Say)', icon: 'lucide:package-check', type: 'number', required: true },
    { key: 'reorderLevel', label: 'Yenidən sifariş limiti', icon: 'lucide:alert-circle', type: 'number', required: true },
  ]
})

// Extract table columns dynamically
const columns = computed(() => 
  goodsSchema
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
const mockData = ref<any[]>([
  { 
    id: 1, 
    rowNumber: 1,
    brandName: 'nike',
    productName: 'Nike Air Max T-Shirt',
    category: ['Geyim', 'İdman'],
    barcode: '123456789012',
    description: 'Rahat və keyfiyyətli idman köynəyi',
    createdAt: '2026-03-03 10:15', 
    createdBy: 'Admin'
  },
  { 
    id: 101, // Bu bir variantdır (id: 1-ə bağlıdır)
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
    createdAt: '2026-03-03 10:20', 
    createdBy: 'Admin'
  },
  { 
    id: 2, 
    rowNumber: 3,
    brandName: 'adidas',
    productName: 'Adidas Ultraboost',
    category: ['Ayaqqabı', 'İdman'],
    barcode: '987654321098',
    description: 'Yüksək performanslı qaçış ayaqqabısı',
    createdAt: '2026-03-02 14:30', 
    createdBy: 'Admin'
  },
  { 
    id: 3, 
    rowNumber: 3,
    brandName: 'zara',
    productName: 'Zara Yay Paltarı',
    category: ['Geyim', 'Gündəlik'],
    barcode: '456789123456',
    description: 'Yüngül və rahat yay paltarı',
    createdAt: '2026-03-01 09:20', 
    createdBy: 'Admin'
  },
])

// Pagination & Selection
const selectedIds = ref([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const showVariantModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteTarget = ref<{ type: 'single' | 'bulk', id?: any, ids?: any[] } | null>(null)
const formData = ref<any>({})
const variantFormData = ref<any>({})
const bulkSelectedIds = ref<any[]>([])
const selectedVariantProductId = ref<any>(null)
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

const handleVariantAdd = (selectedIds: any[]) => {
  if (selectedIds.length !== 1) {
    alert('Bunu cədvəldən əlavə etmək üçün yalnız 1 məhsul seçilməlidir!')
    return
  }
  const parentProduct = mockData.value.find(m => m.id === selectedIds[0])
  variantFormData.value = {
    parentProductId: parentProduct?.parentProductId || parentProduct?.id, // Əgər variant seçilibsə onun valideyninə bağla
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

  if (deleteTarget.value.type === 'single') {
    mockData.value = mockData.value.filter(m => m.id !== deleteTarget.value!.id)
  } else if (deleteTarget.value.type === 'bulk') {
    mockData.value = mockData.value.filter(m => !deleteTarget.value!.ids!.includes(m.id))
  }
  
  // Recalculate row numbers
  mockData.value.forEach((item, index) => {
    item.rowNumber = index + 1
  })
  
  showDeleteConfirmModal.value = false
  deleteTarget.value = null
}

const handleDuplicate = (row: any) => {
  const d = new Date()
  const formattedDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  
  const newId = Date.now()
  
  // Find next number for name
  const baseProductName = row.productName.replace(/\s*\(\d+\)$/, '')
  const existingNumbers = mockData.value
    .filter(item => item.productName.startsWith(baseProductName))
    .map(item => {
      const match = item.productName.match(/\((\d+)\)$/)
      return match ? parseInt(match[1]) : 0
    })
  
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  const newProductName = `${baseProductName} (${nextNumber})`
  
  const duplicatedData = {
    ...row,
    id: newId,
    barcode: generateBarcode(), // Yeni məhsul üçün fərqli barkod yaradaq
    productName: newProductName,
    images: [...(row.images || [])],
    image: row.image,
    createdAt: formattedDate,
    createdBy: 'Sistem İdarəçisi'
  }
  
  const index = mockData.value.findIndex(m => m.id === row.id)
  if (index !== -1) {
    mockData.value.splice(index + 1, 0, duplicatedData)
  } else {
    mockData.value.push(duplicatedData)
  }
  
  // Recalculate row numbers
  mockData.value.forEach((item, idx) => {
    item.rowNumber = idx + 1
  })
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

// Barkod kontrolü
const checkBarcodeUnique = (barcode: string, currentId?: any) => {
  return !mockData.value.some(m => m.barcode === barcode && m.id !== currentId)
}

const saveForm = () => {
  barcodeError.value = ''
  
  // Barkod validasyonu
  if (formData.value.barcode && !checkBarcodeUnique(formData.value.barcode, formData.value.id)) {
    barcodeError.value = 'Bu barkod artıq mövcuddur! Fərqli barkod daxil edin.'
    return 
  }

  const d = new Date()
  const formattedDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  if (showAddModal.value) {
    
    const newId = Date.now()
    const newRowNumber = mockData.value.length + 1
    
    mockData.value.push({ 
      id: newId,
      rowNumber: newRowNumber,
      images: [...productImages.value],
      image: productImages.value[0] || '📦',
      ...formData.value,
      createdAt: formattedDate,
      createdBy: 'Sistem İdarəçisi'
    })
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
          images: [...productImages.value],
          image: productImages.value[0] || mockData.value[index].image || '📦'
        }
      }
    }
    showEditModal.value = false
  } else if (showVariantModal.value) {
    const parentProduct = mockData.value.find(m => m.id === variantFormData.value.parentProductId)
    
    if (!parentProduct) {
      alert("Asılı olduğu məhsulu seçmək məcburidir!")
      return
    }

    const newId = Date.now()
    const newRowNumber = mockData.value.length + 1
    
    mockData.value.push({
      id: newId,
      rowNumber: newRowNumber,
      parentProductId: parentProduct.id,
      parentProductName: parentProduct.productName,
      brandName: parentProduct.brandName,
      productName: parentProduct.productName,
      category: parentProduct.category,
      ...variantFormData.value,
      images: [...variantImages.value],
      image: variantImages.value[0] || '📦',
      createdAt: formattedDate,
      createdBy: 'Sistem İdarəçisi'
    })
    
    showVariantModal.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        Mallar
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      title="Mal_Listesi"
      :data="mockData" 
      :columns="columns"
      :selectable="true"
      :actions="true"
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
          Variant Əlavə Et
        </UiButton>
      </template>

      <!-- Row Number Custom Format -->
      <template #cell-rowNumber="{ value }">
        <span class="font-medium text-[var(--text-app)] opacity-60">
          {{ value }}
        </span>
      </template>

      <!-- Image Custom Format -->
      <template #cell-image="{ row }">
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

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" title="Yeni Mal Əlavə Et" max-width="4xl" min-height="700px">
      <div v-if="barcodeError" class="mb-4 p-3 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-lg text-sm font-medium flex items-center gap-2">
        <UiIcon name="lucide:alert-triangle" class="w-3.5 h-3.5"/>
        {{ barcodeError }}
      </div>

      <div class="flex flex-col lg:flex-row gap-8 items-start relative">
        <div class="w-full lg:w-[45%] lg:sticky lg:top-0 lg:left-0 z-10 pb-2 bg-[var(--bg-app)]">
          <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider mb-3">
            Məhsulun şəkilləri
          </label>
          <ImageCarousel 
            :images="productImages"
            @update:images="val => productImages = val"
          />
        </div>

        <!-- Right: Form Fields -->
        <div class="w-full lg:w-[55%]">
          <DynamicForm 
            :fields="formFields"
            v-model="formData" 
            :gridCols="1"
          />
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Yadda saxla</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal v-model="showEditModal" :title="bulkSelectedIds.length > 0 ? 'Toplu Redaktə' : 'Malı Redaktə Et'" max-width="4xl" min-height="700px">
      <div v-if="barcodeError" class="mb-4 p-3 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-lg text-sm font-medium flex items-center gap-2">
        <UiIcon name="lucide:alert-triangle" class="w-3.5 h-3.5"/>
        {{ barcodeError }}
      </div>

      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        Xəbərdarlıq: Toplu redaktə rejimindəsiniz. Burada doldurduğunuz sahələr, seçdiyiniz <span class="font-bold">{{ bulkSelectedIds.length }}</span> qeydin məlumatının üzərinə yazılacaq.
      </div>

      <div v-if="bulkSelectedIds.length === 0" class="flex flex-col lg:flex-row gap-8 items-start relative">
        <!-- Left: Image Carousel (Sticky) -->
        <div class="w-full lg:w-[45%] lg:sticky lg:top-0 lg:left-0 z-10 pb-2 bg-[var(--bg-app)]">
          <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider mb-3">
            Məhsulun şəkilləri
          </label>
          <ImageCarousel 
            :images="productImages"
            @update:images="val => productImages = val"
          />
        </div>

        <!-- Right: Form Fields -->
        <div class="w-full lg:w-[55%]">
          <DynamicForm 
            :fields="formFields"
            v-model="formData"
            :gridCols="1" 
          />
        </div>
      </div>

      <div v-else>
        <DynamicForm 
          :fields="formFields"
          v-model="formData" 
          :gridCols="1"
        />
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Yenilə</UiButton>
      </template>
    </Modal>

    <!-- Variant Əlavə Et / Modal -->
    <Modal v-model="showVariantModal" title="Variant Əlavə Et" max-width="4xl" min-height="700px">
      <div v-if="barcodeError" class="mb-4 p-3 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-lg text-sm font-medium flex items-center gap-2">
        <UiIcon name="lucide:alert-triangle" class="w-3.5 h-3.5"/>
        {{ barcodeError }}
      </div>

      <div class="flex flex-col lg:flex-row gap-8 items-start relative max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
        <!-- Left: Image Carousel (Sticky) -->
        <div class="w-full lg:w-[45%] lg:sticky lg:top-0 lg:left-0 z-10 bg-[var(--bg-app)] pb-2">
          <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider mb-3">
            Variant Şəkilləri
          </label>
          <ImageCarousel 
            :images="variantImages"
            @update:images="val => variantImages = val"
          />
        </div>

        <!-- Right: Form Fields -->
        <div class="w-full lg:w-[55%]">
          <DynamicForm 
            :fields="variantSchema"
            v-model="variantFormData"
            :gridCols="1" 
          />
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showVariantModal = false">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Variantı Yadda Saxla</UiButton>
      </template>
    </Modal>

    <!-- Silmə Təsdiq Modalı -->
    <Modal v-model="showDeleteConfirmModal" title="Diggət!" max-width="sm">
      <div class="flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div class="w-16 h-16 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-full flex items-center justify-center mb-2">
          <UiIcon name="lucide:alert-triangle" class="w-8 h-8" />
        </div>
        <h3 class="text-xl font-bold text-[var(--text-primary)]">Silmək istədiyinizə əminsiniz?</h3>
        <p class="text-[var(--text-app)] opacity-70 text-[15px]">
          Bu əməliyyat geri qaytarıla bilməz. 
          <span v-if="deleteTarget?.type === 'bulk'" class="font-bold text-[var(--text-primary)] block mt-2">
            Seçilmiş {{ deleteTarget.ids?.length }} maddə silinəcək.
          </span>
        </p>
      </div>
      
      <template #footer>
        <UiButton variant="ghost" @click="showDeleteConfirmModal = false" class="!px-6">Ləğv et</UiButton>
        <UiButton variant="danger" icon="lucide:trash-2" @click="performDelete" class="!px-8 min-w-[120px]">
          Bəli, Sil
        </UiButton>
      </template>
    </Modal>
  </div>
</template>
