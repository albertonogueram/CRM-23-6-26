from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------- Configuration ----------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 12

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Fidelity Fabián Arenas")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SEED_USERS = [
    {"email": "lidiafernandez@fabianarenas.es", "password": "lidiafernandez", "name": "Lidia Fernández", "role": "user"},
    {"email": "taller@fabianarenas.es", "password": "tallerfabianarenas442", "name": "Taller", "role": "user"},
    {"email": "marketing@fabianarenas.es", "password": "marketing442", "name": "Marketing", "role": "admin"},
    {"email": "info@fabianarenas.es", "password": "infofabianarenas442", "name": "Info", "role": "user"},
]
SEED_EMAILS = {u["email"] for u in SEED_USERS}
PRIMARY_ADMIN_EMAIL = "marketing@fabianarenas.es"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None
    role: Literal["user", "admin"] = "user"


class ResetUserPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6)


class VehicleEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    matricula: str
    modelo: Optional[str] = ""


class ClientBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    fidelizacion_num: str
    dni: str
    nombre_apellidos: str
    email: Optional[str] = ""
    telefono: Optional[str] = ""
    calle: Optional[str] = ""
    numero: Optional[str] = ""
    codigo_postal: Optional[str] = ""
    localidad: Optional[str] = ""
    matriculas: List[VehicleEntry] = Field(default_factory=list)


class ClientUpdate(BaseModel):
    fidelizacion_num: Optional[str] = None
    dni: Optional[str] = None
    nombre_apellidos: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    calle: Optional[str] = None
    numero: Optional[str] = None
    codigo_postal: Optional[str] = None
    localidad: Optional[str] = None
    matriculas: Optional[List[VehicleEntry]] = None


class Client(ClientBase):
    id: str
    saldo: float = 0.0
    created_at: str
    created_by: str


class UpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[Literal["user", "admin"]] = None


# tipo: 'ninguno' (sin cambios), 'acumular_2' (acumula 2% del sin IVA al saldo, no descuento),
# 'acumular_4' (acumula 4% al saldo, no descuento), 'gastar_saldo' (descuenta hasta el saldo del importe con IVA)
TipoFactura = Literal["ninguno", "acumular_2", "acumular_4", "gastar_saldo"]


class InvoiceCreate(BaseModel):
    numero_factura: str
    importe_sin_iva: float = Field(ge=0)
    tipo: TipoFactura = "ninguno"


class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    client_id: str
    numero_factura: str
    importe_sin_iva: float
    iva_pct: float = 21.0
    importe_con_iva: float
    tipo: TipoFactura = "ninguno"
    saldo_acumulado: float = 0.0  # cantidad agregada al monedero por esta factura
    saldo_gastado: float = 0.0    # cantidad descontada del monedero por esta factura
    importe_final: float
    saldo_resultante: float = 0.0  # saldo del cliente tras esta factura
    created_at: str
    created_by: str


# ---------- Auth dependency ----------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none",
        max_age=ACCESS_TOKEN_MINUTES * 60, path="/",
    )


# ---------- Client normalization helpers ----------
def _legacy_modelo(doc: dict) -> str:
    raw = doc.get("modelo")
    return raw.strip() if isinstance(raw, str) else ""


def _matriculas_from_legacy_string(doc: dict, legacy_modelo: str) -> list:
    m = doc.get("matricula")
    if isinstance(m, str) and m.strip():
        return [{"matricula": m.strip().upper(), "modelo": legacy_modelo}]
    return []


def _coerce_matricula_entry(entry, legacy_modelo: str) -> Optional[dict]:
    if isinstance(entry, str):
        s = entry.strip().upper()
        return {"matricula": s, "modelo": legacy_modelo} if s else None
    if isinstance(entry, dict):
        mat = (entry.get("matricula") or "").strip().upper()
        if not mat:
            return None
        return {"matricula": mat, "modelo": (entry.get("modelo") or "").strip()}
    return None


def _normalize_client(doc: dict) -> dict:
    """Backwards-compat: normalize matriculas to List[{matricula, modelo}]."""
    doc.pop("_id", None)
    legacy_modelo = _legacy_modelo(doc)
    mats = doc.get("matriculas")
    if mats is None:
        doc["matriculas"] = _matriculas_from_legacy_string(doc, legacy_modelo)
    elif isinstance(mats, list):
        doc["matriculas"] = [
            entry for entry in (_coerce_matricula_entry(it, legacy_modelo) for it in mats)
            if entry is not None
        ]
    doc.setdefault("saldo", 0.0)
    return doc


