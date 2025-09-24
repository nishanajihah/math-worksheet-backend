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

// Status page for when someone visits the backend URL directly
const showStatusPage = (req, res) => {
    const statusHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Math Worksheet Backend API</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
                padding: 20px;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                max-width: 600px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                text-align: center;
            }
            .title {
                font-size: 2.5em;
                margin-bottom: 10px;
                color: #fff;
            }
            .subtitle {
                font-size: 1.2em;
                margin-bottom: 30px;
                opacity: 0.9;
            }
            .status-box {
                background: rgba(0, 255, 100, 0.2);
                border: 2px solid #00ff64;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
            }
            .api-info {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
            }
            .endpoint {
                font-family: 'Courier New', monospace;
                background: rgba(0, 0, 0, 0.3);
                padding: 8px 12px;
                border-radius: 5px;
                margin: 5px 0;
                display: block;
            }
            .warning {
                background: rgba(255, 193, 7, 0.2);
                border: 2px solid #ffc107;
                border-radius: 10px;
                padding: 15px;
                margin: 20px 0;
            }
            .stats {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-top: 20px;
            }
            .stat-box {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 10px;
            }
            .green { color: #00ff64; }
            .yellow { color: #ffc107; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="title"> Math Worksheet Backend</h1>
            <p class="subtitle">API Server Status Dashboard</p>
            
            <div class="status-box">
                <h2 class="green">✅ Backend is Running</h2>
                <p>The API server is online and ready to serve your frontend application.</p>
                <p><strong>Server Time:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div class="api-info">
                <h3> Available API Endpoints:</h3>
                <code class="endpoint">GET /api/questions</code>
                <small>Fetch math worksheet questions</small>
                
                <code class="endpoint">POST /api/scores</code>
                <small>Submit quiz answers and get score</small>
                
                <code class="endpoint">GET /api/scores</code>
                <small>Get leaderboard (top 10 scores)</small>
                
                <code class="endpoint">GET /health</code>
                <small>Health check endpoint</small>
            </div>

            <div class="stats">
                <div class="stat-box">
                    <h4> Total Scores</h4>
                    <p class="green">${highScores.length}</p>
                </div>
                <div class="stat-box">
                    <h4> Daily Requests</h4>
                    <p class="yellow">${dailyStats.requests}</p>
                </div>
            </div>

            <div class="warning">
                <h3>⚠️ For Frontend Use Only</h3>
                <p>This API is designed to be called by the frontend application, not accessed directly by users. Direct browser visits are for monitoring purposes only.</p>
            </div>

            <p style="margin-top: 30px; opacity: 0.7;">
                 Powered by Node.js & Express | Deployed on Vercel
            </p>
        </div>

        <script>
            // Add some interactivity
            console.log(' Math Worksheet Backend API v1.0');
            console.log(' Available endpoints: /api/questions, /api/scores, /health');
            console.log(' Status: Online and ready');
        </script>
    </body>
    </html>
    `;

    res.status(200).send(statusHTML);
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

// Ultra-aggressive frontend-only validation
const validateFrontendRequest = (req, res, next) => {
    // ZERO tolerance - block everything except exact frontend calls
    
    // Health check bypass (minimal processing)
    if (req.path === '/health') {
        return res.status(200).end('OK');
    }

    // Show status page for root path (when someone visits the backend URL)
    if (req.path === '/') {
        return showStatusPage(req, res);
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

    // STRICT origin validation - MUST be from your frontend
    const hasValidOrigin = origin && VALID_ORIGINS.some(validOrigin => 
        origin.startsWith(validOrigin)
    );
    
    if (!hasValidOrigin) {
        return res.status(403).end(); // No valid origin = blocked
    }

    // API-specific validation
    if (req.path === '/api/questions') {
        // Must be GET and accept JSON
        if (req.method !== 'GET' || !acceptHeader.includes('application/json')) {
            return res.status(403).end();
        }
    } else if (req.path === '/api/scores') {
        // Must be POST with JSON content
        if (req.method !== 'POST' || 
            !contentType.includes('application/json') ||
            !acceptHeader.includes('application/json')) {
            return res.status(403).end();
        }
    } else {
        // Block any other API paths
        return res.status(404).end();
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