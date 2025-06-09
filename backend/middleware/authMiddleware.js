const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protege rotas que precisam de autenticação
const protect = async (req, res, next) => {
    let token;
    if (req.cookies.token) {
        try {
            token = req.cookies.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            console.error(error);
            res.status(401).send('Não autorizado, token falhou');
        }
    }
    if (!token) {
        res.status(401).redirect('/login');
    }
};

// Protege rotas que são apenas para administradores
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).send('Não autorizado como administrador');
    }
};

module.exports = { protect, admin };