# ---------- Auth endpoints ----------
@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    token = create_access_token(user["id"], user["email"], user.get("role", "user"))
    set_auth_cookie(response, token)
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user.get("role", "user")}}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user.get("role", "user")}


@api_router.post("/auth/change-password")
async def change_password(payload: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    db_user = await db.users.find_one({"id": user["id"]})
    if not db_user or not verify_password(payload.current_password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(payload.new_password), "updated_at": now_iso()}})
    return {"ok": True}


# ---------- Admin ----------
@api_router.post("/admin/users")
async def admin_create_user(payload: CreateUserRequest, admin: dict = Depends(require_admin)):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Este email ya existe")
    user_doc = {
        "id": str(uuid.uuid4()), "email": email,
        "name": payload.name or email.split("@")[0],
        "role": payload.role,
        "password_hash": hash_password(payload.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return user_doc


@api_router.get("/admin/users")
async def admin_list_users(admin: dict = Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)


@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, payload: ResetUserPasswordRequest, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hash_password(payload.new_password), "updated_at": now_iso(), "password_reset_by": admin["email"]}},
    )
    return {"ok": True, "email": target["email"]}


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if target.get("email") in SEED_EMAILS:
        raise HTTPException(status_code=400, detail="No se puede eliminar un usuario base del sistema")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


async def _build_user_email_update(payload_email: str, target: dict, user_id: str, is_seed: bool) -> Optional[str]:
    """Validate and return the new (normalized) email, or None if unchanged."""
    new_email = payload_email.lower().strip()
    if new_email == target.get("email"):
        return None
    if is_seed:
        raise HTTPException(status_code=400, detail="No se puede cambiar el email de un usuario base")
    existing = await db.users.find_one({"email": new_email})
    if existing and existing.get("id") != user_id:
        raise HTTPException(status_code=400, detail="Este email ya está en uso")
    return new_email


def _build_user_role_update(new_role: str, target: dict, user_id: str, admin_id: str, is_seed: bool) -> Optional[str]:
    """Validate and return the new role, or None if unchanged."""
    if new_role == target.get("role"):
        return None
    if is_seed and target.get("email") == PRIMARY_ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="No se puede cambiar el rol del administrador principal")
    if user_id == admin_id and new_role != "admin":
        raise HTTPException(status_code=400, detail="No puedes quitarte el rol de admin a ti mismo")
    return new_role


@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, payload: UpdateUserRequest, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    is_seed = target.get("email") in SEED_EMAILS

    updates: dict = {}
    if payload.email is not None:
        new_email = await _build_user_email_update(payload.email, target, user_id, is_seed)
        if new_email is not None:
            updates["email"] = new_email
    if payload.name is not None:
        updates["name"] = payload.name.strip() or target.get("name", "")
    if payload.role is not None:
        new_role = _build_user_role_update(payload.role, target, user_id, admin["id"], is_seed)
        if new_role is not None:
            updates["role"] = new_role

    if updates:
        updates["updated_at"] = now_iso()
        await db.users.update_one({"id": user_id}, {"$set": updates})

    return await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})


# ---------- Mailing (admin) ----------
@api_router.get("/admin/mailing/emails")
async def admin_list_emails(admin: dict = Depends(require_admin)):
    docs = await db.clients.find(
        {"email": {"$ne": "", "$exists": True}},
        {"_id": 0, "id": 1, "email": 1, "nombre_apellidos": 1, "telefono": 1, "fidelizacion_num": 1},
    ).to_list(10000)
    emails = []
    seen = set()
    for d in docs:
        e = (d.get("email") or "").strip().lower()
        if not e or "@" not in e or e in seen:
            continue
        seen.add(e)
        emails.append({
            "email": e,
            "nombre": d.get("nombre_apellidos") or "",
            "telefono": d.get("telefono") or "",
            "fidelizacion_num": d.get("fidelizacion_num") or "",
        })
    return {"total": len(emails), "emails": emails}


