/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/20
 * Time: 下午7:34
 */
'use strict';

const {pushAndSort} = require('./common')
const List = require('./list')

/**
 *
 * @param c context
 * @param callback if selected, called with a argument: <reading info from history list>
 */
class History extends List {
	constructor(context, callback) {
		const historyEntries = [];
		const lastReading = context.lastReading;
		context.history.forEach(entry => {
			if (entry.filename === lastReading) return;
			pushAndSort(entry, historyEntries, (a, b) => {
				const ts1 = a.ts ? a.ts : 0;
				const ts2 = b.ts ? b.ts : 0;
				return ts2 - ts1;
			});
		});
		super(context, historyEntries, 'Reopen file from history', callback);
	}

	entryText(entry) {
		return entry.filename;
	}
}

module.exports = History;
