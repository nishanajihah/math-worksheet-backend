const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// File paths for persistent storage
const SCORES_FILE = path.join(__dirname, 'scores.json');
const STATS_FILE = path.join(__dirname, 'stats.json');

// Load scores from file or initialize empty array
let highScores = [];
try {
    if (fs.existsSync(SCORES_FILE)) {
        const data = fs.readFileSync(SCORES_FILE, 'utf8');
        highScores = JSON.parse(data) || [];
        console.log(`📚 Loaded ${highScores.length} saved scores`);
    }
} catch (error) {
    console.log('🆕 No existing scores file, starting fresh');
    highScores = [];
}

// Load daily stats from file or initialize
let dailyStats = {
    requests: 0,
    lastReset: new Date().toDateString(),
    limit: 100
};
try {
    if (fs.existsSync(STATS_FILE)) {
        const data = fs.readFileSync(STATS_FILE, 'utf8');
        dailyStats = { ...dailyStats, ...JSON.parse(data) };
    }
} catch (error) {
    console.log('🆕 No existing stats file, starting fresh');
}

// Function to save scores to file (with error handling)
const saveScores = async () => {
    try {
        await fs.promises.writeFile(SCORES_FILE, JSON.stringify(highScores, null, 2));
        console.log(`💾 Saved ${highScores.length} scores to file`);
        return true;
    } catch (error) {
        console.error('❌ Failed to save scores:', error.message);
        return false;
    }
};

