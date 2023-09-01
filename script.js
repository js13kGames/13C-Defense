const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

const player = { x: 400, y: 300, radius: 15, fireRate: 1000, speed: 0.7, crossroads: 100 }; // 플레이어 캐릭터
let experience = 0; // 초기 경험치
let requiredExperience = 100; // 레벨업에 필요한 초기 경험치
let playerLevel = 1; // 레벨
let lives = 100; // 초기 목숨 설정
let isPaused = false; // 게임 일시정지 상태 저장
let isGameStarted = false;
let waitForShoot = false;
const experienceBarHeight = 10; // 경험치바 높이값

const arrows = []; // 화살 배열
let maxArrows = 1; // 동시에 발사 가능한 최대 화살 수
let canShoot = true; // 화살 발사 가능한지 여부를 나타내는 변수
let currentArrows = 0; // 현재 발사된 화살 수
let lastArrowShotTime = 0; // 마지막 화살 발사 시간

// 적 캐릭터 이미지
const destination = { x: 350, y: 350, radius: 25 }; // 적 최종 도달지점
const enemies = []; // 적 배열
const spriteSheet = new Image();
spriteSheet.src = "/asset/horse-run-Sheet.png"; // 스프라이트 시트 이미지 경로
const frameWidth = 32; // 각 프레임의 너비
const frameHeight = 32; // 각 프레임의 높이
let frameCount = 3; // 총 프레임 갯수
// 적 캐릭터의 초기 위치 및 크기
const enemyWidth = frameWidth;
const enemyHeight = frameHeight;
// 적 이동경로
const pathPoints = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 700, y: 100 },
  { x: 700, y: 500 },
  { x: 200, y: 500 },
  { x: 200, y: 350 },
  { x: 350, y: 350 },
];

canvas.addEventListener("click", function() {
  if (!isGameStarted) {
    isGameStarted = true;
    startGame(); // 게임 시작 함수 호출
  }
});

window.addEventListener("keydown", function(event) {
  keys[event.key] = true;
});

window.addEventListener("keyup", function(event) {
  keys[event.key] = false;
});

// 플레이어 캐릭터 사거리 표시
function drawPlayerRange() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + player.crossroads, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 255, 0.3)"; // 파란 투명한 선으로 사거리 원 테두리 그리기
  ctx.lineWidth = 2;
  ctx.stroke();
}

// 적
class Enemy{
  constructor(x, y, speed, maxHealth) {
    this.x = x + 16;
    this.y = y + 16;
    this.speed = speed;
    this.pathIndex = 0; // 현재 경로 인덱스
    this.radius = 20; // 적의 반지름 설정
    this.health = maxHealth; // 최대 체력 설정
    this.maxHealth = maxHealth; // 최대 체력 저장
    this.currentFrame = 0;
    this.currentRow = 0; // 현재 애니메이션 행 초기화
    this.lastUpdateTime = 0; // 마지막 업데이트 시간 초기화
    this.frameRate = 10; // 프레임 전환 속도 조절 (낮을수록 느림)
  }

  takeDamage(damage){
    if (typeof this.health === 'number' && !isNaN(this.health)) {
      this.health -= damage;

      console.log( "health " + this.health + "  damage " + damage);
      if (this.health <= 0) {
        this.destroy();
      }
    }
  }
  destroy(){
    const enemyIndex = enemies.indexOf(this);
    if (enemyIndex !== -1) {
      enemies.splice(enemyIndex, 1);
      experience += 10;
    }
  }
  draw(){
    const spriteX = this.currentFrame * frameWidth; // 스프라이트 시트 내의 x 좌표 계산
    const spriteY = this.currentRow  * frameHeight; // 스프라이트 시트 내의 y 좌표 계산
    ctx.save(); // 현재 캔버스 상태 저장

    if (this.direction === "down") {
      // 아래로 이동할 때 이미지를 수평으로 뒤집음
      ctx.scale(-1, 1); // 이미지를 좌우로 뒤집기
      ctx.drawImage(
          spriteSheet,
          spriteX,
          spriteY,
          frameWidth,
          frameHeight,
          -this.x - enemyWidth / 2, // x 좌표를 음수로 설정하여 좌우 반전
          this.y - enemyHeight / 2,
          64,
          64
      );
    } else {
      ctx.drawImage(
          spriteSheet,
          spriteX,
          spriteY,
          frameWidth,
          frameHeight,
          this.x - enemyWidth / 2,
          this.y - enemyHeight / 2,
          64,
          64
      );
    }
    ctx.restore(); // 이전 캔버스 상태로 복원
  }

