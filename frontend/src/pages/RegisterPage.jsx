import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';

const RegisterPage = ({ onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // ✅ CALL BACKEND API TO REGISTER USER
      await axios.post(`${API_BASE}/api/users/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      // ✅ THEN Call login (pass the original event if needed)
      onSuccess();
      alert('Registration successful! Please login.');
    } catch (error) {
      const msg = error.response?.data?.message || (error.message ? `Error: ${error.message}` : 'Registration failed');
      alert(msg);
    }
  };

  return (
    <main className="AuthShell">
      <section className="AuthBrand">
        <span className="BrandMark">M</span>
        <div>
          <p className="Eyebrow">Start your collection</p>
          <h1>Your next favorite movie is waiting.</h1>
          <p>Create a private library and turn movie nights into a memorable collection.</p>
        </div>
      </section>

      <section className="AuthCard">
        <div className="AuthHeading">
          <p className="Eyebrow">Join Movie Tracker</p>
          <h2>Create your account</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Full name
            <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" required />
          </label>
          <label>
            Email address
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="At least 6 characters" required minLength={6} />
          </label>
          <button className="PrimaryAuthButton" type="submit">Create account</button>
          <div className="AuthDivider"><span>Already a member?</span></div>
          <button className="SecondaryAuthButton" type="button" onClick={onSuccess}>Back to sign in</button>
        </form>
      </section>
    </main>
  );
};

export default RegisterPage;