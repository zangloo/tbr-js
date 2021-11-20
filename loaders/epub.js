/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/17
 * Time: 下午7:40
 */

const EPub = require('epub');
const {loadFromString: loadHtml} = require('./html');

function getChapter(index, callback) {
	const epub = this._book;
	const chapterId = epub.toc[index].id;
	epub.getChapter(chapterId, (error, text) => {
		if (text === null || text === undefined)
			callback(['']);
		else
			loadHtml(text, callback);
	});
}

function load(filename, callback) {
	const epub = new EPub(filename);
	epub.on('end', () => {
		callback({
			_book: epub,
			toc: epub.toc,
			getChapter
		});
	});
	epub.parse();
}

function support(filename) {
	return filename.indexOf('.epub') > 0;
}

exports.load = load;
exports.support = support;
