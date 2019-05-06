"use strict";

// -------------------------------------------------------------------------
// Modulos de inicializacao
const fs = require('fs');
const log = require('@serverRoot/helpers/log');
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Carrega arquivo de configuracao
const push = config => {
	try {
		return Object.freeze(JSON.parse(fs.readFileSync(config, 'utf8')));
	} catch(err) {
		throw new Error(err);
	}
};

// Checa arquivo de configuracao por mudancas
const check = config => {
	return new Promise((resolve, reject) => {
		try {
			const readConfig = param => {
				return new Promise((resolve, reject) => {
					try {
						fs.readFile(param, 'utf8', function (err, data) {
							if (err) {
								reject(err);
							} else {
								resolve(data);
							}
						})
					} catch(err) {
						reject(err)
					}
				});
			};

			const deepIsEqual = (first, second) => {
				try {
					if (first === second) return true;

					// Try a quick compare by seeing if the length of properties are the same
					let firstProps = Object.getOwnPropertyNames(first),
						secondProps = Object.getOwnPropertyNames(second);

					// Check different amount of properties
					if (firstProps.length != secondProps.length) return false;

					// Go through properties of first object
					for (let i = 0; i < firstProps.length; i++) {
						let prop = firstProps[i];

						// Check the type of property to perform different comparisons
						switch (typeof(first[prop])) {
						// If it is an object, decend for deep compare
							case 'object':
								if (!deepIsEqual(first[prop], second[prop])) return false;
								break;
							case 'number':
							// with JavaScript NaN != NaN so we need a special check
								if (isNaN(first[prop]) && isNaN(second[prop])) break;
							default:
								if (first[prop] != second[prop]) return false;
						}
					}

					return true;
				} catch(err) {
					throw new Error(err);
				}
			};

			const sleep = (ms) => {
				return new Promise(resolve => setTimeout(resolve, ms));
			};

			let fsDebounce = false;
			const watch = fs.watch(config, async function (event, filename) {
				if (event === 'change') {
					if (fsDebounce) return;
					fsDebounce = setTimeout(() => { fsDebounce = false; }, 100);

					let objCheck1 = __serverConfig,
						objCheck2 = {},
						objCheckIsEqual = true;

					do {
						objCheck2 = JSON.parse(await readConfig(config));
						objCheckIsEqual = deepIsEqual(objCheck1, objCheck2);

						if (!objCheckIsEqual) {
							log.logger('info', 'Arquivo ' + filename + ' foi modificado... Favor corrigir ou reiniciar o servidor!!', 'consoleOnly');
						}

						await sleep(5000);
					} while (!objCheckIsEqual);
				}
			});

			resolve(watch);
		} catch(err) {
			reject(err);
		}
	});
};
// -------------------------------------------------------------------------

module.exports = {
	push,
	check
};