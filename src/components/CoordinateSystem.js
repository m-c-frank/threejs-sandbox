import * as THREE from 'three';


const createArrow = (scene, start, end, color) => {
  // Define parameters
  const arrowShaftRadius = 0.02; // Adjust for desired thickness
  const arrowTipRadius = 0.05; // Adjust as needed
  const arrowTipHeight = 0.2; // Adjust as needed

  // Calculate the direction and length of the arrow
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  direction.normalize();

  // Create the material for the arrow
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: color });

  // Create the cylinder for the arrow shaft
  const shaftGeometry = new THREE.CylinderGeometry(arrowShaftRadius, arrowShaftRadius, length-arrowTipHeight, 8);
  const shaftMesh = new THREE.Mesh(shaftGeometry, arrowMaterial);

  // Position and orient the shaft
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  // shaft midpoint is at midpoint minus half the arrow tip height
  // so we can use midpoint and direction to calculate the shaft midpoint
  const shaftMidpoint = new THREE.Vector3().addVectors(midpoint, direction.clone().multiplyScalar(-arrowTipHeight / 2));
  shaftMesh.position.copy(shaftMidpoint);
  shaftMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  // Create the cone for the arrow tip
  const tipGeometry = new THREE.ConeGeometry(arrowTipRadius, arrowTipHeight, 16);
  const tipMesh = new THREE.Mesh(tipGeometry, arrowMaterial);

  // Position and orient the tip
  tipMesh.position.copy(end);
  tipMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  // Adjust tip position along the direction to align with the shaft end
  tipMesh.position.add(direction.clone().multiplyScalar(-arrowTipHeight / 2));

  // Add both parts to the scene
  scene.add(shaftMesh);
  scene.add(tipMesh);
}

const createAxes = (scene, xLimit, yLimit, zLimit) => {
  // X axis
  createArrow(scene, new THREE.Vector3(0, 0, 0), new THREE.Vector3(xLimit, 0, 0), 0xff0000);
  
  // Y axis
  createArrow(scene, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, yLimit, 0), 0x00ff00);

  // Z axis
  createArrow(scene, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, zLimit), 0x0000ff);
}


export { createAxes };