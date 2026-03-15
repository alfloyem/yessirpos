<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHead, useToast } from '#imports'
import { useI18n } from '#i18n'
import UiIcon from '~/components/ui/Icon.vue'
import UiButton from '~/components/ui/Button.vue'

// Import Chart.js logic
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  LineController,
  BarController,
  PieController
} from 'chart.js'
import { Line, Bar, Pie } from 'vue-chartjs'
import * as XLSX from 'xlsx'

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineController,
  BarController,
  PieController
)

const { t } = useI18n()
const toast = useToast()

useHead({
  title: t('menu.reports', 'Hesabatlar')
})

const tabs = ['Dashboard', 'Məhsullar', 'Satışlar', 'Xərclər', 'Kadr və Müştəri']
const activeTab = ref('Dashboard')

// Date Filters
const getStartOfDay = () => {
    const d = new Date()
    d.setHours(0,0,0,0)
    return d
}
const getEndOfDay = () => {
    const d = new Date()
    d.setHours(23,59,59,999)
    return d
}

// Keep date formats correctly for datetime-local
const toDatetimeLocal = (d: Date) => {
    // Format to YYYY-MM-DDTHH:mm
    const offset = d.getTimezoneOffset()
    const d2 = new Date(d.getTime() - (offset*60*1000))
    return d2.toISOString().slice(0, 16)
}

const startDate = ref(toDatetimeLocal(getStartOfDay()))
const endDate = ref(toDatetimeLocal(getEndOfDay()))

const setQuickFilter = (type: string) => {
    const start = new Date()
    const end = new Date()
    
    if (type === '1h') {
        start.setHours(start.getHours() - 1)
    } else if (type === 'today') {
        start.setHours(0,0,0,0)
    } else if (type === 'yesterday') {
        start.setDate(start.getDate() - 1)
        start.setHours(0,0,0,0)
        end.setDate(end.getDate() - 1)
        end.setHours(23,59,59,999)
    } else if (type === 'week') {
        start.setDate(start.getDate() - start.getDay() + 1) // roughly monday
        start.setHours(0,0,0,0)
    } else if (type === 'month') {
        start.setDate(1)
        start.setHours(0,0,0,0)
    }
    
    startDate.value = toDatetimeLocal(start)
    endDate.value = toDatetimeLocal(end)
    refreshAll()
}

// API Data States
const loading = ref(false)

const dashboardData = ref<any>(null)
const productsData = ref<any>(null)
const salesData = ref<any>(null)
const expensesData = ref<any>(null)
const employeesData = ref<any>(null)

// Specific Product Timeline State
const selectedProductId = ref<string | null>(null)
const searchProductQuery = ref('')
const isSearchingProduct = ref(false)
const searchProductResults = ref<any[]>([])
const productTimelineData = ref<any>(null)

const buildParams = () => {
    return `?startDate=${new Date(startDate.value).toISOString()}&endDate=${new Date(endDate.value).toISOString()}`
}

const fetchDashboard = async () => {
    loading.value = true
    try {
        dashboardData.value = await $fetch(`/api/analytics/dashboard${buildParams()}`)
    } catch (e: any) {
        toast.error(e.message || 'Xəta baş verdi')
    } finally {
        loading.value = false
    }
}

const fetchProducts = async () => {
    loading.value = true
    try {
        productsData.value = await $fetch(`/api/analytics/products${buildParams()}`)
        if (selectedProductId.value) {
           await loadProductTimeline(selectedProductId.value)
        }
    } catch (e: any) {
        toast.error(e.message || 'Xəta baş verdi')
    } finally {
        loading.value = false
    }
}

const fetchSales = async () => {
    loading.value = true
    try {
        salesData.value = await $fetch(`/api/analytics/sales${buildParams()}`)
    } catch (e: any) {
        toast.error(e.message || 'Xəta baş verdi')
    } finally {
        loading.value = false
    }
}

