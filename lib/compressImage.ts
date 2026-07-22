const maxImageDimension = 1600;
const targetImageBytes = 800 * 1024;
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const lossyQualities = [0.82, 0.74, 0.66];

type DrawableImage = CanvasImageSource & {
  width: number;
  height: number;
  close?: () => void;
};

async function loadImage(file: File): Promise<DrawableImage> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function getOutputType(file: File) {
  return file.type === "image/jpg" ? "image/jpeg" : file.type;
}

export async function compressImageForUpload(file: File): Promise<File> {
  const outputType = getOutputType(file);

  if (!supportedImageTypes.has(outputType)) {
    return file;
  }

  const image = await loadImage(file);

  try {
    const sourceWidth = image.width;
    const sourceHeight = image.height;

    if (!sourceWidth || !sourceHeight) {
      return file;
    }

    const scale = Math.min(1, maxImageDimension / Math.max(sourceWidth, sourceHeight));
    const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * scale));
    const wasResized = outputWidth !== sourceWidth || outputHeight !== sourceHeight;

    if (outputType === "image/png" && !wasResized) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, outputWidth, outputHeight);

    let compressedBlob: Blob | null = null;

    if (outputType === "image/png") {
      compressedBlob = await canvasToBlob(canvas, outputType);
    } else {
      for (const quality of lossyQualities) {
        compressedBlob = await canvasToBlob(canvas, outputType, quality);
        if (!compressedBlob || compressedBlob.size <= targetImageBytes) break;
      }
    }

    if (!compressedBlob || compressedBlob.type !== outputType) {
      return file;
    }

    if (!wasResized && compressedBlob.size >= file.size) {
      return file;
    }

    return new File([compressedBlob], file.name, {
      type: outputType,
      lastModified: file.lastModified,
    });
  } finally {
    image.close?.();
  }
}
