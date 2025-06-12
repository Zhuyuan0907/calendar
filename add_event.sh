#!/bin/bash

# 設置顏色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 獲取分類名稱
get_category_name() {
    case $1 in
        "work") echo "工作" ;;
        "personal") echo "個人" ;;
        "meeting") echo "會議" ;;
        "holiday") echo "假日" ;;
        "camp") echo "營隊" ;;
        "education") echo "教育" ;;
        "health") echo "健康" ;;
        "social") echo "社交" ;;
        *) echo "未知" ;;
    esac
}

# 獲取分類顏色
get_category_color() {
    case $1 in
        "work") echo "#3b82f6" ;;
        "personal") echo "#10b981" ;;
        "meeting") echo "#f59e0b" ;;
        "holiday") echo "#ef4444" ;;
        "camp") echo "#8b5cf6" ;;
        "education") echo "#06b6d4" ;;
        "health") echo "#ec4899" ;;
        "social") echo "#f97316" ;;
        *) echo "#94a3b8" ;;
    esac
}

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

# 生成唯一的事件 ID
generate_event_id() {
    echo "evt$(date +%Y%m%d%H%M%S)"
}

# 驗證日期格式
validate_date() {
    if [[ ! $1 =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        echo -e "${RED}錯誤：日期格式不正確，請使用 YYYY-MM-DD 格式${NC}"
        return 1
    fi
    
    # 檢查日期是否有效
    if ! date -j -f "%Y-%m-%d" "$1" &> /dev/null; then
        echo -e "${RED}錯誤：無效的日期${NC}"
        return 1
    fi
    
    return 0
}

# 驗證時間格式
validate_time() {
    if [[ ! $1 =~ ^[0-9]{2}:[0-9]{2}$ ]]; then
        echo -e "${RED}錯誤：時間格式不正確，請使用 HH:MM 格式${NC}"
        return 1
    fi
    
    hour=$(echo $1 | cut -d: -f1)
    minute=$(echo $1 | cut -d: -f2)
    
    if [ $hour -gt 23 ] || [ $minute -gt 59 ]; then
        echo -e "${RED}錯誤：無效的時間${NC}"
        return 1
    fi
    
    return 0
}

# 檢查時間衝突
check_time_conflict() {
    local start_date=$1
    local end_date=$2
    local start_time=$3
    local end_time=$4
    
    # 如果是全天事件，不檢查時間衝突
    if [ -z "$start_time" ]; then
        return 0
    fi
    
    # 使用 jq 檢查是否有時間衝突的事件
    conflicts=$(jq -r --arg sd "$start_date" --arg ed "$end_date" --arg st "$start_time" --arg et "$end_time" '
        .events[] | 
        select(
            (.startDate <= $ed and .endDate >= $sd) and
            (.startTime != null) and
            (
                (.startTime < $et and (.endTime // "23:59") > $st)
            )
        ) | 
        "\(.title) (\(.startDate) \(.startTime // "")-\(.endTime // ""))"
    ' events.json)
    
    if [ ! -z "$conflicts" ]; then
        echo -e "${YELLOW}警告：發現時間衝突的事件：${NC}"
        echo "$conflicts"
        echo
        read -p "是否仍要繼續新增？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    return 0
}

# 主程式
echo -e "${GREEN}=== 行事曆事件新增工具 ===${NC}"
echo

# 輸入事件標題
read -p "請輸入事件標題: " title
if [ -z "$title" ]; then
    echo -e "${RED}錯誤：事件標題不能為空${NC}"
    exit 1
fi

# 輸入事件描述
read -p "請輸入事件描述 (選填): " description

# 選擇事件分類
echo "請選擇事件分類："
echo "1. 工作"
echo "2. 個人"
echo "3. 會議"
echo "4. 假日"
echo "5. 營隊"
echo "6. 教育"
echo "7. 健康"
echo "8. 社交"
read -p "請輸入選項 (1-8): " category_choice

case $category_choice in
    1) category="work" ;;
    2) category="personal" ;;
    3) category="meeting" ;;
    4) category="holiday" ;;
    5) category="camp" ;;
    6) category="education" ;;
    7) category="health" ;;
    8) category="social" ;;
    *)
        echo -e "${RED}錯誤：無效的選項${NC}"
        exit 1
        ;;
