const print = console.log;
const LS = localStorage; // client side data storage

function ctrlsPopup() { // opens a popup window with keybinds

	const p = window.open('controls.html', 'popup', 'width=1200,height=800');
	var reloading = false;

	setInterval(() => {
		// event onbeforeunload wont work and idk why so i gotta use this
		if (p.closed && !reloading) {
			location.reload();
			reloading = true;
		}
	}, 100);

}

// Array.prototype.getRand = function () {
// 	return this[Math.floor(Math.random() * this.length)];
// };
// Array.prototype.shuffle = function () {
//     let i = this.length, j, temp;
//     if (i == 0) return this;
//     while ( --i ) {
//         j = Math.floor( Math.random() * ( i + 1 ) );
//         temp = this[i];
//         this[i] = this[j];
//         this[j] = temp;
//     }
//     return this;
// };


//! Use Object.defineProperty instead of directly modifying Array.prototype
//! https://stackoverflow.com/a/35518127

Object.defineProperty(Array.prototype, 'getRand', { // returns random element from array

	//? this function is unused, delete? - g3ner1c

    value: function() {
		return this[Math.floor(Math.random() * (this.length + 1))];
	}

});

Object.defineProperty(Array.prototype, 'shuffle', {

	value: function() { // shuffles array

		let i = this.length, j, temp;
	
		if (i == 0) return this; // array length 0
	
		while (--i) {
			j = Math.floor(Math.random() * (i + 1));
			temp = this[i];
			this[i] = this[j];
			this[j] = temp;
		}
		return this;
	}
});

var ctrl = { // default controls

	//? should probably add handling settings in here - g3ner1c

	ArrowLeft: 'L',
	ArrowRight: 'R',
	ArrowDown: 'SD',
	Space: 'HD',
	ShiftLeft: 'HL',
	KeyZ: 'CW',
	KeyX: 'CCW',
	KeyC: 'R180',
	KeyR: 'RE',
	KeyT: 'UNDO',
	KeyY: 'REDO',

};

const color = { // piece colors
	Z: '#F00',
	L: '#F80',
	O: '#FF0',
	S: '#0F0',
	I: '#0BF',
	J: '#05F',
	T: '#C3F',
	A: '#2A2A2A',
	X: '#999999',
};

const reversed = { // mirrored pieces
	Z: 'S',
	L: 'J',
	O: 'O',
	S: 'Z',
	I: 'I',
	J: 'L',
	T: 'T',
	A: 'A',
	X: 'X',
	'|': '|',
};

var imgs = { // piece images
	grid: './assets/pieceSprite/grid.png',
	Z: './assets/pieceSprite/z.png',
	L: './assets/pieceSprite/l.png',
	O: './assets/pieceSprite/o.png',
	S: './assets/pieceSprite/s.png',
	I: './assets/pieceSprite/i.png',
	J: './assets/pieceSprite/j.png',
	T: './assets/pieceSprite/t.png',
};

// default settings
var cellSize = 20; // pixels
var boardSize = [10, 40];
var hiddenRows = 20; // starts from the top

var DAS = 160;
var ARR = 30;
var SDR = 15;


//* client side config storage

//? Sketchy settings processing probably could be simplified
//? Should probably add handling settings in here in the future - g3ner1c

if (LS.config && LS.version == '2021-10-12a') {

	// Load saved config from LocalStorage

	const CTRLS = JSON.parse(LS.config);

	let codes = Object.values(ctrl); // Action codes

	ctrl = {};
	for (let i = 0; i < 11; i++) {
		ctrl[CTRLS[i]] = codes[i];
	}
	DAS = parseInt(CTRLS[11]);
	ARR = parseInt(CTRLS[12]);
	SDR = parseInt(CTRLS[13]);
	cellSize = parseInt(CTRLS[14]);

} else {

	// No config found or outdated version, make new

	let codes = Object.keys(ctrl); // Deafult keys
	codes.push('160', '30', '15', '20'); // Handling settings
	LS.config = JSON.stringify(codes);
	aboutPopup();

}

const notf = $('#notif');

