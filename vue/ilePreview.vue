<template>
  <Teleport to="body">
    <div v-if="files.length > 0" class="file-preview">
      <div v-for="(file, index) in files" :key="file.id" class="file-preview-item">
        <img v-if="isImage(file)" :src="file.preview" class="preview-image" />
        <div v-else class="preview-icon">{{ getIcon(file.type) }}</div>

        <div class="file-info">
          <div class="file-name">{{ truncate(file.name) }}</div>
          <div class="file-size">{{ formatSize(file.size) }}</div>
          <input
            type="text"
            v-model="file.caption"
            placeholder="Adicionar legenda..."
            class="caption-input"
          />
        </div>

        <button @click="removeFile(index)" class="remove-btn">✕</button>
      </div>

      <button @click="send" class="send-btn">
        Enviar {{ files.length }} arquivo(s)
      </button>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  files: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['remove', 'send'])

const isImage = (file) => file.type.startsWith('image/')
const getIcon = (type) => {
  if (type.includes('pdf')) return '📄'
  if (type.includes('video')) return '🎥'
  if (type.includes('audio')) return '🎵'
  return '📎'
}
const truncate = (name) => name.length > 30 ? name.substring(0, 30) : name
const formatSize = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

const removeFile = (index) => emit('remove', index)
const send = () => emit('send')
</script>