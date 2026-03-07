<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import { useHead } from '#imports'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()

useHead({
  title: t('menu.suppliers') || 'Tədarükçülər'
})

// --- Centralized Schema ---
const supplierSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { key: 'rowNumber', label: 'Sıra sayı', type: 'text', inTable: true, sortable: false },
  { key: 'brandName', label: 'Brendin adı', icon: 'lucide:tag', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'companyName', label: 'Şirkətin adı', icon: 'lucide:building-2', type: 'tags', inTable: true, sortable: true, required: true, historyKey: 'company_names' },
  { key: 'firstName', label: 'Ad', type: 'text', inTable: true, sortable: true },
  { key: 'lastName', label: 'Soyad', type: 'text', inTable: true, sortable: true },
  { key: 'email', label: 'E-poçt', icon: 'lucide:mail', type: 'email', inTable: true, sortable: true },
  { key: 'phone', label: 'Telefon', icon: 'lucide:phone', type: 'tel', inTable: true, sortable: true },
  { key: 'voen', label: 'VÖEN', icon: 'lucide:file-text', type: 'tags', inTable: true, sortable: true, historyKey: 'voen_numbers' },
  { key: 'address', label: 'Ünvan', icon: 'lucide:map-pin', type: 'text', colSpan: 2, inTable: false },
  { key: 'city', label: 'Şəhər/rayon', type: 'tags', inTable: false, sortable: true, historyKey: 'cities' },
  { key: 'country', label: 'Ölkə', icon: 'lucide:globe', type: 'select', inTable: false, isCountry: true },
  { key: 'notes', label: 'Xüsusi qeyd', type: 'textarea', colSpan: 2, inTable: false },
  { key: 'createdAt', label: 'Tarix', type: 'text', inTable: false, sortable: true },
  { key: 'createdBy', label: 'Əməkdaş', type: 'text', inTable: false, sortable: true },
]

// Modal'da gösterilecek form alanları (Tarix, Əməkdaş və Sıra sayı Hariç)
const formFields = computed(() => {
  return supplierSchema.filter(f => !['createdAt', 'createdBy', 'rowNumber'].includes(f.key))
})

// Extract table columns dynamically
const columns = computed(() => 
  supplierSchema
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// --- Data ---
const mockData = ref<any[]>([
  { 
    id: 1, 
    rowNumber: 1,
    brandName: 'Nike', 
    companyName: ['Nike Azerbaijan LLC'], 
    firstName: 'Rəşad', 
    lastName: 'Məmmədov', 
    email: 'rashad@nike.az', 
    phone: '+994 50 123 45 67', 
    voen: ['1234567890'],
    address: '28 May küçəsi 12', 
    city: ['Bakı'], 
    country: 'AZ', 
    notes: 'Premium tədarükçü',
    createdAt: '2026-03-03 10:15', 
    createdBy: 'Admin'
  },
  { 
    id: 2, 
    rowNumber: 2,
    brandName: 'Adidas', 
    companyName: ['Adidas Sport MMC'], 
    firstName: 'Leyla', 
    lastName: 'Əliyeva', 
    email: 'leyla@adidas.az', 
    phone: '+994 55 987 65 43', 
    voen: ['0987654321'],
    address: 'Neftçilər prospekti 25', 
    city: ['Bakı'], 
    country: 'AZ', 
    notes: '',
    createdAt: '2026-03-02 14:30', 
    createdBy: 'Admin'
  },
  { 
    id: 3, 
    rowNumber: 3,
    brandName: 'Zara', 
    companyName: ['Inditex Azerbaijan'], 
    firstName: 'Elvin', 
    lastName: 'Quliyev', 
    email: 'elvin@zara.az', 
    phone: '+994 51 234 56 78', 
    voen: ['5678901234'],
    address: 'Nizami küçəsi 45', 
    city: ['Bakı'], 
    country: 'AZ', 
    notes: 'Fast fashion',
    createdAt: '2026-03-01 09:20', 
    createdBy: 'Admin'
  },
])

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const formData = ref<Record<string, any>>({})
const bulkSelectedIds = ref<any[]>([])
const voenError = ref('')

// --- Handlers ---
const handleAdd = () => {
  formData.value = {
    companyName: [],
    voen: [],
    city: [],
    country: 'AZ'
  }
  voenError.value = ''
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row }
  voenError.value = ''
  showEditModal.value = true
}

