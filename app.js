// app.js - VERSÃO MODULAR (Clean Architecture)
// Agora importa a lógica de negócio, mantendo a UI separada.

import { regras } from './regras.js';
import { calcularSalarioCompleto } from './calculadora-regras.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. FUNÇÕES DE CALENDÁRIO (UI Logic) ---
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
        
        const feriadosExtrasInput = document.getElementById('feriadosExtras').value;
        const qtdFeriadosExtras = feriadosExtrasInput ? feriadosExtrasInput.split(',').length : 0;
        const totalFeriados = qtdFeriadosExtras + feriadosNacionaisNoMes;
        
        document.getElementById('diasUteis').value = diasUteis - totalFeriados;
        document.getElementById('domFeriados').value = domingos + totalFeriados;
        
        if(document.querySelector('input[name="tipoDias"]:checked')?.value !== 'completo') {
            calcularDiasProporcionaisFerias();
        }
    }

    function adicionarFeriado() {
        const dia = document.getElementById('diaFeriado').value;
        const mesAno = document.getElementById('mesReferencia').value;
        if (!dia || !mesAno) return;
        const [ano, mes] = mesAno.split('-');
        const data = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
        const campo = document.getElementById('feriadosExtras');
        let feriados = campo.value ? campo.value.split(',') : [];
        if (!feriados.includes(data)) {
            feriados.push(data);
            campo.value = feriados.join(',');
            const div = document.createElement('div');
            div.textContent = data;
            div.className = 'feriado-box';
            div.title = 'Clique para remover';
            div.onclick = () => {
                feriados = feriados.filter(f => f !== data);
                campo.value = feriados.join(',');
                div.remove();
                preencherDiasMes();
            };
            document.getElementById('listaFeriados').appendChild(div);
            document.getElementById('diaFeriado').value = "";
            preencherDiasMes();
        }
    }

    function limparFeriados() {
        if (confirm('Remover todos os feriados adicionados?')) {
            document.getElementById('feriadosExtras').value = '';
            document.getElementById('listaFeriados').innerHTML = '';
            preencherDiasMes();
        }
    }

    // --- 2. INTERFACE (UI) ---
    const formView = document.getElementById('form-view');
    const resultView = document.getElementById('result-view');
    const resultContainer = document.getElementById('resultado-container');
    const mesReferenciaInput = document.getElementById('mesReferencia');
    const diasTrabInput = document.getElementById('diasTrab');
    const inicioFeriasInput = document.getElementById('inicioFerias');
    const qtdDiasFeriasInput = document.getElementById('qtdDiasFerias');
    const boxCalculoFerias = document.getElementById('box-calculo-ferias');
    const colQtd = document.getElementById('col-qtd');
    const lblData = document.getElementById('lbl-data-ferias');

    function formatarMoeda(val) { return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

    function renderizarResultados(resultado) {
        const p = resultado.proventos;
        const d = resultado.descontos;
        const fgts = resultado.fgts;
        const liquidoMensal = resultado.liquido + d.adiantamento;

        const row = (l, v) => v > 0.01 ? `<tr><td>${l}</td><td class="valor">${formatarMoeda(v)}</td></tr>` : '';

        // Template HTML do resultado
        resultContainer.innerHTML = `
            <table class="result-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #0d47a1; color: white;">
                        <th style="padding: 10px; text-align: left;">DESCRIÇÃO</th>
                        <th style="padding: 10px; text-align: right;">VALOR</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="section-header" style="background-color: #e3f2fd; font-weight: bold;"><td colspan="2" style="padding: 8px;">Proventos</td></tr>
                    ${row('Salário Base', p.vencBase)}
                    ${row('Hora Extra 50%', p.valorHE50)}
                    ${row('Hora Extra 60%', p.valorHE60)}
                    ${row('Hora Extra 80%', p.valorHE80)}
                    ${row('Hora Extra 100%', p.valorHE100)}
                    ${row('Hora Extra 150%', p.valorHE150)}
                    ${row('Adicional Noturno', p.valorNoturno)}
                    ${row('DSR sobre Horas Extras', p.dsrHE)}
                    ${row('DSR sobre Adic. Noturno', p.dsrNoturno)}
                    <tr class="summary-row" style="font-weight: bold; background-color: #f5f5f5;"><td style="padding: 8px;">Total Bruto</td><td class="valor" style="text-align: right; padding: 8px;">${formatarMoeda(p.totalBruto)}</td></tr>
                    
                    <tr class="section-header" style="background-color: #e3f2fd; font-weight: bold;"><td colspan="2" style="padding: 8px;">Descontos</td></tr>
                    ${row('Faltas (dias)', d.descontoFaltas)}
                    ${row('Atrasos (horas)', d.descontoAtrasos)}
                    ${row('Adiantamento Salarial', d.adiantamento)}
                    ${row('Convênio SESI', d.descontoPlano)}
                    ${row('Mensalidade Sindicato', d.descontoSindicato)}
                    ${row('Vale Alimentação', d.descontoVA)}
                    ${row('Vale Transporte', d.descontoVT)}
                    ${row('Empréstimo', d.emprestimo)}
                    ${row('INSS', d.inss)}
                    
                    <tr><td style="padding: 5px;">IRRF</td><td class="valor" style="text-align: right; padding: 5px;">${formatarMoeda(d.irrf)}</td></tr>
                    
                    <tr class="summary-row" style="font-weight: bold; background-color: #f5f5f5;"><td style="padding: 8px;">Total Descontos</td><td class="valor" style="text-align: right; padding: 8px;">${formatarMoeda(d.totalDescontos)}</td></tr>
                    
                    <tr class="section-header" style="background-color: #0d47a1; color: white; font-weight: bold;"><td colspan="2" style="padding: 10px; text-align: center;">Resumo Final</td></tr>
                    <tr class="final-result-main" style="background-color: #e3f2fd; font-size: 1.1em; font-weight: bold;"><td style="padding: 10px;">Salário Líquido (Pagamento Final)</td><td class="valor" style="text-align: right; padding: 10px;">${formatarMoeda(resultado.liquido)}</td></tr>
                    <tr class="final-result-secondary"><td style="padding: 8px;">Salário Líquido Total</td><td class="valor" style="text-align: right; padding: 8px;">${formatarMoeda(liquidoMensal)}</td></tr>
                    <tr class="final-result-secondary fgts-row" style="font-style: italic; color: #555;"><td style="padding: 8px;">FGTS</td><td class="valor" style="text-align: right; padding: 8px;">${formatarMoeda(fgts)}</td></tr>
                </tbody>
            </table>
        `;
        formView.classList.add('hidden');
        resultView.classList.remove('hidden');
        window.scrollTo(0,0);
    }

    // --- FUNÇÃO EXPORTAR PDF ---
    document.getElementById('btn-pdf').addEventListener('click', () => {
        const elemento = document.getElementById('resultado-container');
        const opt = {
            margin: 10,
            filename: 'calculo-salario-2026.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, scrollY: 0, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(elemento).save();
    });

    // Leitura Segura de Inputs
    function getVal(id) {
        const el = document.getElementById(id);
        if (!el) return 0;
        const val = parseFloat(el.value);
        return isNaN(val) ? 0 : val;
    }

    document.getElementById('btn-calcular').addEventListener('click', () => {
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
        
        // AQUI ESTÁ A MÁGICA DA MODULARIZAÇÃO:
        // Passamos os inputs e as regras (importadas) para a função de cálculo (importada)
        const resultado = calcularSalarioCompleto(inputs, regras);
        
        renderizarResultados(resultado);
    });

    document.getElementById('btn-voltar').addEventListener('click', () => {
        resultView.classList.add('hidden');
        formView.classList.remove('hidden');
    });

    // Salvar/Restaurar (localStorage)
    document.getElementById('btn-salvar').addEventListener('click', () => {
        const dados = {
            salario: document.getElementById('salario').value,
            dependentes: document.getElementById('dependentes').value,
            plano: document.getElementById('plano').value,
            sindicato: document.getElementById('sindicato').value
        };
        localStorage.setItem('dadosFixosCalc', JSON.stringify(dados));
        alert('Dados salvos!');
    });

    function restaurarDadosFixos() {
        const dadosSalvos = JSON.parse(localStorage.getItem('dadosFixosCalc'));
        if (dadosSalvos) {
            if(dadosSalvos.salario) document.getElementById('salario').value = dadosSalvos.salario;
            if(dadosSalvos.dependentes) document.getElementById('dependentes').value = dadosSalvos.dependentes;
            if(dadosSalvos.plano) document.getElementById('plano').value = dadosSalvos.plano;
            if(dadosSalvos.sindicato) document.getElementById('sindicato').value = dadosSalvos.sindicato;
        }
    }

    // Férias e Auto-preenchimento
    function alternarModoDias() {
        const opcao = document.querySelector('input[name="tipoDias"]:checked');
        if (!opcao) return;
        const modo = opcao.value;
        if (modo === 'completo') {
            boxCalculoFerias.classList.add('hidden');
            diasTrabInput.value = 30;
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
        const diaSel = parseInt(inicioFeriasInput.value);
        const opcao = document.querySelector('input[name="tipoDias"]:checked').value;
        
        if (!mesRefStr || !diaSel) return;
        
        const [ano, mes] = mesRefStr.split('-').map(Number);
        const ultimoDiaMes = new Date(ano, mes, 0).getDate();
        const diaValidado = Math.min(diaSel, ultimoDiaMes);
        
        let diasPagar = 30;
        if (opcao === 'retorno_ferias') {
            diasPagar = 30 - (diaValidado - 1);
        } else if (opcao === 'saida_ferias') {
            diasPagar = diaValidado - 1; 
        }
        diasTrabInput.value = Math.max(0, Math.min(30, diasPagar));
    }

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
    
    // PWA Service Worker
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
});
