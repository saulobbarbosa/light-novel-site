const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.registerUser = async (req, res) => {
    const { username, password } = req.body;
    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).render('register', { error: 'Usuário já existe' });
        }

        // Verifica se é o primeiro usuário a se cadastrar
        const isFirstAccount = (await User.countDocuments({})) === 0;
        const role = isFirstAccount ? 'admin' : 'user';

        const user = await User.create({
            username,
            password,
            role,
        });

        if (user) {
            const token = generateToken(user._id);
            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
            });
            res.status(201).redirect('/');
        } else {
            res.status(400).render('register', { error: 'Dados de usuário inválidos' });
        }
    } catch (error) {
        res.status(500).render('register', { error: 'Ocorreu um erro no servidor' });
    }
};

exports.loginUser = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);
            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
            });
            res.redirect('/');
        } else {
            res.status(401).render('login', { error: 'Usuário ou senha inválidos' });
        }
    } catch (error) {
        res.status(500).render('login', { error: 'Ocorreu um erro no servidor' });
    }
};

exports.logoutUser = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.redirect('/login');
};
