/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/24
 * Time: 下午6:35
 */
'use strict'
const {wcswidth} = require('ansiterm');
const {Palette} = require('terminal-kit')

class Region {
	term

	#computed
	theme
	#width
	#height
	#buffer
	#palette

	constructor(term, x, y, width, height, theme) {
		this.term = term;
		this.#palette = new Palette();
		this.#computed = {x: x === undefined ? 1 : x + 1, y: y === undefined ? 1 : y + 1,};
		this.theme = theme;
		this.theme = theme;
		this.#width = width || term.width;
		this.#height = height || term.height;
		this.theme = theme;
		this.#initBuffer();
	}

	#initBuffer() {
		this.#buffer = [];
		for (let y = 0; y < this.#height; y++) {
			const row = [];
			for (let x = 0; x < this.#width; x++)
				row.push({char: ' '});
			this.#buffer.push(row);
		}
		this.clear();
	}

	clear() {
		for (let y = 0; y < this.#height; y++)
			for (let x = 0; x < this.#width; x++)
				this.#buffer[y][x] = {char: ' '};
	}

	chr(x, y, char, format) {
		this.#buffer[y][x++] = {char: char, format: format};
		const wc = wcswidth(char);
		for (let i = 1; i < wc; i++)
			this.#buffer[y][x++] = null;
		return x;
	}

	width() {
		return this.#width;
	}

	height() {
		return this.#height;
	}

	set x(value) {
		this.#computed.x = value + 1;
	}

	set y(value) {
		this.#computed.y = value + 1;
	}

	resize(width, height) {
		this.#width = width;
		this.#height = height;
		this.#initBuffer();
	}

	redraw() {
		const xShift = this.#computed.x;
		const yShift = this.#computed.y;
		const colorIndex = this.theme ? this.#palette.colorNameToIndex(this.theme.color) : -1;
		const backgroundIndex = this.theme ? this.#palette.colorNameToIndex(this.theme.background) : -1;
		let themePrefix = '';
		let reversPrefix = '';
		if (this.theme) {
			themePrefix = this.#palette.escape[colorIndex];
			themePrefix += this.#palette.bgEscape[backgroundIndex];
			reversPrefix = this.#palette.escape[backgroundIndex];
			reversPrefix += this.#palette.bgEscape[colorIndex];
		}
		let reversing = false;
		for (let y = 0; y < this.#height; y++) {
			let str = '';
			this.term.moveTo(xShift, y + yShift);
			for (let x = 0; x < this.#width; x++) {
				const char = this.#buffer[y][x];
				if (!char) continue;
				if (char.format && char.format.reverse) {
					reversing = true;
					str += reversPrefix;
				} else if (reversing) {
					reversing = false;
					str += themePrefix;
				}
				str += char.char;
			}
			this.term.raw(str);
		}
		if (reversing)
			this.term.raw(themePrefix);
	}

	str(x, y, string, format) {
		if (!string) return;
		for (let c = 0; c < string.length; c++)
			x = this.chr(x, y, string[c], format);
		return x;
	}
}


module.exports = Region;
