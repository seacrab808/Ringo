---
week: "ref-cme295"
title: "Transformers 및 LLM 상세 학습 가이드"
topics: ["Transformer", "LLM", "Attention", "self-attention", "멀티헤드", "GPT", "BERT", "상세학습지", "CME 295"]
course: "딥러닝 CME 295"
source: "CME 295 Transformers 및 LLM 상세 학습 가이드.pdf"
---

# Transformers 및 LLM 상세 학습 가이드 (참고 품질)

**CME 295 Transformers·LLM 상세 학습 가이드** 수준의 **깊이·분량·HTML 구조**를 맞추기 위한 few-shot 앵커이다.

## 필수 문서 구조 (HTML)

1. `sg-title`: 「{주제} 상세 학습 가이드」
2. `sg-section` **핵심 요약·로드맵** — 전체 목차(번호 8줄+), 선수지식, 이번 자료 범위
3. **주제별 대단원** (RAG chunk / PDF 큰 절마다 1개 `sg-section`, 최소 6개 이상)
   - `sg-page-ref`: 자료명·p.N
   - `sg-section-title` + 이모지
   - **(1) 왜 배우는가** — 동기·역사·한계 `.sg-highlight`
   - **(2) 핵심 정의** — `.sg-card` 2~3개
   - **(3) 수식·유도** — `<pre><code>` 단계별 (변수 표 `.sg-table`)
   - **(4) 직관·비유** — `.sg-card-muted`
   - **(5) 도식** — `.sg-diagram` SVG/CSS (Attention flow, Block diagram)
   - **(6) 용어 카드** — `.sg-term-card` (정의·예시·헷갈림)
   - **(7) 계산·코드 예제** — 숫자 풀이 또는 pseudo-code
   - **(8) 비교표** — `.sg-table`
4. `sg-section` **최종 정리** — `.sg-flow`, 시험 체크리스트 15항목+, 오개념

## Transformer / Attention 절 예시 밀도

- Scaled dot-product: $ \mathrm{Attention}(Q,K,V)=\mathrm{softmax}(QK^T/\sqrt{d_k})V $ 유도 전제 설명
- Multi-head: head 분할 이유, 병렬 concat, 출력 projection
- Encoder-Decoder vs Decoder-only (GPT) vs Encoder-only (BERT) **3열 비교표**
- Pre-norm vs Post-norm, residual path 직관 도식

## 분량

- A4 **20페이지 이상** (짧은 요약 금지)
- 대단원당 **800자+** 한국어 + 수식 1블록+
- 용어 카드 **12개 이상**
