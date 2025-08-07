import * as THREE from "three";

const scene = new THREE.Scene();

const frustumSize = 20; // visible area
const aspect = window.innerWidth / window.innerHeight;

const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  1000
);

// top down view
camera.position.set(0, 20, 0);
camera.rotation.x = -Math.PI / 2;

const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
light.position.set(0, 5, 0);
scene.add(light);

// Render
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// UI Elements
const uiContainer = document.createElement('div');
uiContainer.style.position = 'absolute';
uiContainer.style.top = '20px';
uiContainer.style.left = '20px';
uiContainer.style.color = 'white';
uiContainer.style.fontFamily = 'Arial, sans-serif';
uiContainer.style.fontSize = '16px';
uiContainer.style.zIndex = '100';
document.body.appendChild(uiContainer);

// Health bar
const healthBar = document.createElement('div');
healthBar.style.width = '200px';
healthBar.style.height = '20px';
healthBar.style.border = '2px solid white';
healthBar.style.marginBottom = '10px';
uiContainer.appendChild(healthBar);

const healthFill = document.createElement('div');
healthFill.style.height = '100%';
healthFill.style.backgroundColor = '#ff0000';
healthFill.style.transition = 'width 0.1s';
healthBar.appendChild(healthFill);

const healthText = document.createElement('div');
healthText.style.marginBottom = '10px';
uiContainer.appendChild(healthText);

// Ammo bar
const ammoBar = document.createElement('div');
ammoBar.style.width = '200px';
ammoBar.style.height = '20px';
ammoBar.style.border = '2px solid white';
ammoBar.style.marginBottom = '10px';
uiContainer.appendChild(ammoBar);

const ammoFill = document.createElement('div');
ammoFill.style.height = '100%';
ammoFill.style.backgroundColor = '#00ff00';
ammoFill.style.transition = 'width 0.1s';
ammoBar.appendChild(ammoFill);

const ammoText = document.createElement('div');
uiContainer.appendChild(ammoText);

// Pause indicator
const pauseText = document.createElement('div');
pauseText.style.position = 'absolute';
pauseText.style.top = '50%';
pauseText.style.left = '50%';
pauseText.style.transform = 'translate(-50%, -50%)';
pauseText.style.color = 'white';
pauseText.style.fontFamily = 'Arial, sans-serif';
pauseText.style.fontSize = '48px';
pauseText.style.fontWeight = 'bold';
pauseText.style.zIndex = '200';
pauseText.style.display = 'none';
pauseText.textContent = 'PAUSED - Press ESC to resume';
document.body.appendChild(pauseText);

// Game over screen
const gameOverText = document.createElement('div');
gameOverText.style.position = 'absolute';
gameOverText.style.top = '50%';
gameOverText.style.left = '50%';
gameOverText.style.transform = 'translate(-50%, -50%)';
gameOverText.style.color = 'red';
gameOverText.style.fontFamily = 'Arial, sans-serif';
gameOverText.style.fontSize = '64px';
gameOverText.style.fontWeight = 'bold';
gameOverText.style.zIndex = '300';
gameOverText.style.display = 'none';
gameOverText.style.textAlign = 'center';
gameOverText.innerHTML = 'GAME OVER<br><span style="font-size: 24px;">Refresh to play again</span>';
document.body.appendChild(gameOverText);

// Cube
const geometry = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
const cube = new THREE.Mesh(geometry, material);
cube.frustumCulled = false; // ensure always rendered in top-down ortho
cube.position.set(0, 0.5, 0);
scene.add(cube);

// Aiming logic
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// mouse coordinates
const pointer = new THREE.Vector2();
let targetPoint = new THREE.Vector3();

// bullet system with object pooling
const bullets: THREE.Mesh[] = [];
const bulletPool: THREE.Mesh[] = [];
const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const bulletSpeed = 0.5;
const maxBulletPoolSize = 50;

