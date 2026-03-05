<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()

useHead({
  title: 'Qazanclar'
})

// --- Centralized Schema ---
const earningsSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { key: 'date', label: 'Tarix', type: 'datetime-local', inTable: true, sortable: true, required: true },
  { key: 'employee', label: 'Əməkdaş', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'product', label: 'Satılan məhsul', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'amount', label: 'Qazanılan məbləğ (AZN)', icon: 'lucide:wallet', type: 'number', inTable: true, sortable: true, required: true },
  { key: 'notes', label: 'Qeyd', type: 'textarea', colSpan: 2, inTable: false },
]

// Modal'da gösterilecek form alanları
const formFields = computed(() => earningsSchema)

// Extract table columns dynamically
const columns = computed(() => 
  earningsSchema
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// --- Data ---
const mockData = ref<any[]>([
  { 
    id: 1, 
    date: '2026-03-05 09:30', 
    employee: 'Ahmet Yılmaz', 
    product: 'iPhone 15 Pro', 
    amount: 2500.00,
    notes: 'Nağd ödəniş'
  },
  { 
    id: 2, 
    date: '2026-03-05 11:15', 
    employee: 'Ayşe Kaya', 
    product: 'Samsung Galaxy S24', 
    amount: 1800.00,
    notes: 'Kart ilə ödəniş'
  },
  { 
    id: 3, 
    date: '2026-03-04 14:20', 
    employee: 'Məhəmməd Şükürov', 
    product: 'MacBook Air M2', 
    amount: 3200.00,
    notes: ''
  },
])

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const formData = ref<Record<string, any>>({})
const bulkSelectedIds = ref<any[]>([])

// --- Handlers ---
const handleAdd = () => {
  const now = new Date()
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  
  formData.value = {
    date: formattedDate,
    employee: 'Sistem Yöneticisi',
    amount: 0
  }
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row }
  showEditModal.value = true
}

const handleDelete = (row: any) => {
  formData.value = { ...row }
  showDeleteModal.value = true
}

const handleBulkDelete = (ids: any[]) => {
  if (confirm(`${ids.length} qazanc qeydini silmək istəyirsiniz?`)) {
    mockData.value = mockData.value.filter(m => !ids.includes(m.id))
  }
}

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  formData.value = {}
  showEditModal.value = true
}

const saveForm = () => {
  if (showAddModal.value) {
    mockData.value.push({ 
      id: Date.now(), 
      ...formData.value
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

const confirmDelete = () => {
  mockData.value = mockData.value.filter(m => m.id !== formData.value.id)
  showDeleteModal.value = false
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        Qazanclar
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      title="Qazanc_Listesi"
      :data="mockData" 
      :columns="columns"
      :selectable="true"
      :actions="true"
      :show-add="false"
      @edit="handleEdit"
      @delete="handleDelete"
      @bulk-delete="handleBulkDelete"
      @bulk-edit="handleBulkEdit"
    >
      <!-- Amount Custom Format -->
      <template #cell-amount="{ value }">
        <span class="font-medium text-[var(--color-brand-success)]">
          {{ value || 0 }} ₼
        </span>
      </template>

      <!-- Date Custom Format -->
      <template #cell-date="{ value }">
        <span class="text-sm">
          {{ value }}
        </span>
      </template>
    </DataTable>

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" title="Yeni Qazanc Əlavə Et" max-width="xl">
      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false">İptal</UiButton>
        <UiButton variant="primary" @click="saveForm">Yadda saxla</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal v-model="showEditModal" :title="bulkSelectedIds.length > 0 ? 'Toplu Düzənləmə' : 'Qazancı Düzənlə'" max-width="xl">
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        Diqqət: Toplu düzənləmə rejimindəsiniz. Burada doldurduğunuz sahələr seçilmiş <span class="font-bold">{{ bulkSelectedIds.length }}</span> qeydin məlumatlarının üzərinə yazılacaq.
      </div>

      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">İptal</UiButton>
        <UiButton variant="primary" @click="saveForm">Yenilə</UiButton>
      </template>
    </Modal>

    <!-- Modal: Delete Confirmation -->
    <Modal v-model="showDeleteModal" title="Qazancı Sil" max-width="sm">
      <p class="text-[var(--text-app)]">
        Bu qazanc qeydini silmək istədiyinizdən əminsiniz?
      </p>
      <template #footer>
        <UiButton variant="ghost" @click="showDeleteModal = false">İptal</UiButton>
        <UiButton variant="danger" @click="confirmDelete">Sil</UiButton>
      </template>
    </Modal>
  </div>
</template>
