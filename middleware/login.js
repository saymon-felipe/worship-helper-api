const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
    try {
        const authorization = req.headers.authorization || "";
        const token = authorization.startsWith("Bearer ") ? authorization.split(" ")[1] : null;
        if (!token) {
            return res.status(401).send({ message: "Falha na autenticação" });
        }
        const decode = jwt.verify(token, process.env.JWT_KEY);
        if (!decode.id_usuario || !decode.email_usuario) {
            return res.status(401).send({ message: "Falha na autenticação" });
        }
        req.usuario = decode;
        next();
    } catch {
        return res.status(401).send({ message: "Falha na autenticação" });
    }
}
