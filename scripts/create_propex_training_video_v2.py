# -*- coding: utf-8 -*-
"""Render a concise, action-first PROpEx training video from real UI captures."""

from __future__ import annotations

import json
import math
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CAPTURE_DIR = ROOT / "tmp" / "training-video" / "captures"
WORK_DIR = ROOT / "tmp" / "training-video-v2"
AUDIO_DIR = WORK_DIR / "audio"
OUTPUT_DIR = ROOT / "exports"

VIDEO_OUT = OUTPUT_DIR / "Video_Entrenamiento_PROpEx_Demostracion_Objetiva.mp4"
PREVIEW_OUT = OUTPUT_DIR / "Video_Entrenamiento_PROpEx_Demostracion_Objetiva_preview.png"
SCRIPT_OUT = OUTPUT_DIR / "Guion_Video_Entrenamiento_PROpEx_Objetivo.txt"
SILENT_VIDEO = WORK_DIR / "video_sin_audio.mp4"
NARRATION_WAV = WORK_DIR / "narracion.wav"

WIDTH = 1600
HEIGHT = 896
FPS = 15
ASPECT = WIDTH / HEIGHT

FONT_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_SEMIBOLD = Path(r"C:\Windows\Fonts\seguisb.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")

PROBOCA_RED = "#EA0029"
BLACK = "#0B0E11"
WHITE = "#FFFFFF"
MUTED = "#C5CDD5"


@dataclass(frozen=True)
class DemoScene:
    image: str
    role: str
    color: str
    action: str
    result: str
    narration: str
    crop: tuple[float, float, float, float]
    cursor_start: tuple[float, float] | None = None
    cursor_end: tuple[float, float] | None = None
    cursor_label: str = ""
    title_card: bool = False


