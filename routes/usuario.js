const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const _usuarioService = require("../services/usuarioService");
const uploadConfig = require("../config/upload.js");
const functions = require("../functions/functions.js");

router.get("/return_user", login, (req, res, next) => {
    _usuarioService.returnUser(req.usuario.id_usuario).then((results) => {
        let response = functions.createResponse("Retorno do usuário " + results.id_usuario, results, "GET", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/app_administrator", login, (req, res, next) => {
    if (req.usuario.email_usuario == process.env.APP_ADMINISTRATOR_EMAIL) {
        let response = functions.createResponse("Acesso liberado", null, "GET", 200);
        return res.status(200).send(response);
    }

    let response = functions.createResponse("Acesso negado", null, "POST", 401);
    return res.status(401).send(response);
})

router.post("/find_users", (req, res, next) => {
    _usuarioService.findUsers(req.body.search).then((results) => {
        let response = functions.createResponse("Retorno de todos os usuários pelo critério solicitado", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/minhas-igrejas", login, (req, res, next) => {
    _usuarioService.myChurches(req.usuario.id_usuario).then((results) => {
        let response = functions.createResponse("Retorno de todas as igrejas do usuario " + req.usuario.id_usuario, results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post('/cadastro', (req, res, next) => {
    _usuarioService.register(req.body.nome_usuario, req.body.email_usuario, req.body.senha_usuario).then((results) => {
        let response = functions.createResponse("Usuário criado com sucesso", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/login", (req, res, next) => {
    _usuarioService.login(req.body.email_usuario, req.body.senha_usuario).then((results) => {
        let response = functions.createResponse("Autenticado com sucesso", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/rejeita-convite", login, (req, res, next) => {
    _usuarioService.rejectInvite(req.body.id_igreja, req.usuario.id_usuario).then(() => {
        let response = functions.createResponse("Convite excluído com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/aceita-convite", login, (req, res, next) => {
    _usuarioService.acceptInvite(req.body.id_igreja, req.usuario.id_usuario).then(() => {
        let response = functions.createResponse("Convite aceito com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.get("/retorna-convites", login, (req, res, next) => {
    _usuarioService.returnInvites(req.usuario.id_usuario).then((results) => {
        let response = functions.createResponse("Retorno dos convites", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/update_bio", login, (req, res, next) => {
    _usuarioService.updateBio(req.body.new_bio, req.usuario.id_usuario).then((results) => {
        let response = functions.createResponse("Biografia alterada com sucesso.", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.patch("/remove_image", login, (req, res, next) => {
    _usuarioService.removeImage(req.usuario.id_usuario).then(() => {
        let response = functions.createResponse("Imagem excluída com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.patch("/update_image", login, uploadConfig.upload.single('imagem_usuario'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send({ error: "Tipo de arquivo não suportado" });
    }

    _usuarioService.setImage(req.file.location, req.usuario.id_usuario).then(() => {
        let response = functions.createResponse("Imagem alterada com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/altera-tag", login, (req, res, next) => {
    _usuarioService.changeTag(req.body.id_usuario, req.body.id_igreja, req.body.id_tag).then(() => {
        let response = functions.createResponse("Tag adicionada com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/altera-funcoes", login, (req, res, next) => {
    _usuarioService.newFunctions(req.body.id_usuario, req.body.id_igreja, req.body.new_functions).then(() => {
        let response = functions.createResponse("Funções adicionadas com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post('/check_jwt', login, (req, res, next) => {
    _usuarioService.checkJwt(req.usuario.id_usuario, req.body.token).then((results) => {
        let returnObj = {
            newToken: results
        }

        let response = functions.createResponse("JWT renovado com sucesso", returnObj, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

module.exports = router;