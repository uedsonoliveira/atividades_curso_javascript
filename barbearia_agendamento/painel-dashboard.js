// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = 'https://dvaenopuezlimbcebuyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YWVub3B1ZXpsaW1iY2VidXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTE0MTksImV4cCI6MjA4NjA2NzQxOX0.8A0gIQ2KSHM4TSW3QMF8xc3dOVL_PhlB_3jp3P5tXwc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const adminId = localStorage.getItem('barbearia_admin_id');
if (!adminId) { window.location.href = 'index.html'; }

// Variáveis Globais
let periodoAtual = { inicio: '', fim: '' };
let chartFaturamento = null; // Para poder destruir e recriar o gráfico
let chartServicos = null;

document.addEventListener('DOMContentLoaded', () => {
  configurarDarkMode();
  configurarMenuMobile();
  // Inicia com Mês Atual
  setPeriodo('mes_atual');
});

// --- LÓGICA DE DATAS (Igual Fase 1) ---
window.setPeriodo = function (tipo) {
  const hoje = new Date();
  let inicio, fim;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));

  // Identifica botão ativo (lógica simples)
  const btns = document.querySelectorAll('.filter-btn');
  if (tipo === 'hoje') btns[0].classList.add('active');
  if (tipo === 'ontem') btns[1].classList.add('active');
  if (tipo === 'mes_atual') btns[2].classList.add('active');
  if (tipo === 'mes_anterior') btns[3].classList.add('active');

  switch (tipo) {
    case 'hoje':
      inicio = hoje.toISOString().split('T')[0]; fim = inicio; break;
    case 'ontem':
      const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
      inicio = ontem.toISOString().split('T')[0]; fim = inicio; break;
    case 'mes_atual':
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]; break;
    case 'mes_anterior':
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0];
      fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0]; break;
  }
  document.getElementById('data-inicio').value = inicio;
  document.getElementById('data-fim').value = fim;
  periodoAtual = { inicio, fim };
  carregarDadosDashboard();
}

window.aplicarFiltroData = function () {
  const i = document.getElementById('data-inicio').value;
  const f = document.getElementById('data-fim').value;
  if (!i || !f) { alert("Selecione as datas."); return; }
  periodoAtual = { inicio: i, fim: f };
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  carregarDadosDashboard();
}

// --- FUNÇÃO MESTRE: Carrega KPIs e Gráficos ---
async function carregarDadosDashboard() {
  // Feedback visual
  document.getElementById('kpi-faturamento').textContent = '...';
  document.getElementById('kpi-agendamentos').textContent = '...';

  try {
    // Busca TUDO de uma vez (Agendamentos + Serviços)
    const { data: agendamentos, error } = await supabaseClient
      .from('agendamentos')
      .select(`
                id, 
                data_agendamento,
                hora_agendamento,
                status,
                servicos ( nome, preco )
            `)
      .eq('barbearia_id', adminId)
      .gte('data_agendamento', periodoAtual.inicio)
      .lte('data_agendamento', periodoAtual.fim);

    if (error) throw error;

    // Processa os dados na memória do navegador
    processarKPIs(agendamentos);
    processarGraficos(agendamentos);
    renderizarHeatmap(agendamentos);

  } catch (error) {
    console.error("Erro Dashboard:", error);
  }
}

// 1. KPIs (Números do topo)
function processarKPIs(dados) {
  let totalFat = 0;
  let totalAgend = 0;
  let cancelados = 0;

  dados.forEach(item => {
    if (item.status === 'cancelado') {
      cancelados++;
    } else {
      if (item.servicos && item.servicos.preco) totalFat += item.servicos.preco;
      totalAgend++;
    }
  });

  const totalGeral = totalAgend + cancelados;
  const taxa = totalGeral > 0 ? ((cancelados / totalGeral) * 100).toFixed(1) : 0;
  const ticket = totalAgend > 0 ? (totalFat / totalAgend) : 0;

  document.getElementById('kpi-faturamento').textContent = totalFat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById('kpi-agendamentos').textContent = totalAgend;
  document.getElementById('kpi-ticket').textContent = ticket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const elCancel = document.getElementById('kpi-cancelamentos');
  elCancel.textContent = taxa + '%';
  elCancel.style.color = taxa > 15 ? '#dc2626' : '#10b981';

  document.getElementById('trend-faturamento').innerHTML = '<span class="trend-neutral">Atualizado agora</span>';
}

