// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = 'https://dvaenopuezlimbcebuyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YWVub3B1ZXpsaW1iY2VidXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTE0MTksImV4cCI6MjA4NjA2NzQxOX0.8A0gIQ2KSHM4TSW3QMF8xc3dOVL_PhlB_3jp3P5tXwc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const adminId = localStorage.getItem('barbearia_admin_id');
if (!adminId) { alert("Login necessário"); window.location.href = 'index.html'; }

document.addEventListener('DOMContentLoaded', () => {
    carregarSelectProfissionais();
    carregarBloqueios();
    configurarFormulario();
    configurarMenuMobile();
    configurarTogglesUI();
});

// --- 1. CARREGAR SELECT ---
async function carregarSelectProfissionais() {
    const select = document.getElementById('bloqueio-profissional');
    select.innerHTML = '<option value="todos">⛔ Toda a Barbearia (Fechar Loja)</option>';
    try {
        const { data } = await supabaseClient.from('profissionais').select('id, nome').eq('barbearia_id', adminId).order('nome');
        data.forEach(prof => {
            const option = document.createElement('option');
            option.value = prof.id; option.textContent = prof.nome; select.appendChild(option);
        });
    } catch (e) { console.error(e); }
}

// --- 2. LISTAR BLOQUEIOS ---
async function carregarBloqueios() {
    const tbody = document.getElementById('bloqueios-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('horarios_bloqueados')
            .select(`*, profissionais ( nome )`)
            .eq('barbearia_id', adminId)
            .order('data_bloqueio', { ascending: false });

        if (error) throw error;
        renderizarTabela(data);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red">Erro ao buscar.</td></tr>';
    }
}

function renderizarTabela(bloqueios) {
    const tbody = document.getElementById('bloqueios-body');
    tbody.innerHTML = '';

    if (bloqueios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhum bloqueio.</td></tr>'; return;
    }

    bloqueios.forEach(item => {
        const tr = document.createElement('tr');
        
        // Formatar Datas
        const inicio = item.data_bloqueio.split('-').reverse().join('/');
        let dataTexto = inicio;

        // Se data fim existe e é diferente da data inicio, mostra o intervalo
        if (item.data_fim && item.data_fim !== item.data_bloqueio) {
            const fim = item.data_fim.split('-').reverse().join('/');
            dataTexto = `<span style="color:#d35400">De ${inicio} <br> Até ${fim}</span>`;
        }
        
        // Período Horário
        let periodo = `${item.hora_inicio.slice(0,5)} às ${item.hora_fim.slice(0,5)}`;
        if (item.hora_inicio === '00:00:00' && item.hora_fim === '23:59:00') {
            periodo = '<span style="font-weight:bold; color:red">Dia Inteiro</span>';
        }

        const nomeProfissional = item.profissionais ? item.profissionais.nome : '<strong>⛔ Toda a Loja</strong>';

        tr.innerHTML = `
            <td>${nomeProfissional}</td>
            <td>${dataTexto}</td>
            <td>${periodo}</td>
            <td>${item.descricao || '-'}</td>
            <td><button class="delete-btn" onclick="deletarBloqueio(${item.id})"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 3. ADICIONAR BLOQUEIO ---
function configurarFormulario() {
    const form = document.getElementById('bloqueio-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const textoOriginal = btn.textContent;
        btn.textContent = "Salvando..."; btn.disabled = true;

        const profIdValor = document.getElementById('bloqueio-profissional').value;
        const descricao = document.getElementById('bloqueio-descricao').value;
        const dataInicio = document.getElementById('bloqueio-data-inicio').value;
        
        const isRecorrente = document.getElementById('bloqueio-recorrente').checked;
        let dataFim = document.getElementById('bloqueio-data-fim').value;

        // LÓGICA DO INTERVALO:
        // Se NÃO for recorrente (checkbox desmarcado), a data final é igual à inicial (1 dia só).
        // Se FOR recorrente, usa a data final que o usuário escolheu.
        if (!isRecorrente) {
            dataFim = dataInicio;
        } else {
            if (!dataFim) {
                alert("Para repetir, você precisa escolher a Data Final.");
                btn.textContent = textoOriginal; btn.disabled = false; return;
            }
            if (dataFim < dataInicio) {
                alert("A data final não pode ser antes da inicial.");
                btn.textContent = textoOriginal; btn.disabled = false; return;
            }
        }

        const isDiaInteiro = document.getElementById('bloqueio-dia-inteiro').checked;
        let horaInicio, horaFim;
        if (isDiaInteiro) {
            horaInicio = '00:00'; horaFim = '23:59';
        } else {
            horaInicio = document.getElementById('bloqueio-hora-inicio').value;
            horaFim = document.getElementById('bloqueio-hora-fim').value;
            if (!horaInicio || !horaFim) { alert("Preencha as horas."); btn.textContent = textoOriginal; btn.disabled = false; return; }
        }

        const profissionalIdParaBanco = (profIdValor === 'todos') ? null : profIdValor;

        try {
            const { error } = await supabaseClient.from('horarios_bloqueados').insert([{
                barbearia_id: adminId,
                profissional_id: profissionalIdParaBanco,
                descricao: descricao,
                data_bloqueio: dataInicio, // Salva como Inicio
                data_fim: dataFim,         // Salva como Fim
                hora_inicio: horaInicio,
                hora_fim: horaFim,
                recorrente: isRecorrente   // Mantemos o flag só para referência visual
            }]);

            if (error) throw error;
            alert("Bloqueio salvo!");
            form.reset();
            // Reset visual
            document.getElementById('periodo-bloqueio').style.display = 'flex';
            document.getElementById('div-data-fim').style.display = 'none'; // Esconde campo extra
            carregarBloqueios();
        } catch (error) {
            console.error(error); alert("Erro ao salvar.");
        } finally {
            btn.textContent = textoOriginal; btn.disabled = false;
        }
    });
}

// --- 4. EXCLUIR ---
window.deletarBloqueio = async function(id) {
    if (confirm('Remover bloqueio?')) {
        try {
            await supabaseClient.from('horarios_bloqueados').delete().eq('id', id);
            carregarBloqueios();
        } catch (e) { alert("Erro ao excluir."); }
    }
}

// --- UI TOGGLES ---
function configurarTogglesUI() {
    const checkDia = document.getElementById('bloqueio-dia-inteiro');
    const divPeriodo = document.getElementById('periodo-bloqueio');
    const inputInicio = document.getElementById('bloqueio-hora-inicio');
    const inputFim = document.getElementById('bloqueio-hora-fim');

    checkDia.addEventListener('change', (e) => {
        if(e.target.checked) {
            divPeriodo.style.display = 'none'; inputInicio.required = false; inputFim.required = false;
        } else {
            divPeriodo.style.display = 'flex'; inputInicio.required = true; inputFim.required = true;
        }
    });

    // MUDANÇA: Checkbox Repetir agora mostra o campo "Data Fim"
    const checkRecorrente = document.getElementById('bloqueio-recorrente');
    const divDataFim = document.getElementById('div-data-fim');
    const inputDataFim = document.getElementById('bloqueio-data-fim');

    checkRecorrente.addEventListener('change', (e) => {
        if(e.target.checked) {
            divDataFim.style.display = 'flex'; // Aparece o campo
            inputDataFim.required = true;      // Torna obrigatório
        } else {
            divDataFim.style.display = 'none'; // Esconde
            inputDataFim.required = false;     // Tira obrigatoriedade
        }
    });
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