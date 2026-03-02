<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string | number
  type?: string
  placeholder?: string
  icon?: string
  disabled?: boolean
  clearable?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'clear'])

const showPassword = ref(false)

const computedType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type || 'text'
})

const computedIcon = computed(() => {
  if (props.icon) return props.icon
  switch (props.type) {
    case 'email': return 'solar:letter-bold-duotone'
    case 'password': return 'solar:lock-password-bold-duotone'
    case 'tel': return 'solar:phone-bold-duotone'
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

  emit('update:modelValue', val)
}

const clear = () => {
  emit('update:modelValue', '')
  emit('clear')
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="relative group w-full">
    <!-- Left Icon -->
    <UiIcon 
      v-if="computedIcon" 
      :name="computedIcon" 
      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-app)] opacity-40 group-focus-within:text-[var(--text-primary)] group-focus-within:opacity-100 transition-colors pointer-events-none z-10" 
    />
    
    <!-- Input Element -->
    <input 
      :type="computedType" 
      :value="modelValue"
      @input="handleInput"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] py-2 text-sm rounded-lg outline-none focus:border-[var(--text-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      :class="[
        computedIcon ? 'pl-10' : 'pl-4', 
        (clearable && modelValue) || type === 'password' ? 'pr-10' : 'pr-4'
      ]"
    />
    
    <!-- Right Actions (Clear / Show Password) -->
    <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
      <!-- Clear Button -->
      <button 
        v-if="clearable && modelValue && type !== 'password'"
        @click="clear"
        class="text-[var(--text-app)] opacity-40 hover:opacity-100 hover:text-[var(--text-primary)] transition-all flex items-center justify-center w-5 h-5 rounded-full"
      >
        <UiIcon name="solar:close-circle-bold" class="w-4 h-4" />
      </button>

      <!-- Toggle Password -->
      <button 
        v-if="type === 'password'"
        @click="togglePassword"
        class="text-[var(--text-app)] opacity-40 hover:opacity-100 hover:text-[var(--text-primary)] transition-all flex items-center justify-center w-5 h-5 rounded-full"
      >
        <UiIcon :name="showPassword ? 'solar:eye-closed-bold-duotone' : 'solar:eye-bold-duotone'" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
