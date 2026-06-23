// ==================== DUST 2 FPS - CORRIGIDO ====================

let scene, camera, renderer;
let isLocked = false;
let playerHP = 100, playerArmor = 0, hasHelmet = false, isDead = false;
let currentWeapon = null, currentSlot = 1;
let weaponSlots = { 1: null, 2: null, 3: null, 4: null, 5: null };
let isReloading = false, lastShot = 0;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
let bots = [], money = 1600, scoreT = 0, scoreCT = 0, round = 1;
let bombPlanted = false, bombTimer = null, hasBomb = true, isFrozen = true;
let mapColliders = [], grenades = [];
let isFlyMode = false, godMode = false;
let playerGrenades = { HE: 1, FLASH: 0, SMOKE: 0 }, selectedGrenadeType = 'HE';
let isChatOpen = false;
let playerStats = { kills: 0, deaths: 0, headshots: 0 };

// ==================== INICIALIZACAO ====================
function initGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 16, -35);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    isLocked = true;
    document.getElementById('crosshair').style.display = 'block';
    
    // MOUSE - APENAS ISSO!
    document.addEventListener('mousemove', function(e) {
        if (isLocked && !isChatOpen && !isDead) {
            camera.rotation.y -= e.movementX * 0.002;
            camera.rotation.x -= e.movementY * 0.002;
            camera.rotation.x = Math.max(-1.5, Math.min(1.5, camera.rotation.x));
        }
    });
    
    setupWeapons();
    createMap();
    createBots();
    createBuyMenu();
    updateHUD();
    updateWeaponSlots();
    startFreezeTime();
    
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    
    animate();
    console.log('✅ Jogo pronto');
}

// ==================== ARMAS ====================
function setupWeapons() {
    weaponSlots[1] = { name: "AK-47", damage: 35, recoil: 0.05, fireRate: 120, type: "Rifle", ammo: 30, maxAmmo: 30, reserveAmmo: 90, reloadTime: 2500 };
    weaponSlots[2] = { name: "Glock-18", damage: 20, recoil: 0.02, fireRate: 200, type: "Pistol", ammo: 20, maxAmmo: 20, reserveAmmo: 120, reloadTime: 2000 };
    weaponSlots[3] = { name: "Faca", damage: 50, recoil: 0, fireRate: 400, type: "Melee", ammo: 1, maxAmmo: 1, reserveAmmo: 0, reloadTime: 0 };
    weaponSlots[4] = { grenades: true };
    weaponSlots[5] = { hasBomb: true };
    currentWeapon = weaponSlots[1];
    currentSlot = 1;
}

// ==================== MAPA COM COLISÃO REAL ====================
function createMap() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    
    // CHÃO
    const floorGeom = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xc8a882 });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 14;
    floor.name = "CHAO";
    scene.add(floor);
    mapColliders.push(floor);
    
    // PAREDES
    const wm = new THREE.MeshLambertMaterial({ color: 0xa08060 });
    const walls = [
        [0, 17, -45, 90, 6, 2],
        [0, 17, 45, 90, 6, 2],
        [-45, 17, 0, 2, 6, 90],
        [45, 17, 0, 2, 6, 90]
    ];
    walls.forEach(w => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w[3], w[4], w[5]), wm);
        wall.position.set(w[0], w[1], w[2]);
        scene.add(wall);
        mapColliders.push(wall);
    });
    
    console.log('✅ Mapa: ' + mapColliders.length + ' colisores');
}

// ==================== BOTS ====================
function createBots() {
    bots.forEach(b => scene.remove(b)); bots = [];
    const n = parseInt(localStorage.getItem('botCount') || '5');
    for (let i = 0; i < n; i++) {
        const bot = new THREE.Group();
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshLambertMaterial({ color: 0xcc6666 }));
        head.position.y = 2.1; head.name = "HEADSHOT";
        const chest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.2), new THREE.MeshLambertMaterial({ color: 0x883333 }));
        chest.position.y = 0.8;
        const legs = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.0), new THREE.MeshLambertMaterial({ color: 0x662222 }));
        legs.position.y = -1.0;
        bot.add(head); bot.add(chest); bot.add(legs);
        bot.position.set((Math.random()-0.5)*30, 15, 35 + (Math.random()-0.5)*20);
        bot.userData = { health: 100, name: 'Bot_'+(i+1), lastShotTime: 0, reactionTime: 800, accuracy: 0.3 };
        scene.add(bot); bots.push(bot);
    }
}