const names = 'ZLOSIJT'.split(''); // piece names

const spawn = [Math.round(boardSize[0] / 2) - 2, hiddenRows - 3];
const a = { t: 0, c: '' }; // t:0 = nothing   t:1 = heap mino   t:2 = current mino   t:3 = ghost mino
//? ^^ ??? - g3ner1c

var aRow = function () {
    // var instead of const because aRow varies across modes
	return '.'
		.repeat(boardSize[0])
		.split('')
		.map(() => {
			return a;
		});
};
const rotDir = {
	CW: 1,
	CCW: 3,
	R180: 2,
};

var sfxCache = {};
var charging = false;
var charged = false;
var board = [];
var queue = [];
var piece = '';
var holdP = '';
var held = false;
var Ldn = (Rdn = false);
var rot = 0;
var dasID = (sdID = 0);
var sdINT = (dasINT = null);
var xPOS = spawn[0];
var yPOS = spawn[1];
var xGHO = spawn[0];
var yGHO = spawn[1];
var lastAction = '';
var hist = [];
var histPos = 0;
var ctx = document.getElementById('b').getContext('2d');
var ctxH = document.getElementById('h').getContext('2d');
var ctxN = document.getElementById('n').getContext('2d');
var gridCvs = document.createElement('canvas');
gridCvs.height = cellSize;
gridCvs.width = cellSize;
var gridCtx = gridCvs.getContext('2d');
gridCtx.fillStyle = '#000000';
gridCtx.fillRect(0, 0, cellSize, cellSize);
gridCtx.strokeStyle = '#3A3A3A';
gridCtx.strokeRect(0, 0, cellSize, cellSize);
var pattern = ctx.createPattern(gridCvs, 'repeat');
for (let i = 0; i < boardSize[1]; i++) {
	board.push(aRow());
}
document.getElementById('b').height = (boardSize[1] - hiddenRows + 2) * cellSize;
document.getElementById('b').width = boardSize[0] * cellSize;

var keys = Object.keys(imgs);
keys.map((k, idx) => {
	var i = new Image();
	i.onload = () => {
		imgs[k] = i;
		if (idx + 1 == keys.length)
			setTimeout(() => {
				callback();
			}, 250); // Load images first, then load game after
	};
	i.src = imgs[k];
});

// Keys
var keysDown;
var lastKeys;

var flags = {
	HD: 1,
	R: 2,
	L: 4,
	SD: 8,
	HL: 16,
	CW: 32,
	CCW: 64,
	R180: 128,
	UNDO: 256,
	REDO: 512,
	RE: 1024,
};

var shiftDir = 0;
var shiftReleased = true;
var shiftDelay;
var arrDelay;

// mouse stuff for drawing

mouseY = 0; // which cell on the board the mouse is over
mouseX = 0;
mouseDown = false;
drawMode = true;
movingCoordinates = false;

document.getElementById('b').onmousemove = function mousemove(e) {
	rect = document.getElementById('b').getBoundingClientRect();
	y = Math.floor((e.clientY - rect.top - 18) / cellSize);
	x = Math.floor((e.clientX - rect.left - 18) / cellSize);

	if (inRange(x, 0, 9) && inRange(y, 0, 21)) {
		movingCoordinates = y != mouseY || x != mouseX;

		mouseY = y;
		mouseX = x;

		if (mouseDown && movingCoordinates) {
			if (!drawMode) {
				board[boardSize[1] + mouseY - hiddenRows - 2][mouseX] = { t: 0, c: '' };
			} else {
				board[boardSize[1] + mouseY - hiddenRows - 2][mouseX] = { t: 1, c: paintbucketColor() };
			}
			updateGhost();
		}
	}
};

