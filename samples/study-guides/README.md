# 예시 학습지 (Few-shot용)

고성능 딥러닝 — 이영민 교수님 학습지 PDF를 Ringo few-shot 풀에 넣는 방법입니다.

## 1. PDF 복사 (선택)

아래 파일을 이 폴더에 복사해 두면 팀 내 참고용으로 쓸 수 있습니다.

- `0304 학습지.pdf`
- `0318 학습지.pdf`
- `0401 학습지.pdf`
- `0408 학습지.pdf`
- `0415 학습지.pdf`

> Git에 올리지 않으려면 `.gitignore`에 `*.pdf`가 이미 있으면 그대로 두세요.

## 2. Markdown few-shot 생성

```bash
cd Ringo
pip install pymupdf
python scripts/pdf_to_few_shot.py "samples/study-guides/0304 학습지.pdf" \
  --title "0304 고성능 딥러닝 학습지" \
  --out backend/data/study_guide_examples/0304.md
```

나머지 PDF도 같은 방식으로 `0318.md`, `0401.md` … 생성한 뒤 백엔드를 재시작하면 반영됩니다.

## 3. 품질 팁

- PDF에서 표·수식이 깨지면 해당 부분만 `.md`에 수동 보정  
- 섹션 제목(`## 핵심 개념` 등)을 예시와 통일할수록 생성 형식이 안정적입니다  
