<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '#i18n'
import { useColorMode } from '#imports'

// Chart.js exact imports
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

const { t } = useI18n()
const colorMode = useColorMode()

// Add head title for the page
useHead({
  title: t('menu.main') || 'Dashboard'
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

// --- 1. MOCK DATA BOARDS ---
const stats = computed(() => [
  { label: t('dashboard.orders'), value: '2,856', subtitle: '+16.5% ötən aydan', icon: 'lucide:shopping-bag', color: themeColors.value.primary, bg: themeColors.value.primaryLight },
  { label: t('dashboard.revenue'), value: '145,678', suffix: '₼', subtitle: '+28.2% ötən aydan', icon: 'lucide:dollar-sign', color: themeColors.value.success, bg: themeColors.value.successLight },
  { label: t('dashboard.expenses'), value: '32,345', suffix: '₼', subtitle: '-5.4% ötən aydan', icon: 'lucide:trending-down', color: themeColors.value.danger, bg: themeColors.value.dangerLight },
  { label: t('dashboard.stock'), value: '8,567', subtitle: 'Stabil vəziyyət', icon: 'lucide:package', color: themeColors.value.info, bg: themeColors.value.infoLight }
])

const topProducts = computed(() => [
  { name: 'Kişi Köynəyi - Ağ', sales: 234, revenue: '11,700', suffix: '₼', progress: 85, color: themeColors.value.primary },
  { name: 'Qadın Paltar - Qara', sales: 189, revenue: '18,900', suffix: '₼', progress: 75, color: themeColors.value.success },
  { name: 'Kişi Şalvar - Göy', sales: 156, revenue: '9,360', suffix: '₼', progress: 60, color: themeColors.value.info },
  { name: 'Qadın Bluz - Bənövşəyi', sales: 145, revenue: '8,700', suffix: '₼', progress: 50, color: themeColors.value.warning },
  { name: 'Kişi Pencək - Qəhvəyi', sales: 123, revenue: '14,760', suffix: '₼', progress: 40, color: themeColors.value.danger }
])

const recentOrders = ref([
  { id: '#12345', customer: 'Əli Məmmədov', amount: '234', suffix: '₼', status: 'completed', date: '10 dəq əvvəl' },
  { id: '#12344', customer: 'Leyla Həsənova', amount: '567', suffix: '₼', status: 'pending', date: '25 dəq əvvəl' },
  { id: '#12343', customer: 'Rəşad Quliyev', amount: '890', suffix: '₼', status: 'completed', date: '1 saat əvvəl' },
  { id: '#12342', customer: 'Nigar Əliyeva', amount: '445', suffix: '₼', status: 'cancelled', date: '2 saat əvvəl' },
  { id: '#12341', customer: 'Elvin Məhərrəmov', amount: '678', suffix: '₼', status: 'completed', date: '3 saat əvvəl' }
])


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
        label: (context) => `Gəlir: ${context.parsed.y.toLocaleString()} ₼`
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
        font: { size: 12, family: 'Inter' },
        callback: (value) => value / 1000 + 'k'
      },
      border: { display: false }
    },
    x: {
      grid: { display: false, drawBorder: false },
      ticks: { 
        color: themeColors.value.textMuted, 
        font: { size: 12, family: 'Inter' },
        padding: 10
      },
      border: { display: false }
    }
  },
  interaction: { intersect: false, mode: 'index' }
}))

const lineChartData = computed(() => {
  return {
    labels: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'],
    datasets: [
      {
        label: 'Gəlir',
        data: [12000, 19000, 15000, 32000, 22000, 41000, 28000, 48000, 32000, 60000, 52000, 85000],
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
}
))

const donutChartData = computed(() => ({
  labels: [t('dashboard.completed') || 'Tamamlanmış', t('dashboard.pending') || 'Gözləmədə', t('dashboard.cancelled') || 'Ləğv edildi'],
  datasets: [
    {
      data: [65, 25, 10], // Yüzdelikler
      backgroundColor: [themeColors.value.success, themeColors.value.warning, themeColors.value.danger],
      hoverBackgroundColor: [themeColors.value.success, themeColors.value.warning, themeColors.value.danger],
      borderWidth: isDark.value ? 2 : 4,
      borderColor: themeColors.value.cardBg, // Halka aralarındaki boşluk rengi arka planla aynı
      hoverOffset: 6 // Hover olduğunda ayrılma efekti
    }
  ]
}))

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
      ticks: { color: themeColors.value.textMuted, font: { size: 11, family: 'Inter' } },
      border: { display: false }
    }
  },
  borderRadius: 4, // Barların köşelerini yuvarlar
}))

