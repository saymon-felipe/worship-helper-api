const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const functions = require("../functions/functions.js");
const _musicService = require("../services/musicService");
const ciphers = require("../functions/cyphers.js");
const { validateBody, validateParams, validateQuery } = require("../middleware/validate");
const schemas = require("../validations/musicSchemas");
const _permissions = require("../functions/permissions.js");
const _pushNotificationService = require("../services/pushNotificationService");

async function canUseMusicPermission(req, res, permissionKey) {
    if (req.usuario && req.usuario.app_owner) {
        return true;
    }

    const churchId = (req.body && req.body.id_igreja) || (req.query && req.query.id_igreja);
    if (!churchId) {
        res.status(401).send("Acesso negado");
        return false;
    }

    try {
        const permission = await _permissions.checkPermission(req.usuario.id_usuario, churchId);
        if (_permissions.hasPermission(permission, permissionKey)) {
            return true;
        }
    } catch (error) {
        res.status(401).send(error);
        return false;
    }

    res.status(401).send("Acesso negado");
    return false;
}

async function canAccessChurchMusic(req, res) {
    if (req.usuario && req.usuario.app_owner) {
        return true;
    }

    const churchId = (req.body && req.body.id_igreja) || (req.query && req.query.id_igreja);
    if (!churchId) {
        res.status(401).send("Acesso negado");
        return false;
    }

    try {
        const permission = await _permissions.checkPermission(req.usuario.id_usuario, churchId);
        if (permission.administrador || permission.apenas_membro) {
            return true;
        }
    } catch (error) {
        res.status(401).send(error);
        return false;
    }

    res.status(401).send("Acesso negado");
    return false;
}

async function canAccessRequestedMusic(req, res) {
    if (!(await canAccessChurchMusic(req, res))) {
        return false;
    }

    const belongsToChurch = await _musicService.musicBelongsToChurch(req.body.id_musica, req.body.id_igreja);
    if (!belongsToChurch) {
        res.status(404).send("Música não encontrada");
        return false;
    }

    return true;
}

