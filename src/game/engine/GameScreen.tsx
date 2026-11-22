import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH = 900;
const HEIGHT = 500;
const GROUND = 420;

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

function GameScreen({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gameOver, setGameOver] = useState(false);

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
    speed: 340,
    distance: 0,
    score: 0,
    coinsCollected: 0,
    spawnTimer: 0,
    coinTimer: 0,
    running: true,
    lastTime: 0,
    gameOver: false,
  });

  const jump = useCallback(() => {
    const current = game.current;

    if (!current.running || !current.player.grounded) return;

    current.player.velocityY = -680;
    current.player.grounded = false;
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
      speed: 340,
      distance: 0,
      score: 0,
      coinsCollected: 0,
      spawnTimer: 0,
      coinTimer: 0,
      running: true,
      lastTime: 0,
      gameOver: false,
    };

    setScore(0);
    setCoins(0);
    setGameOver(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    let animationId = 0;
    let previousTime = 0;
    let uiTimer = 0;

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

      drawBackground(current.distance);

      current.coins.forEach(drawCoin);
      current.obstacles.forEach(drawObstacle);

      drawPlayer(player.x, player.y, player.width, player.height);

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
    };

    const loop = (time: number) => {
      const current = game.current;

      const delta = previousTime
        ? Math.min((time - previousTime) / 1000, 0.033)
        : 0;

      previousTime = time;

      if (current.running) {
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

        // Move obstacles
        current.obstacles.forEach((obstacle) => {
          obstacle.x -= current.speed * delta;
        });

        current.obstacles = current.obstacles.filter(
          (obstacle) => obstacle.x + obstacle.width > 0,
        );

        // Move coins
        current.coins.forEach((coin) => {
          coin.x -= current.speed * delta;
        });

        current.coins = current.coins.filter(
          (coin) => coin.x > -20 && !coin.collected,
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

          if (hit) {
            current.running = false;
            current.gameOver = true;
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
          }
        }

        // Update React UI occasionally
        uiTimer += delta;

        if (uiTimer >= 0.1) {
          setScore(current.score);
          setCoins(current.coinsCollected);
          uiTimer = 0;
        }
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

      if (event.code === "Escape") {
        onExit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [jump, onExit]);

  return (
    <main className="game-screen">
      <header className="game-header">
        <button className="game-exit" onClick={onExit}>
          ← MENU
        </button>

        <div className="game-stats">
          <span>SCORE: {score}</span>
          <span>COINS: {coins}</span>
        </div>
      </header>

      <section className="game-container">
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

        <div className="game-controls">
          <span>SPACE / ↑ / W TO JUMP</span>
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
