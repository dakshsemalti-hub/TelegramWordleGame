11.06 8:07 PM
// 🚨 LIVE SERVER ADDRESS 
// (Wordlyy is the name you chose on Render.com)
const SERVER_URL = 'https://wordlyy.onrender.com/api'; 

function getTelegramUserId() {
    // Safely extracts the user's ID provided by Telegram Web App
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        if (window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
            return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
        }
    }
    // Fallback ID for testing outside Telegram
    return 'TESTUSER_LOCAL'; 
}

// -------------------------------------------------------------

const NUMBER_OF_GUESSES = 6;
const WORD_LENGTH = 5;

// --- CONFIGURATION & PLACEHOLDERS ---

// 1. PLACEHOLDER: The word must be loaded from your server.
// The server ensures it's the correct word based on the date and 12 AM IST reset.
let TARGET_WORD = "CLOUD"; // Example placeholder. This must be loaded from server.

// 2. PLACEHOLDER: The unique ID for the day/word (e.g., Day 423 of the game).
let GAME_NUMBER = 101; 

// 3. IST Reset Time for display (00:00:00)
const IST_RESET_HOUR = 0;
const IST_RESET_MINUTE = 0;
const IST_RESET_SECOND = 0;


let guesses = [];
let currentGuess = "";
let gameOver = false;

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Telegram Web App (if running inside Telegram)
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
    }
    
    // 2. Load Daily Game State (This is where the server connection happens)
    loadDailyGameState();

    // 3. Set up the UI
    initializeBoard();
    initializeKeyboard();
    document.addEventListener('keydown', handleKeyInput);
    document.getElementById('stats-button').addEventListener('click', () => showModal('stats'));
    
    // 4. Start the reset timer
    setInterval(updateResetTimer, 1000);
    updateResetTimer(); // Run immediately
});
function submitGameScore(tries) {
    const scoreData = {
        userId: getTelegramUserId(),
        gameId: GAME_NUMBER,
        tries: tries, 
        timestamp: Date.now() 
    };
    
    fetch(`${SERVER_URL}/submit-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData)
    })
    .then(res => res.json())
    .then(data => {
        console.log('Score submission status:', data.message);
    })
    .catch(error => console.error('Error submitting score:', error));
}

// --- CORE GAME LOGIC (Copied/Modified from previous step for completeness) ---

function initializeBoard() { /* ... (Same as previous step) ... */ }
function initializeKeyboard() { /* ... (Same as previous step) ... */ }
function handleKeyInput(event) { /* ... (Same as previous step) ... */ }
function updateCurrentGuess(key) { /* ... (Same as previous step) ... */ }
function deleteLetter() { /* ... (Same as previous step) ... */ }
function showMessage(msg) { /* ... (Same as previous step) ... */ }
function evaluateGuess(guess, target) { /* ... (Same as previous step) ... */ }


function checkGuess() {
    if (currentGuess.length !== WORD_LENGTH) {
        showMessage("Not enough letters!");
        return;
    }

    // *** SERVER CHECK REQUIRED: Check if currentGuess is a valid English word ***

    const row = document.getElementById('game-board').children[guesses.length - 1];
    let guessResult = evaluateGuess(currentGuess, TARGET_WORD);

    // Apply colors and update keyboard
    guessResult.forEach((status, index) => {
        const box = row.children[index];
        box.classList.add(status);
        
        const keyButton = document.getElementById(`key-${currentGuess[index]}`);
        if (keyButton) {
            // Logic to prevent downgrading color (e.g., Green over Yellow)
            if (status === 'correct') {
                keyButton.classList.remove('present', 'absent');
                keyButton.classList.add('correct');
            } else if (status === 'present' && !keyButton.classList.contains('correct')) {
                keyButton.classList.remove('absent');
                keyButton.classList.add('present');
            } else if (status === 'absent' && !keyButton.classList.contains('correct') && !keyButton.classList.contains('present')) {
                keyButton.classList.add('absent');
            }
        }
    });

    if (currentGuess === TARGET_WORD) {
        gameOver = true;
        showMessage(`You Win! Game ${GAME_NUMBER}`);
        // *** SERVER ACTION: Send Win Score to back-end ***
        // Server records: UserID, GameNum, Tries (guesses.length), Timestamp
        submitGameScore(guesses.length);

        setTimeout(() => showModal('win', guesses.length), 1500);
        return;
    } else if (guesses.length === NUMBER_OF_GUESSES) {
        gameOver = true;
        showMessage(`Game Over. Word was: ${TARGET_WORD}`);
        // *** SERVER ACTION: Send Loss to back-end ***
        submitGameScore(NUMBER_OF_GUESSES + 1); 
        
        setTimeout(() => showModal('loss', guesses.length), 1500);
        return;
    }

    // Prepare for the next guess
    guesses.push(Array.from({ length: WORD_LENGTH }, () => ''));
    currentGuess = "";
}


// --- TIME & SERVER INTEGRATION FUNCTIONS ---

// NOTE: This only calculates the time remaining on the client. 
// The actual word change MUST be managed by your server.
function updateResetTimer() {
    const now = new Date();
    // Use IST timezone (UTC+5:30) for calculation
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(now.getTime() + istOffset);

    const nextReset = new Date(nowIst);
    nextReset.setUTCHours(IST_RESET_HOUR, IST_RESET_MINUTE, IST_RESET_SECOND, 0);

    // If the reset time for today has passed, set it for tomorrow
    if (nextReset.getTime() <= nowIst.getTime()) {
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }
    
    // Calculate difference in milliseconds
    let diffMs = nextReset.getTime() - nowIst.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    diffMs -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diffMs / (1000 * 60));
    diffMs -= minutes * (1000 * 60);
    const seconds = Math.floor(diffMs / 1000);

    const timerDisplay = document.getElementById('refresh-time-display');
    timerDisplay.textContent = `⏳ ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // If timer hits zero, force a reload to get the new word (and update the timer)
    if (hours === 0 && minutes === 0 && seconds === 0) {
        // *** SERVER ACTION: Reload the game state from the server ***
        // location.reload(); 
    }
}


function loadDailyGameState() {
    const userId = getTelegramUserId();
    
    // 1. Fetch the TARGET_WORD and GAME_NUMBER from your back-end.
    fetch(`${SERVER_URL}/game-info?userId=${userId}`)
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch game info');
            return res.json();
        })
        .then(data => {
            if (data.success) {
                TARGET_WORD = data.targetWord; 
                GAME_NUMBER = data.gameId;    
                console.log(`✅ Game loaded. Day ${GAME_NUMBER}, Word: ${TARGET_WORD}`);
            }
        })
        .catch(error => {
            console.error("❌ Error fetching game info:", error);
            showMessage("Server error. Cannot load word.");
        });
}


