/**
 * @file Usecompanies.js
 * @description Composable para o gerenciamento administrativo de empresas.
 */
function useCompanies({ URL_BASE, token, sonnerAlert }) {
  const { ref } = Vue;

  const companies = ref([]);
  const loadingCompanies = ref(false);
  const savingCompany = ref(false);
  const companyModalVisible = ref(false);
  const editingCompany = ref(createEmptyCompany());

  function createEmptyCompany() {
    return {
      id: null,
      cnpj: "",
      legalName: "",
      tradeName: "",
      description: "",
      email: "",
      phone: "",
      postalCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      country: "Brasil",
      isActive: true,
    };
  }

  /**
   * Converte uma resposta de erro da API em uma mensagem segura para o operador.
   * @param {Response} response
   * @returns {Promise<string>}
   */
  async function getErrorMessage(response) {
    try {
      const data = await response.json();
      return data?.error || data?.message || "Não foi possível concluir a operação.";
    } catch {
      return "Não foi possível concluir a operação.";
    }
  }

  /**
   * Monta somente os campos aceitos pela API, evitando enviar propriedades de
   * apresentação ou dados retornados pelo servidor de volta ao controller.
   * @returns {object}
   */
  function buildCompanyPayload() {
    const company = editingCompany.value;
    return {
      cnpj: company.cnpj,
      legalName: company.legalName,
      tradeName: company.tradeName || null,
      description: company.description || null,
      email: company.email || null,
      phone: company.phone || null,
      postalCode: company.postalCode || null,
      street: company.street || null,
      number: company.number || null,
      complement: company.complement || null,
      neighborhood: company.neighborhood || null,
      city: company.city || null,
      state: company.state || null,
      country: company.country || "Brasil",
      ...(company.id ? { isActive: company.isActive === true } : {}),
    };
  }

  /**
   * Carrega as empresas cadastradas para a tabela administrativa.
   */
  const loadCompanies = async () => {
    loadingCompanies.value = true;
    try {
      const response = await fetch(`${URL_BASE}/api/v1/companies`, {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      companies.value = await response.json();
    } catch (error) {
      companies.value = [];
      sonnerAlert(error.message || "Erro ao carregar empresas.", false);
    } finally {
      loadingCompanies.value = false;
    }
  };

  /**
   * Abre o modal para cadastrar uma nova empresa.
   */
  const openCompanyModal = () => {
    editingCompany.value = createEmptyCompany();
    companyModalVisible.value = true;
  };

  /**
   * Carrega uma empresa existente no formulário de edição.
   * @param {object} company
   */
  const editCompany = (company) => {
    editingCompany.value = {
      ...createEmptyCompany(),
      ...company,
      cnpj: company.cnpj || "",
      country: company.country || "Brasil",
    };
    companyModalVisible.value = true;
  };

  /**
   * Fecha o modal sem persistir alterações.
   */
  const closeCompanyModal = () => {
    if (savingCompany.value) return;
    companyModalVisible.value = false;
  };

  /**
   * Cria ou atualiza uma empresa por meio da API administrativa.
   */
  const saveCompany = async () => {
    if (savingCompany.value) return;

    const company = editingCompany.value;
    if (!company.legalName || !company.cnpj) {
      sonnerAlert("Preencha CNPJ e razão social.", false);
      return;
    }

    savingCompany.value = true;
    try {
      const method = company.id ? "PUT" : "POST";
      const url = company.id
        ? `${URL_BASE}/api/v1/companies/${company.id}`
        : `${URL_BASE}/api/v1/companies`;
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(buildCompanyPayload()),
      });

      if (!response.ok) throw new Error(await getErrorMessage(response));

      const savedCompany = await response.json();
      const index = companies.value.findIndex((item) => item.id === savedCompany.id);
      if (index >= 0) companies.value[index] = savedCompany;
      else companies.value.unshift(savedCompany);

      companyModalVisible.value = false;
      sonnerAlert(company.id ? "Empresa atualizada." : "Empresa cadastrada.");
    } catch (error) {
      sonnerAlert(error.message || "Erro ao salvar empresa.", false);
    } finally {
      savingCompany.value = false;
    }
  };

  /**
   * Desativa uma empresa sem apagar o histórico cadastral.
   * @param {string} id
   */
  const deleteCompany = async (id) => {
    if (!window.confirm("Desativar esta empresa?")) return;

    try {
      const response = await fetch(`${URL_BASE}/api/v1/companies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token.value}` },
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));

      const company = companies.value.find((item) => item.id === id);
      if (company) company.isActive = false;
      sonnerAlert("Empresa desativada.");
    } catch (error) {
      sonnerAlert(error.message || "Erro ao desativar empresa.", false);
    }
  };

  /**
   * Formata CNPJ apenas para exibição no painel.
   * @param {string} value
   * @returns {string}
   */
  const formatCnpj = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
  };

  /**
   * Formata CEP apenas para exibição no painel.
   * @param {string} value
   * @returns {string}
   */
  const formatPostalCode = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    return digits.replace(/^(\d{5})(\d)/, "$1-$2");
  };

  return {
    companies,
    loadingCompanies,
    savingCompany,
    companyModalVisible,
    editingCompany,
    loadCompanies,
    openCompanyModal,
    editCompany,
    closeCompanyModal,
    saveCompany,
    deleteCompany,
    formatCnpj,
    formatPostalCode,
  };
}

/*
 * O composable mantém o formulário separado da resposta do servidor e nunca
 * envia de volta campos como id, createdAt ou updatedAt durante o save.
 */
