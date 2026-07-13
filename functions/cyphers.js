const cheerio = require("cheerio");
const OpenAI = require("openai");

const DUCKDUCKGO_HTML_URL = "https://html.duckduckgo.com/html/";
const DEFAULT_OPENAI_MODEL = "gpt-5-nano";
const MAX_RESULTS = 8;
const HTML_LOG_LIMIT = 4000;
const TEXT_LOG_LIMIT = 1500;

function compactText(value = "", limit = 160) {
    return String(value).replace(/\s+/g, " ").trim().slice(0, limit);
}

function isDebugEnabled() {
    return process.env.DEBUG_CIFRA_SCRAPER === "true";
}

function debugLog(label, payload) {
    if (!isDebugEnabled()) {
        return;
    }

    if (payload === undefined) {
        console.log(`[Cyphers] ${label}`);
        return;
    }

    if (typeof payload === "string") {
        console.log(`[Cyphers] ${label}: ${payload}`);
        return;
    }

    try {
        console.log(`[Cyphers] ${label}: ${JSON.stringify(payload, null, 2)}`);
    } catch {
        console.log(`[Cyphers] ${label}:`, payload);
    }
}

function truncateForLog(value = "", limit = TEXT_LOG_LIMIT) {
    const normalized = String(value).replace(/\s+/g, " ").trim();
    return normalized.length > limit ?`${normalized.slice(0, limit)}...` : normalized;
}

function extractResponseText(response) {
    if (response && response.output_text) {
        return response.output_text;
    }

    if (!response || !Array.isArray(response.output)) {
        return "";
    }

    for (const item of response.output) {
        if (!item || !Array.isArray(item.content)) {
            continue;
        }

        const outputTextPart = item.content.find((content) => content && content.type === "output_text" && content.text);

        if (outputTextPart) {
            return outputTextPart.text;
        }
    }

    return "";
}

function normalizeText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function extractKeywords(name, artist) {
    return `${name} ${artist}`
        .split(/\s+/)
        .map((part) => normalizeText(part))
        .filter((part) => part.length >= 3);
}

function decodeDuckDuckGoHref(rawHref = "") {
    if (!rawHref) {
        return "";
    }

    if (rawHref.startsWith("//duckduckgo.com/l/?")) {
        rawHref = `https:${rawHref}`;
    }

    if (!rawHref.startsWith("http")) {
        return rawHref;
    }

    try {
        const url = new URL(rawHref);
        const redirected = url.searchParams.get("uddg");
        return redirected ?decodeURIComponent(redirected) : rawHref;
    } catch {
        return rawHref;
    }
}

function isRelevantCifraUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.includes("cifraclub.com.br");
    } catch {
        return false;
    }
}

function normalizeCipherText(value = "") {
    return String(value)
        .replace(/\r/g, "")
        .replace(/\t/g, "    ")
        .replace(/[ \u00a0]+$/gm, "")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim();
}

function extractElementTextWithBreaks($, element) {
    const clone = $(element).clone();
    clone.find("br").replaceWith("\n");
    return normalizeCipherText(clone.text());
}

function extractLyricsText($) {
    const paragraphs = [];

    $(".letra p").each((index, element) => {
        const text = extractElementTextWithBreaks($, element);

        if (text.length > 0) {
            paragraphs.push(text);
        }
    });

    if (paragraphs.length > 0) {
        return normalizeCipherText(paragraphs.join("\n\n"));
    }

    const lyricsContainer = $(".letra").first();

    if (lyricsContainer.length > 0) {
        return extractElementTextWithBreaks($, lyricsContainer);
    }

    return "";
}

function extractPageTitle($) {
    const selectors = [
        ".cifra h1",
        "main h1",
        "article h1",
        "h1",
        "meta[property='og:title']",
        "title"
    ];

    for (const selector of selectors) {
        let title = "";
        const element = $(selector).first();

        if (selector.startsWith("meta")) {
            title = element.attr("content") || "";
        } else {
            title = element.text();
        }

        title = compactText(title, 255);

        if (title && title !== "Cifra Club") {
            return title;
        }
    }

    return "";
}

