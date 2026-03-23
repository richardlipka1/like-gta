"use strict";
(() => {
  // src/constants.ts
  var CANVAS_WIDTH = 800;
  var CANVAS_HEIGHT = 600;
  var PIXEL_SIZE = 4;
  var TILE_SIZE = 16;
  var TILE_PX = TILE_SIZE * PIXEL_SIZE;
  var MAP_TILES_W = 40;
  var MAP_TILES_H = 30;
  var WORLD_W = MAP_TILES_W * TILE_PX;
  var WORLD_H = MAP_TILES_H * TILE_PX;

  // src/InputHandler.ts
  var InputHandler = class {
    constructor() {
      this.keys = /* @__PURE__ */ new Set();
      this.justPressedKeys = /* @__PURE__ */ new Set();
      window.addEventListener("keydown", (e) => {
        if (!this.keys.has(e.key)) {
          this.justPressedKeys.add(e.key);
        }
        this.keys.add(e.key);
        if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
        }
      });
      window.addEventListener("keyup", (e) => {
        this.keys.delete(e.key);
      });
    }
    isDown(key) {
      return this.keys.has(key);
    }
    justPressed(key) {
      return this.justPressedKeys.has(key);
    }
    clearJustPressed() {
      this.justPressedKeys.clear();
    }
  };

  // src/Camera.ts
  var Camera = class {
    constructor() {
      this.x = 0;
      this.y = 0;
    }
    follow(targetX, targetY, targetW, targetH) {
      this.x = targetX + targetW / 2 - CANVAS_WIDTH / 2;
      this.y = targetY + targetH / 2 - CANVAS_HEIGHT / 2;
      this.x = Math.max(0, Math.min(this.x, WORLD_W - CANVAS_WIDTH));
      this.y = Math.max(0, Math.min(this.y, WORLD_H - CANVAS_HEIGHT));
    }
  };

  // src/map/TileType.ts
  var TILE_COLORS = {
    [0 /* GRASS */]: "#3a7a3a",
    [1 /* ROAD */]: "#555555",
    [2 /* SIDEWALK */]: "#aaaaaa",
    [3 /* BUILDING */]: "#888888"
  };

  // src/map/Building.ts
  var Building = class {
    constructor(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }
    getPixelBounds() {
      return { x: this.x * TILE_PX, y: this.y * TILE_PX, w: this.width * TILE_PX, h: this.height * TILE_PX };
    }
    draw(ctx, camX, camY) {
      const b = this.getPixelBounds();
      const sx = b.x - camX;
      const sy = b.y - camY;
      ctx.fillStyle = this.color;
      ctx.fillRect(sx, sy, b.w, b.h);
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, b.w - 2, b.h - 2);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.label, sx + b.w / 2, sy + b.h / 2);
    }
    collidesWith(ex, ey, ew, eh) {
      const b = this.getPixelBounds();
      return ex < b.x + b.w && ex + ew > b.x && ey < b.y + b.h && ey + eh > b.y;
    }
  };

  // src/map/buildings/Hospital.ts
  var Hospital = class extends Building {
    constructor() {
      super(...arguments);
      this.color = "#dddddd";
      this.label = "HOSPITAL";
    }
  };

  // src/map/buildings/PoliceStation.ts
  var PoliceStation = class extends Building {
    constructor() {
      super(...arguments);
      this.color = "#223366";
      this.label = "POLICE";
    }
  };

  // src/map/buildings/Post.ts
  var Post = class extends Building {
    constructor() {
      super(...arguments);
      this.color = "#ddaa22";
      this.label = "POST";
    }
  };

  // src/map/buildings/Block.ts
  var Block = class extends Building {
    constructor(x, y, w, h, color = "#887766", label = "BLOCK") {
      super(x, y, w, h);
      this.color = color;
      this.label = label;
    }
  };

  // src/map/Street.ts
  var Street = class {
    constructor(x, y, length, horizontal) {
      this.x = x;
      this.y = y;
      this.length = length;
      this.horizontal = horizontal;
    }
    draw(ctx, camX, camY) {
      const px = this.x * TILE_PX - camX;
      const py = this.y * TILE_PX - camY;
      ctx.strokeStyle = "#ffff00";
      ctx.lineWidth = PIXEL_SIZE;
      ctx.setLineDash([TILE_PX / 2, TILE_PX / 2]);
      ctx.beginPath();
      if (this.horizontal) {
        const cy = py + TILE_PX;
        ctx.moveTo(px, cy);
        ctx.lineTo(px + this.length * TILE_PX, cy);
      } else {
        const cx = px + TILE_PX;
        ctx.moveTo(cx, py);
        ctx.lineTo(cx, py + this.length * TILE_PX);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  // src/map/GameMap.ts
  var GameMap = class {
    constructor() {
      this.tiles = [];
      this.buildings = [];
      this.streets = [];
      this.cars = [];
      this.pedestrians = [];
    }
    generate() {
      this.tiles = Array.from({ length: MAP_TILES_H }, () => Array(MAP_TILES_W).fill(0 /* GRASS */));
      const roadRows = [[5, 6], [15, 16], [25, 26]];
      const roadCols = [[5, 6], [15, 16], [25, 26], [35, 36]];
      for (const [r1, r2] of roadRows) {
        for (let c = 0; c < MAP_TILES_W; c++) {
          this.tiles[r1][c] = 1 /* ROAD */;
          this.tiles[r2][c] = 1 /* ROAD */;
        }
        if (r1 > 0)
          for (let c = 0; c < MAP_TILES_W; c++)
            this.tiles[r1 - 1][c] = 2 /* SIDEWALK */;
        if (r2 < MAP_TILES_H - 1)
          for (let c = 0; c < MAP_TILES_W; c++)
            this.tiles[r2 + 1][c] = 2 /* SIDEWALK */;
      }
      for (const [c1, c2] of roadCols) {
        for (let r = 0; r < MAP_TILES_H; r++) {
          this.tiles[r][c1] = 1 /* ROAD */;
          this.tiles[r][c2] = 1 /* ROAD */;
        }
        if (c1 > 0) {
          for (let r = 0; r < MAP_TILES_H; r++) {
            if (this.tiles[r][c1 - 1] === 0 /* GRASS */)
              this.tiles[r][c1 - 1] = 2 /* SIDEWALK */;
          }
        }
        if (c2 < MAP_TILES_W - 1) {
          for (let r = 0; r < MAP_TILES_H; r++) {
            if (this.tiles[r][c2 + 1] === 0 /* GRASS */)
              this.tiles[r][c2 + 1] = 2 /* SIDEWALK */;
          }
        }
      }
      this.buildings = [
        new PoliceStation(8, 8, 6, 4),
        new Hospital(18, 8, 6, 4),
        new Post(28, 8, 4, 4),
        new Block(8, 18, 5, 5, "#887766", "BLOCK"),
        new Block(18, 18, 5, 5, "#776688", "BLOCK"),
        new Block(28, 18, 4, 5, "#668877", "BLOCK"),
        new Block(8, 1, 4, 3, "#998877", "SHOP"),
        new Block(14, 1, 4, 3, "#889977", "GAS"),
        new Block(20, 1, 4, 3, "#779988", "STORE"),
        new Block(28, 1, 4, 3, "#887799", "BANK")
      ];
      for (const b of this.buildings) {
        for (let r = b.y; r < b.y + b.height; r++) {
          for (let c = b.x; c < b.x + b.width; c++) {
            if (r >= 0 && r < MAP_TILES_H && c >= 0 && c < MAP_TILES_W) {
              this.tiles[r][c] = 3 /* BUILDING */;
            }
          }
        }
      }
      for (const [r1] of roadRows) {
        this.streets.push(new Street(0, r1, MAP_TILES_W, true));
      }
      for (const [c1] of roadCols) {
        this.streets.push(new Street(c1, 0, MAP_TILES_H, false));
      }
    }
    drawTiles(ctx, camX, camY) {
      const startCol = Math.floor(camX / TILE_PX);
      const startRow = Math.floor(camY / TILE_PX);
      const endCol = Math.min(MAP_TILES_W, startCol + Math.ceil(CANVAS_WIDTH / TILE_PX) + 1);
      const endRow = Math.min(MAP_TILES_H, startRow + Math.ceil(CANVAS_HEIGHT / TILE_PX) + 1);
      for (let r = Math.max(0, startRow); r < endRow; r++) {
        for (let c = Math.max(0, startCol); c < endCol; c++) {
          const tile = this.tiles[r][c];
          ctx.fillStyle = TILE_COLORS[tile];
          ctx.fillRect(c * TILE_PX - camX, r * TILE_PX - camY, TILE_PX, TILE_PX);
        }
      }
    }
    isWalkable(worldX, worldY) {
      const col = Math.floor(worldX / TILE_PX);
      const row = Math.floor(worldY / TILE_PX);
      if (col < 0 || col >= MAP_TILES_W || row < 0 || row >= MAP_TILES_H)
        return false;
      return this.tiles[row][col] !== 3 /* BUILDING */;
    }
    isSolid(worldX, worldY) {
      const col = Math.floor(worldX / TILE_PX);
      const row = Math.floor(worldY / TILE_PX);
      if (col < 0 || col >= MAP_TILES_W || row < 0 || row >= MAP_TILES_H)
        return true;
      return this.tiles[row][col] === 3 /* BUILDING */;
    }
    isRoad(worldX, worldY) {
      const col = Math.floor(worldX / TILE_PX);
      const row = Math.floor(worldY / TILE_PX);
      if (col < 0 || col >= MAP_TILES_W || row < 0 || row >= MAP_TILES_H)
        return false;
      return this.tiles[row][col] === 1 /* ROAD */;
    }
  };

  // src/entities/Entity.ts
  var Entity = class {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.width = 16;
      this.height = 16;
      this.active = true;
    }
    update(_dt) {
    }
  };

  // src/entities/Character.ts
  var Character = class extends Entity {
    constructor() {
      super(...arguments);
      this.health = 100;
      this.maxHealth = 100;
      this.speed = 80;
      this.direction = "down";
    }
    drawSprite(ctx, sprite, sx, sy) {
      for (let row = 0; row < sprite.length; row++) {
        for (let col = 0; col < sprite[row].length; col++) {
          const color = sprite[row][col];
          if (color !== null) {
            ctx.fillStyle = color;
            ctx.fillRect(sx + col * PIXEL_SIZE, sy + row * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
          }
        }
      }
    }
    isAlive() {
      return this.health > 0;
    }
    takeDamage(amount) {
      this.health = Math.max(0, this.health - amount);
      if (this.health <= 0)
        this.active = false;
    }
  };

  // src/entities/Bullet.ts
  var Bullet = class extends Entity {
    constructor(x, y, dx, dy, owner) {
      super();
      this.speed = 300;
      this.damage = 25;
      this.x = x;
      this.y = y;
      this.dx = dx;
      this.dy = dy;
      this.owner = owner;
      this.width = 4;
      this.height = 4;
    }
    update(dt) {
      this.x += this.dx * this.speed * dt;
      this.y += this.dy * this.speed * dt;
    }
    draw(ctx, camX, camY) {
      ctx.fillStyle = this.owner === "player" ? "#ffff00" : "#ff4400";
      ctx.fillRect(this.x - camX - 2, this.y - camY - 2, PIXEL_SIZE, PIXEL_SIZE);
    }
  };

  // src/sprites.ts
  function makeSprite(rows, colors) {
    return rows.map((row) => row.split("").map((c) => c === "." ? null : colors[c] ?? "#ff00ff"));
  }
  var PLAYER_SPRITES = {
    down: makeSprite(
      ["..hhhh..", ".hSSSh..", ".SBBS...", ".BBBB...", ".BBBB...", ".BllB...", ".ll.ll..", "........"],
      { h: "#4a2c0a", S: "#f5c99c", B: "#2255aa", l: "#1a1a4e" }
    ),
    up: makeSprite(
      ["..hhhh..", ".hBBBh..", ".BBBB...", ".BBBB...", ".BBBB...", ".BllB...", ".ll.ll..", "........"],
      { h: "#4a2c0a", S: "#f5c99c", B: "#2255aa", l: "#1a1a4e" }
    ),
    right: makeSprite(
      [".hh.....", ".hSh....", "..BBB...", "..BBB...", "..BBl...", "..lll...", "..ll....", "........"],
      { h: "#4a2c0a", S: "#f5c99c", B: "#2255aa", l: "#1a1a4e" }
    ),
    left: makeSprite(
      [".....hh.", "....hSh.", "...BBB..", "...BBB..", "...lBB..", "...lll..", "....ll..", "........"],
      { h: "#4a2c0a", S: "#f5c99c", B: "#2255aa", l: "#1a1a4e" }
    )
  };
  var POLICEMAN_SPRITES = {
    down: makeSprite(
      ["..hhhh..", ".hSSSh..", ".SBBS...", ".BBBB...", ".BBBB...", ".BllB...", ".ll.ll..", "........"],
      { h: "#0a0a3a", S: "#f5c99c", B: "#1a3a7a", l: "#1a1a4e" }
    ),
    up: makeSprite(
      ["..hhhh..", ".hBBBh..", ".BBBB...", ".BBBB...", ".BBBB...", ".BllB...", ".ll.ll..", "........"],
      { h: "#0a0a3a", S: "#f5c99c", B: "#1a3a7a", l: "#1a1a4e" }
    ),
    right: makeSprite(
      [".hh.....", ".hSh....", "..BBB...", "..BBB...", "..BBl...", "..lll...", "..ll....", "........"],
      { h: "#0a0a3a", S: "#f5c99c", B: "#1a3a7a", l: "#1a1a4e" }
    ),
    left: makeSprite(
      [".....hh.", "....hSh.", "...BBB..", "...BBB..", "...lBB..", "...lll..", "....ll..", "........"],
      { h: "#0a0a3a", S: "#f5c99c", B: "#1a3a7a", l: "#1a1a4e" }
    )
  };
  function makePedSprites(shirtColor) {
    return {
      down: makeSprite(
        ["..hhhh..", ".hSSSh..", ".SBBS...", ".BBBB...", ".BBBB...", ".BllB...", ".ll.ll..", "........"],
        { h: "#4a2c0a", S: "#f5c99c", B: shirtColor, l: "#1a1a4e" }
      ),
      up: makeSprite(
        ["..hhhh..", ".hBBBh..", ".BBBB...", ".BBBB...", ".BBBB...", ".BllB...", ".ll.ll..", "........"],
        { h: "#4a2c0a", S: "#f5c99c", B: shirtColor, l: "#1a1a4e" }
      ),
      right: makeSprite(
        [".hh.....", ".hSh....", "..BBB...", "..BBB...", "..BBl...", "..lll...", "..ll....", "........"],
        { h: "#4a2c0a", S: "#f5c99c", B: shirtColor, l: "#1a1a4e" }
      ),
      left: makeSprite(
        [".....hh.", "....hSh.", "...BBB..", "...BBB..", "...lBB..", "...lll..", "....ll..", "........"],
        { h: "#4a2c0a", S: "#f5c99c", B: shirtColor, l: "#1a1a4e" }
      )
    };
  }
  var PEDESTRIAN_SPRITES = [
    makePedSprites("#aa2222"),
    makePedSprites("#22aa22"),
    makePedSprites("#aa22aa")
  ];

  // src/entities/Player.ts
  var Player = class _Player extends Character {
    // seconds between shots
    constructor(x, y) {
      super();
      this.inCar = null;
      this.starLevel = 0;
      this.speed = 90;
      this.lives = 3;
      this.shootCooldown = 0;
      this.x = x;
      this.y = y;
      this.width = 8 * PIXEL_SIZE;
      this.height = 8 * PIXEL_SIZE;
      this.health = 100;
      this.maxHealth = 100;
    }
    static {
      this.SHOOT_COOLDOWN = 0.3;
    }
    handleInput(input, dt, bullets, onEnterCar) {
      if (this.inCar)
        return;
      let dx = 0, dy = 0;
      if (input.isDown("ArrowUp") || input.isDown("w") || input.isDown("W")) {
        dy = -1;
        this.direction = "up";
      }
      if (input.isDown("ArrowDown") || input.isDown("s") || input.isDown("S")) {
        dy = 1;
        this.direction = "down";
      }
      if (input.isDown("ArrowLeft") || input.isDown("a") || input.isDown("A")) {
        dx = -1;
        this.direction = "left";
      }
      if (input.isDown("ArrowRight") || input.isDown("d") || input.isDown("D")) {
        dx = 1;
        this.direction = "right";
      }
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }
      this.x += dx * this.speed * dt;
      this.y += dy * this.speed * dt;
      this.shootCooldown -= dt;
      if (input.justPressed(" ") && this.shootCooldown <= 0) {
        this.shootCooldown = _Player.SHOOT_COOLDOWN;
        const bx = this.x + this.width / 2;
        const by = this.y + this.height / 2;
        let bdx = 0, bdy = 0;
        if (this.direction === "up")
          bdy = -1;
        else if (this.direction === "down")
          bdy = 1;
        else if (this.direction === "left")
          bdx = -1;
        else if (this.direction === "right")
          bdx = 1;
        bullets.push(new Bullet(bx, by, bdx, bdy, "player"));
        if (this.starLevel < 3)
          this.starLevel++;
      }
      if (input.justPressed("e") || input.justPressed("E")) {
        onEnterCar();
      }
    }
    update(_dt) {
    }
    draw(ctx, camX, camY) {
      if (this.inCar)
        return;
      const sprite = PLAYER_SPRITES[this.direction];
      this.drawSprite(ctx, sprite, this.x - camX, this.y - camY);
    }
  };

  // src/entities/Policeman.ts
  var Policeman = class _Policeman extends Character {
    // pixels within which police chases
    constructor(x, y, target) {
      super();
      this.speed = 75;
      this.state = "patrol";
      this.shootTimer = 0;
      this.patrolTimer = 0;
      this.patrolInterval = 2 + Math.random() * 2;
      this.x = x;
      this.y = y;
      this.target = target;
      this.width = 8 * PIXEL_SIZE;
      this.height = 8 * PIXEL_SIZE;
      this.health = 100;
    }
    static {
      this.SHOOT_INTERVAL = 1.5;
    }
    static {
      // seconds between police shots
      this.SHOOT_RANGE = 150;
    }
    static {
      // pixels within which police shoots
      this.CHASE_RANGE = 400;
    }
    updateWithBullets(dt, bullets) {
      if (!this.target.active)
        return;
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (this.target.starLevel > 0) {
        if (dist < _Policeman.SHOOT_RANGE) {
          this.state = "shoot";
        } else if (dist < _Policeman.CHASE_RANGE) {
          this.state = "chase";
        } else {
          this.state = "patrol";
        }
      } else {
        this.state = "patrol";
      }
      if (this.state === "chase" || this.state === "shoot") {
        if (dist > 8) {
          const nx = dx / dist;
          const ny = dy / dist;
          this.x += nx * this.speed * dt;
          this.y += ny * this.speed * dt;
          if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? "right" : "left";
          } else {
            this.direction = dy > 0 ? "down" : "up";
          }
        }
        if (this.state === "shoot") {
          this.shootTimer += dt;
          if (this.shootTimer >= _Policeman.SHOOT_INTERVAL) {
            this.shootTimer = 0;
            const norm = dist > 0 ? dist : 1;
            bullets.push(new Bullet(
              this.x + this.width / 2,
              this.y + this.height / 2,
              dx / norm,
              dy / norm,
              "police"
            ));
          }
        }
      } else {
        this.patrolTimer += dt;
        if (this.patrolTimer >= this.patrolInterval) {
          this.patrolTimer = 0;
          this.patrolInterval = 2 + Math.random() * 2;
          const dirs = ["up", "down", "left", "right"];
          this.direction = dirs[Math.floor(Math.random() * 4)];
        }
        if (this.direction === "up")
          this.y -= this.speed * 0.4 * dt;
        else if (this.direction === "down")
          this.y += this.speed * 0.4 * dt;
        else if (this.direction === "left")
          this.x -= this.speed * 0.4 * dt;
        else if (this.direction === "right")
          this.x += this.speed * 0.4 * dt;
      }
    }
    update(_dt) {
    }
    draw(ctx, camX, camY) {
      const sprite = POLICEMAN_SPRITES[this.direction];
      this.drawSprite(ctx, sprite, this.x - camX, this.y - camY);
    }
  };

  // src/Renderer.ts
  var Renderer = class {
    constructor(ctx) {
      this.ctx = ctx;
    }
    draw(map, player, police, bullets, camera, score) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      map.drawTiles(ctx, camera.x, camera.y);
      for (const b of map.buildings) {
        b.draw(ctx, camera.x, camera.y);
      }
      for (const s of map.streets) {
        s.draw(ctx, camera.x, camera.y);
      }
      for (const car of map.cars) {
        if (car.active)
          car.draw(ctx, camera.x, camera.y);
      }
      for (const ped of map.pedestrians) {
        if (ped.active)
          ped.draw(ctx, camera.x, camera.y);
      }
      for (const cop of police) {
        if (cop.active)
          cop.draw(ctx, camera.x, camera.y);
      }
      player.draw(ctx, camera.x, camera.y);
      for (const b of bullets) {
        if (b.active)
          b.draw(ctx, camera.x, camera.y);
      }
      this.drawUI(player, score);
    }
    drawUI(player, score) {
      const ctx = this.ctx;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(10, 10, 104, 14);
      ctx.fillStyle = "#22cc22";
      ctx.fillRect(12, 12, player.health / player.maxHealth * 100, 10);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 104, 14);
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.fillText("HP", 14, 21);
      ctx.fillStyle = "#fff";
      ctx.font = "12px monospace";
      ctx.fillText(`Lives: ${player.lives}`, 10, 40);
      ctx.fillStyle = "#ffff00";
      for (let i = 0; i < player.starLevel; i++) {
        ctx.fillText("\u2605", 10 + i * 16, 58);
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`Score: ${score}`, CANVAS_WIDTH - 10, 24);
      ctx.textAlign = "left";
    }
  };

  // src/entities/vehicles/Car.ts
  var Car = class extends Entity {
    constructor(x, y) {
      super();
      this.driver = null;
      this.direction = "right";
      /** NPC autonomous movement velocity (px/s). Set to non-zero to enable NPC driving. */
      this.npcVelocityX = 0;
      this.npcVelocityY = 0;
      this.x = x;
      this.y = y;
      this.width = 14 * PIXEL_SIZE;
      this.height = 6 * PIXEL_SIZE;
    }
    canEnter(character) {
      const cx = character.x + character.width / 2;
      const cy = character.y + character.height / 2;
      const mx = this.x + this.width / 2;
      const my = this.y + this.height / 2;
      const dx = cx - mx;
      const dy = cy - my;
      return Math.sqrt(dx * dx + dy * dy) < 60;
    }
    enter(character) {
      this.driver = character;
    }
    exit() {
      if (this.driver) {
        this.driver.x = this.x + this.width + 4;
        this.driver.y = this.y;
        this.driver = null;
      }
    }
    handleInput(input, dt) {
      if (!this.driver)
        return;
      let dx = 0, dy = 0;
      if (input.isDown("ArrowUp") || input.isDown("w") || input.isDown("W")) {
        dy = -1;
      }
      if (input.isDown("ArrowDown") || input.isDown("s") || input.isDown("S")) {
        dy = 1;
      }
      if (input.isDown("ArrowLeft") || input.isDown("a") || input.isDown("A")) {
        dx = -1;
      }
      if (input.isDown("ArrowRight") || input.isDown("d") || input.isDown("D")) {
        dx = 1;
      }
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }
      this.x += dx * this.carSpeed * dt;
      this.y += dy * this.carSpeed * dt;
      this.driver.x = this.x;
      this.driver.y = this.y;
      this.updateDirection(dx, dy);
    }
    /** Autonomous NPC driving — moves the car when no player is driving. */
    updateNpc(dt, isRoad) {
      if (this.driver || this.npcVelocityX === 0 && this.npcVelocityY === 0)
        return;
      const nextX = this.x + this.npcVelocityX * dt;
      const nextY = this.y + this.npcVelocityY * dt;
      const cx = nextX + this.width / 2;
      const cy = nextY + this.height / 2;
      const offWorld = nextX < 0 || nextX + this.width > WORLD_W || nextY < 0 || nextY + this.height > WORLD_H;
      if (offWorld || !isRoad(cx, cy)) {
        this.npcVelocityX *= -1;
        this.npcVelocityY *= -1;
      } else {
        this.x = nextX;
        this.y = nextY;
      }
      this.updateDirection(this.npcVelocityX, this.npcVelocityY);
    }
    updateDirection(dx, dy) {
      if (dx > 0)
        this.direction = "right";
      else if (dx < 0)
        this.direction = "left";
      else if (dy > 0)
        this.direction = "down";
      else if (dy < 0)
        this.direction = "up";
    }
    update(_dt) {
    }
    draw(ctx, camX, camY) {
      const sx = this.x - camX;
      const sy = this.y - camY;
      ctx.save();
      const facingLeft = this.direction === "left";
      if (facingLeft) {
        ctx.translate(sx + this.width, sy);
        ctx.scale(-1, 1);
        this.drawCarBody(ctx, 0, 0);
      } else {
        this.drawCarBody(ctx, sx, sy);
      }
      ctx.restore();
    }
    drawCarBody(ctx, ox, oy) {
      ctx.fillStyle = this.color;
      ctx.fillRect(ox, oy, this.width, this.height);
      ctx.fillStyle = "#222222";
      ctx.fillRect(ox, oy, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
      ctx.fillRect(ox + this.width - PIXEL_SIZE * 2, oy, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
      ctx.fillRect(ox, oy + this.height - PIXEL_SIZE * 2, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
      ctx.fillRect(ox + this.width - PIXEL_SIZE * 2, oy + this.height - PIXEL_SIZE * 2, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
      ctx.fillStyle = "#aaddff";
      ctx.fillRect(ox + PIXEL_SIZE * 3, oy + PIXEL_SIZE, PIXEL_SIZE * 4, PIXEL_SIZE * 2);
      ctx.fillRect(ox + PIXEL_SIZE * 8, oy + PIXEL_SIZE, PIXEL_SIZE * 3, PIXEL_SIZE * 2);
    }
  };

  // src/entities/vehicles/VWBeetle.ts
  var VWBeetle = class extends Car {
    constructor(x, y) {
      super(x, y);
      this.color = "#ffdd44";
      this.carSpeed = 100;
      this.width = 12 * 4;
      this.height = 6 * 4;
    }
  };

  // src/entities/vehicles/Porsche.ts
  var Porsche = class extends Car {
    constructor(x, y) {
      super(x, y);
      this.color = "#cc2222";
      this.carSpeed = 160;
      this.width = 14 * 4;
      this.height = 5 * 4;
    }
  };

  // src/entities/vehicles/PoliceCar.ts
  var PoliceCar = class extends Car {
    constructor() {
      super(...arguments);
      this.color = "#111111";
      this.carSpeed = 120;
    }
  };

  // src/entities/vehicles/Van.ts
  var Van = class extends Car {
    constructor(x, y) {
      super(x, y);
      this.color = "#336699";
      this.carSpeed = 80;
      this.width = 18 * 4;
      this.height = 8 * 4;
    }
  };

  // src/entities/vehicles/Ambulance.ts
  var Ambulance = class extends Car {
    constructor(x, y) {
      super(x, y);
      this.color = "#eeeeee";
      this.carSpeed = 110;
      this.width = 16 * 4;
      this.height = 8 * 4;
    }
  };

  // src/entities/Pedestrian.ts
  var Pedestrian = class extends Character {
    constructor(x, y, pedType = 0) {
      super();
      this.speed = 40;
      this.timer = 0;
      this.changeInterval = 2 + Math.random() * 2;
      this.x = x;
      this.y = y;
      this.pedType = pedType % 3;
      this.width = 8 * PIXEL_SIZE;
      this.height = 8 * PIXEL_SIZE;
      const dirs = ["up", "down", "left", "right"];
      this.direction = dirs[Math.floor(Math.random() * 4)];
    }
    update(dt) {
      this.timer += dt;
      if (this.timer >= this.changeInterval) {
        this.timer = 0;
        this.changeInterval = 2 + Math.random() * 2;
        const dirs = ["up", "down", "left", "right"];
        this.direction = dirs[Math.floor(Math.random() * 4)];
      }
      if (this.direction === "up")
        this.y -= this.speed * dt;
      else if (this.direction === "down")
        this.y += this.speed * dt;
      else if (this.direction === "left")
        this.x -= this.speed * dt;
      else if (this.direction === "right")
        this.x += this.speed * dt;
    }
    draw(ctx, camX, camY) {
      const sprites = PEDESTRIAN_SPRITES[this.pedType];
      const sprite = sprites[this.direction];
      this.drawSprite(ctx, sprite, this.x - camX, this.y - camY);
    }
  };

  // src/SoundManager.ts
  var SoundManager = class _SoundManager {
    constructor() {
      this.audioCtx = null;
      this.engineOsc = null;
      this.engineGain = null;
      this.walkTimer = 0;
    }
    static {
      this.WALK_INTERVAL = 0.28;
    }
    static {
      this.SHOOT_FREQ_START = 880;
    }
    static {
      this.SHOOT_FREQ_END = 110;
    }
    static {
      this.SHOOT_DURATION = 0.18;
    }
    static {
      this.SHOOT_GAIN = 0.25;
    }
    static {
      this.HORN_FREQ = 466;
    }
    static {
      this.HORN_GAIN = 0.2;
    }
    static {
      this.HORN_DURATION = 0.45;
    }
    static {
      this.WALK_FREQ = 130;
    }
    static {
      this.WALK_GAIN = 0.07;
    }
    static {
      this.WALK_DURATION = 0.07;
    }
    static {
      this.ENGINE_FREQ_IDLE = 55;
    }
    static {
      this.ENGINE_FREQ_MOVING = 110;
    }
    static {
      this.ENGINE_GAIN_IDLE = 0.05;
    }
    static {
      this.ENGINE_GAIN_MOVING = 0.09;
    }
    static {
      this.ENGINE_GAIN_START = 0.06;
    }
    static {
      this.ENGINE_RAMP_TIME = 0.15;
    }
    getCtx() {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtx();
      }
      return this.audioCtx;
    }
    playShoot() {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(_SoundManager.SHOOT_FREQ_START, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(_SoundManager.SHOOT_FREQ_END, ctx.currentTime + _SoundManager.SHOOT_DURATION);
      gain.gain.setValueAtTime(_SoundManager.SHOOT_GAIN, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + _SoundManager.SHOOT_DURATION);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + _SoundManager.SHOOT_DURATION);
    }
    playHorn() {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(_SoundManager.HORN_FREQ, ctx.currentTime);
      gain.gain.setValueAtTime(_SoundManager.HORN_GAIN, ctx.currentTime);
      gain.gain.setValueAtTime(_SoundManager.HORN_GAIN, ctx.currentTime + 0.32);
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + _SoundManager.HORN_DURATION);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + _SoundManager.HORN_DURATION);
    }
    updateWalk(isWalking, dt) {
      if (!isWalking) {
        this.walkTimer = 0;
        return;
      }
      this.walkTimer -= dt;
      if (this.walkTimer <= 0) {
        this.walkTimer = _SoundManager.WALK_INTERVAL;
        this.playFootstep();
      }
    }
    playFootstep() {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(_SoundManager.WALK_FREQ, ctx.currentTime);
      gain.gain.setValueAtTime(_SoundManager.WALK_GAIN, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + _SoundManager.WALK_DURATION);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + _SoundManager.WALK_DURATION);
    }
    startEngine() {
      if (this.engineOsc)
        return;
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(_SoundManager.ENGINE_FREQ_IDLE, ctx.currentTime);
      gain.gain.setValueAtTime(_SoundManager.ENGINE_GAIN_START, ctx.currentTime);
      osc.start(ctx.currentTime);
      this.engineOsc = osc;
      this.engineGain = gain;
    }
    updateEngine(isMoving) {
      if (!this.engineOsc || !this.engineGain)
        return;
      const ctx = this.getCtx();
      const targetFreq = isMoving ? _SoundManager.ENGINE_FREQ_MOVING : _SoundManager.ENGINE_FREQ_IDLE;
      const targetGain = isMoving ? _SoundManager.ENGINE_GAIN_MOVING : _SoundManager.ENGINE_GAIN_IDLE;
      this.engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, _SoundManager.ENGINE_RAMP_TIME);
      this.engineGain.gain.setTargetAtTime(targetGain, ctx.currentTime, _SoundManager.ENGINE_RAMP_TIME);
    }
    stopEngine() {
      if (!this.engineOsc || !this.engineGain)
        return;
      const ctx = this.getCtx();
      this.engineGain.gain.setTargetAtTime(1e-3, ctx.currentTime, 0.1);
      this.engineOsc.stop(ctx.currentTime + 0.4);
      this.engineOsc = null;
      this.engineGain = null;
    }
  };

  // src/Game.ts
  var Game = class _Game {
    constructor(canvas2) {
      this.police = [];
      this.bullets = [];
      this.running = false;
      this.score = 0;
      this.lastTime = 0;
      this.gameOverTimer = 0;
      this.gameOver = false;
      this.canvas = canvas2;
      this.ctx = canvas2.getContext("2d");
      this.input = new InputHandler();
      this.camera = new Camera();
      this.map = new GameMap();
      this.player = new Player(10 * TILE_PX, 10 * TILE_PX);
      this.renderer = new Renderer(this.ctx);
      this.sounds = new SoundManager();
    }
    init() {
      this.canvas.width = CANVAS_WIDTH;
      this.canvas.height = CANVAS_HEIGHT;
      this.initializeEntities();
      this.running = true;
      requestAnimationFrame((t) => this.gameLoop(t));
    }
    static {
      this.PED_POSITIONS = [
        [7, 12],
        [9, 12],
        [12, 12],
        [20, 12],
        [22, 12],
        [30, 12],
        [7, 20],
        [20, 20],
        [30, 20]
      ];
    }
    initializeEntities() {
      this.map.generate();
      for (let i = 0; i < _Game.PED_POSITIONS.length; i++) {
        const [tx, ty] = _Game.PED_POSITIONS[i];
        this.map.pedestrians.push(new Pedestrian(tx * TILE_PX, ty * TILE_PX, i % 3));
      }
      const beetle = new VWBeetle(12 * TILE_PX, 5 * TILE_PX);
      beetle.npcVelocityX = 70;
      this.map.cars.push(beetle);
      const porsche = new Porsche(20 * TILE_PX, 5 * TILE_PX);
      porsche.npcVelocityX = -90;
      this.map.cars.push(porsche);
      const van = new Van(9 * TILE_PX, 15 * TILE_PX);
      van.npcVelocityX = 55;
      this.map.cars.push(van);
      const ambulance = new Ambulance(22 * TILE_PX, 15 * TILE_PX);
      ambulance.npcVelocityX = -65;
      this.map.cars.push(ambulance);
      const policeCar = new PoliceCar(30 * TILE_PX, 15 * TILE_PX);
      policeCar.npcVelocityX = 80;
      this.map.cars.push(policeCar);
      this.police.push(new Policeman(12 * TILE_PX, 12 * TILE_PX, this.player));
      this.police.push(new Policeman(20 * TILE_PX, 20 * TILE_PX, this.player));
      this.police.push(new Policeman(30 * TILE_PX, 10 * TILE_PX, this.player));
    }
    gameLoop(timestamp) {
      const dt = Math.min((timestamp - this.lastTime) / 1e3, 0.05);
      this.lastTime = timestamp;
      this.update(dt);
      this.draw();
      this.input.clearJustPressed();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
    update(dt) {
      if (this.gameOver) {
        this.gameOverTimer += dt;
        if (this.gameOverTimer > 3 || this.input.justPressed("r") || this.input.justPressed("R")) {
          this.reset();
        }
        return;
      }
      if (this.player.inCar) {
        const prevX = this.player.inCar.x;
        const prevY = this.player.inCar.y;
        this.player.inCar.handleInput(this.input, dt);
        const isMoving = this.player.inCar.x !== prevX || this.player.inCar.y !== prevY;
        this.sounds.updateEngine(isMoving);
        if (this.input.justPressed("h") || this.input.justPressed("H")) {
          this.sounds.playHorn();
        }
        if (this.input.justPressed("e") || this.input.justPressed("E")) {
          const car = this.player.inCar;
          this.player.inCar = null;
          car.exit();
          this.sounds.stopEngine();
        }
      } else {
        const prevX = this.player.x;
        const prevY = this.player.y;
        const bulletsBefore = this.bullets.length;
        this.player.handleInput(this.input, dt, this.bullets, () => this.handleEnterCar());
        const isWalking = this.player.x !== prevX || this.player.y !== prevY;
        this.sounds.updateWalk(isWalking, dt);
        if (this.bullets.length > bulletsBefore) {
          this.sounds.playShoot();
        }
      }
      this.player.update(dt);
      this.clampToWorld(this.player);
      if (!this.player.inCar) {
        this.resolvePlayerBuildingCollision();
      }
      for (const cop of this.police) {
        cop.updateWithBullets(dt, this.bullets);
        this.clampToWorld(cop);
      }
      for (const ped of this.map.pedestrians) {
        ped.update(dt);
        this.clampToWorld(ped);
      }
      for (const car of this.map.cars) {
        car.updateNpc(dt, (x, y) => this.map.isRoad(x, y));
      }
      for (const b of this.bullets) {
        b.update(dt);
        if (this.map.isSolid(b.x, b.y))
          b.active = false;
        if (b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H)
          b.active = false;
      }
      this.checkCollisions();
      this.bullets = this.bullets.filter((b) => b.active);
      this.police = this.police.filter((c) => c.active);
      if (this.player.starLevel > 0 && this.police.length < this.player.starLevel * 2) {
        this.spawnPolice();
      }
      this.score += Math.floor(dt * 10);
      if (this.player.inCar) {
        this.camera.follow(this.player.inCar.x, this.player.inCar.y, this.player.inCar.width, this.player.inCar.height);
      } else {
        this.camera.follow(this.player.x, this.player.y, this.player.width, this.player.height);
      }
      if (!this.player.active && this.player.health <= 0) {
        this.player.lives--;
        if (this.player.lives <= 0) {
          this.gameOver = true;
          this.gameOverTimer = 0;
        } else {
          this.player.health = this.player.maxHealth;
          this.player.active = true;
          this.player.x = 10 * TILE_PX;
          this.player.y = 10 * TILE_PX;
          this.player.starLevel = 0;
        }
      }
    }
    handleEnterCar() {
      if (this.player.inCar)
        return;
      for (const car of this.map.cars) {
        if (car.canEnter(this.player)) {
          car.enter(this.player);
          this.player.inCar = car;
          this.sounds.startEngine();
          break;
        }
      }
    }
    resolvePlayerBuildingCollision() {
      for (const building of this.map.buildings) {
        if (building.collidesWith(this.player.x, this.player.y, this.player.width, this.player.height)) {
          const b = building.getPixelBounds();
          const overlapLeft = this.player.x + this.player.width - b.x;
          const overlapRight = b.x + b.w - this.player.x;
          const overlapTop = this.player.y + this.player.height - b.y;
          const overlapBottom = b.y + b.h - this.player.y;
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          if (minOverlap === overlapLeft)
            this.player.x = b.x - this.player.width;
          else if (minOverlap === overlapRight)
            this.player.x = b.x + b.w;
          else if (minOverlap === overlapTop)
            this.player.y = b.y - this.player.height;
          else
            this.player.y = b.y + b.h;
        }
      }
    }
    clampToWorld(entity) {
      entity.x = Math.max(0, Math.min(entity.x, WORLD_W - entity.width));
      entity.y = Math.max(0, Math.min(entity.y, WORLD_H - entity.height));
    }
    checkCollisions() {
      for (const bullet of this.bullets) {
        if (!bullet.active)
          continue;
        if (bullet.owner === "player") {
          for (const cop of this.police) {
            if (!cop.active)
              continue;
            if (this.overlaps(bullet, cop)) {
              cop.takeDamage(bullet.damage);
              bullet.active = false;
              this.score += 100;
              break;
            }
          }
        }
        if (bullet.owner === "police") {
          if (!this.player.inCar && this.overlaps(bullet, this.player)) {
            this.player.takeDamage(bullet.damage);
            bullet.active = false;
            if (this.player.starLevel < 5)
              this.player.starLevel++;
          }
        }
      }
    }
    overlaps(a, b) {
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }
    spawnPolice() {
      const roadTiles = [
        [5 * TILE_PX, 5 * TILE_PX],
        [15 * TILE_PX, 15 * TILE_PX],
        [25 * TILE_PX, 25 * TILE_PX],
        [35 * TILE_PX, 5 * TILE_PX]
      ];
      const pos = roadTiles[Math.floor(Math.random() * roadTiles.length)];
      this.police.push(new Policeman(pos[0], pos[1], this.player));
    }
    draw() {
      this.renderer.draw(this.map, this.player, this.police, this.bullets, this.camera, this.score);
      if (this.gameOver) {
        const ctx = this.ctx;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#ff2222";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "20px monospace";
        ctx.fillText(`Score: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.fillText("Press R to restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
        ctx.textAlign = "left";
      }
    }
    reset() {
      this.sounds.stopEngine();
      this.score = 0;
      this.gameOver = false;
      this.gameOverTimer = 0;
      this.police = [];
      this.bullets = [];
      this.player = new Player(10 * TILE_PX, 10 * TILE_PX);
      this.map = new GameMap();
      this.initializeEntities();
    }
  };

  // src/main.ts
  var canvas = document.getElementById("gameCanvas");
  var game = new Game(canvas);
  game.init();
})();