SCENES = [
    DemoScene(
        image="01_operador_inicio.png",
        role="PROpEx · IDEAS DE MEJORA",
        color=PROBOCA_RED,
        action="Demostración operativa",
        result="Del QR a la entrega de ProbocaCoins",
        narration="Este es el flujo completo de una idea de mejora, desde el operador hasta la entrega de ProbocaCoins.",
        crop=(0.0, 0.0, 1.0, 1.0),
        title_card=True,
    ),
    DemoScene(
        image="02_operador_idea_completa.png",
        role="OPERADOR",
        color="#14835F",
        action="Captura datos y describe el problema",
        result="Datos básicos y problema registrados",
        narration="Operador: confirma sus datos y escribe el problema observado. La propuesta y el beneficio deben ser concretos y verificables.",
        crop=(0.13, 0.20, 0.74, 0.73),
        cursor_start=(0.34, 0.41),
        cursor_end=(0.73, 0.86),
        cursor_label="ESCRIBE",
    ),
    DemoScene(
        image="03_operador_apoyos.png",
        role="OPERADOR",
        color="#14835F",
        action="Selecciona apoyos e impactos",
        result="Calidad, Seguridad y Mantenimiento seleccionados",
        narration="Selecciona categoria B cuando la idea necesite apoyo interno. Marca unicamente las areas que deben revisar o ejecutar.",
        crop=(0.12, 0.10, 0.77, 0.81),
        cursor_start=(0.36, 0.37),
        cursor_end=(0.73, 0.63),
        cursor_label="MARCA",
    ),
    DemoScene(
        image="04_folio_confirmado.png",
        role="SISTEMA",
        color=PROBOCA_RED,
        action="Confirma el folio generado",
        result="IM-000011 enviado al supervisor de P1",
        narration="Al enviar, el sistema genera el folio IM cero cero cero cero once y asigna la idea al supervisor del area.",
        crop=(0.22, 0.14, 0.56, 0.66),
        cursor_end=(0.50, 0.50),
        cursor_label="FOLIO",
    ),
    DemoScene(
        image="05_supervisor_justifica.png",
        role="SUPERVISOR",
        color="#14835F",
        action="Revisa, justifica y aprueba",
        result="Idea aprobada y justificación guardada",
        narration="Supervisor: confirma los apoyos, escribe la justificacion de su decision y selecciona Aprobar idea.",
        crop=(0.18, 0.06, 0.80, 0.63),
        cursor_start=(0.58, 0.48),
        cursor_end=(0.28, 0.61),
        cursor_label="APROBAR",
    ),
    DemoScene(
        image="06_supervisor_aprobada.png",
        role="SISTEMA",
        color=PROBOCA_RED,
        action="Comprueba el cambio de estado",
        result="Se crean tres validaciones de soporte",
        narration="La aprobacion crea las validaciones requeridas y mantiene visible el mismo folio para todos los participantes.",
        crop=(0.04, 0.03, 0.92, 0.56),
        cursor_end=(0.77, 0.29),
        cursor_label="VALIDACIONES",
    ),
    DemoScene(
        image="07_calidad_valida.png",
        role="CALIDAD / INOCUIDAD",
        color="#D32236",
        action="Registra el criterio de Calidad",
        result="Validación de Calidad aprobada",
        narration="Calidad revisa producto y proceso, registra su criterio y aprueba la validacion.",
        crop=(0.17, 0.28, 0.81, 0.66),
        cursor_start=(0.62, 0.69),
        cursor_end=(0.49, 0.89),
        cursor_label="APROBAR",
    ),
    DemoScene(
        image="08_seguridad_valida.png",
        role="SEGURIDAD",
        color="#626A70",
        action="Confirma que el riesgo disminuye",
        result="Validación de Seguridad aprobada",
        narration="Seguridad confirma que el riesgo disminuye y que la propuesta no crea una condicion nueva.",
        crop=(0.17, 0.28, 0.81, 0.66),
        cursor_start=(0.62, 0.69),
        cursor_end=(0.49, 0.89),
        cursor_label="APROBAR",
    ),
    DemoScene(
        image="09_mantenimiento_valida.png",
        role="MANTENIMIENTO",
        color="#176FC1",
        action="Valida la factibilidad técnica",
        result="Validación de Mantenimiento aprobada",
        narration="Mantenimiento confirma materiales, acceso y tiempo de intervencion antes de aprobar.",
        crop=(0.17, 0.28, 0.81, 0.66),
        cursor_start=(0.62, 0.69),
        cursor_end=(0.49, 0.89),
        cursor_label="APROBAR",
    ),
    DemoScene(
        image="10_mc_clasifica.png",
        role="MEJORA CONTINUA",
        color="#111111",
        action="Clasifica y asigna prioridad",
        result="Idea de mejora · Prioridad Alta",
        narration="Mejora Continua clasifica la idea, asigna prioridad y registra el criterio de seguimiento.",
        crop=(0.17, 0.35, 0.72, 0.63),
        cursor_start=(0.56, 0.67),
        cursor_end=(0.31, 0.96),
        cursor_label="GUARDAR",
    ),
    DemoScene(
        image="11_mc_asigna.png",
        role="MEJORA CONTINUA",
        color="#111111",
        action="Asigna responsable y fecha",
        result="Mantenimiento · Compromiso 14/08/2026",
        narration="Despues asigna responsable, fecha compromiso y la evidencia requerida para el cierre.",
        crop=(0.17, 0.34, 0.78, 0.64),
        cursor_start=(0.60, 0.63),
        cursor_end=(0.67, 0.92),
        cursor_label="ASIGNAR",
    ),
    DemoScene(
        image="12_implementacion_evidencia.png",
        role="RESPONSABLE",
        color="#176FC1",
        action="Carga evidencia y termina el trabajo",
        result="Estado Implementada · Evidencia cargada",
        narration="El responsable describe lo realizado, carga la evidencia despues y marca el trabajo terminado.",
        crop=(0.20, 0.31, 0.77, 0.66),
        cursor_start=(0.58, 0.66),
        cursor_end=(0.75, 0.90),
        cursor_label="GUARDAR",
    ),
    DemoScene(
        image="14_cierre_probocacoins.png",
        role="MEJORA CONTINUA",
        color="#111111",
        action="Revisa la sugerencia y cierra",
        result="Sugerencia automática: 410 ProbocaCoins",
        narration="Mejora Continua revisa la sugerencia automatica, ajusta las reglas si corresponde y confirma el cierre.",
        crop=(0.60, 0.27, 0.39, 0.70),
        cursor_start=(0.78, 0.53),
        cursor_end=(0.88, 0.83),
        cursor_label="REVISA",
    ),
    DemoScene(
        image="15_probocacoins_entregadas.png",
        role="RECOMPENSA",
        color="#D89A00",
        action="Confirma la recompensa otorgada",
        result="Estado Cerrada · 410 ProbocaCoins",
        narration="La idea queda cerrada con cuatrocientos diez ProbocaCoins y conserva todas las decisiones en el historial.",
        crop=(0.58, 0.27, 0.41, 0.71),
        cursor_end=(0.91, 0.59),
        cursor_label="410",
    ),
    DemoScene(
        image="16_supervisor_seguimiento_final.png",
        role="SUPERVISOR",
        color="#14835F",
        action="Consulta el resultado final",
        result="El supervisor conserva la trazabilidad completa",
        narration="El supervisor consulta el resultado final, las validaciones y la recompensa desde su misma bandeja.",
        crop=(0.14, 0.18, 0.83, 0.70),
        cursor_end=(0.82, 0.57),
        cursor_label="CERRADA",
    ),
]


