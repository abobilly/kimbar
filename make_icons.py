from PIL import Image, ImageDraw

def save_png(name, size, draw_func):
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_func(draw, size[0], size[1])
    img.save(f"{name}.png")
    print(f"Saved {name}.png")

# --- PALETTES ---
GOLD = [(20, 10, 5), (139, 69, 19), (218, 165, 32), (255, 215, 0), (255, 255, 224)] # Outline, Shadow, Mid, Light, Highlight
QUILL = [(20, 20, 20), (245, 245, 245), (200, 200, 200), (218, 165, 32)] # Outline, Feather, Shadow, Gold Nib
DOC = [(40, 30, 20), (245, 222, 179), (210, 180, 140), (60, 50, 40), (178, 34, 34)] # Outline, Paper, Shadow, Text, Seal
WOOD = [(26, 15, 10), (62, 39, 35), (139, 69, 19), (160, 82, 45), (205, 133, 63)] # Outline, Dark, Mid, Light, Highlight
LEATHER = [(20, 20, 20), (50, 30, 20), (101, 67, 33), (139, 90, 43), (180, 120, 60)] # Outline, Dark, Mid, Light, Highlight
BRASS = [(40, 30, 10), (139, 119, 42), (184, 134, 11), (218, 165, 32), (255, 215, 0)] # Outline, Dark, Mid, Light, Highlight
PAPER = [(60, 60, 60), (255, 250, 240), (245, 245, 220), (222, 184, 135)] # Outline, White, Cream, Manila
GLASS = [(40, 60, 80), (200, 220, 240), (230, 245, 255), (160, 200, 230)] # Outline, Mid, Highlight, Water
RED = [(80, 20, 20), (180, 40, 40), (220, 60, 60), (255, 100, 100)] # Outline, Dark, Mid, Light
CARDBOARD = [(50, 35, 25), (160, 120, 80), (190, 150, 100), (210, 170, 120)] # Outline, Dark, Mid, Light
BLACK = [(10, 10, 10), (40, 40, 40), (80, 80, 80), (120, 120, 120)] # Outline, Dark, Mid, Light

# Deliberation Room Palettes
MAHOGANY = [(20, 8, 5), (45, 20, 15), (85, 40, 25), (115, 55, 35), (145, 75, 50)] # Outline, Dark, Mid, Light, Highlight

# SCOTUS Exterior Palettes
MARBLE = [(20, 20, 30), (245, 245, 250), (200, 200, 210), (160, 160, 175), (255, 255, 255)] # Outline, Main, Mid, Shadow, Highlight
BRONZE = [(30, 20, 10), (80, 50, 30), (140, 100, 50), (180, 140, 70), (220, 180, 100)] # Outline, Dark, Mid, Light, Highlight
SKY = [(100, 140, 180), (150, 190, 220), (200, 220, 240), (240, 248, 255)] # Deep, Mid, Light, White
FOLIAGE = [(15, 30, 15), (34, 80, 34), (46, 120, 46), (80, 160, 80), (120, 180, 100)] # Outline, Dark, Mid, Light, Highlight
SILVER = [(30, 30, 35), (100, 100, 110), (192, 192, 192), (240, 248, 255)] # Outline, Dark, Silver, Shine

# --- DRAWING FUNCTIONS ---

def draw_scales(d, w, h):
    cx, top, base = w // 2, 10, 56
    # Base
    d.rectangle([cx-6, base-4, cx+6, base], fill=GOLD[1], outline=GOLD[0])
    d.rectangle([cx-4, base-4, cx+4, base-2], fill=GOLD[2])
    # Pole
    d.rectangle([cx-2, top, cx+2, base-4], fill=GOLD[2], outline=GOLD[0])
    d.line([cx, top+2, cx, base-6], fill=GOLD[4], width=1)
    # Beam
    d.rectangle([cx-24, top+4, cx+24, top+8], fill=GOLD[2], outline=GOLD[0])
    d.rectangle([cx-2, top+2, cx+2, top+10], fill=GOLD[3], outline=GOLD[0])
    # Pans
    for x_off in [-22, 22]:
        px = cx + x_off
        py = top + 8
        d.line([px, py, px-8, py+18], fill=GOLD[0]) # Chains
        d.line([px, py, px+8, py+18], fill=GOLD[0])
        d.pieslice([px-10, py+14, px+10, py+26], 0, 180, fill=GOLD[2], outline=GOLD[0]) # Bowl

def draw_quill(d, w, h):
    # Shaft
    d.line([6, 26, 26, 6], fill=QUILL[2], width=3)
    # Feather
    d.polygon([(10, 22), (24, 4), (27, 7), (14, 24)], fill=QUILL[1], outline=QUILL[0])
    # Nib
    d.polygon([(6, 26), (9, 23), (11, 25)], fill=QUILL[3], outline=QUILL[0])

def draw_doc(d, w, h):
    # Paper
    d.rectangle([6, 4, 26, 28], fill=DOC[1], outline=DOC[0])
    # Text
    for y in range(8, 22, 3): d.line([9, y, 23, y], fill=DOC[3], width=1)
    # Seal
    d.ellipse([17, 19, 23, 25], fill=DOC[4], outline=DOC[0])
    d.line([20, 22, 22, 28], fill=DOC[4], width=1)

def draw_gavel(d, w, h):
    # Handle (angled bottom-left to top-right)
    d.polygon([(4, 24), (8, 20), (22, 10), (18, 14)], fill=WOOD[2], outline=WOOD[0])
    d.line([6, 22, 20, 12], fill=WOOD[4], width=1)  # Highlight
    # Mallet head (perpendicular to handle)
    d.polygon([(16, 6), (26, 4), (28, 10), (18, 12)], fill=WOOD[3], outline=WOOD[0])
    d.rectangle([18, 5, 26, 9], fill=WOOD[2], outline=WOOD[0])
    d.line([19, 6, 25, 6], fill=WOOD[4], width=1)  # Top highlight

