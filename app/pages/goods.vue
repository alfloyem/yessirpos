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
  { key: 'brandName', label: 'Brendin adı', icon: 'lucide:award', type: 'select', inTable: true, sortable: true, required: true, options: brands },
  { key: 'productName', label: 'Məhsulun adı', icon: 'lucide:package', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'category', label: 'Kateqoriyası', icon: 'lucide:folder', type: 'tags', inTable: true, sortable: true, required: true, historyKey: 'goods_category' },
  { key: 'barcode', label: 'Barkod', icon: 'lucide:qr-code', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'description', label: 'Açıqlama', icon: 'lucide:file-text', type: 'textarea', colSpan: 2, inTable: false },
  { key: 'createdAt', label: 'Yaradılma tarixi', type: 'text', inTable: false, sortable: true },
  { key: 'createdBy', label: 'Yaradan', type: 'text', inTable: false, sortable: true },
]

// Modal'da gösterilecek form alanları (createdAt, createdBy və rowNumber Hariç)
const formFields = computed(() => {
  return goodsSchema.filter(f => !['createdAt', 'createdBy', 'rowNumber'].includes(f.key))
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
    id: 2, 
    rowNumber: 2,
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

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const formData = ref<Record<string, any>>({})
const bulkSelectedIds = ref<any[]>([])
const barcodeError = ref('')
const productImages = ref<string[]>([])

// --- Handlers ---
const handleAdd = () => {
  formData.value = {
    barcode: generateBarcode(),
    brandName: 'nike',
    category: [],
    images: []
  }
  productImages.value = []
  barcodeError.value = ''
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row }
  productImages.value = [...(row.images || [])]
  barcodeError.value = ''
  showEditModal.value = true
}

const handleDelete = (row: any) => {
  if (confirm(`"${row.productName}" məhsulunu silmək istəyirsiniz?`)) {
    mockData.value = mockData.value.filter(m => m.id !== row.id)
    // Recalculate row numbers
    mockData.value.forEach((item, index) => {
      item.rowNumber = index + 1
    })
  }
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
  if (confirm(`${ids.length} məhsulu silmək istəyirsiniz?`)) {
    mockData.value = mockData.value.filter(m => !ids.includes(m.id))
    // Recalculate row numbers
    mockData.value.forEach((item, index) => {
      item.rowNumber = index + 1
    })
  }
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

  if (showAddModal.value) {
    const d = new Date()
    const formattedDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    
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
      <!-- Row Number Custom Format -->
      <template #cell-rowNumber="{ value }">
        <span class="font-medium text-[var(--text-app)] opacity-60">
          {{ value }}
        </span>
      </template>

      <!-- Image Custom Format -->
      <template #cell-image="{ value }">
        <div class="flex items-center justify-center w-12 h-12 bg-[var(--input-bg)] rounded-lg overflow-hidden border border-[var(--border-app)]">
          <img v-if="value && value.startsWith('data:')" :src="value" alt="Product" class="w-full h-full object-cover" />
          <span v-else class="text-2xl">{{ value || '📦' }}</span>
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

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Left: Image Carousel -->
        <div>
          <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider mb-3">
            Məhsulun şəkilləri
          </label>
          <ImageCarousel 
            :images="productImages"
            @update:images="val => productImages = val"
          />
        </div>

        <!-- Right: Form Fields -->
        <div>
          <DynamicForm 
            :fields="formFields"
            v-model="formData" 
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

      <div v-if="bulkSelectedIds.length === 0" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Left: Image Carousel -->
        <div>
          <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider mb-3">
            Məhsulun şəkilləri
          </label>
          <ImageCarousel 
            :images="productImages"
            @update:images="val => productImages = val"
          />
        </div>

        <!-- Right: Form Fields -->
        <div>
          <DynamicForm 
            :fields="formFields"
            v-model="formData" 
          />
        </div>
      </div>

      <div v-else>
        <DynamicForm 
          :fields="formFields"
          v-model="formData" 
        />
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Yenilə</UiButton>
      </template>
    </Modal>

  </div>
</template>
