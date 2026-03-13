// ============================================================
// CONSTANTES E CONFIGURAÇÃO
// ============================================================

const ROTULOS = {
    faltaJustificada: "FALTA JUSTIFICADA",
    atestadoMedico: "ATESTADO MÉDICO",
    feriado: "FERIADO",
    pontoFacultativo: "PONTO FACULTATIVO"
};

const ESTADOS = { NORMAL: 0, JUSTIFICADA: 1, MEDICO: 2 };

const TURNOS = {
    MANUAL: "MANUAL",
    MATUTINO: "MATUTINO",
    VESPERTINO: "VESPERTINO",
    INTEGRAL: "INTEGRAL"
};

const CATEGORIAS = {
    ADMINISTRATIVO: "A - ADMINISTRATIVO",
    PROFESSORAS: "B - PROFESSORAS",
    MONITORAS: "C - MONITORAS",
    APOIO: "D - EQUIPE DE APOIO"
};

const SERVIDOR_PADRAO = {
    nome: "SELECIONE NA LISTA ACIMA",
    cpf: "000.000.000-00",
    cargo: "..."
};

const TIMEOUT_INATIVIDADE = 30 * 60 * 1000; // 30 minutos
const AVISO_INATIVIDADE = 25 * 60 * 1000;   // aviso aos 25 min
const MAX_HISTORICO = 20;

// ============================================================
// CACHE DE SELETORES DOM (lazy getters)
// ============================================================

const DOM = {
    telaCarregamento: () => document.getElementById('tela-carregamento'),
    seletorServidor: () => document.getElementById('seletor-servidor'),
    servidorNome: () => document.getElementById('servidor-nome'),
    servidorCpf: () => document.getElementById('servidor-cpf'),
    servidorCargo: () => document.getElementById('servidor-cargo'),
    seletorTurno: () => document.getElementById('seletor-turno'),
    tituloPeriodo: () => document.getElementById('titulo-periodo'),
    corpoTabela: () => document.getElementById('corpo-tabela'),
    selectMes: () => document.getElementById('mes'),
    selectAno: () => document.getElementById('ano'),
    filtroSetor: () => document.getElementById('filtro-setor'),
    painelSecreto: () => document.getElementById('painel-secreto'),
    modalAdd: () => document.getElementById('modalAdd'),
    printWrapper: () => document.getElementById('print-wrapper'),
    folhaImpressao: () => document.getElementById('folha-impressao'),
    fileImport: () => document.getElementById('file-import'),
    toastContainer: () => document.getElementById('toast-container'),
    statusNuvem: () => document.getElementById('status-nuvem'),
    buscaServidor: () => document.getElementById('busca-servidor'),
    resumoFolha: () => document.getElementById('resumo-folha'),
    // Campos do modal
    novoNome: () => document.getElementById('novo-nome'),
    novoCpf: () => document.getElementById('novo-cpf'),
    novoCargo: () => document.getElementById('novo-cargo'),
    novoCategoria: () => document.getElementById('novo-categoria'),
    novoTurno: () => document.getElementById('novo-turno'),
    // Login
    loginEmail: () => document.getElementById('login-email'),
    loginSenha: () => document.getElementById('login-senha'),
    mensagemErro: () => document.getElementById('mensagem-erro'),
    telaLogin: () => document.getElementById('tela-login'),
};

// ============================================================
// FIREBASE
// ============================================================

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

// ============================================================
// ESTADO GLOBAL
// ============================================================

let memoriaNuvem = {};
let bancoServidores = [];
let historicoAcoes = []; // Pilha para Ctrl+Z
let timerInatividade = null;
let timerAvisoInatividade = null;
let salvamentoTimeout = null;

// ============================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================

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

function cpfBasicoValido(cpf) {
    return cpf.replace(/[^\d]/g, '').length === 11;
}

function obterTurnoAtual() {
    const index = DOM.seletorServidor().value;
    return index !== "" ? (bancoServidores[index].turno || TURNOS.MANUAL) : TURNOS.MANUAL;
}

function obterNomeAtual() {
    return DOM.servidorNome().textContent;
}

// ============================================================
// 1. SISTEMA DE TOAST (substitui alert())
// ============================================================

function mostrarToast(mensagem, tipo = 'info', duracao = 3500) {
    const container = DOM.toastContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `<span class="toast-msg">${mensagem}</span><button class="toast-fechar" aria-label="Fechar">✕</button>`;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('toast-visivel'));

    const remover = () => {
        toast.classList.remove('toast-visivel');
        toast.classList.add('toast-saindo');
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-fechar').addEventListener('click', remover);
    setTimeout(remover, duracao);
}

// ============================================================
// 2. INDICADOR DE SALVAMENTO NA NUVEM
// ============================================================

function mostrarSalvando() {
    const el = DOM.statusNuvem();
    if (!el) return;
    el.textContent = '☁️ Salvando...';
    el.classList.add('salvando');
    el.classList.remove('salvo');
}

function mostrarSalvo() {
    const el = DOM.statusNuvem();
    if (!el) return;
    el.textContent = '✅ Salvo';
    el.classList.remove('salvando');
    el.classList.add('salvo');
    clearTimeout(salvamentoTimeout);
    salvamentoTimeout = setTimeout(() => {
        el.textContent = '☁️';
        el.classList.remove('salvo');
    }, 2500);
}

// ============================================================
// CARREGAMENTO / UI
// ============================================================

function mostrarCarregamento(mensagem = "☁️ Conectando ao Banco de Dados AutomaPonto...") {
    const tela = DOM.telaCarregamento();
    if (tela) {
        tela.textContent = mensagem;
        tela.style.display = 'flex';
    }
}