function assertCifraClubUrl(url) {
    if (!isRelevantCifraUrl(url)) {
        const error = new Error("URL de cifra inválida");
        error.status = 400;
        throw error;
    }
}

async function fetchCifraPageHtml(url) {
    assertCifraClubUrl(url);

    const response = await fetch(url, {
        headers: {
            "user-agent": "Mozilla/5.0"
        }
    });

    if (!response.ok) {
        const error = new Error(`Cifra Club page request failed with status ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return response.text();
}

function extractCipherFromHtml(html) {
    const $ = cheerio.load(html);
    const title = extractPageTitle($);
    const candidates = [];
    const selectors = [
        ".cifra_cnt pre",
        "[class*='cifra'] pre",
        "[data-cy='cifra-content']",
        "pre",
        "article"
    ];

    for (const selector of selectors) {
        $(selector).each((index, element) => {
            const text = normalizeCipherText($(element).text());

            if (text.length > 40) {
                candidates.push({
                    selector,
                    text
                });
            }
        });
    }

    const bestCandidate = candidates.sort((a, b) => b.text.length - a.text.length)[0];

    if (bestCandidate) {
        return {
            title,
            text: bestCandidate.text
        };
    }

    const lyricsText = extractLyricsText($);

    if (lyricsText.length > 40) {
        return {
            title,
            text: lyricsText
        };
    }

    return {
        title,
        text: ""
    };
}

function scoreCandidate(candidate, keywords) {
    const haystack = normalizeText(`${candidate.title} ${candidate.snippet} ${candidate.href}`);
    let score = 0;

    for (const keyword of keywords) {
        if (haystack.includes(keyword)) {
            score += 3;
        }
    }

    if (/\/tabs-|\/partituras\/|\/cifra\//.test(candidate.href)) {
        score += 2;
    }

    if (/\/letra\/?$/.test(candidate.href) || /letra da m[úu]sica/i.test(candidate.title)) {
        score -= 1;
    }

    if (candidate.href.split("/").length > 4) {
        score += 1;
    }

    return score;
}

async function fetchSearchHtml(query) {
    const searchUrl = `${DUCKDUCKGO_HTML_URL}?q=${encodeURIComponent(query)}`;

    debugLog("Iniciando busca de cifra", {
        query,
        searchUrl
    });

    const response = await fetch(searchUrl, {
        headers: {
            "user-agent": "Mozilla/5.0"
        }
    });

    if (!response.ok) {
        throw new Error(`DuckDuckGo HTML search failed with status ${response.status}`);
    }

    const html = await response.text();

    debugLog("HTML retornado pela busca", {
        status: response.status,
        finalUrl: response.url,
        contentType: response.headers.get("content-type"),
        htmlLength: html.length,
        htmlPreview: truncateForLog(html, HTML_LOG_LIMIT)
    });

    return html;
}

function parseSearchResults(html, name, artist) {
    const $ = cheerio.load(html);
    const keywords = extractKeywords(name, artist);
    const results = [];
    const seen = new Set();
    const rawAnchors = $("a.result__a").length;

    $("a.result__a").each((index, element) => {
        const href = decodeDuckDuckGoHref($(element).attr("href"));
        const title = compactText($(element).text(), 180);
        const snippet = compactText($(element).closest(".result").find(".result__snippet").text(), 220);

        if (!href || !title || !isRelevantCifraUrl(href) || seen.has(href)) {
            return;
        }

        seen.add(href);
        results.push({
            title,
            href,
            snippet
        });
    });

    debugLog("Resultado do parse do HTML", {
        song: name,
        artist,
        rawAnchorCount: rawAnchors,
        candidateCount: results.length,
        candidatesPreview: results.slice(0, MAX_RESULTS)
    });

    return results
        .map((candidate) => ({
            ...candidate,
            score: scoreCandidate(candidate, keywords)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
}

function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return null;
    }

    return new OpenAI({ apiKey });
}

async function rerankWithOpenAI(candidates, name, artist) {
    const client = getOpenAIClient();

    if (!client || candidates.length === 0) {
        debugLog("Rerank pulado", {
            hasOpenAIKey: Boolean(client),
            candidatesFound: candidates.length
        });
        return candidates.slice(0, MAX_RESULTS).map(({ title, href }) => ({ title, href }));
    }

    const serializedCandidates = candidates
        .slice(0, 8)
        .map((candidate, index) => `${index + 1}|${candidate.title}|${candidate.href}|${compactText(candidate.snippet, 120)}`)
        .join("\n");
    const requestPayload = {
        model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
        song: name,
        artist,
        candidates: serializedCandidates
    };

    debugLog("Candidatos enviados ao OpenAI", requestPayload);

    try {
        const response = await client.responses.create({
            model: requestPayload.model,
            reasoning: {
                effort: "minimal"
            },
            store: false,
            max_output_tokens: 220,
            text: {
                format: {
                    type: "json_schema",
                    name: "cifra_results",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            items: {
                                type: "array",
                                maxItems: MAX_RESULTS,
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        title: { type: "string" },
                                        href: { type: "string" }
                                    },
                                    required: ["title", "href"]
                                }
                            }
                        },
                        required: ["items"]
                    }
                }
            },
            input: [
                {
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: "Escolha apenas links do Cifra Club que provavelmente sejam cifras da música pedida. Priorize a música correta e descarte páginas genéricas."
                        }
                    ]
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: `Música: ${name}\nArtista: ${artist}\nCandidatos:\n${serializedCandidates}`
                        }
                    ]
                }
            ]
        });
        const responseText = extractResponseText(response);

        debugLog("Resposta bruta do OpenAI", {
            id: response.id,
            model: response.model,
            outputText: truncateForLog(responseText, TEXT_LOG_LIMIT),
            output: truncateForLog(JSON.stringify(response.output || []), TEXT_LOG_LIMIT),
            usage: response.usage || null
        });

        const parsed = JSON.parse(responseText);

        if (!parsed.items || !Array.isArray(parsed.items)) {
            throw new Error("OpenAI returned invalid schema payload");
        }

        const validUrls = new Set(candidates.map((candidate) => candidate.href));
        const filteredItems = parsed.items
            .filter((item) => item && item.href && item.title && validUrls.has(item.href))
            .slice(0, MAX_RESULTS);

        debugLog("Itens escolhidos após validação", filteredItems);

        return filteredItems;
    } catch (error) {
        console.warn("[Cyphers] Falha no rerank com OpenAI, usando heurística:", error.message);
        debugLog("Erro detalhado no rerank", {
            message: error.message,
            stack: error.stack
        });
        return candidates.slice(0, MAX_RESULTS).map(({ title, href }) => ({ title, href }));
    }
}

let cyphers = {
    scrapeCifraClub: async function (name, artist) {
        const query = `${name} ${artist} site:cifraclub.com.br`;
        const html = await fetchSearchHtml(query);
        const candidates = parseSearchResults(html, name, artist);

        debugLog("Resumo da extracao", {
            song: name,
            artist,
            query,
            resultCount: candidates.length,
            topCandidates: candidates.slice(0, MAX_RESULTS)
        });

        if (candidates.length === 0) {
            debugLog("Nenhuma cifra encontrada na etapa de parse", {
                query,
                hint: "Verifique o htmlPreview e a contagem de anchors para entender se o buscador bloqueou ou mudou o layout."
            });
            return [];
        }

        return rerankWithOpenAI(candidates, name, artist);
    },
    scrapeCifraContent: async function (url) {
        const html = await fetchCifraPageHtml(url);
        const cipher = extractCipherFromHtml(html);

        if (!cipher.text) {
            const error = new Error("Não foi possível extrair o conteúdo da cifra");
            error.status = 422;
            throw error;
        }

        return {
            sourceUrl: url,
            title: cipher.title,
            text: cipher.text
        };
    }
}

module.exports = cyphers;

