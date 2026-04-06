const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user
        let user = await User.findOne({ username });

        // For demo purposes, auto-create a user if none exists
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            user = await User.create({
                username,
                password: hashedPassword,
                role: 'Admin'
            });
            console.log("Demo user created:", username);
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (user && isMatch) {
            res.json({
                _id: user.id,
                username: user.username,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { loginUser };