function showModal(type, tries = 0) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const triesDisplay = (tries <= NUMBER_OF_GUESSES) ? `${tries} / ${NUMBER_OF_GUESSES}` : 'Failed';
    
    // Default content structure
    let htmlContent = '';

    if (type === 'win') {
        showMessage('You Win!', 'success');
    } else if (type === 'loss') {
        showMessage(`The word was: ${TARGET_WORD}`, 'error');
    }

    // --- 1. User Stats (PLACEHOLDER) ---
    htmlContent += '<h2>Your Stats</h2>';
    htmlContent += `<p>Game Result: **${triesDisplay}**</p>`;
    // Add other stats placeholders here
    htmlContent += `<p>Games Played: **10** | Win %: **70%**</p>`;
    htmlContent += `<p>Current Streak: **5** | Max Streak: **8**</p>`;

    // --- 2. Share Button ---
    if (type !== 'stats') {
        htmlContent += '<p style="margin-top: 20px;">' + 
            `<button id="share-results-button">Share Results</button>` + 
            '</p>';
    }

    // --- 3. Leaderboard (DYNAMICALLY FETCHED) ---
    let leaderboardHtml = '<h2>Global Leaderboard</h2>';
    leaderboardHtml += '<p style="font-size: 0.9em;">Ranking: Fewer Tries, then Faster Time.</p>';
    leaderboardHtml += '<p id="leaderboard-status">Loading leaderboard...</p>'; 

    modalBody.innerHTML = htmlContent + leaderboardHtml; 
    modal.style.display = 'block';

    // Fetch the leaderboard data from the server
    fetch(`${SERVER_URL}/leaderboard`)
        .then(res => res.json())
        .then(data => {
            let tableRows = '';
            data.leaderboard.forEach((entry) => {
                tableRows += `
                    <tr>
                        <td>${entry.rank}</td>
                        <td>${entry.user}</td>
                        <td>${entry.tries}</td>
                        <td>${entry.timestamp}</td>
                    </tr>
                `;
            });

            // Assemble the final HTML table
            const finalLeaderboardHtml = `
                ${leaderboardHtml.replace('<p id="leaderboard-status">Loading leaderboard...</p>', '')}
                <table id="leaderboard-table">
                    <thead>
                        <tr><th>Rank</th><th>User</th><th>Tries</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;
            
            // Re-update the modal content with the final table
            const existingContent = document.getElementById('modal-body').innerHTML.replace(/<p[^>]*>Loading leaderboard...<\/p>/, '');
            document.getElementById('modal-body').innerHTML = existingContent + finalLeaderboardHtml;
        })
        .catch(error => {
            console.error("❌ Error fetching leaderboard:", error);
            const statusElement = document.getElementById('leaderboard-status');
            if(statusElement) statusElement.textContent = "Could not load leaderboard data.";
        });

    document.getElementById('modal-close').onclick = function() {
        modal.style.display = 'none';
        // Clear board/reset game state if necessary
    };
    
    // Add Share button functionality
    document.getElementById('share-results-button').onclick = function() {
        // ... (Existing share logic here) ...
        alert('Share function is active!'); 
    }
}


// Generates the Wordle-style grid share text
function generateShareText(tries) {
    const isWin = tries <= NUMBER_OF_GUESSES;
    let grid = '';
    
    // Generate the emoji grid based on the guesses made so far
    for (let i = 0; i < tries; i++) {
        const rowDiv = document.getElementById('game-board').children[i];
        let rowEmojis = '';
        for (let j = 0; j < WORD_LENGTH; j++) {
            const box = rowDiv.children[j];
            if (box.classList.contains('correct')) {
                rowEmojis += '🟩';
            } else if (box.classList.contains('present')) {
                rowEmojis += '🟨';
            } else {
                rowEmojis += '⬛';
            }
        }
        grid += rowEmojis + '\n';
    }

    const title = `T-WORDLE ${GAME_NUMBER} ${isWin ? tries : 'X'}/${NUMBER_OF_GUESSES}`;
    return `${title}\n\n${grid}\n\nPlay T-Wordle on Telegram!`;
}


function shareResults(tries) {
    const shareText = generateShareText(tries);

    // 1. **Telegram Web App Share (Best Option)**
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.isTWA) {
        // Send a message back to the chat with the game results
        window.Telegram.WebApp.switchInlineQuery(shareText, ['users', 'groups']);
        
    } 
    // 2. **Standard Web Share API**
    else if (navigator.share) {
        navigator.share({
            title: 'T-WORDLE Results',
            text: shareText,
            url: window.location.href // Link back to the game bot/URL
        }).catch(error => console.error('Error sharing:', error));
    } 
    // 3. **Fallback: Copy to Clipboard**
    else {
        navigator.clipboard.writeText(shareText).then(() => {
            showMessage("Results copied to clipboard!");
        });
    }
}
