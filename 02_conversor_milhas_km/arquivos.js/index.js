//importação do plugin (readline-sync)
import entradaDados from "readline-sync";

console.log("CONVERSOR DE MILHAS PARA KILOMETROS: \n")

//usuário informa o valor em milhas através do input
let milhas = entradaDados.question("Informe o valor em Milhas: ");

//aplicação recebe os dados e converte em km
let kilometros = milhas / 0.62137;

//Resultado será a conversão dos valores de milhas para kilometros
console.log(milhas+" Milha(s) equivale a "+kilometros+" kilometro(s) \n");