// ゲームの設定
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const stageEl = document.getElementById("stage");
const fuelEl = document.getElementById("fuel");
const startMessage = document.getElementById("startMessage");

// ゲームの基本設定
const CONFIG = {
    carSpeed: 3,           // 車の速度
    fuelDecrease: 0.03,    // 燃料の減少速度
    fuelGain: 20,          // 燃料アイテム取得時の回復量
    stageDistance: 2000,   // ステージクリアまでの距離
    stageIncrement: 500,   // 次のステージまでの追加距離
    initialLives: 3,       // 初期ライフ
    carSize: {w: 40, h: 60},     // 車のサイズ
    fuelSize: {w: 20, h: 20},    // 燃料アイテムのサイズ
    finalStage: 5          // 最終ステージ
};

// ステージごとの背景テーマ
const stageThemes = [
    {road: "#444", bg: "#228B22"},   // ステージ1: 森
    {road: "#C2B280", bg: "#EDC9AF"}, // ステージ2: 砂漠
    {road: "#DDD", bg: "#FFF"},       // ステージ3: 雪
    {road: "#222", bg: "#000"},       // ステージ4: 夜
    {road: "#444", bg: "#228B22"}     // ステージ5: 森
];

// コントロール用の変数
let leftPressed = false;
let rightPressed = false;

// キーボード操作
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") leftPressed = true;
    if (e.key === "ArrowRight") rightPressed = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") leftPressed = false;
    if (e.key === "ArrowRight") rightPressed = false;
});

// タッチ操作（スマホ用）
document.getElementById("btnLeft").addEventListener("touchstart", (e) => {
    e.preventDefault();
    leftPressed = true;
});

document.getElementById("btnRight").addEventListener("touchstart", (e) => {
    e.preventDefault();
    rightPressed = true;
});

document.getElementById("btnLeft").addEventListener("touchend", (e) => {
    e.preventDefault();
    leftPressed = false;
});

document.getElementById("btnRight").addEventListener("touchend", (e) => {
    e.preventDefault();
    rightPressed = false;
});

// プレイヤーの車クラス
class Car {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = CONFIG.carSize.w;
        this.h = CONFIG.carSize.h;
        this.invincible = false;  // 無敵状態
    }

    update() {
        // 左右移動
        if (leftPressed) this.x -= CONFIG.carSpeed;
        if (rightPressed) this.x += CONFIG.carSpeed;
        
        // 道路の範囲内に制限
        if (this.x < 60) this.x = 60;
        if (this.x + this.w > 260) this.x = 260 - this.w;
        
        // 移動中はエンジン音を再生
        if (leftPressed || rightPressed) {
            if (Math.random() < 0.3) { // 30%の確率でエンジン音
                soundSystem.playEngineSound();
            }
        }
    }

    draw() {
        // 無敵時は点滅表示
        if (this.invincible && Math.floor(Date.now() / 100) % 2) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        } else {
            ctx.fillStyle = "red";
        }
        
        // 車体
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        // 窓
        ctx.fillStyle = "skyblue";
        ctx.fillRect(this.x + 8, this.y + 5, this.w - 16, 15);
        
        // タイヤ
        ctx.fillStyle = "black";
        ctx.fillRect(this.x - 6, this.y + 5, 6, 15);
        ctx.fillRect(this.x + this.w, this.y + 5, 6, 15);
        ctx.fillRect(this.x - 6, this.y + this.h - 20, 6, 15);
        ctx.fillRect(this.x + this.w, this.y + this.h - 20, 6, 15);
    }

    resetPosition() {
        this.x = 140;
        this.y = 380;
    }
}

// 燃料アイテムクラス
class Fuel {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = CONFIG.fuelSize.w;
        this.h = CONFIG.fuelSize.h;
    }

    update() {
        this.y += game.speed;
    }

    draw() {
        ctx.fillStyle = "lime";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        // 燃料マークを描画
        ctx.fillStyle = "darkgreen";
        ctx.fillRect(this.x + 8, this.y + 2, 4, 16);
        ctx.fillRect(this.x + 5, this.y + 5, 10, 3);
    }
}

