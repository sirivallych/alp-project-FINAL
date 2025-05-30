/**
 * Main server file for the ALP (Adaptive Learning Platform) backend
 * This file handles all API endpoints, authentication, and core functionality
 * https://dashboard.render.com/web/srv-d0rjhlje5dus73810gh0/deploys/dep-d0rjhlre5dus73810gpg?r=2025-05-28%4016%3A23%3A56%7E2025-05-28%4016%3A26%3A53
 */

// Required dependencies
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');

// Import database connection and models
const connectDB = require('./config/db');
const User = require('./models/User');
const Subject = require('./models/Subject');
const UserQuiz = require('./models/QuizResult');
const QuizInProgress = require('./models/QuizInProgress');
const TherapistAssignment = require('./models/TherapistAssignment');
const Message = require('./models/Message');

// Initialize Express application
const app = express();

/**
 * Initialize Google's Gemini AI model for advanced features
 * This is used for generating content and handling AI-related tasks
 */
let genAI;
let model;

try {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in environment variables');
  } else {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Gemini Flash 2.0 initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Gemini Flash 2.0:', error);
}

/**
 * Database Connection Setup
 * Establishes connection to MongoDB and logs environment status
 */
connectDB()
  .then(() => {
    console.log('MongoDB connection established in server.js');
    
    // Log environment variables (without sensitive data)
    console.log('Environment check:');
    console.log('- MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not set');
    console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
    console.log('- PORT:', process.env.PORT || 5000);
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB in server.js:', err);
  });

// Middleware Configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

/**
 * Emotion Detection Endpoint
 * POST /api/detect-emotion
 * Currently returns mock emotions, to be replaced with actual emotion detection
 */
