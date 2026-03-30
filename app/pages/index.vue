<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from '#i18n'
import { useColorMode, useAuth, useToast, useHead, useNuxtApp } from '#imports'
import { generateDailyReport } from '~/utils/generateDailyReport'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Filler,
  BarElement,
} from 'chart.js'
import { Line, Doughnut, Bar } from 'vue-chartjs'


const { t, locale } = useI18n()
const colorMode = useColorMode()
const { token } = useAuth()
const toast = useToast()
const { $api } = useNuxtApp()

const selectedFilter = useState('dashboard_filter', () => 'today')
const dashboardData = useState('dashboard_data', () => null)
const loading = ref(false)

const dateFilters = computed(() => [
  { id: 'today', label: t('dashboard.today') },
  { id: 'yesterday', label: t('dashboard.yesterday') },
  { id: 'week', label: t('dashboard.thisWeek') },
  { id: 'month', label: t('dashboard.thisMonth') },
  { id: 'all', label: t('dashboard.allTime') }
])


const fetchDashboardData = async () => {
  if (!dashboardData.value) loading.value = true
  try {
    let startDate, endDate
    const now = new Date()
    
    if (selectedFilter.value === 'today') {
      const d = new Date()
      startDate = new Date(d.setHours(0, 0, 0, 0))
      endDate = new Date(d.setHours(23, 59, 59, 999))
    } else if (selectedFilter.value === 'yesterday') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      startDate = new Date(yesterday.setHours(0, 0, 0, 0))
      endDate = new Date(yesterday.setHours(23, 59, 59, 999))
    } else if (selectedFilter.value === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      startDate = weekAgo
      endDate = new Date()
    } else if (selectedFilter.value === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      startDate = monthAgo
      endDate = new Date()
    } else {
      startDate = new Date(2000, 0, 1)
      endDate = new Date()
    }

    const data = await $api('/api/analytics/dashboard', {
      query: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    })
    dashboardData.value = data
  } catch (err) {
    console.error('Dashboard load error:', err)
    toast.error(t('dashboard.errorMessage'))
  } finally {
    loading.value = false
  }
}

watch(selectedFilter, fetchDashboardData)
onMounted(fetchDashboardData)


// PDF yüklə funksiyası
const downloadReport = () => {
  try {
    generateDailyReport(locale.value, dashboardData.value, isDark.value)
    toast.success(t('dashboard.successMessage'))
  } catch (error) {
    console.error('Report generation error:', error)
    toast.error(t('dashboard.errorMessage'))
  }
}

// Chart already registered above


ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Filler,
  BarElement
)

// Add head title for the page
useHead({
  title: computed(() => t('dashboard.statistics'))
})

// --- THEME COLOR SYNC HELPER ---
const isDark = computed(() => colorMode.value === 'dark')

const themeColors = computed(() => ({
  primary: '#7367F0',  // Flagship Premium Purple for Yessirpos
  primaryLight: 'rgba(115, 103, 240, 0.15)',
  
  // Refined Monochromatic Palette (Shades of Purple)
  success: '#8F85F3',  // Soft Violet
  successLight: 'rgba(143, 133, 243, 0.15)',
  
  warning: '#ABA4F6',  // Lighter Violet
  warningLight: 'rgba(171, 164, 246, 0.15)',
  
  danger: '#564DB5',   // Deep Violet
  dangerLight: 'rgba(86, 77, 181, 0.15)',
  
  info: '#C8C4F9',     // Pale Violet
  infoLight: 'rgba(200, 196, 249, 0.15)',

  // Adaptive colors for texts and grids inside diagrams
  textApp: isDark.value ? '#E6E6EB' : '#4b4b52',   
  textMuted: isDark.value ? '#8B8B9A' : '#A0A0B0',
  gridBorder: isDark.value ? '#2B2B36' : '#EBEBEF',
  cardBg: isDark.value ? '#1E1E2D' : '#FFFFFF',
}))

