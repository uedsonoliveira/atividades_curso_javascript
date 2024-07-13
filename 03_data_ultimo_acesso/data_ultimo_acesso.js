//Armazena a data de último acesso do usuário
const dataUltimoAcesso = new Date ('2024/07/12 16:00:00');
//Armazena a data atual do sistema
const dataAtual = new Date ();

//Método getHours para armazenar a hora atual do sistema na variáverl hora
const hora = dataAtual.getHours();

//teremos que concatenar os valores nas mensagens apropriadas.
let msg = "";

////Primeiro passo será cumprimentar baseado na hora se é dia, tarde ou noite
if (hora < 6 || hora >= 18){
  msg = '\nBoa Noite!\n';
}
else if (hora >= 6 && hora < 12){
  msg = '\nBom Dia!\n';
}
else{
  msg = '\nBoa Tarde!\n';
}

//Método getTime para armazenas o tempo nas variáveis (tempoUltimoAcesso) e (tempoAtual)
const tempoUltimoAcesso = dataUltimoAcesso.getTime();
const tempoAtual = dataAtual.getTime();

//Cálculo da diferença(em milissegundos) entre a data atual e o tempo do último acesso
diferencaTempo = tempoAtual - tempoUltimoAcesso;

//constantes para representar um período específico para cada condição
const milissegundosHora = 1000 * 60 * 60;
const milissegundosDia = milissegundosHora * 24;
const milissegundosSemana = milissegundosDia * 7;
const milissegundosMes = milissegundosDia * 30.44;// dias do mes em milissegundos
const milissegundosAno = milissegundosDia * 365.25;//dias do ano considerando um ano bissexto

//O segundo passo é verificar quanto tempo se passou desde o último acesso do usuário.
//Para cada condição, calculei o número correspondente (anos, meses, semanas, dias e horas) dividindo diferencaTempo pelo valor de milissegundos do respectivo período.
//Utilizei Math.floor() para arredondar os valores de anos, meses, semanas, dias e horas para números inteiros.
if(diferencaTempo >= milissegundosAno){
  const anos = diferencaTempo / milissegundosAno;
  msg += "Você está ausente há " +Math.floor(anos)+ " ANO(s) sem acessar o sistema\n";
}
else if(diferencaTempo >= milissegundosMes){
  const meses = diferencaTempo / milissegundosMes;
  msg += "Você está ausente há " +Math.floor(meses)+ " MESE(s) sem acessar o sistema\n"
}
else if(diferencaTempo >= milissegundosSemana){
  const semanas = diferencaTempo / milissegundosSemana;
  msg += "Você está ausente há " +Math.floor(semanas)+ " SEMANA(s) sem acessar o sistema.\n";
}
else if(diferencaTempo >= milissegundosDia){
  const dias = diferencaTempo / milissegundosDia;
  msg += "Você está ausente há " +Math.floor(dias)+ " DIA(s) sem acessar o sistema.\n"
}
else if(diferencaTempo >= milissegundosHora){
  const horas = diferencaTempo / milissegundosHora;
  msg += "Você está ausente há " +Math.floor(horas)+ " HORAS sem acessar o sistema.\n"
}
else{
  msg += "Que bom que ainda está conosco!\n"
}

console.log(msg);



