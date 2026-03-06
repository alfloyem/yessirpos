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

// --- Centralized Schema ---
const dateFilter = ref('all')
const dateFilterOptions = [
  { label: 'Hamısı', value: 'all' },
  { label: 'Bu gün', value: 'today' },
  { label: 'Dünən', value: 'yesterday' },
  { label: 'Bu həftə', value: 'thisWeek' },
  { label: 'Son 2 həftə', value: 'last2Weeks' },
  { label: 'Bu ay', value: 'thisMonth' },
  { label: 'Son 3 ay', value: 'last3Months' },
  { label: 'Bu il', value: 'thisYear' }
]

// Parse date from dd.mm.yyyy HH:mm format
const parseDate = (dateStr: string) => {
  const [datePart] = (dateStr || '').split(' ')
  const [day, month, year] = (datePart || '').split('.')
  if (!day || !month || !year) return new Date()
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

// Filter data by date
const filteredData = computed(() => {
  if (dateFilter.value === 'all') return mockData.value

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return mockData.value.filter(item => {
    const itemDate = parseDate(item.date)
    
    switch (dateFilter.value) {
      case 'today':
        return itemDate >= today
      
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return itemDate >= yesterday && itemDate < today
      
      case 'thisWeek':
        const weekStart = new Date(today)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
        return itemDate >= weekStart
      
      case 'last2Weeks':
        const twoWeeksAgo = new Date(today)
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        return itemDate >= twoWeeksAgo
      
      case 'thisMonth':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        return itemDate >= monthStart
      
      case 'last3Months':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        return itemDate >= threeMonthsAgo
      
      case 'thisYear':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        return itemDate >= yearStart
      
      default:
        return true
    }
  })
})

// --- Centralized Schema ---
const expenseSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { key: 'rowNumber', label: 'Sıra sayı', type: 'text', inTable: true, sortable: false },
  { key: 'date', label: 'Tarix', icon: 'lucide:calendar', type: 'datetime', inTable: true, sortable: true, required: true },
  { key: 'employee', label: 'Əməkdaş', icon: 'lucide:user', type: 'text', inTable: true, sortable: true },
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
    date: '03.03.2026 10:15',
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
    date: '02.03.2026 14:30',
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
    date: '01.03.2026 09:20',
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
    date: '28.02.2026 16:45',
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
    date: '27.02.2026 11:30',
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

// Calculate total expenses based on filtered data
const totalExpenses = computed(() => {
  return filteredData.value.reduce((sum, item) => sum + (item.amount || 0), 0)
})

// Calculate previous period total for comparison
const previousPeriodTotal = computed(() => {
  if (dateFilter.value === 'all') return 0
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let startDate: Date
  let endDate: Date
  
  switch (dateFilter.value) {
    case 'today':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 1)
      endDate = today
      break
    
    case 'yesterday':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 2)
      endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      break
    
    case 'thisWeek':
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      startDate = new Date(weekStart)
      startDate.setDate(startDate.getDate() - 7)
      endDate = weekStart
      break
    
    case 'last2Weeks':
      const twoWeeksAgo = new Date(today)
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      startDate = new Date(twoWeeksAgo)
      startDate.setDate(startDate.getDate() - 14)
      endDate = twoWeeksAgo
      break
    
    case 'thisMonth':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = monthStart
      break
    
    case 'last3Months':
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      endDate = threeMonthsAgo
      break
    
    case 'thisYear':
      const yearStart = new Date(now.getFullYear(), 0, 1)
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = yearStart
      break
    
    default:
      return 0
  }
  
  return mockData.value
    .filter(item => {
      const itemDate = parseDate(item.date)
      return itemDate >= startDate && itemDate < endDate
    })
    .reduce((sum, item) => sum + (item.amount || 0), 0)
})

