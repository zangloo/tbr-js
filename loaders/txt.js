/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/18
 * Time: 下午1:40
 */

const {readFileSync} = require('fs');
const detect = require('charset-detector');

function load(filename, callback) {
	const buffer = readFileSync(filename);
	const charsets = detect(buffer);
	let encoding = charsets[0].charsetName;
	if (encoding === 'ISO-8859-1')
		encoding = 'UTF-8';
	const text = buffer.toString(encoding);
	const lines = loadFromString(text);
	callback({
		toc: [{title: filename}],
		getChapter: function (index, callback) {
			callback(lines);
		}
	});
}

function loadFromString(text) {
	return text.replace(/\r/g, '').split('\n');
}

function support(filename) {
	return filename.indexOf('.txt') > 0;
}

exports.load = load;
exports.support = support;
exports.loadFromString = loadFromString;
