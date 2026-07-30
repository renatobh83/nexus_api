/**
 * @file useQrCode.js
 * @description Composable para gerenciamento do modal e geração de QR Code.
 */
function useQrCode({ STATUS, sonnerAlert }) {
  const { ref, computed, nextTick } = Vue;

  // --- Estado ---
  const qrCodeContainerRef = ref(null);
  const qrCodeModalVisible = ref(false);
  const pairingContainer = ref(false);
  const qrcodeImage = ref(false);
  const isPairingCode = ref(false);
  const qrString = ref("");
  const isLoading = ref(false);
  const currentStatus = ref(STATUS.CONNECTING);
  const showPairingCode = ref("");

  // --- Computed ---

  const statusClass = computed(() => {
    const classes = {
      [STATUS.CONNECTING]: "connecting",
      [STATUS.LOADING]: "loading",
      [STATUS.ERROR]: "error",
      [STATUS.EXPIRED]: "expired",
      [STATUS.SUCCESS]: "success",
    };
    return classes[currentStatus.value] || "connecting";
  });

  const statusMessage = computed(() => {
    const messages = {
      [STATUS.CONNECTING]: "🔄 Aguardando QR Code...",
      [STATUS.LOADING]: "⏳ Gerando QR Code...",
      [STATUS.ERROR]: "❌ Erro ao gerar QR Code. Tente novamente!",
      [STATUS.EXPIRED]:
        "⏰ QR Code expirado. Clique fechar e conecte novamente.",
      [STATUS.SUCCESS]: "✅ QR Code gerado com sucesso!",
    };
    return messages[currentStatus.value] || "🔄 Aguardando QR Code...";
  });

  // --- Funções ---

  /**
   * Atualiza o status do QR Code.
   * @param {string} newStatus
   * @param {boolean} hasImage
   */
  const updateQRCodeStatus = (newStatus, hasImage = false) => {
    currentStatus.value = newStatus;
    qrcodeImage.value = hasImage;

    if (newStatus === STATUS.SUCCESS) {
      setTimeout(() => {
        if (currentStatus.value === STATUS.SUCCESS) {
          updateQRCodeStatus(STATUS.EXPIRED, false);
        }
      }, 50000);
    }
  };

  /** Fecha o modal de QR Code. */
  const closeQRCodeModal = () => {
    qrCodeModalVisible.value = false;
  };

  /**
   * Gera o QR Code no container.
   * @param {string} qrCode - String para gerar o QR Code.
   */
  const generateQRCode = async (qrCode) => {
    if (qrCodeContainerRef.value) {
      qrCodeContainerRef.value.innerHTML = "";
    }
    qrCodeModalVisible.value = true;

    if (!qrCode) {
      isLoading.value = true;
      qrString.value = "ERRO";
      return;
    }

    await nextTick();

    if (!qrCodeContainerRef.value) {
      console.log("Container não encontrado");
      return;
    }

    updateQRCodeStatus(STATUS.LOADING, false);

    new QRCode(qrCodeContainerRef.value, {
      text: qrCode,
      width: 280,
      height: 280,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.L,
    });

    updateQRCodeStatus(STATUS.SUCCESS, true);
    isLoading.value = true;
  };

  return {
    qrCodeContainerRef,
    qrCodeModalVisible,
    pairingContainer,
    qrcodeImage,
    isPairingCode,
    qrString,
    isLoading,
    currentStatus,
    showPairingCode,
    statusClass,
    statusMessage,
    updateQRCodeStatus,
    closeQRCodeModal,
    generateQRCode,
  };
}
