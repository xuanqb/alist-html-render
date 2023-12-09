const excludedExtensions = ['.mp3', '.m4a', '.md', 'images', 'MP3', 'videos']

function getNameExt(name) {
    return name.endsWith('.html') ? 'html' : 'pdf'
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

Vue.component('multiselect', window.VueMultiselect.default)
new Vue({
    el: '#body-container',
    data: {
        htmlSrcDoc: "",
        pdfSrc: '',
        renderPdf: false,
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
        oldInnerWidthWidth: window.innerWidth
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
            return `${isEnd ? '' : '未完 - '}${name}`
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
                top: 0,
                behavior: 'smooth'  // 平滑滚动效果
            });
            if (subMenu.type === 'pdf') {
                axios({
                    method: 'get',
                    url: `${this.columApiServer}/d` + subMenu.path,
                    headers: {
                        Authorization: this.token
                    },
                    responseType: 'blob'
                }).then(res => {
                    this.renderPdf = true
                    this.pdfSrc = URL.createObjectURL(res.data);
                    scrollIntoView(document.querySelector('.active'))
                }).catch(err => {
                    this.htmlSrcDoc = "加载失败"
                });
            } else {
                axios({
                    method: 'get',
                    url: `${this.columApiServer}/d` + subMenu.path,
                    headers: {
                        Authorization: this.token
                    },
                }).then(res => {
                    this.htmlSrcDoc = res.data
                        .replaceAll('user-select', 'user-select-fuck')
                        .replaceAll('overflow: hidden', 'overflow: 1111')
                        .replaceAll('-webkit-box-orient:vertical', '').replaceAll('-webkit-box-orient: vertical', '')
                    this.$refs['htmlIframe'].style.height = '50px'
                    scrollIntoView(document.querySelector('.active'))
                }).catch(err => {
                    this.htmlSrcDoc = "加载失败"
                });
            }
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
                    // 是否保存pdf
                    const notLoadPdf = res.data.data.content.some(sub => sub.name.endsWith('html'))
                    for (const obj of res.data.data.content) {
                        const subMenu = [];
                        const menuName = obj.name;
                        if (excludedExtensions.some(ext => menuName.endsWith(ext))) continue
                        let menuObj = { menuName: menuName, expanded: true }
                        if (!obj.is_dir) {
                            if (menuName.endsWith('.pdf') && notLoadPdf) continue
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
                            const notLoadPdf = subRes.data.data.content.some(sub => sub.name.endsWith('html'))
                            subRes.data.data.content?.forEach((subObj) => {
                                const subMenuName = subObj.name;
                                if (subMenuName.endsWith('.pdf') && notLoadPdf) return
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