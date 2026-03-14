<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useToast } from '#imports'
import Modal from '~/components/ui/Modal.vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiButton from '~/components/ui/Button.vue'
import UiIconSelector from '~/components/ui/IconSelector.vue'

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

const toast = useToast()

// Payment Methods Logic
const internalMethod = ref(props.selectedMethod || 'Nəğd')

const combinedMethods = computed(() => {
  const db = props.dbMethods || []
  const systemDefaults = [
    { id: 'Nəğd', name: 'Nəğd', icon: 'lucide:coins', isSystem: true },
    { id: 'Bank Kartı', name: 'Kart', icon: 'lucide:credit-card', isSystem: true },
    { id: 'Hədiyyə Kartı', name: 'Hədiyyə Kartı', icon: 'lucide:gift', isSystem: true },
    { id: 'Bonus', name: 'Bonus', icon: 'lucide:star', isSystem: true }
  ]
  
  // Custom methods from DB (not in system defaults)
  const systemNames = ['Nəğd', 'Bank Kartı', 'Hədiyyə Kartı', 'Bonus']
  const customs = db.filter(m => !systemNames.includes(m.name)).map(m => ({
    id: m.name,
    name: m.name,
    icon: m.icon || 'lucide:credit-card',
    isSystem: false,
    rawId: m.id
  }))
  
  return [...systemDefaults, ...customs]
})

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

// Multi-payment Logic
const isMultiPayment = ref(false)
const multiPayments = ref<Record<string, number>>({})
const showMaxError = ref<Record<string, boolean>>({})

const multiTotal = computed(() => {
  return Object.values(multiPayments.value).reduce((sum, val) => sum + (val || 0), 0)
})

const remainingMultiTotal = computed(() => {
  return props.total - multiTotal.value
})

const handleConfirm = () => {
  let details: any = {
    isMulti: isMultiPayment.value,
  }
  
  if (isMultiPayment.value) {
    details.payments = { ...multiPayments.value }
    // Allowed if remaining is 0 or less (overpayment/change)
    if (remainingMultiTotal.value > 0.01) {
      return 
    }
    // IMPORTANT: Send barcode if gift card is part of multi-payment
    if ((multiPayments.value['Hədiyyə Kartı'] || 0) > 0) {
      details.giftCardBarcode = selectedGiftCard.value?.barcode
    }
  } else {
    details.method = internalMethod.value
    if (internalMethod.value === 'Nəğd') {
      const r = parseFloat(receivedAmount.value) || 0
      details.received = r
      details.change = changeAmount.value
    } else if (internalMethod.value === 'Hədiyyə Kartı') {
      details.giftCardBarcode = selectedGiftCard.value?.barcode
    }
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

// Manage Methods Logic
const showManageMethodsModal = ref(false)
const newMethodName = ref('')
const newMethodIcon = ref('lucide:credit-card')
const isAddingMethod = ref(false)

const addMethod = async () => {
  if (!newMethodName.value.trim()) return
  isAddingMethod.value = true
  try {
    await $fetch('/api/payment-methods', {
      method: 'POST',
      body: {
        name: newMethodName.value.trim(),
        icon: newMethodIcon.value,
        isSystem: false
      }
    })
    newMethodName.value = ''
    newMethodIcon.value = 'lucide:credit-card'
    emit('refresh-methods')
  } catch (err) {
    console.error(err)
  } finally {
    isAddingMethod.value = false
  }
}

const deleteMethod = async (id: string) => {
  try {
    await $fetch(`/api/payment-methods/${id}`, { method: 'DELETE' })
    emit('refresh-methods')
  } catch (err) {
    console.error(err)
  }
}

const activeIconPickerId = ref<string | null>(null)
const tempEditIcon = ref('')

const toggleIconPicker = (id: string, currentIcon: string) => {
  if (activeIconPickerId.value === id) {
    activeIconPickerId.value = null
  } else {
    activeIconPickerId.value = id
    tempEditIcon.value = currentIcon || 'lucide:credit-card'
  }
}

const updateMethod = async (method: any) => {
  try {
    await $fetch(`/api/payment-methods/${method.id}`, {
      method: 'PUT',
      body: method
    })
    emit('refresh-methods')
  } catch (err) {
    console.error(err)
  }
}

const updateMethodIcon = async (method: any, newIcon: string) => {
  method.icon = newIcon
  await updateMethod(method)
  activeIconPickerId.value = null
}

// Reset everything when modal opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    receivedAmount.value = ''
    selectedGiftCard.value = null
    tempSelectedGiftCard.value = null
    isMultiPayment.value = false
    multiPayments.value = {}
    fetchGiftCards()
    fetchCustomers()
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
    if (!props.customer || isSecondClick) {
      if (customersList.value.length === 0) fetchCustomers()
      tempSelectedCustomer.value = props.customer
      showCustomerModal.value = true
    }
  }

  if (isMultiPayment.value) {
    // In multi-mode, clicking a button sets it to current remaining or toggles it?
    // Let's just focus the input for that method or something
  }
}

