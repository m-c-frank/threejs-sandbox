import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createAxes } from './components/CoordinateSystem';
import { createGridPlane } from './components/examples';

class ThreeJSComponent {
    container: HTMLElement;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    nodes: THREE.Mesh[];
    selectedNodes: THREE.Mesh[];
    hoveredNode: THREE.Mesh | null;
    defaultMaterial: THREE.MeshBasicMaterial;
    selectedMaterial: THREE.MeshBasicMaterial;
    hoveredMaterial: THREE.MeshBasicMaterial;
    hoveredSelectedMaterial: THREE.MeshBasicMaterial;
    timestamps: number[];

    constructor(container: HTMLElement) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.nodes = [];
        this.selectedNodes = [];
        this.hoveredNode = null;
        this.defaultMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
        this.selectedMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.hoveredMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.hoveredSelectedMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.timestamps = [];

        this.init();
        this.animate();
    }

    init() {
        const container = this.container;

        // Set up scene, camera, and renderer
        this.scene.background = new THREE.Color(0x282828);

        this.camera.position.set(5, 5, 5);

        console.log(container.clientWidth, container.clientHeight);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        this.controls.enableDamping = true;

        createAxes(this.scene, 5, 5, 5);

        createGridPlane(this.scene, new THREE.Vector3(0, 0, 1), 10, 10);
        createGridPlane(this.scene, new THREE.Vector3(1, 0, 0), 10, 10);
        createGridPlane(this.scene, new THREE.Vector3(0, 1, 0), 10, 10);

        this.drawNodes();

        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        window.addEventListener('click', this.onClick.bind(this), false);
    }

    async getNodes() {
        const URL_NODES = 'http://localhost:5000/notes';
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
            this.timestamps.push(node.timestamp);
        }

        const minTimestamp = Math.min(...this.timestamps);
        const maxTimestamp = Math.max(...this.timestamps);

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

    async drawNodes() {
        const fetchedNodes = await this.getNodes();
        fetchedNodes.forEach(node => {
            const nodeMaterial = this.defaultMaterial.clone();
            const nodeGeometry = new THREE.SphereGeometry(0.1, 32, 32);
            const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial);
            sphere.position.set(node.x, node.y, node.z);
            sphere.userData = { originalMaterial: nodeMaterial, id: node.node_id };
            this.scene.add(sphere);
            this.nodes.push(sphere);
        });
    }

    onMouseMove(event: MouseEvent) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onClick(event: MouseEvent) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.nodes);

        if (intersects.length > 0) {
            const intersectedNode = intersects[0].object;
            if (!this.selectedNodes.includes(intersectedNode)) {
                intersectedNode.material = this.hoveredNode === intersectedNode ? this.hoveredSelectedMaterial : this.selectedMaterial;
                this.selectedNodes.push(intersectedNode);
                const textLabel = this.createTextLabel(intersectedNode.userData.id);
                textLabel.userData.node = intersectedNode;
                this.scene.add(textLabel);
            } else {
                intersectedNode.material = intersectedNode.userData.originalMaterial;
                this.selectedNodes = this.selectedNodes.filter(node => node !== intersectedNode);
                this.removeTextLabel(intersectedNode);
            }
        }
    }

    removeTextLabel(node: THREE.Mesh) {
        const textLabel = this.scene.children.find(child => child.userData.isTextLabel && child.userData.node === node);
        if (textLabel) {
            this.scene.remove(textLabel);
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.nodes);

        if (intersects.length > 0) {
            const intersectedNode = intersects[0].object;
            if (this.hoveredNode !== intersectedNode) {
                if (this.hoveredNode && !this.selectedNodes.includes(this.hoveredNode)) {
                    this.hoveredNode.material = this.hoveredNode.userData.originalMaterial;
                } else if (this.hoveredNode && this.selectedNodes.includes(this.hoveredNode)) {
                    this.hoveredNode.material = this.selectedMaterial;
                }
                this.hoveredNode = intersectedNode;
                if (!this.selectedNodes.includes(this.hoveredNode)) {
                    this.hoveredNode.material = this.hoveredMaterial;
                } else {
                    this.hoveredNode.material = this.hoveredSelectedMaterial;
                }
            }
        } else {
            if (this.hoveredNode) {
                if (!this.selectedNodes.includes(this.hoveredNode)) {
                    this.hoveredNode.material = this.hoveredNode.userData.originalMaterial;
                } else {
                    this.hoveredNode.material = this.selectedMaterial;
                }
            }
            this.hoveredNode = null;
        }

        this.nodes.forEach(node => {
            node.position.x += Math.random() * (Math.random() > 0.5 ? 1 : -1) * 0.01;
            node.position.y += Math.random() * (Math.random() > 0.5 ? 1 : -1) * 0.01;
            node.position.z += Math.random() * (Math.random() > 0.5 ? 1 : -1) * 0.01;
        });

        this.updateTextLabels();

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    createTextLabel(node_id: string) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
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

    updateTextLabels() {
        this.scene.children.forEach(child => {
            if (child.userData.isTextLabel && child.userData.node) {
                child.position.copy(child.userData.node.position).add(new THREE.Vector3(0, 0.2, 0));
                child.lookAt(this.camera.position);
            }
        });
    }
}

export default ThreeJSComponent;