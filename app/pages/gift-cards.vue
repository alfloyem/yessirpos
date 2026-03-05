<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'
import { useToast, useAuth } from '#imports'

const { t } = useI18n()

useHead({
  title: t('menu.giftCard') || 'Hədiyyə Kartı'
})

// --- API Calls ---
const mockData = ref<any[]>([])
const customersOptions = ref<{label: string, value: number}[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const loadData = async () => {
  loading.value = true
  error.value = null
  const toast = useToast()
  
  try {
    const [giftCards, customersRes] = await Promise.all([
      $fetch('/api/gift-cards'),
      $fetch('/api/customers')
    ])
    
    mockData.value = (giftCards as any[]).map(d => ({
      ...d,
      _date: new Date(d.createdAt),
      createdAt: new Date(d.createdAt).toLocaleString('tr-TR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    }))
    
    customersOptions.value = (customersRes as any[]).map(c => ({
      label: `${c.firstName} ${c.lastName}`,
      value: c.id
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

// --- Helper for Random Card Number Generation ---
const generateCardNumber = () => {
  const gBarcodes = mockData.value
    .map(m => m.barcode)
    .filter(b => typeof b === 'string' && /^G\d{7}$/.test(b))
    .map(b => parseInt(b.substring(1), 10))
  
  let nextNum = 1
  if (gBarcodes.length > 0) {
    nextNum = Math.max(...gBarcodes) + 1
  }
  
  let barcode = `G${String(nextNum).padStart(7, '0')}`
  
  const existingSet = new Set(mockData.value.map(m => m.barcode))
  while (existingSet.has(barcode)) {
    nextNum++
    barcode = `G${String(nextNum).padStart(7, '0')}`
  }
  
  return barcode
}

// --- Centralized Schema ---
const giftCardSchema = computed< (FormField & { inTable?: boolean, sortable?: boolean })[] >(() => [
  { 
    key: 'customer', 
    label: 'Müştəri adını axtar', 
    type: 'select', 
    inTable: false, // We will map it manually for the table to show full name
    required: true,
    icon: 'lucide:user',
    options: customersOptions.value,
    colSpan: 2
  },
  { key: 'customerName', label: 'Müştəri Adı', type: 'text', inTable: true, sortable: true },
  { key: 'barcode', label: 'Barkod (Kart nömrəsi)', icon: 'lucide:barcode', type: 'barcode', barcodePrefix: 'G', inTable: true, sortable: true, required: true },
  { key: 'value', label: 'Dəyəri (AZN)', icon: 'lucide:wallet', type: 'number', inTable: true, sortable: true, required: true },
  { key: 'createdAt', label: 'Tarix', type: 'text', inTable: true, sortable: true },
  { key: 'createdBy', label: 'Əməkdaş', type: 'text', inTable: true, sortable: true }
])

// Modalda gösterilecek form alanları
const formFields = computed(() => {
  return giftCardSchema.value.filter(f => !['customerName', 'createdAt', 'createdBy'].includes(f.key))
})

// Table Columns
const columns = computed(() => 
  giftCardSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

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
    barcode: generateCardNumber(),
    value: '0.00',
    customer: ''
  }
  formErrors.value = {}
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row, customer: row.customerId }
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

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  formData.value = {}
  formErrors.value = {}
  showEditModal.value = true
}

// Duplicate logic
const handleDuplicate = async (row: any) => {
  loading.value = true
  const toast = useToast()
  const { token, logout } = useAuth()
  
  try {
    const newBarcode = generateCardNumber()
    
    let newDate = new Date()
    if (row._date) {
      newDate = new Date(row._date.getTime() + 1000)
    }
    
    const headers = { Authorization: `Bearer ${token.value}` }
    
    await $fetch('/api/gift-cards', {
      method: 'POST',
      body: {
        barcode: newBarcode,
        value: row.value,
        customer: row.customerId,
        createdAt: newDate.toISOString()
      },
      headers
    })
    
    toast.success(t('toast.customerDuplicated', 'Hədiyyə kartı kopyalandı'))
    await loadData()
  } catch (err: any) {
    const errorMsg = err.message || t('toast.operationFailed', 'Əməliyyat zamanı xəta baş verdi')
    toast.error(errorMsg)
    if (err.statusCode === 401) logout()
  } finally {
    loading.value = false
  }
}

// Validation
const validateForm = () => {
  const errors: Record<string, string> = {}
  if (!formData.value.customer && bulkSelectedIds.value.length === 0) { // bulk edit doesn't require customer
    errors.customer = 'Bu xana mütləqdir'
  }
  if (!formData.value.barcode && bulkSelectedIds.value.length === 0) {
    errors.barcode = 'Bu xana mütləqdir'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveForm = async () => {
  if (!validateForm()) return
  
  loading.value = true
  const toast = useToast()
  
  try {
    const isBulk = bulkSelectedIds.value.length > 0
    const isEdit = showEditModal.value
    
    if (isEdit && isBulk) {
      const updates = Object.fromEntries(
        Object.entries(formData.value).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
      )
      await $fetch('/api/gift-cards/bulk-update', {
        method: 'POST',
        body: { ids: bulkSelectedIds.value, updates }
      })
      toast.success(t('toast.updated', 'Məlumatlar yeniləndi'))
      bulkSelectedIds.value = []
      showEditModal.value = false
    } else if (isEdit) {
      await $fetch(`/api/gift-cards/${formData.value.id}`, {
        method: 'PUT',
        body: {
          barcode: formData.value.barcode,
          value: formData.value.value,
          customer: formData.value.customer
        }
      })
      toast.success(t('toast.updated', 'Yeniləndi'))
      showEditModal.value = false
    } else {
      await $fetch('/api/gift-cards', {
        method: 'POST',
        body: {
          barcode: formData.value.barcode,
          value: formData.value.value,
          customer: formData.value.customer
        }
      })
      toast.success(t('toast.added', 'Əlavə edildi'))
      showAddModal.value = false
    }
    await loadData()
  } catch (err: any) {
    const message = err.message || t('toast.error', 'Xəta baş verdi!')
    if (err.statusCode === 409) {
      formErrors.value = { barcode: message }
    }
    toast.error(message)
  } finally {
    loading.value = false
  }
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  loading.value = true
  const toast = useToast()
  
  try {
    if (deleteTarget.value.type === 'bulk') {
      await $fetch('/api/gift-cards/bulk-delete', {
        method: 'POST',
        body: { ids: deleteTarget.value.ids }
      })
      toast.success(t('toast.deleted', 'Məlumatlar silindi'))
    } else {
      await $fetch(`/api/gift-cards/${deleteTarget.value.id}`, {
        method: 'DELETE'
      })
      toast.success(t('toast.deleted', 'Silindi'))
    }
    showDeleteConfirmModal.value = false
    await loadData()
  } catch (err: any) {
    toast.error(err.message || t('toast.error', 'Xəta baş verdi!'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
       <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('menu.giftCard', 'Hədiyyə Kartı') }}
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      title="Hediyye_Kartlari"
      :data="mockData" 
      :columns="columns"
      :loading="loading"
      :selectable="true"
      :actions="true"
      @add="handleAdd"
      @edit="handleEdit"
      @delete="handleDelete"
      @duplicate="handleDuplicate"
      @bulk-delete="handleBulkDelete"
      @bulk-edit="handleBulkEdit"
    >
      <!-- Value Custom Format -->
      <template #cell-value="{ value, highlight }">
        <span 
          class="font-medium text-[var(--color-brand-success)]"
          v-html="highlight(Number(value || 0).toFixed(2)) + ' ₼'"
        >
        </span>
      </template>

      <!-- Card Number Visual Formatting -->
      <template #cell-barcode="{ value, highlight }">
        <span 
          class="font-mono bg-[var(--input-bg)] px-2 py-1 rounded text-[13px] border border-[var(--border-app)] tracking-widest text-[var(--text-primary)]"
          v-html="highlight(value)"
        >
        </span>
      </template>
    </DataTable>

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" :title="t('common.addNewCard', 'Yeni Hədiyyə Kartı Əlavə Et')" max-width="xl">
      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
        :errors="formErrors"
        :grid-cols="2"
      />
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.save', 'Yadda saxla') }}</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal 
      v-model="showEditModal" 
      :title="bulkSelectedIds.length > 0 ? t('common.bulkEdit', 'Toplu Redaktə') : t('common.editCard', 'Hədiyyə Kartını Redaktə Et')" 
      max-width="xl"
      @update:model-value="(val) => { if (!val) bulkSelectedIds = [] }"
    >
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        {{ t('employees.bulkEditWarning', { count: bulkSelectedIds.length, default: `Diqqət: Seçilmiş ${bulkSelectedIds.length} qeydin üzərinə yazılacaq.` }) }}
      </div>

      <DynamicForm 
        :fields="showEditModal && bulkSelectedIds.length > 0 ? formFields.filter(f => !['barcode', 'customer'].includes(f.key)) : formFields"
        v-model="formData" 
        :errors="formErrors"
        :grid-cols="2"
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.save', 'Yadda saxla') }}</UiButton>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal (Clean Version) -->
    <Modal 
      v-model="showDeleteConfirmModal" 
      :max-width="'sm'" 
      :show-header="false" 
      class="delete-modal"
    >
      <div class="px-2 py-4 flex flex-col items-center justify-center text-center">
        <!-- Icon -->
        <div class="w-16 h-16 rounded-2xl bg-[var(--color-brand-danger)]/10 flex items-center justify-center mb-6 text-[var(--color-brand-danger)] shadow-sm shrink-0">
          <UiIcon name="lucide:trash-2" class="w-8 h-8" stroke-width="2" />
        </div>
        
        <!-- Texts -->
        <h3 class="text-xl font-bold text-[var(--text-app)] mb-2 tracking-wide">
          {{ t('common.delete', 'Sil') }}
        </h3>
        
        <p class="text-[15px] font-medium text-[var(--text-app)] opacity-60 leading-relaxed mb-8 max-w-[280px]">
          {{ 
            deleteTarget?.type === 'bulk' 
              ? t('employees.bulkDeleteWarning', { count: deleteTarget.ids?.length, default: `Seçilmiş ${deleteTarget.ids?.length} qeydi silmək istədiyinizə əminsiniz?` }) 
              : t('employees.deleteWarning', 'Bu qeydi silmək istədiyinizə əminsiniz?') 
          }}
        </p>

        <!-- Buttons -->
        <div class="flex items-center gap-3 w-full">
          <UiButton 
            variant="ghost" 
            class="flex-1 !h-12 text-[15px] font-semibold tracking-wide hover:bg-[var(--text-primary)]/5"
            @click="showDeleteConfirmModal = false"
          >
            {{ t('common.cancel', 'Ləğv et') }}
          </UiButton>
          
          <UiButton 
            variant="danger" 
            class="flex-1 !h-12 text-[15px] font-semibold tracking-wide shadow-md shadow-[var(--color-brand-danger)]/20 hover:shadow-lg"
            @click="confirmDelete"
          >
            {{ t('common.delete', 'Sil') }}
          </UiButton>
        </div>
      </div>
    </Modal>
  </div>
</template>
