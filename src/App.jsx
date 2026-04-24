import { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────
const API_URL = "https://api.anthropic.com/v1/messages";
const API_KEY = () => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_ANTHROPIC_API_KEY) {
    return import.meta.env.VITE_ANTHROPIC_API_KEY;
  }
  return localStorage.getItem("content_agent_api_key") || "";
};

const CHANNELS = {
  youtube: {
    id: "youtube",
    label: "유튜브",
    icon: "🎬",
    desc: "정치시사 익명채널",
    color: "#ff4444",
  },
  blog: {
    id: "blog",
    label: "블로그",
    icon: "📝",
    desc: "원두웍스 네이버 블로그",
    color: "#00c73c",
  },
  instagram: {
    id: "instagram",
    label: "인스타",
    icon: "📸",
    desc: "개인 브랜딩",
    color: "#e1306c",
  },
};

const CHANNEL_PROMPTS = {
  youtube: `당신은 한국 정치시사 유튜브 콘텐츠 기획 전문가입니다.
익명 채널 운영자를 위한 영상 기획안을 작성합니다.

출력 형식 (JSON):
{
  "title_options": ["제목 후보 3개"],
  "thumbnail_concept": "썸네일 컨셉 설명",
  "hook": "첫 15초 훅 스크립트",
  "outline": ["대본 구성 포인트 5-7개"],
  "duration_minutes": 예상_분량,
  "tags": ["태그 10개"],
  "upload_timing": "추천 업로드 시점",
  "controversy_level": "상/중/하",
  "anonymity_notes": "익명 채널 운영 시 주의사항"
}

규칙:
- 자극적이되 팩트 기반, 선동 금지
- 익명 채널이므로 신원 노출 위험 요소 체크
- 한국 정치 맥락에 맞는 이슈 연결
- 제목은 클릭 유도하되 낚시 아닌 실질적 내용 반영
- 반드시 JSON만 출력 (마크다운 코드블록 없이)`,

  blog: `당신은 네이버 블로그 SEO 전문가이자 커피/라이프스타일 콘텐츠 기획자입니다.
'원두웍스' 블로그의 콘텐츠 기획안을 작성합니다. 이 블로그는 더블와이스페이스 스마트스토어(일본 라이프스타일 소품, SOU SOU, DULTON)로의 유입도 겸합니다.

출력 형식 (JSON):
{
  "title": "포스팅 제목 (네이버 SEO 최적화)",
  "title_alternatives": ["대안 제목 2개"],
  "meta_description": "검색 노출용 요약 2줄",
  "structure": [
    {"section": "섹션명", "content_guide": "작성 가이드", "word_count": 예상_글자수}
  ],
  "primary_keywords": ["메인 키워드 3개"],
  "secondary_keywords": ["보조 키워드 5개"],
  "internal_links": "스마트스토어 상품 연결 포인트",
  "cta": "콜투액션 문구",
  "image_plan": ["필요한 이미지 설명"],
  "naver_optimization": "네이버 알고리즘 최적화 팁"
}

규칙:
- 네이버 검색 로직(C-Rank, D.I.A.)을 고려한 키워드 배치
- 자연스럽게 스마트스토어 상품 연결
- 2000-3000자 분량 기준
- 반드시 JSON만 출력 (마크다운 코드블록 없이)`,

  instagram: `당신은 인스타그램 퍼스널 브랜딩 전문가입니다.
개인 브랜딩용 인스타그램 콘텐츠 기획안을 작성합니다.
브랜드 정체성: 커피 · 인테리어 · 일본 라이프스타일 · 크리에이터 라이프

출력 형식 (JSON):
{
  "post_type": "피드/릴스/캐루셀/스토리",
  "caption": "캡션 전문 (줄바꿈 포함)",
  "hashtags": ["해시태그 15-20개"],
  "visual_direction": "비주얼 연출 가이드",
  "carousel_slides": ["캐루셀일 경우 슬라이드별 내용"],
  "reels_script": "릴스일 경우 15-30초 스크립트",
  "posting_time": "추천 게시 시간",
  "engagement_hook": "댓글 유도 질문/CTA",
  "brand_alignment": "브랜드 정체성과의 연결점"
}

규칙:
- 더블와이스페이스 브랜드 톤: 세련되고 따뜻한, 미니멀 재패니즈
- 해시태그는 대형(100만+), 중형(1만-100만), 소형(1만 미만) 혼합
- 진정성 있는 퍼스널 콘텐츠 지향
- 반드시 JSON만 출력 (마크다운 코드블록 없이)`,
};