const fetchExpenses = async () => {
    loading.value = true
    try {
        expensesData.value = await $fetch(`/api/analytics/expenses${buildParams()}`)
    } catch (e: any) {
        toast.error(e.message || 'Xəta baş verdi')
    } finally {
        loading.value = false
    }
}

const fetchEmployees = async () => {
    loading.value = true
    try {
        employeesData.value = await $fetch(`/api/analytics/employees${buildParams()}`)
    } catch (e: any) {
        toast.error(e.message || 'Xəta baş verdi')
    } finally {
        loading.value = false
    }
}

const refreshAll = () => {
    if (activeTab.value === 'Dashboard') fetchDashboard()
    else if (activeTab.value === 'Məhsullar') fetchProducts()
    else if (activeTab.value === 'Satışlar') fetchSales()
    else if (activeTab.value === 'Xərclər') fetchExpenses()
    else if (activeTab.value === 'Kadr və Müştəri') fetchEmployees()
}

watch(activeTab, () => {
    refreshAll()
})

onMounted(() => {
    refreshAll()
})

// === Chart Configs ===
const chartThemeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: '#888' } }
    },
    scales: {
        x: { ticks: { color: '#888' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
        y: { ticks: { color: '#888' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
    }
}

const pieThemeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'right' as const, labels: { color: '#888' } }
    }
}

const getLineChartData = (data: any) => ({
    labels: data?.labels || [],
    datasets: [{
        label: 'Satış Dövriyyəsi (₼)',
        data: data?.data || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
    }]
})

const getPieChartData = (data: any) => ({
    labels: data?.labels || [],
    datasets: [{
        data: data?.data || [],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']
    }]
})


// Add Export Handler
const exportToExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        toast.error('İxrac ediləcək məlumat yoxdur')
        return
    }
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Excel faylı yaradıldı')
}

// Product Timeline Methods
let searchTimer: any = null
const handleProductSearch = () => {
    if (searchTimer) clearTimeout(searchTimer)
    if (!searchProductQuery.value) {
        searchProductResults.value = []
        return
    }
    isSearchingProduct.value = true
    searchTimer = setTimeout(async () => {
        try {
            const results = await $fetch<any[]>(`/api/products/search?q=${searchProductQuery.value}`)
            searchProductResults.value = results.slice(0, 5)
        } catch(e) {}
        isSearchingProduct.value = false
    }, 300)
}

const selectProduct = async (product: any) => {
    searchProductQuery.value = product.productName
    searchProductResults.value = []
    selectedProductId.value = product.id.toString()
    await loadProductTimeline(product.id)
}

const loadProductTimeline = async (id: string | number) => {
    try {
        loading.value = true
        productTimelineData.value = await $fetch(`/api/analytics/product-timeline${buildParams()}&productId=${id}`)
    } catch (e: any) {
        toast.error("Timeline yüklənərkən xəta")
    } finally {
        loading.value = false
    }
}

</script>

