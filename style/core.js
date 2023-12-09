Vue.component('multiselect', window.VueMultiselect.default)
new Vue({
    el: '#body-container',
    data: {
        htmlSrcDoc: '',
        pdfSrc: '',
        mdDoc: '',
        renderType: 'html',
        columPath: '',
        token: '',
        columApiServer: '',
        menus: [],
        urlParams: [],
        title: '',
        allColumns: [],
        selectColumn: '',
        currentMenu: null,
        currentSelectColumn: '',
        showSidebar: false,
        isMobile: false,
        sortMenus: {},
        beforeSubMenu: null,
        isFirstLoad: false,
        oldInnerWidthWidth: window.innerWidth,
        nodeContentMap: {}
    },
    watch: {
        'selectColumn.name': (n, o) => {
            if (n) {
                document.title = n
            }
        }
    },
    computed: {},
    created() {
        // 初始化配置
        this.initConfig('请输入配置')
        // this.loadMenus()
        this.getAllColums();
        window.addEventListener('hashchange', this.handleHashChange);
        window.addEventListener('resize', this.showOrHideSideBar);
        _ = this
    },
    updated() {
    },
    mounted() {
        this.showOrHideSideBar()
    },
    beforeDestroy() {
        window.removeEventListener('hashchange', this.handleHashChange);
        window.removeEventListener('resize', this.showOrHideSideBar);
    },
    methods: {
        customLabel({ name, isEnd }) {
            return `${name}`
        },
        initConfig(str) {
            let tempConfigStr = getColumnConfig()
            if (!tempConfigStr) {
                tempConfigStr = prompt(str, '')
                this.isFirstLoad = true
                setColumnConfig(tempConfigStr)
            }
            let tempConfigJson;
            try {
                tempConfigJson = JSON.parse(tempConfigStr)
            } catch (e) {
            }
            if (!(tempConfigJson && tempConfigJson['columPath'])) {
                clearColumnConfig()
                return (count < 10) && (count++, this.initConfig('配置不正确，请重新输入'))
            }
            this.columPath = tempConfigJson['columPath']
            this.token = tempConfigJson['token']
            this.columApiServer = tempConfigJson['columApiServer']
            return true

        },
        clickChapterItem(obj) {
            obj.expanded = !obj.expanded;
        },
        checkMobile() {
            return window.innerWidth <= 800; // 根据实际情况设置移动端的宽度阈值
        },
        // 处理 hash 变化的方法
        handleHashChange() {
            // 获取新的 hash 值
            const newHash = window.location.hash;
            if (newHash) saveCurrentProgress(newHash)
        },
        handleSelectOpen() {
            this.$nextTick(() => {
                scrollIntoView(this.$refs.multiselect.$el.querySelector('.multiselect__option--selected'))
            });
        },
        getMenuNode(i) {
            if (!this.currentMenu) return
            const index = this.currentMenu.index
            return this.sortMenus[index + i]
        },
        prevOrNextMenu(i) {
            const menuNode = this.getMenuNode(i)
            if (!menuNode) return
            path = menuNode.path.replace(this.columPath + "/", '')
            window.location.hash = `#${path}`
            this.renderContent(menuNode)
        },
        prevMenu() {
            this.prevOrNextMenu(-1)
        },
        nextMenu() {
            this.prevOrNextMenu(1)
        },
        renderContent(subMenu, event) {
            console.log('索引', subMenu.index);
            this.currentMenu = subMenu
            this.renderPdf = false
            this.checkMobile() && (this.showSidebar = false)
            if (this.brforeSubMenu === subMenu) return
            subMenu.active = true
            if (this.brforeSubMenu) this.brforeSubMenu.active = false
            this.brforeSubMenu = subMenu
            // 滚动到页面顶部
            this.htmlSrcDoc = "加载中"
            this.title = subMenu.menuName
            window.scrollTo({
                top: 0
            });
            const renderType = subMenu.type
            this.renderType = renderType
            if (renderType === 'pdf') {
                this.loadNode(subMenu).then(res => {
                    this.renderPdf = true
                    this.pdfSrc = res;
                    scrollIntoView(document.querySelector('.active'))
                    // 缓存下一节
                    this.loadNode(this.getMenuNode(1))
                })
            } else if (renderType === 'html') {
                this.loadNode(subMenu).then((res) => {
                    this.htmlSrcDoc = res
                    this.$refs['htmlIframe'].style.height = '50px'
                    scrollIntoView(document.querySelector('.active'))
                    // 缓存下一节
                    this.loadNode(this.getMenuNode(1))
                })
            } else if (renderType === 'md') {
                this.loadNode(subMenu).then((res) => {
                    const customRenderer = new marked.Renderer();
                    customRenderer.image = function (href, title, text) {
                        let imgSrc = null
                        if (href.startsWith('http')) {
                            imgSrc = href
                        } else {
                            imgSrc = _.columApiServer + '/d' + _.currentMenu.path.replace(_.currentMenu.menuName, '') + '/' + href
                        }
                        // 返回自定义的 HTML 输出
                        return `<img src="${imgSrc}" title="${title}" alt="${text}" style="max-width:100%;" />`;
                    };
                    // 将自定义的 renderer 对象传递给 marked 函数
                    marked.setOptions({
                        renderer: customRenderer,
                    });
                    this.mdDoc = marked.parse(res);
                    scrollIntoView(document.querySelector('.active'))
                    // 缓存下一节
                    this.loadNode(this.getMenuNode(1))
                })
            }
        },
        // 加载专栏
        loadNode(menuNode) {
            return new Promise((resolve, reject) => {
                if (!menuNode) reject('章节不能为空')
                const key = menuNode.path
                const menuName = menuNode.menuName
                let currentNodeContent = this.nodeContentMap[key]
                if (currentNodeContent && currentNodeContent.loaded) {
                    return resolve(currentNodeContent.data)
                } else if (currentNodeContent && !currentNodeContent.loaded) {
                    // 有另外一个线程再加载，延时递归
                    return setTimeout(() => {
                        this.loadNode(menuNode)
                            .then(resolve)  // 递归结束后 resolve 当前 Promise
                            .catch(reject); // 如果有错误，reject
                    }, 200)
                } else {
                    this.nodeContentMap[key] = { loaded: false, data: null }
                }
                if (menuNode.type === 'pdf') {
                    axios({
                        method: 'get',
                        url: `${this.columApiServer}/d` + menuNode.path,
                        headers: {
                            Authorization: this.token
                        },
                        responseType: 'blob'
                    }).then(res => {
                        this.nodeContentMap[key].data = URL.createObjectURL(res.data);
                        this.nodeContentMap[key].loaded = true
                        resolve(this.nodeContentMap[key].data)
                    }).catch(err => {
                        alert(menuName + '加载失败')
                    });
                } else {
                    axios({
                        method: 'get',
                        url: `${this.columApiServer}/d` + menuNode.path,
                        headers: {
                            Authorization: this.token
                        },
                    }).then(res => {
                        this.nodeContentMap[key].data = res.data
                            .replaceAll('user-select', 'user-select-fuck')
                            .replaceAll('overflow: hidden', 'overflow: auto')
                            .replaceAll('-webkit-box-orient:vertical', '').replaceAll('-webkit-box-orient: vertical', '')
                        this.nodeContentMap[key].loaded = true
                        resolve(this.nodeContentMap[key].data)
                    }).catch(err => {
                        alert(menuName + '加载失败')
                    });
                }
            })
        },
        showOrHideSideBar() {
            if (this.oldInnerWidthWidth !== window.innerWidth || !this.checkMobile()) {
                this.showSidebar = !this.checkMobile()
                this.oldInnerWidthWidth = window.innerWidth
            }
        },
        showSelect() {
            this.$refs['multiselect'].isOpen = true
            this.showSidebar = true
        },
        // 加载url对应的专栏
        loadColumByUrl() {
            if (!location.hash) {
                const currentProgress = getCurrentProgress()
                if (!currentProgress) {
                    this.showSelect()
                    return
                }
                location.hash = currentProgress
            }
            this.urlParams = decodeURIComponent(location.hash).substring(1).split('/')
            if (this.urlParams.length < 1) {
                const currentProgress = getCurrentProgress()
                if (!currentProgress) {
                    this.showSelect()
                    return
                }
                this.urlParams = currentProgress.split('/')
            }
            const selectColumnValue = this.urlParams[0]
            if (!selectColumnValue) {
                this.showSelect()
                return
            }
            this.selectColumn = this.allColumns.find(v => v.value == selectColumnValue)
            if (!this.selectColumn) return
            this.currentSelectColumn = this.selectColumn.value
            this.loadMenus(this.selectColumn.value)
        },
        loadColumn() {
            if (this.selectColumn) {
                this.menus = []
                window.location.hash = `#${this.selectColumn.value}`
                this.currentSelectColumn = this.selectColumn.value
                this.loadMenus(this.selectColumn.value)
            }
        },
        // 获取所有专栏
        getAllColums() {
            axios({
                method: 'post',
                url: `${this.columApiServer}/api/fs/list`,
                headers: {
                    Authorization: this.token
                },
                data: {
                    "path": this.columPath,
                    "password": "",
                    "page": 1,
                    "per_page": 0,
                    "refresh": false
                }
            }).then(res => {
                res.data.data.content?.forEach((obj) => {
                    const column = obj.name;
                    // 过滤视频课
                    if (column.indexOf('视频课') > -1) {
                        return
                    }
                    // this.allColumns.push({ label: column, value: column })
                    columnName = column.replace('专案课', '专栏课')
                    let end = true
                    if (!columnName.includes('完结')) {
                        end = false
                    } else {
                        columnName = columnName.replace('（完结）', '').replace('(完结)', '').replace('(完结）', '')
                    }
                    this.allColumns.push({ name: columnName.includes('专栏课-') ? columnName.substring(columnName.indexOf('专栏课-') + 4) : columnName, value: column, isEnd: end })

                });
                this.loadColumByUrl();

            }).catch(err => {
                // 清空配置
                clearColumnConfig()
            })
        },
        getFsList(path) {
            return axios({
                method: 'post',
                url: `${this.columApiServer}/api/fs/list`,
                headers: {
                    Authorization: this.token
                },
                data: {
                    "path": this.columPath + path,
                    "password": "",
                    "page": 1,
                    "per_page": 0,
                    "refresh": false
                }
            })
        },
        // 加载目录
        loadMenus(column) {
            let index = 0;
            this.sortMenus = {}
            this.getFsList(`/${column}`)
                .then(async (res) => {
                    if (!res.data.data.content) return
                    // 优先加载
                    const prioritizeFile = prioritizeFileExtensions(res.data.data.content.map(o => o.name))
                    let collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
                    res.data.data.content.sort((a, b) => {
                        return collator.compare(a.name, b.name)
                    })
                    for (const obj of res.data.data.content) {
                        const subMenu = [];
                        const menuName = obj.name;
                        if (excludedExtensions.some(ext => menuName.endsWith(ext))) continue
                        let menuObj = { menuName: menuName, expanded: true }
                        if (!obj.is_dir) {
                            if (!menuName.endsWith(prioritizeFile)) continue
                            // 是否保存pdf
                            menuObj = Object.assign({}, menuObj, {
                                index: index++,
                                type: getNameExt(menuName),
                                menuName: replaceName(menuName),
                                path: this.columPath + `/${this.selectColumn.value}/${menuName}`
                            })
                            this.sortMenus[menuObj.index] = menuObj
                        } else {
                            menuObj.subMenu = subMenu;
                            const subRes = await this.getFsList(`/${column}/${menuName}`);
                            // 是否保存pdf
                            const prioritizeFile = prioritizeFileExtensions(subRes.data.data.content.map(o => o.name))
                            subRes.data.data.content?.forEach((subObj) => {
                                const subMenuName = subObj.name;
                                if (!subMenuName.endsWith(prioritizeFile)) return
                                if (excludedExtensions.some(ext => subMenuName.endsWith(ext))) return
                                const menu = {
                                    menuName: replaceName(subMenuName),
                                    type: getNameExt(subMenuName),
                                    path: this.columPath + `/${this.selectColumn.value}/${menuName}/${subMenuName}`,
                                    index: index++
                                }
                                this.sortMenus[menu.index] = menu
                                subMenu.push(menu);
                            });
                        }
                        if (menuName.startsWith('开篇词')) {
                            errIndex = menuObj.index
                            menuObj.index = -1
                            delete this.sortMenus[errIndex]
                            this.sortMenus[menuObj.index] = menuObj
                            this.menus.unshift(menuObj)
                        } else {
                            this.menus.push(menuObj);
                        }
                    }
                    // 页面加载完成再根据url加载专栏
                    // this.loadColumByUrl();
                    const [_, menuName, subMenuName] = this.urlParams;
                    const menu = this.menus.find(m => m.menuName === menuName);
                    const subMenu = menu?.subMenu?.find(s => s.menuName === subMenuName);

                    if (subMenu || menu) {
                        this.renderContent(subMenu || menu, null);
                    }

                })
        }
    },
});

