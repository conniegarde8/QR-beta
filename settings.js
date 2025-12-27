// settings.js
// 移除了从 index.js 导入 extension_settings
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { fetchQuickReplies } from './api.js';
import { applyWhitelistDOMChanges } from './whitelist.js';
import { attachScrollListener } from './ui.js'; // 第一点需求：导入滚动监听

// --- 自动伸缩 CSS 注入逻辑 (修复功能缺失) ---
function injectAutoShrinkStyle() {
    if (document.getElementById(Constants.ID_AUTO_SHRINK_STYLE_TAG)) return;
    const style = document.createElement('style');
    style.id = Constants.ID_AUTO_SHRINK_STYLE_TAG;
    style.innerHTML = `
        #qr--bar {
            height: 0px;
            overflow: hidden;
            transition: height 0.3s ease-in-out;
        }
        #send_form:hover #qr--bar {
            height: var(--buttons-bar-height); 
        }
    `;
    document.head.appendChild(style);
}

function removeAutoShrinkStyle() {
    const style = document.getElementById(Constants.ID_AUTO_SHRINK_STYLE_TAG);
    if (style) style.remove();
}

// settings.js -> updateIconDisplay
export function updateIconDisplay() {
    const button = sharedState.domElements.rocketButton;
    if (!button) return;

    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    const customIconUrl = settings.customIconUrl || '';
    const customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    const globalIconSize = settings.globalIconSize; 
    const faIconCode = settings.faIconCode || '';

    // 1. 清理旧样式 (彻底重置)
    button.innerHTML = '';
    button.removeAttribute('style'); 
    button.className = ''; 

    // 2. 基础类名适配
    const sendBtn = document.getElementById('send_but');
    if (sendBtn && sendBtn.classList.contains('primary-button')) button.classList.add('primary-button');
    else button.classList.add('secondary-button');

    // 3. 渲染图标内容 (必须先渲染，以便后续调整)
    let myIconElement = null;
    if (iconType === Constants.ICON_TYPES.CUSTOM && customIconUrl) {
        // 自定义图片模式
        const sizePx = `${customIconSize}px`;
        button.style.backgroundImage = `url('${customIconUrl}')`;
        button.style.backgroundSize = `${sizePx} ${sizePx}`;
        button.style.backgroundRepeat = 'no-repeat';
        button.style.backgroundPosition = 'center';
    } else if (iconType === Constants.ICON_TYPES.FONTAWESOME && faIconCode) {
        button.innerHTML = faIconCode;
        myIconElement = button.querySelector('i, svg'); // 尝试获取内部图标
    } else {
        // 默认/内置图标模式
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP.rocket;
        button.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        myIconElement = button.querySelector('i');
    }

    // 4. 深度样式同步
    if (sendBtn) {
        const sendBtnComputed = window.getComputedStyle(sendBtn);
        
        // --- 容器层级 (Wrapper) ---
        // 只同步基础属性，不触碰 Layout (宽/高)，交给 CSS 变量
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.color = sendBtnComputed.color; // 同步颜色
        button.style.cursor = sendBtnComputed.cursor;

        // 同步字号：优先使用用户设置，否则跟随发送按钮
        if (globalIconSize) {
            button.style.fontSize = `${globalIconSize}px`;
        } else {
            button.style.fontSize = sendBtnComputed.fontSize;
        }

        // --- 图标层级 (Icon Alignment) ---
        // 核心修复：寻找真正的参照物
        // 如果 sendBtn 内部有 i，参照 i；如果没有，参照 sendBtn 本身
        const innerIcon = sendBtn.querySelector('i');
        const sourceElement = innerIcon || sendBtn; 
        const sourceComputed = window.getComputedStyle(sourceElement);

        if (myIconElement) {
            // 复制 padding-top，这通常是用于修正图标视觉重心的关键属性
            // 你的截图显示主题使用了 padding-top: 6px
            myIconElement.style.paddingTop = sourceComputed.paddingTop;
            myIconElement.style.paddingBottom = sourceComputed.paddingBottom;
            myIconElement.style.marginTop = sourceComputed.marginTop;
            
            // 如果主题对 font-size 做了特殊处理 (如 0.6em !important)，这里尝试同步
            // 仅在没有手动设置 globalIconSize 时执行
            if (!globalIconSize && sourceComputed.fontSize !== sendBtnComputed.fontSize) {
                 myIconElement.style.fontSize = sourceComputed.fontSize;
                 // 如果内部改了字号，重置外部字号防止叠加
                 button.style.fontSize = 'inherit';
            }
        } else if (iconType === Constants.ICON_TYPES.CUSTOM) {
             // 如果是自定义图片模式，可能需要 margin 来模拟 padding 的效果
             // 因为 background-image 不受 padding 影响位置 (background-origin 默认是 padding-box)
             // 但通常保持居中即可，不做额外处理
        }
        
        // 特殊处理：如果 globalIconSize 存在，强制指定 wrapper 宽高
        // 这样可以覆盖 CSS 变量，满足用户“我就是要这个大小”的需求
        if (globalIconSize) {
            button.style.width = `${globalIconSize + 14}px`;
            button.style.height = `${globalIconSize + 14}px`;
        }
    }
}

