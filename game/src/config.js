// Nusantara Skies — shared tuning constants for the flight game.
// One place for every number the other modules agree on.
export const WORLD = {
  size: 4200,          // playable sea, metres across
  seaLevel: 0,
  gravity: 9.8,
  maxSpeed: 92,        // m/s at full throttle, level flight
  stallSpeed: 26,      // below this the wing stops flying
  takeoffSpeed: 30,
  fuelBurn: 0.55,      // fuel % per second at full throttle
  damageHardLanding: 34,
  damageTerrain: 100,
};

export const AIRCRAFT = {
  cruiseThrottle: 0.62,
  climbRate: 14,
  turnRate: 0.55,      // rad/s at full bank
  pitchRate: 0.5,
  rollRate: 1.6,
  liveryMain: 0xff5a3c, // sunrise orange
  liveryWing: 0xfff3e0, // cream
  liveryTail: 0x0e7a6b, // sea green
};

// Islands: x, z, radius, height, name. The main island holds the home runway.
export const ISLANDS = [
  { x: 0,     z: 0,     r: 620, h: 150, name: 'Pulau Merdeka', volcano: false, runway: true },
  { x: -1150, z: -700,  r: 420, h: 210, name: 'Gunung Api',    volcano: true,  runway: false },
  { x: 1250,  z: -950,  r: 380, h: 90,  name: 'Pulau Karang',  volcano: false, runway: true },
  { x: 1400,  z: 900,   r: 300, h: 70,  name: 'Pulau Penyu',   volcano: false, runway: false },
  { x: -1300, z: 1000,  r: 340, h: 110, name: 'Pulau Kabut',   volcano: false, runway: true },
  { x: 250,   z: -1500, r: 220, h: 60,  name: 'Pulau Kecil',   volcano: false, runway: false },
];

// Runway strips: x, z, heading (deg), length, width, island name.
export const RUNWAYS = [
  { x: 420,   z: 100, heading: 90,  length: 420, width: 26, island: 'Pulau Merdeka', short: false },
  { x: 1560,  z: -800, heading: 10,  length: 300, width: 22, island: 'Pulau Karang',  short: false },
  { x: -1060, z: 1180, heading: 160, length: 210, width: 18, island: 'Pulau Kabut',   short: true  },
];

export const MISSION_DEFS = [
  { id: 'rings',   key: '1', name: 'Ring Time Trial',    blurb: 'Thread 8 sky rings around the islands. Fastest clean run wins.' },
  { id: 'hop',     key: '2', name: 'Island Hop Delivery', blurb: 'Carry cargo to Karang and Kabut. Land gently on each strip.' },
  { id: 'landing', key: '3', name: 'Short Strip Landing', blurb: 'Put her down on Kabut’s 210 m strip. Soft, centred, slow.' },
  { id: 'storm',   key: '4', name: 'Storm Front Run',    blurb: 'Six storm gates in driving rain and gusts. Fuel is tight.' },
];
