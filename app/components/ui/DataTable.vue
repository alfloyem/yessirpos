<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from '#i18n'

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
  perPage?: number // items per page
  customSearch?: (item: any, query: string) => boolean // custom search function
  rowClass?: (row: any) => string
  canBulkEdit?: boolean
  showAdd?: boolean
  showDefaultActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchable: true,
  loading: false,
  selectable: false,
  actions: false,
  perPage: 10,
  canBulkEdit: true,
  showAdd: true,
  showDefaultActions: true
})

const STORAGE_KEY = 'datatable_per_page'
const localPerPage = ref(10)

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  const savedVal = saved ? parseInt(saved, 10) : null
  if (savedVal && !isNaN(savedVal) && perPageOptions.includes(savedVal)) {
    localPerPage.value = savedVal
  } else {
    localPerPage.value = props.perPage
  }
})

watch(localPerPage, (newVal: number) => {
  localStorage.setItem(STORAGE_KEY, newVal.toString())
  currentPage.value = 1
})

const emit = defineEmits(['add', 'edit', 'delete', 'duplicate', 'bulk-edit', 'bulk-delete', 'row-click', 'update:selected-ids'])

const { t } = useI18n()

// Search
const searchQuery = ref('')

// Columns Visiblity
// Initially, set all columns to visible if not explicitly set to false
const localColumns = ref(
  props.columns.map((c: Column) => ({
    ...c,
    visible: c.visible !== false
  }))
)

watch(() => props.columns, (newCols: Column[]) => {
  const visMap = new Map()
  localColumns.value.forEach((c: any) => visMap.set(c.key, c.visible))
  localColumns.value = newCols.map((c: Column) => ({
    ...c,
    visible: visMap.has(c.key) ? visMap.get(c.key) : (c.visible !== false)
  }))
}, { deep: true })

const visibleColumns = computed(() => localColumns.value.filter((c: any) => c.visible))

const toggleColumn = (col: Column) => {
  const found = localColumns.value.find((c: any) => c.key === col.key)
  if (found) found.visible = !found.visible
}

// Sorting
const sortKey = ref('')
const sortAsc = ref(true)

const sortBy = (key: string) => {
  const col = localColumns.value.find((c: any) => c.key === key)
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
  return paginatedData.value.length > 0 && paginatedData.value.every((item: any) => selectedIds.value.has(item.id))
})
const isIndeterminate = computed(() => {
  const selectedCount = paginatedData.value.filter((item: any) => selectedIds.value.has(item.id)).length
  return selectedCount > 0 && selectedCount < paginatedData.value.length
})

const toggleAll = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  if (checked) {
    paginatedData.value.forEach((item: any) => selectedIds.value.add(item.id))
  } else {
    paginatedData.value.forEach((item: any) => selectedIds.value.delete(item.id))
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
      // Use custom search if provided
      if (props.customSearch) {
        return props.customSearch(item, searchQuery.value)
      }
      
      // Default search: search all keys in the object
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
  if (text === null || text === undefined) return ''
  if (!searchQuery.value) return String(text)
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

  const regexStr = (Array.from(query) as string[]).map((char: string) => buildCharRegex(char)).join('')
  try {
    const regex = new RegExp(`(${regexStr})`, 'gi')
    return String(text).replace(regex, '<mark class="bg-[var(--text-primary)]/30 text-[var(--text-primary)] px-0.5 rounded">$1</mark>')
  } catch (e) {
    return String(text)
  }
}

// Exporters
const handleExport = (format: 'json' | 'xml' | 'csv' | 'pdf') => {
  const title = props.title || 'export'
  const columns = localColumns.value
  const exportData = filteredAndSortedData.value

  switch (format) {
    case 'json':
      exportToJSON(title, columns, exportData)
      break
    case 'xml':
      exportToXML(title, columns, exportData)
      break
    case 'csv':
      exportToCSV(title, columns, exportData)
      break
    case 'pdf':
      exportToPDF(title, columns, exportData)
      break
  }
}

// Pagination
const currentPage = ref(1)
const perPageOptions = [10, 50, 100, 1000]

const totalPages = computed(() => Math.ceil(filteredAndSortedData.value.length / localPerPage.value))
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * localPerPage.value
  const end = start + localPerPage.value
  return filteredAndSortedData.value.slice(start, end)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const pageNumbers = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

watch(() => props.data, () => {
  selectedIds.value.clear()
  currentPage.value = 1
}, { deep: true })

watch(searchQuery, () => {
  currentPage.value = 1
})

