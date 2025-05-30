import React from 'react';
import '../styles/Loader.css';

const Loader = ({ text = 'Loading...' }) => (
  <div className="loader-container">
    <div className="spinner"></div>
    <div className="loader-text">{text}</div>
  </div>
);

export default Loader; 