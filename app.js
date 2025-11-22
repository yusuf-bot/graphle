// Configuration
let calculator;
let userId = localStorage.getItem('graphle_user_id') || generateUserId();
localStorage.setItem('graphle_user_id', userId);

// Game state
let currentMode = 'daily';
let currentDifficulty = 'easy';
let practiceDifficulty = 'easy';
let targetFunction = '';
let score = 0;
let attempts = 0;
let userExpressionId = null;
let createdFunction = '';
let hintsUsed = 0;
let functionMetadata = {};

// Generate unique user ID
function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

// Seeded random number generator
function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// Function generation by difficulty
function generateFunction(difficulty, seed = Math.random()) {
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    
    const randInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;
    const randChoice = (arr) => arr[Math.floor(random() * arr.length)];
    
    let operations, num_terms;
    
    if (difficulty === 'easy') {
        operations = [
            () => `${randInt(1, 5)}x`,
            () => `${randInt(1, 3)}x^{2}`,
            () => `${randInt(5, 15)}\\sin(x)`,
            () => `${randInt(5, 15)}\\cos(x)`,
        ];
        num_terms = randInt(1, 2);
    } else if (difficulty === 'medium') {
        operations = [
            () => `${randInt(2, 8)}x`,
            () => `${randInt(1, 4)}x^{2}`,
            () => `${randInt(10, 30)}\\sin(${randInt(1, 2)}x)`,
            () => `${randInt(10, 30)}\\cos(${randInt(1, 2)}x)`,
            () => `${randInt(5, 15)}\\ln(x+${randInt(1, 3)})`,
        ];
        num_terms = randInt(2, 3);
    } else if (difficulty === 'hard') {
        operations = [
            () => `${randInt(3, 10)}x`,
            () => `${randInt(1, 5)}x^{2}`,
            () => `${randInt(15, 40)}\\sin(${randInt(1, 3)}x)`,
            () => `${randInt(15, 40)}\\cos(${randInt(1, 3)}x)`,
            () => `${randInt(8, 20)}\\ln(x+${randInt(1, 5)})`,
            () => `\\sqrt{${randInt(20, 80)}x}`,
        ];
        num_terms = randInt(2, 3);
    } else { // very_hard
        operations = [
            () => `${randInt(2, 10)}x`,
            () => `${randInt(1, 5)}x^{2}`,
            () => `${randInt(10, 50)}\\sin(${randInt(1, 3)}x)`,
            () => `${randInt(10, 50)}\\cos(${randInt(1, 3)}x)`,
            () => `${randInt(5, 20)}\\ln(x+${randInt(1, 5)})`,
            () => `${randInt(2, 5)}^{x}`,
            () => `\\sqrt{${randInt(10, 100)}x}`,
        ];
        num_terms = randInt(3, 4);
    }
    
    // Shuffle and select operations
    const shuffled = operations.sort(() => random() - 0.5);
    const selected = shuffled.slice(0, Math.min(num_terms, operations.length));
    const terms = selected.map(op => op());
    
    // Combine terms
    let result = terms[0];
    for (let i = 1; i < terms.length; i++) {
        const op = random() > 0.3 ? '+' : '-';
        result += op + terms[i];
    }
    
    // Add offset
    if (difficulty !== 'easy') {
        const offset_ranges = { medium: 30, hard: 50, very_hard: 50 };
        const offset = randInt(-offset_ranges[difficulty], offset_ranges[difficulty]);
        if (offset !== 0) {
            result += (offset > 0 ? '+' : '') + offset;
        }
    }
    
    return result;
}

// Initialize calculator
function initCalculator() {
    const elt = document.getElementById('calculator');
    
    try {
        calculator = Desmos.GraphingCalculator(elt, {
            keypad: false,
            expressions: false,
            settingsMenu: false,
            zoomButtons: true,
            expressionsTopbar: false,
            border: false
        });

        calculator.setMathBounds({
            left: -50,
            right: 50,
            bottom: -100,
            top: 100
        });

        console.log('Calculator initialized successfully');
        loadDailyChallenge();
    } catch (e) {
        console.error('Error initializing calculator:', e);
        document.getElementById('calculator').innerHTML = 
            '<div class="loading" style="color: #c6613f;">Error loading Desmos. Please refresh the page.</div>';
    }
}

