const WebSocket = require('ws');

// Armazenamento do estado das salas em memória
const salas = {};

/**
 * Retorna as salas ativas para a API REST
 */
function obterSalasAtivas() {
    let ativas = [];
    for (const [codigo, dadosSala] of Object.entries(salas)) {
        if (dadosSala.transmissor) {
            ativas.push({
                codigoSala: codigo,
                nomeSala: dadosSala.nomeSala || 'Partida',
                descricaoSala: dadosSala.descricaoSala || '',
                quantidadeOuvintes: dadosSala.ouvintes.size,
                ultimoEstado: dadosSala.ultimoEstado
            });
        }
    }
    return ativas;
}

/**
 * Retorna a logo da sala em Base64, se existir
 */
function obterLogoSala(codigoSala) {
    if (salas[codigoSala] && salas[codigoSala].logoBase64) {
        return salas[codigoSala].logoBase64;
    }
    return null;
}

/**
 * Inicializa e gerencia as conexões WebSocket
 * @param {import('http').Server} servidorHttp Servidor HTTP principal
 */
function iniciarWebsocket(servidorHttp) {
    const servidorWs = new WebSocket.Server({ 
        server: servidorHttp,
        // Desabilitado para reduzir latência e uso de CPU em pequenos pacotes JSON
        perMessageDeflate: false 
    });

    servidorWs.on('connection', (conexao) => {
        let salaAtual = null;
        let funcaoAtual = null;

        conexao.on('message', (mensagemEmTexto) => {
            try {
                const mensagem = JSON.parse(mensagemEmTexto);

                // Quando o usuário tenta entrar numa sala
                if (mensagem.type === 'join') {
                    const codigoSala = mensagem.sala;
                    if (!codigoSala) return;

                    salaAtual = codigoSala;
                    funcaoAtual = mensagem.funcao || 'ouvinte';

                    // Se a sala não existir, criamos a estrutura padrão
                    if (!salas[codigoSala]) {
                        salas[codigoSala] = {
                            transmissor: null,
                            ouvintes: new Set(),
                            ultimoEstado: null,
                            nomeSala: '',
                            descricaoSala: '',
                            logoBase64: null
                        };
                    }

                    // Se for o painel administrador do Flutter
                    if (funcaoAtual === 'transmissor') {
                        salas[codigoSala].transmissor = conexao;
                        if (mensagem.nomeSala) salas[codigoSala].nomeSala = mensagem.nomeSala;
                        if (mensagem.descricaoSala) salas[codigoSala].descricaoSala = mensagem.descricaoSala;
                        console.log(`[${codigoSala}] Transmissor conectado (${salas[codigoSala].nomeSala})`);
                    } 
                    // Se for um ouvinte via navegador web
                    else {
                        salas[codigoSala].ouvintes.add(conexao);
                        console.log(`[${codigoSala}] Ouvinte conectado (Total: ${salas[codigoSala].ouvintes.size})`);
                        
                        // Envia o último estado imediatamente para o novo ouvinte
                        if (salas[codigoSala].ultimoEstado) {
                            conexao.send(JSON.stringify(salas[codigoSala].ultimoEstado));
                        }
                    }
                } 
                // Quando há envio do estado do placar
                else if (mensagem.type === 'state' || funcaoAtual === 'transmissor') {
                    if (mensagem.type === 'set_logo') {
                        if (salaAtual && salas[salaAtual]) {
                            salas[salaAtual].logoBase64 = mensagem.data;
                            console.log(`[${salaAtual}] Logo salva com sucesso!`);
                        }
                    } else {
                        // Transmissor enviando atualizações de placar
                        if (salaAtual && salas[salaAtual]) {
                            const dadosEstado = mensagem.type === 'state' ? mensagem.data : mensagem;
                            
                            salas[salaAtual].ultimoEstado = dadosEstado;
                            const estadoEmString = JSON.stringify(dadosEstado);

                            // Dispara a atualização para todos os ouvintes
                            for (const ouvinte of salas[salaAtual].ouvintes) {
                                if (ouvinte.readyState === WebSocket.OPEN) {
                                    ouvinte.send(estadoEmString);
                                }
                            }
                        }
                    }
                }
            } catch (erro) {
                console.error('Mensagem inválida recebida:', mensagemEmTexto);
            }
        });

        // Quando o cliente se desconecta (fechou app ou desligou)
        conexao.on('close', () => {
            if (salaAtual && salas[salaAtual]) {
                if (funcaoAtual === 'transmissor') {
                    salas[salaAtual].transmissor = null;
                    console.log(`[${salaAtual}] Transmissor desconectado`);
                } else {
                    salas[salaAtual].ouvintes.delete(conexao);
                    console.log(`[${salaAtual}] Ouvinte desconectado (Total: ${salas[salaAtual].ouvintes.size})`);
                }

                // Limpa a sala caso não haja ninguém nela
                if (!salas[salaAtual].transmissor && salas[salaAtual].ouvintes.size === 0) {
                    delete salas[salaAtual];
                    console.log(`[${salaAtual}] Sala removida por inatividade (vazia)`);
                }
            }
        });
    });
}

module.exports = {
    iniciarWebsocket,
    obterSalasAtivas,
    obterLogoSala
};
