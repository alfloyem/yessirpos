<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import countryList from '~/utils/countries.json'
import { useI18n } from '#i18n'

const { locale } = useI18n()

const props = defineProps<{
  modelValue: string | number
  type?: string
  placeholder?: string
  icon?: string
  disabled?: boolean
  clearable?: boolean
  showPassword?: boolean
  barcodePrefix?: string
  size?: 'sm' | 'md'
}>()

const emit = defineEmits(['update:modelValue', 'clear', 'update:showPassword'])

const localShowPassword = ref(false)
const isPasswordVisible = computed(() => props.showPassword ?? localShowPassword.value)

// --- Phone Code Logic ---
const showPhoneDropdown = ref(false)
const selectedCountry = ref<any>(countryList.find((c: any) => c.value === 'AZ') || countryList[0])
const phoneDropdownRef = ref<HTMLElement | null>(null)
let phoneSearchTimeout: any = null
let phoneSearchTerm = ''

// --- Mask Helpers ---
const applyMask = (val: string, mask: string) => {
  if (!mask) return val
  const digits = String(val).replace(/\D/g, '')
  let result = ''
  let dIdx = 0
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === '9') {
      if (dIdx < digits.length) {
        result += digits[dIdx++]
      } else {
        break
      }
    } else {
      if (dIdx < digits.length) {
        result += mask[i]
      } else {
        break
      }
    }
  }
  return result
}

const getDigits = (val: string) => String(val || '').replace(/\D/g, '')

// Detect country from modelValue (e.g. "+994...")
const detectCountry = (val: string | number) => {
  const v = String(val || '')
  if (v.startsWith('+')) {
    // Sort by length descending to match longest code first (e.g. +35818 over +358)
    const sorted = [...countryList].filter(c => c.phoneCode).sort((a, b) => (b.phoneCode?.length || 0) - (a.phoneCode?.length || 0))
    const found = sorted.find(c => v.startsWith(c.phoneCode || ''))
    if (found) selectedCountry.value = found
  }
}

const handlePhoneDropdownOutsideClick = (e: MouseEvent) => {
  if (phoneDropdownRef.value && !phoneDropdownRef.value.contains(e.target as Node)) {
    showPhoneDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handlePhoneDropdownOutsideClick)
  detectCountry(props.modelValue)
})
onUnmounted(() => document.removeEventListener('click', handlePhoneDropdownOutsideClick))

const filteredCountries = computed(() => countryList.filter(c => c.phoneCode))

const selectPhoneCountry = (country: any) => {
  const oldCode = selectedCountry.value?.phoneCode || ''
  selectedCountry.value = country
  showPhoneDropdown.value = false
  
  if (props.type === 'tel') {
    let val = String(props.modelValue)
    if (val.startsWith(oldCode)) {
      // Swap code but keep digits
      const digits = val.substring(oldCode.length).replace(/\D/g, '')
      emit('update:modelValue', `${country.phoneCode}${digits}`)
    } else {
      // Prepend code if not there
      const digits = val.replace(/\D/g, '')
      emit('update:modelValue', `${country.phoneCode}${digits}`)
    }
  }
}

