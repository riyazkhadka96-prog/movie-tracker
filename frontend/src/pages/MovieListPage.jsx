import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';

const MovieListPage = ({ user, onLogout, onCreateMovie, onUpdateMovie, onDelete }) => {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    genre: '',
    rating: 0,
    releasedYear: new Date().getFullYear(),
  });
  const [alert, setAlert] = useState('');
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch movies on mount
  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/movies`);
      setMovies(response.data);
    } catch (error) {
      setAlert('Error loading movies');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const movie = {
      title: form.title,
      description: form.description,
      genre: form.genre,
      rating: form.rating,
      releasedYear: form.releasedYear,
    };
    try {
      if (editingMovieId) {
        await onUpdateMovie(editingMovieId, movie);
        setAlert('Movie updated successfully!');
      } else {
        await onCreateMovie(movie);
        setAlert('Movie created successfully!');
      }
      resetForm();
      await fetchMovies();
    } catch (error) {
      setAlert(error.response?.data?.message || 'Unable to save movie');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this movie?')) {
      try {
        await onDelete(id);
        await fetchMovies();
        setAlert('Movie deleted successfully!');
      } catch (error) {
        setAlert(error.response?.data?.message || 'Unable to delete movie');
      }
    }
  };

  const resetForm = () => {
    setEditingMovieId(null);
    setForm({
      title: '',
      description: '',
      genre: '',
      rating: 0,
      releasedYear: new Date().getFullYear(),
    });
  };

  const handleEdit = (movie) => {
    setEditingMovieId(movie._id || movie.id);
    setForm({
      title: movie.title || '',
      description: movie.description || '',
      genre: movie.genre || '',
      rating: movie.rating ?? 0,
      releasedYear: movie.releasedYear || new Date().getFullYear(),
    });
    setAlert('');
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const genres = ['All', ...new Set(movies.map((movie) => movie.genre).filter(Boolean))];
  const averageRating = movies.length
    ? (movies.reduce((total, movie) => total + Number(movie.rating || 0), 0) / movies.length).toFixed(1)
    : '0.0';
  const visibleMovies = movies
    .filter((movie) => genreFilter === 'All' || movie.genre === genreFilter)
    .filter((movie) => `${movie.title} ${movie.genre} ${movie.description}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
      if (sortBy === 'title') return String(a.title).localeCompare(String(b.title));
      return Number(b.releasedYear || 0) - Number(a.releasedYear || 0);
    });

  return (
    <div className="MoviePage">
      <header>
        <div className="HeaderBrand">
          <span className="HeaderLogo">M</span>
          <h2>Movie Tracker</h2>
        </div>
        <div className="header-actions">
          {user?.name && <div className="UserWelcome"><span>{user.name.charAt(0).toUpperCase()}</span><small>{user.name}</small></div>}
          <button className="logout-button" type="button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="Dashboard">
        <section className="DashboardIntro">
          <div>
            <p className="Eyebrow">Library overview</p>
            <h1>My movies</h1>
          </div>
          <div className="StatsGrid">
            <div className="StatCard"><strong>{movies.length}</strong><span>Movies</span></div>
            <div className="StatCard"><strong>{new Set(movies.map((movie) => movie.genre).filter(Boolean)).size}</strong><span>Genres</span></div>
            <div className="StatCard"><strong>{averageRating}</strong><span>Avg. rating</span></div>
          </div>
        </section>

        <div className="DashboardGrid">
          <aside className="MovieForm">
            <div className="SectionHeading">
              <p className="Eyebrow">{editingMovieId ? 'Update entry' : 'New entry'}</p>
              <h3>{editingMovieId ? 'Edit movie' : 'Add a movie'}</h3>
            </div>
            {alert && <p className={`Alert ${alert.includes('Unable') || alert.includes('Error') ? 'AlertError' : ''}`}>{alert}</p>}
            <form onSubmit={handleCreate}>
              <label>Title<input name="title" value={form.title} onChange={handleChange} placeholder="Movie title" required /></label>
              <label>Description<textarea name="description" value={form.description} onChange={handleChange} placeholder="A short summary" rows="3" /></label>
              <div className="FormRow">
                <label>Genre<input name="genre" value={form.genre} onChange={handleChange} placeholder="Drama" required /></label>
                <label>Rating<input type="number" name="rating" value={form.rating} onChange={handleChange} min="0" max="10" step="0.1" /></label>
              </div>
              <label>Released year<input type="number" name="releasedYear" value={form.releasedYear} onChange={handleChange} min="1900" max="2100" /></label>
              <button className="SaveButton" type="submit">{editingMovieId ? 'Save changes' : 'Add to library'}</button>
              {editingMovieId && <button className="CancelButton" type="button" onClick={resetForm}>Cancel editing</button>}
            </form>
          </aside>

          <section className="MovieList">
            <div className="ListToolbar">
              <div>
                <p className="Eyebrow">Your collection</p>
                <h3>{visibleMovies.length} {visibleMovies.length === 1 ? 'movie' : 'movies'}</h3>
              </div>
              <div className="ToolbarControls">
                <input className="SearchInput" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search movies" />
                <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} aria-label="Filter by genre">
                  {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort movies">
                  <option value="newest">Newest year</option>
                  <option value="rating">Top rated</option>
                  <option value="title">A to Z</option>
                </select>
              </div>
            </div>

            {visibleMovies.length === 0 ? (
              <div className="EmptyState">
                <span>M</span>
                <h3>No movies found</h3>
                <p>Try changing your search or add a new movie to your library.</p>
              </div>
            ) : (
              <div className="MovieGrid">
                {visibleMovies.map((movie) => (
                  <article className="MovieCard" key={movie._id || movie.id}>
                    <div className="MoviePoster" aria-hidden="true">
                      <span>{movie.title?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="MovieCardBody">
                      <div className="MovieCardTop">
                        <span className="MovieGenre">{movie.genre || 'Uncategorized'}</span>
                        <span className="MovieRating">{Number(movie.rating || 0).toFixed(1)} / 10</span>
                      </div>
                      <h4>{movie.title}</h4>
                      <p>{movie.description || 'No description added.'}</p>
                      <div className="MovieCardFooter">
                        <span>{movie.releasedYear}</span>
                        <div>
                          <button className="EditButton" type="button" onClick={() => handleEdit(movie)}>Edit</button>
                          <button className="DeleteButton" type="button" onClick={() => handleDelete(movie._id || movie.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default MovieListPage;