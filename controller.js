/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/18
 * Time: 下午3:50
 */

const {Draw, Region, controls} = require('termdraw');
const readline = require('readline');
const searchPrefix = 'Search: ';
let exitAndSave;
let context;
let statusRegion;
let layout;

function exit() {
	context.draw.close();
	exitAndSave();
}

function next() {
	const reading = context.reading;
	const next = context.next;
	if (next === null) {
		const book = reading.book;
		if (reading.chapter >= book.toc.length - 1)
			return;
		reading.chapter++;
		reading.line = reading.position = 0;
		switchChapter(reading, render);
	} else {
		reading.line = next.line;
		reading.position = next.position;
		render();
	}
}

function prev() {
	function doPrev() {
		context.render.prev(context);
		render();
	}

	const reading = context.reading;
	let line = reading.line;
	let position = reading.position;
	if (line === 0 && position === 0) {
		if (reading.chapter !== 0) {
			reading.chapter--;
			switchChapter(reading, () => {
				const content = reading.content;
				reading.line = content.length - 1;
				reading.position = content[reading.line].length;
				doPrev();
			});
		}
	} else
		doPrev();
}

function found(txt, line, pos) {
	context.reverse = {
		line: line,
		start: pos,
		end: pos + txt.length,
	};
	context.render.setupReverse(context);
	return true;
}

function searchPrev(pattern, startLine, startPosition) {
	const reading = context.reading;
	let lines = reading.content;
	let text = lines[startLine];
	if (startPosition > 0)
		text = text.substr(0, startPosition);
	let i = startLine;
	const regExp = new RegExp(pattern, 'g');
	do {
		let matches = [...text.matchAll(regExp)];
		if (matches.length > 0) {
			const result = matches[matches.length - 1];
			return found(result[0], i, result.index)
		}
		if (i === 0) break;
		i--;
		text = lines[i];
	} while (true)
	return false;
}

function searchNext(pattern, startLine, startPosition) {
	if (!pattern) return false;
	const reading = context.reading;
	let lines = reading.content;
	let text = lines[startLine];
	if (startPosition > 0)
		text = text.substr(startPosition);
	const regExp = new RegExp(pattern);
	let result = regExp.exec(text);
	if (result)
		return found(result[0], startLine, startPosition + result.index)
	else for (let i = startLine + 1; i < lines.length; i++) {
		text = lines[i];
		result = regExp.exec(text);
		if (result)
			return found(result[0], i, result.index);
	}
	return false;
}

function startSearch() {
	const draw = context.draw;
	statusRegion.clear();
	render();
	draw.pause(statusRegion, function (resume) {
		function stopReadonly(pattern) {
			rl.close();
			resume();
			if (pattern && pattern.length > 0) {
				context.searchPattern = pattern;
				const reading = context.reading;
				searchNext(context.searchPattern, reading.line, reading.position);
			}
			statusRegion.get_cursor = function () {
				return null;
			};
			render();
		}

		const rl = readline.createInterface({input: process.stdin, output: process.stdout});
		rl.question(searchPrefix, stopReadonly);
		rl.on('SIGINT', () => {
			stopReadonly();
			exit();
		});
	})
}

function goHome() {
	const reading = context.reading;
	reading.line = reading.position = 0;
	render();
}

function goEnd() {
	const reading = context.reading;
	const content = reading.content;
	reading.line = content.length - 1;
	reading.position = content[reading.line].length;
	prev();
}

function prevChapter() {
	const reading = context.reading;
	if (reading.chapter === 0)
		return;
	reading.chapter--;
	reading.line = 0;
	reading.position = 0;
	switchChapter(reading, render);
}

function nextChapter() {
	const reading = context.reading;
	const book = reading.book;
	const chapters = book.toc.length;
	if (reading.chapter + 1 === chapters)
		return;
	reading.chapter++;
	reading.line = 0;
	reading.position = 0
	switchChapter(reading, render);
}

function switchChapter(reading, callback) {
	reading.book.getChapter(reading.chapter, content => {
		reading.content = content;
		callback();
	});
}

function keypress(event) {
	const special = typeof event === 'object';
	const key = special ? event.key : event;
	switch (key) {
		case 'h':
			break;
		case '/':
			startSearch();
			break;
		case 'n':
			if (searchNext(context.searchPattern,
				context.reverse ? context.reverse.line : context.reading.line,
				context.reverse ? context.reverse.end : context.reading.position))
				render();
			break;
		case 'N':
			if (searchPrev(context.searchPattern,
				context.reverse ? context.reverse.line : context.reading.line,
				context.reverse ? context.reverse.start : context.reading.position))
				render();
			break;
		case ' ':
		case 'next':
			context.reverse = null;
			next();
			break;
		case 'prior':
			context.reverse = null;
			prev();
			break;
		case 'up':
		case 'right':
			context.reverse = null;
			if (context.render.prevLine(context))
				render();
			break;
		case 'down':
		case 'left':
			context.reverse = null;
			if (context.render.nextLine(context))
				render();
			break;
		case 'home':
			context.reverse = null;
			goHome();
			break;
		case 'end':
			context.reverse = null;
			goEnd();
			break;
		case '^B':
			context.reverse = null;
			prevChapter();
			break;
		case '^D':
			context.reverse = null;
			nextChapter();
			break;
		case '^X':
			context.switchRender();
			render();
			break;
		case 'q':
		case '^[':
		case '^C':
			exit();
			break;
		default:
		// context.region.str(0, 0, key);
		// context.draw.redraw(context.region, true);
	}
}

function render() {
	const reading = context.reading;
	const lines = reading.content;
	if (reading.line >= lines.length)
		reading.line = lines.length - 1;
	const lineLength = lines[reading.line].length;
	if (lineLength <= reading.position)
		if (lineLength === 0)
			reading.position = 0;
		else
			reading.position = lineLength - 1;
	const region = context.region;
	region.clear();
	context.render.draw(context);
	let msg = `[${region.width()}:${region.height()}]${reading.book.toc[reading.chapter].name}(${reading.line}:${reading.position})`;
	if (context.debug) {
		const next = context.next;
		if (next)
			msg += `=>(${next.line}:${next.position})`;
		else
			msg += '->()';
	}
	statusRegion.clear();
	statusRegion.str(0, 0, msg);
	context.draw.redraw(layout, true);
}

function initRender() {
	const draw = context.draw = new Draw();
	draw.on('keypress', keypress)
	draw.on('control', keypress)
	draw.on('special', keypress)
	draw.on('resize', resize)
	const width = draw.width();
	const height = draw.height();
	context.region = new Region({width: width, height: height - 1});
	statusRegion = new Region({width: width, height: 1});
	layout = new controls.HLayout({
		width: width,
		height: height,
		children: [{
			child: context.region,
			fixed: height - 1,
		}, {
			child: statusRegion,
			fixed: 1,
		}],
	});
}

function resize() {
	const draw = context.draw;
	const width = draw.width();
	const height = draw.height();
	layout.resize(width, height);
	layout.set_children([{
		child: context.region,
		fixed: height - 1,
	}, {
		child: statusRegion,
		fixed: 1,
	}]);
	render();
}

function start() {
	const reading = context.reading;
	const book = reading.book;
	if (book.toc.length <= reading.chapter)
		reading.chapter = book.toc.length - 1;
	switchChapter(reading, () => {
		initRender();
		render();
	});
}

exports.start = function (c, exitAndSaveCallback) {
	context = c;
	exitAndSave = exitAndSaveCallback;
	start();
};