// 独立的白名单面板 HTML 生成 (修复弹窗不显示问题)
export function createWhitelistPanelHtml() {
    return `
    <div id="${Constants.ID_WHITELIST_PANEL}" class="qr-whitelist-panel">
        <div class="qr-whitelist-header">
            <h3>白名单管理</h3>
            <button class="qr-whitelist-close" id="${Constants.ID_WHITELIST_PANEL}-close" title="关闭">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
        <div class="qr-whitelist-body">
            <div class="qr-whitelist-col">
                <label>收纳列表 (隐藏)</label>
                <div id="qrq-non-whitelisted-list" class="qrq-whitelist-list"></div>
            </div>
            <div class="qr-whitelist-col">
                <label>白名单列表 (显示)</label>
                <div id="qrq-whitelisted-list" class="qrq-whitelist-list"></div>
            </div>
        </div>
    </div>`;
}

// 设置面板 HTML (不包含白名单弹窗)
export function createSettingsHtml() {
    const customIconSection = `
        <div class="custom-icon-container" style="display: grid; gap: 10px; margin-top: 10px;">
            <label>图标URL:</label>
            <input type="text" id="${Constants.ID_CUSTOM_ICON_URL}" class="text_pole" placeholder="输入URL">
            <label>大小(px):</label>
            <input type="number" id="${Constants.ID_CUSTOM_ICON_SIZE_INPUT}" class="text_pole" value="20">
            <div class="tip" style="font-size:0.8em; opacity:0.8;">输入URL后点击空白处即可应用</div>
        </div>
    `;

    return `
    <div id="${Constants.ID_SETTINGS_CONTAINER}" class="extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>QR助手</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">

                <!-- 菜单栏 -->
                <div id="${Constants.ID_SETTINGS_TAB_BAR}" class="qr-settings-tab-bar">
                    <div class="qr-settings-tab-item active" data-tab="${Constants.ID_PAGE_MAIN}" id="${Constants.ID_TAB_MAIN}">
                        <i class="fa-solid fa-cog"></i> 主设置
                    </div>
                    <div class="qr-settings-tab-item" data-tab="${Constants.ID_PAGE_ICON}" id="${Constants.ID_TAB_ICON}">
                        <i class="fa-solid fa-icons"></i> 图标设置
                    </div>
                    <div class="qr-settings-tab-item" data-tab="${Constants.ID_PAGE_HELP}" id="${Constants.ID_TAB_HELP}">
                        <i class="fa-solid fa-book"></i> 使用说明
                    </div>
                </div>

                <!-- 主设置页面 -->
                <div id="${Constants.ID_PAGE_MAIN}" class="qr-settings-page active">
                    <div class="flex-container flexGap5">
                        <select id="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}" class="text_pole" style="width: 100%;">
                            <option value="true">启用插件</option>
                            <option value="false">禁用插件</option>
                        </select>
                    </div>
                    <div class="flex-container flexGap5" style="margin-top: 10px; justify-content: space-between; align-items: center;">
                         <div style="display: flex; align-items: center; gap: 5px;">
                            <input type="checkbox" id="${Constants.ID_AUTO_SHRINK_CHECKBOX}">
                            <label for="${Constants.ID_AUTO_SHRINK_CHECKBOX}">开启按钮自动伸缩</label>
                         </div>
                        <button id="${Constants.ID_WHITELIST_BUTTON}" class="menu_button" style="width: auto; margin: 0;">
                            <i class="fa-solid fa-list-check"></i> 白名单管理
                        </button>
                    </div>
                </div>

                <!-- 图标设置页面 -->
                <div id="${Constants.ID_PAGE_ICON}" class="qr-settings-page">
                    <div class="flex-container flexGap5">
                        <label>图标类型:</label>
                        <select id="${Constants.ID_ICON_TYPE_DROPDOWN}" class="text_pole">
                            <option value="${Constants.ICON_TYPES.ROCKET}">小火箭</option>
                            <option value="${Constants.ICON_TYPES.CUSTOM}">自定义图标</option>
                            <option value="${Constants.ICON_TYPES.FONTAWESOME}">Font Awesome</option>
                            <option value="${Constants.ICON_TYPES.COMMENT}">调色盘</option>
                            <option value="${Constants.ICON_TYPES.STAR}">星月</option>
                            <option value="${Constants.ICON_TYPES.BOLT}">五芒星</option>
                        </select>
                    </div>
                    <div class="custom-icon-wrapper" style="display:none;">${customIconSection}</div>
                    <div class="fa-icon-wrapper" style="display:none;">
                        <input type="text" id="${Constants.ID_FA_ICON_CODE_INPUT}" class="text_pole" placeholder="FA HTML Code">
                    </div>
                </div>

                <!-- 使用说明页面 (空) -->
                <div id="${Constants.ID_PAGE_HELP}" class="qr-settings-page">
                    <div class="empty-state" style="text-align: center; color: #888; padding: 20px;">
                        待更新...
                    </div>
                </div>

            </div>
        </div>
    </div>`;
}

