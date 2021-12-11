/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/18
 * Time: 下午3:50
 */
'use strict';

const tk = require('terminal-kit');
const Region = require('./region');
const {existsSync} = require('fs');
const requireDir = require('require-dir');
const readline = require('readline');
const History = require('./history');
const Chapter = require('./chapter');
const Theme = require('./theme');
const loaders = requireDir('./loaders');
const {some, errorExit} = require('./common');
const consoleTitle = require('console-title');
const traceSize = 100;

let saveAndExit;
let context;

let term;
let statusRegion;

function cleanUp() {
	term.grabInput(false);
	term.hideCursor(false);
	term.styleReset();
	term.clear();
	consoleTitle('');
	if (context.reading.loader && context.reading.loader.unload)
		context.reading.loader.unload(context.reading.book);
}

function exit() {
	cleanUp();
	saveAndExit(true);
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
				if (reading.line === 0 && reading.position === 0)
					render();
				else
					doPrev();
			});
		}
	} else
		doPrev();
}

function found(result, line, pos) {
	const txt = result[0];
	context.reverse = {
		line: line,
		start: pos,
		end: pos + txt.length,
	};
	context.render.setupReverse(context);
	return true;
}

function searchPrev(regExp, startLine, startPosition) {
	const reading = context.reading;
	let lines = reading.content;
	let text = lines[startLine];
	if (startPosition > 0)
		text = text.substr(0, startPosition);
	let i = startLine;
	do {
		let matches = [...text.matchAll(regExp)];
		if (matches.length > 0) {
			const result = matches[matches.length - 1];
			return found(result, i, result.index)
		}
		if (i === 0) break;
		i--;
		text = lines[i];
	} while (true)
	return false;
}

function searchNext(regExp, startLine, startPosition, found) {
	const reading = context.reading;
	let lines = reading.content;
	let text = lines[startLine];
	if (startPosition > 0)
		text = text.substr(startPosition);
	let result = regExp.exec(text);
	if (result)
		return found(result, startLine, startPosition + result.index)
	else for (let i = startLine + 1; i < lines.length; i++) {
		text = lines[i];
		result = regExp.exec(text);
		if (result)
			return found(result, i, result.index);
	}
	return false;
}

function readlineFunction(prefix, callback, readlineOption) {
	function stopReadline(str) {
		rl.close();
		term.grabInput(true);
		term.hideCursor(true);
		if (str && str.length > 0)
			callback(str);
		else
			redraw();
	}

	term.moveTo(1, term.height);
	term.grabInput(false);
	term.hideCursor(false);
	if (!readlineOption)
		readlineOption = {};
	readlineOption.input = process.stdin;
	readlineOption.output = process.stdout;
	const rl = readline.createInterface(readlineOption);
	rl.question(prefix, stopReadline);
	rl.on('SIGINT', () => {
		stopReadline();
		exit();
	});

}

function goto() {
	readlineFunction("Goto: ", str => {
		const line = parseInt(str);
		if (Number.isNaN(line) || line < 0 || line >= context.reading.content.length)
			reportError('Invalid line number.');
		else {
			const reading = context.reading;
			reading.line = line;
			reading.position = 0;
			render();
		}
	});
}

