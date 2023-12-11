# 简介
实现了一个基于alist API的在线文档预览渲染器网站，
根据文件目录结构自动生成侧边栏，自动记住多目录观看进度，支持预览`md > html > pdf`，
支持`pwa`，markdown代码高亮，
前端样式参考[mdbook](https://github.com/rust-lang/mdBook)实现
# 配置
进入网页需要在弹出框输入alist相关配置 `json`格式，不要有注释

请求中如出现跨域问题，请开启alist的本地代理功能
``` json
{
    // 列表在alist的路径 如全路径为http://192.168.123.8:5244/bdyun/html合集，则columPath为/bdyun/html合集,columApiServer为http://192.168.123.8:5244
    "columPath": "/bdyun/html合集",
    // alist的token 路径 /@manage/settings/other中的 令牌
    "token": "alist-409b4058-c887-486b-a1ed-xxxxxxxx",
    // alist的地址
    "columApiServer": "http://192.168.123.8:5244"
}
```

# 效果
![img.png](docs/img2.png)
![img.png](docs/img.png)
markdown来源: [java-eight-part](https://github.com/CoderLeixiaoshuai/java-eight-part)
![img.png](docs/img3.png)