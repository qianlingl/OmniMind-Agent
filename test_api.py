import urllib.request
import urllib.error
import json

BASE = 'http://127.0.0.1:8000/api/v1'
KEY = 'dev-key-123'

def call(path, data=None, method='GET'):
    try:
        url = BASE + path
        body = json.dumps(data).encode() if data else None
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header('X-API-Key', KEY)
        req.add_header('Content-Type', 'application/json')
        resp = urllib.request.urlopen(req, timeout=15)
        result = json.loads(resp.read().decode())
        return result
    except urllib.error.HTTPError as e:
        return {'error': e.code, 'detail': e.read().decode()[:300]}
    except Exception as e:
        return {'error': str(e)}

# 1. Create session
print('=== 创建会话 ===')
r = call('/sessions', {'user_id': 'test-user'})
print('session_id:', r.get('session_id', r))

# 2. List sessions with pagination
print('\n=== 会话列表（分页）===')
r = call('/sessions?skip=0&limit=5')
sessions = r.get('sessions', [])
print('total:', r.get('total', '?'))
print('skip:', r.get('skip'))
print('limit:', r.get('limit'))
print('sessions count:', len(sessions))

# 3. Get session
print('\n=== 获取单个会话 ===')
if sessions:
    sid = sessions[0].get('session_id', '')
    r = call('/sessions/' + sid)
    print('messages:', len(r.get('messages', [])))
else:
    print('no sessions found')

# 4. Search memory
print('\n=== 记忆搜索 ===')
r = call('/memory/search?query=test&limit=3')
print('memory results:', len(r.get('results', [])))

# 5. Files list
print('\n=== 文件列表 ===')
r = call('/files/list?path=')
print('files count:', len(r.get('files', [])))
print('path:', r.get('path', ''))

# 6. Rate limit test
print('\n=== 限流测试 ===')
errors = 0
for i in range(65):
    r = call('/health')
    if isinstance(r, dict) and 'error' in r:
        errors += 1
print('rate limit triggered after 65 requests: errors =', errors)

print('\n=== 全部 API 测试完成 ===')
