/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/23
 * Time: 下午6:05
 */
'use strict'

const List = require('./list')

class Chapter extends List {
	constructor(context, term, closeCallback, options) {
		const entries = [];
		const reading = context.reading;
		const length = reading.book.toc.length;
		for (let i = 0; i < length; i++)
			entries.push({title: reading.book.tocTitle(i)});
		options.selectedIndex = reading.chapter;
		super(term, entries, 'Select chapter', closeCallback, options);
	}

	entryText(topic) {
		return topic.title;
	}
}

module.exports = Chapter;
