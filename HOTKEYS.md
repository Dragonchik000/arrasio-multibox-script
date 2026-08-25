# ⌨️ Горячие клавиши LUL Bot v3.2.1

## 🎮 Основные горячие клавиши

| Комбинация | Кнопка | Функция | Статус |
|-----------|--------|---------|--------|
| **Ctrl+Alt+A** | ⚔️ ATK | Автоатака вкл/выкл | Переключается |
| **Ctrl+Alt+P** | 🧭 PLT | Автопилот вкл/выкл | Переключается |
| **Ctrl+Alt+B** | 🏗️ BLD | Автобилд вкл/выкл | Переключается |
| **Ctrl+Alt+S** | 🔗 SYC | Синхронизация вкл/выкл | Переключается |
| **Ctrl+Alt+H** | 👑 HOST | HOST/CLIENT режим | Переключается |
| **Ctrl+Alt+F** | 👣 FLLW | Следование за хостом | Переключается |

---

## 🖱️ Мышка и UI

| Действие | Результат |
|----------|----------|
| Клик на кнопку в UI | Активирует функцию |
| Движение мышкой | Передвижение танка (если FOLLOW_MOUSE вкл) |
| Щелчок на враге | Атака (если AUTO_ATTACK вкл) |

---

## 📋 Полный список команд консоли

### Просмотр конфигурации
```javascript
// Вся конфигурация
console.log(ARRAS_CONFIG);

// Состояние игры
console.log(ARRAS_STATE);

// Статус авторизации
console.log(AUTH_STATE);

// Статус прокси
console.log(PROXY_CONFIG);
```

### Включение/выключение функций
```javascript
// Автоатака
ARRAS_CONFIG.AUTO_ATTACK = true;
ARRAS_CONFIG.AUTO_ATTACK = false;

// Автопилот
ARRAS_CONFIG.AUTO_PILOT = true;
ARRAS_CONFIG.AUTO_PILOT = false;

// Автобилд
ARRAS_CONFIG.AUTO_BUILD = true;
ARRAS_CONFIG.AUTO_BUILD = false;

// Синхронизация
ARRAS_CONFIG.SYNC_ENABLED = true;
ARRAS_CONFIG.SYNC_ENABLED = false;

// Следование за хостом
ARRAS_CONFIG.FOLLOW_HOST = true;
ARRAS_CONFIG.FOLLOW_HOST = false;

// Следование за мышкой
ARRAS_CONFIG.FOLLOW_MOUSE = true;
ARRAS_CONFIG.FOLLOW_MOUSE = false;
```

### Изменение режима
```javascript
// Переключиться на HOST
ARRAS_CONFIG.MODE = 'host';

// Переключиться на CLIENT
ARRAS_CONFIG.MODE = 'client';

// Проверить текущий режим
console.log(ARRAS_CONFIG.MODE);
```

### Изменение параметров
```javascript
// Дальность атаки
ARRAS_CONFIG.ATTACK_RANGE = 500;

// Интервал синхронизации
ARRAS_CONFIG.SYNC_INTERVAL = 50;

// Расстояние следования за мышкой
ARRAS_CONFIG.FOLLOW_DISTANCE = 150;

// Расстояние следования за хостом
ARRAS_CONFIG.HOST_FOLLOW_DISTANCE = 250;
```

### Сохранение конфигурации
```javascript
// Сохранить текущие настройки
GM_setValue('arras_mode', ARRAS_CONFIG.MODE);
GM_setValue('auto_attack', ARRAS_CONFIG.AUTO_ATTACK);
GM_setValue('auto_pilot', ARRAS_CONFIG.AUTO_PILOT);
GM_setValue('auto_build', ARRAS_CONFIG.AUTO_BUILD);
```

### Очистка данных
```javascript
// Очистить токен Discord
GM_setValue('discord_token', null);
GM_setValue('discord_token_expiry', null);

// Очистить позицию хоста
GM_setValue('arras_host_position', null);

// Очистить режим
GM_setValue('arras_mode', 'client');

// Очистить все
localStorage.clear();
```

### Проверка статуса бота
```javascript
// Позиция игрока
console.log(ARRAS_STATE.playerPos);

// Здоровье
console.log(ARRAS_STATE.health);

// Уровень
console.log(ARRAS_STATE.level);

// Очки
console.log(ARRAS_STATE.score);

// Враги
console.log(ARRAS_STATE.enemies);

// Позиция мышки
console.log(ARRAS_STATE.mousePos);

// Позиция хоста
console.log(ARRAS_STATE.hostPos);
```

