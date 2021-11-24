/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/19
 * Time: 下午10:19
 */
'use strict';

const {leadingSpace, withLeading} = require('../common');
const {wcswidth} = require('ansiterm');
const tabSize = 4;

function wrapLine(text, line, position, width, withLeadingSpace, reverse) {
	const lineLength = text.length;
	let breakPosition = 0;
	let lineChars = [];
	let x;
	if (withLeadingSpace === true)
		withLeadingSpace = position === 0 && withLeading(text);
	if (withLeadingSpace) {
		x = leadingSpace;
		for (let i = 0; i < x; i++)
			lineChars.push({char: ' ', width: 1});
	} else
		x = 0;
	// [position, [{char, format},...], position, [{char, format},...], ...]
	const wrappedInfo = [position];
	while (position < lineLength) {
		const char = text[position];
		const cw = wcswidth(char);
		const canBreak = char === ' ' || char === '\t';
		if (x + cw > width) {
			x = 0;
			if (cw > 1 || canBreak || breakPosition === 0) {
				wrappedInfo.push(lineChars);
				lineChars = [];
				if (canBreak) {
					wrappedInfo.push(++position);
					continue;
				}
				wrappedInfo.push(position);
			} else {
				const prevPosition = wrappedInfo[wrappedInfo.length - 1];
				let charsCount;
				if (prevPosition === 0) {
					charsCount = breakPosition
					if (withLeadingSpace)
						charsCount += leadingSpace;
				} else
					charsCount = breakPosition - prevPosition;
				wrappedInfo.push(lineChars.slice(0, charsCount));
				lineChars = lineChars.slice(charsCount, lineChars.length);
				wrappedInfo.push(breakPosition);
				breakPosition = 0;
				lineChars.forEach(char => {
					x += char.width;
				});
			}
		}
		let format = null;
		if (reverse && reverse.line === line && reverse.start <= position && reverse.end > position)
			format = {reverse: true};
		position++;
		x += cw;
		if (canBreak) {
			breakPosition = position;
			lineChars.push({char: ' ', format: format, width: 1});
			if (char === '\t') {
				const tabCharsLeft = tabSize - (x % tabSize) - 1;
				for (let c = 0; x < width && c < tabCharsLeft; c++, x++)
					lineChars.push({char: ' ', format: format, width: 1});
			}
		} else
			lineChars.push({char: char, format: format, width: cw});
	}
	wrappedInfo.push(lineChars);
	return wrappedInfo;
}

function draw(context) {
	const region = context.region;
	const height = context.region.height();
	const width = context.region.width();

	const reading = context.reading;
	const lines = reading.content;
	let position = reading.position;
	const reverse = context.reverse;
	let y = 0;
	let line = reading.line;
	for (; line < lines.length; line++) {
		const wrappedInfo = wrapLine(lines[line], line, position, width, reading.book.leadingSpace, reverse);
		position = 0;
		for (let l = 0; l < wrappedInfo.length; l += 2) {
			const chars = wrappedInfo[l + 1];
			let x = 0;
			chars.forEach(char => {
				region.chr(x, y, char.char, char.format);
				x += char.width;
			});
			y++;
			if (y === height) {
				if (l === wrappedInfo.length - 2) {
					line++;
					if (line >= lines.length){
						context.next = null;
						return;
					}
					position = 0;
				} else
					position = wrappedInfo[l + 2];
				context.next = {
					line: line,
					position: position,
				}
				return;
			}
		}
	}
	context.next = null;
}

function prev(context) {
	const region = context.region;
	const height = region.height();
	const width = region.width();

	const reading = context.reading;
	const lines = reading.content;
	let line = reading.line;
	let text;
	let position = reading.position
	if (position === 0) {
		line--;
		text = lines[line];
	} else
		text = lines[line].substr(0, position);
	let rows = 0;
	let wrappedInfo;
	do {
		wrappedInfo = wrapLine(text, line, 0, width, reading.book.leadingSpace, null);
		rows += wrappedInfo.length / 2;
		if (rows >= height)
			break;
		if (line === 0)
			break;
		line--;
		text = lines[line];
	} while (true);
	if (rows < height)// break by line === 0
		position = 0;
	else
		position = wrappedInfo[(rows - height) * 2];

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
	const width = region.width();
	const text = reading.content[reversLine];
	const wrappedInfo = wrapLine(text, reversLine, 0, width, reading.book.leadingSpace, null);
	for (let i = wrappedInfo.length - 2; i >= 0; i -= 2)
		if (wrappedInfo[i] <= reversStart) {
			reading.line = reversLine;
			reading.position = wrappedInfo[i];
			return;
		}
}

function nextLine(context) {
	if (!context.next) return false;
	const reading = context.reading;
	let line = reading.line;
	const width = context.region.width();
	const text = reading.content[line];
	let position = reading.position;
	const wrappedInfo = wrapLine(text, line, position, width, reading.book.leadingSpace, null);
	let i = 0;
	for (; i < wrappedInfo.length; i += 2)
		if (wrappedInfo[i] > position) {
			position = wrappedInfo[i];
			break;
		}

	if (i === wrappedInfo.length) {
		reading.line++;
		reading.position = 0;
	} else
		reading.position = position;
	return true;
}

function prevLine(context) {
	const reading = context.reading;
	const width = context.region.width();
	let line = reading.line;
	let position = reading.position;
	let text;
	if (position === 0) {
		if (line === 0)
			return false;
		line--;
		text = reading.content[line];
		position = text.length;
	} else
		text = reading.content[line];
	const wrappedInfo = wrapLine(text, line, 0, width, reading.book.leadingSpace, null);
	let i = wrappedInfo.length - 2;
	for (; i > 0; i -= 2)
		if (wrappedInfo[i] < position) {
			position = wrappedInfo[i];
			break;
		}
	if (i === 0)
		position = 0;
	reading.line = line;
	reading.position = position;
	return true;
}

module.exports = {
	draw,
	prev,
	setupReverse,
	nextLine,
	prevLine,
};
