const NodeCache = require("node-cache");
const jwt = require("jsonwebtoken");
const responseCache = new NodeCache({
    stdTTL: Number(process.env.GET_CACHE_TTL_SECONDS || 60),
    checkperiod: Number(process.env.GET_CACHE_CHECK_SECONDS || 120),
    useClones: false
});
const cachedPrefixes = ["/usuario", "/igreja", "/musicas"];
const readOnlyPostPaths = [
    /^\/usuario\/minhas-igrejas$/,
    /^\/usuario\/find_users$/,
    /^\/usuario\/check_jwt$/,
    /^\/igreja\/retorna-/,
    /^\/igreja\/ultimo-aviso$/,
    /^\/igreja\/permissao$/,
    /^\/igreja\/tons_de_musica\//,
    /^\/musicas\/procurar$/,
    /^\/musicas\/procurar-cifra$/,
    /^\/musicas\/retorna_musica\//,
    /^\/musicas\/comentarios\/retorna$/
];
function routeCanBeCached(req) {
    return req.method === "GET" && cachedPrefixes.some((prefix) => req.path.startsWith(prefix));
}
function getUserScope(req) {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.split(" ")[1] : "";
    if (!token) {
        return "public";
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        if (!decoded.id_usuario || !decoded.email_usuario) {
            return "invalid";
        }
        return `user:${decoded.id_usuario || "unknown"}:app:${decoded.app_owner ? 1 : 0}`;
    } catch {
        return "invalid";
    }
}
function buildCacheKey(req) {
    return `${getUserScope(req)}:${req.method}:${req.originalUrl}`;
}
function cacheGetResponses(req, res, next) {
    if (!routeCanBeCached(req)) {
        next();
        return;
    }
    const cacheKey = buildCacheKey(req);
    if (cacheKey.startsWith("invalid:")) {
        next();
        return;
    }
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
        res.set("X-Cache", "HIT");
        return res.status(cachedResponse.status).send(cachedResponse.body);
    }
    const originalSend = res.send.bind(res);
    res.send = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            responseCache.set(cacheKey, {
                status: res.statusCode,
                body
            });
            res.set("X-Cache", "MISS");
        }
        return originalSend(body);
    };
    next();
}
function shouldInvalidate(req) {
    if (req.method === "GET") {
        return false;
    }
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        return false;
    }
    return !readOnlyPostPaths.some((pattern) => pattern.test(req.path));
}
function clearCacheOnMutation(req, res, next) {
    if (!shouldInvalidate(req)) {
        next();
        return;
    }
    res.on("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            responseCache.flushAll();
        }
    });
    next();
}
module.exports = {
    cacheGetResponses,
    clearCacheOnMutation,
    responseCache
};