function esconderCarregamento() {
    const tela = DOM.telaCarregamento();
    if (tela) tela.style.display = 'none';
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================

const isLoginPage = window.location.pathname.includes('login.html');

auth.onAuthStateChanged((user) => {
    if (user) {
        if (isLoginPage) {
            window.location.href = 'index.html';
        } else {
            const telaLogin = DOM.telaLogin();
            if (telaLogin) telaLogin.style.display = 'none';
            mostrarCarregamento();
            carregarDadosDaNuvem();
            iniciarTimerInatividade();
        }
    } else {
        pararTimerInatividade();
        if (!isLoginPage) {
            window.location.href = 'login.html';
        } else {
            const telaLogin = DOM.telaLogin();
            if (telaLogin) telaLogin.style.display = 'flex';
            esconderCarregamento();
        }
    }
});

function fazerLogin() {
    const email = DOM.loginEmail().value.trim();
    const senha = DOM.loginSenha().value;
    const msgErro = DOM.mensagemErro();

    if (!email || !senha) {
        msgErro.textContent = "Preencha o e-mail e a senha.";
        msgErro.style.display = 'block';
        return;
    }

    auth.signInWithEmailAndPassword(email, senha)
        .then(() => {
            msgErro.style.display = 'none';
        })
        .catch((error) => {
            const mensagens = {
                'auth/network-request-failed': "Bloqueado por Segurança. Teste através do link do GitHub!",
                'auth/api-key-not-valid': "Bloqueado por Segurança. Teste através do link do GitHub!",
                'auth/too-many-requests': "Muitas tentativas. Tente novamente mais tarde.",
                'auth/user-not-found': "Usuário não encontrado."
            };
            msgErro.textContent = mensagens[error.code] || "E-mail ou senha incorretos!";
            msgErro.style.display = 'block';
        });
}

function fazerLogout() {
    pararTimerInatividade();
    auth.signOut().then(() => {
        memoriaNuvem = {};
        bancoServidores = [];
        historicoAcoes = [];
        const inputSenha = DOM.loginSenha();
        if (inputSenha) inputSenha.value = '';
    });
}

// ============================================================
// 7. AUTO-LOGOUT POR INATIVIDADE
// ============================================================

function iniciarTimerInatividade() {
    if (isLoginPage) return;
    resetarTimerInatividade();

    const eventos = ['mousemove', 'keypress', 'click', 'touchstart', 'scroll'];
    eventos.forEach(ev => document.addEventListener(ev, resetarTimerInatividade, { passive: true }));
}

function pararTimerInatividade() {
    clearTimeout(timerInatividade);
    clearTimeout(timerAvisoInatividade);
    timerInatividade = null;
    timerAvisoInatividade = null;
}

function resetarTimerInatividade() {
    clearTimeout(timerInatividade);
    clearTimeout(timerAvisoInatividade);

    timerAvisoInatividade = setTimeout(() => {
        mostrarToast("⏳ Sessão expira em 5 minutos por inatividade", "aviso", 10000);
    }, AVISO_INATIVIDADE);

    timerInatividade = setTimeout(() => {
        mostrarToast("🔒 Sessão encerrada por inatividade", "erro", 5000);
        setTimeout(() => fazerLogout(), 1500);
    }, TIMEOUT_INATIVIDADE);
}

// ============================================================
// BANCO DE DADOS (NUVEM)
// ============================================================

function salvarNaNuvem(chave, valor) {
    memoriaNuvem[chave] = valor;
    mostrarSalvando();
    database.ref('cmei_dados/' + chave).set(valor)
        .then(() => mostrarSalvo())
        .catch(() => {
            const el = DOM.statusNuvem();
            if (el) { el.textContent = '❌ Erro'; el.classList.remove('salvando'); }
        });
}

function removerDaNuvem(chave) {
    delete memoriaNuvem[chave];
    mostrarSalvando();
    database.ref('cmei_dados/' + chave).remove()
        .then(() => mostrarSalvo())
        .catch(() => {
            const el = DOM.statusNuvem();
            if (el) { el.textContent = '❌ Erro'; el.classList.remove('salvando'); }
        });
}

/**
 * Migra categorias legadas para as novas categorias consolidadas.
 * Retorna `true` se alguma migração foi realizada.
 */
function migrarCategoriasLegadas(servidores) {
    const mapeamento = {
        "A - DIREÇÃO E COORDENAÇÃO": CATEGORIAS.ADMINISTRATIVO,
        "D - SECRETARIA": CATEGORIAS.ADMINISTRATIVO,
        "C - AUXILIARES DE CLASSE": CATEGORIAS.MONITORAS,
        "H - OUTROS": CATEGORIAS.MONITORAS,
        "B - PROFESSORES": CATEGORIAS.PROFESSORAS,
        "E - SERVIÇOS GERAIS": CATEGORIAS.APOIO,
        "F - COZINHA E MERENDA": CATEGORIAS.APOIO,
        "G - PORTARIA E SEGURANÇA": CATEGORIAS.APOIO,
    };

    let houveMigracao = false;

    servidores.forEach(s => {
        const cat = s.categoria || "";
        if (mapeamento[cat] || !cat) {
            s.categoria = mapeamento[cat] || CATEGORIAS.APOIO;
            houveMigracao = true;
        }
    });

    return houveMigracao;
}

function carregarDadosDaNuvem() {
    database.ref('cmei_dados').once('value')
        .then((snapshot) => {
            memoriaNuvem = snapshot.val() || {};

            if (memoriaNuvem['listaServidores']) {
                bancoServidores = JSON.parse(memoriaNuvem['listaServidores']);
                if (migrarCategoriasLegadas(bancoServidores)) {
                    salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores));
                }
            } else {
                bancoServidores = [{
                    nome: "FERNANDA DE JESUS ALMEIDA",
                    cpf: "049.131.865-07",
                    cargo: "AUXILIAR DE COORDENAÇÃO",
                    categoria: CATEGORIAS.ADMINISTRATIVO,
                    turno: TURNOS.MANUAL
                }];
            }

            esconderCarregamento();
            carregarListaServidores();
            carregarDadosEditaveis();
            gerarFolha();
        })
        .catch((err) => {
            console.error("Erro ao conectar no banco de dados:", err);
            mostrarToast("❌ Erro ao conectar no banco de dados. Verifique sua conexão.", "erro", 6000);
            esconderCarregamento();
        });
}

