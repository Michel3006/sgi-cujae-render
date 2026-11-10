import sqlite3
import bcrypt

db_path = 'app.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Agregar columna password_hash si no existe
try:
    cur.execute("ALTER TABLE integrant ADD COLUMN password_hash VARCHAR")
    print("Columna password_hash agregada")
except Exception as e:
    print(f"Columna ya existe o error: {e}")

# Crear hash de contraseña
password_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')

# Verificar si el usuario admin ya existe
cur.execute("SELECT id_integrant FROM integrant WHERE user_name = 'admin'")
row = cur.fetchone()
if row:
    integrant_id = row[0]
    cur.execute("UPDATE integrant SET password_hash = ? WHERE id_integrant = ?", (password_hash, integrant_id))
    print(f"Usuario admin actualizado (id={integrant_id})")
else:
    cur.execute(
        "INSERT INTO integrant (name, identity, external, email, phone, work_center, curriculum, user_name, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ('Usuario Administrador', '', 0, 'admin@sgi.cu', '', '', '', 'admin', password_hash)
    )
    integrant_id = cur.lastrowid
    print(f"Usuario admin creado (id={integrant_id})")

# Asignar todos los roles (ids 1-7)
cur.execute("DELETE FROM integrant_role WHERE id_integrant = ?", (integrant_id,))
for rid in [1, 2, 3, 4, 5, 6, 7]:
    cur.execute("INSERT INTO integrant_role (id_integrant, id_role) VALUES (?, ?)", (integrant_id, rid))

conn.commit()

# Verificar
cur.execute("SELECT r.role_name FROM roles r JOIN integrant_role ir ON r.id_rol = ir.id_role WHERE ir.id_integrant = ?", (integrant_id,))
roles = [r[0] for r in cur.fetchall()]
print(f"Roles asignados: {roles}")

conn.close()
