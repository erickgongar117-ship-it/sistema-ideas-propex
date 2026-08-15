# -*- coding: utf-8 -*-
"""Create an end-to-end PROpEx training video from the real local application.

The script drives a disposable local database through the complete Ideas de
Mejora workflow, captures every role environment, adds Spanish narration and
burned-in subtitles, and exports an MP4 under exports/.
"""

from __future__ import annotations

import json
import math
import os
import re
import sqlite3
import subprocess
import sys
import time
import wave
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qs, urlparse

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps
from playwright.sync_api import Browser, Page, TimeoutError as PlaywrightTimeoutError, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
WORK_DIR = ROOT / "tmp" / "training-video"
CAPTURE_DIR = WORK_DIR / "captures"
AUDIO_DIR = WORK_DIR / "audio"
OUTPUT_DIR = ROOT / "exports"

BASE_URL = os.environ.get("PROPEX_VIDEO_URL", "http://127.0.0.1:3015").rstrip("/")
EDGE_PATH = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
CHROME_PATH = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")

VIDEO_WIDTH = 1600
VIDEO_HEIGHT = 896
FPS = 12
SCREENSHOT_VIEWPORT = {"width": 1440, "height": 810}

FINAL_VIDEO = OUTPUT_DIR / "Video_Entrenamiento_PROpEx_Flujo_Completo.mp4"
SILENT_VIDEO = WORK_DIR / "video_sin_audio.mp4"
NARRATION_WAV = WORK_DIR / "narracion_completa.wav"
PREVIEW_IMAGE = OUTPUT_DIR / "Video_Entrenamiento_PROpEx_preview.png"
SCRIPT_OUTPUT = OUTPUT_DIR / "Guion_Video_Entrenamiento_PROpEx.txt"

FONT_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_SEMIBOLD = Path(r"C:\Windows\Fonts\seguisb.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")

PROBOCA_RED = "#EA0029"
INK = "#101419"
PANEL = "#171C21"
MUTED = "#AEB7C2"
WHITE = "#FFFFFF"


@dataclass(frozen=True)
class Scene:
    image: str
    role: str
    role_color: str
    title: str
    bullets: tuple[str, ...]
    narration: str
    focus: tuple[float, float] = (0.72, 0.58)
    highlight: tuple[float, float, float, float] | None = None
    duration: float = 0.0


def ensure_dirs() -> None:
    for path in (WORK_DIR, CAPTURE_DIR, AUDIO_DIR, OUTPUT_DIR):
        path.mkdir(parents=True, exist_ok=True)


def log(message: str) -> None:
    print(message, flush=True)


def wait_for_server(timeout_seconds: int = 90) -> None:
    import urllib.request

    deadline = time.time() + timeout_seconds
    last_error = ""
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{BASE_URL}/captura/P1", timeout=3) as response:
                if response.status < 500:
                    log(f"Servidor listo en {BASE_URL}")
                    return
        except Exception as exc:  # pragma: no cover - diagnostic path
            last_error = str(exc)
        time.sleep(1.5)
    raise RuntimeError(f"El servidor no respondio en {BASE_URL}: {last_error}")


def dismiss_dev_ui(page: Page) -> None:
    try:
        page.add_style_tag(
            content="nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }"
        )
    except PlaywrightTimeoutError:
        pass


def settle(page: Page, milliseconds: int = 650) -> None:
    page.wait_for_timeout(milliseconds)
    dismiss_dev_ui(page)


def capture(page: Page, filename: str) -> None:
    settle(page)
    page.screenshot(path=str(CAPTURE_DIR / filename), full_page=False, animations="disabled")
    log(f"CAPTURE {filename}")


def new_page(browser: Browser) -> tuple[object, Page]:
    context = browser.new_context(
        viewport=SCREENSHOT_VIEWPORT,
        device_scale_factor=1,
        color_scheme="light",
        locale="es-MX",
    )
    page = context.new_page()
    page.set_default_timeout(20_000)
    return context, page


def login(browser: Browser, email: str) -> tuple[object, Page]:
    context, page = new_page(browser)
    page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
    page.locator('input[name="email"]').fill(email)
    page.locator('input[name="password"]').fill("admin123")
    page.locator('button[type="submit"]').click()
    page.wait_for_url(lambda url: "/login" not in url, timeout=25_000)
    settle(page)
    return context, page


def scroll_to(page: Page, locator) -> None:
    locator.scroll_into_view_if_needed()
    page.wait_for_timeout(350)


def article_for(page: Page, folio: str):
    article = page.locator("article").filter(has_text=folio).first
    article.wait_for(state="visible", timeout=25_000)
    return article


def option_value_containing(select, text: str) -> str:
    options = select.locator("option")
    for index in range(options.count()):
        option = options.nth(index)
        if text.casefold() in option.inner_text().casefold():
            value = option.get_attribute("value")
            if value:
                return value
    raise RuntimeError(f"No se encontro la opcion que contiene: {text}")


