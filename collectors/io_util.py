"""파일 저장 도우미. 다른 것에 기대지 않도록 표준 라이브러리만 쓴다."""
import json
import os
import tempfile


def write_json_atomic(path, obj, **dump_kwargs):
    """임시 파일에 다 쓴 뒤 한 번에 바꿔치기한다.

    바로 덮어쓰면 도중에 죽었을 때 잘린 JSON이 남고, 그게 그대로
    커밋·배포되어 화면이 통째로 빈다(20MB짜리 목록은 특히 위험하다).
    임시 파일을 같은 폴더에 만들어야 os.replace 가 원자적으로 동작한다.
    """
    path = os.path.abspath(path)
    folder = os.path.dirname(path)
    os.makedirs(folder, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=folder, prefix=".tmp-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, **dump_kwargs)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
