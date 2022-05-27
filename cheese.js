function garbageHeight() {
	for (row = 0; row < board.length; row++) {
		for (col = 0; col < board[0].length; col++) {
			if (board[row][col].c == 'X') return board.length - row;
		}
	}
	return 0;
}

function aboutPopup() {
	window.alert(`START BY ADJUSTING KEYBINDS AND SETTINGS
zztetris
a tetris client with a name that starts with zz so you can type zz and have it autocomplete
forked from aznguy's schoolteto, a number of features added
inspired by fio's four-tris
---
Import/Export works through your clipboard.  
Undo/redo is a thing. It keeps track of your board state history.
*Full* fumen import/export sets your board state history as the fumen pages and vice versa.
Drawing on the board is a thing.`);
}

function restart() {
	if (board[board.length - 1].filter((c) => c.t == 0).length == boardSize[0]) {
		// lazy check, will have false positives, but whatever
		if (queue[6] == '|' && holdP == '') {
			// if they reset after resetting, just restart hist
			hist = [
				{
					board: JSON.stringify(board),
					queue: JSON.stringify(queue),
					hold: holdP,
					piece: piece,
				},
			];
			histPos = 0;
		}
	}
	board = [];
	for (let i = 0; i < boardSize[1]; i++) {
		board.push(aRow());
	}

	curCol = Math.floor(Math.random() * 10);
	while (garbageHeight() < 10) {
		while (curCol == lastCol) {
			curCol = Math.floor(Math.random() * 10);
		}
		garbage(curCol);
		lastCol = curCol;
	}

	queue = [];
	rot = 0;
	piece = '';
	holdP = '';
	held = false;
	xPOS = spawn[0];
	yPOS = spawn[1];
	xGHO = spawn[0];
    yGHO = spawn[1];
    
    combo = -1;
    b2b = -1;
	newPiece();
}

function updateQueue() {
	temp = false;
	ctxN.clearRect(0, 0, 90, 360);
	ctxH.clearRect(0, 0, 90, 60);
	for (let i = 0; i < 7; i++) {
		if (queue[i] == '|') {
			ctxN.beginPath();
			ctxN.moveTo(0, i * 60);
			ctxN.lineTo(90, i * 60);
			ctxN.stroke();
			temp = true;
		} else {
			j = i;
			if (temp) j--;
			ctxN.drawImage(imgs[queue[i]], 0, j * 60);
		}
	}
	if (holdP) ctxH.drawImage(imgs[holdP], 0, 0);
}

function shuffleQueue() {
	// locate bag separator
	index = 0;
	while (index < queue.length && queue[index] != '|') index++;

	tempQueue = queue.slice(0, index).concat(piece).shuffle().concat('|');
	// the queue before the bag separator (the current bag), plus active piece; shuffle it; add bag separator to end
	piece = tempQueue.shift();
	queue = tempQueue;

	while (queue.length < 10) {
		var shuf = names.shuffle();
		shuf.map((p) => queue.push(p));
		queue.push('|');
	}
	xPOS = spawn[0];
	yPOS = spawn[1];
	rot = 0;
	clearActive();
	checkTopOut();
	updateQueue();
	updateGhost();
	setShape();
	updateHistory();
}

function shuffleQueuePlusHold() {
	if (!holdP) {
		shuffleQueue();
		return;
	}

	index = 0;
	while (index < queue.length && queue[index] != '|') index++;

	tempQueue = queue.slice(0, index).concat(piece, holdP).shuffle().concat('|');
	holdP = tempQueue.shift();
	piece = tempQueue.shift();
	queue = tempQueue;

	while (queue.length < 10) {
		var shuf = names.shuffle();
		shuf.map((p) => queue.push(p));
		queue.push('|');
	}
	xPOS = spawn[0];
	yPOS = spawn[1];
	rot = 0;
	clearActive();
	checkTopOut();
	updateQueue();
	updateGhost();
	setShape();
	updateHistory();
}

function updateKickTable() {
	kicks = kicksets[document.getElementById('kickset').value];
}

