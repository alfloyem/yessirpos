<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '#i18n'
import { useHead, useToast, useAuth } from '#imports'
import Modal from '~/components/ui/Modal.vue'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiSelect from '~/components/ui/Select.vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiSwitch from '~/components/ui/Switch.vue'
import DynamicForm, { type FormField } from '~/components/ui/DynamicForm.vue'
import ImageCarousel from '~/components/ui/ImageCarousel.vue'
import ProductCard from '~/components/products/ProductCard.vue'
import { printBarcode } from '~/utils/receiptPrinter'

const { t } = useI18n()
const { token } = useAuth()
const toast = useToast()

useHead({
  title: t('menu.products')
})

// --- Helper for Barcode Generation ---
const generateBarcode = (prefix = '') => {
  // Combine all current possible barcodes in UI
  const currentInUI = [
    formData.value?.barcode,
    ...(newVariantsList.value || []).map(v => v.barcode)
  ].filter(Boolean)

  const cBarcodes = [
    ...mockData.value.map(m => m.barcode),
    ...currentInUI
  ]
    .filter(b => typeof b === 'string' && new RegExp(`^${prefix || 'P'}\\d{7}$`).test(b))
    .map(b => parseInt(b.substring(1), 10))
  
  let nextNum = 1
  if (cBarcodes.length > 0) {
    nextNum = Math.max(...cBarcodes) + 1
  }
  
  const existingSet = new Set([
     ...mockData.value.map(m => m.barcode),
     ...currentInUI
  ])

  let barcode = `${prefix || 'P'}${String(nextNum).padStart(7, '0')}`
  while (existingSet.has(barcode)) {
    nextNum++
    barcode = `${prefix || 'P'}${String(nextNum).padStart(7, '0')}`
  }
  
  return barcode
}

// --- Data ---
const mockData = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const suppliersOptions = ref<{ label: string, value: string }[]>([])
const availableAttributes = ref<any[]>([])

// --- Computed ---
const groupedProducts = computed(() => {
  const variantMap: Record<number | string, any[]> = {}
  
  mockData.value.forEach(item => {
    const pid = item.parentProductId
    if (pid) {
      if (!variantMap[pid]) variantMap[pid] = []
      variantMap[pid]?.push(item)
    }
  })
  
  let result = mockData.value
    .filter(item => !item.parentProductId)
    .map(item => {
      // If it has variants, get stock and price from variants if it does not have it itself
      const variants = variantMap[item.id] || []
      return { ...item, variants }
    })

  if (searchQuery.value) {
    const q = searchQuery.value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    result = result.filter(group => {
      const match = (item: any) => {
        const fields = [item.productName, item.barcode, Array.isArray(item.category) ? item.category.join(' ') : item.category]
        return fields.some(f => f && String(f).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, "").includes(q))
      }
      return match(group) || group.variants.some((v: any) => match(v))
    })
  }
    
  return result
})

const loadGoods = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/products', { headers: { Authorization: `Bearer ${token.value}` } })
    mockData.value = data as any[]
  } catch (err: any) {
    toast.error(t('toast.loadingError', 'Məlumatlar yüklənərkən xəta baş verdi'))
  } finally {
    loading.value = false
  }
}

const loadAttributes = async () => {
  try {
    const data = await $fetch('/api/attributes', { headers: { Authorization: `Bearer ${token.value}` } })
    availableAttributes.value = data as any[]
  } catch (err) {}
}

const loadSuppliers = async () => {
  try {
    const data = await $fetch('/api/suppliers', { headers: { Authorization: `Bearer ${token.value}` } })
    const brands = (data as any[]).map(s => s.brandName).filter((b, i, arr) => b && arr.indexOf(b) === i)
    suppliersOptions.value = brands.map(b => ({ label: b, value: b }))
  } catch (err) {}
}

onMounted(() => {
  loadGoods()
  loadAttributes()
  loadSuppliers()
})

// --- Modal State ---
const showProductModal = ref(false)
const showDeleteConfirmModal = ref(false)
const isSaving = ref(false)
const isEditMode = ref(false)
const confirmTarget = ref<any>(null)

// Forms
const formData = ref<Record<string, any>>({})
const productImages = ref<string[]>([])
const selectedCategories = ref<string[]>([]) // Assuming single string or array, UI handles

const addVariantsEnabled = ref(false)
const newVariantsList = ref<any[]>([])

