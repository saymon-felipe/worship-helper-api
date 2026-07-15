/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

async function up(query) {
    await query(`
        CREATE TABLE IF NOT EXISTS leads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            telefone VARCHAR(50) NULL,
            origem VARCHAR(50) NOT NULL COMMENT 'site_contato | app_cadastro',
            tipo_equipe VARCHAR(100) NULL,
            nome_igreja VARCHAR(255) NULL,
            data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

module.exports = {
    up
};