// enemy system with object pooling
const enemies: THREE.Mesh[] = [];
const enemyPool: THREE.Mesh[] = [];
const enemyGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const enemySpeed = 0.02;
const enemyDamage = 1;
const enemySpawnRate = 2000; // milliseconds
let lastEnemySpawnTime = 0;
const enemyMaxHealth = 3;
const bulletDamage = 1;
const maxEnemyPoolSize = 30;

// shooting state
let isMouseDown = false;
let lastShotTime = 0;
const shootingRate = 100; // milliseconds between shots

// ammo system
const maxAmmo = 20;
let currentAmmo = maxAmmo;
const reloadRate = 50; // ammo per second
let lastReloadTime = 0;

// health system
const maxHealth = 100;
let currentHealth = maxHealth;

// performance monitoring
let frameCount = 0;
let lastFPSTime = Date.now();
let currentFPS = 0;

// game state
let isPaused = false;
let isGameOver = false;

// cube physics
const cubeVelocity = new THREE.Vector3(0, 0, 0);
const knockbackForce = 0.1;
const friction = 0.95;

function updateEnemyColor(enemy: THREE.Mesh) {
  const healthPercentage = enemy.userData.health / enemyMaxHealth;
  const material = enemy.material as THREE.MeshBasicMaterial;
  
  if (healthPercentage <= 0) {
    material.color.setRGB(1, 0, 0); // red - dead
  } else if (healthPercentage <= 0.33) {
    material.color.setRGB(1, 0, 0); // red - very low health
  } else if (healthPercentage <= 0.66) {
    material.color.setRGB(0.5, 0, 0.5); // purple - medium health
  } else {
    material.color.setRGB(0, 0, 1); // blue - high health
  }
}

// reusable vectors to avoid garbage collection
const tempVector1 = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();

// boundary limits based on camera frustum
const boundaryX = frustumSize * aspect / 2;
const boundaryZ = frustumSize / 2;


// visual indicator for aiming point 
const aimMarkerGeometry = new THREE.RingGeometry(0.2, 0.3, 32);
const aimMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
const aimMarker = new THREE.Mesh(aimMarkerGeometry, aimMarkerMaterial);
aimMarker.rotation.x = -Math.PI / 2;
aimMarker.visible = false;
scene.add(aimMarker);

function updateAiming(event: MouseEvent) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.ray.intersectPlane(groundPlane, targetPoint);

  if (intersects) {
    cube.lookAt(targetPoint);
    aimMarker.position.copy(targetPoint);
    aimMarker.visible = true;
  } else {
    aimMarker.visible = false;
  }
}

window.addEventListener("pointermove", updateAiming);

function getBulletFromPool(): THREE.Mesh {
  if (bulletPool.length > 0) {
    const b = bulletPool.pop()!;
    // ensure shared geometry/material are intact
    b.geometry = bulletGeometry;
    b.material = bulletMaterial;
    return b;
  }
  return new THREE.Mesh(bulletGeometry, bulletMaterial);
}

function returnBulletToPool(bullet: THREE.Mesh) {
  bullet.visible = false;
  scene.remove(bullet);
  if (bulletPool.length < maxBulletPoolSize) {
    bulletPool.push(bullet);
  }
}

