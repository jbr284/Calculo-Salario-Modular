// app.js - SISTEMA DE FOLHA MODULAR DATA CENTERS (INSS, IRRF 2026 + Automação Assistencial)

const regras = {
    "anoVigencia": 2026,
    "salarioMinimo": 1621.00,
    "tetoINSS": 8475.55,
    "percentualAdiantamento": 0.4,
    "percentualAdicionalNoturno": 0.35,
    "descontoFixoVA": 23.97,
    "percentualVT": 0.06,
    "valorSindicato": 50.00, 
    "deducaoPorDependenteIRRF": 189.59,
    
    // TABELA INSS 2026
    "tabelaINSS": [
      { "ate": 1621.00, "aliquota": 0.075, "deduzir": 0 },
      { "ate": 2902.84, "aliquota": 0.09, "deduzir": 24.32 },
      { "ate": 4354.27, "aliquota": 0.12, "deduzir": 111.40 },
      { "ate": 8475.55, "aliquota": 0.14, "deduzir": 198.49 }
    ],
    
    // TABELA IRRF 2026
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
      "plus_individual": 120, // Reajustado
      "plus_familiar": 189   // Reajustado
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
    const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, coparticipacao, assistencial, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;
    
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
    
    // INSS com base abatida
    const baseINSS = totalBruto - descontoFaltas - descontoAtrasos;
    const inss = calcularINSS(baseINSS, regras);
    
    // IRRF
    const baseIRRF = baseINSS - inss;
    const irrf = calcularIRRF(baseIRRF, dependentes, regras, totalBruto);
    
    const descontoPlano = regras.planosSESI[plano] || 0;
    const descontoSindicato = sindicato === 'sim' ? regras.valorSindicato : 0;
    
    // Soma total dos descontos (Incluindo coparticipação)
    const totalDescontos = descontoFaltas + descontoAtrasos + descontoPlano + coparticipacao + assistencial + descontoSindicato + emprestimo + inss + irrf + descontoVA + adiantamento + descontoVT;
    const liquido = totalBruto - totalDescontos;

    const formatarMoedaRef = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return {
        proventos: { 
            vencBase, valorHE50, valorHE60, valorHE80, valorHE100, valorHE150, 
            valorNoturno, dsrHE, dsrNoturno, totalBruto,
            temHE: totalHE > 0, temNoturno: valorNoturno > 0
        },
        descontos: { 
            descontoFaltas, descontoAtrasos, descontoPlano, coparticipacao, assistencial, descontoSindicato, emprestimo, inss, irrf, adiantamento, descontoVA, descontoVT, totalDescontos 
        },
        refs: {
            diasEfetivos: `${diasEfetivos} d`,
            he50: `${he50} h`,
            he60: `${he60} h`,
            he80: `${he80} h`,
            he100: `${he100} h`,
            he150: `${he150} h`,
            noturno: `${noturno} h`,
            dsr: `${domFeriados} d`,
            faltas: `${faltas} d`,
            atrasos: `${atrasos} h`,
            baseINSS: formatarMoedaRef(baseINSS),
            baseIRRF: formatarMoedaRef(baseIRRF),
            vtRef: '6%',
            adiantRef: '40%'
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
        const { proventos, descontos, liquido, fgts, refs } = resultado;
        const liquidoMensal = liquido + descontos.adiantamento;
        
        const row = (label, ref, val, forcar = false) => {
            if (val > 0.01 || forcar) {
                return `<tr>
                            <td>${label}</td>
                            <td style="text-align:center; color:#666; font-size: 13px;">${ref}</td>
                            <td class="valor" style="text-align:right;">${formatarMoeda(val)}</td>
                        </tr>`;
            }
            return '';
        };

        resultContainer.innerHTML = `
            <table class="result-table" style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #ccc;">
                        <th style="text-align:left; padding-bottom: 8px;">Descrição</th>
                        <th style="text-align:center; padding-bottom: 8px;">Ref.</th>
                        <th style="text-align:right; padding-bottom: 8px;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="section-header"><td colspan="3" style="padding-top: 15px; font-weight: bold; color: #0d47a1;">Proventos</td></tr>
                    ${row('Salário Base Proporcional', refs.diasEfetivos, proventos.vencBase)}
                    ${row('Hora Extra 50%', refs.he50, proventos.valorHE50)}
                    ${row('Hora Extra 60%', refs.he60, proventos.valorHE60)}
                    ${row('Hora Extra 80%', refs.he80, proventos.valorHE80)}
                    ${row('Hora Extra 100%', refs.he100, proventos.valorHE100)}
                    ${row('Hora Extra 150%', refs.he150, proventos.valorHE150)}
                    ${row('Adicional Noturno (35%)', refs.noturno, proventos.valorNoturno)}
                    ${row('DSR sobre Horas Extras', refs.dsr, proventos.dsrHE, proventos.temHE)}
                    ${row('DSR sobre Adic. Noturno', refs.dsr, proventos.dsrNoturno, proventos.temNoturno)}
                    <tr class="summary-row">
                        <td colspan="2" style="font-weight:bold; padding-top:10px;">Total Bruto (Tributável)</td>
                        <td class="valor" style="text-align:right; font-weight:bold; padding-top:10px;">${formatarMoeda(proventos.totalBruto)}</td>
                    </tr>
                    
                    <tr class="section-header"><td colspan="3" style="padding-top: 15px; font-weight: bold; color: #d32f2f;">Descontos</td></tr>
                    ${row('INSS', refs.baseINSS, descontos.inss)}
                    ${row('IRRF (Lei 15.270/25)', refs.baseIRRF, descontos.irrf)}
                    ${row('Faltas', refs.faltas, descontos.descontoFaltas)}
                    ${row('Atrasos', refs.atrasos, descontos.descontoAtrasos)}
                    ${row('Adiantamento', refs.adiantRef, descontos.adiantamento)}
                    ${row('Vale Transporte', refs.vtRef, descontos.descontoVT)}
                    ${row('Vale Alimentação', 'Fixo', descontos.descontoVA)}
                    ${row('Convênio SESI', '-', descontos.descontoPlano)}
                    ${row('Coparticipação Convênio', '-', descontos.coparticipacao)}
                    ${row('Contribuição Assistencial', '-', descontos.assistencial)}
                    ${row('Mensalidade Sindical', '-', descontos.descontoSindicato)}
                    ${row('Empréstimo Consignado', '-', descontos.emprestimo)}
                    <tr class="summary-row">
                        <td colspan="2" style="font-weight:bold; padding-top:10px;">Total Descontos</td>
                        <td class="valor" style="text-align:right; font-weight:bold; padding-top:10px;">${formatarMoeda(descontos.totalDescontos)}</td>
                    </tr>
                    
                    <tr class="section-header"><td colspan="3" style="padding-top: 20px;"></td></tr>
                    <tr class="final-result-main">
                        <td colspan="2" style="font-weight:bold; font-size: 16px;">Salário Líquido</td>
                        <td class="valor" style="text-align:right; font-weight:bold; font-size: 16px; color: #2e7d32;">${formatarMoeda(liquido)}</td>
                    </tr>
                    <tr class="final-result-secondary">
                        <td colspan="2" style="color:#666;">Salário Líquido Total (Mês)</td>
                        <td class="valor" style="text-align:right; color:#666;">${formatarMoeda(liquidoMensal)}</td>
                    </tr>
                    <tr class="final-result-secondary fgts-row">
                        <td colspan="2" style="color:#f57c00; font-weight:bold; padding-top:5px;">FGTS (Depósito)</td>
                        <td class="valor" style="text-align:right; color:#f57c00; font-weight:bold; padding-top:5px;">${formatarMoeda(fgts)}</td>
                    </tr>
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
            assistencial: getMoney('assistencial'),
            coparticipacao: getMoney('coparticipacao'), // <- Novo campo recolhido aqui
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
        
        // 1. Calcula a data exata da Páscoa do ano para achar os feriados móveis
        const a = ano % 19;
        const b = Math.floor(ano / 100), c = ano % 100;
        const d = Math.floor(b / 4), e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4), k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31);
        const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;

        const pascoa = new Date(ano, mesPascoa - 1, diaPascoa);
        const sextaSanta = new Date(pascoa); sextaSanta.setDate(pascoa.getDate() - 2);
        const carnaval = new Date(pascoa); carnaval.setDate(pascoa.getDate() - 47);
        const corpusChristi = new Date(pascoa); corpusChristi.setDate(pascoa.getDate() + 60);

        const formatarDDMM = (dt) => String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
        const feriadosMoveis = [formatarDDMM(sextaSanta), formatarDDMM(carnaval), formatarDDMM(corpusChristi)];
        
        // 2. Feriados Fixos Nacionais
        const feriadosFixos = ["01/01", "21/04", "01/05", "07/09", "12/10", "02/11", "15/11", "25/12"];

        // 3. Feriados Extras Manuais
        const extrasStr = document.getElementById('feriadosExtras').value;
        const extrasArray = extrasStr ? extrasStr.split(',').map(d => {
            const pts = d.split('/');
            return String(pts[0]).padStart(2, '0') + '/' + String(pts[1]).padStart(2, '0');
        }) : [];

        let diasUteis = 0;
        let domFeriados = 0;

        // 4. Varredura dia a dia do mês 
        for (let d = 1; d <= diasNoMes; d++) {
            const dataAtual = new Date(ano, mes - 1, d);
            const diaSemana = dataAtual.getDay();
            const dataStr = String(d).padStart(2, '0') + '/' + String(mes).padStart(2, '0');

            const ehDomingo = (diaSemana === 0);
            const ehFeriadoFixo = feriadosFixos.includes(dataStr);
            const ehFeriadoMovel = feriadosMoveis.includes(dataStr);
            const ehFeriadoExtra = extrasArray.includes(dataStr);

            if (ehDomingo || ehFeriadoFixo || ehFeriadoMovel || ehFeriadoExtra) {
                domFeriados++;
            } else {
                diasUteis++;
            }
        }

        document.getElementById('diasUteis').value = diasUteis;
        document.getElementById('domFeriados').value = domFeriados;
        
        if(document.querySelector('input[name="tipoDias"]:checked')?.value !== 'completo') {
            calcularDiasProporcionaisFerias();
        } else {
            document.getElementById('diasTrab').value = 30;
        }
    }

    function salvarDadosFixos() {
        const dados = {
            nome: document.getElementById('nomeColaborador').value,
            cargo: document.getElementById('cargoColaborador').value,
            salario: document.getElementById('salario').value,
            dependentes: document.getElementById('dependentes').value,
            plano: document.getElementById('plano').value,
            sindicato: document.getElementById('sindicato').value
        };
        localStorage.setItem('dadosFixosModular', JSON.stringify(dados));
        alert('Dados salvos na memória!');
    }

    function restaurarDadosFixos() {
        const dados = JSON.parse(localStorage.getItem('dadosFixosModular'));
        if (dados) {
            document.getElementById('nomeColaborador').value = dados.nome || "";
            document.getElementById('cargoColaborador').value = dados.cargo || "";
            document.getElementById('salario').value = dados.salario || "";
            document.getElementById('dependentes').value = dados.dependentes || "";
            document.getElementById('plano').value = dados.plano || "nenhum";
            document.getElementById('sindicato').value = dados.sindicato || "nao";
        }
    }

    function autoCalcularAssistencial() {
        const valStr = document.getElementById('salario').value.replace(/\./g, '').replace(',', '.');
        const salario = parseFloat(valStr) || 0;
        const mesRefStr = document.getElementById('mesReferencia').value;
        const associadoSindicato = document.getElementById('sindicato').value === 'sim';
        
        if (salario > 0 && mesRefStr) {
            const mes = parseInt(mesRefStr.split('-')[1], 10);
            const campoAssistencial = document.getElementById('assistencial');
            
            let aplicaDesconto = false;

            if (associadoSindicato) {
                if (mes >= 1 && mes <= 2) {
                    aplicaDesconto = true;
                }
            } else {
                if (mes >= 1 && mes <= 3) {
                    aplicaDesconto = true;
                }
            }

            if (aplicaDesconto) {
                const valor = salario * 0.02;
                campoAssistencial.value = valor.toFixed(2).replace('.', ',');
            } else {
                campoAssistencial.value = "0,00";
            }
        }
    }

    document.getElementById('btn-calcular').addEventListener('click', handleCalcular);
    document.getElementById('btn-voltar').addEventListener('click', mostrarFormulario);
    document.getElementById('btn-salvar').addEventListener('click', salvarDadosFixos);
    document.getElementById('btn-add-feriado').addEventListener('click', adicionarFeriado);
    document.getElementById('btn-limpar-feriados').addEventListener('click', () => { if(confirm('Limpar?')) { document.getElementById('feriadosExtras').value=''; document.getElementById('listaFeriados').innerHTML=''; preencherDiasMes(); } });
    
    // --- FUNÇÃO DO PDF (Forçando 1 Página Única) ---
    document.getElementById('btn-pdf').addEventListener('click', () => {
        const elementoAlvo = document.querySelector('.report-card');
        
        // 1. Aplica o modo compacto instantâneo para caber numa folha
        elementoAlvo.classList.add('pdf-compacto');
        
        const opt = { 
            margin: [10, 10, 10, 10], // Margens menores para aproveitar o A4
            filename: 'demonstrativo-modular.pdf', 
            image: { type: 'jpeg', quality: 1 }, 
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                scrollY: 0     
            }, 
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
        };
        
        // 2. Tira a fotografia, gera o PDF e DEPOIS volta o ecrã ao normal
        html2pdf().set(opt).from(elementoAlvo).save().then(() => {
            elementoAlvo.classList.remove('pdf-compacto');
        });
    });

    mesReferenciaInput.addEventListener('change', () => {
        preencherDiasMes();
        autoCalcularAssistencial();
    });
    
    document.getElementById('salario').addEventListener('blur', autoCalcularAssistencial);
    document.getElementById('sindicato').addEventListener('change', autoCalcularAssistencial);

    inicioFeriasInput.addEventListener('change', calcularDiasProporcionaisFerias);
    qtdDiasFeriasInput.addEventListener('input', calcularDiasProporcionaisFerias);
    document.querySelectorAll('input[name="tipoDias"]').forEach(radio => radio.addEventListener('change', alternarModoDias));
    
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

    restaurarDadosFixos();
    alternarModoDias();
    preencherDiasMes(); 
    autoCalcularAssistencial(); 
});
