/**
 * PersonalizedContent Component
 * Displays customized learning content based on user's quiz performance and emotional state.
 * Adapts content presentation based on user's learning history and current emotional state.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import '../styles/PersonalizedContent.css';
import Loader from './Loader';

const PersonalizedContent = () => {
  // Route parameters and navigation hooks
  const { subjectId, subtopicId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // State management for content and UI
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch personalized content when component mounts
   * Uses quiz history, current emotion, and subtopic attempts to generate content
   */
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please log in.');
          setLoading(false);
          return;
        }

        // Request personalized content from backend
        const response = await axios.post(
          `${config.apiBaseUrl}/subjects/${subjectId}/subtopics/${subtopicId}/personalized-content`,
          {
            quizHistory: location.state?.quizHistory || [],
            currentEmotion: location.state?.currentEmotion || 'neutral',
            subtopicAttempts: location.state?.subtopicAttempts || 0
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.content) {
          setContent(response.data.content);
        } else {
          setError('No content available for this topic');
        }
      } catch (err) {
        console.error('Error loading content:', err);
        setError('Failed to load personalized content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [subjectId, subtopicId, location.state]);

  /**
   * Navigate back to quiz with updated level
   */
  const handleBackToQuiz = () => {
    const nextLevel = location.state?.nextLevel || 5;
    navigate(`/quiz/${subjectId}/${subtopicId}`, {
      state: {
        level: nextLevel,
        fromPersonalizedContent: true
      }
    });
  };

  // Loading state
  if (loading) {
    return <Loader text="Loading personalized content..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="personalized-content-container">
        <div className="error-message">{error}</div>
        <div className="content-navigation">
          <button onClick={handleBackToQuiz}>
            Back to Quiz
          </button>
          <button onClick={() => navigate(`/subject/${subjectId}`)}>
            Back to Subject
          </button>
        </div>
      </div>
    );
  }

  // Main content display
  return (
    <div className="personalized-content-container">
      <div className="content-header">
        <h1>
          {location.state?.subtopicName ? `Topic: ${location.state.subtopicName}` : ''}
          <br />
          Let's learn the topic with a simpler approach.
        </h1>
      </div>
      
      <div className="content-body">
        <div className="content-main">
          {/* <div className="content-image">
            <img 
              src={`https://source.unsplash.com/800x400/?${subtopicId},education`} 
              alt="Learning illustration"
            />
          </div> */}
          
          <div 
            className="content-text"
            dangerouslySetInnerHTML={{ __html: content }}
          />

             <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1em' }}>
             <button className="back-to-quiz-btn" onClick={handleBackToQuiz}>
              Back to Quiz
             </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalizedContent; 