// ── Styles ────────────────────────────────────────────────────────────
const S = {
  app: {
    height: "100dvh",
    display: "flex",
    flexDirection: "column",
    background: "#0f1419",
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#e7e9ea",
    overflow: "hidden",
  },
  header: {
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #2f3336",
    background: "#0f1419",
    flexShrink: 0,
  },
  logo: {
    fontSize: "18px",
    fontWeight: 800,
    background: "linear-gradient(135deg, #c9a96e, #e8d5a3)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  tabBar: {
    display: "flex",
    borderBottom: "1px solid #2f3336",
    background: "#0f1419",
    flexShrink: 0,
  },
  tab: (active) => ({
    flex: 1,
    padding: "12px 0",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: active ? 700 : 400,
    color: active ? "#c9a96e" : "#71767b",
    borderBottom: active ? "2px solid #c9a96e" : "2px solid transparent",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  content: {
    flex: 1,
    overflow: "auto",
    padding: "16px",
  },
  card: {
    background: "#16202a",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    border: "1px solid #2f3336",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    background: "#1e2732",
    border: "1px solid #3a3f44",
    borderRadius: "8px",
    color: "#e7e9ea",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  },
  label: {
    fontSize: "13px",
    color: "#71767b",
    marginBottom: "6px",
    display: "block",
    fontWeight: 500,
  },
  channelChip: (selected, color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    border: selected ? `2px solid ${color}` : "2px solid #3a3f44",
    background: selected ? `${color}15` : "transparent",
    color: selected ? color : "#71767b",
  }),
  btn: (primary) => ({
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
    background: primary
      ? "linear-gradient(135deg, #c9a96e, #b8944d)"
      : "#1e2732",
    color: primary ? "#0f1419" : "#e7e9ea",
  }),
  resultSection: {
    marginTop: "12px",
  },
  channelResult: (color) => ({
    background: "#16202a",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    borderLeft: `3px solid ${color}`,
  }),
  kvRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: "1px solid #2f333622",
    fontSize: "14px",
  },
  kvKey: {
    color: "#71767b",
    fontWeight: 500,
    minWidth: "80px",
    flexShrink: 0,
  },
  kvVal: {
    color: "#e7e9ea",
    textAlign: "right",
    flex: 1,
    marginLeft: "12px",
    lineHeight: 1.5,
  },
  tag: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    background: "#1e2732",
    color: "#8899a6",
    margin: "2px",
  },
  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid #2f3336",
    borderTopColor: "#c9a96e",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  historyItem: {
    padding: "14px 16px",
    borderBottom: "1px solid #2f3336",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  empty: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#71767b",
  },
  copyBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #3a3f44",
    background: "transparent",
    color: "#8899a6",
    fontSize: "12px",
    cursor: "pointer",
  },
};

