// import express framework and (cors) cross-origin requests
const express = require("express");
const cors = require("cors");

// create express app and define port server
const app = express();
const port = 3000;

// simple array store scores temporarily
let highScores = [];

// Track legitimate user interactions only
let userInteractionStats = {
      questionsRequested: 0,
      scoresSubmitted: 0,
      scoresViewed: 0,
      lastReset: new Date(),
      dailyLimit: 200, // Max 200 legitimate interactions per day
      get totalInteractions() {
            return this.questionsRequested + this.scoresSubmitted + this.scoresViewed;
      }
};

// store question and answers on the backend
const questionsAndAnswers = [
      { id: 'q1', question: '17', correctAnswer: '20', choices: ['10', '20', '17'] },
      { id: 'q2', question: '75', correctAnswer: '80', choices: ['70', '80', '75'] },
      { id: 'q3', question: '64', correctAnswer: '60', choices: ['64', '70', '60'] },
      { id: 'q4', question: '98', correctAnswer: '100', choices: ['80', '100', '98'] },
      { id: 'q5', question: '94', correctAnswer: '90', choices: ['100', '94', '90'] },
      { id: 'q6', question: '445', correctAnswer: '450', choices: ['450', '440', '500'] },
      { id: 'q7', question: '45', correctAnswer: '50', choices: ['50', '45', '40'] },
      { id: 'q8', question: '19', correctAnswer: '20', choices: ['20', '10', '19'] },
      { id: 'q9', question: '0', correctAnswer: '0', choices: ['10', '1', '0'] },
      { id: 'q10', question: '199', correctAnswer: '200', choices: ['190', '100', '200'] },
      { id: 'q11', question: '165', correctAnswer: '170', choices: ['160', '170', '150'] },
      { id: 'q12', question: '999', correctAnswer: '1000', choices: ['990', '1000', '909'] }
];

// middleware for every incoming request
const corsOptions = {
      origin: [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'https://math-worksheet-vue.vercel.app', // Replace with your actual Vue URL
            'https://math-worksheet-react.vercel.app' // Replace with actual React app URL
            ],
      credentials: true
};

