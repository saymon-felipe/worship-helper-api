function isAppAdministrator(user) {
    return Boolean(user && user.app_owner);
}

function denyAppAdministratorAccess(res, message = "Você não tem autorização para executar essa ação") {
    return res.status(403).send({ message });
}

function requireAppAdministrator(req, res) {
    if (!isAppAdministrator(req.usuario)) {
        denyAppAdministratorAccess(res);
        return false;
    }
    return true;
}

module.exports = {
    isAppAdministrator,
    denyAppAdministratorAccess,
    requireAppAdministrator
};
