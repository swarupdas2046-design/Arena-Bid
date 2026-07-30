const User = require('../models/User');

const getPublicProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -email');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            _id: user._id,
            name: user.name,
            stats: user.stats
        });
    } catch (error) {
        res.status(500).json({ message: 'Invalid user ID or server error' });
    }
};

module.exports = { getPublicProfile };
