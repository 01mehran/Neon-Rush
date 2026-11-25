import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "./audio";

const WIDTH = 900;
const HEIGHT = 500;
const GROUND = 420;
const HIGH_SCORE_KEY = "neon-rush-high-score";

function getSavedHighScore() {
  try {
    const saved = Number(window.localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  } catch {
    return 0;
  }
}

type Obstacle = {
  x: number;
  width: number;
  height: number;
};

type Coin = {
  x: number;
  y: number;
  collected: boolean;
};

type PowerUp = {
  x: number;
  y: number;
  type: "shield" | "magnet";
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

function GameScreen({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(getSavedHighScore);
  const [paused, setPaused] = useState(false);
  const [shieldTime, setShieldTime] = useState(0);
  const [magnetTime, setMagnetTime] = useState(0);
  const highScoreRef = useRef(highScore);
  const [gameOver, setGameOver] = useState(false);

  // Keep the ref in sync so the animation loop always sees the latest record.
  highScoreRef.current = highScore;

  const game = useRef({
    player: {
      x: 130,
      y: GROUND - 65,
      width: 42,
      height: 65,
      velocityY: 0,
      grounded: true,
    },
    obstacles: [] as Obstacle[],
    coins: [] as Coin[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    screenShake: 0,
    powerUpTimer: 7,
    shieldTime: 0,
    magnetTime: 0,
    speed: 340,
    distance: 0,
    score: 0,
    coinsCollected: 0,
    spawnTimer: 0,
    coinTimer: 0,
    running: true,
    lastTime: 0,
    gameOver: false,
    paused: false,
  });

  const jump = useCallback(() => {
    const current = game.current;

    if (!current.running || current.paused || !current.player.grounded) return;

    current.player.velocityY = -680;
    current.player.grounded = false;
    playSound("jump");
  }, []);

  const togglePause = useCallback(() => {
    const current = game.current;

    if (!current.running || current.gameOver) return;

    current.paused = !current.paused;
    setPaused(current.paused);
  }, []);

  const restart = useCallback(() => {
    game.current = {
      player: {
        x: 130,
        y: GROUND - 65,
        width: 42,
        height: 65,
        velocityY: 0,
        grounded: true,
      },
      obstacles: [],
      coins: [],
      powerUps: [],
      particles: [],
      screenShake: 0,
      powerUpTimer: 7,
      shieldTime: 0,
      magnetTime: 0,
      speed: 340,
      distance: 0,
      score: 0,
      coinsCollected: 0,
      spawnTimer: 0,
      coinTimer: 0,
      running: true,
      lastTime: 0,
      gameOver: false,
      paused: false,
    };

    setScore(0);
    setCoins(0);
    setShieldTime(0);
    setMagnetTime(0);
    setGameOver(false);
    setPaused(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    let animationId = 0;
    let previousTime = 0;
    let uiTimer = 0;

    const burst = (x: number, y: number, color: string, amount = 14) => {
      const current = game.current;
      for (let i = 0; i < amount; i++) {
        const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.35;
        const speed = 55 + Math.random() * 190;
        const life = 0.35 + Math.random() * 0.45;
        current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          size: 2 + Math.random() * 4,
          color,
        });
      }
    };

    const drawBackground = (distance: number) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, "#09051e");
      gradient.addColorStop(1, "#210c3e");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Moon
      ctx.shadowBlur = 45;
      ctx.shadowColor = "#bd35ff";
      ctx.fillStyle = "#b95bff";
      ctx.beginPath();
      ctx.arc(710, 110, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Stars
      for (let i = 0; i < 35; i++) {
        const x = (i * 173 - distance * 0.05) % WIDTH;
        const y = (i * 67) % 250;

        ctx.fillStyle = "#b9dfff";
        ctx.fillRect((x + WIDTH) % WIDTH, y, 2, 2);
      }

      // Buildings
      for (let i = 0; i < 13; i++) {
        const buildingX =
          ((((i * 100 - distance * 0.2) % 1400) + 1400) % 1400) - 100;

        const buildingHeight = 100 + ((i * 47) % 100);

        ctx.fillStyle = "#100b35";
        ctx.fillRect(buildingX, GROUND - buildingHeight, 65, buildingHeight);

        ctx.fillStyle = "#00d9ff";
        ctx.globalAlpha = 0.65;

        for (let j = 0; j < 4; j++) {
          ctx.fillRect(
            buildingX + 10 + (j % 2) * 27,
            GROUND - buildingHeight + 15 + Math.floor(j / 2) * 30,
            7,
            12,
          );
        }

        ctx.globalAlpha = 1;
      }

      // Ground
      ctx.fillStyle = "#080716";
      ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);

      ctx.strokeStyle = "#00eaff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00eaff";
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.moveTo(0, GROUND);
      ctx.lineTo(WIDTH, GROUND);
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Moving floor lines
      ctx.strokeStyle = "#7c36b9";
      ctx.globalAlpha = 0.6;

      for (let i = 0; i < 20; i++) {
        const x = (((i * 80 - distance) % WIDTH) + WIDTH) % WIDTH;

        ctx.beginPath();
        ctx.moveTo(x, GROUND);
        ctx.lineTo(x - 30, HEIGHT);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    const drawPlayer = (
      x: number,
      y: number,
      width: number,
      height: number,
    ) => {
      ctx.save();

      // Aura
      ctx.shadowBlur = 22;
      ctx.shadowColor = "#00eaff";

      // Head
      ctx.fillStyle = "#121b36";
      ctx.strokeStyle = "#00eaff";
      ctx.lineWidth = 3;

      ctx.fillRect(x + 8, y, 30, 27);
      ctx.strokeRect(x + 8, y, 30, 27);

      // Visor
      ctx.fillStyle = "#ff29df";
      ctx.fillRect(x + 24, y + 10, 13, 5);

      // Body
      ctx.fillStyle = "#16132e";
      ctx.strokeStyle = "#b42cff";

      ctx.beginPath();
      ctx.moveTo(x + 8, y + 28);
      ctx.lineTo(x + width - 4, y + 28);
      ctx.lineTo(x + width, y + height - 10);
      ctx.lineTo(x, y + height - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Legs
      ctx.fillStyle = "#00eaff";
      ctx.fillRect(x + 7, y + height - 10, 12, 10);
      ctx.fillRect(x + 25, y + height - 10, 12, 10);

      ctx.restore();
    };

    const drawObstacle = (obstacle: Obstacle) => {
      ctx.save();

      ctx.shadowBlur = 18;
      ctx.shadowColor = "#ff19c8";
      ctx.fillStyle = "#240b35";
      ctx.strokeStyle = "#ff29df";
      ctx.lineWidth = 3;

      ctx.fillRect(
        obstacle.x,
        GROUND - obstacle.height,
        obstacle.width,
        obstacle.height,
      );

      ctx.strokeRect(
        obstacle.x,
        GROUND - obstacle.height,
        obstacle.width,
        obstacle.height,
      );

      ctx.restore();
    };

    const drawPowerUp = (powerUp: PowerUp) => {
      ctx.save();
      const isShield = powerUp.type === "shield";
      const color = isShield ? "#00eaff" : "#ff4de1";
      ctx.shadowBlur = 22;
      ctx.shadowColor = color;
      ctx.fillStyle = "#100b2c";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(powerUp.x, powerUp.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isShield ? "S" : "M", powerUp.x, powerUp.y + 1);
      ctx.restore();
    };

    const drawCoin = (coin: Coin) => {
      if (coin.collected) return;

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ffe65c";
      ctx.fillStyle = "#ffe65c";

      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#fff6a5";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    };

    const draw = () => {
      const current = game.current;
      const player = current.player;

      ctx.save();
      if (current.screenShake > 0) {
        const shake = current.screenShake * 13;
        ctx.translate(
          (Math.random() - 0.5) * shake,
          (Math.random() - 0.5) * shake,
        );
      }

      drawBackground(current.distance);

      current.coins.forEach(drawCoin);
      current.powerUps.forEach(drawPowerUp);
      current.obstacles.forEach(drawObstacle);

      if (current.shieldTime > 0) {
        ctx.save();
        const pulse = 1 + Math.sin(performance.now() / 110) * 0.045;
        ctx.strokeStyle = "#00eaff";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 24;
        ctx.shadowColor = "#00eaff";
        ctx.beginPath();
        ctx.ellipse(
          player.x + player.width / 2,
          player.y + player.height / 2,
          player.width * 0.9 * pulse,
          player.height * 0.72 * pulse,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.restore();
      }

      if (current.magnetTime > 0) {
        ctx.save();
        ctx.strokeStyle = "#ff4de1";
        ctx.globalAlpha = 0.45 + Math.sin(performance.now() / 130) * 0.2;
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ff4de1";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(
          player.x + player.width / 2,
          player.y + player.height / 2,
          58 + Math.sin(performance.now() / 180) * 5,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.restore();
      }

      drawPlayer(player.x, player.y, player.width, player.height);

      // Neon particle effects
      current.particles.forEach((particle) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Score display
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.fillText(`SCORE: ${current.score}`, 30, 42);

      ctx.fillStyle = "#ffe65c";
      ctx.fillText(`COINS: ${current.coinsCollected}`, 30, 72);

      ctx.textAlign = "right";
      ctx.fillStyle = "#00eaff";
      ctx.fillText(`SPEED: ${Math.floor(current.speed)}`, WIDTH - 30, 42);
      ctx.textAlign = "left";

      if (current.gameOver) {
        ctx.fillStyle = "#05030dcc";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.textAlign = "center";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ff29df";

        ctx.fillStyle = "#ff29df";
        ctx.font = "bold 58px Arial";
        ctx.fillText("GAME OVER", WIDTH / 2, 215);

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.fillText(`YOUR SCORE: ${current.score}`, WIDTH / 2, 265);

        ctx.textAlign = "left";
      }
      ctx.restore();
    };

    const loop = (time: number) => {
      const current = game.current;

      const delta = previousTime
        ? Math.min((time - previousTime) / 1000, 0.033)
        : 0;

      previousTime = time;

      if (current.running && !current.paused) {
        const player = current.player;

        current.distance += current.speed * delta;
        current.speed = Math.min(340 + current.distance * 0.025, 650);

        // Score
        current.score = Math.floor(current.distance / 10);

        // Gravity
        player.velocityY += 1800 * delta;
        player.y += player.velocityY * delta;

        if (player.y + player.height >= GROUND) {
          player.y = GROUND - player.height;
          player.velocityY = 0;
          player.grounded = true;
        }

        // Spawn obstacles
        current.spawnTimer -= delta;

        if (current.spawnTimer <= 0) {
          const height = 40 + Math.random() * 35;

          current.obstacles.push({
            x: WIDTH + 20,
            width: 35 + Math.random() * 15,
            height,
          });

          current.spawnTimer = 1.1 + Math.random() * 0.9;
        }

        // Spawn coins
        current.coinTimer -= delta;

        if (current.coinTimer <= 0) {
          current.coins.push({
            x: WIDTH + 20,
            y: GROUND - 90 - Math.random() * 90,
            collected: false,
          });

          current.coinTimer = 1.3 + Math.random() * 1.2;
        }

        // Power-up timers
        current.shieldTime = Math.max(0, current.shieldTime - delta);
        current.magnetTime = Math.max(0, current.magnetTime - delta);

        // Spawn power-ups
        current.powerUpTimer -= delta;
        if (current.powerUpTimer <= 0) {
          current.powerUps.push({
            x: WIDTH + 25,
            y: GROUND - 75 - Math.random() * 75,
            type: Math.random() < 0.5 ? "shield" : "magnet",
          });
          current.powerUpTimer = 10 + Math.random() * 5;
        }

        // Move obstacles
        current.obstacles.forEach((obstacle) => {
          obstacle.x -= current.speed * delta;
        });

        current.obstacles = current.obstacles.filter(
          (obstacle) => obstacle.x + obstacle.width > 0,
        );

        // Move power-ups
        current.powerUps.forEach((powerUp) => {
          powerUp.x -= current.speed * delta;
        });
        current.powerUps = current.powerUps.filter(
          (powerUp) => powerUp.x > -30,
        );

        // Move coins and attract them while the magnet is active
        current.coins.forEach((coin) => {
          coin.x -= current.speed * delta;

          if (current.magnetTime > 0 && !coin.collected) {
            const targetX = player.x + player.width / 2;
            const targetY = player.y + player.height / 2;
            const dx = targetX - coin.x;
            const dy = targetY - coin.y;
            if (Math.hypot(dx, dy) < 190) {
              coin.x += dx * Math.min(1, delta * 5);
              coin.y += dy * Math.min(1, delta * 5);
            }
          }
        });

        current.coins = current.coins.filter(
          (coin) => coin.x > -20 && !coin.collected,
        );

        // Collect power-ups
        for (const powerUp of current.powerUps) {
          const dx = player.x + player.width / 2 - powerUp.x;
          const dy = player.y + player.height / 2 - powerUp.y;
          if (Math.hypot(dx, dy) < 42) {
            if (powerUp.type === "shield") {
              current.shieldTime = 5;
              burst(powerUp.x, powerUp.y, "#00eaff", 22);
            } else {
              current.magnetTime = 6;
              burst(powerUp.x, powerUp.y, "#ff4de1", 22);
            }
            playSound("powerup");
            powerUp.x = -100;
          }
        }
        current.powerUps = current.powerUps.filter(
          (powerUp) => powerUp.x > -30,
        );

        // Collision detection
        for (const obstacle of current.obstacles) {
          const playerRight = player.x + player.width - 7;
          const playerBottom = player.y + player.height - 3;

          const obstacleTop = GROUND - obstacle.height;

          const hit =
            playerRight > obstacle.x + 4 &&
            player.x + 7 < obstacle.x + obstacle.width &&
            playerBottom > obstacleTop + 3;

          if (hit && current.shieldTime <= 0) {
            burst(
              player.x + player.width / 2,
              player.y + player.height / 2,
              "#ff29df",
              34,
            );
            current.screenShake = 1;
            playSound("gameOver");
            current.running = false;
            current.gameOver = true;
            current.paused = false;
            setPaused(false);
            setGameOver(true);
            break;
          }
        }

        // Coin collection
        for (const coin of current.coins) {
          const dx = player.x + player.width / 2 - coin.x;
          const dy = player.y + player.height / 2 - coin.y;

          if (Math.sqrt(dx * dx + dy * dy) < 35) {
            coin.collected = true;
            current.coinsCollected += 1;
            burst(coin.x, coin.y, "#ffe65c", 10);
            playSound("coin");
          }
        }

        // Update React UI occasionally
        uiTimer += delta;

        if (uiTimer >= 0.1) {
          setScore(current.score);
          setCoins(current.coinsCollected);
          setShieldTime(current.shieldTime);
          setMagnetTime(current.magnetTime);

          if (current.score > highScoreRef.current) {
            highScoreRef.current = current.score;
            setHighScore(current.score);

            try {
              window.localStorage.setItem(
                HIGH_SCORE_KEY,
                String(current.score),
              );
            } catch {
              // The game can continue even if browser storage is unavailable.
            }
          }

          uiTimer = 0;
        }
      }

      // Keep visual effects animating after a collision; freeze them while paused.
      if (!current.paused) {
        current.particles.forEach((particle) => {
          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;
          particle.vx *= Math.pow(0.08, delta);
          particle.vy = particle.vy * Math.pow(0.08, delta) + 90 * delta;
          particle.life -= delta;
        });
        current.particles = current.particles.filter(
          (particle) => particle.life > 0,
        );
        current.screenShake = Math.max(0, current.screenShake - delta * 2.8);
      }

      draw();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "KeyW"
      ) {
        event.preventDefault();
        jump();
      }

      if (event.code === "KeyP" && !event.repeat) {
        event.preventDefault();
        togglePause();
      }

      if (event.code === "Escape") {
        onExit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [jump, onExit, togglePause]);

  return (
    <main className="game-screen">
      <header className="game-header">
        <button className="game-exit" onClick={onExit}>
          ← MENU
        </button>

        <div className="game-stats">
          <span>SCORE: {score}</span>
          <span>COINS: {coins}</span>
          <span>BEST: {highScore}</span>
          {shieldTime > 0 && (
            <span className="text-cyan-300">
              SHIELD: {shieldTime.toFixed(1)}s
            </span>
          )}
          {magnetTime > 0 && (
            <span className="text-fuchsia-300">
              MAGNET: {magnetTime.toFixed(1)}s
            </span>
          )}
          {!gameOver && (
            <button
              type="button"
              onClick={togglePause}
              className="rounded-lg border border-cyan-400/50 bg-slate-950/70 px-3 py-2 text-xs font-bold tracking-wider text-cyan-300 transition hover:bg-cyan-400/15"
            >
              {paused ? "RESUME" : "PAUSE"}
            </button>
          )}
        </div>
      </header>

      <section className="game-container relative">
        <div className="game-title">
          <span>NEON RUSH</span>
          <p>RUN. DODGE. SURVIVE.</p>
        </div>

        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="game-canvas"
          onPointerDown={jump}
        />

        {paused && !gameOver && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-[#05030dcc] p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-cyan-400/40 bg-[#0b0820]/95 p-8 text-center shadow-[0_0_35px_rgba(0,234,255,0.15)]">
              <p className="mb-2 text-xs font-bold tracking-[0.35em] text-cyan-300">
                NEON RUSH
              </p>
              <h2 className="mb-3 text-4xl font-black tracking-widest text-white">
                PAUSED
              </h2>
              <p className="mb-6 text-sm text-slate-400">
                Take a break. Your run is waiting.
              </p>
              <button
                type="button"
                onClick={togglePause}
                className="w-full rounded-lg bg-cyan-400 px-6 py-3 font-black tracking-widest text-slate-950 transition hover:bg-cyan-300"
              >
                RESUME GAME
              </button>
              <p className="mt-4 text-xs text-slate-500">Press P to resume</p>
            </div>
          </div>
        )}

        <div className="game-controls">
          <span>SPACE / ↑ / W TO JUMP · COLLECT NEON ORBS</span>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              jump();
            }}
          >
            JUMP
          </button>
        </div>

        {gameOver && (
          <div className="game-over-panel">
            <span>RUN ENDED</span>
            <h2>GAME OVER</h2>
            <p>YOUR SCORE: {score}</p>
            <p>BEST SCORE: {highScore}</p>

            <button onClick={restart}>PLAY AGAIN ↻</button>

            <button className="secondary" onClick={onExit}>
              BACK TO MENU
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default GameScreen;