document.getElementById('b').onmousedown = function mousedown(e) {
	rect = document.getElementById('b').getBoundingClientRect();
	mouseY = Math.floor((e.clientY - rect.top - 18) / cellSize);
	mouseX = Math.floor((e.clientX - rect.left - 18) / cellSize);

	if (inRange(mouseX, 0, 9) && inRange(mouseY, 0, 21)) {
		if (!mouseDown) {
			movingCoordinates = false;
			drawMode = e.button != 0 || board[boardSize[1] + mouseY - hiddenRows - 2][mouseX]['t'] == 1;
			if (drawMode) {
				board[boardSize[1] + mouseY - hiddenRows - 2][mouseX] = { t: 0, c: '' };
			} else {
				board[boardSize[1] + mouseY - hiddenRows - 2][mouseX] = { t: 1, c: paintbucketColor() };
			}
			updateGhost();
		}
		mouseDown = true;
		drawMode = board[boardSize[1] + mouseY - hiddenRows - 2][mouseX]['t'] == 1;
	}
};

document.onmouseup = function mouseup() {
	mouseDown = false;

	if (drawMode) {
		// compare board with hist[histPos]['board'] and attempt to autocolor
		drawn = [];
		erased = [];
		oldBoard = JSON.parse(hist[histPos]['board']);
		board.map((r, i) => {
			r.map((c, ii) => {
				if (c.t == 1 && c.c != oldBoard[i][ii].c) drawn.push({ y: i, x: ii });
				if (c.t == 0 && 1 == oldBoard[i][ii].t) erased.push({ y: i, x: ii });
			});
		});
		if (drawn.length == 4 && document.getElementById('autocolor').checked) {
			// try to determine which tetramino was drawn
			// first entry should be the topleft one

			names.forEach((name) => {
				// jesus christ this is a large number of nested loops
				checkPiece = pieces[name];
				checkPiece.forEach((rot) => {
					for (y = 0; y <= 2; y++) {
						for (x = 0; x <= 2; x++) {
							matches = 0;
							for (row = 0; row < 4; row++) {
								for (col = 0; col < 4; col++) {
									if (rot[row][col] == 1) {
										checkY = row + drawn[0].y - y;
										checkX = col + drawn[0].x - x;
										drawn.forEach((coordinate) => {
											if (coordinate.x == checkX && coordinate.y == checkY) {
												matches++;
											}
										});
									}
								}
							}
							if (matches == 4) {
								// that's a match; color it
								drawn.forEach((coordinate) => {
									board[coordinate.y][coordinate.x].c = name;
								});
							}
						}
					}
				});
			});
		}
		if (drawn.length != 0 || erased.length != 0) updateHistory();
	}
};

function paintbucketColor() {
	for (i = 0; i < document.paintbucket.length; i++) {
		if (document.paintbucket[i].checked) {
			return document.paintbucket[i].id;
		}
	}
}

// queue
document.getElementById('n').addEventListener('click', (event) => {
	let QueueInput = prompt('Queue', piece + queue.join('')).toUpperCase();
	// ok there's probably a regex way to do this but...
	temp = [];
	for (i = 0; i < QueueInput.length; i++) {
		//sanitization
		if ('SZLJIOT'.includes(QueueInput[i])) temp.push(QueueInput[i]);
	}
	if (temp.length > 0) {
		temp.push('|'); // could probably insert one every 7 pieces but am too lazy
		queue = temp;
		newPiece();
	}
});

// hold
document.getElementById('h').addEventListener('click', (event) => {
	let HoldInput = prompt('Hold', holdP).toUpperCase();
	if (HoldInput.length == 0) {
		holdP = '';
		updateQueue();
		return;
	}
	HoldInput = HoldInput[0]; // make sure it's just 1 character
	//sanitization
	if ('SZLJIOT'.includes(HoldInput)) {
		holdP = HoldInput;
		updateQueue();
	}
});

// Mobile buttons
const ua = navigator.userAgent;
if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
	console.log('why do you even have a tablet');
	document.getElementById('tcc').style.display = 'inline-block';
} else if (
	/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)
) {
	console.log('mobile is bad and you should feel bad');
	document.getElementById('tcc').style.display = 'inline-block';
} // else document.getElementById("tcc").style.display = 'none';

