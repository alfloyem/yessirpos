<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  images: string[]
  maxImages?: number
}>()

const emit = defineEmits(['update:images', 'remove'])

const currentIndex = ref(0)

const maxImagesCount = computed(() => props.maxImages || Infinity)

const canAddMore = computed(() => props.maxImages ? props.images.length < props.maxImages : true)

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) return
  
  const newImages: string[] = []
  let processedCount = 0
  
  // Calculate how many files we can process
  const remainingSlots = props.maxImages ? props.maxImages - props.images.length : Infinity
  const filesToProcess = props.maxImages ? Math.min(files.length, remainingSlots) : files.length
  
  if (props.maxImages && filesToProcess === 0) {
    alert(`Maksimum ${props.maxImages} şəkil əlavə edə bilərsiniz!`)
    target.value = ''
    return
  }
  
  Array.from(files).slice(0, filesToProcess).forEach((file) => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Yalnız şəkil faylları yükləyə bilərsiniz!')
      processedCount++
      return
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} - Şəkil ölçüsü 5MB-dan çox ola bilməz!`)
      processedCount++
      return
    }
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (result && typeof result === 'string') {
        newImages.push(result)
      }
      processedCount++
      
      // When all files are processed, emit update
      if (processedCount === filesToProcess) {
        if (newImages.length > 0) {
          emit('update:images', [...props.images, ...newImages])
        }
        // Reset input
        target.value = ''
      }
    }
    reader.onerror = () => {
      processedCount++
      if (processedCount === filesToProcess) {
        if (newImages.length > 0) {
          emit('update:images', [...props.images, ...newImages])
        }
        target.value = ''
      }
    }
    reader.readAsDataURL(file)
  })
}

const removeImage = (index: number) => {
  const newImages = props.images.filter((_, i) => i !== index)
  emit('update:images', newImages)
  
  // Adjust current index if needed
  if (currentIndex.value >= newImages.length && newImages.length > 0) {
    currentIndex.value = newImages.length - 1
  } else if (newImages.length === 0) {
    currentIndex.value = 0
  }
}

const goToPrevious = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = props.images.length - 1
  }
}

const goToNext = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
}

const goToIndex = (index: number) => {
  currentIndex.value = index
}
</script>

<template>
  <div class="space-y-4">
    <!-- Main Image Display -->
    <div class="relative w-full aspect-square bg-[var(--input-bg)] border-2 border-dashed border-[var(--border-app)] rounded-xl overflow-hidden group">
      <div v-if="images.length === 0" class="absolute inset-0 flex flex-col items-center justify-center p-8">
        <UiIcon name="lucide:image" class="w-16 h-16 mb-4 text-[var(--text-app)] opacity-40" />
        <p class="text-sm text-[var(--text-app)] opacity-60 text-center">Şəkil yoxdur</p>
        <p class="text-xs text-[var(--text-app)] opacity-40 text-center mt-2">
          Şəkil əlavə etmək üçün aşağıdakı düyməni istifadə edin
        </p>
      </div>

      <div v-else class="relative w-full h-full">
        <!-- Current Image -->
        <img 
          :src="images[currentIndex]" 
          alt="Product" 
          class="w-full h-full object-contain"
        />

        <!-- Navigation Arrows - Left -->
        <button
          v-if="images.length > 1"
          @click="goToPrevious"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-[var(--text-primary)] hover:bg-[var(--text-primary)]/90 text-white rounded-full flex items-center justify-center transition-all duration-700 ease-in-out shadow-lg hover:scale-110 cursor-pointer z-10"
        >
          <UiIcon name="lucide:chevron-left" class="w-6 h-6" />
        </button>

        <!-- Navigation Arrows - Right -->
        <button
          v-if="images.length > 1"
          @click="goToNext"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-[var(--text-primary)] hover:bg-[var(--text-primary)]/90 text-white rounded-full flex items-center justify-center transition-all duration-700 ease-in-out shadow-lg hover:scale-110 cursor-pointer z-10"
        >
          <UiIcon name="lucide:chevron-right" class="w-6 h-6" />
        </button>

        <!-- Image Counter -->
        <div class="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm font-medium rounded-full">
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>

        <!-- Remove Button -->
        <button
          @click="removeImage(currentIndex)"
          class="absolute top-4 left-4 w-10 h-10 bg-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/80 text-white rounded-full flex items-center justify-center transition-all duration-700 ease-in-out shadow-lg hover:scale-110 cursor-pointer z-10"
        >
          <UiIcon name="lucide:trash-2" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Thumbnails - Hidden, only show counter -->
    <div v-if="images.length > 1" class="flex items-center justify-center gap-2 py-2">
      <div
        v-for="(_, index) in images"
        :key="index"
        @click="goToIndex(index)"
        class="w-2 h-2 rounded-full transition-all cursor-pointer"
        :class="currentIndex === index 
          ? 'bg-[var(--text-primary)] w-6' 
          : 'bg-[var(--border-app)] hover:bg-[var(--text-primary)]/50'"
      ></div>
    </div>

    <!-- Upload Controls -->
    <div class="flex items-center gap-3">
      <input
        type="file"
        accept="image/*"
        multiple
        @change="handleImageUpload"
        class="hidden"
        :id="`image-upload-carousel-${Date.now()}`"
      />
      <label
        :for="`image-upload-carousel-${Date.now()}`"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
        :class="canAddMore 
          ? 'bg-[var(--text-primary)] text-white hover:opacity-90' 
          : 'bg-[var(--input-bg)] text-[var(--text-app)] opacity-50 cursor-not-allowed'"
      >
        <UiIcon name="lucide:upload" class="w-4 h-4" />
        Şəkil əlavə et
      </label>
      
      <div class="text-xs text-[var(--text-app)] opacity-60">
        <span v-if="props.maxImages">{{ images.length }} / {{ maxImagesCount }} şəkil</span>
        <span v-else>{{ images.length }} şəkil</span>
      </div>
    </div>

    <p class="text-xs text-[var(--text-app)] opacity-60">
      Maksimum fayl ölçüsü: 5MB. Dəstəklənən formatlar: JPG, PNG, GIF
    </p>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--bg-app);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}
</style>