def draw_gavel_block(d, w, h):
    cx, cy = w // 2, h // 2
    # Octagonal base
    pts = [(cx-8, cy-3), (cx-3, cy-8), (cx+3, cy-8), (cx+8, cy-3),
           (cx+8, cy+3), (cx+3, cy+8), (cx-3, cy+8), (cx-8, cy+3)]
    d.polygon(pts, fill=WOOD[2], outline=WOOD[0])
    # Inner circle (striking surface)
    d.ellipse([cx-5, cy-5, cx+5, cy+5], fill=WOOD[3], outline=WOOD[1])
    d.ellipse([cx-3, cy-3, cx+1, cy+1], fill=WOOD[4])  # Highlight

def draw_law_book(d, w, h):
    # Book body (angled)
    d.polygon([(4, 8), (24, 6), (28, 24), (8, 26)], fill=(128, 0, 32), outline=DOC[0])
    # Spine
    d.polygon([(4, 8), (8, 26), (6, 27), (2, 9)], fill=(100, 0, 25), outline=DOC[0])
    # Pages edge
    d.polygon([(24, 6), (28, 24), (27, 25), (23, 7)], fill=DOC[1], outline=DOC[0])
    # Gold text on spine
    d.line([4, 12, 7, 24], fill=GOLD[3], width=1)
    d.line([5, 14, 7, 22], fill=GOLD[3], width=1)

def draw_briefcase(d, w, h):
    # Body
    d.rectangle([4, 10, 28, 26], fill=LEATHER[2], outline=LEATHER[0])
    d.rectangle([5, 11, 27, 25], fill=LEATHER[3])  # Inner face
    d.line([5, 11, 27, 11], fill=LEATHER[4], width=1)  # Top highlight
    # Handle
    d.rectangle([12, 6, 20, 10], fill=LEATHER[1], outline=LEATHER[0])
    d.rectangle([14, 7, 18, 9], fill=(0, 0, 0, 0))  # Handle hole (transparent)
    # Clasps
    d.rectangle([9, 17, 12, 20], fill=BRASS[3], outline=BRASS[0])
    d.rectangle([20, 17, 23, 20], fill=BRASS[3], outline=BRASS[0])

def draw_nameplate(d, w, h):
    # Base stand
    d.polygon([(4, 12), (12, 14), (36, 14), (44, 12), (44, 16), (4, 16)], fill=BRASS[1], outline=BRASS[0])
    # Plate
    d.rectangle([8, 4, 40, 12], fill=BRASS[3], outline=BRASS[0])
    d.rectangle([10, 5, 38, 11], fill=BRASS[4])  # Highlight face
    # "JUDGE" text (simplified)
    d.line([14, 8, 16, 8], fill=BRASS[0], width=1)  # J
    d.line([18, 6, 18, 10], fill=BRASS[0], width=1) # U stem
    d.line([22, 6, 22, 10], fill=BRASS[0], width=1) # D
    d.line([26, 6, 26, 10], fill=BRASS[0], width=1) # G
    d.line([30, 6, 32, 6], fill=BRASS[0], width=1)  # E top

def draw_paper_stack(d, w, h):
    # Manila folder (bottom)
    d.polygon([(3, 12), (28, 10), (29, 28), (4, 30)], fill=PAPER[3], outline=PAPER[0])
    # Papers (stacked, offset)
    for i, offset in enumerate([(2, 4), (1, 2), (0, 0)]):
        x, y = 6 + offset[0], 8 + offset[1]
        shade = PAPER[1] if i == 2 else PAPER[2]
        d.polygon([(x, y+2), (x+18, y), (x+19, y+16), (x+1, y+18)], fill=shade, outline=PAPER[0])
    # Text lines on top paper
    for y in range(12, 22, 3):
        d.line([9, y, 21, y], fill=(100, 100, 100), width=1)

def draw_witness_stand(d, w, h):
    # Base platform
    d.polygon([(8, 56), (56, 56), (60, 62), (4, 62)], fill=WOOD[2], outline=WOOD[0])
    d.line([10, 57, 54, 57], fill=WOOD[4], width=1)  # Top highlight
    # Front panel (angled view)
    d.polygon([(12, 32), (52, 32), (56, 56), (8, 56)], fill=WOOD[3], outline=WOOD[0])
    d.line([14, 34, 50, 34], fill=WOOD[4], width=1)  # Top edge highlight
    # Side panel (left side visible in angled view)
    d.polygon([(4, 36), (12, 32), (8, 56), (4, 52)], fill=WOOD[1], outline=WOOD[0])
    # Top ledge (angled podium surface)
    d.polygon([(10, 30), (54, 30), (52, 32), (12, 32)], fill=WOOD[4], outline=WOOD[0])
    # Railing posts
    for x in [14, 28, 42]:
        d.rectangle([x, 20, x+4, 30], fill=WOOD[2], outline=WOOD[0])
        d.line([x+1, 21, x+1, 29], fill=WOOD[4], width=1)
    # Top rail
    d.rectangle([12, 18, 48, 22], fill=WOOD[3], outline=WOOD[0])
    d.line([14, 19, 46, 19], fill=WOOD[4], width=1)

def draw_jury_bench(d, w, h):
    # Seat (long horizontal)
    d.rectangle([4, 16, 60, 22], fill=WOOD[3], outline=WOOD[0])
    d.line([6, 17, 58, 17], fill=WOOD[4], width=1)  # Top highlight
    # Back support
    d.rectangle([4, 6, 60, 12], fill=WOOD[2], outline=WOOD[0])
    d.line([6, 7, 58, 7], fill=WOOD[4], width=1)  # Top highlight
    # Back posts connecting seat to back
    for x in [8, 28, 48]:
        d.rectangle([x, 10, x+4, 18], fill=WOOD[1], outline=WOOD[0])
    # Legs
    for x in [8, 52]:
        d.rectangle([x, 20, x+4, 30], fill=WOOD[1], outline=WOOD[0])

def draw_courtroom_railing(d, w, h):
    # Bottom rail
    d.rectangle([2, 24, 62, 30], fill=WOOD[3], outline=WOOD[0])
    d.line([4, 25, 60, 25], fill=WOOD[4], width=1)
    # Top rail
    d.rectangle([2, 4, 62, 10], fill=WOOD[3], outline=WOOD[0])
    d.line([4, 5, 60, 5], fill=WOOD[4], width=1)
    # Vertical bars
    for x in range(6, 58, 8):
        d.rectangle([x, 8, x+3, 26], fill=WOOD[2], outline=WOOD[0])
        d.line([x+1, 10, x+1, 24], fill=WOOD[4], width=1)
    # Gate post (thicker, right side)
    d.rectangle([54, 2, 60, 30], fill=WOOD[1], outline=WOOD[0])
    d.ellipse([55, 12, 59, 16], fill=BRASS[3], outline=BRASS[0])  # Gate latch

