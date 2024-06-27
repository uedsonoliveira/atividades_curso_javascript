//Objetivo: Criar um sistema que calcule os juros de uma dívida com base no número de dias em atraso.
//DECLARAÇÃO DE VARIÁVEIS E IMPORTAÇÃO DO MÉTODO READLINE-SYNC(INPUT)
import entradaDados from "readline-sync";

console.log("\n*****APLICAÇÃO DE JUROS*****\n");

let taxaJuros = 0;

//ENTRADA DE DADOS
let valorDivida = entradaDados.question("Informe o valor devido: R$ ");

if(valorDivida > 0){

  let diasVencidos = entradaDados.question("Informe quantos dias se passaram desde o vencimento do boleto: ");

//PROCESSAMENTO DE DADOS
    if(diasVencidos > 0){

        //até 15 dias de atraso 5% de juros
        if(diasVencidos <= 15){
          taxaJuros = 5;
        }
        //acima de 15 dias de atraso 10% de juros
        else{
          taxaJuros = 10;
        }

        let valorJuros = (valorDivida / 100) * taxaJuros;
        let totalDivida = Number(valorDivida) + Number(valorJuros);

//SAÍDA DE DADOS
        console.log("\nValor da Dívida: R$ "+valorDivida);
        console.log("Dias atrasados: "+diasVencidos+" dias")
        console.log("Taxa de Juros: "+taxaJuros+" %");
        console.log("Valor dos juros: R$ "+valorJuros);
        console.log("Valor total com juros: R$ "+totalDivida+"\n");
    }
    else{
      console.log("Sua Dívida está em dia!\n");
    }
}
else{
  console.log("Você não possui nenhum débito.\n")
}