esac

color=$(get_category_color "$category")

# 輸入開始日期
while true; do
    read -p "請輸入開始日期 (YYYY-MM-DD): " start_date
    if validate_date "$start_date"; then
        break
    fi
done

# 輸入結束日期
while true; do
    read -p "請輸入結束日期 (YYYY-MM-DD，預設與開始日期相同): " end_date
    if [ -z "$end_date" ]; then
        end_date=$start_date
        break
    fi
    if validate_date "$end_date"; then
        # 檢查結束日期是否晚於開始日期
        if [[ "$end_date" < "$start_date" ]]; then
            echo -e "${RED}錯誤：結束日期不能早於開始日期${NC}"
        else
            break
        fi
    fi
done

# 詢問是否為全天事件
read -p "是否為全天事件？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    all_day=true
    start_time=""
    end_time=""
else
    all_day=false
    
    # 輸入開始時間
    while true; do
        read -p "請輸入開始時間 (HH:MM): " start_time
        if validate_time "$start_time"; then
            break
        fi
    done
    
    # 輸入結束時間
    while true; do
        read -p "請輸入結束時間 (HH:MM，選填): " end_time
        if [ -z "$end_time" ]; then
            break
        fi
        if validate_time "$end_time"; then
            # 檢查結束時間是否晚於開始時間（同一天的情況）
            if [ "$start_date" == "$end_date" ] && [[ "$end_time" < "$start_time" ]]; then
                echo -e "${RED}錯誤：結束時間不能早於開始時間${NC}"
            else
                break
            fi
        fi
    done
fi

# 檢查時間衝突
if ! check_time_conflict "$start_date" "$end_date" "$start_time" "$end_time"; then
    echo -e "${YELLOW}取消新增事件${NC}"
    exit 0
fi

# 輸入地點
read -p "請輸入地點 (選填): " location

# 輸入標籤
read -p "請輸入標籤 (以逗號分隔，選填): " tags_input
if [ ! -z "$tags_input" ]; then
    # 將標籤轉換為 JSON 陣列格式
    IFS=',' read -ra TAGS <<< "$tags_input"
    tags_json="["
    first=true
    for tag in "${TAGS[@]}"; do
        # 去除前後空白
        tag=$(echo "$tag" | xargs)
        if [ ! -z "$tag" ]; then
            if [ "$first" = true ]; then
                first=false
            else
                tags_json+=","
            fi
            tags_json+="\"$tag\""
        fi
    done
    tags_json+="]"
else
    tags_json="[]"
fi

# 特殊欄位（營隊相關）
if [ "$category" == "camp" ]; then
    echo -e "${YELLOW}檢測到營隊類別，是否要輸入額外資訊？${NC}"
    read -p "是否輸入營隊額外資訊？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "講師名稱 (選填): " instructor
        read -p "參與人數 (選填): " participants
        read -p "費用 (選填): " price
        read -p "報名網址 (選填): " registration_url
    fi
fi

# 生成事件 ID
event_id=$(generate_event_id)

# 建立新事件 JSON
new_event=$(jq -n \
    --arg id "$event_id" \
    --arg title "$title" \
    --arg description "$description" \
    --arg startDate "$start_date" \
    --arg endDate "$end_date" \
    --arg startTime "$start_time" \
    --arg endTime "$end_time" \
    --arg category "$category" \
    --arg location "$location" \
    --arg color "$color" \
    --argjson tags "$tags_json" \
    --argjson allDay "$all_day" \
    --arg instructor "${instructor:-}" \
    --arg participants "${participants:-}" \
    --arg price "${price:-}" \
    --arg registrationUrl "${registration_url:-}" \
    '{
        id: $id,
        title: $title,
        description: $description,
        startDate: $startDate,
        endDate: $endDate,
        category: $category,
        color: $color,
        tags: $tags,
        recurrence: { type: "none" }
    } + 
    (if $description != "" then {description: $description} else {} end) +
    (if $allDay then {allDay: true} else {startTime: $startTime} + (if $endTime != "" then {endTime: $endTime} else {} end) end) +
    (if $location != "" then {location: $location} else {} end) +
    (if $instructor != "" then {instructor: $instructor} else {} end) +
    (if $participants != "" then {participants: ($participants | tonumber)} else {} end) +
    (if $price != "" then {price: ($price | tonumber)} else {} end) +
    (if $registrationUrl != "" then {registrationUrl: $registrationUrl} else {} end)'
)