def draw_flag_stand(d, w, h):
    # Base (circular stand)
    d.ellipse([8, 56, 24, 62], fill=BRASS[2], outline=BRASS[0])
    d.ellipse([10, 57, 22, 60], fill=BRASS[4])  # Highlight
    # Pole
    d.rectangle([14, 8, 18, 58], fill=BRASS[2], outline=BRASS[0])
    d.line([15, 10, 15, 56], fill=BRASS[4], width=1)  # Highlight
    # Pole top ornament (eagle/ball simplified as sphere)
    d.ellipse([12, 2, 20, 10], fill=GOLD[3], outline=GOLD[0])
    d.ellipse([13, 3, 17, 7], fill=GOLD[4])  # Highlight
    # Flag (simplified rectangle, waving effect)
    d.polygon([(18, 10), (30, 8), (30, 28), (18, 26)], fill=RED[2], outline=RED[0])
    d.line([20, 12, 28, 11], fill=RED[3], width=1)  # Stripe highlight
    d.line([20, 18, 28, 17], fill=PAPER[1], width=1)  # White stripe
    d.line([20, 24, 28, 23], fill=RED[3], width=1)  # Stripe highlight

def draw_evidence_box(d, w, h):
    # Box body
    d.rectangle([4, 12, 28, 28], fill=CARDBOARD[2], outline=CARDBOARD[0])
    # Box front face shading
    d.rectangle([5, 13, 27, 27], fill=CARDBOARD[3])
    d.line([5, 13, 27, 13], fill=CARDBOARD[3], width=1)
    # Box flaps (open)
    d.polygon([(4, 12), (8, 6), (12, 12)], fill=CARDBOARD[1], outline=CARDBOARD[0])
    d.polygon([(20, 12), (24, 6), (28, 12)], fill=CARDBOARD[1], outline=CARDBOARD[0])
    # Papers sticking out
    d.polygon([(10, 4), (14, 4), (15, 14), (9, 14)], fill=PAPER[1], outline=PAPER[0])
    d.polygon([(16, 2), (20, 2), (21, 12), (15, 12)], fill=PAPER[2], outline=PAPER[0])
    d.polygon([(22, 6), (25, 6), (25, 14), (22, 14)], fill=PAPER[1], outline=PAPER[0])
    # Text lines on front paper
    d.line([11, 6, 13, 6], fill=(100, 100, 100), width=1)
    d.line([17, 4, 19, 4], fill=(100, 100, 100), width=1)

def draw_microphone(d, w, h):
    # Base
    d.ellipse([4, 26, 12, 30], fill=BLACK[2], outline=BLACK[0])
    d.ellipse([5, 27, 11, 29], fill=BLACK[3])  # Highlight
    # Stem
    d.rectangle([6, 12, 10, 28], fill=BLACK[2], outline=BLACK[0])
    d.line([7, 14, 7, 26], fill=BLACK[3], width=1)  # Highlight
    # Mic head
    d.ellipse([3, 4, 13, 14], fill=BLACK[1], outline=BLACK[0])
    # Mic grille pattern
    d.ellipse([4, 5, 12, 13], fill=BLACK[2])
    d.line([6, 6, 6, 12], fill=BLACK[0], width=1)
    d.line([8, 5, 8, 13], fill=BLACK[0], width=1)
    d.line([10, 6, 10, 12], fill=BLACK[0], width=1)

def draw_water_pitcher(d, w, h):
    # Glass (small, right side)
    d.rectangle([22, 18, 30, 28], fill=GLASS[1], outline=GLASS[0])
    d.rectangle([23, 19, 29, 27], fill=GLASS[2])  # Highlight
    d.rectangle([23, 22, 29, 27], fill=GLASS[3])  # Water level
    # Pitcher body
    d.polygon([(4, 8), (18, 8), (20, 28), (2, 28)], fill=GLASS[1], outline=GLASS[0])
    d.polygon([(5, 10), (17, 10), (19, 26), (3, 26)], fill=GLASS[2])  # Inner highlight
    d.polygon([(5, 14), (17, 14), (19, 26), (3, 26)], fill=GLASS[3])  # Water level
    # Handle
    d.arc([14, 12, 22, 24], 270, 90, fill=GLASS[0], width=2)
    # Spout
    d.polygon([(2, 8), (4, 8), (4, 12), (0, 10)], fill=GLASS[1], outline=GLASS[0])

def draw_court_seal(d, w, h):
    cx, cy = w // 2, h // 2
    # Outer ring
    d.ellipse([4, 4, 44, 44], fill=GOLD[2], outline=GOLD[0])
    # Inner ring
    d.ellipse([8, 8, 40, 40], fill=GOLD[3], outline=GOLD[1])
    # Center circle
    d.ellipse([14, 14, 34, 34], fill=GOLD[4], outline=GOLD[1])
    # Scales symbol in center (simplified)
    d.line([cx-6, cy, cx+6, cy], fill=GOLD[0], width=1)  # Beam
    d.line([cx, cy-6, cx, cy+2], fill=GOLD[0], width=1)  # Pole
    d.arc([cx-8, cy-2, cx-2, cy+4], 0, 180, fill=GOLD[0], width=1)  # Left pan
    d.arc([cx+2, cy-2, cx+8, cy+4], 0, 180, fill=GOLD[0], width=1)  # Right pan
    # Decorative dots around edge
    for angle in range(0, 360, 30):
        import math
        ax = cx + int(18 * math.cos(math.radians(angle)))
        ay = cy + int(18 * math.sin(math.radians(angle)))
        d.ellipse([ax-1, ay-1, ax+1, ay+1], fill=GOLD[1])

