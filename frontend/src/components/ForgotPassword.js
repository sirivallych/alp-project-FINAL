/**
 * ForgotPassword Component
 * Handles the password recovery process by allowing users to request a password reset.
 * Provides a form interface for users to enter their email address and receive reset instructions.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function ForgotPassword() {
  // State management for form fields and feedback
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  /**
   * Handle form submission for password reset request
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send password reset request to backend
      const response = await axios.post('https://alp-therapist-main.onrender.com/api/auth/forgot-password', {
        email
      });
      setMessage(response.data.message);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
      setMessage('');
    }
  };

  return (
    <div className="auth-container">
      <h2>Forgot Password</h2>
      {/* Password reset form */}
      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Error and success message display */}
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}
        
        {/* Email input field */}
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        {/* Submit button */}
        <button type="submit">Reset Password</button>
      </form>

      {/* Navigation link back to login */}
      <div className="auth-links">
        <Link to="/">Back to Login</Link>
      </div>
    </div>
  );
}

export default ForgotPassword; 