// ============================================================
// PAINEL ADMINISTRADOR
// ============================================================

function revelarBackup() {
    const painel = DOM.painelSecreto();
    const estaOculto = painel.classList.contains('hidden');
    painel.classList.toggle('hidden');
    if (estaOculto) {
        painel.style.display = 'flex';
        mostrarToast("🔓 Modo Administrador ativado!", "info");
    } else {
        painel.style.display = '';
    }
}

// ============================================================
// GERENCIAMENTO DE SERVIDORES
// ============================================================

function organizarEOrdenarServidores() {
    bancoServidores.sort((a, b) => {
        const catA = a.categoria || CATEGORIAS.APOIO;
        const catB = b.categoria || CATEGORIAS.APOIO;
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return a.nome.localeCompare(b.nome);
    });
}

function carregarListaServidores(filtroTexto = '') {
    const seletor = DOM.seletorServidor();
    seletor.innerHTML = '<option value="">-- Selecione ou Digite Acima--</option>';
    organizarEOrdenarServidores();

    const filtro = filtroTexto.toUpperCase().trim();
    let categoriaAtual = "";
    let optGroupAtual = null;

    bancoServidores.forEach((servidor, index) => {
        // Filtro de busca por nome
        if (filtro && !servidor.nome.includes(filtro)) return;

        const cat = servidor.categoria || CATEGORIAS.APOIO;
        if (cat !== categoriaAtual) {
            categoriaAtual = cat;
            optGroupAtual = document.createElement('optgroup');
            optGroupAtual.label = "📌 " + cat.substring(4);
            seletor.appendChild(optGroupAtual);
        }
        const opcao = document.createElement('option');
        opcao.value = index;
        opcao.text = servidor.nome;
        if (optGroupAtual) optGroupAtual.appendChild(opcao);
        else seletor.appendChild(opcao);
    });
}

function preencherServidor() {
    const index = DOM.seletorServidor().value;
    if (index !== "") {
        const servidor = bancoServidores[index];
        DOM.servidorNome().textContent = servidor.nome;
        DOM.servidorCpf().textContent = servidor.cpf;
        DOM.servidorCargo().textContent = servidor.cargo;
        DOM.seletorTurno().value = servidor.turno || TURNOS.MANUAL;
    } else {
        DOM.servidorNome().textContent = SERVIDOR_PADRAO.nome;
        DOM.servidorCpf().textContent = SERVIDOR_PADRAO.cpf;
        DOM.servidorCargo().textContent = SERVIDOR_PADRAO.cargo;
        DOM.seletorTurno().value = TURNOS.MANUAL;
    }
    gerarFolha();
}

function atualizarTurno() {
    const index = DOM.seletorServidor().value;
    if (index === "") return;
    const novoTurno = DOM.seletorTurno().value;

    if (bancoServidores[index].turno !== novoTurno) {
        bancoServidores[index].turno = novoTurno;
        salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores));
        gerarFolha();
    }
}

function atualizarServidorEditado() {
    const index = DOM.seletorServidor().value;
    if (index === "") return;

    const novoNome = DOM.servidorNome().textContent.trim().toUpperCase();
    const novoCpf = DOM.servidorCpf().textContent.trim();
    const novoCargo = DOM.servidorCargo().textContent.trim().toUpperCase();
    let alterou = false;

    if (bancoServidores[index].nome !== novoNome) { bancoServidores[index].nome = novoNome; alterou = true; }
    if (bancoServidores[index].cpf !== novoCpf) { bancoServidores[index].cpf = novoCpf; alterou = true; }
    if (bancoServidores[index].cargo !== novoCargo) { bancoServidores[index].cargo = novoCargo; alterou = true; }

    if (alterou) {
        salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores));
        const valorAtual = index;
        carregarListaServidores();
        DOM.seletorServidor().value = valorAtual;
    }
}

function carregarDadosEditaveis() {
    DOM.servidorNome().addEventListener('blur', atualizarServidorEditado);
    DOM.servidorCpf().addEventListener('blur', atualizarServidorEditado);
    DOM.servidorCargo().addEventListener('blur', atualizarServidorEditado);
}

// ============================================================
// MODAL DE CADASTRO
// ============================================================

function abrirModal() {
    DOM.modalAdd().style.display = 'flex';
}

function fecharModal() {
    DOM.modalAdd().style.display = 'none';
    ['novo-nome', 'novo-cpf', 'novo-cargo'].forEach(id => document.getElementById(id).value = '');
    DOM.novoCategoria().value = '';
    DOM.novoTurno().value = TURNOS.MANUAL;
}

