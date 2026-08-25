// ==UserScript==
// @name         Arras.io Multibox Bot Pro
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Advanced multibox script with proxy support and auto-attack, auto-pilot, auto-build
// @author       Dragonchik000
// @match        https://arras.io/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      dc.de-pr.plainproxies.com
// ==/UserScript==

(function() {
    'use strict';

    // ==================== PROXY CONFIG ====================
    window.PROXY_CONFIG = {
        ENABLED: true,
        PRIMARY: {
            host: 'dc.de-pr.plainproxies.com',
            port: 1338,
            username: 'DC_B06Tf3XfXR-ttl-0',
            password: 'FQ0s56phl8LSgtI'
        },
        BACKUPS: [
            // Add backup proxies here
        ],
        ROTATION: true,
        CURRENT_INDEX: 0,
        CONNECTION_TIMEOUT: 5000
    };

    // ==================== GLOBAL CONFIG ====================
    window.ARRAS_CONFIG = {
        MODE: GM_getValue('arras_mode', 'client'), // 'host' or 'client'
        AUTO_ATTACK: GM_getValue('auto_attack', true),
        AUTO_PILOT: GM_getValue('auto_pilot', true),
        AUTO_BUILD: GM_getValue('auto_build', true),
        FOLLOW_MOUSE: GM_getValue('follow_mouse', true),
        SYNC_ENABLED: GM_getValue('sync_enabled', true),
        FOLLOW_HOST: GM_getValue('follow_host', true),
        USE_PROXY: GM_getValue('use_proxy', true),
        
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
        upgrades: {},
        proxyStatus: 'disconnected'
    };

    // ==================== PROXY MANAGER ====================
    class ProxyManager {
        constructor() {
            this.proxies = [PROXY_CONFIG.PRIMARY, ...PROXY_CONFIG.BACKUPS];
            this.currentProxy = this.proxies[0];
            this.isConnected = false;
            this.connectionAttempts = 0;
            this.maxRetries = 3;
        }

        getCurrentProxy() {
            if (!PROXY_CONFIG.ROTATION) {
                return this.proxies[0];
            }
            return this.proxies[PROXY_CONFIG.CURRENT_INDEX % this.proxies.length];
        }

        rotateProxy() {
            PROXY_CONFIG.CURRENT_INDEX++;
            this.currentProxy = this.getCurrentProxy();
            console.log(`[Proxy] Ротация прокси (${PROXY_CONFIG.CURRENT_INDEX}):`, this.currentProxy.host);
        }

        getProxyURL() {
            const proxy = this.getCurrentProxy();
            return `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
        }

        getProxyString() {
            const proxy = this.getCurrentProxy();
            return `${proxy.host}:${proxy.port}:${proxy.username}:${proxy.password}`;
        }

        async testConnection() {
            return new Promise((resolve) => {
                const proxy = this.getCurrentProxy();
                const timeout = setTimeout(() => {
                    console.log('[Proxy] Timeout подключения');
                    ARRAS_STATE.proxyStatus = 'timeout';
                    resolve(false);
                }, PROXY_CONFIG.CONNECTION_TIMEOUT);

                try {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: 'https://api.ipify.org?format=json',
                        timeout: PROXY_CONFIG.CONNECTION_TIMEOUT,
                        onload: (response) => {
                            clearTimeout(timeout);
                            console.log('[Proxy] ✅ Подключено:', response.responseText);
                            ARRAS_STATE.proxyStatus = 'connected';
                            this.isConnected = true;
                            this.connectionAttempts = 0;
                            resolve(true);
                        },
                        onerror: () => {
                            clearTimeout(timeout);
                            console.log('[Proxy] ❌ Ошибка подключения');
                            ARRAS_STATE.proxyStatus = 'error';
                            this.connectionAttempts++;
                            resolve(false);
                        }
                    });
                } catch(e) {
                    clearTimeout(timeout);
                    console.error('[Proxy] Ошибка при тестировании:', e);
                    ARRAS_STATE.proxyStatus = 'error';
                    resolve(false);
                }
            });
        }

        async connect() {
            console.log('[Proxy] Попытка подключения...');
            
            for (let i = 0; i < this.maxRetries; i++) {
                const connected = await this.testConnection();
                if (connected) {
                    return true;
                }
                
                // Попробовать следующий прокси
                if (i < this.maxRetries - 1) {
                    this.rotateProxy();
                    await this.delay(1000);
                }
            }
            
            console.error('[Proxy] Не удалось подключиться');
            ARRAS_STATE.proxyStatus = 'failed';
            return false;
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        addProxy(host, port, username, password) {
            const newProxy = { host, port, username, password };
            this.proxies.push(newProxy);
            console.log('[Proxy] Прокси добавлен:', host);
        }

        removeProxy(index) {
            if (index < this.proxies.length) {
                this.proxies.splice(index, 1);
                console.log('[Proxy] Прокси удалён');
            }
        }

        listProxies() {
            return this.proxies.map((p, i) => `${i}: ${p.host}:${p.port}`).join('\n');
        }
    }

    // ==================== OVERLAY LOADER ====================
    function loadOverlay() {
        console.log('[Arras Multibox] Загрузка оверлея...');
        
        const overlayCode = `
            (function() {
                console.log('[Overlay] Инициализация оверлея arras.io');
                
                let gameCanvas = null;
                let gameCtx = null;
                
                function captureGameData() {
                    try {
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
                    }
                };
                
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
            document.addEventListener('mousemove', (e) => {
                ARRAS_STATE.mousePos = {
                    x: e.clientX,
                    y: e.clientY
                };
            });
        }

        captureGameState() {
            setInterval(() => {
                try {
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
    }

    // ==================== BOT ENGINE ====================
    class BotEngine {
        constructor(proxyManager) {
            this.isRunning = false;
            this.targetEnemy = null;
            this.lastAttackTime = 0;
            this.attackCooldown = 100;
            this.proxyManager = proxyManager;
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

            if (ARRAS_CONFIG.AUTO_ATTACK) {
                this.handleAutoAttack();
            }

            if (ARRAS_CONFIG.AUTO_PILOT && ARRAS_CONFIG.MODE === 'client') {
                this.handleAutoPilot();
            }

            if (ARRAS_CONFIG.FOLLOW_MOUSE && ARRAS_CONFIG.MODE === 'client') {
                this.handleFollowMouse();
            }

            if (ARRAS_CONFIG.AUTO_BUILD) {
                this.handleAutoBuild();
            }

            if (ARRAS_CONFIG.SYNC_ENABLED) {
                this.handleSync();
            }

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
            const collectibles = ARRAS_STATE.collectibles || [];
            
            if (collectibles.length > 0) {
                const closest = this.findClosest(collectibles, ARRAS_STATE.playerPos);
                this.moveTowards(closest.x, closest.y);
            } else {
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
            const upgradeOrder = ['Health', 'Damage', 'Bullet Speed', 'Fire Rate', 'Reload'];
            
            upgradeOrder.forEach(upgrade => {
                if (this.canUpgrade(upgrade)) {
                    this.performUpgrade(upgrade);
                }
            });
        }

        handleSync() {
            if (ARRAS_CONFIG.MODE === 'host') {
                GM_setValue('arras_host_position', JSON.stringify({
                    x: ARRAS_STATE.playerPos.x,
                    y: ARRAS_STATE.playerPos.y,
                    timestamp: Date.now(),
                    health: ARRAS_STATE.health,
                    level: ARRAS_STATE.level
                }));
            } else {
                const hostData = GM_getValue('arras_host_position', '{}');
                try {
                    const parsed = JSON.parse(hostData);
                    ARRAS_STATE.hostPos = { x: parsed.x || 0, y: parsed.y || 0 };
                } catch(e) {
                    // Invalid JSON
                }
            }
        }

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
        constructor(proxyManager) {
            this.panel = null;
            this.isVisible = true;
            this.proxyManager = proxyManager;
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
                        min-width: 280px;
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
                    
                    .proxy-status {
                        padding: 5px;
                        background: rgba(0, 255, 0, 0.1);
                        border-radius: 3px;
                        font-size: 11px;
                        margin: 8px 0;
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
                    
                    .info-text {
                        font-size: 10px;
                        color: #00aa00;
                        margin-top: 8px;
                        border-top: 1px dashed #00ff00;
                        padding-top: 5px;
                    }
                </style>
                
                <div class="panel-header">🤖 ARRAS.IO BOT v3.1 [PROXY]</div>
                
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
                
                <div class="proxy-status">
                    🌐 Proxy: <span id="proxy-status" style="color: #ffaa00;">connecting...</span>
                    <br/>IP: <span id="proxy-ip" style="font-size: 10px;">-</span>
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
                    <button class="bot-btn" id="btn-proxy">🌐 PRXY</button>
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
                'btn-follow': () => this.toggleConfig('FOLLOW_HOST'),
                'btn-proxy': () => this.toggleProxy()
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

        toggleProxy() {
            ARRAS_CONFIG.USE_PROXY = !ARRAS_CONFIG.USE_PROXY;
            GM_setValue('use_proxy', ARRAS_CONFIG.USE_PROXY);
            this.updateButtonStates();
            
            if (ARRAS_CONFIG.USE_PROXY) {
                this.proxyManager.connect();
            }
            
            console.log(`[UI] Proxy: ${ARRAS_CONFIG.USE_PROXY}`);
        }

        updateStatus() {
            try {
                document.getElementById('mode-status').textContent = ARRAS_CONFIG.MODE.toUpperCase();
                document.getElementById('health-status').textContent = 
                    `${Math.max(0, ARRAS_STATE.health)}/${ARRAS_STATE.maxHealth}`;
                document.getElementById('level-status').textContent = ARRAS_STATE.level;
                document.getElementById('score-status').textContent = ARRAS_STATE.score;
                document.getElementById('proxy-status').textContent = ARRAS_STATE.proxyStatus.toUpperCase();
                
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
                'btn-host': ARRAS_CONFIG.MODE === 'host',
                'btn-proxy': ARRAS_CONFIG.USE_PROXY
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
    
    let proxyManager = null;
    let gameInterface = null;
    let botEngine = null;
    let uiPanel = null;

    async function initialize() {
        console.log('[Arras Multibox] Инициализация скрипта v3.1...');

        // Инициализировать менеджер прокси
        proxyManager = new ProxyManager();
        
        // Загрузить оверлей
        loadOverlay();

        // Инициализировать компоненты
        gameInterface = new GameInterface();
        botEngine = new BotEngine(proxyManager);
        uiPanel = new UIPanel(proxyManager);

        // Создать UI панель
        uiPanel.create();

        // Подключиться к прокси если включён
        if (ARRAS_CONFIG.USE_PROXY) {
            await proxyManager.connect();
        }

        // Запустить инициализацию игры
        const initInterval = setInterval(() => {
            try {
                gameInterface.initialize();
                botEngine.start();
                clearInterval(initInterval);
                console.log('[Arras Multibox] ✅ Все компоненты инициализированы');
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

        // Проверка соединения с прокси каждые 30 секунд
        setInterval(() => {
            if (ARRAS_CONFIG.USE_PROXY && !proxyManager.isConnected) {
                proxyManager.connect();
            }
        }, 30000);

        // Горячие клавиши
        setupHotkeys();

        console.log('[Arras Multibox] ✅ Готово! Режим:', ARRAS_CONFIG.MODE.toUpperCase());
        console.log('[Arras Multibox] Прокси:', proxyManager.getProxyString());
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