app.post('/api/detect-emotion', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'Image is required' });
    }

    // Mock emotion detection (to be replaced with actual implementation)
    const emotions = ['happy', 'sad', 'angry', 'neutral', 'confused', 'excited'];
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    console.log('Detected emotion:', randomEmotion);
    res.json({ emotion: randomEmotion });
  } catch (error) {
    console.error('Error in emotion detection:', error);
    res.status(500).json({ message: 'Error detecting emotion' });
  }
});

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ 
      email: decoded.email,
      role: decoded.role
    });

    if (!user) {
      throw new Error('User not found');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Email configuration (commented out for development)
/*
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
*/

/**
 * User Registration Endpoint
 * POST /api/auth/:role/signup
 * Handles new user/therapist registration with validation and password hashing
 */
app.post('/api/auth/:role/signup', async (req, res) => {
  try {
    const { role } = req.params;
    const { username, email, password, firstName, lastName, phoneNumber } = req.body;

    // Validate role
    if (!['user', 'therapist'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email and password are required' });
    }

    // Email format validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user record
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role,
      firstName: firstName || '',
      lastName: lastName || '',
      phoneNumber: phoneNumber || ''
    });

    await user.save();

    res.status(201).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully` });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

/**
 * User/Therapist Login Endpoint
 * POST /api/auth/:role/login
 * Handles authentication and JWT token generation for both roles
 */
app.post('/api/auth/:role/login', async (req, res) => {
  try {
    const { role } = req.params;
    const { email, password } = req.body;

    // Validate role
    if (!['user', 'therapist'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Find user and verify credentials
    const user = await User.findOne({ email: email.toLowerCase(), role });
    if (!user) {
      return res.status(400).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} not found` });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        email: user.email,
        role: user.role
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.json({ 
      token,
      role: user.role,
      username: user.username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

/**
 * Get User/Therapist Information Endpoint
 * GET /api/auth/:role
 * Returns authenticated user's/therapist's profile information
 */
app.get('/api/auth/:role', auth, async (req, res) => {
  try {
    const { role } = req.params;
    
    // Verify role matches
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.json({
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

/**
 * Forgot Password Endpoint
 * POST /api/auth/forgot-password
 * Handles password reset request and sends reset link via email
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user and generate reset token
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Save reset token and expiry time
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    // Email sending functionality (currently commented out)
    /*
    await transporter.sendMail({
      to: email,
      subject: 'Password Reset',
      html: `Click <a href="${resetLink}">here</a> to reset your password.`
    });
    */

    res.json({ message: 'Password reset link sent to email' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending reset email' });
  }
});

/**
 * Reset Password Endpoint
 * POST /api/auth/reset-password/:token
 * Handles password reset using the token from forgot password
 */
app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find user with valid reset token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password and clear reset token
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Generate content route
app.post('/api/subjects/:subjectId/subtopics/:subtopicId/generate', auth, async (req, res) => {
  try {
    const { subjectId, subtopicId } = req.params;
    
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const subtopic = subject.subtopics.id(subtopicId);
    if (!subtopic) {
      return res.status(404).json({ message: 'Subtopic not found' });
    }

    if (!model) {
      return res.status(500).json({ message: 'Gemini Flash 2.0 model not initialized. Please check your API key configuration.' });
    }

    // Enhanced prompt for better content generation
    const prompt = `Generate comprehensive educational content about "${subtopic.name}" in the context of "${subject.name}".
    
    Please structure the content in the following format using proper markdown:

    # ${subtopic.name}

    ## Overview
    [Provide a brief introduction and overview of the topic]

    ## Key Concepts
    [List and explain the main concepts with clear definitions]

    ## Detailed Explanation
    [Provide detailed explanations with examples]

    ## Examples
    [Include practical examples with code snippets if applicable]

    ## Best Practices
    [List important best practices and tips]

    ## Common Mistakes
    [Highlight common mistakes and how to avoid them]

    ## Summary
    [Provide a concise summary of the key points]

    Please ensure:
    1. Use proper markdown formatting for headings, lists, and code blocks
    2. Include relevant examples and code snippets where appropriate
    3. Make the content engaging and easy to understand
    4. Use bullet points and numbered lists for better readability
    5. Include practical applications and real-world examples`;

    console.log('Generating content with enhanced prompt for:', subtopic.name);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let generatedContent = response.text();

    // Replace any occurrences of "Common Pitfalls" with "Common Mistakes"
    generatedContent = generatedContent.replace(/## Common Pitfalls/g, '## Common Mistakes');

    console.log('Content generated successfully for:', subtopic.name);

    subtopic.content = generatedContent;
    subtopic.generated = true;
    await subject.save();

    res.json({ content: generatedContent });
  } catch (error) {
    console.error('Error in content generation:', error);
    res.status(500).json({ 
      message: 'Error generating content',
      error: error.message 
    });
  }
});

// Get subject by ID
app.get('/api/subjects/:subjectId', auth, async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    res.json(subject);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ message: 'Error fetching subject data' });
  }
});

// Get all subjects
app.get('/api/subjects', auth, async (req, res) => {
  try {
    const subjects = await Subject.find({});
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
});

// Generate quiz questions
app.get('/api/subjects/:subjectId/subtopics/:subtopicId/quiz', async (req, res) => {
  try {
    const { subjectId, subtopicId } = req.params;
    const { previousScore, previousEmotion, previousLevel, level } = req.query;
    console.log('Quiz generation request:', { subjectId, subtopicId, previousScore, previousEmotion, previousLevel, level });

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(subtopicId)) {
      return res.status(400).json({ message: 'Invalid subject or subtopic ID' });
    }

    // Find the subject and subtopic
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const subtopic = subject.subtopics.id(subtopicId);
    if (!subtopic) {
      return res.status(404).json({ message: 'Subtopic not found' });
    }

    // Determine the next level based on previous performance or query param
    let nextLevel = 5; // Default starting level
    if (level) {
      nextLevel = parseInt(level);
    } else if (previousScore && previousEmotion && previousLevel) {
      const score = parseFloat(previousScore);
      const prevLevel = parseInt(previousLevel);
      if (score >= 80) {
        nextLevel = Math.min(prevLevel + 1, 10);
      } else if (score < 50) {
        nextLevel = Math.max(prevLevel - 1, 1);
      } else {
        nextLevel = prevLevel;
      }
      if (previousEmotion === 'confused' || previousEmotion === 'sad') {
        nextLevel = Math.max(nextLevel - 1, 1);
      } else if (previousEmotion === 'excited' || previousEmotion === 'happy') {
        nextLevel = Math.min(nextLevel + 1, 10);
      }
    }
    if (isNaN(nextLevel) || nextLevel < 1 || nextLevel > 10) {
      nextLevel = 5;
    }

    // Generate quiz questions
    const prompt = `Generate 5 multiple choice questions about "${subtopic.name}" in the context of "${subject.name}".
    Each question should have 4 options and one correct answer.
    The questions should be appropriate for level ${nextLevel} out of 10, where:
    - Levels 1-4 focus on basic concepts
    - Levels 5-7 focus on intermediate concepts
    - Levels 8-10 focus on advanced concepts

    Format the response as a JSON array with the following structure:
    [
      {
        "question": "The question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": "The correct option",
        "level": ${nextLevel}
      }
    ]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Clean and parse the response
    const cleanedResponse = text.replace(/```json\n|\n```/g, '').trim();
    const questions = JSON.parse(cleanedResponse);
    // Add level to each question
    questions.forEach(question => {
      question.level = nextLevel;
    });
    res.json({
      questions,
      level: nextLevel
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    console.error('Quiz generation error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error generating quiz questions',
      details: error.message
    });
  }
});

// Quiz results endpoint
app.post('/api/subjects/:subjectId/subtopics/:subtopicId/quiz-results', auth, async (req, res) => {
  try {
    const { subjectId, subtopicId } = req.params;
    const { score, emotion, presentLevel, nextLevel } = req.body;
    const userId = req.user._id;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(subtopicId)) {
      return res.status(400).json({ message: 'Invalid subject or subtopic ID' });
    }

    // Find or create user quiz document
    let userQuiz = await UserQuiz.findOne({
      userId,
      subjectId,
      subtopicId
    });

    if (!userQuiz) {
      userQuiz = new UserQuiz({
        userId,
        subjectId,
        subtopicId,
        results: []
      });
    }

    // Add new quiz result
    userQuiz.results.push({
      score,
      emotion,
      presentLevel,
      nextLevel
    });

    await userQuiz.save();

    res.json({ message: 'Quiz results saved successfully', userQuiz });
  } catch (error) {
    console.error('Error saving quiz results:', error);
    res.status(500).json({ message: 'Failed to save quiz results' });
  }
});

// Get quiz results for a user
app.get('/api/subjects/:subjectId/subtopics/:subtopicId/quiz-results', auth, async (req, res) => {
  try {
    const { subjectId, subtopicId } = req.params;
    const userId = req.user._id;

    const userQuiz = await UserQuiz.findOne({
      userId,
      subjectId,
      subtopicId
    });

    if (!userQuiz) {
      return res.json({ results: [] });
    }

    res.json({ results: userQuiz.results });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ message: 'Failed to fetch quiz results' });
  }
});

// Generate personalized content
app.post('/api/subjects/:subjectId/subtopics/:subtopicId/personalized-content', auth, async (req, res) => {
  try {
    const { subjectId, subtopicId } = req.params;
    const { quizHistory, currentEmotion, subtopicAttempts } = req.body;
    
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const subtopic = subject.subtopics.id(subtopicId);
    if (!subtopic) {
      return res.status(404).json({ message: 'Subtopic not found' });
    }

    if (!model) {
      return res.status(500).json({ message: 'Gemini Flash 2.0 model not initialized' });
    }

    // Filter quiz history for this specific subtopic
    const subtopicHistory = quizHistory.filter(q => q.subtopicId === subtopicId);
    const successRate = subtopicHistory.filter(q => q.score >= 60).length / subtopicHistory.length;
    const averageScore = subtopicHistory.reduce((sum, q) => sum + q.score, 0) / subtopicHistory.length;
    const commonEmotions = subtopicHistory.map(q => q.emotion);
    
    // Generate personalized content prompt
    const contentPrompt = `You are an educational AI assistant. Generate simplified learning content for a student who:
- Has attempted this topic ${subtopicAttempts} times
- Success rate: ${(successRate * 100).toFixed(1)}%
- Average score: ${averageScore.toFixed(1)}%
- Current emotional state: ${currentEmotion}
- Common emotions during learning: ${[...new Set(commonEmotions)].join(', ')}

Please generate EASY-TO-UNDERSTAND content about "${subtopic.name}" in the context of "${subject.name}" that:
1. Uses VERY SIMPLE language and LOTS of examples
2. Breaks down EVERY concept into tiny, easy-to-digest parts
3. Uses MANY visual analogies and real-world examples
4. Provides EXTREMELY detailed step-by-step explanations
5. Uses a FRIENDLY, encouraging tone
6. Includes MANY practice questions with detailed solutions
7. Focuses on building confidence through small successes

Format the content using HTML with appropriate tags for:
- Headings (h1, h2, h3)
- Paragraphs
- Lists (ordered and unordered)
- Code blocks (if applicable)
- Examples and analogies
- Practice questions with solutions

Make the content:
- EXTREMELY beginner-friendly
- Focus on ONE concept at a time
- Include MANY examples
- Use SIMPLE language
- Be VERY encouraging
- Include LOTS of practice
- Build confidence through small steps

Remember: This student has struggled with this topic multiple times, so make it as simple and clear as possible.`;

    console.log('Generating simplified content with prompt:', contentPrompt);
    
    const result = await model.generateContent(contentPrompt);
    const response = await result.response;
    const generatedContent = response.text();

    res.json({ content: generatedContent });
  } catch (error) {
    console.error('Error generating personalized content:', error);
    res.status(500).json({ 
      message: 'Error generating personalized content',
      error: error.message
    });
  }
});

// Get quiz history for the logged-in user
app.get('/api/quiz-history', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all quiz results for the user
    const userQuizzes = await UserQuiz.find({ userId })
      .populate({
        path: 'subjectId',
        select: 'name subtopics',
        model: 'Subject'
      })
      .sort({ 'results.createdAt': -1 });

    // Transform the data to include subject and subtopic names
    const quizHistory = userQuizzes.flatMap(userQuiz => {
      const subject = userQuiz.subjectId;
      const subtopic = subject?.subtopics?.find(st => st._id.toString() === userQuiz.subtopicId.toString());
      
      return userQuiz.results.map(result => ({
        subjectName: subject?.name || 'Unknown Subject',
        subtopicName: subtopic?.name || 'Unknown Subtopic',
        score: result.score,
        emotion: result.emotion,
        presentLevel: result.presentLevel,
        nextLevel: result.nextLevel,
        createdAt: result.createdAt
      }));
    });

    res.json({ 
      success: true,
      quizHistory 
    });
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch quiz history',
      error: error.message 
    });
  }
});

// Create or update a quiz in progress
app.post('/api/quiz-in-progress', auth, async (req, res) => {
  try {
    const { subjectId, subtopicId, level } = req.body;
    const userId = req.user._id;
    if (!subjectId || !subtopicId || !level) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    let quiz = await QuizInProgress.findOne({ userId, subjectId, subtopicId, attempted: false });
    if (quiz) {
      quiz.level = level;
      quiz.lastUpdated = Date.now();
      await quiz.save();
    } else {
      quiz = new QuizInProgress({ userId, subjectId, subtopicId, level, attempted: false });
      await quiz.save();
    }
    res.json({ success: true, quiz });
  } catch (error) {
    console.error('Error saving quiz in progress:', error);
    res.status(500).json({ message: 'Failed to save quiz in progress' });
  }
});

// Mark a quiz in progress as attempted (completed)
app.post('/api/quiz-in-progress/complete', auth, async (req, res) => {
  try {
    const { subjectId, subtopicId, level } = req.body;
    const userId = req.user._id;
    let quiz = await QuizInProgress.findOne({ userId, subjectId, subtopicId, attempted: false });
    if (quiz) {
      quiz.attempted = true;
      quiz.lastUpdated = Date.now();
      await quiz.save();
      res.json({ success: true });
    } else {
      // If not found, create as attempted=true (upsert)
      quiz = new QuizInProgress({ userId, subjectId, subtopicId, level: level || 1, attempted: true });
      await quiz.save();
      res.json({ success: true, created: true });
    }
  } catch (error) {
    console.error('Error completing quiz in progress:', error);
    res.status(500).json({ message: 'Failed to complete quiz in progress' });
  }
});

// Get all in-progress quizzes for the user
app.get('/api/quiz-in-progress', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const quizzes = await QuizInProgress.find({ userId, attempted: false })
      .populate('subjectId', 'name subtopics')
      .sort({ lastUpdated: -1 });

    // Attach subtopicName to each quiz
    const quizzesWithNames = quizzes.map(q => {
      let subtopicName = '';
      if (q.subjectId && q.subjectId.subtopics && Array.isArray(q.subjectId.subtopics)) {
        const found = q.subjectId.subtopics.find(st => st._id.toString() === q.subtopicId.toString());
        if (found) subtopicName = found.name;
      }
      return {
        ...q.toObject(),
        subjectName: q.subjectId?.name || '',
        subtopicName
      };
    });

    res.json({ success: true, quizzes: quizzesWithNames });
  } catch (error) {
    console.error('Error fetching quizzes in progress:', error);
    res.status(500).json({ message: 'Failed to fetch quizzes in progress' });
  }
});

/**
 * Get All Therapists Endpoint
 * GET /api/therapists
 * Returns a list of all registered therapists
 */
app.get('/api/therapists', auth, async (req, res) => {
  try {
    // Only allow users to access this endpoint
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only users can access this endpoint' });
    }

    const therapists = await User.find({ role: 'therapist' })
      .select('username email firstName lastName') // Only select necessary fields
      .sort({ username: 1 }); // Sort by username

    res.json({ therapists });
  } catch (error) {
    console.error('Error fetching therapists:', error);
    res.status(500).json({ message: 'Error fetching therapists' });
  }
});

/**
 * Assign User to Therapist Endpoint
 * POST /api/therapists/:therapistId/assign
 * Assigns the current user to a therapist
 */
app.post('/api/therapists/:therapistId/assign', auth, async (req, res) => {
  try {
    // Only allow users to access this endpoint
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only users can assign themselves to therapists' });
    }

    const { therapistId } = req.params;
    const userId = req.user._id;

    // Verify therapist exists and is actually a therapist
    const therapist = await User.findOne({ _id: therapistId, role: 'therapist' });
    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    // Check if assignment already exists
    const existingAssignment = await TherapistAssignment.findOne({
      therapistId,
      userId,
      status: 'active'
    });

    if (existingAssignment) {
      return res.status(400).json({ message: 'Already assigned to this therapist' });
    }

    // Create new assignment
    const assignment = new TherapistAssignment({
      therapistId,
      userId
    });

    await assignment.save();

    res.status(201).json({ 
      message: 'Successfully assigned to therapist',
      assignment
    });
  } catch (error) {
    console.error('Error assigning therapist:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Already assigned to this therapist' });
    } else {
      res.status(500).json({ message: 'Error assigning therapist' });
    }
  }
});

/**
 * Get Assigned Users Endpoint
 * GET /api/therapists/assigned-users
 * Returns all users assigned to the current therapist
 */
app.get('/api/therapists/assigned-users', auth, async (req, res) => {
  try {
    // Only allow therapists to access this endpoint
    if (req.user.role !== 'therapist') {
      return res.status(403).json({ message: 'Only therapists can view their assigned users' });
    }

    const therapistId = req.user._id;

    const assignments = await TherapistAssignment.find({
      therapistId,
      status: 'active'
    }).populate('userId', 'username email firstName lastName');

    const assignedUsers = assignments.map(assignment => ({
      id: assignment.userId._id,
      username: assignment.userId.username,
      email: assignment.userId.email,
      firstName: assignment.userId.firstName,
      lastName: assignment.userId.lastName,
      assignedAt: assignment.assignedAt
    }));

    res.json({ assignedUsers });
  } catch (error) {
    console.error('Error fetching assigned users:', error);
    res.status(500).json({ message: 'Error fetching assigned users' });
  }
});

/**
 * Get Chat History Endpoint
 * GET /api/chat/:userId
 * Returns chat history between the current user and another user
 */
app.get('/api/chat/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Verify if users are allowed to chat (therapist-user relationship)
    const assignment = await TherapistAssignment.findOne({
      $or: [
        { therapistId: currentUserId, userId: userId },
        { therapistId: userId, userId: currentUserId }
      ],
      status: 'active'
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Not authorized to chat with this user' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('senderId', 'username firstName lastName')
    .populate('receiverId', 'username firstName lastName');

    // Mark unread messages as read
    await Message.updateMany(
      {
        senderId: userId,
        receiverId: currentUserId,
        read: false
      },
      { read: true }
    );

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Error fetching chat history' });
  }
});

/**
 * Send Message Endpoint
 * POST /api/chat/:userId
 * Sends a message to another user
 */
app.post('/api/chat/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { content, attachment } = req.body;
    const currentUserId = req.user._id;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Verify if users are allowed to chat
    const assignment = await TherapistAssignment.findOne({
      $or: [
        { therapistId: currentUserId, userId: userId },
        { therapistId: userId, userId: currentUserId }
      ],
      status: 'active'
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Not authorized to chat with this user' });
    }

    // Create new message
    const message = new Message({
      senderId: currentUserId,
      receiverId: userId,
      content,
      attachment
    });

    await message.save();

    // Populate sender and receiver details
    await message.populate('senderId', 'username firstName lastName');
    await message.populate('receiverId', 'username firstName lastName');

    // Send real-time message if receiver is online
    const receiverWs = clients.get(userId);
    if (receiverWs) {
      receiverWs.send(JSON.stringify({
        type: 'message',
        message
      }));
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

/**
 * Get Unread Messages Count Endpoint
 * GET /api/chat/unread/count
 * Returns the count of unread messages for the current user
 */
app.get('/api/chat/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user._id,
      read: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

/**
 * Get User Progress and Performance Endpoint
 * GET /api/therapists/user/:userId/progress
 * Returns detailed progress and performance data for a specific user
 */
app.get('/api/therapists/user/:userId/progress', auth, async (req, res) => {
  try {
    // Only allow therapists to access this endpoint
    if (req.user.role !== 'therapist') {
      return res.status(403).json({ message: 'Only therapists can access user progress data' });
    }

    const { userId } = req.params;
    const therapistId = req.user._id;

    // Verify if the user is assigned to this therapist
    const assignment = await TherapistAssignment.findOne({
      therapistId,
      userId,
      status: 'active'
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Not authorized to view this user\'s data' });
    }

    // Get quiz history for the user
    const quizHistory = await UserQuiz.find({ userId })
      .populate({
        path: 'subjectId',
        select: 'name subtopics',
        model: 'Subject'
      })
      .sort({ 'results.createdAt': -1 });

    // Calculate overall statistics
    const totalQuizzes = quizHistory.reduce((sum, quiz) => sum + quiz.results.length, 0);
    const averageScore = quizHistory.reduce((sum, quiz) => {
      return sum + quiz.results.reduce((quizSum, result) => quizSum + result.score, 0);
    }, 0) / totalQuizzes || 0;

    // Get subject-wise performance
    const subjectPerformance = {};
    quizHistory.forEach(quiz => {
      const subjectName = quiz.subjectId?.name || 'Unknown Subject';
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = {
          totalQuizzes: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 100,
          recentScores: [],
          emotions: {}
        };
      }

      quiz.results.forEach(result => {
        const perf = subjectPerformance[subjectName];
        perf.totalQuizzes++;
        perf.averageScore = (perf.averageScore * (perf.totalQuizzes - 1) + result.score) / perf.totalQuizzes;
        perf.highestScore = Math.max(perf.highestScore, result.score);
        perf.lowestScore = Math.min(perf.lowestScore, result.score);
        perf.recentScores.push({
          score: result.score,
          emotion: result.emotion,
          date: result.createdAt,
          level: result.presentLevel
        });
        perf.emotions[result.emotion] = (perf.emotions[result.emotion] || 0) + 1;
      });
    });

    // Get recent activity (last 7 days)
    const recentActivity = quizHistory.flatMap(quiz => 
      quiz.results.map(result => ({
        subjectName: quiz.subjectId?.name || 'Unknown Subject',
        subtopicName: quiz.subjectId?.subtopics.find(st => st._id.toString() === quiz.subtopicId.toString())?.name || 'Unknown Subtopic',
        score: result.score,
        emotion: result.emotion,
        date: result.createdAt,
        level: result.presentLevel
      }))
    ).sort((a, b) => b.date - a.date).slice(0, 10);

    // Get learning progress (subject completion)
    const subjectProgress = {};
    quizHistory.forEach(quiz => {
      const subjectName = quiz.subjectId?.name || 'Unknown Subject';
      if (!subjectProgress[subjectName]) {
        subjectProgress[subjectName] = {
          totalSubtopics: quiz.subjectId?.subtopics?.length || 0,
          completedSubtopics: new Set(),
          averageLevel: 0,
          totalAttempts: 0
        };
      }

      const progress = subjectProgress[subjectName];
      progress.completedSubtopics.add(quiz.subtopicId.toString());
      progress.totalAttempts += quiz.results.length;
      progress.averageLevel = quiz.results.reduce((sum, result) => sum + result.presentLevel, 0) / quiz.results.length;
    });

    // Convert Sets to arrays and calculate completion percentages
    Object.keys(subjectProgress).forEach(subject => {
      subjectProgress[subject].completedSubtopics = Array.from(subjectProgress[subject].completedSubtopics).length;
      subjectProgress[subject].completionPercentage = 
        (subjectProgress[subject].completedSubtopics / subjectProgress[subject].totalSubtopics) * 100;
    });

    res.json({
      overallStats: {
        totalQuizzes,
        averageScore,
        totalSubjects: Object.keys(subjectPerformance).length
      },
      subjectPerformance,
      subjectProgress,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ message: 'Error fetching user progress data' });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Store active connections
const clients = new Map();

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const token = req.url.split('token=')[1];
  
  if (!token) {
    ws.close();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    // Store the connection
    clients.set(userId, ws);

    // Send initial connection success
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected'
    }));

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'message') {
          // Broadcast to recipient if online
          const recipientWs = clients.get(data.receiverId);
          if (recipientWs) {
            recipientWs.send(JSON.stringify({
              type: 'message',
              message: data.message
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      clients.delete(userId);
    });

  } catch (error) {
    console.error('WebSocket authentication error:', error);
    ws.close();
  }
});

/**
 * Start the server
 * Listens on the specified port or defaults to 5000
 */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('MONGO_URI:', process.env.MONGO_URI);