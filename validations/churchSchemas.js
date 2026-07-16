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
        nome: text(50),
        permissoes: Joi.array().items(Joi.string().trim().max(60)).optional().default([])
    }),
    updateChurchFunction: Joi.object({
        id_igreja: id,
        id_function: id,
        nome: text(50),
        permissoes: Joi.array().items(Joi.string().trim().max(60)).optional().default([])
    }),
    deleteFunction: Joi.object({
        id_igreja: id,
        id_function: id
    }),
    warning: Joi.object({
        id_igreja: id,
        mensagem: text(100),
        parent_id: Joi.number().integer().min(1).optional().allow(null)
    }),
    likeWarning: Joi.object({
        id_igreja: id,
        id_aviso: id
    }),
    updateWarning: Joi.object({
        id_igreja: id,
        id_aviso: id,
        mensagem: text(100)
    }),
    deleteWarning: Joi.object({
        id_igreja: id,
        id_aviso: id
    }),
    eventComment: Joi.object({
        id_igreja: id,
        id_evento: id,
        mensagem: text(280),
        parent_id: Joi.number().integer().min(1).optional().allow(null)
    }),
    eventComments: Joi.object({
        id_igreja: id,
        id_evento: id
    }),
    likeEventComment: Joi.object({
        id_igreja: id,
        id_evento: id,
        id_aviso: id
    }),
    sendInvite: Joi.object({
        id_igreja: id,
        id_usuario: Joi.number().integer().positive().optional().allow(null),
        email_usuario: Joi.string().trim().email().max(100).optional().allow("")
    }).or("id_usuario", "email_usuario"),
    deleteInvite: Joi.object({
        id_igreja: id,
        id_convite: id
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
    }),
    updateEventComment: Joi.object({
        id_igreja: id,
        id_comentario: id,
        mensagem: text(280)
    }),
    deleteEventComment: Joi.object({
        id_igreja: id,
        id_comentario: id
    }),
    createMemberNote: Joi.object({
        id_igreja: id,
        id_evento: id,
        id_usuario_membro: id,
        mensagem: text(1000)
    }),
    getMemberNotes: Joi.object({
        id_igreja: id,
        id_evento: id,
        id_usuario_membro: id
    }),
    updateMemberNote: Joi.object({
        id_igreja: id,
        id_nota: id,
        mensagem: text(1000)
    }),
    deleteMemberNote: Joi.object({
        id_igreja: id,
        id_nota: id
    })
};
