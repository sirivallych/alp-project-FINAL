# EduEra Learning Platform

A modern educational platform that uses AI to generate content for learning materials.

## Features

- User authentication (signup, login, password reset)
- Subject and subtopic browsing
- AI-generated content using Google's Gemini 2.0 Flash
- Interactive learning experience
- Responsive design for all devices

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **AI**: Google Gemini 2.0 Flash

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Google Gemini API key

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/eduera
   JWT_SECRET=your_jwt_secret_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Seed the database with initial subjects:
   ```
   npm run seed
   ```

5. Start the backend server:
   ```
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the frontend development server:
   ```
   npm start
   ```

## Using the Application

1. Sign up for a new account or log in with existing credentials
2. Browse subjects on the dashboard
3. Click on a subject to view its subtopics
4. Click on a subtopic to view or generate content
5. Content is generated using Gemini 2.0 Flash at a standard difficulty level

## Content Generation

The application uses Google's Gemini 2.0 Flash to generate educational content for subtopics. The content is generated with the following characteristics:

- Standard difficulty level suitable for college students
- Comprehensive coverage of the topic
- Clear structure with sections and bullet points
- Examples and applications where applicable

## License

MIT 