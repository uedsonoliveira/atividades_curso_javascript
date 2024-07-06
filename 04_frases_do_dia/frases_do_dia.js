//Coleção de dados - ARRAY
let frasesDoMes = [
  "Sorte é o resultado de muito esforço, trabalho e dedicação",
  "Imagine uma nova história para sua vida e acredite nela",
  "Pedras no caminho? Eu guardo todas. Um dia vou construir um castelo",
  "Se existe uma forma de fazer melhor, descubra-a",
  "Seja a mudança que você deseja ver no mundo.",
  "Um objetivo nada mais é do que um sonho com limite de tempo",
  "Você precisa fazer aquilo que pensa que não é capaz de fazer",
  "A persistência é o caminho do êxito.",
  "Concentre-se naquilo que você é bom, delegue todo o resto",
  "A amizade duplica as alegrias e divide as tristezas",
  "O que quer que você lute, você fortalece, e o que você resiste, persiste",
  "Lembre-se: sua verdadeira força, vem de dentro",
  "Nada acontece a menos que sonhemos antes",
  "Para quem ama, qualquer sacrifício é alegria",
  "A paz é a única forma de nos sentirmos realmente humanos",
  "Não existe um caminho para a felicidade. A felicidade é o caminho",
  "O amor é a alegria acompanhada da ideia de uma causa exterior",
  "A criatividade é ilimitada, pois a arte só precisa de motivação",
  "Fé, duas letras que podem mudar sua vida, acredite",
  "Que a vontade de vencer seja minha maior motivação",
  "Nunca subestime o poder de sua visão para mudar o seu mundo",
  "Não coloque limites em seus sonhos. Coloque fé",
  "Tenho certeza de que se eu sorrisse menos teria menos amigos",
  "Não espere por uma crise para descobrir o que é importante em sua vida",
  "Quem sorri sem parar não é alegre, é falso",
  "A alegria de fazer o bem é a única felicidade verdadeira",
  "A alegria evita mil males e prolonga a vida",
  "Coloque fé onde falta coragem",
  "Levanta, sacode a poeira e dá a volta por cima",
  "O que vale a pena possuir, vale a pena esperar",
  "A esperança é o sonho do homem acordado"
];

//Date - é usado para trabalhar com datas em JavaScript
//new Date = vai receber o valor da data atual (dia de hoje)
//com formato de dia-mes-ano-hora-minutos-segundos
let dataAtual = new Date();

//getDate = dia do mês de uma data (vai selecionar melhor o new Date)
let numeroEscolhido = dataAtual.getDate();

console.log ("\nNúmero sorteado: "+numeroEscolhido);

//decrementada para iniciar com o número 1 ao invés de 0
//ex: 0=1; 1=2; 2=3 ....
numeroEscolhido--;

//vai receber o valor de uam das frases do array no indice definido pela (getDate)
let fraseDoDia = frasesDoMes[numeroEscolhido];

//será exibida a frase do dia
console.log("\n*****FRASE DO DIA*****\n");
console.log("Mensagem: \n"+fraseDoDia+"\n");

