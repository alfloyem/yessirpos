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
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'update:selectedMethod': [val: string]
  'confirm': []
  'refresh-methods': []
}>()

const isManaging = ref(false)
const editingMethod = ref<any>(null)
const methodForm = ref({ name: '', icon: 'lucide:credit-card' })

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
  emit('update:selectedMethod', name)
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
              <h4 class="text-[11px] font-bold text-[var(--text-app)] opacity-60">Ödəniş metodu</h4>
              <button 
                @click="toggleManage"
                class="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--input-bg)] border border-[var(--border-app)] hover:border-[var(--text-primary)]/40 text-[var(--text-app)] opacity-50 hover:opacity-100 transition-all"
              >
                <UiIcon name="lucide:pencil" class="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div class="grid grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
              <button 
                v-for="method in allMethods"
                :key="method.id"
                @click="selectMethod(method.name)"
                class="group relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-200"
                :class="selectedMethod === method.name 
                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)] shadow-sm' 
                  : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/20 text-[var(--text-app)] bg-[var(--bg-app)] opacity-60 hover:opacity-100'"
              >
                <div class="relative z-10 flex flex-col items-center">
                  <div 
                    class="w-9 h-9 rounded-xl mb-2 flex items-center justify-center transition-all duration-200"
                    :class="selectedMethod === method.name ? 'bg-[var(--text-primary)] text-white shadow-md' : 'bg-[var(--input-bg)] group-hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] opacity-40 group-hover:opacity-100'"
                  >
                    <UiIcon :name="method.icon || 'lucide:credit-card'" class="w-4.5 h-4.5" />
                  </div>
                  <span class="text-[10px] font-bold tracking-tight text-center leading-tight">{{ method.name }}</span>
                </div>
                <div v-if="selectedMethod === method.name" class="absolute top-1.5 right-1.5 animate-in zoom-in duration-300">
                  <div class="w-4 h-4 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-white border border-white/20">
                    <UiIcon name="lucide:check" class="w-2.5 h-2.5 stroke-[4]" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Bottom Action -->
          <div class="flex flex-col gap-3 pt-5 border-t border-[var(--border-app)]/50">
            <UiButton 
              variant="success" 
              block 
              class="!h-11 !rounded-xl !text-[13px] font-bold text-white shadow-lg shadow-emerald-500/20 bg-gradient-to-r from-emerald-500 to-green-600 border-none transition-all hover:scale-[1.01] active:scale-[0.99]"
              @click="emit('confirm')"
              :loading="isSaving"
            >
              <span class="flex items-center justify-center gap-2.5">
                <UiIcon name="lucide:printer" class="w-4.5 h-4.5" />
                Təsdiqlə və Çap Et
              </span>
            </UiButton>
            <button @click="emit('update:modelValue', false)" class="w-full h-10 rounded-xl text-xs font-bold text-[var(--text-app)] opacity-40 hover:opacity-100 transition-all">Ləğv et</button>
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
                <UiInput v-model="methodForm.name" placeholder="Məs: Bank Transfer" class="!h-10 !rounded-xl !text-xs !bg-[var(--bg-app)]" :disabled="editingMethod?.isSystem" />
              </div>
              <UiButton variant="primary" size="sm" class="!h-10 !rounded-xl !px-6" @click="saveMethod">
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
