import React, { useState, useMemo } from "react";

/**
 * ✨ Korean Crossword-style Scrabble
 * ---------------------------------
 * · wordPool: 디지털 40 + 일반 상식 40 → 매판 10개 랜덤 출제
 * · 보드 15×15, 첫 단어 중앙 가로 배치 → 이후 단어는 교차 시도(최대 300회)
 * · 빈칸 클릭 → 힌트 확인 → 단어 입력 후 확인
 */

/* 🔗 Google Apps Script URL (끝에 /exec 포함) */
const scriptURL =
  "https://script.google.com/macros/s/AKfycbxVKXqtCkuLM-HaBSBfk5UTtFIz7MRfI_QSlowNDohH5Wz9vsNKaoB4EHvYOwEXGTki/exec";

/***** wordPool: 퍼즐에 쓰이는 17개 단어 *****/
const wordPool = [
  /* ── 가로 단어 ── */
  {
    word: "비비빅",
    hint: "팥 맛으로 유명한 막대 아이스크림 이름",
    category: "common",
  },
  {
    word: "타이머",
    hint: "정해 둔 시간이 되면 ‘삐–익’ 울려 주는 시간 측정기",
    category: "common",
  },
  {
    word: "드라이아이스",
    hint: "−78 ℃ 고체 CO₂, 하얀 김이 모락모락 나는 보냉재",
    category: "common",
  },
  {
    word: "러브레터",
    hint: "연인에게 애정을 가득 담아 보내는 손편지",
    category: "common",
  },
  {
    word: "고양이",
    hint: "야옹~ 부드러운 털과 도도한 매력의 반려동물",
    category: "common",
  },
  {
    word: "스토리지",
    hint: "SSD·HDD처럼 데이터를 오래 보관하는 장치",
    category: "digital",
  },
  {
    word: "스마트팜",
    hint: "온·습도·영양분을 IoT로 자동 제어하는 첨단 농장",
    category: "digital",
  },
  {
    word: "자율주행",
    hint: "센서와 AI가 스스로 가속·조향·제동하는 자동차 기술",
    category: "digital",
  },

  /* ── 세로 단어 ── */
  {
    word: "안드로이드",
    hint: "구글이 만든 스마트폰·태블릿 운영체제(OS)",
    category: "digital",
  },
  {
    word: "데이터",
    hint: "컴퓨터가 처리·저장하는 0과 1 정보 덩어리",
    category: "digital",
  },
  {
    word: "데이터베이스",
    hint: "검색·수정이 쉬운 구조적 데이터 창고",
    category: "digital",
  },
  {
    word: "토요일",
    hint: "주말의 첫날, 한 주의 여섯 번째 요일",
    category: "common",
  },
  {
    word: "메타버스",
    hint: "현실과 가상이 섞인 3D 온라인 세계",
    category: "digital",
  },
  {
    word: "율무차",
    hint: "율무 알갱이를 달여 만든 구수한 전통 차",
    category: "common",
  },
  {
    word: "머신러닝",
    hint: "데이터를 학습해 규칙을 스스로 찾는 AI 기술",
    category: "digital",
  },
  {
    word: "레퍼런스",
    hint: "참고 자료·문헌, 프로그래밍에선 ‘참조값’이란 뜻도",
    category: "digital",
  },
  {
    word: "빅데이터",
    hint: "엑셀로 열 수 없을 만큼 방대한 데이터 집합",
    category: "digital",
  },
  {
    word: "트렌드",
    hint: "요즘 사람들이 따르는 유행·흐름을 가리키는 말",
    category: "common",
  },
  {
    word: "지휘자",
    hint: "오케스트라 연주를 손짓으로 이끄는 사람",
    category: "common",
  },
];

