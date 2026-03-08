<script setup lang="ts">
import { ref, computed } from 'vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiModal from '~/components/ui/Modal.vue'

const props = defineProps<{
  modelValue: boolean
  total: number
  dbMethods: any[]
  selectedMethod: string
  isSaving?: boolean
  customer?: any
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'update:selectedMethod': [val: string]
  'confirm': [details?: any]
  'refresh-methods': []
}>()

const isManaging = ref(false)
const editingMethod = ref<any>(null)
const methodForm = ref({ name: '', icon: 'lucide:credit-card' })

// --- Multi-Payment & Cash State ---
const isMultiPayment = ref(false)
const multiPayments = ref<Record<string, number>>({})
const cashReceived = ref<number | string>('')
const giftCardBarcode = ref('')

const changeAmount = computed(() => {
  if (isMultiPayment.value) return 0
  const received = parseFloat(String(cashReceived.value)) || 0
  return Math.max(0, received - props.total)
})

const totalMultiAllocated = computed(() => {
  return Object.values(multiPayments.value).reduce((sum, val) => sum + (val || 0), 0)
})

const remainingToAllocate = computed(() => {
  return Math.max(0, props.total - totalMultiAllocated.value)
})

// Hardcoded system methods (Bonus is the only one needed here according to user)
const hardcodedMethods = [
  { id: 'bonus', name: 'Bonus', icon: 'lucide:sparkles', isSystem: true, isHardcoded: true },
  { id: 'gift_card', name: 'Hədiyyə Kartı', icon: 'lucide:gift', isSystem: true, isHardcoded: true }
]

const allMethods = computed(() => {
  // Filter out any accidentally synced system hardcoded methods from the DB list to avoid duplicates
  const filteredDbMethods = (props.dbMethods || []).filter(m => 
    !['Bonus', 'Hədiyyə Kartı', 'Loyalty'].includes(m.name)
  )
  return [... hardcodedMethods, ...filteredDbMethods]
})

const selectMethod = (name: string) => {
  if (isManaging.value) return
  
  if (isMultiPayment.value) {
    if (multiPayments.value[name] !== undefined) {
      delete multiPayments.value[name]
    } else {
      // Auto-allocate remaining if possible
      multiPayments.value[name] = remainingToAllocate.value > 0 ? Number(remainingToAllocate.value.toFixed(2)) : 0
    }
  } else {
    emit('update:selectedMethod', name)
    if (name !== 'Nəğd') cashReceived.value = ''
  }
}

const handleConfirm = () => {
  if (isMultiPayment.value) {
    if (totalMultiAllocated.value < props.total) {
      alert(`Məbləğ tam deyil! Çatışmayan: ${remainingToAllocate.value.toFixed(2)} ₼`)
      return
    }
    emit('confirm', {
      isMulti: true,
      payments: multiPayments.value,
      giftCardBarcode: giftCardBarcode.value
    })
  } else {
    emit('confirm', {
      isMulti: false,
      method: props.selectedMethod,
      received: cashReceived.value,
      change: changeAmount.value,
      giftCardBarcode: giftCardBarcode.value
    })
  }
}

// Management Handlers
const toggleManage = () => {
  isManaging.value = !isManaging.value
  editingMethod.value = null
  methodForm.value = { name: '', icon: 'lucide:credit-card' }
}

const saveMethod = async () => {
  if (!methodForm.value.name) return
  try {
    if (editingMethod.value) {
      await $fetch(`/api/payment-methods/${editingMethod.value.id}`, {
        method: 'PUT',
        body: methodForm.value
      })
    } else {
      await $fetch('/api/payment-methods', {
        method: 'POST',
        body: methodForm.value
      })
    }
    emit('refresh-methods')
    editingMethod.value = null
    methodForm.value = { name: '', icon: 'lucide:credit-card' }
  } catch (err) {
    console.error('Save failed', err)
  }
}

const deleteMethod = async (id: any) => {
  if (!confirm('Silmək istədiyinizə əminsiniz?')) return
  try {
    await $fetch(`/api/payment-methods/${id}`, { method: 'DELETE' })
    emit('refresh-methods')
  } catch (err) {
    console.error('Delete failed', err)
  }
}

const editMethod = (method: any) => {
  editingMethod.value = method
  methodForm.value = { name: method.name, icon: method.icon || 'lucide:credit-card' }
}

