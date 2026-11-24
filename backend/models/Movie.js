const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    trim: true,
  },
  rating: {
    type: Number,
    min: [0, 'Rating must be at least 0'],
    max: [10, 'Rating must be at most 10'],
  },
  releasedYear: {
    type: Number,
    min: [1900, 'Year must be at least 1900'],
    max: [2100, 'Year must be at most 2100'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Movie = mongoose.model('Movie', movieSchema);
module.exports = Movie;