---
week: "ref-detailed"
title: "Transformers 및 LLM 상세 학습 가이드 (참고 형식)"
topics: ["Transformer", "LLM", "Attention", "Position Embedding", "Layer Normalization", "수식", "상세학습지"]
---

# 참고: 「상세 학습 가이드」형 HTML 밀도·구조 (Ringo 목표 품질)

아래는 **CME 295 Transformers·LLM 상세 학습 가이드** / **Position Embeddings·Layer Normalization 수식 정리** 수준의 **깊이·분량**을 맞추기 위한 참고 예시이다. 실제 생성 시 이 **정보 밀도**를 따른다.

## 필수 문서 구조 (HTML)

1. `sg-title`: 「{주제} 상세 학습 가이드」
2. `sg-section` **핵심 요약·로드맵** — 전체 목차(번호), 선수지식, 이번 자료 범위
3. **주제별 대단원** (RAG chunk / PDF 큰 절마다 1개 `sg-section`, 최소 6개 이상)
   - `sg-page-ref`: 자료명·p.N
   - `sg-section-title` + 이모지
   - **(1) 왜 배우는가** — 동기·역사·한계 `.sg-highlight`
   - **(2) 핵심 정의** — `.sg-card` 2~3개
   - **(3) 수식·유도** — `<pre><code>` 로 단계별 유도 (변수 표 설명 `.sg-table`)
   - **(4) 직관·비유** — `.sg-card-muted`
   - **(5) 도식** — `.sg-diagram` 안 SVG/CSS (Attention flow, Block diagram 등)
   - **(6) 용어 카드** — 각 신규 용어마다 `.sg-term-card` (정의·예시·헷갈리기 쉬운 점)
   - **(7) 계산·코드 예제** — 숫자 넣어 풀이 또는 pseudo-code
   - **(8) 비교표** — `.sg-table` (예: Sinusoidal vs Learned PE)
4. `sg-section` **최종 정리** — 인과관계 `.sg-flow`, 시험 체크리스트, 오개념

## 수식 정리 파트 예시 (Layer Norm / Position Embedding 스타일)

```html
<div class="sg-section">
  <h2 class="sg-section-title">📐 Layer Normalization — 수식 정리</h2>
  <p class="sg-page-ref">출처: 강의자료 p.12–15</p>
  <div class="sg-card">
    <strong>정의</strong>
    <p>레이어 입력 벡터 x에 대해 feature 차원으로 정규화…</p>
  </div>
  <pre><code>μ = (1/d) Σ x_i
σ² = (1/d) Σ (x_i - μ)²
LayerNorm(x) = γ ⊙ (x - μ) / √(σ² + ε) + β</code></pre>
  <div class="sg-term-card">
    <div class="sg-term-name">γ, β (learnable)</div>
    <p>스케일·시프트 파라미터. BatchNorm과 달리 배치 축이 아니라 …</p>
  </div>
</div>
```

## 분량 기준

- A4 인쇄 **20페이지 이상** (짧은 요약 금지)
- 주제 1개당 최소 **800자 이상** 한국어 설명 + 수식 1블록 이상
- 용어 카드 **10개 이상** (자료에 등장하는 핵심어 전부)
