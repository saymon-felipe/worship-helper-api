async function columnExists(query, table, columnName) {
    const results = await query(
        `
            SELECT COUNT(1) AS total
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = ?
            AND column_name = ?
        `,
        [table, columnName]
    );

    return results[0].total > 0;
}

async function constraintExists(query, table, constraintName) {
    const results = await query(
        `
            SELECT COUNT(1) AS total
            FROM information_schema.table_constraints
            WHERE table_schema = DATABASE()
            AND table_name = ?
            AND constraint_name = ?
        `,
        [table, constraintName]
    );

    return results[0].total > 0;
}

async function up(query) {
    if (!(await columnExists(query, "convites_membros_igreja", "id_funcao_igreja"))) {
        await query("ALTER TABLE convites_membros_igreja ADD COLUMN id_funcao_igreja INT NULL");
    }

    // Se a funcao for excluida antes do convite ser aceito, o convite continua valido, apenas sem cargo pre-definido.
    if (!(await constraintExists(query, "convites_membros_igreja", "fk_convites_funcao_igreja"))) {
        await query(`
            ALTER TABLE convites_membros_igreja
            ADD CONSTRAINT fk_convites_funcao_igreja
            FOREIGN KEY (id_funcao_igreja) REFERENCES funcoes_igreja (id_funcoes_igreja) ON DELETE SET NULL
        `);
    }
}

module.exports = {
    up
};
