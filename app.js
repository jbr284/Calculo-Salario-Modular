// app.js - Módulos Conectados 🚀
import { regras } from './regras.js';
import { calcularSalarioCompleto } from './calculadora.js';

// Elementos da Tela
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

// --- Funções de UI ---
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarResultados() {
    formView.classList.add('hidden');
    resultView.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function mostrarFormulario() {
    resultView.classList.add('hidden');
    formView.classList.remove('hidden');
}

// Leitura Segura de Inputs (evita NaN)
function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    // Se for checkbox, retorna booleano no contexto certo, aqui tratamos numeros
    const val = parseFloat(el.value);
    return isNaN(val) ? 0 : val;
}

function renderizarResultados(resultado) {
    const p = resultado.proventos;
    const d = resultado.descontos;
    
    // Helper para criar linhas apenas se valor > 0
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
    
    // Label especial para IRRF 2026
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
                <tr class="final-result-main"><td>Salário Líquido</td><td class="valor">${formatarMoeda(resultado.liquido)}</td></tr>
            </tbody>
        </table>
    `;
    mostrarResultados();
}

// --- Controlador Principal ---
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
    
    // Chama a calculadora importada passando os inputs e as regras importadas
    const resultado = calcularSalarioCompleto(inputs, regras);
    renderizarResultados(resultado);
}

// --- Funções de Férias e Helpers ---
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
    
    let diasPagar = 30;
    if (opcao === 'retorno_ferias') {
        // Ex: Voltou dia 10. Perdeu 9 dias (1 ao 9).
        diasPagar = 30 - (diaValidado - 1);
    } else if (opcao === 'saida_ferias') {
        // Lógica simplificada segura: Paga até o dia anterior à saída
        diasPagar = diaValidado - 1; 
    }
    diasTrabInput.value = Math.max(0, Math.min(30, diasPagar));
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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-calcular').addEventListener('click', handleCalcular);
    document.getElementById('btn-voltar').addEventListener('click', mostrarFormulario);
    document.getElementById('btn-salvar').addEventListener('click', salvarDadosFixos);
    
    document.querySelectorAll('input[name="tipoDias"]').forEach(r => r.addEventListener('change', alternarModoDias));
    inicioFeriasInput.addEventListener('change', calcularDiasProporcionaisFerias);
    qtdDiasFeriasInput.addEventListener('input', calcularDiasProporcionaisFerias);

    // Conversor de Horas
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
    
    // Service Worker
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('sw.js').then(reg => reg.update()).catch(() => {});
    }
});
