# Korean fonts for study guide PDF export

`NotoSansKR-Regular.otf` is bundled for WeasyPrint so PDFs render Hangul correctly.

If the file is missing, run from repo root:

```bash
mkdir -p backend/assets/fonts
curl -fsSL -o backend/assets/fonts/NotoSansKR-Regular.otf \
  "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf"
```
