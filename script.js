const ROTULOS = {
    faltaJustificada: "FALTA JUSTIFICADA",
    atestadoMedico: "ATESTADO MÉDICO",
    feriado: "FERIADO",
    pontoFacultativo: "PONTO FACULTATIVO"
};

const ESTADOS = { NORMAL: 0, JUSTIFICADA: 1, MEDICO: 2 };

const pt1 = "AIzaSyCswoX";
const pt2 = "WBPacdMKfHKUBil";
const pt3 = "i4SwHUj7566L8";

const firebaseConfig = {
    apiKey: pt1 + pt2 + pt3,
    authDomain: "folha-de-ponto-cmei.firebaseapp.com",
    databaseURL: "https://folha-de-ponto-cmei-default-rtdb.firebaseio.com",
    projectId: "folha-de-ponto-cmei",
    storageBucket: "folha-de-ponto-cmei.firebasestorage.app",
    messagingSenderId: "363750832405",
    appId: "1:363750832405:web:d0050043e6f2b4fde1111c",
    measurementId: "G-L5VZDVXHG6"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

let memoriaNuvem = {};
let bancoServidores = [];

function escapeHtml(unsafe) {
    return (unsafe || "").toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function mascaraCPF(campo) {
    let cpf = campo.value || campo.textContent;
    cpf = cpf.replace(/\D/g, "");
    cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2");
    cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2");
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

    if (campo.value !== undefined) campo.value = cpf;
    else if (campo.textContent !== undefined) campo.textContent = cpf;
}

function cpfBasicoValido(cpf) { return cpf.replace(/[^\d]/g, '').length === 11; }

function mostrarCarregamento(mensagem = "☁️ Conectando ao Banco de Dados CMEI...") {
    const tela = document.getElementById('tela-carregamento');
    if (tela) {
        tela.textContent = mensagem;
        tela.style.display = 'flex';
    }
}

function esconderCarregamento() {
    const tela = document.getElementById('tela-carregamento');
    if (tela) tela.style.display = 'none';
}

const isLoginPage = window.location.pathname.includes('login.html');

auth.onAuthStateChanged((user) => {
    if (user) {
        if (isLoginPage) {
            window.location.href = 'index.html';
        } else {
            const telaLogin = document.getElementById('tela-login');
            if (telaLogin) telaLogin.style.display = 'none';
            mostrarCarregamento();
            carregarDadosDaNuvem();
        }
    } else {
        if (!isLoginPage) {
            window.location.href = 'login.html';
        } else {
            const telaLogin = document.getElementById('tela-login');
            if (telaLogin) telaLogin.style.display = 'flex';
            esconderCarregamento();
        }
    }
});

function fazerLogin() {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const msgErro = document.getElementById('mensagem-erro');

    if (!email || !senha) { msgErro.textContent = "Preencha o e-mail e a senha."; msgErro.style.display = 'block'; return; }

    auth.signInWithEmailAndPassword(email, senha)
        .then(() => { msgErro.style.display = 'none'; })
        .catch((error) => {
            let mensagem = "E-mail ou senha incorretos!";
            if (error.code === 'auth/network-request-failed' || error.code === 'auth/api-key-not-valid') mensagem = "Bloqueado por Segurança. Teste através do link do GitHub!";
            else if (error.code === 'auth/too-many-requests') mensagem = "Muitas tentativas. Tente novamente mais tarde.";
            else if (error.code === 'auth/user-not-found') mensagem = "Usuário não encontrado.";
            msgErro.textContent = mensagem;
            msgErro.style.display = 'block';
        });
}

function fazerLogout() {
    auth.signOut().then(() => {
        memoriaNuvem = {};
        bancoServidores = [];
        const inputSenha = document.getElementById('login-senha');
        if (inputSenha) inputSenha.value = '';
    });
}

function carregarDadosDaNuvem() {
    database.ref('cmei_dados').once('value')
        .then((snapshot) => {
            memoriaNuvem = snapshot.val() || {};
            if (memoriaNuvem['listaServidores']) {
                bancoServidores = JSON.parse(memoriaNuvem['listaServidores']);
                let precisaSalvarNaDescida = false;
                bancoServidores.forEach(s => {
                    let cat = s.categoria || "";
                    if (cat === "A - DIREÇÃO E COORDENAÇÃO" || cat === "D - SECRETARIA") { s.categoria = "A - ADMINISTRATIVO"; precisaSalvarNaDescida = true; }
                    else if (cat === "C - AUXILIARES DE CLASSE" || cat === "H - OUTROS") { s.categoria = "C - MONITORAS"; precisaSalvarNaDescida = true; }
                    else if (cat === "B - PROFESSORES") { s.categoria = "B - PROFESSORAS"; precisaSalvarNaDescida = true; }
                    else if (cat === "E - SERVIÇOS GERAIS" || cat === "F - COZINHA E MERENDA" || cat === "G - PORTARIA E SEGURANÇA" || !cat) { s.categoria = "D - EQUIPE DE APOIO"; precisaSalvarNaDescida = true; }
                });
                if (precisaSalvarNaDescida) { salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores)); }
            } else {
                bancoServidores = [{ nome: "FERNANDA DE JESUS ALMEIDA", cpf: "049.131.865-07", cargo: "AUXILIAR DE COORDENAÇÃO", categoria: "A - ADMINISTRATIVO", turno: "MANUAL" }];
            }
            esconderCarregamento();
            carregarListaServidores();
            carregarDadosEditaveis();
            gerarFolha();
        })
        .catch(() => { alert("Erro ao conectar no banco de dados."); esconderCarregamento(); });
}

