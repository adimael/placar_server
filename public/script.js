/* ===================================================
   PLACAR ELETRÔNICO DIGITAL - CONTROLADO VIA WEBSOCKET
   Instituto Federal Baiano - Campus Itapetinga
   =================================================== */

(function () {
    'use strict';

    const obterElemento = (id) => document.getElementById(id);

    const dom = {
        pontuacaoA: obterElemento('team-a-score'),
        pontuacaoB: obterElemento('team-b-score'),
        blocoPontuacaoA: obterElemento('team-a-score-block'),
        blocoPontuacaoB: obterElemento('team-b-score-block'),
        nomeA: obterElemento('team-a-name'),
        nomeB: obterElemento('team-b-name'),
        minutosCronometro: obterElemento('chrono-min'),
        segundosCronometro: obterElemento('chrono-sec'),
        separadorCronometro: obterElemento('chrono-sep'),
        sobreposicaoPisca: obterElemento('score-pop-overlay'),
        titulo: document.querySelector('.institution-name'),
        subtitulo: document.querySelector('.campus-name'),
        logotipo: obterElemento('header-logo'),
        // UI de Conexão
        sobreposicaoConexao: obterElemento('connection-overlay'),
        entradaIp: obterElemento('server-ip'),
        botaoConectar: obterElemento('connect-btn'),
        textoStatus: obterElemento('connection-status'),
        entradaPorta: obterElemento('server-port'),
        doisPontosPorta: obterElemento('port-colon')
    };

    let estadoAnterior = { pontuacaoA: 0, pontuacaoB: 0, cronometroRodando: false };
    let conexaoWebsocket = null;
    let temporizadorReconexao = null;
    let ipServidorAtual = null;
    let codigoSalaAtual = null;

    // Cronômetro Local (Frontend)
    let temporizadorCronometroLocal = null;
    let segundosCronometroLocal = 0;

    const ATRASO_RECONEXAO = 3000;
    const CHAVE_ARMAZENAMENTO = 'placar_server_ip';

    // ── Interface de Conexão ────────────────────────────────────────────────

    function exibirSobreposicao() {
        dom.sobreposicaoConexao.classList.remove('hidden');
    }

    function ocultarSobreposicao() {
        dom.sobreposicaoConexao.classList.add('hidden');
    }

    function definirStatus(mensagem, tipo) {
        dom.textoStatus.textContent = mensagem;
        dom.textoStatus.className = 'connection-status' + (tipo ? ' ' + tipo : '');
    }

    function inicializarInterfaceDeConexao() {
        // 1. Verifica os parâmetros da URL para auto-conexão
        const parametrosUrl = new URLSearchParams(window.location.search);
        const parametroCodigoSala = parametrosUrl.get('sala');

        if (parametroCodigoSala) {
            definirStatus('Conectando à nuvem...', '');
            dom.botaoConectar.disabled = true;
            dom.entradaIp.value = parametroCodigoSala;
            ipServidorAtual = 'wss://placar.vupi.us';
            codigoSalaAtual = parametroCodigoSala;
            setTimeout(() => conectarServidor(ipServidorAtual, parametroCodigoSala), 500);
            return;
        }

        // 2. Carrega configurações salvas anteriormente
        const ipSalvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
        const portaSalva = localStorage.getItem(CHAVE_ARMAZENAMENTO + '_port') || '8080';
        
        if (ipSalvo) {
            dom.entradaIp.value = ipSalvo;
            if (ipSalvo.includes('.')) {
                dom.entradaPorta.style.display = 'inline-block';
                dom.doisPontosPorta.style.display = 'inline';
                dom.entradaPorta.value = portaSalva;
            }
        }

        // 3. UI Dinâmica baseada no que é digitado
        dom.entradaIp.addEventListener('input', (evento) => {
            let valor = evento.target.value.trim().toUpperCase();
            
            // Se tiver ponto, assume que é IP local
            if (valor.includes('.') || (valor.match(/^[0-9]+$/) && valor.length > 5)) {
                dom.entradaPorta.style.display = 'inline-block';
                dom.doisPontosPorta.style.display = 'inline';
                
                // Formatação simples de IP
                let ipValor = valor.replace(/[^\d\.]/g, '').replace(/\.+/g, '.');
                let blocos = ipValor.split('.');
                if (blocos.length > 4) blocos = blocos.slice(0, 4);
                blocos = blocos.map(bloco => bloco.slice(0, 3));
                let novoValor = blocos.join('.');
                if (evento.inputType !== 'deleteContentBackward') {
                    if (blocos.length < 4 && blocos[blocos.length - 1].length === 3) {
                        novoValor += '.';
                    }
                }
                evento.target.value = novoValor;
            } else {
                // Caso contrário é um Código de Sala
                dom.entradaPorta.style.display = 'none';
                dom.doisPontosPorta.style.display = 'none';
                evento.target.value = valor.replace(/[^A-Z0-9]/g, '').slice(0, 6);
            }
        });
        
        if (dom.entradaPorta) {
            dom.entradaPorta.addEventListener('input', (evento) => {
                evento.target.value = evento.target.value.replace(/[^\d]/g, '');
            });
        }

        dom.botaoConectar.addEventListener('click', () => {
            const valorDigitado = dom.entradaIp.value.trim();
            
            if (!valorDigitado) {
                definirStatus('Digite o código ou endereço IP', 'error');
                return;
            }
            
            definirStatus('Conectando...', '');
            dom.botaoConectar.disabled = true;

            if (valorDigitado.includes('.')) {
                // Modo Rede Local (IP direto)
                const porta = dom.entradaPorta ? dom.entradaPorta.value.trim() || '8080' : '8080';
                ipServidorAtual = valorDigitado;
                codigoSalaAtual = null;
                localStorage.setItem(CHAVE_ARMAZENAMENTO, valorDigitado);
                localStorage.setItem(CHAVE_ARMAZENAMENTO + '_port', porta);
                conectarServidor(`ws://${valorDigitado}:${porta}`);
            } else {
                // Modo Nuvem
                ipServidorAtual = 'wss://placar.vupi.us';
                codigoSalaAtual = valorDigitado;
                localStorage.setItem(CHAVE_ARMAZENAMENTO, valorDigitado);
                conectarServidor(ipServidorAtual, valorDigitado);
            }
        });

        dom.entradaIp.addEventListener('keydown', (evento) => {
            if (evento.key === 'Enter') dom.botaoConectar.click();
        });
        
        if (dom.entradaPorta) {
            dom.entradaPorta.addEventListener('keydown', (evento) => {
                if (evento.key === 'Enter') dom.botaoConectar.click();
            });
        }

        if (ipSalvo) {
            dom.botaoConectar.click();
        }
    }

    // ── WebSocket ────────────────────────────────────────────────────

    function conectarServidor(url, codigoSala = null) {
        if (conexaoWebsocket) {
            try { conexaoWebsocket.close(); } catch (_) {}
        }

        try {
            conexaoWebsocket = new WebSocket(url);
        } catch (erro) {
            lidarComDesconexao('Erro ao conectar');
            return;
        }

        // Timeout de conexão (5s)
        const temporizador = setTimeout(() => {
            if (conexaoWebsocket.readyState !== WebSocket.OPEN) {
                conexaoWebsocket.close();
                lidarComDesconexao('Tempo de conexão esgotado');
            }
        }, 5000);

        conexaoWebsocket.onopen = () => {
            clearTimeout(temporizador);
            clearTimeout(temporizadorReconexao);
            definirStatus('Conectado!', 'success');
            setTimeout(ocultarSobreposicao, 800);
            dom.botaoConectar.disabled = false;
            
            if (codigoSala) {
                conexaoWebsocket.send(JSON.stringify({ type: 'join', sala: codigoSala, funcao: 'ouvinte' }));
            }
        };

        conexaoWebsocket.onmessage = (evento) => {
            try {
                const dados = JSON.parse(evento.data);
                // processar atualização de estado
                requestAnimationFrame(() => aplicarEstadoPlacar(dados));
            } catch (erro) {
                console.error('Erro ao processar mensagem do WebSocket:', erro);
            }
        };

        conexaoWebsocket.onclose = () => {
            clearTimeout(temporizador);
            lidarComDesconexao('Conexão perdida. Reconectando...');
        };

        conexaoWebsocket.onerror = () => {
            clearTimeout(temporizador);
        };
    }

    function lidarComDesconexao(mensagemErro) {
        definirStatus(mensagemErro, 'error');
        dom.botaoConectar.disabled = false;

        // Auto-reconnect se tiver IP salvo
        if (ipServidorAtual) {
            clearTimeout(temporizadorReconexao);
            temporizadorReconexao = setTimeout(() => {
                if (!conexaoWebsocket || conexaoWebsocket.readyState !== WebSocket.OPEN) {
                    definirStatus('Reconectando...', '');
                    if (codigoSalaAtual) {
                        conectarServidor(ipServidorAtual, codigoSalaAtual);
                    } else {
                        const porta = localStorage.getItem(CHAVE_ARMAZENAMENTO + '_port') || '8080';
                        conectarServidor(`ws://${ipServidorAtual}:${porta}`);
                    }
                }
            }, ATRASO_RECONEXAO);
        }

        exibirSobreposicao();
    }

    // ── Aplicação do Estado ─────────────────────────────────────────────────

    function atualizarInterfaceCronometro() {
        const minutos = Math.floor(segundosCronometroLocal / 60).toString().padStart(2, '0');
        const segundos = (segundosCronometroLocal % 60).toString().padStart(2, '0');
        dom.minutosCronometro.textContent = minutos;
        dom.segundosCronometro.textContent = segundos;
    }

    function iniciarCronometroLocal() {
        if (!temporizadorCronometroLocal) {
            temporizadorCronometroLocal = setInterval(() => {
                segundosCronometroLocal++;
                atualizarInterfaceCronometro();
            }, 1000);
        }
    }

    function pararCronometroLocal() {
        if (temporizadorCronometroLocal) {
            clearInterval(temporizadorCronometroLocal);
            temporizadorCronometroLocal = null;
        }
    }

    function aplicarEstadoPlacar(dados) {
        // Títulos
        if (dados.titulo && dom.titulo.textContent !== dados.titulo) {
            dom.titulo.textContent = dados.titulo;
        }
        if (dados.subtitulo && dom.subtitulo.textContent !== dados.subtitulo) {
            dom.subtitulo.textContent = dados.subtitulo;
        }

        // Logo da Sala
        if (dados.caminhoLogo) {
            if (dom.logotipo.dataset.urlLogotipo !== dados.caminhoLogo) {
                dom.logotipo.dataset.urlLogotipo = dados.caminhoLogo;
                dom.logotipo.src = dados.caminhoLogo;
            }
            dom.logotipo.style.display = 'block';
        } else if (dados.caminhoLogo === null || dados.caminhoLogo === '') {
            dom.logotipo.dataset.urlLogotipo = '';
            dom.logotipo.style.display = 'none';
        }

        // Nomes dos Times
        if (dados.nomeTimeA && dom.nomeA.textContent !== dados.nomeTimeA) {
            dom.nomeA.textContent = dados.nomeTimeA;
        }
        if (dados.nomeTimeB && dom.nomeB.textContent !== dados.nomeTimeB) {
            dom.nomeB.textContent = dados.nomeTimeB;
        }

        // Pontuação com Animação
        if (dados.pontuacaoA !== undefined && dados.pontuacaoA !== estadoAnterior.pontuacaoA) {
            const diferenca = dados.pontuacaoA - estadoAnterior.pontuacaoA;
            dom.pontuacaoA.textContent = dados.pontuacaoA;
            animarPontuacao(dom.pontuacaoA, dom.blocoPontuacaoA, 'a', diferenca);
            if (diferenca > 0) acionarBrilhoPisca('a');
        }

        if (dados.pontuacaoB !== undefined && dados.pontuacaoB !== estadoAnterior.pontuacaoB) {
            const diferenca = dados.pontuacaoB - estadoAnterior.pontuacaoB;
            dom.pontuacaoB.textContent = dados.pontuacaoB;
            animarPontuacao(dom.pontuacaoB, dom.blocoPontuacaoB, 'b', diferenca);
            if (diferenca > 0) acionarBrilhoPisca('b');
        }

        // Cronômetro
        if (dados.segundosCronometro !== undefined) {
            // Sincroniza apenas se a diferença for significativa (> 2s) ou se o cronômetro estiver parado
            // Isso evita "engasgos" ou pulos no cronômetro causados por pequenos atrasos de rede
            if (!dados.cronometroRodando || Math.abs(segundosCronometroLocal - dados.segundosCronometro) > 2) {
                segundosCronometroLocal = dados.segundosCronometro;
                atualizarInterfaceCronometro();
            }
        }

        if (dados.cronometroRodando !== undefined) {
            if (dados.cronometroRodando) {
                dom.separadorCronometro.classList.remove('paused');
                dom.separadorCronometro.classList.add('running');
                iniciarCronometroLocal();
            } else {
                dom.separadorCronometro.classList.remove('running');
                dom.separadorCronometro.classList.add('paused');
                pararCronometroLocal();
            }
        }

        // Cores
        if (dados.corFundo) {
            document.querySelector('.board').style.background = dados.corFundo;
        }

        if (dados.corTitulo) {
            dom.titulo.style.color = dados.corTitulo;
            dom.titulo.style.textShadow = `0 0 20px ${dados.corTitulo}80, 0 0 60px ${dados.corTitulo}33`;

            document.querySelector('.header-border-glow').style.background =
                `linear-gradient(90deg, transparent, ${dados.corTitulo}, ${dados.corTitulo}, transparent)`;
            document.querySelectorAll('.header-led-strip .led-dot').forEach(ponto => {
                ponto.style.background = dados.corTitulo;
                ponto.style.boxShadow = `0 0 8px ${dados.corTitulo}80`;
            });
            document.querySelector('.header-logo').style.filter =
                `drop-shadow(0 0 16px ${dados.corTitulo}80)`;
        }

        if (dados.subcorTitulo) {
            dom.subtitulo.style.color = dados.subcorTitulo;
        }

        if (dados.corTimeA) aplicarCorTime('a', dados.corTimeA);
        if (dados.corTimeB) aplicarCorTime('b', dados.corTimeB);
        if (dados.corCronometro) aplicarCorCronometro(dados.corCronometro);

        estadoAnterior = {
            pontuacaoA: dados.pontuacaoA ?? estadoAnterior.pontuacaoA,
            pontuacaoB: dados.pontuacaoB ?? estadoAnterior.pontuacaoB,
            cronometroRodando: dados.cronometroRodando ?? estadoAnterior.cronometroRodando,
        };
    }

    function aplicarCorTime(time, corBase) {
        const elementoNome = time === 'a' ? dom.nomeA : dom.nomeB;
        const elementoPontuacao = time === 'a' ? dom.pontuacaoA : dom.pontuacaoB;
        const elementoBloco = time === 'a' ? dom.blocoPontuacaoA : dom.blocoPontuacaoB;

        elementoNome.style.color = corBase;
        elementoNome.style.textShadow = `0 0 30px ${corBase}99, 0 0 80px ${corBase}33`;
        elementoPontuacao.style.color = corBase;
        elementoPontuacao.style.textShadow = `0 0 25px ${corBase}99, 0 0 70px ${corBase}59, 0 0 150px ${corBase}1F`;
        elementoBloco.style.borderColor = `${corBase}2E`;
        elementoBloco.style.boxShadow = `inset 0 0 60px ${corBase}12, 0 0 40px ${corBase}0F`;
    }

    function aplicarCorCronometro(corBase) {
        dom.minutosCronometro.style.color = corBase;
        dom.segundosCronometro.style.color = corBase;
        dom.separadorCronometro.style.color = corBase;

        const sombra = `0 0 20px ${corBase}80, 0 0 60px ${corBase}40`;
        dom.minutosCronometro.style.textShadow = sombra;
        dom.segundosCronometro.style.textShadow = sombra;
        dom.separadorCronometro.style.textShadow = sombra;

        const containerDisplay = document.querySelector('.chrono-display');
        containerDisplay.style.borderColor = `${corBase}1F`;
        containerDisplay.style.boxShadow = `inset 0 0 50px ${corBase}0A, 0 0 30px ${corBase}0F`;

        document.querySelectorAll('.chrono-led-strip .led-dot').forEach(ponto => {
            ponto.style.background = corBase;
            ponto.style.boxShadow = `0 0 8px ${corBase}80`;
        });
    }

    // ── Animações ──────────────────────────────────────────────────

    function animarPontuacao(elemento, bloco, time, diferenca) {
        const classeAnimacao = diferenca > 0 ? 'pop-up' : 'pop-down';
        elemento.classList.remove('pop-up', 'pop-down');
        void elemento.offsetWidth;
        elemento.classList.add(classeAnimacao);

        const classeBrilho = time === 'a' ? 'glow-burst-a' : 'glow-burst-b';
        bloco.classList.remove('glow-burst-a', 'glow-burst-b');
        void bloco.offsetWidth;
        bloco.classList.add(classeBrilho);
    }

    function acionarBrilhoPisca(time) {
        dom.sobreposicaoPisca.classList.remove('flash-a', 'flash-b');
        void dom.sobreposicaoPisca.offsetWidth;
        dom.sobreposicaoPisca.classList.add(time === 'a' ? 'flash-a' : 'flash-b');
    }

    // ── Inicialização ────────────────────────────────────────────────────────

    function inicializarAplicacao() {
        [dom.pontuacaoA, dom.pontuacaoB].forEach(elemento => {
            elemento.addEventListener('animationend', () => {
                elemento.classList.remove('pop-up', 'pop-down');
            });
        });

        [dom.blocoPontuacaoA, dom.blocoPontuacaoB].forEach(elemento => {
            elemento.addEventListener('animationend', () => {
                elemento.classList.remove('glow-burst-a', 'glow-burst-b');
            });
        });

        dom.sobreposicaoPisca.addEventListener('animationend', () => {
            dom.sobreposicaoPisca.classList.remove('flash-a', 'flash-b');
        });

        dom.separadorCronometro.classList.add('paused');

        // Tela Cheia no Duplo Clique
        document.addEventListener('dblclick', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });

        inicializarInterfaceDeConexao();
    }

    // Aguarda o carregamento completo do DOM para iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarAplicacao);
    } else {
        inicializarAplicacao();
    }
})();
