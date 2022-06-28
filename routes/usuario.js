const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/cadastro', (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select * from usuario where email_usuario = ?', [req.body.email_usuario],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) }
                if (results.length > 0) {
                    conn.release();
                    return res.status(409).send({message: "Usuário já cadastrado"});
                } else {
                    bcrypt.hash(req.body.senha_usuario.toString(), 10, (errBcrypt, hash) => {
                        if (errBcrypt) { return res.status(500).send({ error: errBcrypt }) };
                        conn.query('INSERT INTO usuario (nome_usuario, email_usuario, senha_usuario, descricao_usuario) VALUES (?, ?, ?, ?)',
                        [req.body.nome_usuario, req.body.email_usuario, hash, ""],
                            (err2, results2) => {
                                conn.release();
                                if (err2) { return res.status(500).send({ error: err2 }) };
                                const response = {
                                    message: "Usuário criado com sucesso",
                                    usuario_criado: {
                                        id_usuario: results2.insertId,
                                        nome_usuario: req.body.nome_usuario,
                                        email_usuario: req.body.email_usuario
                                    }
                                }
                                return res.status(201).send(response);
                            }
                        )
                    })
                }
            }
        )
    });
});

router.post("/login", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('SELECT * FROM usuario WHERE email_usuario = ?',
        [req.body.email_usuario],
            (err, results) => {
                conn.release();
                if (err) { return res.status(500).send({ error: err }) };
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
            }
        )
    })
})

module.exports = router;