function callback() {
	// pieces = SRSX.pieces;
	// kicks = SRSX.kicks;
	kicks = kicksets['SRS+'];
	lastCol = Math.floor(Math.random() * 10);

	keysDown = 0;
	lastKeys = 0;
	shiftDir = 0;
	shiftReleased = true;

	document.addEventListener('keydown', function (e) {
		const input = ctrl[e.code];
		if (input) keysDown |= flags[input];
		if (e.repeat) return;
		if (input) {
			switch (input) {
				case 'SD':
					sdID++;
					softDrop(sdID);
					break;
				case 'HD':
					hardDrop();
					break;
				case 'HL':
					hold();
					break;
				case 'CW':
					rotate('CW');
					break;
				case 'CCW':
					rotate('CCW');
					break;
				case 'R180':
					rotate('R180');
					break;
				case 'RE':
					restart();
					break;
				case 'UNDO':
					undo();
					break;
				case 'REDO':
					redo();
					break;
			}
		}
	});

	document.addEventListener('keyup', function (e) {
		const input = ctrl[e.code];
		if (input) {
			if (keysDown & flags[input]) keysDown ^= flags[input];
			if (input == 'SD') sdID++;
			if (!(keysDown & flags.L) && !(keysDown & flags.R)) {
				dasID++;
				charged = false;
			}
		}
	});

	newPiece();
	hist = [
		{
			board: JSON.stringify(board),
			queue: JSON.stringify(queue),
			hold: holdP,
			piece: piece,
		},
	];
	histPos = 0;
	restart();
	setInterval(() => {
		if (document.getElementById('grav').checked) move('SD');
	}, 700);

	function playSnd(sfx, overlap) {
		if (sfxCache[sfx] && !overlap) return sfxCache[sfx].play();
		var s = new Audio(`assets/sfx/${sfx}.wav`);
		sfxCache[sfx] = s;
		s.play();
	}

	function move(dir) {
		switch (dir) {
			case 'L':
				if (canMove(pieces[piece][rot], xPOS - 1, yPOS)) {
					xPOS--;
					updateGhost();
					playSnd('Move');
					lastAction = 'L';
				}
				break;
			case 'R':
				if (canMove(pieces[piece][rot], xPOS + 1, yPOS)) {
					xPOS++;
					updateGhost();
					playSnd('Move');
					lastAction = 'R';
				}
				break;
			case 'SD':
				if (canMove(pieces[piece][rot], xPOS, yPOS + 1)) {
					yPOS++;
					lastAction = 'SD';
				}
				break;
		}
		clearActive();
		setShape();
	}

	function rotate(dir) {
		var newRot = (rot + rotDir[dir]) % 4;

		for (const kick of kicks[`${piece == 'I' ? 'I' : 'N'}${rot}-${newRot}`]) {
			if (canMove(pieces[piece][newRot], xPOS + kick[0], yPOS - kick[1])) {
				// Y is inverted lol
				xPOS += kick[0];
				yPOS -= kick[1];
				rot = newRot;
				playSnd('Rotate', true);
				lastAction = 'ROT';
				break;
			}
		}

		clearActive();
		updateGhost();
		setShape();
	}

	function das(dir, id) {
		move(dir);
		if (charged) {
			for (let i = 0; i < (ARR == 0 ? boardSize[0] : 1); i++) {
				var looooop = setInterval(function () {
					if (dasID == id) {
						move(dir);
					} else {
						clearInterval(looooop);
					}
				}, ARR);
			}
		} else {
			charging = true;
			setTimeout(() => {
				charging = false;
				charged = true;
				for (let i = 0; i < (ARR == 0 ? boardSize[0] : 1); i++) {
					var looooop = setInterval(function () {
						if (dasID == id) {
							move(dir);
						} else {
							clearInterval(looooop);
						}
					}, ARR);
				}
			}, DAS);
		}
	}

	function softDrop(id) {
		if (SDR) {
			var loop = setInterval(function (a) {
				if (sdID == id) {
					move('SD');
				} else {
					clearInterval(loop);
				}
			}, SDR);
		} else {
			// SDR is 0ms = instant SD
			var loop = setInterval(() => {
				if (sdID == id) {
					yPOS = yGHO;
					clearActive();
					setShape();
				} else {
					clearInterval(loop);
				}
			}, 0);
		}
	}

	function checkShift() {
		// moving left/right with DAS and whatever
		// just pressed
		if (keysDown & flags.L && !(lastKeys & flags.L)) {
			shiftDelay = 0;
			arrDelay = 0;
			shiftReleased = true;
			shiftDir = -1;
            charged = false;
			dasID++;
			das('L', dasID);
		}
		if (keysDown & flags.R && !(lastKeys & flags.R)) {
			shiftDelay = 0;
			arrDelay = 0;
			shiftReleased = true;
			shiftDir = 1;
            charged = false;
			dasID++;
			das('R', dasID);
		}

		// just released
		else if (!(keysDown & flags.R) && lastKeys & flags.R && keysDown & flags.L) {
			shiftDir = -1;

			dasID++;
			das('L', dasID);
		} else if (!(keysDown & flags.L) && lastKeys & flags.L && keysDown & flags.R) {
			shiftDir = 1;

			dasID++;
			das('R', dasID);
		} else if ((!(keysDown & flags.L) && lastKeys & flags.L) || (!(keysDown & flags.R) && lastKeys & flags.R)) {
			shiftDelay = 0;
			arrDelay = 0;
			shiftReleased = true;
			shiftDir = 0;

			dasID++;
			//charged = false;
		} else if (!(keysDown & flags.L) && !(keysDown & flags.R)) {
			dasID++;
			charged = false;
		}

		/*
        
		// Handle events
		if (shiftDir) {
			// 1. When key pressed instantly move over once.
			if (shiftReleased) {
				//shift(shiftDir);
				if (shiftDir == -1) move('L');
				if (shiftDir == 1) move('R');
				shiftDelay++;
				shiftReleased = false;
				// 2. Apply DAS delay
			} else if (shiftDelay < DAS) {
				shiftDelay++;
				// 3. Once the delay is complete, move over once.
				//     Increment delay so this doesn't run again.
			} else if (shiftDelay === DAS && DAS !== 0) {
				//shift(shiftDir);
				if (shiftDir == -1) move('L');
				if (shiftDir == 1) move('R');
				if (ARR !== 0) shiftDelay++;
				// 4. Apply ARR delay
			} else if (arrDelay < ARR) {
				arrDelay++;
				// 5. If ARR Delay is full, move piece, and reset delay and repeat.
			} else if (arrDelay === ARR && ARR !== 0) {
				//shift(shiftDir);
				if (shiftDir == -1) move('L');
				if (shiftDir == 1) move('R');
			} else if (ARR === 0) {
				for (let i = 0; i < 9; i++) {
					if (shiftDir == -1) move('L');
					if (shiftDir == 1) move('R');
				}
			}
        }
        */

		if (lastKeys !== keysDown) {
			lastKeys = keysDown;
		}
	}

	function hardDrop() {
		yPOS = yGHO;
		held = false;

		playSnd('HardDrop', true);
		setShape(true);
		clearActive();
		cleared = checkLines();
		newPiece();

		if (cleared == 0) {
			curCol = Math.floor(Math.random() * 10);
			while (garbageHeight() < 10) {
				while (curCol == lastCol) {
					curCol = Math.floor(Math.random() * 10);
				}
				garbage(curCol);
				lastCol = curCol;
			}
		} else if (garbageHeight() < 3) {
			while (curCol == lastCol) {
				curCol = Math.floor(Math.random() * 10);
			}
			garbage(curCol);
			lastCol = curCol;
		}

		lastAction = 'HD';

		updateHistory();
	}

	function hold() {
		//if(held) return;
		rot = 0;
		xPOS = spawn[0];
		yPOS = spawn[1];
		held = true;
		if (holdP) {
			holdP = [piece, (piece = holdP)][0];
		} else {
			holdP = piece;
			if (queue[0] == '|') queue.shift();
			piece = queue.shift();
		}
		playSnd('Hold');
		clearActive();
		checkTopOut();
		updateGhost();
		setShape();
		updateQueue();
		lastAction = 'HOLD';
	}

	function checkLines() {
		tspin = false;
		mini = false;
		pc = false;
		if (piece == 'T' && lastAction == 'ROT') {
			corners = [
				[yPOS + 1, xPOS],
				[yPOS + 1, xPOS + 2],
				[yPOS + 3, xPOS + 2],
				[yPOS + 3, xPOS],
			];
			facingCorners = [corners[rot], corners[(rot + 1) % 4]];

			filledCorners = 0;
			corners.forEach((corner) => {
				if (corner[0] >= 40 || corner[1] < 0 || corner[1] >= 10) filledCorners++;
				else if (board[corner[0]][corner[1]]['t'] == 1) filledCorners++;
			});
			tspin = filledCorners >= 3;

			if (tspin) {
				filledFacingCorners = 0;
				facingCorners.forEach((corner) => {
					if (corner[0] >= 40 || corner[1] < 0 || corner[1] >= 10) filledFacingCorners++;
					else if (board[corner[0]][corner[1]]['t'] == 1) filledFacingCorners++;
				});
				mini = filledFacingCorners < 2; // no I'm not adding the "TST Kick and Fin Kick" exceptions. STSDs and Fins deserve to be mini
			}
		}

		board = board.filter(
			(r) =>
				!r
					.map((c) => {
						return c.t == 1;
					})
					.every((v) => v)
		);
		var l = board.length;
		var cleared = 0;
		for (let i = 0; i < boardSize[1] - l; i++) {
			cleared++;
			board.unshift(aRow());
		}

        if (board[board.length - 1].filter((c) => c.t == 0).length == boardSize[0]) pc = true;
        
        if (cleared == 0) combo = -1;
        else {
            combo += 1;
        }

        if (cleared > 0) {
            if (tspin || cleared == 4) b2b += 1;
            else b2b = -1;
        }

		text = '';
        if (combo > 0) text += combo.toString() + "_COMBO\n";
        if (b2b > 0 && (tspin || cleared == 4)) text += 'B2B ';
		if (mini) text += 'MINI ';
		if (tspin) text += 'T-SPIN ';
		if (cleared > 4) cleared = 4; // nani
		if (cleared > 0) text += ['NULL', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD'][cleared];
		if (pc) text += '\nPERFECT\nCLEAR!';

		if (text != '') notify(text);
		if (tspin || cleared == 4) playSnd('ClearTetra', true);
		if (pc) playSnd('PerfectClear', 1);

		return cleared;
	}

	function drawCell(x, y, piece, type) {
		if (type == 3) {
			// Ghost
			ctx.strokeStyle = '#CCC';
			ctx.strokeRect((x - 1) * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
		} else if (type !== 0) {
			// Current and Heap
			ctx.fillStyle = color[piece];
			ctx.fillRect((x - 1) * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
		}
	}

	function render() {
		checkShift();

		ctx.clearRect(0, 0, boardSize[0] * cellSize, boardSize[1] * cellSize);
		ctx.fillStyle = pattern;
		ctx.fillRect(0, 0, boardSize[0] * cellSize, boardSize[1] * cellSize);

		board.map((y, i) => {
			y.map((x, ii) => {
				if (x.t !== 0) {
					drawCell(ii + 1, i - hiddenRows + 2, x.c, x.t);
				} else if (i <= spawn[1] + 2) {
					// render the top 2 rows as grey
					drawCell(ii + 1, i - hiddenRows + 2, 'A', 1);
				}
			});
		});
		window.requestAnimationFrame(render);
	}
	/*
	setInterval(() => {
		render();
	}, 0);
    */
	window.requestAnimationFrame(render);
}
