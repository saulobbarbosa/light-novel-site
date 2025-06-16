const Novel = require('../models/Novel');
const Chapter = require('../models/Chapter');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Lista de gêneros traduzida para o português
const genresList = [
    'Ação', 'Adulto', 'Aventura', 'Comédia', 'Drama', 'Ecchi', 'Fantasia',
    'Troca de Gênero', 'Harém', 'Histórico', 'Horror', 'Josei', 'Artes Marciais',
    'Maduro', 'Mecha', 'Mistério', 'Psicológico', 'Romance', 'Vida Escolar',
    'Ficção Científica', 'Seinen', 'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai',
    'Slice of Life', 'Smut', 'Esportes', 'Sobrenatural', 'Tragédia', 'Wuxia',
    'Xianxia', 'Xuanhuan', 'Yaoi', 'Yuri'
];

// Função auxiliar para processar conteúdo de capítulo
const processChapterContent = (text, files) => {
    const contentArray = [];
    if (!text) return contentArray;

    const regex = /\[IMAGEM_(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            contentArray.push({ type: 'text', value: text.substring(lastIndex, match.index) });
        }
        const imageIndex = parseInt(match[1], 10) - 1;
        if (files && files[imageIndex]) {
            contentArray.push({ type: 'image', value: `/uploads/${files[imageIndex].filename}` });
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        contentArray.push({ type: 'text', value: text.substring(lastIndex) });
    }
    return contentArray;
};

// Adiciona um novo capítulo (lógica refeita)
exports.addChapter = async (req, res) => {
    const { novelId, title, content } = req.body;
    try {
        const novel = await Novel.findById(novelId);
        if (!novel) return res.status(404).send('Novel não encontrada');

        const contentArray = processChapterContent(content, req.files);
        
        const chapterNumber = novel.chapters.length + 1;
        const newChapter = new Chapter({ title, content: contentArray, novel: novelId, chapterNumber });
        await newChapter.save();
        
        novel.chapters.push(newChapter._id);
        novel.lastUpdated = Date.now();
        await novel.save();
        
        res.redirect(`/novels/${novelId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao adicionar capítulo');
    }
};

// Mostra o formulário de edição de capítulo (lógica refeita)
exports.showEditChapterForm = async (req, res) => {
    try {
        const chapter = await Chapter.findById(req.params.chapterId).populate('novel');
        if (!chapter) return res.status(404).send('Capítulo não encontrado');
        
        let textContent = '';
        let imageCounter = 1;
        const existingImages = [];

        chapter.content.forEach(block => {
            if (block.type === 'text') {
                textContent += block.value;
            } else if (block.type === 'image') {
                textContent += `[IMAGEM_${imageCounter}]`;
                existingImages.push(block.value);
                imageCounter++;
            }
        });

        res.render('edit-chapter', { chapter, textContent, existingImages });
    } catch (error) {
        res.status(500).send('Erro no servidor');
    }
};

// Atualiza um capítulo (lógica refeita)
exports.updateChapter = async (req, res) => {
    try {
        const { title, content } = req.body;
        const chapter = await Chapter.findById(req.params.chapterId);
        if (!chapter) return res.status(404).send('Capítulo não encontrado');

        const hasNewImages = req.files && req.files.length > 0;
        let newContentArray;

        if (hasNewImages) {
            // Caso 1: Novas imagens foram enviadas, substitui tudo
            const oldImages = chapter.content.filter(b => b.type === 'image').map(b => b.value);
            newContentArray = processChapterContent(content, req.files);
            oldImages.forEach(imageUrl => {
                const imagePath = path.join(__dirname, '..', '..', 'public', imageUrl);
                fs.unlink(imagePath, (err) => {
                    if (err) console.error(`Erro ao deletar imagem antiga ${imagePath}:`, err);
                });
            });
        } else {
            // Caso 2: Nenhuma imagem nova, preserva as antigas
            const oldImageUrls = chapter.content.filter(b => b.type === 'image').map(b => b.value);
            newContentArray = [];
            const regex = /\[IMAGEM_(\d+)\]/g;
            let lastIndex = 0;
            let match;
            while ((match = regex.exec(content)) !== null) {
                if (match.index > lastIndex) {
                    newContentArray.push({ type: 'text', value: content.substring(lastIndex, match.index) });
                }
                const imageIndex = parseInt(match[1], 10) - 1;
                if (oldImageUrls[imageIndex]) {
                    newContentArray.push({ type: 'image', value: oldImageUrls[imageIndex] });
                }
                lastIndex = regex.lastIndex;
            }
            if (lastIndex < content.length) {
                newContentArray.push({ type: 'text', value: content.substring(lastIndex) });
            }
        }
        
        chapter.title = title;
        chapter.content = newContentArray;
        await chapter.save();
        
        res.redirect(`/novels/${chapter.novel}/chapters/${chapter._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao atualizar o capítulo');
    }
};


// Deleta uma obra e todos os seus capítulos
exports.deleteNovel = async (req, res) => {
    try {
        const novelId = req.params.id;
        const novel = await Novel.findById(novelId);
        if (!novel) return res.status(404).send('Novel não encontrada');

        const chaptersToDelete = await Chapter.find({ novel: novelId });
        chaptersToDelete.forEach(chapter => {
            chapter.content.forEach(block => {
                if (block.type === 'image') {
                     const imagePath = path.join(__dirname, '..', '..', 'public', block.value);
                     fs.unlink(imagePath, err => { if (err) console.error(`Erro ao deletar imagem: ${err}`)});
                }
            });
        });
        await Chapter.deleteMany({ novel: novelId });

        await User.updateMany({}, { $pull: { favorites: novelId } });
        await User.updateMany({}, { $pull: { history: { novel: novelId } } });
        
        await Novel.findByIdAndDelete(novelId);

        res.redirect('/');
    } catch (error) {
        console.error("Erro ao deletar a novel:", error);
        res.status(500).send('Erro ao deletar a novel');
    }
};

// Deleta um capítulo
exports.deleteChapter = async (req, res) => {
    try {
        const chapterId = req.params.chapterId;
        const chapter = await Chapter.findById(chapterId);
        if (!chapter) return res.status(404).send('Capítulo não encontrado');
        
        const novelId = chapter.novel;

         chapter.content.forEach(block => {
            if (block.type === 'image') {
                const imagePath = path.join(__dirname, '..', '..', 'public', block.value);
                fs.unlink(imagePath, err => { if (err) console.error(`Erro ao deletar imagem: ${err}`)});
            }
        });

        await User.updateMany({}, { $pull: { history: { chapter: chapterId } } });
        await Novel.findByIdAndUpdate(novelId, { $pull: { chapters: chapterId } });
        await Chapter.findByIdAndDelete(chapterId);

        res.redirect(`/novels/${novelId}`);
    } catch (error) {
        console.error("Erro ao deletar o capítulo:", error);
        res.status(500).send('Erro ao deletar o capítulo');
    }
};

exports.createNovel = async (req, res) => {
    const { title, synopsis, genres } = req.body;
    const coverImage = req.files.coverImage ? `/uploads/${req.files.coverImage[0].filename}` : '';
    const bannerImage = req.files.bannerImage ? `/uploads/${req.files.bannerImage[0].filename}` : '';

    try {
        const newNovel = new Novel({
            title,
            synopsis,
            genres: Array.isArray(genres) ? genres : [genres],
            coverImage,
            bannerImage,
            author: req.user._id
        });
        await newNovel.save();
        res.redirect('/admin');
    } catch (error) {
        res.status(500).render('admin', { error: 'Erro ao criar a novel', genres: genresList, page: 'createNovel' });
    }
};

exports.getNovelDetails = async (req, res) => {
    try {
        const novel = await Novel.findById(req.params.id).populate('chapters');
        if (!novel) return res.status(404).send('Novel não encontrada');
        novel.views += 1;
        await novel.save();
        let readChapters = new Set();
        if (res.locals.user) {
            const fullUser = await User.findById(res.locals.user._id).lean();
            if (fullUser && fullUser.history) {
                fullUser.history.forEach(entry => {
                    if (entry.novel.equals(novel._id)) {
                        readChapters.add(entry.chapter.toString());
                    }
                });
            }
        }
        res.render('novel', { novel, readChapters });
    } catch (error) {
        res.status(500).send('Erro no servidor');
    }
};

exports.getChapterContent = async (req, res) => {
    try {
        const { chapterId } = req.params;
        const chapter = await Chapter.findById(chapterId).populate('novel');
        if (!chapter) return res.status(404).send('Capítulo não encontrado');
        if (res.locals.user) {
            const user = await User.findById(res.locals.user._id);
            if (user) {
                user.history = user.history.filter(h => h.chapter.toString() !== chapterId);
                user.history.unshift({ novel: chapter.novel._id, chapter: chapterId, readAt: new Date() });
                user.history = user.history.slice(0, 50);
                await user.save();
            }
        }
        const novel = await Novel.findById(chapter.novel._id).populate('chapters');
        const currentIndex = novel.chapters.findIndex(chap => chap._id.equals(chapterId));
        res.render('chapter', {
            chapter,
            novel,
            prevChapter: currentIndex > 0 ? novel.chapters[currentIndex - 1] : null,
            nextChapter: currentIndex < novel.chapters.length - 1 ? novel.chapters[currentIndex + 1] : null
        });
    } catch (error) {
        res.status(500).send('Erro no servidor');
    }
};

exports.searchNovels = async (req, res) => {
    try {
        const { query, genres } = req.query;
        let filter = {};
        if (query) filter.title = { $regex: query, $options: 'i' };
        if (genres && genres.length > 0) filter.genres = { [typeof genres === 'string' ? '$in' : '$all']: genres };
        const novels = await Novel.find(filter);
        res.render('search', {
            novels,
            genresList,
            searchQuery: query,
            selectedGenres: Array.isArray(genres) ? genres : (genres ? [genres] : [])
        });
    } catch (error) {
        res.status(500).send('Erro ao realizar a busca.');
    }
};

// --- CORREÇÃO: ADICIONANDO AS EXPORTAÇÕES QUE FALTAVAM ---
exports.showEditNovelForm = async (req, res) => {
    try {
        const novel = await Novel.findById(req.params.id);
        if (!novel) return res.status(404).send('Novel não encontrada');
        res.render('edit-novel', { novel, genres: genresList });
    } catch (error) {
        res.status(500).send('Erro no servidor');
    }
};

exports.updateNovel = async (req, res) => {
    try {
        const { title, synopsis, genres } = req.body;
        const novel = await Novel.findById(req.params.id);
        if (!novel) return res.status(404).send('Novel não encontrada');

        novel.title = title;
        novel.synopsis = synopsis;
        novel.genres = Array.isArray(genres) ? genres : [genres];
        if (req.files.coverImage) novel.coverImage = `/uploads/${req.files.coverImage[0].filename}`;
        if (req.files.bannerImage) novel.bannerImage = `/uploads/${req.files.bannerImage[0].filename}`;
        
        await novel.save();
        res.redirect(`/novels/${novel._id}`);
    } catch (error) {
        res.status(500).send('Erro ao atualizar a novel');
    }
};

exports.showCreateNovelForm = (req, res) => {
    res.render('admin', { genres: genresList, page: 'createNovel' });
};
