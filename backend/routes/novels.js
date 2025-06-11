const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
    createNovel,
    addChapter,
    getNovelDetails,
    getChapterContent,
    showEditNovelForm,
    updateNovel,
    showEditChapterForm,
    updateChapter,
    deleteNovel,
    deleteChapter
} = require('../controllers/novelController');

// Rota para criar novel
router.post('/', protect, admin, upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'bannerImage', maxCount: 1 }]), createNovel);

// Rota para adicionar capítulo (permite até 10 imagens)
router.post('/chapters', protect, admin, upload.array('chapterImages', 10), addChapter);

// Rota para ver detalhes de uma novel
router.get('/:id', getNovelDetails);

// --- ROTAS DE EDIÇÃO E EXCLUSÃO ---
router.get('/:id/edit', protect, admin, showEditNovelForm);
router.put('/:id', protect, admin, upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'bannerImage', maxCount: 1 }]), updateNovel);
router.delete('/:id', protect, admin, deleteNovel);

// Rota para formulário de edição de capítulo
router.get('/chapters/:chapterId/edit', protect, admin, showEditChapterForm);

// Rota para atualizar capítulo (permite até 10 imagens)
router.post('/chapters/:chapterId',
    protect,
    admin,
    upload.array('chapterImages', 10),
    methodOverride(function (req, res) {
        if (req.body && typeof req.body === 'object' && '_method' in req.body) {
            var method = req.body._method;
            delete req.body._method;
            return method;
        }
    }),
    updateChapter
);


// Rota para deletar capítulo
router.delete('/chapters/:chapterId', protect, admin, deleteChapter);

// Rota para ler um capítulo
router.get('/:novelId/chapters/:chapterId', getChapterContent);

module.exports = router;
