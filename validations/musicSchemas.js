const { Joi, id, text } = require("./common");

module.exports = {
    search: Joi.object({
        name: text(50),
        artist: text(50)
    }),
    create: Joi.object({
        name: text(50),
        artist: text(50),
        video_url: Joi.string().trim().max(100).required(),
        cipher_url: Joi.string().trim().max(500).allow("").required(),
        cipher_title: Joi.string().trim().max(255).allow("").default(""),
        video_image: Joi.string().trim().max(500).required(),
        music_tags: Joi.array().items(Joi.object({
            id
        }).unknown(true)).required()
    }),
    musicParams: Joi.object({
        music_id: id
    }),
    returnMusic: Joi.object({
        event_id: Joi.number().integer().min(0).default(0)
    }),
    createComment: Joi.object({
        id_musica: id,
        mensagem: text(100)
    }),
    returnComments: Joi.object({
        id_musica: id
    }),
    likeComment: Joi.object({
        id_aviso: id
    })
};

