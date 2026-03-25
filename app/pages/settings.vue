<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import { useColorMode, useAuth } from '#imports'
import { useI18n } from '#i18n'
import azFlag from '~/assets/images/flags/az.png'
import enFlag from '~/assets/images/flags/gb.png'
import ruFlag from '~/assets/images/flags/ru.png'
import { getClientData } from '~/utils/clientData'
import { buildReceiptHtml, buildBarcodeHtml } from '~/utils/print/templates'
import { generateBarcodeDataUrl } from '~/utils/print/helpers'

definePageMeta({
  layout: false
})

const colorMode = useColorMode()
const { locales, locale, setLocale, t } = useI18n()

const clientData = getClientData()

const languageFlags: Record<string, string> = {
  az: azFlag,
  en: enFlag,
  ru: ruFlag
}

// Prepare language options for UiSelect
const languageOptions = computed(() => {
  return locales.value.map((l: any) => {
    return { label: l.name, value: l.code, image: languageFlags[l.code] }
  })
})

// Load attributes from API
const attributes = ref<any[]>([])
const loadAttributes = async () => {
  if (import.meta.client) {
    try {
      const { token } = useAuth()
      const data = await $fetch('/api/attributes', {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      attributes.value = data as any[]
    } catch (err) {
      console.error('Failed to load attributes:', err)
    }
  }
}

// Get first attribute with values for preview
const previewAttribute = computed(() => {
  if (attributes.value.length > 0) {
    const attr = attributes.value[0]
    if (attr.values && attr.values.length > 0) {
      return `${attr.name}: ${attr.values[0]}`
    }
  }
  return 'Ölçü: L'
})

type SettingsTab = 'notifications' | 'barcode' | 'receipt' | 'appearance'

type SettingsItem = { key: string; label: string; type?: 'switch' | 'theme' | 'language' }
type SettingsSection = { title: string; items: SettingsItem[] }

const settingsConfig: Record<SettingsTab, SettingsSection[]> = {
  notifications: [
    {
      title: 'settings.sections.notifications',
      items: [
        { key: 'sale_completed', label: 'settings.items.sale_completed' },
        { key: 'order_created', label: 'settings.items.order_created' },
        { key: 'refund_processed', label: 'settings.items.refund_processed' },
      ]
    },
    {
      title: 'settings.sections.inventory',
      items: [
        { key: 'stock_arrival', label: 'settings.items.stock_arrival' },
        { key: 'low_stock_warning', label: 'settings.items.low_stock_warning' },
        { key: 'out_of_stock', label: 'settings.items.out_of_stock' },
      ]
    },
    {
      title: 'settings.sections.system',
      items: [
        { key: 'daily_report_ready', label: 'settings.items.daily_report_ready' },
        { key: 'employee_login', label: 'settings.items.employee_login' },
        { key: 'new_expense_recorded', label: 'settings.items.new_expense_recorded' },
      ]
    }
  ],
  barcode: [
    {
      title: 'settings.sections.visual',
      items: [
        { key: 'showProductName', label: 'settings.items.showProductName' },
        { key: 'showPrice', label: 'settings.items.showPrice' },
        { key: 'showAttribute', label: 'settings.items.showAttribute' },
        { key: 'showBarcodeString', label: 'settings.items.showBarcodeString' },
        { key: 'showStoreName', label: 'settings.items.showStoreName' },
      ]
    }
  ],
  receipt: [
    {
      title: 'settings.sections.visual',
      items: [
        { key: 'showLogo', label: 'settings.items.showLogo' },
        { key: 'showStoreName', label: 'settings.items.showStoreName' },
        { key: 'showAddress', label: 'settings.items.showAddress' },
        { key: 'showPhone', label: 'settings.items.showPhone' },
        { key: 'showCashierName', label: 'settings.items.showCashierName' },
        { key: 'showCustomerName', label: 'settings.items.showCustomerName' },
        { key: 'showTaxRates', label: 'settings.items.showTaxRates' },
        { key: 'showFooterMessage', label: 'settings.items.showFooterMessage' },
      ]
    }
  ],
  appearance: [
    {
      title: 'settings.sections.appearance',
      items: [
        { key: 'theme_toggle', label: 'settings.items.theme_toggle', type: 'theme' },
        { key: 'language_select', label: 'settings.items.language_select', type: 'language' }
      ]
    }
  ]
}

const tabs: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'appearance', label: 'settings.tabs.appearance', icon: 'lucide:palette' },
  { id: 'notifications', label: 'settings.tabs.notifications', icon: 'lucide:bell' },
  { id: 'barcode', label: 'settings.tabs.barcode', icon: 'lucide:barcode' },
  { id: 'receipt', label: 'settings.tabs.receipt', icon: 'lucide:receipt' }
]

