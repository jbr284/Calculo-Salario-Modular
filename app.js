// app.js - VERSÃO BACKUP ATUALIZADA 2026 (ESTÁVEL) 🚀

// --- 1. REGRAS (LEI 15.270 - JANEIRO 2026) ---
const regrasCalculo = {
  "anoVigencia": 2026,
  "salarioMinimo": 1518.00,
  "tetoINSS": 8157.41,
  "percentualAdiantamento": 0.4,
  "percentualAdicionalNoturno": 0.35,
  "descontoFixoVA": 23.97,
  "percentualVT": 0.06,
  "valorSindicato": 47.5,
  
  // Novos Parâmetros 2026
  "deducaoPorDependenteIRRF": 189.59,
  "descontoSimplificado": 564.80, 
  
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
    { "ate": 999999, "aliquota": 0.275, "deduzir": 896.00 }
  ],
  "planosSESI": {
    "nenhum": 0,
    "basico_individual": 29,
    "basico_familiar": 58,
    "plus_individual": 115,
    "plus_familiar": 180
  }
};

// --- 2. LÓGICA MATEMÁTICA ---

function calcularINSS(baseDeCalculo, regras) {
  if (baseDeCalculo > regras.tetoINSS) baseDeCalculo = regras.tetoINSS;
  for (const faixa of regras.tabelaINSS) {
    if (baseDeCalculo <= faixa.ate) return (baseDeCalculo * faixa.aliquota) - faixa.deduzir;
  }
  const ultima = regras.tabelaINSS[regras.tabelaINSS.length - 1];
  return (baseDeCalculo * ultima.aliquota) - ultima.deduzir;
}

// ATUALIZADO: Recebe totalBruto para aplicar a regra de 2026 corretamente
function calcularIRRF(baseBruta, inss, dependentes, totalBruto, regras) {
    // 1. Isenção pelo Bruto (Lei 15.270)
    if (regras.novaRegra2026.ativo && totalBruto <= regras.novaRegra2026.limiteIsencaoBruto) {
        return 0; // Ganha até 5k? Zero imposto.
    }

    // 2. Imposto Normal (Melhor Base: Legal vs Simplificado)
    const baseLegal = baseBruta - inss - (dependentes * regras.deducaoPorDependenteIRRF);
    const baseSimples = baseBruta - regras.descontoSimplificado;
    
    let baseFinal = Math.min(baseLegal, baseSimples);
    if (baseFinal < 0) baseFinal = 0;

    let imposto = 0;
    for (const f of regras.tabelaIRRF) {
        if (baseFinal <= f.ate) {
            imposto = (baseFinal * f.aliquota) - f.deduzir;
            break;
        }
    }

    // 3. Aplicação do Redutor (Faixa de Transição 5k - 7.35k)
    if (regras.novaRegra2026.ativo && 
        totalBruto > regras.novaRegra2026.limiteIsencaoBruto && 
        totalBruto <= regras.novaRegra2026.faixaTransicaoFim) {
        
        const redutor = regras.novaRegra2026.parcelaFixaRedutor - (regras.novaRegra2026.fatorRedutor * totalBruto);
        if (redutor > 0) imposto -= redutor;
    }

    return Math.max(0, imposto);
}

function calcularSalarioCompleto(inputs, regras) {
  const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;

  // Proteção para não zerar cálculo se o campo vier vazio
  const diasEfetivos = (diasTrab === "" || diasTrab === 0) ? 30 : diasTrab;

  const valorDia = salario / 30;
  const valorHora = salario / 220;

  // Proventos
  const vencBase = valorDia * diasEfetivos;
  const valorHE50 = he50 * valorHora * 1.5;
  const valorHE60 = he60 * valorHora * 1.6;
  const valorHE80 = he80 * valorHora * 1.8;
  const valorHE100 = he100 * valorHora * 2.0;
  const valorHE150 = he150 * valorHora * 2.5;
  const valorNoturno = noturno * valorHora * regras.percentualAdicionalNoturno;
  
  const totalHE = valorHE50 + valorHE60 + valorHE80 + valorHE100 + valorHE150;
  const dsrHE = (diasUteis > 0) ? (totalHE / diasUteis) * domFeriados : 0;
  const dsrNoturno = (diasUteis > 0) ? (valorNoturno / diasUteis) * domFeriados : 0;
  
  // Total Bruto (Renda Tributável para fins de isenção 2026)
  const totalBruto = vencBase + totalHE + valorNoturno + dsrHE + dsrNoturno;

  // Descontos
  const fgts = totalBruto * 0.08;
  const descontoFaltas = faltas * valorDia;
  const descontoAtrasos = atrasos * valorHora;
  const adiantamento = (salario / 30) * diasEfetivos * regras.percentualAdiantamento;
  const descontoVA = regras.descontoFixoVA;
  const descontoVT = descontarVT ? (salario * regras.percentualVT) : 0;
  
  const inss = calcularINSS(totalBruto, regras);
  
  // AQUI MUDOU: Passamos totalBruto e o próprio INSS calculado para a função IRRF
  const irrf = calcularIRRF(totalBruto, inss, dependentes, totalBruto, regras);

  const descontoPlano = regras.planosSESI[plano] || 0;
  const descontoSindicato = sindicato === 'sim' ? regras.valorSindicato : 0;

  const totalDescontos = descontoFaltas + descontoAtrasos + descontoPlano + descontoSindicato + emprestimo + inss + irrf + descontoVA + adiantamento + descontoVT;
  const liquido = totalBruto - totalDescontos;

  return {
    proventos: { vencBase, valorHE50, valorHE60, valorHE80, valorHE100, valorHE150, valorNoturno, dsrHE, dsrNoturno, totalBruto },
    descontos: { descontoFaltas, descontoAtrasos, descontoPlano, descontoSindicato, emprestimo, inss, irrf, adiantamento, descontoVA, descontoVT, totalDescontos },
    fgts, liquido
  };
}

