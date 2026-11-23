(() => {
  'use strict';

  // Numerical model from the user-supplied 陨击坑实验室.html. Internal units are cgs.
  const diameters = { small: 20, medium: 50, large: 300 };
  const entrySpeeds = { low: 10, medium: 20, high: 40 };
  const stoneDensity = 3.0;
  const targets = {
    loose: { k1: .132, k2: .26, mu: .41, density: 1.7, strength: 2e6, porosity: .40, depthRatio: .30, ejectaFactor: .6 },
    compact: { k1: .095, k2: .257, mu: .55, density: 3.2, strength: 1e8, porosity: .03, depthRatio: .17, ejectaFactor: 1.2 },
    lunar: { k1: .132, k2: .26, mu: .41, density: 1.5, strength: 1e5, porosity: .45, depthRatio: .28, ejectaFactor: .6 }
  };
  const fragments = { small: { diameter: 2, speed: 100 }, medium: { diameter: 6, speed: 300 } };
  const targetKey = ({ scene, ground }) => scene === 'moon' ? 'lunar' : ground;

  function calculate(params) {
    const onMoon = params.scene === 'moon';
    const target = targets[targetKey(params)];
    const entrySpeed = entrySpeeds[params.speed];
    const sinAngle = Math.sin(Number(params.angle) * Math.PI / 180);
    const fragment = onMoon ? undefined : fragments[params.size];
    const impactDiameter = fragment?.diameter ?? diameters[params.size];
    const radiusCm = impactDiameter * 50;
    let landingSpeed = entrySpeed * 1e5;
    if (fragment) {
      landingSpeed = fragment.speed * 100 * (entrySpeed / 20);
    } else if (!onMoon) {
      const drag = 3 * 1.225e-3 * 8e5 / (8 * radiusCm * stoneDensity * sinAngle);
      landingSpeed *= Math.exp(-drag);
    }

    const effectiveSpeedSquared = (landingSpeed * Math.sqrt(sinAngle)) ** 2;
    const mass = (4 / 3) * Math.PI * radiusCm ** 3 * stoneDensity;
    const { mu, density } = target;
    const nu = .33;
    const gravityTerm = (onMoon ? 162 : 981) * radiusCm / effectiveSpeedSquared;
    const strengthTerm = target.strength / (density * effectiveSpeedSquared);
    const densityRatio = density / stoneDensity;
    const gravityScale = densityRatio ** ((6 * nu - 2 - mu) / (3 * mu));
    const strengthScale = densityRatio ** ((6 * nu - 2) / (3 * mu));
    const scalingTerm = gravityTerm * gravityScale + target.k2 * (strengthTerm * strengthScale) ** ((2 + mu) / 2);
    const volume = Math.max(1, target.k1 * scalingTerm ** (-3 * mu / (2 + mu)) * mass / density);
    let diameter = 1.3 * 2 * (1.1 * Math.cbrt(volume)) / 100;
    const transitionDiameter = (onMoon ? 10.6e3 : 3.2e3) * (1 + 1.6 * target.porosity);
    const penetration = Boolean(fragment) && params.ground === 'loose';
    let depth;
    if (penetration) {
      const speedInHundredsOfMetersPerSecond = landingSpeed / 1e4;
      diameter = impactDiameter * (1.2 + .2 * speedInHundredsOfMetersPerSecond);
      depth = impactDiameter * (2.0 + .9 * speedInHundredsOfMetersPerSecond);
    } else {
      depth = diameter > transitionDiameter
        ? .2 * transitionDiameter * (diameter / transitionDiameter) ** .301
        : diameter * target.depthRatio;
    }

    return { diameter, depth, ejecta: (penetration ? .8 : 2.5 * target.ejectaFactor) * diameter };
  }

  function formatLength(meters) {
    if (meters < 1) return Math.max(1, Math.round(meters * 100)) + ' cm';
    if (meters < 1000) return (meters < 10 ? meters.toFixed(1) : Math.round(meters)) + ' m';
    const kilometers = meters / 1000;
    return (kilometers < 10 ? kilometers.toFixed(1) : Math.round(kilometers)) + ' km';
  }

  window.MeteorImpactResultModel = Object.freeze({ calculate, formatLength, targetKey });
})();