watch(() => selectedIds.value, (newSet: Set<string | number>) => {
  emit('update:selected-ids', Array.from(newSet))
}, { deep: true, immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-4">
      
      <!-- Actions Left -->
      <div class="flex items-center gap-2">
        <!-- Column Visibility -->
        <UiDropdown menuClass="absolute left-0 top-full mt-2 w-48 p-2 z-[60]">
          <template #trigger>
            <UiButton 
              variant="outline"
              size="sm"
              icon="lucide:list"
              :title="t('common.columns', 'Sütunlar')"
            />
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

        <!-- Export Dropdown -->
        <UiDropdown menuClass="absolute left-0 top-full mt-2 w-48 p-2 z-[60]">
          <template #trigger>
            <UiButton 
              variant="outline"
              size="sm"
              icon="lucide:download"
              :title="t('common.export', 'İxrac et')"
            />
          </template>

          <template #menu>
            <div @click.stop="handleExport('csv')" class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-[var(--bg-app)] transition-colors">
              <UiIcon name="lucide:file-spreadsheet" class="w-4 h-4 text-[var(--color-brand-success)]" />
              <span>Excel (CSV)</span>
            </div>
            <div @click.stop="handleExport('pdf')" class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-[var(--bg-app)] transition-colors">
              <UiIcon name="lucide:file-text" class="w-4 h-4 text-[var(--color-brand-danger)]" />
              <span>PDF</span>
            </div>
            <div @click.stop="handleExport('json')" class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-[var(--bg-app)] transition-colors">
              <UiIcon name="lucide:file-json" class="w-4 h-4 text-[var(--color-brand-warning)]" />
              <span>JSON</span>
            </div>
            <div @click.stop="handleExport('xml')" class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-[var(--bg-app)] transition-colors">
              <UiIcon name="lucide:code" class="w-4 h-4 text-[var(--text-primary)]" />
              <span>XML</span>
            </div>
          </template>
        </UiDropdown>

        <!-- Add New -->
        <UiButton 
          v-if="showAdd"
          variant="primary"
          size="sm"
          icon="gravity-ui:plus"
          @click="emit('add')"
        >
          {{ t('common.new', 'Yeni') }}
        </UiButton>

        <slot name="extra-actions" />

        <!-- Bulk Actions: Moved to the end of Actions Left to prevent layout shifting -->
        <TransitionGroup name="slide-fade" class="flex items-center gap-2">
          <UiButton 
            v-if="selectedIds.size > 0 && canBulkEdit"
            key="edit"
            variant="soft-primary"
            size="sm"
            icon="lucide:edit-2"
            @click.stop="emit('bulk-edit', Array.from(selectedIds))"
          >
            <span class="hidden sm:inline">{{ t('common.bulkEdit', 'Toplu redaktə') }}</span>
          </UiButton>
          <UiButton 
            v-if="selectedIds.size > 0"
            key="delete"
            variant="soft-danger"
            size="sm"
            icon="lucide:trash-2"
            @click="emit('bulk-delete', Array.from(selectedIds))"
          >
            {{ selectedIds.size }} <span class="hidden sm:inline">{{ t('common.delete', 'Sil') }}</span>
          </UiButton>
        </TransitionGroup>
      </div>

      <!-- Spacer -->
      <div class="flex-1 min-w-[20px]"></div>

      <!-- Search Component Right -->
      <div v-if="searchable !== false" class="w-full sm:w-72">
        <UiInput 
          v-model="searchQuery" 
          :placeholder="t('common.searchInTable', 'Cədvəldə axtar...')" 
          icon="lucide:search" 
          clearable 
        />
      </div>
    </div>

    <!-- Table Card -->
    <div class="bg-[var(--bg-sidebar)] border border-[var(--border-app)] rounded-xl overflow-hidden shadow-sm relative">
      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 bg-[var(--bg-sidebar)]/50 backdrop-blur-sm z-10 flex items-center justify-center">
        <UiIcon name="lucide:loader-2" class="w-3.5 h-3.5 text-[var(--text-primary)] animate-spin" />
      </div>

      <div class="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[calc(100vh-340px)]">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-[var(--bg-app)] text-[var(--text-app)] font-bold tracking-wider text-[11px] sticky top-0 z-20">
            <!-- Add a pseudo-element or border for sticky header to prevent transparent gaps -->
            <tr class="shadow-[0_1px_0_var(--border-app)]">
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
                    :name="sortKey === col.key ? (sortAsc ? 'lucide:arrow-down-up' : 'lucide:arrow-up-down') : 'lucide:arrow-up-down'" 
                    class="w-3.5 h-3.5"
                    :class="sortKey === col.key ? 'text-[var(--text-primary)] opacity-100' : 'opacity-30'"
                  />
                </div>
              </th>

              <!-- Actions Header -->
              <th v-if="actions" class="px-6 py-4 text-right">{{ t('common.actions', 'Aksiyonlar') }}</th>
            </tr>
          </thead>
          
          <tbody class="divide-y divide-[var(--border-app)] text-[var(--text-app)]">
            <template v-if="paginatedData.length > 0">
              <tr 
                v-for="row in paginatedData" 
                :key="row.id"
                class="hover:bg-[var(--bg-app)]/50 transition-colors group"
                :class="[
                  {'bg-[var(--text-primary)]/5': selectedIds.has(row.id)},
                  rowClass ? rowClass(row) : ''
                ]"
              >
                <!-- Multi Select Cell -->
                <td v-if="selectable" class="px-6 py-3 w-12 cursor-pointer" @click.stop="toggleSelect(row.id)">
                  <input 
                    type="checkbox" 
                    class="accent-[var(--text-primary)] w-4 h-4 cursor-pointer pointer-events-none"
                    :checked="selectedIds.has(row.id)"
                  />
                </td>

                <!-- Dynamic Cells -->
                <td 
                  v-for="col in visibleColumns" 
                  :key="col.key" 
                  class="px-6 py-3 cursor-pointer"
                  @click="selectable ? toggleSelect(row.id) : emit('row-click', row)"
                >
                  <!-- Custom Slot Check -->
                  <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :highlight="highlightText">
                    <span v-html="highlightText(row[col.key])"></span>
                  </slot>
                </td>

                <!-- Actions Cell -->
                 <td v-if="actions" class="px-6 py-3 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <slot name="row-actions" :row="row"></slot>
                    <template v-if="showDefaultActions">
                      <div class="relative group/duplicate">
                      <UiButton 
                        variant="ghost"
                        size="icon"
                        icon="lucide:copy"
                        @click.stop="emit('duplicate', row)"
                        class="hover:text-[var(--color-brand-info)] hover:bg-[var(--color-brand-info)]/10 cursor-pointer"
                      />
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/duplicate:opacity-100 pointer-events-none transition-all z-50">
                        {{ t('common.duplicate', 'Kopyala') }}
                      </div>
                    </div>
                    <div class="relative group/edit">
                      <UiButton 
                        variant="ghost"
                        size="icon"
                        icon="lucide:edit-2"
                        @click.stop="emit('edit', row)"
                        class="hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 cursor-pointer"
                      />
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/edit:opacity-100 pointer-events-none transition-all z-50">
                        {{ t('common.edit', 'Düzəliş et') }}
                      </div>
                    </div>
                    <div class="relative group/delete">
                      <UiButton 
                        variant="ghost"
                        size="icon"
                        icon="lucide:trash-2"
                        @click.stop="emit('delete', row)"
                        class="hover:text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/10 cursor-pointer"
                      />
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/delete:opacity-100 pointer-events-none transition-all z-50">
                        {{ t('common.delete', 'Sil') }}
                      </div>
                    </div>
                  </template>
                  </div>
                </td>
              </tr>
            </template>
            <!-- Empty State -->
            <tr v-else>
              <td :colspan="(selectable ? 1 : 0) + visibleColumns.length + (actions ? 1 : 0)" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center justify-center gap-4 opacity-50">
                  <svg class="w-20 h-20 text-[var(--text-app)] opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                  <p class="text-[14px] font-medium tracking-wide">{{ t('common.noData', 'Axtarışınıza uyğun nəticə tapılmadı') }}</p>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Footer Slot for Custom Summary Row -->
          <tfoot v-if="$slots.footer">
            <slot name="footer" :columns="visibleColumns" :selectable="selectable" :actions="actions" />
          </tfoot>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="filteredAndSortedData.length > 0" class="px-6 py-4 border-t border-[var(--border-app)] flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        <!-- Pagination Controls -->
        <div class="flex items-center gap-2">
          <!-- First Page -->
          <button
            @click="goToPage(1)"
            :disabled="currentPage === 1"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-app)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            :class="currentPage === 1 ? 'opacity-30' : ''"
          >
            <UiIcon name="lucide:chevrons-left" class="w-4 h-4" />
          </button>

          <!-- Previous Page -->
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-app)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            :class="currentPage === 1 ? 'opacity-30' : ''"
          >
            <UiIcon name="lucide:chevron-left" class="w-4 h-4" />
          </button>

          <!-- Page Numbers -->
          <div class="flex items-center gap-1">
            <button
              v-for="page in pageNumbers"
              :key="page"
              @click="goToPage(page)"
              class="min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium transition-all cursor-pointer"
              :class="currentPage === page 
                ? 'bg-[var(--text-primary)] text-white shadow-md' 
                : 'border border-[var(--border-app)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'"
            >
              {{ page }}
            </button>
          </div>

          <!-- Next Page -->
          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-app)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            :class="currentPage === totalPages ? 'opacity-30' : ''"
          >
            <UiIcon name="lucide:chevron-right" class="w-4 h-4" />
          </button>

          <!-- Last Page -->
          <button
            @click="goToPage(totalPages)"
            :disabled="currentPage === totalPages"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-app)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            :class="currentPage === totalPages ? 'opacity-30' : ''"
          >
            <UiIcon name="lucide:chevrons-right" class="w-4 h-4" />
          </button>
        </div>

        <!-- Info & Limit Selector -->
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-[var(--text-app)] opacity-60">{{ t('common.show', 'Göstər') }}:</span>
            <select 
              v-model="localPerPage"
              class="bg-[var(--bg-app)] border border-[var(--border-app)] text-[var(--text-app)] text-xs rounded-lg px-2 py-1 outline-none focus:border-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <option v-for="opt in perPageOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          
          <div class="text-sm text-[var(--text-app)] opacity-60 whitespace-nowrap">
            {{ ((currentPage - 1) * localPerPage) + 1 }} - {{ Math.min(currentPage * localPerPage, filteredAndSortedData.length) }} / {{ filteredAndSortedData.length }} {{ t('common.results', 'nəticə') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base transition settings for the slide-fade */
.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(10px);
  opacity: 0;
  filter: blur(2px);
}
</style>

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
