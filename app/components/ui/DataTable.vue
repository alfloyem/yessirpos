<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '#i18n'
import { exportToCSV } from '~/utils/exportCsv'

interface Column {
  key: string
  label: string
  sortable?: boolean
  visible?: boolean // By default true
}

interface Props {
  title: string
  data: any[]
  columns: Column[]
  loading?: boolean
  selectable?: boolean
  actions?: boolean // show default action column
  searchable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchable: true,
  loading: false,
  selectable: false,
  actions: false
})

const emit = defineEmits(['add', 'edit', 'delete', 'bulk-edit', 'bulk-delete', 'row-click'])

const { t } = useI18n()

// Search
const searchQuery = ref('')

// Columns Visiblity
// Initially, set all columns to visible if not explicitly set to false
const localColumns = ref(
  props.columns.map(c => ({
    ...c,
    visible: c.visible !== false
  }))
)

const visibleColumns = computed(() => localColumns.value.filter(c => c.visible))

const toggleColumn = (col: Column) => {
  const found = localColumns.value.find(c => c.key === col.key)
  if (found) found.visible = !found.visible
}

// Sorting
const sortKey = ref('')
const sortAsc = ref(true)

const sortBy = (key: string) => {
  const col = localColumns.value.find(c => c.key === key)
  if (!col || !col.sortable) return

  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

// Selection
const selectedIds = ref<Set<string | number>>(new Set())
const isAllSelected = computed(() => {
  return filteredAndSortedData.value.length > 0 && selectedIds.value.size === filteredAndSortedData.value.length
})
const isIndeterminate = computed(() => {
  return selectedIds.value.size > 0 && selectedIds.value.size < filteredAndSortedData.value.length
})

const toggleAll = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  if (checked) {
    selectedIds.value = new Set(filteredAndSortedData.value.map(item => item.id))
  } else {
    selectedIds.value.clear()
  }
}

const toggleSelect = (id: string | number) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

// Normalize function to convert Turkish chars to standard and ignore case
const normalizeText = (text: any) => {
  if (text === null || text === undefined) return ''
  return String(text)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "") // remove accents
}

// Derived Data
const filteredAndSortedData = computed(() => {
  let result = [...props.data]

  // Global Search
  if (searchQuery.value) {
    const q = normalizeText(searchQuery.value)
    result = result.filter(item => {
      // Dynamic: search all keys in the object, independent of column visibility
      const keys = Object.keys(item)
      return keys.some(key => {
        const val = item[key]
        return normalizeText(val).includes(q)
      })
    })
  }

  // Sorting
  if (sortKey.value) {
    result.sort((a, b) => {
      const valA = a[sortKey.value]
      const valB = b[sortKey.value]
      if (valA === valB) return 0
      
      const comparison = valA > valB ? 1 : -1
      return sortAsc.value ? comparison : -comparison
    })
  }

  return result
})

// Highlight Function for template
const highlightText = (text: any) => {
  if (!searchQuery.value || text === null || text === undefined) return String(text)
  const query = searchQuery.value.trim()
  if (!query) return String(text)
  
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const buildCharRegex = (char: string) => {
    switch (char.toLowerCase()) {
      case 'i': case 'ı': return '[iıİI]'
      case 'g': case 'ğ': return '[gğGĞ]'
      case 's': case 'ş': return '[sşSŞ]'
      case 'c': case 'ç': return '[cçCÇ]'
      case 'o': case 'ö': return '[oöOÖ]'
      case 'u': case 'ü': return '[uüUÜ]'
      default: return escapeRegExp(char)
    }
  }

  const regexStr = Array.from(query).map(buildCharRegex).join('')
  try {
    const regex = new RegExp(`(${regexStr})`, 'gi')
    return String(text).replace(regex, '<mark class="bg-[var(--text-primary)]/30 text-[var(--text-primary)] px-0.5 rounded">$1</mark>')
  } catch (e) {
    return String(text)
  }
}

// Export
const handleExport = () => {
  exportToCSV(props.title || 'export', localColumns.value, filteredAndSortedData.value)
}

