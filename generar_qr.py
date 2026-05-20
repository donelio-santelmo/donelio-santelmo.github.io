import qrcode
from PIL import Image, ImageDraw, ImageFont
import os

URL    = "https://donelio-santelmo.github.io/carta.html"
EMBER  = (255, 77, 0)
DARK   = (13, 13, 13)
WHITE  = (240, 240, 240)
GOLD   = (212, 160, 23)

# QR code
qr = qrcode.QRCode(
    version=3,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=2,
)
qr.add_data(URL)
qr.make(fit=True)

qr_img = qr.make_image(fill_color=DARK, back_color=WHITE).convert("RGBA")
qr_w, qr_h = qr_img.size

PADDING   = 40
HEADER_H  = 100
FOOTER_H  = 60
STRIPE_H  = 8

canvas_w = qr_w + PADDING * 2
canvas_h = HEADER_H + qr_h + FOOTER_H + STRIPE_H * 2
canvas   = Image.new("RGBA", (canvas_w, canvas_h), DARK)
draw     = ImageDraw.Draw(canvas)

# Ember stripes top & bottom
draw.rectangle([0, 0, canvas_w, STRIPE_H], fill=EMBER)
draw.rectangle([0, canvas_h - STRIPE_H, canvas_w, canvas_h], fill=EMBER)

# Header text
try:
    font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia Bold.ttf", 36)
    font_sub   = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", 20)
    font_foot  = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", 18)
except OSError:
    font_title = ImageFont.load_default()
    font_sub   = font_title
    font_foot  = font_title

title = "Don Elio"
sub   = "Parrilla · San Telmo"
footer_text = "Escaneá · Ver la carta completa"

def centered_x(text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return (canvas_w - (bbox[2] - bbox[0])) // 2

# Title
draw.text((centered_x(title, font_title), STRIPE_H + 14), title, fill=EMBER, font=font_title)
# Subtitle
draw.text((centered_x(sub, font_sub), STRIPE_H + 58), sub, fill=WHITE, font=font_sub)

# Paste QR
qr_x = PADDING
qr_y = STRIPE_H + HEADER_H
canvas.paste(qr_img, (qr_x, qr_y))

# Footer
draw.text(
    (centered_x(footer_text, font_foot), qr_y + qr_h + 16),
    footer_text, fill=GOLD, font=font_foot
)

out_path = os.path.join(os.path.dirname(__file__), "qr_donelio.png")
canvas.save(out_path)
print(f"QR guardado en: {out_path}")
