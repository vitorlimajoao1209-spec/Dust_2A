// ==================== DUST 2 FPS - MOTOR PRINCIPAL ====================

let scene, camera, renderer, controls;
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
    
    // Controles sem PointerLock
   // Troque os controles falsos por:
controls = new THREE.PointerLockControls(camera, document.body);

// E adicione:
controls.addEventListener('lock', function() {
    isLocked = true;
    document.getElementById('crosshair').style.display = 'block';
});

controls.addEventListener('unlock', function() {
    isLocked = false;
    document.getElementById('crosshair').style.display = 'none';
});

// Clique na tela para travar o mouse
document.addEventListener('click', function() {
    if (!isChatOpen && scene) {
        controls.lock();
    }
});
    document.addEventListener('mousemove', function(e) {
        if (isLocked && !isChatOpen && !isDead) {
            camera.rotation.y -= e.movementX * 0.002;
            camera.rotation.x -= e.movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
        }
    });
    
    setupWeapons();
    createMap();
    createBots();
    createBuyMenu();
    updateHUD();
    updateWeaponSlots();
    startFreezeTime();
    setupGameEvents();
    animate();
    
    renderer.render(scene, camera);
    console.log('✅ Jogo iniciado');
}

function setupWeapons() {
    weaponSlots[1] = { name: "AK-47", damage: 35, recoil: 0.05, fireRate: 120, type: "Rifle", ammo: 30, maxAmmo: 30, reserveAmmo: 90, reloadTime: 2500 };
    weaponSlots[2] = { name: "Glock-18", damage: 20, recoil: 0.02, fireRate: 200, type: "Pistol", ammo: 20, maxAmmo: 20, reserveAmmo: 120, reloadTime: 2000 };
    weaponSlots[3] = { name: "Faca", damage: 50, recoil: 0, fireRate: 400, type: "Melee", ammo: 1, maxAmmo: 1, reserveAmmo: 0, reloadTime: 0 };
    weaponSlots[4] = { grenades: true };
    weaponSlots[5] = { hasBomb: true };
    currentWeapon = weaponSlots[1];
    currentSlot = 1;
}

// ==================== MAPA ====================
function createMap() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffeedd, 0.9);
    sun.position.set(80, 120, 80);
    scene.add(sun);
    
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0xd4b896 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 14;
    scene.add(floor);
    mapColliders.push(floor);
    
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xc4a882 });
    const walls = [
        [0, 18, -50, 100, 6, 2], [0, 18, 50, 100, 6, 2],
        [-50, 18, 0, 2, 6, 100], [50, 18, 0, 2, 6, 100],
        [-20, 17, -25, 20, 4, 2], [20, 17, -25, 20, 4, 2],
        [-20, 17, 25, 20, 4, 2], [20, 17, 25, 20, 4, 2],
        [0, 17, -15, 40, 4, 2], [0, 17, 15, 40, 4, 2]
    ];
    walls.forEach(w => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w[3], w[4], w[5]), wallMat);
        wall.position.set(w[0], w[1], w[2]);
        scene.add(wall);
        mapColliders.push(wall);
    });
    
    // Bombsites
    const sA = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.3 }));
    sA.position.set(10, 14.1, 0); scene.add(sA);
    const sB = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.3 }));
    sB.position.set(-10, 14.1, 0); scene.add(sB);
}

// ==================== BOTS ====================
function createBots() {
    bots.forEach(b => scene.remove(b)); bots = [];
    const n = parseInt(localStorage.getItem('botCount') || '5');
    for (let i = 0; i < n; i++) {
        const bot = new THREE.Group();
        bot.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshLambertMaterial({ color: 0xcc6666 }))).position.y = 2.1;
        bot.children[0].name = "HEADSHOT";
        bot.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.2), new THREE.MeshLambertMaterial({ color: 0x883333 }))).position.y = 0.8;
        bot.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.0), new THREE.MeshLambertMaterial({ color: 0x662222 }))).position.y = -1.0;
        bot.position.set((Math.random()-0.5)*20, 15, 35 + (Math.random()-0.5)*20);
        bot.userData = { health: 100, name: 'Bot_'+(i+1), lastShotTime: 0, reactionTime: 800+Math.random()*1200, accuracy: 0.3 };
        scene.add(bot); bots.push(bot);
    }
}

