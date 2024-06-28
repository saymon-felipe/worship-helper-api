const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const functions = require("../functions/functions.js");
const _musicService = require("../services/musicService");

router.post("/procurar", login, (req, res, next) => {
    if (req.usuario.email_usuario != process.env.APP_ADMINISTRATOR_EMAIL) {
        return res.status(401).send({ message: "Você não tem autorização para buscar músicas" });
    }

    _musicService.searchMusic(req.body.name, req.body.artist).then((results) => {
        let response = functions.createResponse("Retorno dos videos encontrados para a música selecionada", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        console.log(error)
        return res.status(500).send(error);
    })
})

router.post("/", login, (req, res, next) => {
    if (req.usuario.email_usuario != process.env.APP_ADMINISTRATOR_EMAIL) {
        return res.status(401).send({ message: "Você não tem autorização para cadastrar músicas" });
    }

    _musicService.createMusic(req.body.name, req.body.artist, req.body.video_url).then((results) => {
        let response = functions.createResponse("Música cadastrada com sucesso no banco de dados", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        console.log(error)
        return res.status(500).send(error);
    })
})

module.exports = router;