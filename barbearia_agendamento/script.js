// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = 'https://dvaenopuezlimbcebuyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YWVub3B1ZXpsaW1iY2VidXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTE0MTksImV4cCI6MjA4NjA2NzQxOX0.8A0gIQ2KSHM4TSW3QMF8xc3dOVL_PhlB_3jp3P5tXwc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- VARIÁVEIS GLOBAIS ---
let currentBarbeariaId = null;
let currentBarbeariaSlug = null;
let configuracaoSemanal = [];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    currentBarbeariaSlug = params.get('barbearia') || 'barbearia-inova'; 

    await carregarDadosBarbearia(currentBarbeariaSlug);
    // Carrega a configuração de horários ANTES de montar o calendário
    await carregarConfiguracaoHorarios(); 
    
    configurarModalLogin();

    // Inicializar Flatpickr
    flatpickr("#data", {
        dateFormat: "Y-m-d",
        minDate: "today",
        locale: "pt",
        // MUDANÇA: Usamos a configuração do banco para bloquear dias fechados
        disable: [
            function(date) {
                const diaSemana = date.getDay(); // 0=Dom, 6=Sab
                // Se não tiver config (ainda carregando), não bloqueia.
                // Se tiver, verifica se 'aberto' é false.
                const config = configuracaoSemanal.find(c => c.dia_semana === diaSemana);
                return config ? !config.aberto : false;
            }
        ],
        onChange: function(selectedDates, dateStr, instance) {
            carregarHorariosDisponiveis();
        }
    });
});

// --- FUNÇÕES DE CARREGAMENTO (DADOS BÁSICOS) ---

async function carregarDadosBarbearia(slug) {
    try {
        const { data, error } = await supabaseClient
            .from('barbearias')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) throw error;

        if (data) {
            currentBarbeariaId = data.id;

            // Visual
            document.documentElement.style.setProperty('--primary-color', data.cor_primaria);
            const titulos = document.querySelectorAll('.logo-title, .footer-title'); 
            titulos.forEach(el => el.textContent = data.nome);
            const h1Hero = document.querySelector('.hero-content h1');
            if(h1Hero) h1Hero.textContent = `Bem-vindo à ${data.nome}`;
            if (data.logo_url) {
                const logos = document.querySelectorAll('.logo, .about-card-img');
                logos.forEach(img => img.src = data.logo_url);
            }

            carregarServicos(data.id);
        }
    } catch (error) {
        console.error("Erro ao carregar barbearia:", error.message);
        mostrarNotificacao("Erro ao carregar barbearia.", "error");
    }
}

// --- NOVA FUNÇÃO: Busca Tabela de Horários ---
async function carregarConfiguracaoHorarios() {
    try {
        const { data } = await supabaseClient
            .from('configuracao_horarios')
            .select('*')
            .eq('barbearia_id', currentBarbeariaId);
            
        if (data && data.length > 0) {
            configuracaoSemanal = data;
        } else {
            // Fallback se não tiver nada configurado: Seg-Sab 9-19h
            configuracaoSemanal = []; // Deixa vazio para lógica padrão
        }
    } catch (e) { console.error("Erro config horarios:", e); }
}

async function carregarServicos(barbeariaId) {
    const selectServico = document.getElementById('servico-select');
    selectServico.innerHTML = '<option value="">Carregando...</option>';

    const { data, error } = await supabaseClient
        .from('servicos')
        .select('*')
        .eq('barbearia_id', barbeariaId);

    if (error) { return; }

    selectServico.innerHTML = '<option value="">Selecione um serviço</option>';
    data.forEach(servico => {
        const option = document.createElement('option');
        option.value = servico.id;
        option.textContent = `${servico.nome} - R$ ${servico.preco}`;
        option.dataset.duracao = servico.duracao_minutos; 
        selectServico.appendChild(option);
    });

    selectServico.addEventListener('change', (e) => {
        if(e.target.value) {
            carregarProfissionais(e.target.value);
        } else {
            const selProf = document.getElementById('profissional-select');
            selProf.innerHTML = '<option value="">Escolha um serviço primeiro</option>';
            selProf.disabled = true;
        }
    });
}

async function carregarProfissionais(servicoId) {
    const selectProfissional = document.getElementById('profissional-select');
    selectProfissional.innerHTML = '<option value="">Carregando...</option>';
    selectProfissional.disabled = false;

    const { data, error } = await supabaseClient
        .from('profissional_servico')
        .select(`
            profissional_id,
            profissionais (id, nome)
        `)
        .eq('servico_id', servicoId)
        .eq('barbearia_id', currentBarbeariaId);

    if (error) { return; }

    selectProfissional.innerHTML = '<option value="">Selecione o profissional</option>';
    
    const idsAdicionados = new Set();
    data.forEach(item => {
        const prof = item.profissionais;
        if (!idsAdicionados.has(prof.id)) {
            const option = document.createElement('option');
            option.value = prof.id;
            option.textContent = prof.nome;
            selectProfissional.appendChild(option);
            idsAdicionados.add(prof.id);
        }
    });
    
    selectProfissional.addEventListener('change', () => {
        carregarHorariosDisponiveis();
    });
}

