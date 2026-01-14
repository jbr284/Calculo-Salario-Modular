// app.js - VERSÃO MODULAR 🚀

import { regras } from './regras.js';
import { calcularSalarioCompleto } from './calculadora-regras.js';

// --- ELEMENTOS DO DOM ---
const formView = document.getElementById('form-view');
const resultView = document.getElementById('result-view');
const resultContainer = document.getElementById('resultado-container');
const mesReferenciaInput = document.getElementById('mesReferencia');

// Seletores de Férias
const boxCalculoFerias = document.getElementById('box-calculo-ferias');
const diasTrabInput = document.getElementById('diasTrab');
const inicioFeriasInput = document.getElementById('inicioFerias'); 
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

// --- LÓGICA DE FÉRIAS (MENSALISTA 30 DIAS) ---
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

    const [anoRef, mesRef] = mesRefStr.split('-').map(Number);
    const inicioMes = new Date(anoRef, mesRef - 1, 1);
    const fimMes = new Date(anoRef, mesRef, 0); 
    
    const diaValidado = Math.min(diaSelecionado, fimMes.getDate());
    
    let diasTrabalhados = 0;
    let diasFeriasNoMes = 0;

    if (modo === 'saida_ferias') {
        const duracao = parseInt(qtdDiasFeriasInput.value);
        if(!duracao) {
            diasTrabInput.value = "";
            feedbackFerias.innerHTML = "Digite a Qtd de Dias de Férias.";
            return;
        }

        const dataInicioFerias = new Date(anoRef, mesRef - 1, diaValidado);
        const dataFimFerias = new Date(dataInicioFerias);
        dataFimFerias.setDate(dataFimFerias.getDate() + duracao - 1);

        const inicioIntersecao = new Date(Math.max(inicioMes, dataInicioFerias));
        const fimIntersecao = new Date(Math.min(fimMes, dataFimFerias));
        
        if (inicioIntersecao <= fimIntersecao) {
            const diffTempo = fimIntersecao - inicioIntersecao;
            diasFeriasNoMes = Math.ceil(diffTempo / (1000 * 60 * 60 * 24)) + 1;
        }

        diasTrabalhados = 30 - diasFeriasNoMes;

        let textoExplicativo = "";
        const fmt = d => d.toLocaleDateString('pt-BR');
        
        if (dataFimFerias <= fimMes) {
             textoExplicativo = "Sanduíche (Retornou ao trabalho)";
        } else {
             textoExplicativo = "Saída (Não retornou no mês)";
        }

        feedbackFerias.innerHTML = `
            Férias neste mês: <b>${diasFeriasNoMes} dias</b>.<br>
            Período: <b>${fmt(dataInicioFerias)}</b> a <b>${fmt(dataFimFerias)}</b>.<br>
            Cálculo (30 - Férias): <b style="color:#0d47a1">${diasTrabalhados} dias</b>.
        `;
    } 
    else if (modo === 'retorno_ferias') {
        const diasPerdidosFerias = diaValidado - 1;
        diasTrabalhados = 30 - diasPerdidosFerias;

        const dataRetorno = new Date(anoRef, mesRef - 1, diaValidado);
        feedbackFerias.innerHTML = `
            Retornou dia: <b>${dataRetorno.toLocaleDateString('pt-BR')}</b>.<br>
            Férias no mês: <b>${diasPerdidosFerias} dias</b>.<br>
            Cálculo (30 - Férias): <b style="color:#0d47a1">${diasTrabalhados} dias</b>.
        `;
    }

    if (diasTrabalhados < 0) diasTrabalhados = 0;
    if (diasTrabalhados > 30) diasTrabalhados = 30;

    diasTrabInput.value = diasTrabalhados;
}

// --- FUNÇÃO DE CÁLCULO ---
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
    
    const resultado = calcularSalarioCompleto(inputs, regras);
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

document.addEventListener('DOMContentLoaded', () => {
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
