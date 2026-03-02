br<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'

const { t } = useI18n()

useHead({
  title: t('menu.customers') || 'Müştərilər'
})

// --- Helper for Barcode Generation ---
const generateBarcode = () => {
  // 12 Haneli rastgele bir barkod üretir
  let barcode = ''
  for (let i = 0; i < 12; i++) {
    barcode += Math.floor(Math.random() * 10).toString()
  }
  return barcode
}

// --- Centralized Schema ---
const customerSchema: (FormField & { inTable?: boolean, sortable?: boolean })[] = [
  { key: 'firstName', label: 'Ad', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'lastName', label: 'Soyad', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'barcode', label: 'Barkod', icon: 'solar:qr-code-bold-duotone', type: 'text', inTable: true, sortable: true, required: true },
  { key: 'bonus', label: 'Bonus (AZN)', icon: 'solar:wallet-money-bold-duotone', type: 'number', inTable: true, sortable: true },
  { key: 'gender', label: 'Cins', type: 'select', inTable: true, sortable: true, options: [
    { label: 'Kişi', value: 'Kişi' },
    { label: 'Qadın', value: 'Qadın' }
  ]},
  { key: 'email', label: 'E-poçt', icon: 'solar:letter-bold-duotone', type: 'email', inTable: false, sortable: true },
  { key: 'phone', label: 'Telefon', icon: 'solar:phone-bold-duotone', type: 'tel', inTable: true, sortable: true },
  { key: 'address', label: 'Ünvan', icon: 'solar:map-point-bold-duotone', type: 'text', colSpan: 2, inTable: false },
  { key: 'city', label: 'Şəhər/rayon', type: 'select', inTable: true, sortable: true, options: [
    { label: 'Bakı', value: 'Bakı' }
  ]},
  { key: 'country', label: 'Ölkə', icon: 'solar:globe-bold-duotone', type: 'text', inTable: false },
  { key: 'notes', label: 'Xüsusi qeyd', type: 'textarea', colSpan: 2, inTable: false },
  // Tarix ve Əməkdaş sadece görüntü/otomatik olduğu için forma eklemiyoruz, tablo/arkaplan mantığında işliyoruz.
  { key: 'createdAt', label: 'Tarix', type: 'text', inTable: true, sortable: true },
  { key: 'createdBy', label: 'Əməkdaş', type: 'text', inTable: true, sortable: true },
]

// Modal'da gösterilecek form alanları (Tarix ve Əməkdaş Hariç)
const formFields = computed(() => {
  return customerSchema.filter(f => !['createdAt', 'createdBy'].includes(f.key))
})

// Extract table columns dynamically
const columns = computed(() => 
  customerSchema
    .filter(f => f.inTable)
    .map(f => ({ key: f.key, label: f.label, sortable: f.sortable }))
)

// --- Data ---
const mockData = ref<any[]>([
  { id: 1, firstName: 'Məhəmməd', lastName: 'Şükürov', barcode: '123456789012', bonus: 50.5, gender: 'Kişi', email: 'mhmmd@test.com', phone: '+994 50 123 45 67', address: 'Nizami küçəsi 12', city: 'Bakı', country: 'Azərbaycan', notes: 'VIP Müştəri', createdAt: '2026-03-03 10:15', createdBy: 'Ahmet Yılmaz' },
  { id: 2, firstName: 'Leyla', lastName: 'Əliyeva', barcode: '987654321098', bonus: 15.0, gender: 'Qadın', email: 'leyla@test.com', phone: '+994 55 987 65 43', address: 'Gənclik', city: 'Bakı', country: 'Azərbaycan', notes: '', createdAt: '2026-03-02 14:30', createdBy: 'Ayşe Kaya' },
])

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const formData = ref<Record<string, any>>({})
const bulkSelectedIds = ref<any[]>([])
const barcodeError = ref('')

// --- Handlers ---
const handleAdd = () => {
  formData.value = {
    barcode: generateBarcode(),
    bonus: 0,
    city: 'Bakı',
    country: 'Azərbaycan'
  }
  barcodeError.value = ''
  showAddModal.value = true
}