// --- LÓGICA INTELIGENTE DE HORÁRIOS ---

// --- LÓGICA PRINCIPAL ALTERADA ---
async function carregarHorariosDisponiveis() {
    const profissionalId = document.getElementById('profissional-select').value;
    const dataSelecionada = document.getElementById('data').value;
    const selectHora = document.getElementById('hora');

    if (!profissionalId || !dataSelecionada) {
        selectHora.innerHTML = '<option value="">Preencha data e profissional</option>'; return;
    }

    selectHora.innerHTML = '<option value="">Carregando...</option>'; selectHora.disabled = true;

    try {
        // 1. Descobrir dia da semana (0-6)
        // OBS: new Date('2023-10-20') pode dar problema de fuso. O ideal é usar getUTCDay ou criar com T00:00
        const dateObj = new Date(dataSelecionada + 'T00:00:00'); 
        const diaSemana = dateObj.getDay();

        // 2. Pegar Configuração desse dia
        const configDia = configuracaoSemanal.find(c => c.dia_semana === diaSemana);
        
        // Se estiver fechado ou não configurado (domingo padrão)
        if (configDia && !configDia.aberto) {
            selectHora.innerHTML = '<option value="">Fechado neste dia</option>';
            return;
        }

        // 3. Definir Inicio e Fim baseado na Config
        // Se não tiver config no banco, usa padrão 09 as 19
        let horaAbertura = configDia ? parseInt(configDia.hora_abertura.split(':')[0]) : 9;
        let horaFechamento = configDia ? parseInt(configDia.hora_fechamento.split(':')[0]) : 19;
        
        // Ajuste fino: Se fecha as 14:00, o ultimo horario é 13:30 (depende da duração, mas simplificamos aqui)

        const ocupados = await buscarHorariosOcupados(dataSelecionada, profissionalId);
        
        selectHora.innerHTML = '<option value="">Selecione um horário</option>';
        
        // Logica de tempo passado (Hoje)
        const hoje = new Date();
        const hojeString = hoje.toISOString().split('T')[0];
        const minutosAtuais = hoje.getHours() * 60 + hoje.getMinutes();

        // LOOP DINÂMICO (Usa horaAbertura e horaFechamento do banco)
        for (let i = horaAbertura; i < horaFechamento; i++) {
            const slots = [`${i.toString().padStart(2, '0')}:00:00`, `${i.toString().padStart(2, '0')}:30:00`];

            slots.forEach(slotTime => {
                // Passado
                if (dataSelecionada === hojeString) {
                    const [h, m] = slotTime.split(':');
                    if ((parseInt(h) * 60 + parseInt(m)) <= minutosAtuais) return;
                }
                // Conflitos
                if (!verificarConflito(slotTime, ocupados)) {
                    const opt = document.createElement('option');
                    opt.value = slotTime; opt.textContent = slotTime.substring(0, 5); selectHora.appendChild(opt);
                }
            });
        }
        
        if (selectHora.options.length === 1) selectHora.innerHTML = '<option value="">Sem horários livres</option>';

    } catch (error) {
        console.error(error); selectHora.innerHTML = '<option value="">Erro</option>';
    } finally {
        selectHora.disabled = false;
    }
}

async function buscarHorariosOcupados(dataSelecionada, profissionalId) {    const { data: agendamentos } = await supabaseClient
        .from('agendamentos')
        .select('hora_agendamento')
        .eq('barbearia_id', currentBarbeariaId)
        .eq('data_agendamento', dataSelecionada)
        .eq('profissional_id', profissionalId)
        .neq('status', 'cancelado');

    const { data: bloqueios } = await supabaseClient
        .from('horarios_bloqueados')
        .select('hora_inicio, hora_fim, profissional_id')
        .eq('barbearia_id', currentBarbeariaId)
        .or(`profissional_id.eq.${profissionalId},profissional_id.is.null`)
        // Filtro de Data (Range)
        .lte('data_bloqueio', dataSelecionada) // data_bloqueio (inicio) <= hoje
        .gte('data_fim', dataSelecionada);     // data_fim >= hoje

    return {
        agendamentos: agendamentos || [],
        bloqueios: bloqueios || []
    };
}

function verificarConflito(slotTime, ocupados) {
    const temAgendamento = ocupados.agendamentos.some(ag => ag.hora_agendamento === slotTime);
    if (temAgendamento) return true;

    const slotDate = new Date(`2000-01-01T${slotTime}`);
    const temBloqueio = ocupados.bloqueios.some(bloqueio => {
        const inicio = new Date(`2000-01-01T${bloqueio.hora_inicio}`);
        const fim = new Date(`2000-01-01T${bloqueio.hora_fim}`);
        return slotDate >= inicio && slotDate < fim;
    });

    if (temBloqueio) return true;
    return false;
}

