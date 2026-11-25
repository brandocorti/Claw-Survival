# Deterministic frame capture.
# python3 capture.py "<query>" outdir "450,3600"          -> stills at those game frames
# python3 capture.py "<query>" outdir range:START:COUNT:STRIDE
import sys, asyncio, base64, os
from playwright.async_api import async_playwright
q, out, spec = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
if spec.startswith('range:'):
    _, s0, n, st = spec.split(':'); targets = [int(s0) + i*int(st) for i in range(int(n))]
else:
    targets = [int(v) for v in spec.split(',')]
JS_STEP = """async ([n, grab]) => {
  const g = window.__game;
  for (let i = 0; i < n; i++) { window.__t = (window.__t || 1000) + 1000/60; g.step(window.__t, 1000/60); }
  if (!grab) return null;
  const sc = window.__scene; const p = sc.transport.getLocalPlayer(); const cam = sc.cameras.main;
  return { img: g.canvas.toDataURL('image/png'), px: p.x - cam.scrollX, py: p.y - cam.scrollY };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome',
            args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1440,'height':810})
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:5173/?capture&script&' + q)
        await pg.wait_for_function('window.__ready === true', timeout=60000)
        cur = 0
        pos = []
        for i, t in enumerate(targets):
            left = t - cur - 1
            while left > 0:
                k = min(left, 300); await pg.evaluate(JS_STEP, [k, False]); left -= k
            r = await pg.evaluate(JS_STEP, [1, True]); cur = t
            open(f'{out}/f{i:04d}.png','wb').write(base64.b64decode(r['img'].split(',')[1]))
            pos.append([r['px'], r['py']])
        await b.close()
        import json; json.dump(pos, open(f'{out}/pos.json','w'))
        for e in errs[:10]: print('ERR', e)
asyncio.run(main())