// Load daily challenge
function loadDailyChallenge() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    document.getElementById('dailyDate').textContent = `Daily Challenge - ${dateStr}`;
    
    // Load current difficulty challenge
    loadDifficultyChallenge(currentDifficulty);
}

function loadDifficultyChallenge(difficulty) {
    // Generate consistent daily challenge based on date + difficulty
    const today = new Date().toISOString().split('T')[0];
    const seed = hashCode(today + difficulty);
    
    targetFunction = generateFunction(difficulty, seed);
    hintsUsed = 0;
    attempts = 0;
    score = 0;
    
    document.getElementById('hintsLeft').textContent = '2';
    document.getElementById('attempts').textContent = '0';
    document.getElementById('score').textContent = '0';
    
    // Parse function metadata
    parseFunctionMetadata(targetFunction);
    
    calculator.setExpression({
        id: 'target',
        latex: `y=${targetFunction}`,
        color: '#c6613f',
        lineWidth: 3
    });

    if (userExpressionId) {
        calculator.removeExpression({ id: userExpressionId });
        userExpressionId = null;
    }

    document.getElementById('guessInput').value = '';
    document.getElementById('feedback').innerHTML = 
        `<p class="info">Daily ${difficulty.replace('_', ' ')} challenge loaded! Try to guess the function.</p>`;
}

function parseFunctionMetadata(latex) {
    const types = [];
    const coefs = [];
    
    if (latex.includes('x^{2}')) types.push('quadratic');
    if (latex.match(/\d+x(?![^{]*})/)) types.push('linear');
    if (latex.includes('\\sin')) types.push('sine');
    if (latex.includes('\\cos')) types.push('cosine');
    if (latex.includes('\\ln')) types.push('logarithmic');
    if (latex.includes('\\sqrt')) types.push('square root');
    if (latex.match(/\d+\^{x}/)) types.push('exponential');
    
    const numbers = latex.match(/\d+/g);
    if (numbers) {
        coefs.push(...numbers.map(n => parseInt(n)).filter(n => n > 1 && n < 100));
    }
    
    const offset = latex.match(/[+-]\d+$/);
    
    functionMetadata = {
        numTerms: types.length + (offset ? 1 : 0),
        types: types,
        coefs: coefs.length > 0 ? coefs : [1],
        offset: offset ? parseInt(offset[0]) : 0
    };
}

