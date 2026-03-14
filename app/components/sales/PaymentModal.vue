<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Modal from '~/components/ui/Modal.vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiButton from '~/components/ui/Button.vue'

const props = defineProps<{
  modelValue: boolean
  selectedMethod: string
  total: number
  dbMethods?: any[]
  isSaving?: boolean
  customer?: any
}>()

const emit = defineEmits([
  'update:modelValue',
  'update:selectedMethod',
  'update:customer',
  'confirm',
  'refresh-methods'
])

// Payment Methods
const methods = [
  { id: 'Nəğd', name: 'Nəğd', icon: 'lucide:coins', color: 'green' },
  { id: 'Bank Kartı', name: 'Kart', icon: 'lucide:credit-card', color: 'blue' },
  { id: 'Hədiyyə Kartı', name: 'Hədiyyə Kartı', icon: 'lucide:gift', color: 'purple' },
  { id: 'Bonus', name: 'Bonus', icon: 'lucide:star', color: 'yellow' }
]

const internalMethod = ref(props.selectedMethod || 'Nəğd')
watch(() => props.selectedMethod, (val) => {
  internalMethod.value = val || 'Nəğd'
})

// Cash Input
const receivedAmount = ref<string>('')

// Calculate change
const changeAmount = computed(() => {
  const received = parseFloat(receivedAmount.value) || 0
  return received - props.total
})

const handleConfirm = () => {
  let details: any = {
    isMulti: false,
    method: internalMethod.value,
  }
  
  if (internalMethod.value === 'Nəğd') {
    const r = parseFloat(receivedAmount.value) || 0
    details.received = r
    details.change = changeAmount.value
  } else if (internalMethod.value === 'Hədiyyə Kartı') {
    details.giftCardBarcode = selectedGiftCard.value?.barcode
  }

  emit('confirm', details)
}

// Gift Card Logic
const showGiftCardModal = ref(false)
const giftCards = ref<any[]>([])
const selectedGiftCard = ref<any>(null)
const tempSelectedGiftCard = ref<any>(null)

const fetchGiftCards = async () => {
  try {
    const data = await $fetch<any[]>('/api/gift-cards')
    giftCards.value = data || []
  } catch (err) {
    console.error(err)
  }
}

const confirmGiftCard = () => {
  selectedGiftCard.value = tempSelectedGiftCard.value
  showGiftCardModal.value = false
}

// Customer Selection Logic
const showCustomerModal = ref(false)
const customersList = ref<any[]>([])
const tempSelectedCustomer = ref<any>(null)

const fetchCustomers = async () => {
  try {
    const data = await $fetch<any[]>('/api/customers')
    customersList.value = data || []
  } catch (err) {
    console.error(err)
  }
}

const confirmCustomer = () => {
  emit('update:customer', tempSelectedCustomer.value)
  showCustomerModal.value = false
}

// Reset cash input and gift card choices when modal opens or total changes
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    receivedAmount.value = ''
    selectedGiftCard.value = null
    tempSelectedGiftCard.value = null
    fetchGiftCards() // Always fetch fresh data from DB when modal opens
    fetchCustomers() // Refresh customer data to get latest bonus
  }
})

