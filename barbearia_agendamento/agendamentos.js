// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = 'https://dvaenopuezlimbcebuyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YWVub3B1ZXpsaW1iY2VidXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTE0MTksImV4cCI6MjA4NjA2NzQxOX0.8A0gIQ2KSHM4TSW3QMF8xc3dOVL_PhlB_3jp3P5tXwc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- SEGURANÇA & VARIÁVEIS GLOBAIS ---
// Recupera o ID imediatamente (Síncrono) - Sem necessidade de "gambiarra"
const currentBarbeariaId = localStorage.getItem('barbearia_admin_id');

if (!currentBarbeariaId) {
    alert("Sessão expirada. Por favor, faça login novamente.");
    window.location.href = 'index.html';
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega os Selects do Filtro
    carregarOpcoesFiltro();
    
    // 2. Carrega a Tabela (sem filtros iniciais)
    carregarAgendamentos();
    
    // 3. UI
    configurarMenuMobile();
    configurarDarkMode();
});

// --- FUNÇÕES DE DADOS (SUPABASE) ---

// Função Inteligente: Aceita filtros opcionais
async function carregarAgendamentos(filtros = {}) {
    const tbody = document.getElementById('agendamentos-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Carregando agendamentos...</td></tr>';

    try {
        // 1. Query Base
        let query = supabaseClient
            .from('agendamentos')
            .select(`
                id,
                nome_cliente_temp,
                telefone_cliente_temp,
                data_agendamento,
                hora_agendamento,
                status,
                servicos ( id, nome ),
                profissionais ( id, nome ),
                clientes ( nome, telefone )
            `)
            .eq('barbearia_id', currentBarbeariaId)
            .order('data_agendamento', { ascending: false })
            .order('hora_agendamento', { ascending: true });

        // 2. Aplica Filtros Dinâmicos (Se existirem)
        if (filtros.data) {
            query = query.eq('data_agendamento', filtros.data);
        }
        if (filtros.profissional) {
            query = query.eq('profissional_id', filtros.profissional);
        }
        if (filtros.servico) {
            query = query.eq('servico_id', filtros.servico);
        }

        const { data, error } = await query;

        if (error) throw error;

        renderizarTabela(data);

    } catch (error) {
        console.error("Erro ao carregar:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red">Erro ao carregar dados.</td></tr>';
    }
}

function renderizarTabela(agendamentos) {
    const tbody = document.getElementById('agendamentos-body');
    tbody.innerHTML = '';

    if (!agendamentos || agendamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Nenhum agendamento encontrado.</td></tr>';
        return;
    }

    agendamentos.forEach(item => {
        const tr = document.createElement('tr');
        
        // Data e Hora
        const dataFormatada = item.data_agendamento.split('-').reverse().join('/');
        const horaFormatada = item.hora_agendamento.slice(0, 5);

        // Cliente
        const nomeCliente = item.clientes?.nome || item.nome_cliente_temp || 'Sem nome';
        
        // --- AQUI ESTÁ A MUDANÇA SEGURA ---
        // 1. Pega o telefone bruto
        const telefoneBruto = item.clientes?.telefone || item.telefone_cliente_temp || '';
        // 2. Formata usando a função auxiliar que criamos
        const telCliente = formatarTelefone(telefoneBruto);

        // Relacionamentos
        const nomeServico = item.servicos ? item.servicos.nome : '<span style="color:red">Excluído</span>';
        const nomeProfissional = item.profissionais ? item.profissionais.nome : '<span style="color:red">Excluído</span>';

        // Status Badge
        const statusClass = `status-${item.status || 'pendente'}`;

        tr.innerHTML = `
            <td>${nomeCliente}</td>
            <td>${telCliente}</td> <td>${nomeServico}</td>
            <td>${nomeProfissional}</td>
            <td>${dataFormatada}</td>
            <td>${horaFormatada}</td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-icon btn-edit" onclick="abrirModalEdicao(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deletarAgendamento(${item.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- FUNÇÃO AUXILIAR: Formatar Telefone (Visual) ---
function formatarTelefone(telefone) {
    if (!telefone) return '-';
    
    // Remove tudo que não for número
    const limpo = telefone.replace(/\D/g, '');
    
    // Formato Celular (11 dígitos): (11) 99999-9999
    if (limpo.length === 11) {
        return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
    }
    // Formato Fixo (10 dígitos): (11) 9999-9999
    else if (limpo.length === 10) {
        return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
    }
    
    return telefone; // Retorna original se não bater o tamanho
}

// --- LÓGICA DE FILTROS ---

// Carrega os dados nos <select> do filtro
async function carregarOpcoesFiltro() {
    try {
        // Carrega Profissionais
        const { data: profs } = await supabaseClient
            .from('profissionais')
            .select('id, nome')
            .eq('barbearia_id', currentBarbeariaId);
            
        const selectProf = document.getElementById('filtro-profissional');
        if(selectProf && profs) {
            profs.forEach(p => {
                selectProf.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
            });
        }

        // Carrega Serviços
        const { data: servs } = await supabaseClient
            .from('servicos')
            .select('id, nome')
            .eq('barbearia_id', currentBarbeariaId);

        const selectServ = document.getElementById('filtro-servico');
        if(selectServ && servs) {
            servs.forEach(s => {
                selectServ.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
            });
        }
    } catch (err) {
        console.error("Erro ao carregar filtros:", err);
    }
}

// Funções globais para os botões do HTML chamarem
window.aplicarFiltros = function() {
    const data = document.getElementById('filtro-data').value;
    const profissional = document.getElementById('filtro-profissional').value;
    const servico = document.getElementById('filtro-servico').value;

    // Recarrega a tabela passando o objeto de filtros
    carregarAgendamentos({
        data: data,
        profissional: profissional,
        servico: servico
    });
}

window.limparFiltros = function() {
    // Limpa os inputs
    document.getElementById('filtro-data').value = '';
    document.getElementById('filtro-profissional').value = '';
    document.getElementById('filtro-servico').value = '';

    // Recarrega a tabela pura
    carregarAgendamentos();
}

// --- AÇÕES (EXCLUIR / EDITAR) ---

window.deletarAgendamento = async function(id) {
    if (confirm('Tem certeza que deseja excluir este agendamento permanentemente?')) {
        try {
            const { error } = await supabaseClient
                .from('agendamentos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('Agendamento excluído!');
            // Reaplica os filtros atuais para não perder o contexto (ou recarrega tudo)
            aplicarFiltros(); 

        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir agendamento.");
        }
    }
}

// --- LÓGICA DE EDIÇÃO (Item 1f) ---

// 1. Abrir Modal e Carregar Dados
window.abrirModalEdicao = async function(id) {
    const modal = document.getElementById('modal-edicao');
    
    // Mostra loading enquanto busca os dados
    modal.style.display = 'flex'; 

    try {
        // A. Carrega os Selects do Modal (Profissionais e Serviços)
        // Reutilizamos a lógica dos filtros para preencher o modal
        const selectProf = document.getElementById('edit-profissional');
        const selectServ = document.getElementById('edit-servico');
        
        // Limpa selects para não duplicar
        selectProf.innerHTML = '';
        selectServ.innerHTML = '';

        // Busca listas do banco
        const { data: profs } = await supabaseClient.from('profissionais').select('*').eq('barbearia_id', currentBarbeariaId);
        const { data: servs } = await supabaseClient.from('servicos').select('*').eq('barbearia_id', currentBarbeariaId);

        profs.forEach(p => selectProf.innerHTML += `<option value="${p.id}">${p.nome}</option>`);
        servs.forEach(s => selectServ.innerHTML += `<option value="${s.id}">${s.nome}</option>`);

        // B. Busca os dados do Agendamento Específico
        const { data: agendamento, error } = await supabaseClient
            .from('agendamentos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // C. Preenche os campos
        document.getElementById('edit-id').value = agendamento.id;
        document.getElementById('edit-data').value = agendamento.data_agendamento;
        document.getElementById('edit-hora').value = agendamento.hora_agendamento; // HH:MM:SS
        document.getElementById('edit-status').value = agendamento.status || 'pendente';
        
        // Seleciona as opções corretas nos selects
        selectProf.value = agendamento.profissional_id;
        selectServ.value = agendamento.servico_id;

    } catch (error) {
        console.error("Erro ao abrir edição:", error);
        alert("Erro ao carregar dados para edição.");
        fecharModalEdicao();
    }
}

// 2. Fechar Modal
window.fecharModalEdicao = function() {
    document.getElementById('modal-edicao').style.display = 'none';
}

// 3. Salvar Alterações
window.salvarEdicao = async function() {
    const btnSalvar = document.querySelector('#modal-edicao .btn-primary');
    const textoOriginal = btnSalvar.textContent;
    btnSalvar.textContent = "Salvando...";
    btnSalvar.disabled = true;

    try {
        const id = document.getElementById('edit-id').value;
        
        // Objeto com os dados atualizados
        const atualizacao = {
            data_agendamento: document.getElementById('edit-data').value,
            hora_agendamento: document.getElementById('edit-hora').value,
            profissional_id: document.getElementById('edit-profissional').value,
            servico_id: document.getElementById('edit-servico').value,
            status: document.getElementById('edit-status').value
        };

        // Validação básica
        if(!atualizacao.data_agendamento || !atualizacao.hora_agendamento) {
            alert("Data e Hora são obrigatórios!");
            throw new Error("Campos vazios");
        }

        // Envia para o Supabase
        const { error } = await supabaseClient
            .from('agendamentos')
            .update(atualizacao)
            .eq('id', id);

        if (error) throw error;

        // Sucesso
        alert("Agendamento atualizado com sucesso!");
        fecharModalEdicao();
        
        // Atualiza a tabela (Mantendo os filtros se tiverem ativos, ou recarrega tudo)
        // Se quiser manter os filtros: aplicarFiltros();
        // Se quiser resetar:
        carregarAgendamentos(); 

    } catch (error) {
        console.error("Erro ao salvar:", error);
        if(error.message !== "Campos vazios") alert("Erro ao salvar alterações.");
    } finally {
        btnSalvar.textContent = textoOriginal;
        btnSalvar.disabled = false;
    }
}

// Fechar modal se clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('modal-edicao');
    if (event.target == modal) {
        fecharModalEdicao();
    }
}
// --- UI & UTILITÁRIOS ---

function configurarMenuMobile() {
    const toggleBtn = document.querySelector('.nav-toggle-btn');
    const sideNav = document.querySelector('.side-nav');
    
    if(toggleBtn && sideNav) {
        toggleBtn.addEventListener('click', () => {
            sideNav.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('i');
            if(sideNav.classList.contains('collapsed')) {
                icon.className = 'fas fa-chevron-right';
            } else {
                icon.className = 'fas fa-chevron-left';
            }
        });
    }
}

function configurarDarkMode() {
  const toggleBtn = document.getElementById('theme-toggle');
  const body = document.body;
  const temaSalvo = localStorage.getItem('tema');

  if (temaSalvo === 'dark') {
    body.classList.add('dark-mode');
    if (toggleBtn) atualizarIcone(true);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      body.classList.toggle('dark-mode');
      const isDark = body.classList.contains('dark-mode');
      localStorage.setItem('tema', isDark ? 'dark' : 'light');
      atualizarIcone(isDark);
    });
  }

  function atualizarIcone(isDark) {
    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
  }
}