const barChartData = computed(() => ({
  labels: ['B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən', 'Baz'],
  datasets: [
    {
      label: 'Sifariş sayı',
      data: [35, 60, 45, 80, 55, 95, 70],
      backgroundColor: (context) => {
        // En yüksek olana primary rengi ver
        const maxVal = Math.max(...context.dataset.data)
        const isMax = context.raw === maxVal
        return isMax ? themeColors.value.primary : themeColors.value.primaryLight
      },
      hoverBackgroundColor: themeColors.value.primary,
    }
  ]
}))

const selectedFilter = ref('today')
</script>

<template>
  <div class="space-y-6 pb-6">
    <!-- Dashboard Header -->
    <div class="flex items-end justify-between">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text-app)] tracking-tight">
          {{ t('dashboard.statistics') || 'Statistika Paneli' }}
        </h1>
        <p class="text-[var(--text-app)] opacity-60 mt-1 text-sm font-medium tracking-wide">
          Bütün biznes fəaliyyətlərinizi tək yerdən idarə edin
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Date Filter Buttons -->
        <div class="bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--border-app)] flex shadow-sm">
          <button 
            @click="selectedFilter = 'today'"
            class="px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all"
            :class="selectedFilter === 'today' ? 'bg-[var(--text-primary)] text-white shadow-md' : 'text-[var(--text-app)] hover:bg-[var(--bg-app)]'"
          >
            {{ t('dashboard.today') || 'Bu gün' }}
          </button>
          <button 
            @click="selectedFilter = 'month'"
            class="px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all"
            :class="selectedFilter === 'month' ? 'bg-[var(--text-primary)] text-white shadow-md' : 'text-[var(--text-app)] hover:bg-[var(--bg-app)]'"
          >
            {{ t('dashboard.thisMonth') || 'Bu ay' }}
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
        <!-- Background Decor Splash -->
        <div 
          class="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl group-hover:scale-150 transition-transform duration-700"
          :style="{ backgroundColor: stat.color }"
        ></div>

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
              <span class="text-[11px] text-[var(--text-app)] opacity-50 font-medium">ötən aydan</span>
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
            <h3 class="text-lg font-bold text-[var(--text-app)] tracking-tight">Gəlir Analitikası</h3>
            <p class="text-sm text-[var(--text-app)] opacity-60 mt-1">2026-cı il üçün aylıq ümumi dövriyyə qrafiki</p>
          </div>
          <div class="mt-4 sm:mt-0 px-4 py-2 bg-[var(--text-primary)]/10 text-[var(--text-primary)] rounded-lg font-bold">
            <span class="text-xs opacity-80 mr-1">CƏMİ:</span> 375,000 ₼
          </div>
        </div>
        <!-- Vue Chart.js Line -->
        <div class="h-[280px] w-full relative">
          <Line :data="lineChartData" :options="lineChartOptions" />
        </div>
      </div>

      <!-- Satış İcmalı (Donut & Progress) -->
      <div class="xl:col-span-1 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl p-6 flex flex-col hover:shadow-lg hover:border-[var(--text-primary)]/20 transition-all">
        <h3 class="text-lg font-bold text-[var(--text-app)] tracking-tight mb-1">Satış İcmalı</h3>
        <p class="text-sm text-[var(--text-app)] opacity-60 mb-6 font-medium">Cari ayın ümumi həcmi üzrə bölünmə</p>
        
        <!-- Donut Chart -->
        <div class="relative flex-1 flex items-center justify-center min-h-[220px]">
          <Doughnut :data="donutChartData" :options="donutChartOptions" />
          
          <!-- Inner Centered Content -->
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span class="text-3xl font-black text-[var(--text-app)]">85%</span>
            <span 
              class="text-xs font-bold mt-1 px-2 py-0.5 rounded"
              :style="{ color: themeColors.success, backgroundColor: themeColors.successLight }"
            >Böyümə</span>
          </div>
        </div>

        <!-- Custom Legends for Donut -->
        <div class="grid grid-cols-3 gap-2 mt-6">
          <div class="text-center p-2 rounded-xl border border-[var(--border-app)] hover:bg-[var(--bg-app)] transition-colors">
            <div class="w-full flex justify-center mb-1.5"><div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: themeColors.success }"></div></div>
            <div class="text-[15px] font-extrabold text-[var(--text-app)]">65%</div>
            <div class="text-[10px] uppercase font-bold text-[var(--text-app)] opacity-50 mt-1 tracking-wider">Tamam </div>
          </div>
          <div class="text-center p-2 rounded-xl border border-[var(--border-app)] hover:bg-[var(--bg-app)] transition-colors">
            <div class="w-full flex justify-center mb-1.5"><div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: themeColors.warning }"></div></div>
            <div class="text-[15px] font-extrabold text-[var(--text-app)]">25%</div>
            <div class="text-[10px] uppercase font-bold text-[var(--text-app)] opacity-50 mt-1 tracking-wider">Gözləyir</div>
          </div>
          <div class="text-center p-2 rounded-xl border border-[var(--border-app)] hover:bg-[var(--bg-app)] transition-colors">
            <div class="w-full flex justify-center mb-1.5"><div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: themeColors.danger }"></div></div>
            <div class="text-[15px] font-extrabold text-[var(--text-app)]">10%</div>
            <div class="text-[10px] uppercase font-bold text-[var(--text-app)] opacity-50 mt-1 tracking-wider">Ləğv</div>
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
            <h3 class="text-lg font-bold text-[var(--text-app)] tracking-tight">Ən Çox Satılan Məhsullar</h3>
            <p class="text-sm text-[var(--text-app)] opacity-60">Gəlir performansı ən yüksək olan 5 məhsul</p>
          </div>
          <UiButton variant="outline" size="sm" class="hidden sm:flex">Hesabatı Çıxar</UiButton>
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
              <div class="text-xs font-bold text-[var(--text-app)] opacity-50">Satış</div>
              <div class="text-sm font-bold text-[var(--text-app)]">{{ product.sales }} əd.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Weekly Orders (Bar Chart) & Quick Tasks -->
      <div class="xl:col-span-1 flex flex-col gap-6">
        <!-- Mini Bar Chart Card -->
        <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl p-6 hover:shadow-lg transition-all">
          <h3 class="text-lg font-bold text-[var(--text-app)] tracking-tight mb-2">Həftəlik Sifarişlər</h3>
          <p class="text-sm text-[var(--text-app)] opacity-60 mb-4 font-medium">Bazar ertəsi - Bazar</p>
          <!-- Vue Chart.js Bar -->
          <div class="h-32">
             <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </div>
        
        <!-- Live Action Card (Gradient) -->
        <div class="relative overflow-hidden rounded-2xl p-6 border-0 group cursor-pointer shadow-lg hover:-translate-y-1 transition-all duration-300"
             :style="{ background: `linear-gradient(135deg, ${themeColors.primary}, #9B8CFF)` }"
        >
          <!-- Decoration -->
          <div class="absolute -right-6 -top-6 w-32 h-32 rounded-full border-4 border-white opacity-10 blur-sm group-hover:scale-110 transition-transform"></div>
          <div class="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border-4 border-white opacity-10 group-hover:scale-110 transition-transform"></div>
          
          <div class="relative z-10 text-white">
            <div class="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 text-white">
              <UiIcon name="lucide:zap" class="w-5 h-5 fill-current" />
            </div>
            <h3 class="text-xl font-bold mb-1 tracking-tight drop-shadow-sm">Günün Raporu Hazırdır</h3>
            <p class="text-sm text-white/80 max-w-[200px] mb-6 leading-relaxed">
              Bugünkü satışların təsdiqlənməsi üçün raportu dərhal yükləyin.
            </p>
            <button class="bg-white text-[var(--text-primary)] px-6 py-2.5 rounded-lg text-sm font-bold shadow-md hover:shadow-xl hover:scale-105 transition-all w-full">
              Raportu Yüklə
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
