"""Build native SVG compositing assets; source PNGs are never rewritten.

Imagegen supplies the unlit repair plate. Original artwork supplies registered
window texture and occlusion. SVG masks select emission and assign source groups.
"""
from pathlib import Path
import base64
import json

HERE = Path(__file__).resolve().parent
WIDTH, HEIGHT = 2172, 724
SOURCE = HERE / "original-source.png"
if not SOURCE.exists():
    SOURCE = HERE.parent / "city-layer-all-lamps.png"

def uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")

original = uri(SOURCE)
plate = uri(HERE / "city-unlit-plate.png")
source_node = f'<image id="source" href="{original}" width="{WIDTH}" height="{HEIGHT}" preserveAspectRatio="none"/>'
image = '<use href="#source"/>'

# These are source-canvas regions, not an attempt to redraw window contours.
# The chroma mask below preserves the actual source contours and occluders.
# Use actual foreground apertures, not building bounding boxes: the skyline
# visible above/between these buildings belongs to the residential group.
PUBLIC = (
    '<rect x="525" y="449" width="83" height="108"/>'
    '<rect x="640" y="478" width="180" height="96"/>'
    '<rect x="773" y="429" width="83" height="75"/>'
    '<rect x="821" y="523" width="29" height="37"/>'
    '<rect x="910" y="472" width="67" height="96"/>'
    '<rect x="1097" y="432" width="58" height="76"/>'
    '<rect x="1070" y="523" width="70" height="46"/>'
    '<rect x="1182" y="385" width="14" height="61"/>'
    '<rect x="1177" y="531" width="18" height="34"/>'
    '<rect x="1208" y="464" width="164" height="114"/>'
)
# Include the luminous rim and its antialiased pixels, not only screen artwork.
# The same aperture removes that rim from the fixed base and source groups.
BILLBOARD = '<polygon points="1217,357 1368,370 1368,459 1217,452"/>'
RESIDENTIAL = '<rect x="0" y="230" width="384" height="342"/><rect x="384" y="330" width="1788" height="162"/>'
WARM = """
<filter id="warm" x="0" y="0" width="2172" height="724" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
  <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  8 0 -8 0 -0.46"/>
  <feComponentTransfer><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
  <feComposite in2="SourceGraphic" operator="in"/>
</filter>
"""
# warm RGB need not be white: alpha masks explicitly ignore color.
FILTERS = WARM + """
<filter id="black"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>
<filter id="white"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
<filter id="opaque" x="0" y="0" width="2172" height="724" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1"/></filter>
"""

def svg(defs, content, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
            f'viewBox="0 0 {WIDTH} {HEIGHT}"><title>{title}</title><defs>{defs}</defs>{content}</svg>')

defs = source_node + FILTERS + f"""
<mask id="emission" maskUnits="userSpaceOnUse" x="0" y="0" width="2172" height="724" style="mask-type:alpha">
  <g filter="url(#warm)">{image}</g>
</mask>
<clipPath id="public-region">{PUBLIC}</clipPath>
<mask id="public-group" maskUnits="userSpaceOnUse" x="0" y="0" width="2172" height="724" style="mask-type:luminance">
  <g fill="white">{PUBLIC}</g><g fill="black">{BILLBOARD}</g>
</mask>
<mask id="residential-group" maskUnits="userSpaceOnUse" x="0" y="0" width="2172" height="724" style="mask-type:luminance">
  <g fill="white">{RESIDENTIAL}</g><g fill="black">{PUBLIC}{BILLBOARD}</g>
</mask>
<clipPath id="billboard-region">{BILLBOARD}</clipPath>
"""

for name, group, title in [
    ("residential-windows.svg", "residential-group", "住宅窗灯，原图坐标遮罩"),
    ("public-building-windows.svg", "public-group", "公共建筑窗灯，原图坐标遮罩"),
]:
    content = f'<g mask="url(#{group})"><g mask="url(#emission)">{image}</g></g>'
    (HERE / name).write_text(svg(defs, content, title), encoding="utf-8")

(HERE / "billboard-screen.svg").write_text(
    svg(defs, f'<g clip-path="url(#billboard-region)">{image}</g>', "广告屏，原始表面与透视"),
    encoding="utf-8")

# Keep original non-emitting architecture so regenerated window frames cannot
# drift under an overlay. The imagegen plate repairs the removed light regions.
# The bench is wood, not a light source. Water and step glows are repaired by plate.
base_defs = defs + f"""
<mask id="source-alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="2172" height="724" style="mask-type:alpha">{image}</mask>
<mask id="static" maskUnits="userSpaceOnUse" x="0" y="0" width="2172" height="724" style="mask-type:luminance">
  <rect width="2172" height="724" fill="white"/>
  <g mask="url(#emission)" filter="url(#black)">{image}</g>
  <g fill="black">{BILLBOARD}</g>
  <rect x="0" y="618" width="2172" height="106" fill="black"/>
  <rect x="640" y="578" width="225" height="15" fill="black"/>
  <rect x="1200" y="578" width="170" height="15" fill="black"/>
  <rect x="1730" y="550" width="100" height="36" fill="white"/>
</mask>
"""
base_content = (f'<g mask="url(#source-alpha)">'
                f'<image href="{plate}" width="2172" height="724" preserveAspectRatio="none" filter="url(#opaque)"/>'
                f'<g mask="url(#static)"><g filter="url(#opaque)">{image}</g></g></g>')
(HERE / "city-unlit.svg").write_text(svg(base_defs, base_content, "熄灯底图，原结构与清理底片合成"), encoding="utf-8")
(HERE / "manifest.json").write_text(json.dumps({
    "version": 2, "canvas": [WIDTH, HEIGHT], "sourceCanvas": [2171, 724],
    "source": "../city-layer-all-lamps.png",
    "method": "imagegen repair plate + native SVG source-coordinate emission masks",
    "layers": ["city-unlit.svg", "residential-windows.svg", "public-building-windows.svg", "billboard-screen.svg"],
    "runtimeDependencies": [], "embeddedRaster": True,
    "sourceRegions": {"public": PUBLIC, "residential": RESIDENTIAL, "billboard": BILLBOARD},
    "notes": "Warm chroma is an art selection mask, not a calibrated light-pollution model."
}, ensure_ascii=False, indent=2), encoding="utf-8")
print("Built four self-contained SVG layers at 2172 x 724; original PNGs unchanged.")
