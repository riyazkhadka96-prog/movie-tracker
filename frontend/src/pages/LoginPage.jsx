import React, { useState } from 'react';

const LoginPage = ({ onLogin, onRegister, onShowRegister }) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(e);
  };

  return (
    <main className="AuthShell">
      <section className="AuthBrand">
        <span className="BrandMark">M</span>
        <div>
          <p className="Eyebrow">Your personal cinema</p>
          <h1>Keep every great story in one place.</h1>
          <p>Build a watchlist, remember your favorites, and track every movie you discover.</p>
        </div>
      </section>

      <section className="AuthCard">
        <div className="AuthHeading">
          <p className="Eyebrow">Welcome back</p>
          <h2>Sign in to your library</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Email address
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Enter your password" required minLength={6} />
          </label>
          <button className="PrimaryAuthButton" type="submit">Sign in</button>
          <div className="AuthDivider"><span>New to Movie Tracker?</span></div>
          <button className="SecondaryAuthButton" type="button" onClick={onShowRegister}>Create an account</button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;