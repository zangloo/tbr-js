/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/25
 * Time: 下午2:08
 */
'use strict'

const List = require('./list')
const {pushAndSort} = require('./common')

class Theme extends List {
	constructor(context, term, closeCallback, options) {
		const entries = [];
		context.themes.forEach(topic => {
			if (context.themeName !== topic.name)
				pushAndSort(topic, entries, (a, b) => {
					if (a === null)
						return -1;
					if (b === null)
						return 1;
					return a.name.localeCompare(b.name);
				});
		})
		super(term, entries, 'Select theme', closeCallback, options);
	}

	entryText(topic) {
		return topic.name;
	}
}

module.exports = Theme;