// Base Form Fields (Simplified UI as requested)
const baseFormFields = computed<FormField[]>(() => [
  { key: 'productName', label: t('products.name', 'Məhsulun adı'), type: 'text', required: true },
  { key: 'brandName', label: t('products.brand', 'Brendin adı'), type: 'autocomplete', options: suppliersOptions.value },
  { key: 'category', label: t('products.category', 'Kateqoriyası'), type: 'tags' }, // Simplified
  { key: 'barcode', label: 'Barkod', type: 'barcode', barcodePrefix: 'P', required: true },
  { key: 'wholesalePrice', label: 'Topdan qiymət (₼)', type: 'number' },
  { key: 'retailPrice', label: 'Pərakəndə qiymət (₼)', type: 'number', required: true },
  { key: 'stock', label: 'Stok', type: 'integer' },
  { key: 'reorderLevel', label: 'Yenidən sifariş limiti', type: 'integer' }
])

const handleAdd = () => {
  formData.value = {
    barcode: generateBarcode('P')
  }
  productImages.value = []
  addVariantsEnabled.value = false
  newVariantsList.value = []
  isEditMode.value = false
  showProductModal.value = true
}

const addVariantRow = () => {
  newVariantsList.value.push({
    id: Date.now().toString(),
    attribute: [], // array of { id, name, value }
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
    barcode: generateBarcode('P') // New barcode for the duplicate
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
  isSaving.value = true
  try {
    const headers = { Authorization: `Bearer ${token.value}` }
    let finalPayload = { ...formData.value, images: productImages.value }

    if (!isEditMode.value) {
      const newParent = await $fetch<any>('/api/products', { method: 'POST', body: finalPayload, headers })
      mockData.value.push(newParent)

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
          const savedVariant = await $fetch<any>('/api/products', { method: 'POST', body: vPayload, headers })
          mockData.value.push(savedVariant)
        }
      }
      toast.success(t('products.added', 'Məhsul əlavə edildi'))
    } else {
      const updatedParent = await $fetch<any>(`/api/products/${formData.value.id}`, { method: 'PUT', body: finalPayload, headers })
      const idx = mockData.value.findIndex(p => p.id === formData.value.id)
      if (idx !== -1) mockData.value[idx] = updatedParent

      // Upsert variants
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
          // If it's local timestamp based ID, it's newly added during edit
          if (v.id.toString().length > 10 && v.id.toString().startsWith('17')) { 
            const savedVariant = await $fetch<any>('/api/products', { method: 'POST', body: vPayload, headers })
            mockData.value.push(savedVariant)
          } else {
            const upVar = await $fetch<any>(`/api/products/${v.id}`, { method: 'PUT', body: vPayload, headers })
            const upIdx = mockData.value.findIndex(p => p.id === v.id)
            if (upIdx !== -1) mockData.value[upIdx] = upVar
          }
        }
      }
      toast.success(t('products.updated', 'Yeniləndi'))
    }
    
    showProductModal.value = false
    await loadGoods() // Reload structure to group properly
  } catch (err: any) {
    toast.error(t('toast.operationFailed', 'Xəta oldu'))
  } finally {
    isSaving.value = false
  }
}

// Quick / Base Actions
const handleEdit = (product: any) => {
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
          const attrDef = availableAttributes.value.find(ax => ax.name === name)
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
  
  isEditMode.value = true
  showProductModal.value = true
}

const handleDeleteClick = (product: any) => {
  confirmTarget.value = product
  showDeleteConfirmModal.value = true
}

const performDelete = async () => {
  if (!confirmTarget.value) return
  isSaving.value = true
  try {
    await $fetch(`/api/products/${confirmTarget.value.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token.value}` } })
    mockData.value = mockData.value.filter(p => p.id !== confirmTarget.value.id && p.parentProductId !== confirmTarget.value.id)
    toast.success(t('products.deleted', 'Silindi'))
    showDeleteConfirmModal.value = false
  } catch {
    toast.error('Xəta baş verdi')
  } finally {
    isSaving.value = false
  }
}

const handleBarcodeClick = (product: any) => {
  if (product.barcode) {
    printBarcode({
      barcode: product.barcode,
      productName: product.parentProductName || product.productName,
      attribute: product.attribute,
      price: product.retailPrice
    })
  }
}

