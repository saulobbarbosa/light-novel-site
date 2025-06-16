const User = require('../models/User');
const Novel = require('../models/Novel');

// Exibe o perfil do usuário
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'favorites',
                model: 'Novel'
            })
            .populate({
                path: 'history.novel',
                model: 'Novel'
            })
            .populate({
                path: 'history.chapter',
                model: 'Chapter'
            });
            
        if (!user) {
            return res.status(404).redirect('/login');
        }
        res.render('profile', { userProfile: user });
    } catch (error) {
        res.status(500).send('Erro no servidor');
    }
};

// Atualiza o perfil do usuário
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.username = req.body.username || user.username;
            if (req.file) {
                user.profilePicture = `/uploads/${req.file.filename}`;
            }
            const updatedUser = await user.save();
            res.redirect('/users/profile');
        } else {
            res.status(404).send('Usuário não encontrado');
        }
    } catch (error) {
        res.status(500).send('Erro ao atualizar perfil');
    }
};

// Adiciona uma novel aos favoritos
exports.addFavorite = async (req, res) => {
    try {
        const novelId = req.params.novelId;
        const user = await User.findById(req.user._id);
        if (user && !user.favorites.includes(novelId)) {
            user.favorites.push(novelId);
            await user.save();
        }
        res.redirect(`/novels/${novelId}`);
    } catch (error) {
        res.status(500).send('Erro ao favoritar');
    }
};

// Remove uma novel dos favoritos
exports.removeFavorite = async (req, res) => {
    try {
        const novelId = req.params.novelId;
        await User.findByIdAndUpdate(req.user._id, { $pull: { favorites: novelId } });
        res.redirect(`/novels/${novelId}`);
    } catch (error) {
        res.status(500).send('Erro ao desfavoritar');
    }
};

// Limpa uma entrada específica do histórico de leitura
exports.clearHistoryEntry = async (req, res) => {
    try {
        const { chapterId } = req.params;
        await User.updateOne({ _id: req.user._id }, { $pull: { history: { chapter: chapterId } } });

        // Verifica se a requisição é AJAX para responder com JSON
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true, message: 'Histórico removido.' });
        } else {
            return res.redirect('back');
        }
    } catch (error) {
        console.error("Erro ao limpar histórico:", error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Erro ao limpar o histórico' });
        } else {
            return res.status(500).send('Erro ao limpar o histórico');
        }
    }
};

// Atualiza o cargo de um usuário (Admin)
exports.updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).send('Cargo inválido.');
        }
        const userToUpdate = await User.findById(userId);
        if (req.user._id.equals(userToUpdate._id)) {
            return res.status(403).send('Você não pode alterar seu próprio cargo.');
        }
        await User.findByIdAndUpdate(userId, { role });
        res.redirect('/admin?page=manageUsers');
    } catch (error) {
        res.status(500).send('Erro ao atualizar cargo do usuário');
    }
};

// --- NOVA FUNÇÃO DE EXCLUSÃO DE USUÁRIO ---
exports.deleteUser = async (req, res) => {
    try {
        const userIdToDelete = req.params.userId;
        const loggedInUser = req.user;

        // Verifica permissão: ou é admin deletando outro, ou usuário deletando a si mesmo
        if (loggedInUser.role !== 'admin' && !loggedInUser._id.equals(userIdToDelete)) {
            return res.status(403).send('Não autorizado.');
        }

        // Admin não pode se deletar pelo painel de outros (deve usar a própria página de perfil)
        if (loggedInUser.role === 'admin' && loggedInUser._id.equals(userIdToDelete)) {
             return res.status(403).send('Para excluir sua própria conta de administrador, vá até a sua página de perfil.');
        }

        await User.findByIdAndDelete(userIdToDelete);

        // Se o usuário deletou a si mesmo, faz logout
        if (loggedInUser._id.equals(userIdToDelete)) {
            res.cookie('token', '', {
                httpOnly: true,
                expires: new Date(0),
            });
            return res.redirect('/');
        }
        
        // Se o admin deletou outro, volta para o painel
        res.redirect('/admin?page=manageUsers');

    } catch(error) {
        console.error("Erro ao deletar usuário:", error);
        res.status(500).send('Erro ao deletar usuário.');
    }
};
