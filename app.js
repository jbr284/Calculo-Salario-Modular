// app.js - VERSÃO CORRIGIDA

const regras = {
    "anoVigencia": 2026,
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

// --- CÁLCULOS ---
function calcularINSS(base, regras) {
    if (base > regras.tetoINSS) base = regras.tetoINSS;
    for (const faixa of regras.tabelaINSS) {
        if (base <= faixa.ate) return (base * faixa.aliquota) - faixa.deduzir;
    }
    const ultima = regras.tabelaINSS[regras.tabelaINSS.length - 1];
    return (base * ultima.aliquota) - ultima.deduzir;
}

function calcularIRRF(base, dependentes, regras) {
    const deducao = dependentes * regras.deducaoPorDependenteIRRF;
    const baseFinal = base - deducao;
    for (const faixa of regras.tabelaIRRF) {
        if (faixa.ate === "acima" || baseFinal <= faixa.ate) {
            return Math.max(0, (baseFinal * faixa.aliquota) - faixa.deduzir);
        }
    }
    return 0;
}

function calcularSalarioCompleto(inputs, regras) {
    const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;
    
    const diasEfetivos = (!diasTrab || diasTrab === 0) ? 30 : diasTrab;
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
    
    // DSR Separado
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
    
    const inss = calcularINSS(totalBruto, regras);
    const baseIRRF = totalBruto - inss;
    const irrf = calcularIRRF(baseIRRF, dependentes, regras);
    const descontoPlano = regras.planosSESI[plano] || 0;
    const descontoSindicato = sindicato === 'sim' ? regras.valorSindicato : 0;
    
    const totalDescontos = descontoFaltas + descontoAtrasos + descontoPlano + descontoSindicato + emprestimo + inss + irrf + descontoVA + adiantamento + descontoVT;
    const liquido = totalBruto - totalDescontos;

    return {
        proventos: { 
            vencBase, 
            valorHE50, valorHE60, valorHE80, valorHE100, valorHE150, 
            valorNoturno, dsrHE, dsrNoturno, totalBruto 
        },
        descontos: { 
            descontoFaltas, descontoAtrasos, descontoPlano, descontoSindicato, emprestimo, inss, irrf, adiantamento, descontoVA, descontoVT, totalDescontos 
        },
        fgts, liquido
    };
}

// --- INTERFACE ---
document.addEventListener('DOMContentLoaded', () => {
    const formView = document.getElementById('form-view');
    const resultView = document.getElementById('result-view');
    const resultContainer = document.getElementById('resultado-container');
    const mesReferenciaInput = document.getElementById('mesReferencia');
    
    // Elementos de Férias
    const boxCalculoFerias = document.getElementById('box-calculo-ferias');
    const diasTrabInput = document.getElementById('diasTrab');
    const inicioFeriasInput = document.getElementById('inicioFerias'); 
    const qtdDiasFeriasInput = document.getElementById('qtdDiasFerias');
    const feedbackFerias = document.getElementById('feedback-ferias');
    const colQtd = document.getElementById('col-qtd'); // AGORA ESTE ID EXISTE NO HTML!
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
        const row = (label, val) => val > 0.01 ? `<tr><td>${label}</td><td class="valor">${formatarMoeda(val)}</td></tr>` : '';

        resultContainer.innerHTML = `
            <h2>Resultado do Cálculo - Modular</h2>
            <table class="result-table">
                <thead><tr><th>Descrição</th><th>Valor</th></tr></thead>
                <tbody>
                    <tr class="section-header"><td colspan="2">Proventos</td></tr>
                    ${row('Salário Base Proporcional', proventos.vencBase)}
                    ${row('Hora Extra 50%', proventos.valorHE50)}
                    ${row('Hora Extra 60%', proventos.valorHE60)}
                    ${row('Hora Extra 80%', proventos.valorHE80)}
                    ${row('Hora Extra 100%', proventos.valorHE100)}
                    ${row('Hora Extra 150%', proventos.valorHE150)}
                    ${row('Adicional Noturno (35%)', proventos.valorNoturno)}
                    ${row('DSR sobre Horas Extras', proventos.dsrHE)}
                    ${row('DSR sobre Adic. Noturno', proventos.dsrNoturno)}
                    <tr class="summary-row"><td>Total Bruto</td><td class="valor">${formatarMoeda(proventos.totalBruto)}</td></tr>
                    
                    <tr class="section-header"><td colspan="2">Descontos</td></tr>
                    ${row('INSS', descontos.inss)}
                    ${row('IRRF', descontos.irrf)}
                    ${row('Faltas (dias)', descontos.descontoFaltas)}
                    ${row('Atrasos (horas)', descontos.descontoAtrasos)}
                    ${row('Adiantamento (40%)', descontos.adiantamento)}
                    ${row('Vale Transporte (6%)', descontos.descontoVT)}
                    ${row('Vale Alimentação (Fixo)', descontos.descontoVA)}
                    ${row('Convênio SESI', descontos.descontoPlano)}
                    ${row('Mensalidade Sindical', descontos.descontoSindicato)}
                    ${row('Empréstimo Consignado', descontos.emprestimo)}
                    <tr class="summary-row"><td>Total Descontos</td><td class="valor">${formatarMoeda(descontos.totalDescontos)}</td></tr>
                    
                    <tr class="section-header"><td colspan="2">Resumo Final</td></tr>
                    <tr class="final-result-main"><td>Salário Líquido (A Receber)</td><td class="valor">${formatarMoeda(liquido)}</td></tr>
                    <tr class="final-result-secondary"><td>Salário Líquido Total (Mês)</td><td class="valor">${formatarMoeda(liquidoMensal)}</td></tr>
                    <tr class="final-result-secondary fgts-row"><td>FGTS (Depósito)</td><td class="valor">${formatarMoeda(fgts)}</td></tr>
                </tbody>
            </table>
        `;
        mostrarResultados();
    }

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

        feedbackFerias.innerHTML = "";
        if (!mesRefStr) { diasTrabInput.value = 0; feedbackFerias.innerHTML = "Selecione o Mês."; return; }
        if (!diaSelecionado) { diasTrabInput.value = 0; return; }

        const [anoRef, mesRef] = mesRefStr.split('-').map(Number);
        const inicioMes = new Date(anoRef, mesRef - 1, 1);
        const fimMes = new Date(anoRef, mesRef, 0); 
        const diaValidado = Math.min(diaSelecionado, fimMes.getDate());
        let diasTrabalhados = 0;

        if (modo === 'saida_ferias') {
            const duracao = parseInt(qtdDiasFeriasInput.value);
            if(!duracao) { diasTrabInput.value = 0; feedbackFerias.innerHTML = "Digite a Qtd de Dias."; return; }

            const dataInicioFerias = new Date(anoRef, mesRef - 1, diaValidado);
            const dataFimFerias = new Date(dataInicioFerias);
            dataFimFerias.setDate(dataFimFerias.getDate() + duracao - 1);
            
            const inicioIntersecao = new Date(Math.max(inicioMes, dataInicioFerias));
            const fimIntersecao = new Date(Math.min(fimMes, dataFimFerias));
            let diasFeriasNoMes = 0;
            if (inicioIntersecao <= fimIntersecao) {
                const diffTempo = fimIntersecao - inicioIntersecao;
                diasFeriasNoMes = Math.ceil(diffTempo / (1000 * 60 * 60 * 24)) + 1;
            }

            let texto = "";
            if (dataFimFerias <= fimMes) {
                diasTrabalhados = 30 - diasFeriasNoMes;
                texto = "Sanduíche (Retornou)";
            } else {
                diasTrabalhados = diaValidado - 1;
                texto = "Saída (Não retornou)";
            }
            diasTrabalhados = Math.max(0, Math.min(30, diasTrabalhados));
            const fmt = d => d.toLocaleDateString('pt-BR');
            feedbackFerias.innerHTML = `Período: <b>${fmt(dataInicioFerias)}</b> a <b>${fmt(dataFimFerias)}</b>.<br>Tipo: ${texto}`;
        } 
        else if (modo === 'retorno_ferias') {
            const diasPerdidos = diaValidado - 1;
            diasTrabalhados = 30 - diasPerdidos;
            diasTrabalhados = Math.max(0, Math.min(30, diasTrabalhados));
            const dataRetorno = new Date(anoRef, mesRef - 1, diaValidado);
            feedbackFerias.innerHTML = `Retornou: <b>${dataRetorno.toLocaleDateString('pt-BR')}</b>.<br>Dias trabalhados: <b>${diasTrabalhados}</b>.`;
        }
        diasTrabInput.value = diasTrabalhados;
    }

    // --- LEITURA CORRETA DOS CAMPOS ---
    function handleCalcular() {
        const getMoney = (id) => { 
            const el = document.getElementById(id); 
            if(!el) return 0;
            let valStr = el.value.replace(/\./g, '').replace(',', '.');
            const v = parseFloat(valStr); 
            return isNaN(v) ? 0 : v; 
        };

        const getNumber = (id) => { 
            const el = document.getElementById(id); 
            if(!el) return 0;
            let valStr = el.value.replace(',', '.');
            const v = parseFloat(valStr); 
            return isNaN(v) ? 0 : v; 
        };

        const inputs = {
            salario: getMoney('salario'), 
            emprestimo: getMoney('emprestimo'), 
            
            diasTrab: getNumber('diasTrab'), 
            dependentes: getNumber('dependentes'),
            faltas: getNumber('faltas'),
            atrasos: getNumber('atrasos'),
            he50: getNumber('he50'),
            he60: getNumber('he60'),
            he80: getNumber('he80'),
            he100: getNumber('he100'),
            he150: getNumber('he150'),
            noturno: getNumber('noturno'),
            
            diasUteis: getNumber('diasUteis'),
            domFeriados: getNumber('domFeriados'),
            plano: document.getElementById('plano').value,
            sindicato: document.getElementById('sindicato').value,
            descontarVT: document.getElementById('descontar_vt').value === 'sim'
        };
        const resultado = calcularSalarioCompleto(inputs, regras);
        renderizarResultados(resultado);
    }

    // --- UTILS ---
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
        div.className = 'feriado-box';
        div.innerHTML = `${data} <span>&times;</span>`;
        div.onclick = () => { const nova = campo.value.split(',').filter(f=>f!==data); campo.value = nova.join(','); div.remove(); preencherDiasMes(); };
        document.getElementById('listaFeriados').appendChild(div);
        document.getElementById('diaFeriado').value = "";
        preencherDiasMes();
    }

    function preencherDiasMes() {
        const mesAno = document.getElementById('mesReferencia').value;
        if (!mesAno) return;
        const [ano, mes] = mesAno.split('-').map(Number);
        const diasNoMes = new Date(ano, mes, 0).getDate();
        let diasUteis = 0, domingos = 0;
        for (let d = 1; d <= diasNoMes; d++) {
            const data = new Date(ano, mes - 1, d);
            const diaSemana = data.getDay();
            if (diaSemana >= 1 && diaSemana <= 6) diasUteis++;
            if (diaSemana === 0) domingos++;
        }
        const feriadosFixos = ["01/01", "21/04", "01/05", "07/09", "12/10", "02/11", "15/11", "25/12"];
        let feriadosNacionais = 0;
        feriadosFixos.forEach(fix => {
            const [dia, mesFix] = fix.split('/');
            if (parseInt(mesFix) === mes) {
                const dt = new Date(ano, mes - 1, parseInt(dia));
                if (dt.getDay() !== 0) feriadosNacionais++;
            }
        });
        const extras = document.getElementById('feriadosExtras').value;
        const qtdExtras = extras ? extras.split(',').length : 0;
        document.getElementById('diasUteis').value = diasUteis - qtdExtras - feriadosNacionais;
        document.getElementById('domFeriados').value = domingos + qtdExtras + feriadosNacionais;
        
        if(document.querySelector('input[name="tipoDias"]:checked')?.value !== 'completo') {
            calcularDiasProporcionaisFerias();
        } else {
            document.getElementById('diasTrab').value = 30;
        }
    }

    function salvarDadosFixos() {
        const dados = {
            salario: document.getElementById('salario').value,
            dependentes: document.getElementById('dependentes').value,
            plano: document.getElementById('plano').value,
            sindicato: document.getElementById('sindicato').value
        };
        localStorage.setItem('dadosFixosModular', JSON.stringify(dados));
        alert('Dados salvos!');
    }

    function restaurarDadosFixos() {
        const dados = JSON.parse(localStorage.getItem('dadosFixosModular'));
        if (dados) {
            document.getElementById('salario').value = dados.salario || "";
            document.getElementById('dependentes').value = dados.dependentes || "";
            document.getElementById('plano').value = dados.plano || "nenhum";
            document.getElementById('sindicato').value = dados.sindicato || "nao";
        }
    }

    document.getElementById('btn-calcular').addEventListener('click', handleCalcular);
    document.getElementById('btn-voltar').addEventListener('click', mostrarFormulario);
    document.getElementById('btn-salvar').addEventListener('click', salvarDadosFixos);
    document.getElementById('btn-add-feriado').addEventListener('click', adicionarFeriado);
    document.getElementById('btn-limpar-feriados').addEventListener('click', () => { if(confirm('Limpar?')) { document.getElementById('feriadosExtras').value=''; document.getElementById('listaFeriados').innerHTML=''; preencherDiasMes(); } });
    document.getElementById('btn-pdf').addEventListener('click', () => {
        const opt = { margin: 10, filename: 'holerite-modular.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } };
        html2pdf().set(opt).from(document.getElementById('resultado-container')).save();
    });

    mesReferenciaInput.addEventListener('change', preencherDiasMes);
    inicioFeriasInput.addEventListener('change', calcularDiasProporcionaisFerias);
    qtdDiasFeriasInput.addEventListener('input', calcularDiasProporcionaisFerias);
    document.querySelectorAll('input[name="tipoDias"]').forEach(radio => radio.addEventListener('change', alternarModoDias));
    
    document.querySelectorAll('.hora-conversivel').forEach(c => { 
        c.addEventListener('blur', function() { 
            let v = this.value.replace(',', '.').replace(':', '.'); 
            if(v) this.value = parseFloat(v).toFixed(2); 
        }); 
    });

    restaurarDadosFixos();
    alternarModoDias();
    preencherDiasMes();
});
