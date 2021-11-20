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

const {leadingSpace, lengthWithLeading, withLeading} = require('../common');

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
				leading = leadingSpace;
				if (chars > height - leadingSpace)
					chars = height - leadingSpace;
			}
		for (let y = 0; y < chars; y++) {
			const reverse = context.reverse;
			let format = null;
			if (reverse && reverse.line === line && reverse.start <= position && reverse.end > position)
				format = {reverse: true};
			const char = text[position++];
			const map = HCharMap[char];
			region.chr(x, y + leading, map ? map : char, format);
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

function prev(context) {
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
			position -= leadingSpace;
	}
	reading.line = line;
	reading.position = position;
}

function setupReverse(context) {
	let reverse = context.reverse;
	if (reverse === null) return;
	const reversLine = reverse.line;
	const reading = context.reading;
	const next = context.next;
	const reversStart = reverse.start;
	const readingLine = reading.line;
	const readingPosition = reading.position;
	if (((reversLine === readingLine && reversStart >= readingPosition) || (reversLine > readingLine))
		&& (!next || (reversLine === next.line && reversStart < next.position) || (reversLine < next.line)))
		return;

	const region = context.region;
	const height = region.height();
	const text = reading.content[reversLine]
	let leading = 0;
	if (withLeading(text))
		leading = leadingSpace;
	let position = 0;
	do {
		if (position + height - leading >= reversStart)
			break;
		position += height - leading;
		leading = 0;
	} while (true);
	reading.line = reversLine;
	reading.position = position;
}

function nextLine(context) {
	if (!context.next) return false;
	const reading = context.reading;
	let line = reading.line;
	const height = context.region.height();
	const text = reading.content[line];
	const textLength = lengthWithLeading(text);
	let position = reading.position;
	if (position === 0)
		if (textLength <= height)
			line++;
		else if (withLeading(text))
			position = height - leadingSpace
		else
			position = height;
	else {
		position += height;
		if (position > textLength) {
			position = 0;
			line++;
		}
	}
	reading.line = line;
	reading.position = position;
	return true;
}

function prevLine(context) {
	const reading = context.reading;
	const height = context.region.height();
	let line = reading.line;
	let position = reading.position;
	if (position === 0)
		if (line === 0)
			return false;
		else {
			line--;
			const text = reading.content[line];
			const textLength = lengthWithLeading(text);
			if (textLength <= height)
				position = 0;
			else {
				do {
					if (position + height > textLength)
						break;
					position += height;
				} while (true);
				if (withLeading(text))
					position -= leadingSpace;
			}
		}
	else {
		position -= height;
		if (position < 0)
			position = 0;
	}
	reading.line = line;
	reading.position = position;
	return true;
}

module.exports = {
	draw, prev, setupReverse, nextLine, prevLine
}
