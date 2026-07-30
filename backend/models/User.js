const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters']
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false // Never return password in queries by default
        },
        avatar: {
            type: String,
            default: null
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        // Profile Statistics — denormalized for fast reads on the profile page
        stats: {
            auctionsCreated: { type: Number, default: 0 },
            auctionsWon:     { type: Number, default: 0 },
            totalBidsPlaced: { type: Number, default: 0 },
            totalAmountSpent:{ type: Number, default: 0 }
        }
    },
    {
        timestamps: true // createdAt and updatedAt auto-managed
    }
);

// ─── Password Hashing ──────────────────────────────────────────────────────────
// NOTE: Do NOT pass 'next' as a parameter to async pre-save hooks in modern Mongoose.
// Mongoose handles the promise automatically; calling next() causes "next is not a function".
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// ─── Instance Methods ──────────────────────────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Indexes ───────────────────────────────────────────────────────────────────
// NOTE: email already has a unique: true constraint which auto-creates an index.
// Do NOT add userSchema.index({ email: 1 }) — it would create a duplicate index.

module.exports = mongoose.model('User', userSchema);