def capture_real_workflow() -> dict[str, str]:
    browser_path = EDGE_PATH if EDGE_PATH.exists() else CHROME_PATH
    if not browser_path.exists():
        raise RuntimeError("No se encontro Microsoft Edge ni Google Chrome para capturar la aplicacion.")

    evidence_path = ROOT / "public" / "brand" / "proboca-servicios.jpg"
    result: dict[str, str] = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=str(browser_path),
            args=["--disable-gpu", "--force-device-scale-factor=1"],
        )

        # Operador: registra una idea Categoria B que requiere las tres areas de soporte.
        context, page = new_page(browser)
        page.goto(f"{BASE_URL}/captura/P1", wait_until="domcontentloaded")
        capture(page, "01_operador_inicio.png")
        page.locator('input[name="collaboratorName"]').fill("Operador de entrenamiento")
        page.locator('input[name="employeeNumber"]').fill("100245")
        page.locator('input[name="collaboratorEmail"]').fill("operador.entrenamiento@proboca.net")
        page.locator('select[name="shift"]').select_option(label="Matutino")
        page.locator('textarea[name="problem"]').fill(
            "La guia de producto se afloja durante el turno, provoca atorones y obliga a detener la linea."
        )
        page.locator('textarea[name="proposal"]').fill(
            "Instalar una guia ajustable con seguro mecanico y estandarizar su revision al inicio del turno."
        )
        page.locator('textarea[name="expectedBenefit"]').fill(
            "Reducir paros, evitar contacto manual con el punto de riesgo y mantener estable la calidad del empaque."
        )
        scroll_to(page, page.locator('textarea[name="problem"]'))
        capture(page, "02_operador_idea_completa.png")

        page.locator('input[name="category"][value="B"]').check(force=True)
        for field in ("impactsQuality", "impactsSafety", "requiresMaintenance"):
            page.locator(f'input[name="{field}"]').check(force=True)
        for impact in ("Seguridad", "Calidad/Inocuidad", "Productividad"):
            page.locator(f'input[name="impactTypes"][value="{impact}"]').check(force=True)
        scroll_to(page, page.locator('input[name="category"][value="B"]'))
        capture(page, "03_operador_apoyos.png")

        submit = page.get_by_role("button", name=re.compile("Enviar mi idea", re.I))
        scroll_to(page, submit)
        submit.click()
        page.wait_for_url(re.compile(r"/captura/gracias"), timeout=25_000)
        settle(page)
        body_text = page.locator("body").inner_text()
        folio_match = re.search(r"IM-\d{6}", body_text)
        if not folio_match:
            raise RuntimeError("No se pudo localizar el folio generado en la confirmacion.")
        folio = folio_match.group(0)
        result["folio"] = folio
        capture(page, "04_folio_confirmado.png")
        context.close()
        log(f"FOLIO {folio}")

        # Supervisor: revisa, justifica, confirma apoyos y aprueba.
        context, page = login(browser, "supervisor.p1@propEx.local")
        page.goto(f"{BASE_URL}/supervisor", wait_until="domcontentloaded")
        article = article_for(page, folio)
        for field in ("impactsQuality", "impactsSafety", "requiresMaintenance"):
            checkbox = article.locator(f'input[name="{field}"]')
            if not checkbox.is_checked():
                checkbox.check()
        comments = article.locator('textarea[name="comments"]')
        comments.fill(
            "La idea ataca una causa recurrente, reduce el riesgo de intervencion manual y justifica validar inocuidad y factibilidad tecnica."
        )
        approve = article.locator('button[value="APROBAR"]')
        scroll_to(page, approve)
        capture(page, "05_supervisor_justifica.png")
        approve.click()
        page.wait_for_url(re.compile(r"/ideas/"), timeout=25_000)
        idea_url = page.url.split("?")[0]
        result["idea_url"] = idea_url
        settle(page)
        page.locator("h1").first.scroll_into_view_if_needed()
        capture(page, "06_supervisor_aprobada.png")
        context.close()

        # Areas de soporte: cada una deja su criterio y aprueba.
        validations = [
            (
                "calidad@propEx.local",
                "/validaciones/calidad",
                "Calidad confirma que la guia puede estandarizarse sin afectar limpieza, contacto ni liberacion del producto.",
                "07_calidad_valida.png",
            ),
            (
                "seguridad@propEx.local",
                "/validaciones/seguridad",
                "Seguridad valida que la propuesta reduce la exposicion de manos y no crea un nuevo punto de atrapamiento.",
                "08_seguridad_valida.png",
            ),
            (
                "mantenimiento@propEx.local",
                "/validaciones/mantenimiento",
                "Mantenimiento confirma materiales, acceso, tiempo de instalacion y factibilidad del ajuste mecanico.",
                "09_mantenimiento_valida.png",
            ),
        ]
        for email, route, comment, screenshot in validations:
            context, page = login(browser, email)
            page.goto(f"{BASE_URL}{route}", wait_until="domcontentloaded")
            article = article_for(page, folio)
            article.locator('textarea[name="comments"]').fill(comment)
            approve = article.locator('button[value="APROBAR"]')
            scroll_to(page, approve)
            capture(page, screenshot)
            approve.click()
            page.wait_for_url(re.compile(r"/ideas/"), timeout=25_000)
            context.close()

        # Mejora Continua: clasifica, prioriza y asigna responsable/fecha.
        context, page = login(browser, "mc@propex.local")
        page.goto(f"{BASE_URL}/mejora", wait_until="domcontentloaded")
        article = article_for(page, folio)
        classification_select = article.locator('select[name="classification"]')
        classification_select.select_option("IDEA_RAPIDA")
        article.locator('select[name="priority"]').first.select_option("ALTA")
        article.locator('textarea[name="mcComments"]').fill(
            "Idea rapida de alto impacto operativo. Mantener evidencia antes y despues para validar el resultado."
        )
        classification_form = classification_select.locator("xpath=ancestor::form")
        classify_button = classification_form.locator('button[type="submit"]')
        scroll_to(page, classify_button)
        capture(page, "10_mc_clasifica.png")
        classify_button.click()
        page.wait_for_url(re.compile(r"/ideas/"), timeout=25_000)

        page.goto(f"{BASE_URL}/mejora", wait_until="domcontentloaded")
        article = article_for(page, folio)
        owner_select = article.locator('select[name="ownerId"]')
        owner_select.select_option(option_value_containing(owner_select, "Mantenimiento"))
        article.locator('input[name="dueDate"]').fill((date.today() + timedelta(days=30)).isoformat())
        evidence_checkbox = article.locator('input[name="requiresEvidence"]')
        if not evidence_checkbox.is_checked():
            evidence_checkbox.check()
        assignment_form = owner_select.locator("xpath=ancestor::form")
        assign_button = assignment_form.locator('button[type="submit"]')
        scroll_to(page, assign_button)
        capture(page, "11_mc_asigna.png")
        assign_button.click()
        page.wait_for_url(re.compile(r"/ideas/"), timeout=25_000)
        context.close()

        # Responsable: registra avance, carga evidencia y termina el trabajo.
        context, page = login(browser, "mantenimiento@propEx.local")
        page.goto(f"{BASE_URL}/implementacion", wait_until="domcontentloaded")
        article = article_for(page, folio)
        article.locator('textarea[name="comments"]').fill(
            "Se fabrico e instalo la guia ajustable, se verifico el seguro mecanico y se probo la linea sin atorones."
        )
        article.locator('input[name="afterEvidence"]').set_input_files(str(evidence_path))
        article.locator('input[name="markImplemented"]').check()
        save_button = article.get_by_role("button", name=re.compile("Guardar avance", re.I))
        scroll_to(page, save_button)
        capture(page, "12_implementacion_evidencia.png")
        save_button.click()
        page.wait_for_url(re.compile(r"/ideas/"), timeout=25_000)
        settle(page)
        page.locator("h1").first.scroll_into_view_if_needed()
        capture(page, "13_idea_implementada.png")
        context.close()

        # Mejora Continua: valida el cierre, revisa sugerencias y entrega ProbocaCoins.
        context, page = login(browser, "mc@propex.local")
        page.goto(idea_url, wait_until="domcontentloaded")
        summary = page.locator("summary").filter(
            has_text=re.compile(r"(Cierre y ProbocaCoins|ProbocaCoins otorgadas)", re.I)
        ).first
        summary.wait_for(state="visible", timeout=25_000)
        details = summary.locator("xpath=ancestor::details")
        if not details.evaluate("element => element.open"):
            summary.click()
        scroll_to(page, summary)
        capture(page, "14_cierre_probocacoins.png")
        close_button = page.get_by_role("button", name=re.compile("Cerrar y entregar ProbocaCoins", re.I))
        close_button.wait_for(state="visible", timeout=25_000)
        close_button.click()
        page.wait_for_url(re.compile(r"coins=\d+"), timeout=30_000)
        settle(page, 450)
        query = parse_qs(urlparse(page.url).query)
        coins = query.get("coins", ["0"])[0]
        result["coins"] = coins
        capture(page, "15_probocacoins_entregadas.png")
        context.close()

        # Supervisor: conserva el seguimiento y ve la recompensa final.
        context, page = login(browser, "supervisor.p1@propEx.local")
        page.goto(f"{BASE_URL}/supervisor", wait_until="domcontentloaded")
        article = article_for(page, folio)
        scroll_to(page, article)
        capture(page, "16_supervisor_seguimiento_final.png")
        context.close()

        browser.close()

    return result


