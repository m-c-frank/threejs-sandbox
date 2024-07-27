import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAxes } from './components/CoordinateSystem';
import { createParametricSurface, createGridPlane } from './components/examples';

let scene1, scene2, camera1, camera2, renderer1, renderer2, controls1, controls2;
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
let timestamps = [];

init();
animate();

function init() {
    // Create the scenes
    scene1 = new THREE.Scene();
    scene1.background = new THREE.Color(0x282828);
    scene2 = new THREE.Scene();
    scene2.background = new THREE.Color(0x282828);

    // Create the cameras
    camera1 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera1.position.set(5, 5, 5);
    camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera2.position.set(5, 5, 5);

    // Create the renderers
    renderer1 = new THREE.WebGLRenderer({ antialias: true });
    renderer1.setSize(window.innerWidth, window.innerHeight);
    renderer1.domElement.style.position = 'absolute';
    renderer1.domElement.style.top = '0';
    renderer1.domElement.style.left = '0';
    document.body.appendChild(renderer1.domElement);

    renderer2 = new THREE.WebGLRenderer({ antialias: true });
    renderer2.setSize(window.innerWidth / 2, window.innerHeight / 2);
    renderer2.domElement.style.position = 'absolute';
    renderer2.domElement.style.bottom = '0';
    renderer2.domElement.style.right = '0';
    document.body.appendChild(renderer2.domElement);

    // Add orbit controls
    controls1 = new OrbitControls(camera1, renderer1.domElement);
    controls1.enableDamping = true;
    controls2 = new OrbitControls(camera2, renderer2.domElement);
    controls2.enableDamping = true;

    // Create the coordinate system
    createAxes(scene1, 5, 5, 5);
    createAxes(scene2, 5, 5, 5);

    // Create default grid planes
    createGridPlane(scene1, new THREE.Vector3(0, 0, 1), 10, 10); // XY plane
    createGridPlane(scene1, new THREE.Vector3(1, 0, 0), 10, 10); // YZ plane
    createGridPlane(scene1, new THREE.Vector3(0, 1, 0), 10, 10); // ZX plane

    createGridPlane(scene2, new THREE.Vector3(0, 0, 1), 10, 10); // XY plane
    createGridPlane(scene2, new THREE.Vector3(1, 0, 0), 10, 10); // YZ plane
    createGridPlane(scene2, new THREE.Vector3(0, 1, 0), 10, 10); // ZX plane

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

    nodes = nodes.map(node => {
        console.log(node);
        if (node.x === undefined) {
            node.x = (node.timestamp - minTimestamp) / (maxTimestamp - minTimestamp) * 10 - 5;
        }
        if (node.y === undefined) {
            node.y = 0;
        }
        if (node.z === undefined) {
            node.z = 0;
        }
        return node;
    });
    return nodes;
}

async function drawNodes() {
    const fetchedNodes = await getNodes();
    fetchedNodes.forEach(node => {
        const nodeMaterial = defaultMaterial.clone();
        const nodeGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial);
        sphere.position.set(node.x, node.y, node.z);
        sphere.userData = { originalMaterial: nodeMaterial, id: node.node_id };
        scene1.add(sphere);
        scene2.add(sphere.clone()); // Clone the node for the second scene
        nodes.push(sphere); // Store reference to the node
    });
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick(event) {
    raycaster.setFromCamera(mouse, camera1);
    const intersects = raycaster.intersectObjects(nodes);

    if (intersects.length > 0) {
        const intersectedNode = intersects[0].object;
        if (!selectedNodes.includes(intersectedNode)) {
            intersectedNode.material = hoveredNode === intersectedNode ? hoveredSelectedMaterial : selectedMaterial;
            selectedNodes.push(intersectedNode);
            const textLabel = createTextLabel(intersectedNode.userData.id);
            textLabel.userData.node = intersectedNode;
            scene1.add(textLabel);
            scene2.add(textLabel.clone()); // Clone the label for the second scene
        } else {
            intersectedNode.material = intersectedNode.userData.originalMaterial;
            selectedNodes = selectedNodes.filter(node => node !== intersectedNode);
            removeTextLabel(intersectedNode);
        }
    }
}

function removeTextLabel(node) {
    const textLabel = scene1.children.find(child => child.userData.isTextLabel && child.userData.node === node);
    if (textLabel) {
        scene1.remove(textLabel);
        scene2.remove(textLabel.clone()); // Remove the cloned label from the second scene
    }
}

function animate() {
    requestAnimationFrame(animate);

    raycaster.setFromCamera(mouse, camera1);
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

    nodes.forEach(node => {
        node.position.x += Math.random() * (Math.random() > 0.5 ? 1 : -1) * 0.01;
        node.position.y += Math.random() * (Math.random() > 0.5 ? 1 : -1) * 0.01;
        node.position.z += Math.random() * (Math.random() > 0.5 ? 1 : -1) * 0.01;
    });

    updateTextLabels();

    controls1.update();
    controls2.update();
    renderer1.render(scene1, camera1);
    renderer2.render(scene2, camera2);
}

function onWindowResize() {
    camera1.aspect = window.innerWidth / window.innerHeight;
    camera1.updateProjectionMatrix();
    renderer1.setSize(window.innerWidth, window.innerHeight);

    camera2.aspect = (window.innerWidth / 2) / (window.innerHeight / 2);
    camera2.updateProjectionMatrix();
    renderer2.setSize(window.innerWidth / 2, window.innerHeight / 2);
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
    sprite.scale.set(1, 0.5, 1);
    sprite.userData = { isTextLabel: true };

    return sprite;
}

function updateTextLabels() {
    scene1.children.forEach(child => {
        if (child.userData.isTextLabel && child.userData.node) {
            child.position.copy(child.userData.node.position).add(new THREE.Vector3(0, 0.2, 0));
            child.lookAt(camera1.position);
        }
    });

    scene2.children.forEach(child => {
        if (child.userData.isTextLabel && child.userData.node) {
            child.position.copy(child.userData.node.position).add(new THREE.Vector3(0, 0.2, 0));
            child.lookAt(camera2.position);
        }
    });
}
