import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAxes } from './components/CoordinateSystem';
import { createParametricSurface, createGridPlane } from './components/examples';

let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
const URL_NODES = 'http://localhost:5000/notes';
let nodes = [];
let selectedNodes = [];
let hoveredNode = null;

let defaultMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
let selectedMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
let hoveredMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
let hoveredSelectedMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
let timestamps = []

init();
animate();

function init() {
  // Create the scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x282828);

  // Create the camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(5, 5, 5);

  // Create the renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Add orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Create the coordinate system
  createAxes(scene, 5, 5, 5);

  // Create default grid planes
  createGridPlane(scene, new THREE.Vector3(0, 0, 1), 10, 10); // XY plane
  createGridPlane(scene, new THREE.Vector3(1, 0, 0), 10, 10); // YZ plane
  createGridPlane(scene, new THREE.Vector3(0, 1, 0), 10, 10); // ZX plane

  // Draw nodes
  drawNodes();

  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  // Handle mouse move
  window.addEventListener('mousemove', onMouseMove, false);
  // Handle click
  window.addEventListener('click', onClick, false);
}

async function getNodes() {
  // Fetch from URL_NODES
  let nodes = [];
  await fetch(URL_NODES)
    .then(response => response.json())
    .then(data => {
      nodes = data["nodes"];
    })
    .catch(error => {
      console.error('Error:', error);
    });

  for (let node of nodes) {
    timestamps.push(node.timestamp);
  }

  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);


  // If no x y z values are provided, use random values
  nodes = nodes.map(node => {
    console.log(node);
    if (node.x === undefined) {
        // node.x = Math.random() * 10 - 5;
        node.x = (node.timestamp - minTimestamp) / (maxTimestamp - minTimestamp) * 10 - 5;
    }
    if (node.y === undefined) {
      // node.y = Math.random() * 10 - 5;
      node.y = 0
    }
    if (node.z === undefined) {
      // node.z = Math.random() * 10 - 5;
      node.z = 0
    }
    return node;
  });
  return nodes;
}

async function drawNodes() {
  // Nodes are spheres at random positions within the grid
  const fetchedNodes = await getNodes();
  fetchedNodes.forEach(node => {
    const nodeMaterial = defaultMaterial.clone();
    const nodeGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial);
    sphere.position.set(node.x, node.y, node.z);
    sphere.userData = { originalMaterial: nodeMaterial, id: node.node_id };
    scene.add(sphere);
    nodes.push(sphere); // Store reference to the node
  });
}

function onMouseMove(event) {
  // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick(event) {
  // Update the raycaster
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(nodes);

  if (intersects.length > 0) {
    const intersectedNode = intersects[0].object;
    if (!selectedNodes.includes(intersectedNode)) {
      intersectedNode.material = hoveredNode === intersectedNode ? hoveredSelectedMaterial : selectedMaterial;
      selectedNodes.push(intersectedNode); // Add to selected nodes list
      const textLabel = createTextLabel(intersectedNode.userData.id);
      textLabel.userData.node = intersectedNode; // Link the text label to the node
      scene.add(textLabel);
    } else {
      intersectedNode.material = intersectedNode.userData.originalMaterial;
      selectedNodes = selectedNodes.filter(node => node !== intersectedNode); // Remove from selected
      removeTextLabel(intersectedNode); // Remove the associated text label
    }
  }
}

function removeTextLabel(node) {
  const textLabel = scene.children.find(child => child.userData.isTextLabel && child.userData.node === node);
  if (textLabel) {
    scene.remove(textLabel);
  }
}

function animate() {
  requestAnimationFrame(animate);

  // Update the raycaster
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(nodes);

  if (intersects.length > 0) {
    const intersectedNode = intersects[0].object;
    if (hoveredNode !== intersectedNode) {
      if (hoveredNode && !selectedNodes.includes(hoveredNode)) {
        hoveredNode.material = hoveredNode.userData.originalMaterial;
      } else if (hoveredNode && selectedNodes.includes(hoveredNode)) {
        hoveredNode.material = selectedMaterial;
      }
      hoveredNode = intersectedNode;
      if (!selectedNodes.includes(hoveredNode)) {
        hoveredNode.material = hoveredMaterial;
      } else {
        hoveredNode.material = hoveredSelectedMaterial;
      }
    }
  } else {
    if (hoveredNode) {
      if (!selectedNodes.includes(hoveredNode)) {
        hoveredNode.material = hoveredNode.userData.originalMaterial;
      } else {
        hoveredNode.material = selectedMaterial;
      }
    }
    hoveredNode = null;
  }

  // move the nodes a bit
  nodes.forEach(node => {
    node.position.x += Math.random() * (Math.random() > 0.5 ? 1 : -1) * 0.01;
    node.position.y += Math.random() * (Math.random() > 0.5 ? 1 : -1) * 0.01;
    node.position.z += Math.random() * (Math.random() > 0.5 ? 1 : -1) * 0.01;
  }
  );

  updateTextLabels(); // Ensure text labels face the camera

  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createTextLabel(node_id) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = '48px Arial';
  context.fillStyle = 'rgb(255, 255, 255)';
  const message = `node_id ${node_id}`;
  context.fillText(message, 0, 48);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(1, 0.5, 1); // Scale the sprite appropriately
  sprite.userData = { isTextLabel: true }; // Mark as text label

  return sprite;
}

function updateTextLabels() {
  scene.children.forEach(child => {
    if (child.userData.isTextLabel && child.userData.node) {
      child.position.copy(child.userData.node.position).add(new THREE.Vector3(0, 0.2, 0)); // Offset the text slightly above the node
      child.lookAt(camera.position); // Ensure the text faces the camera
    }
  });
}
