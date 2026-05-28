# 학습지 참고 PDF (few-shot import)

Ringo 학습지 품질용 **참고 PDF**를 이 폴더에 넣은 뒤, 프로젝트 루트에서:

```bash
python scripts/ingest_study_guide_examples.py
```

## 필요한 파일명 (정확히 일치)

| 파일명 | 출력 |
|--------|------|
| `0304 학습지.pdf` | `study_guide_examples/0304.md` |
| `0318 학습지.pdf` | `0318.md` |
| `0401 학습지.pdf` | `0401.md` |
| `0408 학습지.pdf` | `0408.md` |
| `0415 학습지.pdf` | `0415.md` |
| `CME 295 Transformers 및 LLM 상세 학습 가이드.pdf` | `cme295_transformers_llm.md` |
| `Position Embeddings 및 Layer Normalization 수식 정리 학습 자료.pdf` | `position_embeddings_layernorm.md` |

Windows 원본 경로 예:

- `...\고성능 딥러닝 - 이영민 교수님\학습지\*.pdf`
- `...\딥러닝 - 최준석 교수님\공부 자료\*.pdf`

다른 경로에서 한 번에 변환:

```bash
python scripts/ingest_study_guide_examples.py --pdf-dir "/path/to/folder/with/pdfs"
```