// --- 1. DYNAMIC DATA BOARDS ---
const stats = computed(() => {
  const kpis = dashboardData.value?.kpis
  const growth = kpis?.growth || {}
  
  return [
    { 
      label: t('dashboard.orders'), 
      value: kpis?.totalTransactions?.toLocaleString() || '0', 
      subtitle: `${(growth.orders || 0) >= 0 ? '+' : ''}${growth.orders || 0}% ${t('dashboard.fromLastMonth')}`, 
      icon: 'lucide:shopping-bag', 
      color: themeColors.value.primary, 
      bg: themeColors.value.primaryLight 
    },
    { 
      label: t('dashboard.revenue'), 
      value: kpis?.grossRevenue?.toLocaleString() || '0', 
      suffix: '₼', 
      subtitle: `${(growth.revenue || 0) >= 0 ? '+' : ''}${growth.revenue || 0}% ${t('dashboard.fromLastMonth')}`, 
      icon: 'lucide:dollar-sign', 
      color: themeColors.value.success, 
      bg: themeColors.value.successLight 
    },
    { 
      label: t('dashboard.expenses'), 
      value: kpis?.totalExpenses?.toLocaleString() || '0', 
      suffix: '₼', 
      subtitle: `${(growth.expenses || 0) >= 0 ? '+' : ''}${growth.expenses || 0}% ${t('dashboard.fromLastMonth')}`, 
      icon: 'lucide:trending-down', 
      color: themeColors.value.danger, 
      bg: themeColors.value.dangerLight 
    },
    { 
      label: t('dashboard.stock'), 
      value: kpis?.totalStock?.toLocaleString() || '0', 
      subtitle: t('dashboard.stableStatus'), 
      icon: 'lucide:package', 
      color: themeColors.value.info, 
      bg: themeColors.value.infoLight 
    }
  ]
})

const topProducts = computed(() => {
  if (!dashboardData.value?.topProducts) return []
  const maxRevenue = Math.max(...dashboardData.value.topProducts.map(p => p.totalRevenue), 1)
  
  return dashboardData.value.topProducts.map((product, idx) => ({
    name: product.name,
    sales: product.soldQty,
    revenue: product.totalRevenue.toLocaleString(),
    suffix: '₼',
    progress: (product.totalRevenue / maxRevenue) * 100,
    color: [themeColors.value.primary, themeColors.value.success, themeColors.value.info, themeColors.value.warning, themeColors.value.danger][idx % 5]
  }))
})

const recentOrders = computed(() => {
  if (!dashboardData.value?.recentOrders) return []
  return dashboardData.value.recentOrders.map(order => ({
    id: `#${order.id}`,
    customer: order.customer,
    amount: order.amount.toLocaleString(),
    suffix: '₼',
    status: order.status,
    date: new Date(order.date).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
  }))
})



// --- 2. MULTIFUNCTIONAL SMOOTH LINE CHART ---
const lineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }, // Biz custom legend yığırıq hər zaman
    tooltip: {
      backgroundColor: themeColors.value.cardBg,
      titleColor: themeColors.value.textApp,
      bodyColor: themeColors.value.textMuted,
      borderColor: themeColors.value.gridBorder,
      borderWidth: 1,
      padding: 12,
      displayColors: false,
      boxPadding: 4,
      usePointStyle: true,
      callbacks: {
        label: (context) => `${t('dashboard.revenue')}: ${context.parsed.y.toLocaleString()} ₼`
      }
    }
  },
  scales: {
    y: {
      grid: {
        color: themeColors.value.gridBorder,
        borderDash: [5, 5], // Kesik çizgilerle premium efekt
        drawBorder: false,
      },
      ticks: {
        color: themeColors.value.textMuted,
        font: { size: 12, family: 'SF Pro Display' },
        callback: (value) => value / 1000 + 'k'
      },
      border: { display: false }
    },
    x: {
      grid: { display: false, drawBorder: false },
      ticks: { 
        color: themeColors.value.textMuted, 
        font: { size: 12, family: 'SF Pro Display' },
        padding: 10
      },
      border: { display: false }
    }
  },
  interaction: { intersect: false, mode: 'index' },
  animation: {
    duration: 2500,
    easing: 'easeOutQuart'
  }
}))

