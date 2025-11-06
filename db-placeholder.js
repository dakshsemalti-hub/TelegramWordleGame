11.06 8:11 PM
// db-placeholder.js

// Placeholder for the database (In a real app, this would be a persistent database like PostgreSQL)
let leaderboardData = [
    // Example: { userId: 'tg12345', gameId: 1001, tries: 3, timestamp: new Date('2025-11-06T18:00:00Z').getTime() },
    // Example: { userId: 'tg67890', gameId: 1001, tries: 3, timestamp: new Date('2025-11-06T18:15:00Z').getTime() },
    // Example: { userId: 'tg00000', gameId: 1001, tries: 4, timestamp: new Date('2025-11-06T19:00:00Z').getTime() },
];

/**
 * Saves a score and updates the leaderboard data.
 * @param {object} score - { userId, gameId, tries, timestamp }
 */
function saveScore(score) {
    // Check if the user has already completed this gameId
    const existingIndex = leaderboardData.findIndex(
        (entry) => entry.userId === score.userId && entry.gameId === score.gameId
    );

    if (existingIndex > -1) {
        // Only update if the new score is better (fewer tries, or same tries but faster)
        const existingScore = leaderboardData[existingIndex];
        if (score.tries < existingScore.tries || 
           (score.tries === existingScore.tries && score.timestamp < existingScore.timestamp)) {
            leaderboardData[existingIndex] = score;
            console.log(`Score updated for user ${score.userId}.`);
        } else {
            console.log(`Score for user ${score.userId} was not improved.`);
        }
    } else {
        leaderboardData.push(score);
        console.log(`New score saved for user ${score.userId}.`);
    }
}

/**
 * Retrieves and sorts the leaderboard for a specific game.
 * Rules: 1. Fewer Tries 2. Earlier Timestamp
 * @param {number} gameId 
 * @returns {Array} Sorted list of scores.
 */
function getLeaderboard(gameId) {
    // Filter by GameID (for the current day's word)
    const currentDayScores = leaderboardData.filter(entry => entry.gameId === gameId);

    // Sort: 
    // a. Primary sort: Tries (Ascending)
    // b. Secondary sort: Timestamp (Ascending)
    currentDayScores.sort((a, b) => {
        if (a.tries !== b.tries) {
            return a.tries - b.tries; // Lower tries first
        } else {
            return a.timestamp - b.timestamp; // Earlier time first (tie-breaker)
        }
    });

    return currentDayScores;
}

module.exports = { saveScore, getLeaderboard };
