const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// Register user
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // --- Validation ---
    const userRegex = /^[a-zA-Z0-9_]{3,20}$/;
    const emailRegex = /^\S+@\S+\.\S+$/;
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!userRegex.test(username)) {
      return res.status(400).json({ message: 'Username must be 3-20 characters and alphanumeric.' });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    if (!passRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be 8+ chars with uppercase, lowercase, number, and special char.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      username,
      email,
      password,
      gamification: {
        streak: 1,
        lastLoginDate: new Date()
      }
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
        streak: user.gamification.streak,
        points: user.gamification.points
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      // Check gamification (streak logic)
      const now = new Date();
      const lastLogin = user.gamification.lastLoginDate;
      let newStreak = user.gamification.streak;

      if (lastLogin) {
        const timeDiff = now - lastLogin;
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff === 1) {
          newStreak += 1; // Increment streak if logged in next day
        } else if (daysDiff > 1) {
          newStreak = 1; // Reset streak if missed a day
        }
      } else {
        newStreak = 1;
      }

      user.gamification.streak = newStreak;
      user.gamification.lastLoginDate = now;
      await user.save();

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
        streak: newStreak,
        points: user.gamification.points
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};
