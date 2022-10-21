const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const login = require("../middleware/login");
const uploadConfig = require("../config/upload.js");
const functions = require("../functions/functions.js");

router.get("/return_user", login, (req, res, next) => {
    functions.executeSQL("SELECT * FROM usuario WHERE id_usuario = ?", [req.usuario.id_usuario])
    .then((results) => {
        if (results.length <= 0) {
            return res.status(404).send({ error: "Nenhum usuário com esse id foi encontrado" });
        }
        let usuario = {
            id_usuario: results[0].id_usuario,
            nome_usuario: results[0].nome_usuario,
            descricao_usuario: results[0].descricao_usuario,
            imagem_usuario: results[0].imagem_usuario,
            app_owner: results[0].app_owner
        }
        const response = {
            usuario: usuario,
            body: {
                type: "GET",
                message: "Retorno do usuário " + results[0].id_usuario
            }
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/app_administrator", login, (req, res, next) => {
    let response = {
        message: "",
        request: {
            type: "POST",
            status: 0
        }
    }
    if (req.usuario.email_usuario == process.env.APP_ADMINISTRATOR_EMAIL) {
        response.message = "Acesso liberado";
        response.request.status = 200;
        return res.status(200).send(response);
    }
    response.message = "Acesso negado";
    response.request.status = 401;
    return res.status(401).send(response);
})

router.post("/find_users", (req, res, next) => {
    functions.executeSQL(`
        select 
            nome_usuario,
            id_usuario,
            imagem_usuario,
            email_usuario,
            descricao_usuario
        from usuario
        where nome_usuario like '%${req.body.search}%'
    `)
    .then((results) => {
        if (results.length == 0) {
            const fallback = {
                message: "Nenhum usuário encontrado com os critérios informados",
                status: "empty"
            }
            return res.status(202).send(fallback);
        }
        const response = {
            message: "Retorno de todos os usuários pelo critério solicitado",
            status: "Ok",
            lista_de_usuarios: results.map(users => {
                return {
                    nome_usuario: users.nome_usuario,
                    id_usuario: users.id_usuario,
                    imagem_usuario: users.imagem_usuario,
                    email_usuario: users.email_usuario,
                    descricao_usuario: users.descricao_usuario
                }
            })
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
});

router.post("/minhas-igrejas", login, (req, res, next) => {
    functions.executeSQL(`
        SELECT 
            igreja.id_igreja,
            igreja.nome_igreja,
            igreja.imagem_igreja,
            igreja.usuario_administrador,
            CASE
                WHEN ? = igreja.usuario_administrador THEN true
            ELSE
                false
            END as administrador
        FROM 
            igreja
        LEFT JOIN
            metadados
        ON
            metadados.tipo_metadado = 'membro'
        WHERE
            igreja.id_igreja = metadados.metadados_id_igreja 
        AND
            metadados.metadados_id_usuario = ?
        AND
            metadados.confirmacao = 1
    `, 
    [req.usuario.id_usuario, req.usuario.id_usuario, req.usuario.id_usuario])
    .then((results) => {
        
        let response = {
            message: "Retorno de todas as igrejas do usuario " + req.usuario.id_usuario,
            lista_igrejas: results.map(igreja => {
                return {
                    id_igreja: igreja.id_igreja,
                    nome_igreja: igreja.nome_igreja,
                    imagem_igreja: igreja.imagem_igreja,
                    membros: [],
                    quantidade_membros: 0,
                    administrador: igreja.usuario_administrador
                }
            }),
            length: results.length,
            req: {
                type: "POST",
                status: 200
            }
        }
        if (response.lista_igrejas.length == 0) {
            return res.status(200).send(response);
        }
        for (let i = 0; i < response.lista_igrejas.length; i++) {
            functions.returnChurchMembers(response.lista_igrejas[i].id_igreja)
            .then((results2) => {
                response.lista_igrejas[i].membros = results2.object;
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
});

router.post('/cadastro', (req, res, next) => {
    functions.executeSQL('select * from usuario where email_usuario = ?', [req.body.email_usuario])
    .then((results) => {
        if (results.length > 0) {
            return res.status(409).send({message: "Usuário já cadastrado"});
        } else {
            bcrypt.hash(req.body.senha_usuario.toString(), 10, (errBcrypt, hash) => {
                if (errBcrypt) { return res.status(500).send({ error: errBcrypt }) };
                functions.executeSQL('INSERT INTO usuario (nome_usuario, email_usuario, senha_usuario, descricao_usuario, imagem_usuario) VALUES (?, ?, ?, ?, ?)',
                [req.body.nome_usuario, req.body.email_usuario, hash, "", process.env.URL_API + "/public/default-user-image.png"])
                .then((results2) => {
                    const response = {
                        message: "Usuário criado com sucesso",
                        usuario_criado: {
                            id_usuario: results2.insertId,
                            nome_usuario: req.body.nome_usuario,
                            email_usuario: req.body.email_usuario
                        }
                    }
                    return res.status(201).send(response);
                })
                .catch((error2) => {
                    return res.status(500).send({ error: error2 });
                })
            })
        }
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
});

router.post("/login", (req, res, next) => {
    functions.executeSQL('SELECT * FROM usuario WHERE email_usuario = ?', [req.body.email_usuario])
    .then((results) => {
        if (results.length < 1) {
            return res.status(401).send({ message: "Falha na autenticação" });
        }
        bcrypt.compare(req.body.senha_usuario.toString(), results[0].senha_usuario, (errBcrypt, resultBcrypt) => {
            if (errBcrypt) {
                return res.status(401).send({ message: "Falha na autenticação" });
            }
            if (resultBcrypt) {
                const token = jwt.sign({
                    id_usuario: results[0].id_usuario,
                    nome_usuario: results[0].nome_usuario,
                    email_usuario: results[0].email_usuario
                }, process.env.JWT_KEY, {
                    expiresIn: "8h"
                })
                const response = {
                    message: "Autenticado com sucesso",
                    token: token
                }
                return res.status(200).send(response);
            }
            return res.status(401).send({ message: "Falha na autenticação" });
        })
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

router.post("/rejeita-convite", login, (req, res, next) => {
    functions.executeSQL('DELETE FROM metadados WHERE metadados_id_igreja = ? AND metadados_id_usuario = ? AND tipo_metadado = "membro" AND confirmacao = 0', [req.body.id_igreja, req.usuario.id_usuario])
    .then((results) => {
        if (results.length <= 0) {
            let error = {
                message: "Não existem convites para serem excluídos",
                request: {
                    type: "POST",
                    status: 404
                }
            }
            return res.status(404).send(error);
        }
        let response = {
            message: "Convite excluído com sucesso",
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

router.post("/aceita-convite", login, (req, res, next) => {
    functions.executeSQL('UPDATE metadados SET confirmacao = 1, data_confirmacao = CURRENT_TIMESTAMP() WHERE confirmacao = 0 AND tipo_metadado = "membro" AND metadados_id_igreja = ?', [req.body.id_igreja])
    .then((results) => {
        if (results.length <= 0) {
            let error = {
                message: "Não existem convites para serem aceitos",
                request: {
                    type: "POST",
                    status: 404
                }
            }
            return res.status(404).send(error);
        }
        let response = {
            message: "Convite aceito com sucesso",
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

router.get("/retorna-convites", login, (req, res, next) => {
    functions.executeSQL(`
        SELECT
            *
        FROM
            metadados
        INNER JOIN
            igreja
        ON 
            igreja.id_igreja = metadados.metadados_id_igreja
        WHERE
            metadados.metadados_id_usuario = ?
        AND 
            metadados.confirmacao = 0
        AND 
            metadados.tipo_metadado = "membro";
    `, [req.usuario.id_usuario])
    .then((results) => {
        let response = {
            message: "Retorno de todos os convites para entrar em uma igreja",
            object: results.map(invite => {
                return {
                    id_igreja: invite.metadados_id_igreja,
                    nome_igreja: invite.nome_igreja,
                    imagem_igreja: invite.imagem_igreja,
                    id_metadado: invite.id_metadado,
                    confirmacao: invite.confirmacao,
                    tipo_metadado: invite.tipo_metadado
                }
            }),
            request: {
                type: "GET",
                status: 200
            }
        }
        for (let i = 0; i < response.object.length; i++) {
            let current_object = response.object[i];
            functions.returnChurchMembers(current_object.id_igreja, true)
            .then((results2) => {
                current_object.membros = results2.size;
                if (i == response.object.length - 1) {
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

router.post("/update_bio", login, (req, res, next) => {
    functions.executeSQL("UPDATE usuario SET descricao_usuario = ? WHERE id_usuario = ?",
    [req.body.new_bio, req.usuario.id_usuario])
    .then((results) => {
        const response = {
            message: "Biografia alterada com sucesso.",
            new_bio: req.body.new_bio,
            requisition: {
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

router.patch("/remove_image", login, (req, res, next) => {
    functions.executeSQL("SELECT imagem_usuario FROM usuario WHERE id_usuario = ?",
    [req.usuario.id_usuario])
    .then((results) => {
        let photo_url = results[0].imagem_usuario.split("/")[3];
        uploadConfig.deleteFromS3(photo_url);
        functions.executeSQL("update usuario set imagem_usuario = ? where id_usuario = ?",
        [process.env.URL_API + "/public/default-user-image.png", req.usuario.id_usuario])
        .then((results2) => {
            if (results2.changedRows != 0) {
                const response = {
                    id_usuario: "Retorno de usuário " + req.usuario.id_usuario,
                    action: "Imagem excluída com sucesso"
                }
                return res.status(200).send({ response });
            } else {
                return res.status(304).send({ mensagem: "Nenhuma alteração feita" });
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

router.patch("/update_image", login, uploadConfig.upload.single('imagem_usuario'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send({ error: "Tipo de arquivo não suportado" });
    }
    functions.executeSQL("update usuario set imagem_usuario = ? where id_usuario = ?",
    [req.file.location, req.usuario.id_usuario])
    .then((results) => {
        if (results.changedRows != 0) {
            const response = {
                id_usuario: "Retorno do usuario " + req.usuario.user_id,
                profile_photo: req.file.location
            }
            return res.status(200).send(response);
        } else {
            return res.status(404).send({ mensagem: "Nenhum usuario com esse id" });
        }
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
});

router.post("/altera-tag", login, (req, res, next) => {
    functions.executeSQL(`
        SELECT
            *
        FROM
            tags_usuario
        WHERE
            tags_usuario_id_usuario = ?
        AND 
            tags_usuario_id_igreja = ?
    `, [req.body.id_usuario, req.body.id_igreja])
    .then((results) => {
        let response = {
            message: "Tag adicionada com sucesso",
            request: {
                type: "POST",
                status: 200
            }
        }
        if (results.length == 0) {
            functions.executeSQL(`
                INSERT INTO
                    tags_usuario
                    (tags_usuario_id_igreja, tags_usuario_id_usuario, tags_usuario_id_tag_referencia)
                VALUES
                    (?, ?, ?)
            `, [req.body.id_igreja, req.body.id_usuario, req.body.id_tag])
            .then((results2) => {
                return res.status(200).send(response);
            })
            .catch((error2) => {
                return res.status(500).send({ error: error2 });
            })
        } else {
            functions.executeSQL(`
                UPDATE
                    tags_usuario
                SET
                    tags_usuario_id_tag_referencia = ?
                WHERE
                    tags_usuario_id_igreja = ?
                AND
                    tags_usuario_id_usuario = ?
            `, [req.body.id_tag, req.body.id_igreja, req.body.id_usuario])
            .then((results2) => {
                return res.status(200).send(response);
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

router.post("/altera-funcoes", login, (req, res, next) => {
    functions.executeSQL(`
        DELETE FROM
            funcoes_usuario
        WHERE
            id_funcoes_igreja_id_usuario = ?
        AND 
            id_funcoes_igreja_id_igreja = ?
    `, [req.body.id_usuario, req.body.id_igreja])
    .then((results) => {
        let response = {
            message: "Funções adicionada com sucesso",
            request: {
                type: "POST",
                status: 200
            }
        }
        for (let i = 0; i < req.body.new_functions.length; i++) {
            functions.executeSQL(`
                INSERT INTO
                    funcoes_usuario
                    (id_funcoes_igreja_id_igreja, id_funcoes_igreja_id_usuario, id_funcoes_referencia)
                VALUES
                    (?, ?, ?)
            `, [req.body.id_igreja, req.body.id_usuario, req.body.new_functions[i]])
            .then((results2) => {
                if (i == req.body.new_functions.length - 1) {
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

router.post('/check_jwt', login, (req, res, next) => {
    functions.executeSQL("SELECT * FROM usuario WHERE id_usuario = ?",
    [req.usuario.id_usuario])
    .then((results) => {
        let response = {
            message: "Retorno do usuário " + req.usuario.id_usuario,
            requisition: {
                type: "POST",
                status: 200
            }
        }
        if (results.length <= 0) {
            response.message = "Usuário não encontrado";
            response.requisition.status = 404;
            return res.status(404).send(response);
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send({ error: error });
    })
})

module.exports = router;