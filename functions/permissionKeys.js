const PERMISSION_TREE = {
    "members.manage": [
        "members.invite",
        "members.remove",
        "members.roles",
        "members.tags"
    ],
    "events.manage": [
        "events.create",
        "events.edit"
    ],
    "music.manage": [
        "music.create",
        "music.delete"
    ],
    "warnings.manage": [
        "warnings.create",
        "warnings.edit",
        "warnings.delete"
    ]
};

const PERMISSION_LABELS = [
    { key: "members.manage", label: "Gerenciar membros", parent: null },
    { key: "members.invite", label: "Convidar membros", parent: "members.manage" },
    { key: "members.remove", label: "Remover membros", parent: "members.manage" },
    { key: "members.roles", label: "Alterar cargos", parent: "members.manage" },
    { key: "members.tags", label: "Alterar tags", parent: "members.manage" },
    { key: "events.manage", label: "Gerenciar eventos", parent: null },
    { key: "events.create", label: "Criar eventos", parent: "events.manage" },
    { key: "events.edit", label: "Editar eventos", parent: "events.manage" },
    { key: "music.manage", label: "Gerenciar musicas", parent: null },
    { key: "music.create", label: "Cadastrar musicas", parent: "music.manage" },
    { key: "music.delete", label: "Remover musicas", parent: "music.manage" },
    { key: "warnings.manage", label: "Gerenciar avisos", parent: null },
    { key: "warnings.create", label: "Publicar avisos", parent: "warnings.manage" },
    { key: "warnings.edit", label: "Editar avisos", parent: "warnings.manage" },
    { key: "warnings.delete", label: "Remover avisos", parent: "warnings.manage" }
];

function expandPermissions(permissions) {
    const expanded = new Set(Array.isArray(permissions) ? permissions : []);
    let changed = true;

    while (changed) {
        changed = false;
        for (const [parent, children] of Object.entries(PERMISSION_TREE)) {
            if (!expanded.has(parent)) {
                continue;
            }

            children.forEach((child) => {
                if (!expanded.has(child)) {
                    expanded.add(child);
                    changed = true;
                }
            });
        }
    }

    return [...expanded];
}

function parsePermissions(value) {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.filter((permission) => PERMISSION_LABELS.some((item) => item.key === permission));
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
            ? parsed.filter((permission) => PERMISSION_LABELS.some((item) => item.key === permission))
            : [];
    } catch {
        return [];
    }
}

const ALL_PERMISSIONS = expandPermissions(PERMISSION_LABELS.map((permission) => permission.key));

function getPermissionParent(permissionKey) {
    const permission = PERMISSION_LABELS.find((item) => item.key === permissionKey);
    return permission ? permission.parent : null;
}

module.exports = {
    ALL_PERMISSIONS,
    PERMISSION_LABELS,
    PERMISSION_TREE,
    expandPermissions,
    getPermissionParent,
    parsePermissions
};
