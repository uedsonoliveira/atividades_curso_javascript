// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = 'https://dvaenopuezlimbcebuyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YWVub3B1ZXpsaW1iY2VidXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTE0MTksImV4cCI6MjA4NjA2NzQxOX0.8A0gIQ2KSHM4TSW3QMF8xc3dOVL_PhlB_3jp3P5tXwc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- SEGURANÇA ---
const adminId = localStorage.getItem('barbearia_admin_id');
if (!adminId) {
    alert("Você precisa estar logado.");
    window.location.href = 'index.html';
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    carregarClientes();
    configurarFormulario();
    configurarMenuMobile();
});

// --- LISTAR CLIENTES ---
async function carregarClientes() {
    const tbody = document.getElementById('clientes-body');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('barbearia_id', adminId)
            .order('nome', { ascending: true });

        if (error) throw error;

        renderizarTabela(data);

    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red">Erro ao buscar dados.</td></tr>';
    }
}

function renderizarTabela(clientes) {
    const tbody = document.getElementById('clientes-body');
    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Nenhum cliente cadastrado.</td></tr>';
        return;
    }

    clientes.forEach(cliente => {
        const tr = document.createElement('tr');
        
        // Botão de WhatsApp no telefone
        const linkZap = `https://wa.me/55${cliente.telefone.replace(/\D/g,'')}`;

        tr.innerHTML = `
            <td>${cliente.nome}</td>
            <td>
                <a href="${linkZap}" target="_blank" style="text-decoration:none; color:#25D366; font-weight:bold;">
                    <i class="fab fa-whatsapp"></i> ${cliente.telefone}
                </a>
            </td>
            <td>
                <button class="delete-btn" onclick="deletarCliente(${cliente.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- CADASTRAR NOVO CLIENTE ---
function configurarFormulario() {
    const form = document.getElementById('cliente-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button');
        const textoOriginal = btn.textContent;
        btn.textContent = "Salvando...";
        btn.disabled = true;

        const nome = document.getElementById('cliente-nome').value;
        const telefone = document.getElementById('cliente-telefone').value.replace(/\D/g, ''); // Remove formatação, salva só números

        try {
            const { error } = await supabaseClient
                .from('clientes')
                .insert([{
                    nome: nome,
                    telefone: telefone,
                    barbearia_id: adminId
                }]);

            if (error) throw error;

            alert("Cliente cadastrado com sucesso!");
            form.reset();
            carregarClientes();

        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar cliente.");
        } finally {
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }
    });
}

// --- EXCLUIR CLIENTE ---
window.deletarCliente = async function(id) {
    if (confirm('Deseja remover este cliente da sua lista?')) {
        try {
            const { error } = await supabaseClient
                .from('clientes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('Cliente removido!');
            carregarClientes();

        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir cliente.");
        }
    }
}

// --- MENU MOBILE ---
function configurarMenuMobile() {
    const toggleBtn = document.querySelector('.nav-toggle-btn');
    const sideNav = document.querySelector('.side-nav');
    
    if(toggleBtn && sideNav) {
        toggleBtn.addEventListener('click', () => {
            sideNav.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('i');
            if(sideNav.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        });
    }
}

// --- Dark Mode ---

document.addEventListener('DOMContentLoaded', () => {
  configurarDarkMode();
});

function configurarDarkMode() {
  const toggleBtn = document.getElementById('theme-toggle');
  const body = document.body;

  // 1. Verifica se já tem preferência salva
  const temaSalvo = localStorage.getItem('tema');

  if (temaSalvo === 'dark') {
    body.classList.add('dark-mode');
    if (toggleBtn) atualizarIcone(true);
  }

  // 2. Evento de Clique
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault(); // Evita comportamento padrão se for link
      body.classList.toggle('dark-mode');

      const isDark = body.classList.contains('dark-mode');

      // Salva no navegador
      localStorage.setItem('tema', isDark ? 'dark' : 'light');

      atualizarIcone(isDark);
    });
  }

  // Função auxiliar para trocar o ícone (Lua <-> Sol)
  function atualizarIcone(isDark) {
    const icon = toggleBtn.querySelector('i');
    if (icon) {
      if (isDark) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun'); // Vira Sol no modo escuro
      } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon'); // Vira Lua no modo claro
      }
    }
  }
}