// Security middleware - log and filter requests
app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.get('Origin') || 'Unknown'}`);
      
      // Block requests to root path (reduce bot traffic)
      if (req.path === '/' || req.path === '/favicon.ico') {
            return res.status(404).json({ message: 'Not found' });
      }
      
      next();
});

app.use(cors(corsOptions)); // request from our frontend
app.use(express.json()); // read json data sent from frontend

// Rate limiting for API endpoints
const requestCounts = new Map();
app.use('/api', (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowMs = 60000; // 1 minute
      const maxRequests = 30; // Max 30 requests per minute per IP
      
      if (!requestCounts.has(clientIP)) {
            requestCounts.set(clientIP, []);
      }
      
      const requests = requestCounts.get(clientIP);
      const recentRequests = requests.filter(time => now - time < windowMs);
      
      if (recentRequests.length >= maxRequests) {
            return res.status(429).json({ message: 'Too many requests' });
      }
      
      recentRequests.push(now);
      requestCounts.set(clientIP, recentRequests);
      next();
});

// Reset daily stats at midnight
const resetDailyStats = () => {
    const now = new Date();
    const lastReset = new Date(userInteractionStats.lastReset);
    
    if (now.getDate() !== lastReset.getDate()) {
        userInteractionStats.questionsRequested = 0;
        userInteractionStats.scoresSubmitted = 0;
        userInteractionStats.scoresViewed = 0;
        userInteractionStats.lastReset = now;
        console.log('Daily stats reset');
    }
};

// Middleware to validate legitimate frontend requests
const validateFrontendRequest = (req, res, next) => {
    resetDailyStats();
    
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    const userAgent = req.get('User-Agent');
    
    // Check if request comes from allowed origins
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173', 
        'http://localhost:8080',
        'https://math-worksheet-vue.vercel.app',
        'https://math-worksheet-react.vercel.app'
    ];
    
    const isValidOrigin = origin && allowedOrigins.includes(origin);
    const isValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed));
    
    // Block obvious bots and crawlers
    const botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
    const isBot = userAgent && botPatterns.some(pattern => 
        userAgent.toLowerCase().includes(pattern)
    );
    
    if (!isValidOrigin && !isValidReferer || isBot) {
        console.log(`Blocked suspicious request from: ${origin || 'unknown'}`);
        return res.status(403).json({ message: 'Access denied' });
    }
    
    next();
};

// Health check endpoint for Vercel (no validation needed)
app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Stats endpoint to monitor legitimate user interactions
app.get('/api/stats', (req, res) => {
      resetDailyStats();
      res.status(200).json({
            stats: userInteractionStats,
            message: 'Only legitimate frontend interactions are counted'
      });
});

// API endpoint: GET /api/questions

// Endpoint send question to the frontend
app.get('/api/questions', validateFrontendRequest, (req, res) => {
      // Check daily interaction limit
      if (userInteractionStats.totalInteractions >= userInteractionStats.dailyLimit) {
            return res.status(429).json({ 
                message: 'Daily limit reached', 
                limit: userInteractionStats.dailyLimit,
                current: userInteractionStats.totalInteractions 
            });
      }
      
      // Count this legitimate user interaction
      userInteractionStats.questionsRequested++;
      
      console.log(`Questions requested: ${userInteractionStats.questionsRequested} times today`);
      
      // This is the correct way to transform our data into the desired format.
      const questionsForFrontend = questionsAndAnswers.map(qa => ({
            id: qa.id,
            question: qa.question,
            choices: qa.choices
      }));
      // We send the array to the frontend.
      res.status(200).send(questionsForFrontend);
});

// API endpoint : POST /api/scores

// Endpoint handle saving new score'
app.post("/api/scores", validateFrontendRequest, (req, res) => {
      // Check daily interaction limit
      if (userInteractionStats.totalInteractions >= userInteractionStats.dailyLimit) {
            return res.status(429).json({ 
                message: 'Daily limit reached', 
                limit: userInteractionStats.dailyLimit,
                current: userInteractionStats.totalInteractions 
            });
      }
      
      // Count this legitimate user interaction
      userInteractionStats.scoresSubmitted++;
      console.log(`Scores submitted: ${userInteractionStats.scoresSubmitted} times today`);
      // Get name and score from request body
      const { name, userAnswers } = req.body;

      // basic validation - check if name and score exist
      if (!name || userAnswers === undefined) {
            return res.status(400).send({ message: 'Name and answers are required.' });
      }

      // Check the user answer against the correct answer stored on the backend
      let currentScore = 0;
      questionsAndAnswers.forEach(qa => {
            if (userAnswers[qa.id] === qa.correctAnswer) {
                  currentScore++;
            }
      });

      // Add new score to our list
      highScores.push({ name, score: currentScore, date: new Date() });

      // sort the scores from the highest to lowest
      highScores.sort((a, b) => b.score - a.score);

      // keep only the top 10 scores
      highScores = highScores.slice(0, 10);

      // Send a success message back to the frontend
      res.status(201).send({
            message: `You scored ${currentScore} out of 12!`,
            score: currentScore,
            highScores
      });
});

// API endpoint: GET /api/scores

// Endpoint handles retrieving the list of scores
app.get("/api/scores", validateFrontendRequest, (req, res) => {
      // Check daily interaction limit
      if (userInteractionStats.totalInteractions >= userInteractionStats.dailyLimit) {
            return res.status(429).json({ 
                message: 'Daily limit reached', 
                limit: userInteractionStats.dailyLimit,
                current: userInteractionStats.totalInteractions 
            });
      }
      
      // Count this legitimate user interaction
      userInteractionStats.scoresViewed++;
      console.log(`Scores viewed: ${userInteractionStats.scoresViewed} times today`);
      
      // send the current list of high scores back to the frontend
      res.status(200).send(highScores);
});

// start the server and listen for incoming request
app.listen(port, () => {
      console.log(`Backend server listening at http://localhost:${port}`);
});
