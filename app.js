// app.js - SISTEMA DE FOLHA MODULAR DATA CENTERS (Ajuste de Base e Contrib. Assistencial)

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
      { "ate": 1621.00, "aliquota": 0.075, "deduzir": 0 },
      { "ate": 2902.84, "aliquota": 0.09, "deduzir": 24.32 },
      { "ate": 4354.27, "aliquota": 0.12, "deduzir": 111.40 },
      { "ate": 8475.55, "aliquota": 0.14, "deduzir": 198.49 }
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

// --- CÁLCULOS ---
function calcularINSS(base, regras) {
    if (base > regras.tetoINSS) base = regras.tetoINSS;
    for (const faixa of regras.tabelaINSS) {
        if (base <= faixa.ate) return (base * faixa.aliquota) - faixa.deduzir;
    }
    const ultima = regras.tabelaINSS[regras.tabelaINSS.length - 1];
    return (base * ultima.aliquota) - ultima.deduzir;
}

function calcularIRRF(baseCalculo, dependentes, regras, rendimentosTributaveis) {
    if (rendimentosTributaveis <= 5000) return 0;

    const deducoesDependentes = dependentes * regras.deducaoPorDependenteIRRF;
    const baseFinal = Math.max(0, baseCalculo - deducoesDependentes);

    let impostoBruto = 0;
    for (const faixa of regras.tabelaIRRF) {
        if (faixa.ate === "acima" || baseFinal <= faixa.ate) {
            impostoBruto = (baseFinal * faixa.aliquota) - faixa.deduzir;
            break;
        }
    }

    if (rendimentosTributaveis > 5000 && rendimentosTributaveis <= 7350) {
        const redutor = 978.62 - (0.133145 * rendimentosTributaveis);
        if (redutor > 0) {
            impostoBruto -= redutor;
        }
    }

    return Math.max(0, impostoBruto);
}

