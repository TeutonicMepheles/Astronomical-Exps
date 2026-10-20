/* Approved parts-v2 registration and parabola limits. Preview pixels, existing 300 mm/scene-unit convention. */
window.Newton.mirrorPartsConfig={
  "concave": {
    "start": {
      "x": 1054,
      "y": 186
    },
    "end": {
      "x": 1051,
      "y": 484
    },
    "nativeSag": 38.49804922264353,
    "minSag": 23.098829533586116,
    "maxSag": 42.06203923865674,
    "anchor": 1094,
    "shape": {},
    "bendSign": 1,
    "deformable": {
      "src": "assets/rail-lab/coherent-v4/parts-v2/concave/deformable.png",
      "transform": {
        "a": 0.5038981775749583,
        "b": -0.00879637860685219,
        "x": 505.56279770079107,
        "y": 102.53658342204481
      }
    },
    "fixed": {
      "src": "assets/rail-lab/coherent-v4/parts-v2/concave/fixed.png",
      "transform": {
        "a": 0.8478915662650602,
        "b": 0,
        "x": 168.72138554216872,
        "y": 33.23795180722891
      }
    }
  },
  "convex": {
    "start": {
      "x": 1090,
      "y": 163
    },
    "end": {
      "x": 1089,
      "y": 491
    },
    "nativeSag": 73.49965840883584,
    "minSag": 13.229938513590449,
    "maxSag": 48.50977454983165,
    "anchor": 1018,
    "shape": {
      "sagScale": 0.3,
      "silverWidthScale": 0.4,
      "purpose": "Approved gentle end and default preserved; the previous 60 percent shape is now the maximum allowed slider position. Curvature mapping and silver width unchanged.",
      "highFactor": 3,
      "sliderMax": 60
    },
    "bendSign": -1,
    "deformable": {
      "src": "assets/rail-lab/coherent-v4/parts-v2/convex/deformable.png",
      "transform": {
        "a": 0.5794929306676141,
        "b": -0.002677339246812396,
        "x": 432.0761510771198,
        "y": 88.45067290624263
      }
    },
    "fixed": {
      "src": "assets/rail-lab/coherent-v4/parts-v2/convex/fixed.png",
      "transform": {
        "a": 1,
        "b": 0,
        "x": 0,
        "y": 0
      }
    }
  }
};
