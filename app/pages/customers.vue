<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useHead, useToast, useAuth, useNuxtApp } from '#imports'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'
import UiInput from '~/components/ui/Input.vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiSelect from '~/components/ui/Select.vue'
import { printDebtPaymentReceipt } from '~/utils/receiptPrinter'

const { t } = useI18n()
const toast = useToast()
const { $api } = useNuxtApp()

useHead({
  title: t('customers.title', 'Müştərilər')
})

// --- Helper for Barcode Generation ---
const generateBarcode = () => {
  const cBarcodes = mockData.value
    .map(m => m.barcode)
    .filter(b => typeof b === 'string' && /^C\d{7}$/.test(b))
    .map(b => parseInt(b.substring(1), 10))
  
  let nextNum = 1
  if (cBarcodes.length > 0) {
    nextNum = Math.max(...cBarcodes) + 1
  }
  
  let barcode = `C${String(nextNum).padStart(7, '0')}`
  
  const existingSet = new Set(mockData.value.map(m => m.barcode))
  while (existingSet.has(barcode)) {
    nextNum++
    barcode = `C${String(nextNum).padStart(7, '0')}`
  }
  
  return barcode
}

// --- Centralized Schema ---
const customerSchema = computed< (FormField & { inTable?: boolean, sortable?: boolean })[] >(() => [
  { key: 'firstName', label: t('customers.firstName', 'Ad'), type: 'text', inTable: true, sortable: true, required: true, colSpan: 1 },
  { key: 'lastName', label: t('customers.lastName', 'Soyad'), type: 'text', inTable: true, sortable: true, required: true, colSpan: 1 },
  { key: 'barcode', label: t('customers.barcode', 'Barkod'), icon: 'lucide:barcode', type: 'barcode', inTable: true, sortable: true, required: true, colSpan: 2 },
  { key: 'gender', label: t('customers.gender', 'Cinsiyyət'), icon: 'streamline-ultimate:gender-hetero-bold', type: 'select', inTable: true, sortable: true, options: [
    { label: t('common.select', 'Seç...'), value: '' },
    { label: t('customers.male', 'Kişi'), value: 'Kişi' },
    { label: t('customers.female', 'Qadın'), value: 'Qadın' }
  ], colSpan: 1 },
  { key: 'bonus', label: t('customers.bonus', 'Bonus (AZN)'), icon: 'fa7-solid:manat-sign', type: 'number', inTable: true, sortable: true, colSpan: 1 },
  { key: 'debt', label: t('customers.debt', 'Borc (AZN)'), icon: 'fa7-solid:manat-sign', type: 'number', inTable: true, sortable: true, colSpan: 1 },
  { key: 'email', label: t('employees.email', 'E-poçt (Email)'), icon: 'lucide:mail', type: 'email', inTable: true, sortable: true, colSpan: 1 },
  { key: 'phone', label: t('employees.phone', 'Telefon'), icon: 'lucide:phone', type: 'tel', inTable: true, sortable: true, colSpan: 1 },
  { key: 'city', label: t('customers.city', 'Şəhər/rayon'), type: 'tags', inTable: true, sortable: true, colSpan: 1 },
  { key: 'country', label: t('customers.country', 'Ölkə'), icon: 'lucide:globe', type: 'select', isCountry: true, colSpan: 1, inTable: false },
  { key: 'address', label: t('customers.address', 'Ünvan'), icon: 'lucide:map-pin', type: 'text', colSpan: 2, inTable: false },
  { key: 'notes', label: t('employees.notes', 'Xüsusi qeyd'), type: 'textarea', colSpan: 2, inTable: false },
  // Tarix ve Əməkdaş sadece görüntü/otomatik olduğu için forma eklemiyoruz, tablo/arkaplan mantığında işliyoruz.
  { key: 'createdAt', label: t('customers.createdAt', 'Tarix'), type: 'text', inTable: true, sortable: true },
  { key: 'createdBy', label: t('customers.createdBy', 'Əməkdaş'), type: 'text', inTable: true, sortable: true },
])

