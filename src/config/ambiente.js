const dotenv = require('dotenv');

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Exporta as configurações de forma centralizada para uso no projeto
module.exports = {
    // Porta que o servidor irá escutar, com um fallback de segurança
    porta: process.env.PORTA || process.env.PORT || 3000,
};
