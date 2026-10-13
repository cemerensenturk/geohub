// Global Variables
let countriesData = []; // Array holding country data from REST API
let currentQuestionIndex = 0; // Current question index
let score = 0; // User score
let questionCounter = 0;
let answered = false; // Flag to track if question has been answered

const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const ICON_CHECK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_X = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

function setCountries(raw) {
    countriesData = raw.map(c => ({
        ...c,
        name: typeof c.name === 'object' ? c.name : { common: c.name, official: c.name },
        flags: c.flags || { png: c.flag },
        continents: Array.isArray(c.continents) ? c.continents : [c.continent || 'World'],
        capital: Array.isArray(c.capital) ? c.capital : [c.capital || 'N/A']
    }));
    shuffleArray(countriesData);
    showNextQuestion();
}

// Initialize Quiz
function startQuiz() {
    if (typeof window !== 'undefined' && window.GEO_COUNTRIES && Array.isArray(window.GEO_COUNTRIES)) {
        setCountries(window.GEO_COUNTRIES);
        return;
    }

    fetch('../data/countries.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            setCountries(data);
        })
        .catch(error => {
            console.warn('Relative data fetch failed, trying root fallback:', error);
            fetch('/data/countries.json')
                .then(r => r.json())
                .then(data => setCountries(data))
                .catch(err => console.error('All API endpoints failed:', err));
        });
}

// Update the stats bar
function updateStats() {
    document.getElementById('score-value').textContent = score;
    document.getElementById('question-count-value').textContent = questionCounter;
    document.getElementById('progress-value').textContent = `${currentQuestionIndex} / ${countriesData.length}`;
    const accuracy = questionCounter > 0 ? Math.round((score / questionCounter) * 100) : 0;
    document.getElementById('accuracy-value').textContent = `${accuracy}%`;
}

// Show Next Question
function showNextQuestion() {
    if (currentQuestionIndex < countriesData.length) {
        const currentCountry = countriesData[currentQuestionIndex];
        const flagUrl = currentCountry.flags ? (currentCountry.flags.svg || currentCountry.flags.png) : '';
        const correctAnswer = currentCountry.name.common;

        // Render question elements
        const flagImageElement = document.getElementById('flag-image');
        flagImageElement.src = flagUrl;
        flagImageElement.alt = 'Flag to identify';

        const optionsContainer = document.getElementById('options');
        optionsContainer.innerHTML = ''; // Clear previous options

        // Generate 1 correct answer + 3 distinct distractors
        const options = getAnswerOptions(countriesData, currentCountry, 3);

        options.forEach((option, i) => {
            const optionButton = document.createElement('button');
            optionButton.type = 'button';
            optionButton.className = 'atlas-option';
            optionButton.dataset.answer = option;

            const key = document.createElement('span');
            key.className = 'atlas-option-key';
            key.textContent = OPTION_KEYS[i];

            const label = document.createElement('span');
            label.textContent = option;

            optionButton.append(key, label);
            optionButton.addEventListener('click', () => checkAnswer(option, correctAnswer, currentCountry, optionButton));
            optionsContainer.appendChild(optionButton);
        });

        // Reset info container and feedback
        const countryInfoElement = document.getElementById('countryInfo');
        countryInfoElement.innerHTML = '';
        countryInfoElement.hidden = true;

        const feedback = document.getElementById('feedback');
        feedback.hidden = true;
        feedback.className = 'atlas-feedback';

        // Hide Next Question button until answer is chosen
        document.getElementById('next-question').hidden = true;

        answered = false;
        currentQuestionIndex++;
        updateStats();
    } else {
        showResult();
    }
}

