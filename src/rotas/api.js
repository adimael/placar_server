const fs = require('fs');
const path = require('path');
const { obterSalasAtivas, obterLogoSala } = require('../websocket/gerenciador');

/**
 * Trata as requisições HTTP e distribui para as rotas corretas
 * @param {import('http').IncomingMessage} requisicao
 * @param {import('http').ServerResponse} resposta
 */
function manipularRequisicao(requisicao, resposta) {
    // Habilita o CORS para aplicações externas
    resposta.setHeader('Access-Control-Allow-Origin', '*');
    
    const urlAnalisada = new URL(requisicao.url, `http://${requisicao.headers.host}`);
    const caminhoUrl = urlAnalisada.pathname;

    // Rota: Obter Logotipo da Sala Específica
    const correspondenciaLogo = caminhoUrl.match(/^\/api\/rooms\/([A-Z0-9]+)\/logo$/);
    if (correspondenciaLogo) {
        const codigoSala = correspondenciaLogo[1];
        const logoBase64 = obterLogoSala(codigoSala);

        if (logoBase64) {
            const buffer = Buffer.from(logoBase64, 'base64');
            resposta.writeHead(200, {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600',
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': "default-src 'none';"
            });
            resposta.end(buffer);
        } else {
            resposta.writeHead(404, { 'Content-Type': 'text/plain' });
            resposta.end('Logotipo não encontrado');
        }
        return;
    }

    // Rota: Listar Salas Ativas
    if (caminhoUrl === '/api/rooms') {
        resposta.writeHead(200, { 'Content-Type': 'application/json' });
        
        // Obtém parâmetros de paginação da URL
        const pagina = parseInt(urlAnalisada.searchParams.get('page')) || 1;
        const limite = parseInt(urlAnalisada.searchParams.get('limit')) || 12;
        
        const salasAtivas = obterSalasAtivas();

        // Aplica a paginação
        const total = salasAtivas.length;
        const totalPaginas = Math.ceil(total / limite);
        const indiceInicio = (pagina - 1) * limite;
        const indiceFim = pagina * limite;
        const salasPaginadas = salasAtivas.slice(indiceInicio, indiceFim);

        resposta.end(JSON.stringify({
            data: salasPaginadas,
            pagination: {
                total,
                pagina,
                limite,
                totalPaginas,
                possuiMais: pagina < totalPaginas
            }
        }));
        return;
    }

    // Tratamento de Servidor de Arquivos Estáticos (Frontend)
    const caminhoBase = requisicao.url.split('?')[0];
    let caminhoArquivo = path.join(__dirname, '..', '..', 'public', caminhoBase);

    // Mapeamento das páginas principais
    if (caminhoBase === '/placar') {
        caminhoArquivo = path.join(__dirname, '..', '..', 'public', 'placar.html');
    } else if (caminhoBase === '/') {
        caminhoArquivo = path.join(__dirname, '..', '..', 'public', 'index.html');
    }

    const extensao = path.extname(caminhoArquivo);
    let tipoConteudo = 'text/html';
    
    // Identifica o tipo correto de arquivo
    switch (extensao) {
        case '.js': tipoConteudo = 'text/javascript'; break;
        case '.css': tipoConteudo = 'text/css'; break;
        case '.json': tipoConteudo = 'application/json'; break;
        case '.png': tipoConteudo = 'image/png'; break;
        case '.jpg': tipoConteudo = 'image/jpg'; break;
        case '.ico': tipoConteudo = 'image/x-icon'; break;
    }

    // Leitura e entrega do arquivo solicitado
    fs.readFile(caminhoArquivo, (erro, conteudo) => {
        if (erro) {
            if (erro.code == 'ENOENT') {
                resposta.writeHead(404, { 'Content-Type': 'text/plain' });
                resposta.end('Erro 404: Página ou recurso não encontrado', 'utf-8');
            } else {
                resposta.writeHead(500);
                resposta.end(`Desculpe, ocorreu um erro no servidor: ${erro.code}\n`);
            }
        } else {
            const cabecalhos = { 'Content-Type': tipoConteudo };
            
            // Controle de Cache para melhorar a performance
            if (tipoConteudo === 'text/html') {
                cabecalhos['Cache-Control'] = 'no-cache';
            } else {
                cabecalhos['Cache-Control'] = 'public, max-age=86400';
            }

            resposta.writeHead(200, cabecalhos);
            resposta.end(conteudo);
        }
    });
}

module.exports = {
    manipularRequisicao
};