const lineChartData = computed(() => {
  const isAllTime = selectedFilter.value === 'all' || selectedFilter.value === 'month'
  const labels = isAllTime ? (dashboardData.value?.dailyChart?.labels || []) : (dashboardData.value?.hourlyChart?.labels || [])
  const data = isAllTime ? (dashboardData.value?.dailyChart?.revenue || []) : (dashboardData.value?.hourlyChart?.revenue || [])

  return {
    labels: labels.length > 0 ? labels : ['-'],
    datasets: [
      {
        label: t('dashboard.revenue'),
        data: data.length > 0 ? data : [0],
        borderColor: themeColors.value.primary,
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return null // Return empty early if not populated
          const gradientRef = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
          gradientRef.addColorStop(0, isDark.value ? 'rgba(115, 103, 240, 0)' : 'rgba(115, 103, 240, 0)')
          gradientRef.addColorStop(1, 'rgba(115, 103, 240, 0.35)') // Yukarısı daha parlak
          return gradientRef
        },
        borderWidth: 3,
        pointBackgroundColor: themeColors.value.cardBg, // Nokta içi beyaz/koyu arkaplan
        pointBorderColor: themeColors.value.primary,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.45 // Pürüzsüz dalga formu
      }
    ]
  }
})


// --- 3. DOUGHNUT CHART (SALES DIVISION) ---
const donutChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '78%', // İnce ve lüks halka
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: themeColors.value.cardBg,
      titleColor: themeColors.value.textApp,
      bodyColor: themeColors.value.textMuted,
      borderColor: themeColors.value.gridBorder,
      borderWidth: 1,
      padding: 12,
      usePointStyle: true,
    }
  },
  animation: {
    animateScale: true,
    animateRotate: true,
    duration: 2000,
    easing: 'easeOutQuart'
  }
}
))

const donutChartData = computed(() => {
  const kpis = dashboardData.value?.kpis
  const completed = (kpis?.totalTransactions || 0) - (kpis?.refundTransactions || 0)
  const cancelled = kpis?.refundTransactions || 0
  
  return {
    labels: [t('dashboard.completed'), t('dashboard.cancelled')],
    datasets: [
      {
        data: [completed, cancelled],
        backgroundColor: [themeColors.value.success, themeColors.value.danger],
        hoverBackgroundColor: [themeColors.value.success, themeColors.value.danger],
        borderWidth: isDark.value ? 2 : 4,
        borderColor: themeColors.value.cardBg, // Halka aralarındaki boşluk rengi arka planla aynı
        hoverOffset: 6 // Hover olduğunda ayrılma efekti
      }
    ]
  }
})


// --- 4. BAR CHART (WEEKLY REPORT) ---
const barChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: themeColors.value.cardBg,
      titleColor: themeColors.value.textApp,
      bodyColor: themeColors.value.textMuted,
      borderColor: themeColors.value.gridBorder,
      borderWidth: 1,
      padding: 10,
      displayColors: false,
    }
  },
  scales: {
    y: { display: false, grid: { display: false } },
    x: {
      grid: { display: false, drawBorder: false },
      ticks: { color: themeColors.value.textMuted, font: { size: 11, family: 'SF Pro Display' } },
      border: { display: false }
    }
  },
  borderRadius: 4, // Barların köşelerini yuvarlar
  animation: {
    duration: 1500,
    easing: 'easeOutQuart'
  }
}))

