<script setup>
import { ref } from 'vue'
import { useI18n } from '#i18n'
import DataTable from '~/components/ui/DataTable.vue'
import Modal from '~/components/ui/Modal.vue'

const { t } = useI18n()

useHead({
  title: t('menu.employees')
})

// --- Data & Columns ---
const columns = [
  { key: 'name', label: 'Ad Soyad', sortable: true },
  { key: 'email', label: 'E-Posta', sortable: true },
  { key: 'role', label: 'Rol', sortable: true },
  { key: 'phone', label: 'Telefon', sortable: true },
  { key: 'status', label: 'Durum', sortable: true, visible: true },
]

const mockData = ref([
  { id: 1, name: 'Ahmet Yılmaz', email: 'ahmet@yessirpos.com', role: 'Kasiyer', phone: '+90 555 123 4567', status: 'Aktif' },
  { id: 2, name: 'Ayşe Kaya', email: 'ayse@yessirpos.com', role: 'Müdür', phone: '+90 555 987 6543', status: 'Aktif' },
  { id: 3, name: 'Mehmet Demir', email: 'mehmet@yessirpos.com', role: 'Kasiyer', phone: '+90 555 456 7890', status: 'Pasif' },
  { id: 4, name: 'Fatma Şahin', email: 'fatma@yessirpos.com', role: 'Garson', phone: '+90 555 789 0123', status: 'Aktif' },
  { id: 5, name: 'Ali Can', email: 'ali@yessirpos.com', role: 'Aşçı', phone: '+90 555 321 6547', status: 'İzinde' },
])

// --- Modals State ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selectedEmployee = ref(null)

// --- Handlers ---
const handleAdd = () => {
  selectedEmployee.value = null
  showAddModal.value = true
}

const handleEdit = (row) => {
  selectedEmployee.value = { ...row }
  showEditModal.value = true
}

const handleDelete = (row) => {
  selectedEmployee.value = row
  showDeleteModal.value = true
}

const handleBulkDelete = (ids) => {
  if (confirm(`${ids.length} personeli silmek istediğinize emin misiniz?`)) {
    mockData.value = mockData.value.filter(m => !ids.includes(m.id))
  }
}

const handleBulkEdit = (ids) => {
  alert(`${ids.length} adet kayıt toplu olarak düzenlenmek için seçildi. İşlem modalı açılacak.`)
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
    <Modal v-model="showAddModal" title="Yeni Personel Ekle" max-width="md">
      <div class="space-y-4">
        <div class="space-y-1">
          <label class="text-xs font-bold text-[var(--text-app)] uppercase tracking-wider">Ad Soyad</label>
          <input type="text" class="w-full bg-[var(--bg-app)] border border-[var(--border-app)] px-4 py-2 text-sm rounded-lg outline-none focus:border-[var(--text-primary)] transition-all" />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-bold text-[var(--text-app)] uppercase tracking-wider">E-Posta</label>
          <input type="email" class="w-full bg-[var(--bg-app)] border border-[var(--border-app)] px-4 py-2 text-sm rounded-lg outline-none focus:border-[var(--text-primary)] transition-all" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-xs font-bold text-[var(--text-app)] uppercase tracking-wider">Rol</label>
            <select class="w-full bg-[var(--bg-app)] border border-[var(--border-app)] px-4 py-2 text-sm rounded-lg outline-none focus:border-[var(--text-primary)] transition-all">
              <option>Kasiyer</option>
              <option>Müdür</option>
              <option>Garson</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-[var(--text-app)] uppercase tracking-wider">Durum</label>
            <select class="w-full bg-[var(--bg-app)] border border-[var(--border-app)] px-4 py-2 text-sm rounded-lg outline-none focus:border-[var(--text-primary)] transition-all">
              <option>Aktif</option>
              <option>Pasif</option>
              <option>İzinde</option>
            </select>
          </div>
        </div>
      </div>
      <template #footer>
        <button @click="showAddModal = false" class="px-4 py-2 text-sm font-bold text-[var(--text-app)] hover:bg-[var(--bg-app)] rounded-lg transition-all">İptal</button>
        <button @click="showAddModal = false" class="px-4 py-2 text-sm font-bold text-white bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] rounded-lg transition-all shadow-md">Kaydet</button>
      </template>
    </Modal>

    <!-- Modal: Edit specific (reusing structure for demo) -->
    <Modal v-model="showEditModal" title="Personeli Düzenle" max-width="md">
      <div v-if="selectedEmployee" class="space-y-4">
        <!-- Reusing same form structure but pre-filled -->
        <div class="space-y-1">
          <label class="text-xs font-bold text-[var(--text-app)] uppercase tracking-wider">Ad Soyad</label>
          <input type="text" v-model="selectedEmployee.name" class="w-full bg-[var(--bg-app)] border border-[var(--border-app)] px-4 py-2 text-sm rounded-lg outline-none focus:border-[var(--text-primary)] transition-all" />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-bold text-[var(--text-app)] uppercase tracking-wider">E-Posta</label>
          <input type="email" v-model="selectedEmployee.email" class="w-full bg-[var(--bg-app)] border border-[var(--border-app)] px-4 py-2 text-sm rounded-lg outline-none focus:border-[var(--text-primary)] transition-all" />
        </div>
      </div>
      <template #footer>
        <button @click="showEditModal = false" class="px-4 py-2 text-sm font-bold text-[var(--text-app)] hover:bg-[var(--bg-app)] rounded-lg transition-all">İptal</button>
        <button @click="showEditModal = false" class="px-4 py-2 text-sm font-bold text-white bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] rounded-lg transition-all shadow-md">Güncelle</button>
      </template>
    </Modal>

  </div>
</template>
