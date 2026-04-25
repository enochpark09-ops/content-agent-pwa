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

[필수 팩트 - 반드시 준수]
- 이재명은 2025년 6월 4일 취임한 제21대 대한민국 현직 대통령이다. "대표"가 아닌 "대통령"으로 표기할 것.
- 윤석열은 내란 혐의로 파면된 전 대통령이다.
- 현재 여당은 더불어민주당, 야당은 국민의힘이다.
- 웹 검색 결과를 기반으로 할 때, 확인되지 않은 수치나 사건을 임의로 만들지 말 것.
- 여론조사 수치를 인용할 경우, 반드시 웹 검색으로 확인된 실제 수치만 사용할 것.

채널 운영자 성향:
- 중도이지만 다소 진보에 가까운 중도진보 성향 (뉴이재명 지지층)
- 합리적 진보의 시각에서 정책과 정국을 분석
- 팩트와 데이터 기반의 논리적 비판
- 야당(국민의힘)의 정책이나 정치 행태를 날카롭게 지적하되, 여당 내부 문제도 건설적으로 언급
- 이재명 대통령/이재명 정부의 정책 방향에 대체로 공감하면서도 무조건적 옹호는 지양

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
- 확인되지 않은 사실이나 수치를 절대 만들어내지 말 것 (팩트체크 최우선)
- 중도진보 시청자층이 공감할 수 있는 논조와 프레이밍
- 익명 채널이므로 신원 노출 위험 요소 체크
- 한국 정치 맥락에 맞는 이슈 연결
- 제목은 클릭 유도하되 낚시 아닌 실질적 내용 반영
- 반드시 유효한 JSON 객체 하나만 출력하세요. 다른 텍스트, 설명, 마크다운 코드블록을 절대 포함하지 마세요. 첫 글자가 { 이고 마지막 글자가 } 여야 합니다.`,

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
- 반드시 유효한 JSON 객체 하나만 출력하세요. 다른 텍스트, 설명, 마크다운 코드블록을 절대 포함하지 마세요. 첫 글자가 { 이고 마지막 글자가 } 여야 합니다.`,

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
- 반드시 유효한 JSON 객체 하나만 출력하세요. 다른 텍스트, 설명, 마크다운 코드블록을 절대 포함하지 마세요. 첫 글자가 { 이고 마지막 글자가 } 여야 합니다.`,
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
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function callClaude(keyword, channel, note, retryCount = 0) {
  const key = API_KEY();
  if (!key) throw new Error("API 키를 설정해주세요.");

  const systemPrompt = CHANNEL_PROMPTS[channel];
  let userMsg = `키워드: ${keyword}`;
  if (note) userMsg += `\n참고사항: ${note}`;

  // 유튜브(정치시사)는 웹 검색으로 팩트 확인, 블로그/인스타는 웹 검색 불필요
  const useWebSearch = (channel === "youtube");

  if (useWebSearch) {
    userMsg += "\n\n위 키워드에 대해 웹 검색으로 최신 팩트를 확인한 후, 콘텐츠 기획안을 JSON 형식으로 작성해주세요. 확인되지 않은 사실이나 수치를 만들어내지 마세요.";
  } else {
    userMsg += "\n\n위 키워드로 콘텐츠 기획안을 JSON 형식으로 작성해주세요. 반드시 JSON만 출력하세요.";
  }

  const bodyPayload = {
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMsg }],
  };

  if (useWebSearch) {
    bodyPayload.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify(bodyPayload),
  });

  if (res.status === 429 && retryCount < 2) {
    const waitSec = 30 + retryCount * 15;
    console.log(`Rate limited. Waiting ${waitSec}s before retry...`);
    await delay(waitSec * 1000);
    return callClaude(keyword, channel, note, retryCount + 1);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API 오류 (${res.status}): ${err}`);
  }

  const data = await res.json();
  // Extract text from multi-block response (web search may produce multiple blocks)
  let raw = data.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  // Strip code fences
  raw = raw.replace(/```[a-z]*\n?/g, "").replace(/```/g, "").trim();

  // Try to find and parse the deepest valid JSON object
  // Strategy: find the last { and work backwards to find matching pairs
  let parsed = null;

  // Method 1: try direct parse
  try { parsed = JSON.parse(raw); } catch {}

  // Method 2: find JSON block by matching braces
  if (!parsed) {
    let depth = 0, start = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '{') { if (depth === 0) start = i; depth++; }
      else if (raw[i] === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          try {
            parsed = JSON.parse(raw.substring(start, i + 1));
            break;  // Take the first valid complete JSON
          } catch { start = -1; }
        }
      }
    }
  }

  if (parsed) return parsed;
  throw new Error(`JSON 파싱 실패. 원본 응답 일부: ${raw.substring(0, 200)}...`);
}

