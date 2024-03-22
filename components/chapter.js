Vue.component('chapter', {
    props: {
        menus: {
            type: Array,
            default: []
        }
    },
    methods: {
        renderContentByMenu(subMenu, event) {
            // event?.preventDefault();
            localStorage.setItem('scrollY', 0)
            // fix 重复加载
            // this.$parent.renderContent(subMenu, event)
        },
    },
    template: `
<div>
    <ol class="chapter" v-for="item in menus" :key="item.menuName">
        <div v-if="item.subMenu && item.subMenu.length>0">
            <li class="chapter-item" :class="item.expanded?'expanded':''"
                @click="item.expanded = !item.expanded">
                <a>{{item.menuName}}</a>
                <a class="toggle">
                    <div>❱</div>
                </a>
            </li>
            <li>
                <ol class="section">
                    <div v-for="subMenu_ in item.subMenu" :key="subMenu_.menuName">
                        <div v-if='subMenu_.subMenu && subMenu_.subMenu.length>0'>
                            <chapter :menus="[subMenu_]"></chapter>
                        </div>
                        <li v-else class="chapter-item">
                            <a :href="'#'+subMenu_.relativePath"
                                @click="(event)=>renderContentByMenu(subMenu_,event)"
                                :class="subMenu_.active?'active':''">{{subMenu_.menuName}}</a>
                        </li>
                    </div>
                   
                </ol>
            </li>
        </div>
        <div v-else>
            <li class="chapter-item">
                <a :href="'#'+item.relativePath" @click="renderContentByMenu(item)"
                    :class="item.active?'active':''">{{item.menuName}}</a>
            </li>
        </div>
    </ol>
</div>
    `
})