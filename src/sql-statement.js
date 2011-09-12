goog.require('mongo2sql');
goog.require('Deferred');

goog.provide('nativish.SQLStatement');
goog.provide('nativish.SQLStatement.Modes');


/**
 * Wrapper around the Web SQL database API
 * @constructor
 * @param {Database} db The Web SQL database to query
 * @param {string} collection The name of the target collection/table
 * @param {SQLStatement.Modes} mode The mode in which to execute the queries
 */
var SQLStatement = function (db, collection, mode) {
	this.db_ = db;
	this.collection_ = collection;
	this.mode_ = mode;
	this.selector = {};
	this.options = {
		fields: [],
		sort: {},
		limit: 0
	};
	this.data = {};
};

/**
 * Executes SQL queries needed to get the job done
 * Some modes (currently only UPSERT) have subsequent secondary mode that is
 *   needed if the query in the first mode is not enough.
 * @return {Deferred}
 */
SQLStatement.prototype.execute = function () {
	var dfr = new Deferred();

	var primary_mode = this.getPrimaryMode_();
	var sql = this.getSQL_(primary_mode);
	this.executeSQL_(sql[0], sql[1]).then(function (result) {
		if (result.rowsAffected) {
			if (primary_mode === SQLStatement.Modes.SELECT) {
				dfr.complete('success', result.rows);
			} else {
				dfr.complete('success', result);
			}
		} else {
			var secondary_mode = this.getSecondaryMode_();
			if (secondary_mode === null) {
				dfr.complete('failure', 'No record updated');
			} else {
				// Currently implies UPSERT
				var sql = this.getSQL_(secondary_mode);
				this.executeSQL_(sql[0], sql[1]).pipe(dfr);
			}
		}
	}, dfr, this);

	return dfr;
};

/**
 * Executes an SQL query
 * @param {string} sql The SQL query to execute
 * @param {Array} params A list of parameters with which to substitude "?"s
 *   in the query
 * @return {Deferred}
 */
SQLStatement.prototype.executeSQL_ = function (sql, params) {
	var dfr = new Deferred();

	this.db_.transaction(function (tx) {
		tx.executeSql(sql, params, function (tx, result) {
			dfr.complete('success', result);
		}, function (tx, err) {
			dfr.complete('failure', err);
		});
	});

	return dfr;
};

/**
 * Returns the mode in which to execute the first query
 * @return {SQLStatement.Modes}
 */
SQLStatement.prototype.getPrimaryMode_ = function () {
	if (this.mode_ === SQLStatement.Modes.UPSERT) {
		return SQLStatement.Modes.UPDATE;
	}
	return this.mode_;
};

/**
 * Returns the mode in which to execute the second query
 * Currently only UPSERT needs up to two queries.
 * @return {?SQLStatement.Modes}
 */
SQLStatement.prototype.getSecondaryMode_ = function () {
	if (this.mode_ === SQLStatement.Modes.UPSERT) {
		return SQLStatement.Modes.INSERT;
	}
	return this.mode_ || null;
};

SQLStatement.prototype.getSQL_ = function (mode) {
	switch (mode) {
		case SQLStatement.Modes.SELECT:
			return this.getSelectSQL_();
		case SQLStatement.Modes.INSERT:
			return this.getInsertSQL_();
		case SQLStatement.Modes.UPDATE:
			return this.getUpdateSQL_();
		case SQLStatement.Modes.DELETE:
			return this.getUpdateSQL_();
		default:
			throw new Error('Invalid SQLStatement mode');
	}
};

SQLStatement.prototype.getSelectSQL_ = function () {
	var selector = this.selector;
	var options = this.options;

	var chunks = [];
	var params = [];

	chunks.push('SELECT');
	var fields = options.fields || [];
	if (fields.length) {
		fields = fields.map(function (field) {
			return (field.search('[') === -1) ? '[' + field + ']' : field;
		});
		chunks.push(fields.join(', '));
	} else {
		chunks.push('*');
	}

	chunks.push('FROM', this.collection_);

	if (Object.keys(selector).length) {
		chunks.push('WHERE');
		chunks.push(mongo2sql.stringify(selector));
	}

	var sort = options.sort;
	if (sort) {
		chunks.push('ORDER BY');
		Object.keys(sort).forEach(function (field) {
			chunks.push('lower([' + field + '])');
			chunks.push(sort[field] > 0 ? 'ASC' : 'DESC');
		});
	}

	if (options.limit) {
		chunks.push('LIMIT', options.limit);
	}

	var sql = chunks.join(' ');
	return [sql, params];
};

SQLStatement.prototype.getInsertSQL_ = function () {
	var selector = this.selector;
	var options = this.options;
	var data = this.data;

	var chunks = [];
	var params = [];

	chunks.push('INSERT INTO', this.collection_);

	var fields = Object.keys(data).map(function (field) {
		return (field.search('[') === -1) ? '[' + field + ']' : field;
	});
	chunks.push('(', fields.join(', '), ') VALUES (');
	chunks.push(new Array(fields.length + 1).join('?'));
	chunks.push(')');

	var sql = chunks.join(' ');
	return [sql, params];
};

SQLStatement.prototype.getUpdateSQL_ = function () {
	var selector = this.selector;
	var options = this.options;
	var data = this.data;

	var chunks = [];
	var params = [];

	chunks.push('UPDATE', this.collection_, 'SET');

	var fields = [];
	Object.keys(data).forEach(function (field) {
		field = (field.search('[') === -1) ? '[' + field + ']' : field;
		params.push(data[field]);
	});
	chunks.push(fields.join(', '));

	if (Object.keys(selector).length) {
		chunks.push('WHERE');
		chunks.push(mongo2sql.stringify(selector));
	}

	var sql = chunks.join(' ');
	return [sql, params];
};

SQLStatement.prototype.getDeleteSQL_ = function () {
	var selector = this.selector;
	var options = this.options;

	var chunks = [];
	var params = [];

	chunks.push('DELETE FROM', this.collection_);

	if (Object.keys(selector).length) {
		chunks.push('WHERE');
		chunks.push(mongo2sql.stringify(selector));
	}

	var sql = chunks.join(' ');
	return [sql, params];
};

/**
 * @enum
 */
SQLStatement.Modes = {
	SELECT: 1,
	INSERT: 2,
	UPDATE: 3,
	UPSERT: 4,
	DELETE: 5
};
