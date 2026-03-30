<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useHead, useToast, useAuth, useNuxtApp } from '#imports'
import { useI18n } from '#i18n'
import { formatWhatsAppLink } from '~/utils/format'
import { openExternalUrl } from '~/utils/tauri'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'
import { menuItems } from '~/utils/menu'

const { t } = useI18n()
const toast = useToast()
const { $api } = useNuxtApp()

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
  { key: 'role', label: t('employees.role', 'Vəzifə'), type: 'tags', historyKey: 'employee_roles', inTable: true, sortable: true, colSpan: 2 },
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
const mockData = useState<any[]>('employees_mockdata', () => [])
const loading = ref(false)
const error = ref<string | null>(null)

// Verileri yükle
const loadEmployees = async () => {
  if (mockData.value.length === 0) loading.value = true
  error.value = null
  
  try {
    const data = await $api('/api/employees')
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

onMounted(() => {
  loadEmployees()
})

// --- Permissions Logic ---
const showPermissionsModal = ref(false)
const togglePermission = (path: string) => {
  const current = formData.value.notAllowed || []
  if (current.includes(path)) {
    formData.value.notAllowed = current.filter((p: string) => p !== path)
  } else {
    formData.value.notAllowed = [...current, path]
  }
}

const isPermissionRestricted = (path: string) => {
  return (formData.value.notAllowed || []).includes(path)
}

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
  
  try {
    if (deleteTarget.value.type === 'single') {
      await $api(`/api/employees/${deleteTarget.value.id}`, { method: 'DELETE' })
      toast.success(t('toast.employeeDeleted'))
    } else if (deleteTarget.value.type === 'bulk') {
      const count = deleteTarget.value.ids?.length || 0
      await $api('/api/employees/bulk-delete', {
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
    // Role (tags array)
    Array.isArray(item.role) ? item.role.join(' ') : item.role,
    // Translated gender
    item.gender === 'Kişi' ? t('employees.male') : item.gender === 'Qadın' ? t('employees.female') : item.gender,
    // Translated status
    item.status === 'Aktif' ? t('employees.statusActive') : item.status === 'Pasif' ? t('employees.statusPassive') : item.status === 'İzində' ? t('employees.statusOnLeave') : item.status
  ]
  
  return searchableFields.some(field => normalizeText(field).includes(q))
}

const handleDuplicate = async (row: any) => {
  loading.value = true
  
  try {
    const newUsername = duplicateUsername(row.username)
    
    // Yeni çalışan oluştur (şifre varsayılan olarak "12345678" olsun)
    await $api('/api/employees', {
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
  const { token, logout } = useAuth()
  
  try {
    const headers = { Authorization: `Bearer ${token.value}` }
    
    if (showAddModal.value) {
      // Yeni çalışan ekle
      await $api('/api/employees', {
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
        await $api('/api/employees/bulk-update', {
          method: 'POST',
          body: { ids: bulkSelectedIds.value, updates },
          headers
        })
        toast.success(t('toast.employeesUpdated', { count: bulkSelectedIds.value.length }))
        bulkSelectedIds.value = []
      } else {
        // Tekli güncelleme
        await $api(`/api/employees/${formData.value.id}`, {
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
  <div class="space-y-6 font-sans">
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
      <!-- Context Menu Slot for Specialized Actions -->
      <template #context-menu="{ row }">
        <button 
          @click="formData = { ...row }; showPermissionsModal = true" 
          class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] transition-all group"
        >
          <Icon name="lucide:shield-off" class="!w-5 !h-5 opacity-50 group-hover:opacity-100" />
          <span>{{ t('employees.managePermissions', 'İcazələri idarə et') }}</span>
        </button>
      </template>
      <!-- Contact links with Highlighting -->
      <template #cell-email="{ value, highlight }">
        <a 
          v-if="value" 
          href="javascript:void(0)"
          class="text-[var(--text-app)] hover:text-blue-500 hover:underline transition-colors" 
          @click.stop="openExternalUrl(`mailto:${value}`)"
          v-html="highlight(value)"
        ></a>
        <span v-else>-</span>
      </template>

      <template #cell-phone="{ value, highlight }">
        <a 
          v-if="value" 
          href="javascript:void(0)"
          class="text-[var(--text-app)] hover:text-green-500 hover:underline transition-colors" 
          @click.stop="openExternalUrl(formatWhatsAppLink(value))"
          v-html="highlight(value)"
        ></a>
        <span v-else>-</span>
      </template>

      <!-- Customizing the Gender column using slots with Highlight support -->
      <template #cell-gender="{ value, highlight }">
        <span v-html="highlight(value === 'Kişi' ? t('employees.male', 'Kişi') : value === 'Qadın' ? t('employees.female', 'Qadın') : value)"></span>
      </template>

      <!-- Customizing the Role (Vezife) column using tags with Highlight support -->
      <template #cell-role="{ value, highlight }">
        <div class="flex flex-wrap gap-1">
          <template v-if="Array.isArray(value) && value.length > 0">
            <span 
              v-for="(tag, i) in value" 
              :key="i"
              class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-[var(--text-primary)]/10 text-[var(--text-primary)]"
              v-html="highlight(tag)"
            >
            </span>
          </template>
          <span v-else class="opacity-30">-</span>
        </div>
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
    <Modal v-model="showAddModal" :title="t('employees.addNew', 'Yeni Personel Ekle')" max-width="3xl">
      <div class="space-y-6">
        <DynamicForm 
          :fields="formFields"
          v-model="formData" 
          :errors="formErrors"
        />
        
        <div class="h-px bg-[var(--border-app)] opacity-50"></div>
        
        <div class="flex items-center justify-between p-1">
          <div class="flex flex-col">
            <span class="text-sm font-bold text-[var(--text-app)]">{{ t('employees.pagePermissions', 'Səhifə İcazələri') }}</span>
            <span class="text-xs text-[var(--text-muted)]">{{ t('employees.pagePermissionsDesc', 'İşçinin daxil ola bilməyəcəyi səhifələri seçin') }}</span>
          </div>
          <UiButton variant="outline" icon="lucide:shield-off" size="sm" @click="showPermissionsModal = true" class="!border-[var(--border-app)] !bg-[var(--input-bg)] hover:!border-[var(--text-primary)]/30">
            {{ t('employees.managePermissions', 'İcazələri idarə et') }}
            <span v-if="formData.notAllowed?.length" class="ml-2 px-1.5 py-0.5 bg-[var(--color-brand-danger)] text-white rounded text-[10px]">
              {{ formData.notAllowed.length }}
            </span>
          </UiButton>
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false" class="!px-6">{{ t('common.cancel', 'İptal') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.save', 'Kaydet') }}</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit specific -->
    <Modal 
      v-model="showEditModal" 
      :title="bulkSelectedIds.length > 0 ? t('employees.bulkEdit', 'Toplu Düzenleme') : t('employees.edit', 'Personeli Düzenle')" 
      max-width="3xl"
      @update:model-value="(val) => { if (!val) bulkSelectedIds = [] }"
    >
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        {{ t('employees.bulkEditWarning', { count: bulkSelectedIds.length }) }}
      </div>

      <div class="space-y-6">
        <!-- We omit password from edit/bulk-edit via computed or in-template filtering to make it more realistic -->
        <DynamicForm 
          :fields="showEditModal && bulkSelectedIds.length > 0 ? formFields.filter(f => !f.key.includes('password')) : formFields"
          v-model="formData" 
          :errors="formErrors"
        />

        <template v-if="bulkSelectedIds.length === 0">
          <div class="h-px bg-[var(--border-app)] opacity-50"></div>
          
          <div class="flex items-center justify-between p-1">
            <div class="flex flex-col">
              <span class="text-sm font-bold text-[var(--text-app)]">{{ t('employees.pagePermissions', 'Səhifə İcazələri') }}</span>
              <span class="text-xs text-[var(--text-muted)]">{{ t('employees.pagePermissionsDesc', 'İşçinin daxil ola bilməyəcəyi səhifələri seçin') }}</span>
            </div>
            <UiButton variant="outline" icon="lucide:shield-off" size="sm" @click="showPermissionsModal = true" class="!border-[var(--border-app)] !bg-[var(--input-bg)] hover:!border-[var(--text-primary)]/30">
              {{ t('employees.managePermissions', 'İcazələri idarə et') }}
              <span v-if="formData.notAllowed?.length" class="ml-2 px-1.5 py-0.5 bg-[var(--color-brand-danger)] text-white rounded text-[10px]">
                {{ formData.notAllowed.length }}
              </span>
            </UiButton>
          </div>
        </template>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []" class="!px-6">{{ t('common.cancel', 'İptal') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.update', 'Güncelle') }}</UiButton>
      </template>
    </Modal>

    <!-- NEW Permissions Modal -->
    <Modal v-model="showPermissionsModal" :title="t('employees.managePermissions', 'İcazələri idarə et')" max-width="2xl">
      <div class="p-2 space-y-8">
        <div v-for="category in menuItems" :key="category.titleKey" class="space-y-4">
          <div class="flex items-center gap-3 pb-2 border-b border-[var(--border-app)] opacity-80">
            <Icon :name="category.icon" class="w-5 h-5 text-[var(--text-primary)]" />
            <h3 class="text-sm font-bold uppercase tracking-widest text-[var(--text-app)]">{{ t(category.titleKey) }}</h3>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
            <div 
              v-for="child in category.children" 
              :key="child.to"
              @click="togglePermission(child.to)"
              class="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group"
              :class="isPermissionRestricted(child.to) 
                ? 'bg-red-500/5 border-red-500/20' 
                : 'bg-[var(--input-bg)] border-[var(--border-app)] hover:border-[var(--text-primary)]/30'"
            >
              <div class="flex flex-col">
                <span class="text-sm font-semibold" :class="isPermissionRestricted(child.to) ? 'text-red-600' : 'text-[var(--text-app)]'">
                  {{ t(child.titleKey) }}
                </span>
                <span class="text-[10px] opacity-40 font-mono">{{ child.to }}</span>
              </div>
              
              <div 
                class="w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center"
                :class="isPermissionRestricted(child.to) 
                  ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/20' 
                  : 'bg-white/5 border-[var(--border-app)] group-hover:border-[var(--text-primary)]'"
              >
                <Icon v-if="isPermissionRestricted(child.to)" name="lucide:lock" class="w-3.5 h-3.5 text-white" />
                <Icon v-else name="lucide:unlock" class="w-3.5 h-3.5 text-[var(--text-app)] opacity-20" />
              </div>
            </div>
          </div>
        </div>

        <!-- Settings separately -->
        <div class="space-y-4">
          <div class="flex items-center gap-3 pb-2 border-b border-[var(--border-app)] opacity-80">
            <Icon name="lucide:settings" class="w-5 h-5 text-[var(--text-primary)]" />
            <h3 class="text-sm font-bold uppercase tracking-widest text-[var(--text-app)]">{{ t('menu.settings') }}</h3>
          </div>
          <div 
            @click="togglePermission('/settings')"
            class="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group max-w-sm ml-2"
            :class="isPermissionRestricted('/settings') 
              ? 'bg-red-500/5 border-red-500/20' 
              : 'bg-[var(--input-bg)] border-[var(--border-app)] hover:border-[var(--text-primary)]/30'"
          >
             <div class="flex flex-col">
                <span class="text-sm font-semibold" :class="isPermissionRestricted('/settings') ? 'text-red-600' : 'text-[var(--text-app)]'">
                  {{ t('menu.settings') }}
                </span>
                <span class="text-[10px] opacity-40 font-mono">/settings</span>
              </div>
              <div 
                class="w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center"
                :class="isPermissionRestricted('/settings') 
                  ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/20' 
                  : 'bg-white/5 border-[var(--border-app)] group-hover:border-[var(--text-primary)]'"
              >
                <Icon v-if="isPermissionRestricted('/settings')" name="lucide:lock" class="w-3.5 h-3.5 text-white" />
                <Icon v-else name="lucide:unlock" class="w-3.5 h-3.5 text-[var(--text-app)] opacity-20" />
              </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <UiButton variant="primary" @click="showPermissionsModal = false" class="!px-10">
          {{ t('common.done', 'Tamam') }}
        </UiButton>
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