def capture_workflow_completion(folio: str) -> dict[str, str]:
    """Resume an implemented training idea after the earlier role captures exist."""
    database = WORK_DIR / "dev-video.db"
    with sqlite3.connect(database) as connection:
        row = connection.execute(
            'SELECT id, status, pointsAssigned FROM "Idea" WHERE folio = ?',
            (folio,),
        ).fetchone()
    if not row:
        raise RuntimeError(f"No existe el folio {folio} en la base aislada.")
    idea_url = f"{BASE_URL}/ideas/{row[0]}"
    already_closed = row[1] == "CERRADA"
    current_points = int(row[2] or 0)

    browser_path = EDGE_PATH if EDGE_PATH.exists() else CHROME_PATH
    if not browser_path.exists():
        raise RuntimeError("No se encontro Microsoft Edge ni Google Chrome para capturar la aplicacion.")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=str(browser_path),
            args=["--disable-gpu", "--force-device-scale-factor=1"],
        )
        context, page = login(browser, "mc@propex.local")
        page.goto(idea_url, wait_until="domcontentloaded")
        summary = page.locator("summary").filter(
            has_text=re.compile(r"(Cierre y ProbocaCoins|ProbocaCoins otorgadas)", re.I)
        ).first
        summary.wait_for(state="visible", timeout=25_000)
        details = summary.locator("xpath=ancestor::details")
        if not details.evaluate("element => element.open"):
            summary.click()
        scroll_to(page, summary)
        if not already_closed:
            capture(page, "14_cierre_probocacoins.png")

        if current_points == 0:
            award_button = page.get_by_role(
                "button",
                name=re.compile(r"(Cerrar y entregar|Volver a otorgar) ProbocaCoins", re.I),
            )
            award_button.wait_for(state="visible", timeout=25_000)
            award_form = award_button.locator("xpath=ancestor::form")
            rule_boxes = award_form.locator('input[name="pointRuleIds"]')
            for index in range(rule_boxes.count()):
                rule_boxes.nth(index).uncheck(force=True)
            assigned_values = [10, 20, 30, 40, 40]
            for index, value in enumerate(assigned_values[: rule_boxes.count()]):
                box = rule_boxes.nth(index)
                box.check(force=True)
                rule_id = box.get_attribute("value")
                award_form.locator(f'input[name="points-{rule_id}"]').fill(str(value))
            managerial_selects = award_form.locator('select[name^="managerial-"]')
            for index in range(managerial_selects.count()):
                managerial_selects.nth(index).select_option("")
            award_button.click()
            page.wait_for_url(re.compile(r"coins=\d+"), timeout=30_000)
            settle(page, 450)
            coins = parse_qs(urlparse(page.url).query).get("coins", ["0"])[0]
        else:
            coins = str(current_points)
        capture(page, "15_probocacoins_entregadas.png")
        context.close()

        context, page = login(browser, "supervisor.p1@propEx.local")
        page.goto(f"{BASE_URL}/supervisor", wait_until="domcontentloaded")
        article = article_for(page, folio)
        scroll_to(page, article)
        capture(page, "16_supervisor_seguimiento_final.png")
        context.close()
        browser.close()

    return {"folio": folio, "coins": coins, "idea_url": idea_url}