function startSearch() {
	readlineFunction('Search: ', pattern => {
		try {
			const regExp = new RegExp(pattern);
			context.searchPattern = pattern;
			const reading = context.reading;
			searchNext(regExp, reading.line, reading.position, found);
			render();
		} catch (e) {
			reportError(e.toString());
		}
	}, {
		history: context.searchHistory,
		historySize: context.searchHistorySize
	});
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

function reloadBook() {
	const reading = context.reading;
	delete reading.book;
	delete reading.cache;
	delete reading.content;
	start(reading);
}

function switchChapter(reading, callback) {
	reading.book.getChapter(reading.chapter, content => {
		reading.content = content;
		callback();
	});
}

function dispatchEnd() {
	dispatcher = null;
	if (!resizedWhenDispatch)
		return;
	resizedWhenDispatch = false;
	resize(true);
}

function historySelect() {
	dispatcher = new History(context, term, function (reading) {
		dispatchEnd();
		if (reading && reading.filename !== context.reading.filename)
			start(reading);
		else
			redraw();
	}, {theme: statusRegion.theme});
}

function chapterSelect() {
	const reading = context.reading;
	if (reading.book.toc.length === 1)
		return;
	dispatcher = new Chapter(context, term, function (topic, index) {
		dispatchEnd();
		if (topic) {
			reading.chapter = index;
			reading.line = 0;
			reading.position = 0;
			switchChapter(reading, render);
		} else
			redraw();
	}, {theme: statusRegion.theme});
}

function themeSelect() {
	if (context.themes.length === 1)
		return;
	dispatcher = new Theme(context, term, function (topic) {
		dispatchEnd();
		if (topic) {
			context.themeName = topic.name;
			context.region.theme = topic;
			statusRegion.theme = topic;
		}
		redraw();
	}, {theme: statusRegion.theme});
}

function redraw() {
	context.region.redraw();
	statusRegion.redraw();
}

let dispatcher;

function keypress(event) {
	const special = typeof event === 'object';
	const key = special ? event.key : event;
	if (dispatcher) {
		dispatcher.keypress(key);
		return;
	}
	switch (key) {
		case 'v':
			const npmVersion = process.env.npm_package_version;
			const version = npmVersion ? npmVersion : 'develop';
			printStatus(`Version: ${version}`);
			break;
		case 'h':
			historySelect();
			break;
		case 'c':
			chapterSelect();
			break;
		case 't':
			themeSelect();
			break;
		case '/':
			startSearch();
			break;
		case 'g':
			goto()
			break;
		case 'n':
			if (searchNext(new RegExp(context.searchPattern),
				context.reverse ? context.reverse.line : context.reading.line,
				context.reverse ? context.reverse.end : context.reading.position,
				found))
				render();
			break;
		case 'N':
			if (searchPrev(new RegExp(context.searchPattern, 'g'),
				context.reverse ? context.reverse.line : context.reading.line,
				context.reverse ? context.reverse.start : context.reading.position))
				render();
			break;
		case ' ':
		case 'PAGE_DOWN':
			context.reverse = null;
			next();
			break;
		case 'PAGE_UP':
		case 'b':
			context.reverse = null;
			prev();
			break;
		case 'UP':
			context.reverse = null;
			if (context.render.prevLine(context))
				render();
			break;
		case 'DOWN':
			context.reverse = null;
			if (context.render.nextLine(context))
				render();
			break;
		case 'RIGHT':
			toTrace(false);
			break;
		case 'LEFT':
			toTrace(true);
			break;
		case 'HOME':
			context.reverse = null;
			goHome();
			break;
		case 'END':
			context.reverse = null;
			goEnd();
			break;
		case 'CTRL_B':
			context.reverse = null;
			prevChapter();
			break;
		case 'CTRL_D':
			context.reverse = null;
			nextChapter();
			break;
		case 'CTRL_R':
			context.reverse = null;
			reloadBook();
			break;
		case 'CTRL_X':
			context.switchRender();
			render();
			break;
		case 'q':
		case 'ESCAPE':
		case 'CTRL_C':
			exit();
			break;
		default:
	}
}

function render(noTrace) {
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
	let msg;
	let title = reading.book.tocTitle(reading.chapter);
	if (context.debug) {
		msg = `[${region.width()}:${region.height()}]${title}(${reading.line}:${reading.position})`;
		const next = context.next;
		if (next)
			msg += `=>(${next.line}:${next.position})`;
		else
			msg += '->()';
	} else
		msg = `${title}(${reading.content.length}:${reading.line})`;
	context.region.redraw();
	printStatus(msg, true);
	if (noTrace !== true)
		pushTrace();
}

function pushTrace() {
	const reading = context.reading;
	const trace = reading.trace;
	const last = trace[reading.traceIndex];
	if (last.chapter === reading.chapter && last.line === reading.line && last.position === reading.position)
		return;
	trace.splice(reading.traceIndex + 1);
	trace.push({chapter: reading.chapter, line: reading.line, position: reading.position});
	if (trace.length > traceSize)
		trace.splice(0, trace.length - traceSize);
	else
		reading.traceIndex++;
}

function toTrace(back) {
	const reading = context.reading;
	if (back)
		if (reading.traceIndex === 0)
			return;
		else
			reading.traceIndex--;
	else if (reading.traceIndex === reading.trace.length - 1)
		return;
	else
		reading.traceIndex++;
	const currentTrace = reading.trace[reading.traceIndex];
	if (reading.chapter === currentTrace.chapter) {
		reading.line = currentTrace.line;
		reading.position = currentTrace.position;
		render(true);
	} else {
		reading.chapter = currentTrace.chapter;
		reading.line = currentTrace.line;
		reading.position = currentTrace.position;
		switchChapter(reading, function () {
			render(true);
		});
	}
}

function initRender() {
	let currentTheme = null;
	context.themes.forEach(theme => {
		if (theme.name === context.themeName)
			currentTheme = theme;
	})
	if (!currentTheme)
		errorExit(`Theme ${context.themeName} not defined.`);
	term = tk.terminal;
	term.clear();
	term.grabInput();
	term.hideCursor(true);
	term.on('key', keypress)
	term.on('resize', resize)
	const width = term.width;
	const height = term.height;
	context.region = new Region(term, 0, 0, width, height - 1, currentTheme);
	statusRegion = new Region(term, 0, height - 1, width, 1, currentTheme);
}

let resizedWhenDispatch = false;

function resize(noRender) {
	const width = term.width;
	const height = term.height;
	if (dispatcher) {
		resizedWhenDispatch = true;
		dispatcher.resize(width, height);
		return;
	}
	context.region.resize(width, height - 1);
	statusRegion.y = height - 1;
	statusRegion.resize(width, 1);
	if (noRender !== true)
		render();
}

/**
 * @param book object
 * {
 *         toc: toc array {title: <string>}
 *         [imageLoader]: image loader function(<toc index>, <line index of pic>)
 *         getChapter: chapter loader function(<toc index>): content array
 *                 content: string
 *         }
 *         loader: set to reading info
 * }
 * @param reading opened file reading info
 */
function bookLoaded(book, reading, loader) {
	const origBook = context.reading.book;
	if (origBook) {
		if (context.reading.loader.unload)
			context.reading.loader.unload(context.reading.book);
		delete context.reading.book;
		delete context.reading.content;
		delete context.reading.loader;
		delete context.reading.trace;
		delete context.reading.traceIndex;
		saveAndExit(false);
	}
	consoleTitle(reading.filename);
	context.lastReading = reading.filename;
	context.reading = reading;
	context.reading.book = book;
	context.reading.trace = [{chapter: reading.chapter, line: reading.line, position: reading.position}];
	context.reading.traceIndex = 0;
	context.reading.loader = loader;
	if (book.toc.length <= reading.chapter)
		reading.chapter = book.toc.length - 1;
	switchChapter(reading, () => {
		render(true);
	});
}

function printStatus(msg, noReverse) {
	statusRegion.clear();
	statusRegion.str(0, 0, msg, {reverse: !noReverse});
	statusRegion.redraw();
}

function reportError(msg) {
	if (context.reading.book) {
		context.region.redraw();
		return printStatus(msg);
	} else {
		cleanUp();
		errorExit(msg);
	}
}

function start(reading) {
	if (!existsSync(reading.filename))
		reportError('File not exists: ' + reading.filename);
	if (!some(loaders, (name, loader) => {
		if (loader.support(reading.filename.toLowerCase())) {
			printStatus('Loading...');
			loader.load(reading, function (error, book) {
				if (error)
					return reportError(error);
				if (!book.tocTitle)
					book.tocTitle = (index) => {
						const title = book.toc[index].title;
						return title ? title : 'No name';
					};
				bookLoaded(book, reading, loader)
			});
			return true;
		} else
			return false;
	})) return reportError('Unknown filename type: ' + reading.filename);
}

exports.start = function (c, saveAndExitCallback) {
	context = c;
	saveAndExit = saveAndExitCallback;
	initRender();
	start(context.reading);
};
