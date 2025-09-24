const express = require("express");
const cors = require("cors");

const app = express();
const port = 3000;

// Data storage
let highScores = [];
let requestStats = {
    questionsRequested: 0,
    scoresSubmitted: 0,
    scoresViewed: 0,
    lastReset: new Date(),
    dailyLimit: 200,
    get totalInteractions() {
        return this.questionsRequested + this.scoresSubmitted + this.scoresViewed;
    }
};

// Questions data
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

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://math-worksheet-vue.vercel.app',
        'https://math-worksheet-react.vercel.app'
    ],
    credentials: true
};

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json());

// Simple request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Reset daily stats
const resetDailyStats = () => {
    const now = new Date();
    const lastReset = new Date(requestStats.lastReset);
    
    if (now.getDate() !== lastReset.getDate()) {
        requestStats.questionsRequested = 0;
        requestStats.scoresSubmitted = 0;
        requestStats.scoresViewed = 0;
        requestStats.lastReset = now;
        console.log('Daily stats reset');
    }
};

// Basic rate limiting
const requestCounts = new Map();
const checkRateLimit = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 20;
    
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
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString() 
    });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    resetDailyStats();
    res.status(200).json({
        stats: requestStats,
        message: 'API statistics'
    });
});

// API: Get questions
app.get('/api/questions', checkRateLimit, (req, res) => {
    resetDailyStats();
    
    // Check daily limit
    if (requestStats.totalInteractions >= requestStats.dailyLimit) {
        return res.status(429).json({ 
            message: 'Daily limit reached',
            limit: requestStats.dailyLimit,
            current: requestStats.totalInteractions 
        });
    }
    
    // Count interaction
    requestStats.questionsRequested++;
    console.log(`Questions requested: ${requestStats.questionsRequested} times today`);
    
    // Send questions (without correct answers)
    const questionsForFrontend = questionsAndAnswers.map(qa => ({
        id: qa.id,
        question: qa.question,
        choices: qa.choices
    }));
    
    res.status(200).json(questionsForFrontend);
});

// API: Submit score
app.post('/api/scores', checkRateLimit, (req, res) => {
    resetDailyStats();
    
    // Check daily limit
    if (requestStats.totalInteractions >= requestStats.dailyLimit) {
        return res.status(429).json({ 
            message: 'Daily limit reached',
            limit: requestStats.dailyLimit,
            current: requestStats.totalInteractions 
        });
    }
    
    // Count interaction
    requestStats.scoresSubmitted++;
    console.log(`Scores submitted: ${requestStats.scoresSubmitted} times today`);
    
    const { name, userAnswers } = req.body;
    
    // Validation
    if (!name || userAnswers === undefined) {
        return res.status(400).json({ message: 'Name and answers are required' });
    }
    
    // Calculate score
    let currentScore = 0;
    questionsAndAnswers.forEach(qa => {
        if (userAnswers[qa.id] === qa.correctAnswer) {
            currentScore++;
        }
    });
    
    // Add to high scores
    highScores.push({ name, score: currentScore, date: new Date() });
    
    // Sort and keep top 10
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10);
    
    res.status(201).json({
        message: `You scored ${currentScore} out of 12!`,
        score: currentScore,
        highScores
    });
});

// API: Get high scores
app.get('/api/scores', checkRateLimit, (req, res) => {
    resetDailyStats();
    
    // Check daily limit
    if (requestStats.totalInteractions >= requestStats.dailyLimit) {
        return res.status(429).json({ 
            message: 'Daily limit reached',
            limit: requestStats.dailyLimit,
            current: requestStats.totalInteractions 
        });
    }
    
    // Count interaction
    requestStats.scoresViewed++;
    console.log(`Scores viewed: ${requestStats.scoresViewed} times today`);
    
    res.status(200).json(highScores);
});

// Start server
app.listen(port, () => {
    console.log(`Math Worksheet Backend listening at http://localhost:${port}`);
});