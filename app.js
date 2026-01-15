// app.js - VERSÃO BLINDADA: Lógica Híbrida (Saída Pura vs Sanduíche)

// --- 1. DADOS E REGRAS ---
const regrasCalculo = {
  "anoVigencia": 2025,
  "salarioMinimo": 1518.00,
  "tetoINSS": 8157.41,
  "percentualAdiantamento": 0.4,
  "percentualAdicionalNoturno": 0.35,
  "descontoFixoVA": 23.97,
  "percentualVT": 0.06,
  "valorSindicato": 47.5,
  "deducaoPorDependenteIRRF": 189.59,
  "tabelaINSS": [
    { "ate": 1518.00, "aliquota": 0.075, "deduzir": 0 },
    { "ate": 2793.88, "aliquota": 0.09, "deduzir": 22.77 },
    { "ate": 4190.83, "aliquota": 0.12, "deduzir": 106.59 },
    { "ate": 8157.41, "aliquota": 0.14, "deduzir": 190.41 }
  ],
  "tabelaIRRF": [
    { "ate": 2428.80, "aliquota": 0, "deduzir": 0 },
    { "ate": 2826.65, "aliquota": 0.075, "deduzir": 182.16 },
    { "ate": 3751.05, "aliquota": 0.15, "deduzir": 394.16 },
    { "ate": 4664.68, "aliquota": 0.225, "deduzir": 675.49 },
    { "ate": "acima", "aliquota": 0.275, "deduzir": 908.73 }
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

function calcularIRRF(baseDeCalculo, dependentes, regras) {
  const deducao = dependentes * regras.deducaoPorDependenteIRRF;
  const baseFinal = baseDeCalculo - deducao;
  for (const faixa of regras.tabelaIRRF) {
    if (faixa.ate === "acima" || baseFinal <= faixa.ate) return (baseFinal * faixa.aliquota) - faixa.deduzir;
  }
  return 0;
}

function calcularSalarioCompleto(inputs, regras) {
  const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;

  const valorDia = salario / 30;
  const valorHora = salario / 220;

  // Proventos
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

  // Descontos
  const fgts = totalBruto * 0.08;
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

// Seletores de Férias
const boxCalculoFerias = document.getElementById('box-calculo-ferias');
const diasTrabInput = document.getElementById('diasTrab');
const inicioFeriasInput = document.getElementById('inicioFerias'); // Select (1-31)
const qtdDiasFeriasInput = document.getElementById('qtdDiasFerias');
const feedbackFerias = document.getElementById('feedback-ferias');

// Elementos de UI
const colData = document.getElementById('col-data');
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

function renderizarResultados(resultado) {
    const { proventos, descontos, liquido, fgts } = resultado;
    const liquidoMensal = liquido + descontos.adiantamento;
    const row = (label, val) => val > 0 ? `<tr><td>${label}</td><td class="valor">${formatarMoeda(val)}</td></tr>` : '';

    let htmlProventos = '';
    htmlProventos += row('Salário Base Proporcional', proventos.vencBase);
    htmlProventos += row('Hora Extra 50%', proventos.valorHE50);
    htmlProventos += row('Hora Extra 60%', proventos.valorHE60);
    htmlProventos += row('Hora Extra 80%', proventos.valorHE80);
    htmlProventos += row('Hora Extra 100%', proventos.valorHE100);
    htmlProventos += row('Hora Extra 150%', proventos.valorHE150);
    htmlProventos += row('Adicional Noturno', proventos.valorNoturno);
    htmlProventos += row('DSR sobre Horas Extras', proventos.dsrHE);
    htmlProventos += row('DSR sobre Adicional Noturno', proventos.dsrNoturno);

    let htmlDescontos = '';
    htmlDescontos += row('Faltas (dias)', descontos.descontoFaltas);
    htmlDescontos += row('Atrasos (horas)', descontos.descontoAtrasos);
    htmlDescontos += row('Adiantamento Salarial', descontos.adiantamento);
    htmlDescontos += row('Convênio SESI', descontos.descontoPlano);
    htmlDescontos += row('Sindicato', descontos.descontoSindicato);
    htmlDescontos += row('Empréstimo', descontos.emprestimo);
    htmlDescontos += row('Vale Alimentação', descontos.descontoVA);
    htmlDescontos += row('Vale Transporte (6%)', descontos.descontoVT);
    htmlDescontos += `<tr><td>INSS</td><td class="valor">${formatarMoeda(descontos.inss)}</td></tr>`;
    htmlDescontos += `<tr><td>IRRF</td><td class="valor">${formatarMoeda(descontos.irrf)}</td></tr>`;

    resultContainer.innerHTML = `
        <h2>Resultado do Cálculo</h2>
        <table class="result-table">
            <thead><tr><th>Descrição</th><th>Valor</th></tr></thead>
            <tbody>
                <tr class="section-header"><td colspan="2">Proventos</td></tr>
                ${htmlProventos}
                <tr class="summary-row"><td>Total Bruto</td><td class="valor">${formatarMoeda(proventos.totalBruto)}</td></tr>
                <tr class="section-header"><td colspan="2">Descontos</td></tr>
                ${htmlDescontos}
                <tr class="summary-row"><td>Total de Descontos</td><td class="valor">${formatarMoeda(descontos.totalDescontos)}</td></tr>
                <tr class="section-header"><td colspan="2">Resumo Final</td></tr>
                <tr class="final-result-main"><td>Salário Líquido (Pagamento Final)</td><td class="valor">${formatarMoeda(liquido)}</td></tr>
                <tr class="final-result-secondary"><td>Salário Líquido Total (mês)</td><td class="valor">${formatarMoeda(liquidoMensal)}</td></tr>
                <tr class="final-result-secondary fgts-row"><td>Depósito FGTS do Mês</td><td class="valor">${formatarMoeda(fgts)}</td></tr>
            </tbody>
        </table>
    `;
    mostrarResultados();
}

// --- LÓGICA DE FÉRIAS ---
function alternarModoDias() {
    const opcaoSelecionada = document.querySelector('input[name="tipoDias"]:checked');
    if(!opcaoSelecionada) return;

    const modo = opcaoSelecionada.value;
    diasTrabInput.style.backgroundColor = "#e8f0fe"; 
    diasTrabInput.readOnly = true;

    if (modo === 'completo') {
        boxCalculoFerias.classList.add('hidden');
        diasTrabInput.value = 30;
        diasTrabInput.style.backgroundColor = "#f0f0f0";
        feedbackFerias.textContent = "";
    } else {
        boxCalculoFerias.classList.remove('hidden');
        
        if (modo === 'retorno_ferias') {
            colQtd.classList.add('hidden'); 
            lblData.textContent = "Dia do Retorno"; 
        } else {
            colQtd.classList.remove('hidden'); 
            lblData.textContent = "Dia de Início"; 
        }
        calcularDiasProporcionaisFerias();
    }
}

// --- CÁLCULO INTELIGENTE DE FÉRIAS (HÍBRIDO) ---
function calcularDiasProporcionaisFerias() {
    const mesRefStr = mesReferenciaInput.value; 
    const diaSelecionado = parseInt(inicioFeriasInput.value); 
    const opcaoSelecionada = document.querySelector('input[name="tipoDias"]:checked');

    if (!opcaoSelecionada) return;
    const modo = opcaoSelecionada.value;

    if (modo === 'saida_ferias' && !diaSelecionado) {
        diasTrabInput.value = "";
        feedbackFerias.innerHTML = "Selecione o Dia de Início.";
        return;
    }
    if (modo === 'retorno_ferias' && !diaSelecionado) {
        diasTrabInput.value = "";
        feedbackFerias.innerHTML = "Selecione o Dia de Retorno.";
        return;
    }
    
    if (!mesRefStr) {
        diasTrabInput.value = "";
        feedbackFerias.innerHTML = "Selecione o Mês de Referência (topo).";
        return;
    }

    // Datas base
    const [anoRef, mesRef] = mesRefStr.split('-').map(Number);
    const inicioMes = new Date(anoRef, mesRef - 1, 1);
    const fimMes = new Date(anoRef, mesRef, 0); // Último dia do mês (ex: 30 ou 31)

    // Dia selecionado (Limitado ao último dia)
    const diaValidado = Math.min(diaSelecionado, fimMes.getDate());
    
    let diasTrabalhados = 0;

    // --- MODO 2: SAÍDA DE FÉRIAS (HÍBRIDO) ---
    if (modo === 'saida_ferias') {
        const duracao = parseInt(qtdDiasFeriasInput.value);
        if(!duracao) {
            diasTrabInput.value = "";
            feedbackFerias.innerHTML = "Digite a Qtd de Dias de Férias.";
            return;
        }

        // 1. Define Início e Fim das Férias
        const dataInicioFerias = new Date(anoRef, mesRef - 1, diaValidado);
        const dataFimFerias = new Date(dataInicioFerias);
        dataFimFerias.setDate(dataFimFerias.getDate() + duracao - 1);

        // 2. Calcula dias de férias DENTRO deste mês
        const inicioIntersecao = new Date(Math.max(inicioMes, dataInicioFerias));
        const fimIntersecao = new Date(Math.min(fimMes, dataFimFerias));
        let diasFeriasNoMes = 0;
        if (inicioIntersecao <= fimIntersecao) {
            const diffTempo = fimIntersecao - inicioIntersecao;
            diasFeriasNoMes = Math.ceil(diffTempo / (1000 * 60 * 60 * 24)) + 1;
        }

        // 3. DECISÃO HÍBRIDA:
        // Se as férias acabam DENTRO do mês (Sanduíche), usamos regra 30 dias.
        // Se as férias ULTRAPASSAM o mês (Saída Pura), usamos regra Dias Trabalhados.
        
        let textoExplicativo = "";
        
        if (dataFimFerias <= fimMes) {
            // Caso Sanduíche (Voltou a trabalhar): 30 - Dias de Férias
            diasTrabalhados = 30 - diasFeriasNoMes;
            textoExplicativo = "Sanduíche (Retornou ao trabalho)";
        } else {
            // Caso Saída Pura (Não voltou): Paga exatamente até o dia da saída
            diasTrabalhados = diaValidado - 1;
            textoExplicativo = "Saída (Não retornou no mês)";
        }
        
        // Travas de segurança
        if (diasTrabalhados < 0) diasTrabalhados = 0;
        if (diasTrabalhados > 30) diasTrabalhados = 30;

        const fmt = d => d.toLocaleDateString('pt-BR');
        feedbackFerias.innerHTML = `
            Férias: <b>${fmt(dataInicioFerias)}</b> a <b>${fmt(dataFimFerias)}</b>.<br>
            Tipo: <b>${textoExplicativo}</b>.<br>
            Saldo Salário: <b style="color:#0d47a1">${diasTrabalhados} dias</b>.
        `;
    } 
    
    // --- MODO 3: RETORNO DE FÉRIAS (30 - Dias Perdidos) ---
    else if (modo === 'retorno_ferias') {
        const diasPerdidos = diaValidado - 1;
        diasTrabalhados = 30 - diasPerdidos;

        if (diasTrabalhados < 0) diasTrabalhados = 0;
        if (diasTrabalhados > 30) diasTrabalhados = 30;

        const dataRetorno = new Date(anoRef, mesRef - 1, diaValidado);
        feedbackFerias.innerHTML = `
            Retornou dia: <b>${dataRetorno.toLocaleDateString('pt-BR')}</b>.<br>
            Esteve fora: <b>${diasPerdidos} dias</b>.<br>
            Saldo Salário: <b style="color:#0d47a1">${diasTrabalhados} dias</b>.
        `;
    }

    diasTrabInput.value = diasTrabalhados;
}

// --- FUNÇÕES AUXILIARES E INIT ---
function handleCalcular() {
    const inputs = {
        salario: parseFloat(document.getElementById('salario').value) || 0,
        diasTrab: parseInt(document.getElementById('diasTrab').value) || 0,
        dependentes: parseInt(document.getElementById('dependentes').value) || 0,
        faltas: parseFloat(document.getElementById('faltas').value) || 0,
        atrasos: parseFloat(document.getElementById('atrasos').value) || 0,
        he50: parseFloat(document.getElementById('he50').value) || 0,
        he60: parseFloat(document.getElementById('he60').value) || 0,
        he80: parseFloat(document.getElementById('he80').value) || 0,
        he100: parseFloat(document.getElementById('he100').value) || 0,
        he150: parseFloat(document.getElementById('he150').value) || 0,
        noturno: parseFloat(document.getElementById('noturno').value) || 0,
        plano: document.getElementById('plano').value,
        sindicato: document.getElementById('sindicato').value,
        emprestimo: parseFloat(document.getElementById('emprestimo').value) || 0,
        diasUteis: parseInt(document.getElementById('diasUteis').value) || 0,
        domFeriados: parseInt(document.getElementById('domFeriados').value) || 0,
        descontarVT: document.getElementById('descontar_vt').value === 'sim'
    };
    const resultado = calcularSalarioCompleto(inputs, regrasCalculo);
    renderizarResultados(resultado);
}

function adicionarFeriado() {
    const dia = document.getElementById('diaFeriado').value;
    const mesAno = document.getElementById('mesReferencia').value;
    if (!dia || !mesAno) return;
    const [ano, mes] = mesAno.split('-');
    const data = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
    const campo = document.getElementById('feriadosExtras');
    const feriados = campo.value ? campo.value.split(',') : [];
    if (feriados.includes(data)) return;
    feriados.push(data);
    campo.value = feriados.join(',');
    const div = document.createElement('div');
    div.textContent = data;
    div.className = 'feriado-box';
    div.title = 'Clique para remover';
    div.onclick = () => {
        const novaLista = feriados.filter(f => f !== data);
        campo.value = novaLista.join(',');
        div.remove();
        preencherDiasMes();
    };
    document.getElementById('listaFeriados').appendChild(div);
    document.getElementById('diaFeriado').value = "";
    preencherDiasMes();
}

function limparFeriados() {
    if (confirm('Remover todos os feriados adicionados?')) {
        document.getElementById('feriadosExtras').value = '';
        document.getElementById('listaFeriados').innerHTML = '';
        preencherDiasMes();
    }
}

function preencherDiasMes() {
    const mesAno = document.getElementById('mesReferencia').value;
    if (!mesAno) return;
    const [ano, mes] = mesAno.split('-').map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();
    let diasUteis = 0;
    let domingos = 0;
    for (let d = 1; d <= diasNoMes; d++) {
        const data = new Date(ano, mes - 1, d);
        const diaSemana = data.getDay();
        if (diaSemana >= 1 && diaSemana <= 6) diasUteis++;
        if (diaSemana === 0) domingos++;
    }
    const feriadosFixos = ["01/01", "21/04", "01/05", "07/09", "12/10", "02/11", "15/11", "25/12"];
    let feriadosNacionaisNoMes = 0;
    feriadosFixos.forEach(fix => {
        const [dia, mesFix] = fix.split('/');
        if (parseInt(mesFix) === mes) {
            const dataFeriado = new Date(ano, mes - 1, parseInt(dia));
            if (dataFeriado.getDay() !== 0) feriadosNacionaisNoMes++;
        }
    });
    const feriadosExtras = document.getElementById('feriadosExtras').value;
    const qtdFeriados = feriadosExtras ? feriadosExtras.split(',').length : 0;
    document.getElementById('diasUteis').value = diasUteis - qtdFeriados - feriadosNacionaisNoMes;
    document.getElementById('domFeriados').value = domingos + qtdFeriados + feriadosNacionaisNoMes;
    
    if(document.querySelector('input[name="tipoDias"]:checked')?.value !== 'completo') {
        calcularDiasProporcionaisFerias();
    }
}

function salvarDadosFixos() {
    const dados = {
        salario: document.getElementById('salario').value,
        dependentes: document.getElementById('dependentes').value,
        plano: document.getElementById('plano').value,
        sindicato: document.getElementById('sindicato').value
    };
    localStorage.setItem('dadosFixosCalculadora', JSON.stringify(dados));
    alert('Dados salvos!');
}

function restaurarDadosFixos() {
    const dadosSalvos = JSON.parse(localStorage.getItem('dadosFixosCalculadora'));
    if (dadosSalvos) {
        document.getElementById('salario').value = dadosSalvos.salario;
        document.getElementById('dependentes').value = dadosSalvos.dependentes;
        document.getElementById('plano').value = dadosSalvos.plano;
        document.getElementById('sindicato').value = dadosSalvos.sindicato;
    }
}

// Inicialização e AUTO-UPDATE
document.addEventListener('DOMContentLoaded', () => {
    // Listeners
    document.getElementById('btn-calcular').addEventListener('click', handleCalcular);
    document.getElementById('btn-voltar').addEventListener('click', mostrarFormulario);
    document.getElementById('btn-salvar').addEventListener('click', salvarDadosFixos);
    document.getElementById('btn-add-feriado').addEventListener('click', adicionarFeriado);
    document.getElementById('btn-limpar-feriados').addEventListener('click', limparFeriados);
    mesReferenciaInput.addEventListener('change', preencherDiasMes);
    
    document.querySelectorAll('input[name="tipoDias"]').forEach(radio => {
        radio.addEventListener('change', alternarModoDias);
    });
    inicioFeriasInput.addEventListener('change', calcularDiasProporcionaisFerias);
    qtdDiasFeriasInput.addEventListener('input', calcularDiasProporcionaisFerias);

    // Conversor Horas
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
    preencherDiasMes();
    
    // --- LÓGICA DE AUTO-UPDATE PWA ---
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                window.location.reload();
                refreshing = true;
            }
        });

        navigator.serviceWorker.register('sw.js').then(reg => {
            reg.update();
            setInterval(() => reg.update(), 3600000);
        });
    }
});
