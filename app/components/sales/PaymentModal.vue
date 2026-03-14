<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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
        <h3 class="text-xs font-bold tracking-widest">Ödəniş Yöntəmi</h3>
        <button @click="showManageMethodsModal = true" title="Yöntəmləri Redaktə Et" class="p-1 hover:bg-[var(--text-primary)]/10 rounded-lg transition-colors">
          <UiIcon name="lucide:settings-2" class="w-4 h-4" />
        </button>
      </div>

      <!-- Method Selection -->
      <div class="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          v-for="m in combinedMethods"
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
              <div class="text-[11px] font-bold opacity-50 tracking-widest mb-0.5">Seçilmiş Kart</div>
              <div class="font-black text-sm">{{ selectedGiftCard.barcode }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[11px] font-bold opacity-50 tracking-widest mb-0.5">Kartın Balansı</div>
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
              <div class="text-[11px] font-bold opacity-50 tracking-widest mb-0.5">Müştəri</div>
              <div class="font-black text-sm">{{ customer.firstName }} {{ customer.lastName }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[11px] font-bold opacity-50 tracking-widest mb-0.5">Bonus Balansı</div>
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
