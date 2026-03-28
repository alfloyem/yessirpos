<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()
const { token, logout } = useAuth()
const toast = useToast()

useHead({
  title: t('attributes.title', 'Atributlar')
})

// --- Responsive State ---
const isMobile = ref(false)
const updateMobile = () => {
  if (import.meta.client) {
    isMobile.value = window.innerWidth < 768
  }
}

onMounted(() => {
  updateMobile()
  window.addEventListener('resize', updateMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobile)
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
const columns = computed(() => {
  const allCols = attributeSchema.value.filter(f => f.inTable)
  if (isMobile.value) {
    // On mobile, only show name and values
    return allCols
      .filter(f => ['name', 'values'].includes(f.key))
      .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
  }
  return allCols.map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
})

// --- Data ---
const mockData = ref<any[]>([])
const loading = ref(false)

const loadAttributes = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/attributes', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    mockData.value = (data as any[]).map(d => ({
      ...d,
      createdAt: new Date(d.createdAt).toLocaleString('tr-TR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    }))
  } catch (err: any) {
    toast.error(t('toast.loadingError', 'Məlumatlar yüklənərkən xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAttributes()
})

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

const handleDuplicate = async (row: any) => {
  loading.value = true
  const toast = useToast()
  
  // Find next number
  const baseName = row.name.replace(/\s\d+$/, '') // Strip trailing number if any
  const existingNames = mockData.value.map(item => item.name)
  let count = 1
  let newName = `${baseName} ${count}`
  
  while (existingNames.includes(newName)) {
    count++
    newName = `${baseName} ${count}`
  }

  try {
    await $fetch('/api/attributes', {
      method: 'POST',
      body: {
        name: newName,
        values: row.values
      },
      headers: { Authorization: `Bearer ${token.value}` }
    })
    toast.success(t('toast.attributeDuplicated', 'Atribut kopyalandı'))
    await loadAttributes()
  } catch (err: any) {
    toast.error(t('toast.operationFailed', 'Xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

const handleDelete = (row: any) => {
  deleteTarget.value = { type: 'single', id: row.id }
  showDeleteConfirmModal.value = true
}

const handleBulkDelete = (ids: any[]) => {
  deleteTarget.value = { type: 'bulk', ids }
  showDeleteConfirmModal.value = true
}

const performDelete = async () => {
  if (!deleteTarget.value) return
  loading.value = true

  try {
    if (deleteTarget.value.type === 'single') {
      await $fetch(`/api/attributes/${deleteTarget.value.id}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token.value}` }
      })
      toast.success(t('toast.attributeDeleted', 'Atribut silindi'))
    } else if (deleteTarget.value.type === 'bulk') {
      await $fetch('/api/attributes/bulk-delete', {
        method: 'POST',
        body: { ids: deleteTarget.value.ids },
        headers: { Authorization: `Bearer ${token.value}` }
      })
      toast.success(t('toast.attributesDeleted', { count: deleteTarget.value.ids?.length, default: `${deleteTarget.value.ids?.length} atribut silindi` }))
    }
    await loadAttributes()
    showDeleteConfirmModal.value = false
    deleteTarget.value = null
  } catch (err: any) {
    toast.error(t('toast.operationFailed', 'Xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  formData.value = {}
  formErrors.value = {}
  showEditModal.value = true
}

const saveForm = async () => {
  formErrors.value = {}
  let hasError = false
  
  for (const field of formFields.value) {
    if (field.required && (!formData.value[field.key] || (Array.isArray(formData.value[field.key]) && formData.value[field.key].length === 0))) {
      formErrors.value[field.key] = t('common.fieldRequired', 'Bu xana mütləq doldurulmalıdır')
      hasError = true
    }
  }

  if (hasError) return
  loading.value = true
  const toast = useToast()

  try {
    const headers = { Authorization: `Bearer ${token.value}` }
    if (showAddModal.value) {
      await $fetch('/api/attributes', {
        method: 'POST',
        body: formData.value,
        headers
      })
      toast.success(t('toast.attributeAdded', 'Atribut əlavə edildi'))
      showAddModal.value = false
    } else if (showEditModal.value) {
      if (bulkSelectedIds.value.length > 0) {
        const updates = Object.fromEntries(Object.entries(formData.value).filter(([_, v]) => v !== undefined && v !== ''))
        await $fetch('/api/attributes/bulk-update', {
          method: 'POST',
          body: { ids: bulkSelectedIds.value, updates },
          headers
        })
        toast.success(t('toast.attributesUpdated', { count: bulkSelectedIds.value.length, default: `${bulkSelectedIds.value.length} atribut yeniləndi` }))
        bulkSelectedIds.value = []
      } else {
        await $fetch(`/api/attributes/${formData.value.id}`, {
          method: 'PUT',
          body: formData.value,
          headers
        })
        toast.success(t('toast.attributeUpdated', 'Atribut yeniləndi'))
      }
      showEditModal.value = false
    }
    await loadAttributes()
  } catch (err: any) {
    toast.error(t('toast.operationFailed', 'Xəta baş verdi'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col space-y-4 sm:space-y-6 font-sans">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-1 sm:px-0">
      <h1 class="text-xl sm:text-2xl font-black text-[var(--text-app)] tracking-tight">
        {{ t('attributes.title', 'Atributlar') }}
      </h1>
      <p class="text-[11px] sm:text-xs opacity-40 font-medium">
        {{ t('attributes.subtitle', 'Məhsul atributlarının idarə olunması') }}
      </p>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      :title="t('attributes.title', 'Atributlar')"
      :data="mockData" 
      :columns="columns"
      :selectable="true"
      :actions="true"
      :loading="loading"
      @add="handleAdd"
      @edit="handleEdit"
      @duplicate="handleDuplicate"
      @delete="handleDelete"
      @bulk-delete="handleBulkDelete"
      @bulk-edit="handleBulkEdit"
    >
      <template #cell-values="{ value, highlight }">
        <div class="flex gap-1.5 flex-wrap py-1">
          <template v-if="Array.isArray(value) && value.length > 0">
            <span 
              v-for="(tag, idx) in value" 
              :key="idx"
              class="px-2 py-0.5 bg-[var(--text-primary)]/5 hover:bg-[var(--text-primary)]/10 text-[var(--text-primary)] rounded-[6px] text-[11px] font-bold border border-[var(--text-primary)]/10 transition-colors"
              v-html="highlight(tag)"
            ></span>
          </template>
          <span v-else class="opacity-30 italic text-[12px]">{{ t('common.none', 'Yoxdur') }}</span>
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
        :is-loading="loading"
      />
      
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false" :disabled="loading" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" :loading="loading" class="!px-8 min-w-[120px]">{{ t('common.save', 'Yadda saxla') }}</UiButton>
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
        :is-loading="loading"
      />
      
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []" :disabled="loading" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" :loading="loading" class="!px-8 min-w-[120px]">{{ t('common.update', 'Yenilə') }}</UiButton>
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
        <UiButton variant="ghost" @click="showDeleteConfirmModal = false" :disabled="loading">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="danger" @click="performDelete" :loading="loading">
          {{ t('common.yesDelete', 'Bəli, Sil') }}
        </UiButton>
      </template>
    </Modal>

  </div>
</template>
