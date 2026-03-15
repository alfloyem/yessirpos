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
useHead({ title: 'Hesabatlar' })

// ── Tabs ──
const tabs = [
  { id: 'overview', label: 'Ümumi İcmal', icon: 'lucide:layout-dashboard' },
  { id: 'products', label: 'Məhsullar', icon: 'lucide:package' },
  { id: 'sales', label: 'Satışlar', icon: 'lucide:receipt' },
  { id: 'expenses', label: 'Xərclər', icon: 'lucide:wallet' },
  { id: 'team', label: 'Komanda', icon: 'lucide:users' },
]
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

const quickFilters = [
  { id: '1h',        label: 'Son 1 Saat' },
  { id: 'today',     label: 'Bugün' },
  { id: 'yesterday', label: 'Dünən' },
  { id: 'week',      label: 'Bu Həftə' },
  { id: 'month',     label: 'Bu Ay' },
  { id: '3months',   label: 'Son 3 Ay' },
]

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

// ── Chart config (theme-aware, no shadows) ──
const chartOpts = (showLegend = false): any => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: showLegend, labels: { color: 'var(--text-muted)', boxWidth: 10, font: { size: 11 } } },
    tooltip: {
      backgroundColor: 'var(--input-bg)',
      titleColor: 'var(--text-app)',
      bodyColor: 'var(--text-muted)',
      borderColor: 'var(--border-app)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8
    }
  },
  scales: {
    x: { ticks: { color: 'var(--text-muted)', font: { size: 10 } }, grid: { display: false }, border: { display: false } },
    y: { ticks: { color: 'var(--text-muted)', font: { size: 10 }, callback: (v: string | number) => Number(v) >= 1000 ? (Number(v)/1000).toFixed(0) + 'k' : v }, grid: { color: 'rgba(128,128,128,0.06)' }, border: { display: false } }
  }
})

const doughnutOpts: any = {
  responsive: true, maintainAspectRatio: false, cutout: '75%',
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: 'var(--input-bg)', titleColor: 'var(--text-app)', bodyColor: 'var(--text-muted)', borderColor: 'var(--border-app)', borderWidth: 1, padding: 10, cornerRadius: 8 }
  }
}

// Theme-consistent palette derived from our purple scheme
const CHART_COLORS = [
  'hsl(255, 75%, 50%)',   // primary
  'hsl(255, 60%, 65%)',   // lighter primary
  'hsl(255, 40%, 75%)',   // soft primary
  'hsl(220, 60%, 55%)',   // blue-ish
  'hsl(200, 50%, 50%)',   // teal
  'hsl(280, 50%, 55%)',   // violet
  'hsl(255, 20%, 60%)',   // muted
  'hsl(300, 40%, 55%)',   // magenta
]

