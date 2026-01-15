// calculadora.js

// Função Interna: Calcula o INSS Progressivo
function calcularINSS(baseDeCalculo, regras) {
    if (baseDeCalculo > regras.tetoINSS) baseDeCalculo = regras.tetoINSS;
    
    for (const faixa of regras.tabelaINSS) {
        if (baseDeCalculo <= faixa.ate) {
            return (baseDeCalculo * faixa.aliquota) - faixa.deduzir;
        }
    }
    // Teto
    const ultima = regras.tabelaINSS[regras.tabelaINSS.length - 1];
    return (baseDeCalculo * ultima.aliquota) - ultima.deduzir;
}

// Função Interna: Calcula o IRRF com a Lei 2026
function calcularIRRF(baseBruta, inssCalculado, dependentes, totalBruto, regras) {
    
    // 1. REGRA DE OURO: Isenção pelo Bruto (Até 5k = Zero)
    if (regras.novaRegra2026.ativo && totalBruto <= regras.novaRegra2026.limiteIsencaoBruto) {
        return 0;
    }

    // 2. Cálculo Padrão (Base Legal vs Simplificada)
    const baseLegal = baseBruta - inssCalculado - (dependentes * regras.deducaoPorDependenteIRRF);
    const baseSimplificada = baseBruta - regras.descontoSimplificado;
    
    // Escolhe a menor base (mais vantajosa para o funcionário)
    let baseFinal = Math.min(baseLegal, baseSimplificada);
    if (baseFinal < 0) baseFinal = 0;

    // Aplica na Tabela Progressiva
    let impostoCalculado = 0;
    for (const faixa of regras.tabelaIRRF) {
        if (faixa.ate === "acima" || baseFinal <= faixa.ate) {
            impostoCalculado = (baseFinal * faixa.aliquota) - faixa.deduzir;
            break;
        }
    }

    // 3. REGRA DO REDUTOR (Faixa de Transição 5k - 7.35k)
    // Se o bruto passou de 5k mas está na transição, ganha desconto extra.
    if (regras.novaRegra2026.ativo && 
        totalBruto > regras.novaRegra2026.limiteIsencaoBruto && 
        totalBruto <= regras.novaRegra2026.faixaTransicaoFim) {
        
        // Fórmula: 978.61 - (0.133145 * Bruto)
        const valorRedutor = regras.novaRegra2026.parcelaFixaRedutor - (regras.novaRegra2026.fatorRedutor * totalBruto);
        
        if (valorRedutor > 0) {
            impostoCalculado -= valorRedutor;
        }
    }

    return Math.max(0, impostoCalculado);
}

// Função Principal Exportada
export function calcularSalarioCompleto(inputs, regras) {
    const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;

    // Proteção: Se diasTrab vier vazio, assume 30 para não zerar o cálculo base
    const diasEfetivos = (!diasTrab || diasTrab === 0) ? 30 : diasTrab;

    const valorDia = salario / 30;
    const valorHora = salario / 220;

    // --- PROVENTOS ---
    const vencBase = valorDia * diasEfetivos;
    const valorHE50 = he50 * valorHora * 1.5;
    const valorHE60 = he60 * valorHora * 1.6;
    const valorHE80 = he80 * valorHora * 1.8;
    const valorHE100 = he100 * valorHora * 2.0;
    const valorHE150 = he150 * valorHora * 2.5;
    const valorNoturno = noturno * valorHora * regras.percentualAdicionalNoturno;
    
    const totalHE = valorHE50 + valorHE60 + valorHE80 + valorHE100 + valorHE150;
    // DSR
    const dsrHE = (diasUteis > 0) ? (totalHE / diasUteis) * domFeriados : 0;
    const dsrNoturno = (diasUteis > 0) ? (valorNoturno / diasUteis) * domFeriados : 0;

    const totalBruto = vencBase + totalHE + valorNoturno + dsrHE + dsrNoturno;

    // --- DESCONTOS ---
    const fgts = totalBruto * 0.08;
    const descontoFaltas = faltas * valorDia;
    const descontoAtrasos = atrasos * valorHora;
    const adiantamento = (salario / 30) * diasEfetivos * regras.percentualAdiantamento;
    const descontoVA = regras.descontoFixoVA;
    const descontoVT = descontarVT ? (salario * regras.percentualVT) : 0;
    
    // Impostos
    const inss = calcularINSS(totalBruto, regras);
    // IRRF: Passamos totalBruto para validar a isenção de 5k e o redutor
    const irrf = calcularIRRF(totalBruto, inss, dependentes, totalBruto, regras);

    const descontoPlano = regras.planosSESI[plano] || 0;
    const descontoSindicato = sindicato === 'sim' ? regras.valorSindicato : 0;

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
