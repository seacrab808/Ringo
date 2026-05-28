---
week: "ref-formula"
title: "Position Embeddings 및 Layer Normalization 수식 정리 학습 자료"
topics: ["Position Embedding", "Sinusoidal", "Learned PE", "LayerNorm", "RMSNorm", "수식유도"]
---

# 참고: 「수식 정리 학습 자료」형 — 단계별 유도 중심

Position Embeddings / Layer Normalization 같이 **수식이 핵심인 절**은 아래 패턴으로 **길게** 쓴다.

## 절마다 반복 패턴 (HTML)

| 단계 | 클래스 | 내용 |
|------|--------|------|
| 1 | sg-page-ref | PDF 페이지 |
| 2 | sg-highlight | 이 수식이 해결하는 문제 |
| 3 | sg-card | 기호·변수 정의 표 |
| 4 | pre/code | 최종 공식 |
| 5 | sg-card-muted | 유도 과정 (①②③ 단계) |
| 6 | sg-diagram | 벡터/행렬 직관 그림 (SVG) |
| 7 | sg-term-card × N | 각 기호 설명 |
| 8 | sg-card | **숫자 예제** — 작은 차원으로 직접 계산 |
| 9 | sg-table | 다른 방법과 비교 (장단점) |

## Sinusoidal Position Encoding 예시 밀도

- sin/cos 각각 **왜** 쓰는지 주파수 $10000^{2i/d}$ 유도 설명
- 상대적 위치만으로 attention이 동작하는 **직관** 2문단
- Learned positional embedding과 **3행 비교표**
- RoPE 등 후속 기법과의 **연결** 1문단 (자료에 있을 때만)

**한 절만 최소 1.5페이지 분량.** 전체 문서는 모든 RAG chunk를 이 밀도로 다룬다.
