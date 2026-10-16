const cheerio = require("cheerio");
const OpenAI = require("openai");

const DUCKDUCKGO_HTML_URL = "https://html.duckduckgo.com/html/";
const CIFRA_CLUB_SUGGEST_URL = "https://solr.sscdn.co/cc/c7/";
const DEFAULT_OPENAI_MODEL = "gpt-5-nano";
const MAX_RESULTS = 8;
const HTML_LOG_LIMIT = 4000;
const TEXT_LOG_LIMIT = 1500;
const CIFRA_CLUB_SONG_TYPE = "2";
const MIN_DIRECT_CANDIDATES = 5;
const RERANK_MAX_OUTPUT_TOKENS = 1500;

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

function cifraExtractionLog(label, payload) {
    console.info(`[Cyphers] ${label}`, payload);
}

function cifraPageContext(rawUrl) {
    try {
        const url = new URL(rawUrl);
        return {
            host: url.hostname,
            path: url.pathname
        };
    } catch {
        return { url: String(rawUrl || "") };
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

function isPartituraUrl(url) {
    try {
        const parsed = new URL(url);
        return /(^|\/)partituras?(?:\/|$)/i.test(parsed.pathname);
    } catch {
        return false;
    }
}

function isRelevantCifraUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.includes("cifraclub.com.br") && !isPartituraUrl(url);
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

function createCifraPageHeaders(userAgent, mobile) {
    return {
        "user-agent": userAgent,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "upgrade-insecure-requests": "1",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
        "sec-ch-ua-mobile": mobile ? "?1" : "?0",
        "sec-ch-ua-platform": mobile ? "\"Android\"" : "\"Windows\""
    };
}

// O Cifra Club fica atras da Akamai, que bloqueia (403 "Access Denied") de forma intermitente
// clientes com cara de bot. Por isso tentamos perfis de navegador diferentes antes de desistir.
const CIFRA_PAGE_REQUEST_PROFILES = [
    {
        label: "desktop",
        headers: createCifraPageHeaders("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", false)
    },
    {
        label: "mobile",
        headers: createCifraPageHeaders("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", true)
    },
    {
        label: "basico",
        headers: { "user-agent": "Mozilla/5.0" }
    }
];
const CIFRA_PAGE_RETRYABLE_STATUS = new Set([403, 429, 500, 502, 503, 504]);
const CIFRA_PAGE_RETRY_DELAY_MS = 600;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function createCifraPageError(status) {
    const blocked = status === 403 || status === 429;
    const error = new Error(
        blocked
            ? "O Cifra Club bloqueou temporariamente a busca da cifra. Aguarde alguns instantes e tente novamente."
            : `Não foi possível baixar a cifra do Cifra Club (status ${status}). Tente novamente em instantes.`
    );

    // O erro vem do servico externo; repassar 403/429 faria o cliente achar que a propria API negou acesso.
    error.status = 502;
    error.upstreamStatus = status;
    return error;
}

async function fetchCifraPageHtml(url) {
    assertCifraClubUrl(url);

    const page = cifraPageContext(url);
    cifraExtractionLog("Iniciando download da página de cifra", page);

    let lastStatus = null;
    let lastNetworkError = null;

    for (let attempt = 0; attempt < CIFRA_PAGE_REQUEST_PROFILES.length; attempt++) {
        const profile = CIFRA_PAGE_REQUEST_PROFILES[attempt];

        if (attempt > 0) {
            await delay(CIFRA_PAGE_RETRY_DELAY_MS * attempt);
        }

        let response;

        try {
            response = await fetch(url, { headers: profile.headers });
        } catch (error) {
            lastNetworkError = error;
            cifraExtractionLog("Falha de rede ao baixar página de cifra", {
                ...page,
                attempt: attempt + 1,
                profile: profile.label,
                message: error.message,
                cause: error.cause && error.cause.message
            });
            continue;
        }

        if (response.ok) {
            const html = await response.text();

            cifraExtractionLog("Página de cifra baixada", {
                ...page,
                attempt: attempt + 1,
                profile: profile.label,
                status: response.status,
                finalUrl: response.url,
                contentType: response.headers.get("content-type"),
                htmlLength: html.length
            });

            return html;
        }

        lastStatus = response.status;
        lastNetworkError = null;
        cifraExtractionLog("Cifra Club respondeu com erro", {
            ...page,
            attempt: attempt + 1,
            profile: profile.label,
            status: response.status,
            statusText: response.statusText,
            server: response.headers.get("server"),
            finalUrl: response.url
        });
        await response.arrayBuffer().catch(() => null);

        if (!CIFRA_PAGE_RETRYABLE_STATUS.has(response.status)) {
            break;
        }
    }

    if (lastNetworkError) {
        throw lastNetworkError;
    }

    throw createCifraPageError(lastStatus);
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
    let bestCandidate = null;

    for (const selector of selectors) {
        const selectorCandidates = [];

        $(selector).each((index, element) => {
            const text = normalizeCipherText($(element).text());

            if (text.length > 40) {
                selectorCandidates.push({
                    selector,
                    text
                });
            }
        });

        candidates.push(...selectorCandidates);

        // Os seletores estao em ordem de confianca: o primeiro que achar conteudo vence, e o tamanho
        // so desempata dentro dele. Comparar tamanho entre seletores deixaria um bloco generico
        // maior (ex.: <article> com texto alem da cifra) ganhar da cifra de verdade.
        if (!bestCandidate && selectorCandidates.length > 0) {
            bestCandidate = selectorCandidates.reduce((best, current) => current.text.length > best.text.length ? current : best);
        }
    }

    if (bestCandidate) {
        return {
            title,
            text: bestCandidate.text,
            extractionSource: bestCandidate.selector,
            candidateCount: candidates.length,
            lyricsLength: 0
        };
    }

    const lyricsText = extractLyricsText($);

    if (lyricsText.length > 40) {
        return {
            title,
            text: lyricsText,
            extractionSource: ".letra",
            candidateCount: candidates.length,
            lyricsLength: lyricsText.length
        };
    }

    return {
        title,
        text: "",
        extractionSource: null,
        candidateCount: candidates.length,
        lyricsLength: lyricsText.length,
        selectorMatches: {
            cifraPre: $(".cifra_cnt pre").length,
            classCifraPre: $("[class*='cifra'] pre").length,
            dataCy: $("[data-cy='cifra-content']").length,
            pre: $("pre").length,
            article: $("article").length,
            lyrics: $(".letra").length
        }
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

    if (/\/tabs-|\/cifra\//.test(candidate.href)) {
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

    // O DuckDuckGo responde 202 com uma pagina anti-bot (sem resultados) quando bloqueia; isso nao e sucesso.
    if (response.status !== 200) {
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

function parseJsonResponse(text) {
    const trimmed = String(text || "").trim();
    // A resposta vem como JSONP: "(...)" ou "callback(...)", com ";" opcional no fim.
    const jsonpMatch = trimmed.match(/^[\w$.]*\(([\s\S]*)\)\s*;?$/);

    return JSON.parse(jsonpMatch ? jsonpMatch[1] : trimmed);
}

async function fetchCifraClubSuggest(query) {
    const searchUrl = new URL(CIFRA_CLUB_SUGGEST_URL);
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("callback", "suggest_callback");

    debugLog("Iniciando busca direta no Cifra Club", {
        query,
        searchUrl: searchUrl.toString()
    });

    const response = await fetch(searchUrl, {
        headers: {
            "user-agent": "Mozilla/5.0",
            "referer": "https://m.cifraclub.com.br/"
        }
    });

    if (!response.ok) {
        throw new Error(`Cifra Club suggest failed with status ${response.status}`);
    }

    const text = await response.text();
    const data = parseJsonResponse(text);

    debugLog("Resposta da busca direta no Cifra Club", {
        status: response.status,
        resultCount: data && data.response && Array.isArray(data.response.docs) ? data.response.docs.length : 0,
        responsePreview: truncateForLog(text, TEXT_LOG_LIMIT)
    });

    return data;
}

function parseCifraClubSuggestResults(data) {
    const docs = data && data.response && Array.isArray(data.response.docs) ? data.response.docs : [];

    return docs
        .filter((doc) => String(doc.tipo) === CIFRA_CLUB_SONG_TYPE && doc.dns && doc.url && doc.txt)
        .map((doc) => ({
            // 150 + 80 + separadores/sufixo fica abaixo de 255, o limite de cipher_title na validacao e no banco.
            title: `${compactText(doc.txt, 150)} - ${compactText(doc.art || "", 80)} - Cifra Club`,
            href: `https://www.cifraclub.com.br/${doc.dns}/${doc.url}/`,
            snippet: compactText(doc.album_name || "", 220),
            score: Number(doc.score || (doc.features && doc.features.original_score) || 0)
        }))
        .slice(0, 12);
}

async function searchCifraClubSuggest(name, artist) {
    // A busca do Cifra Club exige que todos os termos casem. O "artista" informado costuma ser o canal do
    // YouTube (ex.: MK Music) e nao o interprete da cifra, entao "musica + artista" pode voltar vazio.
    // Se vier pouco resultado, relaxamos a consulta para so o nome da musica.
    const queries = [...new Set([
        compactText(`${name} ${artist}`, 180),
        compactText(name, 180)
    ].filter(Boolean))];
    let candidates = [];

    for (const query of queries) {
        try {
            const data = await fetchCifraClubSuggest(query);
            candidates = mergeCandidates(candidates, parseCifraClubSuggestResults(data));
        } catch (error) {
            console.warn("[Cyphers] Falha na busca direta do Cifra Club:", error.message);
            debugLog("Erro detalhado na busca direta do Cifra Club", {
                message: error.message,
                stack: error.stack
            });
        }

        if (candidates.length >= MIN_DIRECT_CANDIDATES) {
            break;
        }
    }

    return candidates.slice(0, 12);
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

function mergeCandidates(primaryCandidates, secondaryCandidates) {
    const seen = new Set();
    const merged = [];

    [...primaryCandidates, ...secondaryCandidates].forEach((candidate) => {
        if (!candidate || !candidate.href || seen.has(candidate.href)) {
            return;
        }

        seen.add(candidate.href);
        merged.push(candidate);
    });

    return merged;
}

function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return null;
    }

    return new OpenAI({ apiKey });
}

function heuristicResults(candidates) {
    return candidates.slice(0, MAX_RESULTS).map(({ title, href }) => ({ title, href }));
}

async function rerankWithOpenAI(candidates, name, artist) {
    const client = getOpenAIClient();

    if (!client || candidates.length === 0) {
        debugLog("Rerank pulado", {
            hasOpenAIKey: Boolean(client),
            candidatesFound: candidates.length
        });
        return heuristicResults(candidates);
    }

    const shownCandidates = candidates.slice(0, 8);
    const serializedCandidates = shownCandidates
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
        // O modelo devolve apenas os numeros dos candidatos. Titulos e URLs vem sempre do que o servidor
        // encontrou, entao o tamanho deles nao afeta a resposta (antes o JSON era cortado pelo limite de
        // tokens e o rerank falhava) e o modelo nao consegue inventar um link.
        const response = await client.responses.create({
            model: requestPayload.model,
            reasoning: {
                effort: "minimal"
            },
            store: false,
            max_output_tokens: RERANK_MAX_OUTPUT_TOKENS,
            text: {
                format: {
                    type: "json_schema",
                    name: "cifra_ranking",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            ranking: {
                                type: "array",
                                items: { type: "integer" }
                            }
                        },
                        required: ["ranking"]
                    }
                }
            },
            input: [
                {
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: "Escolha, entre os candidatos numerados do Cifra Club, os que provavelmente são a cifra da música pedida, do mais provável ao menos provável. Responda apenas com os números dos candidatos. O artista informado muitas vezes é o canal ou a gravadora do vídeo (ex.: MK Music) e não o intérprete da cifra, então priorize o nome da música e não descarte um candidato só porque o artista é diferente. Descarte páginas genéricas, letras (/letra/) e medleys que não sejam a música pedida."
                        }
                    ]
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: `Música: ${name}\nArtista: ${artist}\nCandidatos (número|título|link|trecho):\n${serializedCandidates}`
                        }
                    ]
                }
            ]
        });
        const responseText = extractResponseText(response);

        debugLog("Resposta bruta do OpenAI", {
            id: response.id,
            model: response.model,
            status: response.status,
            outputText: truncateForLog(responseText, TEXT_LOG_LIMIT),
            output: truncateForLog(JSON.stringify(response.output || []), TEXT_LOG_LIMIT),
            usage: response.usage || null
        });

        if (response.status === "incomplete") {
            const reason = response.incomplete_details && response.incomplete_details.reason;
            throw new Error(`OpenAI response incomplete${reason ? `: ${reason}` : ""}`);
        }

        const parsed = JSON.parse(responseText);

        if (!parsed.ranking || !Array.isArray(parsed.ranking)) {
            throw new Error("OpenAI returned invalid schema payload");
        }

        const filteredItems = [];
        const seenPositions = new Set();

        for (const position of parsed.ranking) {
            if (!Number.isInteger(position) || position < 1 || position > shownCandidates.length || seenPositions.has(position)) {
                continue;
            }

            seenPositions.add(position);
            filteredItems.push({
                title: shownCandidates[position - 1].title,
                href: shownCandidates[position - 1].href
            });
        }

        filteredItems.splice(MAX_RESULTS);

        debugLog("Itens escolhidos após validação", filteredItems);

        if (filteredItems.length === 0) {
            // O usuario precisa sempre ter cifras para escolher; nao deixamos o filtro do modelo zerar a lista.
            console.warn("[Cyphers] OpenAI nao escolheu nenhum candidato valido, usando heurística");
            return heuristicResults(candidates);
        }

        return filteredItems;
    } catch (error) {
        console.warn("[Cyphers] Falha no rerank com OpenAI, usando heurística:", error.message);
        debugLog("Erro detalhado no rerank", {
            message: error.message,
            stack: error.stack
        });
        return heuristicResults(candidates);
    }
}

