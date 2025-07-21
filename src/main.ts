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

// window resizing to keep aspect ratio 
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

function animate() {
  renderer.render(scene, camera); 
}

function gameLoop() {
  animate();
  requestAnimationFrame(gameLoop);
}

gameLoop();


