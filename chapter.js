/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/23
 * Time: 下午6:05
 */
'use strict'

const List = require('./list')

class Chapter extends List {
	constructor(context, closeCallback) {
		const entries = [];
		const reading = context.reading;
		reading.book.toc.forEach(topic => {
			entries.push(topic);
		})
		super(context, closeCallback, {
			entries,
			selectedIndex: reading.chapter,
		});
	}

	title(topic) {
		return topic.title;
	}
}

module.exports = Chapter;
