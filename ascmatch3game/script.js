const BOARD_SIZE = 8;
const NFT_IMAGES = [
    'nft/nft1.jpg',
    'nft/nft2.jpg',
    'nft/nft3.jpg',
    'nft/nft4.jpg',
    'nft/nft5.jpg',
    'nft/nft6.jpg'
];

// Секретные анимации (GIF) для разных уровней
const SECRET_ANIMATIONS = {
    easy: { threshold: 10000, gif: 'secret/easy_secret.gif' },
    medium: { threshold: 1000, gif: 'secret/medium_secret.gif' },
    hard: { threshold: 500, gif: 'secret/hard_secret.gif' }
};

let board = [];
let selectedCell = null;
let score = 0;
let currentLevel = 'easy';
let timeLeft = 60;
let timerId = null;
let imagesPreloaded = false;
let isAnimating = false;
let secretShown = false;

const LEVELS = {
    easy: { nfts: 4, time: 0 },
    medium: { nfts: 5, time: 60 },
    hard: { nfts: 6, time: 30 }
};

// Предзагрузка изображений (NFT + GIF)
function preloadImages(callback) {
    let loaded = 0;
    const total = NFT_IMAGES.length;
    
    // Загрузка основных NFT изображений
    NFT_IMAGES.forEach(imgSrc => {
        const img = new Image();
        img.onload = () => {
            loaded++;
            if (loaded === total) {
                imagesPreloaded = true;
                callback(true);
            }
        };
        img.onerror = () => {
            console.error("Failed to load:", imgSrc);
            loaded++;
            if (loaded === total) {
                callback(imagesPreloaded);
            }
        };
        img.src = imgSrc;
    });
    
    // Предзагрузка GIF (не блокируем игру если не загрузились)
    Object.values(SECRET_ANIMATIONS).forEach(anim => {
        const img = new Image();
        img.src = anim.gif;
    });
}

// Показать секретную анимацию (GIF)
function showSecretAnimation(gifSrc) {
    if (secretShown) return;
    secretShown = true;
    
    const secretAnimation = document.getElementById('secretAnimation');
    secretAnimation.innerHTML = `<img src="${gifSrc}" class="secret-gif">`;
    secretAnimation.style.display = 'flex';
    
    // Скрыть анимацию через 3 секунды (длительность GIF)
    setTimeout(() => {
        secretAnimation.style.display = 'none';
    }, 3000);
}

// Проверить, нужно ли показать секретную анимацию
function checkSecretAnimation() {
    const secretConfig = SECRET_ANIMATIONS[currentLevel];
    if (score >= secretConfig.threshold && !secretShown) {
        showSecretAnimation(secretConfig.gif);
    }
}

// Запуск игры
function startGame(level) {
    document.getElementById('gameBoard').innerHTML = '';
    score = 0;
    secretShown = false;
    document.getElementById('score').textContent = score;
    currentLevel = level;
    
    if (imagesPreloaded) {
        initGame();
        return;
    }
    
    document.getElementById('gameBoard').innerHTML = '<div class="loading">Loading NFTs...</div>';
    
    preloadImages((success) => {
        if (!success) {
            alert("Some NFTs failed to load. Game will use fallback colors.");
        }
        initGame();
    });
}

// Инициализация игры
function initGame() {
    const timerElement = document.getElementById('timer');
    if (LEVELS[currentLevel].time > 0) {
        timeLeft = LEVELS[currentLevel].time;
        document.getElementById('time').textContent = timeLeft;
        timerElement.style.display = 'block';
        
        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => {
            timeLeft--;
            document.getElementById('time').textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerId);
                alert(`Time's up! Your score: ${score}`);
                checkSecretAnimation();
            }
        }, 1000);
    } else {
        timerElement.style.display = 'none';
        if (timerId) clearInterval(timerId);
    }
    
    createBoard();
}

// Создание игрового поля
function createBoard() {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    board = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            let randomNft;
            do {
                randomNft = Math.floor(Math.random() * LEVELS[currentLevel].nfts);
            } while (
                (row >= 2 && board[row-1][col] === randomNft && board[row-2][col] === randomNft) ||
                (col >= 2 && board[row][col-1] === randomNft && board[row][col-2] === randomNft)
            );

            if (imagesPreloaded) {
                cell.style.backgroundImage = `url(${NFT_IMAGES[randomNft]})`;
                cell.style.backgroundColor = 'transparent';
            } else {
                const COLORS = ['#FF6B6B', '#A0FEA0', '#60E060', '#FFD166', '#06D6A0', '#118AB2'];
                cell.style.backgroundColor = COLORS[randomNft % COLORS.length];
            }

            board[row][col] = randomNft;
            cell.addEventListener('click', () => handleClick(row, col, cell));
            gameBoard.appendChild(cell);
        }
    }
}

