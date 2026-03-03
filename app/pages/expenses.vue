<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()

useHead({
  title: t('menu.expenses') || 'Xərclər'
})

// Fetch employees for autocomplete
const employees = ref<string[]>([])
const fetchEmployees = async () => {
  // In real app, this would be an API call to /api/employees
  // For now, we'll use mock data
  employees.value = [
    'Rəşad Məmmədov',
    'Leyla Əliyeva',
    'Elvin Quliyev',
    'Nigar Həsənova',
    'Məhəmməd Şükürov',
    'Ayşə Kaya',
    'Sistem İdarəçisi'
  ]
}

onMounted(() => {
  fetchEmployees()
})

// --- Centralized Schema ---
const expenseSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { key: 'rowNumber', label: 'Sıra sayı', type: 'text', inTable: true, sortable: false },
  { key: 'date', label: 'Tarix', icon: 'lucide:calendar', type: 'date', inTable: true, sortable: true, required: true },
  { key: 'employee', label: 'Əməkdaş', icon: 'lucide:user', type: 'autocomplete', inTable: true, sortable: true, suggestions: employees },
  { key: 'amount', label: 'Xərc (₼)', icon: 'lucide:wallet', type: 'number', inTable: true, sortable: true, required: true },
  { key: 'category', label: 'Kateqoriya', icon: 'lucide:folder', type: 'select', inTable: true, sortable: true, required: true, options: [
    { label: 'Obyekt xərcləri', value: 'office' },
    { label: 'Maaş', value: 'salary' },
    { label: 'İcarə', value: 'rent' },
    { label: 'Kommunal xidmətlər', value: 'utilities' },
    { label: 'Nəqliyyat', value: 'transport' },
    { label: 'Marketinq', value: 'marketing' },
    { label: 'Yemək', value: 'food' },
    { label: 'Yeni', value: 'new' }
  ]},
  { key: 'paymentMethod', label: 'Ödəniş üsulu', icon: 'lucide:credit-card', type: 'select', inTable: false, sortable: true, options: [
    { label: 'Nağd', value: 'cash' },
    { label: 'Bank kartı', value: 'card' },
    { label: 'Bank köçürməsi', value: 'transfer' }
  ]},
  { key: 'description', label: 'Açıqlama', icon: 'lucide:file-text', type: 'textarea', colSpan: 2, inTable: false },
  { key: 'notes', label: 'Qeydlər', type: 'textarea', colSpan: 2, inTable: false },
  { key: 'createdAt', label: 'Yaradılma tarixi', type: 'text', inTable: false, sortable: true },
  { key: 'createdBy', label: 'Yaradan', type: 'text', inTable: false, sortable: true },
]

// Modal'da gösterilecek form alanları (createdAt, createdBy və rowNumber Hariç)
const formFields = computed(() => {
  return expenseSchema.filter(f => !['createdAt', 'createdBy', 'rowNumber'].includes(f.key))
})

// Extract table columns dynamically
const columns = computed(() => 
  expenseSchema
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// Category labels for display
const categoryLabels: Record<string, string> = {
  office: 'Obyekt xərcləri',
  salary: 'Maaş',
  rent: 'İcarə',
  utilities: 'Kommunal xidmətlər',
  transport: 'Nəqliyyat',
  marketing: 'Marketinq',
  food: 'Yemək',
  new: 'Yeni'
}

// --- Data ---
const mockData = ref<any[]>([
  { 
    id: 1, 
    rowNumber: 1,
    date: '2026-03-03',
    employee: 'Rəşad Məmmədov',
    amount: 500,
    category: 'office',
    paymentMethod: 'cash',
    description: 'Ofis ləvazimatları alışı',
    notes: '',
    createdAt: '2026-03-03 10:15', 
    createdBy: 'Admin'
  },
  { 
    id: 2, 
    rowNumber: 2,
    date: '2026-03-02',
    employee: 'Leyla Əliyeva',
    amount: 3500,
    category: 'salary',
    paymentMethod: 'transfer',
    description: 'Mart ayı maaş ödənişi',
    notes: 'Tam ödənilib',
    createdAt: '2026-03-02 14:30', 
    createdBy: 'Admin'
  },
  { 
    id: 3, 
    rowNumber: 3,
    date: '2026-03-01',
    employee: 'Elvin Quliyev',
    amount: 1200,
    category: 'rent',
    paymentMethod: 'transfer',
    description: 'Mart ayı ofis icarəsi',
    notes: '',
    createdAt: '2026-03-01 09:20', 
    createdBy: 'Admin'
  },
  { 
    id: 4, 
    rowNumber: 4,
    date: '2026-02-28',
    employee: 'Nigar Həsənova',
    amount: 250,
    category: 'utilities',
    paymentMethod: 'card',
    description: 'Elektrik və su ödənişi',
    notes: '',
    createdAt: '2026-02-28 16:45', 
    createdBy: 'Admin'
  },
  { 
    id: 5, 
    rowNumber: 5,
    date: '2026-02-27',
    employee: 'Məhəmməd Şükürov',
    amount: 800,
    category: 'marketing',
    paymentMethod: 'card',
    description: 'Facebook reklamları',
    notes: 'Kampaniya uğurlu oldu',
    createdAt: '2026-02-27 11:30', 
    createdBy: 'Admin'
  },
])

// Calculate total expenses
const totalExpenses = computed(() => {
  return mockData.value.reduce((sum, item) => sum + (item.amount || 0), 0)
})

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showNewCategoryModal = ref(false)
const newCategoryName = ref('')
const formData = ref<Record<string, any>>({})
const bulkSelectedIds = ref<any[]>([])

// Watch for "new" category selection
watch(() => formData.value.category, (newValue) => {
  if (newValue === 'new') {
    showNewCategoryModal.value = true
    newCategoryName.value = ''
  }
})

// Add new category
const addNewCategory = () => {
  if (newCategoryName.value.trim()) {
    const newValue = newCategoryName.value.trim().toLowerCase().replace(/\s+/g, '_')
    
    // Add to category labels
    categoryLabels[newValue] = newCategoryName.value.trim()
    
    // Add to schema options
    const categoryField = expenseSchema.find(f => f.key === 'category')
    if (categoryField && categoryField.options) {
      // Remove "Yeni" option temporarily
      const newOption = categoryField.options.pop()
      // Add new category
      categoryField.options.push({ label: newCategoryName.value.trim(), value: newValue })
      // Add "Yeni" back at the end
      if (newOption) categoryField.options.push(newOption)
    }
    
    // Set the new category as selected
    formData.value.category = newValue
    showNewCategoryModal.value = false
  }
}

// --- Handlers ---
const handleAdd = () => {
  const today = new Date().toISOString().split('T')[0]
  formData.value = {
    date: today,
    employee: '',
    paymentMethod: 'cash',
    category: 'office'
  }
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row }
  showEditModal.value = true
}

