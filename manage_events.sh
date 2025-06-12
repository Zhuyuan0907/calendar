#!/bin/bash

# 設置顏色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查 jq 是否已安裝
if ! command -v jq &> /dev/null; then
    echo -e "${RED}錯誤：需要安裝 jq 來處理 JSON 檔案${NC}"
    echo "請執行：brew install jq (macOS) 或 apt-get install jq (Linux)"
    exit 1
fi

# 檢查 events.json 是否存在
if [ ! -f "events.json" ]; then
    echo -e "${RED}錯誤：找不到 events.json 檔案${NC}"
    exit 1
fi

show_menu() {
    echo -e "${BLUE}=== 行事曆事件管理工具 ===${NC}"
    echo
    echo "1. 查看所有事件"
    echo "2. 搜尋事件"
    echo "3. 刪除事件"
    echo "4. 清空所有事件"
    echo "5. 備份事件資料"
    echo "6. 還原事件資料"
    echo "0. 退出"
    echo
}

list_events() {
    echo -e "${GREEN}=== 所有事件列表 ===${NC}"
    echo
    
    events=$(jq -r '.events[] | "\(.id)|\(.title)|\(.startDate)|\(.category)"' events.json)
    
    if [ -z "$events" ]; then
        echo "目前沒有任何事件"
        return
    fi
    
    echo "ID                  | 標題                | 日期       | 分類"
    echo "-------------------|--------------------|-----------|---------"
    
    while IFS='|' read -r id title date category; do
        printf "%-18s | %-18s | %-9s | %s\n" "$id" "$title" "$date" "$category"
    done <<< "$events"
}

search_events() {
    read -p "請輸入搜尋關鍵字: " keyword
    
    if [ -z "$keyword" ]; then
        echo -e "${RED}搜尋關鍵字不能為空${NC}"
        return
    fi
    
    echo -e "${GREEN}=== 搜尋結果 ===${NC}"
    echo
    
    events=$(jq -r --arg keyword "$keyword" '.events[] | select(.title | test($keyword; "i")) | "\(.id)|\(.title)|\(.startDate)|\(.category)"' events.json)
    
    if [ -z "$events" ]; then
        echo "找不到符合的事件"
        return
    fi
    
    echo "ID                  | 標題                | 日期       | 分類"
    echo "-------------------|--------------------|-----------|---------"
    
    while IFS='|' read -r id title date category; do
        printf "%-18s | %-18s | %-9s | %s\n" "$id" "$title" "$date" "$category"
    done <<< "$events"
}

delete_event() {
    list_events
    echo
    read -p "請輸入要刪除的事件 ID: " event_id
    
    if [ -z "$event_id" ]; then
        echo -e "${RED}事件 ID 不能為空${NC}"
        return
    fi
    
    # 檢查事件是否存在
    event_exists=$(jq -r --arg id "$event_id" '.events[] | select(.id == $id) | .title' events.json)
    
    if [ -z "$event_exists" ]; then
        echo -e "${RED}找不到 ID 為 $event_id 的事件${NC}"
        return
    fi
    
    echo -e "${YELLOW}即將刪除事件：$event_exists${NC}"
    read -p "確認刪除？(y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 備份原檔案
        cp events.json "events_backup_$(date +%Y%m%d_%H%M%S).json"
        
        # 刪除事件
        jq --arg id "$event_id" '.events |= map(select(.id != $id))' events.json > events.tmp.json && mv events.tmp.json events.json
        
        echo -e "${GREEN}✓ 事件已成功刪除！${NC}"
    else
        echo "取消刪除"
    fi
}

clear_all_events() {
    event_count=$(jq '.events | length' events.json)
    
    if [ "$event_count" -eq 0 ]; then
        echo "目前沒有任何事件可以清空"
        return
    fi
    
    echo -e "${RED}警告：即將清空所有 $event_count 個事件！${NC}"
    echo "這個操作無法復原（除非使用備份檔案）"
    echo
    read -p "確認清空所有事件？請輸入 'YES' 確認: " confirm
    
    if [ "$confirm" = "YES" ]; then
        # 備份原檔案
        cp events.json "events_backup_before_clear_$(date +%Y%m%d_%H%M%S).json"
        
        # 清空事件陣列
        jq '.events = []' events.json > events.tmp.json && mv events.tmp.json events.json
        
        echo -e "${GREEN}✓ 所有事件已清空！${NC}"
        echo "備份檔案已建立：events_backup_before_clear_$(date +%Y%m%d_%H%M%S).json"
    else
        echo "取消操作"
    fi
}

backup_events() {
    backup_filename="events_backup_$(date +%Y%m%d_%H%M%S).json"
    cp events.json "$backup_filename"
    echo -e "${GREEN}✓ 事件資料已備份至：$backup_filename${NC}"
}

restore_events() {
    echo "可用的備份檔案："
    ls -1 events_backup_*.json 2>/dev/null | head -10
    echo
    read -p "請輸入要還原的備份檔案名稱: " backup_file
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}找不到備份檔案：$backup_file${NC}"
        return
    fi
    
    # 驗證 JSON 格式
    if ! jq . "$backup_file" > /dev/null 2>&1; then
        echo -e "${RED}備份檔案格式不正確${NC}"
        return
    fi
    
    echo -e "${YELLOW}即將還原備份檔案：$backup_file${NC}"
    read -p "確認還原？(y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 備份當前檔案
        cp events.json "events_current_backup_$(date +%Y%m%d_%H%M%S).json"
        
        # 還原備份
        cp "$backup_file" events.json
        
        echo -e "${GREEN}✓ 事件資料已還原！${NC}"
        echo "當前資料已備份至：events_current_backup_$(date +%Y%m%d_%H%M%S).json"
    else
        echo "取消還原"
    fi
}

# 主程式迴圈
while true; do
    show_menu
    read -p "請選擇操作 (0-6): " choice
    echo
    
    case $choice in
        1)
            list_events
            ;;
        2)
            search_events
            ;;
        3)
            delete_event
            ;;
        4)
            clear_all_events
            ;;
        5)
            backup_events
            ;;
        6)
            restore_events
            ;;
        0)
            echo "再見！"
            exit 0
            ;;
        *)
            echo -e "${RED}無效的選項，請重新選擇${NC}"
            ;;
    esac
    
    echo
    read -p "按 Enter 繼續..."
    echo
done