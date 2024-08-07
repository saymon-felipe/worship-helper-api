const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const uploadConfig = require("../config/upload.js");
const functions = require("../functions/functions.js");
const _churchService = require("../services/churchService");
const _permissions = require("../functions/permissions.js");

router.get("/listar-igrejas", login, (req, res, next) => {
    if (req.usuario.email_usuario != process.env.APP_ADMINISTRATOR_EMAIL) {
        return res.status(401).send({ message: "Você não tem autorização para listar as igrejas" });
    }

    _churchService.returnChurches().then((results) => {
        let response = functions.createResponse("Retorno de todas as igrejas cadastradas no app", results, "GET", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/criar-tag", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.createTag(req.body.id_igreja, req.body.nome).then(() => {
            let response = functions.createResponse("Tag criada com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/deletar-tag", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.deleteTag(req.body.id_igreja, req.body.id_tag).then(() => {
            let response = functions.createResponse("Tag excluída com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-tags", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }
        
        _churchService.returnTags(req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno das tags da igreja " + req.body.id_igreja, results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/criar-funcao", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.createFunction(req.body.id_igreja, req.body.nome).then(() => {
            let response = functions.createResponse("Função criada com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/deletar-funcao", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.deleteFunction(req.body.id_function, req.body.id_igreja).then(() => {
            let response = functions.createResponse("Função removida com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-funcoes", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }
        
        _churchService.returnFunctions(req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno das funções da igreja " + req.body.id_igreja, results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-igreja", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }
        
        _churchService.returnChurch(req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno da igreja de id " + req.body.id_igreja, results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/publicar-aviso", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then(() => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.postWarning(req.body.id_igreja, req.body.mensagem, req.usuario.id_usuario).then(() => {
            let response = functions.createResponse("Aviso criado com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-avisos", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }
        
        _churchService.returnWarnings(req.usuario.id_usuario, req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno dos avisos dessa igreja", results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/curtir-aviso", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }
        
        _churchService.likeWarning(req.usuario.id_usuario, req.body.id_aviso).then(() => {
            let response = functions.createResponse("Aviso foi curtido com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/permissao", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((results) => {
        let response = functions.createResponse("Retorno das permissões", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/envia-convite", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }
        
        _churchService.sendInvite(req.body.id_igreja, req.body.id_usuario, req.usuario.id_usuario).then(() => {
            let response = functions.createResponse("Convite enviado", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/adicionar-funcao", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.addFunction(req.body.novaFuncao, req.body.id_igreja, req.usuario.id_usuario).then(() => {
            let response = functions.createResponse("Função adicionada com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    })
    .catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/remover-membro", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (req.body.id_usuario == req.usuario.id_usuario) {
            let response = functions.createResponse("Você não pode sair da igreja que você é o dono", null, "POST", 401);

            return res.status(401).send(response);
        }

        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.removeMember(req.body.id_igreja, req.body.id_usuario).then(() => {
            let response = functions.createResponse("Usuário removido com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error2) => {
            return res.status(500).send(error2);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/cadastrar-igreja", login, (req, res, next) => {
    if (req.usuario.email_usuario != process.env.APP_ADMINISTRATOR_EMAIL) {
        let response = functions.createResponse("Você não tem autorização para cadastrar uma igreja", null, "POST", 401);

        return res.status(401).send(response);
    }

    _churchService.createChurch(req.body.nome_igreja, req.body.usuario_administrador, process.env.URL_API + "/public/church-default-image.jpg").then(() => {
        let response = functions.createResponse("Igreja cadastrada com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error2) => {
        return res.status(500).send(error2);
    })
})

router.patch("/church-image/:id_igreja", login, uploadConfig.upload.single('church_image'), (req, res, next) => {
    if (req.file == undefined) {
        let response = functions.createResponse("Tipo de arquivo não suportado", null, "POST", 500);
        return res.status(500).send(response);
    }

    _permissions.checkPermission(req.usuario.id_usuario, req.params.id_igreja).then((permission) => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.changeChurchImage(req.params.id_igreja, req.file.location).then(() => {
            let response = functions.createResponse("Imagem da igreja alterada com sucesso", null, "PATCH", 200);
            return res.status(200).send(response);
        }).catch((error2) => {
            return res.status(500).send(error2);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
});

router.post("/cadastrar-evento", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.createEvent(req.usuario.id_usuario, req.body.id_igreja, req.body.event_date, req.body.event_name, req.body.event_members, req.body.event_musics).then(() => {
            let response = functions.createResponse("Evento cadastrado com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-eventos", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.returnEvents(req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno dos eventos da igreja", results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-evento/:id_evento", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.returnEvent(req.params.id_evento, req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno do evento", results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/tons_de_musica/:id_musica", login, (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.returnTones(req.params.id_musica, req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno dos tons disponíveis e tons salvos da igreja", results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})
module.exports = router;