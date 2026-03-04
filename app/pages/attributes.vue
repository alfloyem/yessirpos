<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()

useHead({
  title: 'Atributlar'
})

// --- Centralized Schema ---
const attributeSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { key: 'rowNumber', label: 'Sıra sayı', type: 'text', inTable: true, sortable: false },
  { key: 'name', label: 'Atributun adı', icon: 'lucide:tag', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'type', label: 'Atributun tipi', icon: 'lucide:list', type: 'select', inTable: true, sortable: true, required: true, options: [
    { label: 'Dropdown', value: 'dropdown' },
    { label: 'Checkbox', value: 'checkbox' },
    { label: 'Radio', value: 'radio' },
    { label: 'Text', value: 'text' },
    { label: 'Number', value: 'number' }
  ]},
  { key: 'createdAt', label: 'Yaradılma tarixi', type: 'text', inTable: false, sortable: true },
  { key: 'createdBy', label: 'Yaradan', type: 'text', inTable: false, sortable: true },
]

// Modal'da gösterilecek form alanları (createdAt, createdBy və rowNumber Hariç)
const formFields = computed(() => {
  return attributeSchema.filter(f => !['createdAt', 'createdBy', 'rowNumber'].includes(f.key))
})

// Values management in add/edit modal
const tempValues = ref<string[]>([])
const newValueInput = ref('')

const addValueToTemp = () => {
  if (newValueInput.value.trim() && !tempValues.value.includes(newValueInput.value.trim())) {
    tempValues.value.push(newValueInput.value.trim())
    newValueInput.value = ''
  }
}

const removeValueFromTemp = (index: number) => {
  tempValues.value.splice(index, 1)
}

// Extract table columns dynamically
const columns = computed(() => 
  attributeSchema
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// Attribute type labels for display
const typeLabels: Record<string, string> = {
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  radio: 'Radio',
  text: 'Text',
  number: 'Number'
}

// --- Data ---
const mockData = ref<any[]>([
  { 
    id: 1, 
    rowNumber: 1,
    name: 'Rəng',
    type: 'dropdown',
    values: ['Qırmızı', 'Mavi', 'Yaşıl', 'Qara', 'Ağ'],
    createdAt: '2026-03-03 10:15', 
    createdBy: 'Admin'
  },
  { 
    id: 2, 
    rowNumber: 2,
    name: 'Ölçü',
    type: 'dropdown',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    createdAt: '2026-03-02 14:30', 
    createdBy: 'Admin'
  },
  { 
    id: 3, 
    rowNumber: 3,
    name: 'Material',
    type: 'checkbox',
    values: ['Pambıq', 'Polyester', 'Yun', 'İpək'],
    createdAt: '2026-03-01 09:20', 
    createdBy: 'Admin'
  },
])

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showValuesModal = ref(false)
const formData = ref<Record<string, any>>({})
const bulkSelectedIds = ref<any[]>([])
const currentAttributeValues = ref<string[]>([])
const newValue = ref('')

// --- Handlers ---
const handleAdd = () => {
  formData.value = {
    type: 'dropdown',
    values: []
  }
  tempValues.value = []
  newValueInput.value = ''
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row, values: [...(row.values || [])] }
  tempValues.value = [...(row.values || [])]
  newValueInput.value = ''
  showEditModal.value = true
}

const handleDelete = (row: any) => {
  if (confirm(`"${row.name}" atributunu silmək istəyirsiniz?`)) {
    mockData.value = mockData.value.filter(m => m.id !== row.id)
    // Recalculate row numbers
    mockData.value.forEach((item, index) => {
      item.rowNumber = index + 1
    })
  }
}

