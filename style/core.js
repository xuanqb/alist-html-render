Vue.component('multiselect', window.VueMultiselect.default)
new Vue({
    el: '#body-container',
    data: {
        htmlSrcDoc: '',
        pdfSrc: '',
        mdDoc: '',
        renderType: 'html',
        renderStatus: false,
        columnConfig: {
            columPath: '',
            columApiServer: '',
            token: '',
            blockStrings: '[天下无鱼][shikey.com]\n[一手资源：666java.com]\n_For_group_share\n【公众号：小谧蜂】\n✅',
            // 优先加载顺序
            priorityOrder: 'html,md,pdf',
            // 并发请求限制
            requestLimit: 1,
            // 移动端调试
            debugMode: 'close'
        },
        initLoading: {
            status: false,
            msg: 'loading'
        },
        menus: [],
        urlParams: [],
        title: '',
        // 所有的专栏
        allColumns: [],
        // 专栏根据观看状态分组
        allColumnsGroupByViewingStatus: [],
        selectColumn: '',
        currentMenu: null,
        currentSelectColumn: '',
        showSidebar: false,
        isMobile: false,
        sortMenus: {},
        beforeSubMenu: null,
        isFirstLoad: false,
        oldInnerWidthWidth: window.innerWidth,
        // 菜单和内容的映射
        menuContentMap: {},
        // 专栏和菜单的映射
        columnMenuMap: {},
        // 屏蔽标题中的字符串
        isDialogVisible: false,
        // 全局折叠
        globalIsExpanded: false
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
        if (this.initConfig()) {
            this.getAllColums();
        }
        window.addEventListener('hashchange', this.handleHashChange);
        window.addEventListener('resize', this.showOrHideSideBar);
        _ = this
        document.onkeydown = function (event) {
            if (event.key == "ArrowRight" || event.keyCode == 39) {
                // 前进
                _.nextMenu()
            } else if (event.key == "ArrowLeft" || event.keyCode == 37) {
                // 后退
                _.prevMenu()
            }
        }
    },
    updated() {
    },
    mounted() {
        this.showOrHideSideBar()
        window.showMarkedImage = function (e, href) {
            let el = e.target
            let rfs =
                el.requestFullScreen ||
                el.webkitRequestFullScreen ||
                el.mozRequestFullScreen ||
                el.msRequestFullScreen
            if (rfs) {
                rfs.call(el)
            }
            console.log(href)
        }
    },
    beforeDestroy() {
        window.removeEventListener('hashchange', this.handleHashChange);
        window.removeEventListener('resize', this.showOrHideSideBar);
    },
    methods: {
        positionMenuNode() {
            if (this.globalIsExpanded) {
                this.foldMenus(true)
            }
            this.$nextTick(() => {
                scrollIntoView(document.querySelector('.active'))
            })
        },
        // 折叠菜单
        foldMenus(isExpanded) {
            function fondMenu(menu) {
                if (menu && menu.length > 0) {
                    menu.forEach(m => fondMenu(m))
                }
                if (menu.subMenu && menu.subMenu.length > 0) {
                    menu.expanded = isExpanded
                    fondMenu(menu.subMenu)
                }
            }
            this.globalIsExpanded = !this.globalIsExpanded
            fondMenu(this.menus)
        },
        // 清除缓存
        clearCache() {
            localStorage.removeItem(cloumuMenuProgressKey)
            localStorage.removeItem(currentProgressStr)
            window.location.reload()
        },
        // 打开配置页
        openSettings() {
            this.isDialogVisible = !this.isDialogVisible
        },
        saveSettings() {
            const tempConfigStr = this.columnConfig
            setColumnConfig(JSON.stringify(tempConfigStr))
            window.location.reload()
            this.isDialogVisible = false
        },
        initConfig() {
            this.initLoading = {
                status: false,
                msg: '加载配置ing'
            }
            let tempConfigStr = getColumnConfig()
            if (!tempConfigStr) {
                this.isDialogVisible = true
                return false
            }
            let tempConfigJson;
            try {
                tempConfigJson = JSON.parse(tempConfigStr)
            } catch (e) {
                this.isDialogVisible = true
                return false
            }
            this.columnConfig = { ...this.columnConfig, ...tempConfigJson }
            let tempColumPath = tempConfigJson['columPath']
            if (tempColumPath && !tempColumPath.startsWith('/')) tempColumPath = '/' + tempColumPath
            this.columnConfig.columPath = tempColumPath
            // 移动端调试
            if (this.columnConfig.debugMode === 'open') {
                loadScript('https://unpkg.com/vconsole@latest/dist/vconsole.min.js', () => {
                    var vConsole = new window.VConsole();
                })
            }
            return true

        },
        checkMobile() {
            return window.innerWidth <= 1024; // 根据实际情况设置移动端的宽度阈值
        },
        // 处理 hash 变化的方法
        handleHashChange() {
            // 获取新的 hash 值
            const newHash = window.location.hash;
            if (newHash && decodeURIComponent(newHash).split('/').length > 1) {
                // 保存最近一次观看的专栏的章节
                saveCurrentProgress(newHash)
                // 保存每个专栏最近一次观看的章节
                let cloumuMenuProgress = this.getCloumuMenuProgress()
                // 默认为未看完
                let completed = false
                // 根据章节索引计算是否已看完
                if (this.currentMenu && !this.getMenuNode(1)) {
                    completed = true
                }
                cloumuMenuProgress[this.currentSelectColumn] = { path: newHash, completed: completed }
                localStorage.setItem(cloumuMenuProgressKey, JSON.stringify(cloumuMenuProgress))
                // 重新触发专栏分组
                this.columnGroup()
                this.loadColumByUrl()
            }
        },
        getCloumuMenuProgress() {
            return JSON.parse(localStorage.getItem(cloumuMenuProgressKey)) || {}
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
            path = menuNode.relativePath
            window.location.hash = `#${path}`
            // fix
            localStorage.setItem('scrollY', 0)
        },
        prevMenu() {
            this.prevOrNextMenu(-1)
        },
        nextMenu() {
            this.prevOrNextMenu(1)
        },
        renderContent(subMenu, event) {
            this.initLoading = {
                status: true
            }
            console.log('索引', subMenu.index);
            this.currentMenu = subMenu
            this.renderPdf = false
            this.renderStatus = false
            this.checkMobile() && (this.showSidebar = false)
            if (this.brforeSubMenu === subMenu) return
            subMenu.active = true
            if (this.brforeSubMenu) this.brforeSubMenu.active = false
            this.brforeSubMenu = subMenu
            // 滚动到页面顶部
            this.htmlSrcDoc = "内容加载中"
            this.mdDoc = "内容加载中"
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
                    this.loadNextMenu()
                    this.renderStatus = true
                })
            } else if (renderType === 'html') {
                this.loadNode(subMenu).then((res) => {
                    this.htmlSrcDoc = res
                    this.$refs['htmlIframe'].style.height = '50px'
                    scrollIntoView(document.querySelector('.active'))
                    // 缓存下一节
                    this.loadNextMenu()
                    this.$nextTick(() => {
                        setTimeout(() => {
                            this.renderStatus = true
                        }, 1000)
                    })
                })
            } else if (renderType === 'md') {
                this.loadNode(subMenu).then((res) => {
                    this.mdDoc = markdownRenderer.markdown.parse(res);
                    clipboard()
                    scrollIntoView(document.querySelector('.active'))
                    this.$nextTick(() => {
                        const scrollY = localStorage.getItem('scrollY')
                        if (scrollY) {
                            window.scrollTo({ top: parseInt(scrollY) })
                            localStorage.setItem('scrollY', 0)
                        }
                    })
                    // 缓存下一节
                    this.loadNextMenu()
                    this.renderStatus = true
                })
            }
        },
        loadNextMenu() {
            const nextMenu = this.getMenuNode(1)
            if (nextMenu) {
                this.loadNode(nextMenu)
            }
        },
        // 加载专栏
        loadNode(menuNode) {
            return new Promise((resolve, reject) => {
                if (!menuNode) reject('章节不能为空')
                const key = decodeURIComponent(menuNode.path)
                const menuName = menuNode.menuName
                let currentMenuContent = this.menuContentMap[key]
                if (currentMenuContent && currentMenuContent.loaded) {
                    return resolve(currentMenuContent.data)
                } else if (currentMenuContent && !currentMenuContent.loaded) {
                    // 有另外一个线程再加载，延时递归
                    return setTimeout(() => {
                        this.loadNode(menuNode)
                            .then(resolve)  // 递归结束后 resolve 当前 Promise
                            .catch(reject); // 如果有错误，reject
                    }, 200)
                } else {
                    this.menuContentMap[key] = { loaded: false, data: null }
                }
                const fileSign = menuNode.fileSign ? `?sign=${menuNode.fileSign}` : ''
                const reqUrl = `${this.columnConfig.columApiServer}/d` + menuNode.path + fileSign
                if (menuNode.type === 'pdf') {
                    axios({
                        method: 'get',
                        url: reqUrl,
                        headers: {
                            Authorization: this.token
                        },
                        responseType: 'blob'
                    }).then(res => {
                        this.menuContentMap[key].data = URL.createObjectURL(res.data);
                        this.menuContentMap[key].loaded = true
                        resolve(this.menuContentMap[key].data)
                    }).catch(err => {
                        alert(menuName + '加载失败')
                    });
                } else {
                    axios({
                        method: 'get',
                        url: reqUrl,
                        headers: {
                            Authorization: this.token
                        },
                    }).then(res => {
                        if (menuNode.type === 'html') {
                            this.menuContentMap[key].data = res.data
                                .replaceAll('user-select', 'user-select-fuck')
                                .replaceAll('overflow: hidden', 'overflow: auto')
                                .replaceAll('word-break: break-all;', 'word-break: break-word;')
                                .replaceAll('-webkit-box-orient:vertical', '').replaceAll('-webkit-box-orient: vertical', '')
                        } else {
                            this.menuContentMap[key].data = res.data
                        }

                        this.menuContentMap[key].loaded = true
                        resolve(this.menuContentMap[key].data)
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
        initConfigDone() {
            this.initLoading = {
                status: true
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
                    this.initConfigDone()
                    return
                }
                location.hash = currentProgress
            }
            this.urlParams = decodeURIComponent(location.hash).substring(1).split('/')
            if (this.urlParams.length < 1) {
                const currentProgress = getCurrentProgress()
                if (!currentProgress) {
                    this.showSelect()
                    this.initConfigDone()
                    return
                }
                this.urlParams = currentProgress.split('/')
            }
            const selectColumnValue = this.urlParams[0]
            if (!selectColumnValue) {
                this.showSelect()
                this.initConfigDone()
                return
            }
            if (this.urlParams.length == 1) {
                this.showSidebar = true
            }
            this.selectColumn = this.allColumns.find(v => v.value == selectColumnValue)
            if (!this.selectColumn) {
                this.initConfigDone()
                return
            }
            this.currentSelectColumn = this.selectColumn.value
            this.loadMenus(this.selectColumn.value)
        },
        loadColumn(obj) {
            // 专栏分组之后点击 组名也会触发，需要忽略此次选择
            if (!obj || obj instanceof Array) return
            if (this.selectColumn) {
                this.menus = []
                this.currentMenu = null
                // 当前专栏最近看的章节
                let cloumuMenuProgress = this.getCloumuMenuProgress()
                const currentColumnLookedMenu = cloumuMenuProgress[this.selectColumn.value] || null
                if (currentColumnLookedMenu) {
                    window.location.hash = currentColumnLookedMenu.path
                    this.loadColumByUrl()
                    return
                }
                window.location.hash = `#${this.selectColumn.value}`
                this.currentSelectColumn = this.selectColumn.value
                this.loadMenus(this.selectColumn.value)
            }
        },
        // 获取所有专栏
        getAllColums() {
            this.initLoading = {
                status: false,
                msg: '获取专栏列表ing'
            }
            axios({
                method: 'post',
                url: `${this.columnConfig.columApiServer}/api/fs/list`,
                headers: {
                    Authorization: this.columnConfig.token
                },
                data: {
                    "path": this.columnConfig.columPath,
                    "password": "",
                    "page": 1,
                    "per_page": 0,
                    "refresh": false
                }
            }).then(res => {
                res.data.data.content?.sort((a, b) => naturalSortByName(a, b))
                res.data.data.content?.forEach((obj) => {
                    const column = obj.name;
                    // 过滤非文件夹
                    if (!obj.is_dir) {
                        return
                    }
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
                // 专栏分组
                this.columnGroup()
                this.loadColumByUrl();

            }).catch(err => {
                console.error('加载失败', err)
                // 清空配置
                // clearColumnConfig()
                alert('配置有误，请重新配置')
                this.openSettings()
            })
        },
        columnGroup() {
            const cloumuMenuProgress = this.getCloumuMenuProgress()
            this.allColumnsGroupByViewingStatus = columnGroupBy(this.allColumns, column => {
                const cloumuProgress = cloumuMenuProgress[column.value]
                if (cloumuProgress) {
                    if (cloumuProgress.completed) {
                        return columnViewingStatus.completed
                    }
                    return columnViewingStatus.watching
                } else {
                    return columnViewingStatus.notStarted
                }
            })
        },
        getFsList(path) {
            return axios({
                method: 'post',
                url: `${this.columnConfig.columApiServer}/api/fs/list`,
                headers: {
                    Authorization: this.columnConfig.token
                },
                data: {
                    "path": this.columnConfig.columPath + path,
                    "password": "",
                    "page": 1,
                    "per_page": 0,
                    "refresh": false
                }
            })
        },
        getColumnContent(path) {
            const reqUrl = `${this.columnConfig.columApiServer}/d` + this.columnConfig.columPath + path
            return new Promise((resolve, reject) => {
                axios({
                    method: 'get',
                    url: reqUrl,
                    headers: {
                        Authorization: this.token
                    },
                }).then(res => {
                    resolve(res.data)
                });
            })
        },
        // 创建排序规则
        async createSortConfig(column, menus) {
            let sortConfig = {
                // 菜单排序方式，自然排序、根据SUMMARY排序
                type: 'naturalSort',
                // SUMMARY 排序使用
                summarySortRule: null
            }
            const summaryFile = menus.filter(content => content.name === SUMMARY)
            if (summaryFile && summaryFile.length > 0) {
                sortConfig.type = SUMMARY
                sortConfig.summarySortRule = await this.sortMenusBySummary(column, summaryFile[0])
            }
            return sortConfig
        },
        // 创建节点
        generateMenuObj(obj, column, subMenuPromises, sortConfig, prioritizeFile, recursiveLevel) {
            const menuName = obj.name
            let relativePath = `${column}/${menuName}`
            let menuObj = { menuName: menuName, expanded: recursiveLevel < 2 ? true : false, subMenu: [] }
            // 文件夹获取子目录并递归
            if (obj.is_dir) {
                subMenuPromises.push(
                    () => {
                        console.log(relativePath)
                        return new Promise((resolve, reject) => {
                            this.getFsList(`/${relativePath}`).then((subRes) => {
                                if (!subRes.data.data) return
                                prioritizeFile = prioritizeFileExtensions(subRes.data.data.content?.map(o => o.name));
                                subRes.data.data.content?.sort((a, b) => sortMenusByConfig(a, b, sortConfig))
                                subRes.data.data.content?.forEach((subObj) => {
                                    const subMenuObj = this.generateMenuObj(subObj, relativePath, subMenuPromises, sortConfig, prioritizeFile, recursiveLevel + 1)
                                    if (subMenuObj) {
                                        menuObj.subMenu.push(subMenuObj);
                                    }
                                });
                                resolve()
                            })
                        })
                    }
                );
            } else {
                if (!menuName.endsWith(prioritizeFile)) return
                const replaceMenuName = replaceName(menuName)
                const relativeMenuPath = encodeURIComponent(`${column}/${replaceMenuName}`)
                return Object.assign({}, menuObj, {
                    type: getNameExt(menuName),
                    menuName: replaceMenuName,
                    active: false,
                    sourceMenuName: menuName,
                    parentPath: this.columnConfig.columPath + `/${this.selectColumn.value}`,
                    path: this.columnConfig.columPath + encodeURIComponent(`/${relativePath}`),
                    fileSign: obj.sign,
                    relativePath: relativeMenuPath
                })
            }
            return menuObj
        },
        // 加载目录
        loadMenus(column) {
            this.initLoading = {
                status: false,
                msg: '获取当前专栏目录ing'
            }
            this.sortMenus = {}
            this.menus = []
            const currentSelectColumn = this.currentSelectColumn
            let currentColumnMenu = this.columnMenuMap[currentSelectColumn]
            if (currentColumnMenu) {
                this.sortMenus = currentColumnMenu.sortMenus
                this.menus = currentColumnMenu.menus
                this.renderContentByUrl()
                return
            }

            const fetchAndProcessData = async () => {
                const res = await this.getFsList(`/${column}`);
                currentColumnMenu = { menus: [], sortMenus: {} }
                if (!res.data.data.content) return
                // 优先加载
                const prioritizeFile = prioritizeFileExtensions(res.data.data.content?.map(o => o.name));
                // 创建排序规则
                const sortConfig = await this.createSortConfig(column, res.data.data.content)
                // 排序
                res.data.data.content.sort((a, b) => sortMenusByConfig(a, b, sortConfig))
                const subMenuPromises = [];
                // 递归层级
                let recursiveLevel = 1
                res.data.data.content.forEach((obj) => {
                    const menuName = obj.name;
                    if (excludedExtensions.some(ext => menuName.endsWith(ext))) return
                    let menuObj = this.generateMenuObj(obj, `${column}`, subMenuPromises, sortConfig, prioritizeFile, recursiveLevel)
                    if (!menuObj) {
                        return
                    }
                    if (menuName.startsWith('开篇词')) {
                        currentColumnMenu.menus.unshift(menuObj)
                    } else {
                        currentColumnMenu.menus.push(menuObj);
                    }
                    if (currentSelectColumn == this.currentSelectColumn) {
                        this.menus = currentColumnMenu.menus
                    }
                });
                await promiseAllLimit(subMenuPromises, this.columnConfig.requestLimit)
                if (currentSelectColumn == this.currentSelectColumn) {
                    // fix 排序错误
                    currentColumnMenu.sortMenus = renumberAndFlat(currentColumnMenu.menus)
                    this.menus = currentColumnMenu.menus
                    this.sortMenus = currentColumnMenu.sortMenus
                }
                this.columnMenuMap[currentSelectColumn] = currentColumnMenu;
                this.renderContentByUrl();
            };
            fetchAndProcessData();
        },
        // 根据summary.md 排序
        async sortMenusBySummary(column, summaryFile) {
            const fileSign = summaryFile.sign ? `?sign=${summaryFile.sign}` : ''
            let summarySortRule = {}
            let sortIncr = 0
            // 获取大纲内容
            const summaryContent = await this.getColumnContent(`/${column}/${SUMMARY}${fileSign}`)
            // 一级菜单正则提取
            const title_1_reg = /#.* (\S.*)/g;
            const matches_1 = summaryContent.matchAll(title_1_reg)
            let mergedResults = [...matches_1].forEach(match => summarySortRule[match[1]] = sortIncr++);
            // 二级正文标题正则提取
            const title_2_reg = / \* \[(\S.*)\]|(\* (\S.*))/g;
            const matches_2 = summaryContent.matchAll(title_2_reg)
            mergedResults = [...matches_2].forEach(match => summarySortRule[match[1] || match[3]] = sortIncr++);
            return summarySortRule
        },
        renderContentByUrl() {
            // 页面加载完成再根据url加载专栏
            // this.loadColumByUrl();
            let menu, menus = this.menus;
            for (let i = 1; i <= this.urlParams.length; i++) {
                let tempMenus = menus.find(m => m.menuName === this.urlParams[i]);
                if (tempMenus && (!tempMenus.subMenu || tempMenus.subMenu.length == 0)) {
                    this.renderContent(tempMenus, null);
                    return
                }
                tempMenus.expanded = true
                menus = tempMenus.subMenu;
            }
            this.initLoading = {
                status: true
            }
        }
    },
});

const SUMMARY = 'SUMMARY.md'

const excludedExtensions = ['.mp3', '.mp4', '.m4a', 'images', 'MP3', 'videos', 'img']
const columnViewingStatus = {
    'watching': '正在看',
    'notStarted': '未观看',
    'completed': '已看完'
}
let replaceColumnKeywords = null
// 各专栏观看进度
const cloumuMenuProgressKey = 'cloumuMenuProgress'

function getNameExt(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

let count = 0
function replaceName(name) {
    if (!replaceColumnKeywords) {
        replaceColumnKeywords = _.columnConfig.blockStrings.split('\n')
    }
    for (const key in replaceColumnKeywords) {
        name = name.replace(replaceColumnKeywords[key], '')
    }
    return name
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
        // target.scrollIntoView({ block: "end" });
        target.scrollIntoViewIfNeeded(true);
    }
}

function prioritizeFileExtensions(fileList) {
    if (!fileList) return null
    // 加载优先级，靠前的优先展示
    const priorityOrder = _.columnConfig.priorityOrder.split(',');
    for (const extension of priorityOrder) {
        const matchingFile = fileList.find(file => file.endsWith(`.${extension}`));
        if (matchingFile) {
            return extension;
        }
    }
    // 如果没有匹配的文件，可以根据需要返回一个默认值或者抛出错误等
    return null;
}

// 代码复制
function playground_text(playground, hidden = true) {
    let code_block = playground.querySelector("code");

    if (window.ace && code_block.classList.contains("editable")) {
        let editor = window.ace.edit(code_block);
        return editor.getValue();
    } else if (hidden) {
        return code_block.textContent;
    } else {
        return code_block.innerText;
    }
}
function clipboard() {
    var clipButtons = document.querySelectorAll('.clip-button');

    function hideTooltip(elem) {
        elem.firstChild.innerText = "";
        elem.className = 'fa fa-copy clip-button';
    }

    function showTooltip(elem, msg) {
        elem.firstChild.innerText = msg;
        elem.className = 'fa fa-copy tooltipped';
    }

    var clipboardSnippets = new ClipboardJS('.clip-button', {
        text: function (trigger) {
            hideTooltip(trigger);
            let playground = trigger.closest("pre");
            return playground_text(playground, false);
        }
    });

    Array.from(clipButtons).forEach(function (clipButton) {
        clipButton.addEventListener('mouseout', function (e) {
            hideTooltip(e.currentTarget);
        });
    });

    clipboardSnippets.on('success', function (e) {
        e.clearSelection();
        showTooltip(e.trigger, "Copied!");
    });

    clipboardSnippets.on('error', function (e) {
        showTooltip(e.trigger, "Clipboard error!");
    });
};

class MarkdownRenderer {
    constructor() {
        this.markdown = new marked.Marked();
        this.renderer = new marked.Renderer();

        // Customize image rendering
        this.renderer.image = this.imageRenderer.bind(this);

        // Customize code block rendering
        this.renderer.code = this.codeRenderer.bind(this);

        // Set the custom renderer for marked
        this.markdown.setOptions({
            renderer: this.renderer,
        });
    }

    imageRenderer(href, title, text) {
        let imgSrc = null;
        if (href.startsWith('http')) {
            imgSrc = href;
        } else {
            imgSrc = _.columnConfig.columApiServer + '/d' + _.currentMenu.parentPath + '/' + href;
        }
        // onClick = "showMarkedImage(event, '${imgSrc}')"
        return `<div style="text-align: center;"><img src="${imgSrc}" onClick='showMdImage(event)'  title="${title ? title : ''}" alt="${text ? text : ''}" style="max-height:200px;"/></div>`;
    }

    codeRenderer(code, lang, escaped) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';

        return `<pre><div class="buttons"><button class="fa fa-copy clip-button" title="Copy to clipboard" aria-label="Copy to clipboard"><i class="tooltiptext"></i> </button></div><code class="hljs language-${lang}">${hljs.highlight(code, { language }).value}</code></pre>`;
    }

}
const markdownRenderer = new MarkdownRenderer()

function showMdImage(event) {
    var image = new Image();

    image.src = event.target.src;

    var viewer = new Viewer(image, {
        hidden: function () {
            viewer.destroy();
        },
    });

    // image.click();
    viewer.show();
}

// 数组数据分组
function columnGroupBy(array, keyFunction) {
    let tempArray = array.reduce(function (result, current) {
        const key = keyFunction(current);
        // 如果 result 中没有 key 对应的数组，创建一个空数组
        if (!result[key]) {
            result[key] = [];
        }
        // 将当前元素添加到对应的数组中
        result[key].push(current);

        return result;
    }, {});
    return Object.keys(columnViewingStatus).filter(status => tempArray[columnViewingStatus[status]]).map(status => {
        return {
            status: columnViewingStatus[status], columns: tempArray[columnViewingStatus[status]]
        }
    })
}
// 数据自然排序
function naturalSortByName(a, b) {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return collator.compare(a.name, b.name)
}
// 根据配置排序
function sortMenusByConfig(a, b, sortConfig) {
    if (sortConfig.summarySortRule) {
        return sortConfig.summarySortRule[removNameExt(a.name)] - sortConfig.summarySortRule[removNameExt(b.name)]
    }
    return naturalSortByName(a, b)
}


// 限制promiseall 数量
async function promiseAllLimit(array, limit = 1) {
    const ret = [];
    const executing = [];
    if (array.length == 0) return
    while (array.length > 0) {
        const item = array.shift();
        const p = Promise.resolve().then(() => item());
        ret.push(p);
        if (limit <= array.length) {
            p.then(() => executing.splice(executing.indexOf(p), 1));
            executing.push(p);
            if (executing.length >= limit) await Promise.race(executing);
        }
    }
    await Promise.all(ret);
    await promiseAllLimit(array, limit)
}

// 菜单重排序和数据拍平
function renumberAndFlat(menus) {
    const result = {};
    let index = 0;
    function flatten(node) {
        if (!node) return;
        if (node.path) {
            const key = index++;
            node.index = key
            result[key] = node
        }
        // 递归处理子节点
        if (Array.isArray(node.subMenu) && node.subMenu.length > 0) {
            node.subMenu.forEach((child) => {
                flatten(child);
            });
        }
    }
    // 遍历树形数组并开始拍平
    menus.forEach((node) => {
        flatten(node);
    });
    return result;
}
/**
 * 动态加载 JavaScript 文件
 * @param {string} url - 要加载的 JavaScript 文件的 URL
 * @param {Function} onLoadCallback - 当脚本成功加载并执行后的回调函数
 * @param {Function} onErrorCallback - 当加载脚本失败时的回调函数
 * @param {boolean} async - 是否异步加载（默认为 true）
 */
function loadScript(url, onLoadCallback, onErrorCallback, async = true) {
    // 创建一个新的 <script> 元素
    var scriptElement = document.createElement('script');

    // 设置其 src 属性为提供的 URL
    scriptElement.src = url;

    // 设置异步属性
    scriptElement.async = async;

    // 监听 script 的加载完成事件
    scriptElement.onload = function () {
        if (onLoadCallback && typeof onLoadCallback === 'function') {
            onLoadCallback();
        }
    };

    // 监听 script 加载失败的事件
    scriptElement.onerror = function () {
        if (onErrorCallback && typeof onErrorCallback === 'function') {
            onErrorCallback();
        }
    };

    // 将 scriptElement 添加到页面的 <head> 中
    document.head.appendChild(scriptElement);
}
