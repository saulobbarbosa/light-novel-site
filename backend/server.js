require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 7080;

// Garante que o diretório de uploads exista
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Diretório de uploads criado em: ${uploadsDir}`);
}

// --- LÓGICA DE CONEXÃO RESILIENTE COM O BANCO DE DADOS ---

// Função para tentar conectar ao MongoDB
const connectDB = async () => {
    try {
        // Tenta conectar com um timeout mais curto para não prender o servidor
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
    } catch (err) {
        console.error('Falha na tentativa de conexão com o MongoDB:', err.message);
    }
};

// Eventos de conexão do Mongoose para monitoramento
mongoose.connection.on('connected', () => {
    console.log('Conexão com o MongoDB estabelecida com sucesso.');
});

mongoose.connection.on('error', err => {
    console.error('Erro de conexão com o MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB desconectado.');
});

// Tenta a conexão inicial ao iniciar o servidor
connectDB();

// Middleware que verifica a conexão a cada requisição
const checkDbConnection = async (req, res, next) => {
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoose.connection.readyState === 1) {
        return next(); // Se já estiver conectado, continua
    }

    console.warn('Conexão com o banco de dados perdida. Tentando reconectar...');
    await connectDB();

    if (mongoose.connection.readyState === 1) {
        console.log('Reconexão bem-sucedida!');
        return next(); // Continua após reconexão
    }

    // Se a reconexão falhou, exibe uma página de erro amigável
    res.status(503).send(`
        <html style="background-color: #111827; color: #d1d5db; font-family: sans-serif; text-align: center; padding: 50px;">
            <head><title>Erro de Conexão</title></head>
            <body>
                <h1 style="color: #c4b5fd;">Serviço Indisponível</h1>
                <p>Não foi possível estabelecer uma conexão com o banco de dados no momento.</p>
                <p>Por favor, tente novamente em alguns instantes.</p>
            </body>
        </html>
    `);
};
// --- FIM DA LÓGICA DE CONEXÃO ---

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// Configuração do View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para dados do usuário (é colocado após o check de DB)
app.use(async (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            res.locals.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            res.locals.user = null;
        }
    } else {
        res.locals.user = null;
    }
    next();
});

// Aplica o middleware de verificação de conexão ANTES de todas as rotas
app.use(checkDbConnection);

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/novels', require('./routes/novels'));

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
