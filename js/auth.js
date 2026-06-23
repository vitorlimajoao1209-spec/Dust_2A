// ==================== SISTEMA DE AUTENTICACAO ====================

const DEFAULT_USERS = {
    "admin": {
        "nome": "ADMIN",
        "email": "vitor.lima.joao1209@escola.pr.gov.br",
        "senha": "admin123",
        "admin": true,
        "criado": "2024-01-01"
    }
};

let users = JSON.parse(localStorage.getItem('dust2_users')) || DEFAULT_USERS;

if (!localStorage.getItem('dust2_users')) {
    localStorage.setItem('dust2_users', JSON.stringify(users));
}

let currentUser = null;
let userType = null;
let adminCodeSent = null;

// ==================== TROCAR ABAS ====================
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('player-form').style.display = tab === 'player' ? 'flex' : 'none';
    document.getElementById('guest-form').style.display = tab === 'guest' ? 'flex' : 'none';
}

// ==================== MOSTRAR/ESCONDER ====================
function showRegister() {
    document.getElementById('login-step-1').style.display = 'none';
    document.getElementById('register-step').style.display = 'block';
}

function showLogin() {
    document.getElementById('login-step-1').style.display = 'block';
    document.getElementById('register-step').style.display = 'none';
    document.getElementById('admin-code-section').style.display = 'none';
}

function showError(msg) {
    const el = document.getElementById('login-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 3000); }
}

function showSuccess(msg) {
    const el = document.getElementById('login-success');
    if (el) { el.textContent = msg; el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 3000); }
}

// ==================== REGISTRO ====================
function registerPlayer() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const conf = document.getElementById('reg-confirm').value;
    
    if (!name || !email || !pass) { showError('Preencha todos os campos'); return; }
    if (pass !== conf) { showError('Senhas nao conferem'); return; }
    if (pass.length < 6) { showError('Senha minimo 6 caracteres'); return; }
    if (users[name.toLowerCase()]) { showError('Nome ja em uso'); return; }
    
    // Firebase
    if (typeof auth !== 'undefined') {
        auth.createUserWithEmailAndPassword(email, pass)
            .then((userCredential) => {
                const user = userCredential.user;
                user.sendEmailVerification();
                db.ref('users/' + user.uid).set({
                    nome: name, email: email, admin: false, criado: Date.now()
                });
                showSuccess('Conta criada! Verifique seu email.');
                setTimeout(showLogin, 2000);
            })
            .catch((error) => { showError(error.message); });
    } else {
        // Offline
        users[name.toLowerCase()] = { nome: name, email: email, senha: pass, admin: false, criado: new Date().toISOString() };
        localStorage.setItem('dust2_users', JSON.stringify(users));
        showSuccess('Conta criada! Faca login.');
        setTimeout(showLogin, 1500);
    }
}

// ==================== LOGIN PLAYER ====================
function loginPlayer() {
    const email = document.getElementById('player-email').value.trim();
    const pass = document.getElementById('player-password').value;
    
    if (!email || !pass) { showError('Preencha email e senha'); return; }
    
    if (email === 'vitor.lima.joao1209@escola.pr.gov.br') {
        sendAdminCode(email);
        return;
    }
    
    // Firebase
    if (typeof auth !== 'undefined') {
        auth.signInWithEmailAndPassword(email, pass)
            .then((userCredential) => {
                const user = userCredential.user;
                db.ref('users/' + user.uid).once('value').then((snap) => {
                    currentUser = snap.val();
                    currentUser.uid = user.uid;
                    userType = 'player';
                    showMenu('player');
                });
            })
            .catch(() => { showError('Email ou senha incorretos'); });
    } else {
        // Offline
        const user = Object.values(users).find(u => u.email === email);
        if (!user) { showError('Email nao encontrado'); return; }
        if (user.senha !== pass) { showError('Senha incorreta'); return; }
        currentUser = user;
        userType = 'player';
        showMenu('player');
    }
}

// ==================== LOGIN GOOGLE ====================
function loginWithGoogle() {
    if (typeof auth === 'undefined') { showError('Firebase nao conectado'); return; }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            db.ref('users/' + user.uid).once('value').then((snap) => {
                if (!snap.val()) {
                    db.ref('users/' + user.uid).set({
                        nome: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        foto: user.photoURL || '',
                        admin: false,
                        criado: Date.now()
                    });
                }
            });
            
            if (user.email === 'vitor.lima.joao1209@escola.pr.gov.br') {
                sendAdminCode(user.email);
                return;
            }
            
            currentUser = {
                nome: user.displayName || user.email.split('@')[0],
                email: user.email,
                foto: user.photoURL || '',
                uid: user.uid
            };
            userType = 'player';
            showMenu('player');
        })
        .catch(() => { showError('Erro no login com Google'); });
}

