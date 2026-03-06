<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast } from '#imports'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()

useHead({
  title: t('menu.attributes', 'Atributlar')
})

// --- Centralized Schema ---
const attributeSchema = computed< (FormField & { inTable?: boolean, sortable?: boolean })[] >(() => [
  { 
    key: 'name', 
    label: t('attributes.name', 'Atributun adı'), 
    icon: 'lucide:tag', 
    type: 'text', 
    inTable: true, 
    sortable: true, 
    required: true,
    colSpan: 1
  },
  { 
    key: 'values', 
    label: t('attributes.values', 'Dəyər'), 
    icon: 'lucide:list', 
    type: 'tags', 
    inTable: true, 
    sortable: false, 
    required: true,
    colSpan: 1
  },
  { key: 'createdAt', label: t('customers.createdAt', 'Tarix'), type: 'text', inTable: true, sortable: true },
  { key: 'createdBy', label: t('customers.createdBy', 'Əməkdaş'), type: 'text', inTable: true, sortable: true },
])

// Modal'da gösterilecek form alanları
const formFields = computed(() => {
  return attributeSchema.value.filter(f => !['createdAt', 'createdBy'].includes(f.key))
})

// Extract table columns dynamically
const columns = computed(() => 
  attributeSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// --- Data ---
const mockData = ref<any[]>([
  { 
    id: 1, 
    name: 'Rəng',
    values: ['Qırmızı', 'Mavi', 'Yaşıl', 'Qara', 'Ağ'],
    createdAt: '03.03.2026 10:15', 
    createdBy: 'Admin'
  },
  { 
    id: 2, 
    name: 'Ölçü',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    createdAt: '02.03.2026 14:30', 
    createdBy: 'Admin'
  },
  { 
    id: 3, 
    name: 'Material',
    values: ['Pambıq', 'Polyester', 'Yun', 'İpək'],
    createdAt: '01.03.2026 09:20', 
    createdBy: 'Admin'
  },
])

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteTarget = ref<{ type: 'single' | 'bulk', id?: any, ids?: any[] } | null>(null)
const formData = ref<Record<string, any>>({})
const formErrors = ref<Record<string, string>>({})
const bulkSelectedIds = ref<any[]>([])

// --- Handlers ---
const handleAdd = () => {
  formData.value = {
    values: []
  }
  formErrors.value = {}
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row, values: [...(row.values || [])] }
  formErrors.value = {}
  showEditModal.value = true
}

const handleDelete = (row: any) => {
  deleteTarget.value = { type: 'single', id: row.id }
  showDeleteConfirmModal.value = true
}

const handleBulkDelete = (ids: any[]) => {
  deleteTarget.value = { type: 'bulk', ids }
  showDeleteConfirmModal.value = true
}

const performDelete = () => {
  if (!deleteTarget.value) return

  if (deleteTarget.value.type === 'single') {
    mockData.value = mockData.value.filter(m => m.id !== deleteTarget.value?.id)
  } else if (deleteTarget.value.type === 'bulk') {
    const ids = deleteTarget.value.ids || []
    mockData.value = mockData.value.filter(m => !ids.includes(m.id))
  }

  showDeleteConfirmModal.value = false
  deleteTarget.value = null
  const toast = useToast()
  toast.success(t('common.delete', 'Silindi'))
}

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  formData.value = {}
  formErrors.value = {}
  showEditModal.value = true
}

const saveForm = () => {
  formErrors.value = {}
  let hasError = false
  
  for (const field of formFields.value) {
    if (field.required && (!formData.value[field.key] || (Array.isArray(formData.value[field.key]) && formData.value[field.key].length === 0))) {
      formErrors.value[field.key] = t('common.fieldRequired', 'Bu xəna mütləq doldurulmalıdır')
      hasError = true
    }
  }

  if (hasError) return

  if (showAddModal.value) {
    const d = new Date()
    const formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth()+1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    
    mockData.value.push({ 
      id: Date.now(),
      ...formData.value,
      createdAt: formattedDate,
      createdBy: 'Admin'
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
        {{ t('menu.attributes', 'Atributlar') }}
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      :title="t('menu.attributes', 'Atributlar')"
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
      <!-- Values List Custom Format -->
      <template #cell-values="{ value, highlight }">
        <div class="flex gap-1 flex-wrap">
          <template v-if="Array.isArray(value) && value.length > 0">
            <span 
              v-for="(tag, idx) in value" 
              :key="idx"
              class="px-2 py-0.5 bg-[var(--text-primary)]/10 text-[var(--text-primary)] rounded-[6px] text-[12px] font-medium"
              v-html="highlight(tag)"
            ></span>
          </template>
          <span v-else class="opacity-30">-</span>
        </div>
      </template>
    </DataTable>

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" :title="t('attributes.addNew', 'Yeni Atribut Əlavə Et')" max-width="md" min-height="600px" is-top max-height="95vh">
      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
        :errors="formErrors"
        :grid-cols="1"
      />
      
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.save', 'Yadda saxla') }}</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal 
      v-model="showEditModal" 
      :title="bulkSelectedIds.length > 0 ? t('common.bulkEdit', 'Toplu Redaktə') : t('attributes.edit', 'Atributu Redaktə Et')" 
      max-width="md"
      min-height="600px"
      is-top
      max-height="95vh"
      @update:model-value="(val) => { if (!val) bulkSelectedIds = [] }"
    >
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        {{ t('employees.bulkEditWarning', { count: bulkSelectedIds.length, default: `Diqqət: Seçilmiş ${bulkSelectedIds.length} qeydin üzərinə yazılacak.` }) }}
      </div>

      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
        :errors="formErrors"
        :grid-cols="1"
      />
      
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.update', 'Yenilə') }}</UiButton>
      </template>
    </Modal>

    <!-- Silmə Təsdiq Modalı -->
    <Modal v-model="showDeleteConfirmModal" :title="t('common.confirmDelete', 'Silmək istədiyinizə əminsiniz?')" max-width="sm">
      <div class="py-2">
        <p class="text-[var(--text-app)] opacity-80 text-[15px] leading-relaxed">
          {{ t('common.cannotBeUndone', 'Bu əməliyyat geri qaytarıla bilməz.') }}
          <span v-if="deleteTarget?.type === 'bulk'" class="font-bold text-[var(--color-brand-danger)] block mt-2">
            {{ t('attributes.bulkDeleteCount', { count: deleteTarget.ids?.length, default: `${deleteTarget.ids?.length} atribut silinəcək` }) }}
          </span>
        </p>
      </div>
      
      <template #footer>
        <UiButton variant="ghost" @click="showDeleteConfirmModal = false">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="danger" @click="performDelete">
          {{ t('common.yesDelete', 'Bəli, Sil') }}
        </UiButton>
      </template>
    </Modal>

  </div>
</template>
