const MAX_PDF_PAGES = 20;
const MIN_EXTRACTED_TEXT_LENGTH = 20;
const LINE_Y_TOLERANCE = 2.5;

let pdfjsLoader = null;

function createImportError(message, status = 422) {
    const error = new Error(message);
    error.status = status;
    return error;
}

async function loadPdfJs() {
    if (!pdfjsLoader) {
        pdfjsLoader = import("pdfjs-dist/legacy/build/pdf.mjs");
    }

    return pdfjsLoader;
}

function normalizeImportedCipherText(value = "") {
    const lines = String(value || "")
        .replace(/\r/g, "")
        .replace(/\t/g, "    ")
        .replace(/\u00a0/g, " ")
        .split("\n")
        .map((line) => line.replace(/[ \u00a0]+$/g, ""));

    const nonEmptyLines = lines.filter((line) => line.trim());
    const commonIndent = nonEmptyLines.length > 0
        ? Math.min(...nonEmptyLines.map((line) => line.match(/^ */)[0].length))
        : 0;

    const normalizedLines = lines.map((line) => line.slice(commonIndent));
    const output = [];
    let blankCount = 0;

    normalizedLines.forEach((line) => {
        if (!line.trim()) {
            blankCount += 1;
            if (blankCount <= 1) {
                output.push("");
            }
            return;
        }

        blankCount = 0;
        output.push(line);
    });

    return output.join("\n").trim();
}