const handlePhoneKeydown = (e: KeyboardEvent) => {
  if (!showPhoneDropdown.value) return
  if (e.key === 'Escape') {
    showPhoneDropdown.value = false
    return
  }
  if (e.key.length === 1) {
    if (phoneSearchTimeout) clearTimeout(phoneSearchTimeout)
    phoneSearchTerm += e.key.toLowerCase()
    phoneSearchTimeout = setTimeout(() => phoneSearchTerm = '', 600)
    
    const matched = filteredCountries.value.find(c => c.label.toLowerCase().startsWith(phoneSearchTerm))
    if (matched) {
      const el = phoneDropdownRef.value?.querySelector(`[data-code="${matched.value}"]`) as HTMLElement
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
  }
}

const computedType = computed(() => {
  if (props.type === 'password') {
    return isPasswordVisible.value ? 'text' : 'password'
  }
  if (props.type === 'barcode' || props.type === 'number' || props.type === 'integer') {
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
    case 'date':
    case 'datetime-local': return 'lucide:calendar'
    default: return ''
  }
})

const localValue = computed(() => {
  if (props.type === 'tel') {
    const val = String(props.modelValue || '')
    const code = selectedCountry.value?.phoneCode || ''
    if (val.startsWith(code)) {
      const digits = val.substring(code.length).replace(/\D/g, '')
      return applyMask(digits, selectedCountry.value?.mask)
    }
    return applyMask(val.replace(/\D/g, ''), selectedCountry.value?.mask)
  }
  return String(props.modelValue || '')
})

const computedPlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder
  if (props.type === 'tel' && selectedCountry.value?.mask) {
    let mask = selectedCountry.value.mask
    let count = 0
    // Generate an example based on mask: 50, 40, etc.
    return mask.replace(/9/g, () => {
      count++
      if (count <= 2) return '5'
      if (count <= 3) return '4'
      return '0'
    })
  }
  return props.placeholder || (props.type === 'tel' ? '(55) 555-55-55' : '')
})

const inputRef = ref<HTMLInputElement | null>(null)

