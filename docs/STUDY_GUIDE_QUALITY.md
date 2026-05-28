# 학습지 품질 가이드

Ringo 학습지는 **RAG(첨부 PDF/PPT) + few-shot 참고 예시 + qwen2.5:7b** 로 생성합니다.

## 1. 모델 (필수)

```bash
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

`backend/.env`:

```env
OLLAMA_MODEL=llama3.2:latest          # 일정 파싱만
OLLAMA_STUDY_GUIDE_MODEL=qwen2.5:7b  # 학습지 전용
STUDY_GUIDE_NUM_PREDICT=32768
OLLAMA_EMBED_MODEL=nomic-embed-text
RAG_USE_EMBEDDINGS=true
```

백엔드 재시작 후 Task에서 학습지 **재생성**.

## 2. 참고 PDF → few-shot

### 준비

1. 아래 PDF를 `backend/data/study_guide_import/` 에 **파일명 그대로** 복사  
2. 프로젝트 루트에서:

```bash
python scripts/ingest_study_guide_examples.py
```

| PDF 파일명 | few-shot 출력 |
|------------|----------------|
| `0304 학습지.pdf` … `0415 학습지.pdf` | `0304.md` … `0415.md` |
| `CME 295 Transformers 및 LLM 상세 학습 가이드.pdf` | `cme295_transformers_llm.md` |
| `Position Embeddings 및 Layer Normalization 수식 정리 학습 자료.pdf` | `position_embeddings_layernorm.md` |

Windows에서 다른 폴더에 있으면:

```bash
python scripts/ingest_study_guide_examples.py --pdf-dir "경로/학습지"
```

### 단일 PDF

```bash
python scripts/pdf_to_few_shot.py "경로/파일.pdf" \
  --out backend/data/study_guide_examples/0408.md \
  --week 0408 --title "RNN과 시퀀스 모델" \
  --topics "RNN,LSTM,GRU" --course "고성능 딥러닝"
```

## 3. 이미 포함된 예시

PDF 없이도 다음이 `data/study_guide_examples/` 에 있습니다.

- 주차별 요약: `0304`–`0415` (ingest 후 PDF 본문으로 덮어씀)
- CME 295 / PE·LN 구조 앵커: `cme295_transformers_llm.md`, `position_embeddings_layernorm.md`

생성 시 **주제·주차와 가까운 예시 3개**가 자동 선택됩니다.

## 4. 생성 후 보완

Task 페이지 **학습지 수정 AI**로 절 단위 보강 (수식 유도, 숫자 예제 등).

## 5. 트러블슈팅

| 증상 | 조치 |
|------|------|
| 짧은 요약만 나옴 | `OLLAMA_STUDY_GUIDE_MODEL` 확인, `qwen2.5:7b` 사용 |
| 한국어 깨짐 | llama3.2 대신 qwen 사용 |
| 사실 오류 | 첨부 PDF 품질·RAG 청크 확인 |
| 타임아웃 | `STUDY_GUIDE_TIMEOUT_SECONDS=600` |
