// Historico de e-mails disparados pela API. Guarda so metadados (template, titulo, destinatario, status),
// nunca o HTML nem links/tokens do corpo da mensagem.
async function up(query) {
    await query(`
        CREATE TABLE IF NOT EXISTS emails_enviados (
            id INT NOT NULL AUTO_INCREMENT,
            template VARCHAR(60) NOT NULL,
            titulo VARCHAR(255) NOT NULL,
            destinatario VARCHAR(255) NOT NULL,
            status ENUM('enviado', 'falha') NOT NULL,
            message_id VARCHAR(255) NULL,
            erro VARCHAR(500) NULL,
            id_igreja INT NULL,
            id_convite INT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_emails_enviados_convite (id_convite),
            KEY idx_emails_enviados_destinatario (destinatario, data_criacao),
            KEY idx_emails_enviados_status (status, data_criacao)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

module.exports = { up };
