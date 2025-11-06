11.06 8:12 PM
// server.js

const express = require('express');
const cors = require('cors');
const moment = require('moment-timezone');
const { WORD_LIST } = require('./words');
const { saveScore, getLeaderboard } = require('./db-placeholder');

const app = express();
const PORT = process.env.PORT || 3000;
const IST_TIMEZONE = 'Asia/Kolkata'; // IST (UTC+5:30)
const IST_RESET_HOUR = 0; // 12 AM IST

app.use(cors()); // Allow cross-origin requests from your front-end
app.use(express.json()); // To parse incoming JSON payloads

// --- HELPER FUNCTION: DAILY WORD GENERATION ---

/**
 * Calculates the unique Game ID and the corresponding TARGET_WORD based on 12 AM IST reset.
 * Uses a seeded approach to ensure the same word is served globally for the day.
 * @returns {object} { gameId, word }
 */
function getDailyGameInfo() {
    // 1. Get the current time in IST
    const nowIst = moment().tz(IST_TIMEZONE);
    
    // 2. Adjust to handle the 12 AM (midnight) reset: 
    // The "game day" starts at 12 AM and lasts until the next 12 AM.
    // If it's before 12 AM today, it's considered part of "yesterday's" game day.
    
    // We calculate the number of days passed since a fixed start date (Epoch).
    const GAME_EPOCH = moment.tz("2025-11-01", IST_TIMEZONE); // Arbitrary start date

    // Clone the current date and set the time to 12 AM
    let gameDay = nowIst.clone().startOf('day').hour(IST_RESET_HOUR);

    // If the current IST time is BEFORE the 12 AM reset time, use yesterday's date
    if (nowIst.isBefore(gameDay)) {
        gameDay = gameDay.subtract(1, 'day');
    }
    
    // Calculate the difference in days
    const daysSinceEpoch = gameDay.diff(GAME_EPOCH, 'days');
    
    // Use the days passed as the Game ID
    const gameId = 1000 + daysSinceEpoch; 
    
    // Use modulo arithmetic to select a word from the list 
    // (This cycles through your 29 words)
    const wordIndex = daysSinceEpoch % WORD_LIST.length;
    const word = WORD_LIST[wordIndex];

    console.log(`[${nowIst.format()}] Game ID: ${gameId}, Word: ${word}`);
    return { gameId, word };
}


// --- API ENDPOINTS ---

/**
 * 1. GET /api/game-info
 * Returns the current target word and game number.
 * Note: In a real app, you would also check user progress here.
 */
app.get('/api/game-info', (req, res) => {
    // Placeholder for Telegram Auth Verification (CRITICAL STEP)
    // You would use the Telegram SDK to verify the 'initData' sent by the Web App.
    const userId = req.query.userId || 'GUEST'; 

    const gameInfo = getDailyGameInfo();

    // In a real app, you would fetch the user's saved game state/stats here based on userId and gameInfo.gameId
    
    res.json({
        success: true,
        gameId: gameInfo.gameId,
        targetWord: gameInfo.word, // In a live game, only send the hash or length for security. 
                                   // For simplicity here, we send the word.
        userId: userId
    });
});

/**
 * 2. POST /api/submit-score
 * Submits the user's score upon winning or losing.
 */
app.post('/api/submit-score', (req, res) => {
    // Placeholder for Telegram Auth Verification
    const { userId, gameId, tries, timestamp } = req.body;

    if (!userId || !gameId || tries === undefined || !timestamp) {
        return res.status(400).json({ success: false, message: "Missing required score data." });
    }

    const score = {
        userId: userId,
        gameId: parseInt(gameId),
        tries: parseInt(tries),
        timestamp: parseInt(timestamp) 
    };

    saveScore(score); // Save the score to the placeholder 'database'
    
    // In a real application, you'd update personal stats here too.
    
    res.json({ success: true, message: "Score received and processed." });
});


/**
 * 3. GET /api/leaderboard
 * Returns the leaderboard for the current day's word, sorted correctly.
 */
app.get('/api/leaderboard', (req, res) => {
    const gameInfo = getDailyGameInfo();
    const leaderboard = getLeaderboard(gameInfo.gameId);
    
    // Map the data to remove sensitive info or format time nicely
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
        rank: index + 1,
        user: `User${entry.userId.slice(-4)}`, // Use a dummy/anonymized name
        tries: entry.tries,
        // Calculate the duration from a fixed point for display (e.g., how long they took)
        // For accurate tie-breaking, you would calculate game duration (submission time - start time)
        timestamp: moment(entry.timestamp).format('HH:mm:ss') 
    }));

    res.json({ 
        success: true, 
        gameId: gameInfo.gameId, 
        leaderboard: formattedLeaderboard 
    });
});

// --- SERVER STARTUP ---

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
