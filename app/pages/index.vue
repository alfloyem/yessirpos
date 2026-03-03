<script setup>
import { useI18n } from '#i18n'
const { t } = useI18n()

// Mock data
const stats = ref([
  { 
    label: t('dashboard.orders'), 
    value: '1,234', 
    subtitle: t('dashboard.thisMonth'),
    icon: 'solar:bag-check-bold-duotone',
    color: '#1e40af'
  },
  { 
    label: t('dashboard.revenue'), 
    value: '45,678', 
    suffix: '₼',
    subtitle: t('dashboard.thisMonth'),
    icon: 'solar:dollar-minimalistic-bold-duotone',
    color: '#28c76f'
  },
  { 
    label: t('dashboard.expenses'), 
    value: '12,345', 
    suffix: '₼',
    subtitle: t('dashboard.thisMonth'),
    icon: 'solar:dollar-minimalistic-bold-duotone',
    color: '#ea5455'
  },
  { 
    label: t('dashboard.stock'), 
    value: '8,567', 
    subtitle: t('dashboard.count'),
    icon: 'solar:box-minimalistic-bold-duotone',
    color: '#00cfe8'
  }
])

const topProducts = ref([
  { name: 'Kişi Köynəyi - Ağ', sales: 234, revenue: '11,700', suffix: '₼' },
  { name: 'Qadın Paltar - Qara', sales: 189, revenue: '18,900', suffix: '₼' },
  { name: 'Kişi Şalvar - Göy', sales: 156, revenue: '9,360', suffix: '₼' },
  { name: 'Qadın Bluz - Bənövşəyi', sales: 145, revenue: '8,700', suffix: '₼' },
  { name: 'Kişi Pencək - Qəhvəyi', sales: 123, revenue: '14,760', suffix: '₼' }
])

const recentOrders = ref([
  { id: '#12345', customer: 'Əli Məmmədov', amount: '234', suffix: '₼', status: 'completed', date: '10 dəq əvvəl' },
  { id: '#12344', customer: 'Leyla Həsənova', amount: '567', suffix: '₼', status: 'pending', date: '25 dəq əvvəl' },
  { id: '#12343', customer: 'Rəşad Quliyev', amount: '890', suffix: '₼', status: 'completed', date: '1 saat əvvəl' },
  { id: '#12342', customer: 'Nigar Əliyeva', amount: '445', suffix: '₼', status: 'cancelled', date: '2 saat əvvəl' },
  { id: '#12341', customer: 'Elvin Məhərrəmov', amount: '678', suffix: '₼', status: 'completed', date: '3 saat əvvəl' }
])

