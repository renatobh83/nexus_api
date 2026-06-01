/**
 * @file useIntegracao.js
 * @description Composable para gerenciamento de Integracoes Externas.
 */
function useIntegracao({ URL_BASE, token, sonnerAlert }) {
  const loadingIntegraoes = ref(false);
  const loading = ref(false);
  const integracaoModalVisible = ref(false);
  const integracoes = ref([]);
  const editingIntegracao = ref({
    id: null,
    integrationName: "",
    settings: "",
    clientId: "",
    status: "ativo",
  });
  /**
   * Carrega a lista de integracao.
   */
  const loadIntegracao = async () => {
    loadingIntegraoes.value = true;
    try {
      const res = await fetch(`${URL_BASE}/api/v1/external`, {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      integracoes.value = await res.json();
    } catch (e) {
      integracoes.value = [];
    } finally {
      loadingIntegraoes.value = false;
    }
  };
  /**
   * Delete integracao
   */
  const deleteIntegracao = async (idIntegraco) => {
    loadingIntegraoes.value = true;

    try {
      const res = await fetch(`${URL_BASE}/api/v1/external/${idIntegraco}`, {
        headers: { Authorization: `Bearer ${token.value}` },
        method: "DELETE",
      });

      const integracao = integracoes.value.filter((t) => t.id !== idIntegraco);
      integracoes.value = integracao;
    } catch (e) {
      // integracoes.value = [];
      loadingIntegraoes.value = false;
    } finally {
      loadingIntegraoes.value = false;
    }
  };
  /**
   * Cria ou atualiza uma integracao no servidor.
   */
  const saveIntegracao = async () => {
    loading.value = true;
    console.log(loading.value);
    // 1. Validação inicial
    if (!editingIntegracao.value) {
      console.error("Nenhuma integração para salvar");
      loading.value = false;
      return false;
    }
    if (!editingIntegracao.value.settings) {
      console.error("Configurações não encontradas");
      loading.value = false;
      return false;
    }

    const method = editingIntegracao.value.id ? "PUT" : "POST";
    const url = editingIntegracao.value.id
      ? `${URL_BASE}/api/v1/external/createIntegration/${editingIntegracao.value.id}`
      : `${URL_BASE}/api/v1/external/createIntegration`;

    try {
      let settingsFinal = editingIntegracao.value.settings;
      if (typeof settingsFinal === "string") {
        settingsFinal = JSON.parse(settingsFinal);
      }
      // 7. Cria o objeto de dados
      const integracaoData = {
        ...editingIntegracao.value,
        settings: settingsFinal,
      };
      console.log("Integração salva com sucesso:", integracaoData);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(integracaoData),
      });
      const integracaCreate = await response.json();
      updateSingleIntegracao(integracaCreate);
    } catch (error) {
      console.error("Erro ao salvar integração:", error.message);
      loading.value = false;
      // Feedback detalhado do erro
      if (error.message.includes("Unexpected token")) {
        console.error("Verifique vírgulas, colchetes e chaves");
      } else if (error.message.includes("Expected property name")) {
        console.error("Verifique se as chaves estão entre aspas duplas");
      }
    } finally {
      integracaoModalVisible.value = false;
      loading.value = false;
    }
  };

  /**
   * Substitui (ou insere) uma integracao na lista local.
   * @param {object} updatedIntegracao
   */
  function updateSingleIntegracao(updatedIntegracao) {
    const index = integracoes.value.findIndex(
      (t) => t.id === updatedIntegracao.id,
    );
    if (index !== -1) {
      integracoes.value[index] = {
        ...integracoes.value[index],
        ...updatedIntegracao,
      };
    } else {
      integracoes.value.unshift(updatedIntegracao);
    }
  }
  /**
   * Prepara o modal para edição de uma integracao existente.
   * @param {object} integracao
   */
  const editIntegracao = (integracao) => {
    editingIntegracao.value = { ...integracao };
    integracaoModalVisible.value = true;
  };
  /**
   * Abre o modal de criação de integracao (limpa o form).
   */
  const openIntegracaoModal = () => {
    editingIntegracao.value = {
      id: null,
      integrationName: "",
      settings: "",
      clientId: "",
      status: "ativo",
    };
    integracaoModalVisible.value = true;
  };
  const getSettingsString = () => {
    if (!editingIntegracao.value.settings) return "";

    if (typeof editingIntegracao.value.settings === "object") {
      return JSON.stringify(editingIntegracao.value.settings, null, 2);
    }
    return editingIntegracao.value.settings;
  };
  // Atualiza quando o usuário digita
  const updateSettings = (value) => {
    editingIntegracao.value.settings = value;
  };
  return {
    loadingIntegraoes,
    integracoes,
    integracaoModalVisible,
    editingIntegracao,
    saveIntegracao,
    openIntegracaoModal,
    editIntegracao,
    loadIntegracao,
    getSettingsString,
    updateSettings,
    deleteIntegracao,
    loading,
  };
}
