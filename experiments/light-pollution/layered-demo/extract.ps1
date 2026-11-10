$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public class WhiteMatte {
 public static int[] Extract(string source,string target,bool holes,string aperture) {
  using(var input=new Bitmap(source)) using(var bmp=new Bitmap(input.Width,input.Height,PixelFormat.Format32bppArgb)) {
   using(var g=Graphics.FromImage(bmp)) g.DrawImageUnscaled(input,0,0);
   int w=bmp.Width,h=bmp.Height,n=w*h; var rect=new Rectangle(0,0,w,h);
   var bits=bmp.LockBits(rect,ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
   byte[] a=new byte[n*4]; Marshal.Copy(bits.Scan0,a,0,a.Length);
   bool[] white=new bool[n],outside=new bool[n]; int[] queue=new int[n]; int head=0,tail=0;
   for(int i=0;i<n;i++){int p=i*4;int min=Math.Min(a[p],Math.Min(a[p+1],a[p+2]));int max=Math.Max(a[p],Math.Max(a[p+1],a[p+2]));white[i]=min>=225 && max-min<25;}
   for(int i=0;i<n;i++) if((i<w||i>=n-w||i%w==0||i%w==w-1)&&white[i]){outside[i]=true;queue[tail++]=i;}
   while(head<tail){int i=queue[head++];int[] near={i-w,i+w,i%w>0?i-1:-1,i%w<w-1?i+1:-1};foreach(int j in near)if(j>=0&&j<n&&white[j]&&!outside[j]){outside[j]=true;queue[tail++]=j;}}
   byte[] mask=new byte[n*4]; int left=w,top=h,right=0,bottom=0;
   for(int i=0;i<n;i++) {
    int p=i*4;
    if(white[i]&&!outside[i]){mask[p]=mask[p+1]=mask[p+2]=mask[p+3]=255;}
    if(outside[i]||(holes&&white[i])) a[p+3]=0;
    else {int x=i%w,y=i/w;left=Math.Min(left,x);right=Math.Max(right,x);top=Math.Min(top,y);bottom=Math.Max(bottom,y);}
   }
   // Remove the original white matte from antialiased boundary pixels.
   byte[] cleaned=(byte[])a.Clone();
   for(int i=0;i<n;i++)if(a[i*4+3]>0){int x=i%w,y=i/w;bool edge=false;
    for(int dy=-2;dy<=2&&!edge;dy++)for(int dx=-2;dx<=2;dx++){int xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&a[(yy*w+xx)*4+3]==0){edge=true;break;}}
    if(edge){int p=i*4,min=Math.Min(a[p],Math.Min(a[p+1],a[p+2]));double alpha=Math.Min(1.0,(255.0-min)/225.0);cleaned[p+3]=(byte)Math.Round(alpha*255);
     for(int k=0;k<3;k++)cleaned[p+k]=(byte)Math.Max(0,Math.Min(255,Math.Round((a[p+k]-255*(1-alpha))/Math.Max(alpha,.001))));}
   }
   Marshal.Copy(cleaned,0,bits.Scan0,cleaned.Length);bmp.UnlockBits(bits);bmp.Save(target,ImageFormat.Png);
   if(aperture!="")using(var m=new Bitmap(w,h,PixelFormat.Format32bppArgb)){var mb=m.LockBits(rect,ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);Marshal.Copy(mask,0,mb.Scan0,mask.Length);m.UnlockBits(mb);m.Save(aperture,ImageFormat.Png);}
   return new int[]{left,top,right-left+1,bottom-top+1};
  }
 }
}
'@
$inputDir = Join-Path $PSScriptRoot '../assets/libtv-layers-20261027/panorama'
$outputDir = Join-Path $PSScriptRoot 'assets'
New-Item -ItemType Directory -Force $outputDir | Out-Null
$layers = @()
Get-ChildItem -LiteralPath $inputDir -Filter '*.png' | Sort-Object Name | ForEach-Object {
 $aperture = if ($_.Name.StartsWith('05-')) { Join-Path $outputDir 'window-apertures.png' } else { '' }
 $holes = -not $_.Name.StartsWith('08-')
 $bounds = [WhiteMatte]::Extract($_.FullName,(Join-Path $outputDir $_.Name),$holes,$aperture)
 $layers += @{id=$_.BaseName;file=('assets/'+$_.Name);bounds=$bounds}
}
$layers | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $outputDir 'layers.json')
$layers | ForEach-Object { '{0}: {1}' -f $_.id,($_.bounds -join ',') }