// 敵車クラス
class Enemy {
    constructor(x, y, type, speed, pattern = "straight") {
        this.type = type;
        this.pattern = pattern;
        this.x = x;
        this.y = y;
        this.dir = 1;
        this.counter = 0;
        
        // タイプ別の設定
        if (type === "truck") {
            this.w = 60;
            this.h = 100;
            this.color = "gray";
            this.speed = speed - 1;
        } else if (type === "fast") {
            this.w = 40;
            this.h = 60;
            this.color = "yellow";
            this.speed = speed + 2;
        } else {
            this.w = 40;
            this.h = 60;
            this.color = "blue";
            this.speed = speed;
        }
    }

    update() {
        this.y += this.speed;
        
        // 移動パターン
        if (this.pattern === "zigzag") {
            this.x += Math.sin(this.y / 30) * 2;
        } else if (this.pattern === "swerve") {
            this.counter++;
            if (this.counter % 60 === 0) this.dir *= -1;
            this.x += this.dir * 2;
            
            // 道路の範囲内に制限
            if (this.x < 60) this.x = 60;
            if (this.x + this.w > 260) this.x = 260 - this.w;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        // 窓を描画
        ctx.fillStyle = "lightblue";
        ctx.fillRect(this.x + 8, this.y + this.h - 20, this.w - 16, 15);
    }
}

// ゲームメインクラス
class Game {
    constructor() {
        this.highScore = parseInt(localStorage.getItem("highScore") || "0", 10);
        this.reset();
    }

    reset() {
        this.car = new Car(140, 380);
        this.fuels = [];
        this.enemies = [];
        this.score = 0;
        this.fuel = 100;
        this.speed = 3;
        this.stage = 1;
        this.distance = 0;
        this.goalDistance = CONFIG.stageDistance;
        this.lives = CONFIG.initialLives;
        this.roadOffset = 0;
        this.gameOver = false;
        this.ending = false;
        
        // UI更新用
        this.lastScore = -1;
        this.lastStage = -1;
        this.lastFuel = -1;
        
        highScoreEl.textContent = this.highScore;
    }

    start() {
        startMessage.style.display = "none";
        this.update();
    }

    drawRoad() {
        this.roadOffset += this.speed;
        
        // ステージテーマに応じた背景色
        const theme = stageThemes[(this.stage - 1) % stageThemes.length];
        
        // 背景
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 道路
        ctx.fillStyle = theme.road;
        ctx.fillRect(60, 0, 200, canvas.height);
        
        // 道路の中央線
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(160, (this.roadOffset % 40) - 40);
        ctx.lineTo(160, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    update() {
        // 画面クリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // エンディング表示
        if (this.ending) {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "gold";
            ctx.font = "24px Arial";
            ctx.fillText("おめでとう！", 100, 200);
            ctx.fillStyle = "white";
            ctx.font = "16px Arial";
            ctx.fillText("全ステージクリア！", 90, 240);
            ctx.fillText("タップで最初から", 100, 280);
            requestAnimationFrame(() => this.update());
            return;
        }

        // ゲームオーバー表示
        if (this.gameOver) {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "red";
            ctx.font = "24px Arial";
            ctx.fillText("ゲームオーバー", 80, 220);
            ctx.fillStyle = "white";
            ctx.font = "16px Arial";
            ctx.fillText("タップでリスタート", 90, 260);
            requestAnimationFrame(() => this.update());
            return;
        }

        // ゲーム画面描画
        this.drawRoad();
        this.car.update();
        this.car.draw();

        // 敵の出現
        const MAX_ENEMIES = 5;
        if (this.enemies.length < MAX_ENEMIES) {
            if (Math.random() < 0.015) {
                const lane = [70, 120, 170, 220][Math.floor(Math.random() * 4)];
                const types = ["normal", "fast", "truck"];
                let type = types[Math.floor(Math.random() * types.length)];

                // トラックの連続出現を避ける
                if (type === "truck" && this.enemies.some(e => e.type === "truck")) {
                    type = "normal";
                }

                // ステージに応じた移動パターン
                let pattern = "straight";
                if (this.stage >= 2) {
                    const r = Math.random();
                    if (r < 0.3) pattern = "zigzag";
                    else if (r < 0.6 && this.stage >= 4) pattern = "swerve";
                }

                this.enemies.push(new Enemy(lane, -100, type, this.speed, pattern));
            }
        }

        // 燃料アイテムの出現
        if (Math.random() < 0.01) {
            const lane = [80, 140, 200][Math.floor(Math.random() * 3)];
            this.fuels.push(new Fuel(lane, -20));
        }

        // アイテムと敵の更新
        this.fuels.forEach(f => f.update());
        this.enemies.forEach(e => e.update());

        // 画面外のオブジェクトを削除
        this.fuels = this.fuels.filter(f => f.y < canvas.height);
        this.enemies = this.enemies.filter(e => e.y < canvas.height);

        // 描画
        this.fuels.forEach(f => f.draw());
        this.enemies.forEach(e => e.draw());

        // 衝突判定
        for (let f of this.fuels) {
            if (this.checkCollision(this.car, f)) {
                this.fuel = Math.min(100, this.fuel + CONFIG.fuelGain);
                this.fuels = this.fuels.filter(x => x !== f);
                soundSystem.playFuelSound(); // 燃料取得音
            }
        }

        for (let e of this.enemies) {
            if (this.checkCollision(this.car, e) && !this.car.invincible) {
                this.loseLife();
                this.enemies = this.enemies.filter(x => x !== e);
                soundSystem.playCollisionSound(); // 衝突音
            }
        }

        // ゲーム進行
        this.score++;
        this.distance++;
        this.fuel -= CONFIG.fuelDecrease * (1 + 0.2 * (this.stage - 1));

        // 燃料切れ
        if (this.fuel <= 0) this.loseLife();

        // ステージクリア判定
        if (this.distance > this.goalDistance) {
            if (this.stage === CONFIG.finalStage) {
                this.ending = true;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem("highScore", this.highScore);
                }
                return;
            }
            this.nextStage();
        }

        this.updateUI();
        requestAnimationFrame(() => this.update());
    }

    nextStage() {
        this.stage++;
        this.distance = 0;
        this.goalDistance += CONFIG.stageIncrement;
        this.speed += 0.5;
        this.fuels = [];
        this.enemies = [];
    }

    updateUI() {
        if (this.score !== this.lastScore) {
            scoreEl.textContent = this.score;
            this.lastScore = this.score;
        }
        if (this.stage !== this.lastStage) {
            stageEl.textContent = this.stage;
            this.lastStage = this.stage;
        }
        if (Math.floor(this.fuel) !== this.lastFuel) {
            fuelEl.style.width = Math.max(0, this.fuel) + "%";
            this.lastFuel = Math.floor(this.fuel);
        }
    }

    checkCollision(a, b) {
        const margin = 5;
        return (a.x + margin < b.x + b.w &&
                a.x + a.w - margin > b.x &&
                a.y + margin < b.y + b.h &&
                a.y + a.h - margin > b.y);
    }

    loseLife() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver = true;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem("highScore", this.highScore);
            }
            return;
        }
        