const selectMethod = (methodId: string) => {
  const isSecondClick = internalMethod.value === methodId
  internalMethod.value = methodId
  emit('update:selectedMethod', methodId)

  if (methodId === 'Hədiyyə Kartı') {
    tempSelectedGiftCard.value = selectedGiftCard.value
    showGiftCardModal.value = true
  }

  if (methodId === 'Bonus') {
    // Only open if no customer selected OR explicitly clicked a second time
    if (!props.customer || isSecondClick) {
      if (customersList.value.length === 0) fetchCustomers()
      tempSelectedCustomer.value = props.customer
      showCustomerModal.value = true
    }
  }
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="md"
    hide-header
  >
    <div class="flex-1 items-end justify-end flex">
      <button 
      @click="emit('update:modelValue', false)" 
      class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-app)] bg-[var(--input-bg)] bg-opacity-50 hover:bg-[var(--text-primary)] hover:text-white transition-all shadow-sm"
    >
      <UiIcon name="lucide:x" class="w-4 h-4" />
    </button>
    </div>
    
    <!-- Total Display -->
    <div class="text-5xl font-black text-[var(--text-primary)] text-center">
      {{ total.toFixed(2) }} ₼
    </div>

    <div class="py-6 space-y-4">
      <!-- Methods Header -->
      <div class="opacity-50 flex items-center justify-between hover:text-[var(--text-primary)] hover:opacity-100 transition-all">
        <h3>Ödəniş Yöntəmi</h3>
        <button title="Yöntəmləri Redaktə Et">
          <UiIcon name="lucide:edit-3" class="w-4 h-4" />
        </button>
      </div>

      <!-- Method Selection -->
      <div class="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          v-for="m in methods"
          :key="m.id"
          @click="selectMethod(m.id)"
          class="flex items-center justify-start gap-2.5 sm:gap-3 p-3 sm:p-4 border rounded-xl transition-all cursor-pointer font-bold relative"
          :class="internalMethod === m.id 
            ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/5 text-[var(--text-primary)]' 
            : 'border-[var(--border-app)] text-[var(--text-app)] opacity-60 hover:opacity-100 hover:border-[var(--text-primary)]/40 hover:bg-[var(--bg-app)]'"
        >
          <UiIcon :name="m.icon" class="w-5 h-5 sm:w-6 sm:h-6 shrink-0" :class="internalMethod === m.id ? 'text-[var(--text-primary)]' : ''" />
          <span class="text-xs sm:text-sm whitespace-nowrap">{{ m.name }}</span>
        </button>
      </div>

      <!-- Cash Details (Only if Nəğd is selected) -->
      <div v-if="internalMethod === 'Nəğd'" class="pt-4 mt-2 border-t border-[var(--border-app)] border-dashed">
        <div class="flex items-center gap-6 flex-col">
          <div class="w-full">
            <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-50 tracking-widest mb-1.5">Alınan Məbləğ (₼)</label>
            <input 
              v-model="receivedAmount"
              type="number"
              class="w-full bg-transparent border-0 border-b-2 border-[var(--border-app)] focus:border-[var(--text-primary)] focus:ring-0 py-1 px-0 text-xl font-black outline-none transition-all placeholder:opacity-30"
              placeholder="0.00"
            />
          </div>

          <div class="w-full text-right">
            <span class="block text-[11px] font-bold tracking-widest mb-1.5" :class="changeAmount >= 0 ? 'text-green-500 opacity-80' : 'text-red-500 opacity-80'">
              {{ changeAmount >= 0 ? 'Qaytarılacaq qalıq' : 'Çatışmayan məbləğ' }}
            </span>
            <span class="font-black text-xl" :class="changeAmount >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ Math.abs(changeAmount).toFixed(2) }} ₼
            </span>
          </div>
        </div>
      </div>

      <!-- Gift Card Details -->
      <div v-if="internalMethod === 'Hədiyyə Kartı'" class="pt-4 mt-2 border-t border-[var(--border-app)] border-dashed">
        <div v-if="selectedGiftCard" class="flex items-center justify-between p-4 bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/20 rounded-xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[var(--text-primary)]/10 flex items-center justify-center text-[var(--text-primary)]">
              <UiIcon name="lucide:gift" class="w-5 h-5" />
            </div>
            <div>
              <div class="text-[11px] font-bold opacity-50 uppercase tracking-widest mb-0.5">Seçilmiş Kart</div>
              <div class="font-black text-sm">{{ selectedGiftCard.barcode }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[11px] font-bold opacity-50 uppercase tracking-widest mb-0.5">Kartın Balansı</div>
            <div class="font-black text-lg text-[var(--text-primary)]" :class="(selectedGiftCard.value || 0) < total ? 'text-red-500' : ''">
              {{ (selectedGiftCard.value || 0).toFixed(2) }} ₼
            </div>
          </div>
        </div>
        <div v-else class="text-center py-6 opacity-50 font-bold text-sm bg-[var(--bg-app)] rounded-xl border border-[var(--border-app)]">
          Zəhmət olmasa hədiyyə kartı seçin
        </div>
      </div>

      <!-- Bonus Details -->
      <div v-if="internalMethod === 'Bonus'" class="pt-4 mt-2 border-t border-[var(--border-app)] border-dashed">
        <div v-if="customer" class="flex items-center justify-between p-4 bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/20 rounded-xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[var(--text-primary)]/10 flex items-center justify-center text-[var(--text-primary)]">
              <UiIcon name="lucide:star" class="w-5 h-5" />
            </div>
            <div>
              <div class="text-[11px] font-bold opacity-50 uppercase tracking-widest mb-0.5">Müştəri</div>
              <div class="font-black text-sm">{{ customer.firstName }} {{ customer.lastName }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[11px] font-bold opacity-50 uppercase tracking-widest mb-0.5">Bonus Balansı</div>
            <div class="font-black text-lg text-[var(--text-primary)]" :class="(customer.bonus || 0) < total ? 'text-red-500' : ''">
              {{ (Number(customer.bonus) || 0).toFixed(2) }} ₼
            </div>
          </div>
        </div>
        <div v-else class="text-center py-6 opacity-50 font-bold text-sm bg-[var(--bg-app)] rounded-xl border border-[var(--border-app)]">
          Zəhmət olmasa müştəri seçin
        </div>
      </div>
    </div>

    <UiButton 
        class="w-full text-lg py-7 shadow-xl font-black rounded-2xl"
        size="lg"
        variant="primary"
        :loading="isSaving"
        @click="handleConfirm"
      >
        <div class="flex items-center gap-2">
          <span>Ödənişi Tamamla</span>
          <UiIcon name="lucide:printer" class="w-5 h-5 opacity-80" />
        </div>
    </UiButton>
  </Modal>

  <!-- Gift Card Selection Sub-Modal -->
  <Modal
    v-model="showGiftCardModal"
    title="Hədiyyə Kartı Seçin"
    max-width="sm"
  >
    <div class="space-y-6 pt-2 pb-2">
      <div class="space-y-2">
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-50 uppercase tracking-widest">Barkodla Axtar</label>
        <UiAutocomplete
          :modelValue="tempSelectedGiftCard?.id"
          @update:modelValue="(val: any) => {
            tempSelectedGiftCard = giftCards.find(c => c.id === val)
          }"
          :options="giftCards.map(c => ({
            label: c.barcode,
            value: c.id,
            extra: `${c.value} ₼`
          }))"
          placeholder="Məs: G1234567..." 
          icon="lucide:gift" 
          class="!rounded-xl"
        />
      </div>

      <div v-if="tempSelectedGiftCard" class="p-4 rounded-xl border border-[var(--border-app)] bg-[var(--bg-app)] flex justify-between items-center transition-all">
        <div class="font-bold text-sm text-[var(--text-app)]">
          {{ tempSelectedGiftCard.barcode }}
        </div>
        <div class="font-black text-[var(--text-primary)]">
          {{ tempSelectedGiftCard.value.toFixed(2) }} ₼
        </div>
      </div>

      <UiButton 
        variant="primary" 
        block 
        size="lg"
        @click="confirmGiftCard"
        class="!rounded-xl font-black"
        :disabled="!tempSelectedGiftCard"
      >
        Seçimi Təsdiqlə
      </UiButton>
    </div>
  </Modal>

  <!-- Customer Selection Sub-Modal -->
  <Modal
    v-model="showCustomerModal"
    title="Müştəri Seçin"
    max-width="sm"
  >
    <div class="space-y-6 pt-2 pb-2">
      <div class="space-y-2">
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-50 uppercase tracking-widest">Müştəri Axtar</label>
        <UiAutocomplete
          :modelValue="tempSelectedCustomer?.id"
          @update:modelValue="(val: any) => {
            tempSelectedCustomer = customersList.find(c => c.id === val)
          }"
          :options="customersList.map(c => ({
            label: `${c.firstName} ${c.lastName}`,
            value: c.id,
            extra: `${c.bonus || 0} ₼`
          }))"
          placeholder="Ad, Soyad və ya Barkod..." 
          icon="lucide:user" 
          class="!rounded-xl"
        />
      </div>

      <div v-if="tempSelectedCustomer" class="p-4 rounded-xl border border-[var(--border-app)] bg-[var(--bg-app)] flex justify-between items-center transition-all">
        <div class="font-bold text-sm text-[var(--text-app)]">
          {{ tempSelectedCustomer.firstName }} {{ tempSelectedCustomer.lastName }}
        </div>
        <div class="font-black text-[var(--text-primary)]">
          {{ (Number(tempSelectedCustomer.bonus) || 0).toFixed(2) }} ₼
        </div>
      </div>

      <UiButton 
        variant="primary" 
        block 
        size="lg"
        @click="confirmCustomer"
        class="!rounded-xl font-black"
        :disabled="!tempSelectedCustomer"
      >
        Müştərini Təsdiqlə
      </UiButton>
    </div>
  </Modal>
</template>
