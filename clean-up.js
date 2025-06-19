const fs = require('fs');
const path = require('path');

const deleteIfExist = (p) => {
  if (fs.existsSync(p)) {
    const stat = fs.lstatSync(p);
    if (stat.isDirectory()) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`Đã xóa folder: ${p}`);
    } else {
      fs.unlinkSync(p);
      console.log(`Đã xóa file: ${p}`);
    }
  }
};

const deleteGlob = (dir, match) => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(f => {
      if (f.match(match)) {
        deleteIfExist(path.join(dir, f));
      }
    });
  }
};

// Xóa các folder/file không cần thiết ở root
['pages', 'example', 'test', '__tests__', 'storybook', '.DS_Store', 'Thumbs.db', '.vscode', '.idea'].forEach(deleteIfExist);

// Xóa file backup
deleteGlob('.', /\.bak$|~$|\.old$/);

// Xóa ảnh không dùng (tùy bạn kiểm tra, ví dụ dưới chỉ xóa file .psd, .ai, .sketch trong public)
deleteGlob('./public', /\.(psd|ai|sketch)$/);

// Xóa node_modules nếu lỡ commit
deleteIfExist('node_modules');

// Xóa các file log, tạm
deleteGlob('.', /\.log$/);

console.log('Dọn dẹp hoàn tất!');