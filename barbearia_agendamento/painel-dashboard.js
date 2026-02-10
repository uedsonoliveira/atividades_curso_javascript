// --- CONFIGURAÇÃO SUPABASE (Mesma do script.js) ---
const supabaseUrl = 'https://dvaenopuezlimbcebuyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YWVub3B1ZXpsaW1iY2VidXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTE0MTksImV4cCI6MjA4NjA2NzQxOX0.8A0gIQ2KSHM4TSW3QMF8xc3dOVL_PhlB_3jp3P5tXwc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- SEGURANÇA (O PORTEIRO) ---
const adminId = localStorage.getItem('barbearia_admin_id');
const adminSlug = localStorage.getItem('barbearia_slug');

if (!adminId) {
  alert("Você não está logado!");
  window.location.href = 'index.html'; // Chuta para fora
}

// --- VARIÁVEIS DO DASHBOARD ---
const hoje = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  carregarMetricas();
  configurarMenuMobile();

  // carregarGraficos(); // Faremos depois se quiser
  
  configurarLogout();
});

// --- CARREGAR DADOS ---
async function carregarMetricas() {
  try {
    // 1. Agendamentos Hoje
    const { count: countHoje } = await supabaseClient
      .from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .eq('barbearia_id', adminId)
      .eq('data_agendamento', hoje);

    document.getElementById('metric-agendamentos-hoje').textContent = countHoje || 0;

    // 2. Profissionais Ativos
    const { count: countProf } = await supabaseClient
      .from('profissionais')
      .select('*', { count: 'exact', head: true })
      .eq('barbearia_id', adminId);

    document.getElementById('metric-profissionais-ativos').textContent = countProf || 0;

    // 3. Faturamento Hoje (Soma Preços dos Serviços)
    // O Supabase não faz SUM direto via JS facilmente, então buscamos os dados e somamos no JS
    const { data: agendamentosHoje, error } = await supabaseClient
      .from('agendamentos')
      .select(`
                servicos (preco)
            `)
      .eq('barbearia_id', adminId)
      .eq('data_agendamento', hoje)
      .neq('status', 'cancelado'); // Ignora cancelados

    if (agendamentosHoje) {
      let total = 0;
      agendamentosHoje.forEach(item => {
        if (item.servicos) total += item.servicos.preco;
      });
      document.getElementById('metric-faturamento-hoje').textContent = `R$ ${total.toFixed(2)}`;
    }

  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
  }
}

function configurarLogout() {
  const btnSair = document.querySelector('a[href="index.html"]');
  if (btnSair) {
    btnSair.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('barbearia_admin_id');
      localStorage.removeItem('barbearia_slug');
      window.location.href = `index.html?barbearia=${adminSlug}`;
    });
  }
}

// FALTA MENU MOBILE FUNCIONAR
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

// --- LÓGICA DE DARK MODE ---

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