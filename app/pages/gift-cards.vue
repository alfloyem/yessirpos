<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()

useHead({
  title: t('menu.giftCard') || 'Hədiyyə Kartı'
})

// --- Mock Customers Data (In real app, this will come from API) ---
const mockCustomers = [
  { label: 'Məhəmməd Şükürov', value: 1 },
  { label: 'Leyla Əliyeva', value: 2 },
  { label: 'John Doe', value: 3 },
  { label: 'Aylin Məmmədova', value: 4 }
]

// --- Helper for Random Card Number Generation (Optional) ---
const generateCardNumber = () => {
  let number = ''
  for (let i = 0; i < 16; i++) {
    number += Math.floor(Math.random() * 10).toString()
  }
  return number
}

// --- Centralized Schema ---
const giftCardSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { 
    key: 'customer', 
    label: 'Müştəri adını axtar', 
    type: 'select', 
    inTable: false, // We will map it manually for the table to show full name
    required: true,
    icon: 'lucide:user',
    options: mockCustomers,
    colSpan: 2
  },
  { key: 'customerName', label: 'Müştəri Adı və Soyadı', type: 'text', inTable: true, sortable: true }, // Only for table view
  { key: 'cardNumber', label: 'Hədiyyə Kartı Nömrəsi', icon: 'lucide:credit-card', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'value', label: 'Dəyəri (AZN)', icon: 'lucide:wallet', type: 'number', inTable: true, sortable: true, required: true },
]


// Modalda gösterilecek form alanları
const formFields = computed(() => {
  return giftCardSchema.filter(f => f.key !== 'customerName')
})

// Table Columns
const columns = computed(() => 
  giftCardSchema
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// --- Data ---
const mockData = ref<any[]>([
  { id: 1, customer: 1, customerName: 'Məhəmməd Şükürov', cardNumber: '1234567812345678', value: 100 },
  { id: 2, customer: 2, customerName: 'Leyla Əliyeva', cardNumber: '9876543298765432', value: 50 },
])

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const formData = ref<Record<string, any>>({})
const bulkSelectedIds = ref<any[]>([])
const cardError = ref('')

// --- Handlers ---
const handleAdd = () => {
  formData.value = {
    cardNumber: generateCardNumber(),
    value: 0
  }
  cardError.value = ''
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row }
  const foundCustomer = mockCustomers.find(c => c.value === row.customer)
  if (foundCustomer) {
    formData.value['customer_search'] = foundCustomer.label
  }
  cardError.value = ''
  showEditModal.value = true
}

const handleDelete = (row: any) => {
  formData.value = { ...row }
  showDeleteModal.value = true
}

const handleBulkDelete = (ids: any[]) => {
  if (confirm(`${ids.length} hədiyyə kartını silmək istəyirsiniz?`)) {
    mockData.value = mockData.value.filter(m => !ids.includes(m.id))
  }
}

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  formData.value = {}
  cardError.value = ''
  showEditModal.value = true
}

// Benzersiz kart kontrolü
const checkCardUnique = (cardNumber: string, currentId?: any) => {
  return !mockData.value.some(m => m.cardNumber === cardNumber && m.id !== currentId)
}

const saveForm = () => {
  cardError.value = ''
  
  if (!formData.value.customer) {
    cardError.value = 'Xahiş olunur bir müştəri seçin!'
    return
  }

  if (formData.value.cardNumber && !checkCardUnique(formData.value.cardNumber, formData.value.id)) {
    cardError.value = 'Bu kart nömrəsi artıq mövcuddur! Fərqli nömrə daxil edin.'
    return 
  }

  // Get the customer label to store in table
  const selectedCustomer = mockCustomers.find(c => c.value === formData.value.customer)
  const customerName = selectedCustomer ? selectedCustomer.label : 'Naməlum Müştəri'

  if (showAddModal.value) {
    mockData.value.push({ 
      id: Date.now(), 
      ...formData.value,
      customerName
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
      if (index !== -1) mockData.value[index] = { ...mockData.value[index], ...formData.value, customerName }
    }
    showEditModal.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
       <h1 class="text-2xl font-bold text-[var(--text-app)]">
        {{ t('menu.giftCard') || 'Hədiyyə Kartı' }}
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      title="Hediyye_Kartlari"
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
      <!-- Value Custom Format -->
      <template #cell-value="{ value }">
        <span class="font-medium text-[var(--color-brand-success)]">
          {{ value || 0 }} ₼
        </span>
      </template>

      <!-- Card Number Visual Formatting -->
      <template #cell-cardNumber="{ value }">
        <span class="font-mono bg-[var(--input-bg)] px-2 py-1 rounded text-[13px] border border-[var(--border-app)] tracking-widest text-[var(--text-primary)]">
          {{ value.match(/.{1,4}/g)?.join(' ') || value }}
        </span>
      </template>
    </DataTable>

    <!-- Modal: Add -->
    <Modal v-model="showAddModal" title="Yeni Hədiyyə Kartı Əlavə Et" max-width="xl">
      <div v-if="cardError" class="mb-4 p-3 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-lg text-sm font-medium flex items-center gap-2">
        <UiIcon name="lucide:alert-triangle" class="w-3.5 h-3.5"/>
        {{ cardError }}
      </div>
      
      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false">İptal</UiButton>
        <UiButton variant="primary" @click="saveForm">Yarat</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit -->
    <Modal v-model="showEditModal" :title="bulkSelectedIds.length > 0 ? 'Toplu Düzenleme' : 'Hədiyyə Kartını Redaktə Et'" max-width="xl">
      <div v-if="cardError" class="mb-4 p-3 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-lg text-sm font-medium flex items-center gap-2">
        <UiIcon name="lucide:alert-triangle" class="w-3.5 h-3.5"/>
        {{ cardError }}
      </div>

      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        Uyarı: Toplu düzenleme modundasınız. Burada dolduracağınız alanlar, seçtiğiniz <span class="font-bold">{{ bulkSelectedIds.length }}</span> kaydın verisinin üzerine yazılacaktır.
      </div>

      <!-- We omit card number in bulk edit to avoid conflicts -->
      <DynamicForm 
        :fields="showEditModal && bulkSelectedIds.length > 0 ? formFields.filter(f => f.key !== 'cardNumber' && f.key !== 'customer') : formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">İptal</UiButton>
        <UiButton variant="primary" @click="saveForm">Güncelle</UiButton>
      </template>
    </Modal>

  </div>
</template>
