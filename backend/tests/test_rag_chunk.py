from app.services.rag_chunk import chunk_text, retrieve_top_chunks


def test_chunk_and_retrieve():
    text = "역전파 gradient descent " * 50 + "CNN convolution pooling " * 50
    chunks = chunk_text(text, chunk_size=200, overlap=40)
    assert len(chunks) > 1
    top = retrieve_top_chunks("역전파 gradient", chunks, top_k=3)
    assert top
    assert any("역전파" in c.content for c in top)