// ==================== TIRO ====================
function shoot() {
    if (isFrozen || isDead || isReloading || currentSlot >= 4 || !currentWeapon || currentWeapon.ammo <= 0) return;
    if (Date.now() - lastShot < currentWeapon.fireRate) return;
    lastShot = Date.now(); currentWeapon.ammo--; updateHUD();
    playSound('shoot');
    
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = ray.intersectObjects(scene.children, true);
    
    if (hits.length > 0) {
        let t = hits[0].object;
        while (t && !t.userData.health) t = t.parent;
        if (t && t.userData.health) {
            let d = currentWeapon.damage;
            if (hits[0].object.name === "HEADSHOT") { d *= 4; playSound('headshot'); }
            t.userData.health -= d;
            if (t.userData.health <= 0) {
                scene.remove(t); bots = bots.filter(b => b !== t);
                money += 300; playerStats.kills++;
                addKillFeed("ELIMINOU", t.userData.name);
                updateHUD();
                if (bots.length === 0) { scoreCT++; nextRound(); }
            }
        }
    }
}

// ==================== DANO ====================
function takeDamage(dmg) {
    if (isDead || godMode) return;
    playerHP -= dmg; updateHUD();
    if (playerHP <= 0) { playerHP = 0; die(); }
}

function die() {
    isDead = true;
    setTimeout(() => {
        playerHP = 100; isDead = false;
        camera.position.set(0, 16, -35);
        money = Math.floor(money * 0.7); updateHUD();
    }, 2000);
}

// ==================== IA ====================
function botAI() {
    if (!isLocked || isFrozen || isDead) return;
    const now = Date.now();
    bots.forEach(bot => {
        const dist = bot.position.distanceTo(camera.position);
        if (dist < 80) {
            bot.lookAt(camera.position);
            if (now - bot.userData.lastShotTime > 1000) {
                bot.userData.lastShotTime = now;
                if (Math.random() < 0.3) takeDamage(10);
            }
        }
    });
}

// ==================== SOM ====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    if (type === 'shoot') { o.type='sawtooth'; o.frequency.value=150; g.gain.setValueAtTime(0.1,audioCtx.currentTime); g.gain.linearRampToValueAtTime(0.01,audioCtx.currentTime+0.05); o.start(); o.stop(audioCtx.currentTime+0.05); }
    if (type === 'headshot') { o.type='square'; o.frequency.value=800; g.gain.setValueAtTime(0.1,audioCtx.currentTime); o.start(); o.stop(audioCtx.currentTime+0.08); }
}

// ==================== HUD ====================
function updateHUD() {
    document.getElementById('hud-money').textContent = '$'+money;
    document.getElementById('hud-hp').textContent = playerHP+' HP';
    const w = document.getElementById('hud-weapon');
    if (currentWeapon) w.textContent = currentWeapon.name+' ['+currentWeapon.ammo+'/'+currentWeapon.reserveAmmo+']';
}

function updateWeaponSlots() {
    const c = document.getElementById('weapon-slots'); if (!c) return;
    c.innerHTML = [1,2,3,4,5].map(k => '<div class="slot'+(currentSlot===k?' active':'')+'">['+k+']</div>').join('');
}

function addKillFeed(k, v) {
    const f = document.getElementById('killfeed'); if (!f) return;
    const d = document.createElement('div'); d.className = 'kill-entry'; d.textContent = k+' '+v;
    f.appendChild(d); setTimeout(() => d.remove(), 2000);
}

// ==================== BOMBA ====================
function plantBomb() {
    if (!hasBomb || bombPlanted || isFrozen || isDead) return;
    bombPlanted = true; hasBomb = false; addKillFeed("C4 PLANTADA", "");
    let s = 40; bombTimer = setInterval(() => { s--; if (s<=0) { clearInterval(bombTimer); scoreT++; nextRound(); } }, 1000);
}

