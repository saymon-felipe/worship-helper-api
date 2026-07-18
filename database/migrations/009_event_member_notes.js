async function up(query) {
    await query(`
        CREATE TABLE IF NOT EXISTS anotacoes_membros_eventos (
            id INT NOT NULL AUTO_INCREMENT,
            id_evento INT NOT NULL,
            id_usuario_membro INT NOT NULL,
            id_usuario_criador INT NOT NULL,
            mensagem TEXT NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_anotacoes_membros_eventos_evento (id_evento),
            KEY idx_anotacoes_membros_eventos_membro (id_usuario_membro),
            KEY idx_anotacoes_membros_eventos_criador (id_usuario_criador),
            CONSTRAINT fk_anotacoes_membros_eventos_evento
                FOREIGN KEY (id_evento) REFERENCES eventos (id) ON DELETE CASCADE,
            CONSTRAINT fk_anotacoes_membros_eventos_membro
                FOREIGN KEY (id_usuario_membro) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
            CONSTRAINT fk_anotacoes_membros_eventos_criador
                FOREIGN KEY (id_usuario_criador) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

module.exports = {
    up
};
