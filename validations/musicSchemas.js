const { Joi, id, text } = require("./common");

module.exports = {
    search: Joi.object({
        name: text(50),
        artist: text(50),
        id_igreja: Joi.number().integer().positive().optional()
    }),
    create: Joi.object({
        name: text(50),
        artist: text(50),
        id_igreja: id,
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
    library: Joi.object({
        id_igreja: id
    }),
    returnMusic: Joi.object({
        id_igreja: id,
        event_id: Joi.number().integer().min(0).default(0)
    }),
    createComment: Joi.object({
        id_igreja: id,
        id_musica: id,
        mensagem: text(100),
        parent_id: Joi.number().integer().min(1).optional().allow(null)
    }),
    returnComments: Joi.object({
        id_igreja: id,
        id_musica: id
    }),
    likeComment: Joi.object({
        id_igreja: id,
        id_musica: id,
        id_aviso: id
    }),
    createEventMusicComment: Joi.object({
        id_igreja: id,
        id_evento: id,
        id_musica: id,
        mensagem: text(100),
        parent_id: Joi.number().integer().min(1).optional().allow(null)
    }),
    returnEventMusicComments: Joi.object({
        id_igreja: id,
        id_evento: id,
        id_musica: id
    }),
    likeEventMusicComment: Joi.object({
        id_igreja: id,
        id_evento: id,
        id_musica: id,
        id_aviso: id
    }),
    updateEventMusicComment: Joi.object({
        id_igreja: id,
        id_evento: id,
        id_musica: id,
        id_comentario: id,
        mensagem: text(100)
    }),
    deleteEventMusicComment: Joi.object({
        id_igreja: id,
        id_evento: id,
        id_musica: id,
        id_comentario: id
    }),
    updateMusicComment: Joi.object({
        id_igreja: id,
        id_musica: id,
        id_comentario: id,
        mensagem: text(100)
    }),
    deleteMusicComment: Joi.object({
        id_igreja: id,
        id_musica: id,
        id_comentario: id
    }),
    updateCipher: Joi.object({
        id_igreja: id,
        cipher_text: Joi.string().required()
    })
};
