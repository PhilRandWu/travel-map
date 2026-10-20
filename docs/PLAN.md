# 个人旅行足迹地图 · 实施计划（PLAN）

| 项 | 内容 |
|---|---|
| 文档版本 | v1.0 |
| 创建日期 | 2026-10-20 |
| 对应需求 | [PRD.md](./PRD.md) v1.0 |
| 当前阶段 | **阶段 2：地球与城市**（阶段 0、1 已于 2026-10-20 完成 ✅） |

> 本文档是 PRD 的工程落地拆解：每一步做什么、产出哪些文件、如何验收、在哪里提交。
> 约定：每个 Task 结束为一个可提交节点（commit），**每步完成后必须本地验证再进入下一步**，禁止跨步骤堆叠。

---

## 0. 总览

### 0.1 里程碑与步骤分布

| 阶段 | 内容 | Task 数 | 产出 |
|---|---|---|---|
| 阶段 0 | 项目初始化 | T0.1–T0.3 | 可运行的空地球 |
| 阶段 1 | 数据层 | T1.1–T1.4 | trips.json + 校验 + 推导逻辑 |
| 阶段 2 | 地球与城市 | T2.1–T2.3 | 城市点亮 + 城市卡片 |
| 阶段 3 | 轨迹 | T3.1–T3.3 | 飞机弧线 + 高铁折线 + hover |
| 阶段 4 | 时间轴与主图区 | T4.1–T4.4 | 胶片轴 + 联动聚焦 + 全局模式 |
| 阶段 5 | 统计与收尾 | T5.1–T5.3 | 统计 + 性能 + 验收 |
| P1（v0.2） | 回放 + EXIF | T6.x | 旅行回放、照片自动归组 |
| P2（v0.3） | 编辑器 + 分享 | T7.x | 表单编辑、部署导出 |

**建议顺序铁律**：数据层（阶段 1）必须早于渲染层。先有可信数据，再画地球。

### 0.2 目标目录结构

```
travel-map/
├── docs/
│   ├── PRD.md
│   └── PLAN.md                    ← 本文档
├── public/
│   ├── textures/                  ← 地球纹理（本地化，防外链失效）
│   └── photos/
│       └── <visit-id>/01.jpg      ← 照片按 visit 存放
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── data/
│   │   └── trips.json             ← 唯一数据源
│   ├── types/
│   │   └── index.ts               ← City / Trip / Visit 类型
│   ├── lib/
│   │   ├── cities.ts              ← 内置城市坐标表 + 查找
│   │   ├── validate.ts            ← 数据校验
│   │   ├── derive.ts              ← 点亮城市/时间轴节点/统计推导
│   │   └── geo.ts                 ← 大圆插值、距离
│   ├── components/
│   │   ├── globe/
│   │   │   ├── TravelGlobe.tsx    ← 地球主体
│   │   │   ├── CityLayer.tsx
│   │   │   ├── ArcLayer.tsx
│   │   │   └── CityTooltip.tsx
│   │   ├── city/
│   │   │   └── CityCard.tsx
│   │   ├── timeline/
│   │   │   ├── Timeline.tsx
│   │   │   └── TimelineNode.tsx
│   │   ├── hero/
│   │   │   └── HeroPhoto.tsx
│   │   ├── stats/
│   │   │   └── StatsPanel.tsx
│   │   └── common/
│   │       └── Lightbox.tsx
│   ├── hooks/
│   │   └── useTravelData.ts
│   └── styles/index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 0.3 全局状态约定（提前定，避免返工）

集中在 `App.tsx` 一个 `useTravelStore`（MVP 用 useReducer/context，不引状态库）：

```ts
type Selection =
  | { kind: 'none' }                          // 全局模式
  | { kind: 'visit'; visitId: string }        // 聚焦某次到访
  | { kind: 'trip'; tripId: string }          // 聚焦某段行程
  | { kind: 'city'; cityId: string };         // 城市卡片
