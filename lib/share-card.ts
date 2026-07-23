type ShareCardInput = {
  original: string;
  result: string;
  logoUrl: string;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1440;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Logo 加载失败"));
    image.src = source;
  });
}

function splitLead(value: string) {
  const normalized = value.trim();
  const lead =
    normalized.match(/^([\s\S]*?[。！？!?]+[”’"'）】》]*)/)?.[1] ??
    normalized;

  return {
    lead,
    body: normalized.slice(lead.length).trim(),
  };
}

function wrapText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  const lines: string[] = [];

  for (const paragraph of value.split(/\n+/)) {
    if (!paragraph) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const character of Array.from(paragraph)) {
      const candidate = `${line}${character}`;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

function addEllipsis(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  let line = value.replace(/[，。；：、！？,.!?;:\s]+$/u, "");
  while (line && context.measureText(`${line}…`).width > maxWidth) {
    line = line.slice(0, -1);
  }
  return `${line}…`;
}

function drawClampedText(
  context: CanvasRenderingContext2D,
  value: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    lineHeight: number;
    maxLines: number;
  },
) {
  const allLines = wrapText(context, value, options.maxWidth);
  const visibleLines = allLines.slice(0, options.maxLines);

  if (allLines.length > options.maxLines && visibleLines.length) {
    const finalIndex = visibleLines.length - 1;
    visibleLines[finalIndex] = addEllipsis(
      context,
      visibleLines[finalIndex],
      options.maxWidth,
    );
  }

  visibleLines.forEach((line, index) => {
    context.fillText(
      line,
      options.x,
      options.y + index * options.lineHeight,
    );
  });

  return options.y + visibleLines.length * options.lineHeight;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("图片生成失败"));
      }
    }, "image/png");
  });
}

export async function createShareCard({
  original,
  result,
  logoUrl,
}: ShareCardInput) {
  await document.fonts?.ready;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持生成截图");

  context.textBaseline = "top";
  context.fillStyle = "#fbf7ef";
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.strokeStyle = "#d8cec0";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(72, 196);
  context.lineTo(CARD_WIDTH - 72, 196);
  context.stroke();

  try {
    const logo = await loadImage(logoUrl);
    context.drawImage(logo, 72, 54, 104, 104);
  } catch {
    context.fillStyle = "#b8241f";
    context.fillRect(72, 54, 16, 104);
  }

  context.fillStyle = "#1b1916";
  context.font =
    '700 46px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText("雪峰说", 200, 67);

  context.fillStyle = "#b8241f";
  context.font =
    '600 22px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText("张老师说的道理", 202, 124);

  let cursorY = 242;
  const cleanOriginal = original.trim();

  if (cleanOriginal) {
    context.fillStyle = "#8a8379";
    context.font =
      '600 23px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText("你的原话", 72, cursorY);

    context.fillStyle = "#5d5851";
    context.font =
      '400 34px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    cursorY = drawClampedText(context, cleanOriginal, {
      x: 72,
      y: cursorY + 48,
      maxWidth: CARD_WIDTH - 144,
      lineHeight: 50,
      maxLines: 3,
    });
    cursorY += 44;

    context.strokeStyle = "#d8cec0";
    context.beginPath();
    context.moveTo(72, cursorY);
    context.lineTo(CARD_WIDTH - 72, cursorY);
    context.stroke();
    cursorY += 44;
  }

  context.fillStyle = "#b8241f";
  context.font =
    '600 24px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText("张老师说的道理", 72, cursorY);
  cursorY += 62;

  const { lead, body } = splitLead(result);
  context.fillStyle = "#b8241f";
  context.fillRect(72, cursorY + 7, 10, 70);

  context.fillStyle = "#1b1916";
  context.font =
    '700 52px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  cursorY = drawClampedText(context, lead, {
    x: 110,
    y: cursorY,
    maxWidth: CARD_WIDTH - 182,
    lineHeight: 72,
    maxLines: 4,
  });

  if (body && cursorY < 1160) {
    cursorY += 34;
    context.fillStyle = "#3d3934";
    context.font =
      '400 36px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    const availableLines = Math.max(2, Math.floor((1238 - cursorY) / 56));
    drawClampedText(context, body, {
      x: 72,
      y: cursorY,
      maxWidth: CARD_WIDTH - 144,
      lineHeight: 56,
      maxLines: availableLines,
    });
  }

  context.strokeStyle = "#d8cec0";
  context.beginPath();
  context.moveTo(72, 1304);
  context.lineTo(CARD_WIDTH - 72, 1304);
  context.stroke();

  context.fillStyle = "#7a736a";
  context.font =
    '500 24px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText("AI 表达 · 非本人原话", 72, 1342);
  context.textAlign = "right";
  context.fillText("xuefengshuo.com", CARD_WIDTH - 72, 1342);

  return canvasToBlob(canvas);
}
