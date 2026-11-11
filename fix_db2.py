import json, datetime
p = r'.data\db.json'
with open(p, 'r', encoding='utf-8') as f:
    db = json.load(f)
for c in db.get('classes', []):
    if c.get('id') == 'class-conversation-starter':
        for m in c.get('modules', []):
            if m.get('id') == 'cm-conv-1':
                m['filePDF'] = 'classes/class-conversation-starter/modules/cm-conv-1/materi-uji-flipbook.pdf'
                m['fileAsli'] = 'classes/class-conversation-starter/modules/cm-conv-1/materi-uji-flipbook.pdf'
                m['fileType'] = 'pdf'
                m['fileAsliName'] = 'materi-uji-flipbook-4hal.pdf'
                m['updatedAt'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
with open(p, 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)
print('ok')
