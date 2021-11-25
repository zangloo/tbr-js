/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/23
 * Time: 下午5:25
 */
'use strict';

const {wcswidth} = require('ansiterm')
const Region = require('./region')
const {spChars} = require('terminal-kit')

class List extends Region {
	#boxChars

	#entries;
	#title;
	#closeCallback;
	#currentSelection;
	#topIndex;

	constructor(term, entries, title, closeCallback, opts) {
		if (!opts)
			opts = {};
		super(term, opts.x, opts.y, opts.width, opts.height, opts.theme);
		if (!opts)
			opts = {};
		this.#boxChars = spChars.box.double;
		this.#closeCallback = closeCallback;
		this.#entries = entries;
		this.#title = title;
		this.#currentSelection = (opts.selectedIndex === undefined ? 0 : opts.selectedIndex);
		this.#topIndex = 0;

		this.#refresh(this.height() - 2);
	}

	keypress(key) {
		const maxLines = this.height() - 2;
		switch (key) {
			case 'DOWN':
				if (this.#currentSelection === this.#entries.length - 1)
					break;
				this.#currentSelection++;
				this.#refresh(maxLines);
				break;
			case 'UP':
				if (this.#currentSelection === 0)
					break;
				this.#currentSelection--;
				this.#refresh(maxLines);
				break;
			case 'PAGE_DOWN':
				if (this.#currentSelection === this.#entries.length - 1)
					break;
				this.#currentSelection += maxLines;
				if (this.#currentSelection >= this.#entries.length)
					this.#currentSelection = this.#entries.length - 1;
				this.#refresh(maxLines)
				break;
			case 'PAGE_UP':
				if (this.#currentSelection === 0)
					break;
				this.#currentSelection -= maxLines;
				if (this.#currentSelection < 0)
					this.#currentSelection = 0;
				this.#refresh(maxLines);
				break;
			case 'END':
				this.#currentSelection = this.#entries.length - 1;
				this.#refresh(maxLines);
				break;
			case 'HOME':
				this.#currentSelection = this.#topIndex = 0;
				this.#refresh(maxLines);
				break;
			case 'ENTER':
				// return key
				this.#closeCallback(this.#entries[this.#currentSelection], this.#currentSelection);
				this.#closeCallback = null;
				break;
			case 'q':
			case 'ESCAPE':
			case 'CTRL_C':
				this.#closeCallback(null);
				this.#closeCallback = null;
				break;
		}
	}

	resize(width, height) {
		super.resize(width, height);
		this.#refresh(height - 2);
	}

	#refresh(resetTopLines) {
		if (resetTopLines && (this.#currentSelection < this.#topIndex || this.#currentSelection >= this.#topIndex + resetTopLines)) {
			this.#topIndex = 0;
			while (this.#topIndex + resetTopLines <= this.#currentSelection)
				this.#topIndex += resetTopLines;
		}
		this.clear();
		this.#preDrawSelf();
		const width = this.width() - 2;
		let lines = Math.min(this.#entries.length - this.#topIndex, this.height() - 2);
		for (let i = 0; i < lines; i++) {
			const entryIndex = i + this.#topIndex;
			const entry = this.#entries[entryIndex];
			const y = i + 1;
			let text = this.entryText(entry)
			while (wcswidth(text) > width)
				text = text.substr(1);
			this.str(1, y, text, entryIndex === this.#currentSelection ? {reverse: true} : null);
		}
		this.redraw();
	}

	#preDrawSelf = function () {
		const titleText = this.#makeTitle();
		const width = this.width();
		const height = this.height();
		// Draw the top border
		const boxChars = this.#boxChars;
		let x = this.chr(0, 0, boxChars.topLeft, this.theme);
		x = this.str(x, 0, '[ ', this.theme);
		x = this.str(x, 0, titleText, this.theme);
		x = this.str(x, 0, ' ]');
		for (; x < width - 1; x++)
			this.chr(x, 0, boxChars.horizontal, this.theme);
		this.chr(width - 1, 0, boxChars.topRight, this.theme);

		// Draw the bottom border
		this.chr(0, height - 1, boxChars.bottomLeft, this.theme);
		for (let x = 1; x < width - 1; x++)
			this.chr(x, height - 1, boxChars.horizontal, this.theme);
		this.chr(width - 1, height - 1, boxChars.bottomRight, this.theme);

		// Draw the left and right border
		for (let y = 1; y < height - 1; y++) {
			this.chr(0, y, boxChars.vertical);
			this.chr(width - 1, y, boxChars.vertical);
		}
	}

	#makeTitle() {
		return `${this.#title}: (${this.#entries.length}:${this.#currentSelection + 1})`;
	}
}

module.exports = List;