# ---------- Import clients (CSV) ----------
# Header maps moved to module-level constants so they are not rebuilt per request
# and so they can be reused by the small helpers below.
_CSV_BASE_HEADERS = {
    # fidelización
    "n fidelizacion": "fidelizacion_num", "n fidelización": "fidelizacion_num",
    "no fidelizacion": "fidelizacion_num", "no fidelización": "fidelizacion_num",
    "nº fidelizacion": "fidelizacion_num", "nº fidelización": "fidelizacion_num",
    "fidelizacion": "fidelizacion_num", "fidelización": "fidelizacion_num",
    "n de fidelizacion": "fidelizacion_num", "n de fidelización": "fidelizacion_num",
    "nº de fidelizacion": "fidelizacion_num", "nº de fidelización": "fidelizacion_num",
    # dni
    "dni": "dni", "nif": "dni", "documento": "dni",
    # nombre
    "nombre": "nombre_apellidos", "nombre y apellidos": "nombre_apellidos",
    "nombre apellidos": "nombre_apellidos", "apellidos y nombre": "nombre_apellidos",
    "cliente": "nombre_apellidos",
    # contacto
    "email": "email", "correo": "email", "e-mail": "email", "mail": "email",
    "telefono": "telefono", "teléfono": "telefono", "tel": "telefono",
    "movil": "telefono", "móvil": "telefono",
    # dirección
    "calle": "calle", "direccion": "calle", "dirección": "calle",
    "numero": "numero", "número": "numero", "n": "numero",
    "codigo postal": "codigo_postal", "código postal": "codigo_postal", "cp": "codigo_postal",
    "localidad": "localidad", "ciudad": "localidad",
    "poblacion": "localidad", "población": "localidad",
}
_CSV_MATRICULA_BASE = {"matricula", "matrícula", "matriculas", "matrículas"}
_CSV_MODELO_BASE = {"modelo", "vehiculo", "vehículo", "coche"}
_CSV_BLANK_CLIENT_TEMPLATE = {
    "fidelizacion_num": "", "dni": "", "nombre_apellidos": "",
    "email": "", "telefono": "", "calle": "", "numero": "",
    "codigo_postal": "", "localidad": "",
}


def _csv_decode(raw: bytes) -> str:
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=400, detail="No se pudo leer el archivo (codificación no soportada)")


def _csv_detect_delimiter(text: str) -> str:
    import csv as _csv
    try:
        dialect = _csv.Sniffer().sniff(text[:4096], delimiters=",;\t|")
        return dialect.delimiter
    except Exception:
        return ","


def _csv_norm_header(s: str) -> str:
    s = (s or "").strip().lower()
    return s.replace("º", "").replace(".", "").replace("  ", " ")


def _csv_build_header_map(fieldnames: list) -> dict:
    """Map raw header -> ('base', field) OR ('matricula', idx) OR ('modelo', idx)."""
    import re
    header_kind = {}
    for h in fieldnames:
        nh = _csv_norm_header(h)
        if nh in _CSV_BASE_HEADERS:
            header_kind[h] = ("base", _CSV_BASE_HEADERS[nh])
            continue
        # detect "matricula 2", "modelo 2", "matricula_3" etc.
        m = re.match(r"^(matricula|matrícula|modelo|vehiculo|vehículo|coche)\s*[_\-#]?\s*(\d*)\s*$", nh)
        if m:
            kind = "matricula" if m.group(1) in {"matricula", "matrícula"} else "modelo"
            idx = int(m.group(2)) if m.group(2) else 1
            header_kind[h] = (kind, idx)
            continue
        if nh in _CSV_MATRICULA_BASE:
            header_kind[h] = ("matricula", 1)
        elif nh in _CSV_MODELO_BASE:
            header_kind[h] = ("modelo", 1)
    return header_kind


def _csv_validate_required_headers(header_kind: dict, fieldnames: list) -> None:
    values = set(header_kind.values())
    if ("base", "fidelizacion_num") in values and ("base", "dni") in values:
        return
    raise HTTPException(
        status_code=400,
        detail="El CSV debe incluir al menos las columnas 'Nº Fidelización' y 'DNI'. "
               "Cabeceras detectadas: " + ", ".join(fieldnames),
    )


def _csv_split_multi(value: str) -> list:
    import re
    if not value:
        return []
    return [p.strip() for p in re.split(r"[|/;,]", value) if p.strip()]


def _csv_build_vehicle_pairs(mat_by_idx: dict, mod_by_idx: dict) -> list:
    pairs = []
    for i in sorted(mat_by_idx.keys()):
        mats = mat_by_idx[i]
        mods = mod_by_idx.get(i, [])
        for j, m in enumerate(mats):
            pairs.append({
                "matricula": m.upper(),
                "modelo": mods[j] if j < len(mods) else "",
            })
    return pairs


def _csv_parse_row(row: dict, header_kind: dict) -> dict:
    """Build a client dict from a raw CSV row using the header map."""
    client_doc = dict(_CSV_BLANK_CLIENT_TEMPLATE)
    mat_by_idx: dict = {}
    mod_by_idx: dict = {}

    for h, value in row.items():
        kind = header_kind.get(h)
        if not kind:
            continue
        v = (value or "").strip()
        if kind[0] == "base":
            client_doc[kind[1]] = v
        elif kind[0] == "matricula":
            parts = _csv_split_multi(v)
            if parts:
                mat_by_idx.setdefault(kind[1], []).extend(parts)
        elif kind[0] == "modelo":
            parts = _csv_split_multi(v)
            if parts:
                mod_by_idx.setdefault(kind[1], []).extend(parts)

    client_doc["matriculas"] = _csv_build_vehicle_pairs(mat_by_idx, mod_by_idx)
    return client_doc


