const TILE = 64;
const HALF_TILE = TILE / 2;
const DIFFICULTY = 28;

type Cell = { type: "tree" | "rock"; img: HTMLImageElement } | null;

interface Images {
  person: HTMLImageElement;
  crash: HTMLImageElement;
  tree: HTMLImageElement;
  rock: HTMLImageElement;
  bear: HTMLImageElement;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadImages(): Promise<Images> {
  const [person, crash, tree, rock, bear] = await Promise.all([
    loadImage("person.png"),
    loadImage("crash.png"),
    loadImage("tree.png"),
    loadImage("rock.png"),
    loadImage("bear.png"),
  ]);
  return { person, crash, tree, rock, bear };
}

export async function startGame(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const images = await loadImages();

  const maxCols = Math.floor(W / TILE) + 16;
  const maxRows = Math.floor(H / TILE) + 8;

  let offsetX = 0;
  let offsetY = 0;
  let direction = 0;
  let crashed = false;
  let crashTimer = 0;
  let score = 0;
  let speedBoost = 0;
  let bearUnleashed = false;
  let bearX = -TILE;
  let bearY = -TILE;
  let gameOver = false;
  let bearFrame = 0;
  let bearFrameTimer = 0;

  const speedY = TILE / 1000;
  const speedX = (2 * TILE) / 1000;

  // Build grid
  const grid: Cell[][] = [];
  for (let r = 0; r < maxRows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < maxCols; c++) {
      const roll = Math.floor(Math.random() * DIFFICULTY);
      if (roll === 1) row.push({ type: "tree", img: images.tree });
      else if (roll === 2) row.push({ type: "rock", img: images.rock });
      else row.push(null);
    }
    grid.push(row);
  }

  function shiftPush<T>(arr: T[]) {
    arr.push(arr.shift()!);
  }
  function popUnshift<T>(arr: T[]) {
    arr.unshift(arr.pop()!);
  }

  // Speed increases every second
  const speedInterval = setInterval(() => {
    speedBoost = Math.min(8, speedBoost + speedY * 0.5);
  }, 1000);

  // Skier position (fixed on screen)
  const skierX = W / 2;
  const skierY = H / 2;

  // Input
  let mouseDown = false;