function shootBullet() {
  if (targetPoint && currentAmmo > 0) {
    const bullet = getBulletFromPool();
    bullet.position.copy(cube.position);
    bullet.position.y += 0.5;
    bullet.visible = true;
    
    const direction = tempVector1
      .subVectors(targetPoint, cube.position)
      .normalize();
    
    bullet.userData = { direction: direction.clone() };
    bullets.push(bullet);
    scene.add(bullet);
    
    // apply knockback to cube (reuse tempVector2)
    tempVector2.copy(direction).multiplyScalar(-knockbackForce);
    cubeVelocity.add(tempVector2);
    
    // consume ammo
    currentAmmo--;
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const direction = bullet.userData.direction;
    
    bullet.position.add(tempVector1.copy(direction).multiplyScalar(bulletSpeed));
    
    // check collision with enemies
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (bullet.position.distanceToSquared(enemy.position) < 0.6 * 0.6) {
        // damage enemy
        enemy.userData.health -= bulletDamage;
        
        // update enemy color (optimized)
        updateEnemyColor(enemy);
        
        // remove bullet and continue to next
        returnBulletToPool(bullet);
        bullets.splice(i, 1);
        continue;
        
        // remove enemy if health <= 0
        if (enemy.userData.health <= 0) {
          returnEnemyToPool(enemy);
          enemies.splice(j, 1);
        }
        
        break;
      }
    }
    
    // remove bullets that hit screen boundaries immediately
    if (Math.abs(bullet.position.x) > boundaryX || 
        Math.abs(bullet.position.z) > boundaryZ) {
      returnBulletToPool(bullet);
      bullets.splice(i, 1);
    }
  }
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    
    // move enemy toward cube
    tempVector2.subVectors(cube.position, enemy.position).normalize();
    enemy.position.add(tempVector1.copy(tempVector2).multiplyScalar(enemySpeed));
    
    // check collision with cube (attack)
    if (enemy.position.distanceToSquared(cube.position) < 1.2 * 1.2) {
      currentHealth = Math.max(0, currentHealth - enemyDamage);
      returnEnemyToPool(enemy);
      enemies.splice(i, 1);
    }
  }
}

window.addEventListener("click", shootBullet);

window.addEventListener("mousedown", (event) => {
  if (event.button === 0) { // left mouse button
    isMouseDown = true;
  }
});

window.addEventListener("mouseup", (event) => {
  if (event.button === 0) { // left mouse button
    isMouseDown = false;
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    isPaused = !isPaused;
  }
});

function getEnemyFromPool(): THREE.Mesh {
  if (enemyPool.length > 0) {
    const enemy = enemyPool.pop()!;
    // reset enemy color to blue
    (enemy.material as THREE.MeshBasicMaterial).color.setRGB(0, 0, 1);
    return enemy;
  }
  // create new enemy with its own material to prevent color conflicts
  const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  return new THREE.Mesh(enemyGeometry, material);
}

function returnEnemyToPool(enemy: THREE.Mesh) {
  enemy.visible = false;
  scene.remove(enemy);
  if (enemyPool.length < maxEnemyPoolSize) {
    enemyPool.push(enemy);
  } else {
    (enemy.material as THREE.MeshBasicMaterial).dispose();
  }
}

function spawnEnemy() {
  const enemy = getEnemyFromPool();
  enemy.visible = true;
  
  // spawn at random position on edge of screen
  const side = Math.floor(Math.random() * 4);
  const offsetX = (Math.random() - 0.5) * boundaryX * 2;
  const offsetZ = (Math.random() - 0.5) * boundaryZ * 2;
  
  switch (side) {
    case 0: // top
      enemy.position.set(offsetX, 0.4, boundaryZ);
      break;
    case 1: // right
      enemy.position.set(boundaryX, 0.4, offsetZ);
      break;
    case 2: // bottom
      enemy.position.set(offsetX, 0.4, -boundaryZ);
      break;
    case 3: // left
      enemy.position.set(-boundaryX, 0.4, offsetZ);
      break;
  }
  
  // add health to enemy
  enemy.userData = { health: enemyMaxHealth };
  
  enemies.push(enemy);
  scene.add(enemy);
}