export function handleSettingsChange(event) {
    // 从 ST Context 获取官方引用
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const id = event.target.id;
    const val = event.target.value;

    if (id === Constants.ID_SETTINGS_ENABLED_DROPDOWN) {
        settings.enabled = val === 'true';
        // 立即应用启用/禁用状态到 DOM
        if (settings.enabled) {
            document.body.classList.add('qra-enabled');
            document.body.classList.remove('qra-disabled');
            const btn = document.getElementById(Constants.ID_ROCKET_BUTTON);
            if (btn) btn.style.display = 'flex';
        } else {
            document.body.classList.remove('qra-enabled');
            document.body.classList.add('qra-disabled');
            const btn = document.getElementById(Constants.ID_ROCKET_BUTTON);
            if (btn) btn.style.display = 'none';
        }
        applyWhitelistDOMChanges();
    }
    else if (id === Constants.ID_ICON_TYPE_DROPDOWN) {
        settings.iconType = val;
        toggleIconInputs(val);
    }
    else if (id === Constants.ID_CUSTOM_ICON_URL) settings.customIconUrl = val;
    else if (id === Constants.ID_CUSTOM_ICON_SIZE_INPUT) settings.customIconSize = parseInt(val) || 20;
    else if (id === Constants.ID_AUTO_SHRINK_CHECKBOX) {
        settings.autoShrinkEnabled = event.target.checked;
        // 立即应用自动伸缩
        if (settings.autoShrinkEnabled) injectAutoShrinkStyle();
        else removeAutoShrinkStyle();
    }
    else if (id === Constants.ID_FA_ICON_CODE_INPUT) settings.faIconCode = val;

    updateIconDisplay();
    saveSettings();
}

function toggleIconInputs(type) {
    const custom = document.querySelector('.custom-icon-wrapper');
    const fa = document.querySelector('.fa-icon-wrapper');
    if(custom) custom.style.display = type === Constants.ICON_TYPES.CUSTOM ? 'block' : 'none';
    if(fa) fa.style.display = type === Constants.ICON_TYPES.FONTAWESOME ? 'block' : 'none';
}

export function saveSettings() {
    // 获取 SillyTavern 上下文
    const context = window.SillyTavern?.getContext();

    // 调用 saveSettingsDebounced 来触发 settings.json 的写入
    if (context && typeof context.saveSettingsDebounced === 'function') {
        context.saveSettingsDebounced();
    } else {
        console.warn(`[${Constants.EXTENSION_NAME}] Save function not found in context.`);
    }
}

export function loadAndApplySettings() {
    // 从 ST Context 获取官方引用
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];

    // 设置 Input 值
    const setVal = (id, v) => { const el = document.getElementById(id); if(el) el.value = v; };
    setVal(Constants.ID_SETTINGS_ENABLED_DROPDOWN, settings.enabled);
    setVal(Constants.ID_ICON_TYPE_DROPDOWN, settings.iconType);
    setVal(Constants.ID_CUSTOM_ICON_URL, settings.customIconUrl);
    setVal(Constants.ID_CUSTOM_ICON_SIZE_INPUT, settings.customIconSize);
    setVal(Constants.ID_FA_ICON_CODE_INPUT, settings.faIconCode);
    
    const shrink = document.getElementById(Constants.ID_AUTO_SHRINK_CHECKBOX);
    if(shrink) shrink.checked = settings.autoShrinkEnabled;

    // 应用状态
    toggleIconInputs(settings.iconType);
    updateIconDisplay();
    
    // 应用自动伸缩
    if (settings.autoShrinkEnabled) injectAutoShrinkStyle();
    else removeAutoShrinkStyle();

    // 应用启用/禁用 CSS
    if (settings.enabled) {
        document.body.classList.add('qra-enabled');
        document.body.classList.remove('qra-disabled');
    } else {
        document.body.classList.remove('qra-enabled');
        document.body.classList.add('qra-disabled');
    }
}

