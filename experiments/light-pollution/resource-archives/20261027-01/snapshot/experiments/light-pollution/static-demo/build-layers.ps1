$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.IO;
public class RegisteredLayers {
 static byte[] Read(Bitmap bmp){var r=new Rectangle(0,0,bmp.Width,bmp.Height);var b=bmp.LockBits(r,ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);byte[] p=new byte[bmp.Width*bmp.Height*4];Marshal.Copy(b.Scan0,p,0,p.Length);bmp.UnlockBits(b);return p;}
 static void Save(string path,byte[] p,int w,int h){using(var b=new Bitmap(w,h,PixelFormat.Format32bppArgb)){var d=b.LockBits(new Rectangle(0,0,w,h),ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);Marshal.Copy(p,0,d.Scan0,p.Length);b.UnlockBits(d);b.Save(path,ImageFormat.Png);}}
 static bool Rect(int x,int y,int a,int b,int w,int h){return x>=a&&x<a+w&&y>=b&&y<b+h;}
 static bool Poly(int x,int y,int[,] p){bool inside=false;int n=p.GetLength(0);for(int i=0,j=n-1;i<n;j=i++){int xi=p[i,0],yi=p[i,1],xj=p[j,0],yj=p[j,1];if(((yi>y)!=(yj>y))&&(x<(double)(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;}return inside;}
 static void Over(byte[] dest,byte[] source){for(int p=0;p<dest.Length;p+=4){double a=source[p+3]/255.0;for(int k=0;k<3;k++)dest[p+k]=(byte)Math.Round(source[p+k]*a+dest[p+k]*(1-a));dest[p+3]=255;}}
 public static string Build(string input,string output){
  using(var original=new Bitmap(input))using(var bmp=new Bitmap(original.Width,original.Height,PixelFormat.Format32bppArgb)){
   using(var g=Graphics.FromImage(bmp)){g.CompositingMode=System.Drawing.Drawing2D.CompositingMode.SourceCopy;g.DrawImageUnscaled(original,0,0);}
   int w=bmp.Width,h=bmp.Height;byte[] src=Read(original);byte[][] layers=new byte[8][];for(int i=0;i<8;i++)layers[i]=new byte[src.Length];int[] count=new int[8];
   int[,] pub={{525,449,83,108},{640,478,180,96},{773,429,83,75},{821,523,29,37},{910,472,67,96},{1097,432,58,76},{1070,523,70,46},{1182,385,14,61},{1177,531,18,34},{1208,464,164,114}};
   int[,] screen={{1217,357},{1368,370},{1368,459},{1217,452}};
   int[,] water={{1484,506},{2171,506},{2171,548},{2120,539},{2064,557},{2020,572},{1655,572},{1632,555},{1564,560},{1534,550},{1492,548}};
   for(int y=0;y<h;y++)for(int x=0;x<w;x++){
    int p=(y*w+x)*4;double t=(double)y/(h-1);int[] c0=t<.55?new int[]{7,14,38}:new int[]{20,32,62};int[] c1=t<.55?new int[]{20,32,62}:new int[]{35,50,81};double f=t<.55?t/.55:(t-.55)/.45;
    for(int k=0;k<3;k++)layers[0][p+k]=(byte)Math.Round(c0[2-k]+(c1[2-k]-c0[2-k])*f);layers[0][p+3]=255;
    if(src[p+3]==0)continue;
    int id=1;bool warm=src[p+2]-src[p]>15&&src[p+2]>75;
    if(y>=632)id=warm?7:2;
    else if(Poly(x,y,water))id=warm?7:3;
    else if(Poly(x,y,screen))id=6;
    else if(warm){bool publicWindow=false;for(int r=0;r<pub.GetLength(0);r++)if(Rect(x,y,pub[r,0],pub[r,1],pub[r,2],pub[r,3])){publicWindow=true;break;}if(publicWindow)id=5;else if(Rect(x,y,0,230,384,342)||Rect(x,y,384,330,1788,162))id=4;}
    for(int k=0;k<4;k++)layers[id][p+k]=src[p+k];count[id]++;
   }
   string[] files={"00-sky","01-scenery","02-foreground-water","03-background-water","04-residential-emission","05-public-emission","06-billboard","07-warm-reflections"};
   Directory.CreateDirectory(output);for(int i=0;i<8;i++)Save(Path.Combine(output,files[i]+".png"),layers[i],w,h);
   byte[] reference=(byte[])layers[0].Clone();Over(reference,src);Save(Path.Combine(output,"reference.png"),reference,w,h);
   byte[] reconstructed=(byte[])layers[0].Clone();for(int i=1;i<8;i++)Over(reconstructed,layers[i]);Save(Path.Combine(output,"composite.png"),reconstructed,w,h);
   int differences=0,max=0;for(int p=0;p<src.Length;p++){int delta=Math.Abs(reference[p]-reconstructed[p]);if(delta>0)differences++;max=Math.Max(max,delta);}
   int owned=0;for(int i=1;i<8;i++)owned+=count[i];
   return "{\"width\":"+w+",\"height\":"+h+",\"layerCount\":8,\"ownedSourcePixels\":"+owned+",\"differentChannels\":"+differences+",\"maximumChannelDifference\":"+max+",\"method\":\"Disjoint ownership masks; original BGRA copied without resampling or color correction. Sky is a shared static backdrop.\"}";
  }
 }
}
'@
$source = Join-Path $PSScriptRoot '../assets/city-layer-all-lamps.png'
$assets = Join-Path $PSScriptRoot 'assets'
$report = [RegisteredLayers]::Build($source,$assets)
Copy-Item -LiteralPath $source -Destination (Join-Path $assets 'source.png') -Force
$report | Set-Content -Encoding utf8 (Join-Path $PSScriptRoot 'pixel-check.json')
$report