def ensure_dirs() -> None:
    for directory in (WORK_DIR, AUDIO_DIR, OUTPUT_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def text_width(draw: ImageDraw.ImageDraw, value: str, font_obj) -> int:
    bounds = draw.textbbox((0, 0), value, font=font_obj)
    return bounds[2] - bounds[0]


def wrap_text(draw: ImageDraw.ImageDraw, value: str, font_obj, max_width: int) -> list[str]:
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if text_width(draw, candidate, font_obj) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def target_crop(rect: tuple[float, float, float, float], image_size: tuple[int, int]) -> tuple[float, float, float, float]:
    x, y, width, height = rect
    image_width, image_height = image_size
    pixel_width = width * image_width
    pixel_height = height * image_height
    current_aspect = pixel_width / max(1.0, pixel_height)
    if current_aspect < ASPECT:
        pixel_width = pixel_height * ASPECT
        width = pixel_width / image_width
    else:
        pixel_height = pixel_width / ASPECT
        height = pixel_height / image_height
    center_x = x + rect[2] / 2
    center_y = y + rect[3] / 2
    x = min(max(0.0, center_x - width / 2), max(0.0, 1.0 - width))
    y = min(max(0.0, center_y - height / 2), max(0.0, 1.0 - height))
    return x, y, min(width, 1.0), min(height, 1.0)


def interpolate_crop(target: tuple[float, float, float, float], progress: float) -> tuple[float, float, float, float]:
    zoom_progress = smoothstep((progress - 0.05) / 0.52)
    full = (0.0, 0.0, 1.0, 1.0)
    return tuple(full[index] + (target[index] - full[index]) * zoom_progress for index in range(4))  # type: ignore[return-value]


def render_screenshot(scene: DemoScene, progress: float) -> tuple[Image.Image, tuple[float, float, float, float]]:
    image = Image.open(CAPTURE_DIR / scene.image).convert("RGB")
    target = target_crop(scene.crop, image.size)
    crop = interpolate_crop(target, progress)
    x, y, width, height = crop
    box = (
        round(x * image.width),
        round(y * image.height),
        round((x + width) * image.width),
        round((y + height) * image.height),
    )
    cropped = image.crop(box)
    screen = ImageOps.fit(cropped, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS)
    return ImageEnhance.Contrast(screen).enhance(1.02), crop


def map_point(point: tuple[float, float], crop: tuple[float, float, float, float]) -> tuple[int, int]:
    x, y, width, height = crop
    mapped_x = (point[0] - x) / max(width, 0.001) * WIDTH
    mapped_y = (point[1] - y) / max(height, 0.001) * HEIGHT
    return int(mapped_x), int(mapped_y)


def draw_pointer(draw: ImageDraw.ImageDraw, x: int, y: int, color: str, progress: float, label: str) -> None:
    pointer = [(x, y), (x + 10, y + 33), (x + 18, y + 24), (x + 31, y + 39), (x + 39, y + 32), (x + 25, y + 18), (x + 40, y + 15)]
    draw.polygon(pointer, fill=WHITE, outline=BLACK)
    pulse = (math.sin(progress * math.pi * 8) + 1.0) / 2.0
    if progress > 0.67:
        radius = int(16 + pulse * 8)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=color, width=5)
    if label:
        label_font = font(FONT_BOLD, 18)
        label_width = text_width(draw, label, label_font) + 26
        label_x = min(WIDTH - label_width - 20, x + 26)
        label_y = max(120, min(HEIGHT - 150, y - 45))
        draw.rounded_rectangle((label_x, label_y, label_x + label_width, label_y + 38), radius=5, fill=color)
        draw.text((label_x + 13, label_y + 8), label, font=label_font, fill=WHITE)