// --- 3. INTERFACE E EVENTOS ---
const formView = document.getElementById('form-view');
const resultView = document.getElementById('result-view');
const resultContainer = document.getElementById('resultado-container');
const mesReferenciaInput = document.getElementById('mesReferencia');
const diasTrabInput = document.getElementById('diasTrab');
const inicioFeriasInput = document.getElementById('inicioFerias');
const qtdDiasFeriasInput = document.getElementById('qtdDiasFerias');
const feedbackFerias = document.getElementById('feedback-ferias');
const boxCalculoFerias = document.getElementById('box-calculo-ferias');
const colQtd = document.getElementById('col-qtd');
const lblData = document.getElementById('lbl-data-ferias');

function mostrarResultados() {
    formView.classList.add('hidden');
    resultView.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function mostrarFormulario() {
    resultView.classList.add('hidden');
    formView.classList.remove('hidden');
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Leitura Segura de Inputs (evita NaN que quebra o cálculo)
function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const val = parseFloat(el.value);
    return isNaN(val) ? 0 : val;
}

function renderizarResultados(resultado) {
    const p = resultado.proventos;
    const d = resultado.descontos;
    const row = (label, val) => val > 0.01 ? `<tr><td>${label}</td><td class="valor">${formatarMoeda(val)}</td></tr>` : '';

    let htmlProventos = '';
    htmlProventos += row('Salário Base Proporcional', p.vencBase);
    htmlProventos += row('Hora Extra 50%', p.valorHE50);
    htmlProventos += row('Hora Extra 60%', p.valorHE60);
    htmlProventos += row('Hora Extra 80%', p.valorHE80);
    htmlProventos += row('Hora Extra 100%', p.valorHE100);
    htmlProventos += row('Hora Extra 150%', p.valorHE150);
    htmlProventos += row('Adicional Noturno', p.valorNoturno);
    htmlProventos += row('DSR (HE/Noturno)', p.dsrHE + p.dsrNoturno);

    let htmlDescontos = '';
    htmlDescontos += row('Faltas (dias)', d.descontoFaltas);
    htmlDescontos += row('Atrasos (horas)', d.descontoAtrasos);
    htmlDescontos += row('Adiantamento Salarial', d.adiantamento);
    htmlDescontos += row('Convênio SESI', d.descontoPlano);
    htmlDescontos += row('Sindicato', d.descontoSindicato);
    htmlDescontos += row('Empréstimo', d.emprestimo);
    htmlDescontos += row('Vale Alimentação', d.descontoVA);
    htmlDescontos += row('Vale Transporte', d.descontoVT);
    htmlDescontos += `<tr><td>INSS</td><td class="valor">${formatarMoeda(d.inss)}</td></tr>`;
    
    // Destaque Especial IRRF 2026
    const labelIR = d.irrf === 0 ? "IRRF (Isento Lei 15.270)" : "IRRF (Lei 15.270)";
    htmlDescontos += `<tr><td>${labelIR}</td><td class="valor">${formatarMoeda(d.irrf)}</td></tr>`;

    resultContainer.innerHTML = `
        <h2>Resultado do Cálculo (2026)</h2>
        <table class="result-table">
            <thead><tr><th>Descrição</th><th>Valor</th></tr></thead>
            <tbody>
                <tr class="section-header"><td colspan="2">Proventos</td></tr>
                ${htmlProventos}
                <tr class="summary-row"><td>Total Bruto</td><td class="valor">${formatarMoeda(p.totalBruto)}</td></tr>
                <tr class="section-header"><td colspan="2">Descontos</td></tr>
                ${htmlDescontos}
                <tr class="summary-row"><td>Total de Descontos</td><td class="valor">${formatarMoeda(d.totalDescontos)}</td></tr>
                <tr class="section-header"><td colspan="2">Resumo Final</td></tr>
                <tr class="final-result-main"><td>Salário Líquido (Pagamento Final)</td><td class="valor">${formatarMoeda(resultado.liquido)}</td></tr>
            </tbody>
        </table>
    `;
    mostrarResultados();
}

// --- CONTROLES DE TELA ---
function handleCalcular() {
    const inputs = {
        salario: getVal('salario'),
        diasTrab: getVal('diasTrab'),
        dependentes: getVal('dependentes'),
        faltas: getVal('faltas'),
        atrasos: getVal('atrasos'),
        he50: getVal('he50'),
        he60: getVal('he60'),
        he80: getVal('he80'),
        he100: getVal('he100'),
        he150: getVal('he150'),
        noturno: getVal('noturno'),
        emprestimo: getVal('emprestimo'),
        diasUteis: getVal('diasUteis'),
        domFeriados: getVal('domFeriados'),
        plano: document.getElementById('plano').value,
        sindicato: document.getElementById('sindicato').value,
        descontarVT: document.getElementById('descontar_vt').value === 'sim'
    };
    
    const resultado = calcularSalarioCompleto(inputs, regrasCalculo);
    renderizarResultados(resultado);
}

// Salvar/Restaurar
function salvarDadosFixos() {
    const dados = {
        salario: document.getElementById('salario').value,
        dependentes: document.getElementById('dependentes').value,
        plano: document.getElementById('plano').value,
        sindicato: document.getElementById('sindicato').value
    };
    localStorage.setItem('dadosFixosCalc', JSON.stringify(dados));
    alert('Dados salvos!');
}

function restaurarDadosFixos() {
    const dadosSalvos = JSON.parse(localStorage.getItem('dadosFixosCalc'));
    if (dadosSalvos) {
        if(dadosSalvos.salario) document.getElementById('salario').value = dadosSalvos.salario;
        if(dadosSalvos.dependentes) document.getElementById('dependentes').value = dadosSalvos.dependentes;
        if(dadosSalvos.plano) document.getElementById('plano').value = dadosSalvos.plano;
        if(dadosSalvos.sindicato) document.getElementById('sindicato').value = dadosSalvos.sindicato;
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Listeners dos Botões
    document.getElementById('btn-calcular').addEventListener('click', handleCalcular);
    document.getElementById('btn-voltar').addEventListener('click', mostrarFormulario);
    document.getElementById('btn-salvar').addEventListener('click', salvarDadosFixos);
    
    // Listeners UI
    document.querySelectorAll('input[name="tipoDias"]').forEach(r => r.addEventListener('change', alternarModoDias));
    inicioFeriasInput.addEventListener('change', calcularDiasProporcionaisFerias);
    qtdDiasFeriasInput.addEventListener('input', calcularDiasProporcionaisFerias);
    
    // Auto-preenchimento horas
    document.querySelectorAll('.hora-conversivel').forEach(campo => {
        campo.addEventListener('blur', function() {
            let valor = this.value.replace('h', ':').replace(',', '.').trim();
            if (valor.includes(':')) {
                const [h, m] = valor.split(':').map(Number);
                this.value = (h + (m/60)).toFixed(2);
            } else if (valor) {
                this.value = parseFloat(valor).toFixed(2);
            }
        });
    });

    restaurarDadosFixos();
    alternarModoDias();
    diasTrabInput.value = 30; // Garante inicio correto
    
    // Service Worker (Opcional - mas bom ter)
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
});

// Funções de Férias (Mantidas do Backup)
function alternarModoDias() {
    const opcao = document.querySelector('input[name="tipoDias"]:checked');
    if(!opcao) return;
    
    if (opcao.value === 'completo') {
        boxCalculoFerias.classList.add('hidden');
        diasTrabInput.value = 30;
    } else {
        boxCalculoFerias.classList.remove('hidden');
        if (opcao.value === 'retorno_ferias') {
            colQtd.classList.add('hidden'); 
            lblData.textContent = "Dia do Retorno"; 
        } else {
            colQtd.classList.remove('hidden'); 
            lblData.textContent = "Dia de Início"; 
        }
        calcularDiasProporcionaisFerias();
    }
}

function calcularDiasProporcionaisFerias() {
    const mesRefStr = mesReferenciaInput.value; 
    const diaSel = parseInt(inicioFeriasInput.value); 
    const opcao = document.querySelector('input[name="tipoDias"]:checked').value;

    if (!mesRefStr || !diaSel) return;

    const [ano, mes] = mesRefStr.split('-').map(Number);
    const ultimoDiaMes = new Date(ano, mes, 0).getDate();
    const diaValidado = Math.min(diaSel, ultimoDiaMes);
    
    let diasTrabalhados = 30;
    if (opcao === 'retorno_ferias') {
        diasTrabalhados = 30 - (diaValidado - 1);
    } else if (opcao === 'saida_ferias') {
        diasTrabalhados = diaValidado - 1; 
    }
    diasTrabInput.value = Math.max(0, Math.min(30, diasTrabalhados));
}
