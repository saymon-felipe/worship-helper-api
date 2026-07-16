const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const uploadConfig = require("../config/upload.js");
const functions = require("../functions/functions.js");
const _churchService = require("../services/churchService");
const _permissions = require("../functions/permissions.js");
const { validateBody, validateParams } = require("../middleware/validate");
const schemas = require("../validations/churchSchemas");
const { requireAppAdministrator } = require("../functions/authClaims");

router.get("/listar-igrejas", login, (req, res, next) => {
    if (!requireAppAdministrator(req, res)) {
        return;
    }

    _churchService.returnChurches().then((results) => {
        let response = functions.createResponse("Retorno de todas as igrejas cadastradas no app", results, "GET", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/deletar-igreja", login, (req, res, next) => {
    if (!requireAppAdministrator(req, res)) {
        return;
    }

    _churchService.deleteChurch(req.body.id_igreja).then(() => {
        let response = functions.createResponse("Igreja excluída com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/atualizar-igreja", login, (req, res, next) => {
    if (!requireAppAdministrator(req, res)) {
        return;
    }

    _churchService.updateChurch(req.body.id_igreja, req.body.nome_igreja, req.body.imagem_igreja).then(() => {
        let response = functions.createResponse("Igreja atualizada com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/criar-tag", login, validateBody(schemas.tag), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.tags")) {
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

router.post("/deletar-tag", login, validateBody(schemas.deleteTag), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.tags")) {
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

router.post("/retorna-tags", login, validateBody(schemas.churchId), (req, res, next) => {
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

router.post("/criar-funcao", login, validateBody(schemas.churchFunction), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.roles")) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.createFunction(req.body.id_igreja, req.body.nome, req.body.permissoes).then(() => {
            let response = functions.createResponse("Função criada com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/atualizar-funcao", login, validateBody(schemas.updateChurchFunction), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.roles")) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.updateFunction(req.body.id_function, req.body.id_igreja, req.body.nome, req.body.permissoes).then(() => {
            let response = functions.createResponse("Funcao atualizada com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/deletar-funcao", login, validateBody(schemas.deleteFunction), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.roles")) {
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

router.post("/retorna-funcoes", login, validateBody(schemas.churchId), (req, res, next) => {
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

router.post("/retorna-igreja", login, validateBody(schemas.churchId), (req, res, next) => {
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

router.post("/retorna-membros", login, validateBody(schemas.churchId), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }

        functions.returnChurchMembers(req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno dos membros da igreja " + req.body.id_igreja, results.object, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/publicar-aviso", login, validateBody(schemas.warning), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!req.body.parent_id && !_permissions.hasPermission(permission, "warnings.create")) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.postWarning(req.body.id_igreja, req.body.mensagem, req.usuario.id_usuario, req.body.parent_id).then(() => {
            let response = functions.createResponse("Aviso criado com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/editar-aviso", login, validateBody(schemas.updateWarning), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        functions.executeSQL(`SELECT aviso_igreja_id_criador FROM avisos_igreja WHERE id_aviso_igreja = ?`, [req.body.id_aviso])
        .then((results) => {
            const isCreator = results.length > 0 && Number(results[0].aviso_igreja_id_criador) === Number(req.usuario.id_usuario);
            
            if (!isCreator && !_permissions.hasPermission(permission, "warnings.edit")) {
                return res.status(401).send("Acesso negado");
            }

            _churchService.updateWarning(req.body.id_igreja, req.body.id_aviso, req.body.mensagem).then(() => {
                let response = functions.createResponse("Aviso atualizado com sucesso", null, "POST", 200);
                return res.status(200).send(response);
            }).catch((error) => {
                return res.status(500).send(error);
            })
        }).catch((error) => {
            return res.status(500).send(error);
        });
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/deletar-aviso", login, validateBody(schemas.deleteWarning), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        functions.executeSQL(`SELECT aviso_igreja_id_criador FROM avisos_igreja WHERE id_aviso_igreja = ?`, [req.body.id_aviso])
        .then((results) => {
            const isCreator = results.length > 0 && Number(results[0].aviso_igreja_id_criador) === Number(req.usuario.id_usuario);
            
            if (!isCreator && !_permissions.hasPermission(permission, "warnings.delete")) {
                return res.status(401).send("Acesso negado");
            }

            _churchService.deleteWarning(req.body.id_igreja, req.body.id_aviso).then(() => {
                let response = functions.createResponse("Aviso removido com sucesso", null, "POST", 200);
                return res.status(200).send(response);
            }).catch((error) => {
                return res.status(500).send(error);
            })
        }).catch((error) => {
            return res.status(500).send(error);
        });
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/ultimo-aviso", login, validateBody(schemas.churchId), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.returnLatestWarning(req.usuario.id_usuario, req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno do último aviso da igreja", results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-avisos", login, validateBody(schemas.churchId), (req, res, next) => {
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

router.post("/curtir-aviso", login, validateBody(schemas.likeWarning), (req, res, next) => {
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

router.post("/permissao", login, validateBody(schemas.churchId), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((results) => {
        let response = functions.createResponse("Retorno das permissões", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/envia-convite", login, validateBody(schemas.sendInvite), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.invite")) {
            return res.status(401).send("Acesso negado");
        }
        
        _churchService.sendInvite(req.body.id_igreja, req.body.id_usuario, req.usuario.id_usuario, req.body.email_usuario).then(() => {
            let response = functions.createResponse("Convite enviado", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-convites-pendentes", login, validateBody(schemas.churchId), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.invite")) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.returnPendingInvites(req.body.id_igreja).then((results) => {
            let response = functions.createResponse("Retorno dos convites pendentes", results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/deletar-convite", login, validateBody(schemas.deleteInvite), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.invite")) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.deleteInvite(req.body.id_igreja, req.body.id_convite).then(() => {
            let response = functions.createResponse("Convite cancelado com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/adicionar-funcao", login, validateBody(schemas.addFunction), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.roles")) {
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

router.post("/remover-membro", login, validateBody(schemas.removeMember), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (req.body.id_usuario == req.usuario.id_usuario) {
            let response = functions.createResponse("Você não pode sair da igreja que você é o dono", null, "POST", 401);

            return res.status(401).send(response);
        }

        if (!_permissions.hasPermission(permission, "members.remove")) {
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

router.post("/cadastrar-igreja", login, validateBody(schemas.createChurch), (req, res, next) => {
    if (!requireAppAdministrator(req, res)) {
        return;
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

        // Busca a imagem antiga para excluir do S3
        _churchService.returnChurch(req.params.id_igreja).then((churchObj) => {
            const oldUrl = churchObj.imagem_igreja || "";
            const oldKey = oldUrl.split("/").pop();
            if (oldKey && !oldUrl.includes("church-default-image.jpg")) {
                uploadConfig.deleteFromS3(oldKey).catch(e => console.log("Erro ao deletar imagem antiga do S3:", e));
            }
        }).catch(e => console.log("Erro ao buscar dados da igreja antiga:", e));

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

router.post("/cadastrar-evento", login, validateBody(schemas.createEvent), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "events.create")) {
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

router.post("/atualizar-evento/:id_evento", login, validateParams(schemas.eventParams), validateBody(schemas.createEvent), (req, res, next) => {
    _permissions.canEditEvent(req.params.id_evento, req.body.id_igreja, req.usuario.id_usuario).then((canEdit) => {
        if (!canEdit) {
            return res.status(401).send("Acesso negado");
        }

        _churchService.updateEvent(req.params.id_evento, req.body.id_igreja, req.body.event_date, req.body.event_name, req.body.event_members, req.body.event_musics).then(() => {
            let response = functions.createResponse("Evento atualizado com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-eventos", login, validateBody(schemas.churchId), (req, res, next) => {
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

router.post("/eventos/comentarios/criar", login, validateBody(schemas.eventComment), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then(() => {
        _permissions.eventBelongsToChurch(req.body.id_evento, req.body.id_igreja).then((belongsToChurch) => {
            if (!belongsToChurch) {
                return res.status(404).send("Evento nao encontrado");
            }

            _permissions.isEventParticipantOrCreator(req.body.id_evento, req.usuario.id_usuario).then((canComment) => {
                if (!canComment) {
                    return res.status(401).send("Apenas o criador e participantes do evento podem comentar");
                }

                _churchService.postEventComment(req.body.mensagem, req.usuario.id_usuario, req.body.id_evento, req.body.parent_id).then(() => {
                    let response = functions.createResponse("Comentario criado com sucesso", null, "POST", 200);
                    return res.status(200).send(response);
                }).catch((error) => {
                    return res.status(500).send(error);
                })
            }).catch((error) => {
                return res.status(401).send(error);
            })
        }).catch((error) => {
            return res.status(401).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/eventos/comentarios/retorna", login, validateBody(schemas.eventComments), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then(() => {
        _permissions.eventBelongsToChurch(req.body.id_evento, req.body.id_igreja).then((belongsToChurch) => {
            if (!belongsToChurch) {
                return res.status(404).send("Evento nao encontrado");
            }

            _churchService.returnEventComments(req.body.id_evento, req.usuario.id_usuario).then((results) => {
                let response = functions.createResponse("Retorno dos comentarios do evento", results, "POST", 200);
                return res.status(200).send(response);
            }).catch((error) => {
                return res.status(500).send(error);
            })
        }).catch((error) => {
            return res.status(401).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/eventos/comentarios/like", login, validateBody(schemas.likeEventComment), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then(() => {
        _permissions.eventBelongsToChurch(req.body.id_evento, req.body.id_igreja).then((belongsToChurch) => {
            if (!belongsToChurch) {
                return res.status(404).send("Evento nao encontrado");
            }

            _churchService.likeEventComment(req.body.id_aviso, req.usuario.id_usuario).then(() => {
                let response = functions.createResponse("Curtida no comentario do evento feita com sucesso", null, "POST", 200);
                return res.status(200).send(response);
            }).catch((error) => {
                return res.status(500).send(error);
            })
        }).catch((error) => {
            return res.status(401).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/eventos/comentarios/editar", login, validateBody(schemas.updateEventComment), (req, res, next) => {
    functions.executeSQL(`SELECT id_usuario FROM comentarios_eventos WHERE id = ?`, [req.body.id_comentario])
    .then((results) => {
        const isOwner = results.length > 0 && Number(results[0].id_usuario) === Number(req.usuario.id_usuario);
        if (!isOwner) {
            return res.status(401).send("Acesso negado");
        }

        functions.executeSQL(`UPDATE comentarios_eventos SET mensagem = ? WHERE id = ?`, [req.body.mensagem, req.body.id_comentario])
        .then(() => {
            let response = functions.createResponse("Comentário do evento atualizado com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        });
    }).catch((error) => {
        return res.status(500).send(error);
    });
})

router.post("/eventos/comentarios/deletar", login, validateBody(schemas.deleteEventComment), (req, res, next) => {
    functions.executeSQL(`SELECT id_usuario FROM comentarios_eventos WHERE id = ?`, [req.body.id_comentario])
    .then((results) => {
        const isOwner = results.length > 0 && Number(results[0].id_usuario) === Number(req.usuario.id_usuario);
        if (!isOwner) {
            return res.status(401).send("Acesso negado");
        }

        functions.executeSQL(`DELETE FROM curtidas_comentarios_eventos WHERE id_comentario = ?`, [req.body.id_comentario])
        .then(() => {
            functions.executeSQL(`DELETE FROM comentarios_eventos WHERE id = ? OR parent_id = ?`, [req.body.id_comentario, req.body.id_comentario])
            .then(() => {
                let response = functions.createResponse("Comentário do evento removido com sucesso", null, "POST", 200);
                return res.status(200).send(response);
            }).catch((error) => {
                return res.status(500).send(error);
            });
        }).catch((error) => {
            return res.status(500).send(error);
        });
    }).catch((error) => {
        return res.status(500).send(error);
    });
})

router.post("/retorna-evento/:id_evento", login, validateParams(schemas.eventParams), validateBody(schemas.churchId), (req, res, next) => {
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

router.post("/tons_de_musica/:id_musica", login, validateParams(schemas.musicParams), validateBody(schemas.churchId), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        const canUseEventTones =
            _permissions.hasPermission(permission, "events.create") ||
            _permissions.hasPermission(permission, "events.edit");

        if (!canUseEventTones) {
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

router.post("/eventos/membros/anotacoes/criar", login, validateBody(schemas.createMemberNote), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }

        functions.executeSQL(
            `INSERT INTO anotacoes_membros_eventos (id_evento, id_usuario_membro, id_usuario_criador, mensagem) VALUES (?, ?, ?, ?)`,
            [req.body.id_evento, req.body.id_usuario_membro, req.usuario.id_usuario, req.body.mensagem]
        ).then(() => {
            let response = functions.createResponse("Anotação criada com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        });
    }).catch((error) => {
        return res.status(401).send(error);
    });
});

router.post("/eventos/membros/anotacoes/retorna", login, validateBody(schemas.getMemberNotes), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }

        functions.executeSQL(
            `
                SELECT 
                    n.id, 
                    n.id_evento, 
                    n.id_usuario_membro, 
                    n.id_usuario_criador, 
                    n.mensagem, 
                    n.data_criacao,
                    u.nome_usuario,
                    u.imagem_usuario
                FROM 
                    anotacoes_membros_eventos n
                INNER JOIN 
                    usuario u 
                ON 
                    u.id_usuario = n.id_usuario_criador
                WHERE 
                    n.id_evento = ? AND n.id_usuario_membro = ?
                ORDER BY 
                    n.data_criacao DESC
            `,
            [req.body.id_evento, req.body.id_usuario_membro]
        ).then((results) => {
            let response = functions.createResponse("Anotações retornadas com sucesso", results, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        });
    }).catch((error) => {
        return res.status(401).send(error);
    });
});

router.post("/eventos/membros/anotacoes/editar", login, validateBody(schemas.updateMemberNote), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }

        functions.executeSQL(`SELECT id_usuario_criador FROM anotacoes_membros_eventos WHERE id = ?`, [req.body.id_nota])
        .then((results) => {
            const isOwner = results.length > 0 && Number(results[0].id_usuario_criador) === Number(req.usuario.id_usuario);
            if (!isOwner) {
                return res.status(401).send("Acesso negado");
            }

            functions.executeSQL(
                `UPDATE anotacoes_membros_eventos SET mensagem = ? WHERE id = ?`,
                [req.body.mensagem, req.body.id_nota]
            ).then(() => {
                let response = functions.createResponse("Anotação editada com sucesso", null, "POST", 200);
                return res.status(200).send(response);
            }).catch((error) => {
                return res.status(500).send(error);
            });
        }).catch((error) => {
            return res.status(500).send(error);
        });
    }).catch((error) => {
        return res.status(401).send(error);
    });
});

router.post("/eventos/membros/anotacoes/deletar", login, validateBody(schemas.deleteMemberNote), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!permission.administrador && !permission.apenas_membro) {
            return res.status(401).send("Acesso negado");
        }

        functions.executeSQL(`SELECT id_usuario_criador FROM anotacoes_membros_eventos WHERE id = ?`, [req.body.id_nota])
        .then((results) => {
            const isOwner = results.length > 0 && Number(results[0].id_usuario_criador) === Number(req.usuario.id_usuario);
            if (!isOwner) {
                return res.status(401).send("Acesso negado");
            }

            functions.executeSQL(
                `DELETE FROM anotacoes_membros_eventos WHERE id = ?`,
                [req.body.id_nota]
            ).then(() => {
                let response = functions.createResponse("Anotação deletada com sucesso", null, "POST", 200);
                return res.status(200).send(response);
            }).catch((error) => {
                return res.status(500).send(error);
            });
        }).catch((error) => {
            return res.status(500).send(error);
        });
    }).catch((error) => {
        return res.status(401).send(error);
    });
});

module.exports = router;
