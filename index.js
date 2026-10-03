const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  exercises: [
    {
      description: String,
      duration: Number,
      date: Date
    }
  ]
});

const User = mongoose.model('User', userSchema);

// ==========================================
// CREATE USER
// POST /api/users
// ==========================================

app.post('/api/users', async (req, res) => {
  const username = req.body.username;

  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.json({
        username: existingUser.username,
        _id: existingUser._id
      });
    }

    const user = new User({
      username: username
    });

    const savedUser = await user.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET ALL USERS
// GET /api/users
// ==========================================

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});

    res.json(
      users.map(user => ({
        username: user.username,
        _id: user._id
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADD EXERCISE
// POST /api/users/:_id/exercises
// ==========================================

app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;

  const description = req.body.description;
  const duration = Number(req.body.duration);

  let date;

  if (req.body.date) {
    date = new Date(req.body.date);
  } else {
    date = new Date();
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    user.exercises.push({
      description: description,
      duration: duration,
      date: date
    });

    const savedUser = await user.save();

    const exercise =
      savedUser.exercises[savedUser.exercises.length - 1];

    res.json({
      username: savedUser.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: exercise._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET EXERCISE LOG
// GET /api/users/:_id/logs
// ==========================================

app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    let exercises = user.exercises;

    // FROM
    if (req.query.from) {
      const fromDate = new Date(req.query.from);

      exercises = exercises.filter(exercise => {
        return exercise.date >= fromDate;
      });
    }

    // TO
    if (req.query.to) {
      const toDate = new Date(req.query.to);

      // Include the entire "to" date
      toDate.setHours(23, 59, 59, 999);

      exercises = exercises.filter(exercise => {
        return exercise.date <= toDate;
      });
    }

    // LIMIT
    if (req.query.limit) {
      const limit = parseInt(req.query.limit);

      if (!isNaN(limit)) {
        exercises = exercises.slice(0, limit);
      }
    }

    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// START SERVER
// ==========================================

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(
    'Your app is listening on port ' + listener.address().port
  );
});