// Calculate percentage change
const percentageChange = computed(() => {
  if (previousPeriodTotal.value === 0) return 0
  return ((totalExpenses.value - previousPeriodTotal.value) / previousPeriodTotal.value) * 100
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
  const d = new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const formattedDateTime = `${day}.${month}.${year} ${hours}:${minutes}`
  
  formData.value = {
    date: formattedDateTime,
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
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const formattedDateTime = `${day}.${month}.${year} ${hours}:${minutes}`
  
  const newId = Date.now()
  const newRowNumber = mockData.value.length + 1
  
  const duplicatedData = {
    ...row,
    id: newId,
    rowNumber: newRowNumber,
    date: formattedDateTime,
    createdAt: formattedDateTime,
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
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const formattedDateTime = `${day}.${month}.${year} ${hours}:${minutes}`
    
    const newId = Date.now()
    const newRowNumber = mockData.value.length + 1
    
    mockData.value.push({ 
      id: newId,
      rowNumber: newRowNumber,
      ...formData.value,
      createdAt: formattedDateTime,
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
        Xərclər
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      title="Xerc_Listesi"
      :data="filteredData" 
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
          {{ value }}
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

      <!-- Footer: Total Row -->
      <template #footer="{ columns, selectable, actions }">
        <tr class="bg-gradient-to-r from-[var(--color-brand-danger)]/5 to-[var(--color-brand-danger)]/10 border-t-2 border-[var(--color-brand-danger)]/30">
          <!-- Checkbox column if selectable -->
          <td v-if="selectable" class="px-6 py-4"></td>
          
          <!-- Row Number Column -->
          <td class="px-6 py-4">
            <div class="flex items-center gap-2">
              <UiIcon name="lucide:calculator" class="w-5 h-5 text-[var(--color-brand-danger)]" />
            </div>
          </td>
          
          <!-- Date Column -->
          <td class="px-6 py-4">
            <span class="text-sm font-semibold text-[var(--text-app)]">
              {{ dateFilterOptions.find(o => o.value === dateFilter)?.label || 'Hamısı' }}
            </span>
          </td>
          
          <!-- Employee Column -->
          <td class="px-6 py-4">
            <span class="text-sm font-bold text-[var(--text-app)]">CƏMİ XƏRC</span>
          </td>
          
          <!-- Amount Column -->
          <td class="px-6 py-4">
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-[var(--color-brand-danger)]">
                {{ totalExpenses.toLocaleString() }} ₼
              </span>
              <UiIcon 
                v-if="dateFilter !== 'all'"
                :name="percentageChange >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" 
                class="w-4 h-4"
                :class="percentageChange >= 0 ? 'text-red-500' : 'text-green-500'"
              />
              <span 
                v-if="dateFilter !== 'all'"
                class="text-xs font-medium"
                :class="percentageChange >= 0 ? 'text-red-500' : 'text-green-500'"
              >
                {{ Math.abs(percentageChange).toFixed(1) }}%
              </span>
            </div>
          </td>
          
          <!-- Category Column -->
          <td class="px-6 py-4">
            <div class="flex flex-wrap gap-1">
              <button
                v-for="option in dateFilterOptions.slice(0, 4)"
                :key="option.value"
                @click="dateFilter = option.value"
                class="px-2 py-1 rounded-md text-xs font-medium transition-all duration-300 cursor-pointer"
                :class="dateFilter === option.value 
                  ? 'bg-[var(--color-brand-danger)] text-white' 
                  : 'bg-[var(--input-bg)] text-[var(--text-app)] hover:bg-[var(--color-brand-danger)]/10 border border-[var(--border-app)]'"
              >
                {{ option.label }}
              </button>
            </div>
          </td>
          
          <!-- Actions column if present -->
          <td v-if="actions" class="px-6 py-4"></td>
        </tr>
      </template>
    </DataTable>

    <!-- Filter Buttons (Below Table) -->
    <div class="flex flex-wrap gap-2 justify-end">
      <button
        v-for="option in dateFilterOptions"
        :key="option.value"
        @click="dateFilter = option.value"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer"
        :class="dateFilter === option.value 
          ? 'bg-[var(--color-brand-danger)] text-white shadow-md shadow-[var(--color-brand-danger)]/30' 
          : 'bg-[var(--input-bg)] text-[var(--text-app)] hover:bg-[var(--color-brand-danger)]/10 border border-[var(--border-app)]'"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" title="Yeni Xərc Əlavə Et" max-width="3xl">
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
    <Modal v-model="showEditModal" :title="bulkSelectedIds.length > 0 ? 'Toplu Redaktə' : 'Xərci Redaktə Et'" max-width="3xl">
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