// ── Trend Keywords via Claude + Web Search ──────────────────────────
const TREND_CATEGORIES = [
  { id: "politics", label: "🔥 정치시사", color: "#ff4444", prompt: `오늘 한국 정치시사 분야에서 유튜브 콘텐츠로 만들기 좋은 최신 핫이슈 키워드 5개를 추천해주세요.

기본 팩트: 이재명은 2025년 6월 4일 취임한 제21대 현직 대통령. 윤석열은 내란으로 파면된 전 대통령. 여당=더불어민주당, 야당=국민의힘.
채널 성향: 중도진보(뉴이재명 지지층) 시각. 합리적 진보 관점에서 정국을 분석하며, 팩트 기반 비판을 중시.

규칙:
- 현재 가장 뜨거운 논쟁/사건 중심
- 중도진보 시청자층이 관심 가질 만한 주제 우선
- 유튜브 정치시사 채널에서 조회수 잘 나올 만한 주제
- 확인되지 않은 사실이나 수치를 만들어내지 말 것
- 각 키워드마다 왜 지금 핫한지 한 줄 설명 포함
- 반드시 아래 JSON 형식만 출력 (마크다운 코드블록 없이)

{"keywords": [{"keyword": "키워드", "reason": "핫한 이유 한 줄"}]}` },
  { id: "lifestyle", label: "☕ 커피·라이프", color: "#00c73c", prompt: `한국 네이버 블로그에서 커피, 일본 라이프스타일 소품, 인테리어 분야의 최신 트렌드 키워드 5개를 추천해주세요.

규칙:
- 네이버 검색량이 높을 만한 키워드
- 커피(원두, 드립, 카페), 일본 소품(SOU SOU, DULTON 등), 미니멀 인테리어 관련
- 각 키워드마다 블로그 포스팅 각도 한 줄 포함
- 반드시 아래 JSON 형식만 출력 (마크다운 코드블록 없이)

{"keywords": [{"keyword": "키워드", "reason": "포스팅 각도 한 줄"}]}` },
  { id: "branding", label: "📸 브랜딩", color: "#e1306c", prompt: `인스타그램 퍼스널 브랜딩에 효과적인 최신 콘텐츠 키워드 5개를 추천해주세요.
타겟: 커피·인테리어·일본 라이프스타일·크리에이터 라이프 관련 한국 인스타그램.

규칙:
- 릴스/캐루셀로 반응 좋을 주제
- 인스타 트렌드와 시즌 이슈 반영
- 각 키워드마다 콘텐츠 형태 추천 한 줄 포함
- 반드시 아래 JSON 형식만 출력 (마크다운 코드블록 없이)

{"keywords": [{"keyword": "키워드", "reason": "콘텐츠 형태 추천 한 줄"}]}` },
];

