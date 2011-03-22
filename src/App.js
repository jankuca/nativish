var App = Function.inherit(function (params) {
	this._params = params || {};
}, {
	'run': function () {
		var app = this;

		var startup = function () {
			var root = app._params.root,
				cv = (root instanceof Array) ? root[0] : root,
				params = (root instanceof Array) ? root[1] || {} : {};

			document.body.innerHTML = '';
			document.body.appendChild(app.window.getElement());

			app._queue = new OperationQueue('_queue');

			app.request(cv, params);
		};

		if (this.MODE !== 'online' && typeof this._params.db === 'string' && window.openDatabase !== undefined) {
			this.MODE = 'offline';

			var createStateTable = function () {
				app.db.transaction(function (tx) {
					tx.executeSql("CREATE TABLE [_state] ([key], [value])", [],
						function (tx) {
							tx.executeSql("INSERT INTO [_state] ([key], [value]) VALUES (?, ?)", ['last_migration', -1], function (tx, result) {
								app._dbMigrate(-1, startup);
							});
						},
						function (tx, error) {
							throw error;
						}
					);
				});
			};

			this.db = window.openDatabase(this._params.db, '1.0', this._params.db_title, this._params.db_size);

			this.db.transaction(function (tx) {
				tx.executeSql("SELECT [value] FROM [_state] WHERE [key] = ?", ['last_migration'], function (tx, result) {
					if (result.rows.length === 0) {
						// this should never happen
						tx.executeSql("INSERT INTO [_state] ([key], [value]) VALUES (?, ?)", ['last_migration', -1], function () {
							app._dbMigrate(-1, startup);
						});
					} else {
						app._dbMigrate(parseInt(result.rows.item(0).value), startup);
					}
				}, function (tx, error) {
					createStateTable();
				});
			});
		} else {
			this.MODE = 'online';
			startup();
		}
	},

	'request': function (cv, params) {
		params = (typeof params === 'object') ? params : Array.prototype.slice.call(arguments, 1);
		cv = cv.split(':');
		
		var name = cv[0].charAt(0).toUpperCase() + cv[0].substr(1) + 'Controller';
		if (typeof window[name] === 'function') {
			var controller = new window[name]();
			if (typeof controller[cv[1]] === 'function') {
				controller[cv[1]](params);
			} else {
				alert('404 (Action)');
			}
		} else {
			alert('404 (Controller)');
		}
	},

	'queue': function (op, callback) {
		this._queue.push(op, callback);
	},

	'setMigrations': function (migrations) {
		if (migrations instanceof Array === false) {
			throw new Error('Invalid input (migrations)');
		}

		this._migrations = migrations;
	},

	'_dbMigrate': function (last_migration, callback) {
		if (this._migrations === undefined) {
			throw 'No migration file provided';
		}

		var app = this,
			m = last_migration + 1,
			mm = app._migrations.length,
			migrations = app._migrations,
			q, qq, queries, query;
		
		var throw_error = function (tx, error) {
			throw Error('Migrating the database failed at migration: ' + m + ', query: ' + q + ' of ' + qq + "\n" + error.message);
		};
		var m_iter = function () {		
			if (m < mm) {
				queries = migrations[m];
				queries.push(["UPDATE [_state] SET [value] = ? WHERE [key] = ?", [m, 'last_migration']]);
				q = 0;
				qq = queries.length;

				app.db.transaction(function (tx) {
					var q_iter = function (tx) {
						query = queries[q];
						tx.executeSql(
							query instanceof Array ? query[0] : query,
							query instanceof Array ? query[1] : null,
							q < qq - 1 ? q_iter : m_iter,
							throw_error
						);
						++q;
					};
					q_iter(tx);
				});
			} else {
				callback();
			}
			++m;
		};
		m_iter();
	},
});