// Check Chosen Answer
function checkAnswer(selectedAnswer, correctAnswer, currentCountry, selectedButton) {
    if (answered) return;

    questionCounter++;
    const isCorrect = selectedAnswer === correctAnswer;
    if (isCorrect) score++;

    // Disable all option buttons and mark the result
    document.querySelectorAll('#options .atlas-option').forEach(button => {
        button.disabled = true;
        if (button.dataset.answer === correctAnswer) {
            button.classList.add('is-correct');
            button.insertAdjacentHTML('beforeend', ICON_CHECK);
        } else if (button === selectedButton) {
            button.classList.add('is-wrong');
            button.insertAdjacentHTML('beforeend', ICON_X);
        } else {
            button.classList.add('is-dimmed');
        }
    });

    const feedback = document.getElementById('feedback');
    feedback.className = `atlas-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`;
    feedback.textContent = isCorrect ? `Correct — that is ${correctAnswer}.` : `Not quite — that is ${correctAnswer}.`;
    feedback.hidden = false;

    updateStats();

    // Display correct country info card
    showCountryInfo(currentCountry);

    answered = true;

    // Show Next Question button
    const nextQuestionButton = document.getElementById('next-question');
    nextQuestionButton.hidden = false;
    nextQuestionButton.focus({ preventScroll: true });
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Display Country Details Card
function showCountryInfo(country) {
    const countryInfoElement = document.getElementById('countryInfo');

    const capitalName = (Array.isArray(country.capital) && country.capital.length > 0) ? country.capital[0] : 'N/A';
    const continentName = (Array.isArray(country.continents) && country.continents.length > 0) ? country.continents[0] : 'World';

    let currencyList = 'N/A';
    if (country.currencies && typeof country.currencies === 'object') {
        const names = Object.values(country.currencies).map(c => c.name).filter(Boolean);
        if (names.length > 0) currencyList = names.join(', ');
    }

    let languageList = 'N/A';
    if (country.languages && typeof country.languages === 'object') {
        const langs = Object.values(country.languages).filter(Boolean);
        if (langs.length > 0) languageList = langs.join(', ');
    }

    const carSide = (country.car && country.car.side) ? country.car.side : 'right';
    const drivingSide = carSide.charAt(0).toUpperCase() + carSide.slice(1);

    const rows = [
        ['Capital', capitalName, false],
        ['Continent', continentName, false],
        ['Population', (country.population || 0).toLocaleString('en-US'), true],
        ['Languages', languageList, false],
        ['Currencies', currencyList, false],
        ['Drives on', drivingSide, false],
        ['Independent', country.independent ? 'Yes' : 'No', false],
        ['UN member', country.unMember ? 'Yes' : 'No', false]
    ];

    countryInfoElement.innerHTML = `
        <div class="fq-dossier-head">
            <h2 class="fq-dossier-title">${escapeHtml(country.name.common)}</h2>
            ${country.name.official && country.name.official !== country.name.common ? `<span class="atlas-eyebrow">${escapeHtml(country.name.official)}</span>` : ''}
        </div>
        <dl class="fq-dossier-list">
            ${rows.map(([label, value, mono]) => `
            <div class="fq-dossier-row">
                <dt>${label}</dt>
                <dd${mono ? ' class="mono"' : ''}>${escapeHtml(value)}</dd>
            </div>`).join('')}
        </dl>
    `;
    countryInfoElement.hidden = false;
}

// Show End-of-Quiz Result
function showResult() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = `
        <section class="atlas-panel fq-result">
            <p class="atlas-eyebrow">Quiz complete</p>
            <h1 class="fq-result-title">You named ${score} of ${countriesData.length} flags.</h1>
            <p class="fq-result-score">Every flag in the set has been shown once.</p>
            <button id="play-again" class="atlas-btn atlas-btn--primary" type="button">Play again</button>
        </section>
    `;
    document.getElementById('play-again').addEventListener('click', () => location.reload());
}

// Fisher-Yates Array Shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Generate 4 Options (1 correct + 3 unique random distractors)
function getAnswerOptions(allCountries, correctCountry, numberOfDistractors) {
    const options = [correctCountry.name.common];

    while (options.length <= numberOfDistractors) {
        const randomIndex = Math.floor(Math.random() * allCountries.length);
        const randomCountry = allCountries[randomIndex].name.common;
        if (!options.includes(randomCountry)) {
            options.push(randomCountry);
        }
    }

    return shuffleArray(options);
}

// Next button and keyboard shortcuts (1–4 / A–D to answer, Enter for next)
document.getElementById('next-question').addEventListener('click', showNextQuestion);

document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (event.key === 'Enter') {
        if (answered && !document.getElementById('next-question').hidden) {
            event.preventDefault();
            showNextQuestion();
        }
        return;
    }

    if (answered) return;
    const key = event.key.toUpperCase();
    let index = OPTION_KEYS.indexOf(key);
    if (index === -1 && /^[1-4]$/.test(key)) index = Number(key) - 1;
    if (index === -1) return;

    const button = document.querySelectorAll('#options .atlas-option')[index];
    if (button) button.click();
});

// Start Quiz on load
startQuiz();