// ── API Call ──────────────────────────────────────────────────────────
async function callClaude(keyword, channel, note) {
  const key = API_KEY();
  if (!key) throw new Error("API 키를 설정해주세요.");

  const systemPrompt = CHANNEL_PROMPTS[channel];
  let userMsg = `키워드: ${keyword}`;
  if (note) userMsg += `\n참고사항: ${note}`;
  userMsg += "\n\n위 키워드로 콘텐츠 기획안을 JSON 형식으로 작성해주세요.";

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API 오류 (${res.status}): ${err}`);
  }

  const data = await res.json();
  let raw = data.content[0].text.trim();

  // Strip code fences
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  return JSON.parse(raw);
}

// ── Components ───────────────────────────────────────────────────────

function YouTubeResult({ plan }) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={S.label}>제목 후보</div>
        {(plan.title_options || []).map((t, i) => (
          <div key={i} style={{ padding: "6px 0", fontSize: 14, color: "#e7e9ea" }}>
            {i + 1}. {t}
          </div>
        ))}
      </div>
      <KV label="썸네일 컨셉" value={plan.thumbnail_concept} />
      <div style={{ margin: "12px 0" }}>
        <div style={S.label}>첫 15초 훅</div>
        <div style={{ padding: 12, background: "#1e2732", borderRadius: 8, fontSize: 14, lineHeight: 1.6, fontStyle: "italic", color: "#c9a96e" }}>
          {plan.hook}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={S.label}>대본 구성</div>
        {(plan.outline || []).map((item, i) => (
          <div key={i} style={{ padding: "4px 0 4px 12px", fontSize: 14, borderLeft: "2px solid #2f3336", marginBottom: 4 }}>
            {item}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <MiniCard label="예상 분량" value={`${plan.duration_minutes || "?"}분`} />
        <MiniCard label="논쟁 수위" value={plan.controversy_level} />
        <MiniCard label="업로드 시점" value={plan.upload_timing} />
      </div>
      <KV label="익명 운영 주의" value={plan.anonymity_notes} />
      <div style={{ marginTop: 8 }}>
        <div style={S.label}>태그</div>
        <div>{(plan.tags || []).map((t, i) => <span key={i} style={S.tag}>#{t}</span>)}</div>
      </div>
    </div>
  );
}

function BlogResult({ plan }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{plan.title}</div>
      {(plan.title_alternatives || []).length > 0 && (
        <div style={{ fontSize: 13, color: "#71767b", marginBottom: 12 }}>
          대안: {plan.title_alternatives.join(" / ")}
        </div>
      )}
      <KV label="메타 설명" value={plan.meta_description} />
      <div style={{ margin: "12px 0" }}>
        <div style={S.label}>본문 구조</div>
        {(plan.structure || []).map((sec, i) => (
          <div key={i} style={{ padding: "8px 12px", background: "#1e2732", borderRadius: 8, marginBottom: 6, fontSize: 14 }}>
            <span style={{ fontWeight: 600, color: "#c9a96e" }}>{sec.section}</span>
            <span style={{ color: "#71767b", fontSize: 12, marginLeft: 8 }}>{sec.word_count}자</span>
            <div style={{ color: "#8899a6", marginTop: 4, lineHeight: 1.5 }}>{sec.content_guide}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={S.label}>메인 키워드</div>
        <div>{(plan.primary_keywords || []).map((k, i) => <span key={i} style={{ ...S.tag, background: "#1a3a2a", color: "#00c73c" }}>{k}</span>)}</div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={S.label}>보조 키워드</div>
        <div>{(plan.secondary_keywords || []).map((k, i) => <span key={i} style={S.tag}>{k}</span>)}</div>
      </div>
      <KV label="스마트스토어 연결" value={plan.internal_links} />
      <KV label="CTA" value={plan.cta} />
      <KV label="네이버 최적화" value={plan.naver_optimization} />
    </div>
  );
}

function InstagramResult({ plan }) {
  return (
    <div>
      <MiniCard label="포스트 유형" value={plan.post_type} />
      <div style={{ margin: "12px 0" }}>
        <div style={S.label}>캡션</div>
        <div style={{ padding: 12, background: "#1e2732", borderRadius: 8, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {plan.caption}
        </div>
      </div>
      <KV label="비주얼 연출" value={plan.visual_direction} />
      {plan.carousel_slides && plan.carousel_slides.length > 0 && plan.carousel_slides[0] && (
        <div style={{ margin: "12px 0" }}>
          <div style={S.label}>캐루셀 슬라이드</div>
          {plan.carousel_slides.map((s, i) => (
            <div key={i} style={{ padding: "4px 0 4px 12px", fontSize: 14, borderLeft: "2px solid #e1306c33", marginBottom: 4 }}>
              {i + 1}. {s}
            </div>
          ))}
        </div>
      )}
      {plan.reels_script && (
        <div style={{ margin: "12px 0" }}>
          <div style={S.label}>릴스 스크립트</div>
          <div style={{ padding: 12, background: "#1e2732", borderRadius: 8, fontSize: 14, lineHeight: 1.6, fontStyle: "italic" }}>
            {plan.reels_script}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <MiniCard label="게시 시간" value={plan.posting_time} />
      </div>
      <KV label="댓글 유도" value={plan.engagement_hook} />
      <KV label="브랜드 연결" value={plan.brand_alignment} />
      <div style={{ marginTop: 8 }}>
        <div style={S.label}>해시태그</div>
        <div>{(plan.hashtags || []).map((h, i) => <span key={i} style={{ ...S.tag, color: "#6ca0dc" }}>{h.startsWith("#") ? h : `#${h}`}</span>)}</div>
      </div>
    </div>
  );
}