function salvarNaNuvem(chave, valor) {
    memoriaNuvem[chave] = valor;
    database.ref('cmei_dados/' + chave).set(valor);
}

function removerDaNuvem(chave) {
    delete memoriaNuvem[chave];
    database.ref('cmei_dados/' + chave).remove();
}

function revelarBackup() {
    const painel = document.getElementById('painel-secreto');
    painel.style.display = painel.style.display === 'none' ? 'flex' : 'none';
    if (painel.style.display === 'flex') alert("🔓 Modo Administrador ativado!");
}

function organizarEOrdenarServidores() {
    bancoServidores.sort((a, b) => {
        let catA = a.categoria || "D - EQUIPE DE APOIO";
        let catB = b.categoria || "D - EQUIPE DE APOIO";
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return a.nome.localeCompare(b.nome);
    });
}

function carregarListaServidores() {
    const seletor = document.getElementById('seletor-servidor');
    seletor.innerHTML = '<option value="">-- Selecione ou Digite Abaixo --</option>';
    organizarEOrdenarServidores();

    let categoriaAtual = "";
    let optGroupAtual = null;

    bancoServidores.forEach((servidor, index) => {
        let cat = servidor.categoria || "D - EQUIPE DE APOIO";
        if (cat !== categoriaAtual) {
            categoriaAtual = cat;
            optGroupAtual = document.createElement('optgroup');
            optGroupAtual.label = "📌 " + cat.substring(4);
            seletor.appendChild(optGroupAtual);
        }
        let opcao = document.createElement('option');
        opcao.value = index;
        opcao.text = servidor.nome;
        if (optGroupAtual) optGroupAtual.appendChild(opcao);
        else seletor.appendChild(opcao);
    });
}

function preencherServidor() {
    const index = document.getElementById('seletor-servidor').value;
    if (index !== "") {
        const servidor = bancoServidores[index];
        document.getElementById('servidor-nome').textContent = servidor.nome;
        document.getElementById('servidor-cpf').textContent = servidor.cpf;
        document.getElementById('servidor-cargo').textContent = servidor.cargo;
        document.getElementById('seletor-turno').value = servidor.turno || "MANUAL";
    } else {
        document.getElementById('servidor-nome').textContent = "SELECIONE NA LISTA ACIMA";
        document.getElementById('servidor-cpf').textContent = "000.000.000-00";
        document.getElementById('servidor-cargo').textContent = "...";
        document.getElementById('seletor-turno').value = "MANUAL";
    }
    gerarFolha();
}

