#!/usr/bin/env python3
"""
Convert SVG icon to PNG format for better Firefox compatibility
"""

import os
import sys
import subprocess

def create_png_from_svg(svg_file, png_file, size):
    """Convert SVG to PNG using built-in tools"""
    try:
        # Try using rsvg-convert (if available)
        subprocess.run([
            'rsvg-convert',
            '-w', str(size),
            '-h', str(size),
            svg_file,
            '-o', png_file
        ], check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    try:
        # Try using ImageMagick convert
        subprocess.run([
            'convert',
            '-background', 'transparent',
            '-size', f'{size}x{size}',
            svg_file,
            png_file
        ], check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    try:
        # Try using inkscape
        subprocess.run([
            'inkscape',
            '--export-type=png',
            f'--export-width={size}',
            f'--export-height={size}',
            f'--export-filename={png_file}',
            svg_file
        ], check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    return False

def create_simple_png(png_file, size):
    """Create a simple PNG icon if conversion tools aren't available"""
    try:
        from PIL import Image, ImageDraw

        # Create image with transparent background
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Draw background circle
        margin = size // 8
        draw.ellipse([margin, margin, size-margin, size-margin],
                    fill=(248, 249, 250, 255),
                    outline=(173, 181, 189, 255),
                    width=max(1, size//32))

        # Draw inner circle with gradient effect
        inner_margin = size // 4
        draw.ellipse([inner_margin, inner_margin, size-inner_margin, size-inner_margin],
                    fill=(108, 117, 125, 255))

        # Draw checkmark
        if size >= 32:
            # Checkmark coordinates scaled to size
            x1, y1 = size * 0.35, size * 0.5
            x2, y2 = size * 0.45, size * 0.6
            x3, y3 = size * 0.65, size * 0.4

            # Draw checkmark lines
            draw.line([(x1, y1), (x2, y2)], fill=(255, 255, 255, 255), width=max(2, size//16))
            draw.line([(x2, y2), (x3, y3)], fill=(255, 255, 255, 255), width=max(2, size//16))

        img.save(png_file)
        return True
    except ImportError:
        return False

def main():
    svg_file = "icon.svg"

    if not os.path.exists(svg_file):
        print(f"❌ SVG file not found: {svg_file}")
        return False

    sizes = [16, 32, 48, 128]
    success_count = 0

    for size in sizes:
        png_file = f"icon-{size}.png"

        print(f"🎨 Creating {png_file}...")

        # Try SVG conversion first
        if create_png_from_svg(svg_file, png_file, size):
            print(f"✅ Created {png_file} from SVG")
            success_count += 1
        # Fallback to simple PNG creation
        elif create_simple_png(png_file, size):
            print(f"✅ Created {png_file} with fallback method")
            success_count += 1
        else:
            print(f"❌ Failed to create {png_file}")

    print(f"\n🎉 Created {success_count}/{len(sizes)} PNG icons")

    if success_count > 0:
        print("✅ PNG icons ready for maximum Firefox compatibility!")
        return True
    else:
        print("❌ No PNG icons could be created. SVG should still work in most cases.")
        return False

if __name__ == "__main__":
    main()
