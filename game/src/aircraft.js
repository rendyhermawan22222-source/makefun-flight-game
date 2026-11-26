// buildAircraft — "Garuda Kecil", an original low-poly island-hopper:
// sunrise-orange fuselage, cream wings, sea-green tail, spinning prop,
// lit cockpit glass and navigation lights. Built from primitives only.
import { AIRCRAFT } from './config.js';

export function buildAircraft() {
  const plane = new THREE.Group();
  const main = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, color: AIRCRAFT.liveryMain, flatShading: true });
  const cream = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, color: AIRCRAFT.liveryWing, flatShading: true });
  const green = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, color: AIRCRAFT.liveryTail, flatShading: true });
  const glass = new THREE.MeshPhongMaterial({ color: 0x9fd8ff, shininess: 120, specular: 0xffffff });
  const dark = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, color: 0x2b2f36 });

  // Fuselage: tapered cylinder pointing forward (-Z is forward in our rig).
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.9, 9, 8), main);
  body.rotation.x = Math.PI / 2;
  plane.add(body);
  // Nose cone.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 8), main);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -5.7;
  plane.add(nose);
  // Cockpit glass, lit from inside.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 8), glass);
  canopy.scale.set(1, 0.75, 1.9);
  canopy.position.set(0, 1.15, -2.2);
  plane.add(canopy);
  const canopyGlow = new THREE.PointLight(0xffe9a8, 0.7, 9);
  canopyGlow.position.set(0, 1.4, -2.2);
  plane.add(canopyGlow);
  // Main wing + tailplane, cream with green tips.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(15, 0.35, 2.6), cream);
  wing.position.set(0, -0.1, -0.6);
  plane.add(wing);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 2.6), green);
    tip.position.set(side * 7.6, -0.1, -0.6);
    plane.add(tip);
  }
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 1.7), cream);
  tailplane.position.set(0, 0.5, 4.1);
  plane.add(tailplane);
  // Tail fin with the sea-green livery stripe.
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 2.4), green);
  fin.position.set(0, 1.7, 4.2);
  plane.add(fin);
  // Propeller: hub + two blades, spun by the main loop.
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 8), dark);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.6, 0.18), dark);
    blade.rotation.z = a;
    prop.add(blade);
  }
  prop.position.z = -7.1;
  plane.add(prop);
  // Landing gear: three little wheels.
  for (const [x, z] of [[-1.1, -1.5], [1.1, -1.5], [0, 3.6]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 5), dark);
    leg.position.set(x, -1.6, z);
    plane.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 8), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -2.4, z);
    plane.add(wheel);
  }
  // Navigation lights: red port, green starboard, white tail.
  const navLights = [];
  for (const [x, color] of [[-7.9, 0xff2222], [7.9, 0x22ff66], [0, 0xffffff]]) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 6, 5),
      new THREE.MeshBasicMaterial({ color }),
    );
    lamp.position.set(x, 0, x === 0 ? 4.6 : -0.6);
    plane.add(lamp);
    navLights.push(lamp);
  }
  plane.userData.prop = prop;
  plane.userData.navLights = navLights;
  return plane;
}

// Spin the prop faster with throttle; blink the nav lights.
export function animateAircraft(plane, throttle, time) {
  plane.userData.prop.rotation.z += 0.25 + throttle * 1.1;
  const blink = Math.sin(time * 4) > 0;
  plane.userData.navLights.forEach((lamp, i) => {
    lamp.visible = i === 2 ? blink : true;
  });
}