// ==================== CONVIDADO ====================
function loginGuest() {
    const names = ['Convidado_Alpha', 'Convidado_Bravo', 'Convidado_Charlie'];
    currentUser = { nome: names[Math.floor(Math.random() * 3)] + '_' + Math.floor(Math.random() * 100), tipo: 'guest' };
    userType = 'guest';
    showMenu('guest');
}

// ==================== ADMIN ====================
function sendAdminCode(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    adminCodeSent = code;
    
    if (typeof db !== 'undefined') {
        const emailKey = email.replace(/\./g, '_');
        db.ref('adminCodes/' + emailKey).set({ code: code, expires: Date.now() + 300000 });
    }
    
    console.log('========================================');
    console.log('CODIGO ADMIN: ' + code);
    console.log('Email: ' + email);
    console.log('========================================');
    
    document.getElementById('login-step-1').style.display = 'none';
    document.getElementById('admin-code-section').style.display = 'block';
    document.getElementById('admin-email-display').textContent = email;
    showSuccess('Codigo enviado! (Ver console)');
}

async function verifyAdminCode() {
    const code = document.getElementById('admin-code-input').value.trim();
    
    if (code === adminCodeSent) {
        setAdmin();
        return;
    }
    
    if (typeof db !== 'undefined') {
        const email = 'vitor.lima.joao1209@escola.pr.gov.br';
        const emailKey = email.replace(/\./g, '_');
        const snap = await db.ref('adminCodes/' + emailKey).once('value');
        const data = snap.val();
        if (data && data.code === code && Date.now() < data.expires) {
            db.ref('adminCodes/' + emailKey).remove();
            setAdmin();
            return;
        }
    }
    
    showError('Codigo incorreto!');
}

function setAdmin() {
    currentUser = { nome: 'ADMIN', email: 'vitor.lima.joao1209@escola.pr.gov.br', tipo: 'admin' };
    userType = 'admin';
    adminCodeSent = null;
    document.getElementById('admin-code-section').style.display = 'none';
    document.getElementById('login-step-1').style.display = 'block';
    showMenu('admin');
}

// ==================== EXCLUIR CONTA ====================
function deleteAccount() {
    if (!currentUser || userType === 'guest') return;
    const confirmName = prompt('Digite seu nome para confirmar exclusao:');
    if (confirmName === currentUser.nome) {
        if (typeof db !== 'undefined' && currentUser.uid) {
            db.ref('users/' + currentUser.uid).remove();
        }
        delete users[currentUser.nome.toLowerCase()];
        localStorage.setItem('dust2_users', JSON.stringify(users));
        alert('Conta excluida!');
        logout();
    } else {
        alert('Nome incorreto!');
    }
}

// ==================== MENU ====================
function showMenu(type) {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
    
    document.getElementById('admin-menu').style.display = (type === 'admin') ? 'block' : 'none';
    document.getElementById('player-menu').style.display = (type === 'player') ? 'block' : 'none';
    document.getElementById('guest-menu').style.display = (type === 'guest') ? 'block' : 'none';
    
    if (type === 'admin') document.getElementById('admin-name-display').textContent = 'ADMIN';
    if (type === 'player') document.getElementById('player-name-display').textContent = currentUser.nome;
    if (type === 'guest') document.getElementById('guest-name-display').textContent = currentUser.nome;
}

// ==================== LOGOUT ====================
function logout() {
    currentUser = null;
    userType = null;
    adminCodeSent = null;
    
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
    
    document.getElementById('login-step-1').style.display = 'block';
    document.getElementById('register-step').style.display = 'none';
    document.getElementById('admin-code-section').style.display = 'none';
    document.getElementById('player-email').value = '';
    document.getElementById('player-password').value = '';
}

// ==================== BOTS ====================
function showBotsMenu() {
    const c = prompt('QUANTOS BOTS? (1-20):', '5');
    if (c && !isNaN(c)) {
        localStorage.setItem('botCount', c);
        alert('BOTS: ' + c);
    }
}

function showBanMenu() {
    alert('Banidos: Use o console Firebase para gerenciar.');
}

// ==================== SALAS ====================
function createRoomMenu() { document.getElementById('create-room-form').style.display = 'block'; }
function joinRoomMenu() { const c = prompt('CODIGO DA SALA:'); if (c) { localStorage.setItem('roomCode', c); startGame(); } }
function hideCreateRoom() { document.getElementById('create-room-form').style.display = 'none'; }

function confirmCreateRoom() {
    const code = document.getElementById('room-code-create').value.trim();
    const mode = document.getElementById('room-mode-create').value;
    const bots = document.getElementById('room-bots-create').value;
    if (code && typeof db !== 'undefined') {
        createRoom(code, mode, bots);
        alert('Sala ' + code + ' criada!');
    }
    hideCreateRoom();
    startGame();
}

console.log('✅ Auth carregado');
