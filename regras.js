export const regras = {
  "anoVigencia": 2026,
  "salarioMinimo": 1518.00,
  "tetoINSS": 8157.41,
  "percentualAdiantamento": 0.4,
  "percentualAdicionalNoturno": 0.35,
  "descontoFixoVA": 23.97,
  "percentualVT": 0.06,
  "valorSindicato": 47.5,
  
  "descontoSimplificado": 564.80, 
  "deducaoPorDependenteIRRF": 189.59,

  "novaRegra2026": {
    "ativo": true,
    "limiteIsencaoBruto": 5000.00,
    "faixaTransicaoFim": 7350.00,
    "fatorRedutor": 0.133145,
    "parcelaFixaRedutor": 978.61
  },

  "tabelaINSS": [
    { "ate": 1518.00, "aliquota": 0.075, "deduzir": 0 },
    { "ate": 2793.88, "aliquota": 0.09, "deduzir": 22.77 },
    { "ate": 4190.83, "aliquota": 0.12, "deduzir": 106.59 },
    { "ate": 8157.41, "aliquota": 0.14, "deduzir": 190.41 }
  ],
  
  "tabelaIRRF": [
    { "ate": 2259.20, "aliquota": 0, "deduzir": 0 },
    { "ate": 2826.65, "aliquota": 0.075, "deduzir": 169.44 },
    { "ate": 3751.05, "aliquota": 0.15, "deduzir": 381.44 },
    { "ate": 4664.68, "aliquota": 0.225, "deduzir": 662.77 },
    { "ate": "acima", "aliquota": 0.275, "deduzir": 896.00 }
  ],
  
  "planosSESI": {
    "nenhum": 0,
    "basico_individual": 29,
    "basico_familiar": 58,
    "plus_individual": 115,
    "plus_familiar": 180
  }
};
