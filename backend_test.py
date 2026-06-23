#!/usr/bin/env python3
"""
Backend API Test Suite for Fidelity Fabián Arenas CRM
Tests all backend endpoints with realistic data
"""
import requests
import json
import io
import sys
from typing import Optional

# Read backend URL from frontend/.env
with open('/app/frontend/.env', 'r') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip() + '/api'
            break

print(f"Testing backend at: {BASE_URL}\n")

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "marketing@fabianarenas.es"
ADMIN_PASSWORD = "marketing442"
USER_EMAIL = "lidiafernandez@fabianarenas.es"
USER_PASSWORD = "lidiafernandez"

# Global state
admin_token = None
user_token = None
test_user_id = None
test_client_id = None
test_invoice_id = None

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def success(self, msg):
        self.passed += 1
        print(f"✅ {msg}")
    
    def fail(self, msg, details=None):
        self.failed += 1
        error = f"❌ {msg}"
        if details:
            error += f"\n   Details: {details}"
        print(error)
        self.errors.append(error)
    
    def summary(self):
        print("\n" + "="*80)
        print(f"TEST SUMMARY: {self.passed} passed, {self.failed} failed")
        if self.errors:
            print("\nFailed tests:")
            for err in self.errors:
                print(err)
        print("="*80)
        return self.failed == 0

result = TestResult()

def make_request(method, endpoint, token=None, json_data=None, files=None, expect_status=200):
    """Helper to make HTTP requests"""
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            if files:
                resp = requests.post(url, headers=headers, files=files, timeout=10)
            else:
                headers["Content-Type"] = "application/json"
                resp = requests.post(url, headers=headers, json=json_data, timeout=10)
        elif method == "PUT":
            headers["Content-Type"] = "application/json"
            resp = requests.put(url, headers=headers, json=json_data, timeout=10)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        if resp.status_code != expect_status:
            return None, f"Expected {expect_status}, got {resp.status_code}: {resp.text[:200]}"
        
        try:
            return resp.json(), None
        except:
            return {"ok": True}, None
    except Exception as e:
        return None, str(e)

# ============================================================================
# 1. AUTH TESTS
# ============================================================================
print("\n" + "="*80)
print("1. TESTING AUTH ENDPOINTS")
print("="*80)

# 1.1 Login as admin
print("\n1.1 POST /auth/login (admin)")
data, err = make_request("POST", "/auth/login", json_data={
    "email": ADMIN_EMAIL,
    "password": ADMIN_PASSWORD
})
if err:
    result.fail("Admin login failed", err)
    sys.exit(1)
elif data and "token" in data and "user" in data:
    admin_token = data["token"]
    if data["user"]["role"] == "admin":
        result.success(f"Admin login successful: {data['user']['email']}")
    else:
        result.fail("Admin login returned wrong role", f"Expected admin, got {data['user']['role']}")
else:
    result.fail("Admin login response missing token or user", str(data))
    sys.exit(1)

# 1.2 Login as regular user
print("\n1.2 POST /auth/login (regular user)")
data, err = make_request("POST", "/auth/login", json_data={
    "email": USER_EMAIL,
    "password": USER_PASSWORD
})
if err:
    result.fail("User login failed", err)
elif data and "token" in data:
    user_token = data["token"]
    result.success(f"User login successful: {data['user']['email']}")
else:
    result.fail("User login response missing token", str(data))

# 1.3 GET /auth/me with admin token
print("\n1.3 GET /auth/me (with admin token)")
data, err = make_request("GET", "/auth/me", token=admin_token)
if err:
    result.fail("GET /auth/me failed", err)
elif data and data.get("email") == ADMIN_EMAIL and data.get("role") == "admin":
    result.success(f"GET /auth/me returned correct admin user: {data['email']}")
else:
    result.fail("GET /auth/me returned incorrect data", str(data))

# 1.4 GET /auth/me without token (should fail)
print("\n1.4 GET /auth/me (without token - should fail)")
data, err = make_request("GET", "/auth/me", expect_status=401)
if err:
    result.fail("GET /auth/me without token should return 401", err)
else:
    result.success("GET /auth/me without token correctly returned 401")

# 1.5 Change password
print("\n1.5 POST /auth/change-password")
data, err = make_request("POST", "/auth/change-password", token=admin_token, json_data={
    "current_password": ADMIN_PASSWORD,
    "new_password": "newpassword123"
})
if err:
    result.fail("Change password failed", err)
elif data and data.get("ok"):
    result.success("Password changed successfully")
    # Change it back
    data2, err2 = make_request("POST", "/auth/change-password", token=admin_token, json_data={
        "current_password": "newpassword123",
        "new_password": ADMIN_PASSWORD
    })
    if data2 and data2.get("ok"):
        result.success("Password restored to original")
    else:
        result.fail("Failed to restore password", err2)
