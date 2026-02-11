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
  // --- MÁSCARA DE TELEFONE (Item 2a) ---
  const inputTelefone = document.getElementById('telefone');

  if (inputTelefone) {
    inputTelefone.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
      e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
  }
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
      function (date) {
        const diaSemana = date.getDay(); // 0=Dom, 6=Sab
        // Se não tiver config (ainda carregando), não bloqueia.
        // Se tiver, verifica se 'aberto' é false.
        const config = configuracaoSemanal.find(c => c.dia_semana === diaSemana);
        return config ? !config.aberto : false;
      }
    ],
    onChange: function (selectedDates, dateStr, instance) {
      carregarHorariosDisponiveis();
    }
  });
});

// Variável global para guardar o telefone da barbearia (usado na notificação)
let telefoneBarbearia = '';

async function carregarDadosBarbearia(slug) {
  try {
    // Seleciona TODAS as colunas (*)
    const { data, error } = await supabaseClient
      .from('barbearias')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;

    if (data) {
      currentBarbeariaId = data.id;
      telefoneBarbearia = data.telefone || '';

      // --- 1. CORES E TEXTOS ---
      document.documentElement.style.setProperty('--primary-color', data.cor_primaria);

      // Atualiza Títulos
      document.querySelectorAll('.logo-title, .footer-title').forEach(el => el.textContent = data.nome);
      const h1Hero = document.querySelector('.hero-content h1');
      if (h1Hero) h1Hero.textContent = `Bem-vindo à ${data.nome}`;

      // --- 2. IMAGEM DE FUNDO (HERO) DINÂMICA ---
      // Importante: Mantemos o linear-gradient para o texto ficar legível sobre a foto
      const heroSection = document.getElementById('hero-section');
      if (heroSection && data.fundo_hero_url) {
        heroSection.style.backgroundImage =
          `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${data.fundo_hero_url}')`;
      }

      // --- 3. LOGO DINÂMICA ---
      if (data.logo_url) {
        document.querySelectorAll('.logo').forEach(img => {
          img.src = data.logo_url;
          // Caso a logo quebre, esconde ou põe um placeholder
          img.onerror = () => img.style.display = 'none';
        });
      }

      // --- 4. IMAGENS "SOBRE" E "EQUIPE" ---
      const imgSobre = document.getElementById('img-sobre');
      if (imgSobre && data.foto_sobre_url) imgSobre.src = data.foto_sobre_url;

      const imgEquipe = document.getElementById('img-equipe');
      if (imgEquipe && data.foto_equipe_url) imgEquipe.src = data.foto_equipe_url;

      // --- 5. DEPOIMENTOS DINÂMICOS ---
      if (data.foto_depoimento_1) document.getElementById('img-depoimento-1').src = data.foto_depoimento_1;
      if (data.foto_depoimento_2) document.getElementById('img-depoimento-2').src = data.foto_depoimento_2;
      if (data.foto_depoimento_3) document.getElementById('img-depoimento-3').src = data.foto_depoimento_3;

      // --- 6. MAPA E CONTATOS ---
      const iframeMapa = document.getElementById('iframe-mapa');
      if (iframeMapa && data.iframe_mapa) iframeMapa.src = data.iframe_mapa;

      const txtEnd = document.getElementById('texto-endereco');
      if (txtEnd && data.endereco) txtEnd.textContent = data.endereco;

      // Formatação do Telefone
      const txtTel = document.getElementById('texto-telefone');
      if (txtTel && data.telefone) {
        const telF = data.telefone.replace('55', '');
        const telFormatado = `(${telF.slice(0, 2)}) ${telF.slice(2, 7)}-${telF.slice(7)}`;
        txtTel.textContent = telFormatado;
      }

      const btnFloat = document.getElementById('btn-whatsapp-float');
      if (btnFloat && data.telefone) {
        btnFloat.href = `https://wa.me/${data.telefone}?text=Olá, vim pelo site!`;
      }

      carregarServicos(data.id);
    }
  } catch (error) {
    console.error("Erro ao carregar barbearia:", error.message);
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
    if (e.target.value) {
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

// --- NOVA LÓGICA DE GRADE DE HORÁRIOS (Item 2g) ---

async function carregarHorariosDisponiveis() {
  const profissionalId = document.getElementById('profissional-select').value;
  const dataSelecionada = document.getElementById('data').value;

  const gridHorarios = document.getElementById('horarios-grid');
  const msgHorario = document.getElementById('msg-horario');
  const inputHora = document.getElementById('hora-selecionada');

  // 1. Validação Inicial
  if (!profissionalId || !dataSelecionada) {
    gridHorarios.innerHTML = '';
    msgHorario.style.display = 'block';
    msgHorario.textContent = 'Preencha Data e Profissional para ver os horários.';
    msgHorario.style.color = '#666';
    return;
  }

  // 2. Estado de Carregamento
  gridHorarios.innerHTML = '';
  msgHorario.style.display = 'block';
  msgHorario.textContent = 'Carregando disponibilidade...';
  inputHora.value = ''; // Limpa seleção anterior

  try {
    // 3. Busca Configuração do Dia (Abertura/Fechamento)
    // OBS: Certifique-se que 'configuracaoSemanal' está sendo carregada no DOMContentLoaded igual fizemos no painel
    // Se não tiver, o fallback é 09h as 19h.

    // Pega o dia da semana (0-6)
    // Correção de fuso simples para pegar o dia correto
    const parts = dataSelecionada.split('-');
    const dataObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const diaSemana = dataObj.getDay();

    let horaAbertura = 9;
    let horaFechamento = 19;

    // Tenta pegar da configuração (se você implementou a tabela configuracao_horarios no script.js)
    // Se ainda não implementou no script.js, ele vai usar o padrão 9-19h
    if (typeof configuracaoSemanal !== 'undefined') {
      const config = configuracaoSemanal.find(c => c.dia_semana === diaSemana);
      if (config) {
        if (!config.aberto) {
          msgHorario.textContent = 'Barbearia fechada neste dia.';
          msgHorario.style.color = '#dc2626'; // Vermelho
          return;
        }
        horaAbertura = parseInt(config.hora_abertura.split(':')[0]);
        horaFechamento = parseInt(config.hora_fechamento.split(':')[0]);
      }
    }

    // 4. Busca Ocupados (Supabase)
    const ocupados = await buscarHorariosOcupados(dataSelecionada, profissionalId);

    // 5. Gera os Slots
    const hoje = new Date();
    const hojeString = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
    const minutosAtuais = hoje.getHours() * 60 + hoje.getMinutes();

    let encontrouHorario = false;
    msgHorario.style.display = 'none'; // Esconde msg para mostrar os botões

    for (let i = horaAbertura; i < horaFechamento; i++) {
      const slots = [
        `${i.toString().padStart(2, '0')}:00:00`,
        `${i.toString().padStart(2, '0')}:30:00`
      ];

      slots.forEach(slotTime => {
        // Verificação de Passado
        if (dataSelecionada === hojeString) {
          const [h, m] = slotTime.split(':');
          const slotMinutos = parseInt(h) * 60 + parseInt(m);
          if (slotMinutos <= minutosAtuais) return; // Já passou
        }

        // Verificação de Conflito
        if (!verificarConflito(slotTime, ocupados)) {
          encontrouHorario = true;

          // CRIA O BOTÃO
          const btn = document.createElement('div');
          btn.className = 'time-btn';
          btn.textContent = slotTime.substring(0, 5); // Mostra HH:MM

          // Evento de Clique
          btn.addEventListener('click', () => {
            // Remove seleção dos outros
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
            // Seleciona este
            btn.classList.add('selected');
            // Salva no input hidden
            inputHora.value = slotTime;
          });

          gridHorarios.appendChild(btn);
        }
      });
    }

    if (!encontrouHorario) {
      msgHorario.style.display = 'block';
      msgHorario.textContent = 'Sem horários livres para esta data.';
      msgHorario.style.color = '#dc2626';
    }

  } catch (error) {
    console.error(error);
    msgHorario.style.display = 'block';
    msgHorario.textContent = 'Erro ao carregar horários.';
  }
}

async function buscarHorariosOcupados(dataSelecionada, profissionalId) {
  const { data: agendamentos } = await supabaseClient
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
  const textoOriginal = btnSubmit.textContent;
  btnSubmit.textContent = "Processando...";
  btnSubmit.disabled = true;

  // 1. Captura dos Dados
  const nome = document.getElementById('nome').value;
  const telefone = document.getElementById('telefone').value;

  // IMPORTANTE: Remove tudo que não for número para salvar no banco
  const telefoneLimpo = telefone.replace(/\D/g, '');

  const servicoId = document.getElementById('servico-select').value;
  const profissionalId = document.getElementById('profissional-select').value;
  const dataAgendamento = document.getElementById('data').value;

  // Captura o valor do INPUT HIDDEN (onde a Grade salva o horário)
  const horaAgendamento = document.getElementById('hora-selecionada').value;

  // 2. Validação Extra
  if (!horaAgendamento) {
    mostrarNotificacao("Por favor, selecione um horário na grade.", "error");
    btnSubmit.disabled = false;
    btnSubmit.textContent = textoOriginal;
    return;
  }

  const selectServico = document.getElementById('servico-select');
  const duracao = selectServico.options[selectServico.selectedIndex].dataset.duracao || 30;

  const novoAgendamento = {
    barbearia_id: currentBarbeariaId,
    nome_cliente_temp: nome,
    telefone_cliente_temp: telefoneLimpo, // Salva APENAS números no banco (ex: 11999999999)
    servico_id: servicoId,
    profissional_id: profissionalId,
    data_agendamento: dataAgendamento,
    hora_agendamento: horaAgendamento,
    duracao_minutos: duracao,
    status: 'pendente'
  };

  try {
    // --- TENTATIVA DE CADASTRO AUTOMÁTICO DO CLIENTE ---
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

    // --- SALVAR AGENDAMENTO ---
    const { error } = await supabaseClient.from('agendamentos').insert([novoAgendamento]);

    if (error) throw error;

    // Sucesso!
    mostrarNotificacao("Agendamento realizado com sucesso!", "success");
    // Lógica de Notificação WhatsApp (Item 2c)
    if (telefoneBarbearia) {
      // Monta a mensagem
      const msg = `Olá! Acabei de agendar pelo site:%0A` +
        `*Nome:* ${nome}%0A` +
        `*Data:* ${dataAgendamento.split('-').reverse().join('/')}%0A` +
        `*Horário:* ${horaAgendamento.slice(0, 5)}%0A` +
        `*Serviço:* (ID ${servicoId})%0A` + // O ideal seria pegar o nome do serviço, mas ID serve por enquanto
        `Aguardo confirmação!`;

      // Opção B (Recomendada): Perguntar se quer enviar
      if (confirm("Agendamento salvo! Deseja enviar o comprovante para o WhatsApp da barbearia agora?")) {
        window.open(`https://wa.me/${telefoneBarbearia}?text=${msg}`, '_blank');
      }
    }
    e.target.reset(); // Limpa inputs de texto

    // --- RESET VISUAL DA NOVA INTERFACE ---
    // Reseta selects
    document.getElementById('profissional-select').innerHTML = '<option value="">Escolha um serviço primeiro</option>';
    document.getElementById('profissional-select').disabled = true;

    // Reseta a Grade de Horários
    document.getElementById('horarios-grid').innerHTML = '';
    document.getElementById('msg-horario').style.display = 'block';
    document.getElementById('msg-horario').textContent = 'Preencha Data e Profissional para ver os horários.';
    document.getElementById('hora-selecionada').value = ''; // Limpa o hidden

  } catch (error) {
    console.error("Erro ao agendar:", error);
    mostrarNotificacao("Erro ao agendar. Tente novamente.", "error");
  } finally {
    btnSubmit.textContent = textoOriginal;
    btnSubmit.disabled = false;
  }
});

// Função para formatar telefone visualmente (11999999999 -> (11) 99999-9999)
function formatarTelefoneDisplay(telefone) {
    if (!telefone) return '-';
    // Remove tudo que não é número (caso venha sujo do banco antigo)
    const limpo = telefone.replace(/\D/g, '');
    
    // Aplica a máscara
    if (limpo.length === 11) {
        return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
    } else if (limpo.length === 10) {
        return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
    }
    return telefone; // Retorna original se não tiver tamanho padrão
}

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
  if (notif) {
    notif.textContent = mensagem;
    notif.className = tipo;
    notif.classList.add('show');
    setTimeout(() => { notif.classList.remove('show'); }, 4000);
  }
}

const hamburger = document.querySelector('.hamburger-menu');
const mobileNav = document.querySelector('.mobile-nav');
const closeBtn = document.querySelector('.close-menu-btn');
if (hamburger) {
  hamburger.addEventListener('click', () => { mobileNav.classList.add('active'); });
}
if (closeBtn) {
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

  /* --- LÓGICA DO SLIDER DE DEPOIMENTOS --- */
  let slideIndex = 1;

  // Inicializa o slider mostrando o primeiro
  document.addEventListener('DOMContentLoaded', () => {
    showSlides(slideIndex);
  });

  // Função chamada pelos botões (dots) no HTML onclick="currentSlide(n)"
  function currentSlide(n) {
    showSlides(slideIndex = n);
  }

  // Função principal que troca os slides e as bolinhas
  function showSlides(n) {
    let i;
    const slides = document.getElementsByClassName("testimonial-slide");
    const dots = document.getElementsByClassName("dot");

    if (slides.length === 0) return; // Proteção caso não tenha slides

    // Loop infinito (se passar do último, volta pro 1)
    if (n > slides.length) { slideIndex = 1 }
    if (n < 1) { slideIndex = slides.length }

    // 1. Esconde todos os slides (remove a classe active)
    for (i = 0; i < slides.length; i++) {
      slides[i].classList.remove("active");
      // O CSS já trata o display:none quando não tem 'active'
    }

    // 2. Remove a classe "active" de todas as bolinhas
    for (i = 0; i < dots.length; i++) {
      dots[i].className = dots[i].className.replace(" active", "");
    }

    // 3. Mostra o slide atual e ativa a bolinha correspondente
    slides[slideIndex - 1].classList.add("active");
    dots[slideIndex - 1].className += " active";
  }

  // Opcional: Auto-play (muda sozinho a cada 5 segundos)
  setInterval(() => {
    slideIndex++;
    showSlides(slideIndex);
  }, 5000);
}