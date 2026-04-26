<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '#i18n'
import { useToast, useNuxtApp } from '#imports'
import Modal from '~/components/ui/Modal.vue'
import UiInput from '~/components/ui/Input.vue'
import UiButton from '~/components/ui/Button.vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiSwitch from '~/components/ui/Switch.vue'
import UiDropdown from '~/components/ui/Dropdown.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'
import ImageCarousel from '~/components/ui/ImageCarousel.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editData: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { t } = useI18n()
const toast = useToast()
const { $api } = useNuxtApp()

const isSaving = ref(false)
const isEditMode = computed(() => !!props.editData?.id)

const formData = ref<Record<string, any>>({})
const productImages = ref<string[]>([])
const addVariantsEnabled = ref(false)
const newVariantsList = ref<any[]>([])

const suppliersOptions = ref<any[]>([])
const availableAttributes = ref<any[]>([])

const loadSuppliers = async () => {
  try {
    const data = await $api<any[]>('/api/suppliers')
    const brands = data.map(s => s.brandName).filter((b, i, arr) => b && arr.indexOf(b) === i)
    suppliersOptions.value = brands.map(b => ({ label: b, value: b }))
  } catch (err) {}
}

const loadAttributes = async () => {
  try {
    const data = await $api<any[]>('/api/attributes')
    availableAttributes.value = data
  } catch (err) {}
}

onMounted(() => {
  loadSuppliers()
  loadAttributes()
})

const generateBarcode = (prefix: string = 'P'): string => {
  const nextNum = Math.floor(1000000 + Math.random() * 9000000)
  return `${prefix}${nextNum}`
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    if (props.editData && Object.keys(props.editData).length > 0) {
      const product = props.editData
      formData.value = { ...product }
      productImages.value = [...(product.images || [])]
      
      if (product.variants && product.variants.length > 0) {
        addVariantsEnabled.value = true
        newVariantsList.value = product.variants.map((v: any) => {
          return {
            id: v.id,
            attribute: Array.isArray(v.attribute) ? v.attribute.map((a: string) => {
              const parts = a.split(':')
              const name = parts[0]?.trim() || ''
              const value = parts[1]?.trim() || ''
              const attrDef = availableAttributes.value.find((ax: any) => ax.name === name)
              return { id: attrDef?.id || Math.random().toString(), name, value }
            }) : [],
            barcode: v.barcode,
            wholesalePrice: v.wholesalePrice,
            retailPrice: v.retailPrice,
            stock: v.stock,
            reorderLevel: v.reorderLevel
          }
        })
      } else {
        addVariantsEnabled.value = false
        newVariantsList.value = []
      }
    } else {
      formData.value = {
        barcode: generateBarcode('P')
      }
      productImages.value = []
      addVariantsEnabled.value = false
      newVariantsList.value = []
    }
  }
})

const baseFormFields = computed<FormField[]>(() => [
  { key: 'productName', label: t('products.name', 'Məhsulun adı'), type: 'text', required: true },
  { key: 'brandName', label: t('products.brand', 'Brendin adı'), type: 'autocomplete', options: suppliersOptions.value },
  { key: 'category', label: t('products.category', 'Kateqoriyası'), type: 'tags' },
  { key: 'barcode', label: t('products.barcode', 'Barkod'), type: 'barcode', barcodePrefix: 'P', required: true },
  { key: 'wholesalePrice', label: t('products.wholesalePrice', 'Topdan qiymət (₼)'), type: 'number' },
  { key: 'retailPrice', label: t('products.retailPrice', 'Pərakəndə qiymət (₼)'), type: 'number', required: true },
  { key: 'stock', label: t('products.stock', 'Stok'), type: 'integer' },
  { key: 'reorderLevel', label: t('products.reorderLevel', 'Yenidən sifariş limiti'), type: 'integer' },
  { key: 'description', label: t('products.description', 'Təsviri'), type: 'textarea', colSpan: 2 }
])

const addVariantRow = () => {
  newVariantsList.value.push({
    id: Date.now().toString(),
    attribute: [],
    barcode: generateBarcode('P'), 
    wholesalePrice: formData.value.wholesalePrice || null,
    retailPrice: formData.value.retailPrice || null,
    stock: formData.value.stock || null,
    reorderLevel: formData.value.reorderLevel || null
  })
}