function atualizarTurno() {
    const index = document.getElementById('seletor-servidor').value;
    if (index === "") return;
    const novoTurno = document.getElementById('seletor-turno').value;

    if (bancoServidores[index].turno !== novoTurno) {
        bancoServidores[index].turno = novoTurno;
        salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores));
        gerarFolha();
    }
}

function obterCelulasHoras(turno) {
    if (turno === "MATUTINO") return `<td>08:00</td><td>12:00</td><td>---</td><td>---</td>`;
    if (turno === "VESPERTINO") return `<td>---</td><td>---</td><td>13:00</td><td>17:00</td>`;
    if (turno === "INTEGRAL") return `<td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td>`;
    return `<td></td><td></td><td></td><td></td>`;
}

function abrirModal() { document.getElementById('modalAdd').style.display = 'flex'; }
function fecharModal() { document.getElementById('modalAdd').style.display = 'none';['novo-nome', 'novo-cpf', 'novo-cargo'].forEach(id => document.getElementById(id).value = ''); document.getElementById('novo-categoria').value = ''; document.getElementById('novo-turno').value = 'MANUAL'; }

function salvarNovoServidor() {
    let nome = document.getElementById('novo-nome').value.trim();
    let cpf = document.getElementById('novo-cpf').value.trim();
    let cargo = document.getElementById('novo-cargo').value.trim();
    let categoria = document.getElementById('novo-categoria').value;
    let turno = document.getElementById('novo-turno').value;

    if (!nome || !cpf || !cargo || !categoria) { alert("Preencha todos os campos e selecione o Setor!"); return; }
    if (!cpfBasicoValido(cpf)) { alert("CPF inválido (deve conter 11 dígitos)."); return; }
    if (bancoServidores.some(s => s.cpf === cpf || s.nome === nome)) { alert("❌ Erro: Já existe um servidor com este Nome ou CPF!"); return; }

    bancoServidores.push({ nome, cpf, cargo, categoria, turno });
    organizarEOrdenarServidores();
    salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores));
    carregarListaServidores();
    fecharModal();

    let novaPosicao = bancoServidores.findIndex(s => s.cpf === cpf);
    document.getElementById('seletor-servidor').value = novaPosicao;
    preencherServidor();
}

function removerServidor() {
    const index = document.getElementById('seletor-servidor').value;
    if (index === "") { alert("⚠️ Selecione um servidor na lista para remover."); return; }
    if (confirm(`Remover ${bancoServidores[index].nome} permanentemente?`)) {
        bancoServidores.splice(index, 1);
        salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores));
        carregarListaServidores();
        preencherServidor();
    }
}

function atualizarServidorEditado() {
    const index = document.getElementById('seletor-servidor').value;
    if (index === "") return;
    let novoNome = document.getElementById('servidor-nome').textContent.trim().toUpperCase();
    let novoCpf = document.getElementById('servidor-cpf').textContent.trim();
    let novoCargo = document.getElementById('servidor-cargo').textContent.trim().toUpperCase();
    let alterou = false;

    if (bancoServidores[index].nome !== novoNome) { bancoServidores[index].nome = novoNome; alterou = true; }
    if (bancoServidores[index].cpf !== novoCpf) { bancoServidores[index].cpf = novoCpf; alterou = true; }
    if (bancoServidores[index].cargo !== novoCargo) { bancoServidores[index].cargo = novoCargo; alterou = true; }

    if (alterou) {
        salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores));
        let valorAtual = index;
        carregarListaServidores();
        document.getElementById('seletor-servidor').value = valorAtual;
    }
}

function carregarDadosEditaveis() {
    document.getElementById('servidor-nome').addEventListener('blur', atualizarServidorEditado);
    document.getElementById('servidor-cpf').addEventListener('blur', atualizarServidorEditado);
    document.getElementById('servidor-cargo').addEventListener('blur', atualizarServidorEditado);
}

window.salvarRotulo = function (elemento) {
    let chave = elemento.getAttribute('data-chave');
    let dados = JSON.parse(memoriaNuvem[chave] || '{"estado":1,"motivo":"","rotulo":""}');
    dados.rotulo = elemento.textContent.toUpperCase();
    salvarNaNuvem(chave, JSON.stringify(dados));
}

