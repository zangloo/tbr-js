/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/23
 * Time: 下午5:25
 */
'use strict';

const {controls} = require('termdraw')
const {wcswidth} = require('ansiterm')

/**
 *
 * @param c context
 * @param callback if selected, called with a argument: <reading info from history list>
 */
class List {
	#context;
	#box;
	#entries;
	#closeCallback;
	#currentSelection;
	#topIndex;

	constructor(context, closeCallback, opts) {
		this.#context = context;
		this.#closeCallback = closeCallback;
		this.#entries = opts.entries;
		this.#currentSelection = (opts.selectedIndex === undefined ? 0 : opts.selectedIndex);
		this.#topIndex = 0;

		const draw = context.draw;
		const width = draw.width();
		const height = draw.height();
		this.#box = new controls.Box({
			width: width,
			height: height,
			title: this.#makeTitle(),
		});
		this.#refresh(draw, height - 2);
	}

	keypress(key) {
		const draw = this.#context.draw;
		const maxLines = draw.height() - 2;
		switch (key) {
			case 'down':
				if (this.#currentSelection === this.#entries.length - 1)
					break;
				this.#currentSelection++;
				this.#refresh(draw, maxLines);
				break;
			case 'up':
				if (this.#currentSelection === 0)
					break;
				this.#currentSelection--;
				this.#refresh(draw, maxLines);
				break;
			case 'next':
				if (this.#currentSelection === this.#entries.length - 1)
					break;
				this.#currentSelection += maxLines;
				if (this.#currentSelection >= this.#entries.length)
					this.#currentSelection = this.#entries.length - 1;
				this.#refresh(draw, maxLines)
				break;
			case 'prior':
				if (this.#currentSelection === 0)
					break;
				this.#currentSelection -= maxLines;
				if (this.#currentSelection < 0)
					this.#currentSelection = 0;
				this.#refresh(draw, maxLines);
				break;
			case 'end':
				this.#currentSelection = this.#entries.length - 1;
				this.#refresh(draw, maxLines);
				break;
			case 'home':
				this.#currentSelection = this.#topIndex = 0;
				this.#refresh(draw, maxLines);
				break;
			case '^M':
				// return key
				this.#closeCallback(this.#entries[this.#currentSelection], this.#currentSelection);
				this.#closeCallback = null;
				break;
			case 'q':
			case '^[':
			case '^C':
				this.#closeCallback(null);
				this.#closeCallback = null;
				break;
		}
	}

	resize() {
		const draw = this.#context.draw;
		const height = draw.height();
		this.#box.resize(draw.width(), height);
		this.#refresh(draw, height - 2);
	}

	#refresh(draw, resetTopLines) {
		if (resetTopLines && (this.#currentSelection < this.#topIndex || this.#currentSelection >= this.#topIndex + resetTopLines)) {
			this.#topIndex = 0;
			while (this.#topIndex + resetTopLines <= this.#currentSelection)
				this.#topIndex += resetTopLines;
		}
		// set title will call _redo that clear the box and draw the border
		this.#box.set_title(this.#makeTitle());
		const width = draw.width() - 2;
		let lines = Math.min(this.#entries.length - this.#topIndex, this.#box.height() - 2);
		for (let i = 0; i < lines; i++) {
			const entryIndex = i + this.#topIndex;
			const entry = this.#entries[entryIndex];
			const y = i + 1;
			let text = this.title(entry)
			while (wcswidth(text) > width)
				text = text.substr(1);
			this.#box.str(1, y, text, entryIndex === this.#currentSelection ? {reverse: true} : null);
		}
		draw.redraw(this.#box, true);
	}

	#makeTitle() {
		return `select file from history: (${this.#entries.length}:${this.#currentSelection + 1})`;
	}
}

module.exports = List;
