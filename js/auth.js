// ==================== SISTEMA DE AUTENTICAÇÃO ====================

// Carregar usuários
let users = {};

fetch('data/users.json')
    .then(res => res.json())
    .then(data => { users = data; })
    .catch(() => { users = {}; });

// Variáveis de sessão
let currentUser = null;
let userType = null; // 'player', 'admin', 'guest'
let adminCodeSent = null;

// ==================== TROCAR ABAS ====================
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('player-form').style.display = tab === 'player' ? 'flex' : 'none';
    document.getElementById('guest-form').style.display = tab === 'guest' ? 'flex' : 'none';
}

// ==================== MOSTRAR/ESCONDER TELAS ====================
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
    if (pass !== conf) { showError('Senhas não conferem'); return; }
    if (pass.length < 6) { showError('Senha mínimo 6 caracteres'); return; }
    
    // Verificar se já existe
    if (users[name.toLowerCase()]) { showError('Nome já em uso'); return; }
    
    // Salvar no objeto
    users[name.toLowerCase()] = {
        nome: name,
        email: email,
        senha: pass,
        admin: false,
        criado: new Date().toISOString()
    };
    
    // Salvar no localStorage
    saveUsers();
    
    showSuccess('Conta criada! Faça login.');
    setTimeout(showLogin, 1500);
}

// ==================== LOGIN PLAYER ====================
function loginPlayer() {
    const email = document.getElementById('player-email').value.trim();
    const pass = document.getElementById('player-password').value;
    
    if (!email || !pass) { showError('Preencha email e senha'); return; }
    
    // Verificar se é o email admin
    if (email === ADMIN_EMAIL) {
        // Modo admin: enviar código
        sendAdminCode(email);
        return;
    }
    
    // Buscar usuário
    const user = Object.values(users).find(u => u.email === email);
    
    if (!user) { showError('Email não encontrado'); return; }
    if (user.senha !== pass) { showError('Senha incorreta'); return; }
    
    // Login normal
    currentUser = user;
    userType = 'player';
    showMenu('player');
}

// ==================== LOGIN CONVIDADO ====================
function loginGuest() {
    const names = ['Convidado_Alpha', 'Convidado_Bravo', 'Convidado_Charlie'];
    currentUser = {
        nome: names[Math.floor(Math.random() * 3)] + '_' + Math.floor(Math.random() * 100),
        tipo: 'guest'
    };
    userType = 'guest';
    showMenu('guest');
}

// ==================== ADMIN - ENVIAR CÓDIGO ====================
function sendAdminCode(email) {
    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    adminCodeSent = code;
    
    // Mostrar no console (simula envio de email)
    console.log('========================================');
    console.log('📧 CÓDIGO ADMIN: ' + code);
    console.log('📧 Email: ' + email);
    console.log('⏰ Expira em 5 minutos');
    console.log('========================================');
    
    // Mostrar tela de código
    document.getElementById('login-step-1').style.display = 'none';
    document.getElementById('admin-code-section').style.display = 'block';
    document.getElementById('admin-email-display').textContent = email;
    
    showSuccess('Código enviado! (Ver console)');
}

// ==================== ADMIN - VERIFICAR CÓDIGO ====================
function verifyAdminCode() {
    const code = document.getElementById('admin-code-input').value.trim();
    
    if (code === adminCodeSent) {
        // Admin logado!
        currentUser = {
            nome: 'ADMIN',
            email: ADMIN_EMAIL,
            tipo: 'admin'
        };
        userType = 'admin';
        adminCodeSent = null;
        
        document.getElementById('admin-code-section').style.display = 'none';
        document.getElementById('login-step-1').style.display = 'block';
        
        showMenu('admin');
    } else {
        showError('Código incorreto!');
    }
}

// ==================== EXCLUIR CONTA ====================
function deleteAccount() {
    if (!currentUser || userType === 'guest') return;
    
    const confirmName = prompt('Digite seu nome para confirmar exclusão:');
    
    if (confirmName === currentUser.nome) {
        const key = currentUser.nome.toLowerCase();
        delete users[key];
        saveUsers();
        alert('Conta excluída com sucesso!');
        logout();
    } else {
        alert('Nome incorreto!');
    }
}

// ==================== MOSTRAR MENU ====================
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

// ==================== SALVAR USUÁRIOS ====================
function saveUsers() {
    localStorage.setItem('dust2_users', JSON.stringify(users));
}

// ==================== CARREGAR USUÁRIOS AO INICIAR ====================
function loadUsers() {
    const saved = localStorage.getItem('dust2_users');
    if (saved) {
        users = JSON.parse(saved);
    }
    
    // Também carrega do arquivo JSON
    fetch('data/users.json')
        .then(res => res.json())
        .then(data => {
            // Mesclar sem sobrescrever localStorage
            for (const key in data) {
                if (!users[key]) {
                    users[key] = data[key];
                }
            }
            saveUsers();
        })
        .catch(() => {});
}

// Inicializar
loadUsers();
console.log('✅ Sistema de autenticação carregado');
