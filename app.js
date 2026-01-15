// app.js - VERSÃO FINAL 2026 (Cálculo + Salvar Dados + Sem Erros)

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. REGRAS LEI 15.270 (2026) ---
    const regras = {
        anoVigencia: 2026,
        salarioMinimo: 1518.00,
        tetoINSS: 8157.41,
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
        planosSESI: { nenhum: 0, basico_individual: 29, basico_familiar: 58, plus_individual: 115, plus_familiar: 180 },
        percentualAdiantamento: 0.4,
        percentualAdicionalNoturno: 0.35,
        descontoFixoVA: 23.97,
        percentualVT: 0.06,
        valorSindicato: 47.5
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
        // Isenção Bruto 5k
        if (regras.novaRegra2026.ativo && totalBruto <= regras.novaRegra2026.limiteIsencaoBruto) {
            return 0; 
        }

        // Imposto Normal
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

        // Redutor
        if (regras.novaRegra2026.ativo && 
            totalBruto > regras.novaRegra2026.limiteIsencaoBruto && 
            totalBruto <= regras.novaRegra2026.faixaTransicaoFim) {
            
            const redutor = regras.novaRegra2026.parcelaFixaRedutor - (regras.novaRegra2026.fatorRedutor * totalBruto);
            if (redutor > 0) impostoCalculado -= redutor;
        }

        return Math.max(0, impostoCalculado);
    }

    function calcularSalarioCompleto(inputs) {
        const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;
        const valorDia = salario / 30;
        const valorHora = salario / 220;

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

        const fgts = totalBruto * 0.08;
        const descontoFaltas = faltas * valorDia;
        const descontoAtrasos = atrasos * valorHora;
        const adiantamento = (salario / 30) * diasTrab * regras.percentualAdiantamento;
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

    // --- 3. FUNÇÕES DE SALVAR/RESTAURAR (SOLUÇÃO DO ERRO) ---
    function salvarDadosFixos() {
        try {
            const dados = {
                salario: document.getElementById('salario').value,
                dependentes: document.getElementById('dependentes').value,
                plano: document.getElementById('plano').value,
                sindicato: document.getElementById('sindicato').value
            };
            // Usa localStorage (síncrono e seguro)
            localStorage.setItem('dadosFixosCalculadora', JSON.stringify(dados));
            alert('Dados fixos salvos com sucesso!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar dados.');
        }
    }

    function restaurarDadosFixos() {
        try {
            const dadosSalvos = JSON.parse(localStorage.getItem('dadosFixosCalculadora'));
            if (dadosSalvos) {
                if(dadosSalvos.salario) document.getElementById('salario').value = dadosSalvos.salario;
                if(dadosSalvos.dependentes) document.getElementById('dependentes').value = dadosSalvos.dependentes;
                if(dadosSalvos.plano) document.getElementById('plano').value = dadosSalvos.plano;
                if(dadosSalvos.sindicato) document.getElementById('sindicato').value = dadosSalvos.sindicato;
            }
        } catch (e) {
            console.log('Nenhum dado salvo encontrado.');
        }
    }

    // --- 4. INTERFACE ---
    const formView = document.getElementById('form-view');
    const resultView = document.getElementById('result-view');
    const resultContainer = document.getElementById('resultado-container');
    
    // Lista de IDs para coleta
    const ids = ['salario', 'diasTrab', 'dependentes', 'faltas', 'atrasos', 'he50', 'he60', 'he80', 'he100', 'he150', 'noturno', 'plano', 'sindicato', 'emprestimo', 'diasUteis', 'domFeriados', 'descontar_vt'];
    const getVal = (id) => {
        const el = document.getElementById(id);
        if(!el) return 0;
        return el.type === 'number' || el.type === 'text' ? (parseFloat(el.value) || 0) : el.value;
    };

    function formatarMoeda(val) { return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

    function renderizar(res) {
        const p = res.proventos;
        const d = res.descontos;
        const row = (l, v) => v > 0 ? `<tr><td>${l}</td><td class="valor">${formatarMoeda(v)}</td></tr>` : '';

        resultContainer.innerHTML = `
            <h2>Resultado (Regra 2026)</h2>
            <table class="result-table">
                <thead><tr><th>Descrição</th><th>Valor</th></tr></thead>
                <tbody>
                    <tr class="section-header"><td colspan="2">Proventos</td></tr>
                    ${row('Salário Base', p.vencBase)}
                    ${row('Horas Extras', p.valorHE50 + p.valorHE60 + p.valorHE80 + p.valorHE100 + p.valorHE150)}
                    ${row('Adicional Noturno', p.valorNoturno)}
                    ${row('DSR', p.dsrHE + p.dsrNoturno)}
                    <tr class="summary-row"><td>Total Bruto</td><td class="valor">${formatarMoeda(p.totalBruto)}</td></tr>
                    
                    <tr class="section-header"><td colspan="2">Descontos</td></tr>
                    ${row('Faltas/Atrasos', d.descontoFaltas + d.descontoAtrasos)}
                    ${row('INSS', d.inss)}
                    <tr><td>IRRF (Lei 15.270)</td><td class="valor">${formatarMoeda(d.irrf)}</td></tr>
                    ${row('Outros Descontos', d.totalDescontos - d.inss - d.irrf - d.descontoFaltas - d.descontoAtrasos)}
                    <tr class="summary-row"><td>Total Descontos</td><td class="valor">${formatarMoeda(d.totalDescontos)}</td></tr>
                    
                    <tr class="section-header"><td colspan="2">Líquido</td></tr>
                    <tr class="final-result-main"><td>A Receber</td><td class="valor">${formatarMoeda(res.liquido)}</td></tr>
                </tbody>
            </table>
        `;
        formView.classList.add('hidden');
        resultView.classList.remove('hidden');
        window.scrollTo(0,0);
    }

    document.getElementById('btn-calcular').addEventListener('click', () => {
        const inputs = {};
        ids.forEach(id => inputs[id] = getVal(id));
        inputs.descontarVT = document.getElementById('descontar_vt').value === 'sim';
        const resultado = calcularSalarioCompleto(inputs);
        renderizar(resultado);
    });

    document.getElementById('btn-voltar').addEventListener('click', () => {
        resultView.classList.add('hidden');
        formView.classList.remove('hidden');
    });

    // Evento de Salvar corrigido
    document.getElementById('btn-salvar').addEventListener('click', salvarDadosFixos);

    // Inicialização
    restaurarDadosFixos();

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

    // Service Worker (Opcional - para PWA)
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
});
