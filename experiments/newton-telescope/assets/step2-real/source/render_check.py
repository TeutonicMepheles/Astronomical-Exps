from pathlib import Path
import pickle,sys,json,math
import numpy as np
import vtk
from vtk.util.numpy_support import numpy_to_vtk,numpy_to_vtkIdTypeArray
ROOT=Path(__file__).resolve().parents[1]
with open(ROOT/'review/model-internal.pkl','rb') as f:entries,settings,textures,anchors,params=pickle.load(f)
W,H=1112,834
renderer=vtk.vtkRenderer();renderer.SetBackground(.845,.88,.902);renderer.SetBackground2(.91,.93,.945);renderer.GradientBackgroundOn()
win=vtk.vtkRenderWindow();win.SetOffScreenRendering(1);win.SetSize(W,H);win.SetMultiSamples(4);win.AddRenderer(renderer)
cam=renderer.GetActiveCamera();cam.SetPosition(-7.2,6.2,19.6);cam.SetFocalPoint(0,3.2,0);cam.SetViewUp(0,1,0);cam.SetViewAngle(19.6);cam.SetClippingRange(.1,100)
texture_cache={}
for key,im in textures.items():
 a=np.flipud(np.asarray(im.convert('RGB'))).copy();d=vtk.vtkImageData();d.SetDimensions(im.width,im.height,1);d.GetPointData().SetScalars(numpy_to_vtk(a.reshape(-1,3),deep=True,array_type=vtk.VTK_UNSIGNED_CHAR));t=vtk.vtkTexture();t.SetInputData(d);t.InterpolateOn();t.RepeatOn();texture_cache[key]=t
actors={}
for ent in entries:
 mesh=ent['mesh'];pd=vtk.vtkPolyData();p=vtk.vtkPoints();p.SetData(numpy_to_vtk(np.asarray(mesh.vertices),deep=True));pd.SetPoints(p)
 cells=np.column_stack([np.full(len(mesh.faces),3),mesh.faces]).astype('int64').reshape(-1);ca=vtk.vtkCellArray();ca.SetCells(len(mesh.faces),numpy_to_vtkIdTypeArray(cells,deep=True));pd.SetPolys(ca)
 normals=numpy_to_vtk(np.asarray(mesh.vertex_normals).copy(),deep=True);normals.SetName('Normals');pd.GetPointData().SetNormals(normals)
 uv=numpy_to_vtk(np.asarray(mesh.visual.uv).copy(),deep=True);uv.SetName('UV');pd.GetPointData().SetTCoords(uv)
 mapper=vtk.vtkPolyDataMapper();mapper.SetInputData(pd);mapper.ScalarVisibilityOff()
 actor=vtk.vtkActor();actor.SetMapper(mapper);prop=actor.GetProperty();col,metal,rough,tx=settings[ent['material']]
 prop.SetColor(*(np.array(col)/255));prop.SetInterpolationToPhong();prop.SetAmbient(.24);prop.SetDiffuse(.73)
 prop.SetSpecular(.08 if ent['material'] in ['wood','inner','cut'] else .36);prop.SetSpecularPower(18 if ent['material']=='mirror' else 24)
 if tx:actor.SetTexture(texture_cache[tx])
 if ent['sectionOnly']:actor.VisibilityOff()
 renderer.AddActor(actor);actors[ent['name']]=actor
 # Restrained real silhouettes, never polygon wireframes.
 if ent['part'] in ['base','mount','tube','eyepiece'] and not any(s in ent['name'] for s in ['Fastener','Knurl','Piping','Trim','Thread','Edge','Interior','Highlight','Rim','ColumnRim']):
  sil=vtk.vtkPolyDataSilhouette();sil.SetInputData(pd);sil.SetCamera(cam);sil.SetEnableFeatureAngle(0)
  sm=vtk.vtkPolyDataMapper();sm.SetInputConnection(sil.GetOutputPort());sa=vtk.vtkActor();sa.SetMapper(sm);sa.GetProperty().SetColor(.11,.16,.23);sa.GetProperty().SetOpacity(.55);sa.GetProperty().SetLineWidth(1.1);renderer.AddActor(sa)
  actors[ent['name']+'_outline']=sa
renderer.RemoveAllLights()
for pos,color,intensity in [((-7,13,12),(1,.96,.90),.75),((6,8,5),(.70,.83,1),.45),((-8,4,-10),(.80,.88,1),.35)]:
 l=vtk.vtkLight();l.SetLightTypeToSceneLight();l.SetPosition(*pos);l.SetFocalPoint(0,3,0);l.SetColor(*color);l.SetIntensity(intensity);renderer.AddLight(l)
# Contact surface is rendered as geometry; no drawn replacement for the instrument.
plane=vtk.vtkPlaneSource();plane.SetOrigin(-100,-.012,-100);plane.SetPoint1(100,-.012,-100);plane.SetPoint2(-100,-.012,100)
pm=vtk.vtkPolyDataMapper();pm.SetInputConnection(plane.GetOutputPort());pa=vtk.vtkActor();pa.SetMapper(pm);pa.GetProperty().SetColor(.85,.885,.905);pa.GetProperty().SetAmbient(.8);pa.GetProperty().SetDiffuse(.2)
# No giant plane: retain a neutral reference-like studio background.

def screenshot(name):
 win.Render();f=vtk.vtkWindowToImageFilter();f.SetInput(win);f.SetInputBufferTypeToRGB();f.ReadFrontBufferOff();f.Update();p=vtk.vtkPNGWriter();p.SetFileName(str(ROOT/'review'/name));p.SetInputConnection(f.GetOutputPort());p.Write()
screenshot('mesh-front-vtk.png')
cam.SetPosition(7.2,6.2,-19.6);screenshot('mesh-rear-vtk.png')
cam.SetPosition(-7.2,6.2,19.6)
for ent in entries:
 if ent['sectionHide']:
  actors[ent['name']].VisibilityOff()
  if ent['name']+'_outline' in actors:actors[ent['name']+'_outline'].VisibilityOff()
screenshot('mesh-section-vtk.png')
# Landmark positions are logged for reference-framing checks.
coords={}
for key,p in anchors.items():renderer.SetWorldPoint(*p,1);renderer.WorldToDisplay();x,y,z=renderer.GetDisplayPoint();coords[key]=[x,H-y]
(ROOT/'review/render-camera.json').write_text(json.dumps(dict(position=list(cam.GetPosition()),target=list(cam.GetFocalPoint()),fov=cam.GetViewAngle(),anchors=coords),indent=2))
print('Saved front / rear / section actual 3D renders')
