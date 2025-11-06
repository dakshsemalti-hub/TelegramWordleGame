// ----------------- SERVER CONFIGURATION -----------------

// 🚨 LIVE SERVER ADDRESS (Your Render URL)
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

// 1. PLACEHOLDER: The word must be loaded from the server
let TARGET_WORD = "CLOUD"; // Example placeholder, will be replaced by server
let GAME_NUMBER = 101; // Example placeholder, will be replaced by server

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
    
    // 2. Load Daily Game State (This is where the target word is fetched)
    loadDailyGameState();
    
    // 3. Set up the UI
    initializeBoard();
    initializeKeyboard();
    document.addEventListener('keydown', handleKeyInput);
    document.getElementById('stats-button').addEventListener('click', () => showModal('stats'));
    
    // 4. Start the reset timer
    // Ensure moment.js (for time zone handling) is loaded in your index.html
    if (typeof moment !== 'undefined') {
        setInterval(updateResetTimer, 1000); // Run every second
        updateResetTimer(); // Run immediately to set initial time
    } else {
        console.warn("Moment.js is required for the timer, please include it in index.html");
    }
});

// --- CORE GAME LOGIC ---

function initializeBoard() {
    const board = document.getElementById('board');
    board.innerHTML = ''; // Clear existing content
    for (let i = 0; i < NUMBER_OF_GUESSES; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.id = `row-${i}`;
        for (let j = 0; j < WORD_LENGTH; j++) {
            const box = document.createElement('div');
            box.className = 'box';
            row.appendChild(box);
        }
        board.appendChild(row);
    }
}

function initializeKeyboard() {
    // Note: Ensure your index.html has a keyboard defined with ids for keys
}

function handleKeyInput(event) {
    if (gameOver) return;
    
    const key = event.key.toUpperCase();

    if (key === 'ENTER') {
        checkGuess();
    } else if (key === 'BACKSPACE') {
        deleteLetter();
    } else if (key.match(/^[A-Z]$/)) {
        updateCurrentGuess(key);
    }
}

function updateCurrentGuess(key) {
    if (currentGuess.length < WORD_LENGTH) {
        const row = document.getElementById(`row-${guesses.length}`);
        const box = row.children[currentGuess.length];
        box.textContent = key;
        currentGuess += key;
    }
}

function deleteLetter() {
    if (currentGuess.length > 0) {
        const row = document.getElementById(`row-${guesses.length}`);
        const box = row.children[currentGuess.length - 1];
        box.textContent = '';
        currentGuess = currentGuess.slice(0, -1);
    }
}

function showMessage(msg, type = 'info') {
    const messageBar = document.getElementById('message-bar');
    messageBar.textContent = msg;
    messageBar.className = `message-bar ${type}`;
    messageBar.style.display = 'block';
    
    // Clear message after a few seconds
    setTimeout(() => {
        messageBar.style.display = 'none';
        messageBar.className = 'message-bar';
    }, 3000);
}

function evaluateGuess(guess, target) {
    const result = Array(WORD_LENGTH).fill('absent');
    const targetLetters = target.split('');

    // 1. Check for 'correct' (green)
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === target[i]) {
            result[i] = 'correct';
            targetLetters[i] = null; // Consume the letter
        }
    }

    // 2. Check for 'present' (yellow)
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (result[i] === 'absent') {
            const targetIndex = targetLetters.indexOf(guess[i]);
            if (targetIndex !== -1) {
                result[i] = 'present';
                targetLetters[targetIndex] = null; // Consume the letter
            }
        }
    }
    return result;
}

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


