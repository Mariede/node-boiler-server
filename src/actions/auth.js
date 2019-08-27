'use strict';

// -------------------------------------------------------------------------
// Modulos de inicializacao
const dbCon = require('@serverRoot/helpers/db');
const auth = require('@serverRoot/helpers/auth');
const cryptoHash = require('@serverRoot/helpers/cryptoHash');
const validator = require('@serverRoot/helpers/validator');
const errWrapper = require('@serverRoot/helpers/errWrapper');
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Acoes

// Permite acesso as rotas protegidas, analise das permissoes em um segundo momento
const logon = async (req, res) => {
	try {
		let sess = req.session,
			sessWraper = __serverConfig.auth.sessWrapper;

		if (typeof sess[sessWraper] === 'object') {
			errWrapper.throwThis('AUTH', 400, 'Usuário já logado...');
		} else {
			let login = req.body.login,
				pass = req.body.pass;

			if (!validator.isEmpty(login)) {
				if (!validator.isEmpty(pass)) { // Inicia a sessao
					const query = {
						formato: 1,
						dados: {
							executar: `
								SELECT
									A.ID_USUARIO
									,A.ID_TIPO
									,A.NOME
									,A.EMAIL
									,A.SENHA
									,A.SALT
									,A.ATIVO
									,B.TIPO
								FROM
									USUARIO A (NOLOCK)
									INNER JOIN TIPO B (NOLOCK)
										ON (A.ID_TIPO = B.ID_TIPO)
								WHERE
									A.EMAIL = '${login}';
							`
						}
					};

					let resultSet = await dbCon.msSqlServer.sqlExecuteAll(query),
						dataUser = resultSet && resultSet.recordset.length === 1 && resultSet.recordset[0],
						passInfo = (dataUser ? await cryptoHash.hash(pass, dataUser.SALT) : undefined);

					if (passInfo && (passInfo.passHash === dataUser.SENHA)) {
						if (dataUser.ATIVO) {
							sess[sessWraper] = {};

							/* Session data */
							sess[sessWraper].id = dataUser.ID_USUARIO;
							sess[sessWraper].idTipo = dataUser.ID_TIPO;
							sess[sessWraper].nome = dataUser.NOME;
							sess[sessWraper].email = dataUser.EMAIL;
							sess[sessWraper].tipo = dataUser.TIPO;
							/* Session data */
						} else {
							errWrapper.throwThis('AUTH', 400, 'Usuário inativo...');
						}
					} else {
						errWrapper.throwThis('AUTH', 400, 'Usuário e/ou senha inválidos...');
					}
				} else {
					errWrapper.throwThis('AUTH', 400, 'Favor preencher a senha...');
				}
			} else {
				errWrapper.throwThis('AUTH', 400, 'Favor preencher o usuário...');
			}
		}

		return sess[sessWraper];
	} catch(err) {
		throw err;
	}
};

// Finaliza a sessao no servidor, rotas protegidas ficam inascessiveis
const logout = (req, res) => {
	return new Promise((resolve, reject) => {
		try {
			let sess = req.session,
				fRet = false;

			if (sess) {
				sess.destroy();
				res.cookie(__serverConfig.server.session.cookieName, '', { expires: new Date() });

				fRet = true;
			}

			resolve(fRet);
		} catch(err) {
			reject(err);
		}
	});
};

// Verifica se a sessao esta ativa
const isLogged = async (req, res) => {
	try {
		let resultType = req.query.result_type,
			fRet = await auth.isLogged(req, resultType);
		return fRet;
	} catch(err) {
		throw err;
	}
};
// -------------------------------------------------------------------------

module.exports = {
	logon,
	logout,
	isLogged
};