export function populateWhitelistManagementUI() {
    // 关键修复：从 ST Context 获取官方引用
    const settings = window.SillyTavern.getContext().extensionSettings[Constants.EXTENSION_NAME];
    const { scripts, standard } = fetchQuickReplies();
    const all = [...scripts, ...standard];
    
    const map = new Map();
    all.forEach(r => {
        let id;
        if(r.source === 'JSSlashRunner') id = `JSR::${r.scriptId}`;
        else if(r.source === 'QuickReplyV2') id = `QRV2::${r.setName}`;
        else if(r.source === 'LittleWhiteBox') id = `LWB::${r.taskScope}::${r.taskId}`;
        
        // 优先使用 setName (脚本名/组名) 作为白名单条目的显示名称
        if(id && !map.has(id)) map.set(id, r.setName || r.label);
    });

    const nonList = document.getElementById('qrq-non-whitelisted-list');
    const wlList = document.getElementById('qrq-whitelisted-list');
    if(!nonList || !wlList) return;
    
    nonList.innerHTML = ''; wlList.innerHTML = '';
    
    map.forEach((name, id) => {
        const div = document.createElement('div');
        div.className = 'qrq-whitelist-item';
        div.textContent = name;
        div.onclick = () => {
            // 安全检查：确保 whitelist 是数组
            if (!Array.isArray(settings.whitelist)) settings.whitelist = [];

            const idx = settings.whitelist.indexOf(id);
            if(idx > -1) settings.whitelist.splice(idx, 1);
            else settings.whitelist.push(id);

            populateWhitelistManagementUI();
            saveSettings();
            if(window.quickReplyMenu?.applyWhitelistDOMChanges) window.quickReplyMenu.applyWhitelistDOMChanges();
        };
        
        if(settings.whitelist.includes(id)) wlList.appendChild(div);
        else nonList.appendChild(div);
    });

    // 第一点需求：为白名单列表添加滚动条监听
    attachScrollListener(nonList);
    attachScrollListener(wlList);
}

// 计算并设置白名单面板位置 (居中)
function updateWhitelistPosition() {
    const panel = document.getElementById(Constants.ID_WHITELIST_PANEL);
    if (!panel) return;

    // 先设为不可见但可测量
    panel.style.visibility = 'hidden';
    panel.style.display = 'flex';

    const rect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 计算居中坐标
    const topPos = (vh - rect.height) / 2;
    const leftPos = (vw - rect.width) / 2;

    panel.style.top = `${Math.max(20, topPos)}px`;
    panel.style.left = `${Math.max(20, leftPos)}px`;

    // 恢复显示
    panel.style.visibility = 'visible';
    panel.classList.add('visible');
}

export function setupEventListeners() {
    // 使用 querySelectorAll 绑定，防止 ID 变更导致的问题
    const bind = (id, handler) => document.getElementById(id)?.addEventListener('change', handler);
    
    bind(Constants.ID_SETTINGS_ENABLED_DROPDOWN, handleSettingsChange);
    bind(Constants.ID_ICON_TYPE_DROPDOWN, handleSettingsChange);
    bind(Constants.ID_CUSTOM_ICON_URL, handleSettingsChange); // URL 修改监听
    bind(Constants.ID_CUSTOM_ICON_SIZE_INPUT, handleSettingsChange); // 尺寸修改监听
    bind(Constants.ID_FA_ICON_CODE_INPUT, handleSettingsChange);
    bind(Constants.ID_AUTO_SHRINK_CHECKBOX, handleSettingsChange);

    const wlBtn = document.getElementById(Constants.ID_WHITELIST_BUTTON);
    if(wlBtn) wlBtn.onclick = () => {
        populateWhitelistManagementUI();
        updateWhitelistPosition(); // 使用动态定位
    };
    
    const wlClose = document.getElementById(`${Constants.ID_WHITELIST_PANEL}-close`);
    if(wlClose) wlClose.onclick = () => {
        const p = document.getElementById(Constants.ID_WHITELIST_PANEL);
        if (p) {
            p.classList.remove('visible');
            p.style.display = 'none';
        }
    };

    // --- Tab 切换逻辑 ---
    const tabs = document.querySelectorAll('.qr-settings-tab-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // 1. 移除所有 Tab 的 active 类
            tabs.forEach(t => t.classList.remove('active'));
            // 2. 为当前点击的 Tab 添加 active 类
            e.currentTarget.classList.add('active');

            // 3. 隐藏所有页面
            const pages = document.querySelectorAll('.qr-settings-page');
            pages.forEach(p => p.classList.remove('active'));

            // 4. 显示目标页面
            const targetId = e.currentTarget.getAttribute('data-tab');
            const targetPage = document.getElementById(targetId);
            if(targetPage) targetPage.classList.add('active');
        });
    });
}