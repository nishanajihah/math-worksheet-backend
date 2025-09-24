const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Simple data storage
let highScores = [];
let dailyStats = {
    requests: 0,
    lastReset: new Date().toDateString(),
    limit: 100
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

// Pre-computed frontend questions (avoid processing on each request)
const frontendQuestions = questionsAndAnswers.map(qa => ({
    id: qa.id,
    question: qa.question,
    choices: qa.choices
}));

// Valid frontend origins (for strict validation)
const VALID_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173', 
    'http://localhost:8080',
    'https://math-worksheet-vue.vercel.app',
    'https://math-worksheet-react.vercel.app'
];

// Middleware: Validate frontend request
const validateFrontendRequest = (req, res, next) => {
    // Skip validation for health checks
    if (req.path === '/health') {
        return next();
    }

    // Check if request is from valid frontend
    const origin = req.get('Origin') || req.get('Referer');
    const userAgent = req.get('User-Agent') || '';

    // Block obvious bots immediately
    const botPatterns = [
        'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python',
        'postman', 'insomnia', 'facebookexternalhit', 'twitterbot',
        'googlebot', 'bingbot', 'slackbot', 'whatsapp', 'telegram'
    ];

    if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
        return res.status(403).end(); // Silent rejection for bots
    }

    // For API endpoints, require valid origin or proper headers
    if (req.path.startsWith('/api')) {
        const hasValidOrigin = origin && VALID_ORIGINS.some(validOrigin => 
            origin.startsWith(validOrigin)
        );
        
        const hasValidHeaders = req.get('Content-Type') || req.get('Accept');
        
        // Allow if either valid origin OR proper API headers (for direct testing)
        if (!hasValidOrigin && !hasValidHeaders) {
            return res.status(403).json({ error: 'Access denied' });
        }
    }

    next();
};

// Minimal middleware setup
app.use(express.json({ limit: '1mb' })); // Reduced limit
app.use(cors({
    origin: VALID_ORIGINS,
    credentials: true,
    maxAge: 3600
}));

// Apply frontend validation to all routes
app.use(validateFrontendRequest);

// Minimal logging to prevent overhead
const logRequest = (req, res, next) => {
    // Only log API calls, not health checks
    if (req.path.startsWith('/api')) {
        console.log(`API: ${req.method} ${req.path}`);
    }
    next();
};
app.use(logRequest);

// Simple daily reset (no complex processing)
const checkDailyReset = () => {
    const today = new Date().toDateString();
    if (dailyStats.lastReset !== today) {
        dailyStats.requests = 0;
        dailyStats.lastReset = today;
        return true;
    }
    return false;
};

// Simplified rate limiting (prevent infinite loops)
const rateLimiter = (req, res, next) => {
    // Skip rate limiting for health checks to prevent Vercel issues
    if (req.path === '/health') {
        return next();
    }
    
    checkDailyReset();
    
    // Simple daily limit check
    if (dailyStats.requests >= dailyStats.limit) {
        return res.status(429).json({ 
            error: 'Daily limit reached',
            reset: 'Midnight UTC'
        });
    }
    
    dailyStats.requests++;
    next();
};

// Optimized health check (no processing, immediate response)
app.get('/health', (req, res) => {
    res.status(200).end('OK'); // Fastest possible response
});

// Block favicon and other bot requests immediately
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/robots.txt', (req, res) => res.status(204).end());
app.get('/', (req, res) => res.status(404).end());

// Stats endpoint with rate limiting
app.get('/api/stats', rateLimiter, (req, res) => {
    res.status(200).json({
        dailyRequests: dailyStats.requests,
        limit: dailyStats.limit,
        reset: dailyStats.lastReset
    });
});

// API: Get questions (using your questionsAndAnswers array)
app.get('/api/questions', rateLimiter, (req, res) => {
    // Transform your questionsAndAnswers to frontend format (without correct answers)
    const questionsForFrontend = questionsAndAnswers.map(qa => ({
        id: qa.id,
        question: qa.question,
        choices: qa.choices
    }));
    
    res.status(200).json(questionsForFrontend);
});

// API: Submit score (optimized)
app.post('/api/scores', rateLimiter, (req, res) => {
    const { name, userAnswers } = req.body;
    
    // Fast validation
    if (!name || !userAnswers) {
        return res.status(400).json({ error: 'Name and answers required' });
    }
    
    // Calculate score using your questionsAndAnswers array
    let score = 0;
    questionsAndAnswers.forEach(qa => {
        if (userAnswers[qa.id] === qa.correctAnswer) {
            score++;
        }
    });
    
    // Add to scores (limit array size to prevent memory issues)
    highScores.push({ name: name.substring(0, 20), score, date: Date.now() });
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10); // Keep only top 10
    
    res.status(200).json({
        score,
        message: `Score: ${score}/12`,
        highScores
    });
});

// API: Get high scores (cached response)
app.get('/api/scores', rateLimiter, (req, res) => {
    res.status(200).json(highScores);
});

// Start server
app.listen(port, () => {
    console.log(`Math Worksheet Backend listening at http://localhost:${port}`);
});