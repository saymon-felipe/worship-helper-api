const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const _usuarioService = require("../services/usuarioService");
const uploadConfig = require("../config/upload.js");
const functions = require("../functions/functions.js");
const _permissions = require("../functions/permissions.js");
const { validateBody } = require("../middleware/validate");
const schemas = require("../validations/usuarioSchemas");
const { requireAppAdministrator } = require("../functions/authClaims");
const _pushNotificationService = require("../services/pushNotificationService");
const _emailService = require("../services/emailService");
const _webAuthnService = require("../services/webAuthnService");
router.get("/return_user", login, (req, res, next) => {
    _usuarioService.returnUser(req.usuario.id_usuario).then((results) => {
        let response = functions.createResponse("Retorno do usuário " + results.id_usuario, results, "GET", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})
router.post("/app_administrator", login, (req, res, next) => {
    if (!requireAppAdministrator(req, res)) {
        return;
    }

    let response = functions.createResponse("Acesso liberado", null, "GET", 200);
    return res.status(200).send(response);
})
router.post("/find_users", validateBody(schemas.findUsers), (req, res, next) => {
    _usuarioService.findUsers(req.body.search).then((results) => {
        let response = functions.createResponse("Retorno de todos os usuários pelo critério solicitado", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});
router.post("/minhas-igrejas", login, (req, res, next) => {
    _usuarioService.myChurches(req.usuario.id_usuario).then((results) => {
        let response = functions.createResponse("Retorno de todas as igrejas do usuário " + req.usuario.id_usuario, results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});
router.post('/cadastro', validateBody(schemas.register), (req, res, next) => {
    _usuarioService.register(req.body.nome_usuario, req.body.email_usuario, req.body.senha_usuario).then((results) => {
        let response = functions.createResponse("Usuário criado com sucesso", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});
router.post("/login", validateBody(schemas.login), (req, res, next) => {
    _usuarioService.login(req.body.email_usuario, req.body.senha_usuario).then((results) => {
        let response = functions.createResponse("Autenticado com sucesso", results, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        const isAuthenticationFailure = message.toLowerCase().includes("falha na autentica");
        return res.status(isAuthenticationFailure ? 401 : 500).send(message);
    })
})
router.post("/esqueci-senha", validateBody(schemas.requestPasswordReset), async (req, res) => {
    try {
        const resetRequest = await _usuarioService.createPasswordResetToken(req.body.email_usuario);
        if (resetRequest) {
            await _emailService.sendPasswordReset({
                to: resetRequest.email_usuario,
                userName: resetRequest.nome_usuario,
                token: resetRequest.token
            });
        }

        const response = functions.createResponse(
            "Se houver uma conta com este e-mail, enviaremos um link para redefinir sua senha.",
            null,
            "POST",
            200
        );
        return res.status(200).send(response);
    } catch (error) {
        return res.status(500).send({ error: "Não foi possível enviar o e-mail de redefinição. Tente novamente." });
    }
});
router.post("/redefinir-senha", validateBody(schemas.resetPassword), async (req, res) => {
    try {
        await _usuarioService.resetPassword(req.body.email_usuario, req.body.token, req.body.senha_usuario);
        const response = functions.createResponse("Senha redefinida com sucesso. Faça login com sua nova senha.", null, "POST", 200);
        return res.status(200).send(response);
    } catch (error) {
        return res.status(400).send({ error: error.message || "Não foi possível redefinir a senha." });
    }
});
router.post("/biometria/registro/opcoes", login, async (req, res) => {
    try {
        const options = await _webAuthnService.registrationOptions(req.usuario.id_usuario);
        return res.status(200).send(functions.createResponse("Opções de biometria geradas", options, "POST", 200));
    } catch (error) {
        return res.status(400).send({ error: error.message || "Não foi possível iniciar a biometria." });
    }
});
router.post("/biometria/registro/verificar", login, validateBody(schemas.biometricCredential), async (req, res) => {
    try {
        await _webAuthnService.verifyRegistration(req.usuario.id_usuario, req.body.credential);
        return res.status(200).send(functions.createResponse("Biometria ativada neste dispositivo", null, "POST", 200));
    } catch (error) {
        return res.status(400).send({ error: error.message || "Não foi possível ativar a biometria." });
    }
});
router.get("/biometria/status", login, async (req, res) => {
    try {
        const hasCredential = await _webAuthnService.hasCredentials(req.usuario.id_usuario);
        return res.status(200).send(functions.createResponse("Status da biometria retornado", { hasCredential }, "GET", 200));
    } catch (error) {
        return res.status(400).send({ error: error.message || "Não foi possível consultar a biometria." });
    }
});
router.delete("/biometria", login, async (req, res) => {
    try {
        await _webAuthnService.removeCredentials(req.usuario.id_usuario);
        return res.status(200).send(functions.createResponse("Biometria desativada com sucesso", null, "DELETE", 200));
    } catch (error) {
        return res.status(400).send({ error: error.message || "Não foi possível desativar a biometria." });
    }
});
router.post("/biometria/login/opcoes", validateBody(schemas.biometricEmail), async (req, res) => {
    try {
        const options = await _webAuthnService.authenticationOptions(req.body.email_usuario);
        return res.status(200).send(functions.createResponse("Opções de biometria geradas", options, "POST", 200));
    } catch (error) {
        return res.status(400).send({ error: error.message || "Biometria não disponível." });
    }
});
router.post("/biometria/login/verificar", validateBody(schemas.biometricAuthentication), async (req, res) => {
    try {
        const userId = await _webAuthnService.verifyAuthentication(req.body.email_usuario, req.body.credential);
        const token = await _usuarioService.issueTokenForUser(userId);
        return res.status(200).send(functions.createResponse("Autenticado com biometria", token, "POST", 200));
    } catch (error) {
        return res.status(400).send({ error: error.message || "Não foi possível validar a biometria." });
    }
});
router.post("/rejeita-convite", login, validateBody(schemas.churchId), (req, res, next) => {
    _usuarioService.rejectInvite(req.body.id_igreja, req.usuario.id_usuario).then(() => {
        let response = functions.createResponse("Convite excluído com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})
router.post("/aceita-convite", login, validateBody(schemas.churchId), (req, res, next) => {
    _usuarioService.acceptInvite(req.body.id_igreja, req.usuario.id_usuario).then((invite) => {
        _pushNotificationService.notifyInviteAccepted({
            churchId: req.body.id_igreja,
            memberId: req.usuario.id_usuario,
            inviterId: invite.id_usuario_requisitante
        }).catch((error) => console.error("[Push] Falha ao notificar convite aceito:", error.message));

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
router.post("/update_bio", login, validateBody(schemas.updateBio), (req, res, next) => {
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
router.post("/altera-tag", login, validateBody(schemas.changeTag), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.tags")) {
            return res.status(401).send("Acesso negado");
        }

        _usuarioService.changeTag(req.body.id_usuario, req.body.id_igreja, req.body.id_tag).then(() => {
            let response = functions.createResponse("Tag adicionada com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})
router.post("/altera-funcoes", login, validateBody(schemas.changeFunctions), (req, res, next) => {
    _permissions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((permission) => {
        if (!_permissions.hasPermission(permission, "members.roles")) {
            return res.status(401).send("Acesso negado");
        }

        _usuarioService.newFunctions(req.body.id_usuario, req.body.id_igreja, req.body.new_functions).then(() => {
            let response = functions.createResponse("Funções adicionadas com sucesso", null, "POST", 200);
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }).catch((error) => {
        return res.status(401).send(error);
    })
})
router.post('/refresh_jwt', login, (req, res, next) => {
    _usuarioService.refreshJwt(req.usuario.id_usuario).then((results) => {
        let returnObj = {
            newToken: results
        }
        let response = functions.createResponse("JWT renovado com sucesso", returnObj, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})
router.post('/check_jwt', login, validateBody(schemas.checkJwt), (req, res, next) => {
    _usuarioService.refreshJwt(req.usuario.id_usuario).then((results) => {
        let returnObj = {
            newToken: results
        }
        let response = functions.createResponse("JWT renovado com sucesso", returnObj, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})
router.get("/push/public-key", login, (req, res, next) => {
    try {
        const response = functions.createResponse("Chave publica de notificacoes", {
            publicKey: _pushNotificationService.getPublicKey()
        }, "GET", 200);
        return res.status(200).send(response);
    } catch (error) {
        return res.status(503).send({ error: error.message });
    }
})
router.post("/push/subscription", login, validateBody(schemas.pushSubscription), (req, res, next) => {
    _pushNotificationService.saveSubscription(req.usuario.id_usuario, req.body.subscription).then(() => {
        const response = functions.createResponse("Notificacoes ativadas neste dispositivo", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send({ error: error.message || error });
    })
})
router.post("/push/unsubscribe", login, validateBody(schemas.pushUnsubscribe), (req, res, next) => {
    _pushNotificationService.removeSubscription(req.usuario.id_usuario, req.body.endpoint).then(() => {
        const response = functions.createResponse("Notificacoes removidas deste dispositivo", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send({ error: error.message || error });
    })
})
module.exports = router;