function salvarNovoServidor() {
    const nome = DOM.novoNome().value.trim();
    const cpf = DOM.novoCpf().value.trim();
    const cargo = DOM.novoCargo().value.trim();
    const categoria = DOM.novoCategoria().value;
    const turno = DOM.novoTurno().value;

    if (!nome || !cpf || !cargo || !categoria) {
        mostrarToast("⚠️ Preencha todos os campos e selecione o Setor!", "aviso");
        return;
    }
    if (!cpfBasicoValido(cpf)) {
        mostrarToast("⚠️ CPF inválido (deve conter 11 dígitos).", "aviso");
        return;
    }
    if (bancoServidores.some(s => s.cpf === cpf || s.nome === nome)) {
        mostrarToast("❌ Já existe um servidor com este Nome ou CPF!", "erro");
        return;
    }

    bancoServidores.push({ nome, cpf, cargo, categoria, turno });
    organizarEOrdenarServidores();
    salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores));
    carregarListaServidores();
    fecharModal();

    const novaPosicao = bancoServidores.findIndex(s => s.cpf === cpf);
    DOM.seletorServidor().value = novaPosicao;
    preencherServidor();
    mostrarToast(`✅ ${nome} cadastrado com sucesso!`, "sucesso");
}

function removerServidor() {
    const index = DOM.seletorServidor().value;
    if (index === "") {
        mostrarToast("⚠️ Selecione um servidor na lista para remover.", "aviso");
        return;
    }
    if (confirm(`Remover ${bancoServidores[index].nome} permanentemente?`)) {
        const nomeRemovido = bancoServidores[index].nome;
        bancoServidores.splice(index, 1);
        salvarNaNuvem('listaServidores', JSON.stringify(bancoServidores));
        carregarListaServidores();
        preencherServidor();
        mostrarToast(`🗑️ ${nomeRemovido} removido.`, "info");
    }
}

// ============================================================
// 6. DESFAZER ÚLTIMA AÇÃO (Ctrl+Z)
// ============================================================

function registrarAcao(chave, valorAnterior) {
    historicoAcoes.push({ chave, valorAnterior, timestamp: Date.now() });
    if (historicoAcoes.length > MAX_HISTORICO) {
        historicoAcoes.shift();
    }
}

function desfazerUltimaAcao() {
    if (historicoAcoes.length === 0) {
        mostrarToast("ℹ️ Nenhuma ação para desfazer.", "info");
        return;
    }

    const acao = historicoAcoes.pop();

    if (acao.valorAnterior === undefined || acao.valorAnterior === null) {
        // O valor não existia antes — remover
        removerDaNuvem(acao.chave);
    } else {
        // Restaurar o valor anterior
        salvarNaNuvem(acao.chave, acao.valorAnterior);
    }

    gerarFolha();
    mostrarToast("↩️ Última ação desfeita!", "sucesso");
}

// ============================================================
// GERAÇÃO DA FOLHA DE PONTO
// ============================================================

function obterCelulasHoras(turno) {
    const mapas = {
        [TURNOS.MATUTINO]: '<td>08:00</td><td>12:00</td><td>---</td><td>---</td>',
        [TURNOS.VESPERTINO]: '<td>---</td><td>---</td><td>13:00</td><td>17:00</td>',
        [TURNOS.INTEGRAL]: '<td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td>',
    };
    return mapas[turno] || '<td></td><td></td><td></td><td></td>';
}

window.salvarRotulo = function (elemento) {
    const chave = elemento.getAttribute('data-chave');
    const dados = JSON.parse(memoriaNuvem[chave] || '{"estado":1,"motivo":"","rotulo":""}');
    dados.rotulo = elemento.textContent.toUpperCase();
    salvarNaNuvem(chave, JSON.stringify(dados));
};

window.salvarMotivo = function (elemento) {
    const chave = elemento.getAttribute('data-chave');
    const dados = JSON.parse(memoriaNuvem[chave] || '{"estado":1,"motivo":"","rotulo":""}');
    dados.motivo = elemento.textContent;
    salvarNaNuvem(chave, JSON.stringify(dados));
};

function obterConteudoLinha(dados, tipo, chave) {
    let rotuloPadrao;
    if (tipo === 'geral') {
        rotuloPadrao = (dados.estado === ESTADOS.JUSTIFICADA) ? ROTULOS.feriado : ROTULOS.pontoFacultativo;
    } else {
        rotuloPadrao = (dados.estado === ESTADOS.JUSTIFICADA) ? ROTULOS.faltaJustificada : ROTULOS.atestadoMedico;
    }

    const rotuloExibido = dados.rotulo || rotuloPadrao;
    const classe = tipo === 'geral' ? 'fim-de-semana' : 'linha-individual';
    const chaveSafe = escapeHtml(chave);

    return `<td colspan="5" class="${classe}">
                <span class="rotulo-editavel" data-chave="${chaveSafe}" contenteditable="true" spellcheck="false" onclick="event.stopPropagation()" oninput="salvarRotulo(this)">${escapeHtml(rotuloExibido)}</span> 
                <span class="motivo-feriado" data-chave="${chaveSafe}" contenteditable="true" spellcheck="false" onclick="event.stopPropagation()" oninput="salvarMotivo(this)">${escapeHtml(dados.motivo || '')}</span>
            </td>`;
}

window.toggleSabado = function (ano, mes, dia) {
    const chave = `sabado_aberto_${ano}_${mes}_${dia}`;
    registrarAcao(chave, memoriaNuvem[chave] || null);
    if (memoriaNuvem[chave]) {
        removerDaNuvem(chave);
    } else {
        salvarNaNuvem(chave, "1");
    }
    gerarFolha();
};

// ============================================================
// 5. TOOLTIP DE CONFIRMAÇÃO VISUAL
// ============================================================

