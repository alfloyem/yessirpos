<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

// --- Centralized Schema ---
const employeeSchema = computed< (FormField & { inTable?: boolean, sortable?: boolean })[] >(() => [
  { key: 'firstName', label: t('employees.firstName', 'Ad'), type: 'text', inTable: true, sortable: true, required: true },
  { key: 'lastName', label: t('employees.lastName', 'Soyad'), type: 'text', inTable: true, sortable: true, required: true },
  { key: 'username', label: t('employees.username', 'İstifadəçi adı'), icon: 'lucide:user', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'email', label: t('employees.email', 'E-poçt (Email)'), icon: 'lucide:mail', type: 'email', inTable: true, sortable: true },
  { key: 'phone', label: t('employees.phone', 'Telefon'), icon: 'lucide:phone', type: 'tel', inTable: true, sortable: true },
  { key: 'gender', label: t('employees.gender', 'Cinsiyyət'), type: 'select', inTable: true, sortable: true, options: [
    { label: t('employees.male', 'Kişi'), value: 'Kişi' },
    { label: t('employees.female', 'Qadın'), value: 'Qadın' }
  ]},
  { key: 'password', label: t('employees.password', 'Şifrə'), icon: 'lucide:lock', type: 'password', inTable: false, required: true },
  { key: 'status', label: t('employees.status', 'Durum'), type: 'select', inTable: true, sortable: true, options: [
    { label: t('employees.statusActive', 'Aktif'), value: 'Aktif' },
    { label: t('employees.statusPassive', 'Pasif'), value: 'Pasif' },
    { label: t('employees.statusOnLeave', 'İzinde'), value: 'İzinde' }
  ]},
  { key: 'notes', label: t('employees.notes', 'Xüsusi qeyd'), type: 'textarea', colSpan: 2, inTable: false },
])

// Extract table columns dynamically
const columns = computed(() => 
  employeeSchema.value
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// The fields structure for DynamicForm
const formFields = computed(() => employeeSchema.value)

// --- Data ---
const mockData = ref<any[]>([
  { id: 1, firstName: 'Ahmet', lastName: 'Yılmaz', username: 'ahmet_yilmaz', email: 'ahmet@yessirpos.com', phone: '+90 555 123 4567', gender: 'Kişi', status: 'Aktif', notes: 'Hızlı çalışan' },
  { id: 2, firstName: 'Ayşe', lastName: 'Kaya', username: 'aysekaya', email: 'ayse@yessirpos.com', phone: '+90 555 987 6543', gender: 'Qadın', status: 'Aktif', notes: '' },
])

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteTarget = ref<{ type: 'single' | 'bulk', id?: any, ids?: any[] } | null>(null)
const formData = ref<Record<string, any>>({})
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
  isUsernameManuallyEdited.value = false
  lastGeneratedUsername.value = ''
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row } // Pre-fill form
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
    mockData.value = mockData.value.filter(m => m.id !== deleteTarget.value!.id)
  } else if (deleteTarget.value.type === 'bulk') {
    mockData.value = mockData.value.filter(m => !deleteTarget.value!.ids!.includes(m.id))
  }
  
  showDeleteConfirmModal.value = false
  deleteTarget.value = null
}

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  formData.value = {} // Reset it
  showEditModal.value = true
}

const saveForm = () => {
  if (showAddModal.value) {
    mockData.value.push({ id: Date.now(), ...formData.value })
    showAddModal.value = false
  } else if (showEditModal.value) {
    if (bulkSelectedIds.value.length > 0) {
      // Apply the filled fields to all selected items
      const updates = Object.fromEntries(Object.entries(formData.value).filter(([_, v]) => v !== undefined && v !== ''))
      mockData.value = mockData.value.map(item => 
        bulkSelectedIds.value.includes(item.id) ? { ...item, ...updates } : item
      )
      bulkSelectedIds.value = []
    } else {
      const index = mockData.value.findIndex(m => m.id === formData.value.id)
      if (index !== -1) mockData.value[index] = { ...formData.value }
    }
    showEditModal.value = false
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
      title="Personel_Listesi"
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
      <!-- Customizing the Status column using slots -->
      <template #cell-status="{ value }">
        <span 
          class="px-2 py-1 text-xs font-bold rounded-full"
          :class="{
            'bg-[var(--color-brand-success)]/10 text-[var(--color-brand-success)]': value === 'Aktif',
            'bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)]': value === 'Pasif',
            'bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)]': value === 'İzinde'
          }"
        >
          {{ value }}
        </span>
      </template>
    </DataTable>

    <!-- Modal: Add / Edit -->
    <Modal v-model="showAddModal" :title="t('employees.addNew', 'Yeni Personel Ekle')" max-width="xl">
      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false" class="!px-6">{{ t('common.cancel', 'İptal') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.save', 'Kaydet') }}</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit specific -->
    <Modal v-model="showEditModal" :title="bulkSelectedIds.length > 0 ? t('employees.bulkEdit', 'Toplu Düzenleme') : t('employees.edit', 'Personeli Düzenle')" max-width="xl">
      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        {{ t('employees.bulkEditWarning', { count: bulkSelectedIds.length }) }}
      </div>

      <!-- We omit password from edit/bulk-edit via computed or in-template filtering to make it more realistic -->
      <DynamicForm 
        :fields="showEditModal && bulkSelectedIds.length > 0 ? formFields.filter(f => !f.key.includes('password')) : formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []" class="!px-6">{{ t('common.cancel', 'İptal') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="saveForm" class="!px-8 min-w-[120px]">{{ t('common.update', 'Güncelle') }}</UiButton>
      </template>
    </Modal>

    <!-- Silmə Təsdiq Modalı -->
    <Modal v-model="showDeleteConfirmModal" :title="t('common.attention', 'Diggət!')" max-width="sm">
      <div class="flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div class="w-16 h-16 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-full flex items-center justify-center mb-2">
          <UiIcon name="lucide:alert-triangle" class="w-8 h-8" />
        </div>
        <h3 class="text-xl font-bold text-[var(--text-primary)]">{{ t('employees.confirmDelete', 'Silmək istədiyinizə əminsiniz?') }}</h3>
        <p class="text-[var(--text-app)] opacity-70 text-[15px]">
          {{ t('common.cannotBeUndone', 'Bu əməliyyat geri qaytarıla bilməz.') }}
          <span v-if="deleteTarget?.type === 'bulk'" class="font-bold text-[var(--text-primary)] block mt-2">
            {{ t('employees.bulkDeleteCount', { count: deleteTarget.ids?.length }) }}
          </span>
        </p>
      </div>
      
      <template #footer>
        <UiButton variant="ghost" @click="showDeleteConfirmModal = false" class="!px-6">{{ t('common.cancel', 'Ləğv et') }}</UiButton>
        <UiButton variant="danger" icon="lucide:trash-2" @click="performDelete" class="!px-8 min-w-[120px]">
          {{ t('common.yesDelete', 'Bəli, Sil') }}
        </UiButton>
      </template>
    </Modal>

  </div>
</template>
