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

const leadingSpace = 2;

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

function withLeading(text) {
	if (text.length === 0)
		return false;
	const leader = text[0];
	return leader !== ' ' && leader !== '\t' && leader !== '　';
}

function lengthWithLeading(text) {
	const length = text.length;
	if (withLeading(text))
		return length + leadingSpace;
	else
		return length;
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
	const region = context.region;
	const height = region.height();
	const reading = context.reading;
	const line = reverse.line;
	const text = reading.content[line]
	const position = reverse.start;
	let leading = 0;
	if (withLeading(text))
		leading = leadingSpace;
	let pos = 0;
	do {
		if (pos + height - leading >= position)
			break;
		pos += height - leading;
		leading = 0;
	} while (true);
	reading.line = line;
	reading.position = pos;
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

exports.draw = draw;
exports.prev = prev
exports.setupReverse = setupReverse
exports.nextLine = nextLine
exports.prevLine = prevLine
