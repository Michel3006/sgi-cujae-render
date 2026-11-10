import sys
sys.path.insert(0, '.')
import main
from database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
cols = inspector.get_columns('integrant')
print('Columnas de integrant:')
for c in cols:
    print(' ', c['name'], '(', c['type'], ')')
