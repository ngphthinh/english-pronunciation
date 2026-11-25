const T = [
  {
    n: "Work – Công việc",
    q: [
      [
        "Have you ever worked part time?",
        "Yes, I have. I worked part-time in a coffee shop.",
      ],
      [
        "What kind of job do you want to do in the future?",
        "I want to be a software developer because I like technology.",
      ],
      [
        "What have you been doing to prepare for your future job?",
        "I have been learning programming languages and improving my English.",
      ],
      [
        "What do you do to get ready for a job interview?",
        "I usually research the company, prepare answers to common questions.",
      ],
    ],
  },
  {
    n: "Technology – Công nghệ",
    q: [
      [
        "What invention do you think is useful for your study?",
        "I think the computer is very useful because I can study and find information.",
      ],
      [
        "What do you usually do on the Internet?",
        "I usually use the Internet to study, search for information, and watch videos.",
      ],
      [
        "Do you prefer using a mobile phone or a laptop to study online?",
        "I prefer using a mobile phone to study online. It is small, convenient, and easy to carry anywhere",
      ],
      [
        "Do you know any famous inventor?",
        "Yes, I do. I know Thomas Edison. He invented the light bulb.",
      ],
    ],
  },
  {
    n: "Holidays – Kỳ nghỉ",
    q: [
      [
        "What activities do you like to do when you are on holiday?",
        "I like travelling, taking photos and eating local food.",
      ],
      [
        "What kind of accommodation do you like to stay in when you are on holiday?",
        "I like staying in hotels because they are comfortable and convenient.",
      ],
      [
        "Have you ever had any problems on holiday?",
        "Yes, I have. Once, I lost my way when I traveled to another city with my family. I felt worried, but I used Google Maps to find the way back. Luckily, everything was fine",
      ],
      [
        "Do you prefer travelling in a group or on your own?",
        "I prefer travelling in a group because I can have fun with my friends.",
      ],
    ],
  },
  {
    n: "Products – Sản phẩm",
    q: [
      [
        "What is the last thing you bought online?",
        "The last thing I bought online was a pair of headphones. I bought them on Shopee because I needed them for studying and listening to music",
      ],
      [
        "How important do you think logos are?",
        "I think logos are important because they help people remember a brand.",
      ],
      [
        "Which websites do you visit when you want to buy things such as clothes, shoes, and books?",
        "I usually visit Shopee because it has many products and good prices.",
      ],
      [
        "What do you think makes one website better than another?",
        "I think a good website should be easy to use and have a simple design. It should also load quickly and provide useful information",
      ],
    ],
  },
  {
    n: "History – Lịch sử",
    q: [
      [
        "Do you often play video games with your friends?",
        "Yes, I do. I often play video games with my friends at weekends.",
      ],
      [
        "What sorts of game are popular in your country?",
        "Mobile games and online games are very popular in Vietnam.",
      ],
      [
        "Do you think that video games are bad for you?",
        "Not always. They can help us relax, but playing too much is bad.",
      ],
      [
        "What historical place in Vietnam have you ever visited?",
        "I have visited the Independence Palace in Ho Chi Minh City. It was very interesting.",
      ],
    ],
  },
  {
    n: "Nature – Thiên nhiên",
    q: [
      [
        "If you could live in another country, where would you move to?",
        "I would like to live in Japan because it is beautiful and safe.",
      ],
      [
        "If you won a lot of money, would you stop working or studying?",
        "No, I wouldn't. I would continue studying because education is important.",
      ],
      [
        "What is your favorite animal?",
        "My favorite animal is the dog because it is friendly and cute.",
      ],
      [
        "Have you ever visited a zoo?",
        "Yes, I have. I visited a zoo with my family. It was fun.",
      ],
    ],
  },
];

const synth = window.speechSynthesis;
let cur = 0,
  token = 0,
  voices = [];
const results = {}; /* "chủ đề-câu" -> {said, pct} */
const $ = (id) => document.getElementById(id);
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  },
};

function setStatus(msg, live) {
  const s = $("status");
  $("statusText").textContent = msg || "";
  s.classList.toggle("show", !!msg);
  s.classList.toggle("live", !!live);
}
function setListening(on) {
  $("dock").classList.toggle("listening", on);
}

