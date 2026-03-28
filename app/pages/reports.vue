<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHead, useToast } from '#imports'
import { useI18n } from '#i18n'
import UiIcon from '~/components/ui/Icon.vue'
import UiButton from '~/components/ui/Button.vue'

import {
  Chart as ChartJS, Title, Tooltip, Legend, Filler,
  BarElement, CategoryScale, LinearScale, PointElement,
  LineElement, ArcElement, LineController, BarController, PieController
} from 'chart.js'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import * as XLSX from 'xlsx'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, ArcElement, Filler,
  LineController, BarController, PieController
)

const { t } = useI18n()
const toast = useToast()
useHead({ title: t('menu.reports') })

// ── Tabs ──
const tabs = computed(() => [
  { id: 'overview', label: t('reports.overview'), icon: 'lucide:layout-dashboard' },
  { id: 'products', label: t('menu.products'), icon: 'lucide:package' },
  { id: 'sales', label: t('menu.sales'), icon: 'lucide:receipt' },
  { id: 'expenses', label: t('menu.expenses'), icon: 'lucide:wallet' },
  { id: 'team', label: t('reports.team'), icon: 'lucide:users' },
])
const activeTab = ref('overview')

// ── Date helpers ──
const toLocal = (d: Date) => {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}
const todayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
const todayEnd   = () => { const d = new Date(); d.setHours(23,59,59,999); return d }

const startDate = ref(toLocal(todayStart()))
const endDate   = ref(toLocal(todayEnd()))
const activeQuickFilter = ref('today')

const quickFilters = computed(() => [
  { id: '1h',        label: t('reports.last1h') },
  { id: 'today',     label: t('dashboard.today') },
  { id: 'yesterday', label: t('dashboard.yesterday') },
  { id: 'week',      label: t('dashboard.thisWeek') },
  { id: 'month',     label: t('dashboard.thisMonth') },
  { id: '3months',   label: t('reports.last3Months') },
])

const setQuickFilter = (type: string) => {
  activeQuickFilter.value = type
  const s = new Date(), e = new Date()
  if (type === '1h')        { s.setHours(s.getHours() - 1) }
  else if (type === 'today')     { s.setHours(0,0,0,0) }
  else if (type === 'yesterday') { s.setDate(s.getDate()-1); s.setHours(0,0,0,0); e.setDate(e.getDate()-1); e.setHours(23,59,59,999) }
  else if (type === 'week')      { s.setDate(s.getDate() - s.getDay() + 1); s.setHours(0,0,0,0) }
  else if (type === 'month')     { s.setDate(1); s.setHours(0,0,0,0) }
  else if (type === '3months')   { s.setMonth(s.getMonth()-3); s.setDate(1); s.setHours(0,0,0,0) }
  startDate.value = toLocal(s)
  endDate.value   = toLocal(e)
  refreshAll()
}

// ── Data ──
const loading = ref(false)
const dashboardData = ref<any>(null)
const productsData  = ref<any>(null)
const salesData     = ref<any>(null)
const expensesData  = ref<any>(null)
const employeesData = ref<any>(null)

const selectedProductId = ref<string|null>(null)
const selectedAttribute = ref<string|null>(null)
const searchProductQuery = ref('')
const searchProductResults = ref<any[]>([])
const productTimelineData = ref<any>(null)

const params = () => `?startDate=${new Date(startDate.value).toISOString()}&endDate=${new Date(endDate.value).toISOString()}`

const fetchDashboard  = async () => { try { dashboardData.value  = await $fetch(`/api/analytics/dashboard${params()}`) } catch {} }
const fetchProducts   = async () => { try { productsData.value   = await $fetch(`/api/analytics/products${params()}`); if (selectedProductId.value) await loadTimeline(selectedProductId.value) } catch {} }
const fetchSales      = async () => { try { salesData.value      = await $fetch(`/api/analytics/sales${params()}`) } catch {} }
const fetchExpenses   = async () => { try { expensesData.value   = await $fetch(`/api/analytics/expenses${params()}`) } catch {} }
const fetchEmployees  = async () => { try { employeesData.value  = await $fetch(`/api/analytics/employees${params()}`) } catch {} }

const refreshAll = async () => {
  loading.value = true
  try {
    if (activeTab.value === 'overview')  await fetchDashboard()
    else if (activeTab.value === 'products')  await fetchProducts()
    else if (activeTab.value === 'sales')     await fetchSales()
    else if (activeTab.value === 'expenses')  await fetchExpenses()
    else if (activeTab.value === 'team')      await fetchEmployees()
  } finally { loading.value = false }
}

watch(activeTab, () => refreshAll())
onMounted(() => refreshAll())

// ── Chart config (Beautiful, Clean, Interactive) ──
const chartOpts = (showLegend = false): any => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { 
      display: showLegend, 
      position: 'bottom',
      labels: { 
        color: 'var(--text-muted)', 
        boxWidth: 8, 
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        font: { size: 11, family: 'SF Pro Display' } 
      } 
    },
    tooltip: {
      backgroundColor: 'var(--input-bg)',
      titleColor: 'var(--text-app)',
      bodyColor: 'var(--text-muted)',
      borderColor: 'var(--border-app)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 12,
      displayColors: true,
      usePointStyle: true,
      boxPadding: 4,
      titleFont: { family: 'SF Pro Display', size: 13, weight: 'bold' },
      bodyFont: { family: 'SF Pro Display', size: 12 }
    }
  },
  scales: {
    x: { 
      ticks: { color: 'var(--text-muted)', font: { size: 10, family: 'SF Pro Display' } }, 
      grid: { display: false }, 
      border: { display: false } 
    },
    y: { 
      ticks: { 
        color: 'var(--text-muted)', 
        font: { size: 10, family: 'SF Pro Display' }, 
        callback: (v: string | number) => Number(v) >= 1000 ? (Number(v)/1000).toFixed(0) + 'k' : v 
      }, 
      grid: { color: 'rgba(128,128,128,0.06)', drawBorder: false }, 
      border: { display: false } 
    }
  },
  interaction: {
    intersect: false,
    mode: 'index',
  }
})

const doughnutOpts: any = {
  responsive: true, 
  maintainAspectRatio: false, 
  cutout: '80%',
  plugins: {
    legend: { display: false },
    tooltip: { 
      backgroundColor: 'var(--input-bg)', 
      titleColor: 'var(--text-app)', 
      bodyColor: 'var(--text-muted)', 
      borderColor: 'var(--border-app)', 
      borderWidth: 1, 
      padding: 12, 
      cornerRadius: 12,
      titleFont: { family: 'SF Pro Display', weight: 'bold' },
      bodyFont: { family: 'SF Pro Display' }
    }
  },
  animation: {
    animateRotate: true,
    animateScale: true
  }
}

// Premium Monochromatic Palette (Purple based)
const CHART_COLORS = [
  '#7367F0', // Primary
  '#8F85F3', 
  '#ABA4F6', 
  '#C8C4F9',
  '#564DB5',
  '#4839EB',
  '#B8AFFF',
  '#E6E2FF',
]