def draw_exit_sign(d, w, h):
    # Sign body (illuminated box)
    d.rectangle([2, 2, 30, 14], fill=RED[2], outline=RED[0])
    # Inner glow
    d.rectangle([3, 3, 29, 13], fill=RED[3])
    # "EXIT" text (simplified block letters)
    # E
    d.line([5, 5, 5, 11], fill=PAPER[1], width=1)
    d.line([5, 5, 7, 5], fill=PAPER[1], width=1)
    d.line([5, 8, 6, 8], fill=PAPER[1], width=1)
    d.line([5, 11, 7, 11], fill=PAPER[1], width=1)
    # X
    d.line([9, 5, 12, 11], fill=PAPER[1], width=1)
    d.line([12, 5, 9, 11], fill=PAPER[1], width=1)
    # I
    d.line([15, 5, 15, 11], fill=PAPER[1], width=1)
    # T
    d.line([18, 5, 22, 5], fill=PAPER[1], width=1)
    d.line([20, 5, 20, 11], fill=PAPER[1], width=1)
    # Arrow (right pointing)
    d.line([24, 8, 28, 8], fill=PAPER[1], width=1)
    d.line([26, 6, 28, 8], fill=PAPER[1], width=1)
    d.line([26, 10, 28, 8], fill=PAPER[1], width=1)

def draw_clock(d, w, h):
    cx, cy = w // 2, h // 2
    # Clock face
    d.ellipse([4, 4, 28, 28], fill=PAPER[1], outline=WOOD[0])
    d.ellipse([5, 5, 27, 27], fill=PAPER[2])
    # Hour markers
    for angle in range(0, 360, 30):
        import math
        inner_r, outer_r = 9, 11
        ax1 = cx + int(inner_r * math.sin(math.radians(angle)))
        ay1 = cy - int(inner_r * math.cos(math.radians(angle)))
        ax2 = cx + int(outer_r * math.sin(math.radians(angle)))
        ay2 = cy - int(outer_r * math.cos(math.radians(angle)))
        d.line([ax1, ay1, ax2, ay2], fill=WOOD[0], width=1)
    # Hour hand (pointing to ~10)
    d.line([cx, cy, cx-4, cy-5], fill=WOOD[0], width=2)
    # Minute hand (pointing to ~2)
    d.line([cx, cy, cx+5, cy-6], fill=WOOD[0], width=1)
    # Center dot
    d.ellipse([cx-2, cy-2, cx+2, cy+2], fill=WOOD[0])
    # Frame ring
    d.ellipse([2, 2, 30, 30], outline=WOOD[1], width=2)

# --- SCOTUS DEEP CUT DETAILS (Authentic courtroom items) ---

def draw_spittoon(d, w, h):
    """16x16 brass spittoon (placed next to each Justice's chair)"""
    cx = w // 2
    base_y = h - 2
    
    # Body (Bulbous pot shape)
    d.ellipse([cx-5, base_y-8, cx+5, base_y], fill=BRASS[3], outline=BRASS[0])
    
    # Rim (Flared top)
    d.polygon([(cx-6, base_y-8), (cx+6, base_y-8), (cx+3, base_y-5), (cx-3, base_y-5)], 
              fill=BRASS[3], outline=BRASS[0])
    
    # Rim interior (Shadow)
    d.line([cx-4, base_y-7, cx+4, base_y-7], fill=BRASS[1], width=1)
    
    # Body shadow
    d.ellipse([cx-3, base_y-6, cx+3, base_y-2], fill=BRASS[2])
    
    # Shine highlight
    d.point([cx+2, base_y-4], fill=BRASS[4])
    d.point([cx+3, base_y-5], fill=BRASS[4])

def draw_pewter_mug(d, w, h):
    """16x16 silver/pewter mug (Justices drink from these, not glass)"""
    cx = w // 2
    by = h - 2
    
    # Cup body
    d.rectangle([cx-4, by-9, cx+3, by], fill=SILVER[2], outline=SILVER[0])
    
    # Body shading (left side darker)
    d.rectangle([cx-3, by-8, cx-1, by-1], fill=SILVER[1])
    
    # Interior/Rim darkness
    d.line([cx-3, by-8, cx+2, by-8], fill=SILVER[1])
    
    # Handle (C-shaped on right side)
    d.line([cx+3, by-7, cx+5, by-6], fill=SILVER[0]) # Top
    d.line([cx+5, by-6, cx+5, by-3], fill=SILVER[0]) # Vertical
    d.line([cx+5, by-3, cx+3, by-2], fill=SILVER[0]) # Bottom
    
    # Highlight
    d.line([cx+1, by-7, cx+1, by-2], fill=SILVER[3], width=1)

def draw_argument_lectern(d, w, h):
    """32x32 lawyer's lectern with the famous white/red warning lights"""
    cx = w // 2
    by = h - 2
    
    # Base/Stand (wider at bottom)
    d.polygon([(cx-8, by), (cx+8, by), (cx+6, by-18), (cx-6, by-18)], 
              fill=WOOD[2], outline=WOOD[0])
    
    # Front panel
    d.rectangle([cx-6, by-16, cx+6, by-4], fill=WOOD[3])
    
    # Wood grain detail lines
    d.line([cx-2, by-14, cx-2, by-6], fill=WOOD[1])
    d.line([cx+2, by-14, cx+2, by-6], fill=WOOD[1])
    
    # Angled desktop top
    d.polygon([(cx-8, by-18), (cx+8, by-18), (cx+9, by-22), (cx-9, by-22)], 
              fill=WOOD[4], outline=WOOD[0])
    
    # === THE FAMOUS WARNING LIGHTS ===
    # White Light (5 minutes remaining)
    d.rectangle([cx-5, by-20, cx-2, by-18], fill=(255, 255, 255), outline=BLACK[0])
    
    # Red Light (STOP immediately)
    d.rectangle([cx+2, by-20, cx+5, by-18], fill=(200, 0, 0), outline=BLACK[0])
    
    # Microphone (gooseneck style)
    d.line([cx, by-22, cx+3, by-27], fill=SILVER[1], width=1)  # Neck
    d.ellipse([cx+2, by-29, cx+5, by-27], fill=BLACK[1], outline=BLACK[0])  # Mic head

