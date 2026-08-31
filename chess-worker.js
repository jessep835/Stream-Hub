/* ============================================================
   STREAM CHESS WORKER
   Pure engine: constants, move generation, evaluation, search,
   quiescence, pickAIMove. No DOM. No main-thread references.

   Protocol:
     Main -> Worker: { type: 'search', fen, depth, token }
     Worker -> Main: { type: 'result', token, move }
                     { type: 'error',  token, error }
   ============================================================ */
'use strict';

/* ============================================================
   CONSTANTS
   ============================================================ */
const FILES = 'abcdefgh';

const PIECE_VAL = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000
};

const PST = {
  P: [
    0,0,0,0,0,0,0,0,
    50,50,50,50,50,50,50,50,
    10,10,20,30,30,20,10,10,
    5,5,10,25,25,10,5,5,
    0,0,0,20,20,0,0,0,
    5,-5,-10,0,0,-10,-5,5,
    5,10,10,-20,-20,10,10,5,
    0,0,0,0,0,0,0,0
  ],
  N: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,0,0,0,0,-20,-40,
    -30,0,10,15,15,10,0,-30,
    -30,5,15,20,20,15,5,-30,
    -30,0,15,20,20,15,0,-30,
    -30,5,10,15,15,10,5,-30,
    -40,-20,0,5,5,0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ],
  B: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,0,0,0,0,0,0,-10,
    -10,0,5,10,10,5,0,-10,
    -10,5,5,10,10,5,5,-10,
    -10,0,10,10,10,10,0,-10,
    -10,10,10,10,10,10,10,-10,
    -10,5,0,0,0,0,5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ],
  R: [
    0,0,0,0,0,0,0,0,
    5,10,10,10,10,10,10,5,
    -5,0,0,0,0,0,0,-5,
    -5,0,0,0,0,0,0,-5,
    -5,0,0,0,0,0,0,-5,
    -5,0,0,0,0,0,0,-5,
    -5,0,0,0,0,0,0,-5,
    0,0,0,5,5,0,0,0
  ],
  Q: [
    -20,-10,-10,-5,-5,-10,-10,-20,
    -10,0,0,0,0,0,0,-10,
    -10,0,5,5,5,5,0,-10,
    -5,0,5,5,5,5,0,-5,
    0,0,5,5,5,5,0,-5,
    -10,5,5,5,5,5,0,-10,
    -10,0,5,0,0,0,0,-10,
    -20,-10,-10,-5,-5,-10,-10,-20
  ],
  K: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    20,20,0,0,0,0,20,20,
    20,30,10,0,0,10,30,20
  ]
};

const SLIDE = {
  R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  B: [[-1, -1], [-1, 1], [1, -1], [1, 1]]
};
SLIDE.Q = SLIDE.R.concat(SLIDE.B);

const KNIGHT = [
  [-2, -1], [-2, 1],
  [-1, -2], [-1, 2],
  [1, -2], [1, 2],
  [2, -1], [2, 1]
];
const KING = SLIDE.Q;

/* ============================================================
   BASIC HELPERS
   ============================================================ */
