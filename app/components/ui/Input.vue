<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string | number
  type?: string
  placeholder?: string
  icon?: string
  disabled?: boolean
  clearable?: boolean
  showPassword?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'clear', 'update:showPassword'])

const localShowPassword = ref(false)
const isPasswordVisible = computed(() => props.showPassword ?? localShowPassword.value)

const computedType = computed(() => {
  if (props.type === 'password') {
    return isPasswordVisible.value ? 'text' : 'password'
  }
  if (props.type === 'barcode') {
    return 'text'
  }
  return props.type || 'text'
})

const computedIcon = computed(() => {
  if (props.icon) return props.icon
  switch (props.type) {
    case 'email': return 'lucide:mail'
    case 'password': return 'lucide:lock'
    case 'tel': return 'lucide:phone'
    case 'barcode': return 'lucide:barcode'
    default: return ''
  }
})

const handleInput = (e: Event) => {
  let val = (e.target as HTMLInputElement).value

  // Telefon numarası giriliyorsa sadece rakam ve belirli işaretlere (+, tire, boşluk) izin ver
  if (props.type === 'tel') {
    val = val.replace(/[^\d\s\-\+]/g, '')
    // Ekranda da değerin değişmesi için DOM'u güncelle
    if ((e.target as HTMLInputElement).value !== val) {
      (e.target as HTMLInputElement).value = val
    }
  }

  // Barcode specific formatting: C + 7 digits max
  if (props.type === 'barcode') {
    let digits = val.replace(/[^\d]/g, '').slice(0, 7)
    val = `C${digits}`
    if ((e.target as HTMLInputElement).value !== val) {
      (e.target as HTMLInputElement).value = val
    }
  }

  // Bonus/Number specific formatting
  if (props.type === 'number') {
    val = val.replace(/[^\d\.]/g, '')
    if ((e.target as HTMLInputElement).value !== val) {
      (e.target as HTMLInputElement).value = val
    }
  }

  emit('update:modelValue', val)
}

const handleBlur = (e: Event) => {
  if (props.type === 'number') {
    let val = (e.target as HTMLInputElement).value
    if (val !== '') {
      const parsed = parseFloat(val)
      if (!isNaN(parsed)) {
        val = parsed.toFixed(2)
        if ((e.target as HTMLInputElement).value !== val) {
          (e.target as HTMLInputElement).value = val
        }
        emit('update:modelValue', val)
      }
    }
  }
}

const clear = () => {
  emit('update:modelValue', '')
  emit('clear')
}

const togglePassword = () => {
  localShowPassword.value = !localShowPassword.value
  emit('update:showPassword', !isPasswordVisible.value)
}
</script>

<template>
  <div class="relative group w-full">
    <!-- Left Icon -->
    <UiIcon 
      v-if="computedIcon" 
      :name="computedIcon" 
      class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] opacity-40 group-focus-within:text-[var(--text-primary)] group-focus-within:opacity-100 transition-colors pointer-events-none z-10" 
    />
    
    <!-- Input Element -->
    <input 
      :type="computedType" 
      :value="modelValue"
      @input="handleInput"
      @blur="handleBlur"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] py-3 text-[15px] font-medium rounded-[14px] outline-none focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--text-primary)]/10 hover:border-[var(--text-muted)] transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--border-app)] placeholder:font-normal"
      :class="[
        computedIcon ? 'pl-11' : 'pl-5', 
        (clearable && modelValue) || type === 'password' ? 'pr-11' : 'pr-5'
      ]"
    />
    
    <!-- Right Actions (Clear / Show Password) -->
    <div class="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
      <!-- Clear Button -->
      <button 
        v-if="clearable && modelValue && type !== 'password'"
        @click="clear"
        class="text-[var(--text-app)] opacity-40 hover:opacity-100 hover:text-[var(--text-primary)] transition-all flex items-center justify-center w-6 h-6 rounded-full"
      >
        <UiIcon name="lucide:x-circle" class="w-4 h-4" />
      </button>

      <!-- Toggle Password -->
      <button 
        v-if="type === 'password'"
        @click="togglePassword"
        class="text-[var(--text-app)] opacity-40 hover:opacity-100 hover:text-[var(--text-primary)] transition-all flex items-center justify-center w-6 h-6 rounded-full"
      >
        <UiIcon :name="isPasswordVisible ? 'lucide:eye-off' : 'lucide:eye'" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
