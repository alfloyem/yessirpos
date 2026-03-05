<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()

useHead({
  title: t('menu.employees')
})

// --- Helper for Username Generation ---
const normalizeForUsername = (text: string) => {
  if (!text) return ''
  return String(text)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, "") // remove spaces and special characters
}

const generateUsername = (first?: string, last?: string, currentId?: any) => {
  const f = normalizeForUsername(first || '')
  const l = normalizeForUsername(last || '')
  
  let base = ''
  if (f && l) base = `${f}_${l}`
  else if (f) base = f
  else if (l) base = l
  
  if (!base) return ''

  let finalUsername = base
  let counter = 1
  
  // mockData içindeki mevcut usernameleri kontrol et
  while (mockData.value.some(m => m.username === finalUsername && m.id !== currentId)) {
    counter++
    finalUsername = `${base}${counter}`
  }

  return finalUsername
}

const duplicateUsername = (existing: string) => {
  const base = existing.replace(/\d+$/, '') || existing
  let finalUsername = existing
  let counter = 2
  
  while (mockData.value.some(m => m.username === finalUsername)) {
    finalUsername = `${base}${counter}`
    counter++
  }
  
  return finalUsername
}

// --- Centralized Schema ---
const employeeSchema = computed< (FormField & { inTable?: boolean, sortable?: boolean })[] >(() => [
  { key: 'firstName', label: t('employees.firstName', 'Ad'), type: 'text', inTable: true, sortable: true, required: true, colSpan: 1 },
  { key: 'lastName', label: t('employees.lastName', 'Soyad'), type: 'text', inTable: true, sortable: true, required: true, colSpan: 1 },
  { key: 'username', label: t('employees.username', 'İstifadəçi adı'), icon: 'lucide:user', type: 'text', inTable: true, sortable: true, required: true, colSpan: 2 },
  { key: 'phone', label: t('employees.phone', 'Telefon'), icon: 'lucide:phone', type: 'tel', inTable: true, sortable: true, colSpan: 1 },
  { key: 'email', label: t('employees.email', 'E-poçt (Email)'), icon: 'lucide:mail', type: 'email', inTable: true, sortable: true, colSpan: 1 },
  { key: 'gender', label: t('employees.gender', 'Cinsiyyət'), type: 'select', inTable: true, sortable: true, options: [
    { label: t('employees.male', 'Kişi'), value: 'Kişi' },
    { label: t('employees.female', 'Qadın'), value: 'Qadın' }
  ], colSpan: 1 },
  { key: 'status', label: t('employees.status', 'Durum'), type: 'select', inTable: true, sortable: true, options: [
    { label: t('employees.statusActive', 'Aktif'), value: 'Aktif' },
    { label: t('employees.statusPassive', 'Pasif'), value: 'Pasif' },
    { label: t('employees.statusOnLeave', 'İzinde'), value: 'İzinde' }
  ], colSpan: 1 },
  { key: 'password', label: t('employees.password', 'Şifrə'), icon: 'lucide:lock', type: 'password', inTable: false, required: true, colSpan: 1 },
  { key: 'notes', label: t('employees.notes', 'Xüsusi qeyd'), type: 'textarea', colSpan: 2, inTable: false },
])

