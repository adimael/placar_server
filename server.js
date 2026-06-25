const http = require('http');

// Configurações e Módulos do Sistema
const ambiente = require('./src/config/ambiente');

// Criação do Servidor HTTP principal, que vai delegar o trabalho para as rotas
const servidor = http.createServer((requisicao, resposta) => {
    rotasApi.manipularRequisicao(requisicao, resposta);
});

// Inicialização do Gerenciador de WebSockets atrelado ao servidor HTTP
websocketGerenciador.iniciarWebsocket(servidor);

// Iniciando de fato o servidor na porta configurada
servidor.listen(ambiente.porta, () => {
    console.log(`=========================================`);
    console.log(`🚀 Servidor Relay Rodando na porta ${ambiente.porta}`);
    console.log(`=========================================`);
});
