const PUSH_NOTIFICATION_MESSAGES = Object.freeze({
    EVENT_CREATED: Object.freeze({
        title: "Novo evento",
        body: (eventName) => "Voce foi adicionado ao evento " + eventName + "."
    }),
    CHURCH_WARNING: Object.freeze({
        title: "Novo aviso da igreja",
        body: (message) => message
    }),
    EVENT_COMMENT: Object.freeze({
        title: (eventName) => "Novo comentario no evento " + eventName,
        body: (message) => message
    }),
    EVENT_MUSIC_COMMENT: Object.freeze({
        title: (musicName) => "Novo comentario na música " + musicName,
        body: (message) => message
    }),
    INVITE_ACCEPTED: Object.freeze({
        title: "Convite aceito",
        body: (memberName, churchName) => memberName + " entrou na igreja " + churchName + "."
    })
});

module.exports = PUSH_NOTIFICATION_MESSAGES;
