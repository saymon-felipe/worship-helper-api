const { Joi, id, text } = require("./common");

module.exports = {
    search: Joi.object({
        name: text(50),
        artist: Joi.string().trim().max(50).allow("").default(""),
        id_igreja: Joi.number().integer().positive().optional()
    }),
    create: Joi.object({
        name: text(50),
        artist: Joi.string().trim().max(50).allow("").default(""),
        id_igreja: id,
        video_url: Joi.string().trim().max(100).required(),
        cipher_source: Joi.string().valid("cifra_club", "custom_pdf").default("cifra_club"),
        cipher_url: Joi.when("cipher_source", {
            is: "custom_pdf",
            then: Joi.string().trim().max(500).allow("").default(""),
            otherwise: Joi.string().trim().max(500).required()
        }),
        cipher_title: Joi.string().trim().max(255).allow("").default(""),
        cipher_text: Joi.when("cipher_source", {
            is: "custom_pdf",
            then: Joi.string().max(200000).required(),
            otherwise: Joi.string().max(200000).allow("").default("")
        }),
        video_image: Joi.string().trim().max(500).required(),
        music_tags: Joi.array().items(Joi.object({
            id
        }).unknown(true)).required()
    }),
    importCipherPdf: Joi.object({
        id_igreja: id
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
    liveAssistant: Joi.object({
        id_igreja: id,
        id_evento: Joi.number().integer().positive().required(),
        current_music_id: Joi.number().integer().positive().optional(),
        detected_tone: Joi.string().trim().max(12).allow("").default("")
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