const handleDelete = (row: any) => {
  if (confirm(`${row.companyName} tədarükçüsünü silmək istəyirsiniz?`)) {
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
  const newRowNumber = mockData.value.length + 1
  
  // Find the highest number for this brand name
  const baseBrandName = row.brandName.replace(/\s*\(\d+\)$/, '') // Remove existing (number) if any
  const existingNumbers = mockData.value
    .filter(item => item.brandName.startsWith(baseBrandName))
    .map(item => {
      const match = item.brandName.match(/\((\d+)\)$/)
      return match ? parseInt(match[1]) : 0
    })
  
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 2
  
  // Copy all data except id, rowNumber, voen (must be unique)
  const duplicatedData = {
    ...row,
    id: newId,
    rowNumber: newRowNumber,
    brandName: `${baseBrandName} (${nextNumber})`,
    voen: '', // VÖEN must be unique, so leave empty
    createdAt: formattedDate,
    createdBy: 'Sistem İdarəçisi'
  }
  
  mockData.value.push(duplicatedData)
}

const handleBulkDelete = (ids: any[]) => {
  if (confirm(`${ids.length} tədarükçünü silmək istəyirsiniz?`)) {
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
  voenError.value = ''
  showEditModal.value = true
}

// VÖEN kontrolü
const checkVoenUnique = (voen: string[], currentId?: any) => {
  if (!voen || voen.length === 0) return true
  const voenStr = voen[0]
  return !mockData.value.some(m => {
    const mVoen = Array.isArray(m.voen) ? m.voen[0] : m.voen
    return mVoen === voenStr && m.id !== currentId
  })
}

const saveForm = () => {
  voenError.value = ''
  
  // VÖEN özel validasyonu
  if (formData.value.voen && !checkVoenUnique(formData.value.voen, formData.value.id)) {
    voenError.value = 'Bu VÖEN artıq mövcuddur! Fərqli VÖEN daxil edin.'
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
      if (index !== -1) mockData.value[index] = { ...mockData.value[index], ...formData.value }
    }
    showEditModal.value = false
  }
}
</script>

<template>
  <div class="space-y-6 font-sans">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        Tədarükçülər
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      title="Tedarukcu_Listesi"
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

      <!-- Company Name Custom Format -->
      <template #cell-companyName="{ value }">
        <span class="font-medium text-[var(--text-app)]">
          {{ Array.isArray(value) ? value[0] : value }}
        </span>
      </template>

      <!-- Brand Name Custom Format -->
      <template #cell-brandName="{ value }">
        <span class="font-semibold text-[var(--text-primary)]">
          {{ value }}
        </span>
      </template>

      <!-- VÖEN Custom Format -->
      <template #cell-voen="{ value }">
        <span class="font-mono text-sm text-[var(--text-app)]">
          {{ Array.isArray(value) ? value[0] : value }}
        </span>
      </template>
    </DataTable>

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" title="Yeni Tədarükçü Əlavə Et" max-width="3xl">
      <div v-if="voenError" class="mb-4 p-3 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-lg text-sm font-medium flex items-center gap-2">
        <UiIcon name="lucide:alert-triangle" class="w-5 h-5"/>
        {{ voenError }}
      </div>
      
      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Yadda saxla</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal v-model="showEditModal" :title="bulkSelectedIds.length > 0 ? 'Toplu Redaktə' : 'Tədarükçünü Redaktə Et'" max-width="3xl">
      <div v-if="voenError" class="mb-4 p-3 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-lg text-sm font-medium flex items-center gap-2">
        <UiIcon name="lucide:alert-triangle" class="w-5 h-5"/>
        {{ voenError }}
      </div>

      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        Xəbərdarlıq: Toplu redaktə rejimindəsiniz. Burada doldurduğunuz sahələr, seçdiyiniz <span class="font-bold">{{ bulkSelectedIds.length }}</span> qeydin məlumatının üzərinə yazılacaq.
      </div>

      <!-- We omit voen in bulk edit to avoid conflicts (they should be unique) -->
      <DynamicForm 
        :fields="showEditModal && bulkSelectedIds.length > 0 ? formFields.filter(f => f.key !== 'voen') : formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Yenilə</UiButton>
      </template>
    </Modal>

  </div>
</template>
