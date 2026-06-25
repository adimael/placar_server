# Placar Eletrônico Digital - Servidor (Backend) ⚡

Bem-vindo ao repositório do **Placar Eletrônico Server**! 

Este projeto atua como o backend central (Servidor Relay) para o ecossistema do **Placar Eletrônico Digital**. Ele é responsável por sincronizar as ações tomadas pelo usuário no aplicativo mobile (painel administrador) com a tela do placar em exibição na web (painel para o público), processando e retransmitindo os dados em tempo real utilizando tecnologia **WebSocket**.

## 🚀 Funcionalidades

- **Sincronização em Tempo Real:** Atualiza a pontuação, o cronômetro, os nomes das equipes, brasões e cores de forma simultânea entre o mobile e as telas web, sem nenhum atraso (`delay`).
- **Arquitetura Modular (Clean Code):** O projeto foi construído seguindo boas práticas, onde a lógica de roteamento HTTP, os eventos de WebSocket e as configurações de ambiente estão isolados, facilitando manutenções futuras.
- **Suporte a Múltiplas Salas simultâneas:** O servidor pode hospedar diversas partidas e conexões ao mesmo tempo de forma isolada, organizando os usuários com o conceito de "Código da Sala".
- **Gerenciamento de Imagens Dinâmicas:** Permite armazenar e transmitir rapidamente o logotipo/brasão em formato Base64 para os navegadores.
- **Ambiente de Fácil Configuração:** Utiliza variáveis de ambiente (`.env`) para facilitar deploys em diferentes hospedagens e portas.

## 🛠️ Tecnologias Utilizadas

* **[Node.js](https://nodejs.org/):** Ambiente de execução Javascript focado em performance assíncrona.
* **[ws](https://github.com/websockets/ws):** Biblioteca WebSocket rápida e eficiente para o Node.js.
* **[dotenv](https://github.com/motdotla/dotenv):** Módulo para gerenciamento seguro de variáveis de ambiente.
* **Vanilla HTML/CSS/JS:** Servidor também embarca o painel de leitura (Frontend Público) usando CSS responsivo e Javascript moderno, sem necessidade de *build tools* complexas.

## 📋 Pré-requisitos

Para rodar este projeto, você precisará ter instalado em sua máquina ou servidor:
- **Node.js** (Versão 16.x ou superior recomendada)
- **NPM** (Gerenciador de pacotes do Node)
- Opcional para Produção: **[PM2](https://pm2.keymetrics.io/)** (Gerenciador de processos Node.js) e **Nginx**.

## ⚙️ Instalação e Configuração

**1. Clone este repositório**
```bash
git clone https://github.com/adimael/placar_server.git
cd placar_server
```

**2. Instale as dependências do Node**
```bash
npm install
```

**3. Configure as Variáveis de Ambiente**
Por padrão, o servidor rodará na porta `3000`. Você pode alterar isso criando/editando o arquivo `.env` na raiz do projeto:
```env
PORTA=3000
```

## ▶️ Como Rodar

### Modo de Desenvolvimento
No ambiente de desenvolvimento, recomendamos o uso de comandos que auto-reiniciam em caso de alteração no código.

Para rodar apenas uma vez via node:
```bash
npm start
```
*(O console deverá indicar `🚀 Servidor Relay Rodando na porta 3000`)*

### Acessando o Placar
Se estiver testando localmente, após rodar o `npm start`, abra o navegador e acesse:
```
http://localhost:3000/
```

### Modo de Produção (VPS Linux, Nginx, PM2)
Em ambientes reais, mantenha o servidor vivo utilizando o `pm2` para evitar que caia após você fechar o terminal SSH.

```bash
# Iniciar a aplicação nomeando-a no PM2
pm2 start server.js --name "placar-server"

# Salvar o PM2 na inicialização do SO
pm2 save
pm2 startup
```
*(Certifique-se de realizar o proxy reverso corretamente usando Nginx ou Apache com a opção `Upgrade $http_upgrade` ativada para garantir que o WebSocket consiga trafegar dados)*.

## 📁 Estrutura de Pastas e Clean Architecture

O projeto foi dividido pensando em manutenção de longo prazo:

```text
placar_server/
 ├── .env                      # Variáveis de porta e ambiente
 ├── package.json              # Dependências e Metadados
 ├── server.js                 # Ponto de inicialização da API HTTP e WebSockets
 ├── public/                   # [Frontend] Painel estático servido pelo Node
 │    ├── index.html           # Página inicial / Entrada na sala
 │    ├── placar.html          # O Placar digital propriamente dito
 │    ├── styles.css           # Estilizações do placar
 │    └── script.js            # Engine e lógicas web em PT-BR
 └── src/                      # [Backend] Módulos separados
      ├── config/
      │    └── ambiente.js     # Loader das configs globais
      ├── rotas/
      │    └── api.js          # Apenas as rotas HTTP e Web (Ex: /api/rooms)
      └── websocket/
           └── gerenciador.js  # Regras de Negócio e Repasse de WebSockets
```

## 🤝 Como Contribuir

Sinta-se à vontade para enviar `Pull Requests`, abrir `Issues` com ideias de novas funcionalidades ou correções. Qualquer melhoria (como novas animações do placar web) é sempre bem-vinda.

---
Feito com 💡 e ☕. Se o projeto lhe for útil, deixe uma estrela (⭐) no repositório!