function mostrarTooltip(elemento, texto) {
    // Remove tooltip anterior se existir
    const antigo = document.querySelector('.tooltip-estado');
    if (antigo) antigo.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-estado';
    tooltip.textContent = texto;

    elemento.style.position = 'relative';
    elemento.appendChild(tooltip);

    requestAnimationFrame(() => tooltip.classList.add('tooltip-visivel'));

    setTimeout(() => {
        tooltip.classList.remove('tooltip-visivel');
        setTimeout(() => tooltip.remove(), 300);
    }, 1800);
}

function obterTextoEstado(novoEstado, tipo) {
    if (novoEstado === ESTADOS.NORMAL) return '✓ Normal';
    if (tipo === 'geral') {
        return novoEstado === ESTADOS.JUSTIFICADA ? '🏖️ Feriado/Recesso' : '📋 Ponto Facultativo';
    } else {
        return novoEstado === ESTADOS.JUSTIFICADA ? '📝 Falta Justificada' : '🏥 Atestado Médico';
    }
}

function alternarFeriadoGeral(linhaElemento, ano, mes, diaNumero, celulaDiaHtml) {
    const estadoAtual = parseInt(linhaElemento.getAttribute('data-estado-geral') || '0');
    const novoEstado = (estadoAtual + 1) % 3;
    linhaElemento.setAttribute('data-estado-geral', novoEstado);
    linhaElemento.setAttribute('data-estado-individual', '0');

    const turnoAtual = obterTurnoAtual();
    const nomeAtual = obterNomeAtual();
    const chave = `feriado_${ano}_${mes}_${diaNumero}`;
    const chaveAusencia = `ausencia_${nomeAtual}_${ano}_${mes}_${diaNumero}`;

    // Registrar para desfazer
    registrarAcao(chave, memoriaNuvem[chave] || null);
    registrarAcao(chaveAusencia, memoriaNuvem[chaveAusencia] || null);

    removerDaNuvem(chaveAusencia);

    if (novoEstado === ESTADOS.NORMAL) {
        linhaElemento.innerHTML = celulaDiaHtml + obterCelulasHoras(turnoAtual) + '<td></td>';
        removerDaNuvem(chave);
    } else {
        const dadosAntigos = memoriaNuvem[chave] ? JSON.parse(memoriaNuvem[chave]) : {};
        const novoRotulo = (dadosAntigos.estado === novoEstado) ? (dadosAntigos.rotulo || "") : "";
        const dados = { estado: novoEstado, motivo: dadosAntigos.motivo || "", rotulo: novoRotulo };

        linhaElemento.innerHTML = celulaDiaHtml + obterConteudoLinha(dados, 'geral', chave);
        salvarNaNuvem(chave, JSON.stringify(dados));
    }

    // Tooltip visual
    mostrarTooltip(linhaElemento, obterTextoEstado(novoEstado, 'geral'));
    atualizarResumo();
}

function alternarAusenciaIndividual(linhaElemento, ano, mes, diaNumero, evento, celulaDiaHtml) {
    evento.preventDefault();
    const turnoAtual = obterTurnoAtual();
    const nomeAtual = obterNomeAtual();

    if (nomeAtual === SERVIDOR_PADRAO.nome || nomeAtual === "") {
        mostrarToast("⚠️ Selecione um servidor primeiro.", "aviso");
        return;
    }

    const estadoAtual = parseInt(linhaElemento.getAttribute('data-estado-individual') || '0');
    const novoEstado = (estadoAtual + 1) % 3;
    linhaElemento.setAttribute('data-estado-individual', novoEstado);

    const chave = `ausencia_${nomeAtual}_${ano}_${mes}_${diaNumero}`;

    // Registrar para desfazer
    registrarAcao(chave, memoriaNuvem[chave] || null);

    if (novoEstado === ESTADOS.NORMAL) {
        const temFeriadoGeral = memoriaNuvem[`feriado_${ano}_${mes}_${diaNumero}`];
        if (temFeriadoGeral) {
            const dadosGeral = JSON.parse(temFeriadoGeral);
            const chaveGeral = `feriado_${ano}_${mes}_${diaNumero}`;
            linhaElemento.innerHTML = celulaDiaHtml + obterConteudoLinha(dadosGeral, 'geral', chaveGeral);
            linhaElemento.setAttribute('data-estado-geral', dadosGeral.estado);
        } else {
            linhaElemento.innerHTML = celulaDiaHtml + obterCelulasHoras(turnoAtual) + '<td></td>';
            linhaElemento.setAttribute('data-estado-geral', '0');
        }
        removerDaNuvem(chave);
    } else {
        const dadosAntigos = memoriaNuvem[chave] ? JSON.parse(memoriaNuvem[chave]) : {};
        const novoRotulo = (dadosAntigos.estado === novoEstado) ? (dadosAntigos.rotulo || "") : "";
        const dados = { estado: novoEstado, motivo: dadosAntigos.motivo || "", rotulo: novoRotulo };

        linhaElemento.innerHTML = celulaDiaHtml + obterConteudoLinha(dados, 'individual', chave);
        salvarNaNuvem(chave, JSON.stringify(dados));
    }

    // Tooltip visual
    mostrarTooltip(linhaElemento, obterTextoEstado(novoEstado, 'individual'));
    atualizarResumo();
}

// --- Funções auxiliares para criação de linhas da tabela ---

