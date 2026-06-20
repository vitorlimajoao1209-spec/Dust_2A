// ==================== CONFIGURAÇÕES DO JOGO ====================

// Email do Admin (detectado automaticamente)
const ADMIN_EMAIL = 'vitor.lima.joao1209@escola.pr.gov.br';

// Coordenadas do mapa
const CHECKPOINTS = {
    TR_SPAWN: { x: 0, y: 16, z: -35 },
    CT_SPAWN: { x: 0, y: 16, z: 35 },
    BOMB_A: { x: 10, y: 14, z: 0 },
    BOMB_B: { x: -10, y: 14, z: 0 }
};

// Arsenal de armas
const WEAPONS = {
    pistols: [
        { name: "Glock-18", price: 200, dmg: 20, recoil: 0.02, rate: 200, ammo: 20, max: 20, res: 120, reload: 2000 },
        { name: "USP-S", price: 200, dmg: 22, recoil: 0.015, rate: 200, ammo: 12, max: 12, res: 24, reload: 2000 },
        { name: "Desert Eagle", price: 700, dmg: 53, recoil: 0.09, rate: 400, ammo: 7, max: 7, res: 35, reload: 2200 }
    ],
    smgs: [
        { name: "MAC-10", price: 1050, dmg: 20, recoil: 0.04, rate: 75, ammo: 30, max: 30, res: 120, reload: 2100 },
        { name: "P90", price: 2350, dmg: 20, recoil: 0.025, rate: 65, ammo: 50, max: 50, res: 100, reload: 2300 }
    ],
    rifles: [
        { name: "AK-47", price: 2700, dmg: 35, recoil: 0.05, rate: 120, ammo: 30, max: 30, res: 90, reload: 2500 },
        { name: "M4A4", price: 3100, dmg: 33, recoil: 0.04, rate: 110, ammo: 30, max: 30, res: 90, reload: 2500 },
        { name: "AWP", price: 4750, dmg: 115, recoil: 0.20, rate: 1000, ammo: 10, max: 10, res: 30, reload: 3000 }
    ],
    gear: [
        { name: "Faca", price: 0, type: "melee" },
        { name: "Colete", price: 650, type: "armor" },
        { name: "Capacete", price: 350, type: "helmet" },
        { name: "HE Grenade", price: 300, type: "grenade" },
        { name: "Flashbang", price: 200, type: "grenade" },
        { name: "Smoke", price: 300, type: "grenade" }
    ]
};

// Configurações padrão
const DEFAULT_SETTINGS = {
    sensitivity: 0.5,
    music: true,
    radio: true,
    crosshair: 'cross',
    crosshairColor: '#00ff00'
};