const handleMultiInput = (methodName: string, value: any) => {
  multiPayments.value[methodName] = parseFloat(value) || 0
  showMaxError.value[methodName] = false
}

const handleBlur = (methodName: string) => {
  let val = multiPayments.value[methodName] || 0
  let clamped = false
  
  if (methodName === 'Bonus' && props.customer) {
    const max = Number(props.customer.bonus) || 0
    if (val > max) {
      val = max
      clamped = true
    }
  } else if (methodName === 'Hədiyyə Kartı' && selectedGiftCard.value) {
    const max = Number(selectedGiftCard.value.value) || 0
    if (val > max) {
      val = max
      clamped = true
    }
  }

  if (clamped) {
    multiPayments.value[methodName] = val
    toast.error('Maksimum balansdan çox məbləğ daxil edilə bilməz')
  }

  if ((multiPayments.value[methodName] || 0) <= 0) {
    delete multiPayments.value[methodName]
  }
}

const handleFocus = (event: Event) => {
  (event.target as HTMLInputElement).select()
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
      <div class="flex items-center justify-between">
        <div class="opacity-50 flex items-center gap-2 hover:text-[var(--text-primary)] hover:opacity-100 transition-all cursor-default">
          <h3 class="text-xs font-bold tracking-widest">Ödəniş Yöntəmi</h3>
          <button @click="showManageMethodsModal = true" title="Yöntəmləri Redaktə Et" class="p-1 hover:bg-[var(--text-primary)]/10 rounded-lg transition-colors">
            <UiIcon name="lucide:settings-2" class="w-4 h-4" />
          </button>
        </div>

        <!-- Multi-Payment Switch -->
        <button 
          @click="isMultiPayment = !isMultiPayment"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border shrink-0"
          :class="isMultiPayment 
            ? 'bg-[var(--text-primary)]/10 border-[var(--text-primary)]/30 text-[var(--text-primary)]' 
            : 'bg-[var(--bg-app)] border-[var(--border-app)] text-[var(--text-app)] opacity-60'"
        >
          <UiIcon :name="isMultiPayment ? 'lucide:layers' : 'lucide:layer-base'" class="w-3.5 h-3.5" />
          <span class="text-[10px] font-black tracking-widest uppercase">Multi Ödəniş</span>
          <div 
            class="w-6 h-3.5 rounded-full relative transition-all"
            :class="isMultiPayment ? 'bg-[var(--text-primary)]' : 'bg-gray-500/30'"
          >
            <div 
              class="w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
              :class="isMultiPayment ? 'right-0.5' : 'left-0.5'"
            ></div>
          </div>
        </button>
      </div>

      <!-- Method Selection Grid (Single & Multi) -->
      <div class="grid grid-cols-2 gap-2 sm:gap-3">
        <div
          v-for="m in combinedMethods"
          :key="m.id"
          class="flex flex-col border rounded-xl transition-all font-bold relative group"
          :class="[
            !isMultiPayment ? (internalMethod === m.id ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/5 text-[var(--text-primary)]' : 'border-[var(--border-app)] text-[var(--text-app)] opacity-60 hover:opacity-100 hover:border-[var(--text-primary)]/40 hover:bg-[var(--bg-app)]') : '',
            isMultiPayment ? ((multiPayments[m.name] || 0) > 0 ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/5' : 'border-[var(--border-app)] opacity-80') : ''
          ]"
        >
          <div @click="selectMethod(m.id)" class="flex items-center gap-2.5 p-3 sm:p-4 cursor-pointer">
            <UiIcon :name="m.icon" class="w-5 h-5 shrink-0" :class="(!isMultiPayment && internalMethod === m.id) || (isMultiPayment && (multiPayments[m.name] || 0) > 0) ? 'text-[var(--text-primary)]' : ''" />
            <div class="flex flex-col items-start min-w-0">
              <span class="text-xs sm:text-sm whitespace-nowrap truncate w-full">{{ m.name }}</span>
              <!-- Balance inside select (Single Mode) -->
              <span v-if="!isMultiPayment && m.id === 'Bonus' && customer" class="text-[9px] opacity-70 font-bold tabular-nums">Balans: {{ customer.bonus }} ₼</span>
              <span v-if="!isMultiPayment && m.id === 'Hədiyyə Kartı' && selectedGiftCard" class="text-[9px] opacity-70 font-bold tabular-nums">Balans: {{ selectedGiftCard.value }} ₼</span>
            </div>
          </div>

          <!-- Inline Multi Input area -->
          <div 
            v-if="isMultiPayment" 
            class="px-3 pb-3 -mt-1 animate-in slide-in-from-top-1 duration-200" 
            @click.stop="((m.id === 'Bonus' && !customer) || (m.id === 'Hədiyyə Kartı' && !selectedGiftCard)) ? selectMethod(m.id) : null"
          >
            <div class="relative space-y-1">
              <div class="flex justify-between items-center px-1">
                <div v-if="m.id === 'Bonus' && customer" class="flex items-center gap-2">
                  <span class="text-[8px] opacity-40 font-black">Maks: {{ (Number(customer.bonus) || 0).toFixed(2) }} ₼</span>
                  <span v-if="showMaxError['Bonus']" class="text-[8px] text-red-500 font-bold animate-pulse">! Maksimum</span>
                </div>
                <div v-else-if="m.id === 'Hədiyyə Kartı' && selectedGiftCard" class="flex items-center gap-2">
                  <span class="text-[8px] opacity-40 font-black">Maks: {{ (Number(selectedGiftCard.value) || 0).toFixed(2) }} ₼</span>
                  <span v-if="showMaxError['Hədiyyə Kartı']" class="text-[8px] text-red-500 font-bold animate-pulse">! Maksimum</span>
                </div>
                <span v-else-if="m.id === 'Bonus' && !customer" class="text-[8px] opacity-40 italic">Müştəri seçin</span>
                <span v-else-if="m.id === 'Hədiyyə Kartı' && !selectedGiftCard" class="text-[8px] opacity-40 italic">Kart seçin</span>
                <div class="flex-1"></div>
              </div>
              
              <div class="relative">
                <input 
                  v-model.number="multiPayments[m.name]"
                  @input="handleMultiInput(m.name, ($event.target as HTMLInputElement).value)"
                  @blur="handleBlur(m.name)"
                  type="number"
                  step="0.01"
                  inputmode="decimal"
                  placeholder="0.00"
                  class="w-full bg-white/5 rounded-lg border border-transparent focus:border-[var(--text-primary)] text-right text-xs font-black outline-none px-2 py-1.5 tabular-nums placeholder:opacity-20 no-spinner"
                  @focus="handleFocus"
                />
                <span v-if="(multiPayments[m.name] || 0) > 0" class="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-[var(--text-primary)] opacity-50">₼</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Balance Info for Multi -->
      <div v-if="isMultiPayment" class="p-4 rounded-2xl bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 flex justify-between items-center mt-2 animate-in fade-in zoom-in duration-300">
        <div class="flex flex-col">
          <span class="text-[10px] font-bold opacity-40 tracking-widest">
            {{ remainingMultiTotal < -0.01 ? 'Qaytarılacaq qalıq' : 'Qalıq Balans' }}
          </span>
          <span class="text-lg font-black" :class="remainingMultiTotal < -0.01 ? 'text-green-500' : (Math.abs(remainingMultiTotal) < 0.01 ? 'text-green-500' : 'text-[var(--text-primary)]')">
            {{ Math.abs(remainingMultiTotal).toFixed(2) }} ₼
          </span>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-bold opacity-40 tracking-widest">Daxil edilən</span>
          <span class="block text-sm font-black opacity-80">{{ multiTotal.toFixed(2) }} ₼</span>
        </div>
      </div>

      <!-- Cash Details (Only if Nəğd is selected) -->
      <div v-if="!isMultiPayment && internalMethod === 'Nəğd'" class="pt-4 mt-2 border-t border-[var(--border-app)] border-dashed">
        <div class="flex items-center gap-6 flex-col">
          <div class="w-full">
            <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-50 tracking-widest mb-1.5">Alınan Məbləğ (₼)</label>
            <input 
              v-model="receivedAmount"
              type="number"
              step="0.01"
              inputmode="decimal"
              class="w-full bg-transparent border-0 border-b-2 border-[var(--border-app)] focus:border-[var(--text-primary)] focus:ring-0 py-1 px-0 text-xl font-black outline-none transition-all placeholder:opacity-30 no-spinner"
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
    </div>

    <UiButton 
        class="w-full text-lg py-7 shadow-xl font-black rounded-2xl"
        size="lg"
        variant="primary"
        :loading="isSaving"
        :disabled="isMultiPayment && remainingMultiTotal > 0.01"
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
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-50 tracking-widest">Barkodla Axtar</label>
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
        <label class="block text-[11px] font-bold text-[var(--text-app)] opacity-50 tracking-widest">Müştəri Axtar</label>
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

  <!-- Manage Payment Methods Modal -->
  <Modal
    v-model="showManageMethodsModal"
    title="Ödəniş Üsulları"
    max-width="sm"
  >
    <div class="space-y-5 pt-1 pb-2 min-h-[400px]">
      <!-- Add New Row -->
      <div class="relative flex items-center gap-2 p-2 rounded-xl bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 mx-1">
        <div class="relative">
          <button 
            @click="toggleIconPicker('new', newMethodIcon)"
            class="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--bg-app)] text-[var(--text-primary)] border border-[var(--text-primary)]/20 hover:border-[var(--text-primary)] transition-all shadow-sm active:scale-95"
          >
            <UiIcon :name="newMethodIcon" class="w-4 h-4" />
          </button>
          
          <!-- New Icon Picker Popover -->
          <div v-if="activeIconPickerId === 'new'" class="fixed z-[999] mt-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-200">
            <UiIconSelector v-model="newMethodIcon" @update:modelValue="activeIconPickerId = null" />
            <button @click="activeIconPickerId = null" class="fixed inset-0 z-[-1] cursor-default bg-transparent"></button>
          </div>
        </div>

        <input 
          v-model="newMethodName"
          type="text"
          placeholder="Yeni..."
          class="flex-1 bg-transparent border-none px-1 py-1 text-sm font-bold placeholder:text-[var(--text-app)]/20 outline-none"
          @keyup.enter="addMethod"
        />

        <button 
          @click="addMethod"
          class="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--text-primary)] text-white shadow-lg shadow-[var(--text-primary)]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          :disabled="isAddingMethod || !newMethodName.trim()"
        >
          <UiIcon v-if="!isAddingMethod" name="lucide:plus" class="w-5 h-5" />
          <UiIcon v-else name="lucide:loader-2" class="w-4 h-4 animate-spin" />
        </button>
      </div>

      <div class="h-[1px] bg-[var(--border-app)] opacity-40 mx-4"></div>

      <!-- List of Existing Methods -->
      <div class="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar px-1 pb-6">
        <div 
          v-for="m in dbMethods?.filter(item => !item.isSystem)" 
          :key="m.id"
          class="group flex items-center justify-between p-1.5 rounded-xl border border-transparent hover:border-[var(--border-app)] hover:bg-white/[0.04] transition-all"
        >
          <div class="flex items-center gap-3 flex-1">
            <div class="relative">
              <button 
                @click="toggleIconPicker(m.id, m.icon)"
                class="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--bg-app)] text-[var(--text-app)] opacity-80 border border-[var(--border-app)] hover:opacity-100 hover:border-[var(--text-primary)]/40 transition-all active:scale-95 shadow-sm"
              >
                <UiIcon :name="m.icon || 'lucide:credit-card'" class="w-4 h-4" />
              </button>
              
              <!-- Popover Picker -->
              <div v-if="activeIconPickerId === m.id" class="fixed z-[999] mt-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-200">
                <UiIconSelector 
                  v-model="tempEditIcon" 
                  @update:modelValue="(val) => updateMethodIcon(m, val)"
                />
                <button @click="activeIconPickerId = null" class="fixed inset-0 z-[-1] cursor-default bg-transparent"></button>
              </div>
            </div>

            <input 
              v-model="m.name"
              class="flex-1 bg-transparent border-none text-sm font-bold opacity-80 focus:opacity-100 outline-none transition-all"
              @blur="updateMethod(m)"
              @keyup.enter="($event.target as HTMLInputElement).blur()"
            />
          </div>
          
          <button 
            @click="deleteMethod(m.id)"
            class="w-8 h-8 flex items-center justify-center text-red-500/20 group-hover:text-red-500/60 hover:!text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
          >
            <UiIcon name="lucide:trash-2" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* Hide Chrome/Safari/Edge/Opera arrows */
.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Hide Firefox arrows */
.no-spinner {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