/***** 2. 보드 및 배치 로직 *****/
/***** 0. 퍼즐 패턴 (15×12) *****/
const PATTERN_ROWS = [
  "#	#	#	#	#	#	#	메	#	#	비	비	빅	#	#",
  "#	#	#	#	#	#	#	타	이	머	#	#	데	#	#",
  "#	#	안	#	데	#	#	버	#	신	#	#	이	#	#",
  "#	#	드	라	이	아	이	스	#	러	브	레	터	#	#",
  "#	#	로	#	터	#	#	#	#	닝	#	퍼	#	#	#",
  "고	양	이	#	베	#	#	#	#	#	#	런	#	#	#",
  "#	#	드	#	이	#	#	#	#	#	#	스	마	트	팜",
  "#	#	#	#	스	토	리	지	#	#	#	#	#	렌	#",
  "#	#	#	#	#	요	#	휘	#	#	#	#	#	드	#",
  "#	#	#	#	#	일	#	자	율	주	행	#	#	#	#",
  "#	#	#	#	#	#	#	#	무	#	#	#	#	#	#",
  "#	#	#	#	#	#	#	#	차	#	#	#	#	#	#",
];

const ROWS = PATTERN_ROWS.length; // 12
const COLS = PATTERN_ROWS[0].split("\t").length; // 15
const rInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function placeFirst(board, word) {
  const row = Math.floor(SIZE / 2);
  const col = Math.floor((SIZE - word.length) / 2);
  const coords = [];
  for (let i = 0; i < word.length; i++) {
    board[row][col + i] = word[i];
    coords.push([row, col + i]);
  }
  return { coords, orientation: "H" };
}