        // 無敵時間とリセット
        this.car.invincible = true;
        setTimeout(() => this.car.invincible = false, 2000);
        this.car.resetPosition();
    }
}

// 音声システム
class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.bgmGain = null;
        this.engineGain = null;
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // BGM用ゲインノード
            this.bgmGain = this.audioContext.createGain();
            this.bgmGain.gain.value = 0.3;
            this.bgmGain.connect(this.audioContext.destination);
            
            // エンジン音用ゲインノード
            this.engineGain = this.audioContext.createGain();
            this.engineGain.gain.value = 0.1;
            this.engineGain.connect(this.audioContext.destination);
            
            return true;
        } catch (error) {
            console.log("音声初期化に失敗:", error);
            return false;
        }
    }

    // レース風BGMを再生
    playBGM() {
        if (!this.audioContext || this.isPlaying) return;
        
        this.isPlaying = true;
        this.createRaceBGM();
    }

    // レース風BGMを作成
    createRaceBGM() {
        const playNote = (frequency, duration, delay = 0) => {
            setTimeout(() => {
                if (!this.audioContext || !this.isPlaying) return;
                
                const oscillator = this.audioContext.createOscillator();
                const envelope = this.audioContext.createGain();
                
                oscillator.connect(envelope);
                envelope.connect(this.bgmGain);
                
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = 'square';
                
                envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
                envelope.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.01);
                envelope.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration);
            }, delay);
        };

        // レース風のメロディパターン
        const pattern = [
            {note: 220, duration: 0.2}, // A3
            {note: 277, duration: 0.2}, // C#4
            {note: 330, duration: 0.2}, // E4
            {note: 440, duration: 0.4}, // A4
            {note: 330, duration: 0.2}, // E4
            {note: 277, duration: 0.2}, // C#4
            {note: 220, duration: 0.4}, // A3
            {note: 247, duration: 0.2}, // B3
            {note: 294, duration: 0.2}, // D4
            {note: 330, duration: 0.2}, // E4
            {note: 392, duration: 0.4}, // G4
            {note: 330, duration: 0.2}, // E4
            {note: 294, duration: 0.2}, // D4
            {note: 247, duration: 0.4}  // B3
        ];

        let currentTime = 0;
        pattern.forEach((note, index) => {
            playNote(note.note, note.duration, currentTime * 300);
            currentTime += note.duration * 2;
        });

        // ベースライン
        const bassPattern = [
            110, 110, 138, 138, 123, 123, 110, 110
        ];
        
        bassPattern.forEach((freq, index) => {
            setTimeout(() => {
                if (!this.audioContext || !this.isPlaying) return;
                
                const bass = this.audioContext.createOscillator();
                const bassEnv = this.audioContext.createGain();
                
                bass.connect(bassEnv);
                bassEnv.connect(this.bgmGain);
                
                bass.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                bass.type = 'sawtooth';
                
                bassEnv.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                bassEnv.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.6);
                
                bass.start(this.audioContext.currentTime);
                bass.stop(this.audioContext.currentTime + 0.6);
            }, index * 600);
        });

        // 4.8秒後に繰り返し
        setTimeout(() => {
            if (this.isPlaying) {
                this.createRaceBGM();
            }
        }, 4800);
    }

    // エンジン音を再生
    playEngineSound() {
        if (!this.audioContext) return;
        
        const engine = this.audioContext.createOscillator();
        const noise = this.audioContext.createOscillator();
        const engineEnv = this.audioContext.createGain();
        
        engine.connect(engineEnv);
        noise.connect(engineEnv);
        engineEnv.connect(this.engineGain);
        
        // エンジンの基本音
        engine.frequency.setValueAtTime(80 + Math.random() * 40, this.audioContext.currentTime);
        engine.type = 'sawtooth';
        
        // ノイズ成分
        noise.frequency.setValueAtTime(100 + Math.random() * 200, this.audioContext.currentTime);
        noise.type = 'square';
        
        engineEnv.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        engineEnv.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
        
        engine.start(this.audioContext.currentTime);
        noise.start(this.audioContext.currentTime);
        engine.stop(this.audioContext.currentTime + 0.1);
        noise.stop(this.audioContext.currentTime + 0.1);
    }

    // 衝突音
    playCollisionSound() {
        if (!this.audioContext) return;
        
        const collision = this.audioContext.createOscillator();
        const collisionEnv = this.audioContext.createGain();
        
        collision.connect(collisionEnv);
        collisionEnv.connect(this.audioContext.destination);
        
        collision.frequency.setValueAtTime(150, this.audioContext.currentTime);
        collision.frequency.linearRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
        collision.type = 'square';
        
        collisionEnv.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        collisionEnv.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
        
        collision.start(this.audioContext.currentTime);
        collision.stop(this.audioContext.currentTime + 0.3);
    }

    // 燃料取得音
    playFuelSound() {
        if (!this.audioContext) return;
        
        const fuel = this.audioContext.createOscillator();
        const fuelEnv = this.audioContext.createGain();
        
        fuel.connect(fuelEnv);
        fuelEnv.connect(this.audioContext.destination);
        
        fuel.frequency.setValueAtTime(400, this.audioContext.currentTime);
        fuel.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.2);
        fuel.type = 'sine';
        
        fuelEnv.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        fuelEnv.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
        
        fuel.start(this.audioContext.currentTime);
        fuel.stop(this.audioContext.currentTime + 0.2);
    }

    stop() {
        this.isPlaying = false;
    }
}

// サウンドシステムを初期化
const soundSystem = new SoundSystem();

// ゲーム開始
let game = new Game();

// スタート画面のクリックイベント
startMessage.addEventListener("click", async () => {
    // 音声を初期化（ユーザー操作後でないと音声は再生できない）
    if (!soundSystem.audioContext) {
        await soundSystem.init();
        soundSystem.playBGM();
    }
    
    if (game.gameOver || game.ending) {
        game = new Game();
        game.start();
    } else {
        game.start();
    }
});

// 画面サイズ調整
function resizeCanvas() {
    const aspect = 320 / 480;
    let w = window.innerWidth;
    let h = window.innerHeight;
    
    if (w / h > aspect) {
        w = h * aspect;
    } else {
        h = w / aspect;
    }
    
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();