function criarLinhaDomingo(dia) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${dia}</td><td colspan="5" class="fim-de-semana">DOMINGO</td>`;
    return tr;
}

function criarLinhaSabado(dia, ano, mes, aberto) {
    const tr = document.createElement('tr');
    tr.className = "dia-util";

    if (aberto) {
        return null; // Sábado aberto é tratado como dia útil
    }

    tr.innerHTML = `<td>${dia}</td><td colspan="5" class="fim-de-semana" style="color: #2B6CB0;">
                <span class="esconder-impressao" style="text-decoration: underline; cursor: pointer;">SÁBADO (Clique para abrir)</span>
                <span class="mostrar-impressao">SÁBADO</span>
            </td>`;
    tr.onclick = function () { toggleSabado(ano, mes, dia); };
    return tr;
}

function criarLinhaDiaUtil(dia, ano, mes, turnoAtual, nomeAtual, isSabadoAberto) {
    const tr = document.createElement('tr');
    tr.className = "dia-util";
    tr.setAttribute('tabindex', '0');
    tr.setAttribute('role', 'button');

    const chaveGeral = `feriado_${ano}_${mes}_${dia}`;
    const chaveIndiv = `ausencia_${nomeAtual}_${ano}_${mes}_${dia}`;
    const dadosGeral = memoriaNuvem[chaveGeral];
    const dadosIndiv = memoriaNuvem[chaveIndiv];

    let celulaDiaHtml = `<td>${dia}`;
    if (isSabadoAberto) {
        celulaDiaHtml += ` <span class="esconder-impressao" style="cursor: pointer; color: #e53e3e; font-size: 11px; font-weight: bold;" onclick="event.stopPropagation(); toggleSabado(${ano}, ${mes}, ${dia})" title="Fechar Sábado">⮌</span>`;
    }
    celulaDiaHtml += '</td>';

    if (dadosIndiv) {
        const info = JSON.parse(dadosIndiv);
        tr.setAttribute('data-estado-individual', info.estado);
        tr.innerHTML = celulaDiaHtml + obterConteudoLinha(info, 'individual', chaveIndiv);
    } else if (dadosGeral) {
        const info = JSON.parse(dadosGeral);
        tr.setAttribute('data-estado-geral', info.estado);
        tr.innerHTML = celulaDiaHtml + obterConteudoLinha(info, 'geral', chaveGeral);
    } else {
        tr.setAttribute('data-estado-geral', '0');
        tr.setAttribute('data-estado-individual', '0');
        tr.innerHTML = celulaDiaHtml + obterCelulasHoras(turnoAtual) + '<td></td>';
    }

    tr.onclick = function () { alternarFeriadoGeral(this, ano, mes, dia, celulaDiaHtml); };
    tr.oncontextmenu = function (evento) { alternarAusenciaIndividual(this, ano, mes, dia, evento, celulaDiaHtml); };

    return tr;
}

function gerarFolha() {
    const selectMes = DOM.selectMes();
    const mes = parseInt(selectMes.value);
    const nomeMes = selectMes.options[selectMes.selectedIndex].text;
    const ano = parseInt(DOM.selectAno().value);
    const turnoAtual = obterTurnoAtual();
    const nomeAtual = obterNomeAtual();

    DOM.tituloPeriodo().textContent = `Folha de Ponto - Período: ${nomeMes} ${ano}`;

    const corpoTabela = DOM.corpoTabela();
    corpoTabela.innerHTML = '';
    const diasNoMes = new Date(ano, mes, 0).getDate();

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const diaDaSemana = new Date(ano, mes - 1, dia).getDay();
        const isSabadoAberto = memoriaNuvem[`sabado_aberto_${ano}_${mes}_${dia}`] === "1";
        let tr;

        if (diaDaSemana === 0) {
            tr = criarLinhaDomingo(dia);
        } else if (diaDaSemana === 6 && !isSabadoAberto) {
            tr = criarLinhaSabado(dia, ano, mes, false);
        } else {
            tr = criarLinhaDiaUtil(dia, ano, mes, turnoAtual, nomeAtual, diaDaSemana === 6 && isSabadoAberto);
        }

        if (tr) corpoTabela.appendChild(tr);
    }

    atualizarResumo();
}

// ============================================================
// 4. CONTADOR DE RESUMO
// ============================================================

function atualizarResumo() {
    const el = DOM.resumoFolha();
    if (!el) return;

    const selectMes = DOM.selectMes();
    const mes = parseInt(selectMes.value);
    const ano = parseInt(DOM.selectAno().value);
    const nomeAtual = obterNomeAtual();
    const diasNoMes = new Date(ano, mes, 0).getDate();

    let diasUteis = 0;
    let domingos = 0;
    let sabados = 0;
    let feriadosGerais = 0;
    let faltasJustificadas = 0;
    let atestados = 0;

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const diaDaSemana = new Date(ano, mes - 1, dia).getDay();
        const isSabadoAberto = memoriaNuvem[`sabado_aberto_${ano}_${mes}_${dia}`] === "1";

        if (diaDaSemana === 0) {
            domingos++;
        } else if (diaDaSemana === 6 && !isSabadoAberto) {
            sabados++;
        } else {
            // Verificar ausências individuais
            const chaveIndiv = `ausencia_${nomeAtual}_${ano}_${mes}_${dia}`;
            const chaveGeral = `feriado_${ano}_${mes}_${dia}`;

            if (memoriaNuvem[chaveIndiv]) {
                const dados = JSON.parse(memoriaNuvem[chaveIndiv]);
                if (dados.estado === ESTADOS.JUSTIFICADA) faltasJustificadas++;
                else if (dados.estado === ESTADOS.MEDICO) atestados++;
            } else if (memoriaNuvem[chaveGeral]) {
                feriadosGerais++;
            } else {
                diasUteis++;
            }
        }
    }

    el.innerHTML = `
        <span class="badge badge-util">📅 Dias Úteis: <strong>${diasUteis}</strong></span>
        <span class="badge badge-feriado">🏖️ Feriados/Recessos: <strong>${feriadosGerais}</strong></span>
        <span class="badge badge-falta">📝 Faltas Justificadas: <strong>${faltasJustificadas}</strong></span>
        <span class="badge badge-atestado">🏥 Atestados: <strong>${atestados}</strong></span>
        <span class="badge badge-domingo">🔴 Domingos: <strong>${domingos}</strong></span>
        <span class="badge badge-sabado">🔵 Sábados: <strong>${sabados}</strong></span>
    `;
}

// ============================================================
// EXPORTAÇÃO E IMPORTAÇÃO
// ============================================================

function exportarExcel() {
    if (bancoServidores.length === 0) {
        mostrarToast("⚠️ A lista de servidores está vazia!", "aviso");
        return;
    }

    let csv = '\uFEFF';
    csv += "NOME;CPF;CARGO;SETOR;TURNO\n";

    bancoServidores.forEach(s => {
        const turnoFormatado = s.turno || TURNOS.MANUAL;
        csv += `${s.nome};${s.cpf};${s.cargo};${s.categoria};${turnoFormatado}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "RH_Servidores_AutomaPonto.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    mostrarToast("📊 Arquivo Excel exportado!", "sucesso");
}