// 2. GRÁFICOS (A novidade!)
function processarGraficos(dados) {
  // A) Preparar dados para o Gráfico de Faturamento (Agrupar por Data)
  const faturamentoPorDia = {};
  const servicosCount = {};

  dados.forEach(item => {
    if (item.status !== 'cancelado' && item.servicos) {
      // Faturamento Dia a Dia
      const data = item.data_agendamento.split('-').reverse().slice(0, 2).join('/'); // dd/mm
      if (!faturamentoPorDia[data]) faturamentoPorDia[data] = 0;
      faturamentoPorDia[data] += item.servicos.preco;

      // Ranking Serviços
      const nomeServico = item.servicos.nome;
      if (!servicosCount[nomeServico]) servicosCount[nomeServico] = 0;
      servicosCount[nomeServico]++;
    }
  });

  // Ordenar Datas (Cronológico)
  // Dica: Como o objeto não garante ordem, o ideal seria criar um array de datas do período, mas vamos simplificar usando as chaves sorteadas
  const labelsDia = Object.keys(faturamentoPorDia).sort(); // Isso ordena dd/mm como string (01/02 vem antes de 05/02). Funciona para mês atual.
  const valoresDia = labelsDia.map(d => faturamentoPorDia[d]);

  // Ordenar Serviços (Do maior para o menor)
  const servicosOrdenados = Object.entries(servicosCount)
    .sort((a, b) => b[1] - a[1]) // Maior valor primeiro
    .slice(0, 5); // Pegar top 5

  const labelsServico = servicosOrdenados.map(s => s[0]);
  const valoresServico = servicosOrdenados.map(s => s[1]);

  renderizarGraficoFaturamento(labelsDia, valoresDia);
  renderizarGraficoServicos(labelsServico, valoresServico);
}

// --- RENDERIZAR CHART.JS ---
function renderizarGraficoFaturamento(labels, data) {
  // --- CORREÇÃO 3A: Cores dos Eixos no Dark Mode ---
    const isDark = document.body.classList.contains('dark-mode');
    const corTexto = isDark ? '#e0e0e0' : '#666666';
    const corGrid = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const ctx = document.getElementById('faturamentoChart').getContext('2d');

  // Destruir anterior se existir
  if (chartFaturamento) chartFaturamento.destroy();

  // Criar Degradê Roxo
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(147, 51, 234, 0.5)'); // Roxo forte
  gradient.addColorStop(1, 'rgba(147, 51, 234, 0.0)'); // Transparente

  chartFaturamento = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Faturamento (R$)',
        data: data,
        borderColor: '#9333ea', // Roxo
        backgroundColor: gradient,
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#9333ea',
        pointRadius: 4,
        fill: true,
        tension: 0.4 // Curva suave
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // Esconde legenda pois só tem 1 dado
        tooltip: {
          callbacks: {
            label: function (context) {
              return parseFloat(context.raw).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
          }
        }
      },
      scales: {
        y: {
            ticks: { color: corTexto },
            grid: { color: corGrid }
        },
        x: {
            ticks: { color: corTexto },
            grid: { display: false }
        }
      }
    }
  });
}