const handleEdit = (row: any) => {
  formData.value = { ...row }
  barcodeError.value = ''
  showEditModal.value = true
}

const handleDelete = (row: any) => {
  formData.value = { ...row }
  showDeleteModal.value = true
}

const handleBulkDelete = (ids: any[]) => {
  if (confirm(`${ids.length} müştərini silmek isteyirsiniz?`)) {
    mockData.value = mockData.value.filter(m => !ids.includes(m.id))
  }
}

const handleBulkEdit = (ids: any[]) => {
  bulkSelectedIds.value = ids
  formData.value = {}
  barcodeError.value = ''
  showEditModal.value = true
}

// Barkod kontrolü sadece "Kaydet" anında yapılır
const checkBarcodeUnique = (barcode: string, currentId?: any) => {
  return !mockData.value.some(m => m.barcode === barcode && m.id !== currentId)
}

const saveForm = () => {
  barcodeError.value = ''
  
  // Barkod özel validasyonu
  if (formData.value.barcode && !checkBarcodeUnique(formData.value.barcode, formData.value.id)) {
    barcodeError.value = 'Bu barkod artıq mövcuddur! Fərqli barkod daxil edin.'
    return 
  }

  if (showAddModal.value) {
    const d = new Date()
    const formattedDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    
    // Geçici olarak ekleyen kişi Ahmet Yılmaz olsun
    mockData.value.push({ 
      id: Date.now(), 
      ...formData.value,
      createdAt: formattedDate,
      createdBy: 'Sistem Yöneticisi' // İleride gerçek auth bağlandığında burası değişecek
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
        Müştərilər
      </h1>
    </div>

    <!-- Smart Data Table -->
    <DataTable 
      title="Musteri_Listesi"
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
      <!-- Bonus Custom Format -->
      <template #cell-bonus="{ value }">
        <span class="font-medium text-[var(--color-brand-success)]">
          {{ value || 0 }} ₼
        </span>
      </template>
    </DataTable>

    <!-- Modal: Add / Edit -->
    <Modal v-model="showAddModal" title="Yeni Müştəri Əlavə Et" max-width="xl">
      <div v-if="barcodeError" class="mb-4 p-3 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-lg text-sm font-medium flex items-center gap-2">
        <UiIcon name="solar:danger-triangle-bold" class="w-5 h-5"/>
        {{ barcodeError }}
      </div>
      
      <DynamicForm 
        :fields="formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showAddModal = false">İptal</UiButton>
        <UiButton variant="primary" @click="saveForm">Kaydet</UiButton>
      </template>
    </Modal>

    <!-- Modal: Edit specific -->
    <Modal v-model="showEditModal" :title="bulkSelectedIds.length > 0 ? 'Toplu Düzenleme' : 'Müştərini Düzenle'" max-width="xl">
      <div v-if="barcodeError" class="mb-4 p-3 bg-[var(--color-brand-danger)]/10 text-[var(--color-brand-danger)] rounded-lg text-sm font-medium flex items-center gap-2">
        <UiIcon name="solar:danger-triangle-bold" class="w-5 h-5"/>
        {{ barcodeError }}
      </div>

      <div v-if="bulkSelectedIds.length > 0" class="mb-4 p-3 bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] rounded-lg text-sm font-medium">
        Uyarı: Toplu düzenleme modundasınız. Burada dolduracağınız alanlar, seçtiğiniz <span class="font-bold">{{ bulkSelectedIds.length }}</span> kaydın verisinin üzerine yazılacaktır.
      </div>

      <!-- We omit barcode in bulk edit to avoid conflicts (they should be unique) -->
      <DynamicForm 
        :fields="showEditModal && bulkSelectedIds.length > 0 ? formFields.filter(f => f.key !== 'barcode') : formFields"
        v-model="formData" 
      />
      <template #footer>
        <UiButton variant="ghost" @click="showEditModal = false; bulkSelectedIds = []">İptal</UiButton>
        <UiButton variant="primary" @click="saveForm">Güncelle</UiButton>
      </template>
    </Modal>

  </div>
</template>
