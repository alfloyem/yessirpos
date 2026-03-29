<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '#i18n'
import { formatWhatsAppLink } from '~/utils/format'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import { useHead, useToast, useAuth } from '#imports'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()
const toast = useToast()
const { $api } = useNuxtApp()

useHead({
  title: t('suppliers.title', 'Tədarükçülər')
})

// --- Centralized Schema ---
const supplierSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { key: 'rowNumber', label: t('common.rowNumber', 'Sıra sayı'), type: 'text', inTable: true, sortable: false },
  { key: 'brandName', label: t('suppliers.brandName', 'Brendin adı'), icon: 'lucide:tag', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'companyName', label: t('suppliers.companyName', 'Şirkətin adı'), icon: 'lucide:building-2', type: 'tags', inTable: true, sortable: true, required: true, historyKey: 'company_names' },
  { key: 'firstName', label: t('employees.firstName', 'Ad'), type: 'text', inTable: true, sortable: true },
  { key: 'lastName', label: t('employees.lastName', 'Soyad'), type: 'text', inTable: true, sortable: true },
  { key: 'email', label: t('employees.email', 'E-poçt'), icon: 'lucide:mail', type: 'email', inTable: true, sortable: true },
  { key: 'phone', label: t('employees.phone', 'Telefon'), icon: 'lucide:phone', type: 'tel', inTable: true, sortable: true },
  { key: 'voen', label: t('suppliers.voen', 'VÖEN'), icon: 'lucide:file-text', type: 'tags', inTable: true, sortable: true, historyKey: 'voen_numbers' },
  { key: 'address', label: t('customers.address', 'Ünvan'), icon: 'lucide:map-pin', type: 'text', colSpan: 2, inTable: false },
  { key: 'city', label: t('customers.city', 'Şəhər/rayon'), type: 'tags', inTable: false, sortable: true, historyKey: 'cities' },
  { key: 'country', label: t('customers.country', 'Ölkə'), icon: 'lucide:globe', type: 'select', inTable: false, isCountry: true },
  { key: 'notes', label: t('employees.notes', 'Xüsusi qeyd'), type: 'textarea', colSpan: 2, inTable: false },
  { key: 'createdAt', label: t('customers.createdAt', 'Tarix'), type: 'text', inTable: false, sortable: true },
  { key: 'createdBy', label: t('customers.createdBy', 'Əməkdaş'), type: 'text', inTable: false, sortable: true },
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
const mockData = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const loadSuppliers = async () => {
  loading.value = true
  error.value = null
  
  try {
    const data = await $api('/api/suppliers')
    mockData.value = (data as any[]).map((d, index) => ({
      ...d,
      rowNumber: index + 1,
      companyName: d.companyName ? (d.companyName.startsWith('[') ? JSON.parse(d.companyName) : [d.companyName]) : [],
      voen: d.voen ? (d.voen.startsWith('[') ? JSON.parse(d.voen) : [d.voen]) : [],
      city: d.city ? (d.city.startsWith('[') ? JSON.parse(d.city) : [d.city]) : [],
      _date: new Date(d.createdAt),
      createdAt: new Date(d.createdAt).toLocaleString('tr-TR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    }))
  } catch (err: any) {
    const errorMsg = err.message || t('toast.loadingError', 'Məlumatlar yüklənərkən xəta baş verdi')
    error.value = errorMsg
    toast.error(errorMsg)
    console.error('Load suppliers error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSuppliers()
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
    companyName: [],
    voen: [],
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

const performDelete = async () => {
  if (!deleteTarget.value) return

  loading.value = true
  
  try {
    if (deleteTarget.value.type === 'single') {
      await $api(`/api/suppliers/${deleteTarget.value.id}`, { method: 'DELETE' })
      toast.success(t('toast.supplierDeleted', 'Tədarükçü uğurla silindi'))
    } else if (deleteTarget.value.type === 'bulk') {
      const count = deleteTarget.value.ids?.length || 0
      await $api('/api/suppliers/bulk-delete', {
        method: 'POST',
        body: { ids: deleteTarget.value.ids }
      })
      toast.success(t('toast.suppliersDeleted', { count, default: `${count} tədarükçü uğurla silindi` }))
    }
    
    await loadSuppliers()
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

const handleDuplicate = async (row: any) => {
  loading.value = true
  const { token, logout } = useAuth()
  
  try {
    // Find the highest number for this brand name
    const baseBrandName = row.brandName.replace(/\s*\(\d+\)$/, '')
    const existingNumbers = mockData.value
      .filter(item => item.brandName.startsWith(baseBrandName))
      .map(item => {
        const match = item.brandName.match(/\((\d+)\)$/)
        return match ? parseInt(match[1]) : 0
      })
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 2
    
    let newDate = new Date()
    if (row._date) {
      newDate = new Date(row._date.getTime() + 1000)
    }
    
    await $api('/api/suppliers', {
      method: 'POST',
      body: {
        ...row,
        id: undefined,
        brandName: `${baseBrandName} (${nextNumber})`,
        voen: [], // VÖEN must be unique
        createdAt: newDate.toISOString()
      }
    })
    
    toast.success(t('toast.supplierDuplicated', 'Tədarükçü kopyalandı'))
    
    await loadSuppliers()
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
    item.brandName,
    item.firstName,
    item.lastName,
    item.email,
    item.phone,
    item.address,
    item.notes,
    item.createdBy,
    // Company Name (tags array)
    Array.isArray(item.companyName) ? item.companyName.join(' ') : item.companyName,
    // VÖEN (tags array)
    Array.isArray(item.voen) ? item.voen.join(' ') : item.voen,
    // City (tags array)
    Array.isArray(item.city) ? item.city.join(' ') : item.city
  ]
  
  return searchableFields.some(field => normalizeText(field).includes(q))
}

const saveForm = async () => {
  formErrors.value = {}
  let hasError = false
  
  const isBulkEditMode = showEditModal.value && bulkSelectedIds.value.length > 0
  const activeFields = isBulkEditMode
    ? formFields.value.filter(f => f.key !== 'voen')
    : formFields.value

  for (const field of activeFields) {
    if (field.required && !formData.value[field.key]) {
      if (!isBulkEditMode) {
        formErrors.value[field.key] = t('common.fieldRequired', 'Bu xana mütləq doldurulmalıdır')
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
      // Create new supplier
      await $api('/api/suppliers', {
        method: 'POST',
        body: formData.value
      })
      toast.success(t('toast.supplierAdded', 'Tədarükçü uğurla əlavə edildi'))
      showAddModal.value = false
    } else if (showEditModal.value) {
      if (bulkSelectedIds.value.length > 0) {
        // Bulk update
        const updates = Object.fromEntries(
          Object.entries(formData.value).filter(([_, v]) => v !== undefined && v !== '')
        )
        await $api('/api/suppliers/bulk-update', {
          method: 'POST',
          body: { ids: bulkSelectedIds.value, updates }
        })
        toast.success(t('toast.suppliersUpdated', { count: bulkSelectedIds.value.length, default: `${bulkSelectedIds.value.length} tədarükçü yeniləndi` }))
        bulkSelectedIds.value = []
      } else {
        // Single update
        await $api(`/api/suppliers/${formData.value.id}`, {
          method: 'PUT',
          body: formData.value
        })
        toast.success(t('toast.supplierUpdated', 'Tədarükçü uğurla yeniləndi'))
      }
      showEditModal.value = false
    }
    
    await loadSuppliers()
  } catch (err: any) {
    const errorMsg = err.data?.statusMessage || err.message || t('toast.operationFailed', 'Əməliyyat zamanı xəta baş verdi')
    toast.error(errorMsg)
    console.error('Save error:', err)
    
    if (err.statusCode === 401) {
      logout()
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6 font-sans">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('suppliers.title', 'Tədarükçülər') }}
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      :title="t('suppliers.title', 'Tədarükçülər')"
      :data="mockData" 
      :columns="columns"
      :loading="loading"
      :selectable="true"
      :actions="true"
      :custom-search="customSearch"
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
      <template #cell-companyName="{ value, highlight }">
        <span class="font-medium text-[var(--text-app)]" v-html="highlight(Array.isArray(value) ? value[0] : value)">
        </span>
      </template>

      <!-- Brand Name Custom Format -->
      <template #cell-brandName="{ value, highlight }">
        <span class="font-semibold text-[var(--text-primary)]" v-html="highlight(value)">
        </span>
      </template>

      <!-- VÖEN Custom Format -->
      <template #cell-voen="{ value, highlight }">
        <span class="font-mono text-sm text-[var(--text-app)]" v-html="highlight(Array.isArray(value) ? value[0] : value)">
        </span>
      </template>

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
          :href="formatWhatsAppLink(value)" 
          target="_blank"
          class="text-[var(--text-app)] hover:text-green-500 hover:underline transition-colors" 
          @click.stop
          v-html="highlight(value)"
        ></a>
        <span v-else>-</span>
      </template>
    </DataTable>

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" :title="t('suppliers.addNew', 'Yeni Tədarükçü Əlavə Et')" max-width="3xl">
      <DynamicForm 
        :fields="formFields"
        v-model="formData"
        :errors="formErrors"
      />
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.save', 'Yadda saxla') }}</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal 
      v-model="showEditModal" 
      :title="bulkSelectedIds.length > 0 ? t('common.bulkEdit', 'Toplu Redaktə') : t('suppliers.edit', 'Tədarükçünü Redaktə Et')" 
      max-width="3xl"
      @update:model-value="(val) => { if (!val) bulkSelectedIds = [] }"
    >
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        {{ t('employees.bulkEditWarning', { count: bulkSelectedIds.length, default: `Diqqət: Seçilmiş ${bulkSelectedIds.length} qeydin üzərinə yazılacaq.` }) }}
      </div>

      <!-- We omit voen in bulk edit to avoid conflicts (they should be unique) -->
      <DynamicForm 
        :fields="showEditModal && bulkSelectedIds.length > 0 ? formFields.filter(f => f.key !== 'voen') : formFields"
        v-model="formData"
        :errors="formErrors"
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.update', 'Yenilə') }}</UiButton>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteConfirmModal" :title="t('common.confirmDelete', 'Silmək istədiyinizə əminsiniz?')" max-width="sm">
      <div class="py-2">
        <p class="text-[var(--text-app)] opacity-80 text-[15px] leading-relaxed">
          {{ t('common.cannotBeUndone', 'Bu əməliyyat geri qaytarıla bilməz.') }}
          <span v-if="deleteTarget?.type === 'bulk'" class="font-bold text-[var(--color-brand-danger)] block mt-2">
            {{ t('suppliers.bulkDeleteCount', { count: deleteTarget.ids?.length, default: `${deleteTarget.ids?.length} tədarükçü silinəcək` }) }}
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