else:
    result.fail("Change password response invalid", str(data))

# 1.6 Logout
print("\n1.6 POST /auth/logout")
data, err = make_request("POST", "/auth/logout")
if err:
    result.fail("Logout failed", err)
elif data and data.get("ok"):
    result.success("Logout successful")
else:
    result.fail("Logout response invalid", str(data))

# ============================================================================
# 2. ADMIN USER MANAGEMENT TESTS
# ============================================================================
print("\n" + "="*80)
print("2. TESTING ADMIN USER MANAGEMENT")
print("="*80)

# 2.1 Create new user (admin only)
print("\n2.1 POST /admin/users (create new user)")
data, err = make_request("POST", "/admin/users", token=admin_token, json_data={
    "email": "testuser@fabianarenas.es",
    "password": "testpass123",
    "name": "Test User",
    "role": "user"
})
if err:
    result.fail("Create user failed", err)
elif data and "id" in data and data.get("email") == "testuser@fabianarenas.es":
    test_user_id = data["id"]
    result.success(f"User created successfully: {data['email']} (ID: {test_user_id})")
else:
    result.fail("Create user response invalid", str(data))

# 2.2 List users (admin only)
print("\n2.2 GET /admin/users (list all users)")
data, err = make_request("GET", "/admin/users", token=admin_token)
if err:
    result.fail("List users failed", err)
elif isinstance(data, list) and len(data) >= 4:  # At least 4 seed users + test user
    result.success(f"List users returned {len(data)} users")
else:
    result.fail("List users response invalid", f"Expected list with >=4 users, got {type(data)}")

# 2.3 Try to access admin endpoint as regular user (should fail)
print("\n2.3 GET /admin/users (as regular user - should fail with 403)")
data, err = make_request("GET", "/admin/users", token=user_token, expect_status=403)
if err:
    result.fail("Regular user should get 403 for admin endpoint", err)
else:
    result.success("Regular user correctly denied access to admin endpoint (403)")

# 2.4 Reset user password (admin only)
if test_user_id:
    print("\n2.4 POST /admin/users/{id}/reset-password")
    data, err = make_request("POST", f"/admin/users/{test_user_id}/reset-password", 
                            token=admin_token, json_data={"new_password": "resetpass456"})
    if err:
        result.fail("Reset password failed", err)
    elif data and data.get("ok") and data.get("email") == "testuser@fabianarenas.es":
        result.success(f"Password reset successful for {data['email']}")
    else:
        result.fail("Reset password response invalid", str(data))

# 2.5 Update user (change role)
if test_user_id:
    print("\n2.5 PUT /admin/users/{id} (change role to admin)")
    data, err = make_request("PUT", f"/admin/users/{test_user_id}", 
                            token=admin_token, json_data={"role": "admin", "name": "Test Admin"})
    if err:
        result.fail("Update user failed", err)
    elif data and data.get("role") == "admin" and data.get("name") == "Test Admin":
        result.success(f"User updated successfully: role={data['role']}, name={data['name']}")
    else:
        result.fail("Update user response invalid", str(data))

# 2.6 Delete user (admin only)
if test_user_id:
    print("\n2.6 DELETE /admin/users/{id}")
    data, err = make_request("DELETE", f"/admin/users/{test_user_id}", token=admin_token)
    if err:
        result.fail("Delete user failed", err)
    elif data and data.get("ok"):
        result.success(f"User deleted successfully (ID: {test_user_id})")
        test_user_id = None
    else:
        result.fail("Delete user response invalid", str(data))

# ============================================================================
# 3. CLIENT CRUD TESTS
# ============================================================================
print("\n" + "="*80)
print("3. TESTING CLIENT CRUD")
print("="*80)

# 3.1 Create client with multiple plates and models
print("\n3.1 POST /clients (with multiple plates/models)")
data, err = make_request("POST", "/clients", token=admin_token, json_data={
    "fidelizacion_num": "TEST001",
    "dni": "12345678A",
    "nombre_apellidos": "Juan García Martínez",
    "email": "juan.garcia@example.com",
    "telefono": "666777888",
    "calle": "Calle Mayor",
    "numero": "10",
    "codigo_postal": "28001",
    "localidad": "Madrid",
    "matriculas": [
        {"matricula": "1234ABC", "modelo": "Seat Ibiza"},
        {"matricula": "5678DEF", "modelo": "Ford Focus"}
    ]
})
if err:
    result.fail("Create client failed", err)