function detectHeader(text) {
    const lines = String(text || "").split("\n");
    const firstLineIndex = lines.findIndex((line) => line.trim());

    if (firstLineIndex === -1) {
        return {
            metadata: {},
            text
        };
    }

    const firstLine = lines[firstLineIndex].trim();
    const headerMatch = firstLine.match(/^(.+?)\s*\((.+?)\s*(?:-|\u2013|\u2014)\s*Tom:\s*([A-G](?:#|b)?m?)\s*\)\s*$/i);

    if (!headerMatch) {
        return {
            metadata: {},
            text
        };
    }

    const remainingLines = [
        ...lines.slice(0, firstLineIndex),
        ...lines.slice(firstLineIndex + 1)
    ];

    return {
        metadata: {
            detected_title: headerMatch[1].trim(),
            detected_artist: headerMatch[2].trim(),
            detected_tone: headerMatch[3].trim()
        },
        text: normalizeImportedCipherText(remainingLines.join("\n"))
    };
}

function findMedian(values) {
    const sorted = values
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((a, b) => a - b);

    if (sorted.length === 0) {
        return 6;
    }

    return sorted[Math.floor(sorted.length / 2)];
}

function groupTextItemsIntoLines(items) {
    const lines = [];

    items.forEach((item) => {
        const text = String(item.str || "").replace(/\u00a0/g, " ");
        if (!text) {
            return;
        }

        const x = item.transform[4];
        const y = item.transform[5];
        const height = item.height || Math.abs(item.transform[3]) || 10;
        const tolerance = Math.max(LINE_Y_TOLERANCE, height * 0.25);
        let line = lines.find((candidate) => Math.abs(candidate.y - y) <= tolerance);

        if (!line) {
            line = { y, items: [] };
            lines.push(line);
        }

        line.items.push({
            text,
            x,
            width: item.width || 0
        });
    });

    return lines.sort((a, b) => b.y - a.y);
}

function reconstructPageText(items) {
    const lines = groupTextItemsIntoLines(items);
    const allItems = lines.flatMap((line) => line.items);
    const visibleItems = allItems.filter((item) => item.text.trim());

    if (visibleItems.length === 0) {
        return "";
    }

    const leftX = Math.min(...visibleItems.map((item) => item.x));
    const charWidth = findMedian(visibleItems.map((item) => item.width / Math.max(item.text.length, 1)));

    const reconstructedLines = lines.map((line) => {
        const sortedItems = [...line.items].sort((a, b) => a.x - b.x);
        let output = "";
        let lastEnd = null;
        const firstVisible = sortedItems.find((item) => item.text.trim());

        if (firstVisible) {
            output = " ".repeat(Math.max(0, Math.round((firstVisible.x - leftX) / charWidth)));
        }

        sortedItems.forEach((item) => {
            const text = item.text.replace(/\s+/g, " ");
            const itemEnd = item.x + item.width;

            if (!text.trim()) {
                const spaces = Math.max(1, Math.min(40, Math.round((item.width || charWidth) / charWidth)));
                const trailingSpaces = (output.match(/ +$/) || [""])[0].length;
                if (spaces > trailingSpaces) {
                    output += " ".repeat(spaces - trailingSpaces);
                }
                lastEnd = lastEnd === null ? itemEnd : Math.max(lastEnd, itemEnd);
                return;
            }

            if (lastEnd !== null && text.trim()) {
                const gap = item.x - lastEnd;
                if (gap > charWidth * 0.55 && !output.endsWith(" ") && !text.startsWith(" ")) {
                    output += " ".repeat(Math.max(1, Math.min(12, Math.round(gap / charWidth))));
                }
            }

            if (text.trim() || !output.endsWith(" ")) {
                output += text;
            }

            lastEnd = lastEnd === null ? itemEnd : Math.max(lastEnd, itemEnd);
        });

        return output.replace(/[ ]+$/g, "");
    });

    return normalizeImportedCipherText(repairSplitChordTokens(reconstructedLines.join("\n")));
}

function repairSplitChordTokens(text) {
    return String(text || "")
        .replace(/\b([A-G])\s+([#b])\s*/g, "$1$2")
        .replace(/\b([A-G][#b]?)\s+(m)(?=[0-9\u00b0\u00ba/|,\s)\]]|$)/g, "$1$2")
        .replace(/([0-9])\s+([\u00b0\u00ba])/g, "$1$2")
        .replace(/\bT\s+om:/gi, "Tom:");
}

function buildPageLabel(pageNumber, metadata) {
    if (metadata.detected_title) {
        return `${pageNumber}. ${metadata.detected_title}${metadata.detected_tone ? ` - Tom: ${metadata.detected_tone}` : ""}`;
    }

    return `Pagina ${pageNumber}`;
}

async function extractCipherPdf(buffer) {
    if (!buffer || buffer.length === 0) {
        throw createImportError("Arquivo PDF nao enviado", 400);
    }

    const pdfjs = await loadPdfJs();
    let documentTask = null;

    try {
        documentTask = pdfjs.getDocument({
            data: new Uint8Array(buffer),
            disableFontFace: true,
            isEvalSupported: false,
            useWorkerFetch: false,
            verbosity: pdfjs.VerbosityLevel.ERRORS
        });

        const pdf = await documentTask.promise;

        if (pdf.numPages > MAX_PDF_PAGES) {
            throw createImportError(`O PDF deve ter no maximo ${MAX_PDF_PAGES} paginas`, 422);
        }

        const pages = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent({ disableCombineTextItems: false });
            const rawText = reconstructPageText(textContent.items || []);
            const { metadata, text } = detectHeader(rawText);

            if (!text.trim()) {
                continue;
            }

            pages.push({
                page: pageNumber,
                label: buildPageLabel(pageNumber, metadata),
                detected_title: metadata.detected_title || "",
                detected_artist: metadata.detected_artist || "",
                detected_tone: metadata.detected_tone || "",
                text
            });
        }

        await pdf.destroy();

        const totalTextLength = pages.reduce((total, page) => total + page.text.trim().length, 0);

        if (totalTextLength < MIN_EXTRACTED_TEXT_LENGTH) {
            throw createImportError("Nao foi possivel extrair texto selecionavel deste PDF", 422);
        }

        return {
            pages
        };
    } catch (error) {
        if (documentTask && documentTask.destroy) {
            await documentTask.destroy().catch(() => null);
        }

        if (error.status) {
            throw error;
        }

        throw createImportError("Nao foi possivel ler o PDF enviado", 422);
    }
}

module.exports = {
    MAX_PDF_PAGES,
    extractCipherPdf,
    normalizeImportedCipherText
};
