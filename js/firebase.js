// ==================== CONEXÃO FIREBASE ====================

const firebaseConfig = {
    apiKey: "AIzaSyBQSWS0XV86yp5IDrZ2lrmAoR52g9ds1OM",
    authDomain: "dust2a.firebaseapp.com",
    databaseURL: "https://dust2a-default-rtdb.firebaseio.com",
    projectId: "dust2a",
    storageBucket: "dust2a.firebasestorage.app",
    messagingSenderId: "727404443009",
    appId: "1:727404443009:web:4dd0e134e8f140b21a6480",
    measurementId: "G-VNBK0SHY0V"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ==================== AUTENTICAÇÃO ====================

// Registrar com email
function registerWithEmail(name, email, password) {
    return auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            db.ref('users/' + user.uid).set({
                nome: name,
                email: email,
                admin: false,
                criado: Date.now()
            });
            return user;
        });
}

// Login com email
function loginWithEmail(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

// Verificar admin
function checkAdmin(email) {
    return email === 'vitor.lima.joao1209@escola.pr.gov.br';
}

// Enviar código admin
function sendAdminCodeEmail(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const emailKey = email.replace(/\./g, '_');
    
    db.ref('adminCodes/' + emailKey).set({
        code: code,
        expires: Date.now() + 300000
    });
    
    console.log('========================================');
    console.log('📧 CÓDIGO ADMIN: ' + code);
    console.log('📧 Email: ' + email);
    console.log('⏰ Expira em 5 minutos');
    console.log('========================================');
    
    return code;
}

// Verificar código admin
async function verifyAdminCode(email, code) {
    const emailKey = email.replace(/\./g, '_');
    const snapshot = await db.ref('adminCodes/' + emailKey).once('value');
    const data = snapshot.val();
    
    if (data && data.code === code && Date.now() < data.expires) {
        db.ref('adminCodes/' + emailKey).remove();
        return true;
    }
    return false;
}

// ==================== MULTIPLAYER ====================

function createRoom(code, mode, maxBots) {
    return db.ref('rooms/' + code).set({
        code: code,
        mode: mode,
        maxBots: maxBots,
        status: 'waiting',
        createdAt: Date.now(),
        players: {}
    });
}

function joinRoom(code, playerData) {
    const playerRef = db.ref('rooms/' + code + '/players/' + playerData.id);
    playerRef.set(playerData);
    playerRef.onDisconnect().remove();
    return playerRef;
}

function syncPosition(roomCode, playerId, position) {
    db.ref('rooms/' + roomCode + '/players/' + playerId + '/position').set({
        x: position.x,
        y: position.y,
        z: position.z,
        rotation: position.rotation
    });
}

function listenRoom(roomCode, callback) {
    db.ref('rooms/' + roomCode + '/players').on('value', (snapshot) => {
        callback(snapshot.val() || {});
    });
}

function leaveRoom(roomCode, playerId) {
    db.ref('rooms/' + roomCode + '/players/' + playerId).remove();
}

function deleteRoom(roomCode) {
    db.ref('rooms/' + roomCode).remove();
}

// ==================== BANIMENTOS ====================

function banPlayer(name, days) {
    db.ref('bans/' + name.toLowerCase()).set({
        nome: name,
        dias: days,
        data: days > 0 ? Date.now() + days * 86400000 : 0,
        banidoEm: Date.now()
    });
}

async function checkBan(name) {
    const snapshot = await db.ref('bans/' + name.toLowerCase()).once('value');
    const ban = snapshot.val();
    if (ban) {
        if (ban.dias === 0 || Date.now() < ban.data) {
            return true; // Banido
        } else {
            db.ref('bans/' + name.toLowerCase()).remove();
        }
    }
    return false;
}

console.log('🔥 Firebase carregado com sucesso!');
