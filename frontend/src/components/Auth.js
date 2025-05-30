/**
 * Authentication Component
 * Handles user login and signup functionality.
 * Provides a form interface for user authentication with validation and error handling.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import '../styles/Auth.css';

function Auth() {
  const location = useLocation();
  const role = location.state?.role || 'user';
  
  // State management for form fields and UI
  const [mode, setMode] = useState('login'); // Toggle between 'login' and 'signup' modes
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Clear error and success messages after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [error, success]);

  /**
   * Handle form submission for both login and signup
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (mode === 'signup') {
      // Signup validation
      if (!username.trim()) {
        setError('Username is required');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }

      // Handle signup request
      try {
        const response = await axios.post(`${config.apiBaseUrl}/auth/${role}/signup`, {
          username,
          email,
          password
        });
        setSuccess('Account created successfully!');
        setTimeout(() => {
          setMode('login');
          setSuccess('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setUsername('');
        }, 1500);
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'An error occurred during signup';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle login request
      try {
        const response = await axios.post(`${config.apiBaseUrl}/auth/${role}/login`, {
          email,
          password
        });
        if (response.data && response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('role', role);
          setSuccess('Login successful!');
          setTimeout(() => {
            navigate(role === 'therapist' ? '/therapist-dashboard' : '/dashboard');
          }, 1500);
        } else {
          setError('Invalid response from server');
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'An error occurred during login';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="auth-outer-container">
      <div className="auth-container">
        <h2 className="auth-title">
          {role === 'therapist' ? 'Therapist ' : ''}
          {mode === 'login' ? 'Login' : 'Signup'}
        </h2>
        
        {/* Mode toggle buttons */}
        <div className="auth-toggle">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
            type="button"
          >
            Signup
          </button>
        </div>

        {/* Authentication form */}
        <form
          className={`auth-form ${mode === 'login' ? 'slide-in-left' : 'slide-in-right'}`}
          onSubmit={handleSubmit}
        >
          {/* Error and success messages */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Username field (signup only) */}
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          )}

          {/* Email field */}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />

          {/* Password field with show/hide toggle */}
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <span
              className="eye-icon"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={0}
              role="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={`fa${showPassword ? "s" : "r"} fa-eye${showPassword ? "-slash" : ""}`}></i>
            </span>
          </div>

          {/* Confirm password field (signup only) */}
          {mode === 'signup' && (
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <span
                className="eye-icon"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                tabIndex={0}
                role="button"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <i className={`fa${showConfirmPassword ? "s" : "r"} fa-eye${showConfirmPassword ? "-slash" : ""}`}></i>
              </span>
            </div>
          )}

          {/* Forgot password link (login only) */}
          {mode === 'login' && (
            <div className="forgot-link-row">
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            </div>
          )}

          {/* Submit button */}
          <button type="submit" disabled={isLoading}>
            {isLoading ? (mode === 'login' ? 'Logging in...' : 'Creating Account...') : (mode === 'login' ? 'Login' : 'Signup')}
          </button>
        </form>

        {/* Toggle between login and signup */}
        <div className="auth-links">
          {mode === 'login' ? (
            <span>Not a member? <button className="link-btn" onClick={() => setMode('signup')}>Signup now</button></span>
          ) : (
            <span>Already have an account? <button className="link-btn" onClick={() => setMode('login')}>Login</button></span>
          )}
        </div>

        {/* Add role selection link */}
        <div className="auth-links">
          <button 
            className="link-btn" 
            onClick={() => navigate('/')}
          >
            Change Role
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth; 