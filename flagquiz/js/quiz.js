// Global Variables
let countriesData = []; // Array holding country data from REST API
let currentQuestionIndex = 0; // Current question index
let score = 0; // User score
let questionCounter = 0;
let answered = false; // Flag to track if question has been answered

// Initialize Quiz
function startQuiz() {
    // Fetch countries from REST API endpoint
    fetch('./data/countries.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Invalid data format received');
            }
            countriesData = data;
            shuffleArray(countriesData);
            showNextQuestion();
        })
        .catch(error => {
            console.error('API data error, attempting fallback:', error);
            // Fallback mirror if local data fetch fails
            fetch('https://raw.githubusercontent.com/mledoze/countries/master/countries.json')
                .then(r => r.json())
                .then(raw => {
                    countriesData = raw.map(c => ({
                        name: { common: c.name?.common || c.cca2, official: c.name?.official || c.name?.common },
                        flags: { png: `https://flagcdn.com/w320/${(c.cca2 || '').toLowerCase()}.png` },
                        population: c.area ? c.area * 50 : 1000000,
                        continents: [c.region || 'World'],
                        capital: (Array.isArray(c.capital) && c.capital.length > 0) ? c.capital : ['N/A'],
                        currencies: c.currencies || { N_A: { name: 'N/A' } },
                        languages: c.languages || { eng: 'English' },
                        independent: c.independent !== false,
                        unMember: c.unMember === true,
                        car: { side: 'right' }
                    }));
                    shuffleArray(countriesData);
                    showNextQuestion();
                })
                .catch(err => console.error('All API endpoints failed:', err));
        });
}

// Show Next Question
function showNextQuestion() {
    if (currentQuestionIndex < countriesData.length) {
        const currentCountry = countriesData[currentQuestionIndex];
        const flagUrl = currentCountry.flags ? currentCountry.flags.png : '';
        const correctAnswer = currentCountry.name.common;

        // Render question elements
        const flagImageElement = document.getElementById('flag-image');
        flagImageElement.src = flagUrl;
        flagImageElement.alt = `Flag of ${correctAnswer}`;

        const optionsContainer = document.getElementById('options');
        optionsContainer.innerHTML = ''; // Clear previous options

        // Generate 1 correct answer + 3 distinct distractors
        const options = getAnswerOptions(countriesData, currentCountry, 3);

        options.forEach(option => {
            const optionButton = document.createElement('button');
            optionButton.textContent = option;
            optionButton.classList.add('option-btn');
            optionButton.addEventListener('click', () => checkAnswer(option, correctAnswer, currentCountry, optionButton));
            optionsContainer.appendChild(optionButton);
        });

        // Reset info container
        const countryInfoElement = document.getElementById('countryInfo');
        countryInfoElement.innerHTML = '';
        countryInfoElement.style.display = 'none';

        // Hide Next Question button until answer is chosen
        const nextQuestionButton = document.getElementById('next-question');
        nextQuestionButton.style.display = 'none';

        answered = false;
        currentQuestionIndex++;
    } else {
        showResult();
    }
}

// Check Chosen Answer
function checkAnswer(selectedAnswer, correctAnswer, currentCountry, selectedButton) {
    if (!answered) {
        questionCounter++;
        if (selectedAnswer === correctAnswer) {
            score++;
            selectedButton.style.backgroundColor = 'limegreen';
            selectedButton.style.color = 'white';
        } else {
            selectedButton.style.backgroundColor = 'red';
            selectedButton.style.color = 'white';
        }

        // Update score HUD
        document.getElementById('score-value').textContent = score;
        document.getElementById('question-count-value').textContent = questionCounter;

        // Display correct country info card
        showCountryInfo(currentCountry);

        // Disable all option buttons and highlight the correct one
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(button => {
            button.disabled = true;
            if (button.textContent === correctAnswer) {
                button.style.backgroundColor = 'limegreen';
                button.style.color = 'white';
            }
        });

        answered = true;

        // Show Next Question button
        const nextQuestionButton = document.getElementById('next-question');
        nextQuestionButton.style.display = 'block';
    }
}

// Display Country Details Card
function showCountryInfo(country) {
    const countryInfoElement = document.getElementById('countryInfo');
    countryInfoElement.style.display = 'block';
    countryInfoElement.style.border = '2px solid black';
    countryInfoElement.style.borderRadius = '10px';
    countryInfoElement.style.padding = '15px';

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

    countryInfoElement.innerHTML = `
        <h2>${country.name.official || country.name.common}</h2>
        <h4>Population: ${(country.population || 0).toLocaleString('en-US')}</h4>
        <h4>Continent: ${continentName}</h4>
        <h4>Capital: ${capitalName}</h4>
        <h4>Currencies: ${currencyList}</h4>
        <h4>Languages: ${languageList}</h4>
        <h4>Independence: ${country.independent ? 'Yes' : 'No'}</h4>
        <h4>UN Member: ${country.unMember ? 'Yes' : 'No'}</h4>
        <h4>Traffic Driving Side: ${carSide}</h4>
    `;
}

// Show End-of-Quiz Result
function showResult() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = `
        <h2>Quiz Completed!</h2>
        <p>Total Score: ${score} / ${countriesData.length}</p>
        <button id="next-question" onclick="location.reload()">Play Again</button>
    `;
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

// Start Quiz on load
startQuiz();