// ── Export ──
const exportExcel = (data: any[], name: string) => {
  if (!data?.length) { toast.error(t('reports.exportDataNotFound')); return }
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${name}_${new Date().toISOString().split('T')[0]}.xlsx`)
  toast.success(t('reports.excelSuccess'))
}

// ── Product Search ──
let searchTimer: any = null
const handleProductSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!searchProductQuery.value) { searchProductResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try { const r = await $fetch<any[]>(`/api/products/search?q=${searchProductQuery.value}`); searchProductResults.value = r.slice(0, 6) } catch {}
  }, 250)
}
const selectProduct = async (p: any) => {
  searchProductQuery.value = p.productName
  searchProductResults.value = []
  selectedProductId.value = p.id.toString()
  await loadTimeline(p.id)
}
const loadTimeline = async (id: string|number) => {
  loading.value = true
  try { productTimelineData.value = await $fetch(`/api/analytics/product-timeline${params()}&productId=${id}`) } catch {}
  loading.value = false
}

const clearTimeline = () => { 
  productTimelineData.value = null
  selectedProductId.value = null
  selectedAttribute.value = null
  searchProductQuery.value = '' 
}

const isAttributeModalOpen = ref(false)

const viewAttributeDetails = (attribute: string) => {
  selectedAttribute.value = attribute
  isAttributeModalOpen.value = true
}

const closeAttributeModal = () => {
  isAttributeModalOpen.value = false
  setTimeout(() => { if (!isAttributeModalOpen.value) selectedAttribute.value = null }, 300)
}

const filteredTimeline = computed(() => {
  if (!productTimelineData.value?.timeline) return []
  if (!selectedAttribute.value) return productTimelineData.value.timeline
  
  // Filter timeline by selected attribute
  return productTimelineData.value.timeline.filter((log: any) => {
    if (log.type === 'INTAKE') return false
    
    if (!log.attribute) return selectedAttribute.value === 'Standart'
    
    // Parse attribute
    let attrKey = 'Standart'
    try {
      const parsed = JSON.parse(log.attribute)
      if (Array.isArray(parsed)) {
        attrKey = parsed.map((a: string) => a.split(':').pop()?.trim()).filter(Boolean).join(', ')
      } else {
        attrKey = log.attribute
      }
    } catch {
      attrKey = log.attribute
    }
    
    return attrKey === selectedAttribute.value
  })
})

const fmt = (n: number) => n?.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'

const dateMenuOpen = ref(false)

const activeFilterLabel = computed(() => {
  const qf = quickFilters.value.find((f: any) => f.id === activeQuickFilter.value)
  return qf ? qf.label : t('reports.selectDate')
})

// ── Pagination for Products Tab ──
const currentPageTopSellers = ref(1)
const currentPageMostRefunded = ref(1)
const itemsPerPage = 8

const paginatedTopSellers = computed(() => {
  if (!productsData.value?.topSellers) return []
  const start = (currentPageTopSellers.value - 1) * itemsPerPage
  return productsData.value.topSellers.slice(start, start + itemsPerPage)
})

const paginatedMostRefunded = computed(() => {
  if (!productsData.value?.mostRefunded) return []
  const start = (currentPageMostRefunded.value - 1) * itemsPerPage
  return productsData.value.mostRefunded.slice(start, start + itemsPerPage)
})

const totalPagesTopSellers = computed(() => Math.ceil((productsData.value?.topSellers?.length || 0) / itemsPerPage))
const totalPagesMostRefunded = computed(() => Math.ceil((productsData.value?.mostRefunded?.length || 0) / itemsPerPage))

// Timeline Pagination
const currentPageTimeline = ref(1)
const paginatedTimeline = computed(() => {
  if (!productTimelineData.value?.timeline) return []
  const start = (currentPageTimeline.value - 1) * itemsPerPage
  return productTimelineData.value.timeline.slice(start, start + itemsPerPage)
})
const totalPagesTimeline = computed(() => Math.ceil((productTimelineData.value?.timeline?.length || 0) / itemsPerPage))

watch(productsData, () => {
  currentPageTopSellers.value = 1
  currentPageMostRefunded.value = 1
})

watch(productTimelineData, () => {
  currentPageTimeline.value = 1
})

const windowWidth = ref(0)
const updateWidth = () => { windowWidth.value = window.innerWidth }
onMounted(() => {
  windowWidth.value = window.innerWidth
  window.addEventListener('resize', updateWidth)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--bg-app)] overflow-hidden font-sans antialiased">

    <!-- ═══ PREMIUM HEADER ═══ -->
    <header class="shrink-0 bg-[var(--bg-app)] border-b border-[var(--border-app)] z-20 backdrop-blur-sm">
      <!-- Dropdown backdrop -->
      <div v-if="dateMenuOpen" @click="dateMenuOpen = false" class="fixed inset-0 z-40"></div>

      <!-- Single Row: Tabs + Actions -->
      <div class="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 py-2 md:h-auto md:min-h-[56px] gap-3">
        <div class="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0 shrink-0">
          <button
            v-for="tab in tabs" :key="tab.id"
            @click="activeTab = tab.id"
            class="group flex items-center gap-2 px-3 md:px-4 h-9 rounded-xl text-[12px] font-black whitespace-nowrap transition-all relative shrink-0"
            :class="activeTab === tab.id
              ? 'text-[var(--text-primary)] bg-[var(--text-primary)]/5'
              : 'text-[var(--text-muted)] hover:text-[var(--text-app)] hover:bg-[var(--input-bg)]'"
          >
            <UiIcon :name="tab.icon" class="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>{{ tab.label }}</span>
            <div v-if="activeTab === tab.id" class="absolute bottom-0 left-0 w-full h-[2.5px] bg-[var(--text-primary)] rounded-full"></div>
          </button>
        </div>

        <div class="flex items-center gap-2 md:gap-3 shrink-0">
          <!-- Date Range Dropdown -->
          <div class="relative flex-1 md:flex-none">
            <button
              @click="dateMenuOpen = !dateMenuOpen"
              class="flex items-center justify-between md:justify-start w-full md:w-auto gap-2.5 h-10 px-4 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl text-xs font-black text-[var(--text-app)] hover:border-[var(--text-primary)]/50 transition-all shadow-sm"
              :class="dateMenuOpen ? 'border-[var(--text-primary)]/50' : ''"
            >
              <div class="flex items-center gap-2">
                <UiIcon name="lucide:calendar" class="w-4 h-4 text-[var(--text-primary)]" />
                <span>{{ activeFilterLabel }}</span>
              </div>
              <UiIcon name="lucide:chevron-down" class="w-3.5 h-3.5 text-[var(--text-muted)] transition-transform" :class="dateMenuOpen ? 'rotate-180' : ''" />
            </button>

            <transition name="scale">
              <div v-if="dateMenuOpen" class="absolute right-0 top-full mt-2 w-72 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl shadow-xl z-50 overflow-hidden">
                <!-- Quick Filters -->
                <div class="p-3 border-b border-[var(--border-app)]/60">
                  <p class="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 mb-2 px-1">{{ t('reports.quickSelection') }}</p>
                  <div class="grid grid-cols-3 gap-1.5">
                    <button
                      v-for="qf in quickFilters" :key="qf.id"
                      @click="setQuickFilter(qf.id); dateMenuOpen = false"
                      class="px-2 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all text-center"
                      :class="activeQuickFilter === qf.id
                        ? 'bg-[var(--text-primary)] text-white'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-app)]'"
                    >
                      {{ qf.label }}
                    </button>
                  </div>
                </div>

                <!-- Custom Date Range -->
                <div class="p-3">
                  <p class="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 mb-2 px-1">{{ t('reports.customRange') }}</p>
                  <div class="space-y-2">
                    <div class="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl px-3 py-2 focus-within:border-[var(--text-primary)]/50 transition-all">
                      <span class="text-[10px] font-black text-[var(--text-muted)] opacity-50 w-10 shrink-0">{{ t('reports.startDate') }}</span>
                      <input type="datetime-local" v-model="startDate" class="flex-1 bg-transparent text-xs font-bold text-[var(--text-app)] outline-none tabular-nums" />
                    </div>
                    <div class="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl px-3 py-2 focus-within:border-[var(--text-primary)]/50 transition-all">
                      <span class="text-[10px] font-black text-[var(--text-muted)] opacity-50 w-10 shrink-0">{{ t('reports.endDate') }}</span>
                      <input type="datetime-local" v-model="endDate" class="flex-1 bg-transparent text-xs font-bold text-[var(--text-app)] outline-none tabular-nums" />
                    </div>
                    <button
                      @click="activeQuickFilter = ''; refreshAll(); dateMenuOpen = false"
                      class="w-full h-9 bg-[var(--text-primary)] text-white rounded-xl text-xs font-black hover:opacity-90 transition-all"
                    >
                      {{ t('reports.apply') }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <button
            @click="activeQuickFilter = ''; refreshAll()"
            class="h-10 w-10 rounded-xl bg-[var(--input-bg)] border border-[var(--border-app)] text-[var(--text-app)] flex items-center justify-center hover:bg-[var(--text-primary)] hover:text-white hover:border-[var(--text-primary)] transition-all active:scale-95"
            :title="t('common.update')"
          >
            <UiIcon name="lucide:rotate-cw" class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
          </button>
        </div>
      </div>
    </header>

    <!-- ═══ MAIN CONTENT AREA ═══ -->
    <main class="flex-1 overflow-y-auto custom-scrollbar relative p-3 sm:p-6 lg:p-8">
      
      <!-- Loading Overlay -->
      <transition name="fade">
        <div v-if="loading" class="absolute inset-0 bg-[var(--bg-app)]/40 z-50 flex items-center justify-center backdrop-blur-[1px]">
          <div class="flex flex-col items-center gap-4 bg-[var(--input-bg)] border border-[var(--border-app)] p-8 rounded-3xl shadow-2xl">
            <div class="relative">
              <div class="w-12 h-12 rounded-full border-4 border-[var(--text-primary)]/10 border-t-[var(--text-primary)] animate-spin"></div>
              <UiIcon name="lucide:activity" class="absolute inset-0 flex items-center justify-center w-5 h-5 m-auto text-[var(--text-primary)]" />
            </div>
            <span class="text-sm font-black text-[var(--text-app)] opacity-60 animate-pulse">{{ t('reports.analyzing') }}</span>
          </div>
        </div>
      </transition>

      <!-- ══════════════════════════ -->
      <!-- TAB: OVERVIEW                   -->
      <!-- ══════════════════════════ -->
      <div v-if="activeTab === 'overview'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div v-if="dashboardData">

          <!-- 1. Key Performance Indicators -->
          <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6">
            <div class="kpi-card group border-l-4 border-l-blue-500">
              <div class="kpi-header">
                <div class="kpi-icon-box bg-blue-500/10 text-blue-500">
                  <UiIcon name="lucide:line-chart" class="w-4 h-4" />
                </div>
                <span class="kpi-label">{{ t('reports.turnover') }}</span>
              </div>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ fmt(dashboardData.kpis.grossRevenue) }}</span>
                <span class="kpi-currency">₼</span>
              </div>
            </div>

            <div class="kpi-card group border-l-4 border-l-emerald-500">
              <div class="kpi-header">
                <div class="kpi-icon-box bg-emerald-500/10 text-emerald-500">
                  <UiIcon name="lucide:trending-up" class="w-4 h-4" />
                </div>
                <span class="kpi-label">{{ t('reports.netIncome') }}</span>
              </div>
              <div class="kpi-value-row">
                <span class="kpi-value" :class="dashboardData.kpis.netRevenue < 0 && 'text-red-500'">{{ fmt(dashboardData.kpis.netRevenue) }}</span>
                <span class="kpi-currency">₼</span>
              </div>
            </div>

            <div class="kpi-card group border-l-4 border-l-[var(--text-primary)]">
              <div class="kpi-header">
                <div class="kpi-icon-box bg-[var(--text-primary)]/10 text-[var(--text-primary)]">
                  <UiIcon name="lucide:shredder" class="w-4 h-4" />
                </div>
                <span class="kpi-label">{{ t('reports.grossProfit') }}</span>
              </div>
              <div class="kpi-value-row">
                <span class="kpi-value" :class="dashboardData.kpis.grossProfit < 0 && 'text-red-500'">{{ fmt(dashboardData.kpis.grossProfit) }}</span>
                <span class="kpi-currency">₼</span>
              </div>
            </div>

            <div class="kpi-card group border-l-4 border-l-amber-500">
              <div class="kpi-header">
                <div class="kpi-icon-box bg-amber-500/10 text-amber-500">
                  <UiIcon name="lucide:zap" class="w-4 h-4" />
                </div>
                <span class="kpi-label">{{ t('reports.avgReceipt') }}</span>
              </div>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ fmt(dashboardData.kpis.avgOrderValue) }}</span>
                <span class="kpi-currency">₼</span>
              </div>
            </div>

            <div class="kpi-card group border-l-4 border-l-indigo-500">
              <div class="kpi-header">
                <div class="kpi-icon-box bg-indigo-500/10 text-indigo-500">
                  <UiIcon name="lucide:shopping-bag" class="w-4 h-4" />
                </div>
                <span class="kpi-label">{{ t('reports.transaction') }}</span>
              </div>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ dashboardData.kpis.totalTransactions }}</span>
              </div>
            </div>

            <div class="kpi-card group border-l-4 border-l-rose-500">
              <div class="kpi-header">
                <div class="kpi-icon-box bg-rose-500/10 text-rose-500">
                  <UiIcon name="lucide:rotate-ccw" class="w-4 h-4" />
                </div>
                <span class="kpi-label">{{ t('orders.refund') }}</span>
              </div>
              <div class="kpi-value-row">
                <span class="kpi-value text-rose-500">{{ dashboardData.kpis.refundRate.toFixed(1) }}%</span>
              </div>
            </div>
          </div>

          <!-- 2. Detailed Grid Stats -->
          <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 py-4">
            <div class="mini-stat-card">
              <div class="mini-stat-icon text-rose-500"><UiIcon name="lucide:arrow-down-right" class="w-5 h-5" /></div>
              <div class="mini-stat-content">
                <p class="mini-stat-label">{{ t('orders.refund') }}</p>
                <p class="mini-stat-value text-rose-500">{{ fmt(dashboardData.kpis.totalRefunds) }} ₼</p>
              </div>
            </div>
            <div class="mini-stat-card">
              <div class="mini-stat-icon text-amber-500"><UiIcon name="lucide:scissors" class="w-5 h-5" /></div>
              <div class="mini-stat-content">
                <p class="mini-stat-label">{{ t('orders.totalDiscount') }}</p>
                <p class="mini-stat-value text-amber-600">{{ fmt(dashboardData.kpis.totalDiscount) }} ₼</p>
              </div>
            </div>
            <div class="mini-stat-card">
              <div class="mini-stat-icon text-blue-500"><UiIcon name="lucide:package-2" class="w-5 h-5" /></div>
              <div class="mini-stat-content">
                <p class="mini-stat-label">{{ t('reports.productSales') }}</p>
                <p class="mini-stat-value">{{ dashboardData.kpis.totalItemsSold }} {{ t('dashboard.pieces') }}</p>
              </div>
            </div>
            <div class="mini-stat-card">
              <div class="mini-stat-icon text-emerald-500"><UiIcon name="lucide:container" class="w-5 h-5" /></div>
              <div class="mini-stat-content">
                <p class="mini-stat-label">{{ t('reports.intakeVolume') }}</p>
                <p class="mini-stat-value">{{ fmt(dashboardData.kpis.totalIntakesValue) }} ₼</p>
              </div>
            </div>
          </div>

          <!-- 3. Primary Charts Section -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div class="lg:col-span-2 card-premium">
              <div class="card-header-premium p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <UiIcon name="lucide:timer" class="w-5 h-5 text-[var(--text-primary)]" />
                  <h3 class="card-title-premium text-sm md:text-base font-black">{{ t('reports.hourlyActivity') }}</h3>
                </div>
                <div class="flex items-center gap-4 shrink-0">
                  <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-[var(--text-primary)]"></div><span class="text-[10px] uppercase font-black opacity-60">{{ t('orders.sale') }}</span></div>
                  <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-[var(--border-app)]"></div><span class="text-[10px] uppercase font-black opacity-60">{{ t('orders.refund') }}</span></div>
                </div>
              </div>
              <div class="h-[300px] w-full px-2 overflow-x-auto no-scrollbar">
                <div class="h-full min-w-[600px] md:min-w-0">
                  <Bar
                    :data="{
                      labels: dashboardData.hourlyChart.labels,
                      datasets: [
                        { label: t('orders.sale'), data: dashboardData.hourlyChart.revenue, backgroundColor: '#7367F0', borderRadius: 4, barThickness: windowWidth < 640 ? 8 : 12 },
                        { label: t('orders.refund'), data: dashboardData.hourlyChart.refunds, backgroundColor: 'rgba(var(--border-app-rgb, 200, 200, 200), 0.5)', borderRadius: 4, barThickness: windowWidth < 640 ? 8 : 12 }
                      ]
                    }"
                    :options="chartOpts(false)"
                  />
                </div>
              </div>
            </div>

            <div class="card-premium">
              <div class="card-header-premium p-4 md:p-6">
                <div class="flex items-center gap-3">
                  <UiIcon name="lucide:flame" class="w-5 h-5 text-rose-500" />
                  <h3 class="card-title-premium text-sm md:text-base font-black">{{ t('reports.incomeTrend') }}</h3>
                </div>
              </div>
              <div class="h-[250px] md:h-[300px] w-full px-2">
                <Line
                  :data="{
                    labels: dashboardData.dailyChart.labels,
                    datasets: [{
                      label: t('reports.profit'),
                      data: dashboardData.dailyChart.profit,
                      borderColor: '#7367F0',
                      borderWidth: 3,
                      backgroundColor: (context : any) => {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(115, 103, 240, 0)');
                        gradient.addColorStop(1, 'rgba(115, 103, 240, 0.1)');
                        return gradient;
                      },
                      tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6, pointHitRadius: 10,
                      pointBackgroundColor: '#7367F0', pointBorderWidth: 2, pointBorderColor: '#fff'
                    }]
                  }"
                  :options="chartOpts(false)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════ -->
      <!-- TAB: PRODUCTS                   -->
      <!-- ══════════════════════════ -->
      <div v-else-if="activeTab === 'products'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" v-if="productsData">
          
          <div class="card-premium">
            <div class="card-header-premium">
              <div class="flex items-center gap-3">
                <UiIcon name="lucide:star" class="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 class="card-title-premium">{{ t('reports.topSellers') }}</h3>
              </div>
              <button @click="exportExcel(productsData.topSellers, 'BestSellers')" class="btn-action">
                <UiIcon name="lucide:download" class="w-3.5 h-3.5" />
                <span>{{ t('common.export') }}</span>
              </button>
            </div>
            
            <div class="divide-y divide-[var(--border-app)]/50 px-2 flex-1">
              <div
                v-for="(p, idx) in paginatedTopSellers" :key="p.id"
                @click="selectProduct(p)"
                class="list-item group"
              >
                <div class="w-8 h-8 rounded-lg bg-[var(--input-bg)] border border-[var(--border-app)] flex items-center justify-center text-[11px] font-black opacity-40 group-hover:bg-[var(--text-primary)] group-hover:text-white group-hover:opacity-100 group-hover:border-transparent transition-all">
                  {{ ((currentPageTopSellers - 1) * itemsPerPage) + Number(idx) + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-[var(--text-app)] truncate">{{ p.name }}</p>
                  <p class="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">{{ p.soldQty }} {{ t('reports.itemsSold') }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-black text-[var(--text-app)] tabular-nums">{{ fmt(p.totalRevenue) }} ₼</p>
                  <div class="h-1.5 w-16 bg-blue-500/10 rounded-full mt-1.5 overflow-hidden ml-auto">
                    <div class="h-full bg-blue-500" :style="{ width: `${(p.soldQty / productsData.topSellers[0].soldQty) * 100}%` }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination Controls -->
            <div v-if="totalPagesTopSellers > 1" class="p-4 border-t border-[var(--border-app)]/30 flex items-center justify-between">
              <button 
                @click="currentPageTopSellers--" 
                :disabled="currentPageTopSellers === 1"
                class="p-2 rounded-lg hover:bg-[var(--bg-app)] disabled:opacity-20 transition-all"
              >
                <UiIcon name="lucide:chevron-left" class="w-4 h-4" />
              </button>
              <span class="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">{{ currentPageTopSellers }} / {{ totalPagesTopSellers }}</span>
              <button 
                @click="currentPageTopSellers++" 
                :disabled="currentPageTopSellers === totalPagesTopSellers"
                class="p-2 rounded-lg hover:bg-[var(--bg-app)] disabled:opacity-20 transition-all"
              >
                <UiIcon name="lucide:chevron-right" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="card-premium">
            <div class="card-header-premium">
              <div class="flex items-center gap-3">
                <UiIcon name="lucide:undo" class="w-5 h-5 text-rose-500" />
                <h3 class="card-title-premium">{{ t('reports.mostRefunded') }}</h3>
              </div>
            </div>
            
            <div class="divide-y divide-[var(--border-app)]/50 px-2 flex-1">
              <div
                v-for="(p, idx) in paginatedMostRefunded" :key="p.id"
                @click="selectProduct(p)"
                class="list-item group"
              >
                <div class="w-8 h-8 rounded-lg bg-[var(--input-bg)] border border-[var(--border-app)] flex items-center justify-center text-[11px] font-black opacity-40 group-hover:bg-rose-500 group-hover:text-white group-hover:opacity-100 group-hover:border-transparent transition-all">
                  {{ ((currentPageMostRefunded - 1) * itemsPerPage) + Number(idx) + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-[var(--text-app)] truncate">{{ p.name }}</p>
                  <p class="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">{{ p.refundQty }} {{ t('reports.itemsRefunded') }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-black text-rose-500 tabular-nums">{{ p.refundQty }}</p>
                  <div class="h-1.5 w-16 bg-rose-500/10 rounded-full mt-1.5 overflow-hidden ml-auto">
                    <div class="h-full bg-rose-500" :style="{ width: `${(p.refundQty / productsData.mostRefunded[0].refundQty) * 100}%` }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination Controls -->
            <div v-if="totalPagesMostRefunded > 1" class="p-4 border-t border-[var(--border-app)]/30 flex items-center justify-between">
              <button 
                @click="currentPageMostRefunded--" 
                :disabled="currentPageMostRefunded === 1"
                class="p-2 rounded-lg hover:bg-[var(--bg-app)] disabled:opacity-20 transition-all"
              >
                <UiIcon name="lucide:chevron-left" class="w-4 h-4" />
              </button>
              <span class="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">{{ currentPageMostRefunded }} / {{ totalPagesMostRefunded }}</span>
              <button 
                @click="currentPageMostRefunded++" 
                :disabled="currentPageMostRefunded === totalPagesMostRefunded"
                class="p-2 rounded-lg hover:bg-[var(--bg-app)] disabled:opacity-20 transition-all"
              >
                <UiIcon name="lucide:chevron-right" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Deep Analyze: Product Timeline -->
        <div class="card-premium">
          <div class="card-header-premium">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><UiIcon name="lucide:search" class="w-4 h-4" /></div>
              <h3 class="card-title-premium">{{ t('reports.productAnalysis') }}</h3>
            </div>
            <div v-if="productTimelineData" class="flex flex-wrap gap-2">
              <div class="px-3 py-1 bg-green-500/5 border border-green-500/20 rounded-lg text-green-600 text-[11px] font-black tabular-nums">P&L: {{ fmt(productTimelineData.netRevenue) }} ₼</div>
              <div class="px-3 py-1 bg-blue-500/5 border border-blue-500/20 rounded-lg text-blue-600 text-[11px] font-black tabular-nums">STOK: {{ productTimelineData.product.stock }}</div>
              <button @click="clearTimeline" class="hover:text-red-500 transition-colors"><UiIcon name="lucide:x-circle" class="w-5 h-5" /></button>
            </div>
          </div>

          <div class="p-4 sm:p-6">
            <div class="relative max-w-xl mb-6 sm:mb-8">
              <UiIcon name="lucide:search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                v-model="searchProductQuery"
                @input="handleProductSearch"
                :placeholder="t('reports.searchForAnalysis')"
                class="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl pl-11 pr-4 py-4 text-sm font-bold outline-none ring-offset-[var(--bg-app)] focus:ring-2 focus:ring-[var(--text-primary)]/20 transition-all placeholder:font-normal placeholder:opacity-40"
              />
              <transition name="scale">
                <div v-if="searchProductResults.length" class="absolute top-full mt-2 left-0 w-full bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl shadow-xl z-50 overflow-hidden ring-1 ring-black/5">
                  <div
                    v-for="r in searchProductResults" :key="r.id"
                    @click="selectProduct(r)"
                    class="flex justify-between items-center px-5 py-4 hover:bg-[var(--text-primary)]/5 cursor-pointer transition-colors border-b border-[var(--border-app)] last:border-0 group"
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 bg-[var(--bg-app)] rounded-lg flex items-center justify-center group-hover:bg-white"><UiIcon name="lucide:package" class="w-4 h-4 opacity-40" /></div>
                      <span class="font-bold text-sm text-[var(--text-app)]">{{ r.productName }}</span>
                    </div>
                    <span class="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-40">{{ r.barcode }}</span>
                  </div>
                </div>
              </transition>
            </div>

            <div v-if="productTimelineData" class="space-y-4">
              <div class="flex items-center gap-4 mb-6">
                <div class="w-14 h-14 rounded-2xl bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)]"><UiIcon name="lucide:layers" class="w-7 h-7" /></div>
                <div>
                   <h2 class="text-xl font-black text-[var(--text-app)]">{{ productTimelineData.product.productName }}</h2>
                   <p class="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase">{{ productTimelineData.product.barcode }} · {{ t('reports.last') }} {{ productTimelineData.timeline.length }} {{ t('reports.operations') }}</p>
                </div>
              </div>

              <!-- Attribute Breakdown -->
              <div v-if="productTimelineData.attributeStats && productTimelineData.attributeStats.length > 0" class="mb-6">
                <h3 class="text-sm font-black text-[var(--text-app)] mb-3 uppercase tracking-wider opacity-60">{{ t('reports.salesByAttribute') }}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div 
                    v-for="(stat, idx) in productTimelineData.attributeStats" 
                    :key="idx" 
                    class="p-4 bg-[var(--bg-app)] border rounded-xl transition-all relative group"
                    :class="selectedAttribute === stat.attribute ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/5' : 'border-[var(--border-app)]'"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">{{ stat.attribute }}</span>
                      <button 
                        @click="viewAttributeDetails(stat.attribute)"
                        class="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        :class="'bg-[var(--bg-app)] text-[var(--text-muted)] hover:bg-[var(--text-primary)] hover:text-white'"
                        :title="t('reports.salesHistory')"
                      >
                        <UiIcon name="lucide:eye" class="w-4 h-4" />
                      </button>
                    </div>
                    <div class="flex items-baseline gap-2 mb-1">
                      <span class="text-lg font-black text-[var(--text-app)] tabular-nums">{{ fmt(stat.totalRevenue) }}</span>
                      <span class="text-xs text-[var(--text-muted)] opacity-60">₼</span>
                    </div>
                    <div class="flex items-center justify-between text-[10px] font-bold">
                      <span class="text-emerald-500">{{ stat.soldQty }} {{ t('reports.piecesSold') }}</span>
                      <span v-if="stat.refundQty > 0" class="text-rose-500">{{ stat.refundQty }} {{ t('reports.refunded') }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="relative pl-8 space-y-4 before:absolute before:left-[15px] before:top-4 before:h-[calc(100%-32px)] before:w-px before:bg-[var(--border-app)]">
                <div v-for="(log, i) in paginatedTimeline" :key="i" class="relative group">
                  <div class="absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-2 border-[var(--bg-app)] z-10" :class="{ 'bg-blue-500': log.type === 'INTAKE', 'bg-emerald-500': log.type === 'SALE', 'bg-rose-500': log.type === 'REFUND' }"></div>
                  <div class="p-4 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl flex items-center gap-4 transition-all hover:border-[var(--text-primary)]/40 hover:-translate-y-0.5">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-[var(--text-app)]">{{ t(log.details) }}</p>
                      <p class="text-[11px] font-bold opacity-40 tabular-nums uppercase">{{ new Date(log.date).toLocaleString('az-AZ') }} · {{ log.receiptNo }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-black tabular-nums" :class="{ 'text-blue-500': log.type === 'INTAKE', 'text-emerald-500': log.type === 'SALE', 'text-rose-500': log.type === 'REFUND' }">
                        {{ log.qty > 0 ? '+' : '' }}{{ log.qty }}
                      </p>
                      <p class="text-[10px] font-bold opacity-30">{{ log.amount?.toFixed(2) }} ₼</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Pagination for Timeline -->
              <div v-if="totalPagesTimeline > 1" class="mt-6 flex items-center justify-center gap-4 py-4 border-t border-[var(--border-app)]/30">
                <button 
                  @click="currentPageTimeline--" 
                  :disabled="currentPageTimeline === 1"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border-app)] text-xs font-bold hover:bg-[var(--text-primary)] hover:text-white disabled:opacity-20 transition-all"
                >
                  <UiIcon name="lucide:chevron-left" class="w-3.5 h-3.5" />
                  {{ t('common.previous') }}
                </button>
                <span class="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">{{ currentPageTimeline }} / {{ totalPagesTimeline }}</span>
                <button 
                  @click="currentPageTimeline++" 
                  :disabled="currentPageTimeline === totalPagesTimeline"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border-app)] text-xs font-bold hover:bg-[var(--text-primary)] hover:text-white disabled:opacity-20 transition-all"
                >
                  {{ t('common.next') }}
                  <UiIcon name="lucide:chevron-right" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div v-else class="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]/40">
              <UiIcon name="lucide:database" class="w-16 h-16 mb-4 stroke-[1]" />
              <p class="text-sm font-bold">{{ t('reports.searchingData') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════ -->
      <!-- TAB: SALES                      -->
      <!-- ══════════════════════════ -->
      <div v-else-if="activeTab === 'sales'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
             <div class="w-2 h-8 bg-[var(--text-primary)] rounded-full"></div>
             <h2 class="text-lg sm:text-xl font-black text-[var(--text-app)] tracking-tight">{{ t('reports.operationHistory') }}</h2>
          </div>
          <button @click="exportExcel(salesData?.sales || [], 'SalesHistory')" class="btn-premium-action self-start sm:self-auto">
            <UiIcon name="lucide:file-spreadsheet" class="w-4 h-4" />
            <span>{{ t('reports.excelReport') }}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <!-- Payment Methods: appears below table on mobile, left on desktop -->
          <div class="card-premium h-fit lg:order-first order-last">
            <div class="p-5 border-b border-[var(--border-app)]/50">
               <h3 class="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">{{ t('reports.paymentMethods') }}</h3>
            </div>
            <div class="p-6">
              <div class="h-[200px] mb-8 relative" v-if="salesData?.paymentMethods">
                <Doughnut
                  :data="{ labels: salesData.paymentMethods.labels, datasets: [{ data: salesData.paymentMethods.data, backgroundColor: CHART_COLORS, borderJoinStyle: 'round', borderRadius: 4, spacing: 2 }] }"
                  :options="doughnutOpts"
                />
                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span class="text-xs font-black opacity-30 uppercase tracking-widest">{{ t('common.total') }}</span>
                  <span class="text-lg font-black tabular-nums">{{ fmt(salesData.paymentMethods.data.reduce((a:number,b:number)=>a+b, 0)) }} ₼</span>
                </div>
              </div>
              <div class="space-y-3" v-if="salesData?.paymentMethods">
                <div v-for="(label, idx) in salesData.paymentMethods.labels" :key="label" class="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-app)]/50 border border-transparent hover:border-[var(--border-app)] transition-all">
                  <div class="w-3 h-3 rounded-md shrink-0" :style="{ backgroundColor: CHART_COLORS[Number(idx) % CHART_COLORS.length] }"></div>
                  <span class="flex-1 text-[12px] font-bold text-[var(--text-app)] opacity-70">{{ label }}</span>
                  <span class="text-[12px] font-black tabular-nums">{{ fmt(salesData.paymentMethods.data[Number(idx)]) }} <span class="opacity-30">₼</span></span>
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-3 card-premium overflow-hidden">
            <!-- Desktop Table View -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr class="bg-[var(--bg-app)]/50 backdrop-blur-sm">
                    <th class="th-premium first:pl-6">{{ t('reports.dateTime') }}</th>
                    <th class="th-premium">{{ t('reports.docNo') }}</th>
                    <th class="th-premium">{{ t('sales.cashier') }}</th>
                    <th class="th-premium">{{ t('reports.contractor') }}</th>
                    <th class="th-premium text-right">{{ t('sales.discount') }}</th>
                    <th class="th-premium text-right last:pr-6">{{ t('sales.total') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--border-app)]/50">
                  <tr v-for="sale in salesData?.sales" :key="sale.id" class="tr-premium group">
                    <td class="td-premium first:pl-6">
                      <div class="flex flex-col">
                        <span class="font-bold text-[var(--text-app)]">{{ new Date(sale.createdAt).toLocaleDateString('az-AZ') }}</span>
                        <span class="text-[10px] font-bold opacity-30 mt-0.5">{{ new Date(sale.createdAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) }}</span>
                      </div>
                    </td>
                    <td class="td-premium font-black text-[var(--text-primary)] tabular-nums">{{ sale.receiptNo }}</td>
                    <td class="td-premium font-bold text-[var(--text-app)] opacity-60">{{ sale.cashierName || t('reports.system') }}</td>
                    <td class="td-premium">
                      <div class="flex items-center gap-2">
                        <div class="w-5 h-5 rounded-full bg-[var(--bg-app)] flex items-center justify-center text-[8px] font-black">{{ (sale.customerName || 'A')[0] }}</div>
                        <span class="font-bold text-xs">{{ sale.customerName || t('orders.anonymousCustomer') }}</span>
                      </div>
                    </td>
                    <td class="td-premium text-right tabular-nums text-rose-500 font-bold">{{ sale.discountTotal > 0 ? '-' + fmt(sale.discountTotal) : '—' }}</td>
                    <td class="td-premium text-right tabular-nums font-black text-sm pr-6" :class="sale.finalTotal < 0 && 'text-rose-600'">{{ fmt(sale.finalTotal) }} ₼</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Card View -->
            <div class="md:hidden divide-y divide-[var(--border-app)]/50">
              <div v-for="sale in salesData?.sales" :key="sale.id" class="p-4 flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-black text-[var(--text-primary)] tabular-nums">{{ sale.receiptNo }}</span>
                  <span class="text-[11px] font-bold text-[var(--text-muted)] opacity-50">{{ new Date(sale.createdAt).toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' }) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-[var(--bg-app)] flex items-center justify-center text-[10px] font-black border border-[var(--border-app)]">{{ (sale.customerName || 'A')[0] }}</div>
                    <span class="text-xs font-black text-[var(--text-app)]">{{ sale.customerName || t('orders.anonymousCustomer') }}</span>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-black tabular-nums" :class="sale.finalTotal < 0 ? 'text-rose-600' : 'text-[var(--text-app)]'">{{ fmt(sale.finalTotal) }} ₼</p>
                    <p v-if="sale.discountTotal > 0" class="text-[10px] font-bold text-rose-500">-{{ fmt(sale.discountTotal) }} ₼ {{ t('sales.discount').toLowerCase() }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] opacity-60">
                   <UiIcon name="lucide:user" class="w-3 h-3" />
                   <span>{{ sale.cashierName || t('reports.system') }}</span>
                </div>
              </div>
            </div>

            <div v-if="!salesData?.sales?.length" class="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] opacity-20">
              <UiIcon name="lucide:inbox" class="w-16 h-16 mb-2" />
              <p class="text-sm font-black uppercase tracking-widest">{{ t('reports.noOperationsFound') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════ -->
      <!-- TAB: EXPENSES                   -->
      <!-- ══════════════════════════ -->
      <div v-else-if="activeTab === 'expenses'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="card-premium h-fit">
            <div class="p-6 border-b border-[var(--border-app)]/50">
               <h3 class="text-sm font-black text-[var(--text-app)]">{{ t('reports.categoryDistribution') }}</h3>
            </div>
            <div class="p-8">
              <div class="h-[220px] mb-8 relative" v-if="expensesData?.categoryChart">
                <Doughnut
                  :data="{ labels: expensesData.categoryChart.labels, datasets: [{ data: expensesData.categoryChart.data, backgroundColor: CHART_COLORS, borderRadius: 5, spacing: 3 }] }"
                  :options="doughnutOpts"
                />
              </div>
              <div class="space-y-4" v-if="expensesData?.categoryChart">
                <div v-for="(label, idx) in expensesData.categoryChart.labels" :key="label" class="flex items-center gap-4">
                  <div class="w-1 h-8 rounded-full" :style="{ backgroundColor: CHART_COLORS[Number(idx) % CHART_COLORS.length] }"></div>
                  <div class="flex-1">
                    <p class="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">{{ label }}</p>
                    <p class="text-[14px] font-black text-rose-500 tabular-nums">-{{ fmt(expensesData.categoryChart.data[Number(idx)]) }} <span class="text-[10px] opacity-40">₼</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-2 card-premium overflow-hidden">
            <div class="p-4 md:p-6 border-b border-[var(--border-app)]/50 flex flex-col sm:flex-row justify-between items-center bg-[var(--bg-app)]/30 gap-4">
               <h3 class="text-sm font-black text-[var(--text-app)]">{{ t('reports.expenseJournal') }}</h3>
               <button @click="exportExcel(expensesData?.expenses || [], 'Expenses')" class="btn-action w-full sm:w-auto justify-center">{{ t('common.export') }}</button>
            </div>
            
            <!-- Desktop Table View -->
            <div class="hidden md:block overflow-x-auto overflow-y-auto" style="max-height: 600px;">
              <table class="w-full text-left">
                <thead class="sticky top-0 bg-[var(--bg-app)] z-10">
                  <tr>
                    <th class="th-premium first:pl-8">{{ t('common.date') }}</th>
                    <th class="th-premium">{{ t('reports.typeCategory') }}</th>
                    <th class="th-premium">{{ t('common.operator') }}</th>
                    <th class="th-premium">{{ t('reports.details') }}</th>
                    <th class="th-premium text-right last:pr-8">{{ t('sales.amount') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--border-app)]/50">
                  <tr v-for="exp in expensesData?.expenses" :key="exp.id" class="tr-premium group">
                    <td class="td-premium first:pl-8 font-bold opacity-70">{{ new Date(exp.createdAt).toLocaleDateString('az-AZ') }}</td>
                    <td class="td-premium">
                      <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--border-app)]/30 text-[10px] font-black uppercase tracking-widest text-[var(--text-app)] border border-[var(--border-app)]">{{ exp.category || t('reports.internal') }}</span>
                    </td>
                    <td class="td-premium text-[12px] font-bold opacity-60">{{ exp.employeeName || t('reports.system') }}</td>
                    <td class="td-premium text-[12px] max-w-[200px] truncate opacity-50">{{ exp.notes || '-' }}</td>
                    <td class="td-premium text-right font-black text-rose-600 pr-8">-{{ fmt(exp.amount) }} ₼</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Card View -->
            <div class="md:hidden divide-y divide-[var(--border-app)]/50">
              <div v-for="exp in expensesData?.expenses" :key="exp.id" class="p-4 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-lg bg-[var(--border-app)]/30 text-[9px] font-black uppercase tracking-widest text-[var(--text-app)] border border-[var(--border-app)]">{{ exp.category || t('reports.internal') }}</span>
                  <span class="text-[10px] font-bold text-[var(--text-muted)] opacity-50">{{ new Date(exp.createdAt).toLocaleDateString('az-AZ') }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[var(--text-app)]">{{ exp.notes || '-' }}</span>
                  <span class="text-sm font-black text-rose-600 tabular-nums">-{{ fmt(exp.amount) }} ₼</span>
                </div>
                <div class="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] opacity-60">
                   <UiIcon name="lucide:user" class="w-3 h-3" />
                   <span>{{ exp.employeeName || t('reports.system') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════ -->
      <!-- TAB: TEAM                       -->
      <!-- ══════════════════════════ -->
      <div v-else-if="activeTab === 'team'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700" v-if="employeesData">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <!-- Cashier Section -->
          <div class="card-premium">
            <div class="card-header-premium">
              <div class="flex items-center gap-3">
                <UiIcon name="lucide:users-2" class="w-5 h-5 text-[var(--text-primary)]" />
                <h3 class="card-title-premium">{{ t('reports.cashierPerformance') }}</h3>
              </div>
            </div>

            <div class="p-6">
              <div class="h-[220px] mb-10" v-if="employeesData.cashiers.length">
                <Bar
                  :data="{
                    labels: employeesData.cashiers.map((c: any) => c.name),
                    datasets: [
                      { label: t('orders.sale') + ' (₼)', data: employeesData.cashiers.map((c: any) => c.totalRevenue), backgroundColor: '#7367F0', borderRadius: 6, barThickness: windowWidth < 640 ? 12 : 30 },
                      { label: t('orders.totalDiscount') + ' (₼)', data: employeesData.cashiers.map((c: any) => c.totalDiscount), backgroundColor: 'rgba(115,103,240,0.15)', borderRadius: 6, barThickness: windowWidth < 640 ? 12 : 30 }
                    ]
                  }"
                  :options="chartOpts(true)"
                />
              </div>

              <div class="space-y-3">
                <div v-for="(c, idx) in employeesData.cashiers" :key="c.name" class="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-app)]/50 border border-[var(--border-app)] transition-all hover:bg-white hover:border-[var(--text-primary)]/20">
                  <div class="w-10 h-10 rounded-xl bg-[var(--text-primary)]/10 text-[var(--text-primary)] flex items-center justify-center font-black text-sm">{{ Number(idx) + 1 }}</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-black text-[var(--text-app)]">{{ c.name }}</p>
                    <p class="text-[11px] font-bold text-rose-500 opacity-60">{{ t('orders.totalDiscount') }}: {{ fmt(c.totalDiscount) }} ₼</p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-black text-[var(--text-app)] tabular-nums">{{ fmt(c.totalRevenue) }} <span class="text-xs opacity-30">₼</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- VIP Customer Section -->
          <div class="card-premium">
            <div class="card-header-premium">
              <div class="flex items-center gap-3">
                <UiIcon name="lucide:gem" class="w-5 h-5 text-amber-500" />
                <h3 class="card-title-premium">{{ t('reports.loyalCustomers') }}</h3>
              </div>
            </div>

            <div class="p-6">
              <div class="grid grid-cols-1 gap-3">
                  <div v-for="(c, idx) in employeesData.topCustomers" :key="c.name" class="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl bg-[var(--input-bg)] group hover:bg-[var(--text-primary)] hover:text-white transition-all">
                    <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[var(--bg-app)] flex items-center justify-center text-[var(--text-primary)] group-hover:bg-white/20 group-hover:text-white transition-colors shrink-0">
                      <UiIcon v-if="Number(idx) === 0" name="lucide:medal" class="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                      <span v-else class="text-[10px] md:text-xs font-black">{{ Number(idx) + 1 }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs md:text-sm font-black group-hover:text-white truncate">{{ c.name }}</p>
                      <p class="text-[9px] md:text-[10px] font-bold opacity-40 uppercase tracking-widest group-hover:text-white/60">VIP Client</p>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-sm md:text-lg font-black tabular-nums group-hover:text-white">{{ fmt(c.totalSpent) }} <span class="text-[10px] md:text-xs opacity-30">₼</span></p>
                    </div>
                  </div>
                <div v-if="!employeesData.topCustomers.length" class="flex flex-col items-center justify-center py-20 opacity-20">
                  <UiIcon name="lucide:users" class="w-16 h-16 mb-2" />
                  <p class="text-xs font-bold uppercase tracking-widest">{{ t('common.noData') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>

    <!-- ═══ ATTRIBUTE TIMELINE MODAL ═══ -->
    <transition name="fade">
      <div v-if="isAttributeModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <div class="absolute inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm" @click="closeAttributeModal"></div>
        
        <div class="relative bg-[var(--bg-app)] border border-[var(--border-app)] rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
          <!-- Header -->
          <div class="flex items-center justify-between p-5 sm:p-6 border-b border-[var(--border-app)] shrink-0 bg-[var(--input-bg)]">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-[var(--text-primary)]/10 flex items-center justify-center text-[var(--text-primary)]">
                <UiIcon name="lucide:layers" class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-xl font-black text-[var(--text-app)]">{{ productTimelineData?.product?.productName }}</h3>
                <p class="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{{ selectedAttribute }} • {{ t('reports.detailedSalesHistory') }}</p>
              </div>
            </div>
            <button 
              @click="closeAttributeModal"
              class="w-10 h-10 rounded-xl bg-[var(--bg-app)] border border-[var(--border-app)] text-[var(--text-muted)] flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-transparent transition-all"
            >
              <UiIcon name="lucide:x" class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-[var(--bg-app)]">
            <div v-if="filteredTimeline.length > 0" class="relative pl-8 space-y-4 before:absolute before:left-[15px] before:top-4 before:h-[calc(100%-32px)] before:w-px before:bg-[var(--border-app)]">
              <div v-for="(log, i) in filteredTimeline" :key="i" class="relative group">
                <div class="absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-2 border-[var(--bg-app)] z-10" :class="{ 'bg-blue-500': log.type === 'INTAKE', 'bg-emerald-500': log.type === 'SALE', 'bg-rose-500': log.type === 'REFUND' }"></div>
                <div class="p-4 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl flex items-center gap-4 transition-all hover:border-[var(--text-primary)]/40 hover:-translate-y-0.5">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-[var(--text-app)]">{{ t(log.details) }}</p>
                    <p class="text-[11px] font-bold opacity-40 tabular-nums uppercase">{{ new Date(log.date).toLocaleString('az-AZ') }} · {{ log.receiptNo }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-black tabular-nums" :class="{ 'text-blue-500': log.type === 'INTAKE', 'text-emerald-500': log.type === 'SALE', 'text-rose-500': log.type === 'REFUND' }">
                      {{ log.qty > 0 ? '+' : '' }}{{ log.qty }}
                    </p>
                    <p class="text-[10px] font-bold opacity-30">{{ log.amount?.toFixed(2) }} ₼</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="py-12 flex flex-col items-center justify-center text-center">
              <UiIcon name="lucide:inbox" class="w-12 h-12 text-[var(--text-muted)] opacity-20 mb-3" />
              <p class="text-sm font-bold text-[var(--text-muted)] opacity-60">{{ t('reports.noOperationsForAttribute') }}</p>
            </div>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
/* ── Typography Override ── */
* { font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif !important; }

/* ── KPI Cards ── */
.kpi-card {
  background: var(--input-bg);
  border: 1px solid var(--border-app);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}
.kpi-card:hover {
  transform: translateY(-4px);
  border-color: var(--text-primary);
}
.kpi-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.kpi-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kpi-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.kpi-value {
  font-size: 20px;
  font-weight: 950;
  color: var(--text-app);
  letter-spacing: -0.04em;
}
.kpi-currency {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  opacity: 0.4;
}

/* ── Mini Stat Cards ── */
.mini-stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--input-bg);
  border: 1px solid var(--border-app);
  border-radius: 18px;
  transition: all 0.25s;
  cursor: pointer;
}
.mini-stat-card:hover { transform: translateY(-4px); border-color: var(--text-primary); }
.mini-stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--bg-app);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mini-stat-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  opacity: 0.6;
}
.mini-stat-value {
  font-size: 16px;
  font-weight: 900;
  color: var(--text-app);
  margin-top: 1px;
}

/* ── Premium Cards (Charts/Tables) ── */
.card-premium {
  background: var(--input-bg);
  border: 1px solid var(--border-app);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
}
.card-header-premium {
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title-premium {
  font-size: 16px;
  font-weight: 900;
  color: var(--text-app);
  letter-spacing: -0.01em;
}

/* ── Lists & Tables ── */
.list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  transition: all 0.2s;
  cursor: pointer;
  border-radius: 16px;
}
.list-item:hover { background: var(--bg-app); }

.th-premium {
  padding: 16px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  white-space: nowrap;
}
.td-premium {
  padding: 16px;
  font-size: 13px;
  vertical-align: middle;
}
.tr-premium { transition: all 0.2s; cursor: pointer; }
.tr-premium:hover { background: var(--text-primary)/3; }

/* ── Buttons ── */
.btn-premium-action {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  height: 44px;
  background: var(--text-primary);
  color: white;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 800;
  transition: all 0.3s;
}
.btn-premium-action:hover { opacity: 0.9; transform: scale(1.02); }

.btn-action {
  font-size: 11px;
  font-weight: 800;
  color: var(--text-primary);
  background: var(--text-primary)/8;
  padding: 8px 16px;
  border-radius: 10px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-action:hover { background: var(--text-primary)/15; }

/* ── Utils ── */
.custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-app); border-radius: 10px; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.scale-enter-active, .scale-leave-active { transition: all 0.2s ease-out; }
.scale-enter-from, .scale-leave-to { opacity: 0; transform: scale(0.95); }

.tabular-nums { font-variant-numeric: tabular-nums; }
/* ── KPI Cards Mobile ── */
@media (max-width: 640px) {
  .kpi-card { padding: 14px; gap: 8px; border-radius: 16px; }
  .kpi-value { font-size: 16px; }
  .kpi-label { font-size: 9px; }
  .mini-stat-card { padding: 12px 14px; gap: 10px; }
  .mini-stat-value { font-size: 14px; }
  .card-header-premium { padding: 16px; }
  .card-title-premium { font-size: 14px; }
  .card-premium { border-radius: 18px; }
  .btn-premium-action { height: 38px; padding: 0 14px; font-size: 12px; }
  .list-item { padding: 10px 12px; gap: 10px; }
}
</style>
