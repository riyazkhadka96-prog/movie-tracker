const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const authMiddleware = require('../middleware/auth');

// Get all movies (public)
router.get('/', async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single movie by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(400).json({ message: 'Invalid movie ID' });
  }
});

// Create a new movie (protected - requires auth)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, genre, rating, releasedYear } = req.body;
    
    // Validate required fields
    if (!title || !genre) {
      return res.status(400).json({ message: 'Title and genre are required' });
    }
    
    const movie = new Movie({
      title,
      description,
      genre,
      rating: rating || 0,
      releasedYear: releasedYear || new Date().getFullYear(),
    });
    
    await movie.save();
    res.status(201).json(movie);
  } catch (error) {
    console.error('Error creating movie:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a movie (protected - requires auth and movie owner)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
        genre: req.body.genre,
        rating: req.body.rating,
        releasedYear: req.body.releasedYear,
      },
      { returnDocument: 'after', runValidators: true }
    );
    
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    
    res.json(movie);
  } catch (error) {
    console.error('Error updating movie:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid movie ID' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a movie (protected - requires auth)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    
    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    console.error('Error deleting movie:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid movie ID' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;