const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const historySchema = new mongoose.Schema({
    novel: { type: mongoose.Schema.Types.ObjectId, ref: 'Novel' },
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
    readAt: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: '/uploads/default-profile.png' // Uma imagem padrão
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Novel'
    }],
    history: [historySchema]
}, { timestamps: true });

// Middleware para hashear a senha antes de salvar
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar senhas
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