function KV({ label, value }) {
  if (!value) return null;
  return (
    <div style={S.kvRow}>
      <span style={S.kvKey}>{label}</span>
      <span style={S.kvVal}>{value}</span>
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div style={{ padding: "6px 12px", background: "#1e2732", borderRadius: 8, fontSize: 13 }}>
      <span style={{ color: "#71767b" }}>{label} </span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ── Tab: Generate ────────────────────────────────────────────────────
function GenerateTab({ onGenerated }) {
  const [keywords, setKeywords] = useState([{ keyword: "", note: "" }]);
  const [selectedChannels, setSelectedChannels] = useState(["youtube", "blog", "instagram"]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const resultRef = useRef(null);

  const toggleChannel = (id) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const addKeyword = () => setKeywords((prev) => [...prev, { keyword: "", note: "" }]);
  const removeKeyword = (i) => setKeywords((prev) => prev.filter((_, idx) => idx !== i));
  const updateKeyword = (i, field, val) => {
    setKeywords((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      return next;
    });
  };

  const handleCSVPaste = (text) => {
    const lines = text.split("\n").filter((l) => l.trim());
    const parsed = [];
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts[0]) parsed.push({ keyword: parts[0], note: parts[1] || "" });
    }
    if (parsed.length > 0) setKeywords(parsed);
  };

  const generate = async () => {
    const validKw = keywords.filter((k) => k.keyword.trim());
    if (validKw.length === 0) { setError("키워드를 입력해주세요."); return; }
    if (selectedChannels.length === 0) { setError("채널을 하나 이상 선택해주세요."); return; }

    setLoading(true);
    setError("");
    setResults(null);

    const total = validKw.length * selectedChannels.length;
    setProgress({ current: 0, total, label: "" });

    const allResults = [];
    let count = 0;

    for (const kw of validKw) {
      const kwResults = { keyword: kw.keyword, note: kw.note, channels: {} };
      for (const ch of selectedChannels) {
        count++;
        setProgress({ current: count, total, label: `${CHANNELS[ch].icon} ${kw.keyword}` });
        try {
          const plan = await callClaude(kw.keyword, ch, kw.note);
          kwResults.channels[ch] = { success: true, plan };
        } catch (err) {
          kwResults.channels[ch] = { success: false, error: err.message };
        }
      }
      allResults.push(kwResults);
    }

    setResults(allResults);
    setLoading(false);

    // Save to history
    const historyItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      keywords: validKw.map((k) => k.keyword),
      channels: selectedChannels,
      results: allResults,
    };
    onGenerated(historyItem);

    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  };

  const copyResult = (plan, channel) => {
    const text = JSON.stringify(plan, null, 2);
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={S.content}>
      {/* Channel Selection */}
      <div style={S.card}>
        <div style={S.label}>채널 선택</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.values(CHANNELS).map((ch) => (
            <div
              key={ch.id}
              style={S.channelChip(selectedChannels.includes(ch.id), ch.color)}
              onClick={() => toggleChannel(ch.id)}
            >
              {ch.icon} {ch.label}
            </div>
          ))}
        </div>
      </div>

      {/* Keyword Input */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={S.label}>키워드 입력</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ ...S.copyBtn, fontSize: 11 }}
              onClick={() => {
                const text = prompt("CSV 형식으로 붙여넣기 (키워드,메모)");
                if (text) handleCSVPaste(text);
              }}
            >
              📋 CSV 붙여넣기
            </button>
            <button style={{ ...S.copyBtn, fontSize: 11 }} onClick={addKeyword}>
              + 추가
            </button>
          </div>
        </div>
        {keywords.map((kw, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <input
                style={{ ...S.input, marginBottom: 4 }}
                placeholder="키워드 (예: 윤석열 탄핵 이후 정국)"
                value={kw.keyword}
                onChange={(e) => updateKeyword(i, "keyword", e.target.value)}
              />
              <input
                style={{ ...S.input, fontSize: 13, padding: "8px 14px" }}
                placeholder="메모 (선택)"
                value={kw.note}
                onChange={(e) => updateKeyword(i, "note", e.target.value)}
              />
            </div>
            {keywords.length > 1 && (
              <button
                style={{ ...S.copyBtn, padding: "8px", marginTop: 4 }}
                onClick={() => removeKeyword(i)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...S.card, borderColor: "#ff4444", color: "#ff6b6b", fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Generate Button */}
      <button
        style={{ ...S.btn(true), opacity: loading ? 0.7 : 1, marginBottom: 16 }}
        onClick={generate}
        disabled={loading}
      >
        {loading ? (
          <span>
            ⏳ 생성 중... ({progress.current}/{progress.total}) {progress.label}
          </span>
        ) : (
          `🚀 기획안 생성 (${keywords.filter((k) => k.keyword.trim()).length}개 × ${selectedChannels.length}채널)`
        )}
      </button>

      {/* Results */}
      {results && (
        <div ref={resultRef} style={S.resultSection}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#c9a96e" }}>
            📋 생성 결과
          </div>
          {results.map((kwResult, ki) => (
            <div key={ki} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, padding: "8px 0", borderBottom: "1px solid #2f3336" }}>
                🔑 {kwResult.keyword}
                {kwResult.note && <span style={{ fontSize: 12, color: "#71767b", marginLeft: 8 }}>({kwResult.note})</span>}
              </div>
              {Object.entries(kwResult.channels).map(([ch, result]) => {
                const channelInfo = CHANNELS[ch];
                return (
                  <div key={ch} style={S.channelResult(channelInfo.color)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: channelInfo.color }}>
                        {channelInfo.icon} {channelInfo.label} — {channelInfo.desc}
                      </div>
                      {result.success && (
                        <button style={S.copyBtn} onClick={() => copyResult(result.plan, ch)}>
                          📋 복사
                        </button>
                      )}
                    </div>
                    {result.success ? (
                      ch === "youtube" ? <YouTubeResult plan={result.plan} /> :
                      ch === "blog" ? <BlogResult plan={result.plan} /> :
                      <InstagramResult plan={result.plan} />
                    ) : (
                      <div style={{ color: "#ff6b6b", fontSize: 14 }}>❌ {result.error}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Tab: History ─────────────────────────────────────────────────────
function HistoryTab({ history, onSelect, onDelete }) {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return (
      <div style={S.content}>
        <button style={{ ...S.copyBtn, marginBottom: 12 }} onClick={() => setSelected(null)}>
          ← 목록으로
        </button>
        <div style={{ fontSize: 14, color: "#71767b", marginBottom: 4 }}>
          {new Date(selected.date).toLocaleString("ko-KR")}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          {selected.keywords.join(", ")}
        </div>
        {selected.results.map((kwResult, ki) => (
          <div key={ki} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "#c9a96e" }}>
              🔑 {kwResult.keyword}
            </div>
            {Object.entries(kwResult.channels).map(([ch, result]) => {
              const channelInfo = CHANNELS[ch];
              return (
                <div key={ch} style={S.channelResult(channelInfo.color)}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: channelInfo.color, marginBottom: 12 }}>
                    {channelInfo.icon} {channelInfo.label}
                  </div>
                  {result.success ? (
                    ch === "youtube" ? <YouTubeResult plan={result.plan} /> :
                    ch === "blog" ? <BlogResult plan={result.plan} /> :
                    <InstagramResult plan={result.plan} />
                  ) : (
                    <div style={{ color: "#ff6b6b", fontSize: 14 }}>❌ {result.error}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={S.content}>
      {history.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>기록이 없습니다</div>
          <div style={{ fontSize: 13 }}>기획안을 생성하면 여기에 저장됩니다</div>
        </div>
      ) : (
        history.map((item) => (
          <div
            key={item.id}
            style={S.historyItem}
            onClick={() => setSelected(item)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {item.keywords.join(", ")}
                </div>
                <div style={{ fontSize: 12, color: "#71767b" }}>
                  {new Date(item.date).toLocaleString("ko-KR")} · {item.channels.map((c) => CHANNELS[c]?.icon).join("")}
                </div>
              </div>
              <button
                style={{ ...S.copyBtn, fontSize: 11, color: "#ff6b6b" }}
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              >
                삭제
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Tab: Settings ────────────────────────────────────────────────────
function SettingsTab() {
  const [key, setKey] = useState(localStorage.getItem("content_agent_api_key") || "");
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem("content_agent_api_key", key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={S.content}>
      <div style={S.card}>
        <div style={S.label}>Anthropic API 키</div>
        <input
          type="password"
          style={{ ...S.input, marginBottom: 8 }}
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <div style={{ fontSize: 12, color: "#71767b", marginBottom: 12, lineHeight: 1.5 }}>
          Vercel 배포 시 환경변수(VITE_ANTHROPIC_API_KEY)로 설정하면 이 입력이 불필요합니다.
          여기 입력한 키는 브라우저 로컬에만 저장됩니다.
        </div>
        <button style={S.btn(true)} onClick={save}>
          {saved ? "✅ 저장됨!" : "저장"}
        </button>
      </div>

      <div style={S.card}>
        <div style={S.label}>앱 정보</div>
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <div><span style={{ color: "#71767b" }}>앱:</span> 콘텐츠 기획 에이전트 v1.0</div>
          <div><span style={{ color: "#71767b" }}>브랜드:</span> 더블와이스페이스</div>
          <div><span style={{ color: "#71767b" }}>모델:</span> Claude Sonnet 4</div>
          <div><span style={{ color: "#71767b" }}>채널:</span> 유튜브 · 블로그 · 인스타그램</div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.label}>데이터 관리</div>
        <button
          style={{ ...S.btn(false), color: "#ff6b6b", marginTop: 8 }}
          onClick={() => {
            if (confirm("모든 히스토리를 삭제하시겠습니까?")) {
              localStorage.removeItem("content_agent_history");
              location.reload();
            }
          }}
        >
          🗑 전체 히스토리 삭제
        </button>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("generate");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("content_agent_history") || "[]");
      setHistory(saved);
    } catch { setHistory([]); }
  }, []);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem("content_agent_history", JSON.stringify(newHistory));
  };

  const onGenerated = (item) => {
    const updated = [item, ...history].slice(0, 50); // Keep last 50
    saveHistory(updated);
  };

  const onDelete = (id) => {
    saveHistory(history.filter((h) => h.id !== id));
  };

  const tabs = [
    { id: "generate", label: "✨ 기획 생성" },
    { id: "history", label: "📂 히스토리" },
    { id: "settings", label: "⚙️ 설정" },
  ];

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.logo}>콘텐츠 기획 에이전트</div>
        <div style={{ fontSize: 11, color: "#71767b" }}>더블와이스페이스</div>
      </div>
      <div style={S.tabBar}>
        {tabs.map((t) => (
          <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "generate" && <GenerateTab onGenerated={onGenerated} />}
      {tab === "history" && <HistoryTab history={history} onDelete={onDelete} />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}