async def _csv_bulk_insert(created_docs: list, skipped: list) -> int:
    """Bulk insert in batches, fallback to per-doc inserts on batch failure."""
    created = 0
    BATCH = 500
    for i in range(0, len(created_docs), BATCH):
        batch = created_docs[i:i + BATCH]
        if not batch:
            continue
        try:
            result = await db.clients.insert_many(batch, ordered=False)
            created += len(result.inserted_ids)
        except Exception:
            for cli in batch:
                try:
                    await db.clients.insert_one(cli)
                    created += 1
                except Exception as ex:
                    skipped.append({"row": "?", "reason": f"Error al guardar {cli.get('fidelizacion_num')}: {ex}"})
    return created


@api_router.post("/clients/import")
async def import_clients(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    import csv as _csv
    import io

    text = _csv_decode(await file.read())
    delimiter = _csv_detect_delimiter(text)
    reader = _csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="El archivo está vacío o no tiene cabeceras")

    header_kind = _csv_build_header_map(reader.fieldnames)
    _csv_validate_required_headers(header_kind, reader.fieldnames)

    created_docs: list = []
    skipped: list = []
    seen_keys: set = set()

    for idx, row in enumerate(reader, start=2):
        client_doc = _csv_parse_row(row, header_kind)

        if not client_doc["fidelizacion_num"] or not client_doc["dni"] or not client_doc["nombre_apellidos"]:
            skipped.append({"row": idx, "reason": "Faltan campos obligatorios (Nº Fidelización, DNI, Nombre)"})
            continue

        key = (client_doc["fidelizacion_num"].strip(), client_doc["dni"].strip())
        if key in seen_keys:
            skipped.append({"row": idx, "reason": "Duplicado dentro del fichero (mismo Nº Fidelización y DNI)"})
            continue
        seen_keys.add(key)

        client_doc["id"] = str(uuid.uuid4())
        client_doc["saldo"] = 0.0
        client_doc["created_at"] = now_iso()
        client_doc["created_by"] = user["email"]
        created_docs.append(client_doc)

    created = await _csv_bulk_insert(created_docs, skipped)
    return {"created": created, "skipped": skipped, "total_rows_processed": created + len(skipped)}


def _clean_matriculas(items) -> list:
    """Normalize matriculas input: list of strings OR list of dicts → list[{matricula, modelo}]"""
    if not items:
        return []
    out = []
    for it in items:
        entry = _coerce_matricula_entry(it, "")
        if entry is not None:
            out.append(entry)
    return out


# ---------- Clients CRUD ----------
@api_router.post("/clients", response_model=Client)
async def create_client(payload: ClientBase, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["matriculas"] = _clean_matriculas(doc.get("matriculas"))
    doc["id"] = str(uuid.uuid4())
    doc["saldo"] = 0.0
    doc["created_at"] = now_iso()
    doc["created_by"] = user["email"]
    await db.clients.insert_one(doc)
    return _normalize_client(doc)


@api_router.get("/clients", response_model=List[Client])
async def list_clients(user: dict = Depends(get_current_user)):
    clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(20000)
    return [_normalize_client(c) for c in clients]


@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    cli = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return _normalize_client(cli)


@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, payload: ClientUpdate, user: dict = Depends(get_current_user)):
    cli = await db.clients.find_one({"id": client_id})
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "matriculas" in updates:
        updates["matriculas"] = _clean_matriculas(updates["matriculas"])
    updates["updated_at"] = now_iso()
    await db.clients.update_one({"id": client_id}, {"$set": updates})
    cli = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return _normalize_client(cli)


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(get_current_user)):
    cli = await db.clients.find_one({"id": client_id})
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    await db.clients.delete_one({"id": client_id})
    await db.invoices.delete_many({"client_id": client_id})
    return {"ok": True}


class BulkDeleteRequest(BaseModel):
    ids: List[str] = Field(default_factory=list)
    all: bool = False  # if true, delete ALL clients