window.salvarMotivo = function (elemento) {
    let chave = elemento.getAttribute('data-chave');
    let dados = JSON.parse(memoriaNuvem[chave] || '{"estado":1,"motivo":"","rotulo":""}');
    dados.motivo = elemento.textContent;
    salvarNaNuvem(chave, JSON.stringify(dados));
}

function obterConteudoLinha(dados, tipo, chave) {
    let rotuloPadrao = "";
    if (tipo === 'geral') { rotuloPadrao = (dados.estado === ESTADOS.JUSTIFICADA) ? ROTULOS.feriado : ROTULOS.pontoFacultativo; }
    else { rotuloPadrao = (dados.estado === ESTADOS.JUSTIFICADA) ? ROTULOS.faltaJustificada : ROTULOS.atestadoMedico; }

    let rotuloExibido = dados.rotulo || rotuloPadrao;
    const classe = tipo === 'geral' ? 'fim-de-semana' : 'linha-individual';
    let chaveSafe = escapeHtml(chave);

    return `<td colspan="5" class="${classe}">
                <span class="rotulo-editavel" data-chave="${chaveSafe}" contenteditable="true" spellcheck="false" onclick="event.stopPropagation()" oninput="salvarRotulo(this)">${escapeHtml(rotuloExibido)}</span> 
                <span class="motivo-feriado" data-chave="${chaveSafe}" contenteditable="true" spellcheck="false" onclick="event.stopPropagation()" oninput="salvarMotivo(this)">${escapeHtml(dados.motivo || '')}</span>
            </td>`;
}

window.toggleSabado = function (ano, mes, dia) {
    let chave = `sabado_aberto_${ano}_${mes}_${dia}`;
    if (memoriaNuvem[chave]) { removerDaNuvem(chave); } else { salvarNaNuvem(chave, "1"); }
    gerarFolha();
};

function alternarFeriadoGeral(linhaElemento, ano, mes, diaNumero, celulaDiaHtml) {
    let estadoAtual = parseInt(linhaElemento.getAttribute('data-estado-geral') || '0');
    let novoEstado = (estadoAtual + 1) % 3;
    linhaElemento.setAttribute('data-estado-geral', novoEstado);
    linhaElemento.setAttribute('data-estado-individual', '0');

    let index = document.getElementById('seletor-servidor').value;
    let nomeAtual = document.getElementById('servidor-nome').textContent;
    let turnoAtual = index !== "" ? (bancoServidores[index].turno || "MANUAL") : "MANUAL";
    let chave = `feriado_${ano}_${mes}_${diaNumero}`;
    removerDaNuvem(`ausencia_${nomeAtual}_${ano}_${mes}_${diaNumero}`);

    if (novoEstado === ESTADOS.NORMAL) {
        linhaElemento.innerHTML = celulaDiaHtml + obterCelulasHoras(turnoAtual) + `<td></td>`;
        removerDaNuvem(chave);
    } else {
        let dadosAntigos = memoriaNuvem[chave] ? JSON.parse(memoriaNuvem[chave]) : {};
        let novoRotulo = (dadosAntigos.estado === novoEstado) ? (dadosAntigos.rotulo || "") : "";
        let dados = { estado: novoEstado, motivo: dadosAntigos.motivo || "", rotulo: novoRotulo };

        linhaElemento.innerHTML = celulaDiaHtml + obterConteudoLinha(dados, 'geral', chave);
        salvarNaNuvem(chave, JSON.stringify(dados));
    }
}