const barChartData = computed(() => {
  const dailyLabels = dashboardData.value?.dailyChart?.labels || []
  const dailyOrders = dashboardData.value?.dailyChart?.orders || []
  
  return {
    labels: dailyLabels.slice(-7), // Son 7 gün
    datasets: [
      {
        label: t('dashboard.orderCount'),
        data: dailyOrders.slice(-7), 

        backgroundColor: (context) => {
          // En yüksek olana primary rengi ver
          const maxVal = Math.max(...context.dataset.data)
          const isMax = context.raw === maxVal
          return isMax ? themeColors.value.primary : themeColors.value.primaryLight
        },
        hoverBackgroundColor: themeColors.value.primary,
      }
    ]
  }
})


// Filter ref and list were moved to the top

</script>

<template>
  <div class="space-y-6 pb-6 font-sans">
    <!-- Dashboard Header -->
    <div class="flex items-end justify-between">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text-app)] tracking-tight">
          {{ t('dashboard.statistics') }}
        </h1>
        <p class="text-[var(--text-app)] opacity-60 mt-1 text-sm font-medium tracking-wide">
          {{ t('dashboard.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-2 max-w-full overflow-hidden">
        <!-- Date Filter Buttons with expanded options -->
        <div class="bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--border-app)] flex shadow-sm overflow-x-auto custom-scrollbar">
          <button 
            v-for="filter in dateFilters"
            :key="filter.id"
            @click="selectedFilter = filter.id"
            class="px-3 md:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer"
            :class="selectedFilter === filter.id ? 'bg-[var(--text-primary)] text-white shadow-md' : 'text-[var(--text-app)] hover:bg-[var(--bg-app)]'"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards Summary (4 columns) -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <div 
        v-for="(stat, index) in stats" 
        :key="index"
        class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl p-6 hover:shadow-xl hover:shadow-[var(--text-primary)]/5 hover:border-[var(--text-primary)]/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden group"
      >
        <!-- Custom SVG Abstract Geometric Background -->
        <div class="absolute -right-8 -top-8 w-40 h-40 opacity-[0.05] group-hover:scale-110 transition-transform duration-700 pointer-events-none rotate-12" :style="{ color: stat.color }">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" opacity="0.5"/>
            <path d="M50 15 L85 32 L85 68 L50 85 L15 68 L15 32 Z" opacity="0.8"/>
            <circle cx="50" cy="50" r="10" />
          </svg>
        </div>

        <div class="flex items-start justify-between relative z-10">
          <div class="flex-1">
            <h3 class="text-3xl font-extrabold text-[var(--text-app)] mb-1 tracking-tight">
              {{ stat.value }}<span v-if="stat.suffix" class="ml-1 text-xl opacity-80 font-normal">{{ stat.suffix }}</span>
            </h3>
            <p class="text-[13px] font-bold text-[var(--text-app)] opacity-70 mb-2">{{ stat.label }}</p>
            <div class="flex items-center gap-1.5 mt-3">
              <!-- Inline dynamic badge based on positive/negative subtitle -->
              <span 
                class="px-2 py-0.5 rounded text-[11px] font-bold"
                :style="stat.subtitle.includes('+') ? { backgroundColor: themeColors.successLight, color: themeColors.success } : { backgroundColor: themeColors.dangerLight, color: themeColors.danger }"
              >
                {{ stat.subtitle.split(' ')[0] }}
              </span>
              <span class="text-[11px] text-[var(--text-app)] opacity-50 font-medium">{{ t('dashboard.fromLastMonth') }}</span>
            </div>
          </div>
          <!-- Icon Container -->
          <div 
            class="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
            :style="{ backgroundColor: stat.bg }"
          >
            <UiIcon :name="stat.icon" class="w-6 h-6" :style="{ color: stat.color }" />
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CHARTS ROW (2/3 line chart + 1/3 donut) -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      <!-- Gəlir Qrafiki (Line Chart) -->
      <div class="xl:col-span-2 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl p-6 hover:shadow-lg hover:border-[var(--text-primary)]/20 transition-all">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h3 class="text-lg font-bold text-[var(--text-app)] tracking-tight">{{ t('dashboard.revenueAnalytics') }}</h3>
            <p class="text-sm text-[var(--text-app)] opacity-60 mt-1">{{ t('dashboard.revenueSubtitle') }}</p>
          </div>
          <div class="mt-4 sm:mt-0 px-4 py-2 bg-[var(--text-primary)]/10 text-[var(--text-primary)] rounded-lg font-bold">
            <span class="text-xs opacity-80 mr-1">{{ t('dashboard.total') }}:</span> {{ dashboardData?.kpis?.grossRevenue?.toLocaleString() || '0' }} ₼
          </div>

        </div>
        <!-- Vue Chart.js Line -->
        <div class="h-[280px] w-full relative">
          <Line :data="lineChartData" :options="lineChartOptions" />
        </div>
      </div>

      <!-- Satış İcmalı (Donut & Progress) -->
      <div class="xl:col-span-1 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl p-6 flex flex-col hover:shadow-lg hover:border-[var(--text-primary)]/20 transition-all">
        <h3 class="text-lg font-bold text-[var(--text-app)] tracking-tight mb-1">{{ t('dashboard.salesSummary') }}</h3>
        <p class="text-sm text-[var(--text-app)] opacity-60 mb-6 font-medium">{{ t('dashboard.salesSubtitle') }}</p>
        
        <!-- Donut Chart -->
        <div class="relative flex-1 flex items-center justify-center min-h-[220px]">
          <Doughnut :data="donutChartData" :options="donutChartOptions" />
          
          <!-- Inner Centered Content -->
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span class="text-3xl font-black text-[var(--text-app)]">{{ dashboardData?.kpis?.refundRate?.toFixed(1) || '0' }}%</span>
            <span 
              class="text-xs font-bold mt-1 px-2 py-0.5 rounded"
              :style="{ color: themeColors.danger, backgroundColor: themeColors.dangerLight}"
            >{{ t('dashboard.cancelled') }}</span>
          </div>

        </div>

        <!-- Custom Legends for Donut -->
        <div class="grid grid-cols-2 gap-2 mt-6">
          <div class="text-center p-2 rounded-xl border border-[var(--border-app)] hover:bg-[var(--bg-app)] transition-colors">
            <div class="w-full flex justify-center mb-1.5"><div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: themeColors.success }"></div></div>
            <div class="text-[15px] font-extrabold text-[var(--text-app)]">{{ ((dashboardData?.kpis?.totalTransactions || 0) - (dashboardData?.kpis?.refundTransactions || 0)).toLocaleString() }}</div>
            <div class="text-[10px] font-bold text-[var(--text-app)] opacity-50 mt-1 tracking-wider">{{ t('dashboard.complete') }}</div>
          </div>
          <div class="text-center p-2 rounded-xl border border-[var(--border-app)] hover:bg-[var(--bg-app)] transition-colors">
            <div class="w-full flex justify-center mb-1.5"><div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: themeColors.danger }"></div></div>
            <div class="text-[15px] font-extrabold text-[var(--text-app)]">{{ (dashboardData?.kpis?.refundTransactions || 0).toLocaleString() }}</div>
            <div class="text-[10px] font-bold text-[var(--text-app)] opacity-50 mt-1 tracking-wider">{{ t('dashboard.cancel') }}</div>
          </div>
        </div>

      </div>
    </div>

    <!-- SECOND DATABOARD ROW -->
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

      <!-- Top Products (Bars with progress lines) -->
      <div class="xl:col-span-2 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl p-6 hover:shadow-lg hover:border-[var(--text-primary)]/20 transition-all flex flex-col">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-bold text-[var(--text-app)] tracking-tight">{{ t('dashboard.topProducts') }}</h3>
            <p class="text-sm text-[var(--text-app)] opacity-60">{{ t('dashboard.topProductsSubtitle') }}</p>
          </div>
          <UiButton variant="outline" size="sm" class="hidden sm:flex">{{ t('dashboard.exportReport') }}</UiButton>
        </div>
        
        <div class="flex-1 flex flex-col justify-between space-y-5">
          <div 
            v-for="(product, index) in topProducts" 
            :key="index"
            class="flex items-center gap-4 group"
          >
            <!-- Custom Rank Badge -->
            <div class="w-8 h-8 rounded-lg bg-[var(--border-app)] flex items-center justify-center font-bold text-sm text-[var(--text-app)] opacity-70 group-hover:bg-[var(--text-primary)] group-hover:text-white transition-all">
              #{{ index + 1 }}
            </div>
            
            <div class="flex-1">
              <div class="flex justify-between items-end mb-1">
                <span class="font-bold text-sm text-[var(--text-app)] group-hover:text-[var(--text-primary)] transition-colors">{{ product.name }}</span>
                <span class="font-extrabold text-sm text-[var(--text-app)]">{{ product.revenue }} <span class="opacity-60 text-xs font-normal font-sans">{{ product.suffix }}</span></span>
              </div>
              <!-- Beautiful Progress Bar -->
              <div class="w-full bg-[var(--border-app)] rounded-full h-2 overflow-hidden shadow-inner">
                <div 
                  class="h-full rounded-full transition-all duration-1000 ease-out"
                  :style="{ width: `${product.progress}%`, backgroundColor: product.color }"
                ></div>
              </div>
            </div>
            
            <div class="hidden sm:block text-right w-16">
              <div class="text-xs font-bold text-[var(--text-app)] opacity-50">{{ t('dashboard.sales') }}</div>
              <div class="text-sm font-bold text-[var(--text-app)]">{{ product.sales }} {{ t('dashboard.pieces') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Weekly Orders (Bar Chart) & Quick Tasks -->
      <div class="xl:col-span-1 flex flex-col gap-6">
        <!-- Mini Bar Chart Card -->
        <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl p-6 hover:shadow-lg transition-all">
          <h3 class="text-lg font-bold text-[var(--text-app)] tracking-tight mb-2">{{ t('dashboard.weeklyOrders') }}</h3>
          <p class="text-sm text-[var(--text-app)] opacity-60 mb-4 font-medium">{{ t('dashboard.weeklySubtitle') }}</p>
          <!-- Vue Chart.js Bar -->
          <div class="h-32">
             <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </div>
        
        <!-- Live Action Card (Gradient) -->
        <div class="relative overflow-hidden rounded-2xl p-6 border-0 group cursor-pointer shadow-lg hover:-translate-y-1 transition-all duration-300"
             :style="{ background: `linear-gradient(135deg, ${themeColors.primary}, #9B8CFF)` }"
        >
          <!-- Custom Premium SVG Wave Decor -->
          <div class="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none group-hover:scale-105 transition-transform duration-700">
            <svg viewBox="0 0 800 500" preserveAspectRatio="none" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,100 C150,200 350,0 500,100 C650,200 800,50 800,50 L800,0 L0,0 Z" fill="url(#grad1)"></path>
              <path d="M0,250 C200,350 400,150 600,250 C800,350 800,200 800,200 L800,0 L0,0 Z" fill="url(#grad2)" opacity="0.5"></path>
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:white;stop-opacity:0" />
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:white;stop-opacity:0.8" />
                  <stop offset="100%" style="stop-color:white;stop-opacity:0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <div class="relative z-10 text-white">
            <div class="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 text-white">
              <UiIcon name="lucide:zap" class="w-5 h-5 fill-current" />
            </div>
            <h3 class="text-xl font-bold mb-1 tracking-tight drop-shadow-sm">{{ t('dashboard.dailyReportReady') }}</h3>
            <p class="text-sm text-white/80 max-w-[200px] mb-6 leading-relaxed">
              {{ t('dashboard.dailyReportText') }}
            </p>
            <button 
              @click="downloadReport"
              class="bg-white text-[var(--text-primary)] px-6 py-2.5 rounded-lg text-sm font-bold shadow-md hover:shadow-xl hover:scale-105 transition-all w-full"
            >
              {{ t('dashboard.downloadReport') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