const selectedFilter = ref('today')
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-[var(--text-app)]">
        {{ t('dashboard.statistics') }}
      </h1>
    </div>

    <!-- Stats Cards - 4 columns -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="(stat, index) in stats" 
        :key="index"
        class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl p-6 hover:shadow-lg hover:border-[var(--text-primary)]/30 hover:scale-[1.02] transition-all cursor-pointer"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-sm text-[var(--text-app)] opacity-60 mb-2">{{ stat.label }}</p>
            <h3 class="text-3xl font-bold text-[var(--text-app)] mb-1">
              {{ stat.value }}<span v-if="stat.suffix" class="ml-1">{{ stat.suffix }}</span>
            </h3>
            <p class="text-xs text-[var(--text-app)] opacity-40">{{ stat.subtitle }}</p>
          </div>
          <div 
            class="w-12 h-12 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: `${stat.color}15` }"
          >
            <UiIcon :name="stat.icon" size="lg" :style="{ color: stat.color }" />
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row - 2 columns -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Orders Trend -->
      <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl p-6 hover:shadow-lg hover:border-[var(--text-primary)]/30 transition-all cursor-pointer">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-[var(--text-app)]">{{ t('dashboard.ordersTrend') }}</h3>
          <span class="text-sm text-[var(--text-app)] opacity-60">{{ t('dashboard.last7Days') }}</span>
        </div>
        <!-- Mock Line Chart -->
        <div class="h-64 relative">
          <div class="absolute inset-0 flex items-end justify-between gap-2 px-4">
            <div class="flex-1 bg-[var(--text-primary)]/20 rounded-t-lg hover:bg-[var(--text-primary)]/30 transition-all cursor-pointer" style="height: 45%"></div>
            <div class="flex-1 bg-[var(--text-primary)]/20 rounded-t-lg hover:bg-[var(--text-primary)]/30 transition-all cursor-pointer" style="height: 60%"></div>
            <div class="flex-1 bg-[var(--text-primary)]/20 rounded-t-lg hover:bg-[var(--text-primary)]/30 transition-all cursor-pointer" style="height: 75%"></div>
            <div class="flex-1 bg-[var(--text-primary)]/20 rounded-t-lg hover:bg-[var(--text-primary)]/30 transition-all cursor-pointer" style="height: 55%"></div>
            <div class="flex-1 bg-[var(--text-primary)]/20 rounded-t-lg hover:bg-[var(--text-primary)]/30 transition-all cursor-pointer" style="height: 85%"></div>
            <div class="flex-1 bg-[var(--text-primary)]/20 rounded-t-lg hover:bg-[var(--text-primary)]/30 transition-all cursor-pointer" style="height: 70%"></div>
            <div class="flex-1 bg-[var(--text-primary)]/20 rounded-t-lg hover:bg-[var(--text-primary)]/30 transition-all cursor-pointer" style="height: 90%"></div>
          </div>
        </div>
        <div class="flex items-center justify-between mt-4 px-4 text-xs text-[var(--text-app)] opacity-60">
          <span>B.e</span>
          <span>Ç.a</span>
          <span>Ç</span>
          <span>C.a</span>
          <span>C</span>
          <span>Ş</span>
          <span>B</span>
        </div>
      </div>

      <!-- Revenue Chart -->
      <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl p-6 hover:shadow-lg hover:border-[var(--text-primary)]/30 transition-all cursor-pointer">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-[var(--text-app)]">{{ t('dashboard.revenueChart') }}</h3>
          <span class="text-sm text-[var(--text-app)] opacity-60">{{ t('dashboard.thisMonth') }}</span>
        </div>
        <div class="space-y-4 mb-6">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-[#28c76f]"></div>
              <span class="text-sm text-[var(--text-app)]">{{ t('dashboard.completed') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-[#ff9f43]"></div>
              <span class="text-sm text-[var(--text-app)]">{{ t('dashboard.pending') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-[#ea5455]"></div>
              <span class="text-sm text-[var(--text-app)]">{{ t('dashboard.cancelled') }}</span>
            </div>
          </div>
        </div>
        <!-- Mock Donut Chart -->
        <div class="h-52 flex items-center justify-center">
          <div class="relative w-48 h-48">
            <!-- Donut segments -->
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <!-- Completed (60%) -->
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#28c76f"
                stroke-width="12"
                stroke-dasharray="150.8 251.2"
                class="transition-all duration-300 hover:stroke-width-14"
              />
              <!-- Pending (25%) -->
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#ff9f43"
                stroke-width="12"
                stroke-dasharray="62.8 339.2"
                stroke-dashoffset="-150.8"
                class="transition-all duration-300 hover:stroke-width-14"
              />
              <!-- Cancelled (15%) -->
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#ea5455"
                stroke-width="12"
                stroke-dasharray="37.7 364.3"
                stroke-dashoffset="-213.6"
                class="transition-all duration-300 hover:stroke-width-14"
              />
            </svg>
            <!-- Center text -->
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-2xl font-bold text-[var(--text-app)]">1,234</span>
              <span class="text-xs text-[var(--text-app)] opacity-60">Cəmi sifariş</span>
            </div>
          </div>
        </div>
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 mt-6">
          <div class="text-center">
            <div class="text-lg font-bold text-[#28c76f]">740</div>
            <div class="text-xs text-[var(--text-app)] opacity-60">60%</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-[#ff9f43]">309</div>
            <div class="text-xs text-[var(--text-app)] opacity-60">25%</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-[#ea5455]">185</div>
            <div class="text-xs text-[var(--text-app)] opacity-60">15%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Products - Full width -->
    <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl p-6 hover:shadow-lg hover:border-[var(--text-primary)]/30 transition-all cursor-pointer">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold text-[var(--text-app)]">{{ t('dashboard.topProducts') }}</h3>
        <div class="flex gap-2">
          <button 
            @click="selectedFilter = 'today'"
            class="px-4 py-2 text-sm rounded-lg transition-all"
            :class="selectedFilter === 'today' ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-app)] hover:bg-[var(--bg-app)]'"
          >
            {{ t('dashboard.today') }}
          </button>
          <button 
            @click="selectedFilter = 'week'"
            class="px-4 py-2 text-sm rounded-lg transition-all"
            :class="selectedFilter === 'week' ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-app)] hover:bg-[var(--bg-app)]'"
          >
            {{ t('dashboard.thisWeek') }}
          </button>
          <button 
            @click="selectedFilter = 'month'"
            class="px-4 py-2 text-sm rounded-lg transition-all"
            :class="selectedFilter === 'month' ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-app)] hover:bg-[var(--bg-app)]'"
          >
            {{ t('dashboard.thisMonth') }}
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-[var(--border-app)]">
              <th class="text-left py-3 px-4 text-sm font-semibold text-[var(--text-app)] opacity-60">Məhsul</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-[var(--text-app)] opacity-60">Satış</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-[var(--text-app)] opacity-60">Gəlir</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(product, index) in topProducts" 
              :key="index"
              class="border-b border-[var(--border-app)] hover:bg-[var(--bg-app)] transition-all"
            >
              <td class="py-4 px-4 text-[var(--text-app)]">{{ product.name }}</td>
              <td class="py-4 px-4 text-right text-[var(--text-app)]">{{ product.sales }}</td>
              <td class="py-4 px-4 text-right font-semibold text-[var(--text-app)]">{{ product.revenue }} {{ product.suffix }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent Orders - Full width -->
    <div class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-xl p-6 hover:shadow-lg hover:border-[var(--text-primary)]/30 transition-all cursor-pointer">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold text-[var(--text-app)]">{{ t('dashboard.recentOrders') }}</h3>
        <button class="px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 rounded-lg transition-all">
          {{ t('dashboard.viewAll') }}
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-[var(--border-app)]">
              <th class="text-left py-3 px-4 text-sm font-semibold text-[var(--text-app)] opacity-60">Sifariş ID</th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-[var(--text-app)] opacity-60">Müştəri</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-[var(--text-app)] opacity-60">Məbləğ</th>
              <th class="text-center py-3 px-4 text-sm font-semibold text-[var(--text-app)] opacity-60">Status</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-[var(--text-app)] opacity-60">Tarix</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(order, index) in recentOrders" 
              :key="index"
              class="border-b border-[var(--border-app)] hover:bg-[var(--bg-app)] transition-all"
            >
              <td class="py-4 px-4 font-mono text-sm text-[var(--text-app)]">{{ order.id }}</td>
              <td class="py-4 px-4 text-[var(--text-app)]">{{ order.customer }}</td>
              <td class="py-4 px-4 text-right font-semibold text-[var(--text-app)]">{{ order.amount }} {{ order.suffix }}</td>
              <td class="py-4 px-4 text-center">
                <span 
                  class="px-3 py-1 rounded-full text-xs font-medium"
                  :class="{
                    'bg-[#28c76f]/10 text-[#28c76f]': order.status === 'completed',
                    'bg-[#ff9f43]/10 text-[#ff9f43]': order.status === 'pending',
                    'bg-[#ea5455]/10 text-[#ea5455]': order.status === 'cancelled'
                  }"
                >
                  {{ t(`dashboard.${order.status}`) }}
                </span>
              </td>
              <td class="py-4 px-4 text-right text-sm text-[var(--text-app)] opacity-60">{{ order.date }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
