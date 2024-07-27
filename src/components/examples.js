import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

const createParametricSurface = (scene) => {
  function parametricFunction(u, v, target) {
    var x = u * 10 - 5; // Range for x: -5 to 5
    var y = v * 10 - 5; // Range for y: -5 to 5
    var z = Math.sin(Math.sqrt(x * x + y * y)); // Example function: z = sin(sqrt(x^2 + y^2))
    target.set(x, y, z);
  }
  // Create the parametric geometry
  var parametricGeometry = new ParametricGeometry(parametricFunction, 100, 100);

  // Create a basic material and mesh
  var material = new THREE.MeshBasicMaterial({ color: 0x0077ff, wireframe: true });
  var mesh = new THREE.Mesh(parametricGeometry, material);
  scene.add(mesh);
}

const createGridPlane = (scene, normal, size, divisions) =>{
  // create a grid plane with transparent gray grid lines
  const gridHelper = new THREE.GridHelper(size, divisions);
  gridHelper.material.opacity = 0.9;
  console.log(gridHelper.material);

  scene.add(gridHelper);

  // Align the plane to the given normal
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  gridHelper.applyQuaternion(quaternion);
}
export { createParametricSurface, createGridPlane };