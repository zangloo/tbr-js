// noinspection NonAsciiCharacters
/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/18
 * Time: 上午9:04
 */
const HCharMap = {
	'「': '﹁',
	'」': '﹂',
	'〈': '︿',
	'〉': '﹀',
	'『': '﹃',
	'』': '﹄',
	'（': '︵',
	'）': '︶',
	'《': '︽',
	'》': '︾',
	'〔': '︹',
	'〕': '︺',
	'【': '︻',
	'】': '︼',
	'｛': '︷',
	'｝': '︸',
	'─': '︱',
	'…': '︙',
	'\t': '　',
	'(': '︵',
	')': '︶',
	'[': '︹',
	']': '︺',
	'<': '︻',
	'>': '︼',
	'{': '︷',
	'}': '︸',
	'-': '︱',
	'—': '︱',
	'〖': '︘',
	'〗': '︗',
}

function draw(context) {
	const region = context.region;
	const height = context.region.height();
	const width = context.region.width();

	const reading = context.reading;
	const lines = reading.content;
	let position = reading.position;
	let line = reading.line;
	for (let x = width - 2; x >= 0; x -= 2) {
		const text = lines[line];
		const lineLength = text.length;
		let left = lineLength - position;
		let leading = 0;
		let chars = left >= height ? height : left;
		if (position === 0 && left > 0)
			if (withLeading(text)) {
				leading = 2;
				if (chars > height - 2)
					chars = height - 2;
			}
		for (let y = 0; y < chars; y++) {
			const char = text[position++];
			const map = HCharMap[char];
			region.chr(x, y + leading, map ? map : char);
		}
		if (position === lineLength) {
			line++;
			if (line === lines.length) {
				context.next = null;
				return;
			} else
				position = 0;
		}
	}
	context.next = {
		line: line,
		position: position
	}
}

function withLeading(text) {
	if (text.length === 0)
		return false;
	const leader = text[0];
	return leader !== ' ' && leader !== '\t' && leader !== '　';
}

function prev(context) {
	function lengthWithLeading(text) {
		const length = text.length;
		if (withLeading(text))
			return length + 2;
		else
			return length;
	}

	const region = context.region;
	const height = region.height();
	const width = Math.floor(region.width() / 2);

	const reading = context.reading;
	const lines = reading.content;
	let line = reading.line;
	let position = reading.position;
	if (position === 0) {
		line--;
		position = lengthWithLeading(lines[line]);
	}
	for (let x = 0; x < width; x++) {
		position -= height;
		if (position <= 0) {
			line--;
			if (line < 0) {
				reading.line = 0;
				reading.position = 0;
				return;
			}
			position = lengthWithLeading(lines[line]);
		}
	}
	const text = lines[line];
	if (position === lengthWithLeading(text)) {
		position = 0;
		line++;
	} else {
		let p = 0;
		do {
			p += height;
		} while (p < position);
		position = p;
		if (withLeading(text))
			position -= 2;
	}
	reading.line = line;
	reading.position = position;
}

exports.draw = draw;
exports.prev = prev