const handleBulkDelete = (ids: any[]) => {
  if (confirm(`${ids.length} atributu silmək istəyirsiniz?`)) {
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

const handleManageValues = (row: any) => {
  formData.value = { ...row }
  currentAttributeValues.value = [...(row.values || [])]
  newValue.value = ''
  showValuesModal.value = true
}

const addValue = () => {
  if (newValue.value.trim() && !currentAttributeValues.value.includes(newValue.value.trim())) {
    currentAttributeValues.value.push(newValue.value.trim())
    newValue.value = ''
  }
}

const removeValue = (index: number) => {
  currentAttributeValues.value.splice(index, 1)
}

const saveValues = () => {
  const index = mockData.value.findIndex(m => m.id === formData.value.id)
  if (index !== -1) {
    mockData.value[index].values = [...currentAttributeValues.value]
  }
  showValuesModal.value = false
}

const saveForm = () => {
  // Assign temp values to formData
  formData.value.values = [...tempValues.value]
  
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
        Atributlar
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      title="Atribut_Listesi"
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

      <!-- Type Custom Format -->
      <template #cell-type="{ value, row }">
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 rounded-lg text-xs font-medium bg-[var(--text-primary)]/10 text-[var(--text-primary)]">
            {{ typeLabels[value] || value }}
          </span>
          <button
            @click="handleManageValues(row)"
            class="px-2 py-1 rounded-lg text-xs font-medium bg-[var(--color-brand-success)]/10 text-[var(--color-brand-success)] hover:bg-[var(--color-brand-success)]/20 transition-colors cursor-pointer"
          >
            Dəyərlər ({{ row.values?.length || 0 }})
          </button>
        </div>
      </template>
    </DataTable>

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" title="Yeni Atribut Əlavə Et" max-width="xl" min-height="500px">
      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
      />
      
      <!-- Values Section -->
      <div class="mt-6 space-y-4">
        <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider">
          Atributun daxilində olacaqlar
        </label>
        
        <!-- Add New Value -->
        <div class="flex gap-2">
          <UiInput 
            v-model="newValueInput" 
            placeholder="Dəyər əlavə et"
            icon="lucide:plus"
            @keyup.enter="addValueToTemp"
            class="flex-1"
          />
          <UiButton variant="primary" @click="addValueToTemp" :disabled="!newValueInput.trim()">
            Əlavə et
          </UiButton>
        </div>

        <!-- Values List -->
        <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          <div 
            v-for="(value, index) in tempValues" 
            :key="index"
            class="flex items-center justify-between p-3 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg hover:border-[var(--text-primary)] transition-colors"
          >
            <span class="text-sm text-[var(--text-app)]">{{ value }}</span>
            <button
              @click="removeValueFromTemp(index)"
              class="text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/10 p-1 rounded transition-colors cursor-pointer"
            >
              <UiIcon name="lucide:trash-2" class="w-4 h-4" />
            </button>
          </div>
          <div v-if="tempValues.length === 0" class="text-center py-6 text-[var(--text-app)] opacity-50 text-sm">
            Hələ dəyər əlavə edilməyib
          </div>
        </div>
      </div>
      
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Yadda saxla</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal v-model="showEditModal" :title="bulkSelectedIds.length > 0 ? 'Toplu Redaktə' : 'Atributu Redaktə Et'" max-width="xl" min-height="500px">
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        Xəbərdarlıq: Toplu redaktə rejimindəsiniz. Burada doldurduğunuz sahələr, seçdiyiniz <span class="font-bold">{{ bulkSelectedIds.length }}</span> qeydin məlumatının üzərinə yazılacaq.
      </div>

      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
      />
      
      <!-- Values Section (only for single edit) -->
      <div v-if="bulkSelectedIds.length === 0" class="mt-6 space-y-4">
        <label class="block text-xs font-bold text-[var(--text-app)] tracking-wider">
          Atributun daxilində olacaqlar
        </label>
        
        <!-- Add New Value -->
        <div class="flex gap-2">
          <UiInput 
            v-model="newValueInput" 
            placeholder="Dəyər əlavə et"
            icon="lucide:plus"
            @keyup.enter="addValueToTemp"
            class="flex-1"
          />
          <UiButton variant="primary" @click="addValueToTemp" :disabled="!newValueInput.trim()">
            Əlavə et
          </UiButton>
        </div>

        <!-- Values List -->
        <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          <div 
            v-for="(value, index) in tempValues" 
            :key="index"
            class="flex items-center justify-between p-3 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg hover:border-[var(--text-primary)] transition-colors"
          >
            <span class="text-sm text-[var(--text-app)]">{{ value }}</span>
            <button
              @click="removeValueFromTemp(index)"
              class="text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/10 p-1 rounded transition-colors cursor-pointer"
            >
              <UiIcon name="lucide:trash-2" class="w-4 h-4" />
            </button>
          </div>
          <div v-if="tempValues.length === 0" class="text-center py-6 text-[var(--text-app)] opacity-50 text-sm">
            Hələ dəyər əlavə edilməyib
          </div>
        </div>
      </div>
      
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">İmtina</UiButton>
        <UiButton variant="primary" @click="saveForm">Yenilə</UiButton>
      </template>
    </Modal>

    <!-- Modal: Manage Values -->
    <Modal v-model="showValuesModal" title="Atribut Dəyərlərini İdarə Et" max-width="md">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[var(--text-app)] mb-2">
            Atribut: <span class="text-[var(--text-primary)]">{{ formData.name }}</span>
          </label>
        </div>

        <!-- Add New Value -->
        <div class="flex gap-2">
          <UiInput 
            v-model="newValue" 
            placeholder="Yeni dəyər əlavə et"
            icon="lucide:plus"
            @keyup.enter="addValue"
            class="flex-1"
          />
          <UiButton variant="primary" @click="addValue" :disabled="!newValue.trim()">
            Əlavə et
          </UiButton>
        </div>

        <!-- Values List -->
        <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          <div 
            v-for="(value, index) in currentAttributeValues" 
            :key="index"
            class="flex items-center justify-between p-3 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg hover:border-[var(--text-primary)] transition-colors"
          >
            <span class="text-sm text-[var(--text-app)]">{{ value }}</span>
            <button
              @click="removeValue(index)"
              class="text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/10 p-1 rounded transition-colors cursor-pointer"
            >
              <UiIcon name="lucide:trash-2" class="w-4 h-4" />
            </button>
          </div>
          <div v-if="currentAttributeValues.length === 0" class="text-center py-8 text-[var(--text-app)] opacity-50 text-sm">
            Hələ dəyər əlavə edilməyib
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showValuesModal = false">İmtina</UiButton>
        <UiButton variant="primary" @click="saveValues">Yadda saxla</UiButton>
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