def build_scenes(metadata: dict[str, str]) -> list[Scene]:
    folio = metadata["folio"]
    coins = metadata.get("coins", "0")
    flow_asset = ROOT / "manual-propex-assets" / "flujo-operativo-propex.png"
    if not flow_asset.exists():
        flow_asset = CAPTURE_DIR / "01_operador_inicio.png"

    return [
        Scene(
            image=str(flow_asset),
            role="ENTRENAMIENTO",
            role_color=PROBOCA_RED,
            title="Del hallazgo a la recompensa",
            bullets=("Un solo folio", "Decisiones por rol", "Cierre con trazabilidad"),
            narration=(
                "En este entrenamiento recorreremos el ciclo completo de una Idea de Mejora en PROpEx: "
                "desde que el operador registra la oportunidad hasta que Mejora Continua entrega los ProbocaCoins."
            ),
            focus=(0.68, 0.50),
        ),
        Scene(
            image="01_operador_inicio.png",
            role="OPERADOR",
            role_color="#14835F",
            title="El operador inicia desde el QR de su area",
            bullets=("Confirma area y supervisor", "Captura datos basicos", "Describe la condicion real"),
            narration=(
                "El operador entra desde el QR de su area. La pantalla confirma el area y el supervisor responsable, "
                "para que la idea se enrute correctamente desde el primer momento."
            ),
            focus=(0.76, 0.23),
            highlight=(0.03, 0.04, 0.94, 0.22),
        ),
        Scene(
            image="02_operador_idea_completa.png",
            role="OPERADOR",
            role_color="#14835F",
            title="Registra hechos, propuesta y beneficio",
            bullets=("Problema observable", "Propuesta concreta", "Beneficio esperado"),
            narration=(
                "La captura debe explicar que ocurre, que propone hacer el operador y que mejora espera. "
                "No necesita una solucion perfecta; necesita informacion clara para que el supervisor pueda decidir."
            ),
            focus=(0.72, 0.51),
            highlight=(0.20, 0.16, 0.76, 0.70),
        ),
        Scene(
            image="03_operador_apoyos.png",
            role="OPERADOR",
            role_color="#14835F",
            title="Indica apoyos e impactos",
            bullets=("Categoria B", "Calidad, Seguridad y Mantenimiento", "Impactos SQDCM"),
            narration=(
                "Despues selecciona el tipo de apoyo y los departamentos que deben participar. "
                "En este ejemplo la idea requiere validacion de Calidad, Seguridad y Mantenimiento."
            ),
            focus=(0.69, 0.49),
            highlight=(0.08, 0.12, 0.86, 0.60),
        ),
        Scene(
            image="04_folio_confirmado.png",
            role="SISTEMA",
            role_color=PROBOCA_RED,
            title=f"El sistema genera el folio {folio}",
            bullets=("Asigna supervisor", "Crea auditoria", "Activa notificaciones"),
            narration=(
                f"Al enviar, PROpEx genera el folio {folio}. Desde aqui cada decision, comentario, fecha, evidencia "
                "y recompensa quedara ligada al mismo registro."
            ),
            focus=(0.72, 0.45),
            highlight=(0.30, 0.20, 0.40, 0.50),
        ),
        Scene(
            image="05_supervisor_justifica.png",
            role="SUPERVISOR",
            role_color="#14835F",
            title="El supervisor revisa, justifica y acepta",
            bullets=("Valida problema y beneficio", "Confirma areas de apoyo", "Registra el criterio de decision"),
            narration=(
                "El supervisor revisa la propuesta, confirma que areas deben intervenir y deja una justificacion. "
                "Al aprobar, no termina el flujo: se crean automaticamente las validaciones necesarias."
            ),
            focus=(0.77, 0.67),
            highlight=(0.18, 0.38, 0.78, 0.52),
        ),
        Scene(
            image="06_supervisor_aprobada.png",
            role="TRAZABILIDAD",
            role_color="#14835F",
            title="La aprobacion abre el trabajo de soporte",
            bullets=("Estado actualizado", "Validaciones visibles", "Siguiente responsable claro"),
            narration=(
                "El detalle del folio muestra el nuevo estado y las validaciones requeridas. "
                "Todos consultan el mismo expediente; nadie necesita llevar un control paralelo."
            ),
            focus=(0.74, 0.28),
            highlight=(0.03, 0.04, 0.94, 0.38),
        ),
        Scene(
            image="07_calidad_valida.png",
            role="CALIDAD / INOCUIDAD",
            role_color="#D32236",
            title="Calidad valida el impacto en producto y proceso",
            bullets=("Revisa inocuidad", "Documenta criterio", "Aprueba o solicita informacion"),
            narration=(
                "Calidad e Inocuidad recibe la idea en su propia bandeja. Revisa el efecto en producto, limpieza y proceso, "
                "registra su criterio y aprueba la validacion."
            ),
            focus=(0.76, 0.66),
            highlight=(0.17, 0.35, 0.79, 0.55),
        ),
        Scene(
            image="08_seguridad_valida.png",
            role="SEGURIDAD",
            role_color="#626A70",
            title="Seguridad confirma que el riesgo disminuye",
            bullets=("Evalua exposicion", "Evita riesgos nuevos", "Deja evidencia de la decision"),
            narration=(
                "Seguridad Industrial verifica que la mejora reduzca la exposicion del operador y que no introduzca un riesgo nuevo. "
                "Su decision tambien queda registrada en el folio."
            ),
            focus=(0.76, 0.66),
            highlight=(0.17, 0.35, 0.79, 0.55),
        ),
        Scene(
            image="09_mantenimiento_valida.png",
            role="MANTENIMIENTO",
            role_color="#176FC1",
            title="Mantenimiento valida la factibilidad tecnica",
            bullets=("Confirma materiales", "Estima intervencion", "Aprueba la solucion tecnica"),
            narration=(
                "Mantenimiento revisa materiales, accesos y tiempo de instalacion. Cuando las tres areas aprueban, "
                "la idea queda disponible para clasificacion y asignacion."
            ),
            focus=(0.76, 0.66),
            highlight=(0.17, 0.35, 0.79, 0.55),
        ),
        Scene(
            image="10_mc_clasifica.png",
            role="MEJORA CONTINUA",
            role_color="#111111",
            title="Mejora Continua clasifica y prioriza",
            bullets=("Define tipo de mejora", "Asigna prioridad", "Registra alcance y criterio"),
            narration=(
                "Con los avales completos, Mejora Continua clasifica la iniciativa, define la prioridad y registra el alcance. "
                "Esta decision determina como se controlara la ejecucion."
            ),
            focus=(0.74, 0.55),
            highlight=(0.18, 0.30, 0.78, 0.56),
        ),
        Scene(
            image="11_mc_asigna.png",
            role="MEJORA CONTINUA",
            role_color="#111111",
            title="Asigna responsable, fecha y evidencia",
            bullets=("Responsable visible", "Fecha compromiso", "Evidencia final requerida"),
            narration=(
                "Despues asigna al responsable, fija la fecha compromiso y determina si se necesita evidencia final. "
                "La idea pasa a la bandeja de Implementacion con un siguiente paso claro."
            ),
            focus=(0.74, 0.56),
            highlight=(0.20, 0.31, 0.76, 0.55),
        ),
        Scene(
            image="12_implementacion_evidencia.png",
            role="RESPONSABLE",
            role_color="#176FC1",
            title="El responsable demuestra la ejecucion",
            bullets=("Describe el avance", "Carga evidencia despues", "Marca el trabajo terminado"),
            narration=(
                "El responsable registra que hizo, adjunta la evidencia despues y marca el trabajo como terminado. "
                "La evidencia permite comparar la condicion inicial con el resultado implementado."
            ),
            focus=(0.75, 0.66),
            highlight=(0.22, 0.36, 0.74, 0.54),
        ),
        Scene(
            image="14_cierre_probocacoins.png",
            role="MEJORA CONTINUA",
            role_color="#111111",
            title="Valida el cierre y revisa los ProbocaCoins",
            bullets=("Confirma evidencia", "Revisa reglas sugeridas", "Ajusta evaluacion gerencial"),
            narration=(
                "Mejora Continua valida el resultado y abre el cierre. El sistema propone ProbocaCoins con base en reglas estandar "
                "y criterios gerenciales; antes de guardar, la persona autorizada puede revisar cada valor."
            ),
            focus=(0.75, 0.60),
            highlight=(0.22, 0.26, 0.74, 0.63),
        ),
        Scene(
            image="15_probocacoins_entregadas.png",
            role="RECOMPENSA",
            role_color="#D89A00",
            title=f"La idea cierra con {coins} ProbocaCoins",
            bullets=("Estado Cerrada", "Recompensa registrada", "Notificacion y auditoria actualizadas"),
            narration=(
                f"Al confirmar, la idea queda cerrada y el sistema entrega {coins} ProbocaCoins. "
                "La recompensa, las reglas utilizadas y el historial de decisiones permanecen auditables."
            ),
            focus=(0.70, 0.40),
            highlight=(0.12, 0.06, 0.82, 0.48),
        ),
        Scene(
            image="16_supervisor_seguimiento_final.png",
            role="SUPERVISOR",
            role_color="#14835F",
            title="El supervisor conserva el seguimiento final",
            bullets=("Consulta resultado", "Ve responsable y validaciones", "Confirma ProbocaCoins"),
            narration=(
                "El supervisor puede volver a su bandeja y confirmar el resultado final, las validaciones, el responsable y los ProbocaCoins. "
                "La trazabilidad no se pierde despues de aprobar."
            ),
            focus=(0.76, 0.55),
            highlight=(0.18, 0.23, 0.78, 0.66),
        ),
        Scene(
            image=str(flow_asset),
            role="CIERRE DEL ENTRENAMIENTO",
            role_color=PROBOCA_RED,
            title="Una idea, un folio y un siguiente paso visible",
            bullets=("Capturar con claridad", "Decidir con justificacion", "Cerrar con evidencia y recompensa"),
            narration=(
                "La regla de oro es simple: cada rol trabaja sobre el mismo folio y deja su decision en el sistema. "
                "Asi PROpEx convierte una idea del piso en una mejora implementada, reconocida y aprendida."
            ),
            focus=(0.68, 0.50),
        ),
    ]