  update() {
    const currentTime = new Date().getTime();
    const targetX = pathPoints[this.pathIndex].x;
    const targetY = pathPoints[this.pathIndex].y;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 현재 시간과 마지막 업데이트 시간의 차이 계산
    const deltaTime = currentTime - this.lastUpdateTime;

    // 프레임 전환 속도 조절을 위한 로직
    if (deltaTime >= 1000 / this.frameRate) {
      this.currentFrame++;
      if (this.currentFrame >= frameCount) {
        this.currentFrame = 0; // 다음 프레임으로 넘어갈 때 0으로 초기화
      }
      this.lastUpdateTime = currentTime;
    }

    // 현재 행 업데이트 로직 추가 (현재는 0으로 고정)
    this.currentRow = 0;

    if (distance > this.speed) {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    } else {
      this.pathIndex++;
      if (this.pathIndex >= pathPoints.length) {
        this.pathIndex = 0; // 경로 반복
      }

      // 특정 경로에서 이미지 뒤집기 처리
      if (this.pathIndex === 3 || this.pathIndex === 4) {
        this.direction = "down"; // 아래로 이동할 때 이미지 뒤집기
      } else {
        this.direction = "up"; // 위로 이동할 때 이미지 복원
      }
    }
  }
  drawHealthBar() {
    const barWidth = 30;
    const barHeight = 5;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.radius - 10;

    const healthPercentage = this.health / this.maxHealth;
    const filledWidth = barWidth * healthPercentage;

    ctx.fillStyle = "green"; // Color of the filled part of the health bar
    ctx.fillRect(barX, barY, filledWidth, barHeight);

    ctx.strokeStyle = "black"; // Color of the border of the health bar
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}

// 화살
class Arrow{
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.speed = 7;
    this.targetX = targetX;
    this.targetY = targetY;
    this.radius = 5; // 화살의 반지름 설정
    this.hit = false; // 초기에 화살이 맞았는지 여부를 나타내는 속성 추가
    this.distanceToPlayer = 0; // 플레이어와의 거리 초기화
  }
  update = function() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (!this.hit) {
      if (distance > this.speed) {
        const vx = dx / distance;
        const vy = dy / distance;

        this.x += vx * this.speed;
        this.y += vy * this.speed;
      } else {
        this.hit = true; // 화살이 적에게 도달하여 맞았음을 표시
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          const dx = this.x - enemy.x;
          const dy = this.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < enemy.radius) {
            enemy.takeDamage(1); // 적에게 데미지 입히기
            this.hit = true; // 화살이 적에게 도달하여 맞았음을 표시
            break; // 한 번에 하나의 적에게만 데미지를 입히도록 처리
          }
        }
      }
    }

    // 플레이어와 화살 사이의 거리 계산
    const playerDistanceX = this.x - player.x;
    const playerDistanceY = this.y - player.y;
    this.distanceToPlayer = Math.sqrt(playerDistanceX * playerDistanceX + playerDistanceY * playerDistanceY);

  };

  draw() {
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function shootArrow(playerX, playerY, targetX, targetY) {
  if (currentArrows < maxArrows) {
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= player.radius + player.crossroads) {
      const arrow = new Arrow(playerX, playerY, targetX, targetY);
      arrows.push(arrow);
      currentArrows++;
    }
  }
}

function updateArrows() {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const arrow = arrows[i];
    arrow.update();

    if (arrow.x > canvas.width || arrow.x < 0 || arrow.y > canvas.height || arrow.y < 0 || arrow.hit || arrow.distanceToPlayer > player.radius + player.crossroads) {
      arrows.splice(i, 1);
    }
  }
}
function shootArrows() {
  const currentTime = new Date().getTime();

  if (canShoot && currentTime - lastArrowShotTime >= player.fireRate) {
    const closestEnemy = findClosestEnemy();
    if (closestEnemy) {
      const dx = closestEnemy.x - player.x;
      const dy = closestEnemy.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= player.radius + player.crossroads) {
        shootArrow(player.x, player.y, closestEnemy.x, closestEnemy.y);
        currentArrows++;
        canShoot = false; // 화살 발사 후 쿨타임 시작
        lastArrowShotTime = currentTime;
      }
    }
  } else {
    if (currentTime - lastArrowShotTime >= player.fireRate) {
      canShoot = true; // 쿨타임이 끝나면 다시 화살 발사 가능
      currentArrows = 0;
    }
  }
}

