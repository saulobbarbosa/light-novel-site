const express = require('express');
const router = express.Router();
const Novel = require('../models/Novel');
const User = require('../models/User'); // Importar o modelo User
const { protect, admin } = require('../middleware/authMiddleware');
const novelController = require('../controllers/novelController');

// Rota da página inicial
router.get('/', async (req, res) => {
    try {
        const mostRead = await Novel.find().sort({ views: -1 }).limit(5);
        const recentlyUpdated = await Novel.find().sort({ lastUpdated: -1 }).limit(10).populate('chapters');
        res.render('index', { mostRead, recentlyUpdated });
    } catch (error) {
        res.status(500).send('Erro ao carregar a página inicial');
    }
});

// Rota para a página de busca
router.get('/search', novelController.searchNovels);

// Rotas de páginas de autenticação
router.get('/login', (req, res) => res.render('login', { error: null }));
router.get('/register', (req, res) => res.render('register', { error: null }));

// Rota do painel de administração
router.get('/admin', protect, admin, async (req, res) => {
    try {
        const page = req.query.page || 'createNovel';
        let novels = [];
        let users = [];
        
        // --- LÓGICA ATUALIZADA PARA BUSCAR DADOS CONFORME A ABA ---
        if (page === 'createNovel' || page === 'addChapter') {
             novels = await Novel.find({});
        } else if (page === 'manageUsers') {
            // Busca todos os usuários, exceto o próprio admin que está logado
            users = await User.find({ _id: { $ne: req.user._id } }).lean();
        }

        const genresList = [
            'Ação', 'Adulto', 'Aventura', 'Comédia', 'Drama', 'Ecchi', 'Fantasia',
            'Troca de Gênero', 'Harém', 'Histórico', 'Horror', 'Josei', 'Artes Marciais',
            'Maduro', 'Mecha', 'Mistério', 'Psicológico', 'Romance', 'Vida Escolar',
            'Ficção Científica', 'Seinen', 'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai',
            'Slice of Life', 'Smut', 'Esportes', 'Sobrenatural', 'Tragédia', 'Wuxia',
            'Xianxia', 'Xuanhuan', 'Yaoi', 'Yuri'
        ];

        res.render('admin', { 
            novels, 
            users, 
            genres: genresList, 
            page 
        });
    } catch (error) {
        res.status(500).send('Erro ao carregar painel de admin');
    }
});


module.exports = router;
