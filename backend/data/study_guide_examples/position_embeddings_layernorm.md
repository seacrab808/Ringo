---
week: "ref-pe-ln"
title: "Position Embeddings 및 Layer Normalization 수식 정리"
topics: ["Position Embedding", "Sinusoidal", "Learned PE", "Layer Normalization", "LayerNorm", "RMSNorm", "수식유도", "수식정리"]
course: "딥러닝 CME 295"
source: "Position Embeddings 및 Layer Normalization 수식 정리 학습 자료.pdf"
---

# Position Embeddings 및 Layer Normalization 수식 정리 (참고 품질)

**Position Embeddings·Layer Normalization 수식 정리 학습 자료** 수준 — **수식 유도가 핵심인 절**은 특히 길게.

## 절마다 반복 패턴 (HTML)

| 단계 | 클래스 | 내용 |
|------|--------|------|
| 1 | sg-page-ref | PDF 페이지 |
| 2 | sg-highlight | 이 수식이 해결하는 문제 |
| 3 | sg-card | 기호·변수 정의 표 |
| 4 | pre/code | 최종 공식 |
| 5 | sg-card-muted | 유도 ①②③ 단계 |
| 6 | sg-diagram | 벡터/행렬 직관 (SVG) |
| 7 | sg-term-card × N | 기호별 설명 |
| 8 | sg-card | **숫자 예제** (작은 차원 직접 계산) |
| 9 | sg-table | 방법 비교 (장단점) |

## Sinusoidal Position Encoding

- $PE_{(pos,2i)}=\sin(pos/10000^{2i/d})$, cos 쌍 **왜** 필요한지
- 상대 위치만으로 attention 동작 **직관** 2문단
- Learned PE vs Sinusoidal **비교표** (파라미터·일반화·길이 extrapolation)
- **한 절 최소 1.5페이지**

## Layer Normalization

```html
<pre><code>μ = (1/d) Σ x_i
σ² = (1/d) Σ (x_i - μ)²
LayerNorm(x) = γ ⊙ (x - μ) / √(σ² + ε) + β</code></pre>
```

- BatchNorm vs LayerNorm **축(axis) 차이** 표
- γ, β learnable — `.sg-term-card`
- RMSNorm 변형 (자료에 있을 때)

전체: RAG chunk마다 위 밀도로 작성. A4 20페이지+.
