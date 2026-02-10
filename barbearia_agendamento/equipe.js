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
    carregarCheckboxServicos(); // Carrega as opções para marcar
    carregarEquipe(); // Carrega a tabela
    configurarFormulario();
    configurarMenuMobile();
});

// --- 1. CARREGAR CHECKBOXES DE SERVIÇOS ---
async function carregarCheckboxServicos() {
    const container = document.getElementById('servicos-checkboxes');
    container.innerHTML = 'Carregando serviços...';

    try {
        const { data, error } = await supabaseClient
            .from('servicos')
            .select('id, nome')
            .eq('barbearia_id', adminId)
            .order('nome');

        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = '<span style="color:red">Cadastre serviços primeiro!</span>';
            return;
        }

        container.innerHTML = ''; // Limpa
        data.forEach(servico => {
            // Cria o HTML do checkbox dinamicamente
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.innerHTML = `
                <input type="checkbox" name="servicos" value="${servico.id}">
                ${servico.nome}
            `;
            container.appendChild(label);
        });

    } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        container.innerHTML = 'Erro ao carregar opções.';
    }
}

// --- 2. LISTAR EQUIPE NA TABELA ---
async function carregarEquipe() {
    const tbody = document.getElementById('profissionais-body');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Carregando...</td></tr>';

    try {
        // Query Avançada: Busca o profissional E os serviços vinculados a ele
        const { data, error } = await supabaseClient
            .from('profissionais')
            .select(`
                *,
                profissional_servico (
                    servicos ( nome )
                )
            `)
            .eq('barbearia_id', adminId)
            .order('nome');

        if (error) throw error;

        renderizarTabela(data);

    } catch (error) {
        console.error("Erro ao carregar equipe:", error);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red">Erro ao buscar dados.</td></tr>';
    }
}

function renderizarTabela(profissionais) {
    const tbody = document.getElementById('profissionais-body');
    tbody.innerHTML = '';

    if (profissionais.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Nenhum profissional cadastrado.</td></tr>';
        return;
    }

    profissionais.forEach(prof => {
        const tr = document.createElement('tr');
        
        // Formata a lista de serviços (Ex: "Corte, Barba")
        // O Supabase retorna um array de objetos dentro de profissional_servico
        let listaServicos = "Nenhum serviço vinculado";
        if (prof.profissional_servico && prof.profissional_servico.length > 0) {
            // Mapeia para pegar só os nomes e junta com vírgula
            listaServicos = prof.profissional_servico
                .map(item => item.servicos ? item.servicos.nome : '') // Proteção contra null
                .filter(nome => nome !== '') // Remove vazios
                .join(', ');
        }

        tr.innerHTML = `
            <td>
                <strong>${prof.nome}</strong><br>
                <small style="color:#666">${prof.especialidade || ''}</small>
            </td>
            <td>${listaServicos}</td>
            <td>
                <button class="delete-btn" onclick="deletarProfissional(${prof.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 3. CADASTRAR NOVO PROFISSIONAL ---
function configurarFormulario() {
    const form = document.getElementById('profissional-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button');
        const textoOriginal = btn.textContent;
        btn.textContent = "Salvando...";
        btn.disabled = true;

        const nome = document.getElementById('profissional-nome').value;
        const especialidade = document.getElementById('profissional-especialidade').value;
        
        // Pega todos os checkboxes marcados
        const checkboxes = document.querySelectorAll('input[name="servicos"]:checked');
        const servicoIds = Array.from(checkboxes).map(cb => cb.value);

        if (servicoIds.length === 0) {
            alert("Selecione pelo menos um serviço para este profissional.");
            btn.textContent = textoOriginal;
            btn.disabled = false;
            return;
        }

        try {
            // PASSO 1: Criar o Profissional
            const { data: profData, error: profError } = await supabaseClient
                .from('profissionais')
                .insert([{
                    nome: nome,
                    especialidade: especialidade,
                    barbearia_id: adminId
                }])
                .select(); // Precisamos do .select() para pegar o ID gerado!

            if (profError) throw profError;

            const novoProfId = profData[0].id;

            // PASSO 2: Criar vínculos na tabela pivô (profissional_servico)
            const vinculos = servicoIds.map(servicoId => ({
                profissional_id: novoProfId,
                servico_id: servicoId,
                barbearia_id: adminId
            }));

            const { error: pivotError } = await supabaseClient
                .from('profissional_servico')
                .insert(vinculos);

            if (pivotError) throw pivotError;

            alert("Profissional adicionado com sucesso!");
            form.reset();
            carregarEquipe(); // Atualiza a tabela

        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar profissional. Tente novamente.");
        } finally {
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }
    });
}

// --- 4. EXCLUIR PROFISSIONAL ---
window.deletarProfissional = async function(id) {
    if (confirm('Tem certeza? Isso removerá o profissional e seus agendamentos futuros.')) {
        try {
            // Como configuramos "ON DELETE CASCADE" no SQL, 
            // apagar o profissional remove automaticamente os vínculos na tabela pivô.
            const { error } = await supabaseClient
                .from('profissionais')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('Profissional removido!');
            carregarEquipe();

        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir profissional.");
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