/* 🔋 배터리 모양 게이지 -------------------------------------------- */
function BatteryGauge({ percent }) {
  const fill = Math.min(Math.max(percent, 0), 100); // 0-100 클램프
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 56,
          height: 24,
          border: "2px solid #333",
          borderRadius: 4,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${fill}%`,
            background:
              fill < 30 ? "#e74c3c" : fill < 70 ? "#f1c40f" : "#2ecc71",
            transition: "width 0.4s",
          }}
        />
      </div>
      {/* 꼬다리 */}
      <div
        style={{
          width: 4,
          height: 10,
          background: "#333",
          borderRadius: "0 2px 2px 0",
        }}
      />
      <span style={{ fontSize: 12, fontWeight: 700 }}>{fill}%</span>
    </div>
  );
}

function tryCrossPlace(board, placed, word) {
  const ops = [];

  // 교차 후보 좌표 모으기
  placed.forEach((ref) => {
    ref.word.split("").forEach((rch, iR) => {
      word.split("").forEach((ch, iW) => {
        if (rch !== ch) return;
        const crossR = ref.coords[iR][0];
        const crossC = ref.coords[iR][1];
        const orient = ref.orientation === "H" ? "V" : "H";
        const sR = orient === "H" ? crossR : crossR - iW;
        const sC = orient === "H" ? crossC - iW : crossC;
        ops.push({ sR, sC, orient, hit: [crossR, crossC] });
      });
    });
  });

  // 후보를 섞어서 하나씩 시도
  for (const { sR, sC, orient, hit } of ops.sort(() => 0.5 - Math.random())) {
    if (
      sR < 0 ||
      sC < 0 ||
      (orient === "H" ? sC + word.length > SIZE : sR + word.length > SIZE)
    )
      continue;

    let ok = true;
    const coords = [];
    let crossed = false;

    for (let i = 0; i < word.length; i++) {
      const r = orient === "H" ? sR : sR + i;
      const c = orient === "H" ? sC + i : sC;
      const cell = board[r][c];

      if (cell && cell !== word[i]) {
        ok = false;
        break;
      }
      if (!isClearAround(board, r, c, word[i])) {
        ok = false;
        break;
      }

      if (r === hit[0] && c === hit[1]) crossed = true;
      coords.push([r, c]);
    }
    if (!ok || !crossed) continue; // ← **교차 못 했으면 실패**

    // 앞/뒤 빈칸 검사
    const preR = orient === "H" ? sR : sR - 1;
    const preC = orient === "H" ? sC - 1 : sC;
    const postR = orient === "H" ? sR : sR + word.length;
    const postC = orient === "H" ? sC + word.length : sC;
    if (
      (preR >= 0 && preC >= 0 && board[preR]?.[preC]) ||
      (postR < SIZE && postC < SIZE && board[postR]?.[postC])
    )
      continue;

    coords.forEach(([r, c], idx) => (board[r][c] = word[idx]));
    return { coords, orientation: orient };
  }
  return null;
}

function isClearAround(board, r, c, allowChar = null) {
  const dirs = [
    [-1, 0], // 위
    [1, 0], // 아래
    [0, -1], // 왼쪽
    [0, 1], // 오른쪽
  ];
  return dirs.every(([dr, dc]) => {
    const nr = r + dr,
      nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) return true;
    const cell = board[nr][nc];
    return !cell || cell === allowChar; // 비어있거나 교차 글자
  });
}

/***** 0. 교차 가능한 10개 단어 뽑기 *****/
function pickCrossableWords(pool, n = 10, minLen = 2) {
  // 1) 최소 글자 길이 필터
  const candidates = pool.filter((w) => w.word.length >= minLen);

  // 2) 길이 ↓ 긴 단어 먼저 정렬 → 랜덤 섞기
  const sorted = [...candidates].sort((a, b) => b.word.length - a.word.length);
  const shuffled = sorted.sort(() => 0.5 - Math.random());

  // 3) 첫 단어 = 가장 긴 단어, 나머지는 교차 조건 필터
  const chosen = [shuffled[0]];
  let idx = 1;
  while (chosen.length < n && idx < shuffled.length) {
    const next = shuffled[idx++];
    const charSet = new Set(chosen.flatMap((w) => w.word.split("")));
    if (next.word.split("").some((ch) => charSet.has(ch))) {
      chosen.push(next);
    }
  }
  // 부족하면 길이 순 그대로 채움
  while (chosen.length < n && idx < shuffled.length) {
    chosen.push(shuffled[idx++]);
  }
  return chosen.slice(0, n);
}

/***** 1. 패턴 → 솔루션·좌표 파싱 *****/
function parseFixedBoard(patternRows) {
  const boardSol = patternRows.map((row) =>
    row.split("\t").map((ch) => (ch === "#" ? "" : ch))
  ); // 해답 글자(블록은 빈칸 처리)

  const placed = [];
  const height = boardSol.length;
  const width = boardSol[0].length;

  // 가로 단어
  for (let r = 0; r < height; r++) {
    let c = 0;
    while (c < width) {
      if (boardSol[r][c] && (c === 0 || !boardSol[r][c - 1])) {
        // 시작
        let word = "";
        const coords = [];
        let cc = c;
        while (cc < width && boardSol[r][cc]) {
          word += boardSol[r][cc];
          coords.push([r, cc]);
          cc++;
        }
        if (word.length > 1) placed.push({ word, coords, orientation: "H" });
        c = cc;
      } else c++;
    }
  }
  // 세로 단어
  for (let c = 0; c < width; c++) {
    let r = 0;
    while (r < height) {
      if (boardSol[r][c] && (r === 0 || !boardSol[r - 1][c])) {
        let word = "";
        const coords = [];
        let rr = r;
        while (rr < height && boardSol[rr][c]) {
          word += boardSol[rr][c];
          coords.push([rr, c]);
          rr++;
        }
        if (word.length > 1) placed.push({ word, coords, orientation: "V" });
        r = rr;
      } else r++;
    }
  }
  return { boardSol, placed };
}

/***** 2. generate(): 고정 퍼즐 반환 *****/
function generate() {
  const { boardSol, placed } = parseFixedBoard(PATTERN_ROWS);

  // 초기는 빈칸(플레이어 입력), 블록(#) 위치는 그대로 비워 둠

  // 힌트 붙여 넣기 (wordPool에서 가져오거나 기본 텍스트)
  const withHints = placed.map((p) => {
    const poolItem = wordPool.find((w) => w.word === p.word);
    return {
      ...p,
      hint: poolItem?.hint || `${p.word} 설명 없음`,
      category: poolItem?.category || "common",
      solved: false,
    };
  });

  return { board: boardSol, placed: withHints };
}

/***** 3. 셀 & 보드 *****/
const baseStyle = {
  width: 28,
  height: 28,
  border: "1px solid #888",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
  fontSize: 16,
  fontWeight: "bold", // 글자 볼드
  cursor: "pointer",
  userSelect: "none",
  backgroundSize: "cover", // 이미지 꽉 차게
  backgroundPosition: "center",
};
function Cell({ type, letter, highlight, hlColor, onClick }) {
  const style = { ...baseStyle };

  if (type === "block") {
    style.background = "#444";
  } else {
    if (type === "filled") {
      style.backgroundColor = "rgba(120,200,120,0.3)"; // 정답 칸 연초록
      style.opacity = 0.8; // 투명도
    }
    if (highlight) {
      style.background = hlColor || "#bce"; // 디지털·상식 색 구분
      style.opacity = 1;
    }
  }

  return (
    <div style={style} onClick={type === "block" ? undefined : onClick}>
      {type === "filled" ? letter : ""}
    </div>
  );
}

/***** 4. 메인 *****/
export default function App() {
  const [started, setStarted] = useState(false);
  const [board, setBoard] = useState([]);
  const [words, setWords] = useState([]);
  const [selIdx, setSelIdx] = useState(null);
  const [input, setInput] = useState("");

  /* App 컴포넌트 안 state 추가 */
  const [form, setForm] = useState({
    company: "",
    employeeId: "",
    name: "",
  });
  const [submitMsg, setSubmitMsg] = useState("");

  // 시각화용
  const vBoard = useMemo(() => {
    if (!started) return [];

    // 1️⃣ 블록으로 채운 빈 보드
    const map = Array.from({ length: ROWS }, () =>
      Array(COLS).fill({ type: "block" })
    );

    // 2️⃣ solved 단어 → filled 확정
    words.forEach((w) => {
      if (!w.solved) return;
      w.coords.forEach(([r, c]) => {
        map[r][c] = { type: "filled", letter: board[r][c], highlight: false };
      });
    });

    // 3️⃣ 모든 단어를 돌며 blank / highlight 설정
    words.forEach((w, idx) => {
      const color = w.category === "digital" ? "#bce" : "#ccc";
      w.coords.forEach(([r, c]) => {
        if (w.solved) {
          if (idx === selIdx) {
            map[r][c].highlight = true;
            map[r][c].hlColor = color;
          }
        } else {
          if (map[r][c].type !== "filled") {
            map[r][c] = {
              type: "blank",
              letter: board[r][c],
              highlight: idx === selIdx,
              hlColor: idx === selIdx ? color : undefined,
            };
          } else if (idx === selIdx) {
            map[r][c].highlight = true;
            map[r][c].hlColor = color;
          }
        }
      });
    });

    // 4️⃣ 선택된 단어 전체 최종 강조(교차 셀 포함)
    if (selIdx != null) {
      const selColor = words[selIdx].category === "digital" ? "#bce" : "#ccc";
      words[selIdx].coords.forEach(([r, c]) => {
        map[r][c].highlight = true;
        map[r][c].hlColor = selColor;
      });
    }

    return map;
  }, [started, board, words, selIdx]);

  // 셀 선택
  const handleCell = (r, c) => {
    if (!started) return;
    const idx = words.findIndex(
      (w) => !w.solved && w.coords.some(([R, C]) => R === r && C === c)
    );
    if (idx !== -1) {
      setSelIdx(idx);
      setInput("");
    }
  };

  // 입력 확인
  const submit = (e) => {
    e.preventDefault();
    if (selIdx == null) return;
    const guess = input.trim().toUpperCase();
    const target = words[selIdx].word.toUpperCase();
    if (guess === target) {
      const nw = [...words];
      nw[selIdx].solved = true;
      setWords(nw);
      setSelIdx(null);
      setInput("");
    } else alert("❌ 틀렸습니다!");
  };

  const startGame = () => {
    const { board, placed } = generate();
    setBoard(board);
    setWords(placed);
    setStarted(true);
    setSelIdx(null);
    setInput("");
  };

  const allDone = started && words.every((w) => w.solved);

  // 🔋 현재 맞힌 개수 비율 (0~100)
  const solvedPercent = started
    ? Math.round((words.filter((w) => w.solved).length / words.length) * 100)
    : 0;

  async function submitEntry() {
    try {
      /* 간단 유효성 */
      if (!form.company || !form.employeeId || !form.name) {
        alert("회사 / 사번 / 이름을 모두 입력하세요!");
        return;
      }

      const payload = {
        company: form.company,
        employeeId: form.employeeId,
        name: form.name,
        totalScore: 100,
        time: new Date().toISOString(),
        status: "정상",
      };

      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        mode: "cors", // 생략해도 기본 cors
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.status === "success") {
        setSubmitMsg("✅ 응모 완료! 설문이 접수되었습니다.");
      } else {
        setSubmitMsg("⚠️ 전송 실패: " + (data.message || "알 수 없는 오류"));
      }
    } catch (e) {
      setSubmitMsg("⚠️ 전송 오류: " + e.message);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24, textAlign: "center" }}>
      <h1
        style={{
          fontSize: 30,
          fontWeight: 700,
          fontFamily: "'Orbitron','Pretendard', sans-serif",
        }}
      >
        🧩디지털 리터러시 크로스워드⚔
      </h1>

      {!started ? (
        <button
          onClick={startGame}
          style={{ padding: "6px 18px", marginTop: 40 }}
        >
          게임 시작
        </button>
      ) : (
        <>
          {/* 보드 */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${COLS}, 28px)`,
              }}
            >
              {vBoard.flatMap((row, r) =>
                row.map((cell, c) => (
                  <Cell
                    key={`${r}-${c}`}
                    {...cell}
                    onClick={() => handleCell(r, c)}
                  />
                ))
              )}
            </div>
          </div>

          {/* 입력창 */}
          {selIdx != null && (
            <form onSubmit={submit} style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 6, fontSize: 14 }}>
                <strong>👀힌트 :</strong> {words[selIdx].hint} (
                {words[selIdx].word.length}글자)
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="단어 입력"
                style={{ padding: 6, width: 200, textTransform: "uppercase" }}
              />
              <button
                type="submit"
                style={{ marginLeft: 8, padding: "6px 12px" }}
              >
                확인
              </button>
            </form>
          )}

          {/* {allDone && ( */}
          {
            <div style={{ marginTop: 30 }}>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>
                🎉 모든 단어를 맞혔습니다!
              </h3>

              {/* 📝 입력 폼 */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <input
                  placeholder="회사"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  style={{ padding: 6, width: 90 }}
                />
                <input
                  placeholder="사번(ID)"
                  value={form.employeeId}
                  onChange={(e) =>
                    setForm({ ...form, employeeId: e.target.value })
                  }
                  style={{ padding: 6, width: 90 }}
                />
                <input
                  placeholder="이름"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ padding: 6, width: 90 }}
                />
                <button onClick={submitEntry} style={{ padding: "6px 14px" }}>
                  응모하기
                </button>
              </div>

              {/* 결과 메시지 */}
              {submitMsg && <div style={{ fontSize: 14 }}>{submitMsg}</div>}
            </div>
          }
        </>
      )}

      <footer style={{ marginTop: 100, fontSize: 12, color: "#888" }}>
        © 2025 — made by Nongshim Digital Transformation Team
      </footer>
      {/* 🔋 배터리 게이지 — 게임이 시작된 뒤에만 표시 */}
      {started && (
        <div style={{ marginTop: 24 }}>
          <BatteryGauge percent={solvedPercent} />
        </div>
      )}
    </div>
  );
}
