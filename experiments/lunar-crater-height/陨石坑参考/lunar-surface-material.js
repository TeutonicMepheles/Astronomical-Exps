/* 从 crater-lab-standalone.html 提取的原版月面材质（Three.js r152）。
 * 原页面在运行时生成 256×256 凹凸纹理，没有单独的贴图文件。
 * 用法：const material = createCraterLabLunarMaterial(THREE);
 * 纹理可通过 material.bumpMap 取得；使用完毕后分别 dispose 材质和纹理。
 */
function createCraterLabLunarMaterial(THREE) {
  const detailCanvas = document.createElement('canvas');
  detailCanvas.width = detailCanvas.height = 256;
  const ctx = detailCanvas.getContext('2d');
  const pixels = ctx.createImageData(256, 256);
  const fract = value => value - Math.floor(value);

  for (let k = 0; k < 256 * 256; k++) {
    const g = 105 + 100 * fract(Math.sin(k * 12.9898 + 71.2) * 43758.5453);
    pixels.data[k * 4] = pixels.data[k * 4 + 1] = pixels.data[k * 4 + 2] = g;
    pixels.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);

  const bump = new THREE.CanvasTexture(detailCanvas);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(20, 20);

  return new THREE.MeshStandardMaterial({
    color: 0x99958b,
    roughness: 0.92,
    metalness: 0,
    bumpMap: bump,
    bumpScale: 0.055,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = createCraterLabLunarMaterial;
}
