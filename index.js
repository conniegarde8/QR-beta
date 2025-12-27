// index.js - Main Entry Point
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { createMenuElement } from './ui.js';
import { createSettingsHtml, createWhitelistPanelHtml, loadAndApplySettings, setupEventListeners, populateWhitelistManagementUI } from './settings.js';
import { applyWhitelistDOMChanges, observeBarMutations } from './whitelist.js';
import { setupEventListeners as setupMenuEvents, handleQuickReplyClick } from './events.js';

// 定义默认设置结构
const DEFAULT_SETTINGS = {
    enabled: true,
    iconType: Constants.ICON_TYPES.ROCKET,
    customIconUrl: '',
    customIconSize: Constants.DEFAULT_CUSTOM_ICON_SIZE,
    faIconCode: '',
    globalIconSize: null,
    savedCustomIcons: [],
    whitelist: [], 
    autoShrinkEnabled: false,
};

// --- 移除顶层的设置初始化逻辑 ---
// 原来的代码在这里执行了 extension_settings 的初始化，导致了竞态条件。
// 我们将它移到 initializePlugin 函数中。

function injectRocketButton() {
    const sendButton = document.getElementById('send_but');
    if (!sendButton) return null;

    let rocketButton = document.getElementById(Constants.ID_ROCKET_BUTTON);
    if (rocketButton) return rocketButton;

    rocketButton = document.createElement('div');
    rocketButton.id = Constants.ID_ROCKET_BUTTON;
    rocketButton.title = "快速回复菜单";
    sendButton.parentNode.insertBefore(rocketButton, sendButton);
    return rocketButton;
}

// 专门用于初始化/合并设置的函数
function ensureSettingsInitialized() {
    const context = window.SillyTavern.getContext();
    // 1. 确保插件命名空间在 ST 的核心设置对象中存在
    // extensionSettings 是 ST 内部对象的直接引用，修改它会被 saveSettings 捕获
    if (!context.extensionSettings[Constants.EXTENSION_NAME]) {
        context.extensionSettings[Constants.EXTENSION_NAME] = {};
    }

    // 2. 补全缺失的键值 (在 APP_READY 后执行，此时 ST 已经加载了 settings.json)
    const currentSettings = context.extensionSettings[Constants.EXTENSION_NAME];
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
        if (currentSettings[key] === undefined) {
            currentSettings[key] = DEFAULT_SETTINGS[key];
        }
    });
}

function initializePlugin() {
    try {
        console.log(`[${Constants.EXTENSION_NAME}] Initializing...`);

        // --- 在这里调用设置初始化 ---
        // 此时 APP_READY 已触发，window.extension_settings 肯定已经包含了从硬盘读取的数据
        ensureSettingsInitialized();

        const rocketButton = injectRocketButton();
        if (!rocketButton) return;

        const menu = createMenuElement();

        sharedState.domElements.rocketButton = rocketButton;
        sharedState.domElements.menu = menu;
        
        window.quickReplyMenu = {
            handleQuickReplyClick,
            applyWhitelistDOMChanges,
            observeBarMutations
        };

        // 注入菜单到 body
        document.body.appendChild(menu);
        
        // 注入白名单弹窗到 body
        document.body.insertAdjacentHTML('beforeend', createWhitelistPanelHtml());

        // 加载设置并应用 (现在读取到的一定是正确的数据)
        loadAndApplySettings();
        setupEventListeners(); 
        setupMenuEvents(); 
        
        applyWhitelistDOMChanges();
        observeBarMutations();

        console.log(`[${Constants.EXTENSION_NAME}] Initialization complete.`);
    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] Init failed:`, err);
    }
}

let pluginInitialized = false;

function performInitialization() {
    if (pluginInitialized) return;
    initializePlugin();
    pluginInitialized = true;
}

function handleChatLoaded() {
    setTimeout(() => {
        if (window.quickReplyMenu?.applyWhitelistDOMChanges) {
            window.quickReplyMenu.applyWhitelistDOMChanges();
        }
    }, 500);
}

(function () {
    // 注入设置面板 (Settings Drawer) - 修改注入目标为 #qr_container
    const injectSettings = () => {
        const targetContainer = document.getElementById('qr_container');
        if (targetContainer) {
            const settingsHtml = createSettingsHtml();
            targetContainer.insertAdjacentHTML('beforeend', settingsHtml);
        } else {
            // 回退逻辑：如果找不到 qr_container，记录警告并尝试使用旧逻辑（可选，或直接报错）
            console.warn(`[${Constants.EXTENSION_NAME}] Target container #qr_container not found.`);

            // 为了兼容性，如果没有找到目标容器，依然尝试注入到 extensions_settings 防止设置彻底丢失
            let fallbackContainer = document.getElementById('extensions_settings');
            if (!fallbackContainer) {
                fallbackContainer = document.createElement('div');
                fallbackContainer.id = 'extensions_settings';
                fallbackContainer.style.display = 'none';
                document.body.appendChild(fallbackContainer);
            }
            const settingsHtml = createSettingsHtml();
            fallbackContainer.insertAdjacentHTML('beforeend', settingsHtml);
        }
    };
    injectSettings();

    // 等待 SillyTavern 就绪
    const waitForSillyTavernContext = () => {
        if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
            const context = window.SillyTavern.getContext();
            if (context && context.eventSource && context.eventTypes?.APP_READY) {
                // APP_READY 意味着 ST 的所有设置（包括 settings.json）都已加载完毕
                context.eventSource.once(context.eventTypes.APP_READY, performInitialization);
                if (context.eventTypes.CHAT_CHANGED) {
                    context.eventSource.on(context.eventTypes.CHAT_CHANGED, handleChatLoaded);
                }
            } else {
                setTimeout(waitForSillyTavernContext, 150);
            }
        } else {
            setTimeout(waitForSillyTavernContext, 150);
        }
    };
    waitForSillyTavernContext();
})();