/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/18
 * Time: 下午3:50
 */

const {Draw, Region, controls} = require('termdraw');
let exitAndSave;
let context;
let debugRegion;
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
		book.getChapter(reading.chapter, content => {
			reading.content = content;
			render();
		});
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
			reading.book.getChapter(reading.chapter, content => {
				reading.line = content.length - 1;
				reading.position = content[reading.line].length;
				reading.content = content;
				doPrev();
			});
		}
	} else
		doPrev();
}

function keypress(event) {
	const key = typeof event === 'object' ? event.key : event;
	switch (key) {
		case 'h':
			break;
		case '/':
			break;
		case ' ':
		case 'next':
			next();
			break;
		case 'prior':
			prev();
			break;
		case 'up':
		case 'right':
			break;
		case 'down':
		case 'left':
			break;
		case 'home':
			break;
		case 'end':
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
	if (context.debug) {
		const next = context.next;
		let msg = `[${region.width()}:${region.height()}]${reading.book.toc[reading.chapter].name}(${reading.line}:${reading.position})`
		if (next)
			msg += `=>(${next.line}:${next.position})`;
		else
			msg += '->()';
		debugRegion.clear();
		debugRegion.str(0, 0, msg);
	}
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
	let children = [];
	if (context.debug) {
		context.region = new Region({width: width, height: height - 1});
		debugRegion = new Region({width: width, height: 1});
		children.push({
			child: context.region,
			fixed: height - 1,
		}, {
			child: debugRegion,
			fixed: 1,
		});
	} else {
		context.region = new Region({width: width, height: height});
		children.push({
			child: context.region,
			fixed: height,
		});
	}
	layout = new controls.HLayout({
		width: width,
		height: height,
		children: children,
	});
}

function resize() {
	const draw = context.draw;
	const width = draw.width();
	const height = draw.height();
	layout.resize(width, height);

	const children = [];
	if (context.debug) {
		children.push({
			child: context.region,
			fixed: height - 1,
		}, {
			child: debugRegion,
			fixed: 1,
		});
	} else
		children.push({
			child: context.region,
			fixed: height,
		});
	layout.set_children(children);
	render();
}

function start() {
	const reading = context.reading;
	const book = reading.book;
	if (book.toc.length <= reading.chapter)
		reading.chapter = book.toc.length - 1;
	book.getChapter(reading.chapter, function (content) {
		context.reading.content = content;
		initRender();
		render();
	});
}

exports.start = function (c, exitAndSaveCallback) {
	context = c;
	exitAndSave = exitAndSaveCallback;
	start();
};