const handleInput = (e: Event) => {
  let val = (e.target as HTMLInputElement).value

  // Telefon numarası giriliyorsa maske uygula ve modelValue'yu full string olarak emit et (+994...)
  if (props.type === 'tel') {
    const digits = val.replace(/\D/g, '')
    const code = selectedCountry.value?.phoneCode || ''
    emit('update:modelValue', `${code}${digits}`)
    
    // UI update handled by computed localValue, but we should make sure the input element is clean
    const formatted = applyMask(digits, selectedCountry.value?.mask)
    if ((e.target as HTMLInputElement).value !== formatted) {
      (e.target as HTMLInputElement).value = formatted
    }
    return
  }

  // Barcode: allow free input, only strip whitespace
  if (props.type === 'barcode') {
    val = val.replace(/\s/g, '')
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

  // Integer specific formatting
  if (props.type === 'integer') {
    val = val.replace(/[^\d]/g, '')
    if ((e.target as HTMLInputElement).value !== val) {
      (e.target as HTMLInputElement).value = val
    }
  }

  emit('update:modelValue', val)
}

const handleInputClick = () => {
  if (props.type === 'datetime-local' || props.type === 'date') {
    try {
      // @ts-ignore - showPicker is a newer standard, may not be in all TS versions
      if (inputRef.value?.showPicker) {
        // @ts-ignore
        inputRef.value.showPicker()
      }
    } catch (e) {
      console.warn('showPicker not supported', e)
    }
  }
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
  } else if (props.type === 'integer') {
    let val = (e.target as HTMLInputElement).value
    if (val !== '') {
      const parsed = parseInt(val, 10)
      if (!isNaN(parsed)) {
        val = String(parsed)
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

const handleCopy = (e: ClipboardEvent) => {
  if (props.type === 'tel') {
    const target = e.target as HTMLInputElement
    const selection = target.value.substring(target.selectionStart || 0, target.selectionEnd || 0)
    if (selection) {
      const digits = selection.replace(/\D/g, '')
      e.clipboardData?.setData('text/plain', digits)
      e.preventDefault()
    }
  }
}

const handleInputKeydown = (e: KeyboardEvent) => {
  if (props.type === 'tel' || props.type === 'number') {
    if (
      e.ctrlKey || e.metaKey || e.altKey ||
      ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)
    ) {
      return
    }

    if (/^[0-9]$/.test(e.key)) {
      return
    }

    if (props.type === 'number' && ['.', ','].includes(e.key)) {
      const val = String(props.modelValue || '')
      if (!val.includes('.') && !val.includes(',')) {
        return
      }
    }

    e.preventDefault()
  }
}
</script>

<template>
  <div class="relative group w-full">
    
    <!-- Phone Code Dropdown -->
    <div 
      v-if="type === 'tel'" 
      class="absolute left-0 top-0 bottom-0 z-20 flex items-center pr-2 pl-3" 
      ref="phoneDropdownRef" 
      @keydown="handlePhoneKeydown"
    >
      <button 
        type="button" 
        @click="showPhoneDropdown = !showPhoneDropdown"
        class="h-[80%] flex items-center gap-1.5 px-2 rounded-lg transition-colors outline-none cursor-pointer"
        :disabled="disabled"
      >
        <span class="emoji-flag text-[18px]">{{ selectedCountry?.flag }}</span>
        <span class="text-[14px] font-bold text-[var(--text-app)]">{{ selectedCountry?.phoneCode }}</span>
        <UiIcon name="lucide:chevron-down" class="w-3 h-3 text-[var(--text-app)] opacity-50" />
      </button>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95 translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-2"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-2"
        leave-to-class="opacity-0 scale-95 translate-y-1"
      >
        <div 
          v-if="showPhoneDropdown"
          class="absolute top-full left-0 mt-2 w-64 bg-[var(--input-bg)] border border-[var(--border-app)] rounded-[14px] shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
        >
          <button
            v-for="country in filteredCountries"
            :key="country.value"
            :data-code="country.value"
            type="button"
            @click="selectPhoneCountry(country)"
            class="w-full px-4 py-2.5 text-[14px] font-medium text-left hover:bg-[var(--text-primary)]/10 transition-colors cursor-pointer flex items-center justify-between"
          >
            <div class="flex items-center gap-2 truncate pr-2">
              <span class="emoji-flag text-[17px] -mt-0.5 flex-shrink-0">{{ country.flag }}</span>
              <span class="text-[var(--text-app)] truncate">{{ country.label }}</span>
            </div>
            <span class="text-[var(--text-app)] opacity-60 flex-shrink-0">{{ country.phoneCode }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- Container for normal inputs -->
    <div class="relative w-full flex-1">
      <!-- Left Icon -->
      <UiIcon 
        v-if="computedIcon && type !== 'tel'" 
        :name="computedIcon" 
        class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] opacity-40 group-focus-within:text-[var(--text-primary)] group-focus-within:opacity-100 transition-colors pointer-events-none z-10" 
      />
      
      <!-- Input Element -->
      <input 
        ref="inputRef"
        :type="computedType" 
        :value="localValue"
        @input="handleInput"
        @click="handleInputClick"
        @blur="handleBlur"
        @copy="handleCopy"
        @keydown="handleInputKeydown"
        :placeholder="computedPlaceholder"
        :disabled="disabled"
        :lang="locale"
        class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] font-medium rounded-[14px] outline-none focus:border-[var(--text-primary)] focus:ring-2 focus:ring-[var(--text-primary)]/10 hover:border-[var(--text-muted)] transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--border-app)] placeholder:font-normal"
        :class="[
          size === 'sm' ? 'py-1.5 text-[13px]' : 'py-3 text-[15px]',
          computedIcon && type !== 'tel' ? (size === 'sm' ? 'pl-9' : 'pl-11') : (type === 'tel' ? 'pl-[115px]' : (size === 'sm' ? 'px-3' : 'px-5')), 
          (clearable && modelValue) || type === 'password' ? (size === 'sm' ? 'pr-9' : 'pr-11') : (size === 'sm' ? 'pr-3' : 'pr-5'),
          type === 'barcode' ? 'font-mono tracking-wider' : '',
          (type === 'date' || type === 'datetime-local') ? 'cursor-pointer' : ''
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
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}
/* Hide native calendar icon in modern browsers to avoid double icons */
input[type="date"]::-webkit-calendar-picker-indicator,
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: transparent;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  z-index: 1;
}

/* For Firefox */
input[type="date"],
input[type="datetime-local"] {
  appearance: textfield;
  -moz-appearance: textfield;
}

/* Mobile: force full width, prevent overflow */
input[type="datetime-local"],
input[type="date"] {
  min-width: 0 !important;
  max-width: 100% !important;
  width: 100% !important;
  box-sizing: border-box;
}
</style>
