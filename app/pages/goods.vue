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

// Mock categories
const categories = [
  { label: 'Geyim', value: 'clothing' },
  { label: 'Ayaqqabı', value: 'shoes' },
  { label: 'Aksesuar', value: 'accessories' },
  { label: 'Çanta', value: 'bags' }
]

// Mock brands
const brands = [
  { label: 'Nike', value: 'nike' },
  { label: 'Adidas', value: 'adidas' },
  { label: 'Zara', value: 'zara' },
  { label: 'H&M', value: 'hm' },
  { label: 'Mango', value: 'mango' }
]

// Mock attributes (from /attributes page)
const availableAttributes = ref([
  { id: 1, name: 'Rəng', values: ['Qırmızı', 'Mavi', 'Yaşıl', 'Qara', 'Ağ'] },
  { id: 2, name: 'Ölçü', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { id: 3, name: 'Material', values: ['Pambıq', 'Polyester', 'Yun', 'İpək'] }
])

// --- Centralized Schema ---
const goodsSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { key: 'rowNumber', label: 'Sıra sayı', type: 'text', inTable: true, sortable: false },
  { key: 'image', label: 'Məhsulun şəkli', type: 'text', inTable: true, sortable: false },
  { key: 'brandName', label: 'Brendin adı', icon: 'lucide:award', type: 'select', inTable: true, sortable: true, required: true, options: brands },
  { key: 'productName', label: 'Məhsulun adı', icon: 'lucide:package', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'category', label: 'Kateqoriyası', icon: 'lucide:folder', type: 'select', inTable: true, sortable: true, required: true, options: categories },
  { key: 'barcode', label: 'Barkod', icon: 'lucide:qr-code', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'price', label: 'Qiymət (₼)', icon: 'lucide:wallet', type: 'number', inTable: false, sortable: true },
  { key: 'stock', label: 'Stok', icon: 'lucide:package-check', type: 'number', inTable: false, sortable: true },
  { key: 'description', label: 'Açıqlama', icon: 'lucide:file-text', type: 'textarea', colSpan: 2, inTable: false },
  { key: 'createdAt', label: 'Yaradılma tarixi', type: 'text', inTable: false, sortable: true },
  { key: 'createdBy', label: 'Yaradan', type: 'text', inTable: false, sortable: true },
]

// Modal'da gösterilecek form alanları (createdAt, createdBy, rowNumber və image Hariç)
const formFields = computed(() => {
  return goodsSchema.filter(f => !['createdAt', 'createdBy', 'rowNumber', 'image'].includes(f.key))
})

// Extract table columns dynamically
const columns = computed(() => 
  goodsSchema
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// Category labels for display
const categoryLabels: Record<string, string> = {
  clothing: 'Geyim',
  shoes: 'Ayaqqabı',
  accessories: 'Aksesuar',
  bags: 'Çanta'
}

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
    image: '👕',
    brandName: 'nike',
    productName: 'Nike Air Max T-Shirt',
    category: 'clothing',
    barcode: '123456789012',
    price: 89.99,
    stock: 45,
    attributes: [
      { attributeId: 1, attributeName: 'Rəng', value: 'Qara' },
      { attributeId: 2, attributeName: 'Ölçü', value: 'L' }
    ],
    description: 'Rahat və keyfiyyətli idman köynəyi',
    createdAt: '2026-03-03 10:15', 
    createdBy: 'Admin'
  },
  { 
    id: 2, 
    rowNumber: 2,
    image: '👟',
    brandName: 'adidas',
    productName: 'Adidas Ultraboost',
    category: 'shoes',
    barcode: '987654321098',
    price: 299.99,
    stock: 20,
    attributes: [
      { attributeId: 1, attributeName: 'Rəng', value: 'Ağ' },
      { attributeId: 2, attributeName: 'Ölçü', value: '42' }
    ],
    description: 'Yüksək performanslı qaçış ayaqqabısı',
    createdAt: '2026-03-02 14:30', 
    createdBy: 'Admin'
  },
  { 
    id: 3, 
    rowNumber: 3,
    image: '👗',
    brandName: 'zara',
    productName: 'Zara Yay Paltarı',
    category: 'clothing',
    barcode: '456789123456',
    price: 129.99,
    stock: 15,
    attributes: [
      { attributeId: 1, attributeName: 'Rəng', value: 'Mavi' },
      { attributeId: 2, attributeName: 'Ölçü', value: 'M' }
    ],
    description: 'Yüngül və rahat yay paltarı',
    createdAt: '2026-03-01 09:20', 
    createdBy: 'Admin'
  },
])

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showAttributesModal = ref(false)
const formData = ref<Record<string, any>>({})
const bulkSelectedIds = ref<any[]>([])
const barcodeError = ref('')

// Images management
const productImages = ref<string[]>([])

// Attributes management
const selectedAttributes = ref<any[]>([])

// --- Handlers ---
const handleAdd = () => {
  formData.value = {
    barcode: generateBarcode(),
    brandName: 'nike',
    category: 'clothing',
    price: 0,
    stock: 0,
    images: []
  }
  selectedAttributes.value = []
  productImages.value = []
  barcodeError.value = ''
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row }
  selectedAttributes.value = [...(row.attributes || [])]
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

const handleManageAttributes = (row: any) => {
  formData.value = { ...row }
  selectedAttributes.value = [...(row.attributes || [])]
  showAttributesModal.value = true
}

const addAttribute = () => {
  selectedAttributes.value.push({
    attributeId: null,
    attributeName: '',
    value: ''
  })
}

const removeAttribute = (index: number) => {
  selectedAttributes.value.splice(index, 1)
}

