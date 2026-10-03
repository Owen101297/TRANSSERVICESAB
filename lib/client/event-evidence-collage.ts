import QRCode from "qrcode";

export type EvidenceCollageInput = {
  selfie: File;
  materialPreviewUrl?: string | null;
  materialUrl?: string | null;
  eventName: string;
  eventType: string;
  participantName: string;
  registeredAt: string;
  registrationCode: string;
};

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No fue posible leer una de las imágenes."));
    image.src = source;
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawContained(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.width, height / image.height);
  const renderedWidth = image.width * scale;
  const renderedHeight = image.height * scale;
  context.drawImage(
    image,
    x + (width - renderedWidth) / 2,
    y + (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  );
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  const consumed = lines.join(" ");
  if (consumed.length < text.trim().length && lines.length) {
    let finalLine = lines.at(-1) || "";
    while (finalLine.length > 1 && context.measureText(`${finalLine}…`).width > maxWidth) {
      finalLine = finalLine.slice(0, -1);
    }
    lines[lines.length - 1] = `${finalLine.trim()}…`;
  }
  return lines;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function fileName(code: string) {
  return `${code.replace(/[^A-Za-z0-9_-]/g, "-")}-evidencia.webp`;
}

export async function generateEvidenceCollage(input: EvidenceCollageInput) {
  await document.fonts?.ready;
  const selfieUrl = URL.createObjectURL(input.selfie);
  let materialObjectUrl: string | null = null;
  try {
    const [selfie, logo] = await Promise.all([
      loadImage(selfieUrl),
      loadImage("/logo.png").catch(() => null),
    ]);
    let material: HTMLImageElement | null = null;
    if (input.materialPreviewUrl) {
      try {
        const response = await fetch(input.materialPreviewUrl, { cache: "no-store" });
        if (response.ok && response.headers.get("content-type")?.startsWith("image/")) {
          materialObjectUrl = URL.createObjectURL(await response.blob());
          material = await loadImage(materialObjectUrl);
        }
      } catch {
        material = null;
      }
    }
    const qrDataUrl = input.materialUrl
      ? await QRCode.toDataURL(input.materialUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 280,
          color: { dark: "#0f172a", light: "#ffffff" },
        })
      : null;
    const qr = qrDataUrl ? await loadImage(qrDataUrl) : null;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Este dispositivo no puede preparar el collage.");

    context.fillStyle = "#f1f5f9";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, 156);
    if (logo) {
      context.save();
      roundedRect(context, 48, 30, 96, 96, 22);
      context.clip();
      drawCover(context, logo, 48, 30, 96, 96);
      context.restore();
    }
    context.fillStyle = "#ffffff";
    context.font = "700 38px Arial, sans-serif";
    context.fillText("TRANS SERVICES A&B", 168, 72);
    context.fillStyle = "#7dd3fc";
    context.font = "700 22px Arial, sans-serif";
    context.fillText("EVIDENCIA DE PARTICIPACIÓN", 168, 108);

    const cards = [
      { x: 42, y: 190, width: 478, height: 560 },
      { x: 560, y: 190, width: 478, height: 560 },
    ];
    for (const card of cards) {
      context.fillStyle = "#ffffff";
      roundedRect(context, card.x, card.y, card.width, card.height, 28);
      context.fill();
    }

    context.fillStyle = "#0f172a";
    context.font = "700 23px Arial, sans-serif";
    context.fillText("1 · PARTICIPANTE", 68, 232);
    context.save();
    roundedRect(context, 68, 258, 426, 458, 20);
    context.clip();
    drawCover(context, selfie, 68, 258, 426, 458);
    context.restore();

    context.fillStyle = "#0f172a";
    context.font = "700 23px Arial, sans-serif";
    context.fillText("2 · MATERIAL CONSULTADO", 586, 232);
    if (material) {
      context.fillStyle = "#f8fafc";
      roundedRect(context, 586, 258, 426, 348, 20);
      context.fill();
      context.save();
      roundedRect(context, 586, 258, 426, 348, 20);
      context.clip();
      drawContained(context, material, 600, 272, 398, 320);
      context.restore();
      if (qr) drawContained(context, qr, 586, 622, 88, 88);
      context.fillStyle = "#475569";
      context.font = "600 18px Arial, sans-serif";
      context.fillText(input.materialUrl ? "Escanea para abrir el material" : "Material validado", 690, 668);
    } else {
      context.fillStyle = "#e0f2fe";
      roundedRect(context, 586, 258, 426, 458, 20);
      context.fill();
      if (qr) drawContained(context, qr, 666, 300, 266, 266);
      context.fillStyle = "#075985";
      context.font = "700 24px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(input.materialUrl ? "Material disponible por enlace" : "Sin enlace de material", 799, 612);
      context.font = "500 18px Arial, sans-serif";
      context.fillText(input.materialUrl ? "Escanea el código para consultarlo" : "Consulta al responsable", 799, 648);
      context.textAlign = "start";
    }

    context.fillStyle = "#ffffff";
    roundedRect(context, 42, 786, 996, 504, 28);
    context.fill();
    context.fillStyle = "#0f172a";
    context.font = "700 23px Arial, sans-serif";
    context.fillText("3 · CONSTANCIA DE ASISTENCIA", 72, 834);
    context.fillStyle = "#0284c7";
    roundedRect(context, 72, 864, 8, 330, 4);
    context.fill();
    context.fillStyle = "#64748b";
    context.font = "700 17px Arial, sans-serif";
    context.fillText("PARTICIPANTE", 110, 900);
    context.fillStyle = "#0f172a";
    context.font = "700 31px Arial, sans-serif";
    for (const [index, line] of wrapText(context, input.participantName, 820, 2).entries()) {
      context.fillText(line, 110, 942 + index * 37);
    }
    context.fillStyle = "#64748b";
    context.font = "700 17px Arial, sans-serif";
    context.fillText("ACTIVIDAD", 110, 1024);
    context.fillStyle = "#0f172a";
    context.font = "700 27px Arial, sans-serif";
    for (const [index, line] of wrapText(context, input.eventName, 820, 2).entries()) {
      context.fillText(line, 110, 1062 + index * 34);
    }
    context.fillStyle = "#475569";
    context.font = "600 20px Arial, sans-serif";
    context.fillText(`${input.eventType} · ${dateTime(input.registeredAt)}`, 110, 1148);
    context.fillStyle = "#ecfdf5";
    roundedRect(context, 110, 1176, 560, 70, 18);
    context.fill();
    context.fillStyle = "#047857";
    context.font = "700 19px Arial, sans-serif";
    context.fillText("ASISTENCIA FIRMADA Y REGISTRADA", 136, 1206);
    context.font = "700 18px monospace";
    context.fillText(input.registrationCode, 136, 1232);
    context.fillStyle = "#64748b";
    context.font = "500 15px Arial, sans-serif";
    context.fillText("Original archivado en Google Drive · Integridad verificable en el ERP", 72, 1322);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error("No fue posible exportar el collage.")),
        "image/webp",
        0.84,
      );
    });
    return new File([blob], fileName(input.registrationCode), { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(selfieUrl);
    if (materialObjectUrl) URL.revokeObjectURL(materialObjectUrl);
  }
}
