// ==UserScript==
// @name         Arras.io Multibox Bot Pro
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Advanced multibox script with auto-attack, auto-pilot, auto-build, host sync
// @author       Dragonchik000
// @match        https://arras.io/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      idcraw.lol
// ==/UserScript==

(function() {
    'use strict';

    // ==================== GLOBAL CONFIG ====================
    window.ARRAS_CONFIG = {
        MODE: GM_getValue('arras_mode', 'client'), // 'host' or 'client'
        AUTO_ATTACK: GM_getValue('auto_attack', true),
        AUTO_PILOT: GM_getValue('auto_pilot', true),
        AUTO_BUILD: GM_getValue('auto_build', true),
        FOLLOW_MOUSE: GM_getValue('follow_mouse', true),
        SYNC_ENABLED: GM_getValue('sync_enabled', true),
        FOLLOW_HOST: GM_getValue('follow_host', true),
        
        // Параметры
        SYNC_INTERVAL: 50,
        ATTACK_RANGE: 400,
        FOLLOW_DISTANCE: 150,
        HOST_FOLLOW_DISTANCE: 250,
        AUTO_SPIN: true,
        AUTO_FOCUS: true
    };

    window.ARRAS_STATE = {
        gameLoaded: false,
        playerPos: { x: 0, y: 0 },
        mousePos: { x: 0, y: 0 },
        hostPos: { x: 0, y: 0 },
        enemies: [],
        bullets: [],
        health: 100,
        maxHealth: 100,
        level: 1,
        score: 0,
        isAlive: true,
        tankType: 'Basic',
        upgrades: {}
    };

    // ==================== OVERLAY LOADER ====================
    function loadOverlay() {
        console.log('[Arras Multibox] Загрузка оверлея...');
        
        // Создаём модуль оверлея локально
        const overlayCode = `
            (function() {
                console.log('[Overlay] Инициализация оверлея arras.io');
                
                // Захват игровых данных
                let gameCanvas = null;
                let gameCtx = null;
                
                function captureGameData() {
                    try {
                        // Пытаемся получить canvas и контекст
                        gameCanvas = document.querySelector('canvas');
                        if (gameCanvas) {
                            gameCtx = gameCanvas.getContext('2d');
                        }
                        return true;
                    } catch(e) {
                        return false;
                    }
                }
                
                window.ArrasOverlay = {
                    initialized: false,
                    
                    init: function() {
                        if (this.initialized) return;
                        console.log('[Overlay] Инициализация завершена');
                        this.initialized = true;
                    },
                    
                    getGameData: function() {
                        return {
                            canvas: gameCanvas,
                            ctx: gameCtx,
                            timestamp: Date.now()
                        };
                    },
                    
                    injectStats: function() {
                        // Инъекция статистики в игру
                    }
                };
                
                // Запустить захват данных когда игра загрузится
                const checkInterval = setInterval(() => {
                    if (captureGameData()) {
                        clearInterval(checkInterval);
                        window.ArrasOverlay.init();
                    }
                }, 100);
            })();
        `;
        
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.textContent = overlayCode;
        script.async = false;
        document.documentElement.appendChild(script);
    }

    // ==================== GAME INTERFACE ====================
    class GameInterface {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.gameState = {};
        }

        initialize() {
            this.canvas = document.querySelector('canvas');
            this.attachEventListeners();
            this.captureGameState();
        }

        attachEventListeners() {
            // Перехват событий мыши
            document.addEventListener('mousemove', (e) => {
                ARRAS_STATE.mousePos = {
                    x: e.clientX,
                    y: e.clientY
                };
            });

            document.addEventListener('click', (e) => {
                // Логирование кликов для отладки
            });
        }

        captureGameState() {
            setInterval(() => {
                try {
                    // Попытка получить состояние из window объекта
                    if (window.GAME_STATE) {
                        ARRAS_STATE.playerPos = window.GAME_STATE.playerPos || ARRAS_STATE.playerPos;
                        ARRAS_STATE.health = window.GAME_STATE.health || ARRAS_STATE.health;
                        ARRAS_STATE.level = window.GAME_STATE.level || ARRAS_STATE.level;
                        ARRAS_STATE.score = window.GAME_STATE.score || ARRAS_STATE.score;
                        ARRAS_STATE.enemies = window.GAME_STATE.enemies || [];
                    }
                } catch(e) {
                    // Game state not available yet
                }
            }, 100);
        }

        injectGameState(state) {
            if (!window.GAME_STATE) {
                window.GAME_STATE = {};
            }
            Object.assign(window.GAME_STATE, state);
        }
    }

    // ==================== BOT ENGINE ====================
    class BotEngine {
        constructor() {
            this.isRunning = false;
            this.targetEnemy = null;
            this.lastAttackTime = 0;
            this.attackCooldown = 100; // ms
        }

        start() {
            if (this.isRunning) return;
            this.isRunning = true;
            console.log('[Bot] Запуск бота');
            this.mainLoop();
        }

        stop() {
            this.isRunning = false;
            console.log('[Bot] Остановка бота');
        }

        mainLoop() {
            if (!this.isRunning) return;

            // Auto Attack
            if (ARRAS_CONFIG.AUTO_ATTACK) {
                this.handleAutoAttack();
            }

            // Auto Pilot
            if (ARRAS_CONFIG.AUTO_PILOT && ARRAS_CONFIG.MODE === 'client') {
                this.handleAutoPilot();
            }

            // Follow Mouse
            if (ARRAS_CONFIG.FOLLOW_MOUSE && ARRAS_CONFIG.MODE === 'client') {
                this.handleFollowMouse();
            }

            // Auto Build
            if (ARRAS_CONFIG.AUTO_BUILD) {
                this.handleAutoBuild();
            }

            // Sync with Host
            if (ARRAS_CONFIG.SYNC_ENABLED) {
                this.handleSync();
            }

            // Follow Host
            if (ARRAS_CONFIG.FOLLOW_HOST && ARRAS_CONFIG.MODE === 'client') {
                this.handleFollowHost();
            }

            requestAnimationFrame(() => this.mainLoop());
        }

        handleAutoAttack() {
            const now = Date.now();
            if (now - this.lastAttackTime < this.attackCooldown) return;

            const enemies = ARRAS_STATE.enemies;
            if (enemies.length === 0) return;

            // Найти ближайшего врага
            let closestEnemy = null;
            let minDistance = ARRAS_CONFIG.ATTACK_RANGE;

            enemies.forEach(enemy => {
                const dx = enemy.x - ARRAS_STATE.playerPos.x;
                const dy = enemy.y - ARRAS_STATE.playerPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = enemy;
                }
            });

            if (closestEnemy) {
                this.targetEnemy = closestEnemy;
                this.moveMouse(closestEnemy.x, closestEnemy.y);
                this.simulateClick();
                this.lastAttackTime = now;
            }
        }

        handleAutoPilot() {
            // Поиск collectibles (еды)
            const collectibles = ARRAS_STATE.collectibles || [];
            
            if (collectibles.length > 0) {
                const closest = this.findClosest(collectibles, ARRAS_STATE.playerPos);
                this.moveTowards(closest.x, closest.y);
            } else {
                // Случайное перемещение
                this.randomWalk();
            }
        }

        handleFollowMouse() {
            const dx = ARRAS_STATE.mousePos.x - ARRAS_STATE.playerPos.x;
            const dy = ARRAS_STATE.mousePos.y - ARRAS_STATE.playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > ARRAS_CONFIG.FOLLOW_DISTANCE) {
                this.moveTowards(ARRAS_STATE.mousePos.x, ARRAS_STATE.mousePos.y);
            }
        }

        handleFollowHost() {
            const dx = ARRAS_STATE.hostPos.x - ARRAS_STATE.playerPos.x;
            const dy = ARRAS_STATE.hostPos.y - ARRAS_STATE.playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > ARRAS_CONFIG.HOST_FOLLOW_DISTANCE && distance > 0) {
                this.moveTowards(ARRAS_STATE.hostPos.x, ARRAS_STATE.hostPos.y);
            }
        }

        handleAutoBuild() {
            // Автоматический апгрейд навыков
            const upgradeOrder = ['Health', 'Damage', 'Bullet Speed', 'Fire Rate', 'Reload'];
            
            upgradeOrder.forEach(upgrade => {
                if (this.canUpgrade(upgrade)) {
                    this.performUpgrade(upgrade);
                }
            });
        }

        handleSync() {
            if (ARRAS_CONFIG.MODE === 'host') {
                // Хост передаёт свою позицию
                GM_setValue('arras_host_position', JSON.stringify({
                    x: ARRAS_STATE.playerPos.x,
                    y: ARRAS_STATE.playerPos.y,
                    timestamp: Date.now(),
                    health: ARRAS_STATE.health,
                    level: ARRAS_STATE.level
                }));
            } else {
                // Клиент получает позицию хоста
                const hostData = GM_getValue('arras_host_position', '{}');
                try {
                    const parsed = JSON.parse(hostData);
                    ARRAS_STATE.hostPos = { x: parsed.x || 0, y: parsed.y || 0 };
                } catch(e) {
                    // Invalid JSON
                }
            }
        }

        // Helper Methods
        moveMouse(x, y) {
            const event = new MouseEvent('mousemove', {
                clientX: x,
                clientY: y,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
            ARRAS_STATE.mousePos = { x, y };
        }

        simulateClick() {
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            document.dispatchEvent(event);
        }

        moveTowards(targetX, targetY) {
            const dx = targetX - ARRAS_STATE.playerPos.x;
            const dy = targetY - ARRAS_STATE.playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const speed = 5;
                const moveX = ARRAS_STATE.playerPos.x + (dx / distance) * speed;
                const moveY = ARRAS_STATE.playerPos.y + (dy / distance) * speed;
                this.moveMouse(moveX, moveY);
            }
        }

        randomWalk() {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            const newX = ARRAS_STATE.playerPos.x + Math.cos(angle) * distance;
            const newY = ARRAS_STATE.playerPos.y + Math.sin(angle) * distance;
            this.moveTowards(newX, newY);
        }

        findClosest(items, reference) {
            return items.reduce((closest, item) => {
                const dist1 = Math.hypot(item.x - reference.x, item.y - reference.y);
                const dist2 = Math.hypot(closest.x - reference.x, closest.y - reference.y);
                return dist1 < dist2 ? item : closest;
            }, items[0] || reference);
        }

        canUpgrade(upgradeName) {
            try {
                const button = document.querySelector(`[data-upgrade*="${upgradeName.toLowerCase()}"]`);
                return button && !button.disabled;
            } catch(e) {
                return false;
            }
        }

        performUpgrade(upgradeName) {
            try {
                const buttons = document.querySelectorAll('button');
                for (let btn of buttons) {
                    if (btn.textContent.toLowerCase().includes(upgradeName.toLowerCase()) && !btn.disabled) {
                        btn.click();
                        break;
                    }
                }
            } catch(e) {
                console.error('[Bot] Ошибка при апгрейде:', e);
            }
        }
    }

    // ==================== UI PANEL ====================
    class UIPanel {
        constructor() {
            this.panel = null;
            this.isVisible = true;
        }

        create() {
            this.panel = document.createElement('div');
            this.panel.id = 'arras-bot-panel';
            this.panel.innerHTML = `
                <style>
                    #arras-bot-panel {
                        position: fixed;
                        top: 15px;
                        left: 15px;
                        background: rgba(0, 0, 0, 0.85);
                        color: #00ff00;
                        font-family: 'Courier New', monospace;
                        font-size: 13px;
                        padding: 12px;
                        border: 2px solid #00ff00;
                        border-radius: 6px;
                        z-index: 100000;
                        min-width: 250px;
                        box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
                        user-select: none;
                    }
                    
                    .panel-header {
                        font-weight: bold;
                        font-size: 14px;
                        margin-bottom: 10px;
                        text-align: center;
                        border-bottom: 1px solid #00ff00;
                        padding-bottom: 8px;
                    }
                    
                    .status-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 6px 0;
                        padding: 3px 0;
                    }
                    
                    .status-label {
                        color: #00ff00;
                    }
                    
                    .status-value {
                        color: #00aa00;
                        font-weight: bold;
                    }
                    
                    .divider {
                        border-top: 1px solid #00ff00;
                        margin: 8px 0;
                    }
                    
                    .button-group {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 5px;
                        margin-top: 10px;
                    }
                    
                    .bot-btn {
                        background: #00ff00;
                        color: #000;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-family: monospace;
                        font-size: 11px;
                        font-weight: bold;
                        transition: all 0.2s;
                        flex: 1;
                        min-width: 60px;
                    }
                    
                    .bot-btn:hover {
                        background: #00ff00;
                        box-shadow: 0 0 5px #00ff00;
                    }
                    
                    .bot-btn.disabled {
                        background: #333;
                        color: #666;
                        cursor: not-allowed;
                    }
                    
                    .bot-btn.disabled:hover {
                        box-shadow: none;
                    }
                    
                    .info-text {
                        font-size: 10px;
                        color: #00aa00;
                        margin-top: 8px;
                        border-top: 1px dashed #00ff00;
                        padding-top: 5px;
                    }
                </style>
                
                <div class="panel-header">🤖 ARRAS.IO BOT v3.0</div>
                
                <div class="status-row">
                    <span class="status-label">📍 Mode:</span>
                    <span class="status-value" id="mode-status">CLIENT</span>
                </div>
                
                <div class="status-row">
                    <span class="status-label">❤️ Health:</span>
                    <span class="status-value" id="health-status">100/100</span>
                </div>
                
                <div class="status-row">
                    <span class="status-label">📊 Level:</span>
                    <span class="status-value" id="level-status">1</span>
                </div>
                
                <div class="status-row">
                    <span class="status-label">⭐ Score:</span>
                    <span class="status-value" id="score-status">0</span>
                </div>
                
                <div class="status-row">
                    <span class="status-label">🎯 Tank:</span>
                    <span class="status-value" id="tank-status">-</span>
                </div>
                
                <div class="divider"></div>
                
                <div class="button-group">
                    <button class="bot-btn" id="btn-attack">⚔️ ATK</button>
                    <button class="bot-btn" id="btn-pilot">🧭 PLT</button>
                    <button class="bot-btn" id="btn-build">🏗️ BLD</button>
                    <button class="bot-btn" id="btn-sync">🔗 SYC</button>
                </div>
                
                <div class="button-group">
                    <button class="bot-btn" id="btn-host">👑 HOST</button>
                    <button class="bot-btn" id="btn-follow">👣 FLLW</button>
                </div>
                
                <div class="info-text">
                    Hotkeys: Ctrl+Alt+A/P/B/S/H/F<br>
                    Status: <span id="bot-status">Ready</span>
                </div>
            `;

            document.body.appendChild(this.panel);
            this.attachButtonHandlers();
        }

        attachButtonHandlers() {
            const handlers = {
                'btn-attack': () => this.toggleConfig('AUTO_ATTACK'),
                'btn-pilot': () => this.toggleConfig('AUTO_PILOT'),
                'btn-build': () => this.toggleConfig('AUTO_BUILD'),
                'btn-sync': () => this.toggleConfig('SYNC_ENABLED'),
                'btn-host': () => this.toggleMode(),
                'btn-follow': () => this.toggleConfig('FOLLOW_HOST')
            };

            Object.entries(handlers).forEach(([id, handler]) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('click', handler);
                }
            });
        }

        toggleConfig(key) {
            ARRAS_CONFIG[key] = !ARRAS_CONFIG[key];
            GM_setValue(key.toLowerCase(), ARRAS_CONFIG[key]);
            this.updateButtonStates();
            console.log(`[UI] ${key}: ${ARRAS_CONFIG[key]}`);
        }

        toggleMode() {
            ARRAS_CONFIG.MODE = ARRAS_CONFIG.MODE === 'host' ? 'client' : 'host';
            GM_setValue('arras_mode', ARRAS_CONFIG.MODE);
            this.updateStatus();
            console.log(`[UI] Mode: ${ARRAS_CONFIG.MODE.toUpperCase()}`);
        }

        updateStatus() {
            try {
                document.getElementById('mode-status').textContent = ARRAS_CONFIG.MODE.toUpperCase();
                document.getElementById('health-status').textContent = 
                    `${Math.max(0, ARRAS_STATE.health)}/${ARRAS_STATE.maxHealth}`;
                document.getElementById('level-status').textContent = ARRAS_STATE.level;
                document.getElementById('score-status').textContent = ARRAS_STATE.score;
                document.getElementById('tank-status').textContent = ARRAS_STATE.tankType || '-';
                
                this.updateButtonStates();
            } catch(e) {
                // UI not ready yet
            }
        }

        updateButtonStates() {
            const buttons = {
                'btn-attack': ARRAS_CONFIG.AUTO_ATTACK,
                'btn-pilot': ARRAS_CONFIG.AUTO_PILOT,
                'btn-build': ARRAS_CONFIG.AUTO_BUILD,
                'btn-sync': ARRAS_CONFIG.SYNC_ENABLED,
                'btn-follow': ARRAS_CONFIG.FOLLOW_HOST,
                'btn-host': ARRAS_CONFIG.MODE === 'host'
            };

            Object.entries(buttons).forEach(([id, isEnabled]) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.classList.toggle('disabled', !isEnabled);
                }
            });
        }
    }

    // ==================== INITIALIZATION ====================
    
    let gameInterface = null;
    let botEngine = null;
    let uiPanel = null;

    function initialize() {
        console.log('[Arras Multibox] Инициализация скрипта...');

        // Загрузить оверлей
        loadOverlay();

        // Инициализировать компоненты
        gameInterface = new GameInterface();
        botEngine = new BotEngine();
        uiPanel = new UIPanel();

        // Создать UI панель
        uiPanel.create();

        // Запустить инициализацию игры
        const initInterval = setInterval(() => {
            try {
                gameInterface.initialize();
                botEngine.start();
                clearInterval(initInterval);
                console.log('[Arras Multibox] Все компоненты инициализированы');
            } catch(e) {
                console.log('[Arras Multibox] Ожидание загрузки игры...');
            }
        }, 500);

        // Обновление UI каждый кадр
        setInterval(() => {
            if (uiPanel) {
                uiPanel.updateStatus();
            }
        }, 100);

        // Горячие клавиши
        setupHotkeys();

        console.log('[Arras Multibox] ✅ Готово! Режим:', ARRAS_CONFIG.MODE.toUpperCase());
    }

    function setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey) {
                const key = e.key.toLowerCase();
                
                const shortcuts = {
                    'a': () => uiPanel.toggleConfig('AUTO_ATTACK'),
                    'p': () => uiPanel.toggleConfig('AUTO_PILOT'),
                    'b': () => uiPanel.toggleConfig('AUTO_BUILD'),
                    's': () => uiPanel.toggleConfig('SYNC_ENABLED'),
                    'h': () => uiPanel.toggleMode(),
                    'f': () => uiPanel.toggleConfig('FOLLOW_HOST')
                };

                if (shortcuts[key]) {
                    e.preventDefault();
                    shortcuts[key]();
                }
            }
        });
    }

    // Запуск скрипта
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