// Modal'da gösterilecek form alanları (Tarix ve Əməkdaş Hariç)
const formFields = computed(() => {
  return customerSchema.value.filter(f => !['createdAt', 'createdBy'].includes(f.key))
})

// Extract table columns dynamically
const columns = computed(() => 
  customerSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// --- Data ---
const mockData = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const loadCustomers = async () => {
  loading.value = true
  error.value = null
  
  try {
    const data = await $api('/api/customers')
    mockData.value = (data as any[]).map(d => ({
      ...d,
      _date: new Date(d.createdAt),
      createdAt: new Date(d.createdAt).toLocaleString('tr-TR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    }))
  } catch (err: any) {
    const errorMsg = err.message || t('toast.loadingError', 'Məlumatlar yüklənərkən xəta baş verdi')
    error.value = errorMsg
    toast.error(errorMsg)
    console.error('Load customers error:', err)
  } finally {
    loading.value = false
  }
}

const availablePaymentMethods = ref<{ label: string, value: string }[]>([
  { label: 'Nəğd', value: 'Nəğd' },
  { label: 'Kart', value: 'Kart' }
])
const loadPaymentMethods = async () => {
  try {
    const data = await $api('/api/payment-methods')
    const methods = (data as any[]).map(m => ({
      label: m.name,
      value: m.name
    }))
    
    // Merge with defaults, avoiding duplicates
    const combined = [...availablePaymentMethods.value]
    methods.forEach(m => {
      if (!combined.some(c => c.value === m.value)) {
        combined.push(m)
      }
    })
    availablePaymentMethods.value = combined
    
    if (availablePaymentMethods.value.length > 0) {
      payDebtMethod.value = availablePaymentMethods.value[0]?.value || 'Nəğd'
    }
  } catch (err) {
    console.error('Load payment methods error:', err)
  }
}

onMounted(() => {
  loadCustomers()
  loadPaymentMethods()
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
    barcode: generateBarcode(),
    bonus: '0.00',
    debt: '0.00',
    city: [],
    country: 'AZ'
  }
  formErrors.value = {}
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row }
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
  const toast = useToast()
  
  try {
    if (deleteTarget.value.type === 'single') {
      await $api(`/api/customers/${deleteTarget.value.id}`, { method: 'DELETE' })
      toast.success(t('toast.customerDeleted', 'Müştəri uğurla silindi'))
    } else if (deleteTarget.value.type === 'bulk') {
      const count = deleteTarget.value.ids?.length || 0
      await $api('/api/customers/bulk-delete', {
        method: 'POST',
        body: { ids: deleteTarget.value.ids }
      })
      toast.success(t('toast.customersDeleted', { count, default: `${count} müştəri uğurla silindi` }))
    }
    
    await loadCustomers()
    showDeleteConfirmModal.value = false
    deleteTarget.value = null
  } catch (err: any) {
    const errorMsg = err.message || t('toast.operationFailed', 'Əməliyyat zamanı xəta baş verdi')
    toast.error(errorMsg)
    console.error('Delete error:', err)
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

const handleDuplicate = async (row: any) => {
  loading.value = true
  const { token, logout } = useAuth()
  
  try {
    const newBarcode = generateBarcode()
    
    // Set createdAt slightly ahead of the copied row to position it right above
    let newDate = new Date()
    if (row._date) {
      newDate = new Date(row._date.getTime() + 1000)
    }
    
    const headers = { Authorization: `Bearer ${token.value}` }
    
    await $api('/api/customers', {
      method: 'POST',
      body: {
        ...row,
        id: undefined,
        barcode: newBarcode,
        createdAt: newDate.toISOString()
      },
      headers
    })
    
    toast.success(t('toast.customerDuplicated', 'Müştəri kopyalandı'))
    
    await loadCustomers()
  } catch (err: any) {
    const errorMsg = err.message || t('toast.operationFailed', 'Əməliyyat zamanı xəta baş verdi')
    toast.error(errorMsg)
    console.error('Duplicate error:', err)
    
    if (err.statusCode === 401) {
      logout()
    }
  } finally {
    loading.value = false
  }
}

const customSearch = (item: any, query: string) => {
  const normalizeText = (text: any) => {
    if (text === null || text === undefined) return ''
    return String(text)
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
  }

  const q = normalizeText(query)
  
  const searchableFields = [
    item.firstName,
    item.lastName,
    item.barcode,
    item.phone,
    item.email,
    item.address,
    item.notes,
    item.createdBy,
    item.gender === 'Kişi' ? t('customers.male', 'Kişi') : item.gender === 'Qadın' ? t('customers.female', 'Qadın') : item.gender,
    // City (tags array)
    Array.isArray(item.city) ? item.city.join(' ') : item.city
  ]
  
  return searchableFields.some(field => normalizeText(field).includes(q))
}

const copyBarcode = (barcode: string) => {
  if (!barcode) return
  
  navigator.clipboard.writeText(barcode).then(() => {
    toast.success(t('toast.barcodeCopied', 'Barkod kopyalandı!'))
  }).catch(() => {
    toast.error(t('toast.operationFailed', 'Xəta baş verdi'))
  })
}

const saveForm = async () => {
  formErrors.value = {}
  let hasError = false
  
  const isBulkEditMode = showEditModal.value && bulkSelectedIds.value.length > 0
  const activeFields = isBulkEditMode
    ? formFields.value.filter(f => f.key !== 'barcode')
    : formFields.value

  for (const field of activeFields) {
    if (field.required && !formData.value[field.key]) {
      if (!isBulkEditMode) {
        formErrors.value[field.key] = t('common.fieldRequired', 'Bu xəna mütləq doldurulmalıdır')
        hasError = true
      }
    }
  }

  if (hasError) return

  loading.value = true
  const { token, logout } = useAuth()
  
  try {
    const headers = { Authorization: `Bearer ${token.value}` }
    
    if (showAddModal.value) {
      // Create new customer
      await $api('/api/customers', {
        method: 'POST',
        body: formData.value,
        headers
      })
      toast.success(t('toast.customerAdded', 'Müştəri uğurla əlavə edildi'))
      showAddModal.value = false
    } else if (showEditModal.value) {
      if (bulkSelectedIds.value.length > 0) {
        // Bulk update
        const updates = Object.fromEntries(
          Object.entries(formData.value).filter(([_, v]) => v !== undefined && v !== '')
        )
        await $api('/api/customers/bulk-update', {
          method: 'POST',
          body: { ids: bulkSelectedIds.value, updates },
          headers
        })
        toast.success(t('toast.customersUpdated', { count: bulkSelectedIds.value.length, default: `${bulkSelectedIds.value.length} müştəri yeniləndi` }))
        bulkSelectedIds.value = []
      } else {
        // Single update
        await $api(`/api/customers/${formData.value.id}`, {
          method: 'PUT',
          body: formData.value,
          headers
        })
        toast.success(t('toast.customerUpdated', 'Müştəri uğurla yeniləndi'))
      }
      showEditModal.value = false
    }
    
    await loadCustomers()
  } catch (err: any) {
    const errorMsg = err.data?.statusMessage || err.message || t('toast.operationFailed', 'Əməliyyat zamanı xəta baş verdi')
    toast.error(errorMsg)
    console.error('Save error:', err)
    
    if (err.statusCode === 401) {
      logout()
    }
    
    if (err.data?.statusMessage?.includes('barkod')) {
      formErrors.value.barcode = err.data.statusMessage
    }
  } finally {
    loading.value = false
  }
}

// --- Debt Payment Logic ---
const showPayDebtModal = ref(false)
const selectedCustomerForDebt = ref<any>(null)
const payDebtAmount = ref<number | string>('')
const payDebtMethod = ref('Nəğd')
const payDebtNotes = ref('')
const debtHistory = ref<any[]>([])
const loadingHistory = ref(false)
const loadingMoreHistory = ref(false)
const payingDebt = ref(false)
const currentHistoryPage = ref(1)
const hasMoreHistory = ref(true)
const historyLimit = 10

const handlePayDebt = async (customer: any) => {
  selectedCustomerForDebt.value = customer
  payDebtAmount.value = ''
  // Set default payment method if available
  if (availablePaymentMethods.value.length > 0) {
    payDebtMethod.value = availablePaymentMethods.value[0]?.value || 'Nəğd'
  } else {
    payDebtMethod.value = 'Nəğd'
  }
  payDebtNotes.value = ''
  showPayDebtModal.value = true
  
  // Reset pagination
  currentHistoryPage.value = 1
  hasMoreHistory.value = true
  debtHistory.value = []
  
  // Fetch initial history
  loadingHistory.value = true
  try {
    const url = `/api/customers/${customer.id}/debt-history`
    const apiFetch = $api as any
    const history = await apiFetch(url, {
      params: { page: currentHistoryPage.value, limit: historyLimit }
    })
    debtHistory.value = history as any[]
    if (debtHistory.value.length < historyLimit) {
      hasMoreHistory.value = false
    }
  } catch (err) {
    console.error('Fetch history error:', err)
  } finally {
    loadingHistory.value = false
  }
}

const loadMoreHistory = async () => {
  if (loadingMoreHistory.value || !hasMoreHistory.value || !selectedCustomerForDebt.value) return
  
  loadingMoreHistory.value = true
  currentHistoryPage.value++
  
  try {
    const url = `/api/customers/${selectedCustomerForDebt.value.id}/debt-history`
    const apiFetch = $api as any
    const nextBatch = await apiFetch(url, {
      params: { page: currentHistoryPage.value, limit: historyLimit }
    }) as any[]
    
    if (nextBatch.length < historyLimit) {
      hasMoreHistory.value = false
    }
    
    debtHistory.value = [...debtHistory.value, ...nextBatch]
  } catch (err) {
    console.error('Load more error:', err)
    currentHistoryPage.value--
  } finally {
    loadingMoreHistory.value = false
  }
}

const submitPayDebt = async () => {
  if (!selectedCustomerForDebt.value || !payDebtAmount.value || Number(payDebtAmount.value) <= 0) {
    toast.error(t('common.fieldRequired', 'Məbləğ daxil edilmelidir'))
    return
  }

  const { user } = useAuth()
  payingDebt.value = true
  
  try {
    const url = `/api/customers/${selectedCustomerForDebt.value.id}/pay-debt`
    const apiFetch = $api as any
    const result = await apiFetch(url, {
      method: 'POST',
      body: {
        amount: Number(payDebtAmount.value),
        paymentMethod: payDebtMethod.value,
        cashierId: user.value?.id,
        cashierName: `${user.value?.firstName || ''} ${user.value?.lastName || ''}`.trim(),
        notes: payDebtNotes.value
      }
    }) as any

    toast.success(t('orders.debtPaid', 'Borc uğurla ödənildi'))
    
    // Print receipt
    printDebtPaymentReceipt({
      receiptNo: result.payment.receiptNo,
      counterpartyName: result.payment.customerName,
      amount: result.payment.amount,
      paymentMethod: result.payment.paymentMethod,
      paidBy: result.payment.cashierName,
      notes: result.payment.notes,
      date: new Date(result.payment.createdAt).toLocaleString('az-AZ'),
      remainingBalance: result.customer.debt,
      isCustomer: true
    })

    // Update local list
    const idx = mockData.value.findIndex(c => c.id === result.customer.id)
    if (idx !== -1) {
      mockData.value[idx].debt = result.customer.debt
    }

    showPayDebtModal.value = false
    loadCustomers()
  } catch (err: any) {
    toast.error(err.statusMessage || t('toast.operationFailed'))
  } finally {
    payingDebt.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('customers.title', 'Müştərilər') }}
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      :title="t('customers.title', 'Müştərilər')"
      :data="mockData" 
      :columns="columns"
      :selectable="true"
      :actions="true"
      :custom-search="customSearch"
      @add="handleAdd"
      @edit="handleEdit"
      @delete="handleDelete"
      @bulk-delete="handleBulkDelete"
      @bulk-edit="handleBulkEdit"
      @duplicate="handleDuplicate"
    >
      <!-- Contact links with Highlighting -->
      <template #cell-email="{ value, highlight }">
        <a 
          v-if="value" 
          :href="`mailto:${value}`" 
          class="text-[var(--text-app)] hover:text-blue-500 hover:underline transition-colors" 
          @click.stop
          v-html="highlight(value)"
        ></a>
        <span v-else>-</span>
      </template>

      <template #cell-phone="{ value, highlight }">
        <a 
          v-if="value" 
          :href="`https://wa.me/${String(value).replace(/[^0-9]/g, '')}`" 
          target="_blank"
          class="text-[var(--text-app)] hover:text-green-500 hover:underline transition-colors" 
          @click.stop
          v-html="highlight(value)"
        ></a>
        <span v-else>-</span>
      </template>

      <!-- Bonus Custom Format with Highlight -->
      <template #cell-bonus="{ value, highlight }">
        <span 
          class="font-medium text-[var(--color-brand-success)]"
          v-html="highlight(Number(value || 0).toFixed(2)) + ' ₼'"
        >
        </span>
      </template>
      
      <!-- Debt Custom Format with Highlight -->
      <template #cell-debt="{ value, row, highlight }">
        <span 
          class="font-medium cursor-pointer hover:underline decoration-dotted transition-all"
          :class="Number(value || 0) > 0 ? 'text-[var(--color-brand-danger)]' : 'text-[var(--text-app)]'"
          @click.stop="handlePayDebt(row)"
          v-html="highlight(Number(value || 0).toFixed(2)) + ' ₼'"
        >
        </span>
      </template>

      <!-- Customizing the Barcode column - Mono font + Copy to Click -->
      <template #cell-barcode="{ value, highlight }">
        <div 
          class="font-mono tracking-wider font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors inline-block"
          @click.stop="copyBarcode(value)"
          :title="t('common.clickToCopy', 'Kopyalamaq üçün kliklə')"
        >
          <span v-html="highlight(value)"></span>
        </div>
      </template>

      <!-- Customizing the Gender column using slots with Highlight support -->
      <template #cell-gender="{ value, highlight }">
        <span v-html="highlight(value === 'Kişi' ? t('customers.male', 'Kişi') : value === 'Qadın' ? t('customers.female', 'Qadın') : value)"></span>
      </template>
      
      <!-- Customizing the City column (Tags) using slots -->
      <template #cell-city="{ value, highlight }">
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

    <!-- Modal: Add / Edit -->
    <Modal v-model="showAddModal" :title="t('customers.addNew', 'Yeni Müştəri Əlavə Et')" max-width="3xl">
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

    <!-- Modal: Edit specific -->
    <Modal 
      v-model="showEditModal" 
      :title="bulkSelectedIds.length > 0 ? t('common.bulkEdit', 'Toplu Redaktə') : t('customers.edit', 'Müştərini Redaktə Et')" 
      max-width="3xl"
      @update:model-value="(val) => { if (!val) bulkSelectedIds = [] }"
    >
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        {{ t('employees.bulkEditWarning', { count: bulkSelectedIds.length, default: `Diqqət: Seçilmiş ${bulkSelectedIds.length} qeydin üzərinə yazılacaq.` }) }}
      </div>

      <!-- We omit barcode in bulk edit to avoid conflicts (they should be unique) -->
      <DynamicForm 
        :fields="showEditModal && bulkSelectedIds.length > 0 ? formFields.filter(f => f.key !== 'barcode') : formFields"
        v-model="formData" 
        :errors="formErrors"
        :grid-cols="2"
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
            {{ t('customers.bulkDeleteCount', { count: deleteTarget.ids?.length, default: `${deleteTarget.ids?.length} müştəri silinəcək` }) }}
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

    <!-- Borc Ödəniş Modalı -->
    <Modal v-model="showPayDebtModal" :title="t('orders.payDebtTitle', 'Borcun Ödənilməsi')" max-width="2xl">
      <div v-if="selectedCustomerForDebt" class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 rounded-2xl bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 text-center">
            <span class="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1">{{ t('customers.firstName') }} {{ t('customers.lastName') }}</span>
            <span class="text-sm font-black">{{ selectedCustomerForDebt.firstName }} {{ selectedCustomerForDebt.lastName }}</span>
          </div>
          <div class="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/15 text-center">
            <span class="text-[10px] font-black opacity-50 uppercase tracking-widest block mb-1">{{ t('orders.remainingDebt', 'Qalıq Borc') }}</span>
            <span class="text-xl font-black text-rose-600 font-mono">{{ Number(selectedCustomerForDebt.debt || 0).toFixed(2) }} ₼</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 items-end">
          <UiInput 
            v-model="payDebtAmount" 
            type="number" 
            :label="t('orders.paymentAmount', 'Ödəniş Məbləği')" 
            placeholder="0.00"
            icon="lucide:banknote"
          />
          <div class="space-y-1.5">
            <label class="text-[13px] font-bold opacity-50 ml-1">{{ t('sales.paymentMethod', 'Ödəniş Üsulu') }}</label>
            <UiSelect 
              v-model="payDebtMethod" 
              :options="availablePaymentMethods"
              icon="lucide:credit-card"
            />
          </div>
        </div>

        <div>
          <h3 class="text-xs font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
            <UiIcon name="lucide:history" class="w-3 h-3" />
            {{ t('orders.paymentHistory', 'Ödəniş Tarixçəsi') }}
          </h3>
          <div class="max-h-[200px] overflow-y-auto rounded-xl border border-[var(--border-app)] divide-y divide-[var(--border-app)]">
            <template v-if="loadingHistory">
              <div class="p-8 text-center opacity-40 italic text-sm">{{ t('common.loading', 'Yüklənir...') }}</div>
            </template>
            <template v-else-if="debtHistory.length === 0">
              <div class="p-8 text-center opacity-40 italic text-sm">{{ t('orders.noData', 'Məlumat yoxdur') }}</div>
            </template>
            <div v-for="item in debtHistory" :key="item.id" class="p-3 flex items-center justify-between hover:bg-[var(--text-primary)]/[0.02]">
              <div>
                <div class="text-sm font-black">{{ Number(item.amount).toFixed(2) }} ₼</div>
                <div class="text-[10px] opacity-40">{{ new Date(item.createdAt).toLocaleString('az-AZ') }} • {{ item.paymentMethod }}</div>
              </div>
              <div class="text-[10px] font-mono opacity-60 bg-[var(--input-bg)] px-2 py-1 rounded-lg">
                {{ item.receiptNo }}
              </div>
            </div>
          </div>
          <div v-if="hasMoreHistory && !loadingHistory" class="mt-4 text-center">
            <UiButton 
              variant="ghost" 
              size="sm" 
              class="w-full !py-2 text-xs opacity-60 hover:opacity-100" 
              :loading="loadingMoreHistory"
              @click="loadMoreHistory"
            >
              {{ t('customers.showMore', 'Daha çox göstər') }}
            </UiButton>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showPayDebtModal = false">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" :loading="payingDebt" @click="submitPayDebt">{{ t('orders.confirmPayment', 'Təsdiqlə') }}</UiButton>
      </template>
    </Modal>
  </div>
</template>
