const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const API_BASE = 'http://localhost:5000'; // kept for reference; backend self-awareness

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        const user = await User.create({ name, email, password });

        res.status(201).json({
            _id:   user._id,
            name:  user.name,
            email: user.email,
            stats: user.stats,
            token: generateToken(user._id)
        });
    } catch (error) {
        // Handle Mongoose validation errors gracefully
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message).join(', ');
            return res.status(400).json({ message: messages });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // IMPORTANT: password has `select: false` in the schema.
        // We must explicitly request it here with .select('+password').
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            _id:   user._id,
            name:  user.name,
            email: user.email,
            stats: user.stats,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile with bid history
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            _id:   user._id,
            name:  user.name,
            email: user.email,
            stats: user.stats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Get user's bids
// @route   GET /api/auth/bids
// @access  Private
const getUserBids = async (req, res) => {
    try {
        const Bid = require('../models/Bid'); // dynamic import or require at top
        const bids = await Bid.find({ bidder: req.user._id })
            .populate('auction')
            .sort({ createdAt: -1 });
        res.json(bids);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, getUserBids };