// ── Export ──
const exportExcel = (data: any[], name: string) => {
  if (!data?.length) { toast.error('İxrac ediləcək məlumat yoxdur'); return }
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${name}_${new Date().toISOString().split('T')[0]}.xlsx`)
  toast.success('Excel faylı uğurla yaradıldı')
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
const clearTimeline = () => { productTimelineData.value = null; selectedProductId.value = null; searchProductQuery.value = '' }

const fmt = (n: number) => n?.toFixed(2) ?? '0.00'
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--bg-app)] overflow-hidden">

    <!-- ═══ HEADER ═══ -->
    <header class="shrink-0 bg-[var(--bg-app)] border-b border-[var(--border-app)] z-20">
      <!-- Row 1 -->
      <div class="flex items-center justify-between px-6 h-14">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[var(--text-primary)]/10 flex items-center justify-center">
            <UiIcon name="lucide:bar-chart-3" class="w-4 h-4 text-[var(--text-primary)]" />
          </div>
          <h1 class="text-lg font-bold text-[var(--text-app)] tracking-tight">Hesabatlar</h1>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 bg-[var(--input-bg)] rounded-lg border border-[var(--border-app)] px-2 h-9">
            <input type="datetime-local" v-model="startDate" class="bg-transparent text-[11px] font-mono font-bold text-[var(--text-app)] outline-none w-[145px] tabular-nums" />
            <span class="text-[10px] opacity-30 font-bold">→</span>
            <input type="datetime-local" v-model="endDate" class="bg-transparent text-[11px] font-mono font-bold text-[var(--text-app)] outline-none w-[145px] tabular-nums" />
          </div>
          <button @click="activeQuickFilter = ''; refreshAll()" class="h-9 w-9 rounded-lg bg-[var(--text-primary)] text-white flex items-center justify-center hover:bg-[var(--text-secondary)] transition-colors">
            <UiIcon name="lucide:refresh-cw" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Row 2 -->
      <div class="flex items-center justify-between px-6 h-11 gap-4">
        <div class="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          <button
            v-for="tab in tabs" :key="tab.id"
            @click="activeTab = tab.id"
            class="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors"
            :class="activeTab === tab.id
              ? 'bg-[var(--text-primary)] text-white'
              : 'text-[var(--text-app)] opacity-60 hover:opacity-100 hover:bg-[var(--input-bg)]'"
          >
            <UiIcon :name="tab.icon" class="w-3.5 h-3.5" />
            {{ tab.label }}
          </button>
        </div>

        <div class="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            v-for="qf in quickFilters" :key="qf.id"
            @click="setQuickFilter(qf.id)"
            class="px-2.5 h-7 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors border"
            :class="activeQuickFilter === qf.id
              ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)] border-[var(--text-primary)]/20'
              : 'text-[var(--text-app)] opacity-50 hover:opacity-80 border-transparent hover:border-[var(--border-app)]'"
          >
            {{ qf.label }}
          </button>
        </div>
      </div>
    </header>

    <!-- ═══ MAIN ═══ -->
    <main class="flex-1 overflow-y-auto custom-scrollbar relative">
      <!-- Loading -->
      <div v-if="loading" class="absolute inset-0 bg-[var(--bg-app)]/60 z-50 flex items-center justify-center">
        <div class="flex items-center gap-3 bg-[var(--input-bg)] border border-[var(--border-app)] px-5 py-3 rounded-xl">
          <UiIcon name="lucide:loader-2" class="w-5 h-5 animate-spin text-[var(--text-primary)]" />
          <span class="text-sm font-bold opacity-70">Yüklənir...</span>
        </div>
      </div>

      <!-- ══════════════════════════ -->
      <!-- OVERVIEW                   -->
      <!-- ══════════════════════════ -->
      <div v-if="activeTab === 'overview'" class="p-6 space-y-5">
        <div v-if="dashboardData">

          <!-- KPI Cards -->
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div class="kpi-card">
              <div class="kpi-label"><UiIcon name="lucide:banknote" class="w-3.5 h-3.5 text-[var(--text-primary)]" /> Dövriyyə</div>
              <div class="kpi-value">{{ fmt(dashboardData.kpis.grossRevenue) }} <span class="kpi-unit">₼</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label"><UiIcon name="lucide:trending-up" class="w-3.5 h-3.5 text-[var(--text-primary)]" /> Xalis Gəlir</div>
              <div class="kpi-value" :class="dashboardData.kpis.netRevenue < 0 && 'kpi-negative'">{{ fmt(dashboardData.kpis.netRevenue) }} <span class="kpi-unit">₼</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label"><UiIcon name="lucide:calculator" class="w-3.5 h-3.5 text-[var(--text-primary)]" /> Brüt Mənfəət</div>
              <div class="kpi-value" :class="dashboardData.kpis.grossProfit < 0 && 'kpi-negative'">{{ fmt(dashboardData.kpis.grossProfit) }} <span class="kpi-unit">₼</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label"><UiIcon name="lucide:receipt" class="w-3.5 h-3.5 text-[var(--text-primary)]" /> Orta Çek</div>
              <div class="kpi-value">{{ fmt(dashboardData.kpis.avgOrderValue) }} <span class="kpi-unit">₼</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label"><UiIcon name="lucide:shopping-cart" class="w-3.5 h-3.5 text-[var(--text-primary)]" /> Əməliyyatlar</div>
              <div class="kpi-value">{{ dashboardData.kpis.totalTransactions }}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label"><UiIcon name="lucide:rotate-ccw" class="w-3.5 h-3.5 text-[var(--text-primary)]" /> Refund Nisbəti</div>
              <div class="kpi-value">{{ dashboardData.kpis.refundRate.toFixed(1) }}%</div>
            </div>
          </div>

          <!-- Secondary Stats -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="stat-row">
              <div class="w-9 h-9 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center"><UiIcon name="lucide:arrow-down-left" class="w-4 h-4 text-[var(--text-primary)]" /></div>
              <div><div class="stat-label">Refund Məbləğ</div><div class="font-black font-mono text-sm">-{{ fmt(dashboardData.kpis.totalRefunds) }} ₼</div></div>
            </div>
            <div class="stat-row">
              <div class="w-9 h-9 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center"><UiIcon name="lucide:percent" class="w-4 h-4 text-[var(--text-primary)]" /></div>
              <div><div class="stat-label">Endirim Verilən</div><div class="font-black font-mono text-sm">{{ fmt(dashboardData.kpis.totalDiscount) }} ₼</div></div>
            </div>
            <div class="stat-row">
              <div class="w-9 h-9 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center"><UiIcon name="lucide:package-check" class="w-4 h-4 text-[var(--text-primary)]" /></div>
              <div><div class="stat-label">Satılan Məhsul</div><div class="font-black font-mono text-sm">{{ dashboardData.kpis.totalItemsSold }} ədəd</div></div>
            </div>
            <div class="stat-row">
              <div class="w-9 h-9 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center"><UiIcon name="lucide:truck" class="w-4 h-4 text-[var(--text-primary)]" /></div>
              <div><div class="stat-label">Mədaxil Dəyəri</div><div class="font-black font-mono text-sm">{{ fmt(dashboardData.kpis.totalIntakesValue) }} ₼</div></div>
            </div>
          </div>

          <!-- Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div class="lg:col-span-3 card p-5">
              <h3 class="text-sm font-bold mb-4 flex items-center gap-2"><UiIcon name="lucide:clock" class="w-4 h-4 text-[var(--text-primary)]" /> Saatlıq Satış Aktivliyi</h3>
              <div class="h-[260px]">
                <Bar
                  :data="{
                    labels: dashboardData.hourlyChart.labels,
                    datasets: [
                      { label: 'Satış (₼)', data: dashboardData.hourlyChart.revenue, backgroundColor: 'hsl(255, 75%, 50%, 0.55)', borderRadius: 3 },
                      { label: 'Geri Qaytarma (₼)', data: dashboardData.hourlyChart.refunds, backgroundColor: 'hsl(255, 30%, 70%, 0.5)', borderRadius: 3 }
                    ]
                  }"
                  :options="chartOpts(true)"
                />
              </div>
            </div>
            <div class="lg:col-span-2 card p-5">
              <h3 class="text-sm font-bold mb-4 flex items-center gap-2"><UiIcon name="lucide:trending-up" class="w-4 h-4 text-[var(--text-primary)]" /> Günlük Mənfəət Trendi</h3>
              <div class="h-[260px]">
                <Line
                  :data="{
                    labels: dashboardData.dailyChart.labels,
                    datasets: [{
                      label: 'Mənfəət (₼)',
                      data: dashboardData.dailyChart.profit,
                      borderColor: 'hsl(255, 75%, 50%)',
                      backgroundColor: 'hsl(255, 75%, 50%, 0.06)',
                      tension: 0.4, fill: true, pointRadius: 3,
                      pointBackgroundColor: 'hsl(255, 75%, 50%)'
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
      <!-- PRODUCTS                   -->
      <!-- ══════════════════════════ -->
      <div v-else-if="activeTab === 'products'" class="p-6 space-y-5">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" v-if="productsData">
          <!-- Top Sellers -->
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm flex items-center gap-2"><UiIcon name="lucide:award" class="w-4 h-4 text-[var(--text-primary)]" /> Top Satılan Məhsullar</h3>
              <button @click="exportExcel(productsData.topSellers, 'TopSellers')" class="export-btn">
                <UiIcon name="lucide:download" class="w-3 h-3" /> Excel
              </button>
            </div>
            <div class="space-y-1">
              <div
                v-for="(p, idx) in productsData.topSellers" :key="p.id"
                @click="selectProduct(p)"
                class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-app)] cursor-pointer transition-colors group"
              >
                <span class="w-6 h-6 rounded-md bg-[var(--text-primary)]/10 text-[var(--text-primary)] flex items-center justify-center text-[10px] font-black shrink-0">{{ Number(idx) + 1 }}</span>
                <span class="font-bold text-sm truncate flex-1 group-hover:text-[var(--text-primary)] transition-colors">{{ p.name }}</span>
                <span class="text-[10px] font-mono font-bold bg-[var(--text-primary)]/10 text-[var(--text-primary)] px-2 py-0.5 rounded">{{ p.soldQty }} ədəd</span>
                <span class="text-xs font-mono font-black w-20 text-right">{{ fmt(p.totalRevenue) }} ₼</span>
              </div>
              <div v-if="!productsData.topSellers.length" class="text-center text-xs opacity-40 py-8">Məlumat yoxdur</div>
            </div>
          </div>

          <!-- Most Refunded -->
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm flex items-center gap-2"><UiIcon name="lucide:undo-2" class="w-4 h-4 text-[var(--text-muted)]" /> Ən Çox Qaytarılanlar</h3>
            </div>
            <div class="space-y-1">
              <div
                v-for="(p, idx) in productsData.mostRefunded" :key="p.id"
                @click="selectProduct(p)"
                class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-app)] cursor-pointer transition-colors"
              >
                <span class="w-6 h-6 rounded-md bg-[var(--text-muted)]/10 text-[var(--text-muted)] flex items-center justify-center text-[10px] font-black shrink-0">{{ Number(idx) + 1 }}</span>
                <span class="font-bold text-sm truncate flex-1">{{ p.name }}</span>
                <span class="text-[10px] font-mono font-bold bg-[var(--text-muted)]/10 text-[var(--text-muted)] px-2 py-0.5 rounded">{{ p.refundQty }} ədəd</span>
              </div>
              <div v-if="!productsData.mostRefunded.length" class="text-center text-xs opacity-40 py-8">Geri qaytarma yoxdur</div>
            </div>
          </div>
        </div>

        <!-- Product Timeline -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-sm flex items-center gap-2"><UiIcon name="lucide:git-branch" class="w-4 h-4 text-[var(--text-primary)]" /> Məhsulun Tarixçəsi</h3>
            <button v-if="productTimelineData" @click="clearTimeline" class="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--border-app)] px-2.5 py-1 rounded-md hover:opacity-80">Bağla</button>
          </div>

          <div class="relative max-w-lg mb-4">
            <div class="relative">
              <UiIcon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input
                v-model="searchProductQuery"
                @input="handleProductSearch"
                placeholder="Məhsul adı və ya barkod..."
                class="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-lg pl-9 pr-4 py-2.5 text-sm font-bold outline-none focus:border-[var(--text-primary)]/50 transition-colors"
              />
            </div>
            <div v-if="searchProductResults.length" class="absolute top-full mt-1 left-0 w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-lg z-50 overflow-hidden">
              <div
                v-for="r in searchProductResults" :key="r.id"
                @click="selectProduct(r)"
                class="flex justify-between items-center px-4 py-2.5 hover:bg-[var(--input-bg)] cursor-pointer transition-colors border-b border-[var(--border-app)] last:border-0"
              >
                <span class="font-bold text-sm">{{ r.productName }}</span>
                <span class="text-[10px] font-mono opacity-40">{{ r.barcode }}</span>
              </div>
            </div>
          </div>

          <div v-if="productTimelineData">
            <div class="flex items-center justify-between p-4 bg-[var(--bg-app)] rounded-lg border border-[var(--border-app)] mb-4">
              <div>
                <h4 class="font-black text-lg">{{ productTimelineData.product.productName }}</h4>
                <span class="text-[11px] font-mono opacity-40">{{ productTimelineData.product.barcode }}</span>
              </div>
              <div class="flex items-center gap-6">
                <div class="text-right">
                  <div class="text-[9px] font-bold uppercase opacity-40">Xalis Mənfəət</div>
                  <div class="text-lg font-black font-mono" :class="productTimelineData.netRevenue < 0 ? 'kpi-negative' : ''">{{ fmt(productTimelineData.netRevenue) }} ₼</div>
                </div>
                <div class="w-px h-8 bg-[var(--border-app)]"></div>
                <div class="text-right">
                  <div class="text-[9px] font-bold uppercase opacity-40">Stok</div>
                  <div class="text-lg font-black font-mono text-[var(--text-primary)]">{{ productTimelineData.product.stock }}</div>
                </div>
              </div>
            </div>

            <div class="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
              <div v-for="(log, i) in productTimelineData.timeline" :key="i"
                class="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-app)] hover:border-[var(--text-primary)]/20 transition-colors bg-[var(--bg-app)]"
              >
                <div class="w-8 h-8 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center shrink-0">
                  <UiIcon
                    :name="log.type === 'INTAKE' ? 'lucide:package-plus' : log.type === 'SALE' ? 'lucide:shopping-bag' : 'lucide:undo-2'"
                    class="w-4 h-4 text-[var(--text-primary)]"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm">{{ log.details }}</div>
                  <div class="text-[10px] font-mono opacity-40">{{ new Date(log.date).toLocaleString('az-AZ') }} · {{ log.receiptNo }}</div>
                </div>
                <div class="text-right shrink-0">
                  <div class="font-black font-mono text-sm">{{ log.qty > 0 ? '+' : '' }}{{ log.qty }} ədəd</div>
                  <div class="text-[10px] font-mono opacity-40">{{ log.amount?.toFixed(2) }} ₼</div>
                </div>
              </div>
              <div v-if="!productTimelineData.timeline.length" class="text-center py-10 opacity-40 font-bold text-sm">Bu aralıqda hərəkət yoxdur.</div>
            </div>
          </div>

          <div v-else class="text-center py-8 opacity-30 text-sm">
            <UiIcon name="lucide:search" class="w-8 h-8 mx-auto mb-2 opacity-30" />
            Yuxarıdakı axtarışdan bir məhsul seçin
          </div>
        </div>
      </div>

      <!-- ══════════════════════════ -->
      <!-- SALES                      -->
      <!-- ══════════════════════════ -->
      <div v-else-if="activeTab === 'sales'" class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-sm flex items-center gap-2"><UiIcon name="lucide:list" class="w-4 h-4 text-[var(--text-primary)]" /> Bütün Satışlar</h2>
          <button @click="exportExcel(salesData?.sales || [], 'Sales')" class="export-btn">
            <UiIcon name="lucide:download" class="w-3.5 h-3.5" /> Excel İxrac
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div class="card p-5 flex flex-col">
            <h3 class="font-bold text-xs uppercase tracking-wider opacity-60 mb-3 text-center">Ödəniş Növləri</h3>
            <div class="flex-1 flex items-center justify-center min-h-[220px]" v-if="salesData?.paymentMethods">
              <Doughnut
                :data="{ labels: salesData.paymentMethods.labels, datasets: [{ data: salesData.paymentMethods.data, backgroundColor: CHART_COLORS, borderWidth: 0 }] }"
                :options="doughnutOpts"
              />
            </div>
            <div class="mt-3 space-y-1.5" v-if="salesData?.paymentMethods">
              <div v-for="(label, idx) in salesData.paymentMethods.labels" :key="label" class="flex items-center gap-2 text-[11px]">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: CHART_COLORS[idx as number] }"></span>
                <span class="flex-1 font-bold opacity-70">{{ label }}</span>
                <span class="font-mono font-bold">{{ fmt(salesData.paymentMethods.data[idx]) }} ₼</span>
              </div>
            </div>
          </div>

          <div class="lg:col-span-3 card overflow-hidden flex flex-col" style="max-height: 550px;">
            <div class="overflow-auto custom-scrollbar flex-1">
              <table class="w-full text-left">
                <thead class="sticky top-0 bg-[var(--bg-app)] z-10">
                  <tr class="border-b border-[var(--border-app)]">
                    <th class="th-cell">Tarix</th>
                    <th class="th-cell">Çek</th>
                    <th class="th-cell">Kassir</th>
                    <th class="th-cell">Müştəri</th>
                    <th class="th-cell text-right">Endirim</th>
                    <th class="th-cell text-right">Yekun</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="sale in salesData?.sales" :key="sale.id" class="tr-row">
                    <td class="td-cell font-mono opacity-60">{{ new Date(sale.createdAt).toLocaleString('az-AZ') }}</td>
                    <td class="td-cell font-mono font-bold">{{ sale.receiptNo }}</td>
                    <td class="td-cell font-bold opacity-70">{{ sale.cashierName || '—' }}</td>
                    <td class="td-cell font-bold">{{ sale.customerName || 'Anonim' }}</td>
                    <td class="td-cell text-right font-mono opacity-50">{{ sale.discountTotal > 0 ? '-' + fmt(sale.discountTotal) : '—' }}</td>
                    <td class="td-cell text-right font-mono font-black" :class="sale.finalTotal < 0 && 'kpi-negative'">{{ fmt(sale.finalTotal) }} ₼</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!salesData?.sales?.length" class="p-10 text-center opacity-40 text-sm font-bold">Heç bir satış tapılmadı</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════ -->
      <!-- EXPENSES                   -->
      <!-- ══════════════════════════ -->
      <div v-else-if="activeTab === 'expenses'" class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-sm flex items-center gap-2"><UiIcon name="lucide:wallet" class="w-4 h-4 text-[var(--text-primary)]" /> Xərclər</h2>
          <button @click="exportExcel(expensesData?.expenses || [], 'Expenses')" class="export-btn">
            <UiIcon name="lucide:download" class="w-3.5 h-3.5" /> Excel
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="card p-5 flex flex-col">
            <h3 class="font-bold text-xs uppercase tracking-wider opacity-60 mb-3 text-center">Kateqoriyalar</h3>
            <div class="flex-1 flex items-center justify-center min-h-[220px]" v-if="expensesData?.categoryChart">
              <Doughnut
                :data="{ labels: expensesData.categoryChart.labels, datasets: [{ data: expensesData.categoryChart.data, backgroundColor: CHART_COLORS, borderWidth: 0 }] }"
                :options="doughnutOpts"
              />
            </div>
            <div class="mt-3 space-y-1.5" v-if="expensesData?.categoryChart">
              <div v-for="(label, idx) in expensesData.categoryChart.labels" :key="label" class="flex items-center gap-2 text-[11px]">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: CHART_COLORS[idx as number] }"></span>
                <span class="flex-1 font-bold opacity-70">{{ label }}</span>
                <span class="font-mono font-bold">-{{ fmt(expensesData.categoryChart.data[idx as number]) }} ₼</span>
              </div>
            </div>
          </div>

          <div class="lg:col-span-2 card overflow-hidden flex flex-col" style="max-height: 500px;">
            <div class="overflow-auto custom-scrollbar flex-1">
              <table class="w-full text-left">
                <thead class="sticky top-0 bg-[var(--bg-app)] z-10">
                  <tr class="border-b border-[var(--border-app)]">
                    <th class="th-cell">Tarix</th>
                    <th class="th-cell">Kateqoriya</th>
                    <th class="th-cell">İşçi</th>
                    <th class="th-cell">Qeyd</th>
                    <th class="th-cell text-right">Məbləğ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="exp in expensesData?.expenses" :key="exp.id" class="tr-row">
                    <td class="td-cell font-mono opacity-60">{{ new Date(exp.createdAt).toLocaleString('az-AZ') }}</td>
                    <td class="td-cell"><span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-app)]">{{ exp.category || '—' }}</span></td>
                    <td class="td-cell font-bold opacity-60">{{ exp.employeeName || '—' }}</td>
                    <td class="td-cell opacity-50 max-w-[200px] truncate">{{ exp.notes || '—' }}</td>
                    <td class="td-cell text-right font-mono font-black">-{{ fmt(exp.amount) }} ₼</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!expensesData?.expenses?.length" class="p-10 text-center opacity-40 text-sm font-bold">Xərc tapılmadı</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════ -->
      <!-- TEAM                       -->
      <!-- ══════════════════════════ -->
      <div v-else-if="activeTab === 'team'" class="p-6 space-y-4" v-if="employeesData">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Cashiers -->
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm flex items-center gap-2"><UiIcon name="lucide:user-check" class="w-4 h-4 text-[var(--text-primary)]" /> Kassir Performansı</h3>
              <button @click="exportExcel(employeesData.cashiers, 'Cashiers')" class="export-btn">Excel</button>
            </div>

            <div class="h-[200px] mb-4" v-if="employeesData.cashiers.length">
              <Bar
                :data="{
                  labels: employeesData.cashiers.map((c: any) => c.name),
                  datasets: [
                    { label: 'Satış (₼)', data: employeesData.cashiers.map((c: any) => c.totalRevenue), backgroundColor: 'hsl(255, 75%, 50%, 0.55)', borderRadius: 3 },
                    { label: 'Endirim (₼)', data: employeesData.cashiers.map((c: any) => c.totalDiscount), backgroundColor: 'hsl(255, 30%, 70%, 0.45)', borderRadius: 3 }
                  ]
                }"
                :options="chartOpts(true)"
              />
            </div>

            <div class="space-y-2">
              <div v-for="(c, idx) in employeesData.cashiers" :key="c.name" class="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-app)] border border-[var(--border-app)]">
                <div class="w-7 h-7 rounded-md bg-[var(--text-primary)]/10 text-[var(--text-primary)] flex items-center justify-center text-[11px] font-black">{{ Number(idx) + 1 }}</div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm truncate">{{ c.name }}</div>
                  <div class="text-[10px] opacity-40">Endirim: {{ fmt(c.totalDiscount) }} ₼</div>
                </div>
                <div class="text-right font-mono font-black">{{ fmt(c.totalRevenue) }} ₼</div>
              </div>
            </div>
          </div>

          <!-- Top Customers -->
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm flex items-center gap-2"><UiIcon name="lucide:crown" class="w-4 h-4 text-[var(--text-primary)]" /> VIP Müştərilər</h3>
              <button @click="exportExcel(employeesData.topCustomers, 'VIP_Customers')" class="export-btn">Excel</button>
            </div>

            <div class="space-y-2">
              <div v-for="(c, idx) in employeesData.topCustomers" :key="c.name" class="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-app)] border border-[var(--border-app)]">
                <div class="w-7 h-7 rounded-md bg-[var(--text-primary)]/10 text-[var(--text-primary)] flex items-center justify-center text-[11px] font-black">{{ Number(idx) + 1 }}</div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm truncate">{{ c.name }}</div>
                </div>
                <div class="text-right font-mono font-black text-[var(--text-primary)]">{{ fmt(c.totalSpent) }} ₼</div>
              </div>
              <div v-if="!employeesData.topCustomers.length" class="text-center py-8 opacity-40 text-sm font-bold">Məlumat yoxdur</div>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
/* Shared card style */
.card {
  background: var(--input-bg);
  border: 1px solid var(--border-app);
  border-radius: 12px;
}

/* KPI cards */
.kpi-card {
  background: var(--input-bg);
  border: 1px solid var(--border-app);
  border-radius: 12px;
  padding: 16px;
  transition: border-color 0.2s;
}
.kpi-card:hover { border-color: var(--text-primary); }
.kpi-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.5;
  margin-bottom: 8px;
}
.kpi-value {
  font-size: 1.25rem;
  font-weight: 900;
  font-family: 'Space Mono', monospace;
  letter-spacing: -0.02em;
}
.kpi-unit { font-size: 0.75rem; opacity: 0.5; }
.kpi-negative { color: var(--text-muted); }

/* Stat row */
.stat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--input-bg);
  border: 1px solid var(--border-app);
  border-radius: 12px;
  padding: 12px;
}
.stat-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.4;
}

/* Export button */
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  padding: 4px 10px;
  border-radius: 6px;
  transition: opacity 0.2s;
}
.export-btn:hover { opacity: 0.7; }

/* Table */
.th-cell {
  padding: 12px 16px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.4;
}
.td-cell {
  padding: 12px 16px;
  font-size: 12px;
}
.tr-row {
  border-bottom: 1px solid var(--border-app);
  transition: background 0.15s;
}
.tr-row:last-child { border-bottom: none; }
.tr-row:hover { background: var(--bg-app); }

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-app); border-radius: 10px; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.font-mono { font-family: 'Space Mono', monospace; }
</style>