```

时间轴、地球、主图区、统计全部**只读这一个 Selection**，联动天然一致。

---

## 阶段 0：项目初始化

> 目标：空白页面上出现一颗可拖拽缩放的 3D 地球。

### T0.1 脚手架与依赖
- 用 Vite 创建 `react-ts` 项目；
- 安装：`react-globe.gl`、`three`、`tailwindcss`、`d3-geo`（+ `@types/d3-geo`）；
- 配置路径别名 `@/ → src/`；配置 Tailwind。
- **验收**：`npm run dev` 起页面，`npm run build` 无 TS 报错。

### T0.2 地球基础渲染
- 新建 `TravelGlobe.tsx`：挂载 Globe，配置暗色地球纹理（先用 CDN 纹理跑通，T0.3 本地化）、星空背景、大气辉光；
- 初始相机斜俯视；开启自动缓慢自转，用户 pointerdown 后暂停，闲置 10s 恢复。
- **验收**：页面显示 3D 球体，拖拽/滚轮流畅，闲置恢复自转。

### T0.3 视觉资源本地化与布局骨架
- 地球纹理下载到 `public/textures/`，改走本地路径；
- 搭出全屏画布 + 顶部/底部悬浮 UI 的 z-index 布局骨架（空容器占位即可）；
- 确定深色太空配色与玻璃拟态基础 class。
- **验收**：断网情况下地球纹理仍正常；UI 悬浮层不挡地球交互。
- **提交**：`feat: 初始化地球与布局骨架`

---

## 阶段 1：数据层（最高优先级地基）

> 目标：一份合法的 trips.json，和一组从它推导展示数据的纯函数。此阶段不渲染地球内容。

### T1.1 类型定义
- 在 `types/index.ts` 定义 `City`、`Trip`（`type: 'flight' | 'train'`）、`Visit`、`Photo`、`TravelData` 及上面的 `Selection`。
- **验收**：`tsc --noEmit` 通过。

### T1.2 城市坐标表与示例数据
- `lib/cities.ts`：内置常用中国城市坐标（先覆盖示例行程用到的城市，表可持续扩充，独立于 trips.json）；
- `data/trips.json`：写入 **3–5 条示例行程**，要求覆盖：
  - 至少 2 段 flight、1 段 train（带 waypoints）；
  - 至少 1 个被多次到访的城市；
  - 每个 visit 挂 1–3 张占位图（可用纯色 SVG 占位，T5 再换真图）。
- **验收**：JSON 可被 import，字段符合类型。

### T1.3 数据校验
- `lib/validate.ts`：启动时执行，逐条报错——
  city/from/to/waypoints 引用存在、id 唯一、日期合法且 arrive≤leave、照片文件存在（照片存在性可在 dev 下 fetch HEAD 校验）；
- 错误以醒目格式打印到 console（列出具体 id 与原因），不静默。
- **验收**：故意删一个 city 引用，控制台出现明确报错。

### T1.4 推导纯函数
- `lib/derive.ts`：
  - `selectLitCities(data)` —— 有 visit 的城市 + 到访次数、首/末日期；
  - `buildTimelineNodes(data)` —— visits 与 trips 按日期合并排序；
  - `computeStats(data)` —— 城市数/省级覆盖/飞行段数/高铁段数/总里程；
  - `getCityVisits(cityId)`、`getTripCityIds(trip)` 等关联查询。
- `lib/geo.ts`：大圆插值采样（弧线点串）、大圆距离（haversine）。
- `hooks/useTravelData.ts`：加载 JSON → 校验 → 暴露 data 与派生结果。
- **验收**：用示例数据单测/控制台验证：点亮城市集合、节点顺序、里程数字正确。
- **提交**：`feat: 数据模型、校验与推导逻辑`

---

## 阶段 2：地球与城市

> 目标：城市被点亮，可点开放大看照片。

### T2.1 城市标记层
- `CityLayer`：用 globe 的 `htmlElementsData`（或 pointsData）渲染发光脉冲点 + 名称浮标；
- 到访多次的城市光晕略大；低缩放级别隐藏名称只留点；
- 响应全局 Selection：选中城市放大高亮。
- **验收**：示例 visit 城市全部出现，无 visit 的城市不出现。

### T2.2 城市卡片
- `CityCard.tsx`：城市名、首/末到访日期、到访次数、每次到访日期+备注、照片缩略图条；
- 卡片内列出涉及该城市的行程，点击 → Selection 切到对应 trip；
- 玻璃拟态样式，定位在画布侧栏/城市点旁，不遮挡地球。
- **验收**：点城市弹卡片，多次到访城市信息分组正确。

### T2.3 照片 Lightbox
- `Lightbox.tsx`：缩略图点击看大图，caption 展示，Esc/遮罩关闭，左右切换；
- 仅打开时请求原图。
- **验收**：键盘与鼠标均可关闭/切换。
- **提交**：`feat: 城市点亮、城市卡片与照片浏览`

---

## 阶段 3：轨迹层

> 目标：飞机走高空虚线大圆弧，高铁走贴地实线折线，可 hover 高亮。

### T3.1 飞机大圆弧线
- `ArcLayer`：flight 用 `arcsData` + 大圆弧，`stroke: 虚线质感、半透明浅蓝白`，弧顶高度按航程比例；
- 经 `geo.ts` 采样保证弧线顺滑。
- **验收**：2 段示例航班显示为抬升虚线弧，非直线穿球。

### T3.2 高铁贴地折线
- train 以 from→waypoints→to 分段，渲染贴地（极低高度）暖色实线；
- 与飞机在高度与颜色上明显可分。
- **验收**：示例高铁线路经过所有 waypoint，贴地不腾空。

### T3.3 轨迹交互与去重偏移
- hover：整条提亮 + tooltip（日期 · 起→终 · 备注），其余轨迹/点降透明度；
- 点击：Selection 切到该 trip，并在时间轴定位；
- 相同起终点的多条轨迹做弧度/侧向微偏移，避免重叠成一条。
- **验收**：hover 高亮互斥；重复航线能看出是两条。
- **提交**：`feat: 飞机/高铁轨迹与交互`

---

## 阶段 4：时间轴与主图区

> 目标：点时间轴即可驱动地球讲旅行故事。

### T4.1 时间轴胶片条
- `Timeline.tsx` + `TimelineNode.tsx`：节点 = buildTimelineNodes 输出；
- 每节点日期 + 城市名 + 缩略图（无图显示 ✈️/🚄 占位）；横向滚动，当前节点居中放大。
- **验收**：节点顺序与日期一致，缩略图懒加载。

### T4.2 联动：节点 → 地球
- 点节点 → 写 Selection（visit 或 trip）；
- 地球相机 `pointOfView` 平滑飞行（ease，约 800–1200ms）到城市；
- 对应轨迹高亮，其余淡出。
- **验收**：连续点击不同节点，相机飞行与高亮均正确。

### T4.3 顶部主图区
- `HeroPhoto.tsx`：玻璃卡片展示当前地点代表照片 + 日期（区间）+ 一句备注；可收起；
- 无选中时显示引导文案（"点击时间轴开始你的旅程"）。
- **验收**：切换节点主图与日期同步更新。

### T4.4 全局模式与反向联动
- 退出选中（再点当前节点 / 点空白 / 返回总览按钮）→ Selection=none → 全部城市轨迹恢复、相机拉远恢复自转；
- 从城市卡片点行程、点轨迹 → 时间轴自动滚动定位并高亮对应节点。
- **验收**：四种 Selection 入口与退出路径全部闭环。
- **提交**：`feat: 时间轴、主图区与全局联动`

---

## 阶段 5：统计、性能与 MVP 验收

### T5.1 统计面板
- `StatsPanel.tsx`：城市数、覆盖省/国、飞行段、高铁段、累计里程、首次/最近日期；角落低调入口，点击展开。
- **验收**：数字与 computeStats 一致。

### T5.2 性能与真实素材
- 缩略图/原图分离 + 懒加载核查；照片换真实目录 `public/photos/<visit-id>/`；
- 城市名浮标按缩放显隐；确认目标数据规模下 60fps。
- **验收**：Network 面板确认原图按需加载。

### T5.3 MVP 验收与文档
- 逐条跑 PRD 第 7 节 **10 条验收标准**，在本节（T5.3）下方 checklist 勾选；
- 写 README：如何加城市/行程/照片（2 分钟录入手册）、如何运行；
- 补 .gitignore、最终 build 验证。
- **提交**：`feat: MVP 完成` → 打 tag `v0.1.0`

### 5.x MVP 验收 Checklist（执行时逐条勾选）

- [ ] 1. 3D 地球显示，拖拽缩放，闲置自转
- [ ] 2. visit 城市发光点+名称，无 visit 不出现
- [ ] 3. 城市卡片信息正确，照片可放大
- [ ] 4. flight 高空虚线大圆弧；train 贴地实线过 waypoints
- [ ] 5. hover 轨迹 tooltip + 高亮互斥淡出
- [ ] 6. 时间轴节点正确，点击聚焦/高亮/切主图
- [ ] 7. 全局模式展示全部
- [ ] 8. 统计数字正确
- [ ] 9. 数据引用错误有明确 console 报错
- [ ] 10. 内置 3–5 条示例行程，克隆即可运行

---

## P1（v0.2）：回忆增强

| Task | 内容 | 验收要点 |
|---|---|---|
| T6.1 回放引擎 | 时间轴播放键，按日期顺序逐段推进 Selection，支持暂停/0.5x/1x/2x/进度拖动 | 全程无需点击自动走完 |
| T6.2 移动载具 | 自定义 object：小飞机沿大圆弧飞行、列车沿折线移动，到达后城市点亮、照片切换 | 载具方向沿切线，结束停全局总览 |
| T6.3 轨迹生长 | 行程随回放进度"画出"，已发生轨迹常亮、未发生隐藏 | 时间进度与轨迹一致 |
| T6.4 EXIF 归组 | exifr 读拍摄时间 → 匹配城市/行程 → 待确认列表 | 拖入照片文件夹可批量预归类 |
| T6.5 缩略图管线 | 构建期生成 thumbs，替换 T5.2 的运行时压缩 | 时间轴只加载 thumbs |
| T6.6 照片缓动 | 主图 Ken Burns 缓慢推拉 | 切换柔和不眩晕 |
| 提交 | `feat: 旅行回放与照片自动化` → tag `v0.2.0` | |

## P2（v0.3）：可维护与可分享

| Task | 内容 | 验收要点 |
|---|---|---|
| T7.1 表单编辑器 | 新增到访/行程、拖拽照片、城市名自动补全坐标 | 全程不手写 JSON |
| T7.2 本地持久化 | localStorage 保存，导入/导出 JSON 覆盖 trips.json | 刷新不丢、导出可回灌 |
| T7.3 静态部署 | Vercel/Pages 配置，纯静态可访问 | 外链打开正常 |
| T7.4 分享素材 | 截图 / 回放录屏 GIF 导出 | 一键导出可发社交平台 |
| T7.5（可选）昼夜皮肤 | 夜景地球皮肤切换 | — |
| 提交 | `feat: 编辑器与分享` → tag `v0.3.0` | |

---

## 附录 A：风险控制点（执行时注意）

1. **不要提前做轨迹动画/回放**——MVP 的 arcs 一次成型即可，动画属 P1，避免陷进 three.js 调参。
2. **react-globe.gl 先读文档确认 API 版本**：`arcsData`/`htmlElementsData`/`pointOfView` 在新版签名，T0.2 先写最小 demo 验证，再铺业务。
3. **每完成一个 Task 立即本地验收**，尤其是 T1.3/T1.4 数据层——地基错了后面全错。
4. **录入字段冻结**：trips.json 字段以 PRD 第 4 节为准，开发中想加字段先回来改 PRD，不私自膨胀。
5. **高铁坚决不接铁路网数据**，waypoint 贴地折线是最终方案。

## 附录 B：立即开工的第一步

执行 **T0.1**：在当前空目录初始化 Vite react-ts 工程并装好依赖，跑通 `npm run dev` + `npm run build`，随后进入 T0.2 地球渲染。
