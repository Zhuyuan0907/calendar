# 使用說明

## 腳本使用方法

### 新增事件腳本

### 前置需求

1. 安裝 `jq` 工具：
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   
   # CentOS/RHEL
   sudo yum install jq
   ```

### 使用方法

1. 在終端機中進入專案目錄：
   ```bash
   cd /path/to/calendar
   ```

2. 執行新增事件腳本：
   ```bash
   ./add_event.sh
   ```

3. 依照提示輸入事件資訊：
   - 事件標題（必填）
   - 事件描述（選填）
   - 事件分類（選擇 1-8）
   - 開始日期（YYYY-MM-DD 格式）
   - 結束日期（預設與開始日期相同）
   - 是否為全天事件
   - 開始時間和結束時間（非全天事件）
   - 地點（選填）
   - 標籤（以逗號分隔，選填）

4. 對於營隊類別，會詢問是否輸入額外資訊：
   - 講師名稱
   - 參與人數
   - 費用
   - 報名網址

5. 可選擇設定重複事件：
   - 每日重複
   - 每週重複（可選擇星期幾）
   - 每月重複
   - 每年重複

### 腳本功能

- **時間衝突檢查**：會自動檢查是否與現有事件時間衝突
- **日期驗證**：確保輸入的日期格式正確且有效
- **自動 ID 生成**：自動產生唯一的事件 ID
- **重複事件**：支援各種重複模式設定
- **營隊特殊欄位**：針對營隊類別提供額外欄位

### 範例輸入

```
=== 行事曆事件新增工具 ===

請輸入事件標題: 夏季程式設計營
請輸入事件描述 (選填): 為期三天的 Python 程式設計營隊
請選擇事件分類：
1. 工作
2. 個人
3. 會議
4. 假日
5. 營隊
6. 教育
7. 健康
8. 社交
請輸入選項 (1-8): 5
請輸入開始日期 (YYYY-MM-DD): 2024-07-15
請輸入結束日期 (YYYY-MM-DD，預設與開始日期相同): 2024-07-17
是否為全天事件？(y/n) y
請輸入地點 (選填): 台北科技大樓
請輸入標籤 (以逗號分隔，選填): 教育,營隊,程式設計
檢測到營隊類別，是否要輸入額外資訊？
是否輸入營隊額外資訊？(y/n) y
講師名稱 (選填): 王老師
參與人數 (選填): 30
費用 (選填): 8500
報名網址 (選填): https://example.com/register
```

### 事件管理腳本

除了新增事件，我們還提供了事件管理腳本來處理其他操作：

```bash
./manage_events.sh
```

#### 管理腳本功能：

1. **查看所有事件**：列出所有現有事件
2. **搜尋事件**：根據標題搜尋事件
3. **刪除事件**：刪除指定的事件
4. **清空所有事件**：刪除所有事件（會自動備份）
5. **備份事件資料**：手動建立備份
6. **還原事件資料**：從備份檔案還原

#### 刪除範例事件

如果您想要刪除所有範例事件：

**方法一：使用管理腳本（推薦）**
```bash
./manage_events.sh
# 選擇選項 4 來清空所有事件
```

**方法二：手動編輯**
1. 開啟 `events.json` 檔案
2. 將 `"events": [...]` 中的陣列內容全部刪除，改為 `"events": []`
3. 儲存檔案

**方法三：重置為空白**
```bash
cp events.json events_backup.json  # 先備份
echo '{
  "events": [],
  "categories": {
    "work": {"name": "工作", "color": "#3b82f6"},
    "personal": {"name": "個人", "color": "#10b981"},
    "meeting": {"name": "會議", "color": "#f59e0b"},
    "holiday": {"name": "假日", "color": "#ef4444"},
    "camp": {"name": "營隊", "color": "#8b5cf6"},
    "education": {"name": "教育", "color": "#06b6d4"},
    "health": {"name": "健康", "color": "#ec4899"},
    "social": {"name": "社交", "color": "#f97316"}
  },
  "settings": {
    "defaultView": "month",
    "weekStartsOn": "sunday",
    "timeFormat": "24h",
    "language": "zh-TW",
    "enableNotifications": true,
    "theme": "auto"
  }
}' > events.json
```

### 注意事項

- 所有腳本都會自動備份 `events.json` 檔案
- 重新整理網頁後即可看到變更
- 確保 `events.json` 檔案有寫入權限
- 日期格式必須為 YYYY-MM-DD（例如：2024-12-25）
- 時間格式必須為 HH:MM（例如：14:30）
- 建議定期備份事件資料

## 檔案管理

### 手動編輯 events.json

如果需要直接編輯事件檔案，請注意：

1. 保持 JSON 格式正確
2. 確保 ID 唯一性
3. 日期格式統一為 YYYY-MM-DD
4. 時間格式統一為 HH:MM
5. 顏色使用 hex 格式（例如：#3b82f6）

### 部署到 Cloudflare Pages

1. 將整個專案推送到 GitHub 儲存庫
2. 在 Cloudflare Dashboard 創建新的 Pages 專案
3. 連接 GitHub 儲存庫
4. 設定建構參數：
   - 建構命令：留空
   - 建構輸出目錄：/
5. 部署完成後即可使用

### 備份與還原

建議定期備份 `events.json` 檔案：

```bash
# 備份
cp events.json events_backup_$(date +%Y%m%d).json

# 還原
cp events_backup_20241225.json events.json
```