const availableIcons = [
  'lucide:credit-card', 'lucide:coins', 'lucide:banknote', 'lucide:wallet', 
  'lucide:smartphone', 'lucide:qr-code', 'lucide:sparkles', 'lucide:gift',
  'lucide:tag', 'lucide:award', 'lucide:shopping-bag'
]
</script>

<template>
  <UiModal 
    :modelValue="modelValue" 
    @update:modelValue="emit('update:modelValue', $event)"
    :title="isManaging ? 'Ödəniş Üsullarını İdarə Et' : 'Ödəniş Təsdiqi və Çap'" 
    max-width="md"
  >
    <div class="space-y-6">
      <!-- Transition wrapper for smooth switching between selection and management -->
      <Transition name="fade-slide" mode="out-in">
        
        <!-- SELECTION VIEW -->
        <div v-if="!isManaging" key="selection" class="space-y-6">
          <!-- Total Amount Card -->
          <div class="bg-[var(--text-primary)] shadow-sm p-5 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            <UiIcon name="lucide:banknote" class="w-12 h-12 absolute -right-2 -bottom-2 opacity-[0.05] text-white rotate-12" />
            <span class="text-white/60 font-medium text-[10px] mb-1">Ödəniləcək məbləğ</span>
            <span class="text-3xl font-black text-white tabular-nums">{{ total.toFixed(2) }} ₼</span>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between px-1">
              <div class="flex items-center gap-3">
                <h4 class="text-[11px] font-bold text-[var(--text-app)] opacity-60">Ödəniş metodu</h4>
                
                <!-- Multi-Payment Toggle -->
                <button 
                  @click="isMultiPayment = !isMultiPayment"
                  class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all"
                  :class="isMultiPayment ? 'bg-[var(--text-primary)] border-transparent text-white' : 'bg-[var(--input-bg)] border-[var(--border-app)] text-[var(--text-app)] opacity-50'"
                >
                  <UiIcon :name="isMultiPayment ? 'lucide:layers-2' : 'lucide:square'" class="w-3 h-3" />
                  <span class="text-[9px] font-black uppercase tracking-wider">Multi Ödəniş</span>
                </button>
              </div>

              <button 
                @click="toggleManage"
                class="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--input-bg)] border border-[var(--border-app)] hover:border-[var(--text-primary)]/40 text-[var(--text-app)] opacity-50 hover:opacity-100 transition-all"
              >
                <UiIcon name="lucide:pencil" class="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div class="grid grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto p-1 custom-scrollbar pb-4 border-b border-[var(--border-app)]/30">
              <button 
                v-for="method in allMethods"
                :key="method.id"
                @click="selectMethod(method.name)"
                class="group relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-200"
                :class="[
                  (isMultiPayment ? multiPayments[method.name] !== undefined : selectedMethod === method.name)
                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)] shadow-sm' 
                  : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/20 text-[var(--text-app)] bg-[var(--bg-app)] opacity-60 hover:opacity-100'
                ]"
              >
                <div class="relative z-10 flex flex-col items-center">
                  <div 
                    class="w-9 h-9 rounded-xl mb-2 flex items-center justify-center transition-all duration-200"
                    :class="(isMultiPayment ? multiPayments[method.name] !== undefined : selectedMethod === method.name) ? 'bg-[var(--text-primary)] text-white shadow-md' : 'bg-[var(--input-bg)] group-hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] opacity-40 group-hover:opacity-100'"
                  >
                    <UiIcon :name="method.icon || 'lucide:credit-card'" class="w-4.5 h-4.5" />
                  </div>
                  <span class="text-[10px] font-bold tracking-tight text-center leading-tight">{{ method.name }}</span>
                </div>
                <!-- Checkmark -->
                <div v-if="(isMultiPayment ? multiPayments[method.name] !== undefined : selectedMethod === method.name)" class="absolute top-1.5 right-1.5 animate-in zoom-in duration-300">
                  <div class="w-4 h-4 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-white border border-white/20">
                    <UiIcon name="lucide:check" class="w-2.5 h-2.5 stroke-[4]" />
                  </div>
                </div>
              </button>
            </div>

            <!-- Single Mode: Cash/Gift/Bonus Details -->
            <div v-if="!isMultiPayment" class="animate-in slide-in-from-top-2 duration-300">
              <!-- Nəğd -->
              <div v-if="selectedMethod === 'Nəğd'" class="p-4 bg-[var(--input-bg)] rounded-3xl border border-[var(--border-app)]">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-[11px] font-black text-[var(--text-app)] opacity-40 uppercase tracking-wider">Alınan Məbləğ</span>
                  <span class="text-xs font-black text-[var(--text-primary)] tabular-nums">{{ total.toFixed(2) }} ₼</span>
                </div>
                <div class="relative">
                  <UiInput 
                    v-model="cashReceived" 
                    type="number" 
                    placeholder="0.00" 
                    class="!text-lg !font-black !py-3"
                    autofocus 
                  />
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-app)] opacity-20 font-black">₼</div>
                </div>
                
                <div v-if="changeAmount > 0" class="mt-4 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex justify-between items-center group">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Geri Ödəniş</span>
                    <span class="text-xl font-black text-emerald-600 tabular-nums">{{ changeAmount.toFixed(2) }} ₼</span>
                  </div>
                  <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                    <UiIcon name="lucide:coins" class="w-5 h-5" />
                  </div>
                </div>
              </div>

              <!-- Hədiyyə Kartı (Gift Card) -->
              <div v-if="selectedMethod === 'Hədiyyə Kartı'" class="p-4 bg-[var(--input-bg)] rounded-3xl border border-[var(--border-app)]">
                <div class="flex items-center gap-3 mb-3">
                  <UiIcon name="lucide:ticket" class="w-5 h-5 text-[var(--text-primary)]" />
                  <span class="text-[11px] font-black text-[var(--text-app)] opacity-40 uppercase tracking-wider">Kart Barkodu</span>
                </div>
                <UiInput 
                  v-model="giftCardBarcode" 
                  placeholder="Məs: GC-1000 ..." 
                  icon="lucide:barcode"
                  class="!text-lg !font-black !py-3"
                />
              </div>

              <!-- Bonus -->
              <div v-if="selectedMethod === 'Bonus'" class="p-4 bg-[var(--input-bg)] rounded-3xl border border-[var(--border-app)]">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <UiIcon name="lucide:sparkles" class="w-5 h-5 text-amber-500" />
                    <span class="text-[11px] font-black text-[var(--text-app)] opacity-40 uppercase tracking-wider">Müştəri Bonusu</span>
                  </div>
                  <div v-if="customer" class="px-2 py-0.5 rounded-full bg-[var(--text-primary)]/10 text-[10px] font-bold text-[var(--text-primary)]">
                    {{ customer.firstName }}
                  </div>
                </div>

                <div class="flex items-end justify-between">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-bold opacity-30 uppercase">Mövcud Balans</span>
                    <span class="text-2xl font-black tabular-nums" :class="Number(customer?.bonus || 0) < total ? 'text-red-500' : 'text-amber-600'">
                      {{ (Number(customer?.bonus) || 0).toFixed(2) }} ₼
                    </span>
                  </div>
                  <div v-if="Number(customer?.bonus || 0) < total" class="text-[9px] font-black text-red-500 uppercase px-2 py-1 bg-red-500/10 rounded-lg">
                    Kifayət deyil
                  </div>
                  <div v-else class="text-[9px] font-black text-emerald-500 uppercase px-2 py-1 bg-emerald-500/10 rounded-lg">
                    Ödənişə hazırdır
                  </div>
                </div>
              </div>
            </div>

            <!-- Multi Mode: Amount Inputs -->
            <div v-if="isMultiPayment && Object.keys(multiPayments).length > 0" class="space-y-3 p-4 bg-[var(--input-bg)] rounded-3xl border border-[var(--border-app)] animate-in slide-in-from-top-2 duration-300">
              <div class="flex justify-between items-center mb-1">
                <span class="text-[11px] font-black text-[var(--text-app)] opacity-40 uppercase tracking-wider">Paylaşım</span>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold opacity-40 tracking-tight">Qalan:</span>
                  <span class="text-sm font-black text-[var(--text-primary)] tabular-nums">{{ remainingToAllocate.toFixed(2) }} ₼</span>
                </div>
              </div>
              
              <div class="space-y-2">
                <div 
                  v-for="(val, name) in multiPayments" 
                  :key="name"
                  class="flex items-center gap-3 p-2 bg-[var(--bg-app)] rounded-xl border border-[var(--border-app)]/50"
                >
                  <span class="text-[11px] font-bold text-[var(--text-app)] flex-1 truncate">{{ name }}</span>
                  <div class="w-24 relative">
                    <input 
                      type="number" 
                      v-model.number="multiPayments[name]"
                      class="w-full h-8 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-lg px-2 text-right text-[12px] font-black focus:border-[var(--text-primary)] focus:ring-0 no-spinners"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action -->
          <div class="flex flex-col gap-3 pt-5 border-t border-[var(--border-app)]/50">
            <UiButton 
              variant="success" 
              block 
              icon="lucide:printer"
              @click="handleConfirm"
              :loading="isSaving"
              :disabled="
                (isMultiPayment && remainingToAllocate > 0) ||
                (!isMultiPayment && selectedMethod === 'Bonus' && (!customer || (Number(customer.bonus) || 0) < total)) ||
                (!isMultiPayment && selectedMethod === 'Hədiyyə Kartı' && !giftCardBarcode) ||
                (!isMultiPayment && selectedMethod === 'Nəğd' && cashReceived !== '' && Number(cashReceived) < total)
              "
            >
              Təsdiqlə və Çap Et
            </UiButton>
            <UiButton 
              variant="ghost" 
              block 
              @click="emit('update:modelValue', false)"
            >
              Ləğv et
            </UiButton>
          </div>
        </div>

        <!-- MANAGEMENT VIEW -->
        <div v-else key="management" class="space-y-6">
          <div class="flex items-center gap-3">
            <button @click="toggleManage" class="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--input-bg)] border border-[var(--border-app)] hover:text-[var(--text-primary)] transition-all">
              <UiIcon name="lucide:arrow-left" class="w-4 h-4" />
            </button>
            <h4 class="text-[12px] font-bold text-[var(--text-app)]">Geri dön</h4>
          </div>

          <!-- Add/Edit Form -->
          <div class="bg-[var(--input-bg)] border border-[var(--border-app)] p-5 rounded-2xl space-y-4">
            <h5 class="text-[10px] font-bold opacity-40 tracking-wider">{{ editingMethod ? 'Metodu yenilə' : 'Yeni ödəniş növü' }}</h5>
            <div class="flex gap-3">
              <div class="flex-1 relative">
                <UiInput v-model="methodForm.name" placeholder="Məs: Bank Transfer" :disabled="editingMethod?.isSystem" />
              </div>
              <UiButton variant="primary" size="md" @click="saveMethod">
                {{ editingMethod ? 'Yadda saxla' : 'Əlavə et' }}
              </UiButton>
            </div>
            <!-- Icon Picker -->
            <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              <button 
                v-for="icon in availableIcons" 
                :key="icon"
                @click="methodForm.icon = icon"
                class="shrink-0 w-8 h-8 rounded-lg border transition-all flex items-center justify-center"
                :class="methodForm.icon === icon ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)] scale-110' : 'bg-[var(--bg-app)] border-[var(--border-app)] text-[var(--text-app)] opacity-40'"
              >
                <UiIcon :name="icon" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Existing List -->
          <div class="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            <div 
              v-for="method in dbMethods.filter(m => !['Bonus', 'Hədiyyə Kartı'].includes(m.name))" 
              :key="method.id"
              class="flex items-center justify-between p-3 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-app)]">
                  <UiIcon :name="method.icon || 'lucide:credit-card'" class="w-5 h-5" />
                </div>
                <div>
                  <div class="text-[12px] font-bold">{{ method.name }}</div>
                  <div class="text-[8px] opacity-40 font-mono">ID: #00{{ method.id }}</div>
                </div>
              </div>
              <div class="flex gap-2">
                <button v-if="!method.isSystem" @click="editMethod(method)" class="w-8 h-8 rounded-lg hover:bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-app)] opacity-40 hover:opacity-100 transition-all"><UiIcon name="lucide:edit-2" class="w-3.5 h-3.5" /></button>
                <button v-if="!method.isSystem" @click="deleteMethod(method.id)" class="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-red-500 opacity-40 hover:opacity-100 transition-all"><UiIcon name="lucide:trash-2" class="w-3.5 h-3.5" /></button>
                <div v-else class="px-2 py-1 bg-[var(--text-primary)]/5 rounded text-[8px] font-bold text-[var(--text-primary)]/50">SİSTEM</div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </UiModal>
</template>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateX(10px); }
.fade-slide-leave-to { opacity: 0; transform: translateX(-10px); }

.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-app); border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-primary); }
</style>
