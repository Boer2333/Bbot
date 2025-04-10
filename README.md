# ░▒▓███████▓▒░ B B O T ░▒▓███████▓▒░

<div align="center">
  
[![Node.js](https://img.shields.io/badge/Node->=18.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/zh-cn)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/downloads/)
[![VSCode](https://img.shields.io/badge/IDE-VSCode-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)

</div>

---
使用脚本基础的框架构建指南

基础自行安装
node.js : https://nodejs.org/zh-cn 
vsc : https://code.visualstudio.com/
python : https://www.python.org/downloads/

拓扑图：
📁bbot/  #一层文件夹，桌面或者随机盘新建文件夹命名为bbot
├──  📄 package.json          #  所需依赖列表
├──  📄 http.js           # 通用模块，经常更新。配置好的使用代理随机请求头的请求方法
├──  📄 jiema.js          # 通用模块，经常更新。解码模块，用于解决各项目验证码步骤
├──  📄 imap.js           # 通用模块，经常更新。接码模块，用于接收填写验证码
├── 📁 项目1文件夹/   #看项目而定，自行命名
│      ├── wallet.csv  #钱包配置文件
│      ├── 脚本1.js  
│      ├── 脚本2.js
├── 📁 项目2文件夹/  #看项目而定，自行命名
│      ├── wallet.csv   #钱包配置文件
│      ├── 脚本1.js
│      ├── 脚本2.js
└── 📁node_modules/         # 项目依赖（通过 npm install安装）

下载后直接npm install 安装目录内所有依赖，均是官方大众验证的库，可以找GPT自行验证。
后续每个项目脚本在一层文件夹下创建项目文件夹，放入该项目脚本及配置文件，在文件夹内空白地方：右键-终端/或者地址栏输出cmd调出终端 运行脚本。
js脚本运行指令一般是npm xxx.js
py脚本运行指令一般是python xxx.py或者Pyhton3 xxx.py
最好安装pm2工具，有些脚本需要24小时计时，写的循环运行。
