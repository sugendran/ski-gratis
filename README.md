# Ski ~~Free~~ Gratis

A SkiFree clone built to teach how scrolling games work. Originally written in 2012 using CreateJS, rewritten in TypeScript with zero dependencies.

All the sprites are Japanese kanji: 人 (person), 木 (tree), 岩 (rock), 熊 (bear).

Originally a [blog post](http://www.abandonedexpression.com/post/28482925837/a-quick-game-in-createjs) and a talk at SydJS.

## Running it

```bash
npm install
npm run dev
```

## How a scrolling game works

The player never actually moves. The world moves around them.

This is the single most important concept in building a scrolling game. Once you internalise it, everything else falls into place.

### The illusion of movement

The skier sits at a fixed point — the centre of the canvas. When you press "left", we don't move the skier left. We move every tree, rock, and obstacle to the right. Your brain interprets this as the skier moving left.

```
Frame 1:          Frame 2 (pressed left):

  🌲      人          🌲      人
     🪨                  🪨
  🌲               🌲

              →    Everything shifted right
```

In code, this is just an offset that we adjust each frame:

```typescript
offsetX -= direction * speedX * delta;
```

Every object's screen position is calculated from its grid position plus this offset. The objects don't know they've "moved" — they just get drawn somewhere different.

### The infinite world trick

You can't store an infinite mountain. Instead, the world is a grid that wraps around like a treadmill.

Imagine a conveyor belt of tiles. As the skier "moves down", we take the row that just scrolled off the top and move it to the bottom. The row gets recycled — new random obstacles could be placed on it, or in our case we just reuse what's there.

```
Before scroll:        After scroll:
┌─────────────┐       ┌─────────────┐
│ Row A       │  ←    │ Row B       │
│ Row B       │  off  │ Row C       │
│ Row C       │  screen│ Row D       │
│ Row D       │       │ Row A ← recycled
└─────────────┘       └─────────────┘
```

The same trick works horizontally. This gives us an infinite world using a fixed-size array:

```typescript
// Row scrolled off the top? Move it to the bottom.
if (offsetY < -TILE) {
  grid.push(grid.shift()!);
  offsetY += TILE;
}

// Column scrolled off the left? Move it to the right.
if (offsetX < -TILE) {
  grid.forEach(row => row.push(row.shift()!));
  offsetX += TILE;
}
```

### The game loop

Every frame, we do four things in order:

1. **Update offsets** — move the world based on elapsed time
2. **Wrap the grid** — recycle rows/columns that have scrolled off screen
3. **Check collisions** — is the skier overlapping an obstacle?
4. **Draw everything** — clear the canvas and render the new state

```
requestAnimationFrame(tick)
        │
        ▼
┌──────────────────┐
│ Calculate delta   │  ← time since last frame
│ (elapsed ms)      │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Update offsets    │  ← offsetY -= speed * delta
│                   │     offsetX -= direction * speed * delta
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Wrap grid         │  ← recycle rows/columns
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Check collisions  │  ← skier vs obstacles
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Draw frame        │  ← clear canvas, draw grid, draw skier
└────────┬─────────┘
         ▼
   requestAnimationFrame(tick)
```

Using `delta` (elapsed milliseconds) rather than a fixed step means the game runs at the same speed regardless of frame rate. A fast machine renders more frames, but each frame moves less.

### Collision detection

We use the simplest possible approach: check if the skier's anchor point is close to any obstacle's anchor point.

```typescript
if (
  Math.abs(skierX - objCenterX) < HALF_TILE * 0.6 &&
  Math.abs(skierY - objBottomY) < HALF_TILE * 0.6
) {
  // crash!
}
```

No bounding boxes, no physics engine. For a game with 64x64 tiles where everything is roughly centred, a distance check on the anchor points is good enough.

### Difficulty scaling

The game gets harder over time by increasing the scroll speed:

```typescript
setInterval(() => {
  speedBoost = Math.min(8, speedBoost + baseSpeed * 0.5);
}, 1000);
```

When the player crashes, `speedBoost` resets to zero. This creates a natural rhythm — you go faster, crash, recover, and build speed again.

At 1000 points, the bear (熊) appears and chases you down. Game over.

### Rendering layers

Drawing order matters. We draw in this sequence:

1. **Obstacles** (trees, rocks) — the background layer
2. **Skier** — on top of obstacles so you can see yourself
3. **Bear** — on top of everything
4. **UI** (score, FPS) — always visible

The original CreateJS version used `Container` objects for layering. In raw canvas, drawing order *is* the layer order — whatever you draw last appears on top.

### The skew trick

When the skier turns left or right, we don't swap sprites. We apply a skew transform:

```typescript
ctx.transform(1, 0, skewAmount, 1, 0, 0);
```

This shears the sprite along one axis, giving a cheap but effective sense of direction change. It's a hack, but it works.

## Controls

- **Mouse/touch**: click and drag left or right of the skier
- **Keyboard**: A (left), S (straight), D (right), or arrow keys

## Building

```bash
npm run build    # outputs to dist/
```
