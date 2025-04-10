#
░▒▓███████▓▒░ B B O T ░▒▓███████▓▒░


---
使用脚本基础的框架构建指南

基础自行安装

node.js : https://nodejs.org/zh-cn 

vsc : https://code.visualstudio.com/

python : https://www.python.org/downloads/



![image](https://github.com/user-attachments/assets/c7139af1-747c-4e4b-8514-904f19abbf09)


下载后直接BBOT文件夹内终端运行命令npm install 安装目录内所有依赖，均是官方大众验证的库，可以找GPT自行验证。

后续每个项目脚本在一层文件夹下创建项目文件夹，放入该项目脚本及配置文件，在文件夹内空白地方：右键-终端/或者地址栏输出cmd调出终端 运行脚本。

js脚本运行指令一般是npm xxx.js

py脚本运行指令一般是python xxx.py或者Pyhton3 xxx.py

最好安装pm2工具，有些脚本需要24小时计时，写的循环运行。


-----------------------------------------------------------------------------------------------------------

evm.js 是一个本地生成钱包的工具，自行修改文件内需要生成的数量然后运行。

jiema.js 4、5行需要填入自己的key，目前写了yes和2cap

shuff.js 是一个打乱脚本，比如我们的配置文件wallet.csv想要打乱顺序，不想每天运行顺序一致，就可以在项目文件夹内运行

node ../shuff.csv ../wallet.csv wallet.csv

意思是从上层文件夹内运行打乱脚本，打乱上层文件中的wallet.csv文件并保存到本项目文件夹内wallet.csv文件
