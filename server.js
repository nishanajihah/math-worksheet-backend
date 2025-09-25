// =============================================================================
// MATH WORKSHEET BACKEND API
// =============================================================================

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// =============================================================================
// CONFIGURATION
// =============================================================================

// File paths for persistent storage
const SCORES_FILE = path.join(__dirname, 'scores.json');
const STATS_FILE = path.join(__dirname, 'stats.json');

// Questions and answers data
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

// =============================================================================
// DATA STORAGE
// =============================================================================

// In-memory storage
let highScores = [];
let dailyStats = {
    requests: 0,
    lastReset: new Date().toDateString(),
    limit: 100
};

// Load scores from file
const loadScores = () => {
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
};

// Load stats from file
const loadStats = () => {
    try {
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8');
            dailyStats = { ...dailyStats, ...JSON.parse(data) };
        }
    } catch (error) {
        console.log('🆕 No existing stats file, starting fresh');
    }
};

// Save scores to file
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

// Save stats to file
const saveStats = async () => {
    try {
        await fs.promises.writeFile(STATS_FILE, JSON.stringify(dailyStats, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Failed to save stats:', error.message);
        return false;
    }
};

// Initialize data on startup
loadScores();
loadStats();

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// CORS - Allow frontend domains
app.use(cors({
    origin: [
        'https://math-worksheet-vue.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'Authorization']
}));

// JSON parsing
app.use(express.json({ limit: '1mb' }));

// Request logging and validation
app.use((req, res, next) => {
    const origin = req.get('Origin');
    console.log(`🔍 ${req.method} ${req.path} from ${origin || 'direct'}`);
    
    // Allow specific paths
    if (req.path === '/health' || req.path === '/debug' || req.path === '/' || req.path.startsWith('/api/')) {
        return next();
    }
    
    // Block everything else
    console.log(`❌ Blocked path: ${req.path}`);
    return res.status(404).json({ error: 'Not Found - API endpoints available at /api/*' });
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Check and reset daily stats
const checkDailyReset = () => {
    const today = new Date().toDateString();
    if (dailyStats.lastReset !== today) {
        dailyStats.requests = 0;
        dailyStats.lastReset = today;
        saveStats().catch(error => {
            console.error('Failed to save stats after daily reset:', error);
        });
        return true;
    }
    return false;
};

// =============================================================================
// API ROUTES
// =============================================================================

// Root endpoint - API documentation
app.get('/', (req, res) => {
    res.json({
        message: 'Math Worksheet Backend API',
        endpoints: {
            '/health': 'Health check',
            '/api/questions': 'Get math questions data',
            '/api/scores': {
                'GET': 'Get high scores leaderboard',
                'POST': 'Submit new score'
            },
            '/api/stats': 'Get API usage statistics'
        },
        version: '1.0.0',
        status: 'active'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).end('OK');
});

// Debug endpoint
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

// Get API usage statistics
app.get('/api/stats', (req, res) => {
    console.log('📊 GET /api/stats called');
    res.status(200).json({
        dailyRequests: dailyStats.requests,
        limit: dailyStats.limit,
        reset: dailyStats.lastReset
    });
});

// Get math questions
app.get('/api/questions', (req, res) => {
    console.log('📚 GET /api/questions - Request received');
    console.log('📍 Origin:', req.get('Origin') || 'none');
    
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

// Submit new score
app.post('/api/scores', async (req, res) => {
    console.log('📝 POST /api/scores - Request received');
    console.log('Origin:', req.get('Origin'));
    
    const { name, userAnswers } = req.body;
    
    // Validation
    if (!name || !userAnswers) {
        console.log('❌ Validation failed: missing name or userAnswers');
        return res.status(400).json({ error: 'Name and answers required' });
    }
    
    try {
        // Calculate score
        let score = 0;
        questionsAndAnswers.forEach(qa => {
            if (userAnswers[qa.id] === qa.correctAnswer) {
                score++;
            }
        });
        
        // Create score entry
        const newScore = {
            name: name.substring(0, 20),
            score,
            date: Date.now(),
            dateString: new Date().toISOString().split('T')[0],
            timestamp: new Date().toLocaleString()
        };
        
        // Add to leaderboard
        highScores.push(newScore);
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 50); // Keep top 50
        
        // Save asynchronously
        saveScores().catch(error => {
            console.error('Failed to save scores:', error);
        });
        
        console.log(`✅ Score ${score}/12 saved for ${name}`);
        res.status(200).json({
            score,
            message: `Score: ${score}/12`,
            highScores: highScores.slice(0, 10), // Return top 10
            saved: true
        });
    } catch (error) {
        console.error('❌ Error in POST /api/scores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get high scores leaderboard
app.get('/api/scores', (req, res) => {
    console.log('🏆 GET /api/scores called');
    
    try {
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

// =============================================================================
// SERVER STARTUP
// =============================================================================

app.listen(port, () => {
    console.log(`🚀 Math Worksheet Backend API running on port ${port}`);
    console.log(`📊 Loaded ${highScores.length} scores, ${dailyStats.requests} requests today`);
});