"""Pone Icono.png como ícono de la app Android.

Uso:  python3 iconos.py RUTA/Icono.png RUTA/android/app/src/main/res
Necesita Pillow (pip install pillow). Lo ejecuta la fábrica de la app en GitHub.

- Ícono clásico (ic_launcher / ic_launcher_round) para Android 7.
- Ícono adaptable (Android 8+): el dibujo va centrado y más pequeño sobre fondo blanco,
  porque cada marca de celular recorta el ícono con una forma distinta (círculo, gota...).
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

DENSIDADES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
FONDO = (255, 255, 255, 255)


def cuadrado(img):
    """Pone la imagen en un lienzo cuadrado transparente sin deformarla."""
    lado = max(img.size)
    lienzo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    lienzo.paste(img, ((lado - img.width) // 2, (lado - img.height) // 2), img)
    return lienzo


def con_fondo(img, lado, escala):
    """Fondo blanco + dibujo centrado ocupando `escala` del lado."""
    lienzo = Image.new("RGBA", (lado, lado), FONDO)
    interior = max(1, round(lado * escala))
    dibujo = img.resize((interior, interior), Image.LANCZOS)
    pos = (lado - interior) // 2
    lienzo.paste(dibujo, (pos, pos), dibujo)
    return lienzo


def redondo(img):
    mascara = Image.new("L", img.size, 0)
    ImageDraw.Draw(mascara).ellipse((0, 0, img.width - 1, img.height - 1), fill=255)
    salida = Image.new("RGBA", img.size, (0, 0, 0, 0))
    salida.paste(img, (0, 0), mascara)
    return salida


def generar(origen, carpeta_res):
    base = cuadrado(Image.open(origen).convert("RGBA"))
    carpeta_res = Path(carpeta_res)
    if not carpeta_res.is_dir():
        raise SystemExit(f"No existe la carpeta {carpeta_res}")
    hechos = []
    for nombre, factor in DENSIDADES.items():
        carpeta = carpeta_res / f"mipmap-{nombre}"
        carpeta.mkdir(parents=True, exist_ok=True)
        lado = round(48 * factor)
        clasico = con_fondo(base, lado, 0.84)
        clasico.save(carpeta / "ic_launcher.png")
        redondo(con_fondo(base, lado, 0.72)).save(carpeta / "ic_launcher_round.png")
        # Capa del ícono adaptable: 108 dp, con el dibujo dentro de la zona segura (~66 dp)
        lado_fg = round(108 * factor)
        frente = Image.new("RGBA", (lado_fg, lado_fg), (0, 0, 0, 0))
        interior = round(lado_fg * 0.58)
        dibujo = base.resize((interior, interior), Image.LANCZOS)
        pos = (lado_fg - interior) // 2
        frente.paste(dibujo, (pos, pos), dibujo)
        frente.save(carpeta / "ic_launcher_foreground.png")
        hechos.append(nombre)

    # Color de fondo del ícono adaptable
    valores = carpeta_res / "values"
    valores.mkdir(parents=True, exist_ok=True)
    (valores / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n',
        encoding="utf-8",
    )
    # Definición del ícono adaptable (se reemplaza la de la plantilla para que use lo de arriba)
    adaptable = carpeta_res / "mipmap-anydpi-v26"
    adaptable.mkdir(parents=True, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@color/ic_launcher_background"/>\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
           '</adaptive-icon>\n')
    for nombre in ("ic_launcher.xml", "ic_launcher_round.xml"):
        (adaptable / nombre).write_text(xml, encoding="utf-8")
    return hechos


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: python3 iconos.py Icono.png android/app/src/main/res")
    print("Íconos generados:", ", ".join(generar(sys.argv[1], sys.argv[2])))
