<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '#i18n'
import UiButton from '~/components/ui/Button.vue'
import UiIcon from '~/components/ui/Icon.vue'
import UiDropdown from '~/components/ui/Dropdown.vue'

const { t } = useI18n()

const props = defineProps<{
  product: any
  selected?: boolean
  selectionMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-select'): void
  (e: 'edit', product: any): void
  (e: 'add-variant', product: any): void
  (e: 'duplicate', product: any): void
  (e: 'print-barcode', product: any): void
  (e: 'delete', product: any): void
  (e: 'quick-view', product: any): void
}>()

const formatPrice = (val: any) => Number(val || 0).toFixed(2)

const hasVariants = computed(() => {
  return props.product.variants && props.product.variants.length > 0
})

const getMinPrice = (variants: any[]) => Math.min(...variants.map(v => Number(v.retailPrice || 0)))
const getMaxPrice = (variants: any[]) => Math.max(...variants.map(v => Number(v.retailPrice || 0)))

const getStockColor = (stock: number, reorderLevel: number) => {
  const s = Number(stock || 0)
  const r = Number(reorderLevel || 0)
  if (s <= 0) return 'text-[var(--color-brand-danger)]'
  if (s <= r) return 'text-[var(--color-brand-warning)]'
  return 'text-[var(--text-app)]'
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
  <div 
    class="group relative flex flex-col h-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl overflow-hidden transition-colors duration-300 hover:border-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.02]"
  >
    <!-- ── Image ── -->
    <div class="relative w-full aspect-[4/3] bg-[var(--input-bg)] overflow-hidden cursor-pointer" @click="emit('quick-view', product)">
      <img 
        v-if="product.images?.length" 
        :src="product.images[0]" 
        class="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-90" 
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-[var(--text-primary)]/[0.02]">
        <UiIcon name="lucide:image" class="w-12 h-12 text-[var(--text-app)] opacity-10" stroke-width="1" />
      </div>

      <!-- Checkbox (top-left) -->
      <div class="absolute top-3 left-3 z-10">
        <div 
          class="w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors duration-200"
          :class="[
            selected 
              ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-app)]' 
              : 'bg-[var(--bg-app)]/80 backdrop-blur-sm border-[var(--border-app)] text-transparent hover:border-[var(--text-primary)]'
          ]"
          @click.stop="emit('toggle-select')"
        >
          <UiIcon name="lucide:check" class="w-3 h-3" />
        </div>
      </div>

      <!-- Actions (top-right) -->
      <div class="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <UiDropdown menuClass="absolute top-full right-0 mt-2 w-48 z-[60]">
          <template #trigger>
            <button class="w-8 h-8 rounded-md bg-[var(--bg-app)]/90 backdrop-blur-sm border border-[var(--border-app)] flex items-center justify-center text-[var(--text-app)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-app)] hover:border-[var(--text-primary)] transition-colors">
              <UiIcon name="lucide:more-vertical" class="w-4 h-4" />
            </button>
          </template>
          <template #menu="{ close }">
            <div class="py-1">
              <button @click="emit('edit', product); close()" class="w-full px-4 py-2 text-sm font-semibold text-left flex items-center gap-3 hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors">
                <UiIcon name="lucide:pen-line" class="w-4 h-4 opacity-50" /> {{ t('products.edit') }}
              </button>
              <button @click="emit('duplicate', product); close()" class="w-full px-4 py-2 text-sm font-semibold text-left flex items-center gap-3 hover:bg-[var(--text-primary)]/5 text-[var(--text-app)] transition-colors">
                <UiIcon name="lucide:copy" class="w-4 h-4 opacity-50" /> {{ t('common.duplicate') }}
              </button>
              <div class="h-px bg-[var(--border-app)] my-1.5 opacity-50"></div>
              <button @click="emit('delete', product); close()" class="w-full px-4 py-2 text-sm font-semibold text-left flex items-center gap-3 text-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/5 transition-colors">
                <UiIcon name="lucide:trash-2" class="w-4 h-4 opacity-50" /> {{ t('common.delete') }}
              </button>
            </div>
          </template>
        </UiDropdown>
      </div>
    </div>

    <!-- ── Body ── -->
    <div class="flex flex-col flex-1 p-4">
      <!-- Top Meta -->
      <div class="flex items-center gap-1.5 mb-1 opacity-50">
        <span v-if="product.category?.length" class="text-xs font-semibold tracking-[0.05em] text-[var(--text-app)] truncate">
          {{ Array.isArray(product.category) ? product.category[0] : product.category }}
        </span>
        <span v-if="product.brandName && product.category?.length" class="text-[var(--text-app)] text-xs opacity-40">/</span>
        <span v-if="product.brandName" class="text-xs font-semibold tracking-[0.05em] text-[var(--text-app)] truncate">
          {{ Array.isArray(product.brandName) ? product.brandName[0] : product.brandName }}
        </span>
      </div>

      <!-- Title & Price -->
      <div class="flex items-start justify-between gap-4 mb-3">
        <!-- Title -->
        <h3 
          class="text-base font-semibold text-[var(--text-app)] leading-snug line-clamp-2 min-h-[2.8em] flex-1 cursor-pointer group-hover:text-[var(--text-primary)] transition-colors" 
          :title="product.productName"
          @click="emit('quick-view', product)"
        >
          {{ product.productName }}
        </h3>

        <!-- Price -->
        <div class="shrink-0 pt-0.5 text-right whitespace-nowrap">
          <div v-if="!hasVariants" class="text-lg font-bold text-[var(--text-app)] tabular-nums">
            {{ formatPrice(product.retailPrice) }}<span class="text-xs font-semibold opacity-40 ml-0.5">₼</span>
          </div>
          <div v-else class="text-lg font-bold text-[var(--text-primary)] tabular-nums flex flex-col items-end">
            <div class="flex items-baseline">
              {{ formatPrice(getMinPrice(product.variants)) }}
              <span v-if="getMinPrice(product.variants) !== getMaxPrice(product.variants)" class="text-xs opacity-30 mx-0.5">–</span>
              <template v-if="getMinPrice(product.variants) !== getMaxPrice(product.variants)">
                {{ formatPrice(getMaxPrice(product.variants)) }}
              </template>
              <span class="text-xs font-semibold opacity-40 ml-0.5">₼</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Tags (Stock, Variants, Barcode) -->
      <div class="mt-auto pt-3 border-t border-[var(--border-app)] flex items-center justify-between">
        <div 
          v-if="product.barcode" 
          class="text-xs font-mono font-semibold tracking-wider text-[var(--text-app)] opacity-40 hover:opacity-100 hover:text-[var(--text-primary)] transition-all cursor-pointer whitespace-nowrap"
          @click="emit('print-barcode', product)"
          title="Barkod çap et"
        >
          {{ product.barcode }}
        </div>
        <div v-else class="text-xs font-semibold opacity-0">...</div>

        <div class="whitespace-nowrap">
          <span 
            v-if="!hasVariants"
            class="text-xs font-semibold tracking-wide px-2 py-1 rounded-sm border" 
            :class="{
              'border-[var(--color-brand-danger)]/30 text-[var(--color-brand-danger)]': Number(product.stock || 0) <= 0,
              'border-[var(--color-brand-warning)]/30 text-[var(--color-brand-warning)]': Number(product.stock || 0) > 0 && Number(product.stock || 0) <= Number(product.reorderLevel || 0),
              'border-[var(--border-app)] text-[var(--text-app)] opacity-60': Number(product.stock || 0) > Number(product.reorderLevel || 0)
            }"
          >
            {{ product.stock || 0 }} {{ t('products.stock') }}
          </span>
          <span 
            v-else 
            class="text-xs font-semibold tracking-wide px-2 py-1 rounded-sm border border-[var(--text-primary)]/20 text-[var(--text-primary)] bg-[var(--text-primary)]/[0.04]"
          >
            {{ product.variants.length }} Variant
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
