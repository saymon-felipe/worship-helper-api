const { Joi, id, text } = require("./common");

module.exports = {
    findUsers: Joi.object({
        search: Joi.string().trim().max(100).allow("").required()
    }),
    register: Joi.object({
        nome_usuario: text(50),
        email_usuario: Joi.string().trim().email().max(100).required(),
        senha_usuario: Joi.string().max(500).required()
    }),
    login: Joi.object({
        email_usuario: Joi.string().trim().email().max(100).required(),
        senha_usuario: Joi.string().max(500).required()
    }),
    churchId: Joi.object({
        id_igreja: id
    }),
    updateBio: Joi.object({
        new_bio: Joi.string().trim().max(50).allow("").required()
    }),
    changeTag: Joi.object({
        id_usuario: id,
        id_igreja: id,
        id_tag: id
    }),
    changeFunctions: Joi.object({
        id_usuario: id,
        id_igreja: id,
        new_functions: Joi.array().items(id).required()
    }),
    checkJwt: Joi.object({
        token: Joi.string().trim().required()
    }),
    pushSubscription: Joi.object({
        subscription: Joi.object({
            endpoint: Joi.string().uri().required(),
            expirationTime: Joi.any().allow(null),
            keys: Joi.object({
                p256dh: Joi.string().required(),
                auth: Joi.string().required()
            }).required()
        }).required()
    }),
    pushUnsubscribe: Joi.object({
        endpoint: Joi.string().uri().required()
    })
};