def draw_quill_pen_crossed(d, w, h):
    """32x16 crossed white goose-quill pens (placed on counsel tables daily)"""
    # Two quills crossed in an X pattern
    
    # Left quill (bottom-left to top-right)
    d.line([4, 14, 28, 2], fill=(200, 200, 200), width=2)
    d.polygon([(4, 14), (8, 10), (10, 12)], fill=(255, 255, 255), outline=QUILL[0])  # Feather base
    d.polygon([(26, 4), (28, 2), (30, 4), (28, 6)], fill=QUILL[3], outline=QUILL[0])  # Gold nib
    
    # Right quill (bottom-right to top-left)
    d.line([28, 14, 4, 2], fill=(200, 200, 200), width=2)
    d.polygon([(28, 14), (24, 10), (26, 12)], fill=(255, 255, 255), outline=QUILL[0])  # Feather base
    d.polygon([(4, 4), (2, 2), (4, 2), (6, 4)], fill=QUILL[3], outline=QUILL[0])  # Gold nib

def draw_conference_table(d, w, h):
    """64x48 oval mahogany conference table for Justice deliberation room"""
    cx, cy = w // 2, h // 2
    
    # Table dimensions
    rx, ry = 30, 20  # Radii for oval
    
    # === Table shadow (offset slightly for 3/4 view depth) ===
    d.ellipse([cx-rx+2, cy-ry+4, cx+rx+2, cy+ry+4], fill=MAHOGANY[0])
    
    # === Table edge/apron (visible rim in 3/4 view) ===
    # Bottom edge visible
    d.ellipse([cx-rx, cy-ry+3, cx+rx, cy+ry+3], fill=MAHOGANY[1], outline=MAHOGANY[0])
    
    # === Main table surface ===
    d.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=MAHOGANY[2], outline=MAHOGANY[0])
    
    # === Wood grain/panel details ===
    # Center darker inset panel (formal table detail)
    d.ellipse([cx-rx+6, cy-ry+4, cx+rx-6, cy+ry-4], fill=MAHOGANY[1])
    d.ellipse([cx-rx+8, cy-ry+5, cx+rx-8, cy+ry-5], fill=MAHOGANY[2])
    
    # Wood grain lines (subtle, following oval curve)
    for offset in [-12, -4, 4, 12]:
        # Horizontal grain lines
        x1 = cx - int((rx-10) * (1 - (offset/20)**2)**0.5)
        x2 = cx + int((rx-10) * (1 - (offset/20)**2)**0.5)
        if x2 > x1:
            d.line([x1, cy + offset, x2, cy + offset], fill=MAHOGANY[1], width=1)
    
    # === Highlight along top edge (light source from top-left) ===
    # Arc highlight on upper portion
    d.arc([cx-rx+1, cy-ry+1, cx+rx-1, cy+ry-1], 200, 340, fill=MAHOGANY[4], width=1)
    
    # Additional highlight spots
    d.ellipse([cx-16, cy-12, cx-8, cy-6], fill=MAHOGANY[3])
    
    # === Subtle reflection/polish ===
    d.ellipse([cx-12, cy-10, cx-6, cy-4], fill=MAHOGANY[4])

# =============================================================================
# SCOTUS EXTERIOR CONSTRUCTION KIT
# Modular pieces to build the Supreme Court facade
# =============================================================================

