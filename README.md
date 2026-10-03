# 🧾 Billing & Inventory Management Software

[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](https://github.com/ckaliraj2005/Billing-software-mac-os)
[![Electron](https://img.shields.io/badge/Electron-v41.1.1-47848F.svg)](https://www.electronjs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%203%20(better--sqlite3)-003B57.svg)](https://github.com/WiseLibs/better-sqlite3)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.2-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)

A high-performance, cross-platform desktop application engineered for wholesale, manufacturing, retail, and distribution businesses. Features multi-warehouse inventory, double-entry financial ledger accounting, raw material batching, labour payroll tracking, and comprehensive reporting.

---

## 🌟 Key Features

### 1. Invoicing & Billing Engine
- **Sales & Purchase Invoices**: Generate professional invoices with automatic sequential bill numbering.
- **Agent Commission Option**: Toggleable sales agent commission support with customizable agent name, commission amount or percentage, included in final totals and historical ledger entries.
- **Precision Financial Math**: Epsilon-safe decimal calculations (`roundCurrency` with `Number.EPSILON`) to eliminate floating-point drift across subtotals, percentage/fixed discounts, transport, and packing charges.
- **Manual & Auto Address Editing**: Flexible customer address field that auto-fills on selection while allowing full manual editing, pasting, or clearing without forced fallbacks.
- **Differential Stock Sync**: Real-time inventory deduction upon sale creation, automatic stock rollback on invoice modification, and full restoration on invoice cancellation.
- **Sales & Purchase Returns**: Dedicated return management linked directly to original invoices with automated stock reconciliation.

### 2. Multi-Warehouse Inventory Management
- **Godowns / Warehouses**: Unlimited godowns with stock tracking isolated per location, instant addition, and automatic duplicate prevention.
- **Dual-Unit Metrics**: Simultaneous tracking of **Boxes** and **Pieces per Box** with automatic total quantity math.
- **Rate Tiering**: Track purchase cost, packing fees, transport additions, and custom selling rates per product per godown.
- **Low Stock Alerts**: Visual threshold indicators when item inventory falls below safe operating levels.

### 3. Customer & Supplier Management
- **Party Directory**: Full records for clients, vendors, and suppliers (Name, Phone, GSTIN, Address, State, City).
- **Duplicate Entry Protection**: Intelligent validation preventing accidental duplicate entries for the same customer or phone number.
- **Referential Integrity**: Safety blocks preventing accidental deletion of customers or suppliers with active transaction or ledger history.

### 4. Accounting & Double-Entry Ledger
- **Automatic Ledger Posting**: Every sales invoice, purchase bill, and return automatically creates balanced debit/credit entries in real time.
- **Payment IN & Payment OUT**: Record incoming and outgoing cash flows across **Cash**, **UPI**, **Cheque**, and **Bank Transfer** modes.
- **Manual Ledger Adjustments**: Post ad-hoc debits or credits with custom narration for adjustments, discounts, or fee settlements.
- **Party Statement**: Comprehensive running ledger statement with exportable date and party filters.

### 5. macOS Native Look & Navigation
- **macOS System UI**: Hidden-inset title bar with native traffic light spacing, Apple system font stack (`-apple-system`, `SF Pro Text`), smooth font subpixel antialiasing, custom macOS overlay scrollbars, and focused input rings.
- **Persistent Global Back Button**: Cross-view navigation history stack with real-time breadcrumbs tracking multi-stage workflows (e.g., Transactions › Party List › Sales Invoice › Godown Detail).
- **Keyboard Auto-Focus**: Press `Enter` to automatically advance focus and highlight the next input field across all forms and dialogs. Shift+Enter preserved for multiline address textareas.

### 5. Raw Materials & Manufacturing
- **Stock Batching**: Inward and outward tracking for raw material batches (Kraft Paper, Chemicals, Packaging, etc.).
- **Unit Types**: Support for `Kg`, `Gram`, `Ream`, `Sheet`, `Bag`, `Pcs`, `Box`, `Unit`, and `Pkt`.
- **Material Ledger**: Audit trail for raw materials issued to production or manufacturing units.

### 6. Labour Attendance & Payroll
- **Shift & Wage Tracking**: Record daily worker attendance, total work hours, and per-hour labor costs.
- **Automated Wage Calculation**: Dynamic shift salary calculation with weekly and monthly summary reports.

### 7. Analytics & Reporting
- **Profit & Loss**: Gross sales, total purchases, operational expenses, and net profit calculations.
- **Daily & Monthly Reports**: Consolidated summaries broken down by month and day.
- **Data Export & Print**: 
  - Save as PDF (`Electron Print-to-PDF` engine)
  - Export to CSV for Excel/Sheets (`Ledger`, `Sales`, `Purchases`)
  - Direct WhatsApp invoice sharing

### 8. Reliability & Data Security
- **SQLite with WAL Mode**: Write-Ahead Logging (`WAL`) ensures concurrency, lightning-fast reads, and ACID compliance.
- **Automated Backups**: Automatic timestamped database backups created in your user directory.
- **Offline First**: Runs completely offline with zero mandatory cloud dependencies.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Desktop Runtime** | [Electron](https://www.electronjs.org/) v41.1.1 |
| **Frontend UI** | HTML5, Modern Vanilla JavaScript (ES6+), PostCSS |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) v4.2 |
| **Database Engine** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) v12.8 (Embedded C++ SQLite) |
| **Spreadsheet Engine** | [xlsx](https://www.npmjs.com/package/xlsx) |
| **Packaging & Installer** | [electron-builder](https://www.electron.build/) v26.8 |

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js** (LTS v20+ or v24+): [Download Node.js](https://nodejs.org/)
- **C++ Build Tools** (for compiling native SQLite bindings):
  - **macOS**: `xcode-select --install`
  - **Windows**: `winget install Microsoft.VisualStudio.2022.BuildTools` (or Visual Studio Installer with "Desktop development with C++")

---

### Setup Instructions

#### 1. Clone the Repository
```bash
git clone https://github.com/ckaliraj2005/Billing-software-mac-os.git
cd Billing-software-mac-os
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Rebuild Native SQLite Module
Compile `better-sqlite3` specifically for your system's Electron ABI:
```bash
npm run rebuild:native
```

#### 4. Compile Tailwind CSS
```bash
npm run css:build
```

#### 5. Launch the Application
- **On macOS / Linux**:
  ```bash
  npm start
  ```
- **On Windows**:
  ```powershell
  npm start
  ```
  *(Or simply double-click `run.bat` in the project root folder)*

---

## 📦 Building Standalone Installers

### macOS (`.dmg` & `.zip`)
Build an Apple Silicon (`arm64`) and Intel (`x86_64`) package:
```bash
npm run build -- --mac
```
Output located at: `dist/billing-software-1.0.4.dmg`

> **Note for macOS (Gatekeeper)**: If macOS displays *"App cannot be opened because Apple cannot check it for malicious software"*, remove the quarantine flag:
> ```bash
> sudo xattr -cr "/Applications/Billing Software.app"
> ```

### Windows (`.exe` NSIS Installer)
Build a single-file Windows setup wizard:
```powershell
npm run build -- --win
```
Output located at: `dist/Billing Software Setup 1.0.4.exe`

### Linux (`.AppImage` & `.deb`)
```bash
npm run build -- --linux
```
Output located at: `dist/billing-software-1.0.4.AppImage`

---

## 📁 Project Directory Structure

```text
billing-software/
├── .github/workflows/         # CI/CD Release workflows
├── database/
│   └── db.js                  # SQLite database initialization, schemas & migration
├── renderer/
│   ├── app.js                 # Frontend application logic & UI controllers
│   ├── index.html             # Main dashboard UI structure
│   ├── style.css              # Custom Tailwind CSS rules
│   └── output.css             # Compiled stylesheet
├── services/
│   ├── partyService.js        # Customers, suppliers & contact management
│   ├── purchaseService.js     # Purchases, godowns & inventory stock
│   ├── salesService.js        # Sales billing, discount calculations & stock deduction
│   ├── paymentService.js      # Payments (IN/OUT) & Double-entry ledger
│   ├── returnService.js       # Purchase & sales return handling
│   ├── rawMaterialService.js  # Raw material inventory & batching
│   ├── labourAttendanceService.js # Worker attendance & wage calculation
│   ├── profitLossService.js   # Financial reporting, expenses & net balance
│   └── settingsService.js     # Shop profile, GST & contact details
├── main.js                    # Electron main process & IPC handlers
├── preload.js                 # Secure context bridge between Main & Renderer
├── calc_test.js               # Precision currency arithmetic test suite
├── e2e_qa_suite.js            # End-to-end automated QA testing suite
├── run.bat                    # One-click Windows desktop launcher
├── package.json               # Dependencies and build configurations
└── README.md                  # Project documentation
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Ctrl + S`** (or `Cmd + S`) | Save current invoice / form |
| **`Ctrl + N`** (or `Cmd + N`) | New transaction / entry |
| **`Ctrl + F`** (or `Cmd + F`) | Focus search field |
| **`Ctrl + R`** (or `Cmd + R`) | Reload application view |

---

## 💾 Database & Backup Locations

Your data is stored in the operating system's designated application support directory, ensuring updates never overwrite business records:

- **Windows**:
  - Database: `%APPDATA%\billing-software\billing.db`
  - Backups: `%APPDATA%\billing-software\backups\`
- **macOS**:
  - Database: `~/Library/Application Support/billing-software/billing.db`
  - Backups: `~/Library/Application Support/billing-software/backups/`
- **Linux**:
  - Database: `~/.config/billing-software/billing.db`
  - Backups: `~/.config/billing-software/backups/`

---

## 🧪 Testing & Quality Assurance

Run the automated test suites to verify system health and calculation precision:

```bash
# 1. Test Currency & Rounding Precision:
node calc_test.js

# 2. Run Comprehensive 28-Point E2E QA Regression Suite:
npx electron e2e_qa_suite.js
```

---

## 📄 License
This project is licensed under the **ISC License**.