function exportarBackup() {
    const link = document.createElement("a");
    link.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memoriaNuvem)));
    link.setAttribute("download", "backup_escola_pontos.json");
    document.body.appendChild(link);
    link.click();
    link.remove();
    mostrarToast("💾 Backup exportado com sucesso!", "sucesso");
}

function importarBackup(evento) {
    const ficheiro = evento.target.files[0];
    if (!ficheiro) return;

    const leitor = new FileReader();
    leitor.onload = function (e) {
        try {
            const dados = JSON.parse(e.target.result);
            database.ref('cmei_dados').set(dados)
                .then(() => {
                    mostrarToast("✅ Backup restaurado! Recarregando...", "sucesso", 3000);
                    setTimeout(() => location.reload(), 1500);
                })
                .catch((err) => {
                    console.error("Erro ao restaurar backup:", err);
                    mostrarToast("❌ Erro ao salvar no banco de dados!", "erro");
                });
        } catch (err) {
            console.error("Erro ao ler arquivo de backup:", err);
            mostrarToast("❌ Arquivo inválido! Certifique-se de que é um JSON válido.", "erro");
        }
    };
    leitor.readAsText(ficheiro);
    evento.target.value = "";
}

// ============================================================
// IMPRESSÃO EM LOTE
// ============================================================

function filtrarServidoresPorSetor(filtroSetor) {
    return bancoServidores.filter(s =>
        filtroSetor === "TODOS" || (s.categoria || CATEGORIAS.APOIO) === filtroSetor
    );
}

function imprimirTodosLote() {
    if (bancoServidores.length === 0) {
        mostrarToast("⚠️ A lista de servidores está vazia!", "aviso");
        return;
    }

    const filtroSetor = DOM.filtroSetor().value;
    const servidoresFiltrados = filtrarServidoresPorSetor(filtroSetor);

    if (servidoresFiltrados.length === 0) {
        mostrarToast("⚠️ Nenhum servidor encontrado neste setor!", "aviso");
        return;
    }

    mostrarCarregamento("🖨️ Preparando impressões em lote...");

    // 1) Salvar estado atual da busca e do servidor selecionado
    const buscaEl = DOM.buscaServidor();
    const buscaAnterior = buscaEl ? buscaEl.value : '';
    const indiceOriginal = DOM.seletorServidor().value;

    // 2) Limpar busca e recarregar lista COMPLETA (sem filtro de texto)
    if (buscaEl) buscaEl.value = '';
    carregarListaServidores('');

    // 3) Preparar wrapper de impressão
    const printWrapper = DOM.printWrapper();
    printWrapper.innerHTML = '';
    document.body.classList.add('modo-lote');

    // 4) Iterar e clonar cada servidor
    for (let i = 0; i < bancoServidores.length; i++) {
        const categoriaServidor = bancoServidores[i].categoria || CATEGORIAS.APOIO;

        if (filtroSetor === "TODOS" || categoriaServidor === filtroSetor) {
            DOM.seletorServidor().value = i;
            preencherServidor();
            const cloneArea = DOM.folhaImpressao().cloneNode(true);
            cloneArea.removeAttribute('id');
            cloneArea.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            // Remover resumo-folha dos clones (não deve aparecer na impressão)
            const resumoClone = cloneArea.querySelector('.resumo-folha');
            if (resumoClone) resumoClone.remove();
            cloneArea.classList.add('quebra-pagina');
            printWrapper.appendChild(cloneArea);
        }
    }

    // 5) Imprimir
    setTimeout(() => {
        window.print();
        esconderCarregamento();
    }, 500);

    // 6) Restaurar estado após impressão
    window.onafterprint = function () {
        document.body.classList.remove('modo-lote');
        printWrapper.innerHTML = '';

        // Restaurar busca e lista
        if (buscaEl) buscaEl.value = buscaAnterior;
        carregarListaServidores(buscaAnterior);

        DOM.seletorServidor().value = indiceOriginal || "";
        preencherServidor();
        gerarFolha();
        window.onafterprint = null;
    };
}

// ============================================================
// 8. MODO ESCURO
// ============================================================

function toggleTema() {
    const html = document.documentElement;
    const temaAtual = html.getAttribute('data-theme');
    const novoTema = temaAtual === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', novoTema);
    localStorage.setItem('tema-folha-ponto', novoTema);

    const btnTema = document.getElementById('btn-tema');
    if (btnTema) {
        btnTema.textContent = novoTema === 'dark' ? '☀️' : '🌙';
        btnTema.title = novoTema === 'dark' ? 'Modo Claro' : 'Modo Escuro';
    }
}