const formatVariantAttr = (attr: any) => {
  if (!attr) return ''
  if (Array.isArray(attr)) return attr.join(', ')
  try {
    const parsed = JSON.parse(attr)
    if (Array.isArray(parsed)) return parsed.join(', ')
    return String(parsed)
  } catch {
    return String(attr)
  }
}
</script>

<template>
  <div class="space-y-6 font-sans">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-[var(--text-app)]">{{ t('menu.products') }}</h1>
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative w-full md:w-64">
          <UiIcon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-app)] opacity-50" />
          <input 
            v-model="searchQuery" 
            :placeholder="t('common.search', 'Axtar...')" 
            class="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-app)] text-[var(--text-app)] text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
          />
        </div>
        <UiButton variant="primary" icon="lucide:plus" @click="handleAdd" class="shrink-0">
          {{ t('products.addNew') }}
        </UiButton>
      </div>
    </div>

    <!-- Product Grid -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-[var(--text-app)] opacity-50">
      <UiIcon name="lucide:loader-2" class="w-8 h-8 animate-spin" />
    </div>
    <div v-else-if="groupedProducts.length === 0" class="flex flex-col items-center justify-center py-20 bg-[var(--input-bg)] rounded-2xl border border-[var(--border-app)] opacity-50">
      <UiIcon name="lucide:package-open" class="w-16 h-16 mb-4 opacity-30" />
      <p class="text-lg font-medium">{{ t('common.noData') }}</p>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
      <ProductCard 
        v-for="product in groupedProducts" 
        :key="product.id" 
        :product="product"
        @edit="handleEdit"
        @delete="handleDeleteClick"
      />
    </div>

    <!-- Modals -->
    <!-- Add/Edit Single Product Modal -->
    <Modal 
      v-model="showProductModal" 
      :title="isEditMode ? t('products.edit', 'Məhsulu Redaktə Et') : t('products.addNew', 'Yeni Məhsul')" 
      max-width="6xl" 
      is-top 
      max-height="85vh"
    >
      <div class="flex flex-col lg:flex-row gap-8 items-start h-full">
        <!-- Left: Image Section -->
        <div class="w-full lg:w-[35%] shrink-0 space-y-4 lg:sticky lg:top-0">
          <div class="w-full">
            <ImageCarousel 
              :images="productImages"
              :product-name="formData.productName"
              @update:images="val => productImages = val"
            />
          </div>
        </div>

        <!-- Right: Fields -->
        <div class="flex-1 w-full lg:pl-10 space-y-6">
          <DynamicForm 
            :fields="baseFormFields"
            v-model="formData" 
            :gridCols="2"
          />

          <!-- Variants Header & Switch -->
          <div class="flex items-center justify-between pt-2">
            <div class="flex items-center gap-4 cursor-pointer group" @click="addVariantsEnabled = !addVariantsEnabled">
              <h4 class="text-sm font-bold text-[var(--text-app)] group-hover:text-[var(--text-primary)] transition-colors">Variantlar</h4>
              <UiSwitch v-model="addVariantsEnabled" @click.stop />
            </div>
            <UiButton 
              v-if="addVariantsEnabled" 
              variant="soft-primary" 
              size="sm" 
              icon="lucide:plus" 
              @click="addVariantRow"
            >
              Yeni Variant
            </UiButton>
          </div>

          <!-- Variants Flow (If Enabled) -->
          <div v-if="addVariantsEnabled" class="space-y-4">

            <div v-for="(v, index) in newVariantsList" :key="index" class="p-5 bg-[var(--text-primary)]/[0.01] border border-[var(--border-app)] rounded-[14px] relative group hover:border-[var(--text-primary)]/20 transition-colors">
              <div class="absolute top-4 right-4 flex items-center gap-1">
                <button 
                  @click="duplicateVariantRow(v)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-app)] opacity-40 hover:bg-[var(--text-primary)]/10 hover:opacity-100 transition-all"
                  title="Kopyala"
                >
                  <UiIcon name="lucide:copy" class="w-4 h-4" />
                </button>
                <button 
                  @click="removeVariantRow(index)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-brand-danger)] opacity-40 hover:bg-[var(--color-brand-danger)]/10 hover:opacity-100 transition-all"
                  title="Sil"
                >
                  <UiIcon name="lucide:trash-2" class="w-4 h-4" />
                </button>
              </div>

              <div class="pr-10 flex flex-col gap-4">
                <!-- Attributes Top Row -->
                <div class="flex flex-wrap gap-2 items-center">
                  <!-- Selected Attributes as Badges -->
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
                            v-for="val in availableAttributes.find(xa => xa.name === sel.name)?.values || []" 
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
                      title="Sil"
                    >
                      <UiIcon name="lucide:x" class="w-3.5 h-3.5" stroke-width="2.5" />
                    </button>
                  </div>

                  <!-- Dynamic + Add Attribute Trigger -->
                  <UiDropdown 
                    v-if="availableAttributes.filter((a: any) => !v.attribute.find((x: any) => x.name === a.name)).length > 0"
                    menuClass="absolute top-full left-0 mt-2 min-w-[140px] z-[70] bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl shadow-xl overflow-hidden py-1"
                  >
                    <template #trigger>
                      <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--text-primary)]/20 hover:border-[var(--text-primary)]/50 text-[var(--text-app)] opacity-60 hover:opacity-100 transition-all cursor-pointer group">
                        <UiIcon name="lucide:plus" class="w-3.5 h-3.5" />
                        <span class="font-bold text-xs tracking-wider">Atribut</span>
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

                <!-- Inputs Labeled Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">Barkod</label>
                    <UiInput 
                      v-model="v.barcode" 
                      class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none font-mono text-sm"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">Topdan (₼)</label>
                    <UiInput 
                      v-model="v.wholesalePrice" 
                      type="number" 
                      class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none font-semibold"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">Pərakəndə (₼)</label>
                    <UiInput 
                      v-model="v.retailPrice" 
                      type="number" 
                      class="!bg-[var(--input-bg)]/50 hover:!bg-[var(--input-bg)] focus:!bg-[var(--input-bg)] transition-colors !border-none !shadow-none text-[var(--color-brand-success)] font-semibold"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="block text-xs font-semibold opacity-40 tracking-wider whitespace-nowrap pl-1">Stok</label>
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
        <UiButton variant="ghost" @click="showProductModal = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="primary" icon="lucide:check" @click="handleSaveProduct" :disabled="isSaving">
          {{ isSaving ? 'Gözləyin...' : 'Yadda Saxla' }}
        </UiButton>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteConfirmModal" :max-width="'sm'" :show-header="false">
      <div class="px-2 py-4 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-2xl bg-[var(--color-brand-danger)]/10 flex items-center justify-center mb-6 text-[var(--color-brand-danger)]">
          <UiIcon name="lucide:trash-2" class="w-8 h-8" stroke-width="2" />
        </div>
        <h3 class="text-xl font-bold text-[var(--text-app)] mb-2 tracking-wide">{{ t('common.delete') }}</h3>
        <p class="text-base font-medium text-[var(--text-app)] opacity-60 leading-relaxed mb-8 max-w-[280px]">
          Məhsulu və bağlı olan bütün variantları silmək istədiyinizə əminsiniz?
        </p>
        <div class="flex items-center gap-3 w-full">
          <UiButton variant="ghost" class="flex-1 !h-12" @click="showDeleteConfirmModal = false">{{ t('common.cancel') }}</UiButton>
          <UiButton variant="danger" class="flex-1 !h-12" @click="performDelete" :disabled="isSaving">Sil</UiButton>
        </div>
      </div>
    </Modal>

    <!-- Variant Delete Confirmation Modal -->
    <Modal v-model="showDeleteVariantConfirmModal" :max-width="'sm'" :show-header="false">
      <div class="px-2 py-4 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-2xl bg-[var(--color-brand-danger)]/10 flex items-center justify-center mb-6 text-[var(--color-brand-danger)]">
          <UiIcon name="lucide:trash-2" class="w-8 h-8" stroke-width="2" />
        </div>
        <h3 class="text-xl font-bold text-[var(--text-app)] mb-2 tracking-wide">Variantı Sil</h3>
        <p class="text-base font-medium text-[var(--text-app)] opacity-60 leading-relaxed mb-8 max-w-[280px]">
          Bu variantı silmək istədiyinizə əminsiniz?
        </p>
        <div class="flex items-center gap-3 w-full">
          <UiButton variant="ghost" class="flex-1 !h-12" @click="showDeleteVariantConfirmModal = false">{{ t('common.cancel') }}</UiButton>
          <UiButton variant="danger" class="flex-1 !h-12" @click="confirmDeleteVariant">Bəli, Sil</UiButton>
        </div>
      </div>
    </Modal>
  </div>
</template>