#
░▒▓███████▓▒░ B B O T ░▒▓███████▓▒░


---
使用脚本基础的框架构建指南

基础自行安装

node.js : https://nodejs.org/zh-cn 

vsc : https://code.visualstudio.com/

python : https://www.python.org/downloads/

结构拓扑图：
```
📁bbot/  #一层文件夹，桌面或者随机盘新建文件夹命名为bbot
├──  📄 package.json       # 所需依赖列表
├──  📄 http.js            # 通用模块，经常更新。配置好的使用代理随机请求头的请求方法
├──  📄 jiema.js           # 通用模块，经常更新。解码模块，用于解决各项目验证码步骤
├──  📄 imap.js            # 通用模块，经常更新。接码模块，用于接收邮箱验证码
├──  📄 xauth.js           # 通用模块，经常更新。X认证模块，用于授权
├──  📄 dcauth.js          # 通用模块，经常更新。DC认证模块，用于授权
├──  📄 run.js             # 通用模块，经常更新。运行模块，打乱顺序并发运行。
├──  📄 logger.js          # 通用模块，经常更新。日志模块，美化日志，模块日志统一为机器人emoji。
├── 📁 项目1文件夹/   #看项目而定，自行命名
│      ├── wallet.csv  #钱包配置文件
│      ├── 脚本1.js  
│      └── 脚本2.js
├── 📁 项目2文件夹/  #看项目而定，自行命名
│      ├── wallet.csv   #钱包配置文件
│      ├── 脚本1.js
│      └──脚本2.js
└── 📁node_modules/         # 项目依赖（通过 npm install安装）
```


下载后直接BBOT文件夹内终端运行命令npm install 安装目录内所有依赖，均是官方大众验证的库，可以找GPT自行验证。

后续每个项目脚本在一层文件夹下创建项目文件夹，放入该项目脚本及配置文件，在文件夹内空白地方：右键-终端/或者地址栏输出cmd调出终端 运行脚本。

js脚本运行指令一般是npm xxx.js

py脚本运行指令一般是python xxx.py或者Pyhton3 xxx.py

最好安装pm2工具，有些脚本需要24小时计时，写的循环运行。


-----------------------------------------------------------------------------------------------------------

wallet.csv 通用钱包配置，标题行为num,add,pk,proxy,email,twtoken,dctoken,invitecode,remark。分别是序号、私钥、地址、代理（格式为"http://账号:密码@域名:端口"，如使用购买的socks5静态代理，需要改为socks://而不是socks5://）、邮箱（格式为"账号:密码")、推特token、dctoken、邀请码、备注。

表格代理部分填写支持了"域名:端口:账号:密码:协议"格式，原格式也可用，解决表格填写自动超链接的问题。
不填写默认http，socks协议需填写类型。

-----------------------------------------------------------------------------------------------------------

evm.js 是一个本地生成钱包的工具，自行修改文件内需要生成的数量然后运行。

jiema.js 4、5行需要填入自己的key，目前写了yes和2cap

xauth.js是一个推特授权模块，需要获取授权链接后传入解析好的参数