<template>
  <div class="h-full flex flex-col bg-[var(--bg-app)] overflow-hidden">
    <!-- Header with Quick Filters & Date Picker -->
    <header class="shrink-0 bg-[var(--bg-app)] border-b border-[var(--border-app)] p-4 space-y-4 z-20 shadow-sm relative">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <UiIcon name="lucide:pie-chart" class="w-6 h-6 text-[var(--text-primary)]" />
                <h1 class="text-xl font-black text-[var(--text-app)] tracking-tight">Ətraflı Hesabatlar</h1>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <!-- Date Scope -->
                <div class="flex items-center gap-2 bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--border-app)]">
                    <input type="datetime-local" v-model="startDate" class="bg-transparent text-sm font-bold text-[var(--text-app)] px-2 tabular-nums outline-none" />
                    <UiIcon name="lucide:arrow-right" class="w-4 h-4 opacity-50" />
                    <input type="datetime-local" v-model="endDate" class="bg-transparent text-sm font-bold text-[var(--text-app)] px-2 tabular-nums outline-none" />
                    <UiButton variant="primary" size="sm" class="!px-3 !h-8 !rounded-lg" @click="refreshAll">
                        <UiIcon name="lucide:filter" class="w-4 h-4" />
                    </UiButton>
                </div>
            </div>
        </div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <!-- Tabs -->
            <div class="flex overflow-x-auto custom-scrollbar gap-1 bg-[var(--input-bg)] p-1 rounded-xl w-fit border border-[var(--border-app)]">
                <button 
                    v-for="tab in tabs" :key="tab"
                    @click="activeTab = tab"
                    class="px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
                    :class="activeTab === tab ? 'bg-[var(--text-primary)] text-white shadow-md' : 'text-[var(--text-app)] hover:bg-[var(--text-primary)]/10'"
                >
                    {{ tab }}
                </button>
            </div>

            <!-- Quick Filters -->
            <div class="flex items-center gap-1 overflow-x-auto">
                <button @click="setQuickFilter('1h')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--text-app)] bg-[var(--input-bg)] hover:bg-[var(--text-primary)]/10 border border-[var(--border-app)] whitespace-nowrap">1 Saat</button>
                <button @click="setQuickFilter('today')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--text-app)] bg-[var(--input-bg)] hover:bg-[var(--text-primary)]/10 border border-[var(--border-app)] whitespace-nowrap">Bugün</button>
                <button @click="setQuickFilter('yesterday')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--text-app)] bg-[var(--input-bg)] hover:bg-[var(--text-primary)]/10 border border-[var(--border-app)] whitespace-nowrap">Dünən</button>
                <button @click="setQuickFilter('week')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--text-app)] bg-[var(--input-bg)] hover:bg-[var(--text-primary)]/10 border border-[var(--border-app)] whitespace-nowrap">Bu Həftə</button>
                <button @click="setQuickFilter('month')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--text-app)] bg-[var(--input-bg)] hover:bg-[var(--text-primary)]/10 border border-[var(--border-app)] whitespace-nowrap">Bu Ay</button>
            </div>
        </div>
    </header>

    <main class="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 bg-[var(--bg-app)]/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <UiIcon name="lucide:loader-2" class="w-10 h-10 animate-spin text-[var(--text-primary)]" />
      </div>

      <!-- DASHBOARD TAB -->
      <div v-if="activeTab === 'Dashboard'" class="space-y-6 max-w-7xl mx-auto pb-20">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" v-if="dashboardData">
            <div class="bg-[var(--input-bg)] p-5 rounded-2xl border border-[var(--border-app)] relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
                <div class="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 flex items-center gap-2">
                    <UiIcon name="lucide:wallet" class="w-3.5 h-3.5 text-blue-500" /> Ümumi Dövriyyə
                </div>
                <div class="text-3xl font-black font-mono tracking-tighter">{{ dashboardData.dashboard.grossRevenue.toFixed(2) }} ₼</div>
            </div>
            
            <div class="bg-[var(--input-bg)] p-5 rounded-2xl border border-[var(--border-app)] relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-green-500/5 rounded-full blur-xl group-hover:bg-green-500/10 transition-colors"></div>
                <div class="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 flex items-center gap-2">
                    <UiIcon name="lucide:trending-up" class="w-3.5 h-3.5 text-green-500" /> Xalis Qazanc P&L (Təxmini)
                </div>
                <div class="text-3xl font-black font-mono tracking-tighter" :class="dashboardData.dashboard.netRevenue >= 0 ? 'text-green-500' : 'text-red-500'">
                    {{ dashboardData.dashboard.netRevenue.toFixed(2) }} ₼
                </div>
            </div>

            <div class="bg-[var(--input-bg)] p-5 rounded-2xl border border-[var(--border-app)] relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-colors"></div>
                <div class="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 flex items-center gap-2">
                    <UiIcon name="lucide:receipt" class="w-3.5 h-3.5 text-red-500" /> Ümumi Xərc + Refund
                </div>
                <div class="text-3xl font-black font-mono tracking-tighter text-red-500">
                    -{{ (dashboardData.dashboard.totalExpenses + dashboardData.dashboard.totalRefunds).toFixed(2) }} ₼
                </div>
            </div>

            <div class="bg-[var(--input-bg)] p-5 rounded-2xl border border-[var(--border-app)] relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/5 rounded-full blur-xl group-hover:bg-orange-500/10 transition-colors"></div>
                <div class="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 flex items-center gap-2">
                    <UiIcon name="lucide:percent" class="w-3.5 h-3.5 text-orange-500" /> Tətbiq edilən Endirim
                </div>
                <div class="text-3xl font-black font-mono tracking-tighter text-orange-500">
                    {{ dashboardData.dashboard.totalDiscount.toFixed(2) }} ₼
                </div>
            </div>
        </div>

        <div class="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-3xl p-6 h-[400px]">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-black text-sm uppercase tracking-widest opacity-70">Zaman Üzrə Satış Aktivliyi</h3>
            </div>
            <Line v-if="dashboardData?.chart" :data="getLineChartData(dashboardData.chart)" :options="chartThemeOptions" />
        </div>
      </div>

      <!-- PRODUCTS TAB -->
      <div v-else-if="activeTab === 'Məhsullar'" class="space-y-6 max-w-7xl mx-auto pb-20">
        <!-- Products Summary -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" v-if="productsData">
            <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl p-5">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-black text-xs uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-2">
                        <UiIcon name="lucide:medal" class="w-4 h-4" /> Ən Çox Satılanlar
                    </h3>
                    <button @click="exportToExcel(productsData.topSellers, 'TopSellers')" class="text-xs font-bold bg-green-500/10 text-green-600 px-3 py-1 rounded-lg hover:bg-green-500/20">Excel formatı</button>
                </div>
                <div class="space-y-2">
                    <div v-for="p in productsData.topSellers" :key="p.id" class="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--border-app)]/30 transition-colors cursor-pointer" @click="selectProduct(p)">
                        <span class="font-bold text-sm truncate flex-1">{{ p.name }}</span>
                        <div class="flex items-center gap-4 text-xs">
                            <span class="font-mono bg-[var(--text-primary)]/10 text-[var(--text-primary)] px-2 py-0.5 rounded-md">{{ p.soldQty }} ədəd</span>
                            <span class="font-mono font-black w-20 text-right">{{ p.totalRevenue.toFixed(2) }} ₼</span>
                        </div>
                    </div>
                    <div v-if="!productsData.topSellers.length" class="text-center text-xs opacity-50 py-4">Məlumat yoxdur</div>
                </div>
            </div>

            <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl p-5">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-black text-xs uppercase tracking-widest text-red-500 flex items-center gap-2">
                        <UiIcon name="lucide:rotate-ccw" class="w-4 h-4" /> Ən Çox Qaytarılanlar
                    </h3>
                </div>
                <div class="space-y-2">
                    <div v-for="p in productsData.mostRefunded" :key="p.id" class="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--border-app)]/30 transition-colors cursor-pointer" @click="selectProduct(p)">
                        <span class="font-bold text-sm truncate flex-1">{{ p.name }}</span>
                        <div class="flex items-center gap-4 text-xs">
                            <span class="font-mono bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md">{{ p.refundQty }} ədəd geri</span>
                        </div>
                    </div>
                    <div v-if="!productsData.mostRefunded.length" class="text-center text-xs opacity-50 py-4">Məlumat yoxdur</div>
                </div>
            </div>
        </div>

        <!-- Single Product Timeline Deep Dive -->
        <div class="mt-8 border-t border-[var(--border-app)] pt-8 relative">
            <h2 class="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
                Məhsulun Həyat Dövrü (Timeline) 
                <span class="text-xs font-normal opacity-50 ml-2">- Detallı saniyəlik analiz</span>
            </h2>

            <div class="relative max-w-xl mb-6 flex flex-col gap-2">
                <input 
                    v-model="searchProductQuery"
                    @input="handleProductSearch"
                    type="text" 
                    placeholder="Məhsulun kodu və ya adını axtar..."
                    class="w-full bg-[var(--input-bg)] border-2 border-[var(--border-app)] rounded-xl px-4 py-3 outline-none focus:border-[var(--text-primary)] font-bold shadow-sm"
                />
                
                <div v-if="searchProductResults.length > 0" class="absolute top-14 left-0 w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl shadow-2xl z-50 p-2 space-y-1">
                     <div 
                        v-for="res in searchProductResults" :key="res.id"
                        @click="selectProduct(res)"
                        class="p-3 hover:bg-[var(--input-bg)] rounded-lg cursor-pointer flex justify-between items-center"
                     >
                        <span class="font-bold text-sm">{{ res.productName }}</span>
                        <span class="text-xs font-mono opacity-50">{{ res.barcode }}</span>
                     </div>
                </div>
            </div>

            <div v-if="productTimelineData" class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-3xl p-6 relative overflow-hidden">
                <div class="flex items-center justify-between mb-6 pb-6 border-b border-[var(--border-app)]">
                    <div>
                        <h3 class="text-xl font-black">{{ productTimelineData.product.productName }}</h3>
                        <p class="text-sm font-mono opacity-50">{{ productTimelineData.product.barcode }}</p>
                    </div>
                    <div class="text-right flex items-center gap-6">
                        <div>
                            <div class="text-[9px] uppercase tracking-widest opacity-50 font-black">Xalis Mənfəət</div>
                            <div class="text-2xl font-black font-mono tracking-tighter" :class="productTimelineData.netRevenue >= 0 ? 'text-green-500' : 'text-red-500'">
                                {{ productTimelineData.netRevenue.toFixed(2) }} ₼
                            </div>
                        </div>
                        <div class="w-px h-8 bg-[var(--border-app)]"></div>
                        <div>
                            <div class="text-[9px] uppercase tracking-widest opacity-50 font-black">Cari Stok</div>
                            <div class="text-2xl font-black font-mono tracking-tighter text-[var(--text-primary)]">
                                {{ productTimelineData.product.stock }} <span class="text-sm">ədəd</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Timeline List -->
                <div class="space-y-0 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-app)] pl-4">
                    <div v-for="log in productTimelineData.timeline" :key="log.date" class="relative pl-8 py-3">
                        <div class="absolute left-1.5 top-4 w-2 h-2 rounded-full border-2 border-[var(--bg-app)] ring-4 ring-[var(--bg-app)]" 
                             :class="{
                               'bg-blue-500': log.type === 'INTAKE',
                               'bg-green-500': log.type === 'SALE',
                               'bg-red-500': log.type === 'REFUND'
                             }"
                        ></div>
                        <div class="bg-[var(--bg-app)] border border-[var(--border-app)] p-3 rounded-xl flex items-center justify-between hover:border-[var(--text-primary)]/50 transition-colors">
                            <div>
                                <div class="text-[10px] font-black font-mono opacity-50 mb-1">{{ new Date(log.date).toLocaleString('az-AZ') }}</div>
                                <div class="font-bold text-sm tracking-tight flex items-center gap-2">
                                    {{ log.details }} 
                                    <span class="px-1.5 py-0.5 rounded text-[9px] bg-[var(--border-app)] font-mono">{{ log.receiptNo }}</span>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="block font-black font-mono text-sm leading-none"
                                    :class="{
                                        'text-blue-500': log.type === 'INTAKE',
                                        'text-green-500': log.type === 'SALE',
                                        'text-red-500': log.type === 'REFUND'
                                    }"
                                >
                                    {{ log.qty > 0 ? '+' : ''}}{{ log.qty }} ədəd
                                </span>
                                <span class="text-[10px] font-mono opacity-50">{{ log.amount?.toFixed(2) }} ₼</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="!productTimelineData.timeline.length" class="text-center py-10 opacity-50 font-bold">
                    Bu zaman aralığında bu məhsul üçün heç bir hərəkət yoxdur.
                </div>
            </div>
            
        </div>
      </div>

      <!-- SALES TAB -->
      <div v-else-if="activeTab === 'Satışlar'" class="space-y-6 max-w-7xl mx-auto pb-20">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-black tracking-tight flex items-center gap-2">Satış və Mədaxil Cədvəli</h2>
            <button @click="exportToExcel(salesData?.sales || [], 'Sales_Report')" class="bg-[#10b981] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#059669] transition-all flex items-center gap-2 shadow-lg shadow-green-500/20">
                <UiIcon name="lucide:sheet" class="w-4 h-4" /> Excel Formatında İxrac
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div class="lg:col-span-1 bg-[var(--input-bg)] border border-[var(--border-app)] p-6 rounded-3xl h-[400px]">
                <h3 class="font-black text-xs uppercase tracking-widest opacity-70 mb-4 text-center">Ödəniş Növlərinə Görə</h3>
                <div class="relative w-full h-[300px]" v-if="salesData?.paymentMethods">
                    <Pie :data="getPieChartData(salesData.paymentMethods)" :options="pieThemeOptions" />
                </div>
            </div>

            <div class="lg:col-span-3 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-3xl overflow-hidden shadow-sm h-[500px] flex flex-col">
                <div class="overflow-auto custom-scrollbar flex-1">
                    <table class="w-full text-left text-sm">
                        <thead class="sticky top-0 bg-[var(--bg-app)] border-b border-[var(--border-app)] z-10">
                            <tr>
                                <th class="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Tarix/Saat</th>
                                <th class="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Çek No</th>
                                <th class="p-4 font-black uppercase tracking-widest text-[10px] opacity-50">Müştəri / Kassir</th>
                                <th class="p-4 font-black uppercase tracking-widest text-[10px] opacity-50 text-right">Məbləğ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="sale in salesData?.sales" :key="sale.id" class="border-b border-[var(--border-app)] last:border-0 hover:bg-[var(--border-app)]/20">
                                <td class="p-4 font-mono text-xs opacity-70">{{ new Date(sale.createdAt).toLocaleString('az-AZ') }}</td>
                                <td class="p-4 font-mono font-bold">{{ sale.receiptNo }}</td>
                                <td class="p-4">
                                    <div class="font-bold">{{ sale.customerName || 'Anonim' }}</div>
                                    <div class="text-[10px] opacity-50">{{ sale.cashierName }}</div>
                                </td>
                                <td class="p-4 text-right font-mono font-black" :class="sale.finalTotal < 0 ? 'text-red-500' : 'text-green-500'">
                                    {{ sale.finalTotal.toFixed(2) }} ₼
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-if="!salesData?.sales?.length" class="p-10 text-center opacity-50 font-bold">Məlumat tapılmadı.</div>
                </div>
            </div>
        </div>
      </div>

       <!-- EXPENSES TAB -->
       <div v-else-if="activeTab === 'Xərclər'" class="space-y-6 max-w-7xl mx-auto pb-20">
           <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Chart -->
                <div class="lg:col-span-1 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-3xl p-6 flex flex-col items-center justify-center">
                    <h3 class="font-black text-xs uppercase tracking-widest opacity-70 mb-4 w-full text-center">Xərc Kateqoriyaları</h3>
                    <div class="w-full h-[300px]" v-if="expensesData?.categoryChart">
                        <Pie :data="getPieChartData(expensesData.categoryChart)" :options="pieThemeOptions" />
                    </div>
                </div>

                <div class="lg:col-span-2 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-3xl overflow-hidden flex flex-col h-[500px]">
                    <div class="p-4 border-b border-[var(--border-app)] flex justify-between items-center bg-[var(--bg-app)]">
                         <h3 class="font-black text-sm uppercase tracking-widest">Bütün Xərclər</h3>
                         <button @click="exportToExcel(expensesData?.expenses || [], 'Expenses')" class="text-[10px] font-black uppercase tracking-widest bg-[var(--border-app)] px-3 py-1.5 rounded-lg">Export</button>
                    </div>
                    <div class="overflow-auto custom-scrollbar flex-1">
                        <table class="w-full text-left text-sm">
                            <thead class="sticky top-0 bg-[var(--bg-app)]/90 backdrop-blur z-10 border-b border-[var(--border-app)]">
                                <tr>
                                    <th class="p-4 font-black text-[10px] uppercase opacity-50">Tarix</th>
                                    <th class="p-4 font-black text-[10px] uppercase opacity-50">Kateqoriya/Qeyd</th>
                                    <th class="p-4 font-black text-[10px] uppercase opacity-50 text-right">Məbləğ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="exp in expensesData?.expenses" :key="exp.id" class="border-b border-[var(--border-app)] last:border-0 hover:bg-[var(--border-app)]/20">
                                    <td class="p-4 text-xs font-mono opacity-70">{{ new Date(exp.createdAt).toLocaleString('az-AZ') }}</td>
                                    <td class="p-4">
                                        <div class="font-bold text-xs uppercase">{{ exp.category || 'Təyinsiz' }}</div>
                                        <div class="text-[10px] opacity-50 mt-1">{{ exp.notes || 'Qeyd yoxdur' }}</div>
                                    </td>
                                    <td class="p-4 text-right font-mono font-black text-red-500">
                                        -{{ exp.amount.toFixed(2) }} ₼
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div v-if="!expensesData?.expenses?.length" class="p-10 text-center opacity-50">Xərc yoxdur</div>
                    </div>
                </div>
           </div>
       </div>

       <!-- EMPLOYEES AND CUSTOMERS -->
       <div v-else-if="activeTab === 'Kadr və Müştəri'" class="space-y-6 max-w-7xl mx-auto pb-20">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6" v-if="employeesData">
              <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-3xl p-6">
                <h3 class="font-black text-xs uppercase tracking-widest text-[var(--text-primary)] mb-6 flex justify-between">
                    Satıcı (Kassir) Performansı
                    <button @click="exportToExcel(employeesData.cashiers, 'Cashier_Performance')" class="text-blue-500 hover:underline">Excel İxrac</button>
                </h3>
                <div class="space-y-4">
                    <div v-for="(c, index) in employeesData.cashiers" :key="c.name" class="flex items-center gap-4 bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-app)]">
                        <div class="w-8 h-8 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] flex items-center justify-center font-black">
                            {{ index + 1 }}
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold tracking-tight">{{ c.name }}</h4>
                            <div class="text-[10px] opacity-50">Kəsdiyi endirim: {{ c.totalDiscount.toFixed(2) }} ₼</div>
                        </div>
                        <div class="text-right font-mono font-black text-lg">
                            {{ c.totalRevenue.toFixed(2) }} ₼
                        </div>
                    </div>
                </div>
              </div>

              <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-3xl p-6">
                <h3 class="font-black text-xs uppercase tracking-widest text-[#10b981] mb-6 flex justify-between">
                    VIP Müştərilər (Ən çox Xərcləyənlər)
                    <button @click="exportToExcel(employeesData.topCustomers, 'Top_Customers')" class="text-green-500 hover:underline">Excel İxrac</button>
                </h3>
                <div class="space-y-4">
                    <div v-for="(c, index) in employeesData.topCustomers" :key="c.name" class="flex items-center gap-4 bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-app)]">
                        <div class="w-8 h-8 rounded-full bg-[#10b981]/10 text-[#10b981] flex items-center justify-center font-black">
                            {{ index + 1 }}
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold tracking-tight">{{ c.name }}</h4>
                        </div>
                        <div class="text-right font-mono font-black text-lg text-[#10b981]">
                            {{ c.totalSpent.toFixed(2) }} ₼
                        </div>
                    </div>
                </div>
              </div>
          </div>
       </div>
    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-app); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 100, 100, 0.5); }
</style>
