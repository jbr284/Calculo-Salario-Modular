// app.js - VERSÃO FINAL 2026 (PDF PERFEITO SEM CORTES) 📄✨

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. REGRAS LEI 15.270 (2026) ---
    const regras = {
        anoVigencia: 2026,
        salarioMinimo: 1518.00,
        tetoINSS: 8157.41,
        percentualAdiantamento: 0.4,
        percentualAdicionalNoturno: 0.35,
        descontoFixoVA: 23.97,
        percentualVT: 0.06,
        valorSindicato: 47.5,
        descontoSimplificado: 564.80, 
        deducaoPorDependenteIRRF: 189.59,
        novaRegra2026: {
          ativo: true,
          limiteIsencaoBruto: 5000.00,
          faixaTransicaoFim: 7350.00,
          fatorRedutor: 0.133145,
          parcelaFixaRedutor: 978.61
        },
        tabelaINSS: [
          { ate: 1518.00, aliquota: 0.075, deduzir: 0 },
          { ate: 2793.88, aliquota: 0.09, deduzir: 22.77 },
          { ate: 4190.83, aliquota: 0.12, deduzir: 106.59 },
          { ate: 8157.41, aliquota: 0.14, deduzir: 190.41 }
        ],
        tabelaIRRF: [
          { ate: 2259.20, aliquota: 0, deduzir: 0 },
          { ate: 2826.65, aliquota: 0.075, deduzir: 169.44 },
          { ate: 3751.05, aliquota: 0.15, deduzir: 381.44 },
          { ate: 4664.68, aliquota: 0.225, deduzir: 662.77 },
          { ate: 999999, aliquota: 0.275, deduzir: 896.00 }
        ],
        planosSESI: { nenhum: 0, basico_individual: 29, basico_familiar: 58, plus_individual: 115, plus_familiar: 180 }
    };

    // --- 2. CÁLCULOS ---
    function calcularINSS(base) {
        if (base > regras.tetoINSS) base = regras.tetoINSS;
        for (const f of regras.tabelaINSS) {
            if (base <= f.ate) return (base * f.aliquota) - f.deduzir;
        }
        const ult = regras.tabelaINSS[regras.tabelaINSS.length - 1];
        return (base * ult.aliquota) - ult.deduzir;
    }

    function calcularIRRF(baseBruta, inss, deps, totalBruto) {
        if (regras.novaRegra2026.ativo && totalBruto <= regras.novaRegra2026.limiteIsencaoBruto) return 0;

        const baseLegal = baseBruta - inss - (deps * regras.deducaoPorDependenteIRRF);
        const baseSimples = baseBruta - regras.descontoSimplificado;
        let baseFinal = Math.min(baseLegal, baseSimples);
        if (baseFinal < 0) baseFinal = 0;

        let impostoCalculado = 0;
        for (const f of regras.tabelaIRRF) {
            if (baseFinal <= f.ate) {
                impostoCalculado = (baseFinal * f.aliquota) - f.deduzir;
                break;
            }
        }

        if (regras.novaRegra2026.ativo && totalBruto > 5000 && totalBruto <= 7350) {
            const redutor = regras.novaRegra2026.parcelaFixaRedutor - (regras.novaRegra2026.fatorRedutor * totalBruto);
            if (redutor > 0) impostoCalculado -= redutor;
        }

        return Math.max(0, impostoCalculado);
    }

    function calcularSalarioCompleto(inputs) {
        const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;
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
        const totalBruto = vencBase + totalHE + valorNoturno + dsrHE + dsrNoturno;

        // Descontos
        const fgts = totalBruto * 0.08;
        const descontoFaltas = faltas * valorDia;
        const descontoAtrasos = atrasos * valorHora;
        const adiantamento = (salario / 30) * diasEfetivos * regras.percentualAdiantamento;
        const descontoVA = regras.descontoFixoVA;
        const descontoVT = descontarVT ? (salario * regras.percentualVT) : 0;
        
        const inss = calcularINSS(totalBruto);
        const irrf = calcularIRRF(totalBruto, inss, dependentes, totalBruto);
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

    // --- 3. FUNÇÕES DE CALENDÁRIO ---
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

    // --- 4. INTERFACE ---
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

        // Tabela limpa para PDF perfeito
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

    // --- FUNÇÃO EXPORTAR PDF (CORRIGIDA) ---
    document.getElementById('btn-pdf').addEventListener('click', () => {
        const elemento = document.getElementById('resultado-container');
        
        // Configurações cruciais para evitar cortes e espaços em branco
        const opt = {
            margin:       10,
            filename:     'calculo-salario-2026.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                scrollY: 0, // O SEGREDO: Isso remove o espaço em branco do topo!
                logging: false
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Gera o PDF
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
        const resultado = calcularSalarioCompleto(inputs);
        renderizarResultados(resultado);
    });

    document.getElementById('btn-voltar').addEventListener('click', () => {
        resultView.classList.add('hidden');
        formView.classList.remove('hidden');
    });

    // Salvar/Restaurar
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
    
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
});
