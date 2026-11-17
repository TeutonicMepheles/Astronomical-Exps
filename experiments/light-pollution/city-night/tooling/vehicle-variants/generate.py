"""Generate vehicle sheets through the original Seedream 5.5 / LibTV workflow.
Pose guides must already exist; sources stay separate from the runtime atlas.
"""
import json, pathlib, shutil, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parent
PROJECT='6e1c75a3bcfe4d439a073c1ed919eaff'
STYLE='c4e07bc0-80ee-4cd8-a22e-a76753f98db5'
# Source image is the original car-side.png generation, not the procedural atlas.
EXE=shutil.which('libtv')
def cli(args,record):
    saved=ROOT/(record+'.stdout.json')
    if saved.exists() and saved.stat().st_size:
        raw=saved.read_text(encoding='utf-8')
    else:
        result=subprocess.run([EXE,*args,'-p',PROJECT],capture_output=True)
        (ROOT/(record+'.stdout.json')).write_bytes(result.stdout)
        (ROOT/(record+'.stderr.log')).write_bytes(result.stderr)
        if result.returncode: raise RuntimeError(result.stderr.decode('utf-8',errors='replace'))
        raw=result.stdout.decode('utf-8')
    frames=[];decoder=json.JSONDecoder()
    while raw.strip():
        raw=raw.lstrip();frame,end=decoder.raw_decode(raw);frames.append(frame);raw=raw[end:]
    return frames[-1]
for name,subject in [('sedan','the same blue-gray ordinary sedan as the painted reference'),('suv','a muted burgundy compact SUV, visibly with a hood and taller cabin'),('bus','a teal and cream single-decker city bus, long body, repeated side windows, two axles and front passenger doors')]:
    guide=pathlib.Path(sys.argv[1])/(name+'-pose-guide.png')
    uploaded=cli(['upload','lp-20261116-'+name+'-pose-guide','-f',str(guide.resolve())],name+'-upload')
    prompt="""Create a production transparent sprite sheet for an educational night-city illustration. Image 1 is the exact pose and registration guide: preserve its SIX columns and SIX rows, all 36 separate vehicles, cell centers, wheel contacts, orientation, body size and every silhouette. Image 2 is the ORIGINAL painted sedan art and is the strict style reference. Repaint each guide vehicle as SUBJECT, with the SAME matte gouache-like hand-painted texture, restrained geometric simplification, fine grain, muted night palette, subtle soft shading and dark glass as Image 2. Do not leave any flat untextured polygon placeholder. Geometry and registration come from Image 1, painting style from Image 2. Each consecutive pair of rows forms a full 360 degree turntable of 12 poses in 30 degree steps; the three pairs use elevations 20, 40 and 60 degrees. Keep exactly those poses and cell centers. No ground, shadows, road, environment, labels, grid lines, borders, people or text. All headlights and taillights OFF, no baked glare or bloom; runtime adds lights separately. Whole body and wheels visible in each cell. True transparent alpha background, including spaces between vehicles; original 2K square output.""".replace('SUBJECT',subject)
    (ROOT/(name+'-prompt.txt')).write_text(prompt,encoding='utf-8')
    node=cli(['node','--x','5200','--y',str(800+1200*['sedan','suv','bus'].index(name)),'create','lp-20261116-painted-'+name+'-36views','-t','image','-s','model=Seedream 5.5','-s','quality=2K','-s','ratio=1:1','-s','background=transparent','-s','count=1','-s','modeType=image2image','--left',uploaded['nodeKey'],'--left',STYLE,'--prompt',prompt,'--run'],name+'-generation')
    print(name,'generated',node.get('nodeKey'),flush=True)