### Отладка синхронизации
```javascript
// Получить данные хоста
const hostData = GM_getValue('arras_host_position', '{}');
console.log(JSON.parse(hostData));

// Установить данные хоста (для тестирования)
GM_setValue('arras_host_position', JSON.stringify({
    x: 1000,
    y: 2000,
    timestamp: Date.now(),
    health: 100,
    level: 5
}));
```

### Отладка авторизации
```javascript
// Текущий пользователь
console.log(AUTH_STATE.user);

// Токен
console.log(AUTH_STATE.token);

// Статус авторизации
console.log(AUTH_STATE.authenticated);

// Время истечения токена
console.log(AUTH_STATE.tokenExpiry);
```

### Управление прокси
```javascript
// Текущий прокси
console.log(PROXY_CONFIG);

// Статус подключения
console.log(ARRAS_STATE.proxyStatus);

// Проверить статус прокси
proxyManager.testConnection();

// Ротировать прокси
proxyManager.rotateProxy();

// Подключиться к прокси
proxyManager.connect();
```

---

## 🔧 Сочетания клавиш по типам

### Для боевых операций
| Клавиша | Действие |
|---------|----------|
| **Ctrl+Alt+A** | Включить/выключить автоатаку |
| **Ctrl+Alt+P** | Включить/выключить автопилот |
| **Ctrl+Alt+B** | Включить/выключить автобилд |

### Для мультиплеера
| Клавиша | Действие |
|---------|----------|
| **Ctrl+Alt+H** | Переключить HOST/CLIENT |
| **Ctrl+Alt+F** | Включить следование за хостом |
| **Ctrl+Alt+S** | Включить синхронизацию |

---

## 📱 Статусы кнопок

### Зелёная кнопка (активна) ✅
```
Функция включена и работает
```

### Тёмная кнопка (неактивна) ⬜
```
Функция отключена
```

---

## 💡 Полезные комбинации

### Быстрая активация всего
```javascript
// Откройте консоль и скопируйте:
ARRAS_CONFIG.AUTO_ATTACK = true;
ARRAS_CONFIG.AUTO_PILOT = true;
ARRAS_CONFIG.AUTO_BUILD = true;
ARRAS_CONFIG.SYNC_ENABLED = true;
```

### Полное отключение
```javascript
ARRAS_CONFIG.AUTO_ATTACK = false;
ARRAS_CONFIG.AUTO_PILOT = false;
ARRAS_CONFIG.AUTO_BUILD = false;
ARRAS_CONFIG.SYNC_ENABLED = false;
```

### Режим только защиты (атака только)
```javascript
ARRAS_CONFIG.AUTO_ATTACK = true;
ARRAS_CONFIG.AUTO_PILOT = false;
ARRAS_CONFIG.AUTO_BUILD = false;
```

### Режим фарма (сбор еды)
```javascript
ARRAS_CONFIG.AUTO_ATTACK = false;
ARRAS_CONFIG.AUTO_PILOT = true;
ARRAS_CONFIG.AUTO_BUILD = true;
```

---

## 🖥️ Горячие клавиши браузера (общие)

| Клавиша | Действие |
|---------|----------|
| **F12** | Открыть консоль разработчика |
| **Ctrl+Shift+K** | Открыть консоль (Firefox) |
| **F5** | Обновить страницу |
| **Ctrl+R** | Обновить страницу |
| **Ctrl+Shift+R** | Полное обновление (очистить кеш) |

---

## ⚠️ Частые ошибки

### Клавиша не работает
```
✓ Убедитесь, что фокус на странице arras.io
✓ Откройте консоль (F12) и проверьте ошибки
✓ Попробуйте перезагрузить страницу
```

### UI панель не видна
```
✓ Откройте консоль (F12)
✓ Проверьте, включён ли Tampermonkey
✓ Убедитесь, что скрипт активен в Dashboard
```

### Функция не срабатывает
```
✓ Проверьте статус кнопки (зелёная = активна)
✓ Нажмите кнопку или горячую клавишу ещё раз
✓ Откройте консоль и выполните команду вручную
```

---

**Last Updated:** 2026-08-25
**Version:** 3.2.1
