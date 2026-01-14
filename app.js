// app.js - VERSÃO DEFINITIVA 2026 (Arquivo Único)

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURAÇÕES E REGRAS 2026 ---
    const regras = {
        anoVigencia: 2026,
        salarioMinimo: 1518.00,
        tetoINSS: 8157.41,
        percentualAdiantamento: 0.4,
        percentualAdicionalNoturno: 0.35,
        descontoFixoVA: 23.97,
        percentualVT: 0.06,
        valorSindicato: 47.5,
        
        // Parâmetros IRRF 2026
        descontoSimplificado: 564.80, 
        deducaoPorDependenteIRRF: 189.59,
      
        // Nova Regra de Isenção e Redutor (Lei 15.270)
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

        planosSESI: {
            nenhum: 0,
            basico_individual: 29,
            basico_familiar: 58,
            plus_individual: 115,
            plus_familiar: 180
        }
    };

    // --- 2. LÓGICA MATEMÁTICA ---

    function calcularINSS(baseDeCalculo) {
        if (baseDeCalculo > regras.tetoINSS) baseDeCalculo = regras.tetoINSS;
        
        for (const faixa of regras.tabelaINSS) {
            if (baseDeCalculo <= faixa.ate) {
                return (baseDeCalculo * faixa.aliquota) - faixa.deduzir;
            }
        }
        const ultima = regras.tabelaINSS[regras.tabelaINSS.length - 1];
        return (baseDeCalculo * ultima.aliquota) - ultima.deduzir;
    }

    function calcularIRRF(baseBruta, inssCalculado, dependentes, totalBruto) {
        // A. Isenção Direta pelo Bruto (Lei 15.270)
        if (regras.novaRegra2026.ativo && totalBruto <= regras.novaRegra2026.limiteIsencaoBruto) {
            return 0; // Ganhou até 5k? Zero imposto.
        }

        // B. Cálculo do Imposto Normal (Tabela Progressiva)
        const baseLegal = baseBruta - inssCalculado - (dependentes * regras.deducaoPorDependenteIRRF);
        const baseSimplificada = baseBruta - regras.descontoSimplificado;
        
        // Escolhe o mais vantajoso (menor base)
        let baseFinal = Math.min(baseLegal, baseSimplificada);
        if (baseFinal < 0) baseFinal = 0;

        let impostoCalculado = 0;
        for (const faixa of regras.tabelaIRRF) {
            if (baseFinal <= faixa.ate) {
                impostoCalculado = (baseFinal * faixa.aliquota) - faixa.deduzir;
                break;
            }
        }

        // C. Aplicação do Redutor (Faixa de Transição 5k - 7.35k)
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

    function calcularSalarioCompleto(inputs) {
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
        
        // Total Bruto (Renda Tributável)
        const totalBruto = vencBase + totalHE + valorNoturno + dsrHE + dsrNoturno;

        // Descontos
        const fgts = totalBruto * 0.08;
        const descontoFaltas = faltas * valorDia;
        const descontoAtrasos = atrasos * valorHora;
        const adiantamento = (salario / 30) * diasTrab * regras.percentualAdiantamento;
        const descontoVA = regras.descontoFixoVA;
        const descontoVT = descontarVT ? (salario * regras.percentualVT) : 0;
        
        // 1. INSS
        const inss = calcularINSS(totalBruto);
        
        // 2. IRRF (Passamos o TotalBruto para validar a isenção de 5k)
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

    function renderizarResultados(resultado) {
        const { proventos, descontos, liquido, fgts } = resultado;
        const liquidoMensal = liquido + descontos.adiantamento;
        const row = (label, val) => val > 0 ? `<tr><td>${label}</td><td class="valor">${formatarMoeda(val)}</td></tr>` : '';

        let htmlProventos = '';
        htmlProventos += row('Salário Base Proporcional', proventos.vencBase);
        htmlProventos += row('Hora Extra 50%', proventos.valorHE50);
        htmlProventos += row('Hora Extra 60%', proventos.valorHE60);
        htmlProventos += row('Adicional Noturno', proventos.valorNoturno);
        htmlProventos += row('DSR (HE/Noturno)', proventos.dsrHE + proventos.dsrNoturno);

        let htmlDescontos = '';
        htmlDescontos += row('Faltas/Atrasos', descontos.descontoFaltas + descontos.descontoAtrasos);
        htmlDescontos += row('Adiantamento Salarial', descontos.adiantamento);
        htmlDescontos += row('Convênio SESI', descontos.descontoPlano);
        htmlDescontos += row('Sindicato', descontos.descontoSindicato);
        htmlDescontos += row('Vale Alimentação', descontos.descontoVA);
        htmlDescontos += `<tr><td>INSS</td><td class="valor">${formatarMoeda(descontos.inss)}</td></tr>`;
        
        // DESTAQUE PARA O IRRF 2026
        const labelIR = descontos.irrf === 0 ? "IRRF (Isento)" : "IRRF (Lei 15.270)";
        htmlDescontos += `<tr><td>${labelIR}</td><td class="valor">${formatarMoeda(descontos.irrf)}</td></tr>`;

        resultContainer.innerHTML = `
            <h2>Resultado (Regra 2026)</h2>
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
                    <tr class="final-result-main"><td>Salário Líquido</td><td class="valor">${formatarMoeda(liquido)}</td></tr>
                </tbody>
            </table>
        `;
        mostrarResultados();
    }

    // --- Lógica de Férias e UI ---
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
        const diaValido = Math.min(diaSel, ultimoDiaMes);
        
        let diasPagar = 30;

        if (opcao === 'retorno_ferias') {
            diasPagar = 30 - (diaValido - 1);
        } else if (opcao === 'saida_ferias') {
            diasPagar = diaValido - 1; 
        }
        
        diasTrabInput.value = Math.max(0, Math.min(30, diasPagar));
    }

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
        
        const resultado = calcularSalarioCompleto(inputs);
        renderizarResultados(resultado);
    }

    // Inicialização
    document.getElementById('btn-calcular').addEventListener('click', handleCalcular);
    document.getElementById('btn-voltar').addEventListener('click', mostrarFormulario);
    
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

    alternarModoDias();
    
    // Auto Update Service Worker
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('sw.js').then(reg => {
            reg.update();
        });
    }
});
