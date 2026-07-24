#!/usr/bin/env python3
"""
시도교육청 '주요업무계획' PDF를 세부사업 단위로 구조화한다.
전북 계획서 기준으로 작성했으며, 교육청별 목차 편차는 매핑/정규식을 조정해 확장한다.

출력: data/plans.json
  [{ office, year, field, area, code, name, dept, tags[], tasks[{title, details[]}], searchtext }]

사용법:
  python3 scripts/parse_plan.py --pdf docs/2026전북교육계획.pdf --office 전북 --year 2026
"""
import os, re, json, argparse
import fitz  # PyMuPDF

FIELD = {'1':'미래','2':'책임','3':'안전','4':'자치','5':'협력','6':'공동체'}
AREA = {
 '1-1':'교육과정','1-2':'수업혁신','1-3':'미래교육',
 '2-1':'학력신장','2-2':'진로·진학 교육','2-3':'차별없는 교육',
 '3-1':'안전한 학교','3-2':'교육복지',
 '4-1':'학교문화','4-2':'교육행정',
 '5-1':'작은학교 지원 강화','5-2':'지역교육 생태계 조성',
 '6-1':'세계 인재 육성','6-2':'지속가능 상생 교육',
}
CODE_RE = re.compile(r'^(\d)-(\d)-(\d+)$')            # 인덱스 표: 1-1-1
HEAD_RE = re.compile(r'^(\d)-(\d)-(\d+)\.\s*(.+)$')   # 상세 헤더: 1-1-1. 유치원 교육과정
TAGS = ('국정과제', '달라지는 정책', '신규', '확대')


def parse_index(doc):
    """추진과제 인덱스 표에서 코드→(사업명, 담당부서) 확보"""
    # 상세 본문(추진과제 ▶/● 서술) 시작 전까지의 앞부분만 스캔해 인덱스 표를 확보
    lines = []
    for p in range(min(48, doc.page_count)):
        lines += [l.strip() for l in doc[p].get_text().split('\n') if l.strip()]
    idx = {}
    for i, l in enumerate(lines):
        m = CODE_RE.match(l)
        if m and i + 2 < len(lines):
            code = l
            if code in idx:
                continue
            idx[code] = {'name': lines[i+1], 'dept': lines[i+2]}
    return idx


def parse_details(doc):
    """전체 본문을 훑어 세부사업 상세(추진과제 ▶ / 세부내용 ●)를 코드별로 수집"""
    lines = []
    for p in range(doc.page_count):
        for l in doc[p].get_text().split('\n'):
            s = l.rstrip()
            if s.strip():
                lines.append(s)
    # 헤더 위치 탐색
    heads = [(i, HEAD_RE.match(l.strip())) for i, l in enumerate(lines)]
    heads = [(i, m) for i, m in heads if m]
    details = {}
    for k, (start, m) in enumerate(heads):
        code = f'{m.group(1)}-{m.group(2)}-{m.group(3)}'
        end = heads[k+1][0] if k + 1 < len(heads) else len(lines)
        block = lines[start:end]
        rec = {'name_detail': m.group(4).strip(), 'tags': [], 'tasks': []}
        cur = None
        for l in block[1:]:
            s = l.strip()
            if s in TAGS:
                if s not in rec['tags']:
                    rec['tags'].append(s)
                continue
            if s.startswith('▶'):
                cur = {'title': s.lstrip('▶ ').strip(), 'details': []}
                rec['tasks'].append(cur)
            elif s.startswith('●') and cur is not None:
                cur['details'].append(s.lstrip('● ').strip())
            elif (s.startswith('-') or s.startswith('·')) and cur is not None and cur['details']:
                cur['details'][-1] += ' / ' + s.lstrip('-· ').strip()
        # 상세가 가장 풍부한 블록을 채택(중복 헤더 대비)
        if code not in details or len(str(rec)) > len(str(details[code])):
            details[code] = rec
    return details


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf', required=True)
    ap.add_argument('--office', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'data', 'plans.json'))
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    idx = parse_index(doc)
    det = parse_details(doc)

    plans = []
    for code, info in sorted(idx.items()):
        f = code.split('-')[0]
        area = '-'.join(code.split('-')[:2])
        d = det.get(code, {})
        tasks = d.get('tasks', [])
        searchtext = ' '.join([
            info['name'], info['dept'], FIELD.get(f, ''), AREA.get(area, ''),
            ' '.join(t['title'] for t in tasks),
            ' '.join(x for t in tasks for x in t['details']),
        ])
        plans.append({
            'office': args.office, 'year': args.year,
            'field': f'{f}.{FIELD.get(f, "")}',
            'area': f'{area} {AREA.get(area, "")}',
            'code': code, 'name': info['name'], 'dept': info['dept'],
            'tags': d.get('tags', []), 'tasks': tasks,
            'searchtext': searchtext,
        })

    # 기존 plans.json 병합(다른 교육청 누적 지원)
    out_path = os.path.abspath(args.out)
    existing = []
    if os.path.exists(out_path):
        try:
            existing = json.load(open(out_path, encoding='utf-8')).get('plans', [])
        except Exception:
            existing = []
    existing = [p for p in existing if not (p['office'] == args.office and p['year'] == args.year)]
    merged = existing + plans

    out = {
        'source': '각 시도교육청 주요업무계획 공개자료',
        'offices': sorted({p['office'] for p in merged}),
        'years': sorted({p['year'] for p in merged}),
        'fields': sorted({p['field'] for p in merged}),
        'depts': sorted({d for p in merged for d in re.split(r'[,/]', p['dept']) if d.strip()}),
        'plans': merged,
    }
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    json.dump(out, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    withdetail = sum(1 for p in plans if p['tasks'])
    print(f'{args.office} {args.year}: {len(plans)}개 사업 (상세 있음 {withdetail}) → {out_path}')


if __name__ == '__main__':
    main()
