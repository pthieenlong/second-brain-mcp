# Second Brain MCP

*[English version](README.en.md)*

Một [MCP](https://modelcontextprotocol.io) server giúp AI ghi chú giùm bạn — vào một thư mục Markdown bình thường, kiểu Obsidian đọc được.

Bạn cứ trò chuyện với AI như thường. Khi có gì đáng lưu, bảo nó lưu lại: nó tự chọn category, tự gắn tag, tự ghi thành file `.md`. Lần sau muốn tìm lại thì hỏi nó. Ghi chú vẫn là của bạn — file thường nằm trên ổ cứng, không cần công cụ này cũng đọc được.

---

## Cài đặt

### Bước 1 — Chuẩn bị

Bạn cần:

- **Node.js phiên bản 20 trở lên.** Kiểm tra bằng cách mở Terminal (macOS) hoặc Command Prompt (Windows) rồi gõ `node --version`. Nếu báo lỗi hoặc số nhỏ hơn 20, tải tại [nodejs.org](https://nodejs.org).
- **Một AI client hỗ trợ MCP** — Claude Desktop, Antigravity, Cursor, hoặc tương tự.

### Bước 2 — Chọn nơi lưu ghi chú

Quyết định thư mục sẽ chứa ghi chú, ví dụ `/Users/ban/Documents/Notes`. Thư mục chưa tồn tại cũng được, nó sẽ tự tạo.

Nếu bạn đã dùng Obsidian, có thể trỏ thẳng vào vault sẵn có.

### Bước 3 — Thêm vào cấu hình AI client

Mở file cấu hình MCP của client bạn dùng, thêm đoạn này:

```json
{
  "mcpServers": {
    "second-brain": {
      "command": "npx",
      "args": ["-y", "@pthieenlong/second-brain-mcp"],
      "env": {
        "VAULT_PATH": "/Users/ban/Documents/Notes"
      }
    }
  }
}
```

Nhớ thay `/Users/ban/Documents/Notes` bằng đường dẫn thật của bạn. Đường dẫn phải đầy đủ từ gốc, không dùng `~`.

Nếu file cấu hình đã có sẵn `mcpServers` với server khác, chỉ cần thêm `"second-brain": {...}` vào bên trong, đừng ghi đè cả khối.

Chỗ đặt file cấu hình tùy client — tìm trong tài liệu của client mục "MCP servers".

### Bước 4 — Khởi động lại client

Đóng hẳn và mở lại AI client. Lần đầu chạy hơi chậm vì `npx` tải package về, những lần sau dùng bản đã cache nên nhanh.

### Bước 5 — Thử

Nhắn với AI: *"Lưu note này vào second brain: hôm nay học được cách dùng React hooks"*

Nếu thành công, nó sẽ báo đã lưu và bạn thấy file `.md` mới trong thư mục vừa chọn.

---

## AI làm được gì

| Công cụ | Chức năng |
|---|---|
| `capture_note` | Lưu ghi chú mới. AI tự phân loại category và tag. |
| `search_notes` | Tìm theo từ khóa tiêu đề, category, hoặc tag. |
| `get_note` | Đọc toàn bộ nội dung một ghi chú. |
| `update_note` | Sửa ghi chú. Đổi tiêu đề hoặc category thì file tự chuyển sang chỗ mới. |
| `delete_note` | Xóa ghi chú khỏi cả thư mục lẫn chỉ mục. |
| `reindex_vault` | Quét lại thư mục và dựng lại chỉ mục tìm kiếm từ đầu. |

Bạn không cần gọi tên các công cụ này. Cứ nói bình thường — *"tìm giúp tôi mấy note về React"* — AI tự biết dùng cái nào.

---

## Ghi chú được lưu thế nào

File `.md` nằm trong `VAULT_PATH/<category>/`, có phần thông tin ở đầu:

```markdown
---
date: 2026-07-20
category: 01-Fundamentals
tags:
  - react
  - hooks
source: chat-capture
---
# React hooks

Nội dung ghi chú...
```

Đây là bản gốc, là nguồn sự thật. Mở bằng Obsidian, tìm bằng grep, đồng bộ, sao lưu — tùy bạn. Công cụ này không giữ khóa gì trên chúng.

Bên cạnh đó có file `<VAULT_PATH>/.second-brain/index.db` — một file SQLite nhỏ lưu thông tin tóm tắt để tìm kiếm nhanh, khỏi phải đọc từng file. Nó là dữ liệu phái sinh: xóa đi thì tự tạo lại (nhưng sẽ rỗng — xem phần [Hạn chế](#hạn-chế-hiện-tại)).

---

## Đổi danh sách category

Mặc định có 7 nhóm:

```
01-Fundamentals  02-Work  03-Product-Thinking  04-Learning
05-Career        06-Personal  07-Projects
```

Muốn dùng nhóm của riêng bạn, thêm `NOTE_CATEGORIES` vào phần `env` trong cấu hình client:

```json
"env": {
  "VAULT_PATH": "/Users/ban/Documents/Notes",
  "NOTE_CATEGORIES": "Nau-an,Du-lich,Cong-viec,Y-tuong"
}
```

Ngăn cách bằng dấu phẩy, không có khoảng trắng thừa. Sau đó khởi động lại client.

Nếu AI chọn nhầm nhóm không có trong danh sách, ghi chú sẽ rơi vào `00-Inbox` chứ không bị từ chối — bạn sắp xếp lại sau, không mất gì.

---

## Khi gặp trục trặc

**AI không thấy công cụ nào**
Kiểm tra JSON có đúng cú pháp không (thiếu dấu phẩy, thừa dấu ngoặc là hỏng). Rồi khởi động lại client.

**Báo lỗi liên quan `VAULT_PATH`**
Đường dẫn phải đầy đủ từ gốc: `/Users/ban/Documents/Notes`, không phải `~/Documents/Notes` hay `./Notes`.

**Lần đầu chạy rất lâu**
Bình thường — `npx` đang tải package về. Những lần sau nhanh hơn nhiều.

**Ghi chú lưu rồi nhưng tìm không ra**
Có thể chỉ mục bị lệch với thư mục. Xem phần dưới.

---

## Hạn chế hiện tại

Nói thẳng để bạn biết trước:

**Chỉ mục có thể lệch với thư mục.** Ghi chú được ghi ra file trước, rồi mới đưa vào chỉ mục. Nếu bước sau lỗi, file vẫn có nhưng tìm không thấy. Sửa hoặc thêm note trực tiếp trong Obsidian cũng không tự cập nhật chỉ mục. Khi nghi ngờ lệch, bảo AI *"reindex vault giúp tôi"* — nó quét lại toàn bộ thư mục và dựng chỉ mục từ đầu.

**Chỉ tìm được tiêu đề, chưa tìm trong nội dung.** `search_notes` khớp theo tiêu đề, category và tag. Chưa tìm được chữ nằm trong thân ghi chú.

**Chữ có dấu phân biệt hoa thường.** Tìm tiêu đề tiếng Anh không phân biệt hoa thường, nhưng tiếng Việt có dấu thì có — hạn chế của SQLite.

**Windows chạy chip ARM không dùng được.** Thư viện SQLite không có bản cho nền tảng đó. macOS (cả Intel lẫn Apple Silicon), Windows x64 và Linux đều chạy bình thường.

---

## Dành cho lập trình viên

Cần [pnpm](https://pnpm.io). Chép `.env.example` thành `.env` rồi điền `VAULT_PATH`.

```bash
pnpm install
pnpm run build
pnpm run test
pnpm run lint

npx prisma migrate dev    # sau khi sửa prisma/schema.prisma
npx prisma generate
```

Chạy tay để thử — server nói chuyện bằng JSON-RPC qua stdin/stdout:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | VAULT_PATH=/tmp/test-vault node dist/src/main.js
```

Một nguyên tắc bắt buộc khi sửa code: **không được ghi gì ra stdout.** Luồng đó dành riêng cho giao thức; một dòng `console.log` lạc là hỏng kết nối. Cần log thì dùng `console.error` (ghi ra stderr).

---

## Đóng góp

Rất hoan nghênh issue và pull request. Những việc thực sự cần:

- Tìm kiếm toàn văn trong nội dung note
- Tự động cập nhật chỉ mục khi file trong vault thay đổi (thay vì phải reindex tay)
- Viết test — tầng service hiện chưa có test nào

---

## Giấy phép

MIT — xem [LICENSE](LICENSE).
