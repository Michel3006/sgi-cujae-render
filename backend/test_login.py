import urllib.request
import json

data = json.dumps({"user_name": "admin", "password": "admin123"}).encode('utf-8')
req = urllib.request.Request(
    'http://localhost:8000/auth/login',
    data=data,
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req, timeout=10)
    print('Status:', resp.status)
    print(resp.read().decode())
except Exception as e:
    print('Error:', e)
