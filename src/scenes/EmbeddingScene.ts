import * as THREE from 'three';
import { createAxes } from '../components/CoordinateSystem';
import { createGridPlane } from '../components/examples';

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

class SceneBuilder {
    constructor() {
        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();
        const URL_NODES = 'http://localhost:5000/notes';
        let nodes = [];
        let selectedNodes = [];
        let hoveredNode = null;
        let timestamps = [];

        let defaultMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
        let selectedMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        let hoveredMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        let hoveredSelectedMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    }


    static createScene(isTexture = false) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x282828);

        // Create the coordinate system
        createAxes(scene, 5, 5, 5);

        // Create default grid planes
        createGridPlane(scene, new THREE.Vector3(0, 0, 1), 10, 10); // XY plane
        createGridPlane(scene, new THREE.Vector3(1, 0, 0), 10, 10); // YZ plane
        createGridPlane(scene, new THREE.Vector3(0, 1, 0), 10, 10); // ZX plane

        return scene;
    }

    static async drawNodes(scene, isTexture = false) {
        const fetchedNodes = await getNodes();
        fetchedNodes.forEach(node => {
            const nodeMaterial = isTexture ? createTextureMaterial(node.node_id) : defaultMaterial.clone();
            const nodeGeometry = new THREE.SphereGeometry(0.1, 32, 32);
            const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial);
            sphere.position.set(node.x, node.y, node.z);
            sphere.userData = { originalMaterial: nodeMaterial, id: node.node_id };
            scene.add(sphere);
            nodes.push(sphere); // Store reference to the node
        });

        if (!isTexture) {
            window.addEventListener('mousemove', (event) => onMouseMove(event, scene, camera), false);
            window.addEventListener('click', (event) => onClick(event, scene, camera), false);
        }
    }


    createTextureMaterial(node_id) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = '48px Arial';
        context.fillStyle = 'rgb(255, 255, 255)';
        const message = `node_id ${node_id}`;
        context.fillText(message, 0, 48);

        const texture = new THREE.CanvasTexture(canvas);
        return new THREE.MeshBasicMaterial({ map: texture });
    }

    function onMouseMove(event, scene, camera) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    function onClick(event, scene, camera) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodes);

    if (intersects.length > 0) {
        const intersectedNode = intersects[0].object;
        if (!selectedNodes.includes(intersectedNode)) {
        intersectedNode.material = hoveredNode === intersectedNode ? hoveredSelectedMaterial : selectedMaterial;
        selectedNodes.push(intersectedNode);
        const textLabel = createTextLabel(intersectedNode.userData.id);
        textLabel.userData.node = intersectedNode;
        scene.add(textLabel);
        } else {
        intersectedNode.material = intersectedNode.userData.originalMaterial;
        selectedNodes = selectedNodes.filter(node => node !== intersectedNode);
        removeTextLabel(intersectedNode, scene);
        }
    }
    }

    function removeTextLabel(node, scene) {
    const textLabel = scene.children.find(child => child.userData.isTextLabel && child.userData.node === node);
    if (textLabel) {
        scene.remove(textLabel);
    }
    }

    export function animateScene(scene, camera, controls, renderer) {
    raycaster.setFromCamera(mouse, camera);
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

    updateTextLabels(scene, camera);
    controls.update();
    renderer.render(scene, camera);
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

    function updateTextLabels(scene, camera) {
    scene.children.forEach(child => {
        if (child.userData.isTextLabel && child.userData.node) {
        child.position.copy(child.userData.node.position).add(new THREE.Vector3(0, 0.2, 0));
        child.lookAt(camera.position);
        }
    });
}
