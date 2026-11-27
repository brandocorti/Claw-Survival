import json, sys, os
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]; W,H=160,90
os.makedirs(dst, exist_ok=True)
pos=json.load(open(f'{src}/pos.json'))
sx,sy=pos[0]
for i,(x,y) in enumerate(pos):
    sx += (x-sx)*0.25; sy += (y-sy)*0.25
    cx=min(max(round(sx)-W//2,0),480-W); cy=min(max(round(sy)-8-H//2,0),270-H)
    Image.open(f'{src}/f{i:04d}.png').convert('RGB').crop((cx,cy,cx+W,cy+H)).save(f'{dst}/f{i:04d}.png')
