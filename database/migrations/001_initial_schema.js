const musicTags = [
    "pop",
    "rock",
    "sertanejo",
    "congregacional",
    "contemporaneo",
    "pentecostal",
    "jovem",
    "rap",
    "instrumental",
    "country",
    "corinho",
    "reggae",
    "funk",
    "infantil",
    "eletronica",
    "Latina"
];

const tones = [
    ["C", "maior"],
    ["C#", "maior"],
    ["D", "maior"],
    ["D#", "maior"],
    ["E", "maior"],
    ["F", "maior"],
    ["F#", "maior"],
    ["G", "maior"],
    ["G#", "maior"],
    ["A", "maior"],
    ["A#", "maior"],
    ["B", "maior"],
    ["Cm", "menor"],
    ["C#m", "menor"],
    ["Dm", "menor"],
    ["Ebm", "menor"],
    ["Em", "menor"],
    ["Fm", "menor"],
    ["F#m", "menor"],
    ["Gm", "menor"],
    ["G#m", "menor"],
    ["Am", "menor"],
    ["Bbm", "menor"],
    ["Bm", "menor"]
];

async function up(query) {
    await query(`
        CREATE TABLE IF NOT EXISTS usuario (
            id_usuario INT NOT NULL AUTO_INCREMENT,
            nome_usuario VARCHAR(50) NOT NULL,
            email_usuario VARCHAR(100) NOT NULL,
            senha_usuario VARCHAR(500) NOT NULL,
            descricao_usuario VARCHAR(50) NOT NULL DEFAULT '',
            app_owner TINYINT(1) NOT NULL DEFAULT 0,
            imagem_usuario VARCHAR(500) NOT NULL DEFAULT '',
            PRIMARY KEY (id_usuario),
            UNIQUE KEY uk_usuario_email (email_usuario)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS igreja (
            id_igreja INT NOT NULL AUTO_INCREMENT,
            nome_igreja VARCHAR(50) NOT NULL,
            imagem_igreja VARCHAR(500) NOT NULL DEFAULT '',
            usuario_administrador INT NOT NULL,
            PRIMARY KEY (id_igreja),
            KEY idx_igreja_usuario_administrador (usuario_administrador),
            CONSTRAINT fk_igreja_usuario_administrador
                FOREIGN KEY (usuario_administrador) REFERENCES usuario (id_usuario)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS membros_igreja (
            id INT NOT NULL AUTO_INCREMENT,
            id_igreja INT NOT NULL,
            id_usuario INT NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_membros_igreja_usuario (id_igreja, id_usuario),
            KEY idx_membros_igreja_usuario (id_usuario),
            CONSTRAINT fk_membros_igreja_igreja
                FOREIGN KEY (id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE,
            CONSTRAINT fk_membros_igreja_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS convites_membros_igreja (
            id INT NOT NULL AUTO_INCREMENT,
            id_igreja INT NOT NULL,
            id_usuario_requisitado INT NOT NULL,
            id_usuario_requisitante INT NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            data_confirmacao DATETIME NULL,
            PRIMARY KEY (id),
            KEY idx_convites_igreja (id_igreja),
            KEY idx_convites_usuario_requisitado (id_usuario_requisitado),
            KEY idx_convites_usuario_requisitante (id_usuario_requisitante),
            CONSTRAINT fk_convites_igreja
                FOREIGN KEY (id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE,
            CONSTRAINT fk_convites_usuario_requisitado
                FOREIGN KEY (id_usuario_requisitado) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
            CONSTRAINT fk_convites_usuario_requisitante
                FOREIGN KEY (id_usuario_requisitante) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS tags_igreja (
            id_tag INT NOT NULL AUTO_INCREMENT,
            tags_id_igreja INT NOT NULL,
            nome_tag VARCHAR(50) NOT NULL,
            tipo_tag VARCHAR(50) NOT NULL DEFAULT 'membros',
            PRIMARY KEY (id_tag),
            KEY idx_tags_igreja_igreja (tags_id_igreja),
            CONSTRAINT fk_tags_igreja_igreja
                FOREIGN KEY (tags_id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS tags_usuario (
            id_tag_usuario INT NOT NULL AUTO_INCREMENT,
            tags_usuario_id_igreja INT NOT NULL,
            tags_usuario_id_usuario INT NOT NULL,
            tags_usuario_id_tag_referencia INT NOT NULL,
            PRIMARY KEY (id_tag_usuario),
            UNIQUE KEY uk_tags_usuario (tags_usuario_id_igreja, tags_usuario_id_usuario),
            KEY idx_tags_usuario_tag (tags_usuario_id_tag_referencia),
            CONSTRAINT fk_tags_usuario_igreja
                FOREIGN KEY (tags_usuario_id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE,
            CONSTRAINT fk_tags_usuario_usuario
                FOREIGN KEY (tags_usuario_id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
            CONSTRAINT fk_tags_usuario_tag
                FOREIGN KEY (tags_usuario_id_tag_referencia) REFERENCES tags_igreja (id_tag) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS funcoes_igreja (
            id_funcoes_igreja INT NOT NULL AUTO_INCREMENT,
            id_funcoes_igreja_id_igreja INT NOT NULL,
            nome_funcao VARCHAR(50) NOT NULL,
            tipo_funcao VARCHAR(50) NOT NULL DEFAULT 'membros',
            PRIMARY KEY (id_funcoes_igreja),
            KEY idx_funcoes_igreja_igreja (id_funcoes_igreja_id_igreja),
            CONSTRAINT fk_funcoes_igreja_igreja
                FOREIGN KEY (id_funcoes_igreja_id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS funcoes_usuario (
            id_funcoes_usuario INT NOT NULL AUTO_INCREMENT,
            id_funcoes_igreja_id_igreja INT NOT NULL,
            id_funcoes_referencia INT NOT NULL,
            id_funcoes_igreja_id_usuario INT NOT NULL,
            PRIMARY KEY (id_funcoes_usuario),
            UNIQUE KEY uk_funcoes_usuario (id_funcoes_igreja_id_igreja, id_funcoes_igreja_id_usuario, id_funcoes_referencia),
            KEY idx_funcoes_usuario_funcao (id_funcoes_referencia),
            KEY idx_funcoes_usuario_usuario (id_funcoes_igreja_id_usuario),
            CONSTRAINT fk_funcoes_usuario_igreja
                FOREIGN KEY (id_funcoes_igreja_id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE,
            CONSTRAINT fk_funcoes_usuario_funcao
                FOREIGN KEY (id_funcoes_referencia) REFERENCES funcoes_igreja (id_funcoes_igreja) ON DELETE CASCADE,
            CONSTRAINT fk_funcoes_usuario_usuario
                FOREIGN KEY (id_funcoes_igreja_id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS avisos_igreja (
            id_aviso_igreja INT NOT NULL AUTO_INCREMENT,
            aviso_igreja_id_igreja INT NOT NULL,
            aviso_igreja_mensagem VARCHAR(100) NOT NULL,
            aviso_igreja_id_criador INT NOT NULL,
            aviso_igreja_data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id_aviso_igreja),
            KEY idx_avisos_igreja (aviso_igreja_id_igreja),
            KEY idx_avisos_criador (aviso_igreja_id_criador),
            CONSTRAINT fk_avisos_igreja
                FOREIGN KEY (aviso_igreja_id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE,
            CONSTRAINT fk_avisos_criador
                FOREIGN KEY (aviso_igreja_id_criador) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS curtidas_avisos (
            id INT NOT NULL AUTO_INCREMENT,
            id_usuario INT NOT NULL,
            id_aviso INT NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_curtidas_avisos (id_usuario, id_aviso),
            KEY idx_curtidas_avisos_aviso (id_aviso),
            CONSTRAINT fk_curtidas_avisos_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
            CONSTRAINT fk_curtidas_avisos_aviso
                FOREIGN KEY (id_aviso) REFERENCES avisos_igreja (id_aviso_igreja) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS lista_tags_musicas (
            id_tag_musicas INT NOT NULL,
            nome_tag VARCHAR(50) NOT NULL,
            PRIMARY KEY (id_tag_musicas)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS musicas (
            id_musica INT NOT NULL AUTO_INCREMENT,
            nome_musica VARCHAR(50) NOT NULL,
            artista_musica VARCHAR(50) NOT NULL DEFAULT '',
            video_url VARCHAR(100) NOT NULL,
            cifra_url VARCHAR(500) NOT NULL,
            imagem VARCHAR(100) NOT NULL,
            video_id VARCHAR(20) NOT NULL,
            PRIMARY KEY (id_musica),
            KEY idx_video_id (video_id),
            KEY idx_music_informations (nome_musica, artista_musica)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS tags_de_musicas (
            id INT NOT NULL AUTO_INCREMENT,
            tag_id_musica INT NOT NULL,
            id_tag_referencia INT NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_tags_de_musicas (tag_id_musica, id_tag_referencia),
            KEY idx_tags_de_musicas_tag (id_tag_referencia),
            CONSTRAINT fk_tags_de_musicas_musica
                FOREIGN KEY (tag_id_musica) REFERENCES musicas (id_musica) ON DELETE CASCADE,
            CONSTRAINT fk_tags_de_musicas_tag
                FOREIGN KEY (id_tag_referencia) REFERENCES lista_tags_musicas (id_tag_musicas)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS comentarios_musica (
            id INT NOT NULL AUTO_INCREMENT,
            id_musica INT NOT NULL,
            id_usuario INT NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            mensagem VARCHAR(100) NOT NULL,
            PRIMARY KEY (id),
            KEY idx_comentarios_musica (id_musica),
            KEY idx_comentarios_usuario (id_usuario),
            CONSTRAINT fk_comentarios_musica
                FOREIGN KEY (id_musica) REFERENCES musicas (id_musica) ON DELETE CASCADE,
            CONSTRAINT fk_comentarios_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS curtidas_comentarios_musicas (
            id INT NOT NULL AUTO_INCREMENT,
            id_usuario INT NOT NULL,
            id_comentario INT NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_curtidas_comentarios (id_usuario, id_comentario),
            KEY idx_curtidas_comentarios_comentario (id_comentario),
            CONSTRAINT fk_curtidas_comentarios_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
            CONSTRAINT fk_curtidas_comentarios_comentario
                FOREIGN KEY (id_comentario) REFERENCES comentarios_musica (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS tons (
            id INT NOT NULL AUTO_INCREMENT,
            nome VARCHAR(5) NOT NULL,
            tipo VARCHAR(6) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_tons_nome (nome)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS eventos (
            id INT NOT NULL AUTO_INCREMENT,
            nome VARCHAR(50) NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            data_inicio VARCHAR(50) NOT NULL,
            id_criador INT NOT NULL,
            id_igreja INT NOT NULL,
            PRIMARY KEY (id),
            KEY idx_eventos_igreja (id_igreja),
            KEY idx_eventos_criador (id_criador),
            CONSTRAINT fk_eventos_igreja
                FOREIGN KEY (id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE,
            CONSTRAINT fk_eventos_criador
                FOREIGN KEY (id_criador) REFERENCES usuario (id_usuario)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS membros_eventos (
            id INT NOT NULL AUTO_INCREMENT,
            id_usuario INT NOT NULL,
            id_funcao INT NOT NULL,
            id_evento INT NOT NULL,
            PRIMARY KEY (id),
            KEY idx_membros_eventos_usuario (id_usuario),
            KEY idx_membros_eventos_funcao (id_funcao),
            KEY idx_membros_eventos_evento (id_evento),
            CONSTRAINT fk_membros_eventos_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
            CONSTRAINT fk_membros_eventos_funcao
                FOREIGN KEY (id_funcao) REFERENCES funcoes_igreja (id_funcoes_igreja),
            CONSTRAINT fk_membros_eventos_evento
                FOREIGN KEY (id_evento) REFERENCES eventos (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

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

    await query(`
        CREATE TABLE IF NOT EXISTS musicas_eventos (
            id INT NOT NULL AUTO_INCREMENT,
            id_musica INT NOT NULL,
            id_evento INT NOT NULL,
            tom INT NOT NULL,
            PRIMARY KEY (id),
            KEY idx_musicas_eventos_musica (id_musica),
            KEY idx_musicas_eventos_evento (id_evento),
            KEY idx_musicas_eventos_tom (tom),
            CONSTRAINT fk_musicas_eventos_musica
                FOREIGN KEY (id_musica) REFERENCES musicas (id_musica) ON DELETE CASCADE,
            CONSTRAINT fk_musicas_eventos_evento
                FOREIGN KEY (id_evento) REFERENCES eventos (id) ON DELETE CASCADE,
            CONSTRAINT fk_musicas_eventos_tom
                FOREIGN KEY (tom) REFERENCES tons (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS votacoes_musicas_eventos (
            id INT NOT NULL AUTO_INCREMENT,
            id_musica_evento INT NOT NULL,
            id_usuario INT NOT NULL,
            aprova TINYINT(1) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_votacoes_musicas_eventos (id_musica_evento, id_usuario),
            KEY idx_votacoes_usuario (id_usuario),
            CONSTRAINT fk_votacoes_musica_evento
                FOREIGN KEY (id_musica_evento) REFERENCES musicas_eventos (id) ON DELETE CASCADE,
            CONSTRAINT fk_votacoes_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS tons_igreja (
            id INT NOT NULL AUTO_INCREMENT,
            id_tom INT NOT NULL,
            id_igreja INT NOT NULL,
            id_musica INT NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_tons_igreja (id_tom, id_igreja, id_musica),
            KEY idx_tons_igreja_igreja (id_igreja),
            KEY idx_tons_igreja_musica (id_musica),
            CONSTRAINT fk_tons_igreja_tom
                FOREIGN KEY (id_tom) REFERENCES tons (id),
            CONSTRAINT fk_tons_igreja_igreja
                FOREIGN KEY (id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE,
            CONSTRAINT fk_tons_igreja_musica
                FOREIGN KEY (id_musica) REFERENCES musicas (id_musica) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const [index, tag] of musicTags.entries()) {
        await query(
            "INSERT INTO lista_tags_musicas (id_tag_musicas, nome_tag) VALUES (?, ?) ON DUPLICATE KEY UPDATE nome_tag = VALUES(nome_tag)",
            [index + 1, tag]
        );
    }

    for (const [index, tone] of tones.entries()) {
        await query(
            "INSERT INTO tons (id, nome, tipo) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nome = VALUES(nome), tipo = VALUES(tipo)",
            [index + 1, tone[0], tone[1]]
        );
    }
}

module.exports = {
    up
};
