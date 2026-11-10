/* Soft light scattered around a host-supplied Three.js path.
 *
 * This component owns only the halo mesh and its opacity. It does not calculate
 * rays, reflections, visibility, focus points or experiment state.
 */
(function (root) {
  'use strict';

  class OpticalBeam {
    constructor({ THREE, parent, width = 0.32, zOffset = 0.025 } = {}) {
      if (!THREE?.Mesh || !THREE?.ShaderMaterial || !THREE?.Group) {
        throw new TypeError('OpticalBeam requires a Three.js-compatible THREE object');
      }
      this.THREE = THREE;
      this.parent = parent || null;
      this.width = Number(width) || 0.32;
      this.zOffset = Number(zOffset) || 0;
      this.opacity = 1;
      this.materials = new Set();
      this.group = new THREE.Group();
      this.group.name = 'shared-optical-beam';
      this.parent?.add(this.group);
    }

    addSegment(start, end, { color = 0xffd395 } = {}) {
      const T = this.THREE;
      const a = start?.isVector3 ? start.clone() : new T.Vector3(...start);
      const b = end?.isVector3 ? end.clone() : new T.Vector3(...end);
      const direction = b.clone().sub(a);
      const length = direction.length();
      if (length < 0.0001) return null;

      const material = new T.ShaderMaterial({
        uniforms: {
          tint: { value: new T.Color(color) },
          length: { value: length },
          beamOpacity: { value: this.opacity },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform vec3 tint;
          uniform float length;
          uniform float beamOpacity;
          void main() {
            float y = (vUv.y - .5) * 2.;
            float halo = exp(-y * y * 9.) * .18 + exp(-y * y * 38.) * .24;
            float core = exp(-y * y * 550.) * .65;
            float scatter = .88 + .08 * sin(vUv.x * length * 13.)
                          + .04 * sin(vUv.x * length * 43. + y * 17.);
            float ends = smoothstep(0., .025, vUv.x)
                       * smoothstep(0., .025, 1. - vUv.x);
            gl_FragColor = vec4(tint, (halo * scatter + core) * ends * beamOpacity);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        side: T.DoubleSide,
      });
      const mesh = new T.Mesh(new T.PlaneGeometry(length, this.width), material);
      mesh.position.copy(a).lerp(b, 0.5);
      mesh.position.z += this.zOffset;
      mesh.rotation.z = Math.atan2(direction.y, direction.x);
      mesh.userData.opticalBeam = this;
      this.materials.add(material);
      this.group.add(mesh);
      return mesh;
    }

    setOpacity(value) {
      const next = Math.max(0, Math.min(1, Number(value) || 0));
      this.opacity = next;
      for (const material of this.materials) {
        material.uniforms.beamOpacity.value = next;
      }
      this.group.visible = next > 0;
      return next;
    }

    clear() {
      for (const child of [...this.group.children]) {
        this.group.remove(child);
        child.geometry?.dispose();
        const materials = child.material
          ? (Array.isArray(child.material) ? child.material : [child.material])
          : [];
        for (const material of materials) {
          this.materials.delete(material);
          material.dispose();
        }
      }
    }

    dispose() {
      this.clear();
      this.parent?.remove(this.group);
      this.parent = null;
      this.materials.clear();
    }
  }

  root.SharedComponents = root.SharedComponents || {};
  root.SharedComponents.OpticalBeam = OpticalBeam;
})(typeof window === 'undefined' ? globalThis : window);