async function fetchTrendKeywords(categoryId, retryCount = 0) {
  const key = API_KEY();
  if (!key) throw new Error("API 키를 설정해주세요.");

  const category = TREND_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) throw new Error("잘못된 카테고리");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1000,
      messages: [{ role: "user", content: category.prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  if (res.status === 429 && retryCount < 2) {
    const waitSec = 30 + retryCount * 15;
    await delay(waitSec * 1000);
    return fetchTrendKeywords(categoryId, retryCount + 1);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API 오류 (${res.status}): ${err}`);
  }

  const data = await res.json();

  // Extract text from content blocks (may include tool_use results)
  let raw = data.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  // Strip code fences
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  // Try to extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*"keywords"[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
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

  // Trend keywords state
  const [trendCategory, setTrendCategory] = useState("politics");
  const [trendKeywords, setTrendKeywords] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");

  const loadTrends = async (catId) => {
    setTrendCategory(catId);
    setTrendLoading(true);
    setTrendError("");
    setTrendKeywords([]);
    try {
      const result = await fetchTrendKeywords(catId);
      setTrendKeywords(result.keywords || []);
    } catch (err) {
      setTrendError(err.message);
    }
    setTrendLoading(false);
  };

  const applyTrendKeyword = (kw) => {
    // If first slot is empty, fill it; otherwise add new
    if (keywords.length === 1 && !keywords[0].keyword.trim()) {
      setKeywords([{ keyword: kw.keyword, note: kw.reason || "" }]);
    } else {
      setKeywords((prev) => [...prev, { keyword: kw.keyword, note: kw.reason || "" }]);
    }
  };

  const applyAllTrends = () => {
    const newKws = trendKeywords.map((kw) => ({ keyword: kw.keyword, note: kw.reason || "" }));
    if (keywords.length === 1 && !keywords[0].keyword.trim()) {
      setKeywords(newKws);
    } else {
      setKeywords((prev) => [...prev, ...newKws]);
    }
  };

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
          // 유튜브(웹검색) 후에는 45초, 나머지는 20초 대기
          if (count > 1) {
            const prevIdx = count - 2;
            const prevChannel = selectedChannels[prevIdx % selectedChannels.length];
            const waitSec = (prevChannel === "youtube") ? 45 : 20;
            setProgress({ current: count, total, label: `⏳ 대기 중(${waitSec}초)... → ${CHANNELS[ch].icon} ${kw.keyword}` });
            await delay(waitSec * 1000);
            setProgress({ current: count, total, label: `${CHANNELS[ch].icon} ${kw.keyword}` });
          }
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

      {/* Trend Keywords */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={S.label}>🔥 트렌드 키워드 추천</div>
          {trendKeywords.length > 0 && (
            <button style={{ ...S.copyBtn, fontSize: 11, color: "#c9a96e" }} onClick={applyAllTrends}>
              전체 추가
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {TREND_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: trendCategory === cat.id ? `1.5px solid ${cat.color}` : "1.5px solid #3a3f44",
                background: trendCategory === cat.id ? `${cat.color}18` : "transparent",
                color: trendCategory === cat.id ? cat.color : "#71767b",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => loadTrends(cat.id)}
              disabled={trendLoading}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {trendLoading && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#71767b", fontSize: 13 }}>
            <div style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #2f3336", borderTopColor: "#c9a96e", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginRight: 8, verticalAlign: "middle" }} />
            AI가 최신 트렌드를 검색하고 있어요...
          </div>
        )}

        {trendError && (
          <div style={{ color: "#ff6b6b", fontSize: 13, padding: "8px 0" }}>⚠️ {trendError}</div>
        )}

        {trendKeywords.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {trendKeywords.map((kw, i) => (
              <div
                key={i}
                onClick={() => applyTrendKeyword(kw)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  background: "#1e2732",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: "1px solid transparent",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c9a96e55"; e.currentTarget.style.background = "#1e273288"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "#1e2732"; }}
              >
                <span style={{ fontSize: 13, color: "#c9a96e", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e7e9ea", marginBottom: 2 }}>{kw.keyword}</div>
                  <div style={{ fontSize: 12, color: "#71767b", lineHeight: 1.4 }}>{kw.reason}</div>
                </div>
                <span style={{ fontSize: 11, color: "#71767b", flexShrink: 0, marginTop: 2 }}>탭하여 추가 →</span>
              </div>
            ))}
          </div>
        )}

        {!trendLoading && trendKeywords.length === 0 && !trendError && (
          <div style={{ textAlign: "center", padding: "16px 0", color: "#71767b", fontSize: 13 }}>
            카테고리 버튼을 눌러 최신 트렌드 키워드를 받아보세요
          </div>
        )}
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
                      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                        <div style={{ color: "#ff6b6b", marginBottom: 8 }}>
                          ❌ {result.error.includes("429") ? "API 요청 한도 초과 — 1~2분 후 다시 시도해주세요." :
                              result.error.includes("JSON") ? "AI 응답 형식 오류 — 다시 시도하면 해결될 수 있어요." :
                              result.error}
                        </div>
                        {result.error.includes("429") && (
                          <div style={{ fontSize: 12, color: "#8899a6" }}>
                            💡 팁: 채널을 1~2개만 선택하면 성공률이 높아져요.
                          </div>
                        )}
                      </div>
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
          <div><span style={{ color: "#71767b" }}>모델:</span> Claude Sonnet 4.5</div>
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