const duplicateVariantRow = (variant: any) => {
  newVariantsList.value.push({
    ...JSON.parse(JSON.stringify(variant)),
    id: Date.now().toString(),
    barcode: generateBarcode('P')
  })
}

const showDeleteVariantConfirmModal = ref(false)
const variantIndexToDelete = ref<number | null>(null)

const removeVariantRow = (index: number) => {
  variantIndexToDelete.value = index
  showDeleteVariantConfirmModal.value = true
}

const confirmDeleteVariant = () => {
  if (variantIndexToDelete.value !== null) {
    newVariantsList.value.splice(variantIndexToDelete.value, 1)
  }
  showDeleteVariantConfirmModal.value = false
  variantIndexToDelete.value = null
}

const handleSaveProduct = async () => {
  const errors: string[] = []
  if (!formData.value.productName?.trim()) errors.push(t('products.validation.nameRequired', 'Məhsul adı mütləqdir'))
  if (!formData.value.barcode?.trim()) errors.push(t('products.validation.barcodeRequired', 'Barkod mütləqdir'))
  if (formData.value.retailPrice === undefined || formData.value.retailPrice === null || formData.value.retailPrice === '') errors.push(t('products.validation.retailPriceRequired', 'Satış qiyməti mütləqdir'))

  if (errors.length > 0) {
    errors.forEach(e => toast.error(e))
    return
  }

  isSaving.value = true
  try {
    let finalPayload = { ...formData.value, images: productImages.value }
    if (!isEditMode.value) {
      const newParent = await $api<any>('/api/products', { method: 'POST', body: finalPayload })
      
      const savedVariants = []
      if (addVariantsEnabled.value && newVariantsList.value.length > 0) {
        for (const v of newVariantsList.value) {
          const vPayload = {
            parentProductId: newParent.id,
            productName: formData.value.productName,
            brandName: formData.value.brandName,
            category: formData.value.category,
            barcode: v.barcode,
            wholesalePrice: v.wholesalePrice,
            retailPrice: v.retailPrice,
            stock: v.stock || 0,
            reorderLevel: v.reorderLevel || 0,
            attribute: v.attribute.map((a: any) => `${a.name}: ${a.value}`)
          }
          const savedVariant = await $api<any>('/api/products', { method: 'POST', body: vPayload })
          savedVariants.push(savedVariant)
        }
      }
      toast.success(t('products.added', 'Məhsul əlavə edildi'))
      emit('saved', { ...newParent, variants: savedVariants })
    } else {
      const updatedParent = await $api<any>(`/api/products/${formData.value.id}`, { method: 'PUT', body: finalPayload })
      
      const originalVariants = formData.value.variants || []
      const currentVariantIds = newVariantsList.value.map((v: any) => v.id)
      const variantsToDelete = originalVariants.filter((ov: any) => !currentVariantIds.includes(ov.id))
      
      for (const dv of variantsToDelete) {
        try { await $api(`/api/products/${dv.id}`, { method: 'DELETE' }) } catch (err) {}
      }

      const updatedVariants = []
      if (addVariantsEnabled.value && newVariantsList.value.length > 0) {
        for (const v of newVariantsList.value) {
          const vPayload = {
            parentProductId: updatedParent.id,
            productName: formData.value.productName,
            brandName: formData.value.brandName,
            category: formData.value.category,
            barcode: v.barcode,
            wholesalePrice: v.wholesalePrice,
            retailPrice: v.retailPrice,
            stock: v.stock || 0,
            reorderLevel: v.reorderLevel || 0,
            attribute: v.attribute.map((a: any) => `${a.name}: ${a.value}`)
          }
          const isNew = v.id.toString().length > 10 || !originalVariants.find((ov: any) => ov.id === v.id)
          
          if (isNew) { 
            const savedVariant = await $api<any>('/api/products', { method: 'POST', body: vPayload })
            updatedVariants.push(savedVariant)
          } else {
            const upVar = await $api<any>(`/api/products/${v.id}`, { method: 'PUT', body: vPayload })
            updatedVariants.push(upVar)
          }
        }
      } else if (!addVariantsEnabled.value && originalVariants.length > 0) {
        for (const dv of originalVariants) {
          try { await $api(`/api/products/${dv.id}`, { method: 'DELETE' }) } catch (err) {}
        }
      }
      toast.success(t('products.updated', 'Yeniləndi'))
      emit('saved', { ...updatedParent, variants: updatedVariants })
    }
    
    emit('update:modelValue', false)
  } catch (err: any) {
    toast.error(t('toast.operationFailed', 'Xəta oldu'))
  } finally {
    isSaving.value = false
  }
}

