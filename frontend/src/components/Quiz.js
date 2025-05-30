/**
 * Quiz Component
 * Handles the interactive quiz interface with adaptive difficulty levels and emotion detection.
 * Features include:
 * - Dynamic question loading based on difficulty level
 * - Real-time emotion detection using webcam
 * - Progress tracking and persistence
 * - Adaptive difficulty adjustment based on performance and emotional state
 * - Personalized content suggestions
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
// import '../styles/global.css';
import '../styles/Quiz.css';
import Webcam from 'react-webcam';

const Quiz = () => {
  const { subjectId, subtopicId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [subtopic, setSubtopic] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmotion, setSelectedEmotion] = useState('neutral');
  const [previousQuizData, setPreviousQuizData] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showBreakSuggestion, setShowBreakSuggestion] = useState(false);
  const [consecutiveQuizzes, setConsecutiveQuizzes] = useState(0);
  const [quizHistory, setQuizHistory] = useState([]);
  const [showContentSuggestion, setShowContentSuggestion] = useState(false);
  const [personalizedContent, setPersonalizedContent] = useState(null);
  const [subtopicAttempts, setSubtopicAttempts] = useState(() => {
    const savedAttempts = localStorage.getItem('subtopicAttempts');
    return savedAttempts ? JSON.parse(savedAttempts) : {};
  });
  const [quizProgress, setQuizProgress] = useState(() => {
    const savedProgress = localStorage.getItem(`quizProgress_${subtopicId}`);
    return savedProgress ? JSON.parse(savedProgress) : null;
  });
  const [subject, setSubject] = useState(null);
  const webcamRef = useRef(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [emotionDetections, setEmotionDetections] = useState([]);
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const captureIntervalRef = useRef(null);
  const [currentLevel, setCurrentLevel] = useState(5);
  const [contentSuggestionMessage, setContentSuggestionMessage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [presentLevel, setPresentLevel] = useState(5);
  const [nextLevel, setNextLevel] = useState(5);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  /**
   * Fetch quiz questions and initialize quiz state
   */
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        // First fetch the subject to get the subtopic
        const subjectResponse = await axios.get(`${config.apiBaseUrl}/subjects/${subjectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const subjectData = subjectResponse.data;
        setSubject(subjectData);
        const foundSubtopic = subjectData.subtopics.find(st => st._id === subtopicId);
        if (!foundSubtopic) {
          setError('Subtopic not found');
          setLoading(false);
          return;
        }
        setSubtopic(foundSubtopic);
        // Use level from navigation state if present
        const state = location.state;
        let quizLevel = 5;
        if (state?.level) {
          quizLevel = state.level;
          setCurrentLevel(state.level);
        } else if (quizProgress) {
          quizLevel = quizProgress.level;
          setCurrentLevel(quizProgress.level);
        }
        console.log('Starting quiz at level:', quizLevel);
        // Fetch quiz questions with the appropriate level
        const quizResponse = await axios.get(`${config.apiBaseUrl}/subjects/${subjectId}/subtopics/${subtopicId}/quiz`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            level: quizLevel
          }
        });
        if (quizResponse.data && quizResponse.data.questions) {
          setQuestions(quizResponse.data.questions);
          setCurrentLevel(quizLevel);
        } else {
          setError('Invalid quiz data received');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching quiz:', err);
        let errorMessage = 'Failed to load quiz questions';
        if (err.response) {
          const { data } = err.response;
          errorMessage = data.message || errorMessage;
          if (data.details) {
            console.error('Error details:', data.details);
          }
        } else if (err.request) {
          errorMessage = 'Could not connect to the server. Please check your internet connection.';
        } else {
          errorMessage = err.message || errorMessage;
        }
        setError(errorMessage);
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [subjectId, subtopicId, quizProgress, location.state]);

  /**
   * Save quiz progress before unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (questions.length > 0 && !score) {
        const progress = {
          questions,
          currentQuestion,
          selectedAnswers,
          level: currentLevel
        };
        localStorage.setItem(`quizProgress_${subtopicId}`, JSON.stringify(progress));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [questions, currentQuestion, selectedAnswers, subtopicId, score, currentLevel]);

  /**
   * Handle answer selection
   * @param {number} questionIndex - Index of the question
   * @param {string} answer - Selected answer
   */
  const handleAnswerSelect = (questionIndex, answer) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: answer
    });
  };

  /**
   * Calculate quiz score based on correct answers
   * @returns {number} Percentage score
   */
  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const calculateSuccessRate = (history) => {
    if (history.length === 0) return 0;
    const successfulQuizzes = history.filter(quiz => quiz.score >= 60).length;
    return (successfulQuizzes / history.length) * 100;
  };

  /**
   * Calculate new difficulty level based on performance and emotion
   * @param {number} currentLevel - Current difficulty level
   * @param {number} score - Quiz score
   * @param {string} emotion - Detected emotion
   * @returns {number} New difficulty level
   */
  const calculateNewLevel = (currentLevel, score, emotion) => {
    let levelChange = 0;
    
    // Adjust based on score
    if (score >= 80) {
      levelChange +=2; // Increase level for high scores
    } else if (score < 50) {
      levelChange -= 1; // Decrease level for low scores
    }

    // Adjust based on emotion
    switch (emotion) {
      case 'happy':
        levelChange += 1; // Increase level if happy
        break;
      case 'sad':
        levelChange -= 1; // Decrease level if sad
        break;
      case 'angry':
        levelChange -= 1; // Decrease level if angry
        break;
      case 'confused':
        levelChange -= 1; // Decrease level if confused
        break;
      case 'excited':
        levelChange += 1; // Increase level if excited
        break;
      // neutral emotion doesn't affect level
    }

    // Calculate new level (ensure it stays between 1 and 10)
    const newLevel = Math.max(1, Math.min(10, currentLevel + levelChange));
    return newLevel;
  };

  /**
   * Handle quiz submission
   * Saves results and updates difficulty level
   */
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const calculatedScore = calculateScore();
      setScore(calculatedScore);
      setPresentLevel(currentLevel);
      localStorage.setItem(`previousLevel_${subtopicId}`, currentLevel);
      const calculatedNextLevel = calculateNewLevel(currentLevel, calculatedScore, selectedEmotion);
      setNextLevel(calculatedNextLevel);
      if (calculatedScore < 60) {
        setConsecutiveFailures(prev => prev + 1);
      } else {
        setConsecutiveFailures(0);
      }
      console.log('Submitting quiz with:', { 
        score: calculatedScore, 
        emotion: selectedEmotion, 
        level: calculatedNextLevel
      });
      // Save quiz result
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      await axios.post(
        `${config.apiBaseUrl}/quiz-in-progress/complete`,
        {
          subjectId,
          subtopicId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const response = await axios.post(
        `${config.apiBaseUrl}/subjects/${subjectId}/subtopics/${subtopicId}/quiz-results`,
        {
          score: calculatedScore,
          emotion: selectedEmotion,
          presentLevel: currentLevel, // The level at which the quiz was taken
          nextLevel: calculatedNextLevel // The next recommended level
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Quiz submission response:', response.data);

      // Update quiz history
      const updatedHistory = [...quizHistory, {
        score: calculatedScore,
        emotion: selectedEmotion,
        level: calculatedNextLevel
      }];
      setQuizHistory(updatedHistory);

      // Check for level-based messages
      if (calculatedScore >= 80) {
        if (calculatedNextLevel === 4) {
          setContentSuggestionMessage('Great job! You\'ve mastered the basics. Time to move on to more challenging concepts!');
        } else if (calculatedNextLevel === 7) {
          setContentSuggestionMessage('Excellent progress! You\'re now ready for advanced topics.');
        } else if (calculatedNextLevel === 8) {
          setContentSuggestionMessage('Impressive! You\'re tackling complex concepts with ease.');
        }
      }

      setShowResults(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      let errorMessage = 'Failed to submit quiz results. Please try again.';
      
      if (error.response) {
        const { data } = error.response;
        errorMessage = data.message || errorMessage;
        if (data.details) {
          console.error('Error details:', data.details);
        }
      } else if (error.request) {
        errorMessage = 'Could not connect to the server. Please check your internet connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReadContent = () => {
    // Reset quiz progress and attempts when reviewing content
    localStorage.removeItem(`quizProgress_${subtopicId}`);
    setQuizProgress(null);
    setConsecutiveQuizzes(0);
    // Navigate to the personalized content page with all necessary state
    console.log('Navigating to review content with nextLevel:', nextLevel);
    navigate(`/subjects/${subjectId}/subtopics/${subtopicId}/review`, {
      state: {
        quizHistory: quizHistory.filter(q => q.subtopicId === subtopicId),
        currentEmotion: selectedEmotion,
        subtopicAttempts: subtopicAttempts[subtopicId] || 0,
        subjectId,
        subtopicId,
        subtopicName: subtopic?.name || 'Unknown Topic',
        nextLevel // pass nextLevel for use when returning
      }
    });
  };

  const getDifficultyText = (level) => {
    if (level >= 1 && level <= 4) return 'Basic';
    if (level >= 5 && level <= 7) return 'Average';
    if (level === 8) return 'Hard';
    if (level >= 9 && level <= 10) return 'Advanced';
    return 'Unknown';
  };

  const handleNextQuiz = async () => {
    if (consecutiveFailures >= 3) {
      // Show personalized content after 3 failures
      navigate(`/subjects/${subjectId}/subtopics/${subtopicId}/review`, {
        state: {
          quizHistory,
          currentEmotion: selectedEmotion,
          subtopicAttempts: subtopicAttempts[subtopicId] || 0,
          subjectId,
          subtopicId,
          subtopicName: subtopic?.name || 'Unknown Topic'
        }
      });
      setConsecutiveFailures(0); // reset after showing content
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setShowResults(false);
      setScore(null);
      setSelectedAnswers({});
      setCurrentQuestion(0);
      setEmotionDetections([]);
      setDetectedEmotion(null);
      setSelectedEmotion('neutral');

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Use the nextLevel for the next quiz
      const quizResponse = await axios.get(
        `${config.apiBaseUrl}/subjects/${subjectId}/subtopics/${subtopicId}/quiz`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            level: nextLevel // <-- use nextLevel here
          }
        }
      );

      if (quizResponse.data && quizResponse.data.questions) {
        setQuestions(quizResponse.data.questions);
        setCurrentLevel(nextLevel); // <-- update currentLevel for the next quiz
        setLoading(false);
      } else {
        setError('Invalid quiz data received');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching next quiz:', err);
      setError(`Failed to load next quiz: ${err.message}`);
      setLoading(false);
    }
  };

  const handleTakeBreak = () => {
    setConsecutiveQuizzes(0);
    navigate(`/subject/${subjectId}`);
  };

  // Update localStorage when subtopicAttempts changes
  useEffect(() => {
    localStorage.setItem('subtopicAttempts', JSON.stringify(subtopicAttempts));
  }, [subtopicAttempts]);

  // Helper to get most frequent emotion
  const getMostFrequentEmotion = (emotions) => {
    if (!emotions.length) return 'neutral';
    const freq = {};
    emotions.forEach(e => {
      if (e && e !== 'No Face Detected' && e !== 'Landmark Error' && e !== 'Coord Count Error' && e !== 'Prediction Error') {
        freq[e] = (freq[e] || 0) + 1;
      }
    });
    let max = 0, result = 'neutral';
    Object.entries(freq).forEach(([emotion, count]) => {
      if (count > max) {
        max = count;
        result = emotion;
      }
    });
    return result;
  };

  // Start webcam and periodic capture when quiz starts
  useEffect(() => {
    if (questions.length > 0 && !score && !loading) {
      setWebcamActive(true);
      setEmotionDetections([]);
      setDetectedEmotion(null);
      
      // Clear any existing interval
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      
      // Start new interval with more frequent captures
      captureIntervalRef.current = setInterval(async () => {
        if (webcamRef.current) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) {
            try {
              console.log('Sending frame to Flask for emotion detection...');
              // Send the base64 image data directly
              const response = await axios.post('http://127.0.0.1:5000/api/detect-emotion', {
                image: imageSrc
              }, {
                headers: { 
                  'Content-Type': 'application/json'
                },
                timeout: 5000 // Add timeout of 5 seconds
              });
              
              console.log('Emotion detection response:', response.data);
              if (response.data && response.data.emotion) {
                console.log('Detected emotion:', response.data.emotion);
                const lowercaseEmotion = response.data.emotion.toLowerCase();
                setEmotionDetections(prev => [...prev, lowercaseEmotion]);
                // Update detected emotion immediately
                setDetectedEmotion(lowercaseEmotion);
                setSelectedEmotion(lowercaseEmotion);
                // Clear any error messages
                setError(null);
              } else if (response.data && response.data.error) {
                console.error('Emotion detection error:', response.data.error);
                setError(`Emotion detection failed: ${response.data.error}`);
              } else {
                console.error('Invalid emotion detection response:', response.data);
                setError('Failed to detect emotion. Please try again.');
              }
            } catch (error) {
              console.error('Error detecting emotion:', error);
              if (error.code === 'ECONNABORTED') {
                setError('Emotion detection timed out. Please try again.');
              } else if (error.response) {
                setError(`Emotion detection failed: ${error.response.data.error || 'Unknown error'}`);
              } else if (error.request) {
                setError('Could not connect to emotion detection service. Please check if the service is running.');
              } else {
                setError('Failed to detect emotion. Please try again.');
              }
            }
          }
        }
      }, 5000); // Capture every 5 seconds
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [questions, score, loading]);

  // When quiz ends, determine most frequent emotion
  useEffect(() => {
    if (score !== null && emotionDetections.length > 0) {
      const mostFrequent = getMostFrequentEmotion(emotionDetections);
      setDetectedEmotion(mostFrequent);
      setSelectedEmotion(mostFrequent);
      setWebcamActive(false);
    }
  }, [score, emotionDetections]);

  const handleShowPersonalizedContent = () => {
    navigate(`/subjects/${subjectId}/subtopics/${subtopicId}/review`, {
      state: {
        quizHistory,
        currentEmotion: selectedEmotion,
        subtopicAttempts: subtopicAttempts[subtopicId] || 0,
        subjectId,
        subtopicId,
        subtopicName: subtopic?.name || 'Unknown Topic'
      }
    });
    setConsecutiveFailures(0);
  };

  const handleGoHome = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      await axios.post(
        `${config.apiBaseUrl}/quiz-in-progress`,
        {
          subjectId,
          subtopicId,
          level: currentLevel
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to save quiz progress.');
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="quiz-layout">
        <div className="quiz-section">
          <div className="quiz-loading">
            <button className="home-button" onClick={handleGoHome}>Home</button>
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading questions...</div>
          </div>
        </div>
        <div className="webcam-section">
          {/* Webcam placeholder during loading */}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-layout">
        <div className="quiz-section">
          <div className="quiz-error">
            <div className="error-message">{error}</div>
            <button className="error-button" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
        <div className="webcam-section"></div>
      </div>
    );
  }

  if (showResults) {
    // Show personalized content suggestion only if failed 2 times in a row
    const showReviewContent = consecutiveFailures >= 2 && score < 60;
    // Show 'Great job!' message only if presentLevel is 4 and score >= 60
    const showGreatJob = presentLevel === 4 && score >= 60;
    // Show 'Good enough' message if presentLevel is 7 and score >= 60
    const showGoodEnough = presentLevel === 7 && score >= 60;
    // Show 'Mastered' message if presentLevel is 8 and score >= 60
    const showMastered = presentLevel === 8 && score >= 60;
    return (
      <div className="quiz-results">
        <h2>Quiz Complete!</h2>
        <div className="results-score">
          <h1>Score: {score !== null ? `${score}%` : 'N/A'}</h1>
        </div>
        <div className="results-details">
          <div>
            <span>Present Level: {presentLevel} ({getDifficultyText(presentLevel)})</span>
          </div>
          <div>
            <span>Next Level: {nextLevel} ({getDifficultyText(nextLevel)})</span>
          </div>
          <div>
            <span>Detected Emotion: {selectedEmotion}</span>
          </div>
        </div>
        {showGreatJob && (
          <div className="content-suggestion" style={{background: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)', padding: '2em', borderRadius: '16px', margin: '2em 0', color: '#444', fontWeight: 'bold'}}>
            Great job! You've mastered the basics. Time to move on to more challenging concepts!
          </div>
        )}
        {showGoodEnough && (
          <div className="content-suggestion" style={{background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', padding: '2em', borderRadius: '16px', margin: '2em 0', color: '#444', fontWeight: 'bold'}}>
            You are good enough with this topic! Move to level 8 for a challenge.
          </div>
        )}
        {showMastered && (
          <div className="content-suggestion" style={{background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', padding: '2em', borderRadius: '16px', margin: '2em 0', color: '#444', fontWeight: 'bold'}}>
            You have mastered this topic!
          </div>
        )}
        {showReviewContent && (
          <>
            <div
              className="encouragement-message"
              style={{
                background: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
                padding: '1.2em',
                borderRadius: '14px',
                marginTop:'2em',
                marginBottom: '2em',
                color: '#444',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: '1.2rem'
              }}
            >
              Don't worry! Review this content and you'll get it next time. You're making progress!
            </div>
            <div className="content-suggestion">
              <button onClick={handleReadContent}>Review Content</button>
            </div>
          </>
        )}
        {!showReviewContent && (
          <div className="results-actions">
            <button className="results-button" onClick={handleNextQuiz}>
              Take Next Quiz
            </button>
            <button 
              className="results-button" 
              onClick={() => navigate(`/subject/${subjectId}`)}
            >
              Back to Subject
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-layout">
      <div className="quiz-section">
        <div className="quiz">
          <div className="quiz-header">
            <div className="quiz-info">
              <div className="question-number">
                Question {currentQuestion + 1} of {questions.length}
              </div>
              <div className="difficulty-level">
                <span className="level-badge">Difficulty : </span>
                <span className="level-badge">{getDifficultyText(currentLevel)} (Level {currentLevel})</span>
              </div>
            </div>
            <button className="home-button" onClick={handleGoHome}>Home</button>
          </div>

          {questions.length > 0 ? (
            <div className="question-container">
              <div className="question-text">
                {questions[currentQuestion].question}
              </div>
              <div className="options-container">
                {questions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    className={`option ${selectedAnswers[currentQuestion] === option ? 'selected' : ''}`}
                    onClick={() => handleAnswerSelect(currentQuestion, option)}
                  >
                    <div className="option-label">
                      <div className="option-circle">
                        {String.fromCharCode(65 + index)}
                      </div>
                      {option}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="quiz-error">
              <p>No questions available for this quiz.</p>
              <button onClick={() => window.location.reload()}>Try Again</button>
            </div>
          )}

          {questions.length > 0 && (
            <div className="navigation">
              <button 
                className="nav-button"
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                disabled={currentQuestion === 0}
              >
                Previous
              </button>
              {currentQuestion < questions.length - 1 ? (
                <button 
                  className="nav-button"
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                >
                  Next
                </button>
              ) : (
                <button 
                  className="nav-button"
                  onClick={handleSubmit}
                >
                  Submit
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="webcam-section">
        {webcamActive && (
          <div style={{ margin: '1em 0' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={320}
              height={240}
              style={{ borderRadius: '8px', border: '2px solid #ccc' }}
            />
            <div style={{ fontSize: '0.9em', color: '#888', marginTop: '0.5em' }}>
              Webcam is active for emotion detection...
              {detectedEmotion && (
                <div style={{ marginTop: '0.5em', fontWeight: 'bold', color: '#333' }}>
                  Current Emotion: {detectedEmotion}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz; 