/* ===== Giọng đọc ===== */
function loadVoices() {
  voices = synth.getVoices().filter((v) => /^en/i.test(v.lang));
  const s = $("voice");
  s.innerHTML = "";
  voices.forEach((v, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = v.name + " (" + v.lang + ")";
    s.appendChild(o);
  });
  const saved = store.get("sp-voice");
  let idx = voices.findIndex((v) => v.name === saved);
  if (idx < 0) idx = voices.findIndex((v) => /en-US|en-GB/.test(v.lang));
  if (idx >= 0) s.value = idx;
}
if (synth) {
  loadVoices();
  synth.onvoiceschanged = loadVoices;
} else setStatus("Trình duyệt này không hỗ trợ đọc giọng nói.");
$("voice").onchange = () => {
  const v = voices[$("voice").value];
  if (v) store.set("sp-voice", v.name);
};
{
  const r = store.get("sp-rate");
  if (r) $("rate").value = r;
  $("rate").onchange = () => store.set("sp-rate", $("rate").value);
}

function say(text) {
  return new Promise((res) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = voices[$("voice").value];
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else u.lang = "en-US";
    u.rate = +$("rate").value;
    u.onend = res;
    u.onerror = res;
    synth.speak(u);
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ===== Nhận diện giọng nói & chấm đáp án ===== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null,
  stopListen = null,
  micDenied = false;

function norm(s) {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/can't/g, "can not")
    .replace(/won't/g, "will not")
    .replace(/n't/g, " not")
    .replace(/'m/g, " am")
    .replace(/'re/g, " are")
    .replace(/'ve/g, " have")
    .replace(/'ll/g, " will")
    .replace(/'d/g, " would")
    .replace(/'s/g, " is")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
function lev(a, b) {
  const m = a.length,
    n = b.length,
    d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[m][n];
}
const same = (x, y) =>
  x === y || (x.length >= 5 && y.length >= 5 && lev(x, y) <= 1);

/* So khớp theo thứ tự (LCS) giữa đáp án và lời bạn nói */
function compare(answer, said) {
  const A = norm(answer),
    B = norm(said),
    m = A.length,
    n = B.length;
  const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      L[i][j] = same(A[i - 1], B[j - 1])
        ? L[i - 1][j - 1] + 1
        : Math.max(L[i - 1][j], L[i][j - 1]);
  const hit = new Array(m).fill(false);
  let i = m,
    j = n;
  while (i > 0 && j > 0) {
    if (same(A[i - 1], B[j - 1]) && L[i][j] === L[i - 1][j - 1] + 1) {
      hit[i - 1] = true;
      i--;
      j--;
    } else if (L[i - 1][j] >= L[i][j - 1]) i--;
    else j--;
  }
  return { words: A, hit, pct: m ? Math.round((L[m][n] / m) * 100) : 0 };
}

const keyOf = (i) => cur + "-" + i;

function paintFeedback(i) {
  const card = document.querySelectorAll(".q")[i];
  if (!card) return;
  const old = card.querySelector(".fb");
  if (old) old.remove();
  const badge = card.querySelector(".badge");
  const res = results[keyOf(i)];
  if (!res) {
    badge.textContent = "";
    return;
  }
  const said = res.said;
  const fb = document.createElement("div");
  const sc = document.createElement("div");
  sc.className = "score";
  if (!said.trim()) {
    fb.className = "fb low";
    sc.textContent = "❌ Không nghe thấy giọng nói – thử lại nhé";
    fb.append(sc);
    badge.textContent = "0%";
    badge.className = "badge low";
  } else {
    const r = compare(T[cur].q[i][1], said);
    const hd = document.createElement("div");
    hd.className = "heard";
    const wd = document.createElement("div");
    wd.className = "words";
    fb.className = "fb " + (r.pct >= 80 ? "good" : r.pct >= 50 ? "mid" : "low");
    sc.textContent =
      (r.pct >= 80
        ? "✅ Đúng rồi! "
        : r.pct >= 50
          ? "👍 Gần đúng. "
          : "❌ Chưa đúng. ") +
      "Khớp " +
      r.pct +
      "% đáp án mẫu";
    hd.textContent = "Bạn nói: “" + said.trim() + "”";
    r.words.forEach((w, k) => {
      const s = document.createElement("span");
      s.className = r.hit[k] ? "ok" : "miss";
      s.textContent = w;
      wd.appendChild(s);
    });
    fb.append(sc, hd, wd);
    badge.textContent = r.pct + "%";
    badge.className =
      "badge" + (r.pct >= 80 ? " good" : r.pct < 50 ? " low" : "");
  }
  card.appendChild(fb);
}

function showFeedback(i, said) {
  const pct = said.trim() ? compare(T[cur].q[i][1], said).pct : 0;
  results[keyOf(i)] = { said, pct };
  paintFeedback(i);
  updateSummary();
}

function updateSummary() {
  const n = T[cur].q.length;
  const done = T[cur].q.map((_, i) => results[keyOf(i)]).filter(Boolean);
  const el = $("summary");
  if (!done.length) {
    el.innerHTML = "<b>" + n + " câu hỏi</b> · chưa luyện nói";
    return;
  }
  const avg = Math.round(done.reduce((s, r) => s + r.pct, 0) / done.length);
  el.innerHTML =
    "Đã luyện <b>" +
    done.length +
    "/" +
    n +
    "</b> câu · điểm trung bình <b>" +
    avg +
    "%</b>";
}

/* Nghe: trả về chuỗi bạn nói, "" nếu không có tiếng, null nếu không dùng được micro */
function listen(t) {
  return new Promise((resolve) => {
    if (!SR || micDenied) {
      resolve(null);
      return;
    }
    const r = new SR();
    rec = r;
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    let finalText = "",
      interim = "",
      done = false,
      silence = null,
      first = null;
    const live = () =>
      setStatus(
        "Đang nghe: " + ((finalText + " " + interim).trim() || "…"),
        true,
      );
    const finish = (val) => {
      if (done) return;
      done = true;
      clearTimeout(silence);
      clearTimeout(first);
      setListening(false);
      stopListen = null;
      rec = null;
      resolve(val !== undefined ? val : (finalText + " " + interim).trim());
    };
    const halt = () => {
      try {
        r.stop();
      } catch (e) {
        finish();
      }
    };
    stopListen = halt;
    r.onresult = (e) => {
      interim = "";
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const x = e.results[k];
        if (x.isFinal) finalText += (finalText ? " " : "") + x[0].transcript;
        else interim += x[0].transcript;
      }
      clearTimeout(first);
      clearTimeout(silence);
      silence = setTimeout(halt, 1500); /* im lặng 2,5s thì tự kết thúc */
      live();
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        micDenied = true;
        finish(null);
        setStatus(
          "Chưa được cấp quyền micro – hãy cho phép micro cho trang này rồi thử lại.",
        );
      } else if (e.error === "no-speech" || e.error === "aborted") finish();
      else if (e.error === "network") {
        finish(null);
        setStatus("Lỗi mạng khi nhận diện giọng nói (cần Internet).");
      }
    };
    r.onend = () => finish();
    first = setTimeout(halt, 12000); /* 12s không nói gì thì bỏ qua */
    setListening(true);
    setStatus("Đang nghe… hãy trả lời", true);
    try {
      r.start();
    } catch (e) {
      finish(null);
    }
  });
}

/* ===== Điều khiển phát ===== */
function stop() {
  token++;
  synth.cancel();
  if (rec) {
    try {
      rec.abort();
    } catch (e) {}
  }
  setListening(false);
  setStatus("");
  document.querySelectorAll(".q").forEach((e) => e.classList.remove("active"));
}
function mark(i) {
  document
    .querySelectorAll(".q")
    .forEach((e, j) => e.classList.toggle("active", i === j));
  const e = document.querySelectorAll(".q")[i];
  if (e) e.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function reveal(i) {
  document.querySelectorAll(".q")[i].classList.remove("hide");
}

async function one(i, mode, t) {
  const [q, a] = T[cur].q[i],
    total = T[cur].q.length;
  mark(i);
  const tag = "Câu " + (i + 1) + "/" + total + " · ";
  if (mode !== "a") {
    setStatus(tag + "Cô đang hỏi…");
    await say(q);
    if (t !== token) return;
  }
  if (mode === "practice") {
    setStatus(tag + "Đến lượt bạn trả lời…");
    const said = await listen(t);
    if (t !== token) return;
    if (said === null) {
      await wait(9000);
      if (t !== token) return;
      reveal(i);
    } else {
      reveal(i);
      showFeedback(i, said);
      setStatus(tag + "Đã chấm xong");
      await wait(1200);
      if (t !== token) return;
    }
  }
  if (mode !== "q") {
    setStatus(tag + "Đáp án mẫu…");
    if (mode !== "a") await wait(500);
    await say(a);
  }
}
async function run(mode) {
  stop();
  const t = token;
  for (let i = 0; i < T[cur].q.length; i++) {
    await one(i, mode, t);
    if (t !== token) return;
    await wait(900);
  }
  if (t === token) {
    setStatus("🎉 Xong chủ đề này!");
    mark(-1);
    setTimeout(() => {
      if (t === token) setStatus("");
    }, 3500);
  }
}

/* ===== Giao diện ===== */
function render() {
  const l = $("list");
  l.innerHTML = "";
  T[cur].q.forEach(([q, a], i) => {
    const d = document.createElement("article");
    d.className = "q" + ($("hideAns").checked ? " hide" : "");
    d.innerHTML =
      '<div class="qhead"><span class="num"></span><h3></h3><span class="badge"></span></div>' +
      '<p class="a"></p>' +
      '<div class="actions">' +
      '<button class="primary">🎤 Thử nói</button>' +
      "<button>🔊 Câu hỏi</button><button>🔊 Đáp án</button><button>▶ Cả hai</button><button>👁 Hiện/ẩn</button>" +
      "</div>";
    d.querySelector(".num").textContent = i + 1;
    d.querySelector("h3").textContent = q;
    d.querySelector(".a").textContent = a;
    const b = d.querySelectorAll("button");
    b[0].onclick = async () => {
      stop();
      const t = token;
      mark(i);
      const said = await listen(t);
      if (t !== token) return;
      if (said === null) {
        if (!micDenied)
          setStatus(
            "Trình duyệt này không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome, Edge hoặc Safari.",
          );
        return;
      }
      reveal(i);
      showFeedback(i, said);
      setStatus("Đã chấm xong");
      mark(-1);
      setTimeout(() => {
        if (t === token) setStatus("");
      }, 2500);
    };
    b[1].onclick = () => {
      stop();
      const t = token;
      one(i, "q", t);
    };
    b[2].onclick = () => {
      stop();
      const t = token;
      one(i, "a", t);
    };
    b[3].onclick = () => {
      stop();
      const t = token;
      one(i, "qa", t);
    };
    b[4].onclick = () => d.classList.toggle("hide");
    l.appendChild(d);
    paintFeedback(i);
  });
  updateSummary();
}
function tabs() {
  const t = $("tabs");
  t.innerHTML = "";
  T.forEach((x, i) => {
    const b = document.createElement("button");
    b.className = "tab";
    b.textContent = x.n;
    b.setAttribute("aria-pressed", i === cur);
    b.onclick = () => {
      stop();
      cur = i;
      tabs();
      render();
      store.set("sp-topic", i);
    };
    t.appendChild(b);
  });
  const on = t.querySelector('[aria-pressed="true"]');
  if (on) on.scrollIntoView({ inline: "center", block: "nearest" });
}

$("playTopic").onclick = () => run("qa");
$("practice").onclick = () => run("practice");
$("stop").onclick = stop;
$("doneSpeak").onclick = () => {
  if (stopListen) stopListen();
};
$("hideAns").onchange = () => {
  store.set("sp-hide", $("hideAns").checked ? "1" : "0");
  document
    .querySelectorAll(".q")
    .forEach((e) => e.classList.toggle("hide", $("hideAns").checked));
};

$("hideAns").checked = store.get("sp-hide") === "1";
{
  const s = parseInt(store.get("sp-topic"), 10);
  if (s >= 0 && s < T.length) cur = s;
}
tabs();
render();
if (!SR)
  setStatus(
    "Trình duyệt này không hỗ trợ chấm phát âm (nên dùng Chrome/Edge/Safari). Các chức năng nghe vẫn dùng bình thường.",
  );