// Function to save stats to file
const saveStats = async () => {
    try {
        await fs.promises.writeFile(STATS_FILE, JSON.stringify(dailyStats, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Failed to save stats:', error.message);
        return false;
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

// Pre-computed frontend questions (avoid processing on each request)
const frontendQuestions = questionsAndAnswers.map(qa => ({
    id: qa.id,
    question: qa.question,
    choices: qa.choices
}));

// Valid frontend origins (production only)
const VALID_ORIGINS = [
    'https://math-worksheet-vue.vercel.app',
    'https://math-worksheet-react.vercel.app'
];

// Ultra-aggressive frontend-only validation
const validateFrontendRequest = (req, res, next) => {
    // Health check bypass (minimal processing)
    if (req.path === '/health') {
        return res.status(200).end('OK');
    }

    // Allow debug endpoint for troubleshooting
    if (req.path === '/debug') {
        return next();
    }

    // Block ALL other non-API paths immediately (no processing)
    if (!req.path.startsWith('/api/')) {
        return res.status(404).end();
    }

    // Get request details
    const origin = req.get('Origin') || req.get('Referer') || '';
    const userAgent = req.get('User-Agent') || '';
    const acceptHeader = req.get('Accept') || '';
    const contentType = req.get('Content-Type') || '';

    // INSTANT bot blocking - expanded patterns
    const botPatterns = [
        'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'go-http',
        'postman', 'insomnia', 'httpie', 'rest', 'api', 'test', 'monitor', 'check',
        'scan', 'audit', 'security', 'vulnerability', 'penetration', 'hack', 'exploit',
        'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp', 'telegram',
        'googlebot', 'bingbot', 'yandex', 'baiduspider', 'duckduckbot', 'slackbot',
        'amazonbot', 'applebot', 'semrushbot', 'ahrefs', 'mj12bot', 'dotbot',
        'petalbot', 'seznambot', 'adsbot', 'pingdom', 'uptimerobot', 'nagios',
        'apache', 'nginx', 'http', 'requests', 'urllib', 'httpx', 'axios', 'fetch',
        'chrome-lighthouse', 'pagespeed', 'gtmetrix', 'pingability', 'StatusCake'
    ];

    const lowerUserAgent = userAgent.toLowerCase();
    
    // Block if ANY bot pattern matches
    if (botPatterns.some(pattern => lowerUserAgent.includes(pattern))) {
        return res.status(403).end();
    }

    // Block suspicious user agents
    if (userAgent.length < 20 || // Too short
        !userAgent.includes('Mozilla') || // Not a real browser
        !userAgent.includes('WebKit') || // Not a modern browser
        userAgent.includes('HeadlessChrome') || // Automated browser
        userAgent.includes('PhantomJS')) { // Automated browser
        return res.status(403).end();
    }

    // Enhanced origin validation with better debugging
    const hasValidOrigin = origin && VALID_ORIGINS.some(validOrigin => 
        origin.startsWith(validOrigin)
    );
    
    // Temporary: Allow any .vercel.app domain while debugging
    const isVercelApp = origin && origin.includes('.vercel.app');
    
    // Log all requests for debugging
    console.log(`🔍 API Request - Origin: "${origin}", Path: ${req.path}, Method: ${req.method}`);
    
    if (!hasValidOrigin && !isVercelApp) {
        console.log(`🚫 BLOCKED - Origin: "${origin}" not in allowed list`);
        console.log(`📋 Allowed origins:`, VALID_ORIGINS);
        return res.status(403).json({ 
            error: 'Origin not allowed',
            origin: origin,
            allowedOrigins: VALID_ORIGINS
        });
    }
    
    console.log(`✅ ALLOWED - Origin: "${origin}"`);

    // API-specific validation (relaxed for debugging)
    if (req.path === '/api/questions') {
        // Must be GET and accept JSON
        if (req.method !== 'GET') {
            console.log(`🚫 BLOCKED /api/questions - Wrong method: ${req.method}`);
            return res.status(405).json({ error: 'Method not allowed', expected: 'GET' });
        }
    } else if (req.path === '/api/scores') {
        // Allow both GET (fetch scores) and POST (submit score)
        if (req.method === 'GET') {
            console.log(`✅ GET /api/scores - Fetching high scores`);
        } else if (req.method === 'POST') {
            if (!contentType.includes('application/json')) {
                console.log(`🚫 BLOCKED POST /api/scores - Wrong content type: ${contentType}`);
                return res.status(400).json({ error: 'Content-Type must be application/json' });
            }
            console.log(`✅ POST /api/scores - Submitting score`);
        } else {
            console.log(`🚫 BLOCKED /api/scores - Wrong method: ${req.method}`);
            return res.status(405).json({ error: 'Method not allowed', expected: 'GET or POST' });
        }
    } else {
        // Block any other API paths
        console.log(`🚫 BLOCKED - Unknown API path: ${req.path}`);
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    next();
};

// Enhanced middleware setup with better CORS
app.use(express.json({ limit: '1mb' }));

// Debugging CORS configuration (temporarily relaxed)
app.use(cors({
    origin: function (origin, callback) {
        console.log(`🔍 CORS Check - Origin: "${origin}"`);
        
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) {
            console.log(`✅ CORS ALLOWED: No origin (mobile/app request)`);
            return callback(null, true);
        }
        
        // Check if origin is in VALID_ORIGINS
        const isValidOrigin = VALID_ORIGINS.some(validOrigin => 
            origin.startsWith(validOrigin)
        );
        
        // Temporarily allow any Vercel app for debugging
        const isVercelApp = origin.includes('.vercel.app');
        
        if (isValidOrigin || isVercelApp) {
            console.log(`✅ CORS ALLOWED: ${origin}`);
            return callback(null, true);
        }
        
        console.log(`🚫 CORS BLOCKED: ${origin}`);
        console.log(`📋 Valid origins:`, VALID_ORIGINS);
        return callback(null, false);
    },
    credentials: true,
    maxAge: 3600,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With']
}));

// Apply frontend validation to all routes
app.use(validateFrontendRequest);

// Extreme rate limiting - almost zero tolerance
const ipLimiter = (req, res, next) => {
    // Skip for health checks (let Vercel ping freely)
    if (req.path === '/health') {
        return next();
    }

    const clientIP = req.get('CF-Connecting-IP') || 
                    req.get('X-Forwarded-For')?.split(',')[0] || 
                    req.connection.remoteAddress || 
                    'unknown';
    
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minute window
    const maxRequests = 3; // MAX 3 requests per 5 minutes per IP
    
    if (!global.ipTracker) global.ipTracker = new Map();
    
    const ipData = global.ipTracker.get(clientIP) || { count: 0, resetTime: now + windowMs };
    
    // Reset window if expired
    if (now > ipData.resetTime) {
        ipData.count = 0;
        ipData.resetTime = now + windowMs;
    }
    
    // AGGRESSIVE blocking - very few requests allowed
    if (ipData.count >= maxRequests) {
        return res.status(429).end();
    }
    
    ipData.count++;
    global.ipTracker.set(clientIP, ipData);
    
    // Aggressive cleanup to prevent memory issues
    if (Math.random() < 0.05) { // 5% chance to clean
        for (const [ip, data] of global.ipTracker.entries()) {
            if (now > data.resetTime + windowMs) { // Extra buffer for cleanup
                global.ipTracker.delete(ip);
            }
        }
    }
    
    next();
};

app.use(ipLimiter);

// Simple daily reset with persistent storage
const checkDailyReset = () => {
    const today = new Date().toDateString();
    if (dailyStats.lastReset !== today) {
        dailyStats.requests = 0;
        dailyStats.lastReset = today;
        
        // Save updated stats to file
        saveStats().catch(error => {
            console.error('Failed to save stats after daily reset:', error);
        });
        
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

// Optimized health check (minimal response)
app.get('/health', (req, res) => {
    res.status(200).end('OK');
});

// Debug endpoint to check CORS and origin validation
app.get('/debug', (req, res) => {
    const origin = req.get('Origin') || req.get('Referer') || 'none';
    const userAgent = req.get('User-Agent') || 'none';
    
    res.json({
        message: 'Debug info',
        origin: origin,
        userAgent: userAgent.substring(0, 100),
        timestamp: new Date().toISOString(),
        headers: {
            origin: req.get('Origin'),
            referer: req.get('Referer'),
            accept: req.get('Accept'),
            contentType: req.get('Content-Type')
        }
    });
});

// Block ALL non-API paths immediately (handled in validateFrontendRequest now)
// This is now redundant since validateFrontendRequest blocks everything except /health and /api/*

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

// API: Submit score (with persistent storage)
app.post('/api/scores', rateLimiter, async (req, res) => {
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
    
    // Create new score entry with more details
    const newScore = {
        name: name.substring(0, 20),
        score,
        date: Date.now(),
        dateString: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        timestamp: new Date().toLocaleString()
    };
    
    // Add to scores and maintain leaderboard
    highScores.push(newScore);
    highScores.sort((a, b) => b.score - a.score); // Sort by highest score first
    highScores = highScores.slice(0, 50); // Keep top 50 scores (increased from 10)
    
    // Save to file immediately (async to not block response)
    saveScores().catch(error => {
        console.error('Failed to save scores after new submission:', error);
    });
    
    res.status(200).json({
        score,
        message: `Score: ${score}/12`,
        highScores: highScores.slice(0, 10), // Show top 10 to frontend
        saved: true
    });
});

// API: Get high scores (with fresh data from file if needed)
app.get('/api/scores', rateLimiter, (req, res) => {
    // Return top 10 scores for the leaderboard
    const topScores = highScores.slice(0, 10).map(score => ({
        name: score.name,
        score: score.score,
        date: score.dateString || new Date(score.date).toISOString().split('T')[0]
    }));
    
    res.status(200).json(topScores);
});

// Start server
app.listen(port, () => {
    console.log(`Math Worksheet Backend listening at http://localhost:${port}`);
});