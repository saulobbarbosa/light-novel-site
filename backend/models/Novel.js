const mongoose = require('mongoose');

const NovelSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    synopsis: { type: String, required: true },
    coverImage: { type: String, required: true }, // Caminho para a imagem
    bannerImage: { type: String, required: true }, // Caminho para a imagem
    genres: [{ type: String, required: true }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }],
    views: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Novel', NovelSchema);