// Extract table columns dynamically
const columns = computed(() => 
  employeeSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// The fields structure for DynamicForm - şifre edit modunda opsiyonel
const formFields = computed(() => {
  return employeeSchema.value.map(field => {
    // Edit modunda şifre opsiyonel yap
    if (field.key === 'password' && showEditModal.value && !bulkSelectedIds.value.length) {
      return { ...field, required: false }
    }
    return field
  })
})

// --- Data ---
const mockData = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Verileri yükle
const loadEmployees = async () => {
  loading.value = true
  error.value = null
  const toast = useToast()
  
  try {
    const data = await $fetch('/api/employees')
    mockData.value = data as any[]
  } catch (err: any) {
    const errorMsg = err.message || t('toast.loadingError')
    error.value = errorMsg
    toast.error(errorMsg)
    console.error('Load employees error:', err)
  } finally {
    loading.value = false
  }
}

// Sayfa yüklendiğinde verileri çek
onMounted(() => {
  loadEmployees()
})

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteTarget = ref<{ type: 'single' | 'bulk', id?: any, ids?: any[] } | null>(null)
const formData = ref<Record<string, any>>({})
const formErrors = ref<Record<string, string>>({})
const bulkSelectedIds = ref<any[]>([])

// --- Auto-Username Logic ---
const isUsernameManuallyEdited = ref(false)
const lastGeneratedUsername = ref('')

watch(() => [formData.value.firstName, formData.value.lastName], ([newFirst, newLast]) => {
  // Sadece ekleme ekranında veya manuel olarak el ile ellenmemişse (veya silinip geri alınmışsa) otomatik doldur
  if (showAddModal.value && !isUsernameManuallyEdited.value) {
    const generated = generateUsername(newFirst, newLast, formData.value.id)
    formData.value.username = generated
    lastGeneratedUsername.value = generated
  }
})

watch(() => formData.value.username, (newVal) => {
  if (showAddModal.value && newVal !== lastGeneratedUsername.value) {
    if (newVal) {
      // Kullanıcı kendisi üzerine bir şey yazmış, otomatik oluşturmayı durdur
      isUsernameManuallyEdited.value = true
    } else {
      // Kullanıcı tamamen silmiş, tekrar otomatik formata çevirme izni ver
      isUsernameManuallyEdited.value = false
      const generated = generateUsername(formData.value.firstName, formData.value.lastName, formData.value.id)
      formData.value.username = generated
      lastGeneratedUsername.value = generated
    }
  }
})


// --- Handlers ---
const handleAdd = () => {
  formData.value = {} // Empty form
  formErrors.value = {}
  isUsernameManuallyEdited.value = false
  lastGeneratedUsername.value = ''
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row } // Pre-fill form
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
      await $fetch(`/api/employees/${deleteTarget.value.id}`, { method: 'DELETE' })
      toast.success(t('toast.employeeDeleted'))
    } else if (deleteTarget.value.type === 'bulk') {
      const count = deleteTarget.value.ids?.length || 0
      await $fetch('/api/employees/bulk-delete', {
        method: 'POST',
        body: { ids: deleteTarget.value.ids }
      })
      toast.success(t('toast.employeesDeleted', { count }))
    }
    
    // Verileri yeniden yükle
    await loadEmployees()
    showDeleteConfirmModal.value = false
    deleteTarget.value = null
  } catch (err: any) {
    const errorMsg = err.message || t('toast.operationFailed')
    toast.error(errorMsg)
    console.error('Delete error:', err)
  } finally {
    loading.value = false
  }
}

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  formData.value = {} // Reset it
  formErrors.value = {}
  showEditModal.value = true
}

// Custom search function for i18n support
const customSearch = (item: any, query: string) => {
  const normalizeText = (text: any) => {
    if (text === null || text === undefined) return ''
    return String(text)
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
  }

  const q = normalizeText(query)
  
  // Search in all fields
  const searchableFields = [
    item.firstName,
    item.lastName,
    item.username,
    item.email,
    item.phone,
    item.notes,
    // Translated gender
    item.gender === 'Kişi' ? t('employees.male') : item.gender === 'Qadın' ? t('employees.female') : item.gender,
    // Translated status
    item.status === 'Aktif' ? t('employees.statusActive') : item.status === 'Pasif' ? t('employees.statusPassive') : item.status === 'İzində' ? t('employees.statusOnLeave') : item.status
  ]
  
  return searchableFields.some(field => normalizeText(field).includes(q))
}

const handleDuplicate = async (row: any) => {
  loading.value = true
  const toast = useToast()
  
  try {
    const newUsername = duplicateUsername(row.username)
    
    // Yeni çalışan oluştur (şifre varsayılan olarak "12345678" olsun)
    await $fetch('/api/employees', {
      method: 'POST',
      body: {
        ...row,
        id: undefined, // ID'yi kaldır
        username: newUsername,
        password: '12345678' // Varsayılan şifre
      }
    })
    
    toast.success(t('toast.employeeDuplicated'))
    
    // Verileri yeniden yükle
    await loadEmployees()
  } catch (err: any) {
    const errorMsg = err.message || t('toast.operationFailed')
    toast.error(errorMsg)
    console.error('Duplicate error:', err)
  } finally {
    loading.value = false
  }
}