function selectDifficulty(difficulty) {
    currentDifficulty = difficulty;
    
    // Update button states
    document.querySelectorAll('#dailyMode .diff-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadDifficultyChallenge(difficulty);
}

// Convert input to LaTeX
function convertToLatex(input) {
    return input
        .replace(/\*/g, '')
        .replace(/sin\(/g, '\\sin(')
        .replace(/cos\(/g, '\\cos(')
        .replace(/log\(/g, '\\ln(')
        .replace(/ln\(/g, '\\ln(')
        .replace(/sqrt\(/g, '\\sqrt{')
        .replace(/\)(?![^(]*\()/g, function(match, offset, string) {
            if (string.substring(0, offset).lastIndexOf('\\sqrt{') > string.substring(0, offset).lastIndexOf('}')) {
                return '}';
            }
            return match;
        });
}

function latexToReadable(latex) {
    return latex
        .replace(/\\sin/g, 'sin')
        .replace(/\\cos/g, 'cos')
        .replace(/\\ln/g, 'log')
        .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
        .replace(/\{([^}]+)\}/g, '$1')
        .replace(/\^/g, '^');
}

// Real-time preview function
function previewGuess(inputId, expressionId) {
    const input = document.getElementById(inputId);
    const guess = input.value.trim();
    
    if (!guess) {
        if (userExpressionId) {
            calculator.removeExpression({ id: userExpressionId });
            userExpressionId = null;
        }
        return;
    }
    
    const latexGuess = convertToLatex(guess);
    
    if (userExpressionId) {
        calculator.removeExpression({ id: userExpressionId });
    }
    
    userExpressionId = expressionId + '_' + Date.now();
    
    try {
        calculator.setExpression({
            id: userExpressionId,
            latex: `y=${latexGuess}`,
            color: '#0000FF',
            lineWidth: 2
        });
    } catch (e) {
        // Invalid syntax, ignore
    }
}

// Check mathematical similarity by sampling points
function checkMathematicalSimilarity(latexGuess, latexTarget) {
    const samplePoints = 30;
    const tolerance = 0.1;
    let matches = 0;
    
    for (let i = 0; i < samplePoints; i++) {
        const x = -10 + (20 * i / (samplePoints - 1));
        
        try {
            const guessY = evaluateLatex(latexGuess, x);
            const targetY = evaluateLatex(latexTarget, x);
            
            if (isFinite(guessY) && isFinite(targetY)) {
                const diff = Math.abs(guessY - targetY);
                const relativeDiff = Math.abs(diff / (Math.abs(targetY) + 1));
                
                if (diff < tolerance || relativeDiff < 0.01) {
                    matches++;
                }
            }
        } catch (e) {
            // Evaluation failed at this point, continue
        }
    }
    
    return matches / samplePoints;
}

// Evaluate LaTeX expression at a given x value
function evaluateLatex(latex, x) {
    let expr = latex
        .replace(/\\sin\(/g, 'Math.sin(')
        .replace(/\\cos\(/g, 'Math.cos(')
        .replace(/\\ln\(/g, 'Math.log(')
        .replace(/\\sqrt\{([^}]+)\}/g, 'Math.sqrt($1)')
        .replace(/\{([^}]+)\}/g, '$1')
        .replace(/(\d+)x/g, '$1*x')
        .replace(/x\^(\d+)/g, 'Math.pow(x,$1)')
        .replace(/(\d+)\^x/g, 'Math.pow($1,x)')
        .replace(/\^/g, '**');
    
    try {
        return eval(expr);
    } catch (e) {
        return NaN;
    }
}

// Submit guess (daily mode)
function submitGuess() {
    const guess = document.getElementById('guessInput').value.trim();
    
    if (!guess) {
        document.getElementById('feedback').innerHTML = '<p class="error">Please enter a function!</p>';
        return;
    }

    attempts++;
    document.getElementById('attempts').textContent = attempts;

    const latexGuess = convertToLatex(guess);
    const similarity = checkMathematicalSimilarity(latexGuess, targetFunction);
    
    if (similarity > 0.95) {
        const points = calculateScore(currentDifficulty, attempts, hintsUsed);
        score += points;
        document.getElementById('score').textContent = score;
        
        document.getElementById('feedback').innerHTML = 
            '<p class="success">🎉 Excellent! Perfect match!</p>' +
            `<p class="success">+${points} points</p>` +
            '<p class="info">Target was: ' + latexToReadable(targetFunction) + '</p>' +
            '<p class="info">Try another difficulty!</p>';
        
    } else if (similarity > 0.7) {
        document.getElementById('feedback').innerHTML = 
            '<p class="success">Good! Pretty close!</p>' +
            '<p class="info">Try adjusting the coefficients...</p>';
    } else {
        document.getElementById('feedback').innerHTML = 
            '<p class="error">Not quite right. Keep trying!</p>' +
            '<p class="info">Hint: Look at the shape and scale of the graph.</p>';
    }
}

function calculateScore(difficulty, attempts, hints) {
    const baseScores = { easy: 100, medium: 200, hard: 300, very_hard: 500 };
    let score = baseScores[difficulty] || 100;
    
    score -= (attempts - 1) * 10;
    score -= hints * 25;
    
    return Math.max(score, 10);
}

function getHint() {
    if (hintsUsed >= 2) {
        document.getElementById('feedback').innerHTML = 
            '<p class="error">No more hints available!</p>' +
            '<p class="info">The answer is: y = ' + latexToReadable(targetFunction) + '</p>';
        return;
    }

    hintsUsed++;
    document.getElementById('hintsLeft').textContent = (2 - hintsUsed);

    let hintText = '';
    if (hintsUsed === 1) {
        hintText = `<p class="success">Hint 1:</p>
            <p class="info">• The function has ${functionMetadata.numTerms} term(s)</p>
            <p class="info">• Function types: ${functionMetadata.types.join(', ')}</p>`;
    } else if (hintsUsed === 2) {
        hintText = `<p class="success">Hint 2:</p>
            <p class="info">• Coefficients range: ${Math.min(...functionMetadata.coefs)} to ${Math.max(...functionMetadata.coefs)}</p>`;
        if (functionMetadata.offset !== 0) {
            hintText += `<p class="info">• Has a constant offset of: ${functionMetadata.offset}</p>`;
        }
    }

    document.getElementById('feedback').innerHTML = hintText;
}

// Practice mode functions
function selectPracticeDifficulty(difficulty) {
    practiceDifficulty = difficulty;
    
    document.querySelectorAll('#practiceMode .diff-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    newPracticeGame();
}

function newPracticeGame() {
    // Generate random practice challenge
    const seed = Math.random() * 100000;
    targetFunction = generateFunction(practiceDifficulty, seed);
    hintsUsed = 0;
    attempts = 0;
    score = 0;
    
    document.getElementById('practiceHintsLeft').textContent = '2';
    document.getElementById('practiceAttempts').textContent = '0';
    document.getElementById('practiceScore').textContent = '0';
    
    parseFunctionMetadata(targetFunction);
    
    calculator.setExpression({
        id: 'target',
        latex: `y=${targetFunction}`,
        color: '#c6613f',
        lineWidth: 3
    });

    if (userExpressionId) {
        calculator.removeExpression({ id: userExpressionId });
        userExpressionId = null;
    }

    document.getElementById('practiceGuessInput').value = '';
    document.getElementById('practiceFeedback').innerHTML = 
        `<p class="info">Practice ${practiceDifficulty.replace('_', ' ')} challenge loaded!</p>`;
}

function submitPracticeGuess() {
    const guess = document.getElementById('practiceGuessInput').value.trim();
    
    if (!guess) {
        document.getElementById('practiceFeedback').innerHTML = '<p class="error">Please enter a function!</p>';
        return;
    }

    attempts++;
    document.getElementById('practiceAttempts').textContent = attempts;

    const latexGuess = convertToLatex(guess);
    const similarity = checkMathematicalSimilarity(latexGuess, targetFunction);
    
    if (similarity > 0.95) {
        const points = calculateScore(practiceDifficulty, attempts, hintsUsed);
        score += points;
        document.getElementById('practiceScore').textContent = score;
        
        document.getElementById('practiceFeedback').innerHTML = 
            '<p class="success">🎉 Excellent! Perfect match!</p>' +
            `<p class="success">+${points} points</p>` +
            '<p class="info">Target was: ' + latexToReadable(targetFunction) + '</p>';
    } else if (similarity > 0.7) {
        document.getElementById('practiceFeedback').innerHTML = 
            '<p class="success">Good! Pretty close!</p>' +
            '<p class="info">Try adjusting the coefficients...</p>';
    } else {
        document.getElementById('practiceFeedback').innerHTML = 
            '<p class="error">Not quite right. Keep trying!</p>' +
            '<p class="info">Hint: Look at the shape and scale of the graph.</p>';
    }
}

function getPracticeHint() {
    if (hintsUsed >= 2) {
        document.getElementById('practiceFeedback').innerHTML = 
            '<p class="error">No more hints available!</p>' +
            '<p class="info">The answer is: y = ' + latexToReadable(targetFunction) + '</p>';
        return;
    }

    hintsUsed++;
    document.getElementById('practiceHintsLeft').textContent = (2 - hintsUsed);

    let hintText = '';
    if (hintsUsed === 1) {
        hintText = `<p class="success">Hint 1:</p>
            <p class="info">• The function has ${functionMetadata.numTerms} term(s)</p>
            <p class="info">• Function types: ${functionMetadata.types.join(', ')}</p>`;
    } else if (hintsUsed === 2) {
        hintText = `<p class="success">Hint 2:</p>
            <p class="info">• Coefficients range: ${Math.min(...functionMetadata.coefs)} to ${Math.max(...functionMetadata.coefs)}</p>`;
        if (functionMetadata.offset !== 0) {
            hintText += `<p class="info">• Has a constant offset of: ${functionMetadata.offset}</p>`;
        }
    }

    document.getElementById('practiceFeedback').innerHTML = hintText;
}

// Mode switching
function switchMode(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('dailyMode').classList.remove('active');
    document.getElementById('practiceMode').classList.remove('active');
    document.getElementById('createMode').classList.remove('active');
    
    if (mode === 'daily') {
        document.getElementById('dailyMode').classList.add('active');
        loadDailyChallenge();
    } else if (mode === 'practice') {
        document.getElementById('practiceMode').classList.add('active');
        newPracticeGame();
    } else {
        document.getElementById('createMode').classList.add('active');
        clearCreateMode();
    }
}

// Clear graph completely for create mode
function clearCreateMode() {
    if (calculator) {
        calculator.setExpression({ id: 'target', latex: '' });
        if (userExpressionId) {
            calculator.removeExpression({ id: userExpressionId });
            userExpressionId = null;
        }
        calculator.setExpression({ id: 'created', latex: '' });
    }
    
    document.getElementById('createInput').value = '';
    createdFunction = '';
    
    document.getElementById('shareLinkContainer').style.display = 'none';
    document.getElementById('shareInfo').innerHTML = '<p class="info">Create a function - it will appear on the graph as you type!</p>';
}

// Create mode functions
function generateShareLink() {
    const func = document.getElementById('createInput').value.trim();
    
    if (!func) {
        document.getElementById('shareInfo').innerHTML = '<p class="error">Please enter a function first!</p>';
        return;
    }

    createdFunction = convertToLatex(func);
    const encoded = btoa(createdFunction);
    const link = `${window.location.origin}${window.location.pathname}?f=${encoded}`;
    
    document.getElementById('shareLink').value = link;
    document.getElementById('shareLinkContainer').style.display = 'block';
    document.getElementById('shareInfo').innerHTML = '<p class="success">Share link generated! Copy and send to your friends.</p>';
}

function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    linkInput.select();
    document.execCommand('copy');
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

function clearCreate() {
    document.getElementById('createInput').value = '';
    createdFunction = '';
    if (calculator) {
        calculator.setExpression({ id: 'created', latex: '' });
    }
    document.getElementById('shareLinkContainer').style.display = 'none';
    document.getElementById('shareInfo').innerHTML = '<p class="info">Create a function - it will appear on the graph as you type!</p>';
}

// Initialize on load
function checkDesmosLoaded() {
    if (typeof Desmos !== 'undefined') {
        console.log('Desmos loaded');
        initCalculator();
    } else {
        console.log('Waiting for Desmos...');
        setTimeout(checkDesmosLoaded, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkDesmosLoaded);
} else {
    checkDesmosLoaded();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const guessInput = document.getElementById('guessInput');
    const practiceGuessInput = document.getElementById('practiceGuessInput');
    const createInput = document.getElementById('createInput');
    
    if (guessInput) {
        guessInput.addEventListener('input', () => {
            previewGuess('guessInput', 'daily_user');
        });
        
        guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitGuess();
        });
    }
    
    if (practiceGuessInput) {
        practiceGuessInput.addEventListener('input', () => {
            previewGuess('practiceGuessInput', 'practice_user');
        });
        
        practiceGuessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitPracticeGuess();
        });
    }
    
    if (createInput) {
        createInput.addEventListener('input', () => {
            const func = createInput.value.trim();
            if (func) {
                const latex = convertToLatex(func);
                try {
                    calculator.setExpression({
                        id: 'created',
                        latex: `y=${latex}`,
                        color: '#c6613f',
                        lineWidth: 3
                    });
                } catch (e) {
                    // Invalid syntax
                }
            } else {
                calculator.setExpression({ id: 'created', latex: '' });
            }
        });
        
        createInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') generateShareLink();
        });
    }
});