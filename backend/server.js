// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const User = require('./models/User');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 7080;

// Garante que o diretório de uploads exista
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Diretório de uploads criado em: ${uploadsDir}`);
}

// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado ao MongoDB com sucesso!'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- CORREÇÃO DO METHOD-OVERRIDE APLICADA AQUI ---
// Configuração mais robusta para ler _method a partir do corpo do formulário.
// Isso garante que POSTs possam ser tratados como PUT ou DELETE.
app.use(upload.any()); 
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));
// --- FIM DA CORREÇÃO ---

// Configuração do View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware global para dados do usuário
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

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/novels', require('./routes/novels'));

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