// ==================== TIRO ====================
function shoot() {
    if (isFrozen || isDead || isReloading || currentSlot >= 4 || !currentWeapon || currentWeapon.ammo <= 0) return;
    if (Date.now() - lastShot < currentWeapon.fireRate) return;
    lastShot = Date.now(); currentWeapon.ammo--; updateHUD();
    playSound('shoot'); camera.rotation.x -= currentWeapon.recoil * 0.5;
    
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = ray.intersectObjects(scene.children, true);
    
    if (hits.length > 0) {
        let t = hits[0].object;
        while (t && !t.userData.health) t = t.parent;
        if (t && t.userData.health) {
            let d = currentWeapon.damage;
            if (hits[0].object.name === "HEADSHOT") { d *= 4; playSound('headshot'); playerStats.headshots++; }
            t.userData.health -= d;
            if (t.userData.health <= 0) { scene.remove(t); bots = bots.filter(b => b !== t); money += 300; playerStats.kills++; addKillFeed("ELIMINOU", t.userData.name); updateHUD(); if (bots.length === 0) { scoreCT++; nextRound(); } }
        }
    }
}

function takeDamage(dmg) {
    if (isDead || godMode) return;
    if (playerArmor > 0) { const ad = Math.floor(dmg * (hasHelmet ? 0.7 : 0.5)); if (playerArmor >= ad) { playerArmor -= ad; dmg -= ad; } else { dmg -= playerArmor; playerArmor = 0; } }
    playerHP -= Math.floor(dmg); updateHUD(); updateHealthBars();
    if (playerHP <= 0) { playerHP = 0; die(); }
}

function die() {
    isDead = true; playerStats.deaths++;
    setTimeout(() => { playerHP = 100; playerArmor = 0; isDead = false; camera.position.set(0, 16, -35); money = Math.floor(money * 0.7); updateHUD(); updateHealthBars(); }, 2500);
}

// ==================== IA ====================
function botAI() {
    if (!isLocked || isFrozen || isDead) return;
    const now = Date.now();
    bots.forEach(bot => {
        const dist = bot.position.distanceTo(camera.position);
        if (dist < 100) {
            const ray = new THREE.Raycaster();
            const dir = new THREE.Vector3().subVectors(camera.position, bot.position).normalize();
            ray.set(bot.position, dir);
            if (ray.intersectObjects(mapColliders, true).length === 0) {
                bot.lookAt(camera.position);
                if (now - bot.userData.lastShotTime > bot.userData.reactionTime) {
                    bot.userData.lastShotTime = now;
                    if (Math.random() < bot.userData.accuracy) takeDamage(8 + Math.floor(Math.random()*15));
                }
            }
        }
    });
}

// ==================== AUDIO ====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    if (type === 'shoot') { o.type='sawtooth'; o.frequency.value=150; g.gain.setValueAtTime(0.2,audioCtx.currentTime); g.gain.linearRampToValueAtTime(0.01,audioCtx.currentTime+0.08); o.start(); o.stop(audioCtx.currentTime+0.08); }
    if (type === 'headshot') { o.type='square'; o.frequency.value=800; g.gain.setValueAtTime(0.15,audioCtx.currentTime); g.gain.linearRampToValueAtTime(0.01,audioCtx.currentTime+0.1); o.start(); o.stop(audioCtx.currentTime+0.1); }
}

// ==================== HUD ====================
function updateHUD() {
    document.getElementById('hud-money').textContent = '$'+money;
    document.getElementById('hud-hp').textContent = playerHP+' HP';
    const w = document.getElementById('hud-weapon');
    if (currentSlot === 4) w.textContent = 'GRANADA ['+selectedGrenadeType+']';
    else if (currentSlot === 5) w.textContent = hasBomb?'C4 [DISP]':'C4 [PLANT]';
    else if (currentWeapon) w.textContent = currentWeapon.name+' ['+currentWeapon.ammo+'/'+currentWeapon.reserveAmmo+']';
    updateHealthBars(); updateWeaponSlots();
}

