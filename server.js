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

// Frontend validation - allow your specific frontend domain
const validateFrontendRequest = (req, res, next) => {
    const origin = req.get('Origin');
    console.log(`🔍 Request: ${req.method} ${req.path} from ${origin || 'direct'}`);
    
    // Always allow health check
    if (req.path === '/health') {
        return next();
    }

    // Always allow debug endpoint
    if (req.path === '/debug') {
        return next();
    }

    // Allow all API calls from your frontend
    if (req.path.startsWith('/api/')) {
        console.log(`✅ API request allowed: ${req.path}`);
        return next();
    }

    // Block everything else with clear message
    console.log(`❌ Blocked path: ${req.path}`);
    return res.status(404).json({ error: 'Not Found - API endpoints available at /api/*' });
};

// Setup CORS FIRST - specifically allow your frontend
app.use(cors({
    origin: [
        'https://math-worksheet-vue.vercel.app',
        'https://math-worksheet-backend.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'Authorization']
}));

// Setup JSON parsing
app.use(express.json({ limit: '1mb' }));

// Apply frontend validation AFTER CORS
app.use(validateFrontendRequest);

// Temporarily disabled IP limiting for debugging
// const ipLimiter = ... (commented out)

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

// Stats endpoint (no rate limiting)
app.get('/api/stats', (req, res) => {
    console.log('📊 GET /api/stats called');
    res.status(200).json({
        dailyRequests: dailyStats.requests,
        limit: dailyStats.limit,
        reset: dailyStats.lastReset
    });
});

// API: Get questions (simplified)
app.get('/api/questions', (req, res) => {
    console.log('📚 GET /api/questions - Request received');
    console.log('📍 Origin:', req.get('Origin') || 'none');
    console.log('📍 User-Agent:', req.get('User-Agent')?.substring(0, 50) || 'none');
    
    try {
        const questionsForFrontend = questionsAndAnswers.map(qa => ({
            id: qa.id,
            question: qa.question,
            choices: qa.choices
        }));
        
        console.log(`✅ Returning ${questionsForFrontend.length} questions`);
        res.status(200).json(questionsForFrontend);
    } catch (error) {
        console.error('❌ Error in /api/questions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API: Submit score (with persistent storage)
app.post('/api/scores', async (req, res) => {
    console.log('📝 POST /api/scores - Request received');
    console.log('Origin:', req.get('Origin'));
    console.log('User-Agent:', req.get('User-Agent'));
    
    const { name, userAnswers } = req.body;
    
    // Fast validation
    if (!name || !userAnswers) {
        console.log('❌ Validation failed: missing name or userAnswers');
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
app.get('/api/scores', (req, res) => {
    console.log('🏆 GET /api/scores called');
    console.log('Origin:', req.get('Origin'));
    console.log('User-Agent:', req.get('User-Agent'));
    
    try {
        // Return top 10 scores for the leaderboard
        const topScores = highScores.slice(0, 10).map(score => ({
            name: score.name,
            score: score.score,
            date: score.dateString || new Date(score.date).toISOString().split('T')[0]
        }));
        
        console.log(`✅ Returning ${topScores.length} high scores`);
        res.status(200).json(topScores);
    } catch (error) {
        console.error('❌ Error in GET /api/scores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Math Worksheet Backend listening at http://localhost:${port}`);
});