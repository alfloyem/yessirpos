<script setup lang="ts">
import { computed } from 'vue'
import UiInput from '~/components/ui/Input.vue'
import UiSelect from '~/components/ui/Select.vue'
import TagsInput from '~/components/ui/TagsInput.vue'
import { useI18n } from '#i18n'

export interface FormField {
  key: string
  label: string
  type: 'text' | 'email' | 'password' | 'tel' | 'textarea' | 'select' | 'number' | 'date' | 'datetime' | 'tags' | 'barcode'
  options?: { label: string, value: any }[] // For select
  required?: boolean
  colSpan?: 1 | 2
  icon?: string // Optional icon
  historyKey?: string // For tags
}

const props = defineProps<{
  fields: FormField[]
  modelValue: Record<string, any>
  isLoading?: boolean
  gridCols?: 1 | 2
  errors?: Record<string, string>
}>()

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const passwordVisibility = ref<Record<string, boolean>>({})

const updateField = (key: string, value: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const formatDateTimeForDisplay = (value: string) => {
  if (!value) return ''
  if (value.match(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/)) return value
  
  const parts = value.split(' ')
  if (parts.length === 2 && parts[0] && parts[1]) {
    const datePart = parts[0]
    const timePart = parts[1]
    const [year, month, day] = datePart.split('-')
    return `${day}.${month}.${year} ${timePart}`
  }
  return value
}

const parseDateTimeFromDisplay = (value: string) => {
  if (!value) return ''
  if (value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)) return value
  
  const parts = value.split(' ')
  if (parts.length === 2 && parts[0] && parts[1]) {
    const datePart = parts[0]
    const timePart = parts[1]
    const [day, month, year] = datePart.split('.')
    return `${year}-${month}-${day} ${timePart}`
  }
  return value
}

const enhancedFields = computed(() => {
  const result: (FormField & { isConfirm?: boolean, originalKey?: string })[] = []
  for (const field of props.fields) {
    result.push(field)
    if (field.type === 'password') {
      result.push({
        key: `${field.key}Confirm`,
        label: `${field.label} ${t('common.confirm', 'Təkrarı')}`,
        type: 'password',
        icon: field.icon,
        required: field.required,
        isConfirm: true,
        originalKey: field.key,
        colSpan: field.colSpan
      })
    }
  }
  return result
})

const isPasswordMismatch = (field: any) => {
  if (field.isConfirm && field.originalKey) {
    const originalValue = props.modelValue[field.originalKey]
    const confirmValue = props.modelValue[field.key]
    return confirmValue && originalValue !== confirmValue
  }
  return false
}
</script>

<template>
  <div 
    class="grid gap-4" 
    :class="gridCols === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'"
  >
    <div 
      v-for="field in enhancedFields" 
      :key="field.key" 
      class="space-y-1"
      :class="(field.colSpan === 2 || gridCols === 1) ? 'col-span-1 md:col-span-2' : 'col-span-1'"
    >
      <label class="text-xs font-bold text-[var(--text-app)] tracking-wider">
        {{ field.label }} 
        <span v-if="field.required" class="text-[var(--color-brand-danger)] ml-0.5">*</span>
      </label>
      
      <!-- Textarea -->
      <div v-if="field.type === 'textarea'" class="relative group w-full">
        <textarea 
          :value="modelValue[field.key]"
          @input="e => updateField(field.key, (e.target as HTMLTextAreaElement).value)"
          :disabled="isLoading"
          class="w-full bg-[var(--input-bg)] border border-[var(--border-app)] px-5 py-3 text-[15px] font-medium rounded-[14px] outline-none focus:border-[var(--text-primary)] transition-all min-h-[120px] resize-y disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed hover:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--text-primary)]/10 placeholder:font-normal"
          :class="{ '!border-[var(--color-brand-danger)]': errors?.[field.key] }"
        />
      </div>
      
      <!-- Tags Input -->
      <div v-else-if="field.type === 'tags'" class="relative w-full">
        <TagsInput
          :modelValue="modelValue[field.key] || []"
          @update:modelValue="val => updateField(field.key, val)"
          :historyKey="field.historyKey || field.key"
          :icon="field.icon"
          :placeholder="`${field.label} ${t('common.typeHere', 'yazın...')}`"
        />
      </div>

      <!-- Select -->
      <UiSelect 
        v-else-if="field.type === 'select'"
        :modelValue="modelValue[field.key]"
        @update:modelValue="val => updateField(field.key, val)"
        :options="field.options || []"
        :disabled="isLoading"
        :icon="field.icon"
        class="hover:border-[var(--text-primary)] transition-colors"
        :class="{ '!border-[var(--color-brand-danger)]': errors?.[field.key] }"
      />
      
      <!-- DateTime Input (dd.mm.yyyy HH:mm) -->
      <div v-else-if="field.type === 'datetime'" class="relative">
        <UiInput 
          type="text"
          :modelValue="formatDateTimeForDisplay(modelValue[field.key] || '')"
          @update:modelValue="val => updateField(field.key, parseDateTimeFromDisplay(val))"
          :disabled="isLoading"
          :icon="field.icon"
          placeholder="dd.mm.yyyy HH:mm"
        />
      </div>
      
      <!-- Input -->
      <div v-else class="relative">
        <UiInput 
          :type="field.type"
          :modelValue="modelValue[field.key]"
          @update:modelValue="val => updateField(field.key, val)"
          :disabled="isLoading"
          :icon="field.icon"
          :showPassword="passwordVisibility[field.originalKey || field.key] || false"
          @update:showPassword="val => passwordVisibility[field.originalKey || field.key] = val"
          :class="errors?.[field.key] || isPasswordMismatch(field) ? '!border-[var(--color-brand-danger)] !ring-[var(--color-brand-danger)]/20' : ''"
        />
      </div>

      <!-- General Error Rendering -->
      <span v-if="errors?.[field.key]" class="text-[11px] text-[var(--color-brand-danger)] font-medium inline-block pl-2 mt-0.5">{{ errors[field.key] }}</span>
      <span v-else-if="isPasswordMismatch(field)" class="text-[11px] text-[var(--color-brand-danger)] font-medium inline-block pl-2 mt-0.5">{{ t('common.passwordsMismatch', 'Şifrələr uyğun deyil!') }}</span>
    </div>
  </div>
</template>