function alternarAusenciaIndividual(linhaElemento, ano, mes, diaNumero, evento, celulaDiaHtml) {
    evento.preventDefault();
    let index = document.getElementById('seletor-servidor').value;
    let nomeAtual = document.getElementById('servidor-nome').textContent;
    let turnoAtual = index !== "" ? (bancoServidores[index].turno || "MANUAL") : "MANUAL";

    if (nomeAtual === "SELECIONE NA LISTA ACIMA" || nomeAtual === "") { alert("⚠️ Selecione um servidor primeiro."); return; }

    let estadoAtual = parseInt(linhaElemento.getAttribute('data-estado-individual') || '0');
    let novoEstado = (estadoAtual + 1) % 3;
    linhaElemento.setAttribute('data-estado-individual', novoEstado);

    let chave = `ausencia_${nomeAtual}_${ano}_${mes}_${diaNumero}`;

    if (novoEstado === ESTADOS.NORMAL) {
        let temFeriadoGeral = memoriaNuvem[`feriado_${ano}_${mes}_${diaNumero}`];
        if (temFeriadoGeral) {
            let dadosGeral = JSON.parse(temFeriadoGeral);
            let chaveGeral = `feriado_${ano}_${mes}_${diaNumero}`;
            linhaElemento.innerHTML = celulaDiaHtml + obterConteudoLinha(dadosGeral, 'geral', chaveGeral);
            linhaElemento.setAttribute('data-estado-geral', dadosGeral.estado);
        } else {
            linhaElemento.innerHTML = celulaDiaHtml + obterCelulasHoras(turnoAtual) + `<td></td>`;
            linhaElemento.setAttribute('data-estado-geral', '0');
        }
        removerDaNuvem(chave);
    } else {
        let dadosAntigos = memoriaNuvem[chave] ? JSON.parse(memoriaNuvem[chave]) : {};
        let novoRotulo = (dadosAntigos.estado === novoEstado) ? (dadosAntigos.rotulo || "") : "";
        let dados = { estado: novoEstado, motivo: dadosAntigos.motivo || "", rotulo: novoRotulo };

        linhaElemento.innerHTML = celulaDiaHtml + obterConteudoLinha(dados, 'individual', chave);
        salvarNaNuvem(chave, JSON.stringify(dados));
    }
}

function gerarFolha() {
    const selectMes = document.getElementById('mes');
    const mes = parseInt(selectMes.value);
    const nomeMes = selectMes.options[selectMes.selectedIndex].text;
    const ano = parseInt(document.getElementById('ano').value);

    const index = document.getElementById('seletor-servidor').value;
    const nomeAtual = document.getElementById('servidor-nome').textContent;
    const turnoAtual = index !== "" ? (bancoServidores[index].turno || "MANUAL") : "MANUAL";

    document.getElementById('titulo-periodo').textContent = `Folha de Ponto - Período: ${nomeMes} ${ano}`;

    const corpoTabela = document.getElementById('corpo-tabela');
    corpoTabela.innerHTML = '';
    const diasNoMes = new Date(ano, mes, 0).getDate();

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const diaDaSemana = new Date(ano, mes - 1, dia).getDay();
        const tr = document.createElement('tr');

        let isSabadoAberto = memoriaNuvem[`sabado_aberto_${ano}_${mes}_${dia}`] === "1";

        if (diaDaSemana === 0) {
            tr.innerHTML = `<td>${dia}</td><td colspan="5" class="fim-de-semana">DOMINGO</td>`;
        } else if (diaDaSemana === 6 && !isSabadoAberto) {
            tr.className = "dia-util";
            tr.innerHTML = `<td>${dia}</td><td colspan="5" class="fim-de-semana" style="color: #2B6CB0;">
                        <span class="esconder-impressao" style="text-decoration: underline; cursor: pointer;">SÁBADO (Clique para abrir)</span>
                        <span class="mostrar-impressao">SÁBADO</span>
                    </td>`;
            tr.onclick = function () { toggleSabado(ano, mes, dia); };
        } else {
            tr.className = "dia-util";
            tr.setAttribute('tabindex', '0');
            tr.setAttribute('role', 'button');

            let chaveGeral = `feriado_${ano}_${mes}_${dia}`;
            let chaveIndiv = `ausencia_${nomeAtual}_${ano}_${mes}_${dia}`;
            let dadosGeral = memoriaNuvem[chaveGeral];
            let dadosIndiv = memoriaNuvem[chaveIndiv];

            let celulaDiaHtml = `<td>${dia}`;
            if (diaDaSemana === 6 && isSabadoAberto) {
                celulaDiaHtml += ` <span class="esconder-impressao" style="cursor: pointer; color: #e53e3e; font-size: 11px; font-weight: bold;" onclick="event.stopPropagation(); toggleSabado(${ano}, ${mes}, ${dia})" title="Fechar Sábado">⮌</span>`;
            }
            celulaDiaHtml += `</td>`;

            if (dadosIndiv) {
                let info = JSON.parse(dadosIndiv);
                tr.setAttribute('data-estado-individual', info.estado);
                tr.innerHTML = celulaDiaHtml + obterConteudoLinha(info, 'individual', chaveIndiv);
            } else if (dadosGeral) {
                let info = JSON.parse(dadosGeral);
                tr.setAttribute('data-estado-geral', info.estado);
                tr.innerHTML = celulaDiaHtml + obterConteudoLinha(info, 'geral', chaveGeral);
            } else {
                tr.setAttribute('data-estado-geral', '0');
                tr.setAttribute('data-estado-individual', '0');
                tr.innerHTML = celulaDiaHtml + obterCelulasHoras(turnoAtual) + `<td></td>`;
            }

            tr.onclick = function () { alternarFeriadoGeral(this, ano, mes, dia, celulaDiaHtml); };
            tr.oncontextmenu = function (evento) { alternarAusenciaIndividual(this, ano, mes, dia, evento, celulaDiaHtml); };
        }
        corpoTabela.appendChild(tr);
    }
}

