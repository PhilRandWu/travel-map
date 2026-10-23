# 我的旅行足迹

个人旅行足迹可视化地图：3D 地球上的城市点亮、飞机/高铁轨迹、时间轴与照片。

当前发布候选版本：`v0.3.1`。

## 运行

```bash
pnpm install
pnpm dev
```

验证与构建：

```bash
pnpm typecheck
pnpm test
pnpm check
pnpm build
```

`pnpm check` 会串联类型检查与全量单测，提交前建议至少执行
`pnpm check && pnpm build`。项目要求 Node.js `>=22.12.0`，版本以 `.nvmrc` 为准。

## v0.3 体验

- 旅行档案按年份组织，最近旅程优先；进入一段旅程后，地图、地点篇章、统计、照片和回放只使用该旅程的数据；
- 桌面端单条交通与旅行回放采用路线导演镜头：以路线和目的地为主画面，飞机完整呈现滑跑、起飞、巡航、下降与接地，高铁完整呈现发车、加速、巡航、制动与进站；载具按累计路径距离等距采样并匀速推进，HUD 展示路线、日期/班次、阶段和进度，并按照 header/footer 安全区构图；回放期间锁定背景交互，结束卡关闭后焦点回到回放控制，静谧档保持总览视角；
- 常居城市以独立样式点亮，不计入旅行目的地，也不会进入地点篇章；
- 地点篇章可进入沉浸式照片回忆舞台；支持精选 / 全部、键盘、左右滑动、自动播放、进度和双击缩放；
- 回忆星图可在桌面端展开与返回，390px 下自动降级为按日期分组的瀑布流；
- 默认使用电影感动效，可切换静谧 / 电影感 / 沉浸；系统启用“减少动态”时强制使用静谧；
- 页面进入后台时暂停装饰动画；持续低帧率会自动降低一档，避免动效阻塞浏览。

## 添加城市

`src/lib/cities.ts` 已内置常用城市坐标；如果城市不存在，先加入 `BUILTIN_CITIES`，或在 `src/data/trips.json` 的 `cities` 中添加自定义城市：

```json
{
  "id": "suzhou",
  "name": "苏州",
  "lat": 31.2989,
  "lng": 120.5853,
  "province": "江苏",
  "country": "中国"
}
```

`id` 必须全局唯一；经纬度使用 WGS84 坐标。

## 添加旅程、行程与到访

`src/data/trips.json` 是唯一数据源，`meta.version` 必须为 `2`。所有 `trip` 与 `visit`
都必须通过 `journeyId` 归属于一段 `journey`；每段旅程有独立日期范围、主题与封面照片。

```json
{
  "journeys": [
    {
      "id": "j007",
      "title": "苏沪短途",
      "startDate": "2025-10-01",
      "endDate": "2025-10-03",
      "epigraph": "园林、河岸与一次短跳。",
      "theme": "sage",
      "coverPhotos": [
        { "visitId": "v006", "file": "01.jpg" }
      ]
    }
  ],
  "trips": [
    {
      "id": "t006",
      "journeyId": "j007",
      "date": "2025-10-01",
      "type": "train",
      "from": "shanghai",
      "to": "suzhou",
      "waypoints": [],
      "note": "G7313"
    }
  ],
  "visits": [
    {
      "id": "v006",
      "journeyId": "j007",
      "city": "suzhou",
      "arriveDate": "2025-10-01",
      "leaveDate": "2025-10-03",
      "note": "园林与平江路",
      "photos": [
        { "file": "01.jpg", "caption": "拙政园" }
      ]
    }
  ]
}
```

- `trip.type` 只支持 `flight` 或 `train`；
- `flight` 的 `waypoints` 留空，`train` 可按顺序填写经停城市 id；
- 日期使用 `YYYY-MM-DD`，且 `arriveDate` 不能晚于 `leaveDate`；
- `journey.theme` 支持 `amber / cyan / sage / rose`，用于卡片与护照的强调色；
- 旅程 `coverPhotos` 最多 5 张，只能引用本旅程内到访的照片；
- 点亮城市、时间轴、轨迹和统计都会自动推导。

## 添加照片

照片放在 `public/photos/<visit-id>/` 目录下。例如到访 id 是 `v006`，则保存为：

```
public/photos/v006/01.jpg
public/photos/v006/02.jpg
```

在对应 `visit.photos` 中填写文件名与可选 caption。开发模式下会校验照片文件是否存在；
原图只在 Lightbox 或回忆舞台双击放大时按需加载。

照片可以补充回忆级元数据（全部可选）：

```json
{
  "file": "01.jpg",
  "caption": "拙政园",
  "takenAt": "2025-10-01T09:20:00+08:00",
  "featured": true,
  "focalPoint": { "x": 0.54, "y": 0.48 }
}
```

- `takenAt` 必须是带时区的 ISO 8601；
- `focalPoint` 的 `x` / `y` 必须在 0–1 之间；
- `featured` 标记精选照片，照片回忆默认优先展示精选内容。

时间轴、封面、地点篇章与照片回忆使用构建期生成的四级 WebP 资产：

```bash
pnpm build:media
```

`pnpm dev` 与 `pnpm build` 会自动执行该步骤，产物写入
`public/media/<visit-id>/<文件名>/`：

- `blur.webp`：32px 占位
- `thumb-sm.webp`：160px 章节与胶片条
- `thumb-md.webp`：640px 拼图与星图
- `preview.webp`：1600px 舞台预览

原图仍在 `public/photos/`，仅在回忆舞台双击放大时请求。生成目录已加入
`.gitignore`，每次构建会先清理再重建；缺失或无法转换的照片会以明确错误中止构建。

## 动效、性能与已知边界

- 动效档位保存在浏览器 `localStorage`，刷新后保持；触屏设备不会使用沉浸档；
- 静谧档只保留约 200ms 的单次淡化，不播放路线生长、镜头推近、扫光或章节卡位移；
- 减少动态模式会关闭非必要动画与自动回忆，并优先于用户选择；
- 首屏与章节不请求舞台 `preview` 或 `/photos/` 原图，数百张照片时回忆星图只挂载视口附近节点；
- 390px 已保障进入旅程、查看地点、浏览照片、回忆舞台和瀑布流的核心流程；桌面端仍提供完整的镜头编排与星图交互；
- 浏览器自动化目前无法稳定量化 Chrome Performance 面板帧率；低帧率降级由单元测试和人为阻塞主线程回归，真实设备性能仍应在目标设备上复核。

### 使用 EXIF 自动归组

页面右上角的「照片归组」支持拖入照片或整个文件夹：

1. 浏览器只读取本地照片首段的拍摄时间，不会上传文件；
2. 拍摄日期落在到访区间内时精确匹配，相差 1 天时标为待确认；
3. 可逐张改选目标到访或取消导出；
4. 确认后下载 `trips.exif-grouped.json`，用它替换 `src/data/trips.json`；
5. 按列表中显示的 `public/photos/<visit-id>/<file>` 路径复制照片，再执行 `pnpm test` 验证。