// --- ENVIO DO AGENDAMENTO ---
document.getElementById('agendamento-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.textContent = "Processando...";
    btnSubmit.disabled = true;

    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const telefoneLimpo = telefone.replace(/\D/g, ''); 

    const servicoId = document.getElementById('servico-select').value;
    const profissionalId = document.getElementById('profissional-select').value;
    const dataAgendamento = document.getElementById('data').value;
    const horaAgendamento = document.getElementById('hora').value;
    const selectServico = document.getElementById('servico-select');
    const duracao = selectServico.options[selectServico.selectedIndex].dataset.duracao || 30;

    const novoAgendamento = {
        barbearia_id: currentBarbeariaId,
        nome_cliente_temp: nome,
        telefone_cliente_temp: telefone,
        servico_id: servicoId,
        profissional_id: profissionalId,
        data_agendamento: dataAgendamento,
        hora_agendamento: horaAgendamento,
        duracao_minutos: duracao,
        status: 'pendente'
    };

    try {
        // Tenta cadastrar cliente se não existir
        const { data: clienteExistente } = await supabaseClient
            .from('clientes')
            .select('id')
            .eq('barbearia_id', currentBarbeariaId)
            .eq('telefone', telefoneLimpo)
            .maybeSingle();

        if (!clienteExistente) {
            await supabaseClient.from('clientes').insert([{
                nome: nome,
                telefone: telefoneLimpo,
                barbearia_id: currentBarbeariaId
            }]);
        }

        const { error } = await supabaseClient.from('agendamentos').insert([novoAgendamento]);
        if (error) throw error;
        
        mostrarNotificacao("Agendamento realizado com sucesso!", "success");
        e.target.reset();
        document.getElementById('profissional-select').innerHTML = '<option value="">Escolha um serviço primeiro</option>';
        document.getElementById('profissional-select').disabled = true;
        document.getElementById('hora').innerHTML = '<option value="">Preencha os campos acima</option>';

    } catch (error) {
        console.error("Erro ao agendar:", error);
        mostrarNotificacao("Erro ao agendar. Tente novamente.", "error");
    } finally {
        btnSubmit.textContent = "Agendar Horário";
        btnSubmit.disabled = false;
    }
});

// --- LOGIN ADMIN ---
function configurarModalLogin() {
    const btnOpenLogin = document.getElementById('open-login-modal-btn');
    const modalLogin = document.getElementById('login-modal');
    const btnCloseLogin = document.getElementById('close-login-modal-btn');
    const overlayLogin = document.getElementById('login-modal-overlay');

    if (btnOpenLogin) {
        btnOpenLogin.addEventListener('click', (e) => {
            e.preventDefault();
            modalLogin.classList.add('active');
            overlayLogin.classList.add('active');
        });
    }

    function fecharModal() {
        modalLogin.classList.remove('active');
        overlayLogin.classList.remove('active');
    }

    if (btnCloseLogin) btnCloseLogin.addEventListener('click', fecharModal);
    if (overlayLogin) overlayLogin.addEventListener('click', fecharModal);

    const formLogin = document.getElementById('login-form');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const senha = document.getElementById('senha').value;
            const btnEntrar = e.target.querySelector('button');
            btnEntrar.textContent = "Verificando...";
            btnEntrar.disabled = true;

            try {
                const { data, error } = await supabaseClient
                    .from('barbearias')
                    .select('id, slug')
                    .eq('slug', currentBarbeariaSlug)
                    .eq('senha_admin', senha)
                    .single();

                if (error || !data) {
                    alert("Senha incorreta!");
                } else {
                    localStorage.setItem('barbearia_admin_id', data.id);
                    localStorage.setItem('barbearia_slug', data.slug);
                    window.location.href = `painel.html?barbearia=${data.slug}`;
                }
            } catch (err) {
                console.error(err);
                alert("Erro ao logar.");
            } finally {
                btnEntrar.textContent = "Entrar";
                btnEntrar.disabled = false;
            }
        });
    }
}

function mostrarNotificacao(mensagem, tipo) {
    const notif = document.getElementById('notification');
    if(notif) {
        notif.textContent = mensagem;
        notif.className = tipo; 
        notif.classList.add('show');
        setTimeout(() => { notif.classList.remove('show'); }, 4000);
    }
}

const hamburger = document.querySelector('.hamburger-menu');
const mobileNav = document.querySelector('.mobile-nav');
const closeBtn = document.querySelector('.close-menu-btn');
if(hamburger) {
    hamburger.addEventListener('click', () => { mobileNav.classList.add('active'); });
}
if(closeBtn) {
    closeBtn.addEventListener('click', () => { mobileNav.classList.remove('active'); });
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
        if(toggleBtn) atualizarIcone(true);
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