const excludedExtensions = ['.mp3', '.mp4', '.m4a', 'images', 'MP3', 'videos', 'img']

function getNameExt(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

let count = 0

function replaceName(name) {
    return name.replace('[天下无鱼][shikey.com]', '').replace('[一手资源：666java.com]', '').replace('_For_group_share', '');
}

function removNameExt(fileName) {
    return fileName.replace(/\.[^/.]+$/, "");
}

const currentProgressStr = 'currentProgress'

function saveCurrentProgress(path) {
    localStorage.setItem(currentProgressStr, path)
}

function getCurrentProgress() {
    return localStorage.getItem(currentProgressStr)
}

function getColumnConfig() {
    return localStorage.getItem('columnConfig')
}

function setColumnConfig(config) {
    localStorage.setItem('columnConfig', config)
}

function clearColumnConfig() {
    localStorage.removeItem('columnConfig')
}

function scrollIntoView(target) {
    // const target = document.querySelector('.active')
    if (target) {
        target.scrollIntoViewIfNeeded(true);
    }
}

function prioritizeFileExtensions(fileList) {
    // 加载优先级，靠前的优先展示
    const priorityOrder = ['html', 'md', 'pdf'];

    for (const extension of priorityOrder) {
        const matchingFile = fileList.find(file => file.endsWith(`.${extension}`));
        if (matchingFile) {
            return extension;
        }
    }

    // 如果没有匹配的文件，可以根据需要返回一个默认值或者抛出错误等
    return null;
}