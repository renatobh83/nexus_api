/**
 * @file Useusers.js
 * @description Composable para gerenciamento administrativo de usuários e edição
 * segura do perfil autenticado.
 */
function useUsers({ URL_BASE, token, currentUser, sonnerAlert }) {
  const { ref, computed } = Vue;

  // --- Estado ---
  const users = ref([]);
  const loadingUsers = ref(false);
  const savingUser = ref(false);
  const userModalVisible = ref(false);
  const profileMode = ref(false);
  const editingUser = ref({
    id: null,
    name: "",
    email: "",
    role: "atendente",
    status: "ativo",
    isActive: true,
    passwordHash: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // --- Computed ---
  /**
   * Lista de usuários visível ao operador logado.
   * Administradores veem todos; atendentes veem apenas o próprio perfil.
   */
  const filteredUsers = computed(() => {
    if (currentUser.value?.role === "administrador") return users.value;
    return users.value.filter((u) => u.id === currentUser.value?.id);
  });

  const isAdmin = computed(
    () => currentUser.value?.role?.toLowerCase() === "administrador",
  );

  /**
   * Lê o corpo JSON de uma resposta e transforma erros HTTP em mensagens
   * utilizáveis pelo alerta do painel.
   */
  const readResponse = async (response) => {
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      throw new Error(
        body?.error || body?.message || `Falha na requisição (${response.status})`,
      );
    }

    return body;
  };

  /**
   * Limpa somente os campos transitórios de senha antes de abrir ou fechar um
   * formulário. Nenhuma senha existente é carregada para o navegador.
   */
  const clearPasswordFields = () => {
    editingUser.value.passwordHash = "";
    editingUser.value.currentPassword = "";
    editingUser.value.newPassword = "";
    editingUser.value.confirmPassword = "";
  };

  // --- Funções ---

  /**
   * Carrega a lista administrativa de usuários. O app só chama esta função
   * durante a inicialização quando o perfil tem autorização administrativa.
   */
  const loadUsers = async () => {
    loadingUsers.value = true;
    try {
      const res = await fetch(`${URL_BASE}/api/v1/users`, {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      users.value = await readResponse(res);
    } catch (e) {
      console.log(e);
      users.value = [];
    } finally {
      loadingUsers.value = false;
    }
  };

  /**
   * Abre o modal de criação administrativa, sempre iniciando um formulário
   * vazio e sem reaproveitar dados sensíveis de outro usuário.
   */
  const openUserModal = () => {
    if (!isAdmin.value) return;

    profileMode.value = false;
    editingUser.value = {
      id: null,
      name: "",
      email: "",
      role: "atendente",
      status: "ativo",
      isActive: true,
      passwordHash: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    userModalVisible.value = true;
  };

  /**
   * Abre o mesmo modal no modo de edição do usuário autenticado. Esse modo não
   * recebe um ID escolhido pelo usuário e só envia nome e senha para `/auth/me`.
   */
  const openProfileModal = () => {
    profileMode.value = true;
    editingUser.value = {
      ...currentUser.value,
      id: currentUser.value?.id || null,
      passwordHash: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    userModalVisible.value = true;
  };

  /**
   * Fecha o modal e remove imediatamente os campos transitórios de senha da
   * memória reativa do formulário.
   */
  const closeUserModal = () => {
    clearPasswordFields();
    profileMode.value = false;
    userModalVisible.value = false;
  };

  /**
   * Prepara o modal administrativo para edição de um usuário existente. Perfis
   * não administrativos só podem abrir o próprio modo de perfil.
   */
  const editUser = (user) => {
    if (!isAdmin.value && user.id !== currentUser.value?.id) return;

    profileMode.value = false;
    editingUser.value = {
      ...user,
      passwordHash: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    userModalVisible.value = true;
  };

  /**
   * Salva o próprio perfil usando a rota cujo alvo vem do JWT, nunca do corpo
   * ou da URL. A confirmação da nova senha é validada somente no cliente.
   */
  const saveOwnProfile = async () => {
    const name = editingUser.value.name?.trim();
    const currentPassword = editingUser.value.currentPassword || "";
    const newPassword = editingUser.value.newPassword || "";
    const confirmPassword = editingUser.value.confirmPassword || "";

    if (!name) {
      sonnerAlert("Preencha o nome.", false);
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      sonnerAlert("A confirmação da nova senha não confere.", false);
      return;
    }

    if (newPassword && !currentPassword) {
      sonnerAlert("Informe a senha atual para trocar a senha.", false);
      return;
    }

    const payload = { name };
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    savingUser.value = true;
    try {
      const response = await fetch(`${URL_BASE}/api/v1/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await readResponse(response);

      currentUser.value = {
        ...currentUser.value,
        ...result.user,
      };
      localStorage.setItem("user_data", JSON.stringify(currentUser.value));
      closeUserModal();

      if (result.requiresReauthentication) {
        sonnerAlert("Senha alterada. Faça login novamente.");
        setTimeout(() => {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_data");
          window.location.href = "login.html";
        }, 900);
      } else {
        sonnerAlert("Perfil atualizado.");
      }
    } catch (error) {
      sonnerAlert(error.message || "Erro ao atualizar o perfil.", false);
    } finally {
      savingUser.value = false;
    }
  };

  /**
   * Cria ou atualiza um usuário no endpoint administrativo. Esse caminho só é
   * alcançado pelo administrador e mantém a compatibilidade com `passwordHash`
   * como nome legado do campo de senha enviado ao backend.
   */
  const saveUser = async () => {
    if (profileMode.value) {
      await saveOwnProfile();
      return;
    }

    if (!isAdmin.value) return;

    if (!editingUser.value.name || !editingUser.value.email) {
      sonnerAlert("Preencha nome e email.", false);
      return;
    }

    const method = editingUser.value.id ? "PUT" : "POST";
    const url = editingUser.value.id
      ? `${URL_BASE}/api/v1/users/${editingUser.value.id}`
      : `${URL_BASE}/api/v1/users`;

    const payload = {
      name: editingUser.value.name,
      email: editingUser.value.email,
      role: editingUser.value.role,
      isActive: editingUser.value.isActive,
    };
    if (editingUser.value.passwordHash) {
      payload.passwordHash = editingUser.value.passwordHash;
    }

    savingUser.value = true;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await readResponse(response);

      if (editingUser.value.id === currentUser.value.id) {
        currentUser.value = { ...currentUser.value, ...result };
        localStorage.setItem("user_data", JSON.stringify(currentUser.value));
      }

      closeUserModal();
      sonnerAlert(editingUser.value.id ? "Usuário atualizado." : "Usuário criado.");
      await loadUsers();
    } catch (error) {
      sonnerAlert(error.message || "Erro ao salvar usuário.", false);
    } finally {
      savingUser.value = false;
    }
  };

  /**
   * Desativa um usuário somente pelo fluxo administrativo já protegido no
   * backend; o próprio usuário não recebe esse comando no template.
   */
  const deleteUser = async (id) => {
    if (!isAdmin.value || !confirm("Desativar este usuário?")) return;

    try {
      const response = await fetch(`${URL_BASE}/api/v1/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token.value}` },
      });
      await readResponse(response);
      await loadUsers();
    } catch (error) {
      sonnerAlert(error.message || "Erro ao desativar usuário.", false);
    }
  };

  return {
    users,
    loadingUsers,
    savingUser,
    userModalVisible,
    profileMode,
    editingUser,
    filteredUsers,
    isAdmin,
    loadUsers,
    openUserModal,
    openProfileModal,
    closeUserModal,
    editUser,
    saveUser,
    deleteUser,
  };
}