function checkGuess() {
    if (gameOver) return;
    if (currentGuess.length !== WORD_LENGTH) {
        showMessage("Not enough letters!");
        return;
    }

    // For simplicity, we use client-side word evaluation
    
    const row = document.getElementById(`row-${guesses.length}`);
    let guessResult = evaluateGuess(currentGuess, TARGET_WORD);

    // Apply colors and update keyboard
    guessResult.forEach((status, index) => {
        const box = row.children[index];
        box.classList.add(status);

        const keyButton = document.getElementById(currentGuess[index]);
        if (keyButton) {
            // Logic to prevent downgrading a 'correct' key to 'present' or 'absent'
            if (status === 'correct') {
                keyButton.classList.remove('present', 'absent');
                keyButton.classList.add('correct');
            } else if (status === 'present' && !keyButton.classList.contains('correct')) {
                keyButton.classList.add('present');
                keyButton.classList.remove('absent');
            } else if (status === 'absent' && !keyButton.classList.contains('correct') && !keyButton.classList.contains('present')) {
                keyButton.classList.add('absent');
            }
        }
    });

    guesses.push(currentGuess);
    currentGuess = "";
    
    // Check Win Condition
    if (currentGuess === TARGET_WORD) {
        gameOver = true;
        // 💾 Send Win Score to back-end
        submitGameScore(guesses.length); 
        setTimeout(() => showModal('win', guesses.length), 1500);
        return;
    }
    
    // Check Loss Condition
    else if (guesses.length === NUMBER_OF_GUESSES) {
        gameOver = true;
        // 💾 Send Loss Score to back-end (7 tries for a loss)
        submitGameScore(NUMBER_OF_GUESSES + 1); 
        setTimeout(() => showModal('loss', guesses.length), 1500);
        return;
    }
}

// ----------------- MODAL, STATS, LEADERBOARD, & SHARE -----------------

function updateResetTimer() {
    // Ensure moment.js is loaded
    if (typeof moment === 'undefined') return;

    const now = moment().tz('Asia/Kolkata');
    const resetTime = moment().tz('Asia/Kolkata').endOf('day').add(1, 'second'); // 00:00:00 tomorrow
    
    if (now.isAfter(resetTime)) {
        resetTime.add(1, 'day');
    }
    
    const duration = moment.duration(resetTime.diff(now));
    
    const hours = duration.hours().toString().padStart(2, '0');
    const minutes = duration.minutes().toString().padStart(2, '0');
    const seconds = duration.seconds().toString().padStart(2, '0');

    const timerElement = document.getElementById('reset-timer');
    if (timerElement) {
        timerElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

function loadDailyGameState() {
    const userId = getTelegramUserId();
    
    // Fetch the game info (word, game ID) for the current day
    fetch(`${SERVER_URL}/game-info?userId=${userId}`)
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch game info');
            return res.json();
        })
        .then(data => {
            if (data.success) {
                // Update global variables
                TARGET_WORD = data.targetWord; 
                GAME_NUMBER = data.gameId;    
                console.log(`✅ Game loaded. Day ${GAME_NUMBER}, Word: ${TARGET_WORD}`);

                // Optionally, if data.guesses exists, initialize the board with past guesses
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
    
    let htmlContent = '';

    if (type === 'win') {
        showMessage('You Win!', 'success');
    } else if (type === 'loss') {
        showMessage(`The word was: ${TARGET_WORD}`, 'error');
    }

    // --- 1. User Stats (PLACEHOLDER) ---
    htmlContent += '<h2>Your Stats</h2>';
    htmlContent += `<p>Game Result: **${triesDisplay}**</p>`;
    // This section would typically fetch real stats, but we use placeholders for now
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
            if (data.leaderboard && data.leaderboard.length > 0) {
                data.leaderboard.forEach((entry) => {
                    // Formatting timestamp for display
                    const timestamp = (typeof moment !== 'undefined') ? moment(entry.timestamp).format('HH:mm:ss') : 'N/A';
                    
                    tableRows += `
                        <tr>
                            <td>${entry.rank}</td>
                            <td>${entry.user}</td>
                            <td>${entry.tries}</td>
                            <td>${timestamp}</td>
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
            } else {
                 document.getElementById('leaderboard-status').textContent = "No scores submitted yet.";
            }

        })
        .catch(error => {
            console.error("❌ Error fetching leaderboard:", error);
            const statusElement = document.getElementById('leaderboard-status');
            if(statusElement) statusElement.textContent = "Could not load leaderboard data.";
        });

    document.getElementById('modal-close').onclick = function() {
        modal.style.display = 'none';
    };
    
    // Add Share button functionality
    document.getElementById('share-results-button').onclick = function() {
        // Simple placeholder for sharing
        alert(`I solved Wordle #${GAME_NUMBER} in ${triesDisplay}!`);
    }
    }
