// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = 'https://dvaenopuezlimbcebuyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YWVub3B1ZXpsaW1iY2VidXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTE0MTksImV4cCI6MjA4NjA2NzQxOX0.8A0gIQ2KSHM4TSW3QMF8xc3dOVL_PhlB_3jp3P5tXwc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- SEGURANÇA: VERIFICA LOGIN ---
const adminId = localStorage.getItem('barbearia_admin_id');
if (!adminId) {
    alert("Você precisa estar logado.");
    window.location.href = 'index.html';
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    carregarServicos();
    configurarFormulario();
    configurarMenuMobile();
});

// --- LISTAR SERVIÇOS ---
async function carregarServicos() {
    const tbody = document.getElementById('servicos-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('servicos')
            .select('*')
            .eq('barbearia_id', adminId)
            .order('nome', { ascending: true });

        if (error) throw error;

        renderizarTabela(data);

    } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red">Erro ao buscar dados.</td></tr>';
    }
}

function renderizarTabela(servicos) {
    const tbody = document.getElementById('servicos-body');
    tbody.innerHTML = '';

    if (servicos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nenhum serviço cadastrado.</td></tr>';
        return;
    }

    servicos.forEach(servico => {
        const tr = document.createElement('tr');
        
        // Formatar preço para R$
        const precoFormatado = parseFloat(servico.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        tr.innerHTML = `
            <td>${servico.nome}</td>
            <td>${servico.duracao_minutos} min</td>
            <td>${precoFormatado}</td>
            <td>
                <button class="delete-btn" onclick="deletarServico(${servico.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- CADASTRAR NOVO SERVIÇO ---
function configurarFormulario() {
    const form = document.getElementById('servico-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button');
        const textoOriginal = btn.textContent;
        btn.textContent = "Salvando...";
        btn.disabled = true;

        const nome = document.getElementById('servico-nome').value;
        const duracao = document.getElementById('servico-duracao').value;
        const preco = document.getElementById('servico-preco').value;

        try {
            const { error } = await supabaseClient
                .from('servicos')
                .insert([{
                    nome: nome,
                    duracao_minutos: duracao,
                    preco: preco,
                    barbearia_id: adminId // Importante: Vincula ao cliente logado
                }]);

            if (error) throw error;

            alert("Serviço adicionado com sucesso!");
            form.reset();
            carregarServicos(); // Atualiza a tabela

        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar serviço.");
        } finally {
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }
    });
}

// --- EXCLUIR SERVIÇO ---
window.deletarServico = async function(id) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        try {
            const { error } = await supabaseClient
                .from('servicos')
                .delete()
                .eq('id', id);

            if (error) {
                // Se der erro (provavelmente chave estrangeira), avisa o usuário
                if(error.code === '23503') { // Código de violação de FK no Postgres
                    alert("Não é possível excluir este serviço pois existem agendamentos ou profissionais vinculados a ele.");
                } else {
                    throw error;
                }
                return;
            }

            alert('Serviço excluído!');
            carregarServicos();

        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir serviço.");
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