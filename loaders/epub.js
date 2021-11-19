/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/17
 * Time: 下午7:40
 */

const {parseEpub} = require('@liprikon/epub-parser');
const {Buffer} = require('buffer');
const {loadFromString: loadHtml} = require('./html');

function getChapter(index, callback) {
	const epub = this._book;
	const sectionId = epub.structure[index].sectionId;
	let section;
	if (!epub.sections.some(s => {
		if (s.id === sectionId) {
			section = s;
			return true;
		}
	})) return [{type: 'text', content: 'internal error'}];
	loadHtml(section.htmlString, callback)
}

function load(filename, callback) {
	parseEpub(filename).then(epub => {
		callback({
			_book: epub,
			_cache: {},
			toc: epub.structure,
			getChapter
		});
	});
}

function support(filename) {
	return filename.indexOf('.epub') > 0;
}

exports.load = load;
exports.support = support;
