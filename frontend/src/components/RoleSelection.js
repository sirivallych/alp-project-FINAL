import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/RoleSelection.css';

function RoleSelection() {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    navigate('/auth', { state: { role } });
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-content">
        <h1>Welcome to EduEra</h1>
        <p>Please select your role to continue</p>
        
        <div className="role-buttons">
          <button 
            className="role-button user-role"
            onClick={() => handleRoleSelect('user')}
          >
            <i className="fas fa-user-graduate"></i>
            <span>Student</span>
            <p>Access learning materials and track your progress</p>
          </button>
          
          <button 
            className="role-button therapist-role"
            onClick={() => handleRoleSelect('therapist')}
          >
            <i className="fas fa-user-md"></i>
            <span>Therapist</span>
            <p>Monitor student progress and provide support</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection; 