router.post("/procurar", login, validateBody(schemas.search), async (req, res, next) => {
    if (!(await canUseMusicPermission(req, res, "music.create"))) {
        return;
    }

    _musicService.searchMusic(req.body.name, req.body.artist).then((results) => {
        let response = functions.createResponse("Retorno dos vídeos encontrados para a música selecionada", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(error.status || 500).send(error);
    })
})

router.post("/procurar-cifra", login, validateBody(schemas.search), async (req, res, next) => {
    if (!(await canUseMusicPermission(req, res, "music.create"))) {
        return;
    }

    ciphers.scrapeCifraClub(req.body.name, req.body.artist).then((results) => {
        let response = functions.createResponse("Retorno das cifras encontradas no cifra club", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(error.status || 500).send(error);
    })
})

router.post("/", login, validateBody(schemas.create), async (req, res, next) => {
    if (!(await canUseMusicPermission(req, res, "music.create"))) {
        return;
    }

    _musicService.createMusic(req.body.id_igreja, req.body.name, req.body.artist, req.body.video_url, req.body.cipher_url, req.body.cipher_title, req.body.video_image, req.body.music_tags).then(async (music) => {
        const createdMusic = await _musicService.returnMusic(music.id_musica, req.body.id_igreja);
        let response = functions.createResponse("Musica cadastrada com sucesso no banco de dados", createdMusic, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(error.status || 500).send(error.message || error);
    })
})

router.get("/", login, validateQuery(schemas.library), async (req, res, next) => {
    if (!(await canAccessChurchMusic(req, res))) {
        return;
    }

    _musicService.returnMusics(req.query.id_igreja).then((results) => {
        let response = functions.createResponse("Retorno de todas as musicas", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/retorna_musica/:music_id", login, validateParams(schemas.musicParams), validateBody(schemas.returnMusic), async (req, res, next) => {
    if (!(await canAccessChurchMusic(req, res))) {
        return;
    }

    _musicService.returnMusic(req.params.music_id, req.body.id_igreja, req.body.event_id).then((results) => {
        if (!results) {
            return res.status(404).send("Música não encontrada");
        }
        let response = functions.createResponse("Retorno da música " + req.params.music_id, results, "GET", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/comentarios/criar", login, validateBody(schemas.createComment), async (req, res, next) => {
    if (!(await canAccessRequestedMusic(req, res))) {
        return;
    }

    _musicService.postMusicComment(req.body.mensagem, req.usuario.id_usuario, req.body.id_musica, req.body.parent_id).then((comment) => {
        let response = functions.createResponse("Comentario criado com sucesso", comment, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/comentarios/retorna", login, validateBody(schemas.returnComments), async (req, res, next) => {
    if (!(await canAccessRequestedMusic(req, res))) {
        return;
    }

    _musicService.returnMusicComments(req.body.id_musica, req.usuario.id_usuario).then((results) => {
        let response = functions.createResponse("Retorno dos comentários da música", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/comentarios/like", login, validateBody(schemas.likeComment), async (req, res, next) => {
    if (!(await canAccessRequestedMusic(req, res))) {
        return;
    }

    _musicService.likeComment(req.body.id_aviso, req.usuario.id_usuario).then(() => {
        let response = functions.createResponse("Curtida no comentário da música feita com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.post("/comentarios-evento/criar", login, validateBody(schemas.createEventMusicComment), async (req, res, next) => {
    try {
        await _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja);

        const eventHasMusic = await _musicService.eventHasMusic(req.body.id_evento, req.body.id_musica, req.body.id_igreja);
        if (!eventHasMusic) {
            return res.status(404).send("Música não encontrada neste evento");
        }

        const canComment = await _permissions.isEventParticipant(req.body.id_evento, req.usuario.id_usuario);
        if (!canComment) {
            return res.status(401).send("Apenas participantes do evento podem comentar");
        }

        const comment = await _musicService.postEventMusicComment(req.body.mensagem, req.usuario.id_usuario, req.body.id_musica, req.body.id_evento, req.body.parent_id);
        _pushNotificationService.notifyEventMusicComment({
            eventId: req.body.id_evento,
            musicId: req.body.id_musica,
            actorId: req.usuario.id_usuario,
            message: req.body.mensagem
        }).catch((error) => console.error("[Push] Falha ao notificar comentario da musica no evento:", error.message));
        let response = functions.createResponse("Comentário da música no evento criado com sucesso", comment, "POST", 200);
        return res.status(200).send(response);
    } catch (error) {
        return res.status(500).send(error);
    }
})

router.post("/comentarios-evento/retorna", login, validateBody(schemas.returnEventMusicComments), async (req, res, next) => {
    try {
        await _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja);

        const eventHasMusic = await _musicService.eventHasMusic(req.body.id_evento, req.body.id_musica, req.body.id_igreja);
        if (!eventHasMusic) {
            return res.status(404).send("Música não encontrada neste evento");
        }

        const results = await _musicService.returnEventMusicComments(req.body.id_musica, req.body.id_evento, req.usuario.id_usuario);
        let response = functions.createResponse("Retorno dos comentários da música no evento", results, "POST", 200);
        return res.status(200).send(response);
    } catch (error) {
        return res.status(500).send(error);
    }
})

router.post("/comentarios-evento/like", login, validateBody(schemas.likeEventMusicComment), async (req, res, next) => {
    try {
        await _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja);

        const eventHasMusic = await _musicService.eventHasMusic(req.body.id_evento, req.body.id_musica, req.body.id_igreja);
        if (!eventHasMusic) {
            return res.status(404).send("Música não encontrada neste evento");
        }

        const isParticipant = await _permissions.isEventParticipant(req.body.id_evento, req.usuario.id_usuario);
        if (!isParticipant) {
            return res.status(401).send("Apenas participantes do evento podem curtir comentários");
        }

        await _musicService.likeEventMusicComment(req.body.id_aviso, req.usuario.id_usuario);
        let response = functions.createResponse("Curtida no comentário da música no evento feita com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    } catch (error) {
        return res.status(500).send(error);
    }
})

router.post("/comentarios-evento/editar", login, validateBody(schemas.updateEventMusicComment), async (req, res, next) => {
    try {
        await _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja);

        const eventHasMusic = await _musicService.eventHasMusic(req.body.id_evento, req.body.id_musica, req.body.id_igreja);
        if (!eventHasMusic) {
            return res.status(404).send("Música não encontrada neste evento");
        }

        const isParticipant = await _permissions.isEventParticipant(req.body.id_evento, req.usuario.id_usuario);
        if (!isParticipant) {
            return res.status(401).send("Apenas participantes do evento podem editar comentários");
        }

        await _musicService.updateEventMusicComment(req.body.id_comentario, req.usuario.id_usuario, req.body.mensagem);
        let response = functions.createResponse("Comentário da música no evento atualizado com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    } catch (error) {
        return res.status(error === "Acesso negado" ? 401 : 500).send(error);
    }
})

router.post("/comentarios-evento/deletar", login, validateBody(schemas.deleteEventMusicComment), async (req, res, next) => {
    try {
        await _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja);

        const eventHasMusic = await _musicService.eventHasMusic(req.body.id_evento, req.body.id_musica, req.body.id_igreja);
        if (!eventHasMusic) {
            return res.status(404).send("Música não encontrada neste evento");
        }

        const isParticipant = await _permissions.isEventParticipant(req.body.id_evento, req.usuario.id_usuario);
        if (!isParticipant) {
            return res.status(401).send("Apenas participantes do evento podem excluir comentários");
        }

        await _musicService.deleteEventMusicComment(req.body.id_comentario, req.usuario.id_usuario);
        let response = functions.createResponse("Comentário da música no evento removido com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    } catch (error) {
        return res.status(error === "Acesso negado" ? 401 : 500).send(error);
    }
})

router.post("/comentarios/editar", login, validateBody(schemas.updateMusicComment), async (req, res, next) => {
    if (!(await canAccessRequestedMusic(req, res))) {
        return;
    }

    functions.executeSQL(`SELECT id_usuario FROM comentarios_musica WHERE id = ?`, [req.body.id_comentario])
    .then((results) => {
        const isOwner = results.length > 0 && Number(results[0].id_usuario) === Number(req.usuario.id_usuario);
        if (!isOwner) {
            return res.status(401).send("Acesso negado");
        }

        functions.executeSQL(`UPDATE comentarios_musica SET mensagem = ? WHERE id = ?`, [req.body.mensagem, req.body.id_comentario])
        .then(() => {
            let response = functions.createResponse("Comentário da música atualizado com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        });
    }).catch((error) => {
        return res.status(500).send(error);
    });
})

router.post("/comentarios/deletar", login, validateBody(schemas.deleteMusicComment), async (req, res, next) => {
    if (!(await canAccessRequestedMusic(req, res))) {
        return;
    }

    functions.executeSQL(`SELECT id_usuario FROM comentarios_musica WHERE id = ?`, [req.body.id_comentario])
    .then((results) => {
        const isOwner = results.length > 0 && Number(results[0].id_usuario) === Number(req.usuario.id_usuario);
        if (!isOwner) {
            return res.status(401).send("Acesso negado");
        }

        functions.executeSQL(`DELETE FROM curtidas_comentarios_musicas WHERE id_comentario = ?`, [req.body.id_comentario])
        .then(() => {
            functions.executeSQL(`DELETE FROM comentarios_musica WHERE id = ? OR parent_id = ?`, [req.body.id_comentario, req.body.id_comentario])
            .then(() => {
                let response = functions.createResponse("Comentário da música removido com sucesso", null, "POST", 200);
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

router.get("/tags", login, (req, res, next) => {
    _musicService.returnMusicTagsList().then((results) => {
        let response = functions.createResponse("Retorno da lista de tags de musicas", results, "GET", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.delete("/:music_id", login, validateParams(schemas.musicParams), async (req, res, next) => {
    if (!(await canUseMusicPermission(req, res, "music.delete"))) {
        return;
    }

    _musicService.deleteMusic(req.params.music_id, req.body.id_igreja).then(() => {
        let response = functions.createResponse("Musica excluida com sucesso", null, "DELETE", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error.message || error);
    })
})

router.post("/editar-cifra/:music_id", login, validateParams(schemas.musicParams), validateBody(schemas.updateCipher), async (req, res, next) => {
    if (!(await canUseMusicPermission(req, res, "music.cifra.edit"))) {
        return;
    }

    _musicService.updateCipher(req.params.music_id, req.body.id_igreja, req.body.cipher_text).then(() => {
        let response = functions.createResponse("Cifra atualizada com sucesso no banco de dados", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error.message || error);
    });
});

module.exports = router;