function updateHealthBars() {
    document.getElementById('health-bar').style.width = playerHP+'%';
    document.getElementById('health-text').textContent = playerHP;
    document.getElementById('armor-bar').style.width = playerArmor+'%';
    document.getElementById('armor-text').textContent = playerArmor;
}

function updateWeaponSlots() {
    const c = document.getElementById('weapon-slots'); if (!c) return;
    c.innerHTML = [1,2,3,4,5].map(k => {
        let n = k===4?'GREN':k===5?(hasBomb?'C4':'---'):(weaponSlots[k]?weaponSlots[k].name.substring(0,4).toUpperCase():'---');
        return '<div class="slot'+(currentSlot===k?' active':'')+'">['+k+'] '+n+'</div>';
    }).join('');
}

function addKillFeed(k, v) {
    const f = document.getElementById('killfeed'); if (!f) return;
    const d = document.createElement('div'); d.className = 'kill-entry'; d.textContent = k+' '+v;
    f.appendChild(d); setTimeout(() => d.remove(), 3000);
    while (f.children.length > 4) f.removeChild(f.firstChild);
}

// ==================== BOMBA ====================
function plantBomb() {
    if (!hasBomb || bombPlanted || isFrozen || isDead) return;
    bombPlanted = true; hasBomb = false; addKillFeed("C4 PLANTADA", "");
    let s = 40; bombTimer = setInterval(() => { s--; if (s<=0) { clearInterval(bombTimer); scoreT++; nextRound(); } }, 1000);
    updateHUD();
}

function nextRound() {
    bombPlanted = false; hasBomb = true; round++;
    document.getElementById('hud-round').textContent = round;
    camera.position.set(0, 16, -35); createBots(); money += 3200; playerHP = 100; playerArmor = 0; isDead = false;
    if (currentWeapon) currentWeapon.ammo = currentWeapon.maxAmmo;
    updateHUD(); startFreezeTime();
}

// ==================== COMPRAS ====================
function createBuyMenu() {
    const m = document.getElementById('buy-menu'); if (!m) return;
    let h = '<h3>MERCADO (B)</h3>';
    const cats = { pistols: WEAPONS.pistols, smgs: WEAPONS.smgs, rifles: WEAPONS.rifles, gear: WEAPONS.gear };
    for (const cat in cats) {
        h += '<b>'+cat.toUpperCase()+'</b><br>';
        cats[cat].forEach(i => { h += '<button onclick="buyItem(\''+i.name+'\','+i.price+',\''+cat+'\')">'+i.name+' $'+i.price+'</button> '; });
        h += '<br><br>';
    }
    m.innerHTML = h;
}

function buyItem(name, price, cat) {
    if (money < price) return; money -= price;
    const item = WEAPONS[cat].find(i => i.name === name); if (!item) return;
    if (cat === 'pistols') { weaponSlots[2] = item; if (currentSlot===2) currentWeapon = weaponSlots[2]; }
    else if (cat === 'rifles' || cat === 'smgs') { weaponSlots[1] = item; if (currentSlot===1) currentWeapon = weaponSlots[1]; }
    else if (item.name === 'Colete') playerArmor = 100;
    else if (item.name === 'Capacete') hasHelmet = true;
    updateHUD();
}

// ==================== MOVIMENTO ====================
function onMouseDown(e) { if (!isLocked || isChatOpen || isDead) return; if (e.button === 0) { e.preventDefault(); shoot(); } }

