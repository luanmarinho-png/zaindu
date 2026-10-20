"""Print production cards. Requires reportlab and the private campaign manifest.

Usage: python render-prize-cards.py MANIFEST.json TENOR.ttf OUTPUT_DIRECTORY
Tokens and generated print files must stay outside public/ and Git.
"""
import json
import sys
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qrencoder import QRCode, QRErrorCorrectLevel

manifest, font, output = sys.argv[1:]
cards = json.loads(Path(manifest).read_text())["cards"]
assert len(cards) == 18 and len({c['url'] for c in cards}) == 18
assert sum(c['prize'] == 'free' for c in cards) == 1
out = Path(output)
out.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Tenor', font))
ROOT, VITAL, PAPER, NECTAR = map(HexColor, ['#414636', '#647055', '#EFEADF', '#DDD2C3'])

def logo(c, x, y, size, background=VITAL):
    c.saveState()
    c.translate(x, y)
    c.scale(size / 96, size / 96)
    c.setFillColor(background)
    c.roundRect(0, 0, 96, 96, 25, fill=1, stroke=0)
    c.setStrokeColor(HexColor('#F8F7F2'))
    c.setLineWidth(8)
    c.setLineCap(1)
    c.setLineJoin(1)
    p = c.beginPath(); p.moveTo(27, 66); p.lineTo(70, 66); p.lineTo(27, 30); p.lineTo(70, 30)
    c.drawPath(p, stroke=1)
    c.setStrokeColor(HexColor('#D9DDCF')); c.setLineWidth(5)
    c.line(69, 66, 69, 30)
    c.restoreState()

def qr(c, url, x, y, size):
    code = QRCode(None, QRErrorCorrectLevel.H)
    code.addData(url)
    code.make()
    n = code.moduleCount
    step = size / (n + 8)  # ISO quiet zone: four full modules on every edge.
    c.setFillColor(white)
    c.roundRect(x - 1.5*mm, y - 1.5*mm, size + 3*mm, size + 3*mm, 3*mm, fill=1, stroke=0)
    c.setFillColor(ROOT)
    for row in range(n):
        for col in range(n):
            if code.modules[row][col]:
                c.rect(x + (col + 4)*step, y + (n - row + 3)*step, step + .01, step + .01, fill=1, stroke=0)
    # Small brand mark with high error correction. Every final printed code is decoded in QA.
    mark = 5*step
    cx, cy = x + size/2, y + size/2
    c.setFillColor(white)
    c.roundRect(cx - mark/2 - step, cy - mark/2 - step, mark+2*step, mark+2*step, step, fill=1, stroke=0)
    logo(c, cx-mark/2, cy-mark/2, mark)

def card(c, item, x, y):
    c.saveState(); c.translate(x, y)
    c.setFillColor(PAPER); c.rect(0,0,85*mm,85*mm,fill=1,stroke=0)
    logo(c,26*mm,73.3*mm,6.5*mm)
    c.setFillColor(ROOT); c.setFont('Tenor',14)
    c.drawString(35*mm,74.6*mm,'ZAINDU')
    c.setFont('Tenor',13.5)
    c.drawCentredString(42.5*mm,64.3*mm,'Um presente para')
    c.drawCentredString(42.5*mm,58.3*mm,'o seu consultório.')
    qr(c,item['url'],25*mm,19.8*mm,35*mm)
    c.setFillColor(ROOT); c.setFont('Helvetica-Bold',8.3)
    c.drawCentredString(42.5*mm,13.8*mm,'Escaneie e descubra o seu presente.')
    c.setFont('Helvetica',6.6)
    c.drawCentredString(42.5*mm,9.1*mm,'Cadastre-se para revelar. Guarde este cartão.')
    c.setFillColor(VITAL); c.setFont('Helvetica',6)
    c.drawCentredString(42.5*mm,4.3*mm,f"lp.zaindu.app   |   Cartão {item['card']:02d} de 18")
    c.restoreState()

def crops(c,x,y):
    c.setStrokeColor(HexColor('#999999')); c.setLineWidth(.25)
    for a,b,dx,dy in [(x,y,-1,-1),(x+85*mm,y,1,-1),(x,y+85*mm,-1,1),(x+85*mm,y+85*mm,1,1)]:
        c.line(a+dx*.7*mm,b,a+dx*2.5*mm,b)
        c.line(a,b+dy*.7*mm,a,b+dy*2.5*mm)

a4 = out / 'ZAINDU-18-cartoes-ecobags-A4.pdf'
c=canvas.Canvas(str(a4),pagesize=(210*mm,297*mm),pageCompression=1)
c.setTitle('ZAINDU | 18 presentes para as ecobags')
c.setAuthor('ZAINDU')
for page in range(3):
    for pos in range(6):
        x=(17 + (pos%2)*91)*mm
        y=(191 - (pos//2)*91)*mm
        card(c,cards[page*6+pos],x,y); crops(c,x,y)
    c.setFillColor(VITAL); c.setFont('Helvetica',6)
    c.drawCentredString(105*mm,6*mm,f'ZAINDU  |  Imprimir em tamanho real (100%)  |  Cartões 85 x 85 mm  |  {page+1}/3')
    c.showPage()
c.save()
individual=out/'ZAINDU-18-cartoes-individuais-85mm.pdf'
c=canvas.Canvas(str(individual),pagesize=(85*mm,85*mm),pageCompression=1)
c.setTitle('ZAINDU | Cartões individuais 85 x 85 mm')
c.setAuthor('ZAINDU')
for item in cards:
    card(c,item,0,0); c.showPage()
c.save()
print('PDF A4: 3 páginas, 6 cartões por página. PDF individual: 18 páginas, 85 x 85 mm.')
