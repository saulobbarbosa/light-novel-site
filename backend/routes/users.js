const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { 
    getUserProfile, 
    updateUserProfile, 
    addFavorite, 
    removeFavorite,
    clearHistoryEntry,
    updateUserRole,
    deleteUser
} = require('../controllers/userController');
const upload = require('../middleware/uploadMiddleware');

router.route('/profile')
    .get(protect, getUserProfile)
    .post(protect, upload.single('profilePicture'), updateUserProfile);

router.post('/favorites/add/:novelId', protect, addFavorite);
router.post('/favorites/remove/:novelId', protect, removeFavorite);
router.post('/history/remove/:chapterId', protect, clearHistoryEntry);

// Rota para atualizar cargo de usuário (Admin)
router.put('/:userId/role', protect, admin, updateUserRole);

// --- NOVA ROTA PARA EXCLUIR USUÁRIO ---
router.delete('/:userId', protect, deleteUser);


module.exports = router;