function updateHistory() {
	histPos++;
	hist[histPos] = {
		board: JSON.stringify(board),
		queue: JSON.stringify(queue),
		hold: holdP,
		piece: piece,
	};
	if (histPos > 500) {
		// just in case hist is taking up too much memory
		hist.splice(0, 100);
		histPos -= 100;
	}
	while (histPos < hist.length - 1) {
		// remove future history if it exists
		hist.pop();
	}
}

function updateGhost() {
	// updateGhost() must ALWAYS be before setShape()
	xGHO = xPOS;
	yGHO = yPOS;
	while (canMove(pieces[piece][rot], xGHO, yGHO + 1)) {
		yGHO++;
	}
}

function canMove(p, x, y) {
	var free = 0;
	for (let row = 0; row < 4; row++) {
		for (let cell = 0; cell < 4; cell++) {
			if (p[row][cell] == 1) {
				if (board[y + row] && board[y + row][x + cell] && board[y + row][x + cell].t != 1) {
					free++;
				}
			}
		}
	}
	return free >= 4;
}

function checkTopOut() {
	p = pieces[piece][rot];
	for (r = 0; r < p.length; r++) {
		for (c = 0; c < p[0].length; c++) {
			if (p[r][c] != 0) {
				if (board[r + yPOS][c + xPOS].t == 1) {
					notify('TOP OUT');
				}
			}
		}
	}
}

function setShape(hd) {
	var p = pieces[piece][rot];
	p.map((r, i) => {
		r.map((c, ii) => {
			var rowG = board[i + yGHO];
			if (c == 1 && rowG && rowG[ii + xGHO]) rowG[ii + xGHO] = { t: 3, c: piece };
			var rowP = board[i + yPOS];
			if (c == 1 && rowP && rowP[ii + xPOS]) rowP[ii + xPOS] = { t: hd ? 1 : 2, c: piece };
		});
	});
	//render()
}

function clearActive() {
	board.map((r, i) => {
		r.map((c, ii) => {
			if (c.t == 2 || (c.t == 3 && board[i][ii])) {
				board[i][ii].t = 0;
				board[i][ii].c = '';
			}
		});
	});
}

function newPiece() {
	while (queue.length < 10) {
		var shuf = names.shuffle();
		shuf.map((p) => queue.push(p));
		queue.push('|');
	}
	xPOS = spawn[0];
	yPOS = spawn[1];
	rot = 0;
	if (queue[0] == '|') queue.shift();
	piece = queue.shift();
	checkTopOut();
	updateQueue();
	updateGhost();
	setShape();

	if (keysDown & flags.L) {
		lastKeys = keysDown;
		shiftDelay = DAS;
		shiftReleased = false;
		shiftDir = -1;
	} else if (keysDown & flags.R) {
		lastKeys = keysDown;
		shiftDelay = DAS;
		shiftReleased = false;
		shiftDir = 1;
	}
}

function notify(text) {
	const inANIM = 'animate__animated animate__bounceIn';
	const outANIM = 'animate__animated animate__fadeOutDown';
	notf.removeClass(inANIM);
	notf.removeClass(outANIM);
	notf.html(text);
	notf.addClass(inANIM);
	setTimeout(() => {
		notf.removeClass(inANIM);
		notf.addClass(outANIM);
	}, 1000);
}

function undo() {
	if (histPos > 0) {
		histPos--;
		board = JSON.parse(hist[histPos]['board']);
		queue = JSON.parse(hist[histPos]['queue']);
		holdP = hist[histPos]['hold'];
		piece = hist[histPos]['piece'];

		xPOS = spawn[0];
		yPOS = spawn[1];
		rot = 0;
		clearActive();
		updateGhost();
		setShape();
		updateQueue();
	}
}

function redo() {
	if (histPos < hist.length - 1) {
		board = JSON.parse(hist[histPos + 1]['board']);
		queue = JSON.parse(hist[histPos + 1]['queue']);
		holdP = hist[histPos + 1]['hold'];
		piece = hist[histPos + 1]['piece'];
		histPos++;

		xPOS = spawn[0];
		yPOS = spawn[1];
		rot = 0;
		clearActive();
		updateGhost();
		setShape();
		updateQueue();
	}
}