def draw_scotus_column(d, w, h):
    """32x96 Corinthian marble column with fluting"""
    cx = w // 2
    base_h, cap_h, shaft_w = 12, 16, 18
    
    # 1. Base (bottom)
    d.rectangle([cx-12, h-base_h, cx+12, h-1], fill=MARBLE[1], outline=MARBLE[0])
    d.rectangle([cx-10, h-base_h+2, cx+10, h-4], fill=MARBLE[2])
    d.line([cx-11, h-base_h+1, cx+11, h-base_h+1], fill=MARBLE[4], width=1) # Highlight
    
    # 2. Shaft (main column body)
    d.rectangle([cx-shaft_w//2, cap_h, cx+shaft_w//2, h-base_h], fill=MARBLE[1], outline=MARBLE[0])
    
    # Fluting (vertical grooves with highlight/shadow pairs)
    for i in range(-6, 7, 3):
        x = cx + i
        d.line([x, cap_h+2, x, h-base_h-2], fill=MARBLE[3], width=1)      # Shadow
        d.line([x+1, cap_h+2, x+1, h-base_h-2], fill=MARBLE[4], width=1)  # Highlight
    
    # 3. Capital (ornate top) - Corinthian style with scrolls
    d.rectangle([cx-14, 0, cx+14, cap_h], fill=MARBLE[1], outline=MARBLE[0])
    # Scrolls (volutes)
    d.ellipse([cx-11, 3, cx-5, 9], outline=MARBLE[3])
    d.ellipse([cx+5, 3, cx+11, 9], outline=MARBLE[3])
    # Acanthus leaf hints
    d.line([cx-3, 10, cx-3, cap_h-2], fill=MARBLE[3], width=1)
    d.line([cx+3, 10, cx+3, cap_h-2], fill=MARBLE[3], width=1)
    d.line([cx, 8, cx, cap_h-2], fill=MARBLE[3], width=1)
    # Top edge highlight
    d.line([cx-13, 1, cx+13, 1], fill=MARBLE[4], width=1)

def draw_scotus_stairs(d, w, h):
    """32x32 tileable marble stairs (3 steps, repeats horizontally)"""
    step_h = h // 3
    
    for i in range(3):
        y = i * step_h
        # Step top surface (bright marble)
        d.rectangle([0, y, w-1, y + step_h - 5], fill=MARBLE[1])
        # Top edge highlight
        d.line([0, y+1, w-1, y+1], fill=MARBLE[4], width=1)
        # Step vertical face (shadowed)
        d.rectangle([0, y + step_h - 5, w-1, y + step_h - 1], fill=MARBLE[3])
        # Separation lines
        d.line([0, y, w-1, y], fill=MARBLE[0], width=1)
    # Bottom edge
    d.line([0, h-1, w-1, h-1], fill=MARBLE[0], width=1)

def draw_scotus_pediment(d, w, h):
    """64x32 triangular roof section (place above columns)"""
    # Main triangle
    points = [(0, h-1), (w//2, 2), (w-1, h-1)]
    d.polygon(points, fill=MARBLE[1], outline=MARBLE[0])
    # Inner shadow triangle for depth
    inner = [(4, h-3), (w//2, 6), (w-5, h-3)]
    d.polygon(inner, fill=MARBLE[2])
    # Top edge highlight
    d.line([2, h-2, w//2, 3], fill=MARBLE[4], width=1)
    # Decorative relief area (where "EQUAL JUSTICE" would go)
    d.rectangle([w//2 - 16, h - 12, w//2 + 16, h - 6], fill=MARBLE[3])
    # Tiny columns suggestion
    for x in [w//2 - 12, w//2 - 4, w//2 + 4, w//2 + 12]:
        d.line([x, h-11, x, h-7], fill=MARBLE[0], width=1)

def draw_scotus_entablature(d, w, h):
    """64x16 horizontal piece between columns and pediment (tileable)"""
    # Main body
    d.rectangle([0, 4, w-1, h-1], fill=MARBLE[1], outline=MARBLE[0])
    # Top molding
    d.rectangle([0, 0, w-1, 4], fill=MARBLE[2], outline=MARBLE[0])
    d.line([0, 1, w-1, 1], fill=MARBLE[4], width=1)
    # Bottom molding with dentils
    for x in range(2, w-2, 6):
        d.rectangle([x, h-5, x+3, h-2], fill=MARBLE[3])
    # Frieze decoration
    d.line([0, 8, w-1, 8], fill=MARBLE[3], width=1)

def draw_lamp_post(d, w, h):
    """16x64 ornate street lamp"""
    cx = w // 2
    # Pole
    d.rectangle([cx-2, 20, cx+2, h-6], fill=BLACK[2], outline=BLACK[0])
    d.line([cx, 22, cx, h-8], fill=BLACK[3], width=1) # Highlight
    # Base
    d.rectangle([cx-5, h-6, cx+5, h-1], fill=BLACK[1], outline=BLACK[0])
    d.rectangle([cx-4, h-10, cx+4, h-6], fill=BLACK[2], outline=BLACK[0])
    # Lamp housing
    d.rectangle([cx-6, 8, cx+6, 20], fill=BLACK[2], outline=BLACK[0])
    # Glass panels (glowing)
    d.rectangle([cx-4, 10, cx+4, 18], fill=(255, 250, 200))
    d.rectangle([cx-3, 11, cx+3, 17], fill=(255, 255, 230))
    # Top finial
    d.polygon([(cx-5, 8), (cx, 2), (cx+5, 8)], fill=BLACK[2], outline=BLACK[0])

def draw_bench(d, w, h):
    """48x24 park/courtyard bench"""
    # Seat
    d.rectangle([2, 8, w-3, 14], fill=WOOD[2], outline=WOOD[0])
    d.line([3, 9, w-4, 9], fill=WOOD[4], width=1) # Highlight
    # Slats
    for y in [10, 12]:
        d.line([4, y, w-5, y], fill=WOOD[1], width=1)
    # Back rest
    d.rectangle([4, 2, w-5, 8], fill=WOOD[2], outline=WOOD[0])
    d.line([5, 3, w-6, 3], fill=WOOD[4], width=1)
    # Legs (cast iron style)
    for x in [6, w-8]:
        d.rectangle([x, 14, x+4, h-1], fill=BLACK[2], outline=BLACK[0])
        # Decorative curve
        d.arc([x-1, 16, x+5, 22], 0, 180, fill=BLACK[1])

def draw_tree(d, w, h):
    """32x64 deciduous tree"""
    cx = w // 2
    # Trunk
    d.rectangle([cx-3, 40, cx+3, h-1], fill=WOOD[1], outline=WOOD[0])
    d.line([cx-1, 42, cx-1, h-2], fill=WOOD[3], width=1)
    d.line([cx+1, 42, cx+1, h-2], fill=WOOD[4], width=1)
    # Foliage (layered circles for depth)
    for (ox, oy, r) in [(0, 24, 12), (-8, 20, 10), (8, 20, 10), (-4, 12, 11), (4, 12, 11), (0, 8, 9)]:
        x, y = cx + ox, oy
        d.ellipse([x-r, y-r, x+r, y+r], fill=FOLIAGE[2], outline=FOLIAGE[0])
    # Highlight spots
    for (ox, oy) in [(-4, 8), (5, 14), (-6, 22)]:
        d.ellipse([cx+ox-3, oy-3, cx+ox+3, oy+3], fill=FOLIAGE[3])

def draw_bush(d, w, h):
    """32x24 decorative hedge/bush"""
    cx, cy = w // 2, h // 2 + 4
    # Main body
    d.ellipse([2, 6, w-3, h-2], fill=FOLIAGE[2], outline=FOLIAGE[0])
    # Depth layers
    d.ellipse([4, 8, w//2, h-4], fill=FOLIAGE[1])
    d.ellipse([w//2-4, 10, w-5, h-3], fill=FOLIAGE[3])
    # Highlight spots
    d.ellipse([8, 8, 14, 14], fill=FOLIAGE[4])
    d.ellipse([w-14, 10, w-8, 16], fill=FOLIAGE[4])

def draw_flagpole(d, w, h):
    """16x80 tall flagpole with American flag"""
    cx = w // 2
    # Pole
    d.rectangle([cx-1, 8, cx+1, h-1], fill=BLACK[3], outline=BLACK[0])
    d.line([cx, 10, cx, h-2], fill=BLACK[3], width=1)
    # Base
    d.rectangle([cx-4, h-8, cx+4, h-1], fill=BRONZE[2], outline=BRONZE[0])
    # Top ornament (gold ball)
    d.ellipse([cx-3, 2, cx+3, 8], fill=GOLD[3], outline=GOLD[0])
    # Flag (simplified, waving)
    flag_top, flag_h = 12, 24
    # Blue canton
    d.rectangle([cx+2, flag_top, cx+2+10, flag_top+10], fill=(0, 40, 104))
    # Red and white stripes
    for i in range(6):
        y = flag_top + 10 + i*2
        color = (191, 10, 48) if i % 2 == 0 else (255, 255, 255)
        d.rectangle([cx+2, y, cx+2+18, y+2], fill=color)
    # Stars (simplified dots)
    for sy in [flag_top+2, flag_top+5, flag_top+8]:
        for sx in [cx+4, cx+7, cx+10]:
            d.point([sx, sy], fill=(255, 255, 255))

def draw_planter(d, w, h):
    """32x32 stone planter with flowers"""
    cx = w // 2
    # Stone pot
    d.polygon([(4, 14), (8, h-1), (w-9, h-1), (w-5, 14)], fill=MARBLE[2], outline=MARBLE[0])
    d.line([6, 15, w-7, 15], fill=MARBLE[4], width=1)
    # Rim
    d.rectangle([2, 12, w-3, 16], fill=MARBLE[1], outline=MARBLE[0])
    # Dirt
    d.ellipse([6, 10, w-7, 16], fill=(60, 40, 30))
    # Flowers (red and yellow)
    for (ox, color) in [(-6, RED[2]), (0, GOLD[3]), (6, RED[3])]:
        x = cx + ox
        d.ellipse([x-3, 4, x+3, 10], fill=color, outline=FOLIAGE[0])
        d.ellipse([x-1, 6, x+1, 8], fill=GOLD[4])  # Center
    # Leaves
    for ox in [-8, 8]:
        d.ellipse([cx+ox-2, 8, cx+ox+2, 14], fill=FOLIAGE[2])

# --- OFFICE FURNITURE ---

def draw_bookshelf(d, w, h):
    """32x48 wooden bookshelf with 3-4 shelves filled with books"""
    # Back panel
    d.rectangle([2, 2, w-3, h-2], fill=WOOD[1], outline=WOOD[0])
    
    # Left side panel (visible edge in 3/4 view)
    d.polygon([(2, 2), (5, 4), (5, h-4), (2, h-2)], fill=WOOD[2], outline=WOOD[0])
    
    # Right side panel
    d.polygon([(w-3, 2), (w-6, 4), (w-6, h-4), (w-3, h-2)], fill=WOOD[3], outline=WOOD[0])
    
    # Shelves (4 levels with books)
    shelf_ys = [6, 16, 26, 36]
    for sy in shelf_ys:
        # Shelf plank
        d.rectangle([5, sy, w-6, sy+2], fill=WOOD[3], outline=WOOD[0])
        d.line([6, sy, w-7, sy], fill=WOOD[4], width=1)  # Top highlight
        
        # Books on shelf (varying heights and colors)
        book_colors = [
            (128, 0, 32),   # Maroon
            (0, 64, 128),   # Navy
            (64, 96, 64),   # Forest
            (139, 69, 19),  # Brown
            (80, 40, 80),   # Purple
            (160, 82, 45),  # Sienna
        ]
        x = 6
        while x < w - 10:
            book_w = 3 + (x % 2)  # Vary width 3-4px
            book_h = 7 + (x % 3)  # Vary height 7-9px
            color = book_colors[(x // 3) % len(book_colors)]
            # Book spine (main face)
            d.rectangle([x, sy - book_h, x + book_w, sy], fill=color, outline=WOOD[0])
            # Highlight stripe on spine
            d.line([x + 1, sy - book_h + 1, x + 1, sy - 1], fill=tuple(min(c + 40, 255) for c in color), width=1)
            x += book_w + 1
    
    # Bottom shelf (no books, just the plank)
    d.rectangle([5, h-6, w-6, h-4], fill=WOOD[3], outline=WOOD[0])
    d.line([6, h-6, w-7, h-6], fill=WOOD[4], width=1)
    
    # Top crown molding
    d.rectangle([1, 1, w-2, 4], fill=WOOD[3], outline=WOOD[0])
    d.line([3, 2, w-4, 2], fill=WOOD[4], width=1)

def draw_file_cabinet(d, w, h):
    """32x48 metal file cabinet with 3 drawers"""
    # Cabinet body
    d.rectangle([3, 2, w-4, h-2], fill=SILVER[2], outline=SILVER[0])
    
    # Left side panel (darker, 3/4 view)
    d.polygon([(3, 2), (6, 4), (6, h-4), (3, h-2)], fill=SILVER[1], outline=SILVER[0])
    
    # Top surface
    d.polygon([(3, 2), (w-4, 2), (w-7, 4), (6, 4)], fill=SILVER[3], outline=SILVER[0])
    
    # Three drawers
    drawer_h = 13
    for i in range(3):
        dy = 5 + i * (drawer_h + 1)
        # Drawer face
        d.rectangle([7, dy, w-8, dy + drawer_h], fill=SILVER[2], outline=SILVER[0])
        # Drawer inset shadow
        d.line([8, dy + 1, w-9, dy + 1], fill=SILVER[1], width=1)
        d.line([8, dy + 1, 8, dy + drawer_h - 1], fill=SILVER[1], width=1)
        # Drawer highlight (bottom right)
        d.line([9, dy + drawer_h - 1, w-9, dy + drawer_h - 1], fill=SILVER[3], width=1)
        # Handle (horizontal bar)
        handle_y = dy + drawer_h // 2
        d.rectangle([12, handle_y - 1, w-13, handle_y + 1], fill=SILVER[1], outline=SILVER[0])
        d.line([13, handle_y - 1, w-14, handle_y - 1], fill=SILVER[3], width=1)
        # Label slot
        d.rectangle([14, dy + 2, w-15, dy + 5], fill=PAPER[1], outline=SILVER[0])

def draw_laptop(d, w, h):
    """32x32 open laptop with screen facing viewer"""
    cx = w // 2
    
    # Screen (back panel, angled)
    d.polygon([(4, 4), (w-5, 4), (w-3, 18), (2, 18)], fill=BLACK[1], outline=BLACK[0])
    
    # Screen display area (bright)
    d.polygon([(6, 6), (w-7, 6), (w-5, 16), (4, 16)], fill=(60, 100, 140), outline=BLACK[0])
    
    # Screen content (simplified code/text lines)
    for ly in [8, 10, 12, 14]:
        line_w = 12 + (ly % 4)
        d.line([8, ly, 8 + line_w, ly], fill=(150, 200, 255), width=1)
    
    # Screen bezel highlight
    d.line([6, 6, w-7, 6], fill=BLACK[3], width=1)
    
    # Keyboard base (3/4 perspective)
    d.polygon([(1, 18), (w-2, 18), (w-1, 28), (0, 28)], fill=BLACK[2], outline=BLACK[0])
    
    # Keyboard surface (top face)
    d.polygon([(2, 18), (w-3, 18), (w-2, 20), (1, 20)], fill=BLACK[3], outline=BLACK[0])
    
    # Keyboard keys (simplified grid)
    for ky in [21, 24]:
        for kx in range(4, w-5, 4):
            d.rectangle([kx, ky, kx+2, ky+2], fill=BLACK[1], outline=BLACK[0])
    
    # Trackpad
    d.rectangle([cx-4, 26, cx+4, 28], fill=BLACK[1], outline=BLACK[0])
    d.line([cx-3, 27, cx+3, 27], fill=BLACK[3], width=1)
    
    # Power LED (small green dot)
    d.point([cx, 19], fill=(0, 255, 0))

def draw_whiteboard(d, w, h):
    """48x32 whiteboard with metal frame and white center"""
    # Frame (silver/gray metal)
    d.rectangle([1, 1, w-2, h-2], fill=SILVER[1], outline=SILVER[0])
    
    # Frame top highlight
    d.line([2, 2, w-3, 2], fill=SILVER[3], width=1)
    
    # Frame left highlight
    d.line([2, 2, 2, h-3], fill=SILVER[2], width=1)
    
    # White board surface (inset)
    d.rectangle([4, 4, w-5, h-5], fill=PAPER[1], outline=SILVER[0])
    
    # Slight cream tint for realism
    d.rectangle([5, 5, w-6, h-6], fill=(252, 252, 250))
    
    # Some marker scribbles (light traces)
    # Blue marker line
    d.line([8, 8, 20, 8], fill=(100, 140, 200), width=1)
    d.line([8, 11, 28, 11], fill=(100, 140, 200), width=1)
    
    # Red marker line
    d.line([10, 14, 24, 14], fill=(200, 100, 100), width=1)
    
    # Black marker (heading)
    d.line([8, 18, 18, 18], fill=(60, 60, 60), width=1)
    d.line([8, 21, 30, 21], fill=(80, 80, 80), width=1)
    d.line([8, 24, 26, 24], fill=(80, 80, 80), width=1)
    
    # Marker tray at bottom
    d.rectangle([6, h-4, w-7, h-2], fill=SILVER[2], outline=SILVER[0])
    d.line([7, h-4, w-8, h-4], fill=SILVER[3], width=1)
    
    # Markers in tray
    d.rectangle([10, h-4, 14, h-2], fill=(20, 60, 120), outline=BLACK[0])  # Blue marker
    d.rectangle([16, h-4, 20, h-2], fill=(160, 40, 40), outline=BLACK[0])  # Red marker
    d.rectangle([22, h-4, 26, h-2], fill=(40, 40, 40), outline=BLACK[0])   # Black marker

# --- EXECUTE ---
if __name__ == "__main__":
    import os
    out_dir = "vendor/props/legal"
    os.makedirs(out_dir, exist_ok=True)
    
    def save_to(name, size, draw_func):
        img = Image.new('RGBA', size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw_func(draw, size[0], size[1])
        path = f"{out_dir}/{name}.png"
        img.save(path)
        print(f"Saved {path}")
    
    # Original set
    save_to("scales_of_justice_proc", (64, 64), draw_scales)
    save_to("quill_pen_proc", (32, 32), draw_quill)
    save_to("legal_document_proc", (32, 32), draw_doc)
    
    # Round 2
    save_to("gavel_proc", (32, 32), draw_gavel)
    save_to("gavel_block_proc", (32, 32), draw_gavel_block)
    save_to("law_book_proc", (32, 32), draw_law_book)
    save_to("briefcase_proc", (32, 32), draw_briefcase)
    save_to("nameplate_proc", (48, 16), draw_nameplate)
    save_to("paper_stack_proc", (32, 32), draw_paper_stack)
    
    # Round 3 - Courthouse props
    save_to("witness_stand_proc", (64, 64), draw_witness_stand)
    save_to("jury_bench_proc", (64, 32), draw_jury_bench)
    save_to("courtroom_railing_proc", (64, 32), draw_courtroom_railing)
    save_to("flag_stand_proc", (32, 64), draw_flag_stand)
    save_to("evidence_box_proc", (32, 32), draw_evidence_box)
    save_to("microphone_proc", (16, 32), draw_microphone)
    save_to("water_pitcher_proc", (32, 32), draw_water_pitcher)
    save_to("court_seal_proc", (48, 48), draw_court_seal)
    save_to("exit_sign_proc", (32, 16), draw_exit_sign)
    save_to("clock_proc", (32, 32), draw_clock)
    
    # Round 5 - SCOTUS Deep Cut Details (authentic courtroom items)
    save_to("spittoon_proc", (16, 16), draw_spittoon)
    save_to("pewter_mug_proc", (16, 16), draw_pewter_mug)
    save_to("argument_lectern_proc", (32, 32), draw_argument_lectern)
    save_to("quill_pen_crossed_proc", (32, 16), draw_quill_pen_crossed)
    
    # Round 6 - Deliberation Room
    save_to("conference_table_proc", (64, 48), draw_conference_table)
    
    # Round 7 - Office Furniture
    save_to("bookshelf_proc", (32, 48), draw_bookshelf)
    save_to("file_cabinet_proc", (32, 48), draw_file_cabinet)
    save_to("laptop_proc", (32, 32), draw_laptop)
    save_to("whiteboard_proc", (48, 32), draw_whiteboard)
    
    # Round 4 - SCOTUS Exterior Construction Kit
    exterior_dir = "vendor/props/exterior"
    os.makedirs(exterior_dir, exist_ok=True)
    
    def save_exterior(name, size, draw_func):
        img = Image.new('RGBA', size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw_func(draw, size[0], size[1])
        path = f"{exterior_dir}/{name}.png"
        img.save(path)
        print(f"Saved {path}")
    
    # Building Components (tileable/modular)
    save_exterior("scotus_column", (32, 96), draw_scotus_column)
    save_exterior("scotus_stairs", (32, 32), draw_scotus_stairs)
    save_exterior("scotus_pediment", (64, 32), draw_scotus_pediment)
    save_exterior("scotus_entablature", (64, 16), draw_scotus_entablature)
    
    # Outdoor Props
    save_exterior("lamp_post", (16, 64), draw_lamp_post)
    save_exterior("bench", (48, 24), draw_bench)
    save_exterior("tree", (32, 64), draw_tree)
    save_exterior("bush", (32, 24), draw_bush)
    save_exterior("flagpole", (16, 80), draw_flagpole)
    save_exterior("planter", (32, 32), draw_planter)