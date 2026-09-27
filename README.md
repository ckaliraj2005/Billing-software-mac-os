# 🧾 Billing Software (macOS & Windows)

![Version](https://img.shields.io/badge/version-1.0.4-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)

A professional, efficient billing, inventory, and ledger management software designed for macOS and Windows. Streamline your invoicing process and keep track of your stock effortlessly.

## ✨ Features
- **Invoice Generation:** Quickly create, format, and print sales and purchase invoices.
- **Precision Financial Math:** Epsilon-safe currency rounding for taxes, discounts, and charges.
- **Inventory Tracking:** Real-time stock updates across multiple godowns/warehouses.
- **Party & Customer Management:** Maintain records of client transactions, addresses, and GST details.
- **Ledger & Accounting:** Automatic double-entry ledger postings with manual adjustments.
- **Reporting:** Generate daily, monthly, and party-wise financial reports.

## 🛠️ Tech Stack
- **Desktop Runtime:** Electron
- **Frontend:** HTML5, Tailwind CSS, JavaScript
- **Database Engine:** SQLite (`better-sqlite3` with WAL mode & foreign keys)

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ or v24+)
- Apple Silicon / Intel developer tools (on macOS: `xcode-select --install`)

### Installation & Run
```bash
git clone https://github.com/ckaliraj2005/Billing-software-mac-os.git
cd Billing-software-mac-os
npm install
npm run rebuild:native
npm run css:build
npm start
```
