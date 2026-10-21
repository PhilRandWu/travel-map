# 我的旅行足迹

个人旅行足迹可视化地图：3D 地球上的城市点亮、飞机/高铁轨迹、时间轴与照片。

## 运行

```bash
pnpm install
pnpm dev
```

验证与构建：

```bash
pnpm test
pnpm build
```

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

## 添加行程与到访

`src/data/trips.json` 是唯一数据源。每次出行通常需要一条 `trip` 和一条 `visit`：

```json
{
  "trips": [
    {
      "id": "t006",
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
- 点亮城市、时间轴、轨迹和统计都会自动推导。

## 添加照片

照片放在 `public/photos/<visit-id>/` 目录下。例如到访 id 是 `v006`，则保存为：

```
public/photos/v006/01.jpg
public/photos/v006/02.jpg
```

在对应 `visit.photos` 中填写文件名与可选 caption。开发模式下会校验照片文件是否存在；原图只在 Lightbox 打开时加载。

### 使用 EXIF 自动归组

页面右上角的「照片归组」支持拖入照片或整个文件夹：

1. 浏览器只读取本地照片首段的拍摄时间，不会上传文件；
2. 拍摄日期落在到访区间内时精确匹配，相差 1 天时标为待确认；
3. 可逐张改选目标到访或取消导出；
4. 确认后下载 `trips.exif-grouped.json`，用它替换 `src/data/trips.json`；
5. 按列表中显示的 `public/photos/<visit-id>/<file>` 路径复制照片，再执行 `pnpm test` 验证。