  canvas.addEventListener("mousedown", () => (mouseDown = true));
  canvas.addEventListener("mouseup", () => (mouseDown = false));
  canvas.addEventListener("mouseleave", () => (mouseDown = false));
  canvas.addEventListener("mousemove", (e) => {
    if (!mouseDown || crashed) return;
    const rect = canvas.getBoundingClientRect();
    const mx = Math.round((e.clientX - rect.left) / TILE);
    const px = Math.round(skierX / TILE);
    const delta = mx - px;
    if (delta < 0 && direction > -1) direction = -1;
    else if (delta > 0 && direction < 1) direction = 1;
    else if (delta === 0 && direction !== 0) direction = 0;
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mouseDown = true;
  });
  canvas.addEventListener("touchend", () => (mouseDown = false));
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (crashed) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = Math.round((touch.clientX - rect.left) / TILE);
    const px = Math.round(skierX / TILE);
    const delta = mx - px;
    if (delta < 0 && direction > -1) direction = -1;
    else if (delta > 0 && direction < 1) direction = 1;
    else if (delta === 0 && direction !== 0) direction = 0;
  });

  window.addEventListener("keypress", (e) => {
    if (crashed) return;
    if (e.key === "a" || e.key === "ArrowLeft") direction = -1;
    else if (e.key === "s" || e.key === "ArrowDown") direction = 0;
    else if (e.key === "d" || e.key === "ArrowRight") direction = 1;
  });

  window.addEventListener("keydown", (e) => {
    if (crashed) return;
    if (e.key === "ArrowLeft") direction = -1;
    else if (e.key === "ArrowDown") direction = 0;
    else if (e.key === "ArrowRight") direction = 1;
  });

  function cellScreenPos(row: number, col: number): [number, number] {
    return [offsetX + col * TILE, offsetY + row * TILE + maxRows];
  }

  function checkCollision(): boolean {
    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < maxCols; c++) {
        if (!grid[r][c]) continue;
        const [cx, cy] = cellScreenPos(r, c);
        const objCenterX = cx + HALF_TILE;
        const objBottomY = cy + TILE;
        if (
          Math.abs(skierX - objCenterX) < HALF_TILE * 0.6 &&
          Math.abs(skierY - objBottomY) < HALF_TILE * 0.6
        ) {
          return true;
        }
      }
    }
    return false;
  }

  let lastTime = 0;
  let crashAlpha = 0;
  let skierAlpha = 1;

  function tick(time: number) {
    if (gameOver) {
      drawGameOver();
      return;
    }

    const delta = lastTime ? Math.min(time - lastTime, 50) : 16;
    lastTime = time;

    // Update offsets
    if (!crashed) {
      offsetY -= (speedY + speedBoost) * delta;
      offsetX -= direction * speedX * delta;
      score += delta / 100;
    }

    // Crash animation
    if (crashed) {
      crashTimer -= delta;
      if (crashTimer <= 0) {
        crashed = false;
        skierAlpha = 1;
        crashAlpha = 0;
      } else if (crashTimer > 2000) {
        skierAlpha = Math.max(0, skierAlpha - delta / 200);
        crashAlpha = Math.min(1, crashAlpha + delta / 200);
      } else if (crashTimer < 300) {
        crashAlpha = Math.max(0, crashAlpha - delta / 200);
        skierAlpha = Math.min(1, skierAlpha + delta / 200);
      }
    }

    // Grid wrapping
    if (offsetY < -TILE) {
      shiftPush(grid);
      offsetY += TILE;
    }
    if (offsetX < -TILE) {
      grid.forEach(shiftPush);
      offsetX += TILE;
    } else if (offsetX > TILE) {
      grid.forEach(popUnshift);
      offsetX -= TILE;
    }

    // Collision
    if (!crashed && checkCollision()) {
      crashed = true;
      crashTimer = 2300;
      speedBoost = 0;
      score -= 50;
      skierAlpha = 1;
      crashAlpha = 0;
    }

    // Bear
    if (score > 1000 && !bearUnleashed) {
      bearUnleashed = true;
      bearX = -TILE;
      bearY = -TILE;
    }
    if (bearUnleashed && !gameOver) {
      const dx = skierX - bearX;
      const dy = skierY - bearY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        gameOver = true;
      } else {
        const speed = 0.003 * delta;
        bearX += dx * speed;
        bearY += dy * speed;
      }
      bearFrameTimer += delta;
      if (bearFrameTimer > 100) {
        bearFrame = (bearFrame + 1) % 4;
        bearFrameTimer = 0;
      }
    }

    draw();
    requestAnimationFrame(tick);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, W, H);

    // Draw grid objects
    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < maxCols; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        const [x, y] = cellScreenPos(r, c);
        if (x > -TILE && x < W + TILE && y > -TILE && y < H + TILE) {
          ctx.drawImage(cell.img, x, y, TILE, TILE);
        }
      }
    }

    // Draw skier
    if (skierAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = skierAlpha;
      ctx.translate(skierX, skierY);
      const skewAmount = -0.3 * direction;
      ctx.transform(1, 0, skewAmount, 1, 0, 0);
      ctx.drawImage(images.person, -HALF_TILE, -TILE, TILE, TILE);
      ctx.restore();
    }

    // Draw crash
    if (crashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = crashAlpha;
      ctx.drawImage(images.crash, skierX - HALF_TILE, skierY - TILE, TILE, TILE);
      ctx.restore();
    }

    // Draw bear
    if (bearUnleashed) {
      ctx.drawImage(
        images.bear,
        bearFrame * 64, 0, 64, 64,
        bearX - HALF_TILE, bearY - TILE, TILE, TILE
      );
    }

    // Score
    ctx.fillStyle = "black";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(score)} points`, W - 10, 34);

    // FPS (optional, keeping it like the original)
    ctx.font = "12px monospace";
    ctx.fillText(`fps: ${Math.round(1000 / (lastTime ? performance.now() - lastTime + 16 : 16))}`, W - 10, H - 10);
  }

  function drawGameOver() {
    draw();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "white";
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
    ctx.font = "24px monospace";
    ctx.fillText(`Score: ${Math.floor(score)}`, W / 2, H / 2 + 30);
  }

  requestAnimationFrame(tick);

  return () => clearInterval(speedInterval);
}
