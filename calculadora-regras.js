// calculadora-regras.js

function calcularINSS(baseDeCalculo, regras) {
  if (baseDeCalculo > regras.tetoINSS) {
    baseDeCalculo = regras.tetoINSS;
  }
  for (const faixa of regras.tabelaINSS) {
    if (baseDeCalculo <= faixa.ate) {
      return (baseDeCalculo * faixa.aliquota) - faixa.deduzir;
    }
  }
  const ultimaFaixa = regras.tabelaINSS[regras.tabelaINSS.length - 1];
  return (baseDeCalculo * ultimaFaixa.aliquota) - ultimaFaixa.deduzir;
}

function calcularIRRF(baseDeCalculo, dependentes, regras) {
  const deducaoDependentes = dependentes * regras.deducaoPorDependenteIRRF;
  const baseFinal = baseDeCalculo - deducaoDependentes;

  for (const faixa of regras.tabelaIRRF) {
    if (faixa.ate === "acima" || baseFinal <= faixa.ate) {
      return (baseFinal * faixa.aliquota) - faixa.deduzir;
    }
  }
  return 0;
}

export function calcularSalarioCompleto(inputs, regras) {
  const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;

  const valorDia = salario / 30;
  const valorHora = salario / 220;

  // --- Proventos ---
  const vencBase = valorDia * diasTrab;
  const valorHE50 = he50 * valorHora * 1.5;
  const valorHE60 = he60 * valorHora * 1.6;
  const valorHE80 = he80 * valorHora * 1.8;
  const valorHE100 = he100 * valorHora * 2.0;
  const valorHE150 = he150 * valorHora * 2.5;
  const valorNoturno = noturno * valorHora * regras.percentualAdicionalNoturno;
  
  const totalHE = valorHE50 + valorHE60 + valorHE80 + valorHE100 + valorHE150;
  const dsrHE = (diasUteis > 0) ? (totalHE / diasUteis) * domFeriados : 0;
  const dsrNoturno = (diasUteis > 0) ? (valorNoturno / diasUteis) * domFeriados : 0;

  const totalBruto = vencBase + totalHE + valorNoturno + dsrHE + dsrNoturno;

  // --- FGTS ---
  const fgts = totalBruto * 0.08;

  // --- Descontos ---
  const descontoFaltas = faltas * valorDia;
  const descontoAtrasos = atrasos * valorHora;
  const adiantamento = (salario / 30) * diasTrab * regras.percentualAdiantamento;
  
  const inss = calcularINSS(totalBruto, regras);
  const baseIRRF = totalBruto - inss;
  const irrf = calcularIRRF(baseIRRF, dependentes, regras);

  const descontoPlano = regras.planosSESI[plano] || 0;
  const descontoSindicato = sindicato === 'sim' ? regras.valorSindicato : 0;
  const descontoVA = regras.descontoFixoVA;
  const descontoVT = descontarVT ? (salario * regras.percentualVT) : 0;

  const totalDescontos = descontoFaltas + descontoAtrasos + descontoPlano + descontoSindicato + emprestimo + inss + irrf + descontoVA + adiantamento + descontoVT;
  
  const liquido = totalBruto - totalDescontos;

  return {
    proventos: {
      vencBase, valorHE50, valorHE60, valorHE80, valorHE100, valorHE150, valorNoturno, dsrHE, dsrNoturno, totalBruto
    },
    descontos: {
      descontoFaltas, descontoAtrasos, descontoPlano, descontoSindicato, emprestimo, inss, irrf, adiantamento, descontoVA, descontoVT, totalDescontos
    },
    fgts,
    liquido
  };
}