// Обработка кликов
function handleClick(row, col, cell) {
    if (isAnimating) return;
    
    if (!selectedCell) {
        selectedCell = { row, col, element: cell };
        cell.classList.add('selected');
    } else {
        const firstCell = selectedCell;
        const secondCell = { row, col, element: cell };

        if (isAdjacent(firstCell, secondCell)) {
            isAnimating = true;
            
            const firstValue = board[firstCell.row][firstCell.col];
            const secondValue = board[secondCell.row][secondCell.col];
            
            firstCell.element.style.backgroundImage = secondValue !== null 
                ? `url(${NFT_IMAGES[secondValue]})` 
                : 'none';
            secondCell.element.style.backgroundImage = firstValue !== null 
                ? `url(${NFT_IMAGES[firstValue]})` 
                : 'none';
            
            board[firstCell.row][firstCell.col] = secondValue;
            board[secondCell.row][secondCell.col] = firstValue;

            if (checkMatches()) {
                setTimeout(() => {
                    isAnimating = false;
                    fillBoard();
                    firstCell.element.classList.remove('selected');
                    selectedCell = null;
                    checkSecretAnimation();
                }, 500);
            } else {
                firstCell.element.classList.add('invalid-move');
                secondCell.element.classList.add('invalid-move');
                
                setTimeout(() => {
                    firstCell.element.style.backgroundImage = firstValue !== null 
                        ? `url(${NFT_IMAGES[firstValue]})` 
                        : 'none';
                    secondCell.element.style.backgroundImage = secondValue !== null 
                        ? `url(${NFT_IMAGES[secondValue]})` 
                        : 'none';
                    
                    board[firstCell.row][firstCell.col] = firstValue;
                    board[secondCell.row][secondCell.col] = secondValue;
                    
                    firstCell.element.classList.remove('invalid-move', 'selected');
                    secondCell.element.classList.remove('invalid-move');
                    isAnimating = false;
                    selectedCell = null;
                }, 500);
            }
        } else {
            firstCell.element.classList.remove('selected');
            selectedCell = null;
        }
    }
}

// Проверка соседства
function isAdjacent(cell1, cell2) {
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

// Проверка совпадений
function checkMatches() {
    let matchesFound = false;
    const matchedCells = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE - 2; col++) {
            if (board[row][col] !== null && 
                board[row][col] === board[row][col+1] && 
                board[row][col] === board[row][col+2]) {
                matchedCells.push([row, col], [row, col+1], [row, col+2]);
                matchesFound = true;
            }
        }
    }

    for (let col = 0; col < BOARD_SIZE; col++) {
        for (let row = 0; row < BOARD_SIZE - 2; row++) {
            if (board[row][col] !== null && 
                board[row][col] === board[row+1][col] && 
                board[row][col] === board[row+2][col]) {
                matchedCells.push([row, col], [row+1, col], [row+2, col]);
                matchesFound = true;
            }
        }
    }

    const uniqueCells = Array.from(new Set(matchedCells.map(JSON.stringify))).map(JSON.parse);

    if (uniqueCells.length > 0) {
        score += uniqueCells.length * 10;
        document.getElementById('score').textContent = score;

        uniqueCells.forEach(([row, col]) => {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            cell.classList.add('explode');
            setTimeout(() => {
                board[row][col] = null;
                cell.style.backgroundImage = 'none';
                cell.classList.remove('explode');
            }, 300);
        });
    }

    return matchesFound;
}

// Заполнение поля после совпадений
function fillBoard() {
    for (let col = 0; col < BOARD_SIZE; col++) {
        let emptyRow = BOARD_SIZE - 1;
        
        for (let row = BOARD_SIZE - 1; row >= 0; row--) {
            if (board[row][col] === null) continue;
            
            if (row !== emptyRow) {
                board[emptyRow][col] = board[row][col];
                const cell = document.querySelector(`.cell[data-row="${emptyRow}"][data-col="${col}"]`);
                if (imagesPreloaded) {
                    cell.style.backgroundImage = `url(${NFT_IMAGES[board[row][col]]})`;
                } else {
                    const COLORS = ['#FF6B6B', '#A0FEA0', '#60E060', '#FFD166', '#06D6A0', '#118AB2'];
                    cell.style.backgroundColor = COLORS[board[row][col] % COLORS.length];
                }
                board[row][col] = null;
            }
            emptyRow--;
        }
        
        for (let row = emptyRow; row >= 0; row--) {
            const randomNft = Math.floor(Math.random() * LEVELS[currentLevel].nfts);
            board[row][col] = randomNft;
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            
            if (imagesPreloaded) {
                cell.style.backgroundImage = `url(${NFT_IMAGES[randomNft]})`;
                cell.style.backgroundColor = 'transparent';
            } else {
                const COLORS = ['#FF6B6B', '#A0FEA0', '#60E060', '#FFD166', '#06D6A0', '#118AB2'];
                cell.style.backgroundColor = COLORS[randomNft % COLORS.length];
            }
            
            cell.style.transform = 'translateY(-150px)';
            cell.style.opacity = '0';
            setTimeout(() => {
                cell.style.transition = 'all 0.4s ease-out';
                cell.style.transform = 'translateY(0)';
                cell.style.opacity = '1';
            }, 100);
        }
    }

    if (checkMatches()) {
        setTimeout(fillBoard, 500);
    } else {
        isAnimating = false;
        checkSecretAnimation();
    }
}