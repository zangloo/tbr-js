/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/18
 * Time: 下午1:40
 */

const {readFileSync} = require('fs');
const {detectEncoding} = require('../common');
const iconv = require('iconv-lite');

function load(reading, callback) {
	const filename = reading.filename;
	const buffer = readFileSync(filename);
	let encoding;
	if (reading.cache && reading.cache.encoding)
		encoding = reading.cache.encoding;
	else {
		encoding = detectEncoding(buffer);
		reading.cache = {encoding: encoding};
	}
	const text = iconv.decode(buffer, encoding);
	const lines = loadFromString(text);
	const leadingSpace = !filename.endsWith('.log');
	callback(null, {
		toc: [{title: filename}],
		getChapter(index, callback) {
			callback(lines);
		},
		get encoding() {
			return encoding;
		},
		get leadingSpace() {
			return leadingSpace;
		}
	});
}

function loadFromString(text) {
	return text.replace(/\r/g, '').split('\n');
}

function support(filename) {
	return filename.endsWith('.txt')
		|| filename.endsWith('.log')
		|| filename.endsWith('.json')
		|| filename.endsWith('.yaml')
		|| filename.endsWith('.yml')
		|| filename.endsWith('.js');
}

module.exports = {
	load, support, loadFromString
};
