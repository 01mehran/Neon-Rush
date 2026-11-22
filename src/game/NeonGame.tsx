import { useEffect, useRef, useState } from "react";

type Obstacle = {
  x: number;
  width: number;
  height: number;
};

const GRAVITY = 1800;
const JUMP_FORCE = -680;

export default function NeonGame({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const jumpRef = useRef(false);
  const restartRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let animationId = 0;
    let lastTime = 0;
    let scoreTimer = 0;
    let obstacleTimer = 0;
    let worldOffset = 0;
    let currentScore = 0;
    let speed = 350;
    let running = true;
    let ended = false;

    const player = {
      x: 100,
      y: 0,
      width: 42,
      height: 66,
      velocityY: 0,
      grounded: true,
    };

    let obstacles: Obstacle[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const groundY = () => height - 75;

    const jump = () => {
      if (ended) return;

      if (player.grounded) {
        player.velocityY = JUMP_FORCE;
        player.grounded = false;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
        event.preventDefault();
        jumpRef.current = true;
      }

      if (event.code === "Escape") {
        running = !running;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
        jumpRef.current = false;
      }
    };

    const handlePointerDown = () => {
      jumpRef.current = true;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", resize);

    resize();

    player.y = groundY() - player.height;

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);

      gradient.addColorStop(0, "#08051d");
      gradient.addColorStop(0.6, "#160d3a");
      gradient.addColorStop(1, "#09051a");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Stars
      for (let i = 0; i < 35; i++) {
        const x = (i * 173) % width;
        const y = (i * 83) % (height * 0.65);

        ctx.fillStyle = i % 3 === 0 ? "#ff36df" : "#00eaff";
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, 2, 2);
      }

      ctx.globalAlpha = 1;

      // Buildings
      const buildingWidth = 90;

      for (let i = 0; i < Math.ceil(width / buildingWidth) + 2; i++) {
        const x = i * buildingWidth - ((worldOffset * 0.25) % buildingWidth);

        const buildingHeight = 90 + ((i * 47) % 130);

        ctx.fillStyle = "#100d32";
        ctx.fillRect(
          x,
          groundY() - buildingHeight,
          buildingWidth - 8,
          buildingHeight,
        );

        ctx.strokeStyle = "#00bfff66";
        ctx.strokeRect(
          x,
          groundY() - buildingHeight,
          buildingWidth - 8,
          buildingHeight,
        );

        for (let j = 0; j < 4; j++) {
          ctx.fillStyle = j % 2 === 0 ? "#00eaff" : "#ff29df";
          ctx.globalAlpha = 0.5;
          ctx.fillRect(
            x + 12 + (j % 2) * 30,
            groundY() - buildingHeight + 20 + Math.floor(j / 2) * 35,
            9,
            12,
          );
        }

        ctx.globalAlpha = 1;
      }
    };

    const drawGround = () => {
      const y = groundY();

      ctx.fillStyle = "#100b2b";
      ctx.fillRect(0, y, width, height - y);

      ctx.strokeStyle = "#00eaff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00eaff";
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.shadowBlur = 0;

      ctx.strokeStyle = "#39256c";

      for (let i = 0; i < width / 50 + 2; i++) {
        const x = i * 50 - (worldOffset % 50);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 35, height);
        ctx.stroke();
      }
    };

    const drawPlayer = () => {
      const { x, y, width: w, height: h } = player;

      ctx.save();

      ctx.shadowColor = "#00eaff";
      ctx.shadowBlur = 20;

      // Body
      ctx.fillStyle = "#10182f";
      ctx.strokeStyle = "#00eaff";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(x, y + 18, w, h - 18, 9);
      ctx.fill();
      ctx.stroke();

      // Head
      ctx.fillStyle = "#18152f";
      ctx.strokeStyle = "#ff35e8";

      ctx.beginPath();
      ctx.arc(x + w / 2, y + 12, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Visor
      ctx.fillStyle = "#00eaff";
      ctx.fillRect(x + 19, y + 10, 18, 4);

      // Energy line
      ctx.strokeStyle = "#ff29df";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(x + 8, y + 35);
      ctx.lineTo(x + w - 8, y + 35);
      ctx.stroke();

      ctx.restore();
    };

    const drawObstacles = () => {
      obstacles.forEach((obstacle) => {
        ctx.save();

        ctx.shadowColor = "#ff22df";
        ctx.shadowBlur = 20;

        ctx.fillStyle = "#280b3d";
        ctx.strokeStyle = "#ff29df";
        ctx.lineWidth = 2;

        ctx.fillRect(
          obstacle.x,
          groundY() - obstacle.height,
          obstacle.width,
          obstacle.height,
        );

        ctx.strokeRect(
          obstacle.x,
          groundY() - obstacle.height,
          obstacle.width,
          obstacle.height,
        );

        ctx.restore();
      });
    };

    const drawHUD = () => {
      ctx.fillStyle = "#00eaff";
      ctx.font = "bold 18px Arial";
      ctx.fillText(`SCORE  ${Math.floor(currentScore)}`, 25, 38);

      ctx.fillStyle = "#a78bfa";
      ctx.font = "11px Arial";
      ctx.fillText("NEON RUSH / RUN 01", 25, 57);
    };

    const update = (delta: number) => {
      if (!running || ended) return;

      const dt = Math.min(delta / 1000, 0.033);

      if (jumpRef.current) {
        jump();
        jumpRef.current = false;
      }

      // Player physics
      player.velocityY += GRAVITY * dt;
      player.y += player.velocityY * dt;

      if (player.y + player.height >= groundY()) {
        player.y = groundY() - player.height;
        player.velocityY = 0;
        player.grounded = true;
      }

      // World
      worldOffset += speed * dt;
      speed += 3 * dt;

      scoreTimer += dt;

      if (scoreTimer >= 0.1) {
        currentScore += 1;
        scoreTimer = 0;
        setScore(Math.floor(currentScore));
      }

      // Obstacle spawning
      obstacleTimer += dt;

      if (obstacleTimer >= 1.7) {
        const obstacleHeight = 35 + Math.random() * 35;

        obstacles.push({
          x: width + 30,
          width: 28 + Math.random() * 18,
          height: obstacleHeight,
        });

        obstacleTimer = 0;
      }

      obstacles.forEach((obstacle) => {
        obstacle.x -= speed * dt;

        const playerLeft = player.x + 7;
        const playerRight = player.x + player.width - 7;
        const playerTop = player.y + 5;
        const playerBottom = player.y + player.height;

        const obstacleTop = groundY() - obstacle.height;

        const collision =
          playerRight > obstacle.x &&
          playerLeft < obstacle.x + obstacle.width &&
          playerBottom > obstacleTop &&
          playerTop < groundY();

        if (collision) {
          ended = true;
          setGameOver(true);
        }
      });

      obstacles = obstacles.filter(
        (obstacle) => obstacle.x + obstacle.width > 0,
      );
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      drawBackground();
      drawGround();
      drawObstacles();
      drawPlayer();
      drawHUD();
    };

    const loop = (time: number) => {
      const delta = lastTime ? time - lastTime : 16;
      lastTime = time;

      update(delta);
      render();

      animationId = requestAnimationFrame(loop);
    };

    const restart = () => {
      obstacles = [];
      currentScore = 0;
      scoreTimer = 0;
      obstacleTimer = 0;
      worldOffset = 0;
      speed = 350;
      ended = false;
      running = true;

      player.y = groundY() - player.height;
      player.velocityY = 0;
      player.grounded = true;

      setScore(0);
      setGameOver(false);
    };

    const restartInterval = window.setInterval(() => {
      if (restartRef.current) {
        restartRef.current = false;
        restart();
      }
    }, 50);

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.clearInterval(restartInterval);

      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="relative h-full min-h-svh w-full overflow-hidden bg-[#08051d]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5">
        <button
          onClick={onExit}
          className="pointer-events-auto rounded border border-cyan-400/50 bg-black/50 px-4 py-2 text-xs font-bold tracking-widest text-cyan-300"
        >
          ← EXIT
        </button>

        <div className="text-right">
          <p className="text-[10px] tracking-[0.3em] text-purple-300">
            YOUR SCORE
          </p>
          <p className="text-3xl font-black text-cyan-300 drop-shadow-[0_0_12px_#00eaff]">
            {score.toString().padStart(5, "0")}
          </p>
        </div>
      </div>

      <div className="absolute right-0 bottom-5 left-0 z-10 text-center text-[10px] tracking-[0.3em] text-white/50">
        SPACE / ↑ / TAP TO JUMP
      </div>

      {gameOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05020de8] p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-fuchsia-500/60 bg-[#100b2d] p-8 text-center shadow-[0_0_45px_#d000ff44]">
            <p className="text-xs font-bold tracking-[0.4em] text-fuchsia-400">
              RUN TERMINATED
            </p>

            <h2 className="mt-4 text-4xl font-black text-white">GAME OVER</h2>

            <p className="mt-6 text-sm text-purple-300">YOUR SCORE</p>

            <p className="mt-2 text-5xl font-black text-cyan-300">{score}</p>

            <button
              onClick={() => {
                restartRef.current = true;
              }}
              className="mt-8 w-full rounded bg-linear-to-r from-purple-600 to-fuchsia-500 py-4 text-sm font-black tracking-widest text-white shadow-[0_0_25px_#d000ff66]"
            >
              TRY AGAIN
            </button>

            <button
              onClick={onExit}
              className="mt-3 w-full border border-white/20 py-3 text-xs font-bold tracking-widest text-white/70"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