function carregarTema() {
    const temaSalvo = localStorage.getItem('tema-folha-ponto') || 'light';
    document.documentElement.setAttribute('data-theme', temaSalvo);
    const btnTema = document.getElementById('btn-tema');
    if (btnTema) {
        btnTema.textContent = temaSalvo === 'dark' ? '☀️' : '🌙';
        btnTema.title = temaSalvo === 'dark' ? 'Modo Claro' : 'Modo Escuro';
    }
}

// ============================================================
// 9. PWA - SERVICE WORKER REGISTRATION
// ============================================================

function registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker registrado.'))
            .catch(err => console.log('Service Worker falhou:', err));
    }
}

// ============================================================
// EVENT LISTENERS (registrados via JS ao invés de inline HTML)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    // Carregar tema salvo
    carregarTema();

    // Registrar Service Worker
    registrarServiceWorker();

    // --- index.html elements ---
    const btnImprimir = document.querySelector('.btn-imprimir');
    if (btnImprimir) btnImprimir.addEventListener('click', () => window.print());

    const btnLote = document.querySelector('.btn-lote');
    if (btnLote) btnLote.addEventListener('click', imprimirTodosLote);

    const btnSair = document.querySelector('.btn-sair');
    if (btnSair) btnSair.addEventListener('click', fazerLogout);

    const btnBackup = document.querySelector('.topo-avancado .btn-backup');
    if (btnBackup) btnBackup.addEventListener('click', revelarBackup);

    const btnExcel = document.querySelector('.btn-excel');
    if (btnExcel) btnExcel.addEventListener('click', exportarExcel);

    const btnExportBackup = document.querySelector('#painel-secreto .btn-backup');
    if (btnExportBackup) btnExportBackup.addEventListener('click', exportarBackup);

    const btnRestaurar = document.querySelector('#painel-secreto .btn-add');
    if (btnRestaurar) btnRestaurar.addEventListener('click', () => DOM.fileImport().click());

    const fileImport = DOM.fileImport();
    if (fileImport) fileImport.addEventListener('change', importarBackup);

    // Seletor de servidor
    const seletorServidor = DOM.seletorServidor();
    if (seletorServidor) seletorServidor.addEventListener('change', preencherServidor);

    // Seletor de turno
    const seletorTurno = DOM.seletorTurno();
    if (seletorTurno) seletorTurno.addEventListener('change', atualizarTurno);

    // Seletores de mês e ano
    const selectMes = DOM.selectMes();
    if (selectMes) selectMes.addEventListener('change', gerarFolha);

    const selectAno = DOM.selectAno();
    if (selectAno) selectAno.addEventListener('change', gerarFolha);

    // Modal de cadastro
    const btnAddServidor = document.querySelector('.grupo-seletor-moderno .btn-add');
    if (btnAddServidor) btnAddServidor.addEventListener('click', abrirModal);

    const btnDelServidor = document.querySelector('.grupo-seletor-moderno .btn-del');
    if (btnDelServidor) btnDelServidor.addEventListener('click', removerServidor);

    const btnSalvarModal = document.querySelector('#modalAdd .btn-add');
    if (btnSalvarModal) btnSalvarModal.addEventListener('click', salvarNovoServidor);

    const btnCancelarModal = document.querySelector('#modalAdd .btn-cancelar');
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', fecharModal);

    // Campos com comportamento uppercase
    const novoNome = DOM.novoNome();
    if (novoNome) novoNome.addEventListener('input', function () { this.value = this.value.toUpperCase(); });

    const novoCargo = DOM.novoCargo();
    if (novoCargo) novoCargo.addEventListener('input', function () { this.value = this.value.toUpperCase(); });

    const novoCpf = DOM.novoCpf();
    if (novoCpf) novoCpf.addEventListener('input', function () { mascaraCPF(this); });

    // CPF editável na ficha
    const servidorCpf = DOM.servidorCpf();
    if (servidorCpf) servidorCpf.addEventListener('input', function () { mascaraCPF(this); });

    // Logo duplo clique -> admin
    const logo = document.querySelector('.cabecalho-logo');
    if (logo) logo.addEventListener('dblclick', revelarBackup);

    // 3. Busca de servidor
    const buscaServidor = DOM.buscaServidor();
    if (buscaServidor) {
        buscaServidor.addEventListener('input', function () {
            carregarListaServidores(this.value);
        });
    }

    // 6. Desfazer (Ctrl+Z) — só intercepta quando não está em um campo editável
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.key === 'z') {
            const tag = document.activeElement.tagName;
            const isEditable = document.activeElement.contentEditable === 'true';
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
                e.preventDefault();
                desfazerUltimaAcao();
            }
        }
    });

    // Botão desfazer
    const btnDesfazer = document.getElementById('btn-desfazer');
    if (btnDesfazer) btnDesfazer.addEventListener('click', desfazerUltimaAcao);

    // 8. Botão tema
    const btnTema = document.getElementById('btn-tema');
    if (btnTema) btnTema.addEventListener('click', toggleTema);

    // --- login.html elements ---
    const btnLogin = document.querySelector('.btn-login-gradient');
    if (btnLogin) btnLogin.addEventListener('click', fazerLogin);

    const loginEmail = DOM.loginEmail();
    if (loginEmail) loginEmail.addEventListener('keypress', (e) => { if (e.key === 'Enter') fazerLogin(); });

    const loginSenha = DOM.loginSenha();
    if (loginSenha) loginSenha.addEventListener('keypress', (e) => { if (e.key === 'Enter') fazerLogin(); });
});
