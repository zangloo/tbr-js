/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/17
 * Time: 下午7:40
 */

const {EpubParser} = require('@ridi/epub-parser');
const {loadFromString: loadHtml} = require('./html');

function loadTOC(points, TOC) {
	for (let point of points) {
		TOC.push({title: point.label, spineId: point.spine.id});
		loadTOC(point.children, TOC);
	}
}

function load(reading, callback) {
	const filename = reading.filename;
	const parser = new EpubParser(filename);
	parser.parse().then(epub => {
		const toc = [];
		loadTOC(epub.ncx.navPoints, toc);
		parser.readItems(epub.spines).then(content => {
			const length = epub.spines.length;
			const map = {};
			for (let i = 0; i < length; i++)
				map[epub.spines[i].id] = content[i];
			for (let single of toc)
				single.content = map[single.spineId];
			callback(null, {
				_book: epub,
				toc: toc,
				getChapter(index, callback) {
					const content = toc[index].content;
					if (content === null || content === undefined)
						callback(['']);
					else
						loadHtml(content, callback);
				}
			});
		});
	});
}

function support(filename) {
	return filename.endsWith('.epub');
}

exports.load = load;
exports.support = support;
