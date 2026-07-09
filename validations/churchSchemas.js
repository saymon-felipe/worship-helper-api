const { Joi, id, text } = require("./common");

const eventMember = Joi.object({
    id_usuario: id,
    id_funcao: id
}).unknown(true);

const eventMusic = Joi.object({
    id: id,
    tone: Joi.object({
        id
    }).required()
}).unknown(true);

module.exports = {
    churchId: Joi.object({
        id_igreja: id
    }),
    tag: Joi.object({
        id_igreja: id,
        nome: text(50)
    }),
    deleteTag: Joi.object({
        id_igreja: id,
        id_tag: id
    }),
    churchFunction: Joi.object({
        id_igreja: id,
        nome: text(50)
    }),
    deleteFunction: Joi.object({
        id_igreja: id,
        id_function: id
    }),
    warning: Joi.object({
        id_igreja: id,
        mensagem: text(100)
    }),
    likeWarning: Joi.object({
        id_igreja: id,
        id_aviso: id
    }),
    sendInvite: Joi.object({
        id_igreja: id,
        id_usuario: id
    }),
    addFunction: Joi.object({
        id_igreja: id,
        novaFuncao: text(50)
    }),
    removeMember: Joi.object({
        id_igreja: id,
        id_usuario: id
    }),
    createChurch: Joi.object({
        nome_igreja: text(50),
        usuario_administrador: id
    }),
    createEvent: Joi.object({
        id_igreja: id,
        event_date: Joi.string().trim().max(50).required(),
        event_name: text(15),
        event_members: Joi.array().items(eventMember).min(1).required(),
        event_musics: Joi.array().items(eventMusic).min(1).required()
    }),
    eventParams: Joi.object({
        id_evento: id
    }),
    musicParams: Joi.object({
        id_musica: id
    })
};