function renderizarGraficoServicos(labels, data) {
  const ctx = document.getElementById('servicosChart').getContext('2d');

  if (chartServicos) chartServicos.destroy();

  chartServicos = new Chart(ctx, {
    type: 'bar', // Barras verticais
    data: {
      labels: labels,
      datasets: [{
        label: 'Qtd.',
        data: data,
        backgroundColor: [
          '#3b82f6', // Azul
          '#10b981', // Verde
          '#f59e0b', // Laranja
          '#ef4444', // Vermelho
          '#8b5cf6'  // Roxo
        ],
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 } // Só números inteiros
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// --- 3. MAPA DE CALOR (HEATMAP) ---
function renderizarHeatmap(dados) {
    console.log(`📊 Iniciando Heatmap com ${dados.length} agendamentos encontrados.`);

    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;

    grid.innerHTML = ''; 

    // 1. Configuração de Dias e Horas
    // Vamos expandir o horário das 07h às 21h para garantir que nada fique de fora
    const horas = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Ajusta o CSS do grid para caber mais colunas de horas
    // 80px para o nome do dia + 1 fração para cada hora
    grid.style.gridTemplateColumns = `80px repeat(${horas.length}, 1fr)`;

    // 2. Inicializa Matriz Zerada
    const matriz = {};
    for (let d = 0; d <= 6; d++) {
        matriz[d] = {};
        horas.forEach(h => matriz[d][h] = 0);
    }

    let maxAgendamentos = 0;

    // 3. Processamento dos Dados
    dados.forEach(item => {
        // Ignora cancelados
        if (item.status === 'cancelado') return;

        try {
            // --- PARSE DA DATA (Seguro contra Fuso Horário) ---
            // Transforma "2024-02-10" direto em dia da semana sem usar new Date() padrão
            // Isso evita que o navegador subtraia horas e mude o dia
            const parts = item.data_agendamento.split('-');
            const ano = parseInt(parts[0]);
            const mes = parseInt(parts[1]) - 1; 
            const dia = parseInt(parts[2]);
            
            // Cria data 'local' pura
            const dataPura = new Date(ano, mes, dia);
            const diaIndex = dataPura.getDay(); // 0=Dom, 1=Seg...

            // --- PARSE DA HORA ---
            // Pega apenas a hora cheia (ex: "14:30:00" vira 14)
            const hora = parseInt(item.hora_agendamento.split(':')[0]);

            // Debug no Console (Mostra os primeiros 5 para não poluir)
            if (maxAgendamentos < 5) {
                console.log(`Processando: ${item.data_agendamento} (${diasSemana[diaIndex]}) às ${hora}h`);
            }

            // --- POPULA A MATRIZ ---
            // Verifica se a hora está dentro do nosso range (7h as 21h)
            if (matriz[diaIndex] && matriz[diaIndex][hora] !== undefined) {
                matriz[diaIndex][hora]++;
                
                // Atualiza o máximo para a cor
                if (matriz[diaIndex][hora] > maxAgendamentos) {
                    maxAgendamentos = matriz[diaIndex][hora];
                }
            } else {
                console.warn(`Horário fora do range: ${hora}h`);
            }

        } catch (err) {
            console.error("Erro ao ler agendamento:", item, err);
        }
    });

    // 4. Renderização HTML
    
    // Canto vazio
    const corner = document.createElement('div');
    grid.appendChild(corner);

    // Cabeçalho das Horas
    horas.forEach(h => {
        const header = document.createElement('div');
        header.className = 'heat-header-col';
        header.textContent = `${h}h`;
        header.style.fontSize = '0.75rem'; // Fonte um pouco menor para caber
        grid.appendChild(header);
    });

    // Linhas dos Dias (De Domingo a Sábado agora, para garantir que tudo apareça)
    // Se quiser esconder Domingo depois, mude let d = 1
    for (let d = 0; d <= 6; d++) {
        
        // Nome do Dia
        const rowLabel = document.createElement('div');
        rowLabel.className = 'heat-header-row';
        rowLabel.textContent = diasSemana[d];
        grid.appendChild(rowLabel);

        // Células
        horas.forEach(h => {
            const count = matriz[d][h];
            const cell = document.createElement('div');
            cell.className = 'heat-cell';

            if (count > 0) {
                const intensidade = maxAgendamentos > 0 ? (count / maxAgendamentos) : 0;
                cell.style.backgroundColor = `rgba(147, 51, 234, ${0.2 + (intensidade * 0.8)})`;
                cell.style.color = intensidade > 0.5 ? '#fff' : '#333';
                cell.style.fontWeight = 'bold';
                cell.textContent = count;
                cell.setAttribute('data-tooltip', `${diasSemana[d]} às ${h}h: ${count} agend.`);
            } else {
                cell.textContent = "-";
                cell.style.color = "#ddd"; // Mais discreto
            }
            grid.appendChild(cell);
        });
    }
}

// Dark Mode / Menu (Igual)
function configurarDarkMode() {
  const btn = document.getElementById('theme-toggle');
  const body = document.body;
  if (localStorage.getItem('tema') === 'dark') { body.classList.add('dark-mode'); if (btn) btn.querySelector('i').classList.replace('fa-moon', 'fa-sun'); }
  if (btn) btn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('tema', isDark ? 'dark' : 'light');
    btn.querySelector('i').classList.toggle('fa-moon', !isDark);
    btn.querySelector('i').classList.toggle('fa-sun', isDark);
  });
}
function configurarMenuMobile() {
  const btn = document.querySelector('.nav-toggle-btn');
  const nav = document.querySelector('.side-nav');
  if (btn && nav) btn.addEventListener('click', () => nav.classList.toggle('collapsed'));
}