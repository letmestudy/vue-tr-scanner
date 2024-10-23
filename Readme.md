# tr-scan
针对 vue 的翻译文件进行扫描，生成翻译映射文件，输出翻译完成率报告

# 使用
## 安装
```shell
cd ${workspace}
npm install
```
## 使用
### 扫描 vue 文件
```shell
node tr-scan.js scan --srcdir ./src --localedir ./src/locale --langlist en-US,zh-CN
```
### 输出翻译完成率报告
```shell
node tr-scan.js report --srcdir ./src --localedir ./src/locale --langlist en-US,zh-CN
```