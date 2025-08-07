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

// shooting state
let isMouseDown = false;
let lastShotTime = 0;
const shootingRate = 100; // milliseconds between shots

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
  if (targetPoint) {
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
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const direction = bullet.userData.direction;
    
    bullet.position.add(direction.clone().multiplyScalar(bulletSpeed));
    
    if (bullet.position.length() > 50) {
      scene.remove(bullet);
      bullets.splice(i, 1);
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

function gameLoop() {
  updateBullets();
  
  // continuous shooting while mouse is held down
  if (isMouseDown && targetPoint) {
    const currentTime = Date.now();
    if (currentTime - lastShotTime >= shootingRate) {
      shootBullet();
      lastShotTime = currentTime;
    }
  }
  
  // update cube physics
  cube.position.add(cubeVelocity);
  cubeVelocity.multiplyScalar(friction);
  
  // boundary collision detection
  if (cube.position.x > boundaryX) {
    cube.position.x = boundaryX;
    cubeVelocity.x = 0;
  }
  if (cube.position.x < -boundaryX) {
    cube.position.x = -boundaryX;
    cubeVelocity.x = 0;
  }
  if (cube.position.z > boundaryZ) {
    cube.position.z = boundaryZ;
    cubeVelocity.z = 0;
  }
  if (cube.position.z < -boundaryZ) {
    cube.position.z = -boundaryZ;
    cubeVelocity.z = 0;
  }
  
  // camera follows cube
  // camera.position.x = cube.position.x;
  // camera.position.z = cube.position.z;
  
  renderer.render(scene, camera); 
  requestAnimationFrame(gameLoop);
}

gameLoop()
