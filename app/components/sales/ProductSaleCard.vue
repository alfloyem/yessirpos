<script setup lang="ts">
import { ref } from 'vue'
import UiIcon from '~/components/ui/Icon.vue'

interface ProductVariant {
  id: string
  productName: string
  barcode: string
  retailPrice: number | string
  stock: number
  images?: string[]
  [key: string]: any
}

interface ProductGroup {
  id: string
  productName: string
  images?: string[]
  variants: ProductVariant[]
  [key: string]: any
}

const props = defineProps<{
  product: ProductGroup
}>()

const emit = defineEmits<{
  (e: 'add-to-cart', variant: ProductVariant): void
}>()

const isExpanded = ref(false)

const toggleExpand = () => {
  if (props.product.variants.length > 0) {
    isExpanded.value = !isExpanded.value
  } else {
    // If no variants, add the product itself if it's actionable
    emit('add-to-cart', props.product as any)
  }
}

const getVariantName = (variant: ProductVariant) => {
  if (variant.attribute && Array.isArray(variant.attribute) && variant.attribute.length > 0) {
    return variant.attribute.map(attr => {
      const parts = attr.split(':')
      return parts.length > 1 ? parts[1].trim() : attr
    }).join(', ')
  }
  return variant.productName
}

const formatPrice = (price: number | string) => {
  return Number(price || 0).toFixed(2)
}
</script>

<template>
  <div 
    class="bg-[var(--input-bg)] border border-[var(--border-app)] rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl group"
    :class="[
      isExpanded ? 'border-[var(--text-primary)] shadow-2xl ring-2 ring-[var(--text-primary)]/10' : 'hover:border-[var(--text-primary)]/40 hover:-translate-y-1'
    ]"
  >
    <!-- Main Product Section - Compact & Elegant -->
    <div 
      @click="toggleExpand"
      class="p-2.5 cursor-pointer flex items-center gap-3 relative"
    >
      <!-- Image - Balanced & Premium -->
      <div class="w-14 h-14 bg-[var(--text-primary)]/5 rounded-[18px] flex items-center justify-center p-1.5 relative overflow-hidden group-hover:bg-[var(--text-primary)]/10 transition-colors shrink-0 border border-[var(--border-app)]/50">
        <img 
          v-if="product.images && product.images.length > 0" 
          :src="product.images[0]" 
          class="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-500" 
          alt="Product" 
        />
        <UiIcon v-else name="lucide:package" class="w-6 h-6 text-[var(--text-app)] opacity-20 group-hover:scale-110 transition-transform duration-500" />
      </div>

      <!-- Info Area -->
      <div class="flex-1 min-w-0 pr-8">
        <h3 class="font-black text-[var(--text-app)] text-[13px] mb-0.5 leading-tight truncate uppercase tracking-tight group-hover:text-[var(--text-primary)] transition-colors">
          {{ product.productName }}
        </h3>
        
        <div class="flex items-center gap-2">
          <span v-if="product.retailPrice" class="text-sm font-black text-[var(--text-primary)] tabular-nums">
            {{ formatPrice(product.retailPrice) }} ₼
          </span>
          <span v-if="product.variants.length > 0" class="text-[9px] font-black uppercase tracking-widest bg-[var(--text-primary)]/10 text-[var(--text-primary)] px-2 py-0.5 rounded-lg">
            {{ product.variants.length }} Variant
          </span>
        </div>
      </div>

      <!-- Arrow Indicator - Minimal -->
      <div 
        v-if="product.variants.length > 0"
        class="absolute top-1/2 -translate-y-1/2 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
        :class="isExpanded ? 'bg-[var(--text-primary)] text-white rotate-180 shadow-lg shadow-[var(--text-primary)]/20' : 'bg-[var(--bg-app)] text-[var(--text-app)] opacity-20 hover:opacity-100'"
      >
        <UiIcon name="lucide:chevron-down" class="w-3.5 h-3.5" />
      </div>
    </div>

    <!-- Variants Section - Minimal & Fast -->
    <div 
      v-if="isExpanded && product.variants.length > 0"
      class="border-t border-[var(--border-app)] bg-[var(--bg-app)]/40 backdrop-blur-md max-h-[280px] overflow-y-auto custom-scrollbar"
    >
      <div class="p-1.5 space-y-0.5">
        <div 
          v-for="variant in product.variants" 
          :key="variant.id"
          @click="emit('add-to-cart', variant)"
          class="p-2 flex items-center gap-3 rounded-xl hover:bg-[var(--text-primary)]/5 cursor-pointer border border-transparent hover:border-[var(--text-primary)]/15 transition-all group/v"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-0.5">
              <span class="text-[12px] font-black text-[var(--text-app)] truncate pr-2 uppercase group-hover/v:text-[var(--text-primary)] transition-colors">
                {{ getVariantName(variant) }}
              </span>
              <span class="text-[14px] font-black text-[var(--text-primary)] tabular-nums">
                {{ formatPrice(variant.retailPrice) }} ₼
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-mono font-bold text-[var(--text-app)] opacity-20 flex items-center gap-1">
                <UiIcon name="lucide:hash" class="w-3 h-3" />
                {{ variant.barcode }}
              </span>
              <div 
                class="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-[var(--bg-app)]/10 text-[var(--text-app)] border border-[var(--border-app)]/5"
              >
                <span class="opacity-30 uppercase tracking-tighter">Stok:</span> 
                <span :class="Number(variant.stock || 0) > 0 ? 'text-[var(--text-primary)]' : 'text-red-500'">{{ variant.stock || 0 }}</span>
              </div>
            </div>
          </div>
          
          <!-- Quick Add Button -->
          <div class="w-9 h-9 rounded-lg bg-[var(--bg-app)] border border-[var(--border-app)] flex items-center justify-center text-[var(--text-app)] opacity-50 group-hover/v:bg-[var(--text-primary)] group-hover/v:text-white group-hover/v:border-transparent group-hover/v:opacity-100 transition-all shadow-sm active:scale-90">
            <UiIcon name="lucide:plus" class="w-5 h-5 stroke-[3]" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}
</style>
