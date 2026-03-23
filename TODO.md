# NutriLog — Optimization TODO

> 记录待办的优化想法，不影响当前开发进度，在合适的 Block 或 B9 Polish 阶段实现。
> Last updated: 2026-03-23

---

## UI / UX

### TODO-01 · Settings 输入框增加范围提示
- **描述：** 每个营养目标输入框旁边显示建议的参考范围，帮助用户了解合理区间
- **示例：** Calories `500 – 5000 kcal`，Protein `10 – 500 g`
- **实现思路：** 在 `settings.js` 的 `NUTRIENT_FIELDS` 里加 `hint` 字段，输入框下方渲染一行灰色小字
- **优先级：** 低
- **建议时机：** B9 Polish

---

### TODO-02 · 登录页键盘显示 12 个按键
- **描述：** 当前 PIN 键盘只显示 10 个数字键，空位导致布局不对称；应显示完整的 12 格（1-9 + 空 + 0 + ⌫）
- **实现思路：** 检查 `auth.js` 里 `pin-keypad` 的 grid 生成逻辑，确认空格键和退格键占位是否正确渲染
- **优先级：** 中
- **建议时机：** B9 Polish

---

### TODO-03 · 导航菜单字体优化
- **描述：** Tab Bar 的菜单标签字体偏大或视觉重量不够精致，需要调整
- **实现思路：** 在 `styles/main.css` 的 `.tab-bar__label` 调整 `font-size` 和 `font-weight`；Mac 端顶部导航同步优化
- **优先级：** 低
- **建议时机：** B9 Polish

---

## 安全 / 体验

### TODO-04 · Inactivity 自动登出（5分钟）
- **描述：** 用户超过 5 分钟无操作，自动清除 session token 并跳回 PIN 登录页，防止他人使用已解锁的设备
- **实现思路：**
  - 在 `main.js` 里监听 `mousemove` / `click` / `touchstart` / `keydown` 事件，每次重置计时器
  - 5 分钟后调用 `logout()`（已在 `auth.js` 实现）
  - 超时前 30 秒可以 toast 提示"即将自动登出"
- **优先级：** 中
- **建议时机：** B9 Polish

---

## 备注

- 所有 TODO 均不影响 B3–B8 核心功能开发
- B9 Polish 阶段统一评估实现优先级
- 新想法随时追加到本文件，格式保持一致
