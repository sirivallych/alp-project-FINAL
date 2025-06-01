import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import Chat from './Chat';
import { useNavigate } from 'react-router-dom';
import '../styles/TherapistDashboard.css';

function TherapistDashboard() {
  const navigate = useNavigate();
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [therapistInfo, setTherapistInfo] = useState(null);

  useEffect(() => {
    fetchTherapistInfo();
    fetchAssignedUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserProgress(selectedUser.id);
    }
  }, [selectedUser]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/');
  };

  const fetchTherapistInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${config.apiBaseUrl}/therapists/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setTherapistInfo(response.data);
    } catch (err) {
      console.error('Error fetching therapist info:', err);
    }
  };

  const fetchAssignedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${config.apiBaseUrl}/therapists/assigned-users`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setAssignedUsers(response.data.assignedUsers || []);
    } catch (err) {
      console.error('Error fetching assigned users:', err);
      setError(err.response?.data?.message || 'Failed to fetch assigned users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async (userId) => {
    try {
      setLoadingProgress(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${config.apiBaseUrl}/therapists/user/${userId}/progress`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setUserProgress(response.data);
    } catch (err) {
      console.error('Error fetching user progress:', err);
      setError(err.response?.data?.message || 'Failed to fetch user progress');
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleChatClick = (user) => {
    setSelectedUser(user);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedUser(null);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const renderProgressStats = () => {
    if (!userProgress) return null;

    const { overallStats, subjectProgress } = userProgress;

    return (
      <div className="progress-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Quizzes</h3>
            <p className="stat-number">{overallStats?.totalQuizzes || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Average Score</h3>
            <p className="stat-number">{(overallStats?.averageScore || 0).toFixed(1)}%</p>
          </div>
          <div className="stat-card">
            <h3>Subjects Enrolled</h3>
            <p className="stat-number">{overallStats?.totalSubjects || 0}</p>
          </div>
        </div>

        <div className="subject-progress">
          <h3>Subject Progress</h3>
          <div className="progress-grid">
            {Object.entries(subjectProgress || {}).map(([subject, progress]) => (
              <div key={subject} className="progress-card">
                <h4>{subject}</h4>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${progress?.completionPercentage || 0}%` }}
                  ></div>
                </div>
                <div className="progress-details">
                  <p>Completion: {(progress?.completionPercentage || 0).toFixed(1)}%</p>
                  <p>Average Level: {(progress?.averageLevel || 0).toFixed(1)}</p>
                  <p>Attempts: {progress?.totalAttempts || 0}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {(userProgress?.recentActivity || []).map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-info">
                  <h4>{activity.subjectName} - {activity.subtopicName}</h4>
                  <p>Score: {activity.score}% | Level: {activity.level}</p>
                  <p className="activity-date">
                    {new Date(activity.date).toLocaleDateString()}
                  </p>
                </div>
                <div className={`emotion-indicator ${activity.emotion}`}>
                  {activity.emotion}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="therapist-dashboard">
        <div className="loading">Loading assigned users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="therapist-dashboard">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="therapist-dashboard">
      <div className="dashboard-header">
        <h1>
          Welcome, {therapistInfo ? `${therapistInfo.username}` : 'Therapist'}
        </h1>
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Assigned Users</h3>
            <p className="stat-number">{assignedUsers.length}</p>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="users-section">
          <h2>Assigned Users</h2>
          {assignedUsers.length === 0 ? (
            <div className="no-users">
              <p>No users have been assigned to you yet.</p>
            </div>
          ) : (
            <div className="users-grid">
              {assignedUsers.map((user) => (
                <div 
                  key={user.id} 
                  className={`user-card ${selectedUser?.id === user.id ? 'selected' : ''}`}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="user-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="user-info">
                    <h3>{user.firstName} {user.lastName}</h3>
                    <p className="user-username">@{user.username}</p>
                    <p className="user-email">{user.email}</p>
                    <p className="assignment-date">
                      Assigned on: {new Date(user.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="user-actions">
                    <button 
                      className="action-btn chat-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChatClick(user);
                      }}
                    >
                      <i className="fas fa-comments"></i> Chat
                    </button>
                    <button className="action-btn schedule-btn">
                      <i className="fas fa-calendar"></i> Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="user-progress-section">
            <h2>Progress & Performance</h2>
            <h3>{selectedUser.firstName} {selectedUser.lastName}</h3>
            {loadingProgress ? (
              <div className="loading">Loading progress data...</div>
            ) : (
              renderProgressStats()
            )}
          </div>
        )}
      </div>

      {showChat && selectedUser && (
        <div className="chat-overlay">
          <div className="chat-wrapper">
            <Chat
              recipientId={selectedUser.id}
              recipientName={`${selectedUser.firstName} ${selectedUser.lastName}`}
              onClose={handleCloseChat}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TherapistDashboard; 