function calcularSalarioCompleto(inputs, regras) {
    const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, assistencial, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;
    
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
    
    // DSR
    const totalHE = valorHE50 + valorHE60 + valorHE80 + valorHE100 + valorHE150;
    const dsrHE = (diasUteis > 0) ? (totalHE / diasUteis) * domFeriados : 0;
    const dsrNoturno = (diasUteis > 0) ? (valorNoturno / diasUteis) * domFeriados : 0;
    
    // TOTAL BRUTO (Rendimentos Tributáveis)
    const totalBruto = vencBase + totalHE + valorNoturno + dsrHE + dsrNoturno;

    // Descontos básicos
    const fgts = totalBruto * 0.08;
    const descontoFaltas = faltas * valorDia;
    const descontoAtrasos = atrasos * valorHora;
    const adiantamento = (salario / 30) * diasEfetivos * regras.percentualAdiantamento;
    const descontoVA = regras.descontoFixoVA;
    const descontoVT = descontarVT ? (salario * regras.percentualVT) : 0;
    
    // NOVO: Abatimento de Faltas e Atrasos na Base do INSS
    const baseINSS = totalBruto - descontoFaltas - descontoAtrasos;
    const inss = calcularINSS(baseINSS, regras);
    
    // Base IRRF (Líquida do INSS já sobre a base abatida)
    const baseIRRF = baseINSS - inss;
    const irrf = calcularIRRF(baseIRRF, dependentes, regras, totalBruto);
    
    const descontoPlano = regras.planosSESI[plano] || 0;
    const descontoSindicato = sindicato === 'sim' ? regras.valorSindicato : 0;
    
    // Soma total dos descontos (incluindo a nova contribuição)
    const totalDescontos = descontoFaltas + descontoAtrasos + descontoPlano + assistencial + descontoSindicato + emprestimo + inss + irrf + descontoVA + adiantamento + descontoVT;
    const liquido = totalBruto - totalDescontos;

    return {
        proventos: { 
            vencBase, 
            valorHE50, valorHE60, valorHE80, valorHE100, valorHE150, 
            valorNoturno, dsrHE, dsrNoturno, totalBruto,
            temHE: totalHE > 0,
            temNoturno: valorNoturno > 0
        },
        descontos: { 
            descontoFaltas, descontoAtrasos, descontoPlano, assistencial, descontoSindicato, emprestimo, inss, irrf, adiantamento, descontoVA, descontoVT, totalDescontos 
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
    
    if (!mesReferenciaInput.value) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        mesReferenciaInput.value = `${ano}-${mes}`;
    }

    const boxCalculoFerias = document.getElementById('box-calculo-ferias');
    const diasTrabInput = document.getElementById('diasTrab');
    const inicioFeriasInput = document.getElementById('inicioFerias'); 
    const qtdDiasFeriasInput = document.getElementById('qtdDiasFerias');
    const feedbackFerias = document.getElementById('feedback-ferias');
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
        
        const row = (label, val, forcar = false) => {
            if (val > 0.01 || forcar) {
                return `<tr><td>${label}</td><td class="valor">${formatarMoeda(val)}</td></tr>`;
            }
            return '';
        };

        resultContainer.innerHTML = `
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
                    ${row('DSR sobre Horas Extras', proventos.dsrHE, proventos.temHE)}
                    ${row('DSR sobre Adic. Noturno', proventos.dsrNoturno, proventos.temNoturno)}
                    <tr class="summary-row"><td>Total Bruto (Tributável)</td><td class="valor">${formatarMoeda(proventos.totalBruto)}</td></tr>
                    
                    <tr class="section-header"><td colspan="2">Descontos</td></tr>
                    ${row('INSS', descontos.inss)}
                    ${row('IRRF (Lei 15.270/25)', descontos.irrf)}
                    ${row('Faltas (dias)', descontos.descontoFaltas)}
                    ${row('Atrasos (horas)', descontos.descontoAtrasos)}
                    ${row('Adiantamento (40%)', descontos.adiantamento)}
                    ${row('Vale Transporte (6%)', descontos.descontoVT)}
                    ${row('Vale Alimentação (Fixo)', descontos.descontoVA)}
                    ${row('Convênio SESI', descontos.descontoPlano)}
                    ${row('Contribuição Assistencial', descontos.assistencial)}
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
        const fimMes = new Date(anoRef, mesRef, 0); 
        const diaValidado = Math.min(diaSelecionado, fimMes.getDate());
        let diasTrabalhados = 0;

        if (modo === 'saida_ferias') {
            const duracao = parseInt(qtdDiasFeriasInput.value);
            if(!duracao) { diasTrabInput.value = 0; feedbackFerias.innerHTML = "Digite a Qtd de Dias."; return; }

            const dataInicioFerias = new Date(anoRef, mesRef - 1, diaValidado);
            const dataFimFerias = new Date(dataInicioFerias);
            dataFimFerias.setDate(dataFimFerias.getDate() + duracao - 1);
            
            const texto = (dataFimFerias <= fimMes) ? "Sanduíche (Retornou)" : "Saída (Não retornou)";
            
            if (dataFimFerias <= fimMes) {
                const diasFeriasNoMes = Math.ceil((dataFimFerias - dataInicioFerias)/(1000*60*60*24)) + 1;
                diasTrabalhados = 30 - diasFeriasNoMes;
            } else {
                diasTrabalhados = diaValidado - 1;
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
            assistencial: getMoney('assistencial'), // Capturando a Contribuição Assistencial
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

    function adicionarFeriado() {
        const dia = document.getElementById('diaFeriado').value;
        const mesAno = document.getElementById('mesReferencia').value;
        if (!dia || !mesAno) { alert("Selecione um Mês e um Dia."); return; }
        const [ano, mes] = mesAno.split('-');
        const data = `${dia}/${mes}/${ano}`;
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
        document.getElementById('diasUteis').value = Math.max(0, diasUteis - qtdExtras - feriadosNacionais);
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
    
    // Auto-formatação Inteligente de Horas (Lê 5:30 ou 5h30 e converte para 5,50)
    document.querySelectorAll('.hora-conversivel').forEach(input => { 
        input.addEventListener('blur', function() { 
            let valor = this.value.trim().toLowerCase(); 
            if (!valor) return;

            let valorDecimal = 0;

            if (valor.includes(':') || valor.includes('h')) {
                let partes = valor.replace('h', ':').split(':');
                let horas = parseInt(partes[0]) || 0;
                let minutos = parseInt(partes[1]) || 0;
                valorDecimal = horas + (minutos / 60);
            } else {
                valorDecimal = parseFloat(valor.replace(',', '.'));
            }

            if (!isNaN(valorDecimal)) {
                this.value = valorDecimal.toFixed(2).replace('.', ',');
            } else {
                this.value = ''; 
            }
        }); 
    });

    // Início padrão da página
    restaurarDadosFixos();
    alternarModoDias();
    preencherDiasMes(); 

});

