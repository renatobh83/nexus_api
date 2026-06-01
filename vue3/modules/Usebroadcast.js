/**
 * @file useBroadcast.js
 * @description Composable para envio de mensagens em broadcast.
 */
function useBroadcast({ URL_BASE, token, sonnerAlert }) {
  const { ref } = Vue;

  // --- Estado ---
  const broadcastModalVisible = ref(false);
  const broadcastFileInput = ref(null);
  const broadcastChannelId = ref("");
  const broadcastNumber = ref("");
  const broadcastMessage = ref("");
  const broadcastFileName = ref("");
  const selectedBroadcastFiles = ref([]);
  const sendingBroadcast = ref(false);

  // --- Funções ---

  const _clearForm = () => {
    broadcastChannelId.value = "";
    broadcastNumber.value = "";
    broadcastMessage.value = "";
    broadcastFileName.value = "";
    selectedBroadcastFiles.value = [];
  };

  /** Abre o modal de broadcast e limpa o form. */
  const openBroadcastModal = () => {
    _clearForm();
    broadcastModalVisible.value = true;
  };

  /** Fecha o modal de broadcast e limpa o form. */
  const closeBroadcastModal = () => {
    _clearForm();
    broadcastModalVisible.value = false;
  };

  /** Aciona o input oculto de arquivo para broadcast. */
  const triggerBroadcastFile = () => {
    broadcastFileInput.value?.click();
  };

  /**
   * Processa os arquivos selecionados para o broadcast.
   * @param {Event} event
   */
  const handleBroadcastFileSelect = (event) => {
    const files = Array.from(event.target.files);
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        alert(`O arquivo "${file.name}" excede o limite de 25 MB.`);
        continue;
      }
      broadcastFileName.value = file.name;
      selectedBroadcastFiles.value.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
        caption: "",
      });
    }
    event.target.value = "";
  };

  /**
   * Remove um arquivo da fila de broadcast.
   * @param {number} index
   */
  const removeBroadcastFile = (index) => {
    const fileObj = selectedBroadcastFiles.value[index];
    if (fileObj?.preview) URL.revokeObjectURL(fileObj.preview);
    selectedBroadcastFiles.value.splice(index, 1);
    broadcastFileName.value = "";
  };

  /** Envia a mensagem de broadcast. */
  const sendBroadcastMessage = async () => {
    if (!broadcastChannelId.value || !broadcastNumber.value) {
      alert("Preencha o canal e o número de destino.");
      return;
    }

    const formData = new FormData();
    formData.append("to", broadcastNumber.value);
    formData.append("body", broadcastMessage.value || "");

    if (selectedBroadcastFiles.value[0]) {
      selectedBroadcastFiles.value.forEach((item, idx) => {
        formData.append("files", item.file);
        if (broadcastMessage.value)
          formData.append(`caption_${idx}`, broadcastMessage.value);
      });
    }

    sendingBroadcast.value = true;
    try {
      await fetch(
        `${URL_BASE}/api/v1/channel/${broadcastChannelId.value}/send`,
        {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${token.value}` },
        },
      );
    } finally {
      sendingBroadcast.value = false;
      closeBroadcastModal();
    }
  };

  return {
    broadcastModalVisible,
    broadcastFileInput,
    broadcastChannelId,
    broadcastNumber,
    broadcastMessage,
    broadcastFileName,
    selectedBroadcastFiles,
    sendingBroadcast,
    openBroadcastModal,
    closeBroadcastModal,
    triggerBroadcastFile,
    handleBroadcastFileSelect,
    removeBroadcastFile,
    sendBroadcastMessage,
  };
}