function gameLoop() {
  // FPS monitoring
  frameCount++;
  const now = Date.now();
  if (now - lastFPSTime >= 1000) {
    currentFPS = Math.round((frameCount * 1000) / (now - lastFPSTime));
    frameCount = 0;
    lastFPSTime = now;
  }
  
  // check for game over
  if (currentHealth <= 0 && !isGameOver) {
    isGameOver = true;
  }
  
  // show/hide pause and game over indicators
  pauseText.style.display = isPaused ? 'block' : 'none';
  gameOverText.style.display = isGameOver ? 'block' : 'none';
  
  if (!isPaused && !isGameOver) {
    updateBullets();
    updateEnemies();
    
    const currentTime = Date.now();
    
    // spawn enemies
    if (currentTime - lastEnemySpawnTime >= enemySpawnRate) {
      spawnEnemy();
      lastEnemySpawnTime = currentTime;
    }
    
    // ammo reload system
    if (!isMouseDown && currentAmmo < maxAmmo) {
      if (currentTime - lastReloadTime >= (1000 / reloadRate)) {
        currentAmmo++;
        lastReloadTime = currentTime;
      }
    }
    
    // continuous shooting while mouse is held down
    if (isMouseDown && targetPoint && currentAmmo > 0) {
      if (currentTime - lastShotTime >= shootingRate) {
        shootBullet();
        lastShotTime = currentTime;
      }
    }
    
    // update cube physics
    cube.position.add(cubeVelocity);
    cubeVelocity.multiplyScalar(friction);
    // keep cube on ground plane
    cube.position.y = 0.5;
    
    // boundary collision detection with randomized knockback
    const minKnockback = 0.05;
    const maxKnockback = 0.4; // can launch across the screen
    const edgeDamage = 10;
    
    if (cube.position.x > boundaryX) {
      cube.position.x = boundaryX;
      const knockback = minKnockback + Math.random() * (maxKnockback - minKnockback);
      cubeVelocity.x = -knockback; // knockback away from edge
      currentHealth = Math.max(0, currentHealth - edgeDamage);
    }
    if (cube.position.x < -boundaryX) {
      cube.position.x = -boundaryX;
      const knockback = minKnockback + Math.random() * (maxKnockback - minKnockback);
      cubeVelocity.x = knockback; // knockback away from edge
      currentHealth = Math.max(0, currentHealth - edgeDamage);
    }
    if (cube.position.z > boundaryZ) {
      cube.position.z = boundaryZ;
      const knockback = minKnockback + Math.random() * (maxKnockback - minKnockback);
      cubeVelocity.z = -knockback; // knockback away from edge
      currentHealth = Math.max(0, currentHealth - edgeDamage);
    }
    if (cube.position.z < -boundaryZ) {
      cube.position.z = -boundaryZ;
      const knockback = minKnockback + Math.random() * (maxKnockback - minKnockback);
      cubeVelocity.z = knockback; // knockback away from edge
      currentHealth = Math.max(0, currentHealth - edgeDamage);
    }
    
    // camera follows cube
    // camera.position.x = cube.position.x;
    // camera.position.z = cube.position.z;
  }
  
  // update UI (always visible even when paused/game over)
  const healthPercentage = (currentHealth / maxHealth) * 100;
  healthFill.style.width = healthPercentage + '%';
  healthFill.style.backgroundColor = healthPercentage > 50 ? '#ff0000' : healthPercentage > 25 ? '#ff8800' : '#ff0000';
  healthText.textContent = `Health: ${currentHealth}/${maxHealth}`;
  
  const ammoPercentage = (currentAmmo / maxAmmo) * 100;
  ammoFill.style.width = ammoPercentage + '%';
  ammoFill.style.backgroundColor = ammoPercentage > 30 ? '#00ff00' : '#ff0000';
  ammoText.textContent = `Ammo: ${currentAmmo}/${maxAmmo} | Bullets: ${bullets.length} | Enemies: ${enemies.length} | Scene: ${scene.children.length} | FPS: ${currentFPS} | GPU Mem: ${renderer.info.memory.geometries}G ${renderer.info.memory.textures}T`;
  
  renderer.render(scene, camera); 
  requestAnimationFrame(gameLoop);
}

gameLoop()