const handleCloseModal = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <Modal 
    :model-value="modelValue" 
    @update:model-value="(val) => emit('update:modelValue', val)"
    :title="isEditMode ? t('products.edit', 'Məhsulu Redaktə Et') : t('products.addNew', 'Yeni Məhsul')" 
    max-width="6xl" 
    is-top 
    max-height="85vh"
  >
    <div class="flex flex-col lg:flex-row gap-8 items-start h-full">
      <div class="w-full lg:w-[33%] shrink-0 space-y-4 lg:sticky lg:top-0">
        <ImageCarousel 
          :images="productImages"
          :product-name="formData.productName"
          @update:images="(val: string[]) => productImages = val"
        />
      </div>

      <div class="flex-1 w-full space-y-6">
        <DynamicForm 
          :fields="baseFormFields"
          v-model="formData" 
          :gridCols="2"
        />

        <div class="flex items-center justify-between pt-2">
          <div class="flex items-center gap-4 cursor-pointer group" @click="addVariantsEnabled = !addVariantsEnabled">
            <h4 class="text-sm font-bold text-[var(--text-app)] group-hover:text-[var(--text-primary)] transition-colors">{{ t('products.variants', 'Variantlar') }}</h4>
            <UiSwitch v-model="addVariantsEnabled" @click.stop />
          </div>
          <UiButton 
            v-if="addVariantsEnabled" 
            variant="soft-primary" 
            size="sm" 
            icon="lucide:plus" 
            @click="addVariantRow"
          >
            {{ t('products.addVariant', 'Yeni Variant') }}
          </UiButton>
        </div>

        <div v-if="addVariantsEnabled" class="space-y-4">
          <div v-for="(v, index) in newVariantsList" :key="index" class="p-5 bg-[var(--text-primary)]/[0.01] border border-[var(--border-app)] rounded-[14px] relative group hover:border-[var(--text-primary)]/20 transition-colors">
            <div class="absolute top-4 right-4 flex items-center gap-1">
              <button 
                @click="duplicateVariantRow(v)"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-app)] opacity-40 hover:bg-[var(--text-primary)]/10 hover:opacity-100 transition-all"
                :title="t('common.duplicate', 'Kopyala')"
              >
                <UiIcon name="lucide:copy" class="w-4 h-4" />
              </button>
              <button 
                @click="removeVariantRow(index)"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-brand-danger)] opacity-40 hover:bg-[var(--color-brand-danger)]/10 hover:opacity-100 transition-all"
                :title="t('common.delete', 'Sil')"
              >
                <UiIcon name="lucide:trash-2" class="w-4 h-4" />
              </button>
            </div>

            <div class="pr-10 flex flex-col gap-4">
              <div class="flex flex-wrap gap-2 items-center">
                <div 
                  v-for="(sel, i) in v.attribute" 
                  :key="i" 
                  class="flex items-center gap-1.5 px-3 py-2 border border-[var(--text-primary)]/[0.05] bg-[var(--text-primary)]/[0.02] rounded-lg font-medium hover:border-[var(--text-primary)]/[0.15] hover:bg-[var(--text-primary)]/[0.04] transition-colors"
                >
                  <span class="font-bold opacity-40 tracking-wider text-xs">{{ sel.name }}:</span> 
                  
                  <UiDropdown menuClass="absolute top-full left-0 mt-2 min-w-[120px] z-[70] bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl shadow-xl overflow-hidden py-1">
                    <template #trigger>
                      <div class="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity outline-none text-sm">
                        <span class="font-bold text-[var(--text-primary)]">{{ sel.value }}</span>
                        <UiIcon name="lucide:chevron-down" class="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40 ml-0.5" />
                      </div>
                    </template>
                    <template #menu="{ close }">
                      <div class="max-h-48 overflow-y-auto custom-scrollbar">
                        <button 
                          v-for="val in availableAttributes.find((xa: any) => xa.name === sel.name)?.values || []" 
                          :key="val"
                          @click="sel.value = val; close()" 
                          class="w-full px-4 py-2 text-sm font-bold text-left hover:bg-[var(--text-primary)]/10 transition-colors"
                          :class="sel.value === val ? 'text-[var(--text-primary)] bg-[var(--text-primary)]/5' : 'text-[var(--text-app)]'"
                        >
                          {{ val }}
                        </button>
                      </div>
                    </template>
                  </UiDropdown>
                  
                  <button 
                    @click="v.attribute.splice(i, 1)" 
                    class="ml-1 text-[var(--text-app)] opacity-30 hover:opacity-100 hover:text-[var(--color-brand-danger)] transition-colors"
                    :title="t('common.delete', 'Sil')"
                  >
                    <UiIcon name="lucide:x" class="w-3.5 h-3.5" stroke-width="2.5" />
                  </button>
                </div>

                <UiDropdown 
                  v-if="availableAttributes.filter((a: any) => !v.attribute.find((x: any) => x.name === a.name)).length > 0"
                  menuClass="absolute top-full left-0 mt-2 min-w-[140px] z-[70] bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl shadow-xl overflow-hidden py-1"
                >
                  <template #trigger>
                    <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--text-primary)]/20 hover:border-[var(--text-primary)]/50 text-[var(--text-app)] opacity-60 hover:opacity-100 transition-all cursor-pointer group">
                      <UiIcon name="lucide:plus" class="w-3.5 h-3.5" />
                      <span class="font-bold text-xs tracking-wider">{{ t('products.attribute', 'Atribut') }}</span>
                    </div>
                  </template>
                  <template #menu="{ close }">
                    <div class="max-h-48 overflow-y-auto custom-scrollbar">
                      <button 
                        v-for="a in availableAttributes.filter((attr: any) => !v.attribute.find((x: any) => x.name === attr.name))" 
                        :key="a.id"
                        @click="v.attribute.push({ id: a.id, name: a.name, value: a.values[0] }); close()"
                        class="w-full px-4 py-2 text-sm font-bold text-left hover:bg-[var(--text-primary)]/10 text-[var(--text-app)] transition-colors"
                      >
                        {{ a.name }}
                      </button>
                    </div>
                  </template>
                </UiDropdown>
              </div>

              <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">{{ t('products.barcode', 'Barkod') }}</label>
                  <UiInput 
                    v-model="v.barcode" 
                    class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none font-mono text-sm"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">{{ t('products.wholesalePriceShort', 'Topdan (₼)') }}</label>
                  <UiInput 
                    v-model="v.wholesalePrice" 
                    type="number" 
                    class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none font-semibold"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">{{ t('products.retailPriceShort', 'Pərakəndə (₼)') }}</label>
                  <UiInput 
                    v-model="v.retailPrice" 
                    type="number" 
                    class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none text-[var(--color-brand-success)] font-semibold"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">{{ t('products.stock', 'Stok') }}</label>
                  <UiInput 
                    v-model="v.stock" 
                    type="number" 
                    class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="handleCloseModal">{{ t('common.cancel') }}</UiButton>
      <UiButton variant="primary" icon="lucide:check" @click="handleSaveProduct" :disabled="isSaving">
        {{ isSaving ? t('common.pleaseWait', 'Gözləyin...') : t('common.save', 'Yadda Saxla') }}
      </UiButton>
    </template>
  </Modal>

  <!-- Variant Delete Confirmation Modal -->
  <Modal v-model="showDeleteVariantConfirmModal" :max-width="'sm'" :show-header="false" is-top>
    <div class="px-2 py-4 flex flex-col items-center justify-center text-center">
      <div class="w-16 h-16 rounded-2xl bg-[var(--color-brand-danger)]/10 flex items-center justify-center mb-6 text-[var(--color-brand-danger)]">
        <UiIcon name="lucide:trash-2" class="w-8 h-8" stroke-width="2" />
      </div>
      <h3 class="text-xl font-bold text-[var(--text-app)] mb-2 tracking-wide">{{ t('products.deleteVariant', 'Variantı Sil') }}</h3>
      <p class="text-base font-medium text-[var(--text-app)] opacity-60 leading-relaxed mb-8 max-w-[280px]">
        {{ t('products.deleteVariantConfirm', 'Bu variantı silmək istədiyinizə əminsiniz?') }}
      </p>
      <div class="flex items-center gap-3 w-full">
        <UiButton variant="ghost" class="flex-1 !h-12" @click="showDeleteVariantConfirmModal = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="danger" class="flex-1 !h-12" @click="confirmDeleteVariant">{{ t('common.yesDelete', 'Bəli, Sil') }}</UiButton>
      </div>
    </div>
  </Modal>
</template>
