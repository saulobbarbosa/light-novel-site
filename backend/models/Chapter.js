const mongoose = require('mongoose');

// Novo schema para os blocos de conteúdo (texto ou imagem)
const contentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['text', 'image'],
        required: true
    },
    value: {
        type: String,
        required: true
    }
}, { _id: false });


const ChapterSchema = new mongoose.Schema({
    title: { type: String, required: true },
    // O conteúdo agora é um array de blocos
    content: [contentSchema],
    novel: { type: mongoose.Schema.Types.ObjectId, ref: 'Novel', required: true },
    chapterNumber: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Chapter', ChapterSchema);