const updateAttributeName = (index: number, attrId: number) => {
  const attr = availableAttributes.value.find(a => a.id === attrId)
  if (attr) {
    selectedAttributes.value[index].attributeId = attr.id
    selectedAttributes.value[index].attributeName = attr.name
    selectedAttributes.value[index].value = ''
  }
}

const saveAttributes = () => {
  const index = mockData.value.findIndex(m => m.id === formData.value.id)
  if (index !== -1) {
    mockData.value[index].attributes = [...selectedAttributes.value]
  }
  showAttributesModal.value = false
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
      attributes: [...selectedAttributes.value],
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
          image: productImages.value[0] || mockData.value[index].image,
          attributes: [...selectedAttributes.value]
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
      <template #cell-brandName="{ value, row }">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-[var(--text-primary)]">
            {{ brandLabels[value] || value }}
          </span>
          <button
            @click="handleManageAttributes(row)"
            class="px-2 py-1 rounded-lg text-xs font-medium bg-[var(--color-brand-success)]/10 text-[var(--color-brand-success)] hover:bg-[var(--color-brand-success)]/20 transition-colors cursor-pointer"
          >
            Atributlar ({{ row.attributes?.length || 0 }})
          </button>
        </div>
      </template>

      <!-- Category Custom Format -->
      <template #cell-category="{ value }">
        <span class="px-2 py-1 rounded-lg text-xs font-medium bg-[var(--text-primary)]/10 text-[var(--text-primary)]">
          {{ categoryLabels[value] || value }}
        </span>
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

      <!-- Attributes Section -->
      <div class="mt-6 space-y-4 col-span-2">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider">
            Atributlar
          </label>
        </div>

        <div class="text-center py-8 text-[var(--text-app)] opacity-50 text-sm">
          Atributları redaktə etmək üçün məhsulu yadda saxlayın və sonra "Atributlar" düyməsinə klikləyin
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
          :fields="formFields.filter(f => f.key !== 'barcode')"
          v-model="formData" 
        />
      </div>

      <!-- Attributes Section (only for single edit) -->
      <div v-if="bulkSelectedIds.length === 0" class="mt-6 space-y-4">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider">
            Atributlar
          </label>
          <UiButton variant="primary" size="sm" @click="addAttribute">
            <UiIcon name="lucide:plus" class="w-4 h-4 mr-1" />
            Atribut əlavə et
          </UiButton>
        </div>

        <div class="space-y-3">
          <div 
            v-for="(attr, index) in selectedAttributes" 
            :key="index"
            class="flex gap-2 items-start p-3 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg"
          >
            <div class="flex-1 grid grid-cols-2 gap-2">
              <UiSelect
                :modelValue="attr.attributeId"
                @update:modelValue="val => updateAttributeName(index, val)"
                :options="availableAttributes.map(a => ({ label: a.name, value: a.id }))"
                placeholder="Atribut seçin"
              />
              <UiSelect
                v-if="attr.attributeId"
                :modelValue="attr.value"
                @update:modelValue="val => attr.value = val"
                :options="availableAttributes.find(a => a.id === attr.attributeId)?.values.map(v => ({ label: v, value: v })) || []"
                placeholder="Dəyər seçin"
              />
            </div>
            <button
              @click="removeAttribute(index)"
              class="text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/10 p-2 rounded transition-colors cursor-pointer"
            >
              <UiIcon name="lucide:trash-2" class="w-4 h-4" />
            </button>
          </div>
          <div v-if="selectedAttributes.length === 0" class="text-center py-6 text-[var(--text-app)] opacity-50 text-sm">
            Hələ atribut əlavə edilməyib
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Yenilə</UiButton>
      </template>
    </Modal>

    <!-- Modal: Manage Attributes -->
    <Modal v-model="showAttributesModal" title="Atributları İdarə Et" max-width="lg">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[var(--text-app)] mb-2">
            Məhsul: <span class="text-[var(--text-primary)]">{{ formData.productName }}</span>
          </label>
        </div>

        <div class="flex items-center justify-between">
          <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider">
            Atributlar
          </label>
          <UiButton variant="primary" size="sm" @click="addAttribute">
            <UiIcon name="lucide:plus" class="w-4 h-4 mr-1" />
            Atribut əlavə et
          </UiButton>
        </div>

        <div class="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          <div 
            v-for="(attr, index) in selectedAttributes" 
            :key="index"
            class="flex gap-2 items-start p-3 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg"
          >
            <div class="flex-1 grid grid-cols-2 gap-2">
              <UiSelect
                :modelValue="attr.attributeId"
                @update:modelValue="val => updateAttributeName(index, val)"
                :options="availableAttributes.map(a => ({ label: a.name, value: a.id }))"
                placeholder="Atribut seçin"
              />
              <UiSelect
                v-if="attr.attributeId"
                :modelValue="attr.value"
                @update:modelValue="val => attr.value = val"
                :options="availableAttributes.find(a => a.id === attr.attributeId)?.values.map(v => ({ label: v, value: v })) || []"
                placeholder="Dəyər seçin"
              />
            </div>
            <button
              @click="removeAttribute(index)"
              class="text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/10 p-2 rounded transition-colors cursor-pointer"
            >
              <UiIcon name="lucide:trash-2" class="w-4 h-4" />
            </button>
          </div>
          <div v-if="selectedAttributes.length === 0" class="text-center py-8 text-[var(--text-app)] opacity-50 text-sm">
            Hələ atribut əlavə edilməyib
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showAttributesModal = false">İmtina</UiButton>
        <UiButton variant="primary" @click="saveAttributes">Yadda saxla</UiButton>
      </template>
    </Modal>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--bg-app);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}
</style>
