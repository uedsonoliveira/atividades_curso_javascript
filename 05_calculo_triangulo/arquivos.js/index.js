//importação do plugin (readline-sync)
import entradaDados from "readline-sync";

console.log("\nÁrea do triângulo:");

//usuário informa a base e a altura através do input
//1-ENTRADA DE DADOS
let base = entradaDados.question("\nInforme a base: ");
let altura = entradaDados.question("\nInforme a altura: ");

//aplicação recebe os dados e faz o cáculo da área
//2-PROCESSAMENTO DE DADOS
let area = (base * altura) / 2;

//resultado será a área do triângulo
//3-SAÍDA DE DADOS
console.log("\nA área do triângulo é: "+area+"\n");