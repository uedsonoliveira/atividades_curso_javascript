// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = 'https://dvaenopuezlimbcebuyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YWVub3B1ZXpsaW1iY2VidXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTE0MTksImV4cCI6MjA4NjA2NzQxOX0.8A0gIQ2KSHM4TSW3QMF8xc3dOVL_PhlB_3jp3P5tXwc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const adminId = localStorage.getItem('barbearia_admin_id');
if (!adminId) { alert("Login necessário"); window.location.href = 'index.html'; }

const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

document.addEventListener('DOMContentLoaded', () => {
    carregarConfiguracao();
    configurarMenuMobile();
    
    document.getElementById('config-horarios-form').addEventListener('submit', salvarConfiguracao);
});

async function carregarConfiguracao() {
    const container = document.getElementById('days-container');
    container.innerHTML = 'Carregando...';

    try {
        // Busca configuração existente
        const { data, error } = await supabaseClient
            .from('configuracao_horarios')
            .select('*')
            .eq('barbearia_id', adminId)
            .order('dia_semana');

        if (error) throw error;

        container.innerHTML = ''; // Limpa

        // Gera as 7 linhas (0 a 6)
        for (let i = 0; i < 7; i++) {
            // Tenta achar a config desse dia no banco, senão usa padrão
            const configDia = data.find(d => d.dia_semana === i) || {
                aberto: (i !== 0), // Domingo fechado por padrão
                hora_abertura: '09:00:00',
                hora_fechamento: '19:00:00'
            };

            const html = `
                <div class="day-row ${configDia.aberto ? '' : 'closed'}" id="row-${i}">
                    <div class="day-name">${diasSemana[i]}</div>
                    
                    <div class="day-toggle">
                        <label>
                            <input type="checkbox" id="aberto-${i}" ${configDia.aberto ? 'checked' : ''} onchange="toggleDia(${i})"> 
                            <span id="status-${i}">${configDia.aberto ? 'Aberto' : 'Fechado'}</span>
                        </label>
                    </div>

                    <div class="day-times" id="times-${i}" style="display: ${configDia.aberto ? 'flex' : 'none'}">
                        <input type="time" id="inicio-${i}" value="${configDia.hora_abertura.slice(0,5)}">
                        <span>até</span>
                        <input type="time" id="fim-${i}" value="${configDia.hora_fechamento.slice(0,5)}">
                    </div>
                </div>
            `;
            container.innerHTML += html;
        }

    } catch (error) {
        console.error(error);
        container.innerHTML = 'Erro ao carregar configurações.';
    }
}

// Função visual para mostrar/esconder horários
window.toggleDia = function(diaIndex) {
    const checkbox = document.getElementById(`aberto-${diaIndex}`);
    const row = document.getElementById(`row-${diaIndex}`);
    const timesDiv = document.getElementById(`times-${diaIndex}`);
    const statusSpan = document.getElementById(`status-${diaIndex}`);

    if (checkbox.checked) {
        row.classList.remove('closed');
        timesDiv.style.display = 'flex';
        statusSpan.textContent = 'Aberto';
    } else {
        row.classList.add('closed');
        timesDiv.style.display = 'none';
        statusSpan.textContent = 'Fechado';
    }
}

async function salvarConfiguracao(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Salvando..."; btn.disabled = true;

    try {
        const updates = [];
        
        for (let i = 0; i < 7; i++) {
            const aberto = document.getElementById(`aberto-${i}`).checked;
            const abertura = document.getElementById(`inicio-${i}`).value;
            const fechamento = document.getElementById(`fim-${i}`).value;

            updates.push({
                barbearia_id: adminId,
                dia_semana: i,
                aberto: aberto,
                hora_abertura: abertura,
                hora_fechamento: fechamento
            });
        }

        // Upsert: Atualiza se existir, cria se não existir (baseado no UNIQUE constraint)
        const { error } = await supabaseClient
            .from('configuracao_horarios')
            .upsert(updates, { onConflict: 'barbearia_id, dia_semana' });

        if (error) throw error;

        alert('Horários atualizados com sucesso!');

    } catch (error) {
        console.error(error);
        alert('Erro ao salvar.');
    } finally {
        btn.textContent = "Salvar Configurações"; btn.disabled = false;
    }
}

function configurarMenuMobile() {
    const btn = document.querySelector('.nav-toggle-btn');
    const nav = document.querySelector('.side-nav');
    if(btn && nav) btn.addEventListener('click', () => nav.classList.toggle('collapsed'));
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