const { Joi, id, text } = require("./common");

const EVENT_LOCATION_MAX_LENGTH = 255;

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
        id_igreja: id,
        tipo: Joi.string().valid("upcoming", "past", "all").optional()
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
        email_usuario: Joi.string().trim().email().max(100).optional().allow(""),
        id_funcao: Joi.number().integer().positive().optional().allow(null)
    }).or("id_usuario", "email_usuario"),
    editInvite: Joi.object({
        id_igreja: id,
        id_convite: id,
        id_funcao: Joi.number().integer().positive().allow(null).required()
    }),
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
        event_musics: Joi.array().items(eventMusic).min(1).required(),
        // Switch de local do evento: com ele marcado o endereco e obrigatorio; desmarcado, o endereco enviado e descartado.
        // Sem o campo (cliente antigo): o evento e criado sem local e, na edicao, o local atual e mantido.
        tem_local: Joi.boolean(),
        local_evento: Joi.when("tem_local", {
            is: true,
            then: Joi.string().trim().min(1).max(EVENT_LOCATION_MAX_LENGTH).required().messages({
                "any.required": "Informe o local do evento",
                "string.base": "Informe o local do evento",
                "string.empty": "Informe o local do evento",
                "string.min": "Informe o local do evento",
                "string.max": "O local do evento deve ter no máximo " + EVENT_LOCATION_MAX_LENGTH + " caracteres"
            }),
            otherwise: Joi.any().strip()
        }),
        // CEP e pino do mapa fazem parte do local: so valem com o switch marcado e sao sempre opcionais.
        cep_evento: Joi.when("tem_local", {
            is: true,
            then: Joi.string().trim().replace(/-/g, "").pattern(/^\d{8}$/).allow("", null).messages({
                "string.pattern.base": "CEP inválido. Use o formato 00000-000"
            }),
            otherwise: Joi.any().strip()
        }),
        latitude_evento: Joi.when("tem_local", {
            is: true,
            then: Joi.number().min(-90).max(90).allow(null).messages({
                "number.base": "Latitude inválida",
                "number.min": "Latitude inválida",
                "number.max": "Latitude inválida"
            }),
            otherwise: Joi.any().strip()
        }),
        longitude_evento: Joi.when("tem_local", {
            is: true,
            then: Joi.number().min(-180).max(180).allow(null).messages({
                "number.base": "Longitude inválida",
                "number.min": "Longitude inválida",
                "number.max": "Longitude inválida"
            }),
            otherwise: Joi.any().strip()
        })
    }).custom((value, helpers) => {
        const hasLatitude = value.latitude_evento !== undefined && value.latitude_evento !== null;
        const hasLongitude = value.longitude_evento !== undefined && value.longitude_evento !== null;
        return hasLatitude === hasLongitude ? value : helpers.message("Informe latitude e longitude juntas");
    }),
    deleteEvent: Joi.object({
        id_igreja: id
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
