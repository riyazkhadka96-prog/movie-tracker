import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MovieListPage from './pages/MovieListPage';
import { API_BASE } from './api';
import './App.css';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState('login'); // 'login', 'register', or 'movies'

  // Auth check on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = window.atob(base64);
        const decoded = JSON.parse(jsonStr);
        const expires = decoded.exp * 1000;
        if (Date.now() < expires) {
          const response = await axios.get(`${API_BASE}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCurrentUser(response.data.user);
          setIsLoggedIn(true);
          setPage('movies');
        } else {
          localStorage.removeItem('token');
          setPage('login');
        }
      } catch (e) {
        localStorage.removeItem('token');
        setPage('login');
      }
    }
  };

  const login = async (e) => {
    e.preventDefault();
    const { email, password } = e.target;
    try {
      const response = await axios.post(`${API_BASE}/api/users/login`, {
        email: email.value,
        password: password.value,
      });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setCurrentUser(user);
      setIsLoggedIn(true);
      setPage('movies');
    } catch (error) {
      const msg = error.response?.data?.message || (error.message ? `Error: ${error.message}` : 'Login failed');
      alert(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setPage('login');
  };

  // Handler to show register page
  const showRegister = () => {
    setPage('register');
  };

  return (
    <div className="App">
      {page === 'login' && <LoginPage onLogin={login} onShowRegister={showRegister} />}
      {page === 'register' && <RegisterPage onSuccess={() => setPage('login')} />}
      {page === 'movies' && (
        <MovieListPage
          user={currentUser}
          onLogout={logout}
          onCreateMovie={async (movie) => {
            await axios.post(`${API_BASE}/api/movies`, movie, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            });
          }}
          onUpdateMovie={async (id, movie) => {
            await axios.put(`${API_BASE}/api/movies/${id}`, movie, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            });
          }}
          onDelete={async (id) => {
            await axios.delete(`${API_BASE}/api/movies/${id}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            });
          }}
        />
      )}
    </div>
  );
};

export default App;