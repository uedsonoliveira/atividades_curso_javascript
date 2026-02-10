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
    carregarAgendamentos();
    configurarMenuMobile(); // Reutilizando lógica do menu se necessário
});

// --- FUNÇÕES PRINCIPAIS ---

async function carregarAgendamentos() {
    const tbody = document.getElementById('agendamentos-body');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Carregando agendamentos...</td></tr>';

    try {
        // Busca agendamentos + dados das tabelas relacionadas (serviços e profissionais)
        const { data, error } = await supabaseClient
            .from('agendamentos')
            .select(`
                id,
                nome_cliente_temp,
                telefone_cliente_temp,
                data_agendamento,
                hora_agendamento,
                status,
                servicos ( nome ),
                profissionais ( nome )
            `)
            .eq('barbearia_id', adminId)
            .order('data_agendamento', { ascending: false }) // Mais recentes primeiro
            .order('hora_agendamento', { ascending: true });

        if (error) throw error;

        renderizarTabela(data);

    } catch (error) {
        console.error("Erro ao carregar:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red">Erro ao carregar dados via Supabase.</td></tr>';
    }
}

function renderizarTabela(agendamentos) {
    const tbody = document.getElementById('agendamentos-body');
    tbody.innerHTML = ''; // Limpa tabela

    if (agendamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Nenhum agendamento encontrado.</td></tr>';
        return;
    }

    agendamentos.forEach(item => {
        const tr = document.createElement('tr');
        
        // Formatar Data (YYYY-MM-DD -> DD/MM/YYYY)
        const dataFormatada = item.data_agendamento.split('-').reverse().join('/');
        
        // Formatar Hora (remove os segundos se vier HH:MM:SS)
        const horaFormatada = item.hora_agendamento.substring(0, 5);

        // Nomes (Trata caso o serviço/profissional tenha sido deletado)
        const nomeServico = item.servicos ? item.servicos.nome : 'Serviço excluído';
        const nomeProfissional = item.profissionais ? item.profissionais.nome : 'Profissional excluído';

        tr.innerHTML = `
            <td>${item.nome_cliente_temp || 'Sem nome'}</td>
            <td>${item.telefone_cliente_temp || '-'}</td>
            <td>${nomeServico}</td>
            <td>${nomeProfissional}</td>
            <td>${dataFormatada}</td>
            <td>${horaFormatada}</td>
            <td>
                <button class="delete-btn" onclick="deletarAgendamento(${item.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Tornar a função global para ser acessada pelo onclick do HTML
window.deletarAgendamento = async function(id) {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
        try {
            const { error } = await supabaseClient
                .from('agendamentos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('Agendamento excluído!');
            carregarAgendamentos(); // Recarrega a tabela

        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir agendamento.");
        }
    }
}

// --- CONFIGURAÇÃO MENU (Cópia simplificada para funcionar o toggle lateral) ---
function configurarMenuMobile() {
    const toggleBtn = document.querySelector('.nav-toggle-btn');
    const sideNav = document.querySelector('.side-nav');
    
    if(toggleBtn && sideNav) {
        toggleBtn.addEventListener('click', () => {
            sideNav.classList.toggle('collapsed');
            // Ajuste do ícone
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