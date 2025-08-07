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

const light = new THREE.HemisphereLight(0xfffbb, 0x080820, 1);
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

// Cube
const geometry = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0.5, 0);
scene.add(cube);

// Aiming logic
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// mouse coordinates
const pointer = new THREE.Vector2();
let targetPoint = new THREE.Vector3();

// bullet system
const bullets: THREE.Mesh[] = [];
const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const bulletSpeed = 0.5;

// enemy system
const enemies: THREE.Mesh[] = [];
const enemyGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // blue initially
const enemySpeed = 0.02;
const enemyDamage = 1;
const enemySpawnRate = 2000; // milliseconds
let lastEnemySpawnTime = 0;
const enemyMaxHealth = 3;
const bulletDamage = 1;

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

// game state
let isPaused = false;

// cube physics
const cubeVelocity = new THREE.Vector3(0, 0, 0);
const knockbackForce = 0.1;
const friction = 0.95;

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

function shootBullet() {
  if (targetPoint && currentAmmo > 0) {
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(cube.position);
    bullet.position.y += 0.5;
    
    const direction = new THREE.Vector3()
      .subVectors(targetPoint, cube.position)
      .normalize();
    
    bullet.userData = { direction: direction };
    bullets.push(bullet);
    scene.add(bullet);
    
    // apply knockback to cube (opposite direction of bullet)
    const knockback = direction.clone().multiplyScalar(-knockbackForce);
    cubeVelocity.add(knockback);
    
    // consume ammo
    currentAmmo--;
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const direction = bullet.userData.direction;
    
    bullet.position.add(direction.clone().multiplyScalar(bulletSpeed));
    
    // check collision with enemies
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const distance = bullet.position.distanceTo(enemy.position);
      
      if (distance < 0.6) {
        // damage enemy
        enemy.userData.health -= bulletDamage;
        
        // update enemy color based on health
        const healthPercentage = enemy.userData.health / enemyMaxHealth;
        const material = enemy.material as THREE.MeshBasicMaterial;
        
        if (healthPercentage > 0.66) {
          // blue to dark purple transition (high health)
          const t = (1 - healthPercentage) / 0.34; // 0 to 1 as health goes from 100% to 66%
          const r = Math.floor(t * 64); // from 0 to 64 (darker purple)
          const g = 0;
          const b = Math.floor(255 - t * 127); // from 255 to 128 (darker purple)
          material.color.setRGB(r/255, g/255, b/255);
        } else if (healthPercentage > 0.33) {
          // purple to red transition (medium health) - using darker purple
          const t = (0.66 - healthPercentage) / 0.33; // 0 to 1 as health goes from 66% to 33%
          const r = Math.floor(64 + t * 191); // from 64 to 255 (darker purple start)
          const g = 0;
          const b = Math.floor(128 - t * 128); // from 128 to 0 (darker purple start)
          material.color.setRGB(r/255, g/255, b/255);
        } else {
          // red (low health)
          material.color.setRGB(1, 0, 0);
        }
        
        // remove bullet
        scene.remove(bullet);
        bullet.geometry.dispose();
        bullets.splice(i, 1);
        
        // remove enemy if health <= 0
        if (enemy.userData.health <= 0) {
          scene.remove(enemy);
          enemies.splice(j, 1);
        }
        
        break;
      }
    }
    
    // remove bullets that are too far or outside boundaries
    if (bullet.position.length() > 50 || 
        Math.abs(bullet.position.x) > boundaryX + 5 || 
        Math.abs(bullet.position.z) > boundaryZ + 5) {
      scene.remove(bullet);
      bullet.geometry.dispose();
      bullets.splice(i, 1);
    }
  }
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    
    // move enemy toward cube
    const direction = new THREE.Vector3()
      .subVectors(cube.position, enemy.position)
      .normalize();
    
    enemy.position.add(direction.clone().multiplyScalar(enemySpeed));
    
    // check collision with cube (attack)
    const distance = enemy.position.distanceTo(cube.position);
    if (distance < 1.2) {
      currentHealth = Math.max(0, currentHealth - enemyDamage);
      scene.remove(enemy);
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

function spawnEnemy() {
  const enemy = new THREE.Mesh(enemyGeometry.clone(), enemyMaterial.clone());
  
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
  // show/hide pause indicator
  pauseText.style.display = isPaused ? 'block' : 'none';
  
  if (!isPaused) {
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
  
  // update UI (always visible even when paused)
  const healthPercentage = (currentHealth / maxHealth) * 100;
  healthFill.style.width = healthPercentage + '%';
  healthFill.style.backgroundColor = healthPercentage > 50 ? '#ff0000' : healthPercentage > 25 ? '#ff8800' : '#ff0000';
  healthText.textContent = `Health: ${currentHealth}/${maxHealth}`;
  
  const ammoPercentage = (currentAmmo / maxAmmo) * 100;
  ammoFill.style.width = ammoPercentage + '%';
  ammoFill.style.backgroundColor = ammoPercentage > 30 ? '#00ff00' : '#ff0000';
  ammoText.textContent = `Ammo: ${currentAmmo}/${maxAmmo}`;
  
  renderer.render(scene, camera); 
  requestAnimationFrame(gameLoop);
}

gameLoop()
