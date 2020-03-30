'use strict';

// -------------------------------------------------------------------------
// Modulos de inicializacao
const multer = require('multer');
const fs = require('fs');
const path = require('path');
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Modulos de apoio
const errWrapper = require('@serverRoot/helpers/errWrapper');
const functions = require('@serverRoot/helpers/functions');
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
/*
Realiza o upload de um ou mais arquivos (POST / enctype: "multipart/form-data")

	-> sempre array de objects para fileNames ou vazio para todos (sem checagem de nomes)
		-> formato para fileNames: [{ name: 'inputFileName1' }, { name: 'inputFileName2' }, { name: 'inputFileName3' }, ...]

	-> extraPath vazio para upload de arquivos direto na pasta default, ou informa pasta(s) extras (default: vazio)

	-> maxFileUploads indica o numero maximo de arquivo permitidos para upload (default: 0 ou ilimitado)

	-> storageToDisk true para diskStorage | false para memoryStorage (default: true)
		-> se memoryStorage selecionado, utilizar Buffer.from(req.files[].buffer, 'utf8') para converter valor da memoria
*/
const push = async (req, res, fileNames, extraPath = '', maxFileUploads = 0, storageToDisk = true) => {
	try {
		const diskStorage = multer.diskStorage({
			destination: (req, file, callback) => {
				try {
					let initPath = __serverRoot,
						configKey = configUpload.path + (extraPath ? `\\${extraPath}` : ''),
						filePath = initPath + configKey;

					fs.access (
						filePath,
						fs.constants.F_OK, // Check if exists
						err => {
							try {
								if (err) {
									functions.removeInvalidFileNameChars(configKey).split(/[\\/]/).forEach(
										e => {
											initPath = path.join(initPath, e);

											if (!fs.existsSync(initPath)) {
												fs.mkdirSync(initPath);
											}
										}
									);
								}

								callback(null, filePath);
							} catch (err) {
								callback(err);
							}
						}
					);
				} catch (err) {
					callback(err);
				}
			},
			filename: (req, file, callback) => {
				try {
					let fileOriginalName = file.originalname,
						findLastDot = fileOriginalName.lastIndexOf('.'),
						dateNow = (new Date()).toISOString().split('T'),
						dateLeft = (dateNow[0] || '').replace(/-/g, ''),
						dateRight = (dateNow[1] || '').replace(/[:]/g, '').substr(0, 6),
						fileName = fileOriginalName.substring(0, (findLastDot !== -1 ? findLastDot : fileOriginalName.length)) + '-' + dateLeft + dateRight + (findLastDot !== -1 ? fileOriginalName.substr(findLastDot) : '');

					callback(null, fileName);
				} catch (err) {
					callback(err);
				}
			}
		});

		const uploadFiles = fileNames => {
			return new Promise((resolve, reject) => {
				try {
					const upload = multer(
						{
							fileFilter: (req, file, callback) => {
								try {
									const checkExtensions = [...new Set((configUpload.allowedExtensions || '').split('|').map(
										item => {
											return item.substr(0, (item.indexOf(':') !== -1 ? item.indexOf(':') : item.length)).trim();
										}
									))].filter(
										item => {
											return item !== '';
										}
									); // O new Set para valores unicos e nao vazios, assim podemos repetir extensoes para eventuais novos MIME Types

									const checkMimeTypes = [...new Set((configUpload.allowedExtensions || '').split('|').map(
										item => {
											return item.substr((item.indexOf(':') !== -1 ? item.indexOf(':') + 1 : '')).trim();
										}
									))].filter(
										item => {
											return item !== '';
										}
									); // O new Set para valores unicos e nao vazios, assim podemos repetir extensoes para eventuais novos MIME Types

									let extName = new RegExp('^(' + checkExtensions.join('|') + '){1}$', 'i').test(path.extname(file.originalname).toLowerCase()),
										mimeType = new RegExp('^(' + checkMimeTypes.join('|') + '){1}$', 'i').test(file.mimetype);

									if (extName && mimeType) {
										return callback(null, true);
									} else {
										callback('Upload de arquivos apenas suporta as seguintes extensões - ' + checkExtensions.join(', ') + ' com seus respectivos MIME Types - ' + checkMimeTypes.join(', ') + '...');
									}
								} catch (err) {
									callback(err);
								}
							},
							storage: (storageToDisk ? diskStorage : multer.memoryStorage()),
							limits: {
								fileSize: (configUpload.maxFileSize || Infinity),
								files: (maxFileUploads || Infinity)
							}
						}
					);

					const result = err => {
						if (err) {
							reject(err);
						} else {
							resolve({ body: { ...req.body }, files: { ...req.files } });
						}
					};

					if (fileNames) {
						upload.fields(fileNames)(req, res,
							err => {
								result(err);
							}
						);
					} else {
						upload.any()(req, res,
							err => {
								result(err);
							}
						);
					}
				} catch (err) {
					reject(err);
				}
			});
		};

		let configUpload = __serverConfig.server.fileUpload,
			method = req.method;

		if (method.toUpperCase() === 'POST') {
			return await uploadFiles(fileNames);
		} else {
			errWrapper.throwThis('UPLOADER', 400, 'Favor utilizar verbo POST para realizar o upload dos arquivos...');
		}
	} catch (err) {
		throw err;
	}
};
// -------------------------------------------------------------------------

module.exports = {
	push
};
