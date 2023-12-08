带侧边栏的alist网页预览，前端样式参考[mdbook](https://github.com/rust-lang/mdBook)实现，后端使用alist
代码写的比较烂，有时间再重构

进入网页需要在弹出框输入alist相关配置 `json`格式，不要有注释

``` json
{
    // 列表在alist的路径
    "columPath": "/aliyun/xxx/xxxx/xxx",
    // alist的token
    "token": "alist-409b4058-c887-486b-a1ed-xxxxxxxx",
    // alist的地址
    "columApiServer": "http://alist.xxx.com"
}
```