const handleDelete = (row: any) => {
  if (confirm(`${row.amount} ₼ məbləğində xərci silmək istəyirsiniz?`)) {
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
  
  const duplicatedData = {
    ...row,
    id: newId,
    rowNumber: newRowNumber,
    date: new Date().toISOString().split('T')[0], // Today's date
    createdAt: formattedDate,
    createdBy: 'Sistem İdarəçisi'
  }
  
  mockData.value.push(duplicatedData)
}

const handleBulkDelete = (ids: any[]) => {
  if (confirm(`${ids.length} xərci silmək istəyirsiniz?`)) {
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
  showEditModal.value = true
}

const saveForm = () => {
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
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        Xərclər
      </h1>
      
      <!-- Total Expenses Card -->
      <div class="bg-[var(--color-brand-danger)]/10 border border-[var(--color-brand-danger)]/30 rounded-xl px-6 py-3">
        <div class="flex items-center gap-3">
          <UiIcon name="lucide:trending-down" class="w-6 h-6 text-[var(--color-brand-danger)]" />
          <div>
            <p class="text-xs text-[var(--text-app)] opacity-60">Cəmi xərc</p>
            <p class="text-xl font-bold text-[var(--color-brand-danger)]">{{ totalExpenses.toLocaleString() }} ₼</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      title="Xerc_Listesi"
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

      <!-- Date Custom Format -->
      <template #cell-date="{ value }">
        <span class="font-medium text-[var(--text-app)]">
          {{ new Date(value).toLocaleDateString('az-AZ') }}
        </span>
      </template>

      <!-- Amount Custom Format -->
      <template #cell-amount="{ value }">
        <span class="font-bold text-[var(--color-brand-danger)]">
          {{ value.toLocaleString() }} ₼
        </span>
      </template>

      <!-- Category Custom Format -->
      <template #cell-category="{ value }">
        <span class="px-2 py-1 rounded-lg text-xs font-medium bg-[var(--text-primary)]/10 text-[var(--text-primary)]">
          {{ categoryLabels[value] || value }}
        </span>
      </template>
    </DataTable>

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" title="Yeni Xərc Əlavə Et" max-width="xl">
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
    <Modal v-model="showEditModal" :title="bulkSelectedIds.length > 0 ? 'Toplu Redaktə' : 'Xərci Redaktə Et'" max-width="xl">
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        Xəbərdarlıq: Toplu redaktə rejimindəsiniz. Burada doldurduğunuz sahələr, seçdiyiniz <span class="font-bold">{{ bulkSelectedIds.length }}</span> qeydin məlumatının üzərinə yazılacaq.
      </div>

      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Yenilə</UiButton>
      </template>
    </Modal>

    <!-- Modal: New Category -->
    <Modal v-model="showNewCategoryModal" title="Yeni Kateqoriya Əlavə Et" max-width="md">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[var(--text-app)] mb-2">
            Kateqoriya adı
          </label>
          <UiInput 
            v-model="newCategoryName" 
            placeholder="Məsələn: Təmir işləri"
            icon="lucide:tag"
            @keyup.enter="addNewCategory"
          />
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showNewCategoryModal = false; formData.category = ''">İmtina</UiButton>
        <UiButton variant="primary" @click="addNewCategory" :disabled="!newCategoryName.trim()">Əlavə et</UiButton>
      </template>
    </Modal>

  </div>
</template>