function updatePlayer() {
  const currentTime = new Date().getTime();

  // 화살표 키보드 입력에 따라 플레이어 위치 업데이트
  if (keys.ArrowUp) {
    player.y -= player.speed;
  }
  if (keys.ArrowDown) {
    player.y += player.speed;
  }
  if (keys.ArrowLeft) {
    player.x -= player.speed;
  }
  if (keys.ArrowRight) {
    player.x += player.speed;
  }

  // 화면 경계에서 벗어나지 않도록 제한
  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

  // 플레이어와 가장 가까운 적 찾기
  const closestEnemy = findClosestEnemy();

  // 화살 발사 간격 확인하여 화살 발사
  if (closestEnemy && currentTime - lastArrowShotTime >= player.fireRate && currentArrows < maxArrows) {
    shootArrow(player.x, player.y, closestEnemy.x, closestEnemy.y);
    lastArrowShotTime = currentTime;
  }

  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();


  // 화살 발사 로직 호출
  shootArrows();
  // 추가된 부분: 화살 발사 대기 상태에서 사거리 내에 적이 있는지 확인하여 발사
  if (canShoot && currentTime - lastArrowShotTime >= player.fireRate) {
    if (waitForShoot) {
      const closestEnemy = findClosestEnemy();

      if (closestEnemy) {
        const dx = closestEnemy.x - player.x;
        const dy = closestEnemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= player.radius + player.crossroads) {
          shootArrow(player.x, player.y, closestEnemy.x, closestEnemy.y);
          currentArrows++;
          canShoot = false;
          lastArrowShotTime = currentTime;
          waitForShoot = false; // 발사 완료 시 대기 상태 해제
        }
      }
    }
  }
}

function spawnEnemy() {
  if (isGameStarted && !isPaused) {
    const y = Math.random() * canvas.height; // Y 축 랜덤 위치
    const speed = 1 + Math.random() * 2; // 랜덤 속도
    const maxHealth = 1 + Math.floor(Math.random() * 3); // 최대 체력
    const enemy = new Enemy(0, y, speed, maxHealth);
    enemies.push(enemy);
  }
}
function updateEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    enemy.update();

    if (checkCollision(enemy)) {
      enemy.takeDamage(1);
    } else if (enemy.x > canvas.width) {
      enemy.takeDamage(enemy.health);
      decreaseLives();
    }

    enemy.drawHealthBar();
    enemy.draw();
  }
}

function findClosestEnemy() {
  let closestDistance = Infinity;
  let closestEnemy = null;

  for (const enemy of enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestEnemy = enemy;
    }
  }

  return closestEnemy;
}

function checkCollision(enemy) {
  const dx = enemy.x - destination.x;
  const dy = enemy.y - destination.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < destination.radius) {
    decreaseLives(); // 목적지에 도달한 적 처리
    return true;
  }
  return false;
}

function decreaseLives() {
  lives--;
  if (lives <= 0) {
    // 게임 오버 로직 추가
    alert("GAME OVER");
  }
}

//적 이동길 표시
function drawPath() {
  ctx.strokeStyle = "gray";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (let i = 1; i < pathPoints.length; i++) {
    ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
  }
  ctx.stroke();
}
// 적 최종 도달 지점
function drawDestination() {
  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(destination.x, destination.y, destination.radius, 0, Math.PI * 2);
  ctx.fill();
}
//UI 표시
function drawHUD() {
  // 현재 적 수 표시
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Enemies: " + enemies.length, canvas.width - 100, 30);

  // 현재 목숨 표시
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Lives: " + lives, canvas.width - 100, 60);
}

function drawExperienceBar(x, y, currentExperience, requiredExperience) {
  const percentage = currentExperience / requiredExperience;
  const filledWidth = canvas.width * percentage;

  ctx.fillStyle = "lightgray";
  ctx.fillRect(x, y, canvas.width , experienceBarHeight);

  ctx.fillStyle = "blue";
  ctx.fillRect(x, y, filledWidth, experienceBarHeight);

  ctx.strokeStyle = "black";
  ctx.strokeRect(x, y, canvas.width , experienceBarHeight);
}
//레벨 표시
function drawPlayerLevel() {
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Level: " + playerLevel, 10, 30);
}

