import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // automatically converts into JSON
import config from '../config';
// import '../styles/global.css';
import '../styles/Dashboard.css';
import { instructorPlaceholder, coursePlaceholder } from '../assets/images/placeholder';
import { FaUserCircle } from 'react-icons/fa';
// import TherapistSelection from './TherapistSelection';
import Chat from './Chat';

function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogout, setShowLogout] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [continueLearning, setContinueLearning] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const unfinishedCourses = [
    {
      id: 1,
      title: "Learning how to create simple Swift applications in 8 lessons",
      instructor: "Dianne Edwards",
      username: "@dianneed",
      duration: "82 min",
      image: coursePlaceholder
    },
    {
      id: 2,
      title: "Best tips for drawing some good thematic illustration",
      instructor: "Dianne Edwards",
      username: "@dianneed",
      duration: "90 min",
      image: coursePlaceholder
    }
  ];

  // Fetch subjects from API
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please log in.');
          return;
        }
        
        const response = await fetch(`${config.apiBaseUrl}/subjects`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        }
        
        const data = await response.json();
        
        // Map the API data to the format expected by the component
        const formattedSubjects = data.map(subject => ({
          id: subject._id,
          name: subject.name,
          icon: getSubjectIcon(subject.name),
          color: getSubjectColor(subject.name),
          background: getSubjectBackground(subject.name),
          subtopics: subject.subtopics.map(subtopic => ({ name: subtopic.name }))
        }));
        
        setSubjects(formattedSubjects);
      } catch (error) {
        setError(`Error loading subjects: ${error.message}`);
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubjects();
  }, []);
  
  // Fetch user info from API
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please log in.');
          return;
        }
        
        const response = await fetch(`${config.apiBaseUrl}/auth/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        }
        
        const data = await response.json();
        if (data.username) {
          setUsername(data.username);
        } else {
          console.error('Username not found in response');
          setUsername('User');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setError('Failed to load user information');
        setUsername('User');
      }
    };
    
    fetchUserInfo();
  }, []);
  
  // Fetch in-progress quizzes from backend
  useEffect(() => {
    const fetchInProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axios.get(`${config.apiBaseUrl}/quiz-in-progress`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.data && response.data.success) {
          setContinueLearning(response.data.quizzes.map(q => ({
            subjectId: q.subjectId._id || q.subjectId,
            subtopicId: q.subtopicId,
            level: q.level,
            subjectName: q.subjectName || (q.subjectId.name || ''),
            subtopicName: q.subtopicName || '',
          })));
        }
      } catch (err) {
        setContinueLearning([]);
      }
    };
    fetchInProgress();
  }, []);
  
  // Add this useEffect to load selected therapist from server
  // Add this updated useEffect to your Dashboard component
// Replace the existing therapist useEffect with this one:

useEffect(() => {
  const fetchUserTherapist = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Try to get from server first
      try {
        const response = await axios.get(`${config.apiBaseUrl}/user/therapist`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.therapist) {
          setSelectedTherapist(response.data.therapist);
          // Also store in localStorage for consistency
          localStorage.setItem('selectedTherapist', JSON.stringify(response.data.therapist));
        }
      } catch (apiErr) {
        console.log('API not available, checking localStorage');
        // Fallback to localStorage if API is not available
        const storedTherapist = localStorage.getItem('selectedTherapist');
        if (storedTherapist) {
          try {
            const therapist = JSON.parse(storedTherapist);
            setSelectedTherapist(therapist);
          } catch (parseErr) {
            console.error('Error parsing stored therapist:', parseErr);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user therapist:', err);
    }
  };

  fetchUserTherapist();
}, []); // Empty dependency array

// Also add this useEffect to refresh when coming back from therapist selection:
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      // Page became visible again, refresh therapist data
      const fetchUserTherapist = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;

          const storedTherapist = localStorage.getItem('selectedTherapist');
          if (storedTherapist) {
            try {
              const therapist = JSON.parse(storedTherapist);
              setSelectedTherapist(therapist);
            } catch (parseErr) {
              console.error('Error parsing stored therapist:', parseErr);
            }
          }
        } catch (err) {
          console.error('Error refreshing therapist:', err);
        }
      };
      
      fetchUserTherapist();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);

  // Helper functions to get subject styling
  const getSubjectIcon = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('java')) {
      return "https://cdn-icons-png.flaticon.com/512/226/226777.png";
    } else if (lowerName.includes('python')) {
      return "https://cdn-icons-png.flaticon.com/512/5968/5968350.png";
    } else if (lowerName.includes('math')) {
      return "https://cdn-icons-png.flaticon.com/512/2103/2103633.png";
    } else if (lowerName.includes('science')) {
      return "https://cdn-icons-png.flaticon.com/512/3081/3081478.png";
    } else {
      return "https://cdn-icons-png.flaticon.com/512/2103/2103633.png";
    }
  };
  
  const getSubjectColor = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('java')) {
      return "#f89820";
    } else if (lowerName.includes('python')) {
      return "#4B8BBE";
    } else if (lowerName.includes('math')) {
      return "#4CAF50";
    } else if (lowerName.includes('science')) {
      return "#2196F3";
    } else {
      return "#512888";
    }
  };
  
  const getSubjectBackground = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('java')) {
      return "linear-gradient(135deg,rgb(233, 213, 189) 0%,rgb(233, 177, 177) 100%)";
    } else if (lowerName.includes('python')) {
      return "linear-gradient(135deg,rgb(181, 211, 236) 0%,rgb(124, 195, 195) 100%)";
    } else if (lowerName.includes('math')) {
      return "linear-gradient(135deg,rgb(181, 236, 211) 0%,rgb(124, 195, 124) 100%)";
    } else if (lowerName.includes('science')) {
      return "linear-gradient(135deg,rgb(173, 216, 230) 0%,rgb(0, 191, 255) 100%)";
    } else {
      return "linear-gradient(135deg,rgb(211, 181, 236) 0%,rgb(124, 124, 195) 100%)";
    }
  };

  const subjectData = {
    java: {
      name: "Java Programming",
      subtopics: ["Variables", "Loops", "Arrays", "Methods", "Classes"]
    },
    mathematics: {
      name: "Mathematics",
      subtopics: ["Addition", "Subtraction", "Multiplication", "Division", "Fractions"]
    },
    python:{
      name: "Python",
      subtopics: ["Introduction to Python", "Variables and Data Types", "Control Structures", "Functions and Modules", "Object-Oriented Programming"]
    },
    science: {
      name: "Science",
      subtopics: ["Plants", "Animals", "Matter", "Energy", "Earth"]
    },
    english: {
      name: "English",
      subtopics: ["Nouns", "Verbs", "Sentences", "Punctuation", "Vocabulary"]
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const toggleLogout = () => setShowLogout((prev) => !prev);

  const handleSubjectClick = (subject) => {
    navigate(`/subject/${subject.id}`);
  };

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter(subject => 
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContinueLearning = (quiz) => {
    if (quiz) {
      navigate(`/quiz/${quiz.subjectId}/${quiz.subtopicId}`, {
        state: { level: quiz.level }
      });
    }
  };

  function capitalizeFirstLetter(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const handleChatClick = () => {
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  // Function to navigate to Therapist Selection
  const handleTherapistSelectionClick = () => {
    navigate('/therapist-selection');
  };

  return (
    <div className="eduera-dashboard">
      <div className="sidebar">
        <div className="logo">
          <div className="logo-icon">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <span>G324</span>
        </div>
        <div className="nav-menu">
          <ul>
            <li className="active">
              <i className="fas fa-home"></i>
              <span>Dashboard</span>
            </li>
            <li onClick={() => navigate('/progress')}>
              <i className="fas fa-chart-bar"></i>
              <span>Progress</span>
            </li>
            <li onClick={() => navigate('/performance')}>
              <i className="fas fa-trophy"></i>
              <span>Performance</span>
            </li>
            <li onClick={() => handleTherapistSelectionClick()}>
              <i className="fas fa-user-md"></i>
              <span>Therapist Session</span>
              {selectedTherapist && (
                <span className="selected-therapist-indicator">
                  <i className="fas fa-check-circle"></i>
                </span>
              )}
            </li>
          </ul>
        </div>
      </div>

      <div className="main-content">
        <div className="dashboard-header">
          <div className="search-bar-container">
            <div className="search-bar">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="user-section">
            <span className="welcome-message">
              Welcome, {capitalizeFirstLetter(username)}
            </span>
            <div className="user-icon-dropdown">
              <div className="user-icon" onClick={toggleLogout}>
                <FaUserCircle size={44} color="#bdbdbd" />
              </div>
              {showLogout && (
                <div className="logout-dropdown">
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="section-header">
          <h2>Continue Learning</h2>
        </div>
        {continueLearning.length > 0 ? (
          <div className="continue-learning-list">
            {continueLearning.map((quiz, idx) => (
              <div className="continue-learning-card" key={quiz.subjectId + quiz.subtopicId}>
                <div className="continue-info">
                  <div className="continue-title">
                    {quiz.subjectName} - {quiz.subtopicName}
                  </div>
                  <div className="continue-level">
                    Level: {quiz.level}
                  </div>
                </div>
                <button className="continue-btn" onClick={() => handleContinueLearning(quiz)}>
                  Resume Quiz
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-continue-learning">
            No quiz in progress. Start a new quiz to continue learning!
          </div>
        )}
        
        <div className="section-header">
          <h2>Subjects</h2>
          <button className="more-options">
            <i className="fas fa-ellipsis-h"></i>
          </button>
        </div>
        
        {isLoading ? (
          <div className="loading">Loading subjects...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="subjects-container">
            {filteredSubjects.length === 0 ? (
              <div className="no-results">
                No subjects found matching "{searchQuery}"
              </div>
            ) : (
              <div className="subjects-grid">
                {filteredSubjects.map(subject => (
                  <div 
                    key={subject.id} 
                    className="subject-card" 
                    style={{ background: subject.background }}
                    onClick={() => handleSubjectClick(subject)}
                  >
                    <div className="subject-content">
                      <img src={subject.icon} alt={subject.name} />
                      <h3>{subject.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTherapist && (
          <div className="therapist-info-card">
            <h3>Your Assigned Therapist</h3>
            <div className="therapist-details">
              <div className="therapist-avatar">
                <i className="fas fa-user-md"></i>
              </div>
              <div className="therapist-info">
                <h4>{selectedTherapist.firstName} {selectedTherapist.lastName}</h4>
                <p>@{selectedTherapist.username}</p>
                <p>{selectedTherapist.email}</p>
              </div>
              <button 
                className="chat-btn"
                onClick={handleChatClick}
              >
                <i className="fas fa-comments"></i> Chat 
              </button>
            </div>
          </div>
        )}
      </div>
      {showChat && selectedTherapist && (
        <div className="chat-overlay">
          <div className="chat-wrapper">
            <Chat
              recipientId={selectedTherapist._id}
              recipientName={`${selectedTherapist.firstName} ${selectedTherapist.lastName}`}
              onClose={handleCloseChat}
            />
          </div>
        </div>
      )}

      {/* {showChat && selectedTherapist && (
        <Chat 
          recipientId={selectedTherapist._id}
          recipientName={`${selectedTherapist.firstName} ${selectedTherapist.lastName}`}
          onClose={handleCloseChat}
        />
      )} */}
    </div>
  );
}

export default Dashboard; 