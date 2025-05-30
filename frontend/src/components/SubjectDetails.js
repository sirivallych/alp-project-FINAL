/**
 * SubjectDetails Component
 * Displays detailed information about a specific subject and its subtopics.
 * Provides interactive features for content navigation, zoom control, and quiz access.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import config from '../config';
// import '../styles/global.css';
import '../styles/SubjectDetails.css';

function SubjectDetails() {
  // Route parameters and navigation hooks
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State management for UI and content
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedSubtopic, setSelectedSubtopic] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subject, setSubject] = useState(null);

  /**
   * Fetch subject data when component mounts
   */
  useEffect(() => {
    fetchSubjectData();
  }, [subjectId]);

  /**
   * Update selected subtopic from navigation state if present
   */
  useEffect(() => {
    if (location.state?.selectedSubtopicIndex !== undefined) {
      setSelectedSubtopic(location.state.selectedSubtopicIndex);
    }
  }, [location.state]);

  /**
   * Fetch subject data from the backend
   * Includes error handling for various HTTP status codes
   */
  const fetchSubjectData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }
      const response = await fetch(`${config.apiBaseUrl}/subjects/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Subject not found');
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }
      const data = await response.json();
      setSubject(data);
    } catch (error) {
      setError(`Error loading subject data: ${error.message}`);
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle zoom level increase
   */
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 150));
  };

  /**
   * Handle zoom level decrease
   */
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  /**
   * Handle subtopic selection and content generation
   * @param {number} index - Index of the selected subtopic
   */
  const handleSubtopicClick = async (index) => {
    setSelectedSubtopic(index);
    const subtopic = subject.subtopics[index];
    if (!subtopic.content) {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiBaseUrl}/subjects/${subjectId}/subtopics/${subtopic._id}/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed to generate content');
        const data = await response.json();
        setSubject(prevSubject => ({
          ...prevSubject,
          subtopics: prevSubject.subtopics.map((s, i) =>
            i === index ? { ...s, content: data.content, generated: true } : s
          )
        }));
      } catch (error) {
        setError('Error generating content');
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Navigate back to dashboard
   */
  const handleBack = () => {
    navigate('/dashboard');
  };

  /**
   * Start quiz for current subtopic
   */
  const handleStartQuiz = () => {
    const currentSubtopic = subject.subtopics[selectedSubtopic];
    navigate(`/quiz/${subjectId}/${currentSubtopic._id}`);
  };

  // Loading state
  if (!subject) {
    return <div className="loading">Loading...</div>;
  }

  const currentSubtopic = subject.subtopics[selectedSubtopic] || subject.subtopics[0];

  return (
    <div className="subject-details-container dashboard-fade-in">
      <div className="subject-details-page">
        {/* Header with navigation and zoom controls */}
        <div className="subject-header">
          <div className="header-left">
            <button className="nav-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i>
            </button>
          </div>
          <div className="header-right">
            <button className="zoom-btn" onClick={handleZoomOut}>
              <i className="fas fa-search-minus"></i>
            </button>
            <span className="zoom-level">{zoomLevel}%</span>
            <button className="zoom-btn" onClick={handleZoomIn}>
              <i className="fas fa-search-plus"></i>
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="main-container">
          {/* Sidebar with subtopic navigation */}
          <div className="action-sidebar">
            <h2 className="sidebar-title">{subject.name}</h2>
            <div className="subtopics-list">
              {subject.subtopics.map((subtopic, index) => (
                <button 
                  key={index} 
                  className={`subtopic-btn ${index === selectedSubtopic ? 'active' : ''}`}
                  onClick={() => handleSubtopicClick(index)}
                >
                  {subtopic.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content display area */}
          <div className="content-area">
            <div className="document-content" style={{ fontSize: `${zoomLevel}%` }}>
              <div className="document-header"></div>
              <div className="document-body">
                {isLoading ? (
                  <div className="loading">Loading content...</div>
                ) : error ? (
                  <div className="error">{error}</div>
                ) : (
                  <>
                    {/* Markdown content rendering */}
                    <div className="markdown-content">
                      <ReactMarkdown>{currentSubtopic.content}</ReactMarkdown>
                    </div>
                    {/* Quiz button */}
                    <div className="quiz-button-container">
                      <button className="quiz-button" onClick={handleStartQuiz}>
                        Take Quiz 
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubjectDetails; 