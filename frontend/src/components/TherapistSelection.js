import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import '../styles/TherapistSelection.css';
import { useNavigate } from 'react-router-dom';

function TherapistSelection() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [hasExistingTherapist, setHasExistingTherapist] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchTherapistData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // First check if user already has a therapist
        try {
          const therapistResponse = await axios.get(`${config.apiBaseUrl}/user/therapist`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (therapistResponse.data.therapist) {
            setSelectedTherapist(therapistResponse.data.therapist);
            setHasExistingTherapist(true);
            // If user already has a therapist, don't fetch available therapists
            setLoading(false);
            return;
          }
        } catch (therapistErr) {
          // If error is not 404 (no therapist found), handle it
          if (therapistErr.response?.status !== 404) {
            throw therapistErr;
          }
          // If 404, user has no therapist, continue to fetch available therapists
        }

        // Only fetch available therapists if user doesn't have one
        const therapistsResponse = await axios.get(`${config.apiBaseUrl}/therapists`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (therapistsResponse.data && therapistsResponse.data.therapists) {
          setTherapists(therapistsResponse.data.therapists);
        }
      } catch (err) {
        console.error('Error fetching therapist data:', err);
        setError(err.response?.data?.message || 'Failed to load therapist data');
      } finally {
        setLoading(false);
      }
    };

    fetchTherapistData();
  }, []);

  const handleSelectTherapist = (therapist) => {
    // Completely prevent selection if user already has a therapist
    if (hasExistingTherapist) {
      alert('You already have an assigned therapist. Therapist assignments are permanent and cannot be changed.');
      return;
    }
    setSelectedTherapist(therapist);
  };

  const handleAssignTherapist = async (therapistToAssign) => {
    // Double-check to prevent assignment if user already has a therapist
    if (hasExistingTherapist) {
      alert('Cannot assign new therapist. You already have a therapist assigned.');
      return;
    }

    if (!selectedTherapist || selectedTherapist._id !== therapistToAssign._id) {
      alert('Please select this therapist first before assigning.');
      return;
    }

    try {
      setAssigning(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${config.apiBaseUrl}/therapists/${therapistToAssign._id}/assign`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        setSelectedTherapist(therapistToAssign);
        setHasExistingTherapist(true);
        
        // Store in localStorage to sync with Dashboard
        localStorage.setItem('selectedTherapist', JSON.stringify(therapistToAssign));
        
        alert('Successfully assigned to therapist! This assignment is permanent.');
        
        // Redirect to dashboard after successful assignment
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error('Error assigning therapist:', err);
      
      // Handle specific error cases
      if (err.response?.status === 409) {
        setError('You already have a therapist assigned. Cannot assign a new one.');
        setHasExistingTherapist(true);
      } else if (err.response?.status === 400 && err.response?.data?.message?.includes('already assigned')) {
        setError('This therapist is no longer available or you already have a therapist assigned.');
        setHasExistingTherapist(true);
      } else {
        setError(err.response?.data?.message || 'Failed to assign therapist');
      }
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <div className="therapist-selection-loading">Loading therapists...</div>;
  }

  if (error) {
    return (
      <div className="therapist-selection-container">
        <button className="back-to-dashboard-btn" onClick={() => navigate('/dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
        <div className="therapist-selection-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // If user already has a therapist, show assigned therapist view
  if (hasExistingTherapist && selectedTherapist) {
    return (
      <div className="therapist-selection-container">
        <button className="back-to-dashboard-btn" onClick={() => navigate('/dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
        <div className="assigned-therapist-view">
          <h2>Your Assigned Therapist</h2>
          <p className="assignment-notice">
            <i className="fas fa-info-circle"></i>
            Therapist assignments are permanent and cannot be changed.
          </p>
          <div className="therapist-card assigned">
            <div className="therapist-avatar">
              <i className="fas fa-user-md"></i>
            </div>
            <div className="therapist-info">
              <h3>{selectedTherapist.firstName} {selectedTherapist.lastName}</h3>
              <p className="therapist-username">@{selectedTherapist.username}</p>
              <p className="therapist-email">{selectedTherapist.email}</p>
            </div>
            <div className="assignment-status">
              <i className="fas fa-check-circle"></i>
              <span>Assigned</span>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  // Show therapist selection view only if user doesn't have a therapist
  return (
    <div className="therapist-selection-container">
      <button className="back-to-dashboard-btn" onClick={() => navigate('/dashboard')}>
        <i className="fas fa-arrow-left"></i>
        Back to Dashboard
      </button>
      <div className="selection-header">
        <h2>Select Your Therapist</h2>
        <p className="selection-notice">
          <i className="fas fa-exclamation-triangle"></i>
          <strong>Important:</strong> Once you select a therapist, this assignment will be permanent and cannot be changed.
        </p>
      </div>
      
      {therapists.length === 0 ? (
        <div className="no-therapists">
          <p>No therapists are currently available. Please check back later.</p>
        </div>
      ) : (
        <div className="therapists-grid">
          {therapists.map((therapist) => (
            <div 
              key={therapist._id} 
              className={`therapist-card ${selectedTherapist?._id === therapist._id ? 'selected' : ''}`}
              onClick={() => handleSelectTherapist(therapist)}
            >
              <div className="therapist-avatar">
                <i className="fas fa-user-md"></i>
              </div>
              <div className="therapist-info">
                <h3>{therapist.firstName} {therapist.lastName}</h3>
                <p className="therapist-username">@{therapist.username}</p>
                <p className="therapist-email">{therapist.email}</p>
              </div>
              {selectedTherapist?._id === therapist._id && (
                <button 
                  className="assign-therapist-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignTherapist(therapist);
                  }}
                  disabled={assigning}
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {selectedTherapist && (
        <div className="confirmation-notice">
          <p>
            <i className="fas fa-info-circle"></i>
            You have selected <strong>{selectedTherapist.firstName} {selectedTherapist.lastName}</strong>. 
            Click "Confirm Assignment" to permanently assign this therapist to your account.
          </p>
        </div>
      )}
    </div>
  );
}

export default TherapistSelection;