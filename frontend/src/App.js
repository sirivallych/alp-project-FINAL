/**
 * Main Application Component
 * This is the root component of the Adaptive Learning Platform frontend.
 * It sets up routing and defines the main application structure.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelection from './components/RoleSelection';
import Auth from './components/Auth';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import TherapistDashboard from './components/TherapistDashboard';
import SubjectDetails from './components/SubjectDetails';
import Quiz from './components/Quiz';
import PersonalizedContent from './components/PersonalizedContent';
import Progress from './components/Progress';
import Performance from './components/Performance';
import TherapistSelection from './components/TherapistSelection';
import './App.css';
// require('dotenv').config();

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'therapist' ? '/therapist-dashboard' : '/dashboard'} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RoleSelection />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected User Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <Progress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject/:subjectId"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <SubjectDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:subjectId/:subtopicId"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <Quiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:subjectId/subtopics/:subtopicId/review"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <PersonalizedContent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <Performance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/therapist-selection"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <TherapistSelection />
              </ProtectedRoute>
            }
          />

          {/* Protected Therapist Routes */}
          <Route
            path="/therapist-dashboard"
            element={
              <ProtectedRoute allowedRoles={['therapist']}>
                <TherapistDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 