# 新增事件到 events.json
jq --argjson event "$new_event" '.events += [$event]' events.json > events.tmp.json && mv events.tmp.json events.json

echo
echo -e "${GREEN}✓ 事件已成功新增！${NC}"
echo -e "事件 ID: ${event_id}"
echo -e "標題: ${title}"
echo -e "日期: ${start_date} 至 ${end_date}"
if [ "$all_day" = false ]; then
    echo -e "時間: ${start_time}${end_time:+ - $end_time}"
fi
echo -e "分類: $(get_category_name "$category")"

# 詢問是否要設定重複
echo
read -p "是否要設定為重複事件？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "請選擇重複類型："
    echo "1. 每日"
    echo "2. 每週"
    echo "3. 每月"
    echo "4. 每年"
    read -p "請輸入選項 (1-4): " recurrence_choice
    
    case $recurrence_choice in
        1)
            recurrence_type="daily"
            read -p "每幾天重複一次？(預設: 1) " interval
            interval=${interval:-1}
            ;;
        2)
            recurrence_type="weekly"
            read -p "每幾週重複一次？(預設: 1) " interval
            interval=${interval:-1}
            echo "請選擇重複的星期幾 (可多選，以空格分隔)："
            echo "1. 星期日"
            echo "2. 星期一"
            echo "3. 星期二"
            echo "4. 星期三"
            echo "5. 星期四"
            echo "6. 星期五"
            echo "7. 星期六"
            read -p "請輸入選項 (例如: 2 4 表示星期一和三): " days_input
            
            days_array=()
            for day in $days_input; do
                case $day in
                    1) days_array+=("sunday") ;;
                    2) days_array+=("monday") ;;
                    3) days_array+=("tuesday") ;;
                    4) days_array+=("wednesday") ;;
                    5) days_array+=("thursday") ;;
                    6) days_array+=("friday") ;;
                    7) days_array+=("saturday") ;;
                esac
            done
            
            # 轉換為 JSON 陣列
            days_json=$(printf '%s\n' "${days_array[@]}" | jq -R . | jq -s .)
            ;;
        3)
            recurrence_type="monthly"
            read -p "每幾個月重複一次？(預設: 1) " interval
            interval=${interval:-1}
            day_of_month=$(date -j -f "%Y-%m-%d" "$start_date" "+%d" | sed 's/^0//')
            ;;
        4)
            recurrence_type="yearly"
            read -p "每幾年重複一次？(預設: 1) " interval
            interval=${interval:-1}
            ;;
        *)
            echo -e "${RED}無效的選項${NC}"
            exit 1
            ;;
    esac
    
    # 更新事件的重複設定
    if [ "$recurrence_type" == "weekly" ]; then
        jq --arg id "$event_id" --arg type "$recurrence_type" --argjson interval "$interval" --argjson days "$days_json" '
            .events |= map(
                if .id == $id then 
                    .recurrence = {
                        type: $type,
                        interval: $interval,
                        daysOfWeek: $days
                    }
                else . end
            )
        ' events.json > events.tmp.json && mv events.tmp.json events.json
    elif [ "$recurrence_type" == "monthly" ]; then
        jq --arg id "$event_id" --arg type "$recurrence_type" --argjson interval "$interval" --argjson dayOfMonth "$day_of_month" '
            .events |= map(
                if .id == $id then 
                    .recurrence = {
                        type: $type,
                        interval: $interval,
                        dayOfMonth: $dayOfMonth
                    }
                else . end
            )
        ' events.json > events.tmp.json && mv events.tmp.json events.json
    else
        jq --arg id "$event_id" --arg type "$recurrence_type" --argjson interval "$interval" '
            .events |= map(
                if .id == $id then 
                    .recurrence = {
                        type: $type,
                        interval: $interval
                    }
                else . end
            )
        ' events.json > events.tmp.json && mv events.tmp.json events.json
    fi
    
    echo -e "${GREEN}✓ 重複設定已更新！${NC}"
fi

echo
echo -e "${GREEN}請重新整理網頁以查看新事件${NC}"