def write_script(scenes: list[Scene], metadata: dict[str, str]) -> None:
    lines = [
        "VIDEO DE ENTRENAMIENTO PROpEx - FLUJO COMPLETO DE IDEAS DE MEJORA",
        f"Folio demostrativo: {metadata['folio']}",
        f"ProbocaCoins demostrativas: {metadata.get('coins', '0')}",
        "",
    ]
    for index, scene in enumerate(scenes, 1):
        lines.extend(
            [
                f"ESCENA {index:02d} - {scene.role}",
                scene.title,
                f"Narracion: {scene.narration}",
                "Puntos en pantalla: " + " | ".join(scene.bullets),
                "",
            ]
        )
    SCRIPT_OUTPUT.write_text("\n".join(lines), encoding="utf-8")


def synthesize_narration(scenes: list[Scene]) -> list[Path]:
    input_json = WORK_DIR / "narration.json"
    ps_script = WORK_DIR / "synthesize_narration.ps1"
    input_json.write_text(
        json.dumps([{"text": scene.narration} for scene in scenes], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    ps_script.write_text(
        r'''param([string]$InputJson, [string]$OutputDir)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
$items = Get-Content -Raw -Encoding UTF8 $InputJson | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like "es-*" } | Select-Object -First 1
if ($voice) { $synth.SelectVoice($voice.VoiceInfo.Name) }
$synth.Rate = -1
$synth.Volume = 100
$index = 0
foreach ($item in $items) {
  $index += 1
  $path = Join-Path $OutputDir ("scene-{0:D2}.wav" -f $index)
  if (Test-Path $path) { Remove-Item -LiteralPath $path -Force }
  $synth.SetOutputToWaveFile($path)
  $synth.Speak([string]$item.text)
  $synth.SetOutputToNull()
}
$synth.Dispose()
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
            str(ps_script),
            "-InputJson",
            str(input_json),
            "-OutputDir",
            str(AUDIO_DIR),
        ],
        check=True,
    )
    audio_files = [AUDIO_DIR / f"scene-{index:02d}.wav" for index in range(1, len(scenes) + 1)]
    if not all(path.exists() for path in audio_files):
        raise RuntimeError("No se generaron todos los archivos de narracion.")
    return audio_files


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as source:
        return source.getnframes() / source.getframerate()


def combine_audio(audio_files: list[Path], scene_durations: list[float]) -> None:
    with wave.open(str(audio_files[0]), "rb") as first:
        params = first.getparams()
    channels = params.nchannels
    sample_width = params.sampwidth
    rate = params.framerate
    silence_frame = b"\x00" * channels * sample_width

    with wave.open(str(NARRATION_WAV), "wb") as output:
        output.setparams(params)
        for path, duration in zip(audio_files, scene_durations):
            with wave.open(str(path), "rb") as source:
                if (
                    source.getnchannels() != channels
                    or source.getsampwidth() != sample_width
                    or source.getframerate() != rate
                ):
                    raise RuntimeError("Los segmentos de narracion no comparten el mismo formato WAV.")
                frames = source.readframes(source.getnframes())
                output.writeframes(frames)
                target_frames = round(duration * rate)
                missing = max(0, target_frames - source.getnframes())
                if missing:
                    output.writeframes(silence_frame * missing)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font_obj, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=font_obj)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def resolve_scene_image(scene: Scene) -> Path:
    direct = Path(scene.image)
    if direct.is_absolute() and direct.exists():
        return direct
    candidate = CAPTURE_DIR / scene.image
    if candidate.exists():
        return candidate
    raise FileNotFoundError(f"No existe la imagen de escena: {scene.image}")


def fit_screen(image: Image.Image) -> Image.Image:
    target = (1200, 675)
    flattened = image.convert("RGB")
    return ImageOps.fit(flattened, target, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def render_scene_frame(
    scene: Scene,
    index: int,
    total: int,
    local_progress: float,
    global_progress: float,
) -> Image.Image:
    canvas = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT), INK)
    draw = ImageDraw.Draw(canvas)

    # Main screenshot: subtle zoom keeps the video alive while preserving legibility.
    screen = fit_screen(Image.open(resolve_scene_image(scene)))
    zoom = 1.0 + 0.018 * local_progress
    zoomed = screen.resize((round(screen.width * zoom), round(screen.height * zoom)), Image.Resampling.LANCZOS)
    focus_x = int(scene.focus[0] * zoomed.width)
    focus_y = int(scene.focus[1] * zoomed.height)
    left = min(max(0, focus_x - 600), max(0, zoomed.width - 1200))
    top = min(max(0, focus_y - 338), max(0, zoomed.height - 675))
    screen = zoomed.crop((left, top, left + 1200, top + 675))
    screen = ImageEnhance.Contrast(screen).enhance(1.015)
    canvas.paste(screen, (365, 64))

    # Flat industrial chrome and progress.
    draw.rectangle((0, 0, VIDEO_WIDTH, 8), fill="#2A3036")
    draw.rectangle((0, 0, round(VIDEO_WIDTH * global_progress), 8), fill=PROBOCA_RED)
    draw.rectangle((0, 64, 340, 739), fill=PANEL)
    draw.rectangle((0, 764, VIDEO_WIDTH, VIDEO_HEIGHT), fill="#0B0E11")
    draw.rectangle((340, 64, 348, 739), fill=scene.role_color)

    # Brand and role.
    logo_path = ROOT / "public" / "brand" / "proboca-logo.png"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        logo.thumbnail((170, 64), Image.Resampling.LANCZOS)
        logo_plate = Image.new("RGB", (190, 72), WHITE)
        logo_plate.paste(logo, ((190 - logo.width) // 2, (72 - logo.height) // 2), logo)
        canvas.paste(logo_plate, (28, 86))
    draw.text((28, 181), "PROpEx · IDEAS DE MEJORA", font=font(FONT_BOLD, 18), fill=WHITE)
    draw.rounded_rectangle((28, 222, 312, 264), radius=6, fill=scene.role_color)
    draw.text((44, 232), scene.role, font=font(FONT_BOLD, 17), fill=WHITE)

    title_font = font(FONT_BOLD, 34)
    title_lines = wrap_text(draw, scene.title, title_font, 280)[:4]
    y = 298
    for line in title_lines:
        draw.text((28, y), line, font=title_font, fill=WHITE)
        y += 43

    y = max(y + 18, 455)
    bullet_font = font(FONT_SEMIBOLD, 19)
    for bullet in scene.bullets:
        draw.ellipse((30, y + 7, 40, y + 17), fill=scene.role_color)
        bullet_lines = wrap_text(draw, bullet, bullet_font, 255)[:2]
        for line_index, line in enumerate(bullet_lines):
            draw.text((54, y + line_index * 26), line, font=bullet_font, fill="#DDE3E9")
        y += max(46, len(bullet_lines) * 28 + 12)

    draw.text((28, 701), f"{index + 1:02d} / {total:02d}", font=font(FONT_BOLD, 18), fill=MUTED)

    # Highlight and animated cursor on the real environment.
    if scene.highlight:
        hx, hy, hw, hh = scene.highlight
        x1 = 365 + round(hx * 1200)
        y1 = 64 + round(hy * 675)
        x2 = x1 + round(hw * 1200)
        y2 = y1 + round(hh * 675)
        draw.rounded_rectangle((x1, y1, x2, y2), radius=8, outline=scene.role_color, width=5)
        tag_width = 118
        tag_y = max(66, y1 - 34)
        draw.rectangle((x1, tag_y, x1 + tag_width, tag_y + 30), fill=scene.role_color)
        draw.text((x1 + 10, tag_y + 5), "PUNTO CLAVE", font=font(FONT_BOLD, 14), fill=WHITE)

        pulse = (math.sin(local_progress * math.pi * 8) + 1) / 2
        cursor_x = x1 + int((0.16 + 0.68 * local_progress) * max(1, x2 - x1))
        cursor_y = y2 - int(24 + 10 * pulse)
        radius = int(10 + 5 * pulse)
        draw.ellipse(
            (cursor_x - radius, cursor_y - radius, cursor_x + radius, cursor_y + radius),
            outline=PROBOCA_RED,
            width=4,
        )
        draw.ellipse((cursor_x - 4, cursor_y - 4, cursor_x + 4, cursor_y + 4), fill=WHITE)

    # Burned-in subtitles.
    subtitle_font = font(FONT_SEMIBOLD, 27)
    subtitle_lines = wrap_text(draw, scene.narration, subtitle_font, 1450)[:3]
    subtitle_y = 783
    for line in subtitle_lines:
        draw.text((74, subtitle_y), line, font=subtitle_font, fill=WHITE)
        subtitle_y += 36

    return canvas


def render_video(scenes: list[Scene], scene_durations: list[float]) -> None:
    ffmpeg_writer = imageio_ffmpeg.write_frames(
        str(SILENT_VIDEO),
        (VIDEO_WIDTH, VIDEO_HEIGHT),
        fps=FPS,
        codec="libx264",
        pix_fmt_in="rgb24",
        pix_fmt_out="yuv420p",
        quality=7,
        output_params=["-movflags", "+faststart", "-preset", "medium"],
    )
    ffmpeg_writer.send(None)

    total_frames = sum(max(1, round(duration * FPS)) for duration in scene_durations)
    frame_index = 0
    preview_written = False

    try:
        for scene_index, (scene, duration) in enumerate(zip(scenes, scene_durations)):
            frame_count = max(1, round(duration * FPS))
            log(f"RENDER escena {scene_index + 1:02d}/{len(scenes):02d}: {scene.title}")
            for local_frame in range(frame_count):
                local_progress = local_frame / max(1, frame_count - 1)
                global_progress = (frame_index + 1) / total_frames
                frame = render_scene_frame(
                    scene,
                    scene_index,
                    len(scenes),
                    local_progress,
                    global_progress,
                )
                if not preview_written and scene_index == 0 and local_progress >= 0.35:
                    frame.save(PREVIEW_IMAGE)
                    preview_written = True
                ffmpeg_writer.send(np.asarray(frame, dtype=np.uint8))
                frame_index += 1
    finally:
        ffmpeg_writer.close()


def mux_audio() -> None:
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
            str(FINAL_VIDEO),
        ],
        check=True,
    )


def verify_video() -> None:
    if not FINAL_VIDEO.exists() or FINAL_VIDEO.stat().st_size < 1_000_000:
        raise RuntimeError("El MP4 final no se genero correctamente.")
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    check_frame = WORK_DIR / "verificacion-final.png"
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            "00:00:05",
            "-i",
            str(FINAL_VIDEO),
            "-frames:v",
            "1",
            str(check_frame),
        ],
        check=True,
    )
    if not check_frame.exists() or check_frame.stat().st_size < 20_000:
        raise RuntimeError("No fue posible extraer un cuadro de verificacion del MP4.")
    log(f"VIDEO_OK {FINAL_VIDEO} {FINAL_VIDEO.stat().st_size} bytes")


def main() -> int:
    ensure_dirs()
    wait_for_server()
    log("Iniciando demostracion real del flujo PROpEx")
    resume_folio = os.environ.get("PROPEX_VIDEO_RESUME_FOLIO", "").strip()
    metadata = capture_workflow_completion(resume_folio) if resume_folio else capture_real_workflow()
    scenes = build_scenes(metadata)
    write_script(scenes, metadata)
    log("Generando narracion con voz espanola")
    audio_files = synthesize_narration(scenes)
    scene_durations = [max(7.0, wav_duration(path) + 1.0) for path in audio_files]
    scenes = [
        Scene(
            image=scene.image,
            role=scene.role,
            role_color=scene.role_color,
            title=scene.title,
            bullets=scene.bullets,
            narration=scene.narration,
            focus=scene.focus,
            highlight=scene.highlight,
            duration=duration,
        )
        for scene, duration in zip(scenes, scene_durations)
    ]
    combine_audio(audio_files, scene_durations)
    log(f"Duracion estimada: {sum(scene_durations):.1f} segundos")
    render_video(scenes, scene_durations)
    mux_audio()
    verify_video()
    log(json.dumps({"video": str(FINAL_VIDEO), "preview": str(PREVIEW_IMAGE), **metadata}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
