/**
 * @file useUsers.js
 * @description Composable para gerenciamento de usuários.
 */
function useUsers({ URL_BASE, token, currentUser, sonnerAlert }) {
  const { ref, computed } = Vue;

  // --- Estado ---
  const users = ref([]);
  const loadingUsers = ref(false);
  const userModalVisible = ref(false);
  const editingUser = ref({
    id: null,
    name: "",
    email: "",
    role: "atendente",
    status: "ativo",
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

  const isAdmin = computed(() => currentUser.value?.role === "administrador");

  // --- Funções ---

  /**
   * Carrega a lista de usuários.
   */
  const loadUsers = async () => {
    loadingUsers.value = true;
    try {
      const res = await fetch(`${URL_BASE}/api/v1/users`, {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      users.value = await res.json();
    } catch (e) {
      console.log(e);
      users.value = [];
    } finally {
      loadingUsers.value = false;
    }
  };

  /**
   * Abre o modal de criação de usuário (limpa o form).
   */
  const openUserModal = () => {
    editingUser.value = {
      id: null,
      name: "",
      email: "",
      role: "atendente",
      status: "ativo",
    };
    userModalVisible.value = true;
  };

  /**
   * Prepara o modal para edição de um usuário existente.
   * @param {object} user
   */
  const editUser = (user) => {
    editingUser.value = { ...user };
    userModalVisible.value = true;
  };

  /**
   * Cria ou atualiza um usuário no servidor.
   */
  const saveUser = async () => {
    if (!editingUser.value.name || !editingUser.value.email)
      return alert("Preencha nome e email");

    const method = editingUser.value.id ? "PUT" : "POST";
    const url = editingUser.value.id
      ? `${URL_BASE}/api/v1/users/${editingUser.value.id}`
      : `${URL_BASE}/api/v1/users`;

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editingUser.value),
    });

    if (editingUser.value.id === currentUser.value.id) {
      currentUser.value = editingUser.value;
    }

    userModalVisible.value = false;
    await loadUsers();
  };

  /**
   * Exclui um usuário pelo ID.
   * @param {string} id
   */
  const deleteUser = async (id) => {
    if (confirm("Excluir?")) {
      await fetch(`${URL_BASE}/api/v1/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadUsers();
    }
  };

  return {
    users,
    loadingUsers,
    userModalVisible,
    editingUser,
    filteredUsers,
    isAdmin,
    loadUsers,
    openUserModal,
    editUser,
    saveUser,
    deleteUser,
  };
}
