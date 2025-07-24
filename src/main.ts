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

function gameLoop() {
  renderer.render(scene, camera); 
  requestAnimationFrame(gameLoop);
}

gameLoop()