def draw_title_card(scene: DemoScene, index: int, total: int, progress: float) -> Image.Image:
    image = Image.open(CAPTURE_DIR / scene.image).convert("RGB")
    image = ImageOps.fit(image, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS)
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (7, 10, 13, 205))
    frame = Image.alpha_composite(image.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(frame)

    logo_path = ROOT / "public" / "brand" / "proboca-logo.png"
    logo = Image.open(logo_path).convert("RGBA")
    logo.thumbnail((230, 90), Image.Resampling.LANCZOS)
    draw.rectangle((80, 85, 350, 190), fill=WHITE)
    frame.alpha_composite(logo, (100, 95))
    draw.text((80, 255), scene.role, font=font(FONT_BOLD, 23), fill="#F6A5B2")
    draw.text((80, 305), scene.action, font=font(FONT_BOLD, 62), fill=WHITE)
    draw.text((80, 405), scene.result, font=font(FONT_SEMIBOLD, 35), fill="#E6EAF0")
    draw.rectangle((80, 492, 500, 500), fill=PROBOCA_RED)
    draw.text((80, 545), "OPERADOR → SUPERVISOR → SOPORTE → CIERRE", font=font(FONT_BOLD, 23), fill=WHITE)
    draw.text((80, 710), f"{index + 1:02d} / {total:02d}", font=font(FONT_BOLD, 20), fill=MUTED)
    draw.rectangle((0, 0, round(WIDTH * progress), 8), fill=PROBOCA_RED)
    return frame.convert("RGB")


def render_frame(scene: DemoScene, index: int, total: int, local_progress: float, global_progress: float) -> Image.Image:
    if scene.title_card:
        return draw_title_card(scene, index, total, global_progress)

    frame, crop = render_screenshot(scene, local_progress)
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # Compact instruction band: one action only.
    overlay_draw.rectangle((0, 0, WIDTH, 106), fill=(11, 14, 17, 242))
    overlay_draw.rectangle((0, 0, round(WIDTH * global_progress), 8), fill=PROBOCA_RED)
    role_font = font(FONT_BOLD, 19)
    role_width = text_width(overlay_draw, scene.role, role_font) + 34
    overlay_draw.rounded_rectangle((28, 28, 28 + role_width, 75), radius=5, fill=scene.color)
    overlay_draw.text((45, 39), scene.role, font=role_font, fill=WHITE)
    action_font = font(FONT_BOLD, 38)
    overlay_draw.text((60 + role_width, 28), scene.action, font=action_font, fill=WHITE)
    overlay_draw.text((1470, 38), f"{index + 1:02d}/{total:02d}", font=font(FONT_BOLD, 20), fill=MUTED)

    # Result band: state change, not narration filler.
    overlay_draw.rectangle((0, HEIGHT - 102, WIDTH, HEIGHT), fill=(11, 14, 17, 242))
    overlay_draw.rectangle((0, HEIGHT - 102, 10, HEIGHT), fill=scene.color)
    overlay_draw.text((34, HEIGHT - 78), "RESULTADO", font=font(FONT_BOLD, 18), fill=scene.color)
    result_font = font(FONT_SEMIBOLD, 31)
    result_lines = wrap_text(overlay_draw, scene.result, result_font, 1260)[:2]
    for line_index, line in enumerate(result_lines):
        overlay_draw.text((176, HEIGHT - 84 + line_index * 37), line, font=result_font, fill=WHITE)

    composed = Image.alpha_composite(frame.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(composed)

    if scene.cursor_end:
        start = scene.cursor_start or scene.cursor_end
        movement = smoothstep((local_progress - 0.18) / 0.52)
        point = (
            start[0] + (scene.cursor_end[0] - start[0]) * movement,
            start[1] + (scene.cursor_end[1] - start[1]) * movement,
        )
        cursor_x, cursor_y = map_point(point, crop)
        cursor_x = max(20, min(WIDTH - 60, cursor_x))
        cursor_y = max(125, min(HEIGHT - 130, cursor_y))
        draw_pointer(draw, cursor_x, cursor_y, scene.color, local_progress, scene.cursor_label)

    return composed.convert("RGB")


def synthesize_audio() -> list[Path]:
    narration_json = WORK_DIR / "narration.json"
    powershell_script = WORK_DIR / "narration.ps1"
    narration_json.write_text(
        json.dumps([{"text": scene.narration} for scene in SCENES], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    powershell_script.write_text(
        r'''param([string]$InputJson, [string]$OutputDir)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
$items = Get-Content -Raw -Encoding UTF8 $InputJson | ConvertFrom-Json
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$spanish = $voice.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like "es-*" } | Select-Object -First 1
if ($spanish) { $voice.SelectVoice($spanish.VoiceInfo.Name) }
$voice.Rate = 0
$voice.Volume = 100
$index = 0
foreach ($item in $items) {
  $index += 1
  $output = Join-Path $OutputDir ("scene-{0:D2}.wav" -f $index)
  if (Test-Path $output) { Remove-Item -LiteralPath $output -Force }
  $voice.SetOutputToWaveFile($output)
  $voice.Speak([string]$item.text)
  $voice.SetOutputToNull()
}
$voice.Dispose()
''',
        encoding="utf-8",
    )
    subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(powershell_script),
            "-InputJson",
            str(narration_json),
            "-OutputDir",
            str(AUDIO_DIR),
        ],
        check=True,
    )
    return [AUDIO_DIR / f"scene-{index:02d}.wav" for index in range(1, len(SCENES) + 1)]


def audio_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as source:
        return source.getnframes() / source.getframerate()


def combine_audio(files: list[Path], durations: list[float]) -> None:
    with wave.open(str(files[0]), "rb") as first:
        params = first.getparams()
    silence_frame = b"\x00" * params.nchannels * params.sampwidth
    with wave.open(str(NARRATION_WAV), "wb") as output:
        output.setparams(params)
        for path, duration in zip(files, durations):
            with wave.open(str(path), "rb") as source:
                frames = source.readframes(source.getnframes())
                output.writeframes(frames)
                target_frames = round(duration * params.framerate)
                missing = max(0, target_frames - source.getnframes())
                if missing:
                    output.writeframes(silence_frame * missing)


def write_script(durations: list[float]) -> None:
    lines = [
        "VIDEO PROpEx - DEMOSTRACION OPERATIVA OBJETIVA",
        f"Duracion estimada: {sum(durations):.1f} segundos",
        "Folio demostrativo: IM-000011",
        "Recompensa: 410 ProbocaCoins",
        "",
    ]
    for index, (scene, duration) in enumerate(zip(SCENES, durations), 1):
        lines.extend(
            [
                f"{index:02d}. {scene.role} - {scene.action} ({duration:.1f} s)",
                f"Resultado: {scene.result}",
                f"Narracion: {scene.narration}",
                "",
            ]
        )
    SCRIPT_OUT.write_text("\n".join(lines), encoding="utf-8")


def render_video(durations: list[float]) -> None:
    writer = imageio_ffmpeg.write_frames(
        str(SILENT_VIDEO),
        (WIDTH, HEIGHT),
        fps=FPS,
        codec="libx264",
        pix_fmt_in="rgb24",
        pix_fmt_out="yuv420p",
        quality=7,
        output_params=["-preset", "medium", "-movflags", "+faststart"],
    )
    writer.send(None)
    total_frames = sum(max(1, round(duration * FPS)) for duration in durations)
    global_frame = 0
    preview_written = False
    try:
        for scene_index, (scene, duration) in enumerate(zip(SCENES, durations)):
            print(f"RENDER {scene_index + 1:02d}/{len(SCENES):02d} {scene.action}", flush=True)
            scene_frames = max(1, round(duration * FPS))
            for local_frame in range(scene_frames):
                local_progress = local_frame / max(1, scene_frames - 1)
                global_progress = (global_frame + 1) / total_frames
                frame = render_frame(scene, scene_index, len(SCENES), local_progress, global_progress)
                if not preview_written and scene_index == 1 and local_progress >= 0.62:
                    frame.save(PREVIEW_OUT)
                    preview_written = True
                writer.send(np.asarray(frame, dtype=np.uint8))
                global_frame += 1
    finally:
        writer.close()


def mux_and_verify() -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(SILENT_VIDEO),
            "-i",
            str(NARRATION_WAV),
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(VIDEO_OUT),
        ],
        check=True,
    )
    verification = WORK_DIR / "verification.png"
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            "00:00:35",
            "-i",
            str(VIDEO_OUT),
            "-frames:v",
            "1",
            str(verification),
        ],
        check=True,
    )
    if not VIDEO_OUT.exists() or VIDEO_OUT.stat().st_size < 1_000_000:
        raise RuntimeError("El video V2 no se genero correctamente.")
    if not verification.exists() or verification.stat().st_size < 20_000:
        raise RuntimeError("No se pudo extraer el fotograma de verificacion.")
    print(f"VIDEO_OK {VIDEO_OUT} {VIDEO_OUT.stat().st_size} bytes", flush=True)


def main() -> int:
    ensure_dirs()
    missing = [scene.image for scene in SCENES if not (CAPTURE_DIR / scene.image).exists()]
    if missing:
        raise FileNotFoundError(f"Faltan capturas: {', '.join(missing)}")
    audio_files = synthesize_audio()
    durations = [max(5.4, audio_duration(path) + 0.7) for path in audio_files]
    durations[0] = max(4.8, durations[0])
    write_script(durations)
    print(f"DURACION {sum(durations):.1f} segundos", flush=True)
    render_video(durations)
    combine_audio(audio_files, durations)
    mux_and_verify()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
