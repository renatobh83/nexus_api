/**
 * @file useChannels.js
 * @description Composable para gerenciamento de canais (WhatsApp, Telegram, etc.).
 */
function useChannels({ URL_BASE, token, sonnerAlert }) {
  const { ref } = Vue;

  // --- Estado ---
  const channels = ref([]);
  const loadingChannels = ref(false);
  const currentChannelId = ref(null);
  const channelModalVisible = ref(false);
  const selectedChannelType = ref("");
  const newChannelName = ref("");
  const newChannelToken = ref("");
  const newChannelNumber = ref("");
  const businessAccountId = ref("");
  const accessToken = ref("");
  const phoneNumberId = ref("");
  const editingChannel = ref({ selectedChannelType: "" });

  // --- Funções ---

  /**
   * Substitui (ou insere) um canal na lista local.
   * @param {object} updatedChannel
   */
  function updateSingleChannel(updatedChannel) {
    const index = channels.value.findIndex((t) => t.id === updatedChannel.id);
    if (index !== -1) {
      channels.value[index] = { ...channels.value[index], ...updatedChannel };
    } else {
      channels.value.unshift(updatedChannel);
    }
  }

  /**
   * Carrega a lista de canais disponíveis.
   */
  const loadChannels = async () => {
    loadingChannels.value = true;
    try {
      const res = await fetch(`${URL_BASE}/api/v1/channel`, {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      channels.value = await res.json();
    } catch (e) {
      channels.value = [];
      console.log("Erro ao carregar canais:", e);
    } finally {
      loadingChannels.value = false;
    }
  };

  /**
   * Abre o modal de criação de canal (limpa o form).
   */
  const openAddChannelModal = () => {
    editingChannel.value = {};
    selectedChannelType.value = "";
    newChannelName.value = "";
    newChannelToken.value = "";
    newChannelNumber.value = "";
    businessAccountId.value = "";
    accessToken.value = "";
    phoneNumberId.value = "";
    channelModalVisible.value = true;
  };

  /**
   * Fecha o modal de canal e limpa o form.
   */
  const closeChannelModal = () => {
    channelModalVisible.value = false;
    editingChannel.value = {};
    selectedChannelType.value = "";
    newChannelName.value = "";
    newChannelToken.value = "";
    newChannelNumber.value = "";
    businessAccountId.value = "";
    accessToken.value = "";
    phoneNumberId.value = "";
  };

  /**
   * Prepara o modal para edição de um canal existente.
   * @param {object} channel
   */
  const editChannel = (channel) => {
    editingChannel.value = JSON.parse(JSON.stringify(channel));
    channelModalVisible.value = true;
  };

  /**
   * Carrega os dados de um canal no form de edição.
   * @param {object} channel
   */
  const loadChannelForEdit = (channel) => {
    if (!channel || !channel.id) return;

    selectedChannelType.value = channel.type;
    newChannelName.value = channel.name || "";
    newChannelToken.value = "";
    newChannelNumber.value = "";
    businessAccountId.value = "";
    accessToken.value = "";
    phoneNumberId.value = "";

    if (channel.type === "telegram") {
      newChannelToken.value = channel.tokenTelegram || channel.token || "";
    }
    if (channel.type === "whatsapp") {
      newChannelNumber.value = channel.wppUser || channel.number || "";
    }
    if (channel.type === "wpp-business") {
      businessAccountId.value = channel.businessAccountId || "";
      accessToken.value = channel.accessToken || "";
      phoneNumberId.value = channel.phoneNumberId || "";
    }
  };

  /**
   * Define o tipo do canal selecionado no form.
   * @param {string} channel
   */
  const selectChannelType = (channel) => {
    selectedChannelType.value = channel;
  };

  /**
   * Cria ou atualiza um canal.
   */
  const createChannel = async () => {
    if (!selectedChannelType.value || !newChannelName.value)
      return alert("Preencha os campos");

    const data = {
      name: newChannelName.value,
      type: selectedChannelType.value,
    };

    if (selectedChannelType.value === "telegram")
      data.tokenTelegram = newChannelToken.value;

    if (selectedChannelType.value === "whatsapp") {
      data.pairingCodeEnabled = !!newChannelNumber.value;
      data.wppUser = newChannelNumber.value;
    }

    if (selectedChannelType.value === "wpp-business") {
      data.businessAccountId = businessAccountId.value;
      data.accessToken = accessToken.value;
      data.phoneNumberId = phoneNumberId.value;
    }

    const isEditing = editingChannel.value && editingChannel.value.id;
    const url = isEditing
      ? `${URL_BASE}/api/v1/channel/${editingChannel.value.id}`
      : `${URL_BASE}/api/v1/channel`;
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Erro ao salvar canal");
      const channel = await response.json();
      sonnerAlert(
        isEditing
          ? "Canal atualizado com sucesso!"
          : "Canal criado com sucesso!",
      );
      channelModalVisible.value = false;
      editingChannel.value = {};
      updateSingleChannel(channel);
    } catch (error) {
      console.log("Erro:", error);
      sonnerAlert("Erro ao salvar canal", false);
    }
  };

  /**
   * Inicia a conexão de um canal (abre modal QR).
   * @param {string} channelId
   */
  const connectChannel = async (channelId) => {
    currentChannelId.value = channelId;
    try {
      await fetch(`${URL_BASE}/api/v1/channel/${channelId}/connect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.value}` },
      });
    } catch (error) {
      console.log("Erro:", error);
    }
  };

  /**
   * Desconecta um canal.
   * @param {string} channelId
   */
  const disconnectChannel = async (channelId) => {
    if (!confirm("Desconectar este canal?")) return;
    try {
      await fetch(`${URL_BASE}/api/v1/channel/${channelId}/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.value}` },
      });
      sonnerAlert("Canal desconectado");
      await loadChannels();
    } catch (error) {
      sonnerAlert("Erro ao desconectar", false);
    }
  };

  /**
   * Reconecta um canal (disconnect + connect).
   * @param {string} channelId
   */
  const refreshChannel = async (channelId) => {
    console.log(`Reconectando canal ${channelId}...`);
    await disconnectChannel(channelId);
    setTimeout(() => connectChannel(channelId), 1000);
  };

  return {
    channels,
    loadingChannels,
    currentChannelId,
    channelModalVisible,
    selectedChannelType,
    newChannelName,
    newChannelToken,
    newChannelNumber,
    businessAccountId,
    accessToken,
    phoneNumberId,
    editingChannel,
    updateSingleChannel,
    loadChannels,
    openAddChannelModal,
    closeChannelModal,
    editChannel,
    loadChannelForEdit,
    selectChannelType,
    createChannel,
    connectChannel,
    disconnectChannel,
    refreshChannel,
  };
}