watch(() => props.data, () => {
  selectedIds.value.clear()
}, { deep: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-4">
      
      <!-- Actions Left -->
      <div class="flex items-center gap-2">
        <!-- Delete Selected -->
         <Transition name="fade">
          <UiButton 
            v-if="selectedIds.size > 0"
            variant="soft-danger"
            size="sm"
            icon="solar:trash-bin-trash-bold-duotone"
            @click="emit('bulk-delete', Array.from(selectedIds))"
          >
            {{ selectedIds.size }} Sil
          </UiButton>
        </Transition>

        <!-- Edit Selected -->
        <Transition name="fade">
          <UiButton 
            v-if="selectedIds.size > 0"
            variant="soft-primary"
            size="sm"
            icon="solar:pen-bold-duotone"
            @click="emit('bulk-edit', Array.from(selectedIds))"
          >
            Toplu Düzenle
          </UiButton>
        </Transition>

        <!-- Column Visibility -->
        <UiDropdown menuClass="absolute left-0 top-full mt-2 w-48 p-2 z-[60]">
          <template #trigger>
            <UiButton 
              variant="outline"
              size="sm"
              icon="solar:eye-bold-duotone"
            >
              <span class="hidden sm:inline">Sütunlar</span>
            </UiButton>
          </template>

          <template #menu>
            <div 
              v-for="col in localColumns" 
              :key="col.key"
              @click.stop="toggleColumn(col)"
              class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-[var(--bg-app)] transition-colors"
            >
              <input type="checkbox" :checked="col.visible" class="pointer-events-none accent-[var(--text-primary)]" />
              <span class="truncate">{{ col.label }}</span>
            </div>
          </template>
        </UiDropdown>

        <!-- Export -->
        <UiButton 
          variant="outline"
          size="sm"
          icon="solar:export-bold-duotone"
          @click="handleExport"
        >
          <span class="hidden sm:inline">Dışa Aktar</span>
        </UiButton>

        <!-- Add New -->
        <UiButton 
          variant="primary"
          size="sm"
          icon="solar:add-circle-bold-duotone"
          @click="emit('add')"
        >
          Yeni Ekle
        </UiButton>
      </div>

      <!-- Spacer -->
      <div class="flex-1 min-w-[20px]"></div>

      <!-- Search Component Right -->
      <div v-if="searchable !== false" class="w-full sm:w-72">
        <UiInput 
          v-model="searchQuery" 
          placeholder="Tabloda ara..." 
          icon="solar:magnifer-bold-duotone" 
          clearable 
        />
      </div>
    </div>

    <!-- Table Card -->
    <div class="bg-[var(--bg-sidebar)] border border-[var(--border-app)] rounded-xl overflow-hidden shadow-sm relative">
      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 bg-[var(--bg-sidebar)]/50 backdrop-blur-sm z-10 flex items-center justify-center">
        <UiIcon name="solar:spinner-bold-duotone" class="w-8 h-8 text-[var(--text-primary)] animate-spin" />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-[var(--bg-app)] border-b border-[var(--border-app)] text-[var(--text-app)] font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <!-- Multi Select Header -->
              <th v-if="selectable" class="px-6 py-4 w-12">
                <input 
                  type="checkbox" 
                  class="accent-[var(--text-primary)] w-4 h-4 cursor-pointer"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleAll"
                />
              </th>
              
              <!-- Dynamic Headers -->
              <th 
                v-for="col in visibleColumns" 
                :key="col.key"
                class="px-6 py-4"
                :class="{ 'cursor-pointer hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-colors': col.sortable }"
                @click="sortBy(col.key)"
              >
                <div class="flex items-center gap-2">
                  <span>{{ col.label }}</span>
                  <UiIcon 
                    v-if="col.sortable"
                    :name="sortKey === col.key ? (sortAsc ? 'solar:sort-from-bottom-to-top-bold-duotone' : 'solar:sort-from-top-to-bottom-bold-duotone') : 'solar:sort-vertical-bold-duotone'" 
                    class="w-3.5 h-3.5"
                    :class="sortKey === col.key ? 'text-[var(--text-primary)] opacity-100' : 'opacity-30'"
                  />
                </div>
              </th>

              <!-- Actions Header -->
              <th v-if="actions" class="px-6 py-4 text-right">Aksiyonlar</th>
            </tr>
          </thead>
          
          <tbody class="divide-y divide-[var(--border-app)] text-[var(--text-app)]">
            <template v-if="filteredAndSortedData.length > 0">
              <tr 
                v-for="row in filteredAndSortedData" 
                :key="row.id"
                class="hover:bg-[var(--bg-app)]/50 transition-colors group cursor-pointer"
                :class="{'bg-[var(--text-primary)]/5': selectedIds.has(row.id)}"
                @click="emit('row-click', row)"
              >
                <!-- Multi Select Cell -->
                <td v-if="selectable" class="px-6 py-3 w-12" @click.stop>
                  <input 
                    type="checkbox" 
                    class="accent-[var(--text-primary)] w-4 h-4 cursor-pointer"
                    :checked="selectedIds.has(row.id)"
                    @change="toggleSelect(row.id)"
                  />
                </td>

                <!-- Dynamic Cells -->
                <td 
                  v-for="col in visibleColumns" 
                  :key="col.key" 
                  class="px-6 py-3"
                >
                  <!-- Custom Slot Check -->
                  <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                    <span v-html="highlightText(row[col.key])"></span>
                  </slot>
                </td>

                <!-- Actions Cell -->
                <td v-if="actions" class="px-6 py-3 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <UiButton 
                      variant="ghost"
                      size="icon"
                      icon="solar:pen-bold-duotone"
                      @click="emit('edit', row)"
                      class="hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
                    />
                    <UiButton 
                      variant="ghost"
                      size="icon"
                      icon="solar:trash-bin-trash-bold-duotone"
                      @click="emit('delete', row)"
                      class="hover:text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/10"
                    />
                  </div>
                </td>
              </tr>
            </template>
            <!-- Empty State -->
            <tr v-else>
              <td :colspan="(selectable ? 1 : 0) + visibleColumns.length + (actions ? 1 : 0)" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center gap-3 opacity-50">
                  <UiIcon name="solar:ghost-bold-duotone" class="w-12 h-12" />
                  <p class="text-sm">Veri bulunamadı.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>