spriteSheet.onload = function() {
  setInterval(spawnEnemy, 2000); // 2초마다 적 생성
  updateGameArea();
}


function updateGameArea() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawHUD(); // HUD 그리기
  drawPath();
  drawDestination(); // 목적지 그리기

  if (isGameStarted) {
    if (!isPaused) {
      updateEnemies();
      updatePlayer(); // 플레이어 업데이트
      updateArrows(); // 화살 업데이트
      drawExperienceBar(0, 0, experience, requiredExperience); // 경험치 표시
      drawPlayerLevel(); // 플레이어 레벨 표시
      drawPlayerRange(); // 플레이어 사거리 표시
      levelUp();

      // 화살 발사 로직
      const currentTime = new Date().getTime();

      if (canShoot && currentTime - lastArrowShotTime >= player.fireRate) {
        const closestEnemy = findClosestEnemy();
        if (closestEnemy) {
          shootArrow(player.x, player.y, closestEnemy.x, closestEnemy.y);
          lastArrowShotTime = currentTime;
        }
      }

  // 최대 화살 발사 갯수인 `maxArrows`를 관리하는 부분은 화살을 발사할 때 마다 체크하는 것으로 충분합니다.
      canShoot = currentArrows < maxArrows;


      // 화살 업데이트
      for (let i = 0; i < arrows.length; i++) {
        arrows[i].update();
        arrows[i].draw();

        if (arrows[i].x > canvas.width) {
          arrows.splice(i, 1);
          i--;
        }
      }
      if (lives <= 0) {
        console.log("GAME OVER");
      }
    }
  } else {
    // 게임 시작 화면 그리기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStartScreen();
  }
  requestAnimationFrame(updateGameArea);
}

function drawStartScreen() {
  ctx.fillStyle = "black";
  ctx.font = "24px Arial";
  ctx.fillText("Welcome to the Game!", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "18px Arial";
  ctx.fillText("Click anywhere to start", canvas.width / 2, canvas.height / 2 + 20);
}

function startGame() {
  
}

const levelUpCanvas = document.getElementById("levelUpCanvas");
const levelUpCtx = levelUpCanvas.getContext("2d");

function levelUpKeyDown(event) {
  if (isPaused) {
    const key = event.key;
    if (key === "1" || key === "2" || key === "3") {
      isPaused = false; // 게임 다시 시작
      levelUpCanvas.style.display = "none";
      window.removeEventListener("keydown", levelUpKeyDown);

      // 레벨업 능력치 증가 처리
      if (key === "1") {
        player.speed += 0.2; // 플레이어 속도 증가
      } else if (key === "2") {
        player.fireRate -= 100; // 화살 발사 간격 감소 (빨라짐)
      } else if (key === "3") {
        player.crossroads += 10; // 플레이어 사거리 증가
      }
      // 게임 재개
      isPaused = false; // 게임 다시 시작
    }
  }
}

function levelUp() {
  if (experience >= requiredExperience) {
    experience -= requiredExperience;
    playerLevel++;
    requiredExperience += 50; // 레벨업할 때마다 필요 경험치가 두 배로 증가
    showLevelUpUI(); // 레벨업 UI 표시
  }
}

function showLevelUpUI() {
  isPaused = true; // 게임 일시정지
  levelUpCanvas.style.display = "block";
  levelUpCtx.clearRect(0, 0, levelUpCanvas.width, levelUpCanvas.height);

  // UI 그리기
  levelUpCtx.fillStyle = "white";
  levelUpCtx.fillRect(0, 0, levelUpCanvas.width, levelUpCanvas.height);

  levelUpCtx.fillStyle = "black";
  levelUpCtx.font = "15px Arial";
  levelUpCtx.fillText("Level Up! Choose an ability to increase:", 20, 40);
  levelUpCtx.fillText("1. Increase player speed", 40, 80);
  levelUpCtx.fillText("2. Increase fire rate", 40, 120);
  levelUpCtx.fillText("3. Increase player range", 40, 160);
  window.addEventListener("keydown", levelUpKeyDown);
}