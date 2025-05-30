import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Hide loading spinner after React renders
const hideLoading = () => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
  }
};

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide loading spinner immediately after render
hideLoading();

// Dispatch REACT_READY event when the app is loaded
window.dispatchEvent(new Event('REACT_READY'));

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(); 