const activeTab = ref<SettingsTab>(tabs[0]?.id ?? 'notifications')

const defaultToggleState = {
  sale_completed: true,
  order_created: true,
  refund_processed: true,
  stock_arrival: true,
  low_stock_warning: true,
  out_of_stock: true,
  daily_report_ready: true,
  employee_login: true,
  new_expense_recorded: true,
  showLogo: true,
  showStoreName: true,
  showAddress: true,
  showPhone: true,
  showCashierName: true,
  showCustomerName: true,
  showProductName: true,
  showPrice: true,
  showAttribute: true,
  showBarcodeString: true,
  showTaxRates: true,
  showFooterMessage: true
}

const toggleState = ref<Record<string, boolean>>({ ...defaultToggleState })

const loadSettings = () => {
  if (import.meta.client) {
    try {
      const saved = localStorage.getItem('yessir_pos_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        toggleState.value = { ...defaultToggleState, ...parsed }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }
}

const saveSettings = () => {
  if (import.meta.client) {
    try {
      localStorage.setItem('yessir_pos_settings', JSON.stringify(toggleState.value))
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }
}

const toggleSetting = (key: string) => {
  toggleState.value[key] = !toggleState.value[key]
  saveSettings()
}

const dummyBarcodeUrl = ref('')

onMounted(() => {
  if (import.meta.client) {
    dummyBarcodeUrl.value = generateBarcodeDataUrl('123456789012', { height: 50, margin: 10 })
    loadSettings()
    loadAttributes()
  }
})

const receiptPreviewHtml = computed(() => {
  // Create a mock clientData that respects toggleState
  const mockClientData = {
    ...clientData,
    logoSvg: toggleState.value['showLogo'] ? clientData.logoSvg : '',
    name: toggleState.value['showStoreName'] ? clientData.name : '',
    address: toggleState.value['showAddress'] ? clientData.address : ''
  }

  // Use dynamic attribute for preview
  const itemAttribute = toggleState.value['showAttribute'] && attributes.value.length > 0
    ? previewAttribute.value
    : undefined

  // Dummy receipt data
  const dummyData: any = {
    receiptNo: '12345678',
    cashierName: toggleState.value['showCashierName'] ? 'Admin' : '***',
    currentDate: new Date().toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
    subtotal: 50.00,
    finalTotal: 50.00,
    discountTotal: 0,
    discountVal: 0,
    discountType: 'amount',
    items: [{
      productName: 'Test Məhsul',
      barcode: '1234567890',
      qty: 1,
      price: 50.00,
      finalPrice: 50.00,
      discount: 0,
      discountType: 'amount',
      discountValue: 0,
      itemDiscountType: 'amount',
      total: 50.00,
      attribute: itemAttribute
    }],
    customer: toggleState.value['showCustomerName'] ? {
      name: 'Nümunə Müştəri',
      barcode: 'C123',
      newBalance: 10.50,
      earned: 2.50,
      spent: 0
    } : undefined,
    paymentDetails: {
      isMulti: false,
      method: 'Nəğd',
      received: 50.00,
      change: 0
    }
  }

  return buildReceiptHtml(dummyData, mockClientData as any, dummyBarcodeUrl.value)
})

const barcodePreviewHtml = computed(() => {
  const mockClientData = {
    ...clientData,
    name: toggleState.value['showStoreName'] ? clientData.name : ''
  }

  const dummyBarcode: any = {
    productName: toggleState.value['showProductName'] ? 'T-Shirt Qara' : '',
    barcode: '123456789012',
    price: toggleState.value['showPrice'] ? 50.00 : undefined,
    attribute: toggleState.value['showAttribute'] ? previewAttribute.value : undefined,
    showBarcodeString: toggleState.value['showBarcodeString']
  }

  return buildBarcodeHtml(dummyBarcode, mockClientData as any, dummyBarcodeUrl.value)
})
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-app)] text-[var(--text-app)] flex flex-col pt-6">
    <div class="w-full mx-auto flex-1 flex flex-col px-6">
      <!-- Internal Header -->
      <div class="flex items-center gap-5 mb-8 flex-shrink-0">
        <NuxtLink to="/" class="hover:text-[var(--text-primary)] transition-all duration:300">
          <UiIcon name="lucide:arrow-left" class="h-5 w-5" />
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-playfair font-semibold tracking-tight text-[var(--text-app)]">{{ t('settings.title') }}</h1>
          <p class="text-[var(--text-muted)] text-[14px] mt-0.5">{{ t('settings.subtitle') }}</p>
        </div>
      </div>

      <!-- Main Split Layout -->
      <div class="flex flex-col md:flex-row flex-1 gap-8 pb-6">
        <!-- Left Sidebar Navigation -->
        <div class="w-full md:w-72 shrink-0 flex flex-col gap-2 md:sticky top-6 h-fit z-10 md:pr-2">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-5 py-3.5 rounded-2xl text-[15px] font-medium transition-all duration-300 flex items-center gap-3 w-full text-left"
            :class="activeTab === tab.id ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-app)] hover:bg-[var(--text-primary)]/10'"
          >
            <UiIcon :name="tab.icon" class="w-5 h-5 flex-shrink-0" :class="activeTab === tab.id ? 'text-white' : 'text-[var(--text-muted)]'" />
            <span class="truncate">{{ t(tab.label) }}</span>
          </button>
        </div>

        <!-- Right Content Area -->
        <div class="flex-1 md:pr-4 w-full mx-auto" :class="(activeTab === 'receipt' || activeTab === 'barcode') ? 'max-w-4xl' : 'max-w-xl'">
          <Transition 
            name="fade-slide" 
            mode="out-in"
          >
            <div :key="activeTab" class="flex flex-col lg:flex-row gap-6 w-full">
              
              <!-- Settings Fields -->
              <div class="flex flex-col gap-6 flex-1">
                <div 
                  v-for="(section, sIdx) in (settingsConfig[activeTab] || [])" 
                  :key="section.title"
                  class="bg-[var(--card-bg)] border border-[var(--border-app)] rounded-2xl transition-colors duration-300 flex-1 h-min"
                >
                  <div class="px-6 py-4 bg-[var(--input-bg)]/50 rounded-t-2xl border-b border-[var(--border-app)]">
                    <h2 class="text-[16px] font-semibold text-[var(--text-app)]">{{ t(section.title) }}</h2>
                  </div>
                  <div class="divide-y divide-[var(--border-app)]">
                    <div 
                      v-for="item in section.items" 
                      :key="item.key"
                      class="px-6 py-4 flex items-center justify-between"
                    >
                      <span class="text-[15px] font-medium text-[var(--text-app)] opacity-90">{{ t(item.label) }}</span>
                      
                      <!-- Custom Switch (UiSwitch) -->
                      <UiSwitch 
                        v-if="!item.type || item.type === 'switch'"
                        :model-value="toggleState[item.key] ?? false"
                        @update:model-value="toggleSetting(item.key)"
                      />

                      <!-- Theme Toggle (Switch Style) -->
                      <UiSwitch 
                        v-else-if="item.type === 'theme'"
                        :model-value="colorMode.value === 'dark'"
                        @update:model-value="colorMode.preference = $event ? 'dark' : 'light'"
                      />

                      <!-- Language Selector -->
                      <div v-else-if="item.type === 'language'" class="w-48 relative -my-2 flex justify-end">
                        <UiSelect 
                          :model-value="locale"
                          @update:model-value="setLocale"
                          :options="languageOptions"
                          class="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Live Previews -->
              <div v-if="activeTab === 'receipt' || activeTab === 'barcode'" class="w-full lg:w-[320px] shrink-0 border border-[var(--border-app)] bg-[var(--card-bg)] rounded-xl relative overflow-auto flex flex-col items-center justify-start p-6">
                <!-- RECEIPT PREVIEW iframe -->
                  <div v-if="activeTab === 'receipt'" class="bg-white text-black shadow-xl overflow-hidden" style="width: 80mm; min-height: 100mm;">
                    <iframe :srcdoc="receiptPreviewHtml" class="w-full min-h-[500px] border-0" frameborder="0" scrolling="no" style="display: block;"></iframe>
                  </div>

                  <!-- BARCODE PREVIEW iframe -->
                  <div v-if="activeTab === 'barcode'" class="bg-white text-black shadow-xl overflow-visible flex items-center justify-center" style="width: 50mm; height: 30mm;">
                    <iframe :srcdoc="barcodePreviewHtml" class="w-full h-full border-0" frameborder="0" scrolling="no" style="display: block;"></iframe>
                  </div>
              </div>

            </div>
          </Transition>
        </div>
      </div>
    </div>
    
    <LayoutFooter />
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
  filter: blur(8px);
}

/* Theme switch animation */
.theme-switch-enter-active,
.theme-switch-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-switch-enter-from {
  opacity: 0;
  transform: rotate(-180deg) scale(0.3);
}

.theme-switch-leave-to {
  opacity: 0;
  transform: rotate(180deg) scale(0.3);
}
</style>