elif data and "id" in data and data.get("fidelizacion_num") == "TEST001":
    test_client_id = data["id"]
    if len(data.get("matriculas", [])) == 2:
        result.success(f"Client created with 2 vehicles: {data['nombre_apellidos']} (ID: {test_client_id})")
    else:
        result.fail("Client created but matriculas incorrect", f"Expected 2, got {len(data.get('matriculas', []))}")
else:
    result.fail("Create client response invalid", str(data))

# 3.2 List clients
print("\n3.2 GET /clients")
data, err = make_request("GET", "/clients", token=admin_token)
if err:
    result.fail("List clients failed", err)
elif isinstance(data, list) and len(data) >= 1:
    result.success(f"List clients returned {len(data)} client(s)")
else:
    result.fail("List clients response invalid", str(data))

# 3.3 Get single client
if test_client_id:
    print("\n3.3 GET /clients/{id}")
    data, err = make_request("GET", f"/clients/{test_client_id}", token=admin_token)
    if err:
        result.fail("Get client failed", err)
    elif data and data.get("id") == test_client_id and data.get("saldo") == 0.0:
        result.success(f"Get client successful: {data['nombre_apellidos']}, saldo={data['saldo']}")
    else:
        result.fail("Get client response invalid", str(data))

# 3.4 Update client
if test_client_id:
    print("\n3.4 PUT /clients/{id} (update phone and add vehicle)")
    data, err = make_request("PUT", f"/clients/{test_client_id}", token=admin_token, json_data={
        "telefono": "999888777",
        "matriculas": [
            {"matricula": "1234ABC", "modelo": "Seat Ibiza"},
            {"matricula": "5678DEF", "modelo": "Ford Focus"},
            {"matricula": "9999XYZ", "modelo": "Renault Clio"}
        ]
    })
    if err:
        result.fail("Update client failed", err)
    elif data and data.get("telefono") == "999888777" and len(data.get("matriculas", [])) == 3:
        result.success(f"Client updated: phone={data['telefono']}, vehicles={len(data['matriculas'])}")
    else:
        result.fail("Update client response invalid", str(data))

# ============================================================================
# 4. INVOICE & WALLET TESTS
# ============================================================================
print("\n" + "="*80)
print("4. TESTING INVOICES & WALLET ACCUMULATION")
print("="*80)

if test_client_id:
    # 4.1 Create invoice with 2% accumulation
    print("\n4.1 POST /clients/{id}/invoices (acumular_2 - 2% accumulation)")
    data, err = make_request("POST", f"/clients/{test_client_id}/invoices", token=admin_token, json_data={
        "numero_factura": "FAC-001",
        "importe_sin_iva": 100.0,
        "tipo": "acumular_2"
    })
    if err:
        result.fail("Create invoice (2%) failed", err)
    elif data and "id" in data:
        test_invoice_id = data["id"]
        expected_acum = 2.0  # 2% of 100
        if data.get("saldo_acumulado") == expected_acum and data.get("saldo_resultante") == expected_acum:
            result.success(f"Invoice created with 2% accumulation: +{data['saldo_acumulado']}€, wallet={data['saldo_resultante']}€")
        else:
            result.fail("Invoice 2% accumulation incorrect", 
                       f"Expected acum={expected_acum}, wallet={expected_acum}, got acum={data.get('saldo_acumulado')}, wallet={data.get('saldo_resultante')}")
    else:
        result.fail("Create invoice (2%) response invalid", str(data))
    
    # 4.2 Create invoice with 4% accumulation
    print("\n4.2 POST /clients/{id}/invoices (acumular_4 - 4% accumulation)")
    data, err = make_request("POST", f"/clients/{test_client_id}/invoices", token=admin_token, json_data={
        "numero_factura": "FAC-002",
        "importe_sin_iva": 200.0,
        "tipo": "acumular_4"
    })
    if err:
        result.fail("Create invoice (4%) failed", err)
    elif data and "id" in data:
        expected_acum = 8.0  # 4% of 200
        expected_wallet = 10.0  # 2.0 from previous + 8.0
        if data.get("saldo_acumulado") == expected_acum and data.get("saldo_resultante") == expected_wallet:
            result.success(f"Invoice created with 4% accumulation: +{data['saldo_acumulado']}€, wallet={data['saldo_resultante']}€")
        else:
            result.fail("Invoice 4% accumulation incorrect", 
                       f"Expected acum={expected_acum}, wallet={expected_wallet}, got acum={data.get('saldo_acumulado')}, wallet={data.get('saldo_resultante')}")
    else:
        result.fail("Create invoice (4%) response invalid", str(data))
    
    # 4.3 Verify client wallet balance
    print("\n4.3 GET /clients/{id} (verify wallet balance)")
    data, err = make_request("GET", f"/clients/{test_client_id}", token=admin_token)
    if err:
        result.fail("Get client for wallet verification failed", err)
    elif data and data.get("saldo") == 10.0:
        result.success(f"Client wallet balance correct: {data['saldo']}€")
    else:
        result.fail("Client wallet balance incorrect", f"Expected 10.0, got {data.get('saldo')}")
    
    # 4.4 List client invoices
    print("\n4.4 GET /clients/{id}/invoices")
    data, err = make_request("GET", f"/clients/{test_client_id}/invoices", token=admin_token)
    if err:
        result.fail("List client invoices failed", err)
    elif isinstance(data, list) and len(data) == 2:
        result.success(f"List client invoices returned {len(data)} invoices")
    else:
        result.fail("List client invoices response invalid", f"Expected 2 invoices, got {len(data) if isinstance(data, list) else 'not a list'}")
    
    # 4.5 Delete invoice and verify wallet decreases
    if test_invoice_id:
        print("\n4.5 DELETE /clients/{id}/invoices/{invoice_id} (verify wallet decreases)")
        data, err = make_request("DELETE", f"/clients/{test_client_id}/invoices/{test_invoice_id}", token=admin_token)
        if err:
            result.fail("Delete invoice failed", err)
        elif data and data.get("ok"):
            result.success("Invoice deleted successfully")
            # Verify wallet decreased
            data2, err2 = make_request("GET", f"/clients/{test_client_id}", token=admin_token)
            if err2:
                result.fail("Get client after invoice deletion failed", err2)
            elif data2 and data2.get("saldo") == 8.0:  # Should be 10.0 - 2.0
                result.success(f"Wallet correctly decreased after invoice deletion: {data2['saldo']}€")
            else:
                result.fail("Wallet not correctly updated after deletion", f"Expected 8.0, got {data2.get('saldo')}")
        else:
            result.fail("Delete invoice response invalid", str(data))

