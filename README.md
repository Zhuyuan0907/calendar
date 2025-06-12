# 現代化行事曆系統

一個功能豐富、美觀的網頁行事曆應用程式，專為 Cloudflare Pages 設計。支援多種視圖模式、事件管理、重複事件、分類篩選等進階功能。

## 功能特色

### 核心功能
- **多視圖模式**：月視圖、週視圖、日視圖、列表視圖
- **事件管理**：支援多日事件、全天事件、時間事件
- **重複事件**：支援每日、每週、每月、每年重複
- **分類系統**：8種預設分類（工作、個人、會議、假日、營隊、教育、健康、社交）
- **搜尋功能**：即時搜尋事件標題和描述
- **匯出功能**：將事件匯出為 CSV 格式
- **深色模式**：自動切換明暗主題

### 進階功能
- **小月曆**：快速瀏覽和跳轉日期
- **即將到來事件**：顯示未來一週的事件
- **分類圖例**：快速篩選特定類別事件
- **響應式設計**：完美支援桌面、平板、手機
- **營隊管理**：特別優化營隊類事件，支援多日期間、參與人數、費用等資訊

## 部署到 Cloudflare Pages

1. 將專案推送到 GitHub
2. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 進入 Pages > 創建專案
4. 連接 GitHub 帳戶並選擇此專案
5. 設定建構設定：
   - 建構命令：留空（靜態網站）
   - 建構輸出目錄：`/`
6. 點擊「儲存並部署」

## 事件配置

事件存儲在 `events.json` 檔案中。以下是事件結構說明：

### 基本事件結構
```json
{
  "id": "evt001",
  "title": "事件標題",
  "description": "事件描述",
  "startDate": "2024-07-15",
  "endDate": "2024-07-19",
  "startTime": "09:00",
  "endTime": "17:00",
  "category": "camp",
  "location": "地點",
  "color": "#8b5cf6",
  "tags": ["標籤1", "標籤2"]
}
```

### 重複事件
```json
{
  "recurrence": {
    "type": "weekly",
    "daysOfWeek": ["monday", "wednesday"],
    "interval": 1
  }
}
```

支援的重複類型：
- `daily`：每日重複
- `weekly`：每週重複（可指定星期幾）
- `monthly`：每月重複（指定日期）
- `yearly`：每年重複

### 營隊事件特殊欄位
```json
{
  "instructor": "講師名稱",
  "participants": 30,
  "price": 8500,
  "earlyBird": {
    "deadline": "2024-01-15",
    "discount": 0.9
  },
  "capacity": 40,
  "meals": ["午餐", "點心"],
  "registrationUrl": "https://example.com/register"
}
```

## 分類系統

預設分類及顏色：
- 工作 (work) - 藍色 `#3b82f6`
- 個人 (personal) - 綠色 `#10b981`
- 會議 (meeting) - 橙色 `#f59e0b`
- 假日 (holiday) - 紅色 `#ef4444`
- 營隊 (camp) - 紫色 `#8b5cf6`
- 教育 (education) - 青色 `#06b6d4`
- 健康 (health) - 粉色 `#ec4899`
- 社交 (social) - 橘紅色 `#f97316`

## 自訂設定

在 `events.json` 中的 `settings` 區塊可以自訂：
```json
{
  "settings": {
    "defaultView": "month",
    "weekStartsOn": "sunday",
    "timeFormat": "24h",
    "language": "zh-TW",
    "enableNotifications": true,
    "theme": "auto"
  }
}
```

## 使用說明

### 新增事件
1. 編輯 `events.json` 檔案
2. 在 `events` 陣列中新增事件物件
3. 確保 ID 唯一
4. 儲存檔案並重新整理頁面

### 批量新增營隊活動
對於多天的營隊活動，只需設定開始和結束日期：
```json
{
  "title": "夏季程式設計營",
  "startDate": "2024-07-15",
  "endDate": "2024-07-19",
  "category": "camp"
}
```

### 設定重複活動
例如每週二、四的瑜珈課：
```json
{
  "title": "瑜珈課",
  "recurrence": {
    "type": "weekly",
    "daysOfWeek": ["tuesday", "thursday"],
    "interval": 1
  }
}
```

## 技術架構

- 純前端實現（HTML + CSS + JavaScript）
- 無需後端伺服器
- 使用 Fetch API 載入事件資料
- localStorage 儲存使用者偏好設定
- CSS Grid 和 Flexbox 佈局
- CSS 變數實現主題切換

## 瀏覽器支援

- Chrome (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- Edge (最新版本)

## 授權

MIT License
