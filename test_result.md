#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Implementar el CRM "Fidelity Fabián Arenas" (proyecto importado desde GitHub vía ZIP).
  Sistema de fidelización privado del taller con login JWT, gestión de clientes (multi-matrículas/modelos),
  monedero virtual con acumulación por facturas, importación CSV, mailing y administración de usuarios.

backend:
  - task: "Auth login/logout/me/change-password (JWT + HttpOnly cookie)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Endpoints POST /api/auth/login, /api/auth/logout, GET /api/auth/me, POST /api/auth/change-password. Login probado manualmente con marketing@fabianarenas.es / marketing442 devolviendo token JWT."
        - working: true
          agent: "testing"
          comment: "✅ All auth endpoints tested successfully. Login returns JWT token + sets HttpOnly cookie. GET /auth/me correctly requires authentication (401 without token). Change password works and can be reverted. Logout clears cookie. All security checks passing."

  - task: "Admin users CRUD (crear/listar/reset-password/eliminar/editar)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST/GET /api/admin/users, POST /api/admin/users/{id}/reset-password, DELETE /api/admin/users/{id}, PUT /api/admin/users/{id}. Solo accesible para role=admin."
        - working: true
          agent: "testing"
          comment: "✅ All admin user management endpoints working correctly. Created test user, listed users (5 total), reset password, updated role from user to admin, deleted user. Regular users correctly denied access with 403. Admin-only access control verified."

  - task: "Clients CRUD con monedero, multi-matrículas/modelos"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST/GET/PUT/DELETE /api/clients y bulk-delete. Soporte plates[] y models[]."
        - working: true
          agent: "testing"
          comment: "✅ Client CRUD fully functional. Created client with 2 vehicles (plates + models), listed clients, retrieved single client, updated phone and added 3rd vehicle. Multi-matriculas/modelos working correctly. Bulk delete tested and working."

  - task: "Invoices con acumulación 2%/4% en monedero"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST/GET/DELETE /api/clients/{id}/invoices y GET /api/invoices. Reglas de acumulación según tipo de servicio."
        - working: true
          agent: "testing"
          comment: "✅ Invoice wallet accumulation working perfectly. Created invoice with acumular_2 (2% of 100€ = 2€ added to wallet), then acumular_4 (4% of 200€ = 8€ added, total 10€). Verified wallet balance. Deleted invoice and confirmed wallet correctly decreased by 2€ to 8€. All calculations accurate."

  - task: "Importación CSV masiva de clientes"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/clients/import con multipart/form-data."
        - working: true
          agent: "testing"
          comment: "✅ CSV import working correctly. Uploaded CSV with 2 clients, both with multiple vehicles (matriculas/modelos). Import successful: 2 clients created, 0 skipped. Multi-vehicle support in CSV confirmed."

  - task: "Mailing emails (BCC para envío externo)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "GET /api/admin/mailing/emails. Lista emails de clientes activos."
        - working: true
          agent: "testing"
          comment: "✅ Mailing endpoint working. GET /admin/mailing/emails returned 3 unique client emails with names, phones, and fidelizacion numbers. Admin-only access verified."

frontend:
  - task: "Login page + AuthContext"
    implemented: true
    working: "NA"
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Renderiza correctamente, no testeado funcionalmente. Esperar permiso del usuario."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Auth login/logout/me/change-password (JWT + HttpOnly cookie)"
    - "Admin users CRUD (crear/listar/reset-password/eliminar/editar)"
    - "Clients CRUD con monedero, multi-matrículas/modelos"
    - "Invoices con acumulación 2%/4% en monedero"
    - "Importación CSV masiva de clientes"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Proyecto CRM Fidelity Fabián Arenas importado e instalado desde ZIP de GitHub. Backend FastAPI, frontend React, MongoDB activos.
        Usuarios sembrados automáticamente al arrancar (ver /app/memory/test_credentials.md).
        Credenciales admin para testing: marketing@fabianarenas.es / marketing442.
        Por favor testea los endpoints backend listados en current_focus en este orden:
        1) Auth (login, me con bearer, logout, change-password)
        2) Admin users (crear user nuevo, listar, reset-password, editar role, eliminar)
        3) Clients CRUD (crear con plates/models múltiples, listar, get, update, delete, bulk-delete)
        4) Invoices (crear factura con servicio que acumula 2% y otra 4%, verificar wallet incrementa; eliminar factura y verificar wallet decrementa)
        5) Importación CSV (subir un CSV pequeño con 2-3 filas)
        Todas las rutas tienen prefijo /api. La URL base es REACT_APP_BACKEND_URL.
    - agent: "testing"
      message: |
        ✅ BACKEND TESTING COMPLETE - ALL TESTS PASSED (27/27)
        
        Comprehensive backend testing completed successfully. All 6 backend tasks verified and working:
        
        1. Auth endpoints: Login, logout, /auth/me, change-password all working. JWT tokens issued correctly, HttpOnly cookies set, authentication required where expected (401 without token).
        
        2. Admin user management: Full CRUD tested - create, list, reset password, update role, delete. Admin-only access control verified (regular users get 403).
        
        3. Client CRUD: Created clients with multiple vehicles (matriculas/modelos), listed, retrieved, updated, and bulk deleted. Multi-vehicle support confirmed.
        
        4. Invoice wallet system: Tested acumular_2 (2% accumulation) and acumular_4 (4% accumulation). Wallet calculations accurate. Invoice deletion correctly reverses wallet changes.
        
        5. CSV import: Successfully imported 2 clients with multiple vehicles from CSV. Multipart/form-data upload working.
        
        6. Mailing: Admin endpoint returns unique client emails with contact info.
        
        All test data cleaned up. Backend is production-ready.
