/* Paraxial ray construction in the tube's local XY plane.
   The mirror vertex is x=3. A 45-degree flat at x=-1.9 folds the converging
   bundle upward. Distances use a fixed schematic scale of 100 mm per unit.
   Thin-mirror equation for finite point sources: 1/f = 1/u + 1/v. */
(function (N) {
  'use strict';
  N.optics = {
    calculate(state) {
      const primary = 3, secondary = -1.9, focal = state.focal / 100;
      const objectDistance = 20; // Finite demonstration source 2000 mm from the primary.
      const imageDistance = state.mode === 'point' ? 1 / (1 / focal - 1 / objectDistance) : focal;
      const focusX = primary - imageDistance;
      const paths = [-.63, 0, .63].map(baseHeight => {
        const height=baseHeight*(state.aperture || 130)/130;
        const mirrorX = primary - height * height / (4 * focal);
        const startX = -6.8;
        const startY = state.mode === 'parallel' ? height : height * (startX - (primary - objectDistance)) / objectDistance;
        // Intersection with secondary plane x+y=secondary.
        const slope = height / (mirrorX - focusX);
        const hitX = (secondary + slope * focusX) / (1 + slope);
        const hitY = secondary - hitX;
        const foldedFocus = [secondary, secondary - focusX, 0];
        const exitY = 2.98;
        const exitX = hitX + slope * (exitY - hitY);
        return [[startX, startY, 0], [mirrorX, height, 0], [hitX, hitY, 0], [exitX, exitY, 0]];
      });
      return { paths, imageDistance, magnification: state.focal / state.eyepiece, focusHeight: secondary - focusX };
    }
  };
})(window.Newton);