function exportarExcel() {
    if (bancoServidores.length === 0) { alert("A lista de servidores está vazia!"); return; }

    let csv = '\uFEFF';
    csv += "NOME;CPF;CARGO;SETOR;TURNO\n";

    bancoServidores.forEach(s => {
        let turnoFormatado = s.turno || "MANUAL";
        csv += `${s.nome};${s.cpf};${s.cargo};${s.categoria};${turnoFormatado}\n`;
    });

    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    let url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "RH_Servidores_CMEI.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function imprimirTodosLote() {
    if (bancoServidores.length === 0) { alert("A lista de servidores está vazia!"); return; }

    const filtroSetor = document.getElementById('filtro-setor').value;
    const servidoresFiltrados = bancoServidores.filter(s => filtroSetor === "TODOS" || (s.categoria || "D - EQUIPE DE APOIO") === filtroSetor);
    if (servidoresFiltrados.length === 0) { alert("Nenhum servidor encontrado neste setor!"); return; }

    mostrarCarregamento("🖨️ Preparando impressões em lote...");
    let indiceOriginal = document.getElementById('seletor-servidor').value;
    const printWrapper = document.getElementById('print-wrapper');
    printWrapper.innerHTML = '';
    document.body.classList.add('modo-lote');

    for (let i = 0; i < bancoServidores.length; i++) {
        let servidor = bancoServidores[i];
        let categoriaServidor = servidor.categoria || "D - EQUIPE DE APOIO";

        if (filtroSetor === "TODOS" || categoriaServidor === filtroSetor) {
            document.getElementById('seletor-servidor').value = i;
            preencherServidor();
            let cloneArea = document.getElementById('folha-impressao').cloneNode(true);
            cloneArea.removeAttribute('id');
            cloneArea.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            cloneArea.classList.add('quebra-pagina');
            printWrapper.appendChild(cloneArea);
        }
    }

    setTimeout(() => { window.print(); esconderCarregamento(); }, 500);

    window.onafterprint = function () {
        document.body.classList.remove('modo-lote');
        printWrapper.innerHTML = '';
        document.getElementById('seletor-servidor').value = indiceOriginal || "";
        preencherServidor();
        gerarFolha();
        window.onafterprint = null;
    };
}

function exportarBackup() {
    let link = document.createElement("a");
    link.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memoriaNuvem)));
    link.setAttribute("download", "backup_escola_pontos.json");
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function importarBackup(evento) {
    let ficheiro = evento.target.files[0];
    if (!ficheiro) return;
    let leitor = new FileReader();
    leitor.onload = function (e) {
        try {
            let dados = JSON.parse(e.target.result);
            database.ref('cmei_dados').set(dados).then(() => { alert("✅ Backup restaurado!"); location.reload(); });
        } catch (err) { alert("❌ Arquivo inválido!"); }
    };
    leitor.readAsText(ficheiro);
    evento.target.value = "";
}
