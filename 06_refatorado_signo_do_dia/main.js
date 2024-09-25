import colecao_signos from './dados/dados.js';
import retorna_signo from './funcoes/funcoes.js';

let dataApp = new Date ();

const nome_signo = retorna_signo(colecao_signos, dataApp);

console.log("\nO signo do dia é: " + nome_signo +"\n");