---
id: assembly
title: 组装教程
sidebar_position: 4
---

import useBaseUrl from '@docusaurus/useBaseUrl';

export const ImgWithBaseUrl = ({src, alt, width}) => (
<img src={useBaseUrl(src)} alt={alt} width={width ? width : undefined} />
);

# 组装教程

## 准备工作

在开始组装之前，请确保您已经：

1. 准备好所有必要的零部件（参考[零部件清单](/docs/bom)）
2. 准备好所需的工具（斜口钳、M2 螺丝刀）
3. 有一个干净的工作台

## 组装步骤

### 1. 材料准备

1. 检查所有 3D 打印件是否完整
2. 清理打印件上的支撑材料
3. 确保所有孔位通畅

### 2.持续更新中。。。整体安装与原版差不多，可以在 b 站搜 electronBot 有很多安装视频

## 注意事项

- 组装过程中请小心操作，避免损坏零部件
- 确保所有螺丝拧紧但不要过度用力
- 注意舵机的安装方向

## 常见问题

1. **舵机不转动**

   - 重新启动
   - 检查接线是否正确
   - 确认电源供应正常
   - 验证程序是否正确烧录

2. **结构不稳定**
   - 检查螺丝是否拧紧
   - 确认 3D 打印件是否变形

## 下一步

完成组装后，请参考[使用说明](/docs/usage)页面了解如何开始使用您的机器人。

如果遇到任何问题，请查看我们的[常见问题解答](/docs/faq)或联系技术支持。