@api_router.post("/clients/bulk-delete")
async def bulk_delete_clients(payload: BulkDeleteRequest, admin: dict = Depends(require_admin)):
    if payload.all:
        client_count = await db.clients.count_documents({})
        await db.clients.delete_many({})
        await db.invoices.delete_many({})
        return {"deleted": client_count, "invoices_deleted": "all"}
    ids = [i for i in (payload.ids or []) if i]
    if not ids:
        raise HTTPException(status_code=400, detail="Sin IDs para eliminar")
    res = await db.clients.delete_many({"id": {"$in": ids}})
    inv_res = await db.invoices.delete_many({"client_id": {"$in": ids}})
    return {"deleted": res.deleted_count, "invoices_deleted": inv_res.deleted_count}


# ---------- Invoices ----------
def _compute_invoice_amounts(tipo: str, importe_sin_iva: float, importe_con_iva: float, saldo_actual: float):
    """Return (saldo_acumulado, saldo_gastado, importe_final) for the given invoice type."""
    if tipo == "acumular_2":
        return round(importe_sin_iva * 0.02, 2), 0.0, importe_con_iva
    if tipo == "acumular_4":
        return round(importe_sin_iva * 0.04, 2), 0.0, importe_con_iva
    if tipo == "gastar_saldo":
        gastado = round(min(saldo_actual, importe_con_iva), 2)
        return 0.0, gastado, round(importe_con_iva - gastado, 2)
    return 0.0, 0.0, importe_con_iva


@api_router.post("/clients/{client_id}/invoices", response_model=Invoice)
async def create_invoice(client_id: str, payload: InvoiceCreate, user: dict = Depends(get_current_user)):
    cli = await db.clients.find_one({"id": client_id})
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    saldo_actual = float(cli.get("saldo", 0) or 0)

    importe_sin_iva = round(float(payload.importe_sin_iva), 2)
    iva_pct = 21.0
    importe_con_iva = round(importe_sin_iva * (1 + iva_pct / 100), 2)

    saldo_acumulado, saldo_gastado, importe_final = _compute_invoice_amounts(
        payload.tipo, importe_sin_iva, importe_con_iva, saldo_actual,
    )
    nuevo_saldo = round(saldo_actual + saldo_acumulado - saldo_gastado, 2)

    inv = {
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "numero_factura": payload.numero_factura,
        "importe_sin_iva": importe_sin_iva,
        "iva_pct": iva_pct,
        "importe_con_iva": importe_con_iva,
        "tipo": payload.tipo,
        "saldo_acumulado": saldo_acumulado,
        "saldo_gastado": saldo_gastado,
        "importe_final": importe_final,
        "saldo_resultante": nuevo_saldo,
        "created_at": now_iso(),
        "created_by": user["email"],
    }
    await db.invoices.insert_one(inv)
    await db.clients.update_one({"id": client_id}, {"$set": {"saldo": nuevo_saldo}})
    inv.pop("_id", None)
    return inv


@api_router.get("/clients/{client_id}/invoices", response_model=List[Invoice])
async def list_invoices(client_id: str, user: dict = Depends(get_current_user)):
    invs = await db.invoices.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invs


@api_router.delete("/clients/{client_id}/invoices/{invoice_id}")
async def delete_invoice(client_id: str, invoice_id: str, user: dict = Depends(get_current_user)):
    inv = await db.invoices.find_one({"id": invoice_id, "client_id": client_id})
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    cli = await db.clients.find_one({"id": client_id})
    if cli:
        # Revertir efecto sobre saldo
        delta = -float(inv.get("saldo_acumulado", 0) or 0) + float(inv.get("saldo_gastado", 0) or 0)
        nuevo = round(float(cli.get("saldo", 0) or 0) + delta, 2)
        await db.clients.update_one({"id": client_id}, {"$set": {"saldo": nuevo}})
    await db.invoices.delete_one({"id": invoice_id})
    return {"ok": True}


@api_router.get("/invoices", response_model=List[Invoice])
async def list_all_invoices(user: dict = Depends(get_current_user)):
    return await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)


@api_router.get("/")
async def root():
    return {"message": "Fidelity Fabián Arenas API"}


async def _seed_user(u: dict) -> None:
    existing = await db.users.find_one({"email": u["email"]})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": u["email"], "name": u["name"], "role": u["role"],
            "password_hash": hash_password(u["password"]),
            "created_at": now_iso(),
        })
        logger.info(f"Seeded user: {u['email']}")
        return
    updates: dict = {}
    if existing.get("role") != u["role"]:
        updates["role"] = u["role"]
    if not verify_password(u["password"], existing.get("password_hash", "")):
        updates["password_hash"] = hash_password(u["password"])
    if updates:
        await db.users.update_one({"email": u["email"]}, {"$set": updates})
        logger.info(f"Updated seed user: {u['email']}")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.clients.create_index("fidelizacion_num")
    await db.invoices.create_index("client_id")
    for u in SEED_USERS:
        await _seed_user(u)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