function idx(r, c) { return r * 8 + c; }
function rc(i) { return [Math.floor(i / 8), i % 8]; }
function sq(i) { const [r, c] = rc(i); return FILES[c] + (8 - r); }
function inside(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function cloneState(s) {
  return {
    board: s.board.slice(),
    turn: s.turn,
    castling: { ...s.castling },
    ep: s.ep,
    halfmove: s.halfmove,
    fullmove: s.fullmove
  };
}

/* ============================================================
   FEN
   ============================================================ */
function fenToState(fen) {
  const parts = fen.trim().split(/\s+/);
  const board = new Array(64).fill(null);
  let i = 0;
  for (const ch of parts[0]) {
    if (ch === '/') continue;
    if (/[1-8]/.test(ch)) {
      i += Number(ch);
      continue;
    }
    const color = ch === ch.toUpperCase() ? 'w' : 'b';
    board[i++] = color + ch.toUpperCase();
  }
  const castlingString = parts[2] || '-';
  const castling = {
    wK: castlingString.includes('K'),
    wQ: castlingString.includes('Q'),
    bK: castlingString.includes('k'),
    bQ: castlingString.includes('q')
  };
  let ep = null;
  if (parts[3] && parts[3] !== '-') {
    const file = FILES.indexOf(parts[3][0]);
    const rank = Number(parts[3][1]);
    if (file >= 0 && rank >= 1 && rank <= 8) {
      ep = idx(8 - rank, file);
    }
  }
  return {
    board,
    turn: parts[1] === 'b' ? 'b' : 'w',
    castling,
    ep,
    halfmove: Number(parts[4]) || 0,
    fullmove: Number(parts[5]) || 1
  };
}

/* ============================================================
   ATTACK / CHECK
   ============================================================ */
function findKing(s, color) {
  for (let i = 0; i < 64; i++) {
    if (s.board[i] === color + 'K') return i;
  }
  return -1;
}

function sqAttacked(s, square, byColor) {
  const [r, c] = rc(square);
  const pawnDir = byColor === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const nr = r + pawnDir;
    const nc = c + dc;
    if (inside(nr, nc) && s.board[idx(nr, nc)] === byColor + 'P') return true;
  }
  for (const [dr, dc] of KNIGHT) {
    const nr = r + dr;
    const nc = c + dc;
    if (inside(nr, nc) && s.board[idx(nr, nc)] === byColor + 'N') return true;
  }
  for (const [dr, dc] of SLIDE.R) {
    let nr = r + dr;
    let nc = c + dc;
    while (inside(nr, nc)) {
      const p = s.board[idx(nr, nc)];
      if (p) {
        if (p === byColor + 'R' || p === byColor + 'Q') return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  for (const [dr, dc] of SLIDE.B) {
    let nr = r + dr;
    let nc = c + dc;
    while (inside(nr, nc)) {
      const p = s.board[idx(nr, nc)];
      if (p) {
        if (p === byColor + 'B' || p === byColor + 'Q') return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  for (const [dr, dc] of KING) {
    const nr = r + dr;
    const nc = c + dc;
    if (inside(nr, nc) && s.board[idx(nr, nc)] === byColor + 'K') return true;
  }
  return false;
}

function inCheck(s, color) {
  const king = findKing(s, color);
  if (king === -1) return false;
  return sqAttacked(s, king, color === 'w' ? 'b' : 'w');
}

/* ============================================================
   MOVE GENERATION
   ============================================================ */
function generatePseudoMoves(s, color) {
  const moves = [];
  for (let i = 0; i < 64; i++) {
    const piece = s.board[i];
    if (!piece || piece[0] !== color) continue;
    const [r, c] = rc(i);
    const type = piece[1];

    if (type === 'P') {
      const dir = color === 'w' ? -1 : 1;
      const startRank = color === 'w' ? 6 : 1;
      const promotionRank = color === 'w' ? 0 : 7;
      const oneR = r + dir;
      if (inside(oneR, c) && !s.board[idx(oneR, c)]) {
        const to = idx(oneR, c);
        if (oneR === promotionRank) {
          for (const promo of ['Q', 'R', 'B', 'N']) {
            moves.push({ from: i, to, promo });
          }
        } else {
          moves.push({ from: i, to });
        }
        const twoR = r + dir * 2;
        if (r === startRank && inside(twoR, c) && !s.board[idx(twoR, c)]) {
          moves.push({ from: i, to: idx(twoR, c), double: true });
        }
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (!inside(nr, nc)) continue;
        const to = idx(nr, nc);
        const target = s.board[to];
        if (target && target[0] !== color) {
          if (nr === promotionRank) {
            for (const promo of ['Q', 'R', 'B', 'N']) {
              moves.push({ from: i, to, promo, capture: true });
            }
          } else {
            moves.push({ from: i, to, capture: true });
          }
        } else if (to === s.ep) {
          moves.push({ from: i, to, ep: true, capture: true });
        }
      }
      continue;
    }

    if (type === 'N') {
      for (const [dr, dc] of KNIGHT) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inside(nr, nc)) continue;
        const to = idx(nr, nc);
        const target = s.board[to];
        if (!target || target[0] !== color) {
          moves.push({ from: i, to, capture: !!target });
        }
      }
      continue;
    }

    if (type === 'B' || type === 'R' || type === 'Q') {
      for (const [dr, dc] of SLIDE[type]) {
        let nr = r + dr;
        let nc = c + dc;
        while (inside(nr, nc)) {
          const to = idx(nr, nc);
          const target = s.board[to];
          if (!target) {
            moves.push({ from: i, to });
          } else {
            if (target[0] !== color) {
              moves.push({ from: i, to, capture: true });
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      continue;
    }

    if (type === 'K') {
      for (const [dr, dc] of KING) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inside(nr, nc)) continue;
        const to = idx(nr, nc);
        const target = s.board[to];
        if (!target || target[0] !== color) {
          moves.push({ from: i, to, capture: !!target });
        }
      }
      if (color === 'w' && r === 7 && c === 4) {
        if (
          s.castling.wK &&
          s.board[idx(7, 5)] === null &&
          s.board[idx(7, 6)] === null &&
          s.board[idx(7, 7)] === 'wR' &&
          !sqAttacked(s, idx(7, 4), 'b') &&
          !sqAttacked(s, idx(7, 5), 'b') &&
          !sqAttacked(s, idx(7, 6), 'b')
        ) {
          moves.push({ from: i, to: idx(7, 6), castle: 'K' });
        }
        if (
          s.castling.wQ &&
          s.board[idx(7, 3)] === null &&
          s.board[idx(7, 2)] === null &&
          s.board[idx(7, 1)] === null &&
          s.board[idx(7, 0)] === 'wR' &&
          !sqAttacked(s, idx(7, 4), 'b') &&
          !sqAttacked(s, idx(7, 3), 'b') &&
          !sqAttacked(s, idx(7, 2), 'b')
        ) {
          moves.push({ from: i, to: idx(7, 2), castle: 'Q' });
        }
      }
      if (color === 'b' && r === 0 && c === 4) {
        if (
          s.castling.bK &&
          s.board[idx(0, 5)] === null &&
          s.board[idx(0, 6)] === null &&
          s.board[idx(0, 7)] === 'bR' &&
          !sqAttacked(s, idx(0, 4), 'w') &&
          !sqAttacked(s, idx(0, 5), 'w') &&
          !sqAttacked(s, idx(0, 6), 'w')
        ) {
          moves.push({ from: i, to: idx(0, 6), castle: 'K' });
        }
        if (
          s.castling.bQ &&
          s.board[idx(0, 3)] === null &&
          s.board[idx(0, 2)] === null &&
          s.board[idx(0, 1)] === null &&
          s.board[idx(0, 0)] === 'bR' &&
          !sqAttacked(s, idx(0, 4), 'w') &&
          !sqAttacked(s, idx(0, 3), 'w') &&
          !sqAttacked(s, idx(0, 2), 'w')
        ) {
          moves.push({ from: i, to: idx(0, 2), castle: 'Q' });
        }
      }
    }
  }
  return moves;
}

function applyMove(s, move) {
  const ns = cloneState(s);
  const piece = ns.board[move.from];
  if (!piece) return ns;
  const color = piece[0];
  const type = piece[1];
  ns.board[move.from] = null;
  if (move.ep) {
    const [toR, toC] = rc(move.to);
    const capturedPawnR = toR + (color === 'w' ? 1 : -1);
    ns.board[idx(capturedPawnR, toC)] = null;
  }
  if (move.castle) {
    const rank = color === 'w' ? 7 : 0;
    if (move.castle === 'K') {
      ns.board[idx(rank, 5)] = ns.board[idx(rank, 7)];
      ns.board[idx(rank, 7)] = null;
    } else {
      ns.board[idx(rank, 3)] = ns.board[idx(rank, 0)];
      ns.board[idx(rank, 0)] = null;
    }
  }
  ns.board[move.to] = move.promo ? color + move.promo : piece;
  if (type === 'K') {
    if (color === 'w') { ns.castling.wK = false; ns.castling.wQ = false; }
    else { ns.castling.bK = false; ns.castling.bQ = false; }
  }
  if (move.from === idx(7, 0) || move.to === idx(7, 0)) ns.castling.wQ = false;
  if (move.from === idx(7, 7) || move.to === idx(7, 7)) ns.castling.wK = false;
  if (move.from === idx(0, 0) || move.to === idx(0, 0)) ns.castling.bQ = false;
  if (move.from === idx(0, 7) || move.to === idx(0, 7)) ns.castling.bK = false;
  ns.ep = null;
  if (move.double) {
    const [fromR, fromC] = rc(move.from);
    const dir = color === 'w' ? -1 : 1;
    ns.ep = idx(fromR + dir, fromC);
  }
  if (type === 'P' || move.capture) ns.halfmove = 0;
  else ns.halfmove++;
  if (color === 'b') ns.fullmove++;
  ns.turn = color === 'w' ? 'b' : 'w';
  return ns;
}

function generateLegalMoves(s) {
  const pseudo = generatePseudoMoves(s, s.turn);
  const legal = [];
  for (const move of pseudo) {
    const next = applyMove(s, move);
    if (!inCheck(next, s.turn)) legal.push(move);
  }
  return legal;
}

/* ============================================================
   GAME-END HELPERS (used by search)
   ============================================================ */
function isInsufficientMaterial(s) {
  const pieces = [];
  for (let i = 0; i < 64; i++) {
    const p = s.board[i];
    if (p && p[1] !== 'K') pieces.push({ piece: p, square: i });
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1) {
    return pieces[0].piece[1] === 'B' || pieces[0].piece[1] === 'N';
  }
  if (
    pieces.length === 2 &&
    pieces[0].piece[1] === 'B' &&
    pieces[1].piece[1] === 'B'
  ) {
    const [r1, c1] = rc(pieces[0].square);
    const [r2, c2] = rc(pieces[1].square);
    return (r1 + c1) % 2 === (r2 + c2) % 2;
  }
  return false;
}

/* ============================================================
   EVALUATION
   ============================================================ */
function evaluate(s) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const piece = s.board[i];
    if (!piece) continue;
    const [r, c] = rc(i);
    const type = piece[1];
    const value = PIECE_VAL[type];
    const pstIndex = piece[0] === 'w' ? idx(r, c) : idx(7 - r, c);
    const positional = PST[type] ? PST[type][pstIndex] : 0;
    const signed = piece[0] === 'w' ? 1 : -1;
    score += signed * (value + positional);
  }
  return s.turn === 'w' ? score : -score;
}

/* ============================================================
   MOVE ORDERING
   ============================================================ */
function moveScore(s, move) {
  const moving = s.board[move.from];
  if (!moving) return -Infinity;
  const captured = move.ep
    ? (moving[0] === 'w' ? 'bP' : 'wP')
    : s.board[move.to];
  let score = 0;
  if (captured) {
    score += 10000 + PIECE_VAL[captured[1]] * 10 - PIECE_VAL[moving[1]];
  }
  if (move.promo) {
    score += 9000 + PIECE_VAL[move.promo];
  }
  if (move.castle) {
    score += 500;
  }
  const next = applyMove(s, move);
  if (inCheck(next, next.turn)) {
    score += 800;
  }
  return score;
}

/* ============================================================
   SEARCH
   ============================================================ */
function quiescence(s, alpha, beta) {
  const standPat = evaluate(s);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  const moves = generateLegalMoves(s)
    .filter(move => move.capture || move.promo)
    .sort((a, b) => moveScore(s, b) - moveScore(s, a));
  for (const move of moves) {
    const next = applyMove(s, move);
    const score = -quiescence(next, -beta, -alpha);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(s, depth, alpha, beta) {
  const legalMoves = generateLegalMoves(s);
  if (legalMoves.length === 0) {
    if (inCheck(s, s.turn)) return -999999 + s.fullmove;
    return 0;
  }
  if (isInsufficientMaterial(s)) return 0;
  if (s.halfmove >= 100) return 0;
  if (depth <= 0) return quiescence(s, alpha, beta);
  legalMoves.sort((a, b) => moveScore(s, b) - moveScore(s, a));
  let best = -Infinity;
  for (const move of legalMoves) {
    const next = applyMove(s, move);
    const score = -search(next, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

function pickAIMove(s, depth) {
  const moves = generateLegalMoves(s);
  if (moves.length === 0) return null;
  moves.sort((a, b) => moveScore(s, b) - moveScore(s, a));
  let bestScore = -Infinity;
  let bestMoves = [];
  let alpha = -Infinity;
  const beta = Infinity;
  for (const move of moves) {
    const next = applyMove(s, move);
    const score = -search(next, depth - 1, -beta, -alpha);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
    if (score > alpha) alpha = score;
  }
  // Only add variety at very shallow depth (easy mode)
  if (depth <= 2 && bestMoves.length > 1) {
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
  return bestMoves[0];
}

/* ============================================================
   MESSAGE HANDLER
   ============================================================ */
self.onmessage = function (event) {
  const data = event.data;
  if (!data || data.type !== 'search') return;
  const token = data.token;
  try {
    const position = fenToState(data.fen);
    const move = pickAIMove(position, data.depth);
    self.postMessage({
      type: 'result',
      token,
      move
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      token,
      error: error && error.stack ? error.stack : String(error)
    });
  }
};