# ============================================================================
# 5. CSV IMPORT TEST
# ============================================================================
print("\n" + "="*80)
print("5. TESTING CSV IMPORT")
print("="*80)

print("\n5.1 POST /clients/import (CSV with 2 clients)")
csv_content = """Nº Fidelización,DNI,Nombre y Apellidos,Email,Teléfono,Matrícula,Modelo,Matrícula 2,Modelo 2
CSV001,11111111A,María López Sánchez,maria.lopez@example.com,611222333,1111AAA,Toyota Corolla,2222BBB,Honda Civic
CSV002,22222222B,Pedro Fernández García,pedro.fernandez@example.com,622333444,3333CCC,Volkswagen Golf,,
"""
files = {'file': ('test_clients.csv', io.BytesIO(csv_content.encode('utf-8')), 'text/csv')}
data, err = make_request("POST", "/clients/import", token=admin_token, files=files)
if err:
    result.fail("CSV import failed", err)
elif data and data.get("created") == 2:
    result.success(f"CSV import successful: {data['created']} clients created, {len(data.get('skipped', []))} skipped")
else:
    result.fail("CSV import response invalid", str(data))

# ============================================================================
# 6. MAILING TEST
# ============================================================================
print("\n" + "="*80)
print("6. TESTING MAILING")
print("="*80)

print("\n6.1 GET /admin/mailing/emails")
data, err = make_request("GET", "/admin/mailing/emails", token=admin_token)
if err:
    result.fail("Get mailing emails failed", err)
elif data and "emails" in data and "total" in data:
    result.success(f"Mailing emails retrieved: {data['total']} emails found")
    if data['total'] >= 3:  # Should have at least test client + 2 CSV imports
        result.success(f"Email list contains expected entries (sample: {data['emails'][0]['email']})")
else:
    result.fail("Get mailing emails response invalid", str(data))

# ============================================================================
# 7. CLEANUP
# ============================================================================
print("\n" + "="*80)
print("7. CLEANUP TEST DATA")
print("="*80)

# Delete test client and CSV imports
print("\n7.1 Deleting test clients")
data, err = make_request("GET", "/clients", token=admin_token)
if data and isinstance(data, list):
    test_ids = [c["id"] for c in data if c.get("fidelizacion_num", "").startswith(("TEST", "CSV"))]
    if test_ids:
        data2, err2 = make_request("POST", "/clients/bulk-delete", token=admin_token, json_data={"ids": test_ids})
        if err2:
            result.fail("Bulk delete test clients failed", err2)
        elif data2 and data2.get("deleted") == len(test_ids):
            result.success(f"Cleaned up {data2['deleted']} test clients")
        else:
            result.fail("Bulk delete response invalid", str(data2))

# ============================================================================
# FINAL SUMMARY
# ============================================================================
success = result.summary()
sys.exit(0 if success else 1)