let cyphers = {
    scrapeCifraClub: async function (name, artist) {
        const query = compactText(`${name} ${artist}`, 180);
        const siteSearchQuery = `${query} site:cifraclub.com.br`;
        const directCandidates = await searchCifraClubSuggest(name, artist);
        let searchCandidates = [];

        try {
            const html = await fetchSearchHtml(siteSearchQuery);
            searchCandidates = parseSearchResults(html, name, artist);
        } catch (error) {
            console.warn("[Cyphers] Falha na busca via DuckDuckGo, usando busca direta:", error.message);
            debugLog("Erro detalhado na busca via DuckDuckGo", {
                message: error.message,
                stack: error.stack
            });
        }

        const candidates = mergeCandidates(directCandidates, searchCandidates);

        debugLog("Resumo da extracao", {
            song: name,
            artist,
            query: siteSearchQuery,
            directCandidateCount: directCandidates.length,
            searchCandidateCount: searchCandidates.length,
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
        const page = cifraPageContext(url);

        try {
            const html = await fetchCifraPageHtml(url);
            const cipher = extractCipherFromHtml(html);

            if (!cipher.text) {
                cifraExtractionLog("Conteúdo de cifra não encontrado na página", {
                    ...page,
                    title: cipher.title,
                    htmlLength: html.length,
                    candidateCount: cipher.candidateCount,
                    lyricsLength: cipher.lyricsLength,
                    selectorMatches: cipher.selectorMatches
                });
                const error = new Error("Não foi possível extrair o conteúdo da cifra");
                error.status = 422;
                throw error;
            }

            cifraExtractionLog("Cifra extraída com sucesso", {
                ...page,
                title: cipher.title,
                extractionSource: cipher.extractionSource,
                candidateCount: cipher.candidateCount,
                contentLength: cipher.text.length
            });

            return {
                sourceUrl: url,
                title: cipher.title,
                text: cipher.text
            };
        } catch (error) {
            cifraExtractionLog("Extração de cifra falhou", {
                ...page,
                status: error.status || null,
                message: error.message
            });
            throw error;
        }
    }
}

module.exports = cyphers;
