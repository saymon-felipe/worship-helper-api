const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const functions = require("../functions/functions.js");
const _musicService = require("../services/musicService");
const ciphers = require("../functions/cyphers.js");
const { validateBody, validateParams } = require("../middleware/validate");
const schemas = require("../validations/musicSchemas");

router.post("/procurar", login, validateBody(schemas.search), (req, res, next) => {
    if (req.usuario.email_usuario != process.env.APP_ADMINISTRATOR_EMAIL) {
        return res.status(401).send({ message: "Voce nao tem autorizacao para buscar musicas" });
    }

    _musicService.searchMusic(req.body.name, req.body.artist).then((results) => {
        let response = functions.createResponse("Retorno dos videos encontrados para a musica selecionada", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(error.status || 500).send(error);
    })
})

router.post("/procurar-cifra", login, validateBody(schemas.search), (req, res, next) => {
    if (req.usuario.email_usuario != process.env.APP_ADMINISTRATOR_EMAIL) {
        return res.status(401).send({ message: "Voce nao tem autorizacao para cadastrar musicas" });
    }

    ciphers.scrapeCifraClub(req.body.name, req.body.artist).then((results) => {
        let response = functions.createResponse("Retorno das cifras encontradas no cifra club", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(error.status || 500).send(error);
    })
})

router.post("/", login, validateBody(schemas.create), (req, res, next) => {
    if (req.usuario.email_usuario != process.env.APP_ADMINISTRATOR_EMAIL) {
        return res.status(401).send({ message: "Voce nao tem autorizacao para cadastrar musicas" });
    }

    _musicService.createMusic(req.body.name, req.body.artist, req.body.video_url, req.body.cipher_url, req.body.cipher_title, req.body.video_image, req.body.music_tags).then(() => {
        let response = functions.createResponse("Musica cadastrada com sucesso no banco de dados", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(error.status || 500).send(error.message || error);
    })
})

router.get("/", login, (req, res, next) => {
    _musicService.returnMusics().then((results) => {
        let response = functions.createResponse("Retorno de todas as musicas", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/retorna_musica/:music_id", login, validateParams(schemas.musicParams), validateBody(schemas.returnMusic), (req, res, next) => {
    _musicService.returnMusic(req.params.music_id, req.body.event_id).then((results) => {
        let response = functions.createResponse("Retorno da musica" + req.params.music_id, results, "GET", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/comentarios/criar", login, validateBody(schemas.createComment), (req, res, next) => {
    _musicService.postMusicComment(req.body.mensagem, req.usuario.id_usuario, req.body.id_musica).then(() => {
        let response = functions.createResponse("Comentario criado com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/comentarios/retorna", login, validateBody(schemas.returnComments), (req, res, next) => {
    _musicService.returnMusicComments(req.body.id_musica, req.usuario.id_usuario).then((results) => {
        let response = functions.createResponse("Retorno dos comentarios da musica", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/comentarios/like", login, validateBody(schemas.likeComment), (req, res, next) => {
    _musicService.likeComment(req.body.id_aviso, req.usuario.id_usuario).then(() => {
        let response = functions.createResponse("Curtida no comentario da musica feito com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.get("/tags", login, (req, res, next) => {
    _musicService.returnMusicTagsList().then((results) => {
        let response = functions.createResponse("Retorno da lista de tags de musicas", results, "GET", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

module.exports = router;

