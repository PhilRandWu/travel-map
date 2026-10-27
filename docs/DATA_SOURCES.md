# 数据来源

## 旅行记录

`src/data/trips.json` 中的旅程、交通、到访和照片说明由项目使用者维护，不属于第三方数据集。

## 中国城市目录

`src/data/cities/china-*.json` 的城市中心坐标与行政区名称来自阿里云 DataV 行政区划数据：

- 来源：https://geo.datav.aliyun.com/areas_v3/bound/
- 使用方式：生成时读取地级行政区 `center`，之后以静态 JSON 提交。
- 运行时不请求 DataV。

港澳台少量城市由项目人工核对补充。

## 国际城市目录

`src/data/cities/international-*.json` 以 Natural Earth 10m populated places 为基础：

- 来源：https://github.com/nvkelso/natural-earth-vector
- Natural Earth 数据属于 public domain。
- 中文名、英文名、首都标记和坐标来自 Natural Earth 属性。
- 国家中文名使用 `world-countries` 的翻译补充。

项目维护了少量旅行常用别名，例如 NYC、LA、SF 和城市简称。

## 城市目录重新生成

```bash
pnpm cities:build
```

该命令需要网络，只会写入手工生成的城市 JSON。常规 `pnpm dev`、`pnpm build` 和线上运行完全离线。