function onKeyDown(e) {
    if (e.key === 'F12') { e.preventDefault(); return; }
    if ((e.key === 't' || e.key === 'T') && !isChatOpen && userType !== 'guest') { e.preventDefault(); toggleChat(); return; }
    if (isChatOpen) { if (e.key === 'Enter') { sendChat(); } return; }
    if (isDead) return;
    if (e.key >= '1' && e.key <= '5') { currentSlot = parseInt(e.key); if (currentSlot <= 3) currentWeapon = weaponSlots[currentSlot]; else currentWeapon = null; updateHUD(); return; }
    if (!isFrozen) {
        switch(e.code) { case 'KeyW': moveForward = true; break; case 'KeyA': moveLeft = true; break; case 'KeyS': moveBackward = true; break; case 'KeyD': moveRight = true; break; case 'Space': if (canJump) { velocity.y += 100; canJump = false; } break; case 'KeyR': reload(); break; case 'KeyB': document.getElementById('buy-menu').style.display = document.getElementById('buy-menu').style.display==='block'?'none':'block'; break; }
    }
    if (e.key === 'f' && hasBomb && !bombPlanted) plantBomb();
}

function onKeyUp(e) { switch(e.code) { case 'KeyW': moveForward = false; break; case 'KeyA': moveLeft = false; break; case 'KeyS': moveBackward = false; break; case 'KeyD': moveRight = false; break; } }
function onResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

function reload() {
    if (!currentWeapon || currentWeapon.ammo >= currentWeapon.maxAmmo || currentWeapon.reserveAmmo <= 0) return;
    isReloading = true;
    setTimeout(() => { const need = currentWeapon.maxAmmo - currentWeapon.ammo; const avail = Math.min(need, currentWeapon.reserveAmmo); currentWeapon.ammo += avail; currentWeapon.reserveAmmo -= avail; isReloading = false; updateHUD(); }, currentWeapon.reloadTime || 2500);
}

// ==================== CHAT ====================
function toggleChat() {
    isChatOpen = !isChatOpen;
    const inp = document.getElementById('chat-input');
    if (isChatOpen) { document.getElementById('chat-box').style.display='flex'; inp.style.display='block'; inp.focus(); if(isLocked) controls.unlock(); }
    else { document.getElementById('chat-box').style.display='none'; inp.style.display='none'; inp.value=''; if(!isLocked) controls.lock(); }
}

function sendChat() {
    const inp = document.getElementById('chat-input'); const msg = inp.value.trim();
    if (!msg) { toggleChat(); return; }
    const d = document.createElement('div'); d.className = 'chat-msg player'; d.textContent = (currentUser?.nome||'Player')+': '+msg;
    document.getElementById('chat-box').appendChild(d); inp.value = ''; toggleChat();
}

// ==================== CONFIGS ====================
function toggleSettings() { const p = document.getElementById('settings-panel'); if (p) p.style.display = p.style.display === 'block' ? 'none' : 'block'; }
function showSettings() { document.getElementById('menu-screen').classList.remove('active'); document.getElementById('game-screen').classList.add('active'); document.getElementById('settings-panel').style.display = 'block'; if (isLocked) controls.unlock(); }

// ==================== START ====================
function startGame() {
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('crosshair').style.display = 'none';
    if (!scene) { setTimeout(() => { initGame(); }, 100); }
}

function startFreezeTime() { isFrozen = true; setTimeout(() => { isFrozen = false; }, 5000); }

function setupGameEvents() {
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
}

// ==================== GAME LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = Math.min((time - prevTime) / 1000, 0.1);
    prevTime = time;
    
    if (!isDead && isLocked) {
        velocity.x -= velocity.x * 10 * delta;
        velocity.z -= velocity.z * 10 * delta;
        velocity.y -= 9.8 * 30 * delta;
        const speed = 400;
        if (moveForward || moveBackward || moveLeft || moveRight) {
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize();
            velocity.z -= direction.z * speed * delta;
            velocity.x -= direction.x * speed * delta;
        }
        const oldPos = camera.position.clone();
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        controls.getObject().position.y += velocity.y * delta;
        if (controls.getObject().position.y < 14) { velocity.y = 0; controls.getObject().position.y = 14; canJump = true; }
    }
    
    botAI();
    if (camera.rotation.x < 0) camera.rotation.x *= 0.9;
    renderer.render(scene, camera);
}

console.log('✅ Game carregado');