const saveForm = async () => {
  formErrors.value = {}
  let hasError = false
  
  // Validation
  const isBulkEditMode = showEditModal.value && bulkSelectedIds.value.length > 0
  const isEditMode = showEditModal.value && !isBulkEditMode
  const activeFields = isBulkEditMode
    ? formFields.value.filter(f => !f.key.includes('password'))
    : formFields.value

  for (const field of activeFields) {
    if (field.required && !formData.value[field.key]) {
      // Allow empty required fields in bulk edit, meaning "don't update"
      if (!isBulkEditMode) {
        formErrors.value[field.key] = t('common.fieldRequired', 'Bu xana mütləq doldurulmalıdır')
        hasError = true
      }
    }
  }

  // Şifre validasyonu
  if (!isBulkEditMode) {
    // Add modunda şifre zorunlu
    if (showAddModal.value && !formData.value.password) {
      formErrors.value.password = t('common.fieldRequired', 'Bu xana mütləq doldurulmalıdır')
      hasError = true
    }
    
    // Şifre girilmişse minimum uzunluk kontrolü
    if (formData.value.password && formData.value.password.length < 8) {
      formErrors.value.password = t('common.passwordsMinLength', { count: 8 })
      hasError = true
    }
    
    // Şifre onayı kontrolü (sadece şifre girilmişse)
    if (formData.value.password && formData.value.password !== formData.value.passwordConfirm) {
      hasError = true
    }
  }

  if (hasError) return

  loading.value = true
  const toast = useToast()
  const { token, logout } = useAuth()
  
  try {
    const headers = { Authorization: `Bearer ${token.value}` }
    
    if (showAddModal.value) {
      // Yeni çalışan ekle
      await $fetch('/api/employees', {
        method: 'POST',
        body: formData.value,
        headers
      })
      toast.success(t('toast.employeeAdded'))
      showAddModal.value = false
    } else if (showEditModal.value) {
      if (bulkSelectedIds.value.length > 0) {
        // Toplu güncelleme
        const updates = Object.fromEntries(
          Object.entries(formData.value).filter(([_, v]) => v !== undefined && v !== '')
        )
        await $fetch('/api/employees/bulk-update', {
          method: 'POST',
          body: { ids: bulkSelectedIds.value, updates },
          headers
        })
        toast.success(t('toast.employeesUpdated', { count: bulkSelectedIds.value.length }))
        bulkSelectedIds.value = []
      } else {
        // Tekli güncelleme
        await $fetch(`/api/employees/${formData.value.id}`, {
          method: 'PUT',
          body: formData.value,
          headers
        })
        toast.success(t('toast.employeeUpdated'))
      }
      showEditModal.value = false
    }
    
    // Verileri yeniden yükle
    await loadEmployees()
  } catch (err: any) {
    const errorMsg = err.data?.statusMessage || err.message || t('toast.operationFailed')
    toast.error(errorMsg)
    console.error('Save error:', err)
    
    // 401 hatası alırsak logout yap
    if (err.statusCode === 401) {
      logout()
    }
    
    // Hata mesajını form hatalarına ekle
    if (err.data?.statusMessage?.includes('kullanıcı adı') || err.data?.statusMessage?.includes('username')) {
      formErrors.value.username = err.data.statusMessage
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('menu.employees') }}
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      :title="t('menu.employees', 'Personel_Listesi')"
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

      <!-- Customizing the Gender column using slots with Highlight support -->
      <template #cell-gender="{ value, highlight }">
        <span v-html="highlight(value === 'Kişi' ? t('employees.male', 'Kişi') : value === 'Qadın' ? t('employees.female', 'Qadın') : value)"></span>
      </template>

      <!-- Customizing the Status column using slots with Highlight support -->
      <template #cell-status="{ value, highlight }">
        <span 
          class="px-2 py-1 text-xs font-bold rounded-full"
          :class="{
            'bg-[var(--color-brand-success)]/10 text-[var(--color-brand-success)]': value === 'Aktif',
            'bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)]': value === 'Pasif',
            'bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)]': value === 'İzinde'
          }"
          v-html="highlight(value === 'Aktif' ? t('employees.statusActive', 'Aktif') : value === 'Pasif' ? t('employees.statusPassive', 'Pasif') : t('employees.statusOnLeave', 'İzinde'))"
        >
        </span>
      </template>
    </DataTable>

    <!-- Modal: Add / Edit -->
    <Modal v-model="showAddModal" :title="t('employees.addNew', 'Yeni Personel Ekle')" max-width="xl">
      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
        :errors="formErrors"
      />
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false" class="!px-6">{{ t('common.cancel', 'İptal') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.save', 'Kaydet') }}</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit specific -->
    <Modal 
      v-model="showEditModal" 
      :title="bulkSelectedIds.length > 0 ? t('employees.bulkEdit', 'Toplu Düzenleme') : t('employees.edit', 'Personeli Düzenle')" 
      max-width="xl"
      @update:model-value="(val) => { if (!val) bulkSelectedIds = [] }"
    >
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        {{ t('employees.bulkEditWarning', { count: bulkSelectedIds.length }) }}
      </div>

      <!-- We omit password from edit/bulk-edit via computed or in-template filtering to make it more realistic -->
      <DynamicForm 
        :fields="showEditModal && bulkSelectedIds.length > 0 ? formFields.filter(f => !f.key.includes('password')) : formFields"
        v-model="formData" 
        :errors="formErrors"
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []" class="!px-6">{{ t('common.cancel', 'İptal') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.update', 'Güncelle') }}</UiButton>
      </template>
    </Modal>

    <!-- Silmə Təsdiq Modalı -->
    <Modal v-model="showDeleteConfirmModal" :title="t('employees.confirmDelete', 'Silmək istədiyinizə əminsiniz?')" max-width="sm">
      <div class="py-2">
        <p class="text-[var(--text-app)] opacity-80 text-[15px] leading-relaxed">
          {{ t('common.cannotBeUndone', 'Bu əməliyyat geri qaytarıla bilməz.') }}
          <span v-if="deleteTarget?.type === 'bulk'" class="font-bold text-[var(--color-brand-danger)] block mt-2">
            {{ t('employees.bulkDeleteCount', { count: deleteTarget.ids?.length }) }}
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