function nextRound() {
    bombPlanted = false; hasBomb = true; round++;
    document.getElementById('hud-round').textContent = round;
    camera.position.set(0, 16, -35); createBots(); money += 3200; playerHP = 100; isDead = false;
    updateHUD(); startFreezeTime();
}

// ==================== COMPRAS ====================
function createBuyMenu() {
    const m = document.getElementById('buy-menu'); if (!m) return;
    m.innerHTML = '<h3>MERCADO (B)</h3><button onclick="buyItem(\'Colete\',650)">Colete $650</button> <button onclick="buyItem(\'Capacete\',350)">Capacete $350</button>';
}

function buyItem(name, price) {
    if (money < price) return; money -= price;
    if (name === 'Colete') playerArmor = 100;
    if (name === 'Capacete') hasHelmet = true;
    updateHUD();
}

// ==================== CONTROLES ====================
function onMouseDown(e) {
    if (!isLocked || isChatOpen || isDead) return;
    if (e.button === 0) { e.preventDefault(); shoot(); }
}

function onKeyDown(e) {
    if (e.key === 'F12') { e.preventDefault(); return; }
    if ((e.key === 't' || e.key === 'T') && !isChatOpen && userType !== 'guest') { isChatOpen = true; return; }
    if (isDead) return;
    if (e.key >= '1' && e.key <= '5') { currentSlot = parseInt(e.key); updateHUD(); return; }
    if (!isFrozen) {
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyA') moveLeft = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyD') moveRight = true;
        if (e.code === 'Space' && canJump) { velocity.y = 8; canJump = false; }
        if (e.code === 'KeyR') {
            if (currentWeapon && currentWeapon.ammo < currentWeapon.maxAmmo && currentWeapon.reserveAmmo > 0) {
                isReloading = true;
                setTimeout(() => {
                    const need = currentWeapon.maxAmmo - currentWeapon.ammo;
                    const avail = Math.min(need, currentWeapon.reserveAmmo);
                    currentWeapon.ammo += avail;
                    currentWeapon.reserveAmmo -= avail;
                    isReloading = false;
                    updateHUD();
                }, currentWeapon.reloadTime || 2500);
            }
        }
        if (e.code === 'KeyB') {
            const m = document.getElementById('buy-menu');
            m.style.display = m.style.display === 'block' ? 'none' : 'block';
        }
    }
    if (e.key === 'f' && hasBomb && !bombPlanted) plantBomb();
}

function onKeyUp(e) {
    if (e.code === 'KeyW') moveForward = false;
    if (e.code === 'KeyA') moveLeft = false;
    if (e.code === 'KeyS') moveBackward = false;
    if (e.code === 'KeyD') moveRight = false;
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==================== CONFIGS ====================
function toggleSettings() {
    const p = document.getElementById('settings-panel');
    if (p) p.style.display = p.style.display === 'block' ? 'none' : 'block';
}

function showSettings() {
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('settings-panel').style.display = 'block';
}

function startGame() {
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('crosshair').style.display = 'none';
    if (!scene) { setTimeout(() => { initGame(); }, 100); }
}

function startFreezeTime() { isFrozen = true; setTimeout(() => { isFrozen = false; }, 5000); }

// ==================== GAME LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = Math.min((time - prevTime) / 1000, 0.1);
    prevTime = time;
    
    if (!isDead && isLocked) {
        // Gravidade
        velocity.y -= 30 * delta;
        
        // Andar
        const speed = 400;
        if (moveForward) camera.position.z -= speed * delta;
        if (moveBackward) camera.position.z += speed * delta;
        if (moveLeft) camera.position.x -= speed * delta;
        if (moveRight) camera.position.x += speed * delta;
        
        // Pulo
        camera.position.y += velocity.y * delta;
        
        // COLISÃO COM O CHÃO
        if (camera.position.y < 15) {
            camera.position.y = 15;
            velocity.y = 0;
            canJump = true;
        }
        
        // Limites
        if (camera.position.x < -44) camera.position.x = -44;
        if (camera.position.x > 44) camera.position.x = 44;
        if (camera.position.z < -44) camera.position.z = -44;
        if (camera.position.z > 44) camera.position.z = 44;
    }
    
    botAI();
    renderer.render(scene, camera);
}

console.log('✅ GAME.JS CARREGADO');
