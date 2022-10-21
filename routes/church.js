const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;
const login = require("../middleware/login");
const multer = require("multer");
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const uploadConfig = require("../config/upload.js");
const functions = require("../functions/functions.js");
const { LambdaFunctionConfigurationFilterSensitiveLog } = require('@aws-sdk/client-s3');


router.get("/listar-igrejas", login, (req, res, next) => {
    if (req.usuario.email_usuario != process.env.APP_ADMINISTRATOR_EMAIL) {
        return res.status(401).send({ message: "Você não tem autorização para listar as igrejas" });
    }
    
    functions.executeSQL(`
        SELECT
            igreja.id_igreja,
            igreja.nome_igreja,
            igreja.imagem_igreja,
            igreja.usuario_administrador,
            CASE
                WHEN usuario.id_usuario = igreja.usuario_administrador THEN true
            ELSE
                false
            END as administrador
        FROM
            igreja
        LEFT JOIN
            usuario
        ON usuario.id_usuario = igreja.usuario_administrador`)
    .then((results) => {
        let response;
        if (results.length == 0) {
            response.lista_igrejas = [];
            response.message = "Nenhuma igreja cadastrada"
        }
        response = {
            message: "Retorno de todas as igrejas cadastradas no app",
            lista_igrejas: results.map(igreja => {
                return {
                    id_igreja: igreja.id_igreja,
                    nome_igreja: igreja.nome_igreja,
                    imagem_igreja: igreja.imagem_igreja,
                    usuario_administrador: {
                        id_usuario: igreja.id_usuario,
                        nome_usuario: igreja.nome_usuario,
                        descricao_usuario: igreja.descricao_usuario,
                        app_owner: igreja.app_owner,
                        imagem_usuario: igreja.imagem_usuario
                    },
                    administrador: igreja.administrador
                }
            }),
            length: results.length,
            request: {
                type: "GET",
                status: 200
            }
        }
        for (let i = 0; i < response.lista_igrejas.length; i++) {
            functions.returnChurchMembers(response.lista_igrejas[i].id_igreja, true)
            .then((results2) => {
                response.lista_igrejas[i].quantidade_membros = results2.size;
                if (i == response.lista_igrejas.length - 1) {
                    return res.status(200).send(response);
                }
            })
            .catch((error2) => {
                return res.status(500).send({ error: error2 });
            })
        }
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/criar-tag", login, (req, res, next) => {
    functions.executeSQL(`
        INSERT INTO
            tags_igreja
            (tags_id_igreja, nome_tag, tipo_tag)
        VALUES
            (?, ?, "membros")
    `,
    [req.body.id_igreja, req.body.new_tag])
    .then((results) => {
        let response = {
            message: "Tag criada com sucesso",
            request: {
                type: "POST",
                status: 200
            }
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/deletar-tag", login, (req, res, next) => {
    functions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then(() => {
        functions.executeSQL(`
            DELETE FROM
                tags_igreja
            WHERE
                tags_igreja.id_tag = ?
        `,
        [req.body.id_tag])
        .then((results) => {
            let response = {
                message: "Tag removida com sucesso",
                request: {
                    type: "POST",
                    status: 200
                }
            }
            return res.status(200).send(response);
        })
        .catch((error2) => {
            return res.status(500).send({ error: error2 });
        })
    })
    .catch((error) => {
        return res.status(401).send(error);
    })

    
})

router.post("/retorna-tags", login, (req, res, next) => {
    functions.executeSQL(`
        SELECT
            *
        FROM
            tags_igreja
        WHERE
            tags_id_igreja = ?
    `,
    [req.body.id_igreja])
    .then((results) => {
        let response = {
            message: "Nenhuma tag para essa igreja foi encontrada",
            lista_tags: [],
            request: {
                type: "POST",
                status: 404
            }
        }
        if (results.length <= 0) {
            return res.status(404).send(response);
        }
        response.message = "Retorno das tags da igreja " + req.body.id_igreja;
        response.lista_tags = results;
        response.request.status = 200;
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/criar-funcao", login, (req, res, next) => {
    functions.executeSQL(`
        INSERT INTO
            funcoes_igreja
            (id_funcoes_igreja_id_igreja, nome_funcao, tipo_funcao)
        VALUES
            (?, ?, "membros")
    `,
    [req.body.id_igreja, req.body.new_function])
    .then((results) => {
        let response = {
            message: "Função criada com sucesso",
            request: {
                type: "POST",
                status: 200
            }
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/deletar-funcao", login, (req, res, next) => {
    functions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then(() => {
        functions.executeSQL(`
            DELETE FROM
                funcoes_igreja
            WHERE
                id_funcoes_igreja = ?
        `,
        [req.body.id_function])
        .then((results) => {
            let response = {
                message: "Função removida com sucesso",
                request: {
                    type: "POST",
                    status: 200
                }
            }
            return res.status(200).send(response);
        })
        .catch((error2) => {
            return res.status(500).send({ error: error2 });
        })
    })
    .catch((error) => {
        return res.status(401).send(error);
    })

    
})

router.post("/retorna-funcoes", login, (req, res, next) => {
    functions.executeSQL(`
        SELECT
            *
        FROM
            funcoes_igreja
        WHERE
            id_funcoes_igreja_id_igreja = ?
    `,
    [req.body.id_igreja])
    .then((results) => {
        let response = {
            message: "Nenhuma função para essa igreja foi encontrada",
            lista_funcoes: [],
            request: {
                type: "POST",
                status: 404
            }
        }
        if (results.length <= 0) {
            return res.status(404).send(response);
        }
        response.message = "Retorno das funções da igreja " + req.body.id_igreja;
        response.lista_funcoes = results.map((currentFunction) => {
            return {
                id_funcao: currentFunction.id_funcoes_igreja,
                id_igreja: currentFunction.id_funcoes_id_igreja,
                nome_funcao: currentFunction.nome_funcao
            }
        });
        response.request.status = 200;
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/retorna-igreja", login, (req, res, next) => {
    functions.executeSQL(`
        SELECT
            *
        FROM
            igreja
        WHERE 
            id_igreja = ?`,
        [req.body.id_igreja])
    .then((results) => {
        if (results.length <= 0) {
            const error = {
                message: "Nenhuma igreja com esse id foi encontrada.",
                request: {
                    type: "POST",
                    status: 404
                }
            }
            return res.status(404).send(error);
        }
        let response = {
            message: "Retorno da igreja de id " + req.body.id_igreja,
            igreja: {
                id_igreja: results[0].id_igreja,
                nome_igreja: results[0].nome_igreja,
                imagem_igreja: results[0].imagem_igreja,
                usuario_administrador: results[0].usuario_administrador,
                membros: {},
                quantidade_membros: 0
            }
        }
        functions.returnChurchMembers(results[0].id_igreja)
        .then((results2) => {
            response.igreja.membros = results2.object;
            response.igreja.quantidade_membros = results2.size;
            return res.status(200).send(response);
        })
        .catch((error2) => {
            return res.status(500).send({ error: error2 });
        })
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/publicar-aviso", login, (req, res, next) => {
    functions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then(() => {
        if (req.body.mensagem.length > 100) {
            let error = {
                mensagem: "Mensagem é muito grande, limite de 100 caracteres",
                request: {
                    type: "POST",
                    status: 500
                }
            }
            return res.status(500).send(error);
        }
        functions.executeSQL(`
            INSERT INTO
                avisos_igreja
                (aviso_igreja_id_igreja, aviso_igreja_mensagem, aviso_igreja_id_criador, aviso_igreja_data_criacao)
            VALUES
                (?, ?, ?, CURRENT_TIMESTAMP())
        `, [req.body.id_igreja, req.body.mensagem, req.usuario.id_usuario])
        .then((results) => {
            let response = {
                message: "Aviso criado com sucesso",
                request: {
                    type: "POST",
                    status: 200
                }
            }
            if (results.affectedRows <= 0) {
                response.message = "Não foi possível publicar o aviso";
                response.status = 500;
                return res.status(500).send(response);
            }
            return res.status(200).send(response);
        })
    })
    .catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/retorna-avisos", login, (req, res, next) => {
    functions.executeSQL(`
        SELECT
            *,
            (
                SELECT
                    count(*)
                FROM 
                    metadados
                WHERE
                    tipo_metadado = 'curtida_aviso'
                AND
                    confirmacao = 1
                AND
                    id_objeto = ai.id_aviso_igreja
            ) as quantidade_curtidas,
            CASE WHEN (
                SELECT
                    count(*)
                FROM 
                    metadados
                WHERE
                    tipo_metadado = 'curtida_aviso'
                AND
                    confirmacao = 1
                AND
                    id_objeto = ai.id_aviso_igreja
                AND
                    metadados_id_usuario = ?
            ) 
            THEN 1 ELSE 0
            END as current_user_liked
        FROM
            avisos_igreja ai
        INNER JOIN
            usuario u
        ON
            ai.aviso_igreja_id_criador = u.id_usuario
        WHERE
            ai.aviso_igreja_id_igreja = ?
        AND
            ai.aviso_igreja_data_criacao > DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY);
    `, [req.usuario.id_usuario, req.body.id_igreja])
    .then((results) => {
        let response = {
            message: "Retorno dos avisos dessa igreja",
            avisos: results.map((warning) => {
                return {
                    id_aviso: warning.id_aviso_igreja,
                    id_igreja: warning.aviso_igreja_id_igreja,
                    mensagem: warning.aviso_igreja_mensagem,
                    data_criacao: warning.aviso_igreja_data_criacao,
                    quantidade_curtidas: warning.quantidade_curtidas,
                    usuario_atual_curtiu: warning.current_user_liked,
                    criador: {
                        id_usuario: warning.id_usuario,
                        nome_usuario: warning.nome_usuario,
                        imagem_usuario: warning.imagem_usuario
                    }
                }
            })
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/curtir-aviso", login, (req, res, next) => {
    functions.insertMetadata("curtida_aviso", "CURRENT_TIMESTAMP()", "curtida_aviso", req.body.id_igreja, req.usuario.id_usuario, req.body.id_aviso, 1)
    .then((results) => {
        let response = {
            message: "Aviso foi curtido com sucesso",
            request: {
                type: "POST",
                status: 200
            }
        }
        if (results.affectedRows <= 0) {
            response.message = "Ocorreu um erro ao curtir o aviso";
            response.status = 500;
            return res.status(500).send(response);
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/permissao-gerenciar", login, (req, res, next) => {
    functions.checkPermission(req.usuario.id_usuario, req.body.id_igreja).then((response) => {
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/envia-convite", login, (req, res, next) => {
    if (req.body.id_usuario == req.usuario.id_usuario) {
        let response = {
            message: "Você não pode se auto convidar para entrar em uma igreja",
            request: {
                type: "POST",
                status: 401
            }
        }
        return res.status(401).send(response);
    }
    functions.executeSQL("SELECT * FROM metadados WHERE metadados_id_igreja = ? AND metadados_id_usuario = ?", [req.body.id_igreja, req.body.id_usuario])
    .then((results) => {
        if (results.length > 0) {
            let response = {
                message: "Você não pode enviar um convite para quem já é membro",
                request: {
                    type: "POST",
                    status: 401
                }
            }
            return res.status(401).send(response);
        }
        functions.executeSQL("INSERT INTO metadados (tipo_metadado, data_criacao, nome_metadado, metadados_id_igreja, metadados_id_usuario, confirmacao) VALUES ('membro', CURRENT_TIMESTAMP(), 'membro', ?, ?, 0)", [req.body.id_igreja, req.body.id_usuario])
        .then((results2) => {
            const response = {
                message: "Convite enviado",
                request: {
                    type: "POST",
                    status: 200
                }
            }
            return res.status(200).send(response);
        })
        .catch((error2) => {
            return res.status(500).send({ error: error2 });
        })
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/adicionar-funcao", login, (req, res, next) => {
    functions.checkPermission(req.usuario.id_usuario, req.body.id_igreja)
    .then((response) => {
        functions.insertMetadata("funcaoUsuario", "", req.body.novaFuncao, req.body.id_igreja, req.usuario.id_usuario, 0, 0)
            .then((results2) => {
                let response = {
                    message: "Função adicionada com sucesso",
                    request: {
                        type: "POST",
                        status: 200
                    }
                }
                if (results2.affectedRows > 0) {
                    return res.status(200).send(response);
                }
                response.message = "Não foi possível adicionar a função ao usuário",
                response.request.status = 500;
                return res.status(500).send(response);
            })
            .catch((error2) => {
                return res.status(500).send({ error: error2 });
            })
    })
    .catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/remover-membro", login, (req, res, next) => {
    functions.checkPermission(req.usuario.id_usuario, req.body.id_igreja)
    .then((response) => {
        if (req.body.id_usuario == req.usuario.id_usuario) {
            let error = {
                message: "Você não pode sair da igreja que você é o dono",
                request: {
                    type: "POST",
                    status: 401
                }
            }
            return res.status(401).send(error);
        }
        functions.executeSQL(`
            DELETE FROM
                metadados
            WHERE
                tipo_metadado = "membro"
            AND
                confirmacao = 1
            AND
                metadados_id_igreja = ?
            AND
                metadados_id_usuario = ?`,
        [req.body.id_igreja, req.body.id_usuario])
        .then((results2) => {
            let response = {
                message: "Usuário removido com sucesso",
                request: {
                    type: "POST",
                    status: 200
                }
            }
            return res.status(200).send(response);
        })
        .catch((error2) => {
            return res.status(500).send({ error: error2 });
        })
    })
    .catch((error) => {
        return res.status(401).send(error);
    })
})

router.post("/cadastrar-igreja", login, (req, res, next) => {
    if (req.usuario.email_usuario != process.env.APP_ADMINISTRATOR_EMAIL) {
        return res.status(401).send({ message: "Você não tem autorização para cadastrar uma igreja" });
    }
    functions.executeSQL(`
        INSERT INTO igreja
            (nome_igreja, usuario_administrador, imagem_igreja)
        VALUES
            (?, ?, ?)
    `, [req.body.nome_igreja, req.body.usuario_administrador, process.env.URL_API + "/public/church-default-image.jpg"])
    .then((results) => {
        functions.insertMetadata("membro", "CURRENT_TIMESTAMP()", "membro", results.insertId, req.body.usuario_administrador, 0, 1)
            .then((results2) => {})
            .catch((error2) => {
                console.log(error2)
            })
        const response = {
            message: "Igreja cadastrada com sucesso",
            igreja_cadastrada: {
                id_igreja: results.insertId,
                nome_igreja: req.body.nome_igreja,
                usuario_administrador: req.body.usuario_administrador
            },
            req: {
                type: "POST",
                status: 200
            }
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.patch("/church-image/:id_igreja", login, uploadConfig.upload.single('church_image'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send({ error: "Tipo de arquivo não suportado" });
    }

    functions.executeSQL("SELECT usuario_administrador FROM igreja WHERE id_igreja = ?", [req.params.id_igreja])
    .then((results) => {
        if (results != req.usuario.id_usuario) {
            return res.status(401).send({ error: "Você não tem autorização para alterar a foto dessa igreja" });
        }
        functions.executeSQL("UPDATE igreja SET imagem_igreja = ? WHERE id_igreja = ?", [req.file.location, req.params.id_igreja])
        .then((results2) => {
            if (results2.changedRows != 0) {
                const response = {
                    id_igreja: "Retorno da igreja " + req.params.id_igreja,
                    profile_photo: req.file.location
                }
                return res.status(200).send(response);
            } else {
                return res.status(404).send({ mensagem: "Nenhuma igreja com esse id" });
            }
        })
        .catch((error2) => {
            return res.status(500).send({ error: error2 });
        })
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
});

module.exports = router;