import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import '../styles/Progress.css';
import Loader from './Loader';

const Progress = () => {
  const [quizHistory, setQuizHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.get(
          `${config.apiBaseUrl}/quiz-history`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.success) {
          setQuizHistory(response.data.quizHistory);
        } else {
          throw new Error(response.data?.message || 'Failed to load quiz history');
        }
      } catch (err) {
        console.error('Error fetching quiz history:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load quiz history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizHistory();
  }, []);

  const getDifficultyText = (level) => {
    if (level <= 3) return 'Beginner';
    if (level <= 6) return 'Intermediate';
    if (level <= 8) return 'Advanced';
    return 'Expert';
  };

  const getEmotionEmoji = (emotion) => {
    const emojis = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      neutral: '😐',
      Suprise: '😃'
    };
    return emojis[emotion] || '😐';
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return <Loader text="Loading progress..." />;
  }

  if (error) {
    return (
      <div className="progress-container">
        <div className="error-message">{error}</div>
        <button onClick={handleBack}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="progress-container">
      <div className="progress-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
        <h1>Your Learning Progress</h1>
        
      </div>

      {quizHistory.length === 0 ? (
        <div className="no-progress">
          <p>No quiz history available yet. Start taking quizzes to track your progress!</p>
        </div>
      ) : (
        <div className="progress-content">
          {quizHistory.map((quiz, index) => (
            <div key={index} className="quiz-card">
              <div className="quiz-header">
                <h3>{quiz.subjectName} - {quiz.subtopicName}</h3>
                <span className="quiz-date">
                  {new Date(quiz.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="quiz-details">
                <div className="detail-item">
                  <span className="label">Score:</span>
                  <span className={`value ${quiz.score >= 60 ? 'pass' : 'fail'}`}>
                    {quiz.score}%
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="label">Emotion:</span>
                  <span className="value">
                    {getEmotionEmoji(quiz.emotion)} {quiz.emotion}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="label">Level:</span>
                  <span className="value">
                    {getDifficultyText(quiz.presentLevel)} ({quiz.presentLevel})
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="label">Next Level:</span>
                  <span className="value">
                    {getDifficultyText(quiz.nextLevel)} ({quiz.nextLevel})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Progress; 