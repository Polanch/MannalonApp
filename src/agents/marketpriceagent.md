Tell frontend Copilot to use this final contract:
1.
Farmer seasons/production
•
GET /api/farmer/farmte/seasons?userId&farmId → [{ id, userId, farmId, commodity, variety, seasonType, areaHa, plantingDate, irrigation, status, createdAt }]
•
POST /api/farmer/farmte/seasons?userId body: { commodity?, variety?, seasonType, areaHa, plantingDate?, irrigation? } (commodity defaults to RICE)
•
PUT /api/farmer/farmte/seasons/{id}/close?userId → same season shape
•
GET /api/farmer/farmte/harvests?seasonId → [{ id, seasonId, harvestDate, sacks, kgPerSack, condition, notes, totalKg, createdAt }]
•
POST /api/farmer/farmte/harvests?userId body: { seasonId, harvestDate, sacks, kgPerSack, condition?, notes? }
•
DELETE /api/farmer/farmte/harvests/{id}?userId → 204
•
GET /api/farmer/farmte/sales?seasonId → [{ id, seasonId, saleDate, kgSold, pricePerKg, condition, buyerType, locationBarangay, locationMunicipality, totalAmount, createdAt }]
•
POST /api/farmer/farmte/sales?userId body: { seasonId, saleDate, kgSold, pricePerKg, condition?, buyerType?, locationBarangay?, locationMunicipality? }
•
DELETE /api/farmer/farmte/sales/{id}?userId → 204
•
GET /api/farmer/farmte/seasons/{id}/summary → { totalHarvestKg, yieldTonsPerHa, totalSoldKg, averagePricePerKg, totalSales, totalExpenses, costPerKg, netIncome, netIncomePerHa, totalLaborHours }
2.
Time/expense entries updated
•
POST /api/farmer/farmte/time-entries and POST /api/farmer/farmte/expense-entries now accept optional seasonId.
•
Time/expense response items now include seasonId.
3.
FarmTE reports now include season summaries
•
GET /api/farmer/farmte/reports
•
GET /api/farm-admin/farmte/reports
•
GET /api/farm-admin/farmte/reports/{id}
•
POST /api/farmer/farmte/reports
•
PUT /api/farm-admin/farmte/reports/{id}/review
Report payloads now include:
•
seasonSummaries: [{ seasonId, totalHarvestKg, yieldTonsPerHa, totalSoldKg, averagePricePerKg, totalSales, totalExpenses, costPerKg, netIncome, netIncomePerHa, totalLaborHours }]
4.
Market analytics
•
GET /api/market/prices?commodity=RICE&days=30&municipality=&condition=
   → [{ commodity, variety, condition, municipality, medianPricePerKg, minPrice, maxPrice, reportCount, latestSaleDate }] (groups with <3 filtered out)
•
GET /api/market/prices/trend?commodity=RICE&condition=DRY&weeks=12
   → [{ week, medianPricePerKg }]
•
GET /api/admin/market/price-breakdown?commodity=RICE&days=30&by=condition|buyerType|variety|barangay
   → [{ key, medianPricePerKg, reportCount }]
•
GET /api/admin/market/leaderboard?seasonType=&year=&commodity=&sortBy=yield|netIncomePerHa|costPerKg&limit=20
   → [{ rank, farmId, farmCode, farmName, barangay, municipality, totalAreaHa, totalHarvestKg, yieldTonsPerHa, averagePricePerKg, netIncomePerHa, costPerKg, farmerCount }]
•
GET /api/admin/market/productivity-by-area?seasonType=&year=&commodity=
   → [{ barangay, averageYieldTonsPerHa, medianPricePerKg, totalHarvestKg, farmCount }]
5.
Access + errors
•
/api/admin/market/ uses AdminAccessService (accepts MAO-Admin and Admin).
•
/api/market/ requires logged-in session.
•
Error shape is consistently: { "message": "..." } (400/401/403/404/409 as applicable).