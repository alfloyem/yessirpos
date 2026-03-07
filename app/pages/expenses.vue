<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useHead, useToast, useAuth } from '#imports'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()
const toast = useToast()

useHead({
  title: t('menu.expenses', 'Xərclər')
})

// --- Data ---
const expenses = ref<any[]>([])
const employeesOptions = ref<{label: string, value: string}[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// --- Centralized Schema ---
const expenseSchema = computed< (FormField & { inTable?: boolean, sortable?: boolean })[] >(() => [
  { key: 'date', label: t('expenses.date', 'Tarix'), icon: 'lucide:calendar', type: 'datetime', inTable: true, sortable: true, required: true, colSpan: 1 },
  { 
    key: 'employeeName', 
    label: t('expenses.employee', 'Əməkdaş'), 
    icon: 'lucide:user', 
    type: 'autocomplete', 
    options: employeesOptions.value,
    inTable: true, 
    sortable: true, 
    colSpan: 1 
  },
  { key: 'amount', label: t('expenses.amount', 'Xərc (₼)'), icon: 'lucide:wallet', type: 'number', inTable: true, sortable: true, required: true, colSpan: 1 },
  { 
    key: 'category', 
    label: t('expenses.category', 'Kateqoriya'), 
    icon: 'lucide:folder', 
    type: 'tags', 
    historyKey: 'expense_categories',
    inTable: true, 
    sortable: true, 
    required: true, 
    colSpan: 1 
  },
  { key: 'paymentMethod', label: t('expenses.paymentMethod', 'Ödəniş üsulu'), icon: 'lucide:credit-card', type: 'select', inTable: true, sortable: true, options: [
    { label: t('expenses.payCash', 'Nağd'), value: 'cash' },
    { label: t('expenses.payCard', 'Bank kartı'), value: 'card' },
    { label: t('expenses.payTransfer', 'Bank köçürməsi'), value: 'transfer' }
  ], colSpan: 1 },
  { key: 'notes', label: t('expenses.notes', 'Qeydlər'), type: 'textarea', colSpan: 2, inTable: false },
  { key: 'createdAt', label: t('common.createdAt', 'Yaradılma'), type: 'text', inTable: true, sortable: true },
  { key: 'createdBy', label: t('common.createdBy', 'Yaradan'), type: 'text', inTable: true, sortable: true },
])

// Modal'da gösterilecek form alanları
const formFields = computed(() => {
  return expenseSchema.value.filter(f => !['createdAt', 'createdBy'].includes(f.key))
})

// Extract table columns dynamically
const columns = computed(() => 
  expenseSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

const loadData = async () => {
  loading.value = true
  error.value = null
  
  try {
    const [expensesRes, employeesRes] = await Promise.all([
      $fetch('/api/expenses'),
      $fetch('/api/employees')
    ])

    expenses.value = (expensesRes as any[]).map(e => ({
      ...e,
      _date: new Date(e.date),
      category: e.category ? (e.category.startsWith('[') ? JSON.parse(e.category) : [e.category]) : [],
      date: new Date(e.date).toLocaleString('tr-TR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }),
      createdAt: new Date(e.createdAt).toLocaleString('tr-TR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    }))

    employeesOptions.value = (employeesRes as any[]).map(emp => ({
      label: `${emp.firstName} ${emp.lastName}`,
      value: `${emp.firstName} ${emp.lastName}`
    }))

  } catch (err: any) {
    const errorMsg = err.message || t('toast.loadingError', 'Məlumatlar yüklənərkən xəta baş verdi')
    error.value = errorMsg
    toast.error(errorMsg)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
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
const getLocalISOString = (date: Date = new Date()) => {
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const handleAdd = () => {
  formData.value = {
    date: getLocalISOString(),
    amount: '0.00',
    category: [],
    paymentMethod: 'cash'
  }
  formErrors.value = {}
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { 
    ...row,
    date: row._date ? getLocalISOString(row._date) : getLocalISOString()
  }
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

const performDelete = async () => {
  if (!deleteTarget.value) return
  loading.value = true
  
  try {
    if (deleteTarget.value.type === 'single') {
      await $fetch(`/api/expenses/${deleteTarget.value.id}`, { method: 'DELETE' })
      toast.success(t('toast.expenseDeleted', 'Xərc uğurla silindi'))
    } else {
      await $fetch('/api/expenses/bulk-delete', {
        method: 'POST',
        body: { ids: deleteTarget.value.ids }
      })
      toast.success(t('toast.expensesDeleted', 'Xərclər uğurla silindi'))
    }
    await loadData()
    showDeleteConfirmModal.value = false
    deleteTarget.value = null
  } catch (err: any) {
    toast.error(err.message || t('toast.operationFailed', 'Xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

const handleDuplicate = async (row: any) => {
  loading.value = true
  try {
    const { token } = useAuth()
    await $fetch('/api/expenses', {
      method: 'POST',
      body: {
        ...row,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      },
      headers: { Authorization: `Bearer ${token.value}` }
    })
    toast.success(t('toast.expenseDuplicated', 'Xərc kopyalandı'))
    await loadData()
  } catch (err: any) {
    toast.error(err.message || t('toast.operationFailed', 'Xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

const customSearch = (item: any, query: string) => {
  const q = query.toLowerCase()
  const fields = [
    item.employeeName,
    item.category,
    item.paymentMethod,
    item.description,
    item.notes,
    item.amount?.toString()
  ]
  return fields.some(f => f?.toLowerCase().includes(q))
}

const saveForm = async () => {
  formErrors.value = {}
  let hasError = false
  
  for (const field of formFields.value) {
    if (field.required && !formData.value[field.key]) {
      formErrors.value[field.key] = t('common.fieldRequired', 'Mütləqdir')
      hasError = true
    }
  }

  if (hasError) return
  loading.value = true
  
  try {
    const { token } = useAuth()
    const method = showAddModal.value ? 'POST' : 'PUT'
    const url = showAddModal.value ? '/api/expenses' : `/api/expenses/${formData.value.id}`
    
    await $fetch(url, {
      method,
      body: {
        ...formData.value,
        category: JSON.stringify(formData.value.category)
      },
      headers: { Authorization: `Bearer ${token.value}` }
    })
    
    toast.success(showAddModal.value ? t('toast.expenseAdded', 'Əlavə edildi') : t('toast.expenseUpdated', 'Yeniləndi'))
    showAddModal.value = false
    showEditModal.value = false
    await loadData()
  } catch (err: any) {
    toast.error(err.message || t('toast.operationFailed', 'Xəta baş verdi'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('menu.expenses', 'Xərclər') }}
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      :title="t('menu.expenses', 'Xərclər')"
      :data="expenses" 
      :columns="columns"
      :loading="loading"
      :selectable="true"
      :actions="true"
      :custom-search="customSearch"
      :search-placeholder="t('expenses.search', 'Xərclərdə axtar...')"
      @add="handleAdd"
      @edit="handleEdit"
      @delete="handleDelete"
      @bulk-delete="handleBulkDelete"
      @duplicate="handleDuplicate"
    >
      <!-- Custom Category Cell with Highlighting -->
      <template #cell-category="{ value, highlight }">
        <div class="flex gap-1 flex-wrap">
          <template v-if="Array.isArray(value) && value.length > 0">
            <span 
              v-for="(tag, idx) in value" 
              :key="idx"
              class="px-2 py-0.5 bg-[var(--text-primary)]/10 text-[var(--text-primary)] rounded-[6px] text-[11px] font-bold uppercase tracking-wider"
              v-html="highlight(tag)"
            ></span>
          </template>
          <span v-else class="opacity-30">-</span>
        </div>
      </template>

      <!-- Amount Cell with Highlighting -->
      <template #cell-amount="{ value, highlight }">
        <span class="font-bold text-[var(--text-primary)]" v-html="highlight(value) + ' ₼'"></span>
      </template>

      <!-- Audit Cells -->
      <template #cell-createdAt="{ value, highlight }">
        <span class="opacity-60" v-html="highlight(value)"></span>
      </template>
      <template #cell-createdBy="{ value, highlight }">
        <span class="font-medium" v-html="highlight(value)"></span>
      </template>
    </DataTable>

    <!-- Modals: Add / Edit -->
    <Modal v-model="showAddModal" :title="t('expenses.addNew', 'Yeni xərc əlavə et')" max-width="3xl">
      <DynamicForm 
        v-model="formData"
        :fields="formFields"
        :errors="formErrors"
        :grid-cols="2"
      />
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.save', 'Yadda saxla') }}</UiButton>
      </template>
    </Modal>

    <Modal v-model="showEditModal" :title="t('expenses.edit', 'Xərci redaktə et')" max-width="3xl">
      <DynamicForm 
        v-model="formData"
        :fields="formFields"
        :errors="formErrors"
        :grid-cols="2"
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.save', 'Yadda saxla') }}</UiButton>
      </template>
    </Modal>

    <!-- Delete Confirmation -->
    <Modal v-model="showDeleteConfirmModal" :title="t('common.confirmDelete', 'Silmək istədiyinizə əminsiniz?')" max-width="sm">
      <div class="py-2">
        <p class="text-[var(--text-app)] opacity-80 text-[15px] leading-relaxed">
          {{ t('common.cannotBeUndone', 'Bu əməliyyat geri qaytarıla bilməz.') }}
          <span v-if="deleteTarget?.type === 'bulk'" class="font-bold text-[var(--color-brand-danger)] block mt-2">
            {{ t('common.deleteBulkWarning', { count: deleteTarget.ids?.length }, 'seçilmiş bütün məlumatlar silinəcək') }}
          </span>
        </p>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showDeleteConfirmModal = false">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="danger" :loading="loading" @click="performDelete">
          {{ t('common.yesDelete', 'Bəli, Sil') }}
        </UiButton>
      </